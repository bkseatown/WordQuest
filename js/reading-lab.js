(function readingLabModule() {
  "use strict";

  var schema = window.CSStorageSchema || null;
  if (schema && typeof schema.migrateStorageIfNeeded === "function") schema.migrateStorageIfNeeded();

  if (window.CSPerformanceEngine && typeof window.CSPerformanceEngine.init === "function") {
    window.CSPerformanceEngine.init("reading-lab", { budgetMs: 2500 });
  }

  var el = {
    passage: document.getElementById("rl-passage"),
    status: document.getElementById("rl-status"),
    start: document.getElementById("rl-start"),
    stop: document.getElementById("rl-stop"),
    mode: document.getElementById("rl-mode"),
    tier: document.getElementById("rl-tier"),
    prosodyToggle: document.getElementById("rl-prosody-toggle"),
    sendSentence: document.getElementById("rl-send-sentence"),
    nextPassage: document.getElementById("rl-next-passage"),
    replayDemo: document.getElementById("rl-replay-demo"),
    backHome: document.getElementById("rl-back-home"),
    comprehension: document.getElementById("rl-comprehension"),
    hardPanel: document.getElementById("rl-hard-word-panel"),
    hardTarget: document.getElementById("rl-hard-word-target"),
    hardBreakdown: document.getElementById("rl-hard-word-breakdown"),
    hardPattern: document.getElementById("rl-hard-word-pattern"),
    heartToggle: document.getElementById("rl-heart-toggle"),
    hearWord: document.getElementById("rl-hear-word"),
    practiceWord: document.getElementById("rl-practice-word"),
    sendWordQuest: document.getElementById("rl-send-wordquest"),
    spellMini: document.getElementById("rl-spell-mini"),
    spellPrompt: document.getElementById("rl-spell-prompt"),
    spellInput: document.getElementById("rl-spell-input"),
    spellCheck: document.getElementById("rl-spell-check"),
    teacherSummary: document.getElementById("rl-teacher-summary"),
    shareResult: document.getElementById("rl-share-result-btn"),
    shareBundle: document.getElementById("rl-share-bundle-btn"),
    metricWpm: document.getElementById("rl-metric-wpm"),
    metricAccuracy: document.getElementById("rl-metric-accuracy"),
    metricPacing: document.getElementById("rl-metric-pacing"),
    metricPunct: document.getElementById("rl-metric-punct"),
    metricProsody: document.getElementById("rl-metric-prosody"),
    metricsPanel: document.getElementById("rl-metrics-panel"),
    liveChip: document.getElementById("rl-live-chip"),
    markTools: document.getElementById("rl-mark-tools"),
    coachRibbon: document.getElementById("rl-coach-ribbon")
  };

  if (!el.passage || !el.start || !el.stop) return;

  var PASSAGES = [
    "When the rain finally stopped, the class walked outside to check the garden beds. Maya noticed that one row looked flat, because the soil had washed over the small sprouts. She called her partner, and together they gently lifted the leaves before adding a thin layer of dry mulch.",
    "The library was quiet, but not silent. Pages turned, pencils tapped, and a soft whisper moved from table to table. Although Jordan read quickly, he paused at every comma to keep his phrasing smooth, and his partner understood the story better during their shared discussion.",
    "Coach Rivera asked the team to reread the play sheet before practice. If they rushed, they missed the timing cues; if they slowed down, the pattern became clear. By the end of warmups, every pair could explain why the second pass opened space for a safer shot."
  ];

  var DEMO_WORD_TAGS = { because: { heart: true }, quiet: { heart: false } };
  var WORD_KEY = "cs_word_difficulty";

  var state = {
    tokens: [],
    wordTokens: [],
    passageIndex: 0,
    selectedWordId: "",
    selectedSentenceIndex: 0,
    currentMark: "correct",
    attempt: null,
    latestMetrics: null,
    mode: "read_aloud",
    tier: 2,
    mediaRecorder: null,
    mediaStream: null,
    audioChunks: [],
    audioBlob: null,
    spellTimerId: 0,
    spellEndsAt: 0,
    focusWords: [],
    latestSessionId: "",
    isDemo: isDemoMode(),
    demoTimers: [],
    coachRibbon: null
  };

  function isDemoMode() {
    try {
      var params = new URLSearchParams(window.location.search || "");
      return params.get("demo") === "1";
    } catch (_e) {
      return false;
    }
  }

  function isDevMode() {
    if (window.CSAppMode && typeof window.CSAppMode.isDevMode === "function") {
      return !!window.CSAppMode.isDevMode();
    }
    try {
      return localStorage.getItem("cs_allow_dev") === "1";
    } catch (_e) {
      return false;
    }
  }

  function sanitizeText(text) {
    return String(text || "").replace(/[\n\r]+/g, " ").replace(/\s+/g, " ").trim();
  }

  function esc(text) {
    return String(text || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/\"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  function setStatus(msg) {
    if (el.status) el.status.textContent = String(msg || "");
  }

  function initCoachRibbon() {
    var mod = window.CSCoachRibbon;
    if (!mod || typeof mod.initCoachRibbon !== "function" || !el.coachRibbon) return;
    state.coachRibbon = mod.initCoachRibbon({
      mountEl: el.coachRibbon,
      getMessageFn: function () {
        return {
          text: "Start reading. We'll track accuracy + phrasing."
        };
      }
    });
  }

  function setCoachMessage(key, text) {
    if (!state.coachRibbon || typeof state.coachRibbon.set !== "function") return;
    var line = sanitizeText(text);
    if (!line) return;
    state.coachRibbon.set({ key: sanitizeText(key), text: line });
  }

  function emitAva(context) {
    if (typeof window.CSEmitAva !== "function") return;
    try {
      void window.CSEmitAva(context || {});
    } catch (_e) {
      // no-op
    }
  }

  function safeLoad(key, fallback) {
    if (schema && typeof schema.safeLoadJSON === "function") return schema.safeLoadJSON(key, fallback);
    try {
      var raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : fallback;
    } catch (_e) {
      return fallback;
    }
  }

  function safeSave(key, value) {
    if (state.isDemo) return;
    if (schema && typeof schema.safeSaveJSON === "function") {
      schema.safeSaveJSON(key, value);
      return;
    }
    try { localStorage.setItem(key, JSON.stringify(value)); } catch (_e) {}
  }

  function getWordDifficulty() {
    var base = safeLoad(WORD_KEY, {});
    if (state.isDemo) {
      var clone = JSON.parse(JSON.stringify(base || {}));
      Object.keys(DEMO_WORD_TAGS).forEach(function (k) {
        if (!clone[k]) clone[k] = { misses: 0, lastMiss: 0, heart: !!DEMO_WORD_TAGS[k].heart };
      });
      return clone;
    }
    return base && typeof base === "object" ? base : {};
  }

  function saveWordDifficulty(map) {
    if (state.isDemo) return;
    safeSave(WORD_KEY, map || {});
  }

  function normWord(word) {
    return String(word || "").toLowerCase().replace(/[^a-z']/g, "").trim();
  }

  function tokenizePassage(text) {
    var src = String(text || "");
    var out = [];
    var sentenceIndex = 0;
    var wordIndex = 0;
    var globalWordIndex = 0;
    var re = /([A-Za-z']+|[.,!?;:]|\s+|[^\s])/g;
    var match;
    while ((match = re.exec(src)) !== null) {
      var raw = match[0];
      var type = "space";
      if (/^[A-Za-z']+$/.test(raw)) type = "word";
      else if (/^[.,!?;:]$/.test(raw)) type = "punct";
      var token = {
        id: "tok-" + out.length,
        raw: raw,
        norm: type === "word" ? normWord(raw) : raw,
        type: type,
        sentenceIndex: sentenceIndex,
        wordIndex: type === "word" ? wordIndex++ : -1,
        globalWordIndex: type === "word" ? globalWordIndex++ : -1
      };
      out.push(token);
      if (type === "word") {
        var nextChar = src.charAt(re.lastIndex) || "";
        if (nextChar === "" && /[.!?]$/.test(raw)) sentenceIndex += 1;
      }
      if (type === "punct" && /[.!?]/.test(raw)) {
        sentenceIndex += 1;
        wordIndex = 0;
      }
    }
    return out;
  }

  function latestMarkByWord() {
    var map = {};
    if (!state.attempt || !Array.isArray(state.attempt.tokenEvents)) return map;
    state.attempt.tokenEvents.forEach(function (event) {
      if (!event || !event.tokenId) return;
      map[event.tokenId] = event;
    });
    return map;
  }

  function isHardWord(token, difficultyMap, latestMap) {
    if (!token || token.type !== "word") return false;
    var row = difficultyMap[token.norm] || {};
    if (Number(row.misses || 0) >= 2) return true;
    var mark = latestMap[token.id] && latestMap[token.id].mark;
    if (mark === "incorrect" || mark === "skip") return true;
    return false;
  }

  function renderTokens(tokens) {
    var difficulty = getWordDifficulty();
    var latest = latestMarkByWord();
    var html = tokens.map(function (token) {
      if (token.type === "space") return '<span class="rl-token-space">' + esc(token.raw) + "</span>";
      if (token.type === "punct") {
        var punctCls = token.sentenceIndex === state.selectedSentenceIndex ? " rl-token-sentence-selected" : "";
        return '<span class="rl-token-punct' + punctCls + '" data-sentence-index="' + token.sentenceIndex + '">' + esc(token.raw) + "</span>";
      }
      var mark = latest[token.id] ? latest[token.id].mark : "";
      var classes = ["rl-token-word"];
      if (token.id === state.selectedWordId) classes.push("is-active");
      if (mark === "correct") classes.push("is-correct");
      if (mark === "incorrect") classes.push("is-incorrect");
      if (mark === "skip") classes.push("is-skip");
      if (mark === "self_correct") classes.push("is-self_correct");
      if (token.sentenceIndex === state.selectedSentenceIndex) classes.push("rl-token-sentence-selected");
      if (isHardWord(token, difficulty, latest)) classes.push("is-hard");
      return '<span class="' + classes.join(" ") + '" data-token-id="' + token.id + '" data-sentence-index="' + token.sentenceIndex + '">' + esc(token.raw) + "</span>";
    }).join("");
    el.passage.innerHTML = html;
  }

  function currentPassageText() {
    return PASSAGES[state.passageIndex % PASSAGES.length] || PASSAGES[0];
  }

  function currentSentenceText() {
    var idx = Number(state.selectedSentenceIndex || 0);
    var sentenceTokens = state.tokens.filter(function (t) { return t.sentenceIndex === idx; });
    var text = sentenceTokens.map(function (t) { return t.raw; }).join("").replace(/\s+/g, " ").trim();
    return sanitizeText(text);
  }

  function buildReasoningPrompt() {
    var sentence = currentSentenceText() || "the passage";
    if (state.tier === 3) {
      return "Tier 3 prompt: Complete this frame from the sentence context. Because ____, ____.";
    }
    return "Tier 2 prompt: Explain why this idea matters using because or although. Sentence: \"" + sentence + "\"";
  }

  function updateComprehensionPrompt() {
    el.comprehension.textContent = buildReasoningPrompt();
  }

  function getWordTokenById(tokenId) {
    return state.wordTokens.filter(function (t) { return t.id === tokenId; })[0] || null;
  }

  function selectedWordToken() {
    return getWordTokenById(state.selectedWordId) || state.wordTokens[0] || null;
  }

  function detectPattern(word) {
    if (/ing$/.test(word)) return "suffix -ing";
    if (/ed$/.test(word)) return "suffix -ed";
    if (/(ee|ea|oa|ai|ay)/.test(word)) return "vowel team";
    if (/(tion|sion)$/.test(word)) return "latin suffix";
    return "closed syllable / mixed";
  }

  function splitSyllables(word) {
    var w = String(word || "");
    if (w.length <= 4) return w;
    var parts = w.split(/(?<=[aeiouy])(?=[^aeiouy])/i);
    return parts.join(" · ");
  }

  function updateHardWordPanel() {
    var token = selectedWordToken();
    if (!token) {
      el.hardPanel.classList.add("hidden");
      return;
    }
    var diff = getWordDifficulty();
    var row = diff[token.norm] || { misses: 0, heart: false };
    var latest = latestMarkByWord();
    var shouldShow = Number(row.misses || 0) > 0 || isHardWord(token, diff, latest);
    el.hardPanel.classList.toggle("hidden", !shouldShow);
    if (!shouldShow) return;
    el.hardTarget.textContent = "Word: " + token.raw;
    el.hardBreakdown.textContent = "Breakdown: " + splitSyllables(token.norm);
    el.hardPattern.textContent = "Pattern: " + detectPattern(token.norm) + " • Misses: " + Number(row.misses || 0);
    var allowHeartEdit = isDevMode() && !state.isDemo;
    el.heartToggle.disabled = !allowHeartEdit;
    el.heartToggle.checked = !!row.heart;
  }

  function setCurrentMark(mark) {
    state.currentMark = mark;
    Array.prototype.forEach.call(document.querySelectorAll(".rl-mark-btn"), function (btn) {
      btn.classList.toggle("is-active", btn.getAttribute("data-mark") === mark);
    });
  }

  function appendTokenEvent(tokenId, mark) {
    if (!state.attempt || !state.attempt.startedAt) return;
    var token = getWordTokenById(tokenId);
    if (!token) return;
    var event = {
      tokenId: tokenId,
      t: Date.now() - state.attempt.startedAt,
      mark: mark
    };
    state.attempt.tokenEvents.push(event);
    if (mark === "incorrect" || mark === "skip") {
      var diff = getWordDifficulty();
      var row = diff[token.norm] || { misses: 0, lastMiss: 0, heart: false };
      row.misses = Number(row.misses || 0) + 1;
      row.lastMiss = Date.now();
      diff[token.norm] = row;
      saveWordDifficulty(diff);
    }
    computeAndRenderMetrics();
  }

  function startAttempt(options) {
    var opts = options || {};
    if (state.attempt && state.attempt.startedAt) return;
    state.mode = String(el.mode.value || "silent");
    state.tier = Number(el.tier.value || 2) === 3 ? 3 : 2;
    state.audioBlob = null;
    state.audioChunks = [];
    state.latestSessionId = "";
    if (el.shareResult) el.shareResult.classList.add("hidden");
    if (el.shareBundle) el.shareBundle.classList.add("hidden");
    state.attempt = {
      startedAt: Date.now(),
      tokenEvents: [],
      completedAt: 0,
      mode: state.mode
    };
    setStatus("Attempt running.");
    setCoachMessage("rl.during", "Aim for smooth phrasing; pause at punctuation.");
    syncAttemptVisibility("running");

    if (state.mode === "read_aloud" && !opts.skipAudio) {
      beginAudioCapture();
    }
  }

  function stopAttempt(options) {
    var opts = options || {};
    if (!state.attempt || !state.attempt.startedAt) return;
    state.attempt.completedAt = Date.now();
    if (state.mediaRecorder && state.mediaRecorder.state !== "inactive") {
      try { state.mediaRecorder.stop(); } catch (_e) {}
    }
    if (state.mediaStream) {
      try {
        state.mediaStream.getTracks().forEach(function (track) { track.stop(); });
      } catch (_e2) {}
      state.mediaStream = null;
    }
    var metrics = computeAndRenderMetrics();
    renderTeacherSummary(metrics);
    setCoachMessage("rl.post", "Next move: " + recommendedNextStep(metrics));
    emitAva({
      module: "reading_lab",
      event: "paragraph_complete",
      tier: state.tier,
      accuracyPct: metrics.accuracy,
      punctuationScore: metrics.punctScore,
      pacingVar: metrics.pacingVar,
      paragraphComplete: true
    });
    if (metrics.accuracy < 85) {
      emitAva({
        module: "reading_lab",
        event: "low_accuracy",
        tier: state.tier,
        accuracyPct: metrics.accuracy,
        punctuationScore: metrics.punctScore,
        pacingVar: metrics.pacingVar
      });
    }
    if (metrics.punctScore < 60) {
      emitAva({
        module: "reading_lab",
        event: "punctuation_miss",
        tier: state.tier,
        accuracyPct: metrics.accuracy,
        punctuationScore: metrics.punctScore,
        pacingVar: metrics.pacingVar
      });
    }
    if (metrics.pacingVar >= 420) {
      emitAva({
        module: "reading_lab",
        event: "pacing_drop",
        tier: state.tier,
        accuracyPct: metrics.accuracy,
        punctuationScore: metrics.punctScore,
        pacingVar: metrics.pacingVar,
        pacingDrop: true,
        repeatedPausePattern: true
      });
    }
    if (!state.isDemo && !opts.skipPersist) persistReadingAggregate(metrics);
    setStatus("Attempt complete.");
    syncAttemptVisibility("complete");
  }

  function beginAudioCapture() {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia || typeof MediaRecorder === "undefined") {
      state.mode = "silent";
      el.mode.value = "silent";
      setStatus("Mic not supported. Switched to silent mode.");
      setCoachMessage("rl.during", "Continue in silent mode and keep punctuation-aware pacing.");
      return;
    }
    navigator.mediaDevices.getUserMedia({ audio: true }).then(function (stream) {
      state.mediaStream = stream;
      var recorder = new MediaRecorder(stream);
      state.mediaRecorder = recorder;
      state.audioChunks = [];
      recorder.ondataavailable = function (ev) {
        if (ev && ev.data && ev.data.size > 0) state.audioChunks.push(ev.data);
      };
      recorder.onstop = function () {
        if (!state.audioChunks.length) return;
        state.audioBlob = new Blob(state.audioChunks, { type: "audio/webm" });
        if (isDevMode()) {
          var a = document.createElement("a");
          a.href = URL.createObjectURL(state.audioBlob);
          a.download = "reading-lab-attempt.webm";
          a.textContent = "Download audio";
          a.className = "rl-btn";
          el.teacherSummary.appendChild(a);
        }
      };
      recorder.start();
      setStatus("Mic capture running. Audio kept in-memory only.");
    }).catch(function () {
      state.mode = "silent";
      el.mode.value = "silent";
      setStatus("Mic permission denied. Silent mode active.");
      setCoachMessage("rl.during", "Continue in silent mode and keep punctuation-aware pacing.");
    });
  }

  function uniqueWordEvents() {
    var latestById = latestMarkByWord();
    return Object.keys(latestById).map(function (k) { return latestById[k]; }).sort(function (a, b) { return a.t - b.t; });
  }

  function stddev(values) {
    if (!values.length) return 0;
    var mean = values.reduce(function (sum, v) { return sum + v; }, 0) / values.length;
    var variance = values.reduce(function (sum, v) { return sum + Math.pow(v - mean, 2); }, 0) / values.length;
    return Math.sqrt(variance);
  }

  function punctuationRespectScore(eventsByToken) {
    var rules = { ",": 260, ".": 480, "!": 480, "?": 520 };
    var hits = 0;
    var total = 0;

    state.tokens.forEach(function (token, index) {
      if (token.type !== "punct" || !rules[token.raw]) return;
      var prevWord = null;
      var nextWord = null;
      for (var i = index - 1; i >= 0; i -= 1) {
        if (state.tokens[i].type === "word") { prevWord = state.tokens[i]; break; }
      }
      for (var j = index + 1; j < state.tokens.length; j += 1) {
        if (state.tokens[j].type === "word") { nextWord = state.tokens[j]; break; }
      }
      if (!prevWord || !nextWord) return;
      if (!eventsByToken[prevWord.id] || !eventsByToken[nextWord.id]) return;
      total += 1;
      var pause = Number(eventsByToken[nextWord.id].t || 0) - Number(eventsByToken[prevWord.id].t || 0);
      if (pause >= rules[token.raw]) hits += 1;
    });

    if (!total) return 0;
    return Math.round((hits / total) * 100);
  }

  function prosodyCue(metrics) {
    if (!el.prosodyToggle.checked) return "Prosody coach off.";
    var hasQuestions = state.tokens.some(function (t) { return t.type === "punct" && t.raw === "?"; });
    if (metrics.punctScore < 50 && hasQuestions) return "Try rising tone for questions and pause at commas.";
    if (metrics.punctScore < 50) return "Add short pauses at commas and full stops.";
    if (metrics.pacingVar > 420) return "Smooth pacing: keep interval lengths more even.";
    return "Prosody on track. Keep punctuation-aware phrasing.";
  }

  function computeAndRenderMetrics() {
    var eventsByToken = latestMarkByWord();
    var events = uniqueWordEvents();
    var attempted = events.length;
    var correct = events.filter(function (e) { return e.mark === "correct" || e.mark === "self_correct"; }).length;
    var incorrect = events.filter(function (e) { return e.mark === "incorrect"; }).length;
    var skipped = events.filter(function (e) { return e.mark === "skip"; }).length;
    var elapsedMs = state.attempt && state.attempt.startedAt
      ? Math.max(1, (state.attempt.completedAt || Date.now()) - state.attempt.startedAt)
      : 1;
    var minutes = elapsedMs / 60000;
    var wpm = attempted > 0 ? Number((attempted / minutes).toFixed(1)) : 0;
    var accuracy = attempted > 0 ? Number(((correct / attempted) * 100).toFixed(1)) : 0;

    var deltas = [];
    for (var i = 1; i < events.length; i += 1) {
      deltas.push(Number(events[i].t || 0) - Number(events[i - 1].t || 0));
    }
    var pacingVar = Number(stddev(deltas).toFixed(1));
    var punctScore = punctuationRespectScore(eventsByToken);

    var metrics = {
      attempted: attempted,
      correct: correct,
      incorrect: incorrect,
      skipped: skipped,
      wpm: wpm,
      accuracy: accuracy,
      pacingVar: pacingVar,
      punctScore: punctScore,
      prosody: ""
    };
    metrics.prosody = prosodyCue(metrics);
    state.latestMetrics = metrics;

    el.metricWpm.textContent = String(metrics.wpm);
    el.metricAccuracy.textContent = String(metrics.accuracy) + "% (" + correct + "/" + attempted + ")";
    el.metricPacing.textContent = String(metrics.pacingVar);
    el.metricPunct.textContent = String(metrics.punctScore) + "%";
    el.metricProsody.textContent = metrics.prosody;
    if (el.liveChip) {
      var liveLabel = attempted > 0 ? ("Accuracy: " + String(metrics.accuracy) + "%") : "Accuracy: --";
      el.liveChip.textContent = liveLabel;
    }

    renderTokens(state.tokens);
    updateHardWordPanel();
    updateComprehensionPrompt();
    return metrics;
  }

  function syncAttemptVisibility(mode) {
    var phase = String(mode || "ready");
    if (el.markTools) el.markTools.classList.toggle("hidden", phase === "ready");
    if (el.liveChip) el.liveChip.classList.toggle("hidden", phase === "ready");
    if (el.metricsPanel) {
      var attempted = Number(state.latestMetrics && state.latestMetrics.attempted || 0);
      var reveal = phase === "complete" || attempted >= 20;
      el.metricsPanel.classList.toggle("hidden", !reveal);
    }
    if (phase === "ready") {
      el.teacherSummary.classList.add("hidden");
      el.hardPanel.classList.add("hidden");
    }
  }

  function topHardWords(limit) {
    var diff = getWordDifficulty();
    var rows = Object.keys(diff).map(function (k) {
      return { word: k, misses: Number(diff[k].misses || 0) };
    }).filter(function (r) { return r.misses > 0; })
      .sort(function (a, b) { return b.misses - a.misses; })
      .slice(0, limit || 5);
    return rows;
  }

  function persistReadingAggregate(metrics) {
    if (state.isDemo || !metrics) return;
    var studentId = "student-local";
    try {
      var params = new URLSearchParams(window.location.search || "");
      studentId = String(params.get("student") || params.get("studentId") || studentId).trim() || studentId;
    } catch (_e) {
      studentId = "student-local";
    }
    if (window.CSAnalyticsEngine && typeof window.CSAnalyticsEngine.appendReadingAttempt === "function") {
      window.CSAnalyticsEngine.appendReadingAttempt(studentId, {
        wpm: metrics.wpm,
        accuracy: metrics.accuracy,
        punctScore: metrics.punctScore,
        pacingVar: metrics.pacingVar,
        hardWordsCount: topHardWords(5).length
      }, Date.now());
    }
    publishReadingLabSignal(studentId, metrics);
    persistCornerstoneSession(studentId, metrics);
  }

  function toBand(value, strongMin, devMin) {
    var n = Number(value || 0);
    if (n >= strongMin) return "Strong";
    if (n >= devMin) return "Developing";
    return "Emerging";
  }

  function buildReadingLabSignal(metrics) {
    var accuracyPct = Math.max(0, Math.min(100, Number(metrics && metrics.accuracy || 0)));
    var punctPct = Math.max(0, Math.min(100, Number(metrics && metrics.punctScore || 0)));
    var selfCorrectionRate = Math.max(0, Math.min(1, Number(metrics && metrics.selfCorrectionRate || 0)));
    var paceVar = Math.max(0, Number(metrics && metrics.pacingVar || 0));
    var prosodyStability = Math.max(0, Math.min(1, 1 - Math.min(1, paceVar / 500)));
    var orfBand = accuracyPct >= 95 && Number(metrics && metrics.wpm || 0) >= 110
      ? "Strong"
      : (accuracyPct >= 88 ? "Developing" : "Emerging");
    var punctuationRespectBand = toBand(punctPct, 80, 60);
    var nextStep = recommendedNextStep(metrics);
    return {
      accuracy: accuracyPct,
      punctuationRespect: punctPct,
      selfCorrectionRate: selfCorrectionRate,
      prosodyStability: prosodyStability,
      orfBand: orfBand,
      punctuationRespectBand: punctuationRespectBand,
      nextStep: nextStep,
      intensity: (accuracyPct < 85 && punctPct < 60) ? "tier3" : "tier2"
    };
  }

  function publishReadingLabSignal(studentId, metrics) {
    if (state.isDemo || !metrics) return;
    var signal = buildReadingLabSignal(metrics);
    if (window.CSCornerstoneEngine && typeof window.CSCornerstoneEngine.appendSession === "function") {
      window.CSCornerstoneEngine.appendSession(signal, {
        module: "readinglab",
        studentId: String(studentId || "").trim()
      });
    }
  }

  function persistCornerstoneSession(studentId, metrics) {
    if (state.isDemo || !metrics || !window.CSCornerstoneSignals || !window.CSCornerstoneStore) return;
    var signal = buildReadingLabSignal(metrics);
    var tier = signal.intensity === "tier3" ? "tier3" : "tier2";
    var studentCode = typeof window.CSCornerstoneStore.getStudentCode === "function"
      ? window.CSCornerstoneStore.getStudentCode()
      : null;
    var session = window.CSCornerstoneSignals.normalizeSignal({
      engine: "readinglab",
      studentCode: studentCode,
      durationMs: Math.max(0, Number(state.attempt && state.attempt.completedAt || 0) - Number(state.attempt && state.attempt.startedAt || 0)),
      metrics: {
        accuracy: Number(metrics.accuracy || 0),
        punctuationRespect: Number(metrics.punctScore || 0),
        selfCorrectionRate: Number(metrics.selfCorrectionRate || 0),
        orfBand: signal.orfBand,
        hardWordsCount: topHardWords(5).length
      },
      derived: {
        punctuationRespectBand: signal.punctuationRespectBand,
        prosodyStabilityBand: toBand(signal.prosodyStability * 100, 75, 55),
        selfCorrectionBand: toBand(signal.selfCorrectionRate * 100, 40, 20)
      },
      tier: tier,
      nextMove: {
        title: String(signal.nextStep || "Run a punctuation-aware re-read and one fluency pass."),
        steps: [
          "Model one sentence with punctuation pauses.",
          "Run one timed re-read with immediate feedback."
        ],
        estMinutes: 10
      },
      privacy: { containsText: false, containsAudio: false }
    });
    var saved = window.CSCornerstoneStore.appendSession(session);
    state.latestSessionId = saved && saved.sessionId ? String(saved.sessionId) : "";
    if (el.shareResult) el.shareResult.classList.toggle("hidden", !state.latestSessionId);
    if (el.shareBundle) el.shareBundle.classList.toggle("hidden", !state.latestSessionId);
    if (window.CSEvidence && typeof window.CSEvidence.appendSession === "function") {
      window.CSEvidence.appendSession(studentId || "demo-student", "reading_lab", {
        accuracy: Math.max(0, Math.min(100, Number(metrics.accuracy || 0))),
        wpmProxy: Math.max(0, Number(metrics.wpm || 0)),
        selfCorrects: Math.max(0, Math.round((metrics.selfCorrectionRate || 0) * 10)),
        punct: Math.max(0, Math.min(100, Number(metrics.punctScore || 0))),
        prosodyFlatFlag: Number(signal.prosodyStability || 0) < 0.45,
        hardWordsTop3: topHardWords(3)
      });
    }
  }

  async function shareLatestSession() {
    if (!state.latestSessionId || !window.CSCornerstoneStore) return;
    var rows = window.CSCornerstoneStore.listSessions({});
    var row = rows.find(function (session) { return String(session && session.sessionId || "") === state.latestSessionId; });
    if (!row) return;
    var filename = "cornerstone-session-" + state.latestSessionId + ".json";
    var json = JSON.stringify(row, null, 2);
    var blob = new Blob([json], { type: "application/json" });
    var file = typeof File !== "undefined" ? new File([blob], filename, { type: "application/json" }) : null;
    try {
      if (navigator.share) {
        var payload = file ? { files: [file], title: "Cornerstone Session", text: "Cornerstone MTSS session export" } : { title: "Cornerstone Session", text: json };
        await navigator.share(payload);
        setStatus("Session shared.");
        return;
      }
    } catch (_e) {
      // fallback to download
    }
    if (typeof window.CSCornerstoneStore.downloadBlob === "function") {
      window.CSCornerstoneStore.downloadBlob(blob, filename);
      setStatus("Session file downloaded.");
    }
  }

  async function shareSessionBundle() {
    if (!window.CSCornerstoneStore) return;
    var studentCode = typeof window.CSCornerstoneStore.getStudentCode === "function"
      ? window.CSCornerstoneStore.getStudentCode()
      : null;
    var blob = window.CSCornerstoneStore.exportSessions({ studentCode: studentCode || undefined });
    var suffix = studentCode ? String(studentCode).toLowerCase() : "device";
    var filename = "cornerstone-sessions-" + suffix + ".json";
    var file = typeof File !== "undefined" ? new File([blob], filename, { type: "application/json" }) : null;
    try {
      if (navigator.share && file) {
        await navigator.share({ files: [file], title: "Cornerstone Sessions", text: "Cornerstone MTSS session bundle" });
        setStatus("Session bundle shared.");
        return;
      }
    } catch (_e) {
      // fallback
    }
    if (typeof window.CSCornerstoneStore.downloadBlob === "function") {
      window.CSCornerstoneStore.downloadBlob(blob, filename);
      setStatus("Session bundle downloaded.");
    }
  }

  function recommendedNextStep(metrics) {
    if (!metrics) return "Collect one attempt before choosing a next step.";
    if (metrics.accuracy < 92) return "Decoding focus next: send hard words to Word Quest and run micro-practice.";
    if (metrics.punctScore < 60) return "Prosody focus next: re-read one sentence with punctuation pauses.";
    if (metrics.wpm < 85 && metrics.accuracy >= 92) return "Fluency pacing focus: timed re-read with phrase chunking.";
    return "Reasoning focus next: send sentence to Sentence Surgery (because/although).";
  }

  function renderTeacherSummary(metrics) {
    var signal = buildReadingLabSignal(metrics);
    var hard = topHardWords(5);
    var list = hard.length ? hard.map(function (row) { return row.word + " (" + row.misses + ")"; }).join(", ") : "None flagged";
    var nextStep = recommendedNextStep(metrics);
    el.teacherSummary.innerHTML = [
      "<h3>Teacher Summary</h3>",
      "<div><strong>ORF WPM:</strong> " + Number(metrics.wpm || 0) + "</div>",
      "<div><strong>Accuracy:</strong> " + Number(metrics.accuracy || 0) + "%</div>",
      "<div><strong>Punctuation Respect:</strong> " + Number(metrics.punctScore || 0) + "%</div>",
      "<div><strong>Fluency Signal:</strong> " + (signal.intensity === "tier3" ? "Tier 3" : "Tier 2") + " • ORF " + signal.orfBand + " • Punctuation " + signal.punctuationRespectBand + "</div>",
      "<div><strong>Hard Words:</strong> " + esc(list) + "</div>",
      "<section class=\"rl-next-move\" aria-label=\"Next instructional move\">",
      "<p class=\"rl-next-move-title\">Next instructional move</p>",
      "<p class=\"rl-next-move-line\">" + esc(nextStep) + "</p>",
      "<button id=\"rl-next-move-btn\" class=\"rl-btn rl-next-move-btn\" type=\"button\">Send to Sentence Surgery</button>",
      "</section>"
    ].join("");
    var nextMoveBtn = document.getElementById("rl-next-move-btn");
    if (nextMoveBtn) {
      nextMoveBtn.addEventListener("click", function () {
        if (el.sendSentence) el.sendSentence.click();
      });
    }
    el.teacherSummary.classList.remove("hidden");
  }

  function chooseWordByIndex(delta) {
    if (!state.wordTokens.length) return;
    var idx = state.wordTokens.findIndex(function (w) { return w.id === state.selectedWordId; });
    if (idx < 0) idx = 0;
    var next = Math.max(0, Math.min(state.wordTokens.length - 1, idx + delta));
    state.selectedWordId = state.wordTokens[next].id;
    state.selectedSentenceIndex = state.wordTokens[next].sentenceIndex;
    renderTokens(state.tokens);
    updateHardWordPanel();
    updateComprehensionPrompt();
  }

  function markCurrentWord(mark, autoAdvance) {
    var token = selectedWordToken();
    if (!token) return;
    appendTokenEvent(token.id, mark);
    state.selectedWordId = token.id;
    if (autoAdvance !== false) chooseWordByIndex(1);
  }

  function toggleSelfCorrect() {
    if (!state.attempt || !state.attempt.tokenEvents.length) return;
    var last = state.attempt.tokenEvents[state.attempt.tokenEvents.length - 1];
    if (!last) return;
    last.mark = last.mark === "self_correct" ? "incorrect" : "self_correct";
    computeAndRenderMetrics();
  }

  function handleTokenClick(event) {
    var tokenEl = event.target.closest("[data-token-id]");
    if (!tokenEl) return;
    var tokenId = String(tokenEl.getAttribute("data-token-id") || "");
    var sentenceIndex = Number(tokenEl.getAttribute("data-sentence-index") || 0);
    state.selectedWordId = tokenId;
    state.selectedSentenceIndex = sentenceIndex;
    renderTokens(state.tokens);
    updateHardWordPanel();
    updateComprehensionPrompt();
    if (state.attempt && state.attempt.startedAt) {
      appendTokenEvent(tokenId, state.currentMark || "correct");
    }
  }

  function handleKeyDown(event) {
    if (!state.attempt || !state.attempt.startedAt) return;
    var key = String(event.key || "").toLowerCase();
    if (key === "arrowright" || key === " ") {
      event.preventDefault();
      markCurrentWord("correct", true);
      return;
    }
    if (key === "c") { event.preventDefault(); markCurrentWord("correct", true); return; }
    if (key === "i") { event.preventDefault(); markCurrentWord("incorrect", true); return; }
    if (key === "s") { event.preventDefault(); markCurrentWord("skip", true); return; }
    if (key === "r") { event.preventDefault(); toggleSelfCorrect(); return; }
  }

  function refreshPassage() {
    state.tokens = tokenizePassage(currentPassageText());
    state.wordTokens = state.tokens.filter(function (t) { return t.type === "word"; });
    state.selectedWordId = state.wordTokens.length ? state.wordTokens[0].id : "";
    state.selectedSentenceIndex = 0;
    renderTokens(state.tokens);
    updateHardWordPanel();
    updateComprehensionPrompt();
    computeAndRenderMetrics();
    syncAttemptVisibility(state.attempt && state.attempt.startedAt ? "running" : "ready");
  }

  function sendSentenceToSurgery() {
    var sentence = currentSentenceText();
    if (!sentence) {
      setStatus("Select a sentence first.");
      return;
    }
    var url = new URL("sentence-surgery.html", window.location.href);
    url.searchParams.set("seed", sentence);
    url.searchParams.set("from", "reading");
    if (state.isDemo) url.searchParams.set("demo", "1");
    window.location.href = url.toString();
  }

  function speakWord() {
    var token = selectedWordToken();
    if (!token) return;
    if (!("speechSynthesis" in window)) {
      setStatus("TTS not available on this device.");
      return;
    }
    var utter = new SpeechSynthesisUtterance(token.raw);
    utter.rate = 0.9;
    utter.pitch = 1;
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(utter);
  }

  function startSpellMini() {
    var token = selectedWordToken();
    if (!token) return;
    if (state.spellTimerId) window.clearInterval(state.spellTimerId);
    el.spellMini.classList.remove("hidden");
    el.spellInput.value = "";
    state.spellEndsAt = Date.now() + 10000;
    el.spellPrompt.textContent = "Spell \"" + token.raw + "\" in 10 seconds.";
    state.spellTimerId = window.setInterval(function () {
      var left = Math.max(0, Math.ceil((state.spellEndsAt - Date.now()) / 1000));
      el.spellPrompt.textContent = "Spell \"" + token.raw + "\" in " + left + " seconds.";
      if (left <= 0) {
        window.clearInterval(state.spellTimerId);
        state.spellTimerId = 0;
      }
    }, 200);
  }

  function checkSpellMini() {
    var token = selectedWordToken();
    if (!token) return;
    var guess = normWord(el.spellInput.value || "");
    var target = normWord(token.raw || "");
    var ok = guess === target;
    el.spellPrompt.textContent = ok ? "Correct." : ("Keep practicing. Target: " + token.raw);
  }

  function sendWordToWordQuest() {
    var token = selectedWordToken();
    if (!token) return;
    if (state.focusWords.indexOf(token.norm) < 0) state.focusWords.push(token.norm);
    setStatus("Added " + token.raw + " to Word Quest focus list.");
    if (!state.isDemo) {
      try {
        var rows = safeLoad("cs_student_data", []);
        if (Array.isArray(rows) && rows.length) {
          if (!Array.isArray(rows[0].focusWords)) rows[0].focusWords = [];
          if (rows[0].focusWords.indexOf(token.norm) < 0) rows[0].focusWords.push(token.norm);
          safeSave("cs_student_data", rows);
        }
      } catch (_e) {
        // no-op
      }
    }
  }

  function bindEvents() {
    el.passage.addEventListener("click", handleTokenClick);
    el.passage.addEventListener("keydown", handleKeyDown);

    el.start.addEventListener("click", function () { startAttempt(); });
    el.stop.addEventListener("click", function () { stopAttempt(); });
    el.mode.addEventListener("change", function () { state.mode = String(el.mode.value || "silent"); });
    el.tier.addEventListener("change", function () { state.tier = Number(el.tier.value || 2) === 3 ? 3 : 2; updateComprehensionPrompt(); });
    el.sendSentence.addEventListener("click", sendSentenceToSurgery);
    el.nextPassage.addEventListener("click", function () { state.passageIndex = (state.passageIndex + 1) % PASSAGES.length; refreshPassage(); });
    el.backHome.addEventListener("click", function () {
      var params = new URLSearchParams(window.location.search || "");
      if (params.get("from") === "teacher") {
        window.location.href = "teacher-dashboard.html";
        return;
      }
      window.location.href = "index.html";
    });
    try {
      var fromTeacher = new URLSearchParams(window.location.search || "").get("from") === "teacher";
      if (fromTeacher) el.backHome.textContent = "Back to Dashboard";
    } catch (_e) {}

    Array.prototype.forEach.call(document.querySelectorAll(".rl-mark-btn"), function (btn) {
      btn.addEventListener("click", function () { setCurrentMark(String(btn.getAttribute("data-mark") || "correct")); });
    });

    el.hearWord.addEventListener("click", speakWord);
    el.practiceWord.addEventListener("click", startSpellMini);
    el.spellCheck.addEventListener("click", checkSpellMini);
    el.sendWordQuest.addEventListener("click", sendWordToWordQuest);

    el.heartToggle.addEventListener("change", function () {
      if (!isDevMode() || state.isDemo) return;
      var token = selectedWordToken();
      if (!token) return;
      var diff = getWordDifficulty();
      var row = diff[token.norm] || { misses: 0, lastMiss: 0, heart: false };
      row.heart = !!el.heartToggle.checked;
      diff[token.norm] = row;
      saveWordDifficulty(diff);
      updateHardWordPanel();
    });

    if (el.replayDemo) {
      el.replayDemo.addEventListener("click", function () {
        runDemoScript();
      });
    }
    if (el.shareResult) {
      el.shareResult.addEventListener("click", function () { void shareLatestSession(); });
    }
    if (el.shareBundle) {
      el.shareBundle.addEventListener("click", function () { void shareSessionBundle(); });
    }
  }

  function clearDemoTimers() {
    while (state.demoTimers.length) {
      window.clearTimeout(state.demoTimers.pop());
    }
  }

  function demoTimeout(fn, ms) {
    var id = window.setTimeout(fn, ms);
    state.demoTimers.push(id);
    return id;
  }

  function runDemoScript() {
    if (!state.isDemo) return;
    clearDemoTimers();
    state.passageIndex = 0;
  refreshPassage();
  syncAttemptVisibility("ready");
    el.replayDemo.classList.remove("hidden");
    startAttempt({ skipAudio: true });

    var wordIds = state.wordTokens.map(function (t) { return t.id; });
    var t = 120;
    var i;
    for (i = 0; i < Math.min(12, wordIds.length); i += 1) {
      (function (tokenId, delay, mark) {
        demoTimeout(function () {
          state.selectedWordId = tokenId;
          appendTokenEvent(tokenId, mark);
        }, delay);
      })(wordIds[i], t, i === 4 ? "incorrect" : "correct");
      t += 130;
    }

    demoTimeout(function () { setStatus("Prosody cue: add pauses at punctuation."); }, 2200);
    demoTimeout(function () { setCoachMessage("rl.during", "Aim for smooth phrasing; pause at punctuation."); }, 2200);

    for (i = 12; i < Math.min(26, wordIds.length); i += 1) {
      (function (tokenId, delay, mark) {
        demoTimeout(function () {
          state.selectedWordId = tokenId;
          appendTokenEvent(tokenId, mark);
        }, delay);
      })(wordIds[i], t, i === 17 ? "incorrect" : "correct");
      t += (i % 6 === 0 ? 520 : 220);
    }

    demoTimeout(function () {
      stopAttempt({ skipPersist: true });
      setStatus("Demo complete: punctuation pauses improved, hard word practiced.");
      setCoachMessage("rl.post", "Next move: re-read sentence 2 with comma pauses.");
    }, t + 600);
  }

  function initFromQuery() {
    try {
      var params = new URLSearchParams(window.location.search || "");
      var tier = Number(params.get("tier") || "2");
      if (tier === 3) {
        state.tier = 3;
        el.tier.value = "3";
      }
    } catch (_e) {
      // no-op
    }
  }

  function init() {
    initCoachRibbon();
    bindEvents();
    initFromQuery();
    refreshPassage();
    setCurrentMark("correct");
    setStatus("Ready. Start an attempt.");
    if (el.shareResult) el.shareResult.classList.add("hidden");
    if (el.shareBundle) el.shareBundle.classList.add("hidden");
    setCoachMessage("rl.preAttempt", "Start reading. We'll track accuracy + phrasing.");
    if (state.isDemo) {
      el.replayDemo.classList.remove("hidden");
      runDemoScript();
    }
  }

  init();
})();
