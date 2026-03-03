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
  var CurriculumMap = window.CSCurriculumMap;
  var ReportingGenerator = window.CSReportingGenerator;
  var AlignmentLoader = window.CSAlignmentLoader;
  var InterventionPlanner = window.CSInterventionPlanner;
  var ShareSummaryAPI = window.CSShareSummary;
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
    meetingFormat: "sas",
    meetingLanguage: "en",
    liveTranslate: false,
    reportDraft: null
  };
  var skillStoreLogged = false;

  var LAST_ACTIVITY_KEY = "cs.lastActivityByStudent.v1";

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
    meetingModeBtn: document.getElementById("td-meeting-mode"),
    generateSummaryBtn: document.getElementById("td-generate-summary"),
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
    openMeetingNotes: document.getElementById("td-open-meeting-notes"),
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
    reportModal: document.getElementById("td-report-modal"),
    reportClose: document.getElementById("td-report-close"),
    reportLanguage: document.getElementById("td-report-language"),
    reportPreview: document.getElementById("td-report-preview"),
    reportCopy: document.getElementById("td-report-copy"),
    reportDownloadPdf: document.getElementById("td-report-download-pdf"),
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
    focusStartBtn: document.getElementById("td-focus-start-btn"),
    surgicalAttentionList: document.getElementById("td-surgical-attention-list"),
    numeracyTier: document.getElementById("td-num-tier"),
    numeracyContentFocus: document.getElementById("td-num-content-focus"),
    numeracyStrategyStage: document.getElementById("td-num-strategy-stage"),
    numeracyPracticeMode: document.getElementById("td-num-practice-mode"),
    numeracyActionLine: document.getElementById("td-num-action-line"),
    numGradeSelect: document.getElementById("td-num-grade-select"),
    numUnitSelect: document.getElementById("td-num-unit-select"),
    numLessonSelect: document.getElementById("td-num-lesson-select"),
    numCurriculumBadge: document.getElementById("td-num-curriculum-badge"),
    numCurriculumLine: document.getElementById("td-num-curriculum-line"),
    buildline: document.getElementById("td-buildline")
  };

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
    el.numCurriculumLine.textContent = "Aligned to Illustrative Math — " + keyLabel("grade", grade) + ", " + keyLabel("unit", unit);
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
    return {
      studentId: String(student.id || ""),
      gradeBand: String(student.grade || "G5"),
      accuracy: Math.max(0, Math.min(1, 1 - need)),
      errorRate: Math.max(0, Math.min(1, need)),
      confidence: Math.max(0.2, Math.min(0.95, 1 - (need * 0.8))),
      languageSupport: false,
      workingMemoryRisk: need > 0.6 ? 0.65 : 0.3,
      domainHint: domainHint
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

  function renderNumeracyRecommendationCard(row) {
    if (!el.numeracyContentFocus || !el.numeracyStrategyStage || !el.numeracyPracticeMode || !el.numeracyActionLine) return;
    var fallback = latestNumeracyRecommendation(null);
    var recommendation = latestNumeracyRecommendation(row || null);
    el.numeracyContentFocus.textContent = String(recommendation.contentFocus || fallback.contentFocus);
    el.numeracyStrategyStage.textContent = String(recommendation.strategyStage || fallback.strategyStage);
    el.numeracyPracticeMode.textContent = String(recommendation.practiceMode || fallback.practiceMode);
    if (el.numeracyTier) el.numeracyTier.textContent = String(recommendation.tierSignal || fallback.tierSignal);
    el.numeracyActionLine.textContent = String(recommendation.recommendedAction || fallback.recommendedAction);
    renderNumeracyAlignmentLine();
  }

  function reportLanguageLabel(code) {
    var c = String(code || "en").toLowerCase();
    if (c === "zh") return "Mandarin";
    if (c === "es") return "Spanish";
    if (c === "hi") return "Hindi";
    return "English";
  }

  function escHtml(value) {
    return String(value == null ? "" : value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/\"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  function buildReportText(report, language) {
    var nextSteps = Array.isArray(report && report.recommendedNextSteps) ? report.recommendedNextSteps : [];
    var lines = [
      "Unified Student Summary (" + reportLanguageLabel(language) + ")",
      "",
      "Executive Summary",
      String(report && report.executiveSummary || ""),
      "",
      "Literacy Progress",
      String(report && report.literacyProgress || ""),
      "",
      "Numeracy Progress",
      String(report && report.numeracyProgress || ""),
      "",
      "Tier Statement",
      String(report && report.tierStatement || ""),
      "",
      "Curriculum Alignment",
      String(report && report.curriculumAlignment || ""),
      "",
      "Recommended Next Steps",
      nextSteps.map(function (step, idx) { return (idx + 1) + ". " + step; }).join("\n"),
      "",
      "Parent Summary",
      String(report && report.parentSummary || "")
    ];
    return lines.join("\n");
  }

  function renderReportPreview() {
    if (!el.reportPreview || !state.reportDraft) return;
    var language = el.reportLanguage ? String(el.reportLanguage.value || "en") : "en";
    var translated = ReportingGenerator && typeof ReportingGenerator.translateReport === "function"
      ? ReportingGenerator.translateReport(state.reportDraft, language)
      : state.reportDraft;
    var nextSteps = Array.isArray(translated && translated.recommendedNextSteps) ? translated.recommendedNextSteps : [];
    el.reportPreview.innerHTML = [
      "<section><h3>Executive Summary</h3><p>" + escHtml(translated.executiveSummary || "") + "</p></section>",
      "<section><h3>Literacy Progress</h3><p>" + escHtml(translated.literacyProgress || "") + "</p></section>",
      "<section><h3>Numeracy Progress</h3><p>" + escHtml(translated.numeracyProgress || "") + "</p></section>",
      "<section><h3>Tier Statement</h3><p>" + escHtml(translated.tierStatement || "") + "</p></section>",
      "<section><h3>Curriculum Alignment</h3><p>" + escHtml(translated.curriculumAlignment || "") + "</p></section>",
      "<section><h3>Recommended Next Steps</h3><ul>" + nextSteps.map(function (step) { return "<li>" + escHtml(step) + "</li>"; }).join("") + "</ul></section>",
      "<section><h3>Parent Summary</h3><p>" + escHtml(translated.parentSummary || "") + "</p></section>"
    ].join("");
  }

  function openReportModal() {
    if (!el.reportModal || !el.reportPreview || !state.selectedId) return;
    var summary = Evidence && typeof Evidence.getStudentSummary === "function" ? Evidence.getStudentSummary(state.selectedId) : null;
    var student = summary && summary.student ? summary.student : {};
    var focusRows = state.todayPlan && Array.isArray(state.todayPlan.students) ? state.todayPlan.students : [];
    var row = focusRows.find(function (item) { return item && item.student && String(item.student.id || "") === String(state.selectedId); }) || null;
    var numeracy = latestNumeracyRecommendation(row);
    var curriculumLine = el.numCurriculumLine ? String(el.numCurriculumLine.textContent || "").trim() : "";
    var literacyData = {
      focus: summary ? String(summary.focus || "Foundational literacy") : "Foundational literacy",
      growth: summary && summary.metrics ? Number(summary.metrics.weekDelta || 0.12) : 0.12,
      nextStep: summary && summary.nextMove ? String(summary.nextMove.line || "Continue targeted literacy support.") : "Continue targeted literacy support.",
      tier: summary && summary.metrics ? String(summary.metrics.tierLabel || "Tier 2") : "Tier 2",
      curriculumAlignment: "Literacy sequencing aligned to active instructional pathways."
    };
    var numeracyData = {
      contentFocus: numeracy.contentFocus,
      strategyStage: numeracy.strategyStage,
      practiceMode: numeracy.practiceMode,
      tierSignal: numeracy.tierSignal,
      recommendedAction: numeracy.recommendedAction,
      curriculumAlignment: curriculumLine || "Numeracy sequencing aligned to active instructional pathways."
    };
    var studentProfile = {
      id: String(student.id || state.selectedId),
      name: String(student.name || "Student"),
      tier: literacyData.tier
    };

    if (ReportingGenerator && typeof ReportingGenerator.generateStudentReport === "function") {
      state.reportDraft = ReportingGenerator.generateStudentReport(studentProfile, literacyData, numeracyData);
    } else {
      state.reportDraft = {
        executiveSummary: "Summary is unavailable.",
        literacyProgress: "",
        numeracyProgress: "",
        tierStatement: "",
        curriculumAlignment: "",
        recommendedNextSteps: [],
        parentSummary: ""
      };
    }
    renderReportPreview();
    el.reportModal.classList.remove("hidden");
  }

  function closeReportModal() {
    if (el.reportModal) el.reportModal.classList.add("hidden");
  }

  function detectDemoMode() {
    try {
      state.demoMode = new URLSearchParams(window.location.search).get("demo") === "1";
    } catch (_e) {
      state.demoMode = false;
    }
    if (el.demoBadge) el.demoBadge.classList.toggle("hidden", !state.demoMode);
  }

  function safeJsonParse(s, fallback) {
    try { return JSON.parse(s); } catch (_e) { return fallback; }
  }

  function isAdminContext() {
    try {
      var params = new URLSearchParams(window.location.search || "");
      return params.get("admin") === "1";
    } catch (_e) {
      return false;
    }
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

  function renderSurgicalDashboard(rows) {
    var list = Array.isArray(rows) ? rows.slice(0, 3) : [];
    if (!list.length) {
      if (el.focusStudentName) el.focusStudentName.textContent = "Select a student";
      if (el.focusTierLine) el.focusTierLine.textContent = "Tier 2 focus";
      if (el.focusReasonLine) el.focusReasonLine.textContent = "Search a student to get a clear next move.";
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
    var focusTier = focusTop && focusTop.tier ? focusTop.tier : "T2";

    if (el.focusStudentName) el.focusStudentName.textContent = String(focusStudent.name || "Select a student");
    if (el.focusTierLine) el.focusTierLine.textContent = focusTier + " focus";
    if (el.focusReasonLine) el.focusReasonLine.textContent = signalLineForRow(focus);
    renderNumeracyRecommendationCard(focus);
    if (el.focusStartBtn) {
      el.focusStartBtn.onclick = function () {
        var sid = String(focusStudent.id || "");
        if (!sid) return;
        selectStudent(sid);
        var href = pickLaunchHrefForRow(focus);
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

  function supportsPanelMetric(metric) {
    var value = String(metric || "").trim();
    return value || "MAP";
  }

  function tier1ReadyLabel(readiness) {
    if (!readiness) return "Gathering data";
    return readiness.ready ? "Ready to Refer" : ("Collecting evidence (" + readiness.datapoints + "/" + readiness.thresholds.minDatapoints + ")");
  }

  function interventionSparkline(datapoints) {
    var points = (Array.isArray(datapoints) ? datapoints : [])
      .slice(0, 6)
      .map(function (point) { return Number(point.value || 0); })
      .reverse();
    if (!points.length) return "M0,12 L72,12";
    return buildTinySpark(points);
  }

  function formatTier1Intervention(intervention) {
    var row = intervention && typeof intervention === "object" ? intervention : {};
    var readiness = SupportStore && typeof SupportStore.getReferralReadiness === "function"
      ? SupportStore.getReferralReadiness(row)
      : null;
    var fidelity = Array.isArray(row.fidelityChecklist) ? row.fidelityChecklist : [];
    var checksDone = fidelity.filter(function (item) { return !!(item && (item.done || item === true)); }).length;
    var metric = supportsPanelMetric(row.progressMetric);
    var points = Array.isArray(row.datapoints) ? row.datapoints : [];
    return {
      id: String(row.id || ""),
      domain: String(row.domain || "Reading"),
      strategy: String(row.strategy || row.focus || "Tier 1 support"),
      frequency: String(row.frequency || "3x/week"),
      duration: Number(row.durationMinutes || row.durationMin || 20),
      metric: metric,
      datapoints: points,
      datapointsCount: points.length,
      latestPoint: points[0] || null,
      sparkPath: interventionSparkline(points),
      readiness: readiness,
      readinessLabel: tier1ReadyLabel(readiness),
      checksDone: checksDone,
      checksTotal: fidelity.length,
      fidelity: fidelity
    };
  }

  function renderAccommodationRows(accommodations) {
    var rows = Array.isArray(accommodations) ? accommodations.slice() : [];
    if (!rows.length) return '<div class="td-support-item"><p>No accommodation cards yet.</p></div>';
    var sorted = rows.sort(function (a, b) {
      return Number(b.priority || 0) - Number(a.priority || 0);
    });
    var topFive = sorted.slice(0, 5);
    var classRows = topFive.filter(function (a) { return String(a.whenToUse || "").toLowerCase().indexOf("assessment") === -1; });
    var assessRows = topFive.filter(function (a) { return String(a.whenToUse || "").toLowerCase().indexOf("assessment") !== -1; });
    function section(title, list, ctx) {
      if (!list.length) return "";
      return [
        '<div class="td-support-item"><h4>' + title + '</h4>',
        list.map(function (a) {
          var lastReviewed = a.lastReviewed ? String(a.lastReviewed).slice(0, 10) : "—";
          return '<div class="td-support-line"><strong>' + (a.title || "Accommodation") + '</strong><p>' + (a.teacherText || a.whenToUse || "Actionable support step.") + '</p><div class="td-plan-tabs"><span class="td-chip">Reviewed ' + lastReviewed + '</span><button class="td-top-btn" type="button" data-accommodation-toggle="' + String(a.id || "") + '" data-accommodation-context="' + ctx + '">I implemented this today</button></div></div>';
        }).join(""),
        '</div>'
      ].join("");
    }
    return section("During class", classRows, "class") + section("During assessment", assessRows, "assessment");
  }

  function renderSupportHub(studentId) {
    if (!el.supportBody) return;
    if (!studentId) {
      el.supportBody.innerHTML = '<div class="td-support-item"><p>Select a student to load support workflows.</p></div>';
      return;
    }
    var studentSupport = SupportStore && typeof SupportStore.getStudent === "function"
      ? SupportStore.getStudent(studentId)
      : { needs: [], goals: [], accommodations: [], interventions: [], meetings: [] };
    if (state.activeSupportTab === "snapshot") {
      var anchorPanel = renderInstitutionalAnchorPanel(studentId, false);
      el.supportBody.innerHTML = [
        '<div class="td-support-item"><h4>Top Needs</h4><p>' + (studentSupport.needs.length ? studentSupport.needs.slice(0, 5).map(function (n) { return n.label; }).join(" • ") : "No needs captured yet.") + '</p></div>',
        '<div class="td-support-item"><h4>Last 14 days trend</h4><p>Use Skill Tiles + Recent Sessions for trend checks before meetings.</p></div>',
        anchorPanel
      ].join("");
      bindInstitutionalAnchorActions(studentId, el.supportBody, false);
      return;
    }
    if (state.activeSupportTab === "plan") {
      var goals = studentSupport.goals || [];
      el.supportBody.innerHTML = '<div class="td-support-item"><h4>SMART Goal Builder</h4><p>Generate 3-5 SAS-aligned goal templates by domain + baseline.</p><div class="td-plan-tabs"><button id="td-create-plan-btn" class="td-top-btn" type="button">Create Plan</button><button id="td-suggest-goals-btn" class="td-top-btn" type="button">Suggest Goals</button></div><div id="td-suggested-goals"></div><div id="td-generated-plan"></div></div>' + (goals.length
        ? goals.slice(0, 5).map(function (g) {
            return '<div class="td-support-item"><h4>' + (g.skill || g.domain || "Goal") + '</h4><p>Baseline ' + (g.baseline || "--") + ' → Target ' + (g.target || "--") + ' • Review every ' + (g.reviewEveryDays || 14) + 'd</p></div>';
          }).join("")
        : '<div class="td-support-item"><p>No SMART goals yet. Add from Meeting Notes conversion.</p></div>');
      renderGeneratedPlanner(studentId);
      var createPlanBtn = document.getElementById("td-create-plan-btn");
      if (createPlanBtn) {
        createPlanBtn.addEventListener("click", function () {
          if (!InterventionPlanner || typeof InterventionPlanner.buildPlan !== "function") {
            setCoachLine("Planner unavailable. Continue with manual goals.");
            return;
          }
          var skillModel = Evidence && typeof Evidence.getSkillModel === "function" ? Evidence.getSkillModel(studentId) : null;
          var topNeeds = skillModel && Array.isArray(skillModel.topNeeds) ? skillModel.topNeeds : (studentSupport.needs || []);
          InterventionPlanner.buildPlan({
            studentId: studentId,
            topNeeds: topNeeds,
            gradeBand: getSelectedStudentGradeBand(),
            timeBudgetMin: 20
          }).then(function (plan) {
            state.generatedPlanner = plan;
            renderGeneratedPlanner(studentId);
            setCoachLine("SAS-aligned intervention plan generated.");
          });
        });
      }
      var suggestBtn = document.getElementById("td-suggest-goals-btn");
      if (suggestBtn) {
        suggestBtn.addEventListener("click", function () {
          renderSuggestedGoals(studentId);
        });
      }
      return;
    }
    if (state.activeSupportTab === "accommodations") {
      var acc = studentSupport.accommodations || [];
      el.supportBody.innerHTML = renderAccommodationRows(acc);
      Array.prototype.forEach.call(el.supportBody.querySelectorAll("[data-accommodation-toggle]"), function (button) {
        button.addEventListener("click", function () {
          if (!SupportStore || typeof SupportStore.toggleAccommodationImplemented !== "function") return;
          var id = String(button.getAttribute("data-accommodation-toggle") || "");
          var context = String(button.getAttribute("data-accommodation-context") || "class");
          if (!id) return;
          SupportStore.toggleAccommodationImplemented(studentId, id, context);
          setCoachLine("Accommodation implementation logged.");
          renderSupportHub(studentId);
        });
      });
      return;
    }
    if (state.activeSupportTab === "interventions") {
      var interventions = studentSupport.interventions || [];
      var tier1 = interventions.filter(function (i) { return Number(i.tier || 1) === 1; });
      var head = [
        '<div class="td-support-item">',
        '<h4>Tier 1 Evidence</h4>',
        '<p>Start a Tier 1 plan, log datapoints in under 60 seconds, and watch referral readiness.</p>',
        '<div class="td-plan-tabs">',
        '<button class="td-top-btn" type="button" data-tier1-action="start">Start Tier 1 Plan</button>',
        '<button class="td-top-btn" type="button" data-tier1-action="datapoint">Log Datapoint</button>',
        '<button class="td-top-btn" type="button" data-tier1-action="attach">Attach Artifact Link</button>',
        '</div>',
        '</div>'
      ].join("");
      var rows = tier1.length
        ? tier1.slice(0, 8).map(function (i) {
            var view = formatTier1Intervention(i);
            return [
              '<div class="td-support-item">',
              '<h4>Tier 1 • ' + view.domain + '</h4>',
              '<p>' + view.strategy + ' • ' + view.frequency + ' • ' + view.duration + ' min • Metric: ' + view.metric + '</p>',
              '<div class="td-plan-tabs"><span class="td-chip">' + view.readinessLabel + '</span><span class="td-chip">Fidelity ' + view.checksDone + '/' + view.checksTotal + '</span><span class="td-chip">Datapoints ' + view.datapointsCount + '</span></div>',
              '<svg class="td-mini-spark" viewBox="0 0 72 24" preserveAspectRatio="none"><path d="' + view.sparkPath + '" /></svg>',
              '<div class="td-plan-tabs"><button class="td-top-btn" type="button" data-tier1-point="' + view.id + '">+ datapoint</button><button class="td-top-btn" type="button" data-tier1-fidelity="' + view.id + '" data-tier1-fidelity-index="0">Toggle fidelity</button></div>',
              '</div>'
            ].join("");
          }).join("")
        : '<div class="td-support-item"><p>No Tier 1 intervention logs yet.</p></div>';
      el.supportBody.innerHTML = head + rows;
      var startBtn = el.supportBody.querySelector("[data-tier1-action='start']");
      if (startBtn) {
        startBtn.addEventListener("click", function () {
          if (!SupportStore || typeof SupportStore.startTier1Plan !== "function") return;
          var domain = window.prompt("Tier 1 domain", "Reading") || "Reading";
          var strategy = window.prompt("Tier 1 strategy", "Targeted classroom support") || "Targeted classroom support";
          var metric = window.prompt("Progress metric", "MAP") || "MAP";
          var created = SupportStore.startTier1Plan(studentId, {
            domain: domain,
            strategy: strategy,
            focus: domain + " support",
            progressMetric: metric,
            frequency: "3x/week",
            durationMinutes: 20
          });
          if (created && window.CSEvidence && typeof window.CSEvidence.addSession === "function") {
            window.CSEvidence.addSession(studentId, {
              id: "tier1_" + Date.now(),
              createdAt: new Date().toISOString(),
              activity: "tier1-plan",
              durationSec: 60,
              signals: { guessCount: 0, avgGuessLatencyMs: 0, misplaceRate: 0, absentRate: 0, repeatSameBadSlotCount: 0, vowelSwapCount: 0, constraintViolations: 0 },
              outcomes: { solved: false, attemptsUsed: 0 }
            });
          }
          setCoachLine("Tier 1 plan started.");
          renderSupportHub(studentId);
          renderDrawer(studentId);
        });
      }
      var pointBtn = el.supportBody.querySelector("[data-tier1-action='datapoint']");
      if (pointBtn) {
        pointBtn.addEventListener("click", function () {
          var current = (SupportStore.getStudent(studentId).interventions || []).find(function (row) { return Number(row.tier || 1) === 1; });
          if (!current || !SupportStore || typeof SupportStore.addInterventionDatapoint !== "function") return;
          var value = Number(window.prompt("Datapoint value", "70") || 0);
          var note = window.prompt("Datapoint note", "") || "";
          SupportStore.addInterventionDatapoint(studentId, current.id, { date: new Date().toISOString().slice(0, 10), value: value, note: note });
          setCoachLine("Tier 1 datapoint logged.");
          renderSupportHub(studentId);
          renderDrawer(studentId);
        });
      }
      var attachBtn = el.supportBody.querySelector("[data-tier1-action='attach']");
      if (attachBtn) {
        attachBtn.addEventListener("click", function () {
          var current = (SupportStore.getStudent(studentId).interventions || []).find(function (row) { return Number(row.tier || 1) === 1; });
          if (!current || !SupportStore || typeof SupportStore.addInterventionAttachment !== "function") return;
          var title = window.prompt("Artifact title", "Session summary") || "Session summary";
          var link = window.prompt("Artifact link / reference", "word-quest summary") || "";
          SupportStore.addInterventionAttachment(studentId, current.id, { title: title, link: link });
          setCoachLine("Artifact linked to Tier 1 plan.");
          renderSupportHub(studentId);
        });
      }
      Array.prototype.forEach.call(el.supportBody.querySelectorAll("[data-tier1-point]"), function (button) {
        button.addEventListener("click", function () {
          if (!SupportStore || typeof SupportStore.addInterventionDatapoint !== "function") return;
          var interventionId = String(button.getAttribute("data-tier1-point") || "");
          if (!interventionId) return;
          var value = Number(window.prompt("Datapoint value", "70") || 0);
          var note = window.prompt("Datapoint note", "") || "";
          SupportStore.addInterventionDatapoint(studentId, interventionId, { date: new Date().toISOString().slice(0, 10), value: value, note: note });
          setCoachLine("Datapoint logged.");
          renderSupportHub(studentId);
          renderDrawer(studentId);
        });
      });
      Array.prototype.forEach.call(el.supportBody.querySelectorAll("[data-tier1-fidelity]"), function (button) {
        button.addEventListener("click", function () {
          if (!SupportStore || typeof SupportStore.toggleFidelityCheck !== "function") return;
          var interventionId = String(button.getAttribute("data-tier1-fidelity") || "");
          var idx = Number(button.getAttribute("data-tier1-fidelity-index") || 0);
          SupportStore.toggleFidelityCheck(studentId, interventionId, idx);
          setCoachLine("Fidelity log updated.");
          renderSupportHub(studentId);
        });
      });
      return;
    }
    el.supportBody.innerHTML = [
      '<div class="td-support-item"><h4>Exports</h4><p>Share Summary for quick updates. Referral Packet for MDT-ready evidence.</p></div>',
      '<div class="td-support-item"><p>All data remains local-first unless exported intentionally.</p></div>'
    ].join("");
  }

  function renderDrawer(studentId) {
    if (!el.drawerBody || !el.drawerTitle) return;
    if (!studentId) {
      el.drawerTitle.textContent = "Student Drawer";
      el.drawerBody.innerHTML = '<div class="td-support-item"><p>Select a student to open the drawer.</p></div>';
      return;
    }
    var summary = Evidence.getStudentSummary(studentId);
    var support = SupportStore && typeof SupportStore.getStudent === "function"
      ? SupportStore.getStudent(studentId)
      : { goals: [], interventions: [] };
    el.drawerTitle.textContent = String(summary.student.name || "Student") + " • " + String(summary.student.id || studentId);
    if (state.activeDrawerTab === "snapshot") {
      var drawerAnchorPanel = renderInstitutionalAnchorPanel(studentId, true);
      var efRow = SupportStore && typeof SupportStore.getExecutiveFunction === "function"
        ? SupportStore.getExecutiveFunction(studentId)
        : { upcomingTasks: [] };
      var upcomingTasks = Array.isArray(efRow.upcomingTasks) ? efRow.upcomingTasks.slice(0, 3) : [];
      var assignmentSnapshot = '<div class="td-support-item"><h4>Upcoming Tasks</h4>' + (
        upcomingTasks.length
          ? upcomingTasks.map(function (task) {
              return '<p>' + escAttr(task.name || "Task") + ' • ' + escAttr(task.dueDate || "No due date") + ' • ' + escAttr(task.status || "Not Started") + '</p>';
            }).join("")
          : '<p>No upcoming tasks yet.</p>'
      ) + '</div>';
      el.drawerBody.innerHTML = [
        '<div class="td-support-item"><h4>Last 7 Days Minutes</h4><p>Derived from recent sessions and quick checks.</p></div>',
        '<div class="td-support-item"><h4>Top Signals</h4><p>' + (summary.evidenceChips || []).slice(0, 5).map(function (c) { return c.label + " " + c.value; }).join(" • ") + '</p></div>',
        '<div class="td-support-item"><h4>Next Best Activity</h4><p>' + summary.nextMove.line + '</p><button class="td-top-btn" type="button" data-drawer-launch="' + summary.nextMove.quickHref + '">Launch</button></div>',
        assignmentSnapshot,
        drawerAnchorPanel
      ].join("");
      bindInstitutionalAnchorActions(studentId, el.drawerBody, true);
    } else if (state.activeDrawerTab === "goals") {
      var goalsList = (support.goals || []).length
        ? support.goals.slice(0, 6).map(function (g) {
            return '<div class="td-support-item"><h4>' + (g.skill || g.domain || "Goal") + '</h4><p>' + (g.baseline || "--") + ' → ' + (g.target || "--") + ' • updated ' + (g.updatedAt || g.createdAt || "") + '</p></div>';
          }).join("")
        : '<div class="td-support-item"><p>No goals yet. Use Meeting Notes → Convert to Goals.</p></div>';
      el.drawerBody.innerHTML = '<div class="td-support-item"><h4>SMART Goal Builder</h4><p>Quick add one baseline-to-target goal from today\'s discussion.</p><button class="td-top-btn" type="button" data-drawer-action="add-goal">Add Goal</button></div>' + goalsList;
    } else if (state.activeDrawerTab === "interventions") {
      var interventionList = (support.interventions || []).length
        ? support.interventions.slice(0, 8).map(function (i) {
            var view = formatTier1Intervention(i);
            return '<div class="td-support-item"><h4>Tier ' + (i.tier || 1) + ' • ' + (i.domain || "") + '</h4><p>' + (i.strategy || i.focus || "") + ' • ' + (i.frequency || "") + ' • ' + (i.durationMinutes || i.durationMin || "--") + ' min</p><div class="td-plan-tabs"><span class="td-chip">' + view.readinessLabel + '</span><span class="td-chip">Datapoints ' + view.datapointsCount + '</span></div></div>';
          }).join("")
        : '<div class="td-support-item"><p>No intervention entries yet.</p></div>';
      el.drawerBody.innerHTML = '<div class="td-support-item"><h4>Tier 1/2/3 Quick Log</h4><p>3-click entry for what/when/how long.</p><div class="td-plan-tabs"><button class="td-top-btn" type="button" data-drawer-action="start-tier1">Start Tier 1 Plan</button><button class="td-top-btn" type="button" data-drawer-action="add-intervention">Quick Log</button><button class="td-top-btn" type="button" data-drawer-action="add-datapoint">Log Datapoint</button></div></div>' + interventionList;
    } else if (state.activeDrawerTab === "evidence") {
      el.drawerBody.innerHTML = '<div class="td-support-item"><h4>Evidence (filterable)</h4><p>' + (summary.evidenceChips || []).map(function (c) { return c.label + ": " + c.value; }).join(" • ") + '</p></div>';
    } else {
      el.drawerBody.innerHTML = [
        '<div class="td-support-item"><h4>Share</h4><p>Generate meeting-ready outputs in one click.</p></div>',
        '<div class="td-support-item"><button id="td-drawer-share-now" class="td-top-btn" type="button">Open Share Summary</button></div>',
        '<div class="td-support-item"><button class="td-top-btn" type="button" data-drawer-action="meeting-summary">Meeting Summary (printable)</button></div>',
        '<div class="td-support-item"><button class="td-top-btn" type="button" data-drawer-action="tier1-pack">Tier 1 Evidence Pack</button></div>',
        '<div class="td-support-item"><button class="td-top-btn" type="button" data-drawer-action="mdt-export">Export for MDT (JSON + CSV)</button></div>'
      ].join("");
    }
    Array.prototype.forEach.call(el.drawerBody.querySelectorAll("[data-drawer-launch]"), function (button) {
      button.addEventListener("click", function () {
        var href = String(button.getAttribute("data-drawer-launch") || "word-quest.html?quick=1");
        window.location.href = appendStudentParam("./" + href.replace(/^\.\//, ""));
      });
    });
    var shareBtn = document.getElementById("td-drawer-share-now");
    if (shareBtn) {
      shareBtn.addEventListener("click", function () { openShareModal(studentId); });
    }
    Array.prototype.forEach.call(el.drawerBody.querySelectorAll("[data-drawer-action]"), function (button) {
      button.addEventListener("click", function () {
        var action = String(button.getAttribute("data-drawer-action") || "");
        if (!SupportStore) return;
        if (action === "add-goal") {
          SupportStore.addGoal(studentId, {
            domain: "literacy",
            skill: "Decoding strategy",
            baseline: "Current classroom baseline",
            target: "Target growth in 6 weeks",
            metric: "Session evidence + class sample",
            method: "Weekly check",
            schedule: "3x/week",
            reviewEveryDays: 14
          });
          renderDrawer(studentId);
          return;
        }
        if (action === "add-intervention") {
          SupportStore.addIntervention(studentId, {
            tier: 1,
            domain: "Reading",
            focus: "Decoding",
            startAt: new Date().toISOString(),
            frequency: "3x/week",
            durationMin: 20,
            strategy: "Phonics routine + guided decoding",
            fidelityChecklist: ["Modeled", "Prompted", "Checked for transfer"]
          });
          renderDrawer(studentId);
          return;
        }
        if (action === "start-tier1") {
          if (typeof SupportStore.startTier1Plan === "function") {
            SupportStore.startTier1Plan(studentId, {
              domain: "Reading",
              strategy: "Tier 1 classroom support",
              frequency: "3x/week",
              durationMinutes: 20,
              progressMetric: "MAP"
            });
            setCoachLine("Tier 1 plan started.");
            renderDrawer(studentId);
            renderSupportHub(studentId);
          }
          return;
        }
        if (action === "add-datapoint") {
          var tier1 = (SupportStore.getStudent(studentId).interventions || []).find(function (row) { return Number(row.tier || 1) === 1; });
          if (!tier1 || typeof SupportStore.addInterventionDatapoint !== "function") return;
          var value = Number(window.prompt("Datapoint value", "70") || 0);
          var note = window.prompt("Datapoint note", "") || "";
          SupportStore.addInterventionDatapoint(studentId, tier1.id, { date: new Date().toISOString().slice(0, 10), value: value, note: note });
          setCoachLine("Datapoint logged.");
          renderDrawer(studentId);
          renderSupportHub(studentId);
          return;
        }
        if (action === "meeting-summary") {
          var meeting = SupportStore.buildMeetingSummary(studentId, {});
          download("meeting-summary-" + studentId + ".html", meeting.html, "text/html");
          if (navigator.clipboard) navigator.clipboard.writeText(meeting.text).catch(function () {});
          setCoachLine("Meeting Summary exported + copied.");
          return;
        }
        if (action === "tier1-pack") {
          var pack = SupportStore.buildTier1EvidencePack(studentId, { domains: ["Reading", "Writing"] });
          download("tier1-evidence-pack-" + studentId + ".html", pack.html, "text/html");
          if (navigator.clipboard) navigator.clipboard.writeText(pack.text).catch(function () {});
          setCoachLine("Tier 1 Evidence Pack exported + copied.");
          return;
        }
        if (action === "mdt-export") {
          if (typeof SupportStore.buildMdtExport !== "function") return;
          var bundle = SupportStore.buildMdtExport(studentId, {});
          download("mdt-export-" + studentId + ".json", JSON.stringify(bundle.json, null, 2), "application/json");
          download("mdt-export-" + studentId + ".csv", bundle.csv, "text/csv");
          if (navigator.clipboard) navigator.clipboard.writeText(bundle.csv).catch(function () {});
          setCoachLine("MDT export generated (JSON + CSV).");
        }
      });
    });
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
    if (module === "PrecisionPlay") return "precision-play.html";
    if (module.indexOf("Numeracy") === 0) return "numeracy.html";
    return "word-quest.html?play=1";
  }

  function parseGradeLevel(raw) {
    var text = String(raw || "").toUpperCase();
    var match = text.match(/(\d{1,2})/);
    if (match && Number.isFinite(Number(match[1]))) return Number(match[1]);
    return null;
  }

  function readingMapThreshold(gradeLevel) {
    if (!Number.isFinite(gradeLevel)) return 190;
    if (gradeLevel <= 1) return 175;
    if (gradeLevel <= 2) return 185;
    if (gradeLevel <= 3) return 195;
    if (gradeLevel <= 5) return 205;
    if (gradeLevel <= 8) return 215;
    return 225;
  }

  function isLowBenchmarkText(value) {
    var text = String(value || "").toLowerCase();
    if (!text) return false;
    return (
      text.indexOf("below") >= 0 ||
      text.indexOf("risk") >= 0 ||
      text.indexOf("intensive") >= 0 ||
      text.indexOf("low") >= 0 ||
      text.indexOf("strategic") >= 0
    );
  }

  function isEarlyWordsTheirWayStage(value) {
    var text = String(value || "").toLowerCase();
    if (!text) return false;
    return (
      text.indexOf("psi") >= 0 ||
      text.indexOf("early") >= 0 ||
      text.indexOf("letter") >= 0 ||
      text.indexOf("within word pattern") >= 0
    );
  }

  function isWeakGlossStage(value) {
    var text = String(value || "").toLowerCase();
    if (!text) return false;
    return (
      text.indexOf("early") >= 0 ||
      text.indexOf("emerging") >= 0 ||
      text.indexOf("limited") >= 0 ||
      text.indexOf("additive") >= 0
    );
  }

  function rankWeightFromAnchor(studentId, row, anchors) {
    var score = (4 - Math.max(1, Math.min(3, Number(row.rank || 3)))) * 10;
    var contexts = [];
    var student = (state.caseload || []).find(function (s) { return String(s && s.id || "") === String(studentId || ""); }) || null;
    var gradeLevel = parseGradeLevel(student && student.gradeBand ? student.gradeBand : "");
    var moduleName = String(row.module || "");
    var skillId = String(row.skillId || "").toUpperCase();

    var readingMap = anchors && anchors.reading ? Number(anchors.reading.mapRIT) : NaN;
    if (Number.isFinite(readingMap) && readingMap < readingMapThreshold(gradeLevel)) {
      if (moduleName === "WordQuest" || moduleName === "PrecisionPlay" || moduleName === "ReadingLab" || skillId.indexOf("LIT.") === 0) {
        score += 22;
        contexts.push("MAP RIT below benchmark; reinforcing literacy foundations.");
      }
    }
    if (anchors && anchors.reading && isLowBenchmarkText(anchors.reading.corePhonicsBenchmark)) {
      if (moduleName === "WordQuest") {
        score += 28;
        contexts.push("Core Phonics benchmark indicates support need; prioritizing decoding.");
      }
    }
    if (anchors && anchors.reading && isEarlyWordsTheirWayStage(anchors.reading.wordsTheirWayStage)) {
      if (moduleName === "WordQuest" || moduleName === "PrecisionPlay") {
        score += 16;
        contexts.push("Words Their Way stage is early; reinforcing morphology/decoding patterns.");
      }
    }
    if (anchors && anchors.math && isWeakGlossStage(anchors.math.glossStage)) {
      if (moduleName.indexOf("Numeracy") === 0 || skillId.indexOf("MATH") >= 0 || skillId.indexOf("NUM") >= 0) {
        score += 20;
        contexts.push("GLOSS stage suggests weak strategy use; reinforcing conceptual numeracy.");
      }
    }
    var writingRubric = anchors && anchors.writing ? Number(anchors.writing.onDemandRubricScore) : NaN;
    if (Number.isFinite(writingRubric) && writingRubric < 2.5) {
      if (moduleName === "WritingStudio" || skillId.indexOf("WRITE") >= 0) {
        score += 24;
        contexts.push("Writing rubric score is low; increasing paragraph structure reinforcement.");
      }
    }

    return {
      score: score,
      context: contexts[0] || ""
    };
  }

  function applyInstitutionalAnchorOverlay(studentId, rows) {
    if (!Array.isArray(rows) || !rows.length) return [];
    if (!SupportStore || typeof SupportStore.getInstitutionalAnchors !== "function") return rows.slice(0, 3);
    var anchors = SupportStore.getInstitutionalAnchors(studentId);
    var ranked = rows.slice(0, 3).map(function (row) {
      var weight = rankWeightFromAnchor(studentId, row, anchors);
      return Object.assign({}, row, {
        _anchorScore: weight.score,
        anchorContext: weight.context
      });
    });
    ranked.sort(function (a, b) {
      if (Number(b._anchorScore || 0) !== Number(a._anchorScore || 0)) return Number(b._anchorScore || 0) - Number(a._anchorScore || 0);
      return Number(a.rank || 3) - Number(b.rank || 3);
    });
    return ranked.slice(0, 3).map(function (row, idx) {
      return Object.assign({}, row, { rank: idx + 1 });
    });
  }

  function formatAlignmentLine(alignment) {
    if (!alignment) return "";
    var standard = "";
    if (Array.isArray(alignment.fishTank) && alignment.fishTank.length) standard = String(alignment.fishTank[0]);
    if (!standard && Array.isArray(alignment.illustrativeMath) && alignment.illustrativeMath.length) standard = String(alignment.illustrativeMath[0]);
    var strand = String(alignment.sasStrand || "");
    var category = String(alignment.mtssCategory || "");
    var lines = [];
    if (standard || strand) lines.push("Aligned to: " + [standard, strand].filter(Boolean).join(" - "));
    if (category) lines.push("MTSS Category: " + category);
    return lines.map(function (line) {
      return '<p class="td-sequencer-alignment">' + line + '</p>';
    }).join("");
  }

  function formatAnchorContextLine(contextLine) {
    var line = String(contextLine || "").trim();
    if (!line) return "";
    return '<p class="td-sequencer-alignment">Context: ' + line + '</p>';
  }

  function renderInstitutionalAnchorPanel(studentId, compact) {
    var isCompact = !!compact;
    if (!studentId || !SupportStore || typeof SupportStore.getInstitutionalAnchors !== "function") {
      return '<div class="td-support-item"><h4>Institutional Data Anchors</h4><p>Select a student to enter MAP/Aimsweb/Core Phonics/Writing/Math anchors.</p></div>';
    }
    var a = SupportStore.getInstitutionalAnchors(studentId);
    var cls = isCompact ? "td-anchor-grid is-compact" : "td-anchor-grid";
    return [
      '<div class="td-support-item td-anchor-panel">',
      '<h4>Institutional Data Anchors</h4>',
      '<div class="' + cls + '">',
      '<section class="td-anchor-group"><h5>Reading</h5>',
      '<label>MAP RIT<input class="td-anchor-input" data-anchor-path="reading.mapRIT" type="number" value="' + escAttr(a.reading.mapRIT == null ? "" : a.reading.mapRIT) + '" /></label>',
      '<label>Aimsweb Percentile<input class="td-anchor-input" data-anchor-path="reading.aimswebPercentile" type="number" min="0" max="99" value="' + escAttr(a.reading.aimswebPercentile == null ? "" : a.reading.aimswebPercentile) + '" /></label>',
      '<label>Core Phonics<input class="td-anchor-input" data-anchor-path="reading.corePhonicsBenchmark" type="text" value="' + escAttr(a.reading.corePhonicsBenchmark || "") + '" /></label>',
      '<label>Words Their Way Stage<input class="td-anchor-input" data-anchor-path="reading.wordsTheirWayStage" type="text" value="' + escAttr(a.reading.wordsTheirWayStage || "") + '" /></label>',
      '<label>Fundations Unit<input class="td-anchor-input" data-anchor-path="reading.fundationsUnit" type="text" value="' + escAttr(a.reading.fundationsUnit || "") + '" /></label>',
      '</section>',
      '<section class="td-anchor-group"><h5>Writing</h5>',
      '<label>On-Demand Rubric<input class="td-anchor-input" data-anchor-path="writing.onDemandRubricScore" type="number" step="0.1" value="' + escAttr(a.writing.onDemandRubricScore == null ? "" : a.writing.onDemandRubricScore) + '" /></label>',
      '<label>Current Goal<input class="td-anchor-input" data-anchor-path="writing.currentWritingGoal" type="text" value="' + escAttr(a.writing.currentWritingGoal || "") + '" /></label>',
      '</section>',
      '<section class="td-anchor-group"><h5>Math</h5>',
      '<label>MAP RIT<input class="td-anchor-input" data-anchor-path="math.mapRIT" type="number" value="' + escAttr(a.math.mapRIT == null ? "" : a.math.mapRIT) + '" /></label>',
      '<label>Bridges Unit Score<input class="td-anchor-input" data-anchor-path="math.bridgesUnitScore" type="number" step="0.1" value="' + escAttr(a.math.bridgesUnitScore == null ? "" : a.math.bridgesUnitScore) + '" /></label>',
      '<label>GLOSS Stage<input class="td-anchor-input" data-anchor-path="math.glossStage" type="text" value="' + escAttr(a.math.glossStage || "") + '" /></label>',
      '<label>Illustrative Checkpoint<input class="td-anchor-input" data-anchor-path="math.illustrativeCheckpoint" type="text" value="' + escAttr(a.math.illustrativeCheckpoint || "") + '" /></label>',
      '</section>',
      '</div>',
      '<div class="td-plan-tabs"><button class="td-top-btn" type="button" data-anchor-save="1">Save Anchors</button></div>',
      '</div>'
    ].join("");
  }

  function bindInstitutionalAnchorActions(studentId, rootEl, refreshDrawer) {
    var container = rootEl || document;
    var saveBtn = container.querySelector("[data-anchor-save='1']");
    if (!saveBtn || !SupportStore || typeof SupportStore.setInstitutionalAnchors !== "function") return;
    saveBtn.addEventListener("click", function () {
      var inputs = container.querySelectorAll(".td-anchor-input[data-anchor-path]");
      var patch = { reading: {}, writing: {}, math: {} };
      Array.prototype.forEach.call(inputs, function (input) {
        var path = String(input.getAttribute("data-anchor-path") || "");
        var value = String(input.value || "").trim();
        var parts = path.split(".");
        if (parts.length !== 2) return;
        var group = parts[0];
        var key = parts[1];
        if (!patch[group]) patch[group] = {};
        patch[group][key] = value;
      });
      SupportStore.setInstitutionalAnchors(studentId, patch);
      setCoachLine("Institutional anchors saved.");
      renderInstructionalSequencer(studentId);
      if (refreshDrawer) {
        renderDrawer(studentId);
      } else {
        renderSupportHub(studentId);
      }
    });
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
    var activeTask = ef.activeTask || null;
    var upcoming = Array.isArray(ef.upcomingTasks) ? ef.upcomingTasks.slice(0, 3) : [];
    var stepsHtml = "";
    if (activeTask && Array.isArray(activeTask.steps) && activeTask.steps.length) {
      stepsHtml = '<div class="td-ef-steps">' + activeTask.steps.map(function (step, idx) {
        var checked = Array.isArray(activeTask.completedSteps) && activeTask.completedSteps.indexOf(idx) >= 0;
        return '<label class="td-ef-step"><input type="checkbox" data-ef-step="' + idx + '"' + (checked ? " checked" : "") + '> ' + escAttr(step) + "</label>";
      }).join("") + "</div>";
    }
    var upcomingHtml = upcoming.length
      ? upcoming.map(function (task) {
          return '<div class="td-impl-chip">' + escAttr(task.name) + " • " + escAttr(task.dueDate || "No due date") + " • " + escAttr(task.status || "Not Started") + ' <button class="td-top-btn" type="button" data-ef-break="' + escAttr(String(task.id || "")) + '">Break into Steps</button></div>';
        }).join("")
      : '<span class="td-reco-line">No upcoming tasks yet.</span>';

    el.executiveSupportBody.innerHTML = [
      '<div class="td-impl-form">',
      '<input id="td-ef-task-input" class="td-anchor-input" type="text" placeholder="Enter assignment or task">',
      '<button id="td-ef-build" class="td-top-btn" type="button">Build Steps</button>',
      '<button id="td-ef-add-upcoming" class="td-top-btn" type="button">Add Upcoming</button>',
      '<span></span>',
      '</div>',
      (activeTask ? '<p class="td-sequencer-alignment">Active Task: ' + escAttr(activeTask.name || "Task") + "</p>" : '<p class="td-sequencer-alignment">No active executive task.</p>'),
      stepsHtml,
      '<div class="td-impl-form">',
      '<span class="td-ef-timer" id="td-ef-timer">10:00</span>',
      '<button id="td-ef-start-sprint" class="td-top-btn" type="button">Start Focus Sprint</button>',
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
        var name = String(input && input.value || "").trim();
        if (!name) return;
        var steps = decomposeTask(name);
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
        clearEfTimer();
        state.efSecondsLeft = 600;
        if (timerEl) timerEl.textContent = "10:00";
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

  function buildShareSummaryText(studentId) {
    var summary = Evidence.getStudentSummary(studentId);
    var sessions = (window.CSEvidence && typeof window.CSEvidence.getRecentSessions === "function")
      ? window.CSEvidence.getRecentSessions(studentId, { limit: 1 })
      : [];
    var row = sessions[0] || {};
    var sig = row.signals || {};
    var rec = (window.CSEvidence && typeof window.CSEvidence.recommendNextSteps === "function")
      ? window.CSEvidence.recommendNextSteps(sig)
      : { bullets: [summary.nextMove.line] };
    return [
      "Student: " + summary.student.name + " (" + summary.student.id + ")",
      "Date: " + new Date().toISOString().slice(0, 10),
      "Activity: Word Quest (90s)",
      "Observed:",
      "- Attempts: " + (row.outcomes && row.outcomes.attemptsUsed != null ? row.outcomes.attemptsUsed : "--"),
      "- Vowel swaps: " + (sig.vowelSwapCount != null ? sig.vowelSwapCount : "--"),
      "- Repeat same slot: " + (sig.repeatSameBadSlotCount != null ? sig.repeatSameBadSlotCount : "--"),
      "Next step (Tier 2):",
      "- " + (rec.bullets && rec.bullets[0] ? rec.bullets[0] : summary.nextMove.line),
      "Progress note:",
      "- " + summary.nextMove.line
    ].join("\n");
  }

  function buildSharePayload(studentId) {
    var sid = String(studentId || "");
    var summary = Evidence.getStudentSummary(sid);
    var model = Evidence && typeof Evidence.getSkillModel === "function"
      ? Evidence.getSkillModel(sid)
      : { studentId: sid, mastery: {}, topNeeds: [] };
    var recentSessions = window.CSEvidence && typeof window.CSEvidence.getRecentSessions === "function"
      ? window.CSEvidence.getRecentSessions(sid, { limit: 7 })
      : [];
    var plan = SessionPlanner && typeof SessionPlanner.buildDailyPlan === "function"
      ? SessionPlanner.buildDailyPlan({
          studentId: sid,
          skillModel: model,
          topNeeds: model.topNeeds || [],
          timeBudgetMin: 20
        })
      : [];
    var teacherNotes = el.notesInput && typeof el.notesInput.value === "string" ? el.notesInput.value.trim() : "";
    if (ShareSummaryAPI && typeof ShareSummaryAPI.buildShareSummary === "function") {
      return ShareSummaryAPI.buildShareSummary({
        studentId: sid,
        studentProfile: summary.student,
        skillModel: model,
        recentSessions: recentSessions,
        plan: plan,
        teacherNotes: teacherNotes
      });
    }
    return {
      text: buildShareSummaryText(sid),
      json: {
        studentId: sid,
        student: summary.student,
        topNeeds: model.topNeeds || [],
        skillModel: model,
        recentSessions: recentSessions,
        plan: plan,
        teacherNotes: teacherNotes
      },
      csv: "studentId,summary\n\"" + sid + "\",\"" + buildShareSummaryText(sid).replace(/"/g, '""') + "\""
    };
  }

  function closeShareModal() {
    if (el.shareModal) el.shareModal.classList.add("hidden");
  }

  function openShareModal(studentId) {
    if (!el.shareModal || !el.sharePreview || !studentId) return;
    var payload = buildSharePayload(studentId);
    state.sharePayload = payload;
    el.sharePreview.value = payload.text;
    el.shareModal.classList.remove("hidden");
  }

  function openMeetingModal() {
    if (!el.meetingModal) return;
    if (el.meetingType && MeetingNotes && MeetingNotes.templates) {
      var type = String(el.meetingType.value || "SSM");
      var preset = MeetingNotes.templates[type] || MeetingNotes.templates.SSM || {};
      var notesText = [
        "Agenda: " + String(preset.agenda || ""),
        "Concerns: " + String(preset.concerns || ""),
        "Strengths: " + String(preset.strengths || ""),
        "Data Reviewed: " + String(preset.dataReviewed || "")
      ].join("\n");
      if (el.meetingNotes) el.meetingNotes.value = notesText;
      if (el.meetingActions) el.meetingActions.value = "";
    }
    if (el.meetingFormatButtons && el.meetingFormatButtons.length) {
      el.meetingFormatButtons.forEach(function (btn) {
        btn.classList.toggle("is-active", btn.getAttribute("data-meeting-format") === state.meetingFormat);
      });
    }
    if (el.meetingLanguage) {
      el.meetingLanguage.value = state.meetingLanguage || "en";
    }
    if (el.meetingLiveTranslate) {
      el.meetingLiveTranslate.checked = !!state.liveTranslate;
    }
    updateMeetingSttStatus(MeetingNotes && typeof MeetingNotes.supportsSpeechRecognition === "function" && MeetingNotes.supportsSpeechRecognition()
      ? "Transcription ready. Click Start STT to capture local text."
      : "Speech recognition unavailable in this browser. Manual notes mode is active.", !(MeetingNotes && typeof MeetingNotes.supportsSpeechRecognition === "function" && MeetingNotes.supportsSpeechRecognition()) ? "warn" : "");
    if (el.meetingSttStart) el.meetingSttStart.disabled = !(MeetingNotes && typeof MeetingNotes.supportsSpeechRecognition === "function" && MeetingNotes.supportsSpeechRecognition());
    if (el.meetingSttStop) el.meetingSttStop.disabled = true;
    renderMeetingOutput();
    el.meetingModal.classList.remove("hidden");
  }

  function closeMeetingModal() {
    stopMeetingRecognition();
    if (el.meetingModal) el.meetingModal.classList.add("hidden");
  }

  function insertAtCursor(text) {
    if (!el.meetingNotes) return;
    var noteText = String(text || "");
    var area = el.meetingNotes;
    var start = typeof area.selectionStart === "number" ? area.selectionStart : area.value.length;
    var end = typeof area.selectionEnd === "number" ? area.selectionEnd : area.value.length;
    var prefix = area.value.slice(0, start);
    var suffix = area.value.slice(end);
    area.value = prefix + noteText + suffix;
    var nextPos = prefix.length + noteText.length;
    area.selectionStart = area.selectionEnd = nextPos;
    area.focus();
  }

  function updateMeetingSttStatus(text, tone) {
    if (!el.meetingSttStatus) return;
    el.meetingSttStatus.textContent = String(text || "");
    el.meetingSttStatus.classList.toggle("is-live", tone === "live");
    el.meetingSttStatus.classList.toggle("is-warn", tone === "warn");
  }

  function stopMeetingRecognition() {
    if (state.meetingRecognizer && typeof state.meetingRecognizer.stop === "function") {
      state.meetingRecognizer.stop();
    }
    state.meetingRecognizer = null;
    if (el.meetingSttStop) el.meetingSttStop.disabled = true;
    if (el.meetingSttStart && MeetingNotes && typeof MeetingNotes.supportsSpeechRecognition === "function") {
      el.meetingSttStart.disabled = !MeetingNotes.supportsSpeechRecognition();
    }
  }

  function toneDownFamilyLanguage(text) {
    return String(text || "")
      .replace(/\bMTSS\b/gi, "school support plan")
      .replace(/\bTier\s*([123])\b/gi, "support level $1")
      .replace(/\bintervention\b/gi, "support")
      .replace(/\bbenchmark\b/gi, "target")
      .replace(/\bdeficit\b/gi, "need")
      .replace(/\bnoncompliant\b/gi, "not yet consistent")
      .replace(/\s{2,}/g, " ")
      .trim();
  }

  function meetingStudentContext() {
    var sid = state.selectedId || "student";
    var summary = Evidence.getStudentSummary(sid);
    var model = Evidence.getSkillModel ? Evidence.getSkillModel(sid) : { topNeeds: [] };
    var topNeeds = (model && Array.isArray(model.topNeeds) ? model.topNeeds : []).slice(0, 3).map(function (n) {
      return n.label || n.skillId || n.id || "priority skill";
    });
    var riskText = summary && summary.risk === "risk" ? "higher support intensity" : "steady support";
    return {
      sid: sid,
      studentName: summary && summary.student ? summary.student.name : sid,
      topNeeds: topNeeds.length ? topNeeds : ["decoding accuracy"],
      riskText: riskText,
      nextMove: summary && summary.nextMove ? summary.nextMove.line : "continue focused practice"
    };
  }

  function buildParentActions(context) {
    var hints = [];
    var key = String((context.topNeeds && context.topNeeds[0]) || "").toLowerCase();
    if (/decod|phon|vowel/.test(key)) {
      hints.push("Read together for 10 minutes each day and practice short vowel words.");
      hints.push("Ask your child to tap and blend sounds before reading each word.");
    } else if (/math|number|base|fact/.test(key)) {
      hints.push("Have your child explain one math problem out loud each night.");
      hints.push("Practice quick number facts for 5 minutes using everyday examples.");
    } else if (/writing|sentence|paragraph|syntax/.test(key)) {
      hints.push("Ask your child to write 3 clear sentences about their day.");
      hints.push("Have your child reread and add one detail sentence each night.");
    } else {
      hints.push("Review class vocabulary for 10 minutes each day.");
      hints.push("Ask your child to explain one thing they learned in class.");
    }
    hints.push("Celebrate effort and keep practice short and consistent.");
    return hints.slice(0, 3);
  }

  function buildFamilySummary(context, notesText, actionsText) {
    var actions = MeetingTranslation && typeof MeetingTranslation.splitLines === "function"
      ? MeetingTranslation.splitLines(actionsText)
      : String(actionsText || "").split(/\r?\n/).filter(Boolean);
    var parentActions = buildParentActions(context);
    var checkInDate = new Date(Date.now() + (14 * 86400000)).toISOString().slice(0, 10);
    var sections = [
      "How Your Child Is Doing",
      "Strengths first: " + toneDownFamilyLanguage(context.nextMove) + ".",
      "Growth areas: " + toneDownFamilyLanguage(context.topNeeds.join(", ")) + ".",
      "",
      "What We Are Working On",
      toneDownFamilyLanguage(notesText || "We are building accuracy, confidence, and consistency in class tasks."),
      "",
      "How the School Is Supporting",
      "- Daily focused support in class",
      "- Weekly progress checks",
      "- Structured practice linked to current goals",
      "",
      "How You Can Help at Home",
      parentActions.map(function (item) { return "- " + item; }).join("\n"),
      "",
      "Next Check-In Date",
      checkInDate,
      "",
      "Action Items",
      (actions.length ? actions.slice(0, 5).map(function (item) { return "- " + toneDownFamilyLanguage(item); }).join("\n") : "- Continue current home-school support routine")
    ];
    return sections.join("\n");
  }

  function buildMeetingNarrative(format, notesText, actionsText) {
    var context = meetingStudentContext();
    if (format === "family") {
      return buildFamilySummary(context, notesText, actionsText);
    }
    if (format === "optimized") {
      return [
        "Student: " + context.studentName + " (" + context.sid + ")",
        "Highlights: " + toneDownFamilyLanguage(context.nextMove),
        "Priority Skills: " + toneDownFamilyLanguage(context.topNeeds.join(", ")),
        "Current Support Signal: " + context.riskText,
        "",
        "Meeting Notes",
        toneDownFamilyLanguage(notesText || "No notes captured."),
        "",
        "Action Items",
        actionsText || "No action items captured.",
        "",
        "Next Move",
        toneDownFamilyLanguage(context.nextMove)
      ].join("\n");
    }
    return [
      "Meeting Notes (" + (el.meetingType ? String(el.meetingType.value || "SSM") : "SSM") + ")",
      "Student: " + context.studentName + " (" + context.sid + ")",
      "Date: " + new Date().toISOString().slice(0, 10),
      "",
      "Agenda / Notes",
      notesText || "No notes captured.",
      "",
      "Action Items",
      actionsText || "No action items captured.",
      "",
      "Top Needs",
      context.topNeeds.join(" • "),
      "",
      "Recommended Next Step",
      context.nextMove
    ].join("\n");
  }

  function getMeetingLanguage() {
    if (!el.meetingLanguage) return "en";
    return String(el.meetingLanguage.value || "en");
  }

  function renderMeetingOutput() {
    var notesText = String(el.meetingNotes && el.meetingNotes.value || "").trim();
    var actionsText = String(el.meetingActions && el.meetingActions.value || "").trim();
    var english = buildMeetingNarrative(state.meetingFormat || "sas", notesText, actionsText);
    if (el.meetingPreview) el.meetingPreview.value = english;
    var language = state.meetingLanguage || getMeetingLanguage();
    var translated = english;
    if (MeetingTranslation && typeof MeetingTranslation.translateText === "function") {
      translated = MeetingTranslation.translateText(english, language);
    }
    var showTranslated = language !== "en" || !!state.liveTranslate;
    if (el.meetingTranslationPreview) {
      el.meetingTranslationPreview.classList.toggle("hidden", !showTranslated);
      if (showTranslated) {
        if (!state.liveTranslate || !String(el.meetingTranslationPreview.value || "").trim()) {
          el.meetingTranslationPreview.value = translated;
        }
      }
    }
    if (el.meetingTranslationBadge) {
      el.meetingTranslationBadge.classList.toggle("hidden", language === "en");
      if (language !== "en" && MeetingTranslation && typeof MeetingTranslation.languageLabel === "function") {
        el.meetingTranslationBadge.textContent = "Translated from English • " + MeetingTranslation.languageLabel(language);
      }
    }
  }

  function buildMeetingExportHtml(mode, englishText, translatedText, language) {
    var safeEnglish = String(englishText || "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
    var safeTranslated = String(translatedText || "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
    var langLabel = (MeetingTranslation && typeof MeetingTranslation.languageLabel === "function")
      ? MeetingTranslation.languageLabel(language)
      : String(language || "Target");
    if (mode === "bilingual") {
      return [
        "<!doctype html><html><head><meta charset='utf-8'><title>Bilingual Meeting Summary</title>",
        "<style>body{font:14px/1.45 -apple-system,Segoe UI,Arial;padding:20px;color:#112}h1{margin:0 0 10px} .grid{display:grid;grid-template-columns:1fr 1fr;gap:16px} pre{white-space:pre-wrap;border:1px solid #ccd;border-radius:8px;padding:10px;background:#f8fbff}</style>",
        "</head><body><h1>Bilingual Meeting Summary</h1><div class='grid'><section><h2>English</h2><pre>",
        safeEnglish,
        "</pre></section><section><h2>",
        langLabel,
        "</h2><pre>",
        safeTranslated || safeEnglish,
        "</pre></section></div></body></html>"
      ].join("");
    }
    return [
      "<!doctype html><html><head><meta charset='utf-8'><title>Meeting Summary</title>",
      "<style>body{font:14px/1.45 -apple-system,Segoe UI,Arial;padding:20px;color:#112}pre{white-space:pre-wrap;border:1px solid #ccd;border-radius:8px;padding:10px;background:#f8fbff}</style>",
      "</head><body><h1>Meeting Summary</h1><pre>",
      mode === "parent" ? safeEnglish : (safeTranslated || safeEnglish),
      "</pre></body></html>"
    ].join("");
  }

  function buildMeetingClipboardSummary() {
    var english = String(el.meetingPreview && el.meetingPreview.value || "").trim();
    if (!english) {
      renderMeetingOutput();
      english = String(el.meetingPreview && el.meetingPreview.value || "").trim();
    }
    var language = getMeetingLanguage();
    if (language === "en") return english;
    var translated = String(el.meetingTranslationPreview && el.meetingTranslationPreview.value || "").trim();
    return [
      english,
      "",
      "Translated from English",
      translated || english
    ].join("\n");
  }

  function getSelectedStudentGradeBand() {
    var student = (state.caseload || []).find(function (row) { return row.id === state.selectedId; });
    var grade = student && student.grade ? String(student.grade) : "";
    var n = Number(String(grade).replace(/[^0-9]/g, ""));
    if (!Number.isFinite(n)) return "";
    if (n <= 2) return "K-2";
    if (n <= 5) return "3-5";
    if (n <= 8) return "6-8";
    return "9-12";
  }

  function closeSasLibraryModal() {
    if (el.sasLibraryModal) el.sasLibraryModal.classList.add("hidden");
  }

  function openSasLibraryModal() {
    if (!el.sasLibraryModal) return;
    if (!SASLibrary || typeof SASLibrary.ensureLoaded !== "function") {
      if (el.sasDetail) el.sasDetail.textContent = "SAS library module unavailable.";
      el.sasLibraryModal.classList.remove("hidden");
      return;
    }
    SASLibrary.ensureLoaded().then(function (loaded) {
      state.sasPack = loaded.pack || null;
      state.sasSelection = null;
      if (el.sasApplyPlan) el.sasApplyPlan.disabled = true;
      renderSasLibraryResults();
      el.sasLibraryModal.classList.remove("hidden");
    }).catch(function (err) {
      if (el.sasDetail) el.sasDetail.textContent = "SAS alignment pack unavailable. Run npm run sas:build. (" + String(err && err.message || "load error") + ")";
      if (el.sasList) el.sasList.innerHTML = "";
      el.sasLibraryModal.classList.remove("hidden");
    });
  }

  function renderSasLibraryResults() {
    if (!el.sasList || !el.sasDetail || !state.sasPack || !SASLibrary) return;
    var query = String(el.sasSearch && el.sasSearch.value || "");
    var gradeBand = getSelectedStudentGradeBand();
    var rows = SASLibrary.search(state.sasPack, {
      tab: state.sasTab,
      query: query,
      gradeBand: gradeBand
    });
    if (!rows.length) {
      el.sasList.innerHTML = '<p class=\"td-reco-line\">No matches. Adjust search or tab.</p>';
      el.sasDetail.textContent = "No item selected.";
      state.sasSelection = null;
      if (el.sasApplyPlan) el.sasApplyPlan.disabled = true;
      return;
    }
    el.sasList.innerHTML = rows.map(function (row) {
      return '<button class=\"td-sas-row\" type=\"button\" data-sas-id=\"' + row.id + '\"><strong>' + row.title + '</strong><span>' + (row.subtitle || row.id) + '</span></button>';
    }).join("");
    Array.prototype.forEach.call(el.sasList.querySelectorAll("[data-sas-id]"), function (button, idx) {
      button.addEventListener("click", function () {
        var selected = rows.find(function (row) { return row.id === button.getAttribute("data-sas-id"); }) || rows[0];
        state.sasSelection = selected;
        Array.prototype.forEach.call(el.sasList.querySelectorAll(".td-sas-row"), function (rowBtn) { rowBtn.classList.remove("is-active"); });
        button.classList.add("is-active");
        el.sasDetail.textContent = SASLibrary.describeItem(state.sasTab, selected.row);
        if (el.sasApplyPlan) el.sasApplyPlan.disabled = false;
      });
      if (idx === 0) button.click();
    });
  }

  function applySelectedSasItemToPlan() {
    if (!state.sasSelection) return;
    var row = state.sasSelection.row || {};
    var line = [state.sasSelection.title, row.goal_template_smart || row.progress_monitoring || row.cadence || ""].filter(Boolean).join(" — ");
    if (el.notesInput) {
      var prefix = el.notesInput.value && !/\\n$/.test(el.notesInput.value) ? "\\n" : "";
      el.notesInput.value = (el.notesInput.value || "") + prefix + "[SAS] " + line;
    }
    setCoachLine("Added SAS-aligned item to plan notes.");
    closeSasLibraryModal();
  }

  function renderSuggestedGoals(studentId) {
    var target = document.getElementById("td-suggested-goals");
    if (!target || !state.sasPack || !SASLibrary) return;
    var domainInput = window.prompt("Goal domain (literacy/math/writing/behavior/executive)", "literacy");
    if (!domainInput) return;
    var baselineInput = window.prompt("Baseline note (short)", "Current baseline from classwork and quick checks");
    if (baselineInput == null) return;
    var suggested = SASLibrary.suggestGoals(state.sasPack, {
      domain: domainInput,
      gradeBand: getSelectedStudentGradeBand(),
      baseline: baselineInput
    });
    if (!suggested.length) {
      target.innerHTML = '<p class="td-reco-line">No goal templates matched that domain/grade. Try broader domain.</p>';
      return;
    }
    target.innerHTML = suggested.map(function (goal) {
      return [
        '<article class="td-suggest-goal">',
        '<strong>' + (goal.skill || goal.domain || "Goal") + '</strong>',
        '<p>' + (goal.goal_template_smart || '') + '</p>',
        '</article>'
      ].join('');
    }).join('');
    if (SupportStore && studentId && typeof SupportStore.addGoal === "function") {
      suggested.slice(0, 2).forEach(function (goal) {
        SupportStore.addGoal(studentId, {
          domain: goal.domain || domainInput,
          skill: goal.skill || "SAS aligned goal",
          baseline: baselineInput || (goal.baseline_prompt || "Baseline"),
          target: (goal.goal_template_smart || "").slice(0, 180),
          metric: goal.progress_monitoring_method || "Progress monitoring method",
          method: "SAS goal-bank suggestion",
          schedule: "2-3x/week",
          reviewEveryDays: 14,
          notes: "Auto-suggested from SAS Alignment Pack"
        });
      });
    }
    setCoachLine("Suggested SAS goal templates ready.");
  }

  function renderGeneratedPlanner(studentId) {
    var target = document.getElementById("td-generated-plan");
    if (!target) return;
    var plan = state.generatedPlanner;
    if (!plan) {
      target.innerHTML = '<p class="td-reco-line">Create Plan to draft SMART goals and recommended activities.</p>';
      return;
    }
    target.innerHTML = [
      '<div class="td-support-item">',
      '<h4>Plan Summary</h4>',
      '<p>Frequency: ' + (plan.frequency || "3x/week") + ' • Progress cadence: ' + (plan.progressCadence || "Weekly mini-probe") + '</p>',
      '</div>',
      '<div class="td-support-item"><h4>SMART Goals</h4>' + (plan.goals || []).map(function (goal) {
        return '<div class="td-support-line"><strong>' + (goal.skill || goal.domain || "Goal") + '</strong><p>' + (goal.goal_template_smart || "") + '</p></div>';
      }).join("") + '</div>',
      '<div class="td-support-item"><h4>Recommended Activities</h4>' + (plan.activities || []).map(function (act) {
        return '<div class="td-support-line"><strong>' + act.title + '</strong><p>' + (act.focusSkill || "") + ' • ' + act.minutes + ' min</p></div>';
      }).join("") + '</div>',
      '<div class="td-plan-tabs"><button class="td-top-btn" type="button" id="td-apply-plan">Apply plan to student goals</button><button class="td-top-btn" type="button" id="td-copy-sheet-row">Copy Google Sheet row</button></div>'
    ].join("");
    var applyBtn = document.getElementById("td-apply-plan");
    if (applyBtn) {
      applyBtn.addEventListener("click", function () {
        if (!SupportStore || typeof SupportStore.addGoal !== "function") return;
        (plan.goals || []).slice(0, 3).forEach(function (goal) {
          SupportStore.addGoal(studentId, {
            domain: goal.domain || "literacy",
            skill: goal.skill || "Goal",
            baseline: goal.baseline_prompt || "Current baseline",
            target: goal.goal_template_smart || "",
            metric: goal.progress_monitoring_method || "Weekly mini-probe",
            schedule: plan.frequency || "3x/week",
            reviewEveryDays: 7,
            notes: "Auto-generated from Intervention Planner"
          });
        });
        setCoachLine("Plan applied to student goals.");
        renderSupportHub(studentId);
      });
    }
    var copyBtn = document.getElementById("td-copy-sheet-row");
    if (copyBtn) {
      copyBtn.addEventListener("click", function () {
        var student = Evidence.getStudentSummary(studentId).student;
        var goalText = (plan.goals || []).map(function (goal) { return goal.skill || goal.domain; }).join(" | ");
        var nextActivities = (plan.activities || []).map(function (act) { return act.title; }).join(" | ");
        var row = [
          student.id || studentId,
          student.name || studentId,
          new Date().toISOString().slice(0, 10),
          goalText,
          plan.frequency || "3x/week",
          nextActivities,
          "Generated via Cornerstone MTSS planner"
        ].join("\t");
        if (navigator.clipboard) navigator.clipboard.writeText(row).catch(function () {});
        setCoachLine("Copied Google Sheets row.");
      });
    }
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
    try {
      var sid = new URLSearchParams(window.location.search).get("student");
      if (sid) return sid;
    } catch (_e) {}
    return state.selectedId || "";
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
      hasStudentDrawer: !!document.getElementById("td-last-session-card"),
      hasShareSummary: !!document.getElementById("td-share-summary"),
      hasNeedsChips: !!document.getElementById("td-needs-chip-list"),
      hasSupportHub: !!document.getElementById("td-support-hub"),
      hasTodayPlan: !!document.getElementById("td-today-plan"),
      hasProgressNote: !!document.getElementById("td-progress-note"),
      hasToday: !!document.getElementById("td-today"),
      hasTodayList: !!document.getElementById("td-today-list"),
      hasBuildBlock: hasBuildBlock,
      hasTier1EvidenceTool: !!document.getElementById("td-tier1-pack") || !!document.querySelector("[data-tier1-action='start']"),
      hasAccommodationsPanel: !!document.querySelector("[data-support-tab='accommodations']"),
      hasAccommodationButtons: !!document.querySelector("[data-accommodation-toggle]") || !!document.querySelector("[data-support-tab='accommodations']"),
      hasMeetingNotesTool: !!document.getElementById("td-meeting-mode") || !!document.getElementById("td-open-meeting-notes"),
      hasReferralPacketExport: !!document.getElementById("td-support-export-packet"),
      hasShareControls: !!document.getElementById("td-share-cluster"),
      hasCopySummary: !!document.getElementById("td-share-quick-copy"),
      hasEvidenceChips: !!document.getElementById("td-evidence-chips"),
      hasAlignmentToggle: !!document.getElementById("td-show-alignment"),
      hasImplementationToday: !!document.getElementById("td-implementation-today"),
      hasImplementationLogButton: !!document.getElementById("td-impl-log"),
      hasExecutiveSupport: !!document.getElementById("td-executive-support")
    };
    window.__TD_MARKERS__ = {
      hasToday: !!document.getElementById("td-today"),
      hasTodayList: !!document.getElementById("td-today-list"),
      hasBuildBlock: hasBuildBlock
    };
  }

  function bindEvents() {
    el.search.addEventListener("input", function () { filterCaseload(el.search.value || ""); });
    el.importExport.addEventListener("click", handleImportExport);
    el.addStudent.addEventListener("click", addStudentQuick);
    el.settings.addEventListener("click", function () {
      var panel = document.getElementById("settings-panel");
      if (panel) {
        panel.classList.toggle("hidden");
        setCoachLine(panel.classList.contains("hidden") ? "Settings closed." : "Settings opened.");
        return;
      }
      if (window.CSBuildBadge && typeof window.CSBuildBadge.open === "function") {
        window.CSBuildBadge.open();
        setCoachLine("Build controls opened. Use Force update for stale clients.");
        return;
      }
      setCoachLine("Build controls unavailable. Reload this page.");
    });

    if (el.homeBtn) {
      el.homeBtn.addEventListener("click", function () {
        window.location.href = appendStudentParam("./index.html");
      });
    }
    if (el.brandHome) {
      el.brandHome.setAttribute("href", appendStudentParam("./index.html"));
    }

    if (el.activitySelect) {
      el.activitySelect.addEventListener("change", function () {
        var target = String(el.activitySelect.value || "").trim();
        if (!target) return;
        window.location.href = appendStudentParam("./" + target);
      });
    }

    el.planTabs.forEach(function (button) {
      button.addEventListener("click", function () {
        state.activePlanTab = String(button.getAttribute("data-plan-tab") || "ten");
        renderTodayPlan(state.plan);
      });
    });

    el.noteTabs.forEach(function (button) {
      button.addEventListener("click", function () {
        state.activeNoteTab = String(button.getAttribute("data-note-tab") || "teacher");
        if (!state.selectedId) return;
        var summary = Evidence.getStudentSummary(state.selectedId);
        renderProgressNote(state.plan, summary.student);
      });
    });

    if (el.copyNote) {
      el.copyNote.addEventListener("click", function () {
        if (!el.noteText) return;
        var text = String(el.noteText.textContent || "").trim();
        if (!text) return;
        if (navigator.clipboard) navigator.clipboard.writeText(text).catch(function () {});
        setCoachLine("Copied progress note.");
      });
    }

    if (el.shareAllNotes) {
      el.shareAllNotes.addEventListener("click", function () {
        if (!state.plan || !state.plan.progressNoteTemplate) return;
        var n = state.plan.progressNoteTemplate;
        var text = [
          "Teacher Note",
          n.teacher || "",
          "",
          "Family Update",
          n.family || "",
          "",
          "Team Update",
          n.team || ""
        ].join("\n");
        if (navigator.clipboard) navigator.clipboard.writeText(text).catch(function () {});
        setCoachLine("Copied teacher/family/team update block.");
      });
    }

    if (el.shareSummary) {
      el.shareSummary.addEventListener("click", function () {
        if (!state.selectedId) return;
        openShareModal(state.selectedId);
        setCoachLine("Share summary ready.");
      });
    }
    if (el.shareQuickCopy) {
      el.shareQuickCopy.addEventListener("click", function () {
        if (!state.selectedId) return;
        var payload = buildSharePayload(state.selectedId);
        copyText(payload.text || "", function () {
          if (!navigator.clipboard) {
            openShareModal(state.selectedId);
            setCoachLine("Clipboard unavailable. Summary opened for manual copy.");
            return;
          }
          setCoachLine("Summary copied.");
        });
      });
    }
    if (el.shareQuickPacket) {
      el.shareQuickPacket.addEventListener("click", function () {
        if (!state.selectedId || !SupportStore || typeof SupportStore.exportReferralPacket !== "function") return;
        var packet = SupportStore.exportReferralPacket(state.selectedId);
        download("mdt-packet-" + state.selectedId + ".html", packet.html, "text/html");
        setCoachLine("MDT packet exported.");
      });
    }
    if (el.shareLink) {
      el.shareLink.addEventListener("click", function () {
        if (!state.selectedId) return;
        var buildId = getCurrentBuildId();
        var link = appendStudentParam("./teacher-dashboard.html", state.selectedId);
        var url = new URL(link, window.location.href);
        if (buildId) url.searchParams.set("v", buildId);
        copyText(url.toString(), function () {
          if (!navigator.clipboard) {
            if (el.sharePreview) el.sharePreview.value = url.toString();
            if (el.shareModal) el.shareModal.classList.remove("hidden");
            setCoachLine("Link ready in modal for manual copy.");
            return;
          }
          setCoachLine("Share link copied.");
        });
      });
    }

    if (el.shareModalClose) {
      el.shareModalClose.addEventListener("click", closeShareModal);
    }
    if (el.shareModal) {
      el.shareModal.addEventListener("click", function (event) {
        if (event.target === el.shareModal) closeShareModal();
      });
    }
    if (el.shareCopy) {
      el.shareCopy.addEventListener("click", function () {
        var text = state.sharePayload && state.sharePayload.text ? state.sharePayload.text : "";
        if (!text) return;
        if (navigator.clipboard) navigator.clipboard.writeText(text).catch(function () {});
        setCoachLine("Copied share summary.");
      });
    }
    if (el.shareDownloadJson) {
      el.shareDownloadJson.addEventListener("click", function () {
        if (!state.sharePayload || !state.sharePayload.json) return;
        var sid = state.selectedId || "student";
        download("student-summary-" + sid + ".json", JSON.stringify(state.sharePayload.json, null, 2), "application/json");
        setCoachLine("Downloaded share summary JSON.");
      });
    }
    if (el.shareDownloadCsv) {
      el.shareDownloadCsv.addEventListener("click", function () {
        if (!state.sharePayload || !state.sharePayload.csv) return;
        var sid = state.selectedId || "student";
        download("student-summary-" + sid + ".csv", state.sharePayload.csv, "text/csv");
        setCoachLine("Downloaded share summary CSV.");
      });
    }

    if (el.openMeetingNotes) {
      el.openMeetingNotes.addEventListener("click", function () {
        if (!state.selectedId) return;
        openMeetingModal();
      });
    }
    if (el.meetingClose) {
      el.meetingClose.addEventListener("click", closeMeetingModal);
    }
    if (el.meetingModal) {
      el.meetingModal.addEventListener("click", function (event) {
        if (event.target === el.meetingModal) closeMeetingModal();
      });
    }
    if (el.meetingType) {
      el.meetingType.addEventListener("change", function () {
        openMeetingModal();
      });
    }
    if (el.meetingFormatButtons && el.meetingFormatButtons.length) {
      el.meetingFormatButtons.forEach(function (btn) {
        btn.addEventListener("click", function () {
          state.meetingFormat = String(btn.getAttribute("data-meeting-format") || "sas");
          el.meetingFormatButtons.forEach(function (item) {
            item.classList.toggle("is-active", item === btn);
          });
          renderMeetingOutput();
        });
      });
    }
    if (el.meetingLanguage) {
      el.meetingLanguage.addEventListener("change", function () {
        state.meetingLanguage = String(el.meetingLanguage.value || "en");
        renderMeetingOutput();
      });
    }
    if (el.meetingLiveTranslate) {
      el.meetingLiveTranslate.addEventListener("change", function () {
        state.liveTranslate = !!el.meetingLiveTranslate.checked;
        renderMeetingOutput();
      });
    }
    if (el.meetingNotes) {
      el.meetingNotes.addEventListener("input", function () {
        if (state.liveTranslate) renderMeetingOutput();
      });
    }
    if (el.meetingActions) {
      el.meetingActions.addEventListener("input", function () {
        if (state.liveTranslate) renderMeetingOutput();
      });
    }
    if (el.meetingSave) {
      el.meetingSave.addEventListener("click", function () {
        if (!state.selectedId || !SupportStore || typeof SupportStore.addMeeting !== "function") return;
        renderMeetingOutput();
        var canonicalEnglish = String(el.meetingPreview && el.meetingPreview.value || "").trim();
        var translatedOutput = String(el.meetingTranslationPreview && el.meetingTranslationPreview.value || "").trim();
        var meetingLanguage = getMeetingLanguage();
        var sttBanner = "Local-only notes. No audio recordings are stored by Cornerstone MTSS.";
        SupportStore.addMeeting(state.selectedId, {
          type: el.meetingType ? String(el.meetingType.value || "SSM") : "SSM",
          date: new Date().toISOString().slice(0, 10),
          attendees: "",
          agenda: (el.meetingNotes && el.meetingNotes.value || "").slice(0, 3000),
          notes: canonicalEnglish.slice(0, 3000),
          notesRaw: (el.meetingNotes && el.meetingNotes.value || "").slice(0, 3000),
          format: state.meetingFormat || "sas",
          language: meetingLanguage,
          translatedFromEnglish: meetingLanguage !== "en",
          translatedNotes: meetingLanguage !== "en" ? translatedOutput.slice(0, 3000) : "",
          liveTranslateMode: !!state.liveTranslate,
          decisions: "",
          actionItems: MeetingNotes && typeof MeetingNotes.toActionItems === "function"
            ? MeetingNotes.toActionItems(el.meetingActions && el.meetingActions.value || "")
            : [],
          sttNotice: sttBanner
        });
        renderSupportHub(state.selectedId);
        closeMeetingModal();
        setCoachLine("Meeting notes saved (local-first).");
      });
    }
    if (el.meetingSttStart) {
      el.meetingSttStart.addEventListener("click", function () {
        if (!MeetingNotes || typeof MeetingNotes.createRecognizer !== "function") {
          updateMeetingSttStatus("Speech recognition unavailable. Manual notes mode is active.", "warn");
          return;
        }
        stopMeetingRecognition();
        state.meetingRecognizer = MeetingNotes.createRecognizer({
          onStatus: function (status) {
            if (status === "live") {
              updateMeetingSttStatus("Listening... transcription is local to this browser session.", "live");
              if (el.meetingSttStart) el.meetingSttStart.disabled = true;
              if (el.meetingSttStop) el.meetingSttStop.disabled = false;
              return;
            }
            updateMeetingSttStatus("Transcription stopped. Manual editing remains available.");
            if (el.meetingSttStart) el.meetingSttStart.disabled = !(MeetingNotes && MeetingNotes.supportsSpeechRecognition && MeetingNotes.supportsSpeechRecognition());
            if (el.meetingSttStop) el.meetingSttStop.disabled = true;
          },
          onTranscript: function (snippet) {
            if (!snippet) return;
            insertAtCursor((el.meetingNotes && el.meetingNotes.value ? " " : "") + snippet + " ");
          },
          onError: function (reason) {
            updateMeetingSttStatus("Transcription error: " + reason + ". Continue in manual mode.", "warn");
          }
        });
        if (!state.meetingRecognizer) {
          updateMeetingSttStatus("Speech recognition unavailable. Manual notes mode is active.", "warn");
          return;
        }
        state.meetingRecognizer.start();
      });
    }
    if (el.meetingSttStop) {
      el.meetingSttStop.addEventListener("click", function () {
        stopMeetingRecognition();
        updateMeetingSttStatus("Transcription stopped. Manual notes mode is active.");
      });
    }
    if (el.meetingStamp) {
      el.meetingStamp.addEventListener("click", function () {
        var stamp = "[" + new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) + "] ";
        insertAtCursor(stamp);
      });
    }
    if (el.meetingTagStudent) {
      el.meetingTagStudent.addEventListener("click", function () {
        if (!state.selectedId) return;
        insertAtCursor("[Student:" + state.selectedId + "] ");
      });
    }
    if (el.meetingTagTier) {
      el.meetingTagTier.addEventListener("click", function () {
        var tier = (el.metricTier && el.metricTier.textContent || "").match(/Tier\s*\d/) ? (el.metricTier.textContent.match(/Tier\s*\d/) || ["Tier 2"])[0] : "Tier 2";
        insertAtCursor("[" + tier + "] ");
      });
    }
    if (el.meetingCopySummary) {
      el.meetingCopySummary.addEventListener("click", function () {
        renderMeetingOutput();
        var text = buildMeetingClipboardSummary();
        if (navigator.clipboard) navigator.clipboard.writeText(text).catch(function () {});
        setCoachLine("Meeting summary copied.");
      });
    }
    if (el.meetingExportMdt) {
      el.meetingExportMdt.addEventListener("click", function () {
        if (!state.selectedId || !SupportStore || typeof SupportStore.buildMdtExport !== "function") return;
        renderMeetingOutput();
        var english = String(el.meetingPreview && el.meetingPreview.value || "").trim();
        var translated = String(el.meetingTranslationPreview && el.meetingTranslationPreview.value || "").trim();
        var lang = getMeetingLanguage();
        var exportMode = el.meetingExportFormat ? String(el.meetingExportFormat.value || "english") : "english";
        var exportText = exportMode === "english" ? english : buildMeetingClipboardSummary();
        var exportHtml = buildMeetingExportHtml(exportMode, english, translated, lang);
        var bundle = SupportStore.buildMdtExport(state.selectedId, {
          summary: exportText
        });
        download("mdt-export-" + state.selectedId + ".json", JSON.stringify(bundle.json, null, 2), "application/json");
        download("mdt-export-" + state.selectedId + ".csv", bundle.csv, "text/csv");
        download("meeting-summary-" + state.selectedId + ".html", exportHtml, "text/html");
        if (navigator.clipboard) navigator.clipboard.writeText(bundle.csv).catch(function () {});
        setCoachLine("MDT export generated and CSV copied.");
      });
    }
    if (el.meetingGoals) {
      el.meetingGoals.addEventListener("click", function () {
        if (!state.selectedId || !SupportStore || typeof SupportStore.addGoal !== "function") return;
        var actions = MeetingNotes && typeof MeetingNotes.toActionItems === "function"
          ? MeetingNotes.toActionItems(el.meetingActions && el.meetingActions.value || "")
          : [];
        var goals = MeetingNotes && typeof MeetingNotes.toDraftGoals === "function"
          ? MeetingNotes.toDraftGoals(actions)
          : [];
        goals.forEach(function (goal) { SupportStore.addGoal(state.selectedId, goal); });
        state.activeSupportTab = "plan";
        renderSupportHub(state.selectedId);
        setCoachLine("Converted action items to SMART-goal drafts.");
      });
    }

    if (el.sasLibraryBtn) {
      el.sasLibraryBtn.addEventListener("click", function () {
        openSasLibraryModal();
      });
    }
    if (el.sasLibraryClose) {
      el.sasLibraryClose.addEventListener("click", closeSasLibraryModal);
    }
    if (el.sasLibraryModal) {
      el.sasLibraryModal.addEventListener("click", function (event) {
        if (event.target === el.sasLibraryModal) closeSasLibraryModal();
      });
    }
    if (el.sasSearch) {
      el.sasSearch.addEventListener("input", function () {
        renderSasLibraryResults();
      });
    }
    if (Array.isArray(el.sasTabs)) {
      el.sasTabs.forEach(function (tabBtn) {
        tabBtn.addEventListener("click", function () {
          state.sasTab = String(tabBtn.getAttribute("data-sas-tab") || "interventions");
          renderSasLibraryResults();
        });
      });
    }
    if (el.sasApplyPlan) {
      el.sasApplyPlan.addEventListener("click", function () {
        applySelectedSasItemToPlan();
      });
    }

    if (el.exportStudentCsv) {
      el.exportStudentCsv.addEventListener("click", function () {
        if (!state.selectedId || !window.CSEvidence || typeof window.CSEvidence.exportStudentCSV !== "function") return;
        var csv = window.CSEvidence.exportStudentCSV(state.selectedId);
        if (navigator.clipboard) navigator.clipboard.writeText(csv).catch(function () {});
        setCoachLine("Copied student session CSV.");
      });
    }

    el.exportJson.addEventListener("click", function () {
      var id = state.selectedId || (state.caseload[0] && state.caseload[0].id) || "demo-student";
      var jsonPayload = (window.CSEvidence && typeof window.CSEvidence.exportStudentJSON === "function")
        ? window.CSEvidence.exportStudentJSON(id)
        : JSON.stringify(Evidence.exportStudentSnapshot(id).json, null, 2);
      download("student-summary-" + id + ".json", jsonPayload, "application/json");
      setCoachLine("Exported student summary JSON.");
    });

    el.copyCsv.addEventListener("click", function () {
      var csv = Evidence.rosterCSV();
      if (navigator.clipboard) navigator.clipboard.writeText(csv).catch(function () {});
      setCoachLine("Copied roster CSV.");
    });

    if (el.copySummary) {
      el.copySummary.addEventListener("click", function () {
        if (!state.selectedId) return;
        var summary = Evidence.getStudentSummary(state.selectedId);
        var text = [
          summary.student.name + " (" + summary.student.id + ")",
          "Focus: " + summary.focus,
          "Recommended next step: " + summary.nextMove.line
        ].join("\n");
        if (navigator.clipboard) navigator.clipboard.writeText(text).catch(function () {});
        setCoachLine("Copied family/admin summary.");
      });
    }

    if (Array.isArray(el.supportTabs)) {
      el.supportTabs.forEach(function (tab) {
        tab.addEventListener("click", function () {
          state.activeSupportTab = String(tab.getAttribute("data-support-tab") || "snapshot");
          renderSupportHub(state.selectedId);
        });
      });
    }

    if (el.supportExportPacket) {
      el.supportExportPacket.addEventListener("click", function () {
        if (!state.selectedId || !SupportStore || typeof SupportStore.exportReferralPacket !== "function") return;
        var packet = SupportStore.exportReferralPacket(state.selectedId);
        download("referral-packet-" + state.selectedId + ".html", packet.html, "text/html");
        setCoachLine("Exported referral-ready evidence packet.");
      });
    }

    if (el.showAlignment) {
      el.showAlignment.addEventListener("change", function () {
        renderInstructionalSequencer(state.selectedId);
      });
    }

    if (el.openStudentDrawer) {
      el.openStudentDrawer.addEventListener("click", function () {
        if (!state.selectedId || !el.drawer) return;
        el.drawer.classList.remove("hidden");
        renderDrawer(state.selectedId);
      });
    }
    if (el.drawerClose) {
      el.drawerClose.addEventListener("click", function () {
        if (el.drawer) el.drawer.classList.add("hidden");
      });
    }
    if (Array.isArray(el.drawerTabs)) {
      el.drawerTabs.forEach(function (tab) {
        tab.addEventListener("click", function () {
          state.activeDrawerTab = String(tab.getAttribute("data-drawer-tab") || "snapshot");
          renderDrawer(state.selectedId);
        });
      });
    }
    if (el.meetingModeBtn) {
      el.meetingModeBtn.addEventListener("click", function () {
        if (!state.selectedId) return;
        openMeetingModal();
      });
    }
    if (el.generateSummaryBtn) {
      el.generateSummaryBtn.addEventListener("click", function () {
        if (!state.selectedId) return;
        openReportModal();
      });
    }
    if (el.reportClose) {
      el.reportClose.addEventListener("click", closeReportModal);
    }
    if (el.reportModal) {
      el.reportModal.addEventListener("click", function (event) {
        if (event.target === el.reportModal) closeReportModal();
      });
    }
    if (el.reportLanguage) {
      el.reportLanguage.addEventListener("change", function () {
        renderReportPreview();
      });
    }
    if (el.reportCopy) {
      el.reportCopy.addEventListener("click", function () {
        if (!state.reportDraft) return;
        var lang = el.reportLanguage ? String(el.reportLanguage.value || "en") : "en";
        var report = ReportingGenerator && typeof ReportingGenerator.translateReport === "function"
          ? ReportingGenerator.translateReport(state.reportDraft, lang)
          : state.reportDraft;
        var text = buildReportText(report, lang);
        if (navigator.clipboard) navigator.clipboard.writeText(text).catch(function () {});
        setCoachLine("Meeting summary copied to clipboard.");
      });
    }
    if (el.reportDownloadPdf) {
      el.reportDownloadPdf.addEventListener("click", function () {
        if (!state.reportDraft) return;
        var lang = el.reportLanguage ? String(el.reportLanguage.value || "en") : "en";
        var report = ReportingGenerator && typeof ReportingGenerator.translateReport === "function"
          ? ReportingGenerator.translateReport(state.reportDraft, lang)
          : state.reportDraft;
        var text = buildReportText(report, lang);
        var sid = state.selectedId || "student";
        download("meeting-summary-" + sid + ".pdf.txt", text, "text/plain");
        setCoachLine("PDF export stub downloaded as text payload.");
      });
    }
    if (el.tier1PackBtn) {
      el.tier1PackBtn.addEventListener("click", function () {
        if (!state.selectedId || !SupportStore) return;
        var concerns = window.prompt("Concern area(s) comma-separated", "Reading, Writing");
        var duration = window.prompt("Intervention duration", "6 weeks");
        var frequency = window.prompt("Frequency", "3x/week");
        var notes = window.prompt("Tier 1 notes", "");
        var packet = SupportStore.buildTier1EvidencePack(state.selectedId, {
          domains: String(concerns || "Reading").split(",").map(function (s) { return s.trim(); }).filter(Boolean),
          duration: duration || "6 weeks",
          frequency: frequency || "3x/week",
          notes: notes || ""
        });
        download("tier1-evidence-pack-" + state.selectedId + ".html", packet.html, "text/html");
        if (navigator.clipboard) {
          navigator.clipboard.writeText(packet.text || ("Tier 1 Evidence Pack ready for " + state.selectedId + ".")).catch(function () {});
        }
        setCoachLine("Tier 1 Evidence Pack exported.");
      });
    }

    el.quickLaunchButtons.forEach(function (button) {
      button.addEventListener("click", function () {
        var target = String(button.getAttribute("data-quick") || "").trim();
        if (!target) return;
        recordLastActivity(currentStudentParam(), target);
        window.location.href = appendStudentParam("./" + target + ".html");
      });
    });

    if (el.todayRefresh) {
      el.todayRefresh.addEventListener("click", function () {
        state.todayPlan = buildTodayPlan();
        renderTodayEngine(state.todayPlan);
        updateAuditMarkers();
        setCoachLine("Today plan refreshed.");
      });
    }

    if (el.priorityReview) {
      el.priorityReview.addEventListener("click", function () {
        if (el.todayRoot && typeof el.todayRoot.scrollIntoView === "function") {
          el.todayRoot.scrollIntoView({ behavior: "smooth", block: "start" });
        }
      });
    }

    if (el.viewAllStudents) {
      el.viewAllStudents.addEventListener("click", function () {
        if (el.list && typeof el.list.scrollIntoView === "function") {
          el.list.scrollIntoView({ behavior: "smooth", block: "start" });
        }
      });
    }

    if (el.todayGroupOpen) {
      el.todayGroupOpen.addEventListener("click", function () {
        if (el.todayGroupBuild) el.todayGroupBuild.disabled = false;
        if (el.groupPanel) el.groupPanel.open = true;
        renderFlexGroups(state.todayPlan && state.todayPlan.students ? state.todayPlan.students : []);
        setCoachLine("Group selection ready. Pick 2-4 students, then build the shared plan.");
      });
    }

    if (el.todayGroupBuild) {
      el.todayGroupBuild.addEventListener("click", function () {
        renderFlexGroups(state.todayPlan && state.todayPlan.students ? state.todayPlan.students : []);
        setCoachLine("Group plan v1 generated from shared skills and cadence signals.");
      });
    }

    if (el.numGradeSelect) {
      el.numGradeSelect.addEventListener("change", function () {
        if (el.numUnitSelect) el.numUnitSelect.value = "";
        if (el.numLessonSelect) el.numLessonSelect.value = "";
        syncNumeracyCurriculumSelectors();
      });
    }
    if (el.numUnitSelect) {
      el.numUnitSelect.addEventListener("change", function () {
        if (el.numLessonSelect) el.numLessonSelect.value = "";
        syncNumeracyCurriculumSelectors();
      });
    }
    if (el.numLessonSelect) {
      el.numLessonSelect.addEventListener("change", function () {
        renderNumeracyAlignmentLine();
      });
    }

    el.emptyActions.forEach(function (button) {
      button.addEventListener("click", function () {
        var action = button.getAttribute("data-empty-action");
        if (action === "add") return addStudentQuick();
        if (action === "import") return handleImportExport();
        if (action === "demo") {
          ensureDemoCaseload();
          refreshCaseload();
          return;
        }
      });
    });
  }

  Evidence.init();
  detectDemoMode();
  bootstrapSkillStore();
  refreshBuildLine();
  seedFromCaseloadStore();
  ensureDemoCaseload();
  primeDemoMetrics();
  refreshCaseload();
  bindEvents();
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
    try {
      var sid = new URLSearchParams(window.location.search).get("student");
      if (sid) return sid;
    } catch (_e) {}
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
