#!/usr/bin/env node
'use strict';

const assert = require('assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const vm = require('vm');

const scriptPath = path.join(__dirname, '..', '..', 'scripts', 'hooks', 'quality-gate.js');
const scriptSource = fs.readFileSync(scriptPath, 'utf8');

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

function loadQualityGate(options = {}) {
  const logs = [];
  const calls = [];
  const processMock = {
    env: { ...(options.env || {}) },
    cwd: () => options.cwd || process.cwd(),
    stdin: { setEncoding() {}, on() {} },
    stdout: { write() {} },
    stderr: {
      write(message) {
        logs.push(String(message).trimEnd());
      },
    },
  };

  const requireMock = id => {
    if (id === 'fs') {
      return {
        ...fs,
        existsSync: options.existsSync || fs.existsSync,
      };
    }

    if (id === 'child_process') {
      return {
        spawnSync(command, args, spawnOptions) {
          calls.push({ command, args, options: spawnOptions });
          if (typeof options.spawnSyncImpl === 'function') {
            return options.spawnSyncImpl(command, args, spawnOptions);
          }

          return { status: 0, stdout: '', stderr: '' };
        },
      };
    }

    if (id === '../lib/resolve-formatter') {
      return {
        findProjectRoot(dir) {
          return options.findProjectRoot ? options.findProjectRoot(dir) : dir;
        },
        detectFormatter(projectRoot) {
          return options.detectFormatter ? options.detectFormatter(projectRoot) : null;
        },
        resolveFormatterBin(projectRoot, formatter) {
          return options.resolveFormatterBin ? options.resolveFormatterBin(projectRoot, formatter) : null;
        },
      };
    }

    return require(id);
  };

  requireMock.main = {};

  const module = { exports: {} };
  vm.runInNewContext(scriptSource, {
    require: requireMock,
    module,
    exports: module.exports,
    __filename: scriptPath,
    __dirname: path.dirname(scriptPath),
    process: processMock,
    Buffer,
    console,
    setTimeout,
    clearTimeout,
  }, { filename: scriptPath });

  return { run: module.exports.run, calls, logs };
}

function withTempFile(ext, fn) {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'quality-gate-coverage-'));
  const filePath = path.join(tempDir, `sample${ext}`);
  fs.writeFileSync(filePath, 'sample\n', 'utf8');

  try {
    fn(filePath, tempDir);
  } finally {
    fs.rmSync(tempDir, { recursive: true, force: true });
  }
}

function runTests() {
  console.log('\n=== Testing quality-gate.js coverage branches ===\n');

  let passed = 0;
  let failed = 0;

  (test('skips JS files when Biome is configured because post-edit-format handles them', () => {
    withTempFile('.js', filePath => {
      const loaded = loadQualityGate({
        detectFormatter() {
          return 'biome';
        },
      });

      const raw = JSON.stringify({ tool_input: { file_path: filePath } });
      assert.strictEqual(loaded.run(raw), raw);
      assert.strictEqual(loaded.calls.length, 0);
      assert.deepStrictEqual(loaded.logs, []);
    });
  }) ? passed++ : failed++);

  (test('runs Biome for markdown files and logs strict failures', () => {
    withTempFile('.md', filePath => {
      const loaded = loadQualityGate({
        env: {
          ECC_QUALITY_GATE_FIX: 'true',
          ECC_QUALITY_GATE_STRICT: 'true',
        },
        findProjectRoot() {
          return path.dirname(filePath);
        },
        detectFormatter() {
          return 'biome';
        },
        resolveFormatterBin() {
          return { bin: 'node', prefix: ['fake-biome'] };
        },
        spawnSyncImpl() {
          return { status: 1, stdout: '', stderr: '' };
        },
      });

      const raw = JSON.stringify({ tool_input: { file_path: filePath } });
      assert.strictEqual(loaded.run(raw), raw);
      assert.strictEqual(loaded.calls.length, 1);
      assert.deepStrictEqual(Array.from(loaded.calls[0].args), ['fake-biome', 'check', filePath, '--write']);
      assert.ok(loaded.logs.some(line => line.includes('Biome check failed')));
    });
  }) ? passed++ : failed++);

  (test('runs Prettier checks and logs strict failures', () => {
    withTempFile('.json', filePath => {
      const loaded = loadQualityGate({
        env: { ECC_QUALITY_GATE_STRICT: 'true' },
        findProjectRoot() {
          return path.dirname(filePath);
        },
        detectFormatter() {
          return 'prettier';
        },
        resolveFormatterBin() {
          return { bin: 'node', prefix: ['fake-prettier'] };
        },
        spawnSyncImpl() {
          return { status: 1, stdout: '', stderr: '' };
        },
      });

      const raw = JSON.stringify({ tool_input: { file_path: filePath } });
      assert.strictEqual(loaded.run(raw), raw);
      assert.strictEqual(loaded.calls.length, 1);
      assert.deepStrictEqual(Array.from(loaded.calls[0].args), ['fake-prettier', '--check', filePath]);
      assert.ok(loaded.logs.some(line => line.includes('Prettier check failed')));
    });
  }) ? passed++ : failed++);

  (test('runs gofmt check mode and reports formatting drift', () => {
    withTempFile('.go', filePath => {
      const loaded = loadQualityGate({
        env: { ECC_QUALITY_GATE_STRICT: 'true' },
        spawnSyncImpl() {
          return { status: 0, stdout: `${filePath}\n`, stderr: '' };
        },
      });

      const raw = JSON.stringify({ tool_input: { file_path: filePath } });
      assert.strictEqual(loaded.run(raw), raw);
      assert.strictEqual(loaded.calls.length, 1);
      assert.deepStrictEqual(Array.from(loaded.calls[0].args), ['-l', filePath]);
      assert.ok(loaded.logs.some(line => line.includes('gofmt check failed')));
    });
  }) ? passed++ : failed++);

  (test('runs gofmt write mode and reports execution failures', () => {
    withTempFile('.go', filePath => {
      const loaded = loadQualityGate({
        env: {
          ECC_QUALITY_GATE_FIX: 'true',
          ECC_QUALITY_GATE_STRICT: 'true',
        },
        spawnSyncImpl() {
          return { status: 2, stdout: '', stderr: '' };
        },
      });

      const raw = JSON.stringify({ tool_input: { file_path: filePath } });
      assert.strictEqual(loaded.run(raw), raw);
      assert.strictEqual(loaded.calls.length, 1);
      assert.deepStrictEqual(Array.from(loaded.calls[0].args), ['-w', filePath]);
      assert.ok(loaded.logs.some(line => line.includes('gofmt failed')));
    });
  }) ? passed++ : failed++);

  (test('runs Ruff for Python files and logs strict failures', () => {
    withTempFile('.py', filePath => {
      const loaded = loadQualityGate({
        env: { ECC_QUALITY_GATE_STRICT: 'true' },
        spawnSyncImpl() {
          return { status: 1, stdout: '', stderr: '' };
        },
      });

      const raw = JSON.stringify({ tool_input: { file_path: filePath } });
      assert.strictEqual(loaded.run(raw), raw);
      assert.strictEqual(loaded.calls.length, 1);
      assert.deepStrictEqual(Array.from(loaded.calls[0].args), ['format', '--check', filePath]);
      assert.ok(loaded.logs.some(line => line.includes('Ruff check failed')));
    });
  }) ? passed++ : failed++);

  console.log(`\nResults: Passed: ${passed}, Failed: ${failed}`);
  process.exit(failed > 0 ? 1 : 0);
}

runTests();
