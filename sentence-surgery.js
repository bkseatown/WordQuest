(function sentenceSurgeryInit() {
  "use strict";

  var sentenceEl = document.getElementById("ssSentence");
  var meterBarEl = document.getElementById("ssMeterBar");
  var levelEl = document.getElementById("ssLevel");
  var badgeEl = document.getElementById("ssBadge");
  var compareEl = document.getElementById("ssCompare");
  var compareBeforeEl = document.getElementById("ssCompareBefore");
  var compareAfterEl = document.getElementById("ssCompareAfter");
  var teacherToggleBtn = document.getElementById("ssTeacherToggle");
  var verbMenuEl = document.getElementById("ssVerbMenu");
  var footerCtaEl = document.getElementById("ssFooterCta");
  var doneBtn = document.getElementById("ssDoneBtn");
  var tryAnotherBtn = document.getElementById("ssTryAnotherBtn");
  var completeActionsEl = document.getElementById("ssCompleteActions");
  var nextSentenceBtn = document.getElementById("ssNextSentenceBtn");
  var exitStudioBtn = document.getElementById("ssExitStudioBtn");
  var breakdownBodyEl = document.getElementById("ssBreakdownBody");
  var skillTagEl = document.getElementById("ssSkillTag");
  var groupingEl = document.getElementById("ssGrouping");
  var devLabelEl = document.getElementById("ssDevLabel");
  var actionButtons = Array.prototype.slice.call(document.querySelectorAll(".ss-actions button[data-action]"));

  if (!sentenceEl || !meterBarEl || !levelEl) return;

  var traitEls = {
    clarity: { fill: document.getElementById("ssTraitClarity"), value: document.getElementById("ssTraitClarityValue") },
    detail: { fill: document.getElementById("ssTraitDetail"), value: document.getElementById("ssTraitDetailValue") },
    reasoning: { fill: document.getElementById("ssTraitReasoning"), value: document.getElementById("ssTraitReasoningValue") },
    control: { fill: document.getElementById("ssTraitControl"), value: document.getElementById("ssTraitControlValue") }
  };

  var STRONG_VERBS = ["sprinted", "dashed", "raced", "bolted", "hurried", "charged", "darted"];
  var ADJECTIVE_BANK = ["tired", "small", "big", "quick", "slow", "loud", "quiet", "bright", "dark", "happy", "sad", "brave", "careful"];
  var CLAUSE_REGEX = /\b(because|although|when|if)\b[^.!?]*/gi;
  var VERB_OPTIONS = ["sprinted", "dashed", "raced", "bolted", "hurried"];
  var DEBUG_ON = (function () {
    try {
      return new URLSearchParams(window.location.search || "").get("debug") === "1";
    } catch (_e) {
      return false;
    }
  })();

  var sentenceBank = [
    { subject: "The", noun: "dog", verb: "ran", trail: "across the yard" },
    { subject: "The", noun: "student", verb: "wrote", trail: "during class" },
    { subject: "The", noun: "team", verb: "worked", trail: "on the project" }
  ];
  var sentenceIndex = 0;

  var state = {
    baseSentence: "",
    currentSentenceHTML: "",
    appliedActions: new Set(),
    maxActions: 4,
    step: 0,
    activeBlankId: null,
    verb: "ran",
    hasWhy: false,
    hasDetail: false,
    blankValues: { why1: "", detailAdj: "" },
    blankCompletePulse: { why1: false, detailAdj: false },
    beforeSnapshot: "",
    previousLevel: 1,
    previousClauseCount: 0
  };

  window.__SS_DEBUG = { state: state };

  function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
  }

  function sanitizeText(text) {
    return String(text || "").replace(/[\n\r]+/g, " ").replace(/\s+/g, " ").trim();
  }

  function escapeHtml(text) {
    return String(text || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  function baseModel() {
    return sentenceBank[sentenceIndex % sentenceBank.length];
  }

  function computeBaseSentence() {
    var model = baseModel();
    return model.subject + " " + model.noun + " " + model.verb + " " + model.trail + ".";
  }

  function snapshotState() {
    return {
      baseSentence: state.baseSentence,
      currentSentenceHTML: state.currentSentenceHTML,
      appliedActions: Array.from(state.appliedActions),
      maxActions: state.maxActions,
      step: state.step,
      activeBlankId: state.activeBlankId,
      verb: state.verb,
      hasWhy: state.hasWhy,
      hasDetail: state.hasDetail,
      blankValues: { why1: state.blankValues.why1, detailAdj: state.blankValues.detailAdj }
    };
  }

  function debugLog(actionType) {
    var snap = snapshotState();
    console.log("[SentenceSurgery] applyAction", actionType, snap);
    window.__SS_DEBUG = { state: state };
  }

  function blankSpan(blankId, ariaLabel) {
    var value = sanitizeText(state.blankValues[blankId]);
    var classes = ["ss-blank"];
    if (!value) classes.push("scaffold");
    if (state.blankCompletePulse[blankId]) classes.push("scaffold-complete");
    return '<span class="' + classes.join(" ") + '" contenteditable="true" data-blank-id="' +
      blankId + '" aria-label="' + escapeHtml(ariaLabel) + '">' + escapeHtml(value) + '</span>';
  }

  function whySlotSpan() {
    var value = sanitizeText(state.blankValues.why1);
    var classes = ["ss-slot", "ss-slot-why", "ss-blank"];
    var text = value;
    if (!value) {
      classes.push("placeholder");
      text = "your reason";
    }
    if (state.blankCompletePulse.why1) classes.push("scaffold-complete");
    return '<span id="ss-why" class="' + classes.join(" ") + '" contenteditable="true" data-slot="why" data-blank-id="why1" aria-label="Fill in reason">' +
      escapeHtml(text) + "</span>";
  }

  function buildSentenceHtml(pulseClause) {
    var model = baseModel();
    var nounPart = state.hasDetail
      ? blankSpan("detailAdj", "Fill in detail adjective") + " " + escapeHtml(model.noun)
      : escapeHtml(model.noun);

    var body = '<span class="ss-token ss-prefix">' + escapeHtml(model.subject) + " " + nounPart + " " + escapeHtml(state.verb) + " </span>";
    var trail = escapeHtml(model.trail);

    if (state.hasWhy) {
      var clauseClass = pulseClause ? "clause clause-pulse" : "clause";
      body += '<span class="' + clauseClass + '"><span class="ss-token ss-cause-word">because </span>' + whySlotSpan() + ' <span class="ss-token ss-suffix">' + trail + "</span></span><span class=\"ss-token ss-period\">.</span>";
    } else {
      body += '<span class="ss-token ss-suffix">' + trail + ".</span>";
    }

    return body;
  }

  function getPlainSentence() {
    return sanitizeText(sentenceEl.textContent || "");
  }

  function splitWords(text) {
    var clean = sanitizeText(text).replace(/[^a-zA-Z'\-\s]/g, " ");
    if (!clean) return [];
    return clean.split(/\s+/).filter(Boolean);
  }

  function countAdjectives(words) {
    return words.filter(function (word) {
      var lower = word.toLowerCase();
      if (ADJECTIVE_BANK.indexOf(lower) >= 0) return true;
      return /(y|ful|ous|ive|al|less|ic)$/.test(lower);
    }).length;
  }

  function countClauses(text) {
    var count = 0;
    var regex = new RegExp(CLAUSE_REGEX.source, "gi");
    while (regex.exec(text)) count += 1;
    return count;
  }

  function hasStrongVerb(words) {
    return words.some(function (word) {
      return STRONG_VERBS.indexOf(word.toLowerCase()) >= 0;
    });
  }

  function getLevel(wordCount, clausePresent, strongVerbPresent) {
    var level = wordCount <= 5 ? 1 : wordCount <= 10 ? 2 : 3;
    if (clausePresent) level = Math.max(level, 4);
    if (strongVerbPresent) level = Math.max(level, 5);
    return level;
  }

  function computeTraits(text) {
    var words = splitWords(text);
    var wordCount = words.length;
    var adjectiveCount = countAdjectives(words);
    var clauseCount = countClauses(text);
    var strongVerbPresent = hasStrongVerb(words);

    var clarity = clamp(Math.round((wordCount >= 4 ? 2 : 1) + (wordCount <= 16 ? 2 : 1) + (strongVerbPresent ? 1 : 0)), 0, 5);
    var detail = clamp(Math.round(Math.min(3, adjectiveCount) + (state.hasDetail ? 1 : 0) + (wordCount >= 8 ? 1 : 0)), 0, 5);
    var reasoning = clamp(Math.round(Math.min(3, clauseCount * 2) + (state.hasWhy ? 1 : 0) + (wordCount >= 10 ? 1 : 0)), 0, 5);
    var control = clamp(Math.round((/^[A-Z]/.test(text) ? 1 : 0) + (/[.!?]$/.test(text) ? 2 : 0) + (strongVerbPresent ? 1 : 0) + (wordCount > 0 ? 1 : 0)), 0, 5);

    return {
      clarity: clarity,
      detail: detail,
      reasoning: reasoning,
      control: control,
      adjectiveCount: adjectiveCount,
      clauseCount: clauseCount,
      strongVerbPresent: strongVerbPresent,
      wordCount: wordCount,
      blanksEmpty: countEmptyBlanks()
    };
  }

  function countEmptyBlanks() {
    var count = 0;
    if (state.hasWhy && !sanitizeText(state.blankValues.why1)) count += 1;
    if (state.hasDetail && !sanitizeText(state.blankValues.detailAdj)) count += 1;
    return count;
  }

  function updateTraitBars(traits) {
    ["clarity", "detail", "reasoning", "control"].forEach(function (key) {
      var value = clamp(Number(traits[key]) || 0, 0, 5);
      var row = traitEls[key];
      if (row.fill) row.fill.style.width = String(value * 20) + "%";
      if (row.value) row.value.textContent = String(value);
    });
  }

  function updateTeacherLens(traits) {
    var lowDetailAndClause = traits.detail <= 2 && traits.reasoning <= 2;
    var skillTag = "Developing sentence";
    if (traits.reasoning >= 4 && traits.control >= 4) skillTag = "Complex reasoning sentence";
    else if (traits.detail >= 4) skillTag = "Detailed sentence";
    else if (traits.clauseCount > 0) skillTag = "Reasoned sentence";

    if (skillTagEl) skillTagEl.textContent = skillTag;
    if (groupingEl) groupingEl.textContent = lowDetailAndClause ? "Tier 2 flag" : "Core";
    if (breakdownBodyEl) {
      breakdownBodyEl.textContent =
        "Words: " + traits.wordCount +
        " • Clauses: " + traits.clauseCount +
        " • Adjectives: " + traits.adjectiveCount +
        " • Strong verb: " + (traits.strongVerbPresent ? "Yes" : "No");
    }
  }

  function showBadge(text) {
    if (!badgeEl) return;
    badgeEl.textContent = text;
    badgeEl.classList.add("show");
    window.clearTimeout(showBadge._timer || 0);
    showBadge._timer = window.setTimeout(function () {
      badgeEl.classList.remove("show");
    }, 1200);
  }

  function showCompare(beforeText, afterText) {
    if (!compareEl || !compareBeforeEl || !compareAfterEl) return;
    compareBeforeEl.textContent = beforeText;
    compareAfterEl.textContent = afterText;
    compareEl.classList.remove("show");
    void compareEl.offsetWidth;
    compareEl.classList.add("show");
    window.clearTimeout(showCompare._timer || 0);
    showCompare._timer = window.setTimeout(function () {
      compareEl.classList.remove("show");
    }, 2000);
  }

  function updateActionLabels() {
    actionButtons.forEach(function (btn) {
      var type = btn.getAttribute("data-action");
      if (type === "why") btn.textContent = state.hasWhy ? "Edit Why" : "Add Why";
      if (type === "detail") btn.textContent = state.hasDetail ? "Edit Detail" : "Add Detail";
      if (type === "verb") btn.textContent = state.appliedActions.has("verb") ? "Change Verb" : "Upgrade Verb";
    });
  }

  function updateProgressAndTraits() {
    var sentenceText = getPlainSentence();
    var traits = computeTraits(sentenceText);
    var level = getLevel(traits.wordCount, traits.clauseCount > 0, traits.strongVerbPresent);
    var stepProgress = Math.round((state.step / state.maxActions) * 100);

    meterBarEl.style.width = String(clamp(stepProgress, 8, 100)) + "%";
    levelEl.textContent = "Level " + level + " • Step " + state.step + "/" + state.maxActions;
    updateTraitBars(traits);
    updateTeacherLens(traits);

    if (DEBUG_ON && devLabelEl) {
      devLabelEl.classList.remove("hidden");
      devLabelEl.textContent = "step: " + state.step + " | actions: " + state.appliedActions.size + " | blanksEmpty: " + traits.blanksEmpty;
    }

    if (footerCtaEl) {
      var canFinish = state.appliedActions.size >= 2 || state.step >= state.maxActions;
      footerCtaEl.classList.toggle("hidden", !canFinish);
    }

    state.previousLevel = level;
    state.previousClauseCount = traits.clauseCount;
  }

  function focusBlank(blankId) {
    if (!blankId) return;
    state.activeBlankId = blankId;
    requestAnimationFrame(function () {
      var blankEl = sentenceEl.querySelector('[data-blank-id="' + blankId + '"]');
      if (!blankEl) return;
      blankEl.focus();
      var range = document.createRange();
      range.selectNodeContents(blankEl);
      range.collapse(false);
      var sel = window.getSelection && window.getSelection();
      if (sel) {
        sel.removeAllRanges();
        sel.addRange(range);
      }
    });
  }

  function focusSlotReplaceAll(slotEl) {
    if (!slotEl) return;
    requestAnimationFrame(function () {
      slotEl.focus();
      var range = document.createRange();
      range.selectNodeContents(slotEl);
      var sel = window.getSelection && window.getSelection();
      if (sel) {
        sel.removeAllRanges();
        sel.addRange(range);
      }
    });
  }

  function setCaretToEnd(el) {
    if (!el) return;
    var range = document.createRange();
    range.selectNodeContents(el);
    range.collapse(false);
    var sel = window.getSelection && window.getSelection();
    if (sel) {
      sel.removeAllRanges();
      sel.addRange(range);
    }
  }

  function normalizeWhySlotPlaceholder(slotEl) {
    if (!slotEl) return;
    var next = sanitizeText(slotEl.textContent);
    if (!next) {
      slotEl.textContent = "your reason";
      slotEl.classList.add("placeholder");
      state.blankValues.why1 = "";
    }
  }

  function showWhyHint() {
    var slotEl = sentenceEl.querySelector("#ss-why");
    if (!slotEl) return;
    var old = document.getElementById("ssWhyHint");
    if (old) old.remove();
    var hint = document.createElement("div");
    hint.id = "ssWhyHint";
    hint.className = "ss-why-hint";
    hint.textContent = "Type your reason after because.";
    document.body.appendChild(hint);
    var rect = slotEl.getBoundingClientRect();
    hint.style.left = Math.max(12, Math.round(rect.left)) + "px";
    hint.style.top = Math.max(12, Math.round(rect.bottom + 8)) + "px";
    window.setTimeout(function () {
      hint.classList.add("hide");
      window.setTimeout(function () { hint.remove(); }, 220);
    }, 1500);
  }

  function pulseBlank(blankId) {
    requestAnimationFrame(function () {
      var blankEl = sentenceEl.querySelector('[data-blank-id="' + blankId + '"]');
      if (!blankEl) return;
      blankEl.classList.remove("ss-pulse");
      void blankEl.offsetWidth;
      blankEl.classList.add("ss-pulse");
      window.setTimeout(function () { blankEl.classList.remove("ss-pulse"); }, 260);
    });
  }

  function render(options) {
    var opts = options || {};
    var pulseClause = !!opts.pulseClause;
    sentenceEl.innerHTML = buildSentenceHtml(pulseClause);
    state.currentSentenceHTML = sentenceEl.innerHTML;
    window.__SS_DEBUG = { state: state };

    if (state.blankCompletePulse.why1 || state.blankCompletePulse.detailAdj) {
      window.setTimeout(function () {
        state.blankCompletePulse.why1 = false;
        state.blankCompletePulse.detailAdj = false;
        render();
      }, 220);
    }

    updateActionLabels();
    updateProgressAndTraits();
    if (opts.focusBlankId) focusBlank(opts.focusBlankId);
    if (opts.focusWhySlot) {
      var slotEl = sentenceEl.querySelector("#ss-why");
      if (slotEl) focusSlotReplaceAll(slotEl);
    }
    if (opts.pulseBlankId) pulseBlank(opts.pulseBlankId);
    if (opts.showWhyHint) showWhyHint();
  }

  function showVerbMenu(anchorButton) {
    if (!verbMenuEl || !anchorButton) return;
    var optionsHtml = VERB_OPTIONS.map(function (verb) {
      return '<button type="button" class="ss-verb-option" data-verb-choice="' + verb + '">' + verb + '</button>';
    }).join("");
    verbMenuEl.innerHTML = optionsHtml;
    verbMenuEl.classList.remove("hidden");

    var wrapRect = anchorButton.closest(".ss-actions").getBoundingClientRect();
    var btnRect = anchorButton.getBoundingClientRect();
    var left = (btnRect.left + btnRect.width / 2) - wrapRect.left;
    verbMenuEl.style.left = String(left) + "px";
  }

  function hideVerbMenu() {
    if (!verbMenuEl) return;
    verbMenuEl.classList.add("hidden");
    verbMenuEl.innerHTML = "";
  }

  function markActionApplied(actionType) {
    if (!state.appliedActions.has(actionType)) state.appliedActions.add(actionType);
    state.step = clamp(state.step + 1, 0, state.maxActions);
  }

  function applyAction(actionType, triggerEl) {
    var renderOpts = {};

    if (actionType === "why") {
      if (state.hasWhy) {
        renderOpts.focusWhySlot = true;
        renderOpts.pulseBlankId = "why1";
      } else {
        state.hasWhy = true;
        markActionApplied("why");
        renderOpts.focusWhySlot = true;
        renderOpts.pulseClause = true;
        renderOpts.showWhyHint = true;
        showBadge("Reason clause added");
      }
    }

    if (actionType === "detail") {
      if (state.hasDetail) {
        renderOpts.focusBlankId = "detailAdj";
        renderOpts.pulseBlankId = "detailAdj";
      } else {
        state.hasDetail = true;
        markActionApplied("detail");
        renderOpts.focusBlankId = "detailAdj";
      }
    }

    if (actionType === "verb") {
      showVerbMenu(triggerEl);
      if (!state.appliedActions.has("verb")) markActionApplied("verb");
    }

    debugLog(actionType);
    render(renderOpts);
  }

  function validateBlanks() {
    var blanks = Array.prototype.slice.call(sentenceEl.querySelectorAll(".ss-blank"));
    var firstInvalid = null;
    blanks.forEach(function (blankEl) {
      var value = sanitizeText(blankEl.textContent);
      if (blankEl.id === "ss-why" && blankEl.classList.contains("placeholder")) value = "";
      blankEl.classList.remove("is-invalid");
      if (!value) {
        if (!firstInvalid) firstInvalid = blankEl;
        blankEl.classList.add("is-invalid");
      }
    });
    if (firstInvalid) {
      firstInvalid.focus();
      return false;
    }
    return true;
  }

  function handleDone() {
    if (!validateBlanks()) return;
    var before = state.baseSentence;
    var after = getPlainSentence();
    showCompare(before, after);
    if (completeActionsEl) completeActionsEl.classList.add("hidden");
    window.setTimeout(function () {
      if (completeActionsEl) completeActionsEl.classList.remove("hidden");
    }, 2000);
  }

  function resetProgressForSameSentence() {
    var model = baseModel();
    state.baseSentence = computeBaseSentence();
    state.beforeSnapshot = state.baseSentence;
    state.currentSentenceHTML = "";
    state.appliedActions = new Set();
    state.step = 0;
    state.activeBlankId = null;
    state.verb = model.verb;
    state.hasWhy = false;
    state.hasDetail = false;
    state.blankValues = { why1: "", detailAdj: "" };
    state.blankCompletePulse = { why1: false, detailAdj: false };
    state.previousLevel = 1;
    state.previousClauseCount = 0;
    if (completeActionsEl) completeActionsEl.classList.add("hidden");
    hideVerbMenu();
    render();
  }

  function loadNextSentence() {
    sentenceIndex = (sentenceIndex + 1) % sentenceBank.length;
    resetProgressForSameSentence();
  }

  actionButtons.forEach(function (button) {
    button.addEventListener("click", function () {
      applyAction(button.getAttribute("data-action"), button);
    });
  });

  if (verbMenuEl) {
    verbMenuEl.addEventListener("click", function (event) {
      var btn = event.target.closest("[data-verb-choice]");
      if (!btn) return;
      var choice = String(btn.getAttribute("data-verb-choice") || "").trim().toLowerCase();
      if (!choice) return;
      state.verb = choice;
      state.appliedActions.add("verb");
      state.step = clamp(state.step + 1, 0, state.maxActions);
      hideVerbMenu();
      debugLog("verb:choose:" + choice);
      render();
    });
  }

  document.addEventListener("click", function (event) {
    if (!verbMenuEl || verbMenuEl.classList.contains("hidden")) return;
    if (verbMenuEl.contains(event.target)) return;
    if (event.target.closest('[data-action="verb"]')) return;
    hideVerbMenu();
  });

  sentenceEl.addEventListener("input", function (event) {
    var blankEl = event.target && event.target.closest(".ss-blank");
    if (!blankEl) return;
    var blankId = blankEl.getAttribute("data-blank-id");
    if (!blankId) return;

    if (blankId === "why1" && blankEl.classList.contains("placeholder")) {
      var raw = sanitizeText(blankEl.textContent);
      blankEl.textContent = raw === "your reason" ? "" : raw;
      blankEl.classList.remove("placeholder");
      setCaretToEnd(blankEl);
    }

    var value = sanitizeText(blankEl.textContent);
    var prior = sanitizeText(state.blankValues[blankId]);
    if (blankId === "why1" && !value) {
      normalizeWhySlotPlaceholder(blankEl);
      value = "";
    }
    state.blankValues[blankId] = value;
    blankEl.classList.remove("is-invalid");

    if (!prior && value) {
      state.blankCompletePulse[blankId] = true;
      blankEl.classList.add("scaffold-complete");
      window.setTimeout(function () {
        blankEl.classList.remove("scaffold");
        blankEl.classList.remove("scaffold-complete");
      }, 220);
    }

    updateProgressAndTraits();
    window.__SS_DEBUG = { state: state };
  });

  sentenceEl.addEventListener("beforeinput", function (event) {
    var slotEl = event.target && event.target.closest && event.target.closest("#ss-why");
    if (!slotEl) return;
    var type = String(event.inputType || "");
    var isTextInsert = type === "insertText" || type === "insertCompositionText";
    if (!slotEl.classList.contains("placeholder") || !isTextInsert) return;
    event.preventDefault();
    slotEl.classList.remove("placeholder");
    slotEl.textContent = String(event.data || "");
    state.blankValues.why1 = sanitizeText(slotEl.textContent);
    setCaretToEnd(slotEl);
    updateProgressAndTraits();
  });

  sentenceEl.addEventListener("paste", function (event) {
    var slotEl = event.target && event.target.closest && event.target.closest("#ss-why");
    if (!slotEl) return;
    var pasted = "";
    try {
      pasted = (event.clipboardData && event.clipboardData.getData("text")) || "";
    } catch (_e) {
      pasted = "";
    }
    if (!slotEl.classList.contains("placeholder")) return;
    event.preventDefault();
    slotEl.classList.remove("placeholder");
    slotEl.textContent = sanitizeText(pasted);
    state.blankValues.why1 = sanitizeText(slotEl.textContent);
    setCaretToEnd(slotEl);
    updateProgressAndTraits();
  });

  sentenceEl.addEventListener("blur", function (event) {
    var slotEl = event.target && event.target.closest && event.target.closest("#ss-why");
    if (!slotEl) return;
    normalizeWhySlotPlaceholder(slotEl);
    updateProgressAndTraits();
  }, true);

  if (doneBtn) doneBtn.addEventListener("click", handleDone);
  if (tryAnotherBtn) tryAnotherBtn.addEventListener("click", resetProgressForSameSentence);
  if (nextSentenceBtn) nextSentenceBtn.addEventListener("click", loadNextSentence);
  if (exitStudioBtn) {
    exitStudioBtn.addEventListener("click", function () {
      window.location.href = "writing-studio.html";
    });
  }

  if (teacherToggleBtn) {
    teacherToggleBtn.addEventListener("click", function () {
      var on = teacherToggleBtn.getAttribute("aria-pressed") !== "true";
      teacherToggleBtn.setAttribute("aria-pressed", on ? "true" : "false");
      document.body.classList.toggle("teacher-mode", on);
    });
  }

  if (DEBUG_ON && devLabelEl) devLabelEl.classList.remove("hidden");
  resetProgressForSameSentence();
})();
