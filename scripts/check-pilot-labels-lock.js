#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = process.cwd();

const LOCKED_LABELS = {
  'reports.html': [
    'Reports &amp; Prep',
    'Back to Hub',
    'Weekly Insight',
    'Meeting Prep',
    'Open Student Profile',
    'Generate Weekly Draft'
  ],
  'word-quest.html': [
    'Grade Band',
    'Active Grade Band locked:',
    'Start Quest',
    'Don’t show this welcome card again'
  ],
  'literacy.html': [
    'Literacy Domain',
    'Teacher Command Surface'
  ],
  'numeracy.html': [
    'Numeracy Domain',
    'Teacher Command Surface'
  ]
};

function read(file) {
  return fs.readFileSync(path.join(ROOT, file), 'utf8');
}

function run() {
  const failures = [];
  Object.keys(LOCKED_LABELS).forEach((file) => {
    const source = read(file);
    LOCKED_LABELS[file].forEach((label) => {
      if (!source.includes(label)) {
        failures.push({ file, label });
      }
    });
  });

  if (failures.length) {
    console.error('[pilot-label-lock] FAIL');
    failures.forEach((row) => {
      console.error(`- Missing label in ${row.file}: ${row.label}`);
    });
    process.exit(1);
  }

  console.log('[pilot-label-lock] PASS');
  console.log(`Checked ${Object.keys(LOCKED_LABELS).length} files.`);
}

run();
