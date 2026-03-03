(function fidelityModule(root, factory) {
  if (typeof module === "object" && module.exports) {
    module.exports = factory();
    return;
  }
  root.CSFidelity = factory();
})(typeof globalThis !== "undefined" ? globalThis : window, function createFidelityModule() {
  "use strict";

  var sessions = [];

  function asNumber(value, fallback) {
    var n = Number(value);
    return Number.isFinite(n) ? n : Number(fallback || 0);
  }

  function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
  }

  function normalizeMode(mode) {
    var m = String(mode || "").toLowerCase();
    return m === "small group" ? "Small Group" : "1:1";
  }

  function normalizeType(value) {
    var raw = String(value || "").toLowerCase();
    return raw === "numeracy" ? "Numeracy" : "Literacy";
  }

  function summarize(studentId, interventionType) {
    var sid = String(studentId || "");
    var type = normalizeType(interventionType);
    var filtered = sessions.filter(function (row) {
      return String(row.studentId) === sid && row.interventionType === type;
    });
    var cumulativeMinutes = filtered.reduce(function (sum, row) {
      return sum + Number(row.minutesDelivered || 0);
    }, 0);
    var planned = filtered.reduce(function (sum, row) {
      return sum + Number(row.plannedMinutes || 0);
    }, 0);
    var fidelityPercent = planned > 0 ? clamp((cumulativeMinutes / planned) * 100, 0, 200) : 0;
    return {
      fidelityPercent: Math.round(fidelityPercent * 10) / 10,
      cumulativeMinutes: Math.round(cumulativeMinutes * 10) / 10,
      totalSessions: filtered.length
    };
  }

  function logInterventionSession(payload) {
    var src = payload && typeof payload === "object" ? payload : {};
    var studentId = String(src.studentId || "").trim();
    var minutesDelivered = Math.max(0, asNumber(src.minutesDelivered, 0));
    var plannedMinutes = Math.max(0, asNumber(src.plannedMinutes, 0));
    var mode = normalizeMode(src.mode);
    var interventionType = normalizeType(src.interventionType);

    sessions.push({
      studentId: studentId,
      minutesDelivered: minutesDelivered,
      plannedMinutes: plannedMinutes,
      mode: mode,
      interventionType: interventionType,
      ts: Date.now()
    });

    return summarize(studentId, interventionType);
  }

  function getFidelitySummary(studentId, interventionType) {
    return summarize(studentId, interventionType);
  }

  return {
    logInterventionSession: logInterventionSession,
    getFidelitySummary: getFidelitySummary
  };
});
