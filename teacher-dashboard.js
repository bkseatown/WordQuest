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
  var DashboardState = window.CSDashboardState;
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
  var SupportStore = window.CSSupportStore;
  var MeetingNotes = window.CSMeetingNotes;
  var MeetingTranslation = window.CSMeetingTranslation;
  var SASLibrary = window.CSSASLibrary;
  var CaseloadStore = window.CSCaseloadStore;
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
    fidelitySeeded: {},
    numeracyPracticeSeeded: {},
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
    executivePlan: null
  };
  var skillStoreLogged = false;

  var LAST_ACTIVITY_KEY = "cs.lastActivityByStudent.v1";
  var DASHBOARD_RUNTIME_KEY = "cs.dashboard.runtime.v1";
  var appState = DashboardState && typeof DashboardState.create === "function"
    ? DashboardState.create()
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
    focusStudentName: document.getElementById("td-focus-student-name"),
    focusTierLine: document.getElementById("td-focus-tier-line"),
    focusReasonLine: document.getElementById("td-focus-reason-line"),
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
    if (state.numeracyPracticeSeeded[key]) return;
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
    state.numeracyPracticeSeeded[key] = true;
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
    if (sid && FidelityEngine && typeof FidelityEngine.logInterventionSession === "function" && !state.fidelitySeeded[sid]) {
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
      state.fidelitySeeded[sid] = true;
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
    if (el.focusFidelityLine) {
      var fidelitySummary = input.fidelitySummary || {};
      var fidelityPct = Math.round(Number(input.fidelityPercent || fidelitySummary.fidelityPercent || 0));
      var totalSessions = Math.max(0, Math.round(Number(fidelitySummary.totalSessions || 0)));
      el.focusFidelityLine.textContent = "Fidelity: " + fidelityPct + "% over " + totalSessions + " sessions";
      el.focusFidelityLine.classList.remove("fidelity-good", "fidelity-mid", "fidelity-low");
      if (fidelityPct >= 80) el.focusFidelityLine.classList.add("fidelity-good");
      else if (fidelityPct >= 60) el.focusFidelityLine.classList.add("fidelity-mid");
      else el.focusFidelityLine.classList.add("fidelity-low");
    }
    if (el.confidenceLine) {
      var trend = String(s.trendDecision || "HOLD").toUpperCase();
      var fidelityState = Math.round(Number(input.fidelityPercent || 0)) >= 70 ? "active" : "watch";
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
    var summary = Evidence && typeof Evidence.getStudentSummary === "function" ? Evidence.getStudentSummary(state.selectedId) : null;
    var student = summary && summary.student ? summary.student : {};
    var numeracy = latestNumeracyRecommendation(row);
    var executive = buildExecutiveProfileAndPlan(row || null);
    var tierSignal = computeTierSignalForRow(row);
    var tierInput = tierSignal.input || {};
    var literacyFrameworks = frameworkListFromAlignment(getFrameworkAlignmentSafe(summary ? summary.focus : "literacy"));
    var numeracyFrameworks = frameworkListFromAlignment(getFrameworkAlignmentSafe(numeracy.contentFocus || "numeracy"));
    var curriculumLine = el.numCurriculumLine ? String(el.numCurriculumLine.textContent || "").trim() : "";
    var literacyData = {
      focus: summary ? String(summary.focus || "Foundational literacy") : "Foundational literacy",
      growth: summary && summary.metrics ? Number(summary.metrics.weekDelta || 0.12) : 0.12,
      nextStep: summary && summary.nextMove ? String(summary.nextMove.line || "Continue targeted literacy support.") : "Continue targeted literacy support.",
      tier: String(tierSignal.tierLevel || (summary && summary.metrics ? summary.metrics.tierLabel : "Tier 2")),
      recentAccuracy: Number(tierInput.recentAccuracy || 0.72),
      goalAccuracy: Number(tierInput.goalAccuracy || 0.8),
      stableCount: Number(tierInput.stableCount || 2),
      weeksInIntervention: Number(tierInput.weeksInIntervention || 6),
      fidelitySummary: tierInput.fidelitySummary || { fidelityPercent: 82, totalSessions: 6 },
      curriculumAlignment: "Literacy sequencing aligned to active instructional pathways.",
      frameworkAlignment: literacyFrameworks
    };
    var numeracyData = {
      contentFocus: numeracy.contentFocus,
      strategyStage: numeracy.strategyStage,
      practiceMode: numeracy.practiceMode,
      tierSignal: numeracy.tierSignal,
      recommendedAction: numeracy.recommendedAction,
      executiveSupport: {
        primaryBarrier: executive.profile.primaryBarrier,
        weeklyGoal: executive.plan.weeklyGoal,
        dailySupportActions: executive.plan.dailySupportActions,
        progressMetric: executive.plan.progressMetric,
        parentExplanation: "School is supporting organization and task completion with clear steps, check-ins, and accommodations."
      },
      fidelitySummary: tierInput.fidelitySummary || { fidelityPercent: 82, totalSessions: 6 },
      curriculumAlignment: curriculumLine || "Numeracy sequencing aligned to active instructional pathways.",
      frameworkAlignment: numeracyFrameworks
    };
    var studentProfile = {
      id: String(student.id || state.selectedId),
      name: String(student.name || "Student"),
      grade: String(student.grade || "G5"),
      tier: literacyData.tier,
      recentAccuracy: Number(tierInput.recentAccuracy || 0.72),
      goalAccuracy: Number(tierInput.goalAccuracy || 0.8),
      stableCount: Number(tierInput.stableCount || 2),
      weeksInIntervention: Number(tierInput.weeksInIntervention || 6)
    };
    return {
      summary: summary,
      studentProfile: studentProfile,
      literacyData: literacyData,
      numeracyData: numeracyData,
      tierSignal: tierSignal,
      fidelityData: tierInput.fidelitySummary || { fidelityPercent: 82, totalSessions: 6 }
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

  function setDashboardMode(mode) {
    var next = DashboardUI && typeof DashboardUI.applyMode === "function"
      ? DashboardUI.applyMode(mode, el)
      : String(mode || "daily").toLowerCase();
    appState.set({ mode: next });
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

  function getLastActivityMap() {
    var parsed = safeJsonParse(localStorage.getItem(LAST_ACTIVITY_KEY), {});
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return {};
    return parsed;
  }

  function setLastActivityMap(map) {
    localStorage.setItem(LAST_ACTIVITY_KEY, JSON.stringify(map || {}));
  }

  function getLastActivity(studentId) {
    if (!studentId) return null;
    var map = getLastActivityMap();
    return map[String(studentId)] || null;
  }

  function recordLastActivity(studentId, moduleKey) {
    if (!studentId || !moduleKey) return;
    var map = getLastActivityMap();
    map[String(studentId)] = { module: String(moduleKey), ts: Date.now() };
    setLastActivityMap(map);
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
    if (CaseloadStore && typeof CaseloadStore.getAll === "function") {
      var rows = CaseloadStore.getAll() || [];
      if (rows.length) {
        return rows.map(function (x) {
          return {
            id: String(x.id || x.studentId || x.key || x.name || ""),
            name: String(x.name || x.studentName || x.id || "Student"),
            grade: String(x.grade || x.gradeLevel || "")
          };
        });
      }
    }
    if (Evidence && typeof Evidence.listCaseload === "function") {
      var caseload = Evidence.listCaseload() || [];
      if (caseload.length) {
        return caseload.map(function (row) {
          return { id: String(row.id), name: String(row.name), grade: String(row.gradeBand || "") };
        });
      }
    }
    var localRows = safeJsonParse(localStorage.getItem("cs.caseload.v1"), []);
    if (Array.isArray(localRows) && localRows.length) {
      return localRows.map(function (x) {
        return {
          id: String(x.id || x.studentId || x.name || ""),
          name: String(x.name || "Student"),
          grade: String(x.grade || x.gradeLevel || "")
        };
      });
    }
    return [
      { id: "demo-a", name: "Demo Student A", grade: "G5" },
      { id: "demo-b", name: "Demo Student B", grade: "G4" },
      { id: "demo-c", name: "Demo Student C", grade: "G6" }
    ];
  }

  function getStudentEvidence(studentId) {
    if (!studentId) return null;
    if (EvidenceEngine && typeof EvidenceEngine.getStudentSkillSnapshot === "function") {
      return EvidenceEngine.getStudentSkillSnapshot(studentId);
    }
    if (Evidence && typeof Evidence.computeStudentSnapshot === "function") {
      return Evidence.computeStudentSnapshot(studentId);
    }
    var localEvidence = safeJsonParse(localStorage.getItem("cs.evidence.v1"), {});
    return localEvidence[String(studentId)] || null;
  }

  function focusFromSnapshot(snapshot) {
    if (snapshot && Array.isArray(snapshot.topSkills) && snapshot.topSkills.length) {
      var skillIds = snapshot.topSkills.slice(0, 3).map(function (skill) { return String(skill.skillId || ""); });
      if (SkillLabels && typeof SkillLabels.getPrettyTargets === "function") {
        return SkillLabels.getPrettyTargets(skillIds);
      }
      return skillIds.filter(Boolean);
    }
    var needs = snapshot && Array.isArray(snapshot.needs) ? snapshot.needs : [];
    if (needs.length) return needs.slice(0, 2).map(function (need) { return String(need.label || "Need"); });
    return ["Collect baseline"];
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

  function scoreStudent(student) {
    var sid = String(student && student.id || "");
    var snapshot = getStudentEvidence(sid) || {};
    var computed = safeComputePriority(sid);
    if (computed && computed.ok && computed.priority) {
      return Number(computed.priority.overallPriority || 0);
    }
    var last = getLastActivity(sid);
    var trend = snapshot.trends && snapshot.trends.wordquest;
    var lastPoint = trend && Array.isArray(trend.last7) && trend.last7.length ? trend.last7[trend.last7.length - 1] : null;
    var score = 0;

    if (!lastPoint) score += 35;
    if (lastPoint && Number(lastPoint.score || 0) < 65) score += 25;
    if (snapshot.needs && snapshot.needs.length) {
      score += snapshot.needs.reduce(function (sum, need) {
        return sum + (Number(need.severity || 1) * Number(need.confidence || 0.5) * 3);
      }, 0);
    }
    if (snapshot.updatedAt) score += Math.min(20, ageDays(Date.parse(snapshot.updatedAt)) * 2);
    score += Math.min(20, ageDays(last && last.ts) * 2);
    return score;
  }

  function heuristicScore(student, snapshot) {
    var sid = String(student && student.id || "");
    var snap = snapshot || {};
    var last = getLastActivity(sid);
    var trend = snap.trends && snap.trends.wordquest;
    var lastPoint = trend && Array.isArray(trend.last7) && trend.last7.length ? trend.last7[trend.last7.length - 1] : null;
    var score = 0;
    if (!lastPoint) score += 35;
    if (lastPoint && Number(lastPoint.score || 0) < 65) score += 25;
    if (snap.needs && snap.needs.length) {
      score += snap.needs.reduce(function (sum, need) {
        return sum + (Number(need.severity || 1) * Number(need.confidence || 0.5) * 3);
      }, 0);
    }
    if (snap.updatedAt) score += Math.min(20, ageDays(Date.parse(snap.updatedAt)) * 2);
    score += Math.min(20, ageDays(last && last.ts) * 2);
    return score;
  }

  function safeComputePriority(studentId) {
    if (!EvidenceEngine || typeof EvidenceEngine.computePriority !== "function") {
      return { ok: false, priority: null, reason: "missing-engine" };
    }
    try {
      var priority = EvidenceEngine.computePriority(String(studentId || ""));
      return { ok: true, priority: priority || null, reason: "" };
    } catch (_err) {
      return { ok: false, priority: null, reason: "compute-failed" };
    }
  }

  function buildTodayPlan() {
    var allRows = getCaseload()
      .map(function (student) {
        var sid = String(student.id || "");
        var snapshot = getStudentEvidence(sid) || null;
        var computed = safeComputePriority(sid);
        var priority = computed.ok ? computed.priority : null;
        var fallbackScore = heuristicScore(student, snapshot || {});
        return {
          student: student,
          snapshot: snapshot,
          priority: priority,
          priorityFallback: !computed.ok,
          focus: focusFromSnapshot(priority && priority.topSkills && priority.topSkills.length ? priority : snapshot),
          lastActivity: getLastActivity(sid),
          score: computed.ok ? Number(priority && priority.overallPriority || 0) : fallbackScore
        };
      });
    var ranked = allRows.slice().sort(function (a, b) { return b.score - a.score; }).slice(0, 3);

    if (!ranked.length) {
      ranked = [
        { id: "demo-a", name: "Demo Student A", grade: "G5" },
        { id: "demo-b", name: "Demo Student B", grade: "G4" },
        { id: "demo-c", name: "Demo Student C", grade: "G6" }
      ].map(function (student) {
        return {
          student: student,
          snapshot: null,
          priority: null,
          focus: ["Collect baseline"],
          lastActivity: getLastActivity(student.id),
          score: 0
        };
      });
    }

    return { students: ranked, allStudents: allRows };
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
    if (!top) return "Missing evidence; collect baseline signal.";
    var need = Number(top.need || 0);
    if (need >= 0.65) return "High need signal on " + formatSkillBreadcrumb(top.skillId) + ".";
    if (need >= 0.4) return "Developing signal on " + formatSkillBreadcrumb(top.skillId) + ".";
    return "Monitor consistency for " + formatSkillBreadcrumb(top.skillId) + ".";
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
      if (el.focusStudentName) el.focusStudentName.textContent = "Select a student";
      if (el.focusTierLine) el.focusTierLine.textContent = "Tier 2 focus";
      if (el.focusReasonLine) el.focusReasonLine.textContent = "Search a student to get a clear next move.";
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

    if (el.focusStudentName) el.focusStudentName.textContent = String(focusStudent.name || "Select a student");
    if (el.focusTierLine) el.focusTierLine.textContent = focusTier + " focus";
    if (el.focusReasonLine) el.focusReasonLine.textContent = signalLineForRow(focus);
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
        el.focusStartBtn.classList.add("is-launching");
        setTimeout(function () {
          if (el.focusStartBtn) el.focusStartBtn.classList.remove("is-launching");
        }, 220);
        window.location.href = appendStudentParam("./" + href.replace(/^\.\//, ""), sid);
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
        window.location.href = appendStudentParam("./" + target + ".html", sid);
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
    state.caseload = Evidence.listCaseload();
    filterCaseload(el.search.value || "");
    el.noCaseload.classList.toggle("hidden", state.caseload.length > 0);
    state.todayPlan = buildTodayPlan();
    renderTodayEngine(state.todayPlan);
    updateAuditMarkers();
  }

  function filterCaseload(query) {
    var q = String(query || "").trim().toLowerCase();
    state.filtered = state.caseload.filter(function (row) {
      if (!q) return true;
      return row.name.toLowerCase().includes(q) || row.id.toLowerCase().includes(q) || row.focus.toLowerCase().includes(q);
    });
    renderCaseload();
  }

  function renderCaseload() {
    if (!state.filtered.length) {
      el.list.innerHTML = '<div class="td-empty">No matches. Try name, student ID, or focus.</div>';
      return;
    }
    el.list.innerHTML = state.filtered.map(function (row) {
      var selected = row.id === state.selectedId ? "is-active" : "";
      return [
        '<button class="td-student-chip ' + selected + '" data-student-id="' + row.id + '" type="button">',
        '<div class="td-chip-top"><strong>' + row.name + '</strong><span class="td-risk ' + row.risk + '">' + row.risk + '</span></div>',
        '<div class="td-chip-top"><span>' + row.id + '</span><span>' + row.focus + '</span></div>',
        '</button>'
      ].join("");
    }).join("");

    Array.prototype.forEach.call(el.list.querySelectorAll("[data-student-id]"), function (node) {
      node.addEventListener("click", function () {
        selectStudent(node.getAttribute("data-student-id") || "");
      });
    });
  }

  function buildSparkPath(points) {
    var arr = Array.isArray(points) && points.length ? points : [46, 49, 54, 58, 62, 60, 64];
    var max = Math.max.apply(Math, arr);
    var min = Math.min.apply(Math, arr);
    var span = Math.max(1, max - min);
    return arr.map(function (value, index) {
      var x = Math.round((index / Math.max(1, arr.length - 1)) * 180);
      var y = Math.round(46 - ((value - min) / span) * 40);
      return (index ? "L" : "M") + x + " " + y;
    }).join(" ");
  }

  function selectStudent(studentId) {
    state.selectedId = String(studentId || "");
    if (DashboardFocus && typeof DashboardFocus.setSelectedStudent === "function") {
      DashboardFocus.setSelectedStudent(appState, state.selectedId);
    } else {
      appState.set({ selectedStudentId: state.selectedId });
    }
    state.generatedPlanner = null;
    renderCaseload();
    if (!state.selectedId) {
      el.centerEmpty.classList.remove("hidden");
      el.centerSelected.classList.add("hidden");
      el.rightEmpty.classList.remove("hidden");
      el.rightContent.classList.add("hidden");
      if (el.metricAccuracy) el.metricAccuracy.textContent = "+0.0%";
      if (el.metricTier) el.metricTier.textContent = "Tier 2";
      if (el.metricSubline) el.metricSubline.textContent = "Accuracy +4.2% over last 3 sessions";
      if (el.lastSessionTitle) el.lastSessionTitle.textContent = "No recent quick check yet";
      if (el.lastSessionMeta) el.lastSessionMeta.textContent = "Run a 90-second Word Quest quick check to generate signals.";
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
      return;
    }

    var summary = Evidence.getStudentSummary(state.selectedId);
    state.snapshot = typeof Evidence.computeStudentSnapshot === "function"
      ? Evidence.computeStudentSnapshot(state.selectedId)
      : null;
    state.plan = PlanEngine && typeof PlanEngine.buildPlan === "function"
      ? PlanEngine.buildPlan({ student: summary.student, snapshot: state.snapshot || { needs: [] } })
      : null;
    el.centerEmpty.classList.add("hidden");
    el.centerSelected.classList.remove("hidden");
    el.rightEmpty.classList.add("hidden");
    el.rightContent.classList.remove("hidden");

    el.studentLabel.textContent = summary.student.name + " · " + summary.student.id;
    var spark = summary.last7Sparkline || [];
    var tail = spark.slice(-3);
    var delta = tail.length > 1 ? (tail[tail.length - 1] - tail[0]) : 0;
    var tierLabel = summary.risk === "risk" ? "Tier 3" : "Tier 2";

    el.focusTitle.textContent = tierLabel + " - Strategic Reinforcement Recommended";
    el.recoLine.textContent = summary.nextMove.line;
    el.last7Summary.textContent = "Last 7 sessions · " + summary.last7Sparkline.join(" / ");
    el.sparkline.innerHTML = '<path d="' + buildSparkPath(summary.last7Sparkline) + '" fill="none" stroke="var(--accent)" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"></path>';
    if (el.metricAccuracy) el.metricAccuracy.textContent = (delta >= 0 ? "+" : "") + delta.toFixed(1) + "%";
    if (el.metricTier) el.metricTier.textContent = tierLabel;
    if (el.metricSubline) el.metricSubline.textContent = "Accuracy " + (delta >= 0 ? "+" : "") + delta.toFixed(1) + "% over last 3 sessions";
    if (el.nextTierBadge) {
      el.nextTierBadge.textContent = tierLabel;
      el.nextTierBadge.className = "tier-badge " + (tierLabel === "Tier 3" ? "tier-3" : "tier-2");
    }

    if (el.quickCheck) {
      el.quickCheck.onclick = function () {
        var launch = state.plan && state.plan.plans && state.plan.plans.tenMin && state.plan.plans.tenMin[0] && state.plan.plans.tenMin[0].launch;
        var href = launch && launch.url ? launch.url : "word-quest.html?quick=1";
        window.location.href = appendStudentParam("./" + href.replace(/^\.\//, ""));
      };
    }
    if (el.startIntervention) {
      el.startIntervention.onclick = function () {
        el.startIntervention.classList.add("td-btn-once");
        setTimeout(function () { el.startIntervention.classList.remove("td-btn-once"); }, 260);
        var launch = state.plan && state.plan.plans && state.plan.plans.thirtyMin && state.plan.plans.thirtyMin[0] && state.plan.plans.thirtyMin[0].launch;
        var href = launch && launch.url ? launch.url : "word-quest.html?quick=1";
        window.location.href = appendStudentParam("./" + href.replace(/^\.\//, ""));
      };
    }

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
    setCoachLine(summary.nextMove.line);
  }

  function renderEvidenceChips(chips) {
    var rows = Array.isArray(chips) ? chips.slice(0, 8) : [];
    if (SupportStore && state.selectedId && typeof SupportStore.getRecentEvidencePoints === "function") {
      try {
        var recent = SupportStore.getRecentEvidencePoints(state.selectedId, 7, 8);
        recent.forEach(function (row) {
          if (Array.isArray(row.chips) && row.chips.length) {
            row.chips.slice(0, 2).forEach(function (chipText) {
              rows.push({ label: String(row.module || "Activity"), value: String(chipText || "") });
            });
          }
        });
      } catch (_e) {}
    }
    if (!rows.length) {
      el.evidenceChips.innerHTML = '<span class="td-chip">No recent evidence yet</span>';
      return;
    }
    el.evidenceChips.innerHTML = rows.slice(0, 12).map(function (chip) {
      return '<span class="td-chip"><strong>' + chip.label + ':</strong> ' + chip.value + '</span>';
    }).join("");
  }

  function buildTinySpark(points) {
    var arr = Array.isArray(points) && points.length ? points : [38, 42, 46, 50];
    var max = Math.max.apply(Math, arr);
    var min = Math.min.apply(Math, arr);
    var span = Math.max(1, max - min);
    return arr.map(function (value, idx) {
      var x = Math.round((idx / Math.max(1, arr.length - 1)) * 72);
      var y = Math.round(22 - ((Number(value || 0) - min) / span) * 18);
      return (idx ? "L" : "M") + x + " " + y;
    }).join(" ");
  }

  function renderSkillTiles(studentId) {
    if (!el.skillTiles) return;
    if (!studentId || !Evidence || typeof Evidence.getSkillModel !== "function") {
      el.skillTiles.innerHTML = '<div class="td-skill-tile"><p class="td-reco-line">Select a student to view skill tiles.</p></div>';
      return;
    }
    var model = Evidence.getSkillModel(studentId);
    var rows = model && model.mastery && typeof model.mastery === "object"
      ? Object.keys(model.mastery).map(function (skillId) {
          var row = model.mastery[skillId] || {};
          var mastery = Math.max(0, Math.min(100, Number(row.mastery || 0)));
          return {
            skillId: skillId,
            label: getSkillLabelSafe(skillId),
            mastery: mastery,
            level: Math.max(0, Math.min(3, Number(row.level || 0))),
            lastUpdated: String(row.lastUpdated || ""),
            sparkline: Array.isArray(row.sparkline) ? row.sparkline.slice(-7) : []
          };
        })
      : [];
    rows.sort(function (a, b) { return a.mastery - b.mastery; });
    if (!rows.length) {
      el.skillTiles.innerHTML = '<div class="td-skill-tile"><p class="td-reco-line">No skill evidence yet. Run a quick check.</p></div>';
      return;
    }
    el.skillTiles.innerHTML = rows.slice(0, 8).map(function (row) {
      var updated = row.lastUpdated ? new Date(row.lastUpdated).toLocaleDateString() : "—";
      return [
        '<article class="td-skill-tile">',
        '<div class="td-skill-head">',
        '<strong>' + row.label + '</strong>',
        '<span class="tier-badge tier-' + Math.max(1, Math.min(3, row.level + 1)) + '">L' + row.level + '</span>',
        '</div>',
        '<div class="td-skill-meter"><span style="width:' + row.mastery + '%"></span></div>',
        '<div class="td-skill-meta">',
        '<svg viewBox="0 0 72 24" preserveAspectRatio="none"><path d="' + buildTinySpark(row.sparkline) + '" /></svg>',
        '<span>' + row.mastery + '% · ' + updated + '</span>',
        '</div>',
        '</article>'
      ].join("");
    }).join("");
  }

  function renderNeeds(snapshot) {
    if (!el.needsChipList) return;
    var needs = snapshot && Array.isArray(snapshot.needs) ? snapshot.needs : [];
    if (!needs.length) {
      el.needsChipList.innerHTML = '<span class="td-chip">Run Quick Check to detect needs</span>';
      return;
    }
    el.needsChipList.innerHTML = needs.slice(0, 4).map(function (need) {
      var sev = Math.max(1, Math.min(5, Number(need.severity || 1)));
      var tierClass = sev >= 4 ? "tier-3" : (sev >= 3 ? "tier-2" : "tier-1");
      return '<span class="tier-badge ' + tierClass + '">' + need.label + ' · S' + sev + '</span>';
    }).join("");
    if (SupportStore && state.selectedId) {
      try {
        SupportStore.setNeeds(state.selectedId, needs.map(function (need) {
          return {
            key: String(need.key || need.skillId || need.label || ""),
            label: String(need.label || need.skillId || "Need"),
            domain: String(need.domain || ""),
            severity: Number(need.severity || 0)
          };
        }));
      } catch (_e) {}
    }
  }

  function getSkillEvidencePoints(studentId, skillId) {
    var sid = String(studentId || "");
    var id = String(skillId || "");
    if (!sid || !id) return [];
    if (EvidenceEngine && typeof EvidenceEngine._getSkillRows === "function") {
      return (EvidenceEngine._getSkillRows(sid, id) || []).map(function (row) {
        return {
          timestamp: row && row.timestamp,
          accuracy: row && row.result ? Number(row.result.accuracy) : NaN
        };
      });
    }
    return [];
  }

  function buildSkillGraph() {
    var graph = {};
    var taxonomy = window.__CS_SKILLSTORE__ && window.__CS_SKILLSTORE__.taxonomy;
    if (taxonomy && Array.isArray(taxonomy.strands)) {
      taxonomy.strands.forEach(function (strand) {
        (strand.skills || []).forEach(function (skill) {
          var id = String(skill && skill.id || "");
          if (!id) return;
          graph[id] = graph[id] || { prereq: [], next: [] };
          graph[id].prereq = Array.isArray(skill.prereq) ? skill.prereq.slice() : [];
        });
      });
      Object.keys(graph).forEach(function (id) {
        (graph[id].prereq || []).forEach(function (pre) {
          if (!graph[pre]) graph[pre] = { prereq: [], next: [] };
          if (graph[pre].next.indexOf(id) === -1) graph[pre].next.push(id);
        });
      });
      return graph;
    }
    return {
      "LIT.DEC.PHG": { prereq: [], next: ["LIT.DEC.SYL", "LIT.DEC.IRREG"] },
      "LIT.DEC.SYL": { prereq: ["LIT.DEC.PHG"], next: ["LIT.FLU.ACC"] },
      "LIT.DEC.IRREG": { prereq: ["LIT.DEC.PHG"], next: ["LIT.FLU.ACC"] },
      "LIT.FLU.ACC": { prereq: ["LIT.DEC.SYL"], next: ["LIT.LANG.SYN"] },
      "LIT.LANG.SYN": { prereq: ["LIT.FLU.ACC"], next: ["LIT.WRITE.SENT"] },
      "LIT.WRITE.SENT": { prereq: ["LIT.LANG.SYN"], next: [] },
      "NUM.FLU.FACT": { prereq: [], next: ["NUM.STRAT.USE"] },
      "NUM.STRAT.USE": { prereq: ["NUM.FLU.FACT"], next: [] }
    };
  }

  function renderMasteryUI(studentId) {
    if (!el.masteryList || !el.nextSkill) return;
    if (!studentId || !MasteryEngine) {
      el.masteryList.innerHTML = '<div class="td-skill-row"><span class="td-skill-name">Select a student to view mastery.</span></div>';
      el.nextSkill.innerHTML = '<div class="td-skill-row"><span class="td-skill-name">No recommendation yet.</span></div>';
      return;
    }

    var model = Evidence && typeof Evidence.getSkillModel === "function" ? Evidence.getSkillModel(studentId) : { mastery: {} };
    var rows = model && model.mastery && typeof model.mastery === "object" ? Object.keys(model.mastery) : [];
    var masteryMap = {};
    if (!rows.length) {
      el.masteryList.innerHTML = '<div class="td-skill-row"><span class="td-skill-name">Run quick checks to build mastery evidence.</span></div>';
    } else {
      el.masteryList.innerHTML = rows.slice(0, 8).map(function (skillId) {
        var points = getSkillEvidencePoints(studentId, skillId);
        var masteryState = MasteryEngine.computeMasteryState(points);
        var mtss = MasteryEngine.computeMtssTrendDecision(points, 0.85);
        masteryMap[skillId] = masteryState.band;
        var fadePreview = "";
        if (mtss === "FADE") {
          fadePreview = '<div class="td-fade-preview">Fade: ' + MasteryEngine.generateFadeSchedule(5, 1).join(" → ") + "</div>";
        }
        return [
          '<div class="td-skill-row">',
          '<span class="td-skill-name">' + getSkillLabelSafe(skillId) + '</span>',
          '<span class="td-band-chip td-band-' + masteryState.band + '">' + masteryState.band + '</span>',
          '<span class="td-mtss-badge td-mtss-' + mtss + '">' + mtss + "</span>",
          "</div>",
          fadePreview
        ].join("");
      }).join("");
    }

    var nextSkillId = MasteryEngine.nextBestSkill(buildSkillGraph(), masteryMap);
    if (!nextSkillId) {
      el.nextSkill.innerHTML = '<div class="td-skill-row"><strong>All foundational skills secured.</strong></div>';
    } else {
      el.nextSkill.innerHTML = '<div class="td-skill-row"><strong>' + getSkillLabelSafe(nextSkillId) + '</strong><span>Target for instruction</span></div>';
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
    if (!el.recommendedPlanList) return;
    if (!studentId) {
      el.recommendedPlanList.innerHTML = '<p class="td-reco-line">Select a student to generate today\'s micro-plan.</p>';
      return;
    }
    var model = Evidence && typeof Evidence.getSkillModel === "function"
      ? Evidence.getSkillModel(studentId)
      : null;
    var rows = SessionPlanner && typeof SessionPlanner.buildDailyPlan === "function"
      ? SessionPlanner.buildDailyPlan({
          studentId: studentId,
          skillModel: model,
          topNeeds: model && Array.isArray(model.topNeeds) ? model.topNeeds : [],
          timeBudgetMin: 20
        })
      : [];
    if (!rows.length) {
      el.recommendedPlanList.innerHTML = '<p class="td-reco-line">Run a quick check to auto-build a recommended plan.</p>';
      return;
    }
    el.recommendedPlanList.innerHTML = rows.map(function (row) {
      var focusLabel = getSkillLabelSafe(row.focusSkillId || "decoding.short_vowels");
      return [
        '<article class="td-plan-quick-item">',
        '<div><strong>' + row.title + '</strong><p class="td-reco-line">' + focusLabel + '</p></div>',
        '<span class="td-chip">' + row.minutes + ' min</span>',
        '<button class="td-top-btn" type="button" data-reco-launch="' + String(row.href || "word-quest.html?quick=1") + '">Launch</button>',
        '</article>'
      ].join("");
    }).join("");
    Array.prototype.forEach.call(el.recommendedPlanList.querySelectorAll("[data-reco-launch]"), function (button) {
      button.addEventListener("click", function () {
        var href = String(button.getAttribute("data-reco-launch") || "word-quest.html?quick=1");
        window.location.href = appendStudentParam("./" + href.replace(/^\.\//, ""));
      });
    });
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
    if (!el.nextMovesList) return;
    if (!studentId) {
      el.nextMovesList.innerHTML = '<p class="td-reco-line">Select a student to generate 3 ranked instructional moves.</p>';
      return;
    }
    var rows = InstructionalSequencer && typeof InstructionalSequencer.generateInstructionalOptions === "function"
      ? InstructionalSequencer.generateInstructionalOptions(studentId)
      : [];
    rows = applyInstitutionalAnchorOverlay(studentId, rows);
    if (SupportStore && typeof SupportStore.calculateImplementationConsistency === "function") {
      var fidelity = SupportStore.calculateImplementationConsistency(studentId, 21);
      if (fidelity && Number(fidelity.percent || 0) < 40) {
        rows = rows.map(function (row) {
          return Object.assign({}, row, {
            reason: String(row.reason || "") + " Low implementation consistency detected; prioritize structured routine support."
          });
        });
      }
    }
    if (SupportStore && typeof SupportStore.getExecutiveFunction === "function") {
      var ef = SupportStore.getExecutiveFunction(studentId);
      var recentFocus = Array.isArray(ef.focusHistory) ? ef.focusHistory.slice(0, 3) : [];
      if (recentFocus.length >= 3) {
        var lowFocusCount = recentFocus.filter(function (f) {
          var r = String(f && f.selfRating || "");
          return r === "Struggled" || r === "Mostly";
        }).length;
        if (lowFocusCount >= 3) {
          rows = rows.map(function (row) {
            return Object.assign({}, row, {
              reason: String(row.reason || "") + " Low sustained focus detected; begin with 10-min structured sprint."
            });
          });
        }
      }
    }
    if (!Array.isArray(rows) || !rows.length) {
      el.nextMovesList.innerHTML = '<p class="td-reco-line">No recommendation data yet. Run a quick check and refresh.</p>';
      return;
    }
    var showAlignment = !!(el.showAlignment && el.showAlignment.checked);
    el.nextMovesList.innerHTML = rows.slice(0, 3).map(function (row, idx) {
      var rank = Math.max(1, Math.min(3, Number(row.rank || (idx + 1))));
      var moduleName = String(row.module || "WordQuest");
      var title = String(row.title || "Focused skill reinforcement");
      var skillId = String(row.skillId || "");
      var skillLabel = skillId ? formatSkillBreadcrumb(skillId) : "Foundational skill";
      var duration = Math.max(5, Math.min(10, Number(row.durationMin || 6)));
      var reason = String(row.reason || "Targeted reinforcement based on recent evidence.");
      var alignment = showAlignment && AlignmentLoader && typeof AlignmentLoader.getAlignmentForSkill === "function"
        ? AlignmentLoader.getAlignmentForSkill(skillId)
        : null;
      var anchorContext = showAlignment ? formatAnchorContextLine(row.anchorContext) : "";
      var launchHref = toSequencerRoute(moduleName, row.href);
      return [
        '<article class="td-sequencer-item">',
        '<span class="td-sequencer-rank">' + rank + '</span>',
        '<div class="td-sequencer-main">',
        '<div class="td-sequencer-head"><strong>' + title + '</strong><span class="td-chip">' + moduleName + '</span></div>',
        '<p class="td-sequencer-meta">' + skillLabel + " • " + duration + ' min</p>',
        '<p class="td-sequencer-reason">' + reason + '</p>',
        (showAlignment ? formatAlignmentLine(alignment) : ""),
        anchorContext,
        '</div>',
        '<button class="td-top-btn" type="button" data-sequencer-launch="' + launchHref + '">Start This</button>',
        '</article>'
      ].join("");
    }).join("");
    Array.prototype.forEach.call(el.nextMovesList.querySelectorAll("[data-sequencer-launch]"), function (button) {
      button.addEventListener("click", function () {
        var launch = String(button.getAttribute("data-sequencer-launch") || "word-quest.html?play=1");
        window.location.href = appendStudentParam("./" + launch.replace(/^\.\//, ""), studentId);
      });
    });
  }

  function renderImplementationToday(studentId) {
    if (!el.implementationTodayBody) return;
    if (!studentId || !SupportStore || typeof SupportStore.getStudent !== "function") {
      el.implementationTodayBody.innerHTML = '<p class="td-reco-line">Select a student to track implementation fidelity.</p>';
      return;
    }
    var student = SupportStore.getStudent(studentId);
    var tracking = typeof SupportStore.getImplementationTracking === "function"
      ? SupportStore.getImplementationTracking(studentId)
      : { accommodations: [], tier1Interventions: [] };
    var accommodations = (student.accommodations || []).slice(0, 4);
    var today = new Date().toISOString().slice(0, 10);
    var toggles = accommodations.length ? accommodations.map(function (acc) {
      var trackRow = (tracking.accommodations || []).find(function (row) { return String(row.id) === String(acc.id); });
      var implementedToday = !!(trackRow && Array.isArray(trackRow.history) && trackRow.history.some(function (h) {
        return String(h.date || "").slice(0, 10) === today && h.implemented === true;
      }));
      return '<label class="td-impl-chip"><input type="checkbox" data-impl-acc="' + escAttr(String(acc.id || "")) + '"' + (implementedToday ? " checked" : "") + '> ' + escAttr(acc.title || "Accommodation") + '</label>';
    }).join("") : '<span class="td-reco-line">No active accommodations yet.</span>';

    var tier1Interventions = (student.interventions || []).filter(function (row) { return Number(row.tier || 1) === 1; }).slice(0, 8);
    var options = tier1Interventions.length
      ? tier1Interventions.map(function (row) {
          return '<option value="' + escAttr(String(row.id || "")) + '">' + escAttr(row.strategy || row.focus || "Tier 1 intervention") + '</option>';
        }).join("")
      : '<option value="">Tier 1 intervention</option>';

    var consistency = typeof SupportStore.calculateImplementationConsistency === "function"
      ? SupportStore.calculateImplementationConsistency(studentId, 21)
      : { percent: 0 };

    var body = [
      '<div class="td-impl-row">' + toggles + '</div>',
      '<div class="td-impl-form">',
      '<select id="td-impl-intervention">' + options + '</select>',
      '<select id="td-impl-duration"><option value="5">5m</option><option value="10" selected>10m</option><option value="15">15m</option><option value="20">20m</option></select>',
      '<select id="td-impl-context"><option value="ELA" selected>ELA</option><option value="Math">Math</option><option value="Other">Other</option></select>',
      '<button id="td-impl-log" class="td-top-btn" type="button">Log Intervention</button>',
      '</div>',
      '<p class="td-sequencer-alignment">Implementation Consistency (Past 3 Weeks): ' + Number(consistency.percent || 0).toFixed(1) + '%</p>'
    ];

    if (isAdminContext()) {
      var accTotal = (tracking.accommodations || []).reduce(function (sum, row) {
        var hits = Array.isArray(row.history) ? row.history.filter(function (h) { return h && h.implemented === true; }).length : 0;
        return sum + hits;
      }, 0);
      var recentTier1 = (tracking.tier1Interventions || []).filter(function (row) {
        var ts = Date.parse(String(row.date || ""));
        return Number.isFinite(ts) && ts >= (Date.now() - (28 * 86400000));
      });
      var byCtx = {};
      recentTier1.forEach(function (row) {
        var key = String(row.context || "Other");
        byCtx[key] = (byCtx[key] || 0) + 1;
      });
      body.push('<p class="td-impl-admin">Admin: accommodation logs=' + accTotal + ' • Tier 1/week=' + (Math.round((recentTier1.length / 4) * 10) / 10) + ' • Context: ' + Object.keys(byCtx).map(function (k) { return k + " " + byCtx[k]; }).join(" • ") + '</p>');
    }

    el.implementationTodayBody.innerHTML = body.join("");

    Array.prototype.forEach.call(el.implementationTodayBody.querySelectorAll("[data-impl-acc]"), function (cb) {
      cb.addEventListener("change", function () {
        var id = String(cb.getAttribute("data-impl-acc") || "");
        if (!id) return;
        var acc = accommodations.find(function (row) { return String(row.id) === id; }) || {};
        if (typeof SupportStore.logAccommodationImplementation === "function") {
          SupportStore.logAccommodationImplementation(studentId, { id: id, name: acc.title || "Accommodation", implemented: !!cb.checked });
        }
        if (cb.checked && typeof SupportStore.toggleAccommodationImplemented === "function") {
          SupportStore.toggleAccommodationImplemented(studentId, id, "class");
        }
        renderImplementationToday(studentId);
        renderInstructionalSequencer(studentId);
      });
    });

    var logBtn = document.getElementById("td-impl-log");
    if (logBtn) {
      logBtn.addEventListener("click", function () {
        var select = document.getElementById("td-impl-intervention");
        var durationEl = document.getElementById("td-impl-duration");
        var contextEl = document.getElementById("td-impl-context");
        var interventionId = String(select && select.value || "");
        var intervention = tier1Interventions.find(function (row) { return String(row.id || "") === interventionId; }) || {};
        if (typeof SupportStore.logTier1InterventionUsage === "function") {
          SupportStore.logTier1InterventionUsage(studentId, {
            id: interventionId || ("tier1_" + Date.now()),
            name: intervention.strategy || intervention.focus || "Tier 1 intervention",
            durationMin: Number(durationEl && durationEl.value || 10),
            context: String(contextEl && contextEl.value || "ELA")
          });
        }
        renderImplementationToday(studentId);
        renderInstructionalSequencer(studentId);
        setCoachLine("Tier 1 intervention logged.");
      });
    }
  }

  function decomposeTask(name) {
    var text = String(name || "").toLowerCase();
    if (text.indexOf("write") >= 0 || text.indexOf("paragraph") >= 0 || text.indexOf("essay") >= 0) {
      return [
        "Identify claim",
        "Brainstorm 2-3 reasons",
        "Draft paragraph",
        "Add explanation",
        "Quick revision check"
      ];
    }
    if (text.indexOf("read") >= 0 || text.indexOf("text") >= 0 || text.indexOf("article") >= 0) {
      return [
        "Preview text",
        "Identify purpose",
        "Annotate 3 key points",
        "Summarize",
        "Reflect"
      ];
    }
    if (text.indexOf("math") >= 0 || text.indexOf("solve") >= 0 || text.indexOf("equation") >= 0 || text.indexOf("problem") >= 0) {
      return [
        "Identify problem type",
        "List knowns/unknowns",
        "Solve step-by-step",
        "Check answer",
        "Explain reasoning"
      ];
    }
    return [
      "Define task objective",
      "Break into 3-5 steps",
      "Complete first step",
      "Review progress",
      "Finalize"
    ];
  }

  function emitExecutiveEvidence(studentId, skillId, accuracy) {
    if (!studentId || !skillId || !EvidenceEngine || typeof EvidenceEngine.recordEvidence !== "function") return;
    EvidenceEngine.recordEvidence({
      studentId: String(studentId),
      timestamp: new Date().toISOString(),
      module: "executive_function",
      activityId: "ef.v1",
      targets: [String(skillId)],
      tier: "T2",
      doseMin: 5,
      result: {
        attempts: 1,
        accuracy: Math.max(0, Math.min(1, Number(accuracy || 0))),
        selfCorrections: 0,
        errorPattern: []
      },
      confidence: 0.8,
      notes: "Phase 19 executive function signal"
    });
  }

  function clearEfTimer() {
    if (state.efTimer) {
      window.clearInterval(state.efTimer);
      state.efTimer = null;
    }
  }

  function ratingAccuracy(value) {
    var v = String(value || "");
    if (v === "On Task") return 1;
    if (v === "Mostly") return 0.75;
    return 0.45;
  }

  function renderExecutiveSupport(studentId) {
    if (!el.executiveSupportBody) return;
    clearEfTimer();
    if (!studentId || !SupportStore || typeof SupportStore.getExecutiveFunction !== "function") {
      el.executiveSupportBody.innerHTML = '<p class="td-reco-line">Select a student to open executive-function scaffolds.</p>';
      return;
    }
    var ef = SupportStore.getExecutiveFunction(studentId);
    var breakdown = TaskBreakdownTool && typeof TaskBreakdownTool.load === "function"
      ? TaskBreakdownTool.load(studentId)
      : { assignmentName: "", steps: [], timerMinutes: 10 };
    var activeTask = ef.activeTask || null;
    var upcoming = Array.isArray(ef.upcomingTasks) ? ef.upcomingTasks.slice(0, 3) : [];
    var stepsHtml = "";
    if (activeTask && Array.isArray(activeTask.steps) && activeTask.steps.length) {
      stepsHtml = '<div class="td-ef-steps">' + activeTask.steps.map(function (step, idx) {
        var checked = Array.isArray(activeTask.completedSteps) && activeTask.completedSteps.indexOf(idx) >= 0;
        var minutes = Array.isArray(breakdown.steps) && breakdown.steps[idx] ? Number(breakdown.steps[idx].minutes || 10) : 10;
        return '<label class="td-ef-step"><input type="checkbox" data-ef-step="' + idx + '"' + (checked ? " checked" : "") + '> ' + escAttr(step) + ' <span class="td-chip">' + minutes + ' min</span></label>';
      }).join("") + "</div>";
    }
    var upcomingHtml = upcoming.length
      ? upcoming.map(function (task) {
          return '<div class="td-impl-chip">' + escAttr(task.name) + " • " + escAttr(task.dueDate || "No due date") + " • " + escAttr(task.status || "Not Started") + ' <button class="td-top-btn" type="button" data-ef-break="' + escAttr(String(task.id || "")) + '">Break into Steps</button></div>';
        }).join("")
      : '<span class="td-reco-line">No upcoming tasks yet.</span>';

    el.executiveSupportBody.innerHTML = [
      '<div class="td-impl-form">',
      '<input id="td-ef-task-input" class="td-anchor-input" type="text" placeholder="Enter assignment or task" value="' + escAttr(String(breakdown.assignmentName || "")) + '">',
      '<input id="td-ef-step-minutes" class="td-anchor-input" type="number" min="3" max="40" step="1" value="' + Math.max(3, Math.min(40, Number(breakdown.timerMinutes || 10))) + '" title="Estimated minutes per step">',
      '<button id="td-ef-build" class="td-top-btn" type="button">Build Steps</button>',
      '<button id="td-ef-add-upcoming" class="td-top-btn" type="button">Add Upcoming</button>',
      '<button id="td-ef-save-breakdown" class="td-top-btn" type="button">Save Breakdown</button>',
      '</div>',
      (activeTask ? '<p class="td-sequencer-alignment">Active Task: ' + escAttr(activeTask.name || "Task") + "</p>" : '<p class="td-sequencer-alignment">No active executive task.</p>'),
      stepsHtml,
      '<div class="td-impl-form">',
      '<span class="td-ef-timer" id="td-ef-timer">10:00</span>',
      '<button id="td-ef-start-sprint" class="td-top-btn" type="button">Start Focus Sprint</button>',
      '<input id="td-ef-timer-minutes" class="td-anchor-input" type="number" min="3" max="45" step="1" value="' + Math.max(3, Math.min(45, Number(breakdown.timerMinutes || 10))) + '">',
      '<select id="td-ef-rating"><option>On Task</option><option selected>Mostly</option><option>Struggled</option></select>',
      '<button id="td-ef-log-rating" class="td-top-btn" type="button">Log Focus</button>',
      '</div>',
      '<div class="td-support-item"><h4>Upcoming Tasks</h4><div class="td-impl-row">' + upcomingHtml + "</div></div>",
      (activeTask ? '<div class="td-plan-tabs"><button id="td-ef-complete-task" class="td-top-btn" type="button">Mark Task Complete</button><button id="td-ef-open-task" class="td-top-btn" type="button">Open Task Plan</button></div>' : "")
    ].join("");

    var buildBtn = document.getElementById("td-ef-build");
    if (buildBtn) {
      buildBtn.addEventListener("click", function () {
        var input = document.getElementById("td-ef-task-input");
        var minutesEl = document.getElementById("td-ef-step-minutes");
        var name = String(input && input.value || "").trim();
        if (!name) return;
        var steps = decomposeTask(name);
        var mins = Math.max(3, Math.min(40, Number(minutesEl && minutesEl.value || 10) || 10));
        if (TaskBreakdownTool && typeof TaskBreakdownTool.save === "function") {
          TaskBreakdownTool.save(studentId, {
            assignmentName: name,
            steps: steps.map(function (step) { return { name: step, minutes: mins }; }),
            timerMinutes: mins
          });
        }
        SupportStore.setActiveExecutiveTask(studentId, { name: name, steps: steps, completedSteps: [] });
        renderExecutiveSupport(studentId);
      });
    }
    var addUpcomingBtn = document.getElementById("td-ef-add-upcoming");
    if (addUpcomingBtn) {
      addUpcomingBtn.addEventListener("click", function () {
        var input = document.getElementById("td-ef-task-input");
        var name = String(input && input.value || "").trim();
        if (!name) return;
        var due = window.prompt("Due date (YYYY-MM-DD)", "") || "";
        SupportStore.addUpcomingTask(studentId, { name: name, dueDate: due, status: "Not Started" });
        renderExecutiveSupport(studentId);
      });
    }
    var saveBreakdownBtn = document.getElementById("td-ef-save-breakdown");
    if (saveBreakdownBtn) {
      saveBreakdownBtn.addEventListener("click", function () {
        if (!TaskBreakdownTool || typeof TaskBreakdownTool.save !== "function") return;
        var input = document.getElementById("td-ef-task-input");
        var stepMins = document.getElementById("td-ef-step-minutes");
        var timerMins = document.getElementById("td-ef-timer-minutes");
        var name = String(input && input.value || "").trim();
        var mins = Math.max(3, Math.min(40, Number(stepMins && stepMins.value || 10) || 10));
        var steps = decomposeTask(name || "Task");
        TaskBreakdownTool.save(studentId, {
          assignmentName: name,
          steps: steps.map(function (step) { return { name: step, minutes: mins }; }),
          timerMinutes: Math.max(3, Math.min(45, Number(timerMins && timerMins.value || mins) || mins))
        });
        setCoachLine("Task breakdown saved locally.");
        renderExecutiveSupport(studentId);
      });
    }
    Array.prototype.forEach.call(el.executiveSupportBody.querySelectorAll("[data-ef-step]"), function (box) {
      box.addEventListener("change", function () {
        var active = SupportStore.getExecutiveFunction(studentId).activeTask;
        if (!active) return;
        var done = Array.isArray(active.completedSteps) ? active.completedSteps.slice() : [];
        var idx = Number(box.getAttribute("data-ef-step") || -1);
        if (idx < 0) return;
        if (box.checked && done.indexOf(idx) === -1) done.push(idx);
        if (!box.checked) done = done.filter(function (v) { return Number(v) !== idx; });
        SupportStore.updateExecutiveTaskProgress(studentId, done);
      });
    });
    var startSprintBtn = document.getElementById("td-ef-start-sprint");
    if (startSprintBtn) {
      startSprintBtn.addEventListener("click", function () {
        var timerEl = document.getElementById("td-ef-timer");
        var timerMinsEl = document.getElementById("td-ef-timer-minutes");
        var timerMins = Math.max(3, Math.min(45, Number(timerMinsEl && timerMinsEl.value || 10) || 10));
        clearEfTimer();
        state.efSecondsLeft = timerMins * 60;
        if (timerEl) timerEl.textContent = String(timerMins).padStart(2, "0") + ":00";
        state.efTimer = window.setInterval(function () {
          state.efSecondsLeft -= 1;
          if (timerEl) {
            var mm = Math.floor(Math.max(0, state.efSecondsLeft) / 60);
            var ss = Math.max(0, state.efSecondsLeft) % 60;
            timerEl.textContent = String(mm).padStart(2, "0") + ":" + String(ss).padStart(2, "0");
          }
          if (state.efSecondsLeft <= 0) {
            clearEfTimer();
            window.alert("Focus sprint complete. Log focus rating.");
          }
        }, 1000);
      });
    }
    var logFocusBtn = document.getElementById("td-ef-log-rating");
    if (logFocusBtn) {
      logFocusBtn.addEventListener("click", function () {
        var ratingEl = document.getElementById("td-ef-rating");
        var rating = String(ratingEl && ratingEl.value || "Mostly");
        var taskId = activeTask && activeTask.id ? String(activeTask.id) : "";
        SupportStore.logFocusSprint(studentId, { taskId: taskId, duration: 10, selfRating: rating });
        emitExecutiveEvidence(studentId, "EXEC.FUNCTION.SUSTAINED_ATTENTION", ratingAccuracy(rating));
        renderExecutiveSupport(studentId);
        renderInstructionalSequencer(studentId);
      });
    }
    var completeBtn = document.getElementById("td-ef-complete-task");
    if (completeBtn) {
      completeBtn.addEventListener("click", function () {
        var done = SupportStore.completeExecutiveTask(studentId);
        if (done) emitExecutiveEvidence(studentId, "EXEC.FUNCTION.TASK_COMPLETION", 1);
        renderExecutiveSupport(studentId);
        renderInstructionalSequencer(studentId);
      });
    }
    var openTaskBtn = document.getElementById("td-ef-open-task");
    if (openTaskBtn) {
      openTaskBtn.addEventListener("click", function () {
        if (el.drawer) el.drawer.classList.remove("hidden");
        state.activeDrawerTab = "snapshot";
        renderDrawer(studentId);
      });
    }
    Array.prototype.forEach.call(el.executiveSupportBody.querySelectorAll("[data-ef-break]"), function (btn) {
      btn.addEventListener("click", function () {
        var id = String(btn.getAttribute("data-ef-break") || "");
        if (!id) return;
        var task = (SupportStore.getExecutiveFunction(studentId).upcomingTasks || []).find(function (t) { return String(t.id) === id; });
        if (!task) return;
        var steps = decomposeTask(task.name || "");
        SupportStore.setActiveExecutiveTask(studentId, { name: task.name || "Task", steps: steps, completedSteps: [] });
        SupportStore.updateUpcomingTask(studentId, id, { status: "In Progress" });
        renderExecutiveSupport(studentId);
      });
    });
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
    if (!el.noteText) return;
    if (!plan || !plan.progressNoteTemplate) {
      el.noteText.textContent = "Select a student to generate a progress note.";
      return;
    }
    var notes = plan.progressNoteTemplate;
    var key = state.activeNoteTab === "family" ? "family" : (state.activeNoteTab === "team" ? "team" : "teacher");
    el.noteText.textContent = String(notes[key] || ("Student: " + (student && student.name ? student.name : "Student")));
  }

  function renderLastSessionSummary(studentId) {
    if (!window.CSEvidence || typeof window.CSEvidence.getRecentSessions !== "function") return;
    var sessions = window.CSEvidence.getRecentSessions(studentId, { limit: 1 });
    var row = sessions[0];
    if (!row) {
      if (el.lastSessionTitle) el.lastSessionTitle.textContent = "No recent quick check yet";
      if (el.lastSessionMeta) el.lastSessionMeta.textContent = "Run a 90-second Word Quest quick check to generate signals.";
      return;
    }
    var sig = row.signals || {};
    var out = row.outcomes || {};
    if (el.lastSessionTitle) {
      el.lastSessionTitle.textContent = (out.solved ? "Solved" : "Not solved yet") + " · " + (out.attemptsUsed || sig.guessCount || 0) + " attempts";
    }
    if (el.lastSessionMeta) {
      var hints = [];
      if (Number(sig.vowelSwapCount || 0) >= 3) hints.push("Vowel swaps high");
      if (Number(sig.repeatSameBadSlotCount || 0) >= 2) hints.push("Repeated same slot");
      if (!hints.length) hints.push("Signals stable");
      el.lastSessionMeta.textContent = hints.join(" · ") + " · Next: guided quick check";
    }
  }

  function openShareModal(studentId) {
    if (!supportController || typeof supportController.openShareModal !== "function") return;
    supportController.openShareModal(studentId);
  }

  function openMeetingModal() {
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
        Evidence: Evidence
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
        SASLibrary: SASLibrary
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
        SupportStore: SupportStore
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
