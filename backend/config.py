"""Runtime configuration for the Gestura backend.

All AI credentials and model paths are read from environment variables on the
server side. Browser extension code and content scripts never receive secrets.
"""

import os

GESTURA_FEATURE_VERSION = int(os.environ.get("GESTURA_FEATURE_VERSION") or "1")


class Settings:
    def __init__(self) -> None:
        self.gemini_api_key = os.environ.get("GEMINI_API_KEY") or None
        self.whisper_model_path = os.environ.get("WHISPER_MODEL_PATH") or "base"
        self.genasl_base_url = os.environ.get("GENASL_BASE_URL") or "http://127.0.0.1:8794"
        self.host = os.environ.get("GESTURA_HOST") or "127.0.0.1"
        self.port = int(os.environ.get("GESTURA_PORT") or "8000")
        raw_origins = os.environ.get("GESTURA_CORS_ORIGINS") or "http://localhost:5173,http://localhost:4173"
        self.cors_origins = [origin.strip() for origin in raw_origins.split(",") if origin.strip()]


settings = Settings()
