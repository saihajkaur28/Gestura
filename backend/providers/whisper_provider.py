"""Whisper provider for authorized speech transcription (server-side only)."""

from typing import Any


class WhisperProviderError(Exception):
    """Base error for Whisper provider failures."""


class WhisperUnavailableError(WhisperProviderError):
    """Raised when Whisper is not available or cannot process audio."""


class WhisperProvider:
    def __init__(self, model_path: str | None = None) -> None:
        self.model_path = model_path or "base"

    def transcribe(self, audio_bytes: bytes, language: str | None = None) -> list[dict[str, Any]]:
        if not audio_bytes:
            raise WhisperProviderError("Audio bytes are required for transcription")
        try:
            import whisper  # type: ignore[import-not-found]
        except Exception as exc:
            raise WhisperUnavailableError("Whisper is not installed") from exc

        model = whisper.load_model(self.model_path)
        raw = model.transcribe(audio_bytes, language=language)
        raw_segments = getattr(raw, "segments", None) or []
        if not raw_segments and isinstance(raw, dict):
            raw_segments = raw.get("segments") or []
        segments: list[dict[str, Any]] = []
        for seg in raw_segments or []:
            start = float(getattr(seg, "start", 0.0) or 0.0)
            end = float(getattr(seg, "end", start) or start)
            segments.append(
                {
                    "start": start,
                    "end": end,
                    "text": str(getattr(seg, "text", "") or ""),
                    "confidence": None,
                }
            )
        return segments
