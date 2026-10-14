const { Events } = require('discord.js');
const manager = require('../halloween/discord/manager');

// Voice scare trigger. Needs GatewayIntentBits.GuildVoiceStates in index.js
// or this event never fires. The manager never throws on its own, but the
// try/catch stays as defense in depth: index.js exits the whole process on an
// unhandled rejection.
module.exports = {
  name: Events.VoiceStateUpdate,
  async execute(oldState, newState) {
    try {
      await manager.handleVoiceStateUpdate(oldState, newState);
    } catch (error) {
      console.error('[halloweenVoice] Failed:', error);
    }
  },
};
