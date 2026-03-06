#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = process.cwd();
const HTML_PATHS = [
  path.join(ROOT, 'index.html'),
  path.join(ROOT, 'teacher-dashboard.html'),
  path.join(ROOT, 'teacher-hub-v2.html'),
  path.join(ROOT, 'cornerstone-mtss.html'),
  path.join(ROOT, 'word-quest.html')
];
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
  'wq-demo-skip-btn',
  'cs-demo-close',
  'cs-demo-restart',
  'cs-demo-skip',
  'cs-demo-toast',
  'cs-demo-toast-bar',
  'cs-demo-toast-text',
  'csHeaderTitleCenter'
]);

const SELECTOR_PATTERNS = [
  /\b_el\('([^']+)'\)/g,
  /\bgetElementById\('([^']+)'\)/g,
  /\bquerySelector\('#([^'"\\s>:+\[]+)'\)/g,
  /\bquerySelectorAll\('#([^'"\\s>:+\[]+)'\)/g
];

const REQUIRED_PAGE_IDS = {
  'teacher-hub-v2.html': ['th2-search', 'th2-main', 'th2-empty-state', 'th2-focus-card', 'th2-list', 'th2-sidebar-context'],
  'teacher-dashboard.html': ['td-search-input', 'td-focus-card', 'td-meeting-workspace', 'td-hub-cta']
};

function readIdsFromHtml(filePath) {
  const source = fs.readFileSync(filePath, 'utf8');
  return new Set(Array.from(source.matchAll(/\sid="([^"]+)"/g), (match) => match[1]));
}

function readAllIdsFromHtml(paths) {
  const ids = new Set();
  paths.forEach((filePath) => {
    if (!fs.existsSync(filePath)) return;
    const fileIds = readIdsFromHtml(filePath);
    fileIds.forEach((id) => ids.add(id));
  });
  return ids;
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

const existingHtmlPaths = HTML_PATHS.filter((filePath) => fs.existsSync(filePath));
if (!existingHtmlPaths.length) {
  console.error('Missing required HTML files for DOM hook checks.');
  process.exit(1);
}

const validIds = readAllIdsFromHtml(existingHtmlPaths);
const files = CHECK_FILES.filter((filePath) => fs.existsSync(filePath));
const findings = [];

for (const filePath of existingHtmlPaths) {
  const basename = path.basename(filePath);
  const required = REQUIRED_PAGE_IDS[basename];
  if (!required) continue;
  const ids = readIdsFromHtml(filePath);
  const missing = required.filter((id) => !ids.has(id));
  if (!missing.length) continue;
  findings.push({
    file: path.relative(ROOT, filePath),
    missing
  });
}

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
