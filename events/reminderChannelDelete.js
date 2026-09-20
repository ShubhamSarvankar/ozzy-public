const { Events } = require('discord.js');
const reminderManager = require('../utils/reminderManager');

module.exports = {
  name: Events.ChannelDelete,
  async execute(channel) {
    try {
      await reminderManager.handleChannelDeleted(channel.client, channel);
    } catch (error) {
      console.error('[reminderChannelDelete] Failed:', error);
    }
  },
};
