#!/bin/zsh
# Xcode Cloud: runs automatically after the repo is cloned.
# Node.js is not pre-installed on Xcode Cloud workers — install via Homebrew.
# Pods/ is gitignored, so pod install must run before xcodebuild archive.
set -e

# Install Node.js
brew install node

# Install Node.js dependencies (required for React Native pod scripts)
cd "$CI_PRIMARY_REPOSITORY_PATH/frontend"
npm ci

# Install CocoaPods dependencies
cd ios
pod install
