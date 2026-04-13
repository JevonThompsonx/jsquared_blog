const assert = require('assert');

const packageJson = require('../../package.json');

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

let passed = 0;
let failed = 0;

if (
  test('lint:ecc limits markdownlint to maintained markdown surfaces', () => {
    const lintScript = packageJson.scripts['lint:ecc'];
    assert.ok(lintScript, 'Expected package.json to define lint:ecc');
    assert.match(lintScript, /markdownlint/);
    assert.doesNotMatch(lintScript, /'\*\*\/\*\.md'/, 'lint:ecc should not lint every markdown file in the repo');
    assert.match(lintScript, /README\.md/);
    assert.match(lintScript, /AGENTS\.md/);
    assert.match(lintScript, /CONTRIBUTING\.md/);
    assert.match(lintScript, /TODO\.md/);
    assert.match(lintScript, /docs\/COMMAND-AGENT-MAP\.md/);
  })
)
  passed++;
else failed++;

console.log(`\nPassed: ${passed}`);
console.log(`Failed: ${failed}`);
process.exit(failed > 0 ? 1 : 0);
