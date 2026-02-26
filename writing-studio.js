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
  var RETURN_KEY = "ws_return_to_wordquest_v1";
  var CASELOAD_KEY = "ws_caseload_v1";
  var ROI_KEY = "ws_roi_v1";
  var ENGAGE_KEY = "ws_engage_v1";
  var TOUR_KEY = "ws_tour_done_v1";
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
  var PLAYBOOKS = {
    "ms-ef": {
      gradeBand: "68",
      mode: "sentence",
      profile: "one",
      organizer: "sequence",
      cue: "EF routine: plan 3 bullets, draft 1 line, pause-check, then continue.",
      nextAction: "Use one-step chunking with timer and immediate check-in."
    },
    "ms-eal": {
      gradeBand: "68",
      mode: "sentence",
      profile: "small",
      organizer: "sequence",
      cue: "EAL routine: oral rehearsal, sentence frame, one expansion sentence.",
      nextAction: "Use oral rehearsal + frame before independent writing."
    },
    "hs-analysis": {
      gradeBand: "912",
      mode: "paragraph",
      profile: "small",
      organizer: "cer",
      cue: "HS routine: thesis line, evidence line, analysis line, then revise precision.",
      nextAction: "Draft one analytical paragraph with claim-evidence-analysis."
    }
  };
  var FISHTANK_SCOPE = {
    es: {
      label: "Elementary School",
      paths: [
        {
          id: "es-ela", label: "ES Structured Literacy Writing (SOR-Aligned)", units: [
            {
              id: "es-u1", label: "K-5 Explicit Writing Progressions", lessons: [
                { id: "es-u1-l1", label: "Lesson 1: Opinion/Information claim", mode: "paragraph", gradeBand: "35", target: "Write a focused opinion or information claim and support with one reason.", criteria: "Claim is clear, reason is relevant, connector used.", frame: "I think __ because __.", gap: "write one topic sentence and one because sentence." },
                { id: "es-u1-l2", label: "Lesson 2: Narrative detail and sequence", mode: "paragraph", gradeBand: "35", target: "Use sequence and details to build a short narrative paragraph.", criteria: "Sequence is clear, detail is specific, ending sentence closes idea.", frame: "First __. Next __. Finally __.", gap: "reorder three events, then write sequence sentences." }
              ]
            }
          ]
        },
        {
          id: "es-content", label: "ES Content-Area Writing (Science/Social Studies)", units: [
            {
              id: "es-u2", label: "Unit: Explain from Content Text", lessons: [
                { id: "es-u2-l1", label: "Lesson 1: Explain with text detail", mode: "sentence", gradeBand: "35", target: "Write sequence or explanation sentences using content vocabulary.", criteria: "At least 3 ordered steps or one clear cause/effect explanation.", frame: "First __. Next __. Then __.", gap: "reorder 3 mixed steps and rewrite with transitions." }
              ]
            }
          ]
        },
        {
          id: "es-support", label: "ES Learning Support / EAL (Tiered Support)", units: [
            {
              id: "es-u3", label: "Language and Learning Services Writing Routines", lessons: [
                { id: "es-u3-l1", label: "Lesson 1: Oral rehearsal to sentence", mode: "sentence", gradeBand: "35", target: "Rehearse orally, then write one complete sentence.", criteria: "One complete sentence with capital and period.", frame: "I can say: __. I can write: __.", gap: "say the sentence out loud 2x before writing." },
                { id: "es-u3-l2", label: "Lesson 2: Expand one sentence", mode: "sentence", gradeBand: "35", target: "Expand a base sentence with one detail phrase.", criteria: "Adds who/what/where detail without run-on.", frame: "__ happened __.", gap: "choose one detail from who/what/where and add it." }
              ]
            }
          ]
        }
      ]
    },
    ms: {
      label: "Middle School",
      paths: [
        {
          id: "ms-english", label: "MS English Language Arts 6-8", units: [
            {
              id: "ms-u1", label: "ELA 6/7 Argument and Analysis", lessons: [
                { id: "ms-u1-l1", label: "Lesson 1: Arguable claim (ELA 6/7)", mode: "paragraph", gradeBand: "68", target: "Develop an arguable claim and one supporting reason.", criteria: "Claim is debatable, reason is specific.", frame: "My claim is __ because __.", gap: "convert a fact statement into an arguable claim." },
                { id: "ms-u1-l2", label: "Lesson 2: Evidence and reasoning (ELA 6/7)", mode: "paragraph", gradeBand: "68", target: "Use evidence and explain how it proves your claim.", criteria: "Evidence cited, reasoning links evidence to claim.", frame: "For example, __. This matters because __.", gap: "complete one CER mini-frame (claim, evidence, reasoning)." }
              ]
            }
          ]
        },
        {
          id: "ms-science", label: "MS Science Writing", units: [
            {
              id: "ms-u2", label: "Unit 2: Lab Explanation", lessons: [
                { id: "ms-u2-l1", label: "Lesson 1: Explain a result", mode: "paragraph", gradeBand: "68", target: "Explain a scientific result using data language.", criteria: "Claim references result, evidence includes data point, reasoning links cause/effect.", frame: "The data show __. This suggests __ because __.", gap: "write one sentence that names result + one sentence that explains why." }
              ]
            }
          ]
        },
        {
          id: "ms-support", label: "MS Strategic Learning / Learning Support Services", units: [
            {
              id: "ms-u3", label: "Strategic Learning Writing Routines", lessons: [
                { id: "ms-u3-l1", label: "Lesson 1: Plan in 3 bullets", mode: "sentence", gradeBand: "68", target: "Generate a 3-point plan before drafting.", criteria: "Plan includes claim/topic + two support points.", frame: "Point 1 __ / Point 2 __ / Point 3 __", gap: "fill the 3 bullets before any draft sentence." },
                { id: "ms-u3-l2", label: "Lesson 2: Draft in chunks", mode: "paragraph", gradeBand: "68", target: "Draft one chunk at a time with check-ins.", criteria: "Completes claim chunk, evidence chunk, reasoning chunk.", frame: "Chunk 1: __. Chunk 2: __. Chunk 3: __.", gap: "write only chunk 1, pause, then continue." }
              ]
            }
          ]
        }
      ]
    },
    hs: {
      label: "High School",
      paths: [
        {
          id: "hs-english", label: "HS Humanities 9 / American Studies / ELA Electives", units: [
            {
              id: "hs-u1", label: "Humanities 9 and American Studies Analytical Writing", lessons: [
                { id: "hs-u1-l1", label: "Lesson 1: Thesis move (Humanities 9/AS)", mode: "paragraph", gradeBand: "912", target: "Write a nuanced thesis with one qualification.", criteria: "Thesis is precise and acknowledges complexity.", frame: "Although __, __ because __.", gap: "revise an overgeneralized claim into a nuanced thesis." },
                { id: "hs-u1-l2", label: "Lesson 2: Counterclaim and rebuttal", mode: "paragraph", gradeBand: "912", target: "Integrate a counterclaim and rebuttal move.", criteria: "Counterpoint is fair, rebuttal is evidence-based.", frame: "Some argue __; however, __.", gap: "add one counterclaim sentence and one rebuttal sentence." }
              ]
            }
          ]
        },
        {
          id: "hs-science", label: "HS Science and Technical Writing (Lab/Research)", units: [
            {
              id: "hs-u2", label: "Unit 2: Scientific Argument", lessons: [
                { id: "hs-u2-l1", label: "Lesson 1: Claim with evidence set", mode: "paragraph", gradeBand: "912", target: "Develop a scientific claim using two evidence points.", criteria: "Claim is testable, evidence is specific, reasoning addresses validity.", frame: "Based on __ and __, the claim is __ because __.", gap: "choose the strongest evidence pair and explain why it supports the claim." }
              ]
            }
          ]
        },
        {
          id: "hs-support", label: "HS Learning Lab I / Learning Support II / EAL", units: [
            {
              id: "hs-u3", label: "High School Support-Service Writing Routines", lessons: [
                { id: "hs-u3-l1", label: "Lesson 1: Thesis to paragraph bridge", mode: "paragraph", gradeBand: "912", target: "Bridge from thesis statement to a full analytical paragraph.", criteria: "Thesis aligns with paragraph claim and evidence.", frame: "Thesis: __. Paragraph claim: __. Evidence: __. Analysis: __.", gap: "write thesis + one claim sentence only, then expand." },
                { id: "hs-u3-l2", label: "Lesson 2: Assignment unpack protocol", mode: "sentence", gradeBand: "912", target: "Unpack prompt demands before drafting.", criteria: "Identifies task verbs, evidence expectations, and output structure.", frame: "Task verb: __. Evidence needed: __. Structure: __.", gap: "fill prompt-unpack template before writing response." }
              ]
            }
          ]
        }
      ]
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
  var launchContextEl = document.getElementById("ws-launch-context");
  var editor = document.getElementById("ws-editor");
  var metrics = document.getElementById("ws-metrics");
  var liveHintEl = document.getElementById("ws-live-hint");
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
  var impactToggleBtn = document.getElementById("ws-impact-toggle");
  var impactOverlayEl = document.getElementById("ws-impact");
  var impactCloseBtn = document.getElementById("ws-impact-close");
  var impactLineEl = document.getElementById("ws-impact-line");
  var impactSubEl = document.getElementById("ws-impact-sub");
  var impactTrendEl = document.getElementById("ws-impact-trend");
  var mtssReviewEl = document.getElementById("ws-mtss-review");
  var mtssCopyBtn = document.getElementById("ws-mtss-copy");
  var tourEl = document.getElementById("ws-tour");
  var tourCloseBtn = document.getElementById("ws-tour-close");
  var tourPrevBtn = document.getElementById("ws-tour-prev");
  var tourNextBtn = document.getElementById("ws-tour-next");
  var tourStartBtn = document.getElementById("ws-tour-start");
  var tourStepEl = document.getElementById("ws-tour-step");
  var tourTextEl = document.getElementById("ws-tour-text");
  var flowButtons = Array.prototype.slice.call(document.querySelectorAll(".ws-step[data-step]"));
  var goalEl = document.getElementById("ws-goal");
  var nextStepBtn = document.getElementById("ws-next-step");
  var missionWarmupBtn = document.getElementById("ws-mission-warmup");
  var missionPlanBtn = document.getElementById("ws-mission-plan");
  var missionPowerBtn = document.getElementById("ws-mission-power");
  var launchpadCopyEl = document.getElementById("ws-launchpad-copy");
  var fishTankGradeSelect = document.getElementById("ws-ft-division");
  var fishTankPathSelect = document.getElementById("ws-ft-path");
  var fishTankUnitSelect = document.getElementById("ws-ft-unit");
  var fishTankLessonSelect = document.getElementById("ws-ft-lesson");
  var fishTankLoadBtn = document.getElementById("ws-ft-load");
  var fishTankGapBtn = document.getElementById("ws-ft-gap");
  var fishTankNoteBtn = document.getElementById("ws-ft-note");
  var fishTankEvidenceBtn = document.getElementById("ws-ft-evidence");
  var fishTankParentBtn = document.getElementById("ws-ft-parent");
  var fishTankHandoffBtn = document.getElementById("ws-ft-handoff");
  var fishTankSsmBtn = document.getElementById("ws-ft-ssm");
  var fishTankIespBtn = document.getElementById("ws-ft-iesp");
  var fishTankPacketBtn = document.getElementById("ws-ft-packet");
  var fishTankTargetEl = document.getElementById("ws-ft-target");
  var caseNameInput = document.getElementById("ws-case-name");
  var caseGoalInput = document.getElementById("ws-case-goal");
  var caseNextInput = document.getElementById("ws-case-next");
  var playbookSelect = document.getElementById("ws-playbook");
  var playbookApplyBtn = document.getElementById("ws-playbook-apply");
  var caseAddBtn = document.getElementById("ws-case-add");
  var caseCopyBtn = document.getElementById("ws-case-copy");
  var caseListEl = document.getElementById("ws-case-list");
  var weekPlanBuildBtn = document.getElementById("ws-week-plan-build");
  var weekPlanCopyBtn = document.getElementById("ws-week-plan-copy");
  var weekPlanTextEl = document.getElementById("ws-week-plan-text");
  var roiMinutesEl = document.getElementById("ws-roi-minutes");
  var roiArtifactsEl = document.getElementById("ws-roi-artifacts");
  var roiTopEl = document.getElementById("ws-roi-top");
  var qualityStreakEl = document.getElementById("ws-quality-streak");
  var quickWholeBtn = document.getElementById("ws-quick-whole");
  var quickSmallBtn = document.getElementById("ws-quick-small");
  var quickOneBtn = document.getElementById("ws-quick-one");
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
  var setupToggleBtn = document.getElementById("ws-setup-toggle");
  var controlsPanelEl = document.getElementById("ws-controls-panel");
  var railEl = document.getElementById("ws-rail");
  var railPrevBtn = document.getElementById("ws-rail-prev");
  var railNextBtn = document.getElementById("ws-rail-next");
  var railToggleBtn = document.getElementById("ws-rail-toggle");
  var railTitleEl = document.getElementById("ws-rail-title");
  var advancedCanvasEl = document.getElementById("ws-advanced-canvas");
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
  var caseloadItems = [];
  var wordQuestContext = null;
  var SpeechRecognitionCtor = window.SpeechRecognition || window.webkitSpeechRecognition || null;
  var recognition = null;
  var isDictating = false;
  var imagePromptLabel = "";
  var currentFishTankLesson = null;
  var railBlocks = [];
  var railIndex = 0;
  var railShowAll = false;
  var roiState = { totalMinutes: 0, artifacts: 0, counts: {} };
  var qualityStreak = 0;
  var bestQualityStreak = 0;
  var impactOpen = false;
  var tourOpen = false;
  var tourIndex = 0;

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

  function renderLiveHint(words, sentenceCount) {
    if (!liveHintEl) return;
    if (words === 0) {
      liveHintEl.textContent = "Ready to start.";
      return;
    }
    if (currentStep === "plan") {
      liveHintEl.textContent = "Nice planning energy.";
      return;
    }
    if (currentStep === "draft") {
      liveHintEl.textContent = sentenceCount >= 3 ? "Strong drafting flow." : "Build one more sentence.";
      return;
    }
    if (currentStep === "revise") {
      liveHintEl.textContent = "Revision in progress.";
      return;
    }
    liveHintEl.textContent = "Polish and publish.";
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

  function getFishTankBand() {
    if (currentGradeBand === "68") return "ms";
    if (currentGradeBand === "912") return "hs";
    return "es";
  }

  function getSelectedFishTankPath() {
    var division = String(fishTankGradeSelect && fishTankGradeSelect.value || getFishTankBand());
    var pathId = String(fishTankPathSelect && fishTankPathSelect.value || "");
    var paths = (FISHTANK_SCOPE[division] && FISHTANK_SCOPE[division].paths) || [];
    return paths.find(function (p) { return p.id === pathId; }) || paths[0] || null;
  }

  function getSelectedFishTankDivisionLabel() {
    var division = String(fishTankGradeSelect && fishTankGradeSelect.value || getFishTankBand());
    return (FISHTANK_SCOPE[division] && FISHTANK_SCOPE[division].label) || "School";
  }

  function getSelectedFishTankUnit() {
    var path = getSelectedFishTankPath();
    if (!path) return null;
    var unitId = String(fishTankUnitSelect && fishTankUnitSelect.value || "");
    return path.units.find(function (u) { return u.id === unitId; }) || path.units[0] || null;
  }

  function getSelectedFishTankLesson() {
    var unit = getSelectedFishTankUnit();
    if (!unit) return null;
    var lessonId = String(fishTankLessonSelect && fishTankLessonSelect.value || "");
    return unit.lessons.find(function (l) { return l.id === lessonId; }) || unit.lessons[0] || null;
  }

  function renderFishTankLessons() {
    if (!fishTankLessonSelect) return;
    var unit = getSelectedFishTankUnit();
    fishTankLessonSelect.innerHTML = "";
    if (!unit || !Array.isArray(unit.lessons)) return;
    unit.lessons.forEach(function (lesson) {
      var option = document.createElement("option");
      option.value = lesson.id;
      option.textContent = lesson.label;
      fishTankLessonSelect.appendChild(option);
    });
  }

  function renderFishTankPaths() {
    if (!fishTankPathSelect || !fishTankGradeSelect) return;
    var division = String(fishTankGradeSelect.value || getFishTankBand());
    var paths = (FISHTANK_SCOPE[division] && FISHTANK_SCOPE[division].paths) || [];
    fishTankPathSelect.innerHTML = "";
    paths.forEach(function (path) {
      var option = document.createElement("option");
      option.value = path.id;
      option.textContent = path.label;
      fishTankPathSelect.appendChild(option);
    });
  }

  function renderFishTankUnits() {
    if (!fishTankUnitSelect) return;
    var path = getSelectedFishTankPath();
    var units = (path && path.units) || [];
    fishTankUnitSelect.innerHTML = "";
    units.forEach(function (unit) {
      var option = document.createElement("option");
      option.value = unit.id;
      option.textContent = unit.label;
      fishTankUnitSelect.appendChild(option);
    });
    renderFishTankLessons();
  }

  function renderFishTankTarget(lesson) {
    if (!fishTankTargetEl) return;
    if (!lesson) {
      fishTankTargetEl.textContent = "Select a lesson to load writing targets.";
      return;
    }
    var path = getSelectedFishTankPath();
    var prefix = path ? path.label + ": " : "";
    fishTankTargetEl.textContent = prefix + lesson.target + " Success: " + lesson.criteria;
  }

  function applyFishTankLesson() {
    var lesson = getSelectedFishTankLesson();
    if (!lesson) return;
    currentFishTankLesson = lesson;
    withMutedToasts(function () {
      setAudience("teacher", { silent: true });
      setMode(lesson.mode === "sentence" ? "sentence" : "paragraph");
      if (lesson.gradeBand) setGradeBand(lesson.gradeBand);
      setStep("plan");
    });
    if (planTopicInput) planTopicInput.value = lesson.label;
    if (planDetailInput) planDetailInput.value = lesson.target;
    setScaffoldCue(lesson.frame);
    renderFishTankTarget(lesson);
    updateMetricsAndCoach();
    showToast("Curriculum lesson loaded");
  }

  function runFishTankGapRescue() {
    var lesson = getSelectedFishTankLesson();
    if (!lesson) return;
    currentFishTankLesson = lesson;
    var rescue = "Gap Rescue Mission (5-8 min)\n1) " + lesson.gap + "\n2) Use this frame: " + lesson.frame + "\n3) Write one line only, then continue today’s lesson.";
    editor.value = rescue + "\n\n" + (editor.value || "");
    setStep("plan");
    setScaffoldCue("Complete the rescue mission first, then press Do This Next.");
    renderFishTankTarget(lesson);
    updateMetricsAndCoach();
    showToast("Gap rescue loaded");
  }

  function copyTextPayload(payload, successMessage) {
    var text = String(payload || "").trim();
    if (!text) {
      showToast("Nothing to copy");
      return;
    }
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(function () {
        trackArtifactCopy(successMessage || "Copied");
        showToast(successMessage || "Copied");
      }).catch(function () {
        showToast("Copy blocked by browser");
      });
      return;
    }
    showToast("Clipboard not available");
  }

  function getArtifactMinutes(label) {
    var text = String(label || "").toLowerCase();
    if (text.indexOf("ls team packet") >= 0) return 8;
    if (text.indexOf("iesp") >= 0) return 6;
    if (text.indexOf("ssm") >= 0) return 5;
    if (text.indexOf("teacher handoff") >= 0) return 4;
    if (text.indexOf("parent") >= 0) return 3;
    if (text.indexOf("evidence") >= 0) return 3;
    if (text.indexOf("plc") >= 0) return 4;
    return 2;
  }

  function loadROIState() {
    try {
      var parsed = JSON.parse(localStorage.getItem(ROI_KEY) || "{}");
      roiState.totalMinutes = Number(parsed.totalMinutes) > 0 ? Number(parsed.totalMinutes) : 0;
      roiState.artifacts = Number(parsed.artifacts) > 0 ? Number(parsed.artifacts) : 0;
      roiState.counts = parsed && typeof parsed.counts === "object" && parsed.counts ? parsed.counts : {};
    } catch (_error) {
      roiState = { totalMinutes: 0, artifacts: 0, counts: {} };
    }
  }

  function saveROIState() {
    try {
      localStorage.setItem(ROI_KEY, JSON.stringify(roiState));
    } catch (_error) {
      // Ignore storage write errors.
    }
  }

  function getTopArtifactLabel() {
    var counts = roiState.counts || {};
    var best = "No exports yet";
    var bestValue = 0;
    Object.keys(counts).forEach(function (key) {
      if (counts[key] > bestValue) {
        bestValue = counts[key];
        best = key;
      }
    });
    return best;
  }

  function renderROIDashboard() {
    if (roiMinutesEl) roiMinutesEl.textContent = String(Math.round(roiState.totalMinutes));
    if (roiArtifactsEl) roiArtifactsEl.textContent = String(Math.round(roiState.artifacts));
    if (roiTopEl) roiTopEl.textContent = getTopArtifactLabel();
    if (qualityStreakEl) qualityStreakEl.textContent = String(qualityStreak);
  }

  function trackArtifactCopy(label) {
    var clean = String(label || "Artifact");
    roiState.totalMinutes += getArtifactMinutes(clean);
    roiState.artifacts += 1;
    roiState.counts[clean] = (roiState.counts[clean] || 0) + 1;
    saveROIState();
    renderROIDashboard();
    renderImpactSnapshot();
  }

  function loadEngagementState() {
    try {
      var parsed = JSON.parse(localStorage.getItem(ENGAGE_KEY) || "{}");
      qualityStreak = Number(parsed.qualityStreak) > 0 ? Number(parsed.qualityStreak) : 0;
      bestQualityStreak = Number(parsed.bestQualityStreak) > 0 ? Number(parsed.bestQualityStreak) : 0;
    } catch (_error) {
      qualityStreak = 0;
      bestQualityStreak = 0;
    }
  }

  function saveEngagementState() {
    try {
      localStorage.setItem(ENGAGE_KEY, JSON.stringify({
        qualityStreak: qualityStreak,
        bestQualityStreak: bestQualityStreak
      }));
    } catch (_error) {
      // Ignore storage write errors.
    }
  }

  function updateQualityStreak(text, words, sentenceCount) {
    var scores = getDomainScores(text, words, sentenceCount);
    var qualityHit = scores.total >= 6 || (scores.structure >= 2 && scores.detail >= 2);
    if (qualityHit) {
      qualityStreak += 1;
      bestQualityStreak = Math.max(bestQualityStreak, qualityStreak);
    } else {
      qualityStreak = 0;
    }
    saveEngagementState();
    renderROIDashboard();
    renderImpactSnapshot();
  }

  function getCaseloadTrendSummary() {
    if (!caseloadItems.length) return "No student trend data yet.";
    var withHistory = caseloadItems.filter(function (item) {
      return Array.isArray(item.history) && item.history.length >= 2;
    });
    if (!withHistory.length) return "Collect at least two samples per student for trend lines.";
    var improved = 0;
    withHistory.forEach(function (item) {
      var first = item.history[0];
      var last = item.history[item.history.length - 1];
      if ((last.score || 0) > (first.score || 0) || (last.words || 0) > (first.words || 0)) improved += 1;
    });
    return improved + " of " + withHistory.length + " students show positive trend.";
  }

  function getCaseTrendWindow(item) {
    var history = Array.isArray(item && item.history) ? item.history : [];
    var latest = history.length ? history[history.length - 1] : null;
    var previous = history.length > 1 ? history[history.length - 2] : null;
    return { latest: latest, previous: previous, count: history.length };
  }

  function getCaseWeeklyStatus(item) {
    var windowData = getCaseTrendWindow(item);
    if (windowData.count < 2 || !windowData.latest || !windowData.previous) {
      return {
        level: "Monitor",
        reason: "Need at least two samples for reliable trend.",
        action: "Collect two writing samples this week and review again."
      };
    }
    var latest = windowData.latest;
    var prev = windowData.previous;
    var scoreDelta = Number(latest.score || 0) - Number(prev.score || 0);
    var wordDelta = Number(latest.words || 0) - Number(prev.words || 0);
    var planningDelta = Number(latest.planning || 0) - Number(prev.planning || 0);

    if (Number(latest.score || 0) <= 3 || Number(latest.planning || 0) < 50 || (scoreDelta < 0 && wordDelta <= 0)) {
      return {
        level: "Intensify",
        reason: "Low/declining output (" + scoreDelta + " score, " + wordDelta + " words).",
        action: "Increase support frequency, shrink chunk size, and add co-teacher check-in."
      };
    }
    if (scoreDelta > 0 || wordDelta >= 8 || planningDelta >= 15 || (Number(latest.score || 0) >= 6 && Number(latest.planning || 0) >= 75)) {
      return {
        level: "Improving",
        reason: "Upward trend (" + (scoreDelta >= 0 ? "+" : "") + scoreDelta + " score, " + (wordDelta >= 0 ? "+" : "") + wordDelta + " words).",
        action: "Maintain support and fade one scaffold while transferring to core task."
      };
    }
    return {
      level: "Monitor",
      reason: "Performance is stable without clear growth.",
      action: "Keep current scaffold and add one explicit mid-week check."
    };
  }

  function buildMTSSWeeklyReview() {
    if (!caseloadItems.length) {
      return [
        "MTSS Weekly Progress Review",
        "Date: " + new Date().toLocaleDateString(),
        "No caseload students added yet."
      ].join("\n");
    }
    var buckets = { Improving: 0, Monitor: 0, Intensify: 0 };
    var lines = caseloadItems.map(function (item) {
      var status = getCaseWeeklyStatus(item);
      buckets[status.level] += 1;
      return "- " + item.name + ": " + status.level + " | " + status.reason + " Next: " + status.action;
    });
    return [
      "MTSS Weekly Progress Review (Writing)",
      "Date: " + new Date().toLocaleDateString(),
      getLessonSummaryLine(),
      "Caseload: " + caseloadItems.length + " | Improving: " + buckets.Improving + " | Monitor: " + buckets.Monitor + " | Intensify: " + buckets.Intensify,
      "",
      "Student Decisions",
      lines.join("\n"),
      "",
      "Next Week Team Priorities",
      "1) Intensify group: increase intervention dosage and shorten task chunks.",
      "2) Monitor group: keep scaffold and run one mid-week progress check.",
      "3) Improving group: fade one support and increase transfer to grade-level tasks."
    ].join("\n");
  }

  function buildImpactTrendChart() {
    var series = [];
    caseloadItems.forEach(function (item) {
      var history = Array.isArray(item.history) ? item.history : [];
      if (!history.length) return;
      series.push(history.slice(-8).map(function (h) { return Number(h.score || 0); }));
    });
    if (!series.length) return "Trend chart will appear as student history grows.";
    var maxLen = series.reduce(function (m, arr) { return Math.max(m, arr.length); }, 0);
    var avg = [];
    for (var i = 0; i < maxLen; i += 1) {
      var sum = 0;
      var c = 0;
      series.forEach(function (arr) {
        if (arr[i] != null) {
          sum += arr[i];
          c += 1;
        }
      });
      avg.push(c ? (sum / c) : 0);
    }
    var width = 260;
    var height = 42;
    var pad = 4;
    var den = Math.max(1, avg.length - 1);
    var pts = avg.map(function (value, idx) {
      var x = Math.round((idx / den) * (width - pad * 2) + pad);
      var y = Math.round((1 - Math.min(9, value) / 9) * (height - pad * 2) + pad);
      return x + "," + y;
    }).join(" ");
    return "Average score trend (last samples)\n" +
      "<svg viewBox='0 0 " + width + " " + height + "' width='" + width + "' height='" + height + "' aria-hidden='true'>" +
      "<polyline fill='none' stroke='#5ec8ff' stroke-width='3' points='" + pts + "' /></svg>";
  }

  function renderImpactSnapshot() {
    if (!impactLineEl || !impactSubEl) return;
    var totalStudents = caseloadItems.length;
    var active = caseloadItems.filter(function (item) { return item.status === "active"; }).length;
    var trend = getCaseloadTrendSummary();
    impactSubEl.textContent = "Artifacts: " + roiState.artifacts + " | Est. minutes saved: " + Math.round(roiState.totalMinutes) + " | Quality streak: " + qualityStreak;
    impactLineEl.textContent = "Caseload " + totalStudents + " (" + active + " active). " + trend + " Top artifact: " + getTopArtifactLabel() + ".";
    if (mtssReviewEl) {
      var review = buildMTSSWeeklyReview();
      mtssReviewEl.textContent = review;
    }
    if (impactTrendEl) {
      impactTrendEl.innerHTML = buildImpactTrendChart();
    }
  }

  function setImpactOpen(open) {
    if (!impactOverlayEl || !impactToggleBtn) return;
    impactOpen = !!open;
    if (impactOpen) closeShowcase();
    if (impactOpen) setTourOpen(false, { silent: true });
    impactOverlayEl.classList.toggle("is-open", impactOpen);
    impactOverlayEl.setAttribute("aria-hidden", impactOpen ? "false" : "true");
    impactToggleBtn.classList.toggle("is-active", impactOpen);
    impactToggleBtn.setAttribute("aria-pressed", impactOpen ? "true" : "false");
    impactToggleBtn.textContent = impactOpen ? "Impact: On" : "Impact Mode";
  }

  function toggleImpact() {
    setImpactOpen(!impactOpen);
  }

  function getTourSteps() {
    return [
      "Step 1: Pick a Mission. Finish one small task first.",
      "Step 2: Use Do This Next and complete Plan -> Draft -> Revise.",
      "Step 3: Save draft, update caseload from draft, then copy MTSS review."
    ];
  }

  function renderTour() {
    if (!tourStepEl || !tourTextEl) return;
    var steps = getTourSteps();
    var idx = Math.max(0, Math.min(steps.length - 1, tourIndex));
    tourStepEl.textContent = "Step " + (idx + 1) + " of " + steps.length;
    tourTextEl.textContent = steps[idx];
    if (tourPrevBtn) tourPrevBtn.disabled = idx === 0;
    if (tourNextBtn) tourNextBtn.disabled = idx >= steps.length - 1;
  }

  function setTourOpen(open, options) {
    if (!tourEl) return;
    tourOpen = !!open;
    if (tourOpen) {
      setImpactOpen(false);
      closeShowcase();
    }
    tourEl.classList.toggle("is-open", tourOpen);
    tourEl.setAttribute("aria-hidden", tourOpen ? "false" : "true");
    if (tourOpen) renderTour();
    if (!(options && options.silent) && !tourOpen) showToast("Tour closed");
  }

  function nextTourStep() {
    tourIndex = Math.min(getTourSteps().length - 1, tourIndex + 1);
    renderTour();
  }

  function prevTourStep() {
    tourIndex = Math.max(0, tourIndex - 1);
    renderTour();
  }

  function maybeStartTour() {
    var seen = "1";
    try {
      seen = localStorage.getItem(TOUR_KEY) || "0";
    } catch (_error) {
      seen = "0";
    }
    if (seen === "1") return;
    tourIndex = 0;
    setTourOpen(true, { silent: true });
  }

  function finishTour() {
    try {
      localStorage.setItem(TOUR_KEY, "1");
    } catch (_error) {
      // Ignore storage write errors.
    }
    setTourOpen(false, { silent: true });
    showToast("You are ready");
  }

  function applyTaskHandoffFromHash() {
    var hash = String(window.location.hash || "");
    if (hash.indexOf("#task-") !== 0) return;
    var payload = hash.slice(6);
    var decoded = "";
    try {
      decoded = decodeURIComponent(payload);
    } catch (_error) {
      return;
    }
    var params = new URLSearchParams(decoded);
    var student = String(params.get("student") || "").trim();
    var goal = String(params.get("goal") || "").trim();
    var task = String(params.get("task") || "").trim();
    var mode = String(params.get("mode") || "").trim();
    var grade = String(params.get("grade") || "").trim();
    withMutedToasts(function () {
      setAudience("student", { silent: true });
      if (mode) setMode(mode);
      if (grade) setGradeBand(grade);
    });
    if (planTopicInput && goal) planTopicInput.value = goal;
    if (planDetailInput && task) planDetailInput.value = task;
    if (student && launchContextEl) {
      launchContextEl.textContent = "Task handoff for " + student;
      launchContextEl.hidden = false;
    }
    setScaffoldCue("Handoff task loaded: complete this step first.");
    if (task) {
      editor.value = "Task: " + task + "\n\n" + (editor.value || "");
    }
    showToast("Student task loaded");
  }

  function getLessonSummaryLine() {
    var lesson = currentFishTankLesson || getSelectedFishTankLesson();
    var path = getSelectedFishTankPath();
    var divisionLabel = getSelectedFishTankDivisionLabel();
    if (!lesson) return "Curriculum lesson: not selected";
    return "Curriculum lesson: " + divisionLabel + " / " + (path ? path.label + " - " : "") + lesson.label;
  }

  function getWritingSnapshot() {
    var text = String(editor.value || "");
    var words = getWordCount(text);
    var sentences = splitSentences(text).length;
    var scores = getDomainScores(text, words, sentences);
    return {
      text: text,
      words: words,
      sentences: sentences,
      scores: scores,
      evidence: pickEvidenceSpan(text) || "No clear evidence span yet."
    };
  }

  function buildSessionNote() {
    var snap = getWritingSnapshot();
    var nextMove = getMiniLessonRecommendation(snap.scores);
    return [
      "Session Note",
      new Date().toLocaleString(),
      getLessonSummaryLine(),
      "Mode/Profile: " + currentMode + " / " + currentProfile,
      "Output: " + snap.sentences + " sentences, " + snap.words + " words",
      "Rubric: S " + snap.scores.structure + "/3, D " + snap.scores.detail + "/3, L " + snap.scores.language + "/3 (Total " + snap.scores.total + "/9)",
      "Strength observed: " + (glowEl ? glowEl.textContent : "Student started writing."),
      "Targeted next move: " + nextMove
    ].join("\n");
  }

  function buildEvidenceLog() {
    var snap = getWritingSnapshot();
    var benchmark = benchmarkLevelEl ? benchmarkLevelEl.textContent : "Local estimate pending";
    return [
      "Goal Evidence Log",
      getLessonSummaryLine(),
      "Date: " + new Date().toLocaleDateString(),
      "Student writing sample metrics: " + snap.sentences + " sentences, " + snap.words + " words",
      "Rubric trend point: " + snap.scores.total + "/9 (" + benchmark + ")",
      "Evidence span: " + snap.evidence,
      "Checkpoint goal: " + (goalEl ? goalEl.textContent : "Build one clear idea."),
      "Next intervention move: " + getMiniLessonRecommendation(snap.scores)
    ].join("\n");
  }

  function inferBarrierCategory() {
    var text = String(growEl && growEl.textContent || "").toLowerCase();
    if (text.indexOf("claim") >= 0 || text.indexOf("topic") >= 0 || text.indexOf("start") >= 0) return "initiation";
    if (text.indexOf("detail") >= 0 || text.indexOf("evidence") >= 0 || text.indexOf("why") >= 0) return "elaboration";
    if (text.indexOf("word") >= 0 || text.indexOf("language") >= 0 || text.indexOf("precision") >= 0) return "language";
    return "organization";
  }

  function getHomePlanByBarrier(barrier) {
    var frame = currentFishTankLesson ? currentFishTankLesson.frame : "I think __ because __.";
    if (barrier === "initiation") {
      return {
        prompt: "Have your child say one sentence first, then write it with frame \"" + frame + "\".",
        routine: "1 minute oral rehearsal, 2 minutes writing one line, 2 minutes read aloud + praise."
      };
    }
    if (barrier === "elaboration") {
      return {
        prompt: "Ask: What detail proves your point? Then add one sentence starting with 'For example...'.",
        routine: "Read one line, add one detail sentence, explain why it matters."
      };
    }
    if (barrier === "language") {
      return {
        prompt: "Replace one simple word with a stronger word from the vocab list.",
        routine: "Circle one vague word, swap it, reread the sentence."
      };
    }
    return {
      prompt: "Use three mini-steps: claim/topic, support detail, closing line.",
      routine: "Plan 3 bullets, write 3 lines, then quick read aloud."
    };
  }

  function buildParentUpdate() {
    var snap = getWritingSnapshot();
    var barrier = inferBarrierCategory();
    var homePlan = getHomePlanByBarrier(barrier);
    return [
      "Family Update",
      "Today we worked on: " + (currentFishTankLesson ? currentFishTankLesson.target : "clear writing structure"),
      "Your child produced " + snap.sentences + " sentence(s) and " + snap.words + " word(s).",
      "One strength: " + (glowEl ? glowEl.textContent : "They began the task independently."),
      "One next step: " + (growEl ? growEl.textContent : "Add one more detail sentence."),
      "At home prompt: " + homePlan.prompt,
      "5-minute routine: " + homePlan.routine
    ].join("\n");
  }

  function buildTeacherHandoff() {
    var snap = getWritingSnapshot();
    return [
      "Teacher Handoff",
      getLessonSummaryLine(),
      "Current support profile: " + (currentProfile === "whole" ? "Whole class" : currentProfile === "small" ? "Small group" : "1:1 intensive"),
      "Observed barrier: " + (growEl ? growEl.textContent : "Needs support with writing initiation."),
      "Successful scaffold: " + (scaffoldCueEl ? scaffoldCueEl.textContent : "Sentence frame and one-step prompt."),
      "Data snapshot: " + snap.scores.total + "/9 rubric, " + snap.sentences + " sentences, " + snap.words + " words",
      "Requested classroom carryover: give 2-minute pre-write with frame \"" + (currentFishTankLesson ? currentFishTankLesson.frame : "I think __ because __.") + "\" before independent draft."
    ].join("\n");
  }

  function buildSSMAgenda() {
    var snap = getWritingSnapshot();
    var profileLabel = currentProfile === "whole" ? "Whole class" : currentProfile === "small" ? "Small group" : "1:1 intensive";
    var benchmark = benchmarkLevelEl ? benchmarkLevelEl.textContent : "Local estimate pending";
    var barrier = growEl ? growEl.textContent : "Writing initiation and planning";
    var scaffold = scaffoldCueEl ? scaffoldCueEl.textContent : "Sentence frame + chunked prompt";
    return [
      "Student Support Meeting Agenda (Writing)",
      "Date: " + new Date().toLocaleDateString(),
      getLessonSummaryLine(),
      "",
      "1) Current Baseline",
      "- Writing output: " + snap.sentences + " sentence(s), " + snap.words + " word(s)",
      "- Rubric snapshot: " + snap.scores.total + "/9 (" + benchmark + ")",
      "- Support setting used: " + profileLabel,
      "",
      "2) Barrier Summary",
      "- Primary barrier: " + barrier,
      "- Evidence span: " + snap.evidence,
      "",
      "3) Effective Supports",
      "- Scaffold that worked: " + scaffold,
      "- Prompt frame: " + (currentFishTankLesson ? currentFishTankLesson.frame : "I think __ because __."),
      "",
      "4) 3-4 Week Target",
      "- Increase to " + Math.max(3, snap.sentences + 1) + " sentence(s) with clear claim/topic + support",
      "- Raise rubric from " + snap.scores.total + "/9 to " + Math.min(9, snap.scores.total + 2) + "/9",
      "",
      "5) Team Actions",
      "- Classroom teacher: 2-minute pre-write + frame before independent writing.",
      "- LS/EAL support: run one gap-rescue cycle per week and track output.",
      "- Family: 5-minute read-aloud + add one sentence routine."
    ].join("\n");
  }

  function buildIESPGoalDraft() {
    var snap = getWritingSnapshot();
    var startSentences = Math.max(1, snap.sentences);
    var targetSentences = Math.max(3, startSentences + 2);
    var startScore = snap.scores.total;
    var targetScore = Math.min(9, startScore + 2);
    var frame = currentFishTankLesson ? currentFishTankLesson.frame : "I think __ because __.";
    return [
      "IESP/IP Writing Goal Draft",
      "Date: " + new Date().toLocaleDateString(),
      getLessonSummaryLine(),
      "",
      "Present Level Snapshot",
      "- Current baseline: " + startSentences + " sentence(s), " + snap.words + " word(s), rubric " + startScore + "/9",
      "- Primary need: planning + elaboration with consistent structure.",
      "",
      "Annual/Term Goal (Draft)",
      "- Given a planning scaffold and sentence frame, student will produce a structured paragraph with at least " + targetSentences + " sentences and rubric score of " + targetScore + "/9 or higher in 3 of 4 collected samples.",
      "",
      "Short-Term Objectives",
      "1) Planning: complete organizer with at least 3 idea bullets before drafting.",
      "2) Drafting: write claim/topic sentence + at least 2 support sentences.",
      "3) Revising: add one connector and one precise vocabulary upgrade.",
      "",
      "Accommodations/Supports",
      "- Chunked writing timer (2-3 minute bursts), explicit model, immediate feedback, oral rehearsal.",
      "- Frame for transfer: \"" + frame + "\"",
      "",
      "Progress Monitoring",
      "- Frequency: weekly quick-write sample.",
      "- Data points: sentence count, word count, rubric /9, checklist completion.",
      "- Review cycle: every 4 weeks at team check-in."
    ].join("\n");
  }

  function buildLSTeamPacket() {
    var snap = getWritingSnapshot();
    var benchmark = benchmarkLevelEl ? benchmarkLevelEl.textContent : "Local estimate pending";
    var planning = getPlanningStatus(snap.text, snap.words, snap.sentences);
    var profileLabel = currentProfile === "whole" ? "Whole class" : currentProfile === "small" ? "Small group" : "1:1 intensive";
    var barrier = growEl ? growEl.textContent : "Writing initiation and planning";
    var scaffold = scaffoldCueEl ? scaffoldCueEl.textContent : "Sentence frame + chunked prompt";
    var frame = currentFishTankLesson ? currentFishTankLesson.frame : "I think __ because __.";
    var startSentences = Math.max(1, snap.sentences);
    var targetSentences = Math.max(3, startSentences + 2);
    var startScore = snap.scores.total;
    var targetScore = Math.min(9, startScore + 2);
    return [
      "LS Team Packet (Writing Support)",
      "Date: " + new Date().toLocaleDateString(),
      getLessonSummaryLine(),
      "",
      "A) Diagnostic Snapshot",
      "- Baseline output: " + snap.sentences + " sentence(s), " + snap.words + " word(s)",
      "- Rubric baseline: " + startScore + "/9 (" + benchmark + ")",
      "- Planning readiness: " + planning.percent + "%",
      "- Barrier signal: " + barrier,
      "- Evidence span: " + snap.evidence,
      "",
      "B) SMART Goal Draft",
      "- In 8-10 instructional weeks, student will produce a structured paragraph with at least " + targetSentences + " sentences and score " + targetScore + "/9 or higher on the writing snapshot rubric in 3 of 4 samples, with planned scaffold fade.",
      "",
      "C) 4-Week Intervention Cycle",
      "1) Week 1: diagnostic quick-write + organizer coaching + one modeled paragraph chunk.",
      "2) Week 2: claim/topic + evidence chunk with immediate feedback and revision patch.",
      "3) Week 3: reasoning/elaboration chunk + transition upgrade + timed warm-up transfer.",
      "4) Week 4: independent attempt with reduced prompts and conference check.",
      "",
      "D) Progress Monitoring Plan",
      "- Frequency: weekly (1 sample/week).",
      "- Measures: sentence count, word count, rubric /9, planning readiness %, checklist completion.",
      "- PLC review: every 2 weeks; adjust scaffold intensity by profile (" + profileLabel + ").",
      "",
      "E) Co-Teaching / Inclusion Moves",
      "- Before class: 2-minute pre-write with frame \"" + frame + "\".",
      "- During class: chunk directions into plan -> draft -> revise checkpoints.",
      "- After class: copy teacher handoff and target one carryover move in core class.",
      "",
      "F) Accommodation Plan Draft",
      "- Chunked task timing (2-5 minute bursts) with visible step tracker.",
      "- Oral rehearsal before writing, sentence stems, and reduced writing load for first attempt.",
      "- Preferential check-ins at start and midpoint of task.",
      "- Alternative response option during fatigue: dictate first draft, then edit one chunk.",
      "",
      "G) Family Communication (5-minute routine)",
      "- Read one line aloud, name one strength, add one sentence with frame \"" + frame + "\".",
      "",
      "H) Next Team Meeting Agenda",
      "- Review baseline-to-current trend and decide: maintain, intensify, or fade support.",
      "- Confirm who owns each action: LS teacher, classroom teacher, student, family."
    ].join("\n");
  }

  function formatCaseStatus(status) {
    if (status === "watch") return "Watch";
    if (status === "ready") return "Ready";
    return "Active";
  }

  function saveCaseload() {
    try {
      localStorage.setItem(CASELOAD_KEY, JSON.stringify(caseloadItems || []));
    } catch (_error) {
      // Ignore storage write failures.
    }
  }

  function loadCaseload() {
    try {
      var raw = JSON.parse(localStorage.getItem(CASELOAD_KEY) || "[]");
      caseloadItems = Array.isArray(raw) ? raw.map(function (item) {
        return {
          id: item.id || ("c" + Math.random().toString(36).slice(2, 8)),
          name: item.name || "Student",
          goal: item.goal || "Writing growth",
          next: item.next || "Plan next writing move.",
          status: item.status || "active",
          lastSample: item.lastSample || "",
          lastWords: Number(item.lastWords) || 0,
          lastScore: item.lastScore || "",
          history: Array.isArray(item.history) ? item.history : []
        };
      }) : [];
    } catch (_error) {
      caseloadItems = [];
    }
  }

  function buildCaseloadBoardText() {
    if (!caseloadItems.length) return "";
    return [
      "Caseload Board Snapshot",
      "Date: " + new Date().toLocaleDateString(),
      getLessonSummaryLine(),
      ""
    ].concat(caseloadItems.map(function (item, index) {
      var words = item.lastWords ? (item.lastWords + " words") : "no sample words yet";
      var score = item.lastScore || "no score yet";
      var sample = item.lastSample || "no sample date";
      var trend = getCaseTrendText(item);
      return (index + 1) + ". " + item.name +
        " | Status: " + formatCaseStatus(item.status) +
        " | Goal: " + item.goal +
        " | Next: " + item.next +
        " | Last sample: " + sample +
        " | " + words +
        " | " + score +
        " | Trend: " + trend;
    })).join("\n");
  }

  function parseScoreValue(scoreText) {
    var match = String(scoreText || "").match(/^(\d+)/);
    return match ? Number(match[1]) : 0;
  }

  function getCaseTrendText(item) {
    if (!item || !Array.isArray(item.history) || item.history.length < 2) return "collecting";
    var first = item.history[0];
    var last = item.history[item.history.length - 1];
    var scoreDelta = (last.score || 0) - (first.score || 0);
    var wordDelta = (last.words || 0) - (first.words || 0);
    var scorePart = scoreDelta === 0 ? "score flat" : (scoreDelta > 0 ? ("score +" + scoreDelta) : ("score " + scoreDelta));
    var wordPart = wordDelta === 0 ? "words flat" : (wordDelta > 0 ? ("words +" + wordDelta) : ("words " + wordDelta));
    return scorePart + ", " + wordPart;
  }

  function buildSparkline(history, key, maxValue, color) {
    var points = Array.isArray(history) ? history.slice(-8) : [];
    if (!points.length) return "";
    var width = 130;
    var height = 28;
    var pad = 2;
    var den = Math.max(1, points.length - 1);
    var line = points.map(function (point, idx) {
      var value = Number(point[key] || 0);
      var x = Math.round((idx / den) * (width - pad * 2) + pad);
      var y = Math.round((1 - Math.min(maxValue, value) / maxValue) * (height - pad * 2) + pad);
      return x + "," + y;
    }).join(" ");
    return "<svg viewBox='0 0 " + width + " " + height + "' width='" + width + "' height='" + height + "' aria-hidden='true'>" +
      "<polyline fill='none' stroke='" + color + "' stroke-width='2.5' points='" + line + "' /></svg>";
  }

  function renderCaseload() {
    if (!caseListEl) return;
    caseListEl.innerHTML = "";
    if (!caseloadItems.length) {
      var empty = document.createElement("div");
      empty.className = "ws-tip";
      empty.textContent = "No students added yet.";
      caseListEl.appendChild(empty);
      return;
    }
    caseloadItems.forEach(function (item) {
      var card = document.createElement("div");
      card.className = "ws-case-item";
      card.setAttribute("data-case-id", item.id);

      var head = document.createElement("div");
      head.className = "ws-case-head";

      var name = document.createElement("div");
      name.className = "ws-case-name";
      name.textContent = item.name;

      var status = document.createElement("span");
      status.className = "ws-pill ws-case-status ws-case-status-" + (item.status || "active");
      status.textContent = formatCaseStatus(item.status);

      head.appendChild(name);
      head.appendChild(status);

      var meta = document.createElement("div");
      meta.className = "ws-case-meta";
      meta.textContent = "Goal: " + item.goal + " | Next: " + item.next;

      var sample = document.createElement("div");
      sample.className = "ws-case-sample";
      sample.textContent = "Sample: " + (item.lastSample || "none") +
        " | " + (item.lastWords ? item.lastWords + " words" : "no words") +
        " | " + (item.lastScore || "no rubric") +
        " | Trend: " + getCaseTrendText(item);

      var trendRow = document.createElement("div");
      trendRow.className = "ws-case-trends";
      trendRow.innerHTML =
        "<span class='ws-case-trend-label'>Score</span>" + buildSparkline(item.history, "score", 9, "#5ec8ff") +
        "<span class='ws-case-trend-label'>Words</span>" + buildSparkline(item.history, "words", 80, "#ffbf69");

      var actions = document.createElement("div");
      actions.className = "ws-case-actions";

      var fromDraftBtn = document.createElement("button");
      fromDraftBtn.className = "ws-secondary";
      fromDraftBtn.type = "button";
      fromDraftBtn.setAttribute("data-case-action", "draft");
      fromDraftBtn.setAttribute("data-case-id", item.id);
      fromDraftBtn.textContent = "From Draft";

      var cycleBtn = document.createElement("button");
      cycleBtn.className = "ws-secondary";
      cycleBtn.type = "button";
      cycleBtn.setAttribute("data-case-action", "cycle");
      cycleBtn.setAttribute("data-case-id", item.id);
      cycleBtn.textContent = "Cycle Status";

      var assignBtn = document.createElement("button");
      assignBtn.className = "ws-secondary";
      assignBtn.type = "button";
      assignBtn.setAttribute("data-case-action", "assign");
      assignBtn.setAttribute("data-case-id", item.id);
      assignBtn.textContent = "Assign Next";

      var taskBtn = document.createElement("button");
      taskBtn.className = "ws-secondary";
      taskBtn.type = "button";
      taskBtn.setAttribute("data-case-action", "task");
      taskBtn.setAttribute("data-case-id", item.id);
      taskBtn.textContent = "Copy Task";

      var linkBtn = document.createElement("button");
      linkBtn.className = "ws-secondary";
      linkBtn.type = "button";
      linkBtn.setAttribute("data-case-action", "link");
      linkBtn.setAttribute("data-case-id", item.id);
      linkBtn.textContent = "Task Link";

      var qrBtn = document.createElement("button");
      qrBtn.className = "ws-secondary";
      qrBtn.type = "button";
      qrBtn.setAttribute("data-case-action", "qr");
      qrBtn.setAttribute("data-case-id", item.id);
      qrBtn.textContent = "Show QR";

      var homeBtn = document.createElement("button");
      homeBtn.className = "ws-secondary";
      homeBtn.type = "button";
      homeBtn.setAttribute("data-case-action", "home");
      homeBtn.setAttribute("data-case-id", item.id);
      homeBtn.textContent = "Copy Home";

      var deleteBtn = document.createElement("button");
      deleteBtn.className = "ws-secondary";
      deleteBtn.type = "button";
      deleteBtn.setAttribute("data-case-action", "delete");
      deleteBtn.setAttribute("data-case-id", item.id);
      deleteBtn.textContent = "Remove";

      actions.appendChild(fromDraftBtn);
      actions.appendChild(cycleBtn);
      actions.appendChild(assignBtn);
      actions.appendChild(taskBtn);
      actions.appendChild(linkBtn);
      actions.appendChild(qrBtn);
      actions.appendChild(homeBtn);
      actions.appendChild(deleteBtn);

      card.appendChild(head);
      card.appendChild(meta);
      card.appendChild(sample);
      card.appendChild(trendRow);
      card.appendChild(actions);
      caseListEl.appendChild(card);
    });
  }

  function addCaseloadStudent() {
    var name = String(caseNameInput && caseNameInput.value || "").trim();
    var goal = String(caseGoalInput && caseGoalInput.value || "").trim();
    var next = String(caseNextInput && caseNextInput.value || "").trim();
    if (!name || !goal || !next) {
      showToast("Add student, goal, and next action");
      return;
    }
    caseloadItems.unshift({
      id: "c" + Date.now().toString(36) + Math.random().toString(36).slice(2, 5),
      name: name,
      goal: goal,
      next: next,
      status: "active",
      lastSample: "",
      lastWords: 0,
      lastScore: "",
      history: []
    });
    if (caseNameInput) caseNameInput.value = "";
    if (caseGoalInput) caseGoalInput.value = "";
    if (caseNextInput) caseNextInput.value = "";
    saveCaseload();
    renderCaseload();
    renderImpactSnapshot();
    showToast("Student added to caseload");
  }

  function cycleCaseStatus(item) {
    if (!item) return;
    if (item.status === "active") item.status = "watch";
    else if (item.status === "watch") item.status = "ready";
    else item.status = "active";
  }

  function updateCaseFromDraft(item) {
    if (!item) return;
    var snap = getWritingSnapshot();
    item.lastSample = new Date().toLocaleDateString();
    item.lastWords = snap.words;
    item.lastScore = snap.scores.total + "/9";
    if (!Array.isArray(item.history)) item.history = [];
    item.history.push({
      at: Date.now(),
      words: snap.words,
      score: snap.scores.total,
      planning: getPlanningStatus(snap.text, snap.words, snap.sentences).percent
    });
    if (item.history.length > 12) item.history = item.history.slice(-12);
  }

  function deriveNextTask(item) {
    var history = Array.isArray(item.history) ? item.history : [];
    var latest = history.length ? history[history.length - 1] : null;
    if (!latest || latest.planning < 60) return "Plan: complete 3 bullets before drafting.";
    if ((latest.score || 0) < 5) return "Draft: write claim/topic + 2 support lines.";
    if ((latest.score || 0) < 7) return "Revise: add evidence and one why-it-matters line.";
    return "Publish: final read aloud + one precision upgrade.";
  }

  function buildCaseTaskCard(item) {
    var task = item && item.next ? item.next : deriveNextTask(item);
    return [
      "Student Task Card",
      "Student: " + (item ? item.name : "Student"),
      "Goal focus: " + (item ? item.goal : "Writing growth"),
      "Next step: " + task,
      "Success check: complete task and update from draft."
    ].join("\n");
  }

  function buildCaseTaskLink(item) {
    var params = new URLSearchParams();
    params.set("student", item && item.name ? item.name : "Student");
    params.set("goal", item && item.goal ? item.goal : "Writing growth");
    params.set("task", item && item.next ? item.next : deriveNextTask(item));
    params.set("mode", currentMode);
    params.set("grade", currentGradeBand);
    return String(window.location.origin + window.location.pathname + "#task-" + encodeURIComponent(params.toString()));
  }

  function showCaseTaskQR(item) {
    var link = buildCaseTaskLink(item);
    var qr = "https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=" + encodeURIComponent(link);
    var payload = [
      "Student Task Handoff",
      "Student: " + (item ? item.name : "Student"),
      "Open link: " + link,
      "",
      "QR: " + qr
    ].join("\n");
    try {
      window.open(qr, "_blank", "noopener");
    } catch (_error) {
      // Ignore popup blockers.
    }
    copyTextPayload(payload, "Task handoff copied");
  }

  function buildCaseHomePlan(item) {
    var barrier = inferBarrierCategory();
    var homePlan = getHomePlanByBarrier(barrier);
    return [
      "Home Writing Plan",
      "Student: " + (item ? item.name : "Student"),
      "Current goal: " + (item ? item.goal : "Writing confidence"),
      "Prompt: " + homePlan.prompt,
      "Routine: " + homePlan.routine
    ].join("\n");
  }

  function handleCaseloadAction(event) {
    var target = event.target;
    if (!target || !target.getAttribute) return;
    var action = target.getAttribute("data-case-action");
    var id = target.getAttribute("data-case-id");
    if (!action || !id) return;
    var item = caseloadItems.find(function (entry) { return entry.id === id; });
    if (!item && action !== "delete") return;
    if (action === "draft") {
      updateCaseFromDraft(item);
      showToast("Student updated from draft");
    } else if (action === "cycle") {
      cycleCaseStatus(item);
      showToast("Status updated");
    } else if (action === "assign") {
      item.next = deriveNextTask(item);
      showToast("Next task assigned");
    } else if (action === "task") {
      copyTextPayload(buildCaseTaskCard(item), "Task card copied");
    } else if (action === "link") {
      copyTextPayload(buildCaseTaskLink(item), "Task link copied");
    } else if (action === "qr") {
      showCaseTaskQR(item);
    } else if (action === "home") {
      copyTextPayload(buildCaseHomePlan(item), "Home plan copied");
    } else if (action === "delete") {
      caseloadItems = caseloadItems.filter(function (entry) { return entry.id !== id; });
      showToast("Student removed");
    }
    saveCaseload();
    renderCaseload();
    renderImpactSnapshot();
  }

  function copyCaseloadBoard() {
    copyTextPayload(buildCaseloadBoardText(), "Caseload board copied");
  }

  function buildWeeklyPlan() {
    if (!caseloadItems.length) return "No caseload students yet.";
    var slots = [
      { day: "Mon", block: "Block A" }, { day: "Mon", block: "Block B" },
      { day: "Tue", block: "Block A" }, { day: "Tue", block: "Block B" },
      { day: "Wed", block: "Block A" }, { day: "Wed", block: "Block B" },
      { day: "Thu", block: "Block A" }, { day: "Thu", block: "Block B" },
      { day: "Fri", block: "Check-in" }
    ];
    var sorted = caseloadItems.slice().sort(function (a, b) {
      var rank = { active: 0, watch: 1, ready: 2 };
      return (rank[a.status] || 3) - (rank[b.status] || 3);
    });
    var lines = [
      "Weekly MTSS Writing Plan",
      "Date: " + new Date().toLocaleDateString(),
      ""
    ];
    sorted.forEach(function (item, idx) {
      var slot = slots[Math.min(idx, slots.length - 1)];
      var status = getCaseWeeklyStatus(item);
      lines.push(slot.day + " " + slot.block + ": " + item.name + " (" + status.level + ") -> " + status.action);
    });
    return lines.join("\n");
  }

  function buildAndRenderWeeklyPlan() {
    var plan = buildWeeklyPlan();
    if (weekPlanTextEl) weekPlanTextEl.textContent = plan.split("\n").slice(0, 4).join(" | ");
    showToast("Week plan generated");
  }

  function copyWeeklyPlan() {
    copyTextPayload(buildWeeklyPlan(), "Week plan copied");
  }

  function applyPlaybook() {
    var id = String(playbookSelect && playbookSelect.value || "ms-ef");
    var pack = PLAYBOOKS[id];
    if (!pack) return;
    withMutedToasts(function () {
      if (pack.gradeBand) setGradeBand(pack.gradeBand);
      if (pack.mode) setMode(pack.mode);
      if (pack.profile) setProfile(pack.profile);
      if (pack.organizer && organizerTypeSelect) {
        organizerTypeSelect.value = pack.organizer;
        renderOrganizerPreview();
      }
    });
    setScaffoldCue(pack.cue || "Use one focused intervention routine.");
    if (caseNextInput) caseNextInput.value = pack.nextAction || "";
    renderImpactSnapshot();
    showToast("Playbook applied");
  }

  function getRailBlockTitle(block) {
    if (!block) return "Section";
    var heading = block.querySelector(".ws-h2");
    return heading ? String(heading.textContent || "Section").trim() : "Section";
  }

  function renderRailPager() {
    if (!railEl || !railBlocks.length) return;
    railEl.classList.toggle("is-paged", !railShowAll);
    railBlocks.forEach(function (block, idx) {
      var hidden = !railShowAll && idx !== railIndex;
      block.classList.toggle("ws-panel-hidden", hidden);
    });
    if (railTitleEl) railTitleEl.textContent = getRailBlockTitle(railBlocks[railIndex]);
    if (railPrevBtn) railPrevBtn.disabled = !railShowAll && railIndex <= 0;
    if (railNextBtn) railNextBtn.disabled = !railShowAll && railIndex >= railBlocks.length - 1;
    if (railToggleBtn) {
      railToggleBtn.textContent = railShowAll ? "Show One" : "Show All";
      railToggleBtn.setAttribute("aria-pressed", railShowAll ? "true" : "false");
    }
  }

  function goToRailPanelById(id) {
    if (!id || !railBlocks.length) return;
    var idx = railBlocks.findIndex(function (block) { return block.id === id; });
    if (idx < 0) return;
    railIndex = idx;
    railShowAll = false;
    renderRailPager();
  }

  function goToRailPanel(delta) {
    if (!railBlocks.length) return;
    railIndex = Math.max(0, Math.min(railBlocks.length - 1, railIndex + delta));
    railShowAll = false;
    renderRailPager();
  }

  function toggleRailView() {
    railShowAll = !railShowAll;
    renderRailPager();
  }

  function initRailPager() {
    if (!railEl) return;
    railBlocks = Array.prototype.slice.call(railEl.querySelectorAll(".ws-rail-block")).filter(function (block) {
      return !block.hidden;
    });
    railIndex = 0;
    railShowAll = false;
    renderRailPager();
  }

  function runMission(type) {
    if (type === "warmup") {
      withMutedToasts(function () {
        setMode("sentence");
        setStep("plan");
      });
      goToRailPanelById("ws-block-warmup");
      setScaffoldCue("Mission: fix one sentence, then write one better sentence.");
      showToast("Mission loaded: Warm-Up");
      return;
    }
    if (type === "plan") {
      withMutedToasts(function () {
        setMode("sentence");
        setStep("plan");
      });
      goToRailPanelById("ws-block-scaffold");
      setScaffoldCue("Mission: add 2 idea bullets, then insert plan into draft.");
      if (planTopicInput) planTopicInput.focus();
      showToast("Mission loaded: Build a Plan");
      return;
    }
    withMutedToasts(function () {
      setMode("paragraph");
      setStep("draft");
    });
    goToRailPanelById("ws-block-coach");
    setScaffoldCue("Mission: write claim, evidence, and one explanation line.");
    editor.focus();
    showToast("Mission loaded: Power Paragraph");
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

  function renderWordQuestContextBadge(context) {
    if (!launchContextEl) return;
    var focusLabel = String(context && context.focusLabel || "").trim();
    var word = String(context && context.word || "").trim();
    var tag = focusLabel || "WordQuest";
    if (word) tag += " • " + word;
    launchContextEl.textContent = "From WordQuest: " + tag;
    launchContextEl.hidden = false;
  }

  function storeReturnSummaryForWordQuest() {
    var text = String(editor.value || "").trim();
    var words = getWordCount(text);
    var sentences = splitSentences(text).length;
    var planCount = planItems.length;
    var bestLine = selectBestLineFromText(text);
    var payload = {
      at: Date.now(),
      mode: currentMode,
      gradeBand: currentGradeBand,
      words: words,
      sentences: sentences,
      planItems: planCount,
      bestLine: bestLine,
      focus: wordQuestContext && wordQuestContext.focusLabel ? wordQuestContext.focusLabel : "",
      word: wordQuestContext && wordQuestContext.word ? wordQuestContext.word : ""
    };
    try {
      localStorage.setItem(RETURN_KEY, JSON.stringify(payload));
    } catch (_error) {
      // Ignore storage errors.
    }
  }

  function applyWordQuestContext() {
    var context = getWordQuestContextFromQuery();
    var hasContext = Boolean(context.gradeBand || context.focus || context.word || context.clue);
    if (!hasContext) return;
    wordQuestContext = context;
    renderWordQuestContextBadge(context);

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
        trackArtifactCopy("Family prompt copied");
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
      qualityStreak += 1;
      bestQualityStreak = Math.max(bestQualityStreak, qualityStreak);
      if (warmupRoundTimer) warmupRoundScore += 1;
      saveWarmupStats();
      saveEngagementState();
      renderWarmupArcade();
      renderROIDashboard();
      renderImpactSnapshot();
      if (warmupStatusEl) warmupStatusEl.textContent = "Correct. Nice fix.";
      showToast("Warm-up correct");
      return;
    }
    warmupStreak = 0;
    qualityStreak = 0;
    saveWarmupStats();
    saveEngagementState();
    renderROIDashboard();
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

  function applyRoleVisibility() {
    var blocks = Array.prototype.slice.call(document.querySelectorAll("#ws-rail .ws-rail-block"));
    blocks.forEach(function (block) {
      var groups = String(block.getAttribute("data-role-group") || "all").split(",").map(function (t) { return t.trim(); });
      var visible = groups.indexOf("all") >= 0 || groups.indexOf(currentAudience) >= 0;
      block.hidden = !visible;
    });
    if (advancedCanvasEl) {
      advancedCanvasEl.open = currentAudience === "teacher" || currentAudience === "support";
    }
    initRailPager();
  }

  function setAudience(audience, options) {
    var normalized = audience === "teacher" || audience === "family" || audience === "support" ? audience : "student";
    currentAudience = normalized;
    audienceButtons.forEach(function (btn) {
      btn.classList.toggle("is-active", btn.getAttribute("data-audience") === normalized);
    });

    if (subtitleEl) {
      if (normalized === "teacher") subtitleEl.textContent = "Launch writing in 60 seconds, then coach live.";
      else if (normalized === "support") subtitleEl.textContent = "Run targeted LS/EAL support with clear intervention steps.";
      else if (normalized === "family") subtitleEl.textContent = "Support writing at home with calm, clear next steps.";
      else subtitleEl.textContent = "Build ideas with structure — not stress.";
    }

    if (welcomeEl) {
      if (normalized === "teacher") welcomeEl.textContent = "Teacher view: pick launch mode, model one move, and circulate.";
      else if (normalized === "support") welcomeEl.textContent = "LS/EAL view: assign one step, update from draft, track growth.";
      else if (normalized === "family") welcomeEl.textContent = "Family view: praise effort, then prompt one next move.";
      else welcomeEl.textContent = "Student view: one small step at a time.";
    }

    if (normalized === "teacher") {
      setScaffoldCue("Try: Glow first, then one clear Grow point.");
    } else if (normalized === "support") {
      setScaffoldCue("Use one scaffold, one draft line, then immediate feedback.");
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
    applyRoleVisibility();
    renderLaunchpadCopy();
    if (!(options && options.silent)) showToast("Audience: " + (normalized === "teacher" ? "Teacher" : normalized === "support" ? "LS/EAL" : normalized === "family" ? "Family" : "Student"));
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

  function renderLaunchpadCopy() {
    if (!launchpadCopyEl) return;
    if (currentAudience === "teacher") {
      if (currentProfile === "whole") {
        launchpadCopyEl.textContent = "Whole class: model one claim, build two details, then release students.";
      } else if (currentProfile === "small") {
        launchpadCopyEl.textContent = "Small group: oral rehearse, write one sentence, then immediate feedback.";
      } else {
        launchpadCopyEl.textContent = "1:1: one tiny step, one line written, then celebrate and repeat.";
      }
      return;
    }
    if (currentAudience === "family") {
      launchpadCopyEl.textContent = "Family: read one line aloud, praise one strength, add one next sentence.";
      return;
    }
    if (currentAudience === "support") {
      launchpadCopyEl.textContent = "LS/EAL: assign one micro-task, write one line, then update caseload.";
      return;
    }
    launchpadCopyEl.textContent = "Students: pick a start mode, write one line now, then press Next Move.";
  }

  function runQuickLaunch(kind) {
    var target = kind === "small" || kind === "one" ? kind : "whole";
    withMutedToasts(function () {
      if (target === "whole") {
        setAudience("teacher", { silent: true });
        setPresetPack("fishtank", { silent: true });
        setProfile("whole");
        setMode("paragraph");
      } else if (target === "small") {
        setAudience("teacher", { silent: true });
        setPresetPack("stepup", { silent: true });
        setProfile("small");
        setMode("sentence");
      } else {
        setAudience("teacher", { silent: true });
        setPresetPack("ls", { silent: true });
        setProfile("one");
        setMode("sentence");
      }
    });
    setStep("plan");
    if (planTopicInput) planTopicInput.focus();
    if (setupToggleBtn && setupToggleBtn.getAttribute("aria-expanded") === "true") {
      setSetupPanelOpen(false);
    }
    renderLaunchpadCopy();
    showToast(target === "whole"
      ? "Launch ready: whole class routine"
      : target === "small"
        ? "Launch ready: small group routine"
        : "Launch ready: 1:1 intensive routine");
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
    if (nextStepBtn) nextStepBtn.textContent = next === "whole" ? "Advance Step" : "Do This Next";
    updateMetricsAndCoach();
    renderLaunchpadCopy();
    showToast("Profile: " + (next === "whole" ? "Whole Class" : next === "small" ? "Small Group" : "1:1"));
  }

  function updateMetricsAndCoach() {
    var text = editor.value;
    var words = getWordCount(text);
    var sentences = splitSentences(text).length;
    metrics.textContent = sentences + " sentence" + (sentences === 1 ? "" : "s") + " • " + words + " word" + (words === 1 ? "" : "s");
    renderLiveHint(words, sentences);
    renderFlowState(text, words, sentences);
    renderGoal(text, words, sentences);
    renderCoachTips(text, words, sentences);
    renderGlowGrowGo(text, words, sentences);
    renderConferenceCopilot(text, words, sentences);
    renderMasterySnapshot(text, words, sentences);
    renderPlanningMeter(text, words, sentences);
    renderImpactSnapshot();
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
    if (fishTankGradeSelect) {
      fishTankGradeSelect.value = getFishTankBand();
      renderFishTankPaths();
      renderFishTankUnits();
      renderFishTankTarget(getSelectedFishTankLesson());
    }
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
    updateQualityStreak(editor.value, getWordCount(editor.value), splitSentences(editor.value).length);
    var stage = document.getElementById("ws-stage");
    if (stage) {
      stage.classList.add("ws-saved");
      window.setTimeout(function () { stage.classList.remove("ws-saved"); }, 420);
    }
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
    renderLaunchpadCopy();
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

  function setSetupPanelOpen(open) {
    if (!setupToggleBtn || !controlsPanelEl) return;
    var expanded = !!open;
    controlsPanelEl.hidden = !expanded;
    setupToggleBtn.setAttribute("aria-expanded", expanded ? "true" : "false");
    setupToggleBtn.textContent = expanded ? "Hide Setup" : "Class Setup";
  }

  function toggleSetupPanel() {
    if (!setupToggleBtn || !controlsPanelEl) return;
    var expanded = setupToggleBtn.getAttribute("aria-expanded") === "true";
    setSetupPanelOpen(!expanded);
  }

  function goBackToWordQuest() {
    var current = normalizeTheme(document.documentElement.getAttribute("data-theme") || "default");
    var prefs = loadPrefs();
    localStorage.setItem(STUDIO_THEME_KEY, current);
    storeReturnSummaryForWordQuest();
    if (shouldPersistTheme(prefs)) {
      prefs.theme = current;
      savePrefs(prefs);
    }
    var url = new URL("index.html", window.location.href);
    url.searchParams.set("theme", current);
    url.searchParams.set("wq_studio_return", "1");
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
  if (impactToggleBtn) impactToggleBtn.addEventListener("click", toggleImpact);
  if (impactCloseBtn) impactCloseBtn.addEventListener("click", function () { setImpactOpen(false); });
  if (mtssCopyBtn) mtssCopyBtn.addEventListener("click", function () {
    copyTextPayload(buildMTSSWeeklyReview(), "MTSS weekly review copied");
  });
  if (missionWarmupBtn) missionWarmupBtn.addEventListener("click", function () { runMission("warmup"); });
  if (missionPlanBtn) missionPlanBtn.addEventListener("click", function () { runMission("plan"); });
  if (missionPowerBtn) missionPowerBtn.addEventListener("click", function () { runMission("power"); });
  if (nextStepBtn) nextStepBtn.addEventListener("click", handleNextMove);
  if (quickWholeBtn) quickWholeBtn.addEventListener("click", function () { runQuickLaunch("whole"); });
  if (quickSmallBtn) quickSmallBtn.addEventListener("click", function () { runQuickLaunch("small"); });
  if (quickOneBtn) quickOneBtn.addEventListener("click", function () { runQuickLaunch("one"); });
  if (planAddBtn) planAddBtn.addEventListener("click", addPlanItem);
  if (planUseBtn) planUseBtn.addEventListener("click", usePlanInDraft);
  if (organizerTypeSelect) organizerTypeSelect.addEventListener("change", renderOrganizerPreview);
  if (organizerApplyBtn) organizerApplyBtn.addEventListener("click", applyOrganizerTemplate);
  if (presetSelect) presetSelect.addEventListener("change", function () { setPresetPack(presetSelect.value); });
  if (gradeBandSelect) gradeBandSelect.addEventListener("change", function () { setGradeBand(gradeBandSelect.value); });
  if (fishTankGradeSelect) fishTankGradeSelect.addEventListener("change", function () {
    renderFishTankPaths();
    renderFishTankUnits();
    renderFishTankTarget(getSelectedFishTankLesson());
  });
  if (fishTankPathSelect) fishTankPathSelect.addEventListener("change", function () {
    renderFishTankUnits();
    renderFishTankTarget(getSelectedFishTankLesson());
  });
  if (fishTankUnitSelect) fishTankUnitSelect.addEventListener("change", function () {
    renderFishTankLessons();
    renderFishTankTarget(getSelectedFishTankLesson());
  });
  if (fishTankLessonSelect) fishTankLessonSelect.addEventListener("change", function () {
    renderFishTankTarget(getSelectedFishTankLesson());
  });
  if (fishTankLoadBtn) fishTankLoadBtn.addEventListener("click", applyFishTankLesson);
  if (fishTankGapBtn) fishTankGapBtn.addEventListener("click", runFishTankGapRescue);
  if (fishTankNoteBtn) fishTankNoteBtn.addEventListener("click", function () {
    copyTextPayload(buildSessionNote(), "Session note copied");
  });
  if (fishTankEvidenceBtn) fishTankEvidenceBtn.addEventListener("click", function () {
    copyTextPayload(buildEvidenceLog(), "Evidence log copied");
  });
  if (fishTankParentBtn) fishTankParentBtn.addEventListener("click", function () {
    copyTextPayload(buildParentUpdate(), "Parent update copied");
  });
  if (fishTankHandoffBtn) fishTankHandoffBtn.addEventListener("click", function () {
    copyTextPayload(buildTeacherHandoff(), "Teacher handoff copied");
  });
  if (fishTankSsmBtn) fishTankSsmBtn.addEventListener("click", function () {
    copyTextPayload(buildSSMAgenda(), "SSM agenda copied");
  });
  if (fishTankIespBtn) fishTankIespBtn.addEventListener("click", function () {
    copyTextPayload(buildIESPGoalDraft(), "IESP goal draft copied");
  });
  if (fishTankPacketBtn) fishTankPacketBtn.addEventListener("click", function () {
    copyTextPayload(buildLSTeamPacket(), "LS team packet copied");
  });
  if (weekPlanBuildBtn) weekPlanBuildBtn.addEventListener("click", buildAndRenderWeeklyPlan);
  if (weekPlanCopyBtn) weekPlanCopyBtn.addEventListener("click", copyWeeklyPlan);
  if (caseAddBtn) caseAddBtn.addEventListener("click", addCaseloadStudent);
  if (caseCopyBtn) caseCopyBtn.addEventListener("click", copyCaseloadBoard);
  if (playbookApplyBtn) playbookApplyBtn.addEventListener("click", applyPlaybook);
  if (caseListEl) caseListEl.addEventListener("click", handleCaseloadAction);
  if (railPrevBtn) railPrevBtn.addEventListener("click", function () { goToRailPanel(-1); });
  if (railNextBtn) railNextBtn.addEventListener("click", function () { goToRailPanel(1); });
  if (railToggleBtn) railToggleBtn.addEventListener("click", toggleRailView);
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
  if (tourCloseBtn) tourCloseBtn.addEventListener("click", finishTour);
  if (tourPrevBtn) tourPrevBtn.addEventListener("click", prevTourStep);
  if (tourNextBtn) tourNextBtn.addEventListener("click", nextTourStep);
  if (tourStartBtn) tourStartBtn.addEventListener("click", finishTour);
  if (familyCopyBtn) familyCopyBtn.addEventListener("click", copyFamilyPrompt);
  if (warmupInput) warmupInput.addEventListener("keydown", function (event) {
    if (event.key === "Enter") {
      event.preventDefault();
      checkWarmup();
    }
  });
  if (caseNextInput) caseNextInput.addEventListener("keydown", function (event) {
    if (event.key === "Enter") {
      event.preventDefault();
      addCaseloadStudent();
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
  if (setupToggleBtn) setupToggleBtn.addEventListener("click", toggleSetupPanel);
  settingsBtn.addEventListener("click", cycleTheme);
  document.addEventListener("keydown", function (event) {
    if (event.key === "Escape" && showcaseOpen) {
      closeShowcase();
      return;
    }
    if (event.key === "Escape" && impactOpen) {
      setImpactOpen(false);
      return;
    }
    if (event.key === "Escape" && tourOpen) {
      finishTour();
      return;
    }
    if (event.key === "Escape" && setupToggleBtn && setupToggleBtn.getAttribute("aria-expanded") === "true") {
      setSetupPanelOpen(false);
    }
  });
  document.addEventListener("click", function (event) {
    var target = event.target;
    if (setupToggleBtn && controlsPanelEl && setupToggleBtn.getAttribute("aria-expanded") === "true") {
      if (!controlsPanelEl.contains(target) && target !== setupToggleBtn) {
        setSetupPanelOpen(false);
      }
    }
    if (impactOpen && impactOverlayEl && target === impactOverlayEl) {
      setImpactOpen(false);
    }
    if (showcaseOpen && showcaseEl && target === showcaseEl) {
      closeShowcase();
    }
    if (tourOpen && tourEl && target === tourEl) {
      finishTour();
    }
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
  loadCaseload();
  renderCaseload();
  buildAndRenderWeeklyPlan();
  loadROIState();
  loadEngagementState();
  renderROIDashboard();
  renderImpactSnapshot();
  initRailPager();
  loadStepUpMode();
  loadAudience();
  loadFramework();
  loadDraft();
  setGradeBand("35");
  setProfile("whole");
  setMode("sentence");
  if (fishTankGradeSelect) {
    fishTankGradeSelect.value = getFishTankBand();
    renderFishTankPaths();
    renderFishTankUnits();
    renderFishTankTarget(getSelectedFishTankLesson());
  }
  loadPresetPack();
  applyTaskHandoffFromHash();
  applyWordQuestContext();
  maybeStartTour();
  setSetupPanelOpen(false);
  renderLaunchpadCopy();
})();
