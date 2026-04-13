#!/usr/bin/env node
'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const { spawnSync } = require('child_process');

const scriptPath = path.join(__dirname, '..', '..', 'scripts', 'hooks', 'desktop-notify.js');
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

function loadDesktopNotify(options = {}) {
  const logs = [];
  const calls = [];
  const platform = options.platform || 'win32';
  const processMock = {
    platform,
    env: { ...(options.env || {}) },
    stdin: { setEncoding() {}, on() {} },
    stdout: { write() {} },
    stderr: { write() {} },
  };

  const requireMock = id => {
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

    if (id === 'fs') {
      return {
        readFileSync(targetPath, encoding) {
          if (targetPath === '/proc/version') {
            if (options.procVersionError) {
              throw new Error('ENOENT');
            }

            return options.procVersionContent || '';
          }

          return fs.readFileSync(targetPath, encoding);
        },
      };
    }

    if (id === '../lib/utils') {
      return {
        isMacOS: platform === 'darwin',
        log(message) {
          logs.push(message);
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

  return { run: module.exports.run, logs, calls };
}

function runTests() {
  console.log('\n=== Testing desktop-notify.js ===\n');

  let passed = 0;
  let failed = 0;

  (test('returns raw input and logs parse errors', () => {
    const loaded = loadDesktopNotify();
    const raw = 'not-json';
    const result = loaded.run(raw);

    assert.strictEqual(result, raw);
    assert.ok(loaded.logs.some(line => line.includes('[DesktopNotify] Error:')));
    assert.strictEqual(loaded.calls.length, 0);
  }) ? passed++ : failed++);

  (test('sends macOS notifications through osascript and sanitizes quoted text', () => {
    const loaded = loadDesktopNotify({
      platform: 'darwin',
      spawnSyncImpl(command) {
        assert.strictEqual(command, 'osascript');
        return { status: 0, stdout: '', stderr: '' };
      },
    });

    const raw = JSON.stringify({
      last_assistant_message: 'Hello "World" \\\nSecond line',
    });

    const result = loaded.run(raw);
    assert.strictEqual(result, raw);
    assert.strictEqual(loaded.calls.length, 1);
    assert.strictEqual(loaded.calls[0].command, 'osascript');
    assert.ok(loaded.calls[0].args[1].includes('Hello “World“ '));
  }) ? passed++ : failed++);

  (test('logs osascript failures on macOS', () => {
    const loaded = loadDesktopNotify({
      platform: 'darwin',
      spawnSyncImpl() {
        return { status: 1, stdout: '', stderr: '' };
      },
    });

    loaded.run(JSON.stringify({ last_assistant_message: 'Done' }));
    assert.ok(loaded.logs.some(line => line.includes('osascript failed')));
  }) ? passed++ : failed++);

  (test('uses PowerShell on WSL and sends BurntToast notifications', () => {
    const loaded = loadDesktopNotify({
      platform: 'linux',
      procVersionContent: 'Linux version 5.15.90.1-microsoft-standard-WSL2',
      spawnSyncImpl(command, args) {
        if (args[0] === '-Command' && args[1] === 'exit 0') {
          return command === 'powershell.exe'
            ? { status: 0, stdout: '', stderr: '' }
            : { status: 1, stdout: '', stderr: '' };
        }

        assert.strictEqual(command, 'powershell.exe');
        assert.ok(args[1].includes('New-BurntToastNotification'));
        return { status: 0, stdout: '', stderr: '' };
      },
    });

    const raw = JSON.stringify({ last_assistant_message: 'Ship it' });
    assert.strictEqual(loaded.run(raw), raw);
    assert.strictEqual(loaded.calls.length, 3);
    assert.strictEqual(loaded.logs.length, 0);
  }) ? passed++ : failed++);

  (test('logs BurntToast install tips when notification module is missing', () => {
    const loaded = loadDesktopNotify({
      platform: 'linux',
      procVersionContent: 'Linux version microsoft',
      spawnSyncImpl(command, args) {
        if (args[0] === '-Command' && args[1] === 'exit 0') {
          return command === 'pwsh.exe'
            ? { status: 0, stdout: '', stderr: '' }
            : { status: 1, stdout: '', stderr: '' };
        }

        return { status: 1, stdout: '', stderr: 'BurntToast module was not loaded' };
      },
    });

    loaded.run(JSON.stringify({ last_assistant_message: 'Ship it' }));
    assert.ok(loaded.logs.some(line => line.includes('Install BurntToast module')));
  }) ? passed++ : failed++);

  (test('logs a PowerShell tip when WSL has no accessible PowerShell binary', () => {
    const loaded = loadDesktopNotify({
      platform: 'linux',
      procVersionContent: 'Linux version microsoft',
      spawnSyncImpl() {
        return { status: 1, stdout: '', stderr: '' };
      },
    });

    loaded.run(JSON.stringify({ last_assistant_message: 'Ship it' }));
    assert.ok(loaded.logs.some(line => line.includes('Install BurntToast module in PowerShell')));
  }) ? passed++ : failed++);

  (test('logs non-BurntToast Windows notification failures for debugging', () => {
    const loaded = loadDesktopNotify({
      platform: 'linux',
      procVersionContent: 'Linux version microsoft',
      spawnSyncImpl(command, args) {
        if (args[0] === '-Command' && args[1] === 'exit 0') {
          if (command === 'pwsh.exe') {
            throw new Error('pwsh missing');
          }

          return command === 'powershell.exe'
            ? { status: 0, stdout: '', stderr: '' }
            : { status: 1, stdout: '', stderr: '' };
        }

        return { status: 1, stdout: '', stderr: 'General toast failure' };
      },
    });

    loaded.run(JSON.stringify({ last_assistant_message: 'Ship it' }));
    assert.ok(loaded.logs.some(line => line.includes('Notification failed: General toast failure')));
  }) ? passed++ : failed++);

  (test('handles missing /proc/version when Linux is not WSL', () => {
    const loaded = loadDesktopNotify({
      platform: 'linux',
      procVersionError: true,
    });

    const raw = JSON.stringify({ last_assistant_message: '\n\n' + 'x'.repeat(200) });
    assert.strictEqual(loaded.run(raw), raw);
    assert.strictEqual(loaded.calls.length, 0);
    assert.deepStrictEqual(loaded.logs, []);
  }) ? passed++ : failed++);

  (test('legacy stdin path passes the original payload through stdout', () => {
    const raw = JSON.stringify({ last_assistant_message: 'stdin path' });
    const result = spawnSync('node', [scriptPath], {
      encoding: 'utf8',
      input: raw,
      timeout: 10000,
    });

    assert.strictEqual(result.status, 0, result.stderr);
    assert.strictEqual(result.stdout, raw);
  }) ? passed++ : failed++);

  console.log(`\nResults: Passed: ${passed}, Failed: ${failed}`);
  process.exit(failed > 0 ? 1 : 0);
}

runTests();
