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

  var state = {
    values: { topic: '', body1: '', body2: '', conclusion: '' },
    analysis: { topic: null, body1: null, body2: null, conclusion: null },
    debounceTimer: 0,
    coachDismissedFor: '',
    demoTimers: []
  };

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

  function analyzeSentenceHeuristic(sentence){
    var words = sanitize(sentence).split(/\s+/).filter(Boolean);
    var lower = sanitize(sentence).toLowerCase();
    var subordinators=["because","although","since","while","if","when","after","before"];
    var strongVerbs=["sprinted","dashed","bolted","lunged","shattered","gripped"];
    var hasReasoning=subordinators.some(function(w){ return lower.indexOf(w)>=0; });
    var verbStrength=strongVerbs.some(function(v){ return lower.indexOf(v)>=0; })?"strong":"adequate";
    var sentenceType="simple";
    if(lower.indexOf(" and ")>=0||lower.indexOf(" but ")>=0) sentenceType="compound";
    if(hasReasoning) sentenceType="complex";
    return {
      sentence_type:sentenceType,
      has_reasoning:hasReasoning,
      detail_score:words.length>10?3:words.length>7?2:1,
      verb_strength:verbStrength,
      word_count:words.length
    };
  }

  async function analyzeWithAI(sentence) {
    var endpoint = window.WS_AI_ENDPOINT || window.PB_AI_ENDPOINT || '';
    if (!endpoint) return null;
    try {
      var response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: 'Analyze this sentence structurally:\n"' + sentence + '"\n\nReturn ONLY valid JSON:\n{\n  "sentence_type":"simple|compound|complex",\n  "has_reasoning":true/false,\n  "detail_score":0-5,\n  "verb_strength":"weak|adequate|strong",\n  "word_count":number\n}'
        })
      });
      if (!response.ok) return null;
      var data = await response.json();
      if (!data || typeof data !== 'object') return null;
      if (typeof data.word_count !== 'number') return null;
      return data;
    } catch (_err) {
      return null;
    }
  }

  async function analyzeSentence(sentence) {
    var clean = sanitize(sentence);
    if (!clean) return analyzeSentenceHeuristic('');
    var aiResult = await analyzeWithAI(clean);
    return aiResult || analyzeSentenceHeuristic(clean);
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
    var topic = state.values.topic;
    var bodyReasoning = (state.analysis.body1 && state.analysis.body1.has_reasoning)
      || (state.analysis.body2 && state.analysis.body2.has_reasoning);
    var detailLow = computeDetail(state.analysis) <= 2;

    if (!topic) {
      showCoach('Make your topic clear and specific.');
      return;
    }
    if (!bodyReasoning) {
      showCoach('Add a reason using because or although.');
      return;
    }
    if (detailLow) {
      showCoach('Help the reader see more detail.');
      return;
    }
    if (!state.values.conclusion) {
      showCoach('Wrap up by linking back to your topic.');
      return;
    }
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

  async function runAnalysis() {
    var keys = ['topic','body1','body2','conclusion'];
    for (var i = 0; i < keys.length; i += 1) {
      var key = keys[i];
      state.analysis[key] = await analyzeSentence(state.values[key]);
    }
    renderMetrics();
  }

  function queueAnalysis() {
    window.clearTimeout(state.debounceTimer);
    state.debounceTimer = window.setTimeout(function () {
      void runAnalysis();
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
