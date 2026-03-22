"""Abstract interface for book identification from images."""

from abc import ABC, abstractmethod
from dataclasses import dataclass


@dataclass
class BookCandidate:
    title: str
    author: str
    confidence: float  # 0.0 – 1.0
    isbn_13: str | None = None
    isbn_10: str | None = None


class BookIdentifierService(ABC):
    @abstractmethod
    async def identify(self, image_bytes: bytes) -> list[BookCandidate]:
        """Identify books from a cover image. Returns up to 3 candidates ranked by confidence."""
