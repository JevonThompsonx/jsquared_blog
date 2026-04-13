/**
 * Direct tests for scripts/codex/merge-codex-config.js
 */

const assert = require('assert');

const {
  appendToTable,
  appendImplicitTable,
  findFirstTableIndex,
  findTableRange,
  getNested,
  insertBeforeFirstTable,
  setNested,
  stringifyTable,
  stringifyTableKeys,
  updateInlineTableKeys,
} = require('../../scripts/codex/merge-codex-config.js');

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

function runTests() {
  console.log('\n=== Testing merge-codex-config.js ===\n');

  let passed = 0;
  let failed = 0;

  if (test('setNested and getNested manage dotted config paths', () => {
    const target = {};
    setNested(target, ['profiles', 'strict'], { sandbox_mode: 'read-only' });
    assert.deepStrictEqual(getNested(target, ['profiles', 'strict']), { sandbox_mode: 'read-only' });
    assert.strictEqual(getNested(target, ['profiles', 'yolo']), undefined);
  })) passed++; else failed++;

  if (test('findFirstTableIndex and findTableRange locate TOML sections', () => {
    const raw = 'approval_policy = "never"\n\n[features]\nfoo = true\n\n[agents]\nbar = true\n';
    assert.ok(findFirstTableIndex(raw) > 0);
    const range = findTableRange(raw, 'features');
    assert.ok(range);
    assert.ok(raw.slice(range.bodyStart, range.bodyEnd).includes('foo = true'));
  })) passed++; else failed++;

  if (test('insertBeforeFirstTable injects root keys before the first table', () => {
    const updated = insertBeforeFirstTable('[features]\nfoo = true\n', 'approval_policy = "never"');
    assert.ok(updated.includes('approval_policy = "never"'));
    assert.ok(updated.includes('\n\n[features]'));
  })) passed++; else failed++;

  if (test('updateInlineTableKeys appends missing keys to inline tables', () => {
    const raw = '[profiles]\nstrict = { sandbox_mode = "workspace-write" }\n';
    const updated = updateInlineTableKeys(raw, 'profiles.strict', { approval_policy: 'never' });
    assert.ok(updated.includes('strict = {'));
    assert.ok(updated.includes('sandbox_mode = "workspace-write"'));
    assert.ok(updated.includes('approval_policy = "never"'));
  })) passed++; else failed++;

  if (test('appendToTable appends missing key blocks to standalone tables', () => {
    const raw = '[agents]\nreviewer = true\n';
    const updated = appendToTable(raw, 'agents', 'explorer = true', { explorer: true });
    assert.ok(updated.includes('reviewer = true\nexplorer = true'));
  })) passed++; else failed++;

  if (test('appendImplicitTable and stringify helpers build TOML for missing tables', () => {
    const table = stringifyTable('profiles.strict', {
      sandbox_mode: 'workspace-write',
      nested: { ignored: true },
    });
    assert.ok(table.includes('[profiles.strict]'));
    assert.ok(table.includes('sandbox_mode = "workspace-write"'));
    assert.ok(!table.includes('nested'));

    const keys = stringifyTableKeys({ approval_policy: 'never', nested: { ignored: true } });
    assert.ok(keys.includes('approval_policy = "never"'));
    assert.ok(!keys.includes('nested'));

    const appended = appendImplicitTable('[features]\nfoo = true\n', 'profiles.strict', { sandbox_mode: 'workspace-write' });
    assert.ok(appended.includes('[profiles.strict]'));
  })) passed++; else failed++;

  console.log(`\nResults: Passed: ${passed}, Failed: ${failed}`);
  process.exit(failed > 0 ? 1 : 0);
}

runTests();
