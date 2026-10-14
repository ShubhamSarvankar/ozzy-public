// Pure rolling-window counter. record(now) adds a timestamp, drops anything
// at or before (now - windowMs) and reports whether the count is strictly
// above the threshold. Lives entirely in memory: losing it on restart costs
// at most one window's worth of counts, which is harmless for a seasonal gag.

function createRollingWindow({ windowMs, threshold }) {
  if (!Number.isFinite(windowMs) || windowMs <= 0) throw new Error('windowMs must be a positive number');
  if (!Number.isFinite(threshold) || threshold < 0) throw new Error('threshold must be a non-negative number');

  let stamps = [];

  function prune(now) {
    const cutoff = now - windowMs;
    // Timestamps arrive in order, so drop from the front until one is inside.
    let i = 0;
    while (i < stamps.length && stamps[i] <= cutoff) i++;
    if (i > 0) stamps = stamps.slice(i);
  }

  return {
    record(now) {
      prune(now);
      stamps.push(now);
      return { count: stamps.length, triggered: stamps.length > threshold };
    },
    size() {
      return stamps.length;
    },
    reset() {
      stamps = [];
    },
  };
}

module.exports = { createRollingWindow };
