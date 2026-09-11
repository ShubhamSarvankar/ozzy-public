const tempRoleModel = require('../models/tempRoleSchema');

// setTimeout's delay is a 32-bit signed int under the hood; anything larger
// silently fires immediately. Cap each leg well under that ceiling so long
// durations get chunked into multiple reschedules instead.
const MAX_TIMEOUT_MS = 20 * 24 * 60 * 60 * 1000; // 20 days

const SWEEP_INTERVAL_MS = 2 * 60 * 1000; // 2 minutes

// docId (string) -> Timeout handle
const activeTimers = new Map();

function cancelSchedule(id) {
  const key = String(id);
  const handle = activeTimers.get(key);
  if (handle) {
    clearTimeout(handle);
    activeTimers.delete(key);
  }
}

function scheduleRemoval(client, doc) {
  const key = String(doc._id);
  cancelSchedule(key);

  const remaining = doc.expiresAt.getTime() - Date.now();

  if (remaining <= 0) {
    removeTempRole(client, doc, 'Temporary role expired');
    return;
  }

  const delay = Math.min(remaining, MAX_TIMEOUT_MS);
  const handle = setTimeout(async () => {
    // Re-check the doc is still active before acting, in case a manual
    // removal or the sweep already resolved it while this leg was waiting.
    const fresh = await tempRoleModel.findById(doc._id);
    if (!fresh || !fresh.active) {
      activeTimers.delete(key);
      return;
    }

    if (fresh.expiresAt.getTime() - Date.now() <= 0) {
      await removeTempRole(client, fresh, 'Temporary role expired');
    } else {
      activeTimers.delete(key);
      scheduleRemoval(client, fresh);
    }
  }, delay);

  activeTimers.set(key, handle);
}

async function removeTempRole(client, doc, reason) {
  cancelSchedule(doc._id);

  try {
    const guild = await client.guilds.fetch(doc.guildId).catch(() => null);
    const member = guild ? await guild.members.fetch(doc.userId).catch(() => null) : null;

    if (member && member.roles.cache.has(doc.roleId)) {
      await member.roles.remove(doc.roleId, reason);
    }
  } catch (error) {
    console.error(`[tempRoleManager] Failed to remove role ${doc.roleId} from ${doc.userId}:`, error);
  }

  await tempRoleModel.findByIdAndUpdate(doc._id, { active: false });
}

async function sweep(client) {
  const expired = await tempRoleModel.find({ active: true, expiresAt: { $lte: new Date() } });
  for (const doc of expired) {
    await removeTempRole(client, doc, 'Temporary role expired');
  }
}

function initialize(client) {
  tempRoleModel.find({ active: true }).then((docs) => {
    docs.forEach((doc) => scheduleRemoval(client, doc));
  }).catch((error) => {
    console.error('[tempRoleManager] Failed to load active temp roles on startup:', error);
  });

  setInterval(() => {
    sweep(client).catch((error) => {
      console.error('[tempRoleManager] Sweep failed:', error);
    });
  }, SWEEP_INTERVAL_MS);
}

module.exports = { scheduleRemoval, cancelSchedule, removeTempRole, sweep, initialize };
