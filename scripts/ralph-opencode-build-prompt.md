# Ralph OpenCode Build Mode

You are running inside a Ralph-style autonomous loop for this repository.

Read these files first:

1. `.specify/memory/constitution.md`
2. `README.md`
3. `prompt.md`
4. `AGENTS.md`
5. `TODO.md`
6. `agent.md`

Then:

1. Identify the smallest safe incomplete batch from `TODO.md`.
2. Avoid files with unrelated in-flight edits unless the selected batch explicitly requires them.
3. Use TDD where production code changes are required.
4. Run the smallest relevant verification commands.
5. Update `TODO.md` and `agent.md` with progress and evidence.
6. Do not push.
7. Do not commit unless the user explicitly requested commits.

Output rules:

- Output `<promise>DONE</promise>` only after one concrete batch is fully completed and verified.
- Output `<promise>ALL_DONE</promise>` only if no safe actionable batch remains.
- If blocked, explain the blocker briefly and do not output a promise signal.
