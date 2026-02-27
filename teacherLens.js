(function teacherLensModule() {
  "use strict";

  function derive(analysis, sentence) {
    var a = analysis || {};
    var text = String(sentence || "");
    var clauses = (text.match(/\b(because|although|when|if|while|since|after|before)\b/gi) || []).length;
    var adjectives = (text.match(/\b\w+(?:y|ful|ous|ive|less|al|ic)\b/gi) || []).length;
    var strongVerb = String(a.verb_strength || "adequate") === "strong";

    var skillTag = "Developing sentence";
    if (a.sentence_type === "complex" && !!a.has_reasoning) skillTag = "Reasoned sentence";
    if (Number(a.detail_score || 0) >= 4) skillTag = "Detailed sentence";
    if (a.sentence_type === "complex" && strongVerb) skillTag = "Complex control sentence";

    var grouping = "Core";
    if (Number(a.detail_score || 0) < 2) grouping = "Tier 2";
    if (!a.has_reasoning) grouping = "Tier 2";
    if (strongVerb && clauses > 0) grouping = "Core";

    var clarity = Math.max(0, Math.min(5, (a.word_count >= 5 ? 2 : 1) + (a.word_count <= 16 ? 2 : 1) + (strongVerb ? 1 : 0)));
    var detail = Math.max(0, Math.min(5, Number(a.detail_score || 0) + (adjectives > 0 ? 1 : 0)));
    var reasoning = Math.max(0, Math.min(5, (a.has_reasoning ? 3 : 1) + Math.min(2, clauses)));
    var control = Math.max(0, Math.min(5, (/[.!?]$/.test(text) ? 2 : 0) + (text && /^[A-Z]/.test(text) ? 1 : 0) + (strongVerb ? 1 : 0) + 1));

    var wordCount = Number(a.word_count || 0);
    var level = 1;
    if (wordCount >= 6) level = 2;
    if (wordCount >= 11) level = 3;
    if (a.has_reasoning) level = 4;
    if (a.has_reasoning && strongVerb) level = 5;

    return {
      skillTag: skillTag,
      grouping: grouping,
      clauses: clauses,
      adjectives: adjectives,
      strongVerb: strongVerb,
      level: level,
      metrics: {
        clarity: clarity,
        detail: detail,
        reasoning: reasoning,
        control: control
      }
    };
  }

  function buildSnapshot(sentences, analyses) {
    var total = Math.max(1, sentences.length);
    var simple = 0;
    var complex = 0;
    var reasoning = 0;
    var strong = 0;
    analyses.forEach(function (a) {
      if (!a) return;
      if (a.sentence_type === "simple") simple += 1;
      if (a.sentence_type === "complex") complex += 1;
      if (a.has_reasoning) reasoning += 1;
      if (a.verb_strength === "strong") strong += 1;
    });

    return {
      simplePct: Math.round((simple / total) * 100),
      complexPct: Math.round((complex / total) * 100),
      reasoningPct: Math.round((reasoning / total) * 100),
      strongVerbPct: Math.round((strong / total) * 100),
      lesson: reasoning / total < 0.5
        ? "Suggested mini-lesson: Model complex sentences using subordinating conjunctions."
        : "Suggested mini-lesson: Upgrade verbs and sentence rhythm with punctuation pauses."
    };
  }

  window.SSTeacherLens = {
    derive: derive,
    buildSnapshot: buildSnapshot
  };
})();
