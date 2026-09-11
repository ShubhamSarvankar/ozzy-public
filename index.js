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
const { Client, GatewayIntentBits, Partials, Collection, ActivityType, PresenceUpdateStatus } = require('discord.js');
const updateAvatar = require('./utils/updateAvatar');
const { startCrawler } = require('./crawl/messageCrawler');

const token = process.env.DISCORD_TOKEN;
const database = process.env.MONGODB_SRV;

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMessageReactions,
    GatewayIntentBits.GuildMembers,
  ],
  // Required for messageReactionAdd/Remove to fire on messages that fell out
  // of the cache (e.g. after any restart) — rolereact messages depend on this.
  partials: [Partials.Message, Partials.Channel, Partials.Reaction, Partials.User],
});

// Load event files
const eventsPath = path.join(__dirname, 'events');
const eventFiles = fs.readdirSync(eventsPath).filter(file => file.endsWith('.js'));

for (const file of eventFiles) {
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
    client.commands.set(command.data.name, command);
  } else {
    console.error(`[WARNING] The command at ${filePath} is missing a required "data" or "execute" property.`);
  }
}

// Connect to the database
mongoose.connect(database, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
}).then(() => {
  console.log('Connected to the database!');
}).catch((err) => {
  console.error(err);
});

client.once('ready', async () => {
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
