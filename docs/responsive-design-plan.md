---
Responsive Design Plan

> **Note:** This plan is mirrored as items R1–R7 in [`docs/IMPROVEMENTS.md`](./IMPROVEMENTS.md). When picking up an item from this list, also update the R-section there to keep the backlog in sync.

Current State Assessment
Good baseline exists: Container patterns (px-4 sm:px-6 lg:px-8), mobile nav drawer, responsive grids, viewport meta. Most public pages work reasonably on mobile.
Key gaps: Admin editor (complex), account settings (0 breakpoints in 741 lines), auth forms (0 breakpoints), globals.css hero adjustments, and several overflow/margin issues.
---
Phase 1: Admin Post Editor (HIGHEST priority — most complex)
File: post-editor-form.tsx
Issue
Sticky action bar top-24 (96px) — too tall on short mobile
Sticky buttons w-full on mobile — make pill-style
External links row flex gap-2 WITHOUT flex-wrap
Main grid single-column below xl (1280px) — correct, but gap gap-6 is generous on mobile
File: post-rich-text-editor.tsx
Issue
Toolbar sticky offset top: 5rem (80px) — assumes fixed header height
Emoji picker absolute left-0 + width={300} — overflows right edge on mobile
Toolbar scrollable on mobile (intentional) — good, no change
Floating bubble menu position: fixed — fine
File: post-media-manager.tsx
Issue
Mostly responsive already
Phase 2: Admin Dashboard & Sub-pages (HIGH)
File: admin-dashboard.tsx
Issue
Filter grid lg:grid-cols-[...] works, but search input is in a gap-3 grid that gets tight on tablet
Bulk action bar fixed bottom-6 left-6 right-6 — good on mobile
Post cards p-4 sm:p-5 lg:p-6 — padding scales well
Admin tags, seasons, wishlist pages:
- All use lg:grid-cols-[Xrem_1fr] — single column below lg. Fine.
- Add sm:px-6 consistent padding to list items where missing
- Wishlist w-72 input — wrap parent already has flex-wrap, safe
Phase 3: Account Settings (MEDIUM)
File: account-settings.tsx
Issue
Zero responsive breakpoints in 741 lines
flex gap-3 rows (name/email/URL input + button) — overflows <360px
text-3xl heading
Section cards p-6
File: account/layout.tsx
Issue
pt-28 (112px) — wastes space on short mobile
No responsive padding
Phase 4: Auth Forms (LOW)
Files: login-form.tsx, signup-form.tsx, callback-content.tsx
Issue
Operationally mobile-safe, but zero breakpoints
Card p-8 — generous on <360px
File: (public-auth)/layout.tsx
Issue
pt-24 — fine, no change needed
Phase 5: Public Blog Pages (LOW — mostly already responsive)
Page
Post detail
Post detail
Category/Tag hero
Series page
About page
Bookmarks
404/Error
Phase 6: globals.css (MEDIUM)
Issue
scroll-padding-top: 5rem — hardcoded for navbar height
Card overlay min-height: 10.5rem at 768px+ only
Hero section already has mobile media queries (lines 472-558)
Landing title uses clamp(1.8rem, 7.5vw, 2.6rem) on mobile
.post-card-title { max-width: 16ch } — on mobile 16ch is ~256px which fits most screens
.card-overlay-title { max-width: 14ch } — fine
.landing-page { min-height: 38rem } on mobile — 38rem = 608px, taller than some very short viewports
Phase 7: Testing & QA
Item
Emulate 320px (iPhone SE)
Emulate 375px (iPhone)
Emulate 768px (iPad)
Emulate 1024px (iPad landscape)
Emulate 1920px (desktop)
Touch target audit
Tiptap editor on mobile
Admin dashboard on mobile
Account settings on mobile
Auth flow on mobile
Reading experience on mobile
Grid layout audit
---
Implementation Order
Phase 1: admin post-editor-form.tsx, post-rich-text-editor.tsx, post-media-manager.tsx
Phase 2: admin-dashboard.tsx, admin tags/seasons/wishlist pages
Phase 3: account-settings.tsx, account/layout.tsx
Phase 4: login-form.tsx, signup-form.tsx, callback-content.tsx, auth layout
Phase 5: blog page minor tweaks (category/tag pt-28, etc.)
Phase 6: globals.css (scroll-padding, landing-page min-height)
Phase 7: Manual QA on all breakpoints
---
### Files to modify (complete list)
1. `web/src/components/admin/post-editor-form.tsx` — sticky bar, external links wrap
2. `web/src/components/admin/post-rich-text-editor.tsx` — emoji picker, toolbar offset
3. `web/src/components/admin/post-media-manager.tsx` — minor padding
4. `web/src/components/admin/admin-dashboard.tsx` — filter grid, bulk bar, post card padding
5. `web/src/app/admin/page.tsx` — no changes needed (already responsive)
6. `web/src/app/admin/tags/page.tsx` — no changes needed
7. `web/src/app/admin/seasons/page.tsx` — no changes needed
8. `web/src/app/admin/wishlist/page.tsx` — no changes needed
9. `web/src/app/admin/posts/[postId]/comments/page.tsx` — no changes needed
10. `web/src/app/account/account-settings.tsx` — responsive breakpoints, flex → grid for rows
11. `web/src/app/account/layout.tsx` — pt-28 responsive, add sm:px-6 lg:px-8
12. `web/src/app/(public-auth)/layout.tsx` — no changes needed
13. `web/src/app/(public-auth)/login/login-form.tsx` — responsive padding/heading
14. `web/src/app/(public-auth)/signup/signup-form.tsx` — responsive padding/heading
15. `web/src/app/(public-auth)/callback/callback-content.tsx` — responsive padding
16. `web/src/app/(blog)/category/[category]/page.tsx` — pt-28 responsive
17. `web/src/app/(blog)/tag/[slug]/page.tsx` — pt-28 responsive
18. `web/src/app/globals.css` — scroll-padding, landing-page min-height
19. `web/src/app/not-found.tsx` — verify min-h-[70vh] is sufficient
20. `web/src/app/error.tsx` — verify responsive
---
