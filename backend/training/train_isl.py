"""Train and evaluate the Gestura ISL sequence classifier.

Example (from the repository root, with the ML requirements installed):
    backend\\.venv\\Scripts\\python.exe backend\\training\\train_isl.py ^
        --data backend\\data\\isl_sequences.jsonl ^
        --out backend\\models\\isl\\current

The dataset is the JSONL export produced by the in-app dataset collector.
Splits are grouped by signer (preferred) or recording session to avoid the
same recording leaking into training and evaluation.

Only real recordings are used. No synthetic data, imputed labels, accuracy
figures, or classes are fabricated. If the dataset is unsuitable, training
fails with an explanation.
"""

from __future__ import annotations

import argparse
import json
import math
import random
import sys
from collections import Counter, defaultdict
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

BACKEND_ROOT = Path(__file__).resolve().parents[1]
if str(BACKEND_ROOT) not in sys.path:
    sys.path.insert(0, str(BACKEND_ROOT))

import numpy as np  # noqa: E402
import torch  # noqa: E402
from torch import nn  # noqa: E402
from torch.utils.data import DataLoader, TensorDataset  # noqa: E402

from app.recognition.architecture import IslSequenceLstm  # noqa: E402
from app.recognition.features import (  # noqa: E402
    FEATURE_VERSION,
    FRAME_VECTOR_SIZE,
    SEQUENCE_LENGTH,
    resample_feature_sequence,
)


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Train the Gestura ISL LSTM classifier.")
    parser.add_argument("--data", type=Path, required=True, help="Dataset JSONL file.")
    parser.add_argument(
        "--out",
        type=Path,
        default=BACKEND_ROOT / "models" / "isl" / "current",
        help="Output directory for model.pt, metadata.json and metrics.",
    )
    parser.add_argument("--epochs", type=int, default=60)
    parser.add_argument("--batch-size", type=int, default=16)
    parser.add_argument("--hidden-size", type=int, default=128)
    parser.add_argument("--num-layers", type=int, default=2)
    parser.add_argument("--dropout", type=float, default=0.2)
    parser.add_argument("--learning-rate", type=float, default=1e-3)
    parser.add_argument("--weight-decay", type=float, default=1e-4)
    parser.add_argument("--seed", type=int, default=42)
    parser.add_argument("--val-ratio", type=float, default=0.15)
    parser.add_argument("--test-ratio", type=float, default=0.15)
    parser.add_argument("--unknown-threshold", type=float, default=0.38)
    parser.add_argument("--patience", type=int, default=12)
    parser.add_argument(
        "--allow-random-split",
        action="store_true",
        help=(
            "Allow a random split when fewer than three independent signer/session "
            "groups exist. This can leak data and produces optimistic metrics; it is "
            "for quick experiments only."
        ),
    )
    return parser.parse_args()


def load_samples(path: Path) -> list[dict[str, Any]]:
    if not path.is_file():
        raise SystemExit(f"Dataset not found: {path}")
    samples: list[dict[str, Any]] = []
    with path.open("r", encoding="utf-8") as handle:
        for line_number, line in enumerate(handle, start=1):
            line = line.strip()
            if not line:
                continue
            try:
                sample = json.loads(line)
            except json.JSONDecodeError as error:
                raise SystemExit(f"Invalid JSON on line {line_number}: {error}") from error
            label = str(sample.get("label", "")).strip()
            frames = sample.get("frames") or []
            if not label:
                raise SystemExit(f"Line {line_number}: missing label")
            if not isinstance(frames, list) or len(frames) < 3:
                raise SystemExit(
                    f"Line {line_number}: need at least 3 frames, found {len(frames)}"
                )
            sample["label"] = label
            samples.append(sample)
    if not samples:
        raise SystemExit("Dataset contains no samples.")
    return samples


def group_key(sample: dict[str, Any]) -> str:
    signer = str(sample.get("signerId") or "").strip()
    session = str(sample.get("sessionId") or "").strip()
    if signer:
        return f"signer:{signer}"
    if session:
        return f"session:{session}"
    return "unknown-group"


def split_samples(
    samples: list[dict[str, Any]], args: argparse.Namespace
) -> tuple[list[dict[str, Any]], list[dict[str, Any]], list[dict[str, Any]], str]:
    rng = random.Random(args.seed)
    groups: dict[str, list[dict[str, Any]]] = defaultdict(list)
    for sample in samples:
        groups[group_key(sample)].append(sample)

    distinct_groups = [key for key in groups if key != "unknown-group"]
    strategy = "grouped by signer/session"

    if len(distinct_groups) >= 3:
        keys = distinct_groups[:]
        rng.shuffle(keys)
        val_count = max(1, round(len(keys) * args.val_ratio))
        test_count = max(1, round(len(keys) * args.test_ratio))
        while val_count + test_count >= len(keys):
            if val_count >= test_count and val_count > 1:
                val_count -= 1
            elif test_count > 1:
                test_count -= 1
            else:
                break
        test_keys = set(keys[:test_count])
        val_keys = set(keys[test_count : test_count + val_count])
        train_keys = set(keys[test_count + val_count :])
    elif args.allow_random_split:
        strategy = "random split (experimental; possible data leakage)"
        indices = list(range(len(samples)))
        rng.shuffle(indices)
        test_count = max(1, round(len(indices) * args.test_ratio))
        val_count = max(1, round(len(indices) * args.val_ratio))
        test_idx = set(indices[:test_count])
        val_idx = set(indices[test_count : test_count + val_count])
        train = [samples[i] for i in indices[test_count + val_count :]]
        val = [samples[i] for i in indices[test_count : test_count + val_count]]
        test = [samples[i] for i in indices[:test_count]]
        return train, val, test, strategy
    else:
        raise SystemExit(
            "Need at least three independent signer or session groups for a "
            "train/validation/test split (found "
            f"{len(distinct_groups)}). Record with more signers/sessions or use "
            "--allow-random-split for an experiment only."
        )

    unknown = groups.get("unknown-group", [])
    train = [s for key in train_keys for s in groups[key]]
    val = [s for key in val_keys for s in groups[key]]
    test = [s for key in test_keys for s in groups[key]]
    if unknown:
        print(
            f"[warn] {len(unknown)} samples have no signerId/sessionId and were excluded "
            "from the grouped split."
        )
    if not train or not val or not test:
        raise SystemExit("Group split produced an empty split; add more signer/session groups.")
    return train, val, test, strategy


def to_arrays(
    samples: list[dict[str, Any]], label_to_index: dict[str, int], augment: bool = False
) -> tuple[np.ndarray, np.ndarray]:
    rng = np.random.default_rng(42)
    feat_list: list[np.ndarray] = []
    label_list: list[int] = []
    for sample in samples:
        base = np.asarray(
            resample_feature_sequence(sample["frames"], SEQUENCE_LENGTH),
            dtype=np.float32,
        )
        lbl = label_to_index[sample["label"]]
        feat_list.append(base)
        label_list.append(lbl)
        if augment:
            for _ in range(7):
                scale = rng.uniform(0.92, 1.08, size=(1, base.shape[1])).astype(np.float32)
                noise = rng.normal(0.0, 0.015, size=base.shape).astype(np.float32)
                feat_list.append(base * scale + noise)
                label_list.append(lbl)
    return np.stack(feat_list), np.asarray(label_list, dtype=np.int64)


def compute_normalisation(features: np.ndarray) -> tuple[list[float], list[float]]:
    flat = features.reshape(-1, features.shape[-1])
    mean = flat.mean(axis=0)
    std = flat.std(axis=0)
    std[std < 1e-6] = 1.0
    return mean.tolist(), std.tolist()


def apply_normalisation(
    features: np.ndarray, mean: list[float], std: list[float]
) -> np.ndarray:
    mean_arr = np.asarray(mean, dtype=np.float32)
    std_arr = np.asarray(std, dtype=np.float32)
    return (features - mean_arr) / np.maximum(std_arr, 1e-6)


def classification_metrics(
    labels: np.ndarray, predictions: np.ndarray, class_names: list[str]
) -> dict[str, Any]:
    confusion = np.zeros((len(class_names), len(class_names)), dtype=np.int64)
    for truth, prediction in zip(labels.tolist(), predictions.tolist()):
        confusion[truth, prediction] += 1

    total = int(confusion.sum())
    correct = int(np.trace(confusion))
    per_class: dict[str, dict[str, float]] = {}
    supports: list[int] = []
    precisions: list[float] = []
    recalls: list[float] = []
    f1s: list[float] = []

    for index, name in enumerate(class_names):
        tp = int(confusion[index, index])
        fp = int(confusion[:, index].sum() - tp)
        fn = int(confusion[index, :].sum() - tp)
        precision = tp / (tp + fp) if tp + fp else 0.0
        recall = tp / (tp + fn) if tp + fn else 0.0
        f1 = (2 * precision * recall / (precision + recall)) if precision + recall else 0.0
        support = int(confusion[index, :].sum())
        per_class[name] = {
            "precision": precision,
            "recall": recall,
            "f1": f1,
            "support": support,
        }
        supports.append(support)
        precisions.append(precision)
        recalls.append(recall)
        f1s.append(f1)

    support_total = sum(supports)
    weighted = [
        sum(score * support for score, support in zip(scores, supports)) / support_total
        if support_total
        else 0.0
        for scores in (precisions, recalls, f1s)
    ]

    return {
        "accuracy": correct / total if total else 0.0,
        "macro_precision": float(np.mean(precisions)) if precisions else 0.0,
        "macro_recall": float(np.mean(recalls)) if recalls else 0.0,
        "macro_f1": float(np.mean(f1s)) if f1s else 0.0,
        "weighted_precision": weighted[0],
        "weighted_recall": weighted[1],
        "weighted_f1": weighted[2],
        "samples": total,
        "per_class": per_class,
        "confusion_matrix": confusion.tolist(),
        "class_names": class_names,
    }


def evaluate(
    model: nn.Module,
    loader: DataLoader,
    device: torch.device,
    class_names: list[str],
    unknown_threshold: float,
) -> tuple[float, dict[str, Any]]:
    model.eval()
    all_labels: list[int] = []
    all_predictions: list[int] = []
    all_confidences: list[float] = []
    total_loss = 0.0
    criterion = nn.CrossEntropyLoss()

    with torch.no_grad():
        for inputs, targets in loader:
            inputs = inputs.to(device)
            targets = targets.to(device)
            logits = model(inputs)
            total_loss += float(criterion(logits, targets).item()) * targets.shape[0]
            probabilities = torch.softmax(logits, dim=-1)
            confidence, predicted = probabilities.max(dim=-1)
            all_labels.extend(targets.cpu().tolist())
            all_predictions.extend(predicted.cpu().tolist())
            all_confidences.extend(confidence.cpu().tolist())

    labels = np.asarray(all_labels, dtype=np.int64)
    predictions = np.asarray(all_predictions, dtype=np.int64)
    confidences = np.asarray(all_confidences, dtype=np.float32)

    metrics = classification_metrics(labels, predictions, class_names)
    metrics["loss"] = total_loss / max(1, len(labels))

    rejected = confidences < unknown_threshold
    if "UNKNOWN" in class_names:
        unknown_index = class_names.index("UNKNOWN")
        rejected = rejected | (predictions == unknown_index)
    metrics["unknown_threshold"] = unknown_threshold
    metrics["rejection_rate"] = float(rejected.mean()) if len(rejected) else 0.0
    metrics["accepted_accuracy"] = (
        float((predictions[~rejected] == labels[~rejected]).mean())
        if (~rejected).any()
        else 0.0
    )
    return metrics["macro_f1"], metrics


def main() -> None:
    args = parse_args()
    torch.manual_seed(args.seed)
    np.random.seed(args.seed)
    random.seed(args.seed)

    samples = load_samples(args.data)
    class_counts = Counter(sample["label"] for sample in samples)
    print(f"Loaded {len(samples)} samples across {len(class_counts)} labels.")
    for label, count in sorted(class_counts.items()):
        if count < 3:
            print(f"[warn] label {label!r} has only {count} sample(s); fold results may be unstable.")

    train_samples, val_samples, test_samples, strategy = split_samples(samples, args)
    print(
        f"Split ({strategy}): train={len(train_samples)} val={len(val_samples)} "
        f"test={len(test_samples)}"
    )

    class_names = sorted(class_counts)
    label_to_index = {name: index for index, name in enumerate(class_names)}

    train_x, train_y = to_arrays(train_samples, label_to_index, augment=True)
    val_x, val_y = to_arrays(val_samples, label_to_index, augment=False)
    test_x, test_y = to_arrays(test_samples, label_to_index, augment=False)

    mean, std = compute_normalisation(train_x)
    train_x = apply_normalisation(train_x, mean, std)
    val_x = apply_normalisation(val_x, mean, std)
    test_x = apply_normalisation(test_x, mean, std)

    device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
    print(f"Device: {device}")

    train_loader = DataLoader(
        TensorDataset(torch.from_numpy(train_x), torch.from_numpy(train_y)),
        batch_size=min(args.batch_size, len(train_x)),
        shuffle=True,
    )
    val_loader = DataLoader(
        TensorDataset(torch.from_numpy(val_x), torch.from_numpy(val_y)),
        batch_size=min(args.batch_size, len(val_x)),
        shuffle=False,
    )
    test_loader = DataLoader(
        TensorDataset(torch.from_numpy(test_x), torch.from_numpy(test_y)),
        batch_size=min(args.batch_size, len(test_x)),
        shuffle=False,
    )

    model = IslSequenceLstm(
        input_size=FRAME_VECTOR_SIZE,
        hidden_size=args.hidden_size,
        num_layers=args.num_layers,
        num_classes=len(class_names),
        dropout=args.dropout,
    ).to(device)

    counts = np.asarray([class_counts[name] for name in class_names], dtype=np.float32)
    weights = (counts.sum() / (counts * len(counts))).astype(np.float32)
    criterion = nn.CrossEntropyLoss(weight=torch.from_numpy(weights).to(device))
    optimizer = torch.optim.AdamW(
        model.parameters(), lr=args.learning_rate, weight_decay=args.weight_decay
    )

    best_f1 = -math.inf
    best_state: dict[str, Any] | None = None
    best_epoch = 0
    patience_left = args.patience

    for epoch in range(1, args.epochs + 1):
        model.train()
        running_loss = 0.0
        seen = 0
        for inputs, targets in train_loader:
            inputs = inputs.to(device)
            targets = targets.to(device)
            optimizer.zero_grad(set_to_none=True)
            logits = model(inputs)
            loss = criterion(logits, targets)
            loss.backward()
            nn.utils.clip_grad_norm_(model.parameters(), max_norm=5.0)
            optimizer.step()
            running_loss += float(loss.item()) * targets.shape[0]
            seen += targets.shape[0]

        val_f1, val_metrics = evaluate(
            model, val_loader, device, class_names, args.unknown_threshold
        )
        print(
            f"epoch {epoch:03d} loss={running_loss / max(1, seen):.4f} "
            f"val_acc={val_metrics['accuracy']:.3f} val_f1={val_f1:.3f}"
        )

        if val_f1 > best_f1 + 1e-4:
            best_f1 = val_f1
            best_epoch = epoch
            best_state = {
                key: value.detach().cpu().clone() for key, value in model.state_dict().items()
            }
            patience_left = args.patience
        else:
            patience_left -= 1
            if patience_left <= 0:
                print(f"Early stopping at epoch {epoch}; best validation F1={best_f1:.3f}.")
                break

    if best_state is None:
        raise SystemExit("Training did not produce a usable checkpoint.")
    model.load_state_dict(best_state)
    model.to(device)

    _, test_metrics = evaluate(
        model, test_loader, device, class_names, args.unknown_threshold
    )

    args.out.mkdir(parents=True, exist_ok=True)
    torch.save(model.state_dict(), args.out / "model.pt")

    trained_at = datetime.now(timezone.utc).isoformat()
    model_version = f"isl-lstm-{datetime.now(timezone.utc).strftime('%Y%m%dT%H%M%SZ')}"
    metadata = {
        "modelVersion": model_version,
        "trainedAt": trained_at,
        "featureVersion": FEATURE_VERSION,
        "sequenceLength": SEQUENCE_LENGTH,
        "labels": class_names,
        "architecture": model.config(),
        "normalization": {"mean": mean, "std": std},
        "unknownThreshold": args.unknown_threshold,
        "training": {
            "dataset": str(args.data),
            "samples": len(samples),
            "trainSamples": len(train_samples),
            "valSamples": len(val_samples),
            "testSamples": len(test_samples),
            "splitStrategy": strategy,
            "bestEpoch": best_epoch,
            "device": str(device),
        },
        "metrics": {
            "accuracy": test_metrics["accuracy"],
            "macro_f1": test_metrics["macro_f1"],
            "weighted_f1": test_metrics["weighted_f1"],
            "samples": test_metrics["samples"],
        },
    }

    (args.out / "metadata.json").write_text(
        json.dumps(metadata, indent=2), encoding="utf-8"
    )
    (args.out / "metrics.json").write_text(
        json.dumps(test_metrics, indent=2), encoding="utf-8"
    )
    (args.out / "labels.json").write_text(
        json.dumps(class_names, indent=2), encoding="utf-8"
    )
    (args.out / "confusion_matrix.json").write_text(
        json.dumps(
            {
                "class_names": test_metrics["class_names"],
                "matrix": test_metrics["confusion_matrix"],
            },
            indent=2,
        ),
        encoding="utf-8",
    )

    print("\nTest metrics (held-out groups):")
    print(f"  accuracy:     {test_metrics['accuracy']:.3f}")
    print(f"  macro F1:     {test_metrics['macro_f1']:.3f}")
    print(f"  weighted F1:  {test_metrics['weighted_f1']:.3f}")
    print(f"  samples:      {test_metrics['samples']}")
    print(f"  rejection:    {test_metrics['rejection_rate']:.3f}")
    print(f"Written to {args.out}")


if __name__ == "__main__":
    main()
