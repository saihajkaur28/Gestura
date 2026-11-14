import os
from pathlib import Path

from dotenv import load_dotenv

load_dotenv()

PROJECT_ROOT = Path(__file__).resolve().parents[2]


def _split_csv(value: str) -> list[str]:
    return [item.strip() for item in value.split(",") if item.strip()]


APP_NAME = os.getenv("APP_NAME", "OUTLOUD API")
APP_VERSION = os.getenv("APP_VERSION", "0.1.0")

HOST = os.getenv("HOST", "127.0.0.1")
PORT = int(os.getenv("PORT", "8000"))

CORS_ORIGINS = _split_csv(
    os.getenv(
        "CORS_ORIGINS",
        "http://localhost:5173,http://127.0.0.1:5173",
    )
)

VIDEOS_DIR = Path(
    os.getenv("VIDEOS_DIR", str(PROJECT_ROOT / "videos"))
).expanduser().resolve()

SUPPORTED_VIDEO_EXTENSIONS = {".mp4", ".webm", ".mov", ".m4v", ".ogv"}
