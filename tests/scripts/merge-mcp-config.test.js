/**
 * Direct tests for scripts/codex/merge-mcp-config.js
 */

const assert = require('assert');

const {
  configDiffers,
  dlxServer,
  findSubSections,
  removeSectionFromText,
  removeServerFromText,
} = require('../../scripts/codex/merge-mcp-config.js');

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
  console.log('\n=== Testing merge-mcp-config.js ===\n');

  let passed = 0;
  let failed = 0;

  if (test('dlxServer builds command args and TOML consistently', () => {
    const server = dlxServer('playwright', '@playwright/mcp@latest', { startup_timeout_sec: 30 }, 'startup_timeout_sec = 30');
    assert.strictEqual(typeof server.fields.command, 'string');
    assert.ok(Array.isArray(server.fields.args));
    assert.ok(server.toml.includes('[mcp_servers.playwright]'));
    assert.ok(server.toml.includes('startup_timeout_sec = 30'));
  })) passed++; else failed++;

  if (test('configDiffers detects array and scalar drift', () => {
    assert.strictEqual(configDiffers({ command: 'npx', args: ['a'] }, { command: 'npx', args: ['a'] }), false);
    assert.strictEqual(configDiffers({ command: 'npx', args: ['a'] }, { command: 'bunx', args: ['a'] }), true);
    assert.strictEqual(configDiffers({ command: 'npx', args: ['a'] }, { command: 'npx', args: ['b'] }), true);
  })) passed++; else failed++;

  if (test('removeSectionFromText removes a single TOML section', () => {
    const raw = '[mcp_servers.github]\ncommand = "bash"\n\n[mcp_servers.exa]\nurl = "https://mcp.exa.ai/mcp"\n';
    const updated = removeSectionFromText(raw, '[mcp_servers.github]');
    assert.ok(!updated.includes('[mcp_servers.github]'));
    assert.ok(updated.includes('[mcp_servers.exa]'));
  })) passed++; else failed++;

  if (test('findSubSections discovers nested server subtables', () => {
    const found = findSubSections({ env: { TOKEN: 'x' }, nested: { child: { enabled: true } } }, 'github');
    assert.deepStrictEqual(found, ['github.env', 'github.nested', 'github.nested.child']);
  })) passed++; else failed++;

  if (test('removeServerFromText removes a server and all nested subtables', () => {
    const raw = [
      '[mcp_servers.github]',
      'command = "bash"',
      '',
      '[mcp_servers.github.env]',
      'TOKEN = "secret"',
      '',
      '[mcp_servers.exa]',
      'url = "https://mcp.exa.ai/mcp"',
      '',
    ].join('\n');

    const updated = removeServerFromText(raw, 'github', {
      github: {
        command: 'bash',
        env: { TOKEN: 'secret' },
      },
    });

    assert.ok(!updated.includes('[mcp_servers.github]'));
    assert.ok(!updated.includes('[mcp_servers.github.env]'));
    assert.ok(updated.includes('[mcp_servers.exa]'));
  })) passed++; else failed++;

  console.log(`\nResults: Passed: ${passed}, Failed: ${failed}`);
  process.exit(failed > 0 ? 1 : 0);
}

runTests();
