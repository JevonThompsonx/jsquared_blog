# J² Adventures — Changelog

> **For any agent opening this repo:** This file logs completed work. When you finish a branch, add an entry here. Format follows [Keep a Changelog](https://keepachangelog.com/).

**Format:** Each entry groups changes by branch. Within a branch, items are grouped by type (Added, Changed, Fixed, Removed, Security).

---

## [Unreleased]

### Planned
- See [`docs/ROADMAP.md`](ROADMAP.md) for the 10-branch improvement plan

---

## [0.4.1] — 2026-06-15

### Branch: `feat/seo-and-discovery` (PR #42)

#### Added
- **`robots.txt`** with crawl directives — allows public pages (posts, tags, categories, series, authors, wishlist, map, about), disallows admin/api/account/preview/auth routes, references sitemap.xml, declares canonical host
- **Twitter card meta tags** on post pages — adds `twitter.images` so shared links on Twitter/X show the post's featured image
- **Expanded sitemap** — now includes static pages (`/map`, `/about`, `/wishlist`), all category pages, all tag pages, and all series pages (not just homepage and posts)
- **Sitemap unit tests** — 4 new tests covering base entry, static pages, taxonomy entries, and database failure fallback

#### Changed
- **`SITE_URL` is now env-driven** — reads from `NEXT_PUBLIC_SITE_URL` env var with fallback to production URL, allowing the same code to work across dev/staging/prod
- **Seasonal hero** — populated with kicker ("Travel stories from the road") and subtitle ("Field notes, maps, and photo-led stories from the places we wander.") instead of empty strings
- **Vitest config** — stubs `NEXT_PUBLIC_SITE_URL=https://jsquaredadventures.com` for consistent test runs across environments

---

## [0.4.0] — 2026-06-15

### Changed
- **CI/CD infrastructure** — Added `.github/workflows/ci.yml` with 3 parallel jobs (lint, typecheck, test) on Node 24 with pnpm caching
- **Dependabot configuration** — Lowered open PR limits (npm: 5, github-actions: 3) to reduce noise
- **TypeScript** — Upgraded to 6.0.2 with config fixes (removed deprecated `baseUrl`, dropped `dom.iterable`, bumped target to ES2020)
- **Documentation** — Fixed sanitize-html version drift (2.17.2 → 2.17.5), corrected package manager line in AGENTS.md, deduplicated wishlist section in SETUP.md, documented pnpm-workspace.yaml security overrides

### Security
- **CI hardening** — Added `FORCE_JAVASCRIPT_ACTIONS_TO_NODE24=true` to opt in to Node 24 before GitHub's forced upgrade

### Added
- **Improvement tracking** — Created `docs/IMPROVEMENTS.md` (M/S/P/F/R/D/O sections) and `docs/ROADMAP.md` (10-branch plan) for systematic feature work

---

## [0.3.1] — 2026-06-15

### Changed
- **Dependencies** — Merged 29 minor/patch updates via dependabot group PR #35
- **Node.js** — Bumped to 24.0.0 in `.tool-versions` and `package.json` engines (stays `>=22.13` for backward compat)

### Fixed
- **Test isolation** — Stubbed `CI=""` in `playwright-config.test.ts` for two webServer tests that depend on local behavior

---

## Format Guide for Future Entries

```markdown
## [X.Y.Z] — YYYY-MM-DD

### Branch: `feat/branch-name` (PR #N)

#### Added
- New feature or capability

#### Changed
- Changes to existing functionality

#### Fixed
- Bug fixes

#### Removed
- Removed features or code

#### Security
- Security improvements
```

---

## See Also

- [`docs/ROADMAP.md`](ROADMAP.md) — Active branch plan and status
- [`docs/IMPROVEMENTS.md`](IMPROVEMENTS.md) — High-level feature backlog
