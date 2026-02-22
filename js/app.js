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

  async function registerOfflineRuntime() {
    if (!('serviceWorker' in navigator)) return;
    if (!window.isSecureContext && location.hostname !== 'localhost' && location.hostname !== '127.0.0.1') {
      return;
    }
    try {
      await navigator.serviceWorker.register('./sw.js', { scope: './' });
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
    'upbeat',
    'coffee',
    'arcade',
    'fantasy',
    'scifi',
    'sports',
    'off'
  ]);
  const MUSIC_LABELS = Object.freeze({
    auto: 'Auto',
    chill: 'Chill',
    lofi: 'Lo-fi',
    upbeat: 'Upbeat',
    coffee: 'Coffeehouse',
    arcade: '8-bit Arcade',
    fantasy: 'Fantasy',
    scifi: 'Sci-fi',
    sports: 'Sports Hype',
    off: 'Off'
  });
  const DEFAULT_PREFS = Object.freeze({
    focus: 'all',
    grade: 'all',
    length: '5',
    guesses: '6',
    caseMode: 'lower',
    hint: 'on',
    dupe: 'on',
    confetti: 'on',
    projector: 'off',
    motion: 'fun',
    feedback: 'themed',
    meaningPlusFun: 'on',
    sorNotation: 'on',
    voicePractice: 'optional',
    boostPopups: 'on',
    music: 'off',
    musicVol: '0.50',
    voice: 'recorded',
    themeSave: 'off',
    boardStyle: 'card',
    keyStyle: 'bubble',
    atmosphere: 'glow'
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
    if (prefs.atmosphere === undefined) prefs.atmosphere = DEFAULT_PREFS.atmosphere;
    if (prefs.meaningPlusFun === undefined) prefs.meaningPlusFun = DEFAULT_PREFS.meaningPlusFun;
    if (prefs.sorNotation === undefined) prefs.sorNotation = DEFAULT_PREFS.sorNotation;
    if (prefs.voicePractice === undefined) prefs.voicePractice = DEFAULT_PREFS.voicePractice;
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
  if (prefs.voicePractice === undefined) {
    prefs.voicePractice = DEFAULT_PREFS.voicePractice;
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
    sunset: 'upbeat',
    ocean: 'chill',
    superman: 'sports',
    marvel: 'sports',
    seahawks: 'sports',
    huskies: 'sports',
    ironman: 'upbeat',
    harleyquinn: 'upbeat',
    kuromi: 'lofi',
    minecraft: 'arcade',
    pokemon: 'arcade',
    barbie: 'upbeat',
    demonhunter: 'fantasy',
    dark: 'chill',
    coffee: 'coffee',
    matrix: 'scifi'
  });

  const AUTO_MUSIC_BY_FAMILY = Object.freeze({
    core: 'chill',
    sports: 'sports',
    inspired: 'upbeat',
    dark: 'lofi'
  });

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
    's-atmosphere': 'atmosphere',
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
  applyHint(prefs.hint || DEFAULT_PREFS.hint);
  applyFeedback(prefs.feedback || DEFAULT_PREFS.feedback);
  applyBoardStyle(prefs.boardStyle || DEFAULT_PREFS.boardStyle);
  applyKeyStyle(prefs.keyStyle || DEFAULT_PREFS.keyStyle);
  applyAtmosphere(prefs.atmosphere || DEFAULT_PREFS.atmosphere);
  WQUI.setCaseMode(prefs.caseMode || DEFAULT_PREFS.caseMode);

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

  function applyFeedback(mode) {
    const normalized = mode === 'classic' ? 'classic' : 'themed';
    document.documentElement.setAttribute('data-feedback', normalized);
    const select = _el('s-feedback');
    if (select && select.value !== normalized) select.value = normalized;
  }

  function applyBoardStyle(mode) {
    const allowed = new Set(['clean', 'card', 'patterned']);
    const normalized = allowed.has(mode) ? mode : DEFAULT_PREFS.boardStyle;
    document.documentElement.setAttribute('data-board-style', normalized);
    const select = _el('s-board-style');
    if (select && select.value !== normalized) select.value = normalized;
    return normalized;
  }

  function applyKeyStyle(mode) {
    const allowed = new Set(['bubble', 'classic', 'arcade']);
    const normalized = allowed.has(mode) ? mode : DEFAULT_PREFS.keyStyle;
    document.documentElement.setAttribute('data-key-style', normalized);
    const select = _el('s-key-style');
    if (select && select.value !== normalized) select.value = normalized;
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

  function populateVoiceSelector() {
    // Voice selection is handled by WQAudio internals
    // This can be expanded if you want a dropdown UI later
  }

  // ─── 5. Settings panel wiring ───────────────────────
  _el('settings-btn')?.addEventListener('click', () => {
    _el('settings-panel')?.classList.toggle('hidden');
  });
  _el('settings-close')?.addEventListener('click', () => {
    _el('settings-panel')?.classList.add('hidden');
  });

  
  // Voice help modal
  const openVoiceHelp = () => {
    _el('settings-panel')?.classList.add('hidden');
    _el('voice-help-modal')?.classList.remove('hidden');
  };
  const closeVoiceHelp = () => _el('voice-help-modal')?.classList.add('hidden');
  _el('voice-help-btn')?.addEventListener('click', openVoiceHelp);
  _el('voice-help-close')?.addEventListener('click', closeVoiceHelp);
  _el('voice-help-modal')?.addEventListener('click', e => { if (e.target.id === 'voice-help-modal') closeVoiceHelp(); });
// Close settings when clicking outside
  document.addEventListener('pointerdown', e => {
    const panel = _el('settings-panel');
    if (!panel?.classList.contains('hidden') &&
        !panel.contains(e.target) &&
        e.target !== _el('settings-btn') &&
        !_el('settings-btn')?.contains(e.target)) {
      panel.classList.add('hidden');
    }
  });

  _el('s-theme')?.addEventListener('change', e => {
    const normalized = applyTheme(e.target.value);
    if (shouldPersistTheme()) {
      setPref('theme', normalized);
    }
    _el('settings-panel')?.classList.add('hidden');
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
  _el('s-board-style')?.addEventListener('change', e => {
    setPref('boardStyle', applyBoardStyle(e.target.value));
  });
  _el('s-key-style')?.addEventListener('change', e => {
    setPref('keyStyle', applyKeyStyle(e.target.value));
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
  _el('s-hint')?.addEventListener('change',    e => { setPref('hint',   e.target.value); applyHint(e.target.value); updateFocusHint(); });
  _el('s-dupe')?.addEventListener('change',    e => setPref('dupe',     e.target.value));
  _el('s-confetti')?.addEventListener('change',e => setPref('confetti', e.target.value));
  _el('s-feedback')?.addEventListener('change', e => {
    applyFeedback(e.target.value);
    setPref('feedback', e.target.value);
    WQUI.showToast(e.target.value === 'themed'
      ? 'Themed feedback enabled. Meaning stays correct/present/absent.'
      : 'Classic feedback enabled. Green/yellow/gray meanings restored.'
    );
  });
  _el('s-meaning-fun-link')?.addEventListener('change', e => {
    const enabled = !!e.target.checked;
    setPref('meaningPlusFun', enabled ? 'on' : 'off');
    WQUI.showToast(enabled
      ? 'Extended definition add-on is on.'
      : 'Extended definition add-on is off.'
    );
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
    }
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
    WQAudio.setVoiceMode(e.target.value);
    setPref('voice', e.target.value);
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
  let voicePreviewAudio = null;
  let voiceAnalyser = null;
  let voiceAudioCtx = null;
  let voiceWaveRaf = 0;
  let voiceIsRecording = false;
  let voiceAutoStopTimer = 0;
  const VOICE_PRIVACY_TOAST_KEY = 'wq_voice_privacy_toast_seen_v1';
  const VOICE_MAX_RECORD_MS = 9000;

  function setVoiceRecordingUI(isRecording) {
    const recordBtn = _el('voice-record-btn');
    const stopBtn = _el('voice-stop-btn');
    if (recordBtn) {
      recordBtn.disabled = !!isRecording;
      recordBtn.classList.toggle('is-recording', !!isRecording);
      recordBtn.textContent = isRecording ? 'Recording…' : 'Start Recording';
    }
    if (stopBtn) {
      stopBtn.disabled = !isRecording;
    }
  }

  function clearVoiceClip() {
    if (voiceClipUrl) {
      URL.revokeObjectURL(voiceClipUrl);
      voiceClipUrl = null;
    }
    const playBtn = _el('voice-play-btn');
    if (playBtn) playBtn.disabled = true;
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

  function setVoicePracticeFeedback(message, isError = false) {
    const feedback = _el('voice-practice-feedback');
    if (!feedback) return;
    feedback.textContent = message || '';
    feedback.classList.toggle('is-error', !!isError);
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
    const target = _el('voice-practice-target');
    const playAgain = _el('play-again-btn');
    const mode = getVoicePracticeMode();
    const word = String(state?.word || '').toUpperCase();

    if (target) target.textContent = word ? `Target: ${word}` : '';
    if (!panel) return;

    if (mode === 'off') {
      if (voiceIsRecording) stopVoiceCaptureNow();
      panel.classList.add('hidden');
      if (playAgain) {
        playAgain.disabled = false;
        playAgain.removeAttribute('aria-disabled');
      }
      return;
    }

    panel.classList.remove('hidden');
    if (mode === 'required' && !voiceTakeComplete) {
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
      setVoicePracticeFeedback('Record your voice, then compare it with the model audio.');
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
        voiceClipUrl = URL.createObjectURL(blob);
        voiceTakeComplete = true;
        const playBtn = _el('voice-play-btn');
        if (playBtn) playBtn.disabled = false;
        setVoicePracticeFeedback('Nice! Play your recording and compare your pronunciation.');
        updateVoicePracticePanel(WQGame.getState());
      });
      voiceIsRecording = true;
      setVoiceRecordingUI(true);
      setVoicePracticeFeedback('Recording... press Stop when you are done.');
      if (localStorage.getItem(VOICE_PRIVACY_TOAST_KEY) !== 'seen') {
        WQUI.showToast('Voice recordings stay on this device only. Nothing is uploaded.');
        localStorage.setItem(VOICE_PRIVACY_TOAST_KEY, 'seen');
      }
      clearVoiceAutoStopTimer();
      voiceAutoStopTimer = setTimeout(() => {
        if (voiceRecorder && voiceRecorder.state === 'recording') {
          setVoicePracticeFeedback('Auto-stopped after 9 seconds to protect privacy.');
          stopVoiceRecording();
        }
      }, VOICE_MAX_RECORD_MS);

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

  function stopVoiceRecording() {
    clearVoiceAutoStopTimer();
    if (voiceRecorder && voiceRecorder.state !== 'inactive') {
      voiceRecorder.stop();
      setVoicePracticeFeedback('Saving your recording...');
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

  function bindVoicePracticeControls() {
    if (document.body.dataset.wqVoicePracticeBound === '1') return;
    _el('voice-record-btn')?.addEventListener('click', () => { void startVoiceRecording(); });
    _el('voice-stop-btn')?.addEventListener('click', () => stopVoiceRecording());
    _el('voice-play-btn')?.addEventListener('click', () => playVoiceRecording());
    document.body.dataset.wqVoicePracticeBound = '1';
    setVoiceRecordingUI(false);
    drawWaveform();
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
      const details = _el('modal-more-details');
      if (details) details.open = false;
      updateVoicePracticePanel(state);
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

      const keyH = parsePx(rootStyle.getPropertyValue('--key-h'), 52);
      const keyGap = parsePx(rootStyle.getPropertyValue('--gap-key'), 8);
      const tileGap = parsePx(rootStyle.getPropertyValue('--gap-tile'), 5);
      const mainStyle = mainEl ? getComputedStyle(mainEl) : null;
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
      const viewportW = Math.min(window.innerWidth, 560);
      const kbRows = 3;
      const kbH = kbRows * keyH + (kbRows - 1) * keyGap + 8;

      const reservedH = headerH + focusH + themeH + mainPadTop + mainPadBottom + audioH + kbH + boardZoneGap + 20;
      const availableBoardH = Math.max(140, viewportH - reservedH);
      const byHeight = Math.floor((availableBoardH - platePadY - tileGap * (maxGuesses - 1)) / maxGuesses);

      const mainInnerW = (mainEl?.clientWidth || viewportW) - parsePx(mainStyle?.paddingLeft, 12) - parsePx(mainStyle?.paddingRight, 12);
      const availableBoardW = Math.max(220, mainInnerW);
      const byWidth = Math.floor((availableBoardW - platePadX - tileGap * (wordLength - 1)) / wordLength);

      const size = Math.max(30, Math.min(byHeight, byWidth, 64));
      const boardWidth = wordLength * size + (wordLength - 1) * tileGap;
      const playfieldW = Math.ceil(boardWidth);

      const adaptiveKeyH = Math.max(42, Math.min(58, Math.round(size * 0.95)));
      let adaptiveKeyMinW = Math.max(30, Math.min(42, Math.round(size * 0.66)));
      let adaptiveKeyGap = Math.max(7, Math.min(11, Math.round(size * 0.18)));
      const maxKeyboardW = Math.max(260, Math.min(window.innerWidth - 20, mainInnerW + 84));
      const estimateKeyboardW = () => (adaptiveKeyMinW * 10) + (adaptiveKeyGap * 9);
      while (estimateKeyboardW() > maxKeyboardW && adaptiveKeyMinW > 24) {
        adaptiveKeyMinW -= 1;
        if (adaptiveKeyGap > 6) adaptiveKeyGap -= 0.2;
      }

      document.documentElement.style.setProperty('--tile-size', `${size}px`);
      document.documentElement.style.setProperty('--playfield-width', `${playfieldW}px`);
      document.documentElement.style.setProperty('--key-h', `${adaptiveKeyH}px`);
      document.documentElement.style.setProperty('--key-min-w', `${adaptiveKeyMinW}px`);
      document.documentElement.style.setProperty('--gap-key', `${Math.max(6, adaptiveKeyGap).toFixed(1)}px`);
      document.documentElement.style.setProperty('--keyboard-max-width', `${Math.ceil(maxKeyboardW)}px`);

      if (keyboardEl && keyboardEl.offsetWidth > maxKeyboardW) {
        document.documentElement.style.setProperty('--key-min-w', `${Math.max(24, adaptiveKeyMinW - 3)}px`);
      }

      return { size, playfieldW };
    };

    WQUI.__layoutPatchApplied = true;
  }
  installRevealModalPatch();
  installResponsiveLayoutPatch();

  // ─── 6. Focus + grade alignment ─────────────────────
  const SUBJECT_FOCUS_GRADE = Object.freeze({
    k2: 'K-2',
    '35': 'G3-5',
    '68': 'G6-8',
    '912': 'G9-12'
  });

  const FOCUS_HINTS = {
    all: 'Classic mode · defaults to 5 letters and 6 guesses',
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
    const focusVal = _el('setting-focus')?.value || 'all';
    const showHint = _el('s-hint')?.value === 'on';
    if (!hintEl) return;
    if (showHint && FOCUS_HINTS[focusVal]) {
      hintEl.textContent = FOCUS_HINTS[focusVal];
      hintEl.classList.remove('hidden');
    } else {
      hintEl.classList.add('hidden');
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
        .map((tag) => tag.trim().toLowerCase())
        .filter(Boolean);
      if (!tags.length) return;
      const prior = subjectTagsByWord.get(word) || [];
      subjectTagsByWord.set(word, Array.from(new Set([...prior, ...tags])));
    });
  }

  function matchesSubjectFocus(word, subject) {
    const tags = subjectTagsByWord.get(word) || [];
    if (!tags.length) return false;
    if (subject === 'math') return tags.some((tag) => tag.includes('math'));
    if (subject === 'science') return tags.some((tag) => tag.includes('science') || tag.includes('biology'));
    if (subject === 'social') return tags.some((tag) => tag.startsWith('ss') || tag.includes('history') || tag.includes('civics') || tag.includes('govt'));
    if (subject === 'ela') return tags.some((tag) => tag.includes('ela') || tag.includes('literacy') || tag.includes('writing') || tag.includes('reading'));
    return false;
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
  });

  syncGradeFromFocus(_el('setting-focus')?.value || prefs.focus || 'all', { silent: true });
  updateFocusHint();
  updateFocusGradeNote();

  // ─── 7. New game ────────────────────────────────────
  let feedbackModeToastShown = false;
  function maybeShowFeedbackModeToast() {
    const mode = document.documentElement.getAttribute('data-feedback') || DEFAULT_PREFS.feedback;
    if (feedbackModeToastShown) return;
    feedbackModeToastShown = true;
    WQUI.showToast(
      mode === 'themed'
        ? 'Themed feedback uses classic meaning: correct, present, absent.'
        : 'Classic feedback: green = correct, yellow = present, gray = absent.',
      2600
    );
  }

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
  let midgameBoostTimer = 0;

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
    if (midgameBoostTimer) {
      clearTimeout(midgameBoostTimer);
      midgameBoostTimer = 0;
    }
    boost.classList.remove('is-visible');
    if (!boost.classList.contains('hidden')) {
      setTimeout(() => boost.classList.add('hidden'), 180);
    }
  }

  function showMidgameBoost() {
    if (!areBoostPopupsEnabled()) return;
    const boost = _el('midgame-boost');
    if (!boost) return;
    const card = nextMidgameBoostCard();
    if (!card) return;
    const label =
      card.type === 'joke' ? 'Joke Break' :
      card.type === 'quote' ? 'Quick Quote' :
      'Fun Fact';
    boost.innerHTML = `<span class=\"midgame-boost-tag\">${label}</span><p>${card.text}</p>`;
    boost.classList.remove('hidden');
    requestAnimationFrame(() => boost.classList.add('is-visible'));
    midgameBoostTimer = setTimeout(() => {
      boost.classList.remove('is-visible');
      setTimeout(() => boost.classList.add('hidden'), 180);
    }, 7600);
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
      WQUI.showToast('No words found — try Classic focus or adjust filters');
      return;
    }
    WQUI.calcLayout(result.wordLength, result.maxGuesses);
    WQUI.buildBoard(result.wordLength, result.maxGuesses);
    WQUI.buildKeyboard();
    WQUI.hideModal();
    _el('new-game-btn')?.classList.remove('pulse');
    _el('settings-panel')?.classList.add('hidden');
    updateFocusHint();
    removeDupeToast();
    updateVoicePracticePanel(WQGame.getState());
    setTimeout(maybeShowFeedbackModeToast, 160);
  }

  const reflowLayout = () => {
    const s = WQGame.getState();
    if (s?.word) WQUI.calcLayout(s.wordLength, s.maxGuesses);
  };
  window.addEventListener('resize', reflowLayout);
  window.visualViewport?.addEventListener('resize', reflowLayout);
  window.addEventListener('beforeunload', stopVoiceCaptureNow);

  // ─── 8. Input handling ──────────────────────────────
  function handleKey(key) {
    const s = WQGame.getState();
    if (s.gameOver) return;

    if (key === 'Enter') {
      const result = WQGame.submitGuess();
      if (!result) return;
      if (result.error === 'too_short') {
        WQUI.showToast('Fill in all the letters first');
        WQUI.shakeRow(s.guesses, s.wordLength);
        return;
      }

      const row = result.guesses.length - 1;
      WQUI.revealRow(result.guess, result.result, row, s.wordLength, () => {
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
          hideMidgameBoost();
          setTimeout(() => {
            WQUI.showModal(result);
            _el('new-game-btn')?.classList.add('pulse');
            const settings = WQUI.getSettings();
            if (result.won && settings.confetti){ launchConfetti(); launchStars(); }
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

  // Physical keyboard
  document.addEventListener('keydown', e => {
    if (e.ctrlKey || e.metaKey || e.altKey) return;
    handleKey(e.key === 'Backspace' ? 'Backspace' : e.key);
    if (/^[a-zA-Z]$/.test(e.key)) {
      const btn = document.querySelector(`.key[data-key="${e.key.toLowerCase()}"]`);
      if (btn) { btn.classList.add('wq-press'); setTimeout(() => btn.classList.remove('wq-press'), 220); }
    }
  });

  // On-screen keyboard
  _el('keyboard')?.addEventListener('click', e => {
    const btn = e.target.closest('.key');
    if (btn){ btn.classList.add('wq-press'); setTimeout(()=>btn.classList.remove('wq-press'),220); handleKey(btn.dataset.key);} 
  });

  // Buttons
  _el('new-game-btn')?.addEventListener('click',  newGame);
  _el('play-again-btn')?.addEventListener('click', newGame);

  // ─── 9. Gameplay audio buttons ──────────────────────
  const entry = () => WQGame.getState()?.entry;
  const shouldIncludeFunInMeaning = () => {
    const toggle = _el('s-meaning-fun-link');
    if (toggle) return !!toggle.checked;
    return (prefs.meaningPlusFun || DEFAULT_PREFS.meaningPlusFun) === 'on';
  };

  async function playMeaningWithFun(nextEntry) {
    if (!nextEntry) return;
    await WQAudio.playDef(nextEntry);
    const hasFun = Boolean(nextEntry?.audio?.fun || nextEntry?.fun_add_on);
    if (!hasFun || !shouldIncludeFunInMeaning()) return;
    await WQAudio.playFun(nextEntry);
  }

  _el('g-hear-word')?.addEventListener('click',     () => WQAudio.playWord(entry()));
  _el('g-hear-sentence')?.addEventListener('click', () => WQAudio.playSentence(entry()));

  // Modal audio buttons
  _el('hear-word-btn')?.addEventListener('click',     () => WQAudio.playWord(entry()));
  _el('hear-def-btn')?.addEventListener('click',      () => { void playMeaningWithFun(entry()); });
  _el('hear-sentence-btn')?.addEventListener('click', () => WQAudio.playSentence(entry()));

  // ─── 10. Duplicate-letter dismissible toast ──────────
  const DUPE_PREF_KEY = 'wq_v2_dupe_dismissed';
  let _dupeToastEl = null;

  function removeDupeToast() {
    if (_dupeToastEl) { _dupeToastEl.remove(); _dupeToastEl = null; }
  }

  function checkDuplicates(result) {
    // Check if user has disabled this
    if (_el('s-dupe')?.value === 'off') return;
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
      sports:  Object.freeze({ seq: [392, 392, 523, 392, 659, 523, 784, 659], tempo: 240, dur: 0.1, wave: 'square', level: 0.13 })
    });
    const ALT_SEQS = Object.freeze({
      chill:   [220, 0, 247, 0, 262, 0, 247, 0],
      lofi:    [196, 0, 220, 0, 247, 0, 196, 0],
      upbeat:  [440, 523, 659, 587, 523, 440, 392, 440],
      coffee:  [220, 262, 330, 262, 247, 294, 349, 294],
      arcade:  [659, 784, 988, 784, 659, 523, 659, 784],
      fantasy: [294, 370, 440, 370, 494, 440, 370, 294],
      scifi:   [660, 0, 990, 0, 770, 0, 1120, 0],
      sports:  [440, 440, 587, 440, 698, 587, 880, 698]
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
  WQAudio.setVoiceMode(prefs.voice || 'recorded');
  if (typeof WQAudio.primeAudioManifest === 'function') {
    void WQAudio.primeAudioManifest();
  }
  musicController = WQMusic;
  WQMusic.initFromPrefs(prefs);
  syncMusicForTheme();
  newGame();

})();
