import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.dein.bundle.id',   // dein Bundle-ID lassen wie sie ist
  appName: 'schulplaner',
  webDir: 'out',                 // kann bleiben
  server: {
    url: 'https://meinplan.schule',
    cleartext: false,
  },
};

export default config;
