/**
 * Returns the hex color of the highest-priority non-default role,
 * or a default royal blue ('#4169E1') if something goes wrong
 * or the member has no colored roles.
 *
 * @param {import('discord.js').GuildMember} member
 * @returns {string} e.g. '#1ABC9C' or '#4169E1'
 */
function getMemberColor(member) {
  try {
    if (!member || !member.roles || !member.roles.cache) {
      throw new Error('Invalid member object');
    }

    // Filter out roles with the default color (0)
    const colored = member.roles.cache.filter(role => role.color !== 0);

    if (!colored.size) {
      // no colored roles, fall back
      return '#4169E1'; // royal blue
    }

    // Sort by position (highest first) and pick the top one
    const topRole = colored.sort((a, b) => b.position - a.position).first();

    // Convert integer color → 6-digit hex
    return `#${topRole.color.toString(16).padStart(6, '0')}`;
  } catch {
    // on any error, use royal blue
    return '#4169E1';
  }
}

module.exports = { getMemberColor };