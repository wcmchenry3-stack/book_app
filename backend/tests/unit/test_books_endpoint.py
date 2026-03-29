"""Unit tests for GET /books/search — all external HTTP mocked."""

from unittest.mock import AsyncMock, patch

import pytest
from fastapi.testclient import TestClient

from app.main import app
from app.models.user import User
from app.schemas.book import EditionPreview, EnrichedBook

FAKE_USER = User(id="00000000-0000-0000-0000-000000000001", email="test@example.com")

VOLUME = {
    "id": "gb_dune_001",
    "volumeInfo": {
        "title": "Dune",
        "authors": ["Frank Herbert"],
        "industryIdentifiers": [
            {"type": "ISBN_13", "identifier": "9780441013593"},
            {"type": "ISBN_10", "identifier": "0441013591"},
        ],
    },
}

ENRICHED = EnrichedBook(
    open_library_work_id="OL45804W",
    google_books_id="gb_dune_001",
    title="Dune",
    author="Frank Herbert",
    confidence=0.9,
    already_in_library=False,
    editions=[EditionPreview(isbn_13="9780441013593")],
)


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


class TestSearchBooks:
    def test_requires_auth(self):
        resp = TestClient(app).get("/books/search?q=dune")
        assert resp.status_code == 401

    def test_returns_422_for_single_char_query(self, client):
        resp = client.get("/books/search?q=a")
        assert resp.status_code == 422

    def test_returns_enriched_results(self, client):
        with (
            patch("app.api.books._gb") as mock_gb,
            patch("app.api.books._enrichment") as mock_enrich,
        ):
            mock_gb.search_query = AsyncMock(return_value=[VOLUME])
            mock_enrich.enrich = AsyncMock(return_value=[ENRICHED])
            resp = client.get("/books/search?q=Dune Herbert")

        assert resp.status_code == 200
        data = resp.json()
        assert len(data) == 1
        assert data[0]["title"] == "Dune"
        assert data[0]["author"] == "Frank Herbert"

    def test_returns_empty_list_when_no_volumes(self, client):
        with patch("app.api.books._gb") as mock_gb:
            mock_gb.search_query = AsyncMock(return_value=[])
            resp = client.get("/books/search?q=zzzznotabook")

        assert resp.status_code == 200
        assert resp.json() == []

    def test_returns_502_when_google_books_raises(self, client):
        with patch("app.api.books._gb") as mock_gb:
            mock_gb.search_query = AsyncMock(side_effect=Exception("timeout"))
            resp = client.get("/books/search?q=Dune Herbert")

        assert resp.status_code == 502
        assert "unavailable" in resp.json()["detail"]


class TestVolumeToCandidate:
    """Tests for _volume_to_candidate via the search endpoint."""

    def test_extracts_isbn_13_and_isbn_10(self, client):
        with (
            patch("app.api.books._gb") as mock_gb,
            patch("app.api.books._enrichment") as mock_enrich,
        ):
            mock_gb.search_query = AsyncMock(return_value=[VOLUME])
            mock_enrich.enrich = AsyncMock(return_value=[ENRICHED])
            resp = client.get("/books/search?q=Dune")

        assert resp.status_code == 200
        # Confirms _volume_to_candidate ran without error and passed candidates to enrich
        mock_enrich.enrich.assert_awaited_once()
        candidates = mock_enrich.enrich.call_args[0][0]
        assert candidates[0].isbn_13 == "9780441013593"
        assert candidates[0].isbn_10 == "0441013591"

    def test_handles_missing_authors(self, client):
        vol = {"id": "x", "volumeInfo": {"title": "Orphan Book"}}
        with (
            patch("app.api.books._gb") as mock_gb,
            patch("app.api.books._enrichment") as mock_enrich,
        ):
            mock_gb.search_query = AsyncMock(return_value=[vol])
            mock_enrich.enrich = AsyncMock(return_value=[ENRICHED])
            resp = client.get("/books/search?q=Orphan Book")

        assert resp.status_code == 200
        candidates = mock_enrich.enrich.call_args[0][0]
        assert candidates[0].author == "Unknown"

    def test_handles_missing_industry_identifiers(self, client):
        vol = {"id": "x", "volumeInfo": {"title": "Book", "authors": ["Author"]}}
        with (
            patch("app.api.books._gb") as mock_gb,
            patch("app.api.books._enrichment") as mock_enrich,
        ):
            mock_gb.search_query = AsyncMock(return_value=[vol])
            mock_enrich.enrich = AsyncMock(return_value=[ENRICHED])
            resp = client.get("/books/search?q=Book")

        assert resp.status_code == 200
        candidates = mock_enrich.enrich.call_args[0][0]
        assert candidates[0].isbn_13 is None
        assert candidates[0].isbn_10 is None

    def test_handles_isbn_10_only(self, client):
        vol = {
            "id": "x",
            "volumeInfo": {
                "title": "Old Book",
                "authors": ["Author"],
                "industryIdentifiers": [
                    {"type": "ISBN_10", "identifier": "0441013591"}
                ],
            },
        }
        with (
            patch("app.api.books._gb") as mock_gb,
            patch("app.api.books._enrichment") as mock_enrich,
        ):
            mock_gb.search_query = AsyncMock(return_value=[vol])
            mock_enrich.enrich = AsyncMock(return_value=[ENRICHED])
            resp = client.get("/books/search?q=Old Book")

        assert resp.status_code == 200
        candidates = mock_enrich.enrich.call_args[0][0]
        assert candidates[0].isbn_13 is None
        assert candidates[0].isbn_10 == "0441013591"
