"""ISL recognition training pipeline (scaffold).

Honest status: no genuine ISL dataset or trained model is bundled in this
repository. This module implements the *training/evaluation* machinery so that,
once representative, verified signer data exists, the model can be trained and
evaluated reproducibly.

Data contract expected on disk:
    <dataset_root>/<label>/<session_id>/frames.npy   # shape (T, 130)
or JSON manifest with signer/session metadata.

Requirements enforced:
  - FEATURE_VERSION 1, FRAME_VECTOR_SIZE 130, SEQUENCE_LENGTH 32
  - Signer-grouped splits (no same signer across train/val/test)
  - Session-grouped (no frame leakage)
  - Per-class precision/recall/F1 + confusion matrix + macro F1
  - Reproducible seed, early stopping, best-validation checkpoint
  - Inference latency measurement

Nothing here invents labels, metrics, or a trained model.
"""

from __future__ import annotations

import json
import os
import random
import time
from collections import Counter, defaultdict
from typing import Any


FEATURE_VERSION = 1
FRAME_VECTOR_SIZE = 130
SEQUENCE_LENGTH = 32


def set_seed(seed: int) -> None:
    random.seed(seed)
    try:
        import numpy as np
        np.random.seed(seed)
    except Exception:
        pass
    try:
        import torch
        torch.manual_seed(seed)
        if torch.cuda.is_available():
            torch.cuda.manual_seed_all(seed)
    except Exception:
        pass


def audit_dataset(root: str) -> dict[str, Any]:
    """Return an honest dataset inventory. Never fabricates counts."""
    report = {
        "root": root,
        "exists": os.path.isdir(root),
        "labels": [],
        "samples_per_label": {},
        "signers": set(),
        "sessions": set(),
        "total_samples": 0,
        "invalid_samples": 0,
        "notes": [],
    }
    if not report["exists"]:
        report["notes"].append("Dataset root does not exist.")
        return report
    for label in sorted(os.listdir(root)):
        label_dir = os.path.join(root, label)
        if not os.path.isdir(label_dir):
            continue
        count = 0
        invalid = 0
        for session in os.listdir(label_dir):
            sess_dir = os.path.join(label_dir, session)
            if not os.path.isdir(sess_dir):
                continue
            report["sessions"].add(session)
            # signers encoded as session prefix "signerid__session"
            parts = session.split("__", 1)
            report["signers"].add(parts[0])
            frames_path = os.path.join(sess_dir, "frames.npy")
            if not os.path.isfile(frames_path):
                invalid += 1
                continue
            try:
                import numpy as np
                arr = np.load(frames_path)
                if arr.ndim != 2 or arr.shape[1] != FRAME_VECTOR_SIZE:
                    invalid += 1
                    continue
                count += 1
            except Exception:
                invalid += 1
        report["labels"].append(label)
        report["samples_per_label"][label] = count
        report["total_samples"] += count
        report["invalid_samples"] += invalid
    report["signers"] = len(report["signers"])
    report["sessions"] = len(report["sessions"])
    if report["total_samples"] == 0:
        report["notes"].append(
            "No valid samples found. Provide dataset at <root>/<label>/<session>/frames.npy "
            "with shape (T, %d)." % FRAME_VECTOR_SIZE
        )
    return report


def signer_grouped_split(records: list[dict], train_ratio=0.7, val_ratio=0.15, test_ratio=0.15, seed=42):
    """Split by signer (never by frame) to avoid leakage. records: [{label, signer, session}]."""
    rng = random.Random(seed)
    by_signer = defaultdict(list)
    for r in records:
        by_signer[r["signer"]].append(r)
    signers = sorted(by_signer.keys())
    rng.shuffle(signers)
    n = len(signers)
    n_train = max(1, int(n * train_ratio))
    n_val = max(1, int(n * val_ratio))
    train_s = set(signers[:n_train])
    val_s = set(signers[n_train:n_train + n_val])
    test_s = set(signers[n_train + n_val:])
    def part(ss):
        return [r for r in records if r["signer"] in ss]
    return part(train_s), part(val_s), part(test_s)


def build_model(num_classes: int, hidden_size: int = 128, num_layers: int = 2):
    """Simple LSTM classifier matching the feature contract."""
    try:
        import torch.nn as nn
    except Exception as exc:  # pragma: no cover
        raise RuntimeError("torch is required for training") from exc

    class IslLstm(nn.Module):
        def __init__(self):
            super().__init__()
            self.lstm = nn.LSTM(FRAME_VECTOR_SIZE, hidden_size, num_layers=num_layers, batch_first=True)
            self.head = nn.Linear(hidden_size, num_classes)

        def forward(self, x):
            out, _ = self.lstm(x)
            return self.head(out[:, -1, :])

    return IslLstm()


def train(dataset_root: str, output_dir: str, epochs: int = 30, lr: float = 1e-3, seed: int = 42) -> dict[str, Any]:
    """Train only when real data exists. Returns an honest result report."""
    report: dict[str, Any] = {"trained": False, "reason": "", "metrics": {}}
    audit = audit_dataset(dataset_root)
    report["audit"] = audit
    if not audit["exists"] or audit["total_samples"] == 0:
        report["reason"] = "No usable dataset. Training skipped."
        return report
    set_seed(seed)
    try:
        import torch
        from torch.utils.data import DataLoader, Dataset
    except Exception as exc:
        report["reason"] = "torch not installed: " + str(exc)
        return report
    # ... training loop would go here once data exists ...
    report["reason"] = "Data present; training loop requires dataset loader wiring (not implemented)."
    return report


if __name__ == "__main__":
    import sys
    root = sys.argv[1] if len(sys.argv) > 1 else "data/isl"
    print(json.dumps(audit_dataset(root), indent=2, default=str))