// Player facing text. Pure so it can be tested locally. No em dashes anywhere.
const { bannedForms, VIOLATION_LABELS } = require('./clueRules');

function formatSolve(ms) {
  if (!Number.isFinite(ms)) return 'n/a';
  return `${(ms / 1000).toFixed(1)}s`;
}

function rulesText({
  maxClues = 3, readySeconds = 15, turnStartBufferSeconds = 10,
} = {}) {
  return [
    `When it's your turn, press **Show my word & Ready** within **${readySeconds} seconds**. Only you see the word. You then get **${turnStartBufferSeconds} seconds** to read it before the turn actually starts.`,
    `Describe it in the game channel using at most **${maxClues} messages**. Editing a message counts as another message.`,
    '',
    '**Hard rules (breaking one ends your turn, no points):**',
    '• Do not say the word, its plural, or any banned word',
    '• Do not spell it out, give the letter count, or give the first or last letter',
    '• No blank templates like `v_____` and no anagrams',
    '• No images, GIFs, stickers or attachments',
    '',
    `After your ${ordinal(maxClues)} message you are muted in the channel until the turn ends. You cannot guess on your own turn.`,
    'Anything subjective is settled by the Host and a veto vote.',
  ].join('\n');
}

function ordinal(n) {
  return { 1: '1st', 2: '2nd', 3: '3rd' }[n] || `${n}th`;
}

/** Banned list shown to the Actor: the aliases, banned forms and plurals they may not say. */
function bannedListForActor(word) {
  const own = new Set([word.answer.toLowerCase()]);
  const shown = [...new Set(bannedForms(word))].filter((f) => !own.has(f));
  return shown;
}

/** Ephemeral reveal shown when the Actor clicks "Show my word & Ready". */
function wordRevealText(word, { turnStartBufferSeconds = 10 } = {}) {
  const banned = bannedListForActor(word);
  return [
    `Your word is **${word.answer}**`,
    `Category: ${word.category}`,
    '',
    banned.length
      ? `Also banned: ${banned.map((f) => `\`${f}\``).join(', ')}`
      : 'No extra banned words for this one.',
    '',
    `You have ${turnStartBufferSeconds} seconds to read this before the turn starts.`,
  ].join('\n');
}

function resultText(turn, word) {
  const actor = `<@${turn.actorId}>`;
  switch (turn.status) {
    case 'guessed':
      return `<@${turn.guesserId}> guessed **${word.answer}** in ${formatSolve(turn.solveMs)}. ${turn.annulled ? 'Points annulled.' : `+${turn.pointsGuesser} point to <@${turn.guesserId}> and +${turn.pointsActor} to ${actor}.`}`;
    case 'timeout':
      return `Time is up. The word was **${word.answer}**.`;
    case 'violation':
      return `${actor} broke a hard rule: ${VIOLATION_LABELS[turn.violation?.type] || 'rule violation'}. This turn is annulled. The word was **${word.answer}**.`;
    case 'terminated':
      return `The Host ended this turn. It is annulled. The word was **${word.answer}**.`;
    default:
      return `${actor} did not start their turn.`;
  }
}

function rankLabel(rank) {
  return { 1: '🥇', 2: '🥈', 3: '🥉' }[rank] || `#${rank}`;
}

function standingsLines(rows) {
  if (!rows.length) return 'No points scored.';
  return rows.map((r) => `${rankLabel(r.rank)} <@${r.userId}>: ${r.points} pt${r.points === 1 ? '' : 's'}`).join('\n');
}

/** Live clue-mirror embed body: the Actor's clues so far, in order. */
function clueMirrorText(clues) {
  if (!clues.length) return 'No clues yet.';
  return clues.map((c, i) => `**${i + 1}.** ${c.deletedAt ? `~~${c.content || '(deleted)'}~~ (deleted)` : c.content}`).join('\n');
}

/** DM sent for a near-miss guess. Never reveals the answer or the letter positions. */
function nearMissText(guessRaw, result) {
  if (result.kind === 'relation') return `Your guess **${guessRaw}** is related to the answer!`;
  const n = result.distance;
  return `Your guess **${guessRaw}** was ${n} letter${n === 1 ? '' : 's'} off!`;
}

module.exports = {
  formatSolve, rulesText, wordRevealText, bannedListForActor, resultText, rankLabel, standingsLines, ordinal, clueMirrorText, nearMissText,
};
