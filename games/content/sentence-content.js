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
      id: "sentence-k1",
      gradeBands: ["K-2"],
      subjects: ["ELA", "Writing"],
      prompt: "Build the sentence using because.",
      requiredToken: "because",
      tiles: ["i", "ran", "because", "the", "bell", "rang"],
      solution: ["i", "ran", "because", "the", "bell", "rang"],
      scaffold: "Start with who, then the action, then the reason."
    },
    {
      id: "sentence-k2",
      gradeBands: ["K-2", "3-5"],
      subjects: ["Math", "Writing"],
      prompt: "Build the compare sentence using more.",
      requiredToken: "more",
      tiles: ["this", "group", "has", "more", "cubes"],
      solution: ["this", "group", "has", "more", "cubes"],
      scaffold: "Say which group, then tell what is true about it."
    },
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
    },
    {
      id: "sentence-4",
      gradeBands: ["K-2", "3-5"],
      subjects: ["ELA", "Intervention"],
      prompt: "Build the sentence with the suffix word.",
      requiredToken: "jumped",
      tiles: ["the", "frog", "jumped", "over", "the", "log"],
      solution: ["the", "frog", "jumped", "over", "the", "log"],
      scaffold: "Read the whole sentence once, then check the past-tense ending."
    },
    {
      id: "sentence-5",
      gradeBands: ["3-5", "6-8"],
      subjects: ["Writing", "Science"],
      prompt: "Build the sentence using the evidence frame.",
      requiredToken: "shows",
      tiles: ["this", "evidence", "shows", "the", "plant", "needs", "light"],
      solution: ["this", "evidence", "shows", "the", "plant", "needs", "light"],
      scaffold: "Start with the evidence phrase, then say what it proves."
    }
  ];
});
