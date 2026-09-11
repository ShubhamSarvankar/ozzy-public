const { RoleReact, RoleReactAssignment } = require('../models/roleReactSchema');

const FAILURE_DM_THROTTLE_MS = 60 * 60 * 1000; // 1 hour
const BACKFILL_DELAY_MS = 300;

// shortId (string) -> lightweight instance object
const instancesById = new Map();
// messageId (string) -> shortId[]
const messageIndex = new Map();

// shortId (string) -> Promise chain tail. Serializes the ENTIRE
// select/reserve/grant sequence for both add and remove, per instance,
// across every strategy: without this, two redelivered gateway events for
// the same user can both pass an existence check before either has written
// anything, and a react immediately followed by an unreact can interleave
// with the in-flight grant and leave an orphaned role/record.
const chains = new Map();

function withInstanceLock(instanceId, fn) {
  const prev = chains.get(instanceId) || Promise.resolve();
  const next = prev.then(fn, fn);
  chains.set(instanceId, next.catch(() => {}));
  return next;
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function toLightweight(doc) {
  return {
    shortId: doc.shortId,
    guildId: doc.guildId,
    channelId: doc.channelId,
    messageId: doc.messageId,
    strategy: doc.strategy,
    roles: doc.roles.map((r) => ({
      roleId: r.roleId,
      emojiName: r.emojiName,
      emojiId: r.emojiId,
      emojiAnimated: r.emojiAnimated,
      position: r.position,
    })),
    unreactRemovesRole: doc.unreactRemovesRole,
    removeUnregisteredReactions: doc.removeUnregisteredReactions,
    dmUserOnAssignment: doc.dmUserOnAssignment,
  };
}

function register(doc) {
  const instance = toLightweight(doc);
  instancesById.set(instance.shortId, instance);

  if (instance.messageId) {
    const key = String(instance.messageId);
    const list = messageIndex.get(key) || [];
    if (!list.includes(instance.shortId)) list.push(instance.shortId);
    messageIndex.set(key, list);
  }

  return instance;
}

function unregister(shortId) {
  const key = String(shortId);
  const instance = instancesById.get(key);
  instancesById.delete(key);

  if (instance && instance.messageId) {
    const msgKey = String(instance.messageId);
    const list = messageIndex.get(msgKey);
    if (list) {
      const filtered = list.filter((id) => id !== key);
      if (filtered.length) messageIndex.set(msgKey, filtered);
      else messageIndex.delete(msgKey);
    }
  }
}

function getForMessage(messageId) {
  const ids = messageIndex.get(String(messageId));
  if (!ids || !ids.length) return [];
  return ids.map((id) => instancesById.get(id)).filter(Boolean);
}

// All roles in an instance share one trigger emoji (solo trivially has one
// role; mucho/team/semirandom deliberately use a single emoji for the whole
// pool), so
// matching only needs to check the first role entry. Never matches on the
// raw formatted reaction string, which varies between custom/unicode emoji.
function emojiMatches(instance, reactionEmoji) {
  const ref = instance.roles[0];
  if (!ref) return false;
  if (ref.emojiId) return reactionEmoji.id === ref.emojiId;
  return reactionEmoji.name === ref.emojiName;
}

function isRoleValid(guild, roleId) {
  const role = guild.roles.cache.get(roleId);
  if (!role) return false;
  const botMember = guild.members.me;
  if (!botMember) return false;
  return botMember.roles.highest.comparePositionTo(role) > 0;
}

function pickSolo(instance, guild) {
  const entry = instance.roles[0];
  if (!entry) return null;
  return isRoleValid(guild, entry.roleId) ? entry.roleId : null;
}

function pickMucho(instance, guild) {
  const valid = instance.roles.filter((r) => isRoleValid(guild, r.roleId));
  if (!valid.length) return null;
  const idx = Math.floor(Math.random() * valid.length);
  return valid[idx].roleId;
}

// Atomically claims the (shortId, userId) slot in Mongo. Returns the created
// record, 'taken' if someone else already holds the slot (duplicate key —
// the safety net against redelivered gateway events), or null if the write
// itself failed for some other reason (nothing reserved, caller must not
// touch Discord).
async function reserveAssignment(instance, userId, roleId) {
  try {
    return await RoleReactAssignment.create({
      shortId: instance.shortId,
      guildId: instance.guildId,
      userId,
      roleId,
    });
  } catch (error) {
    if (error && error.code === 11000) return 'taken';
    console.error(`[roleReactManager] Failed to reserve assignment for ${instance.shortId}/${userId}:`, error);
    return null;
  }
}

async function maybeDm(instance, member, roleId) {
  if (!instance.dmUserOnAssignment) return;
  try {
    await member.send(`You were granted the <@&${roleId}> role.`);
  } catch {
    // DMs closed or blocked — not actionable, swallow.
  }
}

async function notifyFailure(client, instance) {
  try {
    const doc = await RoleReact.findOne({ shortId: instance.shortId });
    if (!doc) return;
    if (doc.lastFailureDmAt && Date.now() - doc.lastFailureDmAt.getTime() < FAILURE_DM_THROTTLE_MS) return;

    const creator = await client.users.fetch(doc.createdBy).catch(() => null);
    if (!creator) return; // nothing to throttle if we can't even look them up right now

    await RoleReact.findByIdAndUpdate(doc._id, { lastFailureDmAt: new Date() });
    await creator.send(
      `Your rolereact **${doc.shortId}** couldn't assign a role just now — check that I still have permission to manage the role(s) involved.`
    ).catch(() => {});
  } catch (error) {
    console.error(`[roleReactManager] notifyFailure failed for ${instance.shortId}:`, error);
  }
}

// Reservation (the DB write) always happens before the Discord grant, and is
// rolled back if the grant fails. This means a crash between the two leaves,
// at worst, a record with no role on Discord — a missed grant, recoverable
// on the next reconciliation pass — rather than a role granted twice with no
// record to show for it, which is unrecoverable and silently defeats the
// "one role per user per instance" guarantee.
async function grantAndRecord(client, instance, member, roleId) {
  const record = await reserveAssignment(instance, member.id, roleId);

  if (record === 'taken') {
    const existing = await RoleReactAssignment.findOne({ shortId: instance.shortId, userId: member.id });
    return existing ? existing.roleId : null;
  }
  if (!record) return null;

  try {
    await member.roles.add(roleId, `rolereact ${instance.shortId}`);
  } catch (error) {
    console.error(`[roleReactManager] Failed to add role ${roleId} to ${member.id}:`, error);
    await RoleReactAssignment.deleteOne({ _id: record._id }).catch(() => {});
    await notifyFailure(client, instance);
    return null;
  }

  await maybeDm(instance, member, roleId);
  return roleId;
}

// Deterministic (e.g. declaration-order) tiebreaking would send the first
// several joiners all to role_1 and produce visible bias in small groups, so
// ties are broken randomly.
function selectTeamRole(valid) {
  const minCount = Math.min(...valid.map((r) => r.assignedCount));
  const tied = valid.filter((r) => r.assignedCount === minCount);
  return tied[Math.floor(Math.random() * tied.length)];
}

// Weighted random pick where weight is inversely proportional to how many
// people already hold the role. +1 on every count avoids a divide-by-zero
// for untouched roles while preserving inverse proportionality between any
// two roles that already have members (weight ratio between counts c1, c2
// is (c2+1)/(c1+1), same shape as 1/c1 : 1/c2 once both are nonzero).
//
// Above a spread of 3 between the largest and smallest team, chance alone
// isn't reliable enough to close the gap, so it's overridden with a forced
// assignment to the smallest team (ties broken randomly, same as
// selectTeamRole) until the spread closes back to 3 or under.
function selectSemirandomRole(valid) {
  const counts = valid.map((r) => r.assignedCount);
  const minCount = Math.min(...counts);
  const maxCount = Math.max(...counts);

  if (maxCount - minCount > 3) {
    const tied = valid.filter((r) => r.assignedCount === minCount);
    return tied[Math.floor(Math.random() * tied.length)];
  }

  const weights = valid.map((r) => 1 / (r.assignedCount + 1));
  const total = weights.reduce((sum, w) => sum + w, 0);
  let roll = Math.random() * total;
  for (let i = 0; i < valid.length; i++) {
    roll -= weights[i];
    if (roll <= 0) return valid[i];
  }
  return valid[valid.length - 1]; // floating-point fallback
}

async function assignCounted(client, instance, member, selectRole) {
  const doc = await RoleReact.findOne({ shortId: instance.shortId, active: true });
  if (!doc) return null;

  const guild = member.guild;
  const valid = doc.roles.filter((r) => isRoleValid(guild, r.roleId));
  if (!valid.length) {
    console.error(`[roleReactManager] No valid roles for ${instance.shortId}`);
    await notifyFailure(client, instance);
    return null;
  }

  const chosen = selectRole(valid);

  const record = await reserveAssignment(instance, member.id, chosen.roleId);

  if (record === 'taken') {
    const existing = await RoleReactAssignment.findOne({ shortId: instance.shortId, userId: member.id });
    return existing ? existing.roleId : null;
  }
  if (!record) return null;

  // Claim the counter slot alongside the record, before the Discord call —
  // same reasoning as grantAndRecord: a crash here leaves a record+counter
  // claiming a role the member doesn't yet have, not a role the member has
  // with nothing tracking it.
  await RoleReact.findOneAndUpdate(
    { shortId: instance.shortId, 'roles.roleId': chosen.roleId },
    { $inc: { 'roles.$.assignedCount': 1 } }
  );

  try {
    await member.roles.add(chosen.roleId, `rolereact ${instance.shortId}`);
  } catch (error) {
    console.error(`[roleReactManager] Failed to add role ${chosen.roleId} to ${member.id}:`, error);
    await RoleReactAssignment.deleteOne({ _id: record._id }).catch(() => {});
    await RoleReact.findOneAndUpdate(
      { shortId: instance.shortId, 'roles.roleId': chosen.roleId },
      { $inc: { 'roles.$.assignedCount': -1 } }
    ).catch(() => {});
    await notifyFailure(client, instance);
    return null;
  }

  await maybeDm(instance, member, chosen.roleId);
  return chosen.roleId;
}

async function assignForLocked(client, instance, member) {
  const existing = await RoleReactAssignment.findOne({ shortId: instance.shortId, userId: member.id });
  if (existing) return existing.roleId;

  if (instance.strategy === 'team') {
    return assignCounted(client, instance, member, selectTeamRole);
  }
  if (instance.strategy === 'semirandom') {
    return assignCounted(client, instance, member, selectSemirandomRole);
  }

  const roleId = instance.strategy === 'solo'
    ? pickSolo(instance, member.guild)
    : pickMucho(instance, member.guild);

  if (!roleId) {
    console.error(`[roleReactManager] No valid role to assign for ${instance.shortId} (guild ${instance.guildId})`);
    await notifyFailure(client, instance);
    return null;
  }

  return grantAndRecord(client, instance, member, roleId);
}

async function assignFor(client, instance, member) {
  // Cheap pre-lock check to skip needless lock contention for the common
  // already-assigned case — correctness doesn't depend on it, since
  // reserveAssignment's unique index is the real gate either way.
  const existing = await RoleReactAssignment.findOne({ shortId: instance.shortId, userId: member.id });
  if (existing) return existing.roleId;

  return withInstanceLock(instance.shortId, () => assignForLocked(client, instance, member));
}

async function decrementTeamCounter(shortId, roleId) {
  const doc = await RoleReact.findOne({ shortId, 'roles.roleId': roleId });
  if (!doc) return;
  const entry = doc.roles.find((r) => r.roleId === roleId);
  if (!entry || entry.assignedCount <= 0) return; // clamp at zero — guards a duplicate remove event

  await RoleReact.findOneAndUpdate(
    { shortId, 'roles.roleId': roleId },
    { $inc: { 'roles.$.assignedCount': -1 } }
  );
}

// The delete is the atomic claim on this removal (mirrors reserveAssignment
// on the add side): only the caller whose deleteOne actually removed a
// document proceeds to touch Discord and the counter, so a duplicate
// messageReactionRemove delivery — or an add/remove pair racing each other,
// both of which are serialized through the same per-instance lock as this
// function — can't double-decrement or double-remove.
async function removeAssignmentLocked(client, instance, userId) {
  const record = await RoleReactAssignment.findOne({ shortId: instance.shortId, userId });
  if (!record) return;

  const result = await RoleReactAssignment.deleteOne({ _id: record._id });
  if (result.deletedCount !== 1) return;

  try {
    const guild = await client.guilds.fetch(instance.guildId).catch(() => null);
    const member = guild ? await guild.members.fetch(userId).catch(() => null) : null;
    if (member && member.roles.cache.has(record.roleId)) {
      await member.roles.remove(record.roleId, `rolereact ${instance.shortId} (reaction removed)`);
    }
  } catch (error) {
    console.error(`[roleReactManager] Failed to remove role ${record.roleId} from ${userId}:`, error);
  }

  if (instance.strategy === 'team' || instance.strategy === 'semirandom') {
    await decrementTeamCounter(instance.shortId, record.roleId);
  }
}

async function removeAssignment(client, instance, userId) {
  if (!instance.unreactRemovesRole) return;
  return withInstanceLock(instance.shortId, () => removeAssignmentLocked(client, instance, userId));
}

async function deactivate(client, shortId, reason) {
  await RoleReact.findOneAndUpdate({ shortId }, { active: false, inactiveReason: reason || null });
  unregister(shortId);
}

async function deactivateAndNotify(client, shortId, reason) {
  const doc = await RoleReact.findOne({ shortId });
  await deactivate(client, shortId, reason);

  if (doc) {
    const creator = await client.users.fetch(doc.createdBy).catch(() => null);
    if (creator) {
      await creator.send(`Your rolereact **${shortId}** was deactivated: ${reason}`).catch(() => {});
    }
  }
}

async function handleMessageDeleted(client, message) {
  const instances = getForMessage(message.id);
  for (const instance of instances) {
    await deactivateAndNotify(client, instance.shortId, 'The bot message for this rolereact was deleted.');
  }
}

async function handleMessageDeletedBulk(client, messages) {
  for (const message of messages.values()) {
    await handleMessageDeleted(client, message);
  }
}

async function handleChannelDeleted(client, channel) {
  const docs = await RoleReact.find({ channelId: channel.id, active: true });
  for (const doc of docs) {
    await deactivateAndNotify(client, doc.shortId, 'The channel for this rolereact was deleted.');
  }
}

async function handleRoleDeleted(client, role) {
  const docs = await RoleReact.find({ guildId: role.guild.id, active: true, 'roles.roleId': role.id });

  for (const doc of docs) {
    const remaining = doc.roles.filter((r) => r.roleId !== role.id);
    const minimum = doc.strategy === 'solo' ? 1 : 2;

    if (remaining.length < minimum) {
      await deactivateAndNotify(client, doc.shortId, `A required role (${role.name}) was deleted.`);
      continue;
    }

    await RoleReact.findOneAndUpdate({ shortId: doc.shortId }, { $pull: { roles: { roleId: role.id } } });

    const instance = instancesById.get(doc.shortId);
    if (instance) {
      instance.roles = instance.roles.filter((r) => r.roleId !== role.id);
    }
  }
}

// Discord paginates reaction-user listings at 100 per page (ascending by
// user ID). A single unpaginated fetch silently caps backfill at the first
// 100 reactors forever — anyone beyond that page, or added after the
// instance already has 100+ assignments, would never be reconciled on any
// future restart. Page through with `after` until a short page ends it.
async function fetchAllReactors(reaction) {
  const users = new Map();
  let after;

  for (;;) {
    const page = await reaction.users.fetch({ limit: 100, after }).catch(() => null);
    if (!page || !page.size) break;
    for (const [id, user] of page) users.set(id, user);
    if (page.size < 100) break;
    after = page.lastKey();
  }

  return users;
}

async function backfillInstance(client, doc) {
  const channel = await client.channels.fetch(doc.channelId).catch(() => null);
  if (!channel) {
    await deactivateAndNotify(client, doc.shortId, 'The channel for this rolereact could not be found on startup.');
    return;
  }

  const message = await channel.messages.fetch(doc.messageId).catch(() => null);
  if (!message) {
    await deactivateAndNotify(client, doc.shortId, 'The bot message for this rolereact could not be found on startup.');
    return;
  }

  const instance = instancesById.get(doc.shortId);
  if (!instance) return;

  const reaction = message.reactions.cache.find((r) => emojiMatches(instance, r.emoji));
  if (!reaction) return;

  const reactors = await fetchAllReactors(reaction);
  const currentReactorIds = new Set();

  for (const user of reactors.values()) {
    if (user.bot) continue;
    currentReactorIds.add(user.id);

    const existing = await RoleReactAssignment.findOne({ shortId: doc.shortId, userId: user.id });
    if (existing) continue;

    const member = await channel.guild.members.fetch(user.id).catch(() => null);
    if (!member) continue;

    await assignFor(client, instance, member);
  }

  // Reactions removed entirely while the bot was offline never generate a
  // messageReactionRemove event, so anyone still holding an assignment
  // record but no longer in the current reactor list needs to be caught up
  // here too — otherwise unreactRemovesRole silently stops holding across a
  // restart.
  if (!instance.unreactRemovesRole) return;

  const staleRecords = await RoleReactAssignment.find({ shortId: doc.shortId });
  for (const record of staleRecords) {
    if (currentReactorIds.has(record.userId)) continue;
    await withInstanceLock(instance.shortId, () => removeAssignmentLocked(client, instance, record.userId));
  }
}

async function initialize(client) {
  let docs;
  try {
    docs = await RoleReact.find({ active: true });
  } catch (error) {
    console.error('[roleReactManager] Failed to load active instances on startup:', error);
    return;
  }

  const toBackfill = [];
  for (const doc of docs) {
    if (!doc.messageId) {
      // Crashed mid-setup before the message/messageId was ever attached — orphaned, not recoverable.
      await RoleReact.findByIdAndUpdate(doc._id, {
        active: false,
        inactiveReason: 'Orphaned: no message was ever attached.',
      }).catch((error) => {
        console.error(`[roleReactManager] Failed to mark orphaned instance ${doc.shortId} inactive:`, error);
      });
      continue;
    }

    register(doc);
    toBackfill.push(doc);
  }

  for (const doc of toBackfill) {
    try {
      await backfillInstance(client, doc);
    } catch (error) {
      console.error(`[roleReactManager] Backfill failed for ${doc.shortId}:`, error);
    }
    await sleep(BACKFILL_DELAY_MS);
  }
}

module.exports = {
  initialize,
  register,
  unregister,
  getForMessage,
  deactivate,
  assignFor,
  removeAssignment,
  handleMessageDeleted,
  handleMessageDeletedBulk,
  handleRoleDeleted,
  handleChannelDeleted,
  emojiMatches,
};
