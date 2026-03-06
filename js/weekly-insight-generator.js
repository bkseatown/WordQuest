(function weeklyInsightGeneratorModule(root, factory) {
  if (typeof module === "object" && module.exports) {
    module.exports = factory();
    return;
  }
  root.CSWeeklyInsightGenerator = factory();
})(typeof globalThis !== "undefined" ? globalThis : window, function createWeeklyInsightGenerator() {
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

  function weekRangeLabel(referenceDate) {
    var today = referenceDate instanceof Date ? referenceDate : new Date();
    var start = new Date(today);
    var day = start.getDay();
    var diff = day === 0 ? -6 : 1 - day;
    start.setDate(start.getDate() + diff);
    var months = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
    return "Week of " + months[start.getMonth()] + " " + start.getDate();
  }

  function inferSubject(context) {
    var subject = toText(context.subject);
    if (subject) return subject;
    var text = [
      context.focus,
      context.curriculum,
      context.lessonContext,
      context.goalLine
    ].map(toText).join(" ").toLowerCase();
    if (text.indexOf("math") >= 0 || text.indexOf("fraction") >= 0 || text.indexOf("number") >= 0) return "Math";
    if (text.indexOf("writing") >= 0 || text.indexOf("sentence") >= 0) return "Writing";
    return "Literacy";
  }

  function inferStrengths(context, subject) {
    var summary = context.summary || {};
    var chips = Array.isArray(summary.evidenceChips) ? summary.evidenceChips : [];
    var strengths = chips.slice(0, 2).map(function (chip) {
      return chip && chip.label ? String(chip.label) + " remained steady" : "";
    });
    if (summary.metrics && Number(summary.metrics.weekDelta || 0) > 0) {
      strengths.unshift("Showed measurable growth in recent " + subject.toLowerCase() + " practice");
    }
    if (summary.nextMove && summary.nextMove.line) {
      strengths.push("Responded well to structured teacher support");
    }
    return uniqueList(strengths.concat(context.strengths || []), 3);
  }

  function inferGrowthFocus(context, subject) {
    var summary = context.summary || {};
    var model = context.model || {};
    var needs = Array.isArray(model.topNeeds) ? model.topNeeds : [];
    var support = context.supportProfile || {};
    var supportNeeds = Array.isArray(support.needs) ? support.needs : [];
    var focus = [];
    if (summary.nextMove && summary.nextMove.line) focus.push(String(summary.nextMove.line));
    needs.slice(0, 2).forEach(function (need) {
      focus.push(need.label || need.skillId || need.id || "");
    });
    supportNeeds.slice(0, 2).forEach(function (need) {
      focus.push(need.label || need.key || "");
    });
    if (!focus.length) focus.push("Continue building confidence in " + subject.toLowerCase() + " explanations");
    return uniqueList(focus, 2);
  }

  function inferRecentActivities(context) {
    var rows = [];
    var sessions = Array.isArray(context.recentSessions) ? context.recentSessions : [];
    var lessonContexts = Array.isArray(context.lessonContexts) ? context.lessonContexts : [];
    lessonContexts.slice(0, 2).forEach(function (row) {
      rows.push(row.title || row.lesson || row.label || "");
    });
    sessions.slice(0, 3).forEach(function (row) {
      rows.push(row.title || row.activity || row.type || row.source || "");
    });
    return uniqueList(rows, 3);
  }

  function inferHomeSupport(subject, growthFocus) {
    var focus = toText((growthFocus || [])[0]).toLowerCase();
    if (subject === "Math") {
      return [
        "Ask your child to explain how they know which answer makes sense.",
        "Use everyday examples to compare numbers, amounts, or fractions."
      ];
    }
    if (subject === "Writing") {
      return [
        "Ask your child to say a sentence aloud before writing it.",
        "Have your child add one transition or connecting word to a short response."
      ];
    }
    if (focus.indexOf("morph") >= 0 || focus.indexOf("word") >= 0) {
      return [
        "Talk about how word parts change the meaning of familiar words.",
        "Read together and pause to notice prefixes, suffixes, or base words."
      ];
    }
    return [
      "Read or review class vocabulary together for 10 minutes.",
      "Ask your child to explain one thing they learned using a full sentence."
    ];
  }

  function sentenceCaseGoal(text) {
    var value = toText(text);
    if (!value) return "Keep practicing the next step with teacher support.";
    return value.charAt(0).toUpperCase() + value.slice(1);
  }

  function generateWeeklyInsights(context) {
    var config = context && typeof context === "object" ? context : {};
    var summary = config.summary || {};
    var student = summary.student || config.studentProfile || {};
    var subject = inferSubject(config);
    var strengths = inferStrengths(config, subject);
    var growthFocus = inferGrowthFocus(config, subject);
    var recentActivities = inferRecentActivities(config);
    var homeSupport = inferHomeSupport(subject, growthFocus);
    var goalLine = sentenceCaseGoal(growthFocus[0] || summary.nextMove && summary.nextMove.line);
    var strengthLine = strengths[0] || "You are showing steady effort in class.";
    return {
      studentName: toText(student.name) || "Student",
      subject: subject,
      weekRange: toText(config.weekRange) || weekRangeLabel(config.referenceDate),
      strengths: strengths.length ? strengths : ["Showed steady participation during support time"],
      growthFocus: growthFocus.length ? growthFocus : ["Continue building the next target skill"],
      recentActivities: recentActivities.length ? recentActivities : ["Class lesson review", "Small group support"],
      suggestedHomeSupport: uniqueList(homeSupport.concat(config.suggestedHomeSupport || []), 3),
      studentReflection: {
        strength: strengthLine,
        nextStep: goalLine,
        goal: "Next week I will keep working on " + goalLine.toLowerCase().replace(/\.$/, "") + "."
      }
    };
  }

  function generateTeacherSummary(insightData) {
    var data = insightData && typeof insightData === "object" ? insightData : {};
    return [
      "Strengths",
      (data.strengths || []).map(function (item) { return "- " + item; }).join("\n"),
      "",
      "Growth Focus",
      (data.growthFocus || []).map(function (item) { return "- " + item; }).join("\n"),
      "",
      "Recent Instructional Activities",
      (data.recentActivities || []).map(function (item) { return "- " + item; }).join("\n"),
      "",
      "Suggested Instructional Moves",
      (data.suggestedHomeSupport || []).slice(0, 2).map(function (item) {
        return "- " + item.replace(/^Ask your child to /i, "Prompt the student to ");
      }).join("\n")
    ].join("\n");
  }

  function generateFamilySummary(insightData) {
    var data = insightData && typeof insightData === "object" ? insightData : {};
    return [
      "What your child worked on this week",
      (data.recentActivities || []).map(function (item) { return "- " + item; }).join("\n"),
      "",
      "What is improving",
      (data.strengths || []).slice(0, 2).map(function (item) { return "- " + item; }).join("\n"),
      "",
      "What we are practicing next",
      (data.growthFocus || []).slice(0, 2).map(function (item) { return "- " + item; }).join("\n"),
      "",
      "How you can help at home",
      (data.suggestedHomeSupport || []).map(function (item) { return "- " + item; }).join("\n")
    ].join("\n");
  }

  function generateStudentReflection(insightData) {
    var data = insightData && typeof insightData === "object" ? insightData : {};
    var reflection = data.studentReflection || {};
    return [
      "Strength",
      reflection.strength || "I kept trying during support time.",
      "",
      "Next Step",
      reflection.nextStep || "I will keep practicing the next step.",
      "",
      "Goal for Next Week",
      reflection.goal || "I will use my support tools and keep going."
    ].join("\n");
  }

  return {
    generateWeeklyInsights: generateWeeklyInsights,
    generateFamilySummary: generateFamilySummary,
    generateStudentReflection: generateStudentReflection,
    generateTeacherSummary: generateTeacherSummary
  };
});
