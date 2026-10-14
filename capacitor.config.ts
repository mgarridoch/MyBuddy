import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.martin.mybuddy',
  appName: 'MyBuddy',
  webDir: 'dist',
  server: {
    // Reemplaza esto por tu URL real de Vercel:
    url: 'https://my-buddy-seven.vercel.app',
    cleartext: true,
  },
};

export default config;