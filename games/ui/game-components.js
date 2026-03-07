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
    "word-typing": "word-quest",
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

  function renderPreview(gameId) {
    if (gameId === "word-quest") {
      return [
        '<div class="cg-card-preview" aria-hidden="true">',
        '  <div class="cg-mini-board">',
        '    <div class="cg-mini-row">',
        '      <span class="cg-mini-letter cg-mini-letter--correct">W</span>',
        '      <span class="cg-mini-letter cg-mini-letter--present">O</span>',
        '      <span class="cg-mini-letter">R</span>',
        '      <span class="cg-mini-letter cg-mini-letter--correct">D</span>',
        '      <span class="cg-mini-letter">S</span>',
        '    </div>',
        '    <div class="cg-mini-row cg-mini-row--dim">',
        '      <span class="cg-mini-letter">Q</span>',
        '      <span class="cg-mini-letter cg-mini-letter--present">U</span>',
        '      <span class="cg-mini-letter">E</span>',
        '      <span class="cg-mini-letter cg-mini-letter--correct">S</span>',
        '      <span class="cg-mini-letter">T</span>',
        '    </div>',
        '  </div>',
        '</div>'
      ].join("");
    }
    if (gameId === "word-connections") {
      return [
        '<div class="cg-card-preview" aria-hidden="true">',
        '  <div class="cg-mini-taboo">',
        '    <div class="cg-mini-taboo-target">CLUE "EVIDENCE"</div>',
        '    <ul class="cg-mini-taboo-list">',
        '      <li>proof</li>',
        '      <li>fact</li>',
        '      <li>show</li>',
        '    </ul>',
        '  </div>',
        '</div>'
      ].join("");
    }
    if (gameId === "morphology-builder") {
      return [
        '<div class="cg-card-preview" aria-hidden="true">',
        '  <div class="cg-mini-morph">',
        '    <span class="cg-mini-part cg-mini-part--prefix">re</span>',
        '    <span class="cg-mini-join">+</span>',
        '    <span class="cg-mini-part cg-mini-part--root">view</span>',
        '    <span class="cg-mini-join">=</span>',
        '    <span class="cg-mini-part cg-mini-part--root">review</span>',
        '  </div>',
        '</div>'
      ].join("");
    }
    if (gameId === "concept-ladder") {
      return [
        '<div class="cg-card-preview" aria-hidden="true">',
        '  <div class="cg-mini-ladder">',
        '    <div class="cg-mini-rung cg-mini-rung--active">number line clue</div>',
        '    <div class="cg-mini-rung">fraction clue</div>',
        '    <div class="cg-mini-rung cg-mini-rung--locked">final reveal</div>',
        '  </div>',
        '</div>'
      ].join("");
    }
    if (gameId === "error-detective") {
      return [
        '<div class="cg-card-preview" aria-hidden="true">',
        '  <div class="cg-mini-detective">',
        '    <p class="cg-mini-error">"Bigger denominator means bigger fraction."</p>',
        '    <p class="cg-mini-fix">Check value, not just denominator size.</p>',
        '  </div>',
        '</div>'
      ].join("");
    }
    if (gameId === "rapid-category") {
      return [
        '<div class="cg-card-preview" aria-hidden="true">',
        '  <div class="cg-mini-rapid">',
        '    <div class="cg-mini-category-label">Words for compare</div>',
        '    <div class="cg-mini-words">',
        '      <span class="cg-mini-word-chip">ratio</span>',
        '      <span class="cg-mini-word-chip cg-mini-word-chip--pulse">fraction</span>',
        '      <span class="cg-mini-word-chip">compare</span>',
        '    </div>',
        '  </div>',
        '</div>'
      ].join("");
    }
    if (gameId === "sentence-builder") {
      return [
        '<div class="cg-card-preview" aria-hidden="true">',
        '  <div class="cg-mini-sentence-builder">',
        '    <span class="cg-mini-piece">because</span>',
        '    <span class="cg-mini-piece">the</span>',
        '    <span class="cg-mini-piece cg-mini-piece--blank">fraction</span>',
        '    <span class="cg-mini-piece">is larger</span>',
        '  </div>',
        '</div>'
      ].join("");
    }
    if (gameId === "word-typing") {
      return [
        '<div class="cg-card-preview" aria-hidden="true">',
        '  <div class="cg-mini-typing">',
        '    <div class="cg-mini-typing-word">said</div>',
        '    <div class="cg-mini-typing-track">',
        '      <span class="cg-mini-key cg-mini-key--active">a</span>',
        '      <span class="cg-mini-key">s</span>',
        '      <span class="cg-mini-key cg-mini-key--active">d</span>',
        '      <span class="cg-mini-key">f</span>',
        '      <span class="cg-mini-key cg-mini-key--focus">j</span>',
        '      <span class="cg-mini-key">k</span>',
        '      <span class="cg-mini-key">l</span>',
        '    </div>',
        '  </div>',
        '</div>'
      ].join("");
    }
    return "";
  }

  function renderGameCard(game, active, options) {
    var config = options || {};
    var href = config.href ? ' href="' + escapeHtml(config.href) + '"' : "";
    var caption = config.caption ? '<p class="cg-card-caption">' + escapeHtml(config.caption) + "</p>" : "";
    return [
      '<article class="cg-game-card' + (active ? " is-active" : "") + '" data-game-id="' + escapeHtml(game.id) + '"' + (config.href ? ' data-href="' + escapeHtml(config.href) + '"' : "") + ' tabindex="0" role="link">',
      renderPreview(game.id),
      '  <div class="cg-game-card-head">',
      '    <span class="cg-game-icon">' + iconFor(game.id, "cg-icon cg-icon--game") + "</span>",
      '    <a class="cg-card-badge" data-game-id="' + escapeHtml(game.id) + '"' + href + ">" + escapeHtml(game.modeLabel) + "</a>",
      "  </div>",
      '  <h3>' + escapeHtml(game.title) + "</h3>",
      '  <p>' + escapeHtml(game.subtitle) + "</p>",
      caption,
      "</article>"
    ].join("");
  }

  return {
    iconFor: iconFor,
    escapeHtml: escapeHtml,
    renderGameCard: renderGameCard
  };
});
