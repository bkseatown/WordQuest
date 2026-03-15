(function gameContentGeneratorModule(root, factory) {
  if (typeof module === "object" && module.exports) {
    module.exports = factory();
    return;
  }
  root.CSGameContentGenerator = factory();
})(typeof globalThis !== "undefined" ? globalThis : window, function createGameContentGenerator() {
  "use strict";

  function normalizeSubject(value) {
    var subject = String(value || "").trim();
    return subject || "ELA";
  }

  function generateGameContent(options) {
    var input = options && typeof options === "object" ? options : {};
    var subject = normalizeSubject(input.subject);
    var gameType = String(input.gameType || "concept-ladder");
    var lessonContext = input.lessonContext && typeof input.lessonContext === "object" ? input.lessonContext : {};
    var titleBits = [
      lessonContext.title || lessonContext.conceptFocus || input.vocabularyFocus || subject,
      input.gradeBand || "3-5"
    ].filter(Boolean);
    if (gameType === "morphology-builder") {
      return {
        id: "generated-morphology-builder-" + Date.now(),
        source: "fallback-adapter",
        prompt: "Build the word review.",
        tiles: ["re", "view", "play", "ing"],
        solution: ["re", "view"],
        meaningHint: "'re-' means again, so the word means to look at something again.",
        lessonContext: {
          title: lessonContext.title || "",
          subject: subject
        }
      };
    }
    return {
      id: "generated-" + gameType + "-" + Date.now(),
      source: "fallback-adapter",
      prompt: "Use the current " + gameType.replace(/-/g, " ") + " warm-up aligned to " + titleBits.join(" · "),
      answer: titleBits[0] || "core concept",
      clues: [
        "Use the current lesson language.",
        "Keep the response short and academic.",
        "Match the task to the current class focus."
      ],
      accepted: [String(input.vocabularyFocus || "focus"), String(subject).toLowerCase()],
      tiles: ["academic", "language", "focus"],
      lessonContext: {
        title: lessonContext.title || "",
        subject: subject
      }
    };
  }

  return {
    generateGameContent: generateGameContent
  };
});
