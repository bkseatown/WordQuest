(function gameComponentsModule(root, factory) {
  if (typeof module === "object" && module.exports) {
    module.exports = factory();
    return;
  }
  root.CSGameComponents = factory();
})(typeof globalThis !== "undefined" ? globalThis : window, function createGameComponents() {
  "use strict";

  var ICONS = Object.freeze({
    "word-quest": '<svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true"><path fill="currentColor" d="M6 4h12l-1 14-5 2-5-2L6 4Zm3.3 3.2v2.1h5.3V7.2H9.3Zm0 4v2.2h5.3v-2.2H9.3Z"/></svg>',
    "word-connections": '<svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true"><path fill="currentColor" d="M6.5 7a3.5 3.5 0 1 1 2.8 5.6H8v2.8h5.8v-1.2a3.5 3.5 0 1 1 2.2 0V17H8a2 2 0 0 1-2-2v-2.4A3.5 3.5 0 0 1 6.5 7Z"/></svg>',
    "morphology-builder": '<svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true"><path fill="currentColor" d="M4 6h6v4H4V6Zm10 0h6v4h-6V6ZM4 14h10v4H4v-4Zm12 0h4v4h-4v-4Z"/></svg>',
    "concept-ladder": '<svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true"><path fill="currentColor" d="M5 18h14v2H5v-2Zm2-4h10v2H7v-2Zm2-4h6v2H9v-2Zm2-4h2v2h-2V6Z"/></svg>',
    "error-detective": '<svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true"><path fill="currentColor" d="m10 4 8 8-1.4 1.4-2-2V18H7v-2h5.6v-6.6l-4-4L10 4ZM4 18h2v2H4v-2Z"/></svg>',
    "rapid-category": '<svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true"><path fill="currentColor" d="M12 2a10 10 0 1 0 10 10A10 10 0 0 0 12 2Zm1 5v5.2l3.2 1.9-1 1.7L11 13V7Z"/></svg>',
    "sentence-builder": '<svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true"><path fill="currentColor" d="M4 6h16v3H4V6Zm0 5h10v3H4v-3Zm0 5h16v3H4v-3Z"/></svg>'
  });

  function iconFor(id) {
    return ICONS[id] || ICONS["word-quest"];
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
      '    <span class="cg-brand-mark" style="width:42px;height:42px;border-radius:14px;">' + iconFor(game.id) + "</span>",
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
