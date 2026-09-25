const { Events } = require("discord.js");
const tempRoleManager = require('../utils/tempRoleManager');
const roleReactManager = require('../utils/roleReactManager');
const reminderManager = require('../utils/reminderManager');
const pictionaryManager = require('../pictionary/discord/manager');

module.exports = {
  name: Events.ClientReady,
  once: true,
  async execute(client) {
    console.log(`Ready~ Logged in as ${client.user.tag}`);

    tempRoleManager.initialize(client);
    roleReactManager.initialize(client);
    reminderManager.initialize(client);
    pictionaryManager.initialize(client);
  },
};
