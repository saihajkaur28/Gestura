// Gestura Sign-to-Text pipeline (browser + Node-testable pure logic).
//
// Feature contract (FEATURE_VERSION 1):
//   FRAME_VECTOR_SIZE = 130 floats per frame
//   SEQUENCE_LENGTH    = 32 frames
//   Hands: left slot then right slot (stable ordering; never swap on detection order)
//   Per hand: 21 landmarks * 3 (x,y,z) wrist-relative, palm-scale normalized = 63
//   Meta (4): leftPresent, rightPresent, leftScore, rightScore
//   Total = 2*63 + 4 = 130
//
// MediaPipe is loaded from a CDN at runtime (see initMediaPipe). If it cannot be
// loaded, landmark detection is unavailable and the UI reports that honestly.

(function () {
  const FEATURE_VERSION = 1;
  const FRAME_VECTOR_SIZE = 130;
  const SEQUENCE_LENGTH = 32;
  const LANDMARKS_PER_HAND = 21;
  const COORDS = 3;
  const PER_HAND = LANDMARKS_PER_HAND * COORDS; // 63

  // ---------- Pure helpers ----------

  function clamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)); }

  function isFiniteNumber(v) { return typeof v === "number" && Number.isFinite(v); }

  function safeLandmark(lm) {
    if (!lm || !isFiniteNumber(lm.x) || !isFiniteNumber(lm.y)) return null;
    return { x: lm.x, y: lm.y, z: isFiniteNumber(lm.z) ? lm.z : 0 };
  }

  // Normalize one hand's 21 landmarks: wrist-relative, palm-scale (wrist->middle MCP).
  function normalizeHand(landmarks) {
    if (!Array.isArray(landmarks) || landmarks.length < LANDMARKS_PER_HAND) return null;
    const pts = landmarks.slice(0, LANDMARKS_PER_HAND).map(safeLandmark);
    if (pts.some((p) => p === null)) return null;
    const wrist = pts[0];
    // palm scale = distance wrist (0) -> middle finger MCP (9)
    const mid = pts[9];
    const dx = mid.x - wrist.x, dy = mid.y - wrist.y, dz = mid.z - wrist.z;
    const scale = Math.sqrt(dx * dx + dy * dy + dz * dz);
    if (!isFiniteNumber(scale) || scale < 1e-6) return null;
    const out = new Array(PER_HAND);
    for (let i = 0; i < LANDMARKS_PER_HAND; i++) {
      out[i * 3] = (pts[i].x - wrist.x) / scale;
      out[i * 3 + 1] = (pts[i].y - wrist.y) / scale;
      out[i * 3 + 2] = (pts[i].z - wrist.z) / scale;
    }
    // guard against NaN/Infinity
    for (let i = 0; i < out.length; i++) if (!isFiniteNumber(out[i])) out[i] = 0;
    return out;
  }

  // hands: array of { landmarks, handedness: 'Left'|'Right', score }
  // Returns Float64Array(130) or null if no usable hand.
  function extractFeatures(hands) {
    const left = new Array(PER_HAND).fill(0);
    const right = new Array(PER_HAND).fill(0);
    let leftPresent = 0, rightPresent = 0, leftScore = 0, rightScore = 0;
    let any = false;
    if (Array.isArray(hands)) {
      for (const h of hands) {
        const norm = normalizeHand(h && h.landmarks);
        if (!norm) continue;
        const label = (h.handedness || "").toLowerCase();
        const score = isFiniteNumber(h.score) ? clamp(h.score, 0, 1) : 1;
        if (label === "left") {
          for (let i = 0; i < PER_HAND; i++) left[i] = norm[i];
          leftPresent = 1; leftScore = score; any = true;
        } else if (label === "right") {
          for (let i = 0; i < PER_HAND; i++) right[i] = norm[i];
          rightPresent = 1; rightScore = score; any = true;
        } else {
          // unknown handedness: fill first empty slot
          if (!leftPresent) {
            for (let i = 0; i < PER_HAND; i++) left[i] = norm[i];
            leftPresent = 1; leftScore = score; any = true;
          } else if (!rightPresent) {
            for (let i = 0; i < PER_HAND; i++) right[i] = norm[i];
            rightPresent = 1; rightScore = score; any = true;
          }
        }
      }
    }
    if (!any) return null;
    const out = new Array(FRAME_VECTOR_SIZE);
    for (let i = 0; i < PER_HAND; i++) out[i] = left[i];
    for (let i = 0; i < PER_HAND; i++) out[PER_HAND + i] = right[i];
    out[126] = leftPresent;
    out[127] = rightPresent;
    out[128] = leftScore;
    out[129] = rightScore;
    return out;
  }

  // ---------- Sequence buffer ----------

  function createBuffer(capacity) {
    capacity = capacity || SEQUENCE_LENGTH;
    return { capacity, frames: [] };
  }

  function pushFrame(buffer, features, timestamp) {
    if (!buffer || !Array.isArray(features) || features.length !== FRAME_VECTOR_SIZE) return buffer;
    const ts = isFiniteNumber(timestamp) ? timestamp : Date.now();
    // avoid duplicating an identical stale frame within a tiny window
    const last = buffer.frames[buffer.frames.length - 1];
    if (last && ts - last.timestamp < 5 && arraysEqual(last.features, features)) {
      last.timestamp = ts; // refresh timestamp only
      return buffer;
    }
    buffer.frames.push({ features: features.slice(), timestamp: ts });
    while (buffer.frames.length > buffer.capacity) buffer.frames.shift();
    return buffer;
  }

  function arraysEqual(a, b) {
    if (!a || !b || a.length !== b.length) return false;
    for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) return false;
    return true;
  }

  function isReady(buffer) {
    return !!buffer && buffer.frames.length >= (buffer.capacity || SEQUENCE_LENGTH);
  }

  function getSequence(buffer) {
    if (!buffer) return null;
    const cap = buffer.capacity || SEQUENCE_LENGTH;
    if (buffer.frames.length < cap) return null;
    const seq = [];
    for (let i = 0; i < cap; i++) {
      const f = buffer.frames[buffer.frames.length - cap + i];
      seq.push(f.features.slice());
    }
    return seq;
  }

  function resetBuffer(buffer) {
    if (buffer) buffer.frames = [];
    return buffer;
  }

  // ---------- Prediction stabilizer ----------

  function createStabilizer(opts) {
    opts = opts || {};
    return {
      confidenceThreshold: opts.confidenceThreshold != null ? opts.confidenceThreshold : 0.6,
      confirmVotes: opts.confirmVotes != null ? opts.confirmVotes : 3,
      cooldownMs: opts.cooldownMs != null ? opts.cooldownMs : 900,
      mismatchReset: opts.mismatchReset != null ? opts.mismatchReset : 2,
      candidate: null,
      candidateCount: 0,
      mismatchCount: 0,
      committed: null,
      committedAt: 0,
      lastHandsPresent: true,
    };
  }

  // returns { type: 'committed'|'candidate'|'uncertain'|'released'|'duplicate'|'cooldown', label?, confidence? }
  function stabilize(st, prediction, confidence, handsPresent, now) {
    now = isFiniteNumber(now) ? now : Date.now();
    if (!isFiniteNumber(confidence)) confidence = 0;
    if (!handsPresent) {
      st.candidate = null; st.candidateCount = 0; st.mismatchCount = 0;
      st.lastHandsPresent = false;
      return { type: "released", reason: "no-hands" };
    }
    if (!st.lastHandsPresent) {
      // recovery after hand loss: reset candidate
      st.candidate = null; st.candidateCount = 0; st.mismatchCount = 0;
    }
    st.lastHandsPresent = true;

    if (confidence < st.confidenceThreshold) {
      return { type: "uncertain", label: prediction, confidence };
    }
    if (!prediction) {
      return { type: "uncertain", confidence };
    }

    // duplicate prevention: same as committed within cooldown window
    if (prediction === st.committed && (now - st.committedAt) < st.cooldownMs) {
      return { type: "duplicate", label: prediction, confidence };
    }

    if (st.candidate === prediction) {
      st.candidateCount += 1;
      st.mismatchCount = 0;
      if (st.candidateCount >= st.confirmVotes && (now - st.committedAt) >= st.cooldownMs) {
        st.committed = prediction;
        st.committedAt = now;
        st.candidate = null;
        st.candidateCount = 0;
        return { type: "committed", label: prediction, confidence };
      }
      return { type: "candidate", label: prediction, confidence, votes: st.candidateCount };
    }

    // mismatch
    if (st.candidate !== null) {
      st.mismatchCount += 1;
      if (st.mismatchCount >= st.mismatchReset) {
        st.candidate = prediction;
        st.candidateCount = 1;
        st.mismatchCount = 0;
        if (st.candidateCount >= st.confirmVotes && (now - st.committedAt) >= st.cooldownMs) {
          st.committed = prediction;
          st.committedAt = now;
          st.candidate = null;
          st.candidateCount = 0;
          return { type: "committed", label: prediction, confidence };
        }
        return { type: "candidate", label: prediction, confidence, votes: 1 };
      }
      return { type: "candidate", label: st.candidate, confidence, votes: st.candidateCount };
    }
    st.candidate = prediction;
    st.candidateCount = 1;
    st.mismatchCount = 0;
    if (st.candidateCount >= st.confirmVotes && (now - st.committedAt) >= st.cooldownMs) {
      st.committed = prediction;
      st.committedAt = now;
      st.candidate = null;
      st.candidateCount = 0;
      return { type: "committed", label: prediction, confidence };
    }
    return { type: "candidate", label: prediction, confidence, votes: 1 };
  }

  function resetStabilizer(st) {
    st.candidate = null; st.candidateCount = 0; st.mismatchCount = 0;
    st.committed = null; st.committedAt = 0; st.lastHandsPresent = true;
    return st;
  }

  // ---------- Browser-only: MediaPipe + camera ----------

  let handLandmarker = null;
  let mediaPipeLoading = null;
  let cameraStream = null;
  let rafId = null;
  let lastVideoTime = -1;

  async function initMediaPipe() {
    if (handLandmarker) return handLandmarker;
    if (mediaPipeLoading) return mediaPipeLoading;
    mediaPipeLoading = (async () => {
      // Dynamic import from CDN. Requires CSP allowance in manifest.
      const { HandLandmarker, FilesetResolver } = await import(
        "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14/vision_bundle.mjs"
      );
      const vision = await FilesetResolver.forVisionTasks(
        "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14/wasm"
      );
      handLandmarker = await HandLandmarker.createFromOptions(vision, {
        baseOptions: {
          modelAssetPath:
            "https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task",
          delegate: "GPU",
        },
        runningMode: "VIDEO",
        numHands: 2,
        minHandDetectionConfidence: 0.5,
        minHandPresenceConfidence: 0.5,
        minTrackingConfidence: 0.5,
      });
      return handLandmarker;
    })();
    try {
      return await mediaPipeLoading;
    } catch (err) {
      mediaPipeLoading = null;
      throw err;
    }
  }

  async function startCamera(videoEl) {
    if (cameraStream) return cameraStream;
    const stream = await navigator.mediaDevices.getUserMedia({
      video: { width: { ideal: 640 }, height: { ideal: 480 }, facingMode: "user" },
      audio: false,
    });
    cameraStream = stream;
    if (videoEl) {
      videoEl.srcObject = stream;
      await videoEl.play().catch(() => {});
    }
    return stream;
  }

  function stopCamera(videoEl) {
    if (cameraStream) {
      for (const t of cameraStream.getTracks()) t.stop();
      cameraStream = null;
    }
    if (videoEl) videoEl.srcObject = null;
    if (rafId) { cancelAnimationFrame(rafId); rafId = null; }
    lastVideoTime = -1;
  }

  // Detect hands in a video frame; returns array of { landmarks, handedness, score } or [].
  async function detectHands(videoEl) {
    if (!handLandmarker || !videoEl || videoEl.readyState < 2) return [];
    const now = performance.now();
    if (videoEl.currentTime === lastVideoTime) return null; // same frame, skip
    lastVideoTime = videoEl.currentTime;
    let res;
    try {
      res = handLandmarker.detectForVideo(videoEl, now);
    } catch (e) {
      return [];
    }
    const out = [];
    const landmarks = (res && res.landmarks) || [];
    const handedness = (res && res.handedness) || [];
    for (let i = 0; i < landmarks.length; i++) {
      const lm = landmarks[i];
      const h = (handedness[i] && handedness[i][0]) || {};
      out.push({
        landmarks: lm,
        handedness: h.categoryName || "",
        score: typeof h.score === "number" ? h.score : 1,
      });
    }
    return out;
  }

  // ---------- Diagnostics ----------

  function createDiagnostics() {
    return { samples: [], max: 120 };
  }
  function recordDiag(d, value) {
    if (!d) return;
    d.samples.push(value);
    if (d.samples.length > d.max) d.samples.shift();
  }
  function diagStats(d) {
    if (!d || !d.samples.length) return { count: 0, avg: 0, median: 0, p95: 0 };
    const s = d.samples.slice().sort((a, b) => a - b);
    const n = s.length;
    const avg = s.reduce((a, b) => a + b, 0) / n;
    const median = n % 2 ? s[(n - 1) / 2] : (s[n / 2 - 1] + s[n / 2]) / 2;
    const p95 = s[Math.min(n - 1, Math.floor(n * 0.95))];
    return { count: n, avg, median, p95 };
  }

  // ---------- Engine (orchestrates camera -> features -> buffer -> inference) ----------

  function createEngine(opts) {
    opts = opts || {};
    const backendBaseUrl = opts.backendBaseUrl || "http://127.0.0.1:8000";
    const buffer = createBuffer(SEQUENCE_LENGTH);
    const stabilizer = createStabilizer(opts.stabilizer || {});
    const tracker = (typeof globalThis !== "undefined" && globalThis.GesturaHandTracker)
      ? globalThis.GesturaHandTracker.createHandTracker()
      : null;
    const diag = {
      detect: createDiagnostics(),
      feature: createDiagnostics(),
      infer: createDiagnostics(),
      e2e: createDiagnostics(),
      fps: createDiagnostics(),
    };
    let onResult = opts.onResult || function () {};
    let onStatus = opts.onStatus || function () {};
    let running = false;
    let paused = false;
    let inFlight = null;
    let sequenceId = 0;
    let lastCommitAt = 0;
    const cadenceMs = opts.cadenceMs != null ? opts.cadenceMs : 250;
    let lastRequestAt = 0;

    function markE2E() {
      const now = performance.now();
      if (lastCommitAt) recordDiag(diag.e2e, now - lastCommitAt);
      lastCommitAt = now;
    }

    async function runInference(seq, sid) {
      const t0 = performance.now();
      try {
        const res = await fetch(backendBaseUrl.replace(/\/$/, "") + "/v1/recognition/predict", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ sequence: seq, feature_version: FEATURE_VERSION }),
        });
        const body = await res.json().catch(() => ({}));
        const dt = performance.now() - t0;
        recordDiag(diag.infer, dt);
        if (sid !== sequenceId) return; // stale
        if (!res.ok) {
          onStatus("model: " + (body.detail || body.error || res.status));
          return;
        }
        const label = body.label;
        const conf = typeof body.confidence === "number" ? body.confidence : 0;
        const handsPresent = true;
        const r = stabilize(stabilizer, label, conf, handsPresent, performance.now());
        if (r.type === "committed") {
          markE2E();
          onResult({ type: "committed", label: r.label, confidence: r.confidence });
        } else if (r.type === "candidate") {
          onResult({ type: "candidate", label: r.label, confidence: r.confidence, votes: r.votes });
        } else if (r.type === "uncertain") {
          onResult({ type: "uncertain", label: r.label, confidence: r.confidence });
        }
      } catch (err) {
        onStatus("inference error: " + (err && err.message ? err.message : "unknown"));
      } finally {
        inFlight = null;
      }
    }

    async function tick(videoEl) {
      if (!running || paused) return;
      const frameStart = performance.now();
      recordDiag(diag.fps, frameStart);
      const t0 = performance.now();
      const rawHands = await detectHands(videoEl);
      if (rawHands === null) return; // same video frame, skip
      const dtDetect = performance.now() - t0;
      recordDiag(diag.detect, dtDetect);
      // stable slots + smoothing
      const tracked = tracker
        ? globalThis.GesturaHandTracker.updateTracker(tracker, rawHands, frameStart)
        : (rawHands || []).map((h, i) => ({ slot: i, handedness: h.handedness, landmarks: h.landmarks, score: h.score }));
      const t1 = performance.now();
      const features = extractFeatures(tracked);
      const dtFeat = performance.now() - t1;
      recordDiag(diag.feature, dtFeat);
      const handsPresent = tracked.length > 0;
      if (features) pushFrame(buffer, features, frameStart);
      if (!handsPresent) {
        const r = stabilize(stabilizer, null, 0, false, frameStart);
        if (r.type === "released") onResult({ type: "released" });
      }
      // bounded scheduler: at most one in-flight; cadence-limited
      if (isReady(buffer) && !inFlight && (frameStart - lastRequestAt) >= cadenceMs) {
        lastRequestAt = frameStart;
        const seq = getSequence(buffer);
        if (seq) {
          sequenceId += 1;
          const sid = sequenceId;
          inFlight = runInference(seq, sid);
        }
      }
      onStatus(
        (paused ? "Paused | " : "") +
        (handsPresent ? "tracking " + tracked.length + " hand(s)" : "no hands")
      );
    }

    function start(videoEl, onFrame) {
      running = true;
      paused = false;
      resetBuffer(buffer);
      resetStabilizer(stabilizer);
      if (tracker) globalThis.GesturaHandTracker.resetTracker(tracker);
      const loop = async () => {
        if (!running) return;
        await tick(videoEl);
        rafId = requestAnimationFrame(loop);
      };
      rafId = requestAnimationFrame(loop);
    }

    function stop() {
      running = false;
      if (rafId) { cancelAnimationFrame(rafId); rafId = null; }
      resetBuffer(buffer);
      resetStabilizer(stabilizer);
    }

    function pause() { paused = true; }
    function resume() { paused = false; resetBuffer(buffer); resetStabilizer(stabilizer); }

    function getDiagnostics() {
      const fpsStats = diagStats(diag.fps);
      // convert inter-frame interval stats into FPS estimate
      let fps = 0;
      if (fpsStats.count > 1 && fpsStats.avg > 0) fps = 1000 / fpsStats.avg;
      return {
        detect: diagStats(diag.detect),
        feature: diagStats(diag.feature),
        infer: diagStats(diag.infer),
        e2e: diagStats(diag.e2e),
        fps: Number(fps.toFixed(1)),
        bufferSize: buffer.frames.length,
        capacity: buffer.capacity,
      };
    }

    return {
      FEATURE_VERSION, FRAME_VECTOR_SIZE, SEQUENCE_LENGTH,
      buffer, stabilizer, diag,
      initMediaPipe, startCamera, stopCamera, detectHands,
      extractFeatures, normalizeHand, createBuffer, pushFrame, isReady, getSequence, resetBuffer,
      createStabilizer, stabilize, resetStabilizer, createDiagnostics, recordDiag, diagStats,
      start, stop, pause, resume, getDiagnostics, onResultSetter: (fn) => { onResult = fn; },
      onStatusSetter: (fn) => { onStatus = fn; },
    };
  }

  const api = {
    FEATURE_VERSION, FRAME_VECTOR_SIZE, SEQUENCE_LENGTH, LANDMARKS_PER_HAND, PER_HAND, COORDS,
    clamp, isFiniteNumber, safeLandmark, normalizeHand, extractFeatures,
    createBuffer, pushFrame, arraysEqual, isReady, getSequence, resetBuffer,
    createStabilizer, stabilize, resetStabilizer,
    createDiagnostics, recordDiag, diagStats,
    initMediaPipe, startCamera, stopCamera, detectHands,
    createEngine,
  };

  if (typeof globalThis !== "undefined") globalThis.GesturaSignToText = api;
  if (typeof module !== "undefined") module.exports = api;
})();
