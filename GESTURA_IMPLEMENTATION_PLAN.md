# Gestura implementation plan

**Product:** Gestura — browser-based multimodal accessibility and communication platform  
**Tagline:** Every Gesture Deserves to Be Heard.  
**Audit date:** 2026-11-14  
**Workspace:** `C:\Users\arsh3\OneDrive\Desktop\CURSOR\guestra`  
**Cycle:** inspect → understand → plan → implement → test → debug → verify → document  

This document is the living development plan. Status labels mean:

- **Implemented** — code exists and has a test or a defined manual check
- **Partial** — real code exists but the pipeline or UI is incomplete
- **Planned** — designed, not built
- **Experimental** — must not be described as production-ready
- **Blocked** — needs an external license, dataset, or approval

---

## 1. Product architecture

Gestura is a **new product**. GenASL is a **protected dependency**, not the Gestura app.

```
GESTURA
├── Extension layer (Manifest V3)     ← primary UI
├── Browser integration / adapters    ← YouTube first
├── Input processing                  ← captions, later mic/webcam
├── AI orchestration (FastAPI)        ← Gemini / Whisper (Phase 3)
├── Sign-language engine              ← adapter to GenASL + ISL motion
├── Accessibility engine              ← Braille, Morse, blink (later)
├── Avatar rendering                  ← VRM / Mixamo / SMPL-X tracks
└── Backend / infrastructure
```

**Target layout (Gestura-owned, not a rewrite of GenASL):**

```
guestra/
├── GESTURA_IMPLEMENTATION_PLAN.md
├── README.md
├── extension/                 # Gestura Chrome extension
├── backend/                   # Gestura FastAPI (Phase 3+)
├── accessibility/             # Braille, Morse, blink
├── integrations/              # youtube, meet, gemini, whisper, genasl adapters
├── avatar/                    # Gestura playback, not GenASL internals
├── shared/                    # contracts used by tests + extension
├── tests/
├── vendor/genasl/             # PROTECTED copy of sanaro99/GenASL
└── vendor/sign-kit/           # ISL Mixamo animation reference
```

**Hard product decisions**

1. YouTube is the first website, not the whole product. Every site goes through `WebsiteAdapter`.
2. An avatar is a rigged 3D model + validated motion + timing. A generated still image is not a sign.
3. Features must be testable. UI chrome without logic is not “implemented.”
4. ASL ≠ ISL. Language packs stay separate.
5. LLM output may plan *what* to sign; it may not invent motion when no validated clip exists.

---

## 2. Audit of the existing workspace (Phase 0)

### 2.1 Current directory structure (before Gestura files)

The `guestra` folder was **empty**. It was not a Git repository of its own. Cursor detected Git at `C:\Users\arsh3` (the user home tree). That home repo must not be used for Gestura commits.

After the audit copy:

```
guestra/
├── vendor/genasl/     # clone of https://github.com/sanaro99/GenASL (master)
└── vendor/sign-kit/   # clone of Sign-Kit (main = React client)
```

SignAvatars was **not** cloned. It is a licensed research dataset (SMPL-X / MANO annotations), not a drop-in animation pack.

### 2.2 Technology stack found

| Layer | Stack | Where |
|---|---|---|
| Gestura (this repo, pre-audit) | none | empty workspace |
| GenASL API | Python 3.10+, FastAPI, Uvicorn, Pydantic | `vendor/genasl/src/api/server.py` |
| GenASL AI | Whisper (faster-whisper), librosa, LLM providers (Ollama / Gemini / OpenAI) | `vendor/genasl/src/audio`, `src/llm/providers` |
| GenASL avatar (intended) | Ready Player Me VRM, three.js, `@pixiv/three-vrm` | docs + config; **not in the extension yet** |
| GenASL extension | Manifest V3, popup, YouTube content script | `vendor/genasl/chrome-extension/` |
| Sign-Kit | MERN: React client (main), Node API (api branch) | `vendor/sign-kit/client` |
| Sign-Kit avatar | Mixamo-rigged character; JS functions that push Euler rotations | `client/src/Animations/` |
| SignAvatars | PyTorch visualizer, SMPL-X / MANO `.pkl` | upstream only; access form required |

### 2.3 Current extension functionality (GenASL, not Gestura)

`vendor/genasl/chrome-extension/`:

| File | What it actually does |
|---|---|
| `manifest.json` | MV3, YouTube + `127.0.0.1:8794`, popup, content script, SW |
| `background.js` | `onInstalled` log only |
| `content.js` | On `/watch`, probe `GET /health`; POST `/asl/avatar` **only if `ready: true`** (API currently always `ready: false`) |
| `popup.html` / `popup.js` | Health probe UI |

**Missing vs Gestura:** side panel, floating button, caption extraction, transcript sync, adapter registry, Braille/Morse, camera/mic consent flows, typed message bus.

### 2.4 Current backend functionality (GenASL)

`POST /asl/avatar` is a **stub**: invalid `video_id` → 400; otherwise **503** with `"avatar pipeline not implemented yet"`.

`GET /health` reports `ready: False`.

`InterpreterAvatarPipeline.run()` raises `NotImplementedError` until motion synthesis (their Phase 5).

Stages that **do exist as code** (not wired to the HTTP handler):

- `AudioIngestStage`, `AudioAnalyzeStage` (Whisper / librosa / emotion)
- `SemanticChunkStage`, `InterpreterPlanStage` (LLM plan)
- Avatar helpers: `pose_extractor.py`, `pose_library.py`, `retrieval.py`, `vrm_retarget.py`

README table claims phases 2–3 **Done**. The HTTP surface still documents phases 2–5 as pending. **Trust the API and `pipeline_avatar.run()`, not the README status row.**

### 2.5 Existing AI integrations

| Provider | Status in GenASL | Status in Gestura |
|---|---|---|
| Gemini | LLM provider module + `GEMINI_API_KEY` env | not present |
| OpenAI | provider module | not present |
| Ollama | provider module | not present |
| Whisper | audio ASR module | not present |
| Fake LLM | tests | n/a |

GenASL keys must stay in environment variables. Gestura Phase 3 will add its **own** FastAPI providers so the extension never holds secrets.

### 2.6 Existing avatar implementation

| Source | Motion type | Linguistic coverage | Playback | Usable now? |
|---|---|---|---|---|
| GenASL | Intended: retrieved Deaf-signer clips → VRM timeline (`AvatarRenderPlan` v5.0) | ASL | three.js + VRM **not shipped** (their Phase 6 pending) | **No end-to-end avatar** |
| Sign-Kit | Mixamo bone Euler keyframes in JS | ISL **A–Z** + words HOME, PERSON, TIME, YOU | React three.js character | **Partial lexicon**, fingerspelling-heavy |
| SignAvatars | SMPL-X whole-body + MANO hands, 70K sequences | ASL / HamNoSys / GSL / WLASL-linked | Python `vis.py` / aitviewer | **Blocked on license form**; not browser-ready |

A Mixamo alphabet clip is not an ASL interpreter overlay. SMPL-X research meshes are not a VRM. These tracks stay separate.

### 2.7 GenASL integration status

| Contract | Reality |
|---|---|
| Gestura ↔ GenASL adapter | **Not built** (workspace was empty) |
| `AvatarRenderPlan` v5.0 | Schema in `vendor/genasl/src/pipeline/models.py` |
| Live avatar JSON | API returns 503 |
| Reverse (webcam sign → text) | **Not in this GenASL tree** |

**Preservation:** do not edit `vendor/genasl/**` except by explicit approval. Proposed GenASL changes go in a separate note, not in their files.

### 2.8 Existing accessibility modules

None in Gestura. None in GenASL (ASL overlay only). Sign-Kit is learn/convert/create-video, not Braille/Morse/blink.

### 2.9 Missing features (Gestura product)

All of: Gestura MV3 extension, side panel, YouTube caption pipeline, FastAPI orchestration, Gemini/Whisper for Gestura, GenASL adapter, ISL adapter, Braille, Morse, blink, Meet adapter, production auth.

### 2.10 Technical risks

1. **README vs code drift** in GenASL (Done vs 503).
2. **GPL-3.0** on GenASL: a distributing Gestura binary that links GenASL may inherit GPL obligations. Keep GenASL as a **separate local service** and document license before any store listing.
3. **`cookies.txt` in GenASL** is a Netscape cookie jar with YouTube cookies. Treat as a secret. Do not commit or reuse.
4. **yt-dlp audio ingest** can violate platform terms if used as a caption bypass. Gestura captions must prefer in-page tracks the user can already see.
5. **ASL/ISL confusion** if Sign-Kit clips are played for English/ASL captions.
6. **SignAvatars license** — filling their Google form is required; RGB videos are not redistributed.
7. **Home-directory Git** at `C:\Users\arsh3` — accidental `git add` would stage Desktop/Documents. Gestura must use its own repo.
8. **Service worker lifetime** — do not assume a persistent background process.
9. **Content-script isolation** — no page JS globals; MAIN-world injection only if required and minimal.
10. Multiple coding agents overwriting the same files.

### 2.11 Architecture conflicts

| Conflict | Resolution |
|---|---|
| GenASL *is* a YouTube ASL extension; Gestura is a broader platform | Independent Gestura extension; talk to GenASL over HTTP |
| GenASL VRM vs Sign-Kit Mixamo vs SignAvatars SMPL-X | Three motion backends behind one `AvatarPlayer` interface |
| GenASL “no word-level gloss in UI” vs Sign-Kit fingerspelling | Respect GenASL UI rule for ASL mode; ISL pack is a different language module |
| GenASL monetization “platforms pay” vs Gestura product | Do not add paywalls in the accessibility UI |
| Empty workspace vs “don’t rewrite GenASL” | Copy as `vendor/`, never merge trees |

### 2.12 Recommended implementation sequence

Matches the master prompt, with one concrete first slice:

0. Audit + this plan (**this document**)
1. Gestura MV3 foundation (side panel, messaging, floating control)
2. YouTube captions + timestamp sync (**first user-verifiable deliverable**)
3. Gestura FastAPI + Gemini + Whisper (secrets server-side)
4. GenASL adapter (health + 503 handling + future `AvatarRenderPlan`)
5. Braille / Morse
6. Additional website adapters
7. Avatar playback (VRM + Sign-Kit ISL pack) with linguistic labels
8. Production hardening

### 2.13 Files to create (Gestura)

Phase 1–2 (now):

- `extension/manifest.json`
- `extension/background/service-worker.js`
- `extension/content/index.js`
- `extension/content/floating-button.js`
- `extension/sidepanel/index.html`, `sidepanel.css`, `sidepanel.js`
- `extension/popup/popup.html`, `popup.js`
- `extension/adapters/registry.js`
- `extension/adapters/website-adapter.js`
- `extension/adapters/youtube-adapter.js`
- `extension/adapters/generic-video-adapter.js`
- `extension/shared/messages.js`
- `extension/shared/caption-segment.js`
- `extension/icons/*.png`
- `shared/contracts.md`
- `tests/test-caption-segment.cjs`
- `tests/test-messages.cjs`
- `README.md`

Phase 3+: `backend/**`, `integrations/genasl/**`, `accessibility/**` — listed in milestones below. **Do not create fake provider responses.**

### 2.14 Existing files to modify

- **None in `vendor/genasl`.** Protected.
- **None in `vendor/sign-kit`.** Reference only; later copy animation *contracts* into `avatar/` if we adopt Mixamo playback.
- Gestura files listed above are new.

### 2.15 Test strategy and acceptance

| Phase | Automated | Manual |
|---|---|---|
| 1 | Message-type and adapter-id tests (`node --test`) | Load unpacked extension; popup + side panel open; no console exceptions |
| 2 | CaptionSegment normalize + merge + active-at-time | YouTube video with captions: transcript fills, seek highlights, missing-caption state |
| 3 | Provider timeout/error schema tests with fakes | Mic consent; no API key in extension bundle (`grep`) |
| 4 | Adapter maps GenASL 503/health without crashing | `/health` unreachable vs 503 vs future 200 |
| 5+ | Unit tests per module | Device/linguistic validation before any “accurate signing” claim |

---

## 3. Current implementation status (Gestura)

| Area | Status |
|---|---|
| Workspace audit | Implemented (this plan) |
| Vendor copies | Implemented (`vendor/genasl`, `vendor/sign-kit`) |
| Gestura MV3 extension | Implemented (load unpacked `extension/`) |
| YouTube caption adapter | Implemented (text tracks + rendered `.ytp-caption-segment`) |
| FastAPI / Gemini / Whisper | Planned |
| GenASL HTTP adapter | Planned (Phase 4); probe-only status in UI is allowed |
| Sign-Kit Mixamo playback | Planned (ISL pack) |
| SignAvatars SMPL-X | Blocked (license) |
| Braille / Morse / blink | Planned / experimental |
| Google Meet | Planned; explicit consent required |

---

## 4. Planned modules

- **CaptionProvider** — normalize any source to `CaptionSegment`
- **WebsiteAdapter** — YouTube, GenericVideo, later Meet / Education / GenericWeb
- **AiOrchestrator** — routes text/audio; never invents signs
- **GenAslClient** — `GET /health`, `POST /asl/avatar` → `AvatarRenderPlan`
- **IslMixamoPlayer** — Sign-Kit clip graph (alphabet + 4 words) labeled ISL
- **BrailleProvider / MorseProvider / BlinkInput** — independent packages
- **AvatarPlayer** — `{ backend: "vrm" | "mixamo" | "smplx", language: "asl" | "isl" | ... }`

---

## 5. API contracts

### 5.1 CaptionSegment (Gestura internal)

```
CaptionSegment
  id: string
  text: string
  startTime: number   # seconds
  endTime: number     # seconds
  language: string    # BCP-47 when known, else "und"
  source: "text-track" | "rendered-caption" | "whisper" | "user-text"
  confidence?: number
```

### 5.2 Extension messages

Prefix: `GESTURA/`. Unknown types are ignored.

- `GESTURA/PAGE_CONTEXT` — site, videoId, capabilities
- `GESTURA/CAPTIONS_UPDATED` — `{ segments, activeId, language, availability }`
- `GESTURA/PLAYBACK` — `{ currentTime, paused, duration }`
- `GESTURA/SEEK_TO` — `{ startTime }` side panel → content
- `GESTURA/OPEN_SIDEPANEL`
- `GESTURA/ERROR` — `{ code, message }` (no payload dumps of page text in logs by default)

### 5.3 GenASL (do not change)

- `GET http://127.0.0.1:8794/health` → `{ status, ready, version, pipeline, vrm_model_url }`
- `POST /asl/avatar` `{ video_id }` → `AvatarRenderPlan` **or 503 / 400**

Gestura must handle 503 as “pipeline not ready,” never fake a plan.

### 5.4 Gestura backend (Phase 3, not implemented)

Planned, not live:

- `POST /v1/captions/interpret`
- `POST /v1/audio/transcribe`
- `GET /v1/health`

Secrets: `GEMINI_API_KEY`, Whisper model path — server env only.

---

## 6. Development milestones

| ID | Milestone | Acceptance | Status |
|---|---|---|---|
| M0 | Audit + plan | This file exists; vendor copies present; GenASL unmodified | Done |
| M1 | MV3 foundation | Install, side panel, messaging, floating button | Code complete; Chrome load still manual |
| M2 | YouTube captions | Sync transcript on a real video; missing-caption path | Code + unit tests; Chrome verification pending |
| M3 | Gestura FastAPI + Gemini + Whisper | Structured responses, no client secrets | Partial — backend scaffold landed; live provider wiring pending |
| M4 | GenASL adapter | Health/503 handled; no vendor file edits | Planned |
| M5 | Braille + Morse | Round-trip tests | Planned |
| M6 | More adapters | Per-site tests | Planned |
| M7 | Avatar backends | Labeled language; no invented signs | Planned |
| M8 | Production | Security, a11y, perf, docs | Planned |

---

## 7. Dependencies

**Gestura Phase 1–2:** Chrome MV3 only (no npm required). Node 18+ for `node --test`.

**Later:** Python 3.10+, FastAPI, GenASL `requirements.txt` if running their server, FFmpeg for GenASL audio, Chrome.

**External data:** SignAvatars form; WLASL/OpenASL clips remain inside GenASL’s own rules.

**Licenses to resolve before distribution:** GPL-3.0 (GenASL), Sign-Kit (check upstream), SignAvatars research license, SMPL-X/MANO model licenses.

---

## 8. Risks (execution)

See §2.10. Highest near-term: caption source quality on YouTube (auto vs manual tracks), SPA navigation leaks, and treating Sign-Kit’s four words as “ISL support.”

---

## 9. Testing strategy

- Unit: caption normalize/merge/active segment; message constants.
- Contract: GenASL 503/health JSON shapes (fixture files; no live YouTube download in CI).
- Manual: `chrome://extensions` → Load unpacked `extension/` → YouTube watch page.
- Never: fake 200 avatar plans; never claim browser verification without doing it.

---

## 10. Pending decisions (need the product owner)

1. **Git:** initialize a dedicated Gestura repo in this folder (recommended) vs continue with no project Git. Do **not** commit into `C:\Users\arsh3`.
2. **GenASL process:** run as a sibling service only, or also as a subprocess of Gestura backend later?
3. **GPL:** accept GPL coupling vs keep Gestura proprietary and call GenASL as a separate optional app.
4. **SignAvatars:** submit the non-commercial research form? Until then, no SMPL-X weights in-tree.
5. **Default sign language** for the India-facing product: ISL pack vs ASL GenASL vs both with an explicit selector (recommended: selector, default unset).
6. **YouTube audio fallback:** Whisper only after an in-UI consent, never silent yt-dlp from the extension.

---

## 11. Avatar source map (for later phases)

### Sign-Kit (ISL, Mixamo)

- Path: `vendor/sign-kit/client/src/Animations/`
- Format: functions that `ref.animations.push([[bone, "rotation", axis, radians, sign], ...])`
- Bones: `mixamorig*`
- Coverage: A–Z plus HOME, PERSON, TIME, YOU
- Honest product copy: “ISL fingerspelling and a tiny word list,” not “full ISL.”

### SignAvatars (research motion)

- SMPL-X `(num_frames, 182)` including hands, jaw, expression
- Not a Chrome asset; conversion to VRM/Mixamo is a research project
- Dataset download is gated

### GenASL (ASL VRM plan)

- Target schema `AvatarRenderPlan` v5.0
- Motion retrieval + NMM not on the public HTTP path yet
- Chrome three.js consumer not implemented in their extension

---

## 12. Milestone log

### 2026-11-14 — M0 audit

- **Implemented:** workspace inspection; vendor clones; this plan.
- **Files:** `GESTURA_IMPLEMENTATION_PLAN.md`, `vendor/PROTECTED.md`, `vendor/genasl/**` (copy), `vendor/sign-kit/**` (copy).
- **Tests:** none (documentation).
- **Passed / failed:** n/a.
- **Still needs work:** M1–M2 implementation and Chrome load test.
- **Browser verification:** not required for the plan document.

Do not modify protected GenASL files in later milestones without approval.

### 2026-11-14 — M1 extension foundation + M2 YouTube captions

- **Implemented:** Gestura MV3 extension (side panel, popup, floating button, service worker messaging), YouTube adapter using HTML5 `textTracks` and rendered cue DOM, CaptionSegment helpers, unit tests.
- **Files created:** `extension/**`, `tests/test-*.cjs`, `README.md`, `.gitignore`.
- **Files modified:** none under `vendor/genasl` or `vendor/sign-kit`.
- **Tests executed:** `node --test tests/test-caption-segment.cjs tests/test-messages.cjs tests/test-youtube-id.cjs`
- **Passed / failed:** recorded in the session after the test run.
- **Still needs work:** live Chrome verification on a captioned YouTube video; Whisper/Gemini; GenASL adapter; ISL Mixamo player.
- **Browser verification:** required. Cursor’s embedded browser cannot load an unpacked MV3 extension. Load `extension/` in Chrome and test a watch page with captions on.

### 2026-11-15 — Resume: test bootstrap fix + honest error handling

- **Implemented:** Node test bootstrap fix — added `package.json` with `"type": "commonjs"` at the Gestura root so the `extension/shared/*.js` helper modules resolve correctly through `require()` (previously all shared-module tests failed with `undefined is not a function`).
- **Implemented:** `GESTURA/ERROR` handling in the side panel (`code` + `message` rendered into the status line), adapter start failure capture in the content script (publishes `GESTURA/ERROR` with `ADAPTER_START_FAILED`), seek send failure surfacing in the side panel, seek response always answers the sender.
- **Files created:** `package.json`.
- **Files modified:** `extension/background/service-worker.js` (removed conflicting `sidePanel.setPanelBehavior({ openPanelOnActionClick: true })` while `action.default_popup` is registered), `extension/content/index.js`, `extension/sidepanel/sidepanel.js`, `tests/test-messages.cjs`.
- **Tests executed:** `node --test tests/test-caption-segment.cjs tests/test-messages.cjs tests/test-youtube-id.cjs`
- **Passed / failed:** 7/7 pass, 0 fail (after the `"type": "commonjs"` fix; before it, 5 of 6 shared-module tests failed).
- **Still needs work:** live Chrome verification on a captioned YouTube video; verify background → side panel push wiring; Whisper/Gemini; GenASL adapter; ISL Mixamo player; backend / accessibility modules.
- **Browser verification:** required (unchanged). Load `extension/` in Chrome and test a watch page with captions on.

### 2026-11-15 — M3 Gestura FastAPI backend scaffold (Gemini + Whisper)

- **Implemented:** Gestura FastAPI backend scaffold with `GET /v1/health`, `POST /v1/captions/interpret`, `POST /v1/audio/transcribe`; Gemini provider (`backend/providers/gemini_provider.py`) and Whisper provider (`backend/providers/whisper_provider.py`) behind provider interfaces with lazy credential/model loading; caption interpretation service with ISL disclaimer; server-side-only secrets via `backend/config.py`.
- **Implemented:** backend dependencies (`backend/dependencies.py`) for provider injection; FastAPI app with CORS configured from env.
- **Files created:** `backend/**` (main, config, dependencies, providers, services, routers, tests, requirements).
- **Files modified:** none under `vendor/genasl` or `vendor/sign-kit`.
- **Tests executed:** not runnable in the current environment (no Python runtime installed); tests written with FastAPI `TestClient` + fake providers (`backend/tests/test_*.py`).
- **Passed / failed:** pending local run: `pytest backend/tests` after `pip install -r backend/requirements.txt`.
- **Still needs work:** live Gemini/Whisper provider wiring; GenASL adapter (M4); ISL Mixamo player (M7); Braille/Morse (M5); more adapters (M6); production hardening (M8).
- **Browser verification:** not required for this scaffold milestone.

### 2026-11-15 — Sign-to-Text recognition pipeline (browser + backend)

- **Implemented:** side-panel Sign to Text section (camera preview, candidate vs
  committed text, pause/resume/clear/undo/speak, diagnostics line); MediaPipe
  Tasks Vision integration (GPU delegate, 2 hands) with CDN/CSP setup and honest
  failure messaging; `extension/shared/handTracker.js` (fixed left/right slots,
  temporal continuity, One Euro smoothing); `extension/shared/signToText.js`
  (130-float feature contract, 32-frame sequence buffer with stale dedupe,
  bounded inference scheduler with sequence IDs, prediction stabilizer);
  backend `/v1/recognition/status` + `/v1/recognition/predict` with strict
  feature-version/dimension/finite-value validation and honest
  `model_unavailable`; `backend/training/train_isl.py` (dataset audit,
  signer-grouped splits, evaluation scaffolding — no fabricated metrics).
- **Files created:** `extension/shared/signToText.js`,
  `extension/shared/handTracker.js`, `tests/test-sign-to-text.cjs`,
  `tests/test-hand-tracker.cjs`, `backend/tests/test_recognition.py`,
  `backend/training/train_isl.py`.
- **Files modified:** `extension/sidepanel/index.html`, `sidepanel.js`,
  `sidepanel.css`, `extension/manifest.json` (camera permission + CSP),
  `backend/main.py`, `backend/config.py`, `README.md`.
- **Tests executed:** JS `node --test tests/*.cjs` → 27/27 pass;
  Python `python -m pytest backend/tests` → 7/7 pass.
- **Honest limitations:** no trained ISL model or dataset is bundled, so
  recognition accuracy cannot be claimed. MediaPipe requires internet access
  to the CDN (or vendoring into `vendor/mediapipe`); camera use requires Chrome
  and explicit user consent. Live webcam verification remains pending in this
  environment.
