# Bookshelf — Claude Instructions
<!-- Global standards: ~/.claude/CLAUDE.md and ~/.claude/standards/ -->

## Stack
Expo (React Native + Web) · FastAPI · PostgreSQL · Render · GitHub Actions
Monorepo: `backend/` · `frontend/` · `.github/` · `docs/`

## Detail Files — Read Before Acting
- [Git workflow](docs/claude/git.md)      ← READ THIS FIRST
- [Backend](docs/claude/backend.md)
- [Frontend](docs/claude/frontend.md)
- [Testing](docs/claude/testing.md)

## Hard Rules (no exceptions)
1. NEVER push to `dev` or `main` directly.
2. ALL work goes in `feature/<name>` or `bug/<name>` — branch from `dev`.
3. After pushing: open a GitHub draft PR targeting `dev`.
4. Run tests before marking any task done.
5. No hardcoded colours — always use `useTheme()`.
6. `SecureStore` only for tokens — never `AsyncStorage`.
7. SQLAlchemy ORM only — no raw SQL.
8. Every API endpoint must have a `@limiter.limit(settings.rate_limit_*)` decorator — import `limiter` from `app.main`; use `rate_limit_auth` for auth, `rate_limit_writes` for mutations, `rate_limit_reads` for reads.
9. i18n required on all user-facing strings — use i18next + react-i18next + `i18next-resources-to-backend` (bundled locales for Expo/native); no hardcoded copy in components.

## Quick Commands
```
cd backend && uvicorn app.main:app --reload
cd backend && pytest tests/ --cov=app
cd frontend && npx expo start
cd frontend && npx jest
```
