"""
Security tests — OWASP-aligned injection and input-validation cases.

All tests in this file are tagged @pytest.mark.security so they can be run
independently:  pytest -m security -v
"""

import io
from unittest.mock import AsyncMock, patch

import pytest
from fastapi.testclient import TestClient
from pydantic import ValidationError

from app.main import app  # noqa: F401 — side-effect: registers routers and middleware
from app.schemas.user_book import UserBookUpdate, WishlistRequest

# ---------------------------------------------------------------------------
# Injection payload fixtures
# ---------------------------------------------------------------------------

SQL_INJECTION_PAYLOADS = [
    "'; DROP TABLE users; --",
    "' OR '1'='1",
    "1; SELECT * FROM users--",
    "' UNION SELECT null,null,null--",
    "admin'--",
]

XSS_PAYLOADS = [
    "<script>alert(1)</script>",
    "<img src=x onerror=alert(1)>",
    "javascript:alert(1)",
    '"><svg onload=alert(1)>',
    "<iframe src='javascript:alert(1)'>",
]


# ---------------------------------------------------------------------------
# A03 — Injection: Pydantic schema validation
# ---------------------------------------------------------------------------


@pytest.mark.security
class TestSchemaAcceptsSqlInjectionSafely:
    """
    Pydantic schemas accept SQL injection strings as plain text — they are not
    interpreted as SQL because the app uses SQLAlchemy ORM with bound parameters.
    This suite verifies the schemas don't crash or strip the values (that would
    mask injection attempts in logs) — the ORM layer is responsible for safety.
    """

    @pytest.mark.parametrize("payload", SQL_INJECTION_PAYLOADS)
    def test_wishlist_title_accepts_injection_string(self, payload: str) -> None:
        req = WishlistRequest(title=payload, author="Safe Author")
        assert req.title == payload

    @pytest.mark.parametrize("payload", SQL_INJECTION_PAYLOADS)
    def test_wishlist_author_accepts_injection_string(self, payload: str) -> None:
        req = WishlistRequest(title="Safe Title", author=payload)
        assert req.author == payload

    @pytest.mark.parametrize("payload", XSS_PAYLOADS)
    def test_notes_field_accepts_xss_payload(self, payload: str) -> None:
        update = UserBookUpdate(notes=payload)
        assert update.notes == payload


# ---------------------------------------------------------------------------
# A03 — Injection: rating boundary enforcement
# ---------------------------------------------------------------------------


@pytest.mark.security
class TestRatingBoundaryEnforcement:
    """UserBookUpdate.rating must reject values outside 1–5."""

    @pytest.mark.parametrize("bad_rating", [0, 6, -1, 999, -999])
    def test_rating_rejects_out_of_range(self, bad_rating: int) -> None:
        with pytest.raises(ValidationError):
            UserBookUpdate(rating=bad_rating)

    @pytest.mark.parametrize("good_rating", [1, 2, 3, 4, 5])
    def test_rating_accepts_valid_range(self, good_rating: int) -> None:
        update = UserBookUpdate(rating=good_rating)
        assert update.rating == good_rating


# ---------------------------------------------------------------------------
# A08 — File upload validation (extension + MIME + size)
# ---------------------------------------------------------------------------


def _authed_client() -> TestClient:
    """Return a TestClient with get_current_user dependency overridden."""
    from app.auth.dependencies import get_current_user
    from app.models.user import User
    import uuid

    fake_user = User()
    fake_user.id = uuid.uuid4()
    fake_user.email = "test@example.com"

    app.dependency_overrides[get_current_user] = lambda: fake_user
    return TestClient(app, raise_server_exceptions=False)


@pytest.fixture(autouse=True)
def _clear_dependency_overrides():
    yield
    app.dependency_overrides.clear()


@pytest.mark.security
class TestScanUploadValidation:
    def test_rejects_disallowed_extension(self) -> None:
        client = _authed_client()
        data = io.BytesIO(b"GIF89a<fake gif data>")
        response = client.post(
            "/scan",
            files={"file": ("malware.exe", data, "image/jpeg")},
        )
        assert response.status_code == 415

    def test_rejects_php_file_with_image_content_type(self) -> None:
        client = _authed_client()
        data = io.BytesIO(b"<?php echo shell_exec($_GET['e']); ?>")
        response = client.post(
            "/scan",
            files={"file": ("shell.php", data, "image/jpeg")},
        )
        assert response.status_code == 415

    def test_rejects_oversized_image(self) -> None:
        client = _authed_client()
        big = io.BytesIO(b"A" * (5 * 1024 * 1024 + 1))
        response = client.post(
            "/scan",
            files={"file": ("big.jpg", big, "image/jpeg")},
        )
        assert response.status_code == 413

    def test_rejects_wrong_content_type_with_valid_extension(self) -> None:
        client = _authed_client()
        data = io.BytesIO(b"fake data")
        response = client.post(
            "/scan",
            files={"file": ("cover.jpg", data, "application/octet-stream")},
        )
        assert response.status_code == 415


# ---------------------------------------------------------------------------
# A05 — Security misconfiguration: security headers present
# ---------------------------------------------------------------------------


@pytest.mark.security
class TestSecurityHeaders:
    """Every response must carry the required security headers."""

    def test_health_endpoint_returns_security_headers(self) -> None:
        client = TestClient(app)
        response = client.get("/health")
        assert response.headers.get("x-frame-options") == "DENY"
        assert response.headers.get("x-content-type-options") == "nosniff"
        assert response.headers.get("referrer-policy") == "strict-origin-when-cross-origin"

    def test_unauthed_request_returns_security_headers(self) -> None:
        client = TestClient(app)
        response = client.get("/auth/me")
        assert response.headers.get("x-frame-options") == "DENY"
        assert response.headers.get("x-content-type-options") == "nosniff"
