/**
 * Direct tests for scripts/orchestration-status.js
 */

const assert = require('assert');
const fs = require('fs');
const os = require('os');
const path = require('path');

const {
  parseArgs,
  main,
} = require('../../scripts/orchestration-status.js');

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
  return fs.mkdtempSync(path.join(os.tmpdir(), 'ecc-orchestration-status-'));
}

function runTests() {
  console.log('\n=== Testing orchestration-status.js direct helpers ===\n');

  let passed = 0;
  let failed = 0;

  if (test('parseArgs reads target and optional write path', () => {
    const parsed = parseArgs(['node', 'script', 'workflow.json', '--write', 'snapshot.json']);
    assert.deepStrictEqual(parsed, {
      target: 'workflow.json',
      writePath: 'snapshot.json',
    });
  })) passed++; else failed++;

  if (test('main writes the inspected snapshot when --write is provided', () => {
    const tmpDir = makeTmpDir();
    const writes = [];
    const mkdirs = [];
    const logs = [];
    try {
      main({
        argv: ['node', 'script', 'workflow.json', '--write', path.join(tmpDir, 'snapshots', 'snapshot.json')],
        cwd: tmpDir,
        inspectSessionTarget: (target, options) => ({
          adapterId: options.adapterId,
          target,
          cwd: options.cwd,
        }),
        mkdirSync: (dirPath, options) => mkdirs.push({ dirPath, options }),
        writeFileSync: (filePath, content, encoding) => writes.push({ filePath, content, encoding }),
        consoleLog: message => logs.push(message),
      });

      assert.strictEqual(mkdirs.length, 1);
      assert.ok(mkdirs[0].dirPath.endsWith(path.join('snapshots')));
      assert.strictEqual(writes.length, 1);
      assert.ok(writes[0].filePath.endsWith(path.join('snapshots', 'snapshot.json')));
      assert.strictEqual(writes[0].encoding, 'utf8');
      assert.ok(writes[0].content.endsWith('\n'));

      const printed = JSON.parse(logs[0]);
      assert.deepStrictEqual(printed, {
        adapterId: 'dmux-tmux',
        target: 'workflow.json',
        cwd: tmpDir,
      });
    } finally {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
  })) passed++; else failed++;

  console.log(`\nResults: Passed: ${passed}, Failed: ${failed}`);
  process.exit(failed > 0 ? 1 : 0);
}

runTests();
