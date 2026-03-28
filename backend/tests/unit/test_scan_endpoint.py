"""Unit tests for POST /scan — services mocked, no real DB or HTTP."""

import io
from unittest.mock import AsyncMock, patch

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


def _image_file(size_bytes: int = 100, content_type: str = "image/jpeg"):
    return ("scan.jpg", io.BytesIO(b"x" * size_bytes), content_type)


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
