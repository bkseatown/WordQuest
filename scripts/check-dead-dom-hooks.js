#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = process.cwd();
const HTML_PATH = path.join(ROOT, 'index.html');
const CHECK_FILES = [
  path.join(ROOT, 'js', 'app.js'),
  path.join(ROOT, 'js', 'theme-nav.js')
];

const ALLOWED_DYNAMIC_IDS = new Set([
  'dupe-ok',
  'dupe-never',
  'csCoachHint',
  'csCoachPrimary',
  'csCoachSkip',
  'csCoachSuggest',
  'csCoachText',
  'csDemoCoach',
  'wq-demo-banner',
  'wq-demo-coach',
  'wq-demo-full-btn',
  'wq-demo-launch-btn',
  'wq-demo-restart-btn',
  'wq-demo-retry-btn',
  'wq-demo-skip-btn'
]);

const SELECTOR_PATTERNS = [
  /\b_el\('([^']+)'\)/g,
  /\bgetElementById\('([^']+)'\)/g,
  /\bquerySelector\('#([^'"\\s>:+\[]+)'\)/g,
  /\bquerySelectorAll\('#([^'"\\s>:+\[]+)'\)/g
];

function readIdsFromHtml(filePath) {
  const source = fs.readFileSync(filePath, 'utf8');
  return new Set(Array.from(source.matchAll(/\sid="([^"]+)"/g), (match) => match[1]));
}

function collectSelectors(filePath, validIds) {
  const source = fs.readFileSync(filePath, 'utf8');
  const missing = [];
  for (const pattern of SELECTOR_PATTERNS) {
    let match;
    while ((match = pattern.exec(source))) {
      const id = match[1];
      // _el() is used with full selectors in some places; only treat id-like tokens as hard requirements.
      if (!/^[A-Za-z][A-Za-z0-9:_-]*$/.test(id)) continue;
      if (validIds.has(id) || ALLOWED_DYNAMIC_IDS.has(id)) continue;
      missing.push(id);
    }
  }
  return missing;
}

if (!fs.existsSync(HTML_PATH)) {
  console.error(`Missing required file: ${HTML_PATH}`);
  process.exit(1);
}

const validIds = readIdsFromHtml(HTML_PATH);
const files = CHECK_FILES.filter((filePath) => fs.existsSync(filePath));
const findings = [];

for (const filePath of files) {
  const missingIds = collectSelectors(filePath, validIds);
  if (!missingIds.length) continue;
  const unique = Array.from(new Set(missingIds)).sort();
  findings.push({
    file: path.relative(ROOT, filePath),
    missing: unique
  });
}

if (!findings.length) {
  console.log('dead DOM hook check passed');
  process.exit(0);
}

console.error('dead DOM hook check failed: selectors target missing IDs.');
for (const finding of findings) {
  console.error(`- ${finding.file}: ${finding.missing.join(', ')}`);
}
process.exit(1);
