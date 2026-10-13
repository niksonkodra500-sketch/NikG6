Build the Android APK:

1. Sync Capacitor: `npx cap sync android`
2. Build debug APK: `cd android && ./gradlew assembleDebug --no-daemon`
3. APK location: `android/app/build/outputs/apk/debug/app-debug.apk`