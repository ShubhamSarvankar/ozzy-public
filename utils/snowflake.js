/**
 * Discord snowflake -> timestamp decoding. Pulled out of crawl/messageCrawler.js
 * so non-crawl code (e.g. commands/activeweek.js) doesn't need to reach into
 * the crawl module for it.
 */

const DISCORD_EPOCH = 1420070400000n;

function snowflakeToDate(id) {
  try {
    const ms = (BigInt(id) >> 22n) + DISCORD_EPOCH;
    return new Date(Number(ms));
  } catch {
    return null;
  }
}

module.exports = { snowflakeToDate };
