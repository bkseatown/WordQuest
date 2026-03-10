(function typingPlacementContentModule(root, factory) {
  if (typeof module === "object" && module.exports) {
    module.exports = factory();
    return;
  }
  root.CSTypingPlacementContent = factory();
})(typeof globalThis !== "undefined" ? globalThis : window, function createTypingPlacementContent() {
  "use strict";

  return [
    {
      id: "typing-placement-1",
      lessonOrder: 1,
      unitLabel: "Placement",
      lessonLabel: "Check 1",
      stageLabel: "Home anchors",
      prompt: "Type the anchor pattern.",
      target: "fjfj",
      typingKind: "keys",
      keyboardZone: "home row anchors",
      orthographyFocus: "finger placement · f / j",
      fingerCue: "Find the F and J bumps first, then type the pattern without looking down.",
      meaningHint: "This check looks for stable home-row anchor control before full words begin.",
      swbat: "I can find F and J and type the anchor pattern accurately.",
      masteryGoalWpm: 8,
      masteryGoalAccuracy: 95
    },
    {
      id: "typing-placement-2",
      lessonOrder: 2,
      unitLabel: "Placement",
      lessonLabel: "Check 2",
      stageLabel: "Home row sweep",
      prompt: "Type the home-row sequence.",
      target: "asdf jkl;",
      typingKind: "keys",
      keyboardZone: "full home row",
      orthographyFocus: "home row automaticity",
      fingerCue: "Keep your fingers on their home-row jobs and let the space separate the two halves.",
      meaningHint: "This check looks for steady home-row movement before top or bottom row reach.",
      swbat: "I can move across the home row with control and spacing.",
      masteryGoalWpm: 10,
      masteryGoalAccuracy: 95
    },
    {
      id: "typing-placement-3",
      lessonOrder: 3,
      unitLabel: "Placement",
      lessonLabel: "Check 3",
      stageLabel: "Short-a phrase",
      prompt: "Type the decodable phrase.",
      target: "sad dad",
      typingKind: "phrase",
      keyboardZone: "home row + space bar",
      orthographyFocus: "CVC phrase · short a",
      fingerCue: "Read the whole phrase first, then type both words with one clean space in between.",
      meaningHint: "This check looks for early decodable-word fluency on a keyboard.",
      swbat: "I can type a short decodable phrase with accurate spacing.",
      masteryGoalWpm: 12,
      masteryGoalAccuracy: 96
    },
    {
      id: "typing-placement-4",
      lessonOrder: 4,
      unitLabel: "Placement",
      lessonLabel: "Check 4",
      stageLabel: "Top-row phrase",
      prompt: "Type the top-row phrase.",
      target: "it is",
      typingKind: "phrase",
      keyboardZone: "home row + top row + space bar",
      orthographyFocus: "high-frequency phrase",
      fingerCue: "Keep your hands at home row and make only small reaches up to the top row.",
      meaningHint: "This check looks for readiness to move from home row into early top-row words.",
      swbat: "I can type a short top-row phrase with spacing and rhythm.",
      masteryGoalWpm: 14,
      masteryGoalAccuracy: 96
    }
  ];
});
