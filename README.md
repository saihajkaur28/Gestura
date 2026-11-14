# GESTURA — Real-Time ISL Hand Tracking & Recognition

A bidirectional Indian Sign Language (ISL) communication platform.

> **Honest scope:** Gestura performs real 21-point hand tracking in the browser
> and includes a genuine trainable ISL sequence-recognition pipeline. A trained
> model and a real ISL dataset are **not** bundled. Until you collect data and
> train a model, the recognition panel reports **“Model unavailable”** and never
> invents a sign, confidence, or accuracy figure. ISL signs vary by region;
> the proposed vocabulary must be verified with Deaf ISL instructors before it
> is treated as authoritative.

---

## What is implemented

### Fully implemented (no dataset required)

- Browser webcam capture (`navigator.mediaDevices.getUserMedia`), 1280×720 where
  available, with permission/error handling, tab-visibility pausing, camera
  disconnection handling, and track cleanup on unmount.
- MediaPipe Tasks Vision `HandLandmarker` in `VIDEO` mode, GPU delegate with CPU
  fallback, up to 4 candidate hands (2 rendered/recognised at a time).
- 21 landmarks per hand with x/y/z, handedness, temporal smoothing, and
  missing-landmark safety.
- Glowing cyan skeletal HUD, palm fill, fingertip rings, palm-centre styling,
  depth-based node sizing, mirrored video/canvas alignment.
- NEAR / MEDIUM / FAR detection modes, foreground-hand prioritisation by
  apparent size, multi-track association, hysteresis, and stable two-hand
  selection.
- `handFeatureExtractor.ts`: wrist-relative, palm-scale-normalised landmarks,
  finger extension, joint angles, pinch distance, palm/wrist orientation,
  inter-wrist distance, velocity, and relative depth.
- Fixed-length temporal sequence buffer with timestamp-aware resampling.
- Prediction stabilisation: confidence threshold, consecutive-vote confirmation,
  duplicate prevention, mismatch release, hand-loss release, cooldown, and
  unknown rejection.
- Recognition UI inside Sign → Text: current sign, real confidence, live
  sentence, status states, start/pause, clear, repeat last, speech toggle,
  camera status.
- Browser Web Speech API output for newly committed signs only
  (English / `en-IN`).
- Dataset collection UI using the same camera and MediaPipe pipeline: label
  selection, signer/session metadata, validation, duration progress, JSONL export.
- Backend recognition API with an honest availability status, feature-version
  validation, and a lazy PyTorch model loader.
- Training/evaluation script with signer/session-grouped splits, confusion
  matrix, per-class precision/recall/F1, and real held-out metrics written to
  disk.
- Existing Text → Sign video retrieval is unchanged.

### Requires a real dataset and model training

- Actual ISL sign recognition and live text output.
- Model confidence values (only displayed when a real model responds).
- Reported accuracy, precision, recall, F1, and confusion matrix (only real
  values produced by `train_isl.py`; none are pre-filled in this repository).

### Experimental / needs validation

- The initial label list in `frontend/src/lib/islLabels.ts` is marked
  `proposed`. Signs such as YES/NO/HELP/WATER/DOCTOR/HOSPITAL/DEAF and some
  two-handed forms differ across regions and must be verified before recording
  large datasets.
- The LSTM is a baseline temporal classifier. It handles static and moving signs
  as sequences, but is not a full ISL grammar/translation system.
- Text → Sign remains clip retrieval, not sign synthesis.

---

## Recognition pipeline

```
Webcam (1280×720)
  → MediaPipe HandLandmarker (VIDEO, GPU→CPU fallback)
  → HandTracker (foreground prioritisation, up to 2 active hands)
  → HandFeatureExtractor (wrist-relative, palm-scale-normalised, 130-float/frame)
  → GestureSequenceBuffer (rolling window, timestamp resampling to 32 frames)
  → POST /api/recognition/predict (compact feature sequence, not video)
  → PyTorch LSTM (trained model, state dict + metadata)
  → softmax + confidence threshold + UNKNOWN rejection
  → PredictionStabilizer (vote, confirm, cooldown, release)
  → committed sign → sentence builder + optional speech
  → live UI (skeleton remains visible throughout)
```

The browser sends only compact landmark-derived vectors. Webcam frames are
never uploaded. Inference is scheduled independently of the render loop, and
requests cannot overlap.

### Feature contract

- `FEATURE_VERSION = 1` (must match `backend/app/recognition/features.py`).
- 2 hand slots × (21 landmarks × xyz + handedness sign + presence) = **130 floats
  per frame**.
- Coordinates are wrist-relative and divided by wrist→middle-MCP distance.
- Hands are ordered Left, Right, Unknown (ties by apparent size).
- 32-frame fixed sequence with linear time resampling.

Changing the feature layout requires bumping the version and retraining.

---

## Repository layout

```
backend/
  app/
    main.py                  health, signs/media, recognition status/predict
    config.py                env: VIDEOS_DIR, MODELS_DIR, CORS
    recognition/
      features.py            shared 130-float feature + resampling spec
      architecture.py        PyTorch LSTM definition
      service.py             lazy model registry + inference
      schema.py              request/response models
  training/
    train_isl.py             grouped split, training, evaluation, artefacts
  requirements.txt           base API dependencies
  requirements-ml.txt        optional numpy + torch for training/inference
  models/isl/current/        generated model.pt, metadata.json, metrics (gitignored)
  data/                      collected/exported datasets (gitignored)

frontend/
  src/
    hooks/useHandTrackingCamera.ts   shared camera + MediaPipe loop
    lib/
      mediapipe.ts                   HandLandmarker creation (GPU→CPU)
      handTracking.ts                ranges, tracks, foreground selection
      drawLandmarks.ts               skeletal HUD renderer
      handFeatureExtractor.ts        geometric features + model vector
      gestureSequenceBuffer.ts       temporal buffer + resampling
      predictionStabilizer.ts        confirmation/cooldown/release
      islRecognitionEngine.ts        orchestration + backend inference
      islLabels.ts                   proposed vocabulary metadata
      datasetRecorder.ts             recording, validation, JSONL export
      speech.ts                      Web Speech output
    components/
      RecognitionPanel.tsx
      DatasetCollectorPanel.tsx
    pages/
      SignToText.tsx                 camera, tracking, recognition, collector
      TextToSign.tsx                 unchanged video retrieval
  public/models, public/mediapipe     generated MediaPipe assets (gitignored)

videos/                     private ISL clips (gitignored)
```

---

## Running the project

### Prerequisites

- Node.js 20+ / npm
- Python 3.12
- Webcam and a Chromium/Firefox-based browser
- Optional for ML: PyTorch + NumPy (`backend/requirements-ml.txt`)

### 1. Backend (base API)

```powershell
python -m venv backend\.venv
backend\.venv\Scripts\python.exe -m pip install -r backend\requirements.txt
Copy-Item backend\.env.example backend\.env
backend\.venv\Scripts\python.exe backend\run.py
```

The API listens on `http://127.0.0.1:8000`; docs at `/docs`.

```powershell
Invoke-RestMethod http://127.0.0.1:8000/health
Invoke-RestMethod http://127.0.0.1:8000/api/recognition/status
```

Without ML dependencies/model, `/health` reports `recognition_available: false`
and `/api/recognition/predict` returns HTTP 503 with an explicit reason.

### 2. Frontend

```powershell
Set-Location frontend
npm install
Copy-Item .env.example .env.local
npm run dev
```

Open `http://localhost:5173`. `predev` restores generated MediaPipe assets.

### 3. Build / lint

```powershell
Set-Location frontend
npm run build
npm run lint
```

---

## Collecting ISL data

1. Start the backend and frontend, open **Sign → Text**, and start the camera.
2. In **Dataset collection**, choose a sign label, signer ID, session ID,
   dominant hand, and duration.
3. Use a distinct **signer ID per person** and a new **session ID** for each
   recording sitting. This is required for leakage-safe splits.
4. Press **Record sign**, perform the sign once, and keep hands visible for the
   full duration. Validate the summary after recording.
5. Repeat with variation in speed, distance, angle, lighting, hand size,
   dominant hand, and signer.
6. Use **Unknown / neutral** occasionally to provide negative examples.
7. Press **Export JSONL** and move the file somewhere local, e.g.
   `backend\data\isl_sequences.jsonl`.

The export contains raw 21-point landmark frames only — no video or audio.
For a useful model, collect multiple signers and sessions. A tiny
single-signer dataset cannot produce trustworthy evaluation.

---

## Training / retraining

Install the optional ML dependencies first:

```powershell
backend\.venv\Scripts\python.exe -m pip install -r backend\requirements-ml.txt
```

Train (grouped split by signer, falling back to session):

```powershell
backend\.venv\Scripts\python.exe backend\training\train_isl.py `
  --data backend\data\isl_sequences.jsonl `
  --out backend\models\isl\current
```

Optional flags: `--epochs`, `--hidden-size`, `--num-layers`, `--batch-size`,
`--unknown-threshold`, `--allow-random-split` (experiments only; warns about
leakage).

The trainer writes:

- `model.pt` — PyTorch state dict
- `metadata.json` — version, labels, architecture, normalisation, threshold
- `metrics.json` — held-out accuracy, macro/weighted precision/recall/F1,
  per-class metrics, rejection rate, accepted accuracy
- `confusion_matrix.json`
- `labels.json`

The backend hot-reloads artefacts when their mtimes change; restart it if
needed. Only metrics actually printed/written by this run are real.

To retrain: export new data, rerun the command. Keep `FEATURE_VERSION` in sync
if the feature layout changes.

---

## API reference (recognition)

`GET /api/recognition/status`

```json
{
  "available": false,
  "code": "model-missing",
  "reason": "No trained ISL model is installed...",
  "featureVersion": 1,
  "sequenceLength": 32,
  "labels": []
}
```

When a genuine model is installed, `available` becomes `true` and includes
`modelVersion`, `trainedAt`, and real training metrics from `metadata.json`.

`POST /api/recognition/predict`

```json
{ "featureVersion": 1, "frames": [[0.0, "... 130 floats"], "... 32 frames"] }
```

Success response:

```json
{
  "label": "HELLO",
  "confidence": 0.94,
  "unknown": false,
  "topK": [{ "label": "HELLO", "confidence": 0.94 }],
  "modelVersion": "isl-lstm-..."
}
```

Missing model/ML runtime → HTTP 503. Invalid feature version/frame size → 422.

---

## Testing checklist used

- Frontend `npm run build` succeeds (TypeScript + Vite).
- `npm run lint` succeeds (two advisory `set-state-in-effect` warnings remain;
  both are deliberate synchronisation with external camera/recorder state).
- Backend modules compile; `/health` and `/api/recognition/status` return
  honest availability; `/api/recognition/predict` returns 503 without ML deps.
- The existing MediaPipe asset setup and video catalogue still work.
- Text → Sign code was not modified.

Webcam/MediaPipe behaviour must be verified in a browser with a camera. This
environment cannot access a webcam, so camera FPS, skeleton alignment, and
live recognition are **not** claimed as measured here.

---

## Known limitations

- No dataset or trained model is bundled, so genuine sign recognition is not
  active out of the box.
- Recognition is model-limited to whatever labels/signers are in the dataset;
  it is not full ISL translation.
- Proposed ISL labels need verification with Deaf ISL instructors.
- The collector keeps recordings in memory until export; reloading the page
  discards unexported samples.
- The LSTM uses landmark geometry only (no face, body, or non-manual features),
  which limits signs that depend on facial expression or torso movement.
- MediaPipe z is relative depth, not metric distance.
- Background hands are prioritised by apparent size/tracking stability, not by
  identity recognition; a very large background hand can still win.
- Text → Sign only plays clips present in `videos/`.
- Accuracy/FPS are not fabricated; run training and browser measurement to get
  real numbers.
