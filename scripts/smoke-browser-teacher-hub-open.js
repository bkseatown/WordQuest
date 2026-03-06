#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');

const root = process.cwd();
const indexHtml = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const hubHtml = fs.readFileSync(path.join(root, 'teacher-hub-v2.html'), 'utf8');
const hubSource = fs.readFileSync(path.join(root, 'teacher-hub-v2.js'), 'utf8');
const storageSource = fs.readFileSync(path.join(root, 'js/teacher/teacher-storage.js'), 'utf8');

function requireText(source, pattern, message) {
  if (!pattern.test(source)) throw new Error(message);
}

requireText(indexHtml, /href="\.\/teacher-hub-v2\.html"/, 'Teacher landing route must point to teacher-hub-v2.html.');
requireText(hubHtml, /id="th2-search"/, 'Teacher Hub search input is missing.');
requireText(hubHtml, /id="th2-empty-state"/, 'Teacher Hub empty state container is missing.');
requireText(hubHtml, /js\/teacher\/teacher-storage\.js/, 'Teacher storage helper is not loaded by teacher-hub-v2.html.');

requireText(
  hubSource,
  /TeacherStorage\.loadScheduleBlocks/,
  'Teacher Hub no longer reads canonical schedule blocks.'
);
requireText(
  hubSource,
  /renderSearchResults/,
  'Teacher Hub search result renderer is missing.'
);
requireText(
  storageSource,
  /migrateLessonBriefBlocks/,
  'Teacher schedule migration helper is missing.'
);
requireText(
  storageSource,
  /cs\.schedule\.blocks\.v1/,
  'Canonical teacher schedule key is missing.'
);

console.log('browser smoke check passed: teacher hub route contract');
