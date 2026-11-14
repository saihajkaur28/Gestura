(function () {
  const { TYPES, envelope, isGesturaMessage } = GesturaMessages;
  const Captions = GesturaCaptions;

  const els = {
    status: document.getElementById("status"),
    site: document.getElementById("site"),
    language: document.getElementById("language"),
    source: document.getElementById("source"),
    time: document.getElementById("time"),
    current: document.getElementById("current-text"),
    count: document.getElementById("count"),
    transcript: document.getElementById("transcript"),
  };

  let segments = [];
  let activeId = null;

  function formatTime(seconds) {
    const s = Math.max(0, Math.floor(Number(seconds) || 0));
    const m = Math.floor(s / 60);
    const r = s % 60;
    return m + ":" + String(r).padStart(2, "0");
  }

  function renderTranscript() {
    els.count.textContent = segments.length + " segment" + (segments.length === 1 ? "" : "s");
    els.transcript.replaceChildren();
    for (const seg of segments) {
      const item = document.createElement("li");
      item.tabIndex = 0;
      item.dataset.id = seg.id;
      item.setAttribute("role", "button");
      if (seg.id === activeId) item.setAttribute("aria-current", "true");
      item.innerHTML =
        "<time>" +
        formatTime(seg.startTime) +
        "</time><span>" +
        escapeHtml(seg.text) +
        "</span>";
      item.addEventListener("click", () => seek(seg.startTime));
      item.addEventListener("keydown", (event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          seek(seg.startTime);
        }
      });
      els.transcript.appendChild(item);
    }
    const current = segments.find((s) => s.id === activeId);
    els.current.textContent = current ? current.text : segments.length ? "—" : "No caption yet.";
    els.source.textContent = current ? current.source : segments[0] ? segments[0].source : "—";
  }

  function escapeHtml(text) {
    return String(text)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");
  }

  async function seek(startTime) {
    const [tab] = await chrome.tabs.query({ active: true, lastFocusedWindow: true });
    if (!tab || tab.id == null) return;
    try {
      await chrome.tabs.sendMessage(tab.id, envelope(TYPES.SEEK_TO, { startTime }));
    } catch (_err) {
      els.status.textContent = "Could not send a seek request to the page.";
    }
  }

  function applyCaptions(payload) {
    segments = payload.segments || [];
    activeId = payload.activeId || Captions.activeSegmentId(segments, 0);
    els.language.textContent = payload.language || "und";
    if (payload.availability === "unavailable") {
      els.status.textContent = "No captions detected on this video.";
    } else if (!segments.length) {
      els.status.textContent = "Captions not collected yet. Play the video with captions on.";
    } else {
      els.status.textContent = "Captions synchronized from the page.";
    }
    renderTranscript();
  }

  function applyContext(payload) {
    els.site.textContent = payload.site || "—";
    if (!payload.hasVideo) {
      els.status.textContent = "Open a YouTube video to capture captions.";
    }
  }

  function applyPlayback(payload) {
    els.time.textContent = formatTime(payload.currentTime);
    activeId = Captions.activeSegmentId(segments, payload.currentTime);
    for (const item of els.transcript.children) {
      if (item.dataset.id === activeId) item.setAttribute("aria-current", "true");
      else item.removeAttribute("aria-current");
    }
    const current = segments.find((s) => s.id === activeId);
    if (current) els.current.textContent = current.text;
  }

  chrome.runtime.onMessage.addListener((message) => {
    if (!isGesturaMessage(message)) return;
    if (message.type === TYPES.PAGE_CONTEXT) applyContext(message.payload);
    if (message.type === TYPES.CAPTIONS_UPDATED) applyCaptions(message.payload);
    if (message.type === TYPES.PLAYBACK) applyPlayback(message.payload);
    if (message.type === TYPES.ERROR) {
      const detail = message.payload && message.payload.message ? message.payload.message : "unknown error";
      els.status.textContent = "Gestura error: " + detail;
    }
  });

  async function hydrateFromTab() {
    const [tab] = await chrome.tabs.query({ active: true, lastFocusedWindow: true });
    if (!tab || tab.id == null) return;
    try {
      const response = await chrome.tabs.sendMessage(tab.id, envelope(TYPES.GET_STATE));
      if (!response || !response.payload) return;
      if (response.payload.context) applyContext(response.payload.context);
      if (response.payload.captions) applyCaptions(response.payload.captions);
      if (response.payload.playback) applyPlayback(response.payload.playback);
    } catch (_err) {
      els.status.textContent = "Reload the YouTube tab after loading Gestura.";
    }
  }

  hydrateFromTab();
})();
