// Helpers for working with the users who reacted to a message.
// No discord.js imports: everything here works on whatever objects are passed
// in, so it can be tested with plain fakes (see test/reactionUsers.test.js).

const { parseUserList } = require('./userListParser');

// Discord returns at most 100 users per request for a single reaction.
const PAGE_SIZE = 100;

const LINK_RE = /^https?:\/\/(?:(?:ptb|canary)\.)?discord(?:app)?\.com\/channels\/(\d{17,20})\/(\d{17,20})\/(\d{17,20})\/?(?:[?#].*)?$/;

/**
 * Parse a full Discord message link.
 * @param {string} url
 * @returns {{ guildId: string, channelId: string, messageId: string }}
 * @throws {Error} if the link is not a full message link
 */
function parseMessageLink(url) {
  const match = typeof url === 'string' ? url.trim().match(LINK_RE) : null;
  if (!match) {
    throw new Error('Invalid Discord message link. Use "Copy Message Link" on the message.');
  }
  return { guildId: match[1], channelId: match[2], messageId: match[3] };
}

/**
 * Every unique non-bot user who reacted to the message, across all emojis.
 * Pages through each reaction so messages with more than 100 reactors on one
 * emoji are not cut short.
 * @param {{ reactions: { cache: Map<any, any> } }} message
 * @returns {Promise<string[]>}
 */
async function collectReactorIds(message) {
  const ids = new Set();
  for (const reaction of message.reactions.cache.values()) {
    let after;
    for (;;) {
      const options = after ? { limit: PAGE_SIZE, after } : { limit: PAGE_SIZE };
      const page = await reaction.users.fetch(options);
      const users = [...page.values()];
      for (const user of users) {
        if (!user.bot) ids.add(user.id);
      }
      if (users.length < PAGE_SIZE) break;
      after = users[users.length - 1].id;
    }
  }
  return [...ids];
}

/**
 * Fetch the message behind a link (must be in this guild) and return its reactors.
 * @param {object} guild interaction.guild
 * @param {string} url full message link
 * @returns {Promise<{ messageId: string, userIds: string[] }>}
 */
async function fetchReactorIds(guild, url) {
  const { guildId, channelId, messageId } = parseMessageLink(url);
  if (guildId !== guild.id) {
    throw new Error('That message link is from a different server.');
  }
  const channel = await guild.channels.fetch(channelId).catch(() => null);
  if (!channel || typeof channel.isTextBased !== 'function' || !channel.isTextBased()) {
    throw new Error("That channel isn't a text channel or I can't access it.");
  }
  const message = await channel.messages.fetch(messageId).catch(() => null);
  if (!message) {
    throw new Error('Could not fetch that message. Make sure I have "Read Message History" in that channel.');
  }
  return { messageId, userIds: await collectReactorIds(message) };
}

/**
 * Work out who /admin massadd should pay: the typed user list, the reactors on
 * a message, or both (deduplicated).
 * @param {{ usersString?: string|null, messageUrl?: string|null, guild: object }} params
 * @returns {Promise<{ userIds: string[], messageId: string|null }>}
 */
async function resolveMassAddTargets({ usersString, messageUrl, guild }) {
  const hasUsers = typeof usersString === 'string' && usersString.trim() !== '';
  const hasMessage = typeof messageUrl === 'string' && messageUrl.trim() !== '';
  if (!hasUsers && !hasMessage) {
    throw new Error('Provide a list of users, a message link for reactions, or both.');
  }

  const ids = new Set();
  if (hasUsers) {
    for (const id of parseUserList(usersString)) ids.add(id);
  }

  let messageId = null;
  if (hasMessage) {
    const result = await fetchReactorIds(guild, messageUrl);
    if (!result.userIds.length) {
      throw new Error('Nobody (other than bots) has reacted to that message.');
    }
    messageId = result.messageId;
    for (const id of result.userIds) ids.add(id);
  }

  return { userIds: [...ids], messageId };
}

module.exports = {
  PAGE_SIZE,
  parseMessageLink,
  collectReactorIds,
  fetchReactorIds,
  resolveMassAddTargets,
};
