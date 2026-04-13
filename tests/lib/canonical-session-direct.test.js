'use strict';

const assert = require('assert');
const fs = require('fs');
const os = require('os');
const path = require('path');

const {
  SESSION_SCHEMA_VERSION,
  getFallbackSessionRecordingPath,
  normalizeClaudeHistorySession,
  normalizeDmuxSnapshot,
  persistCanonicalSnapshot,
  validateCanonicalSnapshot,
} = require('../../scripts/lib/session-adapters/canonical-session');

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

function createSnapshot(overrides = {}) {
  return {
    schemaVersion: SESSION_SCHEMA_VERSION,
    adapterId: 'claude-history',
    session: {
      id: 'session-1',
      kind: 'history',
      state: 'recorded',
      repoRoot: null,
      sourceTarget: {
        type: 'claude-history',
        value: 'latest',
      },
      ...(overrides.session || {}),
    },
    workers: [
      {
        id: 'worker-1',
        label: 'Worker 1',
        state: 'recorded',
        health: 'healthy',
        branch: null,
        worktree: null,
        runtime: {
          kind: 'claude-session',
          command: 'claude',
          active: false,
          dead: true,
          ...(overrides.workerRuntime || {}),
        },
        intent: {
          objective: 'Review state',
          seedPaths: [],
          ...(overrides.workerIntent || {}),
        },
        outputs: {
          summary: [],
          validation: [],
          remainingRisks: [],
          ...(overrides.workerOutputs || {}),
        },
        artifacts: {
          sessionFile: '/tmp/session.tmp',
          ...(overrides.workerArtifacts || {}),
        },
        ...(overrides.worker || {}),
      },
    ],
    aggregates: {
      workerCount: 1,
      states: { recorded: 1 },
      healths: { healthy: 1 },
      ...(overrides.aggregates || {}),
    },
    ...overrides,
  };
}

function runTests() {
  console.log('\n=== Testing canonical-session.js ===\n');

  let passed = 0;
  let failed = 0;

  if (test('validates canonical snapshots and rejects worker count mismatches', () => {
    const snapshot = createSnapshot({
      aggregates: {
        workerCount: 2,
        states: { recorded: 1 },
        healths: { healthy: 1 },
      },
    });

    assert.throws(
      () => validateCanonicalSnapshot(snapshot),
      /aggregates.workerCount to match workers.length/
    );
  })) passed++; else failed++;

  if (test('rejects non-object snapshots and malformed canonical structures', () => {
    assert.throws(() => validateCanonicalSnapshot(null), /must be an object/);
    assert.throws(
      () => validateCanonicalSnapshot(createSnapshot({ schemaVersion: 'ecc.session.v0' })),
      /Unsupported canonical session schema version/
    );
    assert.throws(
      () => validateCanonicalSnapshot(createSnapshot({ session: null })),
      /requires session to be an object/
    );
    assert.throws(
      () => validateCanonicalSnapshot(createSnapshot({ session: { id: 'session-1', kind: 'history', state: 'recorded', repoRoot: null, sourceTarget: null } })),
      /requires session.sourceTarget to be an object/
    );
    assert.throws(
      () => validateCanonicalSnapshot(createSnapshot({ workers: 'bad' })),
      /requires workers to be an array/
    );
    assert.throws(
      () => validateCanonicalSnapshot(createSnapshot({ worker: { runtime: null } })),
      /workers\[0\]\.runtime to be an object/
    );
    assert.throws(
      () => validateCanonicalSnapshot(createSnapshot({ worker: { intent: null } })),
      /workers\[0\]\.intent to be an object/
    );
    assert.throws(
      () => validateCanonicalSnapshot(createSnapshot({ workerOutputs: { summary: 'bad' } })),
      /outputs.summary to be an array of strings/
    );
    assert.throws(
      () => validateCanonicalSnapshot(createSnapshot({ aggregates: null })),
      /requires aggregates to be an object/
    );
    assert.throws(
      () => validateCanonicalSnapshot(createSnapshot({ aggregates: { workerCount: 1, states: null, healths: {} } })),
      /requires aggregates.states to be an object/
    );
    assert.throws(
      () => validateCanonicalSnapshot(createSnapshot({ aggregates: { workerCount: 1, states: {}, healths: null } })),
      /requires aggregates.healths to be an object/
    );
  })) passed++; else failed++;

  if (test('rejects malformed worker primitive fields', () => {
    assert.throws(
      () => validateCanonicalSnapshot(createSnapshot({ worker: { health: 42 } })),
      /workers\[0\]\.health to be a non-empty string/
    );
    assert.throws(
      () => validateCanonicalSnapshot(createSnapshot({ workerRuntime: { active: 'yes' } })),
      /workers\[0\]\.runtime.active to be a boolean/
    );
    assert.throws(
      () => validateCanonicalSnapshot(createSnapshot({ workerIntent: { seedPaths: [1] } })),
      /workers\[0\]\.intent.seedPaths to be an array of strings/
    );
    assert.throws(
      () => validateCanonicalSnapshot(createSnapshot({ worker: { artifacts: null } })),
      /workers\[0\]\.artifacts to be an object/
    );
    assert.throws(
      () => validateCanonicalSnapshot(createSnapshot({ aggregates: { workerCount: 1, states: { recorded: -1 }, healths: { healthy: 1 } } })),
      /aggregates.states.recorded to be a non-negative integer/
    );
  })) passed++; else failed++;

  if (test('normalizes dmux snapshots with failed workers and health variations', () => {
    const snapshot = normalizeDmuxSnapshot({
      sessionName: 'dmux-failed',
      repoRoot: '/repo',
      sessionActive: false,
      workers: [
        {
          workerSlug: 'failed-worker',
          status: { state: 'failed', branch: 'feat/a', worktree: '/repo/a' },
          task: { objective: 'Check failure', seedPaths: ['a.js'] },
          handoff: { summary: [], validation: [], remainingRisks: ['broken'] },
          files: { status: '/tmp/a.status', task: '/tmp/a.task', handoff: '/tmp/a.handoff' },
          pane: null,
        },
        {
          workerSlug: 'dead-pane',
          status: { state: 'running', updated: new Date().toISOString(), branch: 'feat/b', worktree: '/repo/b' },
          task: { objective: 'Check pane', seedPaths: [] },
          handoff: { summary: [], validation: [], remainingRisks: [] },
          files: { status: '/tmp/b.status', task: '/tmp/b.task', handoff: '/tmp/b.handoff' },
          pane: { currentCommand: 'claude', active: true, dead: true, pid: 99 },
        },
        {
          workerSlug: 'stale-worker',
          status: { state: 'active', updated: '2000-01-01T00:00:00.000Z', branch: 'feat/c', worktree: '/repo/c' },
          task: { objective: 'Check stale', seedPaths: [] },
          handoff: { summary: [], validation: [], remainingRisks: [] },
          files: { status: '/tmp/c.status', task: '/tmp/c.task', handoff: '/tmp/c.handoff' },
          pane: { currentCommand: 'codex', active: false, dead: false, pid: 100 },
        },
        {
          workerSlug: 'healthy-worker',
          status: { state: 'completed', updated: '2026-01-01T00:00:00.000Z', branch: 'feat/d', worktree: '/repo/d' },
          task: { objective: 'Check healthy', seedPaths: [] },
          handoff: { summary: [], validation: [], remainingRisks: [] },
          files: { status: '/tmp/d.status', task: '/tmp/d.task', handoff: '/tmp/d.handoff' },
          pane: null,
        },
      ],
    }, {
      type: 'session',
      value: 'dmux-failed',
    });

    assert.strictEqual(snapshot.session.state, 'failed');
    assert.deepStrictEqual(
      snapshot.workers.map(worker => worker.health),
      ['degraded', 'degraded', 'stale', 'healthy']
    );
    assert.strictEqual(snapshot.aggregates.healths.degraded, 2);
    assert.strictEqual(snapshot.aggregates.healths.stale, 1);
    assert.strictEqual(snapshot.aggregates.healths.healthy, 1);
  })) passed++; else failed++;

  if (test('normalizes dmux snapshots to missing, completed, and idle session states', () => {
    const missingSnapshot = normalizeDmuxSnapshot({
      sessionName: 'dmux-missing',
      repoRoot: '/repo',
      sessionActive: false,
      workerCount: 0,
      workers: [],
    }, { type: 'plan', value: '/repo/plan.json' });

    const completedSnapshot = normalizeDmuxSnapshot({
      sessionName: 'dmux-complete',
      repoRoot: '/repo',
      sessionActive: false,
      workerStates: { completed: 2 },
      workers: [
        {
          workerSlug: 'one',
          status: { state: 'completed', updated: '2026-01-01T00:00:00.000Z' },
          task: { objective: 'complete one', seedPaths: [] },
          handoff: { summary: [], validation: [], remainingRisks: [] },
          files: { status: 'a', task: 'b', handoff: 'c' },
          pane: null,
        },
        {
          workerSlug: 'two',
          status: { state: 'success', updated: '2026-01-01T00:00:00.000Z' },
          task: { objective: 'complete two', seedPaths: [] },
          handoff: { summary: [], validation: [], remainingRisks: [] },
          files: { status: 'd', task: 'e', handoff: 'f' },
          pane: null,
        },
      ],
    }, { type: 'session', value: 'dmux-complete' });

    const idleSnapshot = normalizeDmuxSnapshot({
      sessionName: 'dmux-idle',
      repoRoot: '/repo',
      sessionActive: false,
      workers: [
        {
          workerSlug: 'one',
          status: { state: 'queued' },
          task: { objective: 'wait here', seedPaths: [] },
          handoff: { summary: [], validation: [], remainingRisks: [] },
          files: { status: 'g', task: 'h', handoff: 'i' },
          pane: null,
        },
      ],
    }, { type: 'session', value: 'dmux-idle' });

    assert.strictEqual(missingSnapshot.session.state, 'missing');
    assert.strictEqual(completedSnapshot.session.state, 'completed');
    assert.strictEqual(idleSnapshot.session.state, 'idle');
  })) passed++; else failed++;

  if (test('normalizes claude history sessions using filename fallback and parsed context', () => {
    const snapshot = normalizeClaudeHistorySession({
      shortId: 'no-id',
      filename: '2026-04-09-session.tmp',
      sessionPath: '/tmp/2026-04-09-session.tmp',
      metadata: {
        title: 'Fallback title',
        branch: 'main',
        worktree: '/repo',
        context: 'README.md\n\nscripts/test.js\n',
        completed: ['done'],
        notes: 'follow up',
      },
    }, {
      type: 'claude-history',
      value: 'latest',
    });

    assert.strictEqual(snapshot.session.id, '2026-04-09-session');
    assert.strictEqual(snapshot.workers[0].label, 'Fallback title');
    assert.strictEqual(snapshot.workers[0].intent.objective, 'Fallback title');
    assert.deepStrictEqual(snapshot.workers[0].intent.seedPaths, ['README.md', 'scripts/test.js']);
    assert.deepStrictEqual(snapshot.workers[0].outputs.summary, ['done']);
    assert.deepStrictEqual(snapshot.workers[0].outputs.remainingRisks, ['follow up']);
  })) passed++; else failed++;

  if (test('skips persistence when explicitly disabled', () => {
    const snapshot = createSnapshot();
    const result = persistCanonicalSnapshot(snapshot, { persist: false });

    assert.deepStrictEqual(result, {
      backend: 'skipped',
      path: null,
      recordedAt: null,
    });
  })) passed++; else failed++;

  if (test('persists canonical snapshots via available state-store writer methods', () => {
    const calls = [];
    const snapshot = createSnapshot();
    const result = persistCanonicalSnapshot(snapshot, {
      stateStore: {
        sessions: {
          recordSessionSnapshot(receivedSnapshot, metadata) {
            calls.push({ receivedSnapshot, metadata });
          },
        },
      },
    });

    assert.strictEqual(result.backend, 'state-store');
    assert.strictEqual(calls.length, 1);
    assert.strictEqual(calls[0].receivedSnapshot.session.id, 'session-1');
    assert.strictEqual(calls[0].metadata.sessionId, 'session-1');
  })) passed++; else failed++;

  if (test('falls back to JSON recording when the requested state-store module is unavailable', () => {
    const recordingDir = fs.mkdtempSync(path.join(os.tmpdir(), 'canonical-recording-'));
    const snapshot = createSnapshot();

    try {
      const result = persistCanonicalSnapshot(snapshot, {
        recordingDir,
        loadStateStoreImpl() {
          const error = new Error("Cannot find module '../state-store'");
          error.code = 'MODULE_NOT_FOUND';
          throw error;
        },
      });

      assert.strictEqual(result.backend, 'json-file');
      assert.ok(fs.existsSync(result.path));
    } finally {
      fs.rmSync(recordingDir, { recursive: true, force: true });
    }
  })) passed++; else failed++;

  if (test('falls back to JSON recording when a loaded state-store has no writer methods', () => {
    const recordingDir = fs.mkdtempSync(path.join(os.tmpdir(), 'canonical-recording-'));
    const snapshot = createSnapshot();

    try {
      const result = persistCanonicalSnapshot(snapshot, {
        recordingDir,
        stateStore: {
          createStateStore() {},
        },
      });

      assert.strictEqual(result.backend, 'json-file');
      assert.ok(fs.existsSync(result.path));
    } finally {
      fs.rmSync(recordingDir, { recursive: true, force: true });
    }
  })) passed++; else failed++;

  if (test('rewrites malformed existing fallback recordings with a fresh history', () => {
    const recordingDir = fs.mkdtempSync(path.join(os.tmpdir(), 'canonical-recording-'));
    const snapshot = createSnapshot({
      adapterId: 'adapter/with spaces',
      session: {
        id: 'session with spaces',
        kind: 'history',
        state: 'recorded',
        repoRoot: null,
        sourceTarget: {
          type: 'claude-history',
          value: 'latest',
        },
      },
    });

    try {
      const recordingPath = getFallbackSessionRecordingPath(snapshot, { recordingDir });
      fs.mkdirSync(path.dirname(recordingPath), { recursive: true });
      fs.writeFileSync(recordingPath, '{not-json', 'utf8');

      const result = persistCanonicalSnapshot(snapshot, { recordingDir });
      const payload = JSON.parse(fs.readFileSync(result.path, 'utf8'));

      assert.strictEqual(payload.latest.session.id, 'session with spaces');
      assert.strictEqual(payload.history.length, 1);
      assert.ok(result.path.includes('adapter_with_spaces'));
      assert.ok(result.path.endsWith('session_with_spaces.json'));
    } finally {
      fs.rmSync(recordingDir, { recursive: true, force: true });
    }
  })) passed++; else failed++;

  console.log(`\nResults: Passed: ${passed}, Failed: ${failed}`);
  process.exit(failed > 0 ? 1 : 0);
}

runTests();
