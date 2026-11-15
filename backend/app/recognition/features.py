"""Landmark feature specification shared by training and inference.

Version 3 feature contract:
Each frame produces 179 floats:
  - Primary Hand (85 floats):
      * 21 normalized landmarks (x, y, z) relative to wrist, scaled by palm size (63 floats)
      * Wrist position in frame: abs(wrist.x - 0.5), wrist.y - 0.5, wrist.z (3 floats)
      * Wrist velocity: (wrist - prev_wrist) / scale (3 floats)
      * 5 finger extensions: thumb, index, middle, ring, pinky (5 floats)
      * 5 finger angles: thumb, index, middle, ring, pinky (5 floats)
      * Palm normal orientation: nx, ny, nz (3 floats)
      * Palm scale, handedness (-1.0, 1.0, 0.0), presence (1.0 or 0.0) (3 floats)
  - Secondary Hand (85 floats, or 0.0 if absent)
  - Inter-Hand Relation (2 floats):
      * 3D distance between wrists (1 float)
      * Both hands present flag (1 float)
  - Face Anchor (7 floats):
      * Nose in frame: abs(nose.x - 0.5), nose.y - 0.5, nose.z (3 floats)
      * Primary wrist relative to nose: abs(w0.x - nose.x), w0.y - nose.y, w0.z - nose.z (3 floats)
      * Face presence flag (1 float)
Total = 85 * 2 + 2 + 7 = 179 floats per frame.
"""

from __future__ import annotations

import math
from typing import Any, Sequence

FEATURE_VERSION = 3
SEQUENCE_LENGTH = 32
MAX_HANDS = 2

HAND_SINGLE_VECTOR_SIZE = 85
INTER_HAND_VECTOR_SIZE = 2
FACE_VECTOR_SIZE = 7
FRAME_VECTOR_SIZE = HAND_SINGLE_VECTOR_SIZE * MAX_HANDS + INTER_HAND_VECTOR_SIZE + FACE_VECTOR_SIZE  # 179

FINGER_CHAINS = (
    (1, 2, 3, 4),     # thumb
    (5, 6, 7, 8),     # index
    (9, 10, 11, 12),  # middle
    (13, 14, 15, 16), # ring
    (17, 18, 19, 20), # pinky
)

_MIN_SCALE = 1e-6


def _dist_3d(a: Sequence[float], b: Sequence[float]) -> float:
    return math.sqrt(
        (float(a[0]) - float(b[0])) ** 2
        + (float(a[1]) - float(b[1])) ** 2
        + (float(a[2]) - float(b[2])) ** 2
    )


def _angle_3d(a: Sequence[float], v: Sequence[float], b: Sequence[float]) -> float:
    ax, ay, az = float(a[0]) - float(v[0]), float(a[1]) - float(v[1]), float(a[2]) - float(v[2])
    bx, by, bz = float(b[0]) - float(v[0]), float(b[1]) - float(v[1]), float(b[2]) - float(v[2])
    la = math.sqrt(ax * ax + ay * ay + az * az)
    lb = math.sqrt(bx * bx + by * by + bz * bz)
    if la < _MIN_SCALE or lb < _MIN_SCALE:
        return 0.0
    cosine = (ax * bx + ay * by + az * bz) / (la * lb)
    cosine = max(-1.0, min(1.0, cosine))
    return math.acos(cosine) / math.pi


def _hand_bbox_size(hand: dict[str, Any]) -> float:
    landmarks = hand.get("landmarks") or []
    if len(landmarks) < 21:
        return 0.0
    try:
        xs = [float(pt[0]) for pt in landmarks[:21]]
        ys = [float(pt[1]) for pt in landmarks[:21]]
        return (max(xs) - min(xs)) * (max(ys) - min(ys))
    except (TypeError, ValueError, IndexError):
        return 0.0


def _extract_single_hand(
    hand: dict[str, Any], prev_wrist: list[float] | None = None
) -> tuple[list[float], list[float] | None]:
    landmarks = hand.get("landmarks") or []
    if len(landmarks) < 21:
        return [0.0] * HAND_SINGLE_VECTOR_SIZE, None

    try:
        wrist = [float(x) for x in landmarks[0][:3]]
        middle_mcp = [float(x) for x in landmarks[9][:3]]
        scale = math.hypot(middle_mcp[0] - wrist[0], middle_mcp[1] - wrist[1])
        if scale < _MIN_SCALE:
            scale = _MIN_SCALE

        vector: list[float] = []

        # 1. 21 normalized landmarks relative to wrist (63 values)
        for point in landmarks[:21]:
            vector.append((float(point[0]) - wrist[0]) / scale)
            vector.append((float(point[1]) - wrist[1]) / scale)
            vector.append((float(point[2]) - wrist[2]) / scale)

        # 2. Wrist position in frame (3 values: abs(x-0.5), y-0.5, z)
        vector.append(abs(wrist[0] - 0.5))
        vector.append(wrist[1] - 0.5)
        vector.append(wrist[2])

        # 3. Wrist velocity (3 values)
        if prev_wrist:
            vector.append((wrist[0] - prev_wrist[0]) / scale)
            vector.append((wrist[1] - prev_wrist[1]) / scale)
            vector.append((wrist[2] - prev_wrist[2]) / scale)
        else:
            vector.extend((0.0, 0.0, 0.0))

        # 4. Finger extensions (5 values)
        for chain in FINGER_CHAINS:
            mcp = landmarks[chain[0]]
            pip = landmarks[chain[1]]
            tip = landmarks[chain[3]]
            wt = _dist_3d(wrist, tip)
            wm = _dist_3d(wrist, mcp)
            wp = _dist_3d(wrist, pip)
            vector.append(1.0 if (wt > wm * 1.08 and wt > wp * 1.02) else 0.0)

        # 5. Finger angles (5 values)
        for chain in FINGER_CHAINS:
            vector.append(_angle_3d(landmarks[chain[0]], landmarks[chain[1]], landmarks[chain[3]]))

        # 6. Palm normal orientation (3 values)
        idx_mcp = landmarks[5]
        pinky_mcp = landmarks[17]
        ax, ay, az = (
            float(idx_mcp[0]) - wrist[0],
            float(idx_mcp[1]) - wrist[1],
            float(idx_mcp[2]) - wrist[2],
        )
        bx, by, bz = (
            float(pinky_mcp[0]) - wrist[0],
            float(pinky_mcp[1]) - wrist[1],
            float(pinky_mcp[2]) - wrist[2],
        )
        nx = ay * bz - az * by
        ny = az * bx - ax * bz
        nz = ax * by - ay * bx
        nl = math.sqrt(nx * nx + ny * ny + nz * nz)
        if nl > _MIN_SCALE:
            vector.extend((nx / nl, ny / nl, nz / nl))
        else:
            vector.extend((0.0, 0.0, 1.0))

        # 7. Scale, handedness, presence (3 values)
        vector.append(scale)
        h_name = str(hand.get("handedness") or "unknown").strip().lower()
        h_val = -1.0 if h_name == "left" else 1.0 if h_name == "right" else 0.0
        vector.append(h_val)
        vector.append(1.0)

        return vector, wrist
    except (TypeError, ValueError, IndexError):
        return [0.0] * HAND_SINGLE_VECTOR_SIZE, None


def frame_feature_vector(
    frame: dict[str, Any], prev_wrists: list[list[float]] | None = None
) -> tuple[list[float], list[list[float]]]:
    raw_hands = frame.get("hands") or []
    # Primary hand FIRST (largest apparent size), secondary hand second
    sorted_hands = sorted(raw_hands, key=_hand_bbox_size, reverse=True)

    vector: list[float] = []
    current_wrists: list[list[float]] = []

    pw0 = prev_wrists[0] if (prev_wrists and len(prev_wrists) > 0) else None
    pw1 = prev_wrists[1] if (prev_wrists and len(prev_wrists) > 1) else None

    # Hand 0 (Primary)
    if len(sorted_hands) > 0:
        h0_vec, w0 = _extract_single_hand(sorted_hands[0], pw0)
        vector.extend(h0_vec)
        if w0:
            current_wrists.append(w0)
    else:
        vector.extend([0.0] * HAND_SINGLE_VECTOR_SIZE)

    # Hand 1 (Secondary)
    if len(sorted_hands) > 1:
        h1_vec, w1 = _extract_single_hand(sorted_hands[1], pw1)
        vector.extend(h1_vec)
        if w1:
            current_wrists.append(w1)
    else:
        vector.extend([0.0] * HAND_SINGLE_VECTOR_SIZE)

    # Inter-hand features (2 values)
    if len(current_wrists) == 2:
        vector.extend([_dist_3d(current_wrists[0], current_wrists[1]), 1.0])
    else:
        vector.extend([0.0, 0.0])

    # Face features (7 values)
    face = frame.get("face") or []
    if len(face) >= 5:
        try:
            nose = [float(face[0][0]), float(face[0][1]), float(face[0][2])]
            vector.extend([abs(nose[0] - 0.5), nose[1] - 0.5, nose[2]])
            if current_wrists:
                w0 = current_wrists[0]
                vector.extend([abs(w0[0] - nose[0]), w0[1] - nose[1], w0[2] - nose[2]])
            else:
                vector.extend([0.0, 0.0, 0.0])
            vector.append(1.0)
        except (TypeError, ValueError, IndexError):
            vector.extend([0.0] * FACE_VECTOR_SIZE)
    else:
        vector.extend([0.0] * FACE_VECTOR_SIZE)

    return vector, current_wrists


def resample_feature_sequence(
    frames: Sequence[dict[str, Any]], target_length: int = SEQUENCE_LENGTH
) -> list[list[float]]:
    if target_length <= 0:
        raise ValueError("target_length must be positive")
    if not frames:
        return [[0.0] * FRAME_VECTOR_SIZE for _ in range(target_length)]

    vectors: list[list[float]] = []
    prev_wrists: list[list[float]] | None = None
    for frame in frames:
        vec, prev_wrists = frame_feature_vector(frame, prev_wrists)
        vectors.append(vec)

    n = len(vectors)
    if n == target_length:
        return vectors
    if n == 1:
        return [list(vectors[0]) for _ in range(target_length)]

    result: list[list[float]] = []
    for i in range(target_length):
        position = i * (n - 1) / (target_length - 1)
        left = int(position)
        right = min(left + 1, n - 1)
        alpha = position - left
        v_left = vectors[left]
        v_right = vectors[right]
        result.append(
            [v_left[j] + (v_right[j] - v_left[j]) * alpha for j in range(FRAME_VECTOR_SIZE)]
        )
    return result
