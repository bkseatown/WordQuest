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

  var KEY = "CS_EVIDENCE_V1";
  var SKILL_MODEL_KEY = "CS_SKILL_MODEL_V1";
  var LEGACY_KEYS = ["cs_evidence_v1"];
  var VERSION = 1;
  var MAX_SPARK_POINTS = 14;
  var MAX_SESSIONS = 600;
  var MAX_STUDENT_SESSIONS = 120;

  function now() { return Date.now(); }

  function emptyState() {
    return { version: VERSION, updatedAt: now(), students: {}, sessions: [] };
  }

  function parseJSON(raw) {
    if (!raw) return null;
    try { return JSON.parse(raw); } catch (_err) { return null; }
  }

  function readSkillState() {
    var parsed = parseJSON(localStorage.getItem(SKILL_MODEL_KEY));
    if (!parsed || typeof parsed !== "object") return {};
    return parsed;
  }

  function writeSkillState(state) {
    localStorage.setItem(SKILL_MODEL_KEY, JSON.stringify(state || {}));
  }

  function readRawState() {
    var raw = localStorage.getItem(KEY);
    if (!raw) {
      for (var i = 0; i < LEGACY_KEYS.length; i += 1) {
        raw = localStorage.getItem(LEGACY_KEYS[i]);
        if (raw) break;
      }
    }
    return parseJSON(raw);
  }

  function load() {
    var state = readRawState();
    if (!state || typeof state !== "object") return emptyState();
    if (Number(state.version || 0) !== VERSION) return migrate(state);
    if (!state.students || typeof state.students !== "object") state.students = {};
    if (!Array.isArray(state.sessions)) state.sessions = [];
    return state;
  }

  function save(state) {
    state.updatedAt = now();
    localStorage.setItem(KEY, JSON.stringify(state));
    LEGACY_KEYS.forEach(function (legacyKey) {
      try { localStorage.removeItem(legacyKey); } catch (_e) {}
    });
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
    ["wordquest", "reading_lab", "sentence_surgery", "writing_studio", "numeracy"].forEach(function (module) {
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
    if (module === "numeracy") {
      var acc = clampPercent(Number(m.accuracy || 0));
      var speed = clampPercent(Number(m.speedProxy || 0));
      var hints = Math.max(0, Number(m.hints || 0));
      return clampPercent(acc * 0.7 + speed * 0.3 - hints * 2);
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

  function toFiniteNumber(value, fallback) {
    var n = Number(value);
    return Number.isFinite(n) ? n : Number(fallback || 0);
  }

  function createSessionId() {
    return "sess_" + Date.now().toString(36) + "_" + Math.random().toString(36).slice(2, 8);
  }

  function normalizeEnvelope(studentId, envelope) {
    var sid = normalizeStudentId(studentId || (envelope && envelope.studentId));
    var src = envelope && typeof envelope === "object" ? envelope : {};
    var durationSec = Math.max(0, Math.round(toFiniteNumber(src.durationSec, 0)));
    var guessCount = Math.max(0, Math.round(toFiniteNumber(src.signals && src.signals.guessCount, 0)));
    var solved = !!(src.outcomes && src.outcomes.solved);
    return {
      id: String(src.id || createSessionId()),
      studentId: sid,
      createdAt: String(src.createdAt || new Date().toISOString()),
      activity: String(src.activity || "wordquest"),
      durationSec: durationSec,
      signals: {
        guessCount: guessCount,
        avgGuessLatencyMs: Math.max(0, Math.round(toFiniteNumber(src.signals && src.signals.avgGuessLatencyMs, 0))),
        misplaceRate: +Math.max(0, Math.min(1, toFiniteNumber(src.signals && src.signals.misplaceRate, 0))).toFixed(3),
        absentRate: +Math.max(0, Math.min(1, toFiniteNumber(src.signals && src.signals.absentRate, 0))).toFixed(3),
        repeatSameBadSlotCount: Math.max(0, Math.round(toFiniteNumber(src.signals && src.signals.repeatSameBadSlotCount, 0))),
        vowelSwapCount: Math.max(0, Math.round(toFiniteNumber(src.signals && src.signals.vowelSwapCount, 0))),
        constraintViolations: Math.max(0, Math.round(toFiniteNumber(src.signals && src.signals.constraintViolations, 0)))
      },
      outcomes: {
        solved: solved,
        attemptsUsed: Math.max(0, Math.round(toFiniteNumber(src.outcomes && src.outcomes.attemptsUsed, guessCount)))
      }
    };
  }

  function addSession(studentId, sessionEnvelope) {
    var state = load();
    var normalized = normalizeEnvelope(studentId, sessionEnvelope);
    var sid = normalizeStudentId(normalized.studentId);
    var student = ensureStudentShape(state.students[sid], sid);
    state.students[sid] = student;

    var exists = false;
    state.sessions = state.sessions.filter(function (row) {
      if (row && row.id && row.id === normalized.id) exists = true;
      return true;
    });
    if (!exists) state.sessions.push(normalized);
    if (state.sessions.length > MAX_SESSIONS) state.sessions = state.sessions.slice(-MAX_SESSIONS);
    save(state);
    return normalized;
  }

  function getRecentSessions(studentId, opts) {
    var state = load();
    var sid = normalizeStudentId(studentId);
    var limit = Math.max(1, Math.min(MAX_STUDENT_SESSIONS, Number(opts && opts.limit) || 10));
    return state.sessions
      .filter(function (row) { return normalizeStudentId(row && row.studentId) === sid && row && row.activity; })
      .sort(function (a, b) { return String(b.createdAt || "").localeCompare(String(a.createdAt || "")); })
      .slice(0, limit);
  }

  function getLastSession(studentId, activity) {
    var sid = normalizeStudentId(studentId);
    var sessions = getRecentSessions(sid, { limit: MAX_STUDENT_SESSIONS });
    if (!activity) return sessions[0] || null;
    var target = String(activity || "").toLowerCase();
    for (var i = 0; i < sessions.length; i += 1) {
      if (String(sessions[i].activity || "").toLowerCase() === target) return sessions[i];
    }
    return null;
  }

  function computeWordQuestScore(session) {
    var sig = (session && session.signals) || {};
    var latencyPenalty = Math.min(1, (Number(sig.avgGuessLatencyMs || 0) / 20000));
    var score = 100
      - (Math.max(0, Number(sig.misplaceRate || 0)) * 40)
      - (Math.max(0, Number(sig.absentRate || 0)) * 30)
      - (Math.max(0, Number(sig.constraintViolations || 0)) * 10)
      - (Math.max(0, Number(sig.repeatSameBadSlotCount || 0)) * 5)
      - (latencyPenalty * 15);
    return Math.max(0, Math.min(100, Math.round(score)));
  }

  function computeTrend(series) {
    var points = Array.isArray(series) ? series : [];
    if (!points.length) return { last7: [], slope: 0, stability: 1 };
    var last7 = points.slice(-7);
    var first = Number(last7[0].score || 0);
    var last = Number(last7[last7.length - 1].score || 0);
    var slope = +(last - first).toFixed(2);
    var mean = last7.reduce(function (sum, p) { return sum + Number(p.score || 0); }, 0) / last7.length;
    var variance = last7.reduce(function (sum, p) {
      var d = Number(p.score || 0) - mean;
      return sum + d * d;
    }, 0) / last7.length;
    var stability = +Math.max(0, Math.min(1, 1 - Math.sqrt(variance) / 40)).toFixed(3);
    return { last7: last7, slope: slope, stability: stability };
  }

  function detectNeedsFromWordQuest(lastSessions) {
    var sessions = Array.isArray(lastSessions) ? lastSessions.slice(0, 7) : [];
    if (!sessions.length) return [];
    var aggregates = {
      misplaceRate: 0,
      absentRate: 0,
      repeatSameBadSlotCount: 0,
      vowelSwapCount: 0,
      constraintViolations: 0,
      avgGuessLatencyMs: 0
    };
    sessions.forEach(function (row) {
      var sig = row.signals || {};
      Object.keys(aggregates).forEach(function (k) { aggregates[k] += Number(sig[k] || 0); });
    });
    Object.keys(aggregates).forEach(function (k) { aggregates[k] = aggregates[k] / sessions.length; });

    var needs = [];
    function pushNeed(key, label, sev, conf, rationale) {
      needs.push({ key: key, label: label, severity: sev, confidence: conf, rationale: rationale.slice(0, 3) });
    }

    if (aggregates.repeatSameBadSlotCount >= 1.5 || aggregates.constraintViolations >= 1.2) {
      pushNeed("constraint_tracking", "Constraint Tracking", 4, 0.84, [
        "Repeated blocked-slot placements detected.",
        "Constraint violations are recurring across recent sessions."
      ]);
    }
    if (aggregates.vowelSwapCount >= 2.5) {
      pushNeed("vowel_mapping", "Vowel Mapping", 4, 0.8, [
        "Frequent vowel swaps suggest unstable vowel mapping.",
        "Target short/long vowel discrimination before speed work."
      ]);
    }
    if (aggregates.misplaceRate >= 0.24) {
      pushNeed("positional_strategy", "Positional Strategy", 3, 0.74, [
        "Misplaced-letter rate remains elevated.",
        "Position-lock strategy likely underused."
      ]);
    }
    if (aggregates.avgGuessLatencyMs >= 9000) {
      pushNeed("guess_efficiency", "Guess Efficiency", 3, 0.69, [
        "High guess latency indicates pacing/cognitive load issue.",
        "Use guided first-guess routine."
      ]);
    }

    return needs
      .sort(function (a, b) { return (b.severity * b.confidence) - (a.severity * a.confidence); })
      .slice(0, 4);
  }

  function computeStudentSnapshot(studentId) {
    var sid = normalizeStudentId(studentId);
    var recent = getRecentSessions(sid, { limit: MAX_STUDENT_SESSIONS });
    var lastByActivity = {};
    recent.forEach(function (row) {
      var activity = String(row.activity || "").toLowerCase();
      if (!activity || lastByActivity[activity]) return;
      lastByActivity[activity] = row;
    });

    var wqSeries = recent
      .filter(function (row) { return String(row.activity || "").toLowerCase() === "wordquest"; })
      .slice(0, 7)
      .reverse()
      .map(function (row) {
        return {
          t: row.createdAt,
          score: computeWordQuestScore(row),
          solved: !!(row.outcomes && row.outcomes.solved),
          guessCount: Number((row.signals && row.signals.guessCount) || 0)
        };
      });

    var trends = {
      wordquest: computeTrend(wqSeries),
      readinglab: { last7: [], slope: 0, stability: 1 },
      sentencesurgery: { last7: [], slope: 0, stability: 1 },
      writingstudio: { last7: [], slope: 0, stability: 1 },
      numeracy: { last7: [], slope: 0, stability: 1 }
    };

    return {
      studentId: sid,
      updatedAt: new Date().toISOString(),
      needs: detectNeedsFromWordQuest(recent.filter(function (row) { return String(row.activity || "").toLowerCase() === "wordquest"; })),
      trends: trends,
      lastSessionsByActivity: lastByActivity
    };
  }

  function exportStudentJSON(studentId) {
    var sid = normalizeStudentId(studentId);
    return JSON.stringify({
      version: VERSION,
      student: getStudent(sid),
      summary: getStudentSummary(sid),
      sessions: getRecentSessions(sid, { limit: MAX_STUDENT_SESSIONS })
    }, null, 2);
  }

  function exportStudentCSV(studentId) {
    var sid = normalizeStudentId(studentId);
    var rows = [
      "sessionId,studentId,createdAt,activity,durationSec,solved,attemptsUsed,guessCount,avgGuessLatencyMs,misplaceRate,absentRate,repeatSameBadSlotCount,vowelSwapCount,constraintViolations"
    ];
    getRecentSessions(sid, { limit: MAX_STUDENT_SESSIONS }).forEach(function (session) {
      var sig = session.signals || {};
      var out = session.outcomes || {};
      rows.push([
        csv(session.id),
        csv(session.studentId),
        csv(session.createdAt),
        csv(session.activity),
        csv(session.durationSec),
        csv(out.solved ? 1 : 0),
        csv(out.attemptsUsed),
        csv(sig.guessCount),
        csv(sig.avgGuessLatencyMs),
        csv(sig.misplaceRate),
        csv(sig.absentRate),
        csv(sig.repeatSameBadSlotCount),
        csv(sig.vowelSwapCount),
        csv(sig.constraintViolations)
      ].join(","));
    });
    return rows.join("\n");
  }

  function recommendNextSteps(signals) {
    var s = signals || {};
    var bullets = [];
    if (Number(s.repeatSameBadSlotCount || 0) >= 2) bullets.push("Constraint tracking mini-lesson before next session.");
    if (Number(s.vowelSwapCount || 0) >= 3) bullets.push("2-minute vowel mapping warm-up.");
    if (Number(s.misplaceRate || 0) >= 0.28) bullets.push("Positioning strategy: move one letter per guess.");
    if (Number(s.avgGuessLatencyMs || 0) >= 10000 && Number(s.guessCount || 0) <= 3) bullets.push("Reduce cognitive load with guided first guess.");
    if (!bullets.length) bullets.push("Continue current strategy and monitor consistency.");
    return {
      title: bullets[0],
      bullets: bullets.slice(0, 3)
    };
  }

  function sanitizeMetrics(module, metrics) {
    var src = metrics || {};
    var allow = {
      wordquest: ["totalGuesses", "solveSuccess", "timeToFirstCorrectLetter", "vowelConfusionProxy", "wrongSlotRepeat", "newInfoPerGuess", "streaks", "firstMissAt", "hintsUsed", "idleEvents", "vowelAttemptRatio"],
      reading_lab: ["accuracy", "wpmProxy", "selfCorrects", "punct", "prosodyFlatFlag", "hardWordsTop3"],
      sentence_surgery: ["reasoningAdded", "runOnFlag", "fragmentFlag", "editsCount", "timeOnTaskSec"],
      writing_studio: ["paragraphs", "revisionCount", "voiceFlatFlag", "timeOnTaskSec"],
      numeracy: ["accuracy", "speedProxy", "hints", "timeOnTaskSec"]
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
    if (module === "numeracy") return "Numeracy";
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
    if (focus === "Numeracy") return {
      focus: focus,
      line: "Run a 90-second fluency sprint, then assign targeted practice.",
      quickHref: "numeracy.html?student=" + id + "&mode=quickcheck",
      interventionHref: "numeracy.html?student=" + id + "&mode=intervention"
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
    var numLast = (student.modules.numeracy && student.modules.numeracy.last) || {};
    if (readingLast.accuracy != null) evidenceChips.push({ label: "Accuracy", value: Math.round(Number(readingLast.accuracy || 0)) + "%" });
    if (readingLast.wpmProxy != null) evidenceChips.push({ label: "ORF", value: Math.round(Number(readingLast.wpmProxy || 0)) + " wpm" });
    if (readingLast.selfCorrects != null) evidenceChips.push({ label: "Self-correct", value: String(readingLast.selfCorrects) });
    if (wordLast.vowelConfusionProxy != null) evidenceChips.push({ label: "Vowel confusion", value: Math.round(Number(wordLast.vowelConfusionProxy || 0) * 100) + "%" });
    if (wordLast.idleEvents != null) evidenceChips.push({ label: "Idle events", value: String(wordLast.idleEvents) });
    if (sentLast.reasoningAdded != null) evidenceChips.push({ label: "Reasoning", value: sentLast.reasoningAdded ? "Added" : "Missing" });
    if (numLast.accuracy != null) evidenceChips.push({ label: "Numeracy", value: Math.round(Number(numLast.accuracy || 0)) + "%" });

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

  function skillCatalog() {
    return (typeof window !== "undefined" && window.CSSkillTaxonomy && Array.isArray(window.CSSkillTaxonomy.SKILLS))
      ? window.CSSkillTaxonomy.SKILLS
      : [];
  }

  function defaultSkillModel(studentId) {
    var sid = normalizeStudentId(studentId);
    var nowIso = new Date().toISOString();
    var model = {
      studentId: sid,
      mastery: {},
      topNeeds: [],
      updatedAt: nowIso
    };
    skillCatalog().forEach(function (skill) {
      var id = String(skill.id || "");
      if (!id) return;
      model.mastery[id] = {
        skillId: id,
        level: 1,
        mastery: 42,
        lastUpdated: "",
        sparkline: []
      };
    });
    return model;
  }

  function normalizeSkillRow(row, skillId) {
    var src = row && typeof row === "object" ? row : {};
    var spark = Array.isArray(src.sparkline) ? src.sparkline.slice(-MAX_SPARK_POINTS) : [];
    var mastery = Math.max(0, Math.min(100, Math.round(Number(src.mastery || 0))));
    var level = Math.max(0, Math.min(3, Number.isFinite(Number(src.level)) ? Number(src.level) : Math.round(mastery / 34)));
    return {
      skillId: String(skillId || src.skillId || ""),
      level: level,
      mastery: mastery,
      lastUpdated: String(src.lastUpdated || ""),
      sparkline: spark.map(function (n) { return Math.max(0, Math.min(100, Math.round(Number(n || 0)))); })
    };
  }

  function getSkillModel(studentId) {
    var sid = normalizeStudentId(studentId);
    var state = readSkillState();
    var current = state[sid];
    var base = defaultSkillModel(sid);
    if (current && typeof current === "object") {
      var mastery = current.mastery && typeof current.mastery === "object" ? current.mastery : {};
      Object.keys(mastery).forEach(function (skillId) {
        base.mastery[skillId] = normalizeSkillRow(mastery[skillId], skillId);
      });
      base.topNeeds = Array.isArray(current.topNeeds) ? current.topNeeds.slice(0, 5) : [];
      base.updatedAt = String(current.updatedAt || base.updatedAt);
    }
    if (!base.topNeeds.length) base.topNeeds = computeTopNeeds(base);
    return base;
  }

  function deriveLevel(mastery) {
    var m = Math.max(0, Math.min(100, Number(mastery || 0)));
    if (m >= 80) return 3;
    if (m >= 60) return 2;
    if (m >= 35) return 1;
    return 0;
  }

  function applySkillEvidence(studentId, patch) {
    var sid = normalizeStudentId(studentId);
    var state = readSkillState();
    var model = getSkillModel(sid);
    var deltas = patch && patch.skillDelta && typeof patch.skillDelta === "object" ? patch.skillDelta : {};
    var stamp = String((patch && patch.createdAt) || new Date().toISOString());
    Object.keys(deltas).forEach(function (skillId) {
      var delta = Math.max(-2, Math.min(2, Number(deltas[skillId] || 0)));
      if (!Number.isFinite(delta)) return;
      var row = normalizeSkillRow(model.mastery[skillId], skillId);
      var next = Math.max(0, Math.min(100, row.mastery + (delta * 8)));
      row.mastery = Math.round(next);
      row.level = deriveLevel(next);
      row.lastUpdated = stamp;
      row.sparkline.push(row.mastery);
      if (row.sparkline.length > MAX_SPARK_POINTS) row.sparkline = row.sparkline.slice(-MAX_SPARK_POINTS);
      model.mastery[skillId] = row;
    });
    model.topNeeds = computeTopNeeds(model);
    model.updatedAt = stamp;
    state[sid] = model;
    writeSkillState(state);
    return model;
  }

  function computeTopNeeds(model) {
    var rows = [];
    var mastery = model && model.mastery && typeof model.mastery === "object" ? model.mastery : {};
    Object.keys(mastery).forEach(function (skillId) {
      var row = normalizeSkillRow(mastery[skillId], skillId);
      rows.push({
        skillId: skillId,
        level: row.level,
        mastery: row.mastery,
        lastUpdated: row.lastUpdated
      });
    });
    return rows
      .sort(function (a, b) {
        if (a.mastery !== b.mastery) return a.mastery - b.mastery;
        return String(a.skillId).localeCompare(String(b.skillId));
      })
      .slice(0, 5);
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
    addSession: addSession,
    getRecentSessions: getRecentSessions,
    getLastSession: getLastSession,
    computeStudentSnapshot: computeStudentSnapshot,
    getSkillModel: getSkillModel,
    applySkillEvidence: applySkillEvidence,
    computeTopNeeds: computeTopNeeds,
    exportStudentCSV: exportStudentCSV,
    exportStudentJSON: exportStudentJSON,
    recommendNextSteps: recommendNextSteps,
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
