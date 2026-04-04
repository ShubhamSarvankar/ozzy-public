# Ozzy — Discord Community Bot

A full-featured Discord bot built for large community servers, handling everything from engagement tracking and rank progression to custom minigames and automated moderation tooling. Written in Node.js using discord.js v14, with a MongoDB backend.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Runtime | Node.js |
| Discord Library | discord.js v14 (slash commands, interactions, embeds) |
| Database | MongoDB via Mongoose |
| Image Processing | `@napi-rs/canvas`, Sharp |
| Media CDN | Cloudinary |
| Utilities | math.js, nanoid, dotenv |

---

## Features

### 💎 Economy System
A server-wide virtual currency ("Sapphires") with full admin controls and persistent user balances stored in MongoDB. Staff can add, subtract, and audit balances through a permission-gated `/admin` command suite.

### 🏆 Rank Progression
An automated promotion pipeline (`promotionHelper.js`) that evaluates a member's Sapphire balance against a tiered rank table (18 ranks, from *Amateur Helper* to *Commodore*) and assigns Discord roles automatically on balance check. Role assignments respect staff/visitor/ally exemption lists.

### 📈 XP & Leveling
Message-based XP accumulation with a 1-minute per-user cooldown, a 170-level progression curve with hand-tuned XP thresholds, level-up announcements, and a Top 10 level leaderboard. Data is guild-scoped so the system can run across multiple servers.

### 🎮 Minigames
- **Hunger Games** — a multi-round elimination game with a large cast of named, server-specific characters, each with unique event logic. Supports bracket simulation with randomized outcomes and Discord embed narration.
- **Rock Paper Scissors** — interactive button-based PvP with a role-based handicap system (configurable "visitor" disadvantage) and an optional always-win override for testing.
- **Attack** — slash command that fires a randomized GIF at a target user, pulling media from a Cloudinary manifest that can be keyed per target user ID with a general fallback pool.

### 🎟️ Stamp Book
A collectible achievement/stamp system rendered as a custom image using `@napi-rs/canvas` with three registered fonts (Loyola, Burbank, Raleway). Stamps are organized into categories, persisted per user in MongoDB, and displayed as a paginated, button-navigated embed.

### 📋 Reaction Utilities
- Parse a message URL and extract the full list of users who reacted, returned as either a formatted embed or plain text.
- Send event-attendance notifications that mention all reactors in a target channel.

### ⏰ Reminders
Set persistent, repeating reminders by interval (in minutes) targeting any channel by ID. Each reminder is assigned a nanoid for cancellation via `/removerReminder`.

### 🖼️ User Profiles
User profile cards with avatar compositing (Sharp for image processing), custom "About Me" text, and personal quotes — rendered as image attachments.

### 📊 Leaderboards
- Sapphire leaderboard (Top 10, sorted by currency balance)
- Level leaderboard (Top 10, sorted by level then XP)
- Weekly Sapphire leaderboard for time-bounded engagement tracking

### 🛠️ Admin Tooling
- Bulk-add Sapphires to a user list (parsed from text)
- Weekly balance updates independent of main balance
- Staff-only role gating via `PermissionFlagsBits`
- Mee6 level import script for migrating existing server leveling data

---

## Project Structure

```
├── index.js                  # Entry point — client setup, event/command loading, DB connect
├── base.js                   # Shared client, utility functions (randint, shuffle, time_convertor)
├── startup.js                # Deploy-then-start orchestration script
├── deploy-commands.js        # Registers slash commands with the Discord API
├── userProfile.js            # In-memory profile state helper
│
├── commands/                 # One file per slash command
├── events/                   # Discord event handlers (messageCreate, interactionCreate, etc.)
├── models/                   # Mongoose schemas (profile, level, stamp, reminder, score, weeklyProfile)
├── utils/                    # Shared helpers (promotionHelper, getMemberColor, userListParser, updateAvatar)
├── payments/                 # Stripe/payment session scaffolding
└── scripts/                  # One-off data migration scripts
```

---

## Architecture Notes

- **Event-driven command loading** — commands and events are dynamically loaded from their respective directories at startup; no manual registration in the main file.
- **Mongoose data layer** — all persistent state (balances, levels, stamps, reminders) lives in MongoDB. Schemas are defined separately from business logic.
- **Cooldown management** — XP gain uses an in-memory `Map`-based cooldown to prevent spam without a DB round-trip on every message.
- **Cloudinary CDN integration** — attack GIF assets are stored in Cloudinary and resolved at runtime from a local JSON manifest, keeping media out of the repo.
- **Canvas-rendered images** — stamp books and profile cards are generated server-side as PNG attachments using `@napi-rs/canvas` with custom font registration.

---

## Setup

1. Clone the repository
2. Install dependencies: `npm install`
3. Copy `.env.example` to `.env` and fill in:
   ```
   DISCORD_TOKEN=
   DISCORD_CLIENT_ID=
   DISCORD_GUILD_ID=
   MONGODB_SRV=
   CLOUDINARY_URL=
   ```
4. Deploy slash commands and start the bot:
   ```bash
   node startup.js
   ```
   Or separately:
   ```bash
   node deploy-commands.js
   node index.js
   ```

---

> This repository is a public, stripped-down version of the bot. 
