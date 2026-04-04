"""Sentry integration tests for book_app backend."""

import os
from pathlib import Path
from unittest.mock import patch

import pytest
import sentry_sdk

_MAIN_PY = Path(__file__).resolve().parent.parent / "app" / "main.py"


class TestSentryUnit:
    """Unit tests for Sentry configuration."""

    def test_sentry_dsn_env_var_format(self):
        """SENTRY_DSN should be a valid Sentry DSN URL when set."""
        dsn = os.environ.get("SENTRY_DSN", "")
        if not dsn:
            pytest.skip("SENTRY_DSN not set (expected in CI)")
        assert dsn.startswith("https://")
        assert ".sentry.io" in dsn or ".ingest." in dsn

    def test_sentry_sdk_importable(self):
        """sentry-sdk should be installed and importable."""
        assert hasattr(sentry_sdk, "init")
        assert hasattr(sentry_sdk, "capture_exception")
        assert hasattr(sentry_sdk, "capture_message")

    def test_sentry_init_code_present_in_main(self):
        """main.py should contain Sentry initialization logic."""
        source = _MAIN_PY.read_text()
        assert "sentry_sdk.init(" in source
        assert "sentry_dsn" in source.lower()

    def test_sentry_integrations_in_source(self):
        """main.py should register FastAPI and Starlette integrations."""
        source = _MAIN_PY.read_text()
        assert "FastApiIntegration" in source
        assert "StarletteIntegration" in source

    def test_sentry_traces_sample_rate_in_source(self):
        """Traces sample rate should be configured."""
        source = _MAIN_PY.read_text()
        assert "traces_sample_rate" in source

    def test_sentry_conditional_on_dsn(self):
        """Sentry init should be gated on DSN being set."""
        source = _MAIN_PY.read_text()
        assert "sentry_dsn" in source.lower()

    def test_sentry_captures_callable(self):
        """Verify that Sentry's core capture functions are available."""
        assert callable(sentry_sdk.capture_exception)
        assert callable(sentry_sdk.capture_message)

    def test_debug_sentry_route_in_source(self):
        """main.py should have a debug Sentry test route."""
        source = _MAIN_PY.read_text()
        assert "sentry-test" in source or "sentry_test" in source


class TestSentryContextMiddleware:
    """Tests for the Sentry context enrichment middleware."""

    def test_middleware_registered_in_main(self):
        """main.py should register SentryContextMiddleware."""
        source = _MAIN_PY.read_text()
        assert "SentryContextMiddleware" in source

    @patch("app.core.sentry_context.sentry_sdk")
    def test_set_sentry_user_sets_id_only(self, mock_sentry):
        """set_sentry_user should set user context with ID only (no PII)."""
        from app.core.sentry_context import set_sentry_user

        set_sentry_user(123)

        mock_sentry.set_user.assert_called_once_with({"id": "123"})

    @patch("app.core.sentry_context.sentry_sdk")
    def test_set_sentry_user_converts_to_string(self, mock_sentry):
        """User ID should be converted to a string."""
        from app.core.sentry_context import set_sentry_user

        set_sentry_user("abc-uuid-123")

        mock_sentry.set_user.assert_called_once_with({"id": "abc-uuid-123"})

    @patch("app.core.sentry_context.sentry_sdk")
    def test_set_sentry_user_no_email_in_context(self, mock_sentry):
        """User context must NOT include email (PII)."""
        from app.core.sentry_context import set_sentry_user

        set_sentry_user(42)

        call_args = mock_sentry.set_user.call_args[0][0]
        assert "email" not in call_args
        assert "username" not in call_args

    def test_set_sentry_user_called_in_dependencies(self):
        """auth/dependencies.py should call set_sentry_user."""
        deps_path = (
            Path(__file__).resolve().parent.parent / "app" / "auth" / "dependencies.py"
        )
        source = deps_path.read_text()
        assert "set_sentry_user" in source

    def test_send_default_pii_is_false(self):
        """Sentry init must have send_default_pii=False."""
        source = _MAIN_PY.read_text()
        assert "send_default_pii=False" in source
