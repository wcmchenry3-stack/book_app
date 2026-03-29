#!/bin/sh
# Xcode Cloud: runs automatically after the repo is cloned.
# Pods/ is gitignored, so we must run pod install before xcodebuild archive.
set -e

# Node modules are required for React Native's pod scripts (e.g. react-native-codegen).
cd "$CI_PRIMARY_REPOSITORY_PATH/frontend"
npm ci

# Install CocoaPods dependencies.
cd ios
pod install
