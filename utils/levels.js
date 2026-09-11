/**
 * Single source of truth for the level/XP curve. Previously duplicated
 * byte-for-byte in events/messageCreate.js and commands/user.js — both now
 * consume this instead. The leaderboard canvas renderer's level badge also
 * needs this to compute the progress arc.
 */

const totalXpRequired = [
  0, 100, 255, 475, 770, 1150, 1625, 2205, 2900, 3720, 4675, 5775, 7030, 8450, 10045, 11825, 13800, 15980, 18375, 20995,
  23850, 26950, 30305, 33925, 37820, 42000, 46475, 51255, 56350, 61770, 67525, 73625, 80080, 86890, 94075, 101635, 109580,
  117920, 126665, 135825, 145410, 155430, 165895, 176815, 188200, 200060, 212405, 225245, 238590, 252450, 266835, 281755,
  297220, 313240, 329825, 346985, 364730, 383070, 402015, 421575, 441760, 462580, 484045, 506165, 528950, 552410, 576555,
  601395, 626940, 653200, 680185, 707905, 736370, 765590, 795575, 826335, 857880, 890220, 923365, 957325, 992110, 1027720,
  1064075, 1101265, 1139290, 1178150, 1217845, 1258375, 1299740, 1341940, 1384975, 1428845, 1473550, 1519090, 1565465,
  1612675, 1660720, 1709600, 1759315, 1809865, 1861250, 1913470, 1966525, 2020415, 2075140, 2130700, 2187095, 2244325,
  2302390, 2361290, 2421025, 2481595, 2543000, 2605240, 2668315, 2732225, 2796970, 2862550, 2928965, 2996215, 3064300,
  3133220, 3202975, 3273565, 3344990, 3417250, 3490345, 3564275, 3639040, 3714640, 3791075, 3868345, 3946450, 4025390,
  4105165, 4185775, 4267220, 4349500, 4432615, 4516565, 4601350, 4686970, 4773425, 4860715, 4948840, 5037800, 5127595,
  5218225, 5309690, 5401990, 5495125, 5589095, 5683900, 5779540, 5876015, 5973325, 6071470, 6170450, 6260265, 6360915,
  6462400, 6564720, 6667875, 6771865, 6876690, 6982350, 7088845, 7196175, 7304340, 7413340, 7523175, 7633845, 7745350,
  7857690, 7970865, 8084875, 8199720, 8315400, 8431915, 8549265, 8667450, 8786470, 8906325, 9027015, 9148540, 9270900,
];

// Derives the level implied by a raw XP total. Needed because stored `level`
// fields can go stale (commands/addxp.js adds XP without recomputing level),
// so ranking/display should trust XP + this function over the stored level.
function levelForXp(xp) {
  let level = 0;
  for (let i = 0; i < totalXpRequired.length; i++) {
    if (xp >= totalXpRequired[i]) level = i;
    else break;
  }
  return level;
}

// Returns { level, xpIntoLevel, xpForNextLevel, progress (0-1) } for the
// level badge's progress arc and for /level's display text.
function getLevelProgress(xp) {
  const level = levelForXp(xp);
  const floor = totalXpRequired[level] ?? 0;
  const ceiling = totalXpRequired[level + 1];

  // Max level reached (table exhausted) — show a full ring rather than divide by undefined.
  if (ceiling == null) {
    return { level, xpIntoLevel: xp - floor, xpForNextLevel: null, progress: 1 };
  }

  const progress = ceiling === floor ? 1 : (xp - floor) / (ceiling - floor);
  return { level, xpIntoLevel: xp - floor, xpForNextLevel: ceiling, progress: Math.max(0, Math.min(1, progress)) };
}

module.exports = { totalXpRequired, levelForXp, getLevelProgress };
