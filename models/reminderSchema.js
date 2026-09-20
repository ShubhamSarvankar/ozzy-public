const mongoose = require('mongoose');

const reminderSchema = new mongoose.Schema({
  shortId: { type: String, required: true, unique: true }, // "R-1842"
  seq: { type: Number, required: true },

  creatorId: { type: String, required: true },

  deliveryMethod: { type: String, required: true, enum: ['channel', 'dm'] },
  channelId: { type: String, default: null }, // required if deliveryMethod === 'channel'
  dmUserId: { type: String, default: null },  // required if deliveryMethod === 'dm'

  // Channel delivery only — DMs are always single-target, enforced in
  // command validation, not just by convention (a bad edit could otherwise
  // smuggle a mention into a DM where it means nothing).
  mention: {
    type: { type: String, enum: ['none', 'user', 'role'], default: 'none' },
    id: { type: String, default: null },
  },

  message: { type: String, required: true, maxlength: 1900 },
  title: { type: String, default: null },

  schedule: {
    kind: { type: String, required: true, enum: ['once', 'recurring'] },
    timezone: { type: String, required: true }, // IANA tzid this schedule was interpreted in
    nextTrigger: { type: Date, default: null }, // authoritative next-fire instant; null once terminal
    // Full iCal text (DTSTART + RRULE, COUNT/UNTIL baked in) from rrule.js's
    // .toString(). DTSTART's fields are "field-space" (see utils/timezoneMath.js),
    // not a real UTC instant — always convert through timezoneMath before
    // treating any date pulled from this rule as a real-world instant.
    rruleText: { type: String, default: null },
    endCondition: {
      kind: { type: String, enum: ['none', 'count', 'until'], default: 'none' },
      count: { type: Number, default: null },
      until: { type: Date, default: null },
    },
    occurrencesFired: { type: Number, default: 0 },
  },

  status: { type: String, required: true, enum: ['active', 'paused', 'completed', 'cancelled'], default: 'active' },
  cancelReason: { type: String, default: null },
  cancelledBy: { type: String, default: null },
  cancelledAt: { type: Date, default: null },

  lastFiredAt: { type: Date, default: null },
  lastFiredChannelId: { type: String, default: null },
  lastFiredMessageId: { type: String, default: null },
  fireNonce: { type: String, default: null }, // regenerated every fire; embedded in that fire's button customIds

  snoozeCount: { type: Number, default: 0 },
}, { timestamps: true });

reminderSchema.index({ status: 1, 'schedule.nextTrigger': 1 }); // manager sweep
reminderSchema.index({ creatorId: 1, status: 1 });               // dashboard/list/autocomplete
reminderSchema.index({ channelId: 1, status: 1 });                // channel-deleted cleanup

module.exports = mongoose.model('Reminder', reminderSchema);
