# Security

See [~/.claude/standards/security.md](~/.claude/standards/security.md) for universal security standards.

## Controls

| Concern | Solution |
|---------|----------|
| JWT algorithm confusion | Pinned to RS256; all other algorithms including `none` rejected |
| JWT expiry | 24hr access token, 7-day refresh token |
| Single-user lock | `ALLOWED_EMAILS` env var checked post-Google-auth |
| Rate limiting | `slowapi` — 10 req/min on `/scan` per user |
| CORS | Locked to Expo app scheme + Render domain only |
| Input validation | Pydantic on all endpoints; max image size 5MB |
| SQL injection | SQLAlchemy ORM throughout; no raw SQL |
| HTTPS | Render TLS termination; HSTS header |
| Secret scanning | `gitleaks` pre-commit hook |
| Dependency CVEs | Dependabot + `pip-audit` in CI |
| OWASP ZAP | Automated baseline scan post-deploy to staging |
| Token storage | SecureStore only |

## Pre-commit Hook (gitleaks)

Install: `brew install gitleaks` (or via pip on Windows)

```bash
# .git/hooks/pre-commit
gitleaks protect --staged --redact
```
