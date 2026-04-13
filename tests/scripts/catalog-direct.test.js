/**
 * Direct tests for scripts/ci/catalog.js helpers
 */

const assert = require('assert');

const {
  evaluateExpectations,
  formatExpectation,
  parseAgentsDocExpectations,
  parseReadmeExpectations,
  parseZhDocsReadmeExpectations,
  renderMarkdown,
  renderText,
  replaceOrThrow,
  syncEnglishReadme,
} = require('../../scripts/ci/catalog.js');

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
  console.log('\n=== Testing catalog.js direct helpers ===\n');

  let passed = 0;
  let failed = 0;

  if (test('parseReadmeExpectations returns empty expectations for markerless content', () => {
    assert.deepStrictEqual(parseReadmeExpectations('Plain text with no catalog markers.'), []);
  })) passed++; else failed++;

  if (test('replaceOrThrow raises a clear error when a marker is missing', () => {
    assert.throws(
      () => replaceOrThrow('no marker here', /Agents/, () => 'ignored', 'README.md parity table'),
      /README\.md parity table is missing the expected catalog marker/
    );
  })) passed++; else failed++;

  if (test('syncEnglishReadme rewrites all three count surfaces', () => {
    const source = [
      'You now have access to 1 agents, 2 skills, and 3 commands.',
      '| Agents | 1 agents |',
      '| Commands | 3 commands |',
      '| Skills | 2 skills |',
      '| Agents | 1 | Shared (AGENTS.md) | Shared (AGENTS.md) | 12 |',
      '| Commands | 3 | Shared | Instruction-based | 31 |',
      '| Skills | 2 | Shared | 10 (native format) | 37 |',
    ].join('\n');

    const updated = syncEnglishReadme(source, {
      agents: { count: 38 },
      commands: { count: 72 },
      skills: { count: 156 },
    });

    assert.ok(updated.includes('access to 38 agents, 156 skills, and 72 legacy command shims'));
    assert.ok(updated.includes('| Agents | 38 agents |'));
    assert.ok(updated.includes('| Commands | 72 commands |'));
    assert.ok(updated.includes('| Skills | 156 skills |'));
    assert.ok(updated.includes('| Agents | 38 | Shared (AGENTS.md) | Shared (AGENTS.md) | 12 |'));
  })) passed++; else failed++;

  if (test('evaluateExpectations handles exact and minimum comparators', () => {
    const checks = evaluateExpectations({
      agents: { count: 38 },
      skills: { count: 156 },
      commands: { count: 72 },
    }, [
      { category: 'agents', mode: 'exact', expected: 38, source: 'exact source' },
      { category: 'skills', mode: 'minimum', expected: 150, source: 'minimum source' },
      { category: 'commands', mode: 'exact', expected: 70, source: 'failing source' },
    ]);

    assert.deepStrictEqual(checks.map(check => check.ok), [true, true, false]);
    assert.strictEqual(formatExpectation(checks[2]), 'failing source: commands documented = 70, actual 72');
  })) passed++; else failed++;

  if (test('parseZhDocsReadmeExpectations and parseAgentsDocExpectations parse summary branches', () => {
    const zhChecks = parseZhDocsReadmeExpectations([
      '你现在可以使用 38 个智能体、156 项技能和 72 个命令了。',
      '| 智能体 | 38 个 |',
      '| 命令 | 72 个 |',
      '| 技能 | 156 项 |',
      '| 智能体 | 38 | 共享 (AGENTS.md) | 共享 (AGENTS.md) | 12 |',
      '| 命令 | 72 | 共享 | 基于指令 | 31 |',
      '| 技能 | 156 | 共享 | 10 (原生格式) | 37 |',
    ].join('\n'));
    assert.strictEqual(zhChecks.length, 9);

    const agentChecks = parseAgentsDocExpectations([
      'providing 38 specialized agents, 156+ skills, 72 commands',
      'agents/ - 38 specialized subagents',
      'skills/ - 156+ workflow skills and domain knowledge',
      'commands/ - 72 slash commands',
    ].join('\n'));
    assert.strictEqual(agentChecks[1].mode, 'minimum');
  })) passed++; else failed++;

  if (test('renderText and renderMarkdown report both clean and mismatch states', () => {
    const originalLog = console.log;
    const originalError = console.error;
    const output = [];
    const errors = [];
    try {
      console.log = message => output.push(message);
      console.error = message => errors.push(message);

      renderText({
        catalog: { agents: { count: 1 }, commands: { count: 2 }, skills: { count: 3 } },
        checks: [{ ok: true }],
      });
      renderMarkdown({
        catalog: { agents: { count: 1, glob: 'agents/*.md' }, commands: { count: 2, glob: 'commands/*.md' }, skills: { count: 3, glob: 'skills/*/SKILL.md' } },
        checks: [{ ok: false, source: 'source', category: 'agents', mode: 'exact', expected: 4, actual: 1 }],
      });

      assert.ok(output.some(line => String(line).includes('Documentation counts match the repository catalog.')));
      assert.ok(output.some(line => String(line).includes('# ECC Catalog Verification')));
      assert.ok(output.some(line => String(line).includes('source: agents documented = 4, actual 1')));
      assert.deepStrictEqual(errors, []);
    } finally {
      console.log = originalLog;
      console.error = originalError;
    }
  })) passed++; else failed++;

  console.log(`\nResults: Passed: ${passed}, Failed: ${failed}`);
  process.exit(failed > 0 ? 1 : 0);
}

runTests();
