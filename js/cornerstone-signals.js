(function cornerstoneSignalsModule(root, factory) {
  if (typeof module === "object" && module.exports) {
    module.exports = factory();
    return;
  }
  root.CSCornerstoneSignals = factory();
})(typeof self !== "undefined" ? self : this, function () {
  "use strict";

  function pad2(n) {
    return String(Math.max(0, Number(n) || 0)).padStart(2, "0");
  }

  function nowIso() {
    return new Date().toISOString();
  }

  function makeSessionId() {
    var ts = Date.now().toString(36);
    var rand = Math.random().toString(36).slice(2, 8);
    return "cs_" + ts + "_" + rand;
  }

  function safeClone(value) {
    if (!value || typeof value !== "object") return value;
    try {
      return JSON.parse(JSON.stringify(value));
    } catch (_e) {
      return value;
    }
  }

  function normalizeTier(tier) {
    var raw = String(tier || "").trim().toLowerCase();
    if (raw === "tier3" || raw === "tier-3" || raw === "3") return "tier3";
    return "tier2";
  }

  function normalizeEngine(engine) {
    var raw = String(engine || "").trim().toLowerCase();
    if (raw === "wordquest" || raw === "word_quest" || raw === "word-quest") return "wordquest";
    if (raw === "readinglab" || raw === "reading_lab" || raw === "reading-lab") return "readinglab";
    if (raw === "writingstudio" || raw === "writing_studio" || raw === "sentence_surgery" || raw === "sentence-surgery" || raw === "writing") return "writing";
    return "wordquest";
  }

  function normalizeStudentCode(code) {
    var clean = String(code || "").trim().toUpperCase().replace(/[^A-Z0-9-]/g, "");
    return clean || null;
  }

  function normalizeNextMove(nextMove) {
    var src = nextMove && typeof nextMove === "object" ? nextMove : {};
    var steps = Array.isArray(src.steps) ? src.steps.map(function (step) {
      return String(step || "").trim();
    }).filter(Boolean).slice(0, 5) : [];
    return {
      title: String(src.title || "Recommended 10-Minute Move").trim() || "Recommended 10-Minute Move",
      steps: steps,
      estMinutes: Math.max(1, Math.min(60, Number(src.estMinutes || 10) || 10))
    };
  }

  function normalizeSignal(input) {
    var src = input && typeof input === "object" ? input : {};
    var out = {
      schemaVersion: 1,
      sessionId: String(src.sessionId || makeSessionId()),
      createdAt: String(src.createdAt || nowIso()),
      studentCode: normalizeStudentCode(src.studentCode),
      deviceId: src.deviceId ? String(src.deviceId) : "",
      engine: normalizeEngine(src.engine),
      durationMs: Math.max(0, Number(src.durationMs || 0)),
      metrics: safeClone(src.metrics && typeof src.metrics === "object" ? src.metrics : {}),
      derived: safeClone(src.derived && typeof src.derived === "object" ? src.derived : {}),
      tier: normalizeTier(src.tier),
      nextMove: normalizeNextMove(src.nextMove),
      privacy: {
        containsText: false,
        containsAudio: false
      }
    };

    var privacySrc = src.privacy && typeof src.privacy === "object" ? src.privacy : {};
    out.privacy.containsText = !!privacySrc.containsText;
    out.privacy.containsAudio = !!privacySrc.containsAudio;
    return out;
  }

  return {
    makeSessionId: makeSessionId,
    nowIso: nowIso,
    normalizeSignal: normalizeSignal,
    normalizeStudentCode: normalizeStudentCode,
    normalizeEngine: normalizeEngine,
    normalizeTier: normalizeTier,
    normalizeNextMove: normalizeNextMove
  };
});
