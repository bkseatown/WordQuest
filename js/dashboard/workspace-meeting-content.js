(function workspaceMeetingContentModule(root, factory) {
  if (typeof module === "object" && module.exports) {
    module.exports = factory();
    return;
  }
  root.CSWorkspaceMeetingContent = factory();
})(typeof globalThis !== "undefined" ? globalThis : window, function createWorkspaceMeetingContent() {
  "use strict";

  var SkillLabels = typeof globalThis !== "undefined" ? globalThis.CSSkillLabels || null : null;
  var AlignmentLoader = typeof globalThis !== "undefined" ? globalThis.CSAlignmentLoader || null : null;

  function toneDownFamilyLanguage(text) {
    return String(text || "")
      .replace(/\bMTSS\b/gi, "school support plan")
      .replace(/\bTier\s*([123])\b/gi, "support level $1")
      .replace(/\bintervention\b/gi, "support")
      .replace(/\bbenchmark\b/gi, "target")
      .replace(/\bdeficit\b/gi, "need")
      .replace(/\bnoncompliant\b/gi, "not yet consistent")
      .replace(/\s{2,}/g, " ")
      .trim();
  }

  function canonicalSkillId(raw) {
    if (SkillLabels && typeof SkillLabels.canonicalSkillId === "function") {
      return String(SkillLabels.canonicalSkillId(raw) || "").trim();
    }
    return String(raw || "").trim();
  }

  function skillLabel(raw) {
    if (SkillLabels && typeof SkillLabels.getSkillLabel === "function") {
      return String(SkillLabels.getSkillLabel(raw) || "").trim();
    }
    return String(raw || "priority skill").trim();
  }

  function standardsForSkill(skillId) {
    if (!AlignmentLoader || typeof AlignmentLoader.getAlignmentForSkill !== "function") return [];
    var row = AlignmentLoader.getAlignmentForSkill(skillId) || {};
    var refs = [];
    ["fishTank", "illustrativeMath"].forEach(function (key) {
      (Array.isArray(row[key]) ? row[key] : []).forEach(function (value) {
        var text = String(value || "").trim();
        if (text && refs.indexOf(text) === -1) refs.push(text);
      });
    });
    return refs.slice(0, 3);
  }

  function swbatGoalForSkill(skillId, fallbackLabel) {
    var id = canonicalSkillId(skillId).toUpperCase();
    var label = String(fallbackLabel || skillLabel(skillId) || "the current target skill").trim();
    if (id.indexOf("LIT.DEC.PHG") === 0) return "SWBAT match sounds to spellings more accurately while reading and spelling words.";
    if (id.indexOf("LIT.DEC.SYL") === 0) return "SWBAT read multisyllabic words more accurately by using syllable types and vowel patterns.";
    if (id.indexOf("LIT.DEC.IRREG") === 0) return "SWBAT read and write high-frequency irregular words more automatically.";
    if (id.indexOf("LIT.FLU.ACC") === 0) return "SWBAT read connected text more accurately and smoothly.";
    if (id.indexOf("LIT.FLU.PRO") === 0) return "SWBAT read connected text with stronger phrasing, pace, and expression.";
    if (id.indexOf("LIT.LANG.VOC") === 0) return "SWBAT use and explain grade-level vocabulary more precisely.";
    if (id.indexOf("LIT.LANG.SYN") === 0) return "SWBAT make meaning from complex sentences with more independence.";
    if (id.indexOf("LIT.WRITE.SENT") === 0) return "SWBAT write complete, clear sentences that match the lesson task.";
    if (id.indexOf("LIT.WRITE.PAR") === 0) return "SWBAT organize ideas into a clear paragraph with evidence and elaboration.";
    if (id.indexOf("NUM.BASE10.PLACEVALUE") === 0) return "SWBAT explain place value and use it to reason about numbers.";
    if (id.indexOf("NUM.FACT.FLUENCY") === 0) return "SWBAT solve basic facts more efficiently and explain the strategy used.";
    if (id.indexOf("NUM.RATIO.REASONING") === 0) return "SWBAT compare quantities and explain ratio reasoning with models and words.";
    return "SWBAT strengthen " + label.charAt(0).toLowerCase() + label.slice(1) + " during class tasks and checks.";
  }

  function buildNeedDetail(need) {
    var row = need && typeof need === "object" ? need : {};
    var id = String(row.skillId || row.id || row.key || "").trim();
    var label = String(row.label || row.skill || row.domain || skillLabel(id) || "priority skill").trim();
    return {
      label: label,
      goal: swbatGoalForSkill(id, label),
      standards: standardsForSkill(id)
    };
  }

  function meetingStudentContext(options) {
    var config = options && typeof options === "object" ? options : {};
    var summary = config.summary || null;
    var model = config.model || { topNeeds: [] };
    var anchors = config.institutionalAnchors || {};
    var sid = String(config.studentId || "student");
    var topNeedDetails = (model && Array.isArray(model.topNeeds) ? model.topNeeds : [])
      .slice(0, 3)
      .map(buildNeedDetail);
    var topNeeds = topNeedDetails.map(function (row) { return row.goal; });
    var riskText = summary && summary.risk === "risk" ? "higher support intensity" : "steady support";
    var evidenceLines = [];
    if (anchors.reading && anchors.reading.classroomData) evidenceLines.push(String(anchors.reading.classroomData));
    if (anchors.reading && anchors.reading.interventionData) evidenceLines.push(String(anchors.reading.interventionData));
    if (anchors.math && anchors.math.classroomData) evidenceLines.push(String(anchors.math.classroomData));
    if (anchors.math && anchors.math.interventionData) evidenceLines.push(String(anchors.math.interventionData));
    return {
      sid: sid,
      studentName: summary && summary.student ? summary.student.name : sid,
      topNeeds: topNeeds.length ? topNeeds : ["decoding accuracy"],
      topNeedDetails: topNeedDetails,
      riskText: riskText,
      nextMove: summary && summary.nextMove ? summary.nextMove.line : "continue focused practice",
      evidenceLines: evidenceLines.slice(0, 3)
    };
  }

  function buildParentActions(context) {
    var hints = [];
    var key = String((context.topNeeds && context.topNeeds[0]) || "").toLowerCase();
    if (/decod|phon|vowel/.test(key)) {
      hints.push("Read together for 10 minutes each day and practice short vowel words.");
      hints.push("Ask your child to tap and blend sounds before reading each word.");
    } else if (/math|number|base|fact/.test(key)) {
      hints.push("Have your child explain one math problem out loud each night.");
      hints.push("Practice quick number facts for 5 minutes using everyday examples.");
    } else if (/writing|sentence|paragraph|syntax/.test(key)) {
      hints.push("Ask your child to write 3 clear sentences about their day.");
      hints.push("Have your child reread and add one detail sentence each night.");
    } else {
      hints.push("Review class vocabulary for 10 minutes each day.");
      hints.push("Ask your child to explain one thing they learned in class.");
    }
    hints.push("Celebrate effort and keep practice short and consistent.");
    return hints.slice(0, 3);
  }

  function buildFamilySummary(context, notesText, actionsText, options) {
    var config = options && typeof options === "object" ? options : {};
    var MeetingTranslation = config.MeetingTranslation || null;
    var actions = MeetingTranslation && typeof MeetingTranslation.splitLines === "function"
      ? MeetingTranslation.splitLines(actionsText)
      : String(actionsText || "").split(/\r?\n/).filter(Boolean);
    var parentActions = buildParentActions(context);
    var checkInDate = new Date(Date.now() + (14 * 86400000)).toISOString().slice(0, 10);
    var sections = [
      "How Your Child Is Doing",
      "Strengths first: " + toneDownFamilyLanguage(context.nextMove) + ".",
      "Growth areas: " + toneDownFamilyLanguage(context.topNeeds.join(", ")) + ".",
      (context.evidenceLines.length ? ("Current evidence: " + toneDownFamilyLanguage(context.evidenceLines.join(" ")) + ".") : ""),
      "",
      "What We Are Working On",
      toneDownFamilyLanguage(notesText || "We are building accuracy, confidence, and consistency in class tasks."),
      "",
      "How the School Is Supporting",
      "- Daily focused support in class",
      "- Weekly progress checks",
      "- Structured practice linked to current goals",
      "",
      "How You Can Help at Home",
      parentActions.map(function (item) { return "- " + item; }).join("\n"),
      "",
      "Next Check-In Date",
      checkInDate,
      "",
      "Action Items",
      (actions.length
        ? actions.slice(0, 5).map(function (item) { return "- " + toneDownFamilyLanguage(item); }).join("\n")
        : "- Continue current home-school support routine")
    ];
    return sections.join("\n");
  }

  function buildMeetingNarrative(format, notesText, actionsText, options) {
    var context = meetingStudentContext(options);
    if (format === "family") {
      return buildFamilySummary(context, notesText, actionsText, options);
    }
    if (format === "optimized") {
      return [
        "Student: " + context.studentName + " (" + context.sid + ")",
        "Highlights: " + toneDownFamilyLanguage(context.nextMove),
        "Priority Skills: " + toneDownFamilyLanguage(context.topNeeds.join(" ")),
        (context.evidenceLines.length ? ("Current evidence: " + toneDownFamilyLanguage(context.evidenceLines.join(" ")) ) : ""),
        "Current Support Signal: " + context.riskText,
        "",
        "Meeting Notes",
        toneDownFamilyLanguage(notesText || "No notes captured."),
        "",
        "Action Items",
        actionsText || "No action items captured.",
        "",
        "Next Move",
        toneDownFamilyLanguage(context.nextMove)
      ].join("\n");
    }
    return [
      "Meeting Notes (" + String(options && options.meetingType || "SSM") + ")",
      "Student: " + context.studentName + " (" + context.sid + ")",
      "Date: " + new Date().toISOString().slice(0, 10),
      "",
      "Agenda / Notes",
      notesText || "No notes captured.",
      "",
      "Action Items",
      actionsText || "No action items captured.",
      "",
      "Instructional Priorities",
      context.topNeeds.join(" • "),
      "",
      "Current Evidence",
      context.evidenceLines.length ? context.evidenceLines.join(" • ") : "Add classroom or intervention evidence.",
      "",
      "Recommended Next Step",
      context.nextMove
    ].join("\n");
  }

  function buildExportHtml(mode, englishText, translatedText, language, options) {
    var config = options && typeof options === "object" ? options : {};
    var MeetingTranslation = config.MeetingTranslation || null;
    var context = meetingStudentContext(config);
    var safeEnglish = String(englishText || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");
    var safeTranslated = String(translatedText || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");
    var langLabel = (MeetingTranslation && typeof MeetingTranslation.languageLabel === "function")
      ? MeetingTranslation.languageLabel(language)
      : String(language || "Target");
    var standardsHtml = context.topNeedDetails && context.topNeedDetails.length
      ? "<section><h2>Instructional Priorities</h2><ul>" + context.topNeedDetails.map(function (row) {
          var refs = Array.isArray(row.standards) && row.standards.length
            ? " <em>Aligned standards:</em> " + row.standards.map(function (ref) { return "<code>" + String(ref || "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;") + "</code>"; }).join(", ")
            : "";
          return "<li><strong>" + String(row.goal || "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;") + "</strong>" + refs + "</li>";
        }).join("") + "</ul></section>"
      : "";

    if (mode === "bilingual") {
      return [
        "<!doctype html><html><head><meta charset='utf-8'><title>Bilingual Meeting Summary</title>",
        "<style>body{font:14px/1.45 -apple-system,Segoe UI,Arial;padding:20px;color:#112}h1{margin:0 0 10px} h2{margin:18px 0 8px} .grid{display:grid;grid-template-columns:1fr 1fr;gap:16px} pre{white-space:pre-wrap;border:1px solid #ccd;border-radius:8px;padding:10px;background:#f8fbff} ul{padding-left:18px} code{background:#eef3fb;border-radius:4px;padding:1px 4px}</style>",
        "</head><body><h1>Bilingual Meeting Summary</h1><div class='grid'><section><h2>English</h2><pre>",
        safeEnglish,
        "</pre></section><section><h2>",
        langLabel,
        "</h2><pre>",
        safeTranslated || safeEnglish,
        "</pre></section></div>",
        standardsHtml,
        "</body></html>"
      ].join("");
    }

    return [
      "<!doctype html><html><head><meta charset='utf-8'><title>Meeting Summary</title>",
      "<style>body{font:14px/1.45 -apple-system,Segoe UI,Arial;padding:20px;color:#112}h2{margin:18px 0 8px} pre{white-space:pre-wrap;border:1px solid #ccd;border-radius:8px;padding:10px;background:#f8fbff} ul{padding-left:18px} code{background:#eef3fb;border-radius:4px;padding:1px 4px}</style>",
      "</head><body><h1>Meeting Summary</h1><pre>",
      mode === "parent" ? safeEnglish : (safeTranslated || safeEnglish),
      "</pre>",
      standardsHtml,
      "</body></html>"
    ].join("");
  }

  return {
    toneDownFamilyLanguage: toneDownFamilyLanguage,
    meetingStudentContext: meetingStudentContext,
    buildParentActions: buildParentActions,
    buildFamilySummary: buildFamilySummary,
    buildMeetingNarrative: buildMeetingNarrative,
    buildExportHtml: buildExportHtml
  };
});
