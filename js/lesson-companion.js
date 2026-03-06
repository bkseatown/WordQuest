(function lessonCompanionModule(root, factory) {
  if (typeof module === "object" && module.exports) {
    module.exports = factory(require("./teacher-context/context-engine"));
    return;
  }
  root.CSLessonCompanion = factory(root.CSTeacherContextEngine);
})(typeof globalThis !== "undefined" ? globalThis : window, function createLessonCompanionFactory(ContextEngine) {
  "use strict";

  function escapeHtml(value) {
    return String(value == null ? "" : value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  function listMarkup(items, className) {
    var rows = Array.isArray(items) && items.length ? items : ["Support guidance is forming from available lesson context."];
    return '<ul class="' + className + '">' + rows.map(function (item) {
      return "<li>" + escapeHtml(item) + "</li>";
    }).join("") + "</ul>";
  }

  function getLessonCompanion(context, deps) {
    var derived = ContextEngine && typeof ContextEngine.deriveContext === "function"
      ? ContextEngine.deriveContext(context, deps)
      : {};
    return {
      title: "Lesson Mission Panel",
      subject: derived.subject || "",
      curriculum: derived.curriculum || "",
      unit: derived.unit || "",
      lesson: derived.lesson || "",
      mainConcept: derived.mainConcept || "Lesson focus not fully mapped yet.",
      languageDemands: Array.isArray(derived.languageDemands) && derived.languageDemands.length
        ? derived.languageDemands
        : ["explain", "compare", "justify"],
      misconceptions: Array.isArray(derived.misconceptions) && derived.misconceptions.length
        ? derived.misconceptions
        : ["Common misconceptions will appear here as lesson mapping improves."],
      supportMoves: Array.isArray(derived.recommendedMoves) && derived.recommendedMoves.length
        ? derived.recommendedMoves
        : ["Use a visual model and one worked example before release."],
      flexibleGroups: Array.isArray(derived.flexibleGroups) && derived.flexibleGroups.length
        ? derived.flexibleGroups
        : [{ label: "Suggested Group", focus: "Teacher observation check", students: [] }],
      context: derived
    };
  }

  function renderLessonCompanion(container, companionData) {
    if (!container || typeof container.innerHTML !== "string") return null;
    var data = companionData && typeof companionData === "object" ? companionData : {};
    var groups = Array.isArray(data.flexibleGroups) ? data.flexibleGroups : [];
    container.innerHTML = [
      '<section class="lesson-companion" data-companion="lesson">',
      '  <header class="lesson-companion__head">',
      '    <p class="lesson-companion__eyebrow">Smart Lesson Companion</p>',
      '    <h2 class="lesson-companion__title">' + escapeHtml(data.mainConcept || "Lesson focus not fully mapped yet.") + "</h2>",
      '  </header>',
      '  <div class="lesson-companion__grid">',
      '    <article class="lesson-companion__card">',
      '      <h3>Main Concept</h3>',
      '      <p>' + escapeHtml(data.mainConcept || "Lesson focus not fully mapped yet.") + "</p>",
      "    </article>",
      '    <article class="lesson-companion__card">',
      '      <h3>Language Demands</h3>',
      '      <div class="lesson-companion__chips">' + (data.languageDemands || []).map(function (item) {
        return '<span class="lesson-companion__chip">' + escapeHtml(item) + "</span>";
      }).join("") + "</div>",
      "    </article>",
      '    <article class="lesson-companion__card">',
      '      <h3>Common Misconceptions</h3>',
           listMarkup(data.misconceptions, "lesson-companion__list"),
      "    </article>",
      '    <article class="lesson-companion__card">',
      '      <h3>Suggested Support Moves</h3>',
           listMarkup(data.supportMoves, "lesson-companion__list"),
      "    </article>",
      '    <article class="lesson-companion__card">',
      '      <h3>Flexible Groups</h3>',
      '      <div class="lesson-companion__groups">' + groups.map(function (group) {
        return [
          '<div class="lesson-companion__group">',
          '  <strong>' + escapeHtml(group.label || "Suggested Group") + "</strong>",
          '  <p>' + escapeHtml(group.focus || "Teacher observation check") + "</p>",
          '  <p>' + escapeHtml((group.students || []).join(", ") || "Use live observation to confirm group membership.") + "</p>",
          "</div>"
        ].join("");
      }).join("") + "</div>",
      "    </article>",
      "  </div>",
      "</section>"
    ].join("");
    return container;
  }

  return {
    getLessonCompanion: getLessonCompanion,
    renderLessonCompanion: renderLessonCompanion
  };
});
