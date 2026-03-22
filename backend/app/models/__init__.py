# Import all models here so Alembic's env.py sees them via Base.metadata
from app.models.user import User
from app.models.book import Book
from app.models.edition import Edition
from app.models.user_book import UserBook

__all__ = ["User", "Book", "Edition", "UserBook"]
