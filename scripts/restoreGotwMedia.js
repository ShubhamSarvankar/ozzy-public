require('dotenv').config();
const path = require('path');
const mongoose = require('mongoose');
const { Client, GatewayIntentBits } = require('discord.js');
const gotwModel = require('../models/gotwSchema');

const DATABASE = process.env.MONGODB_SRV;
const TOKEN = process.env.DISCORD_TOKEN;
const ARCHIVE_CHANNEL_ID = '1505323794451923175';

// Dead ephemeral-attachments responses identified by scripts/fixGotwMedia.js
// that couldn't be auto-recovered (image data already expired off Discord's
// CDN). Restoring them from local source files instead.
const RESTORE_MAP = [
  { trigger: 'kofi', responseIndex: 0, file: path.join(__dirname, '..', 'images', 'kofi.webp') },
  { trigger: 'pete', responseIndex: 0, file: path.join(__dirname, '..', 'images', 'pete.gif') },
];

function log(tag, data) {
  console.log(`[restoreGotwMedia] ${tag}`, JSON.stringify(data));
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

  for (const item of RESTORE_MAP) {
    log('restore:start', item);

    const doc = await gotwModel.findOne({ trigger: item.trigger });
    if (!doc) {
      console.error('[restoreGotwMedia] trigger:not-found', JSON.stringify(item));
      continue;
    }
    if (!doc.responses[item.responseIndex]) {
      console.error('[restoreGotwMedia] response-index:missing', JSON.stringify({ ...item, responseCount: doc.responses.length }));
      continue;
    }

    const oldResponse = doc.responses[item.responseIndex];

    try {
      const sentMsg = await archiveChannel.send({ files: [item.file] });
      const attachment = sentMsg.attachments.first();
      if (!attachment) throw new Error('No attachment on hosted message');
      const permanentUrl = attachment.url;

      doc.responses[item.responseIndex] = permanentUrl;
      await doc.save();

      log('restore:success', {
        trigger: item.trigger,
        responseIndex: item.responseIndex,
        oldResponse,
        newResponse: permanentUrl,
        hostMessageId: sentMsg.id,
      });
    } catch (err) {
      console.error('[restoreGotwMedia] restore:error', JSON.stringify(item), err);
    }
  }

  await mongoose.disconnect();
  client.destroy();
  process.exit(0);
}

main().catch(err => {
  console.error('[restoreGotwMedia] FATAL', err);
  process.exit(1);
});
