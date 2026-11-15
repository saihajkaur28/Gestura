"""Convert ISL .mp4 video library into Gestura FEATURE_VERSION=2 JSONL dataset."""

from __future__ import annotations

import argparse
import json
import os
import random
import urllib.request
from datetime import datetime, timezone
from pathlib import Path

import cv2
import mediapipe as mp
from mediapipe.tasks import python as mp_tasks
from mediapipe.tasks.python import vision

HAND_MODEL_URL = (
    "https://storage.googleapis.com/mediapipe-models/hand_landmarker/"
    "hand_landmarker/float16/1/hand_landmarker.task"
)
FACE_MODEL_URL = (
    "https://storage.googleapis.com/mediapipe-models/face_landmarker/"
    "face_landmarker/float16/1/face_landmarker.task"
)
FACE_KEY_INDICES = (1, 70, 300, 33, 263, 13, 14, 61, 291, 152)


def ensure_model(path: Path, url: str) -> Path:
    if not path.exists():
        path.parent.mkdir(parents=True, exist_ok=True)
        print(f"Downloading {path.name}...")
        urllib.request.urlretrieve(url, path)
    return path


def clean_label(filename: str) -> str:
    stem = Path(filename).stem
    # Remove bracketed notes like _(Sign_Language) and normalize
    if "(" in stem:
        stem = stem.split("(", 1)[0]
    label = "".join(ch if ch.isalnum() else "_" for ch in stem.upper())
    while "__" in label:
        label = label.replace("__", "_")
    return label.strip("_") or "UNKNOWN"


def extract_video_frames(
    video_path: Path,
    hand_landmarker: vision.HandLandmarker,
    face_landmarker: vision.FaceLandmarker,
) -> list[dict]:
    cap = cv2.VideoCapture(str(video_path))
    if not cap.isOpened():
        return []

    fps = cap.get(cv2.CAP_PROP_FPS) or 25.0
    if fps <= 1 or fps > 120:
        fps = 25.0
    step = max(1, round(fps / 15.0))  # ~15 FPS sampling for speed

    frames: list[dict] = []
    frame_idx = 0
    while True:
        ok, bgr = cap.read()
        if not ok:
            break
        if frame_idx % step != 0:
            frame_idx += 1
            continue

        rgb = cv2.cvtColor(bgr, cv2.COLOR_BGR2RGB)
        mp_image = mp.Image(image_format=mp.ImageFormat.SRGB, data=rgb)

        hand_res = hand_landmarker.detect(mp_image)
        face_res = face_landmarker.detect(mp_image)

        hands_out = []
        for idx, hand_lms in enumerate(hand_res.hand_landmarks[:2]):
            handedness = "Unknown"
            if idx < len(hand_res.handedness) and hand_res.handedness[idx]:
                handedness = hand_res.handedness[idx][0].category_name or "Unknown"
            hands_out.append(
                {
                    "handedness": handedness,
                    "landmarks": [
                        [round(lm.x, 5), round(lm.y, 5), round(lm.z, 5)]
                        for lm in hand_lms[:21]
                    ],
                }
            )

        face_out = []
        if face_res.face_landmarks and len(face_res.face_landmarks[0]) >= 301:
            flms = face_res.face_landmarks[0]
            face_out = [
                [round(flms[i].x, 5), round(flms[i].y, 5), round(flms[i].z, 5)]
                for i in FACE_KEY_INDICES
            ]

        if hands_out or face_out:
            t_ms = round((frame_idx / fps) * 1000.0, 1)
            entry = {"t": t_ms, "hands": hands_out}
            if face_out:
                entry["face"] = face_out
            frames.append(entry)

        frame_idx += 1

    cap.release()
    return frames


def augment_frames(frames: list[dict], rng: random.Random, scale_x: float, scale_y: float, shift_x: float, shift_y: float) -> list[dict]:
    out = []
    t0 = frames[0]["t"]
    speed = rng.uniform(0.88, 1.12)
    for f in frames:
        new_hands = []
        for h in f["hands"]:
            lms = []
            for x, y, z in h["landmarks"]:
                nx = min(1.0, max(0.0, (x - 0.5) * scale_x + 0.5 + shift_x + rng.uniform(-0.004, 0.004)))
                ny = min(1.0, max(0.0, (y - 0.5) * scale_y + 0.5 + shift_y + rng.uniform(-0.004, 0.004)))
                lms.append([round(nx, 5), round(ny, 5), round(z, 5)])
            new_hands.append({"handedness": h["handedness"], "landmarks": lms})

        new_face = []
        for x, y, z in f.get("face", []):
            nx = min(1.0, max(0.0, (x - 0.5) * scale_x + 0.5 + shift_x + rng.uniform(-0.002, 0.002)))
            ny = min(1.0, max(0.0, (y - 0.5) * scale_y + 0.5 + shift_y + rng.uniform(-0.002, 0.002)))
            new_face.append([round(nx, 5), round(ny, 5), round(z, 5)])

        entry = {"t": round((f["t"] - t0) * speed, 1), "hands": new_hands}
        if new_face:
            entry["face"] = new_face
        out.append(entry)
    return out


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--videos", required=True, help="Folder containing .mp4 sign videos")
    parser.add_argument("--out", default="data/isl_sequences.jsonl", help="Output JSONL path")
    parser.add_argument("--keep-unknown", action="store_true", help="Preserve UNKNOWN samples from existing JSONL")
    args = parser.parse_args()

    video_dir = Path(args.videos)
    out_path = Path(args.out)
    out_path.parent.mkdir(parents=True, exist_ok=True)

    # Preserve existing UNKNOWN samples if requested
    preserved_unknown: list[str] = []
    if args.keep_unknown and out_path.exists():
        for line in out_path.read_text(encoding="utf-8").splitlines():
            if not line.strip():
                continue
            try:
                obj = json.loads(line)
                if obj.get("label") == "UNKNOWN":
                    preserved_unknown.append(line.strip())
            except json.JSONDecodeError:
                pass

    mp4_files = sorted(video_dir.rglob("*.mp4"))
    if not mp4_files:
        print(f"No .mp4 files found in {video_dir}")
        return

    cache_dir = Path("models/mediapipe_cache")
    hand_model = ensure_model(cache_dir / "hand_landmarker.task", HAND_MODEL_URL)
    face_model = ensure_model(cache_dir / "face_landmarker.task", FACE_MODEL_URL)

    hand_landmarker = vision.HandLandmarker.create_from_options(
        vision.HandLandmarkerOptions(
            base_options=mp_tasks.BaseOptions(model_asset_path=str(hand_model)),
            running_mode=vision.RunningMode.IMAGE,
            num_hands=2,
            min_hand_detection_confidence=0.4,
        )
    )
    face_landmarker = vision.FaceLandmarker.create_from_options(
        vision.FaceLandmarkerOptions(
            base_options=mp_tasks.BaseOptions(model_asset_path=str(face_model)),
            running_mode=vision.RunningMode.IMAGE,
            num_faces=1,
            min_face_detection_confidence=0.4,
        )
    )

    rng = random.Random(42)
    signers = ["video-signer-1", "video-signer-2", "video-signer-3"]
    variants = [
        (1.00, 1.00, 0.00, 0.00),
        (0.94, 0.94, -0.02, 0.01),
        (1.05, 1.05, 0.02, -0.01),
        (0.97, 1.03, 0.015, 0.015),
        (1.03, 0.97, -0.015, -0.015),
        (0.92, 0.96, 0.00, 0.02),
    ]

    all_lines: list[str] = list(preserved_unknown)
    print(f"Found {len(mp4_files)} videos (preserving {len(preserved_unknown)} UNKNOWN clips)...")

    for vp in mp4_files:
        label = clean_label(vp.name)
        raw_frames = extract_video_frames(vp, hand_landmarker, face_landmarker)
        if len(raw_frames) < 8:
            print(f"  [SKIP] {vp.name} -> too few usable frames ({len(raw_frames)})")
            continue

        # Trim small leading/trailing idle frames if video is long
        if len(raw_frames) > 24:
            trim = max(1, len(raw_frames) // 10)
            core_frames = raw_frames[trim:-trim]
        else:
            core_frames = raw_frames

        for idx, (sx, sy, dx, dy) in enumerate(variants):
            aug = augment_frames(core_frames, rng, sx, sy, dx, dy)
            dur = max(400, int(aug[-1]["t"] - aug[0]["t"]))
            sample = {
                "label": label,
                "signerId": signers[idx % 3],
                "sessionId": f"lib-{label.lower()}-{idx}",
                "dominantHand": "Both",
                "notes": f"Imported from {vp.name}",
                "createdAt": datetime.now(timezone.utc).isoformat(),
                "frameCount": len(aug),
                "durationMs": dur,
                "fps": round((len(aug) - 1) / (dur / 1000.0), 1),
                "featureVersion": 2,
                "frames": aug,
            }
            all_lines.append(json.dumps(sample))
        print(f"  [OK] {vp.name} -> label='{label}' (6 clips)")

    hand_landmarker.close()
    face_landmarker.close()

    out_path.write_text("\n".join(all_lines) + ("\n" if all_lines else ""), encoding="utf-8")
    print(f"\nDone! Saved {len(all_lines)} total clips to {out_path}")


if __name__ == "__main__":
    main()