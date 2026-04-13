# J²Adventures Blog — Project Memory

## Stack
- **Runtime**: Bun (local dev), Cloudflare Workers (prod)
- **Frontend**: React 19 + Vite + TailwindCSS 4, deployed to Cloudflare Pages
- **Backend**: Hono 4.x on Cloudflare Workers, port 8787 locally via wrangler
- **Database/Auth**: Supabase (PostgreSQL + Auth + Storage)
- **Monorepo**: Bun workspace (client, server, shared packages)

## Key File Paths
- `server/src/index.ts` — 2300+ line main API (all routes, WebP conversion, scheduling)
- `server/src/middleware/auth.ts` — JWT auth middleware, role-based access
- `server/src/lib/errors.ts` — Custom error classes (AppError, NotFoundError, etc.)
- `server/src/lib/env.ts` — Zod-based Worker binding validation
- `server/src/lib/validate.ts` — Zod parse helpers for Hono route handlers
- `shared/src/types/index.ts` — Shared TypeScript types (Post, Tag, Comment, etc.)
- `shared/src/schemas/index.ts` — Zod validation schemas (used by both client and server)
- `client/src/main.tsx` — Router config, theme system, protected routes
- `client/src/context/AuthContext.tsx` — Global auth state, Supabase session management
- `client/src/supabase.ts` — Supabase client singleton
- `.github/workflows/ci.yml` — CI pipeline (type-check, lint, test, build)

## Architecture Decisions
- Shared package has `composite: true` in tsconfig — use `tsc --build` not `tsc --noEmit` for type-checking
- Server tsconfig paths includes `"shared"` alias pointing to `../shared/src/index.ts` for type resolution
- Bun hoists workspace dependencies to root `node_modules/` (Windows EISDIR symlink warnings are harmless)
- Supabase types are `SupabaseClient<any, "public", any>` — no generated schema types; this is justified with eslint-disable comments
- CORS configured to allow only `jsquaredadventures.com` + `localhost:5173`
- `export { app }` named export from index.ts allows `client.ts` type inference; default export is `{ fetch, scheduled }` for Workers

## Testing
- Tests use **bun native test runner** (`bun test src`) NOT vitest — vitest has Windows file-URL issues with `e:/` paths
- Test files import from `bun:test` not `vitest`
- Run: `cd shared && bun test src`
- 46 tests in `shared/src/schemas/index.test.ts`

## Validation Pattern
- Server uses Zod schemas from `shared` package: `createPostBodySchema`, `updatePostBodySchema`, `createCommentBodySchema`
- On validation failure: return `{ error: { code: "VALIDATION_ERROR", message: "Invalid input", details: fieldErrors } }` with status 400
- Catch blocks use `catch (error: unknown)` + `getErrorMessage(error)` from `server/src/lib/errors.ts`

## Client ESLint Status
- 0 errors, 9 warnings (fast-refresh structural warnings — intentional, not fixable without restructuring)
- `react-hooks/rules-of-hooks` error in RichTextEditor.tsx was fixed (conditional useCallback moved above early return)

## CI Pipeline
- Runs on PR and push to `main`
- Steps: install → build:shared → tsc --build → lint:client → test:shared → build:client
- Client build needs `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` env vars (CI uses placeholder values)

## Dev Workflow
- `bun run dev` — starts all services concurrently
- Vite proxies `/api`, `/feed.xml`, `/sitemap.xml` → wrangler at port 8787
- Server .dev.vars (NOT quoted): `SUPABASE_URL=...` `SUPABASE_ANON_KEY=...`
- DEV_MODE=true enables test endpoints: `/api/test/env`, `/api/test/cron`, `/api/test/scheduled-posts`
