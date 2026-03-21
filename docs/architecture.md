# Architecture

See the full project plan in `bookshelf-project-plan.md` for all architectural decisions.

## Overview

Monorepo with Expo (React Native + Web) frontend and FastAPI backend, deployed on Render with PostgreSQL.

## Key Decisions

- **Auth:** Google SSO → JWT RS256, single-user locked via `ALLOWED_EMAILS`
- **Book ID:** ChatGPT Vision (abstracted; swap-ready for OpenAI Vision native)
- **Dedup:** Work-level via Open Library `work_id` (any edition = one record)
- **Metadata:** Open Library for work identity, Google Books for covers + descriptions
- **Token storage:** SecureStore only (never AsyncStorage)
