const mongoose = require('mongoose');

const reminderSchema = new mongoose.Schema({
  message: { type: String, required: true, maxlength: 2048 },
  interval: { type: Number, required: true }, // Interval in minutes
  channelId: { type: String, required: true },
  reminderId: { type: String, required: true, unique: true }
});

const model = mongoose.model('Reminder', reminderSchema);

module.exports = model;
