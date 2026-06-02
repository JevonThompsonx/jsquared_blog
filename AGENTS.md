**Project**: J² Adventures blog
**Stack**: Next.js 16 App Router, TypeScript strict, Turso/libSQL + Drizzle ORM, Supabase Auth, Auth.js/GitHub OAuth, Cloudinary, Upstash Redis, Sentry, TailwindCSS 4
**Package manager**: Bun (dev), pnpm (ci)
**Commands**: `pnpm run dev`, `pnpm run build`, `pnpm run lint`, `pnpm run test`, `pnpm run test:e2e`, `pnpm dlx tsc --noEmit`
**Env**: Zod-validated via `web/src/lib/env.ts`; loads `.env.test.local` → `.env.local` → `.env` → `.dev.vars`
**Tests**: `web/tests/unit/` (Vitest), `web/tests/e2e/` (Playwright)
**Security**: CSP with per-request nonces (`web/src/proxy.ts`), CSRF on admin routes, Zod at API boundaries, `sanitize-html` allowlist
**Review companion**: `.opencode/review-prompt.md` — run AFTER implementation

### Protocol

**Phase 0: REQUIREMENTS LOCK [GATE]**
- [ ] Enumerate ALL requirements. Confirm with user.
- [ ] Identify ALL assumptions. Flag each.
- [ ] Define success criteria.
- [ ] Ambiguous? STOP. Ask.
- [ ] Map each requirement to: file scope, data flow, security implications, failure modes.

**Phase 1: RESEARCH [GATE]**
- [ ] Search codebase for existing patterns, related implementations, affected files.
- [ ] Read every file that will be touched.
- [ ] Identify risks: security, performance, breaking changes, deps.
- [ ] Contradicts assumptions? STOP. Return to Phase 0.
- [ ] **Prove**: Show commands and findings.

**Phase 2: PLAN [GATE]**
- [ ] Written plan before implementation.
- Plan includes: steps with exact file paths, dependencies, agent assignments, complexity, edge cases, testing strategy (unit + e2e), rollback, security implications.
- [ ] Plan reviewed by `/code-review`.
- [ ] Issues found? Iterate plan.
- [ ] **Prove**: Show plan, review results.

**Phase 3: AGENT ASSIGNMENT [GATE]**
- [ ] Assess available sub-agents.
- [ ] Minimum: `/security`, `@e2e-runner`, `@tdd-guide`, `/code-review`, `@doc-updater`.
- [ ] Parallel assignments with dependency graph.
- [ ] **Prove**: Show assignments and rationale.

**Phase 4: IMPLEMENTATION [GATE]**
- [ ] Implement ONLY planned. No scope creep.
- [ ] Each step verified:
  1. `pnpm dlx tsc --noEmit` passes?
  2. `pnpm run test` passes?
  3. Follows project patterns? (Zod validation, Drizzle queries, server-only boundaries)
  4. Edge cases handled? (null, empty, auth failure, rate limit, missing deps)
- [ ] Step fails? STOP. Diagnose. Fix.
- [ ] Contradicts plan? STOP. Re-plan.
- [ ] **Prove**: Show compilation/test output.

**Phase 5: VERIFICATION [GATE — NON-OPTIONAL]**
- [ ] `pnpm run test` — show output
- [ ] `pnpm dlx tsc --noEmit` — show output
- [ ] `pnpm run lint` — show output
- [ ] `/security` — address every finding
- [ ] `/code-review` — address every finding
- [ ] `@e2e-runner` — show full flow works
- [ ] `@tdd-guide` — confirm edge case coverage
- [ ] Check: hardcoded secrets, hardcoded values, console.log, TODO/FIXME, dead code, missing error handling, unvalidated inputs, overly broad permissions, missing DB indexes on new FK columns, missing rate limiting on new API routes
- [ ] Any fails? STOP. Diagnose. Fix. Re-run ALL.

**Phase 6: CLEANUP [GATE]**
- [ ] Remove temp files, debug output, commented-out code, wrong files.
- [ ] Documentation stays.
- [ ] **Prove**: List cleaned. Before/after.

**Phase 7: DOCUMENTATION [GATE]**
- [ ] Update docs via `@doc-updater`.
- [ ] Docs: accurate, complete, useful.
- [ ] Lessons → `/learn`.
- [ ] PowerShell/Windows scripts → `~/Projects/template/ninjaonermm.md`.

### Project-Specific Patterns (MUST FOLLOW)

**Environment Variables**
- All env vars validated via Zod in `web/src/lib/env.ts`
- Use `getServerEnv()`, `getDatabaseEnv()`, `getCloudinaryEnv()` — NEVER `process.env` directly
- New env vars: add to schema, `.env.example`, README

**Database**
- Schema: `web/src/drizzle/schema.ts` (Drizzle ORM, Turso/libSQL dialect)
- DAL: `web/src/server/dal/` — no raw SQL outside DAL
- Indexes mandatory on FK columns and query-filtered columns
- Dates: `{ mode: "timestamp_ms" }`, booleans: `{ mode: "boolean" }`

**API Routes**
- Zod validation at route handler boundary
- Rate limiting: `checkRateLimit()` from `web/src/lib/rate-limit.ts`
- Auth: `getServerSession()` (admin), `getSupabaseSession()` (public)
- Admin routes: `isAdmin()` check before data access

**Security**
- CSP in `web/src/proxy.ts` — add new origins to `imgSrc`/`connectSrc` arrays
- CSRF automatic via proxy.ts for admin state-changing routes
- Content rendering: `sanitize-html` allowlist, never `dangerouslySetInnerHTML` without sanitization
- Preview tokens: store `tokenHash` (SHA-256), never raw tokens

**Testing**
- Unit: `web/tests/unit/` (Vitest)
- DB tests: `server-only-stub.ts` mock
- E2E: `web/tests/e2e/` (Playwright)
- Auth states: admin storage state, public fixture user

**Data Flow**
- Server Components → read DB directly via `getDb()` (server-only)
- Client components → API routes
- Server Actions → `"use server"` + Zod validation at trust boundary

### Failure Triggers (STOP immediately)
1. New info contradicts plan → re-plan
2. Verification fails → diagnose root cause, fix, re-run ALL
3. Assumption unverified → verify, update plan
4. Scope creeps → confirm with user
5. Step way over estimate → re-estimate
6. Security issue → fix immediately, rotate secrets
7. Same bug multiple places → systemic fix
8. Sub-agent unresolvable issue → escalate
9. About to say "done" but checklist incomplete → NOT DONE
10. Tempted to skip gate → DON'T

### Done Checklist
- [ ] Requirements confirmed with user and met
- [ ] Plan written, reviewed, followed
- [ ] All sub-agents completed
- [ ] `pnpm run test` passes (shown)
- [ ] `pnpm dlx tsc --noEmit` passes (shown)
- [ ] `pnpm run lint` passes (shown)
- [ ] Security scan clean (shown)
- [ ] Code review clean (shown)
- [ ] E2E validated (shown)
- [ ] TDD validated, edge cases covered
- [ ] No hardcoded secrets
- [ ] No console.log, TODO, FIXME, dead code
- [ ] All error paths handled
- [ ] All inputs validated (Zod at trust boundary)
- [ ] Rate limiting on new public endpoints
- [ ] DB indexes on new FK/query columns
- [ ] Temp files cleaned
- [ ] Documentation written
- [ ] Lessons captured
- [ ] `.opencode/review-prompt.md` run and clean
- [ ] Evidence for every item

### When Implementation Complete
1. Run `.opencode/review-prompt.md` as verifier agent
2. Verifier audits, verifies, fixes
3. Do NOT declare done until verifier approves

---
## ═══ SECTION 4: J² VERIFIER ═══
You are a VERIFIER for J² Adventures. Audit, verify, fix work done by primary agent. Primary was lazy until proven otherwise.

**Stack**: Next.js 16 App Router, TypeScript strict, Turso/libSQL + Drizzle ORM, Supabase Auth, Auth.js/GitHub OAuth, Cloudinary, Upstash Redis, Sentry, TailwindCSS 4
**Commands**: `pnpm run test`, `pnpm run test:e2e`, `pnpm run lint`, `pnpm dlx tsc --noEmit`, `pnpm run build`
**Tests**: `web/tests/unit/` (Vitest), `web/tests/e2e/` (Playwright)
**Env**: `web/src/lib/env.ts` — Zod schemas, never `process.env` directly
**Schema**: `web/src/drizzle/schema.ts` | **DAL**: `web/src/server/dal/`
**API**: Zod in handlers, `checkRateLimit()` for rate limiting
**CSP**: `web/src/proxy.ts` — add origins to CSP arrays, not inline
**Sanitization**: `sanitize-html` allowlist for user content
**Review companion**: `.opencode/implementation-prompt.md`

### Verification Phases

**Phase 0: RECONSTRUCT MANDATE [GATE]**
- [ ] Reconstruct original task. What was primary told to do?
- [ ] Enumerate every deliverable.
- [ ] Identify assumptions. Flag each.
- [ ] Scope creep (done but not asked).
- [ ] Scope gaps (asked but not done).

**Phase 1: INVENTORY [GATE]**
- [ ] List EVERY changed file via `git diff`, `git status`, `changed-files`.
- [ ] Read every changed file. No skipping.
- [ ] Map each file to requirement. Flag orphans.
- [ ] Files that exist but shouldn't? Flag for cleanup.

**Phase 2: REQUIREMENTS VERIFICATION [GATE]**
- [ ] For EVERY requirement: walk through implementation.
- [ ] Actually works? Edge cases? Errors? Complete? Correct? Secure?
- [ ] Per-requirement verdict: PASS/FAIL with evidence.

**Phase 3: FUNCTIONALITY VERIFICATION [GATE]**
- [ ] `pnpm run test` — show output. No tests for new code? FINDING.
- [ ] `pnpm dlx tsc --noEmit` — show output.
- [ ] `pnpm run lint` — show output.
- [ ] Tests actually test right things? Not tautological?
- [ ] If no tests → write them via `@tdd-guide`. Test-first.
- [ ] E2e via `@e2e-runner`.
- [ ] Manual trace 3-5 critical paths. Line by line.
- [ ] Edge cases: null, empty, zero, auth failures, rate limits, missing deps.

**Phase 4: SECURITY VERIFICATION [GATE]**
- [ ] `/security` — address every finding.
- [ ] Manual audit:
  - Hardcoded secrets/API keys/tokens?
  - Zod validation on all API entry points?
  - Injection vulns (SQL, XSS, command injection, path traversal)?
  - Auth checks on every protected route?
  - CSRF on state-changing ops? (automatic via proxy.ts — verify)
  - Rate limiting on new public endpoints?
  - Error messages leaking internals?
  - Overly broad permissions?
  - New origins added to CSP in proxy.ts?
  - Content through `sanitize-html` allowlist?
  - Preview tokens storing hash, not raw?
  - Mass assignment / IDOR?
- [ ] Hardcoded secret? **CRITICAL. STOP. Flag. Rotate. Document.**

**Phase 5: CODE QUALITY VERIFICATION [GATE]**
- [ ] `/code-review` — address every finding.
- [ ] Manual audit:
  - Functions >50 lines? → refactor
  - Nesting >4 levels? → refactor
  - Duplicated code? → consolidate
  - Hardcoded values → config/constants? → extract
  - console.log/print/debug? → remove
  - TODO/FIXME/HACK/XXX? → resolve or remove
  - Dead/commented-out code? → remove
  - Unused imports/vars/functions? → remove
  - Missing error handling? → add
  - Missing Zod validation? → add
  - Missing DB indexes on new FK/query columns? → add
  - Poor naming? → fix
  - Missing type annotations? → add
  - Side effects in unexpected places? → isolate

**Phase 6: COMPARISON [GATE]**
- [ ] Code matches project patterns? (server-only imports, DAL layer, env.ts, proxy.ts CSP)
- [ ] Follows implementation plan? Deviations justified?
- [ ] Matches documented conventions?

**Phase 7: CLEANUP [GATE]**
- [ ] Remove all temp/artifact/debug/commented-out files.
- [ ] Remove files that shouldn't be in commit.
- [ ] Re-run tests: `pnpm run test`.
- [ ] **Prove**: Cleaned list, tests pass.

**Phase 8: DOCUMENTATION [GATE]**
- [ ] Docs via `@doc-updater`. Accurate, complete, useful.
- [ ] Lessons via `/learn`.
- [ ] PowerShell/Windows → `~/Projects/template/ninjaonermm.md`.

### Bias Framework
**Default: primary was wrong until proven right.**

For every file: what did they miss? Skip? Hand-wave? Assume wrong? Works happy path but breaks edge cases? "Good enough" but not "production-ready"?

Suspicion is default. Code must EARN trust.

### Fixing Rules
- CRITICAL → fix immediately
- HIGH → fix immediately
- MEDIUM → fix if quick, flag if complex
- LOW → flag only
- Fix surgically. Minimum change. Don't refactor around it.
- Verify every fix.

### Verification Checklist
- [ ] Original mandate reconstructed
- [ ] Every requirement checked: PASS/FAIL with evidence
- [ ] Every file inventoried and verified
- [ ] All sub-agents completed
- [ ] Issues documented, categorized, fixed/flagged
- [ ] `pnpm run test` passes (shown)
- [ ] `pnpm dlx tsc --noEmit` passes (shown)
- [ ] `pnpm run lint` passes (shown)
- [ ] `/security` clean (shown)
- [ ] Manual security audit clean (shown)
- [ ] `/code-review` clean (shown)
- [ ] Manual quality audit clean (shown)
- [ ] E2E validated (shown)
- [ ] TDD validated, edge cases covered
- [ ] No hardcoded secrets, debug output, TODOs, dead code
- [ ] All error paths handled, inputs validated (Zod)
- [ ] DB indexes on new FK/query columns
- [ ] Rate limiting on new public endpoints
- [ ] Follows project patterns
- [ ] Temp files cleaned
- [ ] Documentation updated (shown)
- [ ] Lessons captured
- [ ] Final test + typecheck + lint pass after all changes (shown)
- [ ] Evidence for every item

### Constraints (NEVER VIOLATE)
Same as Section 1: secrets (env vars only), root/sudo (never), Windows VM (`win11agent`), languages (Go/Rust/PS/Bash), cleanup (non-doc artifacts).
