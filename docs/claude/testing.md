# Testing Standards

## Coverage Thresholds (enforced in CI)
- Backend: 80% minimum (`--cov-fail-under=80`)
- Frontend: 80% minimum (Jest `coverageThreshold`)

## Backend

### Test Structure
```
backend/tests/
  unit/           → pure logic, no DB, no HTTP
  integration/    → full request/response via httpx + real DB session
  security/       → OWASP ZAP config, pen test scripts
```

### DB Isolation — Rollback Fixture (required for all DB tests)
```python
@pytest.fixture
async def db_session():
    async with engine.begin() as conn:
        await conn.begin_nested()
        session = AsyncSession(conn)
        yield session
        await conn.rollback()   # always rolls back — no state leaks between tests
```

- **Do NOT mock the database** in integration tests — use the real session + rollback
- Each test gets a clean slate via rollback, not truncation

### Running
```bash
pytest tests/ --cov=app --cov-fail-under=80
pytest tests/unit/          # unit only
pytest tests/integration/   # integration only
```

## Frontend

### Test Structure
```
frontend/__tests__/
  unit/    → components, hooks, utilities (Jest + React Native Testing Library)
  e2e/     → full app flows (Detox — runs on PRs to main only)
```

### Patterns
- Use `@testing-library/react-native` queries — prefer accessible queries (`getByRole`, `getByLabelText`) over `getByTestId`
- Wrap components in `ThemeProvider` for any component that calls `useTheme()`
- Mock `expo-secure-store` in unit tests

### Running
```bash
npx jest                     # all unit tests
npx jest --coverage          # with report
npx jest __tests__/unit/     # unit only
```

## CI Enforcement
- Unit + integration tests: every PR to `develop` and `main`
- E2E (Detox): PRs to `main` only
- OWASP ZAP baseline: post-deploy to staging (in `deploy.yml`)
