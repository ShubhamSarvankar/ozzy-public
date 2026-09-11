const { Events } = require('discord.js');
const roleReactManager = require('../utils/roleReactManager');

module.exports = {
  name: Events.MessageBulkDelete,
  async execute(messages) {
    try {
      const client = messages.first()?.client;
      if (!client) return;
      await roleReactManager.handleMessageDeletedBulk(client, messages);
    } catch (error) {
      console.error('[roleReactMessageDeleteBulk] Failed:', error);
    }
  },
};
