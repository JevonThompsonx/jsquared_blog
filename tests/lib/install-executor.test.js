/**
 * Direct tests for scripts/lib/install-executor.js
 */

'use strict';

const assert = require('assert');
const fs = require('fs');
const os = require('os');
const path = require('path');

const {
  createLegacyInstallPlan,
  createManifestInstallPlan,
  listAvailableLanguages,
} = require('../../scripts/lib/install-executor');

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

function ensureFile(filePath, content = '') {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, content, 'utf8');
}

function createTempRoot(prefix) {
  return fs.mkdtempSync(path.join(os.tmpdir(), prefix));
}

function runTests() {
  console.log('\n=== Testing install-executor ===\n');

  let passed = 0;
  let failed = 0;

  if (test('listAvailableLanguages merges legacy aliases with repo rule directories', () => {
    const sourceRoot = createTempRoot('install-executor-languages-');

    try {
      fs.mkdirSync(path.join(sourceRoot, 'rules', 'common'), { recursive: true });
      fs.mkdirSync(path.join(sourceRoot, 'rules', 'customlang'), { recursive: true });
      fs.mkdirSync(path.join(sourceRoot, 'rules', 'python'), { recursive: true });

      const languages = listAvailableLanguages(sourceRoot);

      assert.ok(languages.includes('customlang'));
      assert.ok(languages.includes('python'));
      assert.ok(languages.includes('javascript'));
      assert.ok(!languages.includes('common'));
    } finally {
      fs.rmSync(sourceRoot, { recursive: true, force: true });
    }
  })) passed++; else failed++;

  if (test('createLegacyInstallPlan rejects unsupported targets', () => {
    assert.throws(
      () => createLegacyInstallPlan({ target: 'bogus-target' }),
      /Unknown install target: bogus-target/
    );
  })) passed++; else failed++;

  if (test('createLegacyInstallPlan builds Claude legacy operations and warnings', () => {
    const sourceRoot = createTempRoot('install-executor-claude-source-');
    const homeDir = createTempRoot('install-executor-claude-home-');
    const claudeRulesDir = path.join(homeDir, '.claude', 'rules');

    try {
      ensureFile(path.join(sourceRoot, 'rules', 'common', 'baseline.md'), '# Common rule');
      ensureFile(path.join(sourceRoot, 'rules', 'typescript', 'strict.md'), '# TS rule');
      ensureFile(path.join(claudeRulesDir, 'existing.md'), 'preexisting');

      const plan = createLegacyInstallPlan({
        sourceRoot,
        homeDir,
        target: 'claude',
        claudeRulesDir,
        languages: ['typescript', 'missing', 'bad*lang'],
      });

      assert.strictEqual(plan.mode, 'legacy');
      assert.strictEqual(plan.target, 'claude');
      assert.ok(plan.warnings.some(warning => warning.includes('already exists')));
      assert.ok(plan.warnings.some(warning => warning.includes("Invalid language name 'bad*lang'")));
      assert.ok(plan.warnings.some(warning => warning.includes('rules/missing/ does not exist')));
      assert.ok(plan.operations.some(operation => operation.sourceRelativePath === path.join('rules', 'common', 'baseline.md')));
      assert.ok(plan.operations.some(operation => operation.sourceRelativePath === path.join('rules', 'typescript', 'strict.md')));
      assert.deepStrictEqual(plan.statePreview.request.legacyLanguages, ['typescript', 'missing', 'bad*lang']);
    } finally {
      fs.rmSync(sourceRoot, { recursive: true, force: true });
      fs.rmSync(homeDir, { recursive: true, force: true });
    }
  })) passed++; else failed++;

  if (test('createLegacyInstallPlan builds Cursor legacy operations across rules assets and configs', () => {
    const sourceRoot = createTempRoot('install-executor-cursor-source-');
    const projectRoot = createTempRoot('install-executor-cursor-project-');

    try {
      ensureFile(path.join(sourceRoot, '.cursor', 'rules', 'common-base.md'), '# Common');
      ensureFile(path.join(sourceRoot, '.cursor', 'rules', 'typescript-guide.md'), '# TS');
      ensureFile(path.join(sourceRoot, '.cursor', 'agents', 'planner.md'), '# Planner');
      ensureFile(path.join(sourceRoot, '.cursor', 'skills', 'demo', 'SKILL.md'), '# Skill');
      ensureFile(path.join(sourceRoot, '.cursor', 'commands', 'plan.md'), '# Command');
      ensureFile(path.join(sourceRoot, '.cursor', 'hooks', 'hook.js'), 'module.exports = {};');
      ensureFile(path.join(sourceRoot, '.cursor', 'hooks.json'), '{}');
      ensureFile(path.join(sourceRoot, '.cursor', 'mcp.json'), '{}');

      const plan = createLegacyInstallPlan({
        sourceRoot,
        projectRoot,
        target: 'cursor',
        languages: ['typescript', 'missing'],
      });

      assert.strictEqual(plan.target, 'cursor');
      assert.ok(plan.warnings.some(warning => warning.includes("No Cursor rules for 'missing' found")));
      assert.ok(plan.operations.some(operation => operation.destinationPath.endsWith(path.join('.cursor', 'rules', 'common-base.md'))));
      assert.ok(plan.operations.some(operation => operation.destinationPath.endsWith(path.join('.cursor', 'rules', 'typescript-guide.md'))));
      assert.ok(plan.operations.some(operation => operation.destinationPath.endsWith(path.join('.cursor', 'agents', 'planner.md'))));
      assert.ok(plan.operations.some(operation => operation.destinationPath.endsWith(path.join('.cursor', 'skills', 'demo', 'SKILL.md'))));
      assert.ok(plan.operations.some(operation => operation.destinationPath.endsWith(path.join('.cursor', 'commands', 'plan.md'))));
      assert.ok(plan.operations.some(operation => operation.destinationPath.endsWith(path.join('.cursor', 'hooks.json'))));
      assert.ok(plan.operations.some(operation => operation.destinationPath.endsWith(path.join('.cursor', 'mcp.json'))));
    } finally {
      fs.rmSync(sourceRoot, { recursive: true, force: true });
      fs.rmSync(projectRoot, { recursive: true, force: true });
    }
  })) passed++; else failed++;

  if (test('createLegacyInstallPlan builds Antigravity legacy operations and renames flat rules', () => {
    const sourceRoot = createTempRoot('install-executor-antigravity-source-');
    const projectRoot = createTempRoot('install-executor-antigravity-project-');
    const targetRulesDir = path.join(projectRoot, '.agent', 'rules');

    try {
      ensureFile(path.join(sourceRoot, 'rules', 'common', 'baseline.md'), '# Common');
      ensureFile(path.join(sourceRoot, 'rules', 'typescript', 'strict.md'), '# TS');
      ensureFile(path.join(sourceRoot, 'commands', 'plan.md'), '# Workflow');
      ensureFile(path.join(sourceRoot, 'agents', 'planner.md'), '# Agent');
      ensureFile(path.join(sourceRoot, 'skills', 'demo', 'SKILL.md'), '# Skill');
      ensureFile(path.join(targetRulesDir, 'existing.md'), 'preexisting');

      const plan = createLegacyInstallPlan({
        sourceRoot,
        projectRoot,
        target: 'antigravity',
        languages: ['typescript', 'missing'],
      });

      assert.strictEqual(plan.target, 'antigravity');
      assert.ok(plan.warnings.some(warning => warning.includes('already exists')));
      assert.ok(plan.warnings.some(warning => warning.includes('rules/missing/ does not exist')));
      assert.ok(plan.operations.some(operation => operation.destinationPath.endsWith(path.join('.agent', 'rules', 'common-baseline.md'))));
      assert.ok(plan.operations.some(operation => operation.destinationPath.endsWith(path.join('.agent', 'rules', 'typescript-strict.md'))));
      assert.ok(plan.operations.some(operation => operation.destinationPath.endsWith(path.join('.agent', 'workflows', 'plan.md'))));
      assert.ok(plan.operations.some(operation => operation.destinationPath.endsWith(path.join('.agent', 'skills', 'planner.md'))));
      assert.ok(plan.operations.some(operation => operation.destinationPath.endsWith(path.join('.agent', 'skills', 'demo', 'SKILL.md'))));
    } finally {
      fs.rmSync(sourceRoot, { recursive: true, force: true });
      fs.rmSync(projectRoot, { recursive: true, force: true });
    }
  })) passed++; else failed++;

  if (test('createManifestInstallPlan materializes files and directories while excluding generated runtime state files', () => {
    const sourceRoot = createTempRoot('install-executor-manifest-source-');
    const projectRoot = createTempRoot('install-executor-manifest-project-');

    try {
      ensureFile(path.join(sourceRoot, 'package.json'), JSON.stringify({ version: '1.2.3' }, null, 2));
      ensureFile(path.join(sourceRoot, 'README.md'), '# Demo');
      ensureFile(path.join(sourceRoot, 'rules', 'common', 'baseline.md'), '# Common');
      ensureFile(path.join(sourceRoot, '.cursor', 'ecc-install-state.json'), '{"generated":true}');
      ensureFile(path.join(sourceRoot, '.cursor', 'ecc', 'install-state.json'), '{"generated":true}');

      ensureFile(path.join(sourceRoot, 'manifests', 'install-modules.json'), JSON.stringify({
        version: 7,
        modules: [{
          id: 'custom-module',
          kind: 'tooling',
          description: 'Demo module',
          targets: ['cursor'],
          defaultInstall: false,
          cost: 'low',
          stability: 'stable',
          dependencies: [],
          paths: ['README.md', 'rules', '.cursor/ecc-install-state.json', '.cursor/ecc/install-state.json'],
        }],
      }, null, 2));
      ensureFile(path.join(sourceRoot, 'manifests', 'install-profiles.json'), JSON.stringify({
        version: 3,
        profiles: {
          demo: {
            description: 'Demo profile',
            modules: ['custom-module'],
          },
        },
      }, null, 2));
      ensureFile(path.join(sourceRoot, 'manifests', 'install-components.json'), JSON.stringify({
        version: 1,
        components: [],
      }, null, 2));

      const plan = createManifestInstallPlan({
        sourceRoot,
        projectRoot,
        target: 'cursor',
        profileId: 'demo',
        moduleIds: [],
        includeComponentIds: [],
        excludeComponentIds: [],
      });

      assert.strictEqual(plan.mode, 'manifest');
      assert.strictEqual(plan.target, 'cursor');
      assert.strictEqual(plan.profileId, 'demo');
      assert.ok(plan.operations.some(operation => operation.sourceRelativePath === 'README.md'));
      assert.ok(
        plan.operations.some(operation => /baseline\.md$/.test(operation.sourceRelativePath)),
        `expected baseline rule operation, got: ${plan.operations.map(operation => operation.sourceRelativePath).join(', ')}`
      );
      assert.ok(!plan.operations.some(operation => /ecc[\\/]install-state\.json$/.test(operation.sourceRelativePath)));
      assert.strictEqual(plan.statePreview.request.profile, 'demo');
      assert.strictEqual(plan.statePreview.source.repoVersion, '1.2.3');
      assert.strictEqual(plan.statePreview.source.manifestVersion, 7);
    } finally {
      fs.rmSync(sourceRoot, { recursive: true, force: true });
      fs.rmSync(projectRoot, { recursive: true, force: true });
    }
  })) passed++; else failed++;

  console.log(`\nResults: Passed: ${passed}, Failed: ${failed}`);
  process.exit(failed > 0 ? 1 : 0);
}

runTests();
