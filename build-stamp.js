(function csBuildStampModule() {
  "use strict";

  var VERSION_URL = "./version.json";
  var VERSION_KEY = "cs_app_version";
  var RELOAD_GUARD_KEY = "cs_app_version_reloaded_once";

  function inDevMode() {
    return !!(window.CS_CONFIG && window.CS_CONFIG.environment === "dev");
  }

  function getCurrentPathVersion() {
    try {
      return new URLSearchParams(window.location.search || "").get("v") || "";
    } catch (_e) {
      return "";
    }
  }

  function setPathVersion(version) {
    try {
      var url = new URL(window.location.href);
      url.searchParams.set("v", version);
      window.location.replace(url.toString());
    } catch (_e) {
      window.location.reload();
    }
  }

  function applyReloadGuard(version) {
    var prior = "";
    var reloadedOnce = "";
    try { prior = localStorage.getItem(VERSION_KEY) || ""; } catch (_e1) { prior = ""; }
    try { reloadedOnce = sessionStorage.getItem(RELOAD_GUARD_KEY) || ""; } catch (_e2) { reloadedOnce = ""; }

    if (!prior) {
      try { localStorage.setItem(VERSION_KEY, version); } catch (_e3) {}
      return;
    }

    if (prior !== version) {
      try { localStorage.setItem(VERSION_KEY, version); } catch (_e4) {}
      if (reloadedOnce !== version) {
        try { sessionStorage.setItem(RELOAD_GUARD_KEY, version); } catch (_e5) {}
        if (getCurrentPathVersion() !== version) {
          setPathVersion(version);
          return;
        }
        window.location.reload();
      }
      return;
    }

    if (reloadedOnce && reloadedOnce !== version) {
      try { sessionStorage.removeItem(RELOAD_GUARD_KEY); } catch (_e6) {}
    }
  }

  function ensureBadge(version) {
    var badge = document.getElementById("cs-build-badge");
    if (!badge) {
      badge = document.createElement("button");
      badge.id = "cs-build-badge";
      badge.type = "button";
      badge.style.position = "fixed";
      badge.style.right = "10px";
      badge.style.bottom = "10px";
      badge.style.zIndex = "9999";
      badge.style.border = "1px solid rgba(255,255,255,0.25)";
      badge.style.borderRadius = "10px";
      badge.style.background = "rgba(20,30,40,0.65)";
      badge.style.color = "#d8e3ef";
      badge.style.font = "600 11px/1.2 'Atkinson Hyperlegible', sans-serif";
      badge.style.padding = "6px 8px";
      badge.style.backdropFilter = "blur(8px)";
      badge.style.cursor = "pointer";
      badge.title = "Click to copy build version";
      badge.setAttribute("aria-label", "Build version");
      document.body.appendChild(badge);
    }

    badge.textContent = "Build " + version;

    badge.onclick = function () {
      var text = String(version || "");
      if (!text) return;
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(text).catch(function () {});
      }
    };
  }

  function parseVersion(json) {
    if (!json || typeof json !== "object") return "local";
    var version = String(json.v || "").trim();
    return version || "local";
  }

  async function init() {
    var version = "local";
    try {
      var res = await fetch(VERSION_URL + "?cb=" + Date.now(), { cache: "no-store" });
      if (res.ok) {
        var json = await res.json();
        version = parseVersion(json);
      }
    } catch (_e) {
      version = "local";
    }

    window.CS_BUILD = {
      version: version,
      fetchedAt: Date.now()
    };

    applyReloadGuard(version);

    var onReady = function () { ensureBadge(version); };
    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", onReady, { once: true });
    } else {
      onReady();
    }

    if (inDevMode()) {
      try { console.log("[CS BUILD]", window.CS_BUILD); } catch (_e2) {}
    }
  }

  init();
})();
