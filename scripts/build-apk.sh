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
#
# Environment (export before running):
#   export JAVA_HOME=/usr/lib/jvm/java-21-openjdk-amd64
#   export PATH=$JAVA_HOME/bin:$PATH
#   export ANDROID_HOME=/opt/android-sdk
# =============================================================================
set -euo pipefail

APP_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$APP_DIR"

# Required environment
export JAVA_HOME="${JAVA_HOME:-/usr/lib/jvm/java-21-openjdk-amd64}"
export PATH="$JAVA_HOME/bin:$PATH"
export ANDROID_HOME="${ANDROID_HOME:-/opt/android-sdk}"

# Gradle configuration from previous successful build
export GRADLE_USER_HOME="/tmp/kilo/gradle-home"
GRADLE_BIN="/tmp/kilo/gradle-8.2.1/bin/gradle"
TRUST_STORE="/tmp/kilo/truststore.jks"

echo "==> Environment check"
java -version 2>&1
echo "   JAVA_HOME=$JAVA_HOME"
echo "   ANDROID_HOME=$ANDROID_HOME"
echo "   GRADLE_USER_HOME=$GRADLE_USER_HOME"

echo "==> Building web assets (Vite)"
npm run build

echo "==> Syncing Capacitor to Android project"
npx cap sync android

echo "==> Building debug APK with Gradle"
cd "$APP_DIR/android"
"$GRADLE_BIN" assembleDebug --no-daemon \
  -Dorg.gradle.java.home="$JAVA_HOME" \
  -Djavax.net.ssl.trustStore="$TRUST_STORE" \
  --init-script "$GRADLE_USER_HOME/init.gradle" 2>&1

echo "==> Copying APK to apks/"
mkdir -p "$APP_DIR/apks"
cp "$APP_DIR/android/app/build/outputs/apk/debug/app-debug.apk" "$APP_DIR/apks/app-debug.apk"

echo "==> APK ready: $APP_DIR/apks/app-debug.apk"
ls -la "$APP_DIR/apks/app-debug.apk"
