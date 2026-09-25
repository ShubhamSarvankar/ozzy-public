module.exports = {
    Auth: {
        // Same cluster/connection string index.js's mongoose.connect() already
        // uses (process.env.MONGODB_SRV) — no need for a second copy of the secret.
        CLUSTER_AUTH_URL: process.env.MONGODB_SRV,
        DB_NAME: 'SapphireBot',
    },
    // Channels where messages count toward the weekly messages leaderboard
    // (and, later, the historical crawl). Only general chat for now — add
    // more channel IDs here rather than touching events/messageCreate.js.
    trackedChannels: ['YOUR_CHANNEL_ID_HERE'],

    // Historical message crawl (scope.md Phase 3).
    crawl: {
        channelId: 'YOUR_CHANNEL_ID_HERE', // general chat — must match trackedChannels[0]
        progressChannelId: 'YOUR_PROGRESS_CHANNEL_ID_HERE',
        guildId: 'YOUR_GUILD_ID_HERE',
        // Starting pace only — live pacing is read from crawlState.requestsPerSecond
        // (adjustable via /crawl pace without a redeploy, per scope.md §3.5).
        // This value seeds a fresh crawlState doc on first boot only.
        defaultRequestsPerSecond: 2,
        leaseDurationMs: 5 * 60 * 1000, // 5 min
        heartbeatIntervalMs: 60 * 1000, // renew well within the lease
        progressReportIntervalMs: 10 * 60 * 1000, // ~10 min, per scope.md §3.5
        // 18M messages ÷ 100/page, per scope.md's own estimate — used only to
        // show a rough percent-complete in progress reports.
        estimatedTotalPages: 180000,
    },

    // Pictionary game. See pictionary/discord/manager.js.
    pictionary: {
        channelId: 'YOUR_CHANNEL_ID_HERE', // games are always hosted in general chat
        hostRoleId: 'YOUR_HOST_ROLE_ID_HERE',
        ownerId: 'YOUR_OWNER_USER_ID_HERE', // owner-only analytics
        registrationSeconds: 45,
        readySeconds: 15, // time to click "Show my word & Ready" before the turn is skipped
        turnStartBufferSeconds: 10, // fixed reading buffer after reveal, before the turn goes live
        maxClues: 3,
        vetoSeconds: 60,
        autoAdvanceSeconds: 10,
        wordCooldownDays: 7,
    },
};
