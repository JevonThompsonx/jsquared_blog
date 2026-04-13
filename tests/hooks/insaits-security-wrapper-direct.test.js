/**
 * Direct tests for scripts/hooks/insaits-security-wrapper.js
 */

const assert = require('assert');

const {
  execute,
  isEnabled,
} = require('../../scripts/hooks/insaits-security-wrapper.js');

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

function executeWithRuntime(rawInput, spawnResult, envValue) {
  const stdout = [];
  const stderr = [];
  const exits = [];

  execute(rawInput, {
    env: { ...process.env, ECC_ENABLE_INSAITS: envValue },
    spawnSync: () => spawnResult,
    stdoutWrite: chunk => stdout.push(chunk),
    stderrWrite: chunk => stderr.push(chunk),
    exit: code => exits.push(code),
  });

  return { stdout: stdout.join(''), stderr: stderr.join(''), exits };
}

function runTests() {
  console.log('\n=== Testing insaits-security-wrapper.js direct helpers ===\n');

  let passed = 0;
  let failed = 0;

  if (test('isEnabled handles common truthy toggles', () => {
    assert.strictEqual(isEnabled('1'), true);
    assert.strictEqual(isEnabled('TRUE'), true);
    assert.strictEqual(isEnabled('off'), false);
  })) passed++; else failed++;

  if (test('execute fails open when python is missing', () => {
    const result = executeWithRuntime('payload', { error: { code: 'ENOENT' } }, 'true');
    assert.strictEqual(result.stdout, 'payload');
    assert.ok(result.stderr.includes('python3/python not found'));
    assert.deepStrictEqual(result.exits, [0]);
  })) passed++; else failed++;

  if (test('execute fails open on generic spawn errors and signal exits', () => {
    const spawnError = executeWithRuntime('payload', { error: new Error('timeout') }, 'true');
    assert.strictEqual(spawnError.stdout, 'payload');
    assert.ok(spawnError.stderr.includes('Security monitor failed to run: timeout'));
    assert.deepStrictEqual(spawnError.exits, [0]);

    const signaled = executeWithRuntime('payload', { status: null, signal: 'SIGTERM' }, 'true');
    assert.strictEqual(signaled.stdout, 'payload');
    assert.ok(signaled.stderr.includes('Security monitor killed (signal: SIGTERM)'));
    assert.deepStrictEqual(signaled.exits, [0]);
  })) passed++; else failed++;

  if (test('execute forwards child stdout stderr and exit code on success', () => {
    const result = executeWithRuntime('payload', { status: 3, stdout: 'child-out', stderr: 'child-err' }, 'true');
    assert.strictEqual(result.stdout, 'child-out');
    assert.strictEqual(result.stderr, 'child-err');
    assert.deepStrictEqual(result.exits, [3]);
  })) passed++; else failed++;

  console.log(`\nResults: Passed: ${passed}, Failed: ${failed}`);
  process.exit(failed > 0 ? 1 : 0);
}

runTests();
