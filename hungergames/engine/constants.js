// Shared Hunger Games settings. Single-guild bot, so role and bot IDs live here.

// Roles allowed to host (hcom, host, and the staff roles the old commands allowed).
const HOST_ROLE_IDS = ['838429835712921630', '1263547927591387148', '727488490991910933', '676473956236263424', '1388586562245230752', '916706599433809982'];

// Ozzy's real user id ("Add Ozzy" joins as this). /hgsolo and /hgsquad used
// to add Ozzy under a wrong id, so that one is excluded from rankings too.
const OZZY_ID = '1255303549353726032';
const OZZY_IDS = [OZZY_ID, '1253478821974245506'];

const MIN_PLAYERS = 4;
const AUTO_ADVANCE_MIN_SECONDS = 15;
const AUTO_ADVANCE_MAX_SECONDS = 60;
const LOBBY_TIMEOUT_MS = 5 * 60 * 1000;
const STEP_TIMEOUT_MS = 5 * 60 * 1000;

module.exports = {
  HOST_ROLE_IDS, OZZY_ID, OZZY_IDS, MIN_PLAYERS, AUTO_ADVANCE_MIN_SECONDS, AUTO_ADVANCE_MAX_SECONDS, LOBBY_TIMEOUT_MS, STEP_TIMEOUT_MS,
};
