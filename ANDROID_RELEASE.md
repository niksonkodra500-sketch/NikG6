# Android Release Guide — NikG6 Photo Editor

## Overview
This document describes how to prepare the build environment and produce an
APK release for the NikG6 Photo Editor. The app is a Capacitor (Android-first)
React + Vite application.

## Environment Setup (one-time per session)

Run the setup script:

```bash
chmod +x scripts/setup-android-env.sh
./scripts/setup-android-env.sh
```

This installs:
- **OpenJDK 21** (`/usr/lib/jvm/java-21-openjdk-amd64`)
- **Android SDK command-line tools** (`/opt/android-sdk`)
  - platform-tools
  - build-tools 34.0.0
  - platforms android-34
- **npm dependencies** (including `@capacitor/*` and `capacitor-secure-storage-plugin`)

## Build the APK

```bash
chmod +x scripts/build-apk.sh
./scripts/build-apk.sh
```

This runs:
1. `npm run build` — Vite production web build → `dist/`
2. `npx cap sync android` — copies web assets into the Android project
3. `./gradlew assembleDebug` — compiles the debug APK
4. Copies the APK to `apks/app-debug.apk`

Output: `apks/app-debug.apk` (~6.8 MB debug build)

## Release to GitHub

The repository has a GitHub Actions workflow at
`.github/workflows/android.yml` that builds and publishes the APK as a
GitHub Release when you push a `v*` tag:

```bash
git tag v2.1.1
git push origin v2.1.1
```

Or trigger the "Android APK" workflow manually from the GitHub Actions tab.

Latest release: v2.1.2 (canvas sizing fixes).

The workflow:
1. Runs `npm ci` + `npm run build`
2. Sets up Java 17 + Android SDK via `android-actions/setup-android@v4`
3. Runs `npx cap sync android`
4. Runs `./gradlew assembleDebug --no-daemon`
5. Uploads `app-debug.apk` as a release artifact

## Key Files

| File | Purpose |
|------|---------|
| `scripts/setup-android-env.sh` | Recreates the build environment (JDK + Android SDK) |
| `scripts/build-apk.sh` | Builds the debug APK |
| `capacitor.config.ts` | Capacitor app config (appId: `com.nikg6.photoeditor`) |
| `android/variables.gradle` | minSdk 22, compileSdk/targetSdk 34 |
| `.github/workflows/android.yml` | CI workflow that builds + releases the APK |
| `.github/workflows/ci.yml` | CI workflow (typecheck, lint, unit tests, e2e, build) |

## Troubleshooting

**Gradle plugin download fails (Maven Central 403 / TLS):**
The sandbox proxies HTTPS through a Cloudflare CA that Java's default
`cacerts` does not trust. The CI workflow runs on GitHub-hosted runners
which do not have this restriction, so use the GitHub Actions workflow for
official releases rather than building locally in a sandbox.

**`capacitor.settings.gradle` missing:**
`npx cap sync android` generates it. If it is absent, create it with:
```
include ':app'
```

**Java not found:**
Ensure `JAVA_HOME=/usr/lib/jvm/java-21-openjdk-amd64` is exported and
`$JAVA_HOME/bin` is on `PATH` before running Gradle.
