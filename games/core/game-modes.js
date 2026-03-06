(function gameModesModule(root, factory) {
  if (typeof module === "object" && module.exports) {
    module.exports = factory();
    return;
  }
  root.CSGameModes = factory();
})(typeof globalThis !== "undefined" ? globalThis : window, function createGameModes() {
  "use strict";

  var VIEW_MODES = Object.freeze({
    individual: {
      id: "individual",
      label: "Individual",
      description: "Personal practice with direct feedback.",
      roundTarget: 6,
      timerMultiplier: 1,
      projector: false
    },
    smallGroup: {
      id: "smallGroup",
      label: "Small Group",
      description: "Collaborative pacing with stronger hint support.",
      roundTarget: 7,
      timerMultiplier: 1.1,
      projector: false
    },
    classroom: {
      id: "classroom",
      label: "Classroom",
      description: "Whole-group pacing with quick teacher orchestration.",
      roundTarget: 8,
      timerMultiplier: 1.2,
      projector: false
    },
    projector: {
      id: "projector",
      label: "Projector",
      description: "Large-format display optimized for shared attention.",
      roundTarget: 8,
      timerMultiplier: 1.35,
      projector: true
    }
  });

  var DIFFICULTY = Object.freeze({
    scaffolded: { id: "scaffolded", label: "Scaffolded", scoreMultiplier: 0.9, cluePenalty: 0.4 },
    core: { id: "core", label: "Core", scoreMultiplier: 1, cluePenalty: 0.55 },
    stretch: { id: "stretch", label: "Stretch", scoreMultiplier: 1.2, cluePenalty: 0.7 }
  });

  function normalizeViewMode(value) {
    var key = String(value || "individual").trim();
    return VIEW_MODES[key] ? key : "individual";
  }

  function normalizeDifficulty(value) {
    var key = String(value || "core").trim();
    return DIFFICULTY[key] ? key : "core";
  }

  function resolveRoundTarget(viewMode, explicitValue) {
    var n = Number(explicitValue);
    if (Number.isFinite(n) && n > 0) return Math.round(n);
    return VIEW_MODES[normalizeViewMode(viewMode)].roundTarget;
  }

  function resolveTimerSeconds(baseSeconds, viewMode, enabled) {
    if (!enabled) return 0;
    var mode = VIEW_MODES[normalizeViewMode(viewMode)];
    return Math.max(0, Math.round(Number(baseSeconds || 0) * mode.timerMultiplier));
  }

  return {
    VIEW_MODES: VIEW_MODES,
    DIFFICULTY: DIFFICULTY,
    normalizeViewMode: normalizeViewMode,
    normalizeDifficulty: normalizeDifficulty,
    resolveRoundTarget: resolveRoundTarget,
    resolveTimerSeconds: resolveTimerSeconds
  };
});
