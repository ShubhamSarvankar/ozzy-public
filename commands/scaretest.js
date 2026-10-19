const { SlashCommandBuilder, PermissionFlagsBits, MessageFlags } = require('discord.js');
const manager = require('../halloween/discord/manager');

// Admin-only manual test of the Halloween voice scare. Joins whatever voice
// channel the invoking admin is in and plays the track through the same code
// path the automatic trigger uses, but without the season, member-count or
// cooldown gates, and without touching the persisted cooldown.

const REASONS = {
  idle: 'playback finished normally',
  timeout: 'hit the voiceMaxPlaySeconds cap before the track ended',
  'join-failed': 'the voice connection never became Ready',
  'connection-error': 'the voice connection raised an error (see the bot log)',
  'player-error': 'the audio player raised an error (see the bot log)',
  'file-error': 'the audio file could not be read (see the bot log)',
  disconnected: 'the connection was disconnected before playback finished',
  destroyed: 'the connection was destroyed before playback finished',
  error: 'the scare threw unexpectedly (see the bot log)',
  busy: 'a voice scare is already running; wait for it to finish',
  'voice-unavailable': 'the voice scare is off (audio file missing or @discordjs/voice failed to load at boot)',
  'not-initialized': 'the Halloween manager has not initialized yet',
  'not-a-voice-channel': 'you need to be in a regular voice channel (not a stage channel)',
  'missing-permissions': 'Ozzy lacks View Channel, Connect or Speak in that voice channel',
};

module.exports = {
  data: new SlashCommandBuilder()
    .setName('scaretest')
    .setDescription('Admin test: Ozzy joins your voice channel and plays the Halloween scare sound')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

  async execute(interaction) {
    // Picker-level restriction can be overridden per role by server admins,
    // so also check at runtime, same pattern as commands/lbmessages.js.
    if (!interaction.member || !interaction.member.permissions.has(PermissionFlagsBits.Administrator)) {
      return interaction.reply({ content: "You don't have permission to use this command.", flags: MessageFlags.Ephemeral });
    }

    const channel = interaction.member.voice ? interaction.member.voice.channel : null;
    if (!channel) {
      return interaction.reply({ content: 'Join a voice channel first, then run this again.', flags: MessageFlags.Ephemeral });
    }

    await interaction.reply({ content: `Joining ${channel} and playing the scare track...`, flags: MessageFlags.Ephemeral });

    let result;
    try {
      result = await manager.playTestScare(channel);
    } catch (error) {
      console.error('[scaretest] playTestScare threw:', error);
      result = { ok: false, reason: 'error' };
    }

    const explained = REASONS[result.reason] || result.reason;
    const elapsed = result.elapsedMs != null ? ` after ${(result.elapsedMs / 1000).toFixed(1)}s` : '';
    const content = result.ok
      ? `Scare test in ${channel} ended${elapsed}: ${result.reason} (${explained}).`
      : `Scare test did not start: ${result.reason} (${explained}).`;

    try {
      await interaction.editReply({ content });
    } catch (error) {
      console.error('[scaretest] editReply failed:', error);
    }
  },
};
