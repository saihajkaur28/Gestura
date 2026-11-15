"""
Verification script for GESTURA backend endpoints.
Directly invokes endpoint functions and checks outputs.
"""
import json
import os
import sys

# Add backend directory to sys.path
sys.path.insert(0, os.path.abspath(os.path.dirname(__file__)))

from app.main import health, list_signs, recognition_status, recognition_predict
from app.recognition.schema import PredictRequest
from app.recognition.features import FEATURE_VERSION, FRAME_VECTOR_SIZE, SEQUENCE_LENGTH, resample_feature_sequence


def main():
    print("=" * 65)
    print("GESTURA BACKEND API ENDPOINT VERIFICATION")
    print("=" * 65)

    # 1. Health
    h = health()
    print("\n1. health() ->")
    print(f"   status: {h.get('status')}")
    print(f"   video_signs: {h.get('video_signs')}")
    print(f"   recognition_available: {h.get('recognition_available')}")
    print(f"   recognition_code: {h.get('recognition_code')}")
    assert h.get("status") == "ok"
    assert h.get("recognition_available") is True
    assert h.get("video_signs", 0) > 0

    # 2. List signs
    signs_data = list_signs()
    signs = signs_data.get("signs", [])
    print(f"\n2. list_signs() -> {len(signs)} ISL dictionary videos found")
    assert len(signs) >= 30, f"Expected at least 30 videos, found {len(signs)}"
    for s in signs[:5]:
        print(f"   - {s.get('sign')}: {s.get('video_url')}")

    # 3. Recognition status
    status_data = recognition_status()
    print("\n3. recognition_status() ->")
    print(f"   code: {status_data.get('code')}")
    print(f"   available: {status_data.get('available')}")
    print(f"   featureVersion: {status_data.get('featureVersion')}")
    print(f"   labels: {status_data.get('labels')}")
    print(f"   modelVersion: {status_data.get('modelVersion')}")
    assert status_data.get("code") == "ready"
    assert status_data.get("available") is True
    assert status_data.get("featureVersion") == FEATURE_VERSION
    assert len(status_data.get("labels", [])) == 5

    # 4. Predict: Zero / Neutral Sequence (20 frames of zeros)
    zero_frames = [[0.0] * FRAME_VECTOR_SIZE for _ in range(20)]
    req_zero = PredictRequest(feature_version=FEATURE_VERSION, frames=zero_frames)
    resp = recognition_predict(req_zero)
    zero_res = json.loads(resp.body.decode("utf-8")) if hasattr(resp, "body") else resp
    print("\n4. recognition_predict(20 frames of 0.0) ->")
    print(f"   label: {zero_res.get('label')}")
    print(f"   confidence: {zero_res.get('confidence')}")
    print(f"   unknown: {zero_res.get('unknown')}")
    print(f"   topK: {[(item['label'], round(item['confidence'], 3)) for item in zero_res.get('topK', [])]}")
    assert zero_res.get("unknown") is True, "Zeros should be marked unknown/neutral"

    # 5. Predict: Real Samples from processed dataset
    dataset_path = os.path.join(
        os.path.dirname(__file__), "data", "isl_sequences_bal.jsonl"
    )
    if os.path.exists(dataset_path):
        print(f"\n5. recognition_predict(Real samples from {os.path.basename(dataset_path)}) ->")
        tested = set()
        correct_count = 0
        total_tested = 0
        target_map = {
            "HELLO": "hello",
            "GOODBYE": "goodbye",
            "HELP": "help",
            "THANK_YOU": "thankyou",
        }
        with open(dataset_path, "r", encoding="utf-8") as f:
            for line in f:
                line = line.strip()
                if not line:
                    continue
                sample = json.loads(line)
                raw_lbl = sample.get("label", "").upper()
                if raw_lbl in target_map and target_map[raw_lbl] not in tested:
                    expected = target_map[raw_lbl]
                    tested.add(expected)
                    raw_frames = sample.get("frames", [])
                    seq = resample_feature_sequence(raw_frames, SEQUENCE_LENGTH)
                    req = PredictRequest(feature_version=FEATURE_VERSION, frames=seq)
                    resp = recognition_predict(req)
                    res = json.loads(resp.body.decode("utf-8")) if hasattr(resp, "body") else resp
                    pred = res.get("label")
                    conf = res.get("confidence", 0.0)
                    unk = res.get("unknown")
                    match = (pred == expected)
                    if match:
                        correct_count += 1
                    total_tested += 1
                    print(f"   Target Sign: {expected:<12} -> Predicted: {pred:<12} (Conf: {conf*100:.1f}%, Unknown: {unk}) {'✓ PASS' if match else '✗ FAIL'}")

        print(f"\n   Target Signs Tested: {correct_count}/{total_tested} ({correct_count/total_tested*100:.1f}%)")
        assert correct_count == 4, f"Expected 4 target signs tested, got {correct_count}"

    print("\n" + "=" * 65)
    print("ALL API ENDPOINTS TESTED AND VERIFIED!")
    print("=" * 65)


if __name__ == "__main__":
    main()
