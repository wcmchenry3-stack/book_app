# API Reference

Full interactive docs available at `/docs` in non-production environments.

## Auth

| Method | Path | Description |
|--------|------|-------------|
| POST | `/auth/google` | Exchange Google auth code for JWT + refresh token |
| POST | `/auth/refresh` | Exchange refresh token for new JWT |
| POST | `/auth/logout` | Invalidate refresh token |
| GET | `/auth/me` | Current user profile |

## Scan & Search

| Method | Path | Description |
|--------|------|-------------|
| POST | `/scan` | Image → top 3 enriched book candidates (10/min rate limit, 5MB max) |
| GET | `/books/search` | Manual search fallback: `?q=title+author` |
| GET | `/books/{id}` | Full book detail |

## User Books

| Method | Path | Description |
|--------|------|-------------|
| GET | `/user-books` | All user books, filterable by `?status=wishlisted\|purchased\|reading\|read` |
| POST | `/wishlist` | Add book to wishlist |
| POST | `/purchased` | Promote from wishlist or add new purchased book |
| PATCH | `/user-books/{id}` | Update status, notes, rating |
| DELETE | `/user-books/{id}` | Remove from any list |
