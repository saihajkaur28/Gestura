"""Gestura FastAPI application entrypoint."""

from typing import Any

from fastapi import Depends, FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

from backend.config import GESTURA_FEATURE_VERSION, settings
from backend.dependencies import get_gemini_provider
from backend.providers.gemini_provider import GeminiProvider, GeminiUnavailableError

def _is_finite(v):
    import math
    return isinstance(v, (int, float)) and not isinstance(v, bool) and math.isfinite(v)


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


# ---- ISL recognition (Sign-to-Text) ----

class RecognitionPredictRequest(BaseModel):
    sequence: list = Field(default_factory=list)
    feature_version: int = Field(default=GESTURA_FEATURE_VERSION)


class RecognitionPredictResponse(BaseModel):
    label: str = "unknown"
    confidence: float = 0.0
    status: str = "model_unavailable"
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


# ---- ISL recognition model (loaded once per process) ----

_ISL_MODEL = None
_ISL_MODEL_LOADED = False
_ISL_MODEL_ERROR = None


def _load_isl_model():
    global _ISL_MODEL, _ISL_MODEL_LOADED, _ISL_MODEL_ERROR
    if _ISL_MODEL_LOADED:
        return _ISL_MODEL
    _ISL_MODEL_LOADED = True
    path = settings.isl_model_path
    if not path:
        _ISL_MODEL_ERROR = "ISL_MODEL_PATH is not configured"
        return None
    import os
    if not os.path.isfile(path):
        _ISL_MODEL_ERROR = "ISL model file not found: " + path
        return None
    try:
        import torch  # type: ignore
    except Exception as exc:
        _ISL_MODEL_ERROR = "torch is not installed: " + str(exc)
        return None
    try:
        model = torch.load(path, map_location="cpu")
        if hasattr(model, "eval"):
            model.eval()
        _ISL_MODEL = model
        _ISL_MODEL_ERROR = None
        return model
    except Exception as exc:
        _ISL_MODEL_ERROR = "failed to load ISL model: " + str(exc)
        _ISL_MODEL = None
        return None


@app.get("/v1/recognition/status")
def recognition_status() -> dict:
    _load_isl_model()
    return {
        "feature_version": settings.isl_feature_version,
        "frame_vector_size": settings.isl_frame_vector_size,
        "sequence_length": settings.isl_sequence_length,
        "model_loaded": _ISL_MODEL is not None,
        "model_error": _ISL_MODEL_ERROR,
        "honesty": "No trained ISL model is bundled. Recognition returns 'model_unavailable' until a compatible trained model is provided.",
    }


@app.post("/v1/recognition/predict")
def recognition_predict(request: RecognitionPredictRequest) -> RecognitionPredictResponse:
    # validate feature version
    if request.feature_version != settings.isl_feature_version:
        raise HTTPException(status_code=400, detail="feature_version mismatch")
    seq = request.sequence
    if not isinstance(seq, list) or len(seq) != settings.isl_sequence_length:
        raise HTTPException(status_code=400, detail="sequence must have %d frames" % settings.isl_sequence_length)
    for frame in seq:
        if not isinstance(frame, list) or len(frame) != settings.isl_frame_vector_size:
            raise HTTPException(status_code=400, detail="each frame must have %d features" % settings.isl_frame_vector_size)
        for v in frame:
            if not isinstance(v, (int, float)) or not _is_finite(v):
                raise HTTPException(status_code=400, detail="features must be finite numbers")
    model = _load_isl_model()
    if model is None:
        return RecognitionPredictResponse(
            label="unknown",
            confidence=0.0,
            status="model_unavailable",
            disclaimer="No trained ISL model is available on this backend. Sign-to-Text cannot classify signs yet.",
        )
    # run inference (best-effort; model contract is not enforced beyond loading)
    try:
        import torch
        with torch.inference_mode():
            x = torch.tensor([seq], dtype=torch.float32)
            out = model(x)
            # support (logits) or (label, conf) returns
            if isinstance(out, (tuple, list)):
                logits = out[0]
            else:
                logits = out
            if hasattr(logits, "argmax"):
                idx = int(logits.argmax(dim=-1).flatten()[0].item())
            else:
                idx = int(logits)
            conf = 0.0
            if hasattr(logits, "softmax"):
                try:
                    probs = logits.softmax(dim=-1)
                    conf = float(probs.flatten()[idx].item())
                except Exception:
                    conf = 0.0
        return RecognitionPredictResponse(label=str(idx), confidence=conf, status="ok",
                                         disclaimer="AI-generated classification. Requires validated ISL model and signer data.")
    except Exception as exc:
        return RecognitionPredictResponse(label="unknown", confidence=0.0, status="error",
                                         disclaimer="Inference failed: " + str(exc))
