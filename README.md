# Bookshelf

A personal mobile + web app to scan books, track your wishlist, and manage your reading collection.

**Stack:** Expo (React Native) · FastAPI · PostgreSQL · Render · GitHub Actions

## Repo Structure

```
bookshelf/
├── backend/    → FastAPI API, SQLAlchemy models, Alembic migrations
├── frontend/   → Expo (React Native + Web) app
├── docs/       → Architecture, API, and security documentation
└── .github/    → CI/CD workflows
```

## Getting Started

### Backend

```bash
cd backend
python -m venv .venv
source .venv/bin/activate   # Windows: .venv\Scripts\activate
pip install -r requirements-dev.txt
cp .env.example .env        # fill in your values
alembic upgrade head
uvicorn app.main:app --reload
```

### Frontend

```bash
cd frontend
npm install
npx expo start
```

## Development Workflow

- `feature/*` → `develop` → `main`
- All PRs must pass CI (lint, format, tests, 80% coverage)
- `develop` auto-deploys to Render staging
- `main` auto-deploys to Render production

## Environment Variables

See `backend/.env.example` for all required variables.

## Documentation

- [Architecture](docs/architecture.md)
- [API Reference](docs/api.md)
- [Security](docs/security.md)
