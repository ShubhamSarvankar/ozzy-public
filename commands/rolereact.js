const {
  SlashCommandBuilder,
  EmbedBuilder,
  PermissionFlagsBits,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  ActionRowBuilder,
  MessageFlags,
} = require('discord.js');
const { RoleReact, RoleReactAssignment } = require('../models/roleReactSchema');
const roleReactManager = require('../utils/roleReactManager');

const MAX_ACTIVE_PER_GUILD = 15;
const MODAL_TIMEOUT_MS = 300000;
const EMOJI_PROMPT_TIMEOUT_MS = 60000;
const CROCKFORD_ALPHABET = '0123456789ABCDEFGHJKMNPQRSTVWXYZ';

// Handing one of these out behind a public reaction is a serious footgun —
// allowed only for the guild owner, and only with a warning in the reply.
const DANGEROUS_PERMISSIONS = [
  PermissionFlagsBits.Administrator,
  PermissionFlagsBits.ManageGuild,
  PermissionFlagsBits.ManageRoles,
  PermissionFlagsBits.BanMembers,
  PermissionFlagsBits.KickMembers,
  PermissionFlagsBits.ManageChannels,
];

function addPoolRoleOptions(sub) {
  sub.addRoleOption((opt) => opt.setName('role_1').setDescription('Role 1').setRequired(true));
  sub.addRoleOption((opt) => opt.setName('role_2').setDescription('Role 2').setRequired(true));
  sub.addRoleOption((opt) => opt.setName('role_3').setDescription('Role 3 (optional)').setRequired(false));
  sub.addRoleOption((opt) => opt.setName('role_4').setDescription('Role 4 (optional)').setRequired(false));
  sub.addRoleOption((opt) => opt.setName('role_5').setDescription('Role 5 (optional)').setRequired(false));
  return sub;
}

function escapeRegex(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName('rolereact')
    .setDescription('Grant roles to members who react to a message')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addSubcommand((sub) =>
      sub
        .setName('solo')
        .setDescription('Grant one role to everyone who reacts')
        .addRoleOption((opt) => opt.setName('role').setDescription('The role to grant').setRequired(true)))
    .addSubcommand((sub) =>
      addPoolRoleOptions(sub.setName('mucho').setDescription('Grant one random role from a pool to everyone who reacts')))
    .addSubcommand((sub) =>
      addPoolRoleOptions(sub.setName('team').setDescription('Grant roles in a balanced way so teams stay evenly sized')))
    .addSubcommand((sub) =>
      addPoolRoleOptions(sub.setName('semirandom').setDescription('Like team, but weighted-random: smaller teams are more likely, not guaranteed')))
    .addSubcommand((sub) =>
      sub.setName('list').setDescription('Show active rolereacts and their IDs'))
    .addSubcommand((sub) =>
      sub
        .setName('end')
        .setDescription('Stop an active rolereact')
        .addStringOption((opt) =>
          opt.setName('id').setDescription('The rolereact ID').setRequired(true).setAutocomplete(true))),

  async execute(interaction) {
    if (!interaction.member.permissions.has(PermissionFlagsBits.Administrator)) {
      return interaction.reply({ content: "You don't have permission to use this command.", flags: MessageFlags.Ephemeral });
    }

    const sub = interaction.options.getSubcommand();

    if (sub === 'solo' || sub === 'mucho' || sub === 'team' || sub === 'semirandom') return handleCreate(interaction, sub);
    if (sub === 'list') return handleList(interaction);
    if (sub === 'end') return handleEnd(interaction);
  },

  async autocomplete(interaction) {
    try {
      if (interaction.options.getSubcommand() !== 'end') {
        return interaction.respond([]);
      }

      const focused = interaction.options.getFocused().toUpperCase();
      const docs = await RoleReact.find({
        guildId: interaction.guild.id,
        active: true,
        shortId: { $regex: `^${escapeRegex(focused)}` },
      }).limit(25);

      await interaction.respond(docs.map((d) => ({
        name: `${d.shortId} | ${d.strategy} | #${interaction.guild.channels.cache.get(d.channelId)?.name || 'unknown'}`.slice(0, 100),
        value: d.shortId,
      })));
    } catch (error) {
      console.error('[rolereact end] Autocomplete failed:', error);
      await interaction.respond([]).catch(() => {});
    }
  },
};

function collectRoleOptions(interaction, strategy) {
  if (strategy === 'solo') {
    return [interaction.options.getRole('role', true)];
  }
  const roles = [];
  for (let i = 1; i <= 5; i++) {
    const role = interaction.options.getRole(`role_${i}`, i <= 2);
    if (role) roles.push(role);
  }
  return roles;
}

function validateRoles(interaction, roles) {
  const guild = interaction.guild;
  const isOwner = guild.ownerId === interaction.user.id;
  const seen = new Set();
  let warning = null;

  for (const role of roles) {
    if (seen.has(role.id)) {
      return { error: `**${role.name}** was selected more than once.` };
    }
    seen.add(role.id);

    if (role.id === guild.roles.everyone.id) {
      return { error: `**${role.name}** is the @everyone role and can't be used.` };
    }

    if (role.managed) {
      return { error: `**${role.name}** is a managed role (bot/integration/booster) and can't be assigned manually.` };
    }

    if (guild.members.me.roles.highest.comparePositionTo(role) <= 0) {
      return { error: `**${role.name}** is positioned at or above my own highest role — I can't assign it.` };
    }

    if (!isOwner && interaction.member.roles.highest.comparePositionTo(role) <= 0) {
      return { error: `**${role.name}** is positioned at or above your own highest role.` };
    }

    const dangerousBit = DANGEROUS_PERMISSIONS.find((bit) => role.permissions.has(bit));
    if (dangerousBit) {
      if (!isOwner) {
        return { error: `**${role.name}** carries a privileged permission — only the server owner can hand it out via rolereact.` };
      }
      warning = `⚠️ **${role.name}** carries privileged permissions — this rolereact can hand out real admin-level access.`;
    }
  }

  return { error: null, warning };
}

function checkBotPermissions(interaction) {
  const botMember = interaction.guild.members.me;
  if (!botMember.permissions.has(PermissionFlagsBits.ManageRoles)) {
    return "I don't have the Manage Roles permission in this server.";
  }
  const channelPerms = interaction.channel.permissionsFor(botMember);
  if (!channelPerms?.has(PermissionFlagsBits.SendMessages) || !channelPerms?.has(PermissionFlagsBits.AddReactions)) {
    return "I don't have permission to send messages and add reactions in this channel.";
  }
  return null;
}

function buildSetupModal(strategy, customId) {
  const defaultMessage = strategy === 'solo'
    ? 'React below to get the role!'
    : strategy === 'mucho'
      ? 'React below to get a random role from the pool!'
      : strategy === 'semirandom'
        ? 'React below to get randomly sorted onto a team (smaller teams are more likely)!'
        : 'React below to get sorted onto a team!';

  // No emoji field here — Discord modals are plain text inputs with no
  // emoji-picker widget (that's a message-composer-only feature), so typing
  // one in means hand-crafting a raw <:name:id> string. The trigger emoji is
  // instead captured by having the admin react to a prompt after this modal
  // is submitted (see promptForEmoji), which works for any emoji they have
  // access to — default, or custom from any server they're in — with no
  // typing required.
  return new ModalBuilder()
    .setCustomId(customId)
    .setTitle(`Set up ${strategy} role-react`)
    .addComponents(
      new ActionRowBuilder().addComponents(
        new TextInputBuilder()
          .setCustomId('message')
          .setLabel('Message body')
          .setStyle(TextInputStyle.Paragraph)
          .setRequired(true)
          .setMaxLength(2000)
          .setValue(defaultMessage)),
      new ActionRowBuilder().addComponents(
        new TextInputBuilder()
          .setCustomId('title')
          .setLabel('Embed title (optional)')
          .setStyle(TextInputStyle.Short)
          .setRequired(false)
          .setMaxLength(256)),
    );
}

// Asks the admin to react to a prompt message with the emoji they want as
// the trigger, instead of typing it. Returns the emoji identity read
// straight off their reaction — already exactly what Discord will report on
// every future incoming reaction, so there's no typed-text/normalization
// mismatch to worry about, and no separate reachability check is needed
// (if the bot can't react with it, that surfaces naturally when the real
// instance message is posted a moment later).
async function promptForEmoji(interaction) {
  let promptMessage;
  try {
    promptMessage = await interaction.channel.send({
      content: `${interaction.user}, react to **this message** with the emoji you want to use as this rolereact's trigger. Expires in 60 seconds.`,
    });
  } catch (error) {
    console.error('[rolereact] Failed to send emoji prompt message:', error);
    return { error: "I couldn't post the emoji prompt in this channel." };
  }

  let collected;
  try {
    collected = await promptMessage.awaitReactions({
      filter: (reaction, user) => user.id === interaction.user.id,
      max: 1,
      time: EMOJI_PROMPT_TIMEOUT_MS,
      errors: ['time'],
    });
  } catch {
    await promptMessage.delete().catch(() => {});
    return { error: 'Timed out waiting for a reaction. Nothing was saved — run the command again.' };
  }

  await promptMessage.delete().catch(() => {});

  let reaction = collected.first();
  if (reaction.partial) {
    reaction = await reaction.fetch().catch(() => null);
    if (!reaction) return { error: 'Something went wrong reading that reaction — try again.' };
  }

  return {
    error: null,
    emojiName: reaction.emoji.name,
    emojiId: reaction.emoji.id,
    emojiAnimated: !!reaction.emoji.animated,
    reactTarget: reaction.emoji,
  };
}

async function generateShortId() {
  const { customAlphabet } = await import('nanoid');
  const generate = customAlphabet(CROCKFORD_ALPHABET, 6);
  return generate();
}

async function handleCreate(interaction, strategy) {
  const roles = collectRoleOptions(interaction, strategy);

  const { error: roleError, warning } = validateRoles(interaction, roles);
  if (roleError) {
    return interaction.reply({ content: roleError, flags: MessageFlags.Ephemeral });
  }

  const activeCount = await RoleReact.countDocuments({ guildId: interaction.guild.id, active: true });
  if (activeCount >= MAX_ACTIVE_PER_GUILD) {
    return interaction.reply({
      content: `This server already has ${MAX_ACTIVE_PER_GUILD} active rolereacts, the maximum allowed. End one with \`/rolereact end\` before creating another.`,
      flags: MessageFlags.Ephemeral,
    });
  }

  const permError = checkBotPermissions(interaction);
  if (permError) {
    return interaction.reply({ content: permError, flags: MessageFlags.Ephemeral });
  }

  const modalCustomId = `rolereact_setup_${interaction.id}`;
  await interaction.showModal(buildSetupModal(strategy, modalCustomId));

  let submitted;
  try {
    submitted = await interaction.awaitModalSubmit({
      time: MODAL_TIMEOUT_MS,
      filter: (i) => i.customId === modalCustomId && i.user.id === interaction.user.id,
    });
  } catch {
    return; // timed out — nothing was ever created, silent cancel
  }

  await submitted.deferReply({ flags: MessageFlags.Ephemeral });

  try {
    await finishCreate(interaction, submitted, strategy, roles, warning);
  } catch (error) {
    console.error(`[rolereact ${strategy}] Failed:`, error);
    await submitted.editReply({ content: 'Something went wrong setting that up. Nothing was saved.' }).catch(() => {});
  }
}

async function finishCreate(interaction, submitted, strategy, roles, warning) {
  const messageBody = submitted.fields.getTextInputValue('message');
  const titleRaw = submitted.fields.getTextInputValue('title');
  const messageTitle = titleRaw?.trim() || null;

  await submitted.editReply({ content: 'Check the channel — react to my prompt message with the trigger emoji you want to use.' });

  const emojiResult = await promptForEmoji(interaction);
  if (emojiResult.error) {
    return submitted.editReply({ content: emojiResult.error });
  }

  const roleEntries = roles.map((role, index) => ({
    roleId: role.id,
    emojiName: emojiResult.emojiName,
    emojiId: emojiResult.emojiId,
    emojiAnimated: emojiResult.emojiAnimated,
    assignedCount: 0,
    position: index,
  }));

  let doc;
  let shortId;
  for (let attempt = 0; attempt < 5; attempt++) {
    shortId = await generateShortId();
    try {
      // unreactRemovesRole/removeUnregisteredReactions/dmUserOnAssignment are
      // intentionally left unset — the schema defaults them to (true, false,
      // false), i.e. react grants the role, unreact revokes it, nothing else.
      // No admin-facing way to change this: a comma-separated flag field
      // nobody would remember the names of isn't worth the complexity.
      doc = await RoleReact.create({
        shortId,
        guildId: interaction.guild.id,
        channelId: interaction.channel.id,
        messageId: null,
        strategy,
        roles: roleEntries,
        messageBody,
        messageTitle,
        active: true,
        createdBy: interaction.user.id,
      });
      break;
    } catch (error) {
      if (error && error.code === 11000 && attempt < 4) continue; // shortId collision, retry
      throw error;
    }
  }

  let message;
  try {
    const payload = messageTitle
      ? { embeds: [new EmbedBuilder().setTitle(messageTitle).setDescription(messageBody).setColor('#5865F2')] }
      : { content: messageBody };

    message = await interaction.channel.send(payload);
    // If the bot can't actually react with this emoji (e.g. a custom emoji
    // from a server the admin is in but the bot isn't), it fails right here
    // rather than at an earlier standalone reachability check.
    await message.react(emojiResult.reactTarget);
  } catch (error) {
    // An instance row must never point at a message that doesn't exist.
    await RoleReact.findByIdAndDelete(doc._id).catch(() => {});
    console.error(`[rolereact ${strategy}] Failed to publish instance message:`, error);
    return submitted.editReply({ content: 'Something went wrong creating that message — nothing was saved. (If you picked a custom emoji, make sure it\'s from a server I\'m also in.)' });
  }

  await RoleReact.findByIdAndUpdate(doc._id, { messageId: message.id });
  doc.messageId = message.id;
  roleReactManager.register(doc);

  const lines = [
    `**Rolereact created:** \`${shortId}\` (${strategy})`,
    `Roles: ${roles.map((r) => `<@&${r.id}>`).join(', ')}`,
    `[Jump to message](${message.url})`,
  ];
  if (warning) lines.push(warning);

  await submitted.editReply({ content: lines.join('\n') });
}

async function handleList(interaction) {
  await interaction.deferReply();

  const docs = await RoleReact.find({ guildId: interaction.guild.id, active: true }).sort({ createdAt: 1 });

  if (!docs.length) {
    return interaction.editReply({ content: 'There are no active rolereacts in this server.' });
  }

  const embeds = [];
  let current = new EmbedBuilder().setTitle('Active Rolereacts').setColor('#0099FF');
  let fieldCount = 0;

  for (const doc of docs) {
    if (fieldCount === 10) {
      embeds.push(current);
      current = new EmbedBuilder().setColor('#0099FF');
      fieldCount = 0;
    }

    const createdUnix = Math.floor(doc.createdAt.getTime() / 1000);
    const jumpLink = doc.messageId
      ? `https://discord.com/channels/${doc.guildId}/${doc.channelId}/${doc.messageId}`
      : null;

    const emojiDisplay = doc.roles[0]?.emojiId
      ? `<${doc.roles[0].emojiAnimated ? 'a' : ''}:${doc.roles[0].emojiName}:${doc.roles[0].emojiId}>`
      : doc.roles[0]?.emojiName || '?';

    const isCounted = doc.strategy === 'team' || doc.strategy === 'semirandom';
    const roleLines = isCounted
      ? doc.roles.map((r) => `<@&${r.roleId}> — ${r.assignedCount}`).join('\n')
      : doc.roles.map((r) => `<@&${r.roleId}>`).join(', ');

    let value = `Strategy: **${doc.strategy}**\nChannel: <#${doc.channelId}>\n`;
    value += jumpLink ? `[Jump to message](${jumpLink})\n` : '';
    value += `Trigger: ${emojiDisplay}\n`;
    value += `Roles:\n${roleLines}\n`;

    if (!isCounted) {
      const total = await RoleReactAssignment.countDocuments({ shortId: doc.shortId });
      value += `Total assignments: ${total}\n`;
    }

    value += `Created by <@${doc.createdBy}> <t:${createdUnix}:R>`;

    current.addFields({ name: doc.shortId, value: value.slice(0, 1024) });
    fieldCount++;
  }

  embeds.push(current);
  await interaction.editReply({ embeds });
}

async function handleEnd(interaction) {
  const shortId = interaction.options.getString('id').toUpperCase();

  const doc = await RoleReact.findOne({ guildId: interaction.guild.id, shortId, active: true });
  if (!doc) {
    return interaction.reply({
      content: `No active rolereact with ID \`${shortId}\` found in this server.`,
      flags: MessageFlags.Ephemeral,
    });
  }

  await interaction.deferReply({ flags: MessageFlags.Ephemeral });

  try {
    await roleReactManager.deactivate(interaction.client, shortId, `Ended by ${interaction.user.tag}`);
    await RoleReact.findByIdAndUpdate(doc._id, { endedBy: interaction.user.id, endedAt: new Date() });

    const assignmentCount = await RoleReactAssignment.countDocuments({ shortId });

    try {
      const channel = await interaction.guild.channels.fetch(doc.channelId).catch(() => null);
      const message = channel && doc.messageId ? await channel.messages.fetch(doc.messageId).catch(() => null) : null;

      if (message) {
        for (const reaction of message.reactions.cache.values()) {
          if (reaction.me) await reaction.users.remove(interaction.client.user.id).catch(() => {});
        }

        if (message.embeds.length) {
          const embed = EmbedBuilder.from(message.embeds[0]).setDescription(
            `${message.embeds[0].description || ''}\n\n*This rolereact is closed.*`.trim()
          );
          await message.edit({ embeds: [embed] }).catch(() => {});
        } else {
          await message.edit({ content: `${message.content}\n\n*This rolereact is closed.*` }).catch(() => {});
        }
      }
    } catch (error) {
      console.error(`[rolereact end] Non-fatal cleanup failure for ${shortId}:`, error);
    }

    await interaction.editReply({
      content: `Ended rolereact \`${shortId}\`. It made ${assignmentCount} assignment${assignmentCount === 1 ? '' : 's'}.`,
    });
  } catch (error) {
    console.error(`[rolereact end] Failed:`, error);
    await interaction.editReply({ content: 'Something went wrong ending that rolereact.' }).catch(() => {});
  }
}
