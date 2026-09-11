require('dotenv').config();
const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');
const { Client, GatewayIntentBits } = require('discord.js');
const gotwModel = require('../models/gotwSchema');

const DATABASE = process.env.MONGODB_SRV;
const TOKEN = process.env.DISCORD_TOKEN;
const ARCHIVE_CHANNEL_ID = '1505323794451923175';

// Matches the short-lived Discord CDN links issued for slash-command attachment
// options before the file is attached to any persisted message. These carry a
// signed `ex=` expiry and 404 once it passes — the root cause of "empty embed"
// gotw triggers. Normal cdn.discordapp.com/attachments/... links are unaffected.
const EPHEMERAL_URL_RE = /https?:\/\/cdn\.discordapp\.com\/ephemeral-attachments\/\S+/gi;

function log(tag, data) {
  console.log(`[fixGotwMedia] ${tag}`, JSON.stringify(data));
}

async function checkUrlAlive(url) {
  try {
    const res = await fetch(url, { method: 'HEAD' });
    return res.ok;
  } catch (err) {
    log('checkUrlAlive:error', { url, error: err.message });
    return false;
  }
}

async function main() {
  await mongoose.connect(DATABASE);
  log('mongo:connected', {});

  const client = new Client({ intents: [GatewayIntentBits.Guilds] });
  await new Promise((resolve, reject) => {
    client.once('ready', resolve);
    client.once('error', reject);
    client.login(TOKEN).catch(reject);
  });
  log('discord:ready', { tag: client.user.tag });

  const archiveChannel = await client.channels.fetch(ARCHIVE_CHANNEL_ID);
  if (!archiveChannel || !archiveChannel.isTextBased()) {
    throw new Error(`Archive channel ${ARCHIVE_CHANNEL_ID} not found or not text-based`);
  }
  log('archive-channel:resolved', { id: archiveChannel.id, name: archiveChannel.name });

  const docs = await gotwModel.find();
  log('scan:start', { triggerCount: docs.length });

  const summary = {
    triggersScanned: 0,
    responsesScanned: 0,
    ephemeralFound: 0,
    rehosted: [],
    deadUnrecoverable: [],
    errors: [],
  };

  for (const doc of docs) {
    summary.triggersScanned++;
    let docChanged = false;

    for (let i = 0; i < doc.responses.length; i++) {
      summary.responsesScanned++;
      const response = doc.responses[i];
      const matches = response.match(EPHEMERAL_URL_RE);
      if (!matches) continue;

      for (const url of matches) {
        summary.ephemeralFound++;
        log('ephemeral:found', { trigger: doc.trigger, index: i, url });

        const alive = await checkUrlAlive(url);
        if (!alive) {
          log('ephemeral:dead', { trigger: doc.trigger, index: i, url });
          summary.deadUnrecoverable.push({ trigger: doc.trigger, index: i, url });
          continue;
        }

        try {
          const sentMsg = await archiveChannel.send({ files: [url] });
          const attachment = sentMsg.attachments.first();
          if (!attachment) throw new Error('No attachment on rehost message');
          const permanentUrl = attachment.url;

          doc.responses[i] = doc.responses[i].replace(url, permanentUrl);
          docChanged = true;

          log('ephemeral:rehosted', {
            trigger: doc.trigger,
            index: i,
            oldUrl: url,
            newUrl: permanentUrl,
            hostMessageId: sentMsg.id,
          });
          summary.rehosted.push({ trigger: doc.trigger, index: i, oldUrl: url, newUrl: permanentUrl });

          await new Promise(r => setTimeout(r, 500));
        } catch (err) {
          console.error('[fixGotwMedia] rehost:error', JSON.stringify({ trigger: doc.trigger, index: i, url }), err);
          summary.errors.push({ trigger: doc.trigger, index: i, url, error: err.message });
        }
      }
    }

    if (docChanged) {
      try {
        await doc.save();
        log('doc:saved', { trigger: doc.trigger });
      } catch (err) {
        console.error('[fixGotwMedia] doc:save-error', JSON.stringify({ trigger: doc.trigger }), err);
        summary.errors.push({ trigger: doc.trigger, index: null, url: null, error: `save failed: ${err.message}` });
      }
    }
  }

  log('scan:complete', {
    triggersScanned: summary.triggersScanned,
    responsesScanned: summary.responsesScanned,
    ephemeralFound: summary.ephemeralFound,
    rehostedCount: summary.rehosted.length,
    deadCount: summary.deadUnrecoverable.length,
    errorCount: summary.errors.length,
  });

  console.log('\n=== SUMMARY ===');
  console.log(`Triggers scanned: ${summary.triggersScanned}`);
  console.log(`Responses scanned: ${summary.responsesScanned}`);
  console.log(`Ephemeral URLs found: ${summary.ephemeralFound}`);
  console.log(`Successfully rehosted (permanent URL): ${summary.rehosted.length}`);
  console.log(`Dead / unrecoverable (need manual /gotw add): ${summary.deadUnrecoverable.length}`);
  console.log(`Errors: ${summary.errors.length}`);

  if (summary.deadUnrecoverable.length) {
    console.log('\n--- DEAD TRIGGERS (re-add the media manually with /gotw add) ---');
    for (const d of summary.deadUnrecoverable) {
      console.log(`  !${d.trigger}  (response #${d.index})`);
    }
  }

  if (summary.errors.length) {
    console.log('\n--- ERRORS ---');
    for (const e of summary.errors) {
      console.log(`  !${e.trigger}  (response #${e.index}): ${e.error}`);
    }
  }

  const reportPath = path.join(__dirname, `gotw-media-fix-report-${Date.now()}.json`);
  fs.writeFileSync(reportPath, JSON.stringify(summary, null, 2));
  console.log(`\nFull report written to ${reportPath}`);

  await mongoose.disconnect();
  client.destroy();
  process.exit(0);
}

main().catch(err => {
  console.error('[fixGotwMedia] FATAL', err);
  process.exit(1);
});
