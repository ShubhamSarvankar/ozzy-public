// utils/promotionHelper.js
const promotions = {
  '791927926312534016': { roleName: 'Amateur Helper', balanceRequired: 500 },
  '791927926177792060': { roleName: 'Professional Helper', balanceRequired: 1000 },
  '791927926097444874': { roleName: 'Elite Helper', balanceRequired: 1500 },
  '791927923874725929': { roleName: 'Supreme Helper', balanceRequired: 2000 },
  '791927923212288001': { roleName: 'Specialist', balanceRequired: 2500 },
  '791924690578964501': { roleName: 'Novice Corporal', balanceRequired: 3200 },
  '791925065666134026': { roleName: 'Corporal', balanceRequired: 3900 },
  '791925753993494538': { roleName: 'Sergeant', balanceRequired: 4600 },
  '791926819511205919': { roleName: 'Sergeant Major', balanceRequired: 5300 },
  '791925067025219595': { roleName: 'Commando Brigade', balanceRequired: 6000 },
  '791926790712852480': { roleName: 'Blue Berets', balanceRequired: 6900 },
  '791927394361016320': { roleName: 'Second Lieutenant', balanceRequired: 7800 },
  '791926493503553580': { roleName: 'First Lieutenant', balanceRequired: 8700 },
  '791926225332862977': { roleName: 'Captain', balanceRequired: 9600 },
  '869542277134057472': { roleName: 'Major', balanceRequired: 10200 },
  '791925012751450112': { roleName: 'Lieutenant Colonel', balanceRequired: 11100 },
  '791924831184355328': { roleName: 'Colonel', balanceRequired: 12000 },
  '810220832043434044': { roleName: 'Commodore', balanceRequired: 13000 },
};

// promotions are blocked for these roles 
const ignoreRoles = [
  '727488490991910933', // Staff
  '962792171541524520', // Cabinet Secretaries
  '916706599433809982',  // Trustees
  `653261692867837971`, //Visitors
  `653262638721138698` //Allies
];

// Extra-role groups
const rookieRole = '795590012774383656';
const rookiesTier = new Set([
  '791924690578964501', // Novice Corporal
  '791925065666134026', // Corporal
  '791925753993494538', // Sergeant
  '791926819511205919', // Sergeant Major
  '791925067025219595'  // Commando Brigade
]);

const cwsRole = '791927922377752618';
const cwsTier = new Set([
  '791926790712852480', // Blue Berets
  '791927394361016320', // Second Lieutenant
  '791926493503553580', // First Lieutenant
  '791926225332862977', // Captain
  '869542277134057472', // Major
  '791925012751450112', // Lieutenant Colonel
  '791924831184355328', // Colonel
  '810220832043434044'  // Commodore
]);

function findNewPromotion(roleCache, totalSapphires) {
  const promoArray = Object.entries(promotions).map(
    ([roleId, { roleName, balanceRequired }], idx) =>
      ({ roleId, roleName, balanceRequired, idx })
  );

  // highest‐idx role they already have
  const maxHad = promoArray
    .filter(p => roleCache.has(p.roleId))
    .reduce((mx, p) => Math.max(mx, p.idx), -1);

  // tiers above maxHad they now qualify for
  const newly = promoArray
    .filter(p => totalSapphires >= p.balanceRequired && p.idx > maxHad);

  if (!newly.length) return null;
  return newly.reduce((best, cur) => cur.idx > best.idx ? cur : best);
}

/**
 * Promote a GuildMember if they’ve just crossed a new tier,
 * unless they hold any of the “ignore” roles.
 * @param {GuildMember} member 
 * @param {number} totalSapphires 
 * @returns {Promise<{ roleId: string, roleName: string }|null>}
 */
async function promoteMember(member, totalSapphires) {
  // if member has any ignored roles, skip promotion
  if (ignoreRoles.some(rid => member.roles.cache.has(rid))) {
    return null;
  }

  const topTier = findNewPromotion(member.roles.cache, totalSapphires);
  if (!topTier) return null;

  // remove any old promo roles
  const oldRoleIds = Object.keys(promotions)
    .filter(roleId => member.roles.cache.has(roleId));
  if (oldRoleIds.length) {
    await member.roles.remove(oldRoleIds);
  }

  // assign the new highest tier
  await member.roles.add(topTier.roleId);

  // ensure extra roles are assigned if needed
  if (rookiesTier.has(topTier.roleId) && !member.roles.cache.has(rookieRole)) {
    await member.roles.add(rookieRole);
  }
  if (cwsTier.has(topTier.roleId) && !member.roles.cache.has(cwsRole)) {
    await member.roles.add(cwsRole);
  }

  return { roleId: topTier.roleId, roleName: topTier.roleName };
}

module.exports = { promotions, findNewPromotion, promoteMember };