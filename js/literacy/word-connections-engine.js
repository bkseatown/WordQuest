(function wordConnectionsEngineModule(root, factory) {
  if (typeof module === "object" && module.exports) {
    module.exports = factory();
    return;
  }
  root.CSWordConnectionsEngine = factory();
})(typeof globalThis !== "undefined" ? globalThis : window, function createWordConnectionsEngine() {
  "use strict";

  var MODE_CONFIG = Object.freeze({
    FUN: { minTimer: 60, maxTimer: 90, difficulty: "Accessible", focus: "Vocabulary relationships" },
    TARGETED: { minTimer: 45, maxTimer: 60, difficulty: "Tier 2 Academic", focus: "Morphology and academic language" },
    INTERVENTION: { minTimer: 0, maxTimer: 45, difficulty: "Controlled", focus: "Skill-node aligned intervention vocabulary" }
  });

  function clamp(value, min, max) {
    var n = Number(value);
    if (!Number.isFinite(n)) return min;
    return Math.max(min, Math.min(max, n));
  }

  function normalizeMode(mode) {
    var m = String(mode || "FUN").toUpperCase();
    if (m === "TARGETED" || m === "INTERVENTION") return m;
    return "FUN";
  }

  function inferInstructionalFocus(skillNode, mode) {
    var node = String(skillNode || "").toLowerCase();
    if (/morph|prefix|suffix|root/.test(node)) return "Morphological connections";
    if (/vocab|academic|language/.test(node)) return "Academic language precision";
    if (/relation|analogy|semantic/.test(node)) return "Word relationships";
    if (mode === "INTERVENTION") return "Structured intervention vocabulary";
    if (mode === "TARGETED") return "Tier 2 vocabulary depth";
    return "Vocabulary and language connections";
  }

  function pickTimer(mode, tierLevel) {
    var cfg = MODE_CONFIG[mode] || MODE_CONFIG.FUN;
    if (mode === "INTERVENTION") {
      if (String(tierLevel || "").toUpperCase() === "TIER 3") return 0;
      return 45;
    }
    var midpoint = Math.round((cfg.minTimer + cfg.maxTimer) / 2);
    return clamp(midpoint, cfg.minTimer, cfg.maxTimer);
  }

  function normalizeCard(candidate) {
    var card = candidate && typeof candidate === "object" ? candidate : {};
    return {
      target: String(card.target || card.targetWord || "").trim(),
      forbidden: Array.isArray(card.forbidden)
        ? card.forbidden.map(function (w) { return String(w || "").trim(); }).filter(Boolean)
        : [],
      scaffolds: Array.isArray(card.scaffolds)
        ? card.scaffolds.map(function (w) { return String(w || "").trim(); }).filter(Boolean)
        : [],
      requiredMove: String(card.requiredMove || "").trim(),
      skillTag: String(card.skillTag || card.skillNode || "").trim()
    };
  }

  function fallbackWordPack(skillNode, mode) {
    var focus = inferInstructionalFocus(skillNode, mode);
    if (/morph|prefix|suffix|root/.test(String(skillNode || "").toLowerCase())) {
      return {
        target: "morphology",
        forbidden: ["prefix", "suffix", "word", "part"],
        scaffolds: ["Use a base word and add one affix.", "Explain the meaning change."],
        requiredMove: "Name base + affix.",
        skillTag: String(skillNode || "literacy.morphology")
      };
    }
    return {
      target: "evidence",
      forbidden: ["proof", "quote", "text", "supports"],
      scaffolds: ["Use a sentence frame.", "Connect word meaning to a classroom example."],
      requiredMove: "Use one complete academic sentence.",
      skillTag: String(skillNode || "literacy.vocabulary")
    };
  }

  function generateWordConnectionsRound(input) {
    var args = input && typeof input === "object" ? input : {};
    var mode = normalizeMode(args.mode);
    var skillNode = String(args.skillNode || "literacy.vocabulary");
    var tierLevel = String(args.tierLevel || "Tier 2");
    var selected = normalizeCard(args.selectedCard);
    if (!selected.target) {
      selected = fallbackWordPack(skillNode, mode);
    }

    var instructionalFocus = inferInstructionalFocus(skillNode || selected.skillTag, mode);
    var timerSeconds = pickTimer(mode, tierLevel);
    var difficultyLevel = MODE_CONFIG[mode].difficulty;
    var scaffolds = selected.scaffolds.slice(0);
    if (!scaffolds.length) {
      scaffolds.push("Use a sentence frame connected to the literacy focus.");
      if (mode !== "FUN") scaffolds.push("Include one morphology or word relationship clue.");
    }

    return {
      targetWord: selected.target,
      forbiddenWords: selected.forbidden.slice(0, mode === "FUN" ? 4 : mode === "TARGETED" ? 5 : 6),
      scaffolds: scaffolds,
      difficultyLevel: difficultyLevel,
      timerSeconds: timerSeconds,
      instructionalFocus: instructionalFocus
    };
  }

  return {
    generateWordConnectionsRound: generateWordConnectionsRound
  };
});
