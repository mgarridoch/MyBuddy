import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.martin.mybuddy',
  appName: 'MyBuddy',
  webDir: 'dist',
  server: {
    url: 'https://TU-URL-DE-VERCEL.vercel.app', // <-- Pon aquí tu URL real de Vercel
    cleartext: true,
  },
  // Truco clave: Google bloquea el login dentro de WebViews si detecta "; wv" en el User-Agent.
  // Con esto le damos un User-Agent limpio de Chrome Mobile para que haga el login ADENTRO de la app sin abrir el navegador externo:
  overrideUserAgent:
    'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Mobile Safari/537.36',
};

export default config;