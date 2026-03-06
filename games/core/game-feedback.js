(function gameFeedbackModule(root, factory) {
  if (typeof module === "object" && module.exports) {
    module.exports = factory();
    return;
  }
  root.CSGameFeedback = factory();
})(typeof globalThis !== "undefined" ? globalThis : window, function createGameFeedback() {
  "use strict";

  function build(type, message, extras) {
    return Object.assign({
      type: String(type || "reveal"),
      label: String(message || "")
    }, extras || {});
  }

  function fromResult(result) {
    var row = result && typeof result === "object" ? result : {};
    if (row.teacherOverride) {
      return build("teacher-override", row.message || "Teacher marked the round complete.", { tone: "calm" });
    }
    if (row.correct) {
      return build("correct", row.message || "Correct. Keep the streak moving.", { tone: "positive" });
    }
    if (row.nearMiss) {
      return build("near-miss", row.message || "Close. Tighten one part and try the next round.", { tone: "warning" });
    }
    if (row.roundComplete) {
      return build("round-complete", row.message || "Round complete.", { tone: "neutral" });
    }
    return build("reveal", row.message || "New round ready.", { tone: "neutral" });
  }

  return {
    build: build,
    fromResult: fromResult
  };
});
