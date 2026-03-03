(function tierEngineModule(root, factory) {
  if (typeof module === "object" && module.exports) {
    module.exports = factory();
    return;
  }
  root.CSTierEngine = factory();
})(typeof globalThis !== "undefined" ? globalThis : window, function createTierEngine() {
  "use strict";

  function asNumber(value, fallback) {
    var n = Number(value);
    return Number.isFinite(n) ? n : Number(fallback || 0);
  }

  function computeTierSignal(input) {
    var src = input && typeof input === "object" ? input : {};
    var recentAccuracy = asNumber(src.recentAccuracy, 0);
    var goalAccuracy = asNumber(src.goalAccuracy, 0.8);
    var stableCount = Math.max(0, Math.floor(asNumber(src.stableCount, 0)));
    var weeksInIntervention = Math.max(0, asNumber(src.weeksInIntervention, 0));
    var fidelityPercent = asNumber(src.fidelityPercent, 100);

    var reasoning = [];
    var trendDecision = "HOLD";
    if (recentAccuracy >= goalAccuracy && stableCount >= 3) {
      trendDecision = "FADE";
      reasoning.push("Recent accuracy met goal with stable performance across 3+ checks.");
    } else if (recentAccuracy < goalAccuracy - 0.1) {
      trendDecision = "INTENSIFY";
      reasoning.push("Recent accuracy is more than 10 points below goal.");
    } else {
      reasoning.push("Recent performance is close to goal but not yet stable enough to fade.");
    }

    var tierLevel = "Tier 1";
    if (weeksInIntervention >= 8 && recentAccuracy < goalAccuracy) {
      tierLevel = "Tier 3";
      reasoning.push("Intervention duration is 8+ weeks with accuracy still below goal.");
    } else if (recentAccuracy < goalAccuracy) {
      tierLevel = "Tier 2";
      reasoning.push("Accuracy remains below goal and requires targeted support.");
    } else {
      reasoning.push("Accuracy is at or above goal for core-tier instruction.");
    }

    if (fidelityPercent < 70) {
      reasoning.push("Intervention fidelity below recommended threshold.");
    }

    return {
      tierLevel: tierLevel,
      trendDecision: trendDecision,
      reasoning: reasoning
    };
  }

  return {
    computeTierSignal: computeTierSignal
  };
});
