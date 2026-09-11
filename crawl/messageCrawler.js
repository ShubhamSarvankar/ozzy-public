/**
 * Historical message crawl (scope.md Phase 3). Walks general chat newest to
 * oldest via @discordjs/rest (no discord.js Message cache — the 100 messages
 * per page never accumulate in memory, which is what keeps this safe against
 * the 2 GiB host ceiling), counting authors per page and persisting one
 * document per page (models/crawlPageSchema.js) so a crash at any instant is
 * harmless to resume.
 *
 * SAFETY: this runs in the same process as the live bot. Every path through
 * here is wrapped so nothing can escape as an unhandled rejection — index.js
 * has `process.on('unhandledRejection', () => process.exit(1))`, so one
 * unawaited failure in here would take the whole bot down with it.
 */

const { REST } = require('@discordjs/rest');
const { Routes } = require('discord-api-types/v10');
const CrawlState = require('../models/crawlStateSchema');
const CrawlPage = require('../models/crawlPageSchema');
const { isCountableRestMessage } = require('../utils/messageFilters');
const { snowflakeToDate } = require('../utils/snowflake');
const config = require('../config');

const STATE_ID = 'general';

let running = false; // guards against double-start within this process

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function withRetry(fn, { attempts = 5, baseDelayMs = 500, label }) {
  let lastErr;
  for (let i = 0; i < attempts; i++) {
    try {
      return await fn();
    } catch (err) {
      lastErr = err;
      if (i === attempts - 1) break;
      const backoff = baseDelayMs * Math.pow(2, i);
      console.error(`[crawler] ${label} failed (attempt ${i + 1}/${attempts}), retrying in ${backoff}ms:`, err.message);
      await sleep(backoff);
    }
  }
  throw lastErr;
}

async function fetchLatestMessageId(rest, channelId) {
  const query = new URLSearchParams({ limit: '1' });
  const messages = await rest.get(Routes.channelMessages(channelId), { query });
  if (!messages.length) {
    throw new Error('No messages found in the tracked channel — cannot establish a crawl boundary');
  }
  return messages[0].id;
}

async function fetchPage(rest, channelId, before) {
  const query = new URLSearchParams({ limit: '100', before });
  return rest.get(Routes.channelMessages(channelId), { query });
}

async function postProgress(client, { done, pagesFetched, cursor }) {
  try {
    const channel = await client.channels.fetch(config.crawl.progressChannelId).catch(() => null);
    if (!channel) {
      console.error('[crawler] progress channel not found:', config.crawl.progressChannelId);
      return;
    }

    let content;
    if (done) {
      content =
        `✅ **Historical crawl complete.** ${pagesFetched.toLocaleString('en-US')} pages fetched.\n` +
        `Run \`node scripts/mergeCrawlData.js\` to write results into backfillMessages.`;
    } else {
      const percent = Math.min(100, (pagesFetched / config.crawl.estimatedTotalPages) * 100);
      const dateReached = snowflakeToDate(cursor);
      content =
        `**Historical crawl progress**\n` +
        `Pages fetched: ${pagesFetched.toLocaleString('en-US')} (~${percent.toFixed(1)}% of an estimated ` +
        `${config.crawl.estimatedTotalPages.toLocaleString('en-US')})\n` +
        `Reached: ${dateReached ? dateReached.toISOString().slice(0, 10) : 'unknown'}\n` +
        `Cursor: ${cursor}`;
    }

    const state = await CrawlState.findOne({ _id: STATE_ID }).select('progressMessageId').lean();
    let message = null;
    if (state && state.progressMessageId) {
      message = await channel.messages.fetch(state.progressMessageId).catch(() => null);
    }

    if (message) {
      await message.edit(content);
    } else {
      const sent = await channel.send(content);
      await CrawlState.updateOne({ _id: STATE_ID }, { $set: { progressMessageId: sent.id } });
    }
  } catch (err) {
    // Progress reporting is cosmetic — never let it interrupt the crawl.
    console.error('[crawler] progress report failed (non-fatal):', err);
  }
}

async function runCrawlerUnsafe(client) {
  const { channelId } = config.crawl;
  const token = process.env.DISCORD_TOKEN; // same token as ozzy itself, by design (see scope.md §3.5 — recommended, not required)
  const rest = new REST({ version: '10' }).setToken(token);

  let state = await CrawlState.findOne({ _id: STATE_ID });

  if (state && state.done) {
    console.log('[crawler] already complete — nothing to do.');
    return;
  }

  if (state && state.leaseExpiresAt && new Date(state.leaseExpiresAt) > new Date()) {
    console.log('[crawler] a live lease is already held elsewhere — refusing to start a second crawl.');
    return;
  }

  if (state && state.paused) {
    console.log('[crawler] crawl is paused (kill switch) — not auto-resuming. Use /crawl resume.');
    return;
  }

  if (!state) {
    // Fresh start: capture the boundary now. Everything from this message
    // id onward is guaranteed already counted by the live hook (which
    // scope.md's ordering constraint requires to ship first — confirmed
    // already live). Crawling strictly `before` this id means no gap, no
    // overlap, no dedupe needed.
    const boundaryMessageId = await fetchLatestMessageId(rest, channelId);
    state = await CrawlState.create({
      _id: STATE_ID,
      boundaryMessageId,
      cursor: boundaryMessageId,
      pagesFetched: 0,
      done: false,
      startedAt: new Date(),
      leaseExpiresAt: new Date(Date.now() + config.crawl.leaseDurationMs),
      paused: false,
      requestsPerSecond: config.crawl.defaultRequestsPerSecond,
    });
    console.log(`[crawler] fresh start — boundary captured at message ${boundaryMessageId}`);
  } else {
    state.leaseExpiresAt = new Date(Date.now() + config.crawl.leaseDurationMs);
    await state.save();
    console.log(`[crawler] resuming from cursor ${state.cursor} (${state.pagesFetched} pages already fetched).`);
  }

  const heartbeat = setInterval(() => {
    CrawlState.updateOne(
      { _id: STATE_ID },
      { $set: { leaseExpiresAt: new Date(Date.now() + config.crawl.leaseDurationMs) } }
    ).catch((err) => console.error('[crawler] heartbeat failed (non-fatal):', err));
  }, config.crawl.heartbeatIntervalMs);

  try {
    let cursor = state.cursor;
    let pagesFetched = state.pagesFetched;
    let lastProgressReportAt = 0;

    while (true) {
      const live = await CrawlState.findOne({ _id: STATE_ID }).select('paused requestsPerSecond').lean();
      if (live && live.paused) {
        console.log('[crawler] paused via kill switch — stopping this run.');
        break;
      }
      const rps = (live && live.requestsPerSecond) || config.crawl.defaultRequestsPerSecond;
      const delayMs = Math.max(50, Math.round(1000 / rps));

      let page;
      try {
        page = await withRetry(() => fetchPage(rest, channelId, cursor), { label: 'fetch page' });
      } catch (err) {
        console.error('[crawler] giving up on this page after retries — stopping this run, will resume next boot:', err);
        break;
      }

      if (page.length === 0) {
        await CrawlState.updateOne({ _id: STATE_ID }, { $set: { done: true } });
        console.log(`[crawler] reached the beginning of channel history — complete at ${pagesFetched} pages.`);
        await postProgress(client, { done: true, pagesFetched, cursor });
        break;
      }

      const authorCounts = new Map();
      for (const msg of page) {
        if (!isCountableRestMessage(msg)) continue;
        authorCounts.set(msg.author.id, (authorCounts.get(msg.author.id) || 0) + 1);
      }
      const authors = Array.from(authorCounts, ([id, n]) => ({ id, n }));
      const oldestIdInPage = page[page.length - 1].id;

      await withRetry(
        () => CrawlPage.findOneAndUpdate({ _id: cursor }, { _id: cursor, authors, fetchedAt: new Date() }, { upsert: true }),
        { label: 'write page' }
      );

      cursor = oldestIdInPage;
      pagesFetched += 1;

      await withRetry(() => CrawlState.updateOne({ _id: STATE_ID }, { $set: { cursor, pagesFetched } }), {
        label: 'write cursor',
      });

      if (Date.now() - lastProgressReportAt > config.crawl.progressReportIntervalMs) {
        lastProgressReportAt = Date.now();
        await postProgress(client, { done: false, pagesFetched, cursor });
      }

      await sleep(delayMs);
    }
  } finally {
    clearInterval(heartbeat);
  }
}

/**
 * Entry point. Never throws, never rejects — every failure is caught and
 * logged. Call this fire-and-forget from index.js's ready handler; do not
 * await it (it can run for ~25 hours).
 */
async function startCrawler(client) {
  if (running) {
    console.log('[crawler] already running in this process — ignoring duplicate start.');
    return;
  }
  running = true;
  try {
    await runCrawlerUnsafe(client);
  } catch (err) {
    console.error('[crawler] top-level error — crawl stopped, will resume next boot:', err);
  } finally {
    running = false;
  }
}

module.exports = { startCrawler };
