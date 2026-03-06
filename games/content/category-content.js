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
    }
  ];
});
