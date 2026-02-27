(function fixChaosGameModule() {
  "use strict";

  var ERROR_TYPES = {
    1: ["fragment", "punctuation"],
    2: ["run_on", "missing_reason", "weak_verb"],
    3: ["misplaced_modifier", "redundant"]
  };

  function randomFrom(list) {
    if (!Array.isArray(list) || !list.length) return "fragment";
    return list[Math.floor(Math.random() * list.length)];
  }

  function corrupt(sentence, type) {
    var clean = String(sentence || "").replace(/\s+/g, " ").trim();
    if (!clean) return "The dog ran";

    if (type === "fragment") {
      return clean.replace(/^[A-Z][^\s]*\s+/, "").replace(/[.!?]$/, "");
    }
    if (type === "punctuation") {
      return clean.replace(/[.!?]/g, "");
    }
    if (type === "run_on") {
      return clean.replace(/[.!?]/g, "") + " it kept going";
    }
    if (type === "missing_reason") {
      return clean.replace(/\bbecause\b[^.?!]*/i, "").replace(/\s{2,}/g, " ").trim();
    }
    if (type === "weak_verb") {
      return clean.replace(/\b(sprinted|dashed|raced|bolted|hurried)\b/gi, "went");
    }
    if (type === "misplaced_modifier") {
      return "Running quickly, the backpack fell from the desk.";
    }
    return clean + " very very good";
  }

  function expectedAction(type) {
    if (type === "fragment" || type === "punctuation") return "punctuate";
    if (type === "weak_verb") return "replace";
    return "combine";
  }

  function create() {
    var state = {
      level: 1,
      currentType: "fragment",
      prompt: "Tap the best fix for this sentence.",
      sentence: "",
      rounds: 0
    };

    function determineNextLevel(studentStats) {
      if (!studentStats || !studentStats.has_reasoning) return 1;
      if (studentStats.verb_strength === "adequate") return 2;
      return 3;
    }

    function nextRound(baseSentence, analysis) {
      state.level = determineNextLevel(analysis);
      state.currentType = randomFrom(ERROR_TYPES[state.level] || ERROR_TYPES[1]);
      state.sentence = corrupt(baseSentence, state.currentType);
      state.rounds += 1;
      return { sentence: state.sentence, prompt: state.prompt, level: state.level, type: state.currentType };
    }

    function submit(action) {
      var ok = String(action || "") === expectedAction(state.currentType);
      return {
        correct: ok,
        message: ok ? "Nice repair. Next one increases challenge." : "Not this move. Try another repair action.",
        expected: expectedAction(state.currentType)
      };
    }

    return {
      state: state,
      nextRound: nextRound,
      submit: submit
    };
  }

  window.SSFixChaos = {
    create: create,
    corruptSentence: corrupt
  };
})();
