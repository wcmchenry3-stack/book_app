"""Unit tests for user-books endpoints — DB and services mocked."""

import uuid
from datetime import datetime, timezone
from unittest.mock import AsyncMock, MagicMock, patch

import pytest
from fastapi.testclient import TestClient

from app.main import app
from app.models.user import User

FAKE_USER = User(id="00000000-0000-0000-0000-000000000001", email="test@example.com")
BOOK_ID = uuid.UUID("aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa")
USER_BOOK_ID = uuid.UUID("bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb")
NOW = datetime.now(timezone.utc)


def _make_user_book(**overrides):
    """Build a minimal mock UserBook that UserBookRead can serialise."""
    book = MagicMock()
    book.id = BOOK_ID
    book.title = "Dune"
    book.author = "Frank Herbert"
    book.description = None
    book.cover_url = None
    book.subjects = []
    book.language = "en"
    book.open_library_work_id = "OL45804W"
    book.google_books_id = None
    book.created_at = NOW
    book.updated_at = NOW
    book.editions = []

    ub = MagicMock()
    ub.id = USER_BOOK_ID
    ub.status = "wishlisted"
    ub.wishlisted_at = NOW
    ub.purchased_at = None
    ub.started_at = None
    ub.finished_at = None
    ub.notes = None
    ub.rating = None
    ub.book = book
    ub.edition = None
    ub.created_at = NOW
    ub.updated_at = NOW
    for k, v in overrides.items():
        setattr(ub, k, v)
    return ub


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


# ─── POST /wishlist ────────────────────────────────────────────────────────────


class TestAddToWishlist:
    def test_requires_auth(self):
        c = TestClient(app)
        resp = c.post("/wishlist", json={"title": "Dune", "author": "Frank Herbert"})
        assert resp.status_code == 401

    def test_returns_201_on_success(self, client):
        ub = _make_user_book()
        with patch("app.api.user_books.WishlistService") as mock_svc_cls:
            mock_svc_cls.return_value.add = AsyncMock(return_value=ub)
            resp = client.post(
                "/wishlist", json={"title": "Dune", "author": "Frank Herbert"}
            )
        assert resp.status_code == 201

    def test_returns_book_data(self, client):
        ub = _make_user_book()
        with patch("app.api.user_books.WishlistService") as mock_svc_cls:
            mock_svc_cls.return_value.add = AsyncMock(return_value=ub)
            resp = client.post(
                "/wishlist", json={"title": "Dune", "author": "Frank Herbert"}
            )
        data = resp.json()
        assert data["book"]["title"] == "Dune"
        assert data["status"] == "wishlisted"


# ─── GET /user-books ───────────────────────────────────────────────────────────


class TestListUserBooks:
    def test_requires_auth(self):
        c = TestClient(app)
        resp = c.get("/user-books")
        assert resp.status_code == 401

    def test_returns_200_with_empty_list(self, client):
        scalars = MagicMock()
        scalars.all.return_value = []
        execute_result = MagicMock()
        execute_result.scalars.return_value = scalars

        async def _fake_db_with_result():
            db = AsyncMock()
            db.execute = AsyncMock(return_value=execute_result)
            yield db

        from app.core.database import get_db

        app.dependency_overrides[get_db] = _fake_db_with_result
        resp = client.get("/user-books")
        app.dependency_overrides[get_db] = lambda: AsyncMock()  # reset
        assert resp.status_code == 200
        assert resp.json() == []

    def test_accepts_status_filter(self, client):
        scalars = MagicMock()
        scalars.all.return_value = []
        execute_result = MagicMock()
        execute_result.scalars.return_value = scalars

        async def _fake_db_with_result():
            db = AsyncMock()
            db.execute = AsyncMock(return_value=execute_result)
            yield db

        from app.core.database import get_db

        app.dependency_overrides[get_db] = _fake_db_with_result
        resp = client.get("/user-books?status=wishlisted")
        assert resp.status_code == 200


# ─── POST /purchased ──────────────────────────────────────────────────────────


class TestAddPurchased:
    def test_requires_auth(self):
        c = TestClient(app)
        resp = c.post("/purchased", json={"book_id": str(BOOK_ID)})
        assert resp.status_code == 401

    def test_returns_404_when_book_not_found(self, client):
        async def _fake_db_with_none():
            db = AsyncMock()
            db.execute = AsyncMock(return_value=_none_result())
            yield db

        from app.core.database import get_db

        app.dependency_overrides[get_db] = _fake_db_with_none
        resp = client.post("/purchased", json={"book_id": str(BOOK_ID)})
        assert resp.status_code == 404


# ─── PATCH /user-books/{id} ───────────────────────────────────────────────────


class TestUpdateUserBook:
    def test_requires_auth(self):
        c = TestClient(app)
        resp = c.patch(f"/user-books/{USER_BOOK_ID}", json={"status": "purchased"})
        assert resp.status_code == 401

    def test_returns_404_when_not_found(self, client):
        async def _fake_db_with_none():
            db = AsyncMock()
            db.execute = AsyncMock(return_value=_none_result())
            yield db

        from app.core.database import get_db

        app.dependency_overrides[get_db] = _fake_db_with_none
        resp = client.patch(f"/user-books/{USER_BOOK_ID}", json={"status": "purchased"})
        assert resp.status_code == 404


# ─── DELETE /user-books/{id} ──────────────────────────────────────────────────


class TestDeleteUserBook:
    def test_requires_auth(self):
        c = TestClient(app)
        resp = c.delete(f"/user-books/{USER_BOOK_ID}")
        assert resp.status_code == 401

    def test_returns_404_when_not_found(self, client):
        async def _fake_db_with_none():
            db = AsyncMock()
            db.execute = AsyncMock(return_value=_none_result())
            yield db

        from app.core.database import get_db

        app.dependency_overrides[get_db] = _fake_db_with_none
        resp = client.delete(f"/user-books/{USER_BOOK_ID}")
        assert resp.status_code == 404

    def test_returns_204_on_success(self, client):
        ub = MagicMock()

        async def _fake_db_with_ub():
            db = AsyncMock()
            db.execute = AsyncMock(return_value=_scalar_result(ub))
            db.delete = AsyncMock()
            db.commit = AsyncMock()
            yield db

        from app.core.database import get_db

        app.dependency_overrides[get_db] = _fake_db_with_ub
        resp = client.delete(f"/user-books/{USER_BOOK_ID}")
        assert resp.status_code == 204


# ─── PATCH /user-books/{id} — success cases ───────────────────────────────────


class TestUpdateUserBookSuccess:
    def test_returns_200_when_status_updated(self, client):
        ub = _make_user_book(status="wishlisted")

        async def _fake_db_with_ub():
            db = AsyncMock()
            # first execute (fetch), second execute (re-fetch after commit)
            db.execute = AsyncMock(
                side_effect=[_scalar_result(ub), _scalar_one_result(ub)]
            )
            db.commit = AsyncMock()
            db.refresh = AsyncMock()
            yield db

        from app.core.database import get_db

        app.dependency_overrides[get_db] = _fake_db_with_ub
        resp = client.patch(f"/user-books/{USER_BOOK_ID}", json={"status": "purchased"})
        assert resp.status_code == 200

    def test_sets_purchased_at_when_advancing_to_purchased(self, client):
        ub = _make_user_book(status="wishlisted", purchased_at=None)

        async def _fake_db_with_ub():
            db = AsyncMock()
            db.execute = AsyncMock(
                side_effect=[_scalar_result(ub), _scalar_one_result(ub)]
            )
            db.commit = AsyncMock()
            db.refresh = AsyncMock()
            yield db

        from app.core.database import get_db

        app.dependency_overrides[get_db] = _fake_db_with_ub
        client.patch(f"/user-books/{USER_BOOK_ID}", json={"status": "purchased"})
        assert ub.purchased_at is not None

    def test_sets_started_at_when_advancing_to_reading(self, client):
        ub = _make_user_book(status="purchased", started_at=None)

        async def _fake_db_with_ub():
            db = AsyncMock()
            db.execute = AsyncMock(
                side_effect=[_scalar_result(ub), _scalar_one_result(ub)]
            )
            db.commit = AsyncMock()
            db.refresh = AsyncMock()
            yield db

        from app.core.database import get_db

        app.dependency_overrides[get_db] = _fake_db_with_ub
        client.patch(f"/user-books/{USER_BOOK_ID}", json={"status": "reading"})
        assert ub.started_at is not None

    def test_sets_finished_at_when_advancing_to_read(self, client):
        ub = _make_user_book(status="reading", finished_at=None)

        async def _fake_db_with_ub():
            db = AsyncMock()
            db.execute = AsyncMock(
                side_effect=[_scalar_result(ub), _scalar_one_result(ub)]
            )
            db.commit = AsyncMock()
            db.refresh = AsyncMock()
            yield db

        from app.core.database import get_db

        app.dependency_overrides[get_db] = _fake_db_with_ub
        client.patch(f"/user-books/{USER_BOOK_ID}", json={"status": "read"})
        assert ub.finished_at is not None

    def test_updates_notes(self, client):
        ub = _make_user_book()

        async def _fake_db_with_ub():
            db = AsyncMock()
            db.execute = AsyncMock(
                side_effect=[_scalar_result(ub), _scalar_one_result(ub)]
            )
            db.commit = AsyncMock()
            db.refresh = AsyncMock()
            yield db

        from app.core.database import get_db

        app.dependency_overrides[get_db] = _fake_db_with_ub
        resp = client.patch(f"/user-books/{USER_BOOK_ID}", json={"notes": "loved it"})
        assert resp.status_code == 200
        assert ub.notes == "loved it"

    def test_updates_rating(self, client):
        ub = _make_user_book()

        async def _fake_db_with_ub():
            db = AsyncMock()
            db.execute = AsyncMock(
                side_effect=[_scalar_result(ub), _scalar_one_result(ub)]
            )
            db.commit = AsyncMock()
            db.refresh = AsyncMock()
            yield db

        from app.core.database import get_db

        app.dependency_overrides[get_db] = _fake_db_with_ub
        resp = client.patch(f"/user-books/{USER_BOOK_ID}", json={"rating": 5})
        assert resp.status_code == 200
        assert ub.rating == 5

    def test_returns_422_for_rating_below_1(self, client):
        resp = client.patch(f"/user-books/{USER_BOOK_ID}", json={"rating": 0})
        assert resp.status_code == 422

    def test_returns_422_for_rating_above_5(self, client):
        resp = client.patch(f"/user-books/{USER_BOOK_ID}", json={"rating": 6})
        assert resp.status_code == 422

    def test_returns_422_for_invalid_status(self, client):
        resp = client.patch(f"/user-books/{USER_BOOK_ID}", json={"status": "loaned"})
        assert resp.status_code == 422


# ─── Helpers ──────────────────────────────────────────────────────────────────


def _none_result():
    r = MagicMock()
    r.scalar_one_or_none.return_value = None
    return r


def _scalar_result(value):
    r = MagicMock()
    r.scalar_one_or_none.return_value = value
    return r


def _scalar_one_result(value):
    r = MagicMock()
    r.scalar_one.return_value = value
    return r
