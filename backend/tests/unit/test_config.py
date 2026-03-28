"""Unit tests for settings config."""

import pytest
from pydantic import ValidationError

from app.core.config import Settings


def test_allowed_emails_list_parsing():
    s = Settings(
        database_url="postgresql+asyncpg://u:p@localhost/db",
        allowed_emails="alice@example.com, bob@example.com",
    )
    assert s.allowed_emails_list == ["alice@example.com", "bob@example.com"]


def test_allowed_emails_list_single():
    s = Settings(
        database_url="postgresql+asyncpg://u:p@localhost/db",
        allowed_emails="solo@example.com",
    )
    assert s.allowed_emails_list == ["solo@example.com"]


def test_allowed_emails_list_empty():
    s = Settings(
        database_url="postgresql+asyncpg://u:p@localhost/db",
        allowed_emails="",
    )
    assert s.allowed_emails_list == []


class TestCorsOriginsValidator:
    def test_accepts_valid_origins(self):
        s = Settings(
            database_url="postgresql+asyncpg://u:p@localhost/db",
            cors_origins=["https://example.onrender.com", "http://localhost:8081"],
        )
        assert "https://example.onrender.com" in s.cors_origins

    def test_accepts_empty_origins(self):
        s = Settings(
            database_url="postgresql+asyncpg://u:p@localhost/db",
            cors_origins=[],
        )
        assert s.cors_origins == []

    def test_rejects_wildcard(self):
        with pytest.raises(ValidationError, match="Wildcard"):
            Settings(
                database_url="postgresql+asyncpg://u:p@localhost/db",
                cors_origins=["*"],
            )

    def test_rejects_wildcard_mixed_with_valid(self):
        with pytest.raises(ValidationError, match="Wildcard"):
            Settings(
                database_url="postgresql+asyncpg://u:p@localhost/db",
                cors_origins=["https://example.com", "*"],
            )
