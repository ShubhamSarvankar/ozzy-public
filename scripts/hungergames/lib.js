// Shared loading for the Hunger Games history scripts.

require('dotenv').config();
const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');
const { HgArchiveMessage } = require('../../models/hgArchiveSchema');
const { compileKnown, groupGames, suggestLabel } = require('../../hungergames/engine/history');
const knownRows = require('../../hungergames/engine/knownTemplates.json');

const DATA_DIR = path.join(__dirname, '../../data/hungergames');
const LABELS_PATH = path.join(DATA_DIR, 'labels.json');
const TEMPLATES_PATH = path.join(DATA_DIR, 'templates.json');

async function connect() {
  await mongoose.connect(process.env.MONGODB_SRV);
}

// Archived messages, oldest first, grouped into finished games.
async function loadGames() {
  const messages = await HgArchiveMessage.find().lean();
  messages.sort((a, b) => (BigInt(a._id) < BigInt(b._id) ? -1 : 1));
  return groupGames(messages.map((m) => ({ ...m, id: m._id })));
}

const known = knownRows.map((r) => compileKnown(r.template));
const knownLabels = Object.fromEntries(knownRows.filter((r) => r.label).map((r) => [r.template, r.label]));

function loadLabels() {
  return fs.existsSync(LABELS_PATH) ? JSON.parse(fs.readFileSync(LABELS_PATH, 'utf8')) : {};
}

// Human labels win; otherwise the suggestion from the old code, if any.
function effectiveLabels(templates, human) {
  const out = {};
  for (const t of templates) {
    const label = human[t] ?? suggestLabel(t, knownLabels);
    if (label) out[t] = label;
  }
  return out;
}

module.exports = {
  DATA_DIR, LABELS_PATH, TEMPLATES_PATH, connect, loadGames, known, knownLabels, loadLabels, effectiveLabels, mongoose,
};
