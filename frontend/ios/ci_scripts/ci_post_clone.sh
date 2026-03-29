#!/bin/zsh
# Xcode Cloud: runs automatically after the repo is cloned.
# Node.js is not pre-installed on Xcode Cloud workers — install via Homebrew.
# Pods/ is gitignored, so pod install must run before xcodebuild archive.
set -e

# Allow Sentry source-map upload to fail gracefully in CI
# (org/project/auth token must be configured as Xcode Cloud env vars)
export SENTRY_ALLOW_FAILURE=true

# Install Node.js
brew install node

# Install Node.js dependencies (required for React Native pod scripts)
cd "$CI_PRIMARY_REPOSITORY_PATH/frontend"
npm ci

# Install CocoaPods dependencies
cd ios
pod install
