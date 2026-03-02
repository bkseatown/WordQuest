(function shareSummaryModule(root, factory) {
  if (typeof module === "object" && module.exports) {
    module.exports = factory();
    return;
  }
  root.CSShareSummary = factory();
})(typeof self !== "undefined" ? self : this, function () {
  "use strict";
  var host = typeof globalThis !== "undefined" ? globalThis : (typeof window !== "undefined" ? window : {});

  function csv(value) {
    return '"' + String(value == null ? "" : value).replace(/"/g, '""') + '"';
  }

  function dateOnly(ts) {
    var d = ts ? new Date(ts) : new Date();
    return Number.isFinite(d.getTime()) ? d.toISOString().slice(0, 10) : new Date().toISOString().slice(0, 10);
  }

  function buildShareSummary(payload) {
    var args = payload && typeof payload === "object" ? payload : {};
    var student = args.studentProfile || {};
    var model = args.skillModel || {};
    var recent = Array.isArray(args.recentSessions) ? args.recentSessions : [];
    var plan = Array.isArray(args.plan) ? args.plan : [];
    var notes = String(args.teacherNotes || "").trim();
    var topNeeds = Array.isArray(model.topNeeds) ? model.topNeeds.slice(0, 4) : [];
    var mastery = model.mastery && typeof model.mastery === "object" ? model.mastery : {};

    var trendSlice = recent.slice(0, 7).map(function (row) {
      var sig = row && row.signals || {};
      return {
        date: dateOnly(row && row.createdAt),
        solved: !!(row && row.outcomes && row.outcomes.solved),
        guesses: Number(sig.guessCount || 0),
        misplaceRate: Number(sig.misplaceRate || 0),
        absentRate: Number(sig.absentRate || 0)
      };
    });
    var deltas = trendSlice.length >= 2
      ? (trendSlice[0].guesses - trendSlice[trendSlice.length - 1].guesses)
      : 0;
    var mtssDecision = null;
    var topSkillId = topNeeds.length && topNeeds[0] ? String(topNeeds[0].skillId || "") : "";
    if (topSkillId && host.CSEvidenceEngine && typeof host.CSEvidenceEngine.computeMtssTrendDecision === "function") {
      mtssDecision = host.CSEvidenceEngine.computeMtssTrendDecision(String(student.id || "demo-student"), topSkillId);
    }

    var text = [
      "Student: " + String(student.name || "Student") + " (" + String(student.id || "demo-student") + ")",
      "Date: " + dateOnly(),
      "Top Needs: " + (topNeeds.length ? topNeeds.map(function (n) { return String(n.skillId || "skill"); }).join(", ") : "Collect baseline"),
      "Current Skill Levels: " + Object.keys(mastery).slice(0, 6).map(function (id) {
        var row = mastery[id] || {};
        return id + " L" + Number(row.level || 0) + " (" + Number(row.mastery || 0) + "%)";
      }).join(" | "),
      "Last 7 Sessions Delta: guesses " + (deltas >= 0 ? "+" : "") + deltas,
      "MTSS Trend Rule: " + (mtssDecision ? (mtssDecision.status + " (" + mtssDecision.points + " pts)") : "Need 6-8 data points"),
      "Today's Plan: " + (plan.length ? plan.map(function (p) {
        return p.title + " (" + Number(p.minutes || 0) + "m)";
      }).join(" -> ") : "Run quick check and regenerate plan")
    ];
    if (notes) text.push("Teacher Notes: " + notes);

    var json = {
      generatedAt: new Date().toISOString(),
      student: student,
      topNeeds: topNeeds,
      skillModel: model,
      recentSessions: recent.slice(0, 7),
      plan: plan,
      teacherNotes: notes
    };

    var csvRows = ["studentId,skillId,skillLabel,level,mastery,lastUpdated,sparklineLast7"];
    Object.keys(mastery).forEach(function (skillId) {
      var row = mastery[skillId] || {};
      csvRows.push([
        csv(student.id || "demo-student"),
        csv(skillId),
        csv(row.label || skillId),
        csv(row.level || 0),
        csv(row.mastery || 0),
        csv(row.lastUpdated || ""),
        csv(Array.isArray(row.sparkline) ? row.sparkline.slice(-7).join("|") : "")
      ].join(","));
    });

    return {
      text: text.join("\n"),
      json: json,
      csv: csvRows.join("\n")
    };
  }

  return {
    buildShareSummary: buildShareSummary
  };
});
