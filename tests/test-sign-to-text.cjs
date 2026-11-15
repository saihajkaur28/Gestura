const test = require("node:test");
const assert = require("node:assert/strict");
const STT = require("../extension/shared/signToText.js");

test("feature contract constants", () => {
  assert.equal(STT.FEATURE_VERSION, 1);
  assert.equal(STT.FRAME_VECTOR_SIZE, 130);
  assert.equal(STT.SEQUENCE_LENGTH, 32);
  assert.equal(STT.LANDMARKS_PER_HAND, 21);
  assert.equal(STT.PER_HAND, 63);
});

test("extractFeatures returns null with no hands", () => {
  assert.equal(STT.extractFeatures([]), null);
  assert.equal(STT.extractFeatures(null), null);
});

test("extractFeatures produces 130-float vector for one hand", () => {
  const landmarks = [];
  for (let i = 0; i < 21; i++) landmarks.push({ x: i * 0.01, y: i * 0.02, z: 0 });
  const hands = [{ landmarks, handedness: "Right", score: 0.9 }];
  const f = STT.extractFeatures(hands);
  assert.ok(Array.isArray(f));
  assert.equal(f.length, 130);
  // right slot present, left slot zero
  assert.equal(f[126], 0); // leftPresent
  assert.equal(f[127], 1); // rightPresent
  // wrist-relative: landmark 0 (wrist) becomes origin -> zeros for first 3
  assert.equal(f[63], 0);
  assert.equal(f[64], 0);
  assert.equal(f[65], 0);
});

test("extractFeatures rejects NaN/Infinity landmarks", () => {
  const landmarks = [];
  for (let i = 0; i < 21; i++) landmarks.push({ x: NaN, y: 0, z: 0 });
  const f = STT.extractFeatures([{ landmarks, handedness: "Left", score: 1 }]);
  // normalizeHand returns null (NaN wrist) -> no usable hand -> null
  assert.equal(f, null);
});

test("extractFeatures stable hand slot ordering", () => {
  const mk = (off) => {
    const l = [];
    for (let i = 0; i < 21; i++) l.push({ x: off + i * 0.01, y: i * 0.02, z: 0 });
    return l;
  };
  // detect right first then left; slots must still be left/right
  const hands = [
    { landmarks: mk(5), handedness: "Right", score: 0.8 },
    { landmarks: mk(0), handedness: "Left", score: 0.9 },
  ];
  const f = STT.extractFeatures(hands);
  assert.equal(f[126], 1); // leftPresent
  assert.equal(f[127], 1); // rightPresent
});

test("sequence buffer push/get/isReady", () => {
  const b = STT.createBuffer(4);
  assert.equal(STT.isReady(b), false);
  const frame = new Array(130).fill(0.5);
  for (let i = 0; i < 4; i++) STT.pushFrame(b, frame, 1000 + i * 33);
  assert.equal(STT.isReady(b), true);
  const seq = STT.getSequence(b);
  assert.equal(seq.length, 4);
  assert.equal(seq[0].length, 130);
});

test("sequence buffer rejects wrong size", () => {
  const b = STT.createBuffer(4);
  STT.pushFrame(b, [1, 2, 3], 1);
  assert.equal(b.frames.length, 0);
});

test("sequence buffer dedupes identical stale frames", () => {
  const b = STT.createBuffer(4);
  const frame = new Array(130).fill(0.5);
  STT.pushFrame(b, frame, 1000);
  STT.pushFrame(b, frame, 1002); // <5ms, identical -> refresh only
  assert.equal(b.frames.length, 1);
});

test("stabilizer commits after confirm votes", () => {
  const st = STT.createStabilizer({ confirmVotes: 2, confidenceThreshold: 0.5, cooldownMs: 0 });
  let r = STT.stabilize(st, "A", 0.9, true, 1000);
  assert.equal(r.type, "candidate");
  r = STT.stabilize(st, "A", 0.9, true, 1033);
  assert.equal(r.type, "committed");
  assert.equal(r.label, "A");
});

test("stabilizer rejects low confidence", () => {
  const st = STT.createStabilizer({ confidenceThreshold: 0.8 });
  const r = STT.stabilize(st, "A", 0.3, true, 1000);
  assert.equal(r.type, "uncertain");
});

test("stabilizer releases on hand loss", () => {
  const st = STT.createStabilizer();
  const r = STT.stabilize(st, "A", 0.9, false, 1000);
  assert.equal(r.type, "released");
});

test("stabilizer prevents duplicate within cooldown", () => {
  const st = STT.createStabilizer({ confirmVotes: 1, cooldownMs: 0 });
  let r = STT.stabilize(st, "A", 0.9, true, 1000);
  assert.equal(r.type, "committed");
  st.cooldownMs = 5000;
  r = STT.stabilize(st, "A", 0.9, true, 1100);
  assert.equal(r.type, "duplicate");
});

test("diagnostics stats", () => {
  const d = STT.createDiagnostics();
  STT.recordDiag(d, 10);
  STT.recordDiag(d, 20);
  const s = STT.diagStats(d);
  assert.equal(s.count, 2);
  assert.equal(s.avg, 15);
});