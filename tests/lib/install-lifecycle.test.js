/**
 * Tests for scripts/lib/install-lifecycle.js
 */

const assert = require('assert');
const fs = require('fs');
const os = require('os');
const path = require('path');

const {
  buildDoctorReport,
  discoverInstalledStates,
  normalizeTargets,
  repairInstalledStates,
  uninstallInstalledStates,
} = require('../../scripts/lib/install-lifecycle');
const {
  createInstallState,
  writeInstallState,
} = require('../../scripts/lib/install-state');

const REPO_ROOT = path.join(__dirname, '..', '..');
const CURRENT_PACKAGE_VERSION = JSON.parse(
  fs.readFileSync(path.join(REPO_ROOT, 'package.json'), 'utf8')
).version;
const CURRENT_MANIFEST_VERSION = JSON.parse(
  fs.readFileSync(path.join(REPO_ROOT, 'manifests', 'install-modules.json'), 'utf8')
).version;

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

function createTempDir(prefix) {
  return fs.mkdtempSync(path.join(os.tmpdir(), prefix));
}

function cleanup(dirPath) {
  fs.rmSync(dirPath, { recursive: true, force: true });
}

function writeState(filePath, options) {
  const state = createInstallState(options);
  writeInstallState(filePath, state);
  return state;
}

function runTests() {
  console.log('\n=== Testing install-lifecycle.js ===\n');

  let passed = 0;
  let failed = 0;

  if (test('discovers installed states for multiple targets in the current context', () => {
    const homeDir = createTempDir('install-lifecycle-home-');
    const projectRoot = createTempDir('install-lifecycle-project-');

    try {
      const claudeStatePath = path.join(homeDir, '.claude', 'ecc', 'install-state.json');
      const cursorStatePath = path.join(projectRoot, '.cursor', 'ecc-install-state.json');

      writeState(claudeStatePath, {
        adapter: { id: 'claude-home', target: 'claude', kind: 'home' },
        targetRoot: path.join(homeDir, '.claude'),
        installStatePath: claudeStatePath,
        request: {
          profile: null,
          modules: [],
          legacyLanguages: ['typescript'],
          legacyMode: true,
        },
        resolution: {
          selectedModules: ['legacy-claude-rules'],
          skippedModules: [],
        },
        operations: [],
        source: {
          repoVersion: CURRENT_PACKAGE_VERSION,
          repoCommit: 'abc123',
          manifestVersion: CURRENT_MANIFEST_VERSION,
        },
      });

      writeState(cursorStatePath, {
        adapter: { id: 'cursor-project', target: 'cursor', kind: 'project' },
        targetRoot: path.join(projectRoot, '.cursor'),
        installStatePath: cursorStatePath,
        request: {
          profile: 'core',
          modules: [],
          legacyLanguages: [],
          legacyMode: false,
        },
        resolution: {
          selectedModules: ['rules-core', 'platform-configs'],
          skippedModules: [],
        },
        operations: [],
        source: {
          repoVersion: CURRENT_PACKAGE_VERSION,
          repoCommit: 'def456',
          manifestVersion: CURRENT_MANIFEST_VERSION,
        },
      });

      const records = discoverInstalledStates({
        homeDir,
        projectRoot,
        targets: ['claude', 'cursor'],
      });

      assert.strictEqual(records.length, 2);
      assert.strictEqual(records[0].exists, true);
      assert.strictEqual(records[1].exists, true);
      assert.strictEqual(records[0].state.target.id, 'claude-home');
      assert.strictEqual(records[1].state.target.id, 'cursor-project');
    } finally {
      cleanup(homeDir);
      cleanup(projectRoot);
    }
  })) passed++; else failed++;

  if (test('normalizes target selections by deduping explicit entries and defaulting to all adapters', () => {
    const explicitTargets = normalizeTargets(['claude', 'cursor', 'claude']);
    const defaultTargets = normalizeTargets();

    assert.deepStrictEqual(explicitTargets, ['claude', 'cursor']);
    assert.ok(defaultTargets.includes('claude'));
    assert.ok(defaultTargets.includes('cursor'));
  })) passed++; else failed++;

  if (test('doctor reports missing managed files as an error', () => {
    const homeDir = createTempDir('install-lifecycle-home-');
    const projectRoot = createTempDir('install-lifecycle-project-');

    try {
      const targetRoot = path.join(projectRoot, '.cursor');
      const statePath = path.join(targetRoot, 'ecc-install-state.json');
      fs.mkdirSync(targetRoot, { recursive: true });

      writeState(statePath, {
        adapter: { id: 'cursor-project', target: 'cursor', kind: 'project' },
        targetRoot,
        installStatePath: statePath,
        request: {
          profile: null,
          modules: ['platform-configs'],
          legacyLanguages: [],
          legacyMode: false,
        },
        resolution: {
          selectedModules: ['platform-configs'],
          skippedModules: [],
        },
        operations: [
          {
            kind: 'copy-file',
            moduleId: 'platform-configs',
            sourceRelativePath: '.cursor/hooks.json',
            destinationPath: path.join(targetRoot, 'hooks.json'),
            strategy: 'sync-root-children',
            ownership: 'managed',
            scaffoldOnly: false,
          },
        ],
        source: {
          repoVersion: CURRENT_PACKAGE_VERSION,
          repoCommit: 'abc123',
          manifestVersion: CURRENT_MANIFEST_VERSION,
        },
      });

      const report = buildDoctorReport({
        repoRoot: REPO_ROOT,
        homeDir,
        projectRoot,
        targets: ['cursor'],
      });

      assert.strictEqual(report.results.length, 1);
      assert.strictEqual(report.results[0].status, 'error');
      assert.ok(report.results[0].issues.some(issue => issue.code === 'missing-managed-files'));
    } finally {
      cleanup(homeDir);
      cleanup(projectRoot);
    }
  })) passed++; else failed++;

  if (test('doctor reports a healthy legacy install when managed files are present', () => {
    const homeDir = createTempDir('install-lifecycle-home-');
    const projectRoot = createTempDir('install-lifecycle-project-');

    try {
      const targetRoot = path.join(homeDir, '.claude');
      const statePath = path.join(targetRoot, 'ecc', 'install-state.json');
      const managedFile = path.join(targetRoot, 'rules', 'common', 'coding-style.md');
      const sourceContent = fs.readFileSync(path.join(REPO_ROOT, 'rules', 'common', 'coding-style.md'), 'utf8');
      fs.mkdirSync(path.dirname(managedFile), { recursive: true });
      fs.writeFileSync(managedFile, sourceContent);

      writeState(statePath, {
        adapter: { id: 'claude-home', target: 'claude', kind: 'home' },
        targetRoot,
        installStatePath: statePath,
        request: {
          profile: null,
          modules: [],
          legacyLanguages: ['typescript'],
          legacyMode: true,
        },
        resolution: {
          selectedModules: ['legacy-claude-rules'],
          skippedModules: [],
        },
        operations: [
          {
            kind: 'copy-file',
            moduleId: 'legacy-claude-rules',
            sourceRelativePath: 'rules/common/coding-style.md',
            destinationPath: managedFile,
            strategy: 'preserve-relative-path',
            ownership: 'managed',
            scaffoldOnly: false,
          },
        ],
        source: {
          repoVersion: CURRENT_PACKAGE_VERSION,
          repoCommit: 'abc123',
          manifestVersion: CURRENT_MANIFEST_VERSION,
        },
      });

      const report = buildDoctorReport({
        repoRoot: REPO_ROOT,
        homeDir,
        projectRoot,
        targets: ['claude'],
      });

      assert.strictEqual(report.results.length, 1);
      assert.strictEqual(report.results[0].status, 'ok');
      assert.strictEqual(report.results[0].issues.length, 0);
    } finally {
      cleanup(homeDir);
      cleanup(projectRoot);
    }
  })) passed++; else failed++;

  if (test('doctor reports drifted managed files as a warning', () => {
    const homeDir = createTempDir('install-lifecycle-home-');
    const projectRoot = createTempDir('install-lifecycle-project-');

    try {
      const targetRoot = path.join(projectRoot, '.cursor');
      const statePath = path.join(targetRoot, 'ecc-install-state.json');
      const sourcePath = path.join(REPO_ROOT, '.cursor', 'hooks.json');
      const destinationPath = path.join(targetRoot, 'hooks.json');
      fs.mkdirSync(path.dirname(destinationPath), { recursive: true });
      fs.writeFileSync(destinationPath, '{"drifted":true}\n');

      writeState(statePath, {
        adapter: { id: 'cursor-project', target: 'cursor', kind: 'project' },
        targetRoot,
        installStatePath: statePath,
        request: {
          profile: null,
          modules: ['platform-configs'],
          legacyLanguages: [],
          legacyMode: false,
        },
        resolution: {
          selectedModules: ['platform-configs'],
          skippedModules: [],
        },
        operations: [
          {
            kind: 'copy-file',
            moduleId: 'platform-configs',
            sourcePath,
            sourceRelativePath: '.cursor/hooks.json',
            destinationPath,
            strategy: 'sync-root-children',
            ownership: 'managed',
            scaffoldOnly: false,
          },
        ],
        source: {
          repoVersion: CURRENT_PACKAGE_VERSION,
          repoCommit: 'abc123',
          manifestVersion: CURRENT_MANIFEST_VERSION,
        },
      });

      const report = buildDoctorReport({
        repoRoot: REPO_ROOT,
        homeDir,
        projectRoot,
        targets: ['cursor'],
      });

      assert.strictEqual(report.results.length, 1);
      assert.strictEqual(report.results[0].status, 'warning');
      assert.ok(report.results[0].issues.some(issue => issue.code === 'drifted-managed-files'));
    } finally {
      cleanup(homeDir);
      cleanup(projectRoot);
    }
  })) passed++; else failed++;

  if (test('doctor reports manifest resolution drift for non-legacy installs', () => {
    const homeDir = createTempDir('install-lifecycle-home-');
    const projectRoot = createTempDir('install-lifecycle-project-');

    try {
      const targetRoot = path.join(projectRoot, '.cursor');
      const statePath = path.join(targetRoot, 'ecc-install-state.json');
      fs.mkdirSync(targetRoot, { recursive: true });

      writeState(statePath, {
        adapter: { id: 'cursor-project', target: 'cursor', kind: 'project' },
        targetRoot,
        installStatePath: statePath,
        request: {
          profile: 'core',
          modules: [],
          legacyLanguages: [],
          legacyMode: false,
        },
        resolution: {
          selectedModules: ['rules-core'],
          skippedModules: [],
        },
        operations: [],
        source: {
          repoVersion: CURRENT_PACKAGE_VERSION,
          repoCommit: 'abc123',
          manifestVersion: CURRENT_MANIFEST_VERSION,
        },
      });

      const report = buildDoctorReport({
        repoRoot: REPO_ROOT,
        homeDir,
        projectRoot,
        targets: ['cursor'],
      });

      assert.strictEqual(report.results.length, 1);
      assert.strictEqual(report.results[0].status, 'warning');
      assert.ok(report.results[0].issues.some(issue => issue.code === 'resolution-drift'));
    } finally {
      cleanup(homeDir);
      cleanup(projectRoot);
    }
  })) passed++; else failed++;

  if (test('doctor reports target mismatches, version drift, and unverified operations as warnings', () => {
    const homeDir = createTempDir('install-lifecycle-home-');
    const projectRoot = createTempDir('install-lifecycle-project-');

    try {
      const recordedTargetRoot = path.join(projectRoot, '.cursor-recorded');
      const actualTargetRoot = path.join(projectRoot, '.cursor');
      const statePath = path.join(actualTargetRoot, 'ecc-install-state.json');
      const altStatePath = path.join(recordedTargetRoot, 'ecc-install-state.json');
      const destinationPath = path.join(recordedTargetRoot, 'plugin.json');
      fs.mkdirSync(actualTargetRoot, { recursive: true });
      fs.mkdirSync(recordedTargetRoot, { recursive: true });
      fs.writeFileSync(destinationPath, '{"existing":true}\n');

      writeState(statePath, {
        adapter: { id: 'cursor-project', target: 'cursor', kind: 'project' },
        targetRoot: recordedTargetRoot,
        installStatePath: altStatePath,
        request: {
          profile: null,
          modules: [],
          legacyLanguages: ['typescript'],
          legacyMode: true,
        },
        resolution: {
          selectedModules: ['legacy-cursor-install'],
          skippedModules: [],
        },
        operations: [
          {
            kind: 'render-template',
            moduleId: 'platform-configs',
            sourceRelativePath: '.cursor/plugin.json.template',
            destinationPath,
            strategy: 'render-template',
            ownership: 'managed',
            scaffoldOnly: false,
          },
        ],
        source: {
          repoVersion: '0.0.1',
          repoCommit: 'abc123',
          manifestVersion: CURRENT_MANIFEST_VERSION + 1,
        },
      });

      const report = buildDoctorReport({
        repoRoot: REPO_ROOT,
        homeDir,
        projectRoot,
        targets: ['cursor'],
      });

      const issueCodes = report.results[0].issues.map(issue => issue.code);
      assert.strictEqual(report.results[0].status, 'warning');
      assert.ok(issueCodes.includes('target-root-mismatch'));
      assert.ok(issueCodes.includes('install-state-path-mismatch'));
      assert.ok(issueCodes.includes('manifest-version-mismatch'));
      assert.ok(issueCodes.includes('repo-version-mismatch'));
      assert.ok(issueCodes.includes('unverified-managed-operations'));
    } finally {
      cleanup(homeDir);
      cleanup(projectRoot);
    }
  })) passed++; else failed++;

  if (test('doctor reports missing target roots and missing source files as errors', () => {
    const homeDir = createTempDir('install-lifecycle-home-');
    const projectRoot = createTempDir('install-lifecycle-project-');

    try {
      const actualTargetRoot = path.join(projectRoot, '.cursor');
      const recordedTargetRoot = path.join(projectRoot, '.cursor-missing');
      const statePath = path.join(actualTargetRoot, 'ecc-install-state.json');
      const destinationPath = path.join(actualTargetRoot, 'missing-source.txt');
      fs.mkdirSync(actualTargetRoot, { recursive: true });
      fs.writeFileSync(destinationPath, 'present but drifted');

      writeState(statePath, {
        adapter: { id: 'cursor-project', target: 'cursor', kind: 'project' },
        targetRoot: recordedTargetRoot,
        installStatePath: statePath,
        request: {
          profile: null,
          modules: [],
          legacyLanguages: ['typescript'],
          legacyMode: true,
        },
        resolution: {
          selectedModules: ['legacy-cursor-install'],
          skippedModules: [],
        },
        operations: [
          {
            kind: 'copy-file',
            moduleId: 'platform-configs',
            sourceRelativePath: 'not-real/source.txt',
            destinationPath,
            strategy: 'sync-root-children',
            ownership: 'managed',
            scaffoldOnly: false,
          },
        ],
        source: {
          repoVersion: CURRENT_PACKAGE_VERSION,
          repoCommit: 'abc123',
          manifestVersion: CURRENT_MANIFEST_VERSION,
        },
      });

      const report = buildDoctorReport({
        repoRoot: REPO_ROOT,
        homeDir,
        projectRoot,
        targets: ['cursor'],
      });

      const issueCodes = report.results[0].issues.map(issue => issue.code);
      assert.strictEqual(report.results[0].status, 'error');
      assert.ok(issueCodes.includes('missing-target-root'));
      assert.ok(issueCodes.includes('missing-source-files'));
    } finally {
      cleanup(homeDir);
      cleanup(projectRoot);
    }
  })) passed++; else failed++;

  if (test('repair restores render-template outputs from recorded rendered content', () => {
    const homeDir = createTempDir('install-lifecycle-home-');
    const projectRoot = createTempDir('install-lifecycle-project-');

    try {
      const targetRoot = path.join(homeDir, '.claude');
      const statePath = path.join(targetRoot, 'ecc', 'install-state.json');
      const destinationPath = path.join(targetRoot, 'plugin.json');
      fs.mkdirSync(path.dirname(destinationPath), { recursive: true });
      fs.writeFileSync(destinationPath, '{"drifted":true}\n');

      writeState(statePath, {
        adapter: { id: 'claude-home', target: 'claude', kind: 'home' },
        targetRoot,
        installStatePath: statePath,
        request: {
          profile: null,
          modules: [],
          legacyLanguages: ['typescript'],
          legacyMode: true,
        },
        resolution: {
          selectedModules: ['legacy-claude-rules'],
          skippedModules: [],
        },
        operations: [
          {
            kind: 'render-template',
            moduleId: 'platform-configs',
            sourceRelativePath: '.claude-plugin/plugin.json.template',
            destinationPath,
            strategy: 'render-template',
            ownership: 'managed',
            scaffoldOnly: false,
            renderedContent: '{"ok":true}\n',
          },
        ],
        source: {
          repoVersion: CURRENT_PACKAGE_VERSION,
          repoCommit: 'abc123',
          manifestVersion: CURRENT_MANIFEST_VERSION,
        },
      });

      const result = repairInstalledStates({
        repoRoot: REPO_ROOT,
        homeDir,
        projectRoot,
        targets: ['claude'],
      });

      assert.strictEqual(result.results[0].status, 'repaired');
      assert.strictEqual(fs.readFileSync(destinationPath, 'utf8'), '{"ok":true}\n');
    } finally {
      cleanup(homeDir);
      cleanup(projectRoot);
    }
  })) passed++; else failed++;

  if (test('repair reapplies merge-json operations without clobbering unrelated keys', () => {
    const homeDir = createTempDir('install-lifecycle-home-');
    const projectRoot = createTempDir('install-lifecycle-project-');

    try {
      const targetRoot = path.join(projectRoot, '.cursor');
      const statePath = path.join(targetRoot, 'ecc-install-state.json');
      const destinationPath = path.join(targetRoot, 'hooks.json');
      fs.mkdirSync(path.dirname(destinationPath), { recursive: true });
      fs.writeFileSync(destinationPath, JSON.stringify({
        existing: true,
        nested: {
          enabled: false,
        },
      }, null, 2));

      writeState(statePath, {
        adapter: { id: 'cursor-project', target: 'cursor', kind: 'project' },
        targetRoot,
        installStatePath: statePath,
        request: {
          profile: null,
          modules: [],
          legacyLanguages: ['typescript'],
          legacyMode: true,
        },
        resolution: {
          selectedModules: ['legacy-cursor-install'],
          skippedModules: [],
        },
        operations: [
          {
            kind: 'merge-json',
            moduleId: 'platform-configs',
            sourceRelativePath: '.cursor/hooks.json',
            destinationPath,
            strategy: 'merge-json',
            ownership: 'managed',
            scaffoldOnly: false,
            mergePayload: {
              nested: {
                enabled: true,
              },
              managed: 'yes',
            },
          },
        ],
        source: {
          repoVersion: CURRENT_PACKAGE_VERSION,
          repoCommit: 'abc123',
          manifestVersion: CURRENT_MANIFEST_VERSION,
        },
      });

      const result = repairInstalledStates({
        repoRoot: REPO_ROOT,
        homeDir,
        projectRoot,
        targets: ['cursor'],
      });

      assert.strictEqual(result.results[0].status, 'repaired');
      assert.deepStrictEqual(JSON.parse(fs.readFileSync(destinationPath, 'utf8')), {
        existing: true,
        nested: {
          enabled: true,
        },
        managed: 'yes',
      });
    } finally {
      cleanup(homeDir);
      cleanup(projectRoot);
    }
  })) passed++; else failed++;

  if (test('repair re-applies managed remove operations when files reappear', () => {
    const homeDir = createTempDir('install-lifecycle-home-');
    const projectRoot = createTempDir('install-lifecycle-project-');

    try {
      const targetRoot = path.join(projectRoot, '.cursor');
      const statePath = path.join(targetRoot, 'ecc-install-state.json');
      const destinationPath = path.join(targetRoot, 'legacy-note.txt');
      fs.mkdirSync(path.dirname(destinationPath), { recursive: true });
      fs.writeFileSync(destinationPath, 'stale');

      writeState(statePath, {
        adapter: { id: 'cursor-project', target: 'cursor', kind: 'project' },
        targetRoot,
        installStatePath: statePath,
        request: {
          profile: null,
          modules: [],
          legacyLanguages: ['typescript'],
          legacyMode: true,
        },
        resolution: {
          selectedModules: ['legacy-cursor-install'],
          skippedModules: [],
        },
        operations: [
          {
            kind: 'remove',
            moduleId: 'platform-configs',
            sourceRelativePath: '.cursor/legacy-note.txt',
            destinationPath,
            strategy: 'remove',
            ownership: 'managed',
            scaffoldOnly: false,
          },
        ],
        source: {
          repoVersion: CURRENT_PACKAGE_VERSION,
          repoCommit: 'abc123',
          manifestVersion: CURRENT_MANIFEST_VERSION,
        },
      });

      const result = repairInstalledStates({
        repoRoot: REPO_ROOT,
        homeDir,
        projectRoot,
        targets: ['cursor'],
      });

      assert.strictEqual(result.results[0].status, 'repaired');
      assert.ok(!fs.existsSync(destinationPath));
    } finally {
      cleanup(homeDir);
      cleanup(projectRoot);
    }
  })) passed++; else failed++;

  if (test('repair supports dry-run planning and malformed install-state errors', () => {
    const homeDir = createTempDir('install-lifecycle-home-');
    const projectRoot = createTempDir('install-lifecycle-project-');

    try {
      const targetRoot = path.join(projectRoot, '.cursor');
      const statePath = path.join(targetRoot, 'ecc-install-state.json');
      const destinationPath = path.join(targetRoot, 'hooks.json');
      fs.mkdirSync(targetRoot, { recursive: true });
      fs.writeFileSync(destinationPath, '{"drifted":true}\n');

      writeState(statePath, {
        adapter: { id: 'cursor-project', target: 'cursor', kind: 'project' },
        targetRoot,
        installStatePath: statePath,
        request: {
          profile: null,
          modules: [],
          legacyLanguages: ['typescript'],
          legacyMode: true,
        },
        resolution: {
          selectedModules: ['legacy-cursor-install'],
          skippedModules: [],
        },
        operations: [
          {
            kind: 'render-template',
            moduleId: 'platform-configs',
            sourceRelativePath: '.cursor/hooks.json.template',
            destinationPath,
            strategy: 'render-template',
            ownership: 'managed',
            scaffoldOnly: false,
            renderedContent: '{"ok":true}\n',
          },
        ],
        source: {
          repoVersion: CURRENT_PACKAGE_VERSION,
          repoCommit: 'abc123',
          manifestVersion: CURRENT_MANIFEST_VERSION,
        },
      });

      const dryRun = repairInstalledStates({
        repoRoot: REPO_ROOT,
        homeDir,
        projectRoot,
        targets: ['cursor'],
        dryRun: true,
      });

      assert.strictEqual(dryRun.results[0].status, 'planned');
      assert.deepStrictEqual(dryRun.results[0].plannedRepairs, [destinationPath]);

      fs.writeFileSync(statePath, '{not-json', 'utf8');
      const malformed = repairInstalledStates({
        repoRoot: REPO_ROOT,
        homeDir,
        projectRoot,
        targets: ['cursor'],
      });

      assert.strictEqual(malformed.results[0].status, 'error');
      assert.match(malformed.results[0].error, /Unexpected token|JSON/);
    } finally {
      cleanup(homeDir);
      cleanup(projectRoot);
    }
  })) passed++; else failed++;

  if (test('repair returns an error when recorded copy-file sources are unavailable', () => {
    const homeDir = createTempDir('install-lifecycle-home-');
    const projectRoot = createTempDir('install-lifecycle-project-');

    try {
      const targetRoot = path.join(projectRoot, '.cursor');
      const statePath = path.join(targetRoot, 'ecc-install-state.json');
      const destinationPath = path.join(targetRoot, 'hooks.json');
      fs.mkdirSync(targetRoot, { recursive: true });

      writeState(statePath, {
        adapter: { id: 'cursor-project', target: 'cursor', kind: 'project' },
        targetRoot,
        installStatePath: statePath,
        request: {
          profile: null,
          modules: [],
          legacyLanguages: ['typescript'],
          legacyMode: true,
        },
        resolution: {
          selectedModules: ['legacy-cursor-install'],
          skippedModules: [],
        },
        operations: [
          {
            kind: 'copy-file',
            moduleId: 'platform-configs',
            sourceRelativePath: 'does/not/exist.json',
            destinationPath,
            strategy: 'sync-root-children',
            ownership: 'managed',
            scaffoldOnly: false,
          },
        ],
        source: {
          repoVersion: CURRENT_PACKAGE_VERSION,
          repoCommit: 'abc123',
          manifestVersion: CURRENT_MANIFEST_VERSION,
        },
      });

      const result = repairInstalledStates({
        repoRoot: REPO_ROOT,
        homeDir,
        projectRoot,
        targets: ['cursor'],
      });

      assert.strictEqual(result.results[0].status, 'error');
      assert.match(result.results[0].error, /Missing source file/);
    } finally {
      cleanup(homeDir);
      cleanup(projectRoot);
    }
  })) passed++; else failed++;

  if (test('uninstall restores JSON merged files from recorded previous content', () => {
    const homeDir = createTempDir('install-lifecycle-home-');
    const projectRoot = createTempDir('install-lifecycle-project-');

    try {
      const targetRoot = path.join(projectRoot, '.cursor');
      const statePath = path.join(targetRoot, 'ecc-install-state.json');
      const destinationPath = path.join(targetRoot, 'hooks.json');
      fs.mkdirSync(path.dirname(destinationPath), { recursive: true });
      fs.writeFileSync(destinationPath, JSON.stringify({
        existing: true,
        managed: true,
      }, null, 2));

      writeState(statePath, {
        adapter: { id: 'cursor-project', target: 'cursor', kind: 'project' },
        targetRoot,
        installStatePath: statePath,
        request: {
          profile: null,
          modules: [],
          legacyLanguages: ['typescript'],
          legacyMode: true,
        },
        resolution: {
          selectedModules: ['legacy-cursor-install'],
          skippedModules: [],
        },
        operations: [
          {
            kind: 'merge-json',
            moduleId: 'platform-configs',
            sourceRelativePath: '.cursor/hooks.json',
            destinationPath,
            strategy: 'merge-json',
            ownership: 'managed',
            scaffoldOnly: false,
            mergePayload: {
              managed: true,
            },
            previousContent: JSON.stringify({
              existing: true,
            }, null, 2),
          },
        ],
        source: {
          repoVersion: CURRENT_PACKAGE_VERSION,
          repoCommit: 'abc123',
          manifestVersion: CURRENT_MANIFEST_VERSION,
        },
      });

      const result = uninstallInstalledStates({
        homeDir,
        projectRoot,
        targets: ['cursor'],
      });

      assert.strictEqual(result.results[0].status, 'uninstalled');
      assert.deepStrictEqual(JSON.parse(fs.readFileSync(destinationPath, 'utf8')), {
        existing: true,
      });
      assert.ok(!fs.existsSync(statePath));
    } finally {
      cleanup(homeDir);
      cleanup(projectRoot);
    }
  })) passed++; else failed++;

  if (test('uninstall restores rendered template files from recorded previous content', () => {
    const tempDir = createTempDir('install-lifecycle-');

    try {
      const targetRoot = path.join(tempDir, '.claude');
      const statePath = path.join(targetRoot, 'ecc', 'install-state.json');
      const destinationPath = path.join(targetRoot, 'plugin.json');
      fs.mkdirSync(path.dirname(destinationPath), { recursive: true });
      fs.writeFileSync(destinationPath, '{"generated":true}\n');

      writeInstallState(statePath, createInstallState({
        adapter: { id: 'claude-home', target: 'claude', kind: 'home' },
        targetRoot,
        installStatePath: statePath,
        request: {
          profile: 'core',
          modules: ['platform-configs'],
          includeComponents: [],
          excludeComponents: [],
          legacyLanguages: [],
          legacyMode: false,
        },
        resolution: {
          selectedModules: ['platform-configs'],
          skippedModules: [],
        },
        source: {
          repoVersion: '1.8.0',
          repoCommit: 'abc123',
          manifestVersion: 1,
        },
        operations: [
          {
            kind: 'render-template',
            moduleId: 'platform-configs',
            sourceRelativePath: '.claude/plugin.json.template',
            destinationPath,
            strategy: 'render-template',
            ownership: 'managed',
            scaffoldOnly: false,
            renderedContent: '{"generated":true}\n',
            previousContent: '{"existing":true}\n',
          },
        ],
      }));

      const result = uninstallInstalledStates({
        homeDir: tempDir,
        projectRoot: tempDir,
        targets: ['claude'],
      });

      assert.strictEqual(result.summary.uninstalledCount, 1);
      assert.strictEqual(fs.readFileSync(destinationPath, 'utf8'), '{"existing":true}\n');
      assert.ok(!fs.existsSync(statePath));
    } finally {
      cleanup(tempDir);
    }
  })) passed++; else failed++;

  if (test('uninstall restores files removed during install when previous content is recorded', () => {
    const homeDir = createTempDir('install-lifecycle-home-');
    const projectRoot = createTempDir('install-lifecycle-project-');

    try {
      const targetRoot = path.join(projectRoot, '.cursor');
      const statePath = path.join(targetRoot, 'ecc-install-state.json');
      const destinationPath = path.join(targetRoot, 'legacy-note.txt');
      fs.mkdirSync(targetRoot, { recursive: true });

      writeState(statePath, {
        adapter: { id: 'cursor-project', target: 'cursor', kind: 'project' },
        targetRoot,
        installStatePath: statePath,
        request: {
          profile: null,
          modules: [],
          legacyLanguages: ['typescript'],
          legacyMode: true,
        },
        resolution: {
          selectedModules: ['legacy-cursor-install'],
          skippedModules: [],
        },
        operations: [
          {
            kind: 'remove',
            moduleId: 'platform-configs',
            sourceRelativePath: '.cursor/legacy-note.txt',
            destinationPath,
            strategy: 'remove',
            ownership: 'managed',
            scaffoldOnly: false,
            previousContent: 'restore me\n',
          },
        ],
        source: {
          repoVersion: CURRENT_PACKAGE_VERSION,
          repoCommit: 'abc123',
          manifestVersion: CURRENT_MANIFEST_VERSION,
        },
      });

      const result = uninstallInstalledStates({
        homeDir,
        projectRoot,
        targets: ['cursor'],
      });

      assert.strictEqual(result.results[0].status, 'uninstalled');
      assert.strictEqual(fs.readFileSync(destinationPath, 'utf8'), 'restore me\n');
      assert.ok(!fs.existsSync(statePath));
    } finally {
      cleanup(homeDir);
      cleanup(projectRoot);
    }
  })) passed++; else failed++;

  if (test('uninstall supports dry-run planning and merge-json subset removal', () => {
    const homeDir = createTempDir('install-lifecycle-home-');
    const projectRoot = createTempDir('install-lifecycle-project-');

    try {
      const targetRoot = path.join(projectRoot, '.cursor');
      const statePath = path.join(targetRoot, 'ecc-install-state.json');
      const destinationPath = path.join(targetRoot, 'hooks.json');
      fs.mkdirSync(targetRoot, { recursive: true });
      fs.writeFileSync(destinationPath, JSON.stringify({ managed: true }, null, 2));

      writeState(statePath, {
        adapter: { id: 'cursor-project', target: 'cursor', kind: 'project' },
        targetRoot,
        installStatePath: statePath,
        request: {
          profile: null,
          modules: [],
          legacyLanguages: ['typescript'],
          legacyMode: true,
        },
        resolution: {
          selectedModules: ['legacy-cursor-install'],
          skippedModules: [],
        },
        operations: [
          {
            kind: 'merge-json',
            moduleId: 'platform-configs',
            sourceRelativePath: '.cursor/hooks.json',
            destinationPath,
            strategy: 'merge-json',
            ownership: 'managed',
            scaffoldOnly: false,
            mergePayload: { managed: true },
          },
        ],
        source: {
          repoVersion: CURRENT_PACKAGE_VERSION,
          repoCommit: 'abc123',
          manifestVersion: CURRENT_MANIFEST_VERSION,
        },
      });

      const dryRun = uninstallInstalledStates({
        homeDir,
        projectRoot,
        targets: ['cursor'],
        dryRun: true,
      });
      assert.strictEqual(dryRun.results[0].status, 'planned');
      assert.ok(dryRun.results[0].plannedRemovals.includes(destinationPath));

      const result = uninstallInstalledStates({
        homeDir,
        projectRoot,
        targets: ['cursor'],
      });
      assert.strictEqual(result.results[0].status, 'uninstalled');
      assert.ok(!fs.existsSync(destinationPath));
      assert.ok(!fs.existsSync(statePath));
    } finally {
      cleanup(homeDir);
      cleanup(projectRoot);
    }
  })) passed++; else failed++;

  if (test('uninstall returns an error for unsupported managed operation kinds', () => {
    const homeDir = createTempDir('install-lifecycle-home-');
    const projectRoot = createTempDir('install-lifecycle-project-');

    try {
      const targetRoot = path.join(projectRoot, '.cursor');
      const statePath = path.join(targetRoot, 'ecc-install-state.json');
      fs.mkdirSync(targetRoot, { recursive: true });

      writeState(statePath, {
        adapter: { id: 'cursor-project', target: 'cursor', kind: 'project' },
        targetRoot,
        installStatePath: statePath,
        request: {
          profile: null,
          modules: [],
          legacyLanguages: ['typescript'],
          legacyMode: true,
        },
        resolution: {
          selectedModules: ['legacy-cursor-install'],
          skippedModules: [],
        },
        operations: [
          {
            kind: 'mystery-kind',
            moduleId: 'platform-configs',
            sourceRelativePath: '.cursor/mystery.txt',
            destinationPath: path.join(targetRoot, 'mystery.txt'),
            strategy: 'mystery',
            ownership: 'managed',
            scaffoldOnly: false,
          },
        ],
        source: {
          repoVersion: CURRENT_PACKAGE_VERSION,
          repoCommit: 'abc123',
          manifestVersion: CURRENT_MANIFEST_VERSION,
        },
      });

      const result = uninstallInstalledStates({
        homeDir,
        projectRoot,
        targets: ['cursor'],
      });

      assert.strictEqual(result.results[0].status, 'error');
      assert.match(result.results[0].error, /Unsupported uninstall operation kind: mystery-kind/);
    } finally {
      cleanup(homeDir);
      cleanup(projectRoot);
    }
  })) passed++; else failed++;

  if (test('repair supports alternate template and payload keys plus unsupported kinds', () => {
    const homeDir = createTempDir('install-lifecycle-home-');
    const projectRoot = createTempDir('install-lifecycle-project-');

    try {
      const claudeRoot = path.join(homeDir, '.claude');
      const claudeStatePath = path.join(claudeRoot, 'ecc', 'install-state.json');
      const templatePath = path.join(claudeRoot, 'plugin.json');
      fs.mkdirSync(path.dirname(templatePath), { recursive: true });
      fs.writeFileSync(templatePath, '{"drifted":true}\n');

      writeState(claudeStatePath, {
        adapter: { id: 'claude-home', target: 'claude', kind: 'home' },
        targetRoot: claudeRoot,
        installStatePath: claudeStatePath,
        request: {
          profile: null,
          modules: [],
          legacyLanguages: ['typescript'],
          legacyMode: true,
        },
        resolution: {
          selectedModules: ['legacy-claude-rules'],
          skippedModules: [],
        },
        operations: [
          {
            kind: 'render-template',
            moduleId: 'platform-configs',
            sourceRelativePath: '.claude/plugin.json.template',
            destinationPath: templatePath,
            strategy: 'render-template',
            ownership: 'managed',
            scaffoldOnly: false,
            content: '{"ok":true}\n',
          },
        ],
        source: {
          repoVersion: CURRENT_PACKAGE_VERSION,
          repoCommit: 'abc123',
          manifestVersion: CURRENT_MANIFEST_VERSION,
        },
      });

      const repairedTemplate = repairInstalledStates({
        repoRoot: REPO_ROOT,
        homeDir,
        projectRoot,
        targets: ['claude'],
      });
      assert.strictEqual(repairedTemplate.results[0].status, 'repaired');
      assert.strictEqual(fs.readFileSync(templatePath, 'utf8'), '{"ok":true}\n');

      const cursorRoot = path.join(projectRoot, '.cursor');
      const cursorStatePath = path.join(cursorRoot, 'ecc-install-state.json');
      const jsonPath = path.join(cursorRoot, 'hooks.json');
      fs.mkdirSync(cursorRoot, { recursive: true });
      fs.writeFileSync(jsonPath, JSON.stringify({ existing: true }, null, 2));

      writeState(cursorStatePath, {
        adapter: { id: 'cursor-project', target: 'cursor', kind: 'project' },
        targetRoot: cursorRoot,
        installStatePath: cursorStatePath,
        request: {
          profile: null,
          modules: [],
          legacyLanguages: ['typescript'],
          legacyMode: true,
        },
        resolution: {
          selectedModules: ['legacy-cursor-install'],
          skippedModules: [],
        },
        operations: [
          {
            kind: 'merge-json',
            moduleId: 'platform-configs',
            sourceRelativePath: '.cursor/hooks.json',
            destinationPath: jsonPath,
            strategy: 'merge-json',
            ownership: 'managed',
            scaffoldOnly: false,
            payload: '{"managed":true}',
          },
        ],
        source: {
          repoVersion: CURRENT_PACKAGE_VERSION,
          repoCommit: 'abc123',
          manifestVersion: CURRENT_MANIFEST_VERSION,
        },
      });

      const repairedJson = repairInstalledStates({
        repoRoot: REPO_ROOT,
        homeDir,
        projectRoot,
        targets: ['cursor'],
      });
      assert.strictEqual(repairedJson.results[0].status, 'repaired');
      assert.deepStrictEqual(JSON.parse(fs.readFileSync(jsonPath, 'utf8')), {
        existing: true,
        managed: true,
      });

      writeState(cursorStatePath, {
        adapter: { id: 'cursor-project', target: 'cursor', kind: 'project' },
        targetRoot: cursorRoot,
        installStatePath: cursorStatePath,
        request: {
          profile: null,
          modules: [],
          legacyLanguages: ['typescript'],
          legacyMode: true,
        },
        resolution: {
          selectedModules: ['legacy-cursor-install'],
          skippedModules: [],
        },
        operations: [
          {
            kind: 'mystery-kind',
            moduleId: 'platform-configs',
            sourceRelativePath: '.cursor/mystery.txt',
            destinationPath: path.join(cursorRoot, 'mystery.txt'),
            strategy: 'mystery',
            ownership: 'managed',
            scaffoldOnly: false,
          },
        ],
        source: {
          repoVersion: CURRENT_PACKAGE_VERSION,
          repoCommit: 'abc123',
          manifestVersion: CURRENT_MANIFEST_VERSION,
        },
      });

      const unsupported = repairInstalledStates({
        repoRoot: REPO_ROOT,
        homeDir,
        projectRoot,
        targets: ['cursor'],
      });
      assert.strictEqual(unsupported.results[0].status, 'error');
      assert.match(unsupported.results[0].error, /Unsupported repair operation kind: mystery-kind/);
    } finally {
      cleanup(homeDir);
      cleanup(projectRoot);
    }
  })) passed++; else failed++;

  if (test('repair and uninstall support alternate previous-state keys and invalid payload errors', () => {
    const homeDir = createTempDir('install-lifecycle-home-');
    const projectRoot = createTempDir('install-lifecycle-project-');

    try {
      const cursorRoot = path.join(projectRoot, '.cursor');
      const statePath = path.join(cursorRoot, 'ecc-install-state.json');
      const renderedPath = path.join(cursorRoot, 'generated.md');
      const jsonPath = path.join(cursorRoot, 'hooks.json');
      fs.mkdirSync(cursorRoot, { recursive: true });
      fs.writeFileSync(renderedPath, '# generated\n');
      fs.writeFileSync(jsonPath, JSON.stringify({ managed: true }, null, 2));

      writeState(statePath, {
        adapter: { id: 'cursor-project', target: 'cursor', kind: 'project' },
        targetRoot: cursorRoot,
        installStatePath: statePath,
        request: {
          profile: null,
          modules: [],
          legacyLanguages: ['typescript'],
          legacyMode: true,
        },
        resolution: {
          selectedModules: ['legacy-cursor-install'],
          skippedModules: [],
        },
        operations: [
          {
            kind: 'render-template',
            moduleId: 'platform-configs',
            sourceRelativePath: '.cursor/generated.md.template',
            destinationPath: renderedPath,
            strategy: 'render-template',
            ownership: 'managed',
            scaffoldOnly: false,
            renderedContent: '# generated\n',
            originalContent: '# original\n',
          },
          {
            kind: 'merge-json',
            moduleId: 'platform-configs',
            sourceRelativePath: '.cursor/hooks.json',
            destinationPath: jsonPath,
            strategy: 'merge-json',
            ownership: 'managed',
            scaffoldOnly: false,
            managedPayload: { managed: true },
            originalValue: { restored: true },
          },
        ],
        source: {
          repoVersion: CURRENT_PACKAGE_VERSION,
          repoCommit: 'abc123',
          manifestVersion: CURRENT_MANIFEST_VERSION,
        },
      });

      const uninstalled = uninstallInstalledStates({
        homeDir,
        projectRoot,
        targets: ['cursor'],
      });
      assert.strictEqual(uninstalled.results[0].status, 'uninstalled');
      assert.strictEqual(fs.readFileSync(renderedPath, 'utf8'), '# original\n');
      assert.deepStrictEqual(JSON.parse(fs.readFileSync(jsonPath, 'utf8')), { restored: true });

      fs.writeFileSync(jsonPath, JSON.stringify({ existing: true }, null, 2));
      writeState(statePath, {
        adapter: { id: 'cursor-project', target: 'cursor', kind: 'project' },
        targetRoot: cursorRoot,
        installStatePath: statePath,
        request: {
          profile: null,
          modules: [],
          legacyLanguages: ['typescript'],
          legacyMode: true,
        },
        resolution: {
          selectedModules: ['legacy-cursor-install'],
          skippedModules: [],
        },
        operations: [
          {
            kind: 'merge-json',
            moduleId: 'platform-configs',
            sourceRelativePath: '.cursor/hooks.json',
            destinationPath: jsonPath,
            strategy: 'merge-json',
            ownership: 'managed',
            scaffoldOnly: false,
            payload: '{not-json',
          },
        ],
        source: {
          repoVersion: CURRENT_PACKAGE_VERSION,
          repoCommit: 'abc123',
          manifestVersion: CURRENT_MANIFEST_VERSION,
        },
      });

      const errored = repairInstalledStates({
        repoRoot: REPO_ROOT,
        homeDir,
        projectRoot,
        targets: ['cursor'],
      });
      assert.strictEqual(errored.results[0].status, 'error');
      assert.match(errored.results[0].error, /Invalid merge-json.payload/);
    } finally {
      cleanup(homeDir);
      cleanup(projectRoot);
    }
  })) passed++; else failed++;

  if (test('repair refreshes healthy state previews and uninstall handles alternate previous JSON keys', () => {
    const homeDir = createTempDir('install-lifecycle-home-');
    const projectRoot = createTempDir('install-lifecycle-project-');

    try {
      const cursorRoot = path.join(projectRoot, '.cursor');
      const statePath = path.join(cursorRoot, 'ecc-install-state.json');
      const managedFile = path.join(cursorRoot, 'rules.md');
      fs.mkdirSync(cursorRoot, { recursive: true });
      fs.writeFileSync(managedFile, fs.readFileSync(path.join(REPO_ROOT, 'rules', 'common', 'coding-style.md'), 'utf8'));

      const initialState = writeState(statePath, {
        adapter: { id: 'cursor-project', target: 'cursor', kind: 'project' },
        targetRoot: cursorRoot,
        installStatePath: statePath,
        request: {
          profile: null,
          modules: [],
          legacyLanguages: ['typescript'],
          legacyMode: true,
        },
        resolution: {
          selectedModules: ['legacy-cursor-install'],
          skippedModules: [],
        },
        operations: [
          {
            kind: 'copy-file',
            moduleId: 'platform-configs',
            sourceRelativePath: 'rules/common/coding-style.md',
            destinationPath: managedFile,
            strategy: 'preserve-relative-path',
            ownership: 'managed',
            scaffoldOnly: false,
          },
        ],
        source: {
          repoVersion: CURRENT_PACKAGE_VERSION,
          repoCommit: 'abc123',
          manifestVersion: CURRENT_MANIFEST_VERSION,
        },
      });

      const repairResult = repairInstalledStates({
        repoRoot: REPO_ROOT,
        homeDir,
        projectRoot,
        targets: ['cursor'],
      });

      assert.strictEqual(repairResult.results[0].status, 'ok');
      assert.strictEqual(repairResult.results[0].stateRefreshed, true);
      const refreshedState = JSON.parse(fs.readFileSync(statePath, 'utf8'));
      assert.strictEqual(refreshedState.installedAt, initialState.installedAt);
      assert.ok(refreshedState.lastValidatedAt);

      fs.writeFileSync(statePath, JSON.stringify(createInstallState({
        adapter: { id: 'cursor-project', target: 'cursor', kind: 'project' },
        targetRoot: cursorRoot,
        installStatePath: statePath,
        request: {
          profile: null,
          modules: [],
          legacyLanguages: ['typescript'],
          legacyMode: true,
        },
        resolution: {
          selectedModules: ['legacy-cursor-install'],
          skippedModules: [],
        },
        operations: [
          {
            kind: 'render-template',
            moduleId: 'platform-configs',
            sourceRelativePath: '.cursor/generated.json.template',
            destinationPath: managedFile,
            strategy: 'render-template',
            ownership: 'managed',
            scaffoldOnly: false,
            renderedContent: '{"managed":true}\n',
            previousJson: { restored: true },
          },
        ],
        source: {
          repoVersion: CURRENT_PACKAGE_VERSION,
          repoCommit: 'abc123',
          manifestVersion: CURRENT_MANIFEST_VERSION,
        },
      }), null, 2));
      fs.writeFileSync(managedFile, '{"managed":true}\n');

      const uninstallResult = uninstallInstalledStates({
        homeDir,
        projectRoot,
        targets: ['cursor'],
      });

      assert.strictEqual(uninstallResult.results[0].status, 'uninstalled');
      assert.deepStrictEqual(JSON.parse(fs.readFileSync(managedFile, 'utf8')), { restored: true });
    } finally {
      cleanup(homeDir);
      cleanup(projectRoot);
    }
  })) passed++; else failed++;

  console.log(`\nResults: Passed: ${passed}, Failed: ${failed}`);
  process.exit(failed > 0 ? 1 : 0);
}

runTests();
