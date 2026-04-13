/**
 * Direct tests for scripts/status.js
 */

const assert = require('assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { execFileSync } = require('child_process');

const SCRIPT = path.join(__dirname, '..', '..', 'scripts', 'status.js');
const { createStateStore } = require('../../scripts/lib/state-store');
const { parseArgs } = require('../../scripts/status');

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
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'status-direct-'));
  return {
    tempDir,
    dbPath: path.join(tempDir, 'state.db'),
  };
}

async function runTests() {
  console.log('\n=== Testing status.js direct ===\n');

  let passed = 0;
  let failed = 0;

  if (test('parseArgs handles flags and rejects unknown arguments', () => {
    assert.deepStrictEqual(parseArgs(['node', 'status.js', '--db', 'tmp.db', '--json', '--limit', '9']), {
      dbPath: 'tmp.db',
      json: true,
      help: false,
      limit: '9',
    });
    assert.throws(() => parseArgs(['node', 'status.js', '--wat']), /Unknown argument: --wat/);
  })) passed++; else failed++;

  if (test('shows help and exits 0', () => {
    const result = run(['--help']);
    assert.strictEqual(result.code, 0);
    assert.match(result.stdout, /Usage: node scripts\/status\.js/);
  })) passed++; else failed++;

  if (test('reports invalid limit values as CLI errors', () => {
    const result = run(['--limit', '0']);
    assert.strictEqual(result.code, 1);
    assert.match(result.stderr, /Invalid limit: 0/);
  })) passed++; else failed++;

  if (test('prints the empty human-readable status sections', () => {
    const memoryPath = ':memory:';
    const result = run(['--db', memoryPath]);
    assert.strictEqual(result.code, 0, result.stderr);
    assert.match(result.stdout, /Active sessions: 0/);
    assert.match(result.stdout, /- none/);
    assert.match(result.stdout, /Recent runs: none/);
    assert.match(result.stdout, /Installations: none/);
    assert.match(result.stdout, /Pending governance events: 0/);
  })) passed++; else failed++;

  if (test('prints JSON output for an empty in-memory store', () => {
    const result = run(['--db', ':memory:', '--json']);
    assert.strictEqual(result.code, 0, result.stderr);
    const payload = JSON.parse(result.stdout);
    assert.strictEqual(payload.activeSessions.activeCount, 0);
    assert.strictEqual(payload.installHealth.status, 'missing');
  })) passed++; else failed++;

  if (await test('prints populated human-readable and JSON status output', async () => {
    const { tempDir, dbPath } = createTempDbPath();

    try {
      const store = await createStateStore({ dbPath });
      store.upsertSession({
        id: 'session-active',
        adapterId: 'dmux-tmux',
        harness: 'claude',
        state: 'active',
        repoRoot: '/tmp/repo',
        startedAt: '2026-04-02T09:00:00.000Z',
        snapshot: {
          workers: [{ id: 'worker-1' }],
        },
      });
      store.insertSkillRun({
        id: 'skill-success',
        skillId: 'planner',
        skillVersion: '1.0.0',
        sessionId: 'session-active',
        taskDescription: 'Successful run',
        outcome: 'success',
      });
      store.insertSkillRun({
        id: 'skill-failure',
        skillId: 'planner',
        skillVersion: '1.0.0',
        sessionId: 'session-active',
        taskDescription: 'Failed run',
        outcome: 'failure',
      });
      store.upsertInstallState({
        targetId: 'cursor-project',
        targetRoot: '/tmp/repo/.cursor',
        profile: 'core',
        modules: ['rules-core', 'platform-configs'],
        operations: [],
        installedAt: '2026-04-02T09:05:00.000Z',
        sourceVersion: '1.9.0',
      });
      store.insertGovernanceEvent({
        id: 'gov-1',
        sessionId: 'session-active',
        eventType: 'manual-review',
        createdAt: '2026-04-02T09:10:00.000Z',
      });
      store.close();

      const humanResult = run(['--db', dbPath]);
      assert.strictEqual(humanResult.code, 0, humanResult.stderr);
      assert.match(humanResult.stdout, /ECC status/);
      assert.match(humanResult.stdout, /Active sessions: 1/);
      assert.match(humanResult.stdout, /session-active \[claude\/dmux-tmux\] active/);
      assert.match(humanResult.stdout, /Skill runs \(last 20\):/);
      assert.match(humanResult.stdout, /Success: 1/);
      assert.match(humanResult.stdout, /Failure: 1/);
      assert.match(humanResult.stdout, /Success rate: 50%/);
      assert.match(humanResult.stdout, /Failure rate: 50%/);
      assert.match(humanResult.stdout, /Recent runs:/);
      assert.match(humanResult.stdout, /Install health: healthy/);
      assert.match(humanResult.stdout, /Installations:/);
      assert.match(humanResult.stdout, /cursor-project healthy/);
      assert.match(humanResult.stdout, /Pending governance events: 1/);
      assert.match(humanResult.stdout, /gov-1 manual-review/);

      const jsonResult = run(['--db', dbPath, '--json']);
      assert.strictEqual(jsonResult.code, 0, jsonResult.stderr);
      const payload = JSON.parse(jsonResult.stdout);
      assert.strictEqual(payload.activeSessions.activeCount, 1);
      assert.strictEqual(payload.skillRuns.summary.successCount, 1);
      assert.strictEqual(payload.skillRuns.summary.failureCount, 1);
      assert.strictEqual(payload.installHealth.status, 'healthy');
      assert.strictEqual(payload.governance.pendingCount, 1);
    } finally {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  })) passed++; else failed++;

  console.log(`\nResults: Passed: ${passed}, Failed: ${failed}`);
  process.exit(failed > 0 ? 1 : 0);
}

runTests();
