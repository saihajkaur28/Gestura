"""Gemini provider for the Gestura backend.

The API key is read from server environment variables only. The provider is
used for language processing, contextual assistance, summarization and
orchestration. It never invents sign motion and never claims generated text is
an accurate ISL translation without linguistic and signer validation.
"""

import os
from typing import Any, Protocol


class GeminiProviderError(Exception):
    """Base error for Gemini provider failures."""


class GeminiUnavailableError(GeminiProviderError):
    """Raised when the Gemini credential or SDK is missing or unusable."""


class GeminiProvider(Protocol):
    def interpret_caption_text(self, text: str, context: dict[str, Any]) -> dict[str, Any]: ...

    def summarize(self, text: str) -> str: ...


class GeminiProvider:
    def __init__(self, api_key: str | None = None) -> None:
        self.api_key = api_key or None

    def _client(self) -> Any:
        if not self.api_key:
            raise GeminiUnavailableError("GEMINI_API_KEY is not configured on the Gestura backend")
        try:
            import google.generativeai as genai  # type: ignore[import-not-found]
        except Exception as exc:
            raise GeminiUnavailableError("Gemini SDK is not installed") from exc
        genai.configure(api_key=self.api_key)
        return genai

    def _model(self, genai: Any, model_name: str) -> Any:
        return genai.GenerativeModel(model_name)

    def interpret_caption_text(self, text: str, context: dict[str, Any]) -> dict[str, Any]:
        genai = self._client()
        model_name = os.environ.get("GESTURA_GEMINI_MODEL") or "gemini-1.5-flash"
        model = self._model(genai, model_name)
        response = model.generate_content(
            "You process sign-language caption transcripts. Return a JSON object with keys "
            "'interpretation' and 'summary'. Do not invent sign motion. "
            f"Transcript:\n{text}\nContext: {context}"
        )
        return {
            "model": model_name,
            "raw_text": getattr(response, "text", None) or "",
        }

    def summarize(self, text: str) -> str:
        genai = self._client()
        model_name = os.environ.get("GESTURA_GEMINI_MODEL") or "gemini-1.5-flash"
        model = self._model(genai, model_name)
        response = model.generate_content(f"Summarize the following sign-language caption transcript:\n{text}")
        return response.text or ""
