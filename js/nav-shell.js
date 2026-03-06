(function navShellModule() {
  "use strict";

  if (window.__CS_NAV_SHELL_READY__) return;
  window.__CS_NAV_SHELL_READY__ = true;

  function normalizePage(pathname) {
    var raw = String(pathname || "").split("/").pop() || "index.html";
    if (!raw || raw === "/") return "index.html";
    return raw.toLowerCase();
  }

  function appBasePath() {
    var path = String((window.location && window.location.pathname) || "");
    var marker = "/WordQuest/";
    var idx = path.indexOf(marker);
    if (idx >= 0) return path.slice(0, idx + marker.length - 1);
    try {
      var baseEl = document.querySelector("base[href]");
      if (baseEl) {
        var baseUrl = new URL(baseEl.getAttribute("href"), window.location.href);
        var basePath = String(baseUrl.pathname || "").replace(/\/+$/, "");
        if (basePath && basePath !== "/") return basePath;
      }
    } catch (_e) {}
    return "";
  }

  function withBase(path) {
    var clean = String(path || "").replace(/^\.?\//, "");
    return appBasePath() + "/" + clean;
  }

  function buildLinks() {
    var links = [
      { href: withBase("index.html"), label: "Home", pages: ["", "/", "index.html"] },
      { href: withBase("teacher-hub-v2.html"), label: "Teacher Hub", pages: ["teacher-hub-v2.html"] },
      { href: withBase("word-quest.html?play=1#wordquest"), label: "Word Quest", pages: ["word-quest.html"] },
      { href: withBase("reading-lab.html"), label: "Reading Lab", pages: ["reading-lab.html"] },
      { href: withBase("sentence-surgery.html"), label: "Sentence Studio", pages: ["sentence-surgery.html"] },
      { href: withBase("activities/decoding-diagnostic.html"), label: "Decoding Diagnostic", pages: ["decoding-diagnostic.html"] },
      { href: withBase("writing-studio.html"), label: "Writing Studio", pages: ["writing-studio.html"] },
      { href: withBase("numeracy.html"), label: "Numeracy", pages: ["numeracy.html"] },
      { href: withBase("admin-dashboard.html"), label: "Admin Dashboard", pages: ["admin-dashboard.html"] }
    ];
    return links;
  }

  function init() {
    if (!document.body || document.getElementById("cs-nav-shell")) return;

    var current = normalizePage(window.location.pathname);
    var nav = document.createElement("nav");
    nav.id = "cs-nav-shell";
    nav.className = "cs-nav-shell";
    nav.setAttribute("aria-label", "Global");

    var brand = document.createElement("a");
    brand.className = "cs-nav-brand";
    brand.href = withBase("index.html");
    brand.textContent = "Cornerstone MTSS";
    nav.appendChild(brand);

    var linksWrap = document.createElement("div");
    linksWrap.className = "cs-nav-links";

    buildLinks().forEach(function (item) {
      var link = document.createElement("a");
      link.className = "cs-nav-link";
      link.href = item.href;
      link.textContent = item.label;
      if (item.pages.indexOf(current) >= 0 || (current === "index.html" && item.label === "Home")) {
        link.classList.add("is-active");
        link.setAttribute("aria-current", "page");
      }
      linksWrap.appendChild(link);
    });

    nav.appendChild(linksWrap);
    document.body.insertBefore(nav, document.body.firstChild);
    document.body.classList.add("cs-has-nav-shell");
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
