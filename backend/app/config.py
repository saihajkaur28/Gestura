import os
from pathlib import Path

try:
    from dotenv import load_dotenv
    load_dotenv()
except ImportError:
    pass

PROJECT_ROOT = Path(__file__).resolve().parents[2]


def _split_csv(value: str) -> list[str]:
    return [item.strip() for item in value.split(",") if item.strip()]


APP_NAME = os.getenv("APP_NAME", "GESTURA API")
APP_VERSION = os.getenv("APP_VERSION", "0.1.0")

HOST = os.getenv("HOST", "0.0.0.0")
PORT = int(os.getenv("PORT", "8000"))

CORS_ORIGINS = _split_csv(
    os.getenv(
        "CORS_ORIGINS",
        "http://localhost:5173,http://127.0.0.1:5173,http://localhost:5174,http://127.0.0.1:5174,http://localhost:3000,http://127.0.0.1:3000,http://localhost:8000,http://127.0.0.1:8000",
    )
)

VIDEOS_DIR = Path(
    os.getenv("VIDEOS_DIR", str(PROJECT_ROOT / "videos"))
).expanduser().resolve()

MODELS_DIR = Path(
    os.getenv(
        "MODELS_DIR",
        str(
            PROJECT_ROOT / "backend" / "models" / "asl" / "current"
            if (PROJECT_ROOT / "backend" / "models" / "asl" / "current").is_dir()
            else PROJECT_ROOT / "backend" / "models" / "isl" / "current"
        ),
    )
).expanduser().resolve()

SUPPORTED_VIDEO_EXTENSIONS = {".mp4", ".webm", ".mov", ".m4v", ".ogv"}

# Maritime AI Agents Platform Integration (Hackathon Challenge: Best Use of Maritime)
MARITIME_API_KEY = os.getenv("MARITIME_API_KEY", "")
MARITIME_AGENT_ENDPOINT = os.getenv(
    "MARITIME_AGENT_ENDPOINT", "https://api.maritime.sh/v1/agents"
)
MARITIME_SCALE_TIER = os.getenv(
    "MARITIME_SCALE_TIER", "Scale Tier (VIHAANX Hackathon Access)"
)

# Prune AI Security, Gateway & Cost Reduction (Hackathon Challenge: Best Use of Prune)
PRUNE_API_KEY = os.getenv("PRUNE_API_KEY", "")
PRUNE_GATEWAY_URL = os.getenv(
    "PRUNE_GATEWAY_URL", "https://gateway.useprune.com/v1"
)
PRUNE_PRO_TIER = os.getenv(
    "PRUNE_PRO_TIER", "Prune Pro (Hackathon Access)"
)

