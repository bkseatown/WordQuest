(function gameA11yModule(root, factory) {
  if (typeof module === "object" && module.exports) {
    module.exports = factory();
    return;
  }
  root.CSGameA11y = factory();
})(typeof globalThis !== "undefined" ? globalThis : window, function createGameA11y() {
  "use strict";

  function createLiveRegion(host) {
    var node = host || document.createElement("div");
    if (!host) {
      node.className = "cg-live-region";
      node.setAttribute("aria-live", "polite");
      node.setAttribute("aria-atomic", "true");
      node.style.position = "absolute";
      node.style.width = "1px";
      node.style.height = "1px";
      node.style.overflow = "hidden";
      node.style.clip = "rect(0 0 0 0)";
      document.body.appendChild(node);
    }
    return {
      announce: function (message) {
        node.textContent = "";
        setTimeout(function () {
          node.textContent = String(message || "");
        }, 16);
      }
    };
  }

  return {
    createLiveRegion: createLiveRegion
  };
});
