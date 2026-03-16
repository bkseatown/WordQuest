(function supportStoreModule(root, factory) {
  if (typeof module === "object" && module.exports) {
    module.exports = factory();
    return;
  }
  root.CSSupportStore = factory();
})(typeof self !== "undefined" ? self : this, function () {
  "use strict";

  var KEY = "CS_SUPPORT_STORE_V1";
  var VERSION = 1;

  function nowIso() {
    return new Date().toISOString();
  }

  function parse(raw) {
    if (!raw) return null;
    try { return JSON.parse(raw); } catch (_e) { return null; }
  }

  function emptyStore() {
    return { version: VERSION, students: {} };
  }

  function load() {
    var parsed = parse(localStorage.getItem(KEY));
    if (!parsed || typeof parsed !== "object") return emptyStore();
    if (!parsed.students || typeof parsed.students !== "object") parsed.students = {};
    return parsed;
  }

  function save(store) {
    localStorage.setItem(KEY, JSON.stringify(store));
    return store;
  }

  function normalizeId(studentId) {
    return String(studentId || "").trim() || "demo-student";
  }

  function ensureStudent(store, studentId, profile) {
    var sid = normalizeId(studentId);
    var row = store.students[sid];
    if (!row || typeof row !== "object") {
      row = {
        profile: {
          name: sid,
          grade: "",
          tags: [],
          createdAt: nowIso(),
          updatedAt: nowIso()
        },
        needs: [],
        goals: [],
        accommodations: [],
        interventions: [],
        meetings: [],
        artifacts: [],
        evidencePoints: [],
        institutionalAnchors: emptyAnchors(),
        implementationTracking: emptyImplementationTracking(),
        executiveFunction: emptyExecutiveFunction()
      };
      store.students[sid] = row;
    }
    row.profile = row.profile || {};
    if (profile && typeof profile === "object") {
      if (profile.name) row.profile.name = String(profile.name);
      if (profile.grade) row.profile.grade = String(profile.grade);
      if (Array.isArray(profile.tags)) row.profile.tags = profile.tags.slice(0, 20).map(String);
    }
    if (!Array.isArray(row.profile.tags)) row.profile.tags = [];
    if (!row.profile.createdAt) row.profile.createdAt = nowIso();
    row.profile.updatedAt = nowIso();
    ["needs", "goals", "accommodations", "interventions", "meetings", "artifacts", "evidencePoints"].forEach(function (key) {
      if (!Array.isArray(row[key])) row[key] = [];
    });
    row.institutionalAnchors = normalizeAnchors(row.institutionalAnchors);
    row.implementationTracking = normalizeImplementationTracking(row.implementationTracking);
    row.executiveFunction = normalizeExecutiveFunction(row.executiveFunction);
    return row;
  }

  function emptyAnchors() {
    return {
      reading: {
        mapRIT: null,
        aimswebPercentile: null,
        corePhonicsBenchmark: null,
        wordsTheirWayStage: null,
        fundationsUnit: null,
        classroomData: null,
        interventionData: null
      },
      writing: {
        onDemandRubricScore: null,
        currentWritingGoal: null,
        classroomData: null,
        interventionData: null
      },
      math: {
        mapRIT: null,
        bridgesUnitScore: null,
        glossStage: null,
        illustrativeCheckpoint: null,
        classroomData: null,
        interventionData: null
      }
    };
  }

  function finiteOrNull(value) {
    if (value === "" || value == null) return null;
    var n = Number(value);
    return Number.isFinite(n) ? n : null;
  }

  function textOrNull(value, max) {
    var s = String(value == null ? "" : value).trim();
    if (!s) return null;
    return s.slice(0, max || 120);
  }

  function normalizeAnchors(raw) {
    var base = emptyAnchors();
    var row = raw && typeof raw === "object" ? raw : {};
    var reading = row.reading && typeof row.reading === "object" ? row.reading : {};
    var writing = row.writing && typeof row.writing === "object" ? row.writing : {};
    var math = row.math && typeof row.math === "object" ? row.math : {};
    base.reading.mapRIT = finiteOrNull(reading.mapRIT);
    base.reading.aimswebPercentile = finiteOrNull(reading.aimswebPercentile);
    base.reading.corePhonicsBenchmark = textOrNull(reading.corePhonicsBenchmark, 80);
    base.reading.wordsTheirWayStage = textOrNull(reading.wordsTheirWayStage, 80);
    base.reading.fundationsUnit = textOrNull(reading.fundationsUnit, 80);
    base.reading.classroomData = textOrNull(reading.classroomData, 240);
    base.reading.interventionData = textOrNull(reading.interventionData, 240);
    base.writing.onDemandRubricScore = finiteOrNull(writing.onDemandRubricScore);
    base.writing.currentWritingGoal = textOrNull(writing.currentWritingGoal, 180);
    base.writing.classroomData = textOrNull(writing.classroomData, 240);
    base.writing.interventionData = textOrNull(writing.interventionData, 240);
    base.math.mapRIT = finiteOrNull(math.mapRIT);
    base.math.bridgesUnitScore = finiteOrNull(math.bridgesUnitScore);
    base.math.glossStage = textOrNull(math.glossStage, 80);
    base.math.illustrativeCheckpoint = textOrNull(math.illustrativeCheckpoint, 120);
    base.math.classroomData = textOrNull(math.classroomData, 240);
    base.math.interventionData = textOrNull(math.interventionData, 240);
    return base;
  }

  function emptyImplementationTracking() {
    return {
      accommodations: [],
      tier1Interventions: []
    };
  }

  function emptyExecutiveFunction() {
    return {
      activeTask: null,
      focusHistory: [],
      upcomingTasks: []
    };
  }

  function normalizeImplementationTracking(raw) {
    var base = emptyImplementationTracking();
    var row = raw && typeof raw === "object" ? raw : {};
    base.accommodations = Array.isArray(row.accommodations) ? row.accommodations.slice(0, 120) : [];
    base.tier1Interventions = Array.isArray(row.tier1Interventions) ? row.tier1Interventions.slice(0, 240) : [];
    return base;
  }

  function normalizeExecutiveFunction(raw) {
    var base = emptyExecutiveFunction();
    var row = raw && typeof raw === "object" ? raw : {};
    base.activeTask = row.activeTask && typeof row.activeTask === "object" ? row.activeTask : null;
    base.focusHistory = Array.isArray(row.focusHistory) ? row.focusHistory.slice(0, 120) : [];
    base.upcomingTasks = Array.isArray(row.upcomingTasks) ? row.upcomingTasks.slice(0, 80) : [];
    return base;
  }

  function sameDay(aIso, bIso) {
    return String(aIso || "").slice(0, 10) === String(bIso || "").slice(0, 10);
  }

  function uid(prefix) {
    return String(prefix || "item") + "_" + Date.now().toString(36) + "_" + Math.random().toString(36).slice(2, 6);
  }

  function addItem(studentId, type, payload) {
    var store = load();
    var student = ensureStudent(store, studentId, payload && payload.profile);
    if (!Array.isArray(student[type])) return null;
    var item = Object.assign({}, payload || {});
    if (!item.id) item.id = uid(type);
    if (!item.createdAt) item.createdAt = nowIso();
    item.updatedAt = nowIso();
    student[type].unshift(item);
    save(store);
    return item;
  }

  function updateItem(studentId, type, id, patch) {
    var store = load();
    var student = ensureStudent(store, studentId);
    var list = student[type];
    if (!Array.isArray(list)) return null;
    for (var i = 0; i < list.length; i += 1) {
      if (String(list[i].id) !== String(id)) continue;
      list[i] = Object.assign({}, list[i], patch || {}, { updatedAt: nowIso() });
      save(store);
      return list[i];
    }
    return null;
  }

  function removeItem(studentId, type, id) {
    var store = load();
    var student = ensureStudent(store, studentId);
    var list = student[type];
    if (!Array.isArray(list)) return false;
    var next = list.filter(function (row) { return String(row.id) !== String(id); });
    if (next.length === list.length) return false;
    student[type] = next;
    save(store);
    return true;
  }

  function getStudent(studentId) {
    var store = load();
    var student = ensureStudent(store, studentId);
    return JSON.parse(JSON.stringify(student));
  }

  function getInstitutionalAnchors(studentId) {
    var store = load();
    var student = ensureStudent(store, studentId);
    return JSON.parse(JSON.stringify(normalizeAnchors(student.institutionalAnchors)));
  }

  function setInstitutionalAnchors(studentId, anchorsPatch) {
    var store = load();
    var student = ensureStudent(store, studentId);
    var current = normalizeAnchors(student.institutionalAnchors);
    var patch = anchorsPatch && typeof anchorsPatch === "object" ? anchorsPatch : {};
    var merged = {
      reading: Object.assign({}, current.reading, patch.reading || {}),
      writing: Object.assign({}, current.writing, patch.writing || {}),
      math: Object.assign({}, current.math, patch.math || {})
    };
    student.institutionalAnchors = normalizeAnchors(merged);
    save(store);
    return JSON.parse(JSON.stringify(student.institutionalAnchors));
  }

  function logAccommodationImplementation(studentId, payload) {
    var store = load();
    var student = ensureStudent(store, studentId);
    var tracking = normalizeImplementationTracking(student.implementationTracking);
    var src = payload && typeof payload === "object" ? payload : {};
    var id = String(src.id || "accommodation");
    var name = String(src.name || src.title || id || "Accommodation");
    var implemented = src.implemented !== false;
    var at = String(src.date || nowIso());
    var row = tracking.accommodations.find(function (item) { return String(item.id) === id; });
    if (!row) {
      row = { id: id, name: name, history: [] };
      tracking.accommodations.unshift(row);
    }
    row.name = name;
    row.history = Array.isArray(row.history) ? row.history : [];
    var existingToday = row.history.find(function (h) { return sameDay(h.date, at); });
    if (existingToday) {
      existingToday.implemented = implemented;
    } else {
      row.history.unshift({ date: at, implemented: implemented });
      row.history = row.history.slice(0, 120);
    }
    student.implementationTracking = tracking;
    save(store);
    return JSON.parse(JSON.stringify(row));
  }

  function logTier1InterventionUsage(studentId, payload) {
    var store = load();
    var student = ensureStudent(store, studentId);
    var tracking = normalizeImplementationTracking(student.implementationTracking);
    var src = payload && typeof payload === "object" ? payload : {};
    tracking.tier1Interventions.unshift({
      id: String(src.id || uid("tier1")),
      name: String(src.name || src.strategy || "Tier 1 intervention"),
      date: String(src.date || nowIso()),
      durationMin: clamp(asNumber(src.durationMin, 10), 5, 60),
      context: String(src.context || "ELA")
    });
    tracking.tier1Interventions = tracking.tier1Interventions.slice(0, 240);
    student.implementationTracking = tracking;
    save(store);
    return JSON.parse(JSON.stringify(tracking.tier1Interventions[0]));
  }

  function countSchoolDays(windowDays) {
    var days = clamp(asNumber(windowDays, 21), 7, 90);
    var now = new Date();
    var count = 0;
    for (var i = 0; i < days; i += 1) {
      var d = new Date(now.getTime() - (i * 86400000));
      var wd = d.getDay();
      if (wd !== 0 && wd !== 6) count += 1;
    }
    return Math.max(1, count);
  }

  function calculateImplementationConsistency(studentId, windowDays) {
    var sid = normalizeId(studentId);
    var student = getStudent(sid);
    var tracking = normalizeImplementationTracking(student.implementationTracking);
    var days = clamp(asNumber(windowDays, 21), 7, 90);
    var cutoff = Date.now() - (days * 86400000);
    var implementedDays = {};
    (tracking.accommodations || []).forEach(function (row) {
      var history = Array.isArray(row.history) ? row.history : [];
      history.forEach(function (entry) {
        if (!entry || entry.implemented !== true) return;
        var ts = Date.parse(String(entry.date || ""));
        if (!Number.isFinite(ts) || ts < cutoff) return;
        implementedDays[String(entry.date).slice(0, 10)] = true;
      });
    });
    (tracking.tier1Interventions || []).forEach(function (row) {
      var ts = Date.parse(String(row.date || ""));
      if (!Number.isFinite(ts) || ts < cutoff) return;
      implementedDays[String(row.date).slice(0, 10)] = true;
    });
    var activeDays = Object.keys(implementedDays).length;
    var schoolDays = countSchoolDays(days);
    var rate = activeDays / Math.max(1, schoolDays);
    return {
      windowDays: days,
      schoolDays: schoolDays,
      activeDays: activeDays,
      percent: Math.round(rate * 1000) / 10
    };
  }

  function getImplementationTracking(studentId) {
    var store = load();
    var student = ensureStudent(store, studentId);
    return JSON.parse(JSON.stringify(normalizeImplementationTracking(student.implementationTracking)));
  }

  function getExecutiveFunction(studentId) {
    var store = load();
    var student = ensureStudent(store, studentId);
    return JSON.parse(JSON.stringify(normalizeExecutiveFunction(student.executiveFunction)));
  }

  function setActiveExecutiveTask(studentId, payload) {
    var store = load();
    var student = ensureStudent(store, studentId);
    var src = payload && typeof payload === "object" ? payload : {};
    var ef = normalizeExecutiveFunction(student.executiveFunction);
    var steps = Array.isArray(src.steps) ? src.steps.slice(0, 12).map(String) : [];
    ef.activeTask = {
      id: String(src.id || uid("eftask")),
      name: String(src.name || "Task").slice(0, 180),
      steps: steps,
      createdAt: nowIso(),
      completedSteps: Array.isArray(src.completedSteps) ? src.completedSteps.slice(0, 12).map(function (v) { return Number(v); }) : []
    };
    student.executiveFunction = ef;
    save(store);
    return JSON.parse(JSON.stringify(ef.activeTask));
  }

  function updateExecutiveTaskProgress(studentId, completedSteps) {
    var store = load();
    var student = ensureStudent(store, studentId);
    var ef = normalizeExecutiveFunction(student.executiveFunction);
    if (!ef.activeTask) return null;
    ef.activeTask.completedSteps = Array.isArray(completedSteps)
      ? completedSteps.slice(0, 12).map(function (v) { return Number(v); })
      : [];
    ef.activeTask.updatedAt = nowIso();
    student.executiveFunction = ef;
    save(store);
    return JSON.parse(JSON.stringify(ef.activeTask));
  }

  function completeExecutiveTask(studentId) {
    var store = load();
    var student = ensureStudent(store, studentId);
    var ef = normalizeExecutiveFunction(student.executiveFunction);
    if (!ef.activeTask) return null;
    var done = Object.assign({}, ef.activeTask, {
      completedAt: nowIso(),
      status: "Completed"
    });
    ef.activeTask = null;
    student.executiveFunction = ef;
    save(store);
    return JSON.parse(JSON.stringify(done));
  }

  function logFocusSprint(studentId, payload) {
    var store = load();
    var student = ensureStudent(store, studentId);
    var ef = normalizeExecutiveFunction(student.executiveFunction);
    var src = payload && typeof payload === "object" ? payload : {};
    ef.focusHistory.unshift({
      taskId: String(src.taskId || ""),
      date: String(src.date || nowIso()),
      duration: clamp(asNumber(src.duration, 10), 1, 60),
      selfRating: String(src.selfRating || "Mostly")
    });
    ef.focusHistory = ef.focusHistory.slice(0, 120);
    student.executiveFunction = ef;
    save(store);
    return JSON.parse(JSON.stringify(ef.focusHistory[0]));
  }

  function addUpcomingTask(studentId, payload) {
    var store = load();
    var student = ensureStudent(store, studentId);
    var ef = normalizeExecutiveFunction(student.executiveFunction);
    var src = payload && typeof payload === "object" ? payload : {};
    ef.upcomingTasks.unshift({
      id: String(src.id || uid("upcoming")),
      name: String(src.name || "Task").slice(0, 180),
      dueDate: String(src.dueDate || ""),
      status: String(src.status || "Not Started"),
      createdAt: nowIso()
    });
    ef.upcomingTasks = ef.upcomingTasks.slice(0, 80);
    student.executiveFunction = ef;
    save(store);
    return JSON.parse(JSON.stringify(ef.upcomingTasks[0]));
  }

  function updateUpcomingTask(studentId, taskId, patch) {
    var store = load();
    var student = ensureStudent(store, studentId);
    var ef = normalizeExecutiveFunction(student.executiveFunction);
    var list = ef.upcomingTasks || [];
    for (var i = 0; i < list.length; i += 1) {
      if (String(list[i].id) !== String(taskId)) continue;
      list[i] = Object.assign({}, list[i], patch || {}, { updatedAt: nowIso() });
      ef.upcomingTasks = list;
      student.executiveFunction = ef;
      save(store);
      return JSON.parse(JSON.stringify(list[i]));
    }
    return null;
  }

  function setNeeds(studentId, needs) {
    var store = load();
    var student = ensureStudent(store, studentId);
    student.needs = Array.isArray(needs) ? needs.slice(0, 12).map(function (row) {
      return {
        key: String(row.key || row.skillId || ""),
        label: String(row.label || row.skillId || "Need"),
        domain: String(row.domain || ""),
        severity: Number(row.severity || 0)
      };
    }) : [];
    save(store);
    return student.needs;
  }

  function exportStudentSummary(studentId) {
    var sid = normalizeId(studentId);
    var student = getStudent(sid);
    var json = {
      studentId: sid,
      exportedAt: nowIso(),
      student: student
    };
    var html = [
      "<!doctype html><html><head><meta charset='utf-8'><title>Support Summary</title>",
      "<style>body{font:14px/1.45 -apple-system,Segoe UI,Arial;padding:24px;color:#122}h1,h2{margin:0 0 8px}section{margin:14px 0;padding:12px;border:1px solid #ccd;border-radius:8px}</style>",
      "</head><body>",
      "<h1>Student Support Summary</h1>",
      "<p><strong>" + escapeHtml(student.profile.name || sid) + "</strong> (" + escapeHtml(sid) + ")</p>",
      "<p>Exported: " + escapeHtml(nowIso()) + "</p>",
      "<section><h2>Needs</h2><ul>" + student.needs.map(function (n) { return "<li>" + escapeHtml(n.label || n.key || "Need") + "</li>"; }).join("") + "</ul></section>",
      "<section><h2>Goals</h2><ul>" + student.goals.map(function (g) { return "<li>" + escapeHtml(g.skill || g.domain || "Goal") + " - " + escapeHtml(g.target || "") + "</li>"; }).join("") + "</ul></section>",
      "<section><h2>Interventions</h2><ul>" + student.interventions.map(function (i) { return "<li>Tier " + escapeHtml(i.tier) + " - " + escapeHtml(i.focus || i.strategy || "") + "</li>"; }).join("") + "</ul></section>",
      "</body></html>"
    ].join("");
    return { json: json, html: html };
  }

  function exportReferralPacket(studentId) {
    var sid = normalizeId(studentId);
    var student = getStudent(sid);
    var interventions = student.interventions.slice(0, 20);
    var meetings = student.meetings.slice(0, 12);
    var accommodations = student.accommodations.slice(0, 10);
    var consistency = calculateImplementationConsistency(sid, 21);
    var tracking = normalizeImplementationTracking(student.implementationTracking);
    var tier1Recent = (tracking.tier1Interventions || []).filter(function (row) {
      var ts = Date.parse(String(row.date || ""));
      return Number.isFinite(ts) && ts >= (Date.now() - (28 * 86400000));
    });
    var tier1PerWeek = Math.round((tier1Recent.length / 4) * 10) / 10;
    var artifacts = student.artifacts.slice(0, 12);
    var safeName = firstName(student.profile.name || sid);
    var tier1 = interventions.find(function (item) { return Number(item.tier || 1) === 1; }) || null;
    var points = tier1 && Array.isArray(tier1.datapoints) ? tier1.datapoints.slice(0, 8) : [];
    var html = [
      "<!doctype html><html><head><meta charset='utf-8'><title>Referral Packet</title>",
      "<style>body{font:14px/1.45 -apple-system,Segoe UI,Arial;padding:20px;color:#112}h1,h2{margin:0 0 8px}table{width:100%;border-collapse:collapse}th,td{border:1px solid #ccd;padding:6px;text-align:left}</style>",
      "</head><body>",
      "<h1>Referral-Ready Evidence Packet</h1>",
      "<p><strong>" + escapeHtml(safeName) + "</strong> (" + escapeHtml(sid) + ")</p>",
      "<h2>Interventions (Last 6-8 Weeks)</h2>",
      "<table><thead><tr><th>Tier</th><th>Domain</th><th>Strategy</th><th>Frequency</th><th>Duration</th></tr></thead><tbody>",
      interventions.map(function (i) {
        return "<tr><td>" + escapeHtml(i.tier || "") + "</td><td>" + escapeHtml(i.domain || "") + "</td><td>" + escapeHtml(i.strategy || i.focus || "") + "</td><td>" + escapeHtml(i.frequency || "") + "</td><td>" + escapeHtml(i.durationMinutes || i.durationMin || "") + " min</td></tr>";
      }).join(""),
      "</tbody></table>",
      "<h2>Tier 1 Progress (latest)</h2>",
      "<p>Metric: " + escapeHtml(tier1 && tier1.progressMetric || "Not set") + "</p>",
      "<table><thead><tr><th>Date</th><th>Value</th><th>Note</th></tr></thead><tbody>",
      points.map(function (p) {
        return "<tr><td>" + escapeHtml(p.date || "") + "</td><td>" + escapeHtml(p.value || "") + "</td><td>" + escapeHtml(p.note || "") + "</td></tr>";
      }).join("") || "<tr><td colspan='3'>No Tier 1 datapoints yet.</td></tr>",
      "</tbody></table>",
      "<h2>Accommodations Snapshot</h2>",
      "<ul>" + accommodations.map(function (a) {
        return "<li><strong>" + escapeHtml(a.title || "Accommodation") + ":</strong> " + escapeHtml(a.teacherText || a.whenToUse || "") + "</li>";
      }).join("") + "</ul>",
      "<h2>Implementation Fidelity</h2>",
      "<p>Accommodation implementation rate (past 3 weeks): " + escapeHtml(String(consistency.percent)) + "%</p>",
      "<p>Tier 1 intervention frequency (past 4 weeks): " + escapeHtml(String(tier1PerWeek)) + " / week</p>",
      "<h2>Meetings + Decisions</h2>",
      "<ul>" + meetings.map(function (m) { return "<li>" + escapeHtml(m.type || "Meeting") + " (" + escapeHtml(m.date || "") + ") - " + escapeHtml(m.decisions || "") + "</li>"; }).join("") + "</ul>",
      "<h2>Linked Artifacts</h2>",
      "<ul>" + artifacts.map(function (a) {
        return "<li>" + escapeHtml(a.title || a.type || "Artifact") + (a.dataRef ? " - " + escapeHtml(a.dataRef) : "") + "</li>";
      }).join("") + "</ul>",
      "</body></html>"
    ].join("");
    return { html: html, json: { studentId: sid, firstName: safeName, exportedAt: nowIso(), student: student } };
  }

  function buildMeetingSummary(studentId, options) {
    var sid = normalizeId(studentId);
    var student = getStudent(sid);
    var opts = options && typeof options === "object" ? options : {};
    var strengths = String(opts.strengths || "Shows engagement in structured support routines.");
    var needs = (student.needs || []).slice(0, 4).map(function (n) { return n.label || n.key; }).join(", ") || "Collect baseline evidence";
    var nextSteps = String(opts.nextSteps || "Continue targeted intervention and review in 14 days.");
    var html = [
      "<!doctype html><html><head><meta charset='utf-8'><title>Meeting Summary</title>",
      "<style>body{font:14px/1.45 -apple-system,Segoe UI,Arial;padding:20px;color:#112}h1,h2{margin:0 0 8px}section{margin:12px 0;padding:10px;border:1px solid #ccd;border-radius:8px}</style>",
      "</head><body>",
      "<h1>Student Meeting Summary</h1>",
      "<p><strong>" + escapeHtml(student.profile.name || sid) + "</strong> (" + escapeHtml(sid) + ")</p>",
      "<section><h2>Strengths</h2><p>" + escapeHtml(strengths) + "</p></section>",
      "<section><h2>Needs</h2><p>" + escapeHtml(needs) + "</p></section>",
      "<section><h2>Interventions attempted</h2><p>" + escapeHtml((student.interventions || []).slice(0, 6).map(function (i) { return "Tier " + i.tier + " " + (i.strategy || i.focus || "support"); }).join(" • ")) + "</p></section>",
      "<section><h2>Next steps</h2><p>" + escapeHtml(nextSteps) + "</p></section>",
      "</body></html>"
    ].join("");
    return { html: html, text: "Student: " + (student.profile.name || sid) + "\nNeeds: " + needs + "\nNext steps: " + nextSteps };
  }

  function buildTier1EvidencePack(studentId, options) {
    var sid = normalizeId(studentId);
    var student = getStudent(sid);
    var opts = options && typeof options === "object" ? options : {};
    var domains = Array.isArray(opts.domains) ? opts.domains : ["Reading"];
    var duration = String(opts.duration || "6 weeks");
    var frequency = String(opts.frequency || "3x/week");
    var notes = String(opts.notes || "");
    var html = [
      "<!doctype html><html><head><meta charset='utf-8'><title>Tier 1 Evidence Pack</title>",
      "<style>body{font:14px/1.45 -apple-system,Segoe UI,Arial;padding:20px}h1,h2{margin:0 0 8px}table{width:100%;border-collapse:collapse}th,td{border:1px solid #ccd;padding:6px;text-align:left}</style>",
      "</head><body><h1>Tier 1 Evidence Pack</h1>",
      "<p><strong>" + escapeHtml(student.profile.name || sid) + "</strong> (" + escapeHtml(sid) + ")</p>",
      "<p>Concern areas: " + escapeHtml(domains.join(", ")) + " • Duration: " + escapeHtml(duration) + " • Frequency: " + escapeHtml(frequency) + "</p>",
      "<h2>Intervention log</h2><table><thead><tr><th>Date</th><th>Domain</th><th>Strategy</th><th>Minutes</th></tr></thead><tbody>",
      (student.interventions || []).slice(0, 14).map(function (i) {
        return "<tr><td>" + escapeHtml((i.startAt || "").slice(0, 10)) + "</td><td>" + escapeHtml(i.domain || "") + "</td><td>" + escapeHtml(i.strategy || i.focus || "") + "</td><td>" + escapeHtml(i.durationMin || "") + "</td></tr>";
      }).join(""),
      "</tbody></table>",
      "<h2>Notes</h2><p>" + escapeHtml(notes || "Teacher notes not provided.") + "</p>",
      "</body></html>"
    ].join("");
    var text = "Tier 1 Evidence Pack - " + (student.profile.name || sid) + "\nAreas: " + domains.join(", ") + "\nDuration: " + duration + " | Frequency: " + frequency + "\nNotes: " + notes;
    return { html: html, text: text };
  }

  function firstName(value) {
    var full = String(value || "").trim();
    if (!full) return "";
    return full.split(/\s+/)[0] || full;
  }

  function asNumber(value, fallback) {
    var n = Number(value);
    return Number.isFinite(n) ? n : (Number.isFinite(fallback) ? fallback : 0);
  }

  function clamp(n, lo, hi) {
    return Math.max(lo, Math.min(hi, n));
  }

  function normalizeDatapoint(payload) {
    var base = payload && typeof payload === "object" ? payload : {};
    var value = asNumber(base.value, 0);
    return {
      date: String(base.date || new Date().toISOString().slice(0, 10)),
      value: clamp(value, 0, 1000),
      note: String(base.note || "").slice(0, 280)
    };
  }

  function ensureInterventionFields(intervention) {
    var row = intervention && typeof intervention === "object" ? intervention : {};
    if (!Array.isArray(row.fidelityChecklist)) row.fidelityChecklist = [];
    if (!Array.isArray(row.datapoints)) row.datapoints = [];
    if (!Array.isArray(row.attachments)) row.attachments = [];
    if (!Array.isArray(row.evidenceRefs)) row.evidenceRefs = [];
    if (row.tier == null) row.tier = 1;
    if (!row.startDate && row.startAt) row.startDate = String(row.startAt).slice(0, 10);
    if (!row.frequency) row.frequency = "3x/week";
    if (!row.durationMinutes && row.durationMin) row.durationMinutes = row.durationMin;
    if (!row.progressMetric) row.progressMetric = "MAP";
    if (!row.goalStatement) row.goalStatement = "";
    if (typeof row.readyToRefer !== "boolean") row.readyToRefer = false;
    return row;
  }

  function computeReferralReadiness(intervention, thresholds) {
    var row = ensureInterventionFields(intervention);
    var cfg = thresholds && typeof thresholds === "object" ? thresholds : {};
    var minDatapoints = clamp(asNumber(cfg.minDatapoints, 6), 3, 12);
    var minFidelity = clamp(asNumber(cfg.minFidelityChecks, 2), 1, 10);
    var minDuration = clamp(asNumber(cfg.minDurationMinutes, 15), 5, 120);
    var datapoints = Array.isArray(row.datapoints) ? row.datapoints.length : 0;
    var fidelityChecks = Array.isArray(row.fidelityChecklist)
      ? row.fidelityChecklist.filter(function (item) {
          if (typeof item === "boolean") return item;
          return !!(item && typeof item === "object" && item.done);
        }).length
      : 0;
    var duration = asNumber(row.durationMinutes || row.durationMin, 0);
    var ready = datapoints >= minDatapoints && fidelityChecks >= minFidelity && duration >= minDuration;
    return {
      ready: ready,
      datapoints: datapoints,
      fidelityChecks: fidelityChecks,
      durationMinutes: duration,
      thresholds: {
        minDatapoints: minDatapoints,
        minFidelityChecks: minFidelity,
        minDurationMinutes: minDuration
      }
    };
  }

  function startTier1Plan(studentId, payload) {
    var base = payload && typeof payload === "object" ? payload : {};
    var fidelity = Array.isArray(base.fidelityChecklist) && base.fidelityChecklist.length
      ? base.fidelityChecklist.slice(0, 12).map(function (item) {
          return typeof item === "string" ? { label: item, done: false, updatedAt: nowIso() } : item;
        })
      : [
          { label: "Strategy delivered as planned", done: false, updatedAt: nowIso() },
          { label: "Prompting/check-ins completed", done: false, updatedAt: nowIso() },
          { label: "Student response noted", done: false, updatedAt: nowIso() }
        ];
    var item = addItem(studentId, "interventions", {
      tier: 1,
      interventionId: String(base.interventionId || ""),
      startDate: String(base.startDate || new Date().toISOString().slice(0, 10)),
      endDate: base.endDate ? String(base.endDate) : "",
      frequency: String(base.frequency || "3x/week"),
      durationMinutes: clamp(asNumber(base.durationMinutes || base.durationMin, 20), 5, 120),
      progressMetric: String(base.progressMetric || "MAP"),
      domain: String(base.domain || "Reading"),
      focus: String(base.focus || "Tier 1 support"),
      strategy: String(base.strategy || "Targeted classroom support"),
      teacherNote: String(base.teacherNote || "").slice(0, 600),
      fidelityChecklist: fidelity,
      datapoints: [],
      attachments: [],
      evidenceRefs: []
    });
    if (!item) return null;
    var readiness = computeReferralReadiness(item);
    return updateItem(studentId, "interventions", item.id, { readyToRefer: readiness.ready }) || item;
  }

  function addInterventionDatapoint(studentId, interventionId, datapoint) {
    var store = load();
    var student = ensureStudent(store, studentId);
    var list = student.interventions || [];
    for (var i = 0; i < list.length; i += 1) {
      if (String(list[i].id) !== String(interventionId)) continue;
      ensureInterventionFields(list[i]);
      list[i].datapoints.unshift(normalizeDatapoint(datapoint));
      list[i].datapoints = list[i].datapoints.slice(0, 24);
      var readiness = computeReferralReadiness(list[i]);
      list[i].readyToRefer = readiness.ready;
      list[i].updatedAt = nowIso();
      save(store);
      return JSON.parse(JSON.stringify(list[i]));
    }
    return null;
  }

  function toggleFidelityCheck(studentId, interventionId, index) {
    var store = load();
    var student = ensureStudent(store, studentId);
    var list = student.interventions || [];
    for (var i = 0; i < list.length; i += 1) {
      if (String(list[i].id) !== String(interventionId)) continue;
      ensureInterventionFields(list[i]);
      var idx = clamp(asNumber(index, 0), 0, list[i].fidelityChecklist.length - 1);
      var current = list[i].fidelityChecklist[idx];
      if (typeof current === "boolean") {
        list[i].fidelityChecklist[idx] = !current;
      } else {
        var row = current && typeof current === "object" ? current : { label: String(current || "Check"), done: false };
        row.done = !row.done;
        row.updatedAt = nowIso();
        list[i].fidelityChecklist[idx] = row;
      }
      var readiness = computeReferralReadiness(list[i]);
      list[i].readyToRefer = readiness.ready;
      list[i].updatedAt = nowIso();
      save(store);
      return JSON.parse(JSON.stringify(list[i]));
    }
    return null;
  }

  function addInterventionAttachment(studentId, interventionId, attachment) {
    var store = load();
    var student = ensureStudent(store, studentId);
    var list = student.interventions || [];
    for (var i = 0; i < list.length; i += 1) {
      if (String(list[i].id) !== String(interventionId)) continue;
      ensureInterventionFields(list[i]);
      var row = attachment && typeof attachment === "object" ? attachment : {};
      list[i].attachments.unshift({
        id: uid("attachment"),
        title: String(row.title || "Artifact"),
        link: String(row.link || ""),
        createdAt: nowIso()
      });
      list[i].attachments = list[i].attachments.slice(0, 16);
      list[i].updatedAt = nowIso();
      save(store);
      return JSON.parse(JSON.stringify(list[i]));
    }
    return null;
  }

  function toggleAccommodationImplemented(studentId, accommodationId, context) {
    var store = load();
    var student = ensureStudent(store, studentId);
    var list = student.accommodations || [];
    for (var i = 0; i < list.length; i += 1) {
      if (String(list[i].id) !== String(accommodationId)) continue;
      var row = list[i];
      row.implLog = Array.isArray(row.implLog) ? row.implLog : [];
      var entry = {
        at: nowIso(),
        context: String(context || "class"),
        implemented: true
      };
      row.implLog.unshift(entry);
      row.implLog = row.implLog.slice(0, 40);
      row.lastReviewed = nowIso();
      row.updatedAt = nowIso();
      // Keep legacy impl log and fidelity tracking in sync.
      var tracking = normalizeImplementationTracking(student.implementationTracking);
      var trackRow = tracking.accommodations.find(function (item) { return String(item.id) === String(accommodationId); });
      if (!trackRow) {
        trackRow = { id: String(accommodationId), name: String(row.title || "Accommodation"), history: [] };
        tracking.accommodations.unshift(trackRow);
      }
      trackRow.name = String(row.title || trackRow.name || "Accommodation");
      trackRow.history = Array.isArray(trackRow.history) ? trackRow.history : [];
      var today = nowIso();
      var existingToday = trackRow.history.find(function (h) { return sameDay(h.date, today); });
      if (existingToday) {
        existingToday.implemented = true;
      } else {
        trackRow.history.unshift({ date: today, implemented: true });
        trackRow.history = trackRow.history.slice(0, 120);
      }
      student.implementationTracking = tracking;
      save(store);
      return JSON.parse(JSON.stringify(row));
    }
    return null;
  }

  function buildMdtExport(studentId, options) {
    var sid = normalizeId(studentId);
    var student = getStudent(sid);
    var opts = options && typeof options === "object" ? options : {};
    var latestTier1 = (student.interventions || []).find(function (row) { return Number(row.tier || 1) === 1; }) || null;
    var datapoints = latestTier1 && Array.isArray(latestTier1.datapoints) ? latestTier1.datapoints.slice(0, 6) : [];
    var accommodations = (student.accommodations || []).slice(0, 8);
    var latestMeeting = (student.meetings || [])[0] || null;
    var summary = latestMeeting
      ? String(latestMeeting.decisions || latestMeeting.notes || "").slice(0, 1200)
      : String(opts.summary || "No meeting summary yet.");
    var consistency = calculateImplementationConsistency(sid, 21);
    var tracking = normalizeImplementationTracking(student.implementationTracking);
    var tier1Recent = (tracking.tier1Interventions || []).filter(function (row) {
      var ts = Date.parse(String(row.date || ""));
      return Number.isFinite(ts) && ts >= (Date.now() - (28 * 86400000));
    });
    var tier1PerWeek = Math.round((tier1Recent.length / 4) * 10) / 10;
    var payload = {
      studentId: sid,
      firstName: firstName(student.profile && student.profile.name),
      generatedAt: nowIso(),
      tier1Plan: latestTier1,
      datapoints: datapoints,
      accommodations: accommodations,
      implementationFidelity: {
        accommodationRatePast3Weeks: consistency.percent,
        tier1FrequencyPast4Weeks: tier1PerWeek
      },
      meetingSummary: summary,
      actionItems: latestMeeting && Array.isArray(latestMeeting.actionItems) ? latestMeeting.actionItems : []
    };
    var csvRows = [
      ["studentId", "firstName", "metric", "date", "value", "note"],
    ];
    datapoints.forEach(function (point) {
      csvRows.push([sid, payload.firstName, latestTier1 && latestTier1.progressMetric || "metric", point.date, String(point.value), point.note || ""]);
    });
    if (!datapoints.length) {
      csvRows.push([sid, payload.firstName, latestTier1 && latestTier1.progressMetric || "metric", "", "", "No datapoints"]);
    }
    csvRows.push([sid, payload.firstName, "Accommodation implementation rate (3w)", "", String(consistency.percent), "percent"]);
    csvRows.push([sid, payload.firstName, "Tier 1 intervention frequency (4w)", "", String(tier1PerWeek), "per week"]);
    var csv = csvRows.map(function (row) {
      return row.map(function (cell) {
        var v = String(cell == null ? "" : cell);
        return '"' + v.replace(/"/g, '""') + '"';
      }).join(",");
    }).join("\n");
    return { json: payload, csv: csv };
  }

  function addEvidencePoint(studentId, payload) {
    var store = load();
    var student = ensureStudent(store, studentId);
    var src = payload && typeof payload === "object" ? payload : {};
    var point = {
      id: uid("evp"),
      createdAt: nowIso(),
      module: String(src.module || "unknown"),
      domain: String(src.domain || ""),
      metrics: src.metrics && typeof src.metrics === "object" ? src.metrics : {},
      chips: Array.isArray(src.chips) ? src.chips.slice(0, 8).map(String) : []
    };
    student.evidencePoints.unshift(point);
    student.evidencePoints = student.evidencePoints.slice(0, 120);
    save(store);
    return point;
  }

  function getRecentEvidencePoints(studentId, days, limit) {
    var sid = normalizeId(studentId);
    var student = getStudent(sid);
    var maxDays = Number(days || 7);
    var maxRows = Number(limit || 16);
    var cutoff = Date.now() - (maxDays * 86400000);
    return (student.evidencePoints || [])
      .filter(function (row) { return Date.parse(String(row.createdAt || "")) >= cutoff; })
      .slice(0, maxRows);
  }

  function escapeHtml(value) {
    return String(value == null ? "" : value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/\"/g, "&quot;");
  }

  return {
    KEY: KEY,
    load: load,
    save: save,
    getStudent: getStudent,
    getInstitutionalAnchors: getInstitutionalAnchors,
    setInstitutionalAnchors: setInstitutionalAnchors,
    setNeeds: setNeeds,
    addGoal: function (studentId, payload) { return addItem(studentId, "goals", payload); },
    updateGoal: function (studentId, id, patch) { return updateItem(studentId, "goals", id, patch); },
    removeGoal: function (studentId, id) { return removeItem(studentId, "goals", id); },
    addAccommodation: function (studentId, payload) { return addItem(studentId, "accommodations", payload); },
    addIntervention: function (studentId, payload) { return addItem(studentId, "interventions", payload); },
    startTier1Plan: startTier1Plan,
    addInterventionDatapoint: addInterventionDatapoint,
    toggleFidelityCheck: toggleFidelityCheck,
    addInterventionAttachment: addInterventionAttachment,
    getReferralReadiness: computeReferralReadiness,
    addMeeting: function (studentId, payload) { return addItem(studentId, "meetings", payload); },
    addArtifact: function (studentId, payload) { return addItem(studentId, "artifacts", payload); },
    addEvidencePoint: addEvidencePoint,
    getRecentEvidencePoints: getRecentEvidencePoints,
    toggleAccommodationImplemented: toggleAccommodationImplemented,
    logAccommodationImplementation: logAccommodationImplementation,
    logTier1InterventionUsage: logTier1InterventionUsage,
    getImplementationTracking: getImplementationTracking,
    calculateImplementationConsistency: calculateImplementationConsistency,
    getExecutiveFunction: getExecutiveFunction,
    setActiveExecutiveTask: setActiveExecutiveTask,
    updateExecutiveTaskProgress: updateExecutiveTaskProgress,
    completeExecutiveTask: completeExecutiveTask,
    logFocusSprint: logFocusSprint,
    addUpcomingTask: addUpcomingTask,
    updateUpcomingTask: updateUpcomingTask,
    exportStudentSummary: exportStudentSummary,
    exportReferralPacket: exportReferralPacket,
    buildMdtExport: buildMdtExport,
    buildMeetingSummary: buildMeetingSummary,
    buildTier1EvidencePack: buildTier1EvidencePack
  };
});
