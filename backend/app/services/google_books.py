"""Google Books API — covers, descriptions, page counts."""

import logging

import httpx

from app.core.config import settings

logger = logging.getLogger(__name__)

GOOGLE_BOOKS_URL = "https://www.googleapis.com/books/v1/volumes"


class GoogleBooksService:
    async def search(self, title: str, author: str) -> dict | None:
        """Search by title + author. Returns the best matching volume dict or None."""
        params = {"q": f"intitle:{title} inauthor:{author}", "maxResults": 1}
        if settings.google_books_api_key:
            params["key"] = settings.google_books_api_key

        async with httpx.AsyncClient(timeout=10) as client:
            resp = await client.get(GOOGLE_BOOKS_URL, params=params)
            resp.raise_for_status()
            data = resp.json()

        items = data.get("items", [])
        return items[0] if items else None

    async def search_query(self, query: str, limit: int = 3) -> list[dict]:
        """Free-text search. Returns up to `limit` volume dicts."""
        params = {"q": query, "maxResults": limit}
        if settings.google_books_api_key:
            params["key"] = settings.google_books_api_key

        async with httpx.AsyncClient(timeout=10) as client:
            resp = await client.get(GOOGLE_BOOKS_URL, params=params)
            resp.raise_for_status()
            data = resp.json()

        return data.get("items", [])[:limit]

    async def search_by_isbn(self, isbn: str) -> dict | None:
        """Look up by ISBN. Returns volume dict or None."""
        params = {"q": f"isbn:{isbn}", "maxResults": 1}
        if settings.google_books_api_key:
            params["key"] = settings.google_books_api_key

        async with httpx.AsyncClient(timeout=10) as client:
            resp = await client.get(GOOGLE_BOOKS_URL, params=params)
            resp.raise_for_status()
            data = resp.json()

        items = data.get("items", [])
        return items[0] if items else None

    def extract_cover_url(self, volume: dict) -> str | None:
        """Return the largest available thumbnail URL with https."""
        image_links = volume.get("volumeInfo", {}).get("imageLinks", {})
        url = (
            image_links.get("large")
            or image_links.get("medium")
            or image_links.get("thumbnail")
        )
        return url.replace("http://", "https://") if url else None

    def extract_info(self, volume: dict) -> dict:
        """Pull the fields we care about from a volume dict."""
        info = volume.get("volumeInfo", {})
        return {
            "google_books_id": volume.get("id"),
            "description": info.get("description"),
            "cover_url": self.extract_cover_url(volume),
            "page_count": info.get("pageCount"),
            "publisher": info.get("publisher"),
            "publish_year": (info.get("publishedDate") or "")[:4] or None,
        }
