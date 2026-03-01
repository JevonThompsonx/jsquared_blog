#automation/AI/prompting

## UPDATED MASTER PROMPT (J²Adventures)

This file is a refreshed version of `prompt.md` tuned to this repo and the issues we just solved. It keeps the security-first philosophy and adds project-specific accelerators that materially speed up troubleshooting.

---

## PROJECT-SPECIFIC ACCELERATORS (NEW)

### Repo Reality Check
- **Stack**: Bun workspace monorepo
  - `client/` = React 19 + Vite + TypeScript + Tailwind
  - `server/` = Hono API (Cloudflare Worker style)
  - `shared/` = shared types + schemas
- **No Next.js** in this repo. Avoid Next/App Router assumptions.

### Dev Server & Env (Critical)
- Local dev server is **`server/dev-server.ts`** (not `wrangler dev`).
- `.dev.vars` must exist at `server/.dev.vars` and must **not** contain placeholder duplicates.
- If `/api/test/env` shows missing values, **restart dev server** and re-check.
- **Service role key is required** for scheduled auto-publish and admin publish endpoints.

### Auto‑Publish & Scheduled Posts
- Auto-publish triggers on **`/api/posts`** and **`/api/posts/:id`**.
- Manual: **`POST /api/admin/publish-scheduled`** (admin only).
- If posts are “published” but invisible when logged out:
  - Check `/api/posts?limit=100` response contents.
  - Check `/api/posts/:id` status/published_at/scheduled_for.
  - If missing publicly, this is **RLS** or cache — not UI.
- Dev-only debug endpoint (requires `DEV_MODE=true`):
  - `GET /api/test/post-visibility?ids=42,43`

### UI Pitfalls We Hit
- **Never nest `<Link>` inside `<Link>`**; use a non-link wrapper and link the title.
- Category/tag links must be plain `<Link>` and not nested in a clickable card.
- If you need the whole card clickable, use a wrapper `div` with `onClick` + `role="link"` and stop propagation in inner links.
- Search reset: clicking brand should clear search.
- Alt text overlay alignment: use `flex` + `leading-none` for visual centering.

### Scheduling Input (Bug Fix)
- Store datetime-local input **as local string** in UI state.
- Convert to ISO only on submit; avoid double conversion.

### Category Label Consistency
- Use **"General"** consistently when `post.category` is null.
- Avoid mixing "Uncategorized" in PostDetail.

### Ports & Process Collisions
- Hono dev server binds **8787**. If you see `EADDRINUSE`, kill the old process.

---

## PRIORITY RULES (UPDATED FOR THIS REPO)

1) **Security-first**: validate server-side, never trust the client.
2) **No secrets in code**: env vars only, `.dev.vars` is gitignored.
3) **Follow existing lint & TypeScript rules**; do not enforce stricter config unless asked.
4) **Idempotent operations**: safe to run multiple times.
5) **Ask if ambiguous**: auth flows, data access, secrets.
6) **Explain non-obvious decisions**: security tradeoffs, why X vs Y.
7) **Update README** after a batch of changes.

---

## FAST TROUBLESHOOTING PLAYBOOK

### Scheduled Posts Missing Publicly
1) `GET /api/posts?limit=100` → confirm IDs included.
2) `GET /api/posts/:id` → check status + published_at.
3) If missing only when logged out → check RLS policy on `posts`.
4) Confirm service role key is loaded:
   - `/api/test/env` should show `SUPABASE_SERVICE_ROLE_KEY` set.

### Env Not Loading
- If `/api/test/env` shows `DEV_MODE` or role key unset:
  - Ensure `server/.dev.vars` exists and has **no placeholder duplicates**.
  - Restart dev server.

### Nested Link Warning
- Replace card `<Link>` wrappers with `<div>` + linked title.
- Keep category/tag links separate and non-nested.

---

## TESTING SHORTLIST

1) Auth: login/logout, `/admin`, `/profile`, direct URL navigation.
2) Posts: create/edit/delete, draft, scheduled, publish-now button.
3) Images: upload, alt text, hover overlay, gallery behavior.
4) Tags/categories: post detail links, tag/category pages include the clicked post.
5) Comments: add/like/delete/sort.
6) SEO: `/sitemap.xml`, `/feed.xml`.

---

## REINFORCEMENT

- **Never hardcode secrets.**
- **Validate inputs on the server.**
- **RLS can hide rows from anonymous users even when status is published.**
- **Restart dev server after env changes.**
