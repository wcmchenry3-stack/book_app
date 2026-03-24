import os

import pytest

# Ensure DATABASE_URL is a valid-looking URL before any app modules are imported.
# In CI, secrets.TEST_DATABASE_URL is unset so GitHub Actions passes an empty string.
# SQLAlchemy creates the engine lazily — no actual connection is attempted at import
# time, so a non-existent host is safe for unit tests.
if not os.environ.get("DATABASE_URL"):
    os.environ["DATABASE_URL"] = "postgresql+asyncpg://test:test@localhost/test"


@pytest.fixture(autouse=True)
def _reset_rate_limits():
    """Clear in-memory rate limit counters before each test.

    Tests run in the same process and share the slowapi MemoryStorage backend.
    Without this fixture, earlier tests eat into the rate limit budget of later
    tests, causing spurious 429 failures.
    """
    from app.core.limiter import limiter

    storage = getattr(getattr(limiter, "_limiter", None), "storage", None)
    if storage and hasattr(storage, "reset"):
        storage.reset()
    yield
