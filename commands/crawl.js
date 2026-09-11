const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require('discord.js');
const CrawlState = require('../models/crawlStateSchema');
const { startCrawler } = require('../crawl/messageCrawler');
const { snowflakeToDate } = require('../utils/snowflake');

const STATE_ID = 'general';

module.exports = {
  data: new SlashCommandBuilder()
    .setName('crawl')
    .setDescription('Manage the historical message crawl')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addSubcommand((sub) => sub.setName('status').setDescription('Show crawl progress'))
    .addSubcommand((sub) => sub.setName('pause').setDescription('Stop the crawl (kill switch) — safe, resumable'))
    .addSubcommand((sub) => sub.setName('resume').setDescription('Resume a paused crawl'))
    .addSubcommand((sub) =>
      sub
        .setName('pace')
        .setDescription('Change the crawl request rate without a redeploy')
        .addNumberOption((opt) =>
          opt.setName('requests_per_second').setDescription('e.g. 2').setRequired(true).setMinValue(0.1).setMaxValue(10)
        )
    ),

  async execute(interaction) {
    if (!interaction.member.permissions.has(PermissionFlagsBits.Administrator)) {
      await interaction.reply({ content: "You don't have permission to use this command.", ephemeral: true });
      return;
    }

    await interaction.deferReply();
    const subcommand = interaction.options.getSubcommand();

    const state = await CrawlState.findOne({ _id: STATE_ID }).lean();

    if (!state && subcommand !== 'status') {
      await interaction.editReply('No crawl has started yet — it starts automatically on the next bot boot.');
      return;
    }

    switch (subcommand) {
      case 'status': {
        if (!state) {
          await interaction.editReply('No crawl state yet — it starts automatically on the next bot boot.');
          return;
        }
        const leaseActive = state.leaseExpiresAt && new Date(state.leaseExpiresAt) > new Date();
        const dateReached = snowflakeToDate(state.cursor);
        const embed = new EmbedBuilder()
          .setTitle('📜 Historical Crawl Status')
          .setColor(state.done ? 0x2ecc71 : state.paused ? 0xf1c40f : 0x45d6fd)
          .addFields(
            { name: 'Status', value: state.done ? 'Complete ✅' : state.paused ? 'Paused ⏸️' : leaseActive ? 'Running ▶️' : 'Idle (will resume next boot)', inline: true },
            { name: 'Pages fetched', value: state.pagesFetched.toLocaleString('en-US'), inline: true },
            { name: 'Pace', value: `${state.requestsPerSecond} req/s`, inline: true },
            { name: 'Reached', value: dateReached ? dateReached.toISOString().slice(0, 10) : 'unknown', inline: true },
            { name: 'Cursor', value: `\`${state.cursor}\``, inline: true },
            { name: 'Boundary', value: `\`${state.boundaryMessageId}\``, inline: true },
          );
        await interaction.editReply({ embeds: [embed] });
        return;
      }
      case 'pause': {
        if (state.done) {
          await interaction.editReply('The crawl is already complete — nothing to pause.');
          return;
        }
        await CrawlState.updateOne({ _id: STATE_ID }, { $set: { paused: true } });
        await interaction.editReply('⏸️ Kill switch set — the crawl will stop within one page fetch (a couple seconds).');
        return;
      }
      case 'resume': {
        if (state.done) {
          await interaction.editReply('The crawl is already complete — nothing to resume.');
          return;
        }
        if (!state.paused) {
          await interaction.editReply('The crawl is not paused — it should already be running (or will on next boot).');
          return;
        }
        await CrawlState.updateOne({ _id: STATE_ID }, { $set: { paused: false } });
        startCrawler(interaction.client).catch((err) => console.error('[crawler] resume failed to start:', err));
        await interaction.editReply('▶️ Resuming — crawl restarted from the saved cursor.');
        return;
      }
      case 'pace': {
        if (state.done) {
          await interaction.editReply('The crawl is already complete — pace no longer applies.');
          return;
        }
        const rps = interaction.options.getNumber('requests_per_second');
        await CrawlState.updateOne({ _id: STATE_ID }, { $set: { requestsPerSecond: rps } });
        await interaction.editReply(`Pace updated to ${rps} req/s — takes effect on the next page fetch.`);
        return;
      }
    }
  },
};
