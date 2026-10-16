#!/usr/bin/env bash
# =============================================================================
# NikG6 Photo Editor — Build Debug APK
# =============================================================================
# Builds the Android debug APK for release testing.
#
# Prerequisites: run scripts/setup-android-env.sh first.
#
# Usage:
#   chmod +x scripts/build-apk.sh
#   ./scripts/build-apk.sh
#
# Output: apks/app-debug.apk (and android/app/build/outputs/apk/debug/app-debug.apk)
# =============================================================================
set -euo pipefail

APP_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$APP_DIR"

export JAVA_HOME="/usr/lib/jvm/java-21-openjdk-amd64"
export PATH="$JAVA_HOME/bin:$PATH"
export ANDROID_HOME="/opt/android-sdk"

echo "==> Building web assets (Vite)"
npm run build

echo "==> Syncing Capacitor to Android project"
npx cap sync android

echo "==> Building debug APK with Gradle"
cd android
./gradlew assembleDebug --no-daemon

echo "==> Copying APK to apks/"
mkdir -p "$APP_DIR/apks"
cp android/app/build/outputs/apk/debug/app-debug.apk "$APP_DIR/apks/app-debug.apk"

echo "==> APK ready: $APP_DIR/apks/app-debug.apk"
ls -la "$APP_DIR/apks/app-debug.apk"
