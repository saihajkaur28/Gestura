(function (root) {
  const Base = root.GesturaWebsiteAdapter;
  const Captions = root.GesturaCaptions;
  const youtubeVideoId = root.GesturaYoutubeVideoId;

  class YouTubeAdapter extends Base {
    constructor(callbacks) {
      super();
      this.callbacks = callbacks || {};
      this.video = null;
      this.observer = null;
      this.segments = [];
      this.trackLanguage = "und";
      this.destroyed = false;
      this._boundCue = () => this._ingestTextTracks();
      this._boundTime = () => this._emitPlayback();
      this._boundNav = () => this._onNavigate();
    }

    get id() {
      return "youtube";
    }

    matches(loc) {
      const host = (loc && loc.hostname) || "";
      return host === "www.youtube.com" || host === "m.youtube.com" || host === "youtube.com";
    }

    detect() {
      const videoId = youtubeVideoId(location.href);
      this.video = document.querySelector("video.html5-main-video, video");
      const tracks = this.video && this.video.textTracks ? this.video.textTracks.length : 0;
      const rendered = document.querySelector(".ytp-caption-segment, .caption-window");
      let captionAvailability = "unavailable";
      if (tracks > 0 || rendered) captionAvailability = "available";
      else if (videoId) captionAvailability = "unknown";

      return {
        adapterId: this.id,
        site: "youtube",
        videoId,
        hasVideo: Boolean(this.video),
        captionAvailability,
        language: this.trackLanguage,
      };
    }

    start() {
      this.destroyed = false;
      this._attachVideo();
      this._observeRenderedCaptions();
      document.addEventListener("yt-navigate-finish", this._boundNav);
      window.addEventListener("yt-page-data-updated", this._boundNav);
    }

    stop() {
      this.destroyed = true;
      this._detachVideo();
      if (this.observer) {
        this.observer.disconnect();
        this.observer = null;
      }
      document.removeEventListener("yt-navigate-finish", this._boundNav);
      window.removeEventListener("yt-page-data-updated", this._boundNav);
    }

    seekTo(seconds) {
      if (this.video && Number.isFinite(seconds)) this.video.currentTime = seconds;
    }

    getPlayback() {
      if (!this.video) return { currentTime: 0, paused: true, duration: 0 };
      return {
        currentTime: this.video.currentTime || 0,
        paused: Boolean(this.video.paused),
        duration: Number.isFinite(this.video.duration) ? this.video.duration : 0,
      };
    }

    _onNavigate() {
      this.segments = [];
      this.trackLanguage = "und";
      this._detachVideo();
      this._attachVideo();
      this._publishContext();
      this._publishCaptions();
    }

    _attachVideo() {
      this.video = document.querySelector("video.html5-main-video, video");
      if (!this.video) return;
      this.video.addEventListener("timeupdate", this._boundTime);
      this.video.addEventListener("seeked", this._boundTime);
      this.video.addEventListener("play", this._boundTime);
      this.video.addEventListener("pause", this._boundTime);
      this.video.addEventListener("loadedmetadata", this._boundCue);
      if (this.video.textTracks) {
        this.video.textTracks.addEventListener("addtrack", this._boundCue);
        this.video.textTracks.addEventListener("change", this._boundCue);
        for (const track of this.video.textTracks) {
          try {
            track.mode = track.mode === "disabled" ? "hidden" : track.mode;
          } catch (_err) {
            /* some tracks are read-only */
          }
          track.addEventListener("cuechange", this._boundCue);
        }
      }
      this._ingestTextTracks();
    }

    _detachVideo() {
      if (!this.video) return;
      this.video.removeEventListener("timeupdate", this._boundTime);
      this.video.removeEventListener("seeked", this._boundTime);
      this.video.removeEventListener("play", this._boundTime);
      this.video.removeEventListener("pause", this._boundTime);
      this.video.removeEventListener("loadedmetadata", this._boundCue);
      this.video = null;
    }

    _ingestTextTracks() {
      if (!this.video || !this.video.textTracks) return;
      const incoming = [];
      for (const track of this.video.textTracks) {
        if (track.kind && track.kind !== "captions" && track.kind !== "subtitles") continue;
        if (track.language) this.trackLanguage = track.language;
        const cues = track.cues || [];
        for (let i = 0; i < cues.length; i += 1) {
          const cue = cues[i];
          incoming.push({
            id: "tt:" + (track.language || "und") + ":" + cue.startTime + ":" + cue.endTime,
            text: cue.text,
            startTime: cue.startTime,
            endTime: cue.endTime,
            language: track.language || "und",
            source: "text-track",
          });
        }
      }
      if (!incoming.length) return;
      this.segments = Captions.mergeSegments(this.segments, incoming);
      this._publishCaptions();
    }

    _observeRenderedCaptions() {
      const root = document.body;
      if (!root || this.observer) return;
      this.observer = new MutationObserver(() => {
        if (this.destroyed) return;
        this._captureRenderedCaption();
      });
      this.observer.observe(root, {
        subtree: true,
        childList: true,
        characterData: true,
      });
    }

    _captureRenderedCaption() {
      const nodes = document.querySelectorAll(".ytp-caption-segment");
      if (!nodes.length) return;
      const text = Array.from(nodes)
        .map((n) => n.textContent || "")
        .join(" ")
        .replace(/\s+/g, " ")
        .trim();
      if (!text || !this.video) return;
      const t = this.video.currentTime || 0;
      const last = this.segments[this.segments.length - 1];
      if (last && last.text === text) {
        last.endTime = Math.max(last.endTime, t);
        this._publishCaptions();
        return;
      }
      const segment = Captions.normalizeCaptionSegment({
        text,
        startTime: t,
        endTime: t + 2,
        language: this.trackLanguage,
        source: "rendered-caption",
      });
      this.segments = Captions.mergeSegments(this.segments, [segment]);
      this._publishCaptions();
    }

    _publishContext() {
      if (this.callbacks.onContext) this.callbacks.onContext(this.detect());
    }

    _publishCaptions() {
      const playback = this.getPlayback();
      const availability = this.segments.length ? "available" : this.detect().captionAvailability;
      if (this.callbacks.onCaptions) {
        this.callbacks.onCaptions({
          segments: this.segments,
          activeId: Captions.activeSegmentId(this.segments, playback.currentTime),
          language: this.trackLanguage,
          availability,
        });
      }
    }

    _emitPlayback() {
      if (this.callbacks.onPlayback) this.callbacks.onPlayback(this.getPlayback());
      this._publishCaptions();
    }
  }

  root.GesturaYouTubeAdapter = YouTubeAdapter;
  root.GesturaYoutubeVideoId = youtubeVideoId;
  if (typeof module !== "undefined" && module.exports) {
    module.exports = { YouTubeAdapter, youtubeVideoId };
  }
})(typeof globalThis !== "undefined" ? globalThis : this);
