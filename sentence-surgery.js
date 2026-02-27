(function sentenceSurgeryInit() {
  "use strict";

  var sentenceEl = document.getElementById("ssSentence");
  var meterBarEl = document.getElementById("ssMeterBar");
  var levelEl = document.getElementById("ssLevel");
  var coachEl = document.getElementById("ssCoachBubble");
  var teacherToggleBtn = document.getElementById("ssTeacherToggle");
  var verbMenuEl = document.getElementById("ssVerbMenu");
  var doneBtn = document.getElementById("ssDoneBtn");
  var tryAnotherBtn = document.getElementById("ssTryAnotherBtn");
  var chaosToggleBtn = document.getElementById("ssChaosToggleBtn");
  var chaosPanelEl = document.getElementById("ssChaosPanel");
  var chaosSentenceEl = document.getElementById("ssChaosSentence");
  var chaosResultEl = document.getElementById("ssChaosResult");
  var dashboardEl = document.getElementById("ssDashboard");
  var dashboardStatsEl = document.getElementById("ssDashboardStats");
  var dashboardLessonEl = document.getElementById("ssDashboardLesson");
  var wordCountEl = document.getElementById("ssWordCount");
  var typeEl = document.getElementById("ssType");
  var focusEl = document.getElementById("ssFocus");
  var skillTagEl = document.getElementById("ssSkillTag");
  var groupingEl = document.getElementById("ssGrouping");
  var breakdownBodyEl = document.getElementById("ssBreakdownBody");
  var compareEl = document.getElementById("ssCompare");
  var compareBeforeEl = document.getElementById("ssCompareBefore");
  var compareAfterEl = document.getElementById("ssCompareAfter");

  if (!sentenceEl || !meterBarEl || !levelEl || !window.SentenceEngine || !window.SSAIAnalysis || !window.SSTeacherLens) return;

  var actionButtons = Array.prototype.slice.call(document.querySelectorAll("[data-action]"));
  var chaosActionButtons = Array.prototype.slice.call(document.querySelectorAll("[data-chaos-action]"));

  var traitEls = {
    clarity: { fill: document.getElementById("ssTraitClarity"), value: document.getElementById("ssTraitClarityValue") },
    detail: { fill: document.getElementById("ssTraitDetail"), value: document.getElementById("ssTraitDetailValue") },
    reasoning: { fill: document.getElementById("ssTraitReasoning"), value: document.getElementById("ssTraitReasoningValue") },
    control: { fill: document.getElementById("ssTraitControl"), value: document.getElementById("ssTraitControlValue") }
  };

  var engine = window.SentenceEngine.create({
    sentenceBank: [
      { subject: "The", noun: "dog", verb: "ran", trail: "across the yard" },
      { subject: "The", noun: "reader", verb: "looked", trail: "at the clue" },
      { subject: "The", noun: "student", verb: "wrote", trail: "during workshop" }
    ],
    verbOptions: ["sprinted", "dashed", "raced", "bolted", "hurried"]
  });

  var chaosGame = window.SSFixChaos ? window.SSFixChaos.create() : null;
  var demo = null;

  var sentenceLogs = [];
  var analyses = [];
  var activeAnalysisToken = 0;
  var AI_ENDPOINT = "";
  var COACH_ENDPOINT = "";
  var demoLocked = false;

  function sanitize(text) {
    return String(text || "").replace(/[\n\r]+/g, " ").replace(/\s+/g, " ").trim();
  }

  function setCoachText(text) {
    if (!coachEl) return;
    var line = sanitize(text);
    if (!line) {
      coachEl.classList.add("hidden");
      coachEl.textContent = "";
      return;
    }
    coachEl.textContent = line;
    coachEl.classList.remove("hidden");
  }

  function focusSlot(slotId, replaceAll) {
    requestAnimationFrame(function () {
      var slotEl = sentenceEl.querySelector('[data-slot-id="' + slotId + '"]');
      if (!slotEl) return;
      slotEl.focus();
      slotEl.classList.add("active");
      if (replaceAll) {
        var range = document.createRange();
        range.selectNodeContents(slotEl);
        var sel = window.getSelection && window.getSelection();
        if (sel) {
          sel.removeAllRanges();
          sel.addRange(range);
        }
      }
    });
  }

  function positionVerbMenu(anchor) {
    if (!verbMenuEl || !anchor) return;
    var bounds = anchor.closest(".ss-actions").getBoundingClientRect();
    var rect = anchor.getBoundingClientRect();
    verbMenuEl.style.left = String((rect.left + rect.width * 0.5) - bounds.left) + "px";
  }

  function showVerbMenu(anchor) {
    if (!verbMenuEl) return;
    verbMenuEl.innerHTML = engine.verbOptions.map(function (verb) {
      return '<button type="button" class="ss-action-btn" data-verb-choice="' + verb + '">' + verb + "</button>";
    }).join("");
    positionVerbMenu(anchor);
    verbMenuEl.classList.remove("hidden");
  }

  function hideVerbMenu() {
    if (!verbMenuEl) return;
    verbMenuEl.classList.add("hidden");
    verbMenuEl.innerHTML = "";
  }

  function showCompare(beforeText, afterText) {
    if (!compareEl || !compareBeforeEl || !compareAfterEl) return;
    compareBeforeEl.textContent = beforeText;
    compareAfterEl.textContent = afterText;
    compareEl.classList.add("show");
    window.setTimeout(function () { compareEl.classList.remove("show"); }, 2000);
  }

  function renderTraits(metrics) {
    ["clarity", "detail", "reasoning", "control"].forEach(function (k) {
      var value = Math.max(0, Math.min(5, Number(metrics[k] || 0)));
      var row = traitEls[k];
      if (!row) return;
      if (row.fill) row.fill.style.width = String(value * 20) + "%";
      if (row.value) row.value.textContent = String(value);
    });
  }

  function updateDashboard() {
    if (sentenceLogs.length < 5 || !dashboardEl || !dashboardStatsEl || !dashboardLessonEl) {
      if (dashboardEl) dashboardEl.classList.add("hidden");
      return;
    }
    var snap = window.SSTeacherLens.buildSnapshot(sentenceLogs, analyses);
    dashboardStatsEl.textContent = "Simple: " + snap.simplePct + "% • Complex: " + snap.complexPct + "% • Reasoning: " + snap.reasoningPct + "% • Strong verbs: " + snap.strongVerbPct + "%";
    dashboardLessonEl.textContent = snap.lesson;
    dashboardEl.classList.remove("hidden");
  }

  async function analyzeAndRender(sentenceText) {
    var token = ++activeAnalysisToken;
    var ai = await window.SSAIAnalysis.analyzeSentence(sentenceText, { endpoint: AI_ENDPOINT });
    if (token !== activeAnalysisToken) return;
    var lens = window.SSTeacherLens.derive(ai, sentenceText);
    var level = lens.level;

    if (wordCountEl) wordCountEl.textContent = "Words: " + ai.word_count;
    if (typeEl) typeEl.textContent = "Type: " + ai.sentence_type;
    if (focusEl) focusEl.textContent = "Focus: " + ai.suggested_focus;
    if (skillTagEl) skillTagEl.textContent = lens.skillTag;
    if (groupingEl) groupingEl.textContent = lens.grouping;
    if (breakdownBodyEl) {
      breakdownBodyEl.textContent = "Words: " + ai.word_count + " • Clauses: " + lens.clauses + " • Adjectives: " + lens.adjectives + " • Strong Verb: " + (lens.strongVerb ? "Yes" : "No");
    }

    renderTraits(lens.metrics);
    levelEl.textContent = "Level " + level + " • Step " + engine.state.step + "/" + engine.state.maxActions;

    var coach = await window.SSAIAnalysis.microCoach(sentenceText, ai.suggested_focus, { coachEndpoint: COACH_ENDPOINT });
    if (token !== activeAnalysisToken) return;
    setCoachText(coach);
  }

  function render() {
    var model = engine.getRenderModel();
    sentenceEl.innerHTML = model.html;
    meterBarEl.style.width = String(model.progress) + "%";
    levelEl.textContent = "Level 1 • Step " + model.step + "/" + model.maxActions;

    if (model.activeSlotId) {
      focusSlot(model.activeSlotId, true);
    }
    Array.prototype.slice.call(sentenceEl.querySelectorAll(".ss-slot")).forEach(function (slotEl) {
      var raw = sanitize(slotEl.textContent || "");
      var width = Math.max(90, Math.min(280, (raw.length + 4) * 11));
      slotEl.style.minWidth = String(width) + "px";
    });

    var sentenceText = engine.getSentenceText();
    void analyzeAndRender(sentenceText);
    window.__SS_DEBUG = {
      snapshot: engine.getSnapshot(),
      sentenceCount: sentenceLogs.length,
      analysesCount: analyses.length
    };
  }

  function fillSlot(slotId, value) {
    engine.setSlotValue(slotId, value);
    render();
  }

  function chooseVerb(value) {
    engine.chooseVerb(value);
    hideVerbMenu();
    render();
  }

  function toggleTeacherLens(forceOn) {
    var next = typeof forceOn === "boolean"
      ? forceOn
      : teacherToggleBtn.getAttribute("aria-pressed") !== "true";
    teacherToggleBtn.setAttribute("aria-pressed", next ? "true" : "false");
    document.body.classList.toggle("teacher-mode", next);
  }

  function finishSentence() {
    var before = sanitize(engine.state.model.subject + " " + engine.state.model.noun + " " + engine.state.model.verb + " " + engine.state.model.trail + ".");
    var snap = engine.finalizeSentence();
    sentenceLogs.push(snap.sentence);
    analyses.push(window.SSAIAnalysis.analyzeSentenceHeuristic(snap.sentence));
    showCompare(before, snap.sentence);
    updateDashboard();
  }

  function resetSentence() {
    engine.nextSentence();
    render();
  }

  function setDemoActive(on) {
    demoLocked = !!on;
    actionButtons.forEach(function (btn) { btn.disabled = demoLocked; });
  }

  function applyAction(action) {
    if (demoLocked) return;
    if (action === "verb") {
      engine.applyAction(action);
      var sourceBtn = document.querySelector('[data-action="verb"]');
      showVerbMenu(sourceBtn);
      render();
      return;
    }
    engine.applyAction(action);
    hideVerbMenu();
    render();
  }

  function handleSlotBeforeInput(event) {
    var target = event.target && event.target.closest && event.target.closest(".ss-slot");
    if (!target) return;
    var slotId = String(target.getAttribute("data-slot-id") || "").trim();
    if (!slotId) return;

    var placeholder = target.classList.contains("placeholder") ? target.textContent : "";
    if (placeholder && event.inputType && (event.inputType === "insertText" || event.inputType === "insertCompositionText")) {
      event.preventDefault();
      target.textContent = String(event.data || "");
      target.classList.remove("placeholder");
      engine.setSlotValue(slotId, target.textContent || "");
      render();
      return;
    }
  }

  function handleSlotInput(event) {
    var target = event.target && event.target.closest && event.target.closest(".ss-slot");
    if (!target) return;
    var slotId = String(target.getAttribute("data-slot-id") || "").trim();
    if (!slotId) return;
    engine.setSlotValue(slotId, target.textContent || "");
    if (!sanitize(engine.state.slots[slotId].value)) {
      target.classList.add("placeholder");
      target.textContent = engine.state.slots[slotId].placeholder;
      focusSlot(slotId, true);
      return;
    }
    render();
  }

  function handleKeyDown(event) {
    if (event.key !== "Enter") return;
    event.preventDefault();
    var target = event.target && event.target.closest && event.target.closest(".ss-slot");
    if (!target) return;
    target.blur();
    render();
  }

  function startChaosRound() {
    if (!chaosGame || !chaosSentenceEl) return;
    var analysis = analyses.length ? analyses[analyses.length - 1] : window.SSAIAnalysis.analyzeSentenceHeuristic(engine.getSentenceText());
    var round = chaosGame.nextRound(engine.getSentenceText(), analysis);
    chaosSentenceEl.textContent = round.sentence;
    if (chaosResultEl) chaosResultEl.textContent = "Level " + round.level + " • Error: " + round.type.replace(/_/g, " ");
  }

  if (sentenceEl) {
    sentenceEl.addEventListener("beforeinput", handleSlotBeforeInput);
    sentenceEl.addEventListener("input", handleSlotInput);
    sentenceEl.addEventListener("keydown", handleKeyDown);
    sentenceEl.addEventListener("paste", function (event) {
      var target = event.target && event.target.closest && event.target.closest(".ss-slot");
      if (!target) return;
      event.preventDefault();
      var pasted = "";
      try {
        pasted = (event.clipboardData && event.clipboardData.getData("text")) || "";
      } catch (_e) {
        pasted = "";
      }
      target.textContent = sanitize(pasted);
      target.classList.remove("placeholder");
      var slotId = String(target.getAttribute("data-slot-id") || "").trim();
      if (slotId) engine.setSlotValue(slotId, target.textContent);
      render();
    });
  }

  actionButtons.forEach(function (btn) {
    btn.addEventListener("click", function () {
      applyAction(btn.getAttribute("data-action"));
    });
  });

  if (teacherToggleBtn) {
    teacherToggleBtn.addEventListener("click", function () {
      toggleTeacherLens();
    });
  }

  if (verbMenuEl) {
    verbMenuEl.addEventListener("click", function (event) {
      var btn = event.target.closest("[data-verb-choice]");
      if (!btn) return;
      chooseVerb(btn.getAttribute("data-verb-choice"));
    });
  }

  document.addEventListener("click", function (event) {
    if (!verbMenuEl || verbMenuEl.classList.contains("hidden")) return;
    if (verbMenuEl.contains(event.target)) return;
    if (event.target.closest('[data-action="verb"]')) return;
    hideVerbMenu();
  });

  if (doneBtn) doneBtn.addEventListener("click", finishSentence);
  if (tryAnotherBtn) tryAnotherBtn.addEventListener("click", resetSentence);

  if (chaosToggleBtn && chaosPanelEl) {
    chaosToggleBtn.addEventListener("click", function () {
      chaosPanelEl.classList.toggle("hidden");
      if (!chaosPanelEl.classList.contains("hidden")) startChaosRound();
    });
  }

  chaosActionButtons.forEach(function (btn) {
    btn.addEventListener("click", function () {
      if (!chaosGame || !chaosResultEl) return;
      var result = chaosGame.submit(btn.getAttribute("data-chaos-action"));
      chaosResultEl.textContent = result.message;
      window.setTimeout(startChaosRound, 700);
    });
  });

  var api = {
    setCoachText: setCoachText,
    applyAction: function (action) { engine.applyAction(action); render(); },
    fillSlot: fillSlot,
    chooseVerb: chooseVerb,
    toggleTeacherLens: toggleTeacherLens,
    finishSentence: finishSentence,
    resetSentence: resetSentence,
    setDemoActive: setDemoActive
  };

  if (window.SSDemoMode && window.SSDemoMode.isDemoMode()) {
    demo = window.SSDemoMode.create(api);
    demo.start();
  }

  render();
})();
