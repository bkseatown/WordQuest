(function heroV2Runtime() {
  "use strict";

  if (window.__HERO_ROTATOR_ACTIVE) return;
  window.__HERO_ROTATOR_ACTIVE = true;

  var container = document.getElementById('home-demo-preview');
  var ctaWordQuest = document.getElementById('cta-wordquest');
  var ctaTools = document.getElementById('cta-tools');
  if (!container) return;

  var ROTATE_MS = 10000;
  var FADE_MS = 250;
  var timers = [];
  var rotateIntervalId = 0;
  var currentIndex = 0;
  var running = true;
  var prefersReducedMotion = false;

  try {
    prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  } catch (_e) {
    prefersReducedMotion = false;
  }

  function setTimer(fn, ms) {
    var id = window.setTimeout(fn, ms);
    timers.push(id);
    return id;
  }

  function clearTimers() {
    while (timers.length) {
      window.clearTimeout(timers.pop());
    }
  }

  function createPane(className) {
    var pane = document.createElement('div');
    pane.className = 'hero-preview-pane ' + className;
    container.appendChild(pane);
    return pane;
  }

  var paneWordQuest = createPane('hero-pane-wq');
  var paneSentence = createPane('hero-pane-sentence');
  var paneParagraph = createPane('hero-pane-paragraph');
  var panes = [paneWordQuest, paneSentence, paneParagraph];

  function mountWordQuestPreview(target) {
    if (!(target instanceof HTMLElement)) return null;
    if (!window.WordQuestPreview || typeof window.WordQuestPreview.create !== 'function') return null;
    return window.WordQuestPreview.create(target);
  }

  var wqPreview = mountWordQuestPreview(paneWordQuest);

  paneSentence.innerHTML = [
    '<div class="hero-preview-title">Sentence Growth Engine</div>',
    '<div class="hero-sentence" id="heroSentenceText">The dog ran.</div>',
    '<div class="hero-level" id="heroSentenceLevel">Level 1</div>',
    '<div class="hero-metric-list">',
    '  <div class="hero-metric"><span>Reasoning</span><div class="hero-track"><div id="heroSentenceReasonFill" class="hero-fill"></div></div></div>',
    '  <div class="hero-metric"><span>Detail</span><div class="hero-track"><div id="heroSentenceDetailFill" class="hero-fill"></div></div></div>',
    '</div>'
  ].join('');

  paneParagraph.innerHTML = [
    '<div class="hero-preview-title">Paragraph Builder</div>',
    '<div class="hero-pb-slot" id="heroPbTopic"></div>',
    '<div class="hero-pb-slot" id="heroPbBody1"></div>',
    '<div class="hero-pb-slot" id="heroPbBody2"></div>',
    '<div class="hero-pb-slot" id="heroPbConclusion"></div>',
    '<div class="hero-metric-list">',
    '  <div class="hero-metric"><span>Cohesion</span><div class="hero-track"><div id="heroPbCohesionFill" class="hero-fill"></div></div></div>',
    '  <div class="hero-metric"><span>Reasoning</span><div class="hero-track"><div id="heroPbReasonFill" class="hero-fill"></div></div></div>',
    '</div>'
  ].join('');

  function setActivePane(index) {
    panes.forEach(function (pane, i) {
      pane.classList.toggle('is-active', i === index);
    });
  }

  function runSentencePreview() {
    var textEl = document.getElementById('heroSentenceText');
    var levelEl = document.getElementById('heroSentenceLevel');
    var reasonFill = document.getElementById('heroSentenceReasonFill');
    var detailFill = document.getElementById('heroSentenceDetailFill');
    if (!textEl || !levelEl || !reasonFill || !detailFill) return;

    textEl.textContent = 'The dog ran.';
    levelEl.textContent = 'Level 1';
    reasonFill.style.width = '10%';
    detailFill.style.width = '18%';

    setTimer(function () {
      if (!running || document.hidden) return;
      textEl.textContent = 'The dog ran because it heard a crash.';
      levelEl.textContent = 'Level 3';
      reasonFill.style.width = '72%';
      detailFill.style.width = '46%';
    }, prefersReducedMotion ? 0 : 1600);

    setTimer(function () {
      if (!running || document.hidden) return;
      textEl.textContent = 'The dog sprinted because it heard a crash.';
      levelEl.textContent = 'Level 4';
      reasonFill.style.width = '84%';
      detailFill.style.width = '64%';
    }, prefersReducedMotion ? 0 : 3600);
  }

  function runParagraphPreview() {
    var topic = document.getElementById('heroPbTopic');
    var body1 = document.getElementById('heroPbBody1');
    var body2 = document.getElementById('heroPbBody2');
    var conclusion = document.getElementById('heroPbConclusion');
    var cohesionFill = document.getElementById('heroPbCohesionFill');
    var reasonFill = document.getElementById('heroPbReasonFill');
    if (!topic || !body1 || !body2 || !conclusion || !cohesionFill || !reasonFill) return;

    topic.textContent = '';
    body1.textContent = '';
    body2.textContent = '';
    conclusion.textContent = '';
    cohesionFill.style.width = '0%';
    reasonFill.style.width = '0%';

    setTimer(function () { if (!running || document.hidden) return; topic.textContent = 'Dogs help people.'; }, prefersReducedMotion ? 0 : 900);
    setTimer(function () { if (!running || document.hidden) return; body1.textContent = 'They work as companions in hospitals.'; }, prefersReducedMotion ? 0 : 1900);
    setTimer(function () { if (!running || document.hidden) return; body2.textContent = 'Because they comfort patients, recovery improves.'; }, prefersReducedMotion ? 0 : 3000);
    setTimer(function () { if (!running || document.hidden) return; conclusion.textContent = 'Dogs make a meaningful difference.'; }, prefersReducedMotion ? 0 : 4100);
    setTimer(function () {
      if (!running || document.hidden) return;
      cohesionFill.style.width = '80%';
      reasonFill.style.width = '88%';
    }, prefersReducedMotion ? 0 : 5200);
  }

  function runActivePreview() {
    clearTimers();
    if (!running || document.hidden) return;

    if (wqPreview) {
      if (currentIndex === 0) wqPreview.start();
      else wqPreview.stop();
    }

    if (currentIndex === 1) runSentencePreview();
    if (currentIndex === 2) runParagraphPreview();
  }

  function pause() {
    running = false;
    clearTimers();
    if (rotateIntervalId) {
      window.clearInterval(rotateIntervalId);
      rotateIntervalId = 0;
    }
    if (wqPreview) wqPreview.stop();
  }

  function resume() {
    if (document.hidden) return;
    running = true;
    setActivePane(currentIndex);
    runActivePreview();
    if (!rotateIntervalId) {
      rotateIntervalId = window.setInterval(function () {
        if (!running || document.hidden) return;
        currentIndex = (currentIndex + 1) % panes.length;
        setActivePane(currentIndex);
        runActivePreview();
      }, ROTATE_MS);
    }
  }

  document.addEventListener('visibilitychange', function () {
    if (document.hidden) pause();
    else resume();
  });

  if (ctaWordQuest) {
    ctaWordQuest.addEventListener('click', function () {
      window.location.href = 'word-quest.html?play=1';
    });
  }

  if (ctaTools) {
    ctaTools.addEventListener('click', function () {
      var section = document.getElementById('home-tools-section');
      if (!section) return;
      section.classList.remove('hidden');
      section.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  }

  window.addEventListener('beforeunload', function () {
    pause();
    window.__HERO_ROTATOR_ACTIVE = false;
  });

  setActivePane(0);
  resume();
})();
