(function (root) {
  function selectAdapter(locationLike, callbacks) {
    const loc = locationLike || (typeof location !== "undefined" ? location : {});
    const YT = root.GesturaYouTubeAdapter;
    const Generic = root.GesturaGenericVideoAdapter;
    if (YT) {
      const youtube = new YT(callbacks);
      if (youtube.matches(loc)) return youtube;
    }
    if (Generic) return new Generic(callbacks);
    return null;
  }

  root.GesturaSelectAdapter = selectAdapter;
  if (typeof module !== "undefined" && module.exports) {
    module.exports = { selectAdapter };
  }
})(typeof globalThis !== "undefined" ? globalThis : this);
