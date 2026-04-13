#!/usr/bin/env node
'use strict';

const assert = require('assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawnSync } = require('child_process');

const script = path.join(__dirname, '..', '..', 'scripts', 'hooks', 'session-start-bootstrap.js');

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

function makeTempDir(prefix) {
  return fs.mkdtempSync(path.join(os.tmpdir(), prefix));
}

function cleanup(dirPath) {
  fs.rmSync(dirPath, { recursive: true, force: true });
}

function writeRunner(rootDir, source) {
  const runnerPath = path.join(rootDir, 'scripts', 'hooks', 'run-with-flags.js');
  fs.mkdirSync(path.dirname(runnerPath), { recursive: true });
  fs.writeFileSync(runnerPath, source);
  return runnerPath;
}

function runBootstrap(input, env) {
  return spawnSync('node', [script], {
    encoding: 'utf8',
    input,
    env,
    timeout: 10000,
  });
}

function runTests() {
  console.log('\n=== Testing session-start-bootstrap.js ===\n');

  let passed = 0;
  let failed = 0;

  (test('uses CLAUDE_PLUGIN_ROOT runner and forwards stdout stderr and exit code', () => {
    const pluginRoot = makeTempDir('ecc-plugin-root-');
    const homeDir = makeTempDir('ecc-home-');
    const rawInput = JSON.stringify({ hello: 'world' });

    try {
      writeRunner(
        pluginRoot,
        [
          "const fs = require('fs');",
          "const input = fs.readFileSync(0, 'utf8');",
          "process.stderr.write('runner stderr\\n');",
          "process.stdout.write(JSON.stringify({ args: process.argv.slice(2), input }));",
          'process.exit(7);',
        ].join('\n')
      );

      const result = runBootstrap(rawInput, {
        ...process.env,
        HOME: homeDir,
        USERPROFILE: homeDir,
        CLAUDE_PLUGIN_ROOT: pluginRoot,
      });

      assert.strictEqual(result.status, 7, result.stderr);
      assert.ok(result.stderr.includes('runner stderr'));

      const parsed = JSON.parse(result.stdout);
      assert.deepStrictEqual(parsed.args, [
        'session:start',
        'scripts/hooks/session-start.js',
        'minimal,standard,strict',
      ]);
      assert.strictEqual(parsed.input, rawInput);
    } finally {
      cleanup(pluginRoot);
      cleanup(homeDir);
    }
  }) ? passed++ : failed++);

  (test('falls back to raw stdin when runner succeeds without stdout', () => {
    const pluginRoot = makeTempDir('ecc-plugin-root-');
    const homeDir = makeTempDir('ecc-home-');
    const rawInput = JSON.stringify({ mode: 'passthrough' });

    try {
      writeRunner(
        pluginRoot,
        [
          "const fs = require('fs');",
          "fs.readFileSync(0, 'utf8');",
          "process.stderr.write('only stderr\\n');",
          'process.exit(0);',
        ].join('\n')
      );

      const result = runBootstrap(rawInput, {
        ...process.env,
        HOME: homeDir,
        USERPROFILE: homeDir,
        CLAUDE_PLUGIN_ROOT: pluginRoot,
      });

      assert.strictEqual(result.status, 0, result.stderr);
      assert.strictEqual(result.stdout, rawInput);
      assert.ok(result.stderr.includes('only stderr'));
    } finally {
      cleanup(pluginRoot);
      cleanup(homeDir);
    }
  }) ? passed++ : failed++);

  (test('resolves runner from cached plugin path when env root is unset', () => {
    const homeDir = makeTempDir('ecc-home-');
    const pluginRoot = path.join(
      homeDir,
      '.claude',
      'plugins',
      'cache',
      'everything-claude-code',
      'acme',
      '1.2.3'
    );
    const rawInput = JSON.stringify({ source: 'cache' });

    try {
      writeRunner(
        pluginRoot,
        [
          "const fs = require('fs');",
          "const input = fs.readFileSync(0, 'utf8');",
          "process.stdout.write('cache:' + input);",
        ].join('\n')
      );

      const result = runBootstrap(rawInput, {
        ...process.env,
        HOME: homeDir,
        USERPROFILE: homeDir,
        CLAUDE_PLUGIN_ROOT: '',
      });

      assert.strictEqual(result.status, 0, result.stderr);
      assert.strictEqual(result.stdout, `cache:${rawInput}`);
    } finally {
      cleanup(homeDir);
    }
  }) ? passed++ : failed++);

  (test('warns and passes stdin through when no plugin root can be resolved', () => {
    const homeDir = makeTempDir('ecc-home-');
    const rawInput = JSON.stringify({ source: 'missing-root' });

    try {
      const result = runBootstrap(rawInput, {
        ...process.env,
        HOME: homeDir,
        USERPROFILE: homeDir,
        CLAUDE_PLUGIN_ROOT: '',
      });

      assert.strictEqual(result.status, 0, result.stderr);
      assert.strictEqual(result.stdout, rawInput);
      assert.ok(result.stderr.includes('could not resolve ECC plugin root'));
    } finally {
      cleanup(homeDir);
    }
  }) ? passed++ : failed++);

  console.log(`\nResults: Passed: ${passed}, Failed: ${failed}`);
  process.exit(failed > 0 ? 1 : 0);
}

runTests();
