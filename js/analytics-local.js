/* ═══════════════════════════════════════════════════════════
   Cornerstone MTSS — Local Analytics
   js/analytics-local.js

   window.CSAnalytics
   ─────────────────────────────────────────────────────────────
   Tracks anonymous usage events to localStorage.
   No external service. No PII. Export as JSON any time.

   Event schema:
   { ev, ts, sessionId, data }
   ─────────────────────────────────────────────────────────── */

(function (root) {
  "use strict";

  var STORE_KEY    = "cs.analytics.v1";
  var SESSION_KEY  = "cs.analytics.session";
  var MAX_EVENTS   = 2000;   /* rolling cap to avoid bloating localStorage */

  /* ── Session ID ─────────────────────────────────────────── */

  function getOrCreateSession() {
    var s = sessionStorage.getItem(SESSION_KEY);
    if (!s) {
      s = "s_" + Date.now() + "_" + Math.random().toString(36).slice(2, 7);
      sessionStorage.setItem(SESSION_KEY, s);
    }
    return s;
  }

  /* ── Storage ────────────────────────────────────────────── */

  function load() {
    try {
      var raw = localStorage.getItem(STORE_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch (e) { return []; }
  }

  function save(events) {
    /* Rolling cap: keep most recent MAX_EVENTS */
    if (events.length > MAX_EVENTS) {
      events = events.slice(events.length - MAX_EVENTS);
    }
    try {
      localStorage.setItem(STORE_KEY, JSON.stringify(events));
    } catch (e) {
      /* localStorage full — trim aggressively */
      try {
        localStorage.setItem(STORE_KEY, JSON.stringify(events.slice(-200)));
      } catch (e2) { /* give up */ }
    }
  }

  /* ── Core tracker ───────────────────────────────────────── */

  function track(ev, data) {
    var events  = load();
    var session = getOrCreateSession();
    var entry   = {
      ev:        String(ev),
      ts:        new Date().toISOString(),
      sessionId: session,
      data:      data || {}
    };
    events.push(entry);
    save(events);
    return entry;
  }

  /* ── Summary stats ──────────────────────────────────────── */

  function getSummary() {
    var events   = load();
    var counts   = {};
    var sessions = {};
    var firstTs  = null;
    var lastTs   = null;

    events.forEach(function (e) {
      /* Count by event type */
      counts[e.ev] = (counts[e.ev] || 0) + 1;
      /* Unique sessions */
      sessions[e.sessionId] = true;
      /* Time range */
      if (!firstTs || e.ts < firstTs) firstTs = e.ts;
      if (!lastTs  || e.ts > lastTs)  lastTs  = e.ts;
    });

    return {
      totalEvents:    events.length,
      uniqueSessions: Object.keys(sessions).length,
      countsByType:   counts,
      firstEvent:     firstTs,
      lastEvent:      lastTs,
      daysCovered:    firstTs ? Math.ceil((Date.now() - new Date(firstTs).getTime()) / 86400000) : 0
    };
  }

  /* ── Export ─────────────────────────────────────────────── */

  function exportJSON() {
    var events   = load();
    var summary  = getSummary();
    var payload  = {
      exportedAt:  new Date().toISOString(),
      summary:     summary,
      events:      events
    };
    var blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
    var url  = URL.createObjectURL(blob);
    var a    = document.createElement("a");
    a.href     = url;
    a.download = "cornerstone-analytics-" + new Date().toISOString().slice(0, 10) + ".json";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    track("analytics_export", { eventCount: events.length });
  }

  function exportCSV() {
    var events = load();
    var rows   = ["event,timestamp,sessionId,dataJSON"];
    events.forEach(function (e) {
      rows.push([
        '"' + e.ev + '"',
        '"' + e.ts + '"',
        '"' + e.sessionId + '"',
        '"' + JSON.stringify(e.data).replace(/"/g, '""') + '"'
      ].join(","));
    });
    var blob = new Blob([rows.join("\n")], { type: "text/csv" });
    var url  = URL.createObjectURL(blob);
    var a    = document.createElement("a");
    a.href     = url;
    a.download = "cornerstone-analytics-" + new Date().toISOString().slice(0, 10) + ".csv";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  /* ── Build admin panel DOM ──────────────────────────────── */

  var PANEL_ID = "cs-analytics-panel";

  function buildAdminPanel() {
    var existing = document.getElementById(PANEL_ID);
    if (existing) { existing.remove(); }

    var summary = getSummary();

    function fmtDate(iso) {
      if (!iso) return "—";
      return new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
    }

    /* Build event-type rows */
    var countRows = Object.entries(summary.countsByType)
      .sort(function (a, b) { return b[1] - a[1]; })
      .map(function (pair) {
        return "<tr><td class='cs-analytics-ev-name'>" + pair[0] + "</td><td class='cs-analytics-ev-count'>" + pair[1] + "</td></tr>";
      }).join("");

    var html =
      "<div id='" + PANEL_ID + "' class='cs-analytics-panel' role='dialog' aria-modal='true' aria-labelledby='cs-analytics-title'>" +
        "<div class='cs-analytics-inner'>" +
          "<div class='cs-analytics-head'>" +
            "<h2 id='cs-analytics-title' class='cs-analytics-title'>📊 Usage Analytics</h2>" +
            "<button class='cs-analytics-close' data-action='close' aria-label='Close analytics'>&#x2715;</button>" +
          "</div>" +

          "<div class='cs-analytics-stats-grid'>" +
            "<div class='cs-analytics-stat'><span class='cs-analytics-stat-val'>" + summary.totalEvents + "</span><span class='cs-analytics-stat-label'>Total events</span></div>" +
            "<div class='cs-analytics-stat'><span class='cs-analytics-stat-val'>" + summary.uniqueSessions + "</span><span class='cs-analytics-stat-label'>Sessions</span></div>" +
            "<div class='cs-analytics-stat'><span class='cs-analytics-stat-val'>" + summary.daysCovered + "</span><span class='cs-analytics-stat-label'>Days tracked</span></div>" +
          "</div>" +

          "<p class='cs-analytics-range'>Data range: <strong>" + fmtDate(summary.firstEvent) + "</strong> → <strong>" + fmtDate(summary.lastEvent) + "</strong></p>" +

          "<table class='cs-analytics-table'>" +
            "<thead><tr><th>Event</th><th>Count</th></tr></thead>" +
            "<tbody>" + (countRows || "<tr><td colspan='2' class='cs-analytics-empty'>No events yet.</td></tr>") + "</tbody>" +
          "</table>" +

          "<div class='cs-analytics-actions'>" +
            "<button class='cs-analytics-btn cs-analytics-btn-export-json' data-action='export-json'>⬇ Export JSON</button>" +
            "<button class='cs-analytics-btn cs-analytics-btn-export-csv'  data-action='export-csv'>⬇ Export CSV</button>" +
            "<button class='cs-analytics-btn cs-analytics-btn-clear'       data-action='clear'>🗑 Clear data</button>" +
          "</div>" +

          "<p class='cs-analytics-note'>All data stays on this device. No data is sent to any server.</p>" +
        "</div>" +
      "</div>";

    document.body.insertAdjacentHTML("beforeend", html);
    var panel = document.getElementById(PANEL_ID);

    panel.querySelectorAll("[data-action]").forEach(function (btn) {
      btn.addEventListener("click", function () {
        var action = btn.getAttribute("data-action");
        if (action === "close")       { panel.remove(); }
        if (action === "export-json") { exportJSON(); }
        if (action === "export-csv")  { exportCSV(); }
        if (action === "clear") {
          if (confirm("Clear all " + summary.totalEvents + " analytics events? This cannot be undone.")) {
            localStorage.removeItem(STORE_KEY);
            panel.remove();
            api.openAdminPanel();
          }
        }
      });
    });

    /* Click outside to close */
    panel.addEventListener("click", function (e) {
      if (e.target === panel) panel.remove();
    });

    /* Esc to close */
    var onKey = function (e) {
      if (e.key === "Escape") { panel.remove(); document.removeEventListener("keydown", onKey); }
    };
    document.addEventListener("keydown", onKey);

    track("analytics_panel_opened", {});
  }

  /* ── Auto-track standard hub events ────────────────────── */

  window.addEventListener("cs-student-selected",    function (e) { track("student_selected",    { studentId: (e.detail||{}).studentId }); });
  window.addEventListener("cs-cost-tracked",        function (e) { track("ai_call",             (e.detail||{})); });
  window.addEventListener("cs-classroom-synced",    function (e) { track("classroom_sync",      (e.detail||{})); });
  window.addEventListener("cs-tour-completed",      function (e) { track("tour_completed",      (e.detail||{})); });

  /* ── Public API ─────────────────────────────────────────── */

  var api = {
    track:          track,
    getSummary:     getSummary,
    getEvents:      load,
    exportJSON:     exportJSON,
    exportCSV:      exportCSV,
    openAdminPanel: buildAdminPanel,
    clear: function () { localStorage.removeItem(STORE_KEY); }
  };

  root.CSAnalytics = api;

  /* Record initial page view */
  track("page_view", { page: window.location.pathname.split("/").pop() || "index.html" });

})(window);
