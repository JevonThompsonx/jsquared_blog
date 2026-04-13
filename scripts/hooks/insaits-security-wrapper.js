#!/usr/bin/env node
/**
 * InsAIts Security Monitor — wrapper for run-with-flags compatibility.
 *
 * This thin wrapper receives stdin from the hooks infrastructure and
 * delegates to the Python-based insaits-security-monitor.py script.
 *
 * The wrapper exists because run-with-flags.js spawns child scripts
 * via `node`, so a JS entry point is needed to bridge to Python.
 */

'use strict';

const path = require('path');
const { spawnSync } = require('child_process');

const MAX_STDIN = 1024 * 1024;

function isEnabled(value) {
  return ['1', 'true', 'yes', 'on'].includes(String(value || '').toLowerCase());
}

function execute(rawInput, runtime = {}) {
  const env = runtime.env || process.env;
  const stderrWrite = runtime.stderrWrite || (message => process.stderr.write(message));
  const stdoutWrite = runtime.stdoutWrite || (message => process.stdout.write(message));
  const exit = runtime.exit || (code => process.exit(code));
  const spawn = runtime.spawnSync || spawnSync;

  if (!isEnabled(env.ECC_ENABLE_INSAITS)) {
    stdoutWrite(rawInput);
    exit(0);
    return;
  }

  const pyScript = path.join(__dirname, 'insaits-security-monitor.py');
  const pythonCandidates = ['python3', 'python'];
  let result;

  for (const pythonBin of pythonCandidates) {
    result = spawn(pythonBin, [pyScript], {
      input: rawInput,
      encoding: 'utf8',
      env,
      cwd: process.cwd(),
      timeout: 14000,
    });

    if (result.error && result.error.code === 'ENOENT') {
      continue;
    }
    break;
  }

  if (!result || (result.error && result.error.code === 'ENOENT')) {
    stderrWrite('[InsAIts] python3/python not found. Install Python 3.9+ and: pip install insa-its\n');
    stdoutWrite(rawInput);
    exit(0);
    return;
  }

  if (result.error) {
    stderrWrite(`[InsAIts] Security monitor failed to run: ${result.error.message}\n`);
    stdoutWrite(rawInput);
    exit(0);
    return;
  }

  if (!Number.isInteger(result.status)) {
    const signal = result.signal || 'unknown';
    stderrWrite(`[InsAIts] Security monitor killed (signal: ${signal}). Tool execution continues.\n`);
    stdoutWrite(rawInput);
    exit(0);
    return;
  }

  if (result.stdout) stdoutWrite(result.stdout);
  if (result.stderr) stderrWrite(result.stderr);

  exit(result.status);
}

let raw = '';
process.stdin.setEncoding('utf8');
process.stdin.on('data', chunk => {
  if (raw.length < MAX_STDIN) {
    raw += chunk.substring(0, MAX_STDIN - raw.length);
  }
});

process.stdin.on('end', () => {
  execute(raw);
});

module.exports = {
  isEnabled,
  execute,
};
