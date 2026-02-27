(function aiAnalysisModule() {
  "use strict";

  function service() {
    return window.CSAIService || null;
  }

  function heuristic(sentence) {
    var svc = service();
    if (svc && typeof svc.heuristicAnalyze === "function") {
      return svc.heuristicAnalyze(sentence);
    }
    return {
      sentence_type: "simple",
      has_reasoning: false,
      detail_score: 1,
      verb_strength: "adequate",
      word_count: String(sentence || "").trim() ? String(sentence).trim().split(/\s+/).length : 0,
      suggested_focus: "reasoning"
    };
  }

  async function analyzeSentence(sentence, options) {
    var svc = service();
    if (svc && typeof svc.analyzeSentence === "function") {
      return svc.analyzeSentence(sentence, options || {});
    }
    return heuristic(sentence);
  }

  async function microCoach(sentence, suggestedFocus, options) {
    var svc = service();
    if (svc && typeof svc.generateMicroCoach === "function") {
      return svc.generateMicroCoach(sentence, suggestedFocus, options || {});
    }
    return "Add one because clause so readers understand why this happened.";
  }

  window.SSAIAnalysis = {
    analyzeSentence: analyzeSentence,
    analyzeSentenceHeuristic: heuristic,
    microCoach: microCoach
  };
})();
