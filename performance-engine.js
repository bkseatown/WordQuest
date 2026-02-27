(function performanceEngineModule() {
  "use strict";

  var KEY = "cs_perf_metrics";
  var MAX_ROWS = 100;
  var schema = window.CSStorageSchema || null;

  function now() {
    return Date.now();
  }

  function safeLoad(key, fallback) {
    if (schema && typeof schema.safeLoadJSON === "function") {
      return schema.safeLoadJSON(key, fallback);
    }
    try {
      var raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : fallback;
    } catch (_e) {
      return fallback;
    }
  }

  function safeSave(key, value) {
    if (schema && typeof schema.safeSaveJSON === "function") {
      schema.safeSaveJSON(key, value);
      return;
    }
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch (_e) {
      // ignore
    }
  }

  function read() {
    var parsed = safeLoad(KEY, []);
    return Array.isArray(parsed) ? parsed : [];
  }

  function write(rows) {
    var list = Array.isArray(rows) ? rows : [];
    if (list.length > MAX_ROWS) {
      list = list.slice(list.length - MAX_ROWS);
    }
    safeSave(KEY, list);
  }

  function append(entry) {
    if (!entry || typeof entry !== "object") return;
    var rows = read();
    rows.push(entry);
    write(rows);
  }

  function summarize(pageKey, lastN) {
    var rows = read().filter(function (r) {
      return !pageKey || String(r.page || "") === String(pageKey);
    });
    var n = Math.max(1, Number(lastN || 10));
    rows = rows.slice(Math.max(0, rows.length - n));
    if (!rows.length) return null;

    var avg = function (field) {
      return rows.reduce(function (sum, r) { return sum + Number(r[field] || 0); }, 0) / rows.length;
    };

    return {
      page: pageKey || "all",
      samples: rows.length,
      avgDclMs: Math.round(avg("dclMs")),
      avgLoadMs: Math.round(avg("loadMs")),
      avgTtfbMs: Math.round(avg("ttfbMs")),
      avgLongTaskMs: Math.round(avg("longTaskMs"))
    };
  }

  function init(pageKey, options) {
    var page = String(pageKey || "unknown");
    var budgetMs = Number(options && options.budgetMs || 2500);
    var longTaskMs = 0;

    try {
      if (typeof PerformanceObserver === "function") {
        var observer = new PerformanceObserver(function (list) {
          var entries = list.getEntries();
          for (var i = 0; i < entries.length; i += 1) {
            longTaskMs += Number(entries[i].duration || 0);
          }
        });
        observer.observe({ type: "longtask", buffered: true });
      }
    } catch (_e) {
      // longtask unsupported
    }

    function capture() {
      try {
        var nav = performance.getEntriesByType && performance.getEntriesByType("navigation");
        var row;
        if (nav && nav[0]) {
          var n = nav[0];
          row = {
            page: page,
            timestamp: now(),
            dclMs: Math.round(Number(n.domContentLoadedEventEnd || 0)),
            loadMs: Math.round(Number(n.loadEventEnd || 0)),
            ttfbMs: Math.round(Number((n.responseStart || 0) - (n.requestStart || 0))),
            longTaskMs: Math.round(longTaskMs),
            budgetMs: budgetMs,
            withinBudget: Number(n.loadEventEnd || 0) > 0 ? Number(n.loadEventEnd) <= budgetMs : false
          };
        } else {
          row = {
            page: page,
            timestamp: now(),
            dclMs: Math.round(performance.timing.domContentLoadedEventEnd - performance.timing.navigationStart),
            loadMs: Math.round(performance.timing.loadEventEnd - performance.timing.navigationStart),
            ttfbMs: Math.round(performance.timing.responseStart - performance.timing.requestStart),
            longTaskMs: Math.round(longTaskMs),
            budgetMs: budgetMs,
            withinBudget: Math.round(performance.timing.loadEventEnd - performance.timing.navigationStart) <= budgetMs
          };
        }
        append(row);
      } catch (_e2) {
        // ignore instrumentation failures
      }
    }

    if (document.readyState === "complete") {
      capture();
    } else {
      window.addEventListener("load", function onLoad() {
        capture();
      }, { once: true });
    }
  }

  window.CSPerformanceEngine = {
    KEY: KEY,
    read: read,
    write: write,
    append: append,
    summarize: summarize,
    init: init
  };
})();
