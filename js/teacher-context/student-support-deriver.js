(function studentSupportDeriverModule(root, factory) {
  if (typeof module === "object" && module.exports) {
    module.exports = factory();
    return;
  }
  root.CSStudentSupportDeriver = factory();
})(typeof globalThis !== "undefined" ? globalThis : window, function createStudentSupportDeriver() {
  "use strict";

  function toText(value) {
    return String(value == null ? "" : value).trim();
  }

  function uniqueList(values, maxItems) {
    var seen = {};
    var out = [];
    (Array.isArray(values) ? values : []).forEach(function (value) {
      var text = toText(value);
      if (!text) return;
      var key = text.toLowerCase();
      if (seen[key]) return;
      seen[key] = true;
      out.push(text);
    });
    return typeof maxItems === "number" ? out.slice(0, maxItems) : out;
  }

  function normalizeTierLabel(value, subject) {
    var text = toText(value);
    var cleanSubject = toText(subject);
    if (!text) return cleanSubject ? "T1 " + cleanSubject : "T1";
    var tierMatch = text.match(/t?\s*([1-4])/i);
    if (tierMatch) {
      return "T" + tierMatch[1] + (cleanSubject ? " " + cleanSubject : "");
    }
    return text;
  }

  function collectGoals(studentSupport, subject) {
    var goals = Array.isArray(studentSupport && studentSupport.goals) ? studentSupport.goals : [];
    var relevant = goals.filter(function (goal) {
      var domain = toText(goal.domain || goal.subject || goal.area).toLowerCase();
      if (!subject) return true;
      return !domain || domain.indexOf(subject.toLowerCase()) >= 0;
    }).map(function (goal) {
      return {
        label: toText(goal.skill || goal.target || goal.label || goal.domain || "Goal focus"),
        domain: toText(goal.domain || goal.subject || goal.area),
        progress: toText(goal.progress || goal.status)
      };
    });
    return relevant.slice(0, 3);
  }

  function collectAccommodations(studentSupport) {
    var rows = Array.isArray(studentSupport && studentSupport.accommodations) ? studentSupport.accommodations : [];
    return uniqueList(rows.map(function (row) {
      return row && typeof row === "object" ? (row.title || row.name || row.label || row.id) : row;
    }), 4);
  }

  function collectCrossDomain(studentSupport, subject) {
    var interventions = Array.isArray(studentSupport && studentSupport.interventions) ? studentSupport.interventions : [];
    return uniqueList(interventions.map(function (row) {
      var domain = toText(row.domain || row.subject || row.area || subject);
      var tier = normalizeTierLabel(row.tier || "", domain);
      if (!domain) return tier;
      return tier.indexOf(domain.toUpperCase()) >= 0 ? tier : tier + " " + domain;
    }).filter(function (label) {
      var lower = label.toLowerCase();
      return subject ? lower.indexOf(subject.toLowerCase()) === -1 : true;
    }), 3);
  }

  function deriveTrend(studentEvidence) {
    var evidence = studentEvidence && typeof studentEvidence === "object" ? studentEvidence : {};
    var deltaValue = evidence.deltaPercent || evidence.delta || evidence.changePercent || evidence.growth || 0;
    var delta = Number(deltaValue);
    if (!Number.isFinite(delta)) delta = 0;
    var confidence = evidence.confidence;
    if (!Number.isFinite(Number(confidence))) confidence = evidence.reliability;
    confidence = Number(confidence);
    if (!Number.isFinite(confidence)) confidence = delta > 0 ? 0.66 : 0.48;
    var label = "Steady";
    if (delta >= 8) label = "Improving";
    else if (delta <= -8) label = "Watch";
    return {
      label: label,
      delta: (delta > 0 ? "+" : "") + Math.round(delta) + "%",
      confidence: Math.max(0, Math.min(1, confidence))
    };
  }

  function deriveKeyMoves(subject, lessonContext, accommodations, goals) {
    var moves = [];
    if (subject === "Math" && lessonContext.rawFocusText.toLowerCase().indexOf("fraction") >= 0) {
      moves.push("Prompt comparison language before independent work.");
      moves.push("Use a quick visual model check before answers.");
    } else if (subject === "Intervention") {
      moves.push("Keep manipulatives or sound boxes visible during practice.");
      moves.push("Model one example before release.");
    } else {
      moves.push("Preview one example and one sentence frame.");
      moves.push("Check for understanding after the first response.");
    }
    if (accommodations.indexOf("sentence frames") >= 0) {
      moves.unshift("Keep sentence frames visible during oral rehearsal.");
    }
    if (goals[0] && goals[0].label) {
      moves.push("Tie feedback to the goal: " + goals[0].label + ".");
    }
    return uniqueList(moves, 4);
  }

  function deriveStudentSupport(student, studentSupport, studentEvidence, lessonContext, subject) {
    var row = student && typeof student === "object" ? student : {};
    var support = studentSupport && typeof studentSupport === "object" ? studentSupport : {};
    var goals = collectGoals(support, subject);
    var accommodations = collectAccommodations(support);
    var tier = normalizeTierLabel(row.tier || support.tier || "", subject);
    var priority = tier;
    var primaryGoal = goals[0] && goals[0].label ? goals[0].label : (toText(row.focus) || "Priority still forming from available data.");
    return {
      studentId: toText(row.id || row.studentId),
      name: toText(row.name || row.studentName || row.id) || "Student",
      gradeBand: toText(row.gradeBand || row.grade),
      tier: tier,
      primaryGoal: primaryGoal,
      supportPriority: priority,
      relatedSupport: collectCrossDomain(support, subject),
      accommodations: accommodations.length ? accommodations : ["visual scaffold"],
      goals: goals,
      needs: Array.isArray(support.needs) ? support.needs.slice(0, 4) : [],
      interventions: Array.isArray(support.interventions) ? support.interventions.slice(0, 4) : [],
      trendSummary: deriveTrend(studentEvidence),
      keyMovesToday: deriveKeyMoves(subject, lessonContext, accommodations, goals),
      accommodationIcons: accommodations.map(function (item) {
        var lower = item.toLowerCase();
        if (lower.indexOf("sentence") >= 0) return "frames";
        if (lower.indexOf("visual") >= 0) return "visual";
        if (lower.indexOf("read aloud") >= 0) return "audio";
        if (lower.indexOf("chunk") >= 0) return "chunk";
        return "support";
      })
    };
  }

  function buildFlexibleGroups(students, lessonContext) {
    var buckets = {};
    (Array.isArray(students) ? students : []).forEach(function (student) {
      var key = toText(student.primaryGoal || student.supportPriority || "Suggested Group");
      if (!buckets[key]) buckets[key] = [];
      buckets[key].push(student);
    });
    var groups = Object.keys(buckets).slice(0, 3).map(function (key, index) {
      var rows = buckets[key];
      return {
        label: "Group " + String.fromCharCode(65 + index),
        focus: key,
        rationale: "Shared support need during " + (lessonContext.mainConcept || "today's lesson"),
        students: rows.map(function (row) { return row.name; }).slice(0, 5),
        studentIds: rows.map(function (row) { return row.studentId; }).slice(0, 5)
      };
    });
    if (groups.length) return groups;
    return [{
      label: "Suggested Group",
      focus: lessonContext.targetSkills[0] || "guided practice",
      rationale: "Use teacher observation to confirm grouping.",
      students: [],
      studentIds: []
    }];
  }

  return {
    deriveStudentSupport: deriveStudentSupport,
    buildFlexibleGroups: buildFlexibleGroups
  };
});
