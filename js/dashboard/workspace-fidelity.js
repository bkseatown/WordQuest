(function workspaceFidelityModule(root, factory) {
  if (typeof module === "object" && module.exports) {
    module.exports = factory();
    return;
  }
  root.CSWorkspaceFidelity = factory();
})(typeof globalThis !== "undefined" ? globalThis : window, function createWorkspaceFidelity() {
  "use strict";

  function summarize(input) {
    var summary = input && input.fidelitySummary ? input.fidelitySummary : {};
    var fidelityPct = Math.round(Number(input && input.fidelityPercent || summary.fidelityPercent || 0));
    var totalSessions = Math.max(0, Math.round(Number(summary.totalSessions || 0)));
    var levelClass = fidelityPct >= 80 ? "fidelity-good" : (fidelityPct >= 60 ? "fidelity-mid" : "fidelity-low");
    var confidenceState = fidelityPct >= 70 ? "active" : "watch";
    return {
      fidelityPct: fidelityPct,
      totalSessions: totalSessions,
      line: "Fidelity: " + fidelityPct + "% over " + totalSessions + " sessions",
      levelClass: levelClass,
      confidenceState: confidenceState
    };
  }

  return {
    summarize: summarize
  };
});
