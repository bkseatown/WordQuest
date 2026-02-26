#!/usr/bin/env node
/* eslint-disable no-console */
const { execSync } = require('child_process');

const strict = process.argv.includes('--strict');

const GREEN_RULES = [
  /^\.gitignore$/,
  /^README\.md$/,
  /^VISION\.md$/,
  /^\.github\/workflows\//,
  /^docs\//,
  /^scripts\//,
  /^package\.json$/,
  /^index\.html$/,
  /^sw\.js$/,
  /^sw-runtime\.js$/,
  /^data\/audio-manifest\.json$/,
  /^data\/engagement-boosts\.js$/,
  /^style\/(components\.css|themes\.css|modes\.css|world-themes\.css)$/,
  /^js\/(app\.js|audio\.js|theme-nav\.js|theme-registry\.js)$/
];

const YELLOW_RULES = [
  /^files\/$/,
  /\.?DS_Store$/,
  /^js\/(game\.js|ui\.js|data\.js)$/,
  /^data\//
];

const RED_RULES = [
  /^assets\/audio\//,
  /^files\/.+/,
  /^\.git\//,
  /^\.gitattributes$/,
  /^AGENT_PROMPT\.md$/,
  /^BUG_FIX_REPORT\.md$/,
  /\.bak$/,
  /\.zip$/
];

function runGitStatus() {
  try {
    return execSync('git status --porcelain', { encoding: 'utf8' });
  } catch (error) {
    console.error('ERROR: Could not read git status. Run this inside the WordQuest repo.');
    process.exit(2);
  }
}

function runGitDiff(base) {
  try {
    return execSync(`git diff --name-status ${base}...HEAD`, { encoding: 'utf8' });
  } catch (error) {
    console.error(`ERROR: Could not diff against base "${base}".`);
    process.exit(2);
  }
}

function parsePath(rawPath) {
  const raw = String(rawPath || '').trim();
  const renameParts = raw.split(' -> ');
  return renameParts[renameParts.length - 1];
}

function parseStatusLine(line) {
  const trimmed = String(line || '').trim();
  if (!trimmed) return null;
  const parts = trimmed.split('\t');
  const statusToken = String(parts[0] || '').trim();
  const status = statusToken.charAt(0).toUpperCase() || 'M';
  const rawPath = parts.length > 1 ? parts[parts.length - 1] : statusToken;
  const path = parsePath(rawPath);
  if (!path) return null;
  return { path, status };
}

function parsePorcelainLine(line) {
  const raw = String(line || '');
  if (!raw.trim()) return null;
  const statusCode = raw.slice(0, 2);
  const status = statusCode.includes('D') ? 'D' : 'M';
  const path = parsePath(raw.replace(/^[ MADRCU?!]{1,2}\s+/, ''));
  if (!path) return null;
  return { path, status };
}

function matchesAny(path, patterns) {
  return patterns.some((pattern) => pattern.test(path));
}

function isMetadataDelete(change) {
  return change.status === 'D' && /\.?DS_Store$/i.test(change.path);
}

function classify(change) {
  if (isMetadataDelete(change)) return 'green';
  const path = change.path;
  if (matchesAny(path, RED_RULES)) return 'red';
  if (matchesAny(path, GREEN_RULES)) return 'green';
  if (matchesAny(path, YELLOW_RULES)) return 'yellow';
  return 'unknown';
}

function printGroup(title, paths) {
  if (!paths.length) return;
  console.log(`\n${title} (${paths.length})`);
  paths.forEach((path) => console.log(`- ${path}`));
}

const baseRef = process.env.GUARDRAIL_BASE && process.env.GUARDRAIL_BASE.trim();
const changed = baseRef
  ? runGitDiff(baseRef).split('\n').map(parseStatusLine).filter(Boolean)
  : runGitStatus().split('\n').map(parsePorcelainLine).filter(Boolean);

if (!changed.length) {
  if (baseRef) {
    console.log(`No changed files between ${baseRef} and HEAD. Scope check passed.`);
  } else {
    console.log('No changed files. Scope check passed.');
  }
  process.exit(0);
}

const groups = {
  green: [],
  yellow: [],
  red: [],
  unknown: []
};

changed.forEach((change) => {
  groups[classify(change)].push(change.path);
});

console.log(`Found ${changed.length} changed file(s).`);
printGroup('SAFE TO CHANGE (green)', groups.green);
printGroup('CHECK BEFORE CHANGING (yellow)', groups.yellow);
printGroup('DO NOT CHANGE WITHOUT EXPLICIT APPROVAL (red)', groups.red);
printGroup('UNMAPPED - REVIEW MANUALLY (unknown)', groups.unknown);

if (groups.red.length) {
  console.error('\nScope check failed: red-flag files are changed.');
  process.exit(1);
}

if (strict && (groups.yellow.length || groups.unknown.length)) {
  console.error('\nScope check failed in strict mode: yellow/unknown files require review.');
  process.exit(1);
}

if (groups.yellow.length || groups.unknown.length) {
  console.log('\nScope check warning: yellow/unknown files changed. Review before merge.');
  process.exit(0);
}

console.log('\nScope check passed: only green files changed.');
