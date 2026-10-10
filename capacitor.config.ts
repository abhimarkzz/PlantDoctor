import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'org.plantdoctor.app',
  appName: 'Plant Doctor',
  webDir: 'dist',
  server: {
    androidScheme: 'https',
    cleartext: true, // Allow local development backend over http://10.0.2.2:8000 in emulator
  },
  plugins: {
    // Web and native camera permissions
  },
};

export default config;
