# iOS CI/CD — Build Infrastructure

## IMPORTANT: We use Xcode Cloud, NOT EAS Build

iOS builds and App Store submissions run through **Xcode Cloud** (Apple's CI,
`/Volumes/workspace/` on the build worker). EAS Build is NOT used. Do not
suggest EAS-specific fixes (e.g. `eas.json` resource classes) for Xcode Cloud
build failures.

## Why `pod install` must run in CI

`Pods/` is listed in `frontend/ios/.gitignore` and is never committed. Xcode
Cloud clones the repo and jumps straight to `xcodebuild archive`, which fails
with:

```
Unable to open base configuration reference file
  …/Pods/Target Support Files/Pods-Bookshelf/Pods-Bookshelf.release.xcconfig
```

## The fix: `ci_scripts/ci_post_clone.sh`

Xcode Cloud automatically executes
`frontend/ios/ci_scripts/ci_post_clone.sh` after cloning. This script runs
`npm ci` (required for React Native's pod scripts) then `pod install`.

File: `frontend/ios/ci_scripts/ci_post_clone.sh`

```sh
#!/bin/sh
set -e
cd "$CI_PRIMARY_REPOSITORY_PATH/frontend"
npm ci
cd ios
pod install
```

The script must be **executable** (`chmod +x`). Git preserves the execute bit
via `core.fileMode` — verify with `git ls-files --stage frontend/ios/ci_scripts/`.

## Bare workflow

`frontend/ios/` is committed (bare Expo workflow). Running `expo prebuild`
locally regenerates it; Xcode Cloud does NOT run prebuild — it uses the
committed `ios/` directory directly.

## JS bundle validation (GitHub Actions)

The `js-bundle-check` CI job runs `react-native bundle --platform ios` on every
PR to verify the JS bundle can be created. This catches silent bundling failures
before they reach Xcode Cloud.

The Xcode build CI check (`ios-build-check`) only compiles in Debug mode, which
sets `SKIP_BUNDLING=1` — it cannot detect bundler or entry-point issues.

## Sentry bundling fallback

The "Bundle React Native code" build phase runs through `sentry-xcode.sh`, which
wraps `react-native-xcode.sh`. If `sentry-cli` fails (e.g. missing `SENTRY_ORG`)
before invoking the bundler, `SENTRY_ALLOW_FAILURE=true` masks the failure as
exit 0 — and `main.jsbundle` is never created.

A fallback in the build phase detects this and runs `react-native-xcode.sh`
directly. The `ci_post_xcodebuild.sh` script also validates the bundle exists
in the archive as a final safety net.

## Key paths on the Xcode Cloud worker

| Path | What it is |
|---|---|
| `/Volumes/workspace/repository/` | Repo root |
| `/Volumes/workspace/repository/frontend/ios/Bookshelf.xcworkspace` | Workspace opened by Xcode Cloud |
| `/Volumes/workspace/build.xcarchive` | Output archive |
| `/Volumes/workspace/DerivedData` | Build intermediates |
