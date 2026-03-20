import { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'J²Adventures',
    short_name: 'J²Adventures',
    description: 'A travel blog for our adventures.',
    start_url: '/',
    display: 'standalone',
    background_color: '#ffffff',
    theme_color: '#4a5d4e', // Sage green (from the primary theme)
    icons: [
      {
        // SVG is scalable — use `sizes: 'any'` per Web App Manifest spec.
        // Note: some browsers (notably older Chrome on Android) require PNG
        // icons for home-screen install. Add PNG variants when available.
        src: '/icon.svg',
        sizes: 'any',
        type: 'image/svg+xml',
      },
    ],
  };
}
