const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('reactions')
    .setDescription('Commands related to reactions')
    .addSubcommand(subcommand =>
      subcommand
        .setName('event')
        .setDescription('Mentions users who reacted to a message and sends an event notification')
        .addStringOption(option =>
          option.setName('message')
            .setDescription('Full message URL (https://discord.com/channels/guildId/channelId/messageId)')
            .setRequired(true))
        .addChannelOption(option =>
          option.setName('channel')
            .setDescription('The channel where you want to send the mention message')
            .setRequired(true))
        .addStringOption(option =>
          option.setName('eventname')
            .setDescription('Name of the event')
            .setRequired(true))
        .addStringOption(option =>
          option.setName('servername')
            .setDescription('Name of the server')
            .setRequired(true))
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName('list')
        .setDescription('Lists all users who reacted to a specific message.')
        .addStringOption(option =>
          option.setName('message')
            .setDescription('Full message URL (https://discord.com/channels/guildId/channelId/messageId)')
            .setRequired(true))
        .addStringOption(option =>
          option.setName('format')
            .setDescription('How do you want the list back?')
            .setRequired(true)
            .addChoices(
              { name: 'Embed', value: 'embed' },
              { name: 'Plain Text', value: 'plain' },
            )
)

    ),

  async execute(interaction) {
    await interaction.deferReply();
    const subcommand = interaction.options.getSubcommand();

    // Helper: parse channelId & messageId from a full Discord message URL
    function parseMessageLink(url) {
      const parts = url.split('/');
      const idx = parts.indexOf('channels');
      if (idx === -1 || parts.length < idx + 4) {
        throw new Error('Invalid Discord message URL');
      }
      return {
        guildId: parts[idx + 1],
        channelId: parts[idx + 2],
        messageId: parts[idx + 3],
      };
    }

    try {
      // Common: parse URL & fetch origin message
      const link = interaction.options.getString('message');
      const { channelId: originChannelId, messageId } = parseMessageLink(link);
      const originChannel = await interaction.guild.channels.fetch(originChannelId);
      if (!originChannel?.isTextBased()) {
        return interaction.followUp('That channel isn’t a text channel or I can’t access it.');
      }
      const message = await originChannel.messages.fetch(messageId);

      // Collect all unique users who reacted
      const userIds = new Set();
      for (const reaction of message.reactions.cache.values()) {
        const users = await reaction.users.fetch();
        users.each(u => {
          if (!u.bot) userIds.add(u.id);
        });
      }

      if (subcommand === 'event') {
        const targetChannel = interaction.options.getChannel('channel');
        const eventName     = interaction.options.getString('eventname');
        const serverName    = interaction.options.getString('servername');

        if (!targetChannel.isTextBased()) {
          return interaction.followUp('Destination channel must be a text channel.');
        }

        // Build mention string
        const mentionStr = [...userIds].map(id => `<@${id}>`).join(' ');
        const finalMsg = `${mentionStr}

# My glorious gracious comrades, you reacted to the **${eventName}** event. Log on now!

# Server: ${serverName}

# https://www.cpjourney.net/`;

        await targetChannel.send(finalMsg);
        return interaction.followUp('Mentions and event notification sent successfully.');

      } else if (subcommand === 'list') {
        const format = interaction.options.getString('format');
        if (userIds.size === 0) {
          return interaction.followUp('No reactions found for the specified message.');
        }

        if (format === 'plain') {
    // build a code-block with one mention per line
          const lines = [...userIds].map(id => `<@${id}>`).join('\n');
          return interaction.followUp(`\`\`\`\n${lines}\n\`\`\``);
        }

        const userMentions = [...userIds].map(id => `<@${id}>`).join('\n');
        const embed = new EmbedBuilder()
          .setTitle('Users who reacted')
          .setDescription(userMentions)
          .setColor(0x00AAFF);

        return interaction.followUp({ embeds: [embed] });
      }

    } catch (err) {
      console.error('Error fetching message or reactions:', err);
      return interaction.followUp(
        '⚠️ Could not fetch that message. Make sure you supplied a **full message URL**, and that I have “Read Message History” in the origin channel.'
      );
    }
  },
};
