"""PyTorch sequence model used for ASL gesture sequence recognition."""

from __future__ import annotations

import torch
from torch import nn


class AslSequenceClassifier(nn.Module):
    """1D-CNN + Bidirectional GRU with multi-head pooling for ASL gesture sequences."""

    def __init__(
        self,
        input_size: int = 179,
        hidden_size: int = 96,
        num_layers: int = 2,
        num_classes: int = 5,
        dropout: float = 0.2,
    ) -> None:
        super().__init__()
        self.input_size = input_size
        self.hidden_size = hidden_size
        self.num_layers = num_layers
        self.num_classes = num_classes
        self.dropout = dropout

        self.conv = nn.Sequential(
            nn.Conv1d(input_size, 64, kernel_size=3, padding=1),
            nn.BatchNorm1d(64),
            nn.ReLU(),
            nn.Dropout(dropout),
        )
        self.gru = nn.GRU(
            input_size=64,
            hidden_size=hidden_size,
            num_layers=num_layers,
            batch_first=True,
            bidirectional=True,
            dropout=dropout if num_layers > 1 else 0.0,
        )
        pooled_dim = hidden_size * 2 * 3
        self.norm = nn.LayerNorm(pooled_dim)
        self.head = nn.Sequential(
            nn.Linear(pooled_dim, 128),
            nn.GELU(),
            nn.Dropout(dropout),
            nn.Linear(128, num_classes),
        )

    def forward(self, inputs: torch.Tensor) -> torch.Tensor:
        # inputs is (Batch, SequenceLength, Features)
        c = self.conv(inputs.permute(0, 2, 1)).permute(0, 2, 1)
        out, _ = self.gru(c)
        mean_p = torch.mean(out, dim=1)
        max_p = torch.max(out, dim=1)[0]
        last_p = out[:, -1, :]
        pooled = torch.cat([mean_p, max_p, last_p], dim=-1)
        return self.head(self.norm(pooled))

    def config(self) -> dict[str, object]:
        return {
            "model_type": "cnn_gru",
            "input_size": self.input_size,
            "hidden_size": self.hidden_size,
            "num_layers": self.num_layers,
            "num_classes": self.num_classes,
            "dropout": self.dropout,
        }


# Aliases for backward compatibility
IslSequenceClassifier = AslSequenceClassifier
IslSequenceLstm = AslSequenceClassifier
