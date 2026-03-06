#!/usr/bin/env node
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

const dashboardHtml = read('teacher-dashboard.html');
const dashboardJs = read('teacher-dashboard.js');
const hubHtml = read('teacher-hub-v2.html');
const hubJs = read('teacher-hub-v2.js');
const indexHtml = read('index.html');
const runtimeState = read('js/teacher-runtime-state.js');
const searchIndex = read('js/search/teacher-search-index.js');
const literacySequencer = read('js/instructional-sequencer.js');
const wordConnectionsEngine = read('js/literacy/word-connections-engine.js');
const teacherStorage = read('js/teacher/teacher-storage.js');

assert(indexHtml.includes('href="./teacher-hub-v2.html"'), 'Teacher landing route must point to teacher-hub-v2.html', failures);
assert(!indexHtml.includes('Teacher Dashboard'), 'Teacher Dashboard should not remain a primary landing option', failures);
assert(!indexHtml.includes('teacher-dashboard.html?role='), 'URL role gating still present in index teacher link', failures);
assert(!indexHtml.includes('home-google-signin'), 'Visible Google sign-in UI should not remain on landing', failures);

assert(dashboardHtml.includes('id="td-focus-start-btn"'), 'Daily flow guard: Start Recommended Session button missing', failures);
assert(dashboardHtml.includes('id="td-meeting-workspace"'), 'Meeting workspace entry missing', failures);
assert(!dashboardHtml.includes('id="td-compat-sink"'), 'Compatibility sink still present in dashboard HTML', failures);
assert(dashboardHtml.includes('Teacher Workspace'), 'Teacher Workspace labeling missing in dashboard HTML', failures);
assert(dashboardHtml.includes('./teacher-hub-v2.html'), 'Teacher Workspace must retain route back to Teacher Hub', failures);
assert(dashboardHtml.includes('js/teacher-runtime-state.js'), 'Teacher Workspace must load unified teacher runtime state', failures);

assert(dashboardJs.includes('initRuntimeState();'), 'App state initialization missing at boot', failures);
assert(dashboardJs.includes('appState.set({ mode: next })'), 'Centralized mode state write missing', failures);
assert(dashboardJs.includes('DashboardFocus.setSelectedStudent(appState, state.selectedId)'), 'Centralized selected student state write missing', failures);
assert(dashboardJs.includes('openMeetingModal();'), 'Meeting generation path missing', failures);
assert(dashboardJs.includes('window.location.href = appendStudentParam("./" + target + ".html")'), 'Word Quest / Word Connections launch path guard missing', failures);
assert(literacySequencer.includes('Word Connections'), 'Word Connections launch integrity guard failed: sequencer option missing', failures);
assert(wordConnectionsEngine.includes('generateWordConnectionsRound'), 'Word Connections engine integrity guard failed', failures);
assert(!dashboardJs.includes('new URLSearchParams(window.location.search || "").get("role")'), 'Runtime URL role gating still active', failures);
assert(!dashboardJs.includes('function openReportModal('), 'Legacy report modal path still present', failures);
assert(!dashboardJs.includes('function openMeetingDeckMode('), 'Legacy meeting deck modal path still present', failures);
assert(hubHtml.includes('id="th2-search"'), 'Teacher Hub global search input missing', failures);
assert(hubHtml.includes('js/teacher-runtime-state.js'), 'Teacher Hub must load unified teacher runtime state', failures);
assert(hubHtml.includes('js/search/teacher-search-index.js'), 'Teacher Hub must load teacher search index module', failures);
assert(hubJs.includes('TeacherStorage.loadScheduleBlocks'), 'Teacher Hub must use canonical schedule store', failures);
assert(hubJs.includes('TeacherSearchIndex'), 'Teacher Hub must route search through teacher search index', failures);
assert(!hubJs.includes('localStorage.getItem("cs.lessonBrief.blocks.v1")'), 'Teacher Hub should not read lesson-brief block storage directly', failures);
assert(runtimeState.includes('CSTeacherRuntimeState'), 'Unified teacher runtime state module missing', failures);
assert(runtimeState.includes('active_class_context'), 'Unified teacher runtime state must track active class context', failures);
assert(searchIndex.includes('CSTeacherSearchIndex'), 'Teacher search index module missing', failures);
assert(teacherStorage.includes('cs.schedule.blocks.v1'), 'Canonical teacher schedule store key missing', failures);
assert(teacherStorage.includes('migrateLessonBriefBlocks'), 'Legacy lesson-brief block migration missing', failures);
assert(teacherStorage.includes('migrateLegacyTeacherData'), 'Canonical teacher storage migration entry point missing', failures);
assert(teacherStorage.includes('cs.students.v1'), 'Canonical students store key missing', failures);
assert(teacherStorage.includes('cs.session.logs.v1'), 'Canonical session log store key missing', failures);

if (failures.length) {
  console.error('Guardrail checks failed:');
  failures.forEach((f, i) => console.error(`${i + 1}. ${f}`));
  process.exit(1);
}

console.log('Dashboard guardrail checks passed.');
