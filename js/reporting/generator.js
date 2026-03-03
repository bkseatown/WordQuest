(function reportingGeneratorModule(root, factory) {
  if (typeof module === "object" && module.exports) {
    module.exports = factory(root || globalThis);
    return;
  }
  root.CSReportingGenerator = factory(root || globalThis);
})(typeof globalThis !== "undefined" ? globalThis : window, function createReportingGenerator(root) {
  "use strict";

  function asText(value, fallback) {
    var raw = String(value == null ? "" : value).trim();
    return raw || String(fallback || "");
  }

  function asNumber(value, fallback) {
    var n = Number(value);
    return Number.isFinite(n) ? n : Number(fallback || 0);
  }

  function pct(value, fallback) {
    var n = asNumber(value, fallback);
    if (n > 1) n = n / 100;
    n = Math.max(0, Math.min(1, n));
    return Math.round(n * 100) + "%";
  }

  function defaultTierSignal() {
    return {
      tierLevel: "Tier 2",
      trendDecision: "HOLD",
      reasoning: ["Tier signal fallback applied."]
    };
  }

  function computeTier(profile, literacyData, numeracyData, fidelitySummary) {
    var TierEngine = root && root.CSTierEngine;
    if (!TierEngine || typeof TierEngine.computeTierSignal !== "function") return defaultTierSignal();
    return TierEngine.computeTierSignal({
      recentAccuracy: asNumber(profile && profile.recentAccuracy, asNumber(literacyData && literacyData.recentAccuracy, 0.72)),
      goalAccuracy: asNumber(profile && profile.goalAccuracy, asNumber(literacyData && literacyData.goalAccuracy, 0.8)),
      stableCount: asNumber(profile && profile.stableCount, asNumber(literacyData && literacyData.stableCount, 2)),
      weeksInIntervention: asNumber(profile && profile.weeksInIntervention, asNumber(literacyData && literacyData.weeksInIntervention, 6)),
      fidelityPercent: asNumber((fidelitySummary && fidelitySummary.fidelityPercent), 85)
    });
  }

  function buildExecutiveSummary(profile, literacyData, numeracyData) {
    var name = asText(profile && profile.name, "This student");
    var litFocus = asText(literacyData && literacyData.focus, "literacy targets");
    var numFocus = asText(numeracyData && numeracyData.contentFocus, "numeracy targets");
    return name + " is showing progress with support. Current instruction is focused on " + litFocus + " and " + numFocus + ".";
  }

  function buildLiteracyProgress(literacyData) {
    var focus = asText(literacyData && literacyData.focus, "Foundational reading");
    var growth = pct(literacyData && literacyData.growth, 0.12);
    var next = asText(literacyData && literacyData.nextStep, "Continue targeted guided practice.");
    return "Focus: " + focus + " | Growth signal: " + growth + " | Next: " + next;
  }

  function buildNumeracyProgress(numeracyData) {
    var focus = asText(numeracyData && numeracyData.contentFocus, "Number Fluency");
    var stage = asText(numeracyData && numeracyData.strategyStage, "Additive");
    var practice = asText(numeracyData && numeracyData.practiceMode, "Quick Check");
    return "Focus: " + focus + " | Strategy stage: " + stage + " | Practice mode: " + practice;
  }

  function buildCurriculumAlignment(literacyData, numeracyData) {
    var lit = asText(literacyData && literacyData.curriculumAlignment, "Literacy pathway aligned to current scope and sequence.");
    var num = asText(numeracyData && numeracyData.curriculumAlignment, "Numeracy pathway aligned where curriculum mapping is available.");
    return lit + " " + num;
  }

  function buildInstructionalFrameworkAlignment(literacyData, numeracyData) {
    var registry = root && root.CSFrameworkRegistry;
    var lit = Array.isArray(literacyData && literacyData.frameworkAlignment) ? literacyData.frameworkAlignment : [];
    var num = Array.isArray(numeracyData && numeracyData.frameworkAlignment) ? numeracyData.frameworkAlignment : [];
    if (!lit.length && registry && typeof registry.getFrameworkAlignment === "function") {
      var litRaw = registry.getFrameworkAlignment(literacyData && literacyData.focus);
      lit = [];
      if (litRaw && litRaw.scienceOfReading) lit.push("Science of Reading Aligned");
      if (litRaw && litRaw.structuredLiteracy) lit.push("Structured Literacy");
      if (litRaw && litRaw.mtssTieredModel) lit.push("MTSS Tier Logic");
      if (litRaw && litRaw.progressMonitoring) lit.push("Progress Monitoring Supported");
    }
    if (!num.length && registry && typeof registry.getFrameworkAlignment === "function") {
      var numRaw = registry.getFrameworkAlignment(numeracyData && numeracyData.contentFocus);
      num = [];
      if (numRaw && numRaw.illustrativeMath) num.push("Illustrative Math Aligned");
      if (numRaw && numRaw.mtssTieredModel) num.push("MTSS Tier Logic");
      if (numRaw && numRaw.progressMonitoring) num.push("Progress Monitoring Supported");
    }
    var merged = lit.concat(num).filter(Boolean).filter(function (item, idx, arr) {
      return arr.indexOf(item) === idx;
    });
    if (!merged.length) {
      return "MTSS Tier Logic; Progress Monitoring Supported";
    }
    return merged.join("; ");
  }

  function buildNextSteps(literacyData, numeracyData) {
    var lit = asText(literacyData && literacyData.nextStep, "Keep literacy support targeted and short-cycle.");
    var num = asText(numeracyData && numeracyData.recommendedAction, "Run a numeracy check and adjust strategy support.");
    return [lit, num].filter(Boolean);
  }

  function buildFidelitySummary(profile, fidelitySummary) {
    var sessions = Math.max(0, Math.round(asNumber(fidelitySummary && fidelitySummary.totalSessions, 0)));
    var avg = Math.round(asNumber(fidelitySummary && fidelitySummary.fidelityPercent, 0));
    var weeks = Math.max(1, Math.round(asNumber(profile && profile.weeksInIntervention, 6)));
    return "Total sessions: " + sessions + " | Average fidelity: " + avg + "% | Duration: " + weeks + " weeks";
  }

  function buildParentSummary(profile, literacyData, numeracyData, fidelitySummary) {
    var name = asText(profile && profile.name, "Your child");
    var litFocus = asText(literacyData && literacyData.focus, "reading skills");
    var numFocus = asText(numeracyData && numeracyData.contentFocus, "math skills");
    var nextStep = asText((numeracyData && numeracyData.recommendedAction) || (literacyData && literacyData.nextStep), "We will keep practicing the next skill in small steps.");
    var sessions = Math.max(0, Math.round(asNumber(fidelitySummary && fidelitySummary.totalSessions, 0)));
    var avg = Math.round(asNumber(fidelitySummary && fidelitySummary.fidelityPercent, 0));
    return name + " is making steady growth in " + litFocus + " and " + numFocus + ". Next, we will " + nextStep + " The intervention has been delivered consistently over " + sessions + " sessions, averaging " + avg + "% of planned instructional time.";
  }

  function generateStudentReport(studentProfile, literacyData, numeracyData) {
    var profile = studentProfile && typeof studentProfile === "object" ? studentProfile : {};
    var lit = literacyData && typeof literacyData === "object" ? literacyData : {};
    var num = numeracyData && typeof numeracyData === "object" ? numeracyData : {};
    var fidelitySummary = num && num.fidelitySummary && typeof num.fidelitySummary === "object"
      ? num.fidelitySummary
      : (lit && lit.fidelitySummary && typeof lit.fidelitySummary === "object" ? lit.fidelitySummary : { fidelityPercent: 0, totalSessions: 0 });
    var tierSignal = computeTier(profile, lit, num, fidelitySummary);

    return {
      executiveSummary: buildExecutiveSummary(profile, lit, num),
      literacyProgress: buildLiteracyProgress(lit),
      numeracyProgress: buildNumeracyProgress(num),
      tierStatement: String(tierSignal.tierLevel || "Tier 2") + " instructional support is recommended at this time. Trend decision: " + String(tierSignal.trendDecision || "HOLD") + ".",
      curriculumAlignment: buildCurriculumAlignment(lit, num),
      instructionalFrameworkAlignment: buildInstructionalFrameworkAlignment(lit, num),
      recommendedNextSteps: buildNextSteps(lit, num),
      interventionFidelitySummary: buildFidelitySummary(profile, fidelitySummary),
      tierDecisionExplanation: Array.isArray(tierSignal.reasoning) ? tierSignal.reasoning.slice(0, 4).join(" ") : "",
      parentSummary: buildParentSummary(profile, lit, num, fidelitySummary)
    };
  }

  function translateReport(report, language) {
    var target = String(language || "en").toLowerCase();
    if (target === "en") return report;
    var labelMap = {
      zh: "Mandarin",
      es: "Spanish",
      hi: "Hindi"
    };
    var label = labelMap[target] || target;
    return {
      executiveSummary: "[" + label + " placeholder] " + asText(report && report.executiveSummary, ""),
      literacyProgress: "[" + label + " placeholder] " + asText(report && report.literacyProgress, ""),
      numeracyProgress: "[" + label + " placeholder] " + asText(report && report.numeracyProgress, ""),
      tierStatement: "[" + label + " placeholder] " + asText(report && report.tierStatement, ""),
      curriculumAlignment: "[" + label + " placeholder] " + asText(report && report.curriculumAlignment, ""),
      instructionalFrameworkAlignment: "[" + label + " placeholder] " + asText(report && report.instructionalFrameworkAlignment, ""),
      interventionFidelitySummary: "[" + label + " placeholder] " + asText(report && report.interventionFidelitySummary, ""),
      tierDecisionExplanation: "[" + label + " placeholder] " + asText(report && report.tierDecisionExplanation, ""),
      recommendedNextSteps: Array.isArray(report && report.recommendedNextSteps)
        ? report.recommendedNextSteps.map(function (step) { return "[" + label + " placeholder] " + asText(step, ""); })
        : [],
      parentSummary: "[" + label + " placeholder] " + asText(report && report.parentSummary, "")
    };
  }

  return {
    generateStudentReport: generateStudentReport,
    translateReport: translateReport
  };
});
