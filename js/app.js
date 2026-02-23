/**
 * app.js — Word Quest v2
 * Entry point. Wires all modules together.
 * Features: theme, projector mode, reduced motion, voice picker,
 * dismissible duplicate-letter toast, confetti, "Hear Word/Sentence"
 * during gameplay.
 */

(async () => {

  // ─── 1. Load data ──────────────────────────────────
  const loadingEl = document.getElementById('loading-screen');
  loadingEl?.classList.remove('hidden');
  await WQData.load();
  loadingEl?.classList.add('hidden');

  // ─── 2. Init UI ────────────────────────────────────
  WQUI.init();

  const SW_RUNTIME_URL = './sw-runtime.js?v=20260223i';

  async function registerOfflineRuntime() {
    if (!('serviceWorker' in navigator)) return;
    if (!window.isSecureContext && location.hostname !== 'localhost' && location.hostname !== '127.0.0.1') {
      return;
    }
    try {
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
  const PREF_MUSIC_AUTO_MIGRATION_KEY = 'wq_v2_pref_music_auto_20260222';
  const ALLOWED_MUSIC_MODES = new Set([
    'auto',
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
  const DEFAULT_PREFS = Object.freeze({
    focus: 'all',
    grade: 'all',
    length: '5',
    guesses: '6',
    caseMode: 'lower',
    hint: 'on',
    revealFocus: 'on',
    dupe: 'on',
    confetti: 'on',
    projector: 'off',
    motion: 'fun',
    feedback: 'themed',
    meaningPlusFun: 'on',
    sorNotation: 'on',
    voicePractice: 'optional',
    assessmentLock: 'off',
    boostPopups: 'on',
    music: 'off',
    musicVol: '0.50',
    voice: 'recorded',
    themeSave: 'off',
    boardStyle: 'card',
    keyStyle: 'bubble',
    keyboardLayout: 'standard',
    chunkTabs: 'auto',
    atmosphere: 'minimal'
  });
  function loadPrefs() {
    try { return JSON.parse(localStorage.getItem(PREF_KEY) || '{}'); } catch { return {}; }
  }
  function savePrefs(p) {
    try { localStorage.setItem(PREF_KEY, JSON.stringify(p)); } catch {}
  }
  const prefs = loadPrefs();
  function setPref(k, v) { prefs[k] = v; savePrefs(prefs); }

  // One-time baseline migration so existing installs land on your intended defaults.
  if (localStorage.getItem(PREF_MIGRATION_KEY) !== 'done') {
    if (prefs.length === undefined || prefs.length === 'any') prefs.length = DEFAULT_PREFS.length;
    if (prefs.guesses === undefined) prefs.guesses = DEFAULT_PREFS.guesses;
    if (prefs.feedback === undefined || prefs.feedback === 'classic') prefs.feedback = DEFAULT_PREFS.feedback;
    if (prefs.music === undefined || prefs.music === 'off') prefs.music = DEFAULT_PREFS.music;
    if (prefs.musicVol === undefined) prefs.musicVol = DEFAULT_PREFS.musicVol;
    if (prefs.focus === undefined) prefs.focus = DEFAULT_PREFS.focus;
    if (prefs.grade === undefined) prefs.grade = DEFAULT_PREFS.grade;
    if (prefs.themeSave === undefined) prefs.themeSave = DEFAULT_PREFS.themeSave;
    if (prefs.boardStyle === undefined) prefs.boardStyle = DEFAULT_PREFS.boardStyle;
    if (prefs.keyStyle === undefined) prefs.keyStyle = DEFAULT_PREFS.keyStyle;
    if (prefs.keyboardLayout === undefined) prefs.keyboardLayout = DEFAULT_PREFS.keyboardLayout;
    if (prefs.chunkTabs === undefined) prefs.chunkTabs = DEFAULT_PREFS.chunkTabs;
    if (prefs.atmosphere === undefined) prefs.atmosphere = DEFAULT_PREFS.atmosphere;
    if (prefs.meaningPlusFun === undefined) prefs.meaningPlusFun = DEFAULT_PREFS.meaningPlusFun;
    if (prefs.sorNotation === undefined) prefs.sorNotation = DEFAULT_PREFS.sorNotation;
    if (prefs.revealFocus === undefined) prefs.revealFocus = DEFAULT_PREFS.revealFocus;
    if (prefs.voicePractice === undefined) prefs.voicePractice = DEFAULT_PREFS.voicePractice;
    if (prefs.assessmentLock === undefined) prefs.assessmentLock = DEFAULT_PREFS.assessmentLock;
    if (prefs.boostPopups === undefined) prefs.boostPopups = DEFAULT_PREFS.boostPopups;
    if (prefs.themeSave !== 'on') delete prefs.theme;
    savePrefs(prefs);
    localStorage.setItem(PREF_MIGRATION_KEY, 'done');
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
  if (prefs.meaningPlusFun === undefined) {
    prefs.meaningPlusFun = DEFAULT_PREFS.meaningPlusFun;
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
  if (prefs.voicePractice === undefined) {
    prefs.voicePractice = DEFAULT_PREFS.voicePractice;
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
  if (!ALLOWED_MUSIC_MODES.has(String(prefs.music || '').toLowerCase())) {
    prefs.music = DEFAULT_PREFS.music;
    savePrefs(prefs);
  }
  const _el = id => document.getElementById(id);
  const ThemeRegistry = window.WQThemeRegistry || null;
  const shouldPersistTheme = () => (prefs.themeSave || DEFAULT_PREFS.themeSave) === 'on';
  let musicController = null;

  function resolveBuildLabel() {
    const appScript = Array.from(document.querySelectorAll('script[src]'))
      .find((script) => /(?:^|\/)js\/app\.js(?:[?#]|$)/i.test(script.getAttribute('src') || ''));
    const src = String(appScript?.getAttribute('src') || '');
    const match = src.match(/[?&]v=([^&#]+)/i);
    if (match && match[1]) return decodeURIComponent(match[1]);
    return '';
  }

  function syncBuildBadge() {
    const badge = _el('settings-build-badge');
    if (!badge) return;
    const label = resolveBuildLabel();
    badge.textContent = label ? `Build ${label}` : 'Build local';
    badge.title = label ? `WordQuest build ${label}` : 'WordQuest local build';
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

  function getThemeFallback() {
    if (ThemeRegistry && typeof ThemeRegistry.defaultThemeForMode === 'function') {
      return ThemeRegistry.defaultThemeForMode('calm');
    }
    return 'default';
  }

  function normalizeTheme(theme, fallback = getThemeFallback()) {
    if (ThemeRegistry && typeof ThemeRegistry.normalizeTheme === 'function') {
      return ThemeRegistry.normalizeTheme(theme, fallback);
    }
    return theme || fallback;
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
      status.textContent = 'Music is off.';
      return;
    }
    const activeLabel = MUSIC_LABELS[activeMode] || activeMode;
    if (selectedMode === 'auto') {
      status.textContent = `Auto picks ${activeLabel} for the active theme.`;
      return;
    }
    status.textContent = `Fixed music vibe: ${activeLabel}.`;
  }

  function syncMusicForTheme(options = {}) {
    if (!musicController) return;
    const selected = normalizeMusicMode(_el('s-music')?.value || prefs.music || DEFAULT_PREFS.music);
    const activeTheme = normalizeTheme(document.documentElement.getAttribute('data-theme'), getThemeFallback());
    const effective = selected === 'auto' ? resolveAutoMusicMode(activeTheme) : selected;
    musicController.setMode(effective);
    updateMusicStatus(selected, effective);
    if (options.toast) {
      const label = MUSIC_LABELS[effective] || effective;
      WQUI.showToast(selected === 'auto' ? `Music auto: ${label}.` : `Music: ${label}.`);
    }
  }

  // Apply saved values to selects
  const PREF_SELECTS = {
    'setting-focus': 'focus',
    's-theme-save': 'themeSave',
    's-board-style': 'boardStyle',
    's-key-style': 'keyStyle',
    's-chunk-tabs': 'chunkTabs',
    's-atmosphere': 'atmosphere',
    's-reveal-focus': 'revealFocus',
    's-voice-task': 'voicePractice',
    's-boost-popups': 'boostPopups',
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
  const musicSelect = _el('s-music');
  if (musicSelect) {
    const selectedMusic = normalizeMusicMode(prefs.music || DEFAULT_PREFS.music);
    musicSelect.value = selectedMusic;
    if (prefs.music !== selectedMusic) setPref('music', selectedMusic);
  }
  const musicVolInput = _el('s-music-vol');
  if (musicVolInput) {
    musicVolInput.value = String(prefs.musicVol ?? DEFAULT_PREFS.musicVol);
  }
  const voiceSelect = _el('s-voice');
  if (voiceSelect) {
    const selectedVoice = normalizeVoiceMode(prefs.voice || DEFAULT_PREFS.voice);
    voiceSelect.value = selectedVoice;
    if (prefs.voice !== selectedVoice) setPref('voice', selectedVoice);
  }
  syncBuildBadge();

  const themeSelect = _el('s-theme');
  const initialThemeSelection = shouldPersistTheme() ? prefs.theme : getThemeFallback();
  if (themeSelect && ThemeRegistry && typeof ThemeRegistry.renderThemeOptions === 'function') {
    ThemeRegistry.renderThemeOptions(themeSelect, initialThemeSelection || getThemeFallback());
  } else if (themeSelect && initialThemeSelection) {
    themeSelect.value = initialThemeSelection;
  }

  // Apply theme + modes immediately
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
  applyRevealFocusMode(prefs.revealFocus || DEFAULT_PREFS.revealFocus, { persist: false });
  applyFeedback(prefs.feedback || DEFAULT_PREFS.feedback);
  applyBoardStyle(prefs.boardStyle || DEFAULT_PREFS.boardStyle);
  applyKeyStyle(prefs.keyStyle || DEFAULT_PREFS.keyStyle);
  applyKeyboardLayout(prefs.keyboardLayout || DEFAULT_PREFS.keyboardLayout);
  applyAtmosphere(prefs.atmosphere || DEFAULT_PREFS.atmosphere);
  WQUI.setCaseMode(prefs.caseMode || DEFAULT_PREFS.caseMode);
  updateWilsonModeToggle();
  syncHintToggleUI();

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
  function applyTheme(name) {
    const normalized = normalizeTheme(name, getThemeFallback());
    document.documentElement.setAttribute('data-theme', normalized);
    document.documentElement.setAttribute('data-theme-family', getThemeFamily(normalized));
    const select = _el('s-theme');
    if (select && select.value !== normalized) select.value = normalized;
    syncMusicForTheme();
    return normalized;
  }

  function applyProjector(mode) {
    document.documentElement.setAttribute('data-projector', mode);
  }

  function applyMotion(mode) {
    document.documentElement.setAttribute('data-motion', mode);
  }

  function applyHint(mode) {
    document.documentElement.setAttribute('data-hint', mode);
  }

  function getRevealFocusMode() {
    const mode = String(_el('s-reveal-focus')?.value || prefs.revealFocus || DEFAULT_PREFS.revealFocus).toLowerCase();
    return mode === 'off' ? 'off' : 'on';
  }

  function syncRevealFocusModalSections() {
    const focusMode = getRevealFocusMode();
    const practiceDetails = _el('modal-practice-details');
    if (practiceDetails && !practiceDetails.classList.contains('hidden')) {
      const requiredPractice = getVoicePracticeMode() === 'required' && !voiceTakeComplete;
      practiceDetails.open = requiredPractice || focusMode === 'off';
    }
    const details = _el('modal-more-details');
    if (details) {
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
      settingsBtn.title = locked
        ? 'Assessment lock: settings unavailable until round ends.'
        : 'Settings';
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

  function syncHintToggleUI(mode = getHintMode()) {
    const toggle = _el('focus-hint-toggle');
    if (!toggle) return;
    const enabled = mode !== 'off';
    toggle.textContent = enabled ? 'Hint: On' : 'Hint: Off';
    toggle.setAttribute('aria-pressed', enabled ? 'true' : 'false');
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
    const allowed = new Set(['bubble', 'classic', 'arcade', 'soundcard']);
    const normalized = allowed.has(mode) ? mode : DEFAULT_PREFS.keyStyle;
    document.documentElement.setAttribute('data-key-style', normalized);
    const select = _el('s-key-style');
    if (select && select.value !== normalized) select.value = normalized;
    updateWilsonModeToggle();
    return normalized;
  }

  function applyKeyboardLayout(mode) {
    const normalized = mode === 'wilson' ? 'wilson' : 'standard';
    document.documentElement.setAttribute('data-keyboard-layout', normalized);
    updateWilsonModeToggle();
    syncChunkTabsVisibility();
    return normalized;
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

  function getVoicePracticeMode() {
    const select = _el('s-voice-task');
    const next = String(select?.value || prefs.voicePractice || DEFAULT_PREFS.voicePractice).toLowerCase();
    if (next === 'off' || next === 'required') return next;
    return 'optional';
  }

  function areBoostPopupsEnabled() {
    const select = _el('s-boost-popups');
    const value = String(select?.value || prefs.boostPopups || DEFAULT_PREFS.boostPopups).toLowerCase();
    return value !== 'off';
  }

  const TEACHER_PRESETS = Object.freeze({
    guided: Object.freeze({
      hint: 'on',
      revealFocus: 'on',
      voicePractice: 'required',
      voice: 'recorded',
      assessmentLock: 'off',
      boostPopups: 'on',
      confetti: 'on'
    }),
    independent: Object.freeze({
      hint: 'off',
      revealFocus: 'on',
      voicePractice: 'optional',
      voice: 'recorded',
      assessmentLock: 'off',
      boostPopups: 'on',
      confetti: 'on'
    }),
    assessment: Object.freeze({
      hint: 'off',
      revealFocus: 'on',
      voicePractice: 'off',
      voice: 'off',
      assessmentLock: 'on',
      boostPopups: 'off',
      confetti: 'off'
    })
  });

  function detectTeacherPreset() {
    const current = {
      hint: getHintMode(),
      revealFocus: getRevealFocusMode(),
      voicePractice: getVoicePracticeMode(),
      voice: normalizeVoiceMode(_el('s-voice')?.value || prefs.voice || DEFAULT_PREFS.voice),
      assessmentLock: isAssessmentLockEnabled() ? 'on' : 'off',
      boostPopups: areBoostPopupsEnabled() ? 'on' : 'off',
      confetti: String(_el('s-confetti')?.value || prefs.confetti || DEFAULT_PREFS.confetti).toLowerCase() === 'off'
        ? 'off'
        : 'on'
    };
    return Object.entries(TEACHER_PRESETS).find(([, preset]) =>
      current.hint === preset.hint &&
      current.revealFocus === preset.revealFocus &&
      current.voicePractice === preset.voicePractice &&
      current.voice === preset.voice &&
      current.assessmentLock === preset.assessmentLock &&
      current.boostPopups === preset.boostPopups &&
      current.confetti === preset.confetti
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
      return;
    }
    const preset = TEACHER_PRESETS[mode];
    if (!preset) return;
    setHintMode(preset.hint);
    applyRevealFocusMode(preset.revealFocus);

    const voiceTaskSelect = _el('s-voice-task');
    if (voiceTaskSelect) voiceTaskSelect.value = preset.voicePractice;
    setPref('voicePractice', preset.voicePractice);

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

    if (preset.voice === 'off') cancelRevealNarration();
    updateVoicePracticePanel(WQGame.getState());
    syncRevealFocusModalSections();
    syncAssessmentLockRuntime();
    syncTeacherPresetButtons(mode);
    WQUI.showToast(`Preset applied: ${mode}.`);
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

  function syncThemePreviewStripVisibility() {
    const strip = _el('theme-preview-strip');
    if (!strip) return;
    const panelOpen = !_el('settings-panel')?.classList.contains('hidden');
    const focusOpen = document.documentElement.getAttribute('data-focus-search-open') === 'true';
    const shouldShow = !panelOpen && !focusOpen && !isAssessmentRoundLocked();
    strip.classList.toggle('hidden', !shouldShow);
    strip.setAttribute('aria-hidden', shouldShow ? 'false' : 'true');
  }

  function syncHeaderControlsVisibility() {
    syncThemePreviewStripVisibility();
    updateFocusHint();
    updateFocusSummaryLabel();
  }

  document.querySelectorAll('#settings-panel [data-settings-tab]').forEach((tab) => {
    tab.addEventListener('click', () => {
      setSettingsView(tab.getAttribute('data-settings-tab'));
    });
  });

  document.querySelectorAll('[data-teacher-preset]').forEach((btn) => {
    btn.addEventListener('click', () => {
      applyTeacherPreset(btn.getAttribute('data-teacher-preset') || '');
    });
  });

  setSettingsView('quick');
  syncHeaderControlsVisibility();
  syncTeacherPresetButtons();
  syncAssessmentLockRuntime({ closeFocus: false });

  _el('settings-btn')?.addEventListener('click', () => {
    if (isAssessmentRoundLocked()) {
      showAssessmentLockNotice();
      return;
    }
    const panel = _el('settings-panel');
    if (!panel) return;
    const opening = panel.classList.contains('hidden');
    panel.classList.toggle('hidden');
    if (opening) setSettingsView('quick');
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
// Close settings when clicking outside
  document.addEventListener('pointerdown', e => {
    const panel = _el('settings-panel');
    const focusWrap = _el('focus-inline-wrap');
    if (focusWrap && !focusWrap.contains(e.target)) {
      closeFocusSearchList();
      updateFocusSummaryLabel();
    }
    if (!panel?.classList.contains('hidden') &&
        !panel.contains(e.target) &&
        e.target !== _el('settings-btn') &&
        !_el('settings-btn')?.contains(e.target)) {
      panel.classList.add('hidden');
      syncHeaderControlsVisibility();
    }
    if (_dupeToastEl && !_dupeToastEl.contains(e.target)) removeDupeToast();
    if (_el('toast')?.classList.contains('visible')) _el('toast').classList.remove('visible');
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
    _el('settings-panel')?.classList.add('hidden');
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

  function refreshKeyboardLayoutPreview() {
    const state = WQGame.getState?.();
    if (!state?.word) return;
    // Avoid resetting key-state mid-round; apply immediately only before first submitted guess.
    if (state.guesses.length > 0) return;
    WQUI.buildKeyboard();
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
  _el('s-key-style')?.addEventListener('change', e => {
    const next = applyKeyStyle(e.target.value);
    setPref('keyStyle', next);
    updateWilsonModeToggle();
    refreshKeyboardLayoutPreview();
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
  _el('s-atmosphere')?.addEventListener('change', e => {
    setPref('atmosphere', applyAtmosphere(e.target.value));
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
    WQUI.setCaseMode(e.target.value);
    setPref('caseMode', e.target.value);
  });
  _el('s-grade')?.addEventListener('change',   e => {
    setPref('grade', e.target.value);
    updateFocusGradeNote();
  });
  _el('s-length')?.addEventListener('change',  e => setPref('length',   e.target.value));
  _el('s-guesses')?.addEventListener('change', e => setPref('guesses',  e.target.value));
  _el('s-hint')?.addEventListener('change',    e => { setHintMode(e.target.value); syncTeacherPresetButtons(); });
  _el('s-reveal-focus')?.addEventListener('change', e => {
    const next = applyRevealFocusMode(e.target.value);
    WQUI.showToast(next === 'on'
      ? 'Reveal focus is on: word + meaning first.'
      : 'Reveal focus is off: full detail layout.');
    syncTeacherPresetButtons();
  });
  _el('focus-hint-toggle')?.addEventListener('click', () => {
    const next = getHintMode() === 'on' ? 'off' : 'on';
    setHintMode(next, { toast: true });
    syncTeacherPresetButtons();
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
      ? 'SoR notation will show on reveal.'
      : 'SoR notation is hidden on reveal.'
    );
    if (!(_el('modal-overlay')?.classList.contains('hidden'))) {
      const currentEntry = WQGame.getState()?.entry;
      updateRevealSorBadge(currentEntry);
    }
  });
  _el('s-voice-task')?.addEventListener('change', e => {
    const mode = String(e.target.value || 'optional').toLowerCase();
    const normalized = mode === 'off' || mode === 'required' ? mode : 'optional';
    setPref('voicePractice', normalized);
    if (!(_el('modal-overlay')?.classList.contains('hidden'))) {
      updateVoicePracticePanel(WQGame.getState());
      syncRevealFocusModalSections();
    }
    syncTeacherPresetButtons();
    WQUI.showToast(normalized === 'required'
      ? 'Voice practice is required before next word.'
      : normalized === 'off'
        ? 'Voice practice is off.'
        : 'Voice practice is optional.'
    );
  });
  _el('s-boost-popups')?.addEventListener('change', e => {
    const normalized = e.target.value === 'off' ? 'off' : 'on';
    setPref('boostPopups', normalized);
    if (normalized === 'off') hideMidgameBoost();
    syncTeacherPresetButtons();
    WQUI.showToast(normalized === 'off' ? 'Engagement popups are off.' : 'Engagement popups are on.');
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
  let revealNarrationToken = 0;
  const VOICE_PRIVACY_TOAST_KEY = 'wq_voice_privacy_toast_seen_v1';
  const VOICE_CAPTURE_MS = 1000;
  const VOICE_HISTORY_KEY = 'wq_v2_voice_history_v1';
  const VOICE_HISTORY_LIMIT = 3;

  function setVoiceRecordingUI(isRecording) {
    const recordBtn = _el('voice-record-btn');
    if (recordBtn) {
      recordBtn.disabled = !!isRecording;
      recordBtn.classList.toggle('is-recording', !!isRecording);
      recordBtn.textContent = isRecording ? 'Recording...' : 'Start 1-sec Recording';
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
    try {
      if (voiceRecorder && voiceRecorder.state !== 'inactive') {
        voiceRecorder.stop();
      }
    } catch {}
    stopVoiceVisualizer();
    stopVoiceStream();
    voiceIsRecording = false;
    setVoiceRecordingUI(false);
  }

  function drawWaveform(values = null) {
    const canvas = _el('voice-waveform');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const w = canvas.width;
    const h = canvas.height;
    const mid = h / 2;

    ctx.clearRect(0, 0, w, h);
    ctx.fillStyle = 'rgba(255,255,255,0.04)';
    ctx.fillRect(0, 0, w, h);

    ctx.strokeStyle = 'rgba(255,255,255,0.16)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, mid);
    ctx.lineTo(w, mid);
    ctx.stroke();

    if (!values?.length) return;
    ctx.strokeStyle = '#34d399';
    ctx.lineWidth = 2;
    ctx.beginPath();
    values.forEach((value, index) => {
      const x = (index / (values.length - 1 || 1)) * w;
      const y = (value / 255) * h;
      if (index === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });
    ctx.stroke();
  }

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

  function buildVoiceFeedback(analysis) {
    if (!analysis) {
      return {
        message: '1-second clip captured. Play it back and compare with the model audio.',
        tone: 'default',
        score: 60,
        label: 'Captured'
      };
    }
    if (analysis.duration < 0.55) {
      return {
        message: 'Clip was very short. Try tapping Record and speaking right away.',
        tone: 'warn',
        score: 35,
        label: 'Short'
      };
    }
    if (analysis.rms < 0.012 || analysis.voicedRatio < 0.05) {
      return {
        message: 'Clip captured, but very quiet. Try a little louder or closer to the mic.',
        tone: 'warn',
        score: 44,
        label: 'Quiet'
      };
    }
    if (analysis.peak > 0.97 || analysis.rms > 0.25) {
      return {
        message: 'Clip captured, but volume may be too high. Step back slightly and retry.',
        tone: 'warn',
        score: 52,
        label: 'Hot'
      };
    }
    return {
      message: 'Great clarity. Play it back, then compare with the model audio.',
      tone: 'good',
      score: 86,
      label: 'Clear'
    };
  }

  function updateRevealSorBadge(entry) {
    const sor = _el('modal-sor');
    if (!sor) return;
    const notation = String(entry?.phonics || '').trim();
    if (!isSorNotationEnabled() || !notation || notation.toLowerCase() === 'all') {
      sor.textContent = '';
      sor.classList.add('hidden');
      return;
    }
    sor.textContent = `SoR focus: ${notation}`;
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
      setVoicePracticeFeedback('Tap Start to capture a 1-second clip, then compare with the model audio.');
    }
  }

  async function startVoiceRecording() {
    if (voiceIsRecording) return;
    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === 'undefined') {
      setVoicePracticeFeedback('Recording is not available on this device.', true);
      return;
    }
    try {
      clearVoiceClip();
      voiceTakeComplete = false;
      voiceChunks = [];
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
        const playBtn = _el('voice-play-btn');
        if (playBtn) playBtn.disabled = false;
        const saveBtn = _el('voice-save-btn');
        if (saveBtn) saveBtn.disabled = false;
        setVoicePracticeFeedback('Analyzing your clip...');
        updateVoicePracticePanel(WQGame.getState());
        void analyzeVoiceClip(blob).then((analysis) => {
          if (!voiceClipBlob || voiceClipBlob !== blob) return;
          const review = buildVoiceFeedback(analysis);
          setVoicePracticeFeedback(review.message, review.tone);
          appendVoiceHistory(review);
        });
      });
      voiceIsRecording = true;
      setVoiceRecordingUI(true);
      setVoicePracticeFeedback('Recording for 1 second...');
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
      setVoicePracticeFeedback(reason === 'auto' ? 'Saving your 1-second clip...' : 'Saving your recording...');
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
    _el('voice-record-btn')?.addEventListener('click', () => { void startVoiceRecording(); });
    _el('voice-play-btn')?.addEventListener('click', () => playVoiceRecording());
    _el('voice-save-btn')?.addEventListener('click', () => saveVoiceRecording());
    document.body.dataset.wqVoicePracticeBound = '1';
    setVoiceRecordingUI(false);
    drawWaveform();
    renderVoiceHistoryStrip();
  }

  function installRevealModalPatch() {
    if (!WQUI || typeof WQUI.showModal !== 'function') return;
    if (WQUI.__revealPatchApplied) return;
    bindVoicePracticeControls();
    const originalShowModal = WQUI.showModal.bind(WQUI);
    WQUI.showModal = function patchedShowModal(state) {
      originalShowModal(state);
      voiceTakeComplete = false;
      stopVoiceCaptureNow();
      clearVoiceClip();
      drawWaveform();
      updateRevealSorBadge(state?.entry);
      syncRevealMeaningHighlight(state?.entry);
      const practiceDetails = _el('modal-practice-details');
      if (practiceDetails) {
        const requiredPractice = getVoicePracticeMode() === 'required';
        practiceDetails.open = requiredPractice || getRevealFocusMode() === 'off';
      }
      const details = _el('modal-more-details');
      if (details) details.open = getRevealFocusMode() === 'off';
      updateVoicePracticePanel(state);
      syncRevealFocusModalSections();
      void runRevealNarration(state);
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
      const boardPlateEl = document.querySelector('.board-plate');
      const keyboardEl = _el('keyboard');
      const gameplayAudioEl = document.querySelector('.gameplay-audio');
      const headerEl = document.querySelector('header');
      const focusEl = document.querySelector('.focus-bar');
      const themeStripEl = _el('theme-preview-strip');
      const hintEl = _el('focus-hint');
      const hintRowEl = hintEl?.closest('.focus-hint-row') || null;

      const keyH = parsePx(rootStyle.getPropertyValue('--key-h'), 52);
      const keyGap = parsePx(rootStyle.getPropertyValue('--gap-key'), 8);
      const tileGap = parsePx(rootStyle.getPropertyValue('--gap-tile'), 5);
      const mainStyle = mainEl ? getComputedStyle(mainEl) : null;
      const mainInnerW = (mainEl?.clientWidth || Math.min(window.innerWidth, 560))
        - parsePx(mainStyle?.paddingLeft, 12)
        - parsePx(mainStyle?.paddingRight, 12);
      const mainPadTop = parsePx(mainStyle?.paddingTop, 10);
      const mainPadBottom = parsePx(mainStyle?.paddingBottom, 10);
      const boardZoneGap = parsePx(getComputedStyle(boardZoneEl || document.body).gap, 10);
      const platePadY = parsePx(getComputedStyle(boardPlateEl || document.body).paddingTop, 14) * 2;
      const platePadX = parsePx(getComputedStyle(boardPlateEl || document.body).paddingLeft, 14) * 2;
      const audioH = gameplayAudioEl?.offsetHeight || 36;
      const headerH = headerEl?.offsetHeight || parsePx(rootStyle.getPropertyValue('--header-h'), 50);
      const focusH = focusEl?.offsetHeight || parsePx(rootStyle.getPropertyValue('--focus-h'), 44);
      const themeH = themeStripEl?.offsetHeight || 0;
      const viewportH = window.visualViewport?.height || window.innerHeight;
      const viewportW = window.visualViewport?.width || window.innerWidth;
      const keyboardLayout = document.documentElement.getAttribute('data-keyboard-layout') || 'standard';
      const chunkTabsOn = document.documentElement.getAttribute('data-chunk-tabs') !== 'off';
      const isLandscape = viewportW >= viewportH;
      let layoutMode = 'default';
      if (viewportW >= 1040 && viewportH >= 700) layoutMode = 'wide';
      else if (viewportH <= 620 || (isLandscape && viewportH <= 700)) layoutMode = 'compact';
      else if (viewportH <= 760) layoutMode = 'tight';
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
      const hintH = hintRowEl
        ? Math.max(0, (hintRowEl.offsetHeight || 0) - 8)
        : 0;
      const kbRows = 3;
      const keyboardSafetyPad = keyboardLayout === 'wilson'
        ? (layoutMode === 'compact' ? 34 : layoutMode === 'tight' ? 30 : 26)
        : 16;
      const kbH = kbRows * keyH + (kbRows - 1) * keyGap + chunkRowH + keyboardSafetyPad;

      const extraSafetyH = layoutMode === 'compact' ? 56 : layoutMode === 'tight' ? 44 : layoutMode === 'wide' ? 32 : 38;
      const reservedH = headerH + focusH + themeH + mainPadTop + mainPadBottom + audioH + kbH + boardZoneGap + hintH + extraSafetyH;
      const availableBoardH = Math.max(140, viewportH - reservedH);
      const byHeight = Math.floor((availableBoardH - platePadY - tileGap * (maxGuesses - 1) - 6) / maxGuesses);

      const availableBoardW = Math.max(220, mainInnerW);
      const byWidth = Math.floor((availableBoardW - platePadX - tileGap * (wordLength - 1)) / wordLength);

      const sizeCap = layoutMode === 'wide' ? 62 : layoutMode === 'tight' ? 52 : layoutMode === 'compact' ? 44 : 56;
      const sizeFloor = layoutMode === 'compact' ? 24 : 28;
      const size = Math.max(sizeFloor, Math.min(byHeight, byWidth, sizeCap));
      const boardWidth = wordLength * size + (wordLength - 1) * tileGap;
      const playfieldW = Math.ceil(boardWidth);

      const adaptiveKeyH = Math.max(layoutMode === 'compact' ? 34 : 42, Math.min(layoutMode === 'wide' ? 56 : 52, Math.round(size * 0.94)));
      let adaptiveKeyMinW = Math.max(layoutMode === 'compact' ? 22 : 26, Math.min(46, Math.round(size * 0.76)));
      let adaptiveKeyGap = Math.max(5.8, Math.min(10, Math.round(size * 0.16)));
      const maxKeyboardW = Math.max(286, Math.min(window.innerWidth - 16, mainInnerW - 4));
      const activeCols = keyboardLayout === 'wilson' ? 10 : 10;
      const estimateKeyboardW = () => (adaptiveKeyMinW * activeCols) + (adaptiveKeyGap * (activeCols - 1));
      const minKeyFloor = layoutMode === 'compact' ? 22 : 24;
      while (estimateKeyboardW() > maxKeyboardW && adaptiveKeyMinW > minKeyFloor) {
        adaptiveKeyMinW -= 1;
        if (adaptiveKeyGap > 5.4) adaptiveKeyGap -= 0.2;
      }

      document.documentElement.style.setProperty('--tile-size', `${size}px`);
      document.documentElement.style.setProperty('--playfield-width', `${playfieldW}px`);
      document.documentElement.style.setProperty('--key-h', `${adaptiveKeyH}px`);
      document.documentElement.style.setProperty('--key-min-w', `${adaptiveKeyMinW}px`);
      document.documentElement.style.setProperty('--gap-key', `${Math.max(6, adaptiveKeyGap).toFixed(1)}px`);
      document.documentElement.style.setProperty('--keyboard-max-width', `${Math.ceil(maxKeyboardW)}px`);

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

  function syncGradeFromFocus(focusValue, options = {}) {
    const preset = parseFocusPreset(focusValue);
    if (preset.kind !== 'subject') return;
    const gradeSelect = _el('s-grade');
    if (!gradeSelect || !preset.gradeBand) return;
    if (gradeSelect.value !== preset.gradeBand) {
      gradeSelect.value = preset.gradeBand;
      setPref('grade', preset.gradeBand);
      if (!options.silent) {
        WQUI.showToast(`Grade band synced to ${preset.gradeBand} for this focus.`);
      }
    }
  }

  function updateFocusHint() {
    const hintEl = _el('focus-hint');
    if (!hintEl) return;
    const hintRow = hintEl.closest('.focus-hint-row');
    const mode = getHintMode();
    syncHintToggleUI(mode);
    if (mode !== 'on') {
      hintEl.textContent = '';
      hintEl.classList.add('hidden');
      if (hintRow) hintRow.classList.add('is-off');
      return;
    }
    if (hintRow) hintRow.classList.remove('is-off');
    const state = WQGame.getState?.() || null;
    const entry = state?.entry || null;
    const focusValue = _el('setting-focus')?.value || 'all';
    const preset = parseFocusPreset(focusValue);
    const phonicsTag = String(entry?.phonics || '').trim();
    let hintText = '';

    if (phonicsTag && phonicsTag.toLowerCase() !== 'all') {
      hintText = `Hint cue: ${phonicsTag}`;
    } else if (preset.kind === 'subject') {
      hintText = `Hint cue: ${preset.subject.toUpperCase()} vocabulary · ${preset.gradeBand}`;
    } else if (preset.kind === 'classic') {
      hintText = 'Hint cue: classic mode uses grade + word length.';
    } else {
      hintText = `Hint cue: ${getFocusLabel(focusValue).replace(/[—]/g, '').trim()}`;
    }

    hintEl.textContent = hintText;
    hintEl.classList.remove('hidden');
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
    const preset = parseFocusPreset(focusVal);
    if (preset.kind === 'classic') {
      note.textContent = `Classic uses Grade Band + Word Length. Current grade: ${gradeVal}.`;
      return;
    }
    if (preset.kind === 'subject') {
      note.textContent = `Subject focus is ${preset.subject.toUpperCase()} and grade is auto-aligned to ${preset.gradeBand}.`;
      return;
    }
    note.textContent = `Phonics focus narrows by pattern. Grade (${gradeVal}) and Word Length still apply.`;
  }

  function getFocusEntries() {
    const select = _el('setting-focus');
    if (!select) return [];
    return Array.from(select.options)
      .filter((option) => option.value && !option.disabled)
      .map((option) => {
        const parent = option.parentElement;
        const group = parent && parent.tagName === 'OPTGROUP' ? String(parent.label || '').trim() : 'General';
        return {
          value: option.value,
          label: String(option.textContent || option.value).trim(),
          group
        };
      });
  }

  function getFocusLabel(value) {
    const select = _el('setting-focus');
    if (!select) return '— Classic (Wordle 5x6) —';
    const option = Array.from(select.options).find((entry) => entry.value === value);
    return String(option?.textContent || '— Classic (Wordle 5x6) —').trim();
  }

  function clearPinnedFocusSearchValue(inputEl) {
    if (!inputEl) return;
    const raw = String(inputEl.value || '').trim();
    if (!raw) return;
    const focusValue = _el('setting-focus')?.value || 'all';
    const currentLabel = getFocusLabel(focusValue).replace(/[—]/g, '').trim().toLowerCase();
    const normalizedRaw = raw
      .replace(/[—]/g, '')
      .replace(/\s+/g, ' ')
      .trim()
      .toLowerCase();
    if (!currentLabel || !normalizedRaw) return;
    if (
      normalizedRaw === currentLabel ||
      normalizedRaw.startsWith(`${currentLabel} · type to search`) ||
      normalizedRaw.startsWith(`${currentLabel} - type to search`) ||
      normalizedRaw.startsWith(`search focus: ${currentLabel}`)
    ) {
      inputEl.value = '';
    }
  }

  function updateFocusSummaryLabel() {
    const labelEl = _el('focus-inline-search');
    const focusValue = _el('setting-focus')?.value || 'all';
    if (!labelEl) return;
    const currentLabel = getFocusLabel(focusValue).replace(/[—]/g, '').trim();
    // Keep the field behaving like search: show current focus in placeholder, not as locked text.
    labelEl.value = '';
    labelEl.placeholder = currentLabel
      ? `${currentLabel} · type to search (math, digraph, k-2)`
      : 'Type to search focus (math, digraph, k-2)';
    labelEl.setAttribute('title', currentLabel ? `Current focus: ${currentLabel}` : 'Focus finder');
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
    'all',
    'cvc',
    'cvce',
    'vowel_team',
    'r_controlled',
    'multisyllable',
    'vocab-math-k2',
    'vocab-math-35',
    'vocab-science-35',
    'vocab-social-35',
    'vocab-ela-35'
  ]);
  const FOCUS_EMPTY_VISIBLE_LIMIT = 8;
  const FOCUS_QUERY_VISIBLE_LIMIT = 10;

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
    cvc: Object.freeze(['short vowels', 'closed syllables']),
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

  function setFocusSearchOpen(isOpen) {
    document.documentElement.setAttribute('data-focus-search-open', isOpen ? 'true' : 'false');
    const strip = _el('theme-preview-strip');
    if (strip) {
      strip.classList.toggle('is-search-hidden', !!isOpen);
    }
    syncThemePreviewStripVisibility();
  }

  function getFocusSearchButtons() {
    const listEl = _el('focus-inline-results');
    if (!listEl) return [];
    return Array.from(listEl.querySelectorAll('.focus-search-item[data-focus-value]'));
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

  function renderFocusSearchList(rawQuery = '') {
    const listEl = _el('focus-inline-results');
    const inputEl = _el('focus-inline-search');
    if (!listEl) return;
    const query = String(rawQuery || '').trim().toLowerCase();
    const entries = getFocusEntries();
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
    if (!query) {
      const used = new Set();
      FOCUS_QUICK_VALUES.forEach((value) => {
        const found = entries.find((entry) => entry.value === value);
        if (found && !used.has(found.value)) {
          visible.push(found);
          used.add(found.value);
        }
      });
      entries.forEach((entry) => {
        if (visible.length >= FOCUS_EMPTY_VISIBLE_LIMIT || used.has(entry.value)) return;
        visible.push(entry);
        used.add(entry.value);
      });
    } else {
      visible = getRankedFocusMatches(entries, query);
    }

    if (!visible.length) {
      listEl.innerHTML = '<div class="focus-search-empty">No matches yet. Try terms like "math", "science", "digraph", "k-2", or "3-5".</div>';
      listEl.classList.remove('hidden');
      if (inputEl) inputEl.setAttribute('aria-expanded', 'true');
      setFocusSearchOpen(true);
      focusNavIndex = -1;
      if (inputEl) inputEl.removeAttribute('aria-activedescendant');
      return;
    }

    const active = _el('setting-focus')?.value || 'all';
    const guidance = !query
      ? '<div class="focus-search-empty">Try typing: <b>math</b>, <b>science</b>, <b>digraph</b>, <b>k-2</b>, <b>3-5</b>.</div>'
      : '';
    listEl.innerHTML = guidance + visible.map((entry) => {
      const activeClass = entry.value === active ? ' is-active' : '';
      const selected = entry.value === active ? 'true' : 'false';
      return `<button type="button" class="focus-search-item${activeClass}" data-focus-value="${escapeHtml(entry.value)}" role="option" aria-selected="${selected}"><span>${escapeHtml(entry.label)}</span><small>${escapeHtml(entry.group)}</small></button>`;
    }).join('');
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
    focusNavIndex = -1;
    if (inputEl) inputEl.removeAttribute('aria-activedescendant');
    if (inputEl) inputEl.setAttribute('aria-expanded', 'false');
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
      return;
    }
    select.value = target;
    select.dispatchEvent(new Event('change', { bubbles: true }));
    if (options.toast) {
      WQUI.showToast(`Focus set: ${getFocusLabel(target)}.`);
    }
    closeFocusSearchList();
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
      const preset = parseFocusPreset(opts.focus || opts.phonics || 'all');
      const gradeBand = preset.kind === 'subject' ? preset.gradeBand : opts.gradeBand;
      const basePool = originalGetPlayableWords({
        gradeBand: gradeBand || 'all',
        length: opts.length,
        phonics: 'all'
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
    syncGradeFromFocus(focus);
    updateFocusHint();
    updateFocusGradeNote();
    updateFocusSummaryLabel();
    syncChunkTabsVisibility();
    closeFocusSearchList();
  });

  _el('focus-inline-search')?.addEventListener('focus', (event) => {
    if (isAssessmentRoundLocked()) {
      showAssessmentLockNotice('Assessment lock is on. Focus changes unlock after this round.');
      closeFocusSearchList();
      event.target.blur();
      return;
    }
    clearPinnedFocusSearchValue(event.target);
    const query = String(event.target?.value || '').trim();
    renderFocusSearchList(query);
  });

  _el('focus-inline-search')?.addEventListener('input', (event) => {
    if (isAssessmentRoundLocked()) {
      closeFocusSearchList();
      return;
    }
    clearPinnedFocusSearchValue(event.target);
    const query = String(event.target?.value || '').trim();
    renderFocusSearchList(query);
  });

  _el('focus-inline-search')?.addEventListener('keydown', (event) => {
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
        renderFocusSearchList(query);
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
    setFocusValue(chosen.getAttribute('data-focus-value'));
    updateFocusSummaryLabel();
    event.preventDefault();
  });

  _el('focus-inline-results')?.addEventListener('click', (event) => {
    if (isAssessmentRoundLocked()) {
      showAssessmentLockNotice('Assessment lock is on. Focus changes unlock after this round.');
      closeFocusSearchList();
      return;
    }
    const button = event.target?.closest?.('[data-focus-value]');
    if (!button) return;
    const value = button.getAttribute('data-focus-value');
    setFocusValue(value);
    updateFocusSummaryLabel();
  });

  syncGradeFromFocus(_el('setting-focus')?.value || prefs.focus || 'all', { silent: true });
  updateFocusHint();
  updateFocusGradeNote();
  syncChunkTabsVisibility();
  updateFocusSummaryLabel();
  closeFocusSearchList();
  setFocusSearchOpen(false);

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
    boost.classList.remove('is-visible');
    if (!boost.classList.contains('hidden')) {
      setTimeout(() => boost.classList.add('hidden'), 180);
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
    if (!areBoostPopupsEnabled()) return;
    if (isAssessmentRoundLocked()) return;
    const boost = _el('midgame-boost');
    if (!boost) return;
    const card = nextMidgameBoostCard();
    if (!card) return;
    const content = splitBoostQuestionAndAnswer(card.type, card.text);
    const hasAnswer = card.type === 'joke' && Boolean(content.answer);
    const label =
      card.type === 'joke' ? 'Joke Break' :
      card.type === 'quote' ? 'Quick Quote' :
      'Fun Fact';
    boost.innerHTML = `
      <div class="midgame-boost-head">
        <span class="midgame-boost-tag">${label}</span>
        <button type="button" class="midgame-boost-close" aria-label="Dismiss boost">✕</button>
      </div>
      <p class="midgame-boost-question">${content.question}</p>
      ${hasAnswer ? '<button type="button" class="midgame-boost-answer-btn">Show answer</button><p class="midgame-boost-answer hidden"></p>' : ''}
      <div class="midgame-boost-actions">
        <button type="button" class="midgame-boost-action midgame-boost-dismiss">Keep playing</button>
        <button type="button" class="midgame-boost-action midgame-boost-turn-off">Turn off</button>
      </div>
    `;
    const answerEl = boost.querySelector('.midgame-boost-answer');
    const answerBtn = boost.querySelector('.midgame-boost-answer-btn');
    if (answerEl) answerEl.textContent = content.answer;
    answerBtn?.addEventListener('click', () => {
      if (!answerEl) return;
      const reveal = answerEl.classList.contains('hidden');
      answerEl.classList.toggle('hidden', !reveal);
      answerBtn.textContent = reveal ? 'Hide answer' : 'Show answer';
    });
    boost.querySelector('.midgame-boost-close')?.addEventListener('click', hideMidgameBoost);
    boost.querySelector('.midgame-boost-dismiss')?.addEventListener('click', hideMidgameBoost);
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
  }

  function awardQuestProgress(result) {
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

    const afterTier = resolveQuestTier(state.xp);
    const tierUp = afterTier.id !== beforeTier.id;

    saveQuestLoopState(state);
    renderQuestLoop(state);

    if (tierUp) {
      WQUI.showToast(`Tier up: ${afterTier.label}! ${afterTier.reward}.`, 3200);
    } else if (result?.won && streakIncreased && state.dailyStreak > 1) {
      WQUI.showToast(`+${xpEarned} XP · ${state.dailyStreak}-day win streak.`, 2400);
    } else if (result?.won) {
      WQUI.showToast(`+${xpEarned} XP`, 1800);
    } else {
      WQUI.showToast(`+${xpEarned} XP for effort`, 1800);
    }
  }

  function newGame() {
    if (
      getVoicePracticeMode() === 'required' &&
      !(_el('modal-overlay')?.classList.contains('hidden')) &&
      !voiceTakeComplete
    ) {
      WQUI.showToast('Record your voice before starting the next word.');
      return;
    }
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
    const focus = _el('setting-focus')?.value || prefs.focus || 'all';
    const result = WQGame.startGame({
      ...s,
      focus,
      phonics: focus
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
      syncAssessmentLockRuntime();
      return;
    }
    WQUI.calcLayout(result.wordLength, result.maxGuesses);
    WQUI.buildBoard(result.wordLength, result.maxGuesses);
    WQUI.buildKeyboard();
    WQUI.hideModal();
    _el('new-game-btn')?.classList.remove('pulse');
    _el('settings-panel')?.classList.add('hidden');
    syncHeaderControlsVisibility();
    removeDupeToast();
    updateVoicePracticePanel(WQGame.getState());
    updateFocusHint();
    syncAssessmentLockRuntime();
  }

  const reflowLayout = () => {
    const s = WQGame.getState();
    if (s?.word) WQUI.calcLayout(s.wordLength, s.maxGuesses);
  };
  window.addEventListener('resize', reflowLayout);
  window.visualViewport?.addEventListener('resize', reflowLayout);
  window.addEventListener('beforeunload', stopVoiceCaptureNow);

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
    const s = WQGame.getState();
    if (s.gameOver) return;

    if (key === 'Enter') {
      const themeAtSubmit = normalizeTheme(document.documentElement.getAttribute('data-theme'), getThemeFallback());
      const result = WQGame.submitGuess();
      if (!result) return;
      if (result.error === 'too_short') {
        WQUI.showToast('Fill in all the letters first');
        WQUI.shakeRow(s.guesses, s.wordLength);
        return;
      }

      const row = result.guesses.length - 1;
      WQUI.revealRow(result.guess, result.result, row, s.wordLength, () => {
        if (normalizeTheme(document.documentElement.getAttribute('data-theme'), getThemeFallback()) !== themeAtSubmit) {
          applyTheme(themeAtSubmit);
        }
        WQUI.updateKeyboard(result.result, result.guess);
        checkDuplicates(result);
        if (
          !result.won &&
          !result.lost &&
          !midgameBoostShown &&
          result.guesses.length === MIDGAME_BOOST_TRIGGER_GUESS
        ) {
          midgameBoostShown = true;
          showMidgameBoost();
        }
        if (result.won || result.lost) {
          awardQuestProgress(result);
          hideMidgameBoost();
          syncAssessmentLockRuntime();
          setTimeout(() => {
            WQUI.showModal(result);
            _el('new-game-btn')?.classList.add('pulse');
            const settings = WQUI.getSettings();
            if (result.won && settings.confetti){ launchConfetti(); launchStars(); }
            if (normalizeTheme(document.documentElement.getAttribute('data-theme'), getThemeFallback()) !== themeAtSubmit) {
              applyTheme(themeAtSubmit);
            }
          }, 520);
        }
      });

    } else if (key === 'Backspace' || key === '⌫') {
      WQGame.deleteLetter();
      const s2 = WQGame.getState();
      WQUI.updateCurrentRow(s2.guess, s2.wordLength, s2.guesses.length);

    } else if (/^[a-zA-Z]$/.test(key)) {
      WQGame.addLetter(key);
      const s2 = WQGame.getState();
      WQUI.updateCurrentRow(s2.guess, s2.wordLength, s2.guesses.length);
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
    if (e.ctrlKey || e.metaKey || e.altKey) return;
    const activeEl = document.activeElement;
    const shouldReleaseThemeNavFocus =
      activeEl?.id === 'wq-theme-select' &&
      (e.key === 'Enter' || e.key === 'Backspace' || /^[a-zA-Z]$/.test(e.key));
    if (shouldReleaseThemeNavFocus) {
      activeEl.blur();
      e.preventDefault();
    } else if (isEditableTarget(e.target)) {
      return;
    }
    if (document.documentElement.getAttribute('data-focus-search-open') === 'true') return;
    const nextKey = e.key === 'Backspace' ? 'Backspace' : e.key;
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
  _el('modal-overlay')?.addEventListener('pointerdown', (event) => {
    if (event.target?.id !== 'modal-overlay') return;
    newGame();
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

  function pickRandom(items) {
    if (!Array.isArray(items) || !items.length) return '';
    const index = Math.floor(Math.random() * items.length);
    return items[index];
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

  function syncRevealMeaningHighlight(nextEntry) {
    const wrap = _el('modal-meaning-highlight');
    const defEl = _el('modal-def-highlight');
    const funEl = _el('modal-fun-highlight');
    if (!wrap || !defEl || !funEl) return;

    const definition = String(nextEntry?.definition || '').trim();
    const funAddOn = shouldIncludeFunInMeaning()
      ? String(nextEntry?.fun_add_on || '').trim()
      : '';
    defEl.textContent = definition;
    funEl.textContent = funAddOn;
    funEl.classList.toggle('hidden', !funAddOn);
    wrap.classList.toggle('hidden', !(definition || funAddOn));
  }

  function getRevealFeedbackCopy(result) {
    const guessCount = Math.max(1, Number(result?.guesses?.length || 0));
    const stateMax = Number(WQGame.getState?.()?.maxGuesses || 0);
    const prefMax = Number.parseInt(_el('s-guesses')?.value || DEFAULT_PREFS.guesses, 10);
    const maxGuesses = Math.max(1, Number.isFinite(stateMax) && stateMax > 0
      ? stateMax
      : Number.isFinite(prefMax) && prefMax > 0
        ? prefMax
        : 6);

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
    await WQAudio.playDef(nextEntry);
    const hasFun = Boolean(nextEntry?.audio?.fun || nextEntry?.fun_add_on);
    if (!hasFun || !shouldIncludeFunInMeaning()) return;
    await WQAudio.playFun(nextEntry);
  }

  function promptLearnerAfterReveal(options = {}) {
    if (getVoicePracticeMode() === 'off') return;
    if (voiceTakeComplete || voiceIsRecording) return;
    const practiceDetails = _el('modal-practice-details');
    if (!practiceDetails || practiceDetails.classList.contains('hidden')) return;
    const required = getVoicePracticeMode() === 'required';
    if (required) practiceDetails.open = true;
    setVoicePracticeFeedback('Your turn: tap Start 1-sec Recording, then compare with model audio.', required ? 'warn' : 'default');
    if (options.toast && !required) {
      WQUI.showToast('Your turn: open Say It Back and record 1 second.', 2200);
    }
  }

  async function runRevealNarration(result) {
    if (!result?.entry) return;
    cancelRevealNarration();
    const token = revealNarrationToken;
    showRevealWordToast(result);
    syncRevealMeaningHighlight(result.entry);
    if (!shouldNarrateReveal()) {
      promptLearnerAfterReveal({ toast: true });
      return;
    }
    await new Promise((resolve) => setTimeout(resolve, 260));
    if (token !== revealNarrationToken) return;
    try {
      await WQAudio.playWord(result.entry);
      if (token !== revealNarrationToken) return;
      await playMeaningWithFun(result.entry);
      if (token !== revealNarrationToken) return;
      promptLearnerAfterReveal({ toast: true });
    } catch {
      if (token !== revealNarrationToken) return;
      promptLearnerAfterReveal({ toast: true });
    }
  }

  _el('g-hear-word')?.addEventListener('click', () => {
    cancelRevealNarration();
    void WQAudio.playWord(entry());
  });
  _el('g-hear-sentence')?.addEventListener('click', () => {
    cancelRevealNarration();
    void WQAudio.playSentence(entry());
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

  
  // ─── Music (WebAudio, lightweight) ──────────────────
  const WQMusic = (() => {
    let ctx = null;
    let gain = null;
    let interval = null;
    let mode = 'chill';
    let vol = 0.35;
    let resumeBound = false;

    const PLAYBACK_PRESETS = Object.freeze({
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

    const ensure = () => {
      if (ctx) return;
      ctx = new (window.AudioContext || window.webkitAudioContext)();
      gain = ctx.createGain();
      gain.gain.value = vol;
      gain.connect(ctx.destination);
      bindResumeEvents();
    };

    const resumeCtx = () => {
      if (!ctx || ctx.state !== 'suspended') return;
      ctx.resume().catch(() => {});
    };

    const bindResumeEvents = () => {
      if (resumeBound) return;
      resumeBound = true;
      ['pointerdown', 'keydown', 'touchstart'].forEach((eventName) => {
        document.addEventListener(eventName, resumeCtx, { passive: true });
      });
    };

    const beep = (freq, dur = 0.12, type = 'sine', peak = 0.12) => {
      if (!ctx || !gain) return;
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.type = type;
      o.frequency.value = freq;
      g.gain.value = 0.0001;
      o.connect(g); g.connect(gain);
      const t = ctx.currentTime;
      g.gain.exponentialRampToValueAtTime(peak, t + 0.01);
      g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      o.start(t);
      o.stop(t + dur + 0.02);
    };

    const normalizePlaybackMode = (value) => {
      const normalized = String(value || '').trim().toLowerCase();
      if (normalized === 'off') return 'off';
      return PLAYBACK_PRESETS[normalized] ? normalized : 'chill';
    };

    const start = () => {
      stop();
      if (mode === 'off') return;
      ensure();
      resumeCtx();
      const preset = PLAYBACK_PRESETS[mode] || PLAYBACK_PRESETS.chill;
      let seq = Math.random() < 0.5 ? preset.seq : (ALT_SEQS[mode] || preset.seq);
      let i = 0;
      interval = setInterval(() => {
        if (i > 0 && i % seq.length === 0) {
          seq = Math.random() < 0.5 ? preset.seq : (ALT_SEQS[mode] || preset.seq);
        }
        const f = seq[i % seq.length];
        if (f) beep(f, preset.dur, preset.wave, preset.level);
        i++;
      }, preset.tempo);
    };

    const stop = () => { if (interval) clearInterval(interval); interval = null; };

    return {
      setMode(m) {
        mode = normalizePlaybackMode(m);
        start();
      },
      setVolume(v) {
        const next = Number.isFinite(v) ? v : parseFloat(DEFAULT_PREFS.musicVol);
        vol = Math.max(0, Math.min(1, next));
        if (gain) gain.gain.value = vol;
      },
      initFromPrefs(p) {
        mode = normalizePlaybackMode(p.music || DEFAULT_PREFS.music);
        vol = parseFloat(p.musicVol ?? DEFAULT_PREFS.musicVol);
        start();
        this.setVolume(vol);
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
  newGame();

})();
