/**
 * Direct tests for scripts/hooks/stop-format-typecheck.js helper branches.
 */

'use strict';

const assert = require('assert');
const fs = require('fs');
const Module = require('module');
const path = require('path');

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

function withPlatform(platform, fn) {
  const originalDescriptor = Object.getOwnPropertyDescriptor(process, 'platform');
  Object.defineProperty(process, 'platform', { value: platform });

  try {
    fn();
  } finally {
    Object.defineProperty(process, 'platform', originalDescriptor);
  }
}

function captureStderr(fn) {
  const originalWrite = process.stderr.write;
  const messages = [];
  process.stderr.write = chunk => {
    messages.push(String(chunk));
    return true;
  };

  try {
    fn(messages);
  } finally {
    process.stderr.write = originalWrite;
  }
}

function loadStopModule(overrides = {}) {
  const modulePath = require.resolve('../../scripts/hooks/stop-format-typecheck');
  const originalLoad = Module._load;
  delete require.cache[modulePath];

  Module._load = function patchedLoad(request, parent, isMain) {
    if (request === 'child_process' && overrides.childProcess) {
      return overrides.childProcess;
    }
    if (request === 'fs' && overrides.fs) {
      return overrides.fs;
    }
    if (request === '../lib/resolve-formatter' && overrides.resolveFormatter) {
      return overrides.resolveFormatter;
    }
    return originalLoad.call(this, request, parent, isMain);
  };

  try {
    return require(modulePath);
  } finally {
    Module._load = originalLoad;
    delete require.cache[modulePath];
  }
}

function runTests() {
  console.log('\n=== Testing stop-format-typecheck direct helpers ===\n');

  let passed = 0;
  let failed = 0;

  if (test('getAccumFile sanitizes CLAUDE_SESSION_ID values into a safe temp path', () => {
    const module = loadStopModule();
    const previousSessionId = process.env.CLAUDE_SESSION_ID;
    process.env.CLAUDE_SESSION_ID = 'unsafe value/with:chars';

    try {
      const accumFile = module.getAccumFile();
      assert.ok(accumFile.includes('ecc-edited-unsafe_value_with_chars.txt'));
    } finally {
      if (typeof previousSessionId === 'string') {
        process.env.CLAUDE_SESSION_ID = previousSessionId;
      } else {
        delete process.env.CLAUDE_SESSION_ID;
      }
    }
  })) passed++; else failed++;

  if (test('formatBatch exits early when no formatter is detected', () => {
    let spawned = false;
    const module = loadStopModule({
      childProcess: {
        execFileSync() {
          spawned = true;
        },
        spawnSync() {
          spawned = true;
          return { status: 0 };
        },
      },
      resolveFormatter: {
        findProjectRoot(dir) {
          return dir;
        },
        detectFormatter() {
          return null;
        },
        resolveFormatterBin() {
          return null;
        },
      },
    });

    module.formatBatch('/repo', ['/repo/file.js'], 1000);
    assert.strictEqual(spawned, false);
  })) passed++; else failed++;

  if (test('formatBatch exits early when no formatter binary resolves or files are missing', () => {
    let spawned = false;
    const module = loadStopModule({
      fs: {
        ...fs,
        existsSync(filePath) {
          return filePath === '/repo';
        },
      },
      childProcess: {
        execFileSync() {
          spawned = true;
        },
        spawnSync() {
          spawned = true;
          return { status: 0 };
        },
      },
      resolveFormatter: {
        findProjectRoot(dir) {
          return dir;
        },
        detectFormatter() {
          return 'prettier';
        },
        resolveFormatterBin() {
          return null;
        },
      },
    });

    module.formatBatch('/repo', ['/repo/file.js'], 1000);
    assert.strictEqual(spawned, false);

    const moduleWithMissingFiles = loadStopModule({
      fs: {
        ...fs,
        existsSync() {
          return false;
        },
      },
      childProcess: {
        execFileSync() {
          spawned = true;
        },
        spawnSync() {
          spawned = true;
          return { status: 0 };
        },
      },
      resolveFormatter: {
        findProjectRoot(dir) {
          return dir;
        },
        detectFormatter() {
          return 'prettier';
        },
        resolveFormatterBin() {
          return { bin: 'prettier', prefix: [] };
        },
      },
    });

    spawned = false;
    moduleWithMissingFiles.formatBatch('/repo', ['/repo/file.js'], 1000);
    assert.strictEqual(spawned, false);
  })) passed++; else failed++;

  if (test('formatBatch skips unsafe Windows .cmd paths before spawning', () => {
    let spawnCalls = 0;
    const module = loadStopModule({
      fs: {
        ...fs,
        existsSync() {
          return true;
        },
      },
      childProcess: {
        execFileSync() {
          throw new Error('should not use execFileSync on win32 .cmd path');
        },
        spawnSync() {
          spawnCalls += 1;
          return { status: 0 };
        },
      },
      resolveFormatter: {
        findProjectRoot(dir) {
          return dir;
        },
        detectFormatter() {
          return 'prettier';
        },
        resolveFormatterBin() {
          return { bin: 'prettier.cmd', prefix: [] };
        },
      },
    });

    withPlatform('win32', () => {
      captureStderr(messages => {
        module.formatBatch('C:\\repo', ['C:\\Users\\John Doe\\file.ts'], 1000);
        assert.strictEqual(spawnCalls, 0);
        assert.ok(messages.join('').includes('skipping batch - unsafe path chars') || messages.join('').includes('skipping batch'));
      });
    });
  })) passed++; else failed++;

  if (test('formatBatch uses spawnSync for Windows .cmd formatters and swallows formatter failures', () => {
    let spawnCalls = 0;
    const module = loadStopModule({
      fs: {
        ...fs,
        existsSync() {
          return true;
        },
      },
      childProcess: {
        execFileSync() {
          throw new Error('should not use execFileSync on win32 .cmd path');
        },
        spawnSync() {
          spawnCalls += 1;
          return { error: new Error('formatter missing') };
        },
      },
      resolveFormatter: {
        findProjectRoot(dir) {
          return dir;
        },
        detectFormatter() {
          return 'biome';
        },
        resolveFormatterBin() {
          return { bin: 'biome.cmd', prefix: ['bunx'] };
        },
      },
    });

    withPlatform('win32', () => {
      module.formatBatch('C:\\repo', ['C:\\repo\\safe.ts'], 1000);
    });

    assert.strictEqual(spawnCalls, 1);
  })) passed++; else failed++;

  if (test('typecheckBatch reports relevant non-Windows TypeScript errors for edited files', () => {
    const module = loadStopModule({
      childProcess: {
        execFileSync() {
          const error = new Error('tsc failed');
          error.stdout = 'C:\\repo\\src\\test.ts(1,1): error TS1000: Broken\nother.ts(1,1): error TS2000: Other';
          error.stderr = '';
          throw error;
        },
        spawnSync() {
          return { status: 0 };
        },
      },
    });

    withPlatform('linux', () => {
      captureStderr(messages => {
        module.typecheckBatch('C:\\repo', ['C:\\repo\\src\\test.ts'], 1000);
        const output = messages.join('');
        assert.ok(output.includes('TypeScript errors in test.ts'));
        assert.ok(output.includes('C:\\repo\\src\\test.ts(1,1): error TS1000: Broken'));
      });
    });
  })) passed++; else failed++;

  if (test('typecheckBatch treats Windows spawn errors as non-blocking', () => {
    const module = loadStopModule({
      childProcess: {
        execFileSync() {
          throw new Error('should not call execFileSync on win32');
        },
        spawnSync() {
          return { error: new Error('npx missing') };
        },
      },
    });

    withPlatform('win32', () => {
      captureStderr(messages => {
        module.typecheckBatch('C:\\repo', ['C:\\repo\\src\\test.ts'], 1000);
        assert.deepStrictEqual(messages, []);
      });
    });
  })) passed++; else failed++;

  console.log(`\nResults: Passed: ${passed}, Failed: ${failed}`);
  process.exit(failed > 0 ? 1 : 0);
}

runTests();
