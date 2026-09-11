# Ozzy

A Discord bot built with [discord.js](https://discord.js.org/) v14, covering leveling/leaderboards, community engagement features, mini-games, and lightweight Stripe-backed payments.

> This is a sanitized, auto-synced mirror of a private production repository. It's kept up to date automatically on every push to the private repo; server-specific configuration, credentials, and live user data are stripped out before publishing. See [`.env.example`](./.env.example) and [`config.example.js`](./config.example.js) for what a deployment needs to supply.

## What it does

- **Leveling & leaderboards** — XP tracking, weekly/all-time leaderboards, and a virtual currency ("sapphires") earned through server activity, backed by MongoDB.
- **Historical message crawling** — a rate-limited, resumable crawler (`crawl/`) that backfills leaderboard/analytics data from a channel's full message history, with live-adjustable pacing and periodic progress reports.
- **Mini-games** — rock-paper-scissors, a Hunger-Games-style elimination game, an 8-ball, and a few other one-off commands for server fun.
- **Community/engagement tools** — reaction-role assignment, welcome messages, reminders, "game of the week" recognition posts, and profile/stat cards rendered as images via `canvas`.
- **Payments** — a fun Stripe-backed "pay off the national debt" novelty command.
- **Admin tooling** — role/permission-gated commands for backups, data repopulation, and server maintenance.

## Stack

- **Runtime:** Node.js
- **Discord:** discord.js v14, `@discordjs/builders` / `@discordjs/rest` for slash commands
- **Database:** MongoDB via Mongoose
- **Payments:** Stripe
- **Media:** Cloudinary, `canvas` / `@napi-rs/canvas` / `sharp` for generated images (leaderboards, profile cards)

## Running it locally

1. `npm install`
2. Copy `.env.example` to `.env` and fill in your own Discord bot token, MongoDB connection string, Cloudinary URL, and Stripe keys.
3. Copy `config.example.js` to `config.js` and fill in your own guild/channel IDs.
4. `node deploy-commands.js` to register slash commands, then `node index.js` to start the bot.

## Structure

```
commands/   slash command implementations
events/     Discord gateway event handlers
models/     Mongoose schemas
database/   data-access helpers
crawl/      historical message crawler
payments/   Stripe integration
utils/      shared helpers
scripts/    one-off migration/maintenance scripts
```
