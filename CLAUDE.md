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
- [iOS CI/CD](docs/claude/ios-ci.md)      ← READ BEFORE touching ios/ or ci_scripts/
- [Android CI/CD](docs/claude/android-ci.md) ← READ BEFORE touching android/ or EAS config

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

## iOS / Native File Rules
10. Before modifying files under `frontend/ios/`: run `pod install` locally and commit `Podfile.lock` changes.
11. Never delete `Podfile.lock` — it ensures reproducible pod versions across CI builds.
12. Never change Node.js version pins (in `ci_post_clone.sh` or `package.json` engines) without verifying npm compatibility — npm 11.x has known crashes.
13. First import in `app/_layout.tsx` must always be `from '../lib/sentry'` — Sentry must self-init before any other module.
14. Read `docs/claude/ios-ci.md` before modifying `ci_post_clone.sh`, `ci_post_xcodebuild.sh`, or anything in `ci_scripts/`.
15. After any change to Podfile, `.xcode.env`, or `ci_scripts/*`, verify `js-bundle-check` and `ios-build-check` CI jobs pass before merging.

## Android / Native File Rules
16. Before modifying files under `frontend/android/`: verify the change builds locally with `cd frontend/android && ./gradlew assembleDebug`.
17. Never commit `upload-keystore.jks`, `debug.keystore`, or `local.properties` — these are gitignored for security.
18. Never change the Gradle wrapper version (`gradle-wrapper.properties`) without verifying compatibility with current AGP and React Native Gradle Plugin.
19. Read `docs/claude/android-ci.md` before modifying `build.gradle`, `settings.gradle`, `gradle.properties`, or EAS build configuration.
20. After any change to `build.gradle`, `settings.gradle`, `gradle.properties`, or `eas.json`, verify `android-bundle-check` and `android-build-check` CI jobs pass before merging.
21. `sentry.properties` must use environment variables for org/project/token — never hardcode Sentry credentials.

## Quick Commands
```
cd backend && uvicorn app.main:app --reload
cd backend && pytest tests/ --cov=app
cd frontend && npx expo start
cd frontend && npx jest
```
