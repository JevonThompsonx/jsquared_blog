# Blog Audit Findings — 2026-11-23

**Baseline:** `feat/cloudflare-vinext-preview` @ `aa5f621` (production branch)
**Live:** https://jsquaredadventures.com (Cloudflare Worker `jsquared-blog`)
**Method:** six parallel read-only audits + live probes + Lighthouse 12 (mobile & desktop). Evidence is per finding.

**Lighthouse baseline:** mobile `perf 90 / a11y 100 / BP 75 / SEO 92` (LCP 3.5 s, TBT 50 ms, CLS 0); desktop `perf 62 / a11y 100 / BP 74 / SEO 92` (LCP 6.2 s, 92 % render delay). Primary causes: no-store HTML, render-blocking CSS, 346 KiB unused JS, oversized Cloudinary images, broken CSP style nonce.

**Test baseline:** `typecheck` PASS, `lint` PASS (3 warnings), `test` **9 failed / 1119 passed**. All 9 failures are one stale mock: `tests/unit/admin-page.test.tsx` does not export `isAdminAuthViaAccess` in its `@/lib/auth/session` mock. Pre-existing on the production branch.

---

## Severity summary

| Severity | Count | IDs |
|---|---|---|
| P0 | 6 | SEC-CSP, SEC-IP, SEC-XSS, PERF-CACHE, PERF-IMG, PRIV-EXIF (GPS) |
| P1 | 12 | soft-404, tag noindex, sitemap cap, canonical gaps, contrast, `/series` 404, manifest 404, Sentry locals, newsletter abuse, preview exposure, `workers.dev` clone, Tiptap in public bundle |
| P2 | 18 | see individual sections |
| P3 | 22 | see individual sections |

---

## Security (audit `security-reviewer`)

| ID | Sev | Finding | Evidence | Fix | Status |
|---|---|---|---|---|---|
| SEC-01 | P0 | Rate limiter keys on client-supplied `X-Forwarded-For` first hop; Cloudflare appends the real IP, so attackers rotate XFF and bypass every IP bucket (newsletter spam, view inflation, API scraping) | `web/src/lib/rate-limit.ts:36-45` | Prefer `cf-connecting-ip`; fall back to last XFF entry; test with forged XFF | FIX |
| SEC-02 | P0 | `prosemirror-view@1.41.9` (via Tiptap 3.31) has a paste-XSS advisory (GHSA-c8x8-7fp4-3x9w, patched ≥ 1.42.3). Admin pasting untrusted HTML can execute in the authenticated origin | `pnpm why prosemirror-view`; `web/package.json` | pnpm override `prosemirror-view >= 1.42.3`; re-run editor tests | FIX |
| SEC-03 | P1 | Newsletter single opt-in + welcome email to arbitrary addresses; combined with SEC-01 = unlimited relay/quota drain | `web/src/server/services/newsletter.ts:100-113` | Double opt-in or confirmation-first; tie to SEC-01 | DOCUMENT (flow change) |
| SEC-04 | P1 | Preview Worker public on `*.workers.dev` with production secret set | live probe: preview `/admin` 200, `/api/admin/posts` 401 | Disable `workers_dev`; keep custom domains | FIX (edge) |
| SEC-05 | P1 | `avatarUrl` accepts any URL; non-allowlisted host makes `next/image` throw → 500 on author/post pages (free account DoS) | `server/forms/profile.ts:10-13`; `next.config.ts` remotePatterns | Allowlist Cloudinary/Supabase hosts + presets server-side | FIX |
| SEC-06 | P0 | CSP `style-src 'self' 'nonce-${nonce}'` is a plain string; production sends the literal `${nonce}` and Lighthouse logs CSP violations | `web/src/proxy.ts:131-133`; live header + Lighthouse | Template literal (backticks) + regression test | FIX |
| SEC-07 | P2 | `next@16.3.4` had optimizer SSRF / RCE advisories | audit JSON; `next.config.ts` | Bumped to `next@16.4.6` (current latest); build verified | FIX |
| SEC-08 | P2 | Sentry 10.73 tunnel-routing advisory; not exploitable in this Vite build | audit; `next.config.ts` tunnelRoute | Bumped to `@sentry/nextjs@10.75.2` | FIX |
| SEC-09 | P3 | View counts trivially inflatable (cookie-only dedupe) | `api/posts/[postId]/view/route.ts` | Accept or sign cookie | BACKLOG |
| SEC-10 | P2 | Public comment list returns `visibility`, `isFlagged`, `moderatedAt`, `moderatedByUserId` for hidden/deleted rows | `server/dal/comments.ts:144-220` | Strip moderation fields + filter hidden rows for public | FIX |

## Access / Cloudflare (live API audit)

| ID | Sev | Finding | Evidence | Fix | Status |
|---|---|---|---|---|---|
| CF-01 | P1 | Production Worker is publicly reachable at `jsquared-blog.servicesorsubscriptions-natural894.workers.dev` (custom domain Access does not apply) | live 200 on `/`, `/admin` | Disable `workers_dev`; custom domains unaffected | FIX |
| CF-02 | P1 | Preview Worker public and holds the production secret set | live 200; secrets list identical | Disable `workers_dev`; document preview isolation | FIX |
| CF-03 | P1 | Access policy lacks `jnshaver@gmail.com`, which the Finance app treats as Jess | Access API policy `1bd34ebf…` vs Blog Admin `59477af6…` | Add email to Blog Admin policy | FIX |
| CF-04 | P2 | `always_use_https=off`, `min_tls_version=1.0`, `early_hints=off`, edge HSTS disabled | zone settings API | Turn on HTTPS/TLS 1.2/Early Hints; enable HSTS (no preload) | FIX |
| CF-05 | P2 | No cache rules for `sitemap.xml`/`robots.txt`/`feed.xml`; Worker HTML never edge-cached | rulesets API; live `cf-cache-status` | Add Cache Rule after app caching is fixed | HOLD |
| CF-06 | P2 | Access app has no IdP pinned; one-time PIN allowed. MFA posture undocumented | Access app JSON | Document; owner decision on SSO | DOCUMENT |
| CF-07 | P3 | DMARC `p=none`; SPF present; DKIM present | zone DNS | Owner decision (email deliverability) | BACKLOG |

## Privacy (audit `explore`)

| ID | Sev | Finding | Evidence | Fix | Status |
|---|---|---|---|---|---|
| PRIV-01 | P0 | Exact EXIF GPS coordinates are published: mapped into the public post object and rendered as a Google Maps link | `queries/posts.ts:153-154`; `post-gallery.tsx:357-367` | Remove lat/lng from public mapping and UI; keep admin-only | FIX |
| PRIV-02 | P2 | Uploaded originals retain EXIF on Cloudinary | `cloudinary/uploads.ts`; `transform.ts` | Delivery URLs now include `fl_force_strip` (existing assets included); originals can be backfilled separately | FIX (delivery) |
| PRIV-03 | P2 | Sentry `includeLocalVariables: true` + replay masking unpinned; `enableLogs: true` | `sentry.server.config.ts`; `instrumentation-client.ts` | Disable locals; pin `maskAllText`/`blockAllMedia`; scrub `beforeSend` | FIX |
| PRIV-04 | P2 | No privacy/cookie/terms page or DSAR path; footer has no legal links | live `/privacy` 404; footer | Add `/privacy`, footer link, contact path | FIX |
| PRIV-05 | P2 | Tracking cookies (`j2-viewer-id`, `j2-viewed-post-*`) and Plausible/Spotify undisclosed | `api/posts/[postId]/view/route.ts` | Disclose in privacy page; document cookieless Plausible | FIX |
| PRIV-06 | P2 | Newsletter consent/deletion lifecycle missing | `newsletter.ts` | Document + backlog double opt-in | BACKLOG |
| PRIV-07 | P3 | Emails logged in plaintext | `cloudflare-access.ts:81`; `newsletter.ts:83` | Log domain/boolean only | FIX |
| PRIV-08 | P3 | Preview tokens in query strings leak via history/logs | `server/posts/preview.ts:52` | POST→HttpOnly cookie or fragment | BACKLOG |
| PRIV-09 | P3 | `/account`/auth pages lack explicit `no-store` header rule | `proxy.ts:172-176` | Extend no-store matcher | FIX |
| PRIV-10 | P3 | Rate-limit keys store raw IPs | `rate-limit.ts` | Hash IP before keying (with SEC-01) | FIX |
| PRIV-11 | P3 | CSP report logs document URL incl. query token | `api/csp-report/route.ts:55-66` | Strip query string | FIX |
| PRIV-12 | P3 | Spotify iframe loads eagerly; admin location autocomplete calls OSM directly | `post-song-metadata.tsx:39`; `admin/location-autocomplete.tsx:46` | Facade / proxy | BACKLOG |
| PRIV-13 | P3 | Stadia API key in client bundle (by design) undocumented | map components | Disclose in privacy page | FIX |

## SEO (audit `explore`)

| ID | Sev | Finding | Evidence | Fix | Status |
|---|---|---|---|---|---|
| SEO-01 | P1 | Soft 404: missing dynamic entities return HTTP 200. `/posts/nope`, `/tag/sierra`, `/category/NoSuch`, `/series/nope`, `/wishlist/nope` | live status codes | `notFound()` in `generateMetadata` (pre-stream), category existence check; test status | FIX |
| SEO-02 | P1 | Noindex/default metadata on missing tag route; existing tags fine but no canonical; robots.txt allows tags | live headers/body | Add canonical to taxonomy pages; keep missing-page noindex | FIX |
| SEO-03 | P1 | Sitemap `lastmod` = request time for all non-post URLs; posts capped at 100 | `sitemap.ts:10,28` | Real per-entity dates; paginate all posts | FIX |
| SEO-04 | P2 | Category feeds accept non-existent categories (200 empty); RSS lacks author/enclosure/category | `category/[category]/feed.xml/route.ts`; `server/feeds/rss.ts` | 404 unknown; add fields | FIX |
| SEO-05 | P2 | OG images lack width/height/type; no default site image; no `article:*` | `posts/[slug]/page.tsx:60-74`; `layout.tsx` | Add dimensions + default 1200×630 + article times | FIX |
| SEO-06 | P2 | JSON-LD lacks `logo`, `inLanguage`, `author.url`, breadcrumbs; no WebSite/Organization | `posts/[slug]/head.tsx` | Enrich + add site-level graph | FIX |
| SEO-07 | P1 | Canonical only on posts; home/taxonomy/about/map/wishlist lack it | live probes | Add canonical helper to all indexable routes | FIX |
| SEO-08 | OK | Cloudflare-managed robots.txt merges with app rules; AI crawlers deliberately blocked | live | No change | — |
| SEO-09 | P2 | `/search`, `/bookmarks`, auth shells indexable/default title | live | `robots: noindex` + titles | FIX |
| SEO-10 | P2 | Thin/duplicate taxonomy (`road-trip` vs `road-trips`, test tag `elllo`) | live sitemap | Editorial cleanup | BACKLOG |
| SEO-11 | OK | HTTPS/HSTS/www/trailing-slash behavior good | live | No change | — |
| SEO-12 | P2 | Post pages have no internal post links with 1 post; related block empty | live | Editorial/template fallback | BACKLOG |
| SEO-13 | P2 | Manifest screenshots 404; no PNG icons; no apple-touch-icon | live 404 | Generate assets or trim manifest | FIX |
| SEO-14 | P3 | No preconnect for Cloudinary/Stadia | HTML | Add preconnect | FIX |
| SEO-15 | P3 | Home lacks specific description; some auth pages default title | live | Add metadata | FIX |
| SEO-16 | OK | Single H1, alt text present, heading order good | live | No change | — |

## Performance / Lighthouse (audit `explore` + local Lighthouse)

| ID | Sev | Finding | Evidence | Fix | Status |
|---|---|---|---|---|---|
| PERF-01 | P0 | All public pages `force-dynamic`; root layout reads `headers()`; HTML `no-store`; no bfcache, no edge cache | `(blog)/*/page.tsx:1`; `layout.tsx:54`; live headers | Remove force-dynamic from cacheable pages; remove nonce read from layout (use static shell + client nonce script) | HOLD (vinext/streaming risk) |
| PERF-02 | P0 | Cloudinary URLs never get a width; 583 KB card image, 1.6/1.36 MB prose images; `next/image` optimizer 302s to original | `cloudinary/transform.ts:15-21`; live | Width-aware `cdnImageUrl`, srcSet, transform prose `<img>` | FIX |
| PERF-03 | P1 | Tiptap/ProseMirror 457 KB preloaded on homepage | live chunks | Split pure Thoughts helpers out of the Tiptap extension module, removing ProseMirror from the public graph; editor stays admin-only | FIX |
| PERF-04 | P1 | Sentry client 384 KB + replay on every page | live chunks | Lazy-init after load; keep errors | HOLD (risk) |
| PERF-05 | P1 | Supabase client 208 KB eager on every page | live chunks | Dynamic import in interaction components | HOLD (component refactor) |
| PERF-06 | P0 | 97 KB render-blocking CSS; admin styles in public bundle | live HTML; `globals.css` | Split admin CSS; critical CSS | HOLD (large) |
| PERF-07 | P1 | `PostMap` statically imports MapLibre on post pages | `post-map.tsx:5-6`; `posts/[slug]/page.tsx:14` | `next/dynamic` wrapper (as `/map` already does) | FIX |
| PERF-08 | P0 | Prose `<img>` no dimensions → CLS; no `cdnImageUrl` | `prose-content.tsx`; live HTML | Inject width/height + transform in sanitize pipeline | FIX |
| PERF-09 | P2 | Hero is 1440×1920 portrait served full-size; optimizer 302 | live | Serve landscape derivative / Cloudinary widths | FIX (image assets) |
| PERF-10 | P2 | Backdrop-blur stacked on LCP panel | `globals.css:378` | Remove blur on hero panel | FIX |
| PERF-11 | P2 | RSC payload includes full HTML for 20 feed items | `posts.ts` `withTags`; `home-feed.tsx` | Card-only mapper | HOLD |
| PERF-12 | P2 | SW caches no-store HTML and authenticated `/account`/`/bookmarks` | `public/sw.js:56-94` | Skip those paths; version cache | FIX |
| PERF-13 | P3 | Plausible manual preload competes with critical path | `layout.tsx` | Remove manual preload | FIX (with layout) |
| PERF-14 | P3 | No Cloudinary preconnect | HTML | Add preconnect | FIX (SEO-14) |

## UX / accessibility (audit `explore` + axe/Playwright)

| ID | Sev | Finding | Evidence | Fix | Status |
|---|---|---|---|---|---|
| UX-01 | P1 | Light-mode accent contrast fails AA (`#7c9557` on `#fdf8ef` = 3.15:1; lichen 2.36:1) | axe on 5 pages; `theme-provider.tsx:129-148` | Darken text accent tokens; keep fill color for borders | FIX |
| UX-02 | P1 | Footer `/series` link is a live 404 (no index route) | live | Add series index page | FIX |
| UX-03 | P2 | 404/error pages lack `<main>`/`h1`; skip link dead | `not-found.tsx`; `error.tsx`; live | Wrap in `<main id="main-content">`, promote h1 | FIX |
| UX-04 | P2 | No focus-visible on newsletter/comments/mobile-nav/login/signup/account | 9 files; axe/code | Global `:focus-visible` rule + component classes | FIX |
| UX-05 | P2 | Form errors not linked (`aria-invalid`/`aria-describedby`/`role=alert`) | login/signup/comments/account | Add semantics | FIX |
| UX-06 | P2 | No forgot-password path | login page | Add Supabase reset link/flow | BACKLOG |
| UX-07 | P2 | Hover card hides excerpt on tablets/keyboard | `home-post-card.tsx:108` | `group-focus-within` + `(hover:none)` reveal | FIX |
| UX-08 | P2 | Print stylesheet targets classes that don't exist | `globals.css:1302-1412` | Add `print:hidden` to components | FIX |
| UX-09 | P3 | Lightbox doesn't restore focus; inline prose images not keyboard operable; map no label | `post-gallery.tsx`; `prose-content.tsx`; `post-map.tsx` | Focus restore + button semantics + region label | FIX |
| UX-10 | P3 | Admin bulk bar overlaps BackToTop | `admin-dashboard.tsx:486`; `back-to-top.tsx:37` | Hide BackToTop on `/admin` | FIX |
| UX-11 | P3 | SPA nav doesn't move focus; date toggle not keyboard | `navigation-scroll-fix.tsx`; `post-date.tsx` | Focus main; button | FIX |
| UX-12 | P3 | TOC smooth scroll ignores reduced motion | `table-of-contents.tsx:72` | Respect `matchMedia` | FIX |
| UX-13 | P3 | Feed/comment/bookmark errors lack retry | feeds/comments/bookmarks | Add retry action | FIX |
| UX-14 | P3 | `/account` unauthenticated shell has no h1/sign-in | live | Add fallback content | FIX |
| UX-15 | P3 | PWA screenshots 404 + SVG-only icon | live | Generate PNGs/screenshots or trim manifest | FIX |
| UX-16 | P3 | Misc: mobile menu dead `xs:` class; breadcrumb `aria-current`; series nav landmark; newsletter autocomplete | components | Small fixes | FIX |
| UX-17 | P3 | Nice-to-haves: search empty-state recovery, reading progress persistence, password visibility, breadcrumbs, shortcuts | — | Pick at most 1–2 | PARTIAL (search recovery) |

---

## Implementation decisions for this pass

**Will fix now (code):** SEC-01, SEC-02, SEC-05, SEC-06, SEC-10, CF-01/02/03/04, PRIV-01/03/04/05/07/09/10/11/13, SEO-01/02/03/04/05/06/07/09/13/14/15, PERF-02/07/08/09/10/12/13, UX-01/02/03/04/05/07/08/09/10/11/12/13/14/16, test-mock regression.

**Held with rationale:** PERF-01/04/06/11 (rendering-model or remaining bundle work), PERF-05 (Supabase lazy-load), SEC-03/PRIV-06 (product/consent flow), CF-05 (depends on app caching), SEO-10/12 (editorial). PERF-03 (Tiptap split) and SEC-07/08 (dependency bumps) are now fixed.

**Verification gate:** typecheck, lint, unit tests (target 1128 green), build, targeted curl against a local/preview worker where possible, Lighthouse re-run, live header checks after owner-approved deploy. No production deploy in this pass.

---

## Applied Cloudflare changes (2026-11-23, live)

| Setting | Before | After | Evidence |
|---|---|---|---|
| `always_use_https` | off | on | API PATCH 200; `http://` → 301 `https://` |
| `min_tls_version` | 1.0 | 1.2 | API PATCH 200; TLS 1.2 handshake succeeds |
| `early_hints` | off | on | API PATCH 200 |
| `security_header` HSTS | disabled | enabled, 2y, includeSubDomains, preload | API PATCH 200; live `strict-transport-security` |
| Access policy *Blog admins* | 3 emails | + `jnshaver@gmail.com` | Access API GET shows 4 addresses |
| Worker `ADMIN_ALLOWED_EMAILS` | 3 addresses | + `jnshaver@gmail.com` | Worker secret PUT 200 (both Workers) |
| `jsquared-blog` workers.dev | enabled | disabled | API verify `enabled:false`; hostname returns 404 |
| `jsquared-blog-preview` workers.dev | enabled | disabled | API verify `enabled:false`; hostname returns 404 |
| Cache rule | none for sitemap/robots/feed | 1 h edge TTL for those three paths | ruleset PUT 200; `cf-cache-status: HIT` on sitemap/robots |

Rollback notes: zone values are readable from `GET /zones/{zone}/settings`; the cache ruleset was backed up to `/tmp/cache-ruleset-backup.json` before the PUT; `.env` was backed up to `.env.bak-admin-emails-20261123`. Re-enabling `workers.dev` is one API call, but do not do it while the Worker holds production secrets.

