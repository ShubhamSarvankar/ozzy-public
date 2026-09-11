const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require('discord.js');
const gotwModel = require('../models/gotwSchema');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('gotw')
    .setDescription('Manage !trigger commands')
    .addSubcommand(sub =>
      sub.setName('add')
        .setDescription('Register or add a response to a !trigger command')
        .addStringOption(opt =>
          opt.setName('trigger')
            .setDescription('The word after ! (e.g. "ducky" for !ducky)')
            .setRequired(true))
        .addStringOption(opt =>
          opt.setName('response')
            .setDescription('Text or URL to respond with')
            .setRequired(false))
        .addAttachmentOption(opt =>
          opt.setName('media')
            .setDescription('Image or GIF to respond with')
            .setRequired(false)))
    .addSubcommand(sub =>
      sub.setName('remove')
        .setDescription('Remove a !trigger and all responses associated with it')
        .addStringOption(opt =>
          opt.setName('trigger')
            .setDescription('The trigger to delete (without !)')
            .setRequired(true)))
    .addSubcommand(sub =>
      sub.setName('list')
        .setDescription('View all registered !trigger commands')),

  async execute(interaction) {
    const sub = interaction.options.getSubcommand();

    if (sub === 'add') {
      if (!interaction.member.permissions.has(PermissionFlagsBits.Administrator)) {
        return interaction.reply({
          content: 'You need to be a server admin to use this.',
          ephemeral: false
        });
      }

      const trigger = interaction.options.getString('trigger').toLowerCase().trim();
      const text = (interaction.options.getString('response') || '').trim();
      const media = interaction.options.getAttachment('media');

      if (!text && !media) {
        return interaction.reply({
          content: 'You must provide a response text, URL, or attach a media file.',
          ephemeral: false
        });
      }

      let mediaUrl = media ? media.url : null;

      // media.url from an attachment option is a short-lived "ephemeral-attachments"
      // CDN link that Discord garbage-collects once its `ex=` expiry passes, since
      // the file isn't attached to any persisted message yet. Post it as a real
      // message first so Discord issues it a permanent /attachments/ URL, then store
      // that instead — otherwise the stored gif silently breaks (empty embed) later.
      if (media) {
        try {
          const hostMsg = await interaction.channel.send({ files: [media.url] });
          const permanentUrl = hostMsg.attachments.first()?.url;
          if (permanentUrl) mediaUrl = permanentUrl;
        } catch (err) {
          console.error('[gotw add] failed to rehost media, falling back to ephemeral url', JSON.stringify({ trigger, mediaUrl: media.url }), err);
        }
      }

      let newResponse = text;
      if (media) newResponse = text ? `${text} ${mediaUrl}` : mediaUrl;

      try {
        const existing = await gotwModel.findOne({ trigger });

        if (existing) {
          existing.responses.push(newResponse);
          await existing.save();
          await interaction.reply({
            content: `✅ Added a new response to \`!${trigger}\`. It now has **${existing.responses.length}** response(s).`,
            ephemeral: false
          });
        } else {
          await gotwModel.create({ trigger, responses: [newResponse] });
          await interaction.reply({
            content: `✅ \`!${trigger}\` has been created.`,
            ephemeral: false
          });
        }
      } catch (err) {
        console.error('[gotw add]', err);
        await interaction.reply({
          content: 'Something went wrong saving that command.',
          ephemeral: false
        });
      }
      return;
    }

    if (sub === 'remove') {
      if (!interaction.member.permissions.has(PermissionFlagsBits.Administrator)) {
        return interaction.reply({
          content: 'You need to be a server admin to use this.',
          ephemeral: false
        });
      }

      const trigger = interaction.options.getString('trigger').toLowerCase().trim();

      try {
        const deleted = await gotwModel.findOneAndDelete({ trigger });

        if (!deleted) {
          return interaction.reply({
            content: `No trigger found for \`!${trigger}\`.`,
            ephemeral: false
          });
        }

        const removedCount = deleted.responses?.length || 0;

        await interaction.reply({
          content: `🗑️ Removed \`!${trigger}\` and **${removedCount}** associated response(s).`,
          ephemeral: false
        });
      } catch (err) {
        console.error('[gotw remove]', err);
        await interaction.reply({
          content: 'Something went wrong removing that command.',
          ephemeral: false
        });
      }
      return;
    }

    if (sub === 'list') {
      try {
        const all = await gotwModel.find().sort({ trigger: 1 });

        if (!all.length) {
          return interaction.reply({ content: 'No triggers registered yet.', ephemeral: false });
        }

        const lines = all.map(cmd => {
          const count = cmd.responses.length;
          return count > 1
            ? `\`!${cmd.trigger}\` — ${count} random responses`
            : `\`!${cmd.trigger}\``;
        });

        const chunks = [];
        let current = '';

        for (const line of lines) {
          if ((current + '\n' + line).length > 4000) {
            chunks.push(current);
            current = line;
          } else {
            current = current ? current + '\n' + line : line;
          }
        }

        if (current) chunks.push(current);

        const embeds = chunks.map((chunk, i) => {
          const embed = new EmbedBuilder()
            .setColor('#5865F2')
            .setDescription(chunk);

          if (i === 0) embed.setTitle(`Registered Triggers (${all.length})`);
          return embed;
        });

        await interaction.reply({ embeds, ephemeral: false });
      } catch (err) {
        console.error('[gotw list]', err);
        await interaction.reply({
          content: 'Something went wrong fetching the list.',
          ephemeral: false
        });
      }
    }
  }
};