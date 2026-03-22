"""Unit tests for ChatGPTVisionIdentifier — all HTTP calls mocked."""

import json
from unittest.mock import AsyncMock, MagicMock, patch

import pytest

from app.services.chatgpt_vision import ChatGPTVisionIdentifier

IMAGE_BYTES = b"fakeimagebytes"

VALID_RESPONSE = json.dumps(
    [
        {
            "title": "Dune",
            "author": "Frank Herbert",
            "confidence": 0.97,
            "isbn_13": "9780441013593",
            "isbn_10": None,
        },
        {
            "title": "Dune Messiah",
            "author": "Frank Herbert",
            "confidence": 0.6,
            "isbn_13": None,
            "isbn_10": None,
        },
    ]
)


def _make_mock_response(content: str, status_code: int = 200):
    resp = MagicMock()
    resp.status_code = status_code
    resp.json.return_value = {"choices": [{"message": {"content": content}}]}
    resp.raise_for_status = MagicMock()
    if status_code >= 400:
        from httpx import HTTPStatusError

        resp.raise_for_status.side_effect = HTTPStatusError(
            "error", request=MagicMock(), response=MagicMock()
        )
    return resp


@pytest.fixture
def identifier():
    return ChatGPTVisionIdentifier()


class TestIdentifySuccess:
    async def test_returns_candidates_from_valid_json(self, identifier):
        mock_resp = _make_mock_response(VALID_RESPONSE)
        with patch("app.services.chatgpt_vision.httpx.AsyncClient") as mock_client_cls:
            mock_client = AsyncMock()
            mock_client.post = AsyncMock(return_value=mock_resp)
            mock_client.__aenter__ = AsyncMock(return_value=mock_client)
            mock_client.__aexit__ = AsyncMock(return_value=False)
            mock_client_cls.return_value = mock_client

            candidates = await identifier.identify(IMAGE_BYTES)

        assert len(candidates) == 2
        assert candidates[0].title == "Dune"
        assert candidates[0].author == "Frank Herbert"
        assert candidates[0].confidence == 0.97
        assert candidates[0].isbn_13 == "9780441013593"
        assert candidates[0].isbn_10 is None

    async def test_caps_at_three_candidates(self, identifier):
        four_books = json.dumps(
            [
                {
                    "title": f"Book {i}",
                    "author": "Author",
                    "confidence": 0.9,
                    "isbn_13": None,
                    "isbn_10": None,
                }
                for i in range(4)
            ]
        )
        mock_resp = _make_mock_response(four_books)
        with patch("app.services.chatgpt_vision.httpx.AsyncClient") as mock_client_cls:
            mock_client = AsyncMock()
            mock_client.post = AsyncMock(return_value=mock_resp)
            mock_client.__aenter__ = AsyncMock(return_value=mock_client)
            mock_client.__aexit__ = AsyncMock(return_value=False)
            mock_client_cls.return_value = mock_client

            candidates = await identifier.identify(IMAGE_BYTES)

        assert len(candidates) == 3

    async def test_skips_malformed_items(self, identifier):
        bad_json = json.dumps(
            [
                {
                    "title": "Good Book",
                    "author": "Author",
                    "confidence": 0.9,
                    "isbn_13": None,
                    "isbn_10": None,
                },
                {"title_typo": "Missing author field"},  # malformed
            ]
        )
        mock_resp = _make_mock_response(bad_json)
        with patch("app.services.chatgpt_vision.httpx.AsyncClient") as mock_client_cls:
            mock_client = AsyncMock()
            mock_client.post = AsyncMock(return_value=mock_resp)
            mock_client.__aenter__ = AsyncMock(return_value=mock_client)
            mock_client.__aexit__ = AsyncMock(return_value=False)
            mock_client_cls.return_value = mock_client

            candidates = await identifier.identify(IMAGE_BYTES)

        assert len(candidates) == 1
        assert candidates[0].title == "Good Book"

    async def test_defaults_confidence_to_0_5_when_missing(self, identifier):
        no_confidence = json.dumps(
            [{"title": "A Book", "author": "Author", "isbn_13": None, "isbn_10": None}]
        )
        mock_resp = _make_mock_response(no_confidence)
        with patch("app.services.chatgpt_vision.httpx.AsyncClient") as mock_client_cls:
            mock_client = AsyncMock()
            mock_client.post = AsyncMock(return_value=mock_resp)
            mock_client.__aenter__ = AsyncMock(return_value=mock_client)
            mock_client.__aexit__ = AsyncMock(return_value=False)
            mock_client_cls.return_value = mock_client

            candidates = await identifier.identify(IMAGE_BYTES)

        assert candidates[0].confidence == 0.5


class TestIdentifyFailures:
    async def test_returns_empty_on_non_json_response(self, identifier):
        mock_resp = _make_mock_response("Sorry, I cannot identify this image.")
        with patch("app.services.chatgpt_vision.httpx.AsyncClient") as mock_client_cls:
            mock_client = AsyncMock()
            mock_client.post = AsyncMock(return_value=mock_resp)
            mock_client.__aenter__ = AsyncMock(return_value=mock_client)
            mock_client.__aexit__ = AsyncMock(return_value=False)
            mock_client_cls.return_value = mock_client

            candidates = await identifier.identify(IMAGE_BYTES)

        assert candidates == []

    async def test_raises_on_http_error(self, identifier):
        from httpx import HTTPStatusError

        with patch("app.services.chatgpt_vision.httpx.AsyncClient") as mock_client_cls:
            mock_client = AsyncMock()
            mock_client.post = AsyncMock(
                side_effect=HTTPStatusError(
                    "401", request=MagicMock(), response=MagicMock()
                )
            )
            mock_client.__aenter__ = AsyncMock(return_value=mock_client)
            mock_client.__aexit__ = AsyncMock(return_value=False)
            mock_client_cls.return_value = mock_client

            with pytest.raises(HTTPStatusError):
                await identifier.identify(IMAGE_BYTES)
