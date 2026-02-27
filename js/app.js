/**
 * app.js — Word Quest v2
 * Entry point. Wires all modules together.
 * Features: theme, projector mode, reduced motion, voice picker,
 * dismissible duplicate-letter toast, confetti, "Hear Word/Sentence"
 * during gameplay.
 */

(async () => {
  const DEMO_WORDS = Object.freeze(['plant', 'crane', 'shine', 'brave', 'grasp']);
  const DEMO_TARGET_WORD = DEMO_WORDS[0];
  function detectDemoMode() {
    let fromQuery = false;
    try {
      const params = new URLSearchParams(window.location.search || '');
      const demoParam = String(params.get('demo') || '').trim().toLowerCase();
      const modeParam = String(params.get('mode') || '').trim().toLowerCase();
      fromQuery = demoParam === '1' || demoParam === 'true' || modeParam === 'demo';
    } catch {}
    return fromQuery || window.WQ_DEMO === true;
  }
  const DEMO_MODE = detectDemoMode();
  const isDevModeEnabled = (() => {
    const fallback = () => {
      try {
        const params = new URLSearchParams(window.location.search || '');
        if (String(params.get('env') || '').toLowerCase() === 'dev') return true;
      } catch {}
      try {
        return localStorage.getItem('cs_allow_dev') === '1';
      } catch {
        return false;
      }
    };
    if (window.CSAppMode && typeof window.CSAppMode.isDevMode === 'function') {
      return () => !!window.CSAppMode.isDevMode();
    }
    return fallback;
  })();
  const DEMO_DEBUG_MODE = (() => {
    try {
      const params = new URLSearchParams(window.location.search || '');
      return String(params.get('debug') || '').trim() === '1';
    } catch {
      return false;
    }
  })();

  function collectOverflowDiagnostics(limit = 10) {
    const viewportH = document.documentElement.clientHeight || window.innerHeight || 0;
    const viewportW = document.documentElement.clientWidth || window.innerWidth || 0;
    const nodes = Array.from(document.body ? document.body.querySelectorAll('*') : []);
    const offenders = [];
    for (let i = 0; i < nodes.length; i += 1) {
      const el = nodes[i];
      if (!el || !el.getBoundingClientRect) continue;
      const style = getComputedStyle(el);
      if (!style || style.display === 'none' || style.visibility === 'hidden') continue;
      if (style.position === 'fixed') continue;
      const rect = el.getBoundingClientRect();
      if (!Number.isFinite(rect.bottom) || rect.height <= 0) continue;
      if (rect.right <= 0 || rect.left >= viewportW) continue;
      offenders.push({
        tag: el.tagName ? el.tagName.toLowerCase() : 'node',
        id: el.id || '',
        className: typeof el.className === 'string'
          ? el.className.trim().split(/\s+/).filter(Boolean).slice(0, 3).join('.')
          : '',
        bottom: Math.round(rect.bottom * 100) / 100,
        top: Math.round(rect.top * 100) / 100,
        marginTop: style.marginTop,
        marginBottom: style.marginBottom
      });
    }
    offenders.sort((a, b) => b.bottom - a.bottom);
    return offenders.slice(0, Math.max(1, limit));
  }

  function logOverflowDiagnostics(tag) {
    if (!isDevModeEnabled()) return;
    requestAnimationFrame(() => {
      const docEl = document.documentElement;
      const body = document.body;
      const viewportH = docEl ? docEl.clientHeight : window.innerHeight;
      const metrics = {
        tag: String(tag || 'runtime'),
        homeMode: document.documentElement.getAttribute('data-home-mode') || 'n/a',
        pageMode: document.documentElement.getAttribute('data-page-mode') || 'n/a',
        viewport: `${Math.round(window.innerWidth)}x${Math.round(window.innerHeight)}`,
        docScrollHeight: docEl ? docEl.scrollHeight : 0,
        docClientHeight: docEl ? docEl.clientHeight : 0,
        bodyScrollHeight: body ? body.scrollHeight : 0,
        bodyClientHeight: body ? body.clientHeight : 0
      };
      const overflow = Math.max(
        metrics.docScrollHeight - metrics.docClientHeight,
        metrics.bodyScrollHeight - metrics.bodyClientHeight
      );
      if (overflow <= 0) {
        console.info('[WQ Overflow Diagnostics]', metrics, 'overflow=0');
        return;
      }
      const offenders = collectOverflowDiagnostics(8).filter((entry) => entry.bottom > viewportH - 1);
      console.groupCollapsed(`[WQ Overflow Diagnostics] ${metrics.tag} overflow=${overflow}px`);
      console.table(metrics);
      if (offenders.length) {
        console.table(offenders);
      } else {
        console.info('No visible non-fixed offenders exceeded viewport bottom.');
      }
      console.groupEnd();
    });
  }
  if (DEMO_MODE) {
    // Mark demo initialization; do not early-return the app bootstrap.
    window.__CS_DEMO_INIT_DONE = true;
    window.WQ_DEMO = true;
    document.documentElement.setAttribute('data-wq-demo', 'on');
    window.__CS_DEMO_STATE = window.__CS_DEMO_STATE || {
      step: 0,
      active: true,
      started: false
    };
    window.__CS_DEMO_TIMERS = window.__CS_DEMO_TIMERS || new Set();
  }

  function normalizeDemoRoute() {
    if (!DEMO_MODE) return false;
    try {
      const url = new URL(window.location.href);
      const pageParam = String(url.searchParams.get('page') || '').trim().toLowerCase();
      const demoParam = String(url.searchParams.get('demo') || '').trim().toLowerCase();
      const modeParam = String(url.searchParams.get('mode') || '').trim().toLowerCase();
      const needsFix =
        pageParam !== 'wordquest' ||
        (demoParam !== '1' && demoParam !== 'true') ||
        modeParam === 'demo';
      if (!needsFix) return false;
      url.searchParams.set('page', 'wordquest');
      url.searchParams.set('demo', '1');
      url.searchParams.delete('mode');
      window.location.replace(url.toString());
      return true;
    } catch {
      return false;
    }
  }
  if (normalizeDemoRoute()) return;

  function getDemoState() {
    if (!window.__CS_DEMO_STATE) {
      window.__CS_DEMO_STATE = { step: 0, active: true, started: false };
    }
    return window.__CS_DEMO_STATE;
  }

  function demoSetTimeout(callback, ms) {
    const timers = window.__CS_DEMO_TIMERS || (window.__CS_DEMO_TIMERS = new Set());
    const id = window.setTimeout(() => {
      timers.delete(id);
      callback();
    }, ms);
    timers.add(id);
    return id;
  }

  function demoClearTimers() {
    const timers = window.__CS_DEMO_TIMERS || (window.__CS_DEMO_TIMERS = new Set());
    timers.forEach((id) => clearTimeout(id));
    timers.clear();
  }

  function installDemoStorageGuard() {
    if (!DEMO_MODE || window.__WQ_DEMO_STORAGE_GUARD__) return;
    window.__WQ_DEMO_STORAGE_GUARD__ = true;
    const noop = () => {};
    try { localStorage.setItem = noop; } catch {}
    try { localStorage.removeItem = noop; } catch {}
    try { localStorage.clear = noop; } catch {}
    try {
      const storageProto = Object.getPrototypeOf(localStorage);
      if (storageProto) {
        storageProto.setItem = noop;
        storageProto.removeItem = noop;
        storageProto.clear = noop;
      }
    } catch {}
  }

  function installDemoFetchGuard() {
    if (!DEMO_MODE || window.__WQ_DEMO_FETCH_GUARD__ || typeof window.fetch !== 'function') return;
    window.__WQ_DEMO_FETCH_GUARD__ = true;
    const nativeFetch = window.fetch.bind(window);
    window.fetch = (input, init = {}) => {
      const method = String(init?.method || 'GET').trim().toUpperCase() || 'GET';
      let targetUrl = '';
      try {
        targetUrl = String(input?.url || input || '');
      } catch {
        targetUrl = '';
      }
      let isSameOrigin = true;
      try {
        const parsed = new URL(targetUrl, window.location.href);
        isSameOrigin = parsed.origin === window.location.origin;
      } catch {}
      if (method !== 'GET' || !isSameOrigin) {
        return Promise.resolve(new Response('{}', {
          status: 200,
          headers: { 'content-type': 'application/json' }
        }));
      }
      return nativeFetch(input, init);
    };
  }

  installDemoStorageGuard();
  installDemoFetchGuard();

  // ─── 1. Load data ──────────────────────────────────
  const loadingEl = document.getElementById('loading-screen');
  const LOADING_WATCHDOG_MS = 18000;
  let loadingRecoveryShown = false;

  function buildCacheBustedUrl() {
    const nextUrl = new URL(location.href);
    nextUrl.searchParams.set('cb', String(Date.now()));
    return nextUrl.toString();
  }

  async function clearRuntimeCacheAndReload() {
    if (typeof window !== 'undefined') window.__WQ_LOADING_RECOVERY_RUNNING__ = true;
    try {
      if ('caches' in window) {
        const names = await caches.keys();
        const targets = names.filter((name) => String(name || '').startsWith('wq-'));
        if (targets.length) await Promise.all(targets.map((name) => caches.delete(name)));
      }
    } catch {}
    try {
      if ('serviceWorker' in navigator) {
        const registrations = await navigator.serviceWorker.getRegistrations();
        if (registrations.length) {
          await Promise.all(registrations.map((registration) => registration.unregister().catch(() => false)));
        }
      }
    } catch {}
    try { sessionStorage.removeItem('wq_sw_controller_reloaded'); } catch {}
    location.replace(buildCacheBustedUrl());
  }

  function showLoadingRecovery(message) {
    if (!loadingEl || loadingRecoveryShown) return;
    loadingRecoveryShown = true;
    const label = loadingEl.querySelector('span');
    if (label) label.textContent = String(message || 'Still loading...');
    const panel = document.createElement('div');
    panel.className = 'loading-recovery-panel';

    const detail = document.createElement('p');
    detail.className = 'loading-recovery-text';
    detail.textContent = 'This tab may be on an older cached build.';
    panel.appendChild(detail);

    const actions = document.createElement('div');
    actions.className = 'loading-recovery-actions';

    const resetBtn = document.createElement('button');
    resetBtn.type = 'button';
    resetBtn.className = 'loading-recovery-btn loading-recovery-btn-primary';
    resetBtn.textContent = 'Reset App Cache';
    resetBtn.addEventListener('click', async () => {
      resetBtn.disabled = true;
      resetBtn.textContent = 'Resetting...';
      await clearRuntimeCacheAndReload();
    });
    actions.appendChild(resetBtn);

    const retryBtn = document.createElement('button');
    retryBtn.type = 'button';
    retryBtn.className = 'loading-recovery-btn';
    retryBtn.textContent = 'Reload';
    retryBtn.addEventListener('click', () => {
      location.replace(buildCacheBustedUrl());
    });
    actions.appendChild(retryBtn);
    panel.appendChild(actions);
    loadingEl.appendChild(panel);
  }

  loadingEl?.classList.remove('hidden');
  const loadingWatchdog = setTimeout(() => {
    showLoadingRecovery('Still loading. You can repair this tab.');
  }, LOADING_WATCHDOG_MS);
  try {
    await WQData.load();
    clearTimeout(loadingWatchdog);
  } catch (error) {
    clearTimeout(loadingWatchdog);
    console.warn('[WordQuest] Data load failed:', error?.message || error);
    showLoadingRecovery('Load failed. Repair cache and retry.');
    return;
  }
  loadingEl?.classList.add('hidden');

  // ─── 2. Init UI ────────────────────────────────────
  WQUI.init();

  const APP_SEMVER = '1.0.0';
  const SW_RUNTIME_VERSION = '20260225-v10';
  const SW_RUNTIME_URL = `./sw-runtime.js?v=${encodeURIComponent(SW_RUNTIME_VERSION)}`;

  async function registerOfflineRuntime() {
    if (DEMO_MODE) return;
    if (!('serviceWorker' in navigator)) return;
    if (!window.isSecureContext && location.hostname !== 'localhost' && location.hostname !== '127.0.0.1') {
      return;
    }
    try {
      const runtimeCheck = await fetch(SW_RUNTIME_URL, { cache: 'no-store' });
      if (!runtimeCheck.ok) {
        console.info('[WordQuest] Service worker runtime unavailable; skipping registration.');
        return;
      }
      let shouldAttachReloadListener = true;
      try {
        shouldAttachReloadListener = sessionStorage.getItem('wq_sw_controller_reloaded') !== '1';
      } catch {
        shouldAttachReloadListener = true;
      }
      if (shouldAttachReloadListener) {
        navigator.serviceWorker.addEventListener('controllerchange', () => {
          let alreadyReloaded = false;
          try {
            alreadyReloaded = sessionStorage.getItem('wq_sw_controller_reloaded') === '1';
          } catch {
            alreadyReloaded = false;
          }
          if (alreadyReloaded) return;
          try {
            sessionStorage.setItem('wq_sw_controller_reloaded', '1');
          } catch {}
          location.reload();
        }, { once: true });
      }
      const registration = await navigator.serviceWorker.register(SW_RUNTIME_URL, {
        scope: './',
        updateViaCache: 'none'
      });
      registration.addEventListener('updatefound', () => {
        const installing = registration.installing;
        if (!installing) return;
        installing.addEventListener('statechange', () => {
          if (installing.state === 'installed' && navigator.serviceWorker.controller) {
            installing.postMessage({ type: 'WQ_SKIP_WAITING' });
          }
        });
      });
      if (registration.waiting) {
        registration.waiting.postMessage({ type: 'WQ_SKIP_WAITING' });
      }
      registration.update().catch(() => {});
    } catch (error) {
      console.warn('[WordQuest] Service worker registration skipped:', error?.message || error);
    }
  }
  void registerOfflineRuntime();

  // ─── 3. Preferences ────────────────────────────────
  const PREF_KEY = 'wq_v2_prefs';
  const PREF_MIGRATION_KEY = 'wq_v2_pref_defaults_20260222';
  const PREF_UI_SKIN_RESET_MIGRATION_KEY = 'wq_v2_pref_ui_skin_default_20260226a';
  const PREF_MUSIC_AUTO_MIGRATION_KEY = 'wq_v2_pref_music_auto_20260222';
  const PREF_GUESSES_DEFAULT_MIGRATION_KEY = 'wq_v2_pref_guesses_default_20260224';
  const FIRST_RUN_SETUP_KEY = 'wq_v2_first_run_setup_v1';
  const SESSION_SUMMARY_KEY = 'wq_v2_teacher_session_summary_v1';
  const ROSTER_STATE_KEY = 'wq_v2_teacher_roster_v1';
  const PROBE_HISTORY_KEY = 'wq_v2_weekly_probe_history_v1';
  const STUDENT_GOALS_KEY = 'wq_v2_student_goals_v1';
  const PLAYLIST_STATE_KEY = 'wq_v2_assignment_playlists_v1';
  const WRITING_STUDIO_RETURN_KEY = 'ws_return_to_wordquest_v1';
  const EVENT_BUS_EVENTS = window.WQEventBusContract?.events || {};
  const TEACHER_ASSIGNMENTS_CONTRACT = window.WQTeacherAssignmentsContract || {};
  const DEEP_DIVE_CONTRACT = window.WQDeepDiveContract || {};
  const SHUFFLE_BAG_KEY = 'wq_v2_shuffle_bag';
  const REVIEW_QUEUE_KEY = 'wq_v2_spaced_review_queue_v1';
  const TELEMETRY_QUEUE_KEY = 'wq_v2_telemetry_queue_v1';
  const DIAGNOSTICS_LAST_RESET_KEY = 'wq_v2_diag_last_reset_v1';
  const PAGE_MODE_KEY = 'wq_v2_page_mode_v1';
  const LAST_NON_OFF_MUSIC_KEY = 'wq_v2_last_non_off_music_v1';
  const FEATURE_FLAGS = window.WQFeatureFlags || {};
  const WRITING_STUDIO_ENABLED = FEATURE_FLAGS.writingStudio === true;
  const MISSION_LAB_ENABLED = true;
  const MIDGAME_BOOST_ENABLED = false;
  const REVIEW_QUEUE_MAX_ITEMS = 36;
  const ALLOWED_MUSIC_MODES = new Set([
    'auto',
    'deepfocus',
    'classicalbeats',
    'nerdcore',
    'focus',
    'chill',
    'lofi',
    'coffee',
    'fantasy',
    'scifi',
    'upbeat',
    'arcade',
    'sports',
    'stealth',
    'team',
    'off'
  ]);
  const ALLOWED_VOICE_MODES = new Set(['recorded', 'auto', 'device', 'off']);
  const MUSIC_LABELS = Object.freeze({
    auto: 'Auto',
    deepfocus: 'Deep Focus',
    classicalbeats: 'Classical Beats',
    nerdcore: 'Nerdcore Instrumental',
    focus: 'Focus Flow',
    chill: 'Chill',
    lofi: 'Lo-fi',
    coffee: 'Coffeehouse',
    fantasy: 'Fantasy',
    scifi: 'Sci-fi',
    upbeat: 'Upbeat',
    arcade: '8-bit Arcade',
    sports: 'Sports Hype',
    stealth: 'Space Mystery',
    team: 'Team Game Hype',
    off: 'Off'
  });
  const QUICK_MUSIC_VIBE_ORDER = Object.freeze([
    'deepfocus',
    'classicalbeats',
    'nerdcore',
    'focus',
    'chill',
    'lofi',
    'coffee',
    'fantasy',
    'scifi',
    'upbeat',
    'arcade',
    'sports',
    'stealth',
    'team'
  ]);
  const DEFAULT_PREFS = Object.freeze({
    focus: 'all',
    lessonPack: 'custom',
    lessonTarget: 'custom',
    grade: 'all',
    length: '5',
    guesses: '6',
    caseMode: 'lower',
    hint: 'on',
    playStyle: 'detective',
    confidenceCoaching: 'off',
    revealFocus: 'on',
    revealPacing: 'guided',
    revealAutoNext: 'off',
    dupe: 'on',
    confetti: 'on',
    projector: 'on',
    motion: 'fun',
    feedback: 'themed',
    meaningPlusFun: 'on',
    sorNotation: 'on',
    voicePractice: 'optional',
    teamMode: 'off',
    teamCount: '2',
    turnTimer: 'off',
    probeRounds: '3',
    reportCompact: 'off',
    assessmentLock: 'off',
    boostPopups: 'off',
    starterWords: 'after_3',
    music: 'off',
    musicVol: '0.50',
    voice: 'recorded',
    themeSave: 'off',
    boardStyle: 'card',
    keyStyle: 'bubble',
    keyboardLayout: 'standard',
    chunkTabs: 'auto',
    atmosphere: 'minimal',
    uiSkin: 'classic',
    textSize: 'medium'
  });
  const SAFE_DEFAULT_GRADE_BAND = 'K-2';
  const ALLOWED_MASTERY_SORT_MODES = new Set([
    'attempts_desc',
    'accuracy_desc',
    'hint_rate_desc',
    'voice_desc',
    'top_error'
  ]);
  const ALLOWED_MASTERY_FILTER_MODES = new Set([
    'all',
    'needs_support',
    'high_hints',
    'vowel_pattern',
    'blend_position',
    'morpheme_ending',
    'context_strategy'
  ]);
  const ALLOWED_KEY_STYLES = new Set([
    'bubble',
    'classic',
    'arcade',
    'soundcard',
    'typewriter',
    'pebble'
  ]);
  const KEYBOARD_LAYOUT_ORDER = Object.freeze([
    'standard',
    'alphabet'
  ]);
  const ALLOWED_KEYBOARD_LAYOUTS = new Set([
    ...KEYBOARD_LAYOUT_ORDER
  ]);
  const KEYBOARD_LAYOUT_LABELS = Object.freeze({
    standard: 'QWERTY',
    alphabet: 'Alphabet'
  });
  const STARTER_WORD_SUPPORT_MODES = new Set(['off', 'on_demand', 'after_2', 'after_3']);
  const ALLOWED_UI_SKINS = new Set(['premium', 'classic']);
  const KEYBOARD_PRESET_CONFIG = Object.freeze({
    'qwerty-bubble': Object.freeze({
      id: 'qwerty-bubble',
      layout: 'standard',
      keyStyle: 'bubble',
      label: 'QWERTY · Puffy Rounded'
    }),
    'alphabet-bubble': Object.freeze({
      id: 'alphabet-bubble',
      layout: 'alphabet',
      keyStyle: 'bubble',
      label: 'Alphabet · Puffy Rounded'
    })
  });

  function normalizeKeyboardLayout(mode) {
    const raw = String(mode || '').trim().toLowerCase();
    if (raw === 'qwerty') return 'standard';
    if (raw === 'alpha' || raw === 'abc') return 'alphabet';
    return ALLOWED_KEYBOARD_LAYOUTS.has(raw) ? raw : DEFAULT_PREFS.keyboardLayout;
  }

  function normalizeStarterWordMode(mode) {
    const raw = String(mode || '').trim().toLowerCase();
    if (raw === 'ondemand') return 'on_demand';
    if (raw === 'auto2' || raw === 'after2') return 'after_2';
    if (raw === 'auto3' || raw === 'after3') return 'after_3';
    return STARTER_WORD_SUPPORT_MODES.has(raw) ? raw : DEFAULT_PREFS.starterWords;
  }

  function normalizeUiSkin(mode) {
    const raw = String(mode || '').trim().toLowerCase();
    return ALLOWED_UI_SKINS.has(raw) ? raw : DEFAULT_PREFS.uiSkin;
  }

  function normalizeTextSize(mode) {
    const raw = String(mode || '').trim().toLowerCase();
    if (raw === 'small' || raw === 'large') return raw;
    return 'medium';
  }

  function getKeyboardLayoutLabel(mode) {
    const normalized = normalizeKeyboardLayout(mode);
    return KEYBOARD_LAYOUT_LABELS[normalized] || 'QWERTY';
  }

  function getNextKeyboardLayout(currentLayout) {
    const normalized = normalizeKeyboardLayout(currentLayout);
    const currentIndex = KEYBOARD_LAYOUT_ORDER.indexOf(normalized);
    const safeIndex = currentIndex >= 0 ? currentIndex : 0;
    return KEYBOARD_LAYOUT_ORDER[(safeIndex + 1) % KEYBOARD_LAYOUT_ORDER.length];
  }

  function normalizeKeyboardPresetId(mode) {
    const raw = String(mode || '').trim().toLowerCase();
    if (Object.prototype.hasOwnProperty.call(KEYBOARD_PRESET_CONFIG, raw)) return raw;
    return 'qwerty-bubble';
  }

  function deriveKeyboardPresetId(layoutMode, keyStyleMode) {
    const layout = normalizeKeyboardLayout(layoutMode);
    const family = layout === 'alphabet' ? 'alphabet' : 'qwerty';
    return normalizeKeyboardPresetId(`${family}-bubble`);
  }

  function detectPreferredKeyboardLayout() {
    return 'standard';
  }

  const preferredInitialKeyboardLayout = detectPreferredKeyboardLayout();

  function loadPrefs() {
    try { return JSON.parse(localStorage.getItem(PREF_KEY) || '{}'); } catch { return {}; }
  }
  function savePrefs(p) {
    if (DEMO_MODE) return;
    const normalized = p && typeof p === 'object' ? { ...p } : {};
    delete normalized.lessonPack;
    delete normalized.lessonTarget;
    try { localStorage.setItem(PREF_KEY, JSON.stringify(normalized)); } catch {}
  }
  const prefs = loadPrefs();

  if (Object.prototype.hasOwnProperty.call(prefs, 'lessonPack') || Object.prototype.hasOwnProperty.call(prefs, 'lessonTarget')) {
    delete prefs.lessonPack;
    delete prefs.lessonTarget;
    savePrefs(prefs);
  }

  // Curriculum pack/target are session-only: always start from defaults on load.
  prefs.lessonPack = DEFAULT_PREFS.lessonPack;
  prefs.lessonTarget = DEFAULT_PREFS.lessonTarget;

  function setPref(k, v) { prefs[k] = v; savePrefs(prefs); }
  let autoPhysicalKeyboardSwitchApplied = false;
  let firstRunSetupPending = false;
  let pageMode = 'wordquest';
  let homeMode = 'home';
  let focusSupportUnlockAt = 0;
  let focusSupportUnlockTimer = 0;
  let focusSupportUnlockedByMiss = false;

  // One-time baseline migration so existing installs land on your intended defaults.
  if (localStorage.getItem(PREF_MIGRATION_KEY) !== 'done') {
    if (prefs.length === undefined || prefs.length === 'any') prefs.length = DEFAULT_PREFS.length;
    if (prefs.guesses === undefined) prefs.guesses = DEFAULT_PREFS.guesses;
    if (prefs.feedback === undefined || prefs.feedback === 'classic') prefs.feedback = DEFAULT_PREFS.feedback;
    if (prefs.music === undefined || prefs.music === 'off') prefs.music = DEFAULT_PREFS.music;
    if (prefs.musicVol === undefined) prefs.musicVol = DEFAULT_PREFS.musicVol;
    if (prefs.focus === undefined) prefs.focus = DEFAULT_PREFS.focus;
    if (prefs.lessonPack === undefined) prefs.lessonPack = DEFAULT_PREFS.lessonPack;
    if (prefs.lessonTarget === undefined) prefs.lessonTarget = DEFAULT_PREFS.lessonTarget;
    if (prefs.grade === undefined) prefs.grade = DEFAULT_PREFS.grade;
    if (prefs.themeSave === undefined) prefs.themeSave = DEFAULT_PREFS.themeSave;
    if (prefs.keyboardLayout === undefined) prefs.keyboardLayout = preferredInitialKeyboardLayout;
    if (prefs.boardStyle === undefined) {
      prefs.boardStyle = DEFAULT_PREFS.boardStyle;
    }
    if (prefs.keyStyle === undefined) {
      prefs.keyStyle = DEFAULT_PREFS.keyStyle;
    }
    if (prefs.chunkTabs === undefined) prefs.chunkTabs = DEFAULT_PREFS.chunkTabs;
    if (prefs.atmosphere === undefined) prefs.atmosphere = DEFAULT_PREFS.atmosphere;
    if (prefs.meaningPlusFun === undefined) prefs.meaningPlusFun = DEFAULT_PREFS.meaningPlusFun;
    if (prefs.sorNotation === undefined) prefs.sorNotation = DEFAULT_PREFS.sorNotation;
    if (prefs.revealFocus === undefined) prefs.revealFocus = DEFAULT_PREFS.revealFocus;
    if (prefs.playStyle === undefined) prefs.playStyle = DEFAULT_PREFS.playStyle;
    if (prefs.confidenceCoaching === undefined) prefs.confidenceCoaching = DEFAULT_PREFS.confidenceCoaching;
    if (prefs.voicePractice === undefined) prefs.voicePractice = DEFAULT_PREFS.voicePractice;
    if (prefs.teamMode === undefined) prefs.teamMode = DEFAULT_PREFS.teamMode;
    if (prefs.teamCount === undefined) prefs.teamCount = DEFAULT_PREFS.teamCount;
    if (prefs.turnTimer === undefined) prefs.turnTimer = DEFAULT_PREFS.turnTimer;
    if (prefs.probeRounds === undefined) prefs.probeRounds = DEFAULT_PREFS.probeRounds;
    if (prefs.reportCompact === undefined) prefs.reportCompact = DEFAULT_PREFS.reportCompact;
    if (prefs.assessmentLock === undefined) prefs.assessmentLock = DEFAULT_PREFS.assessmentLock;
    if (prefs.boostPopups === undefined) prefs.boostPopups = DEFAULT_PREFS.boostPopups;
    if (prefs.starterWords === undefined) prefs.starterWords = DEFAULT_PREFS.starterWords;
    if (prefs.uiSkin === undefined) prefs.uiSkin = DEFAULT_PREFS.uiSkin;
    if (prefs.textSize === undefined) prefs.textSize = DEFAULT_PREFS.textSize;
    if (prefs.themeSave !== 'on') delete prefs.theme;
    savePrefs(prefs);
    localStorage.setItem(PREF_MIGRATION_KEY, 'done');
  }
  {
    const normalizedUiSkin = normalizeUiSkin(prefs.uiSkin);
    if (prefs.uiSkin !== normalizedUiSkin) {
      prefs.uiSkin = normalizedUiSkin;
      savePrefs(prefs);
    }
  }
  if (localStorage.getItem(PREF_UI_SKIN_RESET_MIGRATION_KEY) !== 'done') {
    prefs.uiSkin = DEFAULT_PREFS.uiSkin;
    savePrefs(prefs);
    localStorage.setItem(PREF_UI_SKIN_RESET_MIGRATION_KEY, 'done');
  }
  if (localStorage.getItem(PREF_MUSIC_AUTO_MIGRATION_KEY) !== 'done') {
    const currentMusic = String(prefs.music || '').toLowerCase();
    if (!currentMusic || currentMusic === 'lofi' || currentMusic === 'auto') {
      prefs.music = DEFAULT_PREFS.music;
    }
    const vol = parseFloat(prefs.musicVol ?? DEFAULT_PREFS.musicVol);
    if (!Number.isFinite(vol) || vol < 0.4) prefs.musicVol = DEFAULT_PREFS.musicVol;
    savePrefs(prefs);
    localStorage.setItem(PREF_MUSIC_AUTO_MIGRATION_KEY, 'done');
  }
  if (localStorage.getItem(PREF_GUESSES_DEFAULT_MIGRATION_KEY) !== 'done') {
    const currentGuesses = parseInt(String(prefs.guesses ?? ''), 10);
    if (!Number.isFinite(currentGuesses) || currentGuesses === 5) {
      prefs.guesses = DEFAULT_PREFS.guesses;
    }
    savePrefs(prefs);
    localStorage.setItem(PREF_GUESSES_DEFAULT_MIGRATION_KEY, 'done');
  }
  if (prefs.meaningPlusFun === undefined) {
    prefs.meaningPlusFun = DEFAULT_PREFS.meaningPlusFun;
    savePrefs(prefs);
  }
  if (prefs.lessonPack === undefined) {
    prefs.lessonPack = DEFAULT_PREFS.lessonPack;
    savePrefs(prefs);
  }
  if (prefs.lessonTarget === undefined) {
    prefs.lessonTarget = DEFAULT_PREFS.lessonTarget;
    savePrefs(prefs);
  }
  if (prefs.sorNotation === undefined) {
    prefs.sorNotation = DEFAULT_PREFS.sorNotation;
    savePrefs(prefs);
  }
  if (prefs.revealFocus === undefined) {
    prefs.revealFocus = DEFAULT_PREFS.revealFocus;
    savePrefs(prefs);
  }
  if (prefs.revealPacing === undefined) {
    prefs.revealPacing = DEFAULT_PREFS.revealPacing;
    savePrefs(prefs);
  }
  if (prefs.revealAutoNext === undefined) {
    prefs.revealAutoNext = DEFAULT_PREFS.revealAutoNext;
    savePrefs(prefs);
  }
  if (prefs.voicePractice === undefined) {
    prefs.voicePractice = DEFAULT_PREFS.voicePractice;
    savePrefs(prefs);
  }
  if (prefs.teamMode === undefined) {
    prefs.teamMode = DEFAULT_PREFS.teamMode;
    savePrefs(prefs);
  }
  if (prefs.teamCount === undefined) {
    prefs.teamCount = DEFAULT_PREFS.teamCount;
    savePrefs(prefs);
  }
  if (prefs.turnTimer === undefined) {
    prefs.turnTimer = DEFAULT_PREFS.turnTimer;
    savePrefs(prefs);
  }
  if (prefs.probeRounds === undefined) {
    prefs.probeRounds = DEFAULT_PREFS.probeRounds;
    savePrefs(prefs);
  }
  if (prefs.reportCompact === undefined) {
    prefs.reportCompact = DEFAULT_PREFS.reportCompact;
    savePrefs(prefs);
  }
  if (prefs.assessmentLock === undefined) {
    prefs.assessmentLock = DEFAULT_PREFS.assessmentLock;
    savePrefs(prefs);
  }
  if (prefs.boostPopups === undefined) {
    prefs.boostPopups = DEFAULT_PREFS.boostPopups;
    savePrefs(prefs);
  }
  if (prefs.confidenceCoaching === undefined) {
    prefs.confidenceCoaching = DEFAULT_PREFS.confidenceCoaching;
    savePrefs(prefs);
  }
  if (prefs.starterWords === undefined) {
    prefs.starterWords = DEFAULT_PREFS.starterWords;
    savePrefs(prefs);
  }
  const normalizedStarterWordsMode = normalizeStarterWordMode(prefs.starterWords);
  if (prefs.starterWords !== normalizedStarterWordsMode) {
    prefs.starterWords = normalizedStarterWordsMode;
    savePrefs(prefs);
  }
  if (prefs.keyboardLayout !== 'standard' && prefs.keyboardLayout !== 'alphabet') {
    prefs.keyboardLayout = DEFAULT_PREFS.keyboardLayout;
    savePrefs(prefs);
  }
  if (prefs.keyStyle !== 'bubble') {
    prefs.keyStyle = DEFAULT_PREFS.keyStyle;
    savePrefs(prefs);
  }
  if (!['small', 'medium', 'large'].includes(String(prefs.textSize || '').toLowerCase())) {
    prefs.textSize = DEFAULT_PREFS.textSize;
    savePrefs(prefs);
  }
  if (!ALLOWED_MUSIC_MODES.has(String(prefs.music || '').toLowerCase())) {
    prefs.music = DEFAULT_PREFS.music;
    savePrefs(prefs);
  }
  function enforceStartupGameplayDefaults() {
    const startupDefaults = Object.freeze({
      focus: DEFAULT_PREFS.focus,
      lessonPack: DEFAULT_PREFS.lessonPack,
      lessonTarget: DEFAULT_PREFS.lessonTarget,
      grade: DEFAULT_PREFS.grade,
      length: DEFAULT_PREFS.length
    });
    let changed = false;
    // Keep launch predictable on hard refresh: always start in Classic 5-letter mode.
    if (prefs.focus !== DEFAULT_PREFS.focus) {
      prefs.focus = DEFAULT_PREFS.focus;
      changed = true;
    }
    if (String(prefs.length || '').trim() !== DEFAULT_PREFS.length) {
      prefs.length = DEFAULT_PREFS.length;
      changed = true;
    }
    Object.entries(startupDefaults).forEach(([key, value]) => {
      const current = prefs[key];
      if (current !== undefined && current !== null && String(current).trim() !== '') return;
      prefs[key] = value;
      changed = true;
    });
    if (changed) savePrefs(prefs);
    try {
      localStorage.removeItem('wq_v2_grade_band');
      localStorage.removeItem('wq_v2_length');
    } catch {}
  }
  enforceStartupGameplayDefaults();
  function enforceLockedDemoDefaults() {
    const lockedDefaults = Object.freeze({
      projector: 'on',
      feedback: 'themed',
      revealFocus: 'on',
      revealPacing: 'guided',
      revealAutoNext: 'off',
      meaningPlusFun: 'on',
      sorNotation: 'on',
      confidenceCoaching: 'off'
    });
    let changed = false;
    Object.entries(lockedDefaults).forEach(([key, value]) => {
      if (prefs[key] === value) return;
      prefs[key] = value;
      changed = true;
    });
    if (changed) savePrefs(prefs);
  }
  enforceLockedDemoDefaults();
  const _el = id => document.getElementById(id);
  const TELEMETRY_ENABLED_KEY = 'wq_v2_telemetry_enabled_v1';
  const TELEMETRY_DEVICE_ID_KEY = 'wq_v2_device_id_local_v1';
  const TELEMETRY_ENDPOINT_KEY = 'wq_v2_telemetry_endpoint_v1';
  const TELEMETRY_LAST_UPLOAD_KEY = 'wq_v2_telemetry_last_upload_v1';
  const TELEMETRY_QUEUE_LIMIT = 500;
  const TELEMETRY_SESSION_ID = `sess_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
  const telemetrySessionStartedAt = Date.now();
  let telemetryLastMusicSignature = '';
  let telemetryUploadInFlight = false;
  let telemetryUploadIntervalId = 0;
  const HOVER_NOTE_DELAY_MS = 500;
  const HOVER_NOTE_TARGET_SELECTOR = '.icon-btn, .header-quick-btn, .focus-action-btn, .theme-preview-music, .wq-theme-nav-btn, .quick-popover-done';
  let hoverNoteTimer = 0;
  let hoverNoteTarget = null;
  let hoverNoteEl = null;
  let focusSearchReopenGuardUntil = 0;
  const ThemeRegistry = window.WQThemeRegistry || null;
  const shouldPersistTheme = () => (prefs.themeSave || DEFAULT_PREFS.themeSave) === 'on';
  let musicController = null;
  let challengeSprintTimer = 0;
  let challengePacingTimer = 0;
  let challengeModalReturnFocusEl = null;
  let demoRoundComplete = false;
  let demoEndOverlayEl = null;
  let demoBannerEl = null;
  let demoLaunchBtnEl = null;
  let demoCoachEl = null;
  let demoCoachReadyTimer = 0;
  let demoDebugLabelEl = null;
  const DEMO_COACH_READY_MAX_TRIES = 25;
  const DEMO_COACH_READY_DELAY_MS = 120;
  const demoState = {
    step: 0,
    guessCount: 0,
    suggestions: ['slate', 'plain', 'plant'],
    discoveredCore: new Set(),
    keyPulseTimer: 0,
    keyPulseIndex: 0,
    hintUsed: false,
    overlaysClosed: false,
    coachMounted: false,
    lastCoachStepId: '',
    handledGuessCounts: new Set()
  };
  const DEMO_OVERLAY_SELECTORS = Object.freeze([
    '#focus-inline-results:not(.hidden)',
    '#teacher-panel:not(.hidden)',
    '#modal-overlay:not(.hidden)',
    '#challenge-modal:not(.hidden)',
    '#phonics-clue-modal:not(.hidden)',
    '#listening-mode-overlay:not(.hidden)',
    '#first-run-setup-modal:not(.hidden)',
    '#end-modal:not(.hidden)',
    '#modal-challenge-launch:not(.hidden)'
  ]);

  function createDemoBanner() {
    if (!DEMO_MODE || document.getElementById('wq-demo-banner')) return;
    const banner = document.createElement('div');
    banner.id = 'wq-demo-banner';
    banner.className = 'wq-demo-banner';
    banner.innerHTML =
      '<div class=\"wq-demo-banner-left\">Live Demo (60 sec) - Try one round</div>' +
      '<div class=\"wq-demo-banner-actions\">' +
        '<button type=\"button\" id=\"wq-demo-skip-btn\">Skip demo</button>' +
        '<button type=\"button\" id=\"wq-demo-restart-btn\">Restart demo</button>' +
      '</div>';
    document.body.prepend(banner);
    demoBannerEl = banner;
    document.body.classList.add('wq-demo-active');
    _el('wq-demo-skip-btn')?.addEventListener('click', () => {
      const demoStateRuntime = getDemoState();
      demoStateRuntime.active = false;
      demoClearTimers();
      window.WQ_DEMO = false;
      window.location.href = removeDemoParams(window.location.href);
    });
    _el('wq-demo-restart-btn')?.addEventListener('click', () => {
      window.location.href = ensureDemoParam(window.location.href);
    });
  }

  function getDemoLaunchAnchorRect() {
    const state = WQGame.getState?.() || null;
    const wordLength = Math.max(1, Number(state?.wordLength || 0));
    const activeRow = Math.max(0, Number(state?.guesses?.length || 0));
    const firstTile = _el(`tile-${activeRow * wordLength}`);
    const lastTile = _el(`tile-${activeRow * wordLength + (wordLength - 1)}`);
    if (firstTile instanceof HTMLElement && lastTile instanceof HTMLElement) {
      const a = firstTile.getBoundingClientRect();
      const b = lastTile.getBoundingClientRect();
      const hasSize = a.width > 0 && a.height > 0 && b.width > 0 && b.height > 0;
      if (hasSize) {
        return {
          top: Math.min(a.top, b.top),
          bottom: Math.max(a.bottom, b.bottom),
          left: Math.min(a.left, b.left),
          right: Math.max(a.right, b.right),
          width: Math.max(0, Math.max(a.right, b.right) - Math.min(a.left, b.left)),
          height: Math.max(a.height, b.height)
        };
      }
    }
    const keyboard = _el('keyboard');
    if (keyboard instanceof HTMLElement) {
      const rect = keyboard.getBoundingClientRect();
      if (rect.width > 0 && rect.height > 0) return rect;
    }
    return null;
  }

  function positionDemoLaunchButton() {
    if (DEMO_MODE || !(demoLaunchBtnEl instanceof HTMLElement)) return;
    const rect = getDemoLaunchAnchorRect();
    if (!rect) {
      demoLaunchBtnEl.style.top = '';
      demoLaunchBtnEl.style.left = '';
      return;
    }
    const buttonWidth = Math.max(220, demoLaunchBtnEl.offsetWidth || 220);
    const maxLeft = Math.max(8, window.innerWidth - buttonWidth - 8);
    const targetCenterX = rect.left + (rect.width / 2);
    const nextLeft = Math.min(maxLeft, Math.max(8, Math.round(targetCenterX - (buttonWidth / 2))));
    const topFromTiles = Math.round(rect.top - 52);
    const topFromKeyboard = Math.round(rect.top - 48);
    const nextTop = Math.max(72, Math.min(window.innerHeight - 56, Math.max(topFromTiles, topFromKeyboard)));
    demoLaunchBtnEl.style.left = `${nextLeft}px`;
    demoLaunchBtnEl.style.top = `${nextTop}px`;
  }

  function createHomeDemoLaunchButton() {
    let allowDemoChip = false;
    try {
      const params = new URLSearchParams(window.location.search || '');
      allowDemoChip = params.get('democta') === '1';
    } catch {
      allowDemoChip = false;
    }
    if (!allowDemoChip) {
      const stale = document.getElementById('wq-demo-launch-btn');
      if (stale) stale.remove();
      demoLaunchBtnEl = null;
      return;
    }
    if (DEMO_MODE || document.getElementById('wq-demo-launch-btn')) return;
    const button = document.createElement('button');
    button.id = 'wq-demo-launch-btn';
    button.className = 'wq-demo-launch-btn';
    button.type = 'button';
    button.textContent = 'Try a live round (60 sec)';
    button.addEventListener('click', () => {
      window.location.href = ensureDemoParam(window.location.href);
    });
    document.body.appendChild(button);
    demoLaunchBtnEl = button;
    positionDemoLaunchButton();
    window.addEventListener('resize', positionDemoLaunchButton, { passive: true });
    window.addEventListener('scroll', positionDemoLaunchButton, { passive: true });
    setTimeout(positionDemoLaunchButton, 0);
  }

  function setDemoControlsDisabled() {
    if (!DEMO_MODE) return;
    document.body.classList.add('wq-demo');
    const focusInput = _el('focus-inline-search');
    const focusSelect = _el('setting-focus');
    const lengthSelect = _el('s-length');
    const guessesSelect = _el('s-guesses');
    if (focusSelect) focusSelect.value = 'all';
    if (lengthSelect) lengthSelect.value = '5';
    if (guessesSelect) guessesSelect.value = '6';
    if (focusInput) {
      focusInput.value = 'Classic (Demo Locked)';
      focusInput.setAttribute('readonly', 'true');
      focusInput.setAttribute('aria-readonly', 'true');
      focusInput.setAttribute('tabindex', '-1');
    }
    const targets = [
      focusSelect,
      lengthSelect,
      guessesSelect,
      focusInput,
      _el('wq-teacher-words')
    ];
    targets.forEach((node) => {
      if (!node) return;
      node.setAttribute('disabled', 'true');
      node.setAttribute('aria-disabled', 'true');
      node.setAttribute('title', 'Disabled in Live Demo');
    });
    document.querySelectorAll('#challenge-modal input, #challenge-modal textarea').forEach((node) => {
      node.setAttribute('disabled', 'true');
      node.setAttribute('aria-disabled', 'true');
      node.setAttribute('title', 'Disabled in Live Demo');
    });
    const teacherTools = _el('wq-teacher-tools');
    if (teacherTools) teacherTools.classList.add('hidden');
    closeFocusSearchList();
  }

  function ensureDemoParam(url) {
    const next = new URL(url || window.location.href, window.location.href);
    next.searchParams.set('demo', '1');
    next.searchParams.set('page', 'wordquest');
    next.searchParams.delete('mode');
    return next.toString();
  }

  function removeDemoParams(url) {
    const next = new URL(url || window.location.href, window.location.href);
    next.searchParams.delete('demo');
    next.searchParams.delete('mode');
    return next.toString();
  }

  function stopDemoKeyPulse() {
    if (!demoState.keyPulseTimer) return;
    clearTimeout(demoState.keyPulseTimer);
    demoState.keyPulseTimer = 0;
  }

  function stopDemoCoachReadyLoop() {
    if (!demoCoachReadyTimer) return;
    clearTimeout(demoCoachReadyTimer);
    if (window.__CS_DEMO_TIMERS && typeof window.__CS_DEMO_TIMERS.delete === 'function') {
      window.__CS_DEMO_TIMERS.delete(demoCoachReadyTimer);
    }
    demoCoachReadyTimer = 0;
  }

  function listOpenOverlays() {
    return DEMO_OVERLAY_SELECTORS
      .map((selector) => {
        const node = document.querySelector(selector);
        return node ? selector : '';
      })
      .filter(Boolean);
  }

  function renderDemoDebugReadout() {
    if (!DEMO_MODE || !DEMO_DEBUG_MODE) return;
    if (!demoDebugLabelEl) {
      const label = document.createElement('div');
      label.id = 'wq-demo-debug';
      label.className = 'wq-demo-debug';
      document.body.appendChild(label);
      demoDebugLabelEl = label;
    }
    const overlaysOpen = listOpenOverlays().length === 0 ? 'true' : 'false';
    const coachMounted = demoState.coachMounted ? 'true' : 'false';
    demoDebugLabelEl.textContent = `demo:1 overlaysClosed:${overlaysOpen} coachMounted:${coachMounted}`;
  }

  function closeAllOverlaysForDemo() {
    if (!DEMO_MODE) return true;
    closeFocusSearchList();
    closeQuickPopover('all');
    _el('settings-panel')?.classList.add('hidden');
    _el('teacher-panel')?.classList.add('hidden');
    _el('modal-overlay')?.classList.add('hidden');
    _el('challenge-modal')?.classList.add('hidden');
    _el('phonics-clue-modal')?.classList.add('hidden');
    _el('listening-mode-overlay')?.classList.add('hidden');
    _el('first-run-setup-modal')?.classList.add('hidden');
    _el('end-modal')?.classList.add('hidden');
    _el('modal-challenge-launch')?.classList.add('hidden');
    _el('focus-inline-results')?.classList.add('hidden');
    document.documentElement.setAttribute('data-focus-search-open', 'false');
    document.body.style.overflow = '';
    document.documentElement.style.overflow = '';
    setPageMode('wordquest', { force: true, skipUrl: true });
    syncHeaderControlsVisibility();
    const openOverlays = listOpenOverlays();
    demoState.overlaysClosed = openOverlays.length === 0;
    if (DEMO_DEBUG_MODE) {
      console.log('[demo] overlays:', openOverlays);
    }
    renderDemoDebugReadout();
    return demoState.overlaysClosed;
  }

  function pulseDemoKey(letter) {
    const key = document.querySelector(`.key[data-key=\"${String(letter || '').toLowerCase()}\"]`);
    if (!(key instanceof HTMLElement)) return;
    key.classList.remove('wq-demo-key-pulse');
    void key.offsetWidth;
    key.classList.add('wq-demo-key-pulse');
  }

  function startDemoKeyPulse(word) {
    stopDemoKeyPulse();
    const letters = String(word || '').toLowerCase().replace(/[^a-z]/g, '').split('');
    if (!letters.length) return;
    // One pass only to avoid perpetual repaint loops while demo coach is visible.
    const pulseOnce = () => {
      pulseDemoKey(letters[demoState.keyPulseIndex % letters.length]);
      demoState.keyPulseIndex += 1;
      if (demoState.keyPulseIndex >= letters.length) {
        stopDemoKeyPulse();
      } else {
        demoState.keyPulseTimer = demoSetTimeout(pulseOnce, 140);
      }
    };
    demoState.keyPulseIndex = 0;
    pulseOnce();
  }

  function applySuggestedDemoWord(word) {
    const normalizedWord = String(word || '').trim().toLowerCase();
    const current = WQGame.getState?.() || {};
    if (!normalizedWord || !current.wordLength || normalizedWord.length !== current.wordLength) return false;
    let clears = 0;
    while ((WQGame.getState?.()?.guess || '').length > 0 && clears < 8) {
      handleInputUnit('Backspace');
      clears += 1;
    }
    for (const letter of normalizedWord) handleInputUnit(letter);
    handleInputUnit('Enter');
    return true;
  }

  function ensureDemoCoach() {
    if (demoCoachEl instanceof HTMLElement) return demoCoachEl;
    const existing = document.getElementById('csDemoCoach') || document.getElementById('wq-demo-coach');
    if (existing instanceof HTMLElement) {
      demoCoachEl = existing;
      window.__CS_DEMO_COACH_MOUNTED = true;
      return demoCoachEl;
    }
    if (window.__CS_DEMO_COACH_MOUNTED) return null;
    window.__CS_DEMO_COACH_MOUNTED = true;
    const coach = document.createElement('div');
    coach.id = 'csDemoCoach';
    coach.className = 'wq-demo-coach cs-hidden';
    coach.innerHTML =
      '<div class=\"wq-demo-coach-copy\" id=\"csCoachText\"></div>' +
      '<div class=\"wq-demo-coach-actions\">' +
        '<button type=\"button\" id=\"csCoachPrimary\">Got it</button>' +
        '<button type=\"button\" id=\"csCoachSuggest\" class=\"hidden\">Use suggested word</button>' +
        '<button type=\"button\" id=\"csCoachHint\" class=\"hidden\">Hint: reveal 2 letters</button>' +
        '<button type=\"button\" id=\"csCoachSkip\">Skip</button>' +
      '</div>';
    document.body.appendChild(coach);
    demoCoachEl = coach;
    return coach;
  }

  function hideDemoCoach() {
    if (!(demoCoachEl instanceof HTMLElement)) return;
    demoCoachEl.classList.remove('cs-visible');
    demoCoachEl.classList.add('cs-hidden');
    stopDemoKeyPulse();
  }

  function positionDemoCoach(coachEl, preferredAnchor) {
    if (!(coachEl instanceof HTMLElement)) return;
    const board = _el('game-board');
    const anchor = preferredAnchor || board || _el('keyboard') || document.body;
    const anchorRect = (anchor && anchor.getBoundingClientRect)
      ? anchor.getBoundingClientRect()
      : { top: 84, left: 20, width: 300, height: 220, right: 320, bottom: 304 };
    const boardRect = (board && board.getBoundingClientRect)
      ? board.getBoundingClientRect()
      : anchorRect;
    const coachWidth = Math.max(260, Math.min(360, coachEl.offsetWidth || 340));
    const gap = 12;
    const viewportPadding = 10;
    const maxLeft = Math.max(viewportPadding, window.innerWidth - coachWidth - viewportPadding);
    const rightCandidate = Math.round(boardRect.right + gap);
    const leftCandidate = Math.round(boardRect.left - coachWidth - gap);
    let nextLeft = rightCandidate;
    if (rightCandidate > maxLeft) {
      if (leftCandidate >= viewportPadding) nextLeft = leftCandidate;
      else nextLeft = maxLeft;
    }
    const anchorMidY = anchorRect.top + (anchorRect.height / 2);
    const coachHeight = Math.max(112, coachEl.offsetHeight || 150);
    let nextTop = Math.round(anchorMidY - (coachHeight / 2));
    const keyboardTop = (_el('keyboard') && _el('keyboard').getBoundingClientRect)
      ? _el('keyboard').getBoundingClientRect().top
      : window.innerHeight;
    const maxTop = Math.min(window.innerHeight - coachHeight - viewportPadding, keyboardTop - coachHeight - gap);
    nextTop = Math.max(72, Math.min(maxTop, nextTop));
    coachEl.style.left = `${Math.max(viewportPadding, Math.min(maxLeft, nextLeft))}px`;
    coachEl.style.top = `${nextTop}px`;
  }

  function showDemoCoach(config) {
    if (!DEMO_MODE) return;
    const demoStateRuntime = getDemoState();
    if (!demoStateRuntime.active) return;
    const coach = ensureDemoCoach();
    const copyEl = _el('csCoachText');
    const primaryBtn = _el('csCoachPrimary');
    const suggestBtn = _el('csCoachSuggest');
    const hintBtn = _el('csCoachHint');
    const skipBtn = _el('csCoachSkip');
    if (!copyEl || !primaryBtn || !suggestBtn || !hintBtn || !skipBtn) return;
    const nextStepId = String(config?.id || '').trim() || 'unknown';
    const wasVisible = coach.classList.contains('cs-visible');
    if (demoState.lastCoachStepId === nextStepId && coach.classList.contains('cs-visible')) {
      return;
    }
    demoState.lastCoachStepId = nextStepId;
    window.__CS_DEMO_RENDER_COUNT = (window.__CS_DEMO_RENDER_COUNT || 0) + 1;
    console.log('[demo] coach render', window.__CS_DEMO_RENDER_COUNT, 'step', nextStepId);

    copyEl.textContent = String(config?.text || '').trim();
    primaryBtn.textContent = String(config?.primaryLabel || 'Got it').trim() || 'Got it';
    primaryBtn.onclick = () => {
      if (config?.deactivateOnPrimary) {
        demoStateRuntime.active = false;
        demoClearTimers();
      }
      if (typeof config?.onPrimary === 'function') config.onPrimary();
      hideDemoCoach();
    };
    skipBtn.onclick = () => {
      demoStateRuntime.active = false;
      demoClearTimers();
      hideDemoCoach();
    };

    const suggestedWord = String(config?.suggestedWord || '').trim().toLowerCase();
    if (suggestedWord) {
      suggestBtn.classList.remove('hidden');
      suggestBtn.onclick = () => {
        hideDemoCoach();
        applySuggestedDemoWord(suggestedWord);
      };
      startDemoKeyPulse(suggestedWord);
    } else {
      suggestBtn.classList.add('hidden');
      stopDemoKeyPulse();
    }

    if (config?.showHint === true) {
      hintBtn.classList.remove('hidden');
      hintBtn.onclick = () => {
        demoState.hintUsed = true;
        showDemoCoach({
          id: 'hint',
          text: 'Hint: the word starts with P and has L as the second letter.',
          primaryLabel: 'Got it'
        });
      };
    } else {
      hintBtn.classList.add('hidden');
    }

    const anchor = config?.anchor || _el('game-board') || _el('keyboard') || document.body;
    positionDemoCoach(coach, anchor);
    if (!wasVisible) {
      coach.classList.remove('cs-hidden');
      coach.classList.add('cs-visible');
    }
  }

  function resetDemoScriptState() {
    const demoStateRuntime = getDemoState();
    demoStateRuntime.step = 0;
    demoStateRuntime.active = true;
    demoStateRuntime.started = false;
    demoState.step = 0;
    demoState.guessCount = 0;
    demoState.discoveredCore = new Set();
    demoState.hintUsed = false;
    demoState.overlaysClosed = false;
    demoState.coachMounted = false;
    demoState.lastCoachStepId = '';
    demoState.handledGuessCounts = new Set();
    window.__CS_DEMO_RENDER_COUNT = 0;
    stopDemoCoachReadyLoop();
    demoClearTimers();
    stopDemoKeyPulse();
    hideDemoCoach();
    renderDemoDebugReadout();
  }

  function runDemoCoachForStart() {
    if (!DEMO_MODE) return;
    const demoStateRuntime = getDemoState();
    if (!demoStateRuntime.active || demoStateRuntime.started) return;
    demoStateRuntime.started = true;
    demoStateRuntime.step = 1;
    let tries = 0;
    stopDemoCoachReadyLoop();
    const waitForGameplayThenShowCoach = () => {
      if (!DEMO_MODE || demoRoundComplete || !demoStateRuntime.active) return;
      closeAllOverlaysForDemo();
      const keyboard = _el('keyboard');
      const board = _el('game-board');
      const overlaysOpen = listOpenOverlays().length > 0;
      const ready = Boolean(keyboard && board && !overlaysOpen);
      if (ready) {
        demoState.coachMounted = true;
        renderDemoDebugReadout();
        showDemoCoach({
          id: 'start',
          anchor: keyboard,
          text: 'Try SLATE first. Colors will teach the rule instantly.',
          primaryLabel: 'Got it',
          suggestedWord: demoState.suggestions[0]
        });
        return;
      }
      tries += 1;
      if (tries > DEMO_COACH_READY_MAX_TRIES) {
        console.warn('Demo coach aborted: gameplay not ready');
        renderDemoDebugReadout();
        return;
      }
      demoCoachReadyTimer = demoSetTimeout(waitForGameplayThenShowCoach, DEMO_COACH_READY_DELAY_MS);
    };
    waitForGameplayThenShowCoach();
  }

  function updateDemoDiscovered(result) {
    const guess = String(result?.guess || '').toUpperCase();
    const statuses = Array.isArray(result?.result) ? result.result : [];
    ['P', 'L', 'A'].forEach((targetLetter) => {
      for (let i = 0; i < guess.length; i += 1) {
        if (guess[i] !== targetLetter) continue;
        if (statuses[i] === 'correct' || statuses[i] === 'present') {
          demoState.discoveredCore.add(targetLetter);
          return;
        }
      }
    });
  }

  function runDemoCoachAfterGuess(result) {
    if (!DEMO_MODE || !result || result.error || result.won || result.lost) return;
    const demoStateRuntime = getDemoState();
    if (!demoStateRuntime.active) return;
    demoState.guessCount = Math.max(0, Number(result.guesses?.length || 0));
    if (demoState.handledGuessCounts.has(demoState.guessCount)) return;
    demoState.handledGuessCounts.add(demoState.guessCount);
    updateDemoDiscovered(result);
    if (demoState.guessCount === 1) {
      demoStateRuntime.step = 2;
      showDemoCoach({
        id: 'after_guess_1',
        anchor: _el('game-board'),
        text: 'Grey = not in word, yellow = wrong spot, green = right spot. Next try PLAIN.',
        suggestedWord: demoState.suggestions[1]
      });
      return;
    }
    if (demoState.guessCount === 2) {
      demoStateRuntime.step = 3;
      const coreFound = demoState.discoveredCore.has('P') && demoState.discoveredCore.has('L') && demoState.discoveredCore.has('A');
      showDemoCoach({
        id: 'after_guess_2',
        anchor: _el('game-board'),
        text: 'Now finish with PLANT. You are one guess from the win.',
        suggestedWord: demoState.suggestions[2],
        showHint: !coreFound
      });
    }
  }

  function closeDemoEndOverlay() {
    if (!demoEndOverlayEl) return;
    demoEndOverlayEl.classList.add('hidden');
    hideDemoCoach();
  }

  function showDemoEndOverlay() {
    if (!DEMO_MODE) return;
    const demoStateRuntime = getDemoState();
    demoStateRuntime.active = false;
    demoClearTimers();
    stopDemoCoachReadyLoop();
    stopDemoKeyPulse();
    hideDemoCoach();
    if (!demoEndOverlayEl) {
      const overlay = document.createElement('div');
      overlay.id = 'wq-demo-end-overlay';
      overlay.className = 'wq-demo-end-overlay hidden';
      overlay.innerHTML =
        '<div class=\"wq-demo-end-card\">' +
          '<h2>That&rsquo;s Word Quest.</h2>' +
          '<ul>' +
            '<li>Instant feedback on phonics patterns</li>' +
            '<li>Audio support built in</li>' +
            '<li>Ready for Tier 2/3 practice</li>' +
          '</ul>' +
          '<div class=\"wq-demo-end-actions\">' +
            '<button type=\"button\" id=\"wq-demo-full-btn\" class=\"audio-btn\">Play full Word Quest</button>' +
            '<button type=\"button\" id=\"wq-demo-retry-btn\" class=\"audio-btn\">Try demo again</button>' +
          '</div>' +
        '</div>';
      document.body.appendChild(overlay);
      _el('wq-demo-full-btn')?.addEventListener('click', () => {
        window.WQ_DEMO = false;
        window.location.href = removeDemoParams(window.location.href);
      });
      _el('wq-demo-retry-btn')?.addEventListener('click', () => {
        demoRoundComplete = false;
        resetDemoScriptState();
        closeDemoEndOverlay();
        newGame({ forceDemoReplay: true, launchMissionLab: false });
      });
      demoEndOverlayEl = overlay;
    }
    demoEndOverlayEl.classList.remove('hidden');
  }

  function readTelemetryEnabled() {
    try {
      const raw = String(localStorage.getItem(TELEMETRY_ENABLED_KEY) || '').trim().toLowerCase();
      if (!raw) return true;
      return raw !== 'off' && raw !== '0' && raw !== 'false';
    } catch {
      return true;
    }
  }

  function getTelemetryDeviceId() {
    let deviceId = '';
    try {
      deviceId = String(localStorage.getItem(TELEMETRY_DEVICE_ID_KEY) || '').trim();
      if (!deviceId) {
        deviceId = `dev_${Math.random().toString(36).slice(2, 10)}${Date.now().toString(36).slice(-4)}`;
        localStorage.setItem(TELEMETRY_DEVICE_ID_KEY, deviceId);
      }
    } catch {
      deviceId = `dev_mem_${Math.random().toString(36).slice(2, 10)}`;
    }
    return deviceId;
  }

  function getTelemetryQueue() {
    try {
      const parsed = JSON.parse(localStorage.getItem(TELEMETRY_QUEUE_KEY) || '[]');
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }

  function setTelemetryQueue(queue) {
    try {
      localStorage.setItem(TELEMETRY_QUEUE_KEY, JSON.stringify(Array.isArray(queue) ? queue.slice(-TELEMETRY_QUEUE_LIMIT) : []));
    } catch {}
  }

  function normalizeTelemetryEndpoint(raw) {
    const value = String(raw || '').trim();
    if (!value) return '';
    if (value.startsWith('/')) return value;
    if (/^https?:\/\//i.test(value)) return value;
    return '';
  }

  function resolveTelemetryEndpoint() {
    if (DEMO_MODE) return '';
    let queryValue = '';
    try {
      const params = new URLSearchParams(window.location.search || '');
      queryValue = params.get('telemetry_endpoint') || params.get('telemetryEndpoint') || '';
    } catch {}
    const queryEndpoint = normalizeTelemetryEndpoint(queryValue);
    if (queryEndpoint) {
      try { localStorage.setItem(TELEMETRY_ENDPOINT_KEY, queryEndpoint); } catch {}
      return queryEndpoint;
    }
    try {
      return normalizeTelemetryEndpoint(localStorage.getItem(TELEMETRY_ENDPOINT_KEY) || '');
    } catch {
      return '';
    }
  }

  function getTelemetryUploadMeta() {
    try {
      const parsed = JSON.parse(localStorage.getItem(TELEMETRY_LAST_UPLOAD_KEY) || 'null');
      if (!parsed || typeof parsed !== 'object') return null;
      return {
        ts: Math.max(0, Number(parsed.ts) || 0),
        count: Math.max(0, Number(parsed.count) || 0),
        endpoint: normalizeTelemetryEndpoint(parsed.endpoint || '')
      };
    } catch {
      return null;
    }
  }

  function setTelemetryUploadMeta(meta) {
    const row = {
      ts: Date.now(),
      count: Math.max(0, Number(meta?.count) || 0),
      endpoint: normalizeTelemetryEndpoint(meta?.endpoint || '')
    };
    try { localStorage.setItem(TELEMETRY_LAST_UPLOAD_KEY, JSON.stringify(row)); } catch {}
  }

  async function uploadTelemetryQueue(reason = 'manual', options = {}) {
    if (telemetryUploadInFlight) return false;
    const endpoint = resolveTelemetryEndpoint();
    if (!endpoint || !readTelemetryEnabled()) return false;
    const queue = getTelemetryQueue();
    if (!queue.length) return true;
    telemetryUploadInFlight = true;
    try {
      const rows = queue.slice(-200);
      const payload = {
        app: 'wordquest',
        reason: String(reason || 'manual').trim() || 'manual',
        sent_at_ms: Date.now(),
        rows
      };
      const shouldUseBeacon = !!options.useBeacon;
      if (shouldUseBeacon && navigator?.sendBeacon) {
        const blob = new Blob([JSON.stringify(payload)], { type: 'application/json' });
        const ok = navigator.sendBeacon(endpoint, blob);
        if (ok) {
          setTelemetryQueue([]);
          setTelemetryUploadMeta({ count: rows.length, endpoint });
          return true;
        }
      }
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'content-type': 'application/json'
        },
        body: JSON.stringify(payload),
        keepalive: shouldUseBeacon
      });
      if (!response.ok) return false;
      setTelemetryQueue([]);
      setTelemetryUploadMeta({ count: rows.length, endpoint });
      return true;
    } catch {
      return false;
    } finally {
      telemetryUploadInFlight = false;
    }
  }

  function initTelemetryUploader() {
    if (DEMO_MODE) return;
    if (document.body.dataset.wqTelemetryUploaderBound === '1') return;
    document.body.dataset.wqTelemetryUploaderBound = '1';
    if (telemetryUploadIntervalId) clearInterval(telemetryUploadIntervalId);
    telemetryUploadIntervalId = window.setInterval(() => {
      void uploadTelemetryQueue('interval');
    }, 90_000);
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'hidden') {
        void uploadTelemetryQueue('visibility_hidden', { useBeacon: true });
      }
    });
    window.addEventListener('pagehide', () => {
      void uploadTelemetryQueue('pagehide', { useBeacon: true });
    });
  }

  function getTelemetryContext() {
    const state = WQGame.getState?.() || {};
    const build = resolveBuildLabel() || 'local';
    const appVersion = `v${APP_SEMVER}`;
    const focusValue = _el('setting-focus')?.value || prefs.focus || DEFAULT_PREFS.focus || 'all';
    const gradeBand = getEffectiveGameplayGradeBand(
      _el('s-grade')?.value || prefs.grade || DEFAULT_PREFS.grade || 'all',
      focusValue
    );
    const lessonPackId = normalizeLessonPackId(prefs.lessonPack || _el('s-lesson-pack')?.value || DEFAULT_PREFS.lessonPack);
    const lessonTargetId = normalizeLessonTargetId(
      lessonPackId,
      prefs.lessonTarget || _el('s-lesson-target')?.value || DEFAULT_PREFS.lessonTarget
    );
    return {
      ts_ms: Date.now(),
      session_id: TELEMETRY_SESSION_ID,
      device_id_local: getTelemetryDeviceId(),
      app_version: `${appVersion}+${build}`,
      page_mode: normalizePageMode(document.documentElement.getAttribute('data-page-mode') || loadStoredPageMode()),
      play_style: normalizePlayStyle(document.documentElement.getAttribute('data-play-style') || prefs.playStyle || DEFAULT_PREFS.playStyle),
      grade_band: gradeBand,
      focus_id: String(focusValue || 'all'),
      lesson_pack_id: lessonPackId,
      lesson_target_id: lessonTargetId,
      word_length: Number(state?.wordLength || 0) || null
    };
  }

  function emitTelemetry(eventName, payload = {}) {
    if (DEMO_MODE) return;
    if (!readTelemetryEnabled()) return;
    const name = String(eventName || '').trim().toLowerCase();
    if (!name) return;
    const row = {
      event_name: name.startsWith('wq_') ? name : `wq_${name}`,
      ...getTelemetryContext(),
      ...(payload && typeof payload === 'object' ? payload : {})
    };
    const queue = getTelemetryQueue();
    queue.push(row);
    setTelemetryQueue(queue);
  }

  window.WQTelemetry = Object.freeze({
    emit: emitTelemetry,
    setEnabled(next) {
      try {
        localStorage.setItem(TELEMETRY_ENABLED_KEY, next ? 'on' : 'off');
      } catch {}
    },
    isEnabled: readTelemetryEnabled,
    setEndpoint(url) {
      const endpoint = normalizeTelemetryEndpoint(url);
      try {
        if (endpoint) localStorage.setItem(TELEMETRY_ENDPOINT_KEY, endpoint);
        else localStorage.removeItem(TELEMETRY_ENDPOINT_KEY);
      } catch {}
      return endpoint;
    },
    getEndpoint: resolveTelemetryEndpoint,
    peek(limit = 20) {
      const count = Math.max(1, Math.min(200, Number(limit) || 20));
      return getTelemetryQueue().slice(-count);
    },
    async uploadNow(reason = 'manual') {
      return uploadTelemetryQueue(reason);
    },
    flush() {
      const rows = getTelemetryQueue();
      setTelemetryQueue([]);
      return rows;
    }
  });
  initTelemetryUploader();

  function isMissionLabEnabled() {
    return MISSION_LAB_ENABLED;
  }

  function normalizePageMode(mode) {
    if (!isMissionLabEnabled()) return 'wordquest';
    return String(mode || '').trim().toLowerCase() === 'mission-lab'
      ? 'mission-lab'
      : 'wordquest';
  }

  function readPageModeFromQuery() {
    try {
      const params = new URLSearchParams(window.location.search || '');
      const raw = params.get('page') || params.get('mode') || '';
      return normalizePageMode(raw);
    } catch {
      return 'wordquest';
    }
  }

  function loadStoredPageMode() {
    try {
      return normalizePageMode(localStorage.getItem(PAGE_MODE_KEY) || 'wordquest');
    } catch {
      return 'wordquest';
    }
  }

  function persistPageMode(mode) {
    try { localStorage.setItem(PAGE_MODE_KEY, normalizePageMode(mode)); } catch {}
  }

  function resolveBuildLabel() {
    const metaBuild = document.querySelector('meta[name="wq-build"]')?.getAttribute('content');
    const normalizedMetaBuild = String(metaBuild || '').trim();
    if (normalizedMetaBuild) return normalizedMetaBuild;
    const appScript = Array.from(document.querySelectorAll('script[src]'))
      .find((script) => /(?:^|\/)js\/app\.js(?:[?#]|$)/i.test(script.getAttribute('src') || ''));
    const src = String(appScript?.getAttribute('src') || '');
    const match = src.match(/[?&]v=([^&#]+)/i);
    if (match && match[1]) return decodeURIComponent(match[1]);
    return '';
  }

  function resolveRuntimeChannel() {
    const host = String(location.hostname || '').toLowerCase();
    if (!host || host === 'localhost' || host === '127.0.0.1' || host === '::1') return 'LOCAL';
    if (host === 'bkseatown.github.io') return 'LIVE';
    if (host === 'cdn.jsdelivr.net' || host === 'htmlpreview.github.io') return 'PREVIEW';
    return 'CUSTOM';
  }

  function syncBuildBadge() {
    const badge = _el('settings-build-badge');
    if (!badge) return;
    if (!isDevModeEnabled()) {
      badge.textContent = '';
      badge.classList.add('hidden');
      return;
    }
    badge.classList.remove('hidden');
    const label = resolveBuildLabel();
    const channel = resolveRuntimeChannel();
    const buildLabel = label || 'local';
    const appVersion = `v${APP_SEMVER}`;
    badge.textContent = `${channel} · ${appVersion} · Build ${buildLabel}`;
    badge.title = `${channel} source: ${location.origin}${location.pathname} · ${appVersion} · build ${buildLabel}`;
  }

  function syncPersistentVersionChip() {
    if (!isDevModeEnabled()) {
      _el('wq-version-chip')?.classList.add('hidden');
      return;
    }
    const channel = resolveRuntimeChannel();
    const buildLabel = resolveBuildLabel() || 'local';
    const appVersion = `v${APP_SEMVER}`;
    let chip = _el('wq-version-chip');
    if (!chip) {
      chip = document.createElement('div');
      chip.id = 'wq-version-chip';
      chip.className = 'wq-version-chip';
      chip.setAttribute('aria-hidden', 'true');
      document.body.appendChild(chip);
    }
    chip.textContent = `${channel} · ${appVersion} · ${buildLabel}`;
    chip.title = `WordQuest ${appVersion} (${buildLabel})`;
    chip.classList.remove('hidden');
  }

  function applyDevOnlyVisibility() {
    const isDev = isDevModeEnabled();
    _el('settings-group-diagnostics')?.classList.toggle('hidden', !isDev);
    _el('settings-group-diagnostics')?.setAttribute('aria-hidden', isDev ? 'false' : 'true');
    if (!isDev) {
      _el('diag-refresh-btn')?.closest('.setting-row')?.classList.add('hidden');
    }
  }

  function formatDiagnosticDate(ts) {
    const value = Number(ts) || 0;
    if (!value) return '--';
    return new Date(value).toLocaleString();
  }

  function readDiagnosticsLastReset() {
    try {
      const parsed = JSON.parse(localStorage.getItem(DIAGNOSTICS_LAST_RESET_KEY) || 'null');
      if (!parsed || typeof parsed !== 'object') return null;
      return {
        ts: Math.max(0, Number(parsed.ts) || 0),
        reason: String(parsed.reason || '').trim() || 'maintenance',
        build: String(parsed.build || '').trim() || 'local'
      };
    } catch {
      return null;
    }
  }

  async function collectRuntimeDiagnostics() {
    const build = resolveBuildLabel() || 'local';
    const appVersion = `v${APP_SEMVER}`;
    const lastReset = readDiagnosticsLastReset();
    const activePrefs = [
      `focus:${_el('setting-focus')?.value || prefs.focus || DEFAULT_PREFS.focus}`,
      `grade:${_el('s-grade')?.value || prefs.grade || DEFAULT_PREFS.grade}`,
      `length:${_el('s-length')?.value || prefs.length || DEFAULT_PREFS.length}`,
      `pack:${normalizeLessonPackId(prefs.lessonPack || _el('s-lesson-pack')?.value || DEFAULT_PREFS.lessonPack)}`,
      `target:${normalizeLessonTargetId(
        normalizeLessonPackId(prefs.lessonPack || _el('s-lesson-pack')?.value || DEFAULT_PREFS.lessonPack),
        prefs.lessonTarget || _el('s-lesson-target')?.value || DEFAULT_PREFS.lessonTarget
      )}`,
      `voice:${normalizeVoiceMode(_el('s-voice')?.value || prefs.voice || DEFAULT_PREFS.voice)}`
    ].join(' | ');

    let cacheBuckets = 0;
    if ('caches' in window) {
      try {
        const cacheNames = await caches.keys();
        cacheBuckets = cacheNames.filter((name) => String(name || '').startsWith('wq-')).length;
      } catch {}
    }

    let swRegistrations = 0;
    let swRuntimeVersion = SW_RUNTIME_VERSION;
    if ('serviceWorker' in navigator) {
      try {
        const registrations = await navigator.serviceWorker.getRegistrations();
        swRegistrations = registrations.length;
        const activeScript = registrations[0]?.active?.scriptURL || '';
        if (activeScript.includes('sw-runtime.js?v=')) {
          const match = activeScript.match(/sw-runtime\.js\?v=([^&#]+)/i);
          if (match?.[1]) swRuntimeVersion = decodeURIComponent(match[1]);
        }
      } catch {}
    }

    const telemetryEndpoint = resolveTelemetryEndpoint();
    const telemetryMeta = getTelemetryUploadMeta();
    const telemetryQueueSize = getTelemetryQueue().length;

    return {
      build,
      appVersion,
      swRuntimeVersion,
      swRegistrations,
      cacheBuckets,
      activePrefs,
      lastReset,
      telemetry: {
        endpoint: telemetryEndpoint,
        queueSize: telemetryQueueSize,
        lastUpload: telemetryMeta
      }
    };
  }

  async function renderDiagnosticsPanel() {
    const buildEl = _el('diag-build');
    if (!buildEl) return;
    const snapshot = await collectRuntimeDiagnostics();
    const swVersionEl = _el('diag-sw-version');
    const swRegistrationsEl = _el('diag-sw-registrations');
    const cacheBucketsEl = _el('diag-cache-buckets');
    const telemetryEl = _el('diag-telemetry');
    const activePrefsEl = _el('diag-active-prefs');
    const lastResetEl = _el('diag-last-reset');

    buildEl.textContent = `Build: ${snapshot.build} (${snapshot.appVersion})`;
    if (swVersionEl) swVersionEl.textContent = `SW Runtime: ${snapshot.swRuntimeVersion || '--'}`;
    if (swRegistrationsEl) swRegistrationsEl.textContent = `SW Registrations: ${snapshot.swRegistrations}`;
    if (cacheBucketsEl) cacheBucketsEl.textContent = `Cache Buckets: ${snapshot.cacheBuckets}`;
    if (telemetryEl) {
      const endpointLabel = snapshot.telemetry.endpoint || '(disabled)';
      const uploaded = snapshot.telemetry.lastUpload?.ts
        ? `last ${formatDiagnosticDate(snapshot.telemetry.lastUpload.ts)}`
        : 'never uploaded';
      telemetryEl.textContent = `Telemetry Sink: ${endpointLabel} · Queue ${snapshot.telemetry.queueSize} · ${uploaded}`;
    }
    if (activePrefsEl) activePrefsEl.textContent = `Active Prefs: ${snapshot.activePrefs}`;
    if (lastResetEl) {
      const resetLabel = snapshot.lastReset
        ? `${formatDiagnosticDate(snapshot.lastReset.ts)} (${snapshot.lastReset.reason}, ${snapshot.lastReset.build})`
        : '--';
      lastResetEl.textContent = `Last Reset: ${resetLabel}`;
    }
  }

  async function copyDiagnosticsSummary() {
    const snapshot = await collectRuntimeDiagnostics();
    const lines = [
      'WordQuest Diagnostics',
      `App Version: ${snapshot.appVersion}`,
      `Build: ${snapshot.build}`,
      `SW Runtime: ${snapshot.swRuntimeVersion || '--'}`,
      `SW Registrations: ${snapshot.swRegistrations}`,
      `Cache Buckets: ${snapshot.cacheBuckets}`,
      `Telemetry Sink: ${snapshot.telemetry.endpoint || '(disabled)'}`,
      `Telemetry Queue: ${snapshot.telemetry.queueSize}`,
      `Telemetry Last Upload: ${snapshot.telemetry.lastUpload?.ts ? formatDiagnosticDate(snapshot.telemetry.lastUpload.ts) : '--'}`,
      `Active Prefs: ${snapshot.activePrefs}`,
      `Last Reset: ${snapshot.lastReset ? `${formatDiagnosticDate(snapshot.lastReset.ts)} (${snapshot.lastReset.reason}, ${snapshot.lastReset.build})` : '--'}`
    ];
    await copyTextToClipboard(
      lines.join('\n'),
      'Diagnostics copied.',
      'Could not copy diagnostics on this device.'
    );
  }

  function buildStableShareLinkUrl() {
    const url = new URL(window.location.href);
    url.searchParams.delete('cb');
    return url.toString();
  }

  async function copyReviewLink() {
    await copyTextToClipboard(
      buildStableShareLinkUrl(),
      'Share link copied. This link always points to the latest deployed version.',
      'Could not copy share link on this device.'
    );
  }

  function setHoverNoteForElement(el, note) {
    if (!el) return;
    const text = String(note || '').replace(/\s+/g, ' ').trim();
    if (!text) {
      el.removeAttribute('data-hover-note');
      return;
    }
    el.setAttribute('data-hover-note', text);
    if (el.hasAttribute('title')) el.removeAttribute('title');
  }

  function getHoverNoteText(el) {
    if (!el) return '';
    if (el.getAttribute('data-no-hover-note') === 'true') return '';
    const explicit = el.getAttribute('data-hover-note');
    const fromHint = el.getAttribute('data-hint');
    const fromAria = el.getAttribute('aria-label');
    const fromTitle = el.getAttribute('title');
    const raw = String(explicit || fromHint || fromAria || fromTitle || '').replace(/\s+/g, ' ').trim();
    if (!raw) return '';
    if (raw.length <= 120) return raw;
    return `${raw.slice(0, 117).trimEnd()}...`;
  }

  function ensureHoverNoteToast() {
    if (hoverNoteEl && document.body.contains(hoverNoteEl)) return hoverNoteEl;
    const el = document.createElement('div');
    el.id = 'hover-note-toast';
    el.className = 'hover-note-toast hidden';
    el.setAttribute('role', 'status');
    el.setAttribute('aria-live', 'polite');
    el.setAttribute('aria-hidden', 'true');
    document.body.appendChild(el);
    hoverNoteEl = el;
    return hoverNoteEl;
  }

  function hideHoverNoteToast() {
    if (hoverNoteTimer) {
      clearTimeout(hoverNoteTimer);
      hoverNoteTimer = 0;
    }
    hoverNoteTarget = null;
    if (!hoverNoteEl) return;
    hoverNoteEl.classList.remove('is-visible');
    hoverNoteEl.classList.add('hidden');
    hoverNoteEl.setAttribute('aria-hidden', 'true');
  }

  function showHoverNoteToast(targetEl) {
    if (!targetEl || !document.contains(targetEl)) return;
    const text = getHoverNoteText(targetEl);
    if (!text) return;
    const toast = ensureHoverNoteToast();
    toast.textContent = `✨ ${text}`;
    toast.classList.remove('hidden');
    const rect = targetEl.getBoundingClientRect();
    const showAbove = rect.top > 84;
    const placement = showAbove ? 'top' : 'bottom';
    const top = showAbove ? (rect.top - 10) : (rect.bottom + 10);
    const left = Math.max(14, Math.min(window.innerWidth - 14, rect.left + (rect.width / 2)));
    toast.style.left = `${left}px`;
    toast.style.top = `${Math.max(10, Math.min(window.innerHeight - 10, top))}px`;
    toast.setAttribute('data-placement', placement);
    toast.setAttribute('aria-hidden', 'false');
    requestAnimationFrame(() => {
      toast.classList.add('is-visible');
    });
  }

  function scheduleHoverNoteToast(targetEl, delay = HOVER_NOTE_DELAY_MS) {
    if (!window.matchMedia('(hover: hover)').matches) return;
    if (hoverNoteTimer) {
      clearTimeout(hoverNoteTimer);
      hoverNoteTimer = 0;
    }
    hoverNoteTarget = targetEl;
    hoverNoteTimer = window.setTimeout(() => {
      hoverNoteTimer = 0;
      if (hoverNoteTarget !== targetEl) return;
      showHoverNoteToast(targetEl);
    }, Math.max(0, delay));
  }

  function initHoverNoteToasts() {
    if (!window.matchMedia('(hover: hover)').matches) return;
    const captureHoverNote = (eventTarget) => {
      const node = eventTarget?.closest?.(HOVER_NOTE_TARGET_SELECTOR);
      if (!node || !document.contains(node)) return null;
      if (node.getAttribute('data-no-hover-note') === 'true') return null;
      if (node.matches(':disabled,[aria-disabled="true"]')) return null;
      return node;
    };

    document.addEventListener('mouseover', (event) => {
      const node = captureHoverNote(event.target);
      if (!node) return;
      if (node.hasAttribute('title') && !node.hasAttribute('data-hover-note')) {
        setHoverNoteForElement(node, node.getAttribute('title'));
      }
      scheduleHoverNoteToast(node);
    }, true);

    document.addEventListener('mouseout', (event) => {
      const node = captureHoverNote(event.target);
      if (!node) return;
      const related = event.relatedTarget;
      if (related && node.contains(related)) return;
      hideHoverNoteToast();
    }, true);

    document.addEventListener('focusin', (event) => {
      const node = captureHoverNote(event.target);
      if (!node) return;
      scheduleHoverNoteToast(node, 320);
    }, true);

    document.addEventListener('focusout', (event) => {
      const node = captureHoverNote(event.target);
      if (!node) return;
      const related = event.relatedTarget;
      if (related && node.contains(related)) return;
      hideHoverNoteToast();
    }, true);

    document.addEventListener('pointerdown', hideHoverNoteToast, true);
    document.addEventListener('keydown', hideHoverNoteToast, true);
    window.addEventListener('scroll', hideHoverNoteToast, { passive: true });
    window.addEventListener('resize', hideHoverNoteToast, { passive: true });
  }

  async function runAutoCacheRepairForBuild() {
    if (DEMO_MODE) return;
    const CACHE_REPAIR_BUILD_KEY = 'wq_v2_cache_repair_build_v1';
    const buildLabel = resolveBuildLabel();
    if (!buildLabel) return;
    let priorBuild = '';
    try {
      priorBuild = String(localStorage.getItem(CACHE_REPAIR_BUILD_KEY) || '');
      localStorage.setItem(CACHE_REPAIR_BUILD_KEY, buildLabel);
    } catch {
      priorBuild = '';
    }
    if (priorBuild === buildLabel) return;
    if (!('caches' in window)) return;
    try {
      const names = await caches.keys();
      const targets = names.filter((name) => String(name || '').startsWith('wq-'));
      if (targets.length) await Promise.all(targets.map((name) => caches.delete(name)));
    } catch {}
    if ('serviceWorker' in navigator) {
      try {
        const registrations = await navigator.serviceWorker.getRegistrations();
        await Promise.all(registrations.map((registration) => registration.update().catch(() => {})));
      } catch {}
    }
  }

  async function runRemoteBuildConsistencyCheck() {
    if (DEMO_MODE) return;
    const BUILD_REMOTE_CHECK_KEY = 'wq_v2_build_remote_check_v1';
    const currentBuild = resolveBuildLabel();
    if (!currentBuild) return;

    const checkMarker = `${location.pathname}::${currentBuild}`;
    try {
      if (sessionStorage.getItem(BUILD_REMOTE_CHECK_KEY) === checkMarker) return;
      sessionStorage.setItem(BUILD_REMOTE_CHECK_KEY, checkMarker);
    } catch {}

    try {
      const probeUrl = `./index.html?cb=build-check-${Date.now()}`;
      const response = await fetch(probeUrl, { cache: 'no-store' });
      if (!response.ok) return;
      const html = await response.text();
      const match = html.match(/js\/app\.js\?v=([^"'&#]+)/i);
      const deployedBuild = match?.[1] ? decodeURIComponent(match[1]).trim() : '';
      if (!deployedBuild || deployedBuild === currentBuild) return;

      if ('caches' in window) {
        try {
          const names = await caches.keys();
          const targets = names.filter((name) => String(name || '').startsWith('wq-'));
          if (targets.length) await Promise.all(targets.map((name) => caches.delete(name)));
        } catch {}
      }

      if ('serviceWorker' in navigator) {
        try {
          const registrations = await navigator.serviceWorker.getRegistrations();
          await Promise.all(registrations.map(async (registration) => {
            registration.waiting?.postMessage({ type: 'WQ_SKIP_WAITING' });
            await registration.update().catch(() => {});
          }));
        } catch {}
      }

      const params = new URLSearchParams(location.search || '');
      params.set('cb', `build-sync-${deployedBuild}-${Date.now()}`);
      const nextUrl = `${location.pathname}${params.toString() ? `?${params.toString()}` : ''}${location.hash || ''}`;
      location.replace(nextUrl);
    } catch {}
  }

  function installBuildConsistencyHeartbeat() {
    if (DEMO_MODE) return;
    const HEARTBEAT_MS = 5 * 60 * 1000;
    setInterval(() => { void runRemoteBuildConsistencyCheck(); }, HEARTBEAT_MS);
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') {
        void runRemoteBuildConsistencyCheck();
      }
    });
  }
  const themeFamilyById = (() => {
    const map = new Map();
    const themes = Array.isArray(ThemeRegistry?.themes) ? ThemeRegistry.themes : [];
    themes.forEach((theme) => {
      if (!theme || !theme.id) return;
      map.set(String(theme.id), String(theme.family || 'core'));
    });
    return map;
  })();

  function getThemeFamily(themeId) {
    return themeFamilyById.get(String(themeId || '').toLowerCase()) || 'core';
  }

  const AUTO_MUSIC_BY_THEME = Object.freeze({
    default: 'chill',
    sunset: 'lofi',
    ocean: 'chill',
    superman: 'fantasy',
    mario: 'arcade',
    zelda: 'fantasy',
    amongus: 'scifi',
    rainbowfriends: 'upbeat',
    marvel: 'scifi',
    seahawks: 'chill',
    huskies: 'chill',
    ironman: 'scifi',
    harleyquinn: 'lofi',
    kuromi: 'lofi',
    harrypotter: 'fantasy',
    minecraft: 'arcade',
    demonhunter: 'fantasy',
    dark: 'chill',
    coffee: 'coffee',
    matrix: 'scifi'
  });

  const AUTO_MUSIC_BY_FAMILY = Object.freeze({
    core: 'chill',
    sports: 'chill',
    inspired: 'lofi',
    dark: 'lofi'
  });

  const SUBJECT_FOCUS_GRADE = Object.freeze({
    k2: 'K-2',
    '35': 'G3-5',
    '68': 'G6-8',
    '912': 'G9-12'
  });

  function getCurriculumLengthForFocus(focusValue, fallback = 'any') {
    const normalizedFocus = String(focusValue || '').trim().toLowerCase();
    if (normalizedFocus === 'cvc') return '3';
    return String(fallback || 'any').trim() || 'any';
  }

  function normalizeCurriculumTarget(rawTarget) {
    if (!rawTarget || typeof rawTarget !== 'object') return null;
    const id = String(rawTarget.id || '').trim();
    const label = String(rawTarget.label || '').trim();
    if (!id || !label) return null;
    const focus = String(rawTarget.focus || 'cvc').trim();
    const rawLength = String(rawTarget.length || 'any').trim();
    return Object.freeze({
      id,
      label,
      focus,
      gradeBand: String(rawTarget.gradeBand || 'K-2').trim(),
      length: getCurriculumLengthForFocus(focus, rawLength),
      pacing: String(rawTarget.pacing || '').trim()
    });
  }

  function getMappedCurriculumTargets(packId) {
    const table = window.WQCurriculumTaxonomy;
    if (!table || typeof table !== 'object') return [];
    const rows = table[packId];
    if (!Array.isArray(rows) || !rows.length) return [];
    return rows
      .map((row) => normalizeCurriculumTarget(row))
      .filter(Boolean);
  }

  function resolveUfliLessonMeta(lessonNumber) {
    if (lessonNumber <= 8) return { focus: 'cvc', gradeBand: 'K-2', length: '3' };
    if (lessonNumber <= 24) return { focus: 'digraph', gradeBand: 'K-2', length: '4' };
    if (lessonNumber <= 34) return { focus: 'cvce', gradeBand: 'K-2', length: '4' };
    if (lessonNumber <= 52) return { focus: 'vowel_team', gradeBand: 'K-2', length: '5' };
    if (lessonNumber <= 64) return { focus: 'r_controlled', gradeBand: 'K-2', length: '5' };
    if (lessonNumber <= 80) return { focus: 'welded', gradeBand: 'G3-5', length: '6' };
    if (lessonNumber <= 104) return { focus: 'multisyllable', gradeBand: 'G3-5', length: '6' };
    return { focus: 'suffix', gradeBand: 'G3-5', length: '6' };
  }

  function buildUfliLessonTargets() {
    const mapped = getMappedCurriculumTargets('ufli');
    if (mapped.length) return Object.freeze(mapped);
    const targets = [];
    for (let lesson = 1; lesson <= 128; lesson += 1) {
      const meta = resolveUfliLessonMeta(lesson);
      targets.push(Object.freeze({
        id: `ufli-lesson-${lesson}`,
        label: `UFLI Lesson ${lesson}`,
        focus: meta.focus,
        gradeBand: meta.gradeBand,
        length: meta.length,
        pacing: `Lesson ${lesson}`
      }));
    }
    return Object.freeze(targets);
  }

  function resolveFundationsUnitMeta(level, unitNumber) {
    if (level === 1) {
      if (unitNumber <= 4) return { focus: 'cvc', gradeBand: 'K-2', length: '3' };
      if (unitNumber <= 8) return { focus: 'digraph', gradeBand: 'K-2', length: '4' };
      return { focus: 'welded', gradeBand: 'K-2', length: '5' };
    }
    if (level === 2) {
      if (unitNumber <= 6) return { focus: 'r_controlled', gradeBand: 'G3-5', length: '5' };
      if (unitNumber <= 11) return { focus: 'vowel_team', gradeBand: 'G3-5', length: '6' };
      return { focus: 'suffix', gradeBand: 'G3-5', length: '6' };
    }
    if (unitNumber <= 6) return { focus: 'multisyllable', gradeBand: 'G6-8', length: '7' };
    if (unitNumber <= 11) return { focus: 'prefix', gradeBand: 'G6-8', length: '7' };
    return { focus: 'suffix', gradeBand: 'G6-8', length: '7' };
  }

  function buildFundationsLessonTargets() {
    const mapped = getMappedCurriculumTargets('fundations');
    if (mapped.length) return Object.freeze(mapped);
    const byLevel = Object.freeze([
      Object.freeze({ level: 1, units: 14 }),
      Object.freeze({ level: 2, units: 17 }),
      Object.freeze({ level: 3, units: 16 })
    ]);
    const targets = [];
    byLevel.forEach((row) => {
      for (let unit = 1; unit <= row.units; unit += 1) {
        const meta = resolveFundationsUnitMeta(row.level, unit);
        targets.push(Object.freeze({
          id: `fundations-l${row.level}-u${unit}`,
          label: `Fundations Level ${row.level} Unit ${unit}`,
          focus: meta.focus,
          gradeBand: meta.gradeBand,
          length: meta.length,
          pacing: `Level ${row.level} · Unit ${unit}`
        }));
      }
    });
    return Object.freeze(targets);
  }

  function resolveWilsonStepFocus(step) {
    if (step === 1) return 'cvc';
    if (step === 2) return 'welded';
    if (step === 3) return 'cvce';
    if (step === 4) return 'r_controlled';
    if (step === 5) return 'vowel_team';
    if (step <= 7) return 'multisyllable';
    if (step === 8) return 'prefix';
    if (step === 9) return 'suffix';
    return 'multisyllable';
  }

  function buildWilsonLessonTargets() {
    const mapped = getMappedCurriculumTargets('wilson');
    if (mapped.length) return Object.freeze(mapped);
    const targets = [];
    for (let step = 1; step <= 12; step += 1) {
      for (let lesson = 1; lesson <= 5; lesson += 1) {
        const gradeBand = step <= 5 ? 'G3-5' : 'G6-8';
        const length = step <= 5 ? '6' : '7';
        targets.push(Object.freeze({
          id: `wilson-step-${step}-lesson-${lesson}`,
          label: `Wilson Step ${step} Lesson ${lesson}`,
          focus: resolveWilsonStepFocus(step),
          gradeBand,
          length,
          pacing: `Step ${step} · Lesson ${lesson}`
        }));
      }
    }
    return Object.freeze(targets);
  }

  function buildLexiaWidaLessonTargets() {
    const mapped = getMappedCurriculumTargets('lexiawida');
    if (mapped.length) return Object.freeze(mapped);
    return Object.freeze([
      Object.freeze({ id: 'lexia-wida-entering-k2', label: 'Lexia English WIDA Entering (1) · Grade K-2 · Lessons 1-2', focus: 'cvc', gradeBand: 'K-2', length: '3', pacing: 'Entering 1 · K-2' }),
      Object.freeze({ id: 'lexia-wida-entering-36', label: 'Lexia English WIDA Entering (1) · Grades 3-6 · Lessons 1-3', focus: 'multisyllable', gradeBand: 'G3-5', length: '5', pacing: 'Entering 1 · Grades 3-6' })
    ]);
  }

  const CURRICULUM_LESSON_PACKS = Object.freeze({
    custom: Object.freeze({
      label: 'Manual (no pack)',
      targets: Object.freeze([])
    }),
    phonics: Object.freeze({
      label: 'Phonics Curriculum',
      targets: Object.freeze([
        Object.freeze({ id: 'phonics-k2-cvc', label: 'Phonics K-2 · CVC and short vowels', focus: 'cvc', gradeBand: 'K-2', length: '3', pacing: 'Weeks 1-6 (Sep-Oct)' }),
        Object.freeze({ id: 'phonics-k2-digraph', label: 'Phonics K-2 · Digraphs and blends', focus: 'digraph', gradeBand: 'K-2', length: '4', pacing: 'Weeks 7-12 (Oct-Nov)' }),
        Object.freeze({ id: 'phonics-k2-cvce', label: 'Phonics K-2 · Magic E (CVCe)', focus: 'cvce', gradeBand: 'K-2', length: '4', pacing: 'Weeks 13-18 (Dec-Jan)' }),
        Object.freeze({ id: 'phonics-35-vowel-team', label: 'Phonics G3-5 · Vowel teams', focus: 'vowel_team', gradeBand: 'G3-5', length: '5', pacing: 'Weeks 19-24 (Feb-Mar)' }),
        Object.freeze({ id: 'phonics-35-r-controlled', label: 'Phonics G3-5 · R-controlled vowels', focus: 'r_controlled', gradeBand: 'G3-5', length: '5', pacing: 'Weeks 25-30 (Apr-May)' }),
        Object.freeze({ id: 'phonics-35-multisyllable', label: 'Phonics G3-5 · Multisyllable transfer', focus: 'multisyllable', gradeBand: 'G3-5', length: '6', pacing: 'Weeks 31-36 (May-Jun)' })
      ])
    }),
    ufli: Object.freeze({
      label: 'UFLI',
      targets: buildUfliLessonTargets()
    }),
    fundations: Object.freeze({
      label: 'Fundations',
      targets: buildFundationsLessonTargets()
    }),
    wilson: Object.freeze({
      label: 'Wilson Reading System',
      targets: buildWilsonLessonTargets()
    }),
    lexiawida: Object.freeze({
      label: 'Lexia English (WIDA)',
      targets: buildLexiaWidaLessonTargets()
    }),
    justwords: Object.freeze({
      label: 'Just Words',
      targets: Object.freeze([
        Object.freeze({ id: 'jw-unit-1', label: 'Just Words Unit 1 · Syllable and vowel patterns', focus: 'multisyllable', gradeBand: 'G6-8', length: '7', pacing: 'Weeks 1-7 (Sep-Oct)' }),
        Object.freeze({ id: 'jw-unit-2', label: 'Just Words Unit 2 · Prefix study', focus: 'prefix', gradeBand: 'G6-8', length: '7', pacing: 'Weeks 8-14 (Nov-Dec)' }),
        Object.freeze({ id: 'jw-unit-3', label: 'Just Words Unit 3 · Suffix study', focus: 'suffix', gradeBand: 'G6-8', length: '7', pacing: 'Weeks 15-22 (Jan-Feb)' }),
        Object.freeze({ id: 'jw-unit-4', label: 'Just Words Unit 4 · Roots and meaning', focus: 'vocab-ela-68', gradeBand: 'G6-8', length: 'any', pacing: 'Weeks 23-30 (Mar-Apr)' }),
        Object.freeze({ id: 'jw-unit-5', label: 'Just Words Unit 5 · Reading-writing transfer', focus: 'vocab-ela-68', gradeBand: 'G6-8', length: 'any', pacing: 'Weeks 31-36 (May-Jun)' })
      ])
    })
  });
  const CURRICULUM_PACK_ORDER = Object.freeze(['ufli', 'fundations', 'wilson', 'lexiawida', 'justwords']);

  const CHUNK_TAB_FOCUS_KEYS = new Set([
    'digraph',
    'ccvc',
    'cvcc',
    'trigraph',
    'welded',
    'diphthong',
    'vowel_team',
    'r_controlled',
    'floss'
  ]);
  const TEAM_LABELS = Object.freeze(['Team A', 'Team B', 'Team C', 'Team D']);

  function getThemeFallback() {
    return 'seahawks';
  }

  function normalizeTheme(theme, fallback = getThemeFallback()) {
    if (ThemeRegistry && typeof ThemeRegistry.normalizeTheme === 'function') {
      return ThemeRegistry.normalizeTheme(theme, fallback);
    }
    return theme || fallback;
  }

  function readThemeFromQuery() {
    try {
      const params = new URLSearchParams(window.location.search || '');
      const raw = params.get('theme') || '';
      const normalized = String(raw || '').trim();
      if (!normalized) return '';
      return normalizeTheme(normalized, getThemeFallback());
    } catch {
      return '';
    }
  }

  function readWritingStudioReturnFlag() {
    try {
      const params = new URLSearchParams(window.location.search || '');
      return params.get('wq_studio_return') === '1';
    } catch {
      return false;
    }
  }

  function readWritingStudioHiddenFlag() {
    try {
      const params = new URLSearchParams(window.location.search || '');
      return params.get('ws_hidden') === '1';
    } catch {
      return false;
    }
  }

  function consumeWritingStudioReturnSummary() {
    if (!readWritingStudioReturnFlag()) return;
    focusSearchReopenGuardUntil = Date.now() + 1500;
    closeFocusSearchList();
    const focusInput = _el('focus-inline-search');
    if (focusInput) {
      focusInput.blur();
      focusInput.setAttribute('aria-expanded', 'false');
    }
    setFocusSearchOpen(false);
    let payload = null;
    try {
      payload = JSON.parse(localStorage.getItem(WRITING_STUDIO_RETURN_KEY) || 'null');
      localStorage.removeItem(WRITING_STUDIO_RETURN_KEY);
    } catch {
      payload = null;
    }
    try {
      const params = new URLSearchParams(window.location.search || '');
      params.delete('wq_studio_return');
      const query = params.toString();
      const nextUrl = `${location.pathname}${query ? `?${query}` : ''}${location.hash || ''}`;
      history.replaceState(null, '', nextUrl);
    } catch {}
    if (!payload || typeof payload !== 'object') return;
    const words = Math.max(0, Number(payload.words) || 0);
    const sentences = Math.max(0, Number(payload.sentences) || 0);
    const mode = String(payload.mode || '').toLowerCase() === 'paragraph' ? 'paragraph' : 'sentence';
    const planItems = Math.max(0, Number(payload.planItems) || 0);
    const focus = String(payload.focus || '').trim();
    emitTelemetry('studio_return', {
      studio_words: words,
      studio_sentences: sentences,
      studio_mode: mode,
      studio_plan_items: planItems,
      studio_focus: focus || null
    });
    setTimeout(() => {
      closeFocusSearchList();
      setFocusSearchOpen(false);
    }, 0);
    setTimeout(() => {
      closeFocusSearchList();
      setFocusSearchOpen(false);
    }, 220);
  }

  function consumeWritingStudioHiddenNotice() {
    if (!readWritingStudioHiddenFlag()) return;
    try {
      const params = new URLSearchParams(window.location.search || '');
      params.delete('ws_hidden');
      const query = params.toString();
      const nextUrl = `${location.pathname}${query ? `?${query}` : ''}${location.hash || ''}`;
      history.replaceState(null, '', nextUrl);
    } catch {}
    WQUI.showToast('Writing Studio is hidden in this shared build.');
  }

  function normalizeMusicMode(mode) {
    const normalized = String(mode || '').trim().toLowerCase();
    return ALLOWED_MUSIC_MODES.has(normalized) ? normalized : DEFAULT_PREFS.music;
  }

  function normalizeVoiceMode(mode) {
    const normalized = String(mode || '').trim().toLowerCase();
    return ALLOWED_VOICE_MODES.has(normalized)
      ? normalized
      : DEFAULT_PREFS.voice;
  }

  function normalizeRevealPacing(mode) {
    const normalized = String(mode || '').trim().toLowerCase();
    return normalized === 'quick' || normalized === 'slow'
      ? normalized
      : DEFAULT_PREFS.revealPacing;
  }

  function normalizeRevealAutoNext(mode) {
    const normalized = String(mode || '').trim().toLowerCase();
    if (normalized === 'off') return 'off';
    const seconds = Number.parseInt(normalized, 10);
    if (!Number.isFinite(seconds) || seconds <= 0) return DEFAULT_PREFS.revealAutoNext;
    if (seconds <= 3) return '3';
    if (seconds <= 5) return '5';
    return '8';
  }

  function normalizeTeamMode(mode) {
    return String(mode || '').trim().toLowerCase() === 'on' ? 'on' : 'off';
  }

  function normalizeTeamCount(value) {
    const count = Number.parseInt(String(value || '').trim(), 10);
    if (!Number.isFinite(count) || count < 2) return '2';
    if (count > 4) return '4';
    return String(count);
  }

  function normalizeTurnTimer(value) {
    const normalized = String(value || '').trim().toLowerCase();
    if (normalized === 'off') return 'off';
    const seconds = Number.parseInt(normalized, 10);
    if (!Number.isFinite(seconds) || seconds <= 0) return 'off';
    if (seconds <= 30) return '30';
    if (seconds <= 45) return '45';
    return '60';
  }

  function normalizeReportCompactMode(value) {
    return String(value || '').trim().toLowerCase() === 'on' ? 'on' : 'off';
  }

  function normalizeMasterySort(value) {
    const normalized = String(value || '').trim().toLowerCase();
    return ALLOWED_MASTERY_SORT_MODES.has(normalized) ? normalized : 'attempts_desc';
  }

  function normalizeMasteryFilter(value) {
    const normalized = String(value || '').trim().toLowerCase();
    return ALLOWED_MASTERY_FILTER_MODES.has(normalized) ? normalized : 'all';
  }

  function resolveAutoMusicMode(themeId) {
    const normalizedTheme = normalizeTheme(themeId, getThemeFallback());
    const directMode = AUTO_MUSIC_BY_THEME[normalizedTheme];
    if (directMode) return directMode;
    return AUTO_MUSIC_BY_FAMILY[getThemeFamily(normalizedTheme)] || 'chill';
  }

  function updateMusicStatus(selectedMode, activeMode) {
    const status = _el('s-music-active');
    if (!status) return;
    if (selectedMode === 'off') {
      status.textContent = 'Music is stopped.';
      syncQuickMusicDock('off', activeMode);
      return;
    }
    const activeLabel = MUSIC_LABELS[activeMode] || activeMode;
    if (selectedMode === 'auto') {
      status.textContent = `Auto picks ${activeLabel} for the active theme.`;
      syncQuickMusicDock(selectedMode, activeMode);
      return;
    }
    status.textContent = `Fixed music vibe: ${activeLabel}.`;
    syncQuickMusicDock(selectedMode, activeMode);
  }

  function syncQuickMusicDock(selectedMode, activeMode) {
    const toggleBtn = _el('quick-music-toggle');
    const prevBtn = _el('quick-music-prev');
    const nextBtn = _el('quick-music-next');
    const shuffleBtn = _el('quick-music-shuffle');
    const labelEl = _el('quick-music-label');
    if (!toggleBtn) return;
    const selected = normalizeMusicMode(selectedMode || _el('s-music')?.value || prefs.music || DEFAULT_PREFS.music);
    const active = normalizeMusicMode(activeMode || (selected === 'auto'
      ? resolveAutoMusicMode(normalizeTheme(document.documentElement.getAttribute('data-theme'), getThemeFallback()))
      : selected));
    const isOn = selected !== 'off';
    const activeLabel = MUSIC_LABELS[active] || active;
    toggleBtn.setAttribute('aria-pressed', isOn ? 'true' : 'false');
    toggleBtn.classList.toggle('is-on', isOn);
    toggleBtn.setAttribute('data-music-state', isOn ? 'on' : 'off');
    toggleBtn.textContent = isOn ? '⏸' : '▶';
    toggleBtn.setAttribute('aria-label', isOn
      ? `Pause music. Current vibe: ${activeLabel}.`
      : 'Play music.');
    setHoverNoteForElement(toggleBtn, isOn ? `Pause music (${activeLabel}).` : 'Play music.');
    [prevBtn, nextBtn, shuffleBtn].forEach((btn) => {
      if (!btn) return;
      btn.classList.toggle('is-on', isOn);
    });
    if (prevBtn) setHoverNoteForElement(prevBtn, `Previous vibe (now ${activeLabel}).`);
    if (nextBtn) setHoverNoteForElement(nextBtn, `Next vibe (now ${activeLabel}).`);
    if (shuffleBtn) setHoverNoteForElement(shuffleBtn, `Shuffle vibe (now ${activeLabel}).`);
    if (labelEl) {
      labelEl.textContent = isOn ? activeLabel : 'Stopped';
    }
    if (isOn) {
      try { localStorage.setItem(LAST_NON_OFF_MUSIC_KEY, selected === 'auto' ? 'auto' : active); } catch {}
    }
  }

  function syncQuickMusicVolume(value) {
    const quickVolume = _el('quick-music-vol');
    if (!quickVolume) return;
    const next = Math.max(0, Math.min(1, Number.parseFloat(value)));
    quickVolume.value = String(Number.isFinite(next) ? next : Number.parseFloat(DEFAULT_PREFS.musicVol));
  }

  function getPreferredMusicOnMode() {
    try {
      const stored = normalizeMusicMode(localStorage.getItem(LAST_NON_OFF_MUSIC_KEY) || '');
      if (stored && stored !== 'off') return stored;
    } catch {}
    const pref = normalizeMusicMode(_el('s-music')?.value || prefs.music || DEFAULT_PREFS.music);
    if (pref !== 'off') return pref;
    return 'auto';
  }

  function toggleMusicQuick() {
    const select = _el('s-music');
    const current = normalizeMusicMode(select?.value || prefs.music || DEFAULT_PREFS.music);
    const next = current === 'off' ? getPreferredMusicOnMode() : 'off';
    if (select) select.value = next;
    setPref('music', next);
    syncMusicForTheme({ toast: true });
  }

  function getCurrentMusicVibeForControls() {
    const selected = normalizeMusicMode(_el('s-music')?.value || prefs.music || DEFAULT_PREFS.music);
    if (selected === 'off') return getPreferredMusicOnMode();
    if (selected === 'auto') {
      const activeTheme = normalizeTheme(document.documentElement.getAttribute('data-theme'), getThemeFallback());
      return resolveAutoMusicMode(activeTheme);
    }
    return selected;
  }

  function applyMusicModeFromQuick(mode, options = {}) {
    const next = normalizeMusicMode(mode);
    if (next === 'off') return;
    const select = _el('s-music');
    if (select) select.value = next;
    setPref('music', next);
    syncMusicForTheme({ toast: options.toast !== false });
  }

  function stepMusicVibe(direction = 1) {
    const current = getCurrentMusicVibeForControls();
    const idx = Math.max(0, QUICK_MUSIC_VIBE_ORDER.indexOf(current));
    const next = QUICK_MUSIC_VIBE_ORDER[(idx + direction + QUICK_MUSIC_VIBE_ORDER.length) % QUICK_MUSIC_VIBE_ORDER.length];
    applyMusicModeFromQuick(next, { toast: true });
  }

  function shuffleMusicVibe() {
    const current = getCurrentMusicVibeForControls();
    const pool = QUICK_MUSIC_VIBE_ORDER.filter((mode) => mode !== current);
    const next = pool[Math.floor(Math.random() * pool.length)] || current;
    applyMusicModeFromQuick(next, { toast: true });
  }

  function setLocalMusicFiles(fileList) {
    const msgEl = _el('s-music-upload-msg');
    const files = Array.from(fileList || [])
      .filter((file) => file && /^audio\//i.test(String(file.type || '')) && Number(file.size || 0) > 0);
    if (!musicController || typeof musicController.setCustomFiles !== 'function') {
      if (msgEl) msgEl.textContent = 'Local upload is unavailable in this build.';
      return;
    }
    if (!files.length) {
      if (msgEl) msgEl.textContent = 'No valid audio files selected.';
      return;
    }
    const result = musicController.setCustomFiles(files);
    const count = Number(result?.count || 0);
    const selected = normalizeMusicMode(_el('s-music')?.value || prefs.music || DEFAULT_PREFS.music);
    if (selected === 'off') {
      applyMusicModeFromQuick(getPreferredMusicOnMode(), { toast: false });
    } else {
      syncMusicForTheme({ toast: false });
    }
    const message = count > 0
      ? `Loaded ${count} local track${count === 1 ? '' : 's'} for this device.`
      : 'No valid audio files selected.';
    if (msgEl) msgEl.textContent = message;
    WQUI.showToast(message);
  }

  function clearLocalMusicFiles() {
    const msgEl = _el('s-music-upload-msg');
    if (musicController && typeof musicController.clearCustomFiles === 'function') {
      musicController.clearCustomFiles();
    }
    syncMusicForTheme({ toast: false });
    if (msgEl) msgEl.textContent = 'Local MP3 list cleared.';
    WQUI.showToast('Local MP3 list cleared.');
  }

  function syncMusicForTheme(options = {}) {
    const selected = normalizeMusicMode(_el('s-music')?.value || prefs.music || DEFAULT_PREFS.music);
    const activeTheme = normalizeTheme(document.documentElement.getAttribute('data-theme'), getThemeFallback());
    const effective = selected === 'auto' ? resolveAutoMusicMode(activeTheme) : selected;
    if (musicController) musicController.setMode(effective);
    updateMusicStatus(selected, effective);
    const signature = `${selected}::${effective}`;
    if (telemetryLastMusicSignature !== signature) {
      telemetryLastMusicSignature = signature;
      emitTelemetry('wq_music_change', {
        selected_music_mode: selected,
        active_music_mode: effective,
        source: options.toast ? 'user' : 'system'
      });
    }
    if (options.toast) {
      const label = MUSIC_LABELS[effective] || effective;
      WQUI.showToast(selected === 'auto' ? `Music auto: ${label}.` : `Music: ${label}.`);
    }
  }

  // Apply saved values to selects
  const PREF_SELECTS = {
    'setting-focus': 'focus',
    's-lesson-pack': 'lessonPack',
    's-theme-save': 'themeSave',
    's-board-style': 'boardStyle',
    's-key-style': 'keyStyle',
    's-keyboard-layout': 'keyboardLayout',
    's-text-size': 'textSize',
    's-chunk-tabs': 'chunkTabs',
    's-atmosphere': 'atmosphere',
    's-ui-skin': 'uiSkin',
    's-reveal-focus': 'revealFocus',
    's-play-style': 'playStyle',
    's-reveal-pacing': 'revealPacing',
    's-reveal-auto-next': 'revealAutoNext',
    's-voice-task': 'voicePractice',
    's-team-mode': 'teamMode',
    's-team-count': 'teamCount',
    's-turn-timer': 'turnTimer',
    's-probe-rounds': 'probeRounds',
    's-boost-popups': 'boostPopups',
    's-starter-words': 'starterWords',
    's-grade': 'grade', 's-length': 'length',
    's-guesses': 'guesses', 's-case': 'caseMode', 's-hint': 'hint',
    's-dupe': 'dupe', 's-confetti': 'confetti',
    's-projector': 'projector', 's-motion': 'motion'
  };
  Object.entries(PREF_SELECTS).forEach(([id, key]) => {
    const el = _el(id);
    if (!el) return;
    const next = prefs[key] !== undefined ? prefs[key] : DEFAULT_PREFS[key];
    if (next !== undefined) el.value = next;
  });
  const meaningPlusFunToggle = _el('s-meaning-fun-link');
  if (meaningPlusFunToggle) {
    const includeFunByDefault = (prefs.meaningPlusFun || DEFAULT_PREFS.meaningPlusFun) === 'on';
    meaningPlusFunToggle.checked = includeFunByDefault;
  }
  const sorNotationToggle = _el('s-sor-notation');
  if (sorNotationToggle) {
    sorNotationToggle.checked = (prefs.sorNotation || DEFAULT_PREFS.sorNotation) === 'on';
  }
  const assessmentLockToggle = _el('s-assessment-lock');
  if (assessmentLockToggle) {
    assessmentLockToggle.checked = (prefs.assessmentLock || DEFAULT_PREFS.assessmentLock) === 'on';
  }
  const reportCompactToggle = _el('s-report-compact');
  if (reportCompactToggle) {
    reportCompactToggle.checked = normalizeReportCompactMode(prefs.reportCompact || DEFAULT_PREFS.reportCompact) === 'on';
  }
  const confidenceCoachingToggle = _el('s-confidence-coaching');
  if (confidenceCoachingToggle) {
    confidenceCoachingToggle.checked = String(prefs.confidenceCoaching || DEFAULT_PREFS.confidenceCoaching).toLowerCase() !== 'off';
  }
  const masterySortSelect = _el('s-mastery-sort');
  if (masterySortSelect) {
    masterySortSelect.value = normalizeMasterySort(masterySortSelect.value || 'attempts_desc');
  }
  const masteryFilterSelect = _el('s-mastery-filter');
  if (masteryFilterSelect) {
    masteryFilterSelect.value = normalizeMasteryFilter(masteryFilterSelect.value || 'all');
  }
  const musicSelect = _el('s-music');
  if (musicSelect) {
    const selectedMusic = normalizeMusicMode(prefs.music || DEFAULT_PREFS.music);
    musicSelect.value = selectedMusic;
    if (prefs.music !== selectedMusic) setPref('music', selectedMusic);
  }
  const musicVolInput = _el('s-music-vol');
  if (musicVolInput) {
    musicVolInput.value = String(prefs.musicVol ?? DEFAULT_PREFS.musicVol);
    syncQuickMusicVolume(musicVolInput.value);
  } else {
    syncQuickMusicVolume(prefs.musicVol ?? DEFAULT_PREFS.musicVol);
  }
  const voiceSelect = _el('s-voice');
  if (voiceSelect) {
    const selectedVoice = normalizeVoiceMode(prefs.voice || DEFAULT_PREFS.voice);
    voiceSelect.value = selectedVoice;
    if (prefs.voice !== selectedVoice) setPref('voice', selectedVoice);
  }
  const revealPacingSelect = _el('s-reveal-pacing');
  if (revealPacingSelect) {
    const selectedPacing = normalizeRevealPacing(prefs.revealPacing || DEFAULT_PREFS.revealPacing);
    revealPacingSelect.value = selectedPacing;
    if (prefs.revealPacing !== selectedPacing) setPref('revealPacing', selectedPacing);
  }
  const revealAutoNextSelect = _el('s-reveal-auto-next');
  if (revealAutoNextSelect) {
    const selectedAutoNext = normalizeRevealAutoNext(prefs.revealAutoNext || DEFAULT_PREFS.revealAutoNext);
    revealAutoNextSelect.value = selectedAutoNext;
    if (prefs.revealAutoNext !== selectedAutoNext) setPref('revealAutoNext', selectedAutoNext);
  }
  const teamModeSelect = _el('s-team-mode');
  if (teamModeSelect) {
    const selectedTeamMode = normalizeTeamMode(prefs.teamMode || DEFAULT_PREFS.teamMode);
    teamModeSelect.value = selectedTeamMode;
    if (prefs.teamMode !== selectedTeamMode) setPref('teamMode', selectedTeamMode);
  }
  const teamCountSelect = _el('s-team-count');
  if (teamCountSelect) {
    const selectedTeamCount = normalizeTeamCount(prefs.teamCount || DEFAULT_PREFS.teamCount);
    teamCountSelect.value = selectedTeamCount;
    if (prefs.teamCount !== selectedTeamCount) setPref('teamCount', selectedTeamCount);
  }
  const turnTimerSelect = _el('s-turn-timer');
  if (turnTimerSelect) {
    const selectedTurnTimer = normalizeTurnTimer(prefs.turnTimer || DEFAULT_PREFS.turnTimer);
    turnTimerSelect.value = selectedTurnTimer;
    if (prefs.turnTimer !== selectedTurnTimer) setPref('turnTimer', selectedTurnTimer);
  }
  syncBuildBadge();
  syncPersistentVersionChip();
  applyDevOnlyVisibility();
  void runAutoCacheRepairForBuild();
  void runRemoteBuildConsistencyCheck();
  installBuildConsistencyHeartbeat();

  const themeSelect = _el('s-theme');
  const queryTheme = readThemeFromQuery();
  const initialThemeSelection = queryTheme || (shouldPersistTheme() ? prefs.theme : getThemeFallback());
  if (themeSelect && ThemeRegistry && typeof ThemeRegistry.renderThemeOptions === 'function') {
    ThemeRegistry.renderThemeOptions(themeSelect, initialThemeSelection || getThemeFallback());
  } else if (themeSelect && initialThemeSelection) {
    themeSelect.value = initialThemeSelection;
  }
  normalizeHeaderControlLayout();
  syncHeaderStaticIcons();
  initHoverNoteToasts();
  emitTelemetry('wq_session_start', {
    source: 'app_init'
  });
  emitTelemetry('wq_funnel_session_start', {
    source: 'app_init'
  });

  // Apply theme + modes immediately
  applyUiSkin(prefs.uiSkin || DEFAULT_PREFS.uiSkin, { persist: false });
  const initialTheme = applyTheme(initialThemeSelection || getThemeFallback());
  if (shouldPersistTheme()) {
    if (prefs.theme !== initialTheme) setPref('theme', initialTheme);
  } else if (prefs.theme !== undefined) {
    delete prefs.theme;
    savePrefs(prefs);
  }
  applyProjector(prefs.projector || DEFAULT_PREFS.projector);
  applyMotion(prefs.motion || DEFAULT_PREFS.motion);
  applyHint(getHintMode());
  applyPlayStyle(prefs.playStyle || DEFAULT_PREFS.playStyle, { persist: false });
  applyStarterWordMode(prefs.starterWords || DEFAULT_PREFS.starterWords, { persist: false });
  applyRevealFocusMode(prefs.revealFocus || DEFAULT_PREFS.revealFocus, { persist: false });
  applyFeedback(prefs.feedback || DEFAULT_PREFS.feedback);
  applyBoardStyle(prefs.boardStyle || DEFAULT_PREFS.boardStyle);
  applyKeyStyle(prefs.keyStyle || DEFAULT_PREFS.keyStyle);
  applyKeyboardLayout(prefs.keyboardLayout || DEFAULT_PREFS.keyboardLayout);
  applyTextSize(prefs.textSize || DEFAULT_PREFS.textSize);
  applyAtmosphere(prefs.atmosphere || DEFAULT_PREFS.atmosphere);
  WQUI.setCaseMode(prefs.caseMode || DEFAULT_PREFS.caseMode);
  syncCaseToggleUI();
  updateWilsonModeToggle();
  syncHintToggleUI();
  applyReportCompactMode(prefs.reportCompact || DEFAULT_PREFS.reportCompact, { persist: false });

  // Voice picker populated after brief delay
  setTimeout(populateVoiceSelector, 700);
  if (window.speechSynthesis) {
    const priorVoicesChanged = window.speechSynthesis.onvoiceschanged;
    window.speechSynthesis.onvoiceschanged = (...args) => {
      if (typeof priorVoicesChanged === 'function') {
        try { priorVoicesChanged.apply(window.speechSynthesis, args); } catch {}
      }
      populateVoiceSelector();
    };
  }

  // ─── 4. Theme / projector / motion helpers ──────────
  function getThemeDisplayLabel(themeId) {
    const normalized = normalizeTheme(themeId, getThemeFallback());
    if (ThemeRegistry && typeof ThemeRegistry.getLabel === 'function') {
      return ThemeRegistry.getLabel(normalized);
    }
    return normalized;
  }

  function syncSettingsThemeName(themeId) {
    const labelEl = _el('settings-theme-name');
    if (!labelEl) return;
    const normalized = normalizeTheme(themeId || document.documentElement.getAttribute('data-theme'), getThemeFallback());
    labelEl.textContent = getThemeDisplayLabel(normalized);
    labelEl.title = `Current theme: ${getThemeDisplayLabel(normalized)}`;
  }

  function applyTheme(name) {
    const normalized = normalizeTheme(name, getThemeFallback());
    const beforeTheme = normalizeTheme(document.documentElement.getAttribute('data-theme'), getThemeFallback());
    document.documentElement.setAttribute('data-theme', normalized);
    document.documentElement.setAttribute('data-theme-family', getThemeFamily(normalized));
    const select = _el('s-theme');
    if (select && select.value !== normalized) select.value = normalized;
    syncSettingsThemeName(normalized);
    syncMusicForTheme();
    if (beforeTheme !== normalized) {
      emitTelemetry('wq_theme_change', {
        from_theme: beforeTheme,
        to_theme: normalized
      });
    }
    return normalized;
  }

  function applyProjector(mode) {
    document.documentElement.setAttribute('data-projector', mode);
  }

  function applyUiSkin(mode, options = {}) {
    const normalized = normalizeUiSkin(mode);
    document.documentElement.setAttribute('data-ui-skin', normalized);
    const select = _el('s-ui-skin');
    if (select && select.value !== normalized) select.value = normalized;
    if (options.persist !== false) setPref('uiSkin', normalized);
    return normalized;
  }

  function applyMotion(mode) {
    document.documentElement.setAttribute('data-motion', mode);
  }

  function applyHint(mode) {
    document.documentElement.setAttribute('data-hint', mode);
  }

  function applyReportCompactMode(mode, options = {}) {
    const normalized = normalizeReportCompactMode(mode);
    const enabled = normalized === 'on';
    const panel = _el('teacher-session-panel');
    if (panel) panel.classList.toggle('is-compact-report', enabled);
    const toggle = _el('s-report-compact');
    if (toggle) toggle.checked = enabled;
    if (options.persist !== false) setPref('reportCompact', normalized);
    return normalized;
  }

  function getRevealFocusMode() {
    const mode = String(_el('s-reveal-focus')?.value || prefs.revealFocus || DEFAULT_PREFS.revealFocus).toLowerCase();
    return mode === 'off' ? 'off' : 'on';
  }

  function getRevealPacingMode() {
    return normalizeRevealPacing(_el('s-reveal-pacing')?.value || prefs.revealPacing || DEFAULT_PREFS.revealPacing);
  }

  function getRevealAutoNextSeconds() {
    const mode = normalizeRevealAutoNext(_el('s-reveal-auto-next')?.value || prefs.revealAutoNext || DEFAULT_PREFS.revealAutoNext);
    if (mode === 'off') return 0;
    return Number.parseInt(mode, 10) || 0;
  }

  function syncRevealFocusModalSections() {
    const focusMode = getRevealFocusMode();
    const practiceDetails = _el('modal-practice-details');
    if (practiceDetails && !practiceDetails.classList.contains('hidden')) {
      const requiredPractice = getVoicePracticeMode() === 'required' && !voiceTakeComplete;
      practiceDetails.open = requiredPractice || focusMode === 'off';
    }
    const details = _el('modal-more-details');
    if (details && !details.classList.contains('hidden')) {
      details.open = focusMode === 'off';
    }
  }

  function applyRevealFocusMode(mode, options = {}) {
    const normalized = mode === 'off' ? 'off' : 'on';
    const select = _el('s-reveal-focus');
    if (select && select.value !== normalized) select.value = normalized;
    document.documentElement.setAttribute('data-reveal-focus', normalized);
    if (options.persist !== false) setPref('revealFocus', normalized);
    if (!(_el('modal-overlay')?.classList.contains('hidden'))) {
      syncRevealFocusModalSections();
    }
    return normalized;
  }

  let lastAssessmentLockNoticeAt = 0;

  function isAssessmentLockEnabled() {
    const toggle = _el('s-assessment-lock');
    if (toggle) return !!toggle.checked;
    return (prefs.assessmentLock || DEFAULT_PREFS.assessmentLock) === 'on';
  }

  function isAssessmentRoundLocked() {
    if (!isAssessmentLockEnabled()) return false;
    const state = WQGame.getState?.();
    return Boolean(state?.word && !state?.gameOver);
  }

  function showAssessmentLockNotice(message = 'Assessment lock is on until this round ends.') {
    const now = Date.now();
    if (now - lastAssessmentLockNoticeAt < 1200) return;
    lastAssessmentLockNoticeAt = now;
    WQUI.showToast(message);
  }

  function syncAssessmentLockRuntime(options = {}) {
    const locked = isAssessmentRoundLocked();
    const settingsBtn = _el('settings-btn');
    if (settingsBtn) {
      settingsBtn.classList.toggle('is-locked', locked);
      settingsBtn.setAttribute('aria-disabled', locked ? 'true' : 'false');
      setHoverNoteForElement(
        settingsBtn,
        locked
          ? 'Assessment lock: settings unavailable until round ends.'
          : 'Settings'
      );
    }
    if (locked) {
      _el('settings-panel')?.classList.add('hidden');
      if (options.closeFocus !== false) closeFocusSearchList();
      syncHeaderControlsVisibility();
    } else {
      syncThemePreviewStripVisibility();
    }
  }

  function getHintMode() {
    const mode = String(_el('s-hint')?.value || prefs.hint || DEFAULT_PREFS.hint).toLowerCase();
    return mode === 'off' ? 'off' : 'on';
  }

  function isConfidenceCoachingEnabled() {
    const toggle = _el('s-confidence-coaching');
    if (toggle) return !!toggle.checked;
    return String(prefs.confidenceCoaching || DEFAULT_PREFS.confidenceCoaching).toLowerCase() !== 'off';
  }

  function setConfidenceCoachingMode(enabled, options = {}) {
    const normalized = enabled ? 'on' : 'off';
    const toggle = _el('s-confidence-coaching');
    if (toggle) toggle.checked = normalized === 'on';
    setPref('confidenceCoaching', normalized);
    if (normalized === 'off') hideInformantHintCard();
    updateNextActionLine();
    if (options.toast) {
      WQUI.showToast(normalized === 'on'
        ? 'Confidence coaching is on.'
        : 'Confidence coaching is off.');
    }
  }

  function syncHintToggleUI(mode = getHintMode()) {
    const toggle = _el('focus-hint-toggle');
    if (!toggle) return;
    const enabled = mode !== 'off';
    const playStyle = normalizePlayStyle(_el('s-play-style')?.value || prefs.playStyle || DEFAULT_PREFS.playStyle);
    const listening = playStyle === 'listening';
    const minimumGuesses = getHintUnlockMinimum(playStyle);
    const guessNoun = minimumGuesses === 1 ? 'guess' : 'guesses';
    toggle.textContent = listening ? 'Sound Help' : 'Clue Hint';
    toggle.setAttribute('aria-pressed', 'false');
    toggle.setAttribute('aria-label', listening
      ? 'Open optional sound help for listening and spelling'
      : 'Open optional clue hint');
    setHoverNoteForElement(
      toggle,
      enabled
        ? (listening
            ? `Optional support. Unlocks after ${minimumGuesses} submitted ${guessNoun}.`
            : `Optional clue support with phonics markings. Unlocks after ${minimumGuesses} submitted ${guessNoun}.`)
        : 'Hint cues are off in settings, but you can still ask for support'
    );
    toggle.classList.toggle('is-off', !enabled);
  }

  function setHintMode(mode, options = {}) {
    const normalized = mode === 'off' ? 'off' : 'on';
    const select = _el('s-hint');
    if (select && select.value !== normalized) select.value = normalized;
    setPref('hint', normalized);
    applyHint(normalized);
    syncHintToggleUI(normalized);
    updateFocusHint();
    const state = WQGame.getState?.();
    if (state?.wordLength && state?.maxGuesses && typeof WQUI.calcLayout === 'function') {
      WQUI.calcLayout(state.wordLength, state.maxGuesses);
    }
    if (options.toast) {
      WQUI.showToast(normalized === 'off' ? 'Hint cues are off.' : 'Hint cues are on.');
    }
    updateNextActionLine();
  }

  function normalizePlayStyle(mode) {
    return String(mode || '').toLowerCase() === 'listening' ? 'listening' : 'detective';
  }

  function syncPlayStyleToggleUI(mode = normalizePlayStyle(_el('s-play-style')?.value || prefs.playStyle || DEFAULT_PREFS.playStyle)) {
    const toggle = _el('play-style-toggle');
    if (!toggle) return;
    const listening = mode === 'listening';
    toggle.innerHTML = `
      <span class="play-style-toggle-mode">${listening ? 'Hear & Spell' : 'Guess & Check'}</span>
      <span class="play-style-toggle-switch">Toggle Mode</span>
    `;
    toggle.setAttribute('aria-pressed', listening ? 'true' : 'false');
    toggle.classList.toggle('is-listening', listening);
    toggle.setAttribute('aria-label', listening
      ? 'Hear and Spell mode on. Hear meaning and encode what you hear.'
      : 'Guess and Check mode on. Use tile colors and clues to encode.');
    setHoverNoteForElement(
      toggle,
      listening
        ? 'Hear and Spell mode: hear word plus meaning, then spell by sound.'
        : 'Guess and Check mode: use color feedback and clues.'
    );
  }

  function clearFocusSupportUnlockTimer() {
    if (!focusSupportUnlockTimer) return;
    clearTimeout(focusSupportUnlockTimer);
    focusSupportUnlockTimer = 0;
  }

  function scheduleFocusSupportUnlock() {
    clearFocusSupportUnlockTimer();
    if (focusSupportUnlockedByMiss) return;
    const waitMs = Math.max(0, focusSupportUnlockAt - Date.now());
    focusSupportUnlockTimer = setTimeout(() => {
      syncHeaderClueLauncherUI();
      syncStarterWordLauncherUI();
    }, waitMs + 40);
  }

  function areFocusSupportsUnlocked() {
    if (focusSupportUnlockedByMiss) return true;
    const state = WQGame.getState?.() || {};
    if (!state.word || state.gameOver) return true;
    return Date.now() >= focusSupportUnlockAt;
  }

  function syncHeaderClueLauncherUI(mode = normalizePlayStyle(_el('s-play-style')?.value || prefs.playStyle || DEFAULT_PREFS.playStyle)) {
    const button = _el('phonics-clue-open-btn');
    const focusButton = _el('focus-clue-btn');
    if (!button) return;
    const listening = mode === 'listening';
    button.innerHTML = '<span class="quick-btn-label">Clue</span><span class="quick-btn-emoji" aria-hidden="true">🧩</span>';
    setHoverNoteForElement(
      button,
      listening
        ? 'Open listening coach support.'
        : 'Open Clue Sprint for detective-style clue practice.'
    );
    button.setAttribute('aria-label', listening
      ? 'Open listening coach support'
      : 'Open Clue Sprint for detective clue practice');
    button.classList.add('hidden');
    if (focusButton) {
      const shouldHide = isMissionLabStandaloneMode() || !areFocusSupportsUnlocked();
      focusButton.classList.toggle('hidden', shouldHide);
      focusButton.setAttribute('aria-label', listening ? 'Open listening coach support' : 'Open clue support');
      setHoverNoteForElement(
        focusButton,
        listening
          ? 'Open listening coach support.'
          : 'Open Clue Sprint for detective clue practice.'
      );
    }
  }

  function getStarterWordMode() {
    return normalizeStarterWordMode(_el('s-starter-words')?.value || prefs.starterWords || DEFAULT_PREFS.starterWords);
  }

  function getStarterWordAutoThreshold(mode = getStarterWordMode()) {
    if (mode === 'after_2') return 2;
    if (mode === 'after_3') return 3;
    return 0;
  }

  function syncStarterWordLauncherUI(mode = getStarterWordMode()) {
    const button = _el('starter-word-open-btn');
    const focusButton = _el('focus-ideas-btn');
    if (!button) return;
    button.innerHTML = '<span class="quick-btn-label">Need Ideas</span><span class="quick-btn-emoji" aria-hidden="true">💡</span>';
    const normalized = normalizeStarterWordMode(mode);
    const missionMode = isMissionLabStandaloneMode();
    const hidden = normalized === 'off' || missionMode || !areFocusSupportsUnlocked();
    button.classList.add('hidden');
    if (focusButton) focusButton.classList.toggle('hidden', hidden);
    if (hidden) return;
    const threshold = getStarterWordAutoThreshold(normalized);
    button.setAttribute('aria-label', 'Show try these words list');
    button.title = threshold > 0
      ? `Show starter word ideas. Auto-opens after ${threshold} guesses if needed.`
      : 'Show starter word ideas.';
    setHoverNoteForElement(
      button,
      threshold > 0
        ? `Starter words are available now and auto-open after ${threshold} guesses.`
        : 'Starter words are available on demand.'
    );
    if (focusButton) {
      focusButton.setAttribute('aria-label', 'Show starter word ideas');
      setHoverNoteForElement(
        focusButton,
        threshold > 0
          ? `Starter words are available now and auto-open after ${threshold} guesses.`
          : 'Starter words are available on demand.'
      );
    }
  }

  function applyStarterWordMode(mode, options = {}) {
    const normalized = normalizeStarterWordMode(mode);
    const select = _el('s-starter-words');
    if (select && select.value !== normalized) select.value = normalized;
    if (options.persist !== false) setPref('starterWords', normalized);
    syncStarterWordLauncherUI(normalized);
    if (normalized === 'off') hideStarterWordCard();
    return normalized;
  }

  function hideListeningModeExplainer() {
    _el('listening-mode-overlay')?.classList.add('hidden');
  }

  function showListeningModeExplainer() {
    // Disabled by request: avoid interruptive explainer popup.
    hideListeningModeExplainer();
  }

  function syncGameplayAudioStrip(mode = normalizePlayStyle(_el('s-play-style')?.value || prefs.playStyle || DEFAULT_PREFS.playStyle)) {
    const gameplayAudio = document.querySelector('.gameplay-audio');
    const listeningMode = mode === 'listening' && !isMissionLabStandaloneMode();
    const modeBanner = _el('play-style-banner');
    if (modeBanner) {
      modeBanner.textContent = '';
      modeBanner.classList.add('hidden');
      modeBanner.setAttribute('aria-hidden', 'true');
    }
    const hearWordBtn = _el('g-hear-word');
    const hearWordLabel = _el('g-hear-word-label');
    if (hearWordLabel) hearWordLabel.textContent = listeningMode ? 'Listen to Word' : 'Hear Word';
    if (hearWordBtn) {
      hearWordBtn.setAttribute('title', listeningMode ? 'Listen to the target word audio' : 'Hear target word audio');
      hearWordBtn.setAttribute('aria-label', listeningMode ? 'Listen to the target word audio' : 'Hear target word audio');
    }
    const hearDefBtn = _el('g-hear-def');
    const hearDefLabel = _el('g-hear-def-label');
    if (hearDefLabel) hearDefLabel.textContent = 'Listen to Definition';
    if (hearDefBtn) {
      hearDefBtn.classList.toggle('hidden', !listeningMode);
      hearDefBtn.setAttribute('title', 'Listen to the definition audio');
      hearDefBtn.setAttribute('aria-label', 'Listen to the definition audio');
    }
    const focusHintToggle = _el('focus-hint-toggle');
    if (focusHintToggle) {
      focusHintToggle.classList.toggle('hidden', listeningMode);
    }
    if (!gameplayAudio) {
      syncHintToggleUI(getHintMode());
      return;
    }
    gameplayAudio.classList.toggle('is-single-action', false);
    gameplayAudio.classList.toggle('hidden', !listeningMode);
    gameplayAudio.setAttribute('aria-hidden', listeningMode ? 'false' : 'true');
    syncHintToggleUI(getHintMode());
  }

  function applyPlayStyle(mode, options = {}) {
    const beforeMode = normalizePlayStyle(document.documentElement.getAttribute('data-play-style') || prefs.playStyle || DEFAULT_PREFS.playStyle);
    const normalized = normalizePlayStyle(mode);
    document.documentElement.setAttribute('data-play-style', normalized);
    const select = _el('s-play-style');
    if (select && select.value !== normalized) select.value = normalized;
    syncPlayStyleToggleUI(normalized);
    syncHeaderClueLauncherUI(normalized);
    syncStarterWordLauncherUI();
    syncGameplayAudioStrip(normalized);
    if (options.persist !== false) setPref('playStyle', normalized);
    if (beforeMode !== normalized) {
      emitTelemetry('wq_mode_change', {
        from_mode: beforeMode,
        to_mode: normalized
      });
      if (normalized === 'listening') {
        showListeningModeExplainer();
      } else {
        hideListeningModeExplainer();
      }
    }
    updateNextActionLine();
    return normalized;
  }

  function isAnyOverlayModalOpen() {
    const revealOpen = !_el('modal-overlay')?.classList.contains('hidden');
    const missionOpen = !_el('challenge-modal')?.classList.contains('hidden');
    const setupOpen = !_el('first-run-setup-modal')?.classList.contains('hidden');
    const listeningOpen = !_el('listening-mode-overlay')?.classList.contains('hidden');
    return !!(revealOpen || missionOpen || setupOpen || listeningOpen);
  }

  function hideInformantHintCard() {
    clearStarterCoachTimer();
    clearInformantHintHideTimer();
    const card = _el('hint-clue-card');
    if (!card) return;
    _el('hint-clue-sentence-btn')?.classList.remove('hidden');
    card.classList.remove('visible');
    card.classList.add('hidden');
  }

  let starterCoachTimer = 0;
  let informantHintHideTimer = 0;

  const SOR_HINT_PROFILES = Object.freeze({
    initial_blend: Object.freeze({
      catchphrase: 'Blend Builders',
      concept: 'Initial blend focus',
      rule: 'Your word contains an initial blend. Two consonants sit together, and you hear both sounds.',
      examples: Object.freeze([
        Object.freeze({
          parts: Object.freeze([
            Object.freeze({ text: 'b', mark: 'letter' }),
            Object.freeze({ text: 'r', mark: 'letter' }),
            Object.freeze({ text: 'ing' })
          ]),
          note: 'Each consonant keeps its own sound: /b/ + /r/.'
        }),
        Object.freeze({
          parts: Object.freeze([
            Object.freeze({ text: 's', mark: 'letter' }),
            Object.freeze({ text: 't', mark: 'letter' }),
            Object.freeze({ text: 'op' })
          ]),
          note: 'Read both consonants quickly, then slide to the vowel.'
        })
      ])
    }),
    final_blend: Object.freeze({
      catchphrase: 'Blend Builders',
      concept: 'Final blend focus',
      rule: 'Your word contains a final blend. The ending has two consonants, and you hear both sounds.',
      examples: Object.freeze([
        Object.freeze({
          parts: Object.freeze([
            Object.freeze({ text: 'ca' }),
            Object.freeze({ text: 'm', mark: 'letter' }),
            Object.freeze({ text: 'p', mark: 'letter' })
          ]),
          note: 'Say the ending /m/ + /p/ clearly.'
        }),
        Object.freeze({
          parts: Object.freeze([
            Object.freeze({ text: 'ne' }),
            Object.freeze({ text: 's', mark: 'letter' }),
            Object.freeze({ text: 't', mark: 'letter' })
          ]),
          note: 'Hold both ending consonants without dropping one.'
        })
      ])
    }),
    digraph: Object.freeze({
      catchphrase: 'Sound Buddies',
      concept: 'Digraph focus',
      rule: 'Your word has a digraph. Two letters work together to make one sound.',
      examples: Object.freeze([
        Object.freeze({
          parts: Object.freeze([
            Object.freeze({ text: 'sh', mark: 'team' }),
            Object.freeze({ text: 'ip' })
          ]),
          note: 'Keep the two letters locked as one sound chunk.'
        }),
        Object.freeze({
          parts: Object.freeze([
            Object.freeze({ text: 'th', mark: 'team' }),
            Object.freeze({ text: 'in' })
          ]),
          note: 'Read the digraph first, then finish the word.'
        })
      ])
    }),
    trigraph: Object.freeze({
      catchphrase: 'Three-Letter Team',
      concept: 'Trigraph focus',
      rule: 'Your word includes a three-letter sound team. Read the chunk first before adding other letters.',
      examples: Object.freeze([
        Object.freeze({
          parts: Object.freeze([
            Object.freeze({ text: 'l' }),
            Object.freeze({ text: 'igh', mark: 'team' }),
            Object.freeze({ text: 't' })
          ]),
          note: 'Treat igh as one sound chunk.'
        }),
        Object.freeze({
          parts: Object.freeze([
            Object.freeze({ text: 'ma' }),
            Object.freeze({ text: 'tch', mark: 'team' })
          ]),
          note: 'Keep tch together at the end.'
        })
      ])
    }),
    cvc: Object.freeze({
      catchphrase: 'Sound Steps',
      concept: 'CVC short-vowel focus',
      rule: 'Your word follows a consonant-vowel-consonant pattern with a short vowel in the middle.',
      examples: Object.freeze([
        Object.freeze({
          parts: Object.freeze([
            Object.freeze({ text: 'c' }),
            Object.freeze({ text: 'a', mark: 'letter' }),
            Object.freeze({ text: 't' })
          ]),
          note: 'Tap each sound: /c/ /a/ /t/.'
        }),
        Object.freeze({
          parts: Object.freeze([
            Object.freeze({ text: 'd' }),
            Object.freeze({ text: 'o', mark: 'letter' }),
            Object.freeze({ text: 'g' })
          ]),
          note: 'Keep the center vowel short and crisp.'
        })
      ])
    }),
    cvce: Object.freeze({
      catchphrase: 'Magic E',
      concept: 'CVCe focus',
      rule: 'Your word uses silent e. The ending e is quiet and makes the vowel say its name.',
      examples: Object.freeze([
        Object.freeze({
          parts: Object.freeze([
            Object.freeze({ text: 'c' }),
            Object.freeze({ text: 'a', mark: 'letter' }),
            Object.freeze({ text: 'p' }),
            Object.freeze({ text: 'e', mark: 'silent' })
          ]),
          note: 'The silent e changes cap to cape.'
        }),
        Object.freeze({
          parts: Object.freeze([
            Object.freeze({ text: 'k' }),
            Object.freeze({ text: 'i', mark: 'letter' }),
            Object.freeze({ text: 't' }),
            Object.freeze({ text: 'e', mark: 'silent' })
          ]),
          note: 'The vowel says its name in kite.'
        })
      ])
    }),
    vowel_team: Object.freeze({
      catchphrase: 'Vowel Team Detectives',
      concept: 'Vowel team focus',
      rule: 'Your word has a vowel team. Two vowels work together to carry one main sound.',
      examples: Object.freeze([
        Object.freeze({
          parts: Object.freeze([
            Object.freeze({ text: 'r' }),
            Object.freeze({ text: 'ai', mark: 'team' }),
            Object.freeze({ text: 'n' })
          ]),
          note: 'Read ai as one chunk.'
        }),
        Object.freeze({
          parts: Object.freeze([
            Object.freeze({ text: 'b' }),
            Object.freeze({ text: 'oa', mark: 'team' }),
            Object.freeze({ text: 't' })
          ]),
          note: 'Read oa as one chunk.'
        })
      ])
    }),
    r_controlled: Object.freeze({
      catchphrase: 'Bossy R',
      concept: 'R-controlled vowel focus',
      rule: 'Your word contains an r-controlled vowel. The r changes the vowel sound.',
      examples: Object.freeze([
        Object.freeze({
          parts: Object.freeze([
            Object.freeze({ text: 'c' }),
            Object.freeze({ text: 'ar', mark: 'team' })
          ]),
          note: 'Read ar as one sound pattern.'
        }),
        Object.freeze({
          parts: Object.freeze([
            Object.freeze({ text: 'h' }),
            Object.freeze({ text: 'er', mark: 'team' })
          ]),
          note: 'Read er as one sound pattern.'
        })
      ])
    }),
    diphthong: Object.freeze({
      catchphrase: 'Glide Team',
      concept: 'Diphthong focus',
      rule: 'Your word contains a diphthong. The vowel sound glides as your mouth moves.',
      examples: Object.freeze([
        Object.freeze({
          parts: Object.freeze([
            Object.freeze({ text: 'c' }),
            Object.freeze({ text: 'oi', mark: 'team' }),
            Object.freeze({ text: 'n' })
          ]),
          note: 'The oi glide is one sound chunk.'
        }),
        Object.freeze({
          parts: Object.freeze([
            Object.freeze({ text: 'cl' }),
            Object.freeze({ text: 'ou', mark: 'team' }),
            Object.freeze({ text: 'd' })
          ]),
          note: 'The ou glide is one sound chunk.'
        })
      ])
    }),
    welded: Object.freeze({
      catchphrase: 'Welded Sounds',
      concept: 'Welded sound focus',
      rule: 'Your word has a welded sound chunk. Keep the vowel plus ending consonants together.',
      examples: Object.freeze([
        Object.freeze({
          parts: Object.freeze([
            Object.freeze({ text: 'b' }),
            Object.freeze({ text: 'ang', mark: 'team' })
          ]),
          note: 'Read ang as one welded unit.'
        }),
        Object.freeze({
          parts: Object.freeze([
            Object.freeze({ text: 'r' }),
            Object.freeze({ text: 'ing', mark: 'team' })
          ]),
          note: 'Read ing as one welded unit.'
        })
      ])
    }),
    floss: Object.freeze({
      catchphrase: 'FLOSS Rule',
      concept: 'Double ending focus',
      rule: 'Your word may end with doubled f, l, s, or z after a short vowel in a one-syllable word.',
      examples: Object.freeze([
        Object.freeze({
          parts: Object.freeze([
            Object.freeze({ text: 'be' }),
            Object.freeze({ text: 'll', mark: 'team' })
          ]),
          note: 'll is doubled after a short vowel sound.'
        }),
        Object.freeze({
          parts: Object.freeze([
            Object.freeze({ text: 'o' }),
            Object.freeze({ text: 'ff', mark: 'team' })
          ]),
          note: 'ff is doubled after a short vowel sound.'
        })
      ])
    }),
    schwa: Object.freeze({
      catchphrase: 'Schwa Spotter',
      concept: 'Schwa focus',
      rule: 'Your word has a schwa sound. The vowel is unstressed and sounds like /uh/.',
      examples: Object.freeze([
        Object.freeze({
          parts: Object.freeze([
            Object.freeze({ text: 'a', mark: 'schwa' }),
            Object.freeze({ text: 'bout' })
          ]),
          note: 'The a is unstressed and says /uh/.'
        }),
        Object.freeze({
          parts: Object.freeze([
            Object.freeze({ text: 'sof' }),
            Object.freeze({ text: 'a', mark: 'schwa' })
          ]),
          note: 'The final a is unstressed and says /uh/.'
        })
      ])
    }),
    prefix: Object.freeze({
      catchphrase: 'Prefix Power',
      concept: 'Prefix focus',
      rule: 'Your word starts with a prefix. Read the prefix chunk first, then the base word.',
      examples: Object.freeze([
        Object.freeze({
          parts: Object.freeze([
            Object.freeze({ text: 're', mark: 'affix' }),
            Object.freeze({ text: 'play' })
          ]),
          note: 'Read re- first, then the base word.'
        }),
        Object.freeze({
          parts: Object.freeze([
            Object.freeze({ text: 'un', mark: 'affix' }),
            Object.freeze({ text: 'lock' })
          ]),
          note: 'Read un- first, then the base word.'
        })
      ])
    }),
    suffix: Object.freeze({
      catchphrase: 'Suffix Power',
      concept: 'Suffix focus',
      rule: 'Your word ends with a suffix. Read the base word first, then attach the ending.',
      examples: Object.freeze([
        Object.freeze({
          parts: Object.freeze([
            Object.freeze({ text: 'jump' }),
            Object.freeze({ text: 'ed', mark: 'affix' })
          ]),
          note: 'Read base + suffix: jump + ed.'
        }),
        Object.freeze({
          parts: Object.freeze([
            Object.freeze({ text: 'run' }),
            Object.freeze({ text: 'ning', mark: 'affix' })
          ]),
          note: 'Read base + suffix: run + ning.'
        })
      ])
    }),
    multisyllable: Object.freeze({
      catchphrase: 'Syllable Strategy',
      concept: 'Multisyllable focus',
      rule: 'Your word has more than one syllable. Chunk it into syllables before spelling.',
      examples: Object.freeze([
        Object.freeze({
          parts: Object.freeze([
            Object.freeze({ text: 'sun' }),
            Object.freeze({ text: '-' }),
            Object.freeze({ text: 'set' })
          ]),
          note: 'Read each syllable chunk, then blend.'
        }),
        Object.freeze({
          parts: Object.freeze([
            Object.freeze({ text: 'com' }),
            Object.freeze({ text: '-' }),
            Object.freeze({ text: 'plete' })
          ]),
          note: 'Read each syllable chunk, then blend.'
        })
      ])
    }),
    compound: Object.freeze({
      catchphrase: 'Word Builders',
      concept: 'Compound word focus',
      rule: 'Your word joins two smaller words. Find each part first, then combine.',
      examples: Object.freeze([
        Object.freeze({
          parts: Object.freeze([
            Object.freeze({ text: 'sun' }),
            Object.freeze({ text: 'flower' })
          ]),
          note: 'sun + flower = sunflower'
        }),
        Object.freeze({
          parts: Object.freeze([
            Object.freeze({ text: 'rain' }),
            Object.freeze({ text: 'coat' })
          ]),
          note: 'rain + coat = raincoat'
        })
      ])
    }),
    subject: Object.freeze({
      catchphrase: 'Context Detectives',
      concept: 'Vocabulary-in-context focus',
      rule: 'Use the sentence clue first to identify meaning, then map the sounds and spell.',
      examples: Object.freeze([
        Object.freeze({
          parts: Object.freeze([Object.freeze({ text: 'Use sentence meaning first.' })]),
          note: 'Then spell using the sounds you hear.'
        })
      ])
    }),
    general: Object.freeze({
      catchphrase: 'Pattern Detectives',
      concept: 'Phonics focus',
      rule: 'Use one clear sound pattern clue, then confirm with the sentence.',
      examples: Object.freeze([
        Object.freeze({
          parts: Object.freeze([Object.freeze({ text: 'Check beginning + middle + ending.' })]),
          note: 'Then use color feedback to refine the next guess.'
        })
      ])
    })
  });

  function clearStarterCoachTimer() {
    if (!starterCoachTimer) return;
    clearTimeout(starterCoachTimer);
    starterCoachTimer = 0;
  }

  function clearInformantHintHideTimer() {
    if (!informantHintHideTimer) return;
    clearTimeout(informantHintHideTimer);
    informantHintHideTimer = 0;
  }

  function normalizeHintCategoryFromFocusTag(focusValue, phonicsTag) {
    const focus = String(focusValue || '').trim().toLowerCase();
    const tag = String(phonicsTag || '').trim().toLowerCase();

    if (focus === 'ccvc') return 'initial_blend';
    if (focus === 'cvcc') return 'final_blend';
    if (focus === 'digraph' || /digraph/.test(tag)) return 'digraph';
    if (focus === 'trigraph' || /trigraph/.test(tag)) return 'trigraph';
    if (focus === 'cvc' || /(^|[^a-z])cvc([^a-z]|$)|closed[\s-]*syllable|short[\s-]*vowel/.test(tag)) return 'cvc';
    if (focus === 'cvce' || /silent[\s-]*e|magic[\s-]*e|cvce/.test(tag)) return 'cvce';
    if (focus === 'vowel_team' || /vowel[\s_-]*team/.test(tag)) return 'vowel_team';
    if (focus === 'r_controlled' || /r[\s_-]*controlled/.test(tag)) return 'r_controlled';
    if (focus === 'diphthong' || /diphthong/.test(tag)) return 'diphthong';
    if (focus === 'welded' || /welded/.test(tag)) return 'welded';
    if (focus === 'floss' || /floss/.test(tag)) return 'floss';
    if (focus === 'schwa' || /schwa/.test(tag)) return 'schwa';
    if (focus === 'prefix' || /prefix/.test(tag)) return 'prefix';
    if (focus === 'suffix' || /suffix/.test(tag)) return 'suffix';
    if (focus === 'multisyllable' || /multisyll/.test(tag)) return 'multisyllable';
    if (focus === 'compound' || /compound/.test(tag)) return 'compound';
    if (/blend/.test(tag)) {
      if (/final|\(-/.test(tag)) return 'final_blend';
      return 'initial_blend';
    }
    return 'general';
  }

  function detectHintCategoryFromWord(wordValue) {
    const word = String(wordValue || '').toLowerCase().replace(/[^a-z]/g, '');
    if (!word) return 'cvc';
    if (/(tch|dge|igh)/.test(word)) return 'trigraph';
    if (/^(sh|ch|th|wh|ph)/.test(word) || /(sh|ch|th|wh|ph|ck|ng)/.test(word)) return 'digraph';
    if (/(oi|oy|ou|ow|au|aw)/.test(word)) return 'diphthong';
    if (/(ai|ay|ea|ee|oa|oe|ie|ue|ui)/.test(word)) return 'vowel_team';
    if (/(ar|or|er|ir|ur)/.test(word)) return 'r_controlled';
    if (/(ang|ing|ong|ung|ank|ink|onk|unk)$/.test(word)) return 'welded';
    if (/(ff|ll|ss|zz)$/.test(word)) return 'floss';
    if (/^[a-z]{3}$/.test(word) && /^[^aeiou][aeiou][^aeiou]$/.test(word)) return 'cvc';
    if (/^[a-z]{4,}$/.test(word) && /[^aeiou][aeiou][^aeiou]e$/.test(word)) return 'cvce';
    if (/^[bcdfghjklmnpqrstvwxyz]{2}/.test(word)) return 'initial_blend';
    if (/[bcdfghjklmnpqrstvwxyz]{2}$/.test(word)) return 'final_blend';
    if (word.length >= 7 || /[aeiou].*[aeiou].*[aeiou]/.test(word)) return 'multisyllable';
    return 'cvc';
  }

  function buildMarkedHintParts(word, start, end, mark) {
    const upper = String(word || '').toUpperCase();
    const left = upper.slice(0, Math.max(0, start));
    const middle = upper.slice(Math.max(0, start), Math.max(start, end));
    const right = upper.slice(Math.max(start, end));
    const parts = [];
    if (left) parts.push(Object.freeze({ text: left }));
    if (middle) parts.push(Object.freeze({ text: middle, mark: mark || 'letter' }));
    if (right) parts.push(Object.freeze({ text: right }));
    return Object.freeze(parts);
  }

  function buildLiveHintExample(wordValue, category) {
    const word = String(wordValue || '').toLowerCase().replace(/[^a-z]/g, '');
    if (!word) return null;

    const teamMatch = word.match(/(ai|ay|ea|ee|oa|oe|ie|ue|ui|oo|oi|oy|ou|ow|au|aw|ew)/);
    const digraphMatch = word.match(/(sh|ch|th|wh|ph|ck|ng|qu)/);
    const rControlledMatch = word.match(/(ar|or|er|ir|ur)/);
    const prefixMatch = word.match(/^(un|re|pre|dis|mis|non|sub|inter|trans|over|under|anti|de)/);
    const suffixMatch = word.match(/(ing|ed|er|est|ly|tion|sion|ment|ness|less|ful|able|ible|ous|ive|al|y)$/);

    if (category === 'vowel_team' && teamMatch?.[0]) {
      const start = teamMatch.index || 0;
      const end = start + teamMatch[0].length;
      return Object.freeze({
        parts: buildMarkedHintParts(word, start, end, 'team'),
        note: 'Vowel team clue: these letters share one vowel sound.'
      });
    }

    if ((category === 'digraph' || category === 'trigraph' || category === 'welded') && digraphMatch?.[0]) {
      const start = digraphMatch.index || 0;
      const end = start + digraphMatch[0].length;
      return Object.freeze({
        parts: buildMarkedHintParts(word, start, end, 'team'),
        note: 'Sound team clue: these letters work together as one sound.'
      });
    }

    if (category === 'r_controlled' && rControlledMatch?.[0]) {
      const start = rControlledMatch.index || 0;
      const end = start + rControlledMatch[0].length;
      return Object.freeze({
        parts: buildMarkedHintParts(word, start, end, 'team'),
        note: 'Bossy R clue: the vowel + r shifts the vowel sound.'
      });
    }

    if (category === 'prefix' && prefixMatch?.[0]) {
      return Object.freeze({
        parts: buildMarkedHintParts(word, 0, prefixMatch[0].length, 'affix'),
        note: 'Prefix clue: read the beginning chunk first.'
      });
    }

    if (category === 'suffix' && suffixMatch?.[0]) {
      const end = word.length;
      const start = end - suffixMatch[0].length;
      return Object.freeze({
        parts: buildMarkedHintParts(word, start, end, 'affix'),
        note: 'Suffix clue: lock in the ending chunk.'
      });
    }

    if (category === 'cvce' && /[^aeiou][aeiou][^aeiou]e$/.test(word)) {
      return Object.freeze({
        parts: Object.freeze([
          Object.freeze({ text: word.slice(0, -1).toUpperCase() }),
          Object.freeze({ text: 'E', mark: 'silent' })
        ]),
        note: 'Magic E clue: the final e is silent and changes the vowel sound.'
      });
    }

    return null;
  }

  function buildFriendlyHintMessage(category, sourceLabel) {
    const cleanSource = String(sourceLabel || '').replace(/\s+/g, ' ').trim();
    const focusText = cleanSource ? `Focus: ${cleanSource}. ` : '';
    const ruleByCategory = Object.freeze({
      cvc: 'Say the sounds: first, middle, last.',
      digraph: 'Find the 2-letter sound team first.',
      trigraph: 'Find the 3-letter sound team first.',
      cvce: 'Look for magic e at the end.',
      vowel_team: 'Find the vowel team and keep it together.',
      r_controlled: 'Find the vowel + r chunk and say it as one sound.',
      diphthong: 'Listen for the sliding vowel sound.',
      welded: 'Read the welded chunk as one unit.',
      floss: 'Short vowel + doubled ending letters.',
      prefix: 'Read the beginning chunk, then the base word.',
      suffix: 'Read the base word, then add the ending.',
      multisyllable: 'Chunk it, then blend it.',
      compound: 'Find two small words and join them.',
      subject: 'Use meaning first, then spell by sound.',
      general: 'Try one sound clue, then adjust.'
    });
    const rule = ruleByCategory[category] || ruleByCategory.general;
    return `${focusText}${rule} The sentence clue uses the secret word.`;
  }

  function getHintUnlockMinimum(playStyle) {
    return playStyle === 'listening' ? 1 : 2;
  }

  function getHintUnlockCopy(playStyle, guessCount) {
    const mode = playStyle === 'listening' ? 'listening' : 'detective';
    const minimum = getHintUnlockMinimum(mode);
    const count = Math.max(0, Number(guessCount) || 0);
    const remaining = Math.max(0, minimum - count);
    if (remaining <= 0) {
      return {
        unlocked: true,
        minimum,
        message: ''
      };
    }
    const guessWord = remaining === 1 ? 'guess' : 'guesses';
    return {
      unlocked: false,
      minimum,
      message: mode === 'listening'
        ? `Try ${remaining} more ${guessWord} to unlock Sound Help.`
        : `Try ${remaining} more ${guessWord} to unlock a Clue Hint.`
    };
  }

  function buildInformantHintPayload(state) {
    const entry = state?.entry || null;
    const activeWord = String(state?.word || entry?.word || '').trim();
    const focusValue = _el('setting-focus')?.value || prefs.focus || 'all';
    const preset = parseFocusPreset(focusValue);
    const phonicsTag = String(entry?.phonics || '').trim();
    let category = preset.kind === 'subject'
      ? 'subject'
      : normalizeHintCategoryFromFocusTag(focusValue, phonicsTag);
    if (category === 'general') {
      category = detectHintCategoryFromWord(activeWord);
    }
    const profile = SOR_HINT_PROFILES[category] || SOR_HINT_PROFILES.general;
    const sourceLabel = phonicsTag && phonicsTag.toLowerCase() !== 'all'
      ? phonicsTag
      : preset.kind === 'phonics'
        ? getFocusLabel(preset.focus).replace(/[—]/g, '').replace(/\s+/g, ' ').trim()
        : '';
    const liveExample = buildLiveHintExample(activeWord, category);
    const profileExamples = Array.isArray(profile.examples) ? profile.examples : [];
    const examples = liveExample ? [liveExample, ...profileExamples] : profileExamples;
    const playStyle = normalizePlayStyle(_el('s-play-style')?.value || prefs.playStyle || DEFAULT_PREFS.playStyle);
    let message = buildFriendlyHintMessage(category, sourceLabel);
    if (playStyle === 'listening') {
      message = sourceLabel
        ? `Focus: ${sourceLabel}. Listen to the word and definition, tap sounds, then spell. The sentence clue uses the secret word.`
        : 'Listen to the word and definition, tap sounds, then spell. The sentence clue uses the secret word.';
    }
    const actionMode = playStyle === 'detective' && !!entry?.sentence
      ? 'sentence'
      : playStyle === 'listening' && !!entry
        ? 'word-meaning'
        : 'none';
    return {
      title: playStyle === 'listening' ? '🎧 Listening Coach' : `✨ ${profile.catchphrase || 'Clue Coach'}`,
      message,
      examples,
      actionMode
    };
  }

  function renderHintExamples(examples) {
    const wrap = _el('hint-clue-examples');
    if (!wrap) return;
    wrap.innerHTML = '';
    const rows = Array.isArray(examples) ? examples.slice(0, 2) : [];
    if (!rows.length) {
      wrap.classList.add('hidden');
      return;
    }
    wrap.classList.remove('hidden');
    rows.forEach((example) => {
      const row = document.createElement('div');
      row.className = 'hint-example';

      const word = document.createElement('div');
      word.className = 'hint-example-word';
      (Array.isArray(example?.parts) ? example.parts : []).forEach((part) => {
        const segment = document.createElement('span');
        segment.textContent = String(part?.text || '');
        const mark = String(part?.mark || '').trim();
        if (mark) segment.classList.add(`hint-mark-${mark}`);
        word.appendChild(segment);
      });
      row.appendChild(word);

      const note = String(example?.note || '').trim();
      if (note) {
        const noteEl = document.createElement('div');
        noteEl.className = 'hint-example-note';
        noteEl.textContent = note;
        row.appendChild(noteEl);
      }
      wrap.appendChild(row);
    });
  }

  function scheduleStarterCoachHint() {
    clearStarterCoachTimer();
  }

  function showInformantHintCard(payload) {
    const card = _el('hint-clue-card');
    if (!card) return;
    const normalized = (payload && typeof payload === 'object')
      ? payload
      : { title: '🔎 Clue Coach', message: String(payload || '').trim(), examples: [], actionMode: 'none' };
    const title = String(normalized.title || '🔎 Clue Coach').trim() || '🔎 Clue Coach';
    const text = String(normalized.message || '').trim();
    if (!text) return;
    if (isMissionLabStandaloneMode() || isAnyOverlayModalOpen()) return;
    const titleEl = _el('hint-clue-title');
    const messageEl = _el('hint-clue-message');
    if (titleEl) titleEl.textContent = title;
    if (messageEl) messageEl.textContent = text;
    renderHintExamples(normalized.examples);
    const hasExamples = Array.isArray(normalized.examples) && normalized.examples.length > 0;
    const sentenceBtn = _el('hint-clue-sentence-btn');
    let showAction = false;
    if (sentenceBtn) {
      const actionMode = String(normalized.actionMode || '').trim().toLowerCase();
      showAction = actionMode === 'sentence' || actionMode === 'word-meaning';
      sentenceBtn.dataset.mode = actionMode || 'none';
      sentenceBtn.textContent = actionMode === 'word-meaning' ? 'Hear Word + Meaning' : 'Hear Sentence (contains word)';
      sentenceBtn.classList.toggle('hidden', !showAction);
    }
    card.classList.toggle('is-compact', !hasExamples && !showAction);
    clearInformantHintHideTimer();
    card.classList.remove('hidden');
    requestAnimationFrame(() => {
      card.classList.add('visible');
    });
  }

  function showInformantHintToast() {
    hideStarterWordCard();
    const card = _el('hint-clue-card');
    if (card && !card.classList.contains('hidden')) {
      hideInformantHintCard();
      return;
    }
    if (isMissionLabStandaloneMode() || isAnyOverlayModalOpen()) return;

    const state = WQGame.getState?.() || {};
    if (!state?.word) {
      showInformantHintCard({
        title: '🔎 Clue Coach',
        message: 'Tap Next Word first, then tap Clue for one quick sound hint.',
        examples: [],
        actionMode: 'none'
      });
      return;
    }
    if (!state.entry) state.entry = WQData.getEntry(state.word) || null;
    const playStyle = normalizePlayStyle(_el('s-play-style')?.value || prefs.playStyle || DEFAULT_PREFS.playStyle);
    const guessCount = Array.isArray(state?.guesses) ? state.guesses.length : 0;
    const unlock = getHintUnlockCopy(playStyle, guessCount);
    if (!unlock.unlocked) {
      showInformantHintCard({
        title: playStyle === 'listening' ? '🎧 Almost Ready' : '🔎 Almost Ready',
        message: `${unlock.message} The sentence clue uses the secret word.`,
        examples: [],
        actionMode: 'none'
      });
      return;
    }
    if (playStyle === 'listening' && currentRoundHintRequested) {
      showInformantHintCard({
        title: '🎧 Listening Coach',
        message: 'Phonics Hint is one-time per word in Listening mode. Use Listen to Word + Listen to Definition to keep mapping sounds and spelling.',
        examples: [],
        actionMode: state.entry ? 'word-meaning' : 'none'
      });
      return;
    }
    currentRoundHintRequested = true;
    emitTelemetry('wq_support_used', {
      support_type: playStyle === 'listening' ? 'listening_sound_help' : 'phonics_clue',
      guess_count: guessCount
    });
    showInformantHintCard(buildInformantHintPayload(state));
  }

  function hideStarterWordCard() {
    const card = _el('starter-word-card');
    if (!card) return;
    card.classList.remove('visible');
    card.classList.add('hidden');
  }

  function replaceCurrentGuessWithWord(word) {
    const normalizedWord = String(word || '').toLowerCase().replace(/[^a-z]/g, '');
    const state = WQGame.getState?.();
    if (!state?.word || state.gameOver) return false;
    if (normalizedWord.length !== Number(state.wordLength || 0)) return false;
    while ((WQGame.getState?.()?.guess || '').length > 0) {
      WQGame.deleteLetter();
    }
    for (const letter of normalizedWord) WQGame.addLetter(letter);
    const next = WQGame.getState?.();
    if (next) WQUI.updateCurrentRow(next.guess, next.wordLength, next.guesses.length);
    return true;
  }

  function evaluateGuessPattern(guess, target) {
    const safeGuess = String(guess || '').toLowerCase().replace(/[^a-z]/g, '');
    const safeTarget = String(target || '').toLowerCase().replace(/[^a-z]/g, '');
    if (!safeGuess || !safeTarget || safeGuess.length !== safeTarget.length) return [];
    const result = Array(safeTarget.length).fill('absent');
    const targetLetters = safeTarget.split('');
    const guessLetters = safeGuess.split('');
    for (let index = 0; index < guessLetters.length; index += 1) {
      if (guessLetters[index] === targetLetters[index]) {
        result[index] = 'correct';
        targetLetters[index] = null;
        guessLetters[index] = null;
      }
    }
    for (let index = 0; index < guessLetters.length; index += 1) {
      const letter = guessLetters[index];
      if (!letter) continue;
      const foundAt = targetLetters.indexOf(letter);
      if (foundAt >= 0) {
        result[index] = 'present';
        targetLetters[foundAt] = null;
      }
    }
    return result;
  }

  function buildStarterWordConstraint(state) {
    const length = Math.max(1, Number(state?.wordLength || state?.word?.length || 0));
    const guesses = Array.isArray(state?.guesses) ? state.guesses.map((guess) => normalizeReviewWord(guess)) : [];
    const target = normalizeReviewWord(state?.word || '');
    const fixedLetters = Array.from({ length }, () => '');
    const excludedByPosition = Array.from({ length }, () => new Set());
    const minCounts = {};
    const maxCounts = {};
    const guessedLetters = new Set();
    const positiveLetters = new Set();

    guesses.forEach((guessWord) => {
      if (!guessWord || guessWord.length !== length) return;
      const marks = evaluateGuessPattern(guessWord, target);
      const guessCounts = {};
      const positiveCounts = {};
      for (let index = 0; index < guessWord.length; index += 1) {
        const letter = guessWord[index];
        const mark = marks[index];
        if (!letter) continue;
        guessedLetters.add(letter);
        guessCounts[letter] = (guessCounts[letter] || 0) + 1;
        if (mark === 'correct') {
          fixedLetters[index] = letter;
        } else {
          excludedByPosition[index].add(letter);
        }
        if (mark === 'present' || mark === 'correct') {
          positiveLetters.add(letter);
          positiveCounts[letter] = (positiveCounts[letter] || 0) + 1;
        }
      }
      Object.entries(positiveCounts).forEach(([letter, count]) => {
        minCounts[letter] = Math.max(minCounts[letter] || 0, count);
      });
      Object.entries(guessCounts).forEach(([letter, count]) => {
        const positiveCount = positiveCounts[letter] || 0;
        if (positiveCount < count) {
          if (maxCounts[letter] === undefined) maxCounts[letter] = positiveCount;
          else maxCounts[letter] = Math.min(maxCounts[letter], positiveCount);
        }
      });
    });

    const absentLetters = new Set();
    guessedLetters.forEach((letter) => {
      if (!positiveLetters.has(letter)) absentLetters.add(letter);
    });

    return {
      length,
      guessCount: guesses.length,
      fixedLetters,
      excludedByPosition,
      minCounts,
      maxCounts,
      absentLetters,
      guessedLetters
    };
  }

  function wordMatchesStarterConstraint(word, constraint, options = {}) {
    const normalizedWord = normalizeReviewWord(word);
    const length = Math.max(1, Number(constraint?.length || 0));
    if (!normalizedWord || normalizedWord.length !== length) return false;
    const enforceMaxCounts = options.enforceMaxCounts !== false;
    const letterCounts = {};
    for (let index = 0; index < normalizedWord.length; index += 1) {
      const letter = normalizedWord[index];
      if (constraint.fixedLetters[index] && constraint.fixedLetters[index] !== letter) return false;
      if (constraint.excludedByPosition[index]?.has(letter)) return false;
      letterCounts[letter] = (letterCounts[letter] || 0) + 1;
    }
    for (const letter of constraint.absentLetters) {
      if ((letterCounts[letter] || 0) > 0) return false;
    }
    for (const [letter, minimum] of Object.entries(constraint.minCounts || {})) {
      if ((letterCounts[letter] || 0) < minimum) return false;
    }
    if (enforceMaxCounts) {
      for (const [letter, maximum] of Object.entries(constraint.maxCounts || {})) {
        if ((letterCounts[letter] || 0) > maximum) return false;
      }
    }
    return true;
  }

  function scoreStarterWordCandidate(word, constraint) {
    const normalizedWord = normalizeReviewWord(word);
    if (!normalizedWord) return 0;
    let score = 0;
    const counted = new Set();
    for (let index = 0; index < normalizedWord.length; index += 1) {
      const letter = normalizedWord[index];
      if (constraint.fixedLetters[index] && constraint.fixedLetters[index] === letter) score += 4;
      if (!constraint.guessedLetters.has(letter) && !counted.has(letter)) {
        score += 2;
        counted.add(letter);
      }
      if ((constraint.minCounts[letter] || 0) > 0) score += 1;
    }
    return score;
  }

  function formatStarterPattern(constraint) {
    if (!constraint || !Array.isArray(constraint.fixedLetters)) return '';
    const token = constraint.fixedLetters.map((letter) => (letter ? letter.toUpperCase() : '_')).join('');
    return token.includes('_') ? token : '';
  }

  function pickStarterWordsForRound(state, limit = 9) {
    if (!state?.word || state.gameOver) return [];
    const focus = _el('setting-focus')?.value || prefs.focus || 'all';
    const selectedGrade = _el('s-grade')?.value || prefs.grade || DEFAULT_PREFS.grade;
    const gradeBand = getEffectiveGameplayGradeBand(selectedGrade, focus);
    const includeLowerBands = shouldExpandGradeBandForFocus(focus);
    const length = String(Math.max(1, Number(state.wordLength) || 0));
    const guessedWords = new Set((state.guesses || []).map((guess) => normalizeReviewWord(guess)));
    const targetWord = normalizeReviewWord(state.word);
    const addWords = (pool, bucket) => {
      if (!Array.isArray(pool)) return;
      pool.forEach((rawWord) => {
        const normalized = normalizeReviewWord(rawWord);
        if (!normalized || normalized.length !== Number(state.wordLength || 0)) return;
        if (normalized === targetWord || guessedWords.has(normalized)) return;
        bucket.add(normalized);
      });
    };

    const prioritized = new Set();
    addWords(WQData.getPlayableWords({
      gradeBand,
      length,
      phonics: focus,
      includeLowerBands
    }), prioritized);

    if (prioritized.size < 6 && state.entry?.phonics) {
      addWords(WQData.getPlayableWords({
        gradeBand,
        length,
        phonics: String(state.entry.phonics || '').toLowerCase(),
        includeLowerBands
      }), prioritized);
    }

    if (prioritized.size < 6) {
      addWords(WQData.getPlayableWords({
        gradeBand,
        length,
        phonics: 'all',
        includeLowerBands
      }), prioritized);
    }

    const constraint = buildStarterWordConstraint(state);
    const candidates = Array.from(prioritized);
    let filtered = candidates;
    if (constraint.guessCount >= 2) {
      const strict = candidates.filter((word) => wordMatchesStarterConstraint(word, constraint, { enforceMaxCounts: true }));
      if (strict.length >= 3) filtered = strict;
      else {
        const soft = candidates.filter((word) => wordMatchesStarterConstraint(word, constraint, { enforceMaxCounts: false }));
        if (soft.length >= 3) filtered = soft;
      }
    }

    const ranked = shuffleList(filtered).sort((left, right) => (
      scoreStarterWordCandidate(right, constraint) - scoreStarterWordCandidate(left, constraint)
    ));
    return ranked.slice(0, Math.max(3, Math.min(12, Number(limit) || 9)));
  }

  function renderStarterWordList(words) {
    const list = _el('starter-word-list');
    if (!list) return;
    list.innerHTML = '';
    if (!Array.isArray(words) || !words.length) {
      const empty = document.createElement('div');
      empty.className = 'starter-word-message';
      empty.textContent = 'No starter words found for this filter yet. Try switching focus or word length.';
      list.appendChild(empty);
      return;
    }
    words.forEach((word) => {
      const chip = document.createElement('button');
      chip.type = 'button';
      chip.className = 'starter-word-chip';
      chip.textContent = String(word || '').toUpperCase();
      chip.setAttribute('aria-label', `Use ${String(word || '').toUpperCase()} as next guess`);
      chip.addEventListener('click', () => {
        const applied = replaceCurrentGuessWithWord(word);
        if (applied) {
          hideStarterWordCard();
          updateNextActionLine();
          WQUI.showToast(`Try this: ${String(word || '').toUpperCase()}`);
        }
      });
      list.appendChild(chip);
    });
  }

  function showStarterWordCard(options = {}) {
    const card = _el('starter-word-card');
    if (!card) return false;
    if (isMissionLabStandaloneMode() || isAnyOverlayModalOpen()) return false;
    hideInformantHintCard();

    const state = WQGame.getState?.() || {};
    const titleEl = _el('starter-word-title');
    const messageEl = _el('starter-word-message');
    const guessCount = Array.isArray(state.guesses) ? state.guesses.length : 0;
    const source = String(options.source || 'manual').toLowerCase();
    const constraint = buildStarterWordConstraint(state);
    const knownPattern = formatStarterPattern(constraint);

    if (!state.word || state.gameOver) {
      if (titleEl) titleEl.textContent = 'Try a Starter Word';
      if (messageEl) messageEl.textContent = 'Start a round first, then open this for starter ideas.';
      renderStarterWordList([]);
      card.classList.remove('hidden');
      card.classList.add('visible');
      return true;
    }

    const words = pickStarterWordsForRound(state, 9);
    currentRoundStarterWordsShown = true;
    if (titleEl) titleEl.textContent = guessCount >= 2 ? 'Try a Pattern Match' : (source === 'auto' ? 'Try a Starter Word' : 'Need Ideas? Try a Starter Word');
    if (messageEl) {
      if (guessCount >= 2) {
        const patternHint = knownPattern ? ` Pattern: ${knownPattern}.` : '';
        messageEl.textContent = `These options fit what you already know.${patternHint} Pick one to test next.`;
      } else {
        messageEl.textContent = source === 'auto'
          ? `You are ${guessCount} guesses in. Pick one idea to keep momentum.`
          : 'Pick one to test your next guess.';
      }
    }
    renderStarterWordList(words);
    card.classList.remove('hidden');
    card.classList.add('visible');
    emitTelemetry('wq_support_used', {
      support_type: 'starter_word_list',
      guess_count: guessCount,
      source
    });
    return true;
  }

  function maybeAutoShowStarterWords(state) {
    const mode = getStarterWordMode();
    const threshold = getStarterWordAutoThreshold(mode);
    if (threshold <= 0) return;
    if (currentRoundStarterWordsShown) return;
    const guessCount = Array.isArray(state?.guesses) ? state.guesses.length : 0;
    if (guessCount !== threshold) return;
    showStarterWordCard({ source: 'auto' });
  }

  function applyFeedback(mode) {
    const normalized = mode === 'classic' ? 'classic' : 'themed';
    document.documentElement.setAttribute('data-feedback', normalized);
    const select = _el('s-feedback');
    if (select && select.value !== normalized) select.value = normalized;
  }

  function applyBoardStyle(mode) {
    const allowed = new Set(['clean', 'card', 'patterned', 'soundcard']);
    const normalized = allowed.has(mode) ? mode : DEFAULT_PREFS.boardStyle;
    document.documentElement.setAttribute('data-board-style', normalized);
    const select = _el('s-board-style');
    if (select && select.value !== normalized) select.value = normalized;
    updateWilsonModeToggle();
    return normalized;
  }

  function applyKeyStyle(mode) {
    const normalized = DEFAULT_PREFS.keyStyle;
    document.documentElement.setAttribute('data-key-style', normalized);
    const select = _el('s-key-style');
    if (select && select.value !== normalized) select.value = normalized;
    updateWilsonModeToggle();
    return normalized;
  }

  function normalizeHeaderControlLayout() {
    const headerRight = document.querySelector('.header-right');
    if (!headerRight) return;

    const iconIds = ['theme-dock-toggle-btn', 'music-dock-toggle-btn', 'teacher-panel-btn', 'case-toggle-btn', 'keyboard-layout-toggle', 'mission-lab-nav-btn', 'settings-btn', 'play-tools-btn'];
    const quickIds = ['play-style-toggle', 'phonics-clue-open-btn', 'starter-word-open-btn', 'writing-studio-btn', 'sentence-surgery-btn', 'reading-lab-btn', 'new-game-btn'];

    let iconGroup = headerRight.querySelector('.header-icon-controls');
    if (!iconGroup) {
      iconGroup = document.createElement('div');
      iconGroup.className = 'header-icon-controls';
    }

    let quickGroup = headerRight.querySelector('.header-quick-controls');
    if (!quickGroup) {
      quickGroup = document.createElement('div');
      quickGroup.className = 'header-quick-controls';
    }

    iconIds.forEach((id) => {
      const node = _el(id);
      if (node) iconGroup.appendChild(node);
    });
    quickIds.forEach((id) => {
      const node = _el(id);
      if (node) quickGroup.appendChild(node);
    });

    if (iconGroup.parentElement !== headerRight) headerRight.appendChild(iconGroup);
    if (quickGroup.parentElement !== headerRight) headerRight.appendChild(quickGroup);
    if (headerRight.firstElementChild !== iconGroup) headerRight.insertBefore(iconGroup, headerRight.firstChild);
    if (iconGroup.nextElementSibling !== quickGroup) headerRight.insertBefore(quickGroup, iconGroup.nextElementSibling);
  }

  function syncWritingStudioAvailability() {
    const writingBtn = _el('writing-studio-btn');
    if (!writingBtn) return;
    if (WRITING_STUDIO_ENABLED) {
      writingBtn.classList.remove('hidden');
      writingBtn.removeAttribute('aria-hidden');
      writingBtn.removeAttribute('tabindex');
      writingBtn.removeAttribute('disabled');
      return;
    }
    writingBtn.classList.add('hidden');
    writingBtn.setAttribute('aria-hidden', 'true');
    writingBtn.setAttribute('tabindex', '-1');
    writingBtn.setAttribute('disabled', 'true');
  }

  function syncHeaderStaticIcons() {
    const teacherBtn = _el('teacher-panel-btn');
    if (teacherBtn) {
      teacherBtn.innerHTML = '<span class="icon-emoji" aria-hidden="true">👩‍🏫</span>';
      setHoverNoteForElement(teacherBtn, 'Teacher Hub: class tools, reports, and weekly planning.');
    }
    const themeBtn = _el('theme-dock-toggle-btn');
    setHoverNoteForElement(themeBtn, 'Open style picker.');
    const musicBtn = _el('music-dock-toggle-btn');
    setHoverNoteForElement(musicBtn, 'Open music controls.');
    const settingsBtn = _el('settings-btn');
    if (settingsBtn) {
      settingsBtn.innerHTML = '<span class="icon-emoji" aria-hidden="true">⚙️</span>';
      setHoverNoteForElement(settingsBtn, 'Open settings.');
    }
    const playToolsBtn = _el('play-tools-btn');
    if (playToolsBtn) setHoverNoteForElement(playToolsBtn, 'Open activity tools.');
    const writingBtn = _el('writing-studio-btn');
    if (WRITING_STUDIO_ENABLED) setHoverNoteForElement(writingBtn, 'Open Writing Studio.');
    const surgeryBtn = _el('sentence-surgery-btn');
    if (surgeryBtn) setHoverNoteForElement(surgeryBtn, 'Open Sentence Surgery.');
    const readingBtn = _el('reading-lab-btn');
    if (readingBtn) setHoverNoteForElement(readingBtn, 'Open Reading Lab.');
    syncWritingStudioAvailability();
  }

  function applyKeyboardLayout(mode) {
    const normalized = normalizeKeyboardLayout(mode);
    document.documentElement.setAttribute('data-keyboard-layout', normalized);
    const select = _el('s-keyboard-layout');
    if (select && select.value !== normalized) select.value = normalized;
    updateWilsonModeToggle();
    syncChunkTabsVisibility();
    syncKeyboardLayoutToggle();
    return normalized;
  }

  function applyKeyboardPreset(mode, options = {}) {
    const normalized = normalizeKeyboardPresetId(mode);
    const preset = KEYBOARD_PRESET_CONFIG[normalized] || KEYBOARD_PRESET_CONFIG['qwerty-bubble'];
    const layout = applyKeyboardLayout(preset.layout);
    const keyStyle = applyKeyStyle(preset.keyStyle);
    let boardStyle = document.documentElement.getAttribute('data-board-style') || prefs.boardStyle || DEFAULT_PREFS.boardStyle;
    // Keep board tiles less rounded when using the oval keyboard option.
    if (preset.keyStyle === 'pebble') {
      boardStyle = applyBoardStyle('card');
    }
    if (options.persist !== false) {
      setPref('keyboardLayout', layout);
      setPref('keyStyle', keyStyle);
      if (preset.keyStyle === 'pebble') setPref('boardStyle', boardStyle);
    }
    updateWilsonModeToggle();
    return Object.freeze({
      id: normalized,
      label: preset.label,
      layout,
      keyStyle,
      boardStyle
    });
  }

  function syncKeyboardLayoutToggle() {
    normalizeHeaderControlLayout();
    const toggle = _el('keyboard-layout-toggle');
    if (!toggle) return;
    const layout = normalizeKeyboardLayout(document.documentElement.getAttribute('data-keyboard-layout') || 'standard');
    const next = getNextKeyboardLayout(layout);
    const keyboardHint = `${getKeyboardLayoutLabel(layout)} keys ready. Tap to try ${getKeyboardLayoutLabel(next)}.`;
    toggle.innerHTML = '<span class="icon-emoji" aria-hidden="true">⌨️</span>';
    toggle.setAttribute('aria-pressed', layout === 'alphabet' ? 'true' : 'false');
    toggle.setAttribute('aria-label', keyboardHint);
    toggle.dataset.hint = keyboardHint;
    setHoverNoteForElement(toggle, keyboardHint);
    toggle.classList.toggle('is-wilson', false);
  }

  function syncCaseToggleUI() {
    normalizeHeaderControlLayout();
    const toggle = _el('case-toggle-btn');
    if (!toggle) return;
    const mode = String(document.documentElement.getAttribute('data-case') || prefs.caseMode || DEFAULT_PREFS.caseMode).toLowerCase();
    const isUpper = mode === 'upper';
    const caseHint = isUpper
      ? 'Uppercase letters are on. Tap for lowercase.'
      : 'Lowercase letters are on. Tap for uppercase.';
    toggle.textContent = 'Aa';
    toggle.setAttribute('aria-pressed', isUpper ? 'true' : 'false');
    toggle.setAttribute('aria-label', caseHint);
    toggle.dataset.hint = caseHint;
    setHoverNoteForElement(toggle, caseHint);
  }

  function applyChunkTabsMode(mode) {
    const normalized = mode === 'on' || mode === 'off' ? mode : 'auto';
    const select = _el('s-chunk-tabs');
    if (select && select.value !== normalized) select.value = normalized;
    document.documentElement.setAttribute('data-chunk-tabs-mode', normalized);
    return normalized;
  }

  function applyAtmosphere(mode) {
    const allowed = new Set(['minimal', 'glow', 'spark']);
    const normalized = allowed.has(mode) ? mode : DEFAULT_PREFS.atmosphere;
    document.documentElement.setAttribute('data-atmosphere', normalized);
    const select = _el('s-atmosphere');
    if (select && select.value !== normalized) select.value = normalized;
    return normalized;
  }

  function applyTextSize(mode) {
    const normalized = normalizeTextSize(mode);
    document.documentElement.setAttribute('data-text-size', normalized);
    const select = _el('s-text-size');
    if (select && select.value !== normalized) select.value = normalized;
    return normalized;
  }

  function updateWilsonModeToggle() {
    const checkbox = _el('s-wilson-mode');
    if (!checkbox) return;
    const boardStyle = document.documentElement.getAttribute('data-board-style');
    const keyStyle = document.documentElement.getAttribute('data-key-style');
    const keyboardLayout = document.documentElement.getAttribute('data-keyboard-layout') || 'standard';
    checkbox.checked = boardStyle === 'soundcard' && keyStyle === 'soundcard' && keyboardLayout === 'wilson';
  }

  function applyWilsonMode(enabled) {
    if (enabled) {
      const boardStyle = applyBoardStyle('soundcard');
      const keyStyle = applyKeyStyle('soundcard');
      const keyboardLayout = applyKeyboardLayout('wilson');
      setPref('boardStyle', boardStyle);
      setPref('keyStyle', keyStyle);
      setPref('keyboardLayout', keyboardLayout);
      updateWilsonModeToggle();
      return;
    }
    const boardStyle = applyBoardStyle('card');
    const keyStyle = applyKeyStyle('bubble');
    const keyboardLayout = applyKeyboardLayout('standard');
    setPref('boardStyle', boardStyle);
    setPref('keyStyle', keyStyle);
    setPref('keyboardLayout', keyboardLayout);
    updateWilsonModeToggle();
  }

  function isSorNotationEnabled() {
    const toggle = _el('s-sor-notation');
    if (toggle) return !!toggle.checked;
    return (prefs.sorNotation || DEFAULT_PREFS.sorNotation) === 'on';
  }

  function normalizeVoicePracticeMode(mode) {
    const next = String(mode || '').toLowerCase();
    if (next === 'off' || next === 'required') return next;
    return 'optional';
  }

  function getVoicePracticeMode() {
    return normalizeVoicePracticeMode(_el('s-voice-task')?.value || prefs.voicePractice || DEFAULT_PREFS.voicePractice);
  }

  function setVoicePracticeMode(mode, options = {}) {
    const normalized = normalizeVoicePracticeMode(mode);
    const select = _el('s-voice-task');
    if (select && select.value !== normalized) select.value = normalized;
    setPref('voicePractice', normalized);
    if (!(_el('modal-overlay')?.classList.contains('hidden'))) {
      updateVoicePracticePanel(WQGame.getState());
      syncRevealFocusModalSections();
    }
    syncTeacherPresetButtons();
    if (options.toast) {
      WQUI.showToast(normalized === 'required'
        ? 'Voice practice is required before moving on.'
        : normalized === 'off'
          ? 'Voice practice is off.'
          : 'Voice practice is optional for this round.'
      );
    }
    return normalized;
  }

  function areBoostPopupsEnabled() {
    if (!MIDGAME_BOOST_ENABLED) return false;
    const select = _el('s-boost-popups');
    const value = String(select?.value || prefs.boostPopups || DEFAULT_PREFS.boostPopups).toLowerCase();
    return value !== 'off';
  }

  const TEACHER_PRESETS = Object.freeze({
    guided: Object.freeze({
      hint: 'on',
      confidenceCoaching: 'on',
      revealFocus: 'on',
      voicePractice: 'required',
      voice: 'recorded',
      assessmentLock: 'off',
      boostPopups: 'on',
      confetti: 'on'
    }),
    independent: Object.freeze({
      hint: 'off',
      confidenceCoaching: 'off',
      revealFocus: 'on',
      voicePractice: 'optional',
      voice: 'recorded',
      assessmentLock: 'off',
      boostPopups: 'on',
      confetti: 'on'
    }),
    assessment: Object.freeze({
      hint: 'off',
      confidenceCoaching: 'off',
      revealFocus: 'on',
      voicePractice: 'off',
      voice: 'off',
      assessmentLock: 'on',
      boostPopups: 'off',
      confetti: 'off'
    }),
    'k2-phonics': Object.freeze({
      hint: 'on',
      confidenceCoaching: 'on',
      revealFocus: 'on',
      voicePractice: 'required',
      voice: 'recorded',
      assessmentLock: 'off',
      boostPopups: 'on',
      confetti: 'on',
      focus: 'cvc',
      grade: 'K-2',
      lessonPack: 'custom'
    }),
    '35-vocab': Object.freeze({
      hint: 'on',
      confidenceCoaching: 'off',
      revealFocus: 'on',
      voicePractice: 'optional',
      voice: 'recorded',
      assessmentLock: 'off',
      boostPopups: 'on',
      confetti: 'on',
      focus: 'vocab-ela-35',
      grade: 'G3-5',
      lessonPack: 'custom'
    }),
    intervention: Object.freeze({
      hint: 'on',
      confidenceCoaching: 'on',
      revealFocus: 'on',
      voicePractice: 'required',
      voice: 'recorded',
      assessmentLock: 'on',
      boostPopups: 'off',
      confetti: 'off',
      focus: 'digraph',
      grade: 'K-2',
      lessonPack: 'custom'
    })
  });

  function detectTeacherPreset() {
    const current = {
      hint: getHintMode(),
      confidenceCoaching: isConfidenceCoachingEnabled() ? 'on' : 'off',
      revealFocus: getRevealFocusMode(),
      voicePractice: getVoicePracticeMode(),
      voice: normalizeVoiceMode(_el('s-voice')?.value || prefs.voice || DEFAULT_PREFS.voice),
      assessmentLock: isAssessmentLockEnabled() ? 'on' : 'off',
      boostPopups: areBoostPopupsEnabled() ? 'on' : 'off',
      confetti: String(_el('s-confetti')?.value || prefs.confetti || DEFAULT_PREFS.confetti).toLowerCase() === 'off'
        ? 'off'
        : 'on',
      focus: String(_el('setting-focus')?.value || prefs.focus || DEFAULT_PREFS.focus).trim() || DEFAULT_PREFS.focus,
      grade: String(_el('s-grade')?.value || prefs.grade || DEFAULT_PREFS.grade).trim() || DEFAULT_PREFS.grade,
      lessonPack: normalizeLessonPackId(prefs.lessonPack || _el('s-lesson-pack')?.value || DEFAULT_PREFS.lessonPack)
    };
    return Object.entries(TEACHER_PRESETS).find(([, preset]) =>
      current.hint === preset.hint &&
      current.confidenceCoaching === preset.confidenceCoaching &&
      current.revealFocus === preset.revealFocus &&
      current.voicePractice === preset.voicePractice &&
      current.voice === preset.voice &&
      current.assessmentLock === preset.assessmentLock &&
      current.boostPopups === preset.boostPopups &&
      current.confetti === preset.confetti &&
      (preset.focus ? current.focus === preset.focus : true) &&
      (preset.grade ? current.grade === preset.grade : true) &&
      (preset.lessonPack ? current.lessonPack === preset.lessonPack : true)
    )?.[0] || '';
  }

  function syncTeacherPresetButtons(activePreset = detectTeacherPreset()) {
    document.querySelectorAll('[data-teacher-preset]').forEach((btn) => {
      const isActive = btn.getAttribute('data-teacher-preset') === activePreset;
      btn.classList.toggle('is-active', isActive);
      btn.setAttribute('aria-pressed', isActive ? 'true' : 'false');
    });
  }

  function applyTeacherPreset(mode) {
    if (isAssessmentRoundLocked()) {
      showAssessmentLockNotice();
      return false;
    }
    const preset = TEACHER_PRESETS[mode];
    if (!preset) return false;
    setHintMode(preset.hint);
    setConfidenceCoachingMode(preset.confidenceCoaching === 'on');
    applyRevealFocusMode(preset.revealFocus);

    setVoicePracticeMode(preset.voicePractice, { toast: false });

    const voiceSelect = _el('s-voice');
    if (voiceSelect) voiceSelect.value = preset.voice;
    WQAudio.setVoiceMode(preset.voice);
    setPref('voice', preset.voice);

    const assessmentLockToggle = _el('s-assessment-lock');
    if (assessmentLockToggle) assessmentLockToggle.checked = preset.assessmentLock === 'on';
    setPref('assessmentLock', preset.assessmentLock);

    const boostSelect = _el('s-boost-popups');
    if (boostSelect) boostSelect.value = preset.boostPopups;
    setPref('boostPopups', preset.boostPopups);
    if (preset.boostPopups === 'off') hideMidgameBoost();

    const confettiSelect = _el('s-confetti');
    if (confettiSelect) confettiSelect.value = preset.confetti;
    setPref('confetti', preset.confetti);

    if (preset.lessonPack) {
      handleLessonPackSelectionChange(preset.lessonPack);
    }
    if (preset.grade) {
      const gradeSelect = _el('s-grade');
      if (gradeSelect) {
        gradeSelect.value = preset.grade;
        gradeSelect.dispatchEvent(new Event('change', { bubbles: true }));
      }
    }
    if (preset.focus) {
      setFocusValue(preset.focus, { force: true });
    }

    if (preset.voice === 'off') cancelRevealNarration();
    updateVoicePracticePanel(WQGame.getState());
    syncRevealFocusModalSections();
    syncAssessmentLockRuntime();
    syncTeacherPresetButtons(mode);
    WQUI.showToast(`Preset applied: ${mode}.`);
    return true;
  }

  function markFirstRunSetupDone() {
    try { localStorage.setItem(FIRST_RUN_SETUP_KEY, 'done'); } catch {}
  }

  function clearFirstRunSetupPreference() {
    try { localStorage.removeItem(FIRST_RUN_SETUP_KEY); } catch {}
  }

  function hasCompletedFirstRunSetup() {
    try { return localStorage.getItem(FIRST_RUN_SETUP_KEY) === 'done'; } catch { return false; }
  }

  const shouldOfferStartupPreset = !hasCompletedFirstRunSetup();
  firstRunSetupPending = shouldOfferStartupPreset;

  function closeFirstRunSetupModal() {
    _el('first-run-setup-modal')?.classList.add('hidden');
  }

  function getFirstRunModeHelpText(mode) {
    return mode === 'listening'
      ? 'Listening mode: hear the word and meaning first, then spell what you hear.'
      : 'Classic mode: use color feedback and clue support.';
  }

  function setFirstRunModeChoice(mode) {
    const normalized = normalizePlayStyle(mode);
    document.querySelectorAll('[data-play-style-choice]').forEach((button) => {
      const active = button.getAttribute('data-play-style-choice') === normalized;
      button.classList.toggle('is-active', active);
      button.setAttribute('aria-pressed', active ? 'true' : 'false');
    });
    const help = _el('first-run-mode-help');
    if (help) help.textContent = getFirstRunModeHelpText(normalized);
  }

  function syncFirstRunGradeSelectFromPrefs() {
    const modalGradeSelect = _el('first-run-grade-band');
    if (!modalGradeSelect) return;
    modalGradeSelect.value = String(_el('s-grade')?.value || prefs.grade || DEFAULT_PREFS.grade).trim() || DEFAULT_PREFS.grade;
  }

  function syncFirstRunSetupControlsFromPrefs() {
    syncFirstRunGradeSelectFromPrefs();
    const playStyle = normalizePlayStyle(_el('s-play-style')?.value || prefs.playStyle || DEFAULT_PREFS.playStyle);
    setFirstRunModeChoice(playStyle);
    const hideAgainToggle = _el('first-run-hide-again');
    if (hideAgainToggle) hideAgainToggle.checked = true;
  }

  function applyFirstRunGradeSelection() {
    const modalGradeSelect = _el('first-run-grade-band');
    const gradeSelect = _el('s-grade');
    if (!modalGradeSelect || !gradeSelect) return;
    const nextGradeBand = String(modalGradeSelect.value || DEFAULT_PREFS.grade).trim() || DEFAULT_PREFS.grade;
    if (String(gradeSelect.value || '').trim() === nextGradeBand) return;
    gradeSelect.value = nextGradeBand;
    gradeSelect.dispatchEvent(new Event('change', { bubbles: true }));
  }

  function applyFirstRunPlayStyleSelection() {
    const selectedButton = document.querySelector('[data-play-style-choice].is-active');
    const selected = normalizePlayStyle(selectedButton?.getAttribute('data-play-style-choice') || '');
    const select = _el('s-play-style');
    if (!select) return;
    if (String(select.value || '').trim() === selected) return;
    select.value = selected;
    select.dispatchEvent(new Event('change', { bubbles: true }));
  }

  function openFirstRunSetupModal() {
    const modal = _el('first-run-setup-modal');
    if (!modal) return;
    syncFirstRunSetupControlsFromPrefs();
    modal.classList.remove('hidden');
    _el('settings-panel')?.classList.add('hidden');
    _el('teacher-panel')?.classList.add('hidden');
    syncHeaderControlsVisibility();
  }

  function bindFirstRunSetupModal() {
    if (document.body.dataset.wqFirstRunSetupBound === '1') return;
    const closeTutorial = () => {
      applyFirstRunGradeSelection();
      applyFirstRunPlayStyleSelection();
      if (_el('first-run-hide-again')?.checked) markFirstRunSetupDone();
      else clearFirstRunSetupPreference();
      firstRunSetupPending = false;
      closeFirstRunSetupModal();
      const state = WQGame.getState?.() || {};
      if (!state.word || state.gameOver) {
        newGame({ launchMissionLab: !isMissionLabStandaloneMode() });
      }
      updateNextActionLine();
    };
    _el('first-run-skip-btn')?.addEventListener('click', closeTutorial);
    _el('first-run-start-btn')?.addEventListener('click', closeTutorial);
    document.querySelectorAll('[data-play-style-choice]').forEach((button) => {
      button.addEventListener('click', () => {
        setFirstRunModeChoice(button.getAttribute('data-play-style-choice') || 'detective');
      });
    });
    _el('first-run-setup-modal')?.addEventListener('click', (event) => {
      if (event.target?.id === 'first-run-setup-modal') {
        closeTutorial();
      }
    });
    document.body.dataset.wqFirstRunSetupBound = '1';
  }

  function markDiagnosticsReset(reason = 'maintenance') {
    const row = {
      ts: Date.now(),
      reason: String(reason || 'maintenance').trim() || 'maintenance',
      build: resolveBuildLabel() || 'local'
    };
    try { localStorage.setItem(DIAGNOSTICS_LAST_RESET_KEY, JSON.stringify(row)); } catch {}
    return row;
  }

  async function resetAppearanceAndCache() {
    if (isAssessmentRoundLocked()) {
      showAssessmentLockNotice('Finish this round first, then reset appearance.');
      return;
    }

    cancelRevealNarration();
    stopVoiceCaptureNow();

    // Hard-reset appearance prefs first so stale keyboard/layout values cannot survive.
    try {
      localStorage.removeItem(PREF_KEY);
    } catch {}
    Object.keys(prefs).forEach((key) => { delete prefs[key]; });

    const fallbackTheme = getThemeFallback();
    const normalizedTheme = applyTheme(fallbackTheme);
    delete prefs.theme;
    setPref('themeSave', DEFAULT_PREFS.themeSave);
    setPref('boardStyle', applyBoardStyle(DEFAULT_PREFS.boardStyle));
    setPref('keyStyle', applyKeyStyle(DEFAULT_PREFS.keyStyle));
    setPref('keyboardLayout', applyKeyboardLayout(DEFAULT_PREFS.keyboardLayout));
    setPref('chunkTabs', applyChunkTabsMode(DEFAULT_PREFS.chunkTabs));
    syncChunkTabsVisibility();
    setPref('atmosphere', applyAtmosphere(DEFAULT_PREFS.atmosphere));
    setPref('textSize', applyTextSize(DEFAULT_PREFS.textSize));
    setPref('uiSkin', applyUiSkin(DEFAULT_PREFS.uiSkin, { persist: false }));
    setPref('motion', DEFAULT_PREFS.motion);
    setPref('feedback', DEFAULT_PREFS.feedback);
    setPref('projector', DEFAULT_PREFS.projector);
    setPref('caseMode', DEFAULT_PREFS.caseMode);
    setPref('playStyle', applyPlayStyle(DEFAULT_PREFS.playStyle));
    setPref('revealPacing', DEFAULT_PREFS.revealPacing);
    setPref('revealAutoNext', DEFAULT_PREFS.revealAutoNext);
    setPref('teamMode', DEFAULT_PREFS.teamMode);
    setPref('teamCount', DEFAULT_PREFS.teamCount);
    setPref('turnTimer', DEFAULT_PREFS.turnTimer);
    setPref('confidenceCoaching', DEFAULT_PREFS.confidenceCoaching);

    _el('s-theme-save').value = DEFAULT_PREFS.themeSave;
    _el('s-ui-skin').value = DEFAULT_PREFS.uiSkin;
    _el('s-motion').value = DEFAULT_PREFS.motion;
    _el('s-text-size').value = DEFAULT_PREFS.textSize;
    _el('s-feedback').value = DEFAULT_PREFS.feedback;
    _el('s-projector').value = DEFAULT_PREFS.projector;
    _el('s-case').value = DEFAULT_PREFS.caseMode;
    _el('s-play-style').value = DEFAULT_PREFS.playStyle;
    _el('s-reveal-pacing').value = DEFAULT_PREFS.revealPacing;
    _el('s-reveal-auto-next').value = DEFAULT_PREFS.revealAutoNext;
    _el('s-team-mode').value = DEFAULT_PREFS.teamMode;
    _el('s-team-count').value = DEFAULT_PREFS.teamCount;
    _el('s-turn-timer').value = DEFAULT_PREFS.turnTimer;
    const confidenceToggle = _el('s-confidence-coaching');
    if (confidenceToggle) confidenceToggle.checked = DEFAULT_PREFS.confidenceCoaching === 'on';

    applyProjector(DEFAULT_PREFS.projector);
    applyUiSkin(DEFAULT_PREFS.uiSkin, { persist: false });
    applyMotion(DEFAULT_PREFS.motion);
    applyTextSize(DEFAULT_PREFS.textSize);
    applyFeedback(DEFAULT_PREFS.feedback);
    WQUI.setCaseMode(DEFAULT_PREFS.caseMode);
    syncClassroomTurnRuntime({ resetTurn: true });
    updateWilsonModeToggle();
    syncTeacherPresetButtons();
    syncHeaderControlsVisibility();

    try { sessionStorage.removeItem('wq_sw_controller_reloaded'); } catch {}
    markDiagnosticsReset('appearance_reset');
    emitTelemetry('wq_funnel_reset_used', { source: 'settings' });

    let clearedCaches = 0;
    if ('caches' in window) {
      try {
        const names = await caches.keys();
        const targets = names.filter((name) => name.startsWith('wq-'));
        await Promise.all(targets.map((name) => caches.delete(name)));
        clearedCaches = targets.length;
      } catch {}
    }

    if ('serviceWorker' in navigator) {
      try {
        const registrations = await navigator.serviceWorker.getRegistrations();
        await Promise.all(registrations.map(async (registration) => {
          try {
            registration.waiting?.postMessage({ type: 'WQ_SKIP_WAITING' });
            await registration.update();
          } catch {}
        }));
      } catch {}
    }

    WQUI.showToast(clearedCaches
      ? `Appearance reset. Cleared ${clearedCaches} cache bucket(s). Refreshing...`
      : 'Appearance reset. Refreshing...');

    const resetUrl = `${location.pathname}?cb=appearance-reset-${Date.now()}`;
    setTimeout(() => { location.replace(resetUrl); }, 460);

    if (shouldPersistTheme()) {
      setPref('theme', normalizedTheme);
    } else if (prefs.theme !== undefined) {
      delete prefs.theme;
      savePrefs(prefs);
    }
  }

  async function forceUpdateNow() {
    const approved = window.confirm('Force update now? This clears offline cache and reloads the latest build.');
    if (!approved) return;

    cancelRevealNarration();
    stopVoiceCaptureNow();

    try { sessionStorage.removeItem('wq_sw_controller_reloaded'); } catch {}
    try { sessionStorage.removeItem('wq_v2_build_remote_check_v1'); } catch {}
    try { localStorage.removeItem('wq_v2_cache_repair_build_v1'); } catch {}
    markDiagnosticsReset('force_update');
    emitTelemetry('wq_funnel_force_update_used', { source: 'settings' });

    let clearedCaches = 0;
    if ('caches' in window) {
      try {
        const names = await caches.keys();
        const targets = names.filter((name) => String(name || '').startsWith('wq-'));
        if (targets.length) {
          await Promise.all(targets.map((name) => caches.delete(name)));
          clearedCaches = targets.length;
        }
      } catch {}
    }

    let unregistered = 0;
    if ('serviceWorker' in navigator) {
      try {
        const registrations = await navigator.serviceWorker.getRegistrations();
        if (registrations.length) {
          const results = await Promise.all(registrations.map((registration) => registration.unregister().catch(() => false)));
          unregistered = results.filter(Boolean).length;
        }
      } catch {}
    }

    WQUI.showToast(`Force update: cleared ${clearedCaches} cache bucket(s), reset ${unregistered} service worker(s). Reloading...`);
    const nextUrl = `${location.pathname}?cb=force-update-${Date.now()}${location.hash || ''}`;
    setTimeout(() => { location.replace(nextUrl); }, 280);
  }

  function rerunOnboardingSetup() {
    if (isAssessmentRoundLocked()) {
      showAssessmentLockNotice('Finish this round before re-running setup.');
      return;
    }
    try { localStorage.removeItem(FIRST_RUN_SETUP_KEY); } catch {}
    firstRunSetupPending = true;
    closeFocusSearchList();
    openFirstRunSetupModal();
    WQUI.showToast('How-to card reopened.');
  }

  function populateVoiceSelector() {
    // Voice selection is handled by WQAudio internals
    // This can be expanded if you want a dropdown UI later
  }

  // ─── 5. Settings panel wiring ───────────────────────
  const SETTINGS_VIEWS = new Set(['quick', 'advanced']);

  function setSettingsView(view, options = {}) {
    const next = SETTINGS_VIEWS.has(view) ? view : 'quick';
    const tabs = Array.from(document.querySelectorAll('#settings-panel [data-settings-tab]'));
    const sections = Array.from(document.querySelectorAll('#settings-panel [data-settings-section]'));

    tabs.forEach((tab) => {
      const active = tab.getAttribute('data-settings-tab') === next;
      tab.classList.toggle('is-active', active);
      tab.setAttribute('aria-selected', active ? 'true' : 'false');
      tab.tabIndex = active ? 0 : -1;
    });

    sections.forEach((section) => {
      const active = section.getAttribute('data-settings-section') === next;
      section.classList.toggle('is-active', active);
      section.hidden = !active;
    });

    if (options.focus) {
      const activeTab = tabs.find((tab) => tab.getAttribute('data-settings-tab') === next);
      if (activeTab && typeof activeTab.focus === 'function') activeTab.focus();
    }
  }

  function normalizeReviewWord(word) {
    return String(word || '').trim().toLowerCase().replace(/[^a-z]/g, '');
  }

  function loadReviewQueueState() {
    const fallback = { round: 0, items: [] };
    try {
      const parsed = JSON.parse(localStorage.getItem(REVIEW_QUEUE_KEY) || 'null');
      if (!parsed || typeof parsed !== 'object') return fallback;
      const round = Math.max(0, Math.floor(Number(parsed.round) || 0));
      const items = Array.isArray(parsed.items)
        ? parsed.items
          .map((item) => ({
            word: normalizeReviewWord(item?.word),
            dueRound: Math.max(1, Math.floor(Number(item?.dueRound) || 0)),
            reason: String(item?.reason || 'review').trim().toLowerCase(),
            createdAt: Math.max(0, Number(item?.createdAt) || Date.now())
          }))
          .filter((item) => item.word && item.dueRound > 0)
        : [];
      return { round, items };
    } catch {
      return fallback;
    }
  }

  let reviewQueueState = loadReviewQueueState();

  function saveReviewQueueState() {
    const cleanedItems = reviewQueueState.items
      .map((item) => ({
        word: normalizeReviewWord(item.word),
        dueRound: Math.max(1, Math.floor(Number(item.dueRound) || 1)),
        reason: String(item.reason || 'review').trim().toLowerCase(),
        createdAt: Math.max(0, Number(item.createdAt) || Date.now())
      }))
      .filter((item) => item.word)
      .sort((a, b) => a.dueRound - b.dueRound || a.createdAt - b.createdAt)
      .slice(0, REVIEW_QUEUE_MAX_ITEMS);
    reviewQueueState = {
      round: Math.max(0, Math.floor(Number(reviewQueueState.round) || 0)),
      items: cleanedItems
    };
    try {
      localStorage.setItem(REVIEW_QUEUE_KEY, JSON.stringify(reviewQueueState));
    } catch {}
  }

  function buildPlayableWordSet(gradeBand, lengthPref, focusValue) {
    const effectiveGradeBand = getEffectiveGameplayGradeBand(gradeBand, focusValue);
    const pool = WQData.getPlayableWords({
      gradeBand: effectiveGradeBand,
      length: lengthPref || 'any',
      phonics: focusValue || 'all',
      includeLowerBands: shouldExpandGradeBandForFocus(focusValue)
    });
    return new Set(pool.map((word) => normalizeReviewWord(word)));
  }

  function countDueReviewWords(playableSet) {
    const due = reviewQueueState.items.filter((item) => item.dueRound <= reviewQueueState.round);
    if (!(playableSet instanceof Set)) return due.length;
    return due.filter((item) => playableSet.has(item.word)).length;
  }

  function peekDueReviewItemForPool(playableSet) {
    if (!(playableSet instanceof Set) || playableSet.size === 0) return null;
    const dueItems = reviewQueueState.items
      .filter((item) => item.dueRound <= reviewQueueState.round && playableSet.has(item.word))
      .sort((a, b) => a.dueRound - b.dueRound || a.createdAt - b.createdAt);
    return dueItems[0] || null;
  }

  function consumeReviewItem(item) {
    if (!item?.word) return;
    const idx = reviewQueueState.items.findIndex((entry) => (
      entry.word === item.word &&
      entry.dueRound === item.dueRound &&
      entry.createdAt === item.createdAt
    ));
    if (idx < 0) return;
    reviewQueueState.items.splice(idx, 1);
    saveReviewQueueState();
  }

  function scheduleReviewWord(word, delays, reason) {
    const normalizedWord = normalizeReviewWord(word);
    if (!normalizedWord || !Array.isArray(delays) || !delays.length) return;
    const now = Date.now();
    delays.forEach((delay, index) => {
      const dueRound = reviewQueueState.round + Math.max(1, Math.floor(Number(delay) || 1));
      const isDuplicate = reviewQueueState.items.some((item) => (
        item.word === normalizedWord &&
        Math.abs(item.dueRound - dueRound) <= 1
      ));
      if (isDuplicate) return;
      reviewQueueState.items.push({
        word: normalizedWord,
        dueRound,
        reason: String(reason || 'review').toLowerCase(),
        createdAt: now + index
      });
    });
    saveReviewQueueState();
  }

  function trackRoundForReview(result, maxGuessesValue, roundMetrics = {}) {
    const solvedWord = normalizeReviewWord(result?.word);
    if (!solvedWord) return;
    reviewQueueState.round += 1;
    const maxGuesses = Math.max(1, Number(maxGuessesValue) || 6);
    const guessesUsed = Math.max(1, Array.isArray(result?.guesses) ? result.guesses.length : maxGuesses);
    const hintRequested = !!roundMetrics.hintRequested;
    const durationMs = Math.max(0, Number(roundMetrics.durationMs) || 0);
    const topError = getTopErrorKey(roundMetrics.errorCounts || {});
    const attachReason = (base) => topError ? `${base}:${topError}` : base;
    if (result?.lost) {
      scheduleReviewWord(solvedWord, [1, 3, 7], attachReason('missed'));
      if (topError === 'vowel_pattern') scheduleReviewWord(solvedWord, [2], 'vowel-pattern');
      if (topError === 'morpheme_ending') scheduleReviewWord(solvedWord, [4], 'morpheme-ending');
      return;
    }
    const hardSolveThreshold = Math.max(4, maxGuesses - 1);
    if (guessesUsed >= hardSolveThreshold) {
      scheduleReviewWord(solvedWord, [3, 6], attachReason('hard'));
      return;
    }
    if (hintRequested) {
      scheduleReviewWord(solvedWord, [4], attachReason('hinted'));
    }
    if (topError === 'vowel_pattern') {
      scheduleReviewWord(solvedWord, [2, 5], 'vowel-pattern');
      return;
    }
    if (topError === 'blend_position') {
      scheduleReviewWord(solvedWord, [3], 'blend-position');
      return;
    }
    if (topError === 'morpheme_ending') {
      scheduleReviewWord(solvedWord, [4, 7], 'morpheme-ending');
      return;
    }
    if (durationMs >= 90000) {
      scheduleReviewWord(solvedWord, [5], 'slow-round');
      return;
    }
    saveReviewQueueState();
  }

  function primeShuffleBagWithWord(scope, word) {
    const normalizedWord = normalizeReviewWord(word);
    if (!scope || !normalizedWord) return;
    const bagKey = `${SHUFFLE_BAG_KEY}:${scope}`;
    let prior = { queue: [], last: '' };
    try {
      const parsed = JSON.parse(localStorage.getItem(bagKey) || 'null');
      if (parsed && Array.isArray(parsed.queue)) prior = parsed;
    } catch {}
    const cleanedQueue = prior.queue
      .map((item) => normalizeReviewWord(item))
      .filter((item) => item && item !== normalizedWord);
    cleanedQueue.push(normalizedWord);
    try {
      localStorage.setItem(bagKey, JSON.stringify({
        queue: cleanedQueue,
        last: normalizeReviewWord(prior.last)
      }));
    } catch {}
  }

  let activeRoundStartedAt = 0;
  let currentRoundHintRequested = false;
  let currentRoundStarterWordsShown = false;
  let currentRoundVoiceAttempts = 0;
  let currentRoundErrorCounts = Object.create(null);
  let currentRoundSkillKey = 'classic';
  let currentRoundSkillLabel = 'Classic mixed practice';
  let blockedLetterToastAt = 0;

  let classroomTurnTimer = 0;
  let classroomTurnEndsAt = 0;
  let classroomTurnRemaining = 0;
  let classroomTeamIndex = 0;

  function isTeamModeEnabled() {
    return normalizeTeamMode(_el('s-team-mode')?.value || prefs.teamMode || DEFAULT_PREFS.teamMode) === 'on';
  }

  function getTeamCount() {
    return Number.parseInt(
      normalizeTeamCount(_el('s-team-count')?.value || prefs.teamCount || DEFAULT_PREFS.teamCount),
      10
    ) || 2;
  }

  function getTurnTimerSeconds() {
    const mode = normalizeTurnTimer(_el('s-turn-timer')?.value || prefs.turnTimer || DEFAULT_PREFS.turnTimer);
    return mode === 'off' ? 0 : (Number.parseInt(mode, 10) || 0);
  }

  function getCurrentTeamLabel() {
    const count = getTeamCount();
    const index = Math.max(0, Math.min(count - 1, classroomTeamIndex));
    return TEAM_LABELS[index] || `Team ${index + 1}`;
  }

  function formatTurnClock(seconds) {
    const total = Math.max(0, Number(seconds) || 0);
    const mins = Math.floor(total / 60);
    const secs = Math.floor(total % 60);
    return `${mins}:${String(secs).padStart(2, '0')}`;
  }

  function clearClassroomTurnTimer() {
    if (classroomTurnTimer) {
      clearInterval(classroomTurnTimer);
      classroomTurnTimer = 0;
    }
    classroomTurnEndsAt = 0;
    classroomTurnRemaining = 0;
  }

  function updateClassroomTurnLine() {
    const line = _el('classroom-turn-line');
    if (!line) return;
    const state = WQGame.getState?.() || {};
    const activeRound = Boolean(state.word && !state.gameOver);
    const hasGuess = Array.isArray(state.guesses) && state.guesses.length > 0;
    if (!isTeamModeEnabled() || !activeRound || !hasGuess) {
      line.textContent = '';
      line.classList.add('hidden');
      return;
    }
    const seconds = getTurnTimerSeconds();
    const timerPart = seconds > 0
      ? ` · ${formatTurnClock(Math.max(0, classroomTurnRemaining || seconds))} left`
      : '';
    line.textContent = `${getCurrentTeamLabel()} turn${timerPart} · Type a guess, then press Enter.`;
    line.classList.remove('hidden');
  }

  function isKnownAbsentLetter(letter) {
    const normalized = String(letter || '').toLowerCase();
    if (!/^[a-z]$/.test(normalized)) return false;
    const keyEl = document.querySelector(`#keyboard .key[data-key="${normalized}"]`);
    if (!keyEl) return false;
    return keyEl.classList.contains('absent')
      && !keyEl.classList.contains('present')
      && !keyEl.classList.contains('correct');
  }

  function pulseBlockedLetterKey(letter) {
    const normalized = String(letter || '').toLowerCase();
    if (!/^[a-z]$/.test(normalized)) return;
    const keyEl = document.querySelector(`#keyboard .key[data-key="${normalized}"]`);
    if (!keyEl) return;
    keyEl.classList.remove('dupe-pulse');
    void keyEl.offsetWidth;
    keyEl.classList.add('dupe-pulse');
    setTimeout(() => keyEl.classList.remove('dupe-pulse'), 220);
  }

  function maybeShowBlockedLetterToast(letter) {
    const now = Date.now();
    if (now - blockedLetterToastAt < 700) return;
    blockedLetterToastAt = now;
    const safeLetter = String(letter || '').toUpperCase().slice(0, 1);
    WQUI.showToast(`Nice try. We already tested ${safeLetter}. Pick a different letter.`);
  }

  function clearCurrentGuessInput() {
    const state = WQGame.getState?.();
    if (!state?.word || !state.guess) return;
    while ((WQGame.getState?.()?.guess || '').length > 0) {
      WQGame.deleteLetter();
    }
    const next = WQGame.getState?.();
    if (next?.wordLength) {
      WQUI.updateCurrentRow(next.guess, next.wordLength, next.guesses.length);
    }
  }

  function startClassroomTurnClock(options = {}) {
    const resetTurn = Boolean(options.resetTurn);
    if (resetTurn) classroomTeamIndex = 0;
    clearClassroomTurnTimer();

    const state = WQGame.getState?.() || {};
    const activeRound = Boolean(state.word && !state.gameOver);
    if (!isTeamModeEnabled() || !activeRound) {
      updateClassroomTurnLine();
      return;
    }

    const seconds = getTurnTimerSeconds();
    if (seconds <= 0) {
      updateClassroomTurnLine();
      return;
    }

    classroomTurnRemaining = seconds;
    classroomTurnEndsAt = Date.now() + (seconds * 1000);
    updateClassroomTurnLine();

    classroomTurnTimer = setInterval(() => {
      const round = WQGame.getState?.() || {};
      if (!round.word || round.gameOver || !isTeamModeEnabled()) {
        clearClassroomTurnTimer();
        updateClassroomTurnLine();
        return;
      }
      const remaining = Math.max(0, Math.ceil((classroomTurnEndsAt - Date.now()) / 1000));
      if (remaining !== classroomTurnRemaining) {
        classroomTurnRemaining = remaining;
        updateClassroomTurnLine();
      }
      if (remaining <= 0) {
        clearClassroomTurnTimer();
        const expiringTeam = getCurrentTeamLabel();
        clearCurrentGuessInput();
        classroomTeamIndex = (classroomTeamIndex + 1) % getTeamCount();
        startClassroomTurnClock();
        WQUI.showToast(`${expiringTeam} ran out of time. ${getCurrentTeamLabel()} is up.`);
      }
    }, 250);
  }

  function advanceTeamTurn() {
    const state = WQGame.getState?.() || {};
    const activeRound = Boolean(state.word && !state.gameOver);
    if (!isTeamModeEnabled() || !activeRound) {
      updateClassroomTurnLine();
      return;
    }
    classroomTeamIndex = (classroomTeamIndex + 1) % getTeamCount();
    startClassroomTurnClock();
  }

  function syncClassroomTurnRuntime(options = {}) {
    startClassroomTurnClock({ resetTurn: !!options.resetTurn });
  }

  function updateNextActionLine(options = {}) {
    const line = _el('next-action-line');
    if (!line) return;
    const reviewWord = normalizeReviewWord(options.reviewWord || '');
    const state = WQGame.getState?.() || {};
    const hasActiveRound = Boolean(state.word && !state.gameOver);
    const guessCount = Array.isArray(state.guesses) ? state.guesses.length : 0;
    const activeGuessLength = String(state.guess || '').length;
    const wordLength = Math.max(1, Number(state.wordLength) || 0);
    const playStyle = normalizePlayStyle(_el('s-play-style')?.value || prefs.playStyle || DEFAULT_PREFS.playStyle);
    const dueCount = Math.max(0, Number(options.dueCount) || 0);
    const confidenceOn = isConfidenceCoachingEnabled();
    let text = '';

    if (isMissionLabStandaloneMode()) {
      text = 'Deep Dive standalone: launch a three-step word unpacking round from the panel below.';
    } else if (firstRunSetupPending) {
      text = 'Open the quick how-to card to learn tile colors, then start your first word.';
    } else if (reviewWord) {
      text = `Level-up review: ${reviewWord.toUpperCase()} is back for a quick memory win.`;
    } else if (hasActiveRound && guessCount === 0 && activeGuessLength === 0) {
      if (confidenceOn) {
        text = playStyle === 'listening'
          ? 'Listening mode: tap Listen to Word, then Listen to Definition, then spell what you hear. Use Sound Clue only if stuck.'
          : 'Start with any test word. Then use tile colors to guide the next guess.';
      } else {
        text = playStyle === 'listening'
          ? 'Listening mode: hear the word, check meaning if needed, then spell from sound.'
          : 'Try a first guess, then use tile colors to refine.';
      }
    } else if (hasActiveRound && guessCount === 0 && activeGuessLength > 0) {
      text = `Build your first test word (${Math.min(activeGuessLength, wordLength)}/${wordLength}), then press Enter.`;
    } else if (hasActiveRound && guessCount === 1 && confidenceOn) {
      text = 'Great first try. Use the color feedback to move one letter at a time.';
    } else if (dueCount > 0) {
      text = `Review words ready: ${dueCount} due word${dueCount === 1 ? '' : 's'} in this focus.`;
    } else if (playStyle === 'listening') {
      text = hasActiveRound
        ? 'Keep spelling from audio. Sound Clue is optional support.'
        : 'Tap Next Word to start listening mode. Goal: hear and spell.';
    } else {
      text = hasActiveRound
        ? 'Keep guessing and use color feedback to narrow the word.'
        : 'Tap Next Word to start. Make your first guess when ready.';
    }

    const showTopLine = firstRunSetupPending;
    line.textContent = showTopLine ? text : '';
    line.classList.toggle('hidden', !showTopLine || !text);
    line.classList.toggle('is-review', Boolean(reviewWord));
    updateClassroomTurnLine();
  }

  function bindSettingsAccordion(sectionSelector) {
    const groups = Array.from(document.querySelectorAll(`${sectionSelector} .settings-group`));
    if (!groups.length) return;
    groups.forEach((group) => {
      group.addEventListener('toggle', () => {
        if (!(group instanceof HTMLDetailsElement) || !group.open) return;
        groups.forEach((other) => {
          if (other === group || !(other instanceof HTMLDetailsElement)) return;
          other.open = false;
        });
      });
    });
  }

  function jumpToSettingsGroup(groupId) {
    const target = _el(groupId);
    if (!(target instanceof HTMLElement)) return;
    if (target instanceof HTMLDetailsElement) target.open = true;
    target.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  function isQuickPopoverAllowed() {
    const panelOpen = !_el('settings-panel')?.classList.contains('hidden');
    const teacherPanelOpen = !_el('teacher-panel')?.classList.contains('hidden');
    const focusOpen = document.documentElement.getAttribute('data-focus-search-open') === 'true';
    return !panelOpen && !teacherPanelOpen && !focusOpen && !isAssessmentRoundLocked();
  }

  function positionQuickPopover(popover, anchorBtn) {
    if (!(popover instanceof HTMLElement) || !(anchorBtn instanceof HTMLElement)) return;
    popover.style.right = 'auto';
    popover.style.left = '-9999px';
    const margin = 8;
    const anchorRect = anchorBtn.getBoundingClientRect();
    const popRect = popover.getBoundingClientRect();
    let left = anchorRect.right - popRect.width;
    left = Math.max(margin, Math.min(left, window.innerWidth - popRect.width - margin));
    let top = anchorRect.bottom + 8;
    if (top + popRect.height > window.innerHeight - margin) {
      top = Math.max(margin, anchorRect.top - popRect.height - 8);
    }
    popover.style.left = `${Math.round(left)}px`;
    popover.style.top = `${Math.round(top)}px`;
  }

  function syncQuickPopoverPositions() {
    const themePopover = _el('theme-preview-strip');
    const musicPopover = _el('quick-music-strip');
    if (themePopover && !themePopover.classList.contains('hidden')) {
      positionQuickPopover(themePopover, _el('theme-dock-toggle-btn'));
    }
    if (musicPopover && !musicPopover.classList.contains('hidden')) {
      positionQuickPopover(musicPopover, _el('music-dock-toggle-btn'));
    }
  }

  function closeQuickPopover(kind = 'all') {
    const closeTheme = kind === 'all' || kind === 'theme';
    const closeMusic = kind === 'all' || kind === 'music';
    const themePopover = _el('theme-preview-strip');
    const musicPopover = _el('quick-music-strip');
    const themeBtn = _el('theme-dock-toggle-btn');
    const musicBtn = _el('music-dock-toggle-btn');
    if (closeTheme && themePopover) {
      themePopover.classList.add('hidden');
      themePopover.setAttribute('aria-hidden', 'true');
    }
    if (closeMusic && musicPopover) {
      musicPopover.classList.add('hidden');
      musicPopover.setAttribute('aria-hidden', 'true');
    }
    if (closeTheme && themeBtn) {
      themeBtn.classList.remove('is-active');
      themeBtn.setAttribute('aria-expanded', 'false');
    }
    if (closeMusic && musicBtn) {
      musicBtn.classList.remove('is-active');
      musicBtn.setAttribute('aria-expanded', 'false');
    }
  }

  function openQuickPopover(kind) {
    if (!isQuickPopoverAllowed()) {
      closeQuickPopover('all');
      return;
    }
    const themePopover = _el('theme-preview-strip');
    const musicPopover = _el('quick-music-strip');
    const themeBtn = _el('theme-dock-toggle-btn');
    const musicBtn = _el('music-dock-toggle-btn');
    if (kind === 'theme' && themePopover) {
      if (musicPopover) {
        musicPopover.classList.add('hidden');
        musicPopover.setAttribute('aria-hidden', 'true');
      }
      if (musicBtn) {
        musicBtn.classList.remove('is-active');
        musicBtn.setAttribute('aria-expanded', 'false');
      }
      themePopover.classList.remove('hidden');
      themePopover.setAttribute('aria-hidden', 'false');
      if (themeBtn) {
        themeBtn.classList.add('is-active');
        themeBtn.setAttribute('aria-expanded', 'true');
        positionQuickPopover(themePopover, themeBtn);
      }
      return;
    }
    if (kind === 'music' && musicPopover) {
      if (themePopover) {
        themePopover.classList.add('hidden');
        themePopover.setAttribute('aria-hidden', 'true');
      }
      if (themeBtn) {
        themeBtn.classList.remove('is-active');
        themeBtn.setAttribute('aria-expanded', 'false');
      }
      musicPopover.classList.remove('hidden');
      musicPopover.setAttribute('aria-hidden', 'false');
      if (musicBtn) {
        musicBtn.classList.add('is-active');
        musicBtn.setAttribute('aria-expanded', 'true');
        positionQuickPopover(musicPopover, musicBtn);
      }
    }
  }

  function toggleQuickPopover(kind) {
    const popover = kind === 'music' ? _el('quick-music-strip') : _el('theme-preview-strip');
    if (!popover || popover.classList.contains('hidden')) {
      openQuickPopover(kind);
      return;
    }
    closeQuickPopover(kind);
  }

  function syncThemePreviewStripVisibility() {
    const allowed = isQuickPopoverAllowed();
    const themeBtn = _el('theme-dock-toggle-btn');
    const musicBtn = _el('music-dock-toggle-btn');
    [themeBtn, musicBtn].forEach((btn) => {
      if (!btn) return;
      btn.setAttribute('aria-disabled', allowed ? 'false' : 'true');
    });
    if (!allowed) {
      closeQuickPopover('all');
      return;
    }
    syncQuickPopoverPositions();
  }

  function isMissionLabStandaloneMode() {
    return normalizePageMode(pageMode) === 'mission-lab';
  }

  function isTeacherRoleEnabled() {
    try {
      const params = new URLSearchParams(window.location.search || '');
      const role = String(params.get('role') || localStorage.getItem('cs_role') || '').toLowerCase();
      return role === 'teacher' || role === 'admin';
    } catch {
      return false;
    }
  }

  function setHomePlayShellIsolation(isHome) {
    const hidden = !!isHome;
    const selectors = [
      'header',
      'main',
      '.top-control-hub',
      '#next-action-line',
      '.classroom-turn-line',
      '#play-tools-drawer',
      '#theme-preview-strip',
      '#quick-music-strip',
      '#settings-panel',
      '#teacher-panel',
      '#toast',
      '#modal-overlay',
      '#challenge-modal',
      '#phonics-clue-modal',
      '#first-run-setup-modal',
      '#voice-help-modal',
      '#celebrate-layer',
      '#confetti-canvas',
      '#listening-mode-overlay',
      '#hint-clue-card',
      '#starter-word-card'
    ];
    selectors.forEach((selector) => {
      const el = document.querySelector(selector);
      if (!el) return;
      if (hidden) {
        el.setAttribute('aria-hidden', 'true');
        try { el.setAttribute('inert', ''); } catch {}
      } else {
        el.removeAttribute('aria-hidden');
        try { el.removeAttribute('inert'); } catch {}
      }
    });
  }

  function setHomeMode(mode, options = {}) {
    const next = String(mode || '').toLowerCase() === 'play' ? 'play' : 'home';
    homeMode = next;
    document.documentElement.setAttribute('data-home-mode', next);
    setHomePlayShellIsolation(next !== 'play');
    if (next === 'play') {
      _el('home-tools-section')?.classList.add('hidden');
      _el('play-tools-drawer')?.classList.add('hidden');
      _el('play-tools-btn')?.setAttribute('aria-expanded', 'false');
      if (options.scroll !== false) {
        _el('main')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
      try {
        const url = new URL(window.location.href);
        url.searchParams.set('play', '1');
        window.history.replaceState(window.history.state, '', `${url.pathname}${url.search}${url.hash}`);
      } catch {}
      logOverflowDiagnostics('setHomeMode:play');
      return;
    }
    try {
      const url = new URL(window.location.href);
      url.searchParams.delete('play');
      window.history.replaceState(window.history.state, '', `${url.pathname}${url.search}${url.hash}`);
    } catch {}
    logOverflowDiagnostics('setHomeMode:home');
  }

  function initializeHomeMode() {
    if (DEMO_MODE) {
      setHomeMode('play', { scroll: false });
      return;
    }
    let forcePlay = false;
    try {
      const params = new URLSearchParams(window.location.search || '');
      const playParam = String(params.get('play') || '').toLowerCase();
      const fromParam = String(params.get('from') || '').toLowerCase();
      forcePlay = playParam === '1' || playParam === 'true' || fromParam === 'home';
    } catch {
      forcePlay = false;
    }
    setHomeMode(forcePlay ? 'play' : 'home', { scroll: false });
  }

  function syncPlayToolsRoleVisibility() {
    const teacherOnly = _el('play-drawer-teacher-dashboard');
    if (!teacherOnly) return;
    teacherOnly.classList.toggle('hidden', !isTeacherRoleEnabled());
  }

  function togglePlayToolsDrawer() {
    const drawer = _el('play-tools-drawer');
    const trigger = _el('play-tools-btn');
    if (!drawer || homeMode !== 'play') return;
    const open = drawer.classList.contains('hidden');
    drawer.classList.toggle('hidden', !open);
    trigger?.setAttribute('aria-expanded', open ? 'true' : 'false');
  }

  function updatePageModeUrl(mode) {
    try {
      const normalized = normalizePageMode(mode);
      const url = new URL(window.location.href);
      if (normalized === 'mission-lab') {
        url.searchParams.set('page', 'mission-lab');
      } else {
        url.searchParams.delete('page');
      }
      const nextHref = `${url.pathname}${url.search}${url.hash}`;
      window.history.replaceState(window.history.state, '', nextHref);
    } catch {}
  }

  function syncPageModeUI() {
    const missionEnabled = isMissionLabEnabled();
    const missionMode = missionEnabled && isMissionLabStandaloneMode();
    document.documentElement.setAttribute('data-page-mode', missionMode ? 'mission-lab' : 'wordquest');
    document.documentElement.setAttribute('data-mission-lab', missionEnabled ? 'on' : 'off');
    const navBtn = _el('mission-lab-nav-btn');
    if (navBtn) {
      navBtn.classList.toggle('hidden', !missionEnabled);
      navBtn.innerHTML = missionMode
        ? '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.1" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><path d="M7 3.5h13.5V17"></path><path d="M20.5 3.5L9.5 14.5"></path><path d="M3.5 9.5V20.5H14.5"></path></svg>'
        : '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.1" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><rect x="3.5" y="3.5" width="7" height="7" rx="1.4"></rect><rect x="13.5" y="3.5" width="7" height="7" rx="1.4"></rect><rect x="3.5" y="13.5" width="7" height="7" rx="1.4"></rect><rect x="13.5" y="13.5" width="7" height="7" rx="1.4"></rect></svg>';
      navBtn.setAttribute('aria-pressed', missionMode ? 'true' : 'false');
      navBtn.setAttribute('aria-label', missionMode ? 'Return to WordQuest' : 'Open more activities');
      navBtn.title = missionMode
        ? 'Return to WordQuest gameplay mode'
        : 'Open more activities';
      setHoverNoteForElement(navBtn, missionMode ? 'Return to WordQuest gameplay mode.' : 'Open more activities like Deep Dive.');
    }
    const newWordBtn = _el('new-game-btn');
    if (newWordBtn) {
      newWordBtn.textContent = missionMode ? 'Deep Dive Mode' : 'Next Word';
      newWordBtn.setAttribute(
        'aria-label',
        missionMode ? 'Start a standalone Deep Dive round' : 'Start the next word round'
      );
      newWordBtn.removeAttribute('title');
      if (missionMode) newWordBtn.classList.remove('pulse');
    }
    const focusInput = _el('focus-inline-search');
    if (focusInput) {
      focusInput.placeholder = missionMode
        ? 'Choose Deep Dive track'
        : 'Select your quest';
      focusInput.setAttribute('aria-label', missionMode ? 'Deep Dive track finder' : 'Quest finder');
    }
    _el('mission-lab-hub')?.classList.toggle('hidden', !missionMode);
    syncStarterWordLauncherUI();
    syncGameplayAudioStrip();
    if (!missionEnabled) {
      closeRevealChallengeModal({ silent: true, preserveFeedback: false });
      _el('modal-challenge-launch')?.classList.add('hidden');
      _el('challenge-modal')?.classList.add('hidden');
      _el('mission-lab-hub')?.classList.add('hidden');
      return;
    }
    if (missionMode) {
      hideInformantHintCard();
      hideStarterWordCard();
      _el('toast')?.classList.remove('visible', 'toast-informant');
      refreshStandaloneMissionLabHub();
      closeRevealChallengeModal({ silent: true, preserveFeedback: false });
      _el('modal-overlay')?.classList.add('hidden');
      _el('end-modal')?.classList.add('hidden');
    }
  }

  function setPageMode(mode, options = {}) {
    const normalized = normalizePageMode(mode);
    if (pageMode === normalized && !options.force) return;
    pageMode = normalized;
    persistPageMode(normalized);
    if (!options.skipUrl) updatePageModeUrl(normalized);
    syncPageModeUI();
    syncHeaderControlsVisibility();
  }

  function syncHeaderControlsVisibility() {
    const overlay = _el('modal-overlay');
    if (overlay) {
      const modals = [
        _el('teacher-panel'),
        _el('end-modal'),
        _el('challenge-modal'),
        _el('modal-challenge-launch'),
        _el('first-run-setup-modal')
      ];
      const anyOpen = modals.some((el) => el && !el.classList.contains('hidden'));
      if (!anyOpen) overlay.classList.add('hidden');
    }
    syncThemePreviewStripVisibility();
    updateFocusHint();
    updateFocusSummaryLabel();
    updateGradeTargetInline();
    updateNextActionLine();
  }

  document.querySelectorAll('#settings-panel [data-settings-tab]').forEach((tab) => {
    tab.addEventListener('click', () => {
      setSettingsView(tab.getAttribute('data-settings-tab'));
    });
  });
  document.querySelectorAll('.settings-jump-chip[data-settings-jump]').forEach((chip) => {
    chip.addEventListener('click', () => {
      const groupId = chip.getAttribute('data-settings-jump');
      if (!groupId) return;
      jumpToSettingsGroup(groupId);
    });
  });
  bindSettingsAccordion('#settings-quick');
  bindSettingsAccordion('#settings-advanced');

  document.querySelectorAll('[data-teacher-preset]').forEach((btn) => {
    btn.addEventListener('click', () => {
      applyTeacherPreset(btn.getAttribute('data-teacher-preset') || '');
    });
  });

  // Always land in WordQuest first. Deep Dive opens only from the dedicated tab button.
  pageMode = 'wordquest';
  persistPageMode('wordquest');
  updatePageModeUrl('wordquest');
  initializeHomeMode();
  logOverflowDiagnostics('init');
  syncPlayToolsRoleVisibility();

  setSettingsView('quick');
  syncPageModeUI();
  syncHeaderControlsVisibility();
  syncClassroomTurnRuntime({ resetTurn: true });
  syncTeacherPresetButtons();
  syncAssessmentLockRuntime({ closeFocus: false });
  bindFirstRunSetupModal();
  if (firstRunSetupPending) {
    openFirstRunSetupModal();
  }
  const teacherPanelToggleEvent = EVENT_BUS_EVENTS.teacherPanelToggle || 'wq:teacher-panel-toggle';
  const openTeacherHubEvent = EVENT_BUS_EVENTS.openTeacherHub || 'wq:open-teacher-hub';
  window.addEventListener(teacherPanelToggleEvent, () => {
    const isOpen = !_el('teacher-panel')?.classList.contains('hidden');
    emitTelemetry(isOpen ? 'wq_teacher_hub_open' : 'wq_teacher_hub_close', {
      source: 'teacher_panel_toggle_event'
    });
    syncHeaderControlsVisibility();
  });
  window.addEventListener(openTeacherHubEvent, () => {
    _el('teacher-panel-btn')?.click();
  });
  window.addEventListener('resize', () => {
    syncQuickPopoverPositions();
    logOverflowDiagnostics('resize');
  }, { passive: true });
  window.addEventListener('scroll', () => {
    syncQuickPopoverPositions();
  }, { passive: true });

  _el('settings-btn')?.addEventListener('click', () => {
    if (isAssessmentRoundLocked()) {
      showAssessmentLockNotice();
      return;
    }
    const panel = _el('settings-panel');
    if (!panel) return;
    _el('teacher-panel')?.classList.add('hidden');
    const opening = panel.classList.contains('hidden');
    panel.classList.toggle('hidden');
    if (opening) {
      setSettingsView('quick');
      void renderDiagnosticsPanel();
      panel.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
    syncHeaderControlsVisibility();
  });
  _el('settings-close')?.addEventListener('click', () => {
    _el('settings-panel')?.classList.add('hidden');
    syncHeaderControlsVisibility();
  });

  
  // Voice help modal
  const openVoiceHelp = () => {
    _el('settings-panel')?.classList.add('hidden');
    syncHeaderControlsVisibility();
    _el('voice-help-modal')?.classList.remove('hidden');
  };
  const closeVoiceHelp = () => _el('voice-help-modal')?.classList.add('hidden');
  _el('voice-help-btn')?.addEventListener('click', openVoiceHelp);
  _el('voice-help-close')?.addEventListener('click', closeVoiceHelp);
  _el('voice-help-modal')?.addEventListener('click', e => { if (e.target.id === 'voice-help-modal') closeVoiceHelp(); });
  _el('mission-lab-nav-btn')?.addEventListener('click', () => {
    setPageMode(isMissionLabStandaloneMode() ? 'wordquest' : 'mission-lab');
  });
  function openWritingStudioPage() {
    if (!WRITING_STUDIO_ENABLED) {
      WQUI.showToast('Writing Studio is hidden in this shared build.');
      return;
    }
    const activeTheme = normalizeTheme(document.documentElement.getAttribute('data-theme'), getThemeFallback());
    try { localStorage.setItem('ws_theme_v1', activeTheme); } catch {}
    const state = WQGame.getState?.() || {};
    const focusSelect = _el('setting-focus');
    const focusValue = String(focusSelect?.value || prefs.focus || DEFAULT_PREFS.focus || 'all').trim();
    const focusLabel = String(focusSelect?.selectedOptions?.[0]?.textContent || focusValue || 'General writing').trim();
    const gradeValue = String(_el('s-grade')?.value || prefs.grade || DEFAULT_PREFS.grade || 'all').trim();
    const targetWord = String(state?.word || '').trim().toUpperCase();
    const clueSentence = String(state?.entry?.sentence || '').trim();
    const url = new URL('writing-studio.html', window.location.href);
    url.searchParams.set('theme', activeTheme);
    url.searchParams.set('wq_focus', focusValue);
    url.searchParams.set('wq_focus_label', focusLabel);
    url.searchParams.set('wq_grade', gradeValue);
    if (targetWord) url.searchParams.set('wq_word', targetWord);
    if (clueSentence) url.searchParams.set('wq_clue', clueSentence);
    window.location.href = url.toString();
  }

  function openSentenceSurgeryPage() {
    const activeTheme = normalizeTheme(document.documentElement.getAttribute('data-theme'), getThemeFallback());
    const state = WQGame.getState?.() || {};
    const focusSelect = _el('setting-focus');
    const focusValue = String(focusSelect?.value || prefs.focus || DEFAULT_PREFS.focus || 'all').trim();
    const focusLabel = String(focusSelect?.selectedOptions?.[0]?.textContent || focusValue || 'Sentence practice').trim();
    const gradeValue = String(_el('s-grade')?.value || prefs.grade || DEFAULT_PREFS.grade || 'all').trim();
    const targetWord = String(state?.word || '').trim().toUpperCase();
    const clueSentence = String(state?.entry?.sentence || '').trim();
    const url = new URL('sentence-surgery.html', window.location.href);
    url.searchParams.set('theme', activeTheme);
    url.searchParams.set('wq_focus', focusValue);
    url.searchParams.set('wq_focus_label', focusLabel);
    url.searchParams.set('wq_grade', gradeValue);
    if (targetWord) url.searchParams.set('wq_word', targetWord);
    if (clueSentence) url.searchParams.set('wq_clue', clueSentence);
    window.location.href = url.toString();
  }

  function openReadingLabPage() {
    const activeTheme = normalizeTheme(document.documentElement.getAttribute('data-theme'), getThemeFallback());
    const state = WQGame.getState?.() || {};
    const focusSelect = _el('setting-focus');
    const focusValue = String(focusSelect?.value || prefs.focus || DEFAULT_PREFS.focus || 'all').trim();
    const focusLabel = String(focusSelect?.selectedOptions?.[0]?.textContent || focusValue || 'Reading practice').trim();
    const gradeValue = String(_el('s-grade')?.value || prefs.grade || DEFAULT_PREFS.grade || 'all').trim();
    const targetWord = String(state?.word || '').trim().toUpperCase();
    const clueSentence = String(state?.entry?.sentence || '').trim();
    const url = new URL('reading-lab.html', window.location.href);
    url.searchParams.set('theme', activeTheme);
    url.searchParams.set('wq_focus', focusValue);
    url.searchParams.set('wq_focus_label', focusLabel);
    url.searchParams.set('wq_grade', gradeValue);
    if (targetWord) url.searchParams.set('wq_word', targetWord);
    if (clueSentence) url.searchParams.set('wq_clue', clueSentence);
    window.location.href = url.toString();
  }

  function openTeacherDashboardPage() {
    const url = new URL('teacher-dashboard.html', window.location.href);
    try {
      const params = new URLSearchParams(window.location.search || '');
      if (params.get('demo') === '1') url.searchParams.set('demo', '1');
    } catch (_e) {
      // no-op
    }
    window.location.href = url.toString();
  }

  if (WRITING_STUDIO_ENABLED) {
    _el('writing-studio-btn')?.addEventListener('click', openWritingStudioPage);
  } else {
    syncWritingStudioAvailability();
  }
  _el('sentence-surgery-btn')?.addEventListener('click', openSentenceSurgeryPage);
  _el('reading-lab-btn')?.addEventListener('click', openReadingLabPage);
  _el('teacher-open-writing-studio-btn')?.addEventListener('click', openWritingStudioPage);
  _el('teacher-open-sentence-surgery-btn')?.addEventListener('click', openSentenceSurgeryPage);
  _el('teacher-open-reading-lab-btn')?.addEventListener('click', openReadingLabPage);
  _el('teacher-dashboard-btn')?.addEventListener('click', openTeacherDashboardPage);
  _el('play-tools-btn')?.addEventListener('click', togglePlayToolsDrawer);
  _el('play-drawer-close')?.addEventListener('click', () => {
    _el('play-tools-drawer')?.classList.add('hidden');
    _el('play-tools-btn')?.setAttribute('aria-expanded', 'false');
  });
  _el('play-drawer-writing-studio')?.addEventListener('click', openWritingStudioPage);
  _el('play-drawer-sentence-surgery')?.addEventListener('click', openSentenceSurgeryPage);
  _el('play-drawer-reading-lab')?.addEventListener('click', openReadingLabPage);
  _el('play-drawer-teacher-dashboard')?.addEventListener('click', openTeacherDashboardPage);
  _el('home-open-writing-studio')?.addEventListener('click', openWritingStudioPage);
  _el('home-open-sentence-surgery')?.addEventListener('click', openSentenceSurgeryPage);
  _el('home-open-reading-lab')?.addEventListener('click', openReadingLabPage);
  _el('home-open-teacher-dashboard')?.addEventListener('click', openTeacherDashboardPage);
  _el('cta-wordquest')?.addEventListener('click', () => {
    setHomeMode('play');
    if (!WQGame.getState?.()?.word) {
      newGame({ launchMissionLab: false });
    }
  });
  _el('cta-tools')?.addEventListener('click', () => {
    const section = _el('home-tools-section');
    if (!section) return;
    section.classList.remove('hidden');
    section.scrollIntoView({ behavior: 'smooth', block: 'start' });
  });
  _el('home-logo-btn')?.addEventListener('click', () => {
    setHomeMode('home', { scroll: false });
    setPageMode('wordquest', { force: true });
    closeFocusSearchList();
    closeQuickPopover('all');
    _el('settings-panel')?.classList.add('hidden');
    _el('teacher-panel')?.classList.add('hidden');
    _el('modal-overlay')?.classList.add('hidden');
    _el('end-modal')?.classList.add('hidden');
    _el('challenge-modal')?.classList.add('hidden');
    _el('modal-challenge-launch')?.classList.add('hidden');
    _el('play-tools-drawer')?.classList.add('hidden');
    _el('play-tools-btn')?.setAttribute('aria-expanded', 'false');
    syncHeaderControlsVisibility();
  });
// Global outside-click handlers for flyouts/toasts
  document.addEventListener('pointerdown', e => {
    const focusWrap = _el('focus-inline-wrap');
    const hintToggleBtn = _el('focus-hint-toggle');
    const hintCard = _el('hint-clue-card');
    if (focusWrap && !focusWrap.contains(e.target)) {
      closeFocusSearchList();
      updateFocusSummaryLabel();
    }
    if (
      hintCard &&
      !hintCard.classList.contains('hidden') &&
      !hintCard.contains(e.target) &&
      e.target !== hintToggleBtn &&
      !hintToggleBtn?.contains(e.target)
    ) {
      hideInformantHintCard();
    }
    const themeDockBtn = _el('theme-dock-toggle-btn');
    const musicDockBtn = _el('music-dock-toggle-btn');
    const playToolsBtn = _el('play-tools-btn');
    const playToolsDrawer = _el('play-tools-drawer');
    const themePopover = _el('theme-preview-strip');
    const musicPopover = _el('quick-music-strip');
    const clickInsideQuickPopover =
      themePopover?.contains(e.target) ||
      musicPopover?.contains(e.target) ||
      themeDockBtn?.contains(e.target) ||
      musicDockBtn?.contains(e.target);
    if (!clickInsideQuickPopover) {
      closeQuickPopover('all');
    }
    if (
      playToolsDrawer &&
      !playToolsDrawer.classList.contains('hidden') &&
      !playToolsDrawer.contains(e.target) &&
      e.target !== playToolsBtn &&
      !playToolsBtn?.contains(e.target)
    ) {
      playToolsDrawer.classList.add('hidden');
      playToolsBtn?.setAttribute('aria-expanded', 'false');
    }
    if (_dupeToastEl && !_dupeToastEl.contains(e.target)) removeDupeToast();
    if (_el('toast')?.classList.contains('visible')) _el('toast').classList.remove('visible', 'toast-informant');
    const boost = _el('midgame-boost');
    if (
      boost &&
      !boost.classList.contains('hidden') &&
      !boost.contains(e.target) &&
      !shouldKeepMidgameBoostOpen(e.target)
    ) {
      hideMidgameBoost();
    }
  });

  _el('s-theme')?.addEventListener('change', e => {
    const normalized = applyTheme(e.target.value);
    if (shouldPersistTheme()) {
      setPref('theme', normalized);
    }
    WQUI.showToast(`Theme: ${getThemeDisplayLabel(normalized)}`);
    syncHeaderControlsVisibility();
  });
  _el('s-theme-save')?.addEventListener('change', e => {
    const next = e.target.value === 'on' ? 'on' : 'off';
    setPref('themeSave', next);
    if (next === 'on') {
      setPref('theme', normalizeTheme(document.documentElement.getAttribute('data-theme'), getThemeFallback()));
      WQUI.showToast('Theme will be saved for next time.');
    } else {
      delete prefs.theme;
      savePrefs(prefs);
      WQUI.showToast('Theme save is off. App will start on default theme next time.');
    }
  });
  _el('s-ui-skin')?.addEventListener('change', e => {
    const normalized = applyUiSkin(e.target.value, { persist: true });
    WQUI.showToast(`Visual skin: ${normalized === 'premium' ? 'Premium' : 'Classic'}.`);
  });

  function evaluateGuessForKeyboard(guess, targetWord) {
    const target = String(targetWord || '').toLowerCase().split('');
    const chars = String(guess || '').toLowerCase().split('');
    const result = Array(target.length).fill('absent');
    chars.forEach((ch, idx) => {
      if (ch === target[idx]) {
        result[idx] = 'correct';
        target[idx] = '';
        chars[idx] = '';
      }
    });
    chars.forEach((ch, idx) => {
      if (!ch) return;
      const foundIndex = target.indexOf(ch);
      if (foundIndex < 0) return;
      result[idx] = 'present';
      target[foundIndex] = '';
    });
    return result;
  }

  function restoreKeyboardStateFromRound(state) {
    if (!state?.word || !Array.isArray(state.guesses) || !state.guesses.length) return;
    state.guesses.forEach((guess) => {
      const result = evaluateGuessForKeyboard(guess, state.word);
      WQUI.updateKeyboard(result, guess);
    });
  }

  function refreshKeyboardLayoutPreview() {
    const state = WQGame.getState?.();
    if (!state?.word) return;
    WQUI.buildKeyboard();
    restoreKeyboardStateFromRound(state);
    if (state.guess) {
      WQUI.updateCurrentRow(state.guess, state.wordLength, state.guesses.length);
    }
    if (state.wordLength && state.maxGuesses) {
      WQUI.calcLayout(state.wordLength, state.maxGuesses);
    }
  }

  _el('s-board-style')?.addEventListener('change', e => {
    const next = applyBoardStyle(e.target.value);
    setPref('boardStyle', next);
    updateWilsonModeToggle();
    refreshKeyboardLayoutPreview();
  });
  _el('s-key-style')?.addEventListener('change', () => {
    const next = applyKeyStyle(DEFAULT_PREFS.keyStyle);
    setPref('keyStyle', next);
    updateWilsonModeToggle();
    refreshKeyboardLayoutPreview();
  });
  _el('s-keyboard-layout')?.addEventListener('change', e => {
    if (isAssessmentRoundLocked()) {
      showAssessmentLockNotice();
      e.target.value = normalizeKeyboardLayout(document.documentElement.getAttribute('data-keyboard-layout') || DEFAULT_PREFS.keyboardLayout);
      return;
    }
    const next = applyKeyboardLayout(e.target.value);
    setPref('keyboardLayout', next);
    refreshKeyboardLayoutPreview();
    WQUI.showToast(`Keyboard switched to ${getKeyboardLayoutLabel(next)}.`);
  });
  _el('s-chunk-tabs')?.addEventListener('change', e => {
    const next = applyChunkTabsMode(e.target.value);
    setPref('chunkTabs', next);
    syncChunkTabsVisibility();
  });
  _el('s-wilson-mode')?.addEventListener('change', e => {
    const enabled = !!e.target.checked;
    applyWilsonMode(enabled);
    refreshKeyboardLayoutPreview();
    WQUI.showToast(enabled
      ? 'Wilson sound-card mode is on.'
      : 'Switched to standard keyboard + simple board.');
  });
  _el('keyboard-layout-toggle')?.addEventListener('click', () => {
    if (isAssessmentRoundLocked()) {
      showAssessmentLockNotice();
      return;
    }
    const current = normalizeKeyboardLayout(document.documentElement.getAttribute('data-keyboard-layout') || 'standard');
    const next = applyKeyboardLayout(getNextKeyboardLayout(current));
    setPref('keyboardLayout', next);
    refreshKeyboardLayoutPreview();
    WQUI.showToast(`Keyboard switched to ${getKeyboardLayoutLabel(next)}.`);
  });
  _el('s-atmosphere')?.addEventListener('change', e => {
    setPref('atmosphere', applyAtmosphere(e.target.value));
  });
  _el('s-text-size')?.addEventListener('change', e => {
    setPref('textSize', applyTextSize(e.target.value));
  });
  _el('s-projector')?.addEventListener('change', e => {
    applyProjector(e.target.value);
    setPref('projector', e.target.value);
  });
  _el('s-motion')?.addEventListener('change', e => {
    applyMotion(e.target.value);
    setPref('motion', e.target.value);
  });
  _el('s-case')?.addEventListener('change', e => {
    const next = String(e.target.value || 'lower').toLowerCase() === 'upper' ? 'upper' : 'lower';
    WQUI.setCaseMode(next);
    setPref('caseMode', next);
    syncCaseToggleUI();
  });
  _el('case-toggle-btn')?.addEventListener('click', () => {
    if (isAssessmentRoundLocked()) {
      showAssessmentLockNotice();
      return;
    }
    const current = String(document.documentElement.getAttribute('data-case') || prefs.caseMode || DEFAULT_PREFS.caseMode).toLowerCase();
    const next = current === 'upper' ? 'lower' : 'upper';
    const select = _el('s-case');
    if (select) select.value = next;
    WQUI.setCaseMode(next);
    setPref('caseMode', next);
    syncCaseToggleUI();
    WQUI.showToast(next === 'upper' ? 'Letter case: UPPERCASE.' : 'Letter case: lowercase.');
  });
  function handleLessonPackSelectionChange(rawValue) {
    if (isAssessmentRoundLocked()) {
      showAssessmentLockNotice('Finish this round before changing lesson packs.');
      syncLessonPackControlsFromPrefs();
      return false;
    }
    const nextPack = normalizeLessonPackId(rawValue);
    const preferredTarget = nextPack === 'custom'
      ? 'custom'
      : resolveDefaultLessonTargetId(nextPack);
    lessonPackApplying = true;
    let nextTarget = 'custom';
    try {
      getLessonPackSelectElements().forEach((select) => { select.value = nextPack; });
      nextTarget = populateLessonTargetSelect(nextPack, preferredTarget);
    } finally {
      lessonPackApplying = false;
    }
    setLessonPackPrefs(nextPack, nextTarget);
    updateLessonPackNote(nextPack, nextTarget);
    refreshStandaloneMissionLabHub();
    if (nextPack !== 'custom' && nextTarget !== 'custom') {
      applyLessonTargetConfig(nextPack, nextTarget, { toast: false });
    }
    return true;
  }

  function handleLessonTargetSelectionChange(rawValue) {
    if (isAssessmentRoundLocked()) {
      showAssessmentLockNotice('Finish this round before changing lesson targets.');
      syncLessonPackControlsFromPrefs();
      return false;
    }
    const currentPack = normalizeLessonPackId(
      prefs.lessonPack || _el('s-lesson-pack')?.value || DEFAULT_PREFS.lessonPack
    );
    const nextTarget = normalizeLessonTargetId(currentPack, rawValue);
    getLessonTargetSelectElements().forEach((select) => { select.value = nextTarget; });
    setLessonPackPrefs(currentPack, nextTarget);
    updateLessonPackNote(currentPack, nextTarget);
    refreshStandaloneMissionLabHub();
    if (currentPack === 'custom' || nextTarget === 'custom') return true;
    applyLessonTargetConfig(currentPack, nextTarget, { toast: false });
    return true;
  }

  _el('s-lesson-pack')?.addEventListener('change', e => {
    handleLessonPackSelectionChange(e.target.value);
  });
  _el('s-lesson-target')?.addEventListener('change', e => {
    handleLessonTargetSelectionChange(e.target.value);
  });
  _el('lesson-pack-apply-week-btn')?.addEventListener('click', () => {
    if (isAssessmentRoundLocked()) {
      showAssessmentLockNotice('Finish this round before applying pacing targets.');
      return;
    }
    const button = _el('lesson-pack-apply-week-btn');
    const packId = normalizeLessonPackId(
      button?.getAttribute('data-pack-id') || prefs.lessonPack || DEFAULT_PREFS.lessonPack
    );
    const recommendation = getCurrentWeekRecommendedLessonTarget(packId);
    const targetId = recommendation?.target?.id || '';
    if (packId === 'custom' || !targetId) {
      WQUI.showToast('No pacing target available to apply.');
      return;
    }
    getLessonPackSelectElements().forEach((select) => { select.value = packId; });
    getLessonTargetSelectElements().forEach((select) => { select.value = targetId; });
    setLessonPackPrefs(packId, targetId);
    updateLessonPackNote(packId, targetId);
    applyLessonTargetConfig(packId, targetId, { toast: true });
  });
  function syncFocusSearchForCurrentGrade() {
    const listEl = _el('focus-inline-results');
    if (!listEl || listEl.classList.contains('hidden')) return;
    renderFocusSearchList(_el('focus-inline-search')?.value || '');
  }

  function enforceFocusSelectionForGrade(selectedGradeBand, options = {}) {
    const focusSelect = _el('setting-focus');
    if (!focusSelect) return false;
    const currentFocus = String(focusSelect.value || 'all').trim() || 'all';
    if (isFocusValueCompatibleWithGrade(currentFocus, selectedGradeBand)) return false;
    focusSelect.value = 'all';
    focusSelect.dispatchEvent(new Event('change', { bubbles: true }));
    if (options.toast !== false) {
      WQUI.showToast(`Quest reset to Classic for grade ${formatGradeBandLabel(selectedGradeBand)}.`);
    }
    return true;
  }

  _el('s-grade')?.addEventListener('change',   e => {
    const selectedGradeBand = String(e.target?.value || DEFAULT_PREFS.grade).trim() || DEFAULT_PREFS.grade;
    setPref('grade', selectedGradeBand);
    applyAllGradeLengthDefault({ toast: true });
    releaseLessonPackToManualMode();
    enforceFocusSelectionForGrade(selectedGradeBand, { toast: true });
    updateFocusGradeNote();
    updateGradeTargetInline();
    refreshStandaloneMissionLabHub();
    syncFocusSearchForCurrentGrade();
  });
  _el('s-length')?.addEventListener('change',  e => {
    setPref('length', e.target.value);
    releaseLessonPackToManualMode();
    refreshStandaloneMissionLabHub();
  });
  _el('s-guesses')?.addEventListener('change', e => {
    const currentState = WQGame.getState?.() || null;
    if (isAssessmentRoundLocked()) {
      showAssessmentLockNotice('Finish this round before changing max guesses.');
      e.target.value = String(
        Math.max(1, Number(currentState?.maxGuesses || prefs.guesses || DEFAULT_PREFS.guesses || 6))
      );
      return;
    }
    const normalized = String(
      Math.max(1, Number.parseInt(String(e.target.value || DEFAULT_PREFS.guesses), 10) || Number.parseInt(DEFAULT_PREFS.guesses, 10) || 6)
    );
    e.target.value = normalized;
    setPref('guesses', normalized);
    const hasActiveWord = Boolean(currentState?.word && !currentState?.gameOver);
    const hasProgress = Boolean(
      hasActiveWord && (((currentState?.guesses?.length || 0) > 0) || String(currentState?.guess || '').length > 0)
    );
    if (hasProgress) {
      WQUI.showToast(`Max guesses set to ${normalized}. It applies next word.`);
      return;
    }
    if (hasActiveWord) {
      newGame();
      WQUI.showToast(`Max guesses set to ${normalized}.`);
      return;
    }
    WQUI.showToast(`Max guesses saved: ${normalized}.`);
  });
  _el('s-starter-words')?.addEventListener('change', e => {
    const mode = applyStarterWordMode(e.target.value);
    if (mode === 'off') {
      WQUI.showToast('Starter word suggestions are off.');
      return;
    }
    const threshold = getStarterWordAutoThreshold(mode);
    WQUI.showToast(threshold > 0
      ? `Starter word suggestions will auto-open after ${threshold} guesses.`
      : 'Starter word suggestions are available on demand.');
  });
  _el('s-confidence-coaching')?.addEventListener('change', e => {
    setConfidenceCoachingMode(!!e.target.checked, { toast: true });
  });
  _el('s-team-mode')?.addEventListener('change', e => {
    const normalized = normalizeTeamMode(e.target.value);
    e.target.value = normalized;
    setPref('teamMode', normalized);
    syncClassroomTurnRuntime({ resetTurn: true });
    updateNextActionLine();
    WQUI.showToast(normalized === 'on'
      ? 'Team turns are on.'
      : 'Team turns are off.');
  });
  _el('s-team-count')?.addEventListener('change', e => {
    const normalized = normalizeTeamCount(e.target.value);
    e.target.value = normalized;
    setPref('teamCount', normalized);
    syncClassroomTurnRuntime({ resetTurn: true });
    updateNextActionLine();
    WQUI.showToast(`${normalized} team${normalized === '1' ? '' : 's'} ready.`);
  });
  _el('s-turn-timer')?.addEventListener('change', e => {
    const normalized = normalizeTurnTimer(e.target.value);
    e.target.value = normalized;
    setPref('turnTimer', normalized);
    syncClassroomTurnRuntime();
    updateNextActionLine();
    WQUI.showToast(normalized === 'off'
      ? 'Team turn timer is off.'
      : `Team turn timer: ${normalized} seconds.`);
  });
  _el('s-probe-rounds')?.addEventListener('change', e => {
    const normalized = normalizeProbeRounds(e.target.value);
    e.target.value = normalized;
    setPref('probeRounds', normalized);
  });
  _el('s-report-compact')?.addEventListener('change', e => {
    const normalized = applyReportCompactMode(e.target?.checked ? 'on' : 'off');
    WQUI.showToast(normalized === 'on'
      ? 'Compact report mode is on.'
      : 'Compact report mode is off.');
  });
  _el('s-mastery-sort')?.addEventListener('change', e => {
    const normalized = normalizeMasterySort(e.target.value);
    e.target.value = normalized;
    renderMasteryTable();
  });
  _el('s-mastery-filter')?.addEventListener('change', e => {
    const normalized = normalizeMasteryFilter(e.target.value);
    e.target.value = normalized;
    renderMasteryTable();
  });
  _el('s-hint')?.addEventListener('change',    e => { setHintMode(e.target.value); syncTeacherPresetButtons(); });
  _el('s-play-style')?.addEventListener('change', e => {
    const next = applyPlayStyle(e.target.value);
    WQUI.showToast(next === 'listening'
      ? 'Listening challenge on: hear word + meaning, then spell.'
      : 'Classic mode on: use tile colors and clue strategy.');
  });
  _el('s-reveal-focus')?.addEventListener('change', e => {
    const next = applyRevealFocusMode(e.target.value);
    WQUI.showToast(next === 'on'
      ? 'Reveal focus is on: word + meaning first.'
      : 'Reveal focus is off: full detail layout.');
    syncTeacherPresetButtons();
  });
  _el('s-reveal-pacing')?.addEventListener('change', e => {
    const next = normalizeRevealPacing(e.target.value);
    e.target.value = next;
    setPref('revealPacing', next);
    WQUI.showToast(
      next === 'quick'
        ? 'Reveal pacing: quick.'
        : next === 'slow'
          ? 'Reveal pacing: slow.'
          : 'Reveal pacing: guided.'
    );
  });
  _el('s-reveal-auto-next')?.addEventListener('change', e => {
    const next = normalizeRevealAutoNext(e.target.value);
    e.target.value = next;
    setPref('revealAutoNext', next);
    if (next === 'off') {
      clearRevealAutoAdvanceTimer();
      WQUI.showToast('Auto next word is off.');
      return;
    }
    WQUI.showToast(`Auto next word: ${next} seconds.`);
  });
  _el('focus-hint-toggle')?.addEventListener('click', () => {
    showInformantHintToast();
  });
  const closeHintClueCard = (event) => {
    event.preventDefault();
    hideInformantHintCard();
  };
  _el('hint-clue-close-btn')?.addEventListener('click', closeHintClueCard);
  _el('hint-clue-close-icon')?.addEventListener('click', closeHintClueCard);
  _el('hint-clue-sentence-btn')?.addEventListener('click', (event) => {
    event.preventDefault();
    event.stopPropagation();
    const current = WQGame.getState?.()?.entry;
    const mode = String(event.currentTarget?.dataset?.mode || 'none').trim().toLowerCase();
    cancelRevealNarration();
    if (mode === 'word-meaning') {
      if (!current) {
        WQUI.showToast('Start a word first.');
        return;
      }
      void (async () => {
        await WQAudio.playWord(current);
        await WQAudio.playDef(current);
      })();
      return;
    }
    if (!current?.sentence) {
      WQUI.showToast('No sentence clue is available for this word yet.');
      return;
    }
    void WQAudio.playSentence(current);
  });
  _el('play-style-toggle')?.addEventListener('click', () => {
    const current = normalizePlayStyle(_el('s-play-style')?.value || prefs.playStyle || DEFAULT_PREFS.playStyle);
    const next = current === 'listening' ? 'detective' : 'listening';
    applyPlayStyle(next);
    WQUI.showToast(next === 'listening'
      ? 'Listening challenge on: spell what you hear.'
      : 'Classic mode on.');
  });
  _el('s-dupe')?.addEventListener('change',    e => setPref('dupe',     e.target.value));
  _el('s-confetti')?.addEventListener('change',e => {
    setPref('confetti', e.target.value);
    syncTeacherPresetButtons();
  });
  _el('s-assessment-lock')?.addEventListener('change', e => {
    const enabled = !!e.target.checked;
    setPref('assessmentLock', enabled ? 'on' : 'off');
    syncAssessmentLockRuntime();
    syncTeacherPresetButtons();
    WQUI.showToast(enabled
      ? 'Assessment lock is on for active rounds.'
      : 'Assessment lock is off.');
  });
  _el('s-feedback')?.addEventListener('change', e => {
    applyFeedback(e.target.value);
    setPref('feedback', e.target.value);
  });
  _el('s-meaning-fun-link')?.addEventListener('change', e => {
    const enabled = !!e.target.checked;
    setPref('meaningPlusFun', enabled ? 'on' : 'off');
    WQUI.showToast(enabled
      ? 'Extended definition add-on is on.'
      : 'Extended definition add-on is off.'
    );
    if (!(_el('modal-overlay')?.classList.contains('hidden'))) {
      syncRevealMeaningHighlight(WQGame.getState()?.entry);
    }
  });
  _el('s-sor-notation')?.addEventListener('change', e => {
    const enabled = !!e.target.checked;
    setPref('sorNotation', enabled ? 'on' : 'off');
    WQUI.showToast(enabled
      ? 'SoR notation will show during reveal.'
      : 'SoR notation is hidden during reveal.'
    );
    if (!(_el('modal-overlay')?.classList.contains('hidden'))) {
      const currentEntry = WQGame.getState()?.entry;
      updateRevealSorBadge(currentEntry);
    }
  });
  _el('s-voice-task')?.addEventListener('change', e => {
    setVoicePracticeMode(e.target.value, { toast: true });
  });
  _el('s-boost-popups')?.addEventListener('change', e => {
    const normalized = e.target.value === 'off' ? 'off' : 'on';
    setPref('boostPopups', normalized);
    if (normalized === 'off') hideMidgameBoost();
    syncTeacherPresetButtons();
    WQUI.showToast(normalized === 'off' ? 'Engagement popups are off.' : 'Engagement popups are on.');
  });
  _el('s-reset-look-cache')?.addEventListener('click', () => {
    void resetAppearanceAndCache();
  });
  _el('s-force-update-now')?.addEventListener('click', () => {
    void forceUpdateNow();
  });
  _el('s-force-update-now-top')?.addEventListener('click', () => {
    void forceUpdateNow();
  });
  _el('diag-refresh-btn')?.addEventListener('click', () => {
    void renderDiagnosticsPanel();
  });
  _el('diag-copy-btn')?.addEventListener('click', () => {
    void copyDiagnosticsSummary();
  });
  _el('diag-copy-review-link-btn')?.addEventListener('click', () => {
    void copyReviewLink();
  });
  _el('session-copy-btn')?.addEventListener('click', () => {
    void copySessionSummary();
  });
  _el('session-copy-mastery-btn')?.addEventListener('click', () => {
    void copyMasterySummary();
  });
  _el('session-copy-mastery-csv-btn')?.addEventListener('click', () => {
    void copyMasterySummaryCsv();
  });
  _el('session-copy-mission-btn')?.addEventListener('click', () => {
    void copyMissionSummary();
  });
  _el('session-copy-mission-csv-btn')?.addEventListener('click', () => {
    void copyMissionSummaryCsv();
  });
  _el('session-copy-mtss-note-btn')?.addEventListener('click', () => {
    void copyMtssIepNote();
  });
  _el('session-copy-family-handout-btn')?.addEventListener('click', () => {
    void copyFamilyHandout();
  });
  _el('session-download-family-handout-btn')?.addEventListener('click', () => {
    downloadFamilyHandout();
  });
  _el('session-download-csv-bundle-btn')?.addEventListener('click', () => {
    downloadCsvBundle();
  });
  _el('session-download-class-rollup-btn')?.addEventListener('click', () => {
    downloadClassRollupCsv();
  });
  _el('session-copy-outcomes-btn')?.addEventListener('click', () => {
    void copySessionOutcomesSummary();
  });
  _el('session-copy-probe-export-btn')?.addEventListener('click', () => {
    void copyProbeSummary();
  });
  _el('session-copy-probe-csv-export-btn')?.addEventListener('click', () => {
    void copyProbeSummaryCsv();
  });
  _el('session-reset-btn')?.addEventListener('click', () => {
    resetSessionSummary();
    emitTelemetry('wq_funnel_reset_used', { source: 'teacher_session' });
    WQUI.showToast('Teacher session summary reset.');
  });
  _el('session-probe-start-btn')?.addEventListener('click', () => {
    startWeeklyProbe();
  });
  _el('session-probe-stop-btn')?.addEventListener('click', () => {
    finishWeeklyProbe();
  });
  _el('session-probe-copy-btn')?.addEventListener('click', () => {
    void copyProbeSummary();
  });
  _el('session-probe-copy-csv-btn')?.addEventListener('click', () => {
    void copyProbeSummaryCsv();
  });
  _el('s-playlist-select')?.addEventListener('change', (event) => {
    setSelectedPlaylistId(event.target?.value || '');
    renderPlaylistControls();
  });
  _el('s-playlist-name')?.addEventListener('keydown', (event) => {
    if (event.key !== 'Enter') return;
    event.preventDefault();
    _el('session-playlist-save-btn')?.click();
  });
  _el('session-playlist-save-btn')?.addEventListener('click', () => {
    if (!saveCurrentTargetToPlaylist()) {
      WQUI.showToast('Could not save the current target.');
      return;
    }
    WQUI.showToast('Current target saved to playlist.');
  });
  _el('session-playlist-assign-btn')?.addEventListener('click', () => {
    if (!assignSelectedPlaylistToActiveStudent()) {
      WQUI.showToast('Select a playlist first.');
      return;
    }
    WQUI.showToast(`Assigned playlist to ${getActiveStudentLabel()}.`);
  });
  _el('session-playlist-apply-btn')?.addEventListener('click', () => {
    if (isAssessmentRoundLocked()) {
      showAssessmentLockNotice('Finish this round before applying assigned playlists.');
      return;
    }
    if (!applyAssignedPlaylistForActiveStudent()) {
      WQUI.showToast('No assigned playlist for this student.');
      return;
    }
  });
  _el('session-playlist-delete-btn')?.addEventListener('click', () => {
    if (!deleteSelectedPlaylist()) {
      WQUI.showToast('Select a playlist to delete.');
      return;
    }
    WQUI.showToast('Playlist deleted.');
  });
  _el('session-mini-lesson-top-btn')?.addEventListener('click', () => {
    activeMiniLessonKey = 'top';
    renderMiniLessonPanel();
    WQUI.showToast('Loaded mini-lesson from top error.');
  });
  _el('session-mini-lesson-vowel-btn')?.addEventListener('click', () => {
    activeMiniLessonKey = 'vowel_pattern';
    renderMiniLessonPanel();
  });
  _el('session-mini-lesson-blend-btn')?.addEventListener('click', () => {
    activeMiniLessonKey = 'blend_position';
    renderMiniLessonPanel();
  });
  _el('session-mini-lesson-morpheme-btn')?.addEventListener('click', () => {
    activeMiniLessonKey = 'morpheme_ending';
    renderMiniLessonPanel();
  });
  _el('session-mini-lesson-context-btn')?.addEventListener('click', () => {
    activeMiniLessonKey = 'context_strategy';
    renderMiniLessonPanel();
  });
  _el('session-mini-lesson-copy-btn')?.addEventListener('click', () => {
    void copyMiniLessonPlan();
  });
  _el('s-roster-student')?.addEventListener('change', (event) => {
    const next = String(event.target?.value || '').trim();
    rosterState.active = rosterState.students.includes(next) ? next : '';
    saveRosterState();
    renderRosterControls();
    maybeApplyStudentPlanForActiveStudent();
    renderSessionSummary();
    renderProbePanel();
  });
  _el('session-roster-add-btn')?.addEventListener('click', () => {
    const input = _el('s-roster-name');
    const nextName = String(input?.value || '').trim();
    if (!nextName) {
      WQUI.showToast('Enter a student name first.');
      return;
    }
    if (addRosterStudent(nextName)) {
      if (input) input.value = '';
      renderSessionSummary();
      renderProbePanel();
      WQUI.showToast('Student added to roster.');
      return;
    }
    WQUI.showToast('Could not add student name.');
  });
  _el('s-roster-name')?.addEventListener('keydown', (event) => {
    if (event.key !== 'Enter') return;
    event.preventDefault();
    _el('session-roster-add-btn')?.click();
  });
  _el('session-roster-remove-btn')?.addEventListener('click', () => {
    if (!removeActiveRosterStudent()) {
      WQUI.showToast('Select a student to remove.');
      return;
    }
    renderSessionSummary();
    renderProbePanel();
    WQUI.showToast('Student removed from roster.');
  });
  _el('session-roster-clear-btn')?.addEventListener('click', () => {
    clearRosterStudents();
    renderSessionSummary();
    renderProbePanel();
    WQUI.showToast('Roster cleared for this device.');
  });
  window.WQTeacherAssignmentsFeature?.bindUI?.({
    contract: TEACHER_ASSIGNMENTS_CONTRACT,
    el: _el,
    toast: (message) => WQUI.showToast(message),
    normalizeLessonPackId,
    normalizeLessonTargetId,
    populateTargetSelectForPack: (...args) => teacherAssignmentsFeature?.populateTargetSelectForPack?.(...args) || 'custom',
    buildCurrentCurriculumSnapshot,
    getActiveStudentLabel,
    getGroupPlanCount: () => teacherAssignmentsFeature?.getGroupPlanCount?.() || 0,
    addGroupPlanEntry: (entry) => teacherAssignmentsFeature?.addGroupPlanEntry?.(entry),
    removeGroupPlanById: (id) => teacherAssignmentsFeature?.removeGroupPlanById?.(id),
    getFirstGroupPlanId: () => teacherAssignmentsFeature?.getFirstGroupPlanId?.() || '',
    getSelectedGroupPlan: () => teacherAssignmentsFeature?.getSelectedGroupPlan?.() || null,
    setSelectedGroupPlanId: (id) => teacherAssignmentsFeature?.setSelectedGroupPlanId?.(id),
    saveGroupPlanState: () => teacherAssignmentsFeature?.saveGroupPlanState?.(),
    renderGroupBuilderPanel,
    setStudentTargetLock: (student, payload) => teacherAssignmentsFeature?.setStudentTargetLock?.(student, payload) || false,
    clearStudentTargetLock: (student) => teacherAssignmentsFeature?.clearStudentTargetLock?.(student) || false,
    renderStudentLockPanel,
    maybeApplyStudentPlanForActiveStudent
  });
  _el('session-goal-save-btn')?.addEventListener('click', () => {
    const student = getActiveStudentLabel();
    const accuracyInput = _el('s-goal-accuracy');
    const guessesInput = _el('s-goal-guesses');
    const accuracyTarget = normalizeGoalAccuracy(accuracyInput?.value);
    const avgGuessesTarget = normalizeGoalGuesses(guessesInput?.value);
    if (accuracyInput) accuracyInput.value = String(accuracyTarget);
    if (guessesInput) guessesInput.value = String(avgGuessesTarget);
    setGoalForStudent(student, {
      accuracyTarget,
      avgGuessesTarget,
      updatedAt: Date.now()
    });
    renderStudentGoalPanel();
    WQUI.showToast(`Goal saved for ${student}.`);
  });
  _el('session-goal-clear-btn')?.addEventListener('click', () => {
    const student = getActiveStudentLabel();
    if (!clearGoalForStudent(student)) {
      WQUI.showToast('No saved goal to clear.');
      renderStudentGoalPanel();
      return;
    }
    renderStudentGoalPanel();
    WQUI.showToast(`Goal cleared for ${student}.`);
  });
  _el('session-rerun-onboarding-btn')?.addEventListener('click', () => {
    rerunOnboardingSetup();
  });
  _el('theme-dock-toggle-btn')?.addEventListener('click', (event) => {
    event.preventDefault();
    if (!isQuickPopoverAllowed()) return;
    toggleQuickPopover('theme');
  });
  _el('music-dock-toggle-btn')?.addEventListener('click', (event) => {
    event.preventDefault();
    if (!isQuickPopoverAllowed()) return;
    toggleQuickPopover('music');
  });
  _el('theme-preview-done')?.addEventListener('click', () => {
    closeQuickPopover('theme');
  });
  _el('quick-music-done')?.addEventListener('click', () => {
    closeQuickPopover('music');
  });
  _el('quick-music-toggle')?.addEventListener('click', () => {
    toggleMusicQuick();
  });
  _el('quick-music-prev')?.addEventListener('click', () => {
    stepMusicVibe(-1);
  });
  _el('quick-music-next')?.addEventListener('click', () => {
    stepMusicVibe(1);
  });
  _el('quick-music-shuffle')?.addEventListener('click', () => {
    shuffleMusicVibe();
  });
  _el('s-music')?.addEventListener('change', e => {
    const selected = normalizeMusicMode(e.target.value);
    e.target.value = selected;
    setPref('music', selected);
    syncMusicForTheme({ toast: true });
  });
  _el('s-music-vol')?.addEventListener('input', e => {
    const next = Math.max(0, Math.min(1, parseFloat(e.target.value)));
    setPref('musicVol', String(Number.isFinite(next) ? next : parseFloat(DEFAULT_PREFS.musicVol)));
    if (musicController) musicController.setVolume(next);
    syncQuickMusicVolume(next);
  });
  _el('quick-music-vol')?.addEventListener('input', e => {
    const next = Math.max(0, Math.min(1, parseFloat(e.target.value)));
    const normalized = String(Number.isFinite(next) ? next : parseFloat(DEFAULT_PREFS.musicVol));
    const settingsInput = _el('s-music-vol');
    if (settingsInput) settingsInput.value = normalized;
    setPref('musicVol', normalized);
    if (musicController) musicController.setVolume(next);
    syncQuickMusicVolume(next);
  });
  _el('s-music-upload')?.addEventListener('change', (event) => {
    const files = event.target?.files || [];
    setLocalMusicFiles(files);
  });
  _el('s-music-clear-local')?.addEventListener('click', () => {
    clearLocalMusicFiles();
    const settingsInput = _el('s-music-upload');
    if (settingsInput) settingsInput.value = '';
  });

  _el('s-voice')?.addEventListener('change', e => {
    const normalized = normalizeVoiceMode(e.target.value);
    e.target.value = normalized;
    WQAudio.setVoiceMode(normalized);
    setPref('voice', normalized);
    const modalOpen = !(_el('modal-overlay')?.classList.contains('hidden'));
    if (normalized === 'off') {
      cancelRevealNarration();
      syncTeacherPresetButtons();
      WQUI.showToast('Voice read-aloud is off.');
      return;
    }
    if (modalOpen) {
      void runRevealNarration(WQGame.getState());
    }
    syncTeacherPresetButtons();
    WQUI.showToast('Voice read-aloud is on.');
  });

  window.WQTheme = Object.freeze({
    getTheme() {
      return normalizeTheme(document.documentElement.getAttribute('data-theme'), getThemeFallback());
    },
    setTheme(nextTheme, options = {}) {
      const normalized = applyTheme(nextTheme);
      if (options.persist !== false && shouldPersistTheme()) setPref('theme', normalized);
      return normalized;
    },
    getOrder() {
      if (ThemeRegistry && Array.isArray(ThemeRegistry.order)) return ThemeRegistry.order.slice();
      return ['default'];
    },
    getLabel(themeId) {
      if (ThemeRegistry && typeof ThemeRegistry.getLabel === 'function') {
        return ThemeRegistry.getLabel(themeId);
      }
      return normalizeTheme(themeId, getThemeFallback());
    }
  });

  let voiceTakeComplete = false;
  let voiceRecorder = null;
  let voiceStream = null;
  let voiceChunks = [];
  let voiceClipUrl = null;
  let voiceClipBlob = null;
  let voicePreviewAudio = null;
  let voiceAnalyser = null;
  let voiceAudioCtx = null;
  let voiceWaveRaf = 0;
  let voiceIsRecording = false;
  let voiceAutoStopTimer = 0;
  let voiceCountdownTimer = 0;
  let voiceCountdownToken = 0;
  let voiceKaraokeTimer = 0;
  let voiceKaraokeRunToken = 0;
  let revealNarrationToken = 0;
  const VOICE_PRIVACY_TOAST_KEY = 'wq_voice_privacy_toast_seen_v1';
  const VOICE_CAPTURE_MS = 3000;
  const VOICE_COUNTDOWN_SECONDS = 3;
  const VOICE_HISTORY_KEY = 'wq_v2_voice_history_v1';
  const VOICE_HISTORY_LIMIT = 3;

  function setVoiceRecordingUI(isRecording) {
    const recordBtn = _el('voice-record-btn');
    if (recordBtn) {
      const isCountingDown = !!voiceCountdownTimer;
      recordBtn.disabled = !!isRecording || isCountingDown;
      recordBtn.classList.toggle('is-recording', !!isRecording);
      recordBtn.textContent = isCountingDown
        ? 'Get Ready...'
        : isRecording
          ? 'Recording...'
          : 'Start Recording (3s countdown)';
    }
    const saveBtn = _el('voice-save-btn');
    if (saveBtn && isRecording) saveBtn.disabled = true;
  }

  function loadVoiceHistory() {
    try {
      const raw = JSON.parse(localStorage.getItem(VOICE_HISTORY_KEY) || '[]');
      if (!Array.isArray(raw)) return [];
      return raw
        .map((item) => ({
          word: String(item?.word || '').toUpperCase().replace(/[^A-Z]/g, '').slice(0, 12),
          score: Math.max(0, Math.min(100, Number(item?.score) || 0)),
          label: String(item?.label || 'Captured').trim().slice(0, 28),
          tone: ['good', 'warn', 'error'].includes(String(item?.tone || '').toLowerCase())
            ? String(item.tone).toLowerCase()
            : 'default',
          at: Number(item?.at) || Date.now()
        }))
        .filter((item) => item.word)
        .slice(0, VOICE_HISTORY_LIMIT);
    } catch {
      return [];
    }
  }

  let voiceHistory = loadVoiceHistory();

  function saveVoiceHistory() {
    try {
      localStorage.setItem(VOICE_HISTORY_KEY, JSON.stringify(voiceHistory.slice(0, VOICE_HISTORY_LIMIT)));
    } catch {}
  }

  function renderVoiceHistoryStrip() {
    const listEl = _el('voice-history-items');
    const trendEl = _el('voice-history-trend');
    if (!listEl || !trendEl) return;
    const entries = voiceHistory.slice(0, VOICE_HISTORY_LIMIT);
    listEl.innerHTML = '';

    if (!entries.length) {
      const empty = document.createElement('span');
      empty.className = 'voice-history-empty';
      empty.textContent = 'No clips yet.';
      listEl.appendChild(empty);
      trendEl.textContent = 'Trend: —';
      trendEl.classList.remove('is-up', 'is-down', 'is-steady');
      return;
    }

    entries.forEach((entry) => {
      const chip = document.createElement('span');
      chip.className = `voice-history-chip${entry.tone === 'good' || entry.tone === 'warn' || entry.tone === 'error' ? ` is-${entry.tone}` : ''}`;
      const word = document.createElement('b');
      word.textContent = entry.word;
      chip.appendChild(word);
      chip.appendChild(document.createTextNode(` ${entry.label} ${entry.score}`));
      listEl.appendChild(chip);
    });

    trendEl.classList.remove('is-up', 'is-down', 'is-steady');
    if (entries.length < 2) {
      trendEl.textContent = 'Trend: baseline';
      trendEl.classList.add('is-steady');
      return;
    }
    const delta = entries[0].score - entries[entries.length - 1].score;
    if (delta >= 10) {
      trendEl.textContent = 'Trend: rising ↑';
      trendEl.classList.add('is-up');
      return;
    }
    if (delta <= -10) {
      trendEl.textContent = 'Trend: dip ↓';
      trendEl.classList.add('is-down');
      return;
    }
    trendEl.textContent = 'Trend: steady →';
    trendEl.classList.add('is-steady');
  }

  function appendVoiceHistory(review) {
    const word = String(WQGame.getState()?.word || '')
      .toUpperCase()
      .replace(/[^A-Z]/g, '')
      .slice(0, 12);
    if (!word) return;
    const score = Math.max(0, Math.min(100, Number(review?.score) || 0));
    const label = String(review?.label || 'Captured').trim().slice(0, 28) || 'Captured';
    const tone = ['good', 'warn', 'error'].includes(String(review?.tone || '').toLowerCase())
      ? String(review.tone).toLowerCase()
      : 'default';

    voiceHistory = [{ word, score, label, tone, at: Date.now() }, ...voiceHistory]
      .slice(0, VOICE_HISTORY_LIMIT);
    saveVoiceHistory();
    renderVoiceHistoryStrip();
  }

  function clearVoiceClip() {
    if (voiceClipUrl) {
      URL.revokeObjectURL(voiceClipUrl);
      voiceClipUrl = null;
    }
    voiceClipBlob = null;
    const playBtn = _el('voice-play-btn');
    if (playBtn) playBtn.disabled = true;
    const saveBtn = _el('voice-save-btn');
    if (saveBtn) saveBtn.disabled = true;
  }

  function clearVoiceAutoStopTimer() {
    if (!voiceAutoStopTimer) return;
    clearTimeout(voiceAutoStopTimer);
    voiceAutoStopTimer = 0;
  }

  function clearVoiceCountdownTimer() {
    if (!voiceCountdownTimer) return;
    clearInterval(voiceCountdownTimer);
    voiceCountdownTimer = 0;
  }

  function resetKaraokeGuide(word = '') {
    const wordWrap = _el('voice-karaoke-word');
    const hintEl = _el('voice-karaoke-hint');
    const normalizedWord = String(word || '').toUpperCase().replace(/[^A-Z]/g, '');
    if (wordWrap) {
      wordWrap.innerHTML = normalizedWord
        ? normalizedWord
          .split('')
          .map((ch) => `<span class="voice-karaoke-letter">${ch}</span>`)
          .join('')
        : '<span class="voice-karaoke-letter">?</span>';
    }
    if (hintEl) hintEl.textContent = normalizedWord
      ? 'Tap Guide Me to see pacing, then record.'
      : 'Start a round to load the target word.';
  }

  function stopKaraokeGuide() {
    voiceKaraokeRunToken += 1;
    if (voiceKaraokeTimer) {
      clearTimeout(voiceKaraokeTimer);
      voiceKaraokeTimer = 0;
    }
  }

  function runKaraokeGuide(entry) {
    stopKaraokeGuide();
    const word = String(entry?.word || '').toUpperCase().replace(/[^A-Z]/g, '');
    const hintEl = _el('voice-karaoke-hint');
    const wordWrap = _el('voice-karaoke-word');
    if (!wordWrap) return;
    resetKaraokeGuide(word);
    const letters = Array.from(wordWrap.querySelectorAll('.voice-karaoke-letter'));
    if (!letters.length || !word) return;
    if (hintEl) hintEl.textContent = 'Follow the highlight and match the pace.';
    const token = ++voiceKaraokeRunToken;
    const totalMs = Math.max(900, Math.min(3200, word.length * 300));
    const perLetter = Math.max(120, Math.floor(totalMs / letters.length));
    let index = 0;
    const tick = () => {
      if (token !== voiceKaraokeRunToken) return;
      letters.forEach((el, letterIndex) => {
        el.classList.toggle('is-active', letterIndex === index);
        el.classList.toggle('is-done', letterIndex < index);
      });
      const modalLetters = Array.from(document.querySelectorAll('#modal-word span'));
      modalLetters.forEach((el, letterIndex) => {
        el.classList.toggle('is-karaoke-active', letterIndex === index);
        el.classList.toggle('is-karaoke-done', letterIndex < index);
      });
      index += 1;
      if (index < letters.length) {
        voiceKaraokeTimer = setTimeout(tick, perLetter);
        return;
      }
      letters.forEach((el) => {
        el.classList.remove('is-active');
        el.classList.add('is-done');
      });
      modalLetters.forEach((el) => {
        el.classList.remove('is-karaoke-active');
        el.classList.add('is-karaoke-done');
      });
      voiceKaraokeTimer = setTimeout(() => {
        if (token !== voiceKaraokeRunToken) return;
        letters.forEach((el) => el.classList.remove('is-done'));
        modalLetters.forEach((el) => el.classList.remove('is-karaoke-done'));
        if (hintEl) hintEl.textContent = 'Nice pacing. Press Record when you are ready.';
        voiceKaraokeTimer = 0;
      }, 500);
    };
    tick();
  }

  function stopVoiceVisualizer() {
    if (voiceWaveRaf) {
      cancelAnimationFrame(voiceWaveRaf);
      voiceWaveRaf = 0;
    }
    if (voiceAudioCtx) {
      try { voiceAudioCtx.close(); } catch {}
      voiceAudioCtx = null;
    }
    voiceAnalyser = null;
  }

  function stopVoiceStream() {
    if (voiceStream) {
      voiceStream.getTracks().forEach((track) => track.stop());
      voiceStream = null;
    }
    voiceRecorder = null;
  }

  function stopVoiceCaptureNow() {
    clearVoiceAutoStopTimer();
    clearVoiceCountdownTimer();
    voiceCountdownToken += 1;
    try {
      if (voiceRecorder && voiceRecorder.state !== 'inactive') {
        voiceRecorder.stop();
      }
    } catch {}
    stopVoiceVisualizer();
    stopVoiceStream();
    voiceIsRecording = false;
    stopKaraokeGuide();
    setVoiceRecordingUI(false);
  }

  function drawWaveform() {}

  function animateLiveWaveform() {
    if (!voiceAnalyser) return;
    const points = new Uint8Array(voiceAnalyser.fftSize);
    const frame = () => {
      if (!voiceAnalyser) return;
      voiceAnalyser.getByteTimeDomainData(points);
      drawWaveform(points);
      voiceWaveRaf = requestAnimationFrame(frame);
    };
    frame();
  }

  function setVoicePracticeFeedback(message, tone = 'default') {
    const feedback = _el('voice-practice-feedback');
    if (!feedback) return;
    const normalizedTone = tone === true
      ? 'error'
      : tone === false
        ? 'default'
        : String(tone || 'default').toLowerCase();
    feedback.textContent = message || '';
    feedback.classList.toggle('is-error', normalizedTone === 'error');
    feedback.classList.toggle('is-warn', normalizedTone === 'warn');
    feedback.classList.toggle('is-good', normalizedTone === 'good');
  }

  async function analyzeVoiceClip(blob) {
    const Ctor = window.AudioContext || window.webkitAudioContext;
    if (!Ctor || !blob?.size) return null;
    const ctx = new Ctor();
    try {
      const sourceBytes = await blob.arrayBuffer();
      const audioBuffer = await ctx.decodeAudioData(sourceBytes.slice(0));
      const duration = Number(audioBuffer.duration) || (VOICE_CAPTURE_MS / 1000);
      let peak = 0;
      let sumSquares = 0;
      let voiced = 0;
      let samples = 0;
      const threshold = 0.02;
      const stride = 2;

      for (let channel = 0; channel < audioBuffer.numberOfChannels; channel += 1) {
        const data = audioBuffer.getChannelData(channel);
        for (let i = 0; i < data.length; i += stride) {
          const abs = Math.abs(data[i] || 0);
          if (abs > peak) peak = abs;
          sumSquares += abs * abs;
          if (abs >= threshold) voiced += 1;
          samples += 1;
        }
      }
      if (!samples) return null;
      const rms = Math.sqrt(sumSquares / samples);
      const voicedRatio = voiced / samples;
      return { duration, peak, rms, voicedRatio };
    } catch {
      return null;
    } finally {
      try { await ctx.close(); } catch {}
    }
  }

  function buildVoiceFeedback(analysis, entry = null) {
    const targetWord = String(entry?.word || '').toLowerCase();
    const hasTh = targetWord.includes('th');
    const hasV = targetWord.includes('v');
    const hasR = targetWord.includes('r');
    const hasL = targetWord.includes('l');
    const hasShortI = /[bcdfghjklmnpqrstvwxyz]i[bcdfghjklmnpqrstvwxyz]/.test(targetWord);
    const ealTip = hasTh
      ? 'EAL tip: keep your tongue gently between teeth for "th".'
      : hasV
        ? 'EAL tip: for "v", use voice and touch your bottom lip to upper teeth.'
        : hasR && hasL
          ? 'EAL tip: check /r/ vs /l/ contrast and keep sounds distinct.'
          : hasShortI
            ? 'EAL tip: keep short /i/ crisp (as in "sit"), not /ee/.'
            : 'EAL tip: stress the main syllable and keep ending sounds clear.';
    if (!analysis) {
      return {
        message: `Clip captured. Play it back, compare with model audio. ${ealTip}`,
        tone: 'default',
        score: 60,
        label: 'Captured'
      };
    }
    if (analysis.duration < 1.4) {
      return {
        message: `Clip was very short. Speak right after the countdown. ${ealTip}`,
        tone: 'warn',
        score: 35,
        label: 'Short'
      };
    }
    if (analysis.rms < 0.012 || analysis.voicedRatio < 0.05) {
      return {
        message: `Clip was very quiet. Try a little louder or closer to the mic. ${ealTip}`,
        tone: 'warn',
        score: 44,
        label: 'Quiet'
      };
    }
    if (analysis.peak > 0.97 || analysis.rms > 0.25) {
      return {
        message: `Volume may be too high. Step back slightly and retry. ${ealTip}`,
        tone: 'warn',
        score: 52,
        label: 'Hot'
      };
    }
    return {
      message: `Great clarity. Play it back and compare with model audio. ${ealTip}`,
      tone: 'good',
      score: 86,
      label: 'Clear'
    };
  }

  function getKidFriendlyFocusLabel(notation) {
    const raw = String(notation || '').replace(/\s+/g, ' ').trim();
    const normalized = raw.toLowerCase();
    if (!raw) return '';
    if (normalized.includes('floss')) return 'FLOSS Rule: doubled ending letters (-ss, -ll, -ff, -zz)';
    if (normalized.includes('cvc') || normalized.includes('short vowel') || normalized.includes('closed syllable')) {
      return 'Sound Steps: CVC short-vowel pattern (cat, dog)';
    }
    if (normalized.includes('cvce') || normalized.includes('magic e') || normalized.includes('silent e')) {
      return 'Magic E Rule: CVCe pattern (cap -> cape)';
    }
    if (normalized.includes('digraph')) return 'Sound Buddies: digraph (sh as in ship)';
    if (normalized.includes('vowel team')) return 'Vowel Team focus (ai as in rain)';
    if (normalized.includes('r-controlled')) return 'Bossy R focus (ar as in car)';
    if (normalized.includes('blend')) {
      if (normalized.includes('initial') || normalized.includes('ccvc')) return 'Blend Builders: initial blend (b+r as in bring)';
      if (normalized.includes('final') || normalized.includes('cvcc')) return 'Blend Builders: final blend (m+p as in camp)';
      return 'Blend Builders: consonant blend focus (br in bring)';
    }
    if (normalized.includes('trigraph')) return 'Three-letter team focus (igh as in light)';
    if (normalized.includes('diphthong')) return 'Glide vowel focus (oi in coin, ou in cloud)';
    if (normalized.includes('prefix')) return 'Prefix focus (re- as in replay)';
    if (normalized.includes('suffix')) return 'Suffix focus (-ed as in jumped)';
    if (normalized.includes('schwa')) return 'Schwa focus (a in about says /uh/)';
    if (normalized.includes('multisyll')) return 'Syllable strategy focus (chunk + blend)';
    return raw;
  }

  function getKidFriendlyFocusDetail(notation) {
    const normalized = String(notation || '').toLowerCase();
    if (normalized.includes('floss')) {
      return 'Floss Rule: after a short vowel at the end of a one-syllable word, double f, l, s, or z.';
    }
    if (normalized.includes('cvce') || normalized.includes('magic e') || normalized.includes('silent e')) {
      return 'Magic E makes the vowel say its name: cap → cape, kit → kite.';
    }
    if (normalized.includes('digraph')) {
      return 'Digraphs are two letters that work together to make one sound.';
    }
    if (normalized.includes('vowel team')) {
      return 'Vowel teams are two vowels working together to make one main sound.';
    }
    if (normalized.includes('r-controlled')) {
      return 'Bossy R changes the vowel sound in patterns like ar, or, er, ir, and ur.';
    }
    if (normalized.includes('blend')) {
      return 'Blends keep both consonant sounds. Initial blend example: b+r in bring. Final blend example: m+p in camp.';
    }
    if (normalized.includes('schwa')) {
      return 'Schwa is the unstressed /uh/ sound in words like about or sofa.';
    }
    return '';
  }

  function updateRevealSorBadge(entry) {
    const sor = _el('modal-sor');
    if (!sor) return;
    const notation = String(entry?.phonics || '').trim();
    if (!isSorNotationEnabled() || !notation || notation.toLowerCase() === 'all') {
      sor.textContent = '';
      sor.removeAttribute('title');
      sor.classList.add('hidden');
      return;
    }
    sor.textContent = getKidFriendlyFocusLabel(notation);
    const detail = getKidFriendlyFocusDetail(notation);
    if (detail) sor.setAttribute('title', detail);
    else sor.removeAttribute('title');
    sor.classList.remove('hidden');
  }

  function updateVoicePracticePanel(state) {
    const panel = _el('modal-voice-practice');
    const practiceDetails = _el('modal-practice-details');
    const practiceStatus = _el('modal-practice-status');
    const target = _el('voice-practice-target');
    const playAgain = _el('play-again-btn');
    const mode = getVoicePracticeMode();
    const word = String(state?.word || '').toUpperCase();

    if (practiceStatus) {
      const required = mode === 'required';
      practiceStatus.textContent = required ? 'Required' : 'Optional';
      practiceStatus.classList.toggle('is-required', required);
      const toggleLabel = required
        ? 'Tap to switch to Optional'
        : 'Tap to switch to Required';
      practiceStatus.setAttribute('title', toggleLabel);
      practiceStatus.setAttribute('aria-label', toggleLabel);
      if (practiceStatus instanceof HTMLButtonElement) {
        practiceStatus.disabled = mode === 'off';
      }
    }

    if (target) target.textContent = word ? `Target: ${word}` : '';
    if (!panel) return;
    renderVoiceHistoryStrip();

    if (mode === 'off') {
      if (voiceIsRecording) stopVoiceCaptureNow();
      panel.classList.add('hidden');
      if (practiceDetails) {
        practiceDetails.classList.add('hidden');
        practiceDetails.open = false;
      }
      if (playAgain) {
        playAgain.disabled = false;
        playAgain.removeAttribute('aria-disabled');
      }
      return;
    }

    if (practiceDetails) {
      practiceDetails.classList.remove('hidden');
      if (getRevealFocusMode() === 'off') practiceDetails.open = true;
    }
    panel.classList.remove('hidden');
    if (mode === 'required' && !voiceTakeComplete) {
      if (practiceDetails) practiceDetails.open = true;
      if (playAgain) {
        playAgain.disabled = true;
        playAgain.setAttribute('aria-disabled', 'true');
      }
      setVoicePracticeFeedback('Recording is required before the next word.');
      return;
    }

    if (playAgain) {
      playAgain.disabled = false;
      playAgain.removeAttribute('aria-disabled');
    }
    if (!voiceTakeComplete && !voiceIsRecording) {
      setVoicePracticeFeedback('Tap Record to start a 3-second countdown, then compare with model audio.');
    }
  }

  function openVoicePracticeAndRecord(options = {}) {
    const mode = getVoicePracticeMode();
    const practiceDetails = _el('modal-practice-details');
    if (practiceDetails) practiceDetails.open = true;
    if (mode === 'off') {
      setVoicePracticeFeedback('Say It Back is off in Settings. Switch Voice Practice to Optional or Required.', 'warn');
      return false;
    }
    if (voiceIsRecording) {
      setVoicePracticeFeedback('Recording in progress...');
      return true;
    }
    const shouldAutoStart = options.autoStart !== false;
    if (shouldAutoStart && !voiceTakeComplete) {
      void startVoiceRecording();
      return true;
    }
    if (!voiceTakeComplete) {
      setVoicePracticeFeedback('Tap Record to start a 3-second countdown and capture your voice.');
    }
    return true;
  }

  async function startVoiceRecording() {
    if (voiceIsRecording) return;
    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === 'undefined') {
      setVoicePracticeFeedback('Recording is not available on this device.', true);
      return;
    }
    clearVoiceCountdownTimer();
    voiceCountdownToken += 1;
    const countdownToken = voiceCountdownToken;
    let secondsLeft = VOICE_COUNTDOWN_SECONDS;
    setVoiceRecordingUI(false);
    setVoicePracticeFeedback(`Get ready... recording starts in ${secondsLeft}.`);
    voiceCountdownTimer = setInterval(() => {
      secondsLeft -= 1;
      if (!voiceCountdownTimer || countdownToken !== voiceCountdownToken) return;
      if (secondsLeft > 0) {
        setVoicePracticeFeedback(`Get ready... recording starts in ${secondsLeft}.`);
        setVoiceRecordingUI(false);
        return;
      }
      clearVoiceCountdownTimer();
    }, 1000);
    setVoiceRecordingUI(false);
    await waitMs(VOICE_COUNTDOWN_SECONDS * 1000);
    if (countdownToken !== voiceCountdownToken) return;
    recordVoiceAttempt();
    try {
      clearVoiceClip();
      voiceTakeComplete = false;
      voiceChunks = [];
      setVoicePracticeFeedback('Recording now...');
      voiceStream = await navigator.mediaDevices.getUserMedia({ audio: true });
      voiceRecorder = new MediaRecorder(voiceStream);
      voiceRecorder.addEventListener('dataavailable', (event) => {
        if (event.data && event.data.size > 0) voiceChunks.push(event.data);
      });
      voiceRecorder.addEventListener('stop', () => {
        clearVoiceAutoStopTimer();
        voiceIsRecording = false;
        setVoiceRecordingUI(false);
        stopVoiceVisualizer();
        stopVoiceStream();
        const blob = new Blob(voiceChunks, { type: voiceChunks[0]?.type || 'audio/webm' });
        if (!blob.size) {
          setVoicePracticeFeedback('No audio captured. Please try again.', true);
          return;
        }
        voiceClipBlob = blob;
        voiceClipUrl = URL.createObjectURL(blob);
        voiceTakeComplete = true;
        if (revealChallengeState) setChallengeTaskComplete('listen', true);
        const playBtn = _el('voice-play-btn');
        if (playBtn) playBtn.disabled = false;
        const saveBtn = _el('voice-save-btn');
        if (saveBtn) saveBtn.disabled = false;
        setVoicePracticeFeedback('Analyzing your clip...');
        updateVoicePracticePanel(WQGame.getState());
        void analyzeVoiceClip(blob).then((analysis) => {
          if (!voiceClipBlob || voiceClipBlob !== blob) return;
          const review = buildVoiceFeedback(analysis, WQGame.getState()?.entry || null);
          setVoicePracticeFeedback(review.message, review.tone);
          appendVoiceHistory(review);
        });
      });
      voiceIsRecording = true;
      setVoiceRecordingUI(true);
      setVoicePracticeFeedback('Recording for 3 seconds...');
      if (localStorage.getItem(VOICE_PRIVACY_TOAST_KEY) !== 'seen') {
        WQUI.showToast('Voice recordings stay on this device only. Nothing is uploaded.');
        localStorage.setItem(VOICE_PRIVACY_TOAST_KEY, 'seen');
      }
      clearVoiceAutoStopTimer();
      voiceAutoStopTimer = setTimeout(() => {
        if (voiceRecorder && voiceRecorder.state === 'recording') {
          stopVoiceRecording({ reason: 'auto' });
        }
      }, VOICE_CAPTURE_MS);

      const Ctor = window.AudioContext || window.webkitAudioContext;
      if (Ctor) {
        voiceAudioCtx = new Ctor();
        const source = voiceAudioCtx.createMediaStreamSource(voiceStream);
        voiceAnalyser = voiceAudioCtx.createAnalyser();
        voiceAnalyser.fftSize = 1024;
        source.connect(voiceAnalyser);
        animateLiveWaveform();
      } else {
        drawWaveform();
      }

      voiceRecorder.start();
    } catch {
      setVoicePracticeFeedback('Microphone access was blocked.', true);
      voiceIsRecording = false;
      setVoiceRecordingUI(false);
      clearVoiceAutoStopTimer();
      stopVoiceVisualizer();
      stopVoiceStream();
    }
  }

  function stopVoiceRecording(options = {}) {
    clearVoiceAutoStopTimer();
    if (voiceRecorder && voiceRecorder.state !== 'inactive') {
      voiceRecorder.stop();
      const reason = String(options.reason || 'manual');
      setVoicePracticeFeedback(reason === 'auto' ? 'Saving your 3-second clip...' : 'Saving your recording...');
    } else {
      stopVoiceCaptureNow();
    }
  }

  function playVoiceRecording() {
    if (!voiceClipUrl) return;
    if (voicePreviewAudio) {
      voicePreviewAudio.pause();
      voicePreviewAudio = null;
    }
    voicePreviewAudio = new Audio(voiceClipUrl);
    setVoicePracticeFeedback('Playing your recording. Compare with the model audio.');
    void voicePreviewAudio.play().catch(() => {
      setVoicePracticeFeedback('Could not play your recording on this device.', true);
    });
  }

  function saveVoiceRecording() {
    if (!voiceClipBlob || !voiceClipUrl) return;
    const currentWord = String(WQGame.getState()?.word || 'word')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '') || 'word';
    const stamp = new Date().toISOString().replace(/[:.]/g, '-');
    const ext = voiceClipBlob.type.includes('ogg')
      ? 'ogg'
      : voiceClipBlob.type.includes('mp4')
        ? 'm4a'
        : 'webm';
    const link = document.createElement('a');
    link.href = voiceClipUrl;
    link.download = `wordquest-${currentWord}-${stamp}.${ext}`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    setVoicePracticeFeedback('Saved locally to your Downloads folder.');
  }

  function bindVoicePracticeControls() {
    if (document.body.dataset.wqVoicePracticeBound === '1') return;
    _el('voice-guide-btn')?.addEventListener('click', (event) => {
      event.preventDefault();
      event.stopPropagation();
      runKaraokeGuide(WQGame.getState()?.entry || null);
      cancelRevealNarration();
      void WQAudio.playWord(WQGame.getState()?.entry || null);
    });
    _el('voice-record-btn')?.addEventListener('click', () => { void startVoiceRecording(); });
    _el('voice-play-btn')?.addEventListener('click', () => playVoiceRecording());
    _el('voice-save-btn')?.addEventListener('click', () => saveVoiceRecording());
    _el('modal-practice-status')?.addEventListener('click', (event) => {
      event.preventDefault();
      event.stopPropagation();
      const current = getVoicePracticeMode();
      const next = current === 'required' ? 'optional' : 'required';
      setVoicePracticeMode(next, { toast: true });
      const details = _el('modal-practice-details');
      if (details && next === 'required') details.open = true;
    });
    _el('voice-quick-record-btn')?.addEventListener('click', (event) => {
      event.preventDefault();
      event.stopPropagation();
      openVoicePracticeAndRecord({ autoStart: true });
    });
    _el('modal-practice-details')?.addEventListener('toggle', (event) => {
      const details = event.currentTarget;
      if (!(details instanceof HTMLDetailsElement) || !details.open) return;
      if (voiceTakeComplete || voiceIsRecording) return;
      setVoicePracticeFeedback('Tap Record to start a 3-second countdown.');
    });
    document.body.dataset.wqVoicePracticeBound = '1';
    setVoiceRecordingUI(false);
    resetKaraokeGuide(WQGame.getState()?.word || '');
    renderVoiceHistoryStrip();
  }

  function installRevealModalPatch() {
    if (!WQUI || typeof WQUI.showModal !== 'function') return;
    if (WQUI.__revealPatchApplied) return;
    bindVoicePracticeControls();
    const originalShowModal = WQUI.showModal.bind(WQUI);
    WQUI.showModal = function patchedShowModal(state) {
      clearRevealAutoAdvanceTimer();
      hideInformantHintCard();
      originalShowModal(state);
      voiceTakeComplete = false;
      stopVoiceCaptureNow();
      clearVoiceClip();
      resetKaraokeGuide(state?.word || '');
      updateRevealSorBadge(state?.entry);
      syncRevealMeaningHighlight(state?.entry);
      syncRevealChallengeLaunch(state);
      closeRevealChallengeModal({ silent: true });
      const practiceDetails = _el('modal-practice-details');
      if (practiceDetails) {
        const requiredPractice = getVoicePracticeMode() === 'required';
        practiceDetails.open = requiredPractice || getRevealFocusMode() === 'off';
      }
      const details = _el('modal-more-details');
      if (details && !details.classList.contains('hidden')) {
        details.open = getRevealFocusMode() === 'off';
      }
      updateVoicePracticePanel(state);
      syncRevealFocusModalSections();
      void runRevealNarration(state).finally(() => {
        if (_el('modal-overlay')?.classList.contains('hidden')) return;
        scheduleRevealAutoAdvance();
      });
      return state;
    };
    WQUI.__revealPatchApplied = true;
  }

  function installResponsiveLayoutPatch() {
    if (!WQUI || typeof WQUI.calcLayout !== 'function') return;
    if (WQUI.__layoutPatchApplied) return;

    const parsePx = (value, fallback = 0) => {
      const num = parseFloat(String(value || '').replace('px', '').trim());
      return Number.isFinite(num) ? num : fallback;
    };

    WQUI.calcLayout = function calcLayoutAdaptive(wordLength, maxGuesses) {
      const rootStyle = getComputedStyle(document.documentElement);
      const mainEl = document.querySelector('main');
      const boardZoneEl = document.querySelector('.board-zone');
      const supportRowEl = document.querySelector('.play-support-row');
      const boardPlateEl = document.querySelector('.board-plate');
      const keyboardEl = _el('keyboard');
      const gameplayAudioEl = document.querySelector('.gameplay-audio');
      const headerEl = document.querySelector('header');
      const focusEl = document.querySelector('.focus-bar');
      const nextActionEl = _el('next-action-line');
      const classroomTurnEl = _el('classroom-turn-line');
      const themeStripEl = _el('theme-preview-strip');

      const keyH = parsePx(rootStyle.getPropertyValue('--key-h'), 52);
      const keyGap = parsePx(rootStyle.getPropertyValue('--gap-key'), 8);
      const baseTileGap = parsePx(rootStyle.getPropertyValue('--gap-tile'), 9);
      const mainStyle = mainEl ? getComputedStyle(mainEl) : null;
      const mainInnerW = (mainEl?.clientWidth || Math.min(window.innerWidth, 560))
        - parsePx(mainStyle?.paddingLeft, 12)
        - parsePx(mainStyle?.paddingRight, 12);
      const mainPadTop = parsePx(mainStyle?.paddingTop, 10);
      const mainPadBottom = parsePx(mainStyle?.paddingBottom, 10);
      const boardZoneGap = parsePx(getComputedStyle(boardZoneEl || document.body).gap, 16);
      const platePadY = parsePx(getComputedStyle(boardPlateEl || document.body).paddingTop, 22) * 2;
      const platePadX = parsePx(getComputedStyle(boardPlateEl || document.body).paddingLeft, 26) * 2;
      const supportH = supportRowEl?.offsetHeight || 0;
      const audioH = supportH ? 0 : (gameplayAudioEl?.offsetHeight || 36);
      const headerH = headerEl?.offsetHeight || parsePx(rootStyle.getPropertyValue('--header-h'), 50);
      const focusH = focusEl?.offsetHeight || parsePx(rootStyle.getPropertyValue('--focus-h'), 44);
      const nextActionH = nextActionEl && !nextActionEl.classList.contains('hidden')
        ? Math.max(0, nextActionEl.offsetHeight || 0)
        : 0;
      const classroomTurnH = classroomTurnEl && !classroomTurnEl.classList.contains('hidden')
        ? Math.max(0, classroomTurnEl.offsetHeight || 0)
        : 0;
      const themeNestedInHeader = Boolean(themeStripEl && headerEl && headerEl.contains(themeStripEl));
      const themeStripPosition = themeStripEl ? getComputedStyle(themeStripEl).position : '';
      const themeStripOverlay = themeStripEl
        ? themeStripPosition === 'fixed' || themeStripPosition === 'absolute'
        : false;
      const themeH = (themeNestedInHeader || themeStripOverlay) ? 0 : (themeStripEl?.offsetHeight || 0);
      const viewportH = window.visualViewport?.height || window.innerHeight;
      const viewportW = window.visualViewport?.width || window.innerWidth;
      const homeMode = document.documentElement.getAttribute('data-home-mode') || 'play';
      const playStyle = document.documentElement.getAttribute('data-play-style') || 'detective';
      const keyboardLayout = document.documentElement.getAttribute('data-keyboard-layout') || 'standard';
      const chunkTabsOn = document.documentElement.getAttribute('data-chunk-tabs') !== 'off';
      const isLandscape = viewportW >= viewportH;
      const isFullscreen = Boolean(document.fullscreenElement);
      let layoutMode = 'default';
      if (viewportW >= 1040 && viewportH >= 760) layoutMode = 'wide';
      else if (viewportH <= 560 || (isLandscape && viewportH <= 620)) layoutMode = 'compact';
      else if (viewportH <= 760) layoutMode = 'tight';
      const tileGap = baseTileGap;
      const keyboardBottomGap = layoutMode === 'compact'
        ? (isFullscreen ? 2 : 4)
        : layoutMode === 'tight'
          ? (isFullscreen ? 3 : 5)
          : (isFullscreen ? 4 : 0);
      const listeningBottomGapBoost = playStyle === 'listening' ? 10 : 0;
      document.documentElement.setAttribute('data-layout-mode', layoutMode);
      document.documentElement.setAttribute('data-viewport-orientation', isLandscape ? 'landscape' : 'portrait');

      const chunkButtons = keyboardEl
        ? keyboardEl.querySelectorAll('.key-row-chunks .key').length
        : 0;
      const expectedChunkButtons = keyboardLayout === 'wilson' && chunkTabsOn ? 6 : 0;
      const effectiveChunkButtons = Math.max(chunkButtons, expectedChunkButtons);
      const chunkKeyH = Math.round(Math.max(18, keyH * (layoutMode === 'compact' ? 0.44 : 0.5)));
      const chunkSlotW = Math.max(46, Math.round((keyH * 0.82)));
      const chunkCols = Math.max(3, Math.floor(Math.max(280, mainInnerW) / chunkSlotW));
      const chunkRowsRaw = (keyboardLayout === 'wilson' && chunkTabsOn && effectiveChunkButtons > 0)
        ? Math.ceil(effectiveChunkButtons / chunkCols)
        : 0;
      const chunkRows = layoutMode === 'compact' ? Math.min(chunkRowsRaw, 1) : chunkRowsRaw;
      const chunkRowH = chunkRows > 0
        ? (chunkRows * chunkKeyH) + ((chunkRows - 1) * 5) + 8
        : 0;
      const supportReserveH = supportH ? Math.max(0, supportH - 2) : 0;
      const kbRows = 3;
      const keyboardSafetyPad = keyboardLayout === 'wilson'
        ? (layoutMode === 'compact' ? 24 : layoutMode === 'tight' ? 19 : 16)
        : 4;
      const kbH = kbRows * keyH + (kbRows - 1) * keyGap + chunkRowH + keyboardSafetyPad;

      const extraSafetyBase = layoutMode === 'compact' ? 30 : layoutMode === 'tight' ? 22 : layoutMode === 'wide' ? 14 : 18;
      const playModeSafety = homeMode === 'play' ? 12 : 0;
      const extraSafetyH = extraSafetyBase + playModeSafety;
      const listeningReserveH = playStyle === 'listening' ? 12 : 0;
      const reservedH = headerH + focusH + nextActionH + classroomTurnH + themeH + mainPadTop + mainPadBottom + audioH + kbH + (keyboardBottomGap + listeningBottomGapBoost) + boardZoneGap + supportReserveH + extraSafetyH + listeningReserveH;
      const availableBoardH = Math.max(140, viewportH - reservedH);
      const guessDensityRelief = maxGuesses > 5 ? Math.min(12, (maxGuesses - 5) * 6) : 0;
      const byHeight = Math.floor((availableBoardH + guessDensityRelief - platePadY - tileGap * (maxGuesses - 1) + 2) / maxGuesses);

      const availableBoardW = Math.max(220, mainInnerW);
      const byWidth = Math.floor((availableBoardW - platePadX - tileGap * (wordLength - 1)) / wordLength);

      const sizeCap = layoutMode === 'wide' ? 102 : layoutMode === 'tight' ? 92 : layoutMode === 'compact' ? 84 : 98;
      const sizeFloor = layoutMode === 'compact' ? 34 : layoutMode === 'tight' ? 38 : 42;
      let size = Math.max(sizeFloor, Math.min(byHeight, byWidth, sizeCap));
      if (layoutMode !== 'compact' && size < sizeCap && byHeight > size + 1 && byWidth > size + 1) {
        size = Math.min(sizeCap, size + 4);
      }
      const tileRadius = Math.max(10, Math.min(19, Math.round(size * 0.24)));
      const boardWidth = wordLength * size + (wordLength - 1) * tileGap;
      const boardHeight = maxGuesses * size + (maxGuesses - 1) * tileGap;
      const playfieldW = Math.ceil(boardWidth);
      const playfieldH = Math.ceil(boardHeight);

      const adaptiveKeyFloor = layoutMode === 'compact' ? 34 : layoutMode === 'tight' ? 40 : 44;
      const adaptiveKeyCeil = layoutMode === 'wide' ? 52 : 50;
      const adaptiveKeyH = Math.max(adaptiveKeyFloor, Math.min(adaptiveKeyCeil, Math.round(size * 0.9)));
      let adaptiveKeyMinW = Math.max(layoutMode === 'compact' ? 20 : layoutMode === 'tight' ? 23 : 27, Math.min(44, Math.round(size * 0.74)));
      let adaptiveKeyGap = Math.max(layoutMode === 'compact' ? 5.6 : 6.2, Math.min(10, Math.round(size * 0.16)));
      const maxKeyboardW = Math.max(286, Math.min(window.innerWidth - 16, mainInnerW - 4));
      const activeCols = keyboardLayout === 'wilson' ? 10 : 10;
      const estimateKeyboardW = () => (adaptiveKeyMinW * activeCols) + (adaptiveKeyGap * (activeCols - 1));
      const minKeyFloor = layoutMode === 'compact' ? 22 : layoutMode === 'tight' ? 23 : 24;
      while (estimateKeyboardW() > maxKeyboardW && adaptiveKeyMinW > minKeyFloor) {
        adaptiveKeyMinW -= 1;
        if (adaptiveKeyGap > 5.4) adaptiveKeyGap -= 0.2;
      }

      document.documentElement.style.setProperty('--tile-size', `${size}px`);
      document.documentElement.style.setProperty('--radius-tile', `${tileRadius}px`);
      document.documentElement.style.setProperty('--gap-tile', `${tileGap}px`);
      document.documentElement.style.setProperty('--playfield-width', `${playfieldW}px`);
      document.documentElement.style.setProperty('--playfield-height', `${playfieldH}px`);
      document.documentElement.style.setProperty('--key-h', `${adaptiveKeyH}px`);
      document.documentElement.style.setProperty('--key-min-w', `${adaptiveKeyMinW}px`);
      document.documentElement.style.setProperty('--gap-key', `${Math.max(6, adaptiveKeyGap).toFixed(1)}px`);
      document.documentElement.style.setProperty('--keyboard-max-width', `${Math.ceil(maxKeyboardW)}px`);
      document.documentElement.style.setProperty('--keyboard-bottom-gap', `${keyboardBottomGap + listeningBottomGapBoost}px`);
      document.documentElement.style.setProperty('--play-header-h', `${Math.ceil(headerH)}px`);

      if (boardPlateEl) {
        boardPlateEl.style.removeProperty('width');
      }

      if (keyboardEl && keyboardEl.offsetWidth > maxKeyboardW) {
        document.documentElement.style.setProperty('--key-min-w', `${Math.max(minKeyFloor, adaptiveKeyMinW - 2)}px`);
      }

      return { size, playfieldW };
    };

    WQUI.__layoutPatchApplied = true;
  }
  installRevealModalPatch();
  installResponsiveLayoutPatch();

  // ─── 6. Focus + grade alignment ─────────────────────

  const FOCUS_HINTS = {
    all: '',
    cvc:'CVC · short vowel',
    digraph:'Digraphs · sh, ch, th, wh',
    ccvc:'Initial blends · st, bl, tr…',
    cvcc:'Final blends · mp, nd, st…',
    trigraph:'Trigraphs · tch, dge, igh',
    cvce:'Magic E / Silent E',
    vowel_team:'Vowel teams · ai, ee, oa…',
    r_controlled:'R-controlled · ar, or, er…',
    diphthong:'Diphthongs · oi, oy, ou…',
    floss:'FLOSS · ff, ll, ss',
    welded:'Welded sounds · -ang, -ing…',
    schwa:'Schwa · unstressed vowel',
    prefix:'Prefixes · un-, re-, pre-…',
    suffix:'Suffixes · -ing, -ed, -er…',
    compound:'Compound words',
    multisyllable:'Multisyllabic words',
    'vocab-math-k2':'Math vocabulary · K-2',
    'vocab-math-35':'Math vocabulary · Grades 3-5',
    'vocab-math-68':'Math vocabulary · Grades 6-8',
    'vocab-math-912':'Math vocabulary · Grades 9-12',
    'vocab-science-k2':'Science vocabulary · K-2',
    'vocab-science-35':'Science vocabulary · Grades 3-5',
    'vocab-science-68':'Science vocabulary · Grades 6-8',
    'vocab-science-912':'Science vocabulary · Grades 9-12',
    'vocab-social-k2':'Social Studies vocabulary · K-2',
    'vocab-social-35':'Social Studies vocabulary · Grades 3-5',
    'vocab-social-68':'Social Studies vocabulary · Grades 6-8',
    'vocab-social-912':'Social Studies vocabulary · Grades 9-12',
    'vocab-ela-k2':'ELA vocabulary · K-2',
    'vocab-ela-35':'ELA vocabulary · Grades 3-5',
    'vocab-ela-68':'ELA vocabulary · Grades 6-8',
    'vocab-ela-912':'ELA vocabulary · Grades 9-12'
  };

  let lessonPackApplying = false;

  function getLessonPackSelectElements() {
    return [_el('s-lesson-pack')]
      .filter(Boolean);
  }

  function getLessonTargetSelectElements() {
    return [_el('s-lesson-target')]
      .filter(Boolean);
  }

  function getLessonPackDefinition(packId) {
    const normalized = String(packId || '').trim().toLowerCase();
    return CURRICULUM_LESSON_PACKS[normalized] || CURRICULUM_LESSON_PACKS.custom;
  }

  function normalizeLessonPackId(packId) {
    const normalized = String(packId || '').trim().toLowerCase();
    return CURRICULUM_LESSON_PACKS[normalized] ? normalized : 'custom';
  }

  function normalizeLessonTargetId(packId, targetId) {
    const normalizedPack = normalizeLessonPackId(packId);
    if (normalizedPack === 'custom') return 'custom';
    const normalizedTarget = String(targetId || '').trim().toLowerCase();
    if (!normalizedTarget || normalizedTarget === 'custom') return 'custom';
    const pack = getLessonPackDefinition(normalizedPack);
    const exists = pack.targets.some((target) => target.id === normalizedTarget);
    return exists ? normalizedTarget : 'custom';
  }

  function getLessonTarget(packId, targetId) {
    const normalizedPack = normalizeLessonPackId(packId);
    if (normalizedPack === 'custom') return null;
    const normalizedTarget = normalizeLessonTargetId(normalizedPack, targetId);
    if (normalizedTarget === 'custom') return null;
    const pack = getLessonPackDefinition(normalizedPack);
    return pack.targets.find((target) => target.id === normalizedTarget) || null;
  }

  function formatLengthPrefLabel(value) {
    if (String(value || '').toLowerCase() === 'any') return 'Any length';
    return `${value}-letter`;
  }

  function stripPacingMonthWindow(pacingLabel) {
    const text = String(pacingLabel || '').trim();
    if (!text) return '';
    return text
      .replace(/\s*\((?:aug|sep|oct|nov|dec|jan|feb|mar|apr|may|jun|jul)[^)]+\)\s*$/i, '')
      .replace(/\s+/g, ' ')
      .trim();
  }

  function formatLessonTargetPacing(target, options = {}) {
    const pacingRaw = String(target?.pacing || '').trim();
    if (!pacingRaw) return 'Flexible schedule';
    if (options.includeMonthWindow) return pacingRaw;
    const stripped = stripPacingMonthWindow(pacingRaw);
    return stripped || pacingRaw;
  }

  function formatLessonTargetOptionLabel(target) {
    if (!target) return '';
    return String(target.label || '').trim();
  }

  function parsePacingWeekRange(pacingLabel) {
    const text = String(pacingLabel || '').trim();
    const match = text.match(/weeks?\s+(\d+)\s*(?:-\s*(\d+)|(\+))?/i);
    if (!match) return null;
    const start = Math.max(1, Math.floor(Number(match[1]) || 1));
    if (match[3]) {
      return { start, end: 60, raw: text };
    }
    const end = match[2]
      ? Math.max(start, Math.floor(Number(match[2]) || start))
      : start;
    return { start, end, raw: text };
  }

  function getSchoolYearStartDate() {
    const now = new Date();
    const year = now.getFullYear();
    const startYear = now.getMonth() >= 7 ? year : year - 1;
    return new Date(startYear, 8, 1);
  }

  function getCurrentSchoolWeek() {
    const now = new Date();
    const start = getSchoolYearStartDate();
    const dayMs = 24 * 60 * 60 * 1000;
    const nowFloor = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    const startFloor = new Date(start.getFullYear(), start.getMonth(), start.getDate()).getTime();
    const dayDiff = Math.floor((nowFloor - startFloor) / dayMs);
    if (dayDiff <= 0) return 1;
    return Math.max(1, Math.floor(dayDiff / 7) + 1);
  }

  function getCurrentWeekRecommendedLessonTarget(packId) {
    const normalizedPack = normalizeLessonPackId(packId);
    if (normalizedPack === 'custom') return null;
    const pack = getLessonPackDefinition(normalizedPack);
    const week = getCurrentSchoolWeek();
    const scored = pack.targets
      .map((target) => {
        const range = parsePacingWeekRange(target.pacing);
        if (!range) return null;
        const inRange = week >= range.start && week <= range.end;
        const distance = inRange
          ? 0
          : week < range.start
            ? range.start - week
            : week - range.end;
        return { target, range, inRange, distance };
      })
      .filter(Boolean)
      .sort((a, b) => {
        if (a.distance !== b.distance) return a.distance - b.distance;
        if (a.range.start !== b.range.start) return a.range.start - b.range.start;
        return 0;
      });
    return scored[0] || null;
  }

  function resolveDefaultLessonTargetId(packId) {
    const normalizedPack = normalizeLessonPackId(packId);
    if (normalizedPack === 'custom') return 'custom';
    const recommended = getCurrentWeekRecommendedLessonTarget(normalizedPack);
    const recommendedId = recommended?.target?.id || '';
    if (recommendedId) {
      return normalizeLessonTargetId(normalizedPack, recommendedId);
    }
    const pack = getLessonPackDefinition(normalizedPack);
    const firstId = pack.targets?.[0]?.id || 'custom';
    return normalizeLessonTargetId(normalizedPack, firstId);
  }

  function populateLessonTargetSelect(packId, preferredTarget = 'custom') {
    const targetSelects = getLessonTargetSelectElements();
    if (!targetSelects.length) return 'custom';
    const pack = getLessonPackDefinition(packId);
    const normalizedPack = normalizeLessonPackId(packId);
    const options = [];
    if (normalizedPack === 'custom') {
      options.push({ value: 'custom', label: 'Manual' });
    } else {
      const recommended = getCurrentWeekRecommendedLessonTarget(normalizedPack);
      const recommendedId = recommended?.target?.id || '';
      options.push({ value: 'custom', label: 'Select a lesson target' });
      pack.targets.forEach((target) => {
        const prefix = target.id === recommendedId ? '★ ' : '';
        options.push({ value: target.id, label: `${prefix}${formatLessonTargetOptionLabel(target)}` });
      });
    }
    const normalizedTarget = normalizeLessonTargetId(normalizedPack, preferredTarget);
    targetSelects.forEach((targetSelect) => {
      targetSelect.innerHTML = '';
      options.forEach((option) => {
        const node = document.createElement('option');
        node.value = option.value;
        node.textContent = option.label;
        targetSelect.appendChild(node);
      });
      targetSelect.value = normalizedTarget;
    });
    return normalizedTarget;
  }

  function setLessonPackPrefs(packId, targetId) {
    const normalizedPack = normalizeLessonPackId(packId);
    const normalizedTarget = normalizeLessonTargetId(normalizedPack, targetId);
    setPref('lessonPack', normalizedPack);
    setPref('lessonTarget', normalizedTarget);
    return { packId: normalizedPack, targetId: normalizedTarget };
  }

  function updateLessonPackWeekRecommendation(packId, targetId) {
    const weekEl = _el('lesson-pack-week');
    const applyBtn = _el('lesson-pack-apply-week-btn');
    if (!weekEl && !applyBtn) return;

    const normalizedPack = normalizeLessonPackId(packId);
    const normalizedTarget = normalizeLessonTargetId(normalizedPack, targetId);
    if (normalizedPack === 'custom') {
      if (weekEl) {
        weekEl.textContent = 'School week recommendation: choose a program to view suggested pacing target.';
        weekEl.setAttribute('title', weekEl.textContent);
      }
      if (applyBtn) {
        applyBtn.disabled = true;
        applyBtn.removeAttribute('data-pack-id');
        applyBtn.removeAttribute('data-target-id');
      }
      return;
    }

    const schoolWeek = getCurrentSchoolWeek();
    const recommendation = getCurrentWeekRecommendedLessonTarget(normalizedPack);
    if (!recommendation || !recommendation.target) {
      if (weekEl) {
        weekEl.textContent = `School week ${schoolWeek}: pacing map not available for this pack.`;
        weekEl.setAttribute('title', weekEl.textContent);
      }
      if (applyBtn) {
        applyBtn.disabled = true;
        applyBtn.removeAttribute('data-pack-id');
        applyBtn.removeAttribute('data-target-id');
      }
      return;
    }

    const recommendedTarget = recommendation.target;
    const isCurrentTarget = normalizedTarget === recommendedTarget.id;
    const pacing = formatLessonTargetPacing(recommendedTarget);
    const text = isCurrentTarget
      ? `School week ${schoolWeek}: on pace (${recommendedTarget.label}).`
      : `School week ${schoolWeek}: suggested target ${recommendedTarget.label} (${pacing}).`;
    if (weekEl) {
      weekEl.textContent = text;
      weekEl.setAttribute('title', text);
    }
    if (applyBtn) {
      applyBtn.disabled = isCurrentTarget;
      applyBtn.setAttribute('data-pack-id', normalizedPack);
      applyBtn.setAttribute('data-target-id', recommendedTarget.id);
    }
  }

  function updateLessonPackNote(packId, targetId) {
    const noteEls = [_el('lesson-pack-note')].filter(Boolean);
    const pacingEls = [_el('lesson-pack-pacing')].filter(Boolean);
    const normalizedPack = normalizeLessonPackId(packId);
    const normalizedTarget = normalizeLessonTargetId(normalizedPack, targetId);
    updateLessonPackWeekRecommendation(normalizedPack, normalizedTarget);
    if (!noteEls.length && !pacingEls.length) return;
    if (normalizedPack === 'custom') {
      noteEls.forEach((el) => {
        el.textContent = 'Manual mode keeps Quest, Grade Band, and Word Length under your control.';
      });
      pacingEls.forEach((el) => {
        el.textContent = 'District pacing: choose a program and lesson target to view suggested week range.';
      });
      return;
    }
    const pack = getLessonPackDefinition(normalizedPack);
    const target = getLessonTarget(normalizedPack, normalizedTarget);
    if (!target) {
      noteEls.forEach((el) => {
        el.textContent = `${pack.label} selected. Pick a lesson target to auto-apply Quest focus, Grade Band, and suggested Word Length.`;
      });
      pacingEls.forEach((el) => {
        el.textContent = `${pack.label} pacing map loaded. Pick a lesson target to apply its week range.`;
      });
      return;
    }
    const focusLabel = getFocusLabel(target.focus).replace(/[—]/g, '').replace(/\s+/g, ' ').trim();
    noteEls.forEach((el) => {
      el.textContent = `${pack.label} · ${target.label}: Quest ${focusLabel}, Grade ${formatGradeBandLabel(target.gradeBand)}, ${formatLengthPrefLabel(target.length)}.`;
    });
    pacingEls.forEach((el) => {
      el.textContent = `District pacing: ${formatLessonTargetPacing(target)}.`;
    });
  }

  function syncLessonPackControlsFromPrefs(options = {}) {
    const packSelects = getLessonPackSelectElements();
    const targetSelects = getLessonTargetSelectElements();
    const firstPackSelect = packSelects[0] || null;
    const firstTargetSelect = targetSelects[0] || null;
    if (!firstPackSelect && !firstTargetSelect) return { packId: 'custom', targetId: 'custom' };

    const preferredPack = options.packId ?? prefs.lessonPack ?? firstPackSelect?.value ?? DEFAULT_PREFS.lessonPack;
    const preferredTarget = options.targetId ?? prefs.lessonTarget ?? firstTargetSelect?.value ?? DEFAULT_PREFS.lessonTarget;
    const packId = normalizeLessonPackId(preferredPack);
    packSelects.forEach((select) => { select.value = packId; });
    const targetId = populateLessonTargetSelect(packId, preferredTarget);
    setLessonPackPrefs(packId, targetId);
    updateLessonPackNote(packId, targetId);
    refreshStandaloneMissionLabHub();
    return { packId, targetId };
  }

  function applyLessonTargetConfig(packId, targetId, options = {}) {
    const target = getLessonTarget(packId, targetId);
    if (!target) return false;
    const pack = getLessonPackDefinition(packId);
    const focusSelect = _el('setting-focus');
    const gradeSelect = _el('s-grade');
    const lengthSelect = _el('s-length');
    const desiredLength = getCurriculumLengthForFocus(target.focus, target.length);
    let lengthChanged = false;

    lessonPackApplying = true;
    try {
      if (focusSelect) {
        const focusExists = Array.from(focusSelect.options).some((option) => option.value === target.focus);
        if (focusExists && focusSelect.value !== target.focus) {
          focusSelect.value = target.focus;
          focusSelect.dispatchEvent(new Event('change', { bubbles: true }));
        }
      }
      if (gradeSelect && gradeSelect.value !== target.gradeBand) {
        gradeSelect.value = target.gradeBand;
        setPref('grade', target.gradeBand);
      }
      if (lengthSelect && lengthSelect.value !== desiredLength) {
        lengthSelect.value = desiredLength;
        setPref('length', desiredLength);
        lengthChanged = true;
      }
    } finally {
      lessonPackApplying = false;
    }
    if (lengthChanged) refreshBoardForLengthChange();

    updateFocusGradeNote();
    updateGradeTargetInline();
    updateFocusSummaryLabel();
    refreshStandaloneMissionLabHub();
    if (options.toast) {
      WQUI.showToast(`${pack.label}: ${target.label} applied (${formatLessonTargetPacing(target)}).`);
    }
    emitTelemetry('wq_target_apply', {
      program_id: packId,
      program_label: pack?.label || packId,
      lesson_id: target.id,
      lesson_label: target.label,
      pacing_label: formatLessonTargetPacing(target),
      source: options.toast ? 'manual_apply' : 'auto_apply'
    });
    return true;
  }

  function releaseLessonPackToManualMode() {
    if (lessonPackApplying) return;
    const packSelects = getLessonPackSelectElements();
    const currentPack = normalizeLessonPackId(
      prefs.lessonPack || packSelects[0]?.value || DEFAULT_PREFS.lessonPack
    );
    const currentTarget = normalizeLessonTargetId(
      currentPack,
      prefs.lessonTarget || getLessonTargetSelectElements()[0]?.value || DEFAULT_PREFS.lessonTarget
    );
    if (currentPack === 'custom' && currentTarget === 'custom') return;
    lessonPackApplying = true;
    try {
      packSelects.forEach((select) => { select.value = 'custom'; });
      populateLessonTargetSelect('custom', 'custom');
    } finally {
      lessonPackApplying = false;
    }
    setLessonPackPrefs('custom', 'custom');
    updateLessonPackNote('custom', 'custom');
    refreshStandaloneMissionLabHub();
  }

  function parseFocusPreset(value) {
    const focus = String(value || 'all').trim().toLowerCase();
    if (!focus || focus === 'all') {
      return { kind: 'classic', focus: 'all' };
    }
    const match = focus.match(/^vocab-(math|science|social|ela)-(k2|35|68|912)$/);
    if (match) {
      const [, subject, band] = match;
      return {
        kind: 'subject',
        focus,
        subject,
        band,
        gradeBand: SUBJECT_FOCUS_GRADE[band] || 'all'
      };
    }
    return { kind: 'phonics', focus };
  }

  const FOCUS_LENGTH_BY_VALUE = Object.freeze({
    all: '5',
    cvc: '3',
    digraph: '4',
    ccvc: '4',
    cvcc: '4',
    trigraph: '5',
    cvce: '4',
    vowel_team: '5',
    r_controlled: '5',
    diphthong: '5',
    floss: '4',
    welded: '5',
    schwa: '6',
    prefix: '6',
    suffix: '6',
    compound: '7',
    multisyllable: '7'
  });

  function getRecommendedLengthForFocus(focusValue) {
    const preset = parseFocusPreset(focusValue);
    if (preset.kind === 'subject') return '';
    if (preset.kind === 'classic') return FOCUS_LENGTH_BY_VALUE.all;
    return FOCUS_LENGTH_BY_VALUE[preset.focus] || DEFAULT_PREFS.length;
  }

  function refreshBoardForLengthChange() {
    if (isAssessmentRoundLocked()) return false;
    const state = WQGame.getState?.() || null;
    if (!state?.word || state?.gameOver) {
      newGame();
      return true;
    }
    const hasProgress = Boolean((state?.guesses?.length || 0) > 0 || String(state?.guess || '').length > 0);
    if (hasProgress) return false;
    newGame();
    return true;
  }

  function syncLengthFromFocus(focusValue, options = {}) {
    if (lessonPackApplying) return false;
    const lengthSelect = _el('s-length');
    if (!lengthSelect) return false;
    const recommended = getRecommendedLengthForFocus(focusValue);
    if (!recommended) return false;
    if (String(lengthSelect.value || '').trim() === recommended) return false;
    lengthSelect.value = recommended;
    setPref('length', recommended);
    refreshBoardForLengthChange();
    if (!options.silent) {
      WQUI.showToast(`Word length synced to ${recommended} letters for this quest.`);
    }
    return true;
  }

  function getEffectiveGameplayGradeBand(selectedGradeBand, focusValue = 'all') {
    const preset = parseFocusPreset(focusValue);
    if (preset.kind === 'subject' && preset.gradeBand) {
      return preset.gradeBand;
    }
    const normalized = String(selectedGradeBand || 'all').trim().toLowerCase();
    return normalized === 'all'
      ? SAFE_DEFAULT_GRADE_BAND
      : String(selectedGradeBand || SAFE_DEFAULT_GRADE_BAND).trim();
  }

  function shouldExpandGradeBandForFocus(focusValue = 'all') {
    const preset = parseFocusPreset(focusValue);
    return preset.kind === 'phonics';
  }

  function applyAllGradeLengthDefault(options = {}) {
    const focusValue = _el('setting-focus')?.value || prefs.focus || 'all';
    const preset = parseFocusPreset(focusValue);
    if (preset.kind === 'subject') return false;

    const gradeValue = String(_el('s-grade')?.value || prefs.grade || DEFAULT_PREFS.grade).trim().toLowerCase();
    if (gradeValue !== 'all') return false;

    const defaultLength = getRecommendedLengthForFocus(focusValue) || DEFAULT_PREFS.length;
    const lengthSelect = _el('s-length');
    if (!lengthSelect) return false;
    if (String(lengthSelect.value || '').trim() === defaultLength) return false;

    lengthSelect.value = defaultLength;
    setPref('length', defaultLength);
    if (options.toast) {
      WQUI.showToast(`All grades mode defaults to ${defaultLength}-letter words for this quest.`);
    }
    return true;
  }

  function enforceClassicFiveLetterDefault(options = {}) {
    const focusValue = _el('setting-focus')?.value || prefs.focus || 'all';
    const preset = parseFocusPreset(focusValue);
    if (preset.kind !== 'classic') return false;
    const lengthSelect = _el('s-length');
    if (!lengthSelect) return false;
    if (String(lengthSelect.value || '').trim() === '5') return false;
    lengthSelect.value = '5';
    setPref('length', '5');
    if (options.toast) {
      WQUI.showToast('Classic mode reset to 5-letter words.');
    }
    return true;
  }

  function syncGradeFromFocus(focusValue, options = {}) {
    const preset = parseFocusPreset(focusValue);
    if (preset.kind !== 'subject') {
      updateGradeTargetInline();
      return;
    }
    const gradeSelect = _el('s-grade');
    if (!gradeSelect || !preset.gradeBand) {
      updateGradeTargetInline();
      return;
    }
    if (gradeSelect.value !== preset.gradeBand) {
      gradeSelect.value = preset.gradeBand;
      setPref('grade', preset.gradeBand);
      if (!options.silent) {
        WQUI.showToast(`Grade synced to ${formatGradeBandLabel(preset.gradeBand)} for this quest.`);
      }
    }
    updateGradeTargetInline();
  }

  function updateFocusHint() {
    syncHintToggleUI(getHintMode());
  }

  function syncChunkTabsVisibility() {
    const layout = document.documentElement.getAttribute('data-keyboard-layout') || 'standard';
    const mode = applyChunkTabsMode(_el('s-chunk-tabs')?.value || prefs.chunkTabs || DEFAULT_PREFS.chunkTabs);
    const focusValue = _el('setting-focus')?.value || prefs.focus || 'all';
    const preset = parseFocusPreset(focusValue);
    const relevantFocus = preset.kind === 'phonics' && CHUNK_TAB_FOCUS_KEYS.has(preset.focus);

    let shouldShow = false;
    if (layout === 'wilson') {
      if (mode === 'on') shouldShow = true;
      else if (mode === 'auto') shouldShow = relevantFocus;
    }
    document.documentElement.setAttribute('data-chunk-tabs', shouldShow ? 'on' : 'off');

    const state = WQGame.getState?.();
    if (state?.wordLength && state?.maxGuesses && typeof WQUI.calcLayout === 'function') {
      WQUI.calcLayout(state.wordLength, state.maxGuesses);
    }
  }

  function updateFocusGradeNote() {
    const note = _el('focus-grade-note');
    if (!note) return;
    const focusVal = _el('setting-focus')?.value || 'all';
    const gradeVal = _el('s-grade')?.value || 'all';
    const gradeLabel = formatGradeBandLabel(gradeVal);
    const preset = parseFocusPreset(focusVal);
    if (preset.kind === 'classic') {
      note.textContent = `Word Safety filters age-appropriate words. Word Length separately controls letters (default 5). Current safety band: ${gradeLabel}.`;
      return;
    }
    if (preset.kind === 'subject') {
      note.textContent = `Subject focus keeps vocabulary on-level by auto-aligning grade to ${formatGradeBandLabel(preset.gradeBand)}.`;
      return;
    }
    note.textContent = `Phonics focus trains sound patterns. Word Safety (${gradeLabel}) controls age-appropriate vocabulary, while Word Length controls letters.`;
  }

  function getFocusDisplayLabel(value, fallback = '') {
    const labels = getFocusDisplayLabel._labels || (getFocusDisplayLabel._labels = Object.freeze({
      all: 'Classic Word Puzzle (5x6)',
      cvc: 'CVC (Short Vowels)',
      digraph: 'Digraphs',
      ccvc: 'Initial Blends (CCVC)',
      cvcc: 'Final Blends (CVCC)',
      trigraph: 'Trigraphs',
      cvce: 'CVCe (Magic E)',
      vowel_team: 'Vowel Teams',
      r_controlled: 'R-Controlled Vowels',
      diphthong: 'Diphthongs',
      floss: 'FLOSS Rule',
      welded: 'Welded Sounds',
      schwa: 'Schwa',
      prefix: 'Prefixes',
      suffix: 'Suffixes',
      compound: 'Compound Words',
      multisyllable: 'Multisyllabic Words'
    }));
    return labels[value] || String(fallback || value || '').trim();
  }

  function getFocusDisplayGroup(value, fallbackGroup = '') {
    const groups = getFocusDisplayGroup._groups || (getFocusDisplayGroup._groups = Object.freeze({
      all: 'Classic',
      cvc: 'Phonics',
      digraph: 'Phonics',
      ccvc: 'Phonics',
      cvcc: 'Phonics',
      trigraph: 'Phonics',
      cvce: 'Phonics',
      vowel_team: 'Phonics',
      r_controlled: 'Phonics',
      diphthong: 'Phonics',
      floss: 'Phonics',
      welded: 'Phonics',
      schwa: 'Phonics',
      prefix: 'Word Study',
      suffix: 'Word Study',
      compound: 'Word Study',
      multisyllable: 'Word Study'
    }));
    if (groups[value]) return groups[value];
    if (String(value || '').startsWith('vocab-')) return 'Subjects';
    return String(fallbackGroup || 'General').trim() || 'General';
  }

  const QUEST_FILTER_GRADE_ORDER = Object.freeze(['K-2', 'G3-5', 'G6-8', 'G9-12']);
  const FOCUS_SUGGESTED_GRADE_BAND = Object.freeze({
    cvc: 'K-2',
    digraph: 'K-2',
    ccvc: 'K-2',
    cvcc: 'K-2',
    cvce: 'K-2',
    floss: 'K-2',
    welded: 'K-2',
    trigraph: 'G3-5',
    vowel_team: 'G3-5',
    r_controlled: 'G3-5',
    diphthong: 'G3-5',
    schwa: 'G3-5',
    prefix: 'G3-5',
    suffix: 'G3-5',
    compound: 'G3-5',
    multisyllable: 'G3-5'
  });

  function normalizeQuestGradeBand(value) {
    const raw = String(value || 'all').trim();
    if (!raw) return 'all';
    const normalized = raw.toLowerCase();
    if (normalized === 'all') return 'all';
    if (normalized === 'k-2' || normalized === 'k2') return 'K-2';
    if (normalized === 'g3-5' || normalized === '3-5') return 'G3-5';
    if (normalized === 'g6-8' || normalized === '6-8') return 'G6-8';
    if (normalized === 'g9-12' || normalized === '9-12') return 'G9-12';
    return 'all';
  }

  function getQuestFilterGradeBand() {
    return normalizeQuestGradeBand(_el('s-grade')?.value || prefs.grade || DEFAULT_PREFS.grade);
  }

  function isEntryGradeBandCompatible(selectedGradeBand, entryGradeBand) {
    const selected = normalizeQuestGradeBand(selectedGradeBand);
    if (selected === 'all') return true;
    const selectedRank = QUEST_FILTER_GRADE_ORDER.indexOf(selected);
    if (selectedRank < 0) return true;
    const entry = normalizeQuestGradeBand(entryGradeBand);
    if (entry === 'all') return true;
    const entryRank = QUEST_FILTER_GRADE_ORDER.indexOf(entry);
    if (entryRank < 0) return true;
    return entryRank <= selectedRank;
  }

  function getFocusSuggestedGradeBand(value) {
    const preset = parseFocusPreset(value);
    if (preset.kind === 'subject') return preset.gradeBand || '';
    if (preset.kind === 'classic') return '';
    return FOCUS_SUGGESTED_GRADE_BAND[preset.focus] || '';
  }

  function isFocusValueCompatibleWithGrade(value, selectedGradeBand = getQuestFilterGradeBand()) {
    const suggestedBand = getFocusSuggestedGradeBand(value);
    return isEntryGradeBandCompatible(selectedGradeBand, suggestedBand);
  }

  function getCurriculumTargetsForGrade(packId, selectedGradeBand = getQuestFilterGradeBand(), options = {}) {
    const pack = getLessonPackDefinition(packId);
    if (!pack || !Array.isArray(pack.targets)) return [];
    const gradeFiltered = options.matchSelectedGrade === true;
    return pack.targets.filter((target) => {
      if (!target?.id) return false;
      if (!gradeFiltered) return true;
      return isEntryGradeBandCompatible(selectedGradeBand, target.gradeBand);
    });
  }

  function getFocusEntries(selectedGradeBand = getQuestFilterGradeBand()) {
    const select = _el('setting-focus');
    if (!select) return [];
    return Array.from(select.options)
      .filter((option) => option.value && !option.disabled)
      .map((option) => {
        const value = String(option.value || '').trim();
        const parent = option.parentElement;
        const rawGroup = parent && parent.tagName === 'OPTGROUP'
          ? String(parent.label || '').trim()
          : 'General';
        return {
          value,
          label: getFocusDisplayLabel(value, option.textContent || value),
          group: getFocusDisplayGroup(value, rawGroup),
          kind: 'focus',
          gradeBand: getFocusSuggestedGradeBand(value),
          questValue: `focus::${value}`
        };
      })
      .filter((entry) => isFocusValueCompatibleWithGrade(entry.value, selectedGradeBand));
  }

  function getCurriculumProgramEntries(selectedGradeBand = getQuestFilterGradeBand()) {
    return CURRICULUM_PACK_ORDER.map((packId) => {
      const pack = getLessonPackDefinition(packId);
      const visibleTargets = getCurriculumTargetsForGrade(packId, selectedGradeBand, { matchSelectedGrade: false });
      if (!visibleTargets.length) return null;
      return {
        value: `curriculum-pack::${packId}`,
        label: pack.label,
        group: 'Curriculum',
        kind: 'curriculum-pack',
        packId,
        lessonCount: visibleTargets.length,
        gradeBand: selectedGradeBand,
        targetId: 'custom',
        questValue: `curriculum-pack::${packId}`
      };
    }).filter(Boolean);
  }

  function getCurriculumQuestEntries(packFilter = '', selectedGradeBand = getQuestFilterGradeBand()) {
    const normalizedFilter = normalizeLessonPackId(packFilter);
    const useFilter = normalizedFilter !== 'custom' && normalizedFilter.length > 0;
    const entries = [];
    CURRICULUM_PACK_ORDER.forEach((packId) => {
      if (useFilter && packId !== normalizedFilter) return;
      const pack = getLessonPackDefinition(packId);
      const targets = getCurriculumTargetsForGrade(packId, selectedGradeBand, { matchSelectedGrade: false });
      targets.forEach((target) => {
        entries.push({
          value: `curriculum::${packId}::${target.id}`,
          label: target.label,
          group: pack.label,
          kind: 'curriculum',
          packId,
          gradeBand: target.gradeBand,
          targetId: target.id,
          questValue: `curriculum::${packId}::${target.id}`
        });
      });
    });
    return entries;
  }

  function getQuestEntries(selectedGradeBand = getQuestFilterGradeBand()) {
    return [
      ...getFocusEntries(selectedGradeBand),
      ...getCurriculumProgramEntries(selectedGradeBand),
      ...getCurriculumQuestEntries('', selectedGradeBand)
    ];
  }

  function getFocusLabel(value) {
    const select = _el('setting-focus');
    if (!select) return '— Classic (Wordle 5x6) —';
    const option = Array.from(select.options).find((entry) => entry.value === value);
    const raw = String(option?.textContent || '— Classic (Wordle 5x6) —').trim();
    return getFocusDisplayLabel(String(value || '').trim(), raw);
  }

  function clearPinnedFocusSearchValue(inputEl) {
    if (!inputEl) return;
    const raw = String(inputEl.value || '').trim();
    if (!raw) return;
    const lockedLabel = String(inputEl.dataset.lockedLabel || '').trim().toLowerCase();
    const normalizedRaw = raw.toLowerCase();
    if (lockedLabel && normalizedRaw === lockedLabel) {
      inputEl.value = '';
    }
  }

  function updateFocusSummaryLabel() {
    const inputEl = _el('focus-inline-search');
    const focusValue = _el('setting-focus')?.value || 'all';
    const activePack = normalizeLessonPackId(prefs.lessonPack || _el('s-lesson-pack')?.value || DEFAULT_PREFS.lessonPack);
    const activeTarget = normalizeLessonTargetId(
      activePack,
      prefs.lessonTarget || _el('s-lesson-target')?.value || DEFAULT_PREFS.lessonTarget
    );
    const target = activePack !== 'custom' ? getLessonTarget(activePack, activeTarget) : null;
    const currentLabelRaw = target
      ? `${getLessonPackDefinition(activePack).label} · ${target.label}`
      : getFocusLabel(focusValue).replace(/[—]/g, '').replace(/\s+/g, ' ').trim();
    const currentLabel = currentLabelRaw || 'Classic (Wordle 5x6)';

    if (!inputEl) return;
    inputEl.value = '';
    delete inputEl.dataset.lockedLabel;
    // Legacy regression sentinels:
    // inputEl.placeholder = 'Select your quest or track';
    // inputEl.setAttribute('aria-label', `Select your quest or track. Current selection: ${currentLabel}`);
    inputEl.placeholder = 'Select your quest';
    inputEl.setAttribute('aria-label', `Select your quest. Current selection: ${currentLabel}`);
    inputEl.setAttribute('title', `Current selection: ${currentLabel}`);
  }

  function formatGradeBandLabel(value) {
    const normalized = String(value || 'all').toLowerCase();
    if (normalized === 'k-2') return 'K-2';
    if (normalized === 'g3-5') return '3-5';
    if (normalized === 'g6-8') return '6-8';
    if (normalized === 'g9-12') return '9-12';
    return `All (${SAFE_DEFAULT_GRADE_BAND} safe)`;
  }

  function formatGradeBandInlineLabel(value) {
    const normalized = String(value || 'all').toLowerCase();
    if (normalized === 'all') return `All (${SAFE_DEFAULT_GRADE_BAND} safe)`;
    return formatGradeBandLabel(value);
  }

  function updateGradeTargetInline() {
    const gradeEl = _el('grade-target-inline');
    if (!gradeEl) return;
    const focusValue = _el('setting-focus')?.value || prefs.focus || 'all';
    const preset = parseFocusPreset(focusValue);
    const activeGrade = preset.kind === 'subject'
      ? preset.gradeBand
      : (_el('s-grade')?.value || prefs.grade || DEFAULT_PREFS.grade);
    const inlineLabel = formatGradeBandInlineLabel(activeGrade);
    const titleLabel = formatGradeBandLabel(activeGrade);
    gradeEl.textContent = `Grade: ${inlineLabel}`;
    if (preset.kind === 'subject') {
      gradeEl.setAttribute('title', `Grade band currently follows the selected subject focus: ${titleLabel}.`);
    } else {
      gradeEl.setAttribute('title', `Grade band in use: ${titleLabel}. This filters age-appropriate words; word length is controlled separately.`);
    }
  }

  function escapeHtml(value) {
    return String(value || '')
      .replaceAll('&', '&amp;')
      .replaceAll('<', '&lt;')
      .replaceAll('>', '&gt;')
      .replaceAll('"', '&quot;')
      .replaceAll("'", '&#39;');
  }

  const FOCUS_QUICK_VALUES = Object.freeze([
    'cvc',
    'digraph',
    'cvce',
    'ccvc',
    'cvcc',
    'floss',
    'vowel_team',
    'r_controlled'
  ]);
  const FOCUS_EMPTY_VISIBLE_LIMIT = 72;
  const FOCUS_QUERY_VISIBLE_LIMIT = 36;
  const CURRICULUM_QUICK_VALUES = Object.freeze([]);

  // Prioritize options that are most common for everyday classroom use.
  const FOCUS_POPULARITY = Object.freeze({
    all: 240,
    cvc: 220,
    cvce: 210,
    digraph: 205,
    vowel_team: 200,
    r_controlled: 195,
    multisyllable: 190,
    'vocab-math-k2': 185,
    'vocab-math-35': 182,
    'vocab-science-k2': 180,
    'vocab-science-35': 176,
    'vocab-ela-k2': 172,
    'vocab-ela-35': 168
  });

  const FOCUS_SEARCH_ALIASES = Object.freeze({
    all: Object.freeze(['classic', 'wordle', 'default']),
    cvc: Object.freeze(['short vowels', 'closed syllables', 'cv/vc', 'cvc words']),
    digraph: Object.freeze(['sh', 'ch', 'th']),
    ccvc: Object.freeze(['initial blends', 'blends']),
    cvcc: Object.freeze(['final blends', 'blends']),
    trigraph: Object.freeze(['tch', 'dge', 'igh']),
    cvce: Object.freeze(['magic e', 'silent e']),
    vowel_team: Object.freeze(['vowel teams', 'ai', 'ee', 'oa']),
    r_controlled: Object.freeze(['r controlled', 'bossy r', 'ar', 'or', 'er']),
    diphthong: Object.freeze(['oi', 'oy', 'ou']),
    floss: Object.freeze(['ff', 'll', 'ss']),
    welded: Object.freeze(['ang', 'ing', 'ank', 'ink']),
    multisyllable: Object.freeze(['syllables', 'multi syllable']),
    'vocab-math-k2': Object.freeze(['math k-2', 'math k2', 'numbers']),
    'vocab-math-35': Object.freeze(['math 3-5', 'math 35']),
    'vocab-science-k2': Object.freeze(['science k-2', 'science k2']),
    'vocab-science-35': Object.freeze(['science 3-5', 'science 35']),
    'vocab-social-k2': Object.freeze(['social studies k-2', 'social k2']),
    'vocab-ela-k2': Object.freeze(['ela k-2', 'reading k2'])
  });

  function tokenizeFocusQuery(rawQuery = '') {
    return String(rawQuery || '')
      .toLowerCase()
      .trim()
      .split(/[^a-z0-9]+/g)
      .filter((token) => token.length >= 2);
  }

  function splitFocusSearchTokens(rawText = '') {
    return String(rawText || '')
      .toLowerCase()
      .split(/[^a-z0-9]+/g)
      .map((token) => token.trim())
      .filter((token) => token.length >= 2);
  }

  function damerauLevenshteinDistance(source, target, maxDistance = 2) {
    const a = String(source || '');
    const b = String(target || '');
    if (a === b) return 0;
    if (!a.length || !b.length) return Math.max(a.length, b.length);
    if (Math.abs(a.length - b.length) > maxDistance) return maxDistance + 1;

    const matrix = Array.from({ length: a.length + 1 }, () => new Array(b.length + 1).fill(0));
    for (let i = 0; i <= a.length; i += 1) matrix[i][0] = i;
    for (let j = 0; j <= b.length; j += 1) matrix[0][j] = j;

    for (let i = 1; i <= a.length; i += 1) {
      let rowMin = maxDistance + 1;
      for (let j = 1; j <= b.length; j += 1) {
        const cost = a[i - 1] === b[j - 1] ? 0 : 1;
        let value = Math.min(
          matrix[i - 1][j] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j - 1] + cost
        );
        if (
          i > 1 &&
          j > 1 &&
          a[i - 1] === b[j - 2] &&
          a[i - 2] === b[j - 1]
        ) {
          value = Math.min(value, matrix[i - 2][j - 2] + 1);
        }
        matrix[i][j] = value;
        if (value < rowMin) rowMin = value;
      }
      if (rowMin > maxDistance) return maxDistance + 1;
    }

    return matrix[a.length][b.length];
  }

  function getFocusCandidateTokens(entry, aliases) {
    const labelTokens = splitFocusSearchTokens(entry?.label || '');
    const valueTokens = splitFocusSearchTokens(String(entry?.value || '').replaceAll('-', ' '));
    const groupTokens = splitFocusSearchTokens(entry?.group || '');
    const aliasTokens = aliases.flatMap((alias) => splitFocusSearchTokens(alias));
    return Array.from(new Set([...labelTokens, ...valueTokens, ...groupTokens, ...aliasTokens]));
  }

  function getTokenFuzzyThreshold(token) {
    const len = String(token || '').length;
    if (len <= 4) return 1;
    return 2;
  }

  function getBestFuzzyDistance(queryToken, candidateTokens, maxDistance = 2) {
    let best = maxDistance + 1;
    for (const candidate of candidateTokens) {
      const next = damerauLevenshteinDistance(queryToken, candidate, maxDistance);
      if (next < best) best = next;
      if (best === 0) break;
    }
    return best;
  }

  function scoreFocusEntry(entry, normalizedQuery, queryTokens) {
    const label = String(entry?.label || '').toLowerCase();
    const value = String(entry?.value || '').toLowerCase();
    const group = String(entry?.group || '').toLowerCase();
    const aliases = (FOCUS_SEARCH_ALIASES[entry.value] || [])
      .map((alias) => String(alias || '').toLowerCase())
      .filter(Boolean);
    const candidateTokens = getFocusCandidateTokens(entry, aliases);
    const aliasText = aliases.join(' ');
    const searchable = `${label} ${group} ${value} ${aliasText}`;
    let score = FOCUS_POPULARITY[entry.value] || 0;
    let hasMatch = false;

    if (label === normalizedQuery || value === normalizedQuery) {
      score += 420;
      hasMatch = true;
    }
    if (label.startsWith(normalizedQuery) || value.startsWith(normalizedQuery)) {
      score += 300;
      hasMatch = true;
    }
    if (label.split(/[^a-z0-9]+/g).some((part) => part && part.startsWith(normalizedQuery))) {
      score += 240;
      hasMatch = true;
    }
    if (aliases.some((alias) => alias.startsWith(normalizedQuery))) {
      score += 220;
      hasMatch = true;
    }
    if (searchable.includes(normalizedQuery)) {
      score += 150;
      hasMatch = true;
    }

    if (queryTokens.length) {
      let exactHits = 0;
      let fuzzyHits = 0;
      for (const token of queryTokens) {
        if (searchable.includes(token)) {
          exactHits += 1;
          continue;
        }
        const fuzzyThreshold = getTokenFuzzyThreshold(token);
        const bestDistance = getBestFuzzyDistance(token, candidateTokens, fuzzyThreshold);
        if (bestDistance <= fuzzyThreshold) {
          fuzzyHits += 1;
          continue;
        }
        return -1;
      }
      score += exactHits * 60;
      score += fuzzyHits * 44;
      if (fuzzyHits > 0) score += 18;
      hasMatch = true;
    }

    if (!hasMatch && normalizedQuery.length >= 4) {
      const compactQuery = normalizedQuery.replace(/[^a-z0-9]+/g, '');
      if (compactQuery.length >= 4) {
        const bestDistance = getBestFuzzyDistance(compactQuery, candidateTokens, 2);
        if (bestDistance <= 2) {
          score += 118 - bestDistance * 26;
          hasMatch = true;
        }
      }
    }

    if (!hasMatch) return -1;
    score += Math.max(0, 34 - Math.max(0, label.length - normalizedQuery.length));
    return score;
  }

  function getRankedFocusMatches(entries, rawQuery = '') {
    const normalizedQuery = String(rawQuery || '').trim().toLowerCase();
    if (!normalizedQuery) return [];
    const queryTokens = tokenizeFocusQuery(normalizedQuery);
    return entries
      .map((entry) => ({ entry, score: scoreFocusEntry(entry, normalizedQuery, queryTokens) }))
      .filter((row) => row.score > 0)
      .sort((a, b) => {
        if (b.score !== a.score) return b.score - a.score;
        const byGroup = String(a.entry.group || '').localeCompare(String(b.entry.group || ''));
        if (byGroup !== 0) return byGroup;
        return String(a.entry.label || '').localeCompare(String(b.entry.label || ''));
      })
      .slice(0, FOCUS_QUERY_VISIBLE_LIMIT)
      .map((row) => row.entry);
  }

  let focusNavIndex = -1;
  let focusCurriculumPackFilter = '';

  function setFocusSearchOpen(isOpen) {
    document.documentElement.setAttribute('data-focus-search-open', isOpen ? 'true' : 'false');
    if (isOpen) closeQuickPopover('all');
    syncThemePreviewStripVisibility();
  }

  function openTeacherWordTools() {
    if (isAssessmentRoundLocked()) {
      showAssessmentLockNotice();
      return;
    }
    const teacherBtn = _el('teacher-panel-btn');
    if (teacherBtn) {
      teacherBtn.click();
      return;
    }
    window.dispatchEvent(new CustomEvent(openTeacherHubEvent));
  }

  function getFocusSearchButtons() {
    const listEl = _el('focus-inline-results');
    if (!listEl) return [];
    return Array.from(listEl.querySelectorAll('.focus-search-item[data-quest-value]'));
  }

  function setFocusNavIndex(nextIndex, options = {}) {
    const buttons = getFocusSearchButtons();
    const inputEl = _el('focus-inline-search');
    if (!buttons.length) {
      focusNavIndex = -1;
      if (inputEl) inputEl.removeAttribute('aria-activedescendant');
      return;
    }

    const clamped = Math.max(0, Math.min(nextIndex, buttons.length - 1));
    focusNavIndex = clamped;
    buttons.forEach((button, idx) => {
      button.classList.toggle('is-nav-active', idx === clamped);
    });
    if (inputEl) inputEl.setAttribute('aria-activedescendant', buttons[clamped].id);
    if (options.scroll !== false) {
      buttons[clamped].scrollIntoView({ block: 'nearest' });
    }
  }

  function getGradeBandRank(value) {
    const order = Object.freeze({ 'K-2': 0, 'G3-5': 1, 'G6-8': 2, 'G9-12': 3 });
    return Number.isFinite(order[String(value || '').toUpperCase()]) ? order[String(value || '').toUpperCase()] : 9;
  }

  function getFocusEntrySectionKey(entry) {
    if (!entry) return 'phonics';
    if (entry.kind === 'curriculum' || entry.kind === 'curriculum-pack') return 'curriculum';
    const preset = parseFocusPreset(entry.value);
    if (preset.kind === 'subject') return 'subjects';
    return 'phonics';
  }

  const CURRICULUM_FOCUS_EXAMPLE_FALLBACK = Object.freeze({
    cvc: Object.freeze(['cat', 'map', 'sun']),
    digraph: Object.freeze(['ship', 'chat', 'thin']),
    ccvc: Object.freeze(['stop', 'trap', 'plan']),
    cvcc: Object.freeze(['lamp', 'sand', 'milk']),
    trigraph: Object.freeze(['catch', 'ridge', 'light']),
    cvce: Object.freeze(['cake', 'time', 'rope']),
    vowel_team: Object.freeze(['team', 'boat', 'rain']),
    r_controlled: Object.freeze(['car', 'storm', 'fern']),
    diphthong: Object.freeze(['coin', 'cloud', 'toy']),
    welded: Object.freeze(['ring', 'bank', 'song']),
    suffix: Object.freeze(['jumped', 'runner', 'hopeful']),
    prefix: Object.freeze(['redo', 'unfair', 'preview']),
    multisyllable: Object.freeze(['contest', 'sunset', 'napkin']),
    all: Object.freeze(['word', 'sound', 'meaning'])
  });

  const curriculumExamplePoolCache = new Map();
  const curriculumEntryExampleCache = new Map();

  function hashStringToPositiveInt(value) {
    const text = String(value || '');
    let hash = 0;
    for (let i = 0; i < text.length; i += 1) {
      hash = ((hash << 5) - hash) + text.charCodeAt(i);
      hash |= 0;
    }
    return Math.abs(hash);
  }

  function getCurriculumExampleWordsForTarget(target, entryKey = '') {
    if (!target) return [];
    const focus = String(target.focus || 'all').trim() || 'all';
    const gradeBand = String(target.gradeBand || SAFE_DEFAULT_GRADE_BAND).trim() || SAFE_DEFAULT_GRADE_BAND;
    const length = String(target.length || 'any').trim() || 'any';
    const cacheKey = `${focus}::${gradeBand}::${length}`;
    let pool = curriculumExamplePoolCache.get(cacheKey);
    if (!Array.isArray(pool)) {
      const rawPool = WQData.getPlayableWords({
        gradeBand,
        length,
        phonics: focus,
        includeLowerBands: shouldExpandGradeBandForFocus(focus)
      });
      pool = Array.isArray(rawPool)
        ? rawPool
          .map((word) => String(word || '').trim().toLowerCase())
          .filter((word) => /^[a-z]{2,12}$/.test(word))
          .slice(0, 200)
        : [];
      curriculumExamplePoolCache.set(cacheKey, pool);
    }
    if (!pool.length) {
      return (CURRICULUM_FOCUS_EXAMPLE_FALLBACK[focus] || CURRICULUM_FOCUS_EXAMPLE_FALLBACK.all).slice(0, 3);
    }
    const seeded = hashStringToPositiveInt(`${entryKey}::${target.id}::${cacheKey}`);
    const start = seeded % pool.length;
    const out = [];
    for (let offset = 0; offset < pool.length && out.length < 3; offset += 1) {
      const next = pool[(start + offset) % pool.length];
      if (!next || out.includes(next)) continue;
      out.push(next);
    }
    return out;
  }

  function getCurriculumFocusChipLabel(focusValue, packId = '') {
    const focus = String(focusValue || 'all').trim().toLowerCase() || 'all';
    const pack = String(packId || '').trim().toLowerCase();
    if (pack === 'ufli' || pack === 'fundations' || pack === 'wilson') {
      const curatedByPack = Object.freeze({
        ufli: Object.freeze({
          cvc: 'short-vowel CVC words',
          digraph: 'digraph spellings (sh/ch/th/wh)',
          ccvc: 'initial blends (st-/bl-/tr-)',
          cvcc: 'final blends (-mp/-nd/-st)',
          cvce: 'VCe (magic e: a_e/i_e/o_e/u_e)',
          vowel_team: 'vowel teams (ai/ay, ee/ea, oa/ow)',
          r_controlled: 'r-controlled vowels (ar/or/er/ir/ur)',
          welded: 'welded sounds (ang/ing/ong/ank/ink)',
          diphthong: 'diphthongs (oi/oy, ou/ow)',
          prefix: 'prefixes (re-/un-/pre-)',
          suffix: 'suffixes (-s/-ed/-ing)',
          multisyllable: 'syllable division (V/CV, VC/V)',
          all: 'mixed review'
        }),
        fundations: Object.freeze({
          cvc: 'closed syllables (CVC)',
          digraph: 'digraph spellings (sh/ch/th/wh)',
          ccvc: 'blend starters',
          cvcc: 'blend endings',
          cvce: 'VCe words (a_e/i_e/o_e/u_e)',
          vowel_team: 'vowel team spellings (ai/ay, ee/ea, oa/ow)',
          r_controlled: 'r-controlled spellings (ar/or/er/ir/ur)',
          welded: 'welded chunks (ang/ing/ong/ank/ink)',
          diphthong: 'diphthong spellings (oi/oy, ou/ow)',
          prefix: 'prefixes (re-/un-/pre-)',
          suffix: 'suffixes (-s/-ed/-ing)',
          multisyllable: 'syllable division (V/CV, VC/V)',
          all: 'mixed review'
        }),
        wilson: Object.freeze({
          cvc: 'closed syllable words (CVC)',
          digraph: 'digraph patterns (sh/ch/th/wh)',
          ccvc: 'blend openings (st-/bl-/tr-)',
          cvcc: 'blend endings (-mp/-nd/-st)',
          cvce: 'V-e syllable (a_e/i_e/o_e/u_e)',
          vowel_team: 'vowel team syllable (ai/ay, ee/ea, oa/ow)',
          r_controlled: 'r-controlled syllable (ar/or/er/ir/ur)',
          welded: 'welded sounds (ang/ing/ong/ank/ink)',
          diphthong: 'diphthong syllable (oi/oy, ou/ow)',
          prefix: 'prefix + base (re-/un-/pre-)',
          suffix: 'suffix + base (-s/-ed/-ing)',
          multisyllable: 'multisyllable decoding (V/CV, VC/V)',
          all: 'mixed review'
        })
      });
      const curated = curatedByPack[pack] || curatedByPack.ufli;
      return curated[focus] || focus.replaceAll('_', ' ');
    }
    const shortLabels = Object.freeze({
      cvc: 'cvc short vowels (CVC)',
      digraph: 'digraphs (sh/ch/th/wh)',
      ccvc: 'initial blends (st-/bl-/tr-)',
      cvcc: 'final blends (-mp/-nd/-st)',
      trigraph: 'trigraphs (tch/dge/igh)',
      cvce: 'magic e (a_e/i_e/o_e/u_e)',
      vowel_team: 'vowel teams (ai/ay, ee/ea, oa/ow)',
      r_controlled: 'r-controlled (ar/or/er/ir/ur)',
      diphthong: 'diphthongs (oi/oy, ou/ow)',
      welded: 'welded sounds (ang/ing/ong/ank/ink)',
      prefix: 'prefixes (re-/un-/pre-)',
      suffix: 'suffixes (-s/-ed/-ing)',
      multisyllable: 'multisyllable (V/CV, VC/V)',
      schwa: 'schwa (about/sofa)',
      floss: 'floss (-ff/-ll/-ss/-zz)'
    });
    return shortLabels[focus] || focus;
  }

  function formatCurriculumLessonLabel(entry) {
    const label = String(entry?.label || '').trim();
    if (!label || entry?.kind !== 'curriculum') return label;
    const packAbbrev = getCurriculumPackAbbrev(entry.packId);
    if (entry.packId === 'fundations') {
      const bonusMatch = label.match(/Fundations\s+Level\s+([A-Za-z0-9]+)\s+Bonus\s+Unit/i);
      if (bonusMatch) return `Level ${bonusMatch[1]} Bonus Unit`;
      const match = label.match(/Fundations\s+Level\s+([A-Za-z0-9]+)\s+Unit\s+([A-Za-z0-9]+)/i);
      if (match) return `Level ${match[1]} Unit ${match[2]}`;
      const compactMatch = label.match(/Fundations\s+L\.\s*([A-Za-z0-9]+)\s+U\.\s*([A-Za-z0-9]+)/i);
      if (compactMatch) return `Level ${compactMatch[1]} Unit ${compactMatch[2]}`;
      if (/^Fundations\b/i.test(label)) {
        const stripped = label.replace(/^Fundations\s*/i, '').trim();
        return stripped || 'Fundations Lesson';
      }
    }
    if (entry.packId === 'ufli') {
      const match = label.match(/Lesson\\s+(\\d+)/i);
      if (match) return `${packAbbrev || 'UFL'} L${match[1]}`;
    }
    if (entry.packId === 'wilson') {
      const mappedMatch = label.match(/Wilson\\s+Reading\\s+System\\s+([0-9]+(?:\\.[0-9]+)?)/i);
      if (mappedMatch) return `${packAbbrev || 'WRS'} ${mappedMatch[1]}`;
      const match = label.match(/Step\\s+(\\d+)\\s+Lesson\\s+(\\d+)/i);
      if (match) return `${packAbbrev || 'WRS'} S${match[1]} L${match[2]}`;
    }
    if (entry.packId === 'justwords') {
      const match = label.match(/Unit\\s+([A-Za-z0-9]+)/i);
      if (match) return `${packAbbrev || 'JW'} U${match[1]}`;
    }
    return packAbbrev ? `${packAbbrev} ${label}` : label;
  }

  function getCurriculumEntryMeta(entry) {
    if (!entry || entry.kind !== 'curriculum') return '';
    const cacheKey = String(entry.value || `${entry.packId || ''}::${entry.targetId || ''}`);
    if (curriculumEntryExampleCache.has(cacheKey)) return curriculumEntryExampleCache.get(cacheKey) || '';
    const target = getLessonTarget(entry.packId, entry.targetId);
    if (!target) return '';
    const examples = getCurriculumExampleWordsForTarget(target, cacheKey);
    const focusLabel = getCurriculumFocusChipLabel(target.focus, entry.packId);
    const packId = String(entry.packId || '').toLowerCase();
    const useCuratedPatternOnly = ['ufli', 'fundations', 'wilson'].includes(packId);
    const text = examples.length
      ? `${focusLabel} (${examples.join(', ')})`
      : (useCuratedPatternOnly ? focusLabel : '');
    curriculumEntryExampleCache.set(cacheKey, text);
    return text;
  }

  function getFocusEntryMeta(entry) {
    if (!entry) return '';
    if (entry.kind === 'curriculum-pack') {
      const count = Math.max(0, Number(entry.lessonCount) || 0);
      return count ? `${count} lessons` : 'Open lessons';
    }
    if (entry.kind === 'curriculum') return getCurriculumEntryMeta(entry);
    const focusHints = Object.freeze({
      cvc: 'short vowel sounds • cat, map',
      digraph: 'two letters, one sound • ship, chat',
      ccvc: 'blend at the start • stop, plan',
      cvcc: 'blend at the end • lamp, sand',
      trigraph: 'three-letter chunk • catch, light',
      cvce: 'silent e changes the vowel • cap→cape',
      vowel_team: 'two vowels team up • rain, boat',
      r_controlled: 'vowel sound changes before r • car, fern',
      diphthong: 'mouth glides between sounds • coin, cloud',
      floss: 'double f/l/s/z after short vowel • bell, miss',
      welded: 'glued chunks • ring, bank',
      schwa: 'lazy vowel /uh/ • about, sofa',
      prefix: 'add to the beginning • re+do',
      suffix: 'add to the end • jump+ed',
      compound: 'two words join • sun+set',
      multisyllable: 'clap the parts • nap-kin, con-test'
    });
    if (entry.kind === 'focus') {
      const preset = parseFocusPreset(entry.value);
      if (preset.kind === 'phonics') return focusHints[preset.focus] || '';
    }
    const preset = parseFocusPreset(entry.value);
    if (preset.kind === 'subject' && preset.gradeBand) return `Grade ${formatGradeBandLabel(preset.gradeBand)}`;
    return '';
  }

  function getSectionHeadingMarkup(text) {
    return `<div class="focus-search-heading" role="presentation">${escapeHtml(text)}</div>`;
  }

  function getCurriculumPackAbbrev(packId) {
    const id = String(packId || '').trim().toLowerCase();
    if (id === 'fundations') return 'FND';
    if (id === 'ufli') return 'UFL';
    if (id === 'wilson') return 'WRS';
    if (id === 'lexia') return 'LEX';
    if (id === 'justwords') return 'JW';
    return '';
  }

  function parseCurriculumNumbers(entry) {
    if (!entry || entry.kind !== 'curriculum') return null;
    const packId = String(entry.packId || '').trim().toLowerCase();
    const targetId = String(entry.targetId || '').trim().toLowerCase();
    const label = String(entry.label || '').trim();

    if (packId === 'fundations') {
      const rankLevelToken = (rawToken) => {
        const token = String(rawToken || '').trim().toUpperCase();
        if (token === 'K') return 0;
        const numeric = Number(token);
        return Number.isFinite(numeric) && numeric > 0 ? numeric : 999;
      };
      const idMatch = targetId.match(/fundations-l([a-z0-9]+)-u([a-z0-9]+)/i);
      if (idMatch) return { pack: 'fundations', level: rankLevelToken(idMatch[1]), unit: Number(idMatch[2]) || 0 };
      const levelUnitMatch = label.match(/level\s+([a-z0-9]+)\s+unit\s+([a-z0-9]+)/i);
      if (levelUnitMatch) return { pack: 'fundations', level: rankLevelToken(levelUnitMatch[1]), unit: Number(levelUnitMatch[2]) || 0 };
      const bonusMatch = label.match(/level\s+([a-z0-9]+)\s+bonus\s+unit/i);
      if (bonusMatch) return { pack: 'fundations', level: rankLevelToken(bonusMatch[1]), unit: 999 };
    }

    if (packId === 'ufli') {
      const idMatch = targetId.match(/ufli-lesson-(\d+)/i);
      if (idMatch) return { pack: 'ufli', lesson: Number(idMatch[1]) || 0 };
      const labelMatch = label.match(/lesson\s+(\d+)/i);
      if (labelMatch) return { pack: 'ufli', lesson: Number(labelMatch[1]) || 0 };
    }

    if (packId === 'wilson') {
      const stepLesson = targetId.match(/wilson-step-(\d+)-lesson-(\d+)/i);
      if (stepLesson) return { pack: 'wilson', step: Number(stepLesson[1]) || 0, lesson: Number(stepLesson[2]) || 0 };
      const labelMatch = label.match(/step\s+(\d+)\s+lesson\s+(\d+)/i);
      if (labelMatch) return { pack: 'wilson', step: Number(labelMatch[1]) || 0, lesson: Number(labelMatch[2]) || 0 };
    }

    if (packId === 'justwords') {
      const labelMatch = label.match(/unit\s+([0-9]+)/i);
      if (labelMatch) return { pack: 'justwords', unit: Number(labelMatch[1]) || 0 };
    }

    return null;
  }

  function compareCurriculumEntries(leftEntry, rightEntry) {
    if (!leftEntry || !rightEntry) return 0;
    const leftPack = String(leftEntry.packId || '').trim().toLowerCase();
    const rightPack = String(rightEntry.packId || '').trim().toLowerCase();
    if (leftPack !== rightPack) {
      return String(leftEntry.group || '').localeCompare(String(rightEntry.group || ''));
    }

    const leftParsed = parseCurriculumNumbers(leftEntry);
    const rightParsed = parseCurriculumNumbers(rightEntry);
    if (leftParsed && rightParsed) {
      if (leftParsed.pack === 'fundations' && rightParsed.pack === 'fundations') {
        const levelDiff = (leftParsed.level || 0) - (rightParsed.level || 0);
        if (levelDiff !== 0) return levelDiff;
        const unitDiff = (leftParsed.unit || 0) - (rightParsed.unit || 0);
        if (unitDiff !== 0) return unitDiff;
      }
      if (leftParsed.pack === 'ufli' && rightParsed.pack === 'ufli') {
        const diff = (leftParsed.lesson || 0) - (rightParsed.lesson || 0);
        if (diff !== 0) return diff;
      }
      if (leftParsed.pack === 'wilson' && rightParsed.pack === 'wilson') {
        const stepDiff = (leftParsed.step || 0) - (rightParsed.step || 0);
        if (stepDiff !== 0) return stepDiff;
        const lessonDiff = (leftParsed.lesson || 0) - (rightParsed.lesson || 0);
        if (lessonDiff !== 0) return lessonDiff;
      }
      if (leftParsed.pack === 'justwords' && rightParsed.pack === 'justwords') {
        const diff = (leftParsed.unit || 0) - (rightParsed.unit || 0);
        if (diff !== 0) return diff;
      }
    }

    return String(leftEntry.label || '').localeCompare(String(rightEntry.label || ''), undefined, { numeric: true, sensitivity: 'base' });
  }

  function renderFocusSectionItems(entries, activeQuestValue, activePack, activePackLabel) {
    return entries.map((entry) => {
      const questValue = entry.questValue || `focus::${entry.value}`;
      const isProgram = entry.kind === 'curriculum-pack';
      const isActive = isProgram
        ? (entry.packId === activePack || entry.packId === focusCurriculumPackFilter)
        : (questValue === activeQuestValue);
      const activeClass = isActive ? ' is-active' : '';
      const selected = isActive ? 'true' : 'false';
      const label = isProgram ? `${entry.label} · Choose Lesson` : formatCurriculumLessonLabel(entry);
      const meta = getFocusEntryMeta(entry);
      const scopeClass = isProgram ? ' is-program' : ' is-curriculum';
      const ariaLabel = isProgram
        ? `Open ${entry.label} lesson groups`
        : `${entry.group || activePackLabel} ${label}${meta ? ` ${meta}` : ''}`;
      return `<button type="button" class="focus-search-item${scopeClass}${activeClass}" data-quest-value="${escapeHtml(questValue)}" role="option" aria-selected="${selected}" aria-label="${escapeHtml(ariaLabel)}"><span>${escapeHtml(label)}</span>${meta ? `<small>${escapeHtml(meta)}</small>` : ''}</button>`;
    }).join('');
  }

  function buildFocusSearchSections(entries, options = {}) {
    const query = String(options.query || '').trim();
    const sectionOrder = Object.freeze(['phonics', 'curriculum', 'subjects']);
    const sections = {
      phonics: [],
      subjects: [],
      curriculum: []
    };
    entries.forEach((entry) => {
      const key = getFocusEntrySectionKey(entry);
      if (!sections[key]) return;
      sections[key].push(entry);
    });

    sections.phonics.sort((a, b) => String(a.label || '').localeCompare(String(b.label || '')));
    sections.subjects.sort((a, b) => {
      const left = parseFocusPreset(a.value);
      const right = parseFocusPreset(b.value);
      const rankDiff = getGradeBandRank(left.gradeBand) - getGradeBandRank(right.gradeBand);
      if (rankDiff !== 0) return rankDiff;
      return String(a.label || '').localeCompare(String(b.label || ''));
    });
    sections.curriculum.sort((a, b) => {
      if (a.kind === 'curriculum-pack' && b.kind !== 'curriculum-pack') return -1;
      if (a.kind !== 'curriculum-pack' && b.kind === 'curriculum-pack') return 1;
      if (a.kind === 'curriculum' && b.kind === 'curriculum') {
        return compareCurriculumEntries(a, b);
      }
      return String(a.label || '').localeCompare(String(b.label || ''), undefined, { numeric: true, sensitivity: 'base' });
    });

    const output = [];
    sectionOrder.forEach((key) => {
      const rows = sections[key];
      if (!rows.length) return;
      if (key === 'phonics') {
        output.push({ heading: 'Phonics Skills', entries: rows });
        return;
      }
      if (key === 'curriculum' && !query) {
        output.push({ heading: 'Curriculum', entries: rows });
        return;
      }
      if (key === 'curriculum') {
        output.push({ heading: 'Curriculum Matches', entries: rows });
        return;
      }
      output.push({ heading: 'Grade Band Subjects', entries: rows });
    });
    return output;
  }

  function renderFocusSearchList(rawQuery = '', options = {}) {
    const listEl = _el('focus-inline-results');
    const inputEl = _el('focus-inline-search');
    if (!listEl) return;
    const userInitiated = options && options.userInitiated === true;
    if (!userInitiated && Date.now() < focusSearchReopenGuardUntil) {
      closeFocusSearchList();
      return;
    }
    const query = String(rawQuery || '').trim().toLowerCase();
    const isCurriculumLessonListMode = !query && Boolean(focusCurriculumPackFilter);
    const isFundationsLessonMode = isCurriculumLessonListMode && focusCurriculumPackFilter === 'fundations';
    listEl.classList.toggle('is-curriculum-list', isCurriculumLessonListMode);
    listEl.classList.toggle('is-fundations-grid', isFundationsLessonMode);
    const selectedGradeBand = getQuestFilterGradeBand();
    const focusEntries = getFocusEntries(selectedGradeBand);
    const curriculumProgramEntries = getCurriculumProgramEntries(selectedGradeBand);
    if (
      focusCurriculumPackFilter &&
      !curriculumProgramEntries.some((entry) => entry.packId === focusCurriculumPackFilter)
    ) {
      focusCurriculumPackFilter = '';
    }
    const curriculumLessonEntries = getCurriculumQuestEntries(focusCurriculumPackFilter, selectedGradeBand);
    const entries = getQuestEntries(selectedGradeBand);
    if (!entries.length) {
      listEl.innerHTML = '<div class="focus-search-empty">Focus options are loading...</div>';
      listEl.classList.remove('hidden');
      if (inputEl) inputEl.setAttribute('aria-expanded', 'true');
      setFocusSearchOpen(true);
      focusNavIndex = -1;
      if (inputEl) inputEl.removeAttribute('aria-activedescendant');
      return;
    }

    let visible = [];
    const shouldResetScroll = !query;
    if (!query) {
      if (focusCurriculumPackFilter) {
        visible = curriculumLessonEntries;
      } else {
        const phonicsEntries = focusEntries.filter((entry) => {
          if (entry.value === 'all') return false;
          return parseFocusPreset(entry.value).kind === 'phonics';
        });
        const subjectEntries = focusEntries.filter((entry) => parseFocusPreset(entry.value).kind === 'subject');
        visible = [
          ...phonicsEntries,
          ...subjectEntries,
          ...curriculumProgramEntries
        ].slice(0, FOCUS_EMPTY_VISIBLE_LIMIT);
      }
    } else {
      visible = getRankedFocusMatches(entries, query);
    }

    if (!visible.length) {
      listEl.innerHTML = '<div class="focus-search-empty">No matches yet. Try <b>short vowels</b>, <b>magic e</b>, <b>vowel teams</b>, <b>digraphs</b>, or <b>blends</b>.</div>';
      listEl.classList.remove('hidden');
      if (inputEl) inputEl.setAttribute('aria-expanded', 'true');
      setFocusSearchOpen(true);
      focusNavIndex = -1;
      if (inputEl) inputEl.removeAttribute('aria-activedescendant');
      return;
    }

    const activeFocus = _el('setting-focus')?.value || 'all';
    const activePack = normalizeLessonPackId(prefs.lessonPack || _el('s-lesson-pack')?.value || DEFAULT_PREFS.lessonPack);
    const activeTarget = normalizeLessonTargetId(
      activePack,
      prefs.lessonTarget || _el('s-lesson-target')?.value || DEFAULT_PREFS.lessonTarget
    );
    const activeQuestValue = (activePack !== 'custom' && activeTarget !== 'custom')
      ? `curriculum::${activePack}::${activeTarget}`
      : `focus::${activeFocus}`;
    const activePackLabel = getLessonPackDefinition(activePack).label;
    const actions = [];
    if (!query && focusCurriculumPackFilter) {
      const packLabel = getLessonPackDefinition(focusCurriculumPackFilter).label;
      actions.push(
        `<div class="focus-search-topbar">` +
          `<button type="button" class="focus-search-back-mini" data-focus-action="curriculum-back" aria-label="Back to program list" title="Back to program list">←</button>` +
          `<div class="focus-search-pack-title">${escapeHtml(packLabel)}</div>` +
        `</div>`
      );
    }
    const guidance = !query
      ? focusCurriculumPackFilter
        ? ''
        : '<div class="focus-search-empty focus-search-empty-hint">Choose a phonics skill to see the sound pattern and example words, or choose a curriculum/grade-band subject program.</div>'
      : '';
    const sections = buildFocusSearchSections(visible, { query });
    const sectionMarkup = sections.map((section) => {
      if (section.heading === 'Curriculum' || section.heading === 'Curriculum Matches') {
        const curriculumRows = section.entries;
        const programRows = curriculumRows.filter((entry) => entry.kind === 'curriculum-pack');
        const lessonRows = curriculumRows.filter((entry) => entry.kind === 'curriculum');
        const groupedLessons = lessonRows.reduce((map, entry) => {
          const key = String(entry.group || 'Curriculum').trim();
          if (!map[key]) map[key] = [];
          map[key].push(entry);
          return map;
        }, Object.create(null));
        const orderedPacks = ['UFLI', 'Fundations', 'Wilson Reading System', 'Lexia English (WIDA)', 'Just Words'];
        const lessonBlocks = orderedPacks
          .filter((packLabel) => Array.isArray(groupedLessons[packLabel]) && groupedLessons[packLabel].length)
          .map((packLabel) => {
            groupedLessons[packLabel].sort(compareCurriculumEntries);
            return `<div class="focus-search-subheading" role="presentation">${escapeHtml(packLabel)}</div>` +
              renderFocusSectionItems(groupedLessons[packLabel], activeQuestValue, activePack, activePackLabel);
          });
        Object.keys(groupedLessons)
          .filter((packLabel) => !orderedPacks.includes(packLabel))
          .sort((a, b) => a.localeCompare(b))
          .forEach((packLabel) => {
            groupedLessons[packLabel].sort(compareCurriculumEntries);
            lessonBlocks.push(
              `<div class="focus-search-subheading" role="presentation">${escapeHtml(packLabel)}</div>` +
              renderFocusSectionItems(groupedLessons[packLabel], activeQuestValue, activePack, activePackLabel)
            );
          });
        const includeCurriculumHeading = !(isCurriculumLessonListMode && !query);
        return `${includeCurriculumHeading ? getSectionHeadingMarkup(section.heading) : ''}` +
          renderFocusSectionItems(programRows, activeQuestValue, activePack, activePackLabel) +
          lessonBlocks.join('');
      }
      return getSectionHeadingMarkup(section.heading) +
        renderFocusSectionItems(section.entries, activeQuestValue, activePack, activePackLabel);
    }).join('');
    listEl.innerHTML = actions.join('') + guidance + sectionMarkup;
    if (shouldResetScroll) listEl.scrollTop = 0;
    getFocusSearchButtons().forEach((button, idx) => {
      button.id = `focus-search-option-${idx}`;
      button.classList.remove('is-nav-active');
    });
    focusNavIndex = -1;
    if (inputEl) inputEl.removeAttribute('aria-activedescendant');
    listEl.classList.remove('hidden');
    if (inputEl) inputEl.setAttribute('aria-expanded', 'true');
    setFocusSearchOpen(true);
  }

  function closeFocusSearchList() {
    const list = _el('focus-inline-results');
    const inputEl = _el('focus-inline-search');
    if (!list) return;
    focusCurriculumPackFilter = '';
    focusNavIndex = -1;
    if (inputEl) inputEl.removeAttribute('aria-activedescendant');
    if (inputEl) inputEl.setAttribute('aria-expanded', 'false');
    list.classList.remove('is-curriculum-list');
    list.classList.add('hidden');
    setFocusSearchOpen(false);
  }

  function setFocusValue(nextValue, options = {}) {
    if (isAssessmentRoundLocked() && !options.force) {
      showAssessmentLockNotice('Assessment lock is on. Focus changes unlock after this round.');
      closeFocusSearchList();
      return;
    }
    const select = _el('setting-focus');
    if (!select) return;
    const target = String(nextValue || '').trim();
    if (!target) return;
    const exists = Array.from(select.options).some((option) => option.value === target);
    if (!exists) return;
    if (select.value === target) {
      updateFocusSummaryLabel();
      closeFocusSearchList();
      if (options.startNewWord) newGame();
      return;
    }
    select.value = target;
    select.dispatchEvent(new Event('change', { bubbles: true }));
    if (options.toast) {
      WQUI.showToast(`Focus set: ${getFocusLabel(target)}.`);
    }
    closeFocusSearchList();
    if (options.startNewWord) newGame();
  }

  function setQuestValue(nextValue, options = {}) {
    const raw = String(nextValue || '').trim();
    if (!raw) return;
    if (raw.startsWith('curriculum-pack::')) {
      const [, packRaw = 'custom'] = raw.split('::');
      const packId = normalizeLessonPackId(packRaw);
      if (packId === 'custom') return;
      emitTelemetry('wq_funnel_quest_select', {
        source: 'focus_search',
        selection_type: 'curriculum_pack',
        lesson_pack_id: packId
      });
      focusCurriculumPackFilter = packId;
      const inputEl = _el('focus-inline-search');
      if (inputEl) {
        const packLabel = getLessonPackDefinition(packId).label;
        inputEl.value = packLabel;
        inputEl.dataset.lockedLabel = packLabel.toLowerCase();
      }
      renderFocusSearchList('', { userInitiated: true });
      return;
    }
    if (raw.startsWith('curriculum::')) {
      if (isAssessmentRoundLocked() && !options.force) {
        showAssessmentLockNotice('Assessment lock is on. Curriculum changes unlock after this round.');
        closeFocusSearchList();
        return;
      }
      const [, packRaw = 'custom', targetRaw = 'custom'] = raw.split('::');
      const packId = normalizeLessonPackId(packRaw);
      const targetId = normalizeLessonTargetId(packId, targetRaw);
      if (packId === 'custom') {
        handleLessonPackSelectionChange('custom');
        updateFocusSummaryLabel();
        closeFocusSearchList();
        if (options.startNewWord) newGame();
        return;
      }
      handleLessonPackSelectionChange(packId);
      handleLessonTargetSelectionChange(targetId);
      emitTelemetry('wq_funnel_quest_select', {
        source: 'focus_search',
        selection_type: 'curriculum',
        lesson_pack_id: packId,
        lesson_target_id: targetId
      });
      if (options.toast) {
        const pack = getLessonPackDefinition(packId);
        const target = getLessonTarget(packId, targetId);
        if (target) WQUI.showToast(`Track set: ${pack.label} · ${target.label}.`);
      }
      updateFocusSummaryLabel();
      closeFocusSearchList();
      if (options.startNewWord) newGame();
      return;
    }
    const focusValue = raw.startsWith('focus::') ? raw.slice('focus::'.length) : raw;
    emitTelemetry('wq_funnel_quest_select', {
      source: 'focus_search',
      selection_type: 'focus',
      focus_id: focusValue
    });
    setFocusValue(focusValue, options);
  }

  const SUBJECT_TAG_ALIASES = Object.freeze({
    math: new Set(['math', 'mathematics', 'algebra', 'geometry', 'statistics', 'calculus', 'trigonometry', 'trig']),
    science: new Set(['science', 'sci', 'biology', 'bio', 'chemistry', 'physics', 'earth sci', 'earth science', 'anatomy', 'med', 'engineering']),
    social: new Set(['ss', 'social studies', 'history', 'hist', 'civics', 'govt', 'government', 'geo', 'geography', 'econ', 'economics', 'law', 'bus']),
    ela: new Set(['ela', 'language arts', 'reading', 'writing', 'literacy', 'english', 'eng'])
  });

  function normalizeSubjectTag(rawTag) {
    const normalized = String(rawTag || '')
      .trim()
      .toLowerCase()
      .replace(/^"+|"+$/g, '')
      .replace(/\s+/g, ' ');
    if (!normalized) return '';
    if (normalized.length > 24) return '';
    if (!/^[a-z0-9/&+\- ]+$/.test(normalized)) return '';
    return normalized;
  }

  const subjectTagsByWord = new Map();
  const playableWordsFromRaw = new Set();
  if (window.WQ_WORD_DATA && typeof window.WQ_WORD_DATA === 'object') {
    Object.values(window.WQ_WORD_DATA).forEach((raw) => {
      const word = String(raw?.display_word || '').trim().toLowerCase();
      if (!word) return;
      if ((raw?.game_tag || 'playable') === 'playable') playableWordsFromRaw.add(word);
      const rawTags = raw?.instructional_paths?.subject_tags;
      const tags = (Array.isArray(rawTags) ? rawTags : [rawTags])
        .filter(Boolean)
        .flatMap((tag) => String(tag).split(','))
        .map(normalizeSubjectTag)
        .filter(Boolean);
      if (!tags.length) return;
      const prior = subjectTagsByWord.get(word) || [];
      subjectTagsByWord.set(word, Array.from(new Set([...prior, ...tags])));
    });
  }

  const SUBJECT_WORD_OVERRIDES = Object.freeze({
    oxide: Object.freeze(['science', 'math']),
    oxidize: Object.freeze(['science', 'math'])
  });

  function matchesSubjectFocus(word, subject) {
    const normalizedWord = String(word || '').trim().toLowerCase();
    const overrideSubjects = SUBJECT_WORD_OVERRIDES[normalizedWord];
    if (Array.isArray(overrideSubjects) && overrideSubjects.includes(subject)) return true;
    const tags = subjectTagsByWord.get(normalizedWord) || [];
    if (!tags.length) return false;
    const aliasSet = SUBJECT_TAG_ALIASES[subject];
    if (!aliasSet) return false;
    return tags.some((tag) => aliasSet.has(tag));
  }

  function matchesPhonicsFocus(phonicsValue, focus, word) {
    const phonics = String(phonicsValue || '').toLowerCase();

    const hasPrefix = typeof word === 'string' && /^(un|re|pre|dis|mis|non|sub|inter|trans|over|under|anti|de)/.test(word);
    const hasSuffix = typeof word === 'string' && /(ing|ed|er|est|ly|tion|sion|ment|ness|less|ful|able|ible|ous|ive|al|y)$/.test(word);
    const isLikelyCompound = (() => {
      if (typeof word !== 'string' || word.length < 6 || !playableWordsFromRaw.size) return false;
      for (let i = 3; i <= word.length - 3; i += 1) {
        const left = word.slice(0, i);
        const right = word.slice(i);
        if (playableWordsFromRaw.has(left) && playableWordsFromRaw.has(right)) return true;
      }
      return false;
    })();

    switch (focus) {
      case 'cvc': return /\bcvc\b|closed/.test(phonics);
      case 'digraph': return /digraph|sh|ch|th|wh|ph/.test(phonics);
      case 'ccvc': return /\bccvc\b|initial blend|blend/.test(phonics);
      case 'cvcc': return /\bcvcc\b|final blend|blend/.test(phonics);
      case 'trigraph': return /trigraph|tch|dge|igh/.test(phonics);
      case 'cvce': return /silent e|magic e|cvce|vce/.test(phonics);
      case 'vowel_team': return /vowel team/.test(phonics);
      case 'r_controlled': return /r-controlled|r controlled|\(ar\)|\(or\)|\(er\)|\(ir\)|\(ur\)/.test(phonics);
      case 'diphthong': return /diphthong/.test(phonics);
      case 'floss': return /floss/.test(phonics);
      case 'welded': return /welded/.test(phonics);
      case 'schwa': return /schwa/.test(phonics);
      case 'prefix': return /prefix/.test(phonics) || hasPrefix;
      case 'suffix': return /suffix/.test(phonics) || hasSuffix;
      case 'compound': return /compound/.test(phonics) || isLikelyCompound;
      case 'multisyllable': return /multi|syllab/.test(phonics);
      default: return focus === 'all' ? true : phonics.includes(focus);
    }
  }

  if (!WQData.__focusPatchApplied) {
    const originalGetPlayableWords = WQData.getPlayableWords.bind(WQData);
    WQData.getPlayableWords = function getPlayableWordsWithFocus(opts = {}) {
      const focusValue = opts.focus || opts.phonics || 'all';
      const preset = parseFocusPreset(focusValue);
      const requestedGradeBand = preset.kind === 'subject' ? preset.gradeBand : opts.gradeBand;
      const effectiveGradeBand = getEffectiveGameplayGradeBand(requestedGradeBand, focusValue);
      const includeLowerBands = preset.kind === 'phonics'
        ? (opts.includeLowerBands !== false)
        : false;
      const basePool = originalGetPlayableWords({
        gradeBand: effectiveGradeBand || SAFE_DEFAULT_GRADE_BAND,
        length: opts.length,
        phonics: 'all',
        includeLowerBands
      });

      if (preset.kind === 'classic') return basePool;
      if (preset.kind === 'subject') {
        return basePool.filter((word) => matchesSubjectFocus(word, preset.subject));
      }
      return basePool.filter((word) => {
        const entry = WQData.getEntry(word);
        return matchesPhonicsFocus(entry?.phonics, preset.focus, word);
      });
    };
    WQData.__focusPatchApplied = true;
  }

  _el('setting-focus')?.addEventListener('change', (event) => {
    const focus = event.target?.value || 'all';
    setPref('focus', focus);
    releaseLessonPackToManualMode();
    syncLengthFromFocus(focus, { silent: lessonPackApplying });
    syncGradeFromFocus(focus, { silent: lessonPackApplying });
    updateFocusHint();
    updateFocusGradeNote();
    updateFocusSummaryLabel();
    syncChunkTabsVisibility();
    refreshStandaloneMissionLabHub();
    closeFocusSearchList();
  });

  _el('focus-inline-search')?.addEventListener('focus', (event) => {
    if (DEMO_MODE) {
      event.preventDefault();
      closeAllOverlaysForDemo();
      event.target.blur();
      return;
    }
    if (isAssessmentRoundLocked()) {
      showAssessmentLockNotice('Assessment lock is on. Focus changes unlock after this round.');
      closeFocusSearchList();
      event.target.blur();
      return;
    }
    clearPinnedFocusSearchValue(event.target);
    // Keep closed on passive focus; open on explicit click or typing.
  });

  _el('focus-inline-search')?.addEventListener('click', (event) => {
    if (DEMO_MODE) {
      event.preventDefault();
      closeAllOverlaysForDemo();
      return;
    }
    if (isAssessmentRoundLocked()) {
      showAssessmentLockNotice('Assessment lock is on. Focus changes unlock after this round.');
      closeFocusSearchList();
      return;
    }
    clearPinnedFocusSearchValue(event.target);
    const query = String(event.target?.value || '').trim();
    renderFocusSearchList(query, { userInitiated: true });
  });

  _el('focus-inline-search')?.addEventListener('input', (event) => {
    if (DEMO_MODE) {
      event.preventDefault();
      closeAllOverlaysForDemo();
      return;
    }
    if (isAssessmentRoundLocked()) {
      closeFocusSearchList();
      return;
    }
    clearPinnedFocusSearchValue(event.target);
    const query = String(event.target?.value || '').trim();
    renderFocusSearchList(query, { userInitiated: true });
  });

  _el('focus-inline-search')?.addEventListener('keydown', (event) => {
    if (DEMO_MODE) {
      event.preventDefault();
      event.stopPropagation();
      closeAllOverlaysForDemo();
      return;
    }
    if (isAssessmentRoundLocked()) {
      if (event.key === 'Enter' || event.key === ' ') {
        showAssessmentLockNotice('Assessment lock is on. Focus changes unlock after this round.');
      }
      event.stopPropagation();
      event.preventDefault();
      return;
    }
    clearPinnedFocusSearchValue(event.target);
    // Prevent global game key handler from capturing focus-search typing.
    event.stopPropagation();
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp' || event.key === 'Home' || event.key === 'End') {
      const query = String(event.target?.value || '').trim();
      const listEl = _el('focus-inline-results');
      if (listEl?.classList.contains('hidden')) {
        renderFocusSearchList(query, { userInitiated: true });
      }
      const buttons = getFocusSearchButtons();
      if (!buttons.length) return;
      if (event.key === 'Home') {
        setFocusNavIndex(0);
      } else if (event.key === 'End') {
        setFocusNavIndex(buttons.length - 1);
      } else if (event.key === 'ArrowDown') {
        const nextIndex = focusNavIndex < 0 ? 0 : (focusNavIndex + 1) % buttons.length;
        setFocusNavIndex(nextIndex);
      } else if (event.key === 'ArrowUp') {
        const nextIndex = focusNavIndex < 0 ? buttons.length - 1 : (focusNavIndex - 1 + buttons.length) % buttons.length;
        setFocusNavIndex(nextIndex);
      }
      event.preventDefault();
      return;
    }
    if (event.key === 'Escape') {
      closeFocusSearchList();
      updateFocusSummaryLabel();
      event.target.blur();
      return;
    }
    if (event.key !== 'Enter') return;
    const buttons = getFocusSearchButtons();
    if (!buttons.length) return;
    const chosen = focusNavIndex >= 0 ? buttons[focusNavIndex] : buttons[0];
    setQuestValue(chosen.getAttribute('data-quest-value'), { startNewWord: true });
    updateFocusSummaryLabel();
    event.preventDefault();
  });

  _el('focus-inline-results')?.addEventListener('click', (event) => {
    if (DEMO_MODE) {
      event.preventDefault();
      event.stopPropagation();
      closeAllOverlaysForDemo();
      return;
    }
    if (isAssessmentRoundLocked()) {
      showAssessmentLockNotice('Assessment lock is on. Focus changes unlock after this round.');
      closeFocusSearchList();
      return;
    }
    const action = event.target?.closest?.('[data-focus-action]');
    if (action) {
      const actionId = String(action.getAttribute('data-focus-action') || '').trim().toLowerCase();
      if (actionId === 'teacher-words') {
        openTeacherWordTools();
      } else if (actionId === 'curriculum-back') {
        focusCurriculumPackFilter = '';
        const inputEl = _el('focus-inline-search');
        if (inputEl) {
          inputEl.value = '';
          inputEl.dataset.lockedLabel = '';
        }
        renderFocusSearchList('', { userInitiated: true });
      }
      return;
    }
    const button = event.target?.closest?.('[data-quest-value]');
    if (!button) return;
    const value = button.getAttribute('data-quest-value');
    setQuestValue(value, { startNewWord: true });
    updateFocusSummaryLabel();
  });

  const initialLessonPackState = syncLessonPackControlsFromPrefs();
  if (initialLessonPackState.packId !== 'custom' && initialLessonPackState.targetId !== 'custom') {
    applyLessonTargetConfig(initialLessonPackState.packId, initialLessonPackState.targetId);
  }
  syncGradeFromFocus(_el('setting-focus')?.value || prefs.focus || 'all', { silent: true });
  enforceFocusSelectionForGrade(_el('s-grade')?.value || prefs.grade || DEFAULT_PREFS.grade, { toast: false });
  enforceClassicFiveLetterDefault();
  applyAllGradeLengthDefault();
  updateFocusHint();
  updateFocusGradeNote();
  syncChunkTabsVisibility();
  updateFocusSummaryLabel();
  closeFocusSearchList();

  // ─── 7. New game ────────────────────────────────────
  const MIDGAME_BOOST_KEY = 'wq_v2_midgame_boost_state_v1';
  const MIDGAME_BOOST_TRIGGER_GUESS = 3;
  const MIDGAME_BOOST_FALLBACK = Object.freeze([
    Object.freeze({ type: 'fact', text: 'Your brain gets stronger when you keep trying.' }),
    Object.freeze({ type: 'joke', text: 'What is a spelling bee\'s favorite snack? Letter chips.' }),
    Object.freeze({ type: 'quote', text: 'Progress is built one guess at a time.' }),
    Object.freeze({ type: 'fact', text: 'Guess three is where pattern recognition usually clicks.' }),
    Object.freeze({ type: 'joke', text: 'Why did the clue smile? It knew you would solve it.' }),
    Object.freeze({ type: 'quote', text: 'Effort now becomes confidence later.' })
  ]);
  const MIDGAME_BOOST_POOL = (() => {
    const raw = Array.isArray(window.WQ_ENGAGEMENT_BOOSTS) ? window.WQ_ENGAGEMENT_BOOSTS : [];
    const cleaned = raw
      .map((item) => ({
        type: String(item?.type || 'fact').toLowerCase(),
        text: String(item?.text || '').trim()
      }))
      .filter((item) => item.text.length > 0)
      .map((item) => ({
        type: ['joke', 'fact', 'quote'].includes(item.type) ? item.type : 'fact',
        text: item.text
      }));

    if (!cleaned.length) return MIDGAME_BOOST_FALLBACK;
    return Object.freeze(cleaned.map((item) => Object.freeze(item)));
  })();
  let midgameBoostShown = false;
  let midgameBoostAutoHideTimer = 0;

  function clearMidgameBoostAutoHideTimer() {
    if (!midgameBoostAutoHideTimer) return;
    clearTimeout(midgameBoostAutoHideTimer);
    midgameBoostAutoHideTimer = 0;
  }

  function buildMidgameBoostState() {
    const order = Array.from({ length: MIDGAME_BOOST_POOL.length }, (_, index) => index);
    for (let i = order.length - 1; i > 0; i -= 1) {
      const j = Math.floor(Math.random() * (i + 1));
      [order[i], order[j]] = [order[j], order[i]];
    }
    return { order, cursor: 0 };
  }

  function loadMidgameBoostState() {
    try {
      const parsed = JSON.parse(localStorage.getItem(MIDGAME_BOOST_KEY) || 'null');
      if (!parsed || !Array.isArray(parsed.order) || !Number.isInteger(parsed.cursor)) {
        return buildMidgameBoostState();
      }
      const validOrder = parsed.order.every(
        (value) => Number.isInteger(value) && value >= 0 && value < MIDGAME_BOOST_POOL.length
      );
      if (!validOrder || parsed.order.length !== MIDGAME_BOOST_POOL.length) {
        return buildMidgameBoostState();
      }
      return parsed;
    } catch {
      return buildMidgameBoostState();
    }
  }

  function saveMidgameBoostState(state) {
    try {
      localStorage.setItem(MIDGAME_BOOST_KEY, JSON.stringify(state));
    } catch {}
  }

  function nextMidgameBoostCard() {
    let state = loadMidgameBoostState();
    if (state.cursor >= state.order.length) {
      state = buildMidgameBoostState();
    }
    const idx = state.order[state.cursor];
    state.cursor += 1;
    saveMidgameBoostState(state);
    return MIDGAME_BOOST_POOL[idx] || null;
  }

  function hideMidgameBoost() {
    const boost = _el('midgame-boost');
    if (!boost) return;
    clearMidgameBoostAutoHideTimer();
    boost.classList.remove('is-visible');
    if (!boost.classList.contains('hidden')) {
      setTimeout(() => {
        boost.classList.add('hidden');
        boost.innerHTML = '';
      }, 180);
    }
  }

  function splitBoostQuestionAndAnswer(type, text) {
    const cleaned = String(text || '').replace(/\s+/g, ' ').trim();
    if (!cleaned) return { question: '', answer: '' };
    if (type !== 'joke') return { question: cleaned, answer: '' };
    const questionEnd = cleaned.indexOf('?');
    if (questionEnd > -1 && questionEnd < cleaned.length - 1) {
      return {
        question: cleaned.slice(0, questionEnd + 1).trim(),
        answer: cleaned.slice(questionEnd + 1).trim().replace(/^[\-–—:]+\s*/, '')
      };
    }
    return { question: cleaned, answer: '' };
  }

  function shouldKeepMidgameBoostOpen(target) {
    const node = target instanceof Element ? target : null;
    if (!node) return false;
    return Boolean(
      node.closest(
        '#keyboard, #game-board, .board-plate, .gameplay-audio, #new-game-btn, #focus-inline-wrap, #settings-btn'
      )
    );
  }

  function showMidgameBoost() {
    if (!MIDGAME_BOOST_ENABLED) return;
    if (!areBoostPopupsEnabled()) return;
    if (isAssessmentRoundLocked()) return;
    const boost = _el('midgame-boost');
    if (!boost) return;
    clearMidgameBoostAutoHideTimer();
    const card = nextMidgameBoostCard();
    if (!card) return;
    const content = splitBoostQuestionAndAnswer(card.type, card.text);
    const isQnA = card.type === 'joke' && Boolean(content.answer);
    const isRiddle = isQnA && content.question.includes('?');
    const hasAnswer = isQnA;
    const label =
      card.type === 'quote'
        ? '💡 Coach Tip'
        : card.type === 'joke'
          ? (isRiddle ? '🧩 Riddle' : '😄 Joke')
          : '🕵️ Fun Fact';
    const mascot =
      card.type === 'quote'
        ? '🧠'
        : card.type === 'joke'
          ? (isRiddle ? '🕵️' : '😄')
          : '🛰️';
    const tickerText = hasAnswer
      ? `${label}: ${content.question} Tap Clue Peek to reveal the answer.`
      : `${label}: ${content.question}`;
    const tickerClass = tickerText.length < 84
      ? 'midgame-boost-ticker is-static'
      : 'midgame-boost-ticker';
    boost.innerHTML = `
      <button type="button" class="midgame-boost-peek" aria-expanded="true" aria-label="Toggle clue peek">
        <span class="midgame-boost-peek-dot" aria-hidden="true"></span>
        Clue Peek
      </button>
      <div class="midgame-boost-bubble">
        <span class="midgame-boost-mascot" aria-hidden="true">${mascot}</span>
        <button type="button" class="midgame-boost-close" aria-label="Close clue bubble">✕</button>
        <span class="midgame-boost-tag">${label}</span>
        <p class="midgame-boost-question">${escapeHtml(content.question)}</p>
        ${hasAnswer ? '<button type="button" class="midgame-boost-answer-btn">Reveal answer</button><p class="midgame-boost-answer hidden"></p>' : ''}
        <div class="midgame-boost-actions">
          <button type="button" class="midgame-boost-action midgame-boost-turn-off">Turn off popups</button>
        </div>
      </div>
      <div class="${tickerClass}" aria-live="polite">
        <div class="midgame-boost-ticker-track">
          <span>${escapeHtml(tickerText)}</span>
        </div>
      </div>
    `;
    const peekBtn = boost.querySelector('.midgame-boost-peek');
    const bubble = boost.querySelector('.midgame-boost-bubble');
    const closeBubble = () => {
      if (!bubble) return;
      bubble.classList.add('hidden');
      peekBtn?.setAttribute('aria-expanded', 'false');
    };
    const answerEl = boost.querySelector('.midgame-boost-answer');
    const answerBtn = boost.querySelector('.midgame-boost-answer-btn');
    if (answerEl) answerEl.textContent = content.answer;
    peekBtn?.addEventListener('click', () => {
      if (!bubble) return;
      const reveal = bubble.classList.contains('hidden');
      bubble.classList.toggle('hidden', !reveal);
      peekBtn.setAttribute('aria-expanded', reveal ? 'true' : 'false');
    });
    answerBtn?.addEventListener('click', () => {
      if (!answerEl) return;
      const reveal = answerEl.classList.contains('hidden');
      answerEl.classList.toggle('hidden', !reveal);
      answerBtn.textContent = reveal ? 'Hide answer' : 'Reveal answer';
    });
    boost.querySelector('.midgame-boost-close')?.addEventListener('click', closeBubble);
    boost.querySelector('.midgame-boost-turn-off')?.addEventListener('click', () => {
      const select = _el('s-boost-popups');
      if (select) select.value = 'off';
      setPref('boostPopups', 'off');
      hideMidgameBoost();
      WQUI.showToast('Engagement popups are off. Turn them back on in Settings.');
    });
    boost.classList.remove('hidden');
    requestAnimationFrame(() => boost.classList.add('is-visible'));
  }

  const ERROR_PATTERN_LABELS = Object.freeze({
    vowel_pattern: 'Vowel Pattern',
    blend_position: 'Blend Position',
    morpheme_ending: 'Morpheme Ending',
    context_strategy: 'Clue Strategy'
  });

  const ERROR_COACH_COPY = Object.freeze({
    vowel_pattern: 'Coach: check the vowel pattern first (short, team, or r-controlled).',
    blend_position: 'Coach: you have useful letters; adjust their positions and blends.',
    morpheme_ending: 'Coach: re-check the ending chunk (-ed, -ing, suffixes).',
    context_strategy: 'Coach: use the sentence clue to narrow meaning and part of speech.'
  });

  const ERROR_NEXT_STEP_COPY = Object.freeze({
    vowel_pattern: 'Re-teach vowel pattern contrast (short vs team vs r-controlled) with 6-word sorts.',
    blend_position: 'Run onset/rime blend mapping and left-to-right tracking with 5 guided words.',
    morpheme_ending: 'Practice suffix-ending checks (-ed/-ing/-s) with chunk tap + dictation.',
    context_strategy: 'Model clue-to-meaning strategy: identify part of speech, then confirm spelling.'
  });

  const ERROR_MINI_LESSON_PLANS = Object.freeze({
    vowel_pattern: Object.freeze([
      '1. Warm-up (1 min): sort 6 words by vowel pattern (short, team, r-controlled).',
      '2. Guided practice (3 min): read and spell 4 target words; underline vowel chunk.',
      '3. Transfer (1 min): use one target word in a spoken sentence clue.'
    ]),
    blend_position: Object.freeze([
      '1. Warm-up (1 min): tap onset and rime on 5 words.',
      '2. Guided practice (3 min): map 4 words left-to-right and correct blend placement.',
      '3. Transfer (1 min): timed readback with one self-correction.'
    ]),
    morpheme_ending: Object.freeze([
      '1. Warm-up (1 min): quick sort by ending (-ed, -ing, -s, suffix).',
      '2. Guided practice (3 min): chunk and spell 4 words; circle ending morpheme.',
      '3. Transfer (1 min): dictate one word and explain ending choice.'
    ]),
    context_strategy: Object.freeze([
      '1. Warm-up (1 min): identify part of speech from clue sentence.',
      '2. Guided practice (3 min): predict 3 candidate words, then verify spelling.',
      '3. Transfer (1 min): student writes one new clue for a practiced word.'
    ])
  });

  function normalizeCounterMap(raw) {
    const map = Object.create(null);
    if (!raw || typeof raw !== 'object') return map;
    Object.entries(raw).forEach(([key, value]) => {
      const normalizedKey = String(key || '').trim().toLowerCase();
      if (!normalizedKey) return;
      const count = Math.max(0, Math.floor(Number(value) || 0));
      if (!count) return;
      map[normalizedKey] = count;
    });
    return map;
  }

  function mergeCounterMaps(target, additions) {
    const base = target && typeof target === 'object' ? target : Object.create(null);
    if (!additions || typeof additions !== 'object') return base;
    Object.entries(additions).forEach(([key, value]) => {
      const normalizedKey = String(key || '').trim().toLowerCase();
      if (!normalizedKey) return;
      const next = Math.max(0, Math.floor(Number(value) || 0));
      if (!next) return;
      base[normalizedKey] = (base[normalizedKey] || 0) + next;
    });
    return base;
  }

  function getTopErrorKey(errorCounts) {
    const entries = Object.entries(errorCounts || {});
    if (!entries.length) return '';
    entries.sort((a, b) => b[1] - a[1]);
    return entries[0]?.[0] || '';
  }

  function getTopErrorLabel(errorCounts) {
    const key = getTopErrorKey(errorCounts);
    if (!key) return '--';
    return ERROR_PATTERN_LABELS[key] || key.replace(/_/g, ' ');
  }

  function getInstructionalNextStep(errorCounts) {
    const key = getTopErrorKey(errorCounts);
    if (!key) return 'Continue current lesson target.';
    return ERROR_NEXT_STEP_COPY[key] || 'Review recent errors and provide a targeted reteach.';
  }

  function getInstructionalNextStepChip(errorCounts) {
    const key = getTopErrorKey(errorCounts);
    switch (key) {
      case 'vowel_pattern': return 'Vowel Pattern Reteach';
      case 'blend_position': return 'Blend Position Reteach';
      case 'morpheme_ending': return 'Morpheme Ending Reteach';
      case 'context_strategy': return 'Clue Strategy Reteach';
      default: return 'Stay Current Target';
    }
  }

  function resolveMiniLessonErrorKey(rawKey, fallbackCounts = null) {
    const normalized = String(rawKey || '').trim().toLowerCase();
    if (normalized === 'top' || normalized === 'auto') {
      const top = getTopErrorKey(fallbackCounts || sessionSummary?.errorTotals || {});
      return top || 'context_strategy';
    }
    if (ERROR_MINI_LESSON_PLANS[normalized]) return normalized;
    return 'context_strategy';
  }

  function buildMiniLessonPlanText(errorKey, options = {}) {
    const resolved = resolveMiniLessonErrorKey(errorKey, options.errorCounts);
    const label = ERROR_PATTERN_LABELS[resolved] || resolved.replace(/_/g, ' ');
    const steps = ERROR_MINI_LESSON_PLANS[resolved] || ERROR_MINI_LESSON_PLANS.context_strategy;
    const snapshot = buildCurrentCurriculumSnapshot();
    const lessonTargetLabel = snapshot.targetLabel || snapshot.packLabel || buildCurriculumSelectionLabel();
    const student = options.student || getActiveStudentLabel();
    return [
      `WordQuest Quick Mini-Lesson · ${label}`,
      `Student: ${student}`,
      `Current target: ${lessonTargetLabel}`,
      'Duration: 5 minutes',
      '',
      ...steps,
      '',
      'Materials: whiteboard or paper, 4-6 word cards, quick verbal feedback.'
    ].join('\n');
  }

  function formatDurationLabel(durationMs) {
    const ms = Math.max(0, Number(durationMs) || 0);
    const seconds = Math.round(ms / 1000);
    if (seconds < 60) return `${seconds}s`;
    const mins = Math.floor(seconds / 60);
    const rem = seconds % 60;
    return `${mins}m ${String(rem).padStart(2, '0')}s`;
  }

  function getSkillDescriptorForRound(result) {
    const focusValue = _el('setting-focus')?.value || prefs.focus || 'all';
    const preset = parseFocusPreset(focusValue);
    if (preset.kind === 'subject') {
      return {
        key: `subject:${preset.subject}:${preset.gradeBand || 'all'}`,
        label: `${preset.subject.toUpperCase()} vocab (${formatGradeBandLabel(preset.gradeBand)})`
      };
    }
    if (preset.kind === 'phonics' && preset.focus && preset.focus !== 'all') {
      const label = getFocusLabel(preset.focus).replace(/[—]/g, '').replace(/\s+/g, ' ').trim();
      return {
        key: `phonics:${preset.focus}`,
        label: label || 'Phonics focus'
      };
    }
    const phonics = String(result?.entry?.phonics || '').trim();
    if (phonics && phonics.toLowerCase() !== 'all') {
      return {
        key: `phonics-tag:${phonics.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`,
        label: phonics
      };
    }
    return { key: 'classic:all', label: 'Classic mixed practice' };
  }

  function resetRoundTracking(nextResult = null) {
    if (nextResult?.word) {
      activeRoundStartedAt = Date.now();
      currentRoundHintRequested = false;
      currentRoundStarterWordsShown = false;
      currentRoundVoiceAttempts = 0;
      currentRoundErrorCounts = Object.create(null);
      const skill = getSkillDescriptorForRound(nextResult);
      currentRoundSkillKey = skill.key;
      currentRoundSkillLabel = skill.label;
      emitTelemetry('wq_round_start', {
        word_id: normalizeReviewWord(nextResult.word),
        word_length: Number(nextResult.wordLength) || String(nextResult.word || '').length || null,
        skill_key: currentRoundSkillKey,
        skill_label: currentRoundSkillLabel,
        source: 'new_game'
      });
      return;
    }
    activeRoundStartedAt = 0;
    currentRoundHintRequested = false;
    currentRoundStarterWordsShown = false;
    currentRoundVoiceAttempts = 0;
    currentRoundErrorCounts = Object.create(null);
    currentRoundSkillKey = 'classic:all';
    currentRoundSkillLabel = 'Classic mixed practice';
  }

  function buildRoundMetrics(result, maxGuessesValue) {
    const guessed = Math.max(1, Array.isArray(result?.guesses) ? result.guesses.length : Math.max(1, Number(maxGuessesValue) || 6));
    const durationMs = activeRoundStartedAt > 0 ? Math.max(0, Date.now() - activeRoundStartedAt) : 0;
    const fallbackSkill = getSkillDescriptorForRound(result);
    return {
      guessesUsed: guessed,
      durationMs,
      hintRequested: !!currentRoundHintRequested,
      voiceAttempts: Math.max(0, Number(currentRoundVoiceAttempts) || 0),
      skillKey: currentRoundSkillKey || fallbackSkill.key,
      skillLabel: currentRoundSkillLabel || fallbackSkill.label,
      errorCounts: normalizeCounterMap(currentRoundErrorCounts)
    };
  }

  function classifyRoundErrorPattern(result) {
    const guess = String(result?.guess || '').toLowerCase();
    const word = String(result?.word || '').toLowerCase();
    const statuses = Array.isArray(result?.result) ? result.result : [];
    if (!guess || !word || !statuses.length) return '';
    const correctCount = statuses.filter((state) => state === 'correct').length;
    const presentCount = statuses.filter((state) => state === 'present').length;
    const vowels = new Set(['a', 'e', 'i', 'o', 'u', 'y']);
    const targetVowels = Array.from(new Set(word.split('').filter((ch) => vowels.has(ch))));
    const guessedVowels = new Set(guess.split('').filter((ch) => vowels.has(ch)));
    const vowelOverlap = targetVowels.filter((ch) => guessedVowels.has(ch)).length;
    const phonicsTag = String(result?.entry?.phonics || '').toLowerCase();

    if (targetVowels.length >= 2 && vowelOverlap === 0) return 'vowel_pattern';
    if (presentCount >= 2 && correctCount <= 1) return 'blend_position';
    if ((/suffix|prefix|multisyll|welded/.test(phonicsTag) || word.length >= 6) && guess.slice(-2) !== word.slice(-2)) {
      return 'morpheme_ending';
    }
    return 'context_strategy';
  }

  function maybeShowErrorCoach(result) {
    if (!result || result.won || result.lost) return;
    if (!Array.isArray(result.guesses) || result.guesses.length < 2) return;
    const category = classifyRoundErrorPattern(result);
    if (!category) return;
    currentRoundErrorCounts[category] = (currentRoundErrorCounts[category] || 0) + 1;
  }

  function loadSessionSummaryState() {
    const fallback = {
      rounds: 0,
      wins: 0,
      hintRounds: 0,
      voiceAttempts: 0,
      totalGuesses: 0,
      totalDurationMs: 0,
      errorTotals: Object.create(null),
      masteryBySkill: Object.create(null),
      startedAt: Date.now()
    };
    try {
      const parsed = JSON.parse(sessionStorage.getItem(SESSION_SUMMARY_KEY) || 'null');
      if (!parsed || typeof parsed !== 'object') return fallback;
      const masteryBySkill = Object.create(null);
      const rawMastery = parsed.masteryBySkill && typeof parsed.masteryBySkill === 'object'
        ? parsed.masteryBySkill
        : {};
      Object.entries(rawMastery).forEach(([skillKey, row]) => {
        const key = String(skillKey || '').trim();
        if (!key || !row || typeof row !== 'object') return;
        masteryBySkill[key] = {
          label: String(row.label || key).trim(),
          rounds: Math.max(0, Math.floor(Number(row.rounds) || 0)),
          wins: Math.max(0, Math.floor(Number(row.wins) || 0)),
          hintRounds: Math.max(0, Math.floor(Number(row.hintRounds) || 0)),
          voiceAttempts: Math.max(0, Math.floor(Number(row.voiceAttempts) || 0)),
          totalGuesses: Math.max(0, Math.floor(Number(row.totalGuesses) || 0)),
          totalDurationMs: Math.max(0, Math.floor(Number(row.totalDurationMs) || 0)),
          errorCounts: normalizeCounterMap(row.errorCounts)
        };
      });
      return {
        rounds: Math.max(0, Math.floor(Number(parsed.rounds) || 0)),
        wins: Math.max(0, Math.floor(Number(parsed.wins) || 0)),
        hintRounds: Math.max(0, Math.floor(Number(parsed.hintRounds) || 0)),
        voiceAttempts: Math.max(0, Math.floor(Number(parsed.voiceAttempts) || 0)),
        totalGuesses: Math.max(0, Math.floor(Number(parsed.totalGuesses) || 0)),
        totalDurationMs: Math.max(0, Math.floor(Number(parsed.totalDurationMs) || 0)),
        errorTotals: normalizeCounterMap(parsed.errorTotals),
        masteryBySkill,
        startedAt: Math.max(0, Number(parsed.startedAt) || Date.now())
      };
    } catch {
      return fallback;
    }
  }

  function loadRosterState() {
    const fallback = { students: [], active: '' };
    try {
      const parsed = JSON.parse(localStorage.getItem(ROSTER_STATE_KEY) || 'null');
      if (!parsed || typeof parsed !== 'object') return fallback;
      const students = Array.isArray(parsed.students)
        ? parsed.students
          .map((name) => String(name || '').trim().replace(/\s+/g, ' '))
          .filter((name) => name.length > 0)
          .slice(0, 30)
        : [];
      const uniqueStudents = Array.from(new Set(students));
      const active = uniqueStudents.includes(String(parsed.active || '').trim())
        ? String(parsed.active || '').trim()
        : '';
      return { students: uniqueStudents, active };
    } catch {
      return fallback;
    }
  }

  function loadProbeHistory() {
    try {
      const parsed = JSON.parse(localStorage.getItem(PROBE_HISTORY_KEY) || '[]');
      if (!Array.isArray(parsed)) return [];
      return parsed
        .map((row) => ({
          startedAt: Math.max(0, Number(row?.startedAt) || Date.now()),
          completedAt: Math.max(0, Number(row?.completedAt) || Date.now()),
          roundsTarget: Math.max(1, Math.floor(Number(row?.roundsTarget) || 3)),
          roundsDone: Math.max(0, Math.floor(Number(row?.roundsDone) || 0)),
          wins: Math.max(0, Math.floor(Number(row?.wins) || 0)),
          totalGuesses: Math.max(0, Math.floor(Number(row?.totalGuesses) || 0)),
          totalDurationMs: Math.max(0, Math.floor(Number(row?.totalDurationMs) || 0)),
          hintRounds: Math.max(0, Math.floor(Number(row?.hintRounds) || 0)),
          focusLabel: String(row?.focusLabel || '').trim(),
          gradeLabel: String(row?.gradeLabel || '').trim(),
          student: String(row?.student || '').trim()
        }))
        .slice(0, 24);
    } catch {
      return [];
    }
  }

  function normalizeGoalAccuracy(value) {
    const parsed = Math.round(Number(value) || 0);
    if (!Number.isFinite(parsed) || parsed <= 0) return 80;
    return Math.max(50, Math.min(100, parsed));
  }

  function normalizeGoalGuesses(value) {
    const parsed = Number(value);
    if (!Number.isFinite(parsed) || parsed <= 0) return 4;
    const bounded = Math.max(1, Math.min(8, parsed));
    return Number(bounded.toFixed(1));
  }

  function normalizeGoalEntry(raw) {
    if (!raw || typeof raw !== 'object') return null;
    return {
      accuracyTarget: normalizeGoalAccuracy(raw.accuracyTarget),
      avgGuessesTarget: normalizeGoalGuesses(raw.avgGuessesTarget),
      updatedAt: Math.max(0, Number(raw.updatedAt) || Date.now())
    };
  }

  function loadStudentGoalState() {
    try {
      const parsed = JSON.parse(localStorage.getItem(STUDENT_GOALS_KEY) || '{}');
      if (!parsed || typeof parsed !== 'object') return Object.create(null);
      const normalized = Object.create(null);
      Object.entries(parsed).forEach(([key, value]) => {
        const goalKey = String(key || '').trim();
        if (!goalKey) return;
        const goalEntry = normalizeGoalEntry(value);
        if (!goalEntry) return;
        normalized[goalKey] = goalEntry;
      });
      return normalized;
    } catch {
      return Object.create(null);
    }
  }

  function normalizePlaylistItem(raw) {
    if (!raw || typeof raw !== 'object') return null;
    const focus = String(raw.focus || '').trim() || 'all';
    const gradeBand = String(raw.gradeBand || '').trim() || SAFE_DEFAULT_GRADE_BAND;
    const length = String(raw.length || '').trim() || DEFAULT_PREFS.length;
    const packId = normalizeLessonPackId(raw.packId || 'custom');
    const targetId = normalizeLessonTargetId(packId, raw.targetId || 'custom');
    const label = String(raw.label || '').trim() || 'Saved target';
    return {
      id: String(raw.id || `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`).trim(),
      packId,
      targetId,
      focus,
      gradeBand,
      length,
      label,
      createdAt: Math.max(0, Number(raw.createdAt) || Date.now())
    };
  }

  function normalizePlaylistEntry(raw) {
    if (!raw || typeof raw !== 'object') return null;
    const id = String(raw.id || '').trim();
    if (!id) return null;
    const name = String(raw.name || '').trim() || 'Untitled Playlist';
    const items = Array.isArray(raw.items)
      ? raw.items.map((item) => normalizePlaylistItem(item)).filter(Boolean).slice(0, 20)
      : [];
    return {
      id,
      name,
      items,
      createdAt: Math.max(0, Number(raw.createdAt) || Date.now()),
      updatedAt: Math.max(0, Number(raw.updatedAt) || Date.now())
    };
  }

  function createEmptyPlaylistState() {
    return { playlists: [], assignments: Object.create(null), progress: Object.create(null), selectedId: '' };
  }

  function loadPlaylistState() {
    const fallback = createEmptyPlaylistState();
    try {
      const parsed = JSON.parse(localStorage.getItem(PLAYLIST_STATE_KEY) || 'null');
      if (!parsed || typeof parsed !== 'object') return fallback;
      const playlists = Array.isArray(parsed.playlists)
        ? parsed.playlists.map((entry) => normalizePlaylistEntry(entry)).filter(Boolean).slice(0, 40)
        : [];
      const assignmentRaw = parsed.assignments && typeof parsed.assignments === 'object'
        ? parsed.assignments
        : {};
      const assignments = Object.create(null);
      Object.entries(assignmentRaw).forEach(([assigneeKey, playlistId]) => {
        const key = String(assigneeKey || '').trim();
        const value = String(playlistId || '').trim();
        if (!key || !value) return;
        if (!playlists.some((entry) => entry.id === value)) return;
        assignments[key] = value;
      });
      const progressRaw = parsed.progress && typeof parsed.progress === 'object'
        ? parsed.progress
        : {};
      const progress = Object.create(null);
      Object.entries(progressRaw).forEach(([assigneeKey, index]) => {
        const key = String(assigneeKey || '').trim();
        if (!key) return;
        const playlistId = String(assignments[key] || '').trim();
        if (!playlistId) return;
        const playlist = playlists.find((entry) => entry.id === playlistId);
        const itemCount = Math.max(1, playlist?.items?.length || 1);
        const parsedIndex = Math.floor(Number(index) || 0);
        progress[key] = Math.max(0, parsedIndex % itemCount);
      });
      const selectedId = String(parsed.selectedId || '').trim();
      return {
        playlists,
        assignments,
        progress,
        selectedId: playlists.some((entry) => entry.id === selectedId) ? selectedId : (playlists[0]?.id || '')
      };
    } catch {
      return fallback;
    }
  }

  function saveProbeHistory() {
    try { localStorage.setItem(PROBE_HISTORY_KEY, JSON.stringify(probeHistory.slice(0, 24))); } catch {}
  }

  function saveStudentGoalState() {
    try { localStorage.setItem(STUDENT_GOALS_KEY, JSON.stringify(studentGoalState)); } catch {}
  }

  function savePlaylistState() {
    try { localStorage.setItem(PLAYLIST_STATE_KEY, JSON.stringify(playlistState)); } catch {}
  }

  function normalizeProbeRounds(value) {
    const parsed = Math.max(1, Math.floor(Number(value) || 3));
    if (parsed <= 3) return '3';
    if (parsed <= 5) return '5';
    return '8';
  }

  function createEmptyProbeState() {
    return {
      active: false,
      startedAt: 0,
      roundsTarget: Number.parseInt(normalizeProbeRounds(prefs.probeRounds || DEFAULT_PREFS.probeRounds), 10),
      roundsDone: 0,
      wins: 0,
      totalGuesses: 0,
      totalDurationMs: 0,
      hintRounds: 0,
      focusLabel: '',
      gradeLabel: '',
      student: ''
    };
  }

  let rosterState = loadRosterState();
  let probeHistory = loadProbeHistory();
  let studentGoalState = loadStudentGoalState();
  let playlistState = loadPlaylistState();
  const teacherAssignmentsFeature = window.WQTeacherAssignmentsFeature?.createFeature?.({
    contract: TEACHER_ASSIGNMENTS_CONTRACT,
    el: _el,
    curriculumPackOrder: CURRICULUM_PACK_ORDER,
    normalizeLessonPackId,
    normalizeLessonTargetId,
    getLessonPackDefinition,
    getLessonTarget,
    getCurriculumTargetsForGrade,
    getQuestFilterGradeBand,
    getActiveStudentLabel,
    applyChipTone,
    applyStudentTargetConfig,
    isAssessmentRoundLocked
  }) || null;
  let probeState = createEmptyProbeState();
  let sessionSummary = loadSessionSummaryState();
  let activeMiniLessonKey = 'top';

  function saveSessionSummaryState() {
    try { sessionStorage.setItem(SESSION_SUMMARY_KEY, JSON.stringify(sessionSummary)); } catch {}
  }

  function saveRosterState() {
    try { localStorage.setItem(ROSTER_STATE_KEY, JSON.stringify(rosterState)); } catch {}
  }

  function getActiveStudentLabel() {
    return rosterState.active || 'Class';
  }

  function applyStudentTargetConfig(packId, targetId, options = {}) {
    const normalizedPack = normalizeLessonPackId(packId);
    const normalizedTarget = normalizeLessonTargetId(normalizedPack, targetId);
    if (normalizedPack === 'custom' || normalizedTarget === 'custom') return false;
    syncLessonPackControlsFromPrefs({ packId: normalizedPack, targetId: normalizedTarget });
    return applyLessonTargetConfig(normalizedPack, normalizedTarget, { toast: !!options.toast });
  }

  function getAssigneeKeyForStudent(name) {
    const label = String(name || '').trim();
    if (!label || label === 'Class') return 'class';
    return `student:${label}`;
  }

  function getSelectedPlaylist() {
    const selectedId = String(playlistState.selectedId || '').trim();
    if (!selectedId) return null;
    return playlistState.playlists.find((entry) => entry.id === selectedId) || null;
  }

  function setSelectedPlaylistId(playlistId) {
    const nextId = String(playlistId || '').trim();
    if (!nextId) {
      playlistState.selectedId = '';
    } else if (playlistState.playlists.some((entry) => entry.id === nextId)) {
      playlistState.selectedId = nextId;
    } else {
      playlistState.selectedId = '';
    }
    savePlaylistState();
  }

  function getAssignedPlaylistContext(studentLabel) {
    const studentKey = getAssigneeKeyForStudent(studentLabel);
    const directId = String(playlistState.assignments[studentKey] || '').trim();
    if (directId) {
      const direct = playlistState.playlists.find((entry) => entry.id === directId);
      if (direct) return { playlist: direct, key: studentKey };
    }
    const classId = String(playlistState.assignments.class || '').trim();
    if (!classId) return null;
    const classPlaylist = playlistState.playlists.find((entry) => entry.id === classId) || null;
    if (!classPlaylist) return null;
    return { playlist: classPlaylist, key: 'class' };
  }

  function getAssignedPlaylistForStudent(studentLabel) {
    return getAssignedPlaylistContext(studentLabel)?.playlist || null;
  }

  function getPlaylistProgressIndex(assigneeKey, playlist) {
    if (!playlist || !Array.isArray(playlist.items) || !playlist.items.length) return 0;
    const key = String(assigneeKey || '').trim();
    const max = playlist.items.length;
    const raw = Math.floor(Number(playlistState.progress?.[key]) || 0);
    return Math.max(0, raw % max);
  }

  function setPlaylistProgressIndex(assigneeKey, playlist, rawIndex = 0) {
    const key = String(assigneeKey || '').trim();
    if (!key) return;
    if (!playlistState.progress || typeof playlistState.progress !== 'object') {
      playlistState.progress = Object.create(null);
    }
    const max = Math.max(1, Array.isArray(playlist?.items) ? playlist.items.length : 1);
    const parsed = Math.floor(Number(rawIndex) || 0);
    playlistState.progress[key] = Math.max(0, parsed % max);
  }

  function buildCurrentTargetSnapshot() {
    const packId = normalizeLessonPackId(
      prefs.lessonPack || _el('s-lesson-pack')?.value || DEFAULT_PREFS.lessonPack
    );
    const targetId = normalizeLessonTargetId(
      packId,
      prefs.lessonTarget || _el('s-lesson-target')?.value || DEFAULT_PREFS.lessonTarget
    );
    const focus = _el('setting-focus')?.value || prefs.focus || 'all';
    const gradeBand = getEffectiveGameplayGradeBand(_el('s-grade')?.value || prefs.grade || DEFAULT_PREFS.grade, focus);
    const length = String(_el('s-length')?.value || prefs.length || DEFAULT_PREFS.length).trim() || DEFAULT_PREFS.length;
    let label = '';
    if (packId !== 'custom' && targetId !== 'custom') {
      const pack = getLessonPackDefinition(packId);
      const target = getLessonTarget(packId, targetId);
      label = target ? `${pack.label} · ${target.label}` : `${pack.label} · Target`;
    } else {
      const focusLabel = getFocusLabel(focus).replace(/[—]/g, '').replace(/\s+/g, ' ').trim();
      label = `${focusLabel || 'Classic'} · ${formatGradeBandLabel(gradeBand)} · ${formatLengthPrefLabel(length)}`;
    }
    return {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      packId,
      targetId,
      focus,
      gradeBand,
      length,
      label,
      createdAt: Date.now()
    };
  }

  function applySnapshotToSettings(snapshot, options = {}) {
    if (!snapshot) return false;
    const packId = normalizeLessonPackId(snapshot.packId || 'custom');
    const targetId = normalizeLessonTargetId(packId, snapshot.targetId || 'custom');
    const focusValue = String(snapshot.focus || 'all').trim() || 'all';
    const gradeBand = String(snapshot.gradeBand || SAFE_DEFAULT_GRADE_BAND).trim() || SAFE_DEFAULT_GRADE_BAND;
    const lengthValue = String(snapshot.length || DEFAULT_PREFS.length).trim() || DEFAULT_PREFS.length;

    if (packId !== 'custom' && targetId !== 'custom') {
      getLessonPackSelectElements().forEach((select) => { select.value = packId; });
      const normalizedTarget = populateLessonTargetSelect(packId, targetId);
      getLessonTargetSelectElements().forEach((select) => { select.value = normalizedTarget; });
      setLessonPackPrefs(packId, normalizedTarget);
      updateLessonPackNote(packId, normalizedTarget);
      applyLessonTargetConfig(packId, normalizedTarget, { toast: false });
      if (options.toast) WQUI.showToast('Assigned playlist target applied.');
      return true;
    }

    lessonPackApplying = true;
    try {
      getLessonPackSelectElements().forEach((select) => { select.value = 'custom'; });
      populateLessonTargetSelect('custom', 'custom');
      setLessonPackPrefs('custom', 'custom');
      const focusSelect = _el('setting-focus');
      if (focusSelect && Array.from(focusSelect.options).some((option) => option.value === focusValue)) {
        focusSelect.value = focusValue;
        focusSelect.dispatchEvent(new Event('change', { bubbles: true }));
      }
      const gradeSelect = _el('s-grade');
      if (gradeSelect && gradeSelect.value !== gradeBand) {
        gradeSelect.value = gradeBand;
        setPref('grade', gradeBand);
      }
      const lengthSelect = _el('s-length');
      if (lengthSelect && lengthSelect.value !== lengthValue) {
        lengthSelect.value = lengthValue;
        setPref('length', lengthValue);
      }
    } finally {
      lessonPackApplying = false;
    }
    updateLessonPackNote('custom', 'custom');
    updateFocusGradeNote();
    updateGradeTargetInline();
    updateFocusSummaryLabel();
    if (options.toast) WQUI.showToast('Assigned playlist target applied.');
    return true;
  }

  function renderPlaylistControls() {
    const select = _el('s-playlist-select');
    const nameInput = _el('s-playlist-name');
    const summaryChip = _el('session-playlist-summary');
    const assignmentChip = _el('session-playlist-assigned');
    if (select) {
      select.innerHTML = '';
      const none = document.createElement('option');
      none.value = '';
      none.textContent = 'No playlist selected';
      select.appendChild(none);
      playlistState.playlists.forEach((playlist) => {
        const option = document.createElement('option');
        option.value = playlist.id;
        option.textContent = `${playlist.name} (${playlist.items.length})`;
        select.appendChild(option);
      });
      if (playlistState.selectedId && playlistState.playlists.some((entry) => entry.id === playlistState.selectedId)) {
        select.value = playlistState.selectedId;
      } else {
        select.value = '';
      }
    }

    const selected = getSelectedPlaylist();
    if (nameInput && !nameInput.matches(':focus')) {
      nameInput.value = selected?.name || '';
    }
    if (summaryChip) {
      summaryChip.textContent = selected
        ? `Playlist: ${selected.name} (${selected.items.length} target${selected.items.length === 1 ? '' : 's'})`
        : 'Playlist: --';
      summaryChip.setAttribute('title', summaryChip.textContent);
    }
    if (assignmentChip) {
      const studentLabel = getActiveStudentLabel();
      const assignedContext = getAssignedPlaylistContext(studentLabel);
      const assigned = assignedContext?.playlist || null;
      if (!assigned) {
        assignmentChip.textContent = 'Assignment: --';
        assignmentChip.setAttribute('title', assignmentChip.textContent);
      } else {
        const nextIndex = getPlaylistProgressIndex(assignedContext.key, assigned);
        const itemCount = Math.max(0, assigned.items.length);
        const nextTarget = itemCount ? assigned.items[nextIndex] : null;
        assignmentChip.textContent = itemCount
          ? `Assignment: ${studentLabel} -> ${assigned.name} (next ${nextIndex + 1}/${itemCount})`
          : `Assignment: ${studentLabel} -> ${assigned.name} (empty)`;
        assignmentChip.setAttribute(
          'title',
          itemCount
            ? `${assignmentChip.textContent} · Next target: ${nextTarget?.label || 'Saved target'}`
            : `${assignmentChip.textContent} · Add at least one target to this playlist.`
        );
      }
    }
  }

  function saveCurrentTargetToPlaylist() {
    const selected = getSelectedPlaylist();
    const nameInput = _el('s-playlist-name');
    const typedName = String(nameInput?.value || '').trim();
    const snapshot = buildCurrentTargetSnapshot();
    if (!snapshot) return false;

    if (selected) {
      const duplicate = selected.items.some((entry) => (
        entry.packId === snapshot.packId &&
        entry.targetId === snapshot.targetId &&
        entry.focus === snapshot.focus &&
        entry.gradeBand === snapshot.gradeBand &&
        entry.length === snapshot.length
      ));
      if (!duplicate) {
        selected.items.push(snapshot);
        selected.items = selected.items.slice(-20);
      }
      selected.updatedAt = Date.now();
      if (typedName) selected.name = typedName;
      savePlaylistState();
      renderPlaylistControls();
      return true;
    }

    const nextName = typedName || `Playlist ${playlistState.playlists.length + 1}`;
    const playlist = {
      id: `pl-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      name: nextName,
      items: [snapshot],
      createdAt: Date.now(),
      updatedAt: Date.now()
    };
    playlistState.playlists.push(playlist);
    playlistState.playlists = playlistState.playlists.slice(-40);
    setSelectedPlaylistId(playlist.id);
    savePlaylistState();
    renderPlaylistControls();
    return true;
  }

  function assignSelectedPlaylistToActiveStudent() {
    const selected = getSelectedPlaylist();
    if (!selected) return false;
    const student = getActiveStudentLabel();
    const assigneeKey = getAssigneeKeyForStudent(student);
    playlistState.assignments[assigneeKey] = selected.id;
    setPlaylistProgressIndex(assigneeKey, selected, 0);
    savePlaylistState();
    renderPlaylistControls();
    return true;
  }

  function applyAssignedPlaylistForActiveStudent() {
    const context = getAssignedPlaylistContext(getActiveStudentLabel());
    const assigned = context?.playlist || null;
    if (!context || !assigned || !assigned.items.length) return false;
    const index = getPlaylistProgressIndex(context.key, assigned);
    const target = assigned.items[index] || assigned.items[0];
    const applied = applySnapshotToSettings(target, { toast: true });
    if (!applied) return false;
    setPlaylistProgressIndex(context.key, assigned, index + 1);
    savePlaylistState();
    renderPlaylistControls();
    return true;
  }

  function deleteSelectedPlaylist() {
    const selected = getSelectedPlaylist();
    if (!selected) return false;
    playlistState.playlists = playlistState.playlists.filter((entry) => entry.id !== selected.id);
    Object.entries(playlistState.assignments).forEach(([key, playlistId]) => {
      if (playlistId !== selected.id) return;
      delete playlistState.assignments[key];
      if (playlistState.progress && typeof playlistState.progress === 'object') {
        delete playlistState.progress[key];
      }
    });
    setSelectedPlaylistId(playlistState.playlists[0]?.id || '');
    savePlaylistState();
    renderPlaylistControls();
    return true;
  }

  function getGoalKeyForStudent(name) {
    const label = String(name || '').trim();
    return label || 'Class';
  }

  function getGoalForStudent(name) {
    const key = getGoalKeyForStudent(name);
    return normalizeGoalEntry(studentGoalState[key]);
  }

  function setGoalForStudent(name, goal) {
    const key = getGoalKeyForStudent(name);
    const entry = normalizeGoalEntry(goal);
    if (!entry) return false;
    studentGoalState[key] = entry;
    saveStudentGoalState();
    return true;
  }

  function clearGoalForStudent(name) {
    const key = getGoalKeyForStudent(name);
    if (!Object.prototype.hasOwnProperty.call(studentGoalState, key)) return false;
    delete studentGoalState[key];
    saveStudentGoalState();
    return true;
  }

  function matchesProbeRecordStudent(recordStudent, studentLabel) {
    const left = String(recordStudent || '').trim() || 'Class';
    const right = String(studentLabel || '').trim() || 'Class';
    return left === right;
  }

  function getProbeRecordsForStudent(studentLabel) {
    return probeHistory.filter((record) => matchesProbeRecordStudent(record?.student, studentLabel));
  }

  function getLatestProbeSourceForStudent(studentLabel) {
    if (probeState.active && matchesProbeRecordStudent(probeState.student, studentLabel)) {
      return probeState;
    }
    return getProbeRecordsForStudent(studentLabel)[0] || null;
  }

  function buildProbeNumericSummary(source) {
    const roundsDone = Math.max(0, Number(source?.roundsDone) || 0);
    const wins = Math.max(0, Number(source?.wins) || 0);
    const totalGuesses = Math.max(0, Number(source?.totalGuesses) || 0);
    const totalDurationMs = Math.max(0, Number(source?.totalDurationMs) || 0);
    const hintRounds = Math.max(0, Number(source?.hintRounds) || 0);
    return {
      roundsDone,
      wins,
      accuracyRate: roundsDone ? wins / roundsDone : 0,
      avgGuesses: roundsDone ? totalGuesses / roundsDone : 0,
      avgTimeSeconds: roundsDone ? (totalDurationMs / roundsDone) / 1000 : 0,
      hintRate: roundsDone ? hintRounds / roundsDone : 0
    };
  }

  function getComparableProbeTrend(studentLabel) {
    const records = getProbeRecordsForStudent(studentLabel);
    const activeMatches = probeState.active &&
      matchesProbeRecordStudent(probeState.student, studentLabel) &&
      Math.max(0, Number(probeState.roundsDone) || 0) > 0;
    const currentRecord = activeMatches ? probeState : (records[0] || null);
    const previousRecord = activeMatches ? (records[0] || null) : (records[1] || null);
    const current = currentRecord ? buildProbeNumericSummary(currentRecord) : null;
    const previous = previousRecord ? buildProbeNumericSummary(previousRecord) : null;
    return { current, previous, activeMatches };
  }

  function applyChipTone(el, tone) {
    if (!el) return;
    el.classList.remove('is-good', 'is-warn', 'is-bad');
    if (tone === 'good') el.classList.add('is-good');
    if (tone === 'warn') el.classList.add('is-warn');
    if (tone === 'bad') el.classList.add('is-bad');
  }

  function formatSignedDelta(value, digits = 1) {
    if (!Number.isFinite(value)) return '--';
    const rounded = Number(value.toFixed(digits));
    if (rounded > 0) return `+${rounded}`;
    return String(rounded);
  }

  function loadTelemetryRows() {
    try {
      const raw = localStorage.getItem(TELEMETRY_QUEUE_KEY);
      if (!raw) return [];
      const parsed = JSON.parse(raw);
      if (!Array.isArray(parsed)) return [];
      return parsed
        .map((entry) => {
          const event = String(entry?.event_name || entry?.event || entry?.name || '').trim().toLowerCase();
          const timestamp = Number(entry?.ts_ms || entry?.ts || entry?.timestamp || entry?.time || 0);
          const payload = entry?.payload && typeof entry.payload === 'object'
            ? entry.payload
            : (entry?.data && typeof entry.data === 'object' ? entry.data : entry);
          return { event, timestamp, payload };
        })
        .filter((entry) => entry.event && Number.isFinite(entry.timestamp) && entry.timestamp > 0);
    } catch {
      return [];
    }
  }

  function buildAdoptionHealthMetrics() {
    const now = Date.now();
    const sevenDaysMs = 7 * 24 * 60 * 60 * 1000;
    const telemetryRows = loadTelemetryRows().filter((row) => row.timestamp >= (now - sevenDaysMs));

    const byEvent = (names) => {
      const allowed = new Set([].concat(names || []).map((name) => String(name || '').toLowerCase()).filter(Boolean));
      return telemetryRows.filter((row) => allowed.has(row.event));
    };
    const pct = (value) => Math.round(Math.max(0, Math.min(1, Number(value) || 0)) * 100);
    const durationSeconds = (start, end) => Math.max(0, (Number(end) - Number(start)) / 1000);
    const metric = (key, label, valuePct, tone = '', detail = '', available = true, weight = 1) => ({
      key,
      label,
      valuePct: Number.isFinite(valuePct) ? Math.max(0, Math.min(100, Math.round(valuePct))) : null,
      tone,
      detail,
      available: Boolean(available),
      weight: Math.max(0, Number(weight) || 0)
    });

    const roundStarts = byEvent(['wq_round_start']).sort((a, b) => a.timestamp - b.timestamp);
    const supportEvents = byEvent(['wq_support_used', 'wq_hint_open', 'wq_hint_used', 'wq_clue_open', 'wq_coach_open'])
      .sort((a, b) => a.timestamp - b.timestamp);
    let noEarlySupportCount = 0;
    if (roundStarts.length) {
      roundStarts.forEach((start) => {
        const earlySupport = supportEvents.find((event) => {
          const delta = event.timestamp - start.timestamp;
          return delta >= 0 && delta <= 90_000;
        });
        if (!earlySupport) noEarlySupportCount += 1;
      });
    }
    const clarityFromTelemetry = roundStarts.length ? (noEarlySupportCount / roundStarts.length) : null;
    const clarityFromSession = sessionSummary.rounds
      ? Math.max(0, 1 - (sessionSummary.hintRounds / Math.max(1, sessionSummary.rounds)))
      : null;
    const clarityRate = clarityFromTelemetry ?? clarityFromSession;
    const clarity = clarityRate === null
      ? metric('clarity', 'Clarity', null, '', 'Need more rounds to score first-90s independence.', false, 1.1)
      : metric(
          'clarity',
          'Clarity',
          pct(clarityRate),
          clarityRate >= 0.72 ? 'good' : (clarityRate >= 0.5 ? 'warn' : 'bad'),
          `No-support first 90s: ${pct(clarityRate)}%.`,
          true,
          1.1
        );

    const zpdRows = telemetryRows.filter((row) => Object.prototype.hasOwnProperty.call(row.payload || {}, 'zpd_in_band'));
    const zpdRate = zpdRows.length
      ? (zpdRows.filter((row) => Boolean(row.payload?.zpd_in_band)).length / zpdRows.length)
      : null;
    const probeSummary = getLatestProbePerformance(getActiveStudentLabel());
    const zpdFallbackRate = probeSummary && probeSummary.roundsDone > 0
      ? Math.max(0, Math.min(1, ((probeSummary.accuracyRate * 0.7) + ((1 - probeSummary.hintRate) * 0.3))))
      : null;
    const zpdEffectiveRate = zpdRate ?? zpdFallbackRate;
    const zpd = zpdEffectiveRate === null
      ? metric('zpd', 'ZPD Fit', null, '', 'Need telemetry or a completed probe to estimate fit.', false, 1.15)
      : metric(
          'zpd',
          'ZPD Fit',
          pct(zpdEffectiveRate),
          zpdEffectiveRate >= 0.78 ? 'good' : (zpdEffectiveRate >= 0.6 ? 'warn' : 'bad'),
          `In-band estimate: ${pct(zpdEffectiveRate)}%.`,
          true,
          1.15
        );

    const hubOpens = byEvent(['wq_teacher_hub_open']).sort((a, b) => a.timestamp - b.timestamp);
    const targetApplies = byEvent(['wq_target_apply']).sort((a, b) => a.timestamp - b.timestamp);
    const setupDurations = [];
    hubOpens.forEach((openRow) => {
      const nextApply = targetApplies.find((applyRow) => applyRow.timestamp >= openRow.timestamp);
      if (nextApply) setupDurations.push(durationSeconds(openRow.timestamp, nextApply.timestamp));
    });
    const setupMedian = setupDurations.length
      ? setupDurations.slice().sort((a, b) => a - b)[Math.floor(setupDurations.length / 2)]
      : null;
    const setupSpeed = setupMedian === null
      ? metric('setup', 'Setup Speed', null, '', 'Open Teacher Hub and apply a target to score setup speed.', false, 0.9)
      : metric(
          'setup',
          'Setup Speed',
          pct(Math.max(0, Math.min(1, 1 - (setupMedian / 180)))),
          setupMedian <= 45 ? 'good' : (setupMedian <= 90 ? 'warn' : 'bad'),
          `Median hub->target apply: ${Math.round(setupMedian)}s.`,
          true,
          0.9
        );

    const targetKeyOf = (row) => String(
      row?.payload?.lesson_target_id ||
      row?.payload?.target_id ||
      row?.payload?.lessonId ||
      ''
    ).trim();
    const roundCompletes = byEvent(['wq_round_complete']).sort((a, b) => a.timestamp - b.timestamp);
    let fidelityTotal = 0;
    let fidelityMatched = 0;
    if (targetApplies.length && roundCompletes.length) {
      roundCompletes.forEach((row) => {
        const priorApply = targetApplies
          .filter((applyRow) => applyRow.timestamp <= row.timestamp)
          .slice(-1)[0];
        const applyKey = targetKeyOf(priorApply);
        const roundKey = targetKeyOf(row);
        if (applyKey || roundKey) {
          fidelityTotal += 1;
          if (applyKey && roundKey && applyKey === roundKey) fidelityMatched += 1;
        }
      });
    }
    const fidelityRate = fidelityTotal > 0 ? (fidelityMatched / fidelityTotal) : null;
    const fidelity = fidelityRate === null
      ? metric('fidelity', 'Lesson Fidelity', null, '', 'Need target-apply and round-complete telemetry to score fidelity.', false, 1.05)
      : metric(
          'fidelity',
          'Lesson Fidelity',
          pct(fidelityRate),
          fidelityRate >= 0.85 ? 'good' : (fidelityRate >= 0.65 ? 'warn' : 'bad'),
          `Rounds aligned to active lesson target: ${pct(fidelityRate)}%.`,
          true,
          1.05
        );

    const missionStats = buildMissionSummaryStats({
      sessionOnly: true,
      student: getActiveStudentLabel() === 'Class' ? '' : getActiveStudentLabel()
    });
    const deepDiveRateTelemetry = (() => {
      const completes = byEvent(['wq_deep_dive_complete']);
      if (!completes.length) return null;
      const passed = completes.filter((row) => {
        const doneCount = Number(row.payload?.done_count || row.payload?.doneCount || 0);
        const completionRate = Number(row.payload?.completion_rate || row.payload?.completionRate || 0);
        return doneCount >= 3 || completionRate >= 0.75;
      }).length;
      return passed / completes.length;
    })();
    const deepDiveRate = deepDiveRateTelemetry ?? (missionStats.count ? missionStats.completionRate : null);
    const deepDive = deepDiveRate === null
      ? metric('deepdive', 'Deep Dive Completion', null, '', 'Complete at least one Deep Dive to score this KPI.', false, 0.95)
      : metric(
          'deepdive',
          'Deep Dive Completion',
          pct(deepDiveRate),
          deepDiveRate >= 0.7 ? 'good' : (deepDiveRate >= 0.5 ? 'warn' : 'bad'),
          `Completed at strong threshold: ${pct(deepDiveRate)}%.`,
          true,
          0.95
        );

    const errorRows = byEvent(['wq_error']);
    const blockerCount = errorRows.filter((row) => {
      const severity = String(row.payload?.severity || row.payload?.level || '').toLowerCase();
      return severity === 'blocker' || severity === 'critical' || severity === 'fatal';
    }).length;
    const sessionAnchors = byEvent(['wq_session_start', 'wq_teacher_hub_open']);
    const sessionCount = Math.max(1, sessionAnchors.length || (sessionSummary.rounds > 0 ? 1 : 0));
    const blockerRate = blockerCount / sessionCount;
    const reliabilityScore = Math.max(0, Math.min(1, 1 - blockerRate));
    const reliability = metric(
      'reliability',
      'Reliability',
      pct(reliabilityScore),
      blockerRate === 0 ? 'good' : (blockerRate <= 0.2 ? 'warn' : 'bad'),
      blockerCount ? `${blockerCount} blocker-level issue(s) detected in recent sessions.` : 'No blocker issues detected.',
      true,
      0.85
    );

    const metrics = [clarity, zpd, setupSpeed, fidelity, deepDive, reliability];
    const weighted = metrics
      .filter((item) => item.available && item.valuePct !== null)
      .reduce((acc, item) => {
        acc.value += item.valuePct * item.weight;
        acc.weight += item.weight;
        return acc;
      }, { value: 0, weight: 0 });
    const overallScore = weighted.weight > 0 ? Math.round(weighted.value / weighted.weight) : null;
    const overallTone = overallScore === null
      ? ''
      : (overallScore >= 80 ? 'good' : (overallScore >= 60 ? 'warn' : 'bad'));
    return { metrics, overallScore, overallTone };
  }

  function renderAdoptionHealthPanel() {
    const overallEl = _el('session-adoption-overall');
    const noteEl = _el('session-adoption-note');
    const clarityEl = _el('session-adoption-clarity');
    const zpdEl = _el('session-adoption-zpd');
    const setupEl = _el('session-adoption-setup');
    const fidelityEl = _el('session-adoption-fidelity');
    const deepDiveEl = _el('session-adoption-deepdive');
    const reliabilityEl = _el('session-adoption-reliability');
    const metricEls = {
      clarity: clarityEl,
      zpd: zpdEl,
      setup: setupEl,
      fidelity: fidelityEl,
      deepdive: deepDiveEl,
      reliability: reliabilityEl
    };
    if (!overallEl) return;

    const snapshot = buildAdoptionHealthMetrics();
    const availableCount = snapshot.metrics.filter((metricEntry) => metricEntry.available).length;
    const totalCount = snapshot.metrics.length;
    if (snapshot.overallScore === null) {
      overallEl.textContent = 'Overall: --';
      overallEl.setAttribute('title', 'Complete a few rounds/probes to unlock adoption scoring.');
      applyChipTone(overallEl, '');
    } else {
      overallEl.textContent = `Overall: ${snapshot.overallScore}/100`;
      overallEl.setAttribute('title', `Adoption health based on ${availableCount} of ${totalCount} KPIs.`);
      applyChipTone(overallEl, snapshot.overallTone);
    }

    snapshot.metrics.forEach((entry) => {
      const el = metricEls[entry.key];
      if (!el) return;
      el.textContent = entry.valuePct === null ? `${entry.label}: --` : `${entry.label}: ${entry.valuePct}%`;
      el.setAttribute('title', entry.detail || `${entry.label} score`);
      applyChipTone(el, entry.available ? entry.tone : '');
    });

    if (noteEl) {
      noteEl.textContent = `Data readiness: ${availableCount}/${totalCount} KPIs active (7-day local window).`;
    }
  }

  function renderTelemetryDashboards() {
    const adoptionEl = _el('telemetry-dashboard-adoption');
    const learningEl = _el('telemetry-dashboard-learning');
    const reliabilityEl = _el('telemetry-dashboard-reliability');
    const noteEl = _el('telemetry-dashboard-note');
    if (!adoptionEl || !learningEl || !reliabilityEl) return;

    const adoptionSnapshot = buildAdoptionHealthMetrics();
    const adoptionScore = adoptionSnapshot.overallScore;
    adoptionEl.textContent = adoptionScore === null ? 'Adoption: --' : `Adoption: ${adoptionScore}/100`;
    applyChipTone(adoptionEl, adoptionSnapshot.overallTone || '');

    const rows = loadTelemetryRows();
    const rounds = rows.filter((row) => row.event === 'wq_round_complete');
    const wins = rounds.filter((row) => Boolean(row.payload?.won)).length;
    const roundWinRate = rounds.length ? (wins / rounds.length) : null;
    const deepDive = rows.filter((row) => row.event === 'wq_funnel_deep_dive_completed' || row.event === 'wq_deep_dive_complete');
    const deepDiveCompletion = deepDive.length
      ? (deepDive.reduce((sum, row) => sum + Math.max(0, Math.min(1, Number(row.payload?.completion_rate || 0))), 0) / deepDive.length)
      : null;
    const learningScoreRaw = [roundWinRate, deepDiveCompletion].filter((value) => value !== null);
    const learningScore = learningScoreRaw.length
      ? Math.round((learningScoreRaw.reduce((sum, value) => sum + value, 0) / learningScoreRaw.length) * 100)
      : null;
    learningEl.textContent = learningScore === null ? 'Learning: --' : `Learning: ${learningScore}/100`;
    applyChipTone(learningEl, learningScore === null ? '' : (learningScore >= 80 ? 'good' : learningScore >= 60 ? 'warn' : 'bad'));

    const errorRows = rows.filter((row) => row.event === 'wq_error');
    const blockerCount = errorRows.filter((row) => {
      const severity = String(row.payload?.severity || row.payload?.level || '').toLowerCase();
      return severity === 'blocker' || severity === 'critical' || severity === 'fatal';
    }).length;
    const reliabilityScore = Math.max(0, 100 - (blockerCount * 20));
    reliabilityEl.textContent = `Reliability: ${reliabilityScore}/100`;
    applyChipTone(reliabilityEl, blockerCount === 0 ? 'good' : blockerCount <= 2 ? 'warn' : 'bad');

    if (noteEl) {
      noteEl.textContent = `Funnel events tracked: ${rows.filter((row) => row.event.startsWith('wq_funnel_')).length}.`;
    }
  }

  function getLatestProbePerformance(studentLabel) {
    const trend = getComparableProbeTrend(studentLabel);
    return trend.current || null;
  }

  function evaluateStudentGoalState(studentLabel) {
    const goal = getGoalForStudent(studentLabel);
    if (!goal) {
      return {
        statusLabel: 'Not set',
        progressLabel: 'Set accuracy + guesses target.',
        tone: '',
        goal,
        current: null
      };
    }
    const current = getLatestProbePerformance(studentLabel);
    if (!current || current.roundsDone <= 0) {
      return {
        statusLabel: 'Waiting for probe data',
        progressLabel: `Targets ${goal.accuracyTarget}% and ${goal.avgGuessesTarget} guesses`,
        tone: '',
        goal,
        current: null
      };
    }
    const accuracyPct = Math.round(current.accuracyRate * 100);
    const avgGuess = Number(current.avgGuesses.toFixed(1));
    const accuracyMet = accuracyPct >= goal.accuracyTarget;
    const guessMet = avgGuess <= goal.avgGuessesTarget;
    let statusLabel = 'Partial';
    let tone = '';
    if (accuracyMet && guessMet) {
      statusLabel = 'On Track';
      tone = 'good';
    } else if (!accuracyMet && !guessMet) {
      statusLabel = 'Needs Support';
      tone = 'warn';
    }
    return {
      statusLabel,
      progressLabel: `${accuracyPct}%/${goal.accuracyTarget}% · ${avgGuess}/${goal.avgGuessesTarget} guesses`,
      tone,
      goal,
      current
    };
  }

  function renderStudentGoalPanel() {
    const activeStudent = getActiveStudentLabel();
    const goalEval = evaluateStudentGoalState(activeStudent);
    const goal = goalEval.goal;
    const accuracyInput = _el('s-goal-accuracy');
    const guessesInput = _el('s-goal-guesses');
    const statusEl = _el('session-goal-status');
    const progressEl = _el('session-goal-progress');

    if (accuracyInput && !accuracyInput.matches(':focus')) {
      accuracyInput.value = goal ? String(goal.accuracyTarget) : '';
    }
    if (guessesInput && !guessesInput.matches(':focus')) {
      guessesInput.value = goal ? String(goal.avgGuessesTarget) : '';
    }

    if (!statusEl || !progressEl) return;
    statusEl.textContent = `Goal: ${goalEval.statusLabel}`;
    progressEl.textContent = `Goal Progress: ${goalEval.progressLabel}`;
    statusEl.setAttribute('title', `Student goal status for ${activeStudent}.`);
    progressEl.setAttribute('title', goalEval.current
      ? `Based on latest probe (${goalEval.current.roundsDone} rounds).`
      : 'Run a weekly probe to score this goal.');
    applyChipTone(statusEl, goalEval.tone);
    applyChipTone(progressEl, goalEval.tone);
  }

  function getMasteryRowsForDisplay() {
    return Object.entries(sessionSummary.masteryBySkill || {})
      .map(([skillKey, row]) => {
        if (!row || typeof row !== 'object') return null;
        const attempts = Math.max(0, Math.floor(Number(row.rounds) || 0));
        if (!attempts) return null;
        const wins = Math.max(0, Math.floor(Number(row.wins) || 0));
        const hintRounds = Math.max(0, Math.floor(Number(row.hintRounds) || 0));
        const voiceAttempts = Math.max(0, Math.floor(Number(row.voiceAttempts) || 0));
        const totalGuesses = Math.max(0, Number(row.totalGuesses) || 0);
        const totalDurationMs = Math.max(0, Number(row.totalDurationMs) || 0);
        const accuracyRate = attempts ? wins / attempts : 0;
        const hintRate = attempts ? hintRounds / attempts : 0;
        const avgGuesses = attempts ? totalGuesses / attempts : 0;
        const avgTimeMs = attempts ? totalDurationMs / attempts : 0;
        const errorCounts = normalizeCounterMap(row.errorCounts);
        const topErrorKey = getTopErrorKey(errorCounts);
        return {
          skillKey,
          label: String(row.label || skillKey).trim() || 'Skill',
          attempts,
          wins,
          hintRounds,
          voiceAttempts,
          accuracyRate,
          accuracyLabel: attempts ? `${Math.round(accuracyRate * 100)}%` : '--',
          hintRate,
          hintRateLabel: attempts ? `${Math.round(hintRate * 100)}%` : '--',
          avgGuesses,
          avgGuessesLabel: attempts ? avgGuesses.toFixed(1) : '--',
          avgTimeMs,
          avgTimeLabel: attempts ? formatDurationLabel(avgTimeMs) : '--',
          avgTimeSeconds: attempts ? Number((avgTimeMs / 1000).toFixed(1)) : 0,
          topErrorKey,
          topErrorLabel: getTopErrorLabel(errorCounts),
          errorCounts
        };
      })
      .filter(Boolean);
  }

  function describeMasterySortMode(mode) {
    switch (normalizeMasterySort(mode)) {
      case 'accuracy_desc': return 'accuracy (high to low)';
      case 'hint_rate_desc': return 'hint rate (high to low)';
      case 'voice_desc': return 'voice attempts (high to low)';
      case 'top_error': return 'top error pattern';
      case 'attempts_desc':
      default:
        return 'attempts (high to low)';
    }
  }

  function describeMasteryFilterMode(mode) {
    switch (normalizeMasteryFilter(mode)) {
      case 'needs_support': return 'needs support';
      case 'high_hints': return 'high hint rate';
      case 'vowel_pattern': return 'top error: vowel pattern';
      case 'blend_position': return 'top error: blend position';
      case 'morpheme_ending': return 'top error: morpheme ending';
      case 'context_strategy': return 'top error: clue strategy';
      case 'all':
      default:
        return 'all skills';
    }
  }

  function getMasterySortMode() {
    const select = _el('s-mastery-sort');
    return normalizeMasterySort(select?.value || 'attempts_desc');
  }

  function getMasteryFilterMode() {
    const select = _el('s-mastery-filter');
    return normalizeMasteryFilter(select?.value || 'all');
  }

  function compareMasteryRows(a, b, mode = 'attempts_desc') {
    const sortMode = normalizeMasterySort(mode);
    const alpha = (left, right) => String(left || '').localeCompare(String(right || ''));
    if (sortMode === 'accuracy_desc') {
      if (b.accuracyRate !== a.accuracyRate) return b.accuracyRate - a.accuracyRate;
      if (b.attempts !== a.attempts) return b.attempts - a.attempts;
      return alpha(a.label, b.label);
    }
    if (sortMode === 'hint_rate_desc') {
      if (b.hintRate !== a.hintRate) return b.hintRate - a.hintRate;
      if (b.attempts !== a.attempts) return b.attempts - a.attempts;
      return alpha(a.label, b.label);
    }
    if (sortMode === 'voice_desc') {
      if (b.voiceAttempts !== a.voiceAttempts) return b.voiceAttempts - a.voiceAttempts;
      if (b.attempts !== a.attempts) return b.attempts - a.attempts;
      return alpha(a.label, b.label);
    }
    if (sortMode === 'top_error') {
      const aErr = a.topErrorKey || 'zzzz';
      const bErr = b.topErrorKey || 'zzzz';
      if (aErr !== bErr) return alpha(aErr, bErr);
      if (b.attempts !== a.attempts) return b.attempts - a.attempts;
      return alpha(a.label, b.label);
    }
    if (b.attempts !== a.attempts) return b.attempts - a.attempts;
    if (b.accuracyRate !== a.accuracyRate) return b.accuracyRate - a.accuracyRate;
    return alpha(a.label, b.label);
  }

  function rowMatchesMasteryFilter(row, mode = 'all') {
    const filterMode = normalizeMasteryFilter(mode);
    if (filterMode === 'all') return true;
    if (filterMode === 'needs_support') {
      return row.accuracyRate < 0.75 || row.hintRate >= 0.4 || !!row.topErrorKey;
    }
    if (filterMode === 'high_hints') {
      return row.hintRate >= 0.4;
    }
    return row.topErrorKey === filterMode;
  }

  function getVisibleMasteryRows() {
    const sortMode = getMasterySortMode();
    const filterMode = getMasteryFilterMode();
    const allRows = getMasteryRowsForDisplay();
    const rows = allRows
      .filter((row) => rowMatchesMasteryFilter(row, filterMode))
      .sort((a, b) => compareMasteryRows(a, b, sortMode));
    return { rows, allRows, sortMode, filterMode };
  }

  function getTopMasteryEntry() {
    const rows = getMasteryRowsForDisplay().sort((a, b) => compareMasteryRows(a, b, 'attempts_desc'));
    return rows[0] || null;
  }

  function renderMasteryTable() {
    const tableBody = _el('session-mastery-table-body');
    if (!tableBody) return;
    const sortSelect = _el('s-mastery-sort');
    const filterSelect = _el('s-mastery-filter');
    const filterNote = _el('session-mastery-filter-note');
    const { rows, allRows, sortMode, filterMode } = getVisibleMasteryRows();
    if (sortSelect && sortSelect.value !== sortMode) sortSelect.value = sortMode;
    if (filterSelect && filterSelect.value !== filterMode) filterSelect.value = filterMode;
    if (filterNote) {
      if (!allRows.length) {
        filterNote.textContent = 'Showing all skills.';
      } else {
        filterNote.textContent = `Showing ${rows.length} of ${allRows.length} skills · filter: ${describeMasteryFilterMode(filterMode)} · sort: ${describeMasterySortMode(sortMode)}.`;
      }
    }
    tableBody.innerHTML = '';
    if (!allRows.length || !rows.length) {
      const tr = document.createElement('tr');
      const td = document.createElement('td');
      td.colSpan = 8;
      td.className = 'teacher-mastery-table-empty';
      td.textContent = allRows.length ? 'No skill rows match the current filter.' : 'No skill rounds yet.';
      tr.appendChild(td);
      tableBody.appendChild(tr);
      return;
    }
    rows.forEach((row) => {
      const tr = document.createElement('tr');
      const values = [
        row.label,
        row.accuracyLabel,
        String(row.attempts),
        `${row.hintRounds} (${row.hintRateLabel})`,
        String(row.voiceAttempts),
        row.avgGuessesLabel,
        row.avgTimeLabel,
        row.topErrorLabel
      ];
      values.forEach((value) => {
        const td = document.createElement('td');
        td.textContent = value;
        tr.appendChild(td);
      });
      tableBody.appendChild(tr);
    });
  }

  function renderRosterControls() {
    const select = _el('s-roster-student');
    if (!select) return;
    select.innerHTML = '';
    const none = document.createElement('option');
    none.value = '';
    none.textContent = 'No student selected';
    select.appendChild(none);
    rosterState.students.forEach((name) => {
      const option = document.createElement('option');
      option.value = name;
      option.textContent = name;
      select.appendChild(option);
    });
    select.value = rosterState.active || '';
    const chip = _el('session-active-student');
    if (chip) chip.textContent = `Student: ${getActiveStudentLabel()}`;
    renderPlaylistControls();
    renderGroupBuilderPanel();
    renderStudentLockPanel();
  }

  function renderGroupBuilderPanel() {
    teacherAssignmentsFeature?.renderGroupBuilderPanel?.();
  }

  function renderStudentLockPanel() {
    teacherAssignmentsFeature?.renderStudentLockPanel?.();
  }

  function maybeApplyStudentPlanForActiveStudent(options = {}) {
    return teacherAssignmentsFeature?.maybeApplyStudentPlanForActiveStudent?.(options) || false;
  }

  function addRosterStudent(rawName) {
    const name = String(rawName || '').trim().replace(/\s+/g, ' ');
    if (!name) return false;
    if (rosterState.students.includes(name)) {
      rosterState.active = name;
      saveRosterState();
      renderRosterControls();
      return true;
    }
    rosterState.students.push(name);
    rosterState.students.sort((a, b) => a.localeCompare(b));
    rosterState.active = name;
    saveRosterState();
    renderRosterControls();
    return true;
  }

  function removeActiveRosterStudent() {
    const active = String(rosterState.active || '').trim();
    if (!active) return false;
    rosterState.students = rosterState.students.filter((name) => name !== active);
    rosterState.active = rosterState.students[0] || '';
    teacherAssignmentsFeature?.removeStudentReferences?.(active);
    saveRosterState();
    renderRosterControls();
    return true;
  }

  function clearRosterStudents() {
    rosterState = { students: [], active: '' };
    teacherAssignmentsFeature?.clearStudentAssignments?.();
    saveRosterState();
    renderRosterControls();
  }

  function buildProbeSummary(source) {
    const roundsDone = Math.max(0, Number(source?.roundsDone) || 0);
    const wins = Math.max(0, Number(source?.wins) || 0);
    const totalGuesses = Math.max(0, Number(source?.totalGuesses) || 0);
    const totalDurationMs = Math.max(0, Number(source?.totalDurationMs) || 0);
    const hintRounds = Math.max(0, Number(source?.hintRounds) || 0);
    const accuracy = roundsDone ? `${Math.round((wins / roundsDone) * 100)}%` : '--';
    const avgGuesses = roundsDone ? (totalGuesses / roundsDone).toFixed(1) : '--';
    const avgTime = roundsDone ? formatDurationLabel(totalDurationMs / roundsDone) : '--';
    const hintRate = roundsDone ? `${Math.round((hintRounds / roundsDone) * 100)}%` : '--';
    return { roundsDone, wins, accuracy, avgGuesses, avgTime, hintRate };
  }

  function getProbeRecencyMeta(studentLabel) {
    if (probeState.active && matchesProbeRecordStudent(probeState.student, studentLabel)) {
      return {
        label: 'Probe Recency: In progress',
        detail: 'Current probe is active for this student.',
        tone: ''
      };
    }
    const source = getLatestProbeSourceForStudent(studentLabel);
    if (!source) {
      return {
        label: 'Probe Recency: No baseline',
        detail: 'No probe has been recorded for this student yet.',
        tone: 'warn'
      };
    }
    const dayMs = 24 * 60 * 60 * 1000;
    const completedAt = Math.max(0, Number(source.completedAt || source.startedAt || Date.now()));
    const sourceDate = new Date(completedAt);
    const sourceDay = new Date(sourceDate.getFullYear(), sourceDate.getMonth(), sourceDate.getDate()).getTime();
    const now = new Date();
    const nowDay = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    const daysAgo = Math.max(0, Math.floor((nowDay - sourceDay) / dayMs));
    if (daysAgo <= 7) {
      return {
        label: `Probe Recency: ${daysAgo}d ago`,
        detail: 'Probe baseline is current (within 7 days).',
        tone: 'good'
      };
    }
    if (daysAgo <= 14) {
      return {
        label: `Probe Recency: ${daysAgo}d ago`,
        detail: 'Probe baseline is aging (8-14 days old).',
        tone: ''
      };
    }
    return {
      label: `Probe Recency: ${daysAgo}d ago`,
      detail: 'Probe baseline is overdue (>14 days old).',
      tone: 'warn'
    };
  }

  function getSupportFlagMeta(studentLabel) {
    const current = getLatestProbePerformance(studentLabel);
    if (!current || current.roundsDone <= 0) {
      return {
        label: 'Support Flag: Collect baseline',
        detail: 'Run at least one probe to determine risk band.',
        tone: ''
      };
    }
    const accuracyPct = Math.round(current.accuracyRate * 100);
    const hintPct = Math.round(current.hintRate * 100);
    const avgGuesses = Number(current.avgGuesses.toFixed(1));
    if (accuracyPct < 65 || hintPct >= 60 || avgGuesses >= 5.5) {
      return {
        label: 'Support Flag: Intensive check-in',
        detail: `Accuracy ${accuracyPct}%, hints ${hintPct}%, avg guesses ${avgGuesses}.`,
        tone: 'warn'
      };
    }
    if (accuracyPct < 80 || hintPct >= 40 || avgGuesses >= 4.5) {
      return {
        label: 'Support Flag: Targeted reteach',
        detail: `Accuracy ${accuracyPct}%, hints ${hintPct}%, avg guesses ${avgGuesses}.`,
        tone: 'warn'
      };
    }
    if (accuracyPct >= 92 && hintPct <= 20 && avgGuesses <= 3) {
      return {
        label: 'Support Flag: Ready to stretch',
        detail: `Accuracy ${accuracyPct}%, hints ${hintPct}%, avg guesses ${avgGuesses}.`,
        tone: 'good'
      };
    }
    return {
      label: 'Support Flag: On track',
      detail: `Accuracy ${accuracyPct}%, hints ${hintPct}%, avg guesses ${avgGuesses}.`,
      tone: ''
    };
  }

  function renderProbeSupportChips(studentLabel) {
    const recencyEl = _el('probe-recency-chip');
    const riskEl = _el('session-risk-chip');
    const recency = getProbeRecencyMeta(studentLabel);
    const risk = getSupportFlagMeta(studentLabel);
    if (recencyEl) {
      recencyEl.textContent = recency.label;
      recencyEl.setAttribute('title', recency.detail);
      applyChipTone(recencyEl, recency.tone);
    }
    if (riskEl) {
      riskEl.textContent = risk.label;
      riskEl.setAttribute('title', risk.detail);
      applyChipTone(riskEl, risk.tone);
    }
  }

  function renderProbePanel() {
    const statusEl = _el('probe-status');
    const accuracyEl = _el('probe-accuracy');
    const avgGuessesEl = _el('probe-avg-guesses');
    const avgTimeEl = _el('probe-avg-time');
    const hintRateEl = _el('probe-hint-rate');
    const trendLabelEl = _el('probe-trend-label');
    const trendAccuracyEl = _el('probe-trend-accuracy');
    const trendGuessesEl = _el('probe-trend-guesses');
    const trendTimeEl = _el('probe-trend-time');
    const activeStudent = getActiveStudentLabel();
    const source = getLatestProbeSourceForStudent(activeStudent);
    const summary = buildProbeSummary(source || {});
    const trend = getComparableProbeTrend(activeStudent);
    renderProbeSupportChips(activeStudent);
    if (statusEl) {
      if (probeState.active && matchesProbeRecordStudent(probeState.student, activeStudent)) {
        statusEl.textContent = `Probe: Active (${probeState.roundsDone}/${probeState.roundsTarget})`;
      } else if (source) {
        const when = new Date(source.completedAt || source.startedAt || Date.now());
        statusEl.textContent = `Probe: Last ${when.toLocaleDateString()}`;
      } else {
        statusEl.textContent = 'Probe: Inactive';
      }
    }
    if (accuracyEl) accuracyEl.textContent = `Accuracy: ${summary.accuracy}`;
    if (avgGuessesEl) avgGuessesEl.textContent = `Avg Guesses: ${summary.avgGuesses}`;
    if (avgTimeEl) avgTimeEl.textContent = `Avg Time: ${summary.avgTime}`;
    if (hintRateEl) hintRateEl.textContent = `Hint Rate: ${summary.hintRate}`;

    if (!trend.current || trend.current.roundsDone <= 0) {
      if (trendLabelEl) {
        trendLabelEl.textContent = 'Trend: Waiting for baseline';
        trendLabelEl.setAttribute('title', 'Complete at least one probe to start trend deltas.');
      }
      if (trendAccuracyEl) trendAccuracyEl.textContent = 'Accuracy Δ: --';
      if (trendGuessesEl) trendGuessesEl.textContent = 'Avg Guesses Δ: --';
      if (trendTimeEl) trendTimeEl.textContent = 'Avg Time Δ: --';
      [trendLabelEl, trendAccuracyEl, trendGuessesEl, trendTimeEl].forEach((el) => applyChipTone(el, ''));
      renderStudentGoalPanel();
      return;
    }

    if (!trend.previous || trend.previous.roundsDone <= 0) {
      if (trendLabelEl) {
        trendLabelEl.textContent = trend.activeMatches ? 'Trend: In-progress baseline' : 'Trend: First baseline';
        trendLabelEl.setAttribute('title', 'Need one more probe for week-over-week delta.');
      }
      if (trendAccuracyEl) trendAccuracyEl.textContent = 'Accuracy Δ: baseline';
      if (trendGuessesEl) trendGuessesEl.textContent = 'Avg Guesses Δ: baseline';
      if (trendTimeEl) trendTimeEl.textContent = 'Avg Time Δ: baseline';
      [trendLabelEl, trendAccuracyEl, trendGuessesEl, trendTimeEl].forEach((el) => applyChipTone(el, ''));
      renderStudentGoalPanel();
      return;
    }

    const accuracyDeltaPts = (trend.current.accuracyRate - trend.previous.accuracyRate) * 100;
    const guessesDelta = trend.current.avgGuesses - trend.previous.avgGuesses;
    const timeDeltaSec = trend.current.avgTimeSeconds - trend.previous.avgTimeSeconds;

    if (trendLabelEl) {
      trendLabelEl.textContent = trend.activeMatches ? 'Trend: Live vs last probe' : 'Trend: Week-over-week';
      trendLabelEl.setAttribute('title', 'Compares current probe results to the previous probe for this student.');
    }
    if (trendAccuracyEl) {
      trendAccuracyEl.textContent = `Accuracy Δ: ${formatSignedDelta(accuracyDeltaPts)} pts`;
      applyChipTone(trendAccuracyEl, accuracyDeltaPts > 0 ? 'good' : accuracyDeltaPts < 0 ? 'warn' : '');
    }
    if (trendGuessesEl) {
      trendGuessesEl.textContent = `Avg Guesses Δ: ${formatSignedDelta(guessesDelta)}`;
      applyChipTone(trendGuessesEl, guessesDelta < 0 ? 'good' : guessesDelta > 0 ? 'warn' : '');
    }
    if (trendTimeEl) {
      trendTimeEl.textContent = `Avg Time Δ: ${formatSignedDelta(timeDeltaSec)}s`;
      applyChipTone(trendTimeEl, timeDeltaSec < 0 ? 'good' : timeDeltaSec > 0 ? 'warn' : '');
    }
    applyChipTone(trendLabelEl, '');
    renderStudentGoalPanel();
  }

  function startWeeklyProbe() {
    if (probeState.active) {
      WQUI.showToast('Weekly probe is already active.');
      return;
    }
    const targetSelect = _el('s-probe-rounds');
    const normalizedRounds = normalizeProbeRounds(targetSelect?.value || prefs.probeRounds || DEFAULT_PREFS.probeRounds);
    if (targetSelect) targetSelect.value = normalizedRounds;
    setPref('probeRounds', normalizedRounds);
    probeState = {
      active: true,
      startedAt: Date.now(),
      roundsTarget: Number.parseInt(normalizedRounds, 10),
      roundsDone: 0,
      wins: 0,
      totalGuesses: 0,
      totalDurationMs: 0,
      hintRounds: 0,
      focusLabel: getFocusLabel(_el('setting-focus')?.value || prefs.focus || 'all').replace(/[—]/g, '').trim(),
      gradeLabel: formatGradeBandLabel(_el('s-grade')?.value || prefs.grade || DEFAULT_PREFS.grade),
      student: getActiveStudentLabel()
    };
    renderProbePanel();
    WQUI.showToast(`Weekly probe started (${probeState.roundsTarget} rounds).`);
  }

  function finishWeeklyProbe(options = {}) {
    const silent = !!options.silent;
    if (!probeState.active) {
      if (!silent) WQUI.showToast('No active probe to stop.');
      return;
    }
    const record = {
      startedAt: probeState.startedAt,
      completedAt: Date.now(),
      roundsTarget: probeState.roundsTarget,
      roundsDone: probeState.roundsDone,
      wins: probeState.wins,
      totalGuesses: probeState.totalGuesses,
      totalDurationMs: probeState.totalDurationMs,
      hintRounds: probeState.hintRounds,
      focusLabel: probeState.focusLabel,
      gradeLabel: probeState.gradeLabel,
      student: probeState.student
    };
    probeHistory.unshift(record);
    probeHistory = probeHistory.slice(0, 24);
    saveProbeHistory();
    probeState = createEmptyProbeState();
    renderProbePanel();
    if (!silent) {
      const summary = buildProbeSummary(record);
      WQUI.showToast(`Probe saved: ${summary.accuracy} accuracy across ${record.roundsDone} rounds.`);
    }
  }

  function recordProbeRound(result, roundMetrics) {
    if (!probeState.active) return;
    probeState.roundsDone += 1;
    if (result?.won) probeState.wins += 1;
    probeState.totalGuesses += Math.max(0, Number(roundMetrics?.guessesUsed) || 0);
    probeState.totalDurationMs += Math.max(0, Number(roundMetrics?.durationMs) || 0);
    if (roundMetrics?.hintRequested) probeState.hintRounds += 1;
    if (probeState.roundsDone >= probeState.roundsTarget) {
      finishWeeklyProbe();
      return;
    }
    renderProbePanel();
  }

  function buildProbeSummaryText(options = {}) {
    const studentLabel = String(options.student || getActiveStudentLabel()).trim() || 'Class';
    const source = getLatestProbeSourceForStudent(studentLabel);
    if (!source) return 'No weekly probe results yet.';
    const summary = buildProbeSummary(source);
    const startedAt = new Date(source.startedAt || Date.now());
    const completedAt = source.completedAt ? new Date(source.completedAt) : null;
    return [
      'WordQuest Weekly Probe Summary',
      `Student: ${source.student || studentLabel || 'Class'}`,
      `Focus: ${source.focusLabel || 'Mixed'}`,
      `Grade: ${source.gradeLabel || 'All'}`,
      `Started: ${startedAt.toLocaleString()}`,
      completedAt ? `Completed: ${completedAt.toLocaleString()}` : 'Completed: In progress',
      `Rounds: ${source.roundsDone}/${source.roundsTarget}`,
      `Accuracy: ${summary.accuracy}`,
      `Avg Guesses: ${summary.avgGuesses}`,
      `Avg Time: ${summary.avgTime}`,
      `Hint Rate: ${summary.hintRate}`
    ].filter(Boolean).join('\n');
  }

  function buildCurrentCurriculumSnapshot() {
    const packId = normalizeLessonPackId(prefs.lessonPack || _el('s-lesson-pack')?.value || DEFAULT_PREFS.lessonPack);
    const targetId = normalizeLessonTargetId(packId, prefs.lessonTarget || _el('s-lesson-target')?.value || DEFAULT_PREFS.lessonTarget);
    const focus = _el('setting-focus')?.value || prefs.focus || DEFAULT_PREFS.focus;
    const selectedGrade = _el('s-grade')?.value || prefs.grade || DEFAULT_PREFS.grade;
    const effectiveGrade = getEffectiveGameplayGradeBand(selectedGrade, focus);
    const length = _el('s-length')?.value || prefs.length || DEFAULT_PREFS.length;
    const pack = getLessonPackDefinition(packId);
    const target = getLessonTarget(packId, targetId);
    return {
      packId,
      targetId,
      focus,
      selectedGrade,
      effectiveGrade,
      length,
      packLabel: pack?.label || 'Manual',
      targetLabel: target?.label || '',
      pacing: target?.pacing || ''
    };
  }

  function buildCurriculumSelectionLabel() {
    const snapshot = buildCurrentCurriculumSnapshot();
    if (snapshot.packId === 'custom') return 'Manual mode (no lesson pack)';
    if (!snapshot.targetLabel) return `${snapshot.packLabel} (target not selected)`;
    return `${snapshot.packLabel} · ${snapshot.targetLabel}`;
  }

  function buildMtssIepNoteText() {
    const student = getActiveStudentLabel();
    const now = new Date();
    const topErrorLabel = getTopErrorLabel(sessionSummary.errorTotals);
    const nextStep = getInstructionalNextStep(sessionSummary.errorTotals);
    const assignedPlaylist = getAssignedPlaylistForStudent(student);
    const trend = getComparableProbeTrend(student);
    const recency = getProbeRecencyMeta(student);
    const support = getSupportFlagMeta(student);
    const goalEval = evaluateStudentGoalState(student);
    const goal = goalEval.goal;
    const goalStatusText = `Goal: ${goalEval.statusLabel}`;
    const goalProgressText = `Goal Progress: ${goalEval.progressLabel}`;
    const currentProbe = trend.current;
    const previousProbe = trend.previous;
    const trendLine = (!currentProbe || !previousProbe || currentProbe.roundsDone <= 0 || previousProbe.roundsDone <= 0)
      ? 'Probe trend: baseline in progress (need two probe points for delta).'
      : `Probe trend: accuracy ${formatSignedDelta((currentProbe.accuracyRate - previousProbe.accuracyRate) * 100)} pts, avg guesses ${formatSignedDelta(currentProbe.avgGuesses - previousProbe.avgGuesses)}, avg time ${formatSignedDelta(currentProbe.avgTimeSeconds - previousProbe.avgTimeSeconds)}s versus prior probe.`;
    const sessionWinRate = sessionSummary.rounds
      ? `${Math.round((sessionSummary.wins / sessionSummary.rounds) * 100)}%`
      : '--';
    const sessionAvgGuesses = sessionSummary.rounds
      ? (sessionSummary.totalGuesses / sessionSummary.rounds).toFixed(1)
      : '--';
    const sessionAvgTime = sessionSummary.rounds
      ? formatDurationLabel(sessionSummary.totalDurationMs / sessionSummary.rounds)
      : '--';

    return [
      'WordQuest MTSS/IEP Progress Note',
      `Student: ${student}`,
      `Date: ${now.toLocaleDateString()} ${now.toLocaleTimeString()}`,
      `Curriculum: ${buildCurriculumSelectionLabel()}`,
      assignedPlaylist ? `Assigned Playlist: ${assignedPlaylist.name}` : 'Assigned Playlist: --',
      '',
      'Session Snapshot',
      `Rounds: ${sessionSummary.rounds} | Win Rate: ${sessionWinRate} | Avg Guesses: ${sessionAvgGuesses} | Avg Time: ${sessionAvgTime}`,
      `Hint Rounds: ${sessionSummary.hintRounds} | Voice Attempts: ${sessionSummary.voiceAttempts}`,
      `Top Error Pattern: ${topErrorLabel}`,
      `Instructional Next Step: ${nextStep}`,
      '',
      'Weekly Probe Snapshot',
      buildProbeSummaryText(),
      recency.label,
      support.label,
      trendLine,
      '',
      'Student Goal',
      goal
        ? `Targets: accuracy >= ${goal.accuracyTarget}% and avg guesses <= ${goal.avgGuessesTarget}.`
        : 'Targets: no active goal set for this student.',
      `${goalStatusText} | ${goalProgressText}`,
      '',
      'Teacher Interpretation',
      `Use the next block for targeted reteach: ${nextStep}`
    ].join('\n');
  }

  function pickSamplePracticeWords(limit = 8) {
    const snapshot = buildCurrentCurriculumSnapshot();
    const focus = snapshot.focus || 'all';
    const gradeBand = getEffectiveGameplayGradeBand(snapshot.selectedGrade || snapshot.effectiveGrade, focus);
    const length = snapshot.length || DEFAULT_PREFS.length;
    const pool = WQData.getPlayableWords({
      gradeBand,
      length,
      phonics: focus,
      includeLowerBands: shouldExpandGradeBandForFocus(focus)
    });
    if (!Array.isArray(pool) || !pool.length) return [];
    const copy = [...pool];
    for (let i = copy.length - 1; i > 0; i -= 1) {
      const j = Math.floor(Math.random() * (i + 1));
      [copy[i], copy[j]] = [copy[j], copy[i]];
    }
    return copy.slice(0, Math.max(1, Math.min(12, limit)));
  }

  function buildFamilyHandoutText() {
    const snapshot = buildCurrentCurriculumSnapshot();
    const student = getActiveStudentLabel();
    const assignedPlaylist = getAssignedPlaylistForStudent(student);
    const focusLabel = getFocusLabel(snapshot.focus || 'all').replace(/[—]/g, '').replace(/\s+/g, ' ').trim() || 'Classic';
    const words = pickSamplePracticeWords(8);
    const wordLines = words.length
      ? words.map((word, index) => `${index + 1}. ${String(word || '').toUpperCase()}`).join('\n')
      : 'No words available for the current filters. Adjust lesson target or grade band.';
    return [
      'WordQuest Family Practice Handout',
      `Student: ${student}`,
      `Date: ${new Date().toLocaleDateString()}`,
      `Curriculum Target: ${buildCurriculumSelectionLabel()}`,
      assignedPlaylist ? `Assigned Playlist: ${assignedPlaylist.name}` : 'Assigned Playlist: --',
      `Quest Focus: ${focusLabel}`,
      `Grade Band: ${formatGradeBandLabel(snapshot.effectiveGrade || snapshot.selectedGrade)}`,
      `Word Length: ${formatLengthPrefLabel(snapshot.length)}`,
      '',
      'At-Home Routine (10 minutes)',
      '1. Read each word out loud.',
      '2. Tap or stretch sounds/chunks.',
      '3. Spell the word once from memory.',
      '4. Use two words in oral sentences.',
      '',
      'Practice Word List',
      wordLines,
      '',
      'Family Tip: Keep practice positive and short. Accuracy first, speed second.'
    ].join('\n');
  }

  function getMiniLessonKeyFromSession() {
    return resolveMiniLessonErrorKey(activeMiniLessonKey, sessionSummary.errorTotals);
  }

  function renderMiniLessonPanel() {
    const key = getMiniLessonKeyFromSession();
    const textEl = _el('session-mini-lesson-copy');
    if (!textEl) return;
    const planText = buildMiniLessonPlanText(key);
    textEl.textContent = planText;
    textEl.setAttribute('title', `Current quick mini-lesson: ${ERROR_PATTERN_LABELS[key] || key}`);
  }

  async function copyTextToClipboard(text, successMessage, failureMessage) {
    const value = String(text || '').trim();
    if (!value) {
      WQUI.showToast(failureMessage);
      return;
    }
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(value);
        WQUI.showToast(successMessage);
        return;
      }
    } catch {}
    const fallback = document.createElement('textarea');
    fallback.value = value;
    fallback.setAttribute('readonly', 'true');
    fallback.style.position = 'fixed';
    fallback.style.top = '-9999px';
    document.body.appendChild(fallback);
    fallback.select();
    let copied = false;
    try { copied = document.execCommand('copy'); } catch { copied = false; }
    fallback.remove();
    WQUI.showToast(copied ? successMessage : failureMessage);
  }

  function renderSessionSummary() {
    const roundsEl = _el('session-rounds');
    const winRateEl = _el('session-win-rate');
    const hintRoundsEl = _el('session-hint-rounds');
    const voiceAttemptsEl = _el('session-voice-attempts');
    const topSkillEl = _el('session-top-skill');
    const masteryRateEl = _el('session-mastery-rate');
    const avgGuessesEl = _el('session-avg-guesses');
    const avgTimeEl = _el('session-avg-time');
    const topErrorEl = _el('session-top-error');
    const nextStepEl = _el('session-next-step');
    const studentEl = _el('session-active-student');
    const missionCountEl = _el('session-mission-count');
    const missionScoreEl = _el('session-mission-score');
    const missionCompletionEl = _el('session-mission-complete');
    const missionLevelEl = _el('session-mission-level');

    if (roundsEl) roundsEl.textContent = `Rounds: ${sessionSummary.rounds}`;
    if (winRateEl) {
      const winRate = sessionSummary.rounds
        ? `${Math.round((sessionSummary.wins / sessionSummary.rounds) * 100)}%`
        : '--';
      winRateEl.textContent = `Win Rate: ${winRate}`;
    }
    if (hintRoundsEl) hintRoundsEl.textContent = `Hint Rounds: ${sessionSummary.hintRounds}`;
    if (voiceAttemptsEl) voiceAttemptsEl.textContent = `Voice Attempts: ${sessionSummary.voiceAttempts}`;
    if (studentEl) studentEl.textContent = `Student: ${getActiveStudentLabel()}`;

    const topSkill = getTopMasteryEntry();
    const avgGuesses = sessionSummary.rounds
      ? (sessionSummary.totalGuesses / sessionSummary.rounds).toFixed(1)
      : '--';
    const avgTime = sessionSummary.rounds
      ? formatDurationLabel(sessionSummary.totalDurationMs / sessionSummary.rounds)
      : '--';
    if (topSkillEl) topSkillEl.textContent = `Top Skill: ${topSkill?.label || '--'}`;
    if (masteryRateEl) {
      const masteryRate = topSkill?.accuracyLabel || '--';
      masteryRateEl.textContent = `Mastery: ${masteryRate}`;
    }
    if (avgGuessesEl) avgGuessesEl.textContent = `Avg Guesses: ${avgGuesses}`;
    if (avgTimeEl) avgTimeEl.textContent = `Avg Time: ${avgTime}`;
    if (topErrorEl) topErrorEl.textContent = `Top Error: ${getTopErrorLabel(sessionSummary.errorTotals)}`;
    if (nextStepEl) {
      const chipLabel = getInstructionalNextStepChip(sessionSummary.errorTotals);
      const nextStep = getInstructionalNextStep(sessionSummary.errorTotals);
      nextStepEl.textContent = `Next Step: ${chipLabel}`;
      nextStepEl.setAttribute('title', nextStep);
    }
    const activeStudent = getActiveStudentLabel();
    const missionStats = buildMissionSummaryStats({
      sessionOnly: true,
      student: activeStudent === 'Class' ? '' : activeStudent
    });
    if (missionCountEl) missionCountEl.textContent = `Deep Dive Rounds: ${missionStats.count}`;
    if (missionScoreEl) {
      missionScoreEl.textContent = missionStats.count
        ? `Deep Dive Avg Score: ${Math.round(missionStats.avgScore)}/100 · Strong+ ${Math.round(missionStats.strongRate * 100)}%`
        : 'Deep Dive Avg Score: --';
    }
    if (missionCompletionEl) {
      missionCompletionEl.textContent = missionStats.count
        ? `Deep Dive Completion: ${Math.round(missionStats.completionRate * 100)}% · Avg Attempts ${missionStats.avgAttemptsPerStation.toFixed(1)}/station`
        : 'Deep Dive Completion: --';
    }
    if (missionLevelEl) {
      missionLevelEl.textContent = `Deep Dive Top Level: ${missionStats.topLevelLabel} · On-time ${missionStats.completedCount ? `${Math.round(missionStats.onTimeRate * 100)}%` : '--'}`;
    }
    renderAdoptionHealthPanel();
    renderTelemetryDashboards();
    renderMasteryTable();
    renderMiniLessonPanel();
  }

  function recordSessionRound(result, roundMetrics = {}) {
    sessionSummary.rounds += 1;
    if (result?.won) sessionSummary.wins += 1;
    if (roundMetrics.hintRequested) sessionSummary.hintRounds += 1;
    sessionSummary.voiceAttempts += Math.max(0, Number(roundMetrics.voiceAttempts) || 0);
    sessionSummary.totalGuesses += Math.max(0, Number(roundMetrics.guessesUsed) || 0);
    sessionSummary.totalDurationMs += Math.max(0, Number(roundMetrics.durationMs) || 0);
    mergeCounterMaps(sessionSummary.errorTotals, roundMetrics.errorCounts);

    const skillKey = String(roundMetrics.skillKey || 'classic:all').trim();
    const prior = sessionSummary.masteryBySkill[skillKey] || {
      label: String(roundMetrics.skillLabel || 'Classic mixed practice'),
      rounds: 0,
      wins: 0,
      hintRounds: 0,
      voiceAttempts: 0,
      totalGuesses: 0,
      totalDurationMs: 0,
      errorCounts: Object.create(null)
    };
    prior.label = String(roundMetrics.skillLabel || prior.label || skillKey);
    prior.rounds += 1;
    if (result?.won) prior.wins += 1;
    if (roundMetrics.hintRequested) prior.hintRounds += 1;
    prior.voiceAttempts += Math.max(0, Number(roundMetrics.voiceAttempts) || 0);
    prior.totalGuesses += Math.max(0, Number(roundMetrics.guessesUsed) || 0);
    prior.totalDurationMs += Math.max(0, Number(roundMetrics.durationMs) || 0);
    prior.errorCounts = mergeCounterMaps(prior.errorCounts || Object.create(null), roundMetrics.errorCounts);
    sessionSummary.masteryBySkill[skillKey] = prior;

    saveSessionSummaryState();
    renderSessionSummary();
  }

  function recordVoiceAttempt() {
    const state = WQGame.getState?.();
    if (state?.word && !state?.gameOver) {
      currentRoundVoiceAttempts += 1;
    } else {
      sessionSummary.voiceAttempts += 1;
      saveSessionSummaryState();
      renderSessionSummary();
    }
  }

  function buildSessionSummaryText() {
    const startedAt = new Date(sessionSummary.startedAt || Date.now());
    const activeStudent = getActiveStudentLabel();
    const winRate = sessionSummary.rounds
      ? `${Math.round((sessionSummary.wins / sessionSummary.rounds) * 100)}%`
      : '--';
    const avgGuesses = sessionSummary.rounds
      ? (sessionSummary.totalGuesses / sessionSummary.rounds).toFixed(1)
      : '--';
    const avgTime = sessionSummary.rounds
      ? formatDurationLabel(sessionSummary.totalDurationMs / sessionSummary.rounds)
      : '--';
    const missionStats = buildMissionSummaryStats({
      sessionOnly: true,
      student: activeStudent === 'Class' ? '' : activeStudent
    });
    return [
      'WordQuest Session Summary',
      `Student: ${activeStudent}`,
      `Started: ${startedAt.toLocaleString()}`,
      `Rounds: ${sessionSummary.rounds}`,
      `Wins: ${sessionSummary.wins}`,
      `Win Rate: ${winRate}`,
      `Hint Rounds: ${sessionSummary.hintRounds}`,
      `Voice Attempts: ${sessionSummary.voiceAttempts}`,
      `Avg Guesses: ${avgGuesses}`,
      `Avg Time: ${avgTime}`,
      `Top Error Pattern: ${getTopErrorLabel(sessionSummary.errorTotals)}`,
      `Next Instructional Step: ${getInstructionalNextStep(sessionSummary.errorTotals)}`,
      `Deep Dive Rounds: ${missionStats.count}`,
      `Deep Dive Avg Score: ${missionStats.count ? `${Math.round(missionStats.avgScore)}/100` : '--'}`,
      `Deep Dive Strong+ Rate: ${missionStats.count ? `${Math.round(missionStats.strongRate * 100)}%` : '--'}`,
      `Deep Dive Completion: ${missionStats.count ? `${Math.round(missionStats.completionRate * 100)}%` : '--'}`,
      `Deep Dive On-time: ${missionStats.completedCount ? `${Math.round(missionStats.onTimeRate * 100)}%` : '--'}`,
      `Deep Dive Top Level: ${missionStats.topLevelLabel}`
    ].join('\n');
  }

  function buildSessionSummaryCsvText() {
    const rounds = Math.max(0, Number(sessionSummary.rounds) || 0);
    const avgGuesses = rounds
      ? (sessionSummary.totalGuesses / rounds).toFixed(1)
      : '--';
    const avgTimeSeconds = rounds
      ? Number(((sessionSummary.totalDurationMs / rounds) / 1000).toFixed(1))
      : 0;
    const winRate = rounds
      ? `${Math.round((sessionSummary.wins / rounds) * 100)}%`
      : '--';
    const topSkill = getTopMasteryEntry();
    const activeStudent = getActiveStudentLabel();
    const missionStats = buildMissionSummaryStats({
      sessionOnly: true,
      student: activeStudent === 'Class' ? '' : activeStudent
    });
    const lines = [[
      'Student',
      'Generated',
      'Started',
      'Rounds',
      'Wins',
      'Win Rate',
      'Hint Rounds',
      'Voice Attempts',
      'Avg Guesses',
      'Avg Time (s)',
      'Top Error Pattern',
      'Next Instructional Step',
      'Top Skill',
      'Top Skill Accuracy',
      'Deep Dive Rounds',
      'Deep Dive Avg Score',
      'Deep Dive Strong+',
      'Deep Dive Completion',
      'Deep Dive On-Time',
      'Deep Dive Top Level'
    ], [
      activeStudent,
      new Date().toLocaleString(),
      new Date(sessionSummary.startedAt || Date.now()).toLocaleString(),
      String(rounds),
      String(Math.max(0, Number(sessionSummary.wins) || 0)),
      winRate,
      String(Math.max(0, Number(sessionSummary.hintRounds) || 0)),
      String(Math.max(0, Number(sessionSummary.voiceAttempts) || 0)),
      avgGuesses,
      String(avgTimeSeconds),
      getTopErrorLabel(sessionSummary.errorTotals),
      getInstructionalNextStep(sessionSummary.errorTotals),
      topSkill?.label || '--',
      topSkill?.accuracyLabel || '--',
      String(missionStats.count),
      missionStats.count ? `${Math.round(missionStats.avgScore)}/100` : '--',
      missionStats.count ? `${Math.round(missionStats.strongRate * 100)}%` : '--',
      missionStats.count ? `${Math.round(missionStats.completionRate * 100)}%` : '--',
      missionStats.completedCount ? `${Math.round(missionStats.onTimeRate * 100)}%` : '--',
      missionStats.topLevelLabel
    ]];
    return lines.map((line) => line.map(csvEscapeCell).join(',')).join('\n');
  }

  function buildMasteryReportText() {
    const { rows, allRows, sortMode, filterMode } = getVisibleMasteryRows();
    const header = [
      'WordQuest Mastery Report',
      `Student: ${getActiveStudentLabel()}`,
      `Generated: ${new Date().toLocaleString()}`,
      `Session rounds: ${sessionSummary.rounds}`,
      `Filter: ${describeMasteryFilterMode(filterMode)}`,
      `Sort: ${describeMasterySortMode(sortMode)}`,
      `Next Instructional Step: ${getInstructionalNextStep(sessionSummary.errorTotals)}`
    ];
    if (!allRows.length) return [...header, 'No skill rows yet.'].join('\n');
    if (!rows.length) return [...header, 'No skill rows match the current filter.'].join('\n');
    const lines = rows.map((row) => {
      return `${row.label}: accuracy ${row.accuracyLabel} | attempts ${row.attempts} | hints ${row.hintRounds} (${row.hintRateLabel}) | voice attempts ${row.voiceAttempts} | avg guesses ${row.avgGuessesLabel} | avg time ${row.avgTimeLabel} | top error ${row.topErrorLabel}`;
    });
    return [...header, '', ...lines].join('\n');
  }

  function csvEscapeCell(value) {
    const text = String(value ?? '');
    if (!/[",\n]/.test(text)) return text;
    return `"${text.replace(/"/g, '""')}"`;
  }

  function sanitizeFilenameToken(value, fallback = 'class') {
    const normalized = String(value || '')
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
    return normalized || fallback;
  }

  function buildCsvBundlePrefix() {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const hour = String(now.getHours()).padStart(2, '0');
    const minute = String(now.getMinutes()).padStart(2, '0');
    const student = sanitizeFilenameToken(getActiveStudentLabel(), 'class');
    return `wordquest-${student}-${year}${month}${day}-${hour}${minute}`;
  }

  function downloadTextFile(filename, content, mimeType = 'text/plain;charset=utf-8') {
    try {
      const text = String(content ?? '');
      const withBom = mimeType.startsWith('text/csv') ? `\uFEFF${text}` : text;
      const blob = new Blob([withBom], { type: mimeType });
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = filename;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      return true;
    } catch {
      return false;
    }
  }

  function buildMasteryReportCsvText() {
    const { rows, allRows, sortMode, filterMode } = getVisibleMasteryRows();
    const generated = new Date().toLocaleString();
    const student = getActiveStudentLabel();
    const lines = [[
      'Student',
      'Generated',
      'Filter',
      'Sort',
      'Skill',
      'Accuracy',
      'Attempts',
      'Wins',
      'Hint Rounds',
      'Hint Rate',
      'Voice Attempts',
      'Avg Guesses',
      'Avg Time (s)',
      'Top Error',
      'Session Next Step'
    ]];
    const filterLabel = describeMasteryFilterMode(filterMode);
    const sortLabel = describeMasterySortMode(sortMode);
    const nextStep = getInstructionalNextStep(sessionSummary.errorTotals);
    if (!allRows.length) {
      lines.push([student, generated, filterLabel, sortLabel, 'No skill rows yet.', '', '', '', '', '', '', '', '', '', nextStep]);
    } else if (!rows.length) {
      lines.push([student, generated, filterLabel, sortLabel, 'No skill rows match current filter.', '', '', '', '', '', '', '', '', '', nextStep]);
    } else {
      rows.forEach((row) => {
        lines.push([
          student,
          generated,
          filterLabel,
          sortLabel,
          row.label,
          row.accuracyLabel,
          String(row.attempts),
          String(row.wins),
          String(row.hintRounds),
          row.hintRateLabel,
          String(row.voiceAttempts),
          row.avgGuessesLabel,
          String(row.avgTimeSeconds),
          row.topErrorLabel,
          nextStep
        ]);
      });
    }
    return lines.map((line) => line.map(csvEscapeCell).join(',')).join('\n');
  }

  function buildProbeSummaryCsvText() {
    const lines = [[
      'Student',
      'Focus',
      'Grade',
      'Status',
      'Started',
      'Completed',
      'Rounds Done',
      'Rounds Target',
      'Accuracy',
      'Avg Guesses',
      'Avg Time (s)',
      'Hint Rate'
    ]];
    const records = [];
    if (probeState.active) {
      records.push({
        ...probeState,
        completedAt: 0,
        status: 'Active'
      });
    }
    probeHistory.forEach((record) => {
      records.push({
        ...record,
        status: 'Completed'
      });
    });
    if (!records.length) {
      lines.push(['Class', '', '', 'No probe records yet', '', '', '', '', '', '', '', '']);
      return lines.map((line) => line.map(csvEscapeCell).join(',')).join('\n');
    }
    records.forEach((record) => {
      const summary = buildProbeSummary(record);
      const started = new Date(record.startedAt || Date.now()).toLocaleString();
      const completed = record.completedAt ? new Date(record.completedAt).toLocaleString() : '';
      lines.push([
        String(record.student || 'Class'),
        String(record.focusLabel || 'Mixed'),
        String(record.gradeLabel || 'All'),
        String(record.status || 'Completed'),
        started,
        completed,
        String(Math.max(0, Number(record.roundsDone) || 0)),
        String(Math.max(0, Number(record.roundsTarget) || 0)),
        summary.accuracy,
        summary.avgGuesses,
        String(Math.max(0, Number(record.roundsDone) || 0)
          ? Number(((Math.max(0, Number(record.totalDurationMs) || 0) / Math.max(1, Number(record.roundsDone) || 1)) / 1000).toFixed(1))
          : 0),
        summary.hintRate
      ]);
    });
    return lines.map((line) => line.map(csvEscapeCell).join(',')).join('\n');
  }

  function buildClassRollupCsvText() {
    const students = new Set();
    rosterState.students.forEach((name) => {
      const normalized = String(name || '').trim();
      if (normalized) students.add(normalized);
    });
    probeHistory.forEach((record) => {
      const normalized = String(record?.student || '').trim() || 'Class';
      students.add(normalized);
    });
    if (probeState.active) {
      students.add(String(probeState.student || '').trim() || 'Class');
    }
    if (!students.size) students.add('Class');

    const lines = [[
      'Student',
      'Probe Status',
      'Probe Date',
      'Probe Recency',
      'Accuracy',
      'Avg Guesses',
      'Avg Time (s)',
      'Hint Rate',
      'Support Flag',
      'Accuracy Delta (pts)',
      'Guess Delta',
      'Time Delta (s)',
      'Goal Accuracy Target',
      'Goal Avg Guesses Target',
      'Goal Status',
      'Goal Progress'
    ]];

    Array.from(students).sort((a, b) => a.localeCompare(b)).forEach((student) => {
      const source = getLatestProbeSourceForStudent(student);
      const summary = buildProbeSummary(source || {});
      const trend = getComparableProbeTrend(student);
      const goalEval = evaluateStudentGoalState(student);
      const goal = goalEval.goal;
      const recency = getProbeRecencyMeta(student);
      const support = getSupportFlagMeta(student);

      const hasTrend = Boolean(trend.current && trend.previous && trend.current.roundsDone > 0 && trend.previous.roundsDone > 0);
      const accuracyDelta = hasTrend
        ? formatSignedDelta((trend.current.accuracyRate - trend.previous.accuracyRate) * 100)
        : '--';
      const guessesDelta = hasTrend
        ? formatSignedDelta(trend.current.avgGuesses - trend.previous.avgGuesses)
        : '--';
      const timeDelta = hasTrend
        ? formatSignedDelta(trend.current.avgTimeSeconds - trend.previous.avgTimeSeconds)
        : '--';

      const probeDate = source
        ? new Date(source.completedAt || source.startedAt || Date.now()).toLocaleDateString()
        : '';
      const probeStatus = source
        ? (probeState.active && matchesProbeRecordStudent(probeState.student, student) ? 'Active' : 'Recent')
        : 'No probe data';
      const avgTimeSeconds = source && Math.max(0, Number(source.roundsDone) || 0) > 0
        ? Number(((Math.max(0, Number(source.totalDurationMs) || 0) / Math.max(1, Number(source.roundsDone) || 1)) / 1000).toFixed(1))
        : 0;

      lines.push([
        student,
        probeStatus,
        probeDate,
        recency.label.replace(/^Probe Recency:\s*/, ''),
        summary.accuracy,
        summary.avgGuesses,
        String(avgTimeSeconds),
        summary.hintRate,
        support.label.replace(/^Support Flag:\s*/, ''),
        accuracyDelta,
        guessesDelta,
        timeDelta,
        goal ? String(goal.accuracyTarget) : '',
        goal ? String(goal.avgGuessesTarget) : '',
        goalEval.statusLabel,
        goalEval.progressLabel
      ]);
    });
    return lines.map((line) => line.map(csvEscapeCell).join(',')).join('\n');
  }

  function getMissionLabRecords(options = {}) {
    const newestFirst = options.newestFirst !== false;
    const sessionOnly = !!options.sessionOnly;
    const startedAt = Math.max(0, Number(options.startedAt || sessionSummary?.startedAt || 0));
    const studentFilterRaw = String(options.student || '').trim();
    const studentFilter = studentFilterRaw && studentFilterRaw !== 'Class' ? studentFilterRaw : '';
    let records = [];
    try {
      const raw = JSON.parse(localStorage.getItem(CHALLENGE_REFLECTION_KEY) || '[]');
      records = Array.isArray(raw) ? raw : [];
    } catch {
      records = [];
    }
    const normalized = records
      .filter((record) => record && typeof record === 'object')
      .map((record) => {
        const tasks = record.tasks && typeof record.tasks === 'object' ? record.tasks : {};
        const taskOutcomesRaw = Array.isArray(record.taskOutcomes) ? record.taskOutcomes : [];
        const taskOutcomesByTask = taskOutcomesRaw.reduce((map, row) => {
          const key = String(row?.task || '').trim();
          if (!key) return map;
          map[key] = row;
          return map;
        }, Object.create(null));
        const taskOutcomes = CHALLENGE_TASK_FLOW.map((task) => {
          const row = taskOutcomesByTask[task];
          return {
            task,
            complete: typeof row?.complete === 'boolean' ? !!row.complete : !!tasks?.[task],
            attempts: Math.max(0, Number(row?.attempts) || 0)
          };
        });
        const score = Math.max(0, Number(record.score) || 0);
        const doneCount = ['listen', 'analyze', 'create']
          .reduce((count, task) => count + (taskOutcomes.find((row) => row.task === task)?.complete ? 1 : 0), 0);
        const attemptTotal = taskOutcomes.reduce((sum, row) => sum + row.attempts, 0);
        const completed = typeof record.completed === 'boolean'
          ? !!record.completed
          : doneCount >= 2;
        const onTime = completed
          ? (typeof record.onTime === 'boolean' ? !!record.onTime : false)
          : false;
        return {
          attemptId: String(record.attemptId || '').trim(),
          source: String(record.source || 'reveal').trim() || 'reveal',
          student: String(record.student || 'Class').trim() || 'Class',
          ts: Math.max(0, Number(record.ts) || 0),
          word: String(record.word || '').trim().toUpperCase(),
          topic: String(record.topic || '').trim(),
          grade: String(record.grade || '').trim(),
          level: normalizeThinkingLevel(record.level, 'apply'),
          score,
          scoreBand: String(record.scoreBand || resolveMissionScoreBand(score)).trim() || resolveMissionScoreBand(score),
          clarity: Math.max(0, Number(record.clarity) || 0),
          evidence: Math.max(0, Number(record.evidence) || 0),
          vocabulary: Math.max(0, Number(record.vocabulary) || 0),
          completed,
          onTime,
          secondsLeft: Math.max(0, Number(record.secondsLeft) || 0),
          analyze: String(record.analyze || '').trim(),
          create: String(record.create || '').trim(),
          tasks: {
            listen: !!taskOutcomes.find((row) => row.task === 'listen')?.complete,
            analyze: !!taskOutcomes.find((row) => row.task === 'analyze')?.complete,
            create: !!taskOutcomes.find((row) => row.task === 'create')?.complete
          },
          taskOutcomes,
          attemptTotal,
          avgAttemptsPerStation: attemptTotal / CHALLENGE_TASK_FLOW.length
        };
      })
      .filter((record) => record.ts > 0);
    const sessionScoped = sessionOnly && startedAt > 0
      ? normalized.filter((record) => record.ts >= startedAt)
      : normalized;
    const studentScoped = studentFilter
      ? sessionScoped.filter((record) => record.student === studentFilter)
      : sessionScoped;
    studentScoped.sort((a, b) => newestFirst ? (b.ts - a.ts) : (a.ts - b.ts));
    return studentScoped;
  }

  function buildMissionSummaryStats(options = {}) {
    const records = getMissionLabRecords(options);
    if (!records.length) {
      return {
        records,
        count: 0,
        avgScore: 0,
        avgAttemptsPerStation: 0,
        completionRate: 0,
        completedCount: 0,
        onTimeRate: 0,
        strongRate: 0,
        topLevel: '',
        topLevelLabel: '--'
      };
    }
    const totalScore = records.reduce((sum, record) => sum + Math.max(0, Number(record.score) || 0), 0);
    const completedCount = records.reduce((count, record) => count + (record.completed ? 1 : 0), 0);
    const onTimeCount = records.reduce((count, record) => count + (record.completed && record.onTime ? 1 : 0), 0);
    const totalAttempts = records.reduce((sum, record) => sum + Math.max(0, Number(record.attemptTotal) || 0), 0);
    const strongCount = records.reduce((count, record) => (
      count + (record.score >= CHALLENGE_STRONG_SCORE_MIN ? 1 : 0)
    ), 0);
    const levelCounts = records.reduce((map, record) => {
      const level = normalizeThinkingLevel(record.level, '');
      if (!level) return map;
      map[level] = (map[level] || 0) + 1;
      return map;
    }, Object.create(null));
    const topLevel = Object.entries(levelCounts)
      .sort((a, b) => (b[1] - a[1]) || String(a[0]).localeCompare(String(b[0])))
      .map(([level]) => level)[0] || '';
    return {
      records,
      count: records.length,
      avgScore: totalScore / records.length,
      avgAttemptsPerStation: (totalAttempts / records.length) / CHALLENGE_TASK_FLOW.length,
      completionRate: completedCount / records.length,
      completedCount,
      onTimeRate: completedCount ? (onTimeCount / completedCount) : 0,
      strongRate: strongCount / records.length,
      topLevel,
      topLevelLabel: topLevel ? getChallengeLevelDisplay(topLevel) : '--'
    };
  }

  function buildMissionSummaryText() {
    const activeStudent = getActiveStudentLabel();
    const stats = buildMissionSummaryStats({
      sessionOnly: true,
      student: activeStudent === 'Class' ? '' : activeStudent
    });
    const recent = stats.records[0] || null;
    const lines = [
      'WordQuest Deep Dive Summary',
      `Student: ${activeStudent}`,
      `Generated: ${new Date().toLocaleString()}`,
      `Session started: ${new Date(sessionSummary.startedAt || Date.now()).toLocaleString()}`,
      `Deep Dive rounds: ${stats.count}`,
      `Deep Dive average score: ${stats.count ? `${Math.round(stats.avgScore)}/100` : '--'}`,
      `Strong+ rounds: ${stats.count ? `${Math.round(stats.strongRate * 100)}%` : '--'}`,
      `Deep Dive completion: ${stats.count ? `${Math.round(stats.completionRate * 100)}%` : '--'}`,
      `Average attempts per station: ${stats.count ? stats.avgAttemptsPerStation.toFixed(1) : '--'}`,
      `On-time finishes: ${stats.completedCount ? `${Math.round(stats.onTimeRate * 100)}%` : '--'}`,
      `Most-used thinking level: ${stats.topLevelLabel}`
    ];
    if (recent) {
      lines.push(
        '',
        'Most recent Deep Dive',
        `${new Date(recent.ts).toLocaleString()} · ${recent.word || '--'} · ${recent.topic || '--'} · Grade ${recent.grade || '--'} · Student ${recent.student || 'Class'}`,
        `Level: ${getChallengeLevelDisplay(recent.level)} · Score: ${recent.score}/100 (${recent.scoreBand}) · On time: ${recent.onTime ? 'yes' : 'no'}`
      );
    }
    return lines.join('\n');
  }

  function buildMissionLabCsvText() {
    const records = getMissionLabRecords({ newestFirst: false });
    const lines = [[
      'Timestamp',
      'Deep Dive ID',
      'Source',
      'Student',
      'Word',
      'Topic',
      'Grade',
      'Thinking Level',
      'Score Band',
      'Deep Dive Score',
      'Clarity',
      'Evidence',
      'Vocabulary',
      'Completed',
      'On Time',
      'Seconds Left',
      'Listen Complete',
      'Analyze Complete',
      'Create Complete',
      'Analyze Response',
      'Create Response'
    ]];
    if (!records.length) {
      lines.push(['', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', 'No Deep Dive records yet.', '']);
      return lines.map((line) => line.map(csvEscapeCell).join(',')).join('\n');
    }
    records.forEach((record) => {
      const tasks = record?.tasks || {};
      lines.push([
        new Date(Number(record?.ts) || Date.now()).toLocaleString(),
        String(record?.attemptId || ''),
        String(record?.source || ''),
        String(record?.student || ''),
        String(record?.word || ''),
        String(record?.topic || ''),
        String(record?.grade || ''),
        String(record?.level || ''),
        String(record?.scoreBand || ''),
        String(Math.max(0, Number(record?.score) || 0)),
        String(Math.max(0, Number(record?.clarity) || 0)),
        String(Math.max(0, Number(record?.evidence) || 0)),
        String(Math.max(0, Number(record?.vocabulary) || 0)),
        record?.completed ? 'yes' : 'no',
        record?.onTime ? 'yes' : 'no',
        String(Math.max(0, Number(record?.secondsLeft) || 0)),
        tasks.listen ? 'yes' : 'no',
        tasks.analyze ? 'yes' : 'no',
        tasks.create ? 'yes' : 'no',
        String(record?.analyze || ''),
        String(record?.create || '')
      ]);
    });
    return lines.map((line) => line.map(csvEscapeCell).join(',')).join('\n');
  }

  function downloadClassRollupCsv() {
    const prefix = buildCsvBundlePrefix();
    const filename = `${prefix}-class-rollup.csv`;
    if (downloadTextFile(filename, buildClassRollupCsvText(), 'text/csv;charset=utf-8')) {
      WQUI.showToast('Class rollup CSV download started.');
      return;
    }
    WQUI.showToast('Could not start class rollup download on this device.');
  }

  function downloadCsvBundle() {
    const prefix = buildCsvBundlePrefix();
    const files = [
      { name: `${prefix}-session-summary.csv`, content: buildSessionSummaryCsvText() },
      { name: `${prefix}-mastery.csv`, content: buildMasteryReportCsvText() },
      { name: `${prefix}-probe.csv`, content: buildProbeSummaryCsvText() },
      { name: `${prefix}-class-rollup.csv`, content: buildClassRollupCsvText() },
      { name: `${prefix}-deep-dive.csv`, content: buildMissionLabCsvText() }
    ];
    const started = files.reduce((count, file) => (
      count + (downloadTextFile(file.name, file.content, 'text/csv;charset=utf-8') ? 1 : 0)
    ), 0);
    if (started === files.length) {
      WQUI.showToast(`CSV bundle download started (${files.length} files).`);
      return;
    }
    if (started > 0) {
      WQUI.showToast(`CSV bundle partially downloaded (${started}/${files.length}).`);
      return;
    }
    WQUI.showToast('Could not start CSV bundle download on this device.');
  }

  async function copySessionSummary() {
    await copyTextToClipboard(
      buildSessionSummaryText(),
      'Session summary copied.',
      'Could not copy summary on this device.'
    );
  }

  function buildSessionOutcomesSummaryText() {
    const rounds = Math.max(0, Number(sessionSummary.rounds) || 0);
    const masteryRows = getSortedMasteryRows();
    const topSkill = masteryRows[0] || null;
    const generatedAt = new Date().toLocaleString();
    const focusValue = String(_el('setting-focus')?.value || prefs.focus || DEFAULT_PREFS.focus || 'all').trim() || 'all';
    const focusLabel = getFocusLabel(focusValue).replace(/[—]/g, '').replace(/\s+/g, ' ').trim() || 'Classic';
    const presetId = detectTeacherPreset();
    const presetBtn = presetId ? document.querySelector(`[data-teacher-preset="${presetId}"]`) : null;
    const presetLabel = presetBtn instanceof HTMLElement
      ? String(presetBtn.textContent || '').replace(/\s+/g, ' ').trim()
      : 'Custom';
    const missionStats = buildMissionSummaryStats({
      sessionOnly: true,
      student: getActiveStudentLabel() === 'Class' ? '' : getActiveStudentLabel()
    });
    const trend = getComparableProbeTrend(getActiveStudentLabel());
    const hasTrend = Boolean(trend.current && trend.previous && trend.current.roundsDone > 0 && trend.previous.roundsDone > 0);
    const trendLabel = hasTrend
      ? `Accuracy ${formatSignedDelta((trend.current.accuracyRate - trend.previous.accuracyRate) * 100, 0)} pts, Avg guesses ${formatSignedDelta(trend.current.avgGuesses - trend.previous.avgGuesses)}`
      : 'Not enough probe trend data yet.';
    const startedAt = new Date(sessionSummary.startedAt || Date.now()).toLocaleString();
    return [
      `Session outcomes (${startedAt})`,
      `Timestamp: ${generatedAt}`,
      `Active focus: ${focusLabel}`,
      `Active preset: ${presetLabel}`,
      `Attempts: ${rounds}`,
      `Mastery trend: ${topSkill ? `${topSkill.label} at ${topSkill.accuracyLabel} across ${topSkill.attempts} attempts` : 'No mastery rows yet.'}`,
      `Probe trend: ${trendLabel}`,
      `Deep Dive completion: ${missionStats.count ? `${Math.round(missionStats.completionRate * 100)}% (${missionStats.completedCount}/${missionStats.count})` : '--'}`
    ].join('\n');
  }

  async function copySessionOutcomesSummary() {
    await copyTextToClipboard(
      buildSessionOutcomesSummaryText(),
      'Session outcomes copied.',
      'Could not copy session outcomes on this device.'
    );
  }

  async function copyMasterySummary() {
    await copyTextToClipboard(
      buildMasteryReportText(),
      'Mastery report copied.',
      'Could not copy mastery report on this device.'
    );
  }

  async function copyMasterySummaryCsv() {
    await copyTextToClipboard(
      buildMasteryReportCsvText(),
      'Mastery CSV copied.',
      'Could not copy mastery CSV on this device.'
    );
  }

  async function copyMissionSummary() {
    await copyTextToClipboard(
      buildMissionSummaryText(),
      'Deep Dive summary copied.',
      'Could not copy Deep Dive summary on this device.'
    );
  }

  async function copyMissionSummaryCsv() {
    await copyTextToClipboard(
      buildMissionLabCsvText(),
      'Deep Dive CSV copied.',
      'Could not copy Deep Dive CSV on this device.'
    );
  }

  async function copyProbeSummary() {
    await copyTextToClipboard(
      buildProbeSummaryText(),
      'Probe summary copied.',
      'Could not copy probe summary on this device.'
    );
  }

  async function copyProbeSummaryCsv() {
    await copyTextToClipboard(
      buildProbeSummaryCsvText(),
      'Probe CSV copied.',
      'Could not copy probe CSV on this device.'
    );
  }

  async function copyMtssIepNote() {
    await copyTextToClipboard(
      buildMtssIepNoteText(),
      'MTSS/IEP note copied.',
      'Could not copy MTSS/IEP note on this device.'
    );
  }

  async function copyMiniLessonPlan() {
    const key = getMiniLessonKeyFromSession();
    await copyTextToClipboard(
      buildMiniLessonPlanText(key),
      'Mini-lesson plan copied.',
      'Could not copy mini-lesson plan on this device.'
    );
  }

  async function copyFamilyHandout() {
    await copyTextToClipboard(
      buildFamilyHandoutText(),
      'Family handout copied.',
      'Could not copy family handout on this device.'
    );
  }

  function downloadFamilyHandout() {
    const prefix = buildCsvBundlePrefix();
    const filename = `${prefix}-family-handout.txt`;
    if (downloadTextFile(filename, buildFamilyHandoutText(), 'text/plain;charset=utf-8')) {
      WQUI.showToast('Family handout download started.');
      return;
    }
    WQUI.showToast('Could not start family handout download on this device.');
  }

  function resetSessionSummary() {
    sessionSummary = {
      rounds: 0,
      wins: 0,
      hintRounds: 0,
      voiceAttempts: 0,
      totalGuesses: 0,
      totalDurationMs: 0,
      errorTotals: Object.create(null),
      masteryBySkill: Object.create(null),
      startedAt: Date.now()
    };
    saveSessionSummaryState();
    renderSessionSummary();
    renderProbePanel();
  }

  const QUEST_LOOP_KEY = 'wq_v2_quest_loop_v1';
  const QUEST_TIERS = Object.freeze([
    Object.freeze({ id: 'rookie',  label: 'Rookie',  minXp: 0,   reward: 'Bronze chest unlocked' }),
    Object.freeze({ id: 'allstar', label: 'All-Star', minXp: 220, reward: 'Silver spotlight unlocked' }),
    Object.freeze({ id: 'legend',  label: 'Legend',  minXp: 520, reward: 'Gold crown unlocked' })
  ]);

  function localDayKey(date = new Date()) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  function isConsecutiveDay(prevDay, nextDay) {
    if (!prevDay || !nextDay) return false;
    const prev = new Date(`${prevDay}T12:00:00`);
    const next = new Date(`${nextDay}T12:00:00`);
    if (Number.isNaN(prev.getTime()) || Number.isNaN(next.getTime())) return false;
    const diffDays = Math.round((next.getTime() - prev.getTime()) / 86400000);
    return diffDays === 1;
  }

  function resolveQuestTier(xpValue) {
    const xp = Math.max(0, Number(xpValue) || 0);
    let active = QUEST_TIERS[0];
    QUEST_TIERS.forEach((tier) => {
      if (xp >= tier.minXp) active = tier;
    });
    return active;
  }

  function loadQuestLoopState() {
    const fallback = {
      xp: 0,
      rounds: 0,
      wins: 0,
      dailyStreak: 0,
      lastWinDay: ''
    };

    try {
      const parsed = JSON.parse(localStorage.getItem(QUEST_LOOP_KEY) || 'null');
      if (!parsed || typeof parsed !== 'object') return fallback;
      return {
        xp: Math.max(0, Math.floor(Number(parsed.xp) || 0)),
        rounds: Math.max(0, Math.floor(Number(parsed.rounds) || 0)),
        wins: Math.max(0, Math.floor(Number(parsed.wins) || 0)),
        dailyStreak: Math.max(0, Math.floor(Number(parsed.dailyStreak) || 0)),
        lastWinDay: typeof parsed.lastWinDay === 'string' ? parsed.lastWinDay : ''
      };
    } catch {
      return fallback;
    }
  }

  function saveQuestLoopState(state) {
    try {
      localStorage.setItem(QUEST_LOOP_KEY, JSON.stringify(state));
    } catch {}
  }

  function getQuestTierProgress(xpValue) {
    const xp = Math.max(0, Number(xpValue) || 0);
    const tier = resolveQuestTier(xp);
    const tierIndex = QUEST_TIERS.findIndex((item) => item.id === tier.id);
    const nextTier = QUEST_TIERS[tierIndex + 1] || null;
    if (!nextTier) {
      return { percent: 100, nextTier: null, remainingXp: 0 };
    }
    const span = Math.max(1, nextTier.minXp - tier.minXp);
    const progressed = Math.max(0, Math.min(span, xp - tier.minXp));
    const percent = Math.round((progressed / span) * 100);
    return {
      percent,
      nextTier,
      remainingXp: Math.max(0, nextTier.minXp - xp)
    };
  }

  function renderQuestLoop(state) {
    const tier = resolveQuestTier(state.xp);
    const progress = getQuestTierProgress(state.xp);

    const tierChip = _el('quest-tier-chip');
    const xpLabel = _el('quest-xp');
    const streakLabel = _el('quest-streak');
    const progressEl = _el('quest-progress');
    const progressFill = _el('quest-progress-fill');
    const nextLabel = _el('quest-next');

    if (tierChip) tierChip.textContent = `Tier: ${tier.label}`;
    if (xpLabel) xpLabel.textContent = `${state.xp} XP`;
    if (streakLabel) {
      const suffix = state.dailyStreak === 1 ? 'day' : 'days';
      streakLabel.textContent = `Streak: ${state.dailyStreak} ${suffix}`;
    }

    if (progressFill) {
      progressFill.style.width = `${progress.percent}%`;
    }
    if (progressEl) {
      progressEl.setAttribute('aria-valuenow', String(progress.percent));
      progressEl.setAttribute(
        'aria-valuetext',
        progress.nextTier
          ? `${progress.percent}% to ${progress.nextTier.label}`
          : 'Top tier complete'
      );
    }

    if (nextLabel) {
      nextLabel.textContent = progress.nextTier
        ? `Next reward: ${progress.nextTier.reward} in ${progress.remainingXp} XP.`
        : `Top reward unlocked: ${tier.reward}.`;
    }

    document.querySelectorAll('#quest-track .quest-node').forEach((node) => {
      const nodeTierId = node.getAttribute('data-tier');
      const nodeTier = QUEST_TIERS.find((item) => item.id === nodeTierId);
      if (!nodeTier) return;
      const unlocked = state.xp >= nodeTier.minXp;
      const current = nodeTier.id === tier.id;
      node.classList.toggle('is-unlocked', unlocked);
      node.classList.toggle('is-current', current);
    });
  }

  function initQuestLoop() {
    renderQuestLoop(loadQuestLoopState());
    const probeSelect = _el('s-probe-rounds');
    if (probeSelect) {
      const normalized = normalizeProbeRounds(prefs.probeRounds || DEFAULT_PREFS.probeRounds);
      probeSelect.value = normalized;
      if (prefs.probeRounds !== normalized) setPref('probeRounds', normalized);
    }
    renderRosterControls();
    renderPlaylistControls();
    renderSessionSummary();
    renderProbePanel();
    renderMiniLessonPanel();
    maybeApplyStudentPlanForActiveStudent();
    refreshStandaloneMissionLabHub();
  }

  function awardQuestProgress(result, roundMetrics = {}) {
    const state = loadQuestLoopState();
    const beforeTier = resolveQuestTier(state.xp);
    const maxGuesses = Math.max(1, Number(WQGame.getState()?.maxGuesses || parseInt(DEFAULT_PREFS.guesses, 10) || 6));
    const guessesUsed = Math.max(1, Array.isArray(result?.guesses) ? result.guesses.length : maxGuesses);

    let streakIncreased = false;
    if (result?.won) {
      const today = localDayKey();
      if (state.lastWinDay !== today) {
        state.dailyStreak = isConsecutiveDay(state.lastWinDay, today) ? state.dailyStreak + 1 : 1;
        state.lastWinDay = today;
        streakIncreased = true;
      }
    }

    let xpEarned = result?.won ? 20 : 6;
    if (result?.won) {
      const efficiencyBonus = Math.max(0, maxGuesses - guessesUsed) * 4;
      const streakBonus = Math.min(12, Math.max(0, state.dailyStreak - 1) * 2);
      xpEarned += efficiencyBonus + streakBonus;
    }

    state.xp += xpEarned;
    state.rounds += 1;
    if (result?.won) state.wins += 1;
    recordSessionRound(result, roundMetrics);
    recordProbeRound(result, roundMetrics);

    const afterTier = resolveQuestTier(state.xp);
    const tierUp = afterTier.id !== beforeTier.id;

    saveQuestLoopState(state);
    renderQuestLoop(state);
  }

  function newGame(options = {}) {
    if (DEMO_MODE && demoRoundComplete && !options.forceDemoReplay) {
      showDemoEndOverlay();
      return;
    }
    if (DEMO_MODE) {
      closeDemoEndOverlay();
      if (options.forceDemoReplay) resetDemoScriptState();
    }
    emitTelemetry('wq_new_word_click', {
      source: options.launchMissionLab ? 'mission_lab_new' : 'wordquest_new'
    });
    focusSupportUnlockedByMiss = false;
    focusSupportUnlockAt = Date.now() + 20000;
    scheduleFocusSupportUnlock();
    hideInformantHintCard();
    hideStarterWordCard();
    closeRevealChallengeModal({ silent: true });
    clearClassroomTurnTimer();
    resetRoundTracking();
    if (firstRunSetupPending && !_el('first-run-setup-modal')?.classList.contains('hidden')) {
      WQUI.showToast('Pick a setup style or skip for now.');
      return;
    }
    if (isMissionLabStandaloneMode()) {
      if (options.launchMissionLab === false) {
        refreshStandaloneMissionLabHub();
        return;
      }
      startStandaloneMissionLab();
      return;
    }
    if (
      getVoicePracticeMode() === 'required' &&
      !(_el('modal-overlay')?.classList.contains('hidden')) &&
      !voiceTakeComplete
    ) {
      WQUI.showToast('Record your voice before starting the next word.');
      return;
    }
    clearRevealAutoAdvanceTimer();
    cancelRevealNarration();
    stopVoiceCaptureNow();
    if (voicePreviewAudio) {
      voicePreviewAudio.pause();
      voicePreviewAudio = null;
    }
    clearVoiceClip();
    voiceTakeComplete = false;
    drawWaveform();
    hideMidgameBoost();
    midgameBoostShown = false;

    const s = WQUI.getSettings();
    if (DEMO_MODE) {
      s.length = '5';
      s.maxGuesses = 6;
      s.focus = 'all';
    }
    const focus = DEMO_MODE ? 'all' : (_el('setting-focus')?.value || prefs.focus || 'all');
    const effectiveGradeBand = getEffectiveGameplayGradeBand(s.gradeBand || 'all', focus);
    const playableSet = buildPlayableWordSet(effectiveGradeBand, s.length, focus);

    const result = WQGame.startGame({
      ...s,
      gradeBand: effectiveGradeBand,
      focus,
      phonics: focus,
      fixedWord: DEMO_MODE ? DEMO_TARGET_WORD : '',
      disableProgress: DEMO_MODE
    });
    if (!result) {
      const startError = typeof WQGame.getLastStartError === 'function'
        ? WQGame.getLastStartError()
        : null;
      if (startError?.code === 'EMPTY_FILTERED_POOL') {
        const pieces = [];
        if (startError.gradeBand && startError.gradeBand !== 'all') pieces.push(`grade ${startError.gradeBand}`);
        if (startError.phonics && startError.phonics !== 'all') pieces.push(`focus ${getFocusLabel(startError.phonics)}`);
        if (startError.length && startError.length !== 'any') pieces.push(`${startError.length}-letter words`);
        const detail = pieces.length ? ` for ${pieces.join(', ')}` : '';
        WQUI.showToast(`No words available${detail}. Adjust filters or pick Classic.`);
      } else {
        WQUI.showToast('No words found — try Classic focus or adjust filters');
      }
      updateNextActionLine({ dueCount: countDueReviewWords(playableSet) });
      syncHeaderClueLauncherUI();
      syncStarterWordLauncherUI();
      syncClassroomTurnRuntime({ resetTurn: true });
      syncAssessmentLockRuntime();
      return;
    }
    resetRoundTracking(result);
    const startedWord = normalizeReviewWord(result.word);
    const matchedDueReview = reviewQueueState.items.find((item) => (
      item.word === startedWord &&
      item.dueRound <= reviewQueueState.round
    )) || null;
    if (matchedDueReview) consumeReviewItem(matchedDueReview);
    WQUI.calcLayout(result.wordLength, result.maxGuesses);
    WQUI.buildBoard(result.wordLength, result.maxGuesses);
    WQUI.buildKeyboard();
    WQUI.hideModal();
    _el('new-game-btn')?.classList.remove('pulse');
    _el('settings-panel')?.classList.add('hidden');
    syncClassroomTurnRuntime({ resetTurn: true });
    syncHeaderControlsVisibility();
    removeDupeToast();
    updateVoicePracticePanel(WQGame.getState());
    updateFocusHint();
    updateNextActionLine({ dueCount: countDueReviewWords(playableSet) });
    syncHeaderClueLauncherUI();
    syncStarterWordLauncherUI();
    scheduleStarterCoachHint();
    syncAssessmentLockRuntime();
    if (DEMO_MODE) runDemoCoachForStart();
    if (!DEMO_MODE) positionDemoLaunchButton();
  }

  const reflowLayout = () => {
    const s = WQGame.getState();
    if (s?.word) WQUI.calcLayout(s.wordLength, s.maxGuesses);
    logOverflowDiagnostics('reflowLayout');
  };
  window.addEventListener('resize', reflowLayout);
  window.visualViewport?.addEventListener('resize', reflowLayout);
  window.addEventListener('beforeunload', () => {
    emitTelemetry('wq_session_end', {
      duration_ms: Math.max(0, Date.now() - telemetrySessionStartedAt),
      reason: 'beforeunload'
    });
    stopVoiceCaptureNow();
    clearClassroomTurnTimer();
    finishWeeklyProbe({ silent: true });
  });

  // ─── 8. Input handling ──────────────────────────────
  function insertSequenceIntoGuess(sequence) {
    const letters = String(sequence || '').toLowerCase().replace(/[^a-z]/g, '');
    if (!letters) return;
    const state = WQGame.getState();
    if (state.gameOver) return;
    const remaining = Math.max(0, state.wordLength - state.guess.length);
    if (!remaining) return;
    const clipped = letters.slice(0, remaining);
    if (!clipped) return;
    for (const letter of clipped) WQGame.addLetter(letter);
    const nextState = WQGame.getState();
    WQUI.updateCurrentRow(nextState.guess, nextState.wordLength, nextState.guesses.length);
  }

  function handleInputUnit(rawUnit) {
    const unit = String(rawUnit || '');
    if (!unit) return;
    if (unit === 'Enter') {
      handleKey('Enter');
      return;
    }
    if (unit === 'Backspace' || unit === '⌫') {
      handleKey('Backspace');
      return;
    }
    if (/^[a-zA-Z]$/.test(unit)) {
      handleKey(unit);
      return;
    }
    if (/^[a-z]{2,4}$/i.test(unit)) {
      insertSequenceIntoGuess(unit);
    }
  }

  function handleKey(key) {
    clearStarterCoachTimer();
    if (_el('hint-clue-card') && !_el('hint-clue-card')?.classList.contains('hidden')) {
      hideInformantHintCard();
    }
    if (_el('starter-word-card') && !_el('starter-word-card')?.classList.contains('hidden')) {
      hideStarterWordCard();
    }
    if (firstRunSetupPending && !_el('first-run-setup-modal')?.classList.contains('hidden')) return;
    const s = WQGame.getState();
    if (s.gameOver) return;

    if (key === 'Enter') {
      const themeAtSubmit = normalizeTheme(document.documentElement.getAttribute('data-theme'), getThemeFallback());
      const result = WQGame.submitGuess();
      if (!result) return;
      emitTelemetry('wq_guess_submit', {
        guess_index: (Array.isArray(result?.guesses) ? result.guesses.length : 0) || 0,
        guess_length: String(result?.guess || '').length,
        submit_result: result.error ? String(result.error) : 'accepted'
      });
      if (result.error === 'too_short') {
        WQUI.showToast('Fill in all the letters first');
        WQUI.shakeRow(s.guesses, s.wordLength);
        updateNextActionLine();
        if (!DEMO_MODE) positionDemoLaunchButton();
        return;
      }

      if (!result.won) {
        focusSupportUnlockedByMiss = true;
        clearFocusSupportUnlockTimer();
        syncHeaderClueLauncherUI();
        syncStarterWordLauncherUI();
      }

      const row = result.guesses.length - 1;
      WQUI.revealRow(result.guess, result.result, row, s.wordLength, () => {
        if (normalizeTheme(document.documentElement.getAttribute('data-theme'), getThemeFallback()) !== themeAtSubmit) {
          applyTheme(themeAtSubmit);
        }
        WQUI.updateKeyboard(result.result, result.guess);
        checkDuplicates(result);
        if (
          MIDGAME_BOOST_ENABLED &&
          !result.won &&
          !result.lost &&
          !midgameBoostShown &&
          result.guesses.length === MIDGAME_BOOST_TRIGGER_GUESS
        ) {
          midgameBoostShown = true;
          showMidgameBoost();
        }
        if (result.won || result.lost) {
          const roundMetrics = buildRoundMetrics(result, s.maxGuesses);
          const guessesUsed = Math.max(1, Number(roundMetrics.guessesUsed) || 1);
          const zpdInBand = Boolean(
            (result.won && guessesUsed >= 3 && guessesUsed <= 5) ||
            (!result.won && result.lost && guessesUsed >= 5 && !!roundMetrics.hintRequested)
          );
          emitTelemetry('wq_round_complete', {
            word_id: normalizeReviewWord(result.word),
            won: !!result.won,
            lost: !!result.lost,
            guesses_used: guessesUsed,
            max_guesses: Number(s.maxGuesses) || null,
            hint_used: !!roundMetrics.hintRequested,
            voice_attempts: Math.max(0, Number(roundMetrics.voiceAttempts) || 0),
            duration_ms: Math.max(0, Number(roundMetrics.durationMs) || 0),
            skill_key: roundMetrics.skillKey,
            skill_label: roundMetrics.skillLabel,
            zpd_in_band: zpdInBand
          });
          clearClassroomTurnTimer();
          updateClassroomTurnLine();
          if (!DEMO_MODE) {
            awardQuestProgress(result, roundMetrics);
            trackRoundForReview(result, s.maxGuesses, roundMetrics);
          }
          resetRoundTracking();
          hideMidgameBoost();
          syncAssessmentLockRuntime();
          const focusNow = _el('setting-focus')?.value || prefs.focus || 'all';
          const activeGradeBand = getEffectiveGameplayGradeBand(
            _el('s-grade')?.value || 'all',
            focusNow
          );
          const dueCountNow = countDueReviewWords(buildPlayableWordSet(
            activeGradeBand,
            _el('s-length')?.value || 'any',
            focusNow
          ));
          updateNextActionLine({ dueCount: dueCountNow });
          setTimeout(() => {
            if (DEMO_MODE) {
              demoRoundComplete = true;
              WQUI.hideModal();
              closeRevealChallengeModal({ silent: true });
              showDemoEndOverlay();
              _el('new-game-btn')?.classList.remove('pulse');
            } else {
              WQUI.showModal(result);
              _el('new-game-btn')?.classList.add('pulse');
              const settings = WQUI.getSettings();
              if (result.won && settings.confetti){ launchConfetti(); launchStars(); }
            }
            if (normalizeTheme(document.documentElement.getAttribute('data-theme'), getThemeFallback()) !== themeAtSubmit) {
              applyTheme(themeAtSubmit);
            }
          }, 520);
        } else {
          if (DEMO_MODE) runDemoCoachAfterGuess(result);
          maybeShowErrorCoach(result);
          maybeAutoShowStarterWords(result);
          advanceTeamTurn();
          updateNextActionLine();
          if (!DEMO_MODE) positionDemoLaunchButton();
        }
      });

    } else if (key === 'Backspace' || key === '⌫') {
      WQGame.deleteLetter();
      const s2 = WQGame.getState();
      WQUI.updateCurrentRow(s2.guess, s2.wordLength, s2.guesses.length);
      updateNextActionLine();
      if (!DEMO_MODE) positionDemoLaunchButton();

    } else if (/^[a-zA-Z]$/.test(key)) {
      const normalizedLetter = String(key || '').toLowerCase();
      if (isKnownAbsentLetter(normalizedLetter)) {
        pulseBlockedLetterKey(normalizedLetter);
        maybeShowBlockedLetterToast(normalizedLetter);
        updateNextActionLine();
        return;
      }
      WQGame.addLetter(key);
      const s2 = WQGame.getState();
      WQUI.updateCurrentRow(s2.guess, s2.wordLength, s2.guesses.length);
      updateNextActionLine();
      if (!DEMO_MODE) positionDemoLaunchButton();
    }
  }

  function isEditableTarget(target) {
    const node = target instanceof Element ? target : null;
    if (!node) return false;
    if (node instanceof HTMLElement && node.isContentEditable) return true;
    return Boolean(node.closest('input, textarea, select, [contenteditable="true"]'));
  }

  // Physical keyboard
  document.addEventListener('keydown', e => {
    if (e.defaultPrevented) return;
    if (e.ctrlKey || e.metaKey || e.altKey) return;
    const listeningHelpOpen = !(_el('listening-mode-overlay')?.classList.contains('hidden'));
    if (listeningHelpOpen) {
      if (e.key === 'Escape') hideListeningModeExplainer();
      return;
    }
    const phonicsClueOpen = !(_el('phonics-clue-modal')?.classList.contains('hidden'));
    if (phonicsClueOpen) {
      if (e.key === 'Escape') closePhonicsClueModal();
      return;
    }
    const challengeOpen = !(_el('challenge-modal')?.classList.contains('hidden'));
    if (challengeOpen) {
      if (e.key === 'Escape') {
        e.preventDefault();
        closeRevealChallengeModal();
      } else if (e.key === 'Tab') {
        trapChallengeModalTab(e);
      }
      return;
    }
    const themePopoverOpen = !(_el('theme-preview-strip')?.classList.contains('hidden'));
    const musicPopoverOpen = !(_el('quick-music-strip')?.classList.contains('hidden'));
    if (themePopoverOpen || musicPopoverOpen) {
      if (e.key === 'Escape') {
        e.preventDefault();
        closeQuickPopover('all');
      }
      return;
    }
    const starterWordOpen = !(_el('starter-word-card')?.classList.contains('hidden'));
    if (starterWordOpen && e.key === 'Escape') {
      e.preventDefault();
      hideStarterWordCard();
      return;
    }
    if (isMissionLabStandaloneMode()) return;
    const activeEl = document.activeElement;
    const shouldReleaseThemeNavFocus =
      activeEl?.closest?.('#wq-theme-nav') &&
      (e.key === 'Enter' || e.key === 'Backspace' || /^[a-zA-Z]$/.test(e.key));
    if (shouldReleaseThemeNavFocus) {
      activeEl.blur();
      e.preventDefault();
    } else if (isEditableTarget(e.target)) {
      return;
    }
    if (document.documentElement.getAttribute('data-focus-search-open') === 'true') return;
    const nextKey = e.key === 'Backspace' ? 'Backspace' : e.key;
    const isGameplayKey = nextKey === 'Enter' || nextKey === 'Backspace' || /^[a-zA-Z]$/.test(nextKey);
    if (isGameplayKey) e.preventDefault();
    handleInputUnit(nextKey);
    if (/^[a-zA-Z]$/.test(e.key)) {
      const btn = document.querySelector(`.key[data-key="${e.key.toLowerCase()}"]`);
      if (btn) { btn.classList.add('wq-press'); setTimeout(() => btn.classList.remove('wq-press'), 220); }
    }
  });

  // On-screen keyboard
  _el('keyboard')?.addEventListener('click', e => {
    const btn = e.target.closest('.key');
    if (!btn) return;
    btn.classList.add('wq-press');
    setTimeout(() => btn.classList.remove('wq-press'), 220);
    const unit = btn.dataset.seq || btn.dataset.key;
    handleInputUnit(unit);
  });

  // Buttons
  _el('new-game-btn')?.addEventListener('click',  newGame);
  _el('play-again-btn')?.addEventListener('click', newGame);
  _el('phonics-clue-open-btn')?.addEventListener('click', () => {
    showInformantHintToast();
  });
  _el('focus-clue-btn')?.addEventListener('click', () => {
    showInformantHintToast();
  });
  _el('starter-word-open-btn')?.addEventListener('click', () => {
    const card = _el('starter-word-card');
    if (card && !card.classList.contains('hidden')) {
      hideStarterWordCard();
      return;
    }
    showStarterWordCard({ source: 'manual' });
  });
  _el('starter-word-refresh-btn')?.addEventListener('click', () => {
    showStarterWordCard({ source: 'manual' });
  });
  _el('focus-ideas-btn')?.addEventListener('click', () => {
    const card = _el('starter-word-card');
    if (card && !card.classList.contains('hidden')) {
      hideStarterWordCard();
      return;
    }
    showStarterWordCard({ source: 'manual' });
  });
  _el('starter-word-close-btn')?.addEventListener('click', () => {
    hideStarterWordCard();
  });
  _el('starter-word-close-icon')?.addEventListener('click', () => {
    hideStarterWordCard();
  });
  _el('listening-mode-close')?.addEventListener('click', () => {
    hideListeningModeExplainer();
  });
  _el('listening-mode-overlay')?.addEventListener('pointerdown', (event) => {
    if (event.target?.id !== 'listening-mode-overlay') return;
    hideListeningModeExplainer();
  });
  _el('phonics-clue-close')?.addEventListener('click', () => closePhonicsClueModal());
  _el('phonics-clue-modal')?.addEventListener('pointerdown', (event) => {
    if (event.target?.id !== 'phonics-clue-modal') return;
    closePhonicsClueModal();
  });
  _el('phonics-clue-deck-select')?.addEventListener('change', () => {
    updatePhonicsClueControlsFromUI();
    renderPhonicsCluePanel();
  });
  _el('phonics-clue-context-select')?.addEventListener('change', () => {
    updatePhonicsClueControlsFromUI();
    renderPhonicsCluePanel();
  });
  _el('phonics-clue-timer-select')?.addEventListener('change', () => {
    updatePhonicsClueControlsFromUI();
    if (phonicsClueState.started && phonicsClueState.current) {
      startPhonicsClueTurnTimer();
    } else {
      renderPhonicsCluePanel();
    }
  });
  _el('phonics-clue-bonus-select')?.addEventListener('change', () => {
    updatePhonicsClueControlsFromUI();
    renderPhonicsCluePanel();
  });
  _el('phonics-clue-start-btn')?.addEventListener('click', () => {
    void startPhonicsClueDeck();
  });
  _el('phonics-clue-guess-btn')?.addEventListener('click', () => {
    awardPhonicsClueGuessPoint();
  });
  _el('phonics-clue-bonus-btn')?.addEventListener('click', () => {
    awardPhonicsClueBonusPoint();
  });
  _el('phonics-clue-next-btn')?.addEventListener('click', () => {
    advancePhonicsClueCard();
  });
  _el('phonics-clue-skip-btn')?.addEventListener('click', () => {
    skipPhonicsClueCard();
  });
  _el('phonics-clue-hide-btn')?.addEventListener('click', () => {
    togglePhonicsClueTargetVisibility();
  });
  _el('mission-lab-start-btn')?.addEventListener('click', () => {
    startStandaloneMissionLab();
  });
  _el('mission-lab-word-select')?.addEventListener('change', () => {
    refreshStandaloneMissionLabHub();
  });
  _el('mission-lab-level-select')?.addEventListener('change', () => {
    const note = _el('mission-lab-hub-note');
    const level = normalizeThinkingLevel(_el('mission-lab-level-select')?.value || '');
    if (!note || !level) return;
    note.textContent = `Selected thinking target: ${getChallengeLevelDisplay(level)}. Start Deep Dive when ready.`;
  });
  _el('modal-auto-next-cancel')?.addEventListener('click', () => {
    clearRevealAutoAdvanceTimer();
    WQUI.showToast('Auto next canceled for this reveal.');
  });
  _el('modal-overlay')?.addEventListener('pointerdown', (event) => {
    if (event.target?.id !== 'modal-overlay') return;
    newGame();
  });
  _el('modal-open-challenge')?.addEventListener('click', () => {
    openRevealChallengeModal();
  });
  _el('challenge-modal-close')?.addEventListener('click', () => closeRevealChallengeModal());
  _el('challenge-modal')?.addEventListener('pointerdown', (event) => {
    if (event.target?.id !== 'challenge-modal') return;
    closeRevealChallengeModal();
  });
  _el('challenge-modal')?.addEventListener('click', (event) => {
    const button = event.target?.closest?.('button[data-challenge-choice-task]');
    if (!button) return;
    const task = String(button.dataset.challengeChoiceTask || '').trim();
    const choiceId = String(button.dataset.choiceId || '').trim();
    if (!task || !choiceId) return;
    handleChallengeChoiceSelection(task, choiceId);
  });
  _el('challenge-station-progress')?.addEventListener('click', (event) => {
    const pill = event.target?.closest?.('button[data-challenge-station]');
    if (!pill || !revealChallengeState) return;
    const task = String(pill.dataset.challengeStation || '').trim();
    if (!CHALLENGE_TASK_FLOW.includes(task)) return;
    const firstIncomplete = getFirstIncompleteChallengeTask(revealChallengeState);
    const lockedIndex = CHALLENGE_TASK_FLOW.indexOf(firstIncomplete);
    const requestedIndex = CHALLENGE_TASK_FLOW.indexOf(task);
    if (lockedIndex >= 0 && requestedIndex > lockedIndex) {
      setChallengeFeedback('Finish this step first.', 'warn');
      return;
    }
    revealChallengeState.activeTask = task;
    renderRevealChallengeModal();
  });
  _el('challenge-next-station')?.addEventListener('click', () => {
    if (!revealChallengeState || revealChallengeState.completedAt) return;
    const nextTask = getNextChallengeTask(revealChallengeState, revealChallengeState.activeTask);
    if (!nextTask) return;
    revealChallengeState.activeTask = nextTask;
    renderRevealChallengeModal();
    setChallengeFeedback('Next step is ready.', 'default');
  });
  _el('challenge-hear-word')?.addEventListener('click', () => {
    cancelRevealNarration();
    const current = revealChallengeState?.result?.entry || entry();
    if (current) void WQAudio.playWord(current);
  });
  _el('challenge-hear-sentence')?.addEventListener('click', () => {
    cancelRevealNarration();
    const current = revealChallengeState?.result?.entry || entry();
    if (current) void WQAudio.playSentence(current);
  });
  _el('challenge-open-practice')?.addEventListener('click', () => {
    closeRevealChallengeModal({ silent: true, restoreFocus: false });
    openVoicePracticeAndRecord({ autoStart: true });
  });
  _el('challenge-save-reflection')?.addEventListener('click', () => {
    saveRevealChallengeResponses();
  });
  _el('challenge-quickstart-dismiss')?.addEventListener('click', () => {
    saveChallengeOnboardingState({
      seenCount: Math.max(CHALLENGE_ONBOARDING_MAX_VIEWS, challengeOnboardingState.seenCount),
      dismissed: true
    });
    _el('challenge-quickstart')?.classList.add('hidden');
  });
  _el('challenge-finish-btn')?.addEventListener('click', () => {
    finishRevealChallenge();
  });

  // ─── 9. Gameplay audio buttons ──────────────────────
  const entry = () => WQGame.getState()?.entry;

  const REVEAL_WIN_TOASTS = Object.freeze({
    lightning: Object.freeze([
      Object.freeze({ lead: 'Lightning solve!', coach: 'Stretch goal: increase word length next round.' }),
      Object.freeze({ lead: 'Perfect precision!', coach: 'Try turning hints off for a challenge.' }),
      Object.freeze({ lead: 'Elite read!', coach: 'Move to a harder focus and keep the streak.' })
    ]),
    fast: Object.freeze([
      Object.freeze({ lead: 'Sharp solve!', coach: 'Keep the same pace with a harder word set.' }),
      Object.freeze({ lead: 'Strong accuracy!', coach: 'Try reducing hints for one round.' }),
      Object.freeze({ lead: 'Quick pattern match!', coach: 'Push to one fewer guess next time.' })
    ]),
    steady: Object.freeze([
      Object.freeze({ lead: 'Great solve!', coach: 'You are tracking patterns well. Keep scanning vowels first.' }),
      Object.freeze({ lead: 'Solid work!', coach: 'Next step: lock in opening guesses with stronger coverage.' }),
      Object.freeze({ lead: 'Nice thinking!', coach: 'Focus on letter placement to shave a guess.' })
    ]),
    resilient: Object.freeze([
      Object.freeze({ lead: 'Clutch finish!', coach: 'Great persistence. Start with a wider first guess next round.' }),
      Object.freeze({ lead: 'You closed it out!', coach: 'Try checking endings early for faster lock-in.' }),
      Object.freeze({ lead: 'Strong grit!', coach: 'Use duplicate checks and vowel coverage earlier.' })
    ])
  });
  const REVEAL_LOSS_TOASTS = Object.freeze({
    close: Object.freeze([
      Object.freeze({ lead: 'So close.', coach: 'You were one step away. Keep that pattern next round.' }),
      Object.freeze({ lead: 'Almost there.', coach: 'Great narrowing. Open with broader letter coverage next time.' }),
      Object.freeze({ lead: 'Near miss.', coach: 'You found the structure. A faster vowel check will finish it.' })
    ]),
    mid: Object.freeze([
      Object.freeze({ lead: 'Good effort.', coach: 'Try balancing vowels and common endings earlier.' }),
      Object.freeze({ lead: 'You are building skill.', coach: 'Use guess two to test fresh high-value letters.' }),
      Object.freeze({ lead: 'Keep going.', coach: 'Your next win is close with one stronger opener.' })
    ]),
    early: Object.freeze([
      Object.freeze({ lead: 'Reset and go again.', coach: 'Use a starter with mixed vowels and consonants.' }),
      Object.freeze({ lead: 'Next round is yours.', coach: 'Aim to test 4-5 new letters in guess two.' }),
      Object.freeze({ lead: 'Good practice round.', coach: 'Try classic focus for one quick confidence win.' })
    ])
  });
  const THINKING_LEVEL_META = Object.freeze({
    remember: Object.freeze({
      chip: 'Say It (Remember)',
      teacher: 'Teacher lens: Thinking level Remember · SoR word recognition + retrieval.'
    }),
    understand: Object.freeze({
      chip: 'Explain It (Understand)',
      teacher: 'Teacher lens: Thinking level Understand · SoR semantics + background knowledge.'
    }),
    apply: Object.freeze({
      chip: 'Use It (Apply)',
      teacher: 'Teacher lens: Thinking level Apply · SoR syntax + semantics in context.'
    }),
    analyze: Object.freeze({
      chip: 'Compare It (Analyze)',
      teacher: 'Teacher lens: Thinking level Analyze · SoR pattern analysis + comprehension.'
    }),
    evaluate: Object.freeze({
      chip: 'Defend It (Evaluate)',
      teacher: 'Teacher lens: Thinking level Evaluate · strategy reflection + comprehension.'
    }),
    create: Object.freeze({
      chip: 'Invent It (Create)',
      teacher: 'Teacher lens: Thinking level Create · expressive language + transfer.'
    })
  });
  const CHALLENGE_REFLECTION_KEY = 'wq_v2_levelup_reflections_v1';
  const CHALLENGE_PROGRESS_KEY = 'wq_v2_mission_lab_progress_v1';
  const CHALLENGE_DRAFT_KEY = 'wq_v2_mission_lab_draft_v1';
  const CHALLENGE_ONBOARDING_KEY = 'wq_v2_deep_dive_onboarding_v1';
  const CHALLENGE_ONBOARDING_MAX_VIEWS = 2;
  const CHALLENGE_STRONG_SCORE_MIN = 75;
  const CHALLENGE_COMPLETE_LINES = Object.freeze([
    'Deep Dive complete. Pattern and meaning locked in.',
    'Deep Dive clear. You connected sound, meaning, and sentence use.',
    'Quest upgrade complete. Great transfer from decoding to comprehension.'
  ]);
  const CHALLENGE_TASK_FLOW = Object.freeze(['listen', 'analyze', 'create']);
  const CHALLENGE_TASK_LABELS = Object.freeze({
    listen: 'Sound',
    analyze: 'Meaning',
    create: 'Context'
  });
  const DEEP_DIVE_VARIANTS = Object.freeze({
    listen: Object.freeze(['chunk', 'anchor']),
    analyze: Object.freeze(['definition', 'context']),
    create: Object.freeze(['sentence_pick', 'sentence_fix'])
  });
  const CHALLENGE_PACING_NUDGE_MS = 45 * 1000;
  const CHALLENGE_WORD_ROLE_META = Object.freeze({
    noun: Object.freeze({
      label: 'Noun',
      kidLabel: 'naming word',
      meaningLead: 'Pick the meaning that matches this naming word',
      contextLead: 'Which sentence uses this naming word correctly?',
      contextHelper: 'Check that the word names a person, place, thing, or idea.'
    }),
    verb: Object.freeze({
      label: 'Verb',
      kidLabel: 'action word',
      meaningLead: 'Pick the meaning that matches this action word',
      contextLead: 'Which sentence uses this action word correctly?',
      contextHelper: 'Check that the word names an action that fits the sentence.'
    }),
    adjective: Object.freeze({
      label: 'Adjective',
      kidLabel: 'describing word',
      meaningLead: 'Pick the meaning that matches this describing word',
      contextLead: 'Which sentence uses this describing word correctly?',
      contextHelper: 'Check that the word describes a noun naturally.'
    }),
    adverb: Object.freeze({
      label: 'Adverb',
      kidLabel: 'how word',
      meaningLead: 'Pick the meaning that matches this how word',
      contextLead: 'Which sentence uses this how word correctly?',
      contextHelper: 'Check that the word tells how, when, or where an action happens.'
    }),
    general: Object.freeze({
      label: 'Target Word',
      kidLabel: 'word',
      meaningLead: 'Pick the best meaning for',
      contextLead: 'Which sentence uses this word correctly?',
      contextHelper: 'Check which sentence sounds natural and keeps the meaning right.'
    })
  });
  const CHALLENGE_RANKS = Object.freeze([
    Object.freeze({ minPoints: 0, label: 'Scout' }),
    Object.freeze({ minPoints: 40, label: 'Navigator' }),
    Object.freeze({ minPoints: 90, label: 'Analyst' }),
    Object.freeze({ minPoints: 160, label: 'Strategist' }),
    Object.freeze({ minPoints: 260, label: 'Master Sleuth' })
  ]);
  const CHALLENGE_LEVELS = Object.freeze([
    'remember',
    'understand',
    'apply',
    'analyze',
    'evaluate',
    'create'
  ]);
  const CHALLENGE_SCAFFOLD_PROFILE = Object.freeze({
    k2: Object.freeze({
      instructionActive: (station) => `Step ${station} of 3. Finish this step, then move on.`,
      instructionDone: 'Great work. All 3 steps are done. Tap Finish.',
      listen: 'Say the sounds as you tap.',
      analyze: 'Pick the meaning that fits best.',
      create: 'Pick the sentence that sounds right.',
      pace: 'Take about 20-45 seconds on each step, then keep moving.'
    }),
    g35: Object.freeze({
      instructionActive: (station) => `Step ${station} of 3. Finish this step, then move on.`,
      instructionDone: 'All 3 steps are complete. Tap Finish.',
      listen: 'Look for the strongest sound chunk.',
      analyze: 'Use definition and context clues together.',
      create: 'Choose the sentence with precise meaning.',
      pace: 'Aim for 30-60 seconds per step, then move on.'
    }),
    older: Object.freeze({
      instructionActive: (station) => `Step ${station} of 3. Finish this step, then move on.`,
      instructionDone: 'All 3 steps are complete. Tap Finish.',
      listen: 'Anchor your choice in the key phonics chunk.',
      analyze: 'Test meaning against both definition and sentence context.',
      create: 'Select the sentence with strongest semantic fit.',
      pace: 'Keep each step to about 30-60 seconds.'
    })
  });
  const REVEAL_PACING_PRESETS = Object.freeze({
    guided: Object.freeze({ introDelay: 260, betweenDelay: 140, postMeaningDelay: 200 }),
    quick: Object.freeze({ introDelay: 140, betweenDelay: 70, postMeaningDelay: 120 }),
    slow: Object.freeze({ introDelay: 420, betweenDelay: 220, postMeaningDelay: 320 })
  });
  let revealAutoAdvanceTimer = 0;
  let revealAutoCountdownTimer = 0;
  let revealAutoAdvanceEndsAt = 0;
  let revealChallengeState = null;
  let challengeOnboardingState = loadChallengeOnboardingState();

  function pickRandom(items) {
    if (!Array.isArray(items) || !items.length) return '';
    const index = Math.floor(Math.random() * items.length);
    return items[index];
  }

  function clearChallengeSprintTimer() {
    if (challengeSprintTimer) {
      clearInterval(challengeSprintTimer);
      challengeSprintTimer = 0;
    }
    if (challengePacingTimer) {
      clearTimeout(challengePacingTimer);
      challengePacingTimer = 0;
    }
  }

  function clearChallengePacingTimer() {
    if (!challengePacingTimer) return;
    clearTimeout(challengePacingTimer);
    challengePacingTimer = 0;
  }

  function loadChallengeProgress() {
    try {
      const raw = JSON.parse(localStorage.getItem(CHALLENGE_PROGRESS_KEY) || '{}');
      return {
        points: Math.max(0, Number(raw?.points) || 0),
        streak: Math.max(0, Number(raw?.streak) || 0),
        lastWinDay: String(raw?.lastWinDay || '').trim()
      };
    } catch {
      return { points: 0, streak: 0, lastWinDay: '' };
    }
  }

  function saveChallengeProgress(progress) {
    try {
      localStorage.setItem(CHALLENGE_PROGRESS_KEY, JSON.stringify({
        points: Math.max(0, Number(progress?.points) || 0),
        streak: Math.max(0, Number(progress?.streak) || 0),
        lastWinDay: String(progress?.lastWinDay || '').trim()
      }));
    } catch {}
  }

  function resolveChallengeRank(points) {
    const total = Math.max(0, Number(points) || 0);
    let active = CHALLENGE_RANKS[0];
    CHALLENGE_RANKS.forEach((rank) => {
      if (total >= rank.minPoints) active = rank;
    });
    return active || CHALLENGE_RANKS[0];
  }

  function loadChallengeOnboardingState() {
    try {
      const raw = JSON.parse(localStorage.getItem(CHALLENGE_ONBOARDING_KEY) || '{}');
      return {
        seenCount: Math.max(0, Number(raw?.seenCount) || 0),
        dismissed: !!raw?.dismissed
      };
    } catch {
      return { seenCount: 0, dismissed: false };
    }
  }

  function saveChallengeOnboardingState(nextState) {
    const normalized = {
      seenCount: Math.max(0, Number(nextState?.seenCount) || 0),
      dismissed: !!nextState?.dismissed
    };
    challengeOnboardingState = normalized;
    try { localStorage.setItem(CHALLENGE_ONBOARDING_KEY, JSON.stringify(normalized)); } catch {}
  }

  function resolveChallengeGradeTier(gradeLabel) {
    const value = String(gradeLabel || '').toUpperCase().replace(/\s+/g, '');
    if (!value) return 'g35';
    if (value.includes('K-2') || value.includes('K2')) return 'k2';
    if (value.includes('G3-5') || value.includes('3-5')) return 'g35';
    return 'older';
  }

  function getChallengeScaffoldProfile(state = revealChallengeState) {
    const tier = resolveChallengeGradeTier(state?.grade || '');
    return CHALLENGE_SCAFFOLD_PROFILE[tier] || CHALLENGE_SCAFFOLD_PROFILE.g35;
  }

  function buildChallengeQuickstartCopy(state = revealChallengeState) {
    const source = String(state?.source || '').trim().toLowerCase();
    const launchHint = source === 'standalone'
      ? 'You launched from Activities.'
      : 'You launched from the end-of-round card.';
    return `Quick start: finish Sound, Meaning, and Context in order. ${launchHint}`;
  }

  function syncChallengeQuickstartCard(state = revealChallengeState) {
    const wrap = _el('challenge-quickstart');
    const copy = _el('challenge-quickstart-copy');
    if (!wrap || !copy || !state) return;
    const shouldShow = !challengeOnboardingState.dismissed && challengeOnboardingState.seenCount < CHALLENGE_ONBOARDING_MAX_VIEWS;
    if (!shouldShow) {
      wrap.classList.add('hidden');
      return;
    }
    copy.textContent = buildChallengeQuickstartCopy(state);
    wrap.classList.remove('hidden');
    saveChallengeOnboardingState({
      seenCount: challengeOnboardingState.seenCount + 1,
      dismissed: false
    });
  }

  function createMissionAttemptId() {
    const stamp = Date.now().toString(36);
    const token = Math.random().toString(36).slice(2, 8);
    return `mission-${stamp}-${token}`;
  }

  function resolveMissionScoreBand(scoreTotal) {
    const score = Math.max(0, Number(scoreTotal) || 0);
    if (score >= 90) return 'Spotlight';
    if (score >= CHALLENGE_STRONG_SCORE_MIN) return 'Strong';
    if (score >= 55) return 'Growing';
    return 'Launch';
  }

  function normalizeThinkingLevel(level, fallback = '') {
    const normalized = String(level || '').trim().toLowerCase();
    if (CHALLENGE_LEVELS.includes(normalized)) return normalized;
    return fallback;
  }

  function getChallengeLevelDisplay(level) {
    const normalized = normalizeThinkingLevel(level, 'apply');
    const meta = THINKING_LEVEL_META[normalized] || THINKING_LEVEL_META.apply;
    return String(meta?.chip || normalized).replace(/\s*\(.+\)\s*$/, '').trim();
  }

  function resolveStandaloneAutoChallengeLevel(entry) {
    const band = String(entry?.grade_band || '').trim().toUpperCase();
    if (band === 'K-2') {
      return pickRandom(['remember', 'understand', 'apply']) || 'apply';
    }
    if (band === 'G3-5') {
      return pickRandom(['understand', 'apply', 'analyze']) || 'apply';
    }
    if (band === 'G6-8') {
      return pickRandom(['apply', 'analyze', 'evaluate']) || 'analyze';
    }
    return pickRandom(['analyze', 'evaluate', 'create']) || 'evaluate';
  }

  function getStandaloneMissionWordPool() {
    const focus = _el('setting-focus')?.value || prefs.focus || 'all';
    const selectedGrade = _el('s-grade')?.value || prefs.grade || DEFAULT_PREFS.grade;
    const gradeBand = getEffectiveGameplayGradeBand(selectedGrade, focus);
    const includeLowerBands = shouldExpandGradeBandForFocus(focus);
    const length = String(_el('s-length')?.value || prefs.length || DEFAULT_PREFS.length).trim() || DEFAULT_PREFS.length;
    let pool = WQData.getPlayableWords({
      gradeBand,
      length,
      phonics: focus,
      includeLowerBands
    });
    if (!pool.length && length !== 'any') {
      pool = WQData.getPlayableWords({
        gradeBand,
        length: 'any',
        phonics: focus,
        includeLowerBands
      });
    }
    if (!pool.length) {
      pool = WQData.getPlayableWords({
        gradeBand,
        length: 'any',
        phonics: 'all'
      });
    }
    return {
      pool: Array.isArray(pool) ? pool : [],
      focus,
      gradeBand,
      length
    };
  }

  function refreshStandaloneMissionLabHub() {
    const select = _el('mission-lab-word-select');
    const note = _el('mission-lab-hub-note');
    const meta = _el('mission-lab-hub-meta');
    if (!select && !note && !meta) return;

    const { pool, focus, gradeBand, length } = getStandaloneMissionWordPool();
    const rawFocusLabel = getFocusLabel(focus).replace(/[—]/g, '').replace(/\s+/g, ' ').trim();
    const focusLabel = focus === 'all'
      ? 'Track: Core Vocabulary'
      : `Track: ${rawFocusLabel || 'Targeted Skill'}`;
    const gradeLabel = formatGradeBandLabel(gradeBand);
    const lengthLabel = String(length || '').toLowerCase() === 'any'
      ? 'Any word length'
      : `${String(length)}-letter words`;

    if (select) {
      const previous = normalizeReviewWord(select.value);
      select.innerHTML = '';
      const autoOption = document.createElement('option');
      autoOption.value = '';
      autoOption.textContent = 'Auto-pick from current filters';
      select.appendChild(autoOption);
      pool
        .slice()
        .sort((a, b) => String(a).localeCompare(String(b)))
        .slice(0, 200)
        .forEach((word) => {
          const option = document.createElement('option');
          const normalizedWord = normalizeReviewWord(word);
          option.value = normalizedWord;
          option.textContent = normalizedWord.toUpperCase();
          select.appendChild(option);
        });
      if (previous && pool.includes(previous)) {
        select.value = previous;
      } else {
        select.value = '';
      }
    }

    if (meta) {
      meta.textContent = `${focusLabel} · Grade ${gradeLabel} · ${lengthLabel}`;
    }
    if (note) {
      note.textContent = pool.length
        ? `${pool.length} ready words. Start now, or choose a word + level below.`
        : 'No words match this filter yet. Change quest focus or grade, then try again.';
    }
  }

  function startStandaloneMissionLab(options = {}) {
    const { pool } = getStandaloneMissionWordPool();
    if (!pool.length) {
      WQUI.showToast('No words match this Deep Dive filter. Adjust grade, quest, or word length.');
      refreshStandaloneMissionLabHub();
      return false;
    }

    const selectedWord = normalizeReviewWord(
      options.word ||
      _el('mission-lab-word-select')?.value ||
      ''
    );
    const fallbackWord = normalizeReviewWord(pickRandom(pool) || pool[0] || '');
    const word = (selectedWord && pool.includes(selectedWord)) ? selectedWord : fallbackWord;
    if (!word) {
      WQUI.showToast('Could not pick a Deep Dive word. Try again.');
      return false;
    }

    const entryData = WQData.getEntry(word);
    if (!entryData) {
      WQUI.showToast('Deep Dive word data is missing. Pick another word.');
      return false;
    }

    const requestedLevel = normalizeThinkingLevel(
      options.level ||
      _el('mission-lab-level-select')?.value ||
      ''
    );
    const level = requestedLevel || resolveStandaloneAutoChallengeLevel(entryData);
    const result = {
      word: word.toUpperCase(),
      entry: entryData,
      guesses: [word],
      won: true
    };
    const nextState = buildRevealChallengeState(result, {
      source: 'standalone',
      level
    });
    if (!nextState) {
      WQUI.showToast('Deep Dive could not start with this word.');
      return false;
    }

    revealChallengeState = nextState;
    const activeElement = document.activeElement;
    challengeModalReturnFocusEl = activeElement instanceof HTMLElement && activeElement !== document.body
      ? activeElement
      : null;
    renderRevealChallengeModal();
    _el('challenge-modal')?.classList.remove('hidden');
    syncChallengeQuickstartCard(revealChallengeState);
    focusChallengeModalStart();
    emitTelemetry('wq_deep_dive_start', {
      source: 'standalone',
      word_id: normalizeReviewWord(word),
      level: level || ''
    });
    emitTelemetry('wq_funnel_deep_dive_started', {
      source: 'standalone',
      word_id: normalizeReviewWord(word),
      level: level || ''
    });
    return true;
  }

  function setChallengeFeedback(message, tone = 'default') {
    const el = _el('challenge-live-feedback');
    if (!el) return;
    const text = String(message || '').trim();
    el.textContent = text;
    el.classList.toggle('hidden', !text);
    el.classList.toggle('is-good', tone === 'good');
    el.classList.toggle('is-warn', tone === 'warn');
  }

  function getChallengeDraftStorage() {
    try {
      const raw = JSON.parse(localStorage.getItem(CHALLENGE_DRAFT_KEY) || '{}');
      return raw && typeof raw === 'object' ? raw : {};
    } catch {
      return {};
    }
  }

  function setChallengeDraftStorage(storage) {
    const next = storage && typeof storage === 'object' ? storage : {};
    const entries = Object.entries(next)
      .filter(([, value]) => value && typeof value === 'object')
      .sort((a, b) => (Number(b[1]?.updatedAt) || 0) - (Number(a[1]?.updatedAt) || 0))
      .slice(0, 48);
    const trimmed = Object.create(null);
    entries.forEach(([key, value]) => { trimmed[key] = value; });
    try { localStorage.setItem(CHALLENGE_DRAFT_KEY, JSON.stringify(trimmed)); } catch {}
  }

  function getChallengeDraftKey(state) {
    if (!state) return '';
    const word = String(state.word || '').trim().toLowerCase();
    const topic = String(state.topic || '').trim().toLowerCase();
    if (!word) return '';
    return `${word}::${topic}`;
  }

  function loadChallengeDraft(state) {
    const key = getChallengeDraftKey(state);
    if (!key) return null;
    const storage = getChallengeDraftStorage();
    const draft = storage[key];
    if (!draft || typeof draft !== 'object') return null;
    const updatedAt = Math.max(0, Number(draft.updatedAt) || 0);
    const maxAgeMs = 1000 * 60 * 60 * 24 * 21;
    if (!updatedAt || Date.now() - updatedAt > maxAgeMs) return null;
    return {
      responses: {
        analyze: String(draft.responses?.analyze || ''),
        create: String(draft.responses?.create || '')
      },
      tasks: {
        listen: !!draft.tasks?.listen,
        analyze: !!draft.tasks?.analyze,
        create: !!draft.tasks?.create
      }
    };
  }

  function saveChallengeDraft(state) {
    const key = getChallengeDraftKey(state);
    if (!key) return;
    const storage = getChallengeDraftStorage();
    storage[key] = {
      updatedAt: Date.now(),
      responses: {
        analyze: String(state?.responses?.analyze || ''),
        create: String(state?.responses?.create || '')
      },
      tasks: {
        listen: !!state?.tasks?.listen,
        analyze: !!state?.tasks?.analyze,
        create: !!state?.tasks?.create
      }
    };
    setChallengeDraftStorage(storage);
  }

  function clearChallengeDraft(state) {
    const key = getChallengeDraftKey(state);
    if (!key) return;
    const storage = getChallengeDraftStorage();
    if (!Object.prototype.hasOwnProperty.call(storage, key)) return;
    delete storage[key];
    setChallengeDraftStorage(storage);
  }

  function updateChallengeWordCountUI() {
    // Legacy function retained for compatibility with older save/report paths.
  }

  function shuffleList(values) {
    const list = Array.isArray(values) ? [...values] : [];
    for (let i = list.length - 1; i > 0; i -= 1) {
      const j = Math.floor(Math.random() * (i + 1));
      [list[i], list[j]] = [list[j], list[i]];
    }
    return list;
  }

  function normalizeChallengeWord(value) {
    return String(value || '').toLowerCase().replace(/[^a-z]/g, '');
  }

  function inferChallengeWordRole(entryData, wordValue = '') {
    const word = normalizeChallengeWord(wordValue || entryData?.word || '');
    const definition = String(entryData?.definition || '').replace(/\s+/g, ' ').trim().toLowerCase();
    const sentence = String(entryData?.sentence || '').replace(/\s+/g, ' ').trim().toLowerCase();

    if (/(?:ly)$/.test(word) && !/(?:family|only|early|friendly)$/.test(word)) return 'adverb';
    if (/^to\s+[a-z]/.test(definition)) return 'verb';
    if (/\b(action|act|move|do|make|run|jump|write|read|carry|help)\b/.test(definition) && /\bto\b/.test(definition)) {
      return 'verb';
    }
    if (/\b(describing|quality|kind of|full of|having|able to|like)\b/.test(definition)) return 'adjective';
    if (/\b(person|place|thing|idea|someone|something)\b/.test(definition)) return 'noun';
    if (/\b(quickly|slowly|carefully|quietly)\b/.test(sentence)) return 'adverb';
    return 'general';
  }

  function getChallengeWordRoleMeta(entryData, wordValue = '') {
    const roleKey = inferChallengeWordRole(entryData, wordValue);
    return {
      key: roleKey,
      ...(CHALLENGE_WORD_ROLE_META[roleKey] || CHALLENGE_WORD_ROLE_META.general)
    };
  }

  function escapeForRegExp(value) {
    return String(value || '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  function fallbackPatternPieces(wordValue) {
    const word = normalizeChallengeWord(wordValue);
    if (!word) return [];
    if (word.length <= 3) {
      return word.split('');
    }
    if (word.length <= 5) {
      return [word.slice(0, 1), word.slice(1, 3), word.slice(3)].filter(Boolean);
    }
    return [word.slice(0, 2), word.slice(2, word.length - 2), word.slice(word.length - 2)].filter(Boolean);
  }

  function resolvePatternPrompt(mark, isPrefixLike, variant = 'chunk') {
    if (variant === 'anchor') {
      if (mark === 'affix') return isPrefixLike ? 'Tap the chunk at the start that guides pronunciation.' : 'Tap the chunk at the end that guides pronunciation.';
      if (mark === 'silent') return 'Tap the chunk that changes the sound without saying every letter.';
      return 'Tap the chunk that best anchors the vowel sound.';
    }
    if (mark === 'team') return 'Tap the sound team chunk.';
    if (mark === 'silent') return 'Tap the silent letter chunk.';
    if (mark === 'affix') return isPrefixLike ? 'Tap the prefix chunk.' : 'Tap the suffix chunk.';
    if (mark === 'schwa') return 'Tap the schwa vowel chunk.';
    if (mark === 'letter') return 'Tap the vowel anchor chunk.';
    return 'Tap the target sound chunk.';
  }

  function scorePatternFallbackChunk(label) {
    const chunk = String(label || '').toUpperCase().replace(/[^A-Z]/g, '');
    if (!chunk) return Number.NEGATIVE_INFINITY;
    const vowelCount = (chunk.match(/[AEIOUY]/g) || []).length;
    const hasAnchorCluster = /(AI|AY|AU|AW|EA|EE|EI|EY|IE|OA|OE|OI|OO|OU|OW|OY|UE|UI|AR|ER|IR|OR|UR|IGH|CH|SH|TH|PH|WH|TCH|DGE|CK|NG|NK)/.test(chunk);
    let score = vowelCount * 5;
    if (hasAnchorCluster) score += 3;
    if (vowelCount === 0) score -= 4;
    score += Math.min(2, chunk.length * 0.3);
    return score;
  }

  function resolveFallbackPatternChoiceIndex(choices) {
    const list = Array.isArray(choices) ? choices : [];
    if (!list.length) return 0;
    let bestIndex = -1;
    let bestScore = Number.NEGATIVE_INFINITY;
    list.forEach((choice, index) => {
      const score = scorePatternFallbackChunk(choice?.label);
      if (score > bestScore) {
        bestScore = score;
        bestIndex = index;
      }
    });
    if (bestIndex >= 0) return bestIndex;
    return Math.max(0, Math.floor((list.length - 1) / 2));
  }

  function computeWordVariantSeed(word) {
    const text = String(word || '').toLowerCase();
    let seed = 0;
    for (let i = 0; i < text.length; i += 1) {
      seed = ((seed * 31) + text.charCodeAt(i)) % 2147483647;
    }
    seed += (Date.now() % 997);
    return Math.abs(seed);
  }

  function pickDeepDiveTaskVariant(result, task) {
    const options = DEEP_DIVE_VARIANTS[task];
    if (!Array.isArray(options) || !options.length) return '';
    const entryData = result?.entry || null;
    const word = String(result?.word || entryData?.word || '').trim();
    const seed = computeWordVariantSeed(`${word}:${task}`);
    return options[seed % options.length] || options[0];
  }

  function buildDeepDiveVariants(result) {
    return {
      listen: pickDeepDiveTaskVariant(result, 'listen') || 'chunk',
      analyze: pickDeepDiveTaskVariant(result, 'analyze') || 'definition',
      create: pickDeepDiveTaskVariant(result, 'create') || 'sentence_pick'
    };
  }

  function buildDeepDivePatternTask(result, variant = 'chunk') {
    const entryData = result?.entry || null;
    const word = normalizeChallengeWord(result?.word || entryData?.word || '');
    if (!word) {
      return {
        prompt: 'Tap the target sound chunk.',
        helper: '',
        choices: []
      };
    }

    const focusValue = _el('setting-focus')?.value || prefs.focus || 'all';
    const phonicsTag = String(entryData?.phonics || '').trim();
    let category = normalizeHintCategoryFromFocusTag(focusValue, phonicsTag);
    if (category === 'general') category = detectHintCategoryFromWord(word);
    const live = buildLiveHintExample(word, category);

    let choices = Array.isArray(live?.parts)
      ? live.parts
        .map((part, index) => {
          const text = String(part?.text || '').toUpperCase();
          if (!text) return null;
          const mark = String(part?.mark || '').trim().toLowerCase();
          return {
            id: `pattern-${index}`,
            label: text,
            mark,
            correct: !!mark
          };
        })
        .filter(Boolean)
      : [];

    if (!choices.length) {
      const pieces = fallbackPatternPieces(word);
      choices = pieces.map((piece, index) => ({
        id: `pattern-${index}`,
        label: String(piece || '').toUpperCase(),
        mark: '',
        correct: false
      }));
    }

    if (!choices.length) {
      choices = [{
        id: 'pattern-full',
        label: word.toUpperCase(),
        mark: '',
        correct: true
      }];
    }

    let usedFallbackAnchor = false;
    let correctChoice = choices.find((choice) => choice.correct);
    if (!correctChoice) {
      const fallbackIndex = resolveFallbackPatternChoiceIndex(choices);
      correctChoice = choices[fallbackIndex] || choices[0];
      if (correctChoice) {
        correctChoice.correct = true;
        if (!correctChoice.mark) correctChoice.mark = 'letter';
        usedFallbackAnchor = true;
      }
    }

    const prefixLike = !!correctChoice && choices[0] && correctChoice.id === choices[0].id;
    const helperNote = String(live?.note || '').trim();
    return {
      prompt: resolvePatternPrompt(correctChoice?.mark || '', prefixLike, variant),
      helper: helperNote || (usedFallbackAnchor
        ? `Look for the chunk that carries the vowel anchor in ${word.toUpperCase()}.`
        : ''),
      choices: choices.map((choice) => ({
        id: choice.id,
        label: choice.label,
        correct: !!choice.correct
      }))
    };
  }

  function buildDeepDiveMeaningTask(result, roleMeta, variant = 'definition') {
    const entryData = result?.entry || null;
    const word = String(result?.word || entryData?.word || '').trim().toUpperCase();
    const correctDefinition = String(entryData?.definition || '').replace(/\s+/g, ' ').trim();
    const sentence = String(entryData?.sentence || '').replace(/\s+/g, ' ').trim();

    const selectedGrade = _el('s-grade')?.value || prefs.grade || DEFAULT_PREFS.grade;
    const focus = _el('setting-focus')?.value || prefs.focus || 'all';
    const gradeBand = String(entryData?.grade_band || getEffectiveGameplayGradeBand(selectedGrade, focus)).trim() || SAFE_DEFAULT_GRADE_BAND;

    const pool = shuffleList(WQData.getPlayableWords({
      gradeBand,
      length: 'any',
      phonics: 'all'
    }));

    const distractors = [];
    const distractorWords = [];
    pool.forEach((candidateWord) => {
      if (distractors.length >= 3) return;
      const normalizedCandidate = normalizeReviewWord(candidateWord);
      if (!normalizedCandidate || normalizedCandidate === normalizeReviewWord(word)) return;
      const candidateEntry = WQData.getEntry(normalizedCandidate);
      const candidateDefinition = String(candidateEntry?.definition || '').replace(/\s+/g, ' ').trim();
      if (!candidateDefinition || candidateDefinition.toLowerCase() === correctDefinition.toLowerCase()) return;
      if (distractors.some((item) => item.toLowerCase() === candidateDefinition.toLowerCase())) return;
      distractors.push(candidateDefinition);
      distractorWords.push(normalizedCandidate.toUpperCase());
    });

    const fallbackDistractors = [
      'A quick sound warm-up pattern.',
      'A place where words are sorted.',
      'A strategy for checking letter order.'
    ];
    while (distractors.length < 3) {
      const candidate = fallbackDistractors[distractors.length] || fallbackDistractors[0];
      if (!candidate) break;
      distractors.push(candidate);
      distractorWords.push('—');
    }

    const compact = (value) => {
      const clean = String(value || '').replace(/\s+/g, ' ').trim();
      if (clean.length <= 108) return clean;
      return `${clean.slice(0, 105).trim()}...`;
    };

    const choices = shuffleList([
      { id: 'meaning-correct', label: compact(correctDefinition || `${word} is the target word for this round.`), correct: true },
      ...distractors.slice(0, 3).map((label, index) => ({
        id: `meaning-${index + 1}`,
        label: compact(label),
        correct: false
      }))
    ]);

    let prompt = `Pick the meaning that matches this ${roleMeta?.kidLabel || 'word'}: "${word}".`;
    if (variant === 'context' && sentence) {
      prompt = `Use the sentence clue to choose the best meaning for "${word}": ${compact(sentence)}`;
    }

    return {
      prompt,
      choices,
      distractorWords
    };
  }

  function buildDeepDiveSyntaxTask(result, meaningTask, roleMeta, variant = 'sentence_pick') {
    const entryData = result?.entry || null;
    const word = String(result?.word || entryData?.word || '').trim().toUpperCase();
    const normalizedWord = normalizeChallengeWord(word);
    const rawSentence = String(entryData?.sentence || '').replace(/\s+/g, ' ').trim();

    const fallbackSentence = `${word} fits in this sentence because the meaning matches the context.`;
    const correctSentence = rawSentence || fallbackSentence;

    const distractorWord = normalizeChallengeWord(meaningTask?.distractorWords?.[0] || '')
      || normalizeChallengeWord(pickRandom(WQData.getPlayableWords({ gradeBand: SAFE_DEFAULT_GRADE_BAND, length: 'any', phonics: 'all' })))
      || 'banana';

    let wrongSentence = correctSentence;
    if (normalizedWord && new RegExp(`\\b${escapeForRegExp(normalizedWord)}\\b`, 'i').test(correctSentence)) {
      wrongSentence = correctSentence.replace(
        new RegExp(`\\b${escapeForRegExp(normalizedWord)}\\b`, 'i'),
        distractorWord.toLowerCase()
      );
    } else {
      wrongSentence = `Because ${normalizedWord || 'word'} the students quickly.`;
    }

    const compact = (value) => {
      const clean = String(value || '').replace(/\s+/g, ' ').trim();
      if (clean.length <= 120) return clean;
      return `${clean.slice(0, 117).trim()}...`;
    };

    const prompt = variant === 'sentence_fix'
      ? `Which sentence needs "${word}" to make sense?`
      : `Which sentence uses this ${roleMeta?.kidLabel || 'word'} correctly: "${word}"?`;
    const wrongLabel = variant === 'sentence_fix'
      ? compact(`The class planned to ${distractorWord.toLowerCase()} the story during lunch.`)
      : compact(wrongSentence);

    return {
      prompt,
      choices: shuffleList([
        { id: 'syntax-correct', label: compact(correctSentence), correct: true },
        { id: 'syntax-wrong', label: wrongLabel, correct: false }
      ])
    };
  }

  function buildDeepDiveState(result) {
    const entryData = result?.entry || null;
    const roleMeta = getChallengeWordRoleMeta(entryData, result?.word || entryData?.word || '');
    const variants = buildDeepDiveVariants(result);
    const patternTask = buildDeepDivePatternTask(result, variants.listen);
    const meaningTask = buildDeepDiveMeaningTask(result, roleMeta, variants.analyze);
    const syntaxTask = buildDeepDiveSyntaxTask(result, meaningTask, roleMeta, variants.create);
    const analyzeHelper = variants.analyze === 'context'
      ? `Use context clues first, then confirm the definition for this ${roleMeta.kidLabel}.`
      : `Choose the definition that fits this ${roleMeta.kidLabel}.`;
    const createHelper = variants.create === 'sentence_fix'
      ? 'Find the sentence where the target word makes the meaning sound right.'
      : (roleMeta.contextHelper || 'Pick the sentence where the word fits naturally.');
    return {
      role: roleMeta,
      variants,
      titles: {
        listen: `1. ${CHALLENGE_TASK_LABELS.listen}`,
        analyze: `2. ${CHALLENGE_TASK_LABELS.analyze}`,
        create: `3. ${CHALLENGE_TASK_LABELS.create}`
      },
      prompts: {
        listen: patternTask.prompt,
        analyze: meaningTask.prompt,
        create: syntaxTask.prompt
      },
      helpers: {
        listen: patternTask.helper || 'Find the chunk that carries the key sound.',
        analyze: analyzeHelper,
        create: createHelper
      },
      choices: {
        listen: patternTask.choices,
        analyze: meaningTask.choices,
        create: syntaxTask.choices
      },
      selected: {
        listen: '',
        analyze: '',
        create: ''
      },
      attempts: {
        listen: 0,
        analyze: 0,
        create: 0
      }
    };
  }

  function getChallengeDoneCount(state = revealChallengeState) {
    return CHALLENGE_TASK_FLOW
      .reduce((count, task) => count + (state?.tasks?.[task] ? 1 : 0), 0);
  }

  function getFirstIncompleteChallengeTask(state = revealChallengeState) {
    return CHALLENGE_TASK_FLOW.find((task) => !state?.tasks?.[task]) || '';
  }

  function getNextChallengeTask(state = revealChallengeState, fromTask = '') {
    if (!state) return '';
    const index = Math.max(0, CHALLENGE_TASK_FLOW.indexOf(fromTask || state.activeTask));
    for (let i = index + 1; i < CHALLENGE_TASK_FLOW.length; i += 1) {
      const task = CHALLENGE_TASK_FLOW[i];
      if (!state.tasks?.[task]) return task;
    }
    for (let i = 0; i <= index; i += 1) {
      const task = CHALLENGE_TASK_FLOW[i];
      if (!state.tasks?.[task]) return task;
    }
    return '';
  }

  function setChallengeActiveTask(task, state = revealChallengeState) {
    if (!state) return '';
    const firstIncomplete = getFirstIncompleteChallengeTask(state);
    const lockIndex = CHALLENGE_TASK_FLOW.indexOf(firstIncomplete);
    if (CHALLENGE_TASK_FLOW.includes(task)) {
      const requestedIndex = CHALLENGE_TASK_FLOW.indexOf(task);
      state.activeTask = (lockIndex >= 0 && requestedIndex > lockIndex)
        ? firstIncomplete
        : task;
      return state.activeTask;
    }
    const fallback = getFirstIncompleteChallengeTask(state) || CHALLENGE_TASK_FLOW[0];
    state.activeTask = fallback;
    return fallback;
  }

  function getChallengeInstructionText(state = revealChallengeState) {
    const profile = getChallengeScaffoldProfile(state);
    const doneCount = getChallengeDoneCount(state);
    if (doneCount >= 3) return profile.instructionDone;
    const activeTask = setChallengeActiveTask(state?.activeTask, state);
    const stationIndex = Math.max(0, CHALLENGE_TASK_FLOW.indexOf(activeTask)) + 1;
    return profile.instructionActive(stationIndex);
  }

  function syncChallengeActionButtons(state = revealChallengeState) {
    const nextBtn = _el('challenge-next-station');
    const saveBtn = _el('challenge-save-reflection');
    const finishBtn = _el('challenge-finish-btn');
    const buttons = [nextBtn, saveBtn, finishBtn].filter(Boolean);
    buttons.forEach((button) => button.classList.remove('is-primary-action'));

    if (!state) {
      if (nextBtn) {
        nextBtn.classList.remove('hidden');
        nextBtn.disabled = true;
        nextBtn.textContent = 'Next Step';
      }
      if (saveBtn) saveBtn.classList.add('hidden');
      if (finishBtn) {
        finishBtn.classList.add('hidden');
        finishBtn.disabled = true;
        finishBtn.textContent = 'Finish';
      }
      return;
    }

    const doneCount = getChallengeDoneCount(state);
    const activeTask = setChallengeActiveTask(state.activeTask, state);
    const nextTask = getNextChallengeTask(state, activeTask);
    const canAdvance = !!nextTask && !!state.tasks?.[activeTask] && !state.completedAt;

    if (nextBtn) {
      nextBtn.classList.toggle('hidden', doneCount >= 3);
      nextBtn.disabled = !canAdvance;
      nextBtn.textContent = canAdvance ? 'Next Step' : 'Finish This Step';
      if (doneCount < 3) nextBtn.classList.add('is-primary-action');
    }

    if (saveBtn) {
      saveBtn.classList.toggle('hidden', doneCount <= 0);
      saveBtn.textContent = doneCount >= 3 ? 'Save Progress' : 'Save Checkpoint';
    }

    if (finishBtn) {
      finishBtn.classList.toggle('hidden', doneCount < 3);
      finishBtn.disabled = doneCount < 3;
      finishBtn.textContent = doneCount >= 3 ? 'Finish' : `Finish (${doneCount}/3)`;
      if (doneCount >= 3) finishBtn.classList.add('is-primary-action');
    }
  }

  function updateChallengeStationUI(state = revealChallengeState) {
    const instruction = _el('challenge-instruction');

    if (!state) {
      document.querySelectorAll('[data-challenge-task]').forEach((panel) => {
        panel.classList.remove('is-active');
        panel.setAttribute('aria-hidden', 'true');
      });
      const first = document.querySelector('[data-challenge-task="listen"]');
      first?.classList.add('is-active');
      first?.setAttribute('aria-hidden', 'false');
      document.querySelectorAll('[data-challenge-station]').forEach((pill) => {
        pill.classList.remove('is-active', 'is-complete');
        pill.setAttribute('aria-selected', 'false');
      });
      const firstPill = document.querySelector('[data-challenge-station="listen"]');
      firstPill?.classList.add('is-active');
      firstPill?.setAttribute('aria-selected', 'true');
      if (instruction) instruction.textContent = 'One step at a time. Finish all 3 steps.';
      syncChallengeActionButtons(null);
      return;
    }

    const activeTask = setChallengeActiveTask(state.activeTask, state);
    const activeIndex = Math.max(0, CHALLENGE_TASK_FLOW.indexOf(activeTask));
    CHALLENGE_TASK_FLOW.forEach((task, index) => {
      const panel = document.querySelector(`[data-challenge-task="${task}"]`);
      const pill = document.querySelector(`[data-challenge-station="${task}"]`);
      const isActive = index === activeIndex;
      const isComplete = !!state.tasks?.[task];
      if (panel) {
        panel.classList.toggle('is-active', isActive);
        panel.setAttribute('aria-hidden', isActive ? 'false' : 'true');
      }
      if (pill) {
        pill.classList.toggle('is-active', isActive);
        pill.classList.toggle('is-complete', isComplete);
        pill.setAttribute('aria-selected', isActive ? 'true' : 'false');
      }
    });

    if (instruction) instruction.textContent = getChallengeInstructionText(state);
    syncChallengeActionButtons(state);
    syncChallengePacingTimer(state);
  }

  function syncChallengePacingTimer(state = revealChallengeState) {
    if (!state || state.completedAt || getChallengeDoneCount(state) >= CHALLENGE_TASK_FLOW.length) {
      clearChallengeSprintTimer();
      return;
    }
    const modal = _el('challenge-modal');
    const modalOpen = !!modal && !modal.classList.contains('hidden');
    if (!modalOpen) {
      clearChallengeSprintTimer();
      return;
    }
    const activeTask = setChallengeActiveTask(state.activeTask, state);
    if (!activeTask || state.tasks?.[activeTask]) {
      clearChallengePacingTimer();
      return;
    }
    if (!state.pacing || typeof state.pacing !== 'object') {
      state.pacing = { task: activeTask, startedAt: Date.now(), nudged: false };
    } else if (state.pacing.task !== activeTask) {
      state.pacing.task = activeTask;
      state.pacing.startedAt = Date.now();
      state.pacing.nudged = false;
    }
    if (state.pacing.nudged) {
      clearChallengePacingTimer();
      return;
    }
    const startedAt = Math.max(0, Number(state.pacing.startedAt) || 0);
    if (!startedAt) {
      state.pacing.startedAt = Date.now();
    }
    const elapsed = Math.max(0, Date.now() - Math.max(1, Number(state.pacing.startedAt) || 0));
    const remainingMs = Math.max(300, CHALLENGE_PACING_NUDGE_MS - elapsed);
    clearChallengePacingTimer();
    challengePacingTimer = setTimeout(() => {
      challengePacingTimer = 0;
      if (!revealChallengeState || revealChallengeState.completedAt || getChallengeDoneCount(revealChallengeState) >= CHALLENGE_TASK_FLOW.length) return;
      const liveModal = _el('challenge-modal');
      if (!liveModal || liveModal.classList.contains('hidden')) return;
      const currentTask = setChallengeActiveTask(revealChallengeState.activeTask, revealChallengeState);
      if (!currentTask) return;
      if (!revealChallengeState.pacing || typeof revealChallengeState.pacing !== 'object') return;
      if (revealChallengeState.pacing.task !== currentTask) return;
      if (revealChallengeState.tasks?.[currentTask]) return;
      if (revealChallengeState.pacing.nudged) return;
      revealChallengeState.pacing.nudged = true;
      const profile = getChallengeScaffoldProfile(revealChallengeState);
      setChallengeFeedback(profile.pace, 'default');
    }, remainingMs);
  }

  function getChallengeChoice(task, choiceId, stateOverride = revealChallengeState) {
    const state = stateOverride;
    if (!state?.deepDive?.choices) return null;
    const rows = state.deepDive.choices[task];
    if (!Array.isArray(rows)) return null;
    return rows.find((choice) => String(choice?.id || '') === String(choiceId || '')) || null;
  }

  function syncChallengeResponseSummary(state = revealChallengeState) {
    if (!state || !state.deepDive) return;
    const summarize = (task) => {
      const selectedId = String(state.deepDive.selected?.[task] || '');
      if (!selectedId) return '';
      const choice = getChallengeChoice(task, selectedId, state);
      return String(choice?.label || '').replace(/\s+/g, ' ').trim();
    };
    const pattern = summarize('listen');
    const meaning = summarize('analyze');
    const syntax = summarize('create');
    state.responses.analyze = [`Pattern: ${pattern || '—'}`, `Meaning: ${meaning || '—'}`].join(' | ');
    state.responses.create = `Sentence: ${syntax || '—'}`;
  }

  function renderChallengeChoiceButtons(containerId, task) {
    const wrap = _el(containerId);
    if (!wrap) return;
    const state = revealChallengeState;
    const deepDive = state?.deepDive;
    const choices = Array.isArray(deepDive?.choices?.[task]) ? deepDive.choices[task] : [];
    const selectedId = String(deepDive?.selected?.[task] || '');
    wrap.innerHTML = '';

    if (!choices.length) {
      const empty = document.createElement('div');
      empty.className = 'challenge-mission-helper';
      empty.textContent = 'Choices are loading for this step.';
      wrap.appendChild(empty);
      return;
    }

    choices.forEach((choice) => {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'challenge-choice-btn';
      button.dataset.challengeChoiceTask = task;
      button.dataset.choiceId = String(choice.id || '');
      button.textContent = String(choice.label || '');
      const selected = selectedId && selectedId === String(choice.id || '');
      if (selected) {
        button.classList.add('is-selected');
        button.classList.add(choice.correct ? 'is-correct' : 'is-wrong');
      }
      if (selected && choice.correct) button.disabled = true;
      wrap.appendChild(button);
    });
  }

  function handleChallengeChoiceSelection(task, choiceId) {
    const state = revealChallengeState;
    if (!state || !state.deepDive || state.completedAt) return;
    if (!Object.prototype.hasOwnProperty.call(state.tasks, task)) return;

    const choice = getChallengeChoice(task, choiceId);
    if (!choice) return;

    state.deepDive.selected[task] = String(choice.id || '');
    state.deepDive.attempts[task] = Math.max(0, Number(state.deepDive.attempts[task]) || 0) + 1;
    const wasComplete = !!state.tasks[task];
    setChallengeTaskComplete(task, !!choice.correct);
    syncChallengeResponseSummary(state);

    if (!choice.correct) {
      renderRevealChallengeModal();
      setChallengeFeedback('Nice try. Pick another choice.', 'warn');
      return;
    }

    if (!wasComplete) {
      const nextTask = getNextChallengeTask(state, task);
      if (nextTask) state.activeTask = nextTask;
    }
    renderRevealChallengeModal();
    const remainingTask = getFirstIncompleteChallengeTask(state);
    if (remainingTask) {
      setChallengeFeedback(`${CHALLENGE_TASK_LABELS[task] || 'Step'} complete. Next step unlocked.`, 'good');
      return;
    }
    setChallengeFeedback('All 3 steps are done. Tap Finish.', 'good');
  }

  function computeChallengeScore(state) {
    if (!state) return { clarity: 0, evidence: 0, vocabulary: 0, total: 0 };
    const attempts = state.deepDive?.attempts || {};
    const taskList = CHALLENGE_TASK_FLOW;
    const doneCount = taskList.reduce((count, task) => count + (state.tasks?.[task] ? 1 : 0), 0);
    const firstTryCount = taskList.reduce((count, task) => (
      count + (state.tasks?.[task] && Number(attempts?.[task] || 0) <= 1 ? 1 : 0)
    ), 0);
    const extraAttempts = taskList.reduce((count, task) => (
      count + Math.max(0, (Number(attempts?.[task] || 0) || 0) - 1)
    ), 0);
    const penalty = Math.min(22, extraAttempts * 4);

    const clarity = Math.max(0, Math.min(100, 36 + (doneCount * 18) + (firstTryCount * 5) - penalty));
    const evidence = Math.max(0, Math.min(100, 34 + (state.tasks?.analyze ? 28 : 0) + (state.tasks?.create ? 22 : 0) + (firstTryCount * 4) - penalty));
    const vocabulary = Math.max(0, Math.min(100, 32 + (state.tasks?.listen ? 18 : 0) + (state.tasks?.analyze ? 24 : 0) + (state.tasks?.create ? 18 : 0) + (firstTryCount * 4) - penalty));
    const total = Math.round((clarity + evidence + vocabulary) / 3);
    return { clarity, evidence, vocabulary, total };
  }

  function updateChallengeScoreUI() {
    const scoreLabel = _el('challenge-score-label');
    const scoreDetail = _el('challenge-score-detail');
    if (!scoreLabel || !scoreDetail) return;
    if (!revealChallengeState) {
      scoreLabel.textContent = 'Deep Dive score: --';
      scoreDetail.textContent = 'Band -- · Accuracy -- · Meaning -- · Syntax --';
      return;
    }
    const score = computeChallengeScore(revealChallengeState);
    const band = resolveMissionScoreBand(score.total);
    revealChallengeState.score = score;
    scoreLabel.textContent = `Deep Dive score: ${score.total}/100`;
    scoreDetail.textContent = `${band} band · Accuracy ${score.clarity} · Meaning ${score.evidence} · Syntax ${score.vocabulary}`;
  }

  function clearRevealAutoAdvanceTimer() {
    if (revealAutoAdvanceTimer) {
      clearTimeout(revealAutoAdvanceTimer);
      revealAutoAdvanceTimer = 0;
    }
    if (revealAutoCountdownTimer) {
      clearInterval(revealAutoCountdownTimer);
      revealAutoCountdownTimer = 0;
    }
    revealAutoAdvanceEndsAt = 0;
    _el('modal-auto-next-banner')?.classList.add('hidden');
  }

  function showModalAutoNextBanner(message) {
    const banner = _el('modal-auto-next-banner');
    const label = _el('modal-auto-next-countdown');
    if (!banner || !label) return;
    label.textContent = message;
    banner.classList.remove('hidden');
  }

  function waitMs(ms) {
    const delay = Math.max(0, Number(ms) || 0);
    return new Promise((resolve) => setTimeout(resolve, delay));
  }

  function getRevealPacingPreset() {
    const mode = getRevealPacingMode();
    return REVEAL_PACING_PRESETS[mode] || REVEAL_PACING_PRESETS.guided;
  }

  function scheduleRevealAutoAdvance() {
    clearRevealAutoAdvanceTimer();
    const seconds = getRevealAutoNextSeconds();
    if (seconds <= 0) return;
    if (getVoicePracticeMode() === 'required') return;
    if (_el('modal-overlay')?.classList.contains('hidden')) return;
    revealAutoAdvanceEndsAt = Date.now() + (seconds * 1000);

    const tickCountdown = () => {
      if (_el('modal-overlay')?.classList.contains('hidden')) {
        clearRevealAutoAdvanceTimer();
        return;
      }
      if (voiceIsRecording) {
        showModalAutoNextBanner('Auto next waits for recording to finish...');
        return;
      }
      const remaining = Math.max(0, Math.ceil((revealAutoAdvanceEndsAt - Date.now()) / 1000));
      showModalAutoNextBanner(`Next word in ${remaining}s`);
    };
    tickCountdown();
    revealAutoCountdownTimer = setInterval(tickCountdown, 250);

    const tryAdvance = () => {
      if (_el('modal-overlay')?.classList.contains('hidden')) {
        clearRevealAutoAdvanceTimer();
        return;
      }
      if (voiceIsRecording) {
        revealAutoAdvanceTimer = setTimeout(tryAdvance, 900);
        return;
      }
      clearRevealAutoAdvanceTimer();
      newGame();
    };
    revealAutoAdvanceTimer = setTimeout(tryAdvance, seconds * 1000);
  }

  function shouldIncludeFunInMeaning() {
    const toggle = _el('s-meaning-fun-link');
    if (toggle) return !!toggle.checked;
    return (prefs.meaningPlusFun || DEFAULT_PREFS.meaningPlusFun) === 'on';
  }

  function cancelRevealNarration() {
    revealNarrationToken += 1;
    WQAudio.stop();
  }

  function trimToastDefinition(definition) {
    const text = String(definition || '').replace(/\s+/g, ' ').trim();
    if (!text) return '';
    if (text.length <= 72) return text;
    return `${text.slice(0, 69).trim()}...`;
  }

  function ensureTerminalPunctuation(text) {
    const clean = String(text || '').replace(/\s+/g, ' ').trim();
    if (!clean) return '';
    return /[.!?]$/.test(clean) ? clean : `${clean}.`;
  }

  function buildCombinedMeaningLine(definition, funAddOn) {
    const def = String(definition || '').replace(/\s+/g, ' ').trim();
    const fun = String(funAddOn || '').replace(/\s+/g, ' ').trim();
    if (!def && !fun) return '';
    if (!def) return ensureTerminalPunctuation(fun);
    if (!fun) return ensureTerminalPunctuation(def);
    const defBase = def.replace(/[.!?]+$/, '').trim();
    if (/^[,.;:!?]/.test(fun)) {
      return ensureTerminalPunctuation(`${defBase}${fun}`);
    }
    const funNoLeadPunc = fun.replace(/^[,.;:!?]\s*/, '').trim();
    return ensureTerminalPunctuation(`${defBase} and ${funNoLeadPunc}`);
  }

  function getRevealMeaningPayload(nextEntry) {
    const definition = String(nextEntry?.definition || '').replace(/\s+/g, ' ').trim();
    const includeFun = shouldIncludeFunInMeaning();
    const funAddOn = includeFun
      ? String(nextEntry?.fun_add_on || '').replace(/\s+/g, ' ').trim()
      : '';
    const line = buildCombinedMeaningLine(definition, funAddOn);
    const readDef = String(nextEntry?.text_to_read_definition || '').replace(/\s+/g, ' ').trim()
      || ensureTerminalPunctuation(
        nextEntry?.word && definition
          ? `${nextEntry.word} means ${definition}`
          : definition
      );
    const readFun = includeFun
      ? String(nextEntry?.text_to_read_fun || '').replace(/\s+/g, ' ').trim() || funAddOn
      : '';
    const readAll = (() => {
      if (readDef && readFun) {
        const smoothDef = readDef.replace(/[.!?]+$/, '').trim();
        const smoothFun = readFun.replace(/^[,.;:!?]\s*/, '').trim();
        return ensureTerminalPunctuation(`${smoothDef} and ${smoothFun}`);
      }
      return [readDef, readFun].filter(Boolean).join(' ').replace(/\s+/g, ' ').trim();
    })();
    return { definition, funAddOn, line, readAll };
  }

  function syncRevealMeaningHighlight(nextEntry) {
    const wrap = _el('modal-meaning-highlight');
    const lineEl = _el('modal-meaning-highlight-line');
    if (!wrap || !lineEl) return;

    const meaning = getRevealMeaningPayload(nextEntry);
    lineEl.textContent = meaning.line;
    wrap.classList.toggle('hidden', !meaning.line);
    syncRevealReadCue(nextEntry);
  }

  function buildRevealReadCue(text) {
    const sentence = String(text || '').replace(/\s+/g, ' ').trim();
    if (!sentence) return '';
    const cues = [];
    if (/\?$/.test(sentence)) cues.push('Lift your voice slightly at the end for the question mark.');
    else if (/!$/.test(sentence)) cues.push('Use a strong voice at the exclamation point.');
    else cues.push('Let your voice drop at the period to finish clearly.');
    if (/,/.test(sentence)) cues.push('Pause briefly at commas.');
    else if (/\b(because|although|when|if|while)\b/i.test(sentence)) cues.push('Add a small pause before the clause word.');
    return cues.slice(0, 2).join(' ');
  }

  function syncRevealReadCue(nextEntry) {
    const cueEl = _el('modal-read-cue');
    if (!cueEl) return;
    const sourceText = String(nextEntry?.sentence || '').trim() || String(nextEntry?.text_to_read_definition || '').trim();
    const cue = buildRevealReadCue(sourceText);
    cueEl.textContent = cue || '';
    cueEl.classList.toggle('hidden', !cue);
  }

  function getRevealFeedbackCopy(result) {
    const guessCount = Math.max(1, Number(result?.guesses?.length || 0));
    const maxGuesses = getActiveMaxGuesses();

    if (result?.won) {
      let key = 'steady';
      if (guessCount <= 1) key = 'lightning';
      else if (guessCount <= Math.max(2, Math.ceil(maxGuesses * 0.34))) key = 'fast';
      else if (guessCount >= Math.max(4, maxGuesses - 1)) key = 'resilient';
      return pickRandom(REVEAL_WIN_TOASTS[key]) || { lead: 'Great solve!', coach: '' };
    }

    const remaining = Math.max(0, maxGuesses - guessCount);
    let key = 'mid';
    if (remaining <= 1) key = 'close';
    else if (guessCount <= 2) key = 'early';
    return pickRandom(REVEAL_LOSS_TOASTS[key]) || { lead: 'Keep going.', coach: '' };
  }

  function getActiveMaxGuesses() {
    const stateMax = Number(WQGame.getState?.()?.maxGuesses || 0);
    const prefMax = Number.parseInt(_el('s-guesses')?.value || DEFAULT_PREFS.guesses, 10);
    return Math.max(1, Number.isFinite(stateMax) && stateMax > 0
      ? stateMax
      : Number.isFinite(prefMax) && prefMax > 0
        ? prefMax
        : 6);
  }

  function trimPromptText(value, max = 80) {
    const text = String(value || '').replace(/\s+/g, ' ').trim();
    if (!text) return '';
    if (text.length <= max) return text;
    return `${text.slice(0, Math.max(0, max - 3)).trim()}...`;
  }

  function pickThinkingLevel(result) {
    const guessCount = Math.max(1, Number(result?.guesses?.length || 0));
    const maxGuesses = getActiveMaxGuesses();
    if (result?.won) {
      if (guessCount <= Math.max(2, Math.ceil(maxGuesses * 0.34))) {
        return pickRandom(['evaluate', 'create']) || 'create';
      }
      if (guessCount <= Math.max(3, Math.ceil(maxGuesses * 0.67))) {
        return pickRandom(['apply', 'analyze']) || 'analyze';
      }
      return 'apply';
    }
    if (guessCount <= 2) return 'remember';
    if (guessCount >= Math.max(4, maxGuesses - 1)) return 'understand';
    return 'apply';
  }

  function getChallengeFocusLabel(value) {
    return getFocusLabel(value)
      .replace(/[—]/g, '')
      .replace(/\s+/g, ' ')
      .trim() || 'Classic (Wordle 5x6)';
  }

  function getChallengeTopicLabel(result) {
    const focusValue = _el('setting-focus')?.value || prefs.focus || 'all';
    const preset = parseFocusPreset(focusValue);
    const phonics = String(result?.entry?.phonics || '').trim();
    if (phonics && phonics.toLowerCase() !== 'all') return phonics;
    if (preset.kind === 'subject') return `${preset.subject.toUpperCase()} vocabulary`;
    if (preset.kind === 'phonics') return getChallengeFocusLabel(focusValue);
    return 'Word meaning + sentence clues';
  }

  function getChallengeGradeLabel(result) {
    const focusValue = _el('setting-focus')?.value || prefs.focus || 'all';
    const preset = parseFocusPreset(focusValue);
    if (preset.kind === 'subject' && preset.gradeBand) {
      return formatGradeBandLabel(preset.gradeBand);
    }
    const entryBand = String(result?.entry?.grade_band || '').trim();
    if (entryBand) return formatGradeBandLabel(entryBand);
    return formatGradeBandLabel(_el('s-grade')?.value || prefs.grade || DEFAULT_PREFS.grade);
  }

  function buildThinkingPrompt(level, result) {
    const word = String(result?.word || '').trim().toUpperCase();
    const sentence = trimPromptText(result?.entry?.sentence, 76);
    const topic = trimPromptText(getChallengeTopicLabel(result), 44);
    const promptsByLevel = {
      remember: [
        `Say "${word}" and spell it out loud.`,
        `Clap each sound in "${word}", then say the whole word.`
      ],
      understand: [
        `In your own words, what does "${word}" mean?`,
        sentence
          ? `How does "${word}" help the meaning of this sentence: "${sentence}"?`
          : `Tell what "${word}" means and give one real-life example.`
      ],
      apply: [
        `Use "${word}" in a brand-new sentence about your day.`,
        `Say a sentence with "${word}" that could happen at school or home.`
      ],
      analyze: [
        `Compare "${word}" with another word from this quest focus (${topic}). What is one key difference?`,
        `In this ${topic} quest, which clue helped most: start, ending, or sentence context? Why?`
      ],
      evaluate: [
        `Which strategy helped most this round and why?`,
        `If you played this word again, what one move would you keep? Explain.`
      ],
      create: [
        `Create a clue for "${word}" without saying the word.`,
        `Write a mini riddle that leads to "${word}".`
      ]
    };
    return pickRandom(promptsByLevel[level] || promptsByLevel.apply) || '';
  }

  function buildThinkingChallenge(result, options = {}) {
    if (!result?.word) return null;
    const forcedLevel = normalizeThinkingLevel(options.level || '');
    const level = forcedLevel || pickThinkingLevel(result);
    const meta = THINKING_LEVEL_META[level] || THINKING_LEVEL_META.apply;
    const prompt = buildThinkingPrompt(level, result);
    if (!prompt) return null;
    return {
      level,
      chip: meta.chip,
      prompt,
      teacher: meta.teacher
    };
  }

  function updateChallengeProgressUI() {
    const label = _el('challenge-progress-label');
    const fill = _el('challenge-progress-fill');
    const finishBtn = _el('challenge-finish-btn');
    if (!revealChallengeState) {
      if (label) label.textContent = '0 / 3 steps complete';
      if (fill) fill.style.width = '0%';
      if (finishBtn) finishBtn.disabled = true;
      if (finishBtn) finishBtn.textContent = 'Finish';
      setChallengeFeedback('');
      updateChallengeScoreUI();
      updateChallengeStationUI(null);
      return;
    }
    const doneCount = getChallengeDoneCount(revealChallengeState);
    if (label) label.textContent = `${doneCount} / 3 steps complete`;
    if (fill) fill.style.width = `${Math.round((doneCount / 3) * 100)}%`;
    if (finishBtn) {
      finishBtn.disabled = doneCount < 3;
      finishBtn.textContent = doneCount >= 3 ? 'Finish (3/3)' : `Finish (${doneCount}/3)`;
    }
    updateChallengeScoreUI();
    updateChallengeStationUI(revealChallengeState);
  }

  function setChallengeTaskComplete(task, complete) {
    if (!revealChallengeState || !Object.prototype.hasOwnProperty.call(revealChallengeState.tasks, task)) return;
    const normalized = !!complete;
    const wasComplete = !!revealChallengeState.tasks[task];
    revealChallengeState.tasks[task] = normalized;
    const card = document.querySelector(`[data-challenge-task="${task}"]`);
    const statusChip = _el(`challenge-status-${task}`);
    if (card) card.classList.toggle('is-complete', normalized);
    if (statusChip) {
      statusChip.textContent = normalized ? 'Completed' : 'Pending';
      statusChip.classList.toggle('is-complete', normalized);
    }
    if (normalized !== wasComplete) {
      if (normalized) {
        setChallengeFeedback(`${CHALLENGE_TASK_LABELS[task] || 'Step'} complete.`, 'good');
      } else {
        setChallengeFeedback(`${CHALLENGE_TASK_LABELS[task] || 'Step'} needs one more try.`, 'warn');
      }
    }
    saveChallengeDraft(revealChallengeState);
    updateChallengeProgressUI();
  }

  const deepDiveCoreFeature = window.WQDeepDiveCoreFeature?.createFeature?.({
    contract: DEEP_DIVE_CONTRACT,
    el: _el,
    getRevealChallengeState: () => revealChallengeState,
    getDoneCount: getChallengeDoneCount,
    setTaskComplete: setChallengeTaskComplete,
    setFeedback: setChallengeFeedback,
    renderModal: renderRevealChallengeModal
  }) || null;

  function renderRevealChallengeModal() {
    const state = revealChallengeState;
    if (!state) return;
    const challenge = state.challenge;
    if (!challenge) return;

    const levelChip = _el('challenge-level-chip');
    const wordChip = _el('challenge-word-chip');
    const topicChip = _el('challenge-topic-chip');
    const gradeChip = _el('challenge-grade-chip');
    const roleChip = _el('challenge-role-chip');
    const listenTitle = _el('challenge-listen-title');
    const analyzeTitle = _el('challenge-analyze-title');
    const createTitle = _el('challenge-create-title');
    const listenPrompt = _el('challenge-listen-prompt');
    const analyzePrompt = _el('challenge-analyze-prompt');
    const createPrompt = _el('challenge-create-prompt');
    const listenHelper = _el('challenge-listen-helper');
    const analyzeHelper = _el('challenge-analyze-helper');
    const createHelper = _el('challenge-create-helper');
    const teacherLens = _el('challenge-teacher-lens');
    const deepDive = state.deepDive || buildDeepDiveState(state.result);
    const scaffold = getChallengeScaffoldProfile(state);
    state.deepDive = deepDive;

    if (levelChip) levelChip.textContent = getChallengeLevelDisplay(challenge.level);
    if (wordChip) wordChip.textContent = `Word: ${state.word}`;
    if (topicChip) topicChip.textContent = `Quest focus: ${state.topic}`;
    if (gradeChip) gradeChip.textContent = `Grade: ${state.grade}`;
    if (roleChip) roleChip.textContent = `Word type: ${deepDive?.role?.label || 'Target Word'} (${deepDive?.role?.kidLabel || 'word'})`;
    if (listenTitle) listenTitle.textContent = deepDive?.titles?.listen || `1. ${CHALLENGE_TASK_LABELS.listen}`;
    if (analyzeTitle) analyzeTitle.textContent = deepDive?.titles?.analyze || `2. ${CHALLENGE_TASK_LABELS.analyze}`;
    if (createTitle) createTitle.textContent = deepDive?.titles?.create || `3. ${CHALLENGE_TASK_LABELS.create}`;
    if (listenPrompt) listenPrompt.textContent = deepDive.prompts.listen || `Tap the key sound chunk in "${state.word}".`;
    if (analyzePrompt) analyzePrompt.textContent = deepDive.prompts.analyze || `Pick the best meaning for "${state.word}".`;
    if (createPrompt) createPrompt.textContent = deepDive.prompts.create || `Choose the sentence that uses "${state.word}" correctly.`;
    if (listenHelper) listenHelper.textContent = `${deepDive.helpers.listen || ''} ${scaffold.listen}`.trim();
    if (analyzeHelper) analyzeHelper.textContent = `${deepDive.helpers.analyze || ''} ${scaffold.analyze}`.trim();
    if (createHelper) createHelper.textContent = `${deepDive.helpers.create || ''} ${scaffold.create}`.trim();
    if (teacherLens) teacherLens.textContent = `${challenge.teacher} Score updates appear in Teacher Hub.`;

    renderChallengeChoiceButtons('challenge-pattern-options', 'listen');
    renderChallengeChoiceButtons('challenge-meaning-options', 'analyze');
    renderChallengeChoiceButtons('challenge-syntax-options', 'create');
    syncChallengeResponseSummary(state);

    setChallengeTaskComplete('listen', !!state.tasks.listen);
    setChallengeTaskComplete('analyze', !!state.tasks.analyze);
    setChallengeTaskComplete('create', !!state.tasks.create);
    const feedbackText = String(_el('challenge-live-feedback')?.textContent || '').trim();
    if (!feedbackText) {
      setChallengeFeedback(getChallengeInstructionText(state), 'default');
    }
    updateChallengeProgressUI();
    syncChallengePacingTimer(state);
  }

  function buildRevealChallengeState(result, options = {}) {
    if (!result?.word) return null;
    const challenge = buildThinkingChallenge(result, {
      level: options.level
    });
    if (!challenge) return null;
    const word = String(result.word || '').trim().toUpperCase();
    const state = {
      attemptId: createMissionAttemptId(),
      result,
      word,
      topic: getChallengeTopicLabel(result),
      grade: getChallengeGradeLabel(result),
      source: String(options.source || 'reveal').trim() || 'reveal',
      challenge,
      tasks: { listen: false, analyze: false, create: false },
      activeTask: CHALLENGE_TASK_FLOW[0],
      responses: { analyze: '', create: '' },
      deepDive: buildDeepDiveState(result),
      pacing: { task: CHALLENGE_TASK_FLOW[0], startedAt: Date.now(), nudged: false },
      score: { clarity: 0, evidence: 0, vocabulary: 0, total: 0 },
      completedAt: 0
    };
    syncChallengeResponseSummary(state);
    return state;
  }

  function syncRevealChallengeLaunch(result) {
    const wrap = _el('modal-challenge-launch');
    const meta = _el('modal-challenge-launch-meta');
    const helper = _el('modal-challenge-launch-helper');
    if (!wrap || !meta) return;
    // Keep Deep Dive detached from core WordQuest reveal flow.
    if (!isMissionLabEnabled() || !isMissionLabStandaloneMode()) {
      revealChallengeState = null;
      meta.textContent = '';
      if (helper) helper.textContent = '';
      wrap.classList.add('hidden');
      clearChallengeSprintTimer();
      updateChallengeProgressUI();
      return;
    }
    const next = buildRevealChallengeState(result);
    revealChallengeState = next;
    if (!next) {
      meta.textContent = '';
      if (helper) helper.textContent = '';
      wrap.classList.add('hidden');
      clearChallengeSprintTimer();
      updateChallengeProgressUI();
      return;
    }
    meta.textContent = `${next.topic} · Grade ${next.grade} · 3 steps`;
    if (helper) {
      helper.textContent = 'Optional extension: finish 3 steps in order. You can also launch from Activities > Deep Dive.';
    }
    wrap.classList.remove('hidden');
    setChallengeFeedback('');
    updateChallengeProgressUI();
  }

  function getChallengeModalFocusableElements() {
    const modal = _el('challenge-modal');
    if (!modal || modal.classList.contains('hidden')) return [];
    return Array.from(
      modal.querySelectorAll('button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])')
    )
      .filter((node) => node instanceof HTMLElement)
      .filter((node) => node.getAttribute('aria-hidden') !== 'true')
      .filter((node) => node.getClientRects().length > 0);
  }

  function focusChallengeModalStart() {
    const closeBtn = _el('challenge-modal-close');
    const focusTarget = closeBtn || getChallengeModalFocusableElements()[0] || null;
    if (!focusTarget || typeof focusTarget.focus !== 'function') return;
    try {
      focusTarget.focus({ preventScroll: true });
    } catch {
      focusTarget.focus();
    }
  }

  function trapChallengeModalTab(event) {
    const focusables = getChallengeModalFocusableElements();
    if (!focusables.length) {
      event.preventDefault();
      return;
    }
    const first = focusables[0];
    const last = focusables[focusables.length - 1];
    const active = document.activeElement;
    const currentIndex = focusables.indexOf(active);
    if (event.shiftKey) {
      if (currentIndex <= 0) {
        event.preventDefault();
        last.focus();
      }
      return;
    }
    if (currentIndex === -1 || currentIndex >= focusables.length - 1) {
      event.preventDefault();
      first.focus();
    }
  }

  function openRevealChallengeModal() {
    if (!isMissionLabEnabled()) return;
    if (!revealChallengeState) {
      if (isMissionLabStandaloneMode()) {
        startStandaloneMissionLab();
        return;
      }
      WQUI.showToast('Solve a word first to unlock Deep Dive Quest.');
      return;
    }
    const activeElement = document.activeElement;
    challengeModalReturnFocusEl = activeElement instanceof HTMLElement && activeElement !== document.body
      ? activeElement
      : null;
    hideInformantHintCard();
    renderRevealChallengeModal();
    _el('challenge-modal')?.classList.remove('hidden');
    syncChallengeQuickstartCard(revealChallengeState);
    focusChallengeModalStart();
    emitTelemetry('wq_deep_dive_open', {
      source: revealChallengeState?.source || 'reveal'
    });
    emitTelemetry('wq_funnel_deep_dive_started', {
      source: revealChallengeState?.source || 'reveal',
      word_id: normalizeReviewWord(revealChallengeState?.word),
      level: revealChallengeState?.challenge?.level || ''
    });
  }

  function closeRevealChallengeModal(options = {}) {
    clearChallengeSprintTimer();
    const modal = _el('challenge-modal');
    const wasOpen = !!modal && !modal.classList.contains('hidden');
    modal?.classList.add('hidden');
    _el('challenge-quickstart')?.classList.add('hidden');
    const returnFocusEl = challengeModalReturnFocusEl;
    challengeModalReturnFocusEl = null;
    if (wasOpen && options.restoreFocus !== false && returnFocusEl && document.contains(returnFocusEl)) {
      if (typeof returnFocusEl.focus === 'function') {
        try {
          returnFocusEl.focus({ preventScroll: true });
        } catch {
          returnFocusEl.focus();
        }
      }
    }
    if (!options.preserveFeedback) setChallengeFeedback('');
  }

  function persistRevealChallengeRecord(record) {
    if (!record || typeof record !== 'object') return false;
    try {
      const prior = JSON.parse(localStorage.getItem(CHALLENGE_REFLECTION_KEY) || '[]');
      const rows = Array.isArray(prior) ? prior : [];
      const attemptId = String(record.attemptId || '').trim();
      if (attemptId) {
        const existingIndex = rows.findIndex((row) => String(row?.attemptId || '').trim() === attemptId);
        if (existingIndex >= 0) rows.splice(existingIndex, 1);
      }
      const duplicate = rows.find((row, index) => {
        if (index > 4) return false;
        if (!row || typeof row !== 'object') return false;
        if (Math.abs((Number(row.ts) || 0) - (Number(record.ts) || 0)) > 1400) return false;
        return String(row.word || '') === String(record.word || '') &&
          String(row.level || '') === String(record.level || '') &&
          String(row.analyze || '') === String(record.analyze || '') &&
          String(row.create || '') === String(record.create || '');
      });
      if (duplicate) return false;
      rows.unshift(record);
      localStorage.setItem(CHALLENGE_REFLECTION_KEY, JSON.stringify(rows.slice(0, 80)));
      return true;
    } catch {
      return false;
    }
  }

  function saveRevealChallengeResponses(options = {}) {
    if (!revealChallengeState) return false;
    const requireProgress = options.requireText !== false;
    const silent = !!options.silent;
    syncChallengeResponseSummary(revealChallengeState);
    const analyzeText = String(revealChallengeState.responses.analyze || '').trim();
    const createText = String(revealChallengeState.responses.create || '').trim();
    const doneCount = getChallengeDoneCount(revealChallengeState);
    if (requireProgress && doneCount <= 0) {
      setChallengeFeedback('Complete at least one step before saving.', 'warn');
      return false;
    }
    const score = computeChallengeScore(revealChallengeState);
    const scoreBand = resolveMissionScoreBand(score.total);
    const saveTs = Date.now();
    const completedAt = Math.max(0, Number(revealChallengeState.completedAt) || 0);
    const completed = completedAt > 0 || doneCount >= 3;
    const completionTs = completedAt || saveTs;
    const onTime = completed;
    const secondsLeft = 0;
    const record = {
      attemptId: String(revealChallengeState.attemptId || ''),
      source: String(revealChallengeState.source || 'reveal').trim() || 'reveal',
      deepDiveVersion: '1.1.0',
      deepDiveSchemaVersion: 1,
      student: getActiveStudentLabel(),
      ts: completionTs,
      word: revealChallengeState.word,
      topic: revealChallengeState.topic,
      grade: revealChallengeState.grade,
      level: revealChallengeState.challenge.level,
      score: score.total,
      scoreBand,
      clarity: score.clarity,
      evidence: score.evidence,
      vocabulary: score.vocabulary,
      completed,
      onTime,
      secondsLeft,
      analyze: analyzeText,
      create: createText,
      tasks: { ...revealChallengeState.tasks },
      taskOutcomes: CHALLENGE_TASK_FLOW.map((task) => ({
        task,
        complete: !!revealChallengeState.tasks?.[task],
        attempts: Math.max(0, Number(revealChallengeState.deepDive?.attempts?.[task]) || 0)
      }))
    };
    persistRevealChallengeRecord(record);
    saveChallengeDraft(revealChallengeState);
    renderSessionSummary();
    if (!silent) setChallengeFeedback('Deep Dive saved on this device.', 'good');
    return true;
  }

  function finishRevealChallenge() {
    if (!revealChallengeState) return;
    if (revealChallengeState.completedAt) return;
    const doneCount = getChallengeDoneCount(revealChallengeState);
    if (doneCount < 3) {
      setChallengeFeedback('Finish all 3 steps first.', 'warn');
      return;
    }
    const finishBtn = _el('challenge-finish-btn');
    if (finishBtn) finishBtn.disabled = true;
    revealChallengeState.completedAt = Date.now();
    saveRevealChallengeResponses({ requireText: false, silent: true });
    const score = computeChallengeScore(revealChallengeState);
    const pointsEarned = Math.max(8, Math.round(score.total / 10) + (doneCount * 3));
    const progress = loadChallengeProgress();
    progress.points += pointsEarned;
    const today = localDayKey();
    if (progress.lastWinDay !== today) {
      progress.streak = isConsecutiveDay(progress.lastWinDay, today) ? progress.streak + 1 : 1;
      progress.lastWinDay = today;
    }
    saveChallengeProgress(progress);
    const rank = resolveChallengeRank(progress.points);
    const line = pickRandom(CHALLENGE_COMPLETE_LINES) || 'Deep Dive complete.';
    setChallengeFeedback(`${line} +${pointsEarned} points · Rank ${rank.label}.`, 'good');
    emitTelemetry('wq_deep_dive_complete', {
      source: revealChallengeState?.source || 'reveal',
      word_id: normalizeReviewWord(revealChallengeState?.word),
      level: revealChallengeState?.challenge?.level || '',
      done_count: doneCount,
      completion_rate: Number((doneCount / 3).toFixed(2)),
      score: Number(score.total) || 0,
      score_total: Number(score.total) || 0,
      points_earned: pointsEarned,
      rank: rank?.label || ''
    });
    emitTelemetry('wq_funnel_deep_dive_completed', {
      source: revealChallengeState?.source || 'reveal',
      word_id: normalizeReviewWord(revealChallengeState?.word),
      level: revealChallengeState?.challenge?.level || '',
      completion_rate: Number((doneCount / 3).toFixed(2))
    });
    clearChallengeDraft(revealChallengeState);
    renderSessionSummary();
    setTimeout(() => {
      closeRevealChallengeModal({ silent: true });
    }, 900);
  }

  deepDiveCoreFeature?.publishBridge?.();
  deepDiveCoreFeature?.bindEvents?.();

  const PHONICS_CLUE_DECKS_URL = './data/taboo-phonics-starter-decks.json';
  const PHONICS_CLUE_DECK_OPTIONS = Object.freeze([
    Object.freeze({ id: 'taboo_phonics_k_1_starter_30', label: 'K-1 Starter (30 cards)' }),
    Object.freeze({ id: 'taboo_phonics_g2_3_starter_30', label: 'G2-3 Starter (30 cards)' }),
    Object.freeze({ id: 'taboo_phonics_g4_5_starter_30', label: 'G4-5 Starter (30 cards)' })
  ]);
  const PHONICS_CLUE_CONTEXT_LABELS = Object.freeze({
    solo: 'Solo',
    intervention: '1:1',
    small_group: 'Group'
  });
  const PHONICS_CLUE_CONTEXT_NOTES = Object.freeze({
    solo: 'Solo mode: read clues out loud to yourself, guess, then bank one bonus action before moving on.',
    intervention: '1:1 mode: alternate clue-giver each card. Keep one quick bonus check for intervention progress.',
    small_group: 'Small-group mode: rotate clue giver, guesser, speller, and checker every card.'
  });
  const PHONICS_CLUE_BONUS_PROMPTS = Object.freeze({
    spell: 'Bonus prompt: spell the target word.',
    segment: 'Bonus prompt: segment the word into sounds or chunks.',
    sentence: 'Bonus prompt: use the word in a full sentence.',
    meaning: 'Bonus prompt: explain the meaning in your own words.'
  });
  const PHONICS_CLUE_TIMER_OPTIONS = new Set(['off', '45', '60', '75', '90']);

  let phonicsClueDeckMap = Object.create(null);
  let phonicsClueDeckPromise = null;
  const phonicsClueState = {
    deckId: 'taboo_phonics_g2_3_starter_30',
    context: 'solo',
    timer: '60',
    bonus: 'spell',
    cards: [],
    index: -1,
    current: null,
    started: false,
    targetHidden: false,
    guessAwarded: false,
    bonusAwarded: false,
    guessPoints: 0,
    bonusPoints: 0,
    turnTimerId: 0,
    turnEndsAt: 0,
    turnSecondsLeft: 0
  };

  function normalizePhonicsClueDeckId(value, fallback = 'taboo_phonics_g2_3_starter_30') {
    const normalized = String(value || '').trim();
    const allowed = PHONICS_CLUE_DECK_OPTIONS.find((deck) => deck.id === normalized);
    if (allowed) return allowed.id;
    return fallback;
  }

  function normalizePhonicsClueContext(value) {
    const normalized = String(value || '').trim().toLowerCase();
    return Object.prototype.hasOwnProperty.call(PHONICS_CLUE_CONTEXT_NOTES, normalized)
      ? normalized
      : 'solo';
  }

  function normalizePhonicsClueBonus(value) {
    const normalized = String(value || '').trim().toLowerCase();
    return Object.prototype.hasOwnProperty.call(PHONICS_CLUE_BONUS_PROMPTS, normalized)
      ? normalized
      : 'spell';
  }

  function normalizePhonicsClueTimer(value) {
    const normalized = String(value || '').trim().toLowerCase();
    if (PHONICS_CLUE_TIMER_OPTIONS.has(normalized)) return normalized;
    const seconds = Number.parseInt(normalized, 10);
    if (!Number.isFinite(seconds) || seconds <= 0) return 'off';
    if (seconds <= 45) return '45';
    if (seconds <= 60) return '60';
    if (seconds <= 75) return '75';
    return '90';
  }

  function normalizePhonicsClueCard(raw, index) {
    if (!raw || typeof raw !== 'object') return null;
    const targetWord = String(raw.target_word || '').trim().toLowerCase();
    if (!targetWord) return null;
    let tabooWords = Array.isArray(raw.taboo_words)
      ? raw.taboo_words
      : [raw.taboo_1, raw.taboo_2, raw.taboo_3];
    tabooWords = tabooWords
      .map((word) => String(word || '').trim())
      .filter(Boolean)
      .slice(0, 3);
    while (tabooWords.length < 3) tabooWords.push('—');
    return Object.freeze({
      id: Math.max(1, Number(raw.id) || index + 1),
      deckId: normalizePhonicsClueDeckId(String(raw.deck_id || '').trim(), ''),
      gradeBand: String(raw.grade_band || '').trim(),
      targetWord,
      markedWord: String(raw.marked_word || targetWord).trim() || targetWord,
      tabooWords: Object.freeze([...tabooWords]),
      definition: String(raw.definition || '').trim(),
      exampleSentence: String(raw.example_sentence || '').trim()
    });
  }

  function shufflePhonicsClueCards(cards) {
    const next = Array.isArray(cards) ? [...cards] : [];
    for (let i = next.length - 1; i > 0; i -= 1) {
      const j = Math.floor(Math.random() * (i + 1));
      [next[i], next[j]] = [next[j], next[i]];
    }
    return next;
  }

  function clearPhonicsClueTurnTimer() {
    if (phonicsClueState.turnTimerId) {
      clearInterval(phonicsClueState.turnTimerId);
      phonicsClueState.turnTimerId = 0;
    }
    phonicsClueState.turnEndsAt = 0;
    phonicsClueState.turnSecondsLeft = 0;
  }

  function resolvePhonicsClueTurnSeconds() {
    if (phonicsClueState.timer === 'off') return 0;
    return Math.max(0, Number.parseInt(phonicsClueState.timer, 10) || 0);
  }

  function isPhonicsClueTurnExpired() {
    const timerSeconds = resolvePhonicsClueTurnSeconds();
    if (timerSeconds <= 0) return false;
    if (!phonicsClueState.started || !phonicsClueState.current) return false;
    return phonicsClueState.turnSecondsLeft <= 0;
  }

  function syncPhonicsClueTimerChip() {
    const chip = _el('phonics-clue-timer-chip');
    if (!chip) return;
    if (!phonicsClueState.started || !phonicsClueState.current) {
      chip.textContent = 'Timer: --';
      return;
    }
    const timerSeconds = resolvePhonicsClueTurnSeconds();
    if (timerSeconds <= 0) {
      chip.textContent = 'Timer: Off';
      return;
    }
    const left = Math.max(0, Number(phonicsClueState.turnSecondsLeft) || 0);
    chip.textContent = left > 0 ? `Timer: ${left}s` : 'Timer: Time up';
  }

  function syncPhonicsClueActionButtons() {
    const startBtn = _el('phonics-clue-start-btn');
    const guessBtn = _el('phonics-clue-guess-btn');
    const bonusBtn = _el('phonics-clue-bonus-btn');
    const nextBtn = _el('phonics-clue-next-btn');
    const skipBtn = _el('phonics-clue-skip-btn');
    const hideBtn = _el('phonics-clue-hide-btn');
    if (startBtn) {
      startBtn.textContent = phonicsClueState.started ? 'Restart Deck' : 'Start Deck';
    }
    const activeCard = Boolean(phonicsClueState.started && phonicsClueState.current);
    const expired = isPhonicsClueTurnExpired();
    if (guessBtn) guessBtn.disabled = !activeCard || phonicsClueState.guessAwarded || expired;
    if (bonusBtn) bonusBtn.disabled = !activeCard || phonicsClueState.bonusAwarded || expired;
    if (nextBtn) nextBtn.disabled = !activeCard;
    if (skipBtn) skipBtn.disabled = !activeCard;
    if (hideBtn) {
      hideBtn.disabled = !activeCard;
      hideBtn.textContent = phonicsClueState.targetHidden ? 'Show Target' : 'Hide Target';
      hideBtn.setAttribute('aria-pressed', phonicsClueState.targetHidden ? 'true' : 'false');
    }
  }

  function applyPhonicsClueTargetVisibility() {
    const targetEl = _el('phonics-clue-target-word');
    if (!targetEl) return;
    targetEl.classList.toggle('is-hidden', !!phonicsClueState.targetHidden);
  }

  function renderPhonicsCluePanel() {
    const cardChip = _el('phonics-clue-card-chip');
    const scoreChip = _el('phonics-clue-score-chip');
    const bonusChip = _el('phonics-clue-bonus-chip');
    const contextChip = _el('phonics-clue-context-chip');
    const targetWordEl = _el('phonics-clue-target-word');
    const markedWordEl = _el('phonics-clue-marked-word');
    const tabooListEl = _el('phonics-clue-taboo-list');
    const defEl = _el('phonics-clue-definition');
    const exampleEl = _el('phonics-clue-example');
    const bonusPromptEl = _el('phonics-clue-bonus-prompt');
    const contextNoteEl = _el('phonics-clue-context-note');

    if (cardChip) {
      if (phonicsClueState.started && phonicsClueState.current) {
        cardChip.textContent = `Card: ${phonicsClueState.index + 1}/${phonicsClueState.cards.length}`;
      } else if (phonicsClueState.started && !phonicsClueState.current) {
        cardChip.textContent = `Card: ${phonicsClueState.cards.length}/${phonicsClueState.cards.length} complete`;
      } else {
        cardChip.textContent = 'Card: --';
      }
    }
    if (scoreChip) scoreChip.textContent = `Guess points: ${phonicsClueState.guessPoints}`;
    if (bonusChip) bonusChip.textContent = `Bonus points: ${phonicsClueState.bonusPoints}`;
    if (contextChip) {
      contextChip.textContent = PHONICS_CLUE_CONTEXT_LABELS[phonicsClueState.context] || 'Solo';
    }
    if (bonusPromptEl) {
      bonusPromptEl.textContent = PHONICS_CLUE_BONUS_PROMPTS[phonicsClueState.bonus] || PHONICS_CLUE_BONUS_PROMPTS.spell;
    }
    if (contextNoteEl) {
      contextNoteEl.textContent = PHONICS_CLUE_CONTEXT_NOTES[phonicsClueState.context] || PHONICS_CLUE_CONTEXT_NOTES.solo;
    }

    const current = phonicsClueState.current;
    if (!current) {
      if (targetWordEl) targetWordEl.textContent = 'Start a round to reveal the first card.';
      if (markedWordEl) markedWordEl.textContent = 'Marked: —';
      if (tabooListEl) tabooListEl.innerHTML = '<li>—</li><li>—</li><li>—</li>';
      if (defEl) defEl.textContent = 'Definition: —';
      if (exampleEl) exampleEl.textContent = 'Example: —';
      phonicsClueState.targetHidden = false;
      applyPhonicsClueTargetVisibility();
      syncPhonicsClueTimerChip();
      syncPhonicsClueActionButtons();
      return;
    }

    if (targetWordEl) targetWordEl.textContent = current.targetWord.toUpperCase();
    if (markedWordEl) markedWordEl.textContent = `Marked: ${current.markedWord}`;
    if (tabooListEl) {
      tabooListEl.innerHTML = '';
      current.tabooWords.forEach((tabooWord) => {
        const li = document.createElement('li');
        li.textContent = tabooWord;
        tabooListEl.appendChild(li);
      });
    }
    if (defEl) defEl.textContent = `Definition: ${current.definition || '—'}`;
    if (exampleEl) exampleEl.textContent = `Example: ${current.exampleSentence || '—'}`;
    applyPhonicsClueTargetVisibility();
    syncPhonicsClueTimerChip();
    syncPhonicsClueActionButtons();
  }

  function syncPhonicsClueDeckSelect() {
    const select = _el('phonics-clue-deck-select');
    if (!select) return;
    const preferred = normalizePhonicsClueDeckId(select.value || phonicsClueState.deckId);
    select.innerHTML = '';
    PHONICS_CLUE_DECK_OPTIONS.forEach((deck) => {
      const count = Array.isArray(phonicsClueDeckMap[deck.id]) ? phonicsClueDeckMap[deck.id].length : 0;
      const option = document.createElement('option');
      option.value = deck.id;
      option.textContent = count > 0 ? deck.label : `${deck.label} (unavailable)`;
      option.disabled = count <= 0;
      select.appendChild(option);
    });
    let nextDeck = preferred;
    if (!Array.isArray(phonicsClueDeckMap[nextDeck]) || phonicsClueDeckMap[nextDeck].length <= 0) {
      const fallback = PHONICS_CLUE_DECK_OPTIONS.find(
        (deck) => Array.isArray(phonicsClueDeckMap[deck.id]) && phonicsClueDeckMap[deck.id].length > 0
      );
      nextDeck = fallback?.id || preferred;
    }
    select.value = nextDeck;
    phonicsClueState.deckId = nextDeck;
  }

  function updatePhonicsClueControlsFromUI() {
    phonicsClueState.deckId = normalizePhonicsClueDeckId(
      _el('phonics-clue-deck-select')?.value || phonicsClueState.deckId
    );
    phonicsClueState.context = normalizePhonicsClueContext(
      _el('phonics-clue-context-select')?.value || phonicsClueState.context
    );
    phonicsClueState.timer = normalizePhonicsClueTimer(
      _el('phonics-clue-timer-select')?.value || phonicsClueState.timer
    );
    phonicsClueState.bonus = normalizePhonicsClueBonus(
      _el('phonics-clue-bonus-select')?.value || phonicsClueState.bonus
    );
    const deckSelect = _el('phonics-clue-deck-select');
    if (deckSelect) deckSelect.value = phonicsClueState.deckId;
    const contextSelect = _el('phonics-clue-context-select');
    if (contextSelect) contextSelect.value = phonicsClueState.context;
    const timerSelect = _el('phonics-clue-timer-select');
    if (timerSelect) timerSelect.value = phonicsClueState.timer;
    const bonusSelect = _el('phonics-clue-bonus-select');
    if (bonusSelect) bonusSelect.value = phonicsClueState.bonus;
  }

  async function ensurePhonicsClueDeckData() {
    if (Object.keys(phonicsClueDeckMap).length > 0) return phonicsClueDeckMap;
    if (phonicsClueDeckPromise) return phonicsClueDeckPromise;
    phonicsClueDeckPromise = (async () => {
      try {
        const response = await fetch(PHONICS_CLUE_DECKS_URL, { cache: 'no-store' });
        if (!response.ok) throw new Error(`deck fetch failed (${response.status})`);
        const rows = await response.json();
        const grouped = Object.create(null);
        if (Array.isArray(rows)) {
          rows.forEach((rawCard, index) => {
            const card = normalizePhonicsClueCard(rawCard, index);
            if (!card || !card.deckId) return;
            if (!grouped[card.deckId]) grouped[card.deckId] = [];
            grouped[card.deckId].push(card);
          });
        }
        PHONICS_CLUE_DECK_OPTIONS.forEach((deck) => {
          const cards = Array.isArray(grouped[deck.id]) ? grouped[deck.id] : [];
          if (cards.length) {
            phonicsClueDeckMap[deck.id] = cards;
          }
        });
      } catch (error) {
        console.warn('[WordQuest] Phonics Clue Sprint deck load failed:', error?.message || error);
      } finally {
        phonicsClueDeckPromise = null;
      }
      return phonicsClueDeckMap;
    })();
    return phonicsClueDeckPromise;
  }

  function startPhonicsClueTurnTimer() {
    clearPhonicsClueTurnTimer();
    const seconds = resolvePhonicsClueTurnSeconds();
    if (!phonicsClueState.started || !phonicsClueState.current || seconds <= 0) {
      syncPhonicsClueTimerChip();
      syncPhonicsClueActionButtons();
      return;
    }
    phonicsClueState.turnEndsAt = Date.now() + (seconds * 1000);
    const tick = () => {
      const remaining = Math.max(0, Math.ceil((phonicsClueState.turnEndsAt - Date.now()) / 1000));
      phonicsClueState.turnSecondsLeft = remaining;
      if (remaining <= 0) {
        clearPhonicsClueTurnTimer();
        WQUI.showToast('Time is up. Move to the next card.');
      }
      syncPhonicsClueTimerChip();
      syncPhonicsClueActionButtons();
    };
    tick();
    phonicsClueState.turnTimerId = setInterval(tick, 250);
  }

  function setPhonicsClueCard(index) {
    phonicsClueState.index = index;
    phonicsClueState.current = phonicsClueState.cards[index] || null;
    phonicsClueState.targetHidden = false;
    phonicsClueState.guessAwarded = false;
    phonicsClueState.bonusAwarded = false;
  }

  async function startPhonicsClueDeck() {
    updatePhonicsClueControlsFromUI();
    await ensurePhonicsClueDeckData();
    syncPhonicsClueDeckSelect();
    const cards = Array.isArray(phonicsClueDeckMap[phonicsClueState.deckId])
      ? phonicsClueDeckMap[phonicsClueState.deckId]
      : [];
    if (!cards.length) {
      WQUI.showToast('Phonics Clue Sprint deck data is unavailable on this build.');
      renderPhonicsCluePanel();
      return false;
    }
    phonicsClueState.cards = shufflePhonicsClueCards(cards);
    phonicsClueState.started = true;
    phonicsClueState.guessPoints = 0;
    phonicsClueState.bonusPoints = 0;
    setPhonicsClueCard(0);
    startPhonicsClueTurnTimer();
    renderPhonicsCluePanel();
    return true;
  }

  function completePhonicsClueDeck() {
    clearPhonicsClueTurnTimer();
    phonicsClueState.started = false;
    phonicsClueState.current = null;
    phonicsClueState.index = phonicsClueState.cards.length - 1;
    renderPhonicsCluePanel();
    WQUI.showToast(
      `Round complete: ${phonicsClueState.guessPoints} guess points + ${phonicsClueState.bonusPoints} bonus points.`,
      3200
    );
  }

  function advancePhonicsClueCard() {
    if (!phonicsClueState.started || !phonicsClueState.current) return;
    const nextIndex = phonicsClueState.index + 1;
    if (nextIndex >= phonicsClueState.cards.length) {
      completePhonicsClueDeck();
      return;
    }
    setPhonicsClueCard(nextIndex);
    startPhonicsClueTurnTimer();
    renderPhonicsCluePanel();
  }

  function skipPhonicsClueCard() {
    if (!phonicsClueState.started || !phonicsClueState.current) return;
    WQUI.showToast('Card skipped.');
    advancePhonicsClueCard();
  }

  function awardPhonicsClueGuessPoint() {
    if (!phonicsClueState.started || !phonicsClueState.current) return;
    if (isPhonicsClueTurnExpired()) {
      WQUI.showToast('Timer ended. Move to the next card.');
      return;
    }
    if (phonicsClueState.guessAwarded) {
      WQUI.showToast('Guess point already banked for this card.');
      return;
    }
    phonicsClueState.guessPoints += 1;
    phonicsClueState.guessAwarded = true;
    renderPhonicsCluePanel();
  }

  function awardPhonicsClueBonusPoint() {
    if (!phonicsClueState.started || !phonicsClueState.current) return;
    if (isPhonicsClueTurnExpired()) {
      WQUI.showToast('Timer ended. Move to the next card.');
      return;
    }
    if (phonicsClueState.bonusAwarded) {
      WQUI.showToast('Bonus point already banked for this card.');
      return;
    }
    phonicsClueState.bonusPoints += 1;
    phonicsClueState.bonusAwarded = true;
    renderPhonicsCluePanel();
  }

  function togglePhonicsClueTargetVisibility() {
    if (!phonicsClueState.started || !phonicsClueState.current) return;
    phonicsClueState.targetHidden = !phonicsClueState.targetHidden;
    applyPhonicsClueTargetVisibility();
    syncPhonicsClueActionButtons();
  }

  async function openPhonicsClueModal() {
    _el('phonics-clue-modal')?.classList.remove('hidden');
    await ensurePhonicsClueDeckData();
    syncPhonicsClueDeckSelect();
    updatePhonicsClueControlsFromUI();
    if (phonicsClueState.started && phonicsClueState.current) {
      startPhonicsClueTurnTimer();
    }
    renderPhonicsCluePanel();
  }

  function closePhonicsClueModal() {
    _el('phonics-clue-modal')?.classList.add('hidden');
    clearPhonicsClueTurnTimer();
  }

  function showRevealWordToast(result) {
    if (!result) return;
    const solvedWord = String(result.word || '').trim().toUpperCase();
    if (!solvedWord) return;
    const feedback = getRevealFeedbackCopy(result);
    const lead = String(feedback?.lead || '').trim();
    const coach = String(feedback?.coach || '').trim();
    const shortDef = trimToastDefinition(result?.entry?.definition);
    const base = shortDef
      ? `${lead} ${solvedWord} - ${shortDef}`
      : `${lead} ${solvedWord}`;
    const message = coach ? `${base} ${coach}` : base;
    WQUI.showToast(message, 3600);
  }

  function shouldNarrateReveal() {
    const mode = normalizeVoiceMode(_el('s-voice')?.value || prefs.voice || DEFAULT_PREFS.voice);
    return mode !== 'off';
  }

  async function playMeaningWithFun(nextEntry) {
    if (!nextEntry) return;
    const meaning = getRevealMeaningPayload(nextEntry);
    if (!(meaning.definition || meaning.funAddOn)) return;

    if (WQAudio && typeof WQAudio.playMeaningBundle === 'function') {
      await WQAudio.playMeaningBundle(nextEntry, {
        includeFun: shouldIncludeFunInMeaning(),
        allowFallbackInRecorded: true,
        fallbackText: meaning.readAll
      });
      return;
    }

    await WQAudio.playDef(nextEntry);
    if (!meaning.funAddOn) return;
    await WQAudio.playFun(nextEntry);
  }

  function promptLearnerAfterReveal() {
    if (getVoicePracticeMode() === 'off') return;
    if (voiceTakeComplete || voiceIsRecording) return;
    const practiceDetails = _el('modal-practice-details');
    if (!practiceDetails || practiceDetails.classList.contains('hidden')) return;
    const required = getVoicePracticeMode() === 'required';
    if (required) practiceDetails.open = true;
    setVoicePracticeFeedback('Your turn: tap Record and compare with model audio.', required ? 'warn' : 'default');
  }

  async function runRevealNarration(result) {
    if (!result?.entry) return;
    cancelRevealNarration();
    const token = revealNarrationToken;
    const pacing = getRevealPacingPreset();
    syncRevealMeaningHighlight(result.entry);
    syncRevealChallengeLaunch(result);
    if (!shouldNarrateReveal()) {
      await waitMs(Math.min(220, pacing.postMeaningDelay));
      if (token !== revealNarrationToken) return;
      promptLearnerAfterReveal();
      return;
    }
    await waitMs(pacing.introDelay);
    if (token !== revealNarrationToken) return;
    try {
      runKaraokeGuide(result.entry);
      await WQAudio.playWord(result.entry);
      if (token !== revealNarrationToken) return;
      await waitMs(pacing.betweenDelay);
      if (token !== revealNarrationToken) return;
      await playMeaningWithFun(result.entry);
      if (token !== revealNarrationToken) return;
      await waitMs(pacing.postMeaningDelay);
      if (token !== revealNarrationToken) return;
      promptLearnerAfterReveal();
    } catch {
      if (token !== revealNarrationToken) return;
      promptLearnerAfterReveal();
    }
  }

  _el('g-hear-word')?.addEventListener('click', () => {
    cancelRevealNarration();
    void WQAudio.playWord(entry());
  });
  _el('g-hear-def')?.addEventListener('click', () => {
    cancelRevealNarration();
    void playMeaningWithFun(entry());
  });

  // Modal audio buttons
  _el('hear-word-btn')?.addEventListener('click', () => {
    cancelRevealNarration();
    void WQAudio.playWord(entry());
  });
  _el('hear-def-btn')?.addEventListener('click', () => {
    cancelRevealNarration();
    void playMeaningWithFun(entry());
  });
  _el('hear-sentence-btn')?.addEventListener('click', () => {
    cancelRevealNarration();
    void WQAudio.playSentence(entry());
  });

  // ─── 10. Duplicate-letter dismissible toast ──────────
  const DUPE_PREF_KEY = 'wq_v2_dupe_dismissed';
  let _dupeToastEl = null;

  function removeDupeToast() {
    if (_dupeToastEl) { _dupeToastEl.remove(); _dupeToastEl = null; }
  }

  function checkDuplicates(result) {
    // Check if user has disabled this
    if (_el('s-dupe')?.value === 'off') return;
    if (isAssessmentRoundLocked()) return;
    if (localStorage.getItem(DUPE_PREF_KEY) === 'true') return;

    const word = result.word;
    const freq = {};
    word.split('').forEach(c => { freq[c] = (freq[c] || 0) + 1; });

    for (const [letter, count] of Object.entries(freq)) {
      if (count < 2) continue;
      // Count correctly placed so far
      let placed = 0;
      result.guesses.forEach(g =>
        g.split('').forEach((ch, i) => { if (ch === letter && word[i] === letter) placed++; })
      );
      if (placed >= 1 && placed < count) {
        WQUI.pulseDupeKey(letter);
        showDupeToast(letter.toUpperCase());
        break;
      }
    }
  }

  function showDupeToast(letter) {
    removeDupeToast();
    const div = document.createElement('div');
    div.id = 'dupe-toast';
    div.innerHTML = `
      <span>💡 Heads up: there's another <strong>${letter}</strong> in this word.</span>
      <div class="dupe-dismiss-row">
        <button id="dupe-ok">Got it</button>
        <button id="dupe-never">Don't show again</button>
      </div>`;
    document.body.appendChild(div);
    _dupeToastEl = div;

    _el('dupe-ok')?.addEventListener('click', removeDupeToast);
    _el('dupe-never')?.addEventListener('click', () => {
      localStorage.setItem(DUPE_PREF_KEY, 'true');
      removeDupeToast();
    });

    // Auto-remove after 8 seconds if not dismissed
    setTimeout(removeDupeToast, 8000);
  }

  
  function launchStars(){
    const layer = _el('celebrate-layer');
    if (!layer) return;
    layer.innerHTML = '';
    const starChars = ['⭐','✨','🌟'];
    const count = 12;
    for (let i=0;i<count;i++){
      const s = document.createElement('div');
      s.className = 'celebrate-star wq-anim';
      s.textContent = starChars[i % starChars.length];
      s.style.left = (10 + Math.random()*80) + 'vw';
      s.style.top  = (15 + Math.random()*55) + 'vh';
      s.style.animationDelay = (Math.random()*180) + 'ms';
      layer.appendChild(s);
    }
    setTimeout(()=>{ layer.innerHTML=''; }, 1200);
  }
// ─── 11. Confetti ────────────────────────────────────
  function launchConfetti() {
    const canvas = _el('confetti-canvas');
    if (!canvas) return;
    canvas.width  = window.innerWidth;
    canvas.height = window.innerHeight;
    const ctx = canvas.getContext('2d');
    const COLORS = ['#22c55e','#f59e0b','#3b82f6','#ec4899','#f97316','#a855f7','#06b6d4','#fbbf24'];
    const pieces = Array.from({ length: 140 }, () => ({
      x:     Math.random() * canvas.width,
      y:     -20 - Math.random() * 140,
      w:     5 + Math.random() * 8,
      h:     3 + Math.random() * 5,
      color: COLORS[Math.floor(Math.random() * COLORS.length)],
      vx:    (Math.random() - 0.5) * 4.5,
      vy:    2.5 + Math.random() * 4,
      angle: Math.random() * Math.PI * 2,
      spin:  (Math.random() - 0.5) * 0.2,
    }));
    let frame;
    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      let any = false;
      pieces.forEach(p => {
        p.x += p.vx; p.y += p.vy += 0.08; p.angle += p.spin;
        if (p.y < canvas.height + 30) any = true;
        ctx.save();
        ctx.translate(p.x, p.y); ctx.rotate(p.angle);
        ctx.fillStyle = p.color;
        ctx.globalAlpha = Math.max(0, 1 - p.y / canvas.height);
        ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
        ctx.restore();
      });
      if (any) frame = requestAnimationFrame(draw);
      else ctx.clearRect(0, 0, canvas.width, canvas.height);
    };
    cancelAnimationFrame(frame);
    frame = requestAnimationFrame(draw);
    setTimeout(() => { cancelAnimationFrame(frame); ctx.clearRect(0, 0, canvas.width, canvas.height); }, 5500);
  }

  
  // ─── Music (catalog tracks + synth fallback) ───────
  const WQMusic = (() => {
    const MUSIC_CATALOG_URL = './data/music-catalog.json';
    let ctx = null;
    let synthGain = null;
    let synthInterval = null;
    let mode = 'chill';
    let vol = 0.35;
    let resumeBound = false;
    let audioEl = null;
    let catalog = null;
    let catalogPromise = null;
    let activeTrackId = '';
    let playbackToken = 0;
    let customTracks = [];

    const PLAYBACK_PRESETS = Object.freeze({
      deepfocus: Object.freeze({ seq: [196, 0, 220, 0, 247, 0, 220, 0], tempo: 500, dur: 0.15, wave: 'sine', level: 0.1 }),
      classicalbeats: Object.freeze({ seq: [262, 330, 392, 330, 440, 392, 330, 262], tempo: 280, dur: 0.11, wave: 'triangle', level: 0.12 }),
      nerdcore: Object.freeze({ seq: [523, 659, 784, 988, 784, 659, 523, 659], tempo: 220, dur: 0.1, wave: 'square', level: 0.12 }),
      focus:   Object.freeze({ seq: [220, 0, 247, 0, 262, 0, 247, 0], tempo: 430, dur: 0.12, wave: 'triangle', level: 0.11 }),
      chill:   Object.freeze({ seq: [196, 0, 220, 0, 247, 0, 220, 0], tempo: 520, dur: 0.16, wave: 'sine', level: 0.12 }),
      lofi:    Object.freeze({ seq: [220, 0, 247, 0, 196, 0, 220, 0], tempo: 420, dur: 0.13, wave: 'triangle', level: 0.14 }),
      upbeat:  Object.freeze({ seq: [392, 523, 587, 659, 587, 523, 440, 523], tempo: 240, dur: 0.1, wave: 'square', level: 0.12 }),
      coffee:  Object.freeze({ seq: [196, 247, 294, 247, 220, 262, 330, 262], tempo: 470, dur: 0.14, wave: 'triangle', level: 0.12 }),
      arcade:  Object.freeze({ seq: [523, 659, 784, 659, 523, 392, 523, 659], tempo: 260, dur: 0.1, wave: 'square', level: 0.12 }),
      fantasy: Object.freeze({ seq: [262, 330, 392, 330, 440, 392, 330, 262], tempo: 320, dur: 0.12, wave: 'triangle', level: 0.13 }),
      scifi:   Object.freeze({ seq: [440, 0, 880, 0, 660, 0, 990, 0], tempo: 280, dur: 0.1, wave: 'sawtooth', level: 0.11 }),
      sports:  Object.freeze({ seq: [392, 392, 523, 392, 659, 523, 784, 659], tempo: 240, dur: 0.1, wave: 'square', level: 0.13 }),
      stealth: Object.freeze({ seq: [196, 0, 196, 233, 0, 174, 0, 220], tempo: 360, dur: 0.11, wave: 'triangle', level: 0.11 }),
      team:    Object.freeze({ seq: [392, 523, 659, 784, 659, 523, 784, 988], tempo: 220, dur: 0.1, wave: 'square', level: 0.13 })
    });

    const ALT_SEQS = Object.freeze({
      deepfocus: [174, 0, 196, 0, 220, 0, 196, 0],
      classicalbeats: [294, 370, 440, 370, 494, 440, 370, 294],
      nerdcore: [659, 784, 988, 1175, 988, 784, 659, 784],
      focus:   [196, 0, 220, 0, 247, 0, 220, 0],
      chill:   [220, 0, 247, 0, 262, 0, 247, 0],
      lofi:    [196, 0, 220, 0, 247, 0, 196, 0],
      upbeat:  [440, 523, 659, 587, 523, 440, 392, 440],
      coffee:  [220, 262, 330, 262, 247, 294, 349, 294],
      arcade:  [659, 784, 988, 784, 659, 523, 659, 784],
      fantasy: [294, 370, 440, 370, 494, 440, 370, 294],
      scifi:   [660, 0, 990, 0, 770, 0, 1120, 0],
      sports:  [440, 440, 587, 440, 698, 587, 880, 698],
      stealth: [220, 0, 174, 196, 0, 233, 0, 196],
      team:    [523, 659, 784, 988, 784, 659, 523, 784]
    });

    const clamp01 = (value, fallback = 0) => {
      const next = Number.isFinite(value) ? value : fallback;
      return Math.max(0, Math.min(1, next));
    };

    const normalizePlaybackMode = (value) => {
      const normalized = String(value || '').trim().toLowerCase();
      if (normalized === 'off') return 'off';
      return PLAYBACK_PRESETS[normalized] ? normalized : 'chill';
    };

    const ensureCtx = () => {
      if (ctx) return;
      ctx = new (window.AudioContext || window.webkitAudioContext)();
      synthGain = ctx.createGain();
      synthGain.gain.value = clamp01(vol, parseFloat(DEFAULT_PREFS.musicVol));
      synthGain.connect(ctx.destination);
      bindResumeEvents();
    };

    const resumeAllAudio = () => {
      if (ctx && ctx.state === 'suspended') {
        ctx.resume().catch(() => {});
      }
      if (audioEl && mode !== 'off' && audioEl.paused) {
        audioEl.play().catch(() => {});
      }
    };

    const bindResumeEvents = () => {
      if (resumeBound) return;
      resumeBound = true;
      ['pointerdown', 'keydown', 'touchstart'].forEach((eventName) => {
        document.addEventListener(eventName, resumeAllAudio, { passive: true });
      });
    };

    const beep = (freq, dur = 0.12, type = 'sine', peak = 0.12) => {
      if (!ctx || !synthGain) return;
      const oscillator = ctx.createOscillator();
      const envelope = ctx.createGain();
      oscillator.type = type;
      oscillator.frequency.value = freq;
      envelope.gain.value = 0.0001;
      oscillator.connect(envelope);
      envelope.connect(synthGain);
      const now = ctx.currentTime;
      envelope.gain.exponentialRampToValueAtTime(peak, now + 0.01);
      envelope.gain.exponentialRampToValueAtTime(0.0001, now + dur);
      oscillator.start(now);
      oscillator.stop(now + dur + 0.02);
    };

    const stopSynth = () => {
      if (synthInterval) clearInterval(synthInterval);
      synthInterval = null;
    };

    const startSynth = (playMode) => {
      stopSynth();
      if (playMode === 'off') return;
      ensureCtx();
      resumeAllAudio();
      const preset = PLAYBACK_PRESETS[playMode] || PLAYBACK_PRESETS.chill;
      let seq = Math.random() < 0.5 ? preset.seq : (ALT_SEQS[playMode] || preset.seq);
      let index = 0;
      synthInterval = setInterval(() => {
        if (index > 0 && index % seq.length === 0) {
          seq = Math.random() < 0.5 ? preset.seq : (ALT_SEQS[playMode] || preset.seq);
        }
        const freq = seq[index % seq.length];
        if (freq) beep(freq, preset.dur, preset.wave, preset.level);
        index += 1;
      }, preset.tempo);
    };

    const ensureAudioEl = () => {
      if (audioEl) return audioEl;
      audioEl = new Audio();
      audioEl.loop = true;
      audioEl.preload = 'auto';
      audioEl.addEventListener('error', () => {
        if (mode === 'off') return;
        startSynth(mode);
      });
      return audioEl;
    };

    const stopTrack = () => {
      if (!audioEl) return;
      audioEl.pause();
      audioEl.removeAttribute('src');
      try { audioEl.load(); } catch {}
    };

    const normalizeTrack = (rawTrack) => {
      if (!rawTrack || typeof rawTrack !== 'object') return null;
      const src = String(rawTrack.src || '').trim();
      if (!src) return null;
      const id = String(rawTrack.id || src).trim();
      const modes = Array.from(new Set(
        (Array.isArray(rawTrack.modes) ? rawTrack.modes : [])
          .map(normalizePlaybackMode)
          .filter((entry) => entry !== 'off')
      ));
      if (!modes.length) modes.push('focus');
      const gain = clamp01(parseFloat(rawTrack.gain), 1);
      return {
        id,
        src,
        modes,
        gain
      };
    };

    const normalizeCatalog = (payload) => {
      const tracks = Array.isArray(payload?.tracks)
        ? payload.tracks.map(normalizeTrack).filter(Boolean)
        : [];
      if (!tracks.length) return null;
      const modeIndex = {};
      tracks.forEach((track) => {
        track.modes.forEach((tag) => {
          if (!modeIndex[tag]) modeIndex[tag] = [];
          modeIndex[tag].push(track);
        });
      });
      return { tracks, modeIndex };
    };

    const loadCatalog = async () => {
      if (catalog) return catalog;
      if (catalogPromise) return catalogPromise;
      catalogPromise = fetch(MUSIC_CATALOG_URL, { cache: 'no-store' })
        .then((response) => (response.ok ? response.json() : null))
        .then((payload) => normalizeCatalog(payload))
        .catch(() => null)
        .then((nextCatalog) => {
          catalog = nextCatalog;
          return catalog;
        });
      return catalogPromise;
    };

    const chooseTrack = (playMode) => {
      let options = customTracks.length
        ? customTracks
        : (catalog?.modeIndex?.[playMode] || []);
      if (!options.length && !customTracks.length) {
        options = catalog?.modeIndex?.focus || [];
      }
      if (!options.length) return null;
      if (options.length === 1) return options[0];
      const pool = options.filter((track) => track.id !== activeTrackId);
      const source = pool.length ? pool : options;
      const index = Math.floor(Math.random() * source.length);
      return source[index];
    };

    const clearCustomTracks = () => {
      customTracks.forEach((track) => {
        if (!track?.src || !String(track.src).startsWith('blob:')) return;
        try { URL.revokeObjectURL(track.src); } catch {}
      });
      customTracks = [];
    };

    const setTrackVolume = (trackGain = 1) => {
      if (!audioEl) return;
      audioEl.volume = clamp01(vol * clamp01(trackGain, 1), vol);
    };

    const playCatalogTrack = async (playMode, token) => {
      await loadCatalog();
      if (token !== playbackToken || playMode !== mode || !catalog) {
        return { started: false, blocked: false };
      }
      const track = chooseTrack(playMode);
      if (!track) return { started: false, blocked: false };

      const player = ensureAudioEl();
      const resolveTrackSrc = (rawSrc) => {
        const src = String(rawSrc || '').trim();
        if (!src) return '';
        if (/^(?:blob:|data:|https?:)/i.test(src)) return src;
        // Support GH Pages subpath deploys by resolving root-like paths as app-relative.
        const normalized = src.startsWith('/') ? src.slice(1) : src;
        return new URL(normalized, window.location.href).toString();
      };
      const resolvedTrackUrl = resolveTrackSrc(track.src);
      if (!resolvedTrackUrl) return { started: false, blocked: false };
      if (player.src !== resolvedTrackUrl) player.src = resolvedTrackUrl;
      player.currentTime = 0;
      setTrackVolume(track.gain);
      try {
        await player.play();
        activeTrackId = track.id;
        player.dataset.wqTrackGain = String(track.gain || 1);
        return { started: true, blocked: false };
      } catch (error) {
        const blocked = String(error?.name || '').toLowerCase() === 'notallowederror';
        return { started: false, blocked };
      }
    };

    const start = async () => {
      const playMode = normalizePlaybackMode(mode);
      const token = ++playbackToken;
      stopSynth();
      if (playMode === 'off') {
        activeTrackId = '';
        stopTrack();
        return;
      }

      const catalogPlayback = await playCatalogTrack(playMode, token);
      if (token !== playbackToken || playMode !== mode) return;
      if (!catalogPlayback.started) {
        if (catalogPlayback.blocked) {
          // Browser autoplay gate: wait for user interaction to resume real tracks.
          activeTrackId = '';
          stopSynth();
          return;
        }
        activeTrackId = '';
        stopTrack();
        startSynth(playMode);
      }
    };

    return {
      setMode(nextMode) {
        mode = normalizePlaybackMode(nextMode);
        void start();
      },
      setVolume(value) {
        const next = Number.isFinite(value) ? value : parseFloat(DEFAULT_PREFS.musicVol);
        vol = clamp01(next, parseFloat(DEFAULT_PREFS.musicVol));
        if (synthGain) synthGain.gain.value = vol;
        const trackGain = parseFloat(audioEl?.dataset?.wqTrackGain || '1');
        setTrackVolume(Number.isFinite(trackGain) ? trackGain : 1);
      },
      initFromPrefs(prefState) {
        mode = normalizePlaybackMode(prefState.music || DEFAULT_PREFS.music);
        vol = clamp01(parseFloat(prefState.musicVol), parseFloat(DEFAULT_PREFS.musicVol));
        if (synthGain) synthGain.gain.value = vol;
        void loadCatalog();
        void start();
      },
      setCustomFiles(fileList) {
        const files = Array.from(fileList || [])
          .filter((file) => file && /^audio\//i.test(String(file.type || '')) && Number(file.size || 0) > 0);
        clearCustomTracks();
        const modeTags = Object.keys(PLAYBACK_PRESETS);
        customTracks = files.map((file, index) => ({
          id: `local-${Date.now()}-${index}`,
          src: URL.createObjectURL(file),
          modes: modeTags,
          gain: 1,
          name: file.name || `Track ${index + 1}`
        }));
        activeTrackId = '';
        if (mode !== 'off') void start();
        return { count: customTracks.length };
      },
      clearCustomFiles() {
        clearCustomTracks();
        activeTrackId = '';
        if (mode !== 'off') void start();
        return { count: 0 };
      },
      getCustomFileCount() {
        return customTracks.length;
      }
    };
  })();
// ─── 12. Start ───────────────────────────────────────
  WQAudio.setVoiceMode(normalizeVoiceMode(prefs.voice || DEFAULT_PREFS.voice));
  if (typeof WQAudio.primeAudioManifest === 'function') {
    void WQAudio.primeAudioManifest();
  }
  musicController = WQMusic;
  WQMusic.initFromPrefs(prefs);
  syncMusicForTheme();
  initQuestLoop();
  createDemoBanner();
  createHomeDemoLaunchButton();
  setDemoControlsDisabled();
  if (DEMO_MODE) {
    closeAllOverlaysForDemo();
    renderDemoDebugReadout();
  }
  enforceClassicFiveLetterDefault();
  newGame({ launchMissionLab: false });
  consumeWritingStudioReturnSummary();
  consumeWritingStudioHiddenNotice();

})();
