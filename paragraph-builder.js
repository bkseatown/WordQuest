(function paragraphBuilderV1() {
  "use strict";

  var slots = Array.prototype.slice.call(document.querySelectorAll('.pb-slot'));
  var metricsEl = document.getElementById('pb-metrics');
  var actionsEl = document.getElementById('pb-actions');
  var doneBtn = document.getElementById('pb-done');
  var coachEl = document.getElementById('pb-coach');
  var coachTextEl = document.getElementById('pb-coach-text');
  var coachCloseBtn = document.getElementById('pb-coach-close');
  var overlayEl = document.getElementById('pb-overlay');
  var overlayParagraphEl = document.getElementById('pb-overlay-paragraph');
  var overlayMetricsEl = document.getElementById('pb-overlay-metrics');
  var overlayRetryBtn = document.getElementById('pb-overlay-retry');
  var overlayHomeBtn = document.getElementById('pb-overlay-home');

  if (!slots.length || !metricsEl) return;
  if (window.CSPerformanceEngine && typeof window.CSPerformanceEngine.init === "function") {
    window.CSPerformanceEngine.init("paragraph-builder", { budgetMs: 2500 });
  }

  var state = {
    values: { topic: '', body1: '', body2: '', conclusion: '' },
    analysis: { topic: null, body1: null, body2: null, conclusion: null },
    pedagogy: { topic: null, body1: null, body2: null, conclusion: null },
    debounceTimer: 0,
    idleHandle: 0,
    analysisRunToken: 0,
    coachDismissedFor: '',
    demoTimers: []
  };
  var tierLevel = resolveTierLevel();

  var PLACEHOLDERS = {
    topic: 'Enter a clear topic sentence.',
    body1: 'Develop your idea.',
    body2: 'Add reasoning or evidence.',
    conclusion: 'Wrap up your idea.'
  };

  function slotType(slotEl) {
    return String(slotEl && slotEl.getAttribute('data-type') || '').trim();
  }

  function sanitize(text) {
    return String(text || '').replace(/[\n\r]+/g, ' ').replace(/\s+/g, ' ').trim();
  }

  function resolveTierLevel() {
    try {
      if (window.PB_TIER_LEVEL !== undefined && window.PB_TIER_LEVEL !== null) {
        var fromWindow = Number(window.PB_TIER_LEVEL);
        if (fromWindow === 1 || fromWindow === 2 || fromWindow === 3) return fromWindow;
      }
      var params = new URLSearchParams(window.location.search || '');
      var raw = String(params.get('tier') || params.get('tierLevel') || '').toLowerCase();
      if (raw === '1' || raw === 'tier1' || raw === 'tier-1' || raw === 'tier 1') return 1;
      if (raw === '3' || raw === 'tier3' || raw === 'tier-3' || raw === 'tier 3') return 3;
    } catch (_e) {
      // ignore
    }
    return 2;
  }

  function buildInstructionalLens(targetSkill) {
    var tier = tierLevel === 3 ? 'tier3' : (tierLevel === 1 ? 'tier1' : 'tier2');
    var params;
    try { params = new URLSearchParams(window.location.search || ''); } catch (_e) { params = null; }
    var languageProfile = params ? String(params.get('languageProfile') || 'general') : 'general';
    var gradeBand = params ? String(params.get('gradeBand') || '6-8') : '6-8';
    var skill = String(targetSkill || 'reasoning');
    return {
      studentTier: tier,
      targetSkill: skill,
      focus: [skill],
      languageProfile: languageProfile,
      gradeBand: gradeBand
    };
  }

  function getSlotEl(type) {
    return document.querySelector('.pb-slot[data-type="' + type + '"]');
  }

  function setPlaceholder(slotEl, text) {
    slotEl.textContent = text;
    slotEl.dataset.empty = 'true';
    slotEl.classList.add('placeholder');
  }

  function clearPlaceholder(slotEl) {
    slotEl.textContent = '';
    slotEl.dataset.empty = 'false';
    slotEl.classList.remove('placeholder');
  }

  function readSlotValue(slotEl) {
    if (!slotEl || slotEl.dataset.empty === 'true') return '';
    return sanitize(slotEl.textContent || '');
  }

  async function analyzeSentence(sentence) {
    var clean = sanitize(sentence);
    var svc = window.CSAIService;
    if (!svc || typeof svc.analyzeSentence !== 'function') return window.SSAIAnalysis.analyzeSentenceHeuristic(clean);
    return svc.analyzeSentence(clean, { endpoint: window.PB_AI_ENDPOINT || window.WS_AI_ENDPOINT || '', channel: 'paragraph-builder-analysis' });
  }

  function setMetricWidth(id, score) {
    var el = document.getElementById(id);
    if (!el) return;
    var pct = Math.max(0, Math.min(100, Math.round(score * 20)));
    el.style.width = String(pct) + '%';
  }

  function tokenize(text) {
    return sanitize(text).toLowerCase().split(/[^a-z0-9']+/).filter(Boolean);
  }

  function computeCohesion(values) {
    var topicTokens = tokenize(values.topic);
    if (!topicTokens.length) return 0;
    var b1 = tokenize(values.body1);
    var b2 = tokenize(values.body2);
    var shared = 0;
    topicTokens.forEach(function (word) {
      if (b1.indexOf(word) >= 0 || b2.indexOf(word) >= 0) shared += 1;
    });
    return Math.max(0, Math.min(5, Math.round((shared / topicTokens.length) * 5)));
  }

  function computeReasoning(analysis) {
    var count = 0;
    if (analysis.body1 && analysis.body1.has_reasoning) count += 1;
    if (analysis.body2 && analysis.body2.has_reasoning) count += 1;
    if (analysis.conclusion && analysis.conclusion.has_reasoning) count += 1;
    return Math.max(0, Math.min(5, Math.round(count * 1.7)));
  }

  function computeDetail(analysis) {
    var list = ['topic','body1','body2','conclusion'].map(function (key) {
      return Number((analysis[key] && analysis[key].detail_score) || 0);
    });
    var avg = list.reduce(function (a,b){ return a+b; },0) / Math.max(1, list.length);
    return Math.max(0, Math.min(5, Math.round(avg)));
  }

  function computeControl(analysis) {
    var strongComplex = ['topic','body1','body2','conclusion'].some(function (key) {
      var row = analysis[key] || {};
      return row.sentence_type === 'complex' && row.verb_strength === 'strong';
    });
    var hasPeriod = ['topic','body1','body2','conclusion'].some(function (key) {
      return /[.!?]$/.test(sanitize(state.values[key]));
    });
    var score = 1;
    if (hasPeriod) score += 2;
    if (strongComplex) score += 2;
    return Math.max(0, Math.min(5, score));
  }

  function showCoach(text) {
    if (!coachEl || !coachTextEl) return;
    coachTextEl.innerText = text;
    coachEl.classList.remove('hidden');
  }

  function hideCoach() {
    if (!coachEl) return;
    coachEl.classList.add('hidden');
  }

  function updateCoach() {
    var keys = ['topic', 'body1', 'body2', 'conclusion'];
    var counts = {};
    var selected = null;

    keys.forEach(function (key) {
      var row = state.pedagogy[key];
      if (!row || !row.primary_focus || !row.coach_prompt) return;
      counts[row.primary_focus] = Number(counts[row.primary_focus] || 0) + 1;
    });

    var prioritized = '';
    Object.keys(counts).forEach(function (focus) {
      if (!prioritized || counts[focus] > counts[prioritized]) prioritized = focus;
    });

    if (prioritized) {
      for (var i = 0; i < keys.length; i += 1) {
        var key = keys[i];
        var row = state.pedagogy[key];
        if (row && row.primary_focus === prioritized && row.coach_prompt) {
          selected = row;
          break;
        }
      }
    }

    if (selected) {
      var text = selected.coach_prompt;
      if (tierLevel === 3 && selected.suggested_stem) text += ' Stem: ' + sanitize(selected.suggested_stem);
      if (tierLevel === 1 && selected.extension_option) text += ' Challenge: ' + sanitize(selected.extension_option);
      showCoach(text);
      return;
    }

    if (!state.values.topic) return showCoach('Make your topic clear and specific.');
    if (!state.values.body1 || !state.values.body2) return showCoach('Add support in both body sentences.');
    if (!state.values.conclusion) return showCoach('Wrap up by linking back to your topic.');
    hideCoach();
  }

  function updateDoneVisibility() {
    var ready = ['topic','body1','body2','conclusion'].every(function (key) {
      return sanitize(state.values[key]).length >= 6;
    });
    if (actionsEl) actionsEl.classList.toggle('hidden', !ready);
  }

  function renderMetrics() {
    var cohesion = computeCohesion(state.values);
    var reasoning = computeReasoning(state.analysis);
    var detail = computeDetail(state.analysis);
    var control = computeControl(state.analysis);

    setMetricWidth('metric-cohesion', cohesion);
    setMetricWidth('metric-reasoning', reasoning);
    setMetricWidth('metric-detail', detail);
    setMetricWidth('metric-control', control);

    updateCoach();
    updateDoneVisibility();
  }

  async function runAnalysis(token) {
    var runToken = typeof token === 'number' ? token : state.analysisRunToken;
    var keys = ['topic','body1','body2','conclusion'];
    for (var i = 0; i < keys.length; i += 1) {
      var key = keys[i];
      if (runToken !== state.analysisRunToken) return;
      state.analysis[key] = await (window.CSAIService && window.CSAIService.analyzeSentence
        ? window.CSAIService.analyzeSentence(state.values[key], {
          endpoint: window.PB_AI_ENDPOINT || window.WS_AI_ENDPOINT || '',
          channel: 'paragraph-builder-' + key,
          cohesion: computeCohesion(state.values)
        })
        : analyzeSentence(state.values[key]));
      state.pedagogy[key] = await (window.CSAIService && window.CSAIService.generatePedagogyFeedback
        ? window.CSAIService.generatePedagogyFeedback(state.values[key], (state.analysis[key] || {}).suggested_focus, {
          analysis: state.analysis[key],
          tierLevel: tierLevel,
          instructionalLens: buildInstructionalLens((state.analysis[key] || {}).suggested_focus),
          coachEndpoint: window.PB_COACH_ENDPOINT || window.WS_COACH_ENDPOINT || '',
          channel: 'paragraph-builder-pedagogy-' + key
        })
        : null);
      if (runToken !== state.analysisRunToken) return;
    }
    renderMetrics();
  }

  function queueIdleAnalysis() {
    var token = ++state.analysisRunToken;
    var run = function () {
      if (token !== state.analysisRunToken) return;
      void runAnalysis(token);
    };
    if (typeof window.requestIdleCallback === 'function') {
      if (state.idleHandle) window.cancelIdleCallback(state.idleHandle);
      state.idleHandle = window.requestIdleCallback(run, { timeout: 900 });
    } else {
      window.setTimeout(run, 0);
    }
  }

  function queueAnalysis() {
    window.clearTimeout(state.debounceTimer);
    state.debounceTimer = window.setTimeout(function () {
      queueIdleAnalysis();
    }, 400);
  }

  function collectValues() {
    slots.forEach(function (slotEl) {
      var type = slotType(slotEl);
      state.values[type] = readSlotValue(slotEl);
    });
  }

  function handleSlotFocus(slotEl) {
    slots.forEach(function (el) { el.classList.remove('active'); });
    slotEl.classList.add('active');

    if (slotEl.dataset.empty === 'true') {
      clearPlaceholder(slotEl);
    }
    state.coachDismissedFor = '';
  }

  function handleSlotBlur(slotEl) {
    var type = slotType(slotEl);
    var value = sanitize(slotEl.textContent || '');
    if (!value) {
      setPlaceholder(slotEl, PLACEHOLDERS[type]);
    }
    collectValues();
    queueAnalysis();
  }

  function handleSlotInput() {
    collectValues();
    queueAnalysis();
  }

  function setAllPlaceholders() {
    slots.forEach(function (slotEl) {
      var type = slotType(slotEl);
      setPlaceholder(slotEl, PLACEHOLDERS[type] || 'Write here.');
    });
  }

  function combinedParagraph() {
    return ['topic','body1','body2','conclusion']
      .map(function (key) { return sanitize(state.values[key]); })
      .filter(Boolean)
      .map(function (line) { return /[.!?]$/.test(line) ? line : line + '.'; })
      .join(' ');
  }

  function metricSummaryText() {
    var cohesion = Math.round((parseFloat((document.getElementById('metric-cohesion') || {}).style.width || '0') || 0));
    var reasoning = Math.round((parseFloat((document.getElementById('metric-reasoning') || {}).style.width || '0') || 0));
    var detail = Math.round((parseFloat((document.getElementById('metric-detail') || {}).style.width || '0') || 0));
    var control = Math.round((parseFloat((document.getElementById('metric-control') || {}).style.width || '0') || 0));
    return 'Metrics: Cohesion ' + cohesion + '%, Reasoning ' + reasoning + '%, Detail ' + detail + '%, Control ' + control + '%';
  }

  function showDoneOverlay() {
    if (!overlayEl || !overlayParagraphEl || !overlayMetricsEl) return;
    overlayParagraphEl.textContent = combinedParagraph() || '(No paragraph entered)';
    overlayMetricsEl.textContent = metricSummaryText();
    overlayEl.classList.remove('hidden');
  }

  function resetBuilder() {
    state.values = { topic: '', body1: '', body2: '', conclusion: '' };
    state.analysis = { topic: null, body1: null, body2: null, conclusion: null };
    state.pedagogy = { topic: null, body1: null, body2: null, conclusion: null };
    setAllPlaceholders();
    hideCoach();
    if (actionsEl) actionsEl.classList.add('hidden');
    setMetricWidth('metric-cohesion', 0);
    setMetricWidth('metric-reasoning', 0);
    setMetricWidth('metric-detail', 0);
    setMetricWidth('metric-control', 0);
    slots.forEach(function (el) { el.classList.remove('active'); });
  }

  function goBackHome() {
    window.location.href = 'writing-studio.html';
  }

  function demoSetTimeout(fn, ms) {
    var id = window.setTimeout(fn, ms);
    state.demoTimers.push(id);
    return id;
  }

  function clearDemoTimers() {
    while (state.demoTimers.length) {
      window.clearTimeout(state.demoTimers.pop());
    }
  }

  function showCoachForSlot(type, text) {
    var slotEl = getSlotEl(type);
    if (!slotEl) return;
    slots.forEach(function (el) { el.classList.remove('active'); });
    slotEl.classList.add('active');
    showCoach(text);
  }

  function setSlotText(type, text) {
    var slotEl = getSlotEl(type);
    if (!slotEl) return;
    slotEl.dataset.empty = 'false';
    slotEl.classList.remove('placeholder');
    slotEl.textContent = text;
    state.values[type] = sanitize(text);
  }

  function runDemoMode() {
    clearDemoTimers();
    resetBuilder();

    setSlotText('topic', 'Dogs help people.');
    setSlotText('body1', 'They work as companions in hospitals.');
    setSlotText('body2', 'Because they comfort patients, recovery improves.');
    setSlotText('conclusion', 'Dogs make a meaningful difference.');
    collectValues();
    state.analysisRunToken += 1;
    void runAnalysis();

    demoSetTimeout(function () { showCoachForSlot('topic', 'Make your topic clear and specific.'); }, 400);
    demoSetTimeout(function () { showCoachForSlot('body1', 'Develop the idea with one clear support sentence.'); }, 1700);
    demoSetTimeout(function () { showCoachForSlot('body2', 'Add reasoning with because to explain impact.'); }, 3000);
    demoSetTimeout(function () { showCoachForSlot('conclusion', 'Wrap up by linking back to your topic.'); }, 4300);
    demoSetTimeout(function () {
      hideCoach();
      showDoneOverlay();
    }, 6000);
  }

  slots.forEach(function (slotEl) {
    slotEl.addEventListener('focus', function () { handleSlotFocus(slotEl); });
    slotEl.addEventListener('blur', function () { handleSlotBlur(slotEl); });
    slotEl.addEventListener('input', handleSlotInput);
    slotEl.addEventListener('keydown', function (event) {
      if (event.key === 'Enter') {
        event.preventDefault();
        var idx = slots.indexOf(slotEl);
        var next = slots[idx + 1];
        if (next) next.focus();
      }
    });
  });

  if (coachCloseBtn) {
    coachCloseBtn.addEventListener('click', function () {
      hideCoach();
      var active = document.querySelector('.pb-slot.active');
      if (active) state.coachDismissedFor = slotType(active);
    });
  }

  if (doneBtn) doneBtn.addEventListener('click', showDoneOverlay);
  if (overlayRetryBtn) overlayRetryBtn.addEventListener('click', function () {
    overlayEl.classList.add('hidden');
    resetBuilder();
  });
  if (overlayHomeBtn) overlayHomeBtn.addEventListener('click', goBackHome);

  setAllPlaceholders();
  queueAnalysis();

  var params = new URLSearchParams(window.location.search || '');
  if (params.get('demo') === '1') {
    runDemoMode();
  }
})();
