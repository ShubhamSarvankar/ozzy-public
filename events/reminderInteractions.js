const { Events } = require('discord.js');
const reminderManager = require('../utils/reminderManager');

// A second listener on Events.InteractionCreate, deliberately kept separate
// from events/interactionCreate.js (which stays free of component-handling
// logic, per the convention already established by leaderboardPaginator.js
// and rolereact.js). index.js registers one client.on(...) per file in
// events/, not once per event name, so this coexists fine.
//
// No live collector is ever attached to a reminder-fire message — buttons
// on it must keep working whether clicked 30 seconds or 30 days later,
// across any number of bot restarts in between. All state this handler
// needs (the reminder doc, its fireNonce) lives in Mongo, addressed
// entirely through the customId, so this global, always-registered
// listener is what makes that durability possible.
module.exports = {
  name: Events.InteractionCreate,
  async execute(interaction) {
    try {
      if (interaction.isButton() && interaction.customId.startsWith('remfire:')) {
        return await reminderManager.handleFireButton(interaction);
      }
      if (interaction.isStringSelectMenu() && interaction.customId.startsWith('remfire_snz:')) {
        return await reminderManager.handleSnoozeSelect(interaction);
      }
      if (interaction.isModalSubmit() && interaction.customId.startsWith('remfire_resched:')) {
        return await reminderManager.handleRescheduleModal(interaction);
      }
    } catch (error) {
      console.error('[reminderInteractions] Failed:', error);
    }
  },
};
