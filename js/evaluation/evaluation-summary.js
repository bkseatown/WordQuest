(function evaluationSummaryModule() {
  "use strict";

  var STORAGE_KEYS = {
    wow: "cs.eval.wow",
    usability: "cs.eval.usability",
    emotion: "cs.eval.emotion",
    firstClick: "cs.eval.firstclick"
  };

  var EMOTION_SCORES = {
    Empowered: 100,
    Calm: 85,
    Curious: 75,
    Neutral: 60,
    Overwhelmed: 25,
    Confused: 20
  };

  function byId(id) {
    return document.getElementById(id);
  }

  function readRows(key) {
    try {
      var parsed = JSON.parse(localStorage.getItem(key) || "[]");
      return Array.isArray(parsed) ? parsed : [];
    } catch (_e) {
      return [];
    }
  }

  function writeRows(key, rows) {
    try {
      localStorage.setItem(key, JSON.stringify(rows || []));
    } catch (_e) {
      // ignore localStorage failures
    }
  }

  function appendRow(key, row) {
    var rows = readRows(key);
    rows.push(row);
    writeRows(key, rows);
    return rows;
  }

  function avg(values) {
    var valid = (values || []).filter(function (value) { return Number.isFinite(Number(value)); }).map(Number);
    if (!valid.length) return null;
    return valid.reduce(function (sum, value) { return sum + value; }, 0) / valid.length;
  }

  function toScale100(score10) {
    var n = Number(score10);
    if (!Number.isFinite(n)) return null;
    return Math.max(0, Math.min(100, ((n - 1) / 9) * 100));
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

  function normalizeFlag(value) {
    return String(value == null ? "" : value).trim().toLowerCase();
  }

  function readCurriculumMapStats() {
    var stats = { grades: 0, units: 0, lessons: 0 };
    try {
      var api = window.CSCurriculumMap;
      if (!api || typeof api.getIllustrativeMap !== "function") return stats;
      var map = api.getIllustrativeMap();
      if (!map || typeof map !== "object" || Array.isArray(map)) return stats;
      var gradeKeys = Object.keys(map);
      stats.grades = gradeKeys.length;
      gradeKeys.forEach(function (gradeKey) {
        var gradeNode = map[gradeKey];
        if (!gradeNode || typeof gradeNode !== "object") return;
        var unitKeys = Object.keys(gradeNode);
        stats.units += unitKeys.length;
        unitKeys.forEach(function (unitKey) {
          var unitNode = gradeNode[unitKey];
          if (!unitNode || typeof unitNode !== "object") return;
          var lessons = unitNode.lessons && typeof unitNode.lessons === "object" ? Object.keys(unitNode.lessons) : [];
          stats.lessons += lessons.length;
        });
      });
    } catch (_e) {
      return stats;
    }
    return stats;
  }

  function buildAggregate() {
    var wowRows = readRows(STORAGE_KEYS.wow);
    var usabilityRows = readRows(STORAGE_KEYS.usability);
    var emotionRows = readRows(STORAGE_KEYS.emotion);
    var firstClickRows = readRows(STORAGE_KEYS.firstClick);

    var trustScore10 = avg(wowRows.map(function (row) { return Number(row.trustLevel); }));
    var timeSavingScore10 = avg(wowRows.map(function (row) { return Number(row.timeSavingExpectation); }));
    var clarityScore10 = avg(usabilityRows.map(function (row) { return Number(row.clarityOfNextAction); }));
    var confidence10 = avg(usabilityRows.map(function (row) { return Number(row.confidenceInRecommendation); }));
    var mental10 = avg(usabilityRows.map(function (row) { return Number(row.mentalEffort); }));
    var overwhelm10 = avg(usabilityRows.map(function (row) { return Number(row.visualOverwhelm); }));
    var cognitive10 = avg([mental10, overwhelm10]);
    var cognitiveInverse = cognitive10 == null ? null : (100 - toScale100(cognitive10));

    var adoptionYes = usabilityRows.filter(function (row) { return String(row.wouldUseNextWeek || "").toLowerCase() === "yes"; }).length;
    var adoptionRate = usabilityRows.length ? (adoptionYes / usabilityRows.length) * 100 : null;
    var adoptionConfidenceIndex = (adoptionRate == null || confidence10 == null)
      ? null
      : ((adoptionRate * 0.6) + (toScale100(confidence10) * 0.4));

    var emotionScore = avg(emotionRows.map(function (row) {
      return EMOTION_SCORES[String(row.emotion || "")] || 0;
    }));

    var clarity100 = clarityScore10 == null ? null : toScale100(clarityScore10);
    var trust100 = trustScore10 == null ? null : toScale100(trustScore10);
    var adoption100 = adoptionConfidenceIndex == null ? null : Math.max(0, Math.min(100, adoptionConfidenceIndex));
    var emotional100 = emotionScore == null ? null : Math.max(0, Math.min(100, emotionScore));

    var wowIndex = null;
    if (clarity100 != null && trust100 != null && adoption100 != null && cognitiveInverse != null && emotional100 != null) {
      wowIndex = (clarity100 * 0.25) + (trust100 * 0.20) + (adoption100 * 0.25) + (cognitiveInverse * 0.15) + (emotional100 * 0.15);
    }

    var firstClickAvgMs = avg(firstClickRows.map(function (row) { return Number(row.elapsedMs); }));
    var ctaRisk = firstClickAvgMs != null && firstClickAvgMs > 15000;
    var curriculumMapStats = readCurriculumMapStats();
    var curriculumMappedCount = usabilityRows.filter(function (row) {
      return normalizeFlag(row.curriculumMapped) === "yes";
    }).length;
    var curriculumUnmappedCount = Math.max(0, usabilityRows.length - curriculumMappedCount);
    var curriculumCoverageRate = usabilityRows.length ? (curriculumMappedCount / usabilityRows.length) * 100 : null;

    var readiness = "Not ready";
    if (wowIndex != null) {
      if (wowIndex >= 92) readiness = "Institutional Strong";
      else if (wowIndex >= 85) readiness = "Pilot Ready";
      else if (wowIndex >= 70) readiness = "Candidate";
      else readiness = "Not ready";
    }

    return {
      wowRows: wowRows,
      usabilityRows: usabilityRows,
      emotionRows: emotionRows,
      firstClickRows: firstClickRows,
      trustScore10: trustScore10,
      timeSavingScore10: timeSavingScore10,
      clarityScore10: clarityScore10,
      mentalEffort10: mental10,
      visualOverwhelm10: overwhelm10,
      cognitiveLoad10: cognitive10,
      cognitiveLoadInverse: cognitiveInverse,
      confidenceScore10: confidence10,
      adoptionRate: adoptionRate,
      adoptionConfidenceIndex: adoptionConfidenceIndex,
      emotionalEmpowermentScore: emotionScore,
      wowIndex: wowIndex,
      readiness: readiness,
      firstClickAvgMs: firstClickAvgMs,
      ctaClarityRisk: ctaRisk,
      curriculumMappedCount: curriculumMappedCount,
      curriculumUnmappedCount: curriculumUnmappedCount,
      curriculumCoverageRate: curriculumCoverageRate,
      curriculumMapStats: curriculumMapStats
    };
  }

  function renderSummary(summaryEl, chipEl) {
    if (!summaryEl) return;
    var data = buildAggregate();
    var wowIndex = data.wowIndex == null ? "--" : (Math.round(data.wowIndex * 10) / 10).toFixed(1);
    var clarity = data.clarityScore10 == null ? "--" : (Math.round(data.clarityScore10 * 10) / 10).toFixed(1);
    var cognitive = data.cognitiveLoad10 == null ? "--" : (Math.round(data.cognitiveLoad10 * 10) / 10).toFixed(1);
    var adoption = data.adoptionConfidenceIndex == null ? "--" : (Math.round(data.adoptionConfidenceIndex * 10) / 10).toFixed(1);
    var firstClick = data.firstClickAvgMs == null ? "--" : (Math.round(data.firstClickAvgMs / 100) / 10).toFixed(1) + "s";
    var curriculumCoverage = data.curriculumCoverageRate == null
      ? "--"
      : (Math.round(data.curriculumCoverageRate * 10) / 10).toFixed(1) + "% (" + data.curriculumMappedCount + "/" + data.usabilityRows.length + ")";
    summaryEl.innerHTML = [
      "<strong>WOW Index:</strong> " + wowIndex + " / 100",
      " | <strong>Mean clarity:</strong> " + clarity,
      " | <strong>Mean cognitive load:</strong> " + cognitive,
      " | <strong>Adoption confidence index:</strong> " + adoption,
      " | <strong>First CTA click:</strong> " + firstClick,
      " | <strong>Curriculum mapped in-session:</strong> " + curriculumCoverage,
      data.ctaClarityRisk ? ' | <strong>Flag:</strong> CTA clarity risk' : ""
    ].join("");
    if (chipEl) chipEl.textContent = "Readiness: " + data.readiness;
  }

  function buildPilotPacket() {
    var aggregate = buildAggregate();
    return {
      generatedAt: nowIso(),
      summaryMetrics: {
        wowIndex: aggregate.wowIndex == null ? null : Math.round(aggregate.wowIndex * 100) / 100,
        readiness: aggregate.readiness,
        trustScore10: aggregate.trustScore10,
        timeSavingExpectation10: aggregate.timeSavingScore10,
        clarityScore10: aggregate.clarityScore10,
        cognitiveLoad10: aggregate.cognitiveLoad10,
        cognitiveLoadInverse: aggregate.cognitiveLoadInverse,
        adoptionConfidenceIndex: aggregate.adoptionConfidenceIndex,
        emotionalEmpowermentScore: aggregate.emotionalEmpowermentScore,
        firstClickAvgMs: aggregate.firstClickAvgMs,
        ctaClarityRisk: aggregate.ctaClarityRisk,
        curriculumCoverageRate: aggregate.curriculumCoverageRate,
        curriculumMappedCount: aggregate.curriculumMappedCount,
        curriculumUnmappedCount: aggregate.curriculumUnmappedCount
      },
      curriculumCoverage: {
        mapGrades: aggregate.curriculumMapStats.grades,
        mapUnits: aggregate.curriculumMapStats.units,
        mapLessons: aggregate.curriculumMapStats.lessons,
        mappedResponses: aggregate.curriculumMappedCount,
        unmappedResponses: aggregate.curriculumUnmappedCount,
        coverageRatePercent: aggregate.curriculumCoverageRate
      },
      cognitiveLoadMetrics: {
        meanMentalEffort: aggregate.mentalEffort10,
        meanVisualOverwhelm: aggregate.visualOverwhelm10,
        meanCognitiveLoad: aggregate.cognitiveLoad10
      },
      emotionalDistribution: aggregate.emotionRows,
      adoptionLikelihood: {
        adoptionRatePercent: aggregate.adoptionRate,
        adoptionConfidenceIndex: aggregate.adoptionConfidenceIndex
      },
      wowResponses: aggregate.wowRows,
      usabilityResponses: aggregate.usabilityRows,
      firstClickSignals: aggregate.firstClickRows
    };
  }

  function packetToHtml(packet) {
    var m = packet.summaryMetrics || {};
    function line(label, value) {
      return "<tr><th>" + label + "</th><td>" + String(value == null ? "--" : value) + "</td></tr>";
    }
    return [
      "<!doctype html><html><head><meta charset='utf-8'><title>Pilot Evaluation Report</title>",
      "<style>body{font:15px/1.5 Inter,Segoe UI,Arial,sans-serif;color:#0f172a;padding:28px;max-width:900px;margin:0 auto}h1,h2{margin:0 0 10px}h2{margin-top:18px}table{width:100%;border-collapse:collapse}th,td{border:1px solid #d9e2ef;padding:8px 10px;text-align:left}th{width:300px;background:#f6f9fc}pre{white-space:pre-wrap;background:#f6f9fc;border:1px solid #d9e2ef;padding:10px;border-radius:8px}</style>",
      "</head><body>",
      "<h1>Pilot Evaluation Report</h1>",
      "<p>Generated: " + packet.generatedAt + "</p>",
      "<h2>Summary Metrics</h2><table>",
      line("WOW Index", m.wowIndex),
      line("Pilot Readiness", m.readiness),
      line("Trust (1-10)", m.trustScore10),
      line("Time-saving expectation (1-10)", m.timeSavingExpectation10),
      line("Clarity (1-10)", m.clarityScore10),
      line("Cognitive Load (1-10)", m.cognitiveLoad10),
      line("Adoption Confidence Index", m.adoptionConfidenceIndex),
      line("Emotional Empowerment Score", m.emotionalEmpowermentScore),
      line("First CTA Click Avg (ms)", m.firstClickAvgMs),
      line("CTA Clarity Risk", m.ctaClarityRisk ? "Yes" : "No"),
      line("Curriculum Coverage (%)", m.curriculumCoverageRate),
      line("Curriculum Responses Mapped", m.curriculumMappedCount),
      line("Curriculum Responses Unmapped", m.curriculumUnmappedCount),
      "</table>",
      "<h2>Curriculum Coverage</h2><pre>" + JSON.stringify(packet.curriculumCoverage || {}, null, 2) + "</pre>",
      "<h2>Usability Responses</h2><pre>" + JSON.stringify(packet.usabilityResponses || [], null, 2) + "</pre>",
      "<h2>WOW Responses</h2><pre>" + JSON.stringify(packet.wowResponses || [], null, 2) + "</pre>",
      "<h2>Emotional Distribution</h2><pre>" + JSON.stringify(packet.emotionalDistribution || [], null, 2) + "</pre>",
      "</body></html>"
    ].join("");
  }

  function bindUi() {
    var form = byId("td-eval-usability-form");
    if (!form) return;
    var clarityInput = byId("td-eval-clarity");
    var effortInput = byId("td-eval-mental-effort");
    var overwhelmInput = byId("td-eval-overwhelm");
    var confidenceInput = byId("td-eval-confidence");
    var adoptionSelect = byId("td-eval-adoption");
    var institutionalSelect = byId("td-eval-institutional");
    var notesInput = byId("td-eval-notes");
    var saveBtn = byId("td-eval-save");
    var exportJsonBtn = byId("td-eval-export-json");
    var exportCsvBtn = byId("td-eval-export-csv");
    var reportBtn = byId("td-eval-generate-report");
    var summaryEl = byId("td-eval-metrics");
    var reportEl = byId("td-eval-report");
    var readinessChip = byId("td-eval-readiness-chip");
    var curriculumLineEl = byId("td-num-curriculum-line");

    function numValue(input) {
      var n = Number(input && input.value);
      return Number.isFinite(n) ? n : NaN;
    }

    saveBtn.addEventListener("click", function () {
      var clarity = numValue(clarityInput);
      var effort = numValue(effortInput);
      var overwhelm = numValue(overwhelmInput);
      var confidence = numValue(confidenceInput);
      var adoption = String(adoptionSelect && adoptionSelect.value || "");
      var institutional = String(institutionalSelect && institutionalSelect.value || "");
      if (!(clarity >= 1 && clarity <= 10)) return;
      if (!(effort >= 1 && effort <= 10)) return;
      if (!(overwhelm >= 1 && overwhelm <= 10)) return;
      if (!(confidence >= 1 && confidence <= 10)) return;
      if (!adoption || !institutional) return;
      var curriculumLine = curriculumLineEl ? String(curriculumLineEl.textContent || "").trim() : "";
      var curriculumMapped = curriculumLineEl && !curriculumLineEl.classList.contains("hidden") && !!curriculumLine;
      appendRow(STORAGE_KEYS.usability, {
        timestamp: nowIso(),
        clarityOfNextAction: clarity,
        mentalEffort: effort,
        visualOverwhelm: overwhelm,
        confidenceInRecommendation: confidence,
        wouldUseNextWeek: adoption,
        productFeel: institutional,
        notes: String(notesInput && notesInput.value || "").trim(),
        cognitiveLoadScore: Math.round(((effort + overwhelm) / 2) * 10) / 10,
        page: "teacher-dashboard",
        curriculumMapped: curriculumMapped ? "yes" : "no",
        curriculumLine: curriculumLine
      });
      renderSummary(summaryEl, readinessChip);
      if (notesInput) notesInput.value = "";
    });

    exportJsonBtn.addEventListener("click", function () {
      var packet = buildPilotPacket();
      download("pilot-evaluation-packet.json", JSON.stringify(packet, null, 2), "application/json");
    });

    exportCsvBtn.addEventListener("click", function () {
      var rows = readRows(STORAGE_KEYS.usability);
      download("pilot-usability-evaluation.csv", toCsv(rows), "text/csv");
    });

    reportBtn.addEventListener("click", function () {
      var packet = buildPilotPacket();
      var html = packetToHtml(packet);
      if (reportEl) {
        reportEl.classList.remove("hidden");
        reportEl.innerHTML = [
          "<h3>Pilot Evaluation Report Generated</h3>",
          "<p>WOW Index: " + (packet.summaryMetrics.wowIndex == null ? "--" : packet.summaryMetrics.wowIndex) + " • Readiness: " + packet.summaryMetrics.readiness + "</p>",
          "<p>Cognitive load (mean): " + (packet.summaryMetrics.cognitiveLoad10 == null ? "--" : packet.summaryMetrics.cognitiveLoad10) + " • Adoption confidence: " + (packet.summaryMetrics.adoptionConfidenceIndex == null ? "--" : packet.summaryMetrics.adoptionConfidenceIndex) + "</p>"
        ].join("");
      }
      download("pilot-evaluation-report.html", html, "text/html");
    });

    renderSummary(summaryEl, readinessChip);
  }

  function init() {
    bindUi();
  }

  window.CSEvaluationSummary = {
    init: init,
    buildPilotPacket: buildPilotPacket
  };

  document.addEventListener("DOMContentLoaded", init);
})();
