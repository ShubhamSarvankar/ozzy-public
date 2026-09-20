const mongoose = require('mongoose');

// Kept separate from profileSchema (the sapphire-economy doc) — timezone is
// an unrelated concern, and this collection is intentionally reusable by
// future features beyond reminders.
const userSettingsSchema = new mongoose.Schema({
  userId: { type: String, required: true, unique: true },
  timezone: { type: String, default: null }, // IANA tzid; null = never set, falls back to UTC
}, { timestamps: true });

module.exports = mongoose.model('UserSettings', userSettingsSchema);
