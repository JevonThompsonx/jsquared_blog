const assert = require('assert');

const config = require('../../eslint.config.js');

function test(name, fn) {
  try {
    fn();
    console.log(`PASS: ${name}`);
    return true;
  } catch (error) {
    console.log(`FAIL: ${name}`);
    console.log(`  ${error.message}`);
    return false;
  }
}

function collectIgnores(entries) {
  return entries.flatMap(entry => (Array.isArray(entry.ignores) ? entry.ignores : []));
}

let passed = 0;
let failed = 0;

if (
  test('root eslint ignores generated Next.js output inside web', () => {
    const ignores = collectIgnores(config);
    assert.ok(ignores.includes('web/.next/**'), 'Expected root eslint config to ignore web/.next/**');
  })
)
  passed++;
else failed++;

if (
  test('root eslint ignores temporary validator wrapper files', () => {
    const ignores = collectIgnores(config);
    assert.ok(
      ignores.includes('.tmp-validator-*.js'),
      'Expected root eslint config to ignore .tmp-validator-*.js',
    );
  })
)
  passed++;
else failed++;

if (
  test('root eslint ignores vendored public worker assets', () => {
    const ignores = collectIgnores(config);
    assert.ok(ignores.includes('web/public/sw.js'), 'Expected root eslint config to ignore web/public/sw.js');
    assert.ok(
      ignores.includes('web/public/maplibre-worker.js'),
      'Expected root eslint config to ignore web/public/maplibre-worker.js',
    );
  })
)
  passed++;
else failed++;

console.log(`\nPassed: ${passed}`);
console.log(`Failed: ${failed}`);
process.exit(failed > 0 ? 1 : 0);
