(function weeklyInsightGeneratorModule(root, factory) {
  if (typeof module === "object" && module.exports) {
    module.exports = factory();
    return;
  }
  root.CSWeeklyInsightGenerator = factory();
})(typeof globalThis !== "undefined" ? globalThis : window, function createWeeklyInsightGenerator() {
  "use strict";

  var SkillLabels = globalThis.CSSkillLabels || null;
  var AlignmentLoader = globalThis.CSAlignmentLoader || null;

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

  function canonicalSkillId(raw) {
    return String(raw || "").trim().toUpperCase();
  }

  function skillLabel(raw) {
    var id = canonicalSkillId(raw);
    if (!id) return "";
    if (SkillLabels && typeof SkillLabels[id] === "string" && SkillLabels[id]) return String(SkillLabels[id]);
    return "";
  }

  function standardsForSkill(skillId) {
    if (!AlignmentLoader || typeof AlignmentLoader.getAlignmentForSkill !== "function") return [];
    var row = AlignmentLoader.getAlignmentForSkill(skillId) || {};
    return uniqueList([]
      .concat(Array.isArray(row.fishTank) ? row.fishTank : [])
      .concat(Array.isArray(row.illustrativeMath) ? row.illustrativeMath : [])
      .concat(Array.isArray(row.elEducation) ? row.elEducation : [])
      .map(function (item) { return toText(item); }), 3);
  }

  function swbatGoalForSkill(skillId, fallbackLabel) {
    var id = canonicalSkillId(skillId);
    var label = toText(fallbackLabel || skillLabel(skillId) || "the current target skill");
    if (id.indexOf("LIT.DEC.PHG") === 0) return "SWBAT match sounds to spellings more accurately while reading and spelling words.";
    if (id.indexOf("LIT.DEC.SYL") === 0) return "SWBAT read multisyllabic words more accurately by using syllable types and vowel patterns.";
    if (id.indexOf("LIT.DEC.IRREG") === 0) return "SWBAT read and write high-frequency irregular words more automatically.";
    if (id.indexOf("LIT.FLU") === 0) return "SWBAT read connected text more smoothly and accurately while keeping meaning.";
    if (id.indexOf("LIT.COMP") === 0) return "SWBAT explain what they read using evidence from the text.";
    if (id.indexOf("WRITE") >= 0 || id.indexOf("WRI.") >= 0) return "SWBAT write clearer sentences and organize ideas with stronger evidence.";
    if (id.indexOf("NUM") === 0 || id.indexOf("MATH") === 0) return "SWBAT explain their math thinking and solve problems more accurately using a clear strategy.";
    if (label) return "SWBAT strengthen " + label.toLowerCase() + " with less prompting.";
    return "SWBAT strengthen the current target skill with less prompting.";
  }

  function normalizeNeed(need) {
    var row = need && typeof need === "object" ? need : {};
    var label = toText(row.label || skillLabel(row.skillId || row.id || row.key));
    var goal = swbatGoalForSkill(row.skillId || row.id || row.key, label);
    return {
      label: label,
      goal: goal,
      standards: standardsForSkill(row.skillId || row.id || row.key)
    };
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
      var detail = normalizeNeed(need);
      focus.push(detail.goal || detail.label);
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

  function inferEvidence(context) {
    var support = context.supportProfile || {};
    var anchors = context.institutionalAnchors || support.institutionalAnchors || {};
    var evidence = [];
    if (anchors.reading && anchors.reading.classroomData) evidence.push(String(anchors.reading.classroomData));
    if (anchors.reading && anchors.reading.interventionData) evidence.push(String(anchors.reading.interventionData));
    if (anchors.writing && anchors.writing.classroomData) evidence.push(String(anchors.writing.classroomData));
    if (anchors.math && anchors.math.classroomData) evidence.push(String(anchors.math.classroomData));
    if (anchors.math && anchors.math.interventionData) evidence.push(String(anchors.math.interventionData));
    return uniqueList(evidence, 3);
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
    var evidence = inferEvidence(config);
    var homeSupport = inferHomeSupport(subject, growthFocus);
    var goalLine = sentenceCaseGoal(growthFocus[0] || summary.nextMove && summary.nextMove.line);
    var strengthLine = strengths[0] || "You are showing steady effort in class.";
    var standards = uniqueList((Array.isArray(config.model && config.model.topNeeds) ? config.model.topNeeds : []).reduce(function (acc, need) {
      return acc.concat(normalizeNeed(need).standards || []);
    }, []), 4);
    return {
      studentName: toText(student.name) || "Student",
      subject: subject,
      weekRange: toText(config.weekRange) || weekRangeLabel(config.referenceDate),
      strengths: strengths.length ? strengths : ["Showed steady participation during support time"],
      growthFocus: growthFocus.length ? growthFocus : ["Continue building the next target skill"],
      recentActivities: recentActivities.length ? recentActivities : ["Class lesson review", "Small group support"],
      evidence: evidence,
      standards: standards,
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
      "Current Evidence",
      (data.evidence || []).length
        ? (data.evidence || []).map(function (item) { return "- " + item; }).join("\n")
        : "- Add classroom or intervention evidence to sharpen the next move.",
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
      "What we are seeing in class",
      (data.evidence || []).length
        ? (data.evidence || []).slice(0, 2).map(function (item) { return "- " + item; }).join("\n")
        : "- We are continuing to gather classroom and support evidence.",
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
