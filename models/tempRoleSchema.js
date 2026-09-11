const mongoose = require('mongoose');

const tempRoleSchema = new mongoose.Schema({
  guildId: { type: String, required: true },
  userId: { type: String, required: true },
  roleId: { type: String, required: true },
  expiresAt: { type: Date, required: true },
  addedBy: { type: String, required: true },
  active: { type: Boolean, default: true },
}, { timestamps: true });

const model = mongoose.model('TempRole', tempRoleSchema);

module.exports = model;
