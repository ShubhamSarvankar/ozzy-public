/**
 * The single source of truth for "does this message count toward the
 * messages leaderboard" — shared by the live hook (events/messageCreate.js)
 * and the historical crawl (crawl/messageCrawler.js). scope.md §3.6 requires
 * these to match exactly, since any divergence makes backfilled and live
 * counts incomparable.
 *
 * Rules (confirmed decisions, see scope.md "Open decisions"):
 *   - Exclude bots and webhooks.
 *   - Exclude system messages (joins, pins, boosts, etc.) — only Discord
 *     message types 0 (DEFAULT) and 19 (REPLY) are genuine user messages.
 *   - Exclude legacy prefix commands (!army hf, !army hfs).
 *   - Thread messages: excluded — moot for the crawl (channel history never
 *     returns thread messages), enforced separately for the live hook in
 *     events/messageCreate.js since that's a channel-resolution concern, not
 *     a per-message content/type concern this module handles.
 */

// Discord message types: 0 = DEFAULT, 19 = REPLY. Every other type (member
// join, channel pin, boost, thread-created notice, slash-command
// invocation, etc.) is system/Discord-generated, not organic chat.
const COUNTABLE_MESSAGE_TYPES = new Set([0, 19]);

const PREFIX_COMMANDS = ['!army hf', '!army hfs'];

function isCountableMessageCore({ type, isBot, hasWebhook, content }) {
  if (isBot) return false;
  if (hasWebhook) return false;
  if (!COUNTABLE_MESSAGE_TYPES.has(type)) return false;
  const normalized = (content || '').trim().toLowerCase();
  if (PREFIX_COMMANDS.includes(normalized)) return false;
  return true;
}

// For live discord.js Message objects.
function isCountableLiveMessage(message) {
  return isCountableMessageCore({
    type: message.type,
    isBot: message.author.bot,
    hasWebhook: Boolean(message.webhookId),
    content: message.content,
  });
}

// For raw REST API message JSON (the crawler, via @discordjs/rest — never a
// discord.js Message instance, per scope.md §3.1's no-client-cache rule).
function isCountableRestMessage(raw) {
  return isCountableMessageCore({
    type: raw.type,
    isBot: Boolean(raw.author && raw.author.bot),
    hasWebhook: Boolean(raw.webhook_id),
    content: raw.content,
  });
}

module.exports = { isCountableLiveMessage, isCountableRestMessage, PREFIX_COMMANDS };
