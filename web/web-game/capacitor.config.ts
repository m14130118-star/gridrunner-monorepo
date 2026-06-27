import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'ai.gridrunner.app',
  appName: 'GridRunner',
  webDir: 'out',
  server: {
    androidScheme: 'https',
  },
};

export default config;
