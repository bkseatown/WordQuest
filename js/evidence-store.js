(function evidenceStoreModule(root, factory) {
  if (typeof module === "object" && module.exports) {
    module.exports = factory();
    return;
  }
  var api = factory();
  root.CSEvidence = api;
  root.CSEvidenceStore = api;
})(typeof self !== "undefined" ? self : this, function () {
  "use strict";

  var KEY = "cs_evidence_v1";
  var VERSION = 1;
  var MAX_SPARK_POINTS = 14;
  var MAX_SESSIONS = 600;

  function now() { return Date.now(); }

  function emptyState() {
    return { version: VERSION, updatedAt: now(), students: {}, sessions: [] };
  }

  function parseJSON(raw) {
    if (!raw) return null;
    try { return JSON.parse(raw); } catch (_err) { return null; }
  }

  function load() {
    var state = parseJSON(localStorage.getItem(KEY));
    if (!state || typeof state !== "object") return emptyState();
    if (Number(state.version || 0) !== VERSION) return migrate(state);
    if (!state.students || typeof state.students !== "object") state.students = {};
    if (!Array.isArray(state.sessions)) state.sessions = [];
    return state;
  }

  function save(state) {
    state.updatedAt = now();
    localStorage.setItem(KEY, JSON.stringify(state));
    return state;
  }

  function migrate(_legacy) {
    return emptyState();
  }

  function ensureStudentShape(student, id) {
    if (!student || typeof student !== "object") student = {};
    student.id = String(student.id || id || "demo-student");
    student.name = String(student.name || student.id);
    student.gradeBand = String(student.gradeBand || "");
    if (!Array.isArray(student.tags)) student.tags = [];
    if (!student.modules || typeof student.modules !== "object") student.modules = {};
    ["wordquest", "reading_lab", "sentence_surgery", "writing_studio"].forEach(function (module) {
      if (!student.modules[module] || typeof student.modules[module] !== "object") student.modules[module] = {};
      var row = student.modules[module];
      if (!Array.isArray(row.spark)) row.spark = [];
      if (!row.last || typeof row.last !== "object") row.last = {};
      row.updatedAt = Number(row.updatedAt || 0);
    });
    student.updatedAt = Number(student.updatedAt || 0);
    return student;
  }

  function normalizeStudentId(studentId) {
    return String(studentId || "").trim() || "demo-student";
  }

  function clampPercent(value) {
    var n = Math.round(Number(value || 0));
    if (!Number.isFinite(n)) n = 0;
    if (n < 0) n = 0;
    if (n > 100) n = 100;
    return n;
  }

  function upsertStudent(student) {
    var state = load();
    var id = normalizeStudentId(student && student.id);
    var current = ensureStudentShape(state.students[id], id);
    if (student && typeof student === "object") {
      if (student.name) current.name = String(student.name);
      if (student.gradeBand) current.gradeBand = String(student.gradeBand);
      if (Array.isArray(student.tags)) current.tags = student.tags.map(function (tag) { return String(tag); }).slice(0, 12);
    }
    current.updatedAt = now();
    state.students[id] = current;
    save(state);
    return current;
  }

  function scoreFromSession(module, metrics) {
    var m = metrics || {};
    if (module === "wordquest") {
      var solved = m.solveSuccess ? 1 : 0;
      var honor = Number(m.newInfoPerGuess || m.constraintHonorRate || 0.5);
      var vowel = 1 - Math.min(1, Number(m.vowelConfusionProxy || 0));
      return clampPercent((solved * 0.35 + honor * 0.4 + vowel * 0.25) * 100);
    }
    if (module === "reading_lab") {
      return clampPercent((Number(m.accuracy || 0) * 0.55) + (Math.min(100, Number(m.wpmProxy || 0)) * 0.25) + (Math.min(100, Number(m.punct || 0)) * 0.2));
    }
    if (module === "sentence_surgery") {
      var base = m.reasoningAdded ? 70 : 45;
      if (m.runOnFlag) base -= 10;
      if (m.fragmentFlag) base -= 10;
      base += Math.min(20, Number(m.editsCount || 0) * 2);
      return clampPercent(base);
    }
    if (module === "writing_studio") {
      var p = Math.min(3, Number(m.paragraphs || 0));
      var r = Math.min(20, Number(m.revisionCount || 0) * 2);
      var v = m.voiceFlatFlag ? -8 : 6;
      return clampPercent(45 + p * 12 + r + v);
    }
    return 50;
  }

  function appendSession(studentId, module, metrics, ts) {
    var mod = String(module || "").trim();
    if (!mod) return null;
    var sid = normalizeStudentId(studentId);
    var state = load();
    var student = ensureStudentShape(state.students[sid], sid);
    student.modules[mod] = student.modules[mod] || { spark: [], last: {}, updatedAt: 0 };

    var session = {
      studentId: sid,
      module: mod,
      ts: Number(ts || now()),
      metrics: sanitizeMetrics(mod, metrics || {}),
      score: scoreFromSession(mod, metrics || {})
    };

    var moduleRow = student.modules[mod];
    moduleRow.last = session.metrics;
    moduleRow.spark.push(session.score);
    if (moduleRow.spark.length > MAX_SPARK_POINTS) moduleRow.spark = moduleRow.spark.slice(-MAX_SPARK_POINTS);
    moduleRow.updatedAt = session.ts;
    student.updatedAt = session.ts;
    state.students[sid] = student;

    state.sessions.push(session);
    if (state.sessions.length > MAX_SESSIONS) state.sessions = state.sessions.slice(-MAX_SESSIONS);
    save(state);
    return session;
  }

  function sanitizeMetrics(module, metrics) {
    var src = metrics || {};
    var allow = {
      wordquest: ["totalGuesses", "solveSuccess", "timeToFirstCorrectLetter", "vowelConfusionProxy", "wrongSlotRepeat", "newInfoPerGuess", "streaks"],
      reading_lab: ["accuracy", "wpmProxy", "selfCorrects", "punct", "prosodyFlatFlag", "hardWordsTop3"],
      sentence_surgery: ["reasoningAdded", "runOnFlag", "fragmentFlag", "editsCount", "timeOnTaskSec"],
      writing_studio: ["paragraphs", "revisionCount", "voiceFlatFlag", "timeOnTaskSec"]
    }[module] || [];

    var out = {};
    allow.forEach(function (key) {
      if (!Object.prototype.hasOwnProperty.call(src, key)) return;
      var value = src[key];
      if (typeof value === "number") out[key] = Number.isFinite(value) ? value : 0;
      else if (typeof value === "boolean") out[key] = value;
      else if (typeof value === "string") out[key] = value.slice(0, 120);
      else if (Array.isArray(value)) out[key] = value.slice(0, 3).map(function (v) { return String(v).slice(0, 32); });
      else if (value && typeof value === "object") out[key] = value;
    });
    return out;
  }

  function getStudent(studentId) {
    var state = load();
    var sid = normalizeStudentId(studentId);
    return ensureStudentShape(state.students[sid], sid);
  }

  function moduleFocus(module) {
    if (module === "wordquest") return "Decoding";
    if (module === "reading_lab") return "Fluency";
    if (module === "sentence_surgery") return "Sentence";
    return "Writing";
  }

  function nextMoveForFocus(focus, sid) {
    var id = encodeURIComponent(String(sid || "demo-student"));
    if (focus === "Decoding") return {
      focus: focus,
      line: "Run a vowel sweep with immediate letter-position feedback.",
      quickHref: "word-quest.html?student=" + id + "&mode=quickcheck",
      interventionHref: "word-quest.html?student=" + id + "&mode=intervention"
    };
    if (focus === "Fluency") return {
      focus: focus,
      line: "Run a cold read and target punctuation pause control.",
      quickHref: "reading-lab.html?student=" + id + "&seed=demo",
      interventionHref: "reading-lab.html?student=" + id + "&mode=intervention"
    };
    if (focus === "Sentence") return {
      focus: focus,
      line: "Model one because/although revision, then independent edit.",
      quickHref: "sentence-surgery.html?student=" + id + "&seed=demo",
      interventionHref: "sentence-surgery.html?student=" + id + "&mode=intervention"
    };
    return {
      focus: "Writing",
      line: "Draft one focused paragraph with claim-evidence-reasoning.",
      quickHref: "writing-studio.html?student=" + id,
      interventionHref: "writing-studio.html?student=" + id + "&mode=intervention"
    };
  }

  function getStudentSummary(studentId) {
    var sid = normalizeStudentId(studentId);
    var student = getStudent(sid);
    var rows = Object.keys(student.modules).map(function (module) {
      var spark = student.modules[module].spark || [];
      var avg = spark.length ? Math.round(spark.reduce(function (sum, n) { return sum + Number(n || 0); }, 0) / spark.length) : 50;
      return { module: module, avg: avg, spark: spark.slice(-7), last: student.modules[module].last || {} };
    }).sort(function (a, b) { return a.avg - b.avg; });

    var weakest = rows[0] || { module: "wordquest", avg: 50, spark: [] };
    var focus = moduleFocus(weakest.module);
    var risk = weakest.avg < 46 ? "risk" : (weakest.avg < 70 ? "steady" : "growing");
    var move = nextMoveForFocus(focus, sid);

    var evidenceChips = [];
    var readingLast = (student.modules.reading_lab && student.modules.reading_lab.last) || {};
    var wordLast = (student.modules.wordquest && student.modules.wordquest.last) || {};
    var sentLast = (student.modules.sentence_surgery && student.modules.sentence_surgery.last) || {};
    if (readingLast.accuracy != null) evidenceChips.push({ label: "Accuracy", value: Math.round(Number(readingLast.accuracy || 0)) + "%" });
    if (readingLast.wpmProxy != null) evidenceChips.push({ label: "ORF", value: Math.round(Number(readingLast.wpmProxy || 0)) + " wpm" });
    if (readingLast.selfCorrects != null) evidenceChips.push({ label: "Self-correct", value: String(readingLast.selfCorrects) });
    if (wordLast.vowelConfusionProxy != null) evidenceChips.push({ label: "Vowel confusion", value: Math.round(Number(wordLast.vowelConfusionProxy || 0) * 100) + "%" });
    if (sentLast.reasoningAdded != null) evidenceChips.push({ label: "Reasoning", value: sentLast.reasoningAdded ? "Added" : "Missing" });

    return {
      student: student,
      focus: focus,
      risk: risk,
      last7Sparkline: weakest.spark,
      evidenceChips: evidenceChips.slice(0, 8),
      nextMove: move,
      summaryRows: rows
    };
  }

  function listCaseload() {
    var state = load();
    return Object.keys(state.students).map(function (id) {
      var summary = getStudentSummary(id);
      var lastTs = Number(summary.student.updatedAt || 0);
      var riskRank = summary.risk === "risk" ? 0 : (summary.risk === "steady" ? 1 : 2);
      return {
        id: id,
        name: summary.student.name,
        gradeBand: summary.student.gradeBand,
        risk: summary.risk,
        focus: summary.focus,
        lastSeenAt: lastTs,
        sortKey: String(riskRank) + "-" + String(9999999999999 - lastTs)
      };
    }).sort(function (a, b) { return a.sortKey.localeCompare(b.sortKey); });
  }

  function exportJSON() {
    return JSON.stringify(load(), null, 2);
  }

  function rosterCSV() {
    var rows = ["id,name,gradeBand,tags"]; 
    listCaseload().forEach(function (student) {
      var detail = getStudent(student.id).tags.join("|");
      rows.push(csv(student.id) + "," + csv(student.name) + "," + csv(student.gradeBand || "") + "," + csv(detail));
    });
    return rows.join("\n");
  }

  function importRosterCSV(csvText) {
    var lines = String(csvText || "").split(/\r?\n/).map(function (l) { return l.trim(); }).filter(Boolean);
    if (!lines.length) return 0;
    var start = lines[0].toLowerCase().indexOf("name") >= 0 ? 1 : 0;
    var count = 0;
    for (var i = start; i < lines.length; i += 1) {
      var cols = splitCSVLine(lines[i]);
      var id = normalizeStudentId(cols[1] || cols[0]);
      var name = String(cols[0] || cols[1] || id);
      var gradeBand = String(cols[2] || "");
      upsertStudent({ id: id, name: name, gradeBand: gradeBand });
      count += 1;
    }
    return count;
  }

  function splitCSVLine(line) {
    var out = [];
    var cur = "";
    var inQuotes = false;
    for (var i = 0; i < line.length; i += 1) {
      var ch = line[i];
      if (ch === '"') {
        if (inQuotes && line[i + 1] === '"') { cur += '"'; i += 1; }
        else inQuotes = !inQuotes;
      } else if (ch === "," && !inQuotes) {
        out.push(cur);
        cur = "";
      } else {
        cur += ch;
      }
    }
    out.push(cur);
    return out;
  }

  function csv(value) {
    return '"' + String(value == null ? "" : value).replace(/"/g, '""') + '"';
  }

  function init() {
    var state = load();
    save(state);
    return state;
  }

  return {
    KEY: KEY,
    init: init,
    load: load,
    save: save,
    upsertStudent: upsertStudent,
    appendSession: appendSession,
    getStudentSummary: getStudentSummary,
    listCaseload: listCaseload,
    exportJSON: exportJSON,
    rosterCSV: rosterCSV,
    importRosterCSV: importRosterCSV,
    getStudent: getStudent,
    // compatibility
    appendSignal: appendSession,
    record: appendSession,
    ensureStudent: upsertStudent,
    computeNextBestAction: function (studentId) {
      var s = getStudentSummary(studentId);
      return {
        title: s.nextMove.focus,
        why: s.nextMove.line,
        buttonLabel: "Start Intervention",
        href: s.nextMove.interventionHref
      };
    },
    exportStudentSnapshot: function (studentId) {
      var sid = normalizeStudentId(studentId);
      var s = getStudentSummary(sid);
      return {
        json: { version: VERSION, student: s.student, summary: s },
        csvRows: ["studentId,focus,risk", csv(sid) + "," + csv(s.focus) + "," + csv(s.risk)]
      };
    }
  };
});
