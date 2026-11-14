"""Shared provider dependencies for the Gestura backend.

Providers are instantiated per-request via FastAPI dependency injection so
tests can substitute fakes without touching real AI credentials.
"""

from backend.config import settings
from backend.providers.gemini_provider import GeminiProvider
from backend.providers.whisper_provider import WhisperProvider


def get_gemini_provider() -> GeminiProvider:
    return GeminiProvider(api_key=settings.gemini_api_key)


def get_whisper_provider() -> WhisperProvider:
    return WhisperProvider(model_path=settings.whisper_model_path)
