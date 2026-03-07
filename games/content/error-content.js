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
      id: "error-k1",
      gradeBands: ["K-2"],
      subjects: ["ELA"],
      misconception: "sentence meaning",
      incorrectExample: "The cat ran. That means the cat was sleeping.",
      prompt: "Which fix makes the sentence make sense?",
      answer: "The cat ran means the cat was moving fast.",
      options: [
        "The cat ran means the cat was moving fast.",
        "Ran means the cat was sleeping.",
        "Cat means the sentence is about a dog."
      ]
    },
    {
      id: "error-k2",
      gradeBands: ["K-2"],
      subjects: ["Math"],
      misconception: "equal groups",
      incorrectExample: "4 and 4 are not equal because there are two numbers.",
      prompt: "Choose the fix that repairs the idea.",
      answer: "4 and 4 are equal because both sides show the same amount.",
      options: [
        "4 and 4 are equal because both sides show the same amount.",
        "4 and 4 are not equal because they are next to each other.",
        "Only bigger numbers can be equal."
      ]
    },
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
    },
    {
      id: "error-4",
      gradeBands: ["3-5", "6-8"],
      subjects: ["Writing", "ELA"],
      misconception: "evidence vs opinion",
      incorrectExample: "My claim is strong because I really like it.",
      prompt: "Which correction strengthens the reasoning?",
      answer: "A strong claim needs evidence from the text, not just a personal feeling.",
      options: [
        "A strong claim needs evidence from the text, not just a personal feeling.",
        "Claims are better when they sound confident, even without support.",
        "Opinion and evidence mean the same thing in writing."
      ]
    },
    {
      id: "error-5",
      gradeBands: ["K-2", "3-5"],
      subjects: ["ELA", "Intervention"],
      misconception: "suffix meaning",
      incorrectExample: "Jumped means the action will happen tomorrow.",
      prompt: "Choose the fix that repairs the word meaning.",
      answer: "Jumped tells that the action already happened.",
      options: [
        "Jumped tells that the action already happened.",
        "Jumped means jump is the person's name.",
        "The suffix never changes the meaning of a word."
      ]
    }
  ];
});
