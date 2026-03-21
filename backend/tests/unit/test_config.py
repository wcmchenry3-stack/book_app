"""Unit tests for settings config."""

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
