#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');

const root = process.cwd();
const indexHtml = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const hubHtml = fs.readFileSync(path.join(root, 'teacher-hub-v2.html'), 'utf8');
const hubSource = fs.readFileSync(path.join(root, 'teacher-hub-v2.js'), 'utf8');
const dashboardHtml = fs.readFileSync(path.join(root, 'teacher-dashboard.html'), 'utf8');
const runtimeState = fs.readFileSync(path.join(root, 'js/teacher-runtime-state.js'), 'utf8');
const searchIndex = fs.readFileSync(path.join(root, 'js/search/teacher-search-index.js'), 'utf8');
const teacherSelectors = fs.readFileSync(path.join(root, 'js/teacher/teacher-selectors.js'), 'utf8');
const teacherIntelligence = fs.readFileSync(path.join(root, 'js/teacher/teacher-intelligence.js'), 'utf8');
const storageSource = fs.readFileSync(path.join(root, 'js/teacher/teacher-storage.js'), 'utf8');

function requireText(source, pattern, message) {
  if (!pattern.test(source)) throw new Error(message);
}

requireText(indexHtml, /href="\.\/teacher-hub-v2\.html"/, 'Teacher landing route must point to teacher-hub-v2.html.');
requireText(hubHtml, /id="th2-search"/, 'Teacher Hub search input is missing.');
requireText(hubHtml, /id="th2-empty-state"/, 'Teacher Hub empty state container is missing.');
requireText(hubHtml, /js\/teacher\/teacher-storage\.js/, 'Teacher storage helper is not loaded by teacher-hub-v2.html.');
requireText(hubHtml, /js\/teacher-runtime-state\.js/, 'Unified teacher runtime state is not loaded by teacher-hub-v2.html.');
requireText(hubHtml, /js\/search\/teacher-search-index\.js/, 'Teacher search index is not loaded by teacher-hub-v2.html.');
requireText(hubHtml, /js\/teacher\/teacher-selectors\.js/, 'Shared teacher selectors are not loaded by teacher-hub-v2.html.');
requireText(hubHtml, /js\/teacher\/teacher-intelligence\.js/, 'Shared teacher intelligence service is not loaded by teacher-hub-v2.html.');
requireText(dashboardHtml, /Teacher Workspace/, 'Teacher Workspace labeling is missing from teacher-dashboard.html.');
requireText(dashboardHtml, /href="\.\/teacher-hub-v2\.html"/, 'Teacher Workspace must retain a route back to teacher-hub-v2.html.');
requireText(dashboardHtml, /js\/teacher\/teacher-selectors\.js/, 'Shared teacher selectors are not loaded by teacher-dashboard.html.');
requireText(dashboardHtml, /js\/teacher\/teacher-intelligence\.js/, 'Shared teacher intelligence service is not loaded by teacher-dashboard.html.');

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
  hubSource,
  /TeacherSearchIndex/,
  'Teacher Hub search does not use the teacher search index.'
);
requireText(
  hubSource,
  /TeacherIntelligence/,
  'Teacher Hub does not use the shared teacher intelligence service.'
);
requireText(
  runtimeState,
  /CSTeacherRuntimeState/,
  'Unified teacher runtime state module is missing.'
);
requireText(
  searchIndex,
  /CSTeacherSearchIndex/,
  'Teacher search index module is missing.'
);
requireText(
  teacherSelectors,
  /CSTeacherSelectors/,
  'Shared teacher selector module is missing.'
);
requireText(
  teacherIntelligence,
  /CSTeacherIntelligence/,
  'Shared teacher intelligence module is missing.'
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
requireText(
  storageSource,
  /migrateLegacyTeacherData/,
  'Unified teacher storage migration helper is missing.'
);

console.log('browser smoke check passed: teacher hub route contract');
