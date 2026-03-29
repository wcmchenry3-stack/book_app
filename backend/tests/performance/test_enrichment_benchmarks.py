"""Performance benchmarks for the enrichment pipeline.

Run with:  pytest tests/performance/ -v --benchmark-only
Skip with: pytest tests/ --ignore=tests/performance/

Requires: pytest-benchmark  (pip install pytest-benchmark)
Add to requirements-dev.txt: pytest-benchmark==4.0.0

Thresholds (fail CI if exceeded):
  enrich_single_candidate  < 5 ms   (all I/O mocked)
  enrich_batch_3           < 10 ms  (3 concurrent candidates, I/O mocked)
  dedup_check_10           < 2 ms   (10 candidates, DB mocked)
"""

import asyncio
from unittest.mock import AsyncMock, MagicMock, patch

import pytest

from app.schemas.book import EditionPreview, EnrichedBook
from app.services.book_identifier import BookCandidate
from app.services.deduplication import DeduplicationService
from app.services.enrichment import EnrichmentService

# ─── Fixtures ─────────────────────────────────────────────────────────────────

OL_DOC = {
    "key": "/works/OL45804W",
    "title": "Dune",
    "author_name": ["Frank Herbert"],
    "subject": ["Science fiction", "Desert planets"],
}

GB_VOLUME = {
    "id": "gb_dune_001",
    "volumeInfo": {
        "title": "Dune",
        "description": "A desert planet epic.",
        "publisher": "Ace Books",
        "publishedDate": "1990",
        "pageCount": 604,
        "imageLinks": {"thumbnail": "https://books.google.com/thumb.jpg"},
    },
}

CANDIDATE = BookCandidate(
    title="Dune",
    author="Frank Herbert",
    confidence=0.97,
    isbn_13="9780441013593",
)

ENRICHED = EnrichedBook(
    open_library_work_id="OL45804W",
    google_books_id="gb_dune_001",
    title="Dune",
    author="Frank Herbert",
    confidence=0.97,
    already_in_library=False,
    editions=[EditionPreview(isbn_13="9780441013593")],
)


# ─── EnrichmentService benchmarks ────────────────────────────────────────────


@pytest.mark.benchmark(group="enrichment")
def test_enrich_single_candidate(benchmark):
    """Baseline: single candidate, both APIs mocked to return instantly."""
    service = EnrichmentService()

    with (
        patch.object(service.ol, "search_by_isbn", AsyncMock(return_value=OL_DOC)),
        patch.object(service.gb, "search_by_isbn", AsyncMock(return_value=GB_VOLUME)),
    ):
        result = benchmark(lambda: asyncio.run(service.enrich([CANDIDATE])))

    assert len(result) == 1
    assert result[0].title == "Dune"


@pytest.mark.benchmark(group="enrichment")
def test_enrich_batch_of_3(benchmark):
    """Three candidates in parallel — measures asyncio.gather overhead."""
    service = EnrichmentService()
    candidates = [CANDIDATE] * 3

    with (
        patch.object(service.ol, "search_by_isbn", AsyncMock(return_value=OL_DOC)),
        patch.object(service.gb, "search_by_isbn", AsyncMock(return_value=GB_VOLUME)),
    ):
        result = benchmark(lambda: asyncio.run(service.enrich(candidates)))

    assert len(result) == 3


@pytest.mark.benchmark(group="enrichment")
def test_enrich_caps_at_3_candidates(benchmark):
    """enrich() must cap at 3 — ensures no unbounded growth under load."""
    service = EnrichmentService()
    candidates = [CANDIDATE] * 4

    with (
        patch.object(service.ol, "search_by_isbn", AsyncMock(return_value=OL_DOC)),
        patch.object(service.gb, "search_by_isbn", AsyncMock(return_value=GB_VOLUME)),
    ):
        result = benchmark(lambda: asyncio.run(service.enrich(candidates)))

    assert len(result) == 3


# ─── DeduplicationService benchmarks ─────────────────────────────────────────


@pytest.mark.benchmark(group="deduplication")
def test_dedup_check_10_candidates(benchmark):
    """Dedup 10 candidates against a mocked DB that always returns None."""
    service = DeduplicationService()

    def _run():
        none_result = MagicMock()
        none_result.scalar_one_or_none.return_value = None
        db = AsyncMock()
        db.execute = AsyncMock(return_value=none_result)
        fresh = [ENRICHED.model_copy() for _ in range(10)]
        return asyncio.run(service.check(db, "user-123", fresh))

    result = benchmark(_run)

    assert all(not c.already_in_library for c in result)
