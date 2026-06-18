# Public Assets

## PWA Icons

The app uses an SVG icon (`icon.svg`) for PWA support. For full Android PWA home-screen install support, PNG icons are needed:

1. Generate 192x192 and 512x512 PNGs from `icon.svg`
2. Place them as `icon-192.png` and `icon-512.png` in this directory
3. Uncomment the PNG icon entries in `web/src/app/manifest.ts`

## Screenshots

PWA manifests can include screenshots for app store listings. To add them:

1. Capture screenshots from the live site (light/dark modes)
2. Save as `screenshots/home-desktop.png` (1280x720) and `screenshots/home-mobile.png` (390x844)
3. The manifest entries in `web/src/app/manifest.ts` already reference these paths
