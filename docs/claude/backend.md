# Backend Conventions

## Stack
FastAPI · SQLAlchemy (async) · asyncpg · Alembic · pydantic-settings · httpx · slowapi

## Running Locally

```bash
cd backend
python -m venv .venv && source .venv/bin/activate   # Windows: .venv\Scripts\activate
pip install -r requirements-dev.txt
cp .env.example .env   # fill in your values
alembic upgrade head
uvicorn app.main:app --reload
```

## Key Patterns

### Config
All config loaded via `pydantic-settings` in `app/core/config.py`.
Never hardcode env values — always use `settings.<key>`.

### Database
- Async session via `get_db()` dependency (`app/core/database.py`)
- Always use `async with` — never call `.commit()` manually outside a transaction
- SQLAlchemy ORM throughout — no raw SQL, ever

### Routes
- All routes (Phase 3+) require `get_current_user` FastAPI dependency
- Pydantic schemas for every request and response body — no untyped dicts
- Rate limit `/scan`: 10 req/min per user via slowapi
- Max image upload: 5MB — enforce in the endpoint handler before processing

### Auth
- JWT RS256 only — reject all other algorithms including `none`
- Allowlist check via `ALLOWED_EMAILS` env var after Google auth

## Commands

```bash
# Tests
pytest tests/ --cov=app --cov-fail-under=80

# Lint + format
ruff check .
black --check .

# Migrations
alembic revision --autogenerate -m "description"
alembic upgrade head
```
