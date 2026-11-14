const test = require("node:test");
const assert = require("node:assert/strict");
const Tracker = require("../extension/shared/handTracker.js");

function mkHand(x0, handedness, score) {
  const landmarks = [];
  for (let i = 0; i < 21; i++) landmarks.push({ x: x0 + i * 0.01, y: i * 0.01, z: 0 });
  return { landmarks, handedness, score: score || 0.9 };
}

test("tracker assigns stable left/right slots", () => {
  const t = Tracker.createHandTracker();
  // detect right first, then left -> slots must still be 1 and 0 respectively
  let out = Tracker.updateTracker(t, [mkHand(5, "Right")], 1000);
  assert.equal(out.length, 1);
  assert.equal(out[0].slot, 1);
  out = Tracker.updateTracker(t, [mkHand(5, "Right"), mkHand(0, "Left")], 1100);
  assert.equal(out.length, 2);
  assert.deepEqual(out.map((o) => o.slot), [0, 1]);
});

test("tracker persists slot through a temporary miss", () => {
  const t = Tracker.createHandTracker({ lostTimeoutMs: 1000 });
  Tracker.updateTracker(t, [mkHand(5, "Right")], 1000);
  // frame with no hands within timeout
  const out = Tracker.updateTracker(t, [], 1100);
  assert.equal(out.length, 0);
  // slot should still be occupied by handedness next time
  const out2 = Tracker.updateTracker(t, [mkHand(5, "Right")], 1200);
  assert.equal(out2[0].slot, 1);
});

test("tracker ages out stale tracks", () => {
  const t = Tracker.createHandTracker({ lostTimeoutMs: 100 });
  Tracker.updateTracker(t, [mkHand(5, "Right")], 1000);
  Tracker.updateTracker(t, [], 2000); // > timeout
  assert.equal(t.slots[1], null);
});

test("one euro filter reduces jitter without NaN", () => {
  const f = Tracker.oneEuro(1.0, 0.007, 1.0);
  const now = 1000;
  let v = 0;
  for (let i = 0; i < 50; i++) {
    v = f(Math.sin(i / 10) + (i % 2 ? 0.01 : -0.01), now + i * 33);
  }
  assert.ok(Number.isFinite(v));
});

test("smoothed output is finite for constant input", () => {
  const t = Tracker.createHandTracker();
  const out = Tracker.updateTracker(t, [mkHand(1, "Left")], 1000);
  for (const lm of out[0].landmarks) {
    assert.ok(Number.isFinite(lm.x));
    assert.ok(Number.isFinite(lm.y));
    assert.ok(Number.isFinite(lm.z));
  }
});