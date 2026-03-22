"""Unit tests for DeduplicationService — AsyncSession is mocked."""

from unittest.mock import AsyncMock, MagicMock

import pytest

from app.schemas.book import EnrichedBook
from app.services.deduplication import DeduplicationService

USER_ID = "user-123"


def make_candidate(ol_id=None, gb_id=None) -> EnrichedBook:
    return EnrichedBook(
        open_library_work_id=ol_id,
        google_books_id=gb_id,
        title="Dune",
        author="Frank Herbert",
        confidence=0.97,
        already_in_library=False,
        editions=[],
    )


def _mock_db(found: bool):
    """Return an AsyncSession mock that returns a row (or None) for scalar_one_or_none."""
    scalar_result = MagicMock()
    scalar_result.scalar_one_or_none.return_value = MagicMock() if found else None

    db = AsyncMock()
    db.execute = AsyncMock(return_value=scalar_result)
    return db


@pytest.fixture
def service():
    return DeduplicationService()


class TestCheck:
    async def test_marks_true_when_ol_work_id_matches(self, service):
        db = _mock_db(found=True)
        candidates = [make_candidate(ol_id="OL45804W")]

        result = await service.check(db, USER_ID, candidates)

        assert result[0].already_in_library is True

    async def test_marks_false_when_ol_work_id_not_in_library(self, service):
        db = _mock_db(found=False)
        candidates = [make_candidate(ol_id="OL45804W")]

        result = await service.check(db, USER_ID, candidates)

        assert result[0].already_in_library is False

    async def test_marks_true_when_google_books_id_matches(self, service):
        # ol_id=None so OL query is skipped; only the GB query runs → found=True
        db = _mock_db(found=True)
        candidates = [make_candidate(ol_id=None, gb_id="gb_dune_001")]
        result = await service.check(db, USER_ID, candidates)

        assert result[0].already_in_library is True

    async def test_skips_ol_query_when_ol_id_missing(self, service):
        db = _mock_db(found=False)
        candidates = [make_candidate(ol_id=None, gb_id="gb_dune_001")]

        await service.check(db, USER_ID, candidates)

        # Only one execute call: the GB query
        assert db.execute.call_count == 1

    async def test_skips_gb_query_when_already_found_via_ol(self, service):
        db = _mock_db(found=True)
        candidates = [make_candidate(ol_id="OL45804W", gb_id="gb_dune_001")]

        await service.check(db, USER_ID, candidates)

        # Short-circuits after OL match — only one execute call
        assert db.execute.call_count == 1

    async def test_processes_multiple_candidates(self, service):
        db = _mock_db(found=False)
        candidates = [
            make_candidate(ol_id="OL45804W"),
            make_candidate(ol_id="OL100W"),
        ]

        result = await service.check(db, USER_ID, candidates)

        assert len(result) == 2
        assert all(not c.already_in_library for c in result)

    async def test_returns_false_when_no_ids_present(self, service):
        db = AsyncMock()
        candidates = [make_candidate(ol_id=None, gb_id=None)]

        result = await service.check(db, USER_ID, candidates)

        assert result[0].already_in_library is False
        db.execute.assert_not_called()
