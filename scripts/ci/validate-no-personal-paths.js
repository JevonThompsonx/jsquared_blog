#!/usr/bin/env node
/**
 * Prevent shipping user-specific absolute paths in public docs/skills/commands.
 */

'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '../..');
const TARGETS = [
  'README.md',
  'skills',
  'commands',
  'agents',
  'docs',
  '.opencode/commands',
];

const BLOCK_PATTERNS = [
  /\/Users\/affoon\b/g,
  /C:\\Users\\affoon\b/gi,
];

function collectFiles(targetPath, out) {
  if (!fs.existsSync(targetPath)) return;
  const stat = fs.statSync(targetPath);
  if (stat.isFile()) {
    out.push(targetPath);
    return;
  }

  for (const entry of fs.readdirSync(targetPath)) {
    if (entry === 'node_modules' || entry === '.git') continue;
    collectFiles(path.join(targetPath, entry), out);
  }
}

function hasSupportedExtension(filePath) {
  return /\.(md|json|js|ts|sh|toml|yml|yaml)$/i.test(filePath);
}

function countBlockedPathMatches(content, patterns = BLOCK_PATTERNS) {
  for (const pattern of patterns) {
    const match = content.match(pattern);
    if (match) {
      return match.length;
    }
  }

  return 0;
}

function scanFiles(files, options = {}) {
  const {
    patterns = BLOCK_PATTERNS,
    readFile = filePath => fs.readFileSync(filePath, 'utf8'),
    reportError = message => console.error(message),
    root = ROOT,
  } = options;

  let failures = 0;
  for (const file of files) {
    if (!hasSupportedExtension(file)) continue;
    const matchCount = countBlockedPathMatches(readFile(file), patterns);
    if (matchCount > 0) {
      reportError(`ERROR: personal path detected in ${path.relative(root, file)}`);
      failures += matchCount;
    }
  }

  return failures;
}

function main(options = {}) {
  const root = options.root || ROOT;
  const targets = options.targets || TARGETS;
  const files = [];
  for (const target of targets) {
    collectFiles(path.join(root, target), files);
  }

  const failures = scanFiles(files, {
    patterns: options.patterns,
    readFile: options.readFile,
    reportError: options.reportError,
    root,
  });

  if (failures > 0) {
    process.exit(1);
  }

  const reportInfo = options.reportInfo || (message => console.log(message));
  reportInfo('Validated: no personal absolute paths in shipped docs/skills/commands');
}

if (require.main === module) {
  main();
}

module.exports = {
  BLOCK_PATTERNS,
  TARGETS,
  ROOT,
  collectFiles,
  hasSupportedExtension,
  countBlockedPathMatches,
  scanFiles,
  main,
};
