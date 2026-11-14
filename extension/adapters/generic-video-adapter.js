(function (root) {
  const Base = root.GesturaWebsiteAdapter;

  class GenericVideoAdapter extends Base {
    constructor(callbacks) {
      super();
      this.callbacks = callbacks || {};
      this.video = null;
      this._onTime = () => this._emitPlayback();
    }

    get id() {
      return "generic-video";
    }

    matches(_location) {
      return Boolean(document.querySelector("video"));
    }

    detect() {
      const video = document.querySelector("video");
      return {
        adapterId: this.id,
        site: location.hostname,
        videoId: null,
        hasVideo: Boolean(video),
        captionAvailability: video && video.textTracks && video.textTracks.length
          ? "possible"
          : "unknown",
      };
    }

    start() {
      this.video = document.querySelector("video");
      if (!this.video) return;
      this.video.addEventListener("timeupdate", this._onTime);
      this.video.addEventListener("seeked", this._onTime);
      this.video.addEventListener("play", this._onTime);
      this.video.addEventListener("pause", this._onTime);
    }

    stop() {
      if (!this.video) return;
      this.video.removeEventListener("timeupdate", this._onTime);
      this.video.removeEventListener("seeked", this._onTime);
      this.video.removeEventListener("play", this._onTime);
      this.video.removeEventListener("pause", this._onTime);
      this.video = null;
    }

    seekTo(seconds) {
      if (this.video && Number.isFinite(seconds)) this.video.currentTime = seconds;
    }

    getPlayback() {
      if (!this.video) return { currentTime: 0, paused: true, duration: 0 };
      return {
        currentTime: this.video.currentTime || 0,
        paused: this.video.paused,
        duration: this.video.duration || 0,
      };
    }

    _emitPlayback() {
      if (this.callbacks.onPlayback) this.callbacks.onPlayback(this.getPlayback());
    }
  }

  root.GesturaGenericVideoAdapter = GenericVideoAdapter;
})(typeof globalThis !== "undefined" ? globalThis : this);
