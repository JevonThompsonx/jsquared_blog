# Blog Improvement Plan — 2026-11-23

**Baseline:** `feat/cloudflare-vinext-preview` @ `aa5f621` (the branch production actually runs)
**Production:** Cloudflare Worker `jsquared-blog`, apex + `www.jsquaredadventures.com`
**Working branch for this effort:** `t3/blog-audit-hardening-optimization`
**Method:** aggressive read-only audits in parallel → severity-ranked findings → disjoint implementation workstreams → full verification.

> This is the plan/acceptance record. Audit findings are appended in
> [`2026-11-23-blog-audit-findings.md`](./2026-11-23-blog-audit-findings.md).

---

## 1. Objective

Improve the live blog across six dimensions, with evidence:

| # | Dimension | What "better" means |
|---|---|---|
| 1 | Security | No auth bypass, no injection/XSS/CSRF/SSRF/IDOR path, secrets stay server-side, edge + app headers coherent |
| 2 | Access | Cloudflare Access is the only admin path for the correct people; no bypass via `workers.dev` or preview; admin APIs covered |
| 3 | Privacy | Minimal PII in Sentry/analytics, explicit cookie/analytics posture, no EXIF location leaks, third parties documented |
| 4 | SEO | Correct canonicals/titles/descriptions, complete sitemap, valid structured data, crawlable pagination, feed correctness |
| 5 | Performance / Lighthouse | Lower LCP/TBT/CLS, cached HTML where safe, smaller initial JS, correct image/font delivery, cache headers |
| 6 | Ease of use / nice-to-haves | Accessible, mobile-safe, clear admin/public flows, search/navigation polish, PWA/manifest correctness |

**Non-goals (this pass):** new social-media features (repo policy), dark patterns/growth hacks, Auth.js v5 migration, full `'use cache'` rendering-model migration, infrastructure moves.

---

## 2. Known baseline facts (verified before planning)

- Live HTML is served by `vinext` on Cloudflare Workers (`x-vinext-build-id` present); Vercel is out of the request path.
- `/admin` is already behind Cloudflare Access app **Blog Admin**; unauthenticated request redirects to `jsquaredadventures.cloudflareaccess.com`.
- Access app covers `jsquaredadventures.com/admin`, `/api/admin`, and `www` equivalents.
- Policy **Blog admins** allows `jnshaver@protonmail.com`, `jevonx@protonmail.com`, `blog@jsquaredadventures.com`. The Finance app also treats `jnshaver@gmail.com` as Jess; that address is **not** in Blog Admin.
- Zone: `always_use_https=off`, `min_tls_version=1.0`, `early_hints=off`, edge HSTS disabled; `brotli=on`, HTTP/2+3 on.
- Preview Worker `jsquared-blog-preview` is publicly reachable on `*.workers.dev` and holds the **production** secret set (incl. production Turso + Supabase service key).
- Live CSP response currently contains the literal `style-src 'self' 'nonce-${nonce}'` (template not interpolated) — production style nonce is broken; `'unsafe-inline'` style attr is used.
- Homepage and post detail are `export const dynamic = "force-dynamic"`; `unstable_cache` exists only around some query functions.
- Public HTML response is `cache-control: private, no-cache, no-store, max-age=0, must-revalidate`.
- `sitemap.ts` only requests 100 published posts.
- Plausible is proxied first-party through `/_stats/*`; Sentry `sendDefaultPii` was already flipped to `false`.
- No `docs/privacy` page found yet; analytics/cookie posture needs an explicit decision.

---

## 3. Workstreams and acceptance criteria

Each workstream ships only changes that are in scope, tested, and reversible. Shared files are coordinated to avoid two writers at once.

### WS-A — Security hardening (owner: security builder)
**Acceptance**
- Every `/api/admin/*` handler calls `requireAdminSession()` before any data access; no handler trusts a client header for identity.
- Every public write endpoint has Zod validation + rate limiting; no unbounded request bodies.
- CSP contains a real per-request style nonce (no literal `${nonce}`), and script/style directives are test-covered.
- No secret reaches the client bundle or a log; `NEXT_PUBLIC_*` is the only public set.
- Dependency audit (`pnpm audit --prod`) has no high/critical, or each is documented with a compensating control.

### WS-B — Cloudflare access & edge posture (owner: me, API)
**Acceptance**
- Access app covers `/admin`, `/api/admin`, and any admin-adjacent route (e.g. `/settings` only if it exposes admin data) on apex + `www`.
- Policy includes both owner addresses actually used for Jess/Jevon; removing an address is explicit.
- Preview Worker cannot reach production data as an admin: either its secrets point at a preview DB, or Access covers it, or it is deleted.
- `always_use_https=on`, `min_tls_version=1.2`, `early_hints=on`, edge HSTS enabled with a sane max-age, verified by re-reading zone settings.
- No change that can break origin TLS/cert; rollback values recorded before change.

### WS-C — Privacy (owner: privacy builder)
**Acceptance**
- A public privacy page explains analytics, cookies, auth, comments, newsletter, Sentry, and third parties, linked in the footer.
- Analytics is cookieless/consent-free (Plausible) and documented; no ad/retargeting scripts.
- Sentry: `sendDefaultPii=false`, replay masks text/inputs, and no IP/cookie capture in any config.
- Public media does not expose original GPS EXIF; displayed EXIF is explicit/limited.
- Newsletter and comments state what is stored and how to delete it; no email is used for anything else.

### WS-D — SEO (owner: SEO builder)
**Acceptance**
- Every indexable route has a unique title + meta description + canonical; no duplicate canonical between `/posts/x` and aliases.
- Sitemap includes **all** published posts (paginated query, not first 100), correct `lastModified` from `updatedAt`.
- `robots.ts` blocks private routes and references sitemap; Cloudflare-managed robots content does not conflict.
- JSON-LD validates (BlogPosting + BreadcrumbList + WebSite/Organization as applicable); no `undefined` keys; images absolute.
- RSS feed valid XML, absolute URLs, correct content-type; category/tag feeds link correctly.
- 404/410 behavior for missing or unpublished posts is intentional (not soft-404).

### WS-E — Performance / Lighthouse (owner: perf builder)
**Acceptance**
- Public pages that can be cached are cached at the edge/worker (no blanket `private, no-store` on anonymous HTML); admin/auth remain no-store.
- Homepage/post pages either use ISR/`unstable_cache` effectively or are proven dynamic for a reason; TTFB measured before/after.
- `next/image` used with width/height or sized `fill`; LCP image is `priority` + preloaded; no CLS from images.
- MapLibre + Tiptap are dynamically imported and absent from public initial JS; verified in build analyzer or chunk inspection.
- Fonts are subset/preloaded; no render-blocking third-party CSS.
- Lighthouse mobile + desktop run against production (or preview) shows measurable improvement or a documented floor; no regression in a11y/SEO categories.

### WS-F — UX / accessibility / nice-to-haves (owner: UX builder)
**Acceptance**
- Keyboard-only pass on home, post, search, login, admin login; visible focus, skip link, landmark order.
- All interactive targets ≥ 24×24 CSS px; forms have labels and inline errors; reduced-motion respected.
- Mobile 320/375 px: no horizontal scroll, no clipped admin actions, TOC/search usable.
- Empty/error/loading states exist for feed, search, comments, bookmarks, wishlist.
- PWA manifest icons/screenshots resolve (no 404s); theme-color matches.
- At most one clearly-scoped new nice-to-have, only if it does not add maintenance burden (e.g. reading-time/related-post polish, better share fallback).

---

## 4. Execution order

1. **Audit fan-out** (read-only, parallel): security, SEO, privacy, performance/Lighthouse, Cloudflare/access, UX/a11y.
2. **Synthesis**: merge findings, dedupe, rank by severity × effort × confidence; record evidence in `2026-11-23-blog-audit-findings.md`.
3. **Implement** in disjoint file sets:
   - WS-A security code
   - WS-C privacy page + config
   - WS-D SEO routes/metadata
   - WS-E performance config/components
   - WS-F UX components
   - WS-B Cloudflare API (me, sequential; record before/after)
4. **Verification gate**: `pnpm run typecheck`, `pnpm run lint`, `pnpm run test`, `pnpm run build`, `pnpm run build:vinext`, targeted new tests, Lighthouse, live header checks.
5. **Review**: independent `code-reviewer` pass over the diff; fix material findings; re-run affected gates.
6. **Report**: changed files, before/after evidence, unresolved/ NOT VERIFIED items. No deploy without explicit owner approval.

---

## 5. Risk controls

- Never print secret values; Cloudflare API calls read the token from `/home/hermes/.secrets/cloudflare.json` and never echo it.
- Zone changes are limited to safe, reversible toggles; no SSL mode change without verifying origin cert first.
- No production deploy in this pass; Worker changes stay in the branch until owner approves.
- Any change to auth/access gets a negative test (unauthenticated + non-allowlisted identity).
- Max 2 repair cycles per workstream, then report partial with evidence.
