from __future__ import annotations

import uuid
from datetime import datetime
from typing import Literal

from pydantic import BaseModel


class EditionBase(BaseModel):
    isbn_13: str | None = None
    isbn_10: str | None = None
    publisher: str | None = None
    publish_year: int | None = None
    format: (
        Literal["hardcover", "paperback", "ebook", "audiobook", "unknown"] | None
    ) = None
    page_count: int | None = None
    open_library_edition_id: str | None = None


class EditionRead(EditionBase):
    id: uuid.UUID
    book_id: uuid.UUID
    created_at: datetime

    model_config = {"from_attributes": True}


class BookBase(BaseModel):
    title: str
    author: str
    description: str | None = None
    cover_url: str | None = None
    subjects: list[str] | None = None
    language: str = "en"


class BookRead(BookBase):
    id: uuid.UUID
    open_library_work_id: str | None = None
    google_books_id: str | None = None
    created_at: datetime
    updated_at: datetime
    editions: list[EditionRead] = []

    model_config = {"from_attributes": True}


class EnrichedBook(BaseModel):
    """Returned by POST /scan and GET /books/search."""

    book_id: uuid.UUID | None = None  # null if not yet in DB
    open_library_work_id: str | None = None
    title: str
    author: str
    description: str | None = None
    cover_url: str | None = None
    subjects: list[str] = []
    confidence: float  # 0–1, from image recognition
    already_in_library: bool = False
    editions: list[EditionRead] = []
