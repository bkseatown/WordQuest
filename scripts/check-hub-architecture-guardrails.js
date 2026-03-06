#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');

const root = process.cwd();

function read(file) {
  return fs.readFileSync(path.join(root, file), 'utf8');
}

function assert(condition, message, failures) {
  if (!condition) failures.push(message);
}

const failures = [];
const hubHtml = read('teacher-hub-v2.html');
const hubJs = read('teacher-hub-v2.js');
const lessonBriefJs = read('js/lesson-brief-panel.js');
const storageJs = read('js/teacher/teacher-storage.js');
const selectorsJs = read('js/teacher/teacher-selectors.js');
const intelligenceJs = read('js/teacher/teacher-intelligence.js');
const landingHtml = read('index.html');

assert(hubHtml.includes('id="th2-search"'), 'Hub search input missing.', failures);
assert(hubHtml.includes('placeholder="Search student, class, curriculum, resource, or tool'), 'Hub search placeholder not refocused.', failures);
assert(hubHtml.includes('id="th2-empty-state"'), 'Hub empty-state container missing.', failures);
assert(hubHtml.includes('./js/teacher/teacher-storage.js'), 'Teacher storage helper not loaded in hub HTML.', failures);
assert(hubHtml.includes('./js/teacher/teacher-selectors.js'), 'Teacher selector helper not loaded in hub HTML.', failures);
assert(hubHtml.includes('./js/teacher/teacher-intelligence.js'), 'Teacher intelligence helper not loaded in hub HTML.', failures);

assert(hubJs.includes('Global Search'), 'Hub search surface copy missing.', failures);
assert(hubJs.includes('TeacherStorage.loadScheduleBlocks'), 'Hub does not read canonical schedule blocks.', failures);
assert(hubJs.includes('TeacherSelectors.loadScheduleBlocks'), 'Hub is not reading schedule blocks through shared teacher selectors.', failures);
assert(hubJs.includes('TeacherIntelligence'), 'Hub is not using shared teacher intelligence helpers.', failures);
assert(hubJs.includes('classLessonSummary'), 'Class intelligence lesson context helper missing.', failures);
assert(hubJs.includes('classLanguageDemands'), 'Class intelligence language demand helper missing.', failures);
assert(hubJs.includes('classConceptFocus'), 'Class intelligence concept focus helper missing.', failures);
assert(hubJs.includes('snapshot.cross.map'), 'Hub class-view cross-domain chip rendering is missing.', failures);
assert(hubJs.includes('areaTierLabel(goal.level) + " " + areaLabel'), 'Hub cross-domain chip format logic is missing.', failures);
assert(!hubJs.includes('localStorage.getItem("cs.lessonBrief.blocks.v1")'), 'Hub still reads lesson-brief block storage directly.', failures);

assert(lessonBriefJs.includes('TeacherStorage.loadScheduleBlocks'), 'Lesson Brief panel not migrated to canonical schedule store.', failures);
assert(lessonBriefJs.includes('TeacherStorage.saveScheduleBlocks'), 'Lesson Brief panel not saving to canonical schedule store.', failures);

assert(storageJs.includes('cs.schedule.blocks.v1'), 'Canonical schedule storage key missing.', failures);
assert(storageJs.includes('migrateLessonBriefBlocks'), 'Schedule migration helper missing.', failures);
assert(storageJs.includes('teacherProfile'), 'Teacher profile storage key missing.', failures);
assert(storageJs.includes('classContexts'), 'Class context storage key missing.', failures);
assert(storageJs.includes('lessonContext'), 'Lesson context storage key missing.', failures);
assert(selectorsJs.includes('CSTeacherSelectors'), 'Shared teacher selector module missing.', failures);
assert(selectorsJs.includes('buildClassContext'), 'Shared teacher selector class-context helper missing.', failures);
assert(intelligenceJs.includes('CSTeacherIntelligence'), 'Shared teacher intelligence module missing.', failures);
assert(intelligenceJs.includes('buildTodayPlan'), 'Shared teacher intelligence today-plan builder missing.', failures);

assert(landingHtml.includes('href="./teacher-hub-v2.html"'), 'Landing page does not route Teacher to the Hub.', failures);

if (failures.length) {
  console.error('Hub architecture guardrail checks failed:');
  failures.forEach((message, index) => console.error(`${index + 1}. ${message}`));
  process.exit(1);
}

console.log('Hub architecture guardrail checks passed.');
