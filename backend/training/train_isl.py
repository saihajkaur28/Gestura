"""Train and evaluate the Gestura ISL sequence classifier.

Example:
    backend\\.venv\\Scripts\\python.exe backend\\training\\train_isl.py ^
        --data backend\\data\\isl_sequences.jsonl ^
        --out backend\\models\\isl\\current
"""

from __future__ import annotations

import argparse
import json
import math
import random
import sys
from collections import Counter
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

BACKEND_ROOT = Path(__file__).resolve().parents[1]
if str(BACKEND_ROOT) not in sys.path:
    sys.path.insert(0, str(BACKEND_ROOT))

import numpy as np
import torch
from torch import nn
from torch.utils.data import DataLoader, TensorDataset

from app.recognition.architecture import IslSequenceClassifier
from app.recognition.features import (
    FEATURE_VERSION,
    FRAME_VECTOR_SIZE,
    SEQUENCE_LENGTH,
    resample_feature_sequence,
)

TARGET_CLASSES = ["main", "hello", "goodbye", "help", "thankyou"]
CLASS_TO_IDX = {name: i for i, name in enumerate(TARGET_CLASSES)}


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Train the Gestura ISL sequence classifier.")
    parser.add_argument("--data", type=Path, required=True, help="Dataset JSONL file.")
    parser.add_argument(
        "--out",
        type=Path,
        default=BACKEND_ROOT / "models" / "isl" / "current",
        help="Output directory for model.pt, metadata.json and metrics.",
    )
    parser.add_argument("--epochs", type=int, default=50)
    parser.add_argument("--batch-size", type=int, default=16)
    parser.add_argument("--hidden-size", type=int, default=96)
    parser.add_argument("--num-layers", type=int, default=2)
    parser.add_argument("--dropout", type=float, default=0.2)
    parser.add_argument("--learning-rate", type=float, default=1e-3)
    parser.add_argument("--weight-decay", type=float, default=1e-4)
    parser.add_argument("--seed", type=int, default=42)
    parser.add_argument("--unknown-threshold", type=float, default=0.55)
    return parser.parse_args()


def map_label(raw: str) -> str | None:
    raw_u = str(raw).strip().upper()
    if raw_u in ("MAIN", "UNKNOWN", "NEUTRAL"):
        return "main"
    if raw_u in ("HELLO",):
        return "hello"
    if raw_u in ("GOODBYE",):
        return "goodbye"
    if raw_u in ("HELP",):
        return "help"
    if raw_u in ("THANK_YOU", "THANKYOU"):
        return "thankyou"
    return None


def flip_frame(frame: dict[str, Any]) -> dict[str, Any]:
    new_frame: dict[str, Any] = {"t": frame.get("t", 0)}
    if "hands" in frame:
        new_hands = []
        for h in frame["hands"]:
            h_name = str(h.get("handedness", "unknown")).lower()
            flipped_name = "Right" if h_name == "left" else "Left" if h_name == "right" else "Unknown"
            flipped_lms = [[1.0 - float(pt[0]), float(pt[1]), float(pt[2])] for pt in h.get("landmarks", [])]
            new_hands.append({"handedness": flipped_name, "landmarks": flipped_lms})
        new_frame["hands"] = new_hands
    if "face" in frame:
        new_frame["face"] = [[1.0 - float(pt[0]), float(pt[1]), float(pt[2])] for pt in frame["face"]]
    return new_frame


def load_curated_dataset(path: Path) -> list[dict[str, Any]]:
    if not path.is_file():
        raise SystemExit(f"Dataset not found: {path}")

    raw_samples: list[dict[str, Any]] = []
    with path.open("r", encoding="utf-8") as handle:
        for line in handle:
            line = line.strip()
            if line:
                raw_samples.append(json.loads(line))

    dataset: list[dict[str, Any]] = []

    # 1. Target gesture signs
    for s in raw_samples:
        lbl = map_label(s.get("label", ""))
        if lbl is not None and lbl != "main":
            dataset.append({
                "label": lbl,
                "frames": s["frames"],
                "sessionId": s.get("sessionId", "unknown"),
            })

    # 2. Raw UNKNOWN (0-hand) samples as 'main'
    for s in raw_samples:
        if s.get("label") == "UNKNOWN":
            dataset.append({
                "label": "main",
                "frames": s["frames"],
                "sessionId": s.get("sessionId", "unknown"),
            })

    # 3. Add resting-hand idle samples (hands at bottom / lap)
    for s in raw_samples:
        frames = s.get("frames", [])
        resting = [fr for fr in frames if fr.get("hands") and fr["hands"][0]["landmarks"][0][1] > 0.92]
        if len(resting) >= 8:
            dataset.append({
                "label": "main",
                "frames": resting[:16],
                "sessionId": s.get("sessionId", "unknown") + "-rest",
            })

    # 4. Temporal balancing for thankyou (up to 15)
    rng = random.Random(42)
    thankyou_samples = [d for d in dataset if d["label"] == "thankyou"]
    for s in thankyou_samples:
        frames = s["frames"]
        for speed, tag in [(0.92, "s09"), (1.08, "s11")]:
            new_len = max(5, int(len(frames) * speed))
            indices = np.linspace(0, len(frames) - 1, new_len).astype(int)
            dataset.append({
                "label": "thankyou",
                "frames": [frames[i] for i in indices],
                "sessionId": f"{s['sessionId']}-{tag}",
            })

    # 5. Temporal balancing for hello (up to 15)
    hello_samples = [d for d in dataset if d["label"] == "hello"]
    for s in hello_samples[:5]:
        frames = s["frames"]
        for speed, tag in [(0.94, "s094")]:
            new_len = max(5, int(len(frames) * speed))
            indices = np.linspace(0, len(frames) - 1, new_len).astype(int)
            dataset.append({
                "label": "hello",
                "frames": [frames[i] for i in indices],
                "sessionId": f"{s['sessionId']}-{tag}",
            })

    return dataset


def prepare_tensors(
    samples: list[dict[str, Any]], augment_multiplier: int = 0
) -> tuple[np.ndarray, np.ndarray]:
    rng = random.Random(42)
    x_list: list[np.ndarray] = []
    y_list: list[int] = []

    for s in samples:
        base_seq = np.asarray(
            resample_feature_sequence(s["frames"], SEQUENCE_LENGTH), dtype=np.float32
        )
        lbl = CLASS_TO_IDX[s["label"]]
        x_list.append(base_seq)
        y_list.append(lbl)

        if augment_multiplier > 0:
            frames = s["frames"]
            flipped_frames = [flip_frame(fr) for fr in frames]
            flipped_seq = np.asarray(
                resample_feature_sequence(flipped_frames, SEQUENCE_LENGTH), dtype=np.float32
            )
            x_list.append(flipped_seq)
            y_list.append(lbl)

            for _ in range(augment_multiplier):
                speed = rng.uniform(0.86, 1.14)
                new_len = max(5, int(len(frames) * speed))
                indices = np.linspace(0, len(frames) - 1, new_len).astype(int)
                src = flipped_frames if rng.random() > 0.5 else frames
                aug_frames = [src[i] for i in indices]
                aug_seq = np.asarray(
                    resample_feature_sequence(aug_frames, SEQUENCE_LENGTH), dtype=np.float32
                )
                noise = np.random.normal(0, 0.008, aug_seq.shape).astype(np.float32)
                x_list.append(aug_seq + noise)
                y_list.append(lbl)

    return np.array(x_list, dtype=np.float32), np.array(y_list, dtype=np.int64)


def compute_metrics(y_true: np.ndarray, y_pred: np.ndarray) -> dict[str, Any]:
    num_classes = len(TARGET_CLASSES)
    cm = np.zeros((num_classes, num_classes), dtype=int)
    for t, p in zip(y_true, y_pred):
        cm[t, p] += 1

    per_class: dict[str, dict[str, float]] = {}
    precisions, recalls, f1s = [], [], []

    for i, name in enumerate(TARGET_CLASSES):
        tp = cm[i, i]
        fp = cm[:, i].sum() - tp
        fn = cm[i, :].sum() - tp
        p = float(tp / (tp + fp)) if (tp + fp) > 0 else 0.0
        r = float(tp / (tp + fn)) if (tp + fn) > 0 else 0.0
        f = float(2 * p * r / (p + r)) if (p + r) > 0 else 0.0
        support = int(cm[i, :].sum())
        per_class[name] = {"precision": p, "recall": r, "f1": f, "support": support}
        precisions.append(p)
        recalls.append(r)
        f1s.append(f)

    acc = float(np.trace(cm) / len(y_true)) if len(y_true) > 0 else 0.0
    macro_f1 = float(np.mean(f1s))

    return {
        "accuracy": acc,
        "macro_precision": float(np.mean(precisions)),
        "macro_recall": float(np.mean(recalls)),
        "macro_f1": macro_f1,
        "samples": len(y_true),
        "per_class": per_class,
        "confusion_matrix": cm.tolist(),
        "class_names": TARGET_CLASSES,
    }


def main() -> None:
    args = parse_args()
    torch.manual_seed(args.seed)
    np.random.seed(args.seed)
    random.seed(args.seed)

    print("=" * 60)
    print("GESTURA ISL MODEL TRAINING & EVALUATION PIPELINE")
    print("=" * 60)
    print(f"Loading dataset from: {args.data}")

    dataset = load_curated_dataset(args.data)
    class_counts = Counter(d["label"] for d in dataset)
    print(f"Loaded {len(dataset)} balanced samples across {len(class_counts)} classes:")
    for c in TARGET_CLASSES:
        print(f"  - {c:<10}: {class_counts.get(c, 0)} samples")

    rng = random.Random(args.seed)
    train_data, val_data, test_data = [], [], []
    for c in TARGET_CLASSES:
        c_samples = [d for d in dataset if d["label"] == c]
        rng.shuffle(c_samples)
        n = len(c_samples)
        n_test = max(2, int(round(n * 0.15)))
        n_val = max(2, int(round(n * 0.15)))
        test_data.extend(c_samples[:n_test])
        val_data.extend(c_samples[n_test : n_test + n_val])
        train_data.extend(c_samples[n_test + n_val :])

    print(
        f"\nStratified split: train={len(train_data)}, val={len(val_data)}, test={len(test_data)}"
    )

    X_train, y_train = prepare_tensors(train_data, augment_multiplier=12)
    X_val, y_val = prepare_tensors(val_data, augment_multiplier=0)
    X_test, y_test = prepare_tensors(test_data, augment_multiplier=0)

    print(
        f"Tensor shapes: X_train={X_train.shape}, X_val={X_val.shape}, X_test={X_test.shape}"
    )

    # Normalization statistics
    mean = X_train.mean(axis=(0, 1), keepdims=True)
    std = X_train.std(axis=(0, 1), keepdims=True)
    std[std < 1e-5] = 1.0

    X_train = (X_train - mean) / std
    X_val = (X_val - mean) / std
    X_test = (X_test - mean) / std

    device = torch.device("cpu")
    model = IslSequenceClassifier(
        input_size=FRAME_VECTOR_SIZE,
        hidden_size=args.hidden_size,
        num_layers=args.num_layers,
        num_classes=len(TARGET_CLASSES),
        dropout=args.dropout,
    ).to(device)

    train_counts = Counter(y_train.tolist())
    weights = torch.tensor(
        [1.0 / max(1, train_counts[i]) for i in range(len(TARGET_CLASSES))],
        dtype=torch.float32,
    )
    weights = weights / weights.sum() * len(TARGET_CLASSES)
    criterion = nn.CrossEntropyLoss(weight=weights.to(device))
    optimizer = torch.optim.AdamW(
        model.parameters(), lr=args.learning_rate, weight_decay=args.weight_decay
    )

    train_loader = DataLoader(
        TensorDataset(torch.from_numpy(X_train), torch.from_numpy(y_train)),
        batch_size=args.batch_size,
        shuffle=True,
    )

    best_val_f1 = -1.0
    best_state: dict[str, Any] | None = None
    best_epoch = 0

    print("\nTraining classifier...")
    for epoch in range(1, args.epochs + 1):
        model.train()
        running_loss = 0.0
        seen = 0
        for bx, by in train_loader:
            bx, by = bx.to(device), by.to(device)
            optimizer.zero_grad()
            logits = model(bx)
            loss = criterion(logits, by)
            loss.backward()
            nn.utils.clip_grad_norm_(model.parameters(), 3.0)
            optimizer.step()
            running_loss += loss.item() * len(by)
            seen += len(by)

        model.eval()
        with torch.no_grad():
            v_preds = torch.argmax(model(torch.from_numpy(X_val).to(device)), dim=-1).cpu().numpy()
            v_metrics = compute_metrics(y_val, v_preds)

        if epoch % 10 == 0 or v_metrics["macro_f1"] > best_val_f1:
            print(
                f"Epoch {epoch:02d}: loss={running_loss/max(1,seen):.4f}, "
                f"val_acc={v_metrics['accuracy']:.3f}, val_f1={v_metrics['macro_f1']:.3f}"
            )

        if v_metrics["macro_f1"] >= best_val_f1:
            best_val_f1 = v_metrics["macro_f1"]
            best_epoch = epoch
            best_state = {k: v.clone().cpu() for k, v in model.state_dict().items()}

    print(f"\nBest validation F1: {best_val_f1:.3f} at epoch {best_epoch}")

    if best_state is not None:
        model.load_state_dict(best_state)
    model.eval()

    with torch.no_grad():
        t_logits = model(torch.from_numpy(X_test).to(device))
        probs = torch.softmax(t_logits, dim=-1).cpu().numpy()
        t_preds = np.argmax(probs, axis=-1)
        test_metrics = compute_metrics(y_test, t_preds)

    print("\n" + "=" * 60)
    print("FINAL HELD-OUT TEST EVALUATION RESULTS")
    print("=" * 60)
    print(f"Overall Test Accuracy: {test_metrics['accuracy'] * 100:.1f}%")
    print(f"Macro F1 Score:       {test_metrics['macro_f1']:.3f}")
    print(f"Macro Precision:      {test_metrics['macro_precision']:.3f}")
    print(f"Macro Recall:         {test_metrics['macro_recall']:.3f}")

    print("\nConfusion Matrix:")
    header = "Predicted -> " + " ".join(f"{c:>9}" for c in TARGET_CLASSES)
    print(header)
    for i, c in enumerate(TARGET_CLASSES):
        row_str = " ".join(f"{test_metrics['confusion_matrix'][i][j]:>9}" for j in range(len(TARGET_CLASSES)))
        print(f"{c:<12}: {row_str}")

    print("\nPer-Class Performance Breakdown:")
    print(f"{'Class':<12} {'Precision':<10} {'Recall':<10} {'F1-Score':<10} {'Support'}")
    for c in TARGET_CLASSES:
        pc = test_metrics["per_class"][c]
        print(f"{c:<12} {pc['precision']:<10.3f} {pc['recall']:<10.3f} {pc['f1']:<10.3f} {pc['support']}")

    # Save artifacts
    args.out.mkdir(parents=True, exist_ok=True)
    torch.save(best_state, args.out / "model.pt")

    trained_at = datetime.now(timezone.utc).isoformat()
    model_version = f"isl-cnngru-{datetime.now(timezone.utc).strftime('%Y%m%dT%H%M%SZ')}"

    metadata = {
        "modelVersion": model_version,
        "trainedAt": trained_at,
        "featureVersion": FEATURE_VERSION,
        "sequenceLength": SEQUENCE_LENGTH,
        "labels": TARGET_CLASSES,
        "architecture": model.config(),
        "normalization": {
            "mean": mean.squeeze().tolist(),
            "std": std.squeeze().tolist(),
        },
        "unknownThreshold": args.unknown_threshold,
        "metrics": {
            "accuracy": test_metrics["accuracy"],
            "macro_f1": test_metrics["macro_f1"],
            "macro_precision": test_metrics["macro_precision"],
            "macro_recall": test_metrics["macro_recall"],
            "samples": test_metrics["samples"],
        },
    }

    (args.out / "metadata.json").write_text(json.dumps(metadata, indent=2), encoding="utf-8")
    (args.out / "metrics.json").write_text(json.dumps(test_metrics, indent=2), encoding="utf-8")
    (args.out / "confusion_matrix.json").write_text(
        json.dumps(test_metrics["confusion_matrix"], indent=2), encoding="utf-8"
    )
    (args.out / "labels.json").write_text(json.dumps(TARGET_CLASSES, indent=2), encoding="utf-8")

    print(f"\nArtifacts saved successfully to: {args.out}")


if __name__ == "__main__":
    main()
