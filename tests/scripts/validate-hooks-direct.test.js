/**
 * Direct tests for scripts/ci/validate-hooks.js helpers
 */

const assert = require('assert');

const {
  isNonEmptyString,
  isNonEmptyStringArray,
  validateHookEntry,
} = require('../../scripts/ci/validate-hooks.js');

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

function withCapturedConsole(fn) {
  const originalError = console.error;
  const messages = [];
  console.error = message => messages.push(message);
  try {
    return fn(messages);
  } finally {
    console.error = originalError;
  }
}

function runTests() {
  console.log('\n=== Testing validate-hooks.js direct helpers ===\n');

  let passed = 0;
  let failed = 0;

  if (test('string helpers reject blank values and accept trimmed strings', () => {
    assert.strictEqual(isNonEmptyString('  hi  '), true);
    assert.strictEqual(isNonEmptyString('   '), false);
    assert.strictEqual(isNonEmptyStringArray(['one', ' two ']), true);
    assert.strictEqual(isNonEmptyStringArray(['ok', '   ']), false);
  })) passed++; else failed++;

  if (test('validateHookEntry covers prompt and http hook branches', () => {
    withCapturedConsole(messages => {
      const promptErrors = validateHookEntry({ type: 'prompt', prompt: 'Review this', model: '' }, 'PromptHook');
      assert.strictEqual(promptErrors, true);
      assert.ok(messages.some(message => message.includes("'model' must be a non-empty string")));
    });

    withCapturedConsole(messages => {
      const httpErrors = validateHookEntry({ type: 'http', url: '', headers: { Accept: 5 }, allowedEnvVars: ['OK', ''] }, 'HttpHook');
      assert.strictEqual(httpErrors, true);
      assert.ok(messages.some(message => message.includes("missing or invalid 'url' field")));
      assert.ok(messages.some(message => message.includes("'headers' must be an object with string values")));
      assert.ok(messages.some(message => message.includes("'allowedEnvVars' must be an array of strings")));
    });
  })) passed++; else failed++;

  if (test('validateHookEntry accepts valid command hooks and rejects async on non-command hooks', () => {
    withCapturedConsole(messages => {
      const ok = validateHookEntry({ type: 'command', command: ['node', 'script.js'], async: true }, 'CommandHook');
      assert.strictEqual(ok, false);
      assert.deepStrictEqual(messages, []);
    });

    withCapturedConsole(messages => {
      const failedValidation = validateHookEntry({ type: 'prompt', prompt: 'hello', async: true }, 'PromptHook');
      assert.strictEqual(failedValidation, true);
      assert.ok(messages.some(message => message.includes("'async' is only supported for command hooks")));
    });
  })) passed++; else failed++;

  console.log(`\nResults: Passed: ${passed}, Failed: ${failed}`);
  process.exit(failed > 0 ? 1 : 0);
}

runTests();
