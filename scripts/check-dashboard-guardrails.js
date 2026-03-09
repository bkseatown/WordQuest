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

const redirectHtml = read('teacher-dashboard.html');
const reportsHtml = read('reports.html');
const reportsJs = read('teacher-dashboard.js');
const hubHtml = read('teacher-hub-v2.html');
const hubJs = read('teacher-hub-v2.js');
const indexHtml = read('index.html');
const runtimeState = read('js/teacher-runtime-state.js');
const searchIndex = read('js/search/teacher-search-index.js');
const searchService = read('js/search/teacher-search-service.js');
const teacherSelectors = read('js/teacher/teacher-selectors.js');
const teacherIntelligence = read('js/teacher/teacher-intelligence.js');
const teacherSupportService = read('js/teacher/teacher-support-service.js');
const literacySequencer = read('js/instructional-sequencer.js');
const wordConnectionsEngine = read('js/literacy/word-connections-engine.js');
const teacherStorage = read('js/teacher/teacher-storage.js');

assert(indexHtml.includes('href="./teacher-hub-v2.html"'), 'Teacher landing route must point to teacher-hub-v2.html', failures);
assert(!indexHtml.includes('Teacher Dashboard'), 'Teacher Dashboard should not remain a primary landing option', failures);
assert(!indexHtml.includes('teacher-dashboard.html?role='), 'URL role gating still present in index teacher link', failures);
assert(!indexHtml.includes('home-google-signin'), 'Visible Google sign-in UI should not remain on landing', failures);

assert(redirectHtml.includes('Opening Reports &amp; Prep'), 'teacher-dashboard.html must remain a redirect shim to Reports & Prep.', failures);
assert(redirectHtml.includes('./reports.html'), 'teacher-dashboard.html must redirect to reports.html.', failures);
assert(redirectHtml.includes('window.location.replace(buildTarget())'), 'teacher-dashboard.html redirect behavior is missing.', failures);
assert(!redirectHtml.includes('id="td-shell"'), 'teacher-dashboard.html should not host the reports workspace directly.', failures);

assert(reportsHtml.includes('Reports &amp; Prep'), 'Reports labeling missing in reports.html.', failures);
assert(reportsHtml.includes('id="td-shell"'), 'Reports shell missing in reports.html.', failures);
assert(reportsHtml.includes('id="td-focus-start-btn"'), 'Reports daily launch CTA missing.', failures);
assert(reportsHtml.includes('id="td-meeting-workspace"'), 'Meeting workspace entry missing in reports.html.', failures);
assert(reportsHtml.includes('id="td-activity-select"'), 'Activity launcher missing in reports.html.', failures);
assert(reportsHtml.includes('id="td-hub-cta"'), 'Reports page must retain a route back to Teacher Hub.', failures);
assert(reportsHtml.includes('./teacher-hub-v2.html'), 'Reports page must retain a route back to Teacher Hub.', failures);
assert(reportsHtml.includes('./student-profile.html'), 'Reports page must retain a route to Student Profile.', failures);
assert(reportsHtml.includes('js/teacher-runtime-state.js'), 'Reports page must load unified teacher runtime state.', failures);
assert(reportsHtml.includes('js/teacher/teacher-intelligence.js'), 'Reports page must load shared teacher intelligence service.', failures);
assert(reportsHtml.includes('js/teacher/teacher-support-service.js'), 'Reports page must load shared teacher support service.', failures);
assert(reportsHtml.includes('js/search/teacher-search-index.js'), 'Reports page must load shared teacher search index.', failures);
assert(reportsHtml.includes('js/search/teacher-search-service.js'), 'Reports page must load shared teacher search service.', failures);
assert(reportsHtml.includes('js/dashboard/workspace-caseload.js'), 'Reports page must load caseload workspace module.', failures);
assert(reportsHtml.includes('js/dashboard/workspace-focus-shell.js'), 'Reports page must load focus shell workspace module.', failures);
assert(reportsHtml.includes('js/dashboard/workspace-student-intelligence.js'), 'Reports page must load student intelligence workspace module.', failures);
assert(reportsHtml.includes('js/dashboard/workspace-selection.js'), 'Reports page must load selection workspace module.', failures);
assert(reportsHtml.includes('js/dashboard/workspace-meeting-content.js'), 'Reports page must load meeting content workspace module.', failures);
assert(reportsHtml.includes('js/dashboard/workspace-support-content.js'), 'Reports page must load support content workspace module.', failures);
assert(reportsHtml.includes('js/dashboard/workspace-drawer-content.js'), 'Reports page must load drawer content workspace module.', failures);
assert(reportsHtml.includes('js/dashboard/workspace-recommendations.js'), 'Reports page must load recommendations workspace module.', failures);
assert(reportsHtml.includes('js/dashboard/workspace-support-ops.js'), 'Reports page must load support ops workspace module.', failures);
assert(reportsHtml.includes('js/teacher/teacher-selectors.js'), 'Reports page must load shared teacher selector layer.', failures);
assert(reportsHtml.includes('teacher-dashboard.js'), 'Reports page must load the shared reports runtime controller.', failures);

assert(reportsJs.includes('initRuntimeState();'), 'App state initialization missing at boot.', failures);
assert(reportsJs.includes('WorkspaceCaseload'), 'Reports runtime must route caseload rendering through workspace module.', failures);
assert(reportsJs.includes('WorkspaceFocusShell'), 'Reports runtime must route focus shell rendering through workspace module.', failures);
assert(reportsJs.includes('WorkspaceStudentIntelligence'), 'Reports runtime must route student evidence/mastery rendering through workspace module.', failures);
assert(reportsJs.includes('WorkspaceSelection'), 'Reports runtime must route student selection orchestration through workspace module.', failures);
assert(reportsJs.includes('WorkspaceMeetingContent'), 'Reports runtime must route meeting content through workspace module.', failures);
assert(reportsJs.includes('WorkspaceSupportContent'), 'Reports runtime must route support content through workspace module.', failures);
assert(reportsJs.includes('WorkspaceDrawerContent'), 'Reports runtime must route drawer content through workspace module.', failures);
assert(reportsJs.includes('WorkspaceRecommendations'), 'Reports runtime must route recommendation rendering through workspace module.', failures);
assert(reportsJs.includes('WorkspaceSupportOps'), 'Reports runtime must route implementation/executive support through workspace module.', failures);
assert(reportsJs.includes('TeacherIntelligence'), 'Reports runtime must use shared teacher intelligence service.', failures);
assert(reportsJs.includes('TeacherSupportService'), 'Reports runtime must use shared teacher support service.', failures);
assert(reportsJs.includes('TeacherSearchService'), 'Reports runtime must use shared teacher search service.', failures);
assert(reportsJs.includes('ensureWorkspaceSearchService'), 'Reports runtime search service bootstrap missing.', failures);
assert(reportsJs.includes('TeacherIntelligence.buildTodayPlan'), 'Reports runtime must route today plan ranking through shared teacher intelligence service.', failures);
assert(reportsJs.includes('appState.set({ mode: next })'), 'Centralized mode state write missing.', failures);
assert(reportsJs.includes('WorkspaceSelection.selectStudent'), 'Centralized selected student selection flow missing.', failures);
assert(reportsJs.includes('openMeetingModal();'), 'Meeting generation path missing.', failures);
assert(reportsJs.includes('window.location.href = appendStudentParam("./" + target + ".html")'), 'Activity launch path guard missing.', failures);
assert(literacySequencer.includes('Word Connections'), 'Word Connections launch integrity guard failed: sequencer option missing.', failures);
assert(wordConnectionsEngine.includes('generateWordConnectionsRound'), 'Word Connections engine integrity guard failed.', failures);
assert(!reportsJs.includes('new URLSearchParams(window.location.search || "").get("role")'), 'Runtime URL role gating still active.', failures);
assert(!reportsJs.includes('function openReportModal('), 'Legacy report modal path still present.', failures);
assert(!reportsJs.includes('function openMeetingDeckMode('), 'Legacy meeting deck modal path still present.', failures);

assert(hubHtml.includes('id="th2-search"'), 'Teacher Hub global search input missing.', failures);
assert(hubHtml.includes('js/teacher-runtime-state.js'), 'Teacher Hub must load unified teacher runtime state.', failures);
assert(hubHtml.includes('js/search/teacher-search-index.js'), 'Teacher Hub must load teacher search index module.', failures);
assert(hubHtml.includes('js/search/teacher-search-service.js'), 'Teacher Hub must load teacher search service module.', failures);
assert(hubHtml.includes('js/teacher/teacher-selectors.js'), 'Teacher Hub must load shared teacher selector layer.', failures);
assert(hubHtml.includes('js/teacher/teacher-intelligence.js'), 'Teacher Hub must load shared teacher intelligence service.', failures);
assert(hubJs.includes('TeacherStorage.loadScheduleBlocks'), 'Teacher Hub must use canonical schedule store.', failures);
assert(hubJs.includes('TeacherSearchIndex'), 'Teacher Hub must route search through teacher search index.', failures);
assert(hubJs.includes('TeacherSearchService'), 'Teacher Hub must route search through teacher search service.', failures);
assert(hubJs.includes('TeacherSelectors'), 'Teacher Hub must use shared teacher selectors.', failures);
assert(hubJs.includes('TeacherIntelligence'), 'Teacher Hub must use shared teacher intelligence service.', failures);
assert(!hubJs.includes('localStorage.getItem("cs.lessonBrief.blocks.v1")'), 'Teacher Hub should not read lesson-brief block storage directly.', failures);

assert(runtimeState.includes('CSTeacherRuntimeState'), 'Unified teacher runtime state module missing.', failures);
assert(runtimeState.includes('active_class_context'), 'Unified teacher runtime state must track active class context.', failures);
assert(searchIndex.includes('CSTeacherSearchIndex'), 'Teacher search index module missing.', failures);
assert(searchService.includes('CSTeacherSearchService'), 'Teacher search service module missing.', failures);
assert(teacherSelectors.includes('CSTeacherSelectors'), 'Shared teacher selector module missing.', failures);
assert(teacherIntelligence.includes('CSTeacherIntelligence'), 'Shared teacher intelligence module missing.', failures);
assert(teacherSupportService.includes('CSTeacherSupportService'), 'Shared teacher support service module missing.', failures);
assert(teacherStorage.includes('cs.schedule.blocks.v1'), 'Canonical teacher schedule store key missing.', failures);
assert(teacherStorage.includes('migrateLessonBriefBlocks'), 'Legacy lesson-brief block migration missing.', failures);
assert(teacherStorage.includes('migrateLegacyTeacherData'), 'Canonical teacher storage migration entry point missing.', failures);
assert(teacherStorage.includes('cs.students.v1'), 'Canonical students store key missing.', failures);
assert(teacherStorage.includes('cs.session.logs.v1'), 'Canonical session log store key missing.', failures);

if (failures.length) {
  console.error('Guardrail checks failed:');
  failures.forEach((f, i) => console.error(`${i + 1}. ${f}`));
  process.exit(1);
}

console.log('Reports prep guardrail checks passed.');
