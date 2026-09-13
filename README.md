# Ozzy

A crash-safe Discord bot serving 10k+ users (leveling, economy, utilities, games and shop), built on [discord.js](https://discord.js.org/) v14 and MongoDB. It's been in continuous production use since 2024.

> This is a sanitized, auto-synced mirror of a private production repository — pushed by a [GitHub Actions workflow](.github/workflows/publish-public.yml) on every commit to `main`. All source code is copied as-is; credentials, live server IDs, and stored user data are excluded or replaced with placeholders. See [`.env.example`](./.env.example) and [`config.js`](./config.js) for what a real deployment supplies.

## What it does

- **Leveling & leaderboards** — XP, virtual currency ("sapphires"), and message-count tracking, rendered as paginated leaderboard images via `canvas`.
- **Community tooling** — reaction-role assignment, welcome flows, scheduled reminders, temp roles, and a "game of the week" trigger-response system.
- **Mini-games** — an elimination-style Hunger Games simulation, rock-paper-scissors, pictionary and other games.
- **Admin tooling** — permission-gated commands for economy management.
- **Historical backfill** — a standalone crawler that reconstructed all-time message counts from ~18 million messages of channel history, running safely alongside the live bot.

## A few decisions worth reading

**Idempotent by construction.** The historical crawler (`crawl/`) processes ~18M messages and has to survive crashes without double-counting. Instead of `$inc`-ing a running per-user tally, each fetched page is stored as its own document keyed by its cursor — replaying a page overwrites the same document, so a crash mid-run is a no-op on resume instead of silent corruption.

**Reaction roles, safe against redelivery.** Discord can redeliver the same reaction event, and removals sent while the bot is offline don't fire at all. `utils/roleReactManager.js` serializes each role's add/remove sequence through a per-instance lock, reserves the role in the database before granting it in Discord (so a crash mid-grant leaves a recoverable record instead of a silent duplicate), and reconciles the full reactor list against Discord on every restart.

**A Node timer gotcha, handled.** `setTimeout` silently fires immediately past ~24.8 days, a 32-bit overflow in its internals. Temp-role expiry (`utils/tempRoleManager.js`) caps each scheduled timer at 20 days and re-chains the remainder, with a periodic sweep as a correctness net rather than trusting the timer alone.

**Schema doing the work.** A partial unique index enforces "at most one active stats period" without a compound key; a TTL index expires sapphire audit logs after a week with no cron job; monthly message counts live in a separate, never-reset collection specifically so they survive a `/lbweekly` reset that wipes the weekly one.

**One renderer, every leaderboard.** `utils/leaderboardCanvas.js` takes normalized rows and a layout spec and has no idea what a "sapphire" or a "level" is — every board is the same function with a different spec. Badge widths are measured once per page so differing number lengths don't shift alignment row to row.

## Stack

| | |
|---|---|
| Runtime | Node.js |
| Discord | discord.js v14, `@discordjs/rest` (used directly, bypassing the client, for the crawler) |
| Database | MongoDB via Mongoose |
| Images | `@napi-rs/canvas` / `canvas`, `sharp`, Cloudinary |
| Payments | Stripe |
| Hosting | [Cybrancee](https://cybrancee.com/) (Pterodactyl panel) |
| CI | GitHub Actions (sanitization + sync to this mirror) |

## Structure

```
commands/   slash command implementations (~45)
events/     Discord gateway event handlers
models/     Mongoose schemas
database/   legacy data-access helpers
crawl/      historical message crawler (see above)
payments/   Stripe integration
utils/      shared helpers (rendering, pagination, leveling, stats)
scripts/    one-off migration/maintenance scripts
```

## Running it locally

1. `npm install`
2. Copy `.env.example` to `.env` and fill in a Discord bot token, MongoDB connection string, Cloudinary URL, and Stripe keys.
3. Fill in guild/channel IDs in `config.js`.
4. `node deploy-commands.js` to register slash commands, then `node index.js` to start the bot.
