import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.nikg6.photoeditor',
  appName: 'NikG6 Photo Editor',
  webDir: 'dist',
  server: {
    androidScheme: 'https',
  },
};

export default config;
