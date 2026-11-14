from datetime import datetime, timezone
from pathlib import Path
from urllib.parse import quote

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse

from .config import (
    APP_NAME,
    APP_VERSION,
    CORS_ORIGINS,
    SUPPORTED_VIDEO_EXTENSIONS,
    VIDEOS_DIR,
)

app = FastAPI(title=APP_NAME, version=APP_VERSION)

app.add_middleware(
    CORSMiddleware,
    allow_origins=CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["GET"],
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
    }


@app.get("/health")
def health() -> dict[str, object]:
    signs = scan_sign_videos()
    return {
        "status": "ok",
        "app": APP_NAME,
        "version": APP_VERSION,
        "time": datetime.now(timezone.utc).isoformat(),
        "videos_dir": str(VIDEOS_DIR),
        "videos_dir_exists": VIDEOS_DIR.is_dir(),
        "video_signs": len(signs),
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
