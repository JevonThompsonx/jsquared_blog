/**
 * Tests the fallback validator path in scripts/lib/install-state.js
 * by loading the module without Ajv present.
 */

const assert = require('assert');
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

function loadInstallStateWithoutAjv() {
  const modulePath = require.resolve('../../scripts/lib/install-state');
  const originalLoad = Module._load;

  delete require.cache[modulePath];
  Module._load = function patchedLoad(request, parent, isMain) {
    if (request === 'ajv') {
      throw new Error('Ajv intentionally unavailable for fallback coverage');
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

function createValidState() {
  return {
    schemaVersion: 'ecc.install.v1',
    installedAt: '2026-04-09T00:00:00.000Z',
    lastValidatedAt: '2026-04-09T01:00:00.000Z',
    target: {
      id: 'cursor-project',
      target: 'cursor',
      kind: 'project',
      root: '/repo/.cursor',
      installStatePath: '/repo/.cursor/ecc-install-state.json',
    },
    request: {
      profile: null,
      modules: ['platform-configs'],
      includeComponents: ['component-a'],
      excludeComponents: [],
      legacyLanguages: ['typescript'],
      legacyMode: false,
    },
    resolution: {
      selectedModules: ['platform-configs'],
      skippedModules: [],
    },
    source: {
      repoVersion: '1.9.0',
      repoCommit: 'abc123',
      manifestVersion: 1,
    },
    operations: [{
      kind: 'copy-file',
      moduleId: 'platform-configs',
      sourceRelativePath: '.cursor/hooks.json',
      destinationPath: '/repo/.cursor/hooks.json',
      strategy: 'sync-root-children',
      ownership: 'managed',
      scaffoldOnly: false,
    }],
  };
}

function runTests() {
  console.log('\n=== Testing install-state.js fallback validator ===\n');

  let passed = 0;
  let failed = 0;

  if (test('fallback validator accepts a valid install-state payload', () => {
    const { validateInstallState } = loadInstallStateWithoutAjv();
    const result = validateInstallState(createValidState());

    assert.strictEqual(result.valid, true);
    assert.deepStrictEqual(result.errors, []);
  })) passed++; else failed++;

  if (test('fallback validator rejects non-object state payloads', () => {
    const { validateInstallState } = loadInstallStateWithoutAjv();
    const result = validateInstallState(null);

    assert.strictEqual(result.valid, false);
    assert.ok(result.errors.some(error => error.instancePath === '/' && error.message === 'must be object'));
  })) passed++; else failed++;

  if (test('fallback validator reports nested schema errors across target request source and operations', () => {
    const { validateInstallState } = loadInstallStateWithoutAjv();
    const state = createValidState();

    state.unexpected = true;
    state.lastValidatedAt = '';
    state.target.kind = 'invalid-kind';
    state.target.target = '';
    state.request.profile = undefined;
    state.request.modules = ['ok', ''];
    state.request.includeComponents = 'bad';
    state.request.legacyMode = 'nope';
    state.resolution.selectedModules = 'bad';
    state.source.repoVersion = '';
    state.source.manifestVersion = 0;
    state.operations = [{
      kind: '',
      moduleId: '',
      sourceRelativePath: '',
      destinationPath: '',
      strategy: '',
      ownership: '',
      scaffoldOnly: 'false',
    }];

    const result = validateInstallState(state);

    assert.strictEqual(result.valid, false);
    assert.ok(result.errors.some(error => error.instancePath === '/unexpected'));
    assert.ok(result.errors.some(error => error.instancePath === '/lastValidatedAt'));
    assert.ok(result.errors.some(error => error.instancePath === '/target/kind'));
    assert.ok(result.errors.some(error => error.instancePath === '/request/profile'));
    assert.ok(result.errors.some(error => error.instancePath === '/request/modules/1'));
    assert.ok(result.errors.some(error => error.instancePath === '/request/includeComponents'));
    assert.ok(result.errors.some(error => error.instancePath === '/resolution/selectedModules'));
    assert.ok(result.errors.some(error => error.instancePath === '/source/repoVersion'));
    assert.ok(result.errors.some(error => error.instancePath === '/source/manifestVersion'));
    assert.ok(result.errors.some(error => error.instancePath === '/operations/0/scaffoldOnly'));
  })) passed++; else failed++;

  console.log(`\nResults: Passed: ${passed}, Failed: ${failed}`);
  process.exit(failed > 0 ? 1 : 0);
}

runTests();
