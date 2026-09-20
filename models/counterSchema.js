const mongoose = require('mongoose');

// Backs human-friendly sequential IDs (e.g. reminders' "R-1842") via an
// atomic $inc, one doc per counter name — simpler than a random-ID
// collision-retry loop and, unlike one, guaranteed unique by construction.
const counterSchema = new mongoose.Schema({
  _id: { type: String, required: true }, // counter name, e.g. 'reminder'
  seq: { type: Number, default: 0 },
});

const Counter = mongoose.model('Counter', counterSchema);

async function nextSeq(counterName) {
  const doc = await Counter.findByIdAndUpdate(
    counterName,
    { $inc: { seq: 1 } },
    { upsert: true, new: true }
  );
  return doc.seq;
}

module.exports = { Counter, nextSeq };
