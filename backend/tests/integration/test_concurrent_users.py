"""Integration tests for concurrent user scenarios.

Requires a real PostgreSQL database — skipped when DATABASE_URL is dummy.
"""

import pytest

from app.models.book import Book
from app.models.user import User
from app.models.user_book import UserBook


@pytest.mark.integration
class TestConcurrentUsers:
    async def test_two_users_wishlist_same_book_share_book_row(self, db_session):
        """Two users wishlisting the same book should reference the same Book row."""
        user1 = User(email="user1@test.com", google_id="g_user1")
        user2 = User(email="user2@test.com", google_id="g_user2")
        book = Book(
            title="Dune",
            author="Frank Herbert",
            open_library_work_id="OL45804W",
        )
        db_session.add_all([user1, user2, book])
        await db_session.flush()

        ub1 = UserBook(user_id=user1.id, book_id=book.id, status="wishlisted")
        ub2 = UserBook(user_id=user2.id, book_id=book.id, status="wishlisted")
        db_session.add_all([ub1, ub2])
        await db_session.flush()

        # Both users reference the same book
        assert ub1.book_id == ub2.book_id
        # But have independent user_book entries
        assert ub1.id != ub2.id
        assert ub1.user_id != ub2.user_id

    async def test_users_can_have_different_statuses_for_same_book(self, db_session):
        """Different users can have different statuses for the same book."""
        user1 = User(email="reader@test.com", google_id="g_reader")
        user2 = User(email="buyer@test.com", google_id="g_buyer")
        book = Book(title="Foundation", author="Isaac Asimov")
        db_session.add_all([user1, user2, book])
        await db_session.flush()

        ub1 = UserBook(user_id=user1.id, book_id=book.id, status="reading", rating=4)
        ub2 = UserBook(user_id=user2.id, book_id=book.id, status="wishlisted")
        db_session.add_all([ub1, ub2])
        await db_session.flush()

        assert ub1.status == "reading"
        assert ub1.rating == 4
        assert ub2.status == "wishlisted"
        assert ub2.rating is None

    async def test_deleting_user_book_does_not_affect_other_users(self, db_session):
        """Deleting one user's UserBook doesn't affect the other user's entry."""
        user1 = User(email="alice@test.com", google_id="g_alice")
        user2 = User(email="bob@test.com", google_id="g_bob")
        book = Book(title="1984", author="George Orwell")
        db_session.add_all([user1, user2, book])
        await db_session.flush()

        ub1 = UserBook(user_id=user1.id, book_id=book.id, status="read")
        ub2 = UserBook(user_id=user2.id, book_id=book.id, status="reading")
        db_session.add_all([ub1, ub2])
        await db_session.flush()

        ub2_id = ub2.id

        # Delete user1's entry
        await db_session.delete(ub1)
        await db_session.flush()

        # user2's entry should still exist
        remaining = await db_session.get(UserBook, ub2_id)
        assert remaining is not None
        assert remaining.user_id == user2.id
