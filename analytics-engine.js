(function analyticsEngineModule() {
  "use strict";

  var KEY = "cs_analytics";
  var SCHOOL_KEY = "cs_school_analytics";
  var PROGRESS_HISTORY_KEY = "cs_progress_history";
  var schema = window.CSStorageSchema || null;

  if (schema && typeof schema.migrateStorageIfNeeded === "function") {
    schema.migrateStorageIfNeeded();
  }

  function isDemoMode() {
    try {
      var params = new URLSearchParams(window.location.search || "");
      return params.get("demo") === "1" || params.get("demo") === "true" || params.get("mode") === "demo" || window.WQ_DEMO === true;
    } catch (_e) {
      return window.WQ_DEMO === true;
    }
  }

  function defaults() {
    if (schema && typeof schema.defaultAnalytics === "function") return schema.defaultAnalytics();
    return { totalSentences: 0, avgDetail: 0, avgCohesion: 0, reasoningRate: 0, complexRate: 0 };
  }

  function read() {
    var parsed = schema && typeof schema.safeLoadJSON === "function"
      ? schema.safeLoadJSON(KEY, defaults())
      : (function () {
          try { return JSON.parse(localStorage.getItem(KEY) || "null"); } catch (_e) { return null; }
        })();
    if (!parsed || typeof parsed !== "object") return defaults();
    return {
      totalSentences: Number(parsed.totalSentences || 0),
      avgDetail: Number(parsed.avgDetail || 0),
      avgCohesion: Number(parsed.avgCohesion || 0),
      reasoningRate: Number(parsed.reasoningRate || 0),
      complexRate: Number(parsed.complexRate || 0)
    };
  }

  function write(snapshot) {
    if (schema && typeof schema.safeSaveJSON === "function") {
      schema.safeSaveJSON(KEY, snapshot);
      return;
    }
    try { localStorage.setItem(KEY, JSON.stringify(snapshot)); } catch (_e) {}
  }

  function clamp(n, min, max) {
    return Math.max(min, Math.min(max, n));
  }

  function updateFromAnalysis(analysis, options) {
    if (isDemoMode()) return read();
    if (!analysis || typeof analysis !== "object") return read();
    if (window.CS_CONFIG && window.CS_CONFIG.enableAnalytics === false) return read();

    var existing = read();
    var nextCount = existing.totalSentences + 1;

    var detail = clamp(Number(analysis.detail_score || 0), 0, 5);
    var reasoning = analysis.has_reasoning ? 1 : 0;
    var complex = String(analysis.sentence_type || "").toLowerCase() === "complex" ? 1 : 0;

    var nextAvgDetail = ((existing.avgDetail * existing.totalSentences) + detail) / nextCount;
    var nextReasoningRate = ((existing.reasoningRate * existing.totalSentences) + reasoning) / nextCount;
    var nextComplexRate = ((existing.complexRate * existing.totalSentences) + complex) / nextCount;

    var hasCohesion = options && typeof options.cohesion === "number" && !Number.isNaN(options.cohesion);
    var nextAvgCohesion = existing.avgCohesion;
    if (hasCohesion) {
      var cohesion = clamp(Number(options.cohesion), 0, 5);
      nextAvgCohesion = ((existing.avgCohesion * existing.totalSentences) + cohesion) / nextCount;
    }

    var next = {
      totalSentences: nextCount,
      avgDetail: Number(nextAvgDetail.toFixed(3)),
      avgCohesion: Number(nextAvgCohesion.toFixed(3)),
      reasoningRate: Number(nextReasoningRate.toFixed(3)),
      complexRate: Number(nextComplexRate.toFixed(3))
    };

    write(next);
    return next;
  }

  function readSchoolAnalytics() {
    var parsed = schema && typeof schema.safeLoadJSON === "function"
      ? schema.safeLoadJSON(SCHOOL_KEY, { classes: {}, lastUpdated: 0 })
      : (function () {
          try { return JSON.parse(localStorage.getItem(SCHOOL_KEY) || "null"); } catch (_e) { return null; }
        })();
    if (!parsed || typeof parsed !== "object") return { classes: {}, lastUpdated: 0 };
    var classes = parsed.classes && typeof parsed.classes === "object" ? parsed.classes : {};
    return {
      classes: classes,
      lastUpdated: Number(parsed.lastUpdated || 0)
    };
  }

  function writeSchoolAnalytics(payload) {
    if (schema && typeof schema.safeSaveJSON === "function") {
      schema.safeSaveJSON(SCHOOL_KEY, payload || { classes: {}, lastUpdated: Date.now() });
      return;
    }
    try { localStorage.setItem(SCHOOL_KEY, JSON.stringify(payload || { classes: {}, lastUpdated: Date.now() })); } catch (_e) {}
  }

  function normalizeClassId(classId) {
    var clean = String(classId || "").replace(/\s+/g, " ").trim();
    return clean || "Unassigned Class";
  }

  function readProgressHistory() {
    var parsed = schema && typeof schema.safeLoadJSON === "function"
      ? schema.safeLoadJSON(PROGRESS_HISTORY_KEY, {})
      : (function () {
          try { return JSON.parse(localStorage.getItem(PROGRESS_HISTORY_KEY) || "null"); } catch (_e) { return null; }
        })();
    return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed : {};
  }

  function writeProgressHistory(payload) {
    if (schema && typeof schema.safeSaveJSON === "function") {
      schema.safeSaveJSON(PROGRESS_HISTORY_KEY, payload || {});
      return;
    }
    try { localStorage.setItem(PROGRESS_HISTORY_KEY, JSON.stringify(payload || {})); } catch (_e) {}
  }

  function sanitizeSkillLevels(levels) {
    var src = levels && typeof levels === "object" ? levels : {};
    var clampLevel = function (value) {
      var n = Number(value);
      if (Number.isNaN(n)) n = 0;
      return Math.max(0, Math.min(3, Math.round(n)));
    };
    return {
      reasoning: clampLevel(src.reasoning),
      detail: clampLevel(src.detail),
      verb_precision: clampLevel(src.verb_precision),
      cohesion: clampLevel(src.cohesion)
    };
  }

  function appendStudentProgress(studentId, skillLevels, timestamp) {
    if (isDemoMode()) return readProgressHistory();
    if (!studentId) return readProgressHistory();
    if (window.CS_CONFIG && window.CS_CONFIG.enableAnalytics === false) return readProgressHistory();

    var history = readProgressHistory();
    var key = String(studentId).trim();
    if (!key) return history;
    var rows = Array.isArray(history[key]) ? history[key] : [];
    var next = {
      timestamp: Math.max(0, Number(timestamp || Date.now())),
      skillLevels: sanitizeSkillLevels(skillLevels)
    };
    var prev = rows.length ? rows[rows.length - 1] : null;
    var sameAsPrev = !!(prev
      && prev.skillLevels
      && Number(prev.skillLevels.reasoning) === next.skillLevels.reasoning
      && Number(prev.skillLevels.detail) === next.skillLevels.detail
      && Number(prev.skillLevels.verb_precision) === next.skillLevels.verb_precision
      && Number(prev.skillLevels.cohesion) === next.skillLevels.cohesion);
    var recent = !!(prev && (next.timestamp - Number(prev.timestamp || 0)) < (15 * 60 * 1000));
    if (!(sameAsPrev && recent)) {
      rows.push(next);
    }
    if (rows.length > 30) rows = rows.slice(rows.length - 30);
    history[key] = rows;
    writeProgressHistory(history);
    return history;
  }

  function appendReadingAttempt(studentId, attemptMetrics, timestamp) {
    if (isDemoMode()) return readProgressHistory();
    if (!studentId) return readProgressHistory();
    if (window.CS_CONFIG && window.CS_CONFIG.enableAnalytics === false) return readProgressHistory();
    var metrics = attemptMetrics && typeof attemptMetrics === "object" ? attemptMetrics : null;
    if (!metrics) return readProgressHistory();

    var history = readProgressHistory();
    var key = String(studentId).trim();
    if (!key) return history;
    var rows = Array.isArray(history[key]) ? history[key] : [];
    var next = {
      timestamp: Math.max(0, Number(timestamp || Date.now())),
      reading: {
        wpm: Math.max(0, Number(metrics.wpm || 0)),
        accuracy: Math.max(0, Math.min(100, Number(metrics.accuracy || 0))),
        punctScore: Math.max(0, Math.min(100, Number(metrics.punctScore || 0))),
        pacingVar: Math.max(0, Number(metrics.pacingVar || 0)),
        hardWordsCount: Math.max(0, Math.floor(Number(metrics.hardWordsCount || 0)))
      }
    };
    rows.push(next);
    if (rows.length > 30) rows = rows.slice(rows.length - 30);
    history[key] = rows;
    writeProgressHistory(history);
    return history;
  }

  function updateSchoolAnalytics(classId, metrics) {
    if (isDemoMode()) return readSchoolAnalytics();
    if (!metrics || typeof metrics !== "object") return readSchoolAnalytics();
    if (window.CS_CONFIG && window.CS_CONFIG.enableAnalytics === false) return readSchoolAnalytics();

    var school = readSchoolAnalytics();
    if (!school.classes || typeof school.classes !== "object") school.classes = {};
    var key = normalizeClassId(classId);
    school.classes[key] = {
      totalSentences: Math.max(0, Number(metrics.totalSentences || 0)),
      reasoningRate: clamp(Number(metrics.reasoningRate || 0), 0, 1),
      complexRate: clamp(Number(metrics.complexRate || 0), 0, 1),
      avgDetail: clamp(Number(metrics.avgDetail || 0), 0, 5),
      avgCohesion: clamp(Number(metrics.avgCohesion || 0), 0, 5),
      verbStrengthRate: clamp(Number(metrics.verbStrengthRate || 0), 0, 1)
    };
    school.lastUpdated = Date.now();
    writeSchoolAnalytics(school);
    return school;
  }

  window.CSAnalyticsEngine = {
    KEY: KEY,
    SCHOOL_KEY: SCHOOL_KEY,
    isDemoMode: isDemoMode,
    read: read,
    write: write,
    updateFromAnalysis: updateFromAnalysis,
    readSchoolAnalytics: readSchoolAnalytics,
    writeSchoolAnalytics: writeSchoolAnalytics,
    updateSchoolAnalytics: updateSchoolAnalytics,
    PROGRESS_HISTORY_KEY: PROGRESS_HISTORY_KEY,
    readProgressHistory: readProgressHistory,
    writeProgressHistory: writeProgressHistory,
    appendStudentProgress: appendStudentProgress,
    appendReadingAttempt: appendReadingAttempt
  };
})();
