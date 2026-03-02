(function adminDashboardRuntime() {
  "use strict";

  var schema = window.CSStorageSchema || null;
  if (schema && typeof schema.migrateStorageIfNeeded === "function") {
    schema.migrateStorageIfNeeded();
  }

  var schoolMetricsEl = document.getElementById("admin-school-metrics");
  var classBarsEl = document.getElementById("admin-class-bars");
  var trendInsightsEl = document.getElementById("admin-trend-insights");
  var sasSummaryEl = document.getElementById("admin-sas-summary");

  if (!schoolMetricsEl || !classBarsEl || !trendInsightsEl || !window.CSMultiClassEngine) return;

  function renderStorageWarningIfNeeded() {
    if (!schema || typeof schema.getMigrationStatus !== "function") return;
    var status = schema.getMigrationStatus();
    if (!status || !status.corruptionDetected || !Array.isArray(status.backups) || !status.backups.length) return;
    if (document.getElementById("cs-storage-warning")) return;
    var banner = document.createElement("div");
    banner.id = "cs-storage-warning";
    banner.className = "admin-trend";
    banner.textContent = "Storage was reset due to invalid data. A backup was saved.";
    var root = document.getElementById("admin-root");
    if (root) root.insertBefore(banner, root.firstChild);
  }

  function pct(rate) {
    return window.CSMultiClassEngine.toPercent(rate);
  }

  function animateBar(el, percent) {
    if (!el) return;
    el.style.width = "0%";
    requestAnimationFrame(function () {
      el.style.width = String(Math.max(0, Math.min(100, percent))) + "%";
    });
  }

  function metricRow(label, valueText, percent) {
    return [
      '<div class="admin-metric">',
      '  <div class="admin-metric-head"><span>' + label + '</span><span>' + valueText + '</span></div>',
      '  <div class="admin-bar"><div class="admin-bar-fill" data-fill="' + percent + '"></div></div>',
      '</div>'
    ].join("");
  }

  function renderSnapshot(snapshot, classCount, lastUpdated) {
    var detailPct = Math.round(Math.max(0, Math.min(100, snapshot.avgDetail * 20)));
    var cohesionPct = Math.round(Math.max(0, Math.min(100, snapshot.avgCohesion * 20)));

    schoolMetricsEl.innerHTML = [
      metricRow("Reasoning Rate", pct(snapshot.reasoningRate) + "%", pct(snapshot.reasoningRate)),
      metricRow("Complex Sentence Rate", pct(snapshot.complexRate) + "%", pct(snapshot.complexRate)),
      metricRow("Average Detail", snapshot.avgDetail.toFixed(2) + " / 5", detailPct),
      metricRow("Average Cohesion", snapshot.avgCohesion.toFixed(2) + " / 5", cohesionPct),
      '<div class="admin-muted">Classes: ' + classCount + ' • Total sentences: ' + snapshot.totalSentences + ' • Last updated: ' + (lastUpdated ? new Date(lastUpdated).toLocaleString() : "N/A") + '</div>'
    ].join("");

    Array.prototype.forEach.call(schoolMetricsEl.querySelectorAll("[data-fill]"), function (fill) {
      animateBar(fill, Number(fill.getAttribute("data-fill") || 0));
    });
  }

  function classCard(row) {
    return [
      '<div class="admin-class-card">',
      '  <div class="admin-class-title">' + row.classId + '</div>',
      metricRow("Reasoning", pct(row.reasoningRate) + "%", pct(row.reasoningRate)),
      metricRow("Complex", pct(row.complexRate) + "%", pct(row.complexRate)),
      metricRow("Detail", row.avgDetail.toFixed(2) + " / 5", Math.round(row.avgDetail * 20)),
      metricRow("Cohesion", row.avgCohesion.toFixed(2) + " / 5", Math.round(row.avgCohesion * 20)),
      '</div>'
    ].join("");
  }

  function renderClasses(rows) {
    if (!rows.length) {
      classBarsEl.innerHTML = '<div class="admin-muted">No class aggregates yet. Open Teacher Dashboard and run class snapshots.</div>';
      return;
    }

    classBarsEl.innerHTML = rows.map(classCard).join("");
    Array.prototype.forEach.call(classBarsEl.querySelectorAll("[data-fill]"), function (fill) {
      animateBar(fill, Number(fill.getAttribute("data-fill") || 0));
    });
  }

  function renderTrends(lines) {
    trendInsightsEl.innerHTML = lines.map(function (line) {
      return '<div class="admin-trend">' + line + '</div>';
    }).join("");
  }

  function countBy(rows, keyFn) {
    var out = {};
    (rows || []).forEach(function (row) {
      var key = keyFn(row) || "unspecified";
      out[key] = (out[key] || 0) + 1;
    });
    return out;
  }

  function formatCounts(label, counts) {
    var keys = Object.keys(counts || {});
    if (!keys.length) return '<div class=\"admin-muted\">' + label + ': none</div>';
    return '<div class=\"admin-trend\"><strong>' + label + ':</strong> ' + keys.sort().map(function (k) { return k + ' ' + counts[k]; }).join(' • ') + '</div>';
  }

  function renderSasSummary(pack) {
    if (!sasSummaryEl) return;
    if (!pack || typeof pack !== "object") {
      sasSummaryEl.innerHTML = '<div class=\"admin-muted\">SAS alignment pack not available. Run npm run sas:build.</div>';
      return;
    }
    var interventions = Array.isArray(pack.interventions) ? pack.interventions : [];
    var goals = Array.isArray(pack.goal_bank) ? pack.goal_bank : [];
    var assessments = Array.isArray(pack.assessments) ? pack.assessments : [];

    var byTier = countBy(interventions, function (row) { return row.tier || "unspecified"; });
    var byArea = countBy(interventions, function (row) { return row.area || "unspecified"; });
    var byGrade = countBy(goals, function (row) { return row.grade_band || "unspecified"; });

    sasSummaryEl.innerHTML = [
      '<div class=\"admin-trend\">Docs: ' + ((pack.sourceDocs && pack.sourceDocs.length) || 0) + ' • Interventions: ' + interventions.length + ' • Goals: ' + goals.length + ' • Assessments: ' + assessments.length + '</div>',
      formatCounts('Interventions by tier', byTier),
      formatCounts('Interventions by domain', byArea),
      formatCounts('Goals by grade band', byGrade)
    ].join('');
  }

  function progressionSummary(snapshot) {
    var p = window.CSProgressionEngine;
    if (!p || typeof p.computeSkillLevel !== "function") return "";
    var metrics = {
      reasoningRate: snapshot.reasoningRate,
      avgDetail: snapshot.avgDetail,
      verbStrengthRate: snapshot.verbStrengthRate,
      avgCohesion: snapshot.avgCohesion
    };
    var reasoning = p.computeSkillLevel("reasoning", metrics) + 1;
    var detail = p.computeSkillLevel("detail", metrics) + 1;
    var verb = p.computeSkillLevel("verb_precision", metrics) + 1;
    var cohesion = p.computeSkillLevel("cohesion", metrics) + 1;
    return "Progression levels — Reasoning L" + reasoning + ", Detail L" + detail + ", Verb Precision L" + verb + ", Cohesion L" + cohesion + ".";
  }

  function run() {
    renderStorageWarningIfNeeded();
    var demo = window.CSMultiClassEngine.isDemoMode();
    var school = demo ? window.CSMultiClassEngine.buildDemoSchool() : window.CSMultiClassEngine.readSchoolAnalytics();
    var rows = window.CSMultiClassEngine.classRows(school);
    var work = function () {
      var snapshot = window.CSMultiClassEngine.aggregate(rows);
      renderSnapshot(snapshot, rows.length, school.lastUpdated);
      renderClasses(rows);
      var trends = window.CSMultiClassEngine.trends(snapshot, rows);
      var extra = progressionSummary(snapshot);
      if (extra) trends.push(extra);
      renderTrends(trends);
    };

    if (typeof window.requestIdleCallback === "function") {
      window.requestIdleCallback(work, { timeout: 800 });
    } else {
      window.setTimeout(work, 0);
    }

    if (sasSummaryEl) {
      fetch('./docs/sas/derived/sas_alignment_pack.json', { cache: 'no-cache' })
        .then(function (res) { return res.ok ? res.json() : null; })
        .then(function (pack) { renderSasSummary(pack); })
        .catch(function () { renderSasSummary(null); });
    }
  }

  run();
})();
