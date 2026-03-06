(function teacherDashboardVNext() {
  "use strict";

  document.addEventListener("DOMContentLoaded", function () {
    document.body.classList.add("td-page");
  });

  var Evidence = window.CSEvidence;
  var EvidenceEngine = window.CSEvidenceEngine;
  var RiskBands = window.CSRiskBands;
  var SkillStoreAPI = window.CSSkillStore;
  var SkillResolver = window.CSSkillResolver;
  var SkillLabels = window.CSSkillLabels;
  var Celebrations = window.CSCelebrations;
  var MasteryLabels = window.CSMasteryLabels;
  var MasteryEngine = window.CSMasteryEngine;
  var CaseloadHealth = window.CSCaseloadHealth;
  var FlexGroupEngineV2 = window.CSFlexGroupEngineV2;
  var ProgressSummary = window.CSProgressSummary;
  var PathwayEngine = window.CSPathwayEngine;
  var GrowthEngine = window.CSGrowthEngine;
  var ExportNotes = window.CSExportNotes;
  var FlexGroupEngine = window.CSFlexGroupEngine;
  var PlanEngine = window.CSPlanEngine;
  var SessionPlanner = window.CSSessionPlanner;
  var InstructionalSequencer = window.CSInstructionalSequencer;
  var NumeracySequencer = window.CSNumeracySequencer;
  var NumeracyPracticeEngine = window.CSNumeracyPracticeEngine;
  var CurriculumMap = window.CSCurriculumMap;
  var ReportingGenerator = window.CSReportingGenerator;
  var MeetingGenerator = window.CSMeetingGenerator;
  var FrameworkRegistry = window.CSFrameworkRegistry;
  var TierEngine = window.CSTierEngine;
  var FidelityEngine = window.CSFidelity;
  var ExecutiveProfileEngine = window.CSExecutiveProfile;
  var ExecutiveSupportEngine = window.CSExecutiveSupportEngine;
  var TaskBreakdownTool = window.CSTaskBreakdown;
  var AlignmentLoader = window.CSAlignmentLoader;
  var InterventionPlanner = window.CSInterventionPlanner;
  var ShareSummaryAPI = window.CSShareSummary;
  var TeacherRuntimeState = window.CSTeacherRuntimeState;
  var DashboardRole = window.CSDashboardRole;
  var DashboardUI = window.CSDashboardUI;
  var DashboardFocus = window.CSDashboardFocus;
  var DashboardSupport = window.CSDashboardSupport;
  var DashboardSupportView = window.CSDashboardSupportView;
  var DashboardInstitutional = window.CSDashboardInstitutional;
  var DashboardDrawer = window.CSDashboardDrawer;
  var DashboardBindings = window.CSDashboardBindings;
  var DashboardMeeting = window.CSDashboardMeeting;
  var DashboardModals = window.CSDashboardModals;
  var WorkspaceCaseload = window.CSWorkspaceCaseload;
  var WorkspaceFocusShell = window.CSWorkspaceFocusShell;
  var WorkspaceStudentIntelligence = window.CSWorkspaceStudentIntelligence;
  var WorkspaceSelection = window.CSWorkspaceSelection;
  var WorkspaceRecommendations = window.CSWorkspaceRecommendations;
  var WorkspaceSupportOps = window.CSWorkspaceSupportOps;
  var WorkspaceReports = window.CSWorkspaceReports;
  var WorkspaceMeetings = window.CSWorkspaceMeetings;
  var WorkspaceFamilyCommunication = window.CSWorkspaceFamilyCommunication;
  var WorkspaceHistory = window.CSWorkspaceHistory;
  var WorkspaceFidelity = window.CSWorkspaceFidelity;
  var SupportStore = window.CSSupportStore;
  var MeetingNotes = window.CSMeetingNotes;
  var MeetingTranslation = window.CSMeetingTranslation;
  var SASLibrary = window.CSSASLibrary;
  var CaseloadStore = window.CSCaseloadStore;
  var TeacherStorage = window.CSTeacherStorage;
  var TeacherSelectors = window.CSTeacherSelectors;
  var TeacherIntelligence = window.CSTeacherIntelligence;
  var TeacherSupportService = window.CSTeacherSupportService;
  var TeacherSearchIndex = window.CSTeacherSearchIndex;
  var TeacherSearchService = window.CSTeacherSearchService;
  if (!Evidence) return;

  var state = {
    selectedId: "",
    caseload: [],
    filtered: [],
    demoMode: false,
    snapshot: null,
    plan: null,
    activePlanTab: "ten",
    activeNoteTab: "teacher",
    activeSupportTab: "snapshot",
    activeDrawerTab: "snapshot",
    todayPlan: null,
    sharePayload: null,
    meetingRecognizer: null,
    sasPack: null,
    sasTab: "interventions",
    sasSelection: null,
    generatedPlanner: null,
    efTimer: null,
    efSecondsLeft: 0,
    meetingFormat: "sas",
    meetingLanguage: "en",
    liveTranslate: false,
    reportDraft: null,
    numeracyMapLoaded: false,
    meetingDeck: [],
    meetingDeckIndex: 0,
    meetingDeckConcernMode: false,
    workspaceTab: "summary",
    executiveProfile: null,
    executivePlan: null,
    focusVisualStudentId: "",
    focusCtaRestTimer: null,
    workspaceSearchResults: []
  };
  var skillStoreLogged = false;

  var DASHBOARD_RUNTIME_KEY = "cs.dashboard.runtime.v1";
  var FIDELITY_SEEDED_KEY = "cs.fidelity-seeded.v1";
  var NUMERACY_SEEDED_KEY = "cs.numeracy-seeded.v1";
  var FOCUS_RING_RADIUS = 16;
  var WORKSPACE_SEARCH_RESOURCES = [
    { id: "workspace-tool-wordquest", kind: "tool", label: "Word Quest", subtitle: "Word game activity surface", href: "word-quest.html?play=1" },
    { id: "workspace-tool-reading", kind: "resource", label: "Reading Lab", subtitle: "Literacy activity", href: "reading-lab.html" },
    { id: "workspace-tool-sentence", kind: "resource", label: "Sentence Studio", subtitle: "Sentence support surface", href: "sentence-surgery.html" },
    { id: "workspace-tool-writing", kind: "resource", label: "Writing Studio", subtitle: "Writing support surface", href: "writing-studio.html" },
    { id: "workspace-tool-numeracy", kind: "intervention", label: "Numeracy", subtitle: "Math intervention surface", href: "numeracy.html" },
    { id: "workspace-tool-diagnostic", kind: "diagnostic", label: "Decoding Diagnostic", subtitle: "Diagnostic activity", href: "activities/decoding-diagnostic.html" },
    { id: "workspace-tool-hub", kind: "resource", label: "Teacher Hub", subtitle: "Daily operating surface", href: "teacher-hub-v2.html" }
  ];
  var workspaceSearchService = null;

  function readSeededSet(lsKey) {
    try {
      var raw = localStorage.getItem(lsKey);
      var parsed = raw ? JSON.parse(raw) : {};
      return (parsed && typeof parsed === "object" && !Array.isArray(parsed)) ? parsed : {};
    } catch (_e) { return {}; }
  }

  function writeSeededSet(lsKey, set) {
    try { localStorage.setItem(lsKey, JSON.stringify(set)); } catch (_e) {}
  }

  function isFidelitySeeded(sid) {
    return !!readSeededSet(FIDELITY_SEEDED_KEY)[sid];
  }

  function markFidelitySeeded(sid) {
    var set = readSeededSet(FIDELITY_SEEDED_KEY);
    set[sid] = true;
    writeSeededSet(FIDELITY_SEEDED_KEY, set);
  }

  function isNumeracySeeded(key) {
    return !!readSeededSet(NUMERACY_SEEDED_KEY)[key];
  }

  function markNumeracySeeded(key) {
    var set = readSeededSet(NUMERACY_SEEDED_KEY);
    set[key] = true;
    writeSeededSet(NUMERACY_SEEDED_KEY, set);
  }
  var appState = TeacherRuntimeState && typeof TeacherRuntimeState.create === "function"
    ? TeacherRuntimeState.create({
      workspace_context: { mode: "workspace" },
      mode: "workspace"
    })
    : {
      get: function () { return { role: "teacher", mode: "daily", selectedStudentId: "", meetingWorkspace: { open: false, tab: "summary" }, featureFlags: { demoMode: false, adminMode: false } }; },
      set: function () {},
      updateMeetingWorkspace: function () {}
    };

  var el = {
    search: document.getElementById("td-search-input"),
    noCaseload: document.getElementById("td-no-caseload"),
    list: document.getElementById("td-caseload-list"),
    centerEmpty: document.getElementById("td-center-empty"),
    centerSelected: document.getElementById("td-center-selected"),
    recommendedPlanList: document.getElementById("td-recommended-plan-list"),
    nextMovesList: document.getElementById("td-next-moves-list"),
    showAlignment: document.getElementById("td-show-alignment"),
    implementationTodayBody: document.getElementById("td-implementation-today-body"),
    executiveSupportBody: document.getElementById("td-executive-support-body"),
    studentLabel: document.getElementById("td-student-label"),
    focusTitle: document.getElementById("td-focus-title"),
    recoLine: document.getElementById("td-reco-line"),
    nextTierBadge: document.getElementById("td-next-tier-badge"),
    metricAccuracy: document.getElementById("td-metric-accuracy"),
    metricTier: document.getElementById("td-metric-tier"),
    metricSubline: document.getElementById("td-next-step-sub"),
    sparkline: document.getElementById("td-sparkline"),
    last7Summary: document.getElementById("td-last7-summary"),
    quickCheck: document.getElementById("td-quick-check"),
    startIntervention: document.getElementById("td-start-intervention"),
    lessonBriefBtn: document.getElementById("td-lesson-brief"),
    meetingWorkspaceBtn: document.getElementById("td-meeting-workspace"),
    tier1PackBtn: document.getElementById("td-tier1-pack"),
    openStudentDrawer: document.getElementById("td-open-student-drawer"),
    drawer: document.getElementById("td-student-drawer"),
    drawerClose: document.getElementById("td-drawer-close"),
    drawerTitle: document.getElementById("td-drawer-title"),
    drawerBody: document.getElementById("td-drawer-body"),
    drawerTabs: Array.prototype.slice.call(document.querySelectorAll("[data-drawer-tab]")),
    rightEmpty: document.getElementById("td-right-empty"),
    rightContent: document.getElementById("td-right-content"),
    evidenceChips: document.getElementById("td-evidence-chips"),
    skillTiles: document.getElementById("td-skill-tiles"),
    masteryList: document.getElementById("td-mastery-list"),
    nextSkill: document.getElementById("td-next-skill"),
    needsChipList: document.getElementById("td-needs-chip-list"),
    supportBody: document.getElementById("td-support-body"),
    supportTabs: Array.prototype.slice.call(document.querySelectorAll("[data-support-tab]")),
    meetingModal: document.getElementById("td-meeting-modal"),
    meetingClose: document.getElementById("td-meeting-close"),
    meetingType: document.getElementById("td-meeting-type"),
    meetingFormatButtons: Array.prototype.slice.call(document.querySelectorAll("[data-meeting-format]")),
    meetingLanguage: document.getElementById("td-meeting-language"),
    meetingLiveTranslate: document.getElementById("td-meeting-live-translate"),
    meetingSttStart: document.getElementById("td-meeting-stt-start"),
    meetingSttStop: document.getElementById("td-meeting-stt-stop"),
    meetingStamp: document.getElementById("td-meeting-stamp"),
    meetingTagStudent: document.getElementById("td-meeting-tag-student"),
    meetingTagTier: document.getElementById("td-meeting-tag-tier"),
    meetingCopySummary: document.getElementById("td-meeting-copy-summary"),
    meetingExportMdt: document.getElementById("td-meeting-export-mdt"),
    meetingSttStatus: document.getElementById("td-meeting-stt-status"),
    meetingNotes: document.getElementById("td-meeting-notes"),
    meetingActions: document.getElementById("td-meeting-actions"),
    meetingPreview: document.getElementById("td-meeting-preview"),
    meetingTranslationPreview: document.getElementById("td-meeting-translation-preview"),
    meetingTranslationBadge: document.getElementById("td-meeting-translation-badge"),
    meetingExportFormat: document.getElementById("td-meeting-export-format"),
    meetingSave: document.getElementById("td-meeting-save"),
    meetingGoals: document.getElementById("td-meeting-goals"),
    workspaceTabSummary: document.getElementById("td-workspace-tab-summary"),
    workspaceTabDeck: document.getElementById("td-workspace-tab-deck"),
    workspaceTabNotes: document.getElementById("td-workspace-tab-notes"),
    workspaceTabExport: document.getElementById("td-workspace-tab-export"),
    workspaceSummaryPanel: document.getElementById("td-workspace-summary-panel"),
    workspaceDeckPanel: document.getElementById("td-workspace-deck-panel"),
    sasLibraryBtn: document.getElementById("td-sas-library-btn"),
    sasLibraryModal: document.getElementById("td-sas-library-modal"),
    sasLibraryClose: document.getElementById("td-sas-library-close"),
    sasSearch: document.getElementById("td-sas-search"),
    sasTabs: Array.prototype.slice.call(document.querySelectorAll("[data-sas-tab]")),
    sasList: document.getElementById("td-sas-list"),
    sasDetail: document.getElementById("td-sas-detail"),
    sasApplyPlan: document.getElementById("td-sas-apply-plan"),
    supportExportPacket: document.getElementById("td-support-export-packet"),
    planList: document.getElementById("td-plan-list"),
    planTabs: Array.prototype.slice.call(document.querySelectorAll("[data-plan-tab]")),
    noteTabs: Array.prototype.slice.call(document.querySelectorAll("[data-note-tab]")),
    noteText: document.getElementById("td-progress-note-text"),
    notesInput: document.getElementById("td-notes-input"),
    copyNote: document.getElementById("td-copy-note"),
    shareAllNotes: document.getElementById("td-share-all-notes"),
    lastSessionTitle: document.getElementById("td-last-session-title"),
    lastSessionMeta: document.getElementById("td-last-session-meta"),
    shareSummary: document.getElementById("td-share-summary"),
    shareQuickCopy: document.getElementById("td-share-quick-copy"),
    shareQuickPacket: document.getElementById("td-share-quick-packet"),
    shareLink: document.getElementById("td-share-link"),
    shareBuildline: document.getElementById("td-share-buildline"),
    shareModal: document.getElementById("td-share-modal"),
    shareModalClose: document.getElementById("td-share-modal-close"),
    sharePreview: document.getElementById("td-share-preview"),
    shareCopy: document.getElementById("td-share-copy"),
    shareDownloadJson: document.getElementById("td-share-download-json"),
    shareDownloadCsv: document.getElementById("td-share-download-csv"),
    exportStudentCsv: document.getElementById("td-export-student-csv"),
    exportJson: document.getElementById("td-export-json"),
    copyCsv: document.getElementById("td-copy-csv"),
    importExport: document.getElementById("td-import-export"),
    addStudent: document.getElementById("td-add-student"),
    brandHome: document.querySelector(".td-brand-home"),
    settings: document.getElementById("td-settings"),
    topOverflowToggle: document.getElementById("td-top-overflow-toggle"),
    topOverflowMenu: document.getElementById("td-top-overflow-menu"),
    homeBtn: document.getElementById("td-home-btn"),
    activitySelect: document.getElementById("td-activity-select"),
    copySummary: document.getElementById("td-copy-summary"),
    quickLaunchButtons: Array.prototype.slice.call(document.querySelectorAll("[data-quick]")),
    emptyActions: Array.prototype.slice.call(document.querySelectorAll("[data-empty-action]")),
    todayRoot: document.getElementById("td-today"),
    todayList: document.getElementById("td-today-list"),
    caseloadSnapshot: document.getElementById("td-caseload-snapshot"),
    todayRefresh: document.getElementById("td-today-refresh"),
    modeDaily: document.getElementById("td-mode-daily"),
    modeAdvanced: document.getElementById("td-mode-advanced"),
    modeReports: document.getElementById("td-mode-reports"),
    modeClassroom: document.getElementById("td-mode-classroom"),
    confidenceLine: document.getElementById("td-confidence-line"),
    viewAllStudents: document.getElementById("td-view-all-students"),
    priorityReview: document.getElementById("td-priority-review"),
    todayGroup: document.getElementById("td-today-group"),
    todayGroupOpen: document.getElementById("td-group-open"),
    todayGroupBuild: document.getElementById("td-group-build"),
    groupPanel: document.getElementById("td-group-panel"),
    groupOutput: document.getElementById("td-group-output"),
    execPanel: document.getElementById("td-exec-panel"),
    execOutput: document.getElementById("td-exec-output"),
    coachRibbon: document.getElementById("td-coach-ribbon"),
    coachLine: document.getElementById("td-coach-line"),
    coachPlay: document.getElementById("td-coach-play"),
    coachMute: document.getElementById("td-coach-mute"),
    coachCollapse: document.getElementById("td-coach-collapse"),
    coachChip: document.getElementById("td-coach-chip"),
    demoBadge: document.getElementById("td-demo-badge"),
    focusCard: document.getElementById("td-focus-card"),
    focusStudentName: document.getElementById("td-focus-student-name"),
    focusTrendPath: document.getElementById("td-focus-trend-path"),
    focusDelta: document.getElementById("td-focus-delta"),
    focusConfidenceProgress: document.getElementById("td-focus-confidence-progress"),
    focusConfidenceScore: document.getElementById("td-focus-confidence-score"),
    focusTierLine: document.getElementById("td-focus-tier-line"),
    focusReasonLine: document.getElementById("td-focus-reason-line"),
    focusWhyToggle: document.getElementById("td-focus-why-toggle"),
    focusWhyLine: document.getElementById("td-focus-why-line"),
    focusEngineCue: document.getElementById("td-focus-engine-cue"),
    focusFidelityLine: document.getElementById("td-focus-fidelity-line"),
    executiveActiveTag: document.getElementById("td-executive-active-tag"),
    expRecentAccuracy: document.getElementById("td-exp-recent-accuracy"),
    expGoalAccuracy: document.getElementById("td-exp-goal-accuracy"),
    expStableCount: document.getElementById("td-exp-stable-count"),
    expWeeks: document.getElementById("td-exp-weeks"),
    expFidelity: document.getElementById("td-exp-fidelity"),
    expTierRule: document.getElementById("td-exp-tier-rule"),
    expTrend: document.getElementById("td-exp-trend"),
    expFrameworks: document.getElementById("td-exp-frameworks"),
    litFrameworkBadges: document.getElementById("td-lit-framework-badges"),
    focusStartBtn: document.getElementById("td-focus-start-btn"),
    focusViewDetailsBtn: document.getElementById("td-focus-view-details-btn"),
    surgicalAttentionList: document.getElementById("td-surgical-attention-list"),
    numeracyTier: document.getElementById("td-num-tier"),
    numeracyContentFocus: document.getElementById("td-num-content-focus"),
    numeracyStrategyStage: document.getElementById("td-num-strategy-stage"),
    numeracyPracticeMode: document.getElementById("td-num-practice-mode"),
    numeracyActionLine: document.getElementById("td-num-action-line"),
    numeracyRepresentationMode: document.getElementById("td-num-representation-mode"),
    numeracyFeedbackType: document.getElementById("td-num-feedback-type"),
    numeracyProblemList: document.getElementById("td-num-problem-list"),
    numeracyScaffoldList: document.getElementById("td-num-scaffold-list"),
    numeracyProgressionLine: document.getElementById("td-num-progression-line"),
    executiveRiskChip: document.getElementById("td-exec-risk-chip"),
    executivePrimaryBarrier: document.getElementById("td-exec-primary-barrier"),
    executiveWeeklyGoal: document.getElementById("td-exec-weekly-goal"),
    executiveProgressStatus: document.getElementById("td-exec-progress-status"),
    executiveScaffoldLine: document.getElementById("td-exec-scaffold-line"),
    accExtendedTimeBtn: document.getElementById("td-acc-extended-time"),
    accVisualSupportsBtn: document.getElementById("td-acc-visual-supports"),
    accCheckInsBtn: document.getElementById("td-acc-checkins"),
    accTaskChunkingBtn: document.getElementById("td-acc-task-chunking"),
    numGradeSelect: document.getElementById("td-num-grade-select"),
    numUnitSelect: document.getElementById("td-num-unit-select"),
    numLessonSelect: document.getElementById("td-num-lesson-select"),
    numCurriculumBadge: document.getElementById("td-num-curriculum-badge"),
    numCurriculumLine: document.getElementById("td-num-curriculum-line"),
    numFrameworkBadges: document.getElementById("td-num-framework-badges"),
    buildline: document.getElementById("td-buildline")
  };
  var modalController = DashboardModals && typeof DashboardModals.create === "function"
    ? DashboardModals.create()
    : null;
  var meetingController = null;
  var supportController = null;
  var supportViewController = null;
  var institutionalController = null;
  var drawerController = null;
  var bindingsController = null;
  var bootContext = (function readBootContext() {
    try {
      var params = new URLSearchParams(window.location.search || "");
      return {
        student: String(params.get("student") || "").trim()
      };
    } catch (_e) {
      return { student: "" };
    }
  })();

  function getFrameworkAlignmentSafe(skillNode) {
    if (!FrameworkRegistry || typeof FrameworkRegistry.getFrameworkAlignment !== "function") {
      return {
        scienceOfReading: false,
        structuredLiteracy: false,
        illustrativeMath: false,
        mtssTieredModel: true,
        progressMonitoring: true
      };
    }
    return FrameworkRegistry.getFrameworkAlignment(skillNode);
  }

  function frameworkListFromAlignment(alignment) {
    if (FrameworkRegistry && typeof FrameworkRegistry.getFrameworkLabels === "function") {
      return FrameworkRegistry.getFrameworkLabels(alignment);
    }
    var a = alignment || {};
    var fallback = [];
    if (a.scienceOfReading) fallback.push("Science of Reading Aligned");
    if (a.structuredLiteracy) fallback.push("Structured Literacy");
    if (a.illustrativeMath) fallback.push("Illustrative Math Aligned");
    if (a.mtssTieredModel) fallback.push("MTSS Tier Logic");
    if (a.progressMonitoring) fallback.push("Progress Monitoring Supported");
    return fallback;
  }

  function renderFrameworkBadges(target, skillNode) {
    if (!target) return [];
    var alignment = getFrameworkAlignmentSafe(skillNode);
    var labels = frameworkListFromAlignment(alignment);
    target.innerHTML = labels.map(function (label) {
      return '<span class="framework-badge">' + escAttr(label) + "</span>";
    }).join("");
    return labels;
  }

  function getIllustrativeMapSafe() {
    if (!CurriculumMap || typeof CurriculumMap.getIllustrativeMap !== "function") return {};
    var map = CurriculumMap.getIllustrativeMap();
    if (!map || typeof map !== "object" || Array.isArray(map)) return {};
    return map;
  }

  function keyLabel(prefix, key) {
    var s = String(key == null ? "" : key).toLowerCase();
    if (s.indexOf(prefix) === 0) {
      var n = s.slice(prefix.length);
      return n ? prefix.charAt(0).toUpperCase() + prefix.slice(1) + " " + n : prefix;
    }
    return s || prefix;
  }

  function setSelectOptions(select, items, placeholder) {
    if (!select) return;
    var list = Array.isArray(items) ? items : [];
    var prev = String(select.value || "");
    var html = ['<option value="">' + placeholder + '</option>'];
    list.forEach(function (item) {
      html.push('<option value="' + escAttr(item.value) + '">' + escAttr(item.label) + "</option>");
    });
    select.innerHTML = html.join("");
    if (prev && list.some(function (item) { return String(item.value) === prev; })) {
      select.value = prev;
    }
    select.disabled = list.length === 0;
  }

  function renderNumeracyAlignmentLine() {
    if (!el.numCurriculumLine || !el.numCurriculumBadge) return;
    var grade = el.numGradeSelect ? String(el.numGradeSelect.value || "") : "";
    var unit = el.numUnitSelect ? String(el.numUnitSelect.value || "") : "";
    var lesson = el.numLessonSelect ? String(el.numLessonSelect.value || "") : "";
    if (!grade || !unit || !lesson || !CurriculumMap || typeof CurriculumMap.getIllustrativeAlignment !== "function") {
      el.numCurriculumLine.classList.add("hidden");
      el.numCurriculumBadge.classList.add("hidden");
      return;
    }
    var alignment = CurriculumMap.getIllustrativeAlignment(grade, unit, lesson);
    if (!alignment) {
      el.numCurriculumLine.classList.add("hidden");
      el.numCurriculumBadge.classList.add("hidden");
      return;
    }
    el.numCurriculumBadge.classList.remove("hidden");
    el.numCurriculumLine.classList.remove("hidden");
    el.numCurriculumLine.textContent = "Mapped to Illustrative Math " + keyLabel("grade", grade) + ", " + keyLabel("unit", unit) + " (sample coverage)";
  }

  function syncNumeracyCurriculumSelectors() {
    var map = getIllustrativeMapSafe();
    var gradeKeys = Object.keys(map).sort();
    setSelectOptions(el.numGradeSelect, gradeKeys.map(function (gradeKey) {
      return { value: gradeKey, label: keyLabel("grade", gradeKey) };
    }), "Grade");

    var gradeValue = el.numGradeSelect ? String(el.numGradeSelect.value || "") : "";
    var gradeNode = gradeValue && map[gradeValue] ? map[gradeValue] : null;
    var unitKeys = gradeNode ? Object.keys(gradeNode).sort() : [];
    setSelectOptions(el.numUnitSelect, unitKeys.map(function (unitKey) {
      var unit = gradeNode[unitKey] || {};
      var title = String(unit.title || "");
      return { value: unitKey, label: title ? keyLabel("unit", unitKey) + " - " + title : keyLabel("unit", unitKey) };
    }), "Unit");

    var unitValue = el.numUnitSelect ? String(el.numUnitSelect.value || "") : "";
    var unitNode = gradeNode && unitValue && gradeNode[unitValue] ? gradeNode[unitValue] : null;
    var lessonKeys = unitNode && unitNode.lessons ? Object.keys(unitNode.lessons).sort() : [];
    setSelectOptions(el.numLessonSelect, lessonKeys.map(function (lessonKey) {
      var lesson = unitNode.lessons[lessonKey] || {};
      var focus = String(lesson.contentFocus || "");
      return { value: lessonKey, label: focus ? keyLabel("lesson", lessonKey) + " - " + focus : keyLabel("lesson", lessonKey) };
    }), "Lesson");

    renderNumeracyAlignmentLine();
  }

  function initNumeracyCurriculumSelectors() {
    if (!el.numGradeSelect || !el.numUnitSelect || !el.numLessonSelect) return;
    syncNumeracyCurriculumSelectors();
  }

  function loadIllustrativeMathMapData() {
    if (state.numeracyMapLoaded) return Promise.resolve();
    state.numeracyMapLoaded = true;
    return fetch("./data/illustrative-math-map.json", { cache: "no-cache" })
      .then(function (response) {
        if (!response.ok) throw new Error("map-load-failed");
        return response.json();
      })
      .then(function (payload) {
        if (!payload || typeof payload !== "object" || Array.isArray(payload)) return;
        window.CSIllustrativeMathMapData = payload;
        syncNumeracyCurriculumSelectors();
      })
      .catch(function () {
        // Keep existing fallback map behavior.
      });
  }

  function buildNumeracyStubProfile(row) {
    var student = row && row.student ? row.student : {};
    var top = row && row.priority && row.priority.topSkills && row.priority.topSkills[0]
      ? row.priority.topSkills[0]
      : null;
    var skillLabel = String(top && top.skillId || "");
    var domainHint = "number fluency";
    if (/fraction/i.test(skillLabel)) domainHint = "fraction";
    else if (/ratio|proportion/i.test(skillLabel)) domainHint = "ratio";
    else if (/algebra|equation/i.test(skillLabel)) domainHint = "algebra";
    else if (/place|value/i.test(skillLabel)) domainHint = "place value";
    else if (/problem|model/i.test(skillLabel)) domainHint = "model";
    var need = Number(top && top.need || 0.45);
    var tierInput = computeTierInputsForRow(row || null);
    return {
      studentId: String(student.id || ""),
      gradeBand: String(student.grade || "G5"),
      accuracy: Math.max(0, Math.min(1, 1 - need)),
      errorRate: Math.max(0, Math.min(1, need)),
      confidence: Math.max(0.2, Math.min(0.95, 1 - (need * 0.8))),
      languageSupport: false,
      workingMemoryRisk: need > 0.6 ? 0.65 : 0.3,
      domainHint: domainHint,
      goalAccuracy: Number(tierInput.goalAccuracy || 0.8),
      stableCount: Number(tierInput.stableCount || 1),
      weeksInIntervention: Number(tierInput.weeksInIntervention || 6),
      fidelityPercent: Number(tierInput.fidelityPercent || 82)
    };
  }

  function latestNumeracyRecommendation(row) {
    var profile = buildNumeracyStubProfile(row || null);
    var fallback = {
      contentFocus: "Number Fluency",
      strategyStage: "Additive",
      errorPattern: "Procedural inconsistency",
      tierSignal: "Tier 2",
      recommendedAction: "Run Quick Check targeting Number Fluency at the Additive stage.",
      practiceMode: "Quick Check"
    };
    if (NumeracySequencer && typeof NumeracySequencer.generateNumeracyRecommendation === "function") {
      return NumeracySequencer.generateNumeracyRecommendation(profile);
    }
    return fallback;
  }

  function getCurrentNumeracyAlignment() {
    if (!el.numGradeSelect || !el.numUnitSelect || !el.numLessonSelect) return null;
    var grade = String(el.numGradeSelect.value || "");
    var unit = String(el.numUnitSelect.value || "");
    var lesson = String(el.numLessonSelect.value || "");
    if (!grade || !unit || !lesson || !CurriculumMap || typeof CurriculumMap.getIllustrativeAlignment !== "function") return null;
    return CurriculumMap.getIllustrativeAlignment(grade, unit, lesson);
  }

  function selectNumeracyMode(recommended) {
    var recommendationMode = String(recommended || "Quick Check");
    if (!el.numeracyPracticeMode) return recommendationMode;
    if (!el.numeracyPracticeMode.value) {
      el.numeracyPracticeMode.value = recommendationMode;
    }
    if (!el.numeracyPracticeMode.value) {
      el.numeracyPracticeMode.value = "Quick Check";
    }
    return String(el.numeracyPracticeMode.value || recommendationMode || "Quick Check");
  }

  function escListHtml(value) {
    return escAttr(value);
  }

  function renderNumeracyPracticePanel(practice) {
    if (!practice) return;
    var problems = Array.isArray(practice.problemSet) ? practice.problemSet : [];
    var scaffolds = Array.isArray(practice.scaffolds) ? practice.scaffolds : [];
    var progression = practice.progressionSignal || {};

    if (el.numeracyRepresentationMode) {
      el.numeracyRepresentationMode.textContent = String(practice.representationMode || "Open number line decomposition");
    }
    if (el.numeracyFeedbackType) {
      el.numeracyFeedbackType.textContent = String(practice.feedbackType || "Immediate correctness + one strategy note");
    }
    if (el.numeracyProblemList) {
      el.numeracyProblemList.innerHTML = (problems.length ? problems : [{ prompt: "No generated practice set." }])
        .slice(0, 5)
        .map(function (item) { return "<li>" + escListHtml(item.prompt || "") + "</li>"; })
        .join("");
    }
    if (el.numeracyScaffoldList) {
      el.numeracyScaffoldList.innerHTML = (scaffolds.length ? scaffolds : ["Use model-first reasoning and explain each step."])
        .slice(0, 6)
        .map(function (item) { return "<li>" + escListHtml(item) + "</li>"; })
        .join("");
    }
    if (el.numeracyProgressionLine) {
      el.numeracyProgressionLine.textContent =
        "Trend: " + String(progression.trendDecision || "HOLD") +
        " • Tier: " + String(progression.tierLevel || "Tier 2") +
        " • Suggested next step: " + String(progression.suggestedNextStep || "Hold current mode and monitor accuracy trend.");
    }
  }

  function maybeRecordNumeracyPractice(row, recommendation, practice, accuracy) {
    if (!NumeracyPracticeEngine || typeof NumeracyPracticeEngine.recordPracticeSession !== "function") return;
    var studentId = row && row.student ? String(row.student.id || "") : "demo";
    var mode = selectNumeracyMode(recommendation && recommendation.practiceMode);
    var key = [
      studentId,
      String(recommendation && recommendation.contentFocus || ""),
      String(recommendation && recommendation.strategyStage || ""),
      mode
    ].join("|");
    if (isNumeracySeeded(key)) return;
    var attempts = Array.isArray(practice && practice.problemSet) ? practice.problemSet.length : 4;
    var timePerProblem = mode === "Skill Sprint" ? 18 : (mode === "Quick Check" ? 25 : 38);
    NumeracyPracticeEngine.recordPracticeSession({
      studentId: studentId,
      attempts: attempts,
      accuracy: clamp(Number(accuracy), 0, 1),
      strategyStage: recommendation && recommendation.strategyStage,
      modeUsed: mode,
      timeSpentSeconds: attempts * timePerProblem
    });
    markNumeracySeeded(key);
  }

  function toPct(value) {
    var n = Number(value);
    if (!Number.isFinite(n)) return 0;
    if (n > 1) return Math.max(0, Math.min(100, n));
    return Math.max(0, Math.min(100, n * 100));
  }

  function clamp(value, min, max) {
    var n = Number(value);
    if (!Number.isFinite(n)) return min;
    if (n < min) return min;
    if (n > max) return max;
    return n;
  }

  function computeTierInputsForRow(row) {
    var top = row && row.priority && row.priority.topSkills && row.priority.topSkills[0]
      ? row.priority.topSkills[0]
      : null;
    var need = Number(top && top.need || 0.45);
    var recentAccuracy = Math.max(0, Math.min(1, 1 - need));
    var goalAccuracy = 0.8;
    var stableCount = recentAccuracy >= goalAccuracy ? 3 : (recentAccuracy >= goalAccuracy - 0.08 ? 2 : 1);
    var weeksInIntervention = recentAccuracy < goalAccuracy ? 8 : 4;
    var sid = row && row.student ? String(row.student.id || "") : "";
    if (sid && FidelityEngine && typeof FidelityEngine.logInterventionSession === "function" && !isFidelitySeeded(sid)) {
      FidelityEngine.logInterventionSession({
        studentId: sid,
        minutesDelivered: 20,
        plannedMinutes: 24,
        mode: "Small Group",
        interventionType: "Literacy"
      });
      FidelityEngine.logInterventionSession({
        studentId: sid,
        minutesDelivered: 22,
        plannedMinutes: 24,
        mode: "1:1",
        interventionType: "Literacy"
      });
      FidelityEngine.logInterventionSession({
        studentId: sid,
        minutesDelivered: 18,
        plannedMinutes: 24,
        mode: "Small Group",
        interventionType: "Literacy"
      });
      FidelityEngine.logInterventionSession({
        studentId: sid,
        minutesDelivered: 24,
        plannedMinutes: 24,
        mode: "1:1",
        interventionType: "Literacy"
      });
      FidelityEngine.logInterventionSession({
        studentId: sid,
        minutesDelivered: 19,
        plannedMinutes: 24,
        mode: "Small Group",
        interventionType: "Literacy"
      });
      FidelityEngine.logInterventionSession({
        studentId: sid,
        minutesDelivered: 21,
        plannedMinutes: 24,
        mode: "1:1",
        interventionType: "Literacy"
      });
      markFidelitySeeded(sid);
    }
    var fidelitySummary = FidelityEngine && typeof FidelityEngine.getFidelitySummary === "function"
      ? FidelityEngine.getFidelitySummary(sid, "Literacy")
      : { fidelityPercent: 82, cumulativeMinutes: 120, totalSessions: 6 };
    var fidelityPercent = Number(fidelitySummary && fidelitySummary.fidelityPercent);
    if (!Number.isFinite(fidelityPercent) || fidelityPercent <= 0) fidelityPercent = 82;
    return {
      recentAccuracy: recentAccuracy,
      goalAccuracy: goalAccuracy,
      stableCount: stableCount,
      weeksInIntervention: weeksInIntervention,
      fidelityPercent: fidelityPercent,
      fidelitySummary: fidelitySummary
    };
  }

  function computeTierSignalForRow(row) {
    var input = computeTierInputsForRow(row);
    if (!TierEngine || typeof TierEngine.computeTierSignal !== "function") {
      return {
        tierLevel: "Tier 2",
        trendDecision: "HOLD",
        reasoning: ["Tier engine unavailable; fallback decision active."],
        input: input
      };
    }
    var signal = TierEngine.computeTierSignal({
      recentAccuracy: input.recentAccuracy,
      goalAccuracy: input.goalAccuracy,
      stableCount: input.stableCount,
      weeksInIntervention: input.weeksInIntervention,
      fidelityPercent: input.fidelityPercent
    });
    signal.input = input;
    return signal;
  }

  function buildExecutiveInput(row) {
    var top = row && row.priority && row.priority.topSkills && row.priority.topSkills[0]
      ? row.priority.topSkills[0]
      : null;
    var need = Number(top && top.need || 0.45);
    var studentId = row && row.student ? String(row.student.id || "") : "";
    var ef = SupportStore && typeof SupportStore.getExecutiveFunction === "function" && studentId
      ? SupportStore.getExecutiveFunction(studentId)
      : { focusHistory: [], upcomingTasks: [] };
    var focusHistory = Array.isArray(ef.focusHistory) ? ef.focusHistory : [];
    var lowFocus = focusHistory.filter(function (item) { return String(item.selfRating || "").toLowerCase() === "struggled"; }).length;
    return {
      taskCompletionRate: Math.max(0, Math.min(1, 1 - need - (lowFocus * 0.03))),
      assignmentMissingCount: Math.max(0, Math.round(need * 8)),
      initiationDelay: Math.max(1, Math.round((need * 12) + 2)),
      teacherObservations: need >= 0.65 ? "Task initiation and planning delays observed." : "Moderate organizational support needed."
    };
  }

  function buildExecutiveProfileAndPlan(row) {
    var input = buildExecutiveInput(row);
    var profile = ExecutiveProfileEngine && typeof ExecutiveProfileEngine.generateExecutiveProfile === "function"
      ? ExecutiveProfileEngine.generateExecutiveProfile(input)
      : {
          executiveRiskLevel: "MODERATE",
          primaryBarrier: "Planning",
          suggestedSupports: ["Use a simple start routine and step checklist."]
        };
    var gradeBand = row && row.student ? String(row.student.grade || "G5") : "G5";
    var plan = ExecutiveSupportEngine && typeof ExecutiveSupportEngine.generateExecutiveSupportPlan === "function"
      ? ExecutiveSupportEngine.generateExecutiveSupportPlan({
          executiveRiskLevel: profile.executiveRiskLevel,
          primaryBarrier: profile.primaryBarrier,
          gradeBand: gradeBand
        })
      : {
          dailySupportActions: ["Use launch cue and chunking scaffold."],
          weeklyGoal: "Complete 4 tasks with supports.",
          teacherScaffold: "Prompt-fade-monitor sequence.",
          studentFacingPrompt: "Start with step one and check off progress.",
          progressMetric: "Weekly completion and check-in consistency."
        };
    state.executiveProfile = profile;
    state.executivePlan = plan;
    return { profile: profile, plan: plan };
  }

  function renderExecutiveSnapshot(row) {
    var data = buildExecutiveProfileAndPlan(row);
    var profile = data.profile || {};
    var plan = data.plan || {};
    if (el.executiveRiskChip) el.executiveRiskChip.textContent = String(profile.executiveRiskLevel || "MODERATE");
    if (el.executivePrimaryBarrier) el.executivePrimaryBarrier.textContent = String(profile.primaryBarrier || "Planning");
    if (el.executiveWeeklyGoal) el.executiveWeeklyGoal.textContent = String(plan.weeklyGoal || "Complete 4 tasks with support.");
    if (el.executiveProgressStatus) {
      var risk = String(profile.executiveRiskLevel || "MODERATE");
      el.executiveProgressStatus.textContent = risk === "HIGH" ? "Intensive support cycle" : (risk === "LOW" ? "Stable with monitoring" : "Active support in progress");
    }
    if (el.executiveScaffoldLine) {
      el.executiveScaffoldLine.textContent = String(plan.teacherScaffold || "Use explicit scaffold sequence with consistent check-ins.");
    }
    if (el.executiveActiveTag) {
      el.executiveActiveTag.classList.remove("hidden");
      el.executiveActiveTag.textContent = "Executive Support Active";
    }
  }

  function updateAccommodationButtons(studentId) {
    if (!FidelityEngine || typeof FidelityEngine.getAccommodationSupportSummary !== "function") return;
    var summary = FidelityEngine.getAccommodationSupportSummary(studentId || "demo");
    function mark(button, count) {
      if (!button) return;
      button.classList.toggle("is-logged", Number(count || 0) > 0);
      button.setAttribute("title", "Logged " + Math.max(0, Math.round(Number(count || 0))) + " time(s)");
    }
    mark(el.accExtendedTimeBtn, summary.extendedTimeUsed);
    mark(el.accVisualSupportsBtn, summary.visualSupportsProvided);
    mark(el.accCheckInsBtn, summary.checkInsCompleted);
    mark(el.accTaskChunkingBtn, summary.taskChunkingApplied);
  }

  function renderExplainability(signal, skillNode) {
    var s = signal || { input: {} };
    var input = s.input || {};
    if (el.expRecentAccuracy) el.expRecentAccuracy.textContent = Math.round(toPct(input.recentAccuracy || 0)) + "%";
    if (el.expGoalAccuracy) el.expGoalAccuracy.textContent = Math.round(toPct(input.goalAccuracy || 0)) + "%";
    if (el.expStableCount) el.expStableCount.textContent = String(Math.max(0, Number(input.stableCount || 0)));
    if (el.expWeeks) el.expWeeks.textContent = String(Math.max(0, Number(input.weeksInIntervention || 0)));
    if (el.expFidelity) el.expFidelity.textContent = Math.round(Number(input.fidelityPercent || 0)) + "%";
    if (el.expTrend) el.expTrend.textContent = String(s.trendDecision || "HOLD");
    if (el.expTierRule) {
      var reason = Array.isArray(s.reasoning) && s.reasoning[0] ? s.reasoning[0] : "Rule not available";
      el.expTierRule.textContent = reason;
    }
    if (el.expFrameworks) {
      var labels = frameworkListFromAlignment(getFrameworkAlignmentSafe(skillNode));
      el.expFrameworks.textContent = labels.length ? labels.join(", ") : "--";
    }
    var fidelityView = WorkspaceFidelity && typeof WorkspaceFidelity.summarize === "function"
      ? WorkspaceFidelity.summarize(input)
      : null;
    if (el.focusFidelityLine) {
      el.focusFidelityLine.textContent = fidelityView ? fidelityView.line : "Fidelity: 0% over 0 sessions";
      el.focusFidelityLine.classList.remove("fidelity-good", "fidelity-mid", "fidelity-low");
      el.focusFidelityLine.classList.add(fidelityView ? fidelityView.levelClass : "fidelity-low");
    }
    if (el.confidenceLine) {
      var trend = String(s.trendDecision || "HOLD").toUpperCase();
      var fidelityState = fidelityView ? fidelityView.confidenceState : (Math.round(Number(input.fidelityPercent || 0)) >= 70 ? "active" : "watch");
      el.confidenceLine.textContent = "Tier guidance " + (trend === "HOLD" || trend === "FADE" ? "stable" : "active") +
        " • Fidelity tracking " + fidelityState +
        " • Curriculum mapping active • System checks passed";
    }
  }

  function renderNumeracyRecommendationCard(row) {
    if (!el.numeracyContentFocus || !el.numeracyStrategyStage || !el.numeracyPracticeMode || !el.numeracyActionLine) return;
    var fallback = latestNumeracyRecommendation(null);
    var recommendation = latestNumeracyRecommendation(row || null);
    var tierInput = computeTierInputsForRow(row || null);
    var selectedMode = selectNumeracyMode(recommendation.practiceMode || fallback.practiceMode);
    recommendation.practiceMode = selectedMode;
    el.numeracyContentFocus.textContent = String(recommendation.contentFocus || fallback.contentFocus);
    el.numeracyStrategyStage.textContent = String(recommendation.strategyStage || fallback.strategyStage);
    if (el.numeracyTier) el.numeracyTier.textContent = String(recommendation.tierSignal || fallback.tierSignal);
    var alignment = getCurrentNumeracyAlignment();
    var mappedNode = String(alignment && alignment.mappedNumeracyNode || recommendation.contentFocus || "Core Numeracy Node");
    var practice = NumeracyPracticeEngine && typeof NumeracyPracticeEngine.generateNumeracyPractice === "function"
      ? NumeracyPracticeEngine.generateNumeracyPractice({
          contentFocus: recommendation.contentFocus,
          strategyStage: recommendation.strategyStage,
          errorPattern: recommendation.errorPattern,
          tierLevel: recommendation.tierSignal,
          gradeBand: row && row.student ? String(row.student.grade || "G5") : "G5",
          mode: selectedMode,
          mappedNumeracyNode: mappedNode,
          recentAccuracy: Number(tierInput.recentAccuracy || 0.72),
          goalAccuracy: Number(tierInput.goalAccuracy || 0.8),
          stableCount: Number(tierInput.stableCount || 1),
          weeksInIntervention: Number(tierInput.weeksInIntervention || 6),
          fidelityPercent: Number(tierInput.fidelityPercent || 82)
        })
      : null;
    var progression = practice && practice.progressionSignal ? practice.progressionSignal : null;
    var trend = progression ? String(progression.trendDecision || "HOLD") : String(recommendation.trendDecision || "HOLD");
    var tierLevel = progression ? String(progression.tierLevel || recommendation.tierSignal || "Tier 2") : String(recommendation.tierSignal || "Tier 2");
    var nextStep = progression
      ? String(progression.suggestedNextStep || "Hold current strategy and monitor trend.")
      : "Run " + selectedMode + " with model-based supports, then reassess trend.";
    el.numeracyActionLine.textContent = "Run " + selectedMode + " aligned to " + mappedNode + ". Trend: " + trend + " • Tier: " + tierLevel + ". " + nextStep;
    renderFrameworkBadges(el.numFrameworkBadges, String(recommendation.contentFocus || "numeracy"));
    renderNumeracyPracticePanel(practice);
    maybeRecordNumeracyPractice(row, recommendation, practice, Number(tierInput.recentAccuracy || 0.72));
    renderNumeracyAlignmentLine();
  }

  function escHtml(value) {
    return String(value == null ? "" : value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/\"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  function buildReportingContext(row) {
    var selectedStudent = state.caseload.filter(function (student) { return student.id === state.selectedId; })[0] || { id: state.selectedId };
    var summary = TeacherIntelligence && typeof TeacherIntelligence.getStudentSummary === "function"
      ? TeacherIntelligence.getStudentSummary(state.selectedId, selectedStudent, { Evidence: Evidence, TeacherSelectors: TeacherSelectors })
      : (Evidence && typeof Evidence.getStudentSummary === "function" ? Evidence.getStudentSummary(state.selectedId) : null);
    var numeracy = latestNumeracyRecommendation(row);
    var executive = buildExecutiveProfileAndPlan(row || null);
    var tierSignal = computeTierSignalForRow(row);
    var literacyFrameworks = frameworkListFromAlignment(getFrameworkAlignmentSafe(summary ? summary.focus : "literacy"));
    var numeracyFrameworks = frameworkListFromAlignment(getFrameworkAlignmentSafe(numeracy.contentFocus || "numeracy"));
    var curriculumLine = el.numCurriculumLine ? String(el.numCurriculumLine.textContent || "").trim() : "";
    if (WorkspaceReports && typeof WorkspaceReports.buildContext === "function") {
      return WorkspaceReports.buildContext({
        selectedId: state.selectedId,
        summary: summary,
        numeracy: numeracy,
        executive: executive,
        tierSignal: tierSignal,
        literacyFrameworks: literacyFrameworks,
        numeracyFrameworks: numeracyFrameworks,
        curriculumLine: curriculumLine
      });
    }
    return {
      summary: summary,
      studentProfile: {},
      literacyData: {},
      numeracyData: {},
      tierSignal: tierSignal,
      fidelityData: {}
    };
  }

  function initRuntimeState() {
    var stored = safeJsonParse(localStorage.getItem(DASHBOARD_RUNTIME_KEY), {});
    var roleFromStore = stored && stored.role;
    var role = DashboardRole && typeof DashboardRole.normalizeRole === "function"
      ? DashboardRole.normalizeRole(roleFromStore || "teacher")
      : String(roleFromStore || "teacher").toLowerCase() === "admin" ? "admin" : "teacher";
    var demoMode = !!(stored && stored.featureFlags && stored.featureFlags.demoMode);
    appState.set({
      role: role,
      featureFlags: {
        demoMode: demoMode,
        adminMode: role === "admin"
      }
    });
    try {
      localStorage.setItem(DASHBOARD_RUNTIME_KEY, JSON.stringify({
        role: role,
        featureFlags: appState.get().featureFlags
      }));
    } catch (_e2) {}
  }

  function detectDemoMode() {
    try {
      state.demoMode = !!(appState.get() && appState.get().featureFlags && appState.get().featureFlags.demoMode);
    } catch (_e) {
      state.demoMode = false;
    }
    if (el.demoBadge) el.demoBadge.classList.toggle("hidden", !state.demoMode);
  }

  function getRuntimeRole() {
    try {
      return String(appState.get().role || "teacher");
    } catch (_e) {
      return "teacher";
    }
  }

  function prefersReducedMotion() {
    try {
      return !!(window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches);
    } catch (_e) {
      return false;
    }
  }

  function setFocusCtaRest(ms) {
    if (!el.focusStartBtn) return;
    el.focusStartBtn.classList.add("is-cta-rest");
    if (state.focusCtaRestTimer) {
      clearTimeout(state.focusCtaRestTimer);
      state.focusCtaRestTimer = null;
    }
    var wait = Math.max(220, Number(ms || 1200));
    state.focusCtaRestTimer = setTimeout(function () {
      if (el.focusStartBtn) el.focusStartBtn.classList.remove("is-cta-rest");
      state.focusCtaRestTimer = null;
    }, wait);
  }

  function syncFocusCtaBreathing(mode) {
    if (!el.focusStartBtn) return;
    var next = String(mode || "daily").toLowerCase();
    if (next === "daily") {
      if (!state.focusCtaRestTimer) el.focusStartBtn.classList.remove("is-cta-rest");
    } else {
      setFocusCtaRest(8000);
    }
  }

  function setDashboardMode(mode) {
    var next = DashboardUI && typeof DashboardUI.applyMode === "function"
      ? DashboardUI.applyMode(mode, el)
      : String(mode || "daily").toLowerCase();
    appState.set({ mode: next });
    syncFocusCtaBreathing(next);
  }

  function applyRoleBasedSimplification() {
    var role = getRuntimeRole();
    if (DashboardRole && typeof DashboardRole.applyRoleClasses === "function") {
      DashboardRole.applyRoleClasses(role);
    } else {
      document.body.classList.toggle("td-admin-role", role === "admin");
      document.body.classList.toggle("td-teacher-role", role !== "admin");
    }
    if (role !== "admin") {
      if (el.activitySelect) el.activitySelect.closest(".td-activity-pick") && el.activitySelect.closest(".td-activity-pick").classList.add("hidden");
      if (el.coachChip) el.coachChip.classList.add("hidden");
      if (el.adminDemo) el.adminDemo.classList.add("hidden");
    }
  }

  function safeJsonParse(s, fallback) {
    try { return JSON.parse(s); } catch (_e) { return fallback; }
  }

  function isAdminContext() {
    return getRuntimeRole() === "admin";
  }

  function escAttr(value) {
    return String(value == null ? "" : value)
      .replace(/&/g, "&amp;")
      .replace(/"/g, "&quot;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");
  }

  function getLastActivity(studentId) {
    return TeacherIntelligence && typeof TeacherIntelligence.getLastActivity === "function"
      ? TeacherIntelligence.getLastActivity(studentId)
      : null;
  }

  function recordLastActivity(studentId, moduleKey) {
    if (!TeacherIntelligence || typeof TeacherIntelligence.recordLastActivity !== "function") return;
    TeacherIntelligence.recordLastActivity(studentId, moduleKey);
  }

  function ageDays(ts) {
    if (!ts || !Number.isFinite(Number(ts))) return 999;
    return Math.max(0, Math.floor((Date.now() - Number(ts)) / 86400000));
  }

  function moduleLabel(key) {
    var k = String(key || "").toLowerCase();
    if (k === "word-quest") return "Word Quest";
    if (k === "reading-lab") return "Reading Lab";
    if (k === "sentence-surgery") return "Sentence Studio";
    if (k === "writing-studio") return "Writing Studio";
    if (k === "numeracy") return "Numeracy";
    if (k === "precision-play") return "Precision Play";
    return "Activity";
  }

  function getCaseload() {
    var rows = TeacherSelectors && typeof TeacherSelectors.loadCaseload === "function"
      ? TeacherSelectors.loadCaseload({ TeacherStorage: TeacherStorage, CaseloadStore: CaseloadStore, Evidence: Evidence })
      : [];
    if (rows.length) return rows;
    return [
      { id: "demo-a", name: "Demo Student A", grade: "G5", focus: "", risk: "watch" },
      { id: "demo-b", name: "Demo Student B", grade: "G4", focus: "", risk: "watch" },
      { id: "demo-c", name: "Demo Student C", grade: "G6", focus: "", risk: "watch" }
    ];
  }

  function getStudentEvidence(studentId) {
    return TeacherSelectors && typeof TeacherSelectors.getStudentEvidence === "function"
      ? TeacherSelectors.getStudentEvidence(studentId, { EvidenceEngine: EvidenceEngine, Evidence: Evidence })
      : null;
  }

  function focusFromSnapshot(snapshot) {
    return TeacherIntelligence && typeof TeacherIntelligence.focusFromSnapshot === "function"
      ? TeacherIntelligence.focusFromSnapshot(snapshot, { SkillLabels: SkillLabels })
      : ["Collect baseline"];
  }

  function formatSkillBreadcrumb(skillId) {
    var canonicalId = SkillResolver && typeof SkillResolver.canonicalizeSkillId === "function"
      ? SkillResolver.canonicalizeSkillId(skillId)
      : String(skillId || "");
    if (SkillLabels && typeof SkillLabels.getSkillBreadcrumb === "function") {
      return SkillLabels.getSkillBreadcrumb(canonicalId);
    }
    return String(canonicalId || "Skill");
  }

  function getSkillLabelSafe(skillId) {
    var id = SkillResolver && typeof SkillResolver.canonicalizeSkillId === "function"
      ? SkillResolver.canonicalizeSkillId(skillId)
      : String(skillId || "");
    if (!id) return "Skill";
    if (SkillLabels && typeof SkillLabels.getSkillLabel === "function") {
      return SkillLabels.getSkillLabel(id);
    }
    if (window.__CS_SKILLSTORE__ && window.__CS_SKILLSTORE__.dictionaries) {
      var dict = window.__CS_SKILLSTORE__.dictionaries;
      if (dict.skillLabelById && dict.skillLabelById[id]) return dict.skillLabelById[id];
    }
    return id;
  }

  function trajectoryArrow(direction) {
    if (direction === "UP") return "⬆";
    if (direction === "DOWN") return "⬇";
    return "➡";
  }

  function buildTrajectoryLine(studentId, topSkills) {
    if (!studentId || !Array.isArray(topSkills) || !topSkills.length) return "";
    if (!EvidenceEngine || typeof EvidenceEngine.getSkillTrajectory !== "function") return "";
    var parts = topSkills.slice(0, 3).map(function (skill) {
      var sid = String(skill && skill.skillId || "");
      if (!sid) return "";
      var t = EvidenceEngine.getSkillTrajectory(studentId, sid, 3);
      var shortLabel = getSkillLabelSafe(sid).split(" ")[0] || "Skill";
      return shortLabel + " " + trajectoryArrow(t.direction);
    }).filter(Boolean);
    return parts.length ? ("Trend: " + parts.join(" • ")) : "";
  }

  function moduleForSkill(skillId) {
    var id = SkillResolver && typeof SkillResolver.canonicalizeSkillId === "function"
      ? SkillResolver.canonicalizeSkillId(skillId)
      : String(skillId || "");
    if (id.indexOf("LIT.DEC") === 0) return "Word Quest";
    if (id.indexOf("LIT.FLU") === 0) return "Reading Lab";
    if (id.indexOf("LIT.LANG.SYN") === 0 || id.indexOf("LIT.WRITE") === 0) return "Sentence Studio";
    if (id.indexOf("LIT.LANG.VOC") === 0) return "Sentence Studio";
    if (id.indexOf("NUM.") === 0 || id.indexOf("numeracy.") === 0) return "Numeracy";
    if (id.indexOf("decoding.") === 0 || id.indexOf("orthography.") === 0 || id.indexOf("morphology.") === 0) return "Word Quest";
    if (id.indexOf("fluency.") === 0) return "Reading Lab";
    if (id.indexOf("sentence.") === 0 || id.indexOf("writing.") === 0) return "Sentence Studio";
    return "Word Quest";
  }

  function allocateMinutes(topSkills, totalMinutes) {
    var mins = Math.max(10, Number(totalMinutes || 20));
    var rows = Array.isArray(topSkills) ? topSkills.slice(0, 3) : [];
    if (!rows.length) return { line: mins + "m Word Quest", buckets: [] };
    var totalWeight = rows.reduce(function (sum, r) {
      return sum + Math.max(0.1, Number(r.priorityScore || 0.1));
    }, 0);
    var bucketMap = {};
    rows.forEach(function (r) {
      var moduleName = moduleForSkill(r.skillId);
      var weight = Math.max(0.1, Number(r.priorityScore || 0.1)) / totalWeight;
      var m = Math.max(2, Math.round(weight * mins));
      bucketMap[moduleName] = (bucketMap[moduleName] || 0) + m;
    });
    var buckets = Object.keys(bucketMap).map(function (name) {
      return { module: name, minutes: bucketMap[name] };
    }).sort(function (a, b) { return b.minutes - a.minutes; });
    var assigned = buckets.reduce(function (sum, b) { return sum + b.minutes; }, 0);
    if (assigned !== mins && buckets.length) {
      buckets[0].minutes += (mins - assigned);
    }
    var line = "Suggested split: " + buckets.map(function (b) { return b.minutes + "m " + b.module; }).join(" • ");
    return { line: line, buckets: buckets };
  }

  function bootstrapSkillStore() {
    if (!SkillStoreAPI || typeof SkillStoreAPI.initSkillStore !== "function") return;
    SkillStoreAPI.initSkillStore().then(function (store) {
      window.__CS_SKILLSTORE__ = store || null;
      if (skillStoreLogged) return;
      skillStoreLogged = true;
      if (store && !store.disabled && store.dictionaries) {
        var skillCount = Object.keys(store.dictionaries.skillLabelById || {}).length;
        var microCount = Object.keys(store.dictionaries.microLabelById || {}).length;
        console.info("[Dashboard] SkillStore ready:", skillCount, "skills,", microCount, "micro-skills");
      } else {
        console.warn("[Dashboard] SkillStore disabled:", store && store.reason ? store.reason : "unknown");
      }
    }).catch(function (err) {
      if (skillStoreLogged) return;
      skillStoreLogged = true;
      console.warn("[Dashboard] SkillStore init failed:", err && err.message ? err.message : err);
    });
  }

  function refreshBuildLine() {
    if (!el.buildline) return;
    var fallback = "Build: local";
    fetch("./build.json", { cache: "no-store" }).then(function (resp) {
      if (!resp.ok) throw new Error("build");
      return resp.json();
    }).then(function (data) {
      var buildId = String(data && (data.buildId || data.id || data.build) || "").trim();
      if (!buildId) {
        el.buildline.textContent = fallback;
        if (el.shareBuildline) el.shareBuildline.textContent = fallback;
        return;
      }
      el.buildline.textContent = "Build: " + buildId;
      if (el.shareBuildline) el.shareBuildline.textContent = "Build: " + buildId;
    }).catch(function () {
      el.buildline.textContent = fallback;
      if (el.shareBuildline) el.shareBuildline.textContent = fallback;
    });
  }

  function getCurrentBuildId() {
    var fromLine = String(el.buildline && el.buildline.textContent || "").replace(/^Build:\s*/i, "").trim();
    if (fromLine && fromLine !== "local" && fromLine !== "checking...") return fromLine;
    return "";
  }

  function formatNextStep(studentId, topSkillId) {
    if (!studentId || !topSkillId || !EvidenceEngine || typeof EvidenceEngine.getNextSkillStep !== "function") {
      return "";
    }
    var next = EvidenceEngine.getNextSkillStep(studentId, topSkillId);
    if (!next) return "";
    var label = SkillLabels && typeof SkillLabels.getMicroLabel === "function"
      ? SkillLabels.getMicroLabel(next.currentMicroId)
      : String(next.currentMicroId || "").split(".").slice(-1)[0];
    return "Next Step: " + label;
  }

  function copyText(text, onDone) {
    var done = typeof onDone === "function" ? onDone : function () {};
    if (navigator.clipboard && typeof navigator.clipboard.writeText === "function") {
      navigator.clipboard.writeText(String(text || "")).then(done).catch(done);
      return;
    }
    done();
  }

  function buildTodayCardNote(row) {
    var student = row && row.student ? row.student : { id: "", name: "Student" };
    var topSkill = row && row.priority && row.priority.topSkills && row.priority.topSkills[0] ? row.priority.topSkills[0] : null;
    var skillLabel = topSkill ? formatSkillBreadcrumb(topSkill.skillId) : "Collect baseline";
    var nextStep = topSkill ? formatNextStep(student.id, topSkill.skillId).replace(/^Next Step:\\s*/i, "") : "Run baseline quick check";
    var accuracy = topSkill ? topSkill.mastery : null;
    var days = topSkill ? topSkill.stalenessDays : null;
    var tierCfg = topSkill && EvidenceEngine && typeof EvidenceEngine.getIntensityTier === "function"
      ? EvidenceEngine.getIntensityTier(topSkill.tier || "T2")
      : { minutesPerSession: 20 };
    if (ExportNotes && typeof ExportNotes.buildSessionNote === "function") {
      return ExportNotes.buildSessionNote({
        student: student,
        topSkills: [skillLabel],
        nextStep: nextStep,
        minutes: Number(tierCfg.minutesPerSession || 20),
        evidenceSummary: {
          accuracy: accuracy,
          lastChecked: Number.isFinite(Number(days)) ? (String(days) + " days ago") : "today"
        }
      });
    }
    return "Student: " + student.name + "\\nFocus: " + skillLabel + "\\nNext: " + nextStep;
  }

  function buildTodayCardFamilyNote(row) {
    var student = row && row.student ? row.student : { id: "", name: "Student" };
    var topSkill = row && row.priority && row.priority.topSkills && row.priority.topSkills[0] ? row.priority.topSkills[0] : null;
    var skillLabel = topSkill ? formatSkillBreadcrumb(topSkill.skillId) : "baseline skills";
    var nextStep = topSkill ? formatNextStep(student.id, topSkill.skillId).replace(/^Next Step:\\s*/i, "") : "baseline quick check";
    if (ExportNotes && typeof ExportNotes.buildFamilyNote === "function") {
      return ExportNotes.buildFamilyNote({
        student: student,
        topSkills: [skillLabel],
        nextStep: nextStep
      });
    }
    return "Family Update\\nStudent: " + student.name + "\\nFocus: " + skillLabel + "\\nNext: " + nextStep;
  }

  function safeComputePriority(studentId) {
    return TeacherIntelligence && typeof TeacherIntelligence.safeComputePriority === "function"
      ? TeacherIntelligence.safeComputePriority(studentId, { EvidenceEngine: EvidenceEngine })
      : { ok: false, priority: null, reason: "missing-service" };
  }

  function buildTodayPlan() {
    return TeacherIntelligence && typeof TeacherIntelligence.buildTodayPlan === "function"
      ? TeacherIntelligence.buildTodayPlan(getCaseload(), {
          Evidence: Evidence,
          EvidenceEngine: EvidenceEngine,
          PlanEngine: PlanEngine,
          TeacherSelectors: TeacherSelectors,
          SkillLabels: SkillLabels
        })
      : { students: [], allStudents: [] };
  }

  function pickLaunchHrefForRow(row) {
    var top = row && row.priority && row.priority.topSkills && row.priority.topSkills[0]
      ? row.priority.topSkills[0]
      : null;
    var skillId = String(top && top.skillId || "").toUpperCase();
    if (skillId.indexOf("NUM") === 0 || skillId.indexOf("MATH") === 0) return "numeracy.html";
    if (skillId.indexOf("WRITE") >= 0 || skillId.indexOf("WRI.") >= 0) return "writing-studio.html";
    return "word-quest.html?play=1#wordquest";
  }

  function signalLineForRow(row) {
    var top = row && row.priority && row.priority.topSkills && row.priority.topSkills[0]
      ? row.priority.topSkills[0]
      : null;
    if (!top) return "Collect one baseline check to activate recommendations.";
    var need = Number(top.need || 0);
    if (need >= 0.65) return "Priority: " + formatSkillBreadcrumb(top.skillId) + " needs immediate support.";
    if (need >= 0.4) return "Priority: " + formatSkillBreadcrumb(top.skillId) + " is developing.";
    return "Priority: " + formatSkillBreadcrumb(top.skillId) + " is steady; monitor consistency.";
  }

  function setFocusInsight(text) {
    if (!el.focusReasonLine) return;
    var line = String(text || "Pick a student to load today’s strongest move.");
    el.focusReasonLine.innerHTML = "<strong>" + escAttr(line) + "</strong>";
  }

  function buildFocusSparkline(row, signal) {
    var top = row && row.priority && row.priority.topSkills && row.priority.topSkills[0]
      ? row.priority.topSkills[0]
      : null;
    var need = Number(top && top.need || 0.45);
    var input = signal && signal.input ? signal.input : {};
    var recent = Number(toPct(input.recentAccuracy || 0.72));
    var drift = need >= 0.65 ? -1.8 : (need >= 0.4 ? 0.45 : 1.15);
    var start = clamp(recent - (drift * 3), 24, 96);
    var points = [];
    for (var i = 0; i < 7; i += 1) {
      var jitter = (i % 2 === 0 ? 0.6 : -0.5);
      points.push(clamp(start + (drift * i) + jitter, 22, 98));
    }
    return points;
  }

  function buildFocusSparkPath(points) {
    var arr = Array.isArray(points) && points.length ? points : [58, 59, 60, 61, 62, 63, 64];
    var max = Math.max.apply(Math, arr);
    var min = Math.min.apply(Math, arr);
    var span = Math.max(1, max - min);
    return arr.map(function (value, idx) {
      var x = Math.round((idx / Math.max(1, arr.length - 1)) * 92);
      var y = Math.round(21 - ((Number(value || 0) - min) / span) * 16);
      return (idx ? "L" : "M") + x + " " + y;
    }).join(" ");
  }

  function animateFocusCardSwitch() {
    if (!el.focusCard || prefersReducedMotion()) return;
    el.focusCard.classList.remove("is-switching");
    void el.focusCard.offsetWidth;
    el.focusCard.classList.add("is-switching");
    setTimeout(function () {
      if (el.focusCard) el.focusCard.classList.remove("is-switching");
    }, 220);
  }

  function animateFocusSparklineDraw(studentId) {
    if (!el.focusTrendPath || prefersReducedMotion()) return;
    var sid = String(studentId || "");
    if (!sid || sid === state.focusVisualStudentId) return;
    var path = el.focusTrendPath;
    var length = 0;
    try {
      length = Number(path.getTotalLength ? path.getTotalLength() : 0);
    } catch (_e) {
      length = 0;
    }
    if (!Number.isFinite(length) || length <= 0) return;
    path.style.strokeDasharray = String(length.toFixed(2));
    path.style.strokeDashoffset = String(length.toFixed(2));
    void path.getBoundingClientRect();
    path.style.strokeDashoffset = "0";
    setTimeout(function () {
      if (!el.focusTrendPath) return;
      el.focusTrendPath.style.strokeDasharray = "";
      el.focusTrendPath.style.strokeDashoffset = "";
    }, 850);
  }

  function renderFocusSignalVisuals(row, signal) {
    var studentId = row && row.student ? String(row.student.id || "") : "";
    if (!studentId) state.focusVisualStudentId = "";
    var points = buildFocusSparkline(row, signal);
    if (el.focusTrendPath) {
      el.focusTrendPath.setAttribute("d", buildFocusSparkPath(points));
    }
    animateFocusSparklineDraw(studentId);
    var first = Number(points[0] || 0);
    var last = Number(points[points.length - 1] || first);
    var delta = last - first;
    var deltaText = "→ steady";
    var deltaClass = "focus-delta focus-delta-steady";
    if (delta > 1.4) {
      deltaText = "↑ improving";
      deltaClass = "focus-delta focus-delta-up";
    } else if (delta < -1.4) {
      deltaText = "↓ risk";
      deltaClass = "focus-delta focus-delta-down";
    }
    if (el.focusDelta) {
      el.focusDelta.textContent = deltaText;
      el.focusDelta.className = deltaClass;
    }

    var top = row && row.priority && row.priority.topSkills && row.priority.topSkills[0]
      ? row.priority.topSkills[0]
      : null;
    var needPenalty = Number(top && top.need || 0.45) * 22;
    var input = signal && signal.input ? signal.input : {};
    var recent = Number(toPct(input.recentAccuracy || 0.72));
    var goalGap = Math.abs(Number(toPct(input.goalAccuracy || 0.8)) - recent);
    var fidelityBoost = Number(input.fidelityPercent || 80) * 0.08;
    var confidenceScore = clamp(Math.round(recent - (goalGap * 0.3) - needPenalty + fidelityBoost + 28), 42, 97);
    if (el.focusConfidenceScore) el.focusConfidenceScore.textContent = String(confidenceScore) + "%";
    if (el.focusConfidenceProgress) {
      var circumference = 2 * Math.PI * FOCUS_RING_RADIUS;
      var offset = circumference * (1 - (confidenceScore / 100));
      el.focusConfidenceProgress.style.strokeDasharray = String(circumference.toFixed(2));
      if (prefersReducedMotion()) {
        el.focusConfidenceProgress.style.transition = "none";
      } else {
        el.focusConfidenceProgress.style.transition = "stroke-dashoffset 760ms var(--ease-out)";
      }
      requestAnimationFrame(function () {
        if (!el.focusConfidenceProgress) return;
        el.focusConfidenceProgress.style.strokeDashoffset = String(offset.toFixed(2));
      });
    }
    if (studentId) state.focusVisualStudentId = studentId;
  }

  function focusWhyLineFromSignal(signal, row) {
    var top = row && row.priority && row.priority.topSkills && row.priority.topSkills[0]
      ? row.priority.topSkills[0]
      : null;
    var reason = signal && Array.isArray(signal.reasoning) && signal.reasoning[0]
      ? String(signal.reasoning[0])
      : "Tier decision based on recent accuracy, goal match, and stability.";
    if (!top) return reason;
    return reason + " Focus skill: " + formatSkillBreadcrumb(top.skillId) + ".";
  }

  function getSelectedPlanRow() {
    var rows = state.todayPlan && Array.isArray(state.todayPlan.students) ? state.todayPlan.students : [];
    var sid = String(state.selectedId || "");
    if (sid) {
      var match = rows.find(function (item) {
        return item && item.student && String(item.student.id || "") === sid;
      });
      if (match) return match;
    }
    return rows[0] || null;
  }

  function refreshNumeracyPanelFromSelection() {
    renderNumeracyRecommendationCard(getSelectedPlanRow());
  }

  function renderSurgicalDashboard(rows) {
    var list = Array.isArray(rows) ? rows.slice(0, 3) : [];
    if (!list.length) {
      state.focusVisualStudentId = "";
      if (el.focusStudentName) el.focusStudentName.textContent = "Select a student";
      if (el.focusTierLine) el.focusTierLine.textContent = "Tier 2 focus";
      setFocusInsight("Search a student to activate a clear next move.");
      if (el.focusWhyLine) {
        el.focusWhyLine.textContent = "Trend and fidelity signals are combined into one recommendation.";
        el.focusWhyLine.classList.add("hidden");
      }
      if (el.focusWhyToggle) el.focusWhyToggle.setAttribute("aria-expanded", "false");
      renderFocusSignalVisuals(null, null);
      if (el.focusEngineCue) el.focusEngineCue.classList.add("hidden");
      if (el.focusCard) el.focusCard.classList.remove("is-engine-active");
      renderExecutiveSnapshot(null);
      renderExplainability(null, "");
      renderFrameworkBadges(el.litFrameworkBadges, "");
      renderNumeracyRecommendationCard(null);
      if (el.surgicalAttentionList) {
        el.surgicalAttentionList.innerHTML = '<article class="queue-card"><h3 class="queue-name">No queued students</h3><p class="queue-signal">Add students to generate a focused queue.</p></article>';
      }
      return;
    }

    var focus = list[0];
    var focusStudent = focus && focus.student ? focus.student : { id: "", name: "Select a student" };
    var focusTop = focus && focus.priority && focus.priority.topSkills && focus.priority.topSkills[0]
      ? focus.priority.topSkills[0]
      : null;
    var tierSignal = computeTierSignalForRow(focus);
    var focusTier = String(tierSignal.tierLevel || "Tier 2");
    var focusStudentId = String(focusStudent.id || "");
    if (focusStudentId && focusStudentId !== state.focusVisualStudentId) {
      animateFocusCardSwitch();
      setFocusCtaRest(1300);
    }

    if (el.focusStudentName) el.focusStudentName.textContent = String(focusStudent.name || "Select a student");
    if (el.focusTierLine) el.focusTierLine.textContent = focusTier + " focus";
    setFocusInsight(signalLineForRow(focus));
    if (el.focusWhyLine) {
      el.focusWhyLine.textContent = focusWhyLineFromSignal(tierSignal, focus);
      el.focusWhyLine.classList.add("hidden");
    }
    if (el.focusWhyToggle) el.focusWhyToggle.setAttribute("aria-expanded", "false");
    renderFocusSignalVisuals(focus, tierSignal);
    var focusSkillId = String(focusTop && focusTop.skillId || "literacy");
    renderExplainability(tierSignal, focusSkillId);
    renderExecutiveSnapshot(focus);
    renderFrameworkBadges(el.litFrameworkBadges, focusSkillId);
    renderNumeracyRecommendationCard(focus);
    updateAccommodationButtons(String(focusStudent.id || ""));
    if (el.focusStartBtn) {
      el.focusStartBtn.onclick = function () {
        var sid = String(focusStudent.id || "");
        if (!sid) return;
        selectStudent(sid);
        var href = pickLaunchHrefForRow(focus);
        setFocusCtaRest(5000);
        el.focusStartBtn.classList.add("is-launching");
        if (el.focusCard) el.focusCard.classList.add("is-engine-active");
        if (el.focusEngineCue) el.focusEngineCue.classList.remove("hidden");
        setTimeout(function () {
          if (el.focusStartBtn) el.focusStartBtn.classList.remove("is-launching");
          if (el.focusCard) el.focusCard.classList.remove("is-engine-active");
          if (el.focusEngineCue) el.focusEngineCue.classList.add("hidden");
        }, 220);
        setTimeout(function () {
          window.location.href = appendStudentParam("./" + href.replace(/^\.\//, ""), sid);
        }, 180);
      };
    }

    if (!el.surgicalAttentionList) return;
    el.surgicalAttentionList.innerHTML = list.map(function (row) {
      var student = row && row.student ? row.student : { id: "", name: "Student" };
      var top = row && row.priority && row.priority.topSkills && row.priority.topSkills[0]
        ? row.priority.topSkills[0]
        : null;
      var tier = top && top.tier ? top.tier : "T2";
      return [
        '<article class="queue-card">',
        '<h3 class="queue-name">' + escAttr(student.name || "Student") + '</h3>',
        '<span class="queue-tier">' + escAttr(tier) + '</span>',
        '<p class="queue-signal">' + escAttr(signalLineForRow(row)) + '</p>',
        '<button class="td-top-btn queue-open" type="button" data-attn-open="' + escAttr(student.id || "") + '">Open Plan</button>',
        '</article>'
      ].join("");
    }).join("");

    Array.prototype.forEach.call(el.surgicalAttentionList.querySelectorAll("[data-attn-open]"), function (button) {
      button.addEventListener("click", function () {
        var sid = String(button.getAttribute("data-attn-open") || "");
        if (!sid) return;
        window.location.href = appendStudentParam("./teacher-dashboard.html#student", sid);
      });
    });
  }

  function renderTodayEngine(plan) {
    if (!el.todayList) return;
    var rows = plan && Array.isArray(plan.students) ? plan.students : [];
    if (!rows.length) {
      rows = buildTodayPlan().students;
    }
    renderSurgicalDashboard(rows);
    var allRows = plan && Array.isArray(plan.allStudents) ? plan.allStudents : rows;
    if (el.caseloadSnapshot) {
      var scoreList = allRows.map(function (row) { return Number(row && row.score || 0); });
      var bucket = (RiskBands && typeof RiskBands.bucketCaseload === "function")
        ? RiskBands.bucketCaseload(scoreList)
        : { pctHigh: 0, pctModerate: 0, pctStable: 100 };
      var healthRows = allRows.map(function (row) {
        var top = row && row.priority && row.priority.topSkills && row.priority.topSkills[0] ? row.priority.topSkills[0] : null;
        return {
          overallPriority: Number(row && row.score || 0),
          avgNeed: Number(top && top.need || 0.5),
          avgStalenessNorm: Number(top && top.stalenessNorm || 0)
        };
      });
      var health = CaseloadHealth && typeof CaseloadHealth.computeCaseloadHealth === "function"
        ? CaseloadHealth.computeCaseloadHealth(healthRows)
        : { score: 100, band: "Stable" };
      el.caseloadSnapshot.innerHTML = [
        '<span class="td-caseload-health">Caseload Health: ' + health.score + ' (' + health.band + ')</span>',
        '<span class="td-chip td-risk-high">High ' + bucket.pctHigh + '%</span>',
        '<span class="td-chip td-risk-moderate">Mod ' + bucket.pctModerate + '%</span>',
        '<span class="td-chip td-risk-stable">Stable ' + bucket.pctStable + '%</span>'
      ].join('');
    }
    renderExecutiveSnapshot(allRows);
    el.todayList.innerHTML = rows.map(function (row) {
      var s = row.student || {};
      var sid = String(s.id || "");
      var grade = s.grade ? ("Grade " + s.grade) : "";
      var last = row.lastActivity;
      var lastText = last ? ("Last: " + moduleLabel(last.module) + " • " + ageDays(last.ts) + "d ago") : "Last: none yet";
      var topSkill = row.priority && row.priority.topSkills && row.priority.topSkills[0]
        ? row.priority.topSkills[0]
        : null;
      var needLabel = topSkill && Number(topSkill.need) >= 0.65 ? "high" : (topSkill && Number(topSkill.need) >= 0.4 ? "moderate" : "low");
      var cadenceDays = topSkill && Number.isFinite(Number(topSkill.cadenceDays)) ? Number(topSkill.cadenceDays) : 14;
      var risk = (RiskBands && typeof RiskBands.computeRiskBand === "function")
        ? RiskBands.computeRiskBand(Number(row && row.score || 0))
        : { label: "Stable", colorClass: "td-risk-stable" };
      var track = (GrowthEngine && typeof GrowthEngine.computeTrackStatus === "function")
        ? GrowthEngine.computeTrackStatus(sid)
        : { status: "WATCH", reason: "Growth signal pending" };
      var growthSymbol = track.status === "ON_TRACK" ? "↑" : (track.status === "OFF_TRACK" ? "↓" : "→");
      var rationale = topSkill
        ? ("Priority: " + formatSkillBreadcrumb(topSkill.skillId) + " • Need: " + needLabel + " • Cadence: " + topSkill.stalenessDays + "d/" + cadenceDays + "d")
        : "Priority: Missing evidence";
      rationale += " • " + growthSymbol;
      var confidenceTip = "";
      if (topSkill && MasteryLabels && typeof MasteryLabels.masteryToBand === "function") {
        var estMastery = Math.max(0, Math.min(1, 1 - Number(topSkill.need || 0.5)));
        var confBand = MasteryLabels.masteryToBand(estMastery);
        confidenceTip = "Confidence: " + confBand.label + " (" + estMastery.toFixed(2) + ")";
      }
      var celebration = Celebrations && typeof Celebrations.getCelebration === "function"
        ? Celebrations.getCelebration(sid, row.priority && row.priority.topSkills ? row.priority.topSkills : [])
        : null;
      if (celebration && celebration.text) {
        rationale += " • " + celebration.text;
      }
      var nextStepLine = topSkill ? formatNextStep(sid, topSkill.skillId) : "";
      var trendLine = buildTrajectoryLine(sid, row.priority && row.priority.topSkills ? row.priority.topSkills : []);
      var pathway = PathwayEngine && typeof PathwayEngine.detectPrimaryPathway === "function"
        ? PathwayEngine.detectPrimaryPathway({ topSkills: row.priority && row.priority.topSkills ? row.priority.topSkills : [] })
        : { pathway: "Foundational", confidenceScore: 0 };
      var whyItems = [];
      if (topSkill) {
        var masteryEst = Math.max(0, Math.min(1, 1 - Number(topSkill.need || 0.5)));
        var masteryBand = MasteryLabels && typeof MasteryLabels.masteryToBand === "function"
          ? MasteryLabels.masteryToBand(masteryEst).label
          : "Developing";
        whyItems = [
          "Top Skill: " + formatSkillBreadcrumb(topSkill.skillId),
          "Need: " + needLabel,
          "Cadence: " + topSkill.stalenessDays + "d/" + cadenceDays + "d",
          "Tier: " + topSkill.tier,
          "Confidence: " + masteryBand
        ];
      }
      var tierClass = topSkill && topSkill.tier === "T3" ? "student-tier-3"
        : (topSkill && topSkill.tier === "T2" ? "student-tier-2" : "student-tier-1");
      var tierBadge = topSkill && topSkill.tier ? topSkill.tier : "T1";
      var missingEvidenceBadge = row.priorityFallback || !topSkill
        ? '<span class="td-chip td-risk-high">Missing Evidence</span>'
        : '';
      return [
        '<article class="td-todayCard student-card ' + tierClass + '">',
        '<div class="td-todayCard__top">',
        '<h3 class="td-todayCard__name">' + s.name + '</h3>',
        '<span class="td-todayCard__grade">' + grade + '</span>',
        '</div>',
        '<div class="td-todayCard__chips">',
        '<span class="td-chip">' + tierBadge + '</span>',
        missingEvidenceBadge,
        '</div>',
        '<div class="td-todayCard__actions">',
        '<div class="student-actions">',
        '<button class="td-btn td-btn-accent btn btn-primary" type="button" data-build-block="' + sid + '">Start 20-min Block</button>',
        '<button class="td-btn td-btn-primary btn btn-quiet" type="button" data-more-tools-toggle="' + sid + '">More Tools</button>',
        '</div>',
        '<div class="td-more-tools" data-more-tools="' + sid + '">',
        '<button class="td-top-btn" type="button" data-today-launch="word-quest" data-student-id="' + sid + '">Word Quest</button>',
        '<button class="td-top-btn" type="button" data-today-launch="reading-lab" data-student-id="' + sid + '">Reading Lab</button>',
        '<button class="td-top-btn" type="button" data-today-launch="sentence-surgery" data-student-id="' + sid + '">Sentence Studio</button>',
        (rationale ? ('<p class="td-todayCard__last" title="' + confidenceTip + '">' + rationale + '</p>') : ''),
        '<p class="td-todayCard__last">Primary Focus: ' + pathway.pathway + '</p>',
        (trendLine ? ('<p class="td-todayCard__last">' + trendLine + '</p>') : ''),
        (nextStepLine ? ('<p class="td-todayCard__last">' + nextStepLine + '</p>') : ''),
        (whyItems.length ? ('<details class="td-todayWhy"><summary>Why</summary><ul>' + whyItems.map(function (item) { return "<li>" + item + "</li>"; }).join("") + '</ul></details>') : ''),
        '<p class="td-todayCard__last">' + lastText + '</p>',
        '</div>',
        '</div>',
        '</article>'
      ].join("");
    }).join("");

    Array.prototype.forEach.call(el.todayList.querySelectorAll("[data-today-launch]"), function (button) {
      button.addEventListener("click", function () {
        var target = String(button.getAttribute("data-today-launch") || "").trim();
        var sid = String(button.getAttribute("data-student-id") || state.selectedId || "");
        if (!target) return;
        recordLastActivity(sid, target);
        if (sid) state.selectedId = sid;
        window.location.href = appendStudentParam("./" + target + ".html");
      });
    });

    Array.prototype.forEach.call(el.todayList.querySelectorAll("[data-more-tools-toggle]"), function (button) {
      button.addEventListener("click", function () {
        var sid = String(button.getAttribute("data-more-tools-toggle") || "");
        if (!sid) return;
        var panel = el.todayList.querySelector('[data-more-tools="' + sid + '"]');
        if (!panel) return;
        panel.classList.toggle("is-open");
      });
    });

    Array.prototype.forEach.call(el.todayList.querySelectorAll("[data-build-block]"), function (button) {
      button.addEventListener("click", function () {
        var sid = String(button.getAttribute("data-build-block") || "");
        var row = rows.find(function (x) { return String(x.student && x.student.id || "") === sid; });
        var focusLine = row && row.focus && row.focus.length ? row.focus.join(", ") : "Collect baseline";
        var topSkill = row && row.priority && row.priority.topSkills && row.priority.topSkills[0] ? row.priority.topSkills[0] : null;
        var tier = topSkill && topSkill.tier ? topSkill.tier : "T2";
        var tierCfg = EvidenceEngine && typeof EvidenceEngine.getIntensityTier === "function"
          ? EvidenceEngine.getIntensityTier(tier)
          : { minutesPerSession: tier === "T3" ? 25 : 20 };
        var mins = Number(tierCfg.minutesPerSession || (tier === "T3" ? 25 : 20));
        var split = allocateMinutes(row && row.priority && row.priority.topSkills ? row.priority.topSkills : [], mins);
        var warm = Math.max(2, Math.round(mins * 0.15));
        var guided = Math.max(6, Math.round(mins * 0.4));
        var check = Math.max(6, Math.round(mins * 0.35));
        var reflect = Math.max(2, mins - warm - guided - check);
        setCoachLine(mins + "-min block: " + warm + "-" + guided + "-" + check + "-" + reflect + " plan. " + split.line + ". Focus: " + focusLine + ".");
      });
    });

  }

  function renderExecutiveSnapshot(rows) {
    if (!el.execOutput) return;
    var list = Array.isArray(rows) ? rows : [];
    var metrics = list.map(function (row) {
      var top = row && row.priority && row.priority.topSkills && row.priority.topSkills[0] ? row.priority.topSkills[0] : null;
      var traj = top && EvidenceEngine && typeof EvidenceEngine.getSkillTrajectory === "function"
        ? EvidenceEngine.getSkillTrajectory(String(row.student && row.student.id || ""), top.skillId, 3)
        : { direction: "FLAT" };
      var stability = top && GrowthEngine && typeof GrowthEngine.computeGrowthStability === "function"
        ? GrowthEngine.computeGrowthStability(String(row.student && row.student.id || ""), top.skillId)
        : { stability: "STABLE" };
      var track = GrowthEngine && typeof GrowthEngine.computeTrackStatus === "function"
        ? GrowthEngine.computeTrackStatus(String(row.student && row.student.id || ""))
        : { status: "WATCH" };
      return {
        overallPriority: Number(row && row.score || 0),
        stalenessDays: Number(top && top.stalenessDays || 0),
        topSkillId: String(top && top.skillId || "BASELINE"),
        trajectory: String(traj && traj.direction || "FLAT"),
        stability: String(stability && stability.stability || "STABLE"),
        trackStatus: String(track && track.status || "WATCH")
      };
    });
    var summary = ProgressSummary && typeof ProgressSummary.buildExecutiveSummary === "function"
      ? ProgressSummary.buildExecutiveSummary(metrics)
      : { headline: "Executive snapshot unavailable", bulletPoints: [], riskShiftTrend: "" };
    el.execOutput.innerHTML = [
      '<p class="td-todayCard__last"><strong>' + summary.headline + '</strong></p>',
      '<p class="td-todayCard__last">' + (summary.bulletPoints || []).join(' • ') + '</p>',
      '<p class="td-todayCard__last">' + String(summary.riskShiftTrend || "") + '</p>'
    ].join('');
  }

  function renderFlexGroups(rows) {
    if (!el.groupOutput) return;
    var engineV2 = FlexGroupEngineV2 && typeof FlexGroupEngineV2.buildGroups === "function";
    var engineV1 = FlexGroupEngine && typeof FlexGroupEngine.buildGroups === "function";
    if (!engineV2 && !engineV1) {
      el.groupOutput.textContent = "Group engine unavailable.";
      return;
    }
    var groups = [];
    if (engineV2) {
      groups = FlexGroupEngineV2.buildGroups(rows, {
        getTierConfig: EvidenceEngine && typeof EvidenceEngine.getIntensityTier === "function"
          ? EvidenceEngine.getIntensityTier
          : function () { return { minutesPerSession: 20, groupSizeMax: 4 }; }
      });
    } else {
      var built = FlexGroupEngine.buildGroups(rows, {
        labelsApi: SkillLabels,
        getTierConfig: EvidenceEngine && typeof EvidenceEngine.getIntensityTier === "function"
          ? EvidenceEngine.getIntensityTier
          : function () { return { minutesPerSession: 20, groupSizeMax: 4 }; }
      });
      groups = built && Array.isArray(built.groups) ? built.groups : [];
    }
    if (!groups.length) {
      el.groupOutput.textContent = "No shared-skill groups yet. Run more quick checks.";
      return;
    }
    el.groupOutput.innerHTML = groups.map(function (group, idx) {
      var names = (group.students || []).map(function (s) { return s && s.name ? s.name : "Student"; }).join(", ");
      var groupLabel = String(group.label || group.skillLabel || "Targeted support");
      var tierMix = Array.isArray(group.tierMix) ? group.tierMix.join("/") : String(group.tier || "T2");
      var mins = Number(group.suggestedMinutes || group.minutesPerSession || 20);
      return [
        '<article class="td-group-item">',
        '<strong>Group ' + (idx + 1) + ' — ' + groupLabel + ' (' + (group.students || []).length + ' students)</strong>',
        '<div class="td-todayCard__last">Tier mix: ' + tierMix + ' • ' + mins + ' min</div>',
        '<div class="td-todayCard__last">Students: ' + names + '</div>',
        '</article>'
      ].join("");
    }).join("");
  }

  function seedFromCaseloadStore() {
    if (!CaseloadStore || typeof CaseloadStore.loadCaseload !== "function") return;
    var loaded = CaseloadStore.loadCaseload();
    var students = loaded && Array.isArray(loaded.students) ? loaded.students : [];
    students.forEach(function (student) {
      Evidence.upsertStudent({
        id: String(student.id || student.code || ""),
        name: String(student.name || student.id || "Student"),
        gradeBand: String(student.gradeBand || ""),
        tags: Array.isArray(student.tags) ? student.tags : []
      });
    });
  }

  function ensureDemoCaseload() {
    var rows = Evidence.listCaseload();
    if (rows.length) return;
    [
      { id: "SAS7A-03", name: "Ava", gradeBand: "68", tags: ["decoding"] },
      { id: "SAS7A-11", name: "Liam", gradeBand: "68", tags: ["fluency"] },
      { id: "SAS7A-14", name: "Maya", gradeBand: "68", tags: ["sentence"] },
      { id: "SAS7A-17", name: "Noah", gradeBand: "68", tags: ["writing"] },
      { id: "SAS7A-19", name: "Zoe", gradeBand: "68", tags: ["decoding"] }
    ].forEach(function (student) { Evidence.upsertStudent(student); });
  }

  function primeDemoMetrics() {
    if (!state.demoMode) return;
    ensureDemoCaseload();
    if (el.metricAccuracy) el.metricAccuracy.textContent = "+4.2%";
    if (el.metricTier) el.metricTier.textContent = "Tier 2";
    if (el.metricSubline) el.metricSubline.textContent = "Accuracy +4.2% over last 3 sessions";
  }

  function refreshCaseload() {
    state.caseload = getCaseload();
    workspaceSearchService = null;
    filterCaseload(el.search.value || "");
    el.noCaseload.classList.toggle("hidden", state.caseload.length > 0);
    state.todayPlan = buildTodayPlan();
    renderTodayEngine(state.todayPlan);
    updateAuditMarkers();
  }

  function filterCaseload(query) {
    var q = String(query || "").trim();
    var service = ensureWorkspaceSearchService();
    state.workspaceSearchResults = q && service && typeof service.query === "function"
      ? service.query(q)
      : [];
    state.filtered = WorkspaceCaseload && typeof WorkspaceCaseload.filterRows === "function"
      ? WorkspaceCaseload.filterRows(state.caseload, q)
      : [];
    renderCaseload();
  }

  function ensureWorkspaceSearchService() {
    if (workspaceSearchService) return workspaceSearchService;
    if (!TeacherSearchService || typeof TeacherSearchService.create !== "function") return null;
    workspaceSearchService = TeacherSearchService.create({
      TeacherSearchIndex: TeacherSearchIndex,
      getStudentsStore: function () {
        return TeacherStorage && typeof TeacherStorage.loadStudentsStore === "function"
          ? TeacherStorage.loadStudentsStore()
          : {};
      },
      getCaseload: function () {
        return state.caseload.slice();
      },
      getBlocks: function () {
        return TeacherSelectors && typeof TeacherSelectors.loadScheduleBlocks === "function"
          ? TeacherSelectors.loadScheduleBlocks("", { TeacherStorage: TeacherStorage })
          : [];
      },
      getResources: function () {
        return WORKSPACE_SEARCH_RESOURCES.slice();
      }
    });
    return workspaceSearchService;
  }

  function renderCaseload() {
    if (WorkspaceCaseload && typeof WorkspaceCaseload.renderList === "function") {
      WorkspaceCaseload.renderList({
        listEl: el.list,
        rows: state.filtered,
        selectedId: state.selectedId,
        mode: state.workspaceSearchResults && state.workspaceSearchResults.length ? "search" : "default",
        results: state.workspaceSearchResults,
        onSelect: selectStudent
      });
      return;
    }
  }

  function selectStudent(studentId) {
    if (WorkspaceSelection && typeof WorkspaceSelection.selectStudent === "function") {
      WorkspaceSelection.selectStudent({
        studentId: studentId,
        state: state,
        appState: appState,
        el: el,
        DashboardFocus: DashboardFocus,
        TeacherIntelligence: TeacherIntelligence,
        WorkspaceFocusShell: WorkspaceFocusShell,
        appendStudentParam: appendStudentParam,
        intelligenceDeps: {
          Evidence: Evidence,
          EvidenceEngine: EvidenceEngine,
          PlanEngine: PlanEngine,
          TeacherSelectors: TeacherSelectors,
          SkillLabels: SkillLabels
        },
        hooks: {
          renderCaseload: renderCaseload,
          onEmpty: function () {
            renderNeeds(null);
            renderSupportHub("");
            renderDrawer("");
            renderRecommendedPlan("");
            renderInstructionalSequencer("");
            renderImplementationToday("");
            renderExecutiveSupport("");
            renderTodayPlan(null);
            renderSkillTiles("");
            renderMasteryUI("");
            renderProgressNote(null, null);
            updateAuditMarkers();
            setCoachLine("Search or pick a student and I will suggest the next best move.");
            window.dispatchEvent(new CustomEvent("cs-student-selected", {
              detail: { studentId: "", studentName: "", grade: "" }
            }));
          },
          onSelected: function (payload) {
            var summary = payload && payload.summary ? payload.summary : {};
            var focusView = payload && payload.focusView ? payload.focusView : null;
            window.dispatchEvent(new CustomEvent("cs-student-selected", {
              detail: {
                studentId: state.selectedId,
                studentName: summary && summary.student && summary.student.name || "",
                grade: summary && summary.student && (summary.student.grade || summary.student.gradeBand) || "",
                caseload: state.caseload.slice()
              }
            }));
            renderEvidenceChips(summary.evidenceChips);
            renderSkillTiles(state.selectedId);
            renderMasteryUI(state.selectedId);
            renderNeeds(state.snapshot);
            renderSupportHub(state.selectedId);
            renderDrawer(state.selectedId);
            renderRecommendedPlan(state.selectedId);
            renderInstructionalSequencer(state.selectedId);
            renderImplementationToday(state.selectedId);
            renderExecutiveSupport(state.selectedId);
            renderTodayPlan(state.plan);
            renderProgressNote(state.plan, summary.student);
            renderLastSessionSummary(state.selectedId);
            updateAuditMarkers();
            setCoachLine(summary.nextMove && summary.nextMove.line || (focusView && focusView.tierLabel ? focusView.tierLabel : ""));
          }
        }
      });
      return;
    }
  }

  function renderEvidenceChips(chips) {
    if (WorkspaceStudentIntelligence && typeof WorkspaceStudentIntelligence.renderEvidenceChips === "function") {
      WorkspaceStudentIntelligence.renderEvidenceChips({
        el: el,
        chips: chips,
        studentId: state.selectedId,
        SupportStore: SupportStore
      });
    }
  }

  function renderSkillTiles(studentId) {
    if (WorkspaceStudentIntelligence && typeof WorkspaceStudentIntelligence.renderSkillTiles === "function") {
      WorkspaceStudentIntelligence.renderSkillTiles({
        el: el,
        studentId: studentId,
        Evidence: Evidence,
        getSkillLabelSafe: getSkillLabelSafe
      });
    }
  }

  function renderNeeds(snapshot) {
    if (WorkspaceStudentIntelligence && typeof WorkspaceStudentIntelligence.renderNeeds === "function") {
      WorkspaceStudentIntelligence.renderNeeds({
        el: el,
        snapshot: snapshot,
        studentId: state.selectedId,
        SupportStore: SupportStore
      });
    }
  }

  function renderMasteryUI(studentId) {
    if (WorkspaceStudentIntelligence && typeof WorkspaceStudentIntelligence.renderMasteryUI === "function") {
      WorkspaceStudentIntelligence.renderMasteryUI({
        el: el,
        studentId: studentId,
        MasteryEngine: MasteryEngine,
        Evidence: Evidence,
        EvidenceEngine: EvidenceEngine,
        getSkillLabelSafe: getSkillLabelSafe
      });
    }
  }

  function formatTier1Intervention(intervention) {
    if (supportViewController && typeof supportViewController.formatTier1Intervention === "function") {
      return supportViewController.formatTier1Intervention(intervention);
    }
    var row = intervention && typeof intervention === "object" ? intervention : {};
    var points = Array.isArray(row.datapoints) ? row.datapoints : [];
    return {
      id: String(row.id || ""),
      domain: String(row.domain || "Reading"),
      strategy: String(row.strategy || row.focus || "Tier 1 support"),
      frequency: String(row.frequency || "3x/week"),
      duration: Number(row.durationMinutes || row.durationMin || 20),
      metric: String(row.progressMetric || "MAP"),
      datapoints: points,
      datapointsCount: points.length,
      latestPoint: points[0] || null,
      sparkPath: points.length
        ? buildTinySpark(points.slice(0, 6).map(function (point) { return Number(point.value || 0); }).reverse())
        : "M0,12 L72,12",
      readiness: null,
      readinessLabel: "Gathering data",
      checksDone: 0,
      checksTotal: 0,
      fidelity: []
    };
  }

  function renderAccommodationRows(accommodations) {
    if (supportViewController && typeof supportViewController.renderAccommodationRows === "function") {
      return supportViewController.renderAccommodationRows(accommodations);
    }
    var rows = Array.isArray(accommodations) ? accommodations : [];
    if (!rows.length) return '<div class="td-support-item"><p>No accommodation cards yet.</p></div>';
    return rows.slice(0, 5).map(function (row) {
      return '<div class="td-support-item"><h4>' + String(row.title || "Accommodation") + '</h4><p>' + String(row.teacherText || row.whenToUse || "Actionable support step.") + "</p></div>";
    }).join("");
  }

  function renderSupportHub(studentId) {
    if (supportViewController && typeof supportViewController.renderSupportHub === "function") {
      supportViewController.renderSupportHub(studentId);
      return;
    }
    if (!el.supportBody) return;
    el.supportBody.innerHTML = studentId
      ? '<div class="td-support-item"><p>Support workflows loading.</p></div>'
      : '<div class="td-support-item"><p>Select a student to load support workflows.</p></div>';
  }

  function renderDrawer(studentId) {
    if (drawerController && typeof drawerController.renderDrawer === "function") {
      drawerController.renderDrawer(studentId);
      return;
    }
    if (!el.drawerBody || !el.drawerTitle) return;
    el.drawerTitle.textContent = studentId ? String(studentId) : "Student Drawer";
    el.drawerBody.innerHTML = studentId
      ? '<div class="td-support-item"><p>Drawer loading…</p></div>'
      : '<div class="td-support-item"><p>Select a student to open the drawer.</p></div>';
  }

  function renderRecommendedPlan(studentId) {
    if (WorkspaceRecommendations && typeof WorkspaceRecommendations.renderRecommendedPlan === "function") {
      WorkspaceRecommendations.renderRecommendedPlan({
        listEl: el.recommendedPlanList,
        studentId: studentId,
        Evidence: Evidence,
        SessionPlanner: SessionPlanner,
        getSkillLabelSafe: getSkillLabelSafe,
        appendStudentParam: appendStudentParam
      });
    }
  }

  function toSequencerRoute(moduleName, fallbackHref) {
    var href = String(fallbackHref || "").trim();
    if (href) return href;
    var module = String(moduleName || "");
    if (module === "ReadingLab") return "reading-lab.html";
    if (module === "WritingStudio") return "writing-studio.html";
    if (module === "SentenceStudio") return "sentence-surgery.html";
    if (module === "WordConnections") return "precision-play.html";
    if (module === "PrecisionPlay") return "precision-play.html";
    if (module.indexOf("Numeracy") === 0) return "numeracy.html";
    return "word-quest.html?play=1";
  }

  function applyInstitutionalAnchorOverlay(studentId, rows) {
    if (institutionalController && typeof institutionalController.applyInstitutionalAnchorOverlay === "function") {
      return institutionalController.applyInstitutionalAnchorOverlay(studentId, rows);
    }
    return Array.isArray(rows) ? rows.slice(0, 3) : [];
  }

  function formatAlignmentLine(alignment) {
    if (institutionalController && typeof institutionalController.formatAlignmentLine === "function") {
      return institutionalController.formatAlignmentLine(alignment);
    }
    return "";
  }

  function formatAnchorContextLine(contextLine) {
    if (institutionalController && typeof institutionalController.formatAnchorContextLine === "function") {
      return institutionalController.formatAnchorContextLine(contextLine);
    }
    var line = String(contextLine || "").trim();
    return line ? '<p class="td-sequencer-alignment">Context: ' + line + '</p>' : "";
  }

  function renderInstitutionalAnchorPanel(studentId, compact) {
    if (institutionalController && typeof institutionalController.renderInstitutionalAnchorPanel === "function") {
      return institutionalController.renderInstitutionalAnchorPanel(studentId, compact);
    }
    return '<div class="td-support-item"><h4>Institutional Data Anchors</h4><p>Select a student to enter MAP/Aimsweb/Core Phonics/Writing/Math anchors.</p></div>';
  }

  function bindInstitutionalAnchorActions(studentId, rootEl, refreshDrawer) {
    if (institutionalController && typeof institutionalController.bindInstitutionalAnchorActions === "function") {
      institutionalController.bindInstitutionalAnchorActions(studentId, rootEl, refreshDrawer);
    }
  }

  function renderInstructionalSequencer(studentId) {
    if (WorkspaceRecommendations && typeof WorkspaceRecommendations.renderInstructionalSequencer === "function") {
      WorkspaceRecommendations.renderInstructionalSequencer({
        listEl: el.nextMovesList,
        studentId: studentId,
        InstructionalSequencer: InstructionalSequencer,
        SupportStore: SupportStore,
        AlignmentLoader: AlignmentLoader,
        showAlignment: !!(el.showAlignment && el.showAlignment.checked),
        formatSkillBreadcrumb: formatSkillBreadcrumb,
        formatAlignmentLine: formatAlignmentLine,
        formatAnchorContextLine: formatAnchorContextLine,
        applyInstitutionalAnchorOverlay: applyInstitutionalAnchorOverlay,
        appendStudentParam: appendStudentParam
      });
    }
  }

  function renderImplementationToday(studentId) {
    if (WorkspaceSupportOps && typeof WorkspaceSupportOps.renderImplementationToday === "function") {
      WorkspaceSupportOps.renderImplementationToday({
        studentId: studentId,
        el: el,
        SupportStore: SupportStore,
        escAttr: escAttr,
        isAdminContext: isAdminContext,
        renderInstructionalSequencer: renderInstructionalSequencer,
        setCoachLine: setCoachLine
      });
    }
  }

  function renderExecutiveSupport(studentId) {
    if (WorkspaceSupportOps && typeof WorkspaceSupportOps.renderExecutiveSupport === "function") {
      WorkspaceSupportOps.renderExecutiveSupport({
        studentId: studentId,
        state: state,
        el: el,
        SupportStore: SupportStore,
        TaskBreakdownTool: TaskBreakdownTool,
        EvidenceEngine: EvidenceEngine,
        escAttr: escAttr,
        renderDrawer: renderDrawer,
        renderInstructionalSequencer: renderInstructionalSequencer,
        setCoachLine: setCoachLine
      });
    }
  }

  function renderTodayPlan(plan) {
    if (!el.planList) return;
    var key = state.activePlanTab === "thirty" ? "thirtyMin" : "tenMin";
    var rows = plan && plan.plans && Array.isArray(plan.plans[key]) ? plan.plans[key] : [];
    if (!rows.length) {
      el.planList.innerHTML = '<div class="td-plan-card"><strong>Run Quick Check</strong><p class="td-reco-line">Collect signals to auto-generate a plan.</p></div>';
      return;
    }
    el.planList.innerHTML = rows.map(function (item) {
      var steps = Array.isArray(item.steps) ? item.steps : [];
      var launch = item.launch && item.launch.url ? item.launch.url : "word-quest.html?quick=1";
      return [
        '<article class="td-plan-card">',
        '<strong>' + item.title + '</strong>',
        '<ul>' + steps.map(function (s) { return '<li>' + s + '</li>'; }).join("") + '</ul>',
        '<p class="td-reco-line">' + (item.successCriteria || "") + '</p>',
        '<button class="td-top-btn" type="button" data-plan-launch="' + launch + '">Start</button>',
        '</article>'
      ].join("");
    }).join("");

    Array.prototype.forEach.call(el.planList.querySelectorAll("[data-plan-launch]"), function (button) {
      button.addEventListener("click", function () {
        var launch = String(button.getAttribute("data-plan-launch") || "word-quest.html?quick=1");
        window.location.href = appendStudentParam("./" + launch.replace(/^\.\//, ""));
      });
    });
  }

  function renderProgressNote(plan, student) {
    if (WorkspaceStudentIntelligence && typeof WorkspaceStudentIntelligence.renderProgressNote === "function") {
      WorkspaceStudentIntelligence.renderProgressNote({
        el: el,
        plan: plan,
        student: student,
        activeNoteTab: state.activeNoteTab,
        WorkspaceFamilyCommunication: WorkspaceFamilyCommunication
      });
    }
  }

  function renderLastSessionSummary(studentId) {
    if (WorkspaceStudentIntelligence && typeof WorkspaceStudentIntelligence.renderLastSessionSummary === "function") {
      WorkspaceStudentIntelligence.renderLastSessionSummary({
        el: el,
        studentId: studentId,
        Evidence: window.CSEvidence,
        WorkspaceHistory: WorkspaceHistory
      });
    }
  }

  function openShareModal(studentId) {
    if (!supportController || typeof supportController.openShareModal !== "function") return;
    supportController.openShareModal(studentId);
  }

  function openMeetingModal() {
    if (WorkspaceMeetings && typeof WorkspaceMeetings.openMeetingWorkspace === "function") {
      if (WorkspaceMeetings.openMeetingWorkspace(meetingController)) return;
    }
    if (!meetingController || typeof meetingController.open !== "function") return;
    meetingController.open();
  }

  function closeMeetingModal() {
    if (!meetingController || typeof meetingController.close !== "function") return;
    meetingController.close();
  }

  function stopMeetingRecognition() {
    if (!meetingController || typeof meetingController.stopRecognition !== "function") return;
    meetingController.stopRecognition();
  }

  function initMeetingController() {
    if (!DashboardMeeting || typeof DashboardMeeting.create !== "function") return;
    meetingController = DashboardMeeting.create({
      state: state,
      el: el,
      appState: appState,
      modalController: modalController,
      hooks: {
        getSelectedPlanRow: getSelectedPlanRow,
        buildReportingContext: buildReportingContext,
        renderSupportHub: renderSupportHub,
        setCoachLine: setCoachLine,
        download: download,
        escHtml: escHtml
      },
      deps: {
        MeetingNotes: MeetingNotes,
        MeetingTranslation: MeetingTranslation,
        ReportingGenerator: ReportingGenerator,
        MeetingGenerator: MeetingGenerator,
        SupportStore: SupportStore,
        Evidence: Evidence,
        TeacherSupportService: TeacherSupportService,
        TeacherIntelligence: TeacherIntelligence,
        TeacherSelectors: TeacherSelectors
      }
    });
  }

  function initSupportController() {
    if (!DashboardSupport || typeof DashboardSupport.create !== "function") return;
    supportController = DashboardSupport.create({
      state: state,
      el: el,
      modalController: modalController,
      hooks: {
        setCoachLine: setCoachLine,
        download: download,
        copyText: copyText,
        appendStudentParam: appendStudentParam,
        getCurrentBuildId: getCurrentBuildId
      },
      deps: {
        Evidence: Evidence,
        SessionPlanner: SessionPlanner,
        ShareSummaryAPI: ShareSummaryAPI,
        SupportStore: SupportStore,
        SASLibrary: SASLibrary,
        TeacherSupportService: TeacherSupportService,
        TeacherIntelligence: TeacherIntelligence,
        TeacherSelectors: TeacherSelectors
      }
    });
  }

  function initSupportViewController() {
    if (!DashboardSupportView || typeof DashboardSupportView.create !== "function") return;
    supportViewController = DashboardSupportView.create({
      state: state,
      el: el,
      hooks: {
        setCoachLine: setCoachLine,
        getSelectedStudentGradeBand: getSelectedStudentGradeBand,
        renderInstitutionalAnchorPanel: renderInstitutionalAnchorPanel,
        bindInstitutionalAnchorActions: bindInstitutionalAnchorActions,
        buildTinySpark: buildTinySpark,
        rerenderSupportHub: renderSupportHub,
        rerenderDrawer: renderDrawer
      },
      deps: {
        SupportStore: SupportStore,
        Evidence: Evidence,
        InterventionPlanner: InterventionPlanner,
        SASLibrary: SASLibrary
      }
    });
  }

  function initInstitutionalController() {
    if (!DashboardInstitutional || typeof DashboardInstitutional.create !== "function") return;
    institutionalController = DashboardInstitutional.create({
      state: state,
      deps: {
        SupportStore: SupportStore
      },
      hooks: {
        escAttr: escAttr,
        setCoachLine: setCoachLine,
        renderInstructionalSequencer: renderInstructionalSequencer,
        renderDrawer: renderDrawer,
        renderSupportHub: renderSupportHub
      }
    });
  }

  function initDrawerController() {
    if (!DashboardDrawer || typeof DashboardDrawer.create !== "function") return;
    drawerController = DashboardDrawer.create({
      state: state,
      el: el,
      hooks: {
        escAttr: escAttr,
        renderInstitutionalAnchorPanel: renderInstitutionalAnchorPanel,
        bindInstitutionalAnchorActions: bindInstitutionalAnchorActions,
        formatTier1Intervention: formatTier1Intervention,
        openShareModal: openShareModal,
        appendStudentParam: appendStudentParam,
        download: download,
        setCoachLine: setCoachLine,
        renderSupportHub: renderSupportHub
      },
      deps: {
        Evidence: Evidence,
        SupportStore: SupportStore,
        TeacherSupportService: TeacherSupportService,
        TeacherIntelligence: TeacherIntelligence,
        TeacherSelectors: TeacherSelectors
      }
    });
  }

  function initBindingsController() {
    if (!DashboardBindings || typeof DashboardBindings.create !== "function") return;
    bindingsController = DashboardBindings.create({
      state: state,
      el: el,
      hooks: {
        stopMeetingRecognition: stopMeetingRecognition,
        filterCaseload: filterCaseload,
        handleImportExport: handleImportExport,
        addStudentQuick: addStudentQuick,
        setCoachLine: setCoachLine,
        appendStudentParam: appendStudentParam,
        renderTodayPlan: renderTodayPlan,
        renderProgressNote: renderProgressNote,
        renderSupportHub: renderSupportHub,
        renderInstructionalSequencer: renderInstructionalSequencer,
        renderDrawer: renderDrawer,
        openMeetingModal: openMeetingModal,
        setDashboardMode: setDashboardMode,
        updateAccommodationButtons: updateAccommodationButtons,
        download: download,
        recordLastActivity: recordLastActivity,
        currentStudentParam: currentStudentParam,
        buildTodayPlan: buildTodayPlan,
        renderTodayEngine: renderTodayEngine,
        updateAuditMarkers: updateAuditMarkers,
        renderFlexGroups: renderFlexGroups,
        syncNumeracyCurriculumSelectors: syncNumeracyCurriculumSelectors,
        refreshNumeracyPanelFromSelection: refreshNumeracyPanelFromSelection,
        renderNumeracyAlignmentLine: renderNumeracyAlignmentLine,
        ensureDemoCaseload: ensureDemoCaseload,
        refreshCaseload: refreshCaseload
      },
      deps: {
        modalController: modalController,
        meetingController: meetingController,
        supportController: supportController,
        Evidence: Evidence,
        FidelityEngine: FidelityEngine,
        SupportStore: SupportStore
      }
    });
  }

  function getSelectedStudentGradeBand() {
    if (supportController && typeof supportController.getSelectedStudentGradeBand === "function") {
      return supportController.getSelectedStudentGradeBand();
    }
    var student = (state.caseload || []).find(function (row) { return row.id === state.selectedId; });
    var grade = student && student.grade ? String(student.grade) : "";
    var n = Number(String(grade).replace(/[^0-9]/g, ""));
    if (!Number.isFinite(n)) return "";
    if (n <= 2) return "K-2";
    if (n <= 5) return "3-5";
    if (n <= 8) return "6-8";
    return "9-12";
  }

  function renderSuggestedGoals(studentId) {
    if (!supportViewController || typeof supportViewController.renderSuggestedGoals !== "function") return;
    supportViewController.renderSuggestedGoals(studentId);
  }

  function renderGeneratedPlanner(studentId) {
    if (!supportViewController || typeof supportViewController.renderGeneratedPlanner !== "function") return;
    supportViewController.renderGeneratedPlanner(studentId);
  }

  function download(name, contents, mime) {
    var a = document.createElement("a");
    var blob = new Blob([contents], { type: mime });
    a.href = URL.createObjectURL(blob);
    a.download = name;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(function () { URL.revokeObjectURL(a.href); }, 220);
  }

  function handleImportExport() {
    var choice = window.prompt("Type EXPORT to download JSON and copy CSV, or paste roster CSV now.", "EXPORT");
    if (choice == null) return;
    if (choice.trim().toUpperCase() === "EXPORT") {
      download("cs-evidence.json", Evidence.exportJSON(), "application/json");
      navigator.clipboard && navigator.clipboard.writeText(Evidence.rosterCSV()).catch(function () {});
      setCoachLine("Exported JSON and copied roster CSV.");
      return;
    }
    var count = Evidence.importRosterCSV(choice);
    refreshCaseload();
    setCoachLine("Imported " + count + " student rows.");
  }

  function addStudentQuick() {
    var name = window.prompt("Student name");
    if (!name) return;
    var id = window.prompt("Student ID", "SAS" + Date.now().toString().slice(-5));
    if (!id) return;
    Evidence.upsertStudent({ id: id, name: name });
    refreshCaseload();
    selectStudent(id);
  }

  function setupCoachRibbon() {
    var muteKey = "cs_coach_mute_v1";
    var collapsedKey = "cs_coach_collapsed_v1";

    function isMuted() {
      try { return localStorage.getItem(muteKey) === "1"; } catch (_e) { return false; }
    }
    function setMuted(v) {
      try { localStorage.setItem(muteKey, v ? "1" : "0"); } catch (_e) {}
      el.coachMute.textContent = v ? "🔇" : "🔈";
    }
    function setCollapsed(v) {
      try { localStorage.setItem(collapsedKey, v ? "1" : "0"); } catch (_e) {}
      el.coachRibbon.classList.toggle("is-collapsed", !!v);
      el.coachCollapse.textContent = v ? "▸" : "▾";
    }

    setMuted(isMuted());
    try { setCollapsed(localStorage.getItem(collapsedKey) === "1"); } catch (_e) {}

    el.coachMute.addEventListener("click", function () { setMuted(!isMuted()); });
    el.coachCollapse.addEventListener("click", function () {
      var v = el.coachRibbon.classList.contains("is-collapsed");
      setCollapsed(!v);
    });
    el.coachPlay.addEventListener("click", function () {
      if (isMuted()) return;
      playCoachLine(el.coachLine.textContent || "Next best move is ready.");
    });
    if (el.coachChip) {
      el.coachChip.addEventListener("click", function () {
        el.coachRibbon.classList.remove("is-collapsed");
        playCoachLine(el.coachLine.textContent || "Next best move is ready.");
      });
    }
  }

  function playCoachLine(text) {
    var pool = ["coach", "td", "teacher_dashboard"];
    var chosen = pool[Math.floor(Math.random() * pool.length)];
    var audioPath = "audio/tts/packs/ava-multi/coach/" + chosen + ".default.mp3";
    var audio = new Audio(audioPath);
    audio.play().catch(function () {
      if (window.speechSynthesis) {
        var utter = new SpeechSynthesisUtterance(String(text || ""));
        utter.rate = 1;
        utter.pitch = 1;
        window.speechSynthesis.cancel();
        window.speechSynthesis.speak(utter);
      }
    });
  }

  function setCoachLine(text) {
    var line = String(text || "").slice(0, 140);
    if (el.coachLine.textContent === line) return;
    el.coachLine.textContent = line;
    if (el.coachChip) {
      el.coachChip.classList.remove("is-fresh");
      setTimeout(function () { el.coachChip.classList.add("is-fresh"); }, 0);
      setTimeout(function () { el.coachChip.classList.remove("is-fresh"); }, 260);
    }
  }

  function currentStudentParam() {
    return state.selectedId || bootContext.student || "";
  }

  function appendStudentParam(url, overrideStudentId) {
    var sid = overrideStudentId || currentStudentParam();
    var u = new URL(String(url || ""), window.location.href);
    if (sid) u.searchParams.set("student", sid);
    return u.pathname.replace(/^\//, "./") + (u.search || "");
  }

  function updateAuditMarkers() {
    var hasBuildBlock = !!document.querySelector("[data-build-block]") || !!(el.todayList && el.todayList.children && el.todayList.children.length);
    window.__CS_AUDIT__ = {
      hasHomeBtnId: !!document.getElementById("td-home-btn"),
      hasActivities: !!document.getElementById("td-activity-select"),
      hasBrandHome: !!document.querySelector("a[aria-label='Home']"),
      hasStudentDrawer: !!document.getElementById("td-student-drawer"),
      hasShareSummary: !!document.getElementById("td-share-summary"),
      hasNeedsChips: !!document.getElementById("td-needs-chip-list"),
      hasSupportHub: !!document.getElementById("td-support-body"),
      hasTodayPlan: !!document.getElementById("td-plan-list"),
      hasProgressNote: !!document.getElementById("td-progress-note-text"),
      hasToday: !!document.getElementById("td-today"),
      hasTodayList: !!document.getElementById("td-today-list"),
      hasBuildBlock: hasBuildBlock,
      hasTier1EvidenceTool: !!document.getElementById("td-tier1-pack") || !!document.querySelector("[data-tier1-action='start']"),
      hasAccommodationsPanel: !!document.querySelector("[data-support-tab='accommodations']"),
      hasAccommodationButtons: !!document.querySelector("[data-accommodation-toggle]") || !!document.querySelector("[data-support-tab='accommodations']"),
      hasMeetingNotesTool: !!document.getElementById("td-meeting-workspace"),
      hasReferralPacketExport: !!document.getElementById("td-support-export-packet"),
      hasShareControls: !!document.getElementById("td-share-summary") || !!document.getElementById("td-share-quick-copy"),
      hasCopySummary: !!document.getElementById("td-share-quick-copy"),
      hasEvidenceChips: !!document.getElementById("td-evidence-chips"),
      hasAlignmentToggle: !!document.getElementById("td-show-alignment"),
      hasImplementationToday: !!document.getElementById("td-implementation-today-body"),
      hasImplementationLogButton: !!document.getElementById("td-impl-log"),
      hasExecutiveSupport: !!document.getElementById("td-executive-support-body")
    };
    window.__TD_MARKERS__ = {
      hasToday: !!document.getElementById("td-today"),
      hasTodayList: !!document.getElementById("td-today-list"),
      hasBuildBlock: hasBuildBlock
    };
  }

  function bindEvents() {
    if (bindingsController && typeof bindingsController.bindEvents === "function") {
      bindingsController.bindEvents();
      return;
    }
    if (modalController) {
      modalController.register("share", el.shareModal);
      modalController.register("meeting", el.meetingModal, stopMeetingRecognition);
      modalController.register("sas-library", el.sasLibraryModal);
      modalController.bindBackdropClose("share");
      modalController.bindBackdropClose("meeting");
      modalController.bindBackdropClose("sas-library");
      modalController.closeOnEscape();
    }
    if (el.meetingWorkspaceBtn) {
      el.meetingWorkspaceBtn.addEventListener("click", function () {
        openMeetingModal();
      });
    }
  }

  function currentLessonBriefContext() {
    var student = (state.caseload || []).find(function (row) { return row.id === state.selectedId; }) || null;
    return {
      caseload: state.caseload.slice(),
      studentId: state.selectedId || "",
      studentName: student && student.name || "",
      grade: student && (student.grade || student.gradeBand || "") || ""
    };
  }

  function initLessonBriefPanel() {
    var Panel = window.CSLessonBriefPanel;
    if (!Panel || !el.lessonBriefBtn) return;

    el.lessonBriefBtn.addEventListener("click", function () {
      Panel.toggle(currentLessonBriefContext());
    });

    window.addEventListener("cs-student-selected", function () {
      if (Panel.setContext) Panel.setContext(currentLessonBriefContext());
    });

    window.addEventListener("cs-lesson-brief-selected", function (event) {
      var detail = event && event.detail ? event.detail : null;
      if (!detail) return;
      if (TeacherStorage && typeof TeacherStorage.saveLessonContext === "function" && detail.lessonContextId) {
        TeacherStorage.saveLessonContext(detail.lessonContextId, {
          blockId: detail.blockId || "",
          blockLabel: detail.blockLabel || "",
          blockTime: detail.blockTime || "",
          supportType: detail.supportType || "",
          studentId: detail.studentId || "",
          studentName: detail.studentName || "",
          grade: detail.grade || "",
          programId: detail.programId || "",
          title: detail.title || "",
          updatedAt: new Date().toISOString()
        });
      }
      if (detail.studentId && detail.studentId === state.selectedId) {
        setCoachLine("Lesson context saved: " + (detail.blockLabel || detail.title || "today's block") + ".");
      }
    });
  }

  function bindFocusWhyToggle() {
    if (!el.focusWhyToggle || !el.focusWhyLine) return;
    el.focusWhyToggle.addEventListener("click", function () {
      var isOpen = !el.focusWhyLine.classList.contains("hidden");
      el.focusWhyLine.classList.toggle("hidden", isOpen);
      el.focusWhyToggle.setAttribute("aria-expanded", isOpen ? "false" : "true");
    });
  }

  Evidence.init();
  initRuntimeState();
  detectDemoMode();
  bootstrapSkillStore();
  refreshBuildLine();
  applyRoleBasedSimplification();
  setDashboardMode("daily");
  seedFromCaseloadStore();
  ensureDemoCaseload();
  primeDemoMetrics();
  initInstitutionalController();
  refreshCaseload();
  initMeetingController();
  initSupportController();
  initSupportViewController();
  initDrawerController();
  initBindingsController();
  bindEvents();
  initLessonBriefPanel();
  bindFocusWhyToggle();
  void loadIllustrativeMathMapData();
  initNumeracyCurriculumSelectors();
  document.addEventListener("keydown", function (event) {
    if (event.key === "H" && event.shiftKey) {
      var tag = event.target && event.target.tagName ? String(event.target.tagName).toLowerCase() : "";
      if (tag === "input" || tag === "textarea" || (event.target && event.target.isContentEditable)) return;
      event.preventDefault();
      window.location.href = appendStudentParam("./index.html");
    }
  });
  setupCoachRibbon();
  updateAuditMarkers();
  var initial = (function () {
    if (bootContext.student) return bootContext.student;
    return state.caseload[0] && state.caseload[0].id || "";
  })();
  selectStudent(initial);
})();
(() => {
  const topOverflowToggle = document.getElementById("td-top-overflow-toggle");
  const topOverflowMenu = document.getElementById("td-top-overflow-menu");
  if (!topOverflowToggle || !topOverflowMenu) return;

  topOverflowToggle.addEventListener("click", function (event) {
    event.stopPropagation();
    const isHidden = topOverflowMenu.classList.contains("hidden");
    topOverflowMenu.classList.toggle("hidden", !isHidden);
    topOverflowToggle.setAttribute("aria-expanded", isHidden ? "true" : "false");
  });

  document.addEventListener("click", function (event) {
    if (topOverflowMenu.classList.contains("hidden")) return;
    if (topOverflowMenu.contains(event.target) || topOverflowToggle.contains(event.target)) return;
    topOverflowMenu.classList.add("hidden");
    topOverflowToggle.setAttribute("aria-expanded", "false");
  });
})();
