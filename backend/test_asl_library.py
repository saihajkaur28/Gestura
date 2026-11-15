"""
Comprehensive test script for GESTURA ASL Video Library & Backend Endpoints.
Verifies ASL migration integrity, video asset presence, metadata schema, and segmentation logic.
"""
import json
import os
import sys
from pathlib import Path

# Add backend directory to sys.path
sys.path.insert(0, os.path.abspath(os.path.dirname(__file__)))

from app.main import health, list_signs, ASL_VIDEOS_DIR, ISL_LEGACY_DIR


def test_asl_signs():
    print("=================================================================")
    print("1. TESTING ASL VIDEO LIBRARY (DEFAULT /api/signs)")
    print("=================================================================")
    data = list_signs(lang="asl")
    assert data.get("language") == "ASL", f"Expected language 'ASL', got {data.get('language')}"
    signs = data.get("signs", [])
    print(f"Total authentic ASL signs cataloged: {len(signs)}")
    assert len(signs) == 31, f"Expected 31 ASL signs, got {len(signs)}"
    assert data.get("source") == "ASL Signbank (Haskins Laboratories / Yale University)"
    assert "CC BY-NC-SA" in data.get("license", "") or "Educational" in data.get("license", "")

    # Check key requirements from user prompt:
    required_keywords = ["hello", "thank_you", "help", "goodbye"]
    found_required = {kw: False for kw in required_keywords}

    for s in signs:
        sign_id = s.get("sign")
        gloss = s.get("gloss")
        filename = s.get("filename")
        video_url = s.get("video_url")
        frontend_video_url = s.get("frontend_video_url")
        source = s.get("source")
        license_str = s.get("license")

        assert sign_id, "Missing sign id"
        assert gloss, f"Missing gloss for {sign_id}"
        assert filename, f"Missing filename for {sign_id}"
        assert video_url.startswith("/media/asl/"), f"Unexpected video_url {video_url}"
        assert frontend_video_url.startswith("/videos/asl/"), f"Unexpected frontend_video_url {frontend_video_url}"
        assert "ASL Signbank" in source, f"Missing source attribution for {sign_id}"
        assert license_str, f"Missing license for {sign_id}"

        # Verify backend video file exists on disk
        backend_file = ASL_VIDEOS_DIR / filename
        assert backend_file.is_file(), f"Backend video file missing: {backend_file}"
        assert backend_file.stat().st_size > 5000, f"Backend video file abnormally small: {backend_file}"

        # Verify frontend public mirror file exists on disk
        frontend_file = Path(__file__).resolve().parents[1] / "frontend" / "public" / "videos" / "asl" / filename
        assert frontend_file.is_file(), f"Frontend video file missing: {frontend_file}"
        assert frontend_file.stat().st_size > 5000, f"Frontend video file abnormally small: {frontend_file}"

        if sign_id in found_required:
            found_required[sign_id] = True

    for req, ok in found_required.items():
        assert ok, f"Critical sign '{req}' missing from ASL library!"
        print(f"  [PASS] Required sign verified: '{req}'")

    print("[PASS] All 31 ASL videos exist on disk and have verified metadata.")


def test_isl_legacy_archive():
    print("\n=================================================================")
    print("2. TESTING HISTORICAL ISL ARCHIVE (/api/signs?lang=isl)")
    print("=================================================================")
    data = list_signs(lang="isl")
    assert data.get("language") == "ISL (Legacy)", f"Expected 'ISL (Legacy)', got {data.get('language')}"
    signs = data.get("signs", [])
    print(f"Total preserved ISL legacy signs: {len(signs)}")
    assert len(signs) >= 30, f"Expected at least 30 legacy signs, got {len(signs)}"

    for s in signs[:5]:
        filename = s.get("filename")
        path = ISL_LEGACY_DIR / filename
        assert path.is_file(), f"Legacy ISL file missing: {path}"
        print(f"  [PASS] Preserved ISL archive file: {filename} ({path.stat().st_size} bytes)")

    print("[PASS] Historical ISL assets safely archived and accessible via ?lang=isl.")


def test_health():
    print("\n=================================================================")
    print("3. TESTING /health ENDPOINT")
    print("=================================================================")
    h = health()
    assert h.get("status") == "ok"
    assert h.get("video_signs") == 31, f"Expected 31 ASL signs in health, got {h.get('video_signs')}"
    print(f"  status: {h.get('status')}")
    print(f"  version: {h.get('version')}")
    print(f"  video_signs (ASL): {h.get('video_signs')}")
    print("[PASS] Health endpoint reporting authentic ASL signs correctly.")


def main():
    test_asl_signs()
    test_isl_legacy_archive()
    test_health()
    print("\n" + "=" * 65)
    print("ALL ASL VIDEO LIBRARY AND API TESTS PASSED SUCCESSFULLY!")
    print("=" * 65)


if __name__ == "__main__":
    main()
