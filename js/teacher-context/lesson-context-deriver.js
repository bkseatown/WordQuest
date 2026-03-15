(function lessonContextDeriverModule(root, factory) {
  if (typeof module === "object" && module.exports) {
    module.exports = factory();
    return;
  }
  root.CSLessonContextDeriver = factory();
})(typeof globalThis !== "undefined" ? globalThis : window, function createLessonContextDeriver() {
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

  function nonEmptyList(values) {
    return uniqueList(values || []).length ? uniqueList(values || []) : null;
  }

  function inferSubject(context) {
    var text = [
      context.subject,
      context.curriculum,
      context.lesson,
      context.lessonFocus,
      context.notes
    ].map(toText).join(" ").toLowerCase();
    if (text.indexOf("math") >= 0 || text.indexOf("fraction") >= 0 || text.indexOf("illustrative") >= 0 || text.indexOf("bridges") >= 0) return "Math";
    if (text.indexOf("writing") >= 0 || text.indexOf("sentence") >= 0 || text.indexOf("essay") >= 0) return "Writing";
    if (text.indexOf("science") >= 0) return "Science";
    if (text.indexOf("history") >= 0 || text.indexOf("humanities") >= 0) return "Humanities";
    if (text.indexOf("fundations") >= 0 || text.indexOf("wilson") >= 0 || text.indexOf("morph") >= 0 || text.indexOf("phon") >= 0) return "Intervention";
    return toText(context.subject) || "ELA";
  }

  function parseUnitLesson(text) {
    var source = toText(text);
    var unitMatch = source.match(/\bunit\s+([a-z0-9-]+)/i);
    var lessonMatch = source.match(/\blesson\s+([a-z0-9-]+)/i);
    return {
      unit: unitMatch ? "Unit " + unitMatch[1] : "",
      lesson: lessonMatch ? "Lesson " + lessonMatch[1] : ""
    };
  }

  function inferGradeBand(raw) {
    var text = toText(raw);
    if (!text) return "";
    var match = text.match(/\d+/);
    return match ? match[0] : text;
  }

  function inferLanguageDemands(subject, focusText) {
    var text = toText(focusText).toLowerCase();
    var demands = [];
    if (subject === "Math") {
      demands = ["compare", "justify", "explain", "represent"];
      if (text.indexOf("fraction") >= 0) demands.unshift("reason");
    } else if (subject === "Writing") {
      demands = ["organize", "connect", "justify", "revise"];
    } else if (subject === "Science") {
      demands = ["observe", "predict", "compare", "explain"];
    } else if (subject === "Humanities") {
      demands = ["analyze", "cite", "compare", "explain"];
    } else if (subject === "Intervention") {
      demands = ["segment", "blend", "decode", "explain"];
      if (text.indexOf("morph") >= 0) demands = ["analyze", "connect meaning", "segment", "explain"];
    } else {
      demands = ["read", "infer", "compare", "explain"];
    }
    return uniqueList(demands, 5);
  }

  function inferMisconceptions(subject, focusText) {
    var text = toText(focusText).toLowerCase();
    if (subject === "Math" && (text.indexOf("fraction") >= 0 || text.indexOf("denominator") >= 0)) {
      return [
        "Students compare denominators instead of value.",
        "Students ignore numerator meaning.",
        "Students explain an answer without comparison language."
      ];
    }
    if (subject === "Intervention" && (text.indexOf("morph") >= 0 || text.indexOf("prefix") >= 0 || text.indexOf("suffix") >= 0)) {
      return [
        "Students identify parts but miss how meaning shifts.",
        "Students strip affixes without preserving the base word.",
        "Students overgeneralize one affix meaning across words."
      ];
    }
    if (subject === "Writing") {
      return [
        "Students list ideas without connecting them logically.",
        "Students use transitions without clear relationships.",
        "Students summarize evidence instead of explaining it."
      ];
    }
    if (subject === "Science") {
      return [
        "Students name observations without linking them to claims.",
        "Students confuse examples with evidence.",
        "Students skip causal language in explanations."
      ];
    }
    return [
      "Students rely on recall without explaining reasoning.",
      "Students miss key academic vocabulary in responses.",
      "Students need modeled examples before independent work."
    ];
  }

  function inferSupportMoves(subject, focusText) {
    var text = toText(focusText).toLowerCase();
    if (subject === "Math" && text.indexOf("fraction") >= 0) {
      return [
        "Use fraction strips, area models, or number lines before a verbal explanation.",
        "Ask the student to point to the equal amount before naming the fractions.",
        "Have the student explain why the two fractions name the same quantity."
      ];
    }
    if ((subject === "ELA" || subject === "Reading") && (text.indexOf("evidence") >= 0 || text.indexOf("detail") >= 0 || text.indexOf("text") >= 0)) {
      return [
        "Preview two anchor words before the first read, then keep one text-evidence question visible.",
        "Use a short sentence frame such as 'I know ___ because the text says ___.'",
        "Have the student point to the line or phrase before giving the oral answer."
      ];
    }
    if (subject === "Intervention" && (text.indexOf("morph") >= 0 || text.indexOf("prefix") >= 0 || text.indexOf("suffix") >= 0)) {
      return [
        "Build words with morpheme tiles before reading them in context.",
        "Pause on the meaning contribution of each affix.",
        "Link the base word to a known example before transfer."
      ];
    }
    if (subject === "Intervention" && (text.indexOf("fundations") >= 0 || text.indexOf("phonics") >= 0 || text.indexOf("syllable") >= 0 || text.indexOf("dictation") >= 0 || text.indexOf("ar") >= 0 || text.indexOf("or") >= 0)) {
      return [
        "Tap and map two current-pattern words before the student reads independently.",
        "Move quickly from word reading into one dictated phrase or short sentence.",
        "Keep the sound card or syllable cue visible during the transfer task."
      ];
    }
    if (subject === "Writing") {
      return [
        "Model one short claim-and-evidence example aloud before release.",
        "Keep transition stems visible during oral rehearsal and drafting.",
        "Have the student say the sentence before writing it independently."
      ];
    }
    if (subject === "Science" || subject === "Social Studies" || subject === "Humanities") {
      return [
        "Pre-teach two key terms with a picture or quick example before discussion starts.",
        "Keep a two-column note frame visible during partner talk and note-taking.",
        "Have the student say one fact aloud before writing it into notes."
      ];
    }
    if (subject === "Specials" || subject === "Advisory" || subject === "Community") {
      return [
        "Preview where students report first and keep the rotation or agenda visible at the door.",
        "Name the transition expectation before students move with materials.",
        "Check that support students know whether they stay in specials or move to intervention."
      ];
    }
    if (subject === "ELA" || subject === "Reading") {
      return [
        "Preview the task language and one anchor word before students begin reading.",
        "Keep a short response frame visible during discussion or written response.",
        "Ask for one oral answer first, then have the student transfer it to the page."
      ];
    }
    return [
      "Name the target, show one brief example, and start with a visible support.",
      "Have the student rehearse the response aloud before independent work.",
      "Keep one vocabulary or response scaffold visible during the task."
    ];
  }

  function inferTargetSkills(subject, focusText) {
    var text = toText(focusText).toLowerCase();
    if (subject === "Math" && text.indexOf("fraction") >= 0) {
      return ["equivalent fractions", "visual model reasoning", "math explanation"];
    }
    if (subject === "Intervention" && (text.indexOf("morph") >= 0 || text.indexOf("prefix") >= 0 || text.indexOf("suffix") >= 0)) {
      return ["morphology", "word meaning", "word analysis"];
    }
    if (subject === "Writing") {
      return ["sentence construction", "transitions", "academic language"];
    }
    return [subject.toLowerCase() + " reasoning", "academic language"];
  }

  function deriveLessonContext(source) {
    var context = source && typeof source === "object" ? source : {};
    var parsed = parseUnitLesson(context.lesson || context.curriculum);
    var subject = inferSubject(context);
    var focus = toText(context.lessonFocus || context.conceptFocus || context.mainConcept || context.lesson || context.notes);
    var mainConcept = focus || "Lesson focus not fully mapped yet.";
    var languageDemands = uniqueList(
      []
        .concat(context.languageDemands || [])
        .concat(toText(context.languageDemand).split(/[•,]/))
        .concat(inferLanguageDemands(subject, focus)),
      5
    );
    return {
      subject: subject,
      curriculum: toText(context.curriculum) || (subject === "Math" ? "Illustrative Math" : ""),
      unit: toText(context.unit) || parsed.unit,
      lesson: toText(context.lesson) || parsed.lesson,
      lessonFocus: focus,
      mainConcept: mainConcept,
      conceptFocus: toText(context.conceptFocus) || mainConcept,
      languageDemands: languageDemands.length ? languageDemands : inferLanguageDemands(subject, focus),
      misconceptions: uniqueList(nonEmptyList(context.misconceptions) || inferMisconceptions(subject, focus), 4),
      recommendedMoves: uniqueList(nonEmptyList(context.supportMoves) || nonEmptyList(context.recommendedMoves) || inferSupportMoves(subject, focus), 5),
      targetSkills: uniqueList(nonEmptyList(context.targetSkills) || inferTargetSkills(subject, focus), 5),
      gradeBand: inferGradeBand(context.gradeBand || context.grade || context.classGrade || context.rosterGrade),
      rawFocusText: focus
    };
  }

  return {
    deriveLessonContext: deriveLessonContext,
    inferLanguageDemands: inferLanguageDemands,
    inferMisconceptions: inferMisconceptions,
    inferSupportMoves: inferSupportMoves,
    inferTargetSkills: inferTargetSkills
  };
});
