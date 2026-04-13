/**
 * Direct tests for scripts/lib/session-adapters/claude-history.js
 */

'use strict';

const assert = require('assert');
const fs = require('fs');
const os = require('os');
const path = require('path');

const {
  createClaudeHistoryAdapter,
  isSessionFileTarget,
  parseClaudeTarget,
} = require('../../scripts/lib/session-adapters/claude-history');

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

function withHome(homeDir, fn) {
  const previousHome = process.env.HOME;
  const previousUserProfile = process.env.USERPROFILE;
  process.env.HOME = homeDir;
  process.env.USERPROFILE = homeDir;

  try {
    fn();
  } finally {
    if (typeof previousHome === 'string') {
      process.env.HOME = previousHome;
    } else {
      delete process.env.HOME;
    }

    if (typeof previousUserProfile === 'string') {
      process.env.USERPROFILE = previousUserProfile;
    } else {
      delete process.env.USERPROFILE;
    }
  }
}

function writeSessionFile(filePath, content) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, content, 'utf8');
}

function runTests() {
  console.log('\n=== Testing claude-history direct helpers ===\n');

  let passed = 0;
  let failed = 0;

  if (test('parseClaudeTarget handles supported prefixes and invalid input', () => {
    assert.strictEqual(parseClaudeTarget(null), null);
    assert.strictEqual(parseClaudeTarget('plain-target'), null);
    assert.strictEqual(parseClaudeTarget('claude-history:latest'), 'latest');
    assert.strictEqual(parseClaudeTarget('claude: session-123 '), 'session-123');
    assert.strictEqual(parseClaudeTarget('history:alias-name'), 'alias-name');
  })) passed++; else failed++;

  if (test('isSessionFileTarget only accepts existing .tmp files', () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'claude-history-file-target-'));

    try {
      const filePath = path.join(tmpDir, '2026-04-09-snapshot-session.tmp');
      const wrongExtPath = path.join(tmpDir, 'note.md');
      const nestedDir = path.join(tmpDir, 'folder');

      writeSessionFile(filePath, '# Session');
      writeSessionFile(wrongExtPath, 'not a session');
      fs.mkdirSync(nestedDir, { recursive: true });

      assert.strictEqual(isSessionFileTarget('', tmpDir), false);
      assert.strictEqual(isSessionFileTarget('folder', tmpDir), false);
      assert.strictEqual(isSessionFileTarget('note.md', tmpDir), false);
      assert.strictEqual(isSessionFileTarget(path.basename(filePath), tmpDir), true);
    } finally {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
  })) passed++; else failed++;

  if (test('adapter canOpen respects explicit adapter routing and session files', () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'claude-history-can-open-'));

    try {
      const sessionPath = path.join(tmpDir, '2026-04-09-demo-session.tmp');
      writeSessionFile(sessionPath, '# Session');

      const adapter = createClaudeHistoryAdapter({ persistSnapshots: false });
      assert.strictEqual(adapter.canOpen('bogus', { adapterId: 'dmux-tmux' }), false);
      assert.strictEqual(adapter.canOpen('bogus', { adapterId: 'claude-history' }), true);
      assert.strictEqual(adapter.canOpen(path.basename(sessionPath), { cwd: tmpDir }), true);
      assert.strictEqual(adapter.canOpen('not-a-target', { cwd: tmpDir }), false);
    } finally {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
  })) passed++; else failed++;

  if (test('adapter resolves aliases from session-aliases.json', () => {
    const homeDir = fs.mkdtempSync(path.join(os.tmpdir(), 'claude-history-alias-home-'));
    const sessionDir = fs.mkdtempSync(path.join(os.tmpdir(), 'claude-history-alias-session-'));
    const sessionPath = path.join(sessionDir, '2026-04-09-alias-session.tmp');
    const aliasesPath = path.join(homeDir, '.claude', 'session-aliases.json');

    writeSessionFile(sessionPath, [
      '# Alias Session',
      '',
      '**Branch:** feat/alias',
      '**Worktree:** /tmp/alias-worktree',
      '',
      '### Completed',
      '- [x] Alias branch covered',
    ].join('\n'));

    fs.mkdirSync(path.dirname(aliasesPath), { recursive: true });
    fs.writeFileSync(aliasesPath, JSON.stringify({
      version: '1.0',
      aliases: {
        trip: {
          sessionPath,
          createdAt: '2026-04-09T00:00:00.000Z',
          updatedAt: '2026-04-09T00:00:00.000Z',
          title: 'Trip planning',
        },
      },
      metadata: {
        totalCount: 1,
        lastUpdated: '2026-04-09T00:00:00.000Z',
      },
    }, null, 2));

    try {
      withHome(homeDir, () => {
        const adapter = createClaudeHistoryAdapter({
          persistSnapshots: false,
          loadStateStoreImpl: () => null,
        });
        const snapshot = adapter.open('claude-history:trip', { persistSnapshots: false }).getSnapshot();

        assert.strictEqual(snapshot.adapterId, 'claude-history');
        assert.strictEqual(snapshot.session.sourceTarget.type, 'claude-alias');
        assert.strictEqual(snapshot.session.sourceTarget.value, 'trip');
        assert.strictEqual(snapshot.workers[0].branch, 'feat/alias');
        assert.strictEqual(snapshot.workers[0].artifacts.sessionFile, sessionPath);
      });
    } finally {
      fs.rmSync(homeDir, { recursive: true, force: true });
      fs.rmSync(sessionDir, { recursive: true, force: true });
    }
  })) passed++; else failed++;

  if (test('adapter opens direct session-file targets relative to cwd', () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'claude-history-session-file-'));

    try {
      const sessionPath = path.join(tmpDir, '2026-04-09-direct-session.tmp');
      writeSessionFile(sessionPath, [
        '# Direct Session',
        '',
        '**Branch:** feat/direct-file',
        '',
        '### Context to Load',
        '```',
        'scripts/claw.js',
        '```',
      ].join('\n'));

      const adapter = createClaudeHistoryAdapter({
        persistSnapshots: false,
        loadStateStoreImpl: () => null,
      });
      const snapshot = adapter.open(path.basename(sessionPath), {
        cwd: tmpDir,
        persistSnapshots: false,
      }).getSnapshot();

      assert.strictEqual(snapshot.session.sourceTarget.type, 'session-file');
      assert.strictEqual(snapshot.session.sourceTarget.value, sessionPath);
      assert.deepStrictEqual(snapshot.workers[0].intent.seedPaths, ['scripts/claw.js']);
    } finally {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
  })) passed++; else failed++;

  if (test('adapter throws clear errors for missing explicit sessions and unsupported targets', () => {
    const adapter = createClaudeHistoryAdapter({ persistSnapshots: false });

    assert.throws(
      () => adapter.open('claude:missing-session', { persistSnapshots: false }).getSnapshot(),
      /Claude session not found: missing-session/
    );
    assert.throws(
      () => adapter.open('totally-unsupported-target', { persistSnapshots: false }).getSnapshot(),
      /Unsupported Claude session target: totally-unsupported-target/
    );
  })) passed++; else failed++;

  console.log(`\nResults: Passed: ${passed}, Failed: ${failed}`);
  process.exit(failed > 0 ? 1 : 0);
}

runTests();
