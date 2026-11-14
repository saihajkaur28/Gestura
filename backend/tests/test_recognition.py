"""Backend recognition endpoint tests."""

from fastapi.testclient import TestClient

from backend.main import app

client = TestClient(app)


def test_health():
    r = client.get("/health")
    assert r.status_code == 200
    assert r.json()["status"] == "ok"


def test_recognition_status():
    r = client.get("/v1/recognition/status")
    assert r.status_code == 200
    body = r.json()
    assert body["feature_version"] == 1
    assert body["frame_vector_size"] == 130
    assert body["sequence_length"] == 32
    assert body["model_loaded"] is False


def test_predict_wrong_frame_count():
    r = client.post("/v1/recognition/predict", json={"sequence": [[0.0] * 130], "feature_version": 1})
    assert r.status_code == 400


def test_predict_wrong_feature_size():
    seq = [[0.0] * 129 for _ in range(32)]
    r = client.post("/v1/recognition/predict", json={"sequence": seq, "feature_version": 1})
    assert r.status_code == 400


def test_predict_non_finite():
    seq = [[0.0] * 130 for _ in range(32)]
    seq[0][0] = float("nan")
    r = client.post("/v1/recognition/predict", json={"sequence": seq, "feature_version": 1})
    assert r.status_code == 400


def test_predict_feature_version_mismatch():
    seq = [[0.0] * 130 for _ in range(32)]
    r = client.post("/v1/recognition/predict", json={"sequence": seq, "feature_version": 999})
    assert r.status_code == 400


def test_predict_no_model_returns_unavailable():
    seq = [[0.0] * 130 for _ in range(32)]
    r = client.post("/v1/recognition/predict", json={"sequence": seq, "feature_version": 1})
    assert r.status_code == 200
    body = r.json()
    assert body["status"] == "model_unavailable"
    assert body["label"] == "unknown"