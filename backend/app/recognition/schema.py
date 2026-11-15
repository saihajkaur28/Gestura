from __future__ import annotations

from typing import List

from pydantic import BaseModel, Field


class PredictRequest(BaseModel):
    feature_version: int = Field(alias="featureVersion")
    frames: List[List[float]] = Field(min_length=1, max_length=64)

    model_config = {"populate_by_name": True}


class PredictionItem(BaseModel):
    label: str
    confidence: float


class PredictResponse(BaseModel):
    label: str
    confidence: float
    unknown: bool
    top_k: List[PredictionItem] = Field(alias="topK")
    model_version: str = Field(alias="modelVersion")

    model_config = {"populate_by_name": True}
