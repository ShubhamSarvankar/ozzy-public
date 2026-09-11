const mongoose = require('mongoose');

const gotwSchema = new mongoose.Schema({
  trigger:   { type: String, required: true, unique: true },
  responses: { type: [String], required: true },
});

module.exports = mongoose.model('Gotw', gotwSchema);