#!/usr/bin/env bash
# =============================================================================
# NikG6 Photo Editor — Android Release Environment Setup
# =============================================================================
# Runs inside a fresh Debian/Ubuntu sandbox to prepare everything needed
# to build the Android debug/release APK.
#
# Usage:
#   chmod +x scripts/setup-android-env.sh
#   ./scripts/setup-android-env.sh
#
# After this script, run: ./scripts/build-apk.sh
# =============================================================================
set -euo pipefail

APP_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$APP_DIR"

JAVA_HOME="/usr/lib/jvm/java-21-openjdk-amd64"
ANDROID_HOME="/opt/android-sdk"

echo "==> [1/5] Installing Java 21 JDK"
apt-get update -qq
DEBIAN_FRONTEND=noninteractive apt-get install -y -qq openjdk-21-jdk unzip curl
export JAVA_HOME="$JAVA_HOME"
export PATH="$JAVA_HOME/bin:$PATH"
java -version 2>&1

echo "==> [2/5] Installing Android SDK command-line tools"
mkdir -p "$ANDROID_HOME"
if [ ! -f "$ANDROID_HOME/cmdline-tools/latest/bin/sdkmanager" ]; then
  mkdir -p "$ANDROID_HOME/cmdline-tools"
  cd "$ANDROID_HOME"
  curl -sL -o cmdline-tools.zip https://dl.google.com/android/repository/commandlinetools-linux-11076708_latest.zip
  unzip -o -q cmdline-tools.zip -d cmdline-tools/
  mv cmdline-tools/cmdline-tools cmdline-tools/latest
  cd "$APP_DIR"
fi
echo "   sdkmanager found at: $ANDROID_HOME/cmdline-tools/latest/bin/sdkmanager"

echo "==> [3/5] Installing Android SDK components (platform 34, build-tools 34, platform-tools)"
export ANDROID_HOME="$ANDROID_HOME"
yes | "$ANDROID_HOME/cmdline-tools/latest/bin/sdkmanager" --sdk_root="$ANDROID_HOME" \
  "platform-tools" "build-tools;34.0.0" "platforms;android-34" >/dev/null 2>&1 || true
ls "$ANDROID_HOME/platforms/" "$ANDROID_HOME/build-tools/" "$ANDROID_HOME/platform-tools/"

echo "==> [4/5] Installing npm dependencies"
npm install --no-audit --no-fund

echo "==> [5/5] Environment ready"
echo "   JAVA_HOME=$JAVA_HOME"
echo "   ANDROID_HOME=$ANDROID_HOME"
echo "   Next step: ./scripts/build-apk.sh"
