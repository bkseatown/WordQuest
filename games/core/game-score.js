(function gameScoreModule(root, factory) {
  if (typeof module === "object" && module.exports) {
    module.exports = factory();
    return;
  }
  root.CSGameScore = factory();
})(typeof globalThis !== "undefined" ? globalThis : window, function createGameScore() {
  "use strict";

  function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
  }

  function computeRoundScore(input) {
    var args = input && typeof input === "object" ? input : {};
    var base = Number(args.basePoints || 100);
    var accuracy = args.correct ? 1 : Number(args.nearMiss ? 0.45 : 0.1);
    var speedFactor = args.timerSeconds > 0
      ? clamp((Number(args.remainingSeconds || 0) / Number(args.timerSeconds || 1)), 0, 1)
      : 0.65;
    var streakBonus = clamp(Number(args.streak || 0) * 8, 0, 48);
    var hintPenalty = Number(args.hintsUsed || 0) * Number(args.hintPenalty || 12);
    var teacherBoost = args.teacherOverride ? 12 : 0;
    var raw = Math.round((base * accuracy) + (base * 0.32 * speedFactor) + streakBonus + teacherBoost - hintPenalty);
    return Math.max(args.correct || args.nearMiss ? 12 : 0, raw);
  }

  return {
    computeRoundScore: computeRoundScore
  };
});
