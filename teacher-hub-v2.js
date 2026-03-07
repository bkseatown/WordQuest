/**
 * teacher-hub-v2.js — Context-first Teacher Hub runtime
 *
 * Responsibility surface:
 *   - Bootstrap HubState + HubContext
 *   - Load + render student caseload
 *   - Handle student selection → writes to HubState → HubContext auto-computes
 *   - Subscribe to intelligence changes → render focus card
 *   - Search filtering
 *   - Demo mode seeding
 */
(function teacherHubV2() {
  "use strict";

  /* ── Dependency guard ──────────────────────────────────── */

  var Evidence             = window.CSEvidence;
  var PlanEngine           = window.CSPlanEngine;
  var TierEngine           = window.CSTierEngine;
  var ExecutiveProfileEngine = window.CSExecutiveProfile;
  var ExecutiveSupportEngine = window.CSExecutiveSupportEngine;
  var SupportStore         = window.CSSupportStore;
  var TeacherRuntimeState  = window.CSTeacherRuntimeState;
  var TeacherSearchIndex   = window.CSTeacherSearchIndex;
  var TeacherSearchService = window.CSTeacherSearchService;
  var TeacherSelectors     = window.CSTeacherSelectors;
  var TeacherIntelligence  = window.CSTeacherIntelligence;
  var TeacherContextEngine = window.CSTeacherContextEngine;
  var LessonCompanion      = window.CSLessonCompanion;
  var InstantInsight       = window.CSInstantInsightOverlay;
  var GameContextInjection = window.CSGameContextInjection;
  var HubContext           = window.CSHubContext;
  var TeacherStorage       = window.CSTeacherStorage;

  if (!Evidence || !TeacherRuntimeState) return;

  /* ── URL params ────────────────────────────────────────── */

  var urlParams = (function () {
    try { return new URLSearchParams(window.location.search || ""); }
    catch (_e) { return { get: function () { return null; } }; }
  })();

  var isDemoMode = urlParams.get("demo") === "1" || urlParams.get("audit") === "1";
  // Persist demo flag — dev servers (serve, python) drop query params on redirect
  if (isDemoMode) {
    try { localStorage.setItem("cs.hub.demo", "1"); } catch (_e) {}
  } else {
    try { isDemoMode = localStorage.getItem("cs.hub.demo") === "1"; } catch (_e) {}
  }
  var initialStudentId = urlParams.get("student") || "";

  /* ── Hub state ─────────────────────────────────────────── */

  var hubState = TeacherRuntimeState.create({
    session: {
      role: urlParams.get("role") || "teacher",
      demoMode: isDemoMode
    },
    workspace_context: {
      mode: "hub"
    }
  });

  /* ── Local state (caseload + filter) ───────────────────── */

  var caseload = [];
  var filtered = [];
  var searchResults = null;
  var searchService = null;

  /* ── DOM refs ──────────────────────────────────────────── */

  var el = {
    sidebar:     document.getElementById("th2-sidebar"),
    sidebarCtx:  document.getElementById("th2-sidebar-context"),
    search:      document.getElementById("th2-search"),
    list:        document.getElementById("th2-list"),
    listEmpty:   document.getElementById("th2-list-empty"),
    listNone:    document.getElementById("th2-list-none"),
    modeTabs:    Array.prototype.slice.call(document.querySelectorAll(".th2-mode-tab")),
    main:        document.getElementById("th2-main"),
    emptyState:  document.getElementById("th2-empty-state"),
    focusCard:   document.getElementById("th2-focus-card"),
    demoBadge:   document.getElementById("th2-demo-badge")
  };

  /* ── Utilities ─────────────────────────────────────────── */

  function safe(fn) {
    try { return fn(); } catch (_e) { return null; }
  }

  function getStudentSummaryForHub(studentId, fallbackStudent) {
    return TeacherIntelligence && typeof TeacherIntelligence.getStudentSummary === "function"
      ? TeacherIntelligence.getStudentSummary(studentId, fallbackStudent, {
          Evidence: Evidence,
          TeacherSelectors: TeacherSelectors
        })
      : safe(function () { return Evidence.getStudentSummary(studentId); });
  }

  function buildStudentContextForHub(student) {
    return TeacherIntelligence && typeof TeacherIntelligence.buildStudentContext === "function"
      ? TeacherIntelligence.buildStudentContext(student, {
          Evidence: Evidence,
          PlanEngine: PlanEngine,
          TeacherSelectors: TeacherSelectors
        })
      : {
          student: student,
          summary: safe(function () { return Evidence.getStudentSummary(student.id); }),
          snapshot: safe(function () {
            return typeof Evidence.computeStudentSnapshot === "function"
              ? Evidence.computeStudentSnapshot(student.id) : null;
          }),
          plan: null,
          priority: null
        };
  }

  /* ── Performance level rubric (Phase 16+) ───────────────── */
  /* 4-level school rubric: Exemplary / Meeting / Approaching / Emerging
   * Maps onto MTSS tiers: T1 ≈ Meeting, T2 ≈ Approaching, T3 ≈ Emerging
   * IMPORTANT: tier data-* attributes stay numeric (1/2/3); only labels change. */
  var TIER_LABELS  = { 1: "Meeting", 2: "Approaching", 3: "Emerging" };
  function tierLabel(t) { return TIER_LABELS[t] || ("Tier " + t); }

  /* Standalone 4-level rubric (1=Emerging … 4=Exemplary) used for subject goals */
  var LEVEL_LABELS = { 4: "Exemplary", 3: "Meeting", 2: "Approaching", 1: "Emerging" };
  function levelLabel(n) { return LEVEL_LABELS[Number(n)] || ("Level " + n); }

  /* Domains tracked per student */
  var DOMAINS = [
    { key: "reading",  label: "Reading / ELA" },
    { key: "math",     label: "Math"           },
    { key: "writing",  label: "Writing"        },
    { key: "behavior", label: "Behavior / SEL" }
  ];

  /* Support plan types — stored on student, shown only in View Details */
  var PLAN_TYPES = ["IESP", "IP", "IAP", "BIP", "504"];

  /* ── Goal storage helpers ────────────────────────────────── */
  /* Goals: { [studentId]: [{domain, skill, level (1-4)}] }
   * Subject- and goal-specific performance levels per student. */
  var GOALS_KEY = "cs.goals.v1";
  function getStudentGoals(sid) {
    try { return JSON.parse(localStorage.getItem(GOALS_KEY) || "{}")[sid] || []; }
    catch (_e) { return []; }
  }
  function saveStudentGoals(sid, goals) {
    try {
      var all = JSON.parse(localStorage.getItem(GOALS_KEY) || "{}");
      all[sid] = goals;
      localStorage.setItem(GOALS_KEY, JSON.stringify(all));
    } catch (_e) {}
  }
  function getStudentPlans(student) {
    return Array.isArray((student || {}).plans) ? student.plans : [];
  }

  /* ── Toast notifications ─────────────────────────────── */
  var _toastHost = null;
  function showToast(msg, type) {
    if (!_toastHost) {
      _toastHost = document.getElementById("th2-toast-host");
      if (!_toastHost) return;
    }
    var t = document.createElement("div");
    t.className = "th2-toast th2-toast--" + (type || "info");
    t.setAttribute("role", "status");
    t.textContent = msg;
    _toastHost.appendChild(t);
    requestAnimationFrame(function () {
      requestAnimationFrame(function () { t.classList.add("is-visible"); });
    });
    setTimeout(function () {
      t.classList.remove("is-visible");
      t.addEventListener("transitionend", function () {
        if (t.parentNode) t.parentNode.removeChild(t);
      }, { once: true });
    }, 3000);
  }

  /* Deterministic gradient palette from student ID */
  function studentColor(id) {
    var palettes = [
      ["#2b5da8","#4c84d6"], ["#4e8d6a","#7cc69e"],
      ["#7048e8","#9a7ef0"], ["#b58a45","#d4a85e"],
      ["#2b8a78","#4db8a4"], ["#b25e5e","#d4807e"],
      ["#1971c2","#4da6f5"]
    ];
    var n = 0;
    var s = String(id || "");
    for (var i = 0; i < s.length; i++) { n = (n * 31 + s.charCodeAt(i)) & 0x7fffffff; }
    return palettes[n % palettes.length];
  }

  function buildAvatar(name, id, small) {
    var parts = String(name || "?").trim().split(/\s+/);
    var initials = (parts.length >= 2
      ? (parts[0][0] || "") + (parts[parts.length - 1][0] || "")
      : (parts[0] || "?").slice(0, 2)
    ).toUpperCase();
    var c = studentColor(String(id || name || ""));
    var cls = "th2-avatar" + (small ? " th2-avatar--sm" : "");
    return '<span class="' + cls + '" style="background:linear-gradient(135deg,' + c[0] + ',' + c[1] + ')" aria-hidden="true">' + escapeHtml(initials) + '</span>';
  }

  function lastSeenStatus(summary) {
    var ts = summary && summary.lastSession && summary.lastSession.timestamp;
    if (!ts) return "none";
    var days = Math.floor((Date.now() - Number(ts)) / 86400000);
    if (days < 1) return "today";
    if (days < 5) return "recent";
    return "overdue";
  }

  function todayDateStr() {
    var d = new Date();
    var days = ["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"];
    var months = ["January","February","March","April","May","June","July",
                  "August","September","October","November","December"];
    return days[d.getDay()] + " · " + months[d.getMonth()] + " " + d.getDate();
  }

  function greetingWord() {
    var h = new Date().getHours();
    return h < 12 ? "Good morning" : h < 17 ? "Good afternoon" : "Good evening";
  }

  function clampN(v, min, max) {
    var n = Number(v);
    return Number.isFinite(n) ? Math.max(min, Math.min(max, n)) : min;
  }

  function relativeDate(ts) {
    if (!ts) return "";
    var diff = Date.now() - Number(ts);
    var d = Math.floor(diff / 86400000);
    if (d < 1) return "Today";
    if (d === 1) return "Yesterday";
    if (d < 7) return d + " days ago";
    if (d < 30) return Math.floor(d / 7) + "w ago";
    return Math.floor(d / 30) + "mo ago";
  }

  function firstName(value) {
    return String(value || "").trim().split(/\s+/)[0] || "Teacher";
  }

  function escapeHtml(str) {
    return String(str || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function safeJsonParse(raw, fallback) {
    try { return raw ? JSON.parse(raw) : fallback; } catch (_e) { return fallback; }
  }

  function todayKey() {
    var d = new Date();
    return [
      d.getFullYear(),
      String(d.getMonth() + 1).padStart(2, "0"),
      String(d.getDate()).padStart(2, "0")
    ].join("-");
  }

  function getTodayLessonBlocks() {
    if (TeacherStorage && typeof TeacherStorage.migrateLessonBriefBlocks === "function") {
      TeacherStorage.migrateLessonBriefBlocks();
    }
    var rows = TeacherSelectors && typeof TeacherSelectors.loadScheduleBlocks === "function"
      ? TeacherSelectors.loadScheduleBlocks(todayKey(), { TeacherStorage: TeacherStorage })
      : (TeacherStorage && typeof TeacherStorage.loadScheduleBlocks === "function"
        ? TeacherStorage.loadScheduleBlocks(todayKey())
        : []);
    return rows.map(function (row) {
      return {
        id: String(row && row.id || ""),
        label: String(row && row.label || ""),
        timeLabel: String(row && row.timeLabel || ""),
        teacher: String(row && row.teacher || ""),
        subject: String(row && row.subject || areaLabel(row && row.area || "ela")),
        curriculum: String(row && row.curriculum || ""),
        lesson: String(row && row.lesson || ""),
        classSection: String(row && row.classSection || row && row.label || ""),
        notes: String(row && row.notes || ""),
        supportType: String(row && row.supportType || "push-in"),
        area: String(row && row.area || "ela"),
        programId: String(row && row.programId || ""),
        studentIds: Array.isArray(row && row.studentIds) ? row.studentIds.map(String) : [],
        rosterRefs: Array.isArray(row && row.rosterRefs) ? row.rosterRefs.map(String) : []
      };
    }).filter(function (row) { return row.id && row.label; });
  }

  function areaLabel(area) {
    if (area === "math") return "Math";
    if (area === "writing") return "Writing";
    if (area === "humanities") return "Humanities";
    if (area === "intervention") return "Intervention";
    return "ELA";
  }

  function domainKeyForArea(area) {
    if (area === "math") return "math";
    if (area === "writing") return "writing";
    if (area === "behavior") return "behavior";
    return "reading";
  }

  function areaTierLabel(level) {
    var n = Number(level || 0);
    if (n <= 1) return "T3";
    if (n === 2) return "T2";
    return "T1";
  }

  function studentById(studentId) {
    return caseload.find(function (row) { return row.id === studentId; }) || null;
  }

  function studentSupportSnapshot(student, area) {
    var domain = domainKeyForArea(area);
    var goals = getStudentGoals(student && student.id).filter(function (goal) {
      return String(goal && goal.domain || "") === domain;
    });
    var allGoals = getStudentGoals(student && student.id);
    var primaryLevel = goals.length
      ? goals.reduce(function (min, goal) { return Math.min(min, Number(goal.level || 4)); }, 4)
      : 3;
    var primaryGoal = goals[0] && goals[0].skill ? String(goals[0].skill) : "";
    var cross = allGoals.filter(function (goal) {
      return String(goal && goal.domain || "") !== domain && Number(goal && goal.level || 4) <= 2;
    }).reduce(function (chips, goal) {
      var label = areaTierLabel(goal.level) + " " + areaLabel(String(goal.domain || ""));
      if (chips.indexOf(label) < 0) chips.push(label);
      return chips;
    }, []).slice(0, 2);
    var support = SupportStore && typeof SupportStore.getStudent === "function"
      ? (safe(function () { return SupportStore.getStudent(student.id); }) || {})
      : {};
    var accommodations = Array.isArray(support.accommodations) ? support.accommodations.slice(0, 2) : [];
    return {
      primaryTier: areaTierLabel(primaryLevel),
      primaryChip: areaTierLabel(primaryLevel) + " " + areaLabel(area),
      primaryGoal: primaryGoal,
      cross: cross,
      accommodations: accommodations
    };
  }

  function programLabel(programId) {
    var value = String(programId || "");
    if (!value) return "";
    if (value === "fishtank-ela") return "Fishtank ELA";
    if (value === "el-education") return "EL Education ELA";
    if (value === "ufli") return "UFLI Foundations";
    if (value === "fundations") return "Fundations";
    if (value === "just-words") return "Just Words";
    if (value === "haggerty") return "Heggerty";
    if (value === "bridges-math") return "Bridges Math";
    if (value === "step-up-writing") return "Step Up to Writing";
    if (value === "sas-humanities-9") return "SAS Humanities 9";
    return value;
  }

  var HUB_SEARCH_RESOURCES = [
    { id: "tool-wordquest", kind: "tool", label: "Word Quest", subtitle: "Word game activity surface", href: "word-quest.html?play=1" },
    { id: "tool-platform", kind: "tool", label: "Game Platform", subtitle: "Shared runtime for all game surfaces", href: "game-platform.html" },
    { id: "tool-reading", kind: "resource", label: "Reading Lab", subtitle: "Literacy activity", href: "reading-lab.html" },
    { id: "tool-sentence", kind: "resource", label: "Sentence Studio", subtitle: "Sentence support surface", href: "sentence-surgery.html" },
    { id: "tool-writing", kind: "resource", label: "Writing Studio", subtitle: "Writing support surface", href: "writing-studio.html" },
    { id: "tool-numeracy", kind: "intervention", label: "Numeracy", subtitle: "Math intervention surface", href: "numeracy.html" },
    { id: "tool-precision", kind: "intervention", label: "Precision Play", subtitle: "Practice surface", href: "precision-play.html" },
    { id: "tool-diagnostic", kind: "diagnostic", label: "Decoding Diagnostic", subtitle: "Diagnostic activity", href: "activities/decoding-diagnostic.html" },
    { id: "tool-brief", kind: "resource", label: "Lesson Brief", subtitle: "Open class lesson briefing", action: "brief" },
    { id: "tool-curriculum", kind: "resource", label: "Curriculum Quick Reference", subtitle: "Open curriculum supports", action: "curriculum" },
    { id: "tool-workspace", kind: "resource", label: "Reports & Meetings", subtitle: "Weekly insights, meetings, history, and exports", href: "teacher-dashboard.html" }
  ];

  function ensureSearchService() {
    if (searchService) return searchService;
    if (!TeacherSearchService || typeof TeacherSearchService.create !== "function") return null;
    searchService = TeacherSearchService.create({
      TeacherSearchIndex: TeacherSearchIndex,
      getStudentsStore: function () {
        return TeacherStorage && typeof TeacherStorage.loadStudentsStore === "function"
          ? TeacherStorage.loadStudentsStore()
          : {};
      },
      getCaseload: function () {
        return caseload.slice();
      },
      getBlocks: function () {
        return getTodayLessonBlocks();
      },
      getResources: function () {
        return HUB_SEARCH_RESOURCES.slice();
      }
    });
    return searchService;
  }

  function buildSearchResults(query) {
    var q = String(query || "").trim();
    var service = ensureSearchService();
    if (!q || !service) return null;
    return {
      query: String(q).toLowerCase(),
      groups: service.group(q)
    };
  }

  function searchResultCount(results) {
    if (!results) return 0;
    return Object.keys(results.groups || {}).reduce(function (count, key) {
      return count + ((results.groups[key] || []).length);
    }, 0);
  }

  function renderSearchSection(title, items, attr) {
    if (!items || !items.length) return "";
    return [
      '<div class="th2-search-section">',
      '  <p class="th2-search-section-title">' + escapeHtml(title) + "</p>",
      items.map(function (item) {
        return '<button class="th2-search-result" data-search-kind="' + escapeHtml(item.kind) + '" ' + attr + '="' + escapeHtml(item.id) + '" type="button">' +
          '<strong>' + escapeHtml(item.label) + '</strong>' +
          (item.subtitle ? '<span>' + escapeHtml(item.subtitle) + '</span>' : "") +
          "</button>";
      }).join(""),
      "</div>"
    ].join("");
  }

  function classLessonSummary(block) {
    var label = [block.curriculum || programLabel(block.programId), block.lesson].filter(Boolean).join(" · ");
    return label || "Lesson context will appear after you confirm the lesson in Lesson Brief.";
  }

  function classConceptFocus(block) {
    var subject = String(block && block.subject || "").toLowerCase();
    if (subject === "math") return "Keep one representation and one explanation path visible while students solve.";
    if (subject === "writing") return "Anchor students in structure first, then elaboration and sentence clarity.";
    if (subject === "humanities") return "Keep the claim, evidence, and language demand narrow and explicit.";
    if (subject === "intervention") return "Prioritize the highest-leverage target skill and skip already-mastered review.";
    return "Highlight the lesson target, vocabulary, and one support move before the student starts.";
  }

  function classLanguageDemands(block) {
    var subject = String(block && block.subject || "").toLowerCase();
    if (subject === "math") return "Math vocabulary, explanation frames, and precise compare/explain language.";
    if (subject === "writing") return "Sentence frames, transition words, and verbal rehearsal before writing.";
    if (subject === "humanities") return "Claim/evidence language, annotation talk, and concise analytical sentences.";
    if (subject === "intervention") return "Clear oral modeling, repetition, and short response frames.";
    return "Academic vocabulary, response stems, and text-based explanation language.";
  }

  function accommodationIcons(accommodations) {
    var rows = Array.isArray(accommodations) ? accommodations : [];
    return rows.slice(0, 3).map(function (item) {
      var text = String(item || "");
      var glyph = "•";
      if (/sentence|frame/i.test(text)) glyph = "🗨";
      else if (/visual|model|graphic/i.test(text)) glyph = "◫";
      else if (/read|audio|repeat/i.test(text)) glyph = "🔊";
      else if (/break|check|chunk|timer/i.test(text)) glyph = "⏱";
      return '<span class="th2-class-accommodation-icon" title="' + escapeHtml(text) + '" aria-label="' + escapeHtml(text) + '">' + glyph + '</span>';
    }).join("");
  }

  function accommodationBadges(accommodations) {
    var rows = Array.isArray(accommodations) ? accommodations : [];
    return rows.slice(0, 3).map(function (item) {
      var text = String(item || "");
      var label = "SUP";
      if (/sentence|frame/i.test(text)) label = "FR";
      else if (/visual|model|graphic/i.test(text)) label = "VIS";
      else if (/read|audio|repeat/i.test(text)) label = "AUD";
      else if (/break|check|chunk|timer/i.test(text)) label = "CHK";
      return '<span class="th2-support-badge" title="' + escapeHtml(text) + '">' + escapeHtml(label) + "</span>";
    }).join("");
  }

  function countFocusStudents(rows) {
    return (Array.isArray(rows) ? rows : []).filter(function (row) {
      return /^T[23]/.test(String(row && row.supportPriority || ""));
    }).length;
  }

  function getBlockStudents(block) {
    var ids = [];
    if (block && Array.isArray(block.studentIds)) ids = ids.concat(block.studentIds);
    if (block && Array.isArray(block.rosterRefs)) ids = ids.concat(block.rosterRefs);
    return ids.reduce(function (list, id) {
      var sid = String(id || "");
      if (!sid || list.some(function (row) { return row.id === sid; })) return list;
      var student = studentById(sid);
      if (student) list.push(student);
      return list;
    }, []);
  }

  function buildTeacherContextForBlock(block) {
    if (!block || !TeacherContextEngine || typeof TeacherContextEngine.deriveContext !== "function") return null;
    var classContext = TeacherSelectors && typeof TeacherSelectors.buildClassContext === "function"
      ? TeacherSelectors.buildClassContext(block, { TeacherStorage: TeacherStorage })
      : null;
    var lessonContext = classContext && classContext.lessonContextId && TeacherSelectors && typeof TeacherSelectors.getLessonContext === "function"
      ? TeacherSelectors.getLessonContext(classContext.lessonContextId, { TeacherStorage: TeacherStorage })
      : null;
    var source = {
      block: block,
      classContext: classContext,
      lessonContext: lessonContext,
      students: getBlockStudents(block),
      studentIds: (block.studentIds || block.rosterRefs || []).slice(),
      mode: hubState.get().context.mode === "class" ? "small-group" : ""
    };
    var derived = TeacherContextEngine.deriveContext(source, {
      TeacherStorage: TeacherStorage,
      TeacherSelectors: TeacherSelectors,
      SupportStore: SupportStore
    });
    var companion = LessonCompanion && typeof LessonCompanion.getLessonCompanion === "function"
      ? LessonCompanion.getLessonCompanion(source, {
          TeacherStorage: TeacherStorage,
          TeacherSelectors: TeacherSelectors,
          SupportStore: SupportStore
        })
      : null;
    var insight = InstantInsight && typeof InstantInsight.getInstantInsight === "function"
      ? InstantInsight.getInstantInsight(source, {
          TeacherStorage: TeacherStorage,
          TeacherSelectors: TeacherSelectors,
          SupportStore: SupportStore
        })
      : null;
    return {
      block: block,
      classContext: classContext,
      lessonContext: lessonContext,
      derived: derived,
      companion: companion,
      insight: insight
    };
  }

  function getRecommendedGameActions(contextData) {
    var derived = contextData && contextData.derived ? contextData.derived : {};
    var subject = String(derived.subject || "").toLowerCase();
    var games;
    if (subject === "math") {
      games = [
        { id: "concept-ladder", label: "Launch Clue Climb" },
        { id: "error-detective", label: "Launch Fix-It Detective" },
        { id: "word-connections", label: "Launch Say It Another Way" }
      ];
    } else if (subject === "intervention" || subject === "ela") {
      games = [
        { id: "word-quest", label: "Launch Word Quest" },
        { id: "morphology-builder", label: "Launch Word Forge" },
        { id: "sentence-builder", label: "Launch Sentence Sprint" }
      ];
    } else if (subject === "writing") {
      games = [
        { id: "sentence-builder", label: "Launch Sentence Sprint" },
        { id: "word-connections", label: "Launch Say It Another Way" },
        { id: "rapid-category", label: "Launch Category Rush" }
      ];
    } else {
      games = [
        { id: "word-quest", label: "Launch Word Quest" },
        { id: "word-connections", label: "Launch Say It Another Way" },
        { id: "concept-ladder", label: "Launch Clue Climb" }
      ];
    }
    return games.map(function (game) {
      var payload = GameContextInjection && typeof GameContextInjection.buildGameContext === "function"
        ? GameContextInjection.buildGameContext({
            block: contextData.block,
            classContext: contextData.classContext,
            lessonContext: contextData.lessonContext,
            students: getBlockStudents(contextData.block),
            studentIds: derived.studentIds || []
          }, {
            TeacherStorage: TeacherStorage,
            TeacherSelectors: TeacherSelectors,
            SupportStore: SupportStore
          })
        : {};
      var recommendation = GameContextInjection && typeof GameContextInjection.getRecommendedGameContent === "function"
        ? GameContextInjection.getRecommendedGameContent(game.id, payload)
        : { loadedFocus: derived.targetSkills || [] };
      return {
        label: game.label,
        href: appendContextParamsForBlock("game-platform.html?game=" + encodeURIComponent(game.id), contextData),
        subtitle: (recommendation.loadedFocus || []).slice(0, 2).join(" • ") || "Context-aligned practice"
      };
    });
  }

  function appendContextParamsForBlock(href, contextData) {
    try {
      var url = new URL(String(href || ""), window.location.href);
      var derived = contextData && contextData.derived ? contextData.derived : {};
      var block = contextData && contextData.block ? contextData.block : {};
      if (derived.classId && !url.searchParams.get("classId")) url.searchParams.set("classId", derived.classId);
      if (derived.subject && !url.searchParams.get("subject")) url.searchParams.set("subject", derived.subject);
      if (derived.curriculum && !url.searchParams.get("curriculum")) url.searchParams.set("curriculum", derived.curriculum);
      if (derived.lesson && !url.searchParams.get("lesson")) url.searchParams.set("lesson", derived.lesson);
      if (contextData.classContext && contextData.classContext.lessonContextId && !url.searchParams.get("lessonContextId")) {
        url.searchParams.set("lessonContextId", contextData.classContext.lessonContextId);
      }
      if (block.teacher && !url.searchParams.get("teacher")) url.searchParams.set("teacher", block.teacher);
      url.searchParams.set("from", "hub");
      return url.pathname.replace(/^\//, "") + (url.search || "") + (url.hash || "");
    } catch (_err) {
      return appendGameContextParams(href);
    }
  }

  function renderCommandHeader(contextData, blocks) {
    var derived = contextData && contextData.derived ? contextData.derived : {};
    var teacherName = TeacherStorage && typeof TeacherStorage.loadTeacherProfile === "function"
      ? firstName(TeacherStorage.loadTeacherProfile().name)
      : "Teacher";
    var nextBlock = (Array.isArray(blocks) ? blocks : [])[0] || contextData.block || null;
    var nextLabel = nextBlock
      ? [nextBlock.timeLabel || nextBlock.label, nextBlock.subject].filter(Boolean).join(" · ")
      : "No block selected yet";
    var priority = derived.prioritySignal && derived.prioritySignal.label
      ? derived.prioritySignal.label
      : "Select a class block to load lesson context and student priorities.";
    return [
      '<section class="th2-command-header">',
      '  <div class="th2-command-header__copy">',
      '    <p class="th2-command-header__eyebrow">Teacher Hub</p>',
      '    <h1 class="th2-command-header__title">' + escapeHtml(greetingWord() + ", " + teacherName) + '</h1>',
      '    <p class="th2-command-header__date">' + escapeHtml(todayDateStr()) + '</p>',
      "  </div>",
      '  <div class="th2-command-header__status">',
      '    <div class="th2-priority-signal th2-priority-signal--' + escapeHtml((derived.prioritySignal && derived.prioritySignal.level) || "steady") + '">',
      '      <span class="th2-priority-signal__label">Priority Signal</span>',
      '      <strong>' + escapeHtml(priority) + '</strong>',
      "    </div>",
      '    <p class="th2-command-header__next">Next block: ' + escapeHtml(nextLabel) + "</p>",
      "  </div>",
      "</section>"
    ].join("");
  }

  function renderDayStrip(blocks, activeBlockId) {
    var rows = Array.isArray(blocks) ? blocks : [];
    return [
      '<section class="th2-day-strip">',
      '  <div class="th2-day-strip__head">',
      '    <p class="th2-section-label">My Day</p>',
      '    <p class="th2-today-sub">Open one block to move into lesson context and student priorities.</p>',
      "  </div>",
      '  <div class="th2-day-strip__grid">',
      rows.map(function (block) {
        var contextData = buildTeacherContextForBlock(block);
        var focusCount = countFocusStudents(contextData && contextData.derived && contextData.derived.students);
        return [
          '<button class="th2-day-block' + (block.id === activeBlockId ? " is-active" : "") + '" data-open-block="' + escapeHtml(block.id) + '" type="button">',
          '  <span class="th2-day-block__time">' + escapeHtml(block.timeLabel || block.label) + "</span>",
          '  <strong class="th2-day-block__subject">' + escapeHtml(block.subject || areaLabel(block.area)) + "</strong>",
          '  <span class="th2-day-block__teacher">' + escapeHtml(block.teacher || "Teacher") + "</span>",
          '  <span class="th2-day-block__lesson">' + escapeHtml(block.curriculum || block.lesson || block.label) + "</span>",
          '  <span class="th2-day-block__meta">' + escapeHtml((block.lesson || "Lesson context loading") + " · " + focusCount + " support") + "</span>",
          "</button>"
        ].join("");
      }).join(""),
      "  </div>",
      "</section>"
    ].join("");
  }

  function renderLessonContextZone(contextData) {
    var derived = contextData && contextData.derived ? contextData.derived : {};
    return [
      '<section class="th2-context-zone th2-context-zone--lesson">',
      '  <p class="th2-section-label">Lesson Context</p>',
      '  <div class="th2-mission-card">',
      '    <p class="th2-mission-card__title">' + escapeHtml((derived.subject || "Subject") + " · " + (derived.curriculum || "Curriculum")) + "</p>",
      '    <h2 class="th2-mission-card__headline">' + escapeHtml([derived.unit, derived.lesson].filter(Boolean).join(" ") || derived.lessonFocus || "Lesson context loading") + "</h2>",
      '    <p class="th2-mission-card__sub">' + escapeHtml(derived.mainConcept || "Lesson focus not fully mapped yet.") + "</p>",
      '    <div class="th2-mission-card__meta">',
      '      <div><span>Teacher</span><strong>' + escapeHtml((contextData.classContext && contextData.classContext.teacher) || contextData.block.teacher || "Not set") + '</strong></div>',
      '      <div><span>Support</span><strong>' + escapeHtml(derived.supportType || contextData.block.supportType || "push-in") + '</strong></div>',
      '      <div><span>Language Demand</span><strong>' + escapeHtml((derived.languageDemands || []).slice(0, 3).join(" • ") || "Explain • compare • justify") + '</strong></div>',
      "    </div>",
      "  </div>",
      "</section>"
    ].join("");
  }

  function renderCompanionZone(contextData) {
    var data = contextData && contextData.companion ? contextData.companion : {};
    var groups = Array.isArray(data.flexibleGroups) ? data.flexibleGroups : [];
    return [
      '<section class="th2-context-zone th2-context-zone--companion">',
      '  <p class="th2-section-label">Smart Lesson Companion</p>',
      '  <div class="th2-companion-panel">',
      '    <div class="th2-companion-panel__top">',
      '      <h2>' + escapeHtml(data.mainConcept || "Lesson focus not fully mapped yet.") + "</h2>",
      '      <div class="th2-chip-row">' + (data.languageDemands || []).map(function (item) {
        return '<span class="th2-chip">' + escapeHtml(item) + "</span>";
      }).join("") + "</div>",
      "    </div>",
      '    <div class="th2-companion-panel__grid">',
      '      <article><h3>Common Misconceptions</h3><ul>' + (data.misconceptions || []).map(function (item) {
        return "<li>" + escapeHtml(item) + "</li>";
      }).join("") + "</ul></article>",
      '      <article><h3>Suggested Support Moves</h3><ul>' + (data.supportMoves || []).map(function (item) {
        return "<li>" + escapeHtml(item) + "</li>";
      }).join("") + "</ul></article>",
      '      <article><h3>Flexible Groups</h3><div class="th2-group-list">' + groups.map(function (group) {
        return '<div class="th2-group-card"><strong>' + escapeHtml(group.label || "Suggested Group") + '</strong><p>' + escapeHtml(group.focus || "Teacher observation check") + '</p><span>' + escapeHtml((group.students || []).join(", ") || "Use live observation to confirm.") + "</span></div>";
      }).join("") + "</div></article>",
      "    </div>",
      "  </div>",
      "</section>"
    ].join("");
  }

  function renderStudentPriorityZone(contextData) {
    var students = contextData && contextData.derived && Array.isArray(contextData.derived.students)
      ? contextData.derived.students
      : [];
    return [
      '<section class="th2-context-zone th2-context-zone--students">',
      '  <p class="th2-section-label">Student Priorities</p>',
      '  <div class="th2-student-priority-list">',
      (students.length ? students.map(function (student) {
        var profileHref = "student-profile.html?student=" + encodeURIComponent(student.studentId || "") + "&from=hub";
        return [
          '<a class="th2-priority-row" data-context-student="' + escapeHtml(student.studentId) + '" href="' + escapeHtml(profileHref) + '">',
          '  <div class="th2-priority-row__main">',
          '    <div class="th2-priority-row__title"><strong>' + escapeHtml(student.name) + '</strong><span class="th2-class-chip th2-class-chip--primary">' + escapeHtml(student.supportPriority || "T1") + "</span></div>",
          '    <p class="th2-priority-row__goal">' + escapeHtml(student.primaryGoal || "Priority still forming from available data.") + "</p>",
          '    <div class="th2-class-chip-row">' + (student.relatedSupport || []).map(function (item) {
            return '<span class="th2-class-chip">' + escapeHtml(item) + "</span>";
          }).join("") + "</div>",
          "  </div>",
          '  <div class="th2-priority-row__side">',
          '    <div class="th2-support-badges">' + accommodationBadges(student.accommodations) + "</div>",
          '    <span class="th2-priority-row__trend">' + escapeHtml((student.trendSummary && student.trendSummary.label) || "Steady") + "</span>",
          "  </div>",
          "</a>"
        ].join("");
      }).join("") : '<p class="th2-today-sub">No students assigned to this block yet.</p>'),
      "  </div>",
      "</section>"
    ].join("");
  }

  function renderQuickAccessRail(contextData) {
    var actions = getRecommendedGameActions(contextData);
    return [
      '<section class="th2-quick-rail">',
      '  <div class="th2-quick-rail__primary">',
      '    <p class="th2-section-label">Quick Access</p>',
      '    <div class="th2-quick-actions">',
      '      <button class="th2-quick-action th2-quick-action--brief" data-open-brief="1" data-open-brief-block="' + escapeHtml(contextData.block && contextData.block.id || "") + '" type="button"><strong>Open Lesson Brief</strong><span>Update lesson context and supports from this block.</span></button>',
      actions.map(function (action) {
        return '<a class="th2-quick-action" href="' + escapeHtml(action.href) + '"><strong>' + escapeHtml(action.label) + '</strong><span>' + escapeHtml(action.subtitle) + "</span></a>";
      }).join(""),
      '      <a class="th2-quick-action" href="' + escapeHtml("teacher-dashboard.html") + '"><strong>Open Reports</strong><span>Weekly insights, meeting prep, history, and exports.</span></a>',
      "    </div>",
      "  </div>",
      '  <div class="th2-quick-rail__secondary">',
      '    <p class="th2-section-label">Secondary Quick Access</p>',
      '    <div class="th2-secondary-grid">',
      '      <article class="th2-secondary-card"><h3>My Caseload</h3><p>' + escapeHtml(String(caseload.length) + " students in active caseload") + "</p></article>",
      '      <article class="th2-secondary-card"><h3>Recent Students</h3><p>' + escapeHtml(caseload.slice(0, 3).map(function (row) { return row.name; }).join(", ") || "No recent students yet.") + "</p></article>",
      '      <article class="th2-secondary-card"><h3>Upcoming Meetings</h3><p>Reports &amp; Meetings handles meeting prep and communication drafts.</p></article>',
      "    </div>",
      "  </div>",
      "</section>"
    ].join("");
  }

  function buildFirstRunContext() {
    var block = {
      id: "demo-first-run",
      label: "ELA Intervention",
      timeLabel: "9:00 – 9:45",
      teacher: "Ms. Rivera",
      subject: "Intervention",
      curriculum: "UFLI Foundations",
      lesson: "Unit 5 · Lesson 12",
      classSection: "ELA Intervention",
      supportType: "small-group",
      area: "ela",
      programId: "ufli",
      studentIds: [],
      rosterRefs: []
    };
    return {
      block: block,
      classContext: { teacher: "Ms. Rivera", lessonContextId: "" },
      lessonContext: null,
      derived: {
        subject: "Intervention",
        curriculum: "UFLI Foundations",
        unit: "Unit 5",
        lesson: "Lesson 12",
        lessonFocus: "Closed Syllable Exceptions",
        mainConcept: "Distinguish closed syllable exceptions (ild, ind, old, olt, ost) from standard closed syllable patterns",
        languageDemands: ["Explain", "compare", "apply"],
        supportType: "small-group",
        prioritySignal: {
          label: "2 students need targeted support · Lesson ready",
          level: "watch"
        },
        students: [
          {
            studentId: "demo-s1",
            name: "Maya R.",
            supportPriority: "T2",
            primaryGoal: "Accurate decoding of closed syllable exceptions in connected text",
            relatedSupport: ["Phonics", "Fluency"],
            accommodations: ["ext", "vis"],
            trendSummary: { label: "Improving" }
          },
          {
            studentId: "demo-s2",
            name: "Liam T.",
            supportPriority: "T3",
            primaryGoal: "Build phonemic awareness of long vowel sounds before syllable instruction",
            relatedSupport: ["Phonics", "Decoding"],
            accommodations: ["eal", "vis"],
            trendSummary: { label: "Watch" }
          },
          {
            studentId: "demo-s3",
            name: "Sofia K.",
            supportPriority: "T2",
            primaryGoal: "Transfer vowel team knowledge to multisyllabic reading",
            relatedSupport: ["Fluency"],
            accommodations: ["eal"],
            trendSummary: { label: "Steady" }
          }
        ],
        studentIds: [],
        targetSkills: ["LIT.DEC.SYLL"]
      },
      companion: {
        mainConcept: "Closed Syllable Exceptions — when the vowel goes long",
        languageDemands: ["Explain", "compare", "apply"],
        misconceptions: [
          "Students assume all CVC patterns have a short vowel (e.g., reading 'find' as /fĭnd/).",
          "Confusion between ild/ind vs. standard closed syllable words.",
          "EAL students may over-generalise spelling patterns from first language."
        ],
        supportMoves: [
          "Word sort: closed exception vs. standard closed syllable.",
          "Build a pattern anchor wall entry for ild, ind, old, olt, ost.",
          "Use sentence frames: 'This word has a long vowel because…'"
        ],
        flexibleGroups: [
          { label: "Guided Phonics", focus: "Closed exception words with teacher modelling", students: ["Maya R.", "Liam T."] },
          { label: "Independent Practice", focus: "Apply pattern in decodable text", students: ["Sofia K."] }
        ]
      },
      insight: null
    };
  }

  function renderFirstRunBanner() {
    return [
      '<div class="th2-firstrun-banner" role="note">',
      '  <span>Sample class shown — open <strong>Lesson Brief</strong> to add your real class blocks and unlock full context.</span>',
      '  <button class="th2-firstrun-banner__btn" data-open-brief="1" type="button">Set up my classes</button>',
      "</div>"
    ].join("");
  }

  function renderCommandCenter(activeBlock, options) {
    if (!el.emptyState) return;
    var blocks = getTodayLessonBlocks();
    var block = activeBlock || blocks[0] || null;
    if (!block) {
      var seedCtx = buildFirstRunContext();
      var seedBlock = seedCtx.block;
      el.emptyState.innerHTML = [
        '<div class="th2-command-center">',
        renderFirstRunBanner(),
        renderCommandHeader(seedCtx, [seedBlock]),
        '<section class="th2-active-context">',
        '  <div class="th2-active-context__grid">',
        renderStudentPriorityZone(seedCtx),
        renderCompanionZone(seedCtx),
        "  </div>",
        "</section>",
        "</div>"
      ].join("");
      return;
    }
    var contextData = buildTeacherContextForBlock(block);
    el.emptyState.innerHTML = [
      '<button class="th2-back-to-schedule" data-back-to-schedule="1" type="button">← Today\'s schedule</button>',
      '<div class="th2-command-center">',
      renderCommandHeader(contextData, blocks),
      renderDayStrip(blocks, block.id),
      '<section class="th2-active-context">',
      '  <div class="th2-active-context__grid">',
      renderLessonContextZone(contextData),
      renderCompanionZone(contextData),
      renderStudentPriorityZone(contextData),
      "  </div>",
      "</section>",
      renderQuickAccessRail(contextData),
      "</div>"
    ].join("");

    if (el.sidebarCtx) {
      var signal = contextData.derived && contextData.derived.prioritySignal
        ? contextData.derived.prioritySignal
        : { label: "Select a block to load context." };
      el.sidebarCtx.classList.add("th2-sidebar-ctx");
      el.sidebarCtx.innerHTML =
        '<p class="th2-sidebar-date">' + todayDateStr() + '</p>' +
        '<p class="th2-sidebar-urgency">' + escapeHtml(signal.label) + "</p>";
    }
  }

  /* ── Sparkline ─────────────────────────────────────────── */

  function buildSparkPath(points) {
    if (!Array.isArray(points) || points.length < 2) return "";
    var vals = points.map(Number).filter(Number.isFinite);
    if (vals.length < 2) return "";
    var max = Math.max.apply(null, vals);
    var min = Math.min.apply(null, vals);
    var range = Math.max(1, max - min);
    var W = 100, H = 26, pad = 3;
    var pts = vals.map(function (v, i) {
      var x = (i / (vals.length - 1)) * W;
      var y = H - pad - ((v - min) / range) * (H - pad * 2);
      return x.toFixed(1) + "," + y.toFixed(1);
    });
    return "M" + pts.join(" L");
  }

  /* ── Tier derivation (lightweight, for student list) ────── */

  function quickTier(summary) {
    var spark = Array.isArray(summary && summary.last7Sparkline) ? summary.last7Sparkline : [];
    if (!spark.length) return 2;
    var recent = spark.slice(-3);
    var avg = recent.reduce(function (s, v) { return s + clampN(v, 0, 100); }, 0) / recent.length;
    if (avg >= 78) return 1;
    if (avg >= 58) return 2;
    return 3;
  }

  function quickTrend(summary) {
    var spark = Array.isArray(summary && summary.last7Sparkline) ? summary.last7Sparkline : [];
    if (spark.length < 4) return "stable";
    var half = Math.floor(spark.length / 2);
    var early = spark.slice(0, half).reduce(function (s, v) { return s + clampN(v, 0, 100); }, 0) / half;
    var late = spark.slice(half).reduce(function (s, v) { return s + clampN(v, 0, 100); }, 0) / (spark.length - half);
    if (late - early > 6) return "up";
    if (early - late > 6) return "down";
    return "stable";
  }

  /* ── Activity routing (matches v1 pattern) ─────────────── */

  function toActivityHref(launch, studentId) {
    var module = String((launch && launch.module) || "");
    var href = String((launch && launch.href) || "");
    var base;
    if (href) {
      base = href;
    } else if (module === "ReadingLab")     { base = "reading-lab.html"; }
    else if (module === "WritingStudio")    { base = "writing-studio.html"; }
    else if (module === "SentenceStudio")   { base = "sentence-surgery.html"; }
    else if (module.indexOf("Numeracy") === 0) { base = "numeracy.html"; }
    else if (module === "PrecisionPlay")    { base = "precision-play.html"; }
    else                                    { base = "word-quest.html?play=1"; }

    try {
      var u = new URL(base, window.location.href);
      if (studentId) u.searchParams.set("student", studentId);
      u.searchParams.set("from", "hub");
      return appendGameContextParams(u.pathname.replace(/^\//, "") + (u.search || "") + (u.hash || ""));
    } catch (_e) {
      return base + (studentId ? (base.indexOf("?") >= 0 ? "&" : "?") + "student=" + encodeURIComponent(studentId) : "");
    }
  }

  function appendGameContextParams(href) {
    try {
      var url = new URL(String(href || ""), window.location.href);
      var snapshot = hubState && typeof hubState.get === "function" ? hubState.get() : {};
      var context = snapshot && snapshot.context || {};
      var classContext = snapshot && snapshot.active_class_context || {};
      var lessonContext = context.lessonContext || {};
      var studentId = String(context.studentId || "");
      var classId = String(context.classId || classContext.classId || "");
      var lessonContextId = String(classContext.lessonContextId || lessonContext.lessonContextId || "");
      var subject = String((classContext.subject || lessonContext.subject || "")).trim();
      var programId = String((lessonContext.programId || classContext.curriculum || "")).trim();
      var title = String((lessonContext.title || "")).trim();
      if (studentId && !url.searchParams.get("student")) url.searchParams.set("student", studentId);
      if (classId && !url.searchParams.get("classId")) url.searchParams.set("classId", classId);
      if (lessonContextId && !url.searchParams.get("lessonContextId")) url.searchParams.set("lessonContextId", lessonContextId);
      if (subject && !url.searchParams.get("subject")) url.searchParams.set("subject", subject);
      if (programId && !url.searchParams.get("programId")) url.searchParams.set("programId", programId);
      if (title && !url.searchParams.get("lesson")) url.searchParams.set("lesson", title);
      url.searchParams.set("from", "hub");
      return url.pathname.replace(/^\//, "") + (url.search || "") + (url.hash || "");
    } catch (_e) {
      return href;
    }
  }

  /* ── Executive computation (mirrored from v1) ───────────── */

  function buildExecutiveInput(row) {
    var top = row && row.priority && row.priority.topSkills && row.priority.topSkills[0]
      ? row.priority.topSkills[0] : null;
    var need = clampN(top && top.need || 0.45, 0, 1);
    var sid = row && row.student ? String(row.student.id || "") : "";
    var ef = SupportStore && typeof SupportStore.getExecutiveFunction === "function" && sid
      ? safe(function () { return SupportStore.getExecutiveFunction(sid); })
      : null;
    var focusHistory = Array.isArray(ef && ef.focusHistory) ? ef.focusHistory : [];
    var lowFocus = focusHistory.filter(function (item) {
      return String(item && item.selfRating || "").toLowerCase() === "struggled";
    }).length;
    return {
      taskCompletionRate: clampN(1 - need - (lowFocus * 0.03), 0, 1),
      assignmentMissingCount: Math.max(0, Math.round(need * 8)),
      initiationDelay: Math.max(1, Math.round((need * 12) + 2)),
      teacherObservations: need >= 0.65
        ? "Task initiation and planning delays observed."
        : "Moderate organizational support needed."
    };
  }

  function computeExecutiveForHub(row) {
    var input = buildExecutiveInput(row);
    var profile = ExecutiveProfileEngine && typeof ExecutiveProfileEngine.generateExecutiveProfile === "function"
      ? safe(function () { return ExecutiveProfileEngine.generateExecutiveProfile(input); })
      : { executiveRiskLevel: "MODERATE", primaryBarrier: "Planning", suggestedSupports: [] };
    if (!profile) profile = { executiveRiskLevel: "MODERATE", primaryBarrier: "Planning", suggestedSupports: [] };
    var gradeBand = row && row.student ? String(row.student.grade || row.student.gradeBand || "G5") : "G5";
    var plan = ExecutiveSupportEngine && typeof ExecutiveSupportEngine.generateExecutiveSupportPlan === "function"
      ? safe(function () {
          return ExecutiveSupportEngine.generateExecutiveSupportPlan({
            executiveRiskLevel: profile.executiveRiskLevel,
            primaryBarrier: profile.primaryBarrier,
            gradeBand: gradeBand
          });
        })
      : { weeklyGoal: "Complete 4 tasks with supports.", dailySupportActions: [] };
    return { profile: profile, plan: plan || {} };
  }

  /* ── Today plan builder (class-level) ──────────────────── */

  function buildTodayPlanForHub() {
    var students = caseload.length ? caseload : [];
    var rows = students.map(function (student) {
      return buildStudentContextForHub(student);
    });
    return { students: rows };
  }

  /* ── Support panel ─────────────────────────────────────── */

  function renderSupportPanel(studentId) {
    var studentSupport = SupportStore && typeof SupportStore.getStudent === "function"
      ? (safe(function () { return SupportStore.getStudent(studentId); }) || {})
      : {};
    var needs = Array.isArray(studentSupport.needs) ? studentSupport.needs.slice(0, 3) : [];

    var needsHtml = needs.length
      ? needs.map(function (n) {
          return '<li class="th2-need-item"><span class="th2-need-dot"></span>' + escapeHtml(n.label || n.name || "Need") + "</li>";
        }).join("")
      : '<li class="th2-need-item" style="color:var(--text-muted)">No needs captured yet</li>';

    return [
      '<div class="th2-support">',
      '  <div class="th2-support-head">',
      '    <span class="th2-support-kicker">Support context</span>',
      '  </div>',
      '  <ul class="th2-need-list">' + needsHtml + '</ul>',
      '  <div class="th2-fidelity-row">',
      '    <button class="th2-btn-log" id="th2-log-session" type="button">Mark session complete</button>',
      '    <span class="th2-log-status" id="th2-log-status"></span>',
      '  </div>',
      '</div>'
    ].join("\n");
  }

  /* ── Curriculum alignment ──────────────────────────────── */

  /* Condensed goal-bank data — mirrors data/goalBank.literacy.json
     (embedded inline to avoid a fetch() round-trip) */
  var GOAL_BANK = [
    {
      domain: "literacy.decoding",
      keywords: ["decod","phonics","cvc","vowel","blend","digraph","trigraph","word read","phoneme"],
      skill: "Word-level decoding",
      smart: "Within 6 weeks, student will decode grade-level targets at 85% accuracy across 3 consecutive probes.",
      monitor: "Weekly 10-word probe",
      gradeBand: "K–2"
    },
    {
      domain: "literacy.fluency",
      keywords: ["fluency","orf","oral reading","reading rate","phrasing","pacing","wcpm"],
      skill: "Oral reading fluency",
      smart: "Within 8 weeks, student will improve ORF by 15 wcpm while sustaining 95% accuracy on weekly probes.",
      monitor: "Weekly 1-minute fluency timing",
      gradeBand: "3–5"
    },
    {
      domain: "literacy.spelling",
      keywords: ["morphol","spelling","word study","inflect","derivat","pattern","suffix","prefix"],
      skill: "Morphology & spelling patterns",
      smart: "Within 6 weeks, student will apply taught morphology patterns at 80% accuracy over 4 consecutive sessions.",
      monitor: "Biweekly morphology check",
      gradeBand: "3–8"
    },
    {
      domain: "literacy.comprehension",
      keywords: ["comprehens","inferenc","main idea","vocabular","text struct","retell","passage"],
      skill: "Reading comprehension",
      smart: "Within 6 weeks, student will correctly answer 80% of literal and inferential comprehension questions on grade-level passages.",
      monitor: "Biweekly passage + question probe",
      gradeBand: "2–8"
    },
    {
      domain: "numeracy.counting",
      keywords: ["count","numer","number sense","sequenc","tens frame","subitiz"],
      skill: "Number sense & counting",
      smart: "Within 6 weeks, student will accurately count, sequence, and represent numbers within grade-level range at 90% accuracy.",
      monitor: "Weekly counting/number probe",
      gradeBand: "K–2"
    },
    {
      domain: "numeracy.operations",
      keywords: ["operat","addition","subtraction","multiplicat","division","fact fluency","calculat","arithmetic"],
      skill: "Fact fluency & operations",
      smart: "Within 6 weeks, student will correctly solve 80% of grade-level computation problems within a timed probe.",
      monitor: "Weekly 2-minute computation probe",
      gradeBand: "2–5"
    },
    {
      domain: "numeracy.reasoning",
      keywords: ["reasoning","problem solv","word problem","strateg","model","equation","algebra"],
      skill: "Mathematical reasoning",
      smart: "Within 8 weeks, student will use a taught problem-solving strategy to correctly model and solve 3 of 4 multi-step word problems.",
      monitor: "Biweekly problem-solving task",
      gradeBand: "3–8"
    }
  ];

  function matchCurriculumGoal(recTitle, module) {
    var haystack = (String(recTitle || "") + " " + String(module || "")).toLowerCase();
    var best = null;
    var bestScore = 0;
    for (var i = 0; i < GOAL_BANK.length; i++) {
      var entry = GOAL_BANK[i];
      var score = 0;
      for (var j = 0; j < entry.keywords.length; j++) {
        if (haystack.indexOf(entry.keywords[j]) >= 0) score++;
      }
      if (score > bestScore) { bestScore = score; best = entry; }
    }
    /* Default: return first literacy entry if nothing matched */
    return best || GOAL_BANK[0];
  }

  /* ── Curriculum alignment data ──────────────────────────
   * Inline copies of data/fishtank-ela-map.json and
   * data/iswordstudy-map.json — embedded to avoid fetch
   * round-trips in this static app.
   */

  /* Module-domain hints for demo / sparse-evidence students.
   * Keyed by student id. Value must match matchCurriculumGoal keywords.
   * These are used as fallback when the plan engine doesn't infer a module. */
  var MODULE_HINT_BY_STUDENT = {
    "demo-noah": "Numeracy",
    "demo-zoe":  "Phonics",
    "demo-liam": "Phonics"
  };

  /* ── F&P (Fountas & Pinnell) reading level badge ──────────
   * Stored in localStorage["cs.hub.fp.{studentId}"] as a
   * single letter A–Z (or null).  Demo students get realistic
   * seed levels so the badge appears without data entry.
   */
  var FP_DEMO_LEVELS = {
    "demo-ava":  "M",   // G3 mid-year on-grade
    "demo-liam": "G",   // G2 slightly below
    "demo-maya": "N",   // G3 on/above grade
    "demo-zoe":  "C"    // G1 early emergent
    /* demo-noah: numeracy focus — no F&P badge */
  };
  var FP_VALID = /^[A-Za-z]$/;

  function getFpLevel(studentId) {
    var lsKey = "cs.hub.fp." + studentId;
    var stored = localStorage.getItem(lsKey);
    if (stored !== null) return stored || null;   // "" means "cleared"
    var demo = FP_DEMO_LEVELS[studentId] || null;
    if (demo) localStorage.setItem(lsKey, demo);  // seed once
    return demo;
  }

  function setFpLevel(studentId, level) {
    localStorage.setItem("cs.hub.fp." + studentId, level ? String(level).toUpperCase().slice(0, 1) : "");
  }

  function renderFpBadge(studentId) {
    var level = getFpLevel(studentId);
    if (!level) return "";
    return '<button class="th2-fp-badge" data-fp-student="' + escapeHtml(studentId) + '" title="F&P Reading Level — click to update" type="button">F&amp;P ' + escapeHtml(level) + '</button>';
  }

  /* ── Tool badges (Words Their Way · Read Naturally · Lexia) ─
   * Stored in localStorage["cs.hub.{tool}.{studentId}"]
   * WtW:   stage abbreviation — E / LNA / WWP / SA / DR
   * RN:    WPM string           e.g. "67"
   * Lexia: level string         e.g. "12"
   */
  var WTW_STAGES = ["E", "LNA", "WWP", "SA", "DR"];
  var WTW_DEMO   = { "demo-zoe": "LNA", "demo-liam": "WWP" };
  var RN_DEMO    = { "demo-maya": "94", "demo-noah": "71" };

  function getToolBadge(studentId, tool) {
    var lsKey = "cs.hub." + tool + "." + studentId;
    var stored = localStorage.getItem(lsKey);
    if (stored !== null) return stored || null;
    // Seed demo values once
    var demo = (tool === "wtw" ? WTW_DEMO : tool === "rn" ? RN_DEMO : {})[studentId] || null;
    if (demo) localStorage.setItem(lsKey, demo);
    return demo;
  }

  function setToolBadge(studentId, tool, value) {
    if (value) localStorage.setItem("cs.hub." + tool + "." + studentId, String(value));
    else        localStorage.removeItem("cs.hub." + tool + "." + studentId);
  }

  function renderToolBadges(studentId) {
    var wtw   = getToolBadge(studentId, "wtw");
    var rn    = getToolBadge(studentId, "rn");
    var lexia = getToolBadge(studentId, "lexia");
    var parts = [];
    if (wtw)   parts.push('<button class="th2-tool-badge th2-tool-badge--wtw" data-tool-badge="wtw" data-tool-student="' + escapeHtml(studentId) + '" title="Words Their Way stage — click to update" type="button">WtW ' + escapeHtml(wtw) + '</button>');
    if (rn)    parts.push('<button class="th2-tool-badge th2-tool-badge--rn" data-tool-badge="rn" data-tool-student="' + escapeHtml(studentId) + '" title="Read Naturally WPM — click to update" type="button">RN ' + escapeHtml(rn) + ' wpm</button>');
    if (lexia) parts.push('<button class="th2-tool-badge th2-tool-badge--lexia" data-tool-badge="lexia" data-tool-student="' + escapeHtml(studentId) + '" title="Lexia level — click to update" type="button">Lexia ' + escapeHtml(lexia) + '</button>');
    parts.push('<button class="th2-tool-add" data-tool-add-student="' + escapeHtml(studentId) + '" title="Set tool levels (WtW · RN · Lexia)" type="button" aria-label="Set tool levels">+</button>');
    return parts.join("");
  }

  /* ── UDL accommodation strip ────────────────────────────────
   * Stored in localStorage["cs.hub.udl.{studentId}"] as JSON
   * array of active chip IDs.
   */
  var UDL_CHIPS = [
    { id: "ext_time",    label: "Extended time" },
    { id: "pref_seat",   label: "Pref. seating" },
    { id: "visual",      label: "Visual supports" },
    { id: "sent_frames", label: "Sentence frames" },
    { id: "reduced",     label: "Reduced load" },
    { id: "manipul",     label: "Manipulatives" },
    { id: "read_aloud",  label: "Read aloud" },
    { id: "calculator",  label: "Calculator" }
  ];

  function getUdlActive(studentId) {
    try { return JSON.parse(localStorage.getItem("cs.hub.udl." + studentId) || "[]"); }
    catch (_) { return []; }
  }

  function setUdlActive(studentId, ids) {
    localStorage.setItem("cs.hub.udl." + studentId, JSON.stringify(ids));
  }

  function renderUdlStrip(studentId) {
    var active = getUdlActive(studentId);
    var html = '<div class="th2-udl-strip" data-udl-student="' + escapeHtml(studentId) + '">';
    // Render active chips
    UDL_CHIPS.forEach(function (c) {
      if (active.indexOf(c.id) !== -1) {
        html += '<button class="th2-udl-chip is-active" data-udl-id="' + c.id +
                '" type="button">' + escapeHtml(c.label) + '</button>';
      }
    });
    // Toggle button
    html += '<button class="th2-udl-toggle" data-udl-toggle="' + escapeHtml(studentId) +
            '" type="button">' + (active.length ? '✎ Accommodations' : '+ Accommodations') + '</button>';
    html += '</div>';
    return html;
  }

  var FISHTANK_GRADES = {
    "K":  { label: "Kindergarten", slug: "kindergarten",
            units: [
              { seq:1, slug:"welcome-to-school",              lessonCount:17, title:"Welcome to School",            anchor:"Community & Belonging"    },
              { seq:2, slug:"noticing-patterns-in-stories",   lessonCount:15, title:"Noticing Patterns in Stories", anchor:"Literary Analysis"         },
              { seq:3, slug:"celebrating-fall",               lessonCount:14, title:"Celebrating Fall",             anchor:"Informational / Science"   },
              { seq:4, slug:"falling-in-love-with-authors",   lessonCount:15, title:"Falling in Love with Authors", anchor:"Author Study"              },
              { seq:5, slug:"winter-wonderland",              lessonCount:12, title:"Winter Wonderland",            anchor:"Informational / Seasons"   },
              { seq:6, slug:"what-is-justice",                lessonCount:16, title:"What is Justice?",             anchor:"Social Studies / Civics"   },
              { seq:7, slug:"exploring-life-cycles",          lessonCount:18, title:"Exploring Life Cycles",        anchor:"Science / Informational"   },
              { seq:8, slug:"reduce-reuse-recycle",           lessonCount:14, title:"Reduce, Reuse, Recycle",       anchor:"Environment / Argument"    }
            ]},
    "1":  { label: "Grade 1", slug: "1st-grade",
            units: [
              { seq:1,  slug:"being-a-good-friend",           lessonCount:20, title:"Being a Good Friend",          anchor:"Social Skills / Narrative"  },
              { seq:2,  slug:"the-seven-continents",          lessonCount:18, title:"The Seven Continents",          anchor:"Social Studies / Info"      },
              { seq:3,  slug:"folktales-around-the-world",    lessonCount:22, title:"Folktales Around the World",    anchor:"Literary Analysis"          },
              { seq:4,  slug:"amazing-animals",               lessonCount:20, title:"Amazing Animals",               anchor:"Science / Informational"    },
              { seq:5,  slug:"love-makes-a-family",           lessonCount:16, title:"Love Makes a Family",           anchor:"Community / Narrative"      },
              { seq:6,  slug:"inspiring-artists-and-musicians",lessonCount:18,title:"Inspiring Artists & Musicians", anchor:"Arts / Biography"           },
              { seq:7,  slug:"making-old-stories-new",        lessonCount:20, title:"Making Old Stories New",        anchor:"Narrative / Retelling"      },
              { seq:8,  slug:"movements-for-equality",        lessonCount:18, title:"Movements for Equality",        anchor:"Social Studies / Civics"    },
              { seq:9,  slug:"the-power-of-reading",          lessonCount:16, title:"The Power of Reading",          anchor:"Literacy / Narrative"       },
              { seq:10, slug:"ancient-egypt",                 lessonCount:20, title:"Ancient Egypt",                 anchor:"History / Informational"    }
            ]},
    "2":  { label: "Grade 2", slug: "2nd-grade",
            units: [
              { seq:1, slug:"exploring-habitats",             lessonCount:22, title:"Exploring Habitats",            anchor:"Science / Informational"    },
              { seq:2, slug:"awesome-insects",                lessonCount:20, title:"Awesome Insects",               anchor:"Science / Informational"    },
              { seq:3, slug:"stories-of-immigration",         lessonCount:24, title:"Stories of Immigration",        anchor:"Social Studies / Narrative" },
              { seq:4, slug:"people-who-changed-the-world",   lessonCount:20, title:"People Who Changed the World",  anchor:"Biography / History"        },
              { seq:5, slug:"inside-the-human-body",          lessonCount:22, title:"Inside the Human Body",         anchor:"Science / Informational"    }
            ]},
    "3":  { label: "Grade 3", slug: "3rd-grade",
            units: [
              { seq:1, slug:"garveys-choice",                 lessonCount:26, title:"Garvey's Choice",               anchor:"Identity / Novel Study",  coreText:"Garvey's Choice"                      },
              { seq:2, slug:"charlottes-web",                 lessonCount:30, title:"Charlotte's Web",               anchor:"Friendship / Novel Study", coreText:"Charlotte's Web"                     },
              { seq:3, slug:"dyamonde-daniel",                lessonCount:24, title:"Dyamonde Daniel",               anchor:"Community / Novel Study",  coreText:"Dyamonde Daniel series"              },
              { seq:4, slug:"ecosystems",                     lessonCount:20, title:"Ecosystems",                    anchor:"Science / Informational"                                                   },
              { seq:5, slug:"american-indians",               lessonCount:22, title:"American Indians",              anchor:"History / Informational"                                                   }
            ]},
    "4":  { label: "Grade 4", slug: "4th-grade",
            units: [
              { seq:1, slug:"taking-a-stand",                 lessonCount:27, title:"Taking a Stand",                anchor:"Character / Novel Study",  coreText:"Shiloh"                               },
              { seq:2, slug:"finding-fortune",                lessonCount:26, title:"Finding Fortune",               anchor:"Adventure / Novel Study",  coreText:"Where the Mountain Meets the Moon"    },
              { seq:3, slug:"believing-in-yourself",          lessonCount:24, title:"Believing in Yourself",         anchor:"Resilience / Novel Study", coreText:"The Wild Book"                        },
              { seq:4, slug:"interpreting-perspectives",      lessonCount:22, title:"Interpreting Perspectives",     anchor:"Mythology / Analysis",     coreText:"Greek Myths"                          },
              { seq:5, slug:"learning-differently",           lessonCount:24, title:"Learning Differently",          anchor:"LD Awareness / Novel",     coreText:"Joey Pigza Swallowed the Key"         },
              { seq:6, slug:"discovering-self",               lessonCount:26, title:"Discovering Self",              anchor:"Identity / Novel Study",   coreText:"Bud, Not Buddy"                       }
            ]},
    "5":  { label: "Grade 5", slug: "5th-grade",
            units: [
              { seq:1, slug:"building-community",             lessonCount:24, title:"Building Community",            anchor:"Community / Novel Study",  coreText:"Seedfolks"                            },
              { seq:2, slug:"exploring-human-rights",         lessonCount:28, title:"Exploring Human Rights",        anchor:"Global Issues / Novel",    coreText:"The Breadwinner"                      },
              { seq:3, slug:"protecting-the-earth",           lessonCount:20, title:"Protecting the Earth",          anchor:"Environment / Argument",   coreText:"Plastic Pollution"                    },
              { seq:4, slug:"young-heroes",                   lessonCount:22, title:"Young Heroes",                  anchor:"Civil Rights / History",   coreText:"Children of the Civil Rights Movement"},
              { seq:5, slug:"friendship-across-boundaries",   lessonCount:24, title:"Friendship Across Boundaries",  anchor:"Identity / Novel Study",   coreText:"Return to Sender"                     }
            ]}
  };
  var FT_BASE = "https://www.fishtanklearning.org/curriculum/ela/";

  /* ── IS Word Study inline data (SAS G3–5) ─────────────── */
  var ISWS_GRADES = {
    "3": { label: "Grade 3",
      semesters: [
        { id:"G3-S1", label:"Semester 1", pageUrl:"https://iswordstudy.wordpress.com/grade-3/quarter-1/", lessons: [
          { n:1,  title:"Word Origins 1 – The Story of English",        docUrl:"https://iswordstudy.wordpress.com/wp-content/uploads/2011/01/word-origins-1-the-story-of-english3.doc" },
          { n:2,  title:"Word Origins 2 – Word Webs",                   docUrl:"https://iswordstudy.wordpress.com/wp-content/uploads/2011/01/word-origins-2-word-webs3.doc" },
          { n:3,  title:"Vowels & Consonants 1 – Vowels",               docUrl:"https://iswordstudy.wordpress.com/wp-content/uploads/2011/01/vowels-and-consonants-1-vowels4.doc" },
          { n:4,  title:"Vowels & Consonants 2 – Long & Short Vowels",  docUrl:"https://iswordstudy.wordpress.com/wp-content/uploads/2011/01/vowels-and-consonants-2-long-and-short-vowels3.doc" },
          { n:5,  title:"Vowels & Consonants 3 – Making Long Vowels",   docUrl:"https://iswordstudy.wordpress.com/wp-content/uploads/2011/01/vowels-and-consonants-3-making-long-vowels2.doc" },
          { n:6,  title:"Vowels & Consonants 4 – Jobs of the Silent -e",docUrl:"https://iswordstudy.wordpress.com/wp-content/uploads/2011/01/vowels-and-consonants-4-jobs-the-silent-e2.doc" },
          { n:7,  title:"Vowels & Consonants 5 – More Long Vowels",     docUrl:"https://iswordstudy.wordpress.com/wp-content/uploads/2011/01/vowels-and-consonants-5-more-long-vowels2.doc" },
          { n:8,  title:"Vowels & Consonants 6 – k, ck, ch, or tch",   docUrl:"https://iswordstudy.wordpress.com/wp-content/uploads/2011/01/vowels-and-consonants-6-c-ck-ch-or-tch2.doc" },
          { n:9,  title:"Vowels & Consonants 7 – wh Words & them/they/their", docUrl:"https://iswordstudy.wordpress.com/wp-content/uploads/2011/01/vowels-and-consonants-7-wh-words-and-the-words-them-they-and-their4.doc" },
          { n:10, title:"Vowels & Consonants 8 & 9 – Homophones",       docUrl:"https://iswordstudy.wordpress.com/wp-content/uploads/2011/01/vowels-and-consonants-8-and-9-homophones2.doc" },
          { n:12, title:"Vowels & Consonants 10 – Base Words Ending f, l, s", docUrl:"https://iswordstudy.wordpress.com/wp-content/uploads/2011/01/vowels-and-consonants-10-base-words-ending-in-f-l-s2.doc" },
          { n:13, title:"Semester 1 – Review Assessment",               docUrl:"https://iswordstudy.wordpress.com/wp-content/uploads/2011/01/semester-1-review-assessment.docx", isAssessment:true }
        ]},
        { id:"G3-S2", label:"Semester 2", pageUrl:"https://iswordstudy.wordpress.com/grade-3/quarter-3/", lessons: [
          { n:1,  title:"Building Words 1 – The Basic Blocks",          docUrl:"https://iswordstudy.wordpress.com/wp-content/uploads/2011/01/semester-2-1-building-blocks.doc" },
          { n:2,  title:"Building Words 2 – Spelling Out",              docUrl:"https://iswordstudy.wordpress.com/wp-content/uploads/2011/01/building-words-2-spelling-out1.doc" },
          { n:3,  title:"Building Words 3 – A Closer Look at Prefixes", docUrl:"https://iswordstudy.wordpress.com/wp-content/uploads/2011/01/building-words-3-a-closer-look-at-prefixes1.doc" },
          { n:4,  title:"Building Words 4 – A Closer Look at Suffixes", docUrl:"https://iswordstudy.wordpress.com/wp-content/uploads/2011/01/building-words-4-a-closer-look-at-suffixes1.doc" },
          { n:5,  title:"Building Words 5 – The Vowel Suffix -ing",     docUrl:"https://iswordstudy.wordpress.com/wp-content/uploads/2011/01/building-words-5-the-scoop-on-the-vowel-suffix-ing2.doc" },
          { n:6,  title:"Building Words 6 – The Suffix -ed",            docUrl:"https://iswordstudy.wordpress.com/wp-content/uploads/2011/01/building-words-6-the-suffix-ed3.doc" },
          { n:7,  title:"Building Words 7 – Compound Words",            docUrl:"https://iswordstudy.wordpress.com/wp-content/uploads/2011/01/building-words-7-compound-words1.doc" },
          { n:8,  title:"Building Words 8 – Base Words Ending in y",    docUrl:"https://iswordstudy.wordpress.com/wp-content/uploads/2011/01/building-words-8-base-words-ending-in-y1.doc" },
          { n:9,  title:"Building Words 9 – Plurals",                   docUrl:"https://iswordstudy.wordpress.com/wp-content/uploads/2011/01/building-words-9-plurals1.doc" },
          { n:10, title:"Building Words 10 – Suffixes -est or -ist",    docUrl:"https://iswordstudy.wordpress.com/wp-content/uploads/2011/01/building-words-10-suffiixes-est-or-ist2.doc" },
          { n:11, title:"Building Words 11 – w and x",                  docUrl:"https://iswordstudy.wordpress.com/wp-content/uploads/2011/01/building-words-11-w-and-x1.doc" },
          { n:12, title:"Building Words 12 – Using a Matrix",           docUrl:"https://iswordstudy.wordpress.com/wp-content/uploads/2011/01/building-words-12-using-a-matrix1.doc" },
          { n:13, title:"Building Words 13 – Using Matrices",           docUrl:"https://iswordstudy.wordpress.com/wp-content/uploads/2011/01/building-words-13-using-matrices3.doc" },
          { n:14, title:"Building Words 14 – Assessment & Review",      docUrl:"https://iswordstudy.wordpress.com/wp-content/uploads/2011/01/assessment-reveiw2.docx", isAssessment:true }
        ]}
      ]},
    "4": { label: "Grade 4",
      semesters: [
        { id:"G4-S1", label:"Semester 1", pageUrl:"https://iswordstudy.wordpress.com/grade-4/quarter-1-2/", lessons: [
          { n:1,  title:"Word Origins 1 & 2 – The Story of English",    docUrl:"https://iswordstudy.wordpress.com/wp-content/uploads/2011/01/word-orgins-1-and-2-the-story-of-english1.doc" },
          { n:3,  title:"Word Origins 3 – Word Webs",                   docUrl:"https://iswordstudy.wordpress.com/wp-content/uploads/2011/01/word-orgins-3-word-webs1.doc" },
          { n:4,  title:"Vowels & Consonants 1 – Vowels",               docUrl:"https://iswordstudy.wordpress.com/wp-content/uploads/2011/01/vowels-and-consonants-1-vowels-1.doc" },
          { n:5,  title:"Vowels & Consonants 2 – Long Vowels",          docUrl:"https://iswordstudy.wordpress.com/wp-content/uploads/2011/01/vowels-and-consonants-2-long-vowels.doc" },
          { n:6,  title:"Vowels & Consonants 3 – Long and Short ea",    docUrl:"https://iswordstudy.wordpress.com/wp-content/uploads/2011/01/vowels-and-consonants-3-long-and-short-ea.doc" },
          { n:7,  title:"Vowels & Consonants 4 – dge or ge",            docUrl:"https://iswordstudy.wordpress.com/wp-content/uploads/2011/01/vowel-and-consonants-4-dge-or-ge.doc" },
          { n:8,  title:"Vowels & Consonants 5 – Phonology of -f",      docUrl:"https://iswordstudy.wordpress.com/wp-content/uploads/2011/01/vowel-and-consonants-5-phonology-of-f.doc" },
          { n:9,  title:"Vowels & Consonants 6 & 7 – Homophones",       docUrl:"https://iswordstudy.wordpress.com/wp-content/uploads/2011/01/vowels-and-consonants-6-7-homophones.doc" },
          { n:11, title:"Vowels & Consonants 8 & 9 – Schwa",            docUrl:"https://iswordstudy.wordpress.com/wp-content/uploads/2011/01/vowels-and-consonants-8-9-schwa.doc" },
          { n:13, title:"Vowels & Consonants Review",                   docUrl:null }
        ]},
        { id:"G4-S2", label:"Semester 2", pageUrl:"https://iswordstudy.wordpress.com/grade-4/quarter-3/", lessons: [
          { n:1,  title:"Building Words 1 – The Building Blocks",        docUrl:"https://iswordstudy.wordpress.com/wp-content/uploads/2011/01/building-words-1-the-building-blocks.doc" },
          { n:2,  title:"Building Words 2 – Consonant Suffixes",         docUrl:"https://iswordstudy.wordpress.com/wp-content/uploads/2011/01/building-words-2-building-with-consonant-suffixes1.doc" },
          { n:3,  title:"Building Words 3 – Building with Prefixes",     docUrl:"https://iswordstudy.wordpress.com/wp-content/uploads/2011/01/building-words-3-building-with-prefixes1.doc" },
          { n:4,  title:"Building Words 4 – Vowel Suffixes",             docUrl:"https://iswordstudy.wordpress.com/wp-content/uploads/2011/01/word-building-4-building-with-vowel-suffixes3.doc" },
          { n:5,  title:"Building Words 5 – Using a Matrix",             docUrl:"https://iswordstudy.wordpress.com/wp-content/uploads/2011/01/word-building-5-using-a-matrix.doc" },
          { n:6,  title:"Building Words 6 – Base Words in Y & Suffix Checker", docUrl:"https://iswordstudy.wordpress.com/wp-content/uploads/2011/01/building-words-6-base-words-ending-in-y-and-learning-to-use-a-suffix-checker.doc" },
          { n:7,  title:"Building Words 7 – Suffixing to Polysyllables", docUrl:"https://iswordstudy.wordpress.com/wp-content/uploads/2011/01/building-words-7-suffixing-to-polysyllables.doc" },
          { n:8,  title:"Building Words 8 – Vowel Suffixes -ion, -ian, -ity", docUrl:"https://iswordstudy.wordpress.com/wp-content/uploads/2011/01/building-words-8-suffixes-ion-ian-ity1.doc" },
          { n:9,  title:"Building Words 9 – Compound Words",             docUrl:"https://iswordstudy.wordpress.com/wp-content/uploads/2011/01/building-words-9-compound-words.doc" },
          { n:10, title:"Building Words 10 & 11 – Plurals 1 and 2",      docUrl:"https://iswordstudy.wordpress.com/wp-content/uploads/2011/01/word-building-10-11-plurals-1-and-2.doc" },
          { n:12, title:"Building Words 12 – Suffix -t instead of -ed",  docUrl:"https://iswordstudy.wordpress.com/wp-content/uploads/2011/01/building-words12-when-to-use-suffix-t-instead-of-ed.doc" },
          { n:13, title:"Building Words 13 – Learning from Prefix dis-", docUrl:"https://iswordstudy.wordpress.com/wp-content/uploads/2011/01/building-words-13-learning-from-the-prefix-dis.docx" },
          { n:14, title:"Building Words 14 – Assessment & Review",       docUrl:"https://iswordstudy.wordpress.com/wp-content/uploads/2011/01/building-words-14-assessments-review.docx", isAssessment:true }
        ]}
      ]},
    "5": { label: "Grade 5",
      semesters: [
        { id:"G5-S1", label:"Semester 1", pageUrl:"https://iswordstudy.wordpress.com/grade-5/quarter-1/", lessons: [
          { n:1,  title:"Word Origins 1 – Origins of the English Language",docUrl:"https://iswordstudy.wordpress.com/wp-content/uploads/2011/01/word-origins-1-origins-of-english-language.doc" },
          { n:2,  title:"Word Origins 2 – Origins of the English Language",docUrl:"https://iswordstudy.wordpress.com/wp-content/uploads/2011/01/word-origins-2-origins-of-english-language.doc" },
          { n:3,  title:"Word Origins 3 – New Words",                    docUrl:"https://iswordstudy.wordpress.com/wp-content/uploads/2011/01/word-origins-3-new-words1.doc" },
          { n:4,  title:"Word Origins 4 – Word Webs and Matrices",        docUrl:"https://iswordstudy.wordpress.com/wp-content/uploads/2011/01/word-origins-4-word-webs-and-matrices.doc" },
          { n:5,  title:"Word Origins 5 – Word Ladders",                  docUrl:"https://iswordstudy.wordpress.com/wp-content/uploads/2011/01/word-origins-5-word-ladders.doc" },
          { n:6,  title:"Vowels & Consonants 1 – Vowel Review",           docUrl:"https://iswordstudy.wordpress.com/wp-content/uploads/2011/01/vowels-and-consonants-1-vowel-review.doc" },
          { n:7,  title:"Vowels & Consonants 2 – Long Vowels Review",     docUrl:"https://iswordstudy.wordpress.com/wp-content/uploads/2011/01/vowels-and-consonants-2-long-vowels-review.doc" },
          { n:8,  title:"Vowels & Consonants 3 & 4 – Schwa",              docUrl:"https://iswordstudy.wordpress.com/wp-content/uploads/2011/01/vowels-and-consonants-3-4-schwa.doc" },
          { n:10, title:"Vowels & Consonants 5 – Homophones",             docUrl:"https://iswordstudy.wordpress.com/wp-content/uploads/2011/01/vowels-and-consonants-5-homophones1.doc" },
          { n:11, title:"Vowels & Consonants 6 – Homographs",             docUrl:"https://iswordstudy.wordpress.com/wp-content/uploads/2011/01/vowels-and-consonants-6-homographs.doc" },
          { n:12, title:"Vowels & Consonants 7 – Portmanteau Words",      docUrl:"https://iswordstudy.wordpress.com/wp-content/uploads/2011/01/vowels-and-consonants-7-portmanteau-words-gr-5.doc" },
          { n:13, title:"Semester 1 – Review Assessment",                 docUrl:"https://iswordstudy.wordpress.com/wp-content/uploads/2011/01/semester-1-end-of-unit-assessment.docx", isAssessment:true }
        ]},
        { id:"G5-S2", label:"Semester 2", pageUrl:"https://iswordstudy.wordpress.com/grade-5/quarter-3/", lessons: [
          { n:1,  title:"Word Building 1 & 2 – The Building Blocks",      docUrl:"https://iswordstudy.wordpress.com/wp-content/uploads/2011/01/word-building-1-2-the-building-blocks.doc" },
          { n:3,  title:"Word Building 3 – Using a Matrix",               docUrl:"https://iswordstudy.wordpress.com/wp-content/uploads/2011/01/word-building-3-using-a-matrix.doc" },
          { n:4,  title:"Word Building 4, 5 & 6 – Prefixes",              docUrl:"https://iswordstudy.wordpress.com/wp-content/uploads/2011/01/word-building-45-6-prefixes1.docx" },
          { n:7,  title:"Word Building 7 – Suffixing to Polysyllabic Base",docUrl:"https://iswordstudy.wordpress.com/wp-content/uploads/2011/01/word-building-7-suffixing-to-polysyllabic-base.doc" },
          { n:8,  title:"Word Building 8 – Base Ending in -y & Suffix Checker",docUrl:"https://iswordstudy.wordpress.com/wp-content/uploads/2011/01/word-building-8-ending-in-y-and-learning-to-use-a-suffix-checker.doc" },
          { n:9,  title:"Word Building 9 – Suffix -or vs. -er",           docUrl:"https://iswordstudy.wordpress.com/wp-content/uploads/2011/01/word-building-9-when-to-use-the-suffix-or-instead-of-er.doc" },
          { n:10, title:"Word Building 10 – Suffix -able or -ible",       docUrl:"https://iswordstudy.wordpress.com/wp-content/uploads/2011/01/word-building-10-when-to-use-the-suffix-able-or-ible.doc" },
          { n:11, title:"Word Building 11 – Plurals",                     docUrl:"https://iswordstudy.wordpress.com/wp-content/uploads/2011/01/word-building-11-plurals.doc" },
          { n:12, title:"Word Building 12 – Plurals 2",                   docUrl:"https://iswordstudy.wordpress.com/wp-content/uploads/2011/01/word-building-12-plurals-2.doc" },
          { n:13, title:"Assessment & Review",                            docUrl:null, isAssessment:true }
        ]}
      ]}
  };

  /* ── UFLI Foundations inline data (K–2 phonics) ─────────
   * 128 lessons in 13 range-groups. Range URLs are stable
   * on the UFLI toolbox; individual lesson deep links 404.
   */
  var UFLI_GROUPS = [
    { id:"A", label:"Alphabet",                  start:1,   end:34,  focus:"Letter formation, sound-symbol correspondences, initial blending" },
    { id:"B", label:"CVC & Consonant Blends",    start:35,  end:41,  focus:"Short vowels a/i/o/u/e, consonant blends" },
    { id:"C", label:"Consonant Digraphs",        start:42,  end:53,  focus:"FLOSS rule, ck, sh, th, ch, wh, ph, ng, nk" },
    { id:"D", label:"VCe — Silent E",            start:54,  end:62,  focus:"Long vowel-consonant-e patterns" },
    { id:"E", label:"Reading Longer Words",      start:63,  end:68,  focus:"-es, -ed, -ing, open/closed syllables, compound words" },
    { id:"F", label:"Special Patterns",          start:69,  end:76,  focus:"tch, dge, short vowel exceptions, final -y, -le" },
    { id:"G", label:"R-Controlled Vowels",       start:77,  end:83,  focus:"ar, or, ore, er, ir, ur, w+or" },
    { id:"H", label:"Long Vowel Teams",          start:84,  end:88,  focus:"ai/ay, ee/ea/ey, oa/ow/oe, ie" },
    { id:"I", label:"Vowel Teams 2",             start:89,  end:94,  focus:"oo (book/moon), ew/ui/ue, aw/au" },
    { id:"J", label:"Diphthongs & Silent Letters",start:95,  end:98,  focus:"Diphthongs, kn-, wr-, -mb" },
    { id:"K", label:"Suffixes & Prefixes",       start:99,  end:106, focus:"-es, -ed, -ing, -er, -est, -ly, -less, -ful, -ion" },
    { id:"L", label:"Advanced Morphology",       start:107, end:118, focus:"Advanced morphological patterns, complex word structures" },
    { id:"M", label:"Extended Affixes",          start:119, end:128, focus:"Additional prefixes/suffixes, morphological mastery" }
  ];
  var UFLI_BASE = "https://ufli.education.ufl.edu/foundations/toolbox/";
  var UFLI_TOTAL = 128;

  function ufliGroupForLesson(n) {
    for (var i = 0; i < UFLI_GROUPS.length; i++) {
      if (n >= UFLI_GROUPS[i].start && n <= UFLI_GROUPS[i].end) return UFLI_GROUPS[i];
    }
    return UFLI_GROUPS[UFLI_GROUPS.length - 1];
  }

  /* ── Illustrative Mathematics K–5 inline data ───────────
   * Confirmed URL pattern (live verified):
   * im.kendallhunt.com/K5/teachers/{gradeSlug}/unit-{u}/lesson-{l}/preparation.html
   */
  var IM_GRADES = {
    "K":  { label:"Kindergarten", slug:"kindergarten",
            units: [
              { u:1, title:"Math in Our World",                       lessonCount:17 },
              { u:2, title:"Numbers 1–10",                            lessonCount:22 },
              { u:3, title:"Flat Shapes All Around Us",               lessonCount:15 },
              { u:4, title:"Understanding Addition and Subtraction",  lessonCount:18 },
              { u:5, title:"Composing and Decomposing Numbers to 10", lessonCount:15 },
              { u:6, title:"Numbers 0–20",                            lessonCount:13 },
              { u:7, title:"Solid Shapes All Around Us",              lessonCount:16 },
              { u:8, title:"Putting It All Together",                 lessonCount:21 }
            ]},
    "1":  { label:"Grade 1", slug:"grade-1",
            units: [
              { u:1, title:"Adding, Subtracting, and Working with Data",   lessonCount:15 },
              { u:2, title:"Addition and Subtraction Story Problems",       lessonCount:22 },
              { u:3, title:"Adding and Subtracting Within 20",             lessonCount:28 },
              { u:4, title:"Numbers to 99",                                lessonCount:23 },
              { u:5, title:"Adding Within 100",                            lessonCount:14 },
              { u:6, title:"Length Measurements Within 120 Units",         lessonCount:17 },
              { u:7, title:"Geometry and Time",                            lessonCount:17 },
              { u:8, title:"Putting It All Together",                      lessonCount:10 }
            ]},
    "2":  { label:"Grade 2", slug:"grade-2",
            units: [
              { u:1, title:"Adding, Subtracting, and Working with Data",   lessonCount:18 },
              { u:2, title:"Adding and Subtracting within 100",            lessonCount:16 },
              { u:3, title:"Measuring Length",                             lessonCount:18 },
              { u:4, title:"Addition and Subtraction on the Number Line",  lessonCount:15 },
              { u:5, title:"Numbers to 1,000",                             lessonCount:14 },
              { u:6, title:"Geometry, Time, and Money",                    lessonCount:21 },
              { u:7, title:"Adding and Subtracting within 1,000",          lessonCount:18 },
              { u:8, title:"Equal Groups",                                 lessonCount:13 },
              { u:9, title:"Putting It All Together",                      lessonCount:13 }
            ]},
    "3":  { label:"Grade 3", slug:"grade-3",
            units: [
              { u:1, title:"Introducing Multiplication",                             lessonCount:21 },
              { u:2, title:"Area and Multiplication",                                lessonCount:15 },
              { u:3, title:"Wrapping Up Addition and Subtraction Within 1,000",      lessonCount:21 },
              { u:4, title:"Relating Multiplication to Division",                    lessonCount:22 },
              { u:5, title:"Fractions as Numbers",                                   lessonCount:18 },
              { u:6, title:"Measuring Length, Time, Liquid Volume, and Weight",      lessonCount:16 },
              { u:7, title:"Two-dimensional Shapes and Perimeter",                   lessonCount:15 },
              { u:8, title:"Putting It All Together",                                lessonCount:15 }
            ]},
    "4":  { label:"Grade 4", slug:"grade-4",
            units: [
              { u:1, title:"Factors and Multiples",                                  lessonCount:8  },
              { u:2, title:"Fraction Equivalence and Comparison",                    lessonCount:17 },
              { u:3, title:"Extending Operations to Fractions",                      lessonCount:20 },
              { u:4, title:"From Hundredths to Hundred-thousands",                   lessonCount:23 },
              { u:5, title:"Multiplicative Comparison and Measurement",              lessonCount:18 },
              { u:6, title:"Multiplying and Dividing Multi-digit Numbers",           lessonCount:25 },
              { u:7, title:"Angles and Angle Measurement",                           lessonCount:16 },
              { u:8, title:"Properties of Two-dimensional Shapes",                   lessonCount:10 },
              { u:9, title:"Putting It All Together",                                lessonCount:12 }
            ]},
    "5":  { label:"Grade 5", slug:"grade-5",
            units: [
              { u:1, title:"Finding Volume",                                                        lessonCount:12 },
              { u:2, title:"Fractions as Quotients and Fraction Multiplication",                    lessonCount:17 },
              { u:3, title:"Multiplying and Dividing Fractions",                                    lessonCount:20 },
              { u:4, title:"Wrapping Up Multiplication and Division with Multi-Digit Numbers",      lessonCount:21 },
              { u:5, title:"Place Value Patterns and Decimal Operations",                           lessonCount:26 },
              { u:6, title:"More Decimal and Fraction Operations",                                  lessonCount:21 },
              { u:7, title:"Shapes on the Coordinate Plane",                                        lessonCount:13 },
              { u:8, title:"Putting It All Together",                                               lessonCount:18 }
            ]}
  };
  var IM_BASE = "https://im.kendallhunt.com/K5/teachers/";

  function buildIMUrl(gradeSlug, unitN, lessonN) {
    return IM_BASE + gradeSlug + "/unit-" + unitN + "/lesson-" + lessonN + "/preparation.html";
  }

  /* ── Lesson navigator — localStorage state ────────────── */
  function lsNavKey(currId, grade)    { return "cs.lessonNav." + currId + "." + grade; }
  function getLessonNavState(currId, grade) {
    try {
      var raw = localStorage.getItem(lsNavKey(currId, grade));
      return raw ? JSON.parse(raw) : null;
    } catch (_e) { return null; }
  }
  function setLessonNavState(currId, grade, state) {
    try { localStorage.setItem(lsNavKey(currId, grade), JSON.stringify(state)); } catch (_e) {}
  }

  /* ── Lesson URL builders ──────────────────────────────── */
  function fishtankGradeKey(gradeBand) {
    if (!gradeBand) return null;
    var s = String(gradeBand).toUpperCase().replace(/\s/g, "");
    if (s === "K" || s === "GK" || s === "KG" || s === "G0") return "K";
    var m = s.match(/(\d)/);
    return m ? m[1] : null;
  }

  function buildFishtankLessonUrl(gradeSlug, unitSlug, lessonN) {
    return FT_BASE + gradeSlug + "/" + unitSlug + "/lesson-" + lessonN + "/";
  }

  /* ── Render: Fishtank lesson navigator ───────────────────
   * Returns HTML string; data-* attrs used for JS binding.
   */
  function renderFishtankNav(gradeKey) {
    var ftGrade = FISHTANK_GRADES[gradeKey];
    if (!ftGrade || !ftGrade.units || !ftGrade.units.length) return "";

    var state = getLessonNavState("fishtank", gradeKey) || { unitIdx: 0, lessonN: 1 };
    var unitIdx  = Math.max(0, Math.min(state.unitIdx  || 0, ftGrade.units.length - 1));
    var unit     = ftGrade.units[unitIdx];
    var lessonN  = Math.max(1, Math.min(state.lessonN || 1, unit.lessonCount));
    var lessonUrl = buildFishtankLessonUrl(ftGrade.slug, unit.slug, lessonN);
    var unitUrl   = FT_BASE + ftGrade.slug + "/" + unit.slug + "/";
    var coreText  = unit.coreText && unit.coreText !== unit.title ? " — " + unit.coreText : "";

    var prevUnitOk = unitIdx > 0;
    var nextUnitOk = unitIdx < ftGrade.units.length - 1;
    var prevLsnOk  = lessonN > 1;
    var nextLsnOk  = lessonN < unit.lessonCount;

    return [
      '<div class="th2-lnav" data-lnav-curr="fishtank" data-lnav-grade="' + escapeHtml(gradeKey) + '">',
      '  <div class="th2-lnav-header">',
      '    <span class="th2-lnav-badge th2-lnav-badge--fishtank">Fishtank ELA</span>',
      '    <span class="th2-lnav-grade">' + escapeHtml(ftGrade.label) + '</span>',
      '    <div class="th2-lnav-unit-nav">',
      '      <button class="th2-lnav-unit-btn" data-lnav-unit-dir="-1" title="Previous unit"' + (prevUnitOk ? '' : ' disabled') + '>‹</button>',
      '      <span class="th2-lnav-unit-label" title="' + escapeHtml(unit.anchor) + '">' + escapeHtml(unit.title) + escapeHtml(coreText) + '</span>',
      '      <button class="th2-lnav-unit-btn" data-lnav-unit-dir="1" title="Next unit"' + (nextUnitOk ? '' : ' disabled') + '>›</button>',
      '    </div>',
      '  </div>',
      '  <div class="th2-lnav-body">',
      '    <button class="th2-lnav-btn" data-lnav-dir="-1" title="Previous lesson"' + (prevLsnOk ? '' : ' disabled') + '>‹</button>',
      '    <div class="th2-lnav-lesson">',
      '      <a class="th2-lnav-lesson-link" href="' + escapeHtml(lessonUrl) + '" target="_blank" rel="noopener">',
      '        Lesson ' + lessonN,
      '      </a>',
      '      <span class="th2-lnav-lesson-of">of ' + unit.lessonCount + '</span>',
      '    </div>',
      '    <button class="th2-lnav-btn" data-lnav-dir="1" title="Next lesson"' + (nextLsnOk ? '' : ' disabled') + '>›</button>',
      '  </div>',
      '  <div class="th2-lnav-unit-link-row">',
      '    <a class="th2-lnav-unit-link" href="' + escapeHtml(unitUrl) + '" target="_blank" rel="noopener">Open full unit</a>',
      '    <button class="th2-lnav-setpos-btn" data-lnav-setpos type="button" title="Set current position">📍 Set position</button>',
      '  </div>',
      '</div>'
    ].join("\n");
  }

  /* ── Render: IS Word Study lesson navigator ───────────── */
  function renderISWSNav(gradeKey) {
    var grade = ISWS_GRADES[gradeKey];
    if (!grade || !grade.semesters || !grade.semesters.length) return "";

    var state   = getLessonNavState("iswordstudy", gradeKey) || { semIdx: 0, lessonIdx: 0 };
    var semIdx  = Math.max(0, Math.min(state.semIdx || 0, grade.semesters.length - 1));
    var sem     = grade.semesters[semIdx];
    var lessons = sem.lessons || [];
    var lessonIdx = Math.max(0, Math.min(state.lessonIdx || 0, lessons.length - 1));
    var lesson  = lessons[lessonIdx] || {};
    var docUrl  = lesson.docUrl || sem.pageUrl;

    var prevSemOk = semIdx > 0;
    var nextSemOk = semIdx < grade.semesters.length - 1;
    var prevLsnOk = lessonIdx > 0;
    var nextLsnOk = lessonIdx < lessons.length - 1;
    var titleShort = lesson.title && lesson.title.length > 52
      ? lesson.title.slice(0, 49) + "…" : (lesson.title || "");

    return [
      '<div class="th2-lnav th2-lnav--isws" data-lnav-curr="iswordstudy" data-lnav-grade="' + escapeHtml(gradeKey) + '">',
      '  <div class="th2-lnav-header">',
      '    <span class="th2-lnav-badge th2-lnav-badge--isws">IS Word Study</span>',
      '    <span class="th2-lnav-grade">' + escapeHtml(grade.label) + '</span>',
      '    <div class="th2-lnav-unit-nav">',
      '      <button class="th2-lnav-unit-btn" data-lnav-sem-dir="-1" title="Previous semester"' + (prevSemOk ? '' : ' disabled') + '>‹</button>',
      '      <span class="th2-lnav-unit-label">' + escapeHtml(sem.label) + '</span>',
      '      <button class="th2-lnav-unit-btn" data-lnav-sem-dir="1" title="Next semester"' + (nextSemOk ? '' : ' disabled') + '>›</button>',
      '    </div>',
      '  </div>',
      '  <div class="th2-lnav-body">',
      '    <button class="th2-lnav-btn" data-lnav-dir="-1" title="Previous lesson"' + (prevLsnOk ? '' : ' disabled') + '>‹</button>',
      '    <div class="th2-lnav-lesson">',
      '      <span class="th2-lnav-lesson-num">Lesson ' + (lessonIdx + 1) + ' of ' + lessons.length + '</span>',
      '      ' + (docUrl
          ? '<a class="th2-lnav-lesson-link" href="' + escapeHtml(docUrl) + '" target="_blank" rel="noopener">' + escapeHtml(titleShort) + '</a>'
          : '<span class="th2-lnav-lesson-nohref">' + escapeHtml(titleShort) + '</span>'),
      '    </div>',
      '    <button class="th2-lnav-btn" data-lnav-dir="1" title="Next lesson"' + (nextLsnOk ? '' : ' disabled') + '>›</button>',
      '  </div>',
      '  <div class="th2-lnav-unit-link-row">',
      '    <a class="th2-lnav-unit-link" href="' + escapeHtml(sem.pageUrl) + '" target="_blank" rel="noopener">Open semester page</a>',
      '    <button class="th2-lnav-setpos-btn" data-lnav-setpos type="button" title="Set current position">📍 Set position</button>',
      '  </div>',
      '</div>'
    ].join("\n");
  }

  /* ── Render: UFLI Foundations navigator ──────────────────
   * Lesson-level URLs 404; links to the range-group toolbox page.
   */
  function renderUFLINav(gradeKey) {
    /* UFLI is for K–2; grade key is used only for localStorage */
    var state   = getLessonNavState("ufli", gradeKey) || { lessonN: 1 };
    var lessonN = Math.max(1, Math.min(state.lessonN || 1, UFLI_TOTAL));
    var group   = ufliGroupForLesson(lessonN);
    var groupUrl = UFLI_BASE + group.start + "-" + group.end + "/";
    var prevOk  = lessonN > 1;
    var nextOk  = lessonN < UFLI_TOTAL;

    return [
      '<div class="th2-lnav th2-lnav--ufli" data-lnav-curr="ufli" data-lnav-grade="' + escapeHtml(gradeKey) + '">',
      '  <div class="th2-lnav-header">',
      '    <span class="th2-lnav-badge th2-lnav-badge--ufli">UFLI Foundations</span>',
      '    <span class="th2-lnav-grade">K–2 Phonics</span>',
      '    <div class="th2-lnav-unit-nav">',
      '      <span class="th2-lnav-unit-label" title="' + escapeHtml(group.focus) + '">' + escapeHtml(group.label) + '</span>',
      '    </div>',
      '  </div>',
      '  <div class="th2-lnav-body">',
      '    <button class="th2-lnav-btn" data-lnav-dir="-1" title="Previous lesson"' + (prevOk ? '' : ' disabled') + '>‹</button>',
      '    <div class="th2-lnav-lesson">',
      '      <a class="th2-lnav-lesson-link" href="' + escapeHtml(groupUrl) + '" target="_blank" rel="noopener">Lesson ' + lessonN + '</a>',
      '      <span class="th2-lnav-lesson-of">of ' + UFLI_TOTAL + '</span>',
      '    </div>',
      '    <button class="th2-lnav-btn" data-lnav-dir="1" title="Next lesson"' + (nextOk ? '' : ' disabled') + '>›</button>',
      '  </div>',
      '  <div class="th2-lnav-unit-link-row">',
      '    <span class="th2-lnav-lesson-focus">' + escapeHtml(group.focus) + '</span>',
      '    <button class="th2-lnav-setpos-btn" data-lnav-setpos type="button" title="Set current lesson">📍 Set position</button>',
      '  </div>',
      '</div>'
    ].join("\n");
  }

  /* ── Render: Illustrative Math navigator ─────────────────
   * Confirmed URL: im.kendallhunt.com/K5/teachers/{gradeSlug}/unit-{u}/lesson-{l}/preparation.html
   */
  function renderIMNav(gradeKey) {
    var imGrade = IM_GRADES[gradeKey];
    if (!imGrade || !imGrade.units || !imGrade.units.length) return "";

    var state    = getLessonNavState("illustrative-math", gradeKey) || { unitIdx: 0, lessonN: 1 };
    var unitIdx  = Math.max(0, Math.min(state.unitIdx || 0, imGrade.units.length - 1));
    var unit     = imGrade.units[unitIdx];
    var lessonN  = Math.max(1, Math.min(state.lessonN || 1, unit.lessonCount));
    var lessonUrl = buildIMUrl(imGrade.slug, unit.u, lessonN);
    var unitUrl   = IM_BASE + imGrade.slug + "/unit-" + unit.u + "/lessons.html";

    var prevUnitOk = unitIdx > 0;
    var nextUnitOk = unitIdx < imGrade.units.length - 1;
    var prevLsnOk  = lessonN > 1;
    var nextLsnOk  = lessonN < unit.lessonCount;

    return [
      '<div class="th2-lnav th2-lnav--im" data-lnav-curr="illustrative-math" data-lnav-grade="' + escapeHtml(gradeKey) + '">',
      '  <div class="th2-lnav-header">',
      '    <span class="th2-lnav-badge th2-lnav-badge--im">IM Math K–5</span>',
      '    <span class="th2-lnav-grade">' + escapeHtml(imGrade.label) + '</span>',
      '    <div class="th2-lnav-unit-nav">',
      '      <button class="th2-lnav-unit-btn" data-lnav-unit-dir="-1" title="Previous unit"' + (prevUnitOk ? '' : ' disabled') + '>‹</button>',
      '      <span class="th2-lnav-unit-label">Unit ' + unit.u + ': ' + escapeHtml(unit.title) + '</span>',
      '      <button class="th2-lnav-unit-btn" data-lnav-unit-dir="1" title="Next unit"' + (nextUnitOk ? '' : ' disabled') + '>›</button>',
      '    </div>',
      '  </div>',
      '  <div class="th2-lnav-body">',
      '    <button class="th2-lnav-btn" data-lnav-dir="-1" title="Previous lesson"' + (prevLsnOk ? '' : ' disabled') + '>‹</button>',
      '    <div class="th2-lnav-lesson">',
      '      <a class="th2-lnav-lesson-link" href="' + escapeHtml(lessonUrl) + '" target="_blank" rel="noopener">Lesson ' + lessonN + '</a>',
      '      <span class="th2-lnav-lesson-of">of ' + unit.lessonCount + '</span>',
      '    </div>',
      '    <button class="th2-lnav-btn" data-lnav-dir="1" title="Next lesson"' + (nextLsnOk ? '' : ' disabled') + '>›</button>',
      '  </div>',
      '  <div class="th2-lnav-unit-link-row">',
      '    <a class="th2-lnav-unit-link" href="' + escapeHtml(unitUrl) + '" target="_blank" rel="noopener">Open unit</a>',
      '    <button class="th2-lnav-setpos-btn" data-lnav-setpos type="button" title="Set current position">📍 Set position</button>',
      '  </div>',
      '</div>'
    ].join("\n");
  }

  /* ── Set-position form builder ───────────────────────────
   * Returns HTML for the inline form injected into the footer row
   * when the teacher clicks "📍 Set position".
   */
  function buildSetPosFormHtml(currId, gradeKey) {
    var html = ['<div class="th2-lnav-setpos-form" data-setpos-form>'];

    if (currId === "fishtank") {
      var ftGrade = FISHTANK_GRADES[gradeKey];
      var cur = getLessonNavState("fishtank", gradeKey) || { unitIdx: 0, lessonN: 1 };
      html.push('<select class="th2-lnav-setpos-select" data-setpos-unit>');
      (ftGrade ? ftGrade.units : []).forEach(function (u, i) {
        html.push('<option value="' + i + '"' + (i === (cur.unitIdx || 0) ? ' selected' : '') + '>Unit ' + u.seq + ': ' + escapeHtml(u.title) + '</option>');
      });
      html.push('</select>');
      html.push('<label class="th2-lnav-setpos-label">Lesson</label>');
      html.push('<input class="th2-lnav-setpos-num" data-setpos-lesson type="number" min="1" max="' + (ftGrade ? ftGrade.units[cur.unitIdx || 0].lessonCount : 99) + '" value="' + (cur.lessonN || 1) + '">');

    } else if (currId === "iswordstudy") {
      var iwGrade = ISWS_GRADES[gradeKey];
      var curIW = getLessonNavState("iswordstudy", gradeKey) || { semIdx: 0, lessonIdx: 0 };
      html.push('<select class="th2-lnav-setpos-select" data-setpos-sem>');
      (iwGrade ? iwGrade.semesters : []).forEach(function (s, i) {
        html.push('<option value="' + i + '"' + (i === (curIW.semIdx || 0) ? ' selected' : '') + '>' + escapeHtml(s.label) + '</option>');
      });
      html.push('</select>');
      var curSemLessons = iwGrade ? (iwGrade.semesters[curIW.semIdx || 0].lessons || []).length : 14;
      html.push('<label class="th2-lnav-setpos-label">Lesson</label>');
      html.push('<input class="th2-lnav-setpos-num" data-setpos-lesson type="number" min="1" max="' + curSemLessons + '" value="' + ((curIW.lessonIdx || 0) + 1) + '">');

    } else if (currId === "ufli") {
      var curUF = getLessonNavState("ufli", gradeKey) || { lessonN: 1 };
      html.push('<label class="th2-lnav-setpos-label">Lesson (1–128)</label>');
      html.push('<input class="th2-lnav-setpos-num" data-setpos-lesson type="number" min="1" max="128" value="' + (curUF.lessonN || 1) + '">');

    } else if (currId === "illustrative-math") {
      var imGr = IM_GRADES[gradeKey];
      var curIM = getLessonNavState("illustrative-math", gradeKey) || { unitIdx: 0, lessonN: 1 };
      html.push('<select class="th2-lnav-setpos-select" data-setpos-unit>');
      (imGr ? imGr.units : []).forEach(function (u, i) {
        html.push('<option value="' + i + '"' + (i === (curIM.unitIdx || 0) ? ' selected' : '') + '>Unit ' + u.u + ': ' + escapeHtml(u.title) + '</option>');
      });
      html.push('</select>');
      html.push('<label class="th2-lnav-setpos-label">Lesson</label>');
      html.push('<input class="th2-lnav-setpos-num" data-setpos-lesson type="number" min="1" max="' + (imGr ? imGr.units[curIM.unitIdx || 0].lessonCount : 99) + '" value="' + (curIM.lessonN || 1) + '">');
    }

    html.push('<button class="th2-lnav-setpos-save" data-setpos-save type="button">Save</button>');
    html.push('<button class="th2-lnav-setpos-cancel" data-setpos-cancel type="button">✕</button>');
    html.push('</div>');
    return html.join("");
  }

  /* ── Bind lesson navigator events ────────────────────────
   * Called after focusCard innerHTML is set.
   * Each .th2-lnav widget re-renders in-place on nav clicks.
   */
  function bindLessonNavEvents(container) {
    if (!container) return;

    container.querySelectorAll(".th2-lnav").forEach(function (navEl) {
      var currId  = navEl.getAttribute("data-lnav-curr")  || "";
      var gradeKey = navEl.getAttribute("data-lnav-grade") || "";

      /* Helper: re-render this specific nav widget */
      function rerender() {
        var html;
        if      (currId === "fishtank")          html = renderFishtankNav(gradeKey);
        else if (currId === "iswordstudy")        html = renderISWSNav(gradeKey);
        else if (currId === "ufli")               html = renderUFLINav(gradeKey);
        else if (currId === "illustrative-math")  html = renderIMNav(gradeKey);
        if (!html) return;
        var tmp = document.createElement("div");
        tmp.innerHTML = html;
        var newEl = tmp.firstElementChild;
        if (newEl && navEl.parentNode) {
          navEl.parentNode.replaceChild(newEl, navEl);
          bindLessonNavEvents(container);
        }
      }

      /* Fishtank + IM: unit prev/next ‹ › */
      navEl.querySelectorAll("[data-lnav-unit-dir]").forEach(function (btn) {
        btn.addEventListener("click", function () {
          var dir = parseInt(btn.getAttribute("data-lnav-unit-dir"), 10) || 0;
          if (currId === "fishtank") {
            var ftGrade = FISHTANK_GRADES[gradeKey];
            if (!ftGrade) return;
            var st = getLessonNavState("fishtank", gradeKey) || { unitIdx: 0, lessonN: 1 };
            setLessonNavState("fishtank", gradeKey, { unitIdx: Math.max(0, Math.min((st.unitIdx || 0) + dir, ftGrade.units.length - 1)), lessonN: 1 });
          } else if (currId === "illustrative-math") {
            var imGr = IM_GRADES[gradeKey];
            if (!imGr) return;
            var stIM = getLessonNavState("illustrative-math", gradeKey) || { unitIdx: 0, lessonN: 1 };
            setLessonNavState("illustrative-math", gradeKey, { unitIdx: Math.max(0, Math.min((stIM.unitIdx || 0) + dir, imGr.units.length - 1)), lessonN: 1 });
          }
          rerender();
        });
      });

      /* IS Word Study: semester prev/next */
      navEl.querySelectorAll("[data-lnav-sem-dir]").forEach(function (btn) {
        btn.addEventListener("click", function () {
          var dir   = parseInt(btn.getAttribute("data-lnav-sem-dir"), 10) || 0;
          var grade = ISWS_GRADES[gradeKey];
          if (!grade) return;
          var state = getLessonNavState("iswordstudy", gradeKey) || { semIdx: 0, lessonIdx: 0 };
          setLessonNavState("iswordstudy", gradeKey, { semIdx: Math.max(0, Math.min((state.semIdx || 0) + dir, grade.semesters.length - 1)), lessonIdx: 0 });
          rerender();
        });
      });

      /* Lesson prev/next ‹ › — all curricula */
      navEl.querySelectorAll("[data-lnav-dir]").forEach(function (btn) {
        btn.addEventListener("click", function () {
          var dir = parseInt(btn.getAttribute("data-lnav-dir"), 10) || 0;

          if (currId === "fishtank") {
            var ftGrade = FISHTANK_GRADES[gradeKey];
            if (!ftGrade) return;
            var st = getLessonNavState("fishtank", gradeKey) || { unitIdx: 0, lessonN: 1 };
            var unitIdx = Math.max(0, Math.min(st.unitIdx || 0, ftGrade.units.length - 1));
            setLessonNavState("fishtank", gradeKey, { unitIdx: unitIdx, lessonN: Math.max(1, Math.min((st.lessonN || 1) + dir, ftGrade.units[unitIdx].lessonCount)) });

          } else if (currId === "iswordstudy") {
            var gData = ISWS_GRADES[gradeKey];
            if (!gData) return;
            var st2 = getLessonNavState("iswordstudy", gradeKey) || { semIdx: 0, lessonIdx: 0 };
            var semIdx = Math.max(0, Math.min(st2.semIdx || 0, gData.semesters.length - 1));
            var lessons = gData.semesters[semIdx].lessons || [];
            setLessonNavState("iswordstudy", gradeKey, { semIdx: semIdx, lessonIdx: Math.max(0, Math.min((st2.lessonIdx || 0) + dir, lessons.length - 1)) });

          } else if (currId === "ufli") {
            var stUF = getLessonNavState("ufli", gradeKey) || { lessonN: 1 };
            setLessonNavState("ufli", gradeKey, { lessonN: Math.max(1, Math.min((stUF.lessonN || 1) + dir, UFLI_TOTAL)) });

          } else if (currId === "illustrative-math") {
            var imGr2 = IM_GRADES[gradeKey];
            if (!imGr2) return;
            var stIM2 = getLessonNavState("illustrative-math", gradeKey) || { unitIdx: 0, lessonN: 1 };
            var uIdx2 = Math.max(0, Math.min(stIM2.unitIdx || 0, imGr2.units.length - 1));
            setLessonNavState("illustrative-math", gradeKey, { unitIdx: uIdx2, lessonN: Math.max(1, Math.min((stIM2.lessonN || 1) + dir, imGr2.units[uIdx2].lessonCount)) });
          }
          rerender();
        });
      });

      /* Set-position button — show inline form */
      var setposBtn = navEl.querySelector("[data-lnav-setpos]");
      if (setposBtn) {
        setposBtn.addEventListener("click", function () {
          var footerRow = navEl.querySelector(".th2-lnav-unit-link-row");
          if (!footerRow) return;
          footerRow.innerHTML = buildSetPosFormHtml(currId, gradeKey);

          /* Save */
          var saveBtn = footerRow.querySelector("[data-setpos-save]");
          if (saveBtn) {
            saveBtn.addEventListener("click", function () {
              var unitSel  = footerRow.querySelector("[data-setpos-unit]");
              var semSel   = footerRow.querySelector("[data-setpos-sem]");
              var lessonIn = footerRow.querySelector("[data-setpos-lesson]");
              var uIdx  = unitSel  ? parseInt(unitSel.value,  10) : 0;
              var sIdx  = semSel   ? parseInt(semSel.value,   10) : 0;
              var lVal  = lessonIn ? parseInt(lessonIn.value, 10) : 1;
              if (isNaN(uIdx))  uIdx = 0;
              if (isNaN(sIdx))  sIdx = 0;
              if (isNaN(lVal) || lVal < 1) lVal = 1;

              if (currId === "fishtank") {
                setLessonNavState("fishtank", gradeKey, { unitIdx: uIdx, lessonN: lVal });
              } else if (currId === "iswordstudy") {
                setLessonNavState("iswordstudy", gradeKey, { semIdx: sIdx, lessonIdx: lVal - 1 });
              } else if (currId === "ufli") {
                setLessonNavState("ufli", gradeKey, { lessonN: lVal });
              } else if (currId === "illustrative-math") {
                setLessonNavState("illustrative-math", gradeKey, { unitIdx: uIdx, lessonN: lVal });
              }
              showToast("Position saved.", "success");
              rerender();
            });
          }
          /* Cancel */
          var cancelBtn = footerRow.querySelector("[data-setpos-cancel]");
          if (cancelBtn) {
            cancelBtn.addEventListener("click", function () { rerender(); });
          }
        });
      }
    });
  }

  /* ── Main curriculum alignment card ─────────────────────── */
  function renderCurriculumSection(recTitle, module, gradeBand) {
    var goal = matchCurriculumGoal(recTitle, module);
    var smartTrunc = goal.smart.length > 120 ? goal.smart.slice(0, 117) + "…" : goal.smart;

    var gradeKey  = fishtankGradeKey(gradeBand);
    var grade0to2 = gradeKey === "K" || gradeKey === "0" || gradeKey === "1" || gradeKey === "2";
    var grade3to5 = gradeKey === "3" || gradeKey === "4" || gradeKey === "5";
    var isNumera  = goal.domain.indexOf("numer") >= 0;
    var isDecod   = goal.domain.indexOf("decod") >= 0 || goal.domain.indexOf("phon") >= 0;
    var isSpell   = goal.domain.indexOf("spell") >= 0 || goal.domain.indexOf("morphol") >= 0;
    var isELA     = !isNumera;

    /* Determine which navigators to show */
    var showFishtank = !!gradeKey && isELA;
    var showISWS     = grade3to5  && (isSpell || isDecod);
    var showUFLI     = !!gradeKey && (isDecod || (grade0to2 && isELA));
    var showIM       = !!gradeKey && isNumera && !!IM_GRADES[gradeKey];

    var navsHtml = [
      showIM       ? renderIMNav(gradeKey)       : "",
      showFishtank ? renderFishtankNav(gradeKey) : "",
      showISWS     ? renderISWSNav(gradeKey)     : "",
      showUFLI     ? renderUFLINav(gradeKey)     : ""
    ].filter(Boolean).join("\n");

    /* Fallback — always show at least Fishtank for ELA-capable grades */
    if (!navsHtml && gradeKey && !isNumera) {
      navsHtml = renderFishtankNav(gradeKey);
    }

    return [
      '<div class="th2-curriculum">',
      '  <div class="th2-curriculum-head">',
      '    <span class="th2-curriculum-kicker">Curriculum alignment</span>',
      '    <div class="th2-curriculum-tags">',
      '      <span class="th2-curriculum-tag">' + escapeHtml(goal.gradeBand) + '</span>',
      '      <span class="th2-curriculum-tag th2-curriculum-tag--domain">' + escapeHtml(goal.domain.split(".")[1] || goal.domain) + '</span>',
      '    </div>',
      '  </div>',
      '  <p class="th2-curriculum-skill">' + escapeHtml(goal.skill) + '</p>',
      '  <p class="th2-curriculum-smart">' + escapeHtml(smartTrunc) + '</p>',
      '  <p class="th2-curriculum-monitor">',
      '    <span class="th2-curriculum-monitor-label">Progress monitoring:</span> ' + escapeHtml(goal.monitor),
      '  </p>',
      navsHtml,
      '</div>'
    ].join("\n");
  }

  /* ── Evidence timeline builder ─────────────────────────── */

  /* ── Domain goals section (focus card) ──────────────────── */
  /* Shows subject-specific, goal-level performance (1-4 rubric).
   * Goals are set in View Details drawer; surfaced here for quick-glance. */
  function buildDomainGoalsSection(studentId) {
    var goals = getStudentGoals(studentId);
    /* Group by domain */
    var byDomain = {};
    DOMAINS.forEach(function (d) { byDomain[d.key] = []; });
    goals.forEach(function (g) { if (byDomain[g.domain]) byDomain[g.domain].push(g); });

    var activeDomains = DOMAINS.filter(function (d) { return byDomain[d.key].length > 0; });
    if (!activeDomains.length) {
      return [
        '<div class="th2-domain-section">',
        '  <div class="th2-domain-section-head">',
        '    <h4 class="th2-domain-title">Subject Performance</h4>',
        '  </div>',
        '  <p class="th2-domain-empty">No goals recorded yet — add subject goals in <strong>View Details</strong>.</p>',
        '</div>'
      ].join("\n");
    }

    var domainsHtml = activeDomains.map(function (d) {
      var domainGoals = byDomain[d.key];
      /* Effective domain level = lowest (most concerning) goal level */
      var minLevel = domainGoals.reduce(function (m, g) { return Math.min(m, Number(g.level) || 3); }, 4);
      var goalsHtml = domainGoals.map(function (g) {
        return [
          '<div class="th2-goal-row">',
          '  <span class="th2-goal-skill">' + escapeHtml(g.skill || "—") + '</span>',
          '  <span class="th2-level-chip" data-level="' + Number(g.level) + '">' + levelLabel(g.level) + '</span>',
          '</div>'
        ].join("\n");
      }).join("");
      return [
        '<div class="th2-domain-group">',
        '  <div class="th2-domain-group-head">',
        '    <span class="th2-domain-group-label">' + escapeHtml(d.label) + '</span>',
        '    <span class="th2-level-chip th2-level-chip--domain" data-level="' + minLevel + '">' + levelLabel(minLevel) + '</span>',
        '  </div>',
        goalsHtml,
        '</div>'
      ].join("\n");
    }).join("");

    return [
      '<div class="th2-domain-section">',
      '  <div class="th2-domain-section-head">',
      '    <h4 class="th2-domain-title">Subject Performance</h4>',
      '  </div>',
      domainsHtml,
      '</div>'
    ].join("\n");
  }

  /* ── Goals management section (View Details drawer) ─────── */
  function buildGoalsDrawerSection(studentId) {
    var goals = getStudentGoals(studentId);
    var byDomain = {};
    DOMAINS.forEach(function (d) { byDomain[d.key] = []; });
    goals.forEach(function (g) { if (byDomain[g.domain]) byDomain[g.domain].push(g); });

    var domainRowsHtml = DOMAINS.map(function (d) {
      var domGoals = byDomain[d.key];
      var goalsHtml = domGoals.length
        ? domGoals.map(function (g, i) {
            return [
              '<div class="th2-dg-goal-row" data-domain="' + d.key + '" data-idx="' + i + '">',
              '  <span class="th2-dg-goal-skill">' + escapeHtml(g.skill || "—") + '</span>',
              '  <span class="th2-level-chip" data-level="' + Number(g.level) + '">' + levelLabel(g.level) + '</span>',
              '  <button class="th2-dg-remove" data-domain="' + d.key + '" data-idx="' + i + '" type="button" aria-label="Remove goal" title="Remove">×</button>',
              '</div>'
            ].join("\n");
          }).join("")
        : '<p class="th2-dg-none">No goals for this subject.</p>';

      return [
        '<div class="th2-dg-domain">',
        '  <p class="th2-dg-domain-label">' + escapeHtml(d.label) + '</p>',
        goalsHtml,
        '  <div class="th2-dg-add-row">',
        '    <input class="th2-dg-skill-input" type="text" placeholder="Goal / skill description" maxlength="80" data-domain="' + d.key + '" aria-label="Goal description for ' + d.label + '">',
        '    <select class="th2-dg-level-select" data-domain="' + d.key + '" aria-label="Performance level for ' + d.label + '">',
        '      <option value="">Level…</option>',
        [4,3,2,1].map(function (lv) { return '      <option value="' + lv + '">' + lv + ' — ' + levelLabel(lv) + '</option>'; }).join("\n"),
        '    </select>',
        '    <button class="th2-dg-add-btn" type="button" data-domain="' + d.key + '">+ Add</button>',
        '  </div>',
        '</div>'
      ].join("\n");
    }).join("");

    return [
      '<div class="th2-drawer-section" id="th2-goals-section">',
      '  <h4 class="th2-drawer-section-head">Subject Goals &amp; Performance Levels</h4>',
      '  <p class="th2-drawer-note-sub">Rate each goal using the 4-level rubric: 1 Emerging · 2 Approaching · 3 Meeting · 4 Exemplary</p>',
      domainRowsHtml,
      '</div>'
    ].join("\n");
  }

  /* ── Confidential plan section (View Details drawer) ────── */
  function buildPlanDrawerSection(student) {
    var plans = getStudentPlans(student);
    var plansText = plans.length ? plans.join(", ") : "None on file";
    return [
      '<div class="th2-drawer-section th2-plan-section" id="th2-plan-section">',
      '  <button class="th2-plan-toggle" type="button" aria-expanded="false" aria-controls="th2-plan-details" id="th2-plan-toggle">',
      '    <span class="th2-plan-lock" aria-hidden="true">🔒</span>',
      '    <span>Confidential — Support Plans</span>',
      '    <span class="th2-plan-chevron" aria-hidden="true">▸</span>',
      '  </button>',
      '  <div class="th2-plan-details hidden" id="th2-plan-details" aria-hidden="true">',
      '    <div class="th2-plan-chips" id="th2-plan-chips">',
      PLAN_TYPES.map(function (p) {
        var active = plans.indexOf(p) !== -1;
        return '<button type="button" class="th2-plan-chip' + (active ? ' is-active' : '') + '" data-plan="' + p + '">' + p + '</button>';
      }).join(""),
      '    </div>',
      '    <p class="th2-plan-save-note">Click plan types above to toggle. Changes save automatically.</p>',
      '  </div>',
      '</div>'
    ].join("\n");
  }

  function buildEvidenceTimeline(studentId) {
    var Evidence = window.CSEvidence;
    if (!Evidence || !Evidence.getRecentSessions) return "";
    var sessions = safe(function () {
      return (Evidence.getRecentSessions && Evidence.getRecentSessions(studentId, { limit: 7 })) || [];
    }) || [];
    if (!sessions.length) return '<div class="th2-drawer-empty" style="padding:10px;">No session data yet. Log sessions to see your progress timeline.</div>';

    var rows = sessions.reverse().slice(0, 7).map(function (sess, i) {
      var ts = Number(sess.ts || sess.createdAt || 0);
      var dateStr = ts ? new Date(ts).toLocaleDateString("en-US", { month: "short", day: "numeric" }) : "—";
      var acc = sess.metrics && sess.metrics.accuracy ? Math.round(Number(sess.metrics.accuracy) * 100) + "%" : "—";
      var wpm = sess.metrics && sess.metrics.wpmProxy ? Math.round(Number(sess.metrics.wpmProxy)) + " wpm" : "";
      var score = sess.score ? Math.round(Number(sess.score)) : 0;
      var trend = i > 0 && i < sessions.length - 1
        ? (score >= sessions[sessions.length - 2 - i].score ? "↑" : "↓")
        : "";
      return [
        '<div class="th2-session-row">',
        '  <span class="th2-session-date">' + escapeHtml(dateStr) + '</span>',
        '  <span class="th2-session-score">' + escapeHtml(acc) + (wpm ? ' · ' + escapeHtml(wpm) : '') + '</span>',
        (trend ? '  <span class="th2-session-slope">' + trend + '</span>' : ''),
        '</div>'
      ].join("\n");
    }).join("");

    return [
      '<h5 style="font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:.06em;color:#3d4559;margin:10px 0 8px;">Last 7 Sessions</h5>',
      rows
    ].join("\n");
  }

  function buildQuickLogSection(studentId) {
    return [
      '<div class="th2-drawer-section">',
      '  <h4 class="th2-drawer-section-head">Quick Log Session</h4>',
      '  <div class="th2-quick-log-wrap">',
      '    <div>',
      '      <label class="th2-log-label" for="th2-log-acc">Accuracy %</label>',
      '      <input class="th2-log-input" id="th2-log-acc" type="number" min="0" max="100" step="1" placeholder="e.g., 85">',
      '    </div>',
      '    <div>',
      '      <label class="th2-log-label" for="th2-log-note">Note (optional)</label>',
      '      <textarea class="th2-log-input th2-log-note" id="th2-log-note" placeholder="Brief observation..."></textarea>',
      '    </div>',
      '    <button class="th2-log-save" id="th2-log-submit">Log Session</button>',
      '  </div>',
      '</div>'
    ].join("\n");
  }

  /* ── Drawer ─────────────────────────────────────────────── */

  function openDrawer(studentId) {
    var drawerTitle = document.getElementById("th2-drawer-title");
    var student = caseload.find(function (s) { return s.id === studentId; }) || {};
    if (drawerTitle) drawerTitle.textContent = student.name || "Student";

    var studentSupport = SupportStore && typeof SupportStore.getStudent === "function"
      ? (safe(function () { return SupportStore.getStudent(studentId); }) || {})
      : {};
    var goals = Array.isArray(studentSupport.goals) ? studentSupport.goals : [];
    var accs  = Array.isArray(studentSupport.accommodations) ? studentSupport.accommodations : [];
    var summary = getStudentSummaryForHub(studentId, student);

    var drawerBody = document.getElementById("th2-drawer-body");
    if (drawerBody) {
      drawerBody.innerHTML = [
        /* Quick-log section — log a session right now */
        buildQuickLogSection(studentId),

        /* Subject goals & performance levels (editable) */
        buildGoalsDrawerSection(studentId),

        '<div class="th2-drawer-section">',
        '  <h4 class="th2-drawer-section-head">Profile</h4>',
        '  <div class="th2-drawer-row"><strong>Grade band</strong>' + escapeHtml(student.gradeBand || student.grade || "—") + '</div>',
        '  <div class="th2-drawer-row"><strong>Last session</strong>' + (summary && summary.lastSession ? relativeDate(summary.lastSession.timestamp) : "No sessions yet") + '</div>',
        '</div>',

        /* Evidence timeline — see past sessions */
        '<div class="th2-drawer-section">',
        buildEvidenceTimeline(studentId),
        '</div>',

        '<div class="th2-drawer-section">',
        '  <h4 class="th2-drawer-section-head">SMART Goals</h4>',
        goals.length
          ? goals.slice(0, 5).map(function (g) {
              return '<div class="th2-drawer-row"><strong>' + escapeHtml(g.skill || g.domain || "Goal") + '</strong>' + escapeHtml((g.target || "").slice(0, 120)) + '</div>';
            }).join("")
          : '<div class="th2-drawer-empty">No goals recorded yet.</div>',
        '</div>',

        '<div class="th2-drawer-section">',
        '  <h4 class="th2-drawer-section-head">Accommodations</h4>',
        accs.length
          ? accs.slice(0, 5).map(function (a) {
              return '<div class="th2-drawer-row"><strong>' + escapeHtml(a.title || "Accommodation") + '</strong>' + escapeHtml(a.teacherText || a.whenToUse || "") + '</div>';
            }).join("")
          : '<div class="th2-drawer-empty">No accommodations recorded yet.</div>',
        '</div>',

        '<div class="th2-drawer-section">',
        '  <h4 class="th2-drawer-section-head">Sub Plan' +
          (window.CSAIPlanner && window.CSAIPlanner.isConfigured()
            ? ' <span style="color:var(--status-secure);font-size:10px;font-weight:700">✦ AI</span>'
            : '') +
        '</h4>',
        '  <div id="th2-subplan-output" class="th2-drawer-empty" style="margin-bottom:10px">',
        '    One tap creates a complete plan any substitute can follow.',
        '  </div>',
        '  <button class="th2-btn-log" id="th2-generate-subplan" type="button" style="width:100%;text-align:center;justify-content:center">',
        '    &#x2726; Generate Sub Plan',
        '  </button>',
        '</div>',

        /* Phase 11 — Progress Notes */
        (function () {
          var planIntel = hubState.get().intelligence;
          var drawerPlan = planIntel && planIntel.plan;
          var tmpl = drawerPlan && drawerPlan.progressNoteTemplate;
          var noteTeacher = (tmpl && tmpl.teacher) ? String(tmpl.teacher) : "No note available yet.";
          if (!tmpl) return "";
          return [
            '<div class="th2-drawer-section">',
            '  <h4 class="th2-drawer-section-head">Progress Notes <span class="th2-auto-badge">Auto-generated</span></h4>',
            '  <div class="th2-drawer-note-tabs">',
            '    <button class="th2-note-tab is-active" data-note-target="teacher">Teacher</button>',
            '    <button class="th2-note-tab" data-note-target="family">Parent</button>',
            '    <button class="th2-note-tab" data-note-target="team">Team</button>',
            '  </div>',
            '  <pre class="th2-note-text" id="th2-note-text">' + escapeHtml(noteTeacher) + '</pre>',
            '  <button class="th2-btn-log" id="th2-copy-note" data-note-target="teacher" type="button">&#x2398; Copy to clipboard</button>',
            '</div>'
          ].join("\n");
        })(),

        /* Phase 11 — IM Cool-Down Score */
        '<div class="th2-drawer-section">',
        '  <h4 class="th2-drawer-section-head">IM Cool-Down Score</h4>',
        '  <p class="th2-drawer-note-sub">Log today\'s score (0\u20134) to get an instant grouping suggestion.</p>',
        '  <div class="th2-cooldown-row">',
        '    <label class="th2-cooldown-label" for="th2-cooldown-score">Score</label>',
        '    <input class="th2-cooldown-input" id="th2-cooldown-score" type="number" min="0" max="4" step="1" placeholder="\u2014">',
        '    <button class="th2-btn-log" id="th2-cooldown-save" type="button">Log &amp; Group</button>',
        '  </div>',
        '  <div id="th2-cooldown-group-hint" class="th2-cooldown-hint"></div>',
        '</div>',

        '<div class="th2-drawer-section">',
        '  <h4 class="th2-drawer-section-head">Export</h4>',
        '  <div class="th2-export-row">',
        '    <button class="th2-export-btn" id="th2-copy-summary" type="button">&#x2398; Copy Summary</button>',
        '    <button class="th2-export-btn" id="th2-export-json" type="button">&#x21e9; JSON</button>',
        '  </div>',
        '</div>',

        /* Confidential plan types — collapsed by default for privacy */
        buildPlanDrawerSection(student),

        '<div class="th2-drawer-section">',
        '  <h4 class="th2-drawer-section-head">Meeting Prep</h4>',
        '  <div class="th2-drawer-row">',
        '    <a class="th2-drawer-link" href="student-profile.html?student=' + encodeURIComponent(studentId) + '&from=hub">Open Student Profile &rarr;</a>',
        '  </div>',
        '  <div class="th2-drawer-row">',
        '    <a class="th2-drawer-link" href="teacher-dashboard.html?student=' + encodeURIComponent(studentId) + '&tab=meeting&from=hub">Open Reports &amp; Meetings &rarr;</a>',
        '  </div>',
        '</div>'
      ].join("\n");

      // ── Wire goal management ─────────────────────────────
      var goalsSection = drawerBody.querySelector("#th2-goals-section");
      if (goalsSection) {
        /* Add goal */
        goalsSection.querySelectorAll(".th2-dg-add-btn").forEach(function (btn) {
          btn.addEventListener("click", function () {
            var domain   = btn.getAttribute("data-domain");
            var input    = goalsSection.querySelector('.th2-dg-skill-input[data-domain="' + domain + '"]');
            var levelSel = goalsSection.querySelector('.th2-dg-level-select[data-domain="' + domain + '"]');
            var skill = (input ? input.value.trim() : "");
            var level = parseInt(levelSel ? levelSel.value : "", 10);
            if (!skill || !level) { showToast("Enter a goal description and select a level.", "warn"); return; }
            var allGoals = getStudentGoals(studentId);
            allGoals.push({ domain: domain, skill: skill, level: level });
            saveStudentGoals(studentId, allGoals);
            if (input) input.value = "";
            if (levelSel) levelSel.value = "";
            /* Re-render section */
            goalsSection.outerHTML = buildGoalsDrawerSection(studentId);
            /* Re-wire after re-render */
            openDrawer(studentId);
            showToast("Goal added ✓", "success");
          });
        });
        /* Remove goal */
        goalsSection.querySelectorAll(".th2-dg-remove").forEach(function (btn) {
          btn.addEventListener("click", function () {
            var domain = btn.getAttribute("data-domain");
            var idx    = parseInt(btn.getAttribute("data-idx"), 10);
            var allGoals = getStudentGoals(studentId);
            var domainGoals = allGoals.filter(function (g) { return g.domain === domain; });
            var other       = allGoals.filter(function (g) { return g.domain !== domain; });
            domainGoals.splice(idx, 1);
            saveStudentGoals(studentId, other.concat(domainGoals));
            openDrawer(studentId);
          });
        });
      }

      // ── Wire confidential plan toggle ────────────────────
      var planToggle  = drawerBody.querySelector("#th2-plan-toggle");
      var planDetails = drawerBody.querySelector("#th2-plan-details");
      if (planToggle && planDetails) {
        planToggle.addEventListener("click", function () {
          var expanded = planToggle.getAttribute("aria-expanded") === "true";
          planToggle.setAttribute("aria-expanded", expanded ? "false" : "true");
          planDetails.classList.toggle("hidden", expanded);
          planDetails.setAttribute("aria-hidden", expanded ? "true" : "false");
          var chevron = planToggle.querySelector(".th2-plan-chevron");
          if (chevron) chevron.textContent = expanded ? "▸" : "▾";
        });
        planDetails.querySelectorAll(".th2-plan-chip").forEach(function (chip) {
          chip.addEventListener("click", function () {
            var planType = chip.getAttribute("data-plan");
            var currentStudent = caseload.find(function (s) { return s.id === studentId; }) || {};
            var currentPlans = getStudentPlans(currentStudent);
            var idx = currentPlans.indexOf(planType);
            if (idx === -1) currentPlans.push(planType);
            else currentPlans.splice(idx, 1);
            /* Save to student record */
            safe(function () { Evidence.upsertStudent(Object.assign({}, currentStudent, { plans: currentPlans })); });
            /* Update caseload local copy */
            caseload.forEach(function (s) { if (s.id === studentId) s.plans = currentPlans; });
            chip.classList.toggle("is-active");
            showToast(planType + (idx === -1 ? " added" : " removed") + " ✓", "success");
          });
        });
      }

      // Wire sub plan generator
      var subPlanBtn = drawerBody.querySelector("#th2-generate-subplan");
      if (subPlanBtn) {
        subPlanBtn.addEventListener("click", function handleGenerate() {
          subPlanBtn.textContent = "Generating…";
          subPlanBtn.disabled = true;
          var planIntel = hubState.get().intelligence;
          var plan = planIntel && planIntel.plan;
          var tenMin = plan && plan.plans && plan.plans.tenMin && plan.plans.tenMin[0];
          var AIPlanner = window.CSAIPlanner || null;
          var generate = AIPlanner
            ? AIPlanner.generateSubPlan.bind(AIPlanner)
            : function () { return Promise.resolve("CSAIPlanner not loaded."); };

          generate({
            student: student,
            tier: quickTier(summary),
            recTitle: tenMin ? String(tenMin.title || "") : "",
            recReason: tenMin ? String(tenMin.reason || "") : "",
            needs: Array.isArray(studentSupport.needs) ? studentSupport.needs : [],
            goals: goals,
            accommodations: accs
          }).then(function (text) {
            var output = drawerBody.querySelector("#th2-subplan-output");
            if (output) {
              output.style.cssText = "color:var(--text-primary);font-size:12px;line-height:1.65;white-space:pre-wrap;background:var(--surface-elev-2);padding:12px;border-radius:8px;margin-bottom:10px";
              output.textContent = text;
            }
            subPlanBtn.textContent = "Copy to Clipboard";
            subPlanBtn.disabled = false;
            subPlanBtn.removeEventListener("click", handleGenerate);
            subPlanBtn.addEventListener("click", function () {
              if (navigator.clipboard) navigator.clipboard.writeText(text).catch(function () {});
              subPlanBtn.textContent = "Copied ✓";
              setTimeout(function () { subPlanBtn.textContent = "Copy to Clipboard"; }, 2200);
            });
          }).catch(function (err) {
            console.warn("Sub plan error:", err);
            subPlanBtn.textContent = "Try again";
            subPlanBtn.disabled = false;
          });
        });
      }

      // Wire Quick-Log save button
      var quickLogBtn = drawerBody.querySelector("#th2-log-submit");
      if (quickLogBtn) {
        quickLogBtn.addEventListener("click", function () {
          var accInput = drawerBody.querySelector("#th2-log-acc");
          var noteInput = drawerBody.querySelector("#th2-log-note");
          var acc = accInput ? parseInt(accInput.value, 10) : NaN;
          var note = noteInput ? String(noteInput.value || "").trim() : "";

          if (isNaN(acc) || acc < 0 || acc > 100) {
            showToast("Please enter accuracy 0–100.", "info");
            return;
          }

          if (Evidence && typeof Evidence.appendSession === "function") {
            safe(function () {
              Evidence.appendSession(studentId, "reading_lab", {
                accuracy: Math.max(0, Math.min(1, acc / 100)),
                wpmProxy: 0,
                selfCorrects: 0
              });
            });
          }

          accInput.value = "";
          noteInput.value = "";
          quickLogBtn.textContent = "Logged ✓";
          quickLogBtn.disabled = true;
          showToast("Session logged. Refresh to see updates.", "success");
          setTimeout(function () {
            quickLogBtn.textContent = "Log Session";
            quickLogBtn.disabled = false;
          }, 2400);
        });
      }

      // Wire Copy Summary
      var copySumBtn = drawerBody.querySelector("#th2-copy-summary");
      if (copySumBtn) {
        copySumBtn.addEventListener("click", function () {
          var planIntel = hubState.get().intelligence;
          var planData = planIntel && planIntel.plan;
          var tenMin = planData && planData.plans && planData.plans.tenMin && planData.plans.tenMin[0];
          var recT = tenMin ? String(tenMin.title || "") : "Focused intervention";
          var tier = quickTier(summary);
          var trend = quickTrend(summary);
          var spark = Array.isArray(summary && summary.last7Sparkline) ? summary.last7Sparkline : [];
          var recentAvg = spark.length
            ? Math.round(spark.slice(-3).reduce(function (s, v) { return s + Number(v); }, 0) / Math.min(3, spark.length))
            : null;
          var date = new Date().toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" });
          var goalText = goals.slice(0, 2).map(function (g, i) {
            return (i + 1) + ". " + String(g.skill || g.domain || "Goal") + (g.target ? ": " + String(g.target).slice(0, 80) : "");
          }).join("\n") || "See teacher's plan folder.";
          var accText = accs.slice(0, 3).map(function (a) {
            return "• " + String(a.title || "Accommodation");
          }).join("\n") || "• Extended time\n• Visual supports";
          var actHref = window.location.origin + "/" + "teacher-hub-v2.html?student=" + encodeURIComponent(studentId);

          var text = [
            "MTSS STUDENT SUMMARY — " + date,
            "════════════════════════════════════",
            "",
            "Student:      " + String(student.name || "—"),
            "Grade:        " + String(student.gradeBand || student.grade || "—"),
            "MTSS Tier:    " + tierLabel(tier) + " (Tier " + tier + ")",
            "7-day trend:  " + trend + (recentAvg !== null ? " (" + recentAvg + "% avg)" : ""),
            "",
            "RECOMMENDED NEXT STEP",
            recT,
            "",
            "ACTIVE GOALS",
            goalText,
            "",
            "KEY ACCOMMODATIONS",
            accText,
            "",
            "Hub link: " + actHref
          ].join("\n");

          if (navigator.clipboard) {
            navigator.clipboard.writeText(text).then(function () {
              copySumBtn.textContent = "Copied ✓";
              setTimeout(function () { copySumBtn.innerHTML = "&#x2398; Copy Summary"; }, 2400);
            }).catch(function () {});
          }
        });
      }

      // Wire Export JSON
      var exportJsonBtn = drawerBody.querySelector("#th2-export-json");
      if (exportJsonBtn) {
        exportJsonBtn.addEventListener("click", function () {
          var exportObj = {
            exportedAt: new Date().toISOString(),
            student: {
              id: student.id,
              name: student.name,
              grade: student.gradeBand || student.grade
            },
            evidence: summary || {},
            goals: goals,
            accommodations: accs
          };
          var blob = new Blob([JSON.stringify(exportObj, null, 2)], { type: "application/json" });
          var url = URL.createObjectURL(blob);
          var a = document.createElement("a");
          a.href = url;
          a.download = "cs-" + String(student.name || "student").replace(/\s+/g, "-").toLowerCase() + "-" + Date.now() + ".json";
          a.click();
          setTimeout(function () { URL.revokeObjectURL(url); }, 5000);
        });
      }
    }

    var drawer  = document.getElementById("th2-drawer");
    var overlay = document.getElementById("th2-overlay");
    if (drawer)  { drawer.classList.add("is-open");  drawer.removeAttribute("aria-hidden"); }
    if (overlay) { overlay.classList.add("is-open"); overlay.classList.remove("hidden"); }
    document.body.style.overflow = "hidden";
  }

  function closeDrawer() {
    var drawer  = document.getElementById("th2-drawer");
    var overlay = document.getElementById("th2-overlay");
    if (drawer)  { drawer.classList.remove("is-open");  drawer.setAttribute("aria-hidden", "true"); }
    if (overlay) { overlay.classList.remove("is-open"); }
    setTimeout(function () { if (overlay) overlay.classList.add("hidden"); }, 260);
    document.body.style.overflow = "";
    hubState.set({ ui: { drawerOpen: false } });
  }

  /* ── HubContext wiring ─────────────────────────────────── */

  var destroyContext = HubContext.init({
    hubState: hubState,
    Evidence: Evidence,
    PlanEngine: PlanEngine,
    buildTodayPlan: buildTodayPlanForHub,
    computeExecutive: computeExecutiveForHub
  });

  /* ── Caseload loading ──────────────────────────────────── */

  function loadCaseload() {
    caseload = TeacherSelectors && typeof TeacherSelectors.loadCaseload === "function"
      ? TeacherSelectors.loadCaseload({ TeacherStorage: TeacherStorage, Evidence: Evidence })
      : [];
    searchService = null;
    hubState.set({ schedule_blocks: getTodayLessonBlocks() });

    if (el.listNone) el.listNone.classList.toggle("hidden", caseload.length > 0);

    filterCaseload(el.search ? (el.search.value || "") : "");
  }

  /* ── Demo mode ─────────────────────────────────────────── */

  function ensureDemoCaseload() {
    /* needDomain drives curriculum-section fallback when the plan engine
       can't infer a module from sparse demo evidence. Values must match
       the keyword lists in matchCurriculumGoal (e.g. "Numeracy", "Phonics"). */
    var demos = [
      { id: "demo-ava",  name: "Ava M.",   gradeBand: "G3", grade: "G3", needDomain: "Reading", plans: ["IESP"] },
      { id: "demo-liam", name: "Liam T.",  gradeBand: "G2", grade: "G2", needDomain: "Phonics", plans: ["IP"] },
      { id: "demo-maya", name: "Maya R.",  gradeBand: "G3", grade: "G3", needDomain: "Reading", plans: [] },
      { id: "demo-noah", name: "Noah K.",  gradeBand: "G4", grade: "G4", needDomain: "Numeracy", plans: [] },
      { id: "demo-zoe",  name: "Zoe W.",   gradeBand: "G1", grade: "G1", needDomain: "Phonics", plans: ["BIP"] }
    ];
    demos.forEach(function (s) {
      if (typeof Evidence.upsertStudent === "function") {
        safe(function () { Evidence.upsertStudent(s); });
      }
    });

    /* Sample goals per domain (runs once) */
    var GOALS_SEED_KEY = "cs.hub.demo.goals.v1";
    if (!localStorage.getItem(GOALS_SEED_KEY)) {
      safe(function () {
        // Ava: IESP — Reading / Fluency + Behavior focus
        saveStudentGoals("demo-ava", [
          { domain: "reading", skill: "ORF Fluency (WCPM)", level: 2 },
          { domain: "reading", skill: "Reading Comprehension", level: 2 },
          { domain: "behavior", skill: "Task Completion", level: 2 }
        ]);
        // Liam: IP — Phonics focus
        saveStudentGoals("demo-liam", [
          { domain: "reading", skill: "CVC Word Decoding", level: 2 },
          { domain: "reading", skill: "Phoneme Blending", level: 1 }
        ]);
        // Maya: No plan, strong across reading
        saveStudentGoals("demo-maya", [
          { domain: "reading", skill: "ORF Fluency (WCPM)", level: 3 },
          { domain: "reading", skill: "Comprehension Inference", level: 3 }
        ]);
        // Noah: Numeracy focus
        saveStudentGoals("demo-noah", [
          { domain: "math", skill: "Addition & Subtraction Facts", level: 2 },
          { domain: "math", skill: "Word Problem Solving", level: 2 }
        ]);
        // Zoe: BIP — Phonics + Behavior
        saveStudentGoals("demo-zoe", [
          { domain: "reading", skill: "Initial Sound Recognition", level: 1 },
          { domain: "behavior", skill: "Attention & Focus", level: 1 }
        ]);
      });
      localStorage.setItem(GOALS_SEED_KEY, "1");
    }

    /* Seed realistic session data (runs once per demo session) */
    var SEED_KEY = "cs.hub.demo.sessions.v2";
    if (!localStorage.getItem(SEED_KEY) && Evidence && typeof Evidence.appendSession === "function") {
      var DAY = 86400000;
      var now  = Date.now();
      /* Ava M. — reading lab sessions, improving fluency */
      safe(function () {
        Evidence.appendSession("demo-ava", "reading_lab", { accuracy: 0.72, wpmProxy: 54, selfCorrects: 2 }, now - 12 * DAY);
        Evidence.appendSession("demo-ava", "reading_lab", { accuracy: 0.75, wpmProxy: 58, selfCorrects: 3 }, now - 8  * DAY);
        Evidence.appendSession("demo-ava", "reading_lab", { accuracy: 0.78, wpmProxy: 61, selfCorrects: 2 }, now - 4  * DAY);
        Evidence.appendSession("demo-ava", "reading_lab", { accuracy: 0.81, wpmProxy: 64, selfCorrects: 4 }, now - 1  * DAY);
      });
      /* Liam T. — word quest phonics, struggling */
      safe(function () {
        Evidence.appendSession("demo-liam", "wordquest", { misplaceRate: 0.38, absentRate: 0.12, vowelSwapCount: 4 }, now - 14 * DAY);
        Evidence.appendSession("demo-liam", "wordquest", { misplaceRate: 0.35, absentRate: 0.10, vowelSwapCount: 3 }, now - 9  * DAY);
        Evidence.appendSession("demo-liam", "wordquest", { misplaceRate: 0.40, absentRate: 0.14, vowelSwapCount: 5 }, now - 4  * DAY);
        Evidence.appendSession("demo-liam", "wordquest", { misplaceRate: 0.37, absentRate: 0.11, vowelSwapCount: 4 }, now - 2  * DAY);
      });
      /* Maya R. — reading lab, strong ORF */
      safe(function () {
        Evidence.appendSession("demo-maya", "reading_lab", { accuracy: 0.88, wpmProxy: 87, selfCorrects: 1 }, now - 10 * DAY);
        Evidence.appendSession("demo-maya", "reading_lab", { accuracy: 0.90, wpmProxy: 91, selfCorrects: 2 }, now - 6  * DAY);
        Evidence.appendSession("demo-maya", "reading_lab", { accuracy: 0.92, wpmProxy: 94, selfCorrects: 1 }, now - 3  * DAY);
        Evidence.appendSession("demo-maya", "reading_lab", { accuracy: 0.93, wpmProxy: 97, selfCorrects: 2 }, now - 1  * DAY);
      });
      /* Noah K. — numeracy, moderate */
      safe(function () {
        Evidence.appendSession("demo-noah", "numeracy", { accuracy: 0.68, speedProxy: 42, hints: 3 }, now - 11 * DAY);
        Evidence.appendSession("demo-noah", "numeracy", { accuracy: 0.71, speedProxy: 45, hints: 2 }, now - 7  * DAY);
        Evidence.appendSession("demo-noah", "numeracy", { accuracy: 0.69, speedProxy: 44, hints: 3 }, now - 3  * DAY);
        Evidence.appendSession("demo-noah", "numeracy", { accuracy: 0.73, speedProxy: 48, hints: 2 }, now - 1  * DAY);
      });
      /* Zoe W. — word quest phonics, early stage */
      safe(function () {
        Evidence.appendSession("demo-zoe", "wordquest", { misplaceRate: 0.28, absentRate: 0.08, vowelSwapCount: 2 }, now - 9  * DAY);
        Evidence.appendSession("demo-zoe", "wordquest", { misplaceRate: 0.25, absentRate: 0.07, vowelSwapCount: 1 }, now - 5  * DAY);
        Evidence.appendSession("demo-zoe", "wordquest", { misplaceRate: 0.22, absentRate: 0.06, vowelSwapCount: 1 }, now - 2  * DAY);
      });
      localStorage.setItem(SEED_KEY, "1");
    }

    var SUPPORT_KEY = "cs.hub.demo.support.v1";
    if (!localStorage.getItem(SUPPORT_KEY) && TeacherStorage) {
      safe(function () {
        var supportMap = typeof TeacherStorage.loadStudentSupportStore === "function"
          ? TeacherStorage.loadStudentSupportStore()
          : {};
        var additions = {
          "demo-ava": {
            tier: "T2",
            goals: [
              { domain: "ELA", skill: "Cite evidence in a complete response", progress: "On track" }
            ],
            accommodations: ["sentence frames", "visual scaffold"],
            interventions: [
              { domain: "Writing", tier: "T3" }
            ]
          },
          "demo-liam": {
            tier: "T3",
            goals: [
              { domain: "Intervention", skill: "Blend and read closed-syllable words", progress: "Needs repetition" }
            ],
            accommodations: ["sound boxes", "visual scaffold"],
            interventions: [
              { domain: "Reading", tier: "T2" }
            ]
          },
          "demo-maya": {
            tier: "T2",
            goals: [
              { domain: "ELA", skill: "Compare evidence across two details", progress: "Improving" }
            ],
            accommodations: ["sentence frames"],
            interventions: [
              { domain: "Writing", tier: "T3" }
            ]
          },
          "demo-noah": {
            tier: "T2",
            goals: [
              { domain: "Math", skill: "Explain fraction comparisons with visual models", progress: "Improving" }
            ],
            accommodations: ["visual model", "check-ins"],
            interventions: [
              { domain: "Writing", tier: "T3" }
            ]
          },
          "demo-zoe": {
            tier: "T3",
            goals: [
              { domain: "Intervention", skill: "Read and spell words with closed syllables", progress: "Developing" }
            ],
            accommodations: ["sound boxes", "chunking"],
            interventions: [
              { domain: "Behavior", tier: "T2" }
            ]
          }
        };
        Object.keys(additions).forEach(function (studentId) {
          supportMap[studentId] = Object.assign({}, additions[studentId], supportMap[studentId] || {});
        });
        if (typeof TeacherStorage.saveStudentSupportStore === "function") {
          TeacherStorage.saveStudentSupportStore(supportMap);
        }
      });
      localStorage.setItem(SUPPORT_KEY, "1");
    }

    var CONTEXT_KEY = "cs.hub.demo.context.v1";
    if (!localStorage.getItem(CONTEXT_KEY) && TeacherStorage) {
      safe(function () {
        var today = typeof TeacherStorage.todayStamp === "function" ? TeacherStorage.todayStamp() : todayKey();
        var existingBlocks = typeof TeacherStorage.loadScheduleBlocks === "function"
          ? TeacherStorage.loadScheduleBlocks(today)
          : [];
        var byId = {};
        existingBlocks.forEach(function (block) {
          byId[String(block.id || "")] = block;
        });
        [
          {
            id: "demo-block-math",
            timeLabel: "8:15 AM",
            label: "Block A",
            classSection: "G4 Math Support",
            teacher: "Ms. Smith",
            subject: "Math",
            curriculum: "Illustrative Math",
            curriculumId: "illustrative-math",
            lesson: "Unit 2 · Lesson 7",
            supportType: "small-group",
            notes: "Push on fraction comparison language before independent work.",
            studentIds: ["demo-noah", "demo-ava", "demo-maya"],
            lessonContextId: "demo-lesson-math"
          },
          {
            id: "demo-block-reading",
            timeLabel: "10:05 AM",
            label: "Block B",
            classSection: "G2 Foundational Reading",
            teacher: "Ms. Rivera",
            subject: "Intervention",
            curriculum: "UFLI Foundations",
            curriculumId: "ufli-foundations",
            lesson: "Lesson 42 · Closed Syllables",
            supportType: "pull-out",
            notes: "Keep decoding and meaning work tight in the same round.",
            studentIds: ["demo-liam", "demo-zoe"],
            lessonContextId: "demo-lesson-reading"
          },
          {
            id: "demo-block-writing",
            timeLabel: "1:10 PM",
            label: "Block C",
            classSection: "G3 Writing Push-In",
            teacher: "Ms. Patel",
            subject: "Writing",
            curriculum: "Core Writing Workshop",
            curriculumId: "writing-workshop",
            lesson: "Claim + Evidence Paragraph",
            supportType: "push-in",
            notes: "Support oral rehearsal before independent writing.",
            studentIds: ["demo-ava", "demo-maya"],
            lessonContextId: "demo-lesson-writing"
          }
        ].forEach(function (block) {
          if (!byId[block.id]) byId[block.id] = block;
        });
        if (typeof TeacherStorage.saveScheduleBlocks === "function") {
          TeacherStorage.saveScheduleBlocks(today, Object.keys(byId).map(function (id) { return byId[id]; }));
        }

        if (typeof TeacherStorage.saveClassContext === "function") {
          TeacherStorage.saveClassContext("demo-block-math", {
            classId: "demo-block-math",
            label: "Block A",
            teacher: "Ms. Smith",
            subject: "Math",
            curriculum: "Illustrative Math",
            lesson: "Unit 2 · Lesson 7",
            supportType: "small-group",
            conceptFocus: "Compare fractions with unlike denominators using benchmark reasoning.",
            languageDemands: ["compare", "justify", "explain"],
            lessonContextId: "demo-lesson-math"
          });
          TeacherStorage.saveClassContext("demo-block-reading", {
            classId: "demo-block-reading",
            label: "Block B",
            teacher: "Ms. Rivera",
            subject: "Intervention",
            curriculum: "UFLI Foundations",
            lesson: "Lesson 42 · Closed Syllables",
            supportType: "pull-out",
            conceptFocus: "Blend and read closed-syllable words while monitoring meaning.",
            languageDemands: ["blend", "read", "explain"],
            lessonContextId: "demo-lesson-reading"
          });
          TeacherStorage.saveClassContext("demo-block-writing", {
            classId: "demo-block-writing",
            label: "Block C",
            teacher: "Ms. Patel",
            subject: "Writing",
            curriculum: "Core Writing Workshop",
            lesson: "Claim + Evidence Paragraph",
            supportType: "push-in",
            conceptFocus: "Write a claim and support it with one precise piece of evidence.",
            languageDemands: ["claim", "evidence", "justify"],
            lessonContextId: "demo-lesson-writing"
          });
        }

        if (typeof TeacherStorage.saveLessonContext === "function") {
          TeacherStorage.saveLessonContext("demo-lesson-math", {
            lessonContextId: "demo-lesson-math",
            blockId: "demo-block-math",
            subject: "Math",
            programId: "illustrative-math",
            unit: "Unit 2",
            title: "Lesson 7",
            conceptFocus: "Comparing fractions with unlike denominators",
            languageDemands: ["compare", "justify", "explain"],
            misconceptions: [
              "Students compare denominators instead of the size of the fraction.",
              "Students skip benchmark reasoning and jump to a guess."
            ],
            supportMoves: [
              "Use a number line or area model before asking for a verbal answer.",
              "Press for the sentence frame: ___ is greater because ___."
            ],
            targetSkills: ["fraction comparison", "comparison language", "visual model reasoning"],
            vocabulary: ["fraction", "benchmark", "greater than", "justify"]
          });
          TeacherStorage.saveLessonContext("demo-lesson-reading", {
            lessonContextId: "demo-lesson-reading",
            blockId: "demo-block-reading",
            subject: "Intervention",
            programId: "ufli-foundations",
            unit: "Lesson 42",
            title: "Closed Syllables",
            conceptFocus: "Read, build, and explain closed-syllable words with automaticity.",
            languageDemands: ["blend", "segment", "explain"],
            misconceptions: [
              "Students omit the medial vowel when blending quickly.",
              "Students can decode the word but cannot connect it to meaning."
            ],
            supportMoves: [
              "Keep sound boxes visible during the first two rounds.",
              "After decoding, ask for a meaning clue or sentence."
            ],
            targetSkills: ["closed syllables", "phoneme blending", "decoding to meaning"],
            vocabulary: ["closed syllable", "blend", "segment", "vowel"]
          });
          TeacherStorage.saveLessonContext("demo-lesson-writing", {
            lessonContextId: "demo-lesson-writing",
            blockId: "demo-block-writing",
            subject: "Writing",
            programId: "writing-workshop",
            unit: "Argument",
            title: "Claim + Evidence Paragraph",
            conceptFocus: "Write a claim and support it with clear evidence and reasoning.",
            languageDemands: ["claim", "cite", "justify"],
            misconceptions: [
              "Students restate the topic without making a true claim.",
              "Students add evidence but do not explain how it supports the claim."
            ],
            supportMoves: [
              "Model one claim-evidence-reasoning example aloud before release.",
              "Keep transition stems visible during sentence rehearsal."
            ],
            targetSkills: ["argument writing", "evidence sentence", "reasoning language"],
            vocabulary: ["claim", "evidence", "reasoning", "therefore"]
          });
        }
      });
      localStorage.setItem(CONTEXT_KEY, "1");
    }
  }

  /* ── Filtering ─────────────────────────────────────────── */

  function filterCaseload(query) {
    var q = String(query || "").trim().toLowerCase();
    filtered = caseload.filter(function (s) {
      if (!q) return true;
      var name = String(s.name || "").toLowerCase();
      var id   = String(s.id || "").toLowerCase();
      return name.includes(q) || id.includes(q);
    });
    searchResults = buildSearchResults(q);
    hubState.set({
      search_context: {
        query: q,
        scope: "global",
        results: searchResults && searchResults.groups ? Object.keys(searchResults.groups).reduce(function (rows, key) {
          return rows.concat(searchResults.groups[key] || []);
        }, []) : []
      },
      schedule_blocks: getTodayLessonBlocks()
    });
    renderStudentList();
    if (q) showEmptyState();
  }

  /* ── Sidebar schedule rendering (class mode) ───────────── */

  function renderSidebarSchedule() {
    if (!el.list) return;
    var blocks = getTodayLessonBlocks();
    var selectedBlockId = hubState.get().context.classId || "";
    if (!blocks.length) {
      el.list.innerHTML = [
        '<div class="th2-sidebar-empty-schedule">',
        '  <p class="th2-sidebar-empty-msg">No classes scheduled yet.</p>',
        '  <p class="th2-sidebar-empty-sub">Add your schedule to see class context here.</p>',
        '  <button class="th2-sidebar-setup-btn" data-open-brief="1" type="button">Set up my classes</button>',
        '</div>'
      ].join("");
      return;
    }
    el.list.innerHTML = blocks.map(function (block) {
      var isActive = block.id === selectedBlockId;
      var label = escapeHtml(block.label || block.classSection || "Class");
      var time = escapeHtml(block.timeLabel || "");
      var sub = [escapeHtml(block.subject || ""), escapeHtml(block.programId || "")].filter(Boolean).join(" · ");
      var studentCount = block.studentIds && block.studentIds.length;
      return [
        '<button class="th2-block-card' + (isActive ? " is-active" : "") + '"',
        '  data-open-block="' + escapeHtml(block.id) + '"',
        '  type="button"',
        '  aria-pressed="' + isActive + '"',
        '>',
        '  <div class="th2-block-card-body">',
        (time ? '    <span class="th2-block-card-time">' + time + '</span>' : ""),
        '    <span class="th2-block-card-name">' + label + '</span>',
        (sub ? '    <span class="th2-block-card-meta">' + sub + '</span>' : ""),
        (studentCount ? '    <span class="th2-block-card-count">' + studentCount + ' student' + (studentCount !== 1 ? 's' : '') + '</span>' : ""),
        '  </div>',
        '</button>'
      ].join("\n");
    }).join("");
  }

  /* ── Student list rendering ────────────────────────────── */

  function renderStudentList() {
    if (!el.list) return;

    if (el.listEmpty) el.listEmpty.classList.toggle("hidden", filtered.length > 0 || caseload.length === 0);

    var selectedId = hubState.get().context.studentId || "";

    el.list.innerHTML = filtered.map(function (student) {
      var summary = getStudentSummaryForHub(student.id, student);
      var tier    = quickTier(summary);
      var trend   = quickTrend(summary);
      var last    = summary && summary.lastSession ? relativeDate(summary.lastSession.timestamp) : "";
      var grade   = String(student.gradeBand || student.grade || "");
      var meta    = [grade, last].filter(Boolean).join(" · ");
      var isActive = student.id === selectedId;

      var trendArrow = trend === "up" ? "↑ " : (trend === "down" ? "↓ " : "");
      var trendLabel = trend === "up" ? "improving" : (trend === "down" ? "declining" : "stable");

      return [
        '<button class="th2-student' + (isActive ? " is-active" : "") + '"',
        '  data-id="' + escapeHtml(student.id) + '"',
        '  role="listitem"',
        '  aria-pressed="' + isActive + '"',
        '  aria-label="' + escapeHtml(student.name) + ', ' + tierLabel(tier) + ', ' + trendLabel + '"',
        '>',
        '  <div class="th2-student-body">',
        '    <span class="th2-student-name">' + escapeHtml(student.name) + '</span>',
        '    <span class="th2-student-meta">' + escapeHtml(meta || "\u00a0") + '</span>',
        '  </div>',
        '  <div style="display:flex;align-items:flex-start;gap:6px;flex-shrink:0;padding-top:2px">',
        '    <span class="th2-tier-chip" data-tier="' + tier + '">' + tierLabel(tier) + '</span>',
        '    <span class="th2-trend-dot" data-trend="' + trend + '" title="' + trendArrow + trendLabel + '"></span>',
        '  </div>',
        '</button>'
      ].join("\n");
    }).join("");
  }

  /* ── Student selection ─────────────────────────────────── */

  function selectStudent(studentId) {
    // Write to HubState → HubContext auto-computes intelligence
    var student = caseload.find(function (s) { return s.id === studentId; }) || null;
    hubState.set({
      context: { studentId: studentId },
      active_student_context: {
        studentId: String(studentId || ""),
        studentName: student && student.name || "",
        grade: student && (student.gradeBand || student.grade || "") || ""
      }
    });
    renderStudentList(); // refresh active state in list
    /* Notify curriculum panel of selected student grade */
    if (student) {
      window.dispatchEvent(new CustomEvent("cs-student-selected", {
        detail: {
          studentId: studentId,
          studentName: student.name || "",
          grade: student.gradeBand || student.grade || ""
        }
      }));
    }
  }

  /* ── Phase 9: Live signal helpers ───────────────────────── */

  /** Evidence chip row — accuracy, ORF, vowel confusion etc. */
  function buildEvidenceChips(summary) {
    var chips = Array.isArray(summary && summary.evidenceChips) ? summary.evidenceChips : [];
    if (!chips.length) return "";
    var inner = chips.slice(0, 5).map(function (c) {
      return (
        '<span class="th2-ev-chip">' +
        '<span class="th2-ev-chip-label">' + escapeHtml(String(c.label || "")) + '</span>' +
        '<span class="th2-ev-chip-val">'   + escapeHtml(String(c.value || "")) + '</span>' +
        '</span>'
      );
    }).join("");
    return '<div class="th2-ev-chips">' + inner + '</div>';
  }

  /** Live signal pills — MTSS decision + reason, last session, accuracy, ORF */
  function buildLiveSignalPills(studentId, summary, plan) {
    var pills = [];

    /* 1 — MTSS decision pill with inline reason */
    var trendDecision = "HOLD";
    var trendReason   = "";
    var EE = window.CSEvidenceEngine;
    if (EE && typeof EE.computeMtssTrendDecision === "function") {
      var mtss = safe(function () { return EE.computeMtssTrendDecision(studentId, null); });
      if (mtss && mtss.status && mtss.status !== "INSUFFICIENT") {
        trendDecision = String(mtss.status);
        trendReason   = String(mtss.reason || "");
      }
    }
    if (trendDecision === "HOLD" && plan) {
      trendDecision = String(
        (plan.tierSignal && plan.tierSignal.trendDecision) ||
        (plan.trendDecision) || "HOLD"
      );
    }
    var reasonShort = trendReason.length > 40 ? trendReason.slice(0, 38) + "\u2026" : trendReason;
    pills.push(
      '<span class="th2-signal" data-decision="' + escapeHtml(trendDecision) +
      '" title="' + escapeHtml(trendReason) + '">' +
      escapeHtml(trendDecision) +
      (reasonShort ? ' <span class="th2-signal-reason">\u2014 ' + escapeHtml(reasonShort) + '</span>' : '') +
      '</span>'
    );

    /* 2 — Last session timestamp */
    var lastStr = (summary && summary.lastSession && summary.lastSession.timestamp)
      ? relativeDate(summary.lastSession.timestamp)
      : "No session yet";
    pills.push('<span class="th2-signal th2-signal--meta">\u23F1 ' + escapeHtml(lastStr) + '</span>');

    /* 3 & 4 — Accuracy + ORF from evidence store */
    var evChips = Array.isArray(summary && summary.evidenceChips) ? summary.evidenceChips : [];
    var accChip = null, orfChip = null;
    evChips.forEach(function (c) {
      if (c.label === "Accuracy") accChip = c;
      if (c.label === "ORF")      orfChip = c;
    });
    if (accChip) {
      pills.push('<span class="th2-signal th2-signal--acc">\u2714 ' + escapeHtml(accChip.value) + '</span>');
    }
    if (orfChip) {
      pills.push('<span class="th2-signal th2-signal--orf">\u25B6 ' + escapeHtml(orfChip.value) + '</span>');
    }

    return pills.join("\n");
  }

  /** Progress note copy buttons — teacher / parent / team */
  function buildProgressNoteActions(plan) {
    if (!plan || !plan.progressNoteTemplate) return "";
    return [
      '<div class="th2-note-actions">',
      '  <span class="th2-note-actions-label">Copy note</span>',
      '  <button class="th2-note-btn" data-note-type="teacher" type="button">&#x1F4CB; Teacher</button>',
      '  <button class="th2-note-btn" data-note-type="family"  type="button">&#x2709; Parent</button>',
      '  <button class="th2-note-btn" data-note-type="team"    type="button">&#x1F91D; Team</button>',
      '</div>'
    ].join("\n");
  }

  /* ── Phase 10: Caseload health bar ─────────────────────── */

  function buildCaseloadHealthBar(ranked) {
    var high = 0, mod = 0, stable = 0;
    ranked.forEach(function (r) {
      if (r.tier >= 3 || r.daysSince >= 7)      high++;
      else if (r.tier === 2 || r.daysSince >= 4) mod++;
      else                                        stable++;
    });
    var total = ranked.length;
    if (!total) return "";
    var hp = Math.round(high / total * 100);
    var mp = Math.round(mod  / total * 100);
    var sp = 100 - hp - mp;
    return [
      '<div class="th2-health-wrap">',
      '  <div class="th2-health-bar" title="Caseload health distribution">',
      (hp      ? '<div class="th2-health-seg th2-health-seg--high"   style="width:' + hp + '%"></div>' : ''),
      (mp      ? '<div class="th2-health-seg th2-health-seg--mod"    style="width:' + mp + '%"></div>' : ''),
      (sp > 0  ? '<div class="th2-health-seg th2-health-seg--stable" style="width:' + sp + '%"></div>' : ''),
      '  </div>',
      '  <div class="th2-health-legend">',
      (high   ? '<span class="th2-health-dot th2-health-dot--high">'   + high   + ' high risk</span>'  : ''),
      (mod    ? '<span class="th2-health-dot th2-health-dot--mod">'    + mod    + ' developing</span>' : ''),
      (stable ? '<span class="th2-health-dot th2-health-dot--stable">' + stable + ' stable</span>'     : ''),
      '  </div>',
      '</div>'
    ].join("\n");
  }

  /* ── Phase 12: Onboarding (first-use, empty caseload) ───── */

  function renderOnboarding() {
    if (!el.emptyState) return;
    el.emptyState.innerHTML = [
      '<div class="th2-onboarding">',
      '  <div class="th2-onboarding-icon">&#x1F4DA;</div>',
      '  <h2 class="th2-onboarding-title">Welcome to Cornerstone MTSS</h2>',
      '  <p class="th2-onboarding-sub">Your context-first teacher hub for the day\'s schedule, caseload, and class support.</p>',
      '  <ol class="th2-onboarding-steps">',
      '    <li class="th2-onboarding-step">',
      '      <span class="th2-step-num">1</span>',
      '      <div><strong>Add students</strong><p>Click <em>+ Add Student</em> to build your caseload.</p></div>',
      '    </li>',
      '    <li class="th2-onboarding-step">',
      '      <span class="th2-step-num">2</span>',
      '      <div><strong>Log sessions</strong><p>After each session, log results to unlock live intelligence.</p></div>',
      '    </li>',
      '    <li class="th2-onboarding-step">',
      '      <span class="th2-step-num">3</span>',
      '      <div><strong>Get recommendations</strong><p>Cornerstone surfaces MTSS decisions, goals &amp; next steps automatically.</p></div>',
      '    </li>',
      '  </ol>',
      '  <button class="th2-btn th2-btn-primary th2-onboarding-cta" id="th2-onboarding-add" type="button">+ Add your first student</button>',
      '</div>'
    ].join("\n");
    var addBtn = el.emptyState.querySelector("#th2-onboarding-add");
    if (addBtn) addBtn.addEventListener("click", openAddDrawer);
  }

  /* ── Focus card rendering ──────────────────────────────── */

  function renderFocusCard(state) {
    var intelligence = state.intelligence || {};
    var plan = intelligence.plan;
    var studentId = state.context.studentId || "";

    if (!studentId || !plan) {
      showEmptyState();
      return;
    }

    var summary = getStudentSummaryForHub(studentId, caseload.find(function (s) { return s.id === studentId; }) || { id: studentId });
    var student = (summary && summary.student) || caseload.find(function (s) { return s.id === studentId; }) || {};
    var spark = Array.isArray(summary && summary.last7Sparkline) ? summary.last7Sparkline : [];
    var tier = quickTier(summary);
    var trend = quickTrend(summary);

    // Extract recommendation from plan
    var tenMin = plan.plans && plan.plans.tenMin && plan.plans.tenMin[0];
    var recTitle  = String((tenMin && tenMin.title) || (plan.recommendedMove) || "Focused intervention");
    var recReason = String((tenMin && tenMin.reason) || (plan.reasoning && plan.reasoning[0]) || "Based on recent skill signals.");
    var launch    = tenMin && tenMin.launch;

    // Tier signal from plan or TierEngine
    var trendDecision = String(
      (plan.tierSignal && plan.tierSignal.trendDecision) ||
      (plan.trendDecision) ||
      "HOLD"
    );

    // Build sparkline path
    var sparkPath = buildSparkPath(spark);
    var deltaClass = trend === "up" ? "th2-delta-up" : (trend === "down" ? "th2-delta-down" : "th2-delta-stable");
    var deltaLabel = trend === "up" ? "↑ improving" : (trend === "down" ? "↓ declining" : "→ stable");

    // Activity href
    var activityHref = launch ? toActivityHref(launch, studentId) : "word-quest.html?play=1&student=" + encodeURIComponent(studentId) + "&from=hub";

    // Set tier on card element for CSS stripe color
    el.focusCard.setAttribute("data-tier", String(tier));

    var grade = escapeHtml(student.gradeBand || student.grade || "");
    var lastSeenLabel = summary && summary.lastSession
      ? relativeDate(summary.lastSession.timestamp) : "No sessions yet";
    var nameMeta = [grade, lastSeenLabel].filter(Boolean).join(" · ");

    el.focusCard.innerHTML = [
      /* Student header */
      '<div class="th2-focus-head">',
      '  <div class="th2-focus-identity">',
      '    ' + buildAvatar(student.name || "Student", studentId),
      '    <div class="th2-focus-name-block">',
      '      <div class="th2-focus-name-row">',
      '        <h2 class="th2-focus-name">' + escapeHtml(student.name || "Student") + '</h2>',
      '        <span class="th2-focus-tier" data-tier="' + tier + '">' + tierLabel(tier) + '</span>',
      renderFpBadge(studentId),
      renderToolBadges(studentId),
      '      </div>',
      (nameMeta ? '      <span class="th2-focus-name-meta">' + nameMeta + '</span>' : ''),
      renderUdlStrip(studentId),
      '    </div>',
      '  </div>',
      '  <div class="th2-focus-trend">',
      sparkPath
        ? '<svg class="th2-sparkline is-animating" viewBox="0 0 100 26" preserveAspectRatio="none" aria-hidden="true"><path class="th2-spark-path" d="' + sparkPath + '"/></svg>'
        : '',
      '    <span class="th2-delta ' + deltaClass + '">' + deltaLabel + '</span>',
      '  </div>',
      '</div>',

      /* Recommendation block */
      '<div class="th2-rec">',
      '  <p class="th2-rec-kicker">Recommended session</p>',
      '  <p class="th2-rec-title">' + escapeHtml(recTitle) + '</p>',
      '  <p class="th2-rec-reason">' + escapeHtml(recReason) + '</p>',
      buildEvidenceChips(summary),
      '</div>',

      /* Curriculum alignment — mapped from recommendation.
         Fall back to MODULE_HINT_BY_STUDENT when the plan engine hasn't
         produced a specific launch.module (common in demo / sparse data). */
      renderCurriculumSection(
        recTitle,
        (launch && launch.module ? String(launch.module) : "") || String(MODULE_HINT_BY_STUDENT[studentId] || ""),
        student.gradeBand || student.grade || ""
      ),

      /* Domain goals — subject- and goal-specific performance levels */
      buildDomainGoalsSection(studentId),

      /* Signal pills — live data from evidence + plan engines */
      '<div class="th2-signals">',
      buildLiveSignalPills(studentId, summary, plan),
      '</div>',

      /* Actions */
      '<div class="th2-actions">',
      '  <a class="th2-btn th2-btn-primary" href="' + escapeHtml(activityHref) + '">Start Recommended Session</a>',
      '  <a class="th2-btn th2-btn-quiet" href="' + escapeHtml(appendGameContextParams("game-platform.html")) + '">Open Game Platform</a>',
      '  <a class="th2-btn th2-btn-quiet" href="student-profile.html?student=' + encodeURIComponent(studentId) + '&from=hub">Open Student Profile</a>',
      '</div>',
      buildProgressNoteActions(plan),

      /* Support panel — auto-surfaces below actions */
      renderSupportPanel(studentId)
    ].join("\n");

    /* Wire lesson navigator prev/next buttons */
    bindLessonNavEvents(el.focusCard);

    showFocusCard();
  }

  /* ── Hero card for morning brief ─────────────────────── */
  function buildHeroCard(r) {
    if (!r) return "";
    var lastStr  = r.daysSince === 0 ? "Today" : r.daysSince < 999 ? r.daysSince + "d ago" : "Never";
    var gradeStr = escapeHtml(r.student.grade || r.student.gradeBand || "");
    var tierMod  = "th2-hero-card--t" + r.tier;
    var showPriority = r.tier >= 2 || r.daysSince >= 5;
    return [
      '<button class="th2-hero-card ' + tierMod + '" data-id="' + escapeHtml(r.student.id) + '" data-tier="' + r.tier + '" type="button">',
      '  <div class="th2-hero-card-top">',
      '    ' + buildAvatar(r.student.name, r.student.id, false),
      '    <div class="th2-hero-card-identity">',
      '      <span class="th2-hero-card-name">' + escapeHtml(r.student.name) + '</span>',
      '      <div class="th2-hero-card-meta">',
      '        <span class="th2-tier-chip" data-tier="' + r.tier + '">' + tierLabel(r.tier) + '</span>',
      (gradeStr ? '        <span class="th2-hero-card-grade">' + gradeStr + '</span>' : ''),
      '        <span class="th2-hero-card-last">&middot; ' + escapeHtml(lastStr) + '</span>',
      '      </div>',
      '    </div>',
      (showPriority ? '    <span class="th2-hero-priority-badge">Priority</span>' : ''),
      '  </div>',
      (r.recTitle
        ? '<div class="th2-hero-card-rec"><span class="th2-hero-rec-label">Recommended next</span><span class="th2-hero-rec-title">' + escapeHtml(r.recTitle) + '</span></div>'
        : ''),
      '</button>'
    ].join("\n");
  }

  /* ── Morning brief ──────────────────────────────────────── */

  function renderMorningBrief() {
    if (!el.emptyState || !caseload.length) return;
    if (searchResults && searchResultCount(searchResults)) {
      renderSearchResults();
      return;
    }
    renderCommandCenter(getTodayLessonBlocks()[0] || null, { mode: "caseload" });
  }

  function renderSearchResults() {
    if (!el.emptyState || !searchResults) return;
    var groups = searchResults.groups || {};
    el.emptyState.innerHTML = [
      '<div class="th2-today-panel">',
      '  <p class="th2-today-title">Global Search</p>',
      '  <p class="th2-today-sub">Search by student, class, curriculum, resource, diagnostic, or intervention tool. Results open into the right context.</p>',
      renderSearchSection("Students", groups.student, "data-search-id"),
      renderSearchSection("Classes Today", groups.class, "data-search-id"),
      renderSearchSection("Curriculum", groups.curriculum, "data-search-id"),
      renderSearchSection("Resources", groups.resource, "data-search-id"),
      renderSearchSection("Diagnostics", groups.diagnostic, "data-search-id"),
      renderSearchSection("Intervention Tools", (groups.intervention || []).concat(groups.tool || []), "data-search-id"),
      (!searchResultCount(searchResults) ? '<p class="th2-today-sub">No matches found for this search yet.</p>' : ""),
      '</div>'
    ].join("");
    el.emptyState.querySelectorAll(".th2-search-result").forEach(function (btn) {
      btn.addEventListener("click", function () {
        var kind = btn.getAttribute("data-search-kind") || "";
        var id = btn.getAttribute("data-search-id") || "";
        if (kind === "student" && id) {
          selectStudent(id);
          return;
        }
        if (kind === "class" && id) {
          el.modeTabs.forEach(function (tab) {
            var active = tab.getAttribute("data-mode") === "class";
            tab.classList.toggle("is-active", active);
            tab.setAttribute("aria-selected", active ? "true" : "false");
          });
          var classContext = TeacherSelectors && typeof TeacherSelectors.buildClassContext === "function"
            ? TeacherSelectors.buildClassContext(TeacherSelectors.getBlockById(id, todayKey(), { TeacherStorage: TeacherStorage }), { TeacherStorage: TeacherStorage })
            : null;
          hubState.set({
            context: { mode: "class", classId: id, studentId: "" },
            active_class_context: {
              classId: id,
              label: classContext && classContext.label || "",
              supportType: classContext && classContext.supportType || "",
              lessonContextId: classContext && classContext.lessonContextId || ""
            }
          });
          return;
        }
        if (kind === "curriculum" && id) {
          var curriculumItem = (hubState.get().search_context.results || []).filter(function (row) {
            return row && row.id === id;
          })[0] || null;
          if (curriculumItem && curriculumItem.payload && curriculumItem.payload.id) {
            var curriculumContext = TeacherSelectors && typeof TeacherSelectors.buildClassContext === "function"
              ? TeacherSelectors.buildClassContext(curriculumItem.payload, { TeacherStorage: TeacherStorage })
              : null;
            hubState.set({
              context: { mode: "class", classId: curriculumItem.payload.id, studentId: "" },
              active_class_context: {
                classId: curriculumItem.payload.id,
                label: curriculumContext && curriculumContext.label || "",
                supportType: curriculumContext && curriculumContext.supportType || "",
                lessonContextId: curriculumContext && curriculumContext.lessonContextId || ""
              }
            });
            return;
          }
        }
        var item = HUB_SEARCH_RESOURCES.filter(function (row) { return row.id === id; })[0] || null;
        if (!item) return;
        if (item.action === "brief" && window.CSLessonBriefPanel && window.CSLessonBriefPanel.toggle) {
          window.CSLessonBriefPanel.toggle(lessonBriefContext());
          return;
        }
        if (item.action === "curriculum") {
          var curBtn = document.getElementById("th2-cur-btn");
          if (curBtn) curBtn.click();
          return;
        }
        if (item.href) window.location.href = appendGameContextParams(item.href);
      });
    });
  }

  /* ── Empty / focused state toggle ──────────────────────── */

  function showEmptyState() {
    if (el.emptyState) { el.emptyState.classList.remove("hidden"); el.emptyState.removeAttribute("aria-hidden"); }
    if (el.focusCard)  { el.focusCard.classList.add("hidden"); el.focusCard.setAttribute("aria-hidden", "true"); }
    var mode = hubState.get().context.mode;
    if (mode === "class") { renderClassSnapshot(); return; }
    if (el.search && String(el.search.value || "").trim()) { renderSearchResults(); return; }
    if (!caseload.length) { renderCommandCenter(null); return; }
    renderMorningBrief();
  }

  function showFocusCard() {
    if (el.emptyState) { el.emptyState.classList.add("hidden"); el.emptyState.setAttribute("aria-hidden", "true"); }
    if (el.focusCard)  { el.focusCard.classList.remove("hidden"); el.focusCard.removeAttribute("aria-hidden"); }
  }

  /* ── Today's Classes snapshot ─────────────────────────── */
  function buildSnapshotCard(student) {
    var summary  = getStudentSummaryForHub(student.id, student);
    var tier     = quickTier(summary);
    var gradeStr = escapeHtml(student.grade || student.gradeBand || "");
    return [
      '<button class="th2-snapshot-card" data-id="' + escapeHtml(student.id) + '" data-tier="' + tier + '" type="button">',
      '  ' + buildAvatar(student.name, student.id, true),
      '  <div class="th2-snapshot-card-body">',
      '    <span class="th2-snapshot-card-name">' + escapeHtml(student.name) + '</span>',
      '    <span class="th2-snapshot-card-meta">' + (gradeStr ? 'Gr ' + gradeStr + ' &middot; ' : '') + '<span class="th2-tier-chip" data-tier="' + tier + '">' + tierLabel(tier) + '</span></span>',
      '  </div>',
      '</button>'
    ].join("\n");
  }

  function renderClassSnapshot() {
    if (!el.emptyState) return;
    var blocks = getTodayLessonBlocks();
    var selectedBlockId = hubState.get().context.classId || "";

    // If a block is explicitly selected, show its command center
    if (selectedBlockId) {
      var activeBlock = blocks.filter(function (b) { return b.id === selectedBlockId; })[0] || null;
      if (activeBlock) {
        renderCommandCenter(activeBlock, { mode: "class" });
        return;
      }
    }

    // Default: show the daily schedule view
    renderDailyScheduleMain(blocks);
  }

  function renderDailyScheduleMain(blocks) {
    if (!el.emptyState) return;

    // No caseload and no blocks → demo seed
    if (!caseload.length && !blocks.length) {
      renderCommandCenter(null);
      return;
    }

    var today = new Date();
    var dayStr = today.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" });
    var totalStudents = blocks.reduce(function (acc, b) {
      return acc + (b.studentIds ? b.studentIds.length : 0);
    }, 0);
    var summaryLine = blocks.length
      ? blocks.length + " class" + (blocks.length !== 1 ? "es" : "") + (totalStudents ? " · " + totalStudents + " student" + (totalStudents !== 1 ? "s" : "") : "")
      : "No classes scheduled";

    var blockCards = blocks.map(function (block) {
      var label = escapeHtml(block.label || block.classSection || "Class");
      var time = escapeHtml(block.timeLabel || "");
      var sub = [escapeHtml(block.subject || ""), escapeHtml(block.supportType || "")].filter(Boolean).join(" · ");
      var count = block.studentIds && block.studentIds.length;
      return [
        '<button class="th2-day-sched-block" data-open-block="' + escapeHtml(block.id) + '" type="button">',
        (time ? '<span class="th2-day-sched-time">' + time + '</span>' : ""),
        '<span class="th2-day-sched-name">' + label + "</span>",
        (sub ? '<span class="th2-day-sched-sub">' + sub + "</span>" : ""),
        (count ? '<span class="th2-day-sched-count">' + count + " student" + (count !== 1 ? "s" : "") + "</span>" : ""),
        "</button>"
      ].join("");
    }).join("");

    var emptySlot = !blocks.length
      ? '<div class="th2-day-sched-empty"><p class="th2-day-sched-empty-msg">Your day is clear — no classes have been added yet.</p><p class="th2-day-sched-empty-sub">Use the panel below to add intervention sessions and support groups for today.</p></div>'
      : "";

    el.emptyState.innerHTML = [
      '<div class="th2-day-schedule-view">',
      '<header class="th2-day-sched-header">',
      '<div class="th2-day-sched-meta">',
      '<p class="th2-day-sched-date">' + escapeHtml(dayStr) + "</p>",
      '<p class="th2-day-sched-summary">' + escapeHtml(summaryLine) + "</p>",
      "</div>",
      '<button class="th2-day-sched-add-btn" data-open-brief="1" type="button">+ Add class</button>',
      "</header>",
      '<div class="th2-day-sched-list">',
      blockCards + emptySlot,
      "</div>",
      "</div>"
    ].join("");
  }

  function showTodaysClasses() {
    if (el.emptyState) { el.emptyState.classList.remove("hidden"); el.emptyState.removeAttribute("aria-hidden"); }
    if (el.focusCard)  { el.focusCard.classList.add("hidden"); el.focusCard.setAttribute("aria-hidden", "true"); }
    renderSidebarSchedule();
    renderClassSnapshot();
  }

  /* ── HubState subscription → render ────────────────────── */

  hubState.subscribe(function (state) {
    var mode = state.context.mode || "caseload";
    if (mode === "class") { showTodaysClasses(); return; }
    var studentId = state.context.studentId || "";
    if (!studentId) {
      showEmptyState();
      return;
    }
    // Intelligence is populated by HubContext after studentId changes
    if (state.intelligence && state.intelligence.plan) {
      renderFocusCard(state);
    } else {
      // Student selected but plan not yet ready — show a clear loading placeholder
      if (el.emptyState) {
        el.emptyState.classList.remove("hidden");
        el.emptyState.removeAttribute("aria-hidden");
        var studentName = state.active_student_context && state.active_student_context.studentName || "";
        el.emptyState.innerHTML = '<div class="th2-empty-inner"><p class="th2-empty-label">' +
          escapeHtml(studentName || "Student") + '</p>' +
          '<p class="th2-empty-sub">Loading recommendation\u2026</p></div>';
      }
      if (el.focusCard) { el.focusCard.classList.add("hidden"); el.focusCard.setAttribute("aria-hidden", "true"); }
    }
    // Sync drawer open state
    var drawer = document.getElementById("th2-drawer");
    if (state.ui && state.ui.drawerOpen && drawer && !drawer.classList.contains("is-open")) {
      openDrawer(studentId);
    }
  });

  /* ── Add Student drawer ──────────────────────────────── */
  function openAddDrawer() {
    var addDrawer = document.getElementById("th2-add-drawer");
    if (!addDrawer) return;
    renderAddStudentForm();
    addDrawer.classList.add("is-open");
    addDrawer.removeAttribute("aria-hidden");
    var overlay = document.getElementById("th2-overlay");
    if (overlay) { overlay.classList.remove("hidden"); overlay.removeAttribute("aria-hidden"); }
  }

  function closeAddDrawer() {
    var addDrawer = document.getElementById("th2-add-drawer");
    if (!addDrawer) return;
    addDrawer.classList.remove("is-open");
    addDrawer.setAttribute("aria-hidden", "true");
    if (!hubState.get().ui.drawerOpen) {
      var overlay = document.getElementById("th2-overlay");
      if (overlay) { overlay.classList.add("hidden"); overlay.setAttribute("aria-hidden", "true"); }
    }
  }

  function renderAddStudentForm() {
    var body = document.getElementById("th2-add-body");
    if (!body) return;
    var grades    = ["K","1","2","3","4","5"];
    var skillDoms = ["Phonics","Phonemic Awareness","Fluency","Comprehension","Numeracy","Vocabulary"];
    var fpLetters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");
    var levelOpts = [4,3,2,1].map(function (lv) {
      return '<option value="' + lv + '">' + lv + ' — ' + levelLabel(lv) + '</option>';
    }).join("");
    body.innerHTML = [
      '<form id="th2-add-form" class="th2-add-form" autocomplete="off">',
      '  <label class="th2-add-field">',
      '    <span class="th2-add-label">Student name</span>',
      '    <input id="th2-add-name" class="th2-add-input" type="text" placeholder="First Last" required maxlength="60">',
      '  </label>',
      '  <div class="th2-add-field">',
      '    <p class="th2-add-label">Grade</p>',
      '    <div class="th2-add-chip-row" id="th2-add-grade-chips">',
      grades.map(function (g) {
        return '      <button type="button" class="th2-add-chip" data-grade="' + g + '">' + g + '</button>';
      }).join("\n"),
      '    </div>',
      '  </div>',
      '  <div class="th2-add-field">',
      '    <p class="th2-add-label">Focus area <span class="th2-add-label-opt">(optional)</span></p>',
      '    <div class="th2-add-chip-row" id="th2-add-domain-chips">',
      skillDoms.map(function (d) {
        return '      <button type="button" class="th2-add-chip" data-domain="' + escapeHtml(d) + '">' + escapeHtml(d) + '</button>';
      }).join("\n"),
      '    </div>',
      '  </div>',

      /* Performance levels per subject */
      '  <div class="th2-add-field">',
      '    <p class="th2-add-label">Subject performance levels <span class="th2-add-label-opt">(optional — set now or later in View Details)</span></p>',
      '    <div class="th2-add-level-grid">',
      DOMAINS.map(function (d) {
        return [
          '<label class="th2-add-level-row">',
          '  <span class="th2-add-level-label">' + escapeHtml(d.label) + '</span>',
          '  <select class="th2-add-level-sel" data-level-domain="' + d.key + '" aria-label="' + escapeHtml(d.label) + ' level">',
          '    <option value="">—</option>',
          levelOpts,
          '  </select>',
          '</label>'
        ].join("\n");
      }).join("\n"),
      '    </div>',
      '  </div>',

      /* F&P level */
      '  <div class="th2-add-field">',
      '    <p class="th2-add-label">F&amp;P level <span class="th2-add-label-opt">(optional)</span></p>',
      '    <div class="th2-add-fp-grid">',
      fpLetters.map(function (l) {
        return '      <button type="button" class="th2-add-fp-btn" data-fp="' + l + '">' + l + '</button>';
      }).join("\n"),
      '    </div>',
      '  </div>',

      /* Confidential plan types */
      '  <div class="th2-add-field th2-add-field--confidential">',
      '    <p class="th2-add-label">🔒 Support plans <span class="th2-add-label-opt">(confidential — not shown on student list)</span></p>',
      '    <div class="th2-add-chip-row" id="th2-add-plan-chips">',
      PLAN_TYPES.map(function (p) {
        return '      <button type="button" class="th2-add-chip th2-add-chip--plan" data-plan="' + p + '">' + p + '</button>';
      }).join("\n"),
      '    </div>',
      '  </div>',

      '  <div class="th2-add-actions">',
      '    <button type="submit" class="th2-btn th2-btn-primary">Add Student</button>',
      '    <button type="button" id="th2-add-cancel" class="th2-btn th2-btn-quiet">Cancel</button>',
      '  </div>',
      '</form>'
    ].join("\n");

    var selectedGrade   = "";
    var selectedDomains = [];
    var selectedFp      = "";
    var selectedPlans   = [];
    var selectedLevels  = {}; // { [domain]: level (1-4) }

    body.querySelectorAll("[data-grade]").forEach(function (btn) {
      btn.addEventListener("click", function () {
        body.querySelectorAll("[data-grade]").forEach(function (b) { b.classList.remove("is-selected"); });
        if (selectedGrade === btn.getAttribute("data-grade")) {
          selectedGrade = "";
        } else {
          selectedGrade = btn.getAttribute("data-grade");
          btn.classList.add("is-selected");
        }
      });
    });

    body.querySelectorAll("[data-domain]").forEach(function (btn) {
      btn.addEventListener("click", function () {
        var d   = btn.getAttribute("data-domain");
        var idx = selectedDomains.indexOf(d);
        if (idx === -1) { selectedDomains.push(d); btn.classList.add("is-selected"); }
        else            { selectedDomains.splice(idx, 1); btn.classList.remove("is-selected"); }
      });
    });

    body.querySelectorAll(".th2-add-fp-btn").forEach(function (btn) {
      btn.addEventListener("click", function () {
        body.querySelectorAll(".th2-add-fp-btn").forEach(function (b) { b.classList.remove("is-selected"); });
        if (selectedFp === btn.getAttribute("data-fp")) {
          selectedFp = "";
        } else {
          selectedFp = btn.getAttribute("data-fp");
          btn.classList.add("is-selected");
        }
      });
    });

    /* Wire plan type chips */
    body.querySelectorAll("[data-plan]").forEach(function (btn) {
      btn.addEventListener("click", function (e) {
        e.preventDefault();
        var p   = btn.getAttribute("data-plan");
        var idx = selectedPlans.indexOf(p);
        if (idx === -1) { selectedPlans.push(p); btn.classList.add("is-selected"); }
        else            { selectedPlans.splice(idx, 1); btn.classList.remove("is-selected"); }
      });
    });

    /* Wire subject level selects */
    body.querySelectorAll("[data-level-domain]").forEach(function (sel) {
      sel.addEventListener("change", function () {
        var dom = sel.getAttribute("data-level-domain");
        var val = parseInt(sel.value, 10);
        if (val && val >= 1 && val <= 4) { selectedLevels[dom] = val; }
        else { delete selectedLevels[dom]; }
      });
    });

    var cancelBtn = document.getElementById("th2-add-cancel");
    if (cancelBtn) cancelBtn.addEventListener("click", closeAddDrawer);

    var form = document.getElementById("th2-add-form");
    if (form) {
      form.addEventListener("submit", function (e) {
        e.preventDefault();
        submitAddStudent(selectedGrade, selectedDomains, selectedFp, selectedPlans, selectedLevels);
      });
    }
  }

  function submitAddStudent(grade, domains, fpLevel, plans, levels) {
    var nameEl = document.getElementById("th2-add-name");
    var name   = nameEl ? nameEl.value.trim() : "";
    if (!name) { showToast("Please enter a student name.", "warn"); return; }
    var submitBtn = document.querySelector("#th2-add-form button[type='submit']");
    if (submitBtn) submitBtn.textContent = "Adding...";
    var id = "s_" + Date.now();
    safe(function () {
      var studentRecord = { id: id, name: name, gradeBand: grade || "", tags: [] };
      // Save support plans if any
      if (plans && plans.length) { studentRecord.plans = plans; }
      Evidence.upsertStudent(studentRecord);
      if (domains && domains.length && window.CSSupportStore) {
        window.CSSupportStore.setNeeds(id, domains);
      }
      if (fpLevel) setFpLevel(id, fpLevel);
      // Save initial subject level goals
      if (levels && Object.keys(levels).length > 0) {
        var initialGoals = DOMAINS
          .filter(function (d) { return levels.hasOwnProperty(d.key); })
          .map(function (d) {
            return { domain: d.key, skill: d.label + " (initial level)", level: levels[d.key] };
          });
        if (initialGoals.length) saveStudentGoals(id, initialGoals);
      }
    });
    caseload.push({ id: id, name: name, grade: grade || "", gradeBand: grade || "", tags: [] });
    renderCaseload(caseload);
    showToast(name + " added to caseload! ✓", "success");
    setTimeout(function () {
      closeAddDrawer();
      selectStudent(id);
      if (submitBtn) submitBtn.textContent = "Add Student";
    }, 1200);
  }

  /* ── Event wiring ──────────────────────────────────────── */

  // Student list click delegation
  if (el.list) {
    el.list.addEventListener("click", function (e) {
      var btn = e.target.closest(".th2-student");
      if (!btn) return;
      var sid = btn.getAttribute("data-id") || "";
      if (sid) selectStudent(sid);
    });
  }

  // Search
  if (el.search) {
    el.search.addEventListener("input", function () {
      filterCaseload(el.search.value);
    });
  }

  // Mode tabs (My Caseload / Today's Classes)
  el.modeTabs.forEach(function (tab) {
    tab.addEventListener("click", function () {
      el.modeTabs.forEach(function (t) {
        t.classList.remove("is-active");
        t.setAttribute("aria-selected", "false");
      });
      tab.classList.add("is-active");
      tab.setAttribute("aria-selected", "true");
      var mode = tab.getAttribute("data-mode") || "caseload";
      hubState.set({ context: { mode: mode, studentId: "" } });
      if (mode === "class") { showTodaysClasses(); }
      else { renderStudentList(); showEmptyState(); }
    });
  });

  // View details → open drawer
  document.addEventListener("click", function (e) {
    if (e.target && e.target.id === "th2-view-details") {
      var studentId = hubState.get().context.studentId || "";
      if (studentId) openDrawer(studentId);
    }
  });

  document.addEventListener("click", function (e) {
    var blockBtn = e.target.closest && e.target.closest("[data-open-block]");
    if (!blockBtn) return;
    var blockId = blockBtn.getAttribute("data-open-block") || "";
    if (!blockId) return;
    var blockContext = TeacherSelectors && typeof TeacherSelectors.buildClassContext === "function"
      ? TeacherSelectors.buildClassContext(TeacherSelectors.getBlockById(blockId, todayKey(), { TeacherStorage: TeacherStorage }), { TeacherStorage: TeacherStorage })
      : null;
    hubState.set({
      context: { mode: "class", classId: blockId, studentId: "" },
      active_class_context: {
        classId: blockId,
        label: blockContext && blockContext.label || "",
        supportType: blockContext && blockContext.supportType || "",
        lessonContextId: blockContext && blockContext.lessonContextId || ""
      }
    });
  });

  document.addEventListener("click", function (e) {
    var studentBtn = e.target.closest && e.target.closest("[data-context-student]");
    if (!studentBtn) return;
    var sid = studentBtn.getAttribute("data-context-student") || "";
    if (!sid) return;
    e.preventDefault();
    window.location.href = "student-profile.html?student=" + encodeURIComponent(sid) + "&from=hub";
  });

  document.addEventListener("click", function (e) {
    var backBtn = e.target.closest && e.target.closest("[data-back-to-schedule]");
    if (!backBtn) return;
    hubState.set({ context: { mode: "class", classId: "", studentId: "" } });
    renderDailyScheduleMain(getTodayLessonBlocks());
  });

  document.addEventListener("click", function (e) {
    var briefBtn = e.target.closest && e.target.closest("[data-open-brief]");
    if (!briefBtn) return;
    var blockId = briefBtn.getAttribute("data-open-brief-block") || "";
    if (blockId) {
      var blockContext = TeacherSelectors && typeof TeacherSelectors.buildClassContext === "function"
        ? TeacherSelectors.buildClassContext(TeacherSelectors.getBlockById(blockId, todayKey(), { TeacherStorage: TeacherStorage }), { TeacherStorage: TeacherStorage })
        : null;
      hubState.set({
        active_class_context: {
          classId: blockId,
          label: blockContext && blockContext.label || "",
          supportType: blockContext && blockContext.supportType || "",
          lessonContextId: blockContext && blockContext.lessonContextId || ""
        }
      });
    }
    if (window.CSLessonBriefPanel && window.CSLessonBriefPanel.toggle) {
      window.CSLessonBriefPanel.toggle(lessonBriefContext());
    }
  });

  // Log session inline
  document.addEventListener("click", function (e) {
    var btn = e.target.closest && e.target.closest("#th2-log-session");
    if (!btn) return;
    var studentId = hubState.get().context.studentId || "";
    if (!studentId) return;
    if (Evidence && typeof Evidence.appendSession === "function") {
      safe(function () {
        Evidence.appendSession(studentId, "hub_log", {
          source: "hub-v2",
          timestamp: Date.now(),
          signals: {}
        });
      });
    }
    btn.classList.add("is-logged");
    btn.textContent = "Session logged ✓";
    btn.disabled = true;
    showToast("Session logged.", "success");
    var status = document.getElementById("th2-log-status");
    if (status) status.textContent = relativeDate(Date.now());
  });

  // F&P badge — click to update reading level inline
  document.addEventListener("click", function (e) {
    var badge = e.target.closest && e.target.closest(".th2-fp-badge");
    if (!badge) return;
    var sid = badge.getAttribute("data-fp-student") || "";
    if (!sid) return;
    var current = getFpLevel(sid) || "";
    var raw = window.prompt("Enter F&P reading level (A–Z) for this student:", current);
    if (raw === null) return;                        // cancelled
    var level = String(raw).trim().toUpperCase().slice(0, 1);
    if (level && !FP_VALID.test(level)) {
      window.alert("Please enter a single letter A–Z.");
      return;
    }
    setFpLevel(sid, level);
    // Re-render badge in place
    badge.textContent = level ? "F&P " + level : "";
    if (!level) badge.style.display = "none";
    showToast(level ? "F&P updated to " + level + "." : "F&P level cleared.", "info");
  });

  // Tool badge — click to update (individual badge)
  document.addEventListener("click", function (e) {
    var badge = e.target.closest && e.target.closest("[data-tool-badge]");
    if (!badge) return;
    var tool = badge.getAttribute("data-tool-badge");
    var sid  = badge.getAttribute("data-tool-student") || "";
    if (!sid || !tool) return;
    var current = getToolBadge(sid, tool) || "";
    var promptText = tool === "wtw"
      ? "Words Their Way stage (E / LNA / WWP / SA / DR) — leave blank to clear:"
      : tool === "rn" ? "Read Naturally WPM (e.g. 67) — leave blank to clear:"
      : "Lexia level (e.g. 12) — leave blank to clear:";
    var raw = window.prompt(promptText, current);
    if (raw === null) return;
    var val = String(raw).trim();
    if (tool === "wtw" && val) {
      val = val.toUpperCase();
      if (WTW_STAGES.indexOf(val) === -1) {
        window.alert("WtW stage must be one of: E, LNA, WWP, SA, DR");
        return;
      }
    }
    setToolBadge(sid, tool, val);
    var newLabel = tool === "wtw"   ? (val ? "WtW "   + val        : "")
                 : tool === "rn"    ? (val ? "RN "    + val + " wpm": "")
                 :                    (val ? "Lexia "  + val        : "");
    if (newLabel) { badge.textContent = newLabel; }
    else          { badge.remove(); }
    showToast(val ? "Tool level saved." : "Tool level cleared.", val ? "success" : "info");
  });

  // Tool add button — prompt for all three levels sequentially
  document.addEventListener("click", function (e) {
    var btn = e.target.closest && e.target.closest("[data-tool-add-student]");
    if (!btn) return;
    var sid = btn.getAttribute("data-tool-add-student") || "";
    if (!sid) return;
    var wtw   = window.prompt("Words Their Way stage (E / LNA / WWP / SA / DR) — blank to skip:", getToolBadge(sid, "wtw") || "");
    if (wtw === null) return;
    var rn    = window.prompt("Read Naturally WPM — blank to skip:", getToolBadge(sid, "rn") || "");
    if (rn === null) return;
    var lexia = window.prompt("Lexia level — blank to skip:", getToolBadge(sid, "lexia") || "");
    if (lexia === null) return;
    var wtwVal = String(wtw).trim().toUpperCase();
    if (wtwVal && WTW_STAGES.indexOf(wtwVal) === -1) {
      window.alert("WtW stage must be one of: E, LNA, WWP, SA, DR");
      return;
    }
    setToolBadge(sid, "wtw",   wtwVal);
    setToolBadge(sid, "rn",    String(rn).trim());
    setToolBadge(sid, "lexia", String(lexia).trim());
    // Re-render focus card to show updated badges
    var state = hubState.get();
    if (state.context.studentId === sid && state.intelligence && state.intelligence.plan) {
      renderFocusCard(state);
    }
    showToast("Tool levels saved.", "success");
  });

  // UDL toggle — open/close the chip picker
  document.addEventListener("click", function (e) {
    var btn = e.target.closest && e.target.closest("[data-udl-toggle]");
    if (!btn) return;
    var sid   = btn.getAttribute("data-udl-toggle") || "";
    var strip = btn.closest(".th2-udl-strip");
    if (!sid || !strip) return;
    var existing = strip.querySelector(".th2-udl-picker");
    if (existing) { existing.remove(); return; }
    var active  = getUdlActive(sid);
    var picker  = document.createElement("div");
    picker.className = "th2-udl-picker";
    UDL_CHIPS.forEach(function (c) {
      var chip = document.createElement("button");
      chip.type = "button";
      chip.className = "th2-udl-chip" + (active.indexOf(c.id) !== -1 ? " is-active" : "");
      chip.textContent = c.label;
      chip.addEventListener("click", function (ev) {
        ev.stopPropagation();
        var idx = active.indexOf(c.id);
        if (idx === -1) { active.push(c.id);      chip.classList.add("is-active"); }
        else            { active.splice(idx, 1);   chip.classList.remove("is-active"); }
        setUdlActive(sid, active);
        // Sync the visible active chips above the toggle
        strip.querySelectorAll(".th2-udl-chip[data-udl-id]").forEach(function (el) { el.remove(); });
        UDL_CHIPS.forEach(function (x) {
          if (active.indexOf(x.id) === -1) return;
          var ac = document.createElement("button");
          ac.type = "button";
          ac.className = "th2-udl-chip is-active";
          ac.setAttribute("data-udl-id", x.id);
          ac.textContent = x.label;
          strip.insertBefore(ac, btn);
        });
        btn.textContent = active.length ? "✎ Accommodations" : "+ Accommodations";
      });
      picker.appendChild(chip);
    });
    strip.appendChild(picker);
  });

  // UDL active chip — click active chip to remove it quickly
  document.addEventListener("click", function (e) {
    var chip = e.target.closest && e.target.closest(".th2-udl-chip[data-udl-id]");
    if (!chip) return;
    var strip = chip.closest(".th2-udl-strip");
    if (!strip) return;
    var sid = strip.getAttribute("data-udl-student") || "";
    var id  = chip.getAttribute("data-udl-id") || "";
    if (!sid || !id) return;
    var active = getUdlActive(sid);
    var idx = active.indexOf(id);
    if (idx !== -1) {
      active.splice(idx, 1);
      setUdlActive(sid, active);
      chip.remove();
      var tgl = strip.querySelector("[data-udl-toggle]");
      if (tgl) tgl.textContent = active.length ? "✎ Accommodations" : "+ Accommodations";
      showToast("Accommodation removed.", "info");
    }
  });

  // Drawer close button
  document.addEventListener("click", function (e) {
    if (e.target && e.target.id === "th2-drawer-close") closeDrawer();
  });

  // Overlay click closes drawer
  document.addEventListener("click", function (e) {
    if (e.target && e.target.id === "th2-overlay") {
      closeDrawer();
      closeAddDrawer();
    }
  });

  // Escape key closes drawer
  document.addEventListener("keydown", function (e) {
    if (e.key !== "Escape" && e.key !== "Esc") return;
    var addDrawer = document.getElementById("th2-add-drawer");
    if (addDrawer && addDrawer.classList.contains("is-open")) { closeAddDrawer(); return; }
    if (hubState.get().ui.drawerOpen) closeDrawer();
  });

  // Add Student button
  document.addEventListener("click", function (e) {
    if (e.target && e.target.id === "th2-add-student-btn") openAddDrawer();
  });

  // Phase 9: Progress note copy buttons (focus card)
  document.addEventListener("click", function (e) {
    var btn = e.target.closest && e.target.closest("[data-note-type]");
    if (!btn || !btn.classList.contains("th2-note-btn")) return;
    var noteType = btn.getAttribute("data-note-type") || "teacher";
    var state = hubState.get();
    var plan  = state.intelligence && state.intelligence.plan;
    var tmpl  = plan && plan.progressNoteTemplate;
    if (!tmpl) { showToast("No note available yet.", "info"); return; }
    var text = String(tmpl[noteType] || tmpl.teacher || "");
    if (!text) { showToast("No note for that type.", "info"); return; }
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(function () {
        showToast("Note copied to clipboard \u2713", "success");
        btn.textContent = "\u2714 Copied!";
        setTimeout(function () {
          var label = noteType === "teacher" ? "&#x1F4CB; Teacher"
                    : noteType === "family"  ? "&#x2709; Parent"
                    : "&#x1F91D; Team";
          btn.innerHTML = label;
        }, 1800);
      }).catch(function () {
        window.prompt("Copy this note:", text);
      });
    } else {
      window.prompt("Copy this note:", text);
    }
  });

  // Phase 11: Drawer progress note tabs + copy
  document.addEventListener("click", function (e) {
    var tab = e.target.closest && e.target.closest(".th2-note-tab");
    if (!tab) return;
    var drawerBody = document.getElementById("th2-drawer-body");
    if (!drawerBody) return;
    var target = tab.getAttribute("data-note-target") || "teacher";
    drawerBody.querySelectorAll(".th2-note-tab").forEach(function (t) {
      t.classList.toggle("is-active", t.getAttribute("data-note-target") === target);
    });
    var noteText = drawerBody.querySelector("#th2-note-text");
    if (noteText) {
      var state = hubState.get();
      var plan  = state.intelligence && state.intelligence.plan;
      var tmpl  = plan && plan.progressNoteTemplate;
      noteText.textContent = (tmpl && tmpl[target]) ? String(tmpl[target]) : "No note available.";
      var copyBtn = drawerBody.querySelector("#th2-copy-note");
      if (copyBtn) copyBtn.setAttribute("data-note-target", target);
    }
  });

  document.addEventListener("click", function (e) {
    var btn = e.target.closest && e.target.closest("#th2-copy-note");
    if (!btn) return;
    var noteText = document.querySelector("#th2-note-text");
    var text = noteText ? noteText.textContent : "";
    if (!text) { showToast("No note to copy.", "info"); return; }
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(function () {
        showToast("Note copied to clipboard \u2713", "success");
        btn.textContent = "\u2714 Copied!";
        setTimeout(function () { btn.textContent = "\u2398 Copy to clipboard"; }, 1800);
      }).catch(function () { window.prompt("Copy:", text); });
    } else {
      window.prompt("Copy:", text);
    }
  });

  // Phase 11: IM Cool-Down save
  document.addEventListener("click", function (e) {
    var btn = e.target.closest && e.target.closest("#th2-cooldown-save");
    if (!btn) return;
    var input = document.getElementById("th2-cooldown-score");
    if (!input) return;
    var val = parseInt(input.value, 10);
    if (isNaN(val) || val < 0 || val > 4) {
      showToast("Enter a score 0\u20134.", "info");
      return;
    }
    var studentId = hubState.get().context.studentId || "";
    if (studentId) {
      safe(function () {
        Evidence.appendSession(studentId, "im_cooldown", {
          source: "hub-v2-cooldown",
          timestamp: Date.now(),
          signals: { cooldownScore: val }
        });
      });
    }
    var hint = document.getElementById("th2-cooldown-group-hint");
    if (hint) {
      var group = val <= 1 ? "Small-group pull-out (intensive)"
                : val === 2 ? "Partner/guided group"
                : val === 3 ? "Independent + extension"
                : "Extension challenge";
      hint.innerHTML = '<span class="th2-cooldown-group">' + escapeHtml(group) + '</span>';
    }
    btn.textContent = "Saved \u2713";
    btn.disabled = true;
    showToast("Cool-down score logged.", "success");
  });

  // Add Student drawer close button
  document.addEventListener("click", function (e) {
    if (e.target && e.target.id === "th2-add-drawer-close") closeAddDrawer();
  });

  /* ── Cost dashboard initialization ──────────────────────────────────── */
  function initCostDashboard() {
    var dashboard = document.getElementById("th2-cost-dashboard");
    var closeBtn = document.getElementById("th2-cost-dashboard-close");

    if (!dashboard || !window.CSCostTracker) return;

    // Initialize cost tracker
    window.CSCostTracker.init();

    // Cost dashboard stays hidden by default — user can open via menu if needed
    // Previous behavior auto-showed on localhost which blocked morning brief content

    // Update display with initial stats
    updateCostDisplay();

    // Close button handler
    if (closeBtn) {
      closeBtn.addEventListener("click", function () {
        dashboard.classList.add("hidden");
      });
    }

    // Listen for cost tracking events
    window.addEventListener("cs-cost-tracked", function (e) {
      updateCostDisplay();
    });
  }

  function updateCostDisplay() {
    if (!window.CSCostTracker) return;

    var stats = window.CSCostTracker.getMonthlyStats();
    var dashboard = document.getElementById("th2-cost-dashboard");
    var monthlyEl = document.getElementById("th2-cost-monthly");
    var callsEl = document.getElementById("th2-cost-calls");
    var budgetEl = document.getElementById("th2-cost-budget");
    var fillEl = document.getElementById("th2-cost-progress-fill");
    var labelEl = document.getElementById("th2-cost-progress-label");
    var warningEl = document.getElementById("th2-cost-warning");

    if (monthlyEl) monthlyEl.textContent = "$" + stats.totalCost.toFixed(2);
    if (callsEl) callsEl.textContent = String(stats.callCount);
    if (budgetEl) budgetEl.textContent = "$" + stats.budgetRemaining.toFixed(2) + " remaining";
    if (fillEl) fillEl.style.width = Math.min(stats.percentOfBudget, 100) + "%";
    if (labelEl) labelEl.textContent = stats.percentOfBudget.toFixed(1) + "% of budget";

    // Show warning if over budget
    if (warningEl) {
      if (stats.totalCost > 5.0) {
        warningEl.classList.add("active");
      } else {
        warningEl.classList.remove("active");
      }
    }
  }

  /* ── Google Auth + Classroom sync ──────────────────────────────────── */

  function initGoogleAuth() {
    var chipEl       = document.getElementById("th2-auth-chip");
    var avatarEl     = document.getElementById("th2-auth-avatar");
    var nameEl       = document.getElementById("th2-auth-name");
    var syncRow      = document.getElementById("th2-classroom-sync-row");
    var signinRow    = document.getElementById("th2-google-signin-row");
    var syncBtn      = document.getElementById("th2-classroom-sync-btn");
    var signinBtn    = document.getElementById("th2-google-signin-btn");
    var signoutBtn   = document.getElementById("th2-google-signout-btn");

    var Auth      = window.CSGoogleAuth;
    var Classroom = window.CSGoogleClassroom;

    if (!Auth) return; /* Auth module not loaded — Google config missing */

    Auth.init();

    Auth.onAuthChange(function (user) {
      if (user) {
        /* Signed in — show chip + sync row, hide sign-in row */
        if (chipEl)    chipEl.classList.remove("hidden");
        if (syncRow)   syncRow.classList.remove("hidden");
        if (signinRow) signinRow.classList.add("hidden");
        if (nameEl)    nameEl.textContent = user.name ? user.name.split(" ")[0] : user.email;
        if (avatarEl && user.picture) {
          avatarEl.src = user.picture;
          avatarEl.alt = user.name || "Google account";
        }
      } else {
        /* Signed out — hide chip + sync row */
        if (chipEl)    chipEl.classList.add("hidden");
        if (syncRow)   syncRow.classList.add("hidden");
        /* Show sign-in row only if auth module is configured */
        if (signinRow && Auth.isConfigured()) {
          signinRow.classList.remove("hidden");
        }
      }
    });

    /* Sign-in button */
    if (signinBtn) {
      signinBtn.addEventListener("click", function () {
        signinBtn.textContent = "Signing in…";
        signinBtn.disabled = true;
        Auth.signIn().catch(function (err) {
          showToast("Google sign-in failed: " + err.message, "error");
          signinBtn.innerHTML = '<svg width="14" height="14" viewBox="0 0 24 24" aria-hidden="true"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/></svg>Sign in with Google';
          signinBtn.disabled = false;
        });
      });
    }

    /* Sign-out button */
    if (signoutBtn) {
      signoutBtn.addEventListener("click", function () {
        Auth.signOut();
        showToast("Signed out of Google.", "info");
      });
    }

    /* Classroom sync button — opens course picker */
    if (syncBtn && Classroom) {
      syncBtn.addEventListener("click", function () {
        openClassroomModal();
      });
    }
  }

  function openClassroomModal() {
    var modal     = document.getElementById("th2-classroom-modal");
    var body      = document.getElementById("th2-classroom-modal-body");
    var closeBtn  = document.getElementById("th2-classroom-modal-close");
    var Classroom = window.CSGoogleClassroom;

    if (!modal || !Classroom) return;
    modal.classList.remove("hidden");

    if (body) body.innerHTML = "<p class='th2-classroom-modal-loading'>Loading your courses…</p>";

    if (closeBtn) {
      closeBtn.onclick = function () { modal.classList.add("hidden"); };
    }
    modal.addEventListener("click", function (e) {
      if (e.target === modal) modal.classList.add("hidden");
    }, { once: true });

    Classroom.fetchCourses().then(function (courses) {
      if (!body) return;
      if (!courses.length) {
        body.innerHTML = "<p class='th2-classroom-modal-loading'>No active courses found in your Google Classroom.</p>";
        return;
      }
      var html = "";
      courses.forEach(function (c) {
        html += "<div class='th2-classroom-course-item'>" +
          "<div><div class='th2-classroom-course-name'>" + escHtml(c.name) + "</div>" +
          (c.section ? "<div class='th2-classroom-course-section'>" + escHtml(c.section) + "</div>" : "") +
          "</div>" +
          "<button class='th2-classroom-sync-course-btn' data-course-id='" + escHtml(c.id) + "' data-course-name='" + escHtml(c.name) + "'>Sync</button>" +
          "</div>";
      });
      body.innerHTML = html;

      /* Wire sync buttons */
      body.querySelectorAll(".th2-classroom-sync-course-btn").forEach(function (btn) {
        btn.addEventListener("click", function () {
          var courseId   = btn.getAttribute("data-course-id");
          var courseName = btn.getAttribute("data-course-name");
          btn.textContent = "Syncing…";
          btn.disabled = true;
          Classroom.syncRosterToHub(courseId).then(function (result) {
            modal.classList.add("hidden");
            showToast("Synced " + result.added + " student(s) from '" + courseName + "' (" + result.skipped + " already in caseload).", "success");
            /* Reload caseload to show new students */
            loadCaseload();
          }).catch(function (err) {
            btn.textContent = "Retry";
            btn.disabled = false;
            showToast("Classroom sync failed: " + err.message, "error");
          });
        });
      });
    }).catch(function (err) {
      if (body) body.innerHTML = "<p class='th2-classroom-modal-loading'>Error: " + escHtml(err.message) + "</p>";
    });
  }

  function escHtml(str) {
    return String(str || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  /* ── Tour + Analytics wiring ────────────────────────────────────────── */

  function initTourAndAnalytics() {
    /* Tour replay button in sidebar footer */
    var tourBtn = document.getElementById("th2-tour-btn");
    if (tourBtn && window.CSTour) {
      tourBtn.addEventListener("click", function () {
        /* Init tour on first click (lazy init), replay on subsequent clicks */
        if (!window.CSTour._initialized) {
          window.CSTour.init();
          window.CSTour._initialized = true;
        } else {
          window.CSTour.replay();
        }
        if (window.CSAnalytics) window.CSAnalytics.track("tour_replayed", {});
      });
    }

    /* Analytics button in sidebar footer */
    var analyticsBtn = document.getElementById("th2-analytics-btn");
    if (analyticsBtn && window.CSAnalytics) {
      analyticsBtn.addEventListener("click", function () {
        window.CSAnalytics.openAdminPanel();
      });
    }

    /* Track caseload interactions */
    if (window.CSAnalytics) {
      /* Track plan generations */
      window.addEventListener("cs-plan-generated", function (e) {
        window.CSAnalytics.track("plan_generated", (e.detail || {}));
      });
      /* Track quick log saves */
      window.addEventListener("cs-log-saved", function (e) {
        window.CSAnalytics.track("quick_log_saved", (e.detail || {}));
      });
      /* Track curriculum panel opens */
      window.addEventListener("cs-curriculum-opened", function () {
        window.CSAnalytics.track("curriculum_panel_opened", {});
      });
    }

    /* Tour: only launches when user clicks "Tour" button — no auto-start.
       Previous auto-launch blocked content on first load. */
  }

  /* ── Curriculum panel wiring ────────────────────────────────────────── */

  function initCurriculumPanel() {
    var curBtn = document.getElementById("th2-cur-btn");
    var Panel  = window.CSCurriculumPanel;

    if (!curBtn || !Panel) return;

    curBtn.addEventListener("click", function () {
      Panel.toggle();
      /* Analytics event */
      window.dispatchEvent(new CustomEvent("cs-curriculum-opened"));
    });

    /* Pass selected student grade to panel when student changes */
    window.addEventListener("cs-student-selected", function (e) {
      if (e.detail && e.detail.grade && Panel.setGrade) {
        Panel.setGrade(e.detail.grade);
      }
    });
  }

  function lessonBriefContext() {
    var studentId = hubState.get().context.studentId || "";
    var student = caseload.find(function (row) { return row.id === studentId; }) || null;
    var blockId = hubState.get().context.classId || "";
    var block = TeacherSelectors && typeof TeacherSelectors.getBlockById === "function"
      ? TeacherSelectors.getBlockById(blockId, todayKey(), { TeacherStorage: TeacherStorage })
      : (getTodayLessonBlocks().filter(function (row) { return row.id === blockId; })[0] || null);
    return {
      caseload: caseload.slice(),
      blockId: block && block.id || "",
      blockLabel: block && block.label || "",
      blockTime: block && block.timeLabel || "",
      supportType: block && block.supportType || "",
      area: block && block.area || "",
      programId: block && block.programId || "",
      studentId: studentId,
      studentName: student && student.name || "",
      grade: student && (student.gradeBand || student.grade || "") || ""
    };
  }

  function initLessonBriefPanel() {
    var briefBtn = document.getElementById("th2-brief-btn");
    var Panel = window.CSLessonBriefPanel;

    if (!briefBtn || !Panel) return;

    briefBtn.addEventListener("click", function () {
      Panel.toggle(lessonBriefContext());
    });

    window.addEventListener("cs-student-selected", function () {
      if (Panel.setContext) Panel.setContext(lessonBriefContext());
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
      hubState.set({
        context: {
          lessonContext: {
            blockId: detail.blockId || "",
            blockLabel: detail.blockLabel || "",
            blockTime: detail.blockTime || "",
            supportType: detail.supportType || "",
            studentId: detail.studentId || "",
            studentName: detail.studentName || "",
            grade: detail.grade || "",
            programId: detail.programId || "",
            lessonContextId: detail.lessonContextId || "",
            title: detail.title || ""
          }
        },
        active_class_context: {
          classId: detail.blockId || hubState.get().context.classId || "",
          label: detail.blockLabel || "",
          supportType: detail.supportType || "",
          lessonContextId: detail.lessonContextId || ""
        }
      });
    });
  }

  /* ── Boot sequence ─────────────────────────────────────── */

  function boot() {
    // Demo mode — seed before loading caseload so students are present
    if (isDemoMode) {
      ensureDemoCaseload();
      if (el.demoBadge) el.demoBadge.classList.remove("hidden");
    }

    // Initialize cost tracking dashboard
    initCostDashboard();

    // Initialize Google auth + Classroom sync
    initGoogleAuth();

    // Initialize curriculum quick-reference panel
    initCurriculumPanel();
    initLessonBriefPanel();

    // Initialize onboarding tour + analytics buttons
    initTourAndAnalytics();

    // Load caseload (reads from evidence store)
    loadCaseload();

    // If a student was passed via URL, select them; otherwise default to schedule view
    if (initialStudentId && caseload.some(function (s) { return s.id === initialStudentId; })) {
      el.modeTabs.forEach(function (t) {
        var active = t.getAttribute("data-mode") === "caseload";
        t.classList.toggle("is-active", active);
        t.setAttribute("aria-selected", active ? "true" : "false");
      });
      hubState.set({ context: { mode: "caseload" } });
      renderStudentList();
      selectStudent(initialStudentId);
    } else if (caseload.length) {
      var seededBlocks = getTodayLessonBlocks();
      if (isDemoMode && seededBlocks.length) {
        var firstBlock = seededBlocks[0];
        var firstBlockContext = TeacherSelectors && typeof TeacherSelectors.buildClassContext === "function"
          ? TeacherSelectors.buildClassContext(firstBlock, { TeacherStorage: TeacherStorage })
          : null;
        hubState.set({
          context: { mode: "class", classId: firstBlock.id, studentId: "" },
          active_class_context: {
            classId: firstBlock.id,
            label: firstBlockContext && firstBlockContext.label || firstBlock.label || "",
            supportType: firstBlockContext && firstBlockContext.supportType || firstBlock.supportType || "",
            lessonContextId: firstBlockContext && firstBlockContext.lessonContextId || firstBlock.lessonContextId || ""
          }
        });
      } else {
        // Default to Today's Classes view so teachers see their schedule first
        showTodaysClasses();
      }
    } else if (isDemoMode) {
      /* Demo resilience: dev-servers sometimes strip query params.
         Re-seed and re-render once after a minimal delay. */
      setTimeout(function () {
        ensureDemoCaseload();
        loadCaseload();
        if (caseload.length) {
          showTodaysClasses();
          if (el.demoBadge) el.demoBadge.classList.remove("hidden");
        } else {
          renderCommandCenter(null);
        }
      }, 120);
    } else {
      renderCommandCenter(null);
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }

})();
