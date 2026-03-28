"""Tests for structured JSON logging and request ID middleware."""

import json
import logging
from unittest.mock import AsyncMock, patch

from starlette.testclient import TestClient

from app.core.logging import JsonFormatter, request_id_var


class TestJsonFormatter:
    def _make_record(self, msg: str, level: int = logging.INFO) -> logging.LogRecord:
        return logging.LogRecord(
            name="test.logger",
            level=level,
            pathname="",
            lineno=0,
            msg=msg,
            args=(),
            exc_info=None,
        )

    def test_output_is_valid_json(self):
        record = self._make_record("hello")
        line = JsonFormatter().format(record)
        parsed = json.loads(line)
        assert isinstance(parsed, dict)

    def test_required_keys_present(self):
        record = self._make_record("hello")
        parsed = json.loads(JsonFormatter().format(record))
        assert "time" in parsed
        assert "level" in parsed
        assert "logger" in parsed
        assert "message" in parsed
        assert "request_id" in parsed

    def test_message_matches(self):
        record = self._make_record("test message")
        parsed = json.loads(JsonFormatter().format(record))
        assert parsed["message"] == "test message"

    def test_level_matches(self):
        record = self._make_record("warn", logging.WARNING)
        parsed = json.loads(JsonFormatter().format(record))
        assert parsed["level"] == "WARNING"

    def test_logger_name_matches(self):
        record = self._make_record("hi")
        parsed = json.loads(JsonFormatter().format(record))
        assert parsed["logger"] == "test.logger"

    def test_request_id_from_context_var(self):
        token = request_id_var.set("test-request-id-123")
        try:
            record = self._make_record("hi")
            parsed = json.loads(JsonFormatter().format(record))
            assert parsed["request_id"] == "test-request-id-123"
        finally:
            request_id_var.reset(token)

    def test_default_request_id_is_dash_when_not_set(self):
        # Reset to default
        token = request_id_var.set("-")
        try:
            record = self._make_record("hi")
            parsed = json.loads(JsonFormatter().format(record))
            assert parsed["request_id"] == "-"
        finally:
            request_id_var.reset(token)

    def test_exc_info_included_when_present(self):
        try:
            raise ValueError("boom")
        except ValueError:
            import sys

            exc_info = sys.exc_info()

        record = logging.LogRecord(
            name="test",
            level=logging.ERROR,
            pathname="",
            lineno=0,
            msg="error",
            args=(),
            exc_info=exc_info,
        )
        parsed = json.loads(JsonFormatter().format(record))
        assert "exc_info" in parsed
        assert "ValueError" in parsed["exc_info"]


class TestRequestIdMiddleware:
    def test_x_request_id_header_present_in_response(self):
        from app.main import app

        with patch("app.main.AsyncSessionLocal") as mock_session_cls:
            mock_session = AsyncMock()
            mock_session.__aenter__ = AsyncMock(return_value=mock_session)
            mock_session.__aexit__ = AsyncMock(return_value=False)
            mock_session.execute = AsyncMock()
            mock_session_cls.return_value = mock_session

            client = TestClient(app, raise_server_exceptions=False)
            resp = client.get("/health")

        assert "x-request-id" in resp.headers

    def test_x_request_id_is_a_valid_uuid(self):
        import uuid

        from app.main import app

        with patch("app.main.AsyncSessionLocal") as mock_session_cls:
            mock_session = AsyncMock()
            mock_session.__aenter__ = AsyncMock(return_value=mock_session)
            mock_session.__aexit__ = AsyncMock(return_value=False)
            mock_session.execute = AsyncMock()
            mock_session_cls.return_value = mock_session

            client = TestClient(app, raise_server_exceptions=False)
            resp = client.get("/health")

        rid = resp.headers["x-request-id"]
        uuid.UUID(rid)  # raises if not valid UUID

    def test_each_request_gets_a_unique_id(self):
        from app.main import app

        with patch("app.main.AsyncSessionLocal") as mock_session_cls:
            mock_session = AsyncMock()
            mock_session.__aenter__ = AsyncMock(return_value=mock_session)
            mock_session.__aexit__ = AsyncMock(return_value=False)
            mock_session.execute = AsyncMock()
            mock_session_cls.return_value = mock_session

            client = TestClient(app, raise_server_exceptions=False)
            r1 = client.get("/health")
            r2 = client.get("/health")

        assert r1.headers["x-request-id"] != r2.headers["x-request-id"]
