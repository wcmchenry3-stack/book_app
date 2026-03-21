from __future__ import annotations

import uuid
from datetime import datetime
from typing import Literal

from pydantic import BaseModel, field_validator

from app.schemas.book import BookRead, EditionRead

BookStatus = Literal["wishlisted", "purchased", "reading", "read"]


class UserBookCreate(BaseModel):
    """Body for POST /wishlist."""

    book_id: uuid.UUID
    edition_id: uuid.UUID | None = None


class PurchasedCreate(BaseModel):
    """Body for POST /purchased — promotes wishlist item or adds new purchased book."""

    book_id: uuid.UUID
    isbn_13: str | None = None
    edition_id: uuid.UUID | None = None


class UserBookUpdate(BaseModel):
    """Body for PATCH /user-books/{id}."""

    status: BookStatus | None = None
    notes: str | None = None
    rating: int | None = None

    @field_validator("rating")
    @classmethod
    def rating_in_range(cls, v: int | None) -> int | None:
        if v is not None and not (1 <= v <= 5):
            raise ValueError("rating must be between 1 and 5")
        return v


class UserBookRead(BaseModel):
    """Returned by GET /user-books."""

    id: uuid.UUID
    book: BookRead
    edition: EditionRead | None = None
    status: BookStatus
    wishlisted_at: datetime | None = None
    purchased_at: datetime | None = None
    started_at: datetime | None = None
    finished_at: datetime | None = None
    notes: str | None = None
    rating: int | None = None
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}
