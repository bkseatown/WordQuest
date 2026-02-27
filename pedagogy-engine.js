(function pedagogyEngineModule() {
  "use strict";

  var CS_SKILLS = {
    reasoning: {
      description: "Uses subordinating conjunctions to explain cause or contrast",
      targets: ["because", "although", "since", "if", "while"]
    },
    detail: {
      description: "Adds specific, concrete information",
      scale: "0-5"
    },
    verb_precision: {
      description: "Uses strong, specific verbs instead of vague ones"
    },
    cohesion: {
      description: "Links sentences logically using transitions or clause structure"
    },
    sentence_control: {
      description: "Maintains grammatical completeness and punctuation control"
    }
  };

  var VALID_PRIMARY = ["reasoning", "detail", "verb_precision", "cohesion", "sentence_control"];
  var DEFAULT_LENS = {
    studentTier: "tier2",
    targetSkill: "reasoning",
    focus: ["reasoning"],
    languageProfile: "general",
    gradeBand: "6-8"
  };

  function normalizeSentence(sentence) {
    return String(sentence || "").replace(/\s+/g, " ").trim();
  }

  function clampTier(rawTier) {
    var n = Number(rawTier);
    if (n === 1 || n === 2 || n === 3) return n;
    var text = String(rawTier || "").toLowerCase();
    if (text.indexOf("tier 1") >= 0 || text.indexOf("tier1") >= 0 || text === "1") return 1;
    if (text.indexOf("tier 3") >= 0 || text.indexOf("tier3") >= 0 || text === "3") return 3;
    return 2;
  }

  function toTierLabel(level) {
    if (level === 1) return "tier1";
    if (level === 3) return "tier3";
    return "tier2";
  }

  function normalizeSkill(skill, fallback) {
    var s = String(skill || "").toLowerCase().trim();
    if (s === "verb" || s === "verb_upgrade") s = "verb_precision";
    if (s === "clause_variety") s = "cohesion";
    if (s === "sensory_detail") s = "detail";
    if (VALID_PRIMARY.indexOf(s) >= 0) return s;
    return String(fallback || "reasoning");
  }

  function normalizeFocusList(focus, fallbackSkill) {
    var src = Array.isArray(focus) ? focus : [focus];
    var out = src
      .map(function (x) { return normalizeSkill(x, ""); })
      .filter(Boolean);
    if (!out.length) out = [normalizeSkill(fallbackSkill || "reasoning", "reasoning")];
    return out.slice(0, 3);
  }

  function buildInstructionalLens(input, fallbackTier, fallbackSkill) {
    var src = input && typeof input === "object" ? input : {};
    var tierNum = clampTier(src.studentTier !== undefined ? src.studentTier : fallbackTier);
    var targetSkill = normalizeSkill(src.targetSkill || fallbackSkill || DEFAULT_LENS.targetSkill, DEFAULT_LENS.targetSkill);
    return {
      studentTier: toTierLabel(tierNum),
      targetSkill: targetSkill,
      focus: normalizeFocusList(src.focus, targetSkill),
      languageProfile: String(src.languageProfile || DEFAULT_LENS.languageProfile).trim() || DEFAULT_LENS.languageProfile,
      gradeBand: String(src.gradeBand || DEFAULT_LENS.gradeBand).trim() || DEFAULT_LENS.gradeBand
    };
  }

  function getTierPolicy(lens) {
    var tier = clampTier(lens && lens.studentTier);
    if (tier === 3) {
      return {
        tierLevel: 3,
        maxRevisions: 1,
        instructionalMode: "single_change",
        stemAllowed: true,
        challengeAllowed: false,
        uiHint: "one change only"
      };
    }
    if (tier === 1) {
      return {
        tierLevel: 1,
        maxRevisions: 3,
        instructionalMode: "style_challenge",
        stemAllowed: false,
        challengeAllowed: true,
        uiHint: "extension challenge"
      };
    }
    return {
      tierLevel: 2,
      maxRevisions: 2,
      instructionalMode: "guided_revision",
      stemAllowed: false,
      challengeAllowed: false,
      uiHint: "two revisions"
    };
  }

  function ensureWordLimit(text, maxWords) {
    var words = String(text || "").trim().split(/\s+/).filter(Boolean);
    if (words.length <= maxWords) return words.join(" ");
    return words.slice(0, maxWords).join(" ");
  }

  function inferPrimaryFromStructured(structured, lens) {
    var focus = normalizeSkill(lens && lens.targetSkill, "reasoning");
    var scores = {
      reasoning: Number(structured.reasoning_score || 0),
      detail: Number(structured.clarity_score || 0),
      verb_precision: Number(structured.complexity_score || 0),
      cohesion: Number(structured.cohesion_score || 0),
      sentence_control: Number(structured.clarity_score || 0)
    };
    var minKey = "reasoning";
    Object.keys(scores).forEach(function (k) {
      if (scores[k] < scores[minKey]) minKey = k;
    });
    return normalizeSkill(focus || minKey, minKey);
  }

  function buildPedagogyPrompt(sentence, lensInput) {
    var clean = normalizeSentence(sentence);
    var lens = buildInstructionalLens(lensInput, 2, "reasoning");
    var policy = getTierPolicy(lens);
    return [
      "You are a Tiered Writing Intervention Coach for Cornerstone Writing Studio.",
      "Use the instructional lens and tier policy to produce targeted intervention feedback.",
      "Do NOT rewrite the student sentence exactly.",
      "Do NOT use praise fluff.",
      "Return ONLY valid JSON with this exact shape:",
      "{",
      "  \"clarity_score\": 0-4 number,",
      "  \"complexity_score\": 0-4 number,",
      "  \"cohesion_score\": 0-4 number,",
      "  \"reasoning_score\": 0-4 number,",
      "  \"specific_next_step\": string,",
      "  \"model_revision\": string,",
      "  \"teacher_note\": string",
      "}",
      "Keep specific_next_step concise and tier-aligned.",
      "Tier policy:",
      "- tierLevel: " + policy.tierLevel,
      "- maxRevisions: " + policy.maxRevisions,
      "- instructionalMode: " + policy.instructionalMode,
      "Instructional lens:",
      JSON.stringify(lens),
      "Student sentence: \"" + clean.replace(/\"/g, "\\\"") + "\""
    ].join("\n");
  }

  function buildModelRevision(primary, tier) {
    if (primary === "reasoning") {
      return tier === 3 ? "Because ___, ___." : "Add a causal clause with because or although.";
    }
    if (primary === "detail") return "Add one concrete noun and one precise descriptor.";
    if (primary === "verb_precision") return "Replace one vague verb with a stronger action verb.";
    if (primary === "cohesion") return "Link two ideas using a connector such as because, but, or so.";
    return "Complete the sentence and check final punctuation.";
  }

  function heuristicStructuredFeedback(sentence, lensInput, analysis) {
    var clean = normalizeSentence(sentence);
    var lower = clean.toLowerCase();
    var words = clean ? clean.split(/\s+/).filter(Boolean) : [];
    var lens = buildInstructionalLens(lensInput, 2, analysis && analysis.suggested_focus);
    var policy = getTierPolicy(lens);

    var reasoningScore = /\b(because|although|since|if|while)\b/.test(lower) ? 3 : 1;
    var cohesionScore = /\b(and|but|so|therefore|however|then|because|although|since|if|while)\b/.test(lower) ? 3 : 1;
    var complexityScore = /\b(and|but|so|because|although|since|if|while)\b/.test(lower) ? 3 : (words.length > 8 ? 2 : 1);
    var clarityScore = /[.!?]$/.test(clean) ? 3 : 1;

    if (words.length >= 10) clarityScore = Math.min(4, clarityScore + 1);
    if (words.length >= 12) complexityScore = Math.min(4, complexityScore + 1);

    var structured = {
      clarity_score: Math.max(0, Math.min(4, Number(clarityScore))),
      complexity_score: Math.max(0, Math.min(4, Number(complexityScore))),
      cohesion_score: Math.max(0, Math.min(4, Number(cohesionScore))),
      reasoning_score: Math.max(0, Math.min(4, Number(reasoningScore))),
      specific_next_step: "Add one precise revision aligned to " + lens.targetSkill.replace(/_/g, " ") + ".",
      model_revision: "Use one connector and one specific detail.",
      teacher_note: "Target " + lens.targetSkill.replace(/_/g, " ") + " in a short guided cycle."
    };

    var primary = inferPrimaryFromStructured(structured, lens);
    if (primary === "reasoning") {
      structured.specific_next_step = policy.tierLevel === 3
        ? "Add one because clause to explain why."
        : "Add because or although to show clear causal reasoning.";
      structured.model_revision = buildModelRevision(primary, policy.tierLevel);
      structured.teacher_note = "Prompt causal explanation, then immediate revision check.";
    } else if (primary === "detail") {
      structured.specific_next_step = "Add one concrete detail tied to the main idea.";
      structured.model_revision = buildModelRevision(primary, policy.tierLevel);
      structured.teacher_note = "Coach one precise detail before expanding length.";
    } else if (primary === "verb_precision") {
      structured.specific_next_step = "Swap one vague verb for a stronger action verb.";
      structured.model_revision = buildModelRevision(primary, policy.tierLevel);
      structured.teacher_note = "Prioritize verb precision over adding extra clauses.";
    } else if (primary === "cohesion") {
      structured.specific_next_step = "Link ideas using one connector that matches meaning.";
      structured.model_revision = buildModelRevision(primary, policy.tierLevel);
      structured.teacher_note = "Check if each sentence connects logically to the next.";
    }

    if (policy.tierLevel === 3) {
      structured.specific_next_step = ensureWordLimit(structured.specific_next_step, 10);
      if (!/___/.test(structured.model_revision)) {
        structured.model_revision = buildModelRevision(primary, policy.tierLevel);
      }
    } else if (policy.tierLevel === 2) {
      structured.specific_next_step = ensureWordLimit("1) " + structured.specific_next_step + " 2) Reread and fix punctuation.", 18);
    } else {
      structured.specific_next_step = ensureWordLimit(structured.specific_next_step + " Then add one stylistic refinement.", 18);
    }

    return structured;
  }

  function toLegacyPedagogy(structured, lensInput, analysis) {
    var lens = buildInstructionalLens(lensInput, 2, analysis && analysis.suggested_focus);
    var policy = getTierPolicy(lens);
    var primary = inferPrimaryFromStructured(structured || {}, lens);
    var verbStrength = Number(structured && structured.complexity_score || 0) >= 3 ? "strong" : "adequate";

    return {
      skills_detected: {
        reasoning: Number(structured && structured.reasoning_score || 0) >= 2,
        detail_score: Math.max(0, Math.min(5, Math.round((Number(structured && structured.clarity_score || 0) / 4) * 5))),
        verb_strength: verbStrength,
        cohesion_score: Math.max(0, Math.min(5, Math.round((Number(structured && structured.cohesion_score || 0) / 4) * 5))),
        sentence_control_score: Math.max(0, Math.min(5, Math.round((Number(structured && structured.clarity_score || 0) / 4) * 5)))
      },
      primary_focus: primary,
      coach_prompt: ensureWordLimit(String(structured && structured.specific_next_step || ""), 30),
      suggested_stem: policy.stemAllowed ? ensureWordLimit(String(structured && structured.model_revision || buildModelRevision(primary, 3)), 12) : null,
      extension_option: policy.challengeAllowed ? ensureWordLimit(String(structured && structured.teacher_note || "Add one extension challenge."), 18) : null
    };
  }

  window.CSPedagogyEngine = {
    CS_SKILLS: CS_SKILLS,
    VALID_PRIMARY: VALID_PRIMARY,
    DEFAULT_LENS: DEFAULT_LENS,
    clampTier: clampTier,
    buildInstructionalLens: buildInstructionalLens,
    getTierPolicy: getTierPolicy,
    buildPedagogyPrompt: buildPedagogyPrompt,
    heuristicStructuredFeedback: heuristicStructuredFeedback,
    toLegacyPedagogy: toLegacyPedagogy
  };
})();
