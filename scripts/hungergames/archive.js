#!/usr/bin/env node
/**
 * Step 1 of the Hunger Games history backfill: copy every Ozzy message in
 * general chat since --since (default 2024-06-01) into Mongo
 * (models/hgArchiveSchema.js). Read-only against Discord. Run it on its own,
 * not inside the bot.
 *
 * Speed: the old message crawler (crawl/) saved the `before` cursor of every
 * page it fetched, and those pages tile general chat with no gaps. So instead
 * of one slow page-after-page walk, those pages are re-fetched in parallel,
 * as fast as Discord's rate limits allow (@discordjs/rest waits on its
 * buckets; the process is capped below the 50 req/s global limit so the live
 * bot, which shares the token, keeps headroom). Only messages newer than that
 * crawl are walked page by page.
 *
 * Crash safety: every write is an idempotent upsert. A page is marked done
 * (HgArchivePage) only after its messages are saved, and the sequential walk
 * saves its cursor after every page. Kill it at any moment and run it again:
 * it resumes, and nothing is duplicated or lost.
 *
 *   node scripts/hungergames/archive.js --dry-run [--sample 300]
 *       Fetches a sample of pages, writes nothing, reports what it found.
 *   node scripts/hungergames/archive.js [--since 2024-06-01] [--concurrency 25] [--rps 40]
 *       The full run.
 */

require('dotenv').config();
const mongoose = require('mongoose');
const { REST } = require('@discordjs/rest');
const { Routes } = require('discord-api-types/v10');
const config = require('../../config');
const { snowflakeToDate } = require('../../utils/snowflake');
const { HgArchiveMessage, HgArchiveState, HgArchivePage } = require('../../models/hgArchiveSchema');
const CrawlState = require('../../models/crawlStateSchema');
const CrawlPage = require('../../models/crawlPageSchema');
const { OZZY_ID } = require('../../hungergames/engine/constants');

const DISCORD_EPOCH = 1420070400000n;
const dateToSnowflake = (date) => (BigInt(date.getTime()) - DISCORD_EPOCH) << 22n;

function parseArgs(argv) {
  const opts = {};
  for (let i = 0; i < argv.length; i++) {
    if (!argv[i].startsWith('--')) continue;
    const key = argv[i].slice(2);
    const next = argv[i + 1];
    if (next !== undefined && !next.startsWith('--')) { opts[key] = next; i++; } else opts[key] = true;
  }
  return opts;
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// Retries with backoff capped at a minute. Network outages (laptop asleep,
// Wi-Fi drop) are retried indefinitely so the run just waits them out;
// anything else gives up after 8 tries.
const NETWORK_CODES = new Set(['ENOTFOUND', 'ECONNRESET', 'ETIMEDOUT', 'ECONNREFUSED', 'EAI_AGAIN', 'ENETUNREACH', 'EPIPE', 'UND_ERR_CONNECT_TIMEOUT', 'UND_ERR_SOCKET']);
const isNetworkError = (err) => NETWORK_CODES.has(err.code) || NETWORK_CODES.has(err.cause?.code)
  || /MongoNetwork|MongoServerSelection|PoolCleared|timed out|fetch failed|aborted/i.test(`${err.name} ${err.message}`);

async function withRetry(fn, label) {
  for (let i = 0; ; i++) {
    try {
      return await fn();
    } catch (err) {
      if (err.status === 403 || err.status === 404) throw err; // retrying won't help
      const network = isNetworkError(err);
      if (!network && i >= 7) throw err;
      const backoff = Math.min(60000, 1000 * 2 ** Math.min(i, 6));
      console.error(`[hg-archive] ${label} failed (attempt ${i + 1}${network ? ', network' : '/8'}), retrying in ${backoff}ms:`, err.message);
      await sleep(backoff);
    }
  }
}

function toDoc(m, channelId) {
  return {
    _id: m.id,
    channelId,
    authorId: m.author.id,
    createdAt: new Date(m.timestamp),
    content: m.content || '',
    embeds: (m.embeds || []).map((e) => ({
      title: e.title || '',
      description: e.description || '',
      fields: (e.fields || []).map((f) => ({ name: f.name || '', value: f.value || '' })),
    })),
  };
}

async function saveOzzy(msgs, channelId) {
  const docs = msgs.filter((m) => m.author?.id === OZZY_ID).map((m) => toDoc(m, channelId));
  if (docs.length) {
    await withRetry(() => HgArchiveMessage.bulkWrite(docs.map((d) => ({ replaceOne: { filter: { _id: d._id }, replacement: d, upsert: true } })), { ordered: false }), 'saving messages');
  }
  return docs.length;
}

// Run `worker` over `items` with `concurrency` in flight.
async function pool(items, concurrency, worker) {
  let next = 0;
  const run = async () => {
    while (next < items.length) {
      const item = items[next++];
      await worker(item);
    }
  };
  await Promise.all(Array.from({ length: Math.min(concurrency, items.length) }, run));
}

async function main() {
  const opts = parseArgs(process.argv.slice(2));
  const channelId = opts.channel || config.crawl.channelId;
  const since = new Date(opts.since || '2024-06-01T00:00:00Z');
  const sinceId = dateToSnowflake(since);
  const concurrency = Number(opts.concurrency || 25);
  const rest = new REST({ version: '10', globalRequestsPerSecond: Number(opts.rps || 40), timeout: 30000 })
    .setToken(process.env.DISCORD_TOKEN);
  const fetchPage = (before) => withRetry(
    () => rest.get(Routes.channelMessages(channelId), { query: new URLSearchParams(before ? { limit: '100', before } : { limit: '100' }) }),
    `page before ${before || 'latest'}`,
  );

  await mongoose.connect(process.env.MONGODB_SRV);
  const crawl = await CrawlState.findById('general').lean();
  if (!crawl?.done) throw new Error('The old message crawl is not complete, so its page cursors cannot be reused.');
  const cursors = (await CrawlPage.find().select('_id').lean())
    .map((p) => p._id)
    .filter((id) => BigInt(id) >= sinceId);
  const started = Date.now();
  let requests = 0;
  let ozzy = 0;
  const rate = () => (requests / ((Date.now() - started) / 1000)).toFixed(1);

  if (opts['dry-run']) {
    const sampleSize = Number(opts.sample || 300);
    const sample = [...cursors].sort(() => Math.random() - 0.5).slice(0, sampleSize);
    const titles = new Map();
    let messages = 0;
    await pool([null, ...sample], concurrency, async (before) => {
      const msgs = await fetchPage(before);
      requests++;
      messages += msgs.length;
      for (const m of msgs.filter((x) => x.author?.id === OZZY_ID)) {
        ozzy++;
        const t = m.embeds?.[0]?.title || (m.embeds?.length ? '(embed, no title)' : '(plain text)');
        titles.set(t, (titles.get(t) || 0) + 1);
      }
    });
    console.log(`Dry run: ${requests} pages (${messages} messages) in ${((Date.now() - started) / 1000).toFixed(1)}s, ${rate()} pages/s. Nothing written.`);
    console.log(`Full run would fetch ${cursors.length} crawl pages + the pages since ${snowflakeToDate(crawl.boundaryMessageId).toISOString().slice(0, 10)}.`);
    console.log(`Ozzy messages in sample: ${ozzy} (estimated total ~${Math.round((ozzy / requests) * cursors.length)})`);
    console.log('Most common Ozzy embed titles in sample:');
    [...titles].sort((a, b) => b[1] - a[1]).slice(0, 40).forEach(([t, n]) => console.log(`  ${n}  ${t.replace(/\n/g, ' / ')}`));
    return;
  }

  // 1. Sequential walk over messages newer than the old crawl.
  let state = await HgArchiveState.findById(channelId);
  if (!state) {
    const latest = await fetchPage(null);
    requests++;
    state = await HgArchiveState.create({
      _id: channelId,
      boundaryMessageId: latest[0].id,
      cursor: String(BigInt(latest[0].id) + 1n),
      stopAt: crawl.boundaryMessageId,
    });
  }
  while (!state.done) {
    const msgs = await fetchPage(state.cursor);
    requests++;
    ozzy += await saveOzzy(msgs, channelId);
    if (!msgs.length) { state.done = true; } else {
      state.cursor = msgs[msgs.length - 1].id;
      if (BigInt(state.cursor) < BigInt(state.stopAt)) state.done = true;
    }
    state.pagesFetched++;
    await withRetry(() => state.save(), 'saving progress');
  }
  console.log(`Recent messages done (${state.pagesFetched} pages). Now the ${cursors.length} crawl pages since ${since.toISOString().slice(0, 10)}.`);

  // 2. The old crawl's pages, in parallel.
  const done = new Set((await HgArchivePage.find().select('_id').lean()).map((p) => p._id));
  const todo = cursors.filter((c) => !done.has(c));
  console.log(`${done.size} pages already archived by an earlier run, ${todo.length} to go.`);
  let finished = 0;
  await pool(todo, concurrency, async (before) => {
    const msgs = await fetchPage(before);
    requests++;
    ozzy += await saveOzzy(msgs, channelId);
    await withRetry(() => HgArchivePage.updateOne({ _id: before }, { $set: { _id: before } }, { upsert: true }), 'marking page done');
    finished++;
    if (finished % 1000 === 0) {
      const eta = ((todo.length - finished) / Number(rate()) / 60).toFixed(0);
      console.log(`${finished}/${todo.length} pages, ${ozzy} Ozzy messages this run, ${rate()} pages/s, ~${eta} min left`);
    }
  });
  const total = await HgArchiveMessage.countDocuments();
  console.log(`Done in ${((Date.now() - started) / 60000).toFixed(1)} min at ${rate()} pages/s. ${total} Ozzy messages archived in total.`);
}

main()
  .catch((err) => { console.error('[hg-archive] failed:', err); process.exitCode = 1; })
  .finally(() => mongoose.disconnect().catch(() => {}));
