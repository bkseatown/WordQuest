(function numeracySequencerModule(root, factory) {
  if (typeof module === "object" && module.exports) {
    module.exports = factory(root || globalThis);
    return;
  }
  root.CSNumeracySequencer = factory(root || globalThis);
})(typeof globalThis !== "undefined" ? globalThis : window, function createNumeracySequencer(root) {
  "use strict";

  var CONTENT_FOCUS = Object.freeze([
    "Number Fluency",
    "Place Value Reasoning",
    "Fraction Concepts",
    "Ratio & Proportion",
    "Algebraic Thinking",
    "Problem Solving & Modeling"
  ]);

  var STRATEGY_STAGE = Object.freeze([
    "Counting",
    "Additive",
    "Multiplicative",
    "Proportional",
    "Abstract"
  ]);

  var ERROR_PATTERN = Object.freeze([
    "Conceptual misunderstanding",
    "Procedural inconsistency",
    "Language barrier",
    "Working memory overload",
    "Transfer issue"
  ]);

  var PRACTICE_MODE = Object.freeze([
    "Quick Check",
    "Strategy Builder",
    "Error Analysis",
    "Fluency Sprint"
  ]);

  function toNumber(value, fallback) {
    var n = Number(value);
    return Number.isFinite(n) ? n : fallback;
  }

  function clampIndex(value, max) {
    if (!Number.isFinite(value)) return 0;
    var rounded = Math.round(value);
    if (rounded < 0) return 0;
    if (rounded > max) return max;
    return rounded;
  }

  function parseGradeLevel(raw) {
    var s = String(raw || "").toUpperCase();
    var m = s.match(/([0-9]{1,2})/);
    if (!m) return null;
    return toNumber(m[1], null);
  }

  function inferStrategyStage(profile) {
    var gradeLevel = parseGradeLevel(profile && profile.gradeBand);
    var confidence = toNumber(profile && profile.confidence, 0.5);
    var signal = (gradeLevel == null ? 2 : gradeLevel / 2) + confidence * 2;
    var idx = clampIndex(signal, STRATEGY_STAGE.length - 1);
    return STRATEGY_STAGE[idx];
  }

  function inferContentFocus(profile) {
    var domain = String(profile && profile.domainHint || "").toLowerCase();
    if (domain.includes("fraction")) return "Fraction Concepts";
    if (domain.includes("ratio") || domain.includes("proportion")) return "Ratio & Proportion";
    if (domain.includes("algebra")) return "Algebraic Thinking";
    if (domain.includes("model") || domain.includes("problem")) return "Problem Solving & Modeling";
    if (domain.includes("place")) return "Place Value Reasoning";
    if (domain.includes("fluency")) return "Number Fluency";
    var gradeLevel = parseGradeLevel(profile && profile.gradeBand);
    if (gradeLevel == null || gradeLevel <= 2) return "Number Fluency";
    if (gradeLevel <= 4) return "Place Value Reasoning";
    if (gradeLevel <= 6) return "Fraction Concepts";
    if (gradeLevel <= 8) return "Ratio & Proportion";
    return CONTENT_FOCUS[CONTENT_FOCUS.length - 1];
  }

  function inferErrorPattern(profile) {
    var misses = toNumber(profile && profile.errorRate, 0.3);
    var languageSupport = !!(profile && profile.languageSupport);
    var memoryLoad = toNumber(profile && profile.workingMemoryRisk, 0.2);
    if (languageSupport) return "Language barrier";
    if (memoryLoad >= 0.6) return "Working memory overload";
    if (misses >= 0.5) return "Conceptual misunderstanding";
    if (misses >= 0.3) return "Procedural inconsistency";
    return "Transfer issue";
  }

  function inferPracticeMode(stage, errorPattern) {
    if (errorPattern === "Conceptual misunderstanding") return "Strategy Builder";
    if (errorPattern === "Procedural inconsistency") return "Fluency Sprint";
    if (errorPattern === "Language barrier") return "Error Analysis";
    if (errorPattern === "Working memory overload") return "Quick Check";
    if (stage === "Abstract" || stage === "Proportional") return "Error Analysis";
    return PRACTICE_MODE[0];
  }

  function computeTierFromSharedEngine(profile) {
    var tierEngine = root && root.CSTierEngine;
    if (!tierEngine || typeof tierEngine.computeTierSignal !== "function") {
      return {
        tierLevel: "Tier 2",
        trendDecision: "HOLD",
        reasoning: ["Tier engine unavailable; fallback signal used."]
      };
    }
    var recentAccuracy = toNumber(profile && profile.accuracy, 0.7);
    var goalAccuracy = toNumber(profile && profile.goalAccuracy, 0.8);
    var stableCount = toNumber(profile && profile.stableCount, recentAccuracy >= goalAccuracy ? 3 : 1);
    var weeksInIntervention = toNumber(profile && profile.weeksInIntervention, recentAccuracy < goalAccuracy ? 8 : 4);
    var fidelityPercent = toNumber(profile && profile.fidelityPercent, 85);
    return tierEngine.computeTierSignal({
      recentAccuracy: recentAccuracy,
      goalAccuracy: goalAccuracy,
      stableCount: stableCount,
      weeksInIntervention: weeksInIntervention,
      fidelityPercent: fidelityPercent
    });
  }

  function generateNumeracyRecommendation(studentProfile) {
    var profile = studentProfile && typeof studentProfile === "object" ? studentProfile : {};
    var contentFocus = inferContentFocus(profile);
    var strategyStage = inferStrategyStage(profile);
    var errorPattern = inferErrorPattern(profile);
    var tier = computeTierFromSharedEngine(profile);
    var tierSignal = String(tier.tierLevel || "Tier 2");
    var practiceMode = inferPracticeMode(strategyStage, errorPattern);
    var recommendedAction = "Run " + practiceMode + " targeting " + contentFocus + " at the " + strategyStage + " stage.";

    return {
      contentFocus: contentFocus,
      strategyStage: strategyStage,
      errorPattern: errorPattern,
      tierSignal: tierSignal,
      trendDecision: String(tier.trendDecision || "HOLD"),
      tierReasoning: Array.isArray(tier.reasoning) ? tier.reasoning.slice(0, 4) : [],
      recommendedAction: recommendedAction,
      practiceMode: practiceMode
    };
  }

  return {
    generateNumeracyRecommendation: generateNumeracyRecommendation
  };
});
