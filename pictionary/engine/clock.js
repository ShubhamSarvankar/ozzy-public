// Injectable clock so game-flow logic can be driven by fake time in tests
// instead of real setTimeout/Date.now. The discord adapter uses realClock();
// tests construct a fakeClock() and advance it explicitly.

function realClock() {
  return {
    now: () => Date.now(),
    setTimeout: (fn, ms) => setTimeout(fn, ms),
    clearTimeout: (handle) => clearTimeout(handle),
  };
}

/**
 * A fake clock for tests. `advance(ms)` moves time forward and synchronously
 * fires any timers whose deadline has passed, in deadline order (earliest
 * first; ties fire in schedule order). Nested scheduling during a fire (a
 * timer that itself schedules another) is supported: the loop keeps
 * checking for newly-due timers until none remain within the advanced window.
 */
function fakeClock(start = 0) {
  let now = start;
  let nextId = 1;
  const timers = new Map(); // id -> { at, fn }

  function runDue(limit) {
    for (;;) {
      let dueId = null;
      let dueAt = Infinity;
      for (const [id, t] of timers) {
        if (t.at <= limit && t.at < dueAt) { dueAt = t.at; dueId = id; }
      }
      if (dueId === null) return;
      const t = timers.get(dueId);
      timers.delete(dueId);
      now = t.at;
      t.fn();
    }
  }

  return {
    now: () => now,
    setTimeout: (fn, ms) => {
      const id = nextId++;
      timers.set(id, { at: now + Math.max(0, ms), fn });
      return id;
    },
    clearTimeout: (handle) => { timers.delete(handle); },
    advance(ms) {
      const limit = now + ms;
      runDue(limit);
      now = Math.max(now, limit);
    },
    pendingCount: () => timers.size,
  };
}

module.exports = { realClock, fakeClock };
