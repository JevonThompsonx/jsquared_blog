/**
 * Direct tests for scripts/sessions-cli.js
 */

const assert = require('assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { execFileSync } = require('child_process');

const SCRIPT = path.join(__dirname, '..', '..', 'scripts', 'sessions-cli.js');
const { createStateStore } = require('../../scripts/lib/state-store');
const { parseArgs } = require('../../scripts/sessions-cli');

function test(name, fn) {
  try {
    const result = fn();
    if (result && typeof result.then === 'function') {
      return result.then(() => {
        console.log(`  \u2713 ${name}`);
        return true;
      }).catch(error => {
        console.log(`  \u2717 ${name}`);
        console.log(`    Error: ${error.message}`);
        return false;
      });
    }

    console.log(`  \u2713 ${name}`);
    return true;
  } catch (error) {
    console.log(`  \u2717 ${name}`);
    console.log(`    Error: ${error.message}`);
    return false;
  }
}

function run(args = []) {
  try {
    const stdout = execFileSync('node', [SCRIPT, ...args], {
      encoding: 'utf8',
      stdio: ['pipe', 'pipe', 'pipe'],
      timeout: 10000,
    });
    return { code: 0, stdout, stderr: '' };
  } catch (error) {
    return {
      code: error.status || 1,
      stdout: error.stdout || '',
      stderr: error.stderr || '',
    };
  }
}

function createTempDbPath() {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'sessions-cli-direct-'));
  return {
    tempDir,
    dbPath: path.join(tempDir, 'state.db'),
  };
}

async function runTests() {
  console.log('\n=== Testing sessions-cli.js direct ===\n');

  let passed = 0;
  let failed = 0;

  if (await test('parseArgs handles positional session ids and rejects unknown arguments', () => {
    assert.deepStrictEqual(parseArgs(['node', 'sessions-cli.js', 'session-1', '--db', 'tmp.db', '--json', '--limit', '3']), {
      dbPath: 'tmp.db',
      help: false,
      json: true,
      limit: '3',
      sessionId: 'session-1',
    });
    assert.throws(() => parseArgs(['node', 'sessions-cli.js', 'one', 'two']), /Unknown argument: two/);
  })) passed++; else failed++;

  if (await test('shows help and exits 0', () => {
    const result = run(['--help']);
    assert.strictEqual(result.code, 0);
    assert.match(result.stdout, /Usage: node scripts\/sessions-cli\.js/);
  })) passed++; else failed++;

  if (await test('prints an empty recent session list', () => {
    const result = run(['--db', ':memory:']);
    assert.strictEqual(result.code, 0, result.stderr);
    assert.match(result.stdout, /Recent sessions:/);
    assert.match(result.stdout, /No sessions found\./);
  })) passed++; else failed++;

  if (await test('returns an error for missing sessions and invalid limits', () => {
    const missingResult = run(['missing-session', '--db', ':memory:']);
    assert.notStrictEqual(missingResult.code, 0);
    assert.match(missingResult.stderr, /Session not found: missing-session/);

    const limitResult = run(['--db', ':memory:', '--limit', '0']);
    assert.notStrictEqual(limitResult.code, 0);
    assert.match(limitResult.stderr, /Invalid limit: 0/);
  })) passed++; else failed++;

  if (await test('prints an empty session detail with no workers, skill runs, or decisions', () => {
    const { tempDir, dbPath } = createTempDbPath();

    return createStateStore({ dbPath }).then(store => {
      store.upsertSession({
        id: 'empty-session',
        adapterId: 'claude-history',
        harness: 'claude',
        state: 'recorded',
        snapshot: { workers: [] },
      });
      store.close();

      const result = run(['empty-session', '--db', dbPath]);
      assert.strictEqual(result.code, 0, result.stderr);
      assert.match(result.stdout, /Workers: 0/);
      assert.match(result.stdout, /Skill runs: 0/);
      assert.match(result.stdout, /Decisions: 0/);

      fs.rmSync(tempDir, { recursive: true, force: true });
    }).catch(error => {
      fs.rmSync(tempDir, { recursive: true, force: true });
      throw error;
    });
  })) passed++; else failed++;

  if (await test('prints recent sessions and detailed session data in human and JSON formats', async () => {
    const { tempDir, dbPath } = createTempDbPath();

    try {
      const store = await createStateStore({ dbPath });
      store.upsertSession({
        id: 'session-detail',
        adapterId: 'dmux-tmux',
        harness: 'claude',
        state: 'active',
        repoRoot: '/tmp/repo',
        startedAt: '2026-04-01T10:00:00.000Z',
        endedAt: null,
        snapshot: {
          workers: [
            {
              id: 'worker-1',
              label: 'Primary worker',
              state: 'running',
              branch: 'feat/coverage',
              worktree: '/tmp/repo-worktree',
            },
          ],
        },
      });
      store.insertSkillRun({
        id: 'skill-run-1',
        skillId: 'planner',
        skillVersion: '1.2.3',
        sessionId: 'session-detail',
        taskDescription: 'Plan coverage improvements',
        outcome: 'success',
        durationMs: 42,
      });
      store.insertDecision({
        id: 'decision-1',
        sessionId: 'session-detail',
        title: 'Target wrapper CLIs',
        rationale: 'They have the fastest remaining branch wins.',
        alternatives: ['status.js', 'install-plan.js'],
        status: 'accepted',
      });
      store.close();

      const listResult = run(['--db', dbPath]);
      assert.strictEqual(listResult.code, 0, listResult.stderr);
      assert.match(listResult.stdout, /session-detail \[claude\/dmux-tmux\] active/);
      assert.match(listResult.stdout, /Repo: \/tmp\/repo/);
      assert.match(listResult.stdout, /Workers: 1/);
      assert.match(listResult.stdout, /Total sessions: 1/);

      const detailResult = run(['session-detail', '--db', dbPath]);
      assert.strictEqual(detailResult.code, 0, detailResult.stderr);
      assert.match(detailResult.stdout, /Session: session-detail/);
      assert.match(detailResult.stdout, /Harness: claude/);
      assert.match(detailResult.stdout, /Adapter: dmux-tmux/);
      assert.match(detailResult.stdout, /worker-1 running/);
      assert.match(detailResult.stdout, /Branch: feat\/coverage/);
      assert.match(detailResult.stdout, /planner@1\.2\.3/);
      assert.match(detailResult.stdout, /Duration: 42 ms/);
      assert.match(detailResult.stdout, /Alternatives: status\.js, install-plan\.js/);

      const jsonResult = run(['session-detail', '--db', dbPath, '--json']);
      assert.strictEqual(jsonResult.code, 0, jsonResult.stderr);
      const payload = JSON.parse(jsonResult.stdout);
      assert.strictEqual(payload.session.id, 'session-detail');
      assert.strictEqual(payload.workers.length, 1);
      assert.strictEqual(payload.skillRuns.length, 1);
      assert.strictEqual(payload.decisions.length, 1);
    } finally {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  })) passed++; else failed++;

  console.log(`\nResults: Passed: ${passed}, Failed: ${failed}`);
  process.exit(failed > 0 ? 1 : 0);
}

runTests();
