(function storageSchemaModule() {
  "use strict";

  var CS_SCHEMA_VERSION = 1;
  var SCHEMA_KEY = "cs_schema_version";
  var MIGRATION_STATE = {
    ran: false,
    backups: [],
    corruptionDetected: false
  };

  function clone(value) {
    return JSON.parse(JSON.stringify(value));
  }

  function hasDevUnlock() {
    try {
      return localStorage.getItem("cs_allow_dev") === "1";
    } catch (_e) {
      return false;
    }
  }

  function clampNumber(value, min, max, fallback) {
    var num = Number(value);
    if (Number.isNaN(num)) num = Number(fallback || 0);
    return Math.max(min, Math.min(max, num));
  }

  function toBool(value) {
    if (typeof value === "boolean") return value;
    if (typeof value === "number") return value !== 0;
    var text = String(value || "").toLowerCase().trim();
    return text === "1" || text === "true" || text === "yes" || text === "on";
  }

  function safeString(value, fallback) {
    var out = String(value === undefined || value === null ? "" : value).trim();
    return out || String(fallback || "");
  }

  function backupCorruptKey(key, rawValue) {
    try {
      var backupKey = key + "_backup_" + Date.now();
      localStorage.setItem(backupKey, String(rawValue || ""));
      localStorage.removeItem(key);
      MIGRATION_STATE.backups.push(key);
      MIGRATION_STATE.corruptionDetected = true;
    } catch (_e) {
      // ignore storage failures
    }
  }

  function safeLoadJSON(key, fallback) {
    try {
      var raw = localStorage.getItem(key);
      if (!raw) return clone(fallback);
      return JSON.parse(raw);
    } catch (_e) {
      try {
        var rawValue = localStorage.getItem(key);
        if (rawValue !== null) backupCorruptKey(key, rawValue);
      } catch (_e2) {
        // ignore
      }
      return clone(fallback);
    }
  }

  function safeSaveJSON(key, obj) {
    try {
      localStorage.setItem(key, JSON.stringify(obj));
      return true;
    } catch (_e) {
      return false;
    }
  }

  function getSchemaVersion() {
    try {
      return Number(localStorage.getItem(SCHEMA_KEY) || "0");
    } catch (_e) {
      return 0;
    }
  }

  function setSchemaVersion(v) {
    try {
      localStorage.setItem(SCHEMA_KEY, String(Number(v) || 0));
    } catch (_e) {
      // ignore
    }
  }

  function defaultAnalytics() {
    return {
      totalSentences: 0,
      reasoningRate: 0,
      complexRate: 0,
      avgDetail: 0,
      avgCohesion: 0
    };
  }

  function normalizeSentenceRow(row) {
    var src = row && typeof row === "object" ? row : {};
    var sentenceType = String(src.sentence_type || "simple").toLowerCase();
    if (sentenceType !== "simple" && sentenceType !== "compound" && sentenceType !== "complex") sentenceType = "simple";
    var verb = String(src.verb_strength || "adequate").toLowerCase();
    if (verb !== "weak" && verb !== "adequate" && verb !== "strong") verb = "adequate";
    return {
      sentence_type: sentenceType,
      has_reasoning: toBool(src.has_reasoning),
      verb_strength: verb,
      detail_score: Number(clampNumber(src.detail_score, 0, 5, 0).toFixed(3)),
      cohesion: Number(clampNumber(src.cohesion, 0, 5, 0).toFixed(3))
    };
  }

  function normalizeStudentData(raw) {
    if (!Array.isArray(raw)) return null;
    return raw.map(function (student) {
      var src = student && typeof student === "object" ? student : {};
      var rows = Array.isArray(src.sentences) ? src.sentences : [];
      return {
        name: safeString(src.name, "Student"),
        sentences: rows.map(normalizeSentenceRow)
      };
    });
  }

  function normalizeAnalyticsShape(raw) {
    if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;
    return {
      totalSentences: Math.max(0, Math.floor(Number(raw.totalSentences || 0))),
      reasoningRate: Number(clampNumber(raw.reasoningRate, 0, 1, 0).toFixed(6)),
      complexRate: Number(clampNumber(raw.complexRate, 0, 1, 0).toFixed(6)),
      avgDetail: Number(clampNumber(raw.avgDetail, 0, 5, 0).toFixed(6)),
      avgCohesion: Number(clampNumber(raw.avgCohesion, 0, 5, 0).toFixed(6))
    };
  }

  function normalizeSchoolAnalytics(raw) {
    if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;
    var srcClasses = raw.classes && typeof raw.classes === "object" && !Array.isArray(raw.classes)
      ? raw.classes
      : {};
    var outClasses = {};
    Object.keys(srcClasses).forEach(function (classId) {
      var cleanId = safeString(classId, "").replace(/\s+/g, " ").trim();
      if (!cleanId) return;
      var metrics = normalizeAnalyticsShape(srcClasses[classId]) || defaultAnalytics();
      outClasses[cleanId] = metrics;
    });
    return {
      classes: outClasses,
      lastUpdated: Math.max(0, Math.floor(Number(raw.lastUpdated || 0)))
    };
  }

  function normalizeAICache(raw) {
    if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;
    var out = {};
    Object.keys(raw).forEach(function (hash) {
      var row = raw[hash];
      if (!row || typeof row !== "object" || Array.isArray(row)) return;
      var entry = {
        analysis: undefined,
        coach: undefined,
        pedagogy: undefined,
        miniLesson: undefined,
        timestamp: Math.max(0, Math.floor(Number(row.timestamp || 0)))
      };
      if (row.analysis && typeof row.analysis === "object" && !Array.isArray(row.analysis)) {
        entry.analysis = normalizeSentenceRow(row.analysis);
        entry.analysis.word_count = Math.max(0, Math.floor(Number(row.analysis.word_count || 0)));
        entry.analysis.suggested_focus = safeString(row.analysis.suggested_focus, "reasoning");
      }
      if (typeof row.coach === "string") {
        entry.coach = safeString(row.coach, "");
      }
      if (row.pedagogy && typeof row.pedagogy === "object" && !Array.isArray(row.pedagogy)) {
        entry.pedagogy = row.pedagogy;
      }
      if (row.miniLesson && typeof row.miniLesson === "object" && !Array.isArray(row.miniLesson)) {
        entry.miniLesson = row.miniLesson;
      }
      if (!entry.analysis && !entry.coach && !entry.pedagogy && !entry.miniLesson) return;
      out[String(hash)] = entry;
    });
    return out;
  }

  function normalizeSkillEvidenceRow(raw) {
    var src = raw && typeof raw === "object" ? raw : {};
    function normalizeSkill(skillRaw) {
      var skill = skillRaw && typeof skillRaw === "object" ? skillRaw : {};
      var series = Array.isArray(skill.series) ? skill.series.slice(-12).map(function (n) {
        return Math.max(0, Math.min(100, Math.round(Number(n) || 0)));
      }) : [];
      var signals = Array.isArray(skill.signals) ? skill.signals.slice(0, 6).map(function (s) {
        return safeString(s, "");
      }).filter(Boolean) : [];
      return {
        score: Math.max(0, Math.min(100, Math.round(Number(skill.score || 0)))),
        signals: signals,
        series: series
      };
    }
    return {
      updatedAt: safeString(src.updatedAt, new Date().toISOString()),
      decoding: normalizeSkill(src.decoding),
      fluency: normalizeSkill(src.fluency),
      sentence: normalizeSkill(src.sentence),
      writing: normalizeSkill(src.writing)
    };
  }

  function normalizeProgressHistory(raw) {
    var src = raw && typeof raw === "object" ? raw : {};
    var out = {};
    Object.keys(src).forEach(function (key) {
      if (key !== "skillEvidence" && key !== "wordQuestSignals") out[key] = src[key];
    });
    var signalRows = Array.isArray(src.wordQuestSignals) ? src.wordQuestSignals.slice(-250) : [];
    out.wordQuestSignals = signalRows.map(function (row) {
      var entry = row && typeof row === "object" ? row : {};
      return {
        t: Math.max(0, Math.floor(Number(entry.t || Date.now()))),
        studentId: safeString(entry.studentId, ""),
        guessCount: Math.max(0, Math.floor(Number(entry.guessCount || entry.guesses || 0))),
        timeToFirstGuess: Math.max(0, Number(entry.timeToFirstGuess || entry.timeToFirstGuessSec || 0)),
        vowelSwapRate: Number(clampNumber(entry.vowelSwapRate, 0, 1, 0)),
        repeatedInvalidLetterPlacementCount: Math.max(0, Math.floor(Number(entry.repeatedInvalidLetterPlacementCount || 0))),
        patternAdherence: Number(clampNumber(entry.patternAdherence || entry.updateRespect, 0, 1, 0)),
        clueUtilization: Number(clampNumber(entry.clueUtilization, 0, 1, 0)),
        nextStep: safeString(entry.nextStep, ""),
        solved: toBool(entry.solved)
      };
    });

    var evidence = src.skillEvidence && typeof src.skillEvidence === "object" ? src.skillEvidence : {};
    var normalizedEvidence = {};
    Object.keys(evidence).forEach(function (studentId) {
      var sid = safeString(studentId, "");
      if (!sid) return;
      normalizedEvidence[sid] = normalizeSkillEvidenceRow(evidence[studentId]);
    });
    out.skillEvidence = normalizedEvidence;
    return out;
  }

  function migrateKey(key, fallback, normalizeFn, options) {
    var opts = options || {};
    var rawValue = null;
    try { rawValue = localStorage.getItem(key); } catch (_e) { rawValue = null; }
    if (rawValue === null) {
      if (opts.initializeMissing) safeSaveJSON(key, clone(fallback));
      return;
    }

    var parsed;
    try {
      parsed = JSON.parse(rawValue);
    } catch (_e2) {
      backupCorruptKey(key, rawValue);
      safeSaveJSON(key, clone(fallback));
      return;
    }

    var normalized = normalizeFn(parsed);
    if (normalized === null) {
      backupCorruptKey(key, rawValue);
      safeSaveJSON(key, clone(fallback));
      return;
    }

    safeSaveJSON(key, normalized);
  }

  function migrateStorageIfNeeded() {
    var current = getSchemaVersion();
    if (current === CS_SCHEMA_VERSION) return clone(MIGRATION_STATE);

    MIGRATION_STATE.ran = true;
    MIGRATION_STATE.backups = [];
    MIGRATION_STATE.corruptionDetected = false;

    migrateKey("cs_student_data", [], normalizeStudentData, { initializeMissing: true });
    migrateKey("cs_analytics", defaultAnalytics(), normalizeAnalyticsShape, { initializeMissing: true });
    migrateKey("cs_school_analytics", { classes: {}, lastUpdated: 0 }, normalizeSchoolAnalytics, { initializeMissing: true });
    migrateKey("cs_ai_cache", {}, normalizeAICache, { initializeMissing: true });
    migrateKey("cs_progress_history", { wordQuestSignals: [], skillEvidence: {} }, normalizeProgressHistory, { initializeMissing: true });

    if (hasDevUnlock()) {
      migrateKey("cs_config_override", {}, function (raw) {
        return raw && typeof raw === "object" && !Array.isArray(raw) ? raw : null;
      }, { initializeMissing: false });
    } else {
      try { localStorage.removeItem("cs_config_override"); } catch (_e3) {}
    }

    setSchemaVersion(CS_SCHEMA_VERSION);
    return clone(MIGRATION_STATE);
  }

  window.CSStorageSchema = {
    CS_SCHEMA_VERSION: CS_SCHEMA_VERSION,
    getSchemaVersion: getSchemaVersion,
    setSchemaVersion: setSchemaVersion,
    migrateStorageIfNeeded: migrateStorageIfNeeded,
    safeLoadJSON: safeLoadJSON,
    safeSaveJSON: safeSaveJSON,
    backupCorruptKey: backupCorruptKey,
    defaultAnalytics: defaultAnalytics,
    getMigrationStatus: function () { return clone(MIGRATION_STATE); }
  };
})();
