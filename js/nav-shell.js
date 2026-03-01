(function navShellModule() {
  "use strict";

  if (window.__CS_NAV_SHELL_READY__) return;
  window.__CS_NAV_SHELL_READY__ = true;

  function normalizePage(pathname) {
    var raw = String(pathname || "").split("/").pop() || "index.html";
    if (!raw || raw === "/") return "index.html";
    return raw.toLowerCase();
  }

  function buildLinks() {
    var links = [
      { href: "./index.html", label: "Home", pages: ["", "/", "index.html"] },
      { href: "./teacher-dashboard.html", label: "Teacher Dashboard", pages: ["teacher-dashboard.html"] },
      { href: "./word-quest.html", label: "Word Quest", pages: ["word-quest.html"] },
      { href: "./reading-lab.html", label: "Reading Lab", pages: ["reading-lab.html"] },
      { href: "./sentence-surgery.html", label: "Sentence Surgery", pages: ["sentence-surgery.html"] },
      { href: "./writing-studio.html", label: "Writing Studio", pages: ["writing-studio.html"] },
      { href: "./numeracy.html", label: "Numeracy", pages: ["numeracy.html"] },
      { href: "./admin-dashboard.html", label: "Admin Dashboard", pages: ["admin-dashboard.html"] }
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
    brand.href = "./index.html";
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
