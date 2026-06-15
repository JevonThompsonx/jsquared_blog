# Knowledge Base

**Project-specific reference for future agents.** Every non-obvious gotcha, workaround, and pattern discovered during development of J² Adventures lives here. This is a living document — append entries when you discover something, update them in place when you prove them wrong, and never delete them (historical context matters).

> **For all agents (regardless of harness):** Before any non-trivial change — schema work, auth changes, test setup, deployment, third-party integrations — read the relevant category below. If you hit something not covered, **add an entry** using the format at the bottom. If an existing entry fails for you, **update it in place** and change the `Last verified` date.

---

## Contributing

### When to add an entry

- You spent more than 5 minutes debugging something non-obvious
- You discovered a quirk of a library, platform, or tool that isn't in its official docs
- You found a workaround for a broken or limited API
- You found an assumption in an existing entry that turned out to be wrong

### Entry format (every field required)

```markdown
### [Category] Short, descriptive title

**Discovered in:** Branch N: branch-name (PR #X) or "initial codebase work"
**Last verified:** YYYY-MM-DD

**Problem:** What you were trying to do.
**Gotcha:** What went wrong, and why (the actual root cause).
**Solution:** Exact code, command, or steps that work.
**Verified:** How you confirmed it works (test output, manual trace, etc.).
```

### Challenging an entry

Every entry has a `Last verified` date. If you try the documented approach and it fails, or if the underlying library/platform has changed:

1. Update the entry in place — don't delete it
2. Change the `Last verified` date to today
3. Add a note at the end of the entry: `**Update YYYY-MM-DD:** What changed and what the new approach is.`
4. If the entry is fundamentally wrong, rewrite the `Solution` and `Verified` fields

The historical record of what worked at a point in time is more valuable than a clean file.

---

## Index by Category

- [SQLite / Drizzle ORM](#sqlite--drizzle-orm) — 8 entries
- [Turso / Database Connectivity](#turso--database-connectivity) — 2 entries
- [React 19 Testing](#react-19-testing) — 4 entries
- [Next.js 16 App Router](#nextjs-16-app-router) — 2 entries
- [Vitest Configuration](#vitest-configuration) — 2 entries
- [Tooling](#tooling) — 3 entries
- [Security / CSP](#security--csp) — 5 entries
- [Code Quality](#code-quality) — 1 entry

---

## SQLite / Drizzle ORM

### [SQLite] ALTER TABLE ADD COLUMN cannot use non-constant defaults

**Discovered in:** Branch 3: `chore/schema-hardening` (PR #44)
**Last verified:** 2026-06-15

**Problem:** Adding a `NOT NULL` column with a default like `CURRENT_TIMESTAMP` or `strftime('%s','now') * 1000` to an existing table.

**Gotcha:** SQLite rejects `ALTER TABLE x ADD COLUMN c INTEGER NOT NULL DEFAULT (strftime(...))` with "Cannot add a column with non-constant default". The default must be a literal constant. There's no way to make SQLite evaluate a function for existing rows at ALTER time.

**Solution:** Use the **table rebuild pattern** (see next entry for full template). Create `__new_<table>` with the column declared NOT NULL, copy data with the desired value as a literal in the `INSERT INTO __new_ SELECT ... FROM old`, drop the old table, rename.

**Verified:** Migration 0022 rebuilds `series`, `categories`, `tags` with `created_at`/`updated_at` columns using `strftime('%s','now') * 1000` in the SELECT statement. Applied to production with 0 row-count changes.

---

### [SQLite] Column-level REFERENCES on ADD COLUMN is parsed but not enforced

**Discovered in:** Branch 3: `chore/schema-hardening` (PR #44)
**Last verified:** 2026-06-15

**Problem:** Adding a column with a foreign key reference: `ALTER TABLE wishlist_places ADD COLUMN linked_post_id TEXT REFERENCES posts(id)`.

**Gotcha:** SQLite parses the `REFERENCES` clause but does NOT create the foreign key constraint when used in `ADD COLUMN`. The constraint is silently dropped. Inserting an invalid value succeeds with no error. Discovered by attempting `INSERT INTO wishlist_places (..., linked_post_id) VALUES (..., 'non-existent-post-id')` — the insert succeeded, proving no FK was enforced.

**Solution:** Use the **table rebuild pattern**. The new `__new_<table>` definition must include the `REFERENCES` clause inline, which is then properly enforced. See `drizzle/0021_wishlist_linked_post_fk.sql` for the working pattern.

**Verified:** After running migration 0021, attempting the same invalid insert failed with `SQLITE_CONSTRAINT: FOREIGN KEY constraint failed`. Also confirmed via `PRAGMA foreign_key_list(wishlist_places)` — `linked_post_id -> posts(id)` now appears in the FK list (it did not before).

---

### [SQLite] DROP TABLE fails when FK-referenced by other tables

**Discovered in:** Branch 3: `chore/schema-hardening` (PR #44)
**Last verified:** 2026-06-15

**Problem:** Rebuilding a table (e.g. `categories`) that is referenced by FK from other tables (e.g. `posts.category_id`). The rebuild pattern requires `DROP TABLE categories` which fails with `SQLITE_CONSTRAINT: FOREIGN KEY constraint failed`.

**Gotcha:** SQLite enforces FK constraints even during DDL if `PRAGMA foreign_keys=ON` (which is the default). You can't drop a table that other tables reference.

**Solution:** Wrap the rebuild in `PRAGMA foreign_keys=OFF` ... rebuild ... `PRAGMA foreign_keys=ON`. SQLite does not check FKs during the DDL inside this block.

```sql
PRAGMA foreign_keys=OFF;
CREATE TABLE __new_categories (...);
INSERT INTO __new_categories SELECT ... FROM categories;
DROP TABLE categories;
ALTER TABLE __new_categories RENAME TO categories;
PRAGMA foreign_keys=ON;
```

**Verified:** Migration 0022 uses this pattern for `categories` (referenced by `posts.category_id`) and `tags` (referenced by `post_tags.tag_id`). Both rebuilds succeeded with the PRAGMA block.

---

### [SQLite] Full rebuild pattern for adding NOT NULL columns to existing tables

**Discovered in:** Branch 3: `chore/schema-hardening` (PR #44)
**Last verified:** 2026-06-15

**Problem:** You need to add `NOT NULL` columns to an existing SQLite table (e.g. `created_at`, `updated_at` on taxonomy tables) and SQLite's ALTER TABLE won't accept non-constant defaults.

**Gotcha:** The only reliable way to enforce `NOT NULL` on new columns in an existing table is to rebuild. There is no `ALTER COLUMN ... SET NOT NULL` in SQLite (unlike Postgres).

**Solution:** Standard 6-step rebuild pattern:

```sql
PRAGMA foreign_keys=OFF;
--> statement-breakpoint
CREATE TABLE `__new_<table>` (
  ...all existing columns...,
  `new_col` integer NOT NULL
);
--> statement-breakpoint
INSERT INTO `__new_<table>` (col1, col2, ..., new_col)
SELECT col1, col2, ..., <value> FROM `<table>`;
--> statement-breakpoint
DROP TABLE `<table>`;
--> statement-breakpoint
ALTER TABLE `__new_<table>` RENAME TO `<table>`;
--> statement-breakpoint
-- Recreate any unique indexes that the rebuild dropped
CREATE UNIQUE INDEX `<table>_slug_unique` ON `<table>` (`slug`);
--> statement-breakpoint
PRAGMA foreign_keys=ON;
```

For populating the new column, use either a constant or `strftime('%s','now') * 1000` in the `SELECT`.

**Verified:** Migration 0022 uses this pattern for 3 tables (`series`, `categories`, `tags`). All rebuilds succeeded; row counts preserved (5/18/13); no FK violations.

---

### [SQLite] Verifying FK constraints after rebuild

**Discovered in:** Branch 3: `chore/schema-hardening` (PR #44)
**Last verified:** 2026-06-15

**Problem:** After adding a FK via rebuild, you need to confirm the constraint is actually enforced (not just present in the schema).

**Gotcha:** `PRAGMA foreign_key_list(table)` shows declared FKs but doesn't confirm enforcement. `PRAGMA index_list(table)` shows indexes but doesn't confirm the FK behavior.

**Solution:** Write a deliberate test insert with a known-invalid FK value:

```typescript
// In a test script that uses @libsql/client
try {
  await client.execute({
    sql: "INSERT INTO wishlist_places (..., linked_post_id) VALUES (..., 'definitely-not-a-real-id')"
  });
  console.log("FAIL: insert succeeded, FK not enforced");
} catch (e) {
  console.log("OK:", e.message); // Should contain "FOREIGN KEY constraint failed"
}
```

Clean up the test row with `DELETE FROM ... WHERE id = 'test-row'`.

**Verified:** Pre-migration, the invalid insert succeeded (FK not enforced). Post-migration, the same insert failed with `SQLITE_CONSTRAINT: SQLite error: FOREIGN KEY constraint failed`.

---

### [Drizzle] drizzle-kit CLI broken in this environment

**Discovered in:** Branch 3: `chore/schema-hardening` (PR #44)
**Last verified:** 2026-06-15

**Problem:** Running `pnpm exec drizzle-kit generate` or `pnpm exec drizzle-kit push` fails with `[ERR_PNPM_RECURSIVE_EXEC_FIRST_FAIL] Command "drizzle-kit" not found`, even though `drizzle-kit` is in `devDependencies`.

**Gotcha:** `pnpm exec` resolves from the `node_modules/.bin` of the current package. The `drizzle-kit` binary may be hoisted to a different location in pnpm's symlinked structure, or the package may not have a CLI binary exposed in the way pnpm expects. This was not investigated further because a workaround exists.

**Solution:** Write migration SQL by hand following the patterns in existing migrations, register them in `drizzle/meta/_journal.json`, and apply via `drizzle-orm/libsql/migrator` (via the `scripts/migrate.ts` script). See `drizzle/0021_wishlist_linked_post_fk.sql` and `0022_schema_hardening_timestamps.sql` for examples.

**Verified:** Hand-written migrations applied successfully via `scripts/migrate.ts` (which uses `drizzle-orm/libsql/migrator`, not `drizzle-kit`). The migrator validates each migration by hash and only runs unapplied ones.

---

### [Drizzle] Registering hand-written migrations in __drizzle_migrations

**Discovered in:** Branch 3: `chore/schema-hardening` (PR #44)
**Last verified:** 2026-06-15

**Problem:** You write a hand-written migration because `drizzle-kit` doesn't work, but the migrator's hash-based tracking means it won't recognize your file unless you register it in `drizzle/meta/_journal.json` AND the hash matches.

**Gotcha:** The Drizzle migrator computes a SHA-256 hash of the migration SQL file content and stores it in `__drizzle_migrations`. If the file exists in `drizzle/` but isn't in the journal, it's ignored. If it's in the journal with a different hash, it re-runs (and likely fails because the DDL was already applied).

**Solution:** Two parts:

1. Add the migration to `drizzle/meta/_journal.json`:
```json
{
  "idx": 22,
  "version": "7",
  "when": 1781554800000,
  "tag": "0022_schema_hardening_timestamps",
  "breakpoints": true
}
```

2. To pre-mark a migration as already applied (when the DDL was run out-of-band), compute the hash and insert it into `__drizzle_migrations`:
```typescript
import { createHash } from "crypto";
import { readFileSync } from "fs";

const sql = readFileSync("./drizzle/0022_xxx.sql", "utf8");
const hash = createHash("sha256").update(sql).digest("hex");

await client.execute({
  sql: "INSERT INTO __drizzle_migrations (hash, created_at) VALUES (?, ?)",
  args: [hash, Date.now()]
});
```

**Verified:** Migration 0021 was run out-of-band during Branch 3 development. After computing its hash and inserting it into `__drizzle_migrations`, the official `scripts/migrate.ts` migrator correctly skipped it on subsequent runs.

---

### [Drizzle] Schema-to-DB drift detection

**Discovered in:** Branch 3: `chore/schema-hardening` (PR #44)
**Last verified:** 2026-06-15

**Problem:** The Drizzle schema (`web/src/drizzle/schema.ts`) and the actual database schema can drift apart. Branch 3 discovered that `wishlist_places.parent_id` had a FK in the DB but not in the schema file.

**Gotcha:** Hand-written migrations, manual SQL fixes, and one-off `db.execute` calls can put the DB in a state the schema doesn't reflect. Drizzle's `drizzle-kit pull`/`introspect` would catch this but it's not available here.

**Solution:** Manual drift detection. For any new migration, after running it, compare `PRAGMA table_info(<table>)` and `PRAGMA foreign_key_list(<table>)` output with the schema file. Use a quick Node script:

```typescript
import { createClient } from '@libsql/client';
import { readFileSync } from 'fs';

const env = Object.fromEntries(
  readFileSync('.env.local', 'utf8').split('\n')
    .filter(l => l.includes('=') && !l.startsWith('#'))
    .map(l => [l.split('=')[0].trim(), l.split('=').slice(1).join('=').replace(/^"|"$/g, '')])
);

const c = createClient({ url: env.TURSO_DATABASE_URL, authToken: env.TURSO_AUTH_TOKEN });
const cols = await c.execute(`PRAGMA table_info(wishlist_places)`);
console.log("DB columns:", cols.rows.map(r => r.name).join(", "));
const fks = await c.execute(`PRAGMA foreign_key_list(wishlist_places)`);
console.log("DB FKs:", fks.rows.map(r => `${r.from}->${r.table}`).join(", "));
```

Then compare against the schema file.

**Verified:** Branch 3 found `parent_id` FK present in DB but missing from schema. Added `.references()` to schema declaration so future Drizzle regenerations would include it.

---

## Turso / Database Connectivity

### [Turso] CLI auth blocked by CloudFront 403

**Discovered in:** Branch 3: `chore/schema-hardening` (PR #44)
**Last verified:** 2026-06-15

**Problem:** Running `turso auth login` redirects to `https://api.turso.tech/?port=36999&redirect=true&state=...&type=cli` which returns a CloudFront 403 ERROR: "The request could not be satisfied. Request blocked."

**Gotcha:** The Turso CLI requires a browser-based OAuth flow. Even with `--token <token>` flag, the CLI still tries to open a browser callback. In headless/SSH/agent environments this fails. CloudFront appears to block the request from non-browser User-Agents.

**Solution:** Skip the Turso CLI entirely. Use `@libsql/client` directly via a Node script. See the next entry.

**Verified:** Branch 3 confirmed `turso db shell`, `turso auth login`, and all `turso` commands fail in this environment. Switching to `@libsql/client` bypassed the issue completely.

---

### [Turso] Use @libsql/client directly via Node script

**Discovered in:** Branch 3: `chore/schema-hardening` (PR #44)
**Last verified:** 2026-06-15

**Problem:** Need to query/migrate the Turso database but the `turso` CLI doesn't work in this environment.

**Gotcha:** The `@libsql/client` package is already a dependency (used at runtime by the app). You can use it from a one-off `.mjs` script — no special config needed. But the script must read `.env.local` manually because `process.env` from `pnpm exec node` may not pick it up depending on how pnpm invokes the script.

**Solution:** Create a temporary script in the `web/` directory (so it can resolve `@libsql/client` from `node_modules`):

```javascript
// test-turso.mjs (delete after use)
import { createClient } from '@libsql/client';
import { readFileSync } from 'fs';

const env = Object.fromEntries(
  readFileSync('.env.local', 'utf8').split('\n')
    .filter(l => l.includes('=') && !l.startsWith('#'))
    .map(l => {
      const [k, ...v] = l.split('=');
      return [k.trim(), v.join('=').replace(/^"|"$/g, '')];
    })
);

const c = createClient({
  url: env.TURSO_DATABASE_URL,
  authToken: env.TURSO_AUTH_TOKEN,
});

const rs = await c.execute("SELECT name FROM sqlite_master WHERE type='table'");
console.log(rs.rows.map(r => r.name).join(", "));
```

Run with `node test-turso.mjs` from the `web/` directory. **Always delete the script before committing** (add to `.gitignore` if you create many).

**Verified:** Branch 3 used this pattern extensively to:
- Inspect DB state before/after migrations
- Apply hand-written migrations
- Verify FK constraint enforcement
- Register hashes in `__drizzle_migrations`

---

## React 19 Testing

### [React 19] act must be imported from 'react', not 'react-dom/client'

**Discovered in:** Branch 2: `feat/layout-footer-and-nav` (PR #43)
**Last verified:** 2026-06-15

**Problem:** Component tests using `act()` throw "act is not a function" or similar import errors after upgrading to React 19.

**Gotcha:** In React 18, `act` was exported from both `react-dom/test-utils` and `react-dom/client`. In React 19, the canonical export is from `react` itself. Importing from `react-dom/client` may not work depending on the build.

**Solution:** Always import `act` from `react`:

```typescript
// CORRECT
import { act } from "react";

// WRONG — may not work in React 19
import { act } from "react-dom/client";
import { act } from "react-dom/test-utils";
```

**Verified:** Branch 2 footer and back-to-top tests fail with the wrong import; pass with the correct one. All 881 tests pass with the `react` import.

---

### [React 19] vi.stubGlobal required in beforeEach for act to work

**Discovered in:** Branch 2: `feat/layout-footer-and-nav` (PR #43)
**Last verified:** 2026-06-15

**Problem:** `act()` calls in tests throw "The current testing environment is not configured to support act(...)" or warnings about `IS_REACT_ACT_ENVIRONMENT`.

**Gotcha:** React 19 requires `IS_REACT_ACT_ENVIRONMENT` to be set to `true` for `act()` to work properly in test environments. Vitest doesn't set this automatically.

**Solution:** Add to `beforeEach` and `unstubAllGlobals` to `afterEach`:

```typescript
beforeEach(() => {
  vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
});

afterEach(() => {
  act(() => {
    root.unmount();
  });
  container.remove();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});
```

**Verified:** All Branch 2/3 component tests that render with `createRoot` include this pattern. Without it, state updates inside event handlers silently fail to flush, causing test assertion mismatches.

---

### [React 19] Event dispatches triggering state changes must use act()

**Discovered in:** Branch 2: `feat/layout-footer-and-nav` (PR #43)
**Last verified:** 2026-06-15

**Problem:** A test dispatches a DOM event (e.g. `window.dispatchEvent(new Event("scroll"))`) that triggers a React state update, and the assertion fails because the state didn't update by the time the assertion runs.

**Gotcha:** React 19 batches state updates outside of `act()` in some configurations. The event handler runs synchronously but the re-render is deferred. The test reads the stale state.

**Solution:** Wrap the event dispatch in `act()`:

```typescript
import { act } from "react";

act(() => {
  window.dispatchEvent(new Event("scroll"));
});
// Now the state update has flushed and the component has re-rendered
expect(button.className).toContain("opacity-100");
```

Same applies to any other event that triggers state: clicks, keyboard events, etc.

**Verified:** Branch 2 back-to-top tests had scroll events that didn't update state. Wrapping the dispatch in `act()` fixed 2 of the 6 tests.

---

### [React 19] matchMedia not implemented in jsdom

**Discovered in:** Branch 2: `feat/layout-footer-and-nav` (PR #43)
**Last verified:** 2026-06-15

**Problem:** A component uses `window.matchMedia('(prefers-reduced-motion: reduce)')` and the test fails with "matchMedia is not a function".

**Gotcha:** jsdom (the default Vitest environment) does not implement `window.matchMedia`. Any component using media queries for accessibility or theming will fail in tests.

**Solution:** Mock `matchMedia` in `beforeEach`:

```typescript
beforeEach(() => {
  vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
  Object.defineProperty(window, "matchMedia", {
    writable: true,
    value: vi.fn().mockImplementation((query: string) => ({
      matches: false, // default: no reduced motion
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })),
  });
});
```

**Verified:** Branch 2 back-to-top test required this mock. All 6 tests passed after adding it.

---

## Next.js 16 App Router

### [Next.js] global-error.tsx runs outside the app shell

**Discovered in:** Branch 2: `feat/layout-footer-and-nav` (PR #43)
**Last verified:** 2026-06-15

**Problem:** Using `<Link>` from `next/link` or React context in `web/src/app/global-error.tsx` throws errors like "useContext is not a function" or "useTheme must be used within a ThemeProvider".

**Gotcha:** `global-error.tsx` is rendered when the root layout itself crashes. It runs **outside** the app shell, meaning no providers, no theme context, no `<Link>` component. It must be a fully self-contained page.

**Solution:** Use raw `<a>` tags instead of `<Link>`, hardcode all colors (or use a `<style>` block with `@media (prefers-color-scheme: dark)` for theming without JS), and never assume any app-level context is available.

```tsx
// global-error.tsx
"use client";

export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <html lang="en">
      <body>
        <style>{`
          @media (prefers-color-scheme: dark) {
            body { background: #111812; color: #f4efe5; }
          }
        `}</style>
        <main>
          <h1>Something went wrong</h1>
          {/* Use raw <a> not <Link> */}
          <a href="/">Go home</a>
          <button onClick={reset}>Try again</button>
        </main>
      </body>
    </html>
  );
}
```

**Verified:** Branch 2 made the global error page respect dark mode and removed the `<Link>` import. Renders correctly in both light and dark themes.

---

### [Next.js] Dynamic routes need force-dynamic to use searchParams

**Discovered in:** Branch 1: `feat/seo-and-discovery` (PR #42)
**Last verified:** 2026-06-15

**Problem:** A page uses `searchParams` (e.g. `?search=foo`) but the value is `undefined` at build time, or the page is statically generated without the search.

**Gotcha:** App Router pages are statically generated by default. `searchParams` is a runtime-only concept. Without `export const dynamic = "force-dynamic"`, the page is built once and searchParams never updates.

**Solution:** Add at the top of the page file:

```typescript
export const dynamic = "force-dynamic";
```

Or use `dynamic = "force-static"` + `generateStaticParams` if you want to opt into specific param values.

**Verified:** Branch 1 added `export const dynamic = "force-dynamic"` to pages that depend on searchParams. Tests like `home-page.test.tsx` verify the value is set.

---

## Vitest Configuration

### [Vitest] NEXT_PUBLIC_SITE_URL env stub must match the hardcoded fallback

**Discovered in:** Branch 1: `feat/seo-and-discovery` (PR #42)
**Last verified:** 2026-06-15

**Problem:** Adding a test for sitemap or SEO that uses `NEXT_PUBLIC_SITE_URL` causes existing tests to fail with mismatched URL assertions.

**Gotcha:** `web/src/lib/utils.ts` defines `SITE_URL` as `process.env.NEXT_PUBLIC_SITE_URL ?? "https://jsquaredadventures.com"`. If the test env stub uses a different value, every test that compares against the production URL will fail.

**Solution:** Set the test env stub to match the hardcoded fallback in `utils.ts`. In `web/vitest.config.ts`:

```typescript
test: {
  env: {
    NEXT_PUBLIC_SITE_URL: "https://jsquaredadventures.com",
    // ... other env stubs
  },
}
```

If you change the hardcoded fallback in `utils.ts`, update the test stub to match.

**Verified:** Branch 1 broke 10 CI tests by adding the env var without matching the fallback. Fixing the stub to match the fallback resolved all 10 failures.

---

### [Vitest] Mocking next/link and other Next.js components

**Discovered in:** Branch 2: `feat/layout-footer-and-nav` (PR #43)
**Last verified:** 2026-06-15

**Problem:** Component tests fail with "Cannot read properties of undefined" or hydration errors when the component uses `<Link>`, `<Image>`, or other Next.js client components.

**Gotcha:** jsdom doesn't fully implement the Next.js client-side router. `<Link>` requires the router context, `<Image>` needs the next/image loader, etc.

**Solution:** Mock these components at the top of the test file:

```typescript
vi.mock("next/link", () => ({
  default: ({ children, href, ...props }) => (
    <a href={typeof href === "string" ? href : "#"} {...props}>
      {children}
    </a>
  ),
}));

vi.mock("next/image", () => ({
  default: ({ src, alt, ...props }) => <img src={src} alt={alt} {...props} />,
}));
```

For complex Next.js client components with hooks, see `web/src/app/(blog)/page.tsx` and the corresponding test mocks.

**Verified:** All Branch 1/2/3 component tests that render components containing `<Link>` or `<Image>` include these mocks.

---

## Tooling

### [Tooling] pnpm is the primary package manager; bun is dev-only for one-off commands

**Discovered in:** Initial codebase work (bun→pnpm migration)
**Last verified:** 2026-05-25

**Problem:** Mixing package managers leads to lockfile conflicts and inconsistent installs across team members.

**Gotcha:** Project used bun as the primary package manager. Root `tsconfig.json` had `"types": ["bun-types"]`. Playwright config used `bunx`. Scripts referenced `bun run`.

**Solution:** Use `pnpm` as the primary package manager:
- `packageManager` field in root `package.json` is set to `pnpm@11.1.1`
- `bun` may still be used for `bunx <one-off-cmd>` but never as the project package manager
- `bun.lock`, `yarn.lock`, `.yarnrc.yml` are all in `.gitignore`
- All scripts use `pnpm run`, never `bun run`

**Verified:** All CI runs use pnpm with the lockfile. Dev installs are reproducible.

---

### [Tooling] Stale tsconfig references mislead new developers

**Discovered in:** Initial codebase work (bun→pnpm migration)
**Last verified:** 2026-05-25

**Problem:** Root `tsconfig.json` had `"references": ["./shared", "./server", "./client"]` pointing to non-existent directories.

**Gotcha:** Stale references in config files can cause confusing IDE behavior (phantom modules, broken IntelliSense) and waste debugging time. They're "harmless" but not invisible.

**Solution:** Keep root configs minimal. Only keep what's actively used. Audit during every major refactor:

```bash
# Quick audit
grep -rn "references" --include="*.json" .
```

**Verified:** Removed the stale references during the bun→pnpm migration. No IDE issues since.

---

### [Tooling] Audit .gitignore and committed artifacts regularly

**Discovered in:** Initial codebase work (bun→pnpm migration)
**Last verified:** 2026-05-25

**Problem:** Stale files accumulate in the repo: `web/lint-output.txt`, alternative package manager lockfiles, agent config dirs.

**Gotcha:** A file committed once is rarely reviewed again. Build artifacts and generated files should never be committed.

**Solution:** Periodically audit:

```bash
git ls-files | head -50  # look for anything that looks generated
cat .gitignore            # look for missing patterns
```

Current `.gitignore` covers: `bun.lock`, `yarn.lock`, `.yarnrc.yml`, `.opencode/`, `.env*.local`, `.sentryclirc`.

**Verified:** The `web/lint-output.txt` artifact was found and removed during the bun→pnpm migration. No new artifacts have been committed since.

---

## Security / CSP

### [Security] Pin security-critical deps to exact versions

**Discovered in:** Initial codebase work
**Last verified:** 2026-05-25

**Problem:** `sanitize-html` was at `^2.17.2`, which allows minor/patch bumps. Version 2.17.3 introduced an XSS vulnerability.

**Gotcha:** Range-based deps on security-critical packages can auto-upgrade to vulnerable versions. Even Dependabot won't help if you accept the PR with `^` semantics.

**Solution:** Pin to exact versions for security-critical packages:

```json
"sanitize-html": "2.17.5"  // exact, not "^2.17.5"
```

Current pinned versions: `sanitize-html@2.17.5`, `sanitize-html@2.17.5` (no updates without explicit review).

**Verified:** The 2.17.3 XSS was never reachable because the dep was pinned at the time of the CVE. Stay pinned.

---

### [Security] Sanitize comment HTML at the Zod boundary, not in the UI

**Discovered in:** Initial codebase work
**Last verified:** 2026-05-25

**Problem:** Comment content could contain HTML tags. While the admin editor was trusted, comment content is rendered in email notifications — an XSS vector.

**Gotcha:** Don't assume downstream consumers (email, RSS, etc.) sanitize. The trust boundary is wherever data first enters the system.

**Solution:** Add a `.transform()` to the Zod schema that strips HTML at validation time:

```typescript
const createCommentSchema = z.object({
  content: z.string().min(1).max(2000).transform(stripHtmlTags),
});
```

This ensures comment content is always plain text at rest, regardless of input source.

**Verified:** All comment creation paths go through this schema. The transform runs server-side in the API route handler.

---

### [Security] Include userId in rate limit keys for authenticated endpoints

**Discovered in:** Initial codebase work
**Last verified:** 2026-05-25

**Problem:** Location-autocomplete rate limit key only used IP address. All admin users behind the same NAT/proxy shared a rate limit bucket.

**Gotcha:** Per-IP rate limiting is insufficient for authenticated endpoints. One user's quota can be exhausted by another user on the same network.

**Solution:** For authenticated endpoints, include the user identifier in the rate limit key:

```typescript
const key = `location-autocomplete:${userId}:${ip}`;
```

For unauthenticated endpoints, IP-only is the only option (consider using `x-forwarded-for` with care for proxies).

**Verified:** The location-autocomplete key was changed during the bun→pnpm migration. Per-admin tracking now correctly isolates each user's quota.

---

### [Security] Don't console.error in catch blocks that also throw

**Discovered in:** Initial codebase work
**Last verified:** 2026-05-25

**Problem:** Admin catch blocks logged errors with `console.error()` — leaking potentially sensitive error details (DB internals, stack traces) to server logs.

**Gotcha:** Double-logging (the catch logs, then re-throws, and the outer error handler logs again) is wasteful and noisy. The error message and stack can leak DB queries, table names, etc.

**Solution:** Pick one log point. If the function re-throws, the outer handler logs. If it must log itself, use a structured logger (pino, etc.), not `console.error`:

```typescript
// GOOD: let the caller log
catch (error) {
  throw new Error("Failed to load posts");
}

// GOOD: log with structure
catch (error) {
  logger.error({ err: error, userId }, "post load failed");
  throw error;
}

// BAD: dual logging with console.error
catch (error) {
  console.error(error);  // <-- leaks to server logs
  throw new Error("Failed to load posts");
}
```

**Verified:** All admin catch blocks were audited during the bun→pnpm migration. `console.error` removed from catch-throw paths.

---

### [Security] Use style-src-attr (not style-src 'unsafe-inline') for React style={}

**Discovered in:** Initial codebase work (CSP hardening)
**Last verified:** 2026-05-25

**Problem:** Production `style-src` had `'unsafe-inline'` — allowed any inline `<style>` block, defeating nonce-based CSP. 63+ React `style={}` patterns needed the inline allowance, but `style-src` was too broad.

**Gotcha:** `'unsafe-inline'` in `style-src` is too broad — it allows attackers to inject `<style>` blocks. The narrower `style-src-attr` directive only covers element-level `style` attributes (React `style={}`), not `<style>` blocks.

**Solution:** Split the directive:

```typescript
// Production
"style-src 'self' 'nonce-{random}'",           // nonce covers <style> elements
"style-src-attr 'unsafe-inline'",              // allows React style={} only

// Dev (no nonce support in HMR)
"style-src 'self' 'unsafe-inline'",
```

Next.js 16 render pipeline auto-extracts nonce from `script-src` and propagates as `ctx.nonce` to `<style>` elements, so no manual injection needed.

**Verified:** Production CSP verified via `curl -I` against the deployed app. The 63+ React `style={}` patterns continue to work because of `style-src-attr 'unsafe-inline'`.

---

## Code Quality

### [Code Quality] Document lint suppressions with inline comments

**Discovered in:** Initial codebase work
**Last verified:** 2026-05-25

**Problem:** Components with `useEffect` set-state patterns triggered React hooks lint rules. Suppressions were added without justification comments.

**Gotcha:** A bare `// eslint-disable-next-line` looks like a bug. The next maintainer has no way to know if the suppression is still needed or if it can be removed.

**Solution:** Always include an inline comment explaining WHY the suppression is safe:

```typescript
// eslint-disable-next-line react-hooks/exhaustive-deps
useEffect(() => {
  loadInitialData();
}, []); // intentional: only run on mount
```

**Verified:** All lint suppressions in the codebase now have inline justification comments. Audited during the bun→pnpm migration.

---

## Index by Branch Discovery

For traceability, here's which branch discovered each pattern:

| Branch | Entries Added |
|--------|---------------|
| Initial codebase (bun→pnpm migration) | 8 entries: Tooling, Security, Code Quality |
| Branch 1: `feat/seo-and-discovery` | 2 entries: Next.js dynamic routes, Vitest env stub |
| Branch 2: `feat/layout-footer-and-nav` | 4 entries: React 19 testing, Next.js global-error |
| Branch 3: `chore/schema-hardening` | 12 entries: SQLite, Drizzle, Turso |

---

## See Also

- [`docs/ARCHITECTURE.md`](./ARCHITECTURE.md) — System architecture and data model
- [`docs/CODING.md`](./CODING.md) — Codemap, conventions, API routes
- [`docs/SETUP.md`](./SETUP.md) — Environment setup
- [`docs/ROADMAP.md`](./ROADMAP.md) — Feature work tracking
- [`docs/CHANGELOG.md`](./CHANGELOG.md) — Completed work log
- [`docs/branches/`](./branches/) — Per-branch implementation checklists
