(function workspaceHistoryModule(root, factory) {
  if (typeof module === "object" && module.exports) {
    module.exports = factory();
    return;
  }
  root.CSWorkspaceHistory = factory();
})(typeof globalThis !== "undefined" ? globalThis : window, function createWorkspaceHistory() {
  "use strict";

  function summarizeSession(row) {
    if (!row) {
      return {
        title: "No recent quick check yet",
        meta: "Run a 90-second Word Quest quick check to generate signals."
      };
    }
    var sig = row.signals || {};
    var out = row.outcomes || {};
    var hints = [];
    if (Number(sig.vowelSwapCount || 0) >= 3) hints.push("Vowel swaps high");
    if (Number(sig.repeatSameBadSlotCount || 0) >= 2) hints.push("Repeated same slot");
    if (!hints.length) hints.push("Signals stable");
    return {
      title: (out.solved ? "Solved" : "Not solved yet") + " · " + (out.attemptsUsed || sig.guessCount || 0) + " attempts",
      meta: hints.join(" · ") + " · Next: guided quick check"
    };
  }

  return {
    summarizeSession: summarizeSession
  };
});
