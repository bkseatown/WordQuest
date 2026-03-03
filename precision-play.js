(function () {
  "use strict";

  var ENGAGEMENT_KEY = "cs.wordConnections.engagement.v1";
  var EXPRESSIONS = ["SPEAK", "ACT", "DRAW"];
  var MODE_DEFAULTS = {
    FUN: { energy: "low", timerMin: 60, timerMax: 90, strictScoring: false },
    TARGETED: { energy: "medium", timerMin: 45, timerMax: 60, strictScoring: true },
    INTERVENTION: { energy: "medium", timerMin: 0, timerMax: 45, strictScoring: true }
  };

  var setupEl = document.getElementById("pp-setup");
  var gameEl = document.getElementById("pp-game");
  var summaryEl = document.getElementById("pp-summary");
  var startBtn = document.getElementById("pp-start");
  var gradeBandEl = document.getElementById("pp-grade-band");
  var energyEl = document.getElementById("pp-energy");
  var challengeEl = document.getElementById("pp-challenge");
  var expressionModeEl = document.getElementById("pp-expression-mode");
  var lockExpressionEl = document.getElementById("pp-expression-lock");
  var advancedLinkEl = document.getElementById("pp-advanced-link");
  var advancedPanelEl = document.getElementById("pp-advanced");
  var revealTimingEl = document.getElementById("pp-reveal-timing");

  var teacherToggleEl = document.getElementById("pp-teacher-toggle");
  var teacherPanelEl = document.getElementById("pp-teacher-panel");
  var teacherModeEl = document.getElementById("pp-mode-select");
  var teacherSkillNodeEl = document.getElementById("pp-skill-node");
  var lockSkillNodeEl = document.getElementById("pp-lock-skill-node");
  var timerEnabledEl = document.getElementById("pp-timer-enabled");
  var addCustomBtn = document.getElementById("pp-add-custom");
  var customWordEl = document.getElementById("pp-teacher-word");
  var customForbiddenEl = document.getElementById("pp-teacher-forbidden");
  var uploadListEl = document.getElementById("pp-upload-list");
  var shuffleLessonBtn = document.getElementById("pp-shuffle-lesson");

  var targetEl = document.getElementById("pp-target-word");
  var forbiddenEl = document.getElementById("pp-forbidden-list");
  var requiredRowEl = document.getElementById("pp-required-row");
  var requiredTextEl = document.getElementById("pp-required-text");
  var requiredOkRowEl = document.getElementById("pp-required-ok-row");
  var requiredOkEl = document.getElementById("pp-required-ok");
  var cueEl = document.getElementById("pp-expression-cue");
  var cueNoteEl = document.getElementById("pp-expression-note");
  var timerEl = document.getElementById("pp-timer");
  var scoreEl = document.getElementById("pp-score");
  var roundEl = document.getElementById("pp-round");
  var modeEl = document.getElementById("pp-mode");
  var practiceTypeEl = document.getElementById("pp-practice-type");
  var guessedBtn = document.getElementById("pp-guessed");
  var skipBtn = document.getElementById("pp-skip");
  var nextBtn = document.getElementById("pp-next");
  var endBtn = document.getElementById("pp-end");
  var statusEl = document.getElementById("pp-status");
  var alignmentBadgeEl = document.getElementById("pp-alignment-badge");
  var instructionalFocusEl = document.getElementById("pp-instructional-focus");
  var summaryTextEl = document.getElementById("pp-summary-text");
  var summarySuggestedEl = document.getElementById("pp-summary-suggested");
  var summaryNextEl = document.getElementById("pp-summary-next");

  var state = {
    cards: [],
    deck: [],
    round: 0,
    successfulRounds: 0,
    attempts: 0,
    score: 0,
    index: -1,
    card: null,
    expressionIndex: 0,
    expression: "MIXED",
    timerSec: 0,
    timerId: 0,
    startedAtMs: 0,
    canAdvance: false,
    config: null,
    engagement: []
  };

  function getParam(name, fallback) {
    try {
      var params = new URLSearchParams(window.location.search || "");
      var value = String(params.get(name) || "").trim();
      return value || String(fallback || "");
    } catch (_e) {
      return String(fallback || "");
    }
  }

  function normalizeGradeBand(value) {
    var v = String(value || "").toUpperCase();
    if (v === "K-2" || v === "3-5" || v === "6-8" || v === "9-12") return v;
    if (v.indexOf("K") >= 0 || v.indexOf("2") >= 0) return "K-2";
    if (v.indexOf("3") >= 0 || v.indexOf("5") >= 0) return "3-5";
    if (v.indexOf("6") >= 0 || v.indexOf("8") >= 0) return "6-8";
    return "9-12";
  }

  function normalizeMode(value) {
    var m = String(value || "").toUpperCase();
    if (m === "TARGETED" || m === "INTERVENTION") return m;
    return "FUN";
  }

  function deriveModeFromChallenge() {
    return normalizeMode(challengeEl && challengeEl.value || "TARGETED");
  }

  function mapSkillName(skillNode) {
    var node = String(skillNode || "").toUpperCase();
    if (node.indexOf("MOR") >= 0) return "Morphology";
    if (node.indexOf("VOC") >= 0) return "Vocabulary Depth";
    if (node.indexOf("LANG") >= 0) return "Academic Language";
    if (node.indexOf("REL") >= 0 || node.indexOf("SEM") >= 0) return "Word Relationships";
    return "Literacy Focus";
  }

  function getStudentId() {
    return getParam("student", "");
  }

  function readEngagement() {
    try {
      var raw = localStorage.getItem(ENGAGEMENT_KEY);
      var parsed = raw ? JSON.parse(raw) : [];
      return Array.isArray(parsed) ? parsed : [];
    } catch (_e) {
      return [];
    }
  }

  function writeEngagement(items) {
    try {
      localStorage.setItem(ENGAGEMENT_KEY, JSON.stringify(items));
    } catch (_e) {}
  }

  function shuffle(list) {
    var next = list.slice();
    for (var i = next.length - 1; i > 0; i -= 1) {
      var j = Math.floor(Math.random() * (i + 1));
      var tmp = next[i];
      next[i] = next[j];
      next[j] = tmp;
    }
    return next;
  }

  function expressionForRound(mode, lock) {
    if (lock) return String(mode || "MIXED").toUpperCase();
    if (String(mode || "").toLowerCase() !== "mixed") return String(mode || "SPEAK").toUpperCase();
    var pick = EXPRESSIONS[state.expressionIndex % EXPRESSIONS.length];
    state.expressionIndex += 1;
    return pick;
  }

  function ensureAdvancedVisibility() {
    var isIntervention = deriveModeFromChallenge() === "INTERVENTION";
    advancedLinkEl.classList.toggle("pp-hidden", !isIntervention);
    if (!isIntervention) advancedPanelEl.hidden = true;
  }

  function parseUploadedWordList(raw, fallbackGrade, fallbackSkill) {
    var text = String(raw || "").trim();
    if (!text) return [];
    try {
      var parsed = JSON.parse(text);
      var rows = Array.isArray(parsed) ? parsed : (parsed && Array.isArray(parsed.cards) ? parsed.cards : []);
      return rows.map(function (row, idx) {
        return {
          id: String(row.id || ("uploaded-" + Date.now() + "-" + idx)),
          gradeBand: normalizeGradeBand(row.gradeBand || fallbackGrade),
          domain: "Literacy",
          target: String(row.target || row.targetWord || "").trim(),
          forbidden: Array.isArray(row.forbidden)
            ? row.forbidden.map(function (w) { return String(w || "").trim(); }).filter(Boolean)
            : String(row.forbidden || "").split(",").map(function (w) { return w.trim(); }).filter(Boolean),
          requiredMove: String(row.requiredMove || "Use one sentence frame tied to the target word.").trim(),
          skillTag: String(row.skillTag || fallbackSkill || "LIT.VOC.ACAD")
        };
      }).filter(function (row) { return row.target && row.forbidden.length; });
    } catch (_e) {
      return text.split(/\r?\n/).map(function (line, idx) {
        var parts = String(line || "").split(",").map(function (p) { return p.trim(); });
        if (parts.length < 2) return null;
        return {
          id: "uploaded-csv-" + Date.now() + "-" + idx,
          gradeBand: normalizeGradeBand(fallbackGrade),
          domain: "Literacy",
          target: parts[0],
          forbidden: parts.slice(1, 5),
          requiredMove: "Use one sentence frame tied to the target word.",
          skillTag: String(fallbackSkill || "LIT.VOC.ACAD")
        };
      }).filter(Boolean);
    }
  }

  function buildDeck() {
    var gradeBand = normalizeGradeBand(gradeBandEl.value);
    var mode = deriveModeFromChallenge();
    var lockedSkill = !!(lockSkillNodeEl && lockSkillNodeEl.checked);
    var skillNode = String(teacherSkillNodeEl && teacherSkillNodeEl.value || state.config && state.config.skillNode || "LIT.VOC.ACAD");

    var rows = state.cards.filter(function (card) {
      if (!card || String(card.domain || "").toLowerCase().indexOf("literacy") < 0) return false;
      if (normalizeGradeBand(card.gradeBand) !== gradeBand) return false;
      if (lockedSkill && String(card.skillTag || "").toLowerCase().indexOf(skillNode.toLowerCase()) < 0) return false;
      if (mode === "INTERVENTION" && String(card.skillTag || "").toLowerCase().indexOf(skillNode.toLowerCase()) < 0) return false;
      return true;
    });

    if (!rows.length) {
      rows = state.cards.filter(function (card) {
        return card && normalizeGradeBand(card.gradeBand) === gradeBand;
      });
    }
    state.deck = shuffle(rows);
    state.index = -1;
  }

  function updateScoreboard() {
    var mode = deriveModeFromChallenge();
    scoreEl.textContent = mode === "FUN" ? String(state.successfulRounds) : String(state.score);
    roundEl.textContent = String(state.round + 1);
    modeEl.textContent = mode;
    if (practiceTypeEl) practiceTypeEl.textContent = "Word Connections";
  }

  function setStatus(text) {
    statusEl.textContent = text;
  }

  function getNextCard() {
    if (!state.deck.length) buildDeck();
    state.index += 1;
    if (state.index >= state.deck.length) {
      state.deck = shuffle(state.deck);
      state.index = 0;
    }
    return state.deck[state.index] || null;
  }

  function startTimer(seconds) {
    clearInterval(state.timerId);
    state.timerSec = Math.max(0, Number(seconds || 0));
    timerEl.textContent = state.timerSec > 0 ? (state.timerSec + "s") : "Off";
    state.startedAtMs = Date.now();
    if (state.timerSec <= 0 || !(timerEnabledEl && timerEnabledEl.checked)) return;
    state.timerId = setInterval(function () {
      state.timerSec -= 1;
      timerEl.textContent = Math.max(0, state.timerSec) + "s";
      if (state.timerSec <= 0) {
        clearInterval(state.timerId);
        state.timerId = 0;
        finishRound(false);
      }
    }, 1000);
  }

  function scoreRound(success, requiredMet, elapsedSec) {
    var mode = deriveModeFromChallenge();
    if (!success) return 0;
    if (mode === "FUN") return 0;
    if (mode === "TARGETED") {
      if (!requiredMet) return 1;
      return elapsedSec <= 20 ? 3 : 2;
    }
    if (!requiredMet) return 1;
    return 2;
  }

  function logEngagement(success, elapsedSec) {
    var mode = deriveModeFromChallenge();
    state.engagement.push({
      ts: new Date().toISOString(),
      studentId: getStudentId(),
      attempts: 1,
      successfulRounds: success ? 1 : 0,
      timeToCompletionSec: Number(elapsedSec || 0),
      modeUsed: mode
    });
    writeEngagement(state.engagement.slice(-500));
  }

  function modeForEngine() {
    return deriveModeFromChallenge();
  }

  function currentTier() {
    return getParam("tier", "Tier 2");
  }

  function buildRoundFromCard(card) {
    var engine = window.CSWordConnectionsEngine;
    var skillNode = String((teacherSkillNodeEl && teacherSkillNodeEl.value) || (card && card.skillTag) || getParam("skill", "LIT.VOC.ACAD"));
    var mode = modeForEngine();
    var payload = {
      skillNode: skillNode,
      gradeBand: normalizeGradeBand(gradeBandEl.value),
      tierLevel: currentTier(),
      mode: mode,
      selectedCard: {
        targetWord: card && card.target,
        target: card && card.target,
        forbidden: card && card.forbidden,
        scaffolds: card && card.scaffolds,
        requiredMove: card && card.requiredMove,
        skillTag: card && card.skillTag
      }
    };
    return engine && typeof engine.generateWordConnectionsRound === "function"
      ? engine.generateWordConnectionsRound(payload)
      : {
          targetWord: card && card.target || "target",
          forbiddenWords: card && card.forbidden || [],
          scaffolds: ["Use a complete sentence."],
          difficultyLevel: mode,
          timerSeconds: mode === "FUN" ? 75 : (mode === "TARGETED" ? 55 : 45),
          instructionalFocus: "Vocabulary and word relationships"
        };
  }

  function renderRound(round, card) {
    state.card = card;
    targetEl.textContent = round.targetWord;
    targetEl.classList.remove("pp-reveal");
    void targetEl.offsetWidth;
    targetEl.classList.add("pp-reveal");

    forbiddenEl.innerHTML = (round.forbiddenWords || []).map(function (w) {
      return '<span class="pp-pill">' + escapeHtml(w) + "</span>";
    }).join("");

    requiredRowEl.classList.toggle("pp-hidden", modeForEngine() === "FUN");
    requiredOkRowEl.classList.toggle("pp-hidden", modeForEngine() === "FUN");
    requiredTextEl.textContent = String(card && card.requiredMove || round.scaffolds && round.scaffolds[0] || "Use one complete sentence frame.");
    requiredOkEl.checked = false;

    if (instructionalFocusEl) {
      instructionalFocusEl.textContent = "Instructional focus: " + String(round.instructionalFocus || "Vocabulary and language connections");
    }

    if (alignmentBadgeEl) {
      alignmentBadgeEl.textContent = "Aligned to Literacy Focus: " + mapSkillName(teacherSkillNodeEl && teacherSkillNodeEl.value || card && card.skillTag || "LIT.VOC.ACAD");
    }

    var expression = expressionForRound(expressionModeEl.value, !!(lockExpressionEl && lockExpressionEl.checked));
    state.expression = expression;
    cueEl.textContent = expression;
    cueEl.className = "pp-cue " + expression.toLowerCase();
    cueNoteEl.textContent = modeForEngine() === "FUN"
      ? "Team play is allowed in FUN mode."
      : "Use the instructional scaffold and avoid forbidden words.";

    var timerSeconds = timerEnabledEl && timerEnabledEl.checked ? Number(round.timerSeconds || 0) : 0;
    startTimer(timerSeconds);
    state.canAdvance = true;
    setStatus("Round live. Keep explanations aligned to literacy focus.");
  }

  function finishRound(success) {
    if (!state.canAdvance) return;
    state.canAdvance = false;
    clearInterval(state.timerId);
    state.timerId = 0;

    var elapsedSec = Math.max(1, Math.round((Date.now() - state.startedAtMs) / 1000));
    var requiredMet = !!requiredOkEl.checked || modeForEngine() === "FUN";
    var gained = scoreRound(success, requiredMet, elapsedSec);

    state.attempts += 1;
    if (success) state.successfulRounds += 1;
    state.score += gained;
    logEngagement(success, elapsedSec);
    updateScoreboard();

    if (!summaryEl.classList.contains("pp-hidden")) summaryEl.classList.add("pp-hidden");

    if (success && requiredMet) {
      setStatus("Round complete. Ready for next round.");
    } else if (success && !requiredMet) {
      setStatus("Correct response, but scaffold requirement not yet met.");
    } else {
      setStatus("Round ended. Try another focused attempt.");
    }

    summaryTextEl.textContent =
      "Attempts: " + state.attempts +
      " | Successful rounds: " + state.successfulRounds +
      " | Time this round: " + elapsedSec + "s" +
      " | Mode used: " + modeForEngine();
    summarySuggestedEl.textContent = modeForEngine() === "FUN"
      ? "Suggested next round: TARGETED mode for academic language transfer."
      : (modeForEngine() === "TARGETED"
        ? "Suggested next round: INTERVENTION mode with locked skill node."
        : "Suggested next round: TARGETED mode to generalize the skill.");
    summaryEl.classList.remove("pp-hidden");
  }

  function nextRound() {
    clearInterval(state.timerId);
    state.timerId = 0;
    state.round += 1;
    if (!summaryEl.classList.contains("pp-hidden")) summaryEl.classList.add("pp-hidden");
    updateScoreboard();

    var card = getNextCard();
    if (!card) {
      setStatus("No cards available for this grade band and skill focus.");
      return;
    }
    var round = buildRoundFromCard(card);
    renderRound(round, card);
  }

  function endSession() {
    clearInterval(state.timerId);
    state.timerId = 0;
    gameEl.classList.add("pp-hidden");
    setupEl.classList.remove("pp-hidden");
    summaryEl.classList.remove("pp-hidden");
    summaryTextEl.textContent = "Session complete. Attempts: " + state.attempts + " | Successful rounds: " + state.successfulRounds + " | Mode used: " + modeForEngine();
    summarySuggestedEl.textContent = "Suggested next round: Continue in " + modeForEngine() + " or return to the literacy dashboard.";
    setStatus("Session ended.");
  }

  function startSession() {
    state.config = {
      gradeBand: normalizeGradeBand(gradeBandEl.value),
      mode: modeForEngine(),
      skillNode: String(teacherSkillNodeEl && teacherSkillNodeEl.value || getParam("skill", "LIT.VOC.ACAD")),
      tierLevel: currentTier()
    };

    state.round = 0;
    state.score = 0;
    state.attempts = 0;
    state.successfulRounds = 0;
    state.expressionIndex = 0;
    state.index = -1;
    state.engagement = readEngagement();

    buildDeck();
    setupEl.classList.add("pp-hidden");
    summaryEl.classList.add("pp-hidden");
    gameEl.classList.remove("pp-hidden");
    nextRound();
  }

  function addCustomWord() {
    var target = String(customWordEl && customWordEl.value || "").trim();
    var forbidden = String(customForbiddenEl && customForbiddenEl.value || "")
      .split(",")
      .map(function (w) { return w.trim(); })
      .filter(Boolean);
    if (!target || forbidden.length < 2) {
      setStatus("Add custom word requires a target and at least two forbidden words.");
      return;
    }
    state.cards.unshift({
      id: "custom-" + Date.now(),
      gradeBand: normalizeGradeBand(gradeBandEl.value),
      domain: "Literacy",
      target: target,
      forbidden: forbidden,
      requiredMove: "Use one sentence frame tied to literacy focus.",
      skillTag: String(teacherSkillNodeEl && teacherSkillNodeEl.value || "LIT.VOC.ACAD")
    });
    customWordEl.value = "";
    customForbiddenEl.value = "";
    buildDeck();
    setStatus("Custom word added to current lesson set.");
  }

  function handleUpload(file) {
    if (!file) return;
    var reader = new FileReader();
    reader.onload = function () {
      var rows = parseUploadedWordList(reader.result, gradeBandEl.value, teacherSkillNodeEl && teacherSkillNodeEl.value);
      if (!rows.length) {
        setStatus("No valid words found in uploaded file.");
        return;
      }
      state.cards = rows.concat(state.cards);
      buildDeck();
      setStatus("Uploaded " + rows.length + " words into the lesson set.");
    };
    reader.readAsText(file);
  }

  function escapeHtml(value) {
    return String(value || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/\"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  function loadCards() {
    return fetch("./precision-play.cards.json", { cache: "no-cache" })
      .then(function (r) {
        if (!r.ok) throw new Error("Card load failed (" + r.status + ")");
        return r.json();
      })
      .then(function (payload) {
        var cards = payload && Array.isArray(payload.cards) ? payload.cards : [];
        state.cards = cards.filter(function (card) {
          return card && card.id && card.gradeBand && card.target && Array.isArray(card.forbidden);
        });
        if (!state.cards.length) throw new Error("No valid cards found.");
      });
  }

  function bindEvents() {
    challengeEl.addEventListener("change", function () {
      ensureAdvancedVisibility();
      if (teacherModeEl) teacherModeEl.value = modeForEngine();
    });
    advancedLinkEl.addEventListener("click", function () {
      advancedPanelEl.hidden = !advancedPanelEl.hidden;
    });
    startBtn.addEventListener("click", startSession);
    guessedBtn.addEventListener("click", function () { finishRound(true); });
    skipBtn.addEventListener("click", function () { finishRound(false); });
    nextBtn.addEventListener("click", nextRound);
    endBtn.addEventListener("click", endSession);
    summaryNextEl.addEventListener("click", function () {
      summaryEl.classList.add("pp-hidden");
      if (setupEl.classList.contains("pp-hidden")) nextRound();
      else startSession();
    });

    if (teacherToggleEl) {
      teacherToggleEl.addEventListener("click", function () {
        var nextOpen = teacherPanelEl.classList.contains("pp-hidden");
        teacherPanelEl.classList.toggle("pp-hidden", !nextOpen);
        teacherToggleEl.setAttribute("aria-expanded", String(nextOpen));
      });
    }

    if (teacherModeEl) {
      teacherModeEl.addEventListener("change", function () {
        challengeEl.value = normalizeMode(teacherModeEl.value);
        ensureAdvancedVisibility();
      });
    }

    if (addCustomBtn) addCustomBtn.addEventListener("click", addCustomWord);
    if (shuffleLessonBtn) {
      shuffleLessonBtn.addEventListener("click", function () {
        state.cards = shuffle(state.cards);
        buildDeck();
        setStatus("Lesson set shuffled.");
      });
    }
    if (uploadListEl) {
      uploadListEl.addEventListener("change", function () {
        var file = uploadListEl.files && uploadListEl.files[0];
        handleUpload(file);
      });
    }

    document.addEventListener("keydown", function (event) {
      if (setupEl.classList.contains("pp-hidden")) {
        if (event.key === "g" || event.key === "G") finishRound(true);
        if (event.key === "s" || event.key === "S") finishRound(false);
        if (event.key === "n" || event.key === "N") nextRound();
      }
    });
  }

  function initFromQuery() {
    var mode = normalizeMode(getParam("mode", "TARGETED"));
    var grade = normalizeGradeBand(getParam("grade", "3-5"));
    var skill = getParam("skill", "LIT.VOC.ACAD");

    challengeEl.value = mode;
    if (teacherModeEl) teacherModeEl.value = mode;
    gradeBandEl.value = grade;
    if (teacherSkillNodeEl) teacherSkillNodeEl.value = skill;

    if (mode === "FUN") energyEl.value = "low";
    else if (mode === "TARGETED") energyEl.value = "medium";
    else energyEl.value = "high";

    if (mode === "INTERVENTION" && timerEnabledEl) {
      timerEnabledEl.checked = false;
    }

    if (alignmentBadgeEl) {
      alignmentBadgeEl.textContent = "Aligned to Literacy Focus: " + mapSkillName(skill);
    }
  }

  function init() {
    bindEvents();
    initFromQuery();
    ensureAdvancedVisibility();
    loadCards()
      .then(function () {
        setStatus("Ready. Select mode and start Word Connections.");
      })
      .catch(function (error) {
        setStatus("Unable to load cards: " + (error && error.message ? error.message : "Unknown error"));
        startBtn.disabled = true;
      });
  }

  init();
})();
