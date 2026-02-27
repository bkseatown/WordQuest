(function aiAnalysisModule() {
  "use strict";

  var lastCallAt = 0;
  var minIntervalMs = 900;

  function normalizeSentence(sentence) {
    return String(sentence || "").replace(/\s+/g, " ").trim();
  }

  function heuristic(sentence) {
    var clean = normalizeSentence(sentence);
    var words = clean ? clean.split(/\s+/).filter(Boolean) : [];
    var lower = clean.toLowerCase();
    var subordinators = ["because", "although", "since", "while", "if", "when", "after", "before"];
    var strongVerbs = ["sprinted", "dashed", "bolted", "lunged", "glared", "shattered", "gripped", "raced", "hurried"];

    var hasReasoning = subordinators.some(function (w) { return lower.indexOf(w) >= 0; });
    var strong = strongVerbs.some(function (v) { return lower.indexOf(v) >= 0; });
    var sentenceType = "simple";
    if (/\b(and|but|so)\b/.test(lower)) sentenceType = "compound";
    if (hasReasoning) sentenceType = "complex";

    return {
      sentence_type: sentenceType,
      has_reasoning: hasReasoning,
      detail_score: words.length > 10 ? 3 : words.length > 7 ? 2 : 1,
      verb_strength: strong ? "strong" : "adequate",
      word_count: words.length,
      suggested_focus: !hasReasoning
        ? "reasoning"
        : strong
          ? "clause_variety"
          : "verb_upgrade"
    };
  }

  function sleep(ms) {
    return new Promise(function (resolve) { setTimeout(resolve, ms); });
  }

  async function analyzeSentence(sentence, options) {
    var opts = options || {};
    var now = Date.now();
    var since = now - lastCallAt;
    if (since < minIntervalMs) await sleep(minIntervalMs - since);
    lastCallAt = Date.now();

    var clean = normalizeSentence(sentence);
    if (!clean) return heuristic(clean);

    if (!opts.endpoint) return heuristic(clean);

    try {
      var res = await fetch(opts.endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sentence: clean })
      });
      if (!res.ok) throw new Error("analysis_failed");
      var json = await res.json();
      if (!json || typeof json !== "object") throw new Error("invalid_json");
      if (typeof json.word_count !== "number") throw new Error("schema_mismatch");
      return json;
    } catch (_err) {
      return heuristic(clean);
    }
  }

  async function microCoach(sentence, suggestedFocus, options) {
    var focus = String(suggestedFocus || "reasoning").toLowerCase();
    var clean = normalizeSentence(sentence);
    var local = {
      reasoning: "Add one because clause so readers understand why this happened.",
      sensory_detail: "Add one sensory detail so readers can see or hear the scene.",
      verb_upgrade: "Swap in a stronger action verb to sharpen your sentence impact.",
      clause_variety: "Add a short opening clause to vary rhythm and sentence control."
    };

    if (!options || !options.coachEndpoint) {
      return local[focus] || "Add one precise detail, then read it aloud for punctuation control.";
    }

    try {
      var res = await fetch(options.coachEndpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sentence: clean, focus: focus })
      });
      if (!res.ok) throw new Error("coach_failed");
      var text = String(await res.text() || "").replace(/\s+/g, " ").trim();
      if (!text) return local[focus] || local.reasoning;
      return text.split(" ").slice(0, 18).join(" ");
    } catch (_err) {
      return local[focus] || local.reasoning;
    }
  }

  window.SSAIAnalysis = {
    analyzeSentence: analyzeSentence,
    analyzeSentenceHeuristic: heuristic,
    microCoach: microCoach
  };
})();
