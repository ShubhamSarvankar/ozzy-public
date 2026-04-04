/**const mongoose = require("mongoose");

const weeklyProfileSchema = new mongoose.Schema({
    userId: { type: String, require: true, unique: true },
    serverId: { type: String, require: true },
    sapphires: { type: Number, default: 0 },
    createdMessageId: { type: String, require: true}, 
});

const weeklyModel = mongoose.model("weeklySapphireBalance", weeklyProfileSchema);

module.exports = weeklyModel;**/

const mongoose = require("mongoose");

const weeklyProfileSchema = new mongoose.Schema({
    userId: { type: String, require: true, unique: true },
    serverId: { type: String, require: true },
    sapphires: { type: Number, default: 0 },
    createdMessageId: { type: String, require: true}, 
});

const weeklyModel = mongoose.model("weeklySapphireBalance", weeklyProfileSchema);

module.exports = weeklyModel;

