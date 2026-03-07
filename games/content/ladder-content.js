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
      id: "ladder-k1",
      gradeBands: ["K-2"],
      subjects: ["ELA"],
      prompt: "Name the reading idea from the clues.",
      answer: "rhyme",
      options: ["rhyme", "sentence", "question", "picture"],
      clues: [
        "The ending sound matches.",
        "Cat and hat are an example.",
        "You can hear it in many poems and songs."
      ]
    },
    {
      id: "ladder-k2",
      gradeBands: ["K-2"],
      subjects: ["Math"],
      prompt: "Name the math idea from the clues.",
      answer: "equal",
      options: ["equal", "minus", "measure", "pattern"],
      clues: [
        "Both sides have the same amount.",
        "A balance scale can show it.",
        "Two groups match exactly."
      ]
    },
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
    },
    {
      id: "ladder-4",
      gradeBands: ["3-5", "6-8"],
      subjects: ["Math"],
      prompt: "Name the fraction idea from the ladder.",
      answer: "number line",
      options: ["array", "number line", "angle", "equation"],
      clues: [
        "It helps show where a value lives between whole numbers.",
        "Fractions can be placed on it using equal intervals.",
        "You can use it to compare 1/4, 1/2, and 3/4."
      ]
    },
    {
      id: "ladder-5",
      gradeBands: ["3-5", "6-8"],
      subjects: ["ELA", "Writing"],
      prompt: "Name the writing move from the ladder.",
      answer: "evidence",
      options: ["theme", "opinion", "evidence", "caption"],
      clues: [
        "It supports a claim instead of replacing it.",
        "Strong writers point to a quotation, fact, or example.",
        "A sentence frame might begin with: This shows that..."
      ]
    }
  ];
});
