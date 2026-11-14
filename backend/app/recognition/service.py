"""Lazy model registry and inference for the ISL sequence classifier.

No model is bundled with the repository. Until a real model has been trained
and placed in the model directory, the service honestly reports that
recognition is unavailable instead of returning fabricated predictions.
"""

from __future__ import annotations

import importlib.util
import json
import threading
from pathlib import Path
from typing import Any, Sequence

from .features import FEATURE_VERSION, FRAME_VECTOR_SIZE, SEQUENCE_LENGTH

MODEL_VERSION_REQUIRED_KEYS = ("modelVersion", "labels", "architecture")


class ModelUnavailableError(RuntimeError):
    def __init__(self, code: str, reason: str) -> None:
        super().__init__(reason)
        self.code = code
        self.reason = reason


def _resample_vectors(vectors: Sequence[Sequence[float]], target: int) -> list[list[float]]:
    if not vectors:
        raise ValueError("No frames supplied")
    if len(vectors) == target:
        return [list(vector) for vector in vectors]
    if len(vectors) == 1:
        return [list(vectors[0]) for _ in range(target)]

    result: list[list[float]] = []
    for index in range(target):
        position = index * (len(vectors) - 1) / (target - 1)
        left = int(position)
        right = min(left + 1, len(vectors) - 1)
        alpha = position - left
        a = vectors[left]
        b = vectors[right]
        result.append([a[i] + (b[i] - a[i]) * alpha for i in range(len(a))])
    return result


class RecognitionService:
    def __init__(self, model_dir: Path) -> None:
        self.model_dir = model_dir
        self._lock = threading.Lock()
        self._loaded = False
        self._model: Any = None
        self._torch: Any = None
        self._metadata: dict[str, Any] | None = None
        self._unavailable: ModelUnavailableError | None = None
        self._last_signature: tuple[float, float] | None = None

    @property
    def artifact_path(self) -> Path:
        return self.model_dir / "model.pt"

    @property
    def metadata_path(self) -> Path:
        return self.model_dir / "metadata.json"

    def _signature(self) -> tuple[float, float] | None:
        try:
            return (
                self.artifact_path.stat().st_mtime,
                self.metadata_path.stat().st_mtime,
            )
        except OSError:
            return None

    def _load(self) -> None:
        signature = self._signature()
        if self._loaded and signature == self._last_signature:
            if self._unavailable is not None:
                raise self._unavailable
            return

        self._loaded = True
        self._model = None
        self._metadata = None
        self._unavailable = None
        self._last_signature = signature

        if importlib.util.find_spec("torch") is None:
            self._unavailable = ModelUnavailableError(
                "torch-missing",
                "PyTorch is not installed in the backend environment, so the ISL model "
                "cannot run. Install backend/requirements-ml.txt to enable recognition.",
            )
            raise self._unavailable

        if not self.artifact_path.is_file() or not self.metadata_path.is_file():
            self._unavailable = ModelUnavailableError(
                "model-missing",
                "No trained ISL model is installed. Collect landmark sequences and run "
                "backend/training/train_isl.py to create one.",
            )
            raise self._unavailable

        try:
            import torch  # noqa: PLC0415 - lazy on purpose

            from .architecture import IslSequenceLstm

            metadata = json.loads(self.metadata_path.read_text(encoding="utf-8"))
            for key in MODEL_VERSION_REQUIRED_KEYS:
                if key not in metadata:
                    raise ValueError(f"metadata.json is missing '{key}'")
            if int(metadata.get("featureVersion", -1)) != FEATURE_VERSION:
                raise ValueError(
                    f"Model featureVersion={metadata.get('featureVersion')} does not match "
                    f"runtime featureVersion={FEATURE_VERSION}. Retrain the model."
                )

            architecture = metadata["architecture"]
            model = IslSequenceLstm(
                input_size=int(architecture["input_size"]),
                hidden_size=int(architecture["hidden_size"]),
                num_layers=int(architecture["num_layers"]),
                num_classes=int(architecture["num_classes"]),
                dropout=float(architecture.get("dropout", 0.2)),
            )
            state = torch.load(self.artifact_path, map_location="cpu", weights_only=True)
            model.load_state_dict(state)
            model.eval()

            self._torch = torch
            self._model = model
            self._metadata = metadata
        except Exception as error:  # noqa: BLE001 - surfaced as a status reason
            self._model = None
            self._metadata = None
            self._unavailable = ModelUnavailableError(
                "model-load-failed",
                f"Failed to load the ISL model: {error}",
            )
            raise self._unavailable from error

    def status(self) -> dict[str, Any]:
        with self._lock:
            try:
                self._load()
            except ModelUnavailableError as error:
                return {
                    "available": False,
                    "code": error.code,
                    "reason": error.reason,
                    "featureVersion": FEATURE_VERSION,
                    "sequenceLength": SEQUENCE_LENGTH,
                    "labels": [],
                }
            except Exception as error:  # noqa: BLE001
                return {
                    "available": False,
                    "code": "model-load-failed",
                    "reason": str(error),
                    "featureVersion": FEATURE_VERSION,
                    "sequenceLength": SEQUENCE_LENGTH,
                    "labels": [],
                }

            metadata = self._metadata or {}
            return {
                "available": True,
                "code": "ready",
                "reason": None,
                "featureVersion": FEATURE_VERSION,
                "sequenceLength": int(metadata.get("sequenceLength", SEQUENCE_LENGTH)),
                "labels": list(metadata.get("labels", [])),
                "modelVersion": metadata.get("modelVersion"),
                "trainedAt": metadata.get("trainedAt"),
                "metrics": metadata.get("metrics"),
            }

    def predict(self, frames: Sequence[Sequence[float]]) -> dict[str, Any]:
        with self._lock:
            self._load()
            if self._model is None or self._metadata is None or self._torch is None:
                raise ModelUnavailableError(
                    "model-missing", "The ISL model is not available."
                )

            for vector in frames:
                if len(vector) != FRAME_VECTOR_SIZE:
                    raise ValueError(
                        f"Each frame must contain {FRAME_VECTOR_SIZE} values, "
                        f"received {len(vector)}."
                    )

            metadata = self._metadata
            target_length = int(metadata.get("sequenceLength", SEQUENCE_LENGTH))
            sequence = _resample_vectors(frames, target_length)

            torch = self._torch
            tensor = torch.tensor(sequence, dtype=torch.float32).unsqueeze(0)
            normalization = metadata.get("normalization") or {}
            mean = normalization.get("mean")
            std = normalization.get("std")
            if mean and std:
                mean_tensor = torch.tensor(mean, dtype=torch.float32)
                std_tensor = torch.tensor(std, dtype=torch.float32).clamp_min(1e-6)
                tensor = (tensor - mean_tensor) / std_tensor

            with torch.no_grad():
                logits = self._model(tensor)
                probabilities = torch.softmax(logits, dim=-1)[0]

            top = torch.topk(probabilities, k=min(5, probabilities.shape[-1]))
            labels: list[str] = list(metadata.get("labels", []))
            top_k = [
                {
                    "label": labels[int(index)] if int(index) < len(labels) else f"class_{int(index)}",
                    "confidence": float(score),
                }
                for score, index in zip(top.values.tolist(), top.indices.tolist())
            ]

            best = top_k[0]
            threshold = float(metadata.get("unknownThreshold", 0.55))
            unknown = best["label"] == "UNKNOWN" or best["confidence"] < threshold

            return {
                "label": best["label"],
                "confidence": best["confidence"],
                "unknown": unknown,
                "topK": top_k,
                "modelVersion": str(metadata.get("modelVersion", "unknown")),
            }


_service: RecognitionService | None = None


def get_recognition_service(model_dir: Path) -> RecognitionService:
    global _service
    if _service is None or _service.model_dir != model_dir:
        _service = RecognitionService(model_dir)
    return _service
