# Testing Standards

See [~/.claude/standards/testing.md](~/.claude/standards/testing.md) for universal conventions including 80% coverage threshold, rollback fixture pattern, and accessible query priority.

## book_app specific
- Backend: `pytest tests/ --cov=app --cov-fail-under=80`
- Frontend: `npx jest --coverage`
- E2E (Detox): runs on PRs to `main` only
- DB isolation: rollback fixture in `backend/tests/conftest.py` — do NOT mock the database
