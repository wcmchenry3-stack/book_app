import os

# Ensure DATABASE_URL is a valid-looking URL before any app modules are imported.
# In CI, secrets.TEST_DATABASE_URL is unset so GitHub Actions passes an empty string.
# SQLAlchemy creates the engine lazily — no actual connection is attempted at import
# time, so a non-existent host is safe for unit tests.
if not os.environ.get("DATABASE_URL"):
    os.environ["DATABASE_URL"] = "postgresql+asyncpg://test:test@localhost/test"
