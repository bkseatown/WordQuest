(function workspaceMeetingContentModule(root, factory) {
  if (typeof module === "object" && module.exports) {
    module.exports = factory();
    return;
  }
  root.CSWorkspaceMeetingContent = factory();
})(typeof globalThis !== "undefined" ? globalThis : window, function createWorkspaceMeetingContent() {
  "use strict";

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

  function meetingStudentContext(options) {
    var config = options && typeof options === "object" ? options : {};
    var summary = config.summary || null;
    var model = config.model || { topNeeds: [] };
    var sid = String(config.studentId || "student");
    var topNeeds = (model && Array.isArray(model.topNeeds) ? model.topNeeds : [])
      .slice(0, 3)
      .map(function (n) {
        return n.label || n.skillId || n.id || "priority skill";
      });
    var riskText = summary && summary.risk === "risk" ? "higher support intensity" : "steady support";
    return {
      sid: sid,
      studentName: summary && summary.student ? summary.student.name : sid,
      topNeeds: topNeeds.length ? topNeeds : ["decoding accuracy"],
      riskText: riskText,
      nextMove: summary && summary.nextMove ? summary.nextMove.line : "continue focused practice"
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
        "Priority Skills: " + toneDownFamilyLanguage(context.topNeeds.join(", ")),
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
      "Top Needs",
      context.topNeeds.join(" • "),
      "",
      "Recommended Next Step",
      context.nextMove
    ].join("\n");
  }

  function buildExportHtml(mode, englishText, translatedText, language, options) {
    var config = options && typeof options === "object" ? options : {};
    var MeetingTranslation = config.MeetingTranslation || null;
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

    if (mode === "bilingual") {
      return [
        "<!doctype html><html><head><meta charset='utf-8'><title>Bilingual Meeting Summary</title>",
        "<style>body{font:14px/1.45 -apple-system,Segoe UI,Arial;padding:20px;color:#112}h1{margin:0 0 10px} .grid{display:grid;grid-template-columns:1fr 1fr;gap:16px} pre{white-space:pre-wrap;border:1px solid #ccd;border-radius:8px;padding:10px;background:#f8fbff}</style>",
        "</head><body><h1>Bilingual Meeting Summary</h1><div class='grid'><section><h2>English</h2><pre>",
        safeEnglish,
        "</pre></section><section><h2>",
        langLabel,
        "</h2><pre>",
        safeTranslated || safeEnglish,
        "</pre></section></div></body></html>"
      ].join("");
    }

    return [
      "<!doctype html><html><head><meta charset='utf-8'><title>Meeting Summary</title>",
      "<style>body{font:14px/1.45 -apple-system,Segoe UI,Arial;padding:20px;color:#112}pre{white-space:pre-wrap;border:1px solid #ccd;border-radius:8px;padding:10px;background:#f8fbff}</style>",
      "</head><body><h1>Meeting Summary</h1><pre>",
      mode === "parent" ? safeEnglish : (safeTranslated || safeEnglish),
      "</pre></body></html>"
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
