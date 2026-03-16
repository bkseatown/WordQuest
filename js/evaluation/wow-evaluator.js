(function wowEvaluatorModule() {
  "use strict";

  var STORAGE_KEYS = {
    wow: "cs.eval.wow",
    emotion: "cs.eval.emotion",
    firstClick: "cs.eval.firstclick"
  };

  var firstClickCaptured = false;
  var loadStart = (window.performance && typeof window.performance.now === "function") ? window.performance.now() : Date.now();

  function readRecords(key) {
    try {
      var parsed = JSON.parse(localStorage.getItem(key) || "[]");
      return Array.isArray(parsed) ? parsed : [];
    } catch (_e) {
      return [];
    }
  }

  function writeRecords(key, records) {
    try {
      localStorage.setItem(key, JSON.stringify(records || []));
    } catch (_e) {
      // ignore localStorage failures
    }
  }

  function appendRecord(key, record) {
    var rows = readRecords(key);
    rows.push(record);
    writeRecords(key, rows);
    return rows;
  }

  function csvEscape(value) {
    var text = String(value == null ? "" : value);
    if (/[",\n]/.test(text)) return '"' + text.replace(/"/g, '""') + '"';
    return text;
  }

  function toCsv(rows) {
    if (!rows.length) return "timestamp\n";
    var headers = [];
    rows.forEach(function (row) {
      Object.keys(row || {}).forEach(function (key) {
        if (headers.indexOf(key) === -1) headers.push(key);
      });
    });
    var lines = [headers.join(",")];
    rows.forEach(function (row) {
      lines.push(headers.map(function (key) { return csvEscape(row[key]); }).join(","));
    });
    return lines.join("\n");
  }

  function download(name, text, mime) {
    var blob = new Blob([String(text || "")], { type: mime || "text/plain;charset=utf-8" });
    var link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = name;
    document.body.appendChild(link);
    link.click();
    setTimeout(function () {
      URL.revokeObjectURL(link.href);
      link.remove();
    }, 0);
  }

  function nowIso() {
    return new Date().toISOString();
  }

  function queryParam(key) {
    try {
      var params = new URLSearchParams(window.location.search || "");
      return String(params.get(key) || "");
    } catch (_e) {
      return "";
    }
  }

  function attachFirstClickTracker() {
    var cta = document.getElementById("td-focus-start-btn");
    if (!cta) return;
    cta.addEventListener("click", function captureFirstClick() {
      if (firstClickCaptured) return;
      firstClickCaptured = true;
      var end = (window.performance && typeof window.performance.now === "function") ? window.performance.now() : Date.now();
      var elapsedMs = Math.max(0, Math.round(end - loadStart));
      appendRecord(STORAGE_KEYS.firstClick, {
        timestamp: nowIso(),
        elapsedMs: elapsedMs,
        elapsedSeconds: Math.round((elapsedMs / 1000) * 10) / 10,
        ctaRisk: elapsedMs > 15000 ? "CTA clarity risk" : "ok",
        page: "teacher-dashboard"
      });
      cta.removeEventListener("click", captureFirstClick);
    });
  }

  function createWowOverlay() {
    var root = document.createElement("div");
    root.className = "td-wow-overlay";
    root.innerHTML = [
      '<section class="td-wow-card" role="dialog" aria-modal="true" aria-label="5-second evaluation">',
      "<h2>First Impression Check (5-Second Test)</h2>",
      "<p>Capture immediate perception before detailed walkthrough.</p>",
      '<div class="td-wow-grid">',
      "<label>Q1: What is this platform for?<textarea id=\"td-wow-q1\" rows=\"2\" required></textarea></label>",
      "<label>Q2: Who is it designed for?<textarea id=\"td-wow-q2\" rows=\"2\" required></textarea></label>",
      "<label>Q3: What would you click first?<textarea id=\"td-wow-q3\" rows=\"2\" required></textarea></label>",
      "<label>Q4: Trust level (1-10)<input id=\"td-wow-q4\" type=\"number\" min=\"1\" max=\"10\" step=\"1\" required></label>",
      "<label>Q5: Time-saving expectation (1-10)<input id=\"td-wow-q5\" type=\"number\" min=\"1\" max=\"10\" step=\"1\" required></label>",
      "</div>",
      '<div class="td-wow-actions">',
      '<button id="td-wow-save" class="td-top-btn btn-primary" type="button">Save Response</button>',
      '<button id="td-wow-export-json" class="td-top-btn" type="button">Export JSON</button>',
      '<button id="td-wow-export-csv" class="td-top-btn" type="button">Export CSV</button>',
      '<button id="td-wow-close" class="td-top-btn" type="button">Close</button>',
      "</div>",
      "</section>"
    ].join("");
    return root;
  }

  function openWowEval() {
    if (document.querySelector(".td-wow-overlay")) return;
    document.body.classList.add("td-wow-eval-active");
    var overlay = createWowOverlay();
    document.body.appendChild(overlay);

    function closeOverlay() {
      document.body.classList.remove("td-wow-eval-active");
      overlay.remove();
    }

    var q1 = overlay.querySelector("#td-wow-q1");
    var q2 = overlay.querySelector("#td-wow-q2");
    var q3 = overlay.querySelector("#td-wow-q3");
    var q4 = overlay.querySelector("#td-wow-q4");
    var q5 = overlay.querySelector("#td-wow-q5");
    var saveBtn = overlay.querySelector("#td-wow-save");
    var closeBtn = overlay.querySelector("#td-wow-close");
    var exportJsonBtn = overlay.querySelector("#td-wow-export-json");
    var exportCsvBtn = overlay.querySelector("#td-wow-export-csv");

    saveBtn.addEventListener("click", function () {
      var trust = Number(q4.value);
      var timeSaving = Number(q5.value);
      if (!q1.value.trim() || !q2.value.trim() || !q3.value.trim()) return;
      if (!Number.isFinite(trust) || trust < 1 || trust > 10) return;
      if (!Number.isFinite(timeSaving) || timeSaving < 1 || timeSaving > 10) return;
      appendRecord(STORAGE_KEYS.wow, {
        timestamp: nowIso(),
        q1_platformPurpose: q1.value.trim(),
        q2_targetUser: q2.value.trim(),
        q3_firstClickTarget: q3.value.trim(),
        trustLevel: trust,
        timeSavingExpectation: timeSaving,
        page: "teacher-dashboard",
        evalMode: "wow"
      });
      closeOverlay();
    });

    closeBtn.addEventListener("click", closeOverlay);
    overlay.addEventListener("click", function (event) {
      if (event.target === overlay) closeOverlay();
    });

    exportJsonBtn.addEventListener("click", function () {
      var rows = readRecords(STORAGE_KEYS.wow);
      download("wow-evaluation.json", JSON.stringify(rows, null, 2), "application/json");
    });

    exportCsvBtn.addEventListener("click", function () {
      var rows = readRecords(STORAGE_KEYS.wow);
      download("wow-evaluation.csv", toCsv(rows), "text/csv");
    });
  }

  function maybeRunWowRoute() {
    if (queryParam("eval").toLowerCase() !== "wow") return;
    setTimeout(function () {
      openWowEval();
    }, 5000);
  }

  function init() {
    attachFirstClickTracker();
    maybeRunWowRoute();
  }

  window.CSWowEvaluator = {
    init: init,
    exportWowJson: function () {
      var rows = readRecords(STORAGE_KEYS.wow);
      download("wow-evaluation.json", JSON.stringify(rows, null, 2), "application/json");
    },
    exportWowCsv: function () {
      var rows = readRecords(STORAGE_KEYS.wow);
      download("wow-evaluation.csv", toCsv(rows), "text/csv");
    }
  };

  document.addEventListener("DOMContentLoaded", init);
})();
