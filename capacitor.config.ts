import type { CapacitorConfig } from '@capacitor/cli';

// Live-reload / dev-server config is driven by the CAPACITOR_DEV_SERVER_URL
// environment variable, which the Capacitor CLI sets automatically when you
// run `npx cap run android --live-reload`. It is never set during a normal
// `npm run build` or CI build, so production APKs never point at a dev server.
const devServerUrl = process.env.CAPACITOR_DEV_SERVER_URL;
const isCleartext = devServerUrl ? devServerUrl.startsWith('http://') : false;

const config: CapacitorConfig = {
  appId: 'com.nikg6.photoeditor',
  appName: 'NikG6 Photo Editor',
  webDir: 'dist',
  server: devServerUrl
    ? {
        url: devServerUrl,
        // Allow plain HTTP to the dev server on Android (cleartext is off by
        // default on Android 9+ and would otherwise block the live reload).
        cleartext: isCleartext,
        androidScheme: isCleartext ? 'http' : 'https',
      }
    : {
        // Production: load the bundled web assets from the APK. No external
        // URL, so the app works fully offline.
        androidScheme: 'https',
      },
};

export default config;
