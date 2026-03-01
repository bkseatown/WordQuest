(function teacherDashboardVNext() {
  "use strict";

  document.addEventListener("DOMContentLoaded", function () {
    document.body.classList.add("td-page");
  });

  var Evidence = window.CSEvidence;
  var EvidenceEngine = window.CSEvidenceEngine;
  var RiskBands = window.CSRiskBands;
  var SkillStoreAPI = window.CSSkillStore;
  var SkillLabels = window.CSSkillLabels;
  var ExportNotes = window.CSExportNotes;
  var FlexGroupEngine = window.CSFlexGroupEngine;
  var PlanEngine = window.CSPlanEngine;
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
    todayPlan: null
  };
  var skillStoreLogged = false;

  var LAST_ACTIVITY_KEY = "cs.lastActivityByStudent.v1";

  var el = {
    search: document.getElementById("td-search-input"),
    noCaseload: document.getElementById("td-no-caseload"),
    list: document.getElementById("td-caseload-list"),
    centerEmpty: document.getElementById("td-center-empty"),
    centerSelected: document.getElementById("td-center-selected"),
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
    rightEmpty: document.getElementById("td-right-empty"),
    rightContent: document.getElementById("td-right-content"),
    evidenceChips: document.getElementById("td-evidence-chips"),
    needsChipList: document.getElementById("td-needs-chip-list"),
    planList: document.getElementById("td-plan-list"),
    planTabs: Array.prototype.slice.call(document.querySelectorAll("[data-plan-tab]")),
    noteTabs: Array.prototype.slice.call(document.querySelectorAll("[data-note-tab]")),
    noteText: document.getElementById("td-progress-note-text"),
    copyNote: document.getElementById("td-copy-note"),
    shareAllNotes: document.getElementById("td-share-all-notes"),
    lastSessionTitle: document.getElementById("td-last-session-title"),
    lastSessionMeta: document.getElementById("td-last-session-meta"),
    shareSummary: document.getElementById("td-share-summary"),
    exportStudentCsv: document.getElementById("td-export-student-csv"),
    exportJson: document.getElementById("td-export-json"),
    copyCsv: document.getElementById("td-copy-csv"),
    importExport: document.getElementById("td-import-export"),
    addStudent: document.getElementById("td-add-student"),
    brandHome: document.querySelector(".td-brand-home"),
    settings: document.getElementById("td-settings"),
    homeBtn: document.getElementById("td-home-btn"),
    activitySelect: document.getElementById("td-activity-select"),
    copySummary: document.getElementById("td-copy-summary"),
    quickLaunchButtons: Array.prototype.slice.call(document.querySelectorAll("[data-quick]")),
    emptyActions: Array.prototype.slice.call(document.querySelectorAll("[data-empty-action]")),
    todayRoot: document.getElementById("td-today"),
    todayList: document.getElementById("td-today-list"),
    caseloadSnapshot: document.getElementById("td-caseload-snapshot"),
    todayRefresh: document.getElementById("td-today-refresh"),
    todayGroup: document.getElementById("td-today-group"),
    todayGroupOpen: document.getElementById("td-group-open"),
    todayGroupBuild: document.getElementById("td-group-build"),
    groupPanel: document.getElementById("td-group-panel"),
    groupOutput: document.getElementById("td-group-output"),
    coachRibbon: document.getElementById("td-coach-ribbon"),
    coachLine: document.getElementById("td-coach-line"),
    coachPlay: document.getElementById("td-coach-play"),
    coachMute: document.getElementById("td-coach-mute"),
    coachCollapse: document.getElementById("td-coach-collapse"),
    coachChip: document.getElementById("td-coach-chip"),
    demoBadge: document.getElementById("td-demo-badge")
  };

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

  function getLastActivityMap() {
    return safeJsonParse(localStorage.getItem(LAST_ACTIVITY_KEY), {});
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
    if (k === "sentence-surgery") return "Sentence Surgery";
    if (k === "writing-studio") return "Writing Studio";
    if (k === "numeracy") return "Numeracy";
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
    if (SkillLabels && typeof SkillLabels.getSkillBreadcrumb === "function") {
      return SkillLabels.getSkillBreadcrumb(skillId);
    }
    return String(skillId || "Skill");
  }

  function getSkillLabelSafe(skillId) {
    var id = String(skillId || "");
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

  function renderTodayEngine(plan) {
    if (!el.todayList) return;
    var rows = plan && Array.isArray(plan.students) ? plan.students : [];
    if (!rows.length) {
      rows = buildTodayPlan().students;
    }
    var allRows = plan && Array.isArray(plan.allStudents) ? plan.allStudents : rows;
    if (el.caseloadSnapshot) {
      var scoreList = allRows.map(function (row) { return Number(row && row.score || 0); });
      var bucket = (RiskBands && typeof RiskBands.bucketCaseload === "function")
        ? RiskBands.bucketCaseload(scoreList)
        : { pctHigh: 0, pctModerate: 0, pctStable: 100 };
      el.caseloadSnapshot.innerHTML = [
        '<span class="td-chip td-risk-high">High ' + bucket.pctHigh + '%</span>',
        '<span class="td-chip td-risk-moderate">Mod ' + bucket.pctModerate + '%</span>',
        '<span class="td-chip td-risk-stable">Stable ' + bucket.pctStable + '%</span>'
      ].join('');
    }
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
      var rationale = topSkill
        ? ("Priority: " + formatSkillBreadcrumb(topSkill.skillId) + " • Need: " + needLabel + " • Cadence: " + topSkill.stalenessDays + "d/" + cadenceDays + "d")
        : "Priority: Missing evidence";
      var nextStepLine = topSkill ? formatNextStep(sid, topSkill.skillId) : "";
      var trendLine = buildTrajectoryLine(sid, row.priority && row.priority.topSkills ? row.priority.topSkills : []);
      return [
        '<article class="td-todayCard">',
        '<div class="td-todayCard__top">',
        '<h3 class="td-todayCard__name">' + s.name + '</h3>',
        '<span class="td-todayCard__grade">' + grade + '</span>',
        '<span class="td-risk-chip ' + risk.colorClass + '">' + risk.label + '</span>',
        '</div>',
        '<div class="td-todayCard__chips">',
        (row.focus || []).slice(0, 2).map(function (focus) { return '<span class="td-chip">' + focus + '</span>'; }).join(""),
        '</div>',
        '<div class="td-todayCard__actions">',
        '<button class="td-btn td-btn-accent btn btn-primary" type="button" data-build-block="' + sid + '">Build 20-min block</button>',
        '<div class="td-todayCard__row">',
        '<button class="td-top-btn td-today-note-btn" type="button" data-copy-note="' + sid + '">Copy Note</button>',
        '<button class="td-top-btn td-today-note-btn" type="button" data-copy-family-note="' + sid + '">Copy Family Note</button>',
        '<span></span>',
        '</div>',
        '<div class="td-todayCard__row">',
        '<button class="td-top-btn" type="button" data-today-launch="word-quest" data-student-id="' + sid + '">Word Quest</button>',
        '<button class="td-top-btn" type="button" data-today-launch="reading-lab" data-student-id="' + sid + '">Reading Lab</button>',
        '<button class="td-top-btn" type="button" data-today-launch="sentence-surgery" data-student-id="' + sid + '">Sentence Surgery</button>',
        '</div>',
        '</div>',
        (rationale ? ('<p class="td-todayCard__last">' + rationale + '</p>') : ''),
        (trendLine ? ('<p class="td-todayCard__last">' + trendLine + '</p>') : ''),
        (nextStepLine ? ('<p class="td-todayCard__last">' + nextStepLine + '</p>') : ''),
        '<p class="td-todayCard__last">' + lastText + '</p>',
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
        var warm = Math.max(2, Math.round(mins * 0.15));
        var guided = Math.max(6, Math.round(mins * 0.4));
        var check = Math.max(6, Math.round(mins * 0.35));
        var reflect = Math.max(2, mins - warm - guided - check);
        setCoachLine(mins + "-min block: " + warm + "-min warm-up, " + guided + "-min guided practice, " + check + "-min quick check, " + reflect + "-min reflection. Focus: " + focusLine + ".");
      });
    });

    Array.prototype.forEach.call(el.todayList.querySelectorAll("[data-copy-note]"), function (button) {
      button.addEventListener("click", function () {
        var sid = String(button.getAttribute("data-copy-note") || "");
        var row = rows.find(function (x) { return String(x.student && x.student.id || "") === sid; });
        if (!row) return;
        copyText(buildTodayCardNote(row), function () {
          setCoachLine("Copied session note for " + String(row.student && row.student.name || "student") + ".");
        });
      });
    });

    Array.prototype.forEach.call(el.todayList.querySelectorAll("[data-copy-family-note]"), function (button) {
      button.addEventListener("click", function () {
        var sid = String(button.getAttribute("data-copy-family-note") || "");
        var row = rows.find(function (x) { return String(x.student && x.student.id || "") === sid; });
        if (!row) return;
        copyText(buildTodayCardFamilyNote(row), function () {
          setCoachLine("Copied family note for " + String(row.student && row.student.name || "student") + ".");
        });
      });
    });
  }

  function renderFlexGroups(rows) {
    if (!el.groupOutput) return;
    if (!FlexGroupEngine || typeof FlexGroupEngine.buildGroups !== "function") {
      el.groupOutput.textContent = "Group engine unavailable.";
      return;
    }
    var built = FlexGroupEngine.buildGroups(rows, {
      labelsApi: SkillLabels,
      getTierConfig: EvidenceEngine && typeof EvidenceEngine.getIntensityTier === "function"
        ? EvidenceEngine.getIntensityTier
        : function () { return { minutesPerSession: 20, groupSizeMax: 4 }; }
    });
    var groups = built && Array.isArray(built.groups) ? built.groups : [];
    if (!groups.length) {
      el.groupOutput.textContent = "No shared-skill groups yet. Run more quick checks.";
      return;
    }
    el.groupOutput.innerHTML = groups.map(function (group, idx) {
      var names = (group.students || []).map(function (s) { return s && s.name ? s.name : "Student"; }).join(", ");
      return [
        '<article class="td-group-item">',
        '<strong>Group ' + (idx + 1) + ': ' + String(group.skillLabel || "Targeted support") + '</strong>',
        '<div class="td-todayCard__last">Tier: ' + String(group.tier || "T2") + ' • ' + String(group.minutesPerSession || 20) + ' min</div>',
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
      renderTodayPlan(null);
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

    el.quickCheck.onclick = function () {
      var launch = state.plan && state.plan.plans && state.plan.plans.tenMin && state.plan.plans.tenMin[0] && state.plan.plans.tenMin[0].launch;
      var href = launch && launch.url ? launch.url : "word-quest.html?quick=1";
      window.location.href = appendStudentParam("./" + href.replace(/^\.\//, ""));
    };
    el.startIntervention.onclick = function () {
      el.startIntervention.classList.add("td-btn-once");
      setTimeout(function () { el.startIntervention.classList.remove("td-btn-once"); }, 260);
      var launch = state.plan && state.plan.plans && state.plan.plans.thirtyMin && state.plan.plans.thirtyMin[0] && state.plan.plans.thirtyMin[0].launch;
      var href = launch && launch.url ? launch.url : "word-quest.html?quick=1";
      window.location.href = appendStudentParam("./" + href.replace(/^\.\//, ""));
    };

    renderEvidenceChips(summary.evidenceChips);
    renderNeeds(state.snapshot);
    renderTodayPlan(state.plan);
    renderProgressNote(state.plan, summary.student);
    renderLastSessionSummary(state.selectedId);
    updateAuditMarkers();
    setCoachLine(summary.nextMove.line);
  }

  function renderEvidenceChips(chips) {
    if (!chips || !chips.length) {
      el.evidenceChips.innerHTML = '<span class="td-chip">No recent evidence yet</span>';
      return;
    }
    el.evidenceChips.innerHTML = chips.map(function (chip) {
      return '<span class="td-chip"><strong>' + chip.label + ':</strong> ' + chip.value + '</span>';
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
      hasTodayPlan: !!document.getElementById("td-today-plan"),
      hasProgressNote: !!document.getElementById("td-progress-note"),
      hasToday: !!document.getElementById("td-today"),
      hasTodayList: !!document.getElementById("td-today-list"),
      hasBuildBlock: hasBuildBlock
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
        var text = buildShareSummaryText(state.selectedId);
        if (navigator.clipboard) navigator.clipboard.writeText(text).catch(function () {});
        setCoachLine("Copied summary for teacher/family/admin notes.");
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
  seedFromCaseloadStore();
  ensureDemoCaseload();
  primeDemoMetrics();
  refreshCaseload();
  bindEvents();
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
