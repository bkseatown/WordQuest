(function gameContextInjectionModule(root, factory) {
  if (typeof module === "object" && module.exports) {
    module.exports = factory(require("./teacher-context/context-engine"));
    return;
  }
  root.CSGameContextInjection = factory(root.CSTeacherContextEngine);
})(typeof globalThis !== "undefined" ? globalThis : window, function createGameContextInjectionFactory(ContextEngine) {
  "use strict";

  function toText(value) {
    return String(value == null ? "" : value).trim();
  }

  function buildGameContext(contextSource, deps) {
    var derived = ContextEngine && typeof ContextEngine.deriveContext === "function"
      ? ContextEngine.deriveContext(contextSource, deps)
      : {};
    return ContextEngine && typeof ContextEngine.buildGamePayload === "function"
      ? ContextEngine.buildGamePayload("", derived)
      : {};
  }

  function inferContent(gameType, gameContext) {
    var game = toText(gameType || "").toLowerCase();
    var context = gameContext && typeof gameContext === "object" ? gameContext : {};
    var focus = toText(context.lessonFocus || "");
    var subject = toText(context.subject || "");
    var skills = Array.isArray(context.targetSkills) ? context.targetSkills.slice(0, 3) : [];
    if (subject === "Math" && focus.toLowerCase().indexOf("fraction") >= 0) {
      if (game === "concept-ladder") return ["fraction clues", "comparison language", "early-solve points"];
      if (game === "error-detective") return ["fraction misconceptions", "numerator meaning", "reasoning correction"];
      return ["fraction vocabulary", "math language", "comparison reasoning"];
    }
    if (subject === "Intervention" || subject === "ELA") {
      if (game === "morphology-builder") return ["morpheme sets", "meaning clues", "grade-band word building"];
      if (game === "sentence-builder") return ["lesson vocabulary", "sentence frames", "transition supports"];
      return ["target phonics patterns", "academic vocabulary", "guided retrieval"];
    }
    return skills.length ? skills : [focus || "context-aligned practice"];
  }

  function injectGameContext(gameType, gameContext) {
    var payload = Object.assign({}, gameContext || {});
    payload.gameType = toText(gameType || payload.gameType || "word-quest").toLowerCase();
    payload.loadedFocus = inferContent(payload.gameType, payload);
    if (!payload.mode) payload.mode = payload.studentIds && payload.studentIds.length > 1 ? "small-group" : "individual";
    return payload;
  }

  function getRecommendedGameContent(gameType, gameContext) {
    var payload = injectGameContext(gameType, gameContext);
    return {
      gameType: payload.gameType,
      mode: payload.mode,
      loadedFocus: payload.loadedFocus,
      contextPreview: [
        payload.gradeBand ? "Grade " + payload.gradeBand : "",
        payload.subject,
        payload.curriculum,
        payload.unit,
        payload.lesson
      ].filter(Boolean).join(" "),
      targetSkills: Array.isArray(payload.targetSkills) ? payload.targetSkills.slice(0, 4) : [],
      accommodations: Array.isArray(payload.accommodations) ? payload.accommodations.slice(0, 4) : []
    };
  }

  return {
    buildGameContext: buildGameContext,
    injectGameContext: injectGameContext,
    getRecommendedGameContent: getRecommendedGameContent
  };
});
