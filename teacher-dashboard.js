(function teacherDashboardWorkflow() {
  "use strict";

  var store = window.CSCaseloadStore;
  if (!store) return;

  var ROSTER_KEY = "cs_roster_v1";
  var PROGRESS_KEY = "cs_progress_history";
  var SKILLS = ["decoding", "fluency", "sentence", "writing"];

  var state = {
    roster: [],
    sessions: [],
    evidence: {},
    selectedStudentId: "",
    activeTierTab: "tier2",
    activeSkillFilter: ""
  };

  var el = {
    search: document.getElementById("td-student-search"),
    options: document.getElementById("td-student-options"),
    groups: document.getElementById("td-groups"),
    todayCards: document.getElementById("td-today-cards"),
    evidenceOverview: document.getElementById("td-evidence-overview"),
    status: document.getElementById("td-status"),
    openStudents: document.getElementById("td-open-students"),
    drawer: document.getElementById("td-students-drawer"),
    drawerList: document.getElementById("td-drawer-list"),
    closeStudents: document.getElementById("td-close-students"),
    exportBtn: document.getElementById("td-export"),
    settingsBtn: document.getElementById("td-settings"),
    helpBtn: document.getElementById("td-help"),
    tierTabs: Array.prototype.slice.call(document.querySelectorAll("[data-tier-tab]")),
    quickLaunchButtons: Array.prototype.slice.call(document.querySelectorAll("[data-launch]")),
    studentEmpty: document.getElementById("td-student-empty"),
    studentView: document.getElementById("td-student-view"),
    studentName: document.getElementById("td-student-name"),
    tier: document.getElementById("td-tier"),
    need: document.getElementById("td-need"),
    confidence: document.getElementById("td-confidence"),
    trend: document.getElementById("td-trend"),
    sessionCount: document.getElementById("td-session-count"),
    studentNext: document.getElementById("td-student-next"),
    studentEvidence: document.getElementById("td-student-evidence"),
    notes: document.getElementById("td-notes-text"),
    nextCta: document.getElementById("td-next-cta"),
    studentRun: document.getElementById("td-student-run")
  };

  function setStatus(message) {
    if (el.status) el.status.textContent = String(message || "");
  }

  function parseJSON(raw, fallback) {
    if (!raw) return fallback;
    try {
      var parsed = JSON.parse(raw);
      return parsed == null ? fallback : parsed;
    } catch (_e) {
      return fallback;
    }
  }

  function loadProgress() {
    var obj = parseJSON(localStorage.getItem(PROGRESS_KEY), {});
    if (!obj || typeof obj !== "object") obj = {};
    obj.skillEvidence = obj.skillEvidence && typeof obj.skillEvidence === "object" ? obj.skillEvidence : {};
    obj.wordQuestSignals = Array.isArray(obj.wordQuestSignals) ? obj.wordQuestSignals : [];
    return obj;
  }

  function saveProgress(progress) {
    try {
      localStorage.setItem(PROGRESS_KEY, JSON.stringify(progress));
    } catch (_e) {
      // ignore storage full failures
    }
  }

  function loadRoster() {
    var seeded = store.loadCaseload && typeof store.loadCaseload === "function" ? store.loadCaseload() : null;
    var seededStudents = seeded && Array.isArray(seeded.students) ? seeded.students : [];
    var roster = parseJSON(localStorage.getItem(ROSTER_KEY), seededStudents);
    if (!Array.isArray(roster)) roster = seededStudents;
    if (!roster.length && typeof store.seedDemoCaseload === "function") {
      var demo = store.seedDemoCaseload();
      roster = Array.isArray(demo.students) ? demo.students : [];
      try { localStorage.setItem(ROSTER_KEY, JSON.stringify(roster)); } catch (_e2) {}
    }
    return roster.map(function (student, idx) {
      return {
        id: String(student.id || ("SAS7A-" + String(idx + 1).padStart(2, "0"))),
        code: String(student.code || student.id || ("SAS7A-" + String(idx + 1).padStart(2, "0"))),
        name: String(student.name || ("Student " + (idx + 1))),
        tier: normalizeTier(student.tier),
        focusSkill: String(student.focusSkill || "decoding").toLowerCase(),
        notes: String(student.notes || "")
      };
    });
  }

  function loadSessions() {
    var rows = store.listSessions && typeof store.listSessions === "function" ? store.listSessions() : [];
    if (!Array.isArray(rows)) rows = [];
    return rows.slice().sort(function (a, b) {
      return Date.parse(String(b.createdAt || b.endedAt || "")) - Date.parse(String(a.createdAt || a.endedAt || ""));
    });
  }

  function normalizeTier(tier) {
    var v = String(tier || "").toLowerCase();
    if (v === "tier3" || v === "tier-3" || v === "3") return "tier3";
    if (v === "tier1" || v === "tier-1" || v === "monitor" || v === "1") return "tier1";
    return "tier2";
  }

  function tierLabel(tier) {
    var t = normalizeTier(tier);
    if (t === "tier3") return "Tier 3";
    if (t === "tier1") return "Tier 1";
    return "Tier 2";
  }

  function ensureSkillEntry(skill) {
    return {
      score: 0,
      signals: [],
      series: [],
      skill: skill
    };
  }

  function studentEvidenceBase() {
    var out = { updatedAt: new Date().toISOString() };
    SKILLS.forEach(function (skill) { out[skill] = ensureSkillEntry(skill); });
    return out;
  }

  function mapSessionSkill(row) {
    var engine = String(row.engine || row.mode || "").toLowerCase();
    var focus = String(row.focusSkill || "").toLowerCase();
    if (engine.includes("wordquest") || focus.includes("decode") || focus.includes("vowel")) return "decoding";
    if (engine.includes("reading") || focus.includes("fluency")) return "fluency";
    if (engine.includes("sentence") || focus.includes("reason")) return "sentence";
    if (engine.includes("writing") || focus.includes("writing")) return "writing";
    return "decoding";
  }

  function upsertSignal(list, label) {
    if (!label) return;
    if (list.indexOf(label) === -1) list.push(label);
    if (list.length > 4) list.shift();
  }

  function addSeriesValue(entry, value) {
    var v = Math.max(0, Math.min(100, Math.round(Number(value) || 0)));
    entry.series.push(v);
    if (entry.series.length > 12) entry.series = entry.series.slice(-12);
    entry.score = entry.series.length
      ? Math.round(entry.series.reduce(function (sum, n) { return sum + n; }, 0) / entry.series.length)
      : 0;
  }

  function buildEvidenceMap() {
    var progress = loadProgress();
    var map = progress.skillEvidence && typeof progress.skillEvidence === "object" ? progress.skillEvidence : {};

    state.roster.forEach(function (student) {
      var sid = String(student.id);
      if (!map[sid] || typeof map[sid] !== "object") map[sid] = studentEvidenceBase();
      SKILLS.forEach(function (skill) {
        if (!map[sid][skill] || typeof map[sid][skill] !== "object") map[sid][skill] = ensureSkillEntry(skill);
        if (!Array.isArray(map[sid][skill].signals)) map[sid][skill].signals = [];
        if (!Array.isArray(map[sid][skill].series)) map[sid][skill].series = [];
      });
    });

    var byStudent = {};
    state.sessions.forEach(function (row) {
      var sid = String(row.studentId || "");
      if (!sid) return;
      if (!byStudent[sid]) byStudent[sid] = [];
      byStudent[sid].push(row);
    });

    Object.keys(byStudent).forEach(function (sid) {
      var ev = map[sid] || studentEvidenceBase();
      var rows = byStudent[sid].slice(0, 24).reverse();
      rows.forEach(function (row) {
        var skill = mapSessionSkill(row);
        var score = Math.round((Number(row.collectedSignals && row.collectedSignals.sessionScore || 0.65) * 100));
        addSeriesValue(ev[skill], score);
        if (score < 55) upsertSignal(ev[skill].signals, "Needs support");
        else if (score > 78) upsertSignal(ev[skill].signals, "Stable trend");
        else upsertSignal(ev[skill].signals, "Building consistency");
      });
      map[sid] = ev;
    });

    progress.wordQuestSignals.slice(-220).forEach(function (signal) {
      var sid = String(signal.studentId || "");
      if (!sid || !map[sid]) return;
      var decoding = map[sid].decoding;
      var adherence = Math.round(Math.max(0, Math.min(1, Number(signal.patternAdherence || signal.updateRespect || 0))) * 100);
      addSeriesValue(decoding, adherence);
      if (Number(signal.vowelSwapRate || 0) < 0.22) upsertSignal(decoding.signals, "Vowel mapping unstable");
      if (Number(signal.repeatedInvalidLetterPlacementCount || 0) > 2) upsertSignal(decoding.signals, "Overwrites known constraints");
      if (Number(signal.timeToFirstGuess || signal.timeToFirstGuessSec || 0) > 12) upsertSignal(decoding.signals, "Slow start");
      if (adherence > 76) upsertSignal(decoding.signals, "Efficient refinement");
    });

    progress.skillEvidence = map;
    saveProgress(progress);
    return map;
  }

  function findStudent(query) {
    var q = String(query || "").trim().toLowerCase();
    if (!q) return null;
    return state.roster.find(function (student) {
      return String(student.name || "").toLowerCase().includes(q) ||
        String(student.id || "").toLowerCase().includes(q) ||
        String(student.code || "").toLowerCase().includes(q) ||
        String(student.focusSkill || "").toLowerCase().includes(q);
    }) || null;
  }

  function sessionsForStudent(student) {
    if (!student) return [];
    var sid = String(student.id);
    return state.sessions.filter(function (row) { return String(row.studentId || "") === sid; });
  }

  function summarizeStudent(student) {
    var rows = sessionsForStudent(student);
    var latest = rows[0] || null;
    var evidence = state.evidence[String(student.id)] || studentEvidenceBase();
    var dominantSkill = SKILLS.slice().sort(function (a, b) {
      return Number(evidence[a].score || 0) - Number(evidence[b].score || 0);
    })[0];
    var score = Number(evidence[dominantSkill].score || 65);
    var nextAction = dominantSkill === "decoding"
      ? "Run vowel sweep mini-lesson in Word Quest"
      : dominantSkill === "fluency"
        ? "Run 3-minute Reading Lab check"
        : dominantSkill === "sentence"
          ? "Launch Sentence Surgery reasoning prompt"
          : "Launch Writing Studio structure pass";

    return {
      confidence: Math.max(40, Math.min(98, 100 - Math.round((100 - score) * 0.7))),
      tier: normalizeTier(student.tier),
      trend: rows.length >= 2 ? "Improving" : "Steady",
      need: dominantSkill,
      nextAction: nextAction,
      sessionCount: rows.length,
      latest: latest,
      evidence: evidence
    };
  }

  function launchRoute(name, studentId) {
    var sid = encodeURIComponent(String(studentId || ""));
    if (name === "wordquest") {
      window.location.href = "index.html?mode=play&studentId=" + sid + "&from=teacher";
      return;
    }
    if (name === "reading-lab") {
      window.location.href = "reading-lab.html?studentId=" + sid + "&from=teacher";
      return;
    }
    if (name === "sentence-surgery") {
      window.location.href = "sentence-surgery.html?studentId=" + sid + "&from=teacher";
      return;
    }
    window.location.href = "writing-studio.html?studentId=" + sid + "&from=teacher";
  }

  function buildSparkline(points, color) {
    var arr = Array.isArray(points) ? points.slice(-12) : [];
    if (!arr.length) arr = [56, 58, 60, 59, 62];
    var max = Math.max.apply(Math, arr);
    var min = Math.min.apply(Math, arr);
    var span = Math.max(1, max - min);
    var w = 220;
    var h = 30;
    var coords = arr.map(function (value, idx) {
      var x = Math.round((idx / Math.max(1, arr.length - 1)) * w);
      var y = Math.round(h - ((value - min) / span) * (h - 4) - 2);
      return x + "," + y;
    }).join(" ");
    return '<svg class="td-sparkline" viewBox="0 0 220 30" preserveAspectRatio="none"><polyline points="' + coords + '" style="stroke:' + color + ';"></polyline></svg>';
  }

  function renderSearchOptions() {
    el.options.innerHTML = "";
    state.roster.forEach(function (student) {
      var opt = document.createElement("option");
      opt.value = student.code || student.id;
      opt.label = student.name + " (" + student.focusSkill + ")";
      el.options.appendChild(opt);
    });
  }

  function renderDrawer() {
    el.drawerList.innerHTML = state.roster.map(function (student) {
      var s = summarizeStudent(student);
      return '<button class="td-drawer-item" data-student-id="' + student.id + '" type="button">' +
        '<strong>' + student.name + '</strong><br><span>' + (student.code || student.id) + ' · ' + tierLabel(student.tier) + ' · ' + s.need + '</span></button>';
    }).join("");

    Array.prototype.forEach.call(el.drawerList.querySelectorAll("[data-student-id]"), function (node) {
      node.addEventListener("click", function () {
        var id = node.getAttribute("data-student-id") || "";
        var student = state.roster.find(function (row) { return String(row.id) === id; }) || null;
        if (!student) return;
        state.selectedStudentId = student.id;
        renderSelectedStudent();
        el.drawer.classList.add("hidden");
      });
    });
  }

  function buildTodayCards(student) {
    var topStudent = student || state.roster[0] || null;
    var summary = topStudent ? summarizeStudent(topStudent) : null;
    var groupAction = state.activeTierTab === "tier3"
      ? "Tier 3 decoding huddle"
      : state.activeTierTab === "tier1"
        ? "Tier 1 fluency reset"
        : "Tier 2 sentence support";

    return [
      {
        kicker: "Highest Need",
        title: topStudent ? (topStudent.name + " · " + summary.nextAction) : "Select a student to seed next move",
        meta: topStudent ? ("Confidence " + summary.confidence + "% · " + tierLabel(summary.tier)) : "Search caseload by name, id, or skill",
        cta: topStudent ? "Launch" : "Find Student",
        action: function () {
          if (topStudent) launchRoute(mapNeedToRoute(summary.need), topStudent.id);
          else el.search.focus();
        }
      },
      {
        kicker: "Group Suggestion",
        title: groupAction,
        meta: "Targeted 10-minute move for " + tierLabel(state.activeTierTab),
        cta: "Start Group",
        action: function () { window.location.href = "session-runner.html?mode=smallgroup&tier=" + encodeURIComponent(state.activeTierTab) + "&from=teacher"; }
      },
      {
        kicker: "Quick Check",
        title: "Run a 3-minute check",
        meta: "Use Reading Lab or Sentence Surgery to gather fresh signals",
        cta: "Run Check",
        action: function () {
          var id = topStudent ? topStudent.id : "";
          launchRoute(state.activeSkillFilter === "sentence" ? "sentence-surgery" : "reading-lab", id);
        }
      }
    ];
  }

  function mapNeedToRoute(need) {
    if (need === "decoding") return "wordquest";
    if (need === "fluency") return "reading-lab";
    if (need === "sentence") return "sentence-surgery";
    return "writing-studio";
  }

  function renderToday(student) {
    var cards = buildTodayCards(student);
    el.todayCards.innerHTML = cards.map(function (card, idx) {
      return '<article class="td-action-card" data-card-index="' + idx + '">' +
        '<div class="td-action-kicker">' + card.kicker + '</div>' +
        '<div class="td-action-title">' + card.title + '</div>' +
        '<div class="td-action-meta">' + card.meta + '</div>' +
        '<button class="td-btn td-btn-primary ' + (idx === 0 ? "td-shimmer" : "") + '" type="button" data-card-action="' + idx + '">' + card.cta + '</button>' +
      '</article>';
    }).join("");

    Array.prototype.forEach.call(el.todayCards.querySelectorAll("[data-card-action]"), function (node) {
      node.addEventListener("click", function () {
        var idx = Number(node.getAttribute("data-card-action") || 0);
        var card = cards[idx];
        if (card && typeof card.action === "function") card.action();
      });
    });
  }

  function renderGroups() {
    var scoped = state.roster.filter(function (student) {
      return normalizeTier(student.tier) === state.activeTierTab;
    });
    if (!scoped.length) {
      el.groups.innerHTML = '<div class="td-group-row"><div class="td-group-sub">No students in this tier yet.</div></div>';
      return;
    }
    el.groups.innerHTML = scoped.map(function (student) {
      var summary = summarizeStudent(student);
      return '<article class="td-group-row" data-student-id="' + student.id + '">' +
        '<div class="td-group-head"><span class="td-group-title">' + student.name + '</span><span>' + summary.confidence + '%</span></div>' +
        '<div class="td-group-sub">Need: ' + summary.need + ' · Next: ' + summary.nextAction + '</div>' +
      '</article>';
    }).join("");

    Array.prototype.forEach.call(el.groups.querySelectorAll("[data-student-id]"), function (node) {
      node.addEventListener("click", function () {
        state.selectedStudentId = node.getAttribute("data-student-id") || "";
        renderSelectedStudent();
      });
    });
  }

  function aggregateSkill(skill) {
    var points = [];
    var chips = [];
    state.roster.forEach(function (student) {
      var ev = state.evidence[String(student.id)] || studentEvidenceBase();
      var row = ev[skill] || ensureSkillEntry(skill);
      points = points.concat(row.series || []);
      (row.signals || []).forEach(function (label) { if (chips.indexOf(label) === -1) chips.push(label); });
    });
    points = points.slice(-12);
    var score = points.length ? Math.round(points.reduce(function (sum, n) { return sum + n; }, 0) / points.length) : 0;
    return { score: score, chips: chips.slice(0, 3), points: points };
  }

  function renderEvidenceOverview() {
    var colorBySkill = {
      decoding: "#5cd1ff",
      fluency: "#6ee7b7",
      sentence: "#f4c978",
      writing: "#ff9cc2"
    };
    el.evidenceOverview.innerHTML = SKILLS.map(function (skill) {
      var row = aggregateSkill(skill);
      var chips = row.chips.length ? row.chips : ["No recent signal"];
      return '<article class="td-skill-row ' + (state.activeSkillFilter === skill ? "is-active" : "") + '" data-skill="' + skill + '">' +
        '<div class="td-skill-head"><div class="td-skill-name">' + skill.charAt(0).toUpperCase() + skill.slice(1) + '</div><div class="td-skill-score">' + row.score + '</div></div>' +
        '<div class="td-chip-row">' + chips.map(function (chip) { return '<span class="td-chip">' + chip + '</span>'; }).join("") + '</div>' +
        buildSparkline(row.points, colorBySkill[skill]) +
      '</article>';
    }).join("");

    Array.prototype.forEach.call(el.evidenceOverview.querySelectorAll("[data-skill]"), function (node) {
      node.addEventListener("click", function () {
        var skill = node.getAttribute("data-skill") || "";
        state.activeSkillFilter = state.activeSkillFilter === skill ? "" : skill;
        renderToday(state.selectedStudentId ? state.roster.find(function (s) { return s.id === state.selectedStudentId; }) : null);
        renderEvidenceOverview();
      });
    });
  }

  function renderSelectedStudent() {
    var student = state.roster.find(function (row) { return row.id === state.selectedStudentId; }) || null;
    if (!student) {
      el.studentView.classList.add("hidden");
      el.studentEmpty.classList.remove("hidden");
      el.nextCta.onclick = null;
      renderToday(null);
      return;
    }

    var summary = summarizeStudent(student);
    var ev = summary.evidence;
    el.studentEmpty.classList.add("hidden");
    el.studentView.classList.remove("hidden");
    el.studentName.textContent = student.name + " (" + (student.code || student.id) + ")";
    el.tier.textContent = tierLabel(summary.tier);
    el.need.textContent = summary.need;
    el.confidence.textContent = summary.confidence + "%";
    el.trend.textContent = summary.trend;
    el.sessionCount.textContent = String(summary.sessionCount);
    el.studentNext.textContent = summary.nextAction;
    el.notes.textContent = student.notes || "No notes yet.";

    el.studentEvidence.innerHTML = SKILLS.map(function (skill) {
      var row = ev[skill] || ensureSkillEntry(skill);
      return '<div class="td-group-sub"><strong>' + skill + ':</strong> ' + row.score + ' · ' + (row.signals || []).slice(0, 2).join(" • ") + '</div>';
    }).join("");

    el.nextCta.onclick = function () { launchRoute(mapNeedToRoute(summary.need), student.id); };
    el.studentRun.onclick = function () { launchRoute("reading-lab", student.id); };
    renderToday(student);
  }

  function exportBundle() {
    var payload = {
      exportedAt: new Date().toISOString(),
      roster: state.roster,
      sessions: state.sessions.slice(0, 120),
      skillEvidence: state.evidence
    };
    var blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
    var a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "cornerstone-dashboard-evidence.json";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(function () { URL.revokeObjectURL(a.href); }, 400);
    setStatus("Export complete.");
  }

  function bindEvents() {
    el.search.addEventListener("input", function () {
      var student = findStudent(el.search.value);
      if (!student) return;
      state.selectedStudentId = student.id;
      renderSelectedStudent();
    });

    el.openStudents.addEventListener("click", function () {
      el.drawer.classList.toggle("hidden");
    });

    el.closeStudents.addEventListener("click", function () {
      el.drawer.classList.add("hidden");
    });

    el.exportBtn.addEventListener("click", exportBundle);
    el.settingsBtn.addEventListener("click", function () { setStatus("Settings are managed from app preferences."); });
    el.helpBtn.addEventListener("click", function () { setStatus("Tip: search student or click a skill row to focus today cards."); });

    el.tierTabs.forEach(function (node) {
      node.addEventListener("click", function () {
        state.activeTierTab = node.getAttribute("data-tier-tab") || "tier2";
        el.tierTabs.forEach(function (tab) { tab.classList.toggle("is-active", tab === node); });
        renderGroups();
        renderToday(state.selectedStudentId ? state.roster.find(function (s) { return s.id === state.selectedStudentId; }) : null);
      });
    });

    el.quickLaunchButtons.forEach(function (node) {
      node.addEventListener("click", function () {
        launchRoute(node.getAttribute("data-launch") || "wordquest", state.selectedStudentId);
      });
    });
  }

  function refresh() {
    state.roster = loadRoster();
    state.sessions = loadSessions();
    state.evidence = buildEvidenceMap();
    renderSearchOptions();
    renderDrawer();
    renderGroups();
    renderEvidenceOverview();
    renderSelectedStudent();
  }

  bindEvents();
  refresh();
})();
