const test = require("node:test");
const assert = require("node:assert/strict");
const { youtubeVideoId } = require("../extension/shared/youtube-id.js");

test("parses watch, shorts, and embed ids", () => {
  assert.equal(
    youtubeVideoId("https://www.youtube.com/watch?v=dQw4w9WgXcQ"),
    "dQw4w9WgXcQ"
  );
  assert.equal(
    youtubeVideoId("https://www.youtube.com/shorts/abcdefghijk"),
    "abcdefghijk"
  );
  assert.equal(
    youtubeVideoId("https://www.youtube.com/embed/abcdefghijk"),
    "abcdefghijk"
  );
  assert.equal(youtubeVideoId("https://www.youtube.com/feed/subscriptions"), null);
});
