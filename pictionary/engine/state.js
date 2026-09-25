// Pure Game/Turn transition helpers: deadline math and status classification
// used by the discord adapter, kept separate so it's unit-testable without
// discord.js or Mongo. The adapter still owns actual scheduling (setTimeout)
// and persistence; these functions only compute values.

// Statuses that have a single live `deadlineAt` driving a phase timer.
const LIVE_STATUSES = ['registering', 'ready_check', 'starting', 'active', 'between'];

function isLiveStatus(status) {
  return LIVE_STATUSES.includes(status);
}

function msFromNow(now, seconds) {
  return now + Math.max(0, seconds) * 1000;
}

/** Ms remaining until `deadlineAt`, floored at 0. Null if there's no deadline. */
function remainingMs(deadlineAt, now) {
  if (!deadlineAt) return null;
  return Math.max(0, new Date(deadlineAt).getTime() - now);
}

/** Deadline to resume at, given how much time was left when paused. */
function resumeDeadline(now, remaining) {
  return remaining === null || remaining === undefined ? null : now + remaining;
}

/** True once `idx` (0-based, position in roundOrder) is the last turn of the game. */
function isLastTurn(game, idx) {
  return game.currentRound >= game.totalRounds && idx >= game.roundOrder.length - 1;
}

/** Reconstructs the word shape a Turn was created with, ignoring any later edit to words.json. */
function wordFromTurn(turn) {
  if (!turn.wordVersion) return null;
  return { id: turn.wordId, ...turn.wordVersion };
}

module.exports = {
  isLiveStatus, msFromNow, remainingMs, resumeDeadline, isLastTurn, wordFromTurn, LIVE_STATUSES,
};
