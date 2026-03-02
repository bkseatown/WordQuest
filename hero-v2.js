(function heroV2Runtime() {
  "use strict";

  if (window.__HERO_ROTATOR_ACTIVE) return;
  window.__HERO_ROTATOR_ACTIVE = true;

  var htmlEl = document.documentElement;
  var homeMode = String(htmlEl && htmlEl.getAttribute('data-home-mode') || '').trim();
  var container = document.getElementById('home-demo-preview');
  var coachEl = document.getElementById('home-demo-coach');
  var ctaWordQuest = document.getElementById('cta-wordquest');
  var ctaTools = document.getElementById('cta-tools');
  if (!container || homeMode !== 'home') return;

  var preview = null;
  var running = false;
  var prefersReducedMotion = false;
  var coachTimer = 0;
  var coachIndex = -1;
  var ctaPulseShown = false;
  var seenColors = { gray: false, yellow: false, green: false };

  var COACH_LINES = [
    'Immediate vowel feedback detected.',
    'Letter-position error corrected in-session.',
    'Adaptive support adjusts next target.',
    'Tier 2 scaffold activated.',
    'Phoneme confusion flagged and reinforced.'
  ];

  try {
    prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  } catch (_e) {
    prefersReducedMotion = false;
  }

  function isDevMode() {
    try {
      var params = new URLSearchParams(window.location.search || '');
      if (String(params.get('env') || '').toLowerCase() === 'dev') return true;
      return localStorage.getItem('cs_allow_dev') === '1';
    } catch (_e) {
      return false;
    }
  }

  function logHomeOverflow() {
    if (!isDevMode()) return;
    var doc = document.documentElement;
    console.debug('[home-demo] overflow', {
      scrollHeight: doc.scrollHeight,
      clientHeight: doc.clientHeight
    });
  }

  function setCoachLine(index) {
    if (!coachEl || index < 0 || index >= COACH_LINES.length) return;
    if (coachIndex === index && coachEl.textContent === COACH_LINES[index]) return;
    coachIndex = index;

    if (!prefersReducedMotion) {
      coachEl.classList.remove('is-updating');
      if (coachTimer) window.clearTimeout(coachTimer);
      // force reflow so repeated updates animate reliably
      void coachEl.offsetWidth;
      coachEl.classList.add('is-updating');
      coachTimer = window.setTimeout(function () {
        coachEl.classList.remove('is-updating');
        coachTimer = 0;
      }, 220);
    }

    coachEl.textContent = COACH_LINES[index];

    if (index === 5 && ctaWordQuest && !ctaPulseShown) {
      ctaPulseShown = true;
      if (!prefersReducedMotion) {
        ctaWordQuest.classList.add('is-ready-pulse');
        window.setTimeout(function () {
          ctaWordQuest.classList.remove('is-ready-pulse');
        }, 260);
      }
    }
  }

  function onPreviewEvent(event) {
    if (!event || typeof event !== 'object') return;
    var type = String(event.type || '');
    if (type === 'round:start') {
      seenColors.gray = false;
      seenColors.yellow = false;
      seenColors.green = false;
      setCoachLine(0);
      return;
    }
    if (type === 'tile:state') {
      var state = String(event.detail && event.detail.state || '');
      if (state === 'is-gray' && !seenColors.gray) {
        seenColors.gray = true;
        setCoachLine(4);
      } else if (state === 'is-yellow' && seenColors.gray && !seenColors.yellow) {
        seenColors.yellow = true;
        setCoachLine(0);
      } else if (state === 'is-green' && seenColors.yellow && !seenColors.green) {
        seenColors.green = true;
        setCoachLine(1);
      }
      return;
    }
    if (type === 'round:first-feedback') {
      if (!seenColors.green) {
        seenColors.green = true;
        setCoachLine(2);
      }
      return;
    }
    if (type === 'round:strategy') {
      setCoachLine(2);
      return;
    }
    if (type === 'round:complete') {
      setCoachLine(3);
      return;
    }
    if (type === 'round:loop-reset') {
      setCoachLine((coachIndex + 1) % COACH_LINES.length);
    }
  }

  function mountWordQuestPreview(target, options) {
    if (!(target instanceof HTMLElement)) return null;
    if (!window.WordQuestPreview || typeof window.WordQuestPreview.create !== 'function') return null;
    return window.WordQuestPreview.create(target, options || {});
  }

  function pause() {
    running = false;
    if (preview && typeof preview.stop === 'function') preview.stop();
  }

  function resume() {
    if (running || document.hidden) return;
    running = true;
    if (preview && typeof preview.start === 'function') preview.start();
  }

  preview = mountWordQuestPreview(container, {
    mode: 'hero',
    loop: true,
    resetDelayMs: 1100,
    resetFadeMs: prefersReducedMotion ? 0 : 250,
    onEvent: onPreviewEvent
  });

  setCoachLine(0);
  resume();

  document.addEventListener('visibilitychange', function () {
    if (document.hidden) pause();
    else resume();
  });

  if (ctaWordQuest) {
    ctaWordQuest.addEventListener('click', function () {
      var routeHandled = false;
      var event = new CustomEvent('cs-home-cta-wordquest', { cancelable: true });
      window.dispatchEvent(event);
      if (event.defaultPrevented || window.__CS_HOME_ROUTED__ === true) routeHandled = true;
      if (!routeHandled) {
        window.location.href = 'word-quest.html?play=1';
      }
    });
  }

  if (ctaTools) {
    ctaTools.addEventListener('click', function () {
      var routeHandled = false;
      var event = new CustomEvent('cs-home-cta-tools', { cancelable: true });
      window.dispatchEvent(event);
      if (event.defaultPrevented || window.__CS_HOME_ROUTED__ === true) routeHandled = true;
      if (!routeHandled) {
        window.location.href = 'teacher-dashboard.html';
      }
    });
  }

  window.addEventListener('resize', logHomeOverflow, { passive: true });
  logHomeOverflow();
  window.setTimeout(logHomeOverflow, 180);

  window.addEventListener('beforeunload', function () {
    pause();
    if (preview && typeof preview.destroy === 'function') preview.destroy();
    window.__HERO_ROTATOR_ACTIVE = false;
  });
})();
