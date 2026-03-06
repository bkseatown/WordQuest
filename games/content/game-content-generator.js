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
    return {
      id: "generated-" + gameType + "-" + Date.now(),
      source: "placeholder-adapter",
      prompt: "Prototype content for " + gameType + " aligned to " + titleBits.join(" · "),
      answer: titleBits[0] || "core concept",
      clues: [
        "Generated clue set placeholder.",
        "Replace this adapter with an AI-backed generator later.",
        "Lesson context is already passed through safely."
      ],
      accepted: [String(input.vocabularyFocus || "focus"), String(subject).toLowerCase()],
      tiles: ["academic", "language", "placeholder"],
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
