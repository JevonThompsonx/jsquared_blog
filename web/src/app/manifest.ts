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
        src: '/icon.svg',
        sizes: '192x192 512x512 any',
        type: 'image/svg+xml',
      },
    ],
  };
}
