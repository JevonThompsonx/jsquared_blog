# Lessons Learned

**Created:** 2026-05-25
**Scope:** bun→pnpm migration, security hardening, code quality cleanup

---

## 1. Package Manager Migration (bun → pnpm)

### Problem
Project used bun as package manager. Playwright config had `bunx playwright test`, scripts referenced bun. Root `tsconfig.json` had `"types": ["bun-types"]`. No pnpm lockfile.

### Fix
- Changed Playwright config dev-server command: `bun run dev` → `pnpm run dev`
- Updated all scripts: `bun run` → `pnpm run`
- Changed `packageManager` field in root `package.json` to `pnpm@11.1.1`
- Removed `"types": ["bun-types"]` from root tsconfig.json
- Regenerated `pnpm-lock.yaml`, added `bun.lock`, `yarn.lock`, `.yarnrc.yml` to `.gitignore`

### Lesson
Never mix package managers in a repo. Pick one (pnpm) and enforce via `.gitignore` and `packageManager` field. `bun` can remain as a dev-only runtime for `bunx one-off` commands, but never as the project package manager.

---

## 2. Dead Configuration References

### Problem
Root `tsconfig.json` had `"references"` array pointing to `./shared`, `./server`, `./client` — directories that don't exist. Also had `"types": ["bun-types"]` for a removed package manager.

### Fix
Removed both stale references. The `paths` aliases (`@server/*`, `@client/*`, `@shared/*`) remain but are harmless — they have no impact since no code uses them and no project references exist.

### Lesson
Keep root config minimal. Only keep what's actively used. Stale references mislead new developers and can cause confusing IDE behavior.

---

## 3. Dependency Pinning for Security

### Problem
`sanitize-html` had range `^2.17.2` which allows minor/patch bumps. Version 2.17.3 introduced an XSS vulnerability. A future `pnpm update` or fresh install would pick up the vulnerable version.

### Fix
Pinned to exact `2.17.2` in `package.json`. No `^` prefix.

### Lesson
For security-critical packages (HTML sanitizers, auth libraries), pin exact versions. Range-based deps can auto-upgrade to vulnerable versions. Use Dependabot/Renovate for controlled, reviewed bumps.

---

## 4. Defense-in-Depth: stripHtmlTags on Comments

### Problem
Comment content could contain HTML tags. While the admin editor was trusted, comment content is rendered in email notifications. HTML in emails is an XSS vector if the email client doesn't sanitize properly.

### Fix
Added a `stripHtmlTags()` Zod transform on `createCommentSchema` that strips `<...>` before storage. This ensures comment content is always plain text at rest, regardless of input source.

### Lesson
Validate at the boundary (Zod schema), not just in the UI. Use `.transform()` for sanitization as part of the validation pipeline. Defense-in-depth: don't assume downstream consumers (email, etc.) sanitize.

---

## 5. Rate Limit Key Specificity

### Problem
Location-autocomplete rate limit key only used IP address. All admin users behind the same NAT/proxy would share a rate limit bucket.

### Fix
Added `session.user.id` to the rate limit key: `"location-autocomplete:<userId>:<ip>"`. Per-admin tracking instead of per-IP.

### Lesson
Rate limit keys should be as specific as the use case requires. For authenticated endpoints, include the user identifier to prevent one user's quota being exhausted by another.

---

## 6. console.error in Production Code

### Problem
Admin catch blocks logged errors with `console.error()` — leaking potentially sensitive error details to server logs.

### Fix
Removed `console.error` calls from admin catch blocks. Errors still throw/propagate appropriately.

### Lesson
Don't log to console in catch blocks that also throw. The caller/error handler should log. If you must log server-side, use a structured logger (pino, etc.), not `console.error`.

---

## 7. ESLint Suppression Documentation

### Problem
Components with `useEffect` set-state patterns triggered React hooks lint rules. Suppressions were added without justification comments.

### Fix
Added `// eslint-disable-next-line react-hooks/exhaustive-deps` with inline comments explaining WHY the suppression is safe (e.g., "intentional: only run on mount").

### Lesson
Always document why a lint rule is suppressed. A bare disable directive looks like a bug. Context matters for future maintainers.

---

## 8. Stale Artifact Cleanup

### Problem
`web/lint-output.txt` was committed — a stale ESLint output file. `.gitignore` was missing entries for alternative package manager lockfiles and agent config.

### Fix
- Deleted `web/lint-output.txt`
- Added `bun.lock`, `yarn.lock`, `.yarnrc.yml`, `.opencode/`, `.env*.local` to `.gitignore`
- Added `.sentryclirc` to tracking (needed for Sentry CLI auth)

### Lesson
Regularly audit `.gitignore` and committed artifacts. Stale files accumulate. A good signal: run `git ls-files` and look for anything that looks like a build/generated artifact.

---

## 9. CSP style-src Hardening (Remove 'unsafe-inline')

### Problem
Production `style-src` had `'unsafe-inline'` — allowed any inline `<style>` block, defeating nonce-based CSP. 63+ React `style={}` patterns needed the inline allowance, but `style-src` was too broad.

### Fix
- Split into `style-src 'self' 'nonce-${nonce}'` (production) — nonce covers `<style>` elements
- Added `style-src-attr 'unsafe-inline'` — narrower directive covering only element-level `style` attributes (React `style={}`), not `<style>` blocks
- Dev keeps `style-src 'self' 'unsafe-inline'` (Next.js HMR doesn't support nonce on injected CSS)
- Relies on Next.js 16 render pipeline auto-applying nonce to `<style>` elements (extracts from `script-src` directive, propagates as `ctx.nonce`)

### Lesson
`style-src-attr` is a separate CSP directive that only controls inline `style` attributes (not `<style>` elements). Use it to allow React `style={}` without granting broad `<style>` block injection. Never use `'unsafe-inline'` in `style-src` in production — nonce covers every legitimate `<style>` element if the framework propagates nonces correctly.

---

## Key Takeaways

1. **Config drift**: Root configs drift from reality (shared/server/client dirs deleted but references remain). Audit during every major change.
2. **Supply chain**: Range-based deps on security-critical packages are a ticking time bomb. Pin exact.
3. **Input validation**: Always transform+sanitize at the Zod/validation boundary, not just in the UI.
4. **Rate limiting**: Include user context in rate limit keys for authenticated endpoints.
5. **Cleanup**: Delete stale artifacts, update `.gitignore` proactively.
