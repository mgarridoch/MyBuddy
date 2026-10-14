import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.martin.mybuddy',
  appName: 'MyBuddy',
  webDir: 'dist',
  server: {
    androidScheme: 'https',
  },
};

export default config;