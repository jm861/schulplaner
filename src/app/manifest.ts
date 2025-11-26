import type { MetadataRoute } from 'next';

export const dynamic = 'force-static';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Schulplaner',
    short_name: 'Schulplaner',
    description:
      'Plane Unterricht, Aufgaben, Prüfungen und Lernphasen – optimiert für Schüler:innen mit mobilen Geräten.',
    start_url: '/',
    display: 'standalone',
    background_color: '#ffffff',
    theme_color: '#2563EB',
    lang: 'de',
    orientation: 'portrait',
    icons: [
      {
        src: '/icons/pwa-icon-192.png',
        sizes: '192x192',
        type: 'image/png',
      },
      {
        src: '/icons/pwa-icon-512.png',
        sizes: '512x512',
        type: 'image/png',
      },
      {
        src: '/icons/pwa-maskable-icon-512.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'maskable',
      },
    ],
    shortcuts: [
      {
        name: 'Kalender',
        url: '/calendar',
      },
      {
        name: 'Aufgaben',
        url: '/tasks',
      },
    ],
  };
}


