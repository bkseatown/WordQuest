#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');

const root = process.cwd();
const indexHtml = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const appSource = fs.readFileSync(path.join(root, 'js/app.js'), 'utf8');

function requireText(source, pattern, message) {
  if (!pattern.test(source)) throw new Error(message);
}

requireText(
  indexHtml,
  /id="focus-inline-search"[\s\S]*placeholder="Select your quest or track"/,
  'Focus search placeholder text changed unexpectedly in index.html.'
);
requireText(
  appSource,
  /inputEl\.placeholder = 'Select your quest or track';/,
  'Focus search placeholder reset is missing in updateFocusSummaryLabel.'
);
requireText(
  appSource,
  /inputEl\.setAttribute\('aria-label', `Select your quest or track\. Current selection: \$\{currentLabel\}`\);/,
  'Focus search aria-label microcopy contract is missing.'
);

console.log('regression check passed: focus search placeholder');
