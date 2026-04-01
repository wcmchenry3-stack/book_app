#!/bin/zsh
# Xcode Cloud: runs after xcodebuild completes.
# Validates that the JS bundle was actually included in the archive.
# Without this check, a silent bundling failure produces an app that
# crashes immediately on launch (handleBundleLoadingError).
set -e

echo "INFO: Validating JS bundle is present in archive..."

# In Xcode Cloud archive builds, the .app is inside the archive
if [ -n "$CI_ARCHIVE_PATH" ]; then
  APP_PATH=$(find "$CI_ARCHIVE_PATH" -name "*.app" -type d | head -1)
  if [ -z "$APP_PATH" ]; then
    echo "WARNING: Could not locate .app in archive, skipping bundle check"
    exit 0
  fi

  BUNDLE_PATH="$APP_PATH/main.jsbundle"
  if [ ! -f "$BUNDLE_PATH" ]; then
    echo "error: main.jsbundle is MISSING from the app bundle!"
    echo "error: The 'Bundle React Native code' build phase failed silently."
    echo "error: The app WILL crash on launch without this file."
    echo "error: Check the build log for NODE_BINARY and sentry-xcode.sh errors."
    exit 1
  fi

  BUNDLE_SIZE=$(stat -f%z "$BUNDLE_PATH" 2>/dev/null || stat --printf="%s" "$BUNDLE_PATH" 2>/dev/null || echo "0")
  if [ "$BUNDLE_SIZE" -lt 1000 ]; then
    echo "error: main.jsbundle exists but is suspiciously small (${BUNDLE_SIZE} bytes)."
    echo "error: The bundle may be corrupted or incomplete."
    exit 1
  fi

  echo "INFO: main.jsbundle found (${BUNDLE_SIZE} bytes) ✓"
else
  echo "INFO: Not an archive build (CI_ARCHIVE_PATH not set), skipping bundle check"
fi
