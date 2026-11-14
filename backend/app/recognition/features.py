"""Landmark feature specification shared by training and inference.

The browser extracts the exact same feature vector (see
frontend/src/lib/handFeatureExtractor.ts). Any change here requires bumping
FEATURE_VERSION and retraining the model.

Raw frame schema (as exported by the dataset collector):
    {
      "t": <milliseconds>,
      "hands": [
        {"handedness": "Left" | "Right" | "Unknown",
         "landmarks": [[x, y, z], ... 21 rows]}
      ],
      "face": [[x, y, z], ... 10 rows]  # optional
    }
"""

from __future__ import annotations

from typing import Any, Iterable, Sequence

FEATURE_VERSION = 2
SEQUENCE_LENGTH = 32
MAX_HANDS = 2
HAND_VECTOR_SIZE = 21 * 3 + 2  # 63 normalised coords + handedness + presence
FACE_KEY_COUNT = 10
FACE_VECTOR_SIZE = FACE_KEY_COUNT * 3 + 1  # 30 normalised face coords + presence
FRAME_VECTOR_SIZE = HAND_VECTOR_SIZE * MAX_HANDS + FACE_VECTOR_SIZE  # 161

_HANDEDNESS_VALUE = {"left": -1.0, "right": 1.0, "unknown": 0.0}
_MIN_SCALE = 1e-6


def _clamp_handedness(value: Any) -> float:
    return _HANDEDNESS_VALUE.get(str(value or "unknown").strip().lower(), 0.0)


def _normalise_hand(hand: dict[str, Any]) -> list[float]:
    landmarks = hand.get("landmarks") or []
    if len(landmarks) < 21:
        return [0.0] * HAND_VECTOR_SIZE

    wrist = landmarks[0]
    middle_mcp = landmarks[9]
    try:
        scale = (
            (float(middle_mcp[0]) - float(wrist[0])) ** 2
            + (float(middle_mcp[1]) - float(wrist[1])) ** 2
        ) ** 0.5
    except (TypeError, ValueError, IndexError):
        return [0.0] * HAND_VECTOR_SIZE
    if scale < _MIN_SCALE:
        scale = _MIN_SCALE

    vector: list[float] = []
    for point in landmarks[:21]:
        try:
            x = (float(point[0]) - float(wrist[0])) / scale
            y = (float(point[1]) - float(wrist[1])) / scale
            z = (float(point[2]) - float(wrist[2])) / scale
        except (TypeError, ValueError, IndexError):
            return [0.0] * HAND_VECTOR_SIZE
        vector.extend((x, y, z))

    vector.append(_clamp_handedness(hand.get("handedness")))
    vector.append(1.0)
    return vector


def _normalise_face(face_points: Sequence[Any]) -> list[float]:
    if not isinstance(face_points, Sequence) or len(face_points) < FACE_KEY_COUNT:
        return [0.0] * FACE_VECTOR_SIZE

    nose = face_points[0]
    left_eye = face_points[3]
    right_eye = face_points[4]
    try:
        scale = (
            (float(right_eye[0]) - float(left_eye[0])) ** 2
            + (float(right_eye[1]) - float(left_eye[1])) ** 2
        ) ** 0.5
    except (TypeError, ValueError, IndexError):
        return [0.0] * FACE_VECTOR_SIZE
    if scale < _MIN_SCALE:
        scale = _MIN_SCALE

    vector: list[float] = []
    for point in face_points[:FACE_KEY_COUNT]:
        try:
            x = (float(point[0]) - float(nose[0])) / scale
            y = (float(point[1]) - float(nose[1])) / scale
            z = (float(point[2]) - float(nose[2])) / scale
        except (TypeError, ValueError, IndexError):
            return [0.0] * FACE_VECTOR_SIZE
        vector.extend((x, y, z))

    vector.append(1.0)
    return vector


def _order_hands(hands: Iterable[dict[str, Any]]) -> list[dict[str, Any]]:
    order = {"left": 0, "right": 1, "unknown": 2}

    def key(hand: dict[str, Any]) -> tuple[int, float]:
        name = str(hand.get("handedness") or "unknown").strip().lower()
        landmarks = hand.get("landmarks") or []
        try:
            xs = [float(point[0]) for point in landmarks[:21]]
            ys = [float(point[1]) for point in landmarks[:21]]
            size = max(0.0, max(xs) - min(xs)) * max(0.0, max(ys) - min(ys))
        except (TypeError, ValueError, IndexError):
            size = 0.0
        return (order.get(name, 2), -size)

    return sorted(hands, key=key)


def frame_feature_vector(frame: dict[str, Any]) -> list[float]:
    hands = _order_hands(frame.get("hands") or [])
    vector: list[float] = []
    for index in range(MAX_HANDS):
        if index < len(hands):
            vector.extend(_normalise_hand(hands[index]))
        else:
            vector.extend([0.0] * HAND_VECTOR_SIZE)
    vector.extend(_normalise_face(frame.get("face") or []))
    return vector


def frame_timestamp(frame: dict[str, Any], fallback: float) -> float:
    value = frame.get("t")
    if isinstance(value, (int, float)) and value >= 0:
        return float(value)
    return fallback


def resample_feature_sequence(
    frames: Sequence[dict[str, Any]],
    target_length: int = SEQUENCE_LENGTH,
) -> list[list[float]]:
    """Linearly resample raw frames to a fixed-length feature sequence.

    This mirrors resampleSequence() in the browser engine. Timestamps are
    normalised to the first/last frame so variable-speed signs are handled.
    """

    if target_length <= 0:
        raise ValueError("target_length must be positive")
    if not frames:
        return [[0.0] * FRAME_VECTOR_SIZE for _ in range(target_length)]

    times = [frame_timestamp(frame, float(index)) for index, frame in enumerate(frames)]
    vectors = [frame_feature_vector(frame) for frame in frames]

    if len(vectors) == 1:
        return [list(vectors[0]) for _ in range(target_length)]

    start = times[0]
    end = times[-1]
    if end <= start:
        # Identical timestamps: fall back to even index-based sampling.
        indices = [
            min(len(vectors) - 1, round(i * (len(vectors) - 1) / (target_length - 1)))
            for i in range(target_length)
        ]
        return [list(vectors[index]) for index in indices]

    result: list[list[float]] = []
    cursor = 0
    for i in range(target_length):
        target_time = start + (end - start) * (i / (target_length - 1))
        while cursor < len(times) - 2 and times[cursor + 1] < target_time:
            cursor += 1
        left = cursor
        right = min(cursor + 1, len(times) - 1)
        span = times[right] - times[left]
        alpha = 0.0 if span <= 0 else (target_time - times[left]) / span
        alpha = min(1.0, max(0.0, alpha))
        left_vector = vectors[left]
        right_vector = vectors[right]
        result.append(
            [
                left_vector[i] + (right_vector[i] - left_vector[i]) * alpha
                for i in range(FRAME_VECTOR_SIZE)
            ]
        )
    return result