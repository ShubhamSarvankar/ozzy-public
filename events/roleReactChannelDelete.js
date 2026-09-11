const { Events } = require('discord.js');
const roleReactManager = require('../utils/roleReactManager');

module.exports = {
  name: Events.ChannelDelete,
  async execute(channel) {
    try {
      await roleReactManager.handleChannelDeleted(channel.client, channel);
    } catch (error) {
      console.error('[roleReactChannelDelete] Failed:', error);
    }
  },
};
