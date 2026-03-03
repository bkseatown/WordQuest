(function reportingGeneratorModule(root, factory) {
  if (typeof module === "object" && module.exports) {
    module.exports = factory();
    return;
  }
  root.CSReportingGenerator = factory();
})(typeof globalThis !== "undefined" ? globalThis : window, function createReportingGenerator() {
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

  function safeTier(profile, literacyData, numeracyData) {
    var fromProfile = asText(profile && profile.tier, "");
    if (fromProfile) return fromProfile;
    var litTier = asText(literacyData && literacyData.tier, "");
    if (litTier) return litTier;
    var numTier = asText(numeracyData && numeracyData.tierSignal, "");
    if (numTier) return numTier;
    return "Tier 2";
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

  function buildNextSteps(literacyData, numeracyData) {
    var lit = asText(literacyData && literacyData.nextStep, "Keep literacy support targeted and short-cycle.");
    var num = asText(numeracyData && numeracyData.recommendedAction, "Run a numeracy check and adjust strategy support.");
    return [lit, num].filter(Boolean);
  }

  function buildParentSummary(profile, literacyData, numeracyData) {
    var name = asText(profile && profile.name, "Your child");
    var litFocus = asText(literacyData && literacyData.focus, "reading skills");
    var numFocus = asText(numeracyData && numeracyData.contentFocus, "math skills");
    var nextStep = asText((numeracyData && numeracyData.recommendedAction) || (literacyData && literacyData.nextStep), "We will keep practicing the next skill in small steps.");
    return name + " is making steady growth in " + litFocus + " and " + numFocus + ". Next, we will " + nextStep + " We will keep you updated with simple progress notes.";
  }

  function generateStudentReport(studentProfile, literacyData, numeracyData) {
    var profile = studentProfile && typeof studentProfile === "object" ? studentProfile : {};
    var lit = literacyData && typeof literacyData === "object" ? literacyData : {};
    var num = numeracyData && typeof numeracyData === "object" ? numeracyData : {};

    return {
      executiveSummary: buildExecutiveSummary(profile, lit, num),
      literacyProgress: buildLiteracyProgress(lit),
      numeracyProgress: buildNumeracyProgress(num),
      tierStatement: safeTier(profile, lit, num) + " instructional support is recommended at this time.",
      curriculumAlignment: buildCurriculumAlignment(lit, num),
      recommendedNextSteps: buildNextSteps(lit, num),
      parentSummary: buildParentSummary(profile, lit, num)
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
