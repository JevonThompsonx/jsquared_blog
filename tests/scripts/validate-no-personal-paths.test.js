/**
 * Tests for scripts/ci/validate-no-personal-paths.js
 */

const assert = require('assert');
const fs = require('fs');
const os = require('os');
const path = require('path');

const {
  collectFiles,
  countBlockedPathMatches,
  hasSupportedExtension,
  scanFiles,
} = require('../../scripts/ci/validate-no-personal-paths.js');

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

function makeTmpDir() {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'ecc-no-personal-paths-'));
}

function runTests() {
  console.log('\n=== Testing validate-no-personal-paths.js ===\n');

  let passed = 0;
  let failed = 0;

  if (test('countBlockedPathMatches detects Unix and Windows personal paths', () => {
    assert.strictEqual(countBlockedPathMatches('/Users/affoon/projects'), 1);
    assert.strictEqual(countBlockedPathMatches('C:\\Users\\affoon\\Projects'), 1);
    assert.strictEqual(countBlockedPathMatches('clean content'), 0);
  })) passed++; else failed++;

  if (test('hasSupportedExtension only scans shipped doc and config formats', () => {
    assert.strictEqual(hasSupportedExtension('README.md'), true);
    assert.strictEqual(hasSupportedExtension('agent.yaml'), true);
    assert.strictEqual(hasSupportedExtension('photo.png'), false);
  })) passed++; else failed++;

  if (test('collectFiles skips node_modules and .git directories', () => {
    const tmpDir = makeTmpDir();
    const files = [];
    try {
      fs.mkdirSync(path.join(tmpDir, 'docs'), { recursive: true });
      fs.mkdirSync(path.join(tmpDir, 'node_modules', 'pkg'), { recursive: true });
      fs.mkdirSync(path.join(tmpDir, '.git', 'objects'), { recursive: true });
      fs.writeFileSync(path.join(tmpDir, 'docs', 'guide.md'), 'guide');
      fs.writeFileSync(path.join(tmpDir, 'node_modules', 'pkg', 'ignored.md'), 'ignored');
      fs.writeFileSync(path.join(tmpDir, '.git', 'objects', 'ignored.md'), 'ignored');

      collectFiles(tmpDir, files);

      assert.deepStrictEqual(
        files.map(filePath => path.relative(tmpDir, filePath).split(path.sep).join('/')).sort(),
        ['docs/guide.md']
      );
    } finally {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
  })) passed++; else failed++;

  if (test('scanFiles reports matching files and ignores unsupported extensions', () => {
    const tmpDir = makeTmpDir();
    const reported = [];
    try {
      const flaggedFile = path.join(tmpDir, 'README.md');
      const ignoredFile = path.join(tmpDir, 'image.png');
      fs.writeFileSync(flaggedFile, '/Users/affoon/workspace');
      fs.writeFileSync(ignoredFile, '/Users/affoon/workspace');

      const failures = scanFiles([flaggedFile, ignoredFile], {
        reportError: message => reported.push(message),
        root: tmpDir,
      });

      assert.strictEqual(failures, 1);
      assert.deepStrictEqual(reported, ['ERROR: personal path detected in README.md']);
    } finally {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
  })) passed++; else failed++;

  console.log(`\nResults: Passed: ${passed}, Failed: ${failed}`);
  process.exit(failed > 0 ? 1 : 0);
}

runTests();
