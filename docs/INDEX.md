# Documentation Index

One line per document in `docs/`. Start here when you need to know what exists and where the answer lives.

- [`ARCHITECTURE.md`](./ARCHITECTURE.md) — System architecture, dual-auth flow, data model, API routes, deployment layout.
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
- [`runbooks/comment-notifications-smoke.md`](./runbooks/comment-notifications-smoke.md) — Manual smoke test for Resend comment notifications.

## Internal / local-only documents

These paths are referenced by other docs but are listed in `.gitignore` (`docs/DISASTER-RECOVERY.md`, `docs/AGENTS.md`). They are **not committed**, so a fresh clone will not contain them and links to them will resolve only on a machine that has created them.

| Path | Purpose |
|------|---------|
| `docs/DISASTER-RECOVERY.md` | Post-deletion recovery via Turso point-in-time branching |
| `docs/AGENTS.md` | Internal (non-GitHub) agent instructions |

---

Related entry points: [`../README.md`](../README.md) (project overview) and [`../AGENTS.md`](../AGENTS.md) (agent operating instructions).
