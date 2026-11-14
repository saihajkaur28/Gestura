# Gestura

Browser-based accessibility and communication platform. The first verified slice is a Chrome extension that reads **in-page YouTube captions** and shows a synchronized transcript in a side panel.

GenASL (`vendor/genasl`) is a **protected** ASL pipeline copy. Do not edit it in place. Sign-Kit (`vendor/sign-kit`) is an ISL Mixamo animation reference. SignAvatars motion is not vendored (research license required).

## Load the extension

1. Open `chrome://extensions`
2. Enable Developer mode
3. Load unpacked → select the `extension/` folder
4. Open a YouTube watch page that has captions enabled
5. Open the Gestura side panel from the toolbar or the floating **Gestura** button

## Tests

```bash
node --test tests/test-caption-segment.cjs tests/test-messages.cjs tests/test-youtube-id.cjs
```

## Sign-to-Text (ISL recognition)

The extension side panel includes a **Sign to Text** section: camera capture,
MediaPipe hand landmark detection, feature extraction, temporal sequence buffer,
bounded recognition scheduling, prediction stabilization, committed-text output
with pause/resume/clear/undo/speak controls, and a lightweight diagnostics line.

Feature contract (version 1): 130 floats/frame (left slot 63 + right slot 63 +
presence/handedness meta 4), 32-frame sequences, wrist-relative and palm-scale
normalized landmarks, stable left/right slot ordering, One Euro smoothing.

Backend endpoints:
- `GET /v1/recognition/status` — feature contract + model availability
- `POST /v1/recognition/predict` — validated inference request

**Honest status:** no trained ISL model or dataset is bundled. Until a compatible
trained model is supplied at `ISL_MODEL_PATH`, `/predict` returns
`status: "model_unavailable"` and the UI reports that rather than fabricating
signs. Training machinery (`backend/training/train_isl.py`) provides dataset
audit, signer-grouped splits, and evaluation scaffolding; it does not invent data
or metrics.

Details: `GESTURA_IMPLEMENTATION_PLAN.md`.

## Status

Implemented: Manifest V3 shell, messaging, YouTube adapter, transcript UI,
Sign-to-Text pipeline (camera → MediaPipe → features → sequence buffer →
scheduler → stabilizer → committed text), backend recognition endpoints with
honest model-unavailable handling, JS + Python tests.
Not implemented: trained ISL model/dataset, Gemini/Whisper live wiring, GenASL
avatar playback, Braille, Morse.

Details: `GESTURA_IMPLEMENTATION_PLAN.md`.
