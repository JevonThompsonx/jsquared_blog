# Multi-Model Workflow Guide

Last updated: 2026-03-17 (refreshed by Opus)

## Overview

This project uses multiple AI models across two tools (Claude Code and Windsurf Cascade) to parallelize development. This document describes how to coordinate them.

## Tool Setup

### Claude Code/Copilot (Terminal / VS Code Extension)
- Reads: `CLAUDE.md` (auto-loaded), `AGENTS.md` (reference)
- Models: Claude Opus 4.6 or GPT-5.4 (planning), Claude Sonnet 4.6 and GPT-5.4 (backend/review)
- Switch models: `/model opus` or `/model sonnet`

### Windsurf Cascade (IDE)
- Reads: `.windsurfrules` (auto-loaded), `AGENTS.md` (reference)
- Models: Gemini 3 Flash (frontend), GPT-5.4 (scripts/review)
- Configure model in Windsurf settings

## Workflow Patterns

### Pattern 1: New Feature (Backend + Frontend)

```
1. Opus or GPT-5.4 plans the feature → updates docs/PLAN.md
2. Sonnet or GPT-5.4 implements backend (API route, DAL, schema if needed)
3. Sonnet or GPT-5.4 commits + runs `bun run build`
4. Gemini implements frontend UI (components, pages)
5. Gemini commits + runs `bun run build`
6. Opus or GPT-5.4 reviews the full feature
```

**Example**: Adding bulk publish
```
Opus:   "Design bulk publish API — PATCH /api/admin/posts/bulk with Zod schema"
Sonnet: Writes route + server action + tests → commits [2.1]
Gemini: Builds checkbox UI + bulk action bar → commits [2.1-ui]
Opus:   Reviews both commits
```

### Pattern 2: Frontend-Only Change

```
1. Gemini implements (styling, loading states, mobile fixes)
2. Gemini commits + runs `bun run build`
3. Done (no backend review needed for pure UI)
```

### Pattern 3: Schema Change

```
1. Opus or GPT-5.4 writes ADR in docs/decisions/
2. Sonnet or GPT-5.4 updates web/src/drizzle/schema.ts
3. Run: bun run db:generate
4. Verify migration uses --> statement-breakpoint delimiters
5. Run: bun run db:migrate
6. Sonnet or GPT-5.4 updates DAL/queries
7. Commit schema + migration + DAL together
8. Gemini builds UI if needed
```

### Pattern 4: Bug Fix

```
1. Identify which layer the bug is in
2. Route to correct model:
   - Server/data bug → Sonnet or GPT-5.4
   - UI/styling bug → Gemini
   - Architecture issue → Opus or GPT-5.4
3. Fix + test + commit
```

## Avoiding Conflicts

### Golden Rule
**Never have two models editing the same file simultaneously.** The file ownership map in `AGENTS.md` prevents most conflicts. When a file needs cross-model work:

1. Backend model goes first (writes the data/API layer)
2. Commits cleanly
3. Frontend model picks up from the committed state

### Shared Files (Require Coordination)
These files may be touched by multiple models — coordinate carefully:

| File | Primary Owner | Secondary |
|------|--------------|-----------|
| `web/src/app/layout.tsx` | Sonnet (providers, meta) | Gemini (layout UI) |
| `web/src/app/globals.css` | Gemini (styles) | Sonnet (CSS vars for new features) |
| `web/package.json` | Either (new deps) | — |

### Commit Message Convention

```
[task-id] Short description

Examples:
[1.2] Add Vitest config and first DAL unit tests
[2.1] Add bulk publish server action
[2.1-ui] Add bulk publish checkbox UI
[3.2-a11y] Fix color contrast on tag chips
```

## Handoff Checklist

Before switching from one model to another:

- [ ] All changes committed (no unstaged work)
- [ ] `bun run build` passes from `web/`
- [ ] `bun run lint` passes
- [ ] No TypeScript errors (`bunx tsc --noEmit`)
- [ ] Commit message references the task ID from PLAN.md
- [ ] If new API route: contract documented in a comment at the top of the route file
- [ ] If new component: exports are clean and props are typed

## Playwright admin setup

For authenticated admin smoke coverage in `web/tests/e2e/smoke.spec.ts`:

- Preferred local flow: run `bun run e2e:capture-admin-state` from `web/`
- This writes a reusable Auth.js session to `web/playwright/.auth/admin.json`
- Tests automatically use that file when `E2E_ADMIN_STORAGE_STATE` is not set
- Use `E2E_ADMIN_POST_ID` only for the delete-confirm moderation path that must target a post with existing comments

## Quick Reference

| I want to... | Use this model | In this tool |
|---|---|---|
| Plan a new feature | Opus | Claude Code (`/model opus`) |
| Write an API route | Sonnet | Claude Code (`/model sonnet`) |
| Write a DAL function | Sonnet | Claude Code |
| Create a UI component | Gemini 3 Flash | Windsurf Cascade |
| Fix a styling issue | Gemini 3 Flash | Windsurf Cascade |
| Write a complex client hook | Gemini 3 Flash | Windsurf Cascade |
| Debug a hard frontend issue | Gemini 3 Flash | Windsurf Cascade |
| Write a Python script | GPT-5.4 | OpenCode / Copilot |
| TypeScript cleanup / review | GPT-5.4 | OpenCode / Copilot |
| Update CLAUDE.md / AGENTS.md | Opus | Claude Code |
| Write tests | Opus (strategy) → Sonnet (impl) | Claude Code |
| Review architecture | Opus | Claude Code |

## Review Protocol

### When to review AI-generated code

Every time a model completes a task, the output should be reviewed before it's treated as done. This is especially important for:

1. **Gemini/Cascade output** — known to introduce hardcoded colors, loose types, string literal routes, and inaccurate status claims. Always check against the Cascade-specific review flags in `AGENTS.md`.
2. **GPT-5.4 output** — generally accurate but can miss project-specific conventions. Check auth boundaries and DAL patterns.
3. **Sonnet output** — usually clean but verify schema changes and migration file format.

### Review should confirm:
- Quality gate passes (`lint`, `tsc`, `build`, `test`)
- No `any`, `as`, or `!` assertions introduced
- CSS uses variables, not hardcoded colors
- Routes use typed helpers
- All 4 theme combinations work
- Loading/error states present where needed
