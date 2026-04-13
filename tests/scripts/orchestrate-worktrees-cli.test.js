/**
 * Tests for scripts/orchestrate-worktrees.js
 */

const assert = require('assert');
const fs = require('fs');
const os = require('os');
const path = require('path');

const {
  parseArgs,
  loadPlanConfig,
  printDryRun,
} = require('../../scripts/orchestrate-worktrees.js');

function test(name, fn) {
  try {
    fn();
    console.log(`  \u2713 ${name}`);
    return true;
  } catch (error) {
    console.log(`  \u2717 ${name}`);
    console.log(`    Error: ${error.message}`);
    return false;
  }
}

function makeTmpDir() {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'ecc-orchestrate-worktrees-'));
}

function runTests() {
  console.log('\n=== Testing orchestrate-worktrees.js ===\n');

  let passed = 0;
  let failed = 0;

  if (test('parseArgs extracts the plan path and flags', () => {
    const parsed = parseArgs(['node', 'script', 'plan.json', '--execute', '--write-only']);
    assert.deepStrictEqual(parsed, {
      execute: true,
      planPath: 'plan.json',
      writeOnly: true,
    });
  })) passed++; else failed++;

  if (test('loadPlanConfig resolves absolute paths and defaults repoRoot', () => {
    const tmpDir = makeTmpDir();
    const originalCwd = process.cwd();
    try {
      const planPath = path.join(tmpDir, 'plan.json');
      fs.writeFileSync(planPath, JSON.stringify({ coordinationRoot: '.claude/orchestration' }));
      process.chdir(tmpDir);

      const loaded = loadPlanConfig(planPath);

      assert.strictEqual(loaded.absolutePath, planPath);
      assert.strictEqual(loaded.config.repoRoot, tmpDir);
      assert.strictEqual(loaded.config.coordinationRoot, '.claude/orchestration');
    } finally {
      process.chdir(originalCwd);
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
  })) passed++; else failed++;

  if (test('printDryRun renders worker details and commands as JSON', () => {
    const originalLog = console.log;
    const output = [];
    try {
      console.log = message => output.push(message);
      printDryRun({
        sessionName: 'session-name',
        repoRoot: '/repo',
        coordinationDir: '/repo/.claude/orchestration/session-name',
        workerPlans: [{
          workerName: 'Worker A',
          branchName: 'feat/a',
          worktreePath: '/repo/.worktrees/a',
          seedPaths: ['README.md'],
          taskFilePath: '/repo/.claude/orchestration/session-name/task.md',
          handoffFilePath: '/repo/.claude/orchestration/session-name/handoff.md',
          launchCommand: 'codex run',
          gitCommand: 'git worktree add /repo/.worktrees/a feat/a',
        }],
        tmuxCommands: [{ cmd: 'tmux', args: ['new-session', '-d'] }],
      }, '/repo/plan.json');

      const parsed = JSON.parse(output.join('\n'));
      assert.strictEqual(parsed.planFile, '/repo/plan.json');
      assert.strictEqual(parsed.sessionName, 'session-name');
      assert.deepStrictEqual(parsed.commands, [
        'git worktree add /repo/.worktrees/a feat/a',
        'tmux new-session -d',
      ]);
      assert.strictEqual(parsed.workers[0].workerName, 'Worker A');
    } finally {
      console.log = originalLog;
    }
  })) passed++; else failed++;

  console.log(`\nResults: Passed: ${passed}, Failed: ${failed}`);
  process.exit(failed > 0 ? 1 : 0);
}

runTests();
