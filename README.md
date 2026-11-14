# OUTLOUD — Bidirectional Indian Sign Language Communication Platform

OUTLOUD is an AI-powered, bidirectional Indian Sign Language (ISL) communication platform.

> **Honest scope:** this repository is under active, phase-by-phase development. It does **not**
> perform full ISL translation. Recognition is limited to a small, genuinely trained vocabulary
> once it is implemented, and only pre-recorded ISL clips that the project owner provides are used
> for Text → Sign. No ASL data is used as a substitute, and no predictions or accuracy figures are
> fabricated.

## Current status — Phase 1

Phase 1 delivers the application foundation only:

- React + Vite + TypeScript frontend with dashboard and navigation.
- Python + FastAPI backend with a health endpoint and an ISL clip catalogue.
- Real browser-side webcam access.
- Real MediaPipe Hands landmark detection with live landmark visualisation.
- Text → Sign **video retrieval loader** (plays only clips that exist on disk).
- Environment configuration for local development.
- Git repository with local commits (no remote push).

**Not implemented yet (by design):** sign classification, ISL → text recognition, sign synthesis,
training pipelines, deployment, and any accuracy claims. The UI states this explicitly.

## Architecture

```
Browser
  ├─ React + Vite + TypeScript
  ├─ Webcam (getUserMedia)
  └─ MediaPipe Tasks Vision (HandLandmarker)  ← landmark extraction only
        │  (landmark sequences will be sent to the API in a later phase)
        ▼
FastAPI backend
  ├─ /health               service status + video catalogue status
  ├─ /api/signs            scans VIDEOS_DIR, returns available signs
  └─ /media/{sign}/{file}  serves a clip found by the scan (path-traversal safe)
```

Inference is planned as **browser landmarks → Python classification** (approved architecture).
Phase 1 stops at landmark extraction; there is no classifier and no output sign.

## Repository layout

```
backend/            FastAPI application (Python 3.12)
  app/config.py     environment-driven configuration
  app/main.py       routes
  run.py            local dev entry point
frontend/           React + Vite + TypeScript application
  public/models/    generated: MediaPipe hand_landmarker.task (not committed)
  public/mediapipe/ generated: MediaPipe wasm runtime (not committed)
  scripts/          fetch/copy the generated MediaPipe assets
  src/              application source
videos/             ISL recordings (not committed; provided separately)
```

## Prerequisites

- Node.js 20+ (developed with Node 24) and npm
- Python 3.12
- A webcam and a Chromium/Firefox-based browser
- Git

## Local development

### 1. Backend

```powershell
python -m venv backend\.venv
backend\.venv\Scripts\python.exe -m pip install -r backend\requirements.txt
Copy-Item backend\.env.example backend\.env
backend\.venv\Scripts\python.exe backend\run.py
```

The API listens on `http://127.0.0.1:8000` by default. Interactive docs: `http://127.0.0.1:8000/docs`.

Check it:

```powershell
Invoke-RestMethod http://127.0.0.1:8000/health
Invoke-RestMethod http://127.0.0.1:8000/api/signs
```

### 2. Frontend

```powershell
Set-Location frontend
npm install
Copy-Item .env.example .env.local
npm run dev
```

Open `http://localhost:5173`. `predev` automatically restores the MediaPipe assets
(see below) before Vite starts.

### 3. Build / lint

```powershell
Set-Location frontend
npm run build
npm run lint
```

## Environment configuration

| File | Variable | Purpose | Default |
| --- | --- | --- | --- |
| `backend/.env` | `APP_NAME`, `APP_VERSION` | Service identity | `OUTLOUD API`, `0.1.0` |
| `backend/.env` | `HOST`, `PORT` | Bind address for `run.py` | `127.0.0.1`, `8000` |
| `backend/.env` | `CORS_ORIGINS` | Comma-separated allowed origins | localhost:5173 |
| `backend/.env` | `VIDEOS_DIR` | Folder containing one folder per sign | `<repo>/videos` |
| `frontend/.env.local` | `VITE_API_BASE_URL` | Backend base URL | `http://localhost:8000` |

Real `.env` files are git-ignored. Only `.env.example` files are committed.

## MediaPipe assets (storage strategy)

Two large, reproducible assets are **generated, not committed**:

- `frontend/public/models/hand_landmarker.task` — the official Google MediaPipe hand landmark
  model, downloaded from the public `storage.googleapis.com` URL.
- `frontend/public/mediapipe/wasm/` — the MediaPipe wasm runtime copied from the installed
  `@mediapipe/tasks-vision` npm package.

`npm run setup:mediapipe` restores both; it runs automatically via `predev`/`prebuild`. This keeps
the repository small and avoids stale binaries while preserving offline runtime. For a production
deployment these files are produced during the frontend build step.

## ISL recordings (storage strategy)

`videos/` is intentionally not committed: the recordings are private/large assets supplied by the
project owner. The backend reads them at runtime from `VIDEOS_DIR`. For a hosted deployment, point
`VIDEOS_DIR` at a mounted volume or private storage location containing the same folder layout.
See `videos/README.md` for the expected structure. Missing signs are reported as unavailable —
never replaced with a different sign or fabricated clip.

## Phase-by-phase development

Development follows explicit phase approval. Phase 1 is complete pending review; no later phase
starts without the project owner's instruction.

## Known limitations (Phase 1)

- No sign recognition/classification and therefore no ISL → text output.
- Text → Sign is retrieval of available clips only; it is not grammatical ISL translation.
- Multi-word phrases are matched greedily against available sign labels.
- Clip playback is only exercised once real ISL videos are provided.
- No deployment configuration yet.
