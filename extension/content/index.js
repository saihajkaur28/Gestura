(function () {
  const { TYPES, envelope, isGesturaMessage } = GesturaMessages;

  let adapter = null;
  let latest = {
    context: {
      adapterId: null,
      site: location.hostname,
      videoId: null,
      hasVideo: false,
      captionAvailability: "unknown",
    },
    captions: {
      segments: [],
      activeId: null,
      language: "und",
      availability: "unknown",
    },
    playback: { currentTime: 0, paused: true, duration: 0 },
  };

  function publish(message) {
    chrome.runtime.sendMessage(message).catch(() => {});
  }

  function startAdapter() {
    if (adapter) adapter.stop();
    adapter = null;
    try {
      adapter = GesturaSelectAdapter(location, {
        onContext(context) {
          latest.context = context;
          publish(envelope(TYPES.PAGE_CONTEXT, context));
        },
        onCaptions(captions) {
          latest.captions = captions;
          publish(envelope(TYPES.CAPTIONS_UPDATED, captions));
        },
        onPlayback(playback) {
          latest.playback = playback;
          publish(envelope(TYPES.PLAYBACK, playback));
        },
      });
      if (!adapter) return;
      adapter.start();
      latest.context = adapter.detect();
      publish(envelope(TYPES.PAGE_CONTEXT, latest.context));
    } catch (err) {
      publish(
        envelope(TYPES.ERROR, {
          code: "ADAPTER_START_FAILED",
          message: (err && err.message) ? err.message : "Failed to start the website adapter.",
        })
      );
    }
  }

  chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
    if (!isGesturaMessage(message)) return;
    if (message.type === TYPES.GET_STATE) {
      sendResponse(envelope(TYPES.STATE, latest));
      return true;
    }
    if (message.type === TYPES.SEEK_TO) {
      if (adapter) adapter.seekTo(message.payload.startTime);
      sendResponse({ ok: true });
      return true;
    }
    return undefined;
  });

  GesturaMountFloatingButton();
  startAdapter();

  window.addEventListener("yt-navigate-finish", startAdapter);
})();
