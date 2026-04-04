/**
 * Parse a string of user mentions or IDs.
 * Splits on commas (if any), otherwise on whitespace.
 * For now this is only used in admin mass-add but could be used in future functions to take multiple inputs
 * @param {string} input
 * @returns {string[]} Array of user ID strings
 * @throws {Error} On invalid tokens
 */
function parseUserList(input) {
  // Choose splitter: commas (with optional spaces) take priority
  const rawTokens = input.includes(',')
    ? input.split(',').map(t => t.trim()).filter(Boolean)
    : input.split(/\s+/).map(t => t.trim()).filter(Boolean);

  if (!rawTokens.length) {
    throw new Error('No user IDs or mentions found.');
  }

  const ids = rawTokens.map(token => {
    // match <@123…> or <@!123…>
    const mentionMatch = token.match(/^<@!?(\d{17,19})>$/);
    if (mentionMatch) return mentionMatch[1];

    // match plain 17–19 digit ID
    const idMatch = token.match(/^(\d{17,19})$/);
    if (idMatch) return idMatch[1];

    throw new Error(`Invalid token: "${token}". Use @mentions or raw IDs.`);
  });

  // remove duplicates
  return Array.from(new Set(ids));
}

module.exports = { parseUserList };