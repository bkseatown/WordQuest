(function initWritingStudio() {
  "use strict";

  var DRAFT_KEY = "ws_draft_v1";
  var PREF_KEY = "wq_v2_prefs";
  var STUDIO_THEME_KEY = "ws_theme_v1";
  var FRAMEWORK_KEY = "ws_framework_v1";
  var AUDIENCE_KEY = "ws_audience_v1";
  var STEPUP_KEY = "ws_stepup_mode_v1";
  var STEPUP_CODES_KEY = "ws_stepup_codes_v1";
  var WARMUP_STATS_KEY = "ws_warmup_stats_v1";
  var WALL_KEY = "ws_publish_wall_v1";
  var PRESET_KEY = "ws_preset_pack_v1";
  var FALLBACK_ACCENT = "#7aa7ff";
  var ACADEMIC_WORDS = {
    k2: ["detail", "clear", "because", "first", "next", "then", "show", "explain"],
    "35": ["analyze", "evidence", "infer", "structure", "contrast", "precise", "context", "impact", "support", "sequence"],
    "68": ["analyze", "evidence", "reasoning", "cohesion", "counterclaim", "evaluate", "context", "synthesize", "justify", "impact"],
    "912": ["thesis", "synthesis", "nuance", "coherence", "counterclaim", "qualify", "evaluate", "implication", "rhetoric", "precision"]
  };
  var VOCAB_BY_MODE = {
    k2: {
      sentence: ["because", "first", "next", "then", "detail", "show", "tell", "feel", "see", "learn"],
      paragraph: ["claim", "evidence", "because", "detail", "first", "next", "then", "show", "explain", "conclude"]
    },
    "35": {
      sentence: ["because", "detail", "first", "next", "so", "but", "describe", "clarify", "revise", "conclude"],
      paragraph: ["claim", "evidence", "analyze", "infer", "contrast", "context", "impact", "support", "sequence", "precise"]
    },
    "68": {
      sentence: ["transition", "precise", "evidence", "reasoning", "cohesion", "clarify", "revise", "justify", "connect", "evaluate"],
      paragraph: ["claim", "counterclaim", "evidence", "reasoning", "cohesion", "synthesize", "justify", "evaluate", "context", "impact"]
    },
    "912": {
      sentence: ["thesis", "nuance", "precision", "coherence", "qualify", "synthesize", "rhetoric", "evidence", "evaluate", "implication"],
      paragraph: ["thesis", "counterclaim", "synthesis", "coherence", "qualify", "evidence", "rhetoric", "evaluate", "implication", "precision"]
    }
  };
  var CHECKLIST_BY_MODE = {
    k2: {
      sentence: ["My topic is clear", "I added details", "I used because/and"],
      paragraph: ["My main idea is clear", "I used a detail from text/image", "I explained my thinking"]
    },
    "35": {
      sentence: ["Topic sentence is clear", "I added two details", "I used because/so/but"],
      paragraph: ["Claim answers the prompt", "I cited text evidence", "I explained why evidence matters"]
    },
    "68": {
      sentence: ["Sentence has a precise point", "I used academic language", "I linked ideas clearly"],
      paragraph: ["Claim is arguable", "Evidence is specific", "Reasoning explains how evidence supports claim"]
    },
    "912": {
      sentence: ["Sentence is precise and purposeful", "Word choice matches academic register", "Sentence flow is coherent"],
      paragraph: ["Thesis is nuanced", "Evidence is integrated and cited", "Reasoning addresses complexity or counterclaim"]
    }
  };
  var CONJUNCTION_RE = /\b(and|but|or|so|because|although|however|therefore|while|if)\b/i;
  var EVIDENCE_RE = /\b(according to|for example|for instance|the text says|in the text|evidence)\b/i;
  var CLAIM_RE = /\b(i think|i believe|this shows|the author|the text)\b/i;
  var ABSOLUTE_RE = /\b(always|never|everyone|no one|all|none)\b/i;
  var COUNTER_RE = /\b(however|although|on the other hand|some may say|counter)\b/i;
  var FRAMEWORK_BANDS = {
    ccss: [
      { min: 0, level: "Below", note: "Build clear structure and details to reach grade-level writing expectations." },
      { min: 4, level: "Approaching", note: "Core structure is present, but reasoning and detail need consistency." },
      { min: 6, level: "Meeting", note: "Writing generally meets expected proficiency for structure, evidence, and language." },
      { min: 8, level: "Exceeding", note: "Writing exceeds expectations with strong organization and precise language." }
    ],
    ib: [
      { min: 0, level: "MYP 1-2", note: "Limited control; prioritize clear organization and basic support." },
      { min: 4, level: "MYP 3-4", note: "Developing control with partial evidence and uneven precision." },
      { min: 6, level: "MYP 5-6", note: "Secure communication with relevant support and mostly clear style." },
      { min: 8, level: "MYP 7-8", note: "Sophisticated control, purposeful evidence, and effective style choices." }
    ],
    cambridge: [
      { min: 0, level: "Emerging", note: "Ideas are present but need clearer sequencing and fuller development." },
      { min: 4, level: "Developing", note: "Writing is partially effective with growing control of evidence and form." },
      { min: 6, level: "Secure", note: "Writing is clear and controlled with relevant detail and appropriate register." },
      { min: 8, level: "Extending", note: "Writing is precise, convincing, and consistently well crafted." }
    ],
    naplan: [
      { min: 0, level: "Needs Additional Support", note: "Focus on sentence control, text structure, and idea development." },
      { min: 4, level: "Developing", note: "Writing shows progress but requires stronger cohesion and elaboration." },
      { min: 6, level: "Strong", note: "Writing is generally strong across audience, ideas, and language features." },
      { min: 8, level: "Exceeding", note: "Writing is highly effective with control, depth, and fluency." }
    ],
    cefr: [
      { min: 0, level: "A1", note: "Can write simple phrases and short connected statements." },
      { min: 3, level: "A2", note: "Can produce short connected text on familiar topics with basic linking." },
      { min: 5, level: "B1", note: "Can write connected text with reasons, examples, and clear sequencing." },
      { min: 7, level: "B2", note: "Can present clear, detailed text and support viewpoints with control." }
    ]
  };
  var ANCHOR_PROFILES = {
    k2: {
      sentence: { minWords: 6, minSentences: 1, stretchWords: 14, stretchSentences: 2, evidencePreferred: false },
      paragraph: { minWords: 14, minSentences: 2, stretchWords: 26, stretchSentences: 3, evidencePreferred: true }
    },
    "35": {
      sentence: { minWords: 12, minSentences: 2, stretchWords: 24, stretchSentences: 3, evidencePreferred: false },
      paragraph: { minWords: 28, minSentences: 3, stretchWords: 46, stretchSentences: 5, evidencePreferred: true }
    },
    "68": {
      sentence: { minWords: 16, minSentences: 2, stretchWords: 30, stretchSentences: 4, evidencePreferred: false },
      paragraph: { minWords: 38, minSentences: 4, stretchWords: 62, stretchSentences: 6, evidencePreferred: true }
    },
    "912": {
      sentence: { minWords: 20, minSentences: 3, stretchWords: 36, stretchSentences: 5, evidencePreferred: false },
      paragraph: { minWords: 48, minSentences: 4, stretchWords: 78, stretchSentences: 7, evidencePreferred: true }
    }
  };
  var STEP_ORDER = ["plan", "draft", "revise", "publish"];
  var GOALS_BY_MODE = {
    sentence: {
      plan: "Write one clear topic sentence.",
      draft: "Build 2-3 sentences with details.",
      revise: "Add a connector and one precise word.",
      publish: "Check all boxes, then read it out loud."
    },
    paragraph: {
      plan: "Write a claim that answers the prompt.",
      draft: "Add evidence and explanation.",
      revise: "Strengthen academic language and clarity.",
      publish: "Check all boxes, then share final paragraph."
    }
  };
  var STEP_TIPS_BY_MODE = {
    sentence: {
      plan: "Plan move: decide exactly what your sentence is teaching.",
      draft: "Draft move: add details that make your idea easy to picture.",
      revise: "Revise move: add one stronger word and one connector.",
      publish: "Publish move: read aloud and fix one confusing part."
    },
    paragraph: {
      plan: "Plan move: claim first, then choose one piece of evidence.",
      draft: "Draft move: explain how your evidence proves your claim.",
      revise: "Revise move: tighten word choice and sentence flow.",
      publish: "Publish move: final read for claim, evidence, and explanation."
    }
  };
  var MODEL_STEMS = {
    sentence: {
      plan: "My topic is ___ and I want readers to know ___.",
      draft: "First, ___. Next, ___ because ___.",
      revise: "I can make this clearer by adding ___.",
      publish: "Final read: each sentence matches my topic."
    },
    paragraph: {
      plan: "Claim: ___ because ___.",
      draft: "According to the text, ___. This shows ___.",
      revise: "I can strengthen this by replacing ___ with ___.",
      publish: "Final check: claim, evidence, explanation are all clear."
    }
  };
  var CONFERENCE_PROMPTS = {
    sentence: {
      plan: "Tell me your topic in one sentence.",
      draft: "Show me one detail you can add next.",
      revise: "Which connector will make this clearer?",
      publish: "Read it aloud and point to your best sentence."
    },
    paragraph: {
      plan: "Say your claim in one clear line.",
      draft: "Where is your evidence from the text?",
      revise: "How does your evidence prove your claim?",
      publish: "Read your final paragraph and check claim/evidence/explanation."
    }
  };
  var PROFILE_CONFIG = {
    whole: { sprintSeconds: 300, scaffold: "light", complexity: "grade" },
    small: { sprintSeconds: 180, scaffold: "medium", complexity: "supported" },
    one: { sprintSeconds: 120, scaffold: "high", complexity: "explicit" }
  };
  var ORGANIZER_TEMPLATES = {
    sequence: [
      { topic: "Beginning", detail: "What happened first?" },
      { topic: "Middle", detail: "What happened next?" },
      { topic: "Ending", detail: "How did it end or change?" }
    ],
    cer: [
      { topic: "Claim", detail: "What is your answer or point?" },
      { topic: "Evidence", detail: "What proof from text or observation supports it?" },
      { topic: "Reasoning", detail: "How does the evidence prove your claim?" }
    ],
    problem: [
      { topic: "Problem", detail: "What challenge needs solving?" },
      { topic: "Cause", detail: "Why is this happening?" },
      { topic: "Solution", detail: "What action could solve it?" }
    ]
  };
  var STEPUP_SEQUENCE = {
    k2: {
      sentence: "K-2 sentence focus: name topic -> add one detail -> use because/and.",
      paragraph: "K-2 paragraph focus: state opinion -> one reason -> one explain sentence."
    },
    "35": {
      sentence: "3-5 sentence focus: topic sentence -> two detail sentences -> transition.",
      paragraph: "3-5 paragraph focus: topic/claim -> evidence detail -> explanation sentence."
    },
    "68": {
      sentence: "6-8 sentence focus: precise claim -> evidence phrase -> logic connector.",
      paragraph: "6-8 paragraph focus: arguable claim -> evidence -> reasoning -> counterpoint."
    },
    "912": {
      sentence: "9-12 sentence focus: nuanced assertion -> qualification -> precise diction.",
      paragraph: "9-12 paragraph focus: thesis move -> integrated evidence -> analysis -> synthesis."
    }
  };
  var PRESET_PACKS = {
    custom: {},
    fishtank: {
      mode: "paragraph",
      profile: "whole",
      framework: "ccss",
      audience: "teacher",
      stepUp: false,
      organizer: "cer",
      cue: "Fish Tank flow: claim, text evidence, then explanation."
    },
    stepup: {
      mode: "sentence",
      profile: "small",
      framework: "ccss",
      audience: "teacher",
      stepUp: true,
      organizer: "sequence",
      cue: "Step Up flow: topic, detail, explain, transition."
    },
    eal: {
      mode: "sentence",
      profile: "small",
      framework: "cefr",
      audience: "family",
      stepUp: true,
      organizer: "sequence",
      cue: "EAL flow: oral rehearsal, sentence frame, then one expansion."
    },
    ls: {
      mode: "sentence",
      profile: "one",
      framework: "ccss",
      audience: "teacher",
      stepUp: true,
      organizer: "problem",
      cue: "LS flow: one small step, immediate feedback, then repeat."
    }
  };
  var DEFAULT_MARK_CODES = { topic: "T", detail: "D", explain: "E", transition: "TR", vocab: "V" };
  var BROKEN_SENTENCES = {
    k2: [
      { broken: "the dog run fast", fixed: "The dog runs fast.", hint: "Add capital letter, verb ending, and period." },
      { broken: "i like apples because sweet", fixed: "I like apples because they are sweet.", hint: "Add a subject and punctuation." }
    ],
    "35": [
      { broken: "we went to the museum it was fun", fixed: "We went to the museum, and it was fun.", hint: "Fix run-on with connector and punctuation." },
      { broken: "the book was good because had details", fixed: "The book was good because it had details.", hint: "Add missing subject pronoun." }
    ],
    "68": [
      { broken: "uniforms help students however some disagree", fixed: "Uniforms help students; however, some disagree.", hint: "Use punctuation around transition word." },
      { broken: "the evidence is strong it proves the claim", fixed: "The evidence is strong, and it proves the claim.", hint: "Split or connect the ideas correctly." }
    ],
    "912": [
      { broken: "social media influences teens therefore schools should teach digital literacy", fixed: "Social media influences teens; therefore, schools should teach digital literacy.", hint: "Use punctuation for conjunctive adverb." },
      { broken: "the argument seems valid the evidence is limited", fixed: "The argument seems valid, but the evidence is limited.", hint: "Clarify relationship with a connector." }
    ]
  };

  var body = document.body;
  var subtitleEl = document.getElementById("ws-subtitle");
  var welcomeEl = document.getElementById("ws-welcome");
  var editor = document.getElementById("ws-editor");
  var metrics = document.getElementById("ws-metrics");
  var coach = document.getElementById("ws-coach");
  var vocab = document.getElementById("ws-vocab");
  var checklist1 = document.getElementById("ws-check-1");
  var checklist2 = document.getElementById("ws-check-2");
  var checklist3 = document.getElementById("ws-check-3");
  var glowEl = document.getElementById("ws-glow");
  var growEl = document.getElementById("ws-grow");
  var goEl = document.getElementById("ws-go");
  var evidenceEl = document.getElementById("ws-evidence");
  var revisionPatchEl = document.getElementById("ws-revision-patch");
  var feedbackConfidenceEl = document.getElementById("ws-feedback-confidence");
  var conferenceStrengthEl = document.getElementById("ws-conference-strength");
  var conferenceTargetEl = document.getElementById("ws-conference-target");
  var conferencePromptEl = document.getElementById("ws-conference-prompt");
  var rubric1El = document.getElementById("ws-rubric-1");
  var rubric2El = document.getElementById("ws-rubric-2");
  var rubric3El = document.getElementById("ws-rubric-3");
  var rubricScoreEl = document.getElementById("ws-rubric-score");
  var frameworkSelect = document.getElementById("ws-framework");
  var benchmarkLevelEl = document.getElementById("ws-benchmark-level");
  var benchmarkNoteEl = document.getElementById("ws-benchmark-note");
  var calibrationEl = document.getElementById("ws-calibration");
  var benchmarkConfidenceEl = document.getElementById("ws-benchmark-confidence");
  var exemplarListEl = document.getElementById("ws-exemplars");
  var scaffoldCueEl = document.getElementById("ws-scaffold-cue");
  var stepUpToggleBtn = document.getElementById("ws-stepup-toggle");
  var stepUpTargetEl = document.getElementById("ws-stepup-target");
  var stepUpGradeTargetEl = document.getElementById("ws-stepup-grade-target");
  var stepUpSeqEl = document.getElementById("ws-stepup-seq");
  var stepUpColorsEl = document.getElementById("ws-stepup-colors");
  var markTopicBtn = document.getElementById("ws-mark-topic");
  var markDetailBtn = document.getElementById("ws-mark-detail");
  var markExplainBtn = document.getElementById("ws-mark-explain");
  var markTransitionBtn = document.getElementById("ws-mark-transition");
  var markVocabBtn = document.getElementById("ws-mark-vocab");
  var stepUpCopyBtn = document.getElementById("ws-stepup-copy");
  var codeTopicInput = document.getElementById("ws-code-topic");
  var codeDetailInput = document.getElementById("ws-code-detail");
  var codeExplainInput = document.getElementById("ws-code-explain");
  var codeTransitionInput = document.getElementById("ws-code-transition");
  var codeVocabInput = document.getElementById("ws-code-vocab");
  var codesSaveBtn = document.getElementById("ws-codes-save");
  var codesResetBtn = document.getElementById("ws-codes-reset");
  var warmupBrokenEl = document.getElementById("ws-warmup-broken");
  var warmupHintEl = document.getElementById("ws-warmup-hint");
  var warmupInput = document.getElementById("ws-warmup-input");
  var warmupCheckBtn = document.getElementById("ws-warmup-check");
  var warmupNextBtn = document.getElementById("ws-warmup-next");
  var warmupStatusEl = document.getElementById("ws-warmup-status");
  var warmupStreakEl = document.getElementById("ws-warmup-streak");
  var warmupBestEl = document.getElementById("ws-warmup-best");
  var warmupRoundTimeEl = document.getElementById("ws-warmup-round-time");
  var warmupRoundScoreEl = document.getElementById("ws-warmup-round-score");
  var warmupRoundStartBtn = document.getElementById("ws-warmup-round-start");
  var warmupClassToggleBtn = document.getElementById("ws-warmup-class-toggle");
  var pinLineBtn = document.getElementById("ws-pin-line");
  var wallClearBtn = document.getElementById("ws-wall-clear");
  var publishWallEl = document.getElementById("ws-publish-wall");
  var familyCopyBtn = document.getElementById("ws-family-copy");
  var scaffoldNextBtn = document.getElementById("ws-scaffold-next");
  var scaffoldStemBtn = document.getElementById("ws-scaffold-stem");
  var scaffoldIdeaBtn = document.getElementById("ws-scaffold-idea");
  var scaffoldEvidenceBtn = document.getElementById("ws-scaffold-evidence");
  var scaffoldCalmBtn = document.getElementById("ws-scaffold-calm");
  var miniLessonEl = document.getElementById("ws-mini-lesson");
  var sprintTimeEl = document.getElementById("ws-sprint-time");
  var sprintStartBtn = document.getElementById("ws-sprint-start");
  var sprintResetBtn = document.getElementById("ws-sprint-reset");
  var saveBtn = document.getElementById("ws-save");
  var clearBtn = document.getElementById("ws-clear");
  var modeButtons = Array.prototype.slice.call(document.querySelectorAll(".ws-chip[data-mode]"));
  var audienceButtons = Array.prototype.slice.call(document.querySelectorAll(".ws-chip[data-audience]"));
  var presetSelect = document.getElementById("ws-preset-pack");
  var profileButtons = Array.prototype.slice.call(document.querySelectorAll(".ws-chip[data-profile]"));
  var showcaseToggleBtn = document.getElementById("ws-showcase-toggle");
  var showcaseEl = document.getElementById("ws-showcase");
  var showcaseCloseBtn = document.getElementById("ws-showcase-close");
  var showcaseLineEl = document.getElementById("ws-showcase-line");
  var modelBtn = document.getElementById("ws-model");
  var flowButtons = Array.prototype.slice.call(document.querySelectorAll(".ws-step[data-step]"));
  var goalEl = document.getElementById("ws-goal");
  var nextStepBtn = document.getElementById("ws-next-step");
  var planTopicInput = document.getElementById("ws-plan-topic");
  var planDetailInput = document.getElementById("ws-plan-detail");
  var planAddBtn = document.getElementById("ws-plan-add");
  var planUseBtn = document.getElementById("ws-plan-use");
  var planListEl = document.getElementById("ws-plan-list");
  var planMeterTextEl = document.getElementById("ws-plan-meter-text");
  var planMeterFillEl = document.getElementById("ws-plan-meter-fill");
  var planMeterNoteEl = document.getElementById("ws-plan-meter-note");
  var organizerTypeSelect = document.getElementById("ws-organizer-type");
  var organizerApplyBtn = document.getElementById("ws-organizer-apply");
  var organizerPreviewEl = document.getElementById("ws-organizer-preview");
  var imagePromptsEl = document.getElementById("ws-image-prompts");
  var dictateBtn = document.getElementById("ws-dictate");
  var readBtn = document.getElementById("ws-read");
  var imageBtn = document.getElementById("ws-image-btn");
  var imageInput = document.getElementById("ws-image-input");
  var imagePreviewEl = document.getElementById("ws-image-preview");
  var checklistInputs = Array.prototype.slice.call(document.querySelectorAll(".ws-check input"));
  var backBtn = document.getElementById("ws-back");
  var settingsBtn = document.getElementById("ws-settings");
  var gradeBandSelect = document.getElementById("ws-grade-band");
  var currentMode = "sentence";
  var currentGradeBand = "35";
  var currentProfile = "whole";
  var currentStep = "plan";
  var currentFramework = "ccss";
  var currentAudience = "student";
  var currentPreset = "custom";
  var stepUpEnabled = true;
  var markCodes = { topic: "T", detail: "D", explain: "E", transition: "TR", vocab: "V" };
  var warmupIndex = 0;
  var currentWarmup = null;
  var warmupStreak = 0;
  var warmupBest = 0;
  var warmupRoundScore = 0;
  var warmupRoundSeconds = 0;
  var warmupRoundTimer = null;
  var warmupClassMode = false;
  var publishWall = [];
  var showcaseOpen = false;
  var toastSuppressed = false;
  var teacherModel = false;
  var sprintTotalSeconds = PROFILE_CONFIG.whole.sprintSeconds;
  var sprintRemaining = sprintTotalSeconds;
  var sprintTimer = null;
  var sprintChunkIndex = 0;
  var planItems = [];
  var imagePromptItems = [];
  var currentImageUrl = "";
  var SpeechRecognitionCtor = window.SpeechRecognition || window.webkitSpeechRecognition || null;
  var recognition = null;
  var isDictating = false;
  var imagePromptLabel = "";

  if (!editor || !metrics || !coach || !vocab || !saveBtn || !clearBtn) {
    return;
  }

  function splitSentences(text) {
    return text
      .split(/[.!?]+/)
      .map(function trimSentence(part) { return part.trim(); })
      .filter(Boolean);
  }

  function getWordCount(text) {
    var words = text.trim().match(/\b[\w'-]+\b/g);
    return words ? words.length : 0;
  }

  function countAcademicWords(text) {
    var lower = text.toLowerCase();
    var source = ACADEMIC_WORDS[currentGradeBand] || ACADEMIC_WORDS["35"];
    return source.filter(function (word) {
      return lower.indexOf(word) !== -1;
    }).length;
  }

  function evaluateStep(step, text, words, sentenceCount) {
    var academicCount = countAcademicWords(text);
    if (step === "plan") {
      return currentMode === "paragraph"
        ? (CLAIM_RE.test(text) || (sentenceCount >= 1 && words >= 12))
        : (sentenceCount >= 1 || words >= 6);
    }
    if (step === "draft") {
      return currentMode === "paragraph"
        ? (sentenceCount >= 3 && words >= 36)
        : (sentenceCount >= 2 && words >= 16);
    }
    if (step === "revise") {
      return currentMode === "paragraph"
        ? (EVIDENCE_RE.test(text) && academicCount >= 1 && words >= 42)
        : (CONJUNCTION_RE.test(text) && words >= 20);
    }
    if (step === "publish") {
      return checklistInputs.length > 0 && checklistInputs.every(function (input) { return input.checked; });
    }
    return false;
  }

  function getPlanningReadiness(text, words, sentenceCount) {
    return getPlanningStatus(text, words, sentenceCount).ready;
  }

  function getPlanningStatus(text, words, sentenceCount) {
    var claimSignal = CLAIM_RE.test(text);
    var hasPlanItems = planItems.length >= 2;
    var hasOrganizer = Boolean(ORGANIZER_TEMPLATES[getOrganizerType()]);
    var hasStarterText = sentenceCount >= 1 || words >= 6;
    var paragraphTextReady = claimSignal || words >= 12;
    var checks = [];

    checks.push({ ok: hasPlanItems, label: "Add at least 2 idea items" });
    checks.push({ ok: hasOrganizer, label: "Select an organizer" });
    if (currentMode === "paragraph") {
      checks.push({ ok: paragraphTextReady, label: "Write a claim starter or 12+ words" });
    } else {
      checks.push({ ok: hasStarterText, label: "Write at least 1 sentence starter" });
    }

    var total = checks.length;
    var done = checks.filter(function (c) { return c.ok; }).length;
    var pct = Math.round((done / total) * 100);
    return {
      ready: done === total,
      percent: pct,
      checks: checks,
      missing: checks.filter(function (c) { return !c.ok; }).map(function (c) { return c.label; })
    };
  }

  function renderPlanningMeter(text, words, sentenceCount) {
    var status = getPlanningStatus(text, words, sentenceCount);
    if (planMeterTextEl) planMeterTextEl.textContent = status.percent + "%";
    if (planMeterFillEl) planMeterFillEl.style.width = status.percent + "%";
    if (planMeterNoteEl) {
      planMeterNoteEl.textContent = status.ready
        ? "Planning ready. Move to Draft."
        : "Still needed: " + status.missing.join(" • ");
    }
  }

  function renderFlowState(text, words, sentenceCount) {
    flowButtons.forEach(function (btn) {
      var step = btn.getAttribute("data-step");
      var done = evaluateStep(step, text, words, sentenceCount);
      btn.classList.toggle("is-active", step === currentStep);
      btn.classList.toggle("is-done", done && step !== currentStep);
    });
  }

  function renderPlanItems() {
    if (!planListEl) return;
    planListEl.innerHTML = "";
    planItems.slice(0, 6).forEach(function (item) {
      var tag = document.createElement("button");
      tag.type = "button";
      tag.className = "ws-plan-item";
      tag.textContent = item.topic + ": " + item.detail;
      tag.addEventListener("click", function () {
        editor.value = (editor.value ? editor.value + "\n" : "") + item.topic + ": " + item.detail;
        updateMetricsAndCoach();
      });
      planListEl.appendChild(tag);
    });
  }

  function getOrganizerType() {
    var raw = String(organizerTypeSelect && organizerTypeSelect.value || "sequence").trim().toLowerCase();
    return ORGANIZER_TEMPLATES[raw] ? raw : "sequence";
  }

  function renderOrganizerPreview() {
    if (!organizerPreviewEl) return;
    var template = ORGANIZER_TEMPLATES[getOrganizerType()] || ORGANIZER_TEMPLATES.sequence;
    organizerPreviewEl.innerHTML = "";
    template.forEach(function (item, idx) {
      var line = document.createElement("div");
      line.className = "ws-organizer-line";
      line.textContent = (idx + 1) + ". " + item.topic + " - " + item.detail;
      organizerPreviewEl.appendChild(line);
    });
  }

  function applyOrganizerTemplate() {
    var template = ORGANIZER_TEMPLATES[getOrganizerType()] || ORGANIZER_TEMPLATES.sequence;
    planItems = template.slice(0, 3).map(function (item) {
      return { topic: item.topic, detail: item.detail };
    });
    renderPlanItems();
    showToast("Organizer loaded");
  }

  function setImagePrompts(prompts) {
    imagePromptItems = Array.isArray(prompts) ? prompts.slice(0, 4) : [];
    if (!imagePromptsEl) return;
    imagePromptsEl.innerHTML = "";
    imagePromptItems.forEach(function (prompt) {
      var pill = document.createElement("button");
      pill.type = "button";
      pill.className = "ws-pill";
      pill.textContent = prompt;
      pill.addEventListener("click", function () {
        if (planTopicInput) planTopicInput.value = currentMode === "paragraph" ? "Claim" : "Topic";
        if (planDetailInput) planDetailInput.value = prompt;
        showToast("Prompt added to idea builder");
      });
      imagePromptsEl.appendChild(pill);
    });
  }

  function buildImagePrompts(label) {
    var seed = label || "this image";
    if (currentMode === "paragraph") {
      return [
        "Claim about " + seed + ": What is the main idea?",
        "Evidence from " + seed + ": What details prove your claim?",
        "Reasoning: Why do those details matter?"
      ];
    }
    return [
      "What do you notice first in " + seed + "?",
      "What detail can you describe clearly?",
      "How can you connect ideas with because or so?"
    ];
  }

  function normalizeImageLabel(fileName) {
    var base = String(fileName || "image").replace(/\.[^/.]+$/, "").replace(/[_-]+/g, " ").trim();
    return base || "image";
  }

  function renderImagePreview(file, url) {
    if (!imagePreviewEl) return;
    imagePreviewEl.innerHTML = "";
    var img = document.createElement("img");
    img.src = url;
    img.alt = "Selected image prompt";
    var meta = document.createElement("div");
    meta.className = "ws-image-caption";
    meta.textContent = "Image prompt: " + file.name;
    imagePreviewEl.appendChild(img);
    imagePreviewEl.appendChild(meta);
  }

  function handleImageFile(file) {
    if (!file) return;
    if (currentImageUrl) {
      try { URL.revokeObjectURL(currentImageUrl); } catch (_err) {}
    }
    currentImageUrl = URL.createObjectURL(file);
    renderImagePreview(file, currentImageUrl);
    var label = normalizeImageLabel(file.name);
    imagePromptLabel = label;
    setImagePrompts(buildImagePrompts(label));
    if (currentStep === "plan") showToast("Image prompts ready");
  }

  function initRecognition() {
    if (!SpeechRecognitionCtor || recognition) return;
    recognition = new SpeechRecognitionCtor();
    recognition.lang = "en-US";
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.onresult = function (event) {
      var transcript = "";
      for (var i = event.resultIndex; i < event.results.length; i += 1) {
        if (event.results[i].isFinal) transcript += event.results[i][0].transcript + " ";
      }
      transcript = transcript.trim();
      if (!transcript) return;
      var joiner = editor.value.trim().length ? " " : "";
      editor.value = editor.value + joiner + transcript;
      updateMetricsAndCoach();
    };
    recognition.onend = function () {
      isDictating = false;
      if (dictateBtn) {
        dictateBtn.classList.remove("is-active");
        dictateBtn.setAttribute("aria-pressed", "false");
        dictateBtn.textContent = "Dictate";
      }
    };
    recognition.onerror = function () {
      isDictating = false;
      if (dictateBtn) {
        dictateBtn.classList.remove("is-active");
        dictateBtn.setAttribute("aria-pressed", "false");
        dictateBtn.textContent = "Dictate";
      }
      showToast("Dictation error");
    };
  }

  function toggleDictation() {
    initRecognition();
    if (!recognition) {
      showToast("Dictation not supported");
      return;
    }
    if (isDictating) {
      recognition.stop();
      isDictating = false;
      return;
    }
    try {
      recognition.start();
      isDictating = true;
      if (dictateBtn) {
        dictateBtn.classList.add("is-active");
        dictateBtn.setAttribute("aria-pressed", "true");
        dictateBtn.textContent = "Stop Dictation";
      }
      showToast("Dictation on");
    } catch (_err) {
      showToast("Dictation unavailable");
    }
  }

  function readDraftAloud() {
    var text = String(editor.value || "").trim();
    if (!text) {
      showToast("Nothing to read yet");
      return;
    }
    if (!window.speechSynthesis || !window.SpeechSynthesisUtterance) {
      showToast("Read aloud not supported");
      return;
    }
    window.speechSynthesis.cancel();
    var utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 0.95;
    utterance.pitch = 1.0;
    window.speechSynthesis.speak(utterance);
    showToast("Reading draft");
  }

  function addPlanItem() {
    var topic = String(planTopicInput && planTopicInput.value || "").trim();
    var detail = String(planDetailInput && planDetailInput.value || "").trim();
    if (!topic || !detail) {
      showToast("Add topic + detail");
      return;
    }
    planItems.push({ topic: topic, detail: detail });
    if (planItems.length > 6) planItems = planItems.slice(-6);
    if (planTopicInput) planTopicInput.value = "";
    if (planDetailInput) planDetailInput.value = "";
    renderPlanItems();
    showToast("Idea added");
  }

  function usePlanInDraft() {
    if (!planItems.length) {
      showToast("Add ideas first");
      return;
    }
    var lines = planItems.map(function (item, idx) {
      return (idx + 1) + ". " + item.topic + " -> " + item.detail;
    });
    var outline = currentMode === "paragraph"
      ? "Plan:\nClaim: " + (planItems[0] ? planItems[0].topic : "___") + "\nEvidence:\n- " + lines.join("\n- ")
      : "Plan:\n- " + lines.join("\n- ");
    editor.value = outline + "\n\n" + editor.value;
    if (currentStep === "plan") {
      setStep("draft");
    } else {
      updateMetricsAndCoach();
    }
    showToast("Plan inserted");
  }

  function enforcePlanGate(nextStep) {
    if (currentStep !== "plan") return true;
    if (nextStep === "plan") return true;
    var text = editor.value;
    var words = getWordCount(text);
    var sentences = splitSentences(text).length;
    var ready = getPlanningReadiness(text, words, sentences);
    if (ready) return true;
    showToast("Complete Idea Builder before drafting");
    return false;
  }

  function renderGoal(text, words, sentenceCount) {
    if (!goalEl) return;
    var goals = GOALS_BY_MODE[currentMode] || GOALS_BY_MODE.sentence;
    var base = goals[currentStep] || goals.plan;
    var complete = evaluateStep(currentStep, text, words, sentenceCount);
    var modelCue = MODEL_STEMS[currentMode] && MODEL_STEMS[currentMode][currentStep]
      ? " Teacher cue: " + MODEL_STEMS[currentMode][currentStep]
      : "";
    goalEl.textContent = (complete ? "Complete. " : "") + base + (teacherModel ? modelCue : "");
  }

  function renderCoachTips(text, words, sentenceCount) {
    var tips = [];
    var avgLength = sentenceCount > 0 ? words / sentenceCount : 0;
    var hasConjunction = CONJUNCTION_RE.test(text);
    var academicCount = countAcademicWords(text);
    var hasEvidenceSignal = EVIDENCE_RE.test(text);
    var hasClaimSignal = CLAIM_RE.test(text);
    var stepTips = STEP_TIPS_BY_MODE[currentMode] || STEP_TIPS_BY_MODE.sentence;

    tips.push(stepTips[currentStep] || stepTips.plan);
    if ((teacherModel || PROFILE_CONFIG[currentProfile].scaffold === "high") && MODEL_STEMS[currentMode] && MODEL_STEMS[currentMode][currentStep]) {
      tips.push("Model aloud: " + MODEL_STEMS[currentMode][currentStep]);
    }

    if (currentMode === "paragraph") {
      if (!hasClaimSignal) {
        tips.push("Fish Tank move: start with a clear claim that answers the prompt.");
      } else {
        tips.push("Your claim is visible. Keep the first sentence focused and direct.");
      }

      if (!hasEvidenceSignal) {
        tips.push("Add text evidence with a phrase like 'According to the text...'.");
      } else {
        tips.push("You included evidence. Add one sentence explaining why it matters.");
      }

      var paragraphAcademicTarget = currentGradeBand === "k2" ? 1 : (currentGradeBand === "35" ? 2 : 3);
      if (academicCount < (currentProfile === "whole" ? paragraphAcademicTarget : Math.max(1, paragraphAcademicTarget - 1))) {
        tips.push("Use academic words: evidence, analyze, and impact.");
      } else {
        tips.push("Academic language is strong. Keep your explanation precise.");
      }

      if (ABSOLUTE_RE.test(text) && !hasEvidenceSignal) {
        tips.push("Reasoning check: avoid always/never claims unless your evidence proves them.");
      }
      if (currentGradeBand !== "k2" && words >= 24 && !COUNTER_RE.test(text)) {
        tips.push("Critical thinking move: add one counterpoint line, then respond to it.");
      }
    } else {
      if (avgLength < 8 && words > 0) {
        tips.push("Step Up move: add one detail phrase to each sentence.");
      } else {
        tips.push("Sentence length is balanced. Keep each sentence on one clear idea.");
      }

      if (!hasConjunction) {
        tips.push("Connect ideas with because, so, or but.");
      } else {
        tips.push("Great connectors. Check that each one strengthens meaning.");
      }

      var sentenceAcademicTarget = currentGradeBand === "k2" ? 0 : 1;
      if (academicCount <= sentenceAcademicTarget) {
        tips.push("Upgrade one word: try precise, sequence, or context.");
      } else {
        tips.push("Word choice is growing. Keep adding one stronger term.");
      }
    }

    var maxTips = currentProfile === "whole" ? 2 : 3;
    coach.innerHTML = "";
    tips.slice(0, maxTips).forEach(function (tip) {
      var el = document.createElement("div");
      el.className = "ws-tip";
      el.textContent = tip;
      coach.appendChild(el);
    });
  }

  function renderGlowGrowGo(text, words, sentenceCount) {
    if (!glowEl || !growEl || !goEl) return;
    var feedback = buildLocalFeedback(text, words, sentenceCount);
    glowEl.textContent = feedback.glow;
    growEl.textContent = feedback.grow;
    goEl.textContent = PROFILE_CONFIG[currentProfile].scaffold === "high"
      ? feedback.go + " One step only: complete this before anything else."
      : feedback.go;
    if (evidenceEl) evidenceEl.textContent = feedback.evidence;
    if (revisionPatchEl) revisionPatchEl.textContent = feedback.patch;
    if (feedbackConfidenceEl) feedbackConfidenceEl.textContent = feedback.confidence;
  }

  function renderConferenceCopilot(text, words, sentenceCount) {
    if (!conferenceStrengthEl || !conferenceTargetEl || !conferencePromptEl) return;
    var hasClaim = CLAIM_RE.test(text);
    var hasEvidence = EVIDENCE_RE.test(text);
    var hasConnector = CONJUNCTION_RE.test(text);
    var prompt = (CONFERENCE_PROMPTS[currentMode] && CONFERENCE_PROMPTS[currentMode][currentStep]) || "Tell me your next writing move.";

    if (currentMode === "paragraph") {
      conferenceStrengthEl.textContent = hasClaim
        ? "Student can state a claim."
        : "Student has started writing and can build toward a claim.";
      conferenceTargetEl.textContent = hasEvidence
        ? "Explain how evidence supports the claim."
        : "Add one evidence sentence using a text stem.";
    } else {
      conferenceStrengthEl.textContent = sentenceCount >= 2
        ? "Student is producing multiple sentences."
        : "Student has a starting sentence.";
      conferenceTargetEl.textContent = hasConnector
        ? "Strengthen detail and word precision."
        : "Add one connector to link ideas.";
    }
    if (words === 0) {
      conferenceStrengthEl.textContent = "Student is ready to begin.";
      conferenceTargetEl.textContent = "Co-construct the first sentence together.";
    }
    conferencePromptEl.textContent = prompt;
  }

  function clampScore(value) {
    return Math.max(0, Math.min(3, value));
  }

  function getBandThresholds() {
    if (currentGradeBand === "k2") return { structWords: 6, structSentences: 1, detailWords: 10, languageTarget: 0 };
    if (currentGradeBand === "35") return { structWords: 14, structSentences: 2, detailWords: 24, languageTarget: 1 };
    if (currentGradeBand === "68") return { structWords: 20, structSentences: 3, detailWords: 34, languageTarget: 2 };
    return { structWords: 28, structSentences: 4, detailWords: 46, languageTarget: 2 };
  }

  function getDomainScores(text, words, sentenceCount) {
    var t = getBandThresholds();
    var hasClaim = CLAIM_RE.test(text);
    var hasEvidence = EVIDENCE_RE.test(text);
    var hasConnector = CONJUNCTION_RE.test(text);
    var academicCount = countAcademicWords(text);

    var structure = 0;
    if (sentenceCount >= t.structSentences || words >= t.structWords) structure = 1;
    if (currentMode === "paragraph" ? hasClaim : sentenceCount >= Math.max(1, t.structSentences)) structure = 2;
    if (currentMode === "paragraph" ? (hasClaim && sentenceCount >= t.structSentences) : (sentenceCount >= t.structSentences && words >= t.structWords)) structure = 3;

    var detail = 0;
    if (words >= Math.floor(t.detailWords * 0.6)) detail = 1;
    if ((currentMode === "paragraph" && hasEvidence) || (currentMode === "sentence" && hasConnector)) detail = 2;
    if (words >= t.detailWords && ((currentMode === "paragraph" && hasEvidence) || (currentMode === "sentence" && hasConnector))) detail = 3;

    var language = 0;
    if (academicCount >= Math.max(0, t.languageTarget - 1)) language = 1;
    if (academicCount >= t.languageTarget) language = 2;
    if (academicCount >= t.languageTarget + 1) language = 3;

    structure = clampScore(structure);
    detail = clampScore(detail);
    language = clampScore(language);

    return {
      structure: structure,
      detail: detail,
      language: language,
      total: structure + detail + language
    };
  }

  function getTextSentences(text) {
    var matches = String(text || "").match(/[^.!?]+[.!?]?/g) || [];
    return matches.map(function (part) { return part.trim(); }).filter(Boolean);
  }

  function pickEvidenceSpan(text) {
    var sentences = getTextSentences(text);
    if (!sentences.length) return "";
    var best = sentences.find(function (s) { return EVIDENCE_RE.test(s); })
      || sentences.find(function (s) { return CLAIM_RE.test(s); })
      || sentences.find(function (s) { return CONJUNCTION_RE.test(s); })
      || sentences[0];
    return best.length > 150 ? best.slice(0, 147) + "..." : best;
  }

  function upgradeSentenceWords(sentence) {
    var upgraded = String(sentence || "");
    var map = [
      { from: /\b(good|nice)\b/gi, to: "effective" },
      { from: /\b(bad)\b/gi, to: "harmful" },
      { from: /\b(big)\b/gi, to: "significant" },
      { from: /\b(a lot)\b/gi, to: "substantially" },
      { from: /\b(thing|stuff)\b/gi, to: "element" }
    ];
    map.forEach(function (pair) {
      upgraded = upgraded.replace(pair.from, pair.to);
    });
    if (upgraded === sentence && currentMode === "paragraph" && !EVIDENCE_RE.test(upgraded)) {
      upgraded = "According to the text, " + upgraded.replace(/^[a-z]/, function (m) { return m.toUpperCase(); });
    }
    if (upgraded === sentence && currentMode === "sentence" && !CONJUNCTION_RE.test(upgraded)) {
      upgraded += " because ___";
    }
    return upgraded;
  }

  function buildLocalFeedback(text, words, sentenceCount) {
    var scores = getDomainScores(text, words, sentenceCount);
    var weak = getWeakestDomain(scores);
    var evidenceSpan = pickEvidenceSpan(text);
    var sentences = getTextSentences(text);
    var before = sentences[0] || "";
    var after = before ? upgradeSentenceWords(before) : "";
    var confidence = "Low";
    if (words >= 12 && sentenceCount >= 2) confidence = "Medium";
    if (words >= 28 && sentenceCount >= 3 && evidenceSpan) confidence = "High";

    var strength;
    if (scores.language >= scores.structure && scores.language >= scores.detail) {
      strength = scores.language >= 2 ? "Language precision is developing with academic terms present." : "Language base is present and ready for stronger word choice.";
    } else if (scores.detail >= scores.structure) {
      strength = scores.detail >= 2 ? "Detail support is visible and mostly connected to your point." : "Detail ideas are starting to appear.";
    } else {
      strength = scores.structure >= 2 ? "Structure is clear with a focused main idea." : "A core structure is starting to form.";
    }

    var nextMove = weak === "structure"
      ? (currentMode === "paragraph" ? "Write one direct claim sentence, then stop." : "Write one clear topic sentence, then add one detail.")
      : (weak === "detail"
        ? (currentMode === "paragraph" ? "Add one evidence line and one why-it-matters line." : "Add one detail phrase that answers who/what/why.")
        : "Replace one vague word with a precise academic word.");

    return {
      glow: strength,
      grow: nextMove,
      go: (GOALS_BY_MODE[currentMode] && GOALS_BY_MODE[currentMode][currentStep]) || "Take the next writing step.",
      evidence: evidenceSpan || "No evidence span yet. Write 2+ sentences.",
      patch: before && after
        ? ("Before: \"" + before + "\" After: \"" + after + "\"")
        : "Before: -- After: --",
      confidence: confidence
    };
  }

  function getMiniLessonRecommendation(scores) {
    var labels = ["structure", "detail", "language"];
    var values = [scores.structure, scores.detail, scores.language];
    var weakest = labels[0];
    var min = values[0];
    for (var i = 1; i < labels.length; i += 1) {
      if (values[i] < min) {
        min = values[i];
        weakest = labels[i];
      }
    }
    if (weakest === "structure") {
      return currentGradeBand === "k2"
        ? "Model oral rehearsal: say sentence, then write sentence."
        : "Teach quick plan-to-draft: claim/topic first, then ordered supporting lines.";
    }
    if (weakest === "detail") {
      return currentMode === "paragraph"
        ? "Teach evidence + explanation: one proof line and one why-it-matters line."
        : "Teach sentence expansion: add one who/what/why detail phrase.";
    }
    return currentGradeBand === "912"
      ? "Teach precision pass: replace vague words and tighten academic register."
      : "Teach word upgrade pass: replace one simple word with a stronger academic choice.";
  }

  function getWeakestDomain(scores) {
    var weakest = "structure";
    var min = scores.structure;
    if (scores.detail < min) {
      min = scores.detail;
      weakest = "detail";
    }
    if (scores.language < min) {
      weakest = "language";
    }
    return weakest;
  }

  function resolveBenchmarkBand(total) {
    var bands = FRAMEWORK_BANDS[currentFramework] || FRAMEWORK_BANDS.ccss;
    var current = bands[0];
    for (var i = 0; i < bands.length; i += 1) {
      if (total >= bands[i].min) current = bands[i];
    }
    return current;
  }

  function getAnchorProfile() {
    var byBand = ANCHOR_PROFILES[currentGradeBand] || ANCHOR_PROFILES["35"];
    return byBand[currentMode] || byBand.sentence;
  }

  function getAnchorAdjustment(text, words, sentenceCount, scores) {
    var profile = getAnchorProfile();
    var severeLow = words < Math.max(1, Math.floor(profile.minWords * 0.65)) || sentenceCount < Math.max(1, profile.minSentences - 1);
    var strongHigh = words >= profile.stretchWords && sentenceCount >= profile.stretchSentences;
    var hasEvidence = EVIDENCE_RE.test(text);
    var balanced = scores.structure >= 2 && scores.detail >= 2 && scores.language >= 2;

    if (severeLow) return -1;
    if (currentMode === "paragraph" && profile.evidencePreferred && !hasEvidence && scores.detail < 2) return -1;
    if (strongHigh && balanced) return 1;
    return 0;
  }

  function getBenchmarkConfidence(text, words, sentenceCount) {
    var profile = getAnchorProfile();
    var hasEvidence = EVIDENCE_RE.test(text);
    if (words < profile.minWords || sentenceCount < profile.minSentences) {
      return "Low (build more writing)";
    }
    if (currentMode === "paragraph" && profile.evidencePreferred && !hasEvidence) {
      return "Medium (add evidence to stabilize)";
    }
    if (words >= profile.stretchWords || sentenceCount >= profile.stretchSentences) {
      return "High (anchor-aligned sample)";
    }
    return "Medium (developing sample)";
  }

  function renderBenchmarkLens(text, total, scores, words, sentenceCount) {
    if (!benchmarkLevelEl || !benchmarkNoteEl) return;
    var adjustedTotal = Math.max(0, Math.min(9, total + getAnchorAdjustment(text, words, sentenceCount, scores)));
    var band = resolveBenchmarkBand(adjustedTotal);
    var weak = getWeakestDomain(scores);
    var target = weak === "structure"
      ? "Prioritize organization and claim clarity next."
      : (weak === "detail"
        ? "Prioritize evidence/detail elaboration next."
        : "Prioritize vocabulary precision and sentence control next.");
    var gradeLabel = currentGradeBand === "k2" ? "K-2" : (currentGradeBand === "35" ? "3-5" : (currentGradeBand === "68" ? "6-8" : "9-12"));
    benchmarkLevelEl.textContent = band.level + " (local estimate)";
    benchmarkNoteEl.textContent = band.note + " " + target;
    if (calibrationEl) calibrationEl.textContent = gradeLabel + " " + currentMode + " anchor set";
    if (benchmarkConfidenceEl) benchmarkConfidenceEl.textContent = getBenchmarkConfidence(text, words, sentenceCount);
  }

  function getExemplarLevelLabels() {
    var bands = FRAMEWORK_BANDS[currentFramework] || FRAMEWORK_BANDS.ccss;
    return [
      bands[0] ? bands[0].level : "Emerging",
      bands[1] ? bands[1].level : "Developing",
      bands[bands.length - 1] ? bands[bands.length - 1].level : "Strong"
    ];
  }

  function getExemplarBank() {
    if (currentMode === "paragraph") {
      if (currentGradeBand === "k2") {
        return [
          { sample: "I think recess is good. Kids run. We play.", strength: "States a clear opinion with simple complete sentences." },
          { sample: "I think recess is important because our bodies need movement. For example, we run and our hearts get stronger.", strength: "Adds a reason and a simple evidence phrase." },
          { sample: "Recess should stay in our school day because movement improves focus. For example, after running we return calmer and ready to learn, so recess helps both health and class learning.", strength: "Strong claim-evidence-explanation flow with clear connection to learning." }
        ];
      }
      if (currentGradeBand === "35") {
        return [
          { sample: "I believe school gardens help students. Plants grow and we learn outside.", strength: "Introduces a claim and stays on one topic." },
          { sample: "School gardens help students learn science in real ways. According to our class notes, we measured plant growth each week and explained changes.", strength: "Uses relevant classroom evidence and basic academic language." },
          { sample: "School gardens should be part of every elementary campus because they build science knowledge and responsibility. According to our data table, plants in the sunny bed grew faster, which helped us analyze cause and effect.", strength: "Precise claim, embedded evidence, and explanation of significance." }
        ];
      }
      if (currentGradeBand === "68") {
        return [
          { sample: "Uniforms can help schools. They make students look the same.", strength: "Simple claim and topic control." },
          { sample: "School uniforms can improve focus by reducing clothing-based distraction. For instance, our advisory survey showed many students felt morning routines were easier.", strength: "Relevant evidence with basic reasoning." },
          { sample: "Uniform policies can support learning climate when implemented fairly. Although some students argue uniforms reduce expression, survey evidence and attendance patterns suggest fewer social distractions and smoother transitions into class.", strength: "Balanced reasoning, counterpoint, and evidence-based analysis." }
        ];
      }
      return [
        { sample: "Social media affects teens. It changes communication and attention.", strength: "Clear claim with focused topic." },
        { sample: "Social media platforms influence adolescent communication patterns in both positive and negative ways. For example, students report quicker collaboration, yet many also describe shortened attention spans during homework.", strength: "Nuanced claim with relevant examples." },
        { sample: "Social media's educational impact is conditional rather than uniformly harmful or beneficial. While critics cite distraction, structured classroom integration can improve collaboration and feedback cycles, suggesting policy should emphasize guided use over blanket restriction.", strength: "Sophisticated qualification, counterargument, and policy-oriented reasoning." }
      ];
    }

    if (currentGradeBand === "k2") {
      return [
        { sample: "The dog is big. It runs.", strength: "Writes complete short sentences." },
        { sample: "The brown dog runs fast because it wants the red ball.", strength: "Uses detail and a connector to extend meaning." },
        { sample: "First the brown dog waits, then it sprints across the grass because it sees the red ball, and everyone cheers.", strength: "Strong sequencing and expanded detail in connected sentences." }
      ];
    }
    if (currentGradeBand === "35") {
      return [
        { sample: "Rainforest animals live in trees. They need safe places.", strength: "Clear topic and basic support." },
        { sample: "Rainforest animals often live in layers of the forest, so each animal can find food and shelter.", strength: "Uses domain vocabulary and cause/effect connection." },
        { sample: "Rainforest animals adapt to specific canopy layers because food, light, and protection vary by height; therefore, each species occupies a niche that supports survival.", strength: "Precise vocabulary, sentence complexity, and logical linking." }
      ];
    }
    if (currentGradeBand === "68") {
      return [
        { sample: "Renewable energy helps the environment. It can reduce pollution.", strength: "States a central idea clearly." },
        { sample: "Renewable energy reduces long-term emissions because solar and wind systems produce power without burning fossil fuels.", strength: "Clear reasoning with accurate content terms." },
        { sample: "Renewable energy transitions reduce emissions and diversify energy security; however, effective implementation requires grid modernization and storage planning.", strength: "Complex sentence control with concession and technical precision." }
      ];
    }
    return [
      { sample: "Literature can shape culture by influencing language and values.", strength: "Focused claim with formal tone." },
      { sample: "Literature shapes cultural norms by modeling values, conflict, and social critique, allowing readers to evaluate beliefs through narrative distance.", strength: "Abstract reasoning with controlled syntax." },
      { sample: "Literature not only mirrors culture but also reconstitutes it by reframing moral language, legitimizing dissent, and extending the boundaries of collective imagination.", strength: "High conceptual density, rhetorical control, and precise diction." }
    ];
  }

  function resolveExemplarIndex(total) {
    if (total <= 3) return 0;
    if (total <= 6) return 1;
    return 2;
  }

  function renderExemplars(total) {
    if (!exemplarListEl) return;
    var labels = getExemplarLevelLabels();
    var bank = getExemplarBank();
    var activeIdx = resolveExemplarIndex(total);
    exemplarListEl.innerHTML = "";
    bank.forEach(function (entry, idx) {
      var card = document.createElement("div");
      card.className = "ws-tip ws-exemplar" + (idx === activeIdx ? " is-active" : "");

      var title = document.createElement("div");
      title.className = "ws-exemplar-title";
      title.textContent = labels[idx] || "Range";

      var sample = document.createElement("div");
      sample.className = "ws-exemplar-sample";
      sample.textContent = "\"" + entry.sample + "\"";

      var strength = document.createElement("div");
      strength.className = "ws-exemplar-strength";
      strength.textContent = "Strength: " + entry.strength;

      card.appendChild(title);
      card.appendChild(sample);
      card.appendChild(strength);
      exemplarListEl.appendChild(card);
    });
  }

  function setScaffoldCue(text) {
    if (scaffoldCueEl) scaffoldCueEl.textContent = text;
  }

  function getStepUpSequenceText() {
    var byBand = STEPUP_SEQUENCE[currentGradeBand] || STEPUP_SEQUENCE["35"];
    return byBand[currentMode] || byBand.sentence;
  }

  function renderStepUpMode() {
    if (stepUpToggleBtn) {
      stepUpToggleBtn.classList.toggle("is-active", stepUpEnabled);
      stepUpToggleBtn.setAttribute("aria-pressed", stepUpEnabled ? "true" : "false");
      stepUpToggleBtn.textContent = stepUpEnabled ? "Step Up Mode" : "Step Up Off";
    }
    if (stepUpSeqEl) stepUpSeqEl.style.display = stepUpEnabled ? "" : "none";
    if (stepUpColorsEl) stepUpColorsEl.style.display = stepUpEnabled ? "" : "none";
    var text = getStepUpSequenceText();
    if (stepUpTargetEl) stepUpTargetEl.textContent = text;
    if (stepUpGradeTargetEl) stepUpGradeTargetEl.textContent = text;
  }

  function setStepUpEnabled(enabled, options) {
    stepUpEnabled = Boolean(enabled);
    renderStepUpMode();
    try {
      localStorage.setItem(STEPUP_KEY, stepUpEnabled ? "on" : "off");
    } catch (_error) {
      // Ignore storage write errors.
    }
    if (!(options && options.silent)) {
      showToast(stepUpEnabled ? "Step Up Mode on" : "Step Up Mode off");
    }
  }

  function toggleStepUpMode() {
    setStepUpEnabled(!stepUpEnabled);
  }

  function loadStepUpMode() {
    var stored = "on";
    try {
      stored = localStorage.getItem(STEPUP_KEY) || "on";
    } catch (_error) {
      stored = "on";
    }
    setStepUpEnabled(stored !== "off", { silent: true });
  }

  function withMutedToasts(fn) {
    toastSuppressed = true;
    try {
      fn();
    } finally {
      toastSuppressed = false;
    }
  }

  function setPresetPack(packId, options) {
    var normalized = Object.prototype.hasOwnProperty.call(PRESET_PACKS, packId) ? packId : "custom";
    var pack = PRESET_PACKS[normalized] || {};
    currentPreset = normalized;
    if (presetSelect) presetSelect.value = normalized;

    withMutedToasts(function () {
      if (pack.mode) setMode(pack.mode);
      if (pack.profile) setProfile(pack.profile);
      if (pack.framework) setFramework(pack.framework, { silent: true });
      if (pack.audience) setAudience(pack.audience, { silent: true });
      if (typeof pack.stepUp === "boolean") setStepUpEnabled(pack.stepUp, { silent: true });
      if (pack.organizer && organizerTypeSelect) {
        organizerTypeSelect.value = pack.organizer;
        renderOrganizerPreview();
      }
    });

    if (pack.cue) setScaffoldCue(pack.cue);
    try {
      localStorage.setItem(PRESET_KEY, normalized);
    } catch (_error) {
      // Ignore storage write errors.
    }
    if (!(options && options.silent)) showToast("Preset: " + (presetSelect && presetSelect.selectedOptions[0] ? presetSelect.selectedOptions[0].textContent.replace("Preset: ", "") : normalized));
  }

  function loadPresetPack() {
    var stored = "custom";
    try {
      stored = localStorage.getItem(PRESET_KEY) || "custom";
    } catch (_error) {
      stored = "custom";
    }
    setPresetPack(stored, { silent: true });
  }

  function normalizeWordQuestGrade(rawGrade) {
    var value = String(rawGrade || "").trim().toUpperCase();
    if (value === "K-2") return "k2";
    if (value === "G3-5" || value === "3-5") return "35";
    if (value === "G6-8" || value === "6-8") return "68";
    if (value === "G9-12" || value === "9-12") return "912";
    return "";
  }

  function isWordQuestContentFocus(focusValue) {
    var raw = String(focusValue || "").trim().toLowerCase();
    if (!raw || raw === "all") return false;
    return raw.indexOf("vocab-") === 0 || raw.indexOf("math") >= 0 || raw.indexOf("science") >= 0 || raw.indexOf("social") >= 0 || raw.indexOf("ela") >= 0;
  }

  function getWordQuestContextFromQuery() {
    try {
      var params = new URLSearchParams(window.location.search || "");
      return {
        gradeBand: normalizeWordQuestGrade(params.get("wq_grade")),
        focus: String(params.get("wq_focus") || "").trim(),
        focusLabel: String(params.get("wq_focus_label") || "").trim(),
        word: String(params.get("wq_word") || "").trim(),
        clue: String(params.get("wq_clue") || "").trim()
      };
    } catch (_error) {
      return { gradeBand: "", focus: "", focusLabel: "", word: "", clue: "" };
    }
  }

  function applyWordQuestContext() {
    var context = getWordQuestContextFromQuery();
    var hasContext = Boolean(context.gradeBand || context.focus || context.word || context.clue);
    if (!hasContext) return;

    withMutedToasts(function () {
      if (context.gradeBand) setGradeBand(context.gradeBand);
      if (isWordQuestContentFocus(context.focus)) setMode("paragraph");
    });

    var topic = context.focusLabel || (context.focus ? context.focus.toUpperCase() : "");
    var detailA = context.word ? ("Use target word: " + context.word) : "";
    var detailB = context.clue ? context.clue : "";

    if (planTopicInput && topic) planTopicInput.value = topic;
    if (planDetailInput && detailA) planDetailInput.value = detailA;

    if (!planItems.length) {
      if (topic && detailA) planItems.push({ topic: topic, detail: detailA });
      if (topic && detailB) planItems.push({ topic: "Sentence clue", detail: detailB });
      if (planItems.length) renderPlanItems();
    }

    if (context.word) {
      var wordPrompt = currentMode === "paragraph"
        ? "Use \"" + context.word + "\" in your claim and evidence."
        : "Write one clear sentence that uses \"" + context.word + "\".";
      setScaffoldCue(wordPrompt);
    } else if (context.focusLabel) {
      setScaffoldCue("Write about: " + context.focusLabel + ".");
    }

    updateMetricsAndCoach();
    showToast("WordQuest context loaded");
  }

  function normalizeCode(value, fallback) {
    var raw = String(value || "").trim().toUpperCase().replace(/[^A-Z0-9]/g, "");
    if (!raw) return fallback;
    return raw.slice(0, 6);
  }

  function loadMarkCodes() {
    var parsed = null;
    try {
      parsed = JSON.parse(localStorage.getItem(STEPUP_CODES_KEY) || "null");
    } catch (_error) {
      parsed = null;
    }
    markCodes = {
      topic: normalizeCode(parsed && parsed.topic, DEFAULT_MARK_CODES.topic),
      detail: normalizeCode(parsed && parsed.detail, DEFAULT_MARK_CODES.detail),
      explain: normalizeCode(parsed && parsed.explain, DEFAULT_MARK_CODES.explain),
      transition: normalizeCode(parsed && parsed.transition, DEFAULT_MARK_CODES.transition),
      vocab: normalizeCode(parsed && parsed.vocab, DEFAULT_MARK_CODES.vocab)
    };
  }

  function renderMarkCodes() {
    if (codeTopicInput) codeTopicInput.value = markCodes.topic;
    if (codeDetailInput) codeDetailInput.value = markCodes.detail;
    if (codeExplainInput) codeExplainInput.value = markCodes.explain;
    if (codeTransitionInput) codeTransitionInput.value = markCodes.transition;
    if (codeVocabInput) codeVocabInput.value = markCodes.vocab;
    if (markTopicBtn) markTopicBtn.textContent = "Mark Topic [" + markCodes.topic + "]";
    if (markDetailBtn) markDetailBtn.textContent = "Mark Detail [" + markCodes.detail + "]";
    if (markExplainBtn) markExplainBtn.textContent = "Mark Explain [" + markCodes.explain + "]";
    if (markTransitionBtn) markTransitionBtn.textContent = "Mark Transition [" + markCodes.transition + "]";
    if (markVocabBtn) markVocabBtn.textContent = "Mark Vocab [" + markCodes.vocab + "]";
  }

  function saveMarkCodes() {
    markCodes = {
      topic: normalizeCode(codeTopicInput && codeTopicInput.value, DEFAULT_MARK_CODES.topic),
      detail: normalizeCode(codeDetailInput && codeDetailInput.value, DEFAULT_MARK_CODES.detail),
      explain: normalizeCode(codeExplainInput && codeExplainInput.value, DEFAULT_MARK_CODES.explain),
      transition: normalizeCode(codeTransitionInput && codeTransitionInput.value, DEFAULT_MARK_CODES.transition),
      vocab: normalizeCode(codeVocabInput && codeVocabInput.value, DEFAULT_MARK_CODES.vocab)
    };
    renderMarkCodes();
    try {
      localStorage.setItem(STEPUP_CODES_KEY, JSON.stringify(markCodes));
    } catch (_error) {
      // Ignore storage write errors.
    }
    showToast("Marking codes saved");
  }

  function resetMarkCodes() {
    markCodes = {
      topic: DEFAULT_MARK_CODES.topic,
      detail: DEFAULT_MARK_CODES.detail,
      explain: DEFAULT_MARK_CODES.explain,
      transition: DEFAULT_MARK_CODES.transition,
      vocab: DEFAULT_MARK_CODES.vocab
    };
    renderMarkCodes();
    try {
      localStorage.setItem(STEPUP_CODES_KEY, JSON.stringify(markCodes));
    } catch (_error) {
      // Ignore storage write errors.
    }
    showToast("Marking codes reset");
  }

  function normalizeSentenceCompare(text) {
    return String(text || "")
      .toLowerCase()
      .replace(/[^a-z0-9 ]+/g, "")
      .replace(/\s+/g, " ")
      .trim();
  }

  function loadWarmupStats() {
    var parsed = null;
    try {
      parsed = JSON.parse(localStorage.getItem(WARMUP_STATS_KEY) || "null");
    } catch (_error) {
      parsed = null;
    }
    warmupStreak = Number(parsed && parsed.streak) > 0 ? Number(parsed.streak) : 0;
    warmupBest = Number(parsed && parsed.best) > 0 ? Number(parsed.best) : 0;
  }

  function saveWarmupStats() {
    try {
      localStorage.setItem(WARMUP_STATS_KEY, JSON.stringify({ streak: warmupStreak, best: warmupBest }));
    } catch (_error) {
      // Ignore storage write errors.
    }
  }

  function formatRoundTime(seconds) {
    var safe = Math.max(0, Number(seconds) || 0);
    var mins = String(Math.floor(safe / 60)).padStart(2, "0");
    var secs = String(safe % 60).padStart(2, "0");
    return mins + ":" + secs;
  }

  function loadPublishWall() {
    var parsed = null;
    try {
      parsed = JSON.parse(localStorage.getItem(WALL_KEY) || "[]");
    } catch (_error) {
      parsed = [];
    }
    if (!Array.isArray(parsed)) parsed = [];
    publishWall = parsed
      .filter(function (item) {
        return item && typeof item.line === "string" && item.line.trim().length > 0;
      })
      .slice(0, 12);
  }

  function savePublishWall() {
    try {
      localStorage.setItem(WALL_KEY, JSON.stringify(publishWall.slice(0, 12)));
    } catch (_error) {
      // Ignore storage write errors.
    }
  }

  function renderPublishWall() {
    if (!publishWallEl) return;
    publishWallEl.innerHTML = "";
    if (!publishWall.length) {
      var empty = document.createElement("div");
      empty.className = "ws-wall-meta";
      empty.textContent = "No lines pinned yet. Pin one strong sentence.";
      publishWallEl.appendChild(empty);
      return;
    }
    publishWall.slice(0, 8).forEach(function (entry) {
      var item = document.createElement("div");
      item.className = "ws-wall-item";

      var line = document.createElement("div");
      line.className = "ws-wall-line";
      line.textContent = "\"" + entry.line + "\"";

      var meta = document.createElement("div");
      meta.className = "ws-wall-meta";
      var stamp = entry.ts ? new Date(entry.ts).toLocaleDateString() : "";
      var grade = entry.grade || "";
      var mode = entry.mode || "";
      meta.textContent = [stamp, grade, mode].filter(Boolean).join(" • ");

      item.appendChild(line);
      item.appendChild(meta);
      publishWallEl.appendChild(item);
    });
  }

  function selectBestLineFromText(text) {
    var lines = getTextSentences(text);
    if (!lines.length) return "";
    var scored = lines.map(function (line) {
      var score = 0;
      if (EVIDENCE_RE.test(line)) score += 2;
      if (CLAIM_RE.test(line)) score += 1;
      if (CONJUNCTION_RE.test(line)) score += 1;
      score += Math.min(2, Math.floor(line.split(/\s+/).length / 8));
      return { line: line, score: score };
    });
    scored.sort(function (a, b) { return b.score - a.score; });
    return scored[0].line;
  }

  function pinBestLine() {
    var text = editor.value || "";
    var line = selectBestLineFromText(text);
    if (!line) {
      showToast("Write at least one sentence first");
      return;
    }
    var grade = currentGradeBand === "k2" ? "K-2" : (currentGradeBand === "35" ? "3-5" : (currentGradeBand === "68" ? "6-8" : "9-12"));
    publishWall.unshift({
      line: line,
      ts: Date.now(),
      grade: grade,
      mode: currentMode
    });
    publishWall = publishWall.slice(0, 12);
    savePublishWall();
    renderPublishWall();
    showToast("Best line pinned");
  }

  function clearPublishWall() {
    publishWall = [];
    savePublishWall();
    renderPublishWall();
    showToast("Publishing wall cleared");
  }

  function openShowcase() {
    if (!showcaseEl) return;
    var line = selectBestLineFromText(editor.value || "");
    if (!line && publishWall.length) line = publishWall[0].line;
    if (!line) line = "Write a line, then open Showcase.";
    if (showcaseLineEl) showcaseLineEl.textContent = line;
    showcaseOpen = true;
    showcaseEl.classList.add("is-open");
    showcaseEl.setAttribute("aria-hidden", "false");
    if (showcaseToggleBtn) {
      showcaseToggleBtn.classList.add("is-active");
      showcaseToggleBtn.setAttribute("aria-pressed", "true");
    }
    showToast("Showcase on");
  }

  function closeShowcase() {
    if (!showcaseEl) return;
    showcaseOpen = false;
    showcaseEl.classList.remove("is-open");
    showcaseEl.setAttribute("aria-hidden", "true");
    if (showcaseToggleBtn) {
      showcaseToggleBtn.classList.remove("is-active");
      showcaseToggleBtn.setAttribute("aria-pressed", "false");
    }
  }

  function toggleShowcase() {
    if (showcaseOpen) {
      closeShowcase();
      showToast("Showcase off");
      return;
    }
    openShowcase();
  }

  function copyFamilyPrompt() {
    var line = selectBestLineFromText(editor.value || "") || "We are building our writing one clear sentence at a time.";
    var goal = goalEl ? goalEl.textContent : "Add one clear sentence.";
    var prompt = "Family 5-Minute Writing Prompt\n1) Ask your child to read this line: \"" + line + "\"\n2) Praise one strength you hear.\n3) Do one next move together: " + goal;
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(prompt).then(function () {
        showToast("Family prompt copied");
      }).catch(function () {
        showToast("Copy blocked by browser");
      });
      return;
    }
    showToast("Clipboard not available");
  }

  function renderWarmupArcade() {
    if (warmupStreakEl) warmupStreakEl.textContent = String(warmupStreak);
    if (warmupBestEl) warmupBestEl.textContent = String(warmupBest);
    if (warmupRoundTimeEl) warmupRoundTimeEl.textContent = warmupRoundTimer ? formatRoundTime(warmupRoundSeconds) : "--:--";
    if (warmupRoundScoreEl) warmupRoundScoreEl.textContent = String(warmupRoundScore);
    if (warmupRoundStartBtn) warmupRoundStartBtn.textContent = warmupRoundTimer ? "Stop Round" : "Start Timed Round";
    if (warmupClassToggleBtn) {
      warmupClassToggleBtn.classList.toggle("is-active", warmupClassMode);
      warmupClassToggleBtn.setAttribute("aria-pressed", warmupClassMode ? "true" : "false");
      warmupClassToggleBtn.textContent = warmupClassMode ? "Class Challenge: On" : "Class Challenge: Off";
    }
  }

  function stopWarmupRound(complete) {
    if (warmupRoundTimer) {
      window.clearInterval(warmupRoundTimer);
      warmupRoundTimer = null;
    }
    if (complete && warmupStatusEl) {
      warmupStatusEl.textContent = "Round complete: " + warmupRoundScore + " correct.";
    }
    renderWarmupArcade();
  }

  function tickWarmupRound() {
    warmupRoundSeconds = Math.max(0, warmupRoundSeconds - 1);
    renderWarmupArcade();
    if (warmupRoundSeconds <= 0) {
      stopWarmupRound(true);
      showToast("Round complete");
    }
  }

  function toggleWarmupRound() {
    if (warmupRoundTimer) {
      stopWarmupRound(false);
      showToast("Round stopped");
      return;
    }
    warmupRoundScore = 0;
    warmupRoundSeconds = warmupClassMode ? 180 : 120;
    renderWarmupArcade();
    if (warmupStatusEl) warmupStatusEl.textContent = warmupClassMode ? "Class round live. Keep the pace." : "Round live. Fix fast and accurately.";
    warmupRoundTimer = window.setInterval(tickWarmupRound, 1000);
    showToast("Timed round started");
  }

  function toggleWarmupClassMode() {
    warmupClassMode = !warmupClassMode;
    renderWarmupArcade();
    if (warmupStatusEl) warmupStatusEl.textContent = warmupClassMode ? "Class challenge mode on." : "Class challenge mode off.";
  }

  function getWarmupPool() {
    return BROKEN_SENTENCES[currentGradeBand] || BROKEN_SENTENCES["35"];
  }

  function renderWarmup() {
    var pool = getWarmupPool();
    if (!pool.length) return;
    if (warmupIndex >= pool.length) warmupIndex = 0;
    currentWarmup = pool[warmupIndex];
    if (warmupBrokenEl) warmupBrokenEl.textContent = currentWarmup.broken;
    if (warmupHintEl) warmupHintEl.textContent = currentWarmup.hint;
    if (warmupInput) warmupInput.value = "";
    if (warmupStatusEl) warmupStatusEl.textContent = "Try one fix.";
    renderWarmupArcade();
  }

  function nextWarmup() {
    var pool = getWarmupPool();
    if (!pool.length) return;
    warmupIndex = (warmupIndex + 1) % pool.length;
    renderWarmup();
  }

  function checkWarmup() {
    if (!currentWarmup || !warmupInput) return;
    var typed = normalizeSentenceCompare(warmupInput.value);
    var target = normalizeSentenceCompare(currentWarmup.fixed);
    if (!typed) {
      if (warmupStatusEl) warmupStatusEl.textContent = "Type your fix first.";
      return;
    }
    if (typed === target) {
      warmupStreak += 1;
      warmupBest = Math.max(warmupBest, warmupStreak);
      if (warmupRoundTimer) warmupRoundScore += 1;
      saveWarmupStats();
      renderWarmupArcade();
      if (warmupStatusEl) warmupStatusEl.textContent = "Correct. Nice fix.";
      showToast("Warm-up correct");
      return;
    }
    warmupStreak = 0;
    saveWarmupStats();
    renderWarmupArcade();
    if (warmupStatusEl) warmupStatusEl.textContent = "Almost. Check capitalization, punctuation, and connectors.";
  }

  function insertMarker(code, label) {
    if (!stepUpEnabled) {
      showToast("Enable Step Up Mode first");
      return;
    }
    var start = Number(editor.selectionStart || 0);
    var end = Number(editor.selectionEnd || 0);
    var value = editor.value || "";
    if (end > start) {
      var selected = value.slice(start, end);
      editor.value = value.slice(0, start) + "[" + code + ": " + selected + "]" + value.slice(end);
      editor.selectionStart = editor.selectionEnd = start + code.length + selected.length + 4;
    } else {
      var marker = "[" + code + "] ";
      editor.value = value.slice(0, start) + marker + value.slice(start);
      editor.selectionStart = editor.selectionEnd = start + marker.length;
    }
    editor.focus();
    updateMetricsAndCoach();
    showToast(label + " marked");
  }

  function copyMarkedDraft() {
    var text = (editor.value || "").trim();
    if (!text) {
      showToast("Draft is empty");
      return;
    }
    var header = "Step Up Marked Draft (" + (currentGradeBand === "k2" ? "K-2" : currentGradeBand === "35" ? "3-5" : currentGradeBand === "68" ? "6-8" : "9-12") + ", " + currentMode + ")\n";
    var key = "Marking Key: [" + markCodes.topic + "]=Topic [" + markCodes.detail + "]=Detail [" + markCodes.explain + "]=Explain [" + markCodes.transition + "]=Transition [" + markCodes.vocab + "]=Vocab\n";
    var payload = header + key + text;
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(payload).then(function () {
        showToast("Marked draft copied");
      }).catch(function () {
        showToast("Copy blocked by browser");
      });
      return;
    }
    showToast("Clipboard not available");
  }

  function setAudience(audience, options) {
    var normalized = audience === "teacher" || audience === "family" ? audience : "student";
    currentAudience = normalized;
    audienceButtons.forEach(function (btn) {
      btn.classList.toggle("is-active", btn.getAttribute("data-audience") === normalized);
    });

    if (subtitleEl) {
      if (normalized === "teacher") subtitleEl.textContent = "Lead high-impact writing moves with less prep load.";
      else if (normalized === "family") subtitleEl.textContent = "Support writing at home with calm, clear next steps.";
      else subtitleEl.textContent = "Build ideas with structure — not stress.";
    }

    if (welcomeEl) {
      if (normalized === "teacher") welcomeEl.textContent = "Teacher view: model, coach, and conference with confidence.";
      else if (normalized === "family") welcomeEl.textContent = "Family view: praise effort, then prompt one next move.";
      else welcomeEl.textContent = "Student view: one small step at a time.";
    }

    if (normalized === "teacher") {
      setScaffoldCue("Try: Glow first, then one clear Grow point.");
    } else if (normalized === "family") {
      setScaffoldCue("At home: celebrate one strength, then add one sentence together.");
    } else {
      setScaffoldCue("Use one tool, then write one line.");
    }

    try {
      localStorage.setItem(AUDIENCE_KEY, normalized);
    } catch (_error) {
      // Ignore storage write errors.
    }
    if (!(options && options.silent)) showToast("Audience: " + (normalized === "teacher" ? "Teacher" : normalized === "family" ? "Family" : "Student"));
  }

  function loadAudience() {
    var stored = "student";
    try {
      stored = localStorage.getItem(AUDIENCE_KEY) || "student";
    } catch (_error) {
      stored = "student";
    }
    setAudience(stored, { silent: true });
  }

  function getMicroStepCue() {
    var map = {
      plan: currentMode === "paragraph" ? "Write only your claim first." : "Write only your topic sentence first.",
      draft: currentMode === "paragraph" ? "Add one evidence sentence only." : "Add one detail sentence only.",
      revise: "Change one word to a stronger word.",
      publish: "Read one line aloud and fix one part."
    };
    return map[currentStep] || "Write one clear line.";
  }

  function insertStem() {
    var stem = (MODEL_STEMS[currentMode] && MODEL_STEMS[currentMode][currentStep]) || "";
    if (!stem) stem = currentMode === "paragraph" ? "Claim: ___ because ___." : "First, ___ because ___.";
    var prefix = editor.value.trim().length === 0 ? "" : "\n";
    editor.value += prefix + stem;
    editor.focus();
    updateMetricsAndCoach();
    setScaffoldCue("Stem added. Fill the blanks, then continue.");
    showToast("Sentence stem added");
  }

  function insertIdeaPrompt() {
    var cue = currentMode === "paragraph"
      ? "Idea Prompt: What is your main point? Why does it matter to your reader?"
      : "Idea Prompt: Who/what is this about? What is happening? Why?";
    var prefix = editor.value.trim().length === 0 ? "" : "\n";
    editor.value += prefix + cue;
    editor.focus();
    updateMetricsAndCoach();
    setScaffoldCue("Answer the prompt in one sentence.");
    showToast("Idea prompt added");
  }

  function insertEvidenceFrame() {
    var frame = currentMode === "paragraph"
      ? "According to the text, ___. This shows ___."
      : "Because ___, ___ happened.";
    var prefix = editor.value.trim().length === 0 ? "" : "\n";
    editor.value += prefix + frame;
    editor.focus();
    updateMetricsAndCoach();
    setScaffoldCue("Complete one evidence frame.");
    showToast("Evidence frame added");
  }

  function applyCalmReset() {
    stopSprint();
    setStep("plan");
    setScaffoldCue("Pause. Breathe in for 4, out for 4. Then write one line only.");
    showToast("Calm reset loaded");
  }

  function applyNextSmallStep() {
    var cue = getMicroStepCue();
    setScaffoldCue(cue);
    if (currentStep === "plan") {
      planTopicInput && planTopicInput.focus();
    } else {
      editor.focus();
    }
    showToast("Next small step");
  }

  function renderMasterySnapshot(text, words, sentenceCount) {
    if (!rubric1El || !rubric2El || !rubric3El || !rubricScoreEl || !miniLessonEl) return;
    var scores = getDomainScores(text, words, sentenceCount);
    var structure = scores.structure;
    var detail = scores.detail;
    var language = scores.language;
    var total = scores.total;

    rubric1El.textContent = structure + "/3";
    rubric2El.textContent = detail + "/3";
    rubric3El.textContent = language + "/3";
    rubricScoreEl.textContent = total + "/9";
    renderBenchmarkLens(text, total, { structure: structure, detail: detail, language: language }, words, sentenceCount);
    renderExemplars(total);
    miniLessonEl.textContent = getMiniLessonRecommendation({ structure: structure, detail: detail, language: language });
  }

  function formatSprint(seconds) {
    var safe = Math.max(0, seconds);
    var mins = String(Math.floor(safe / 60)).padStart(2, "0");
    var secs = String(safe % 60).padStart(2, "0");
    return mins + ":" + secs;
  }

  function renderSprint() {
    if (sprintTimeEl) sprintTimeEl.textContent = formatSprint(sprintRemaining);
    if (sprintStartBtn) sprintStartBtn.textContent = sprintTimer ? "Pause Sprint" : "Start Sprint";
  }

  function stopSprint() {
    if (sprintTimer) {
      window.clearInterval(sprintTimer);
      sprintTimer = null;
    }
    renderSprint();
  }

  function setStepByChunk() {
    var elapsed = sprintTotalSeconds - sprintRemaining;
    var chunkWindow = Math.max(30, Math.floor(sprintTotalSeconds / 4));
    var chunk = Math.min(3, Math.floor(elapsed / chunkWindow));
    if (chunk !== sprintChunkIndex) {
      sprintChunkIndex = chunk;
      setStep(STEP_ORDER[sprintChunkIndex] || "plan");
      showToast("Sprint move: " + (GOALS_BY_MODE[currentMode][currentStep] || "Next step"));
    }
  }

  function tickSprint() {
    sprintRemaining = Math.max(0, sprintRemaining - 1);
    setStepByChunk();
    renderSprint();
    if (sprintRemaining <= 0) {
      stopSprint();
      setStep("publish");
      showToast("Sprint complete");
    }
  }

  function toggleSprint() {
    if (sprintTimer) {
      stopSprint();
      return;
    }
    sprintTimer = window.setInterval(tickSprint, 1000);
    renderSprint();
    showToast("Sprint started");
  }

  function resetSprint() {
    stopSprint();
    sprintRemaining = sprintTotalSeconds;
    sprintChunkIndex = 0;
    setStep("plan");
    renderSprint();
  }

  function setProfile(profile) {
    var next = PROFILE_CONFIG[profile] ? profile : "whole";
    currentProfile = next;
    profileButtons.forEach(function (btn) {
      btn.classList.toggle("is-active", btn.getAttribute("data-profile") === next);
    });
    sprintTotalSeconds = PROFILE_CONFIG[next].sprintSeconds;
    teacherModel = next === "one";
    if (modelBtn) {
      modelBtn.classList.toggle("is-active", teacherModel);
      modelBtn.setAttribute("aria-pressed", teacherModel ? "true" : "false");
      modelBtn.textContent = teacherModel ? "Teacher Model: On" : "Teacher Model: Off";
    }
    resetSprint();
    if (next === "whole") {
      currentStep = "plan";
    }
    if (modelBtn) modelBtn.disabled = next === "whole";
    if (nextStepBtn) nextStepBtn.textContent = next === "whole" ? "Advance Step" : "Next Move";
    updateMetricsAndCoach();
    showToast("Profile: " + (next === "whole" ? "Whole Class" : next === "small" ? "Small Group" : "1:1"));
  }

  function updateMetricsAndCoach() {
    var text = editor.value;
    var words = getWordCount(text);
    var sentences = splitSentences(text).length;
    metrics.textContent = sentences + " sentence" + (sentences === 1 ? "" : "s") + " • " + words + " word" + (words === 1 ? "" : "s");
    renderFlowState(text, words, sentences);
    renderGoal(text, words, sentences);
    renderCoachTips(text, words, sentences);
    renderGlowGrowGo(text, words, sentences);
    renderConferenceCopilot(text, words, sentences);
    renderMasterySnapshot(text, words, sentences);
    renderPlanningMeter(text, words, sentences);
  }

  function renderVocabPills() {
    var byBand = VOCAB_BY_MODE[currentGradeBand] || VOCAB_BY_MODE["35"];
    var source = byBand[currentMode] || byBand.sentence;
    vocab.innerHTML = "";
    source.slice(0, 10).forEach(function (word) {
      var pill = document.createElement("button");
      pill.type = "button";
      pill.className = "ws-pill";
      pill.textContent = word;
      pill.addEventListener("click", function () {
        var next = editor.value.trim().length === 0 ? word : editor.value + " " + word;
        editor.value = next;
        editor.focus();
        updateMetricsAndCoach();
      });
      vocab.appendChild(pill);
    });
  }

  function renderChecklist() {
    var byBand = CHECKLIST_BY_MODE[currentGradeBand] || CHECKLIST_BY_MODE["35"];
    var labels = byBand[currentMode] || byBand.sentence;
    if (checklist1) checklist1.textContent = labels[0];
    if (checklist2) checklist2.textContent = labels[1];
    if (checklist3) checklist3.textContent = labels[2];
  }

  function setGradeBand(band) {
    var normalized = ["k2", "35", "68", "912"].indexOf(String(band)) >= 0 ? String(band) : "35";
    currentGradeBand = normalized;
    if (gradeBandSelect) gradeBandSelect.value = normalized;
    renderChecklist();
    renderVocabPills();
    renderStepUpMode();
    renderWarmup();
    updateMetricsAndCoach();
    showToast("Grade band: " + (normalized === "k2" ? "K-2" : normalized === "35" ? "3-5" : normalized === "68" ? "6-8" : "9-12"));
  }

  function setFramework(framework, options) {
    var normalized = Object.prototype.hasOwnProperty.call(FRAMEWORK_BANDS, framework) ? framework : "ccss";
    currentFramework = normalized;
    if (frameworkSelect) frameworkSelect.value = normalized;
    updateMetricsAndCoach();
    if (!(options && options.silent)) {
      showToast("Benchmark updated");
    }
    try {
      localStorage.setItem(FRAMEWORK_KEY, normalized);
    } catch (_error) {
      // Ignore storage write errors.
    }
  }

  function showToast(message) {
    if (toastSuppressed) return;
    var toast = document.getElementById("ws-toast");
    if (!toast) {
      toast = document.createElement("div");
      toast.id = "ws-toast";
      document.body.appendChild(toast);
    }
    toast.textContent = message;
    toast.classList.add("is-visible");
    window.setTimeout(function () {
      toast.classList.remove("is-visible");
    }, 1200);
  }

  function saveDraft() {
    localStorage.setItem(DRAFT_KEY, editor.value);
    showToast("Draft saved");
  }

  function clearDraft() {
    editor.value = "";
    localStorage.removeItem(DRAFT_KEY);
    checklistInputs.forEach(function (input) { input.checked = false; });
    currentStep = "plan";
    if (window.speechSynthesis) window.speechSynthesis.cancel();
    setScaffoldCue("Use one tool, then write one line.");
    updateMetricsAndCoach();
    showToast("Draft cleared");
  }

  function loadDraft() {
    var saved = localStorage.getItem(DRAFT_KEY);
    if (saved) {
      editor.value = saved;
    }
    updateMetricsAndCoach();
  }

  function loadFramework() {
    var stored = "ccss";
    try {
      stored = localStorage.getItem(FRAMEWORK_KEY) || "ccss";
    } catch (_error) {
      stored = "ccss";
    }
    setFramework(stored, { silent: true });
  }

  function setMode(mode) {
    var previousMode = currentMode;
    currentMode = mode === "paragraph" ? "paragraph" : "sentence";
    modeButtons.forEach(function (btn) {
      var isActive = btn.getAttribute("data-mode") === currentMode;
      btn.classList.toggle("is-active", isActive);
    });
    editor.placeholder = currentMode === "paragraph"
      ? "Write a focused Fish Tank paragraph: claim, evidence, explanation…"
      : "Start a Step Up sentence set: topic + details + connector…";
    if (previousMode !== currentMode) {
      checklistInputs.forEach(function (input) { input.checked = false; });
      currentStep = "plan";
    }
    renderStepUpMode();
    renderChecklist();
    renderVocabPills();
    setImagePrompts(imagePromptItems.length ? buildImagePrompts(imagePromptLabel || "this image") : []);
    updateMetricsAndCoach();
  }

  function setStep(step) {
    if (STEP_ORDER.indexOf(step) === -1) return;
    if (!enforcePlanGate(step)) return;
    currentStep = step;
    updateMetricsAndCoach();
  }

  function toggleTeacherModel() {
    teacherModel = !teacherModel;
    if (modelBtn) {
      modelBtn.classList.toggle("is-active", teacherModel);
      modelBtn.setAttribute("aria-pressed", teacherModel ? "true" : "false");
      modelBtn.textContent = teacherModel ? "Teacher Model: On" : "Teacher Model: Off";
    }
    updateMetricsAndCoach();
  }

  function injectModelStem() {
    var stem = (MODEL_STEMS[currentMode] && MODEL_STEMS[currentMode][currentStep]) || "";
    if (!stem) return;
    var prefix = editor.value.trim().length === 0 ? "" : "\n";
    editor.value += prefix + stem;
    editor.focus();
    updateMetricsAndCoach();
  }

  function advanceToNextStep() {
    var idx = STEP_ORDER.indexOf(currentStep);
    if (idx < 0 || idx === STEP_ORDER.length - 1) return;
    var next = STEP_ORDER[idx + 1];
    if (!enforcePlanGate(next)) return;
    setStep(next);
  }

  function handleNextMove() {
    var text = editor.value;
    var words = getWordCount(text);
    var sentences = splitSentences(text).length;
    if (evaluateStep(currentStep, text, words, sentences)) {
      if (currentStep === "publish") {
        showToast("Publishing ready");
        return;
      }
      advanceToNextStep();
      showToast("Next move loaded");
      return;
    }
    if (teacherModel) {
      injectModelStem();
      showToast("Model stem added");
      return;
    }
    showToast("Finish current move first");
  }

  function getThemeList() {
    if (window.WQThemeRegistry && Array.isArray(window.WQThemeRegistry.order)) {
      return window.WQThemeRegistry.order.slice();
    }
    return ["default", "sunset", "ocean", "coffee", "seahawks", "huskies", "dark", "matrix"];
  }

  function syncAccentVar() {
    var style = getComputedStyle(document.documentElement);
    var accent = style.getPropertyValue("--accent").trim() || FALLBACK_ACCENT;
    document.documentElement.style.setProperty("--hv2-accent", accent);
  }

  function loadPrefs() {
    try {
      return JSON.parse(localStorage.getItem(PREF_KEY) || "{}");
    } catch (_err) {
      return {};
    }
  }

  function savePrefs(prefs) {
    try {
      localStorage.setItem(PREF_KEY, JSON.stringify(prefs || {}));
    } catch (_err) {
      // Ignore storage write errors.
    }
  }

  function normalizeTheme(themeId) {
    var value = String(themeId || "").trim().toLowerCase();
    var list = getThemeList();
    return list.indexOf(value) >= 0 ? value : "default";
  }

  function getThemeFamily(themeId) {
    var normalized = normalizeTheme(themeId);
    if (window.WQThemeRegistry && Array.isArray(window.WQThemeRegistry.themes)) {
      var match = window.WQThemeRegistry.themes.find(function (theme) {
        return theme && theme.id === normalized;
      });
      return match && match.family ? String(match.family) : "core";
    }
    return "core";
  }

  function shouldPersistTheme(prefs) {
    return String((prefs && prefs.themeSave) || "").toLowerCase() === "on";
  }

  function getQueryTheme() {
    try {
      return normalizeTheme(new URLSearchParams(window.location.search).get("theme"));
    } catch (_err) {
      return "";
    }
  }

  function resolveInitialTheme() {
    var fromQuery = getQueryTheme();
    if (fromQuery) return fromQuery;
    var prefs = loadPrefs();
    if (shouldPersistTheme(prefs) && prefs.theme) {
      return normalizeTheme(prefs.theme);
    }
    return normalizeTheme(localStorage.getItem(STUDIO_THEME_KEY) || document.documentElement.getAttribute("data-theme") || "default");
  }

  function applyTheme(themeId) {
    var normalized = normalizeTheme(themeId);
    document.documentElement.setAttribute("data-theme", normalized);
    document.documentElement.setAttribute("data-theme-family", getThemeFamily(normalized));
    body.className = body.className.replace(/\bcs-hv2-theme-[a-z0-9-]+\b/g, "").trim();
    body.classList.add("cs-hv2-theme-" + normalized);
    syncAccentVar();
  }

  function cycleTheme() {
    var prefs = loadPrefs();
    var list = getThemeList();
    var current = normalizeTheme(document.documentElement.getAttribute("data-theme") || "default");
    var idx = list.indexOf(current);
    var next = list[(idx + 1 + list.length) % list.length];
    applyTheme(next);
    localStorage.setItem(STUDIO_THEME_KEY, next);
    if (shouldPersistTheme(prefs)) {
      prefs.theme = next;
      savePrefs(prefs);
    }
    showToast("Theme: " + next);
  }

  function goBackToWordQuest() {
    var current = normalizeTheme(document.documentElement.getAttribute("data-theme") || "default");
    var prefs = loadPrefs();
    localStorage.setItem(STUDIO_THEME_KEY, current);
    if (shouldPersistTheme(prefs)) {
      prefs.theme = current;
      savePrefs(prefs);
    }
    var url = new URL("index.html", window.location.href);
    url.searchParams.set("theme", current);
    window.location.href = url.toString();
  }

  modeButtons.forEach(function (btn) {
    btn.addEventListener("click", function () {
      setMode(btn.getAttribute("data-mode"));
    });
  });
  audienceButtons.forEach(function (btn) {
    btn.addEventListener("click", function () {
      setAudience(btn.getAttribute("data-audience"));
    });
  });
  profileButtons.forEach(function (btn) {
    btn.addEventListener("click", function () {
      setProfile(btn.getAttribute("data-profile"));
    });
  });
  flowButtons.forEach(function (btn) {
    btn.addEventListener("click", function () {
      setStep(btn.getAttribute("data-step"));
    });
  });
  if (modelBtn) modelBtn.addEventListener("click", toggleTeacherModel);
  if (nextStepBtn) nextStepBtn.addEventListener("click", handleNextMove);
  if (planAddBtn) planAddBtn.addEventListener("click", addPlanItem);
  if (planUseBtn) planUseBtn.addEventListener("click", usePlanInDraft);
  if (organizerTypeSelect) organizerTypeSelect.addEventListener("change", renderOrganizerPreview);
  if (organizerApplyBtn) organizerApplyBtn.addEventListener("click", applyOrganizerTemplate);
  if (presetSelect) presetSelect.addEventListener("change", function () { setPresetPack(presetSelect.value); });
  if (gradeBandSelect) gradeBandSelect.addEventListener("change", function () { setGradeBand(gradeBandSelect.value); });
  if (frameworkSelect) frameworkSelect.addEventListener("change", function () { setFramework(frameworkSelect.value); });
  if (dictateBtn) dictateBtn.addEventListener("click", toggleDictation);
  if (readBtn) readBtn.addEventListener("click", readDraftAloud);
  if (imageBtn && imageInput) {
    imageBtn.addEventListener("click", function () { imageInput.click(); });
    imageInput.addEventListener("change", function () {
      var file = imageInput.files && imageInput.files[0];
      handleImageFile(file);
    });
  }
  if (sprintStartBtn) sprintStartBtn.addEventListener("click", toggleSprint);
  if (sprintResetBtn) sprintResetBtn.addEventListener("click", resetSprint);
  if (stepUpToggleBtn) stepUpToggleBtn.addEventListener("click", toggleStepUpMode);
  if (markTopicBtn) markTopicBtn.addEventListener("click", function () { insertMarker(markCodes.topic, "Topic"); });
  if (markDetailBtn) markDetailBtn.addEventListener("click", function () { insertMarker(markCodes.detail, "Detail"); });
  if (markExplainBtn) markExplainBtn.addEventListener("click", function () { insertMarker(markCodes.explain, "Explain"); });
  if (markTransitionBtn) markTransitionBtn.addEventListener("click", function () { insertMarker(markCodes.transition, "Transition"); });
  if (markVocabBtn) markVocabBtn.addEventListener("click", function () { insertMarker(markCodes.vocab, "Vocab"); });
  if (stepUpCopyBtn) stepUpCopyBtn.addEventListener("click", copyMarkedDraft);
  if (codesSaveBtn) codesSaveBtn.addEventListener("click", saveMarkCodes);
  if (codesResetBtn) codesResetBtn.addEventListener("click", resetMarkCodes);
  if (warmupCheckBtn) warmupCheckBtn.addEventListener("click", checkWarmup);
  if (warmupNextBtn) warmupNextBtn.addEventListener("click", nextWarmup);
  if (warmupRoundStartBtn) warmupRoundStartBtn.addEventListener("click", toggleWarmupRound);
  if (warmupClassToggleBtn) warmupClassToggleBtn.addEventListener("click", toggleWarmupClassMode);
  if (pinLineBtn) pinLineBtn.addEventListener("click", pinBestLine);
  if (wallClearBtn) wallClearBtn.addEventListener("click", clearPublishWall);
  if (showcaseToggleBtn) showcaseToggleBtn.addEventListener("click", toggleShowcase);
  if (showcaseCloseBtn) showcaseCloseBtn.addEventListener("click", closeShowcase);
  if (familyCopyBtn) familyCopyBtn.addEventListener("click", copyFamilyPrompt);
  if (warmupInput) warmupInput.addEventListener("keydown", function (event) {
    if (event.key === "Enter") {
      event.preventDefault();
      checkWarmup();
    }
  });
  if (scaffoldNextBtn) scaffoldNextBtn.addEventListener("click", applyNextSmallStep);
  if (scaffoldStemBtn) scaffoldStemBtn.addEventListener("click", insertStem);
  if (scaffoldIdeaBtn) scaffoldIdeaBtn.addEventListener("click", insertIdeaPrompt);
  if (scaffoldEvidenceBtn) scaffoldEvidenceBtn.addEventListener("click", insertEvidenceFrame);
  if (scaffoldCalmBtn) scaffoldCalmBtn.addEventListener("click", applyCalmReset);

  editor.addEventListener("input", updateMetricsAndCoach);
  saveBtn.addEventListener("click", saveDraft);
  clearBtn.addEventListener("click", clearDraft);
  checklistInputs.forEach(function (input) {
    input.addEventListener("change", updateMetricsAndCoach);
  });
  if (backBtn) backBtn.addEventListener("click", goBackToWordQuest);
  settingsBtn.addEventListener("click", cycleTheme);
  document.addEventListener("keydown", function (event) {
    if (event.key === "Escape" && showcaseOpen) closeShowcase();
  });

  applyTheme(resolveInitialTheme());
  renderOrganizerPreview();
  renderPlanItems();
  renderSprint();
  loadMarkCodes();
  renderMarkCodes();
  loadWarmupStats();
  renderWarmupArcade();
  loadPublishWall();
  renderPublishWall();
  loadStepUpMode();
  loadAudience();
  loadFramework();
  loadDraft();
  setGradeBand("35");
  setProfile("whole");
  setMode("sentence");
  loadPresetPack();
  applyWordQuestContext();
})();
