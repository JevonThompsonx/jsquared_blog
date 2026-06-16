import { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'J²Adventures',
    short_name: 'J²Adventures',
    description: 'A travel blog for our adventures.',
    lang: 'en',
    start_url: '/',
    display: 'standalone',
    background_color: '#ffffff',
    theme_color: '#4a5d4e', // Sage green (from the primary theme)
    categories: ['travel', 'blog', 'lifestyle'],
    icons: [
      {
        // SVG is scalable — use `sizes: 'any'` per Web App Manifest spec.
        // Note: some browsers (notably older Chrome on Android) require PNG
        // icons for home-screen install. Add PNG variants when available.
        src: '/icon.svg',
        sizes: 'any',
        type: 'image/svg+xml',
        purpose: 'any',
      },
      // TODO: add 192x192 and 512x512 PNG icon variants generated from /icon.svg
      // so older Android Chrome can install the PWA on the home screen.
      // {
      //   src: '/icon-192.png',
      //   sizes: '192x192',
      //   type: 'image/png',
      // },
      // {
      //   src: '/icon-512.png',
      //   sizes: '512x512',
      //   type: 'image/png',
      // },
    ],
    // TODO: drop real PNG screenshots into /public/screenshots/ once the
    // light/dark captures exist. The shape below matches the Web App Manifest
    // spec — `form_factor` is required to differentiate mobile vs desktop.
    screenshots: [
      {
        src: '/screenshots/home-desktop.png',
        sizes: '1280x720',
        type: 'image/png',
        form_factor: 'wide',
        label: 'J²Adventures home — desktop',
      },
      {
        src: '/screenshots/home-mobile.png',
        sizes: '390x844',
        type: 'image/png',
        form_factor: 'narrow',
        label: 'J²Adventures home — mobile',
      },
    ],
  };
}
