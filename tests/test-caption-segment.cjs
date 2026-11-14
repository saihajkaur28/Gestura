const test = require("node:test");
const assert = require("node:assert/strict");
const {
  normalizeCaptionSegment,
  mergeSegments,
  activeSegmentId,
} = require("../extension/shared/caption-segment.js");

test("normalizes whitespace, times, and ids", () => {
  const seg = normalizeCaptionSegment({
    text: "  Hello   world ",
    startTime: 1.5,
    endTime: 0.2,
    language: "en",
    source: "text-track",
  });
  assert.equal(seg.text, "Hello world");
  assert.equal(seg.endTime, 1.5);
  assert.equal(seg.language, "en");
  assert.ok(seg.id);
});

test("drops empty text on merge and sorts by start", () => {
  const merged = mergeSegments(
    [{ text: "First", startTime: 3, endTime: 4, language: "en", source: "text-track" }],
    [
      { text: "   ", startTime: 0, endTime: 1, language: "en", source: "text-track" },
      { text: "Zero", startTime: 0, endTime: 1, language: "en", source: "text-track", id: "a" },
    ]
  );
  assert.equal(merged[0].text, "Zero");
  assert.equal(merged.length, 2);
});

test("active segment prefers the covering range", () => {
  const segments = [
    { id: "a", text: "a", startTime: 0, endTime: 2, language: "en", source: "text-track" },
    { id: "b", text: "b", startTime: 2, endTime: 5, language: "en", source: "text-track" },
  ];
  assert.equal(activeSegmentId(segments, 2.2), "b");
  assert.equal(activeSegmentId(segments, 10), "b");
});
