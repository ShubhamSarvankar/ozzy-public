require('dotenv').config();

process.on('uncaughtException', (err) => {
  console.error('[FATAL] Uncaught exception:', err);
  process.exit(1);
});

process.on('unhandledRejection', (reason) => {
  console.error('[FATAL] Unhandled rejection:', reason);
  process.exit(1);
});

process.on('SIGTERM', () => {
  console.log('[SHUTDOWN] Received SIGTERM. Exiting cleanly.');
  process.exit(0);
});

const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');
const { Client, GatewayIntentBits, Partials, Collection, ActivityType, PresenceUpdateStatus, Events } = require('discord.js');
const updateAvatar = require('./utils/updateAvatar');
const { startCrawler } = require('./crawl/messageCrawler');
const featureFlags = require('./utils/featureFlags');

const token = process.env.DISCORD_TOKEN;
const database = process.env.MONGODB_SRV;

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.GuildMessageReactions,
    // TEMPORARY (2026-10-14): Discord revoked the MessageContent and
    // GuildMembers privileged intents for this application (the server passed
    // Discord's 10,000-user threshold and the privileged-intent review window
    // lapsed). Requesting either gets the connection rejected with "Used
    // disallowed intents" and crash-loops the bot. MessageContent comes back
    // via utils/featureFlags.js once the application is approved again.
    // GuildMembers stays off: nothing in this codebase needs it (every member
    // lookup is a by-id fetch, which is allowed without the intent).
    ...(featureFlags.MESSAGE_CONTENT_ENABLED ? [GatewayIntentBits.MessageContent] : []),
    // Halloween voice scare (halloween/discord/manager.js) needs voiceStateUpdate
    // and populated voice channel member lists.
    GatewayIntentBits.GuildVoiceStates,
  ],
  // Required for messageReactionAdd/Remove to fire on messages that fell out
  // of the cache (e.g. after any restart) — rolereact messages depend on this.
  partials: [Partials.Message, Partials.Channel, Partials.Reaction, Partials.User],
});

// Load event files
const eventsPath = path.join(__dirname, 'events');
const eventFiles = fs.readdirSync(eventsPath).filter(file => file.endsWith('.js'));

for (const file of eventFiles) {
  if (featureFlags.isEventDisabled(file)) {
    console.log(`[featureFlags] skipping event ${file} (Message Content intent unavailable)`);
    continue;
  }
  const filePath = path.join(eventsPath, file);
  const event = require(filePath);
  if (event.once) {
    client.once(event.name, (...args) => event.execute(...args));
  } else {
    client.on(event.name, (...args) => event.execute(...args));
  }
}

client.commands = new Collection();
const commandsPath = path.join(__dirname, 'commands');
const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));

for (const file of commandFiles) {
  const filePath = path.join(commandsPath, file);
  const command = require(filePath);
  if ('data' in command && 'execute' in command) {
    if (featureFlags.isCommandDisabled(command.data.name)) {
      console.log(`[featureFlags] skipping /${command.data.name} (Message Content intent unavailable)`);
      continue;
    }
    client.commands.set(command.data.name, command);
  } else {
    console.error(`[WARNING] The command at ${filePath} is missing a required "data" or "execute" property.`);
  }
}

// Connect to the database
mongoose.connect(database).then(() => {
  console.log('Connected to the database!');
}).catch((err) => {
  console.error(err);
});

client.once(Events.ClientReady, async () => {
  console.log(`Logged in as ${client.user.tag}!`);

  client.user.setPresence({
    activities: [{ name: 'Watching all helpers, all the time.', type: ActivityType.Custom }],
    status: PresenceUpdateStatus.Online,
  });

  // Uncomment to update the bot avatar with linked image
  await updateAvatar(client);

  // Historical message crawl (scope.md Phase 3) — auto-starts/resumes on
  // boot per scope.md's boot logic. Fire-and-forget: it can run for ~25
  // hours and must never block startup. startCrawler() never throws (every
  // path inside it is caught), but a .catch() stays here too as defense in
  // depth — index.js's global unhandledRejection handler kills the whole
  // process, which is exactly what this must never trigger.
  (async () => {
    if (mongoose.connection.readyState !== 1) {
      await new Promise((resolve) => mongoose.connection.once('open', resolve));
    }
    startCrawler(client).catch((err) => console.error('[crawler] failed to start:', err));
  })().catch((err) => console.error('[crawler] startup wrapper failed:', err));
});

client.login(token);
module.exports = client;
