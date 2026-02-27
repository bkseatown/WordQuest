(function teacherDashboardV1() {
  "use strict";

  var schema = window.CSStorageSchema || null;
  if (schema && typeof schema.migrateStorageIfNeeded === "function") {
    schema.migrateStorageIfNeeded();
  }

  var STORAGE_KEY = "cs_student_data";
  var complexFill = document.getElementById("td-complex");
  var reasoningFill = document.getElementById("td-reasoning");
  var verbsFill = document.getElementById("td-verbs");
  var cohesionFill = document.getElementById("td-cohesion");
  var groupsEl = document.getElementById("td-groups");
  var heatmapTable = document.getElementById("td-heatmap-table");
  var lessonEl = document.getElementById("td-lesson-suggestion");
  var coachRibbonEl = document.getElementById("td-coach-ribbon");
  var groupRecsEl = document.getElementById("td-group-recommendations");
  var aiSummaryEl = document.getElementById("td-ai-summary");
  var reportBtn = document.getElementById("td-generate-report");
  var sessionBtn = document.getElementById("td-generate-session-plan");
  var miniLessonBtn = document.getElementById("td-generate-mini-lesson");
  var selectedEl = document.getElementById("td-selected-student");
  var sessionPanel = document.getElementById("td-session-plan-panel");
  var sessionPanelBody = document.getElementById("td-session-plan-content");
  var miniLessonCard = document.getElementById("td-mini-lesson-card");
  var miniLessonBody = document.getElementById("td-mini-lesson-content");
  var classViewEls = Array.prototype.slice.call(document.querySelectorAll(".td-class-view"));
  var studentViewEls = Array.prototype.slice.call(document.querySelectorAll(".td-student-view"));

  if (!complexFill || !reasoningFill || !verbsFill || !cohesionFill || !groupsEl || !heatmapTable || !lessonEl) return;
  if (window.CSPerformanceEngine && typeof window.CSPerformanceEngine.init === "function") {
    window.CSPerformanceEngine.init("teacher-dashboard", { budgetMs: 2500 });
  }

  var state = {
    rows: [],
    selectedStudentId: "",
    coachRibbon: null
  };

  function initCoachRibbon() {
    if (state.coachRibbon) return;
    if (!coachRibbonEl || !window.CSCoachRibbon || typeof window.CSCoachRibbon.initCoachRibbon !== "function") return;
    state.coachRibbon = window.CSCoachRibbon.initCoachRibbon({
      mountEl: coachRibbonEl,
      getMessageFn: function () {
        return { key: "td.default", text: "Start with Group B; use the recommended next step." };
      }
    });
  }

  function setCoachMessage(key, text) {
    if (!state.coachRibbon || typeof state.coachRibbon.set !== "function") return;
    state.coachRibbon.set({ key: String(key || "").trim(), text: String(text || "").trim() });
  }

  function renderStorageWarningIfNeeded() {
    if (!schema || typeof schema.getMigrationStatus !== "function") return;
    var status = schema.getMigrationStatus();
    if (!status || !status.corruptionDetected || !Array.isArray(status.backups) || !status.backups.length) return;
    if (document.getElementById("cs-storage-warning")) return;
    var banner = document.createElement("div");
    banner.id = "cs-storage-warning";
    banner.className = "td-group";
    banner.textContent = "Storage was reset due to invalid data. A backup was saved.";
    var root = document.getElementById("td-root");
    if (root) root.insertBefore(banner, root.firstChild);
  }

  function isDemoMode() {
    try {
      return new URLSearchParams(window.location.search || "").get("demo") === "1";
    } catch (_e) {
      return false;
    }
  }

  function getClassId() {
    try {
      var params = new URLSearchParams(window.location.search || "");
      var fromQuery = String(params.get("classId") || params.get("class") || "").trim();
      if (fromQuery) return fromQuery;
    } catch (_e) {
      // ignore
    }
    try {
      var fromStorage = String(localStorage.getItem("cs_active_class_id") || "").trim();
      if (fromStorage) return fromStorage;
    } catch (_e2) {
      // ignore
    }
    if (window.CS_CONFIG && window.CS_CONFIG.classId) {
      return String(window.CS_CONFIG.classId).trim() || "Default Class";
    }
    return "Default Class";
  }

  function sanitizeStudentId(name) {
    return String(name || "student").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "") || "student";
  }

  function loadData() {
    var parsed = schema && typeof schema.safeLoadJSON === "function"
      ? schema.safeLoadJSON(STORAGE_KEY, [])
      : (function () {
          try {
            var raw = localStorage.getItem(STORAGE_KEY);
            return raw ? JSON.parse(raw) : [];
          } catch (_e) {
            return [];
          }
        })();
    if (!Array.isArray(parsed) || !parsed.length) {
      if (isDemoMode()) return buildDemoData();
      return [];
    }
    return parsed;
  }

  function loadAnalytics() {
    if (window.CSAnalyticsEngine && typeof window.CSAnalyticsEngine.read === "function") {
      return window.CSAnalyticsEngine.read();
    }
    try {
      var parsed = JSON.parse(localStorage.getItem("cs_analytics") || "null");
      return parsed && typeof parsed === "object" ? parsed : null;
    } catch (_e) {
      return null;
    }
  }

  function fakeStudent(name, reasoningRate, detailAvg, strongVerbRate, cohesionAvg) {
    var sentences = [];
    for (var i = 0; i < 6; i += 1) {
      var hasReasoning = Math.random() < reasoningRate;
      var strongVerb = Math.random() < strongVerbRate;
      var sentenceType = hasReasoning ? "complex" : (Math.random() < 0.3 ? "compound" : "simple");
      sentences.push({
        sentence_type: sentenceType,
        has_reasoning: hasReasoning,
        verb_strength: strongVerb ? "strong" : "adequate",
        detail_score: clamp(detailAvg + (Math.random() - 0.5), 1, 5),
        cohesion: clamp(cohesionAvg + (Math.random() - 0.5), 0, 5)
      });
    }
    return { name: name, sentences: sentences };
  }

  function buildDemoData() {
    return [
      fakeStudent("Ava", 0.2, 1.7, 0.1, 1.2),
      fakeStudent("Leo", 0.35, 2.1, 0.2, 1.8),
      fakeStudent("Mia", 0.7, 3.1, 0.6, 3.3),
      fakeStudent("Noah", 0.42, 2.4, 0.33, 2.1),
      fakeStudent("Iris", 0.15, 1.5, 0.15, 1.0),
      fakeStudent("Zane", 0.62, 3.0, 0.5, 2.8),
      fakeStudent("Ella", 0.5, 2.6, 0.4, 2.4),
      fakeStudent("Omar", 0.28, 1.9, 0.2, 1.5)
    ];
  }

  function clamp(v, min, max) {
    return Math.max(min, Math.min(max, v));
  }

  function toPct(part, total) {
    if (!total) return 0;
    return Math.round((part / total) * 100);
  }

  function studentStats(student) {
    var rows = Array.isArray(student && student.sentences) ? student.sentences : [];
    var count = Math.max(1, rows.length);
    var complexCount = rows.filter(function (r) { return r.sentence_type === "complex"; }).length;
    var reasoningCount = rows.filter(function (r) { return !!r.has_reasoning; }).length;
    var strongCount = rows.filter(function (r) { return String(r.verb_strength || "") === "strong"; }).length;
    var detailAvg = rows.reduce(function (sum, r) { return sum + Number(r.detail_score || 0); }, 0) / count;
    var cohesionAvg = rows.reduce(function (sum, r) { return sum + Number(r.cohesion || 0); }, 0) / count;

    return {
      studentId: sanitizeStudentId(student && student.name),
      name: String(student && student.name || "Student"),
      complexPct: toPct(complexCount, count),
      reasoningPct: toPct(reasoningCount, count),
      strongPct: toPct(strongCount, count),
      detailAvg: Number(detailAvg.toFixed(2)),
      cohesionAvg: Number(cohesionAvg.toFixed(2))
    };
  }

  function classSnapshot(stats) {
    var count = Math.max(1, stats.length);
    return {
      complexPct: Math.round(stats.reduce(function (sum, s) { return sum + s.complexPct; }, 0) / count),
      reasoningPct: Math.round(stats.reduce(function (sum, s) { return sum + s.reasoningPct; }, 0) / count),
      strongPct: Math.round(stats.reduce(function (sum, s) { return sum + s.strongPct; }, 0) / count),
      cohesionAvg: Number((stats.reduce(function (sum, s) { return sum + s.cohesionAvg; }, 0) / count).toFixed(2))
    };
  }

  function pickTier(s) {
    if (s.reasoningPct < 30 || s.detailAvg < 2) return "Tier 3";
    if (s.strongPct < 50 && s.complexPct < 40) return "Tier 2";
    return "Tier 1";
  }

  function levelBadge(row) {
    var p = window.CSProgressionEngine;
    if (!p || typeof p.computeStudentProgress !== "function") return "Level 1";
    var progress = p.computeStudentProgress(row);
    return progress.levelBadge || "Level 1";
  }

  function progressForRow(row) {
    var p = window.CSProgressionEngine;
    if (!p || typeof p.computeStudentProgress !== "function") {
      return { levels: { reasoning: 0, detail: 0, verb_precision: 0, cohesion: 0 }, primaryDeficit: "reasoning", levelBadge: "Level 1" };
    }
    return p.computeStudentProgress(row);
  }

  function groupHtml(title, names) {
    return [
      '<div class="td-group">',
      '<div class="td-group-title">' + title + "</div>",
      '<div>' + (names.length ? names.join(", ") : "No students currently") + "</div>",
      "</div>"
    ].join("");
  }

  function renderGroups(stats) {
    var tier3 = [];
    var tier2 = [];
    var tier1 = [];
    stats.forEach(function (s) {
      var tier = pickTier(s);
      if (tier === "Tier 3") tier3.push(s.name);
      else if (tier === "Tier 2") tier2.push(s.name);
      else tier1.push(s.name);
    });

    groupsEl.innerHTML = [
      '<div class="td-grouping-list">',
      groupHtml("Group A (Tier 3 – Structure Support)", tier3),
      groupHtml("Group B (Tier 2 – Reasoning + Verb Precision)", tier2),
      groupHtml("Group C (Tier 1 – Extension & Variety)", tier1),
      "</div>"
    ].join("");
  }

  function recommendationForTier(tier, names) {
    var list = Array.isArray(names) ? names : [];
    if (tier === "Tier 3") {
      return {
        tier: tier,
        dominantWeakness: "clarity",
        students: list,
        recommendation: "15 min: Sentence Surgery Timed Level 1 + modeled stem practice (one change at a time)."
      };
    }
    if (tier === "Tier 2") {
      return {
        tier: tier,
        dominantWeakness: "reasoning",
        students: list,
        recommendation: "15 min: Sentence Surgery Timed Level 2 + Because/But/So expansion set."
      };
    }
    return {
      tier: "Tier 1",
      dominantWeakness: "complexity",
      students: list,
      recommendation: "15 min: Timed Level 3 extension with stylistic refinement challenge."
    };
  }

  function buildTierRecommendations(stats) {
    var tierGroups = { "Tier 3": [], "Tier 2": [], "Tier 1": [] };
    stats.forEach(function (s) {
      var tier = pickTier(s);
      tierGroups[tier].push(s.name);
    });
    return [
      recommendationForTier("Tier 3", tierGroups["Tier 3"]),
      recommendationForTier("Tier 2", tierGroups["Tier 2"]),
      recommendationForTier("Tier 1", tierGroups["Tier 1"])
    ].filter(function (row) { return row.students.length > 0; });
  }

  function renderTierRecommendations(recommendations) {
    if (!groupRecsEl) return;
    if (!recommendations.length) {
      groupRecsEl.innerHTML = "";
      return;
    }
    groupRecsEl.innerHTML = recommendations.map(function (row) {
      return [
        '<div class="td-group-recommendation">',
        "<strong>" + row.tier + " • " + row.dominantWeakness + "</strong>",
        "<div>Students: " + row.students.join(", ") + "</div>",
        "<div>Plan: " + row.recommendation + "</div>",
        "</div>"
      ].join("");
    }).join("");
  }

  function heatClass(value, high, low) {
    if (value >= high) return "heat-high";
    if (value <= low) return "heat-low";
    return "heat-mid";
  }

  function tierClass(tier) {
    if (tier === "Tier 1") return "tier-1";
    if (tier === "Tier 2") return "tier-2";
    return "tier-3";
  }

  function renderHeatmap(stats) {
    var html = [
      "<thead><tr><th>Student</th><th>Reasoning</th><th>Detail</th><th>Verb Strength</th><th>Cohesion</th><th>Tier</th></tr></thead>",
      "<tbody>"
    ];

    stats.forEach(function (s) {
      var tier = pickTier(s);
      var badge = levelBadge(s);
      html.push("<tr>");
      html.push('<td><button type="button" class="td-student-btn" data-student-id="' + s.studentId + '">' + s.name + '</button> <span class="td-level-badge">' + badge + "</span></td>");
      html.push('<td class="' + heatClass(s.reasoningPct, 60, 30) + '">' + s.reasoningPct + "%</td>");
      html.push('<td class="' + heatClass(s.detailAvg, 3, 2) + '">' + s.detailAvg.toFixed(1) + "</td>");
      html.push('<td class="' + heatClass(s.strongPct, 60, 30) + '">' + s.strongPct + "%</td>");
      html.push('<td class="' + heatClass(s.cohesionAvg, 3, 2) + '">' + s.cohesionAvg.toFixed(1) + "</td>");
      html.push('<td class="' + tierClass(tier) + '">' + tier + "</td>");
      html.push("</tr>");
    });

    html.push("</tbody>");
    heatmapTable.innerHTML = html.join("");
  }

  function renderLesson(snapshot) {
    if (snapshot.reasoningPct < 40) {
      lessonEl.textContent = "Model subordinating conjunctions (because, although, since).";
      return;
    }
    if (snapshot.strongPct < 40) {
      lessonEl.textContent = "Mini-lesson on strong, precise verbs.";
      return;
    }
    if (snapshot.cohesionAvg < 2) {
      lessonEl.textContent = "Practice linking sentences with transitions.";
      return;
    }
    lessonEl.textContent = "Challenge: multi-clause paragraph construction.";
  }

  async function renderTeacherSummary(snapshot, recommendations) {
    if (!aiSummaryEl) return;
    var svc = window.CSAIService;
    var fallback = {
      summary: "Decision support active with tier-aligned intervention grouping.",
      action: "Use the 15-minute plan cards below each group."
    };
    var data = fallback;
    if (svc && typeof svc.generateTeacherSummary === "function") {
      data = await svc.generateTeacherSummary({
        snapshot: snapshot,
        recommendations: recommendations,
        channel: "teacher-dashboard-summary"
      });
    }
    aiSummaryEl.innerHTML = "<div><strong>Class Insight:</strong> " + data.summary + "</div><div><strong>Recommended Action:</strong> " + data.action + "</div>";
    aiSummaryEl.classList.remove("hidden");
  }

  function animateFill(el, pct) {
    if (!el) return;
    el.style.width = "0%";
    requestAnimationFrame(function () {
      el.style.width = String(clamp(pct, 0, 100)) + "%";
    });
  }

  function getSelectedRow() {
    if (!state.rows.length || !state.selectedStudentId) return null;
    var id = state.selectedStudentId;
    var row = state.rows.filter(function (r) { return r.studentId === id; })[0];
    return row || null;
  }

  function setStudentView(active) {
    var show = !!active;
    studentViewEls.forEach(function (el) { el.classList.toggle("hidden", !show); });
    classViewEls.forEach(function (el) { el.classList.toggle("hidden", false); });
  }

  function refreshSelectedLabel() {
    if (!selectedEl) return;
    var row = getSelectedRow();
    selectedEl.textContent = row ? (row.name + " (" + pickTier(row) + ")") : "Select a student from heatmap details";
    setCoachMessage(
      row ? "td.student" : "td.default",
      row
        ? "Focus: 1 skill today. Try the suggested mini-lesson."
        : "Start with Group B; use the recommended next step."
    );
    setStudentView(!!row);
  }

  function attachStudentSelectionHandlers() {
    Array.prototype.forEach.call(document.querySelectorAll(".td-student-btn"), function (btn) {
      btn.addEventListener("click", function () {
        state.selectedStudentId = String(btn.getAttribute("data-student-id") || "");
        refreshSelectedLabel();
      });
    });
  }

  function renderSessionPlan(plan) {
    if (!sessionPanel || !sessionPanelBody) return;
    sessionPanelBody.innerHTML = [
      '<div><strong>Warm-up:</strong> ' + plan.warmup + "</div>",
      '<div><strong>Direct Instruction:</strong> ' + plan.directInstruction + "</div>",
      '<div><strong>Guided Practice:</strong> ' + plan.guidedPractice + "</div>",
      '<div><strong>Independent Practice:</strong> ' + plan.independentPractice + "</div>",
      '<div><strong>Exit Ticket:</strong> ' + plan.exitTicket + "</div>"
    ].join("");
    sessionPanel.classList.remove("hidden");
  }

  function handleGenerateSessionPlan() {
    var row = getSelectedRow();
    if (!row || !window.CSInterventionPlanner || typeof window.CSInterventionPlanner.generateSessionPlan !== "function") return;
    if (sessionPanel && !sessionPanel.classList.contains("hidden")) {
      sessionPanel.classList.add("hidden");
      return;
    }
    var progress = progressForRow(row);
    var tier = pickTier(row);
    var plan = window.CSInterventionPlanner.generateSessionPlan({
      studentSkillLevels: progress.levels,
      primaryDeficitSkill: progress.primaryDeficit,
      tierLevel: tier
    });
    renderSessionPlan(plan);
  }

  function handleGenerateGrowthReport() {
    var row = getSelectedRow();
    if (!row || !window.CSGrowthReportEngine || typeof window.CSGrowthReportEngine.generateGrowthReport !== "function") return;
    var progress = progressForRow(row);
    var historyMap = window.CSAnalyticsEngine && typeof window.CSAnalyticsEngine.readProgressHistory === "function"
      ? window.CSAnalyticsEngine.readProgressHistory()
      : {};
    var history = Array.isArray(historyMap[row.studentId]) ? historyMap[row.studentId] : [];
    var timeframe = "4 weeks";
    var report = window.CSGrowthReportEngine.generateGrowthReport({
      studentId: row.studentId,
      name: row.name,
      levels: progress.levels,
      history: history
    }, timeframe);
    window.CSGrowthReportEngine.openPrintableReport(row.name, timeframe, report);
  }

  function renderMiniLessonCard(lesson) {
    if (!miniLessonCard || !miniLessonBody) return;
    miniLessonBody.innerHTML = [
      '<div><strong>Objective:</strong> ' + lesson.objective + "</div>",
      '<div><strong>Teacher Model:</strong> ' + lesson.teacherModel + "</div>",
      '<div><strong>Guided Prompt:</strong> ' + lesson.guidedPrompt + "</div>",
      '<div><strong>Common Errors:</strong> ' + lesson.commonErrors.join(", ") + "</div>",
      '<div><strong>Quick Practice:</strong> ' + lesson.quickPractice + "</div>",
      '<div><strong>Exit Ticket:</strong> ' + lesson.exitTicket + "</div>"
    ].join("");
    miniLessonCard.classList.remove("hidden");
  }

  async function handleGenerateMiniLesson() {
    var row = getSelectedRow();
    if (!row || !window.CSLessonGenerator || typeof window.CSLessonGenerator.generateMiniLesson !== "function") return;
    var progress = progressForRow(row);
    var tier = pickTier(row);
    var tierNum = tier === "Tier 3" ? 3 : (tier === "Tier 1" ? 1 : 2);
    var lesson = await window.CSLessonGenerator.generateMiniLesson({
      targetSkill: progress.primaryDeficit,
      gradeBand: "3-5",
      tier: tierNum
    });
    renderMiniLessonCard(lesson);
  }

  function render() {
    initCoachRibbon();
    renderStorageWarningIfNeeded();
    var data = loadData();
    var analytics = loadAnalytics();
    if (!data.length) {
      setStudentView(false);
      if (groupRecsEl) groupRecsEl.innerHTML = "";
      if (aiSummaryEl) aiSummaryEl.classList.add("hidden");
      if (analytics && Number(analytics.totalSentences || 0) > 0) {
        var reasoningPct = Math.round(Number(analytics.reasoningRate || 0) * 100);
        var detailPct = Math.round(Math.max(0, Math.min(100, Number(analytics.avgDetail || 0) * 20)));
        var cohesionPct = Math.round(Math.max(0, Math.min(100, Number(analytics.avgCohesion || 0) * 20)));
        animateFill(complexFill, detailPct);
        animateFill(reasoningFill, reasoningPct);
        animateFill(verbsFill, detailPct);
        animateFill(cohesionFill, cohesionPct);
        groupsEl.innerHTML = '<div class="td-group">Displaying anonymized analytics snapshot from <code>cs_analytics</code> (' + Number(analytics.totalSentences || 0) + " sentences).</div>";
        heatmapTable.innerHTML = "";
        lessonEl.textContent = reasoningPct < 40
          ? "Model subordinating conjunctions (because, although, since)."
          : (detailPct < 50 ? "Mini-lesson on adding precise detail and evidence." : "Challenge: multi-clause paragraph construction.");
        return;
      }
      groupsEl.innerHTML = '<div class="td-group">No student structural data found. Add <code>cs_student_data</code> or let <code>cs_analytics</code> populate through student writing.</div>';
      heatmapTable.innerHTML = "";
      lessonEl.textContent = "No recommendation yet.";
      animateFill(complexFill, 0);
      animateFill(reasoningFill, 0);
      animateFill(verbsFill, 0);
      animateFill(cohesionFill, 0);
      return;
    }

    var stats = data.map(studentStats);
    state.rows = stats;
    if (!state.selectedStudentId) state.selectedStudentId = "";

    if (!isDemoMode() && window.CSAnalyticsEngine && typeof window.CSAnalyticsEngine.appendStudentProgress === "function") {
      stats.forEach(function (row) {
        var progress = progressForRow(row);
        window.CSAnalyticsEngine.appendStudentProgress(row.studentId, progress.levels, Date.now());
      });
    }

    var snapshot = classSnapshot(stats);

    animateFill(complexFill, snapshot.complexPct);
    animateFill(reasoningFill, snapshot.reasoningPct);
    animateFill(verbsFill, snapshot.strongPct);
    animateFill(cohesionFill, Math.round(snapshot.cohesionAvg * 20));

    renderGroups(stats);
    var recommendations = buildTierRecommendations(stats);
    renderTierRecommendations(recommendations);
    renderHeatmap(stats);
    renderLesson(snapshot);
    void renderTeacherSummary(snapshot, recommendations);
    refreshSelectedLabel();
    attachStudentSelectionHandlers();

    if (!isDemoMode() && window.CSAnalyticsEngine && typeof window.CSAnalyticsEngine.updateSchoolAnalytics === "function") {
      var totalSentences = data.reduce(function (sum, student) {
        var rows = Array.isArray(student && student.sentences) ? student.sentences : [];
        return sum + rows.length;
      }, 0);
      window.CSAnalyticsEngine.updateSchoolAnalytics(getClassId(), {
        totalSentences: totalSentences,
        reasoningRate: snapshot.reasoningPct / 100,
        complexRate: snapshot.complexPct / 100,
        avgDetail: Number((stats.reduce(function (sum, s) { return sum + s.detailAvg; }, 0) / Math.max(1, stats.length)).toFixed(2)),
        avgCohesion: snapshot.cohesionAvg,
        verbStrengthRate: snapshot.strongPct / 100
      });
    }
  }

  if (sessionBtn) {
    sessionBtn.addEventListener("click", handleGenerateSessionPlan);
  }
  if (reportBtn) {
    reportBtn.addEventListener("click", handleGenerateGrowthReport);
  }
  if (miniLessonBtn) {
    miniLessonBtn.addEventListener("click", function () {
      void handleGenerateMiniLesson();
    });
  }

  if (typeof window.requestIdleCallback === "function") {
    window.requestIdleCallback(render, { timeout: 700 });
  } else {
    window.setTimeout(render, 0);
  }
})();
