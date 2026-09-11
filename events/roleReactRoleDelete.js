const { Events } = require('discord.js');
const roleReactManager = require('../utils/roleReactManager');

module.exports = {
  name: Events.GuildRoleDelete,
  async execute(role) {
    try {
      await roleReactManager.handleRoleDeleted(role.client, role);
    } catch (error) {
      console.error('[roleReactRoleDelete] Failed:', error);
    }
  },
};
