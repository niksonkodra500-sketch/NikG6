# NikG6 Photo Editor — Build Environment Memory

This file records every tool, dependency, environment variable, and build
procedure installed/configured during this session so future releases can
reproduce the exact same APK build environment.

## ============================================================================
## 1. TOOLS INSTALLED (system level)
## ============================================================================

| Tool | Version | Install Path | How Installed |
|------|---------|--------------|---------------|
| OpenJDK 21 | 21.0.12.1 | `/usr/lib/jvm/java-21-openjdk-amd64` | `apt-get install -y openjdk-21-jdk` |
| Android SDK cmdline-tools | latest | `/opt/android-sdk/cmdline-tools/latest/` | Downloaded from Google, unzipped |
| platform-tools | latest | `/opt/android-sdk/platform-tools/` | `sdkmanager --install platform-tools` |
| build-tools | 34.0.0 | `/opt/android-sdk/build-tools/34.0.0/` | `sdkmanager --install "build-tools;34.0.0"` |
| Android platform | 34 | `/opt/android-sdk/platforms/android-34/` | `sdkmanager --install "platforms;android-34"` |
| Node.js | 24.9.0 | system | pre-installed |
| npm | 11.6.0 | system | pre-installed |
| Gradle | 8.2.1 | project wrapper (`android/gradlew`) | pre-existing in repo |

## ============================================================================
## 2. ENVIRONMENT VARIABLES (must be exported before building)
## ============================================================================

```bash
export JAVA_HOME=/usr/lib/jvm/java-21-openjdk-amd64
export PATH=$JAVA_HOME/bin:$PATH
export ANDROID_HOME=/opt/android-sdk
```

## ============================================================================
## 3. SETUP SCRIPT (one-time, run in fresh sandbox)
## ============================================================================

**File:** `scripts/setup-android-env.sh` (executable)

Does:
1. `apt-get update` + `apt-get install -y openjdk-21-jdk unzip curl`
2. Creates `/opt/android-sdk/`, downloads + extracts commandline-tools-linux
3. Installs platform-tools, build-tools 34.0.0, platforms android-34 via sdkmanager
4. `npm install --no-audit --no-fund`

## ============================================================================
## 4. BUILD SCRIPT (run for every release)
## ============================================================================

**File:** `scripts/build-apk.sh` (executable)

Does:
1. `npm run build` — Vite production build → `dist/`
2. `npx cap sync android` — copies web assets into Android project
3. `cd android && ./gradlew assembleDebug --no-daemon` — compiles debug APK
4. Copies `android/app/build/outputs/apk/debug/app-debug.apk` → `apks/app-debug.apk`

## ============================================================================
## 5. VERIFIED BUILD OUTPUT (this session)
## ============================================================================

- **APK:** `apks/app-debug.apk` — 6,838,683 bytes (6.8 MB)
- **Valid ZIP:** confirmed via `unzip -t`
- **Contains:** classes.dex, classes2.dex, classes3.dex, classes4.dex,
  assets/public/ (web assets), assets/capacitor.config.json,
  assets/capacitor.plugins.json
- **App ID:** `com.nikg6.photoeditor`
- **Version:** 2.1.0 (versionCode 2)
- **minSdk:** 22 | **compileSdk/targetSdk:** 34

## ============================================================================
## 6. FEATURES IN THIS BUILD
## ============================================================================

- Full photo editor: adjustments, filters, crop, rotate, flip, resize, export
- AI Assistant with OpenRouter — **user-enterable API key** via Settings panel
  (no hardcoded key required; built-in default key as fallback)
- Undo/redo with snapshot-based history
- Before/after compare slider
- Projects: save/list/restore/delete (localStorage or Capacitor Filesystem)
- Offline banner + offline editing support
- Update checker via GitHub Releases API
- Dark "divine celestial" theme, glass-morphism UI, responsive mobile tabs

## ============================================================================
## 7. RELEASE TO GITHUB
## ============================================================================

Push a version tag — `.github/workflows/android.yml` triggers automatically:

```bash
git tag v2.1.1
git push origin v2.1.1
```

Or trigger manually from the GitHub "Android APK" workflow tab.

The workflow:
1. `npm ci` + `npm run build`
2. `android-actions/setup-android@v4` (Java 17 + Android SDK)
3. `npx cap sync android`
4. `./gradlew assembleDebug --no-daemon`
5. Uploads `app-debug.apk` as release artifact
6. Creates GitHub Release with notes from android.yml

## ============================================================================
## 8. TROUBLESHOOTING
## ============================================================================

**Java not found:** Ensure `JAVA_HOME` and `$JAVA_HOME/bin` on PATH.

**Gradle plugin download fails (Maven Central 403 / TLS PKIX):**
The sandbox proxies HTTPS through a Cloudflare CA not in Java's default
`cacerts`. Use GitHub Actions runners for official releases (no sandbox
restriction). For local sandbox builds, add the proxy CA to a custom trust
store and pass `-Djavax.net.ssl.trustStore=...` to Gradle, plus an init
script pointing repositories at `https://maven.aliyun.com/repository/public`.

**`capacitor.settings.gradle` missing:** `npx cap sync android` generates it.
If absent, create `android/capacitor.settings.gradle` with:
```
include ':app'
```

**Empty APK (0 bytes):** Gradle dependency resolution failed. Re-run
`./scripts/build-apk.sh` after confirming JAVA_HOME/ANDROID_HOME are set.

## ============================================================================
## 9. SESSION VERIFICATION RESULTS (this session)
## ============================================================================

| Check | Result |
|-------|--------|
| `npm install` | ✅ 127 packages |
| `npm run typecheck` | ✅ Exit 0 |
| `npm run lint` | ✅ Exit 0 |
| `npm test` | ✅ 7 files, 38 tests pass |
| `npm run build` | ✅ 4.96s |
| `npm run e2e` (Playwright) | ✅ 4/4 pass |
| `./gradlew assembleDebug` | ✅ BUILD SUCCESSFUL, 212 tasks |
| APK output | ✅ `apks/app-debug.apk`, 6.8 MB, valid |

## ============================================================================
## END OF MEMORY FILE
## ============================================================================
