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
    interpret: document.getElementById("interpret"),
    interpretation: document.getElementById("interpretation"),
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

  async function runInterpretation() {
    try {
      const response = await GesturaBackend.interpretCaptions(segments, { source: "youtube-caption" });
      if (!response.ok) {
        els.status.textContent = "Caption interpretation failed: " + response.error;
        return;
      }
      const result = response.result || {};
      const interpretation = result.interpretation || {};
      const summary = typeof interpretation.summary === "string" ? interpretation.summary : "";
      const bullets = Array.isArray(interpretation.bullets) ? interpretation.bullets.join(" ") : "";
      els.interpretation.innerHTML =
        "<p>" + (summary || result.transcript || "No interpretation produced.") + "</p>" +
        (bullets ? "<p>" + bullets + "</p>" : "") +
        "<p><small>" + (result.disclaimer || "AI-generated language output.") + "</small></p>";
      els.status.textContent = "Caption interpretation returned from Gestura backend.";
    } catch (err) {
      els.status.textContent = "Caption interpretation failed: " + ((err && err.message) || "unknown error");
    }
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

  if (els.interpret) {
    els.interpret.addEventListener("click", () => {
      runInterpretation();
    });
  }

  // ---- Sign to Text wiring ----
  const s2t = {
    video: document.getElementById("s2t-video"),
    canvas: document.getElementById("s2t-canvas"),
    state: document.getElementById("s2t-state"),
    candidate: document.getElementById("s2t-candidate"),
    committed: document.getElementById("s2t-committed"),
    diag: document.getElementById("s2t-diag"),
    startBtn: document.getElementById("s2t-start"),
    pauseBtn: document.getElementById("s2t-pause"),
    resumeBtn: document.getElementById("s2t-resume"),
    stopBtn: document.getElementById("s2t-stop"),
    clearBtn: document.getElementById("s2t-clear"),
    undoBtn: document.getElementById("s2t-undo"),
    speakBtn: document.getElementById("s2t-speak"),
  };
  let speakEnabled = false;
  function speak(text) {
    if (!speakEnabled || !text || !window.speechSynthesis) return;
    try { window.speechSynthesis.cancel(); const u = new SpeechSynthesisUtterance(text); u.rate = 1; window.speechSynthesis.speak(u); } catch (_e) {}
  }
  let s2tEngine = null;
  let s2tCommittedText = "";

  function s2tSetState(text) { if (s2t.state) s2t.state.textContent = text; }
  function s2tSetCandidate(text) { if (s2t.candidate) s2t.candidate.textContent = text || "—"; }
  function s2tSetCommitted(text) { if (s2t.committed) s2t.committed.textContent = text || "—"; }
  function s2tSetDiag(text) { if (s2t.diag) s2t.diag.textContent = text; }

  async function s2tStart() {
    if (!window.GesturaSignToText) { s2tSetState("Sign-to-Text module not loaded."); return; }
    const STT = window.GesturaSignToText;
    if (s2tEngine) { s2tSetState("Already running."); return; }
    s2tSetState("Loading MediaPipe...");
    try {
      await STT.initMediaPipe();
    } catch (e) {
      s2tSetState("MediaPipe unavailable: " + (e && e.message ? e.message : e));
      s2tSetDiag("Install MediaPipe Tasks Vision (vendor/mediapipe) or allow CDN in manifest CSP.");
      return;
    }
    try {
      await STT.startCamera(s2t.video);
    } catch (e) {
      s2tSetState("Camera error: " + (e && e.message ? e.message : e));
      return;
    }
    s2tEngine = STT.createEngine({
      backendBaseUrl: (window.GesturaBackend && window.GesturaBackend.baseUrl) || "http://127.0.0.1:8000",
    });
    s2tEngine.onResultSetter((r) => {
      if (r.type === "committed") {
        s2tCommittedText = (s2tCommittedText + " " + r.label).trim();
        s2tSetCommitted(s2tCommittedText);
        s2tSetCandidate(r.label);
      } else if (r.type === "candidate") {
        s2tSetCandidate(r.label + " (" + (r.votes || 1) + " votes)");
      } else if (r.type === "uncertain") {
        s2tSetCandidate((r.label || "uncertain") + " ?");
      } else if (r.type === "released") {
        s2tSetCandidate("—");
      }
    });
    s2tEngine.onStatusSetter((t) => s2tSetState(t));
    s2tSetState("Running");
    // draw loop
    const ctx = s2t.canvas.getContext("2d");
    function draw() {
      if (!s2tEngine) return;
      const v = s2t.video;
      if (v && v.videoWidth) {
        s2t.canvas.width = v.videoWidth;
        s2t.canvas.height = v.videoHeight;
        ctx.drawImage(v, 0, 0, v.videoWidth, v.videoHeight);
      }
      requestAnimationFrame(draw);
    }
    draw();
    s2tEngine.start(s2t.video, () => {});
    // diagnostics loop
    setInterval(() => {
      if (!s2tEngine) return;
      const d = s2tEngine.getDiagnostics();
      s2tSetDiag(
        "buf " + d.bufferSize + "/" + d.capacity +
        " | detect p95 " + d.detect.p95.toFixed(1) + "ms" +
        " | infer p95 " + d.infer.p95.toFixed(1) + "ms"
      );
    }, 1000);
  }

  function s2tStop() {
    if (s2tEngine) {
      s2tEngine.stop();
      s2tEngine.stopCamera(s2t.video);
      s2tEngine = null;
    }
    s2tSetState("Stopped");
  }

  function s2tClear() {
    s2tCommittedText = "";
    if (s2tEngine) s2tEngine.resetStabilizer(s2tEngine.stabilizer);
    s2tSetCommitted("—");
    s2tSetCandidate("—");
  }

  function s2tPause() { if (s2tEngine) { s2tEngine.pause(); s2tSetState("Paused"); } }
  function s2tResume() { if (s2tEngine) { s2tEngine.resume(); s2tSetState("Running"); } }
  function s2tUndo() {
    const parts = s2tCommittedText.split(" ").filter(Boolean);
    parts.pop();
    s2tCommittedText = parts.join(" ");
    s2tSetCommitted(s2tCommittedText || "—");
    speak(s2tCommittedText);
  }
  function s2tToggleSpeak() {
    speakEnabled = !speakEnabled;
    if (!speakEnabled && window.speechSynthesis) try { window.speechSynthesis.cancel(); } catch (_e) {}
    if (s2t.speakBtn) {
      s2t.speakBtn.textContent = "Speak: " + (speakEnabled ? "on" : "off");
      s2t.speakBtn.setAttribute("aria-pressed", speakEnabled ? "true" : "false");
    }
  }

  if (s2t.startBtn) s2t.startBtn.addEventListener("click", s2tStart);
  if (s2t.pauseBtn) s2t.pauseBtn.addEventListener("click", s2tPause);
  if (s2t.resumeBtn) s2t.resumeBtn.addEventListener("click", s2tResume);
  if (s2t.stopBtn) s2t.stopBtn.addEventListener("click", s2tStop);
  if (s2t.clearBtn) s2t.clearBtn.addEventListener("click", s2tClear);
  if (s2t.undoBtn) s2t.undoBtn.addEventListener("click", s2tUndo);
  if (s2t.speakBtn) s2t.speakBtn.addEventListener("click", s2tToggleSpeak);

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
