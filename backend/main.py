"""Gestura FastAPI application entrypoint."""

from typing import Any

from fastapi import Depends, FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

from backend.config import GESTURA_FEATURE_VERSION, settings
from backend.dependencies import get_gemini_provider
from backend.providers.gemini_provider import GeminiProvider, GeminiUnavailableError

app = FastAPI(title="Gestura API", version="0.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


class CaptionInterpretRequest(BaseModel):
    segments: list = Field(default_factory=list)
    context: dict = Field(default_factory=dict)


class CaptionInterpretResponse(BaseModel):
    interpretation: dict = Field(default_factory=dict)
    transcript: str = ""
    disclaimer: str = ""


@app.get("/health")
def root_health() -> dict[str, Any]:
    return {"status": "ok", "service": "gestura-api", "feature_version": GESTURA_FEATURE_VERSION}


@app.post("/v1/captions/interpret")
def interpret_captions(
    request: CaptionInterpretRequest,
    provider: GeminiProvider = Depends(get_gemini_provider),
) -> CaptionInterpretResponse:
    transcript = " ".join(
        str(segment.get("text") or segment.get("caption") or "")
        for segment in request.segments
        if isinstance(segment, dict)
    )
    try:
        result = provider.interpret_caption_text(transcript, request.context)
    except GeminiUnavailableError:
        return CaptionInterpretResponse(
            interpretation={},
            transcript=transcript,
            disclaimer="AI interpretation is unavailable because the Gestura backend Gemini credential is not configured.",
        )
    raw_text = str(result.get("raw_text") or "")
    return CaptionInterpretResponse(
        interpretation={"summary": raw_text, "bullets": [raw_text] if raw_text else []},
        transcript=transcript,
        disclaimer="AI-generated language output. Interpretations are assistive and require human sign validation.",
    )
