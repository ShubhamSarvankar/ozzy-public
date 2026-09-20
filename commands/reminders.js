const { SlashCommandBuilder } = require('discord.js');
const remind = require('./remind');

// Thin wrapper around /remind list's exact handler — single source of
// truth for the dashboard view, reachable under either command name.
module.exports = {
  data: new SlashCommandBuilder()
    .setName('reminders')
    .setDescription('Show your active reminders'),
  async execute(interaction) {
    return remind.handleList(interaction);
  },
};
