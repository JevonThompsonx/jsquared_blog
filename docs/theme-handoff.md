# Theme Handoff

## Goal

Continue the Next.js `web/` theme overhaul with an emphasis on stronger post-card readability, earthy visual identity, and better light/dark palette control.

## User Preferences

- Prioritize visibility and readability over subtle styling.
- Keep the site in a granola-girl palette: greens, yellow-greens, browns/tans, whites.
- Avoid muddy army-green tones.
- Make room for both yellow-green lovers and blue-green lovers.
- Preserve some image-led cards that do not always need visible body text.
- Current favorite pairing:
  - light mode: `Moss & Linen` (`sage`)
  - dark mode: `Lichen Light` (`lichen`)
- User also wants the mode switch to read visually as sun/moon rather than a text day/night toggle.

## Current Theme System State

Primary file:

- `web/src/components/theme/theme-provider.tsx`

The theme provider now supports:

- separate light and dark looks stored independently
  - `j2adventures_theme_look_light`
  - `j2adventures_theme_look_dark`
- richer theme context values:
  - `lookDescription`
  - `lightLook`, `darkLook`
  - `lightLookLabel`, `darkLookLabel`
  - `availableLooks`

## Available Looks

- `sage` - `Moss & Linen`
- `lichen` - `Lichen Light`

Current preferred pairing:

- day: `Moss & Linen`
- night: `Lichen Light`

## Important Implementation Details

- The theme system has been reduced to just two looks.
- Light and dark looks are still stored independently:
  - `j2adventures_theme_look_light`
  - `j2adventures_theme_look_dark`
- Overlays were tuned for stronger readability under this two-look system.
- The site header now uses a sun/moon toggle instead of the old day/night text slider.

## Files Relevant To Continue

- `web/src/components/theme/theme-provider.tsx`
- `web/src/components/layout/site-header.tsx`
- `web/src/app/globals.css`
- `web/src/components/blog/home-post-card.tsx`

## Work Still Needed

1. Keep tuning `Moss & Linen` day and `Lichen Light` night until they feel fully locked.
2. Continue refining homepage card overlays in `web/src/app/globals.css` and `web/src/components/blog/home-post-card.tsx`.
3. If needed, polish the sun/moon toggle interaction and layout in `web/src/components/layout/site-header.tsx`.
4. Run verification:
   - `bun run build:web`
   - `bun run lint:web`
   - `bun run test:web`

## Resume Prompt

If resuming later, use this:

"Continue theme work in `web/src/components/theme/theme-provider.tsx` with only `Moss & Linen` and `Lichen Light`, keep `Moss & Linen` as day and `Lichen Light` as night, then keep tuning homepage card overlays and verify with build/lint/test."
