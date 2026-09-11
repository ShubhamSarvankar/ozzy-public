const mongoose = require('mongoose');

const roleReactRoleSchema = new mongoose.Schema({
  roleId: { type: String, required: true },
  emojiName: { type: String, required: true },
  emojiId: { type: String, default: null },
  emojiAnimated: { type: Boolean, default: false },
  assignedCount: { type: Number, default: 0 },
  position: { type: Number, required: true },
}, { _id: false });

const roleReactSchema = new mongoose.Schema({
  shortId: { type: String, required: true, unique: true },
  guildId: { type: String, required: true },
  channelId: { type: String, required: true },
  messageId: { type: String, default: null },
  strategy: { type: String, required: true, enum: ['solo', 'mucho', 'team', 'semirandom'] },
  roles: { type: [roleReactRoleSchema], required: true },
  messageBody: { type: String, required: true },
  messageTitle: { type: String, default: null },
  unreactRemovesRole: { type: Boolean, default: true },
  removeUnregisteredReactions: { type: Boolean, default: false },
  dmUserOnAssignment: { type: Boolean, default: false },
  active: { type: Boolean, default: true },
  createdBy: { type: String, required: true },
  endedBy: { type: String, default: null },
  endedAt: { type: Date, default: null },
  inactiveReason: { type: String, default: null },
  // Throttle for repeated-failure creator DMs (e.g. a role moved above the
  // bot's highest role) — once per hour per instance, persisted so it
  // survives restarts.
  lastFailureDmAt: { type: Date, default: null },
}, { timestamps: true });

roleReactSchema.index({ guildId: 1, active: 1 });
roleReactSchema.index({ messageId: 1, active: 1 });

// Separate collection, not embedded: assignment counts are unbounded per
// instance and would eventually approach the 16MB document cap if embedded.
const roleReactAssignmentSchema = new mongoose.Schema({
  shortId: { type: String, required: true },
  guildId: { type: String, required: true },
  userId: { type: String, required: true },
  roleId: { type: String, required: true },
}, { timestamps: true });

// DB-level backstop for idempotency against Discord's at-least-once gateway
// redelivery, independent of the in-memory existence check.
roleReactAssignmentSchema.index({ shortId: 1, userId: 1 }, { unique: true });

module.exports = {
  RoleReact: mongoose.model('RoleReact', roleReactSchema),
  RoleReactAssignment: mongoose.model('RoleReactAssignment', roleReactAssignmentSchema),
};
