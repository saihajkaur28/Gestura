from datetime import datetime, timezone
from pathlib import Path
from urllib.parse import quote

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, JSONResponse

from .config import (
    APP_NAME,
    APP_VERSION,
    CORS_ORIGINS,
    MODELS_DIR,
    SUPPORTED_VIDEO_EXTENSIONS,
    VIDEOS_DIR,
)
from .recognition.features import FEATURE_VERSION, FRAME_VECTOR_SIZE, SEQUENCE_LENGTH
from .recognition.schema import PredictRequest
from .recognition.service import ModelUnavailableError, get_recognition_service

app = FastAPI(title=APP_NAME, version=APP_VERSION)

app.add_middleware(
    CORSMiddleware,
    allow_origins=CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["GET", "POST"],
    allow_headers=["*"],
)


def scan_sign_videos() -> dict[str, Path]:
    """Return {sign_name: video_path} for the videos currently on disk.

    A sign folder contributes only if it contains at least one supported video
    file. Nothing is invented for missing folders or clips.
    """
    if not VIDEOS_DIR.is_dir():
        return {}

    signs: dict[str, Path] = {}
    for entry in sorted(VIDEOS_DIR.iterdir()):
        if not entry.is_dir():
            continue
        videos = [
            file
            for file in sorted(entry.iterdir())
            if file.is_file() and file.suffix.lower() in SUPPORTED_VIDEO_EXTENSIONS
        ]
        if not videos:
            continue
        preferred = next(
            (video for video in videos if video.stem.lower() == entry.name.lower()),
            videos[0],
        )
        signs[entry.name] = preferred
    return signs


@app.get("/")
def root() -> dict[str, str]:
    return {
        "app": APP_NAME,
        "version": APP_VERSION,
        "docs": "/docs",
        "health": "/health",
        "recognition": "/api/recognition/status",
    }


@app.get("/health")
def health() -> dict[str, object]:
    signs = scan_sign_videos()
    recognition = get_recognition_service(MODELS_DIR).status()
    return {
        "status": "ok",
        "app": APP_NAME,
        "version": APP_VERSION,
        "time": datetime.now(timezone.utc).isoformat(),
        "videos_dir": str(VIDEOS_DIR),
        "videos_dir_exists": VIDEOS_DIR.is_dir(),
        "video_signs": len(signs),
        "recognition_available": bool(recognition.get("available")),
        "recognition_code": recognition.get("code"),
    }


@app.get("/api/signs")
def list_signs() -> dict[str, object]:
    signs = scan_sign_videos()
    return {
        "videos_dir": str(VIDEOS_DIR),
        "count": len(signs),
        "signs": [
            {
                "sign": name,
                "filename": video.name,
                "video_url": f"/media/{quote(name)}/{quote(video.name)}",
            }
            for name, video in signs.items()
        ],
    }


@app.get("/media/{sign}/{filename}")
def get_video(sign: str, filename: str) -> FileResponse:
    # Only serve files that were found by the directory scan. This prevents
    # path traversal and avoids exposing arbitrary files on disk.
    video = scan_sign_videos().get(sign)
    if video is None or video.name != filename:
        raise HTTPException(status_code=404, detail="Video not found")
    return FileResponse(video)


@app.get("/api/recognition/status")
def recognition_status() -> dict[str, object]:
    return get_recognition_service(MODELS_DIR).status()


@app.post("/api/recognition/predict")
def recognition_predict(request: PredictRequest) -> JSONResponse:
    if request.feature_version != FEATURE_VERSION:
        raise HTTPException(
            status_code=422,
            detail=(
                f"featureVersion must be {FEATURE_VERSION}, "
                f"received {request.feature_version}."
            ),
        )
    expected_size = FRAME_VECTOR_SIZE
    for frame in request.frames:
        if len(frame) != expected_size:
            raise HTTPException(
                status_code=422,
                detail=(
                    f"Each frame must contain {expected_size} feature values, "
                    f"received {len(frame)}."
                ),
            )

    try:
        result = get_recognition_service(MODELS_DIR).predict(request.frames)
    except ModelUnavailableError as error:
        return JSONResponse(
            status_code=503,
            content={
                "code": error.code,
                "detail": error.reason,
                "featureVersion": FEATURE_VERSION,
                "sequenceLength": SEQUENCE_LENGTH,
            },
        )
    except ValueError as error:
        raise HTTPException(status_code=422, detail=str(error)) from error

    return JSONResponse(content=result)
