# Documentation Index

One line per document in `docs/`. Start here when you need to know what exists and where the answer lives.

- [`ARCHITECTURE.md`](./ARCHITECTURE.md) — System architecture, WorkOS AuthKit reader/admin flow, data model, API routes, deployment layout.
- [`CODING.md`](./CODING.md) — Codemap: file patterns, conventions, component organization.
- [`IMPROVEMENTS.md`](./IMPROVEMENTS.md) — Prioritized feature / tech-debt / security / perf backlog (M, S, P, F, R, D, O sections).
- [`KNOWLEDGE_BASE.md`](./KNOWLEDGE_BASE.md) — Living reference of project gotchas (SQLite, Drizzle, Turso, React 19, Next.js). Append, update in place, never delete.
- [`MODERNIZATION-AUDIT.md`](./MODERNIZATION-AUDIT.md) — Security / efficiency / speed / QoL audit. **Snapshot dated 2026-08-24** — version figures and finding status are historical, re-verify against `web/package.json`.
- [`RESPONSIVE-DESIGN-PLAN.md`](./responsive-design-plan.md) — Responsive layout gaps and phase plan (mirrored as R1–R7 in `IMPROVEMENTS.md`).
- [`REVIEW-PLAN.md`](./REVIEW-PLAN.md) — Phase 1.1 bug-bash tracking: bugs found, fix branches, verification results (complete).
- [`ROADMAP.md`](./ROADMAP.md) — Master feature-tracking document; branch status table, all 10 branches + patches merged.
- [`SETUP.md`](./SETUP.md) — Environment setup, database config, running tests, integrations, Vercel deploy.
- [`STYLEGUIDE.md`](./STYLEGUIDE.md) — Design tokens, component patterns, and conventions.
- [`VERCEL-CLI-REFERENCE.md`](./VERCEL-CLI-REFERENCE.md) — Repo-specific Vercel CLI commands, auth, and troubleshooting.
- [`CHANGELOG.md`](./CHANGELOG.md) — Version history and completed-work log (Keep a Changelog format).

## Subdirectories

- [`branches/`](./branches/) — One file per roadmap branch with detailed checklists (all 10 merged).
- [`reviews/`](./reviews/) — Audit records. `2026-11-23-blog-improvement-plan.md` is the plan/acceptance record; `2026-11-23-blog-audit-findings.md` is the evidence-backed findings register; `2026-11-23-verification.md` records the final gates and NOT VERIFIED items for the security, access, privacy, SEO, performance, and UX pass; `2026-11-24-listmonk-verification.md` records the self-hosted newsletter deployment and double opt-in proof; `2026-11-24-local-origin-migration.md` records the Node/SQLite/local-media cutover, evidence, incident, and review follow-up; `2026-11-24-local-auth-migration.md` records the Better Auth replacement; `2026-11-24-workos-migration.md` records the AuthKit implementation and initial cutover; `2026-11-25-workos-magic-auth-access.md` records Magic Auth enablement, admin identity repair, signup-loop fix, reviews, and final smoke evidence; `2026-11-26-production-hardening-deploy.md` records the schema repair, deploy gates, live release, and final verification.
- [`runbooks/comment-notifications-smoke.md`](./runbooks/comment-notifications-smoke.md) — Manual smoke test for Resend comment notifications.
- [`runbooks/local-origin.md`](./runbooks/local-origin.md) — Local Node origin on templetonbak: topology, deploy, cron timers, data migration, backups, rollback, and known limitations.
- [`runbooks/workos-auth.md`](./runbooks/workos-auth.md) — WorkOS AuthKit keyless reader/admin auth: verified dashboard values, env, identity mapping, cutover, smoke, scripts, and rollback.
- [`runbooks/public-auth.md`](./runbooks/public-auth.md) — Superseded pointer to the WorkOS AuthKit runbook.
- [`runbooks/listmonk.md`](./runbooks/listmonk.md) — Self-hosted Listmonk operations: SMTP, double opt-in, backups, token rotation, rollback.

## Internal / local-only documents

These paths are referenced by other docs but are listed in `.gitignore` (`docs/DISASTER-RECOVERY.md`, `docs/AGENTS.md`). They are **not committed**, so a fresh clone will not contain them and links to them will resolve only on a machine that has created them.

| Path                        | Purpose                                                  |
| --------------------------- | -------------------------------------------------------- |
| `docs/DISASTER-RECOVERY.md` | Post-deletion recovery via Turso point-in-time branching |
| `docs/AGENTS.md`            | Internal (non-GitHub) agent instructions                 |

---

Related entry points: [`../README.md`](../README.md) (project overview) and [`../AGENTS.md`](../AGENTS.md) (agent operating instructions).
