(function cornerstoneEngineModule() {
  "use strict";

  var HISTORY_KEY = "cs_progress_history";

  function clamp(n, min, max) {
    var num = Number(n);
    if (Number.isNaN(num)) num = min;
    return Math.max(min, Math.min(max, num));
  }

  function safeRead() {
    try {
      var raw = localStorage.getItem(HISTORY_KEY);
      var parsed = raw ? JSON.parse(raw) : {};
      return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed : {};
    } catch (_e) {
      return {};
    }
  }

  function safeWrite(payload) {
    try {
      localStorage.setItem(HISTORY_KEY, JSON.stringify(payload || {}));
    } catch (_e) {
      // no-op
    }
  }

  function intensityFromConfidence(confidence) {
    return Number(confidence || 0) >= 0.65 ? "tier2" : "tier3";
  }

  function normalizeWordQuestSignal(signal, options) {
    var src = signal && typeof signal === "object" ? signal : {};
    var updateRespect = clamp(src.updateRespect, 0, 1);
    var repetitionPenalty = clamp(src.repetitionPenalty, 0, 1);
    var uniqueVowels = Math.max(0, Number(src.uniqueVowels || 0));
    var confidence = clamp((updateRespect * 0.52) + ((1 - repetitionPenalty) * 0.28) + (Math.min(uniqueVowels, 5) / 5 * 0.2), 0, 1);

    var skillDomain = "strategy";
    if (src.focusTag === "decoding_vowels") skillDomain = "decoding";
    else if (src.focusTag === "morphology_awareness") skillDomain = "morphology";

    return {
      engine: "wordquest",
      skill_domain: skillDomain,
      confidence: +confidence.toFixed(3),
      next_step: String(src.nextStep || "Run a coached Word Quest round and verify feedback-use strategy."),
      intensity: intensityFromConfidence(confidence),
      studentId: String(options && options.studentId || ""),
      source: {
        updateRespect: +updateRespect.toFixed(3),
        repetitionPenalty: +repetitionPenalty.toFixed(3),
        uniqueVowels: uniqueVowels,
        affixAttempts: Math.max(0, Number(src.affixAttempts || 0)),
        solved: !!src.solved,
        guesses: Math.max(0, Number(src.guesses || 0))
      }
    };
  }

  function normalizeReadingLabSignal(signal, options) {
    var src = signal && typeof signal === "object" ? signal : {};
    var accuracy = clamp((Number(src.accuracy || 0) / 100), 0, 1);
    var punct = clamp((Number(src.punctuationRespect || src.punctScore || 0) / 100), 0, 1);
    var selfCorrectionRate = clamp(Number(src.selfCorrectionRate || 0), 0, 1);
    var prosodyStability = clamp(Number(src.prosodyStability || 0), 0, 1);
    var confidence = clamp((accuracy * 0.45) + (punct * 0.25) + (prosodyStability * 0.2) + (selfCorrectionRate * 0.1), 0, 1);

    var intensity = (accuracy < 0.85 && punct < 0.60) ? "tier3" : intensityFromConfidence(confidence);
    return {
      engine: "readinglab",
      skill_domain: "fluency",
      confidence: +confidence.toFixed(3),
      next_step: String(src.nextStep || "Run a 10-minute fluency routine with punctuation-aware phrasing."),
      intensity: intensity,
      studentId: String(options && options.studentId || ""),
      source: {
        orfBand: String(src.orfBand || "").trim(),
        punctuationRespectBand: String(src.punctuationRespectBand || "").trim(),
        selfCorrectionRate: +selfCorrectionRate.toFixed(3),
        prosodyStability: +prosodyStability.toFixed(3),
        accuracy: +accuracy.toFixed(3),
        punctuationRespect: +punct.toFixed(3)
      }
    };
  }

  function normalizeWritingStudioSignal(signal, options) {
    var src = signal && typeof signal === "object" ? signal : {};
    var confidence = clamp(Number(src.confidence || 0.58), 0, 1);
    return {
      engine: "writingstudio",
      skill_domain: "reasoning",
      confidence: +confidence.toFixed(3),
      next_step: String(src.next_step || src.nextStep || "Use Sentence Surgery to model one because/although sentence, then independent rewrite."),
      intensity: String(src.intensity || intensityFromConfidence(confidence)) === "tier3" ? "tier3" : "tier2",
      studentId: String(options && options.studentId || ""),
      source: src.source && typeof src.source === "object" ? src.source : {}
    };
  }

  function normalizeSignal(input, options) {
    var moduleName = String(options && options.module || input && input.engine || "").toLowerCase();
    if (moduleName === "wordquest" || moduleName === "word_quest") return normalizeWordQuestSignal(input, options);
    if (moduleName === "readinglab" || moduleName === "reading_lab") return normalizeReadingLabSignal(input, options);
    if (moduleName === "writingstudio" || moduleName === "writing_studio") return normalizeWritingStudioSignal(input, options);
    return null;
  }

  function appendSignal(input, options) {
    var normalized = normalizeSignal(input, options);
    if (!normalized) return null;

    var history = safeRead();
    var bucket = Array.isArray(history.cornerstoneSignals) ? history.cornerstoneSignals : [];
    bucket.push({
      t: Date.now(),
      studentId: normalized.studentId || "",
      signal: normalized
    });
    if (bucket.length > 300) bucket = bucket.slice(-300);
    history.cornerstoneSignals = bucket;
    safeWrite(history);
    return normalized;
  }

  function getLatestSignal(studentId) {
    var history = safeRead();
    var rows = Array.isArray(history.cornerstoneSignals) ? history.cornerstoneSignals : [];
    if (!rows.length) return null;

    var target = String(studentId || "").trim();
    if (target) {
      for (var i = rows.length - 1; i >= 0; i -= 1) {
        var row = rows[i];
        if (String(row && row.studentId || "").trim() === target) {
          return row.signal || null;
        }
      }
    }

    var last = rows[rows.length - 1];
    return last && last.signal ? last.signal : null;
  }

  window.CSCornerstoneEngine = {
    HISTORY_KEY: HISTORY_KEY,
    normalizeSignal: normalizeSignal,
    appendSignal: appendSignal,
    getLatestSignal: getLatestSignal,
    normalizeWordQuestSignal: normalizeWordQuestSignal,
    normalizeReadingLabSignal: normalizeReadingLabSignal,
    normalizeWritingStudioSignal: normalizeWritingStudioSignal
  };
})();
