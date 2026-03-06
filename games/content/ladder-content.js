(function ladderContentModule(root, factory) {
  if (typeof module === "object" && module.exports) {
    module.exports = factory();
    return;
  }
  root.CSLadderContent = factory();
})(typeof globalThis !== "undefined" ? globalThis : window, function createLadderContent() {
  "use strict";

  return [
    {
      id: "ladder-1",
      gradeBands: ["3-5", "6-8"],
      subjects: ["ELA"],
      prompt: "Solve the literacy concept before the final clue.",
      answer: "main idea",
      options: ["summary", "main idea", "inference", "theme"],
      clues: [
        "It is usually one sentence, not every detail.",
        "Strong readers can state it after reading a paragraph or section.",
        "It answers, 'What is mostly being said here?'"
      ]
    },
    {
      id: "ladder-2",
      gradeBands: ["3-5", "6-8"],
      subjects: ["Math"],
      prompt: "Name the math concept from the clues.",
      answer: "equivalent fractions",
      options: ["place value", "equivalent fractions", "area model", "ratio table"],
      clues: [
        "The amounts do not change even when the numbers look different.",
        "You can find them by multiplying numerator and denominator by the same number.",
        "One-half and two-fourths are examples."
      ]
    },
    {
      id: "ladder-3",
      gradeBands: ["6-8", "9-12"],
      subjects: ["Science"],
      prompt: "Identify the concept from the reveal ladder.",
      answer: "photosynthesis",
      options: ["evaporation", "photosynthesis", "respiration", "condensation"],
      clues: [
        "It happens in plant cells.",
        "Light energy is involved.",
        "Glucose is produced."
      ]
    }
  ];
});
