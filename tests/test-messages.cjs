const test = require("node:test");
const assert = require("node:assert/strict");
const { TYPES, envelope, isGesturaMessage } = require("../extension/shared/messages.js");

test("envelope rejects unknown types", () => {
  assert.throws(() => envelope("not-gestura", {}));
});

test("envelope tags known caption updates", () => {
  const msg = envelope(TYPES.CAPTIONS_UPDATED, { segments: [] });
  assert.equal(msg.type, "GESTURA/CAPTIONS_UPDATED");
  assert.equal(isGesturaMessage(msg), true);
  assert.equal(isGesturaMessage({ type: "OTHER" }), false);
});

test("error envelopes round-trip with code and message", () => {
  const msg = envelope(TYPES.ERROR, { code: "ADAPTER_START_FAILED", message: "boom" });
  assert.equal(msg.type, "GESTURA/ERROR");
  assert.equal(msg.payload.code, "ADAPTER_START_FAILED");
  assert.equal(msg.payload.message, "boom");
});
