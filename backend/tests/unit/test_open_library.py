"""Unit tests for OpenLibraryService — all HTTP calls mocked."""

from unittest.mock import AsyncMock, MagicMock, patch

import pytest

from app.services.open_library import OpenLibraryService

WORK_DOC = {
    "key": "/works/OL45804W",
    "title": "Dune",
    "author_name": ["Frank Herbert"],
    "isbn": ["9780441013593"],
    "subject": ["Science fiction", "Desert planets", "Ecology"],
}


@pytest.fixture
def service():
    return OpenLibraryService()


def _mock_client(json_data: dict):
    resp = MagicMock()
    resp.json.return_value = json_data
    resp.raise_for_status = MagicMock()

    client = AsyncMock()
    client.get = AsyncMock(return_value=resp)
    client.__aenter__ = AsyncMock(return_value=client)
    client.__aexit__ = AsyncMock(return_value=False)
    return client


class TestSearch:
    async def test_returns_first_doc_when_found(self, service):
        with patch("app.services.open_library.httpx.AsyncClient") as mock_cls:
            mock_cls.return_value = _mock_client({"docs": [WORK_DOC]})
            result = await service.search("Dune", "Frank Herbert")
        assert result == WORK_DOC

    async def test_returns_none_when_no_docs(self, service):
        with patch("app.services.open_library.httpx.AsyncClient") as mock_cls:
            mock_cls.return_value = _mock_client({"docs": []})
            result = await service.search("Unknown Book", "Unknown Author")
        assert result is None

    async def test_returns_none_when_docs_key_missing(self, service):
        with patch("app.services.open_library.httpx.AsyncClient") as mock_cls:
            mock_cls.return_value = _mock_client({})
            result = await service.search("Dune", "Frank Herbert")
        assert result is None


class TestSearchByIsbn:
    async def test_returns_first_doc_when_found(self, service):
        with patch("app.services.open_library.httpx.AsyncClient") as mock_cls:
            mock_cls.return_value = _mock_client({"docs": [WORK_DOC]})
            result = await service.search_by_isbn("9780441013593")
        assert result == WORK_DOC

    async def test_returns_none_when_not_found(self, service):
        with patch("app.services.open_library.httpx.AsyncClient") as mock_cls:
            mock_cls.return_value = _mock_client({"docs": []})
            result = await service.search_by_isbn("0000000000000")
        assert result is None


class TestExtractWorkId:
    def test_strips_works_prefix(self, service):
        doc = {"key": "/works/OL45804W"}
        assert service.extract_work_id(doc) == "OL45804W"

    def test_returns_none_when_key_missing(self, service):
        assert service.extract_work_id({}) is None

    def test_returns_none_when_key_empty(self, service):
        assert service.extract_work_id({"key": ""}) is None

    def test_handles_bare_id(self, service):
        doc = {"key": "OL45804W"}
        assert service.extract_work_id(doc) == "OL45804W"
