(function sentenceContentModule(root, factory) {
  if (typeof module === "object" && module.exports) {
    module.exports = factory();
    return;
  }
  root.CSSentenceContent = factory();
})(typeof globalThis !== "undefined" ? globalThis : window, function createSentenceContent() {
  "use strict";

  return [
    {
      id: "sentence-1",
      gradeBands: ["3-5", "6-8"],
      subjects: ["Writing", "ELA"],
      prompt: "Build a sentence that uses the transition correctly.",
      requiredToken: "therefore",
      tiles: ["therefore", "the", "character", "changed", "his", "plan"],
      solution: ["therefore", "the", "character", "changed", "his", "plan"],
      scaffold: "EAL support: begin with the transition, then subject + verb + object."
    },
    {
      id: "sentence-2",
      gradeBands: ["6-8", "9-12"],
      subjects: ["Science", "Writing"],
      prompt: "Build the academic sentence with the target vocabulary.",
      requiredToken: "evidence",
      tiles: ["the", "evidence", "supports", "the", "claim"],
      solution: ["the", "evidence", "supports", "the", "claim"],
      scaffold: "Academic move: noun phrase + verb + claim."
    },
    {
      id: "sentence-3",
      gradeBands: ["3-5", "6-8"],
      subjects: ["Math", "Writing"],
      prompt: "Build the explanation sentence using a conjunction.",
      requiredToken: "because",
      tiles: ["the", "fraction", "is", "larger", "because", "the", "parts", "are", "greater"],
      solution: ["the", "fraction", "is", "larger", "because", "the", "parts", "are", "greater"],
      scaffold: "Explain the reason after the conjunction."
    }
  ];
});
