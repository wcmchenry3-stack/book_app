# Security Policy

## Supported Versions

| Version | Supported |
|---------|-----------|
| Latest (`main`) | Yes |

## Reporting a Vulnerability

**Do not open a public GitHub issue for security vulnerabilities.**

To report a security vulnerability, please email the maintainer directly (see the GitHub profile for contact details).

Include in your report:
- Description of the vulnerability
- Steps to reproduce
- Potential impact assessment
- Any suggested mitigations (optional)

**Response timeline:**
- Acknowledgment within **48 hours**
- Status update within **7 days**
- Fix or mitigation plan within **30 days** for confirmed vulnerabilities

## Disclosure Policy

- Vulnerabilities will be remediated before public disclosure.
- Reporters will be credited in the release notes (unless they prefer anonymity).
- We follow a 90-day coordinated disclosure timeline.

## Automated Security Controls

Every pull request is gated on the following automated checks:

| Check | Tool | What it catches |
|-------|------|----------------|
| SAST | Bandit | Python code security issues (injection, insecure patterns) |
| SCA — Python | pip-audit | Known CVEs in Python dependencies |
| SCA — Frontend | npm audit | Known CVEs in Node/Expo dependencies |
| Secret scanning | GitHub Secret Scanning + Gitleaks | Credentials committed to source |
| DAST (post-deploy) | OWASP ZAP | Live application vulnerabilities (XSS, SQLi, etc.) |
| DAST (weekly) | OWASP ZAP active scan | Active penetration testing against the deployed API |

## Security Architecture Highlights

- **Authentication:** RS256 JWT with Google OAuth; refresh token rotation with JTI revocation
- **SQL:** SQLAlchemy ORM only — no raw SQL; parameterized queries throughout
- **Rate limiting:** Per-user (authenticated) and per-IP (unauthenticated) via slowapi
- **File uploads:** Extension, MIME type, size, and magic bytes validation before processing
- **Security headers:** CSP, HSTS (production), X-Frame-Options, X-Content-Type-Options, Permissions-Policy
- **CORS:** Explicit allowlist; wildcard origins are rejected at configuration validation time
