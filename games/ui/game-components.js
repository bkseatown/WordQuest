(function gameComponentsModule(root, factory) {
  if (typeof module === "object" && module.exports) {
    module.exports = factory();
    return;
  }
  root.CSGameComponents = factory();
})(typeof globalThis !== "undefined" ? globalThis : window, function createGameComponents() {
  "use strict";

  var ICONS = Object.freeze({
    "word-quest": "word-quest",
    "word-connections": "word-connections",
    "morphology-builder": "morphology-builder",
    "concept-ladder": "concept-ladder",
    "error-detective": "error-detective",
    "rapid-category": "rapid-category",
    "sentence-builder": "sentence-builder",
    score: "score",
    timer: "timer",
    streak: "streak",
    progress: "progress",
    hint: "hint",
    context: "context",
    teacher: "teacher",
    projector: "projector"
  });

  function spriteHref(id) {
    return "./games/ui/game-icons.svg#cg-icon-" + String(id || "word-quest");
  }

  function iconFor(id, className) {
    var key = ICONS[id] || ICONS["word-quest"];
    return [
      '<svg class="' + escapeHtml(className || "cg-icon") + '" viewBox="0 0 24 24" aria-hidden="true" focusable="false">',
      '  <use href="' + escapeHtml(spriteHref(key)) + '"></use>',
      "</svg>"
    ].join("");
  }

  function escapeHtml(value) {
    return String(value || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function renderGameCard(game, active) {
    return [
      '<button class="cg-game-card' + (active ? " is-active" : "") + '" data-game-id="' + escapeHtml(game.id) + '" type="button">',
      '  <div class="cg-game-card-head">',
      '    <span class="cg-game-icon">' + iconFor(game.id, "cg-icon cg-icon--game") + "</span>",
      '    <span class="cg-chip">' + escapeHtml(game.modeLabel) + "</span>",
      "  </div>",
      '  <h3>' + escapeHtml(game.title) + "</h3>",
      '  <p>' + escapeHtml(game.subtitle) + "</p>",
      '  <div class="cg-inline-row">' + (game.tags || []).map(function (tag) {
        return '<span class="cg-chip">' + escapeHtml(tag) + "</span>";
      }).join("") + "</div>",
      "</button>"
    ].join("");
  }

  return {
    iconFor: iconFor,
    escapeHtml: escapeHtml,
    renderGameCard: renderGameCard
  };
});
