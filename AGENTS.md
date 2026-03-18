# AGENTS.md — Multi-Model Collaboration Guide

This file is read by all AI coding assistants (Claude Code, Windsurf Cascade, etc.) working on this codebase. It defines roles, boundaries, and coordination rules.

## Project Summary

J²Adventures is a travel blog at jsquaredadventures.com. The active codebase is `web/` — a Next.js 16 App Router app deployed on Vercel with Turso (SQLite/Drizzle), Supabase Auth (public), Auth.js+GitHub (admin), Cloudinary (images), and TailwindCSS 4.

**Key docs**: [CLAUDE.md](CLAUDE.md) (full architecture), [docs/PLAN.md](docs/PLAN.md) (roadmap), [docs/handoff.md](docs/handoff.md) (status)

## Model Roles

### Claude Opus 4.6 — Architect & PM (Claude Code)
**Owns**: Planning, architecture decisions, test strategy, AGENTS.md, CLAUDE.md, PLAN.md
**Creates**: ADRs, test plans, CI config, schema designs, migration plans
**Reviews**: All cross-cutting changes before merge

### Claude Sonnet 4.6 — Backend Engineer (Claude Code)
**Owns**: Server-side TypeScript — API routes, server actions, DAL, queries, schemas, migrations
**Key directories**: `web/src/server/`, `web/src/app/api/`, `web/src/lib/`, `web/src/drizzle/`
**Rules**:
- Every DAL file starts with `import "server-only"`
- Zod validation at every trust boundary
- Auth check before DB access in all server actions and API routes
- No `any`, `as`, or `!` — strict TypeScript
- Turso migration files use `--> statement-breakpoint` delimiter (not semicolons)

### Gemini 3 Flash — Frontend Engineer (Windsurf Cascade)
**Owns**: UI components, styling, client-side interactivity, loading states
**Key directories**: `web/src/components/`, `web/src/app/**/page.tsx`, `web/src/app/**/loading.tsx`, `web/src/app/globals.css`
**Rules**:
- Server Components by default; `"use client"` only when hooks/interactivity are needed
- TailwindCSS 4 for styling (utilities are inside `@layer`; see CSS cascade note below)
- Dynamic `Link` hrefs use typed helpers: `getPostHref()`, `getCategoryHref()`, `getTagHref()`, `getSeriesHref()`, `getMapHref()` from `web/src/lib/utils.ts`
- After adding new routes, run `bun run build` to regenerate `.next/types/link.d.ts`
- Use `next/image` for all images
- Accessibility: WCAG AA minimum, semantic HTML, ARIA labels, keyboard nav

### GPT-5.4 — Review, Tests, and Automation (OpenCode / Copilot)
**Owns**: Review passes, targeted backend/frontend fixes, test coverage follow-up, terminal tooling, one-off automations
**Rules**: Keep scripts in `scripts/` directory. Document usage in script header comments.

## File Ownership Boundaries

```
web/src/server/          → Sonnet (backend)
web/src/drizzle/         → Sonnet (schema)
web/src/lib/             → Sonnet (shared utilities, auth, DB, cloudinary)
web/src/app/api/         → Sonnet (API routes)
web/src/app/admin/actions.ts → Sonnet (server actions)
web/src/components/      → Gemini (UI components)
web/src/app/**/page.tsx  → Gemini (page UI) — but server data fetching by Sonnet
web/src/app/**/loading.tsx → Gemini (loading states)
web/src/app/globals.css  → Gemini (styles)
docs/                    → Opus (documentation)
CLAUDE.md                → Opus (architecture rules)
AGENTS.md                → Opus (coordination rules)
docs/PLAN.md             → Opus (roadmap)
scripts/                 → Codex (automation)
.github/                 → Opus (CI/CD)
```

## Handoff Protocol

### Backend → Frontend Handoff
When Sonnet finishes a new API route or server action:
1. Commit with message referencing task ID (e.g., `[2.1] Add bulk publish server action`)
2. Document the API contract in a comment at the top of the route file:
   ```typescript
   // POST /api/admin/bulk-publish
   // Body: { postIds: string[], action: "publish" | "unpublish" }
   // Response: { updated: number }
   // Auth: Admin (Auth.js GitHub)
   ```
3. Run `bun run build` to ensure no type errors
4. Gemini picks up from the committed state and builds the UI

### Frontend → Review Handoff
When Gemini finishes a UI component:
1. Commit with descriptive message
2. Run `bun run build` to verify
3. Opus reviews for architectural consistency

### Schema Change Protocol
1. Opus designs the schema change and writes the ADR
2. Sonnet implements the Drizzle schema change in `web/src/drizzle/schema.ts`
3. Run `bun run db:generate` to create migration
4. Verify migration file uses `--> statement-breakpoint` delimiters
5. Run `bun run db:migrate` to apply
6. Commit schema + migration together

## Code Rules (All Models Must Follow)

### TypeScript
- `strict: true` — no `any`, no `as` assertions, no `!` non-null assertions
- Zod validation at every API trust boundary
- Server Components by default; `"use client"` only when required

### Auth
- Two separate auth systems — never merge them conceptually
- **Supabase Auth** → public users (signup, login, comments, profiles)
- **Auth.js + GitHub** → admin only (post CRUD, media upload)
- Every server action checks auth before touching DB
- API routes needing a Supabase user call `getRequestSupabaseUser(request)`

### Data
- All DB access through server-only DAL files
- Never `SELECT *` — explicit column selection
- IDs are text (UUID v7 or CUID2), generated application-side
- Migrations are append-only — never edit applied migrations

### CSS (TailwindCSS 4 Cascade Note)
In TailwindCSS 4, Tailwind utilities are inside `@layer`. CSS rules in `globals.css` outside `@layer` (like `body { color }`, `.theme-root { color }`) have **higher cascade precedence** than Tailwind utilities on the same element. For inherited values this doesn't matter, but when fighting inherited text color, use a dedicated `globals.css` class (like `.btn-primary`) rather than Tailwind arbitrary-value classes.

### Theme System
Two dimensions: **mode** (`light` | `dark`) and **look** (`sage` | `lichen`).
- React state (live) → localStorage (primary) → cookie (fallback) → DB (backup)
- `UserThemeSync` restores DB preference on login when localStorage is empty
- CSS variables defined in `globals.css` per theme combination

### Images
- All images via `next/image` with Cloudinary URLs
- WebP delivery via Cloudinary transforms (`f_auto,q_auto`)
- Alt text required for editorial images
- Avatar types: preset icons (`j2:*`), uploaded (Cloudinary URL), initials fallback

## Quality Checklist (Before Every Commit)

```bash
cd web
bun run lint          # ESLint — zero warnings
bunx tsc --noEmit     # TypeScript — zero errors
bun run build         # Next.js build — must pass
```

## Review Protocol

Opus reviews all cross-cutting changes. Apply this checklist:

1. **Correctness** — Does the logic match the plan? Edge cases handled?
2. **Type safety** — Zero `any`, zero unjustified `as`, zero `!`. Explicit return types on exports.
3. **Architecture** — Server/client boundary respected. Correct auth system. Data flows through DAL.
4. **Security** — Zod validation on inputs. Auth checks on mutations. No secrets in client bundles.
5. **Theme** — CSS variables only. All 4 theme combos (mode × look) must work.
6. **Performance** — No unnecessary `"use client"`. No N+1 queries. Proper image optimization.

**Report format**: `file_path:line — severity (error|warning|suggestion) — description — fix`

### Cascade-Specific Review Flags

Watch for these known failure patterns in Gemini/Cascade output:
- `any` or loose types (type shortcuts)
- Hardcoded Tailwind color classes instead of CSS variables
- String literal routes instead of typed helpers
- Missing `loading.tsx` / error boundaries
- Excessive `"use client"` without justification
- Raw `<img>` tags instead of `next/image`
- Broken dark mode (works in light only)

## Escalation Protocol

When a problem crosses the frontend/backend boundary:
1. Create `docs/context/<issue>-escalation.md` documenting:
   - The problem and symptoms
   - What was tried and why it didn't work
   - What the other agent needs to do
2. Commit the escalation doc
3. The receiving agent reads the escalation doc before acting

## Documentation Structure

| Directory | Purpose | Owner |
|---|---|---|
| `docs/plans/` | Feature plan documents (`<feature>-plan.md`) | Opus |
| `docs/decisions/` | Architecture Decision Records (`NNNN-<title>.md`) | Opus |
| `docs/context/` | Task checklists and escalation docs | All models |

## Reference Links

| Resource | Location |
|----------|----------|
| Full architecture | [CLAUDE.md](CLAUDE.md) |
| Project roadmap | [docs/PLAN.md](docs/PLAN.md) |
| Deployment guide | [docs/deployment.md](docs/deployment.md) |
| Multi-model workflow | [docs/multi-model-workflow.md](docs/multi-model-workflow.md) |
| Drizzle schema | [web/src/drizzle/schema.ts](web/src/drizzle/schema.ts) |
| URL helpers | [web/src/lib/utils.ts](web/src/lib/utils.ts) |
| Original design spec | [prompt.md](prompt.md) |
