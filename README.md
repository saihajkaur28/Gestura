# GESTURA — Two-Way American Sign Language (ASL) Communicator

Gestura is a browser-based accessibility and two-way American Sign Language (ASL) communication platform designed to bridge the gap between signers, deaf/hard-of-hearing users, and vocal speakers in healthcare, ICU patient care, assistive communication, and everyday interaction.

### Core Capabilities
- **Live Caption & Transcript Sync:** Reads in-page YouTube captions and displays a clean, synchronized transcript inside a convenient Chrome side panel.
- **Real-Time ASL Sign-to-Text:** Uses webcam capture and MediaPipe hand landmark tracking to translate ASL hand gestures into live text and synthesized speech.
- **Text-to-ASL & 3D Avatar System:** Converts text into expressive ASL sequences using authentic Yale ASL Signbank videos and 3D signing avatars (**Maya**, **Alex**, and the new 3rd avatar **Jordan**).
- **Accessible Controls:** Built with intuitive controls for pausing, resuming, clearing, undoing, speed adjustment, and speaking translated text aloud directly in the browser.

---

## 1. System Overview & Architecture

GESTURA provides real-time, bidirectional ASL communication:
1. **Patient Action Mode (Sign → Text & Speech):** Real-time webcam capture, 21-point MediaPipe hand landmark tracking, normalized spatial-temporal feature extraction (179 dimensions), deep sequence classification (1D-CNN + BiGRU `AslSequenceClassifier`), bilingual text display (English + Hindi), and non-blocking speech synthesis.
2. **Speak / Write Mode (Text / Voice → ASL Avatar & Video):** Text input or Web Speech recognition mapped to 3D signing avatars (**Maya**, **Alex**, and **Jordan**) alongside authentic Yale ASL Signbank video clips.
3. **Video / Meet Sync Mode:** Video/meeting audio synchronization with the 3D ASL avatar.
4. **Eye Blink Mode:** Face tracking and blink detection for ICU patients unable to move hands (YES / NO / SOS emergency actions).

---

## 2. Machine Learning & Computer Vision Pipeline

### Feature Extraction Contract (`FEATURE_VERSION = 3`)
- **Frame vector size:** 179 floating-point values per frame.
- **Sequence buffer:** 20 frames with timestamp-aware linear resampling.
- **Hand sorting:** Sorted by apparent size (bounding box area) rather than MediaPipe's fluctuating handedness tag, ensuring the primary active hand is consistently placed at index 0.
- **Spatial landmarks (Slot 0 & Slot 1):**
  - 21 3D landmarks relative to wrist, scaled by palm width (63 floats).
  - Absolute wrist frame position `[abs(x - 0.5), y - 0.5, z]` (3 floats).
  - Wrist velocity `[vx, vy, vz]` (3 floats).
  - 5 finger extension flags (5 floats).
  - 5 finger joint angles (5 floats).
  - Palm orientation normal vector (3 floats).
  - Hand scale, handedness indicator (-1 for Left, +1 for Right), presence flag (3 floats).
  - Total per hand slot: 85 floats × 2 = 170 floats.
- **Inter-hand relations:** Distance between wrists, 2-hands presence flag (2 floats).
- **Face anchor points:** Nose tip coordinates and wrist-to-nose relative vector (7 floats).

### Model Architecture (`AslSequenceClassifier`)
- **Input dimension:** `(batch_size, 20, 179)`.
- **Temporal Conv1D Feature Extractor:** Kernel size 3, padding 1, ReLU, LayerNorm.
- **Bidirectional GRU:** 2 layers, 96 hidden units per direction (total 192 features).
- **Multi-Pooling Aggregation:** Concatenation of mean pooling, max pooling, and final hidden state.
- **Classification Head:** Linear (576 → 128) → LayerNorm → ReLU → Dropout (0.2) → Linear (128 → 5 classes).

### Target Classes & Meaning
1. `hello` — One-hand forehead salute/wave gesture.
2. `goodbye` — Chest/shoulder-height open-palm waving gesture.
3. `help` — Two-handed gesture (fist/thumb supported on open palm).
4. `thankyou` — Open hand moving outward from chin/lips.
5. `main` — **Neutral / Idle / Background state**. When hands are at rest, transitioning, or out of frame, the model predicts `main` (`unknown: true`), displaying `"Waiting for sign..."` and preventing false triggers.

---

## 3. Evaluated Performance Metrics

Evaluated on held-out test splits without synthetic data:

| Metric | Overall Value |
|---|---|
| **Overall Test Accuracy** | **84.6%** |
| **Macro Precision** | **0.883** |
| **Macro Recall** | **0.900** |
| **Macro F1-Score** | **0.865** |

### Per-Class Test Performance

| Class | Precision | Recall | F1-Score | Support |
|---|---|---|---|---|
| `hello` | 1.000 | 1.000 | 1.000 | 2 |
| `goodbye` | 0.750 | 1.000 | 0.857 | 3 |
| `help` | 0.667 | 1.000 | 0.800 | 2 |
| `thankyou` | 1.000 | 1.000 | 1.000 | 2 |
| `main` (neutral/idle) | 1.000 | 0.500 | 0.667 | 4 |

> All 4 target ASL gestures achieve **100% recall** on the held-out test set!

---

## 4. Repository Structure

```
GESTURA/
├── backend/
│   ├── app/
│   │   ├── main.py                  # FastAPI app: health, signs, recognition predict
│   │   ├── config.py                # Environment paths and CORS
│   │   └── recognition/
│   │       ├── architecture.py      # AslSequenceClassifier (1D-CNN + BiGRU)
│   │       ├── features.py          # 179-dim feature extraction and resampling
│   │       ├── service.py           # Thread-safe model loader & inference service
│   │       └── schema.py            # Pydantic request and response schemas
│   ├── data/
│   │   ├── asl_catalog.json         # 31 verified Yale ASL Signbank entries & metadata
│   │   └── isl_sequences_bal.jsonl  # Preserved historical gesture dataset
│   ├── models/asl/current/          # ASL sequence models
│   ├── test_asl_library.py          # Test suite for ASL video & endpoint verification
│   ├── test_api_endpoints.py        # Automated backend test suite
│   ├── run.py                       # Uvicorn backend server entry point
│   ├── requirements.txt             # Core backend dependencies
│   └── requirements-ml.txt          # PyTorch + NumPy ML dependencies
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── RecognitionPanel.tsx # Bilingual display, voice controls, dev panel
│   │   │   └── DatasetCollectorPanel.tsx
│   │   ├── hooks/
│   │   │   └── useHandTrackingCamera.ts
│   │   ├── lib/
│   │   │   ├── handFeatureExtractor.ts  # Client-side 179-dim extractor
│   │   │   ├── aslRecognitionEngine.ts  # ASL sequence orchestration & predictor
│   │   │   ├── aslLabels.ts             # Authentic ASL labels & handshape metadata
│   │   │   ├── aslCatalog.ts            # Bundled ASL metadata catalog
│   │   │   ├── predictionStabilizer.ts  # Voting & hysteresis stabilizer
│   │   │   ├── segments.ts              # Greedy phrase matching & fingerspelling fallback
│   │   │   └── speech.ts                # Bilingual speech synthesis controller
│   │   ├── pages/
│   │   │   ├── SignToText.tsx           # Patient Action Mode page
│   │   │   └── TextToSign.tsx           # 3D Avatar (Maya/Alex/Jordan) & ASL video stage
│   │   └── App.css                      # Unified GESTURA design system styling
│   └── package.json
├── supabase/
│   └── migrations/                  # Versioned Supabase SQL schema & migrations
└── videos/
    ├── asl/                         # 31 authentic ASL videos from Yale Signbank
    └── isl_legacy/                  # 35 preserved historical ISL videos
```

---

## 5. Execution Instructions

### Prerequisites
- Node.js 20+ and npm
- Python 3.11+
- Modern webcam (720p or higher recommended)
- Chromium-based browser (Chrome, Edge, Brave) or Firefox

### Step 1: Start the Backend Server

Open a PowerShell terminal:

```powershell
# Navigate to project root
cd c:\Users\saiha\OneDrive\Documents\GESTURA

# Run backend with the project virtual environment
& "backend\.venv\Scripts\python.exe" backend\run.py
```

The API starts at `http://127.0.0.1:8000`.
- Health check: `http://127.0.0.1:8000/health`
- Recognition status: `http://127.0.0.1:8000/api/recognition/status`
- Swagger documentation: `http://127.0.0.1:8000/docs`

To run the automated backend test suite:
```powershell
& "backend\.venv\Scripts\python.exe" backend\test_asl_library.py
```

### Step 2: Start the Frontend Application

Open a second PowerShell terminal:

```powershell
# Navigate to frontend directory
cd c:\Users\saiha\OneDrive\Documents\GESTURA\frontend

# Install dependencies (if not already installed)
npm.cmd install

# Start Vite development server
npm.cmd run dev
```

Open your browser to `http://localhost:5173`.

---

## 6. How to Use Patient Action Mode

1. Navigate to **Sign → Text** from the top navigation bar.
2. Click **Start camera** and grant camera permissions when prompted.
3. Observe the live 21-point glowing skeletal overlay on your hand(s).
4. Click **Start recognition** to begin live inference.
5. Perform any of the target signs:
   - **HELLO:** Wave or open palm beside forehead.
   - **GOODBYE:** Open palm waving in front of chest.
   - **HELP:** One hand supporting a fist/thumb at chest level.
   - **THANK YOU:** Open hand moving outward from chin/lips.
6. The recognized sign appears instantaneously with:
   - Large primary English text.
   - Sub-caption in Hindi script (नमस्ते / अलविदा / मदद / धन्यवाद).
   - Real-time confidence percentage bar.
   - Spoken voice output in English, Hindi, or both.
7. Click **Replay voice** at any time to repeat speech for the last recognized gesture.
8. Expand the **Developer Debug Panel** at the bottom of the card to view live hand counts, active tracking status, predicted class, and the complete top-K probability distribution.

---

## 7. Authentic ASL Video Library & Text-to-Sign Engine

GESTURA features a fully migrated, authentic **American Sign Language (ASL)** video library and text processing pipeline:

### 1. Yale ASL Signbank Integration
- **Source:** Haskins Laboratories / Yale University ([ASL Signbank](https://aslsignbank.haskins.yale.edu/)).
- **License:** CC BY-NC-SA 4.0 (Non-commercial educational & research reuse with attribution).
- **Library Size:** 31 verified high-resolution ASL clips across everyday, medical, and conversational categories (Hello, Thank You, Help, Goodbye, Water, Doctor, Hospital, Emergency, Pain, Medicine, Please, Yes, No, Family, Friends, etc.).
- **Asset Storage:** Stored in `videos/asl/` on the backend and mirrored in `frontend/public/videos/asl/` for direct, zero-latency browser streaming.

### 2. Text-to-ASL Linguistic Processing & Segmentation
- **Multi-Word Phrase Matching:** Greedy multi-word matcher recognizes multi-word phrases (e.g. `thank you`, `good bye`, `i love you`) before word-by-word fallback.
- **Lemmatization & Stemming:** Normalizes inflectional English variations to ASL base concepts (e.g. `helping` → `HELP`, `drank` → `WATER`, `physician` → `DOCTOR`, `restroom` → `BATHROOM`).
- **Fingerspelling Fallback:** In accordance with ASL linguistic conventions, names, proper nouns, and unsupported vocabulary (e.g. `Maya`, `David`, `Gestura`) are automatically segmented as **ASL Manual Alphabet Fingerspelling** (`FS(...)`) with individual letter tiles. GESTURA strictly avoids displaying incorrect sign videos.
- **Missing Vocabulary Handling:** Unsupported terms or punctuation display clear fallback notices without fabricating or substituting incorrect signs.

### 3. Interactive Playback Controls & 3D Signing Avatars
- **Sequential Playback:** Plays multi-sign sequences continuously without page refreshes.
- **Controls:** Play, Pause, Replay, Previous Sign (`SkipBack`), Next Sign (`SkipForward`), Clear, and variable speed selection (`0.5×`, `0.75×`, `1×`, `1.25×`, `1.5×`).
- **Avatar Switcher:** Seamlessly switch between three avatars:
  1. **Maya:** Primary female ASL avatar with natural facial dynamics & fluid arm kinematics.
  2. **Alex:** Clinical healthcare avatar with structured, high-contrast signing for ICU environments.
  3. **Jordan:** New 3rd avatar with next-generation articulated hand kinematics.
- **Display Modes:** Toggle between **ASL Video**, **3D Avatar**, or **Side-by-Side** synchronous playback.
- **Category Filter & Search:** Easily browse signs by category (`Greetings`, `Needs`, `Medical`, `Politeness`, `Questions`, `General`) or live search keywords.
- **Source Attribution & Avatar Status:** Each clip displays its Yale ASL Signbank ID, Haskins Laboratories attribution, CC BY-NC-SA 4.0 license link, and 3D avatar animation status indicator.

### 4. Historical ISL Asset Preservation
- All 35 original ISL video assets have been safely archived to `videos/isl_legacy/`.
- Accessible through the backend API via `GET /api/signs?lang=isl` and `/media/isl_legacy/{filename}` for historical and comparative research.
