function youtubeVideoId(href) {
  try {
    const url = new URL(href);
    if (url.pathname === "/watch") return url.searchParams.get("v");
    const shorts = url.pathname.match(/^\/shorts\/([A-Za-z0-9_-]{11})/);
    if (shorts) return shorts[1];
    const embed = url.pathname.match(/^\/embed\/([A-Za-z0-9_-]{11})/);
    if (embed) return embed[1];
  } catch (_err) {
    return null;
  }
  return null;
}

globalThis.GesturaYoutubeVideoId = youtubeVideoId;
if (typeof module !== "undefined") module.exports = { youtubeVideoId };
