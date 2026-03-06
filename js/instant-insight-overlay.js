(function instantInsightOverlayModule(root, factory) {
  if (typeof module === "object" && module.exports) {
    module.exports = factory(require("./teacher-context/context-engine"));
    return;
  }
  root.CSInstantInsightOverlay = factory(root.CSTeacherContextEngine);
})(typeof globalThis !== "undefined" ? globalThis : window, function createInstantInsightOverlayFactory(ContextEngine) {
  "use strict";

  function escapeHtml(value) {
    return String(value == null ? "" : value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  function getInstantInsight(context, deps) {
    var derived = ContextEngine && typeof ContextEngine.deriveContext === "function"
      ? ContextEngine.deriveContext(context, deps)
      : {};
    var student = Array.isArray(derived.students) && derived.students.length ? derived.students[0] : null;
    var keyMoves = student && Array.isArray(student.keyMovesToday) && student.keyMovesToday.length
      ? student.keyMovesToday
      : (derived.recommendedMoves || []);
    return {
      title: "What matters today",
      primaryFocus: derived.mainConcept || derived.lessonFocus || "Priority still forming from available data.",
      supportPriority: student ? student.supportPriority : ((derived.supportPriorities || [])[0] || "Support priority still forming"),
      relatedSupport: student ? (student.relatedSupport || []) : [],
      goalLine: student ? student.primaryGoal : (derived.targetSkills || [])[0] || "Goal focus not fully mapped yet.",
      accommodations: student ? (student.accommodations || []) : (derived.accommodations || []),
      insightBullets: keyMoves.length ? keyMoves.slice(0, 4) : ["Use class discussion support and visual scaffolds."],
      trendSummary: student && student.trendSummary
        ? student.trendSummary
        : { label: "Steady", delta: "+0%", confidence: 0.5 },
      prioritySignal: derived.prioritySignal || null,
      context: derived
    };
  }

  function renderInstantInsightOverlay(container, insightData) {
    if (!container || typeof container.innerHTML !== "string") return null;
    var data = insightData && typeof insightData === "object" ? insightData : {};
    container.innerHTML = [
      '<section class="instant-insight-overlay" data-companion="instant-insight">',
      '  <header class="instant-insight-overlay__head">',
      '    <p class="instant-insight-overlay__eyebrow">' + escapeHtml(data.title || "What matters today") + "</p>",
      '    <h2 class="instant-insight-overlay__focus">' + escapeHtml(data.primaryFocus || "Priority still forming from available data.") + "</h2>",
      "  </header>",
      '  <div class="instant-insight-overlay__row">',
      '    <div class="instant-insight-overlay__band"><span>Support Priority</span><strong>' + escapeHtml(data.supportPriority || "Support priority still forming") + "</strong></div>",
      '    <div class="instant-insight-overlay__band"><span>Goal Line</span><strong>' + escapeHtml(data.goalLine || "Goal focus not fully mapped yet.") + "</strong></div>",
      "  </div>",
      '  <div class="instant-insight-overlay__chips">' + (data.accommodations || []).map(function (item) {
        return '<span class="instant-insight-overlay__chip">' + escapeHtml(item) + "</span>";
      }).join("") + ((data.relatedSupport || []).map(function (item) {
        return '<span class="instant-insight-overlay__chip is-related">' + escapeHtml(item) + "</span>";
      }).join("")) + "</div>",
      '  <ul class="instant-insight-overlay__moves">' + (data.insightBullets || []).map(function (item) {
        return "<li>" + escapeHtml(item) + "</li>";
      }).join("") + "</ul>",
      '  <footer class="instant-insight-overlay__trend">',
      '    <strong>' + escapeHtml((data.trendSummary && data.trendSummary.label) || "Steady") + "</strong>",
      '    <span>' + escapeHtml((data.trendSummary && data.trendSummary.delta) || "+0%") + "</span>",
      '    <span>' + escapeHtml(Math.round(Number((data.trendSummary && data.trendSummary.confidence) || 0.5) * 100) + "% confidence") + "</span>",
      "  </footer>",
      "</section>"
    ].join("");
    return container;
  }

  return {
    getInstantInsight: getInstantInsight,
    renderInstantInsightOverlay: renderInstantInsightOverlay
  };
});
