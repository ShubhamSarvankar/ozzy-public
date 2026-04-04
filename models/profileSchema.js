/**const mongoose = require('mongoose');

const profileSchema = new mongoose.Schema({
  userId: { type: String, required: true },
  serverId: { type: String, required: true },
  sapphires: { type: Number, default: 0 },
  rubies: { type: Number, default: 0 },
});

profileSchema.index({ userId: 1, serverId: 1 }, { unique: true });

const model = mongoose.model('ProfileModels', profileSchema);

module.exports = model;**/

const mongoose = require("mongoose");

const profileSchema = new mongoose.Schema({
    userId: { type: String, require: true, unique: true },
    serverId: { type: String, require: true },
    sapphires: { type: Number, default: 0 },
});

const model = mongoose.model("sapphirebalance", profileSchema);

module.exports = model;
