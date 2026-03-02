(function () {
  var LOG_KEY = 'cs.precisionPlay.log.v1';
  var EXPRESSIONS = ['SPEAK', 'ACT', 'DRAW'];
  var ENERGY = {
    low: { seconds: 70, tempo: 'calm' },
    medium: { seconds: 55, tempo: 'standard' },
    high: { seconds: 42, tempo: 'fast' }
  };

  var setupEl = document.getElementById('pp-setup');
  var gameEl = document.getElementById('pp-game');
  var startBtn = document.getElementById('pp-start');
  var gradeBandEl = document.getElementById('pp-grade-band');
  var energyEl = document.getElementById('pp-energy');
  var challengeEl = document.getElementById('pp-challenge');
  var expressionModeEl = document.getElementById('pp-expression-mode');
  var lockExpressionEl = document.getElementById('pp-expression-lock');
  var advancedLinkEl = document.getElementById('pp-advanced-link');
  var advancedPanelEl = document.getElementById('pp-advanced');
  var revealTimingEl = document.getElementById('pp-reveal-timing');
  var logEnabledEl = document.getElementById('pp-log-enabled');

  var targetEl = document.getElementById('pp-target-word');
  var forbiddenEl = document.getElementById('pp-forbidden-list');
  var requiredRowEl = document.getElementById('pp-required-row');
  var requiredTextEl = document.getElementById('pp-required-text');
  var requiredOkRowEl = document.getElementById('pp-required-ok-row');
  var requiredOkEl = document.getElementById('pp-required-ok');
  var cueEl = document.getElementById('pp-expression-cue');
  var cueNoteEl = document.getElementById('pp-expression-note');
  var timerEl = document.getElementById('pp-timer');
  var scoreEl = document.getElementById('pp-score');
  var roundEl = document.getElementById('pp-round');
  var modeEl = document.getElementById('pp-mode');
  var guessedBtn = document.getElementById('pp-guessed');
  var skipBtn = document.getElementById('pp-skip');
  var nextBtn = document.getElementById('pp-next');
  var endBtn = document.getElementById('pp-end');
  var statusEl = document.getElementById('pp-status');

  var state = {
    cards: [],
    deck: [],
    round: 0,
    score: 0,
    index: -1,
    card: null,
    expressionIndex: 0,
    expression: 'MIXED',
    timerSec: 0,
    timerId: 0,
    startedAtMs: 0,
    canAdvance: false,
    config: null,
    logs: []
  };

  function getStudentId() {
    try {
      return new URLSearchParams(window.location.search).get('student') || '';
    } catch (_e) {
      return '';
    }
  }

  function readLogs() {
    try {
      var raw = localStorage.getItem(LOG_KEY);
      var parsed = raw ? JSON.parse(raw) : [];
      return Array.isArray(parsed) ? parsed : [];
    } catch (_e) {
      return [];
    }
  }

  function writeLogs(items) {
    try {
      localStorage.setItem(LOG_KEY, JSON.stringify(items));
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

  function challengeForbiddenCount(mode) {
    if (mode === 'classic') return 4;
    if (mode === 'guided') return 5;
    return 6;
  }

  function expressionForRound(mode, lock) {
    if (lock) return String(mode || 'MIXED').toUpperCase();
    if (String(mode || '').toLowerCase() !== 'mixed') return String(mode || 'SPEAK').toUpperCase();
    var pick = EXPRESSIONS[state.expressionIndex % EXPRESSIONS.length];
    state.expressionIndex += 1;
    return pick;
  }

  function ensureAdvancedVisibility() {
    var isPrecision = String(challengeEl.value || '') === 'precision';
    advancedLinkEl.classList.toggle('pp-hidden', !isPrecision);
    if (!isPrecision) advancedPanelEl.hidden = true;
  }

  function buildDeck() {
    var gradeBand = gradeBandEl.value;
    var match = state.cards.filter(function (card) { return card.gradeBand === gradeBand; });
    state.deck = shuffle(match);
  }

  function startTimer() {
    clearInterval(state.timerId);
    var energy = ENERGY[state.config.energy] || ENERGY.medium;
    state.timerSec = energy.seconds;
    timerEl.textContent = state.timerSec + 's';
    state.startedAtMs = Date.now();
    state.timerId = setInterval(function () {
      state.timerSec -= 1;
      timerEl.textContent = Math.max(0, state.timerSec) + 's';
      if (state.timerSec <= 0) {
        clearInterval(state.timerId);
        state.timerId = 0;
        finishRound(false);
      }
    }, 1000);
  }

  function currentRoundNumber() {
    return state.round + 1;
  }

  function updateScoreboard() {
    scoreEl.textContent = String(state.score);
    roundEl.textContent = String(currentRoundNumber());
    modeEl.textContent = state.config.challenge.toUpperCase();
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

  function renderCard(card) {
    state.card = card;
    targetEl.textContent = card.target;
    targetEl.classList.remove('pp-reveal');
    void targetEl.offsetWidth;
    targetEl.classList.add('pp-reveal');

    var forbiddenCount = challengeForbiddenCount(state.config.challenge);
    var words = (card.forbidden || []).slice(0, forbiddenCount);
    forbiddenEl.innerHTML = words.map(function (w) {
      return '<span class="pp-pill">' + escapeHtml(w) + '</span>';
    }).join('');

    var needsMove = state.config.challenge !== 'classic';
    requiredRowEl.classList.toggle('pp-hidden', !needsMove);
    requiredOkRowEl.classList.toggle('pp-hidden', !needsMove);
    requiredTextEl.textContent = card.requiredMove || 'Use one complete sentence frame.';
    requiredOkEl.checked = false;

    var shouldShowMove = needsMove;
    if (state.config.challenge === 'precision') {
      if (state.config.revealTiming === 'teacher') {
        shouldShowMove = false;
      } else if (state.config.revealTiming === 'after') {
        shouldShowMove = false;
        setTimeout(function () {
          if (!state.card || state.card.id !== card.id) return;
          requiredRowEl.classList.remove('pp-hidden');
        }, 1200);
      }
    }
    if (!shouldShowMove) requiredRowEl.classList.add('pp-hidden');

    cueEl.textContent = state.expression;
    cueEl.className = 'pp-cue ' + String(state.expression || '').toLowerCase();
    cueNoteEl.textContent = state.config.lockExpression
      ? 'Expression mode locked for consistency.'
      : ('Mixed sequence: ' + EXPRESSIONS.join(' → '));

    state.canAdvance = true;
    setStatus('Round live. Use the core rule and avoid forbidden words.');
  }

  function scoreRound(success, requiredMet, elapsedSec) {
    if (!success) return 0;
    var mode = state.config.challenge;
    if (mode === 'classic') {
      var speedBonus = elapsedSec <= 20 ? 1 : 0;
      return 1 + speedBonus;
    }
    if (mode === 'guided') {
      return requiredMet ? 2 : 1;
    }
    var base = requiredMet ? 1 : 0;
    var speed = elapsedSec <= 18 ? 0.25 : elapsedSec <= 28 ? 0.1 : 0;
    return Math.round((base + speed) * 100) / 100;
  }

  function logRound(success, requiredMet, elapsedSec) {
    if (!state.config.logging) return;
    var logItem = {
      ts: new Date().toISOString(),
      studentId: getStudentId() || '',
      target: state.card && state.card.target || '',
      gradeBand: state.config.gradeBand,
      expressionType: state.expression,
      challengeLayer: state.config.challenge,
      requiredMoveSuccess: !!requiredMet,
      timeToSuccessSec: Number(elapsedSec || 0),
      success: !!success
    };
    state.logs.push(logItem);
    writeLogs(state.logs);
  }

  function finishRound(success) {
    if (!state.canAdvance) return;
    state.canAdvance = false;
    clearInterval(state.timerId);
    state.timerId = 0;

    var elapsedSec = Math.max(1, Math.round((Date.now() - state.startedAtMs) / 1000));
    var requiredMet = !!requiredOkEl.checked || state.config.challenge === 'classic';
    var gained = scoreRound(success, requiredMet, elapsedSec);
    state.score += gained;
    updateScoreboard();

    logRound(success, requiredMet, elapsedSec);

    if (!success) {
      setStatus('Time up / skipped. No point this round.');
    } else if (state.config.challenge !== 'classic' && !requiredMet) {
      setStatus('Correct guess, but required move was not met.');
    } else {
      setStatus('Round scored +' + gained + '. Ready for next round.');
    }
  }

  function nextRound() {
    clearInterval(state.timerId);
    state.timerId = 0;
    state.round += 1;
    state.expression = expressionForRound(state.config.expressionMode, state.config.lockExpression);
    updateScoreboard();

    var card = getNextCard();
    if (!card) {
      setStatus('No cards available for this grade band.');
      return;
    }
    renderCard(card);
    startTimer();
  }

  function endSession() {
    clearInterval(state.timerId);
    state.timerId = 0;
    gameEl.classList.add('pp-hidden');
    setupEl.classList.remove('pp-hidden');
    setStatus('Session ended. Score: ' + state.score);
  }

  function startSession() {
    state.config = {
      gradeBand: gradeBandEl.value,
      energy: energyEl.value,
      challenge: challengeEl.value,
      expressionMode: expressionModeEl.value,
      lockExpression: !!lockExpressionEl.checked,
      revealTiming: revealTimingEl.value,
      logging: !!logEnabledEl.checked
    };
    state.round = 0;
    state.score = 0;
    state.index = -1;
    state.expressionIndex = 0;
    state.logs = readLogs();

    buildDeck();
    setupEl.classList.add('pp-hidden');
    gameEl.classList.remove('pp-hidden');
    nextRound();
  }

  function escapeHtml(value) {
    return String(value || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function loadCards() {
    return fetch('./precision-play.cards.json', { cache: 'no-cache' })
      .then(function (r) {
        if (!r.ok) throw new Error('Card load failed (' + r.status + ')');
        return r.json();
      })
      .then(function (payload) {
        var cards = payload && Array.isArray(payload.cards) ? payload.cards : [];
        state.cards = cards.filter(function (card) {
          return card && card.id && card.gradeBand && card.target && Array.isArray(card.forbidden);
        });
        if (!state.cards.length) throw new Error('No valid cards found.');
      });
  }

  function bindEvents() {
    challengeEl.addEventListener('change', ensureAdvancedVisibility);
    advancedLinkEl.addEventListener('click', function () {
      advancedPanelEl.hidden = !advancedPanelEl.hidden;
    });
    startBtn.addEventListener('click', startSession);
    guessedBtn.addEventListener('click', function () { finishRound(true); });
    skipBtn.addEventListener('click', function () { finishRound(false); });
    nextBtn.addEventListener('click', nextRound);
    endBtn.addEventListener('click', endSession);

    document.addEventListener('keydown', function (event) {
      if (setupEl.classList.contains('pp-hidden')) {
        if (event.key === 'g' || event.key === 'G') finishRound(true);
        if (event.key === 's' || event.key === 'S') finishRound(false);
        if (event.key === 'n' || event.key === 'N') nextRound();
      }
    });
  }

  function init() {
    bindEvents();
    ensureAdvancedVisibility();
    loadCards()
      .then(function () {
        setStatus('Ready. Pick settings and start.');
      })
      .catch(function (error) {
        setStatus('Unable to load cards: ' + (error && error.message ? error.message : 'Unknown error'));
        startBtn.disabled = true;
      });
  }

  init();
})();
