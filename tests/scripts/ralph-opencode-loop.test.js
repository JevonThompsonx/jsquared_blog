'use strict';

const assert = require('assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { execFileSync, spawn } = require('child_process');

const SOURCE_SCRIPT = path.join(__dirname, '..', '..', 'scripts', 'ralph-opencode-loop.ps1');

console.log('=== Testing ralph-opencode-loop.ps1 ===\n');

let passed = 0;
let failed = 0;

function test(name, fn) {
  try {
    fn();
    console.log(`  ✓ ${name}`);
    passed += 1;
  } catch (error) {
    console.log(`  ✗ ${name}: ${error.message}`);
    failed += 1;
  }
}

function createHarness(config = {}) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'ecc-ralph-loop-'));
  const scriptsDir = path.join(root, 'scripts');
  const binDir = path.join(root, 'bin');
  const statePath = path.join(root, 'fake-opencode-state.json');
  const promptPath = path.join(scriptsDir, 'prompt.md');
  const scriptPath = path.join(scriptsDir, 'ralph-opencode-loop.ps1');

  fs.mkdirSync(scriptsDir, { recursive: true });
  fs.mkdirSync(binDir, { recursive: true });

  fs.copyFileSync(SOURCE_SCRIPT, scriptPath);
  fs.writeFileSync(promptPath, '# test prompt\n', 'utf8');
  if (config.promptContents) {
    fs.writeFileSync(promptPath, config.promptContents, 'utf8');
  }
  fs.writeFileSync(
    statePath,
    JSON.stringify(
      {
        sessionId: 'ses_test123',
        title: '',
        version: config.version ?? '1.3.17',
        runExitCode: config.runExitCode ?? 0,
        runError: config.runError ?? '',
        failRunOnCall: config.failRunOnCall ?? null,
        exportCalls: 0,
        runCalls: 0,
        runMessages: [],
        doneAfter: config.doneAfter ?? null,
        allDoneAfter: config.allDoneAfter ?? null,
        healthResponse: Object.prototype.hasOwnProperty.call(config, 'healthResponse')
          ? config.healthResponse
          : 'headless-ok',
        healthResponseAfter: config.healthResponseAfter ?? 1,
        userPrompt: config.userPrompt ?? '# test prompt',
      },
      null,
      2
    ),
    'utf8'
  );

  const fakeOpencodeScript = path.join(binDir, 'fake-opencode.js');
  fs.writeFileSync(
    fakeOpencodeScript,
    `'use strict';
const fs = require('fs');

const statePath = process.env.FAKE_OPENCODE_STATE;
const args = process.argv.slice(2);

function readState() {
  return JSON.parse(fs.readFileSync(statePath, 'utf8'));
}

function writeState(state) {
  fs.writeFileSync(statePath, JSON.stringify(state, null, 2));
}

function createExportPayload(state, marker) {
  return {
    info: {
      id: state.sessionId,
      title: state.title,
      version: 'fake'
    },
    messages: [
      {
        info: { role: 'user' },
        parts: [{ type: 'text', text: state.userPrompt }]
      },
      {
        info: { role: 'assistant' },
        parts: marker ? [{ type: 'text', text: marker }] : []
      }
    ]
  };
}

const command = args[0];

if (command === '--version') {
  const state = readState();
  process.stdout.write(state.version + '\\n');
  process.exit(0);
}

if (command === 'run') {
  const titleIndex = args.indexOf('--title');
  const state = readState();
  state.runCalls += 1;
  state.title = titleIndex >= 0 ? args[titleIndex + 1] : 'untitled';
  state.runMessages.push(args[args.length - 1] || '');
  writeState(state);

  if (state.runExitCode !== 0 && (state.failRunOnCall === null || state.runCalls === state.failRunOnCall)) {
    process.stderr.write(state.runError || 'run failed\\n');
    process.exit(state.runExitCode);
  }

  process.exit(0);
}

if (command === 'session' && args[1] === 'list') {
  const state = readState();
  process.stdout.write('Session ID  Title\\n');
  process.stdout.write(state.sessionId + '  ' + state.title + '\\n');
  process.exit(0);
}

if (command === 'export') {
  const state = readState();
  state.exportCalls += 1;
  writeState(state);

  let marker = '';
  if (state.title.includes('ralph-health-check')) {
    if (state.exportCalls >= state.healthResponseAfter) {
      marker = state.healthResponse || '';
    }
  } else if (state.allDoneAfter !== null && state.exportCalls >= state.allDoneAfter) {
    marker = '<promise>ALL_DONE</promise>';
  } else if (state.doneAfter !== null && state.exportCalls >= state.doneAfter) {
    marker = '<promise>DONE</promise>';
  }

  process.stderr.write('Exporting session: ' + state.sessionId + '\\n');
  process.stdout.write(JSON.stringify(createExportPayload(state, marker), null, 2));
  process.exit(0);
}

if (command === 'serve') {
  process.exit(0);
}

process.stderr.write('Unknown command: ' + args.join(' ') + '\\n');
process.exit(1);
`,
    'utf8'
  );

  const fakeOpencodeCmd = path.join(binDir, 'opencode.cmd');
  fs.writeFileSync(fakeOpencodeCmd, '@echo off\r\nnode "%~dp0\\fake-opencode.js" %*\r\n', 'utf8');

  return {
    root,
    statePath,
    scriptPath,
    promptPath,
    cleanup() {
      fs.rmSync(root, { recursive: true, force: true });
    },
  };
}

function startDelayedTcpServer(port, delayMs) {
  const script = [
    "const net = require('net');",
    `setTimeout(() => { const server = net.createServer((socket) => socket.end()); server.listen(${port}, '127.0.0.1'); }, ${delayMs});`
  ].join(' ');

  const child = spawn(process.execPath, ['-e', script], {
    detached: true,
    stdio: 'ignore'
  });
  child.unref();
  return child.pid;
}

function runLoop(harness, extraArgs = [], options = {}) {
  return execFileSync(
    'powershell.exe',
    [
      '-ExecutionPolicy',
      'Bypass',
      '-File',
      harness.scriptPath,
      '-MaxIterations',
      '1',
      '-UseInstalledOpenCode',
      ...(options.noServerStart === false ? [] : ['-NoServerStart']),
      '-PromptFile',
      harness.promptPath,
      ...extraArgs,
    ],
    {
      encoding: 'utf8',
      cwd: path.dirname(harness.scriptPath),
      env: {
        ...process.env,
        FAKE_OPENCODE_STATE: harness.statePath,
        PATH: `${path.join(harness.root, 'bin')};${process.env.PATH}`,
      },
      stdio: ['pipe', 'pipe', 'pipe'],
    }
  );
}

function runLoopResult(harness, extraArgs = []) {
  try {
    return {
      code: 0,
      stdout: runLoop(harness, extraArgs),
      stderr: ''
    };
  } catch (error) {
    return {
      code: error.status || 1,
      stdout: error.stdout || '',
      stderr: error.stderr || ''
    };
  }
}

test('fails fast when OpenCode version is below the supported floor', () => {
  const harness = createHarness({ version: '1.3.3' });

  try {
    const result = runLoopResult(harness);
    const state = JSON.parse(fs.readFileSync(harness.statePath, 'utf8'));

    assert.notStrictEqual(result.code, 0, 'loop should fail for unsupported OpenCode versions');
    assert.match(result.stderr, /OpenCode 1\.3\.17 or newer is required/);
    assert.strictEqual(state.runCalls, 0, 'loop should stop before starting any sessions');
    assert.strictEqual(state.exportCalls, 0, 'loop should stop before exporting sessions');
  } finally {
    harness.cleanup();
  }
});

test('fails fast when the headless health check produces no assistant text', () => {
  const harness = createHarness({ healthResponse: null });

  try {
    const result = runLoopResult(harness);
    const state = JSON.parse(fs.readFileSync(harness.statePath, 'utf8'));

    assert.notStrictEqual(result.code, 0, 'loop should fail when headless health check is empty');
    assert.match(result.stderr, /OpenCode headless health check failed/);
    assert.strictEqual(state.runCalls, 1, 'loop should only run the health check');
    assert.strictEqual(state.exportCalls, 3, 'loop should poll the health check session before failing');
  } finally {
    harness.cleanup();
  }
});

test('health check polls exports until assistant text appears', () => {
  const harness = createHarness({ healthResponse: 'headless-ok', healthResponseAfter: 2, doneAfter: 2 });

  try {
    const stdout = runLoop(harness);
    const state = JSON.parse(fs.readFileSync(harness.statePath, 'utf8'));

    assert.match(stdout, /Starting iteration 1/);
    assert.strictEqual(state.runCalls, 2, 'loop should run a health check before the first iteration');
    assert.strictEqual(state.exportCalls, 3, 'health check should poll until output appears before the iteration export succeeds');
  } finally {
    harness.cleanup();
  }
});

test('passes the full multiline build prompt to opencode run', () => {
  const harness = createHarness({
    promptContents: '# Ralph OpenCode Build Mode\n\nRead TODO.md before acting.\nOutput <promise>DONE</promise> when finished.\n',
    doneAfter: 1
  });

  try {
    runLoop(harness);
    const state = JSON.parse(fs.readFileSync(harness.statePath, 'utf8'));

    assert.strictEqual(state.runMessages.length, 2, 'loop should run health check and then the iteration');
    assert.match(state.runMessages[1], /Read TODO\.md before acting\./);
    assert.match(state.runMessages[1], /<promise>DONE<\/promise>/);
  } finally {
    harness.cleanup();
  }
});

test('waits for a server port that becomes ready shortly after startup', () => {
  const harness = createHarness({ doneAfter: 1 });
  const delayedPort = 45123;
  const delayedServerPid = startDelayedTcpServer(delayedPort, 4000);

  try {
    const stdout = runLoop(harness, ['-ServerPort', String(delayedPort)], { noServerStart: false });
    const state = JSON.parse(fs.readFileSync(harness.statePath, 'utf8'));

    assert.match(stdout, /Starting iteration 1/);
    assert.strictEqual(state.runCalls, 2, 'loop should wait for readiness, then run health check and iteration');
  } finally {
    try {
      execFileSync('taskkill.exe', ['/PID', String(delayedServerPid), '/T', '/F'], { stdio: 'ignore' });
    } catch {}
    harness.cleanup();
  }
});

test('fails fast when opencode run exits non-zero', () => {
  const harness = createHarness({ runExitCode: 1, runError: 'Error: Session not found', failRunOnCall: 2 });

  try {
    const result = runLoopResult(harness);
    const state = JSON.parse(fs.readFileSync(harness.statePath, 'utf8'));

    assert.notStrictEqual(result.code, 0, 'loop should fail when opencode run fails');
    assert.match(result.stderr, /OpenCode run failed during iteration/);
    assert.strictEqual(state.runCalls, 2, 'health check and iteration should both attempt to run');
    assert.strictEqual(state.exportCalls, 1, 'loop should not export the failed iteration');
  } finally {
    harness.cleanup();
  }
});

test('prints progress and waits for DONE before concluding the iteration', () => {
  const harness = createHarness({ doneAfter: 2 });

  try {
    const stdout = runLoop(harness);
    const state = JSON.parse(fs.readFileSync(harness.statePath, 'utf8'));

    assert.match(stdout, /Starting iteration 1/);
    assert.match(stdout, /Detected <promise>DONE<\/promise>/);
    assert.strictEqual(state.exportCalls, 2, 'loop should poll export until completion signal appears');
  } finally {
    harness.cleanup();
  }
});

test('reports when no completion signal appears after export polling', () => {
  const harness = createHarness({ doneAfter: null, allDoneAfter: null });

  try {
    const stdout = runLoop(harness);
    const state = JSON.parse(fs.readFileSync(harness.statePath, 'utf8'));

    assert.match(stdout, /No completion signal found/);
    assert.ok(state.exportCalls >= 1, 'loop should attempt at least one export');
  } finally {
    harness.cleanup();
  }
});

test('does not treat promise markers in the user prompt as completion', () => {
  const harness = createHarness({
    doneAfter: null,
    allDoneAfter: null,
    userPrompt: 'Output rules: <promise>DONE</promise> and <promise>ALL_DONE</promise>'
  });

  try {
    const stdout = runLoop(harness);
    const state = JSON.parse(fs.readFileSync(harness.statePath, 'utf8'));

    assert.doesNotMatch(stdout, /Detected <promise>ALL_DONE<\/promise>/);
    assert.doesNotMatch(stdout, /Detected <promise>DONE<\/promise>/);
    assert.match(stdout, /No completion signal found/);
    assert.ok(state.exportCalls >= 1, 'loop should poll exports instead of matching the user prompt');
  } finally {
    harness.cleanup();
  }
});

console.log(`\n=== Results: ${passed} passed, ${failed} failed ===`);
if (failed > 0) process.exit(1);
