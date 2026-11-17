"""
ASL Video Motion Extraction, Landmark Tracking & 3D Skeletal Retargeting Pipeline.
GESTURA Autonomous Processing Tool.

Extracts frame-by-frame 3D hand and arm kinematics from authentic ASL reference videos
using OpenCV and MediaPipe Tasks HandLandmarker. Retargets joint rotations to the
Mixamo/GESTURA skeletal hierarchy (MCP, PIP, DIP angles + wrist/shoulder/elbow orientation).
"""

import argparse
import glob
import json
import math
import os
import sys
from typing import Any, Dict, List, Optional, Tuple

import cv2
import numpy as np

# Suppress TensorFlow / MediaPipe verbose warnings
os.environ['TF_CPP_MIN_LOG_LEVEL'] = '2'
os.environ['MPLCONFIGDIR'] = os.path.join(os.path.expanduser('~'), '.matplotlib_tmp')

import mediapipe as mp
from mediapipe.tasks import python as mp_python
from mediapipe.tasks.python import vision


def calculate_joint_angle(p1: np.ndarray, p2: np.ndarray, p3: np.ndarray) -> float:
    """Calculates interior flexion angle at joint p2 formed by vectors (p1 - p2) and (p3 - p2).

    Returns flexion in radians (0.0 = straight/extended, ~1.57 = 90 deg bend).
    """
    v1 = p1 - p2
    v2 = p3 - p2
    norm1 = np.linalg.norm(v1)
    norm2 = np.linalg.norm(v2)
    if norm1 < 1e-6 or norm2 < 1e-6:
        return 0.0
    cosine = np.dot(v1, v2) / (norm1 * norm2)
    cosine = np.clip(cosine, -1.0, 1.0)
    # When finger is straight, v1 and v2 point in opposite directions -> cosine ~ -1 -> angle ~ pi
    # Flexion is deviation from straight: pi - arccos(cosine)
    flexion = math.pi - math.acos(cosine)
    return max(0.0, float(flexion))


def calculate_finger_spread(mcp: np.ndarray, tip: np.ndarray, wrist: np.ndarray, middle_mcp: np.ndarray) -> float:
    """Calculates finger abduction/adduction angle relative to the middle finger axis."""
    hand_axis = middle_mcp - wrist
    finger_vec = tip - mcp
    norm_h = np.linalg.norm(hand_axis)
    norm_f = np.linalg.norm(finger_vec)
    if norm_h < 1e-6 or norm_f < 1e-6:
        return 0.0
    # Cross product z-component to determine sign of spread
    cross_z = hand_axis[0] * finger_vec[1] - hand_axis[1] * finger_vec[0]
    cosine = np.dot(hand_axis[:2], finger_vec[:2]) / (norm_h * norm_f)
    angle = math.acos(np.clip(cosine, -1.0, 1.0))
    spread = angle if cross_z > 0 else -angle
    return float(np.clip(spread, -0.6, 0.6))


def process_hand_landmarks(landmarks: List[Any]) -> Dict[str, Any]:
    """Converts 21 MediaPipe 3D normalized landmarks into articulated 5-finger joint poses."""
    pts = np.array([[lm.x, lm.y, lm.z] for lm in landmarks])

    wrist = pts[0]
    thumb_cmc, thumb_mcp, thumb_ip, thumb_tip = pts[1], pts[2], pts[3], pts[4]
    index_mcp, index_pip, index_dip, index_tip = pts[5], pts[6], pts[7], pts[8]
    mid_mcp, mid_pip, mid_dip, mid_tip = pts[9], pts[10], pts[11], pts[12]
    ring_mcp, ring_pip, ring_dip, ring_tip = pts[13], pts[14], pts[15], pts[16]
    pinky_mcp, pinky_pip, pinky_dip, pinky_tip = pts[17], pts[18], pts[19], pts[20]

    # Thumb: 2 primary flexion angles + spread
    thumb_mcp_flex = calculate_joint_angle(thumb_cmc, thumb_mcp, thumb_ip)
    thumb_pip_flex = calculate_joint_angle(thumb_mcp, thumb_ip, thumb_tip)
    thumb_spread = float(np.linalg.norm(thumb_tip[:2] - index_mcp[:2]))

    # Index finger
    idx_mcp_flex = calculate_joint_angle(wrist, index_mcp, index_pip)
    idx_pip_flex = calculate_joint_angle(index_mcp, index_pip, index_dip)
    idx_dip_flex = calculate_joint_angle(index_pip, index_dip, index_tip)
    idx_spread = calculate_finger_spread(index_mcp, index_tip, wrist, mid_mcp)

    # Middle finger
    mid_mcp_flex = calculate_joint_angle(wrist, mid_mcp, mid_pip)
    mid_pip_flex = calculate_joint_angle(mid_mcp, mid_pip, mid_dip)
    mid_dip_flex = calculate_joint_angle(mid_pip, mid_dip, mid_tip)

    # Ring finger
    ring_mcp_flex = calculate_joint_angle(wrist, ring_mcp, ring_pip)
    ring_pip_flex = calculate_joint_angle(ring_mcp, ring_pip, ring_dip)
    ring_dip_flex = calculate_joint_angle(ring_pip, ring_dip, ring_tip)
    ring_spread = calculate_finger_spread(ring_mcp, ring_tip, wrist, mid_mcp)

    # Pinky finger
    pky_mcp_flex = calculate_joint_angle(wrist, pinky_mcp, pinky_pip)
    pky_pip_flex = calculate_joint_angle(pinky_mcp, pinky_pip, pinky_dip)
    pky_dip_flex = calculate_joint_angle(pinky_pip, pinky_dip, pinky_tip)
    pky_spread = calculate_finger_spread(pinky_mcp, pinky_tip, wrist, mid_mcp)

    return {
        'thumb': {
            'mcp': round(float(np.clip(thumb_mcp_flex * 0.8, 0.0, 1.4)), 3),
            'pip': round(float(np.clip(thumb_pip_flex * 0.8, 0.0, 1.4)), 3),
            'dip': 0.05,
            'spread': round(float(np.clip(thumb_spread, 0.1, 0.6)), 3),
        },
        'index': {
            'mcp': round(float(np.clip(idx_mcp_flex, 0.0, 1.5)), 3),
            'pip': round(float(np.clip(idx_pip_flex, 0.0, 1.5)), 3),
            'dip': round(float(np.clip(idx_dip_flex, 0.0, 1.4)), 3),
            'spread': round(idx_spread, 3),
        },
        'middle': {
            'mcp': round(float(np.clip(mid_mcp_flex, 0.0, 1.5)), 3),
            'pip': round(float(np.clip(mid_pip_flex, 0.0, 1.5)), 3),
            'dip': round(float(np.clip(mid_dip_flex, 0.0, 1.4)), 3),
            'spread': 0.0,
        },
        'ring': {
            'mcp': round(float(np.clip(ring_mcp_flex, 0.0, 1.5)), 3),
            'pip': round(float(np.clip(ring_pip_flex, 0.0, 1.5)), 3),
            'dip': round(float(np.clip(ring_dip_flex, 0.0, 1.4)), 3),
            'spread': round(ring_spread, 3),
        },
        'pinky': {
            'mcp': round(float(np.clip(pky_mcp_flex, 0.0, 1.5)), 3),
            'pip': round(float(np.clip(pky_pip_flex, 0.0, 1.5)), 3),
            'dip': round(float(np.clip(pky_dip_flex, 0.0, 1.4)), 3),
            'spread': round(pky_spread, 3),
        },
        'wrist_pos': [round(float(wrist[0]), 3), round(float(wrist[1]), 3), round(float(wrist[2]), 3)],
    }


def estimate_arm_angles(wrist_pos: List[float], is_right: boolean = True) -> Tuple[List[float], List[float], List[float]]:
    """Estimates shoulder [pitch, yaw, roll], elbow [flexion, twist], and wrist [pitch, yaw, roll]

    from normalized 2D/3D wrist position in camera frame.
    """
    wx, wy, wz = wrist_pos

    # Vertical position in frame: wy in [0 (top) .. 1 (bottom)]
    # Shoulder pitch: higher hand -> larger pitch
    s_pitch = round(float(np.clip((0.7 - wy) * 1.8, -0.3, 1.2)), 3)
    # Lateral position: wx in [0 (left) .. 1 (right)]
    s_yaw = round(float(np.clip((wx - 0.5) * 1.5, -0.8, 0.8)), 3)
    s_roll = round(float(-0.2 if is_right else 0.2), 3)

    # Elbow flexion: bent when hand is raised towards face/chest
    elbow_flex = round(float(np.clip(0.4 + (0.8 - wy) * 1.6, 0.2, 2.0)), 3)
    elbow_twist = round(float(0.3 if is_right else -0.3), 3)

    # Wrist pitch / yaw / roll
    w_pitch = round(float(np.clip((0.5 - wy) * 0.8, -0.6, 0.6)), 3)
    w_yaw = round(float(np.clip(s_yaw * 0.5, -0.5, 0.5)), 3)
    w_roll = round(float(0.1 if is_right else -0.1), 3)

    return [s_pitch, s_yaw, s_roll], [elbow_flex, elbow_twist], [w_pitch, w_yaw, w_roll]


def extract_asl_video_motion(
    video_path: str,
    sign_id: str,
    gloss: str,
    model_path: str,
    target_keyframes: int = 12,
) -> Optional[Dict[str, Any]]:
    """Extracts synchronized ASL motion from a single reference video."""
    if not os.path.exists(video_path):
        print(f"[Error] Video not found: {video_path}")
        return None

    cap = cv2.VideoCapture(video_path)
    total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
    fps = cap.get(cv2.CAP_PROP_FPS) or 30.0
    duration_sec = total_frames / fps if total_frames > 0 else 2.0

    if total_frames < 3:
        cap.release()
        return None

    base_options = mp_python.BaseOptions(model_asset_path=model_path)
    options = vision.HandLandmarkerOptions(
        base_options=base_options,
        num_hands=2,
        min_hand_detection_confidence=0.4,
        min_hand_presence_confidence=0.4,
    )
    detector = vision.HandLandmarker.create_from_options(options)

    # Sample uniformly across the video duration
    sample_indices = np.linspace(0, total_frames - 1, target_keyframes, dtype=int)
    raw_keyframes = []

    for frame_idx in sample_indices:
        cap.set(cv2.CAP_PROP_POS_FRAMES, frame_idx)
        ret, frame = cap.read()
        if not ret:
            continue

        rgb_frame = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
        mp_image = mp.Image(image_format=mp.ImageFormat.SRGB, data=rgb_frame)
        result = detector.detect(mp_image)

        t_norm = round(float(frame_idx / (total_frames - 1)), 3)

        right_hand_data = None
        left_hand_data = None

        if result.hand_landmarks:
            for idx, hand_lms in enumerate(result.hand_landmarks):
                handedness = 'Right'
                if result.handedness and idx < len(result.handedness):
                    handedness = result.handedness[idx][0].category_name

                processed = process_hand_landmarks(hand_lms)
                # Note: MediaPipe mirrored camera vs standard
                if handedness == 'Right' or (len(result.hand_landmarks) == 1 and not right_hand_data):
                    right_hand_data = processed
                else:
                    left_hand_data = processed

        raw_keyframes.append({
            't': t_norm,
            'right': right_hand_data,
            'left': left_hand_data,
        })

    cap.release()
    detector.close()

    if not raw_keyframes:
        return None

    # Construct complete AslKeyframe tracks with forward/backward fill for occluded frames
    final_keyframes = []
    last_valid_right = None
    last_valid_left = None

    # Find first valid hand poses
    for kf in raw_keyframes:
        if kf['right'] and not last_valid_right:
            last_valid_right = kf['right']
        if kf['left'] and not last_valid_left:
            last_valid_left = kf['left']

    # Fallback resting hand pose if completely undetected
    default_resting_hand = {
        'thumb': {'mcp': 0.3, 'pip': 0.2, 'dip': 0.05, 'spread': 0.3},
        'index': {'mcp': 0.4, 'pip': 0.5, 'dip': 0.4, 'spread': 0.1},
        'middle': {'mcp': 0.45, 'pip': 0.5, 'dip': 0.4, 'spread': 0.0},
        'ring': {'mcp': 0.45, 'pip': 0.5, 'dip': 0.4, 'spread': -0.1},
        'pinky': {'mcp': 0.4, 'pip': 0.5, 'dip': 0.4, 'spread': -0.2},
        'wrist_pos': [0.65, 0.65, 0.0],
    }

    if not last_valid_right:
        last_valid_right = default_resting_hand
    if not last_valid_left:
        last_valid_left = {**default_resting_hand, 'wrist_pos': [0.35, 0.65, 0.0]}

    for kf in raw_keyframes:
        r_hand = kf['right'] or last_valid_right
        l_hand = kf['left'] or last_valid_left
        last_valid_right = r_hand
        last_valid_left = l_hand

        # Compute arm joints from wrist trajectory
        r_s, r_e, r_w = estimate_arm_angles(r_hand['wrist_pos'], is_right=True)
        l_s, l_e, l_w = estimate_arm_angles(l_hand['wrist_pos'], is_right=False)

        final_keyframes.append({
            't': kf['t'],
            'rightArm': {
                'shoulder': r_s,
                'elbow': r_e,
                'wrist': r_w,
                'hand': {k: v for k, v in r_hand.items() if k != 'wrist_pos'},
            },
            'leftArm': {
                'shoulder': l_s,
                'elbow': l_e,
                'wrist': l_w,
                'hand': {k: v for k, v in l_hand.items() if k != 'wrist_pos'},
            },
            'head': [0.0, 0.0, 0.0],
            'spine': [0.0, 0.0],
        })

    return {
        'id': sign_id,
        'gloss': gloss,
        'durationSec': round(float(duration_sec), 2),
        'description': f'Authentic ASL motion capture retargeted from reference video ({total_frames} frames)',
        'source_video': os.path.basename(video_path),
        'keyframes': final_keyframes,
    }


def main():
    parser = argparse.ArgumentParser(description='GESTURA ASL Video-to-3D Motion Extraction')
    parser.add_argument('--input-dir', type=str, default='frontend/public/videos/alphabet', help='Directory with ASL videos')
    parser.add_argument('--model-path', type=str, default='frontend/public/models/hand_landmarker.task', help='Path to hand_landmarker.task')
    parser.add_argument('--output-json', type=str, default='backend/data/extracted_asl_animations.json', help='Output JSON path')
    args = parser.parse_args()

    os.makedirs(os.path.dirname(args.output_json), exist_ok=True)
    video_files = glob.glob(os.path.join(args.input_dir, '*.mp4'))
    print(f"Found {len(video_files)} video files in {args.input_dir}")

    results = {}
    success_count = 0
    fail_count = 0

    for vid in video_files:
        base_name = os.path.splitext(os.path.basename(vid))[0]
        sign_id = base_name.lower().replace('-', '_')
        gloss = base_name.upper()
        print(f"Processing: {vid} (ID: {sign_id})...")

        try:
            anim = extract_asl_video_motion(vid, sign_id, gloss, args.model_path)
            if anim:
                results[sign_id] = anim
                success_count += 1
                print(f"  ✓ Success: {len(anim['keyframes'])} keyframes generated.")
            else:
                fail_count += 1
                print("  ✗ Failed extraction.")
        except Exception as e:
            fail_count += 1
            print(f"  ✗ Error: {e}")

    with open(args.output_json, 'w', encoding='utf-8') as f:
        json.dump(results, f, indent=2)

    print("\n--- Summary ---")
    print(f"Total processed: {len(video_files)}")
    print(f"Successful 3D animations: {success_count}")
    print(f"Failed conversions: {fail_count}")
    print(f"Saved to: {args.output_json}")


if __name__ == '__main__':
    main()
