(function categoryContentModule(root, factory) {
  if (typeof module === "object" && module.exports) {
    module.exports = factory();
    return;
  }
  root.CSCategoryContent = factory();
})(typeof globalThis !== "undefined" ? globalThis : window, function createCategoryContent() {
  "use strict";

  return [
    {
      id: "category-k1",
      gradeBands: ["K-2"],
      subjects: ["ELA"],
      prompt: "Name words that rhyme with cat or hat.",
      accepted: ["bat", "cat", "hat", "mat", "rat", "sat"],
      category: "Rhyming words"
    },
    {
      id: "category-k2",
      gradeBands: ["K-2"],
      subjects: ["Math"],
      prompt: "List math words you use when comparing groups or amounts.",
      accepted: ["more", "less", "equal", "same", "compare", "group"],
      category: "Compare words"
    },
    {
      id: "category-1",
      gradeBands: ["3-5", "6-8"],
      subjects: ["ELA"],
      prompt: "List transition words that strengthen explanatory writing.",
      accepted: ["however", "therefore", "for example", "in addition", "meanwhile", "because"],
      category: "Transitions"
    },
    {
      id: "category-2",
      gradeBands: ["3-5", "6-8"],
      subjects: ["Science"],
      prompt: "Name states of matter or properties connected to matter.",
      accepted: ["solid", "liquid", "gas", "mass", "volume", "density"],
      category: "Science concepts"
    },
    {
      id: "category-3",
      gradeBands: ["3-5", "6-8", "9-12"],
      subjects: ["Math"],
      prompt: "List words tied to multiplication strategies.",
      accepted: ["groups", "array", "factor", "product", "times", "equal"],
      category: "Math language"
    },
    {
      id: "category-4",
      gradeBands: ["K-2", "3-5"],
      subjects: ["ELA", "Intervention"],
      prompt: "List words with the suffix -ing or -ed.",
      accepted: ["jumping", "jumped", "playing", "played", "looking", "looked"],
      category: "Suffix words"
    },
    {
      id: "category-5",
      gradeBands: ["3-5", "6-8"],
      subjects: ["Writing", "ELA"],
      prompt: "List words that help justify or explain thinking.",
      accepted: ["because", "therefore", "evidence", "reason", "supports", "shows"],
      category: "Explanation language"
    }
  ];
});
