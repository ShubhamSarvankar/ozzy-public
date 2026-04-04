const mongoose = require('mongoose');

const stampSchema = new mongoose.Schema({
    userId: { type: String, required: true },
    stamps: { type: [String], default: [] }  // Change this line to store stamps as strings
});

module.exports = mongoose.model('Stamp', stampSchema);
