(function csDiagnosticsModule() {
  "use strict";

  var MAX_EVENTS = 50;
  var PANEL_ID = "cs-diag-panel";
  var KEY_WINDOW_MS = 2000;
  var KEY_TRIGGER_COUNT = 5;
  var pressTimes = [];

  function isDev() {
    return !!(window.CS_CONFIG && window.CS_CONFIG.environment === "dev");
  }

  function allowDiagByQuery() {
    if (!isDev()) return false;
    try {
      return new URLSearchParams(window.location.search || "").get("diag") === "1";
    } catch (_e) {
      return false;
    }
  }

  function ensureState() {
    if (!window.__CS_DIAG || typeof window.__CS_DIAG !== "object") {
      window.__CS_DIAG = { events: [] };
    }
    if (!Array.isArray(window.__CS_DIAG.events)) window.__CS_DIAG.events = [];
    return window.__CS_DIAG;
  }

  function sanitizeConfig() {
    var src = Object.assign({}, window.CS_CONFIG || {});
    delete src.apiKey;
    delete src.token;
    delete src.secret;
    return src;
  }

  function pushEvent(type, payload) {
    var state = ensureState();
    state.events.push({
      at: Date.now(),
      type: type,
      data: payload || {}
    });
    if (state.events.length > MAX_EVENTS) {
      state.events.splice(0, state.events.length - MAX_EVENTS);
    }

    if (isDev()) {
      try { console.log("[CS DIAG]", type, payload || {}); } catch (_e) {}
    }

    renderPanel();
  }

  function buildPanel() {
    var panel = document.getElementById(PANEL_ID);
    if (panel) return panel;

    panel = document.createElement("aside");
    panel.id = PANEL_ID;
    panel.style.position = "fixed";
    panel.style.left = "10px";
    panel.style.bottom = "10px";
    panel.style.width = "min(560px, calc(100vw - 20px))";
    panel.style.maxHeight = "58vh";
    panel.style.overflow = "auto";
    panel.style.background = "rgba(10,16,24,0.92)";
    panel.style.color = "#d7e5f1";
    panel.style.border = "1px solid rgba(255,255,255,0.2)";
    panel.style.borderRadius = "12px";
    panel.style.padding = "10px";
    panel.style.zIndex = "10000";
    panel.style.font = "12px/1.35 ui-monospace, SFMono-Regular, Menlo, Consolas, monospace";
    panel.style.display = "none";

    var mount = document.body || document.documentElement;
    if (!mount) return null;
    mount.appendChild(panel);
    return panel;
  }

  function renderPanel() {
    var panel = document.getElementById(PANEL_ID);
    if (!panel || panel.style.display === "none") return;

    var build = window.CS_BUILD && window.CS_BUILD.version ? window.CS_BUILD.version : "unknown";
    var cfg = sanitizeConfig();
    var state = ensureState();
    var events = state.events.slice(-12).reverse();

    panel.innerHTML = [
      '<div style="display:flex;justify-content:space-between;gap:8px;align-items:center;margin-bottom:8px;">',
      '  <strong>Cornerstone Diagnostics</strong>',
      '  <button id="cs-diag-close" type="button" style="background:#223446;color:#d7e5f1;border:1px solid rgba(255,255,255,0.2);border-radius:8px;padding:3px 8px;cursor:pointer;">Close</button>',
      '</div>',
      '<div><b>Build:</b> ' + build + '</div>',
      '<div><b>Config:</b> <pre style="white-space:pre-wrap;margin:4px 0 8px;">' + JSON.stringify(cfg, null, 2) + '</pre></div>',
      '<div><b>Flags:</b> AI=' + (!!cfg.enableAI) + ' Analytics=' + (!!cfg.enableAnalytics) + ' Demo=' + (!!cfg.enableDemo) + '</div>',
      '<div style="margin-top:8px;"><b>Recent events (' + state.events.length + '):</b></div>',
      '<div>' + (events.length ? events.map(function (evt) {
        var at = new Date(evt.at).toLocaleTimeString();
        var msg = evt.data && evt.data.message ? evt.data.message : "";
        var file = evt.data && evt.data.file ? evt.data.file : "";
        var line = evt.data && evt.data.line ? ":" + evt.data.line : "";
        return '<div style="margin:4px 0;padding:4px 6px;background:rgba(255,255,255,0.05);border-radius:6px;">[' + at + '] ' + evt.type + ' ' + msg + ' ' + file + line + '</div>';
      }).join("") : '<div style="opacity:.75;">No events yet.</div>') + '</div>'
    ].join("");

    var closeBtn = document.getElementById("cs-diag-close");
    if (closeBtn) closeBtn.onclick = hidePanel;
  }

  function showPanel() {
    var panel = buildPanel();
    if (!panel) return;
    panel.style.display = "block";
    renderPanel();
  }

  function hidePanel() {
    var panel = document.getElementById(PANEL_ID);
    if (panel) panel.style.display = "none";
  }

  function togglePanel() {
    var panel = buildPanel();
    if (panel.style.display === "none") showPanel();
    else hidePanel();
  }

  function attachHandlers() {
    window.addEventListener("error", function (event) {
      pushEvent("error", {
        message: event && event.message ? String(event.message) : "Unknown error",
        file: event && event.filename ? String(event.filename) : "",
        line: event && event.lineno ? Number(event.lineno) : 0
      });
    });

    window.addEventListener("unhandledrejection", function (event) {
      var reason = event && event.reason;
      pushEvent("unhandledrejection", {
        message: reason && reason.message ? String(reason.message) : String(reason || "Unknown rejection")
      });
    });

    document.addEventListener("keydown", function (event) {
      if (!event || String(event.key || "").toLowerCase() !== "d") return;
      var now = Date.now();
      pressTimes.push(now);
      pressTimes = pressTimes.filter(function (ts) { return now - ts <= KEY_WINDOW_MS; });
      if (pressTimes.length >= KEY_TRIGGER_COUNT) {
        pressTimes = [];
        togglePanel();
      }
    });

    if (allowDiagByQuery()) {
      if (document.body) showPanel();
      else document.addEventListener("DOMContentLoaded", showPanel, { once: true });
    }
  }

  function smokeChecks() {
    var path = String(window.location.pathname || "");
    var checks = {
      version: window.CS_BUILD && window.CS_BUILD.version ? window.CS_BUILD.version : "unknown",
      page: path,
      mounts: {},
      guard: {
        localVersion: (function () { try { return localStorage.getItem("cs_app_version") || ""; } catch (_e) { return ""; } })(),
        sessionReloaded: (function () { try { return sessionStorage.getItem("cs_app_version_reloaded_once") || ""; } catch (_e2) { return ""; } })()
      }
    };

    function has(id) { return !!document.getElementById(id); }

    if (path.endsWith("index.html") || path === "/" || path.endsWith("/")) {
      checks.mounts.wordQuest = has("loading-screen") && has("home-logo-btn");
    }
    if (path.endsWith("writing-studio.html")) {
      checks.mounts.writingStudio = has("ws-bg") && has("ws-stage");
    }
    if (path.endsWith("teacher-dashboard.html")) {
      checks.mounts.teacherDashboard = has("td-root") && has("td-groups");
    }
    if (path.endsWith("admin-dashboard.html")) {
      checks.mounts.adminDashboard = has("admin-root") && has("admin-class-bars");
    }
    if (path.endsWith("paragraph-builder.html")) {
      checks.mounts.paragraphBuilder = has("pb-root") && has("pb-metrics");
    }

    console.log("[CS_SMOKE]", checks);
    return checks;
  }

  ensureState();
  attachHandlers();
  window.CS_SMOKE = smokeChecks;
})();
