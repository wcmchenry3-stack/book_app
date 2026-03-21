"""Smoke tests for config loading — expand in Phase 6."""
import os
import pytest


def test_allowed_emails_list_parsing(monkeypatch):
    """allowed_emails_list should split comma-separated emails."""
    monkeypatch.setenv("DATABASE_URL", "postgresql+asyncpg://u:p@localhost/db")
    monkeypatch.setenv("ALLOWED_EMAILS", "alice@example.com, bob@example.com")

    # Re-import to pick up env vars
    import importlib
    import app.core.config as cfg_module

    importlib.reload(cfg_module)
    settings = cfg_module.Settings()
    assert settings.allowed_emails_list == ["alice@example.com", "bob@example.com"]


def test_allowed_emails_list_single(monkeypatch):
    monkeypatch.setenv("DATABASE_URL", "postgresql+asyncpg://u:p@localhost/db")
    monkeypatch.setenv("ALLOWED_EMAILS", "solo@example.com")

    import importlib
    import app.core.config as cfg_module

    importlib.reload(cfg_module)
    settings = cfg_module.Settings()
    assert settings.allowed_emails_list == ["solo@example.com"]
