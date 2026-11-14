const test = require("node:test");
const assert = require("node:assert/strict");
const { TYPES, isGesturaMessage } = require("../extension/shared/messages.js");
const { interpretCaptions, DEFAULT_BASE_URL } = require("../extension/shared/backend.js");

test("exposes the interpret captions message type", () => {
  assert.equal(TYPES.INTERPRET_CAPTIONS, "GESTURA/INTERPRET_CAPTIONS");
  assert.equal(isGesturaMessage({ type: TYPES.INTERPRET_CAPTIONS, payload: {} }), true);
});

test("backend client exposes interpretCaptions and default base url", () => {
  assert.equal(typeof interpretCaptions, "function");
  assert.equal(DEFAULT_BASE_URL, "http://127.0.0.1:8000");
});
