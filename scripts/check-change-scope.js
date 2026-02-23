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
  /^style\/(components\.css|themes\.css|modes\.css)$/,
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

function parsePath(line) {
  const raw = line.replace(/^[ MADRCU?!]{1,2}\s+/, '').trim();
  const renameParts = raw.split(' -> ');
  return renameParts[renameParts.length - 1];
}

function matchesAny(path, patterns) {
  return patterns.some((pattern) => pattern.test(path));
}

function classify(path) {
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

const status = runGitStatus();
if (!status) {
  console.log('No changed files. Scope check passed.');
  process.exit(0);
}

const lines = status.split('\n').filter(Boolean);
const changed = lines.map(parsePath);

const groups = {
  green: [],
  yellow: [],
  red: [],
  unknown: []
};

changed.forEach((path) => {
  groups[classify(path)].push(path);
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
