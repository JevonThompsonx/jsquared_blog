# Verification Record — 2026-11-23

**Branch:** `t3/blog-audit-hardening-optimization` (based on production `feat/cloudflare-vinext-preview` @ `aa5f621`)
**Commits:** `52758d3` (audit fixes), `ec78776` (deploy guard), `b1b7436` (crawler 404s), `7f0fa50` (verification), `53e5940` (map/media loader)
**Scope:** audit + hardening pass across security, access, privacy, SEO, performance/Lighthouse, UX/a11y.
**Deploy status:** **deployed** — Worker version `258e1b83-e326-452b-bfbd-aba247bdd96c`; health check `/api/posts` 200.

---

## 1. Code gates (final tree)

| Gate | Command | Result |
|---|---|---|
| TypeScript | `cd web && pnpm run typecheck` | **PASS** (`tsc --noEmit`, no output) |
| Lint | `cd web && pnpm run lint` | **PASS** — 0 errors, 4 warnings (`account-settings.tsx` ×2 `no-location-assign-relative-destination`, `worker-entry.ts` ×1 `no-anonymous-default-export`, 1 test-only warning) |
| Unit tests | `cd web && pnpm run test` | **PASS** — 172 files / **1347 tests** |
| Next build | `cd web && pnpm run build` | **PASS** (exit 0) |
| Vinext/Workers build | `cd web && pnpm run build:vinext` | **PASS** (exit 0, "Build complete") |
| Dependency audit | `pnpm audit --prod` | **0 critical / 0 high**; 3 moderate advisories |
| SW syntax | `node --check web/public/sw.js` | **PASS** |
| Privacy route (local `next start`) | `curl :3101/privacy` | **200**, `<title>Privacy | J²Adventures</title>`, canonical `https://jsquaredadventures.com/privacy` |

**Baseline before changes:** typecheck PASS, lint PASS, tests **9 failed / 1119 passed** (stale `isAdminAuthViaAccess` mock). The 9 baseline failures are fixed; suite is now 1347 green.

**Independent review:** first pass returned CHANGES REQUESTED. Fixed the P0 server→client `loader` boundary with a `CdnImage` wrapper (+ regression test), refreshed the MapLibre v6 worker, slugified category links, bumped `sanitize-html`, filtered comment counts to visible rows, and corrected the RSS author. Re-review verdict: **APPROVE** — no remaining P0/P1; only deferrable P3s (OG double-transform edge case, folder-style Cloudinary IDs, dead moderation branches, preview-only static map, small test-coverage polish).

**Note:** the Next build uses the local test env (`web/.env.test.local`), so DB-backed pages log connection errors during static generation but the build completes. This is expected and does not affect the production deploy, which uses Worker secrets.

---

## 2. Lighthouse baseline (live production, before code deploy)

| Profile | Perf | A11y | Best practices | SEO | LCP |
|---|---|---|---|---|---|
| Mobile | 90 | 100 | 75 | 92 | 3.5 s (86% render delay) |
| Desktop | 62 | 100 | 74 | 92 | 6.2 s (92% render delay) |

Main baseline causes: no-store HTML, render-blocking CSS, 346 KiB unused JS, oversized Cloudinary images, broken CSP style nonce (console errors). The code now fixes the CSP literal, removes Tiptap/ProseMirror from the public graph, adds width-aware Cloudinary images/srcSet, dynamically loads MapLibre on posts, and trims the hero blur.

### Post-deploy Lighthouse (live, 2026-11-23)

| Profile | Perf | A11y | Best practices | SEO | LCP | Total bytes |
|---|---|---|---|---|---|---|
| Mobile run 1 | 76 | 100 | 82 | 92 | 6.2 s | **652 KiB** |
| Mobile run 2 | 80 | 100 | 82 | 92 | 5.0 s | **651 KiB** |
| Desktop | 65 | 100 | 81 | 92 | 5.1 s | **651 KiB** |

HTML transfer fell from **1,455 KiB to ~651 KiB** (responsive/Cloudinary images + Tiptap removal) and CSP/console errors are gone. Mobile LCP is noisy (5.0–6.2 s vs 3.5 s baseline) and is still dominated by render-blocking CSS + hydration, not TTFB (70–90 ms). Do not treat the single baseline 90 as a stable comparison; re-run a few times after the CSS/admin bundle split. Remaining opportunities: render-blocking CSS, ~183 KiB unused JS, admin CSS split.

### Live route/status checks

| URL | Result |
|---|---|
| `/`, `/privacy`, `/series`, `/about`, valid post/tag/category | 200 |
| `/posts/nope`, `/tag/sierra`, `/category/NoSuch`, `/series/nope`, `/wishlist/nope` as **Googlebot/Bingbot** | **404** |
| same missing routes as Chrome | 200 + `noindex` (vinext streamed shell) |
| `/admin` and `/api/admin/*` | 302 → Cloudflare Access |
| `*.workers.dev` (both Workers) | 404 |
| `/sitemap.xml` | 200, 46 URLs, includes `/privacy` |
| `/feed.xml` | 200 `application/rss+xml` |
| `/.well-known/security.txt` | 200 `text/plain`, contact + canonical |
| `/map` browser session | canvas mounted, **0 failed/400 responses**, no map/worker console errors |

---

## 3. Cloudflare changes (live, verified via API/curl)

| Item | Before | After | Evidence |
|---|---|---|---|
| `always_use_https` | off | on | API value; `http://` → `301 https://jsquaredadventures.com/` |
| `min_tls_version` | 1.0 | 1.2 | API value; TLS 1.2 handshake succeeds |
| `early_hints` | off | on | API value |
| Edge HSTS | disabled | enabled, 2y, includeSubDomains, preload | API value; live header |
| Access policy *Blog admins* | 3 emails | + `jnshaver@gmail.com` | API policy GET |
| Worker `ADMIN_ALLOWED_EMAILS` | 3 addresses | + Gmail | Worker secret PUT 200 on both Workers; `.env` updated + backed up |
| `jsquared-blog` workers.dev | enabled | disabled | API `enabled:false`; hostname 404 |
| `jsquared-blog-preview` workers.dev | enabled | disabled | API `enabled:false`; hostname 404 |
| Cache rule sitemap/robots/feed | none | 1 h edge TTL | ruleset PUT 200; `cf-cache-status: HIT` for sitemap/robots; feed still `BYPASS` |

Admin surface probes (apex, GET + POST): `/admin`, `/admin/posts`, `/api/admin/posts`, `/api/admin/uploads/images`, `/api/admin/comments/moderate` all **302 → Cloudflare Access**. `www` variant also 302. `*.workers.dev` hosts return **404**.

Rollback: zone settings via API; cache ruleset backup `/tmp/cache-ruleset-backup.json`; `.env` backup `.env.bak-admin-emails-20261123`. Do not re-enable `workers.dev` while the preview Worker holds production secrets.

---

## 4. NOT VERIFIED / held

1. **Real Access login** as `jnshaver@gmail.com` — policy + Worker allowlist are configured, but no interactive login was performed.
2. **Cloudinary metadata stripping at byte level** — `fl_force_strip` URL shape returns 200; the live image set happens to have zero EXIF entries, so no positive GPS sample was available to diff.
3. **Newsletter double opt-in / unsubscribe webhook** — product/consent flow, still backlog.
4. **Remaining performance work** — edge-cached HTML (`force-dynamic` + `headers()` in root layout), Sentry/Supabase lazy-init, admin CSS split, card-only RSC payload. These need a rendering-model or bundle-graph change; Lighthouse still shows render-blocking CSS and ~183 KiB unused JS.
5. **Editorial SEO** — duplicate taxonomy (`road-trip` vs `road-trips`), test tag `elllo`, thin taxonomy pages; owner content decisions.
6. **Soft 404 for human browsers** — vinext streams a 200 shell; crawlers now get a real 404 via `worker-entry.ts`. A native framework fix or full-body buffering for all users is the only way to make it 404 for humans without losing streaming.
