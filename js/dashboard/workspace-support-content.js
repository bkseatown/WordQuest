(function workspaceSupportContentModule(root, factory) {
  if (typeof module === "object" && module.exports) {
    module.exports = factory();
    return;
  }
  root.CSWorkspaceSupportContent = factory();
})(typeof globalThis !== "undefined" ? globalThis : window, function createWorkspaceSupportContent() {
  "use strict";

  function summarizeInstitutionalAnchors(anchors) {
    var row = anchors && typeof anchors === "object" ? anchors : {};
    var reading = row.reading || {};
    var writing = row.writing || {};
    var math = row.math || {};
    var bits = [];
    if (reading.aimswebPercentile != null) bits.push("Aimsweb+ reading percentile " + reading.aimswebPercentile);
    if (reading.mapRIT != null) bits.push("MAP reading RIT " + reading.mapRIT);
    if (reading.classroomData) bits.push("reading classroom evidence: " + reading.classroomData);
    if (reading.interventionData) bits.push("reading intervention evidence: " + reading.interventionData);
    if (writing.currentWritingGoal) bits.push("writing goal: " + writing.currentWritingGoal);
    if (writing.classroomData) bits.push("writing classroom evidence: " + writing.classroomData);
    if (writing.interventionData) bits.push("writing intervention evidence: " + writing.interventionData);
    if (math.mapRIT != null) bits.push("MAP math RIT " + math.mapRIT);
    if (math.illustrativeCheckpoint) bits.push("math checkpoint: " + math.illustrativeCheckpoint);
    if (math.classroomData) bits.push("math classroom evidence: " + math.classroomData);
    if (math.interventionData) bits.push("math intervention evidence: " + math.interventionData);
    return bits.slice(0, 4);
  }

  function buildShareSummaryText(options) {
    var config = options && typeof options === "object" ? options : {};
    var summary = config.summary || null;
    var sessions = Array.isArray(config.sessions) ? config.sessions : [];
    var anchorSummary = summarizeInstitutionalAnchors(config.institutionalAnchors);
    if (!summary) return "";
    var row = sessions[0] || {};
    var sig = row.signals || {};
    var recommendation = config.recommendation || { bullets: [summary.nextMove && summary.nextMove.line || "Continue focused support."] };
    var lines = [
      "Student: " + summary.student.name + " (" + summary.student.id + ")",
      "Date: " + new Date().toISOString().slice(0, 10),
      "Activity: Word Quest (90s)",
      "Observed:",
      "- Attempts: " + (row.outcomes && row.outcomes.attemptsUsed != null ? row.outcomes.attemptsUsed : "--"),
      "- Vowel swaps: " + (sig.vowelSwapCount != null ? sig.vowelSwapCount : "--"),
      "- Repeat same slot: " + (sig.repeatSameBadSlotCount != null ? sig.repeatSameBadSlotCount : "--"),
      "Next step (Tier 2):",
      "- " + (recommendation.bullets && recommendation.bullets[0] ? recommendation.bullets[0] : (summary.nextMove && summary.nextMove.line || "")),
      "Progress note:",
      "- " + (summary.nextMove && summary.nextMove.line || "")
    ];
    if (anchorSummary.length) {
      lines.push("Current evidence:");
      anchorSummary.forEach(function (line) {
        lines.push("- " + line);
      });
    }
    return lines.join("\n");
  }

  function buildSharePayload(options) {
    var config = options && typeof options === "object" ? options : {};
    var sid = String(config.studentId || "");
    var summary = config.summary || null;
    if (!summary) {
      return { text: "", json: {}, csv: "" };
    }
    var model = config.model || { studentId: sid, mastery: {}, topNeeds: [] };
    var recentSessions = Array.isArray(config.recentSessions) ? config.recentSessions : [];
    var plan = Array.isArray(config.plan) ? config.plan : [];
    var teacherNotes = String(config.teacherNotes || "");
    if (config.ShareSummaryAPI && typeof config.ShareSummaryAPI.buildShareSummary === "function") {
      return config.ShareSummaryAPI.buildShareSummary({
        studentId: sid,
        studentProfile: summary.student,
        skillModel: model,
        recentSessions: recentSessions,
        plan: plan,
        teacherNotes: teacherNotes
      });
    }
      var fallbackText = buildShareSummaryText({
        summary: summary,
        sessions: recentSessions,
        recommendation: config.recommendation,
        institutionalAnchors: config.institutionalAnchors
      });
      return {
        text: fallbackText,
        json: {
          studentId: sid,
          student: summary.student,
          topNeeds: model.topNeeds || [],
          skillModel: model,
          recentSessions: recentSessions,
          plan: plan,
          teacherNotes: teacherNotes,
          institutionalAnchors: config.institutionalAnchors || null
        },
        csv: "studentId,summary\\n\"" + sid + "\",\"" + fallbackText.replace(/\"/g, '""') + "\""
      };
  }

  return {
    buildShareSummaryText: buildShareSummaryText,
    buildSharePayload: buildSharePayload
  };
});
