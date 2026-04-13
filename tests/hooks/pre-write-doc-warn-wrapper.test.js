#!/usr/bin/env node
'use strict';

const assert = require('assert');
const path = require('path');
const { spawnSync } = require('child_process');

const script = path.join(__dirname, '..', '..', 'scripts', 'hooks', 'pre-write-doc-warn.js');

function test(name, fn) {
  try {
    fn();
    console.log(`  ✓ ${name}`);
    return true;
  } catch (err) {
    console.log(`  ✗ ${name}`);
    console.log(`    Error: ${err.message}`);
    return false;
  }
}

function runWrapper(payload) {
  return spawnSync('node', [script], {
    encoding: 'utf8',
    input: JSON.stringify(payload),
    timeout: 10000,
  });
}

function runTests() {
  console.log('\n=== Testing pre-write-doc-warn.js wrapper ===\n');

  let passed = 0;
  let failed = 0;

  (test('delegates to doc-file-warning and preserves warning output', () => {
    const payload = { tool_input: { file_path: 'TODO.md' } };
    const result = runWrapper(payload);

    assert.strictEqual(result.status, 0, result.stderr);
    assert.strictEqual(result.stdout, JSON.stringify(payload));
    assert.ok(result.stderr.includes('WARNING'));
  }) ? passed++ : failed++);

  (test('passes through safe file paths without warnings', () => {
    const payload = { tool_input: { file_path: 'README.md' } };
    const result = runWrapper(payload);

    assert.strictEqual(result.status, 0, result.stderr);
    assert.strictEqual(result.stdout, JSON.stringify(payload));
    assert.strictEqual(result.stderr, '');
  }) ? passed++ : failed++);

  console.log(`\nResults: Passed: ${passed}, Failed: ${failed}`);
  process.exit(failed > 0 ? 1 : 0);
}

runTests();
