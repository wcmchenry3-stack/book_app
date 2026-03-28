"""Shared types for book identification."""

from dataclasses import dataclass


@dataclass
class BookCandidate:
    title: str
    author: str
    confidence: float  # 0.0 – 1.0
    isbn_13: str | None = None
    isbn_10: str | None = None


class ScanUnavailableError(Exception):
    """Raised when the vision API is unreachable or times out."""
