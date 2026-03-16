(function workspaceReportsModule(root, factory) {
  if (typeof module === "object" && module.exports) {
    module.exports = factory();
    return;
  }
  root.CSWorkspaceReports = factory();
})(typeof globalThis !== "undefined" ? globalThis : window, function createWorkspaceReports() {
  "use strict";

  function summarizeAnchors(anchors) {
    var row = anchors && typeof anchors === "object" ? anchors : {};
    var reading = row.reading || {};
    var writing = row.writing || {};
    var math = row.math || {};
    var literacyBits = [];
    var numeracyBits = [];
    if (reading.aimswebPercentile != null) literacyBits.push("Aimsweb+ percentile " + reading.aimswebPercentile);
    if (reading.mapRIT != null) literacyBits.push("MAP reading RIT " + reading.mapRIT);
    if (reading.classroomData) literacyBits.push(reading.classroomData);
    if (reading.interventionData) literacyBits.push(reading.interventionData);
    if (writing.currentWritingGoal) literacyBits.push("writing goal: " + writing.currentWritingGoal);
    if (writing.classroomData) literacyBits.push(writing.classroomData);
    if (math.mapRIT != null) numeracyBits.push("MAP math RIT " + math.mapRIT);
    if (math.illustrativeCheckpoint) numeracyBits.push("IM checkpoint: " + math.illustrativeCheckpoint);
    if (math.classroomData) numeracyBits.push(math.classroomData);
    if (math.interventionData) numeracyBits.push(math.interventionData);
    return {
      literacy: literacyBits.slice(0, 3),
      numeracy: numeracyBits.slice(0, 3)
    };
  }

  function buildContext(options) {
    var input = options && typeof options === "object" ? options : {};
    var summary = input.summary || null;
    var numeracy = input.numeracy || {};
    var executive = input.executive || { profile: {}, plan: {} };
    var tierSignal = input.tierSignal || {};
    var tierInput = tierSignal.input || {};
    var literacyFrameworks = Array.isArray(input.literacyFrameworks) ? input.literacyFrameworks : [];
    var numeracyFrameworks = Array.isArray(input.numeracyFrameworks) ? input.numeracyFrameworks : [];
    var curriculumLine = String(input.curriculumLine || "").trim();
    var anchors = summarizeAnchors(input.institutionalAnchors);
    var selectedId = String(input.selectedId || "");
    var student = summary && summary.student ? summary.student : {};
    var literacyData = {
      focus: summary ? String(summary.focus || "Foundational literacy") : "Foundational literacy",
      growth: summary && summary.metrics ? Number(summary.metrics.weekDelta || 0.12) : 0.12,
      nextStep: summary && summary.nextMove ? String(summary.nextMove.line || "Continue targeted literacy support.") : "Continue targeted literacy support.",
      tier: String(tierSignal.tierLevel || (summary && summary.metrics ? summary.metrics.tierLabel : "Tier 2")),
      recentAccuracy: Number(tierInput.recentAccuracy || 0.72),
      goalAccuracy: Number(tierInput.goalAccuracy || 0.8),
      stableCount: Number(tierInput.stableCount || 2),
      weeksInIntervention: Number(tierInput.weeksInIntervention || 6),
      fidelitySummary: tierInput.fidelitySummary || { fidelityPercent: 82, totalSessions: 6 },
      curriculumAlignment: "Literacy sequencing follows active instructional pathways where source-backed mapping is available. " + (anchors.literacy.length ? ("Current evidence: " + anchors.literacy.join("; ") + ".") : "Add school and classroom evidence to tighten this line further."),
      frameworkAlignment: literacyFrameworks
    };
    var numeracyData = {
      contentFocus: numeracy.contentFocus,
      strategyStage: numeracy.strategyStage,
      practiceMode: numeracy.practiceMode,
      tierSignal: numeracy.tierSignal,
      recommendedAction: numeracy.recommendedAction,
      executiveSupport: {
        primaryBarrier: executive.profile && executive.profile.primaryBarrier,
        weeklyGoal: executive.plan && executive.plan.weeklyGoal,
        dailySupportActions: executive.plan && executive.plan.dailySupportActions,
        progressMetric: executive.plan && executive.plan.progressMetric,
        parentExplanation: "School is supporting organization and task completion with clear steps, check-ins, and accommodations."
      },
      fidelitySummary: tierInput.fidelitySummary || { fidelityPercent: 82, totalSessions: 6 },
      curriculumAlignment: curriculumLine || ("Numeracy sequencing follows active instructional pathways where source-backed mapping is available. " + (anchors.numeracy.length ? ("Current evidence: " + anchors.numeracy.join("; ") + ".") : "Add math school/classroom/intervention evidence to tighten this line further.")),
      frameworkAlignment: numeracyFrameworks
    };
    var studentProfile = {
      id: String(student.id || selectedId),
      name: String(student.name || "Student"),
      grade: String(student.grade || "G5"),
      tier: literacyData.tier,
      recentAccuracy: Number(tierInput.recentAccuracy || 0.72),
      goalAccuracy: Number(tierInput.goalAccuracy || 0.8),
      stableCount: Number(tierInput.stableCount || 2),
      weeksInIntervention: Number(tierInput.weeksInIntervention || 6)
    };
    return {
      summary: summary,
      studentProfile: studentProfile,
      literacyData: literacyData,
      numeracyData: numeracyData,
      institutionalAnchors: input.institutionalAnchors || null,
      tierSignal: tierSignal,
      fidelityData: tierInput.fidelitySummary || { fidelityPercent: 82, totalSessions: 6 }
    };
  }

  return {
    buildContext: buildContext
  };
});
