// Gestura hand tracking: stable left/right slot assignment + One Euro smoothing.
//
// Rules:
//   - Slots are fixed: 0 = left, 1 = right. Detection order never swaps them.
//   - A hand is assigned to its slot by handedness when reliable; otherwise by
//     temporal proximity to the last known centroid.
//   - Tracks persist briefly through short dropouts so a temporary miss does not
//     reorder hands.
//   - Each landmark coordinate is smoothed with a One Euro filter (jitter
//     reduction without excessive lag).

(function () {
  const NUM_LANDMARKS = 21;
  const COORDS = 3;

  function clamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)); }

  // One Euro filter per scalar channel.
  function oneEuro(minCutoff, beta, dCutoff) {
    let xPrev = null;
    let dxPrev = 0;
    let tPrev = null;
    function alpha(cutoff, dt) {
      const tau = 1 / (2 * Math.PI * cutoff);
      return 1 / (1 + tau / Math.max(dt, 1e-9));
    }
    return function (x, t) {
      if (!Number.isFinite(x)) return x;
      if (tPrev === null) { tPrev = t; xPrev = x; return x; }
      const dt = Math.max(t - tPrev, 1e-9);
      const dx = (x - xPrev) / dt;
      const aD = alpha(dCutoff, dt);
      const dxHat = aD * dx + (1 - aD) * dxPrev;
      const cutoff = minCutoff + beta * Math.abs(dxHat);
      const a = alpha(cutoff, dt);
      const xHat = a * x + (1 - a) * xPrev;
      xPrev = xHat;
      dxPrev = dxHat;
      tPrev = t;
      return xHat;
    };
  }

  function createFilters() {
    const f = [];
    for (let i = 0; i < NUM_LANDMARKS * COORDS; i++) f.push(oneEuro(1.0, 0.007, 1.0));
    return f;
  }

  function centroidOf(landmarks) {
    let sx = 0, sy = 0, n = 0;
    for (const p of landmarks) {
      if (!p || !Number.isFinite(p.x) || !Number.isFinite(p.y)) continue;
      sx += p.x; sy += p.y; n++;
    }
    return n ? { x: sx / n, y: sy / n } : null;
  }

  function dist(a, b) {
    if (!a || !b) return Infinity;
    const dx = a.x - b.x, dy = a.y - b.y;
    return Math.sqrt(dx * dx + dy * dy);
  }

  // Create a tracker with two fixed slots.
  function createHandTracker(opts) {
    opts = opts || {};
    const lostTimeoutMs = opts.lostTimeoutMs != null ? opts.lostTimeoutMs : 500;
    return {
      slots: [null, null], // [{ handedness, landmarks, score, lastSeen, centroid, filters }]
      lostTimeoutMs,
    };
  }

  // Input: array of { landmarks, handedness, score }.
  // Returns array of { slot: 0|1, handedness, landmarks: smoothed, score } sorted by slot.
  function updateTracker(tracker, hands, now) {
    now = Number.isFinite(now) ? now : Date.now();
    const out = [];
    if (!Array.isArray(hands) || !hands.length) {
      // age out stale tracks
      for (let s = 0; s < 2; s++) {
        const tr = tracker.slots[s];
        if (tr && now - tr.lastSeen > tracker.lostTimeoutMs) tracker.slots[s] = null;
      }
      return out;
    }
    const assigned = new Set();
    // 1) handedness-based assignment
    for (const h of hands) {
      const label = String(h.handedness || "").toLowerCase();
      const slot = label === "left" ? 0 : label === "right" ? 1 : -1;
      if (slot >= 0 && !tracker.slots[slot]) {
        tracker.slots[slot] = {
          handedness: slot === 0 ? "Left" : "Right",
          score: h.score,
          lastSeen: now,
          centroid: centroidOf(h.landmarks),
          filters: createFilters(),
          landmarks: h.landmarks.slice(),
        };
        assigned.add(h);
      }
    }
    // 2) proximity-based assignment for unassigned hands (or matching labels)
    for (const h of hands) {
      if (assigned.has(h)) continue;
      const c = centroidOf(h.landmarks);
      // pick nearest free slot, preferring its own handedness if free
      let bestSlot = -1;
      let bestDist = Infinity;
      for (let s = 0; s < 2; s++) {
        if (!tracker.slots[s]) {
          const tr = tracker.slots[s];
          const d = tr ? dist(c, tr.centroid) : (s === 0 ? c.x : 1 - c.x); // mirror heuristic
          if (d < bestDist) { bestDist = d; bestSlot = s; }
        }
      }
      // free slots only (do not steal an active slot)
      const free = [0, 1].filter((s) => !tracker.slots[s]);
      if (free.length) {
        const slot = free[0];
        tracker.slots[slot] = {
          handedness: slot === 0 ? "Left" : "Right",
          score: h.score,
          lastSeen: now,
          centroid: c,
          filters: createFilters(),
          landmarks: h.landmarks.slice(),
        };
        assigned.add(h);
      }
    }
    // update matched slots
    for (const h of hands) {
      const label = String(h.handedness || "").toLowerCase();
      let slot = label === "left" ? 0 : label === "right" ? 1 : -1;
      if (slot < 0) {
        // nearest active slot
        const c = centroidOf(h.landmarks);
        let bd = Infinity;
        for (let s = 0; s < 2; s++) {
          if (!tracker.slots[s]) continue;
          const d = dist(c, tracker.slots[s].centroid);
          if (d < bd) { bd = d; slot = s; }
        }
      }
      if (slot < 0) continue;
      const tr = tracker.slots[slot];
      if (!tr) continue;
      tr.lastSeen = now;
      tr.centroid = centroidOf(h.landmarks);
      tr.score = h.score;
      // smooth landmarks
      const smoothed = [];
      for (let i = 0; i < NUM_LANDMARKS; i++) {
        const lm = h.landmarks[i] || {};
        smoothed.push({
          x: tr.filters[i * 3](lm.x, now),
          y: tr.filters[i * 3 + 1](lm.y, now),
          z: tr.filters[i * 3 + 2](lm.z, now),
        });
      }
      tr.landmarks = smoothed;
      out.push({ slot, handedness: slot === 0 ? "Left" : "Right", landmarks: smoothed, score: h.score });
    }
    // age out stale
    for (let s = 0; s < 2; s++) {
      const tr = tracker.slots[s];
      if (tr && now - tr.lastSeen > tracker.lostTimeoutMs) tracker.slots[s] = null;
    }
    out.sort((a, b) => a.slot - b.slot);
    return out;
  }

  function resetTracker(tracker) {
    tracker.slots = [null, null];
    return tracker;
  }

  const api = {
    NUM_LANDMARKS, COORDS,
    oneEuro, createFilters, centroidOf, createHandTracker, updateTracker, resetTracker,
  };

  if (typeof globalThis !== "undefined") globalThis.GesturaHandTracker = api;
  if (typeof module !== "undefined") module.exports = api;
})();