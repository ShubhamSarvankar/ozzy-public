const {
  SlashCommandBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, MessageFlags,
  ModalBuilder, TextInputBuilder, TextInputStyle, EmbedBuilder,
} = require('discord.js');
const Reminder = require('../models/reminderSchema');
const UserSettings = require('../models/userSettingsSchema');
const { nextSeq } = require('../models/counterSchema');
const { parseWhen } = require('../utils/parseReminderTime');
const { parseRecurrence, nextOccurrence, describeRule } = require('../utils/parseRecurrence');
const { isValidTimeZone, fieldSpaceToUtc } = require('../utils/timezoneMath');
const reminderManager = require('../utils/reminderManager');
const { RRule } = require('rrule');

const CONFIRM_TIMEOUT_MS = 60000;
const MODAL_TIMEOUT_MS = 300000;
const MAX_ACTIVE_PER_USER = 50;

const SHORT_GUIDE = [
  '**Quick guide to `/remind`:**',
  '`/remind channel create` — remind this channel (optionally pinging a user or role)',
  '`/remind dm create` — remind yourself or another user by DM',
  '`/remind list` (or `/reminders`) — see your active reminders',
  '`/remind edit|delete|pause|resume <id>` — manage an existing reminder',
  '`/remind timezone set|show` — set your timezone so natural-language times resolve correctly',
  '',
  'Times understood: "in 45 minutes", "tonight at 8", "next friday". Recurrence: "every monday at 10am", "weekdays at 8am", "every first monday of the month at 9am".',
].join('\n');

function escapeRegex(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

async function getTimezone(userId) {
  const settings = await UserSettings.findOne({ userId });
  if (settings?.timezone) return { timezone: settings.timezone, isDefault: false };
  return { timezone: 'UTC', isDefault: true };
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName('remind')
    .setDescription('Create and manage reminders — /remind channel create, /remind dm create, /remind list, and more')
    .addSubcommandGroup((group) => group
      .setName('channel')
      .setDescription('Reminders delivered to a server channel')
      .addSubcommand((sub) => addCreateOptions(sub.setName('create').setDescription('Create a channel reminder'), { channel: true }))
    )
    .addSubcommandGroup((group) => group
      .setName('dm')
      .setDescription('Reminders delivered by DM (always single-target)')
      .addSubcommand((sub) => addCreateOptions(sub.setName('create').setDescription('Create a DM reminder'), { channel: false }))
    )
    .addSubcommandGroup((group) => group
      .setName('timezone')
      .setDescription('Your timezone for natural-language reminder times')
      .addSubcommand((sub) => sub.setName('set').setDescription('Set your timezone')
        .addStringOption((opt) => opt.setName('tz').setDescription('IANA timezone, e.g. America/New_York').setRequired(true).setAutocomplete(true)))
      .addSubcommand((sub) => sub.setName('show').setDescription('Show your currently stored timezone'))
    )
    .addSubcommand((sub) => sub.setName('edit').setDescription('Edit an existing reminder')
      .addStringOption((opt) => opt.setName('id').setDescription('Reminder ID').setRequired(true).setAutocomplete(true)))
    .addSubcommand((sub) => sub.setName('delete').setDescription('Delete a reminder')
      .addStringOption((opt) => opt.setName('id').setDescription('Reminder ID').setRequired(true).setAutocomplete(true)))
    .addSubcommand((sub) => sub.setName('pause').setDescription('Pause a recurring reminder')
      .addStringOption((opt) => opt.setName('id').setDescription('Reminder ID').setRequired(true).setAutocomplete(true)))
    .addSubcommand((sub) => sub.setName('resume').setDescription('Resume a paused recurring reminder')
      .addStringOption((opt) => opt.setName('id').setDescription('Reminder ID').setRequired(true).setAutocomplete(true)))
    .addSubcommand((sub) => sub.setName('list').setDescription('Show your active reminders')),

  async execute(interaction) {
    const group = interaction.options.getSubcommandGroup(false);
    const sub = interaction.options.getSubcommand(false);

    if (!sub) {
      return interaction.reply({ content: SHORT_GUIDE, flags: MessageFlags.Ephemeral });
    }

    try {
      if (group === 'channel' && sub === 'create') return await handleCreate(interaction, true);
      if (group === 'dm' && sub === 'create') return await handleCreate(interaction, false);
      if (group === 'timezone' && sub === 'set') return await handleTimezoneSet(interaction);
      if (group === 'timezone' && sub === 'show') return await handleTimezoneShow(interaction);
      if (sub === 'edit') return await handleEdit(interaction);
      if (sub === 'delete') return await handleDelete(interaction);
      if (sub === 'pause') return await handlePauseResume(interaction, 'paused');
      if (sub === 'resume') return await handlePauseResume(interaction, 'active');
      if (sub === 'list') return await handleList(interaction);
    } catch (error) {
      console.error(`[remind ${group ? group + ' ' : ''}${sub}] Failed:`, error);
      const payload = { content: 'Something went wrong with that. Please try again.', flags: MessageFlags.Ephemeral };
      if (interaction.deferred || interaction.replied) {
        await interaction.editReply(payload).catch(() => {});
      } else {
        await interaction.reply(payload).catch(() => {});
      }
    }
  },

  async autocomplete(interaction) {
    try {
      const group = interaction.options.getSubcommandGroup(false);
      const sub = interaction.options.getSubcommand(false);

      if (group === 'timezone' && sub === 'set') {
        const focused = interaction.options.getFocused().toLowerCase();
        const zones = Intl.supportedValuesOf('timeZone').filter((z) => z.toLowerCase().includes(focused)).slice(0, 25);
        return interaction.respond(zones.map((z) => ({ name: z, value: z })));
      }

      if (['edit', 'delete', 'pause', 'resume'].includes(sub)) {
        const focused = interaction.options.getFocused();
        const statusFilter = sub === 'pause' ? ['active'] : sub === 'resume' ? ['paused'] : ['active', 'paused'];
        const query = {
          creatorId: interaction.user.id,
          status: { $in: statusFilter },
          shortId: { $regex: `^${escapeRegex(focused)}`, $options: 'i' },
        };
        if (sub === 'pause' || sub === 'resume') query['schedule.kind'] = 'recurring';

        const docs = await Reminder.find(query).limit(25);
        return interaction.respond(docs.map((d) => ({
          name: `${d.shortId} | ${d.message.slice(0, 60)}`.slice(0, 100),
          value: d.shortId,
        })));
      }

      return interaction.respond([]);
    } catch (error) {
      console.error('[remind] Autocomplete failed:', error);
      await interaction.respond([]).catch(() => {});
    }
  },

  // Exported so commands/reminders.js can delegate to the exact same view.
  handleList,
};

function addCreateOptions(sub, { channel }) {
  sub.addStringOption((opt) => opt.setName('message').setDescription('The reminder message (omit for a long-message modal)').setMaxLength(1900));
  sub.addStringOption((opt) => opt.setName('when').setDescription('When, e.g. "in 45 minutes", "next friday", "tonight at 8" (required unless repeat is set)'));
  sub.addStringOption((opt) => opt.setName('repeat').setDescription('Recurrence, e.g. "every monday at 10am", "weekdays at 8am"'));
  sub.addIntegerOption((opt) => opt.setName('repeat-count').setDescription('End after N occurrences (with repeat only)').setMinValue(1));
  sub.addStringOption((opt) => opt.setName('repeat-until').setDescription('End by this date (with repeat only), e.g. "dec 1"'));
  if (channel) {
    sub.addChannelOption((opt) => opt.setName('channel').setDescription('Channel to remind (defaults to this channel)'));
    sub.addMentionableOption((opt) => opt.setName('mention').setDescription('Who to ping (defaults to you; set a user or role to override)'));
  } else {
    sub.addUserOption((opt) => opt.setName('user').setDescription('Who to DM (defaults to you)'));
  }
  return sub;
}

async function resolveMessageAndContinue(interaction, isChannel) {
  const message = interaction.options.getString('message');
  if (message) {
    return finishCreate(interaction, interaction, isChannel, message);
  }

  const modalId = `remind_msg_${interaction.id}`;
  await interaction.showModal(
    new ModalBuilder()
      .setCustomId(modalId)
      .setTitle('Reminder message')
      .addComponents(
        new ActionRowBuilder().addComponents(
          new TextInputBuilder()
            .setCustomId('message')
            .setLabel('Message')
            .setStyle(TextInputStyle.Paragraph)
            .setMaxLength(1900)
            .setRequired(true)
        )
      )
  );

  let submitted;
  try {
    submitted = await interaction.awaitModalSubmit({ time: MODAL_TIMEOUT_MS, filter: (i) => i.customId === modalId && i.user.id === interaction.user.id });
  } catch {
    return; // timed out — nothing created, silent cancel
  }

  // The original command interaction still holds the structured options
  // (when/repeat/channel/mention/user) — a modal submit interaction has no
  // `.options` of its own, only its own fields. Reply/edit happens on the
  // modal submit; option reads happen on the original interaction.
  return finishCreate(interaction, submitted, isChannel, submitted.fields.getTextInputValue('message'));
}

async function handleCreate(interaction, isChannel) {
  const whenText = interaction.options.getString('when');
  const repeatText = interaction.options.getString('repeat');
  const repeatCount = interaction.options.getInteger('repeat-count');
  const repeatUntil = interaction.options.getString('repeat-until');

  if (!whenText && !repeatText) {
    return interaction.reply({ content: 'Provide either `when` (one-time) or `repeat` (recurring).', flags: MessageFlags.Ephemeral });
  }
  if (repeatCount && repeatUntil) {
    return interaction.reply({ content: '`repeat-count` and `repeat-until` are mutually exclusive — use only one.', flags: MessageFlags.Ephemeral });
  }
  if ((repeatCount || repeatUntil) && !repeatText) {
    return interaction.reply({ content: '`repeat-count`/`repeat-until` only apply when `repeat` is set.', flags: MessageFlags.Ephemeral });
  }

  const activeCount = await Reminder.countDocuments({ creatorId: interaction.user.id, status: { $in: ['active', 'paused'] } });
  if (activeCount >= MAX_ACTIVE_PER_USER) {
    return interaction.reply({ content: `You already have ${MAX_ACTIVE_PER_USER} active reminders, the maximum. Delete one with \`/remind delete\` before creating another.`, flags: MessageFlags.Ephemeral });
  }

  return resolveMessageAndContinue(interaction, isChannel);
}

async function finishCreate(originalInteraction, replyInteraction, isChannel, message) {
  await replyInteraction.deferReply({ flags: MessageFlags.Ephemeral });

  const opts = extractCreateOptions(originalInteraction, isChannel);
  const { timezone, isDefault } = await getTimezone(originalInteraction.user.id);

  let scheduleFields;
  try {
    scheduleFields = await buildSchedule(opts, timezone);
  } catch (error) {
    await replyInteraction.editReply({ content: error.message });
    return;
  }

  const timezoneNudge = isDefault
    ? '\n\n⏰ You haven\'t set a timezone, so this was interpreted in **UTC**. Run `/remind timezone set` to fix this.'
    : '';

  const confirmId = `remcreate_confirm_${originalInteraction.id}`;
  const cancelId = `remcreate_cancel_${originalInteraction.id}`;
  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId(confirmId).setLabel('Confirm').setStyle(ButtonStyle.Success),
    new ButtonBuilder().setCustomId(cancelId).setLabel('Cancel').setStyle(ButtonStyle.Secondary),
  );

  const confirmMsg = await replyInteraction.editReply({ content: scheduleFields.confirmText + timezoneNudge, components: [row] });

  let clicked;
  try {
    clicked = await confirmMsg.awaitMessageComponent({ time: CONFIRM_TIMEOUT_MS, filter: (i) => i.user.id === originalInteraction.user.id });
  } catch {
    await replyInteraction.editReply({ content: 'Timed out — nothing was created.', components: [] }).catch(() => {});
    return;
  }

  if (clicked.customId === cancelId) {
    await clicked.update({ content: 'Cancelled, nothing was saved.', components: [] });
    return;
  }

  const seq = await nextSeq('reminder');
  const shortId = `R-${seq}`;

  const doc = await Reminder.create({
    shortId,
    seq,
    creatorId: originalInteraction.user.id,
    deliveryMethod: isChannel ? 'channel' : 'dm',
    channelId: isChannel ? opts.channelId : null,
    dmUserId: isChannel ? null : opts.dmUserId,
    mention: opts.mention,
    message,
    schedule: scheduleFields.schedule,
    status: 'active',
  });

  reminderManager.scheduleReminder(originalInteraction.client, doc);

  await clicked.update({ content: `✅ Created **${shortId}**. ${scheduleFields.confirmText}`, components: [] });
}

function extractCreateOptions(interaction, isChannel) {
  const opts = {
    whenText: interaction.options.getString('when'),
    repeatText: interaction.options.getString('repeat'),
    repeatCount: interaction.options.getInteger('repeat-count'),
    repeatUntil: interaction.options.getString('repeat-until'),
    mention: { type: 'none', id: null },
  };

  if (isChannel) {
    const channel = interaction.options.getChannel('channel') || interaction.channel;
    opts.channelId = channel.id;
    const raw = interaction.options.get('mention');
    if (raw?.role) opts.mention = { type: 'role', id: raw.role.id };
    else if (raw?.user) opts.mention = { type: 'user', id: raw.user.id };
    // Default: ping the reminder's own creator, since a channel reminder
    // with no ping at all is easy to miss in a busy channel. Only an
    // explicit `mention` overrides this (to someone else, or a role) —
    // there's no current way to opt out of being pinged on your own
    // channel reminder.
    else opts.mention = { type: 'user', id: interaction.user.id };
  } else {
    const user = interaction.options.getUser('user') || interaction.user;
    opts.dmUserId = user.id;
  }

  return opts;
}

async function buildSchedule(opts, timezone) {
  if (opts.repeatText) {
    const endCondition = opts.repeatCount
      ? { kind: 'count', count: opts.repeatCount }
      : opts.repeatUntil
        ? { kind: 'until', untilText: opts.repeatUntil }
        : { kind: 'none' };

    const parsed = parseRecurrence(opts.repeatText, { timezone, endCondition });
    const firstUnix = Math.floor(parsed.firstOccurrence.getTime() / 1000);
    const until = endCondition.kind === 'until' ? extractRruleUntil(parsed.rruleText, timezone) : null;

    let endText = '';
    if (endCondition.kind === 'count') endText = ` for ${endCondition.count} occurrences`;
    if (until) endText = ` until <t:${Math.floor(until.getTime() / 1000)}:D>`;

    return {
      schedule: {
        kind: 'recurring',
        timezone,
        nextTrigger: parsed.firstOccurrence,
        rruleText: parsed.rruleText,
        endCondition: {
          kind: endCondition.kind,
          count: endCondition.kind === 'count' ? endCondition.count : null,
          until,
        },
        occurrencesFired: 0,
      },
      confirmText: `Repeats **${parsed.summary}**${endText}. First reminder: <t:${firstUnix}:F> (<t:${firstUnix}:R>).`,
    };
  }

  const parsed = parseWhen(opts.whenText, { referenceDate: new Date(), timezone });
  const unix = Math.floor(parsed.date.getTime() / 1000);

  return {
    schedule: {
      kind: 'once',
      timezone,
      nextTrigger: parsed.date,
      rruleText: null,
      endCondition: { kind: 'none', count: null, until: null },
      occurrencesFired: 0,
    },
    confirmText: `You'll be reminded **<t:${unix}:F>** (<t:${unix}:R>).`,
  };
}

// rule.options.until is a "field-space" Date (its UTC getters hold the
// intended local wall-clock numbers, per utils/timezoneMath.js's DTSTART/
// UNTIL convention) — must be converted to a real UTC instant before it's
// stored/displayed as an actual point in time.
function extractRruleUntil(rruleText, timezone) {
  const rule = RRule.fromString(rruleText);
  return rule.options.until ? fieldSpaceToUtc(rule.options.until, timezone) : null;
}

async function handleTimezoneSet(interaction) {
  const tz = interaction.options.getString('tz');
  if (!isValidTimeZone(tz)) {
    return interaction.reply({ content: `\`${tz}\` doesn't look like a valid IANA timezone (e.g. \`America/New_York\`, \`Europe/London\`).`, flags: MessageFlags.Ephemeral });
  }
  await UserSettings.findOneAndUpdate({ userId: interaction.user.id }, { timezone: tz }, { upsert: true });
  return interaction.reply({ content: `Timezone set to \`${tz}\`.`, flags: MessageFlags.Ephemeral });
}

async function handleTimezoneShow(interaction) {
  const { timezone, isDefault } = await getTimezone(interaction.user.id);
  const content = isDefault
    ? `You haven't set a timezone — defaulting to **UTC**. Run \`/remind timezone set\` to fix this.`
    : `Your timezone is set to \`${timezone}\`.`;
  return interaction.reply({ content, flags: MessageFlags.Ephemeral });
}

async function handleDelete(interaction) {
  const shortId = interaction.options.getString('id');
  const doc = await Reminder.findOne({ shortId, creatorId: interaction.user.id, status: { $in: ['active', 'paused'] } });
  if (!doc) {
    return interaction.reply({ content: `No active/paused reminder \`${shortId}\` found for you.`, flags: MessageFlags.Ephemeral });
  }
  reminderManager.cancelSchedule(doc._id);
  await Reminder.findByIdAndUpdate(doc._id, { status: 'cancelled', cancelReason: 'Deleted via /remind delete', cancelledBy: interaction.user.id, cancelledAt: new Date() });
  return interaction.reply({ content: `Deleted **${shortId}**.`, flags: MessageFlags.Ephemeral });
}

async function handlePauseResume(interaction, targetStatus) {
  const shortId = interaction.options.getString('id');
  const requiredStatus = targetStatus === 'paused' ? 'active' : 'paused';
  const doc = await Reminder.findOne({ shortId, creatorId: interaction.user.id, status: requiredStatus, 'schedule.kind': 'recurring' });
  if (!doc) {
    return interaction.reply({ content: `No ${requiredStatus} recurring reminder \`${shortId}\` found for you.`, flags: MessageFlags.Ephemeral });
  }

  if (targetStatus === 'paused') {
    reminderManager.cancelSchedule(doc._id);
    await Reminder.findByIdAndUpdate(doc._id, { status: 'paused' });
    return interaction.reply({ content: `Paused **${shortId}**. Resume it with \`/remind resume\`.`, flags: MessageFlags.Ephemeral });
  }

  // Resuming always jumps to the next FUTURE occurrence — it never fires a
  // catch-up burst for whatever was missed while paused.
  let nextTrigger = doc.schedule.nextTrigger;
  if (!nextTrigger || nextTrigger.getTime() <= Date.now()) {
    const now = new Date();
    // nextOccurrence is exclusive-after; seed with "now minus a tick" so a
    // rule due to fire right now still resolves rather than skipping it.
    nextTrigger = nextOccurrence(doc.schedule.rruleText, new Date(now.getTime() - 1000), doc.schedule.timezone);
  }

  const updated = await Reminder.findByIdAndUpdate(doc._id, { status: 'active', 'schedule.nextTrigger': nextTrigger }, { new: true });
  if (updated.schedule.nextTrigger) {
    reminderManager.scheduleReminder(interaction.client, updated);
  }
  const unix = updated.schedule.nextTrigger ? Math.floor(updated.schedule.nextTrigger.getTime() / 1000) : null;
  return interaction.reply({
    content: unix ? `Resumed **${shortId}**. Next reminder: <t:${unix}:F> (<t:${unix}:R>).` : `Resumed **${shortId}**, but it has no future occurrences left.`,
    flags: MessageFlags.Ephemeral,
  });
}

async function handleEdit(interaction) {
  const shortId = interaction.options.getString('id');
  const doc = await Reminder.findOne({ shortId, creatorId: interaction.user.id, status: { $in: ['active', 'paused'] } });
  if (!doc) {
    return interaction.reply({ content: `No active/paused reminder \`${shortId}\` found for you.`, flags: MessageFlags.Ephemeral });
  }

  const modalId = `remind_edit_${interaction.id}`;
  const whenLabel = doc.schedule.kind === 'once' ? 'New time (leave blank to keep)' : 'New recurrence (leave blank to keep)';
  const whenPlaceholder = doc.schedule.kind === 'once' ? 'e.g. "in 2 hours"' : 'e.g. "every monday at 9am"';

  await interaction.showModal(
    new ModalBuilder()
      .setCustomId(modalId)
      .setTitle(`Edit ${shortId}`)
      .addComponents(
        new ActionRowBuilder().addComponents(
          new TextInputBuilder().setCustomId('message').setLabel('Message (leave blank to keep)').setStyle(TextInputStyle.Paragraph).setMaxLength(1900).setRequired(false).setValue(doc.message)
        ),
        new ActionRowBuilder().addComponents(
          new TextInputBuilder().setCustomId('when').setLabel(whenLabel).setStyle(TextInputStyle.Short).setPlaceholder(whenPlaceholder).setRequired(false)
        ),
      )
  );

  let submitted;
  try {
    submitted = await interaction.awaitModalSubmit({ time: MODAL_TIMEOUT_MS, filter: (i) => i.customId === modalId && i.user.id === interaction.user.id });
  } catch {
    return; // timed out, no changes
  }

  await submitted.deferReply({ flags: MessageFlags.Ephemeral });

  const newMessage = submitted.fields.getTextInputValue('message')?.trim();
  const newWhen = submitted.fields.getTextInputValue('when')?.trim();

  const update = {};
  const summaryLines = [];

  if (newMessage && newMessage !== doc.message) {
    update.message = newMessage;
    summaryLines.push('Updated message.');
  }

  if (newWhen) {
    const { timezone } = await getTimezone(interaction.user.id);
    try {
      if (doc.schedule.kind === 'once') {
        const parsed = parseWhen(newWhen, { referenceDate: new Date(), timezone });
        update['schedule.nextTrigger'] = parsed.date;
        const unix = Math.floor(parsed.date.getTime() / 1000);
        summaryLines.push(`New time: <t:${unix}:F> (<t:${unix}:R>).`);
      } else {
        const endCondition = doc.schedule.endCondition.kind === 'count'
          ? { kind: 'count', count: doc.schedule.endCondition.count }
          : doc.schedule.endCondition.kind === 'until'
            ? { kind: 'until', until: doc.schedule.endCondition.until }
            : { kind: 'none' };
        const parsed = parseRecurrence(newWhen, { timezone, endCondition });
        update['schedule.rruleText'] = parsed.rruleText;
        update['schedule.nextTrigger'] = parsed.firstOccurrence;
        summaryLines.push(`New recurrence: ${parsed.summary}.`);
      }
    } catch (error) {
      await submitted.editReply({ content: error.message });
      return;
    }
  }

  if (Object.keys(update).length === 0) {
    await submitted.editReply({ content: 'No changes made.' });
    return;
  }

  const updated = await Reminder.findByIdAndUpdate(doc._id, update, { new: true });
  if (updated.status === 'active') {
    reminderManager.scheduleReminder(interaction.client, updated);
  }

  await submitted.editReply({ content: `Updated **${shortId}**.\n${summaryLines.join('\n')}` });
}

async function handleList(interaction) {
  const isDeferred = interaction.deferred || interaction.replied;
  if (!isDeferred) await interaction.deferReply({ flags: MessageFlags.Ephemeral });

  const docs = await Reminder.find({ creatorId: interaction.user.id, status: { $in: ['active', 'paused'] } }).sort({ 'schedule.nextTrigger': 1 });

  if (!docs.length) {
    return interaction.editReply({ content: "You don't have any active reminders. Create one with `/remind channel create` or `/remind dm create`." });
  }

  const PAGE_SIZE = 8;
  const pages = [];
  for (let i = 0; i < docs.length; i += PAGE_SIZE) pages.push(docs.slice(i, i + PAGE_SIZE));

  const renderPage = (pageIdx) => {
    const embed = new EmbedBuilder().setTitle('Your Reminders').setColor('#5865F2').setFooter({ text: `Page ${pageIdx + 1}/${pages.length}` });
    for (const doc of pages[pageIdx]) {
      const target = doc.deliveryMethod === 'dm' ? `DM to <@${doc.dmUserId}>` : `<#${doc.channelId}>`;
      const next = doc.schedule.nextTrigger ? `<t:${Math.floor(doc.schedule.nextTrigger.getTime() / 1000)}:R>` : 'none';
      const recurrence = doc.schedule.kind === 'recurring' ? `\n${describeRule(doc.schedule.rruleText)}` : '';
      const paused = doc.status === 'paused' ? ' ⏸' : '';
      embed.addFields({
        name: `${doc.shortId}${paused}`,
        value: `${doc.message.slice(0, 150)}\nTarget: ${target} | Next: ${next}${recurrence}`,
      });
    }
    return embed;
  };

  const prevId = `remlist_prev_${interaction.id}`;
  const nextId = `remlist_next_${interaction.id}`;
  const buildRow = (pageIdx) => new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId(prevId).setLabel('◀').setStyle(ButtonStyle.Secondary).setDisabled(pageIdx === 0),
    new ButtonBuilder().setCustomId(nextId).setLabel('▶').setStyle(ButtonStyle.Secondary).setDisabled(pageIdx === pages.length - 1),
  );

  let page = 0;
  const msg = await interaction.editReply({ embeds: [renderPage(page)], components: pages.length > 1 ? [buildRow(page)] : [] });

  if (pages.length <= 1) return;

  const collector = msg.createMessageComponentCollector({ time: 120000, filter: (i) => i.user.id === interaction.user.id });
  collector.on('collect', async (i) => {
    if (i.customId === prevId) page = Math.max(0, page - 1);
    if (i.customId === nextId) page = Math.min(pages.length - 1, page + 1);
    await i.update({ embeds: [renderPage(page)], components: [buildRow(page)] });
  });
  collector.on('end', () => {
    msg.edit({ components: [] }).catch(() => {});
  });
}
