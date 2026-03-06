(function errorContentModule(root, factory) {
  if (typeof module === "object" && module.exports) {
    module.exports = factory();
    return;
  }
  root.CSErrorContent = factory();
})(typeof globalThis !== "undefined" ? globalThis : window, function createErrorContent() {
  "use strict";

  return [
    {
      id: "error-1",
      gradeBands: ["3-5", "6-8"],
      subjects: ["ELA"],
      misconception: "context clues",
      incorrectExample: "The author says the storm was gentle because it destroyed every tree.",
      prompt: "What is the best correction?",
      answer: "The word gentle conflicts with the evidence; the storm was destructive.",
      options: [
        "The sentence is correct because storms can be gentle.",
        "The word gentle conflicts with the evidence; the storm was destructive.",
        "Destroy means the trees were healthy.",
        "The author should remove every tree."
      ]
    },
    {
      id: "error-2",
      gradeBands: ["3-5", "6-8"],
      subjects: ["Math"],
      misconception: "fraction comparison",
      incorrectExample: "3/8 is greater than 1/2 because 8 is larger than 2.",
      prompt: "Choose the correction that fixes the misconception.",
      answer: "A larger denominator can mean smaller parts, so 3/8 is less than 1/2.",
      options: [
        "A larger denominator can mean smaller parts, so 3/8 is less than 1/2.",
        "3/8 is greater because 3 is odd.",
        "1/2 is always the smallest fraction.",
        "Denominators do not matter in fraction comparison."
      ]
    },
    {
      id: "error-3",
      gradeBands: ["6-8", "9-12"],
      subjects: ["Math", "Science"],
      misconception: "equation solving",
      incorrectExample: "To solve 3x + 5 = 20, divide 20 by 3 and then add 5.",
      prompt: "Which correction shows the right process?",
      answer: "Subtract 5 first, then divide both sides by 3.",
      options: [
        "Add 5 to both sides, then divide both sides by 20.",
        "Subtract 5 first, then divide both sides by 3.",
        "Multiply both sides by 3 first.",
        "There is no way to solve for x."
      ]
    }
  ];
});
