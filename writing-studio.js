(function initWritingStudio() {
  "use strict";

  var DRAFT_KEY = "ws_draft_v1";
  var PREF_KEY = "wq_v2_prefs";
  var STUDIO_THEME_KEY = "ws_theme_v1";
  var FALLBACK_ACCENT = "#7aa7ff";
  var ACADEMIC_WORDS = ["analyze", "evidence", "infer", "structure", "contrast", "precise", "context", "impact", "support", "sequence"];
  var VOCAB_BY_MODE = {
    sentence: ["because", "detail", "first", "next", "so", "but", "describe", "clarify", "revise", "conclude"],
    paragraph: ["claim", "evidence", "analyze", "infer", "contrast", "context", "impact", "support", "sequence", "precise"]
  };
  var CHECKLIST_BY_MODE = {
    sentence: ["Topic sentence is clear", "I added two details", "I used because/so/but"],
    paragraph: ["Claim answers the prompt", "I cited text evidence", "I explained why evidence matters"]
  };
  var CONJUNCTION_RE = /\b(and|but|or|so|because|although|however|therefore|while|if)\b/i;
  var EVIDENCE_RE = /\b(according to|for example|for instance|the text says|in the text|evidence)\b/i;
  var CLAIM_RE = /\b(i think|i believe|this shows|the author|the text)\b/i;
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

  var body = document.body;
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
  var conferenceStrengthEl = document.getElementById("ws-conference-strength");
  var conferenceTargetEl = document.getElementById("ws-conference-target");
  var conferencePromptEl = document.getElementById("ws-conference-prompt");
  var sprintTimeEl = document.getElementById("ws-sprint-time");
  var sprintStartBtn = document.getElementById("ws-sprint-start");
  var sprintResetBtn = document.getElementById("ws-sprint-reset");
  var saveBtn = document.getElementById("ws-save");
  var clearBtn = document.getElementById("ws-clear");
  var modeButtons = Array.prototype.slice.call(document.querySelectorAll(".ws-chip[data-mode]"));
  var profileButtons = Array.prototype.slice.call(document.querySelectorAll(".ws-chip[data-profile]"));
  var modelBtn = document.getElementById("ws-model");
  var flowButtons = Array.prototype.slice.call(document.querySelectorAll(".ws-step[data-step]"));
  var goalEl = document.getElementById("ws-goal");
  var nextStepBtn = document.getElementById("ws-next-step");
  var planTopicInput = document.getElementById("ws-plan-topic");
  var planDetailInput = document.getElementById("ws-plan-detail");
  var planAddBtn = document.getElementById("ws-plan-add");
  var planUseBtn = document.getElementById("ws-plan-use");
  var planListEl = document.getElementById("ws-plan-list");
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
  var currentMode = "sentence";
  var currentProfile = "whole";
  var currentStep = "plan";
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
    return ACADEMIC_WORDS.filter(function (word) {
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

      if (academicCount < (currentProfile === "whole" ? 2 : 1)) {
        tips.push("Use academic words: evidence, analyze, and impact.");
      } else {
        tips.push("Academic language is strong. Keep your explanation precise.");
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

      if (academicCount === 0) {
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
    var stepTips = STEP_TIPS_BY_MODE[currentMode] || STEP_TIPS_BY_MODE.sentence;
    var goals = GOALS_BY_MODE[currentMode] || GOALS_BY_MODE.sentence;
    var hasConjunction = CONJUNCTION_RE.test(text);
    var hasEvidence = EVIDENCE_RE.test(text);
    var academicCount = countAcademicWords(text);

    if (currentMode === "paragraph") {
      glowEl.textContent = hasEvidence
        ? "You included evidence in your paragraph."
        : "Your claim frame is building.";
      growEl.textContent = hasEvidence
        ? "Add one sentence that explains why the evidence matters."
        : "Add one evidence sentence from the text.";
    } else {
      glowEl.textContent = hasConjunction
        ? "You connected ideas with transition words."
        : "You have a clear start to your writing.";
      growEl.textContent = hasConjunction
        ? "Upgrade one verb for stronger detail."
        : "Add because, so, or but to connect ideas.";
    }

    if (sentenceCount === 0 || words === 0) {
      glowEl.textContent = "You are ready to write.";
      growEl.textContent = "Start with one clear sentence.";
    }
    if (academicCount >= 2) {
      glowEl.textContent = "Academic vocabulary is showing up clearly.";
    }

    var baseGo = goals[currentStep] || stepTips[currentStep] || goals.plan;
    if (PROFILE_CONFIG[currentProfile].scaffold === "high") {
      baseGo += " One step only: complete this before anything else.";
    }
    goEl.textContent = baseGo;
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
    teacherModel = next === "one" ? true : teacherModel;
    if (modelBtn) {
      modelBtn.classList.toggle("is-active", teacherModel);
      modelBtn.setAttribute("aria-pressed", teacherModel ? "true" : "false");
      modelBtn.textContent = teacherModel ? "Teacher Model: On" : "Teacher Model: Off";
    }
    resetSprint();
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
  }

  function renderVocabPills() {
    var source = VOCAB_BY_MODE[currentMode] || VOCAB_BY_MODE.sentence;
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
    var labels = CHECKLIST_BY_MODE[currentMode] || CHECKLIST_BY_MODE.sentence;
    if (checklist1) checklist1.textContent = labels[0];
    if (checklist2) checklist2.textContent = labels[1];
    if (checklist3) checklist3.textContent = labels[2];
  }

  function showToast(message) {
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
    renderChecklist();
    renderVocabPills();
    setImagePrompts(imagePromptItems.length ? buildImagePrompts("this image") : []);
    updateMetricsAndCoach();
  }

  function setStep(step) {
    if (STEP_ORDER.indexOf(step) === -1) return;
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
    setStep(STEP_ORDER[idx + 1]);
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

  editor.addEventListener("input", updateMetricsAndCoach);
  saveBtn.addEventListener("click", saveDraft);
  clearBtn.addEventListener("click", clearDraft);
  checklistInputs.forEach(function (input) {
    input.addEventListener("change", updateMetricsAndCoach);
  });
  if (backBtn) backBtn.addEventListener("click", goBackToWordQuest);
  settingsBtn.addEventListener("click", cycleTheme);

  applyTheme(resolveInitialTheme());
  renderOrganizerPreview();
  renderPlanItems();
  renderSprint();
  loadDraft();
  setProfile("whole");
  setMode("sentence");
})();
