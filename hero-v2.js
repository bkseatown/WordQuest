(function heroV2Runtime() {
  "use strict";

  if (window.__HERO_ROTATOR_ACTIVE) return;
  window.__HERO_ROTATOR_ACTIVE = true;

  function withAppBase(path) {
    var p = String((window.location && window.location.pathname) || "");
    var marker = "/WordQuest/";
    var idx = p.indexOf(marker);
    var base = idx >= 0 ? p.slice(0, idx + marker.length - 1) : "";
    var clean = String(path || "").replace(/^\.?\//, "");
    return base + "/" + clean;
  }

  var htmlEl = document.documentElement;
  var homeMode = String(htmlEl && htmlEl.getAttribute('data-home-mode') || '').trim();
  var container = document.getElementById('home-demo-preview');
  var ctaDashboard = document.getElementById('cta-dashboard');
  var ctaWordQuest = document.getElementById('cta-wordquest-link');
  if (!container || homeMode !== 'home') return;

  var preview = null;
  var running = false;
  var prefersReducedMotion = false;

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
    resetDelayMs: 1900,
    typeDelayMs: 140,
    preFlipDelayMs: 560,
    flipDurationMs: 190,
    flipGapMs: 190,
    betweenGuessDelayMs: 560,
    writingLineDelayMs: 460,
    writingScoreDelayMs: 600,
    resetFadeMs: prefersReducedMotion ? 0 : 250
  });

  resume();

  document.addEventListener('visibilitychange', function () {
    if (document.hidden) pause();
    else resume();
  });

  if (ctaDashboard) {
    ctaDashboard.addEventListener('click', function () {
      var routeHandled = false;
      var event = new CustomEvent('cs-home-cta-tools', { cancelable: true });
      window.dispatchEvent(event);
      if (event.defaultPrevented || window.__CS_HOME_ROUTED__ === true) routeHandled = true;
      if (!routeHandled) {
        window.location.href = withAppBase('reports.html');
      }
    });
  }

  if (ctaWordQuest) {
    ctaWordQuest.addEventListener('click', function () {
      var routeHandled = false;
      var event = new CustomEvent('cs-home-cta-wordquest', { cancelable: true });
      window.dispatchEvent(event);
      if (event.defaultPrevented || window.__CS_HOME_ROUTED__ === true) routeHandled = true;
      if (!routeHandled) {
        window.location.href = withAppBase('word-quest.html?play=1#wordquest');
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
