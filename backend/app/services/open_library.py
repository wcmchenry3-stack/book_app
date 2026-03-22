"""Open Library API — work identity, subjects, author metadata."""

import logging

import httpx

from app.core.config import settings

logger = logging.getLogger(__name__)


class OpenLibraryService:
    def __init__(self) -> None:
        self.base = settings.open_library_base_url

    async def search(self, title: str, author: str) -> dict | None:
        """Search by title + author. Returns the best matching work dict or None."""
        params = {
            "title": title,
            "author": author,
            "limit": 1,
            "fields": "key,title,author_name,isbn,subject",
        }
        async with httpx.AsyncClient(timeout=10) as client:
            resp = await client.get(f"{self.base}/search.json", params=params)
            resp.raise_for_status()
            data = resp.json()

        docs = data.get("docs", [])
        return docs[0] if docs else None

    async def search_by_isbn(self, isbn: str) -> dict | None:
        """Look up a work by ISBN. Returns work dict or None."""
        async with httpx.AsyncClient(timeout=10) as client:
            resp = await client.get(
                f"{self.base}/search.json",
                params={
                    "isbn": isbn,
                    "limit": 1,
                    "fields": "key,title,author_name,isbn,subject",
                },
            )
            resp.raise_for_status()
            data = resp.json()

        docs = data.get("docs", [])
        return docs[0] if docs else None

    def extract_work_id(self, doc: dict) -> str | None:
        """Extract bare work ID like OL45804W from /works/OL45804W key."""
        key = doc.get("key", "")
        return key.split("/")[-1] if key else None
