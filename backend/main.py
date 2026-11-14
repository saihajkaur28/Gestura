"""Gestura FastAPI application entrypoint."""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from backend.config import settings
from backend.routers import audio, captions, health

app = FastAPI(title="Gestura API", version="0.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(health.router, prefix="/v1")
app.include_router(captions.router, prefix="/v1")
app.include_router(audio.router, prefix="/v1")


@app.get("/health")
def root_health() -> dict:
    return {"status": "ok", "service": "gestura-api", "feature_version": settings.feature_version}
