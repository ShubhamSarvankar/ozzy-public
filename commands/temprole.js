const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const tempRoleModel = require('../models/tempRoleSchema');
const tempRoleManager = require('../utils/tempRoleManager');
const { parseDuration } = require('../utils/parseDuration');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('temprole')
    .setDescription('Grant or manage temporary roles')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addSubcommand(subcommand =>
      subcommand
        .setName('add')
        .setDescription('Add a role to a member for a set duration')
        .addUserOption(option =>
          option.setName('user').setDescription('The member to grant the role to').setRequired(true))
        .addRoleOption(option =>
          option.setName('role').setDescription('The role to grant').setRequired(true))
        .addStringOption(option =>
          option.setName('duration').setDescription('How long, e.g. 10m, 2h, 1d12h, 1w').setRequired(true)))
    .addSubcommand(subcommand =>
      subcommand
        .setName('remove')
        .setDescription('Remove an active temporary role grant early')
        .addUserOption(option =>
          option.setName('user').setDescription('The member to remove the role from').setRequired(true))
        .addRoleOption(option =>
          option.setName('role').setDescription('The role to remove').setRequired(true)))
    .addSubcommand(subcommand =>
      subcommand
        .setName('list')
        .setDescription('List active temporary role grants')
        .addUserOption(option =>
          option.setName('user').setDescription('Only show grants for this member').setRequired(false))),

  async execute(interaction) {
    if (!interaction.member.permissions.has(PermissionFlagsBits.Administrator)) {
      return interaction.reply({ content: "You don't have permission to use this command.", ephemeral: true });
    }

    const sub = interaction.options.getSubcommand();

    if (sub === 'add') return handleAdd(interaction);
    if (sub === 'remove') return handleRemove(interaction);
    if (sub === 'list') return handleList(interaction);
  },
};

async function handleAdd(interaction) {
  await interaction.deferReply();

  const targetUser = interaction.options.getUser('user');
  const targetRole = interaction.options.getRole('role');
  const durationInput = interaction.options.getString('duration');

  let durationMs;
  try {
    durationMs = parseDuration(durationInput);
  } catch (error) {
    return interaction.editReply({ content: error.message });
  }

  const botMember = interaction.guild.members.me;
  if (botMember.roles.highest.comparePositionTo(targetRole) <= 0) {
    return interaction.editReply({
      content: `I can't assign **${targetRole.name}** because it's positioned at or above my own highest role.`,
    });
  }

  const member = await interaction.guild.members.fetch(targetUser.id).catch(() => null);
  if (!member) {
    return interaction.editReply({ content: 'Could not find that member in this server.' });
  }

  const expiresAt = new Date(Date.now() + durationMs);

  try {
    await member.roles.add(targetRole, `Temporary role added by ${interaction.user.tag}`);

    let doc = await tempRoleModel.findOne({
      guildId: interaction.guild.id,
      userId: targetUser.id,
      roleId: targetRole.id,
      active: true,
    });

    if (doc) {
      doc.expiresAt = expiresAt;
      doc.addedBy = interaction.user.id;
      await doc.save();
    } else {
      doc = await tempRoleModel.create({
        guildId: interaction.guild.id,
        userId: targetUser.id,
        roleId: targetRole.id,
        expiresAt,
        addedBy: interaction.user.id,
      });
    }

    tempRoleManager.scheduleRemoval(interaction.client, doc);

    const expiresUnix = Math.floor(expiresAt.getTime() / 1000);
    const embed = new EmbedBuilder()
      .setTitle('Temporary Role Added')
      .setColor('#00FF00')
      .setDescription(
        `Added **${targetRole.name}** to <@${targetUser.id}>.\nExpires <t:${expiresUnix}:R> (<t:${expiresUnix}:f>).`
      );

    await interaction.editReply({ embeds: [embed] });
  } catch (error) {
    console.error('[temprole add] Failed:', error);
    await interaction.editReply({ content: 'An error occurred while adding the temporary role.' });
  }
}

async function handleRemove(interaction) {
  await interaction.deferReply();

  const targetUser = interaction.options.getUser('user');
  const targetRole = interaction.options.getRole('role');

  const doc = await tempRoleModel.findOne({
    guildId: interaction.guild.id,
    userId: targetUser.id,
    roleId: targetRole.id,
    active: true,
  });

  if (!doc) {
    return interaction.editReply({
      content: `No active temporary grant of **${targetRole.name}** found for <@${targetUser.id}>.`,
    });
  }

  try {
    await tempRoleManager.removeTempRole(
      interaction.client,
      doc,
      `Temporary role removed early by ${interaction.user.tag}`
    );

    const embed = new EmbedBuilder()
      .setTitle('Temporary Role Removed')
      .setColor('#FF0000')
      .setDescription(`Removed **${targetRole.name}** from <@${targetUser.id}>.`);

    await interaction.editReply({ embeds: [embed] });
  } catch (error) {
    console.error('[temprole remove] Failed:', error);
    await interaction.editReply({ content: 'An error occurred while removing the temporary role.' });
  }
}

async function handleList(interaction) {
  await interaction.deferReply();

  const targetUser = interaction.options.getUser('user');
  const query = { guildId: interaction.guild.id, active: true };
  if (targetUser) query.userId = targetUser.id;

  const docs = await tempRoleModel.find(query).sort({ expiresAt: 1 });

  if (!docs.length) {
    return interaction.editReply({
      content: targetUser
        ? `<@${targetUser.id}> has no active temporary role grants.`
        : 'There are no active temporary role grants in this server.',
    });
  }

  const description = docs.map(doc => {
    const expiresUnix = Math.floor(doc.expiresAt.getTime() / 1000);
    return `<@${doc.userId}> — <@&${doc.roleId}> — expires <t:${expiresUnix}:R>`;
  }).join('\n');

  const embed = new EmbedBuilder()
    .setTitle(targetUser ? `Temporary Roles for ${targetUser.tag}` : 'Active Temporary Roles')
    .setColor('#0099FF')
    .setDescription(description);

  await interaction.editReply({ embeds: [embed] });
}
