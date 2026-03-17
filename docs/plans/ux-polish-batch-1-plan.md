# UX Polish Batch 1 — Plan

**Date**: 2026-03-16
**Tasks**: 3.11–3.14 in PLAN.md

---

## 3.11 — Admin dropdown dark mode fix

### Problem
The `<select>` dropdowns on the admin dashboard ([admin-dashboard.tsx:209-237](web/src/components/admin/admin-dashboard.tsx#L209-L237)) are unreadable in dark mode. Native `<option>` elements on Windows/Chrome ignore CSS custom properties for `background-color` — the options render with the OS default white background regardless of the `bg-[var(--background)]` on the `<select>`.

### Fix
Replace the three native `<select>` elements (status, category, sort) with a custom dropdown component that fully respects theme variables. Options:

- **Option A (recommended)**: Use Radix UI `Select` or Headless UI `Listbox` — fully styleable, accessible out of the box
- **Option B (minimal)**: Add explicit `style={{ backgroundColor, color }}` to `<option>` elements — works on some browsers but unreliable on Windows Chrome
- **Option C**: CSS `@supports` hack with `select option { background-color: ... }` — fragile

### Implementation Steps

| # | Step | Owner | Notes |
|---|------|-------|-------|
| 1 | Install Radix UI Select (`@radix-ui/react-select`) or equivalent | Gemini | Check if any headless UI lib is already in deps |
| 2 | Create a reusable `<ThemeSelect>` component | Gemini | Accepts `value`, `onChange`, `options`, `placeholder` props. Renders a dropdown that uses `var(--background)`, `var(--text-primary)`, `var(--border)`, `var(--input-bg)` etc. |
| 3 | Replace the 3 `<select>` elements in `admin-dashboard.tsx` with `<ThemeSelect>` | Gemini | Lines 209-237 |
| 4 | Test in all 4 theme combos (light×sage, light×lichen, dark×sage, dark×lichen) | Gemini | |

### Files Touched
- `web/src/components/ui/theme-select.tsx` (new)
- `web/src/components/admin/admin-dashboard.tsx`

---

## 3.12 — Season-year date display

### Problem
Post dates currently display as "December 15, 2024" (absolute) or "2 weeks ago" (relative). The user wants dates shown as **"Spring 2026"** style instead.

### Season Mapping
| Season | Months |
|--------|--------|
| Winter | December, January, February |
| Spring | March, April, May |
| Summer | June, July, August |
| Fall | September, October, November |

Note: December belongs to the **following year's** winter (Dec 2025 → "Winter 2026"). This matches how people think — December 2025 feels like "Winter 2026" since it spans into Jan/Feb 2026.

### Implementation Steps

| # | Step | Owner | Notes |
|---|------|-------|-------|
| 1 | Add `formatSeasonYear(dateString): string` to `web/src/lib/utils.ts` | Sonnet | Returns e.g. "Spring 2026". December shifts to next year's Winter. |
| 2 | Update `PostDate` component to use `formatSeasonYear` as the "absolute" format | Gemini | Replace `formatPublishedDate` call with `formatSeasonYear`. Keep relative toggle. Keep `datetime` attribute as ISO date for accessibility. |
| 3 | Update `PostDate` click title tooltip | Gemini | e.g. "Click for relative date" / "Click for time ago" |
| 4 | Add unit test for `formatSeasonYear` | Sonnet | Cover all 4 seasons, December edge case, leap year, etc. |

### Files Touched
- `web/src/lib/utils.ts` — add `formatSeasonYear()`
- `web/src/components/blog/post-date.tsx` — use new formatter
- `web/tests/unit/utils.test.ts` — add tests

---

## 3.13 — Post page scroll/focus priority

### Problem
When navigating to a post detail page, the viewport sometimes ends up focused on the map section instead of the top of the post content. The map component ([post-map.tsx](web/src/components/blog/post-map.tsx)) already uses IntersectionObserver lazy loading to prevent focus-grab, but MapLibre's canvas can still steal focus after it mounts (when a user scrolls and it renders).

### Root Cause Analysis
The `<Map>` component from `react-map-gl/maplibre` renders a `<canvas>` element. On mount, MapLibre calls `canvas.focus()` internally for keyboard navigation. Even with the IntersectionObserver delay, once the user scrolls near the map and it mounts, the canvas grabs focus and may scroll the viewport on subsequent navigations via browser back/forward.

### Fix
Two-part fix:

1. **Prevent map canvas auto-focus**: Add `tabIndex={-1}` and `interactive={false}` initially, or wrap the Map mount with a `requestAnimationFrame` that immediately blurs the canvas after render.
2. **Force scroll to content on page load**: Add a client-side wrapper that scrolls to the appropriate anchor on mount:
   - If featured image exists → scroll to top of article card (already natural)
   - If no featured image but has ToC → scroll to ToC
   - If neither → scroll to top of prose content

### Implementation Steps

| # | Step | Owner | Notes |
|---|------|-------|-------|
| 1 | Add `tabIndex={-1}` to the PostMap container div and add `onLoad` handler to blur the canvas | Gemini | In `post-map.tsx`, after map loads, call `mapRef.current?.getCanvas().blur()` |
| 2 | Add `id="article-top"` to the article card element | Gemini | In `posts/[slug]/page.tsx` line 139, add id to the `<article>` tag |
| 3 | Add `id="table-of-contents"` to the ToC component wrapper | Gemini | In `table-of-contents.tsx` |
| 4 | Create a small `<ScrollToContent>` client component | Gemini | On mount: if `#article-top` exists and no hash in URL, `scrollIntoView({ block: 'start' })`. Runs once via `useEffect`. |
| 5 | Add `<ScrollToContent>` to the post page | Gemini | Place it inside the post page layout |
| 6 | Test navigation from home → post, back → forward, direct URL | Gemini | Verify scroll position in all scenarios |

### Files Touched
- `web/src/components/blog/post-map.tsx`
- `web/src/app/(blog)/posts/[slug]/page.tsx`
- `web/src/components/blog/table-of-contents.tsx`
- `web/src/components/blog/scroll-to-content.tsx` (new, small client component)

---

## 3.14 — Season-year grouped feed

### Problem
The home feed displays posts as a flat infinite-scroll grid with no temporal grouping. The user wants posts grouped under season-year headers (e.g., "Spring 2026" as a full-width banner, then the posts from that season underneath).

### Design
```
┌─────────────────────────────────────────────┐
│  🌿 Spring 2026                             │  ← full-width section header
├────────┬────────┬────────┬──────────────────┤
│ Post 1 │ Post 2 │ Post 3 │     Post 4       │  ← grid of posts in this season
├────────┴────────┴────────┴──────────────────┤
│  ☀️ Summer 2025                              │  ← next season header
├────────┬────────┬──────────────────────────┤
│ Post 5 │ Post 6 │        Post 7             │
└────────┴────────┴──────────────────────────┘
```

### Implementation Steps

| # | Step | Owner | Notes |
|---|------|-------|-------|
| 1 | Add `getSeasonKey(dateString): string` to `web/src/lib/utils.ts` | Sonnet | Returns sortable key like `"2026-1"` (year-seasonIndex). Used for grouping. |
| 2 | Add `getSeasonLabel(dateString): string` to `web/src/lib/utils.ts` | Sonnet | Returns display label like `"Spring 2026"`. Can reuse `formatSeasonYear` from 3.12. |
| 3 | Add `groupPostsBySeason(posts: BlogPost[]): { key: string; label: string; posts: BlogPost[] }[]` to `web/src/lib/utils.ts` | Sonnet | Groups posts into season buckets, preserving order. Handles merging when new pages arrive. |
| 4 | Update `HomeFeed` to use `groupPostsBySeason` | Gemini | Replace flat `uniquePosts.map(...)` with grouped rendering. Each group gets a full-width `col-span-full` header row, then posts in the grid. |
| 5 | Style the season headers | Gemini | Full-width, uses CSS vars. Consider a subtle icon or decorative element per season (leaf for spring, sun for summer, etc.). |
| 6 | Handle infinite scroll merging | Gemini | When new posts arrive, they may belong to an existing season group. The grouping function must handle appending to existing groups. |
| 7 | Update `FilteredFeed` (category/tag pages) with same grouping | Gemini | Same pattern as HomeFeed |
| 8 | Add unit tests for `groupPostsBySeason` | Sonnet | Test ordering, December edge case, empty input, single-season input |

### Files Touched
- `web/src/lib/utils.ts` — add `getSeasonKey()`, `groupPostsBySeason()` (+ reuse `formatSeasonYear` from 3.12)
- `web/src/components/blog/home-feed.tsx` — grouped rendering
- `web/src/components/blog/filtered-feed.tsx` — same grouped rendering
- `web/tests/unit/utils.test.ts` — add tests

---

## Dependency Order

```
3.12 (season-year utility) → 3.14 (grouped feed) — 3.14 depends on the utility from 3.12
3.11 (admin dropdown)      → independent
3.13 (scroll/focus)        → independent
```

**Recommended execution order**:
1. **Sonnet**: 3.12 step 1 (utility) + 3.14 steps 1-3 (grouping utilities) + unit tests
2. **Gemini**: 3.11 (admin dropdown fix) — can run in parallel with Sonnet
3. **Gemini**: 3.12 steps 2-3 (PostDate component update) — after Sonnet delivers utility
4. **Gemini**: 3.13 (scroll/focus fix) — independent
5. **Gemini**: 3.14 steps 4-7 (feed grouping UI) — after Sonnet delivers grouping function

---

## Quality Gate
After all changes, run:
```bash
cd web && bun run lint && bunx tsc --noEmit && bun run build
```
All must pass with zero errors/warnings.
