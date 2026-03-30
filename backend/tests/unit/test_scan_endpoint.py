"""Unit tests for POST /scan — services mocked, no real DB or HTTP."""

import io
from unittest.mock import AsyncMock, MagicMock, patch

import pytest
from fastapi.testclient import TestClient

from app.main import app
from app.models.user import User
from app.schemas.book import EditionPreview, EnrichedBook
from app.services.book_identifier import BookCandidate, ScanUnavailableError

FAKE_USER = User(id="00000000-0000-0000-0000-000000000001", email="test@example.com")

ENRICHED_BOOK = EnrichedBook(
    open_library_work_id="OL45804W",
    google_books_id="gb_dune_001",
    title="Dune",
    author="Frank Herbert",
    confidence=0.97,
    already_in_library=False,
    editions=[EditionPreview(isbn_13="9780441013593")],
)


_JPEG_MAGIC = b"\xff\xd8\xff\xe0"


def _image_file(size_bytes: int = 100, content_type: str = "image/jpeg"):
    # Prepend valid JPEG magic bytes so the file passes magic bytes validation.
    # Pad to the requested size with neutral bytes.
    padding = b"x" * max(0, size_bytes - len(_JPEG_MAGIC))
    return ("scan.jpg", io.BytesIO(_JPEG_MAGIC + padding), content_type)


@pytest.fixture
def client():
    from app.auth.dependencies import get_current_user
    from app.core.database import get_db

    async def _fake_db():
        yield AsyncMock()

    app.dependency_overrides[get_current_user] = lambda: FAKE_USER
    app.dependency_overrides[get_db] = _fake_db

    yield TestClient(app)

    app.dependency_overrides.clear()


class TestScanEndpoint:
    def test_returns_401_without_auth(self):
        client = TestClient(app)
        resp = client.post("/scan", files={"file": _image_file()})
        assert resp.status_code == 401

    def test_returns_415_for_non_image(self, client):
        resp = client.post(
            "/scan", files={"file": ("doc.pdf", io.BytesIO(b"pdf"), "application/pdf")}
        )
        assert resp.status_code == 415

    def test_returns_413_for_oversized_file(self, client):
        big = 5 * 1024 * 1024 + 1  # 1 byte over 5MB
        resp = client.post("/scan", files={"file": _image_file(size_bytes=big)})
        assert resp.status_code == 413

    def test_returns_503_when_vision_service_unavailable(self, client):
        with patch("app.api.scan.ChatGPTVisionIdentifier") as mock_id_cls:
            mock_id_cls.return_value.identify = AsyncMock(
                side_effect=ScanUnavailableError("timeout")
            )
            resp = client.post("/scan", files={"file": _image_file()})

        assert resp.status_code == 503
        assert resp.json()["detail"] == "scan_unavailable"

    def test_returns_empty_list_when_no_candidates(self, client):
        with (
            patch("app.api.scan.ChatGPTVisionIdentifier") as mock_id_cls,
            patch("app.api.scan.EnrichmentService"),
            patch("app.api.scan.DeduplicationService"),
        ):
            mock_id_cls.return_value.identify = AsyncMock(return_value=[])
            resp = client.post("/scan", files={"file": _image_file()})

        assert resp.status_code == 200
        assert resp.json() == []

    def test_returns_enriched_candidates(self, client):
        candidate = BookCandidate(title="Dune", author="Frank Herbert", confidence=0.97)

        with (
            patch("app.api.scan.ChatGPTVisionIdentifier") as mock_id_cls,
            patch("app.api.scan.EnrichmentService") as mock_enrich_cls,
            patch("app.api.scan.DeduplicationService") as mock_dedup_cls,
        ):
            mock_id_cls.return_value.identify = AsyncMock(return_value=[candidate])
            mock_enrich_cls.return_value.enrich = AsyncMock(
                return_value=[ENRICHED_BOOK]
            )
            mock_dedup_cls.return_value.check = AsyncMock(return_value=[ENRICHED_BOOK])

            resp = client.post("/scan", files={"file": _image_file()})

        assert resp.status_code == 200
        data = resp.json()
        assert len(data) == 1
        assert data[0]["title"] == "Dune"
        assert data[0]["author"] == "Frank Herbert"
        assert data[0]["open_library_work_id"] == "OL45804W"


class TestTurnstileProtection:
    """When TURNSTILE_SECRET_KEY is configured, /scan requires a valid Turnstile token."""

    @pytest.fixture
    def client_with_turnstile(self):
        from app.auth.dependencies import get_current_user
        from app.core.database import get_db

        async def _fake_db():
            yield AsyncMock()

        app.dependency_overrides[get_current_user] = lambda: FAKE_USER
        app.dependency_overrides[get_db] = _fake_db

        with patch("app.api.scan.settings") as mock_settings:
            mock_settings.rate_limit_scan = "10/minute"
            mock_settings.turnstile_secret_key = "0x0000000000000000000000000000000000000000"
            yield TestClient(app), mock_settings

        app.dependency_overrides.clear()

    def test_returns_400_when_token_missing(self, client_with_turnstile):
        client, _ = client_with_turnstile
        resp = client.post("/scan", files={"file": _image_file()})
        assert resp.status_code == 400
        assert "Turnstile" in resp.json()["detail"]

    def test_returns_403_when_token_invalid(self, client_with_turnstile):
        client, _ = client_with_turnstile
        with patch("app.api.scan._verify_turnstile", new=AsyncMock(return_value=False)):
            resp = client.post(
                "/scan",
                files={"file": _image_file()},
                data={"cf-turnstile-response": "bad-token"},
            )
        assert resp.status_code == 403
        assert "Turnstile" in resp.json()["detail"]

    def test_proceeds_when_token_valid(self, client_with_turnstile):
        client, _ = client_with_turnstile
        with (
            patch("app.api.scan._verify_turnstile", new=AsyncMock(return_value=True)),
            patch("app.api.scan.ChatGPTVisionIdentifier") as mock_id_cls,
            patch("app.api.scan.EnrichmentService"),
            patch("app.api.scan.DeduplicationService"),
        ):
            mock_id_cls.return_value.identify = AsyncMock(return_value=[])
            resp = client.post(
                "/scan",
                files={"file": _image_file()},
                data={"cf-turnstile-response": "valid-token"},
            )
        assert resp.status_code == 200

    def test_skipped_when_secret_key_absent(self):
        """When TURNSTILE_SECRET_KEY is not set, the check is skipped entirely."""
        from app.auth.dependencies import get_current_user
        from app.core.database import get_db

        async def _fake_db():
            yield AsyncMock()

        app.dependency_overrides[get_current_user] = lambda: FAKE_USER
        app.dependency_overrides[get_db] = _fake_db

        with (
            patch("app.api.scan.settings") as mock_settings,
            patch("app.api.scan.ChatGPTVisionIdentifier") as mock_id_cls,
            patch("app.api.scan.EnrichmentService"),
            patch("app.api.scan.DeduplicationService"),
        ):
            mock_settings.rate_limit_scan = "10/minute"
            mock_settings.turnstile_secret_key = ""  # key not configured
            mock_id_cls.return_value.identify = AsyncMock(return_value=[])
            client = TestClient(app)
            resp = client.post("/scan", files={"file": _image_file()})

        app.dependency_overrides.clear()
        assert resp.status_code == 200
