const {
  ActionRowBuilder, ButtonBuilder, ButtonStyle, StringSelectMenuBuilder, MessageFlags,
  ModalBuilder, TextInputBuilder, TextInputStyle,
} = require('discord.js');
const Reminder = require('../models/reminderSchema');
const { nextOccurrence } = require('./parseRecurrence');
const { wallFieldsToUtc, utcToFieldSpace } = require('./timezoneMath');
const { parseWhen } = require('./parseReminderTime');

// setTimeout's delay is a 32-bit signed int under the hood; anything larger
// silently fires immediately. Cap each leg well under that ceiling so long
// waits get chunked into multiple reschedules instead — same reasoning as
// utils/tempRoleManager.js.
const MAX_TIMEOUT_MS = 20 * 24 * 60 * 60 * 1000; // 20 days
const SWEEP_INTERVAL_MS = 2 * 60 * 1000; // 2 minutes

const SNOOZE_OPTIONS = [
  { label: 'Snooze 15 minutes', value: '15m', ms: 15 * 60 * 1000 },
  { label: 'Snooze 1 hour', value: '1h', ms: 60 * 60 * 1000 },
  { label: 'Snooze 3 hours', value: '3h', ms: 3 * 60 * 60 * 1000 },
  { label: 'Snooze until tomorrow 9am', value: 'tomorrow9', ms: null }, // computed specially
];

// reminder _id (string) -> Timeout handle
const activeTimers = new Map();

function cancelSchedule(id) {
  const key = String(id);
  const handle = activeTimers.get(key);
  if (handle) {
    clearTimeout(handle);
    activeTimers.delete(key);
  }
}

function scheduleReminder(client, doc) {
  const key = String(doc._id);
  cancelSchedule(key);

  if (doc.status !== 'active' || !doc.schedule.nextTrigger) return;

  const remaining = doc.schedule.nextTrigger.getTime() - Date.now();
  if (remaining <= 0) {
    fireReminder(client, doc).catch((error) => {
      console.error(`[reminderManager] fireReminder failed for ${doc.shortId}:`, error);
    });
    return;
  }

  const delay = Math.min(remaining, MAX_TIMEOUT_MS);
  const handle = setTimeout(async () => {
    try {
      // Re-fetch and re-check before acting, in case a manual action (button,
      // command, the sweep) already resolved this reminder while this leg
      // was waiting — same idempotency guard as tempRoleManager.
      const fresh = await Reminder.findById(doc._id);
      if (!fresh || fresh.status !== 'active') {
        activeTimers.delete(key);
        return;
      }

      if (fresh.schedule.nextTrigger.getTime() - Date.now() <= 0) {
        await fireReminder(client, fresh);
      } else {
        activeTimers.delete(key);
        scheduleReminder(client, fresh); // still not due (long-delay leg) — re-arm
      }
    } catch (error) {
      console.error(`[reminderManager] Scheduled fire failed for ${doc.shortId || doc._id}:`, error);
    }
  }, delay);

  activeTimers.set(key, handle);
}

function buildFireComponents(doc, fireNonce) {
  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId(`remfire:done:${doc.shortId}:${fireNonce}`).setLabel('Done').setStyle(ButtonStyle.Success),
    new ButtonBuilder().setCustomId(`remfire:snooze:${doc.shortId}:${fireNonce}`).setLabel('Snooze').setStyle(ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId(`remfire:resched:${doc.shortId}:${fireNonce}`).setLabel('Reschedule').setStyle(ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId(`remfire:delete:${doc.shortId}:${fireNonce}`).setLabel('Delete').setStyle(ButtonStyle.Danger),
  );

  const isFinalOccurrence = doc.schedule.kind === 'recurring'
    && doc.schedule.endCondition.kind === 'count'
    && doc.schedule.occurrencesFired + 1 >= doc.schedule.endCondition.count;

  if (doc.schedule.kind === 'recurring' && !isFinalOccurrence) {
    row.addComponents(
      new ButtonBuilder().setCustomId(`remfire:skip:${doc.shortId}:${fireNonce}`).setLabel('Skip next').setStyle(ButtonStyle.Secondary)
    );
  }

  return [row];
}

function buildMentionPrefix(doc) {
  if (doc.mention.type === 'user') return `<@${doc.mention.id}> `;
  if (doc.mention.type === 'role') return `<@&${doc.mention.id}> `;
  return '';
}

async function deliver(client, doc) {
  const content = `${buildMentionPrefix(doc)}${doc.title ? `**${doc.title}**\n` : ''}${doc.message}`;

  if (doc.deliveryMethod === 'dm') {
    const user = await client.users.fetch(doc.dmUserId);
    return user.send({ content });
  }

  const channel = await client.channels.fetch(doc.channelId);
  if (!channel) throw new Error(`Channel ${doc.channelId} not found`);
  return channel.send({ content });
}

async function notifyCreatorOfFailure(client, doc, reason) {
  try {
    const creator = await client.users.fetch(doc.creatorId).catch(() => null);
    if (!creator) return;
    await creator.send(`Your reminder **${doc.shortId}** (${doc.message.slice(0, 100)}) couldn't be delivered and has been cancelled: ${reason}`).catch(() => {});
  } catch (error) {
    console.error(`[reminderManager] notifyCreatorOfFailure failed for ${doc.shortId}:`, error);
  }
}

async function fireReminder(client, doc) {
  cancelSchedule(doc._id);

  // Idempotency re-check — see scheduleReminder's comment.
  const fresh = await Reminder.findById(doc._id);
  if (!fresh || fresh.status !== 'active' || fresh.schedule.nextTrigger.getTime() - Date.now() > 0) {
    return;
  }
  doc = fresh;

  let sentMessage;
  try {
    sentMessage = await deliver(client, doc);
  } catch (error) {
    console.error(`[reminderManager] Delivery failed for ${doc.shortId}:`, error);
    await Reminder.findByIdAndUpdate(doc._id, {
      status: 'cancelled',
      cancelReason: 'Delivery failed (channel/user unreachable)',
      cancelledAt: new Date(),
    });
    await notifyCreatorOfFailure(client, doc, 'the channel or user could not be reached (deleted, permissions, or DMs closed).');
    return;
  }

  const { customAlphabet } = await import('nanoid');
  const fireNonce = customAlphabet('0123456789abcdefghijklmnopqrstuvwxyz', 8)();

  const update = {
    lastFiredAt: new Date(),
    lastFiredChannelId: sentMessage.channel.id,
    lastFiredMessageId: sentMessage.id,
    fireNonce,
  };

  if (doc.schedule.kind === 'once') {
    update.status = 'completed';
    update['schedule.nextTrigger'] = null;
  } else {
    const currentTrigger = doc.schedule.nextTrigger;
    const next = nextOccurrence(doc.schedule.rruleText, currentTrigger, doc.schedule.timezone);
    update['schedule.occurrencesFired'] = doc.schedule.occurrencesFired + 1;
    if (next) {
      update['schedule.nextTrigger'] = next;
    } else {
      update.status = 'completed';
      update['schedule.nextTrigger'] = null;
    }
  }

  const updated = await Reminder.findByIdAndUpdate(doc._id, update, { new: true });

  try {
    await sentMessage.edit({ components: buildFireComponents(updated, fireNonce) });
  } catch (error) {
    console.error(`[reminderManager] Failed to attach buttons for ${doc.shortId}:`, error);
  }

  if (updated.status === 'active' && updated.schedule.nextTrigger) {
    scheduleReminder(client, updated);
  }
}

async function sweep(client) {
  const due = await Reminder.find({ status: 'active', 'schedule.nextTrigger': { $lte: new Date() } });
  for (const doc of due) {
    try {
      await fireReminder(client, doc);
    } catch (error) {
      console.error(`[reminderManager] Sweep fire failed for ${doc.shortId}:`, error);
    }
  }
}

// Self-healing startup step: the `reminders` collection predates this
// rewrite and can still carry (a) leftover documents in the OLD schema
// shape (no `shortId`, no `status` — harmless to every query in this file,
// since they simply never match, but they collide with a fresh unique
// index on `shortId` since Mongo treats "field absent" as null for
// indexing purposes, and multiple such documents all have the same "null"
// value) and (b) the OLD schema's `reminderId` unique index, which
// Mongoose never drops on its own when a schema changes — it only adds
// indexes it's missing. Left in place, new documents (which never set
// `reminderId`) collide with each other on that stale index's null value
// the moment a second reminder is created. Runs on every boot; both steps
// are cheap no-ops once the collection is already clean, and doing this in
// code means it self-heals without needing manual DB access on deploy.
async function ensureCollectionHealthy() {
  try {
    const legacyResult = await Reminder.deleteMany({ shortId: { $exists: false } });
    if (legacyResult.deletedCount) {
      console.log(`[reminderManager] Removed ${legacyResult.deletedCount} pre-rewrite legacy reminder document(s).`);
    }
    await Reminder.syncIndexes();
  } catch (error) {
    console.error('[reminderManager] Failed to sync reminder collection indexes:', error);
  }
}

function initialize(client) {
  ensureCollectionHealthy().then(() => {
    return Reminder.find({ status: 'active' });
  }).then((docs) => {
    docs.forEach((doc) => scheduleReminder(client, doc));
  }).catch((error) => {
    console.error('[reminderManager] Failed to load active reminders on startup:', error);
  });

  setInterval(() => {
    sweep(client).catch((error) => {
      console.error('[reminderManager] Sweep failed:', error);
    });
  }, SWEEP_INTERVAL_MS);
}

// --- Authorization for fire-time button/select/modal actions ---

function canAct(interaction, doc) {
  if (interaction.user.id === doc.creatorId) return true;
  if (doc.deliveryMethod === 'dm' && interaction.user.id === doc.dmUserId) return true;
  if (doc.mention.type === 'user' && interaction.user.id === doc.mention.id) return true;
  return false;
}

function canDelete(interaction, doc) {
  return interaction.user.id === doc.creatorId;
}

// Loads the reminder for a `remfire:` interaction and validates the fireNonce
// embedded in its customId is still current. Replies and returns null on any
// failure (stale, not found, unauthorized) — callers can just early-return.
async function loadFireTarget(interaction, { requireDelete = false } = {}) {
  const parts = interaction.customId.split(':');
  const [, action, shortId, nonce] = parts;

  const doc = await Reminder.findOne({ shortId });
  if (!doc) {
    await interaction.reply({ content: 'This reminder no longer exists.', flags: MessageFlags.Ephemeral });
    return null;
  }

  if (doc.fireNonce !== nonce) {
    await interaction.reply({
      content: 'This reminder has moved on since this message was sent — check `/reminders` for its current status.',
      flags: MessageFlags.Ephemeral,
    });
    await interaction.message.edit({ components: [] }).catch(() => {});
    return null;
  }

  const authorized = requireDelete ? canDelete(interaction, doc) : canAct(interaction, doc);
  if (!authorized) {
    await interaction.reply({ content: "You don't have permission to act on this reminder.", flags: MessageFlags.Ephemeral });
    return null;
  }

  return { doc, action, shortId, nonce };
}

async function handleFireButton(interaction) {
  const [, action] = interaction.customId.split(':');

  const target = await loadFireTarget(interaction, { requireDelete: action === 'delete' });
  if (!target) return;
  const { doc } = target;

  if (action === 'done') {
    if (doc.schedule.kind === 'once') {
      await Reminder.findByIdAndUpdate(doc._id, { status: 'completed' });
    }
    await interaction.update({ content: `${interaction.message.content}\n\n✅ Done.`, components: [] });
    return;
  }

  if (action === 'snooze') {
    const menu = new StringSelectMenuBuilder()
      .setCustomId(`remfire_snz:${doc.shortId}:${doc.fireNonce}`)
      .setPlaceholder('Snooze for...')
      .addOptions(SNOOZE_OPTIONS.map((o) => ({ label: o.label, value: o.value })));
    await interaction.update({ components: [new ActionRowBuilder().addComponents(menu)] });
    return;
  }

  if (action === 'resched') {
    const modal = new ModalBuilder()
      .setCustomId(`remfire_resched:${doc.shortId}:${doc.fireNonce}`)
      .setTitle('Reschedule reminder')
      .addComponents(
        new ActionRowBuilder().addComponents(
          new TextInputBuilder()
            .setCustomId('when')
            .setLabel('New time')
            .setStyle(TextInputStyle.Short)
            .setPlaceholder('e.g. "in 2 hours", "tomorrow at 9am"')
            .setRequired(true)
        )
      );
    await interaction.showModal(modal);
    return;
  }

  if (action === 'delete') {
    await Reminder.findByIdAndUpdate(doc._id, { status: 'cancelled', cancelReason: 'Deleted via fire-time button', cancelledBy: interaction.user.id, cancelledAt: new Date() });
    cancelSchedule(doc._id);
    await interaction.update({ content: `${interaction.message.content}\n\n🗑️ Cancelled — no further occurrences.`, components: [] });
    return;
  }

  if (action === 'skip') {
    if (doc.schedule.kind !== 'recurring' || !doc.schedule.nextTrigger) {
      await interaction.reply({ content: 'This reminder has no further occurrences to skip.', flags: MessageFlags.Ephemeral });
      return;
    }
    const next = nextOccurrence(doc.schedule.rruleText, doc.schedule.nextTrigger, doc.schedule.timezone);
    const update = { 'schedule.occurrencesFired': doc.schedule.occurrencesFired + 1 };
    if (next) {
      update['schedule.nextTrigger'] = next;
    } else {
      update.status = 'completed';
      update['schedule.nextTrigger'] = null;
    }
    const updated = await Reminder.findByIdAndUpdate(doc._id, update, { new: true });
    if (updated.status === 'active' && updated.schedule.nextTrigger) {
      scheduleReminder(interaction.client, updated);
    }
    await interaction.update({ content: `${interaction.message.content}\n\n⏭️ Next occurrence skipped.`, components: [] });
    return;
  }
}

async function handleSnoozeSelect(interaction) {
  const parts = interaction.customId.split(':');
  const [, shortId, nonce] = parts;

  const doc = await Reminder.findOne({ shortId });
  if (!doc) {
    await interaction.reply({ content: 'This reminder no longer exists.', flags: MessageFlags.Ephemeral });
    return;
  }
  if (doc.fireNonce !== nonce) {
    await interaction.reply({ content: 'This reminder has moved on since this message was sent.', flags: MessageFlags.Ephemeral });
    await interaction.message.edit({ components: [] }).catch(() => {});
    return;
  }
  if (!canAct(interaction, doc)) {
    await interaction.reply({ content: "You don't have permission to act on this reminder.", flags: MessageFlags.Ephemeral });
    return;
  }

  const choice = SNOOZE_OPTIONS.find((o) => o.value === interaction.values[0]);
  let nextTrigger;
  if (choice.value === 'tomorrow9') {
    const nowFields = utcToFieldSpace(new Date(), doc.schedule.timezone);
    nextTrigger = wallFieldsToUtc(
      nowFields.getUTCFullYear(), nowFields.getUTCMonth() + 1, nowFields.getUTCDate() + 1,
      9, 0, 0, doc.schedule.timezone
    );
  } else {
    nextTrigger = new Date(Date.now() + choice.ms);
  }

  const updated = await Reminder.findByIdAndUpdate(
    doc._id,
    { 'schedule.nextTrigger': nextTrigger, $inc: { snoozeCount: 1 } },
    { new: true }
  );
  scheduleReminder(interaction.client, updated);

  // The "snooze" button click (handleFireButton) swaps in the select menu
  // without touching content, so interaction.message.content here is still
  // exactly the original delivered text — safe to append to directly rather
  // than trying to strip a previous suffix by splitting on blank lines,
  // which would mangle a reminder message that itself contains one.
  const unix = Math.floor(nextTrigger.getTime() / 1000);
  await interaction.update({ content: `${interaction.message.content}\n\n😴 Snoozed — you'll be reminded again <t:${unix}:R>.`, components: [] });
}

async function handleRescheduleModal(interaction) {
  const parts = interaction.customId.split(':');
  const [, shortId, nonce] = parts;

  const doc = await Reminder.findOne({ shortId });
  if (!doc) {
    await interaction.reply({ content: 'This reminder no longer exists.', flags: MessageFlags.Ephemeral });
    return;
  }
  if (doc.fireNonce !== nonce) {
    await interaction.reply({ content: 'This reminder has moved on since this message was sent.', flags: MessageFlags.Ephemeral });
    return;
  }
  if (!canAct(interaction, doc)) {
    await interaction.reply({ content: "You don't have permission to act on this reminder.", flags: MessageFlags.Ephemeral });
    return;
  }

  await interaction.deferReply({ flags: MessageFlags.Ephemeral });

  const whenText = interaction.fields.getTextInputValue('when');
  let parsed;
  try {
    parsed = parseWhen(whenText, { referenceDate: new Date(), timezone: doc.schedule.timezone });
  } catch (error) {
    await interaction.editReply({ content: error.message });
    return;
  }

  const update = { 'schedule.nextTrigger': parsed.date };
  if (doc.schedule.kind === 'once' && doc.status === 'completed') {
    update.status = 'active';
  }

  const updated = await Reminder.findByIdAndUpdate(doc._id, update, { new: true });
  scheduleReminder(interaction.client, updated);

  const unix = Math.floor(parsed.date.getTime() / 1000);
  await interaction.editReply({ content: `Rescheduled **${doc.shortId}** to <t:${unix}:F> (<t:${unix}:R>).` });

  await interaction.message?.edit({ components: [] }).catch(() => {});
}

module.exports = {
  initialize,
  scheduleReminder,
  cancelSchedule,
  fireReminder,
  handleFireButton,
  handleSnoozeSelect,
  handleRescheduleModal,
  handleChannelDeleted: async function handleChannelDeleted(client, channel) {
    const docs = await Reminder.find({ channelId: channel.id, status: { $in: ['active', 'paused'] } });
    for (const doc of docs) {
      cancelSchedule(doc._id);
      await Reminder.findByIdAndUpdate(doc._id, {
        status: 'cancelled',
        cancelReason: 'The channel for this reminder was deleted.',
        cancelledAt: new Date(),
      });
      const creator = await client.users.fetch(doc.creatorId).catch(() => null);
      if (creator) {
        await creator.send(`Your reminder **${doc.shortId}** was cancelled: the channel it was set to deliver to was deleted.`).catch(() => {});
      }
    }
  },
};
