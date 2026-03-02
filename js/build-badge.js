(function csBuildBadgeModule() {
  "use strict";

  var BASE = window.location.pathname.indexOf("/WordQuest/") !== -1 ? "/WordQuest" : "";
  var BUILD_JSON_URL = BASE + "/build.json";
  var BADGE_ID = "cs-build-badge";
  var POPOVER_ID = "cs-build-popover";
  var TOAST_ID = "cs-build-toast";
  var initialized = false;

  function currentBuildId() {
    var payload = window.CS_BUILD || window.__BUILD__ || window.__CS_BUILD__ || {};
    var build = String(payload.id || payload.buildId || payload.stamp || payload.version || "").trim();
    if (!build) {
      try { build = String(new URLSearchParams(window.location.search || "").get("v") || "").trim(); } catch (_e) {}
    }
    return build || "unknown";
  }

  function isDev() {
    var host = String(window.location.hostname || "").toLowerCase();
    if (!host || host === "localhost" || host === "127.0.0.1" || host === "::1") return true;
    return !!(window.CS_CONFIG && String(window.CS_CONFIG.environment || "").toLowerCase() === "dev");
  }

  function ensureStyles() {
    if (document.getElementById("cs-build-badge-style")) return;
    var style = document.createElement("style");
    style.id = "cs-build-badge-style";
    style.textContent = [
      "#" + BADGE_ID + "{position:fixed;left:10px;bottom:10px;z-index:2147483600;border:1px solid rgba(255,255,255,.16);background:rgba(12,20,30,.78);color:#dce9f7;border-radius:999px;padding:6px 10px;font:600 11px/1.2 var(--font-sans,system-ui,-apple-system,sans-serif);letter-spacing:.01em;cursor:pointer;box-shadow:0 6px 18px rgba(0,0,0,.28)}",
      "#" + BADGE_ID + ":hover{background:rgba(22,34,46,.92)}",
      "#" + BADGE_ID + " .dot{display:inline-block;width:6px;height:6px;border-radius:999px;margin-left:7px;vertical-align:middle;background:#67d687}",
      "#" + BADGE_ID + "[data-stale='1'] .dot{background:#f3c96d}",
      "#" + POPOVER_ID + "{position:fixed;left:10px;bottom:44px;z-index:2147483601;width:min(340px,calc(100vw - 20px));padding:10px;border-radius:12px;border:1px solid rgba(255,255,255,.16);background:rgba(12,20,30,.97);color:#eaf3fd;font:500 12px/1.45 var(--font-sans,system-ui,-apple-system,sans-serif);box-shadow:0 16px 30px rgba(0,0,0,.3)}",
      "#" + POPOVER_ID + "[hidden]{display:none!important}",
      ".cs-build-row{display:flex;justify-content:space-between;gap:12px;margin:4px 0}",
      ".cs-build-row b{font-weight:700}",
      ".cs-build-actions{display:flex;gap:8px;flex-wrap:wrap;margin-top:10px}",
      ".cs-build-btn{border:1px solid rgba(255,255,255,.2);border-radius:9px;background:rgba(255,255,255,.07);color:#eef6ff;padding:6px 9px;font:600 11px/1.2 var(--font-sans,system-ui,-apple-system,sans-serif);cursor:pointer}",
      ".cs-build-btn:hover{background:rgba(255,255,255,.14)}",
      "#" + TOAST_ID + "{position:fixed;left:10px;bottom:76px;z-index:2147483599;display:flex;align-items:center;gap:8px;padding:10px;border-radius:10px;border:1px solid rgba(255,255,255,.2);background:rgba(16,27,40,.96);color:#f5f8ff;font:600 12px/1.25 var(--font-sans,system-ui,-apple-system,sans-serif)}",
      "#" + TOAST_ID + "[hidden]{display:none!important}"
    ].join("");
    (document.head || document.documentElement).appendChild(style);
  }

  async function fetchDeployedBuild() {
    try {
      var res = await fetch(BUILD_JSON_URL, { cache: "no-store" });
      if (!res.ok) return null;
      return await res.json();
    } catch (_e) {
      return null;
    }
  }

  async function clearAllCaches() {
    if (!("caches" in window) || !window.caches || typeof window.caches.keys !== "function") return;
    var keys = await window.caches.keys();
    for (var i = 0; i < keys.length; i += 1) {
      try { await window.caches.delete(keys[i]); } catch (_e) {}
    }
  }

  async function forceUpdate() {
    var deployed = (window.CSBuildBadgeState && window.CSBuildBadgeState.deployedBuildId) || currentBuildId();
    try {
      if ("serviceWorker" in navigator && navigator.serviceWorker.getRegistrations) {
        var regs = await navigator.serviceWorker.getRegistrations();
        for (var i = 0; i < regs.length; i += 1) {
          try { await regs[i].update(); } catch (_e1) {}
        }
        for (var j = 0; j < regs.length; j += 1) {
          try { await regs[j].unregister(); } catch (_e2) {}
        }
      }
      await clearAllCaches();
      try { window.sessionStorage.clear(); } catch (_e4) {}
      var url = new URL(window.location.href);
      url.searchParams.set("_cb", deployed || Date.now().toString());
      window.location.replace(url.toString());
      return;
    } catch (_fatal) {
      window.location.reload();
    }
  }

  function ensureBadge() {
    var badge = document.getElementById(BADGE_ID);
    if (badge) return badge;
    badge = document.createElement("button");
    badge.id = BADGE_ID;
    badge.type = "button";
    badge.setAttribute("aria-label", "Build version");
    badge.innerHTML = '<span class="txt"></span><span class="dot" aria-hidden="true"></span>';
    document.body.appendChild(badge);
    return badge;
  }

  function ensurePopover() {
    var pop = document.getElementById(POPOVER_ID);
    if (pop) return pop;
    pop = document.createElement("section");
    pop.id = POPOVER_ID;
    pop.hidden = true;
    pop.innerHTML = [
      '<div class="cs-build-row"><span>Current build</span><b id="cs-build-current">--</b></div>',
      '<div class="cs-build-row"><span>Deployed build</span><b id="cs-build-deployed">--</b></div>',
      '<div class="cs-build-actions">',
      '<button class="cs-build-btn" id="cs-copy-build-btn" type="button">Copy build id</button>',
      '<button class="cs-build-btn" id="cs-force-update-btn" type="button">Force update</button>',
      '<button class="cs-build-btn" id="cs-reset-cache-btn" type="button" hidden>Unregister SW + clear caches</button>',
      "</div>"
    ].join("");
    document.body.appendChild(pop);
    return pop;
  }

  function ensureToast() {
    var el = document.getElementById(TOAST_ID);
    if (el) return el;
    el = document.createElement("aside");
    el.id = TOAST_ID;
    el.hidden = true;
    el.innerHTML = '<span>Update available</span><button class="cs-build-btn" id="cs-toast-update-btn" type="button">Update now</button>';
    document.body.appendChild(el);
    return el;
  }

  function openPopover() {
    ensurePopover().hidden = false;
  }

  function togglePopover() {
    var pop = ensurePopover();
    pop.hidden = !pop.hidden;
  }

  function bindUi() {
    var badge = ensureBadge();
    var pop = ensurePopover();
    var toast = ensureToast();
    var forceBtn = pop.querySelector("#cs-force-update-btn");
    var copyBtn = pop.querySelector("#cs-copy-build-btn");
    var resetBtn = pop.querySelector("#cs-reset-cache-btn");
    var toastBtn = toast.querySelector("#cs-toast-update-btn");

    if (isDev() && resetBtn) resetBtn.hidden = false;

    badge.addEventListener("click", togglePopover);
    document.addEventListener("click", function (event) {
      var t = event.target;
      if (!t) return;
      if (t === badge || pop.contains(t)) return;
      pop.hidden = true;
    });

    if (copyBtn) {
      copyBtn.addEventListener("click", function () {
        var value = (window.CSBuildBadgeState && window.CSBuildBadgeState.deployedBuildId) || currentBuildId();
        if (navigator.clipboard && navigator.clipboard.writeText) {
          navigator.clipboard.writeText(value).catch(function () {});
        }
      });
    }
    if (forceBtn) forceBtn.addEventListener("click", forceUpdate);
    if (toastBtn) toastBtn.addEventListener("click", forceUpdate);
    if (resetBtn) {
      resetBtn.addEventListener("click", function () {
        Promise.resolve()
          .then(function () { return navigator.serviceWorker.getRegistrations(); })
          .then(function (regs) { return Promise.all(regs.map(function (r) { return r.unregister().catch(function () {}); })); })
          .then(clearAllCaches)
          .finally(function () { pop.hidden = true; });
      });
    }
  }

  function updateLabels(current, deployed) {
    var badge = ensureBadge();
    var txt = badge.querySelector(".txt");
    var currentEl = ensurePopover().querySelector("#cs-build-current");
    var deployedEl = ensurePopover().querySelector("#cs-build-deployed");
    var shortCurrent = current.length > 18 ? current.slice(0, 18) : current;
    var label = "Build " + shortCurrent;
    if (txt) txt.textContent = label;
    if (currentEl) currentEl.textContent = current;
    if (deployedEl) deployedEl.textContent = deployed || "unavailable";
    badge.dataset.stale = deployed && deployed !== current ? "1" : "0";
  }

  async function init() {
    if (initialized) return;
    initialized = true;
    ensureStyles();
    bindUi();
    var current = currentBuildId();
    var deployedPayload = await fetchDeployedBuild();
    var deployed = String(deployedPayload && deployedPayload.buildId || "").trim();
    window.CSBuildBadgeState = { currentBuildId: current, deployedBuildId: deployed };
    updateLabels(current, deployed);
    if (deployed && current && deployed !== current) {
      ensureToast().hidden = false;
      try {
        var existingCb = String(new URL(window.location.href).searchParams.get("_cb") || "").trim();
        if (existingCb !== deployed) {
          var autoKey = "cs_build_autofix_" + deployed;
          var done = sessionStorage.getItem(autoKey) === "1";
          if (!done) {
            sessionStorage.setItem(autoKey, "1");
            setTimeout(function () { forceUpdate(); }, 500);
          }
        }
      } catch (_autoErr) {}
      if ("serviceWorker" in navigator && navigator.serviceWorker.getRegistration) {
        navigator.serviceWorker.getRegistration().then(function (reg) {
          if (!reg || !reg.waiting) return;
          try { reg.waiting.postMessage({ type: "WQ_SKIP_WAITING" }); } catch (_e1) {}
          try { reg.waiting.postMessage("SKIP_WAITING"); } catch (_e2) {}
        }).catch(function () {});
      }
    }
  }

  window.CSForceUpdateNow = forceUpdate;
  window.CSBuildBadge = Object.assign({}, window.CSBuildBadge || {}, {
    init: init,
    forceUpdate: forceUpdate,
    open: openPopover,
    togglePopover: togglePopover
  });
})();
