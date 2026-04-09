# jsquared_blog Ralph Constitution

> Autonomous TODO-driven development for the jsquared_blog workspace using OpenCode, with safety rails adapted to this repository's existing workflow.

---

## Context Detection

### Ralph OpenCode Loop Mode

You are in Ralph loop mode when launched by `scripts/ralph-opencode-loop.ps1`.

In this mode:
- Use `TODO.md` as the canonical execution tracker
- Read `README.md`, `prompt.md`, `AGENTS.md`, `TODO.md`, and `agent.md` before major work
- Pick one smallest safe incomplete batch from `TODO.md`
- Avoid overlapping unrelated in-flight edits in the dirty worktree
- Follow TDD, security, and verification rules already defined by the repository
- Update `TODO.md` and `agent.md` after each meaningful completed batch
- Output `<promise>DONE</promise>` only when one concrete batch is complete and verified
- Output `<promise>ALL_DONE</promise>` only when no safe actionable batch remains

### Interactive Mode

When not in loop mode:
- Be helpful and conversational
- Use the repo's native workflows and agents directly

---

## Canonical Sources

Source priority for loop work:

1. `TODO.md`
2. `README.md`
3. `prompt.md`
4. `AGENTS.md`
5. `agent.md`

Do not invent a parallel spec system unless explicitly requested.

---

## Core Principles

- Smallest correct batch first
- TDD before production changes
- Security review on every trust boundary
- Do not disturb unrelated in-flight edits
- Keep verification evidence explicit in `TODO.md`

---

## Technical Stack

Detected from codebase:

- Monorepo root with `web/` Next.js application
- TypeScript, Bun/Yarn tooling, Playwright, Vitest, OpenCode

---

## Autonomy

YOLO Mode: ENABLED inside the workspace only
Git Autonomy: DISABLED by default

Meaning:

- You may read, edit, and run verification commands in the repo
- Do not push automatically
- Do not create commits unless explicitly requested by the user

---

## Work Selection

Use `TODO.md` instead of `specs/`.

Pick the highest-value incomplete batch that is also safe given the current dirty worktree.

Skip a batch when:

- It overlaps files with unrelated active edits
- It requires unsafe remote or production changes
- It lacks a clear RED target

If blocked, record the blocker in `TODO.md` or `agent.md` and move to the next safe batch.

---

## Verification

Per batch, capture:

- RED evidence
- GREEN evidence
- Refactor proof if applicable
- Lint/typecheck/build/test status as applicable
- Security result for sensitive changes

Prefer repository commands already documented in `TODO.md` and `package.json`.

---

## Completion Signal

Use these exact signals:

- `<promise>DONE</promise>`
  Use only after completing one concrete batch, updating trackers, and recording verification evidence.

- `<promise>ALL_DONE</promise>`
  Use only when no safe incomplete batch remains in `TODO.md`.

Never output either signal speculatively.
