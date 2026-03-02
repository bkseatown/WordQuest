(function initSkillResolver(root, factory) {
  if (typeof module === "object" && module.exports) {
    module.exports = factory();
  } else {
    root.CSSkillResolver = factory();
  }
})(typeof self !== "undefined" ? self : this, function () {
  "use strict";

  var LEGACY_TO_CANONICAL = {
    "decoding.short_vowels": "LIT.DEC.PHG",
    "decoding.long_vowels": "LIT.DEC.SYL",
    "orthography.pattern_control": "LIT.DEC.SYL",
    "morphology.inflectional": "LIT.MOR.INFLECT",
    "morphology.derivational": "LIT.MOR.DERIV",
    "fluency.pacing": "LIT.FLU.ACC",
    "sentence.syntax_clarity": "LIT.LANG.SYN",
    "writing.elaboration": "LIT.WRITE.SENT",
    "numeracy.fact_fluency": "NUM.FLU.FACT",
    "numeracy.strategy_use": "NUM.STRAT.USE"
  };

  var CANONICAL_TO_FRIENDLY = {
    "LIT.DEC.PHG": "decoding.short_vowels",
    "LIT.DEC.SYL": "decoding.long_vowels",
    "LIT.MOR.INFLECT": "morphology.inflectional",
    "LIT.MOR.DERIV": "morphology.derivational",
    "LIT.FLU.ACC": "fluency.pacing",
    "LIT.LANG.SYN": "sentence.syntax_clarity",
    "LIT.WRITE.SENT": "writing.elaboration",
    "NUM.FLU.FACT": "numeracy.fact_fluency",
    "NUM.STRAT.USE": "numeracy.strategy_use"
  };

  function canonicalizeSkillId(skillId) {
    var id = String(skillId || "").trim();
    if (!id) return "";
    if (id.indexOf("LIT.") === 0 || id.indexOf("NUM.") === 0) return id;
    return LEGACY_TO_CANONICAL[id] || id;
  }

  function toFriendlySkillId(skillId) {
    var id = canonicalizeSkillId(skillId);
    if (!id) return "";
    return CANONICAL_TO_FRIENDLY[id] || id;
  }

  function listAliases() {
    return Object.assign({}, LEGACY_TO_CANONICAL);
  }

  return {
    canonicalizeSkillId: canonicalizeSkillId,
    toFriendlySkillId: toFriendlySkillId,
    listAliases: listAliases,
    LEGACY_TO_CANONICAL: LEGACY_TO_CANONICAL
  };
});
