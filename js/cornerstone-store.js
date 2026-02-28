(function cornerstoneStoreModule(root, factory) {
  if (typeof module === "object" && module.exports) {
    module.exports = factory(require("./cornerstone-signals.js"));
    return;
  }
  root.CSCornerstoneStore = factory(root.CSCornerstoneSignals || null);
})(typeof self !== "undefined" ? self : this, function (signalsApi) {
  "use strict";

  var KEY = "cs_sessions_v1";
  var DEVICE_KEY = "cs_device_id";
  var STUDENT_CODE_KEY = "cs_student_code";
  var MAX_SESSIONS = 200;
  var memStore = {};

  var signals = signalsApi || {
    makeSessionId: function () {
      return "cs_" + Date.now().toString(36) + "_" + Math.random().toString(36).slice(2, 8);
    },
    nowIso: function () { return new Date().toISOString(); },
    normalizeSignal: function (obj) { return obj && typeof obj === "object" ? obj : {}; },
    normalizeStudentCode: function (code) {
      var clean = String(code || "").trim().toUpperCase().replace(/[^A-Z0-9-]/g, "");
      return clean || null;
    }
  };

  function storageGetItem(key) {
    try {
      if (typeof localStorage !== "undefined" && localStorage) return localStorage.getItem(key);
    } catch (_e) {
      // no-op
    }
    return Object.prototype.hasOwnProperty.call(memStore, key) ? memStore[key] : null;
  }

  function storageSetItem(key, value) {
    var val = String(value == null ? "" : value);
    try {
      if (typeof localStorage !== "undefined" && localStorage) {
        localStorage.setItem(key, val);
        return;
      }
    } catch (_e) {
      // no-op
    }
    memStore[key] = val;
  }

  function safeParse(raw, fallback) {
    if (!raw) return fallback;
    try {
      var parsed = JSON.parse(raw);
      return parsed;
    } catch (_e) {
      return fallback;
    }
  }

  function readAllSessions() {
    var parsed = safeParse(storageGetItem(KEY), []);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(function (row) { return row && typeof row === "object"; });
  }

  function writeAllSessions(rows) {
    var list = Array.isArray(rows) ? rows.slice(-MAX_SESSIONS) : [];
    storageSetItem(KEY, JSON.stringify(list));
    return list;
  }

  function getDeviceId() {
    var existing = String(storageGetItem(DEVICE_KEY) || "").trim();
    if (existing) return existing;
    var created = "dev_" + Date.now().toString(36) + "_" + Math.random().toString(36).slice(2, 8);
    storageSetItem(DEVICE_KEY, created);
    return created;
  }

  function getStudentCode() {
    var raw = storageGetItem(STUDENT_CODE_KEY);
    return signals.normalizeStudentCode ? signals.normalizeStudentCode(raw) : (raw || null);
  }

  function setStudentCode(code) {
    var normalized = signals.normalizeStudentCode ? signals.normalizeStudentCode(code) : String(code || "").trim() || null;
    storageSetItem(STUDENT_CODE_KEY, normalized || "");
    return normalized;
  }

  function normalizeWithDefaults(sessionObj) {
    var src = sessionObj && typeof sessionObj === "object" ? sessionObj : {};
    var normalized = signals.normalizeSignal ? signals.normalizeSignal(src) : src;
    if (!normalized.sessionId) normalized.sessionId = signals.makeSessionId ? signals.makeSessionId() : ("cs_" + Date.now().toString(36));
    if (!normalized.createdAt) normalized.createdAt = signals.nowIso ? signals.nowIso() : new Date().toISOString();
    if (!normalized.deviceId) normalized.deviceId = getDeviceId();
    if (!normalized.studentCode) normalized.studentCode = getStudentCode();
    return normalized;
  }

  function appendSession(sessionObj) {
    var normalized = normalizeWithDefaults(sessionObj);
    var rows = readAllSessions();
    var existingIndex = rows.findIndex(function (row) { return String(row.sessionId || "") === String(normalized.sessionId); });
    if (existingIndex >= 0) rows.splice(existingIndex, 1);
    rows.push(normalized);
    writeAllSessions(rows);
    return normalized;
  }

  function listSessions(options) {
    var opts = options && typeof options === "object" ? options : {};
    var studentCode = signals.normalizeStudentCode ? signals.normalizeStudentCode(opts.studentCode) : (opts.studentCode || null);
    var rows = readAllSessions();
    if (!studentCode) return rows;
    return rows.filter(function (row) {
      return String(row.studentCode || "").toUpperCase() === String(studentCode || "").toUpperCase();
    });
  }

  function serializeExportRows(rows) {
    return JSON.stringify(rows || [], null, 2);
  }

  function exportSessions(options) {
    var rows = listSessions(options);
    var json = serializeExportRows(rows);
    if (typeof Blob !== "undefined") {
      return new Blob([json], { type: "application/json" });
    }
    return {
      type: "application/json",
      text: function () { return Promise.resolve(json); },
      size: json.length,
      _fallbackText: json
    };
  }

  function parseImportPayload(payload) {
    if (typeof payload === "string") {
      var parsed = safeParse(payload, null);
      if (parsed === null) return [];
      return Array.isArray(parsed) ? parsed : [parsed];
    }
    if (Array.isArray(payload)) return payload;
    if (payload && typeof payload === "object") return [payload];
    return [];
  }

  function importSessions(jsonArrayOrObj) {
    var incoming = parseImportPayload(jsonArrayOrObj)
      .map(normalizeWithDefaults)
      .filter(function (row) { return row && row.sessionId; });

    var rows = readAllSessions();
    var map = Object.create(null);
    rows.forEach(function (row) {
      map[String(row.sessionId)] = row;
    });

    var added = 0;
    var deduped = 0;
    incoming.forEach(function (row) {
      var id = String(row.sessionId);
      if (map[id]) {
        deduped += 1;
      } else {
        added += 1;
      }
      map[id] = row;
    });

    var merged = Object.keys(map).map(function (id) { return map[id]; });
    merged.sort(function (a, b) {
      var at = Date.parse(String(a.createdAt || "")) || 0;
      var bt = Date.parse(String(b.createdAt || "")) || 0;
      return at - bt;
    });
    writeAllSessions(merged);

    return {
      imported: incoming.length,
      added: added,
      deduped: deduped,
      total: Math.min(MAX_SESSIONS, merged.length)
    };
  }

  function downloadBlob(blob, filename) {
    if (!blob || typeof document === "undefined") return false;
    var name = String(filename || "cornerstone-sessions.json");
    var url = URL.createObjectURL(blob);
    var a = document.createElement("a");
    a.href = url;
    a.download = name;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(function () {
      URL.revokeObjectURL(url);
    }, 500);
    return true;
  }

  return {
    KEY: KEY,
    DEVICE_KEY: DEVICE_KEY,
    STUDENT_CODE_KEY: STUDENT_CODE_KEY,
    MAX_SESSIONS: MAX_SESSIONS,
    getDeviceId: getDeviceId,
    getStudentCode: getStudentCode,
    setStudentCode: setStudentCode,
    appendSession: appendSession,
    listSessions: listSessions,
    exportSessions: exportSessions,
    importSessions: importSessions,
    downloadBlob: downloadBlob
  };
});
