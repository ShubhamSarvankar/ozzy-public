const { Events } = require('discord.js');
const roleReactManager = require('../utils/roleReactManager');

module.exports = {
  name: Events.MessageDelete,
  async execute(message) {
    try {
      await roleReactManager.handleMessageDeleted(message.client, message);
    } catch (error) {
      console.error('[roleReactMessageDelete] Failed:', error);
    }
  },
};
