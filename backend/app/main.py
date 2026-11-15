import json
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
    allow_origin_regex=r"^https?://(localhost|127\.0\.0\.1)(:[0-9]+)?$",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

ASL_VIDEOS_DIR = VIDEOS_DIR / "asl"
ISL_LEGACY_DIR = VIDEOS_DIR / "isl_legacy"
ASL_CATALOG_PATH = Path(__file__).resolve().parents[1] / "data" / "asl_catalog.json"


def scan_asl_videos() -> dict[str, Path]:
    """Return {sign_name: video_path} for authentic ASL video clips."""
    if not ASL_VIDEOS_DIR.is_dir():
        return {}
    return {
        file.stem.lower(): file
        for file in sorted(ASL_VIDEOS_DIR.iterdir())
        if file.is_file() and file.suffix.lower() in SUPPORTED_VIDEO_EXTENSIONS
    }


def scan_isl_legacy_videos() -> dict[str, Path]:
    """Return {sign_name: video_path} for historical ISL clips preserved for archival."""
    if not ISL_LEGACY_DIR.is_dir():
        return {}
    return {
        file.stem.lower(): file
        for file in sorted(ISL_LEGACY_DIR.iterdir())
        if file.is_file() and file.suffix.lower() in SUPPORTED_VIDEO_EXTENSIONS
    }


def scan_sign_videos() -> dict[str, Path]:
    """Legacy compatibility scanner: defaults to authentic ASL clips."""
    return scan_asl_videos()


@app.get("/")
def root() -> dict[str, str]:
    return {
        "app": APP_NAME,
        "version": APP_VERSION,
        "docs": "/docs",
        "health": "/health",
        "recognition": "/api/recognition/status",
        "signs": "/api/signs",
    }


@app.get("/health")
def health() -> dict[str, object]:
    asl_signs = scan_asl_videos()
    isl_signs = scan_isl_legacy_videos()
    recognition = get_recognition_service(MODELS_DIR).status()
    return {
        "status": "ok",
        "app": APP_NAME,
        "version": APP_VERSION,
        "time": datetime.now(timezone.utc).isoformat(),
        "asl_library_active": True,
        "asl_video_signs": len(asl_signs),
        "isl_legacy_signs": len(isl_signs),
        "video_signs": len(asl_signs),
        "recognition_available": bool(recognition.get("available")),
        "recognition_code": recognition.get("code"),
    }


@app.get("/api/signs")
def list_signs(lang: str = "asl") -> dict[str, object]:
    """List available signs. Defaults to authentic ASL library."""
    if lang.lower() == "isl":
        isl_signs = scan_isl_legacy_videos()
        return {
            "language": "ISL (Legacy)",
            "legacy": True,
            "count": len(isl_signs),
            "signs": [
                {
                    "sign": name,
                    "filename": video.name,
                    "video_url": f"/media/isl_legacy/{quote(video.name)}",
                }
                for name, video in isl_signs.items()
            ],
        }

    # ASL catalog with full metadata
    if ASL_CATALOG_PATH.is_file():
        try:
            with open(ASL_CATALOG_PATH, "r", encoding="utf-8") as f:
                catalog = json.load(f)
            return {
                "language": "ASL",
                "count": len(catalog),
                "source": "ASL Signbank (Haskins Laboratories / Yale University)",
                "license": "Educational and Non-Commercial Research Use with Attribution",
                "signs": [
                    {
                        "sign": item["id"],
                        "gloss": item["gloss"],
                        "keywords": item["keywords"],
                        "filename": item["filename"],
                        "video_url": item["video_url"],
                        "frontend_video_url": item.get("frontend_video_url", f"/videos/asl/{item['filename']}"),
                        "source": item["source"],
                        "attribution": item["attribution"],
                        "license": item["license"],
                        "status": item["status"],
                        "description": item["description"],
                        "category": item["category"],
                        "avatar_animation": item.get("avatar_animation"),
                    }
                    for item in catalog
                ],
            }
        except Exception:
            pass

    asl_signs = scan_asl_videos()
    return {
        "language": "ASL",
        "count": len(asl_signs),
        "source": "ASL Signbank (Haskins Laboratories / Yale University)",
        "license": "Educational and Non-Commercial Research Use with Attribution",
        "signs": [
            {
                "sign": name,
                "gloss": name.upper(),
                "keywords": [name],
                "filename": video.name,
                "video_url": f"/media/asl/{quote(video.name)}",
                "frontend_video_url": f"/videos/asl/{quote(video.name)}",
                "source": "ASL Signbank (Haskins Laboratories / Yale University)",
                "status": "available",
            }
            for name, video in asl_signs.items()
        ],
    }


@app.get("/media/asl/{filename}")
def get_asl_video(filename: str) -> FileResponse:
    video_path = ASL_VIDEOS_DIR / filename
    if not video_path.is_file():
        raise HTTPException(status_code=404, detail="ASL video not found")
    return FileResponse(video_path)


@app.get("/media/isl_legacy/{filename}")
def get_isl_legacy_video(filename: str) -> FileResponse:
    video_path = ISL_LEGACY_DIR / filename
    if not video_path.is_file():
        raise HTTPException(status_code=404, detail="Legacy ISL video not found")
    return FileResponse(video_path)


@app.get("/media/{sign}/{filename}")
def get_video(sign: str, filename: str) -> FileResponse:
    if sign == "asl":
        return get_asl_video(filename)
    if sign == "isl_legacy":
        return get_isl_legacy_video(filename)
    asl_video = ASL_VIDEOS_DIR / filename
    if asl_video.is_file():
        return FileResponse(asl_video)
    isl_video = ISL_LEGACY_DIR / filename
    if isl_video.is_file():
        return FileResponse(isl_video)
    raise HTTPException(status_code=404, detail="Video not found")


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
