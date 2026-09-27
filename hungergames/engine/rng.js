// Injectable random source so game logic can be replayed deterministically in
// tests. Everything in hungergames/engine/ draws from random() here instead of
// Math.random(); tests wrap a run in withRandom(seeded(n), fn).

let source = Math.random;

function random() {
  return source();
}

function randInt(n) {
  return Math.floor(random() * n);
}

function pick(arr) {
  return arr[randInt(arr.length)];
}

function chance(p) {
  return random() < p;
}

function shuffle(arr) {
  const out = [...arr];
  for (let i = out.length - 1; i > 0; i--) {
    const j = randInt(i + 1);
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

// mulberry32: small, fast, good enough for game dice.
function seeded(seed) {
  let a = seed >>> 0;
  return function next() {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function withRandom(src, fn) {
  const prev = source;
  source = src;
  try {
    return fn();
  } finally {
    source = prev;
  }
}

module.exports = { random, randInt, pick, chance, shuffle, seeded, withRandom };
