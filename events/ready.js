const { Events } = require("discord.js");
const tempRoleManager = require('../utils/tempRoleManager');
const roleReactManager = require('../utils/roleReactManager');
const reminderManager = require('../utils/reminderManager');
const pictionaryManager = require('../pictionary/discord/manager');
const halloweenManager = require('../halloween/discord/manager');
const featureFlags = require('../utils/featureFlags');

module.exports = {
  name: Events.ClientReady,
  once: true,
  async execute(client) {
    console.log(`Ready~ Logged in as ${client.user.tag}`);

    tempRoleManager.initialize(client);
    roleReactManager.initialize(client);
    reminderManager.initialize(client);
    if (featureFlags.MESSAGE_CONTENT_ENABLED) {
      pictionaryManager.initialize(client);
    } else {
      console.log('[pictionary] not initialized: Message Content intent unavailable (utils/featureFlags.js)');
    }
    halloweenManager.initialize(client);
  },
};
