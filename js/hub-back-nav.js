/**
 * hub-back-nav.js — Back-to-Hub navigation strip
 *
 * Add to any activity page to enable seamless hub ↔ activity navigation.
 * Auto-activates only when URL contains ?from=hub — zero cost otherwise.
 *
 * Usage: <script src="./js/hub-back-nav.js" defer></script>
 */
(function hubBackNav() {
  "use strict";

  /* ── Parse URL ───────────────────────────────────────── */
  var params;
  try {
    params = new URLSearchParams(window.location.search || "");
  } catch (_e) {
    params = { get: function () { return null; } };
  }

  if (params.get("from") !== "hub") return;   // no-op on normal navigation

  var studentId = params.get("student") || "";
  var hubHref   = "teacher-hub-v2.html" +
    (studentId ? "?student=" + encodeURIComponent(studentId) : "");

  /* ── Inject styles (self-contained, no token dependency) ── */
  var style = document.createElement("style");
  style.id  = "cs-hub-back-style";
  style.textContent = [
    /* Bar */
    "#cs-hub-back-bar{",
    "  position:fixed;top:0;left:0;right:0;z-index:9999;",
    "  display:flex;align-items:center;gap:10px;",
    "  padding:0 18px;height:38px;",
    "  background:#0f1117;",
    "  border-bottom:1px solid rgba(255,255,255,0.08);",
    "  box-shadow:0 2px 10px rgba(0,0,0,.22);",
    "  font:13px/1 system-ui,-apple-system,sans-serif;",
    "}",
    /* Back link */
    "#cs-hub-back-bar .cs-hub-back-link{",
    "  display:inline-flex;align-items:center;gap:6px;",
    "  color:#7eb4f5;text-decoration:none;",
    "  font:600 12.5px/1 system-ui;letter-spacing:0.02em;",
    "  transition:color .14s;white-space:nowrap;",
    "}",
    "#cs-hub-back-bar .cs-hub-back-link:hover{color:#aacffa;}",
    /* Separator */
    "#cs-hub-back-bar .cs-hub-back-sep{",
    "  width:1px;height:14px;",
    "  background:rgba(255,255,255,0.13);",
    "  flex-shrink:0;",
    "}",
    /* Context label (student name or breadcrumb) */
    "#cs-hub-back-bar .cs-hub-back-ctx{",
    "  font:400 12px/1 system-ui;",
    "  color:rgba(255,255,255,.35);",
    "  white-space:nowrap;overflow:hidden;text-overflow:ellipsis;",
    "  max-width:280px;",
    "}",
    /* Dismiss button */
    "#cs-hub-back-bar .cs-hub-back-dismiss{",
    "  margin-left:auto;",
    "  background:none;border:none;cursor:pointer;",
    "  color:rgba(255,255,255,.3);font-size:15px;line-height:1;",
    "  padding:4px 6px;border-radius:4px;",
    "  transition:color .14s;",
    "}",
    "#cs-hub-back-bar .cs-hub-back-dismiss:hover{color:rgba(255,255,255,.7);}",
    /* Push page content below bar */
    ".cs-hub-back-nudge{padding-top:38px!important;}"
  ].join("");
  document.head.appendChild(style);

  /* ── Inject DOM ──────────────────────────────────────── */
  function inject() {
    if (document.getElementById("cs-hub-back-bar")) return;

    var bar = document.createElement("div");
    bar.id = "cs-hub-back-bar";
    bar.setAttribute("role", "navigation");
    bar.setAttribute("aria-label", "Return to Command Hub");

    bar.innerHTML =
      '<a class="cs-hub-back-link" href="' + hubHref + '">' +
        '\u2190 Command Hub' +
      '</a>' +
      '<div class="cs-hub-back-sep" aria-hidden="true"></div>' +
      '<span class="cs-hub-back-ctx"></span>' +
      '<button class="cs-hub-back-dismiss" aria-label="Dismiss" title="Dismiss">&#x2715;</button>';

    document.body.insertBefore(bar, document.body.firstChild);
    document.body.classList.add("cs-hub-back-nudge");

    /* Dismiss handler — hides bar without navigating */
    var dismiss = bar.querySelector(".cs-hub-back-dismiss");
    if (dismiss) {
      dismiss.addEventListener("click", function () {
        bar.style.display = "none";
        document.body.classList.remove("cs-hub-back-nudge");
      });
    }

    /* Fill context label (student name from CSEvidence if available) */
    var ctx = bar.querySelector(".cs-hub-back-ctx");
    if (ctx && studentId) {
      resolveStudentName(studentId, function (name) {
        if (name && ctx) ctx.textContent = name;
      });
    }
  }

  /* ── Name resolver (tries CSEvidence, falls back gracefully) */
  function resolveStudentName(id, cb) {
    /* Immediate attempt */
    if (tryResolve(id, cb)) return;
    /* Wait for scripts to finish loading, then try again */
    var attempts = 0;
    var interval = setInterval(function () {
      attempts++;
      if (tryResolve(id, cb) || attempts > 20) clearInterval(interval);
    }, 150);
  }

  function tryResolve(id, cb) {
    try {
      var ev = window.CSEvidence;
      if (!ev || typeof ev.getStudentSummary !== "function") return false;
      var summary = ev.getStudentSummary(id);
      if (summary && summary.student && summary.student.name) {
        cb(summary.student.name);
        return true;
      }
      /* Try listCaseload */
      if (typeof ev.listCaseload === "function") {
        var list = ev.listCaseload() || [];
        for (var i = 0; i < list.length; i++) {
          if (String(list[i].id) === String(id) && list[i].name) {
            cb(list[i].name);
            return true;
          }
        }
      }
    } catch (_e) {}
    return false;
  }

  /* ── Boot ────────────────────────────────────────────── */
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", inject);
  } else {
    inject();
  }

})();
