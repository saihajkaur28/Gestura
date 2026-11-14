(function (root) {
  class WebsiteAdapter {
    get id() {
      return "base";
    }

    matches(_location) {
      return false;
    }

    detect() {
      return {
        adapterId: this.id,
        site: "unknown",
        videoId: null,
        hasVideo: false,
        captionAvailability: "unknown",
      };
    }

    start() {}

    stop() {}

    seekTo(_seconds) {}

    getPlayback() {
      return { currentTime: 0, paused: true, duration: 0 };
    }
  }

  root.GesturaWebsiteAdapter = WebsiteAdapter;
  if (typeof module !== "undefined" && module.exports) {
    module.exports = { WebsiteAdapter };
  }
})(typeof globalThis !== "undefined" ? globalThis : this);
