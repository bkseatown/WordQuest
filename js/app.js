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

  const SW_RUNTIME_URL = './sw-runtime.js';

  async function registerOfflineRuntime() {
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
  const PREF_MUSIC_AUTO_MIGRATION_KEY = 'wq_v2_pref_music_auto_20260222';
  const FIRST_RUN_SETUP_KEY = 'wq_v2_first_run_setup_v1';
  const SESSION_SUMMARY_KEY = 'wq_v2_teacher_session_summary_v1';
  const ROSTER_STATE_KEY = 'wq_v2_teacher_roster_v1';
  const PROBE_HISTORY_KEY = 'wq_v2_weekly_probe_history_v1';
  const STUDENT_GOALS_KEY = 'wq_v2_student_goals_v1';
  const PLAYLIST_STATE_KEY = 'wq_v2_assignment_playlists_v1';
  const SHUFFLE_BAG_KEY = 'wq_v2_shuffle_bag';
  const REVIEW_QUEUE_KEY = 'wq_v2_spaced_review_queue_v1';
  const PAGE_MODE_KEY = 'wq_v2_page_mode_v1';
  const LAST_NON_OFF_MUSIC_KEY = 'wq_v2_last_non_off_music_v1';
  const MISSION_LAB_ENABLED = false;
  const REVIEW_QUEUE_MAX_ITEMS = 36;
  const ALLOWED_MUSIC_MODES = new Set([
    'auto',
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

  function detectPreferredKeyboardLayout() {
    const touchPoints = Number(navigator.maxTouchPoints || 0);
    let hasCoarsePointer = false;
    let hasFinePointer = false;
    let canHover = false;
    try { hasCoarsePointer = window.matchMedia('(pointer: coarse)').matches; } catch {}
    try { hasFinePointer = window.matchMedia('(pointer: fine)').matches; } catch {}
    try { canHover = window.matchMedia('(hover: hover)').matches; } catch {}
    const touchOnlyDevice = touchPoints > 0 && hasCoarsePointer && !hasFinePointer && !canHover;
    return touchOnlyDevice ? 'wilson' : 'standard';
  }

  const preferredInitialKeyboardLayout = detectPreferredKeyboardLayout();

  function loadPrefs() {
    try { return JSON.parse(localStorage.getItem(PREF_KEY) || '{}'); } catch { return {}; }
  }
  function savePrefs(p) {
    try { localStorage.setItem(PREF_KEY, JSON.stringify(p)); } catch {}
  }
  const prefs = loadPrefs();
  function setPref(k, v) { prefs[k] = v; savePrefs(prefs); }
  let autoPhysicalKeyboardSwitchApplied = false;
  let firstRunSetupPending = false;
  let pageMode = 'wordquest';

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
      prefs.boardStyle = prefs.keyboardLayout === 'wilson' ? 'soundcard' : DEFAULT_PREFS.boardStyle;
    }
    if (prefs.keyStyle === undefined) {
      prefs.keyStyle = prefs.keyboardLayout === 'wilson' ? 'soundcard' : DEFAULT_PREFS.keyStyle;
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
    Object.entries(startupDefaults).forEach(([key, value]) => {
      if (prefs[key] === value) return;
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
  const ThemeRegistry = window.WQThemeRegistry || null;
  const shouldPersistTheme = () => (prefs.themeSave || DEFAULT_PREFS.themeSave) === 'on';
  let musicController = null;
  let challengeSprintTimer = 0;

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

  async function runAutoCacheRepairForBuild() {
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
      label: 'UFLI Foundations',
      targets: Object.freeze([
        Object.freeze({ id: 'ufli-l1-cvc', label: 'UFLI Lessons 1-8 · CVC and short vowels', focus: 'cvc', gradeBand: 'K-2', length: '3', pacing: 'Weeks 1-4 (Aug-Sep)' }),
        Object.freeze({ id: 'ufli-l2-digraph', label: 'UFLI Lessons 9-24 · Digraphs and blends', focus: 'digraph', gradeBand: 'K-2', length: '4', pacing: 'Weeks 5-11 (Oct-Nov)' }),
        Object.freeze({ id: 'ufli-l3-cvce', label: 'UFLI Lessons 25-34 · Magic E (CVCe)', focus: 'cvce', gradeBand: 'K-2', length: '4', pacing: 'Weeks 12-15 (Dec)' }),
        Object.freeze({ id: 'ufli-l4-vowel-team', label: 'UFLI Lessons 35-52 · Vowel teams', focus: 'vowel_team', gradeBand: 'K-2', length: '5', pacing: 'Weeks 16-23 (Jan-Feb)' }),
        Object.freeze({ id: 'ufli-l5-r-controlled', label: 'UFLI Lessons 53-64 · R-controlled vowels', focus: 'r_controlled', gradeBand: 'K-2', length: '5', pacing: 'Weeks 24-29 (Mar-Apr)' }),
        Object.freeze({ id: 'ufli-l6-syllable', label: 'UFLI Lessons 65+ · Syllable and affix transfer', focus: 'multisyllable', gradeBand: 'G3-5', length: '6', pacing: 'Weeks 30-36 (May-Jun)' })
      ])
    }),
    fundations: Object.freeze({
      label: 'Fundations',
      targets: Object.freeze([
        Object.freeze({ id: 'fund-l1-u1', label: 'Fundations Level 1 · Unit 1-4 (CVC)', focus: 'cvc', gradeBand: 'K-2', length: '3', pacing: 'Weeks 1-8 (Sep-Oct)' }),
        Object.freeze({ id: 'fund-l1-u2', label: 'Fundations Level 1 · Unit 5-8 (digraph/blend)', focus: 'digraph', gradeBand: 'K-2', length: '4', pacing: 'Weeks 9-16 (Nov-Jan)' }),
        Object.freeze({ id: 'fund-l1-u3', label: 'Fundations Level 1 · Unit 9-14 (welded sounds)', focus: 'welded', gradeBand: 'K-2', length: '5', pacing: 'Weeks 17-36 (Feb-Jun)' }),
        Object.freeze({ id: 'fund-l2-u1', label: 'Fundations Level 2 · Unit 1-6 (silent e / r-controlled)', focus: 'r_controlled', gradeBand: 'G3-5', length: '5', pacing: 'Weeks 1-12 (Sep-Nov)' }),
        Object.freeze({ id: 'fund-l2-u2', label: 'Fundations Level 2 · Unit 7-11 (vowel teams)', focus: 'vowel_team', gradeBand: 'G3-5', length: '6', pacing: 'Weeks 13-22 (Dec-Feb)' }),
        Object.freeze({ id: 'fund-l2-u3', label: 'Fundations Level 2 · Unit 12-17 (suffixes)', focus: 'suffix', gradeBand: 'G3-5', length: '6', pacing: 'Weeks 23-36 (Mar-Jun)' }),
        Object.freeze({ id: 'fund-l3-u1', label: 'Fundations Level 3 · Unit 1-4 (syllable division)', focus: 'multisyllable', gradeBand: 'G6-8', length: '7', pacing: 'Weeks 1-11 (Sep-Nov)' }),
        Object.freeze({ id: 'fund-l3-u2', label: 'Fundations Level 3 · Unit 5-8 (prefixes)', focus: 'prefix', gradeBand: 'G6-8', length: '7', pacing: 'Weeks 12-23 (Dec-Mar)' }),
        Object.freeze({ id: 'fund-l3-u3', label: 'Fundations Level 3 · Unit 9+ (suffix/root transfer)', focus: 'suffix', gradeBand: 'G6-8', length: '7', pacing: 'Weeks 24-36 (Apr-Jun)' })
      ])
    }),
    wilson: Object.freeze({
      label: 'Wilson Reading',
      targets: Object.freeze([
        Object.freeze({ id: 'wilson-step-1', label: 'Wilson Step 1 · Closed syllable', focus: 'cvc', gradeBand: 'G3-5', length: '4', pacing: 'Weeks 1-3 (Sep)' }),
        Object.freeze({ id: 'wilson-step-2', label: 'Wilson Step 2 · Welded sounds', focus: 'welded', gradeBand: 'G3-5', length: '5', pacing: 'Weeks 4-7 (Sep-Oct)' }),
        Object.freeze({ id: 'wilson-step-3', label: 'Wilson Step 3 · Silent E', focus: 'cvce', gradeBand: 'G3-5', length: '5', pacing: 'Weeks 8-11 (Oct-Nov)' }),
        Object.freeze({ id: 'wilson-step-4', label: 'Wilson Step 4 · R-controlled syllables', focus: 'r_controlled', gradeBand: 'G3-5', length: '6', pacing: 'Weeks 12-15 (Dec)' }),
        Object.freeze({ id: 'wilson-step-5', label: 'Wilson Step 5 · Vowel teams', focus: 'vowel_team', gradeBand: 'G3-5', length: '6', pacing: 'Weeks 16-20 (Jan-Feb)' }),
        Object.freeze({ id: 'wilson-step-6', label: 'Wilson Step 6 · Syllable types', focus: 'multisyllable', gradeBand: 'G6-8', length: '7', pacing: 'Weeks 21-25 (Mar)' }),
        Object.freeze({ id: 'wilson-step-7', label: 'Wilson Step 7 · Advanced multisyllable', focus: 'multisyllable', gradeBand: 'G6-8', length: '8', pacing: 'Weeks 26-29 (Apr)' }),
        Object.freeze({ id: 'wilson-step-8', label: 'Wilson Step 8 · Prefixes', focus: 'prefix', gradeBand: 'G6-8', length: '7', pacing: 'Weeks 30-32 (May)' }),
        Object.freeze({ id: 'wilson-step-9', label: 'Wilson Step 9 · Suffixes', focus: 'suffix', gradeBand: 'G6-8', length: '7', pacing: 'Weeks 33-35 (May-Jun)' }),
        Object.freeze({ id: 'wilson-step-10', label: 'Wilson Step 10+ · Morphology transfer', focus: 'vocab-ela-68', gradeBand: 'G6-8', length: 'any', pacing: 'Weeks 36+ (Jun and summer bridge)' })
      ])
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
  const CURRICULUM_PACK_ORDER = Object.freeze(['ufli', 'fundations', 'wilson', 'justwords']);

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
    toggleBtn.title = isOn ? `Pause music (${activeLabel}).` : 'Play music.';
    [prevBtn, nextBtn, shuffleBtn].forEach((btn) => {
      if (!btn) return;
      btn.classList.toggle('is-on', isOn);
    });
    if (prevBtn) prevBtn.title = `Previous vibe (now ${activeLabel}).`;
    if (nextBtn) nextBtn.title = `Next vibe (now ${activeLabel}).`;
    if (shuffleBtn) shuffleBtn.title = `Shuffle vibe (now ${activeLabel}).`;
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
    const teacherMsg = _el('teacher-studio-msg');
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
    if (teacherMsg) teacherMsg.textContent = message;
    WQUI.showToast(message);
  }

  function clearLocalMusicFiles() {
    const msgEl = _el('s-music-upload-msg');
    const teacherMsg = _el('teacher-studio-msg');
    if (musicController && typeof musicController.clearCustomFiles === 'function') {
      musicController.clearCustomFiles();
    }
    syncMusicForTheme({ toast: false });
    if (msgEl) msgEl.textContent = 'Local MP3 list cleared.';
    if (teacherMsg) teacherMsg.textContent = 'Local MP3 list cleared.';
    WQUI.showToast('Local MP3 list cleared.');
  }

  function syncMusicForTheme(options = {}) {
    const selected = normalizeMusicMode(_el('s-music')?.value || prefs.music || DEFAULT_PREFS.music);
    const activeTheme = normalizeTheme(document.documentElement.getAttribute('data-theme'), getThemeFallback());
    const effective = selected === 'auto' ? resolveAutoMusicMode(activeTheme) : selected;
    if (musicController) musicController.setMode(effective);
    updateMusicStatus(selected, effective);
    if (options.toast) {
      const label = MUSIC_LABELS[effective] || effective;
      WQUI.showToast(selected === 'auto' ? `Music auto: ${label}.` : `Music: ${label}.`);
    }
  }

  // Apply saved values to selects
  const PREF_SELECTS = {
    'setting-focus': 'focus',
    's-lesson-pack': 'lessonPack',
    'm-lesson-pack': 'lessonPack',
    's-theme-save': 'themeSave',
    's-board-style': 'boardStyle',
    's-key-style': 'keyStyle',
    's-chunk-tabs': 'chunkTabs',
    's-atmosphere': 'atmosphere',
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
  void runAutoCacheRepairForBuild();

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
  applyPlayStyle(prefs.playStyle || DEFAULT_PREFS.playStyle, { persist: false });
  applyRevealFocusMode(prefs.revealFocus || DEFAULT_PREFS.revealFocus, { persist: false });
  applyFeedback(prefs.feedback || DEFAULT_PREFS.feedback);
  applyBoardStyle(prefs.boardStyle || DEFAULT_PREFS.boardStyle);
  applyKeyStyle(prefs.keyStyle || DEFAULT_PREFS.keyStyle);
  applyKeyboardLayout(prefs.keyboardLayout || DEFAULT_PREFS.keyboardLayout);
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
    document.documentElement.setAttribute('data-theme', normalized);
    document.documentElement.setAttribute('data-theme-family', getThemeFamily(normalized));
    const select = _el('s-theme');
    if (select && select.value !== normalized) select.value = normalized;
    syncSettingsThemeName(normalized);
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
    toggle.textContent = 'Clue';
    toggle.setAttribute('aria-pressed', 'false');
    toggle.setAttribute('title', enabled
      ? 'Ask for a mystery clue with phonics markings'
      : 'Hint cues are off in settings, but you can still ask for a clue');
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
    toggle.textContent = listening ? 'Mode: Listening' : 'Mode: Detective';
    toggle.setAttribute('aria-pressed', listening ? 'true' : 'false');
    toggle.classList.toggle('is-listening', listening);
    toggle.setAttribute('title', listening
      ? 'Switch to detective mode'
      : 'Switch to listening mode');
  }

  function syncGameplayAudioStrip(mode = normalizePlayStyle(_el('s-play-style')?.value || prefs.playStyle || DEFAULT_PREFS.playStyle)) {
    const gameplayAudio = document.querySelector('.gameplay-audio');
    const sentenceBtn = _el('g-hear-sentence');
    if (sentenceBtn) sentenceBtn.remove();
    if (!gameplayAudio) return;
    const listeningMode = mode === 'listening' && !isMissionLabStandaloneMode();
    gameplayAudio.classList.toggle('hidden', !listeningMode);
    gameplayAudio.setAttribute('aria-hidden', listeningMode ? 'false' : 'true');
  }

  function applyPlayStyle(mode, options = {}) {
    const normalized = normalizePlayStyle(mode);
    document.documentElement.setAttribute('data-play-style', normalized);
    const select = _el('s-play-style');
    if (select && select.value !== normalized) select.value = normalized;
    syncPlayStyleToggleUI(normalized);
    syncGameplayAudioStrip(normalized);
    if (options.persist !== false) setPref('playStyle', normalized);
    updateNextActionLine();
    return normalized;
  }

  function isAnyOverlayModalOpen() {
    const revealOpen = !_el('modal-overlay')?.classList.contains('hidden');
    const missionOpen = !_el('challenge-modal')?.classList.contains('hidden');
    const setupOpen = !_el('first-run-setup-modal')?.classList.contains('hidden');
    return !!(revealOpen || missionOpen || setupOpen);
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
    const focusText = sourceLabel ? `We are practicing ${sourceLabel}. ` : '';
    const ruleByCategory = Object.freeze({
      cvc: 'Say each sound in order: first, middle, last.',
      digraph: 'Look for two letters that make one sound.',
      trigraph: 'Watch for a three-letter sound team.',
      cvce: 'Look for a magic e at the end changing the vowel sound.',
      vowel_team: 'Look for two vowels teaming up in the word.',
      r_controlled: 'Look for a vowel with r that changes the vowel sound.',
      diphthong: 'Watch for a sliding vowel sound like oi/oy or ou/ow.',
      welded: 'Look for a welded chunk like -ang or -ing.',
      floss: 'Listen for a short vowel before double ff/ll/ss/zz.',
      prefix: 'Spot the beginning chunk first, then read the base word.',
      suffix: 'Find the ending chunk, then blend the whole word.',
      multisyllable: 'Split into chunks, read each chunk, then blend.',
      compound: 'Find the two smaller words and join them.',
      subject: 'Use the sentence clue first, then map the sounds to spell.',
      general: 'Use one sound clue at a time, then adjust with tile colors.'
    });
    const rule = ruleByCategory[category] || ruleByCategory.general;
    return `${focusText}${rule} Try one guess, then use color feedback to coach the next one.`;
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
    const message = buildFriendlyHintMessage(category, sourceLabel);
    const playStyle = normalizePlayStyle(_el('s-play-style')?.value || prefs.playStyle || DEFAULT_PREFS.playStyle);
    const actionMode = playStyle === 'detective' && !!entry?.sentence
      ? 'sentence'
      : playStyle === 'listening' && !!entry
        ? 'word-meaning'
        : 'none';
    return {
      title: '🔎 Clue Coach',
      message,
      examples,
      actionMode
    };
  }

  function renderHintExamples(examples) {
    const wrap = _el('hint-clue-examples');
    if (!wrap) return;
    wrap.innerHTML = '';
    const rows = Array.isArray(examples) ? examples.slice(0, 3) : [];
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
    const sentenceBtn = _el('hint-clue-sentence-btn');
    if (sentenceBtn) {
      const actionMode = String(normalized.actionMode || '').trim().toLowerCase();
      const showAction = actionMode === 'sentence' || actionMode === 'word-meaning';
      sentenceBtn.dataset.mode = actionMode || 'none';
      sentenceBtn.textContent = actionMode === 'word-meaning' ? 'Hear Word + Meaning' : 'Hear Sentence';
      sentenceBtn.classList.toggle('hidden', !showAction);
    }
    clearInformantHintHideTimer();
    card.classList.remove('hidden');
    requestAnimationFrame(() => {
      card.classList.add('visible');
    });
  }

  function showInformantHintToast() {
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
        message: 'Tap New Word first, then press Clue for a kid-friendly phonics hint.',
        examples: [],
        actionMode: 'none'
      });
      return;
    }
    if (!state.entry) state.entry = WQData.getEntry(state.word) || null;
    currentRoundHintRequested = true;
    showInformantHintCard(buildInformantHintPayload(state));
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
    syncKeyboardLayoutToggle();
    return normalized;
  }

  function syncKeyboardLayoutToggle() {
    const toggle = _el('keyboard-layout-toggle');
    if (!toggle) return;
    const layout = document.documentElement.getAttribute('data-keyboard-layout') || 'standard';
    const isWilson = layout === 'wilson';
    toggle.textContent = '⌨';
    toggle.setAttribute('aria-pressed', isWilson ? 'true' : 'false');
    toggle.setAttribute('aria-label', isWilson
      ? 'Sound cards on. Tap to switch to letter keyboard.'
      : 'Letter keyboard on. Tap to switch to sound cards.');
    toggle.setAttribute('title', isWilson
      ? 'Sound cards mode is on. Tap for letter keyboard.'
      : 'Letter keyboard mode is on. Tap for sound cards.');
    toggle.classList.toggle('is-wilson', isWilson);
  }

  function syncCaseToggleUI() {
    const toggle = _el('case-toggle-btn');
    if (!toggle) return;
    const mode = String(document.documentElement.getAttribute('data-case') || prefs.caseMode || DEFAULT_PREFS.caseMode).toLowerCase();
    const isUpper = mode === 'upper';
    toggle.textContent = 'Aa';
    toggle.setAttribute('aria-pressed', isUpper ? 'true' : 'false');
    toggle.setAttribute('aria-label', isUpper
      ? 'Uppercase letters on. Tap to switch to lowercase.'
      : 'Lowercase letters on. Tap to switch to uppercase.');
    toggle.title = isUpper
      ? 'Uppercase letters are on. Tap for lowercase.'
      : 'Lowercase letters are on. Tap for uppercase.';
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
        ? 'Voice practice is required before next word.'
        : normalized === 'off'
          ? 'Voice practice is off.'
          : 'Voice practice is optional.'
      );
    }
    return normalized;
  }

  function areBoostPopupsEnabled() {
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
        : 'on'
    };
    return Object.entries(TEACHER_PRESETS).find(([, preset]) =>
      current.hint === preset.hint &&
      current.confidenceCoaching === preset.confidenceCoaching &&
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

  function hasCompletedFirstRunSetup() {
    try { return localStorage.getItem(FIRST_RUN_SETUP_KEY) === 'done'; } catch { return false; }
  }

  const shouldOfferStartupPreset = !hasCompletedFirstRunSetup();
  firstRunSetupPending = shouldOfferStartupPreset;

  function closeFirstRunSetupModal() {
    _el('first-run-setup-modal')?.classList.add('hidden');
  }

  function openFirstRunSetupModal() {
    const modal = _el('first-run-setup-modal');
    if (!modal) return;
    modal.classList.remove('hidden');
    _el('settings-panel')?.classList.add('hidden');
    _el('teacher-panel')?.classList.add('hidden');
    syncHeaderControlsVisibility();
  }

  function bindFirstRunSetupModal() {
    if (document.body.dataset.wqFirstRunSetupBound === '1') return;
    const closeTutorial = () => {
      markFirstRunSetupDone();
      firstRunSetupPending = false;
      closeFirstRunSetupModal();
      const state = WQGame.getState?.() || {};
      if (!state.word || state.gameOver) {
        newGame();
      }
      updateNextActionLine();
    };
    _el('first-run-skip-btn')?.addEventListener('click', closeTutorial);
    _el('first-run-start-btn')?.addEventListener('click', closeTutorial);
    _el('first-run-setup-modal')?.addEventListener('click', (event) => {
      if (event.target?.id === 'first-run-setup-modal') {
        closeTutorial();
      }
    });
    document.body.dataset.wqFirstRunSetupBound = '1';
  }

  async function resetAppearanceAndCache() {
    if (isAssessmentRoundLocked()) {
      showAssessmentLockNotice('Finish this round first, then reset appearance.');
      return;
    }

    cancelRevealNarration();
    stopVoiceCaptureNow();

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
    _el('s-motion').value = DEFAULT_PREFS.motion;
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
    applyMotion(DEFAULT_PREFS.motion);
    applyFeedback(DEFAULT_PREFS.feedback);
    WQUI.setCaseMode(DEFAULT_PREFS.caseMode);
    syncClassroomTurnRuntime({ resetTurn: true });
    updateWilsonModeToggle();
    syncTeacherPresetButtons();
    syncHeaderControlsVisibility();

    try { sessionStorage.removeItem('wq_sw_controller_reloaded'); } catch {}

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
      phonics: focusValue || 'all'
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
  let currentRoundVoiceAttempts = 0;
  let currentRoundErrorCounts = Object.create(null);
  let currentRoundSkillKey = 'classic';
  let currentRoundSkillLabel = 'Classic mixed practice';

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
    if (!isTeamModeEnabled() || !activeRound) {
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
      text = 'Mission Lab standalone: launch a sprint from the panel below.';
    } else if (firstRunSetupPending) {
      text = 'Open the quick how-to card to learn tile colors, then start your first word.';
    } else if (reviewWord) {
      text = `Level-up review: ${reviewWord.toUpperCase()} is back for a quick memory win.`;
    } else if (hasActiveRound && guessCount === 0 && activeGuessLength === 0) {
      if (confidenceOn) {
        text = playStyle === 'listening'
          ? 'No guess is wasted. Try a first word, then tap Hear Word or use Clue for a targeted phonics hint.'
          : 'No guess is wasted. Try a first word, then use colors to guide your next guess.';
      } else {
        text = playStyle === 'listening'
          ? 'Listening mode: guess first, then use Hear Word or Clue as helpers.'
          : 'Start with a first guess, then use color feedback to refine the next word.';
      }
    } else if (hasActiveRound && guessCount === 0 && activeGuessLength > 0) {
      text = `Build your first test word (${Math.min(activeGuessLength, wordLength)}/${wordLength}), then press Enter.`;
    } else if (hasActiveRound && guessCount === 1 && confidenceOn) {
      text = 'Great first try. Use the color feedback to move one letter at a time.';
    } else if (dueCount > 0) {
      text = `Review words ready: ${dueCount} due word${dueCount === 1 ? '' : 's'} in this focus.`;
    } else if (playStyle === 'listening') {
      text = hasActiveRound
        ? 'Listening mode: keep guessing and use audio buttons when needed.'
        : 'Tap New Word to start. You can use Hear Word or Clue anytime.';
    } else {
      text = hasActiveRound
        ? 'Keep guessing and use color feedback to narrow the word.'
        : 'Tap New Word to start. Make your first guess when ready.';
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

  function syncThemePreviewStripVisibility() {
    const strip = _el('theme-preview-strip');
    if (!strip) return;
    const panelOpen = !_el('settings-panel')?.classList.contains('hidden');
    const teacherPanelOpen = !_el('teacher-panel')?.classList.contains('hidden');
    const focusOpen = document.documentElement.getAttribute('data-focus-search-open') === 'true';
    const shouldShow = !panelOpen && !teacherPanelOpen && !focusOpen && !isAssessmentRoundLocked();
    strip.classList.toggle('hidden', !shouldShow);
    strip.setAttribute('aria-hidden', shouldShow ? 'false' : 'true');
  }

  function isMissionLabStandaloneMode() {
    return normalizePageMode(pageMode) === 'mission-lab';
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
      navBtn.textContent = missionMode ? 'WordQuest' : 'Mission Lab';
      navBtn.setAttribute('aria-pressed', missionMode ? 'true' : 'false');
      navBtn.title = missionMode
        ? 'Return to WordQuest gameplay mode'
        : 'Open Mission Lab as a standalone activity';
    }
    const newWordBtn = _el('new-game-btn');
    if (newWordBtn) {
      newWordBtn.textContent = missionMode ? 'New Mission' : 'New Word';
      newWordBtn.title = missionMode
        ? 'Start a standalone Mission Lab sprint'
        : 'Start a new word round';
      if (missionMode) newWordBtn.classList.remove('pulse');
    }
    _el('mission-lab-hub')?.classList.toggle('hidden', !missionMode);
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

  pageMode = normalizePageMode(readPageModeFromQuery());
  if (pageMode === 'wordquest') {
    pageMode = loadStoredPageMode();
  }

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
  window.addEventListener('wq:teacher-panel-toggle', () => {
    syncHeaderControlsVisibility();
  });
  window.addEventListener('wq:open-teacher-hub', () => {
    _el('teacher-panel-btn')?.click();
  });

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
  _el('mission-lab-nav-btn')?.addEventListener('click', () => {
    setPageMode(isMissionLabStandaloneMode() ? 'wordquest' : 'mission-lab');
  });
// Close settings when clicking outside
  document.addEventListener('pointerdown', e => {
    const panel = _el('settings-panel');
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
    if (!panel?.classList.contains('hidden') &&
        !panel.contains(e.target) &&
        e.target !== _el('settings-btn') &&
        !_el('settings-btn')?.contains(e.target)) {
      panel.classList.add('hidden');
      syncHeaderControlsVisibility();
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

  function maybeSwitchToQwertyForPhysicalKeyboard(event) {
    if (autoPhysicalKeyboardSwitchApplied) return;
    const activeLayout = document.documentElement.getAttribute('data-keyboard-layout') || 'standard';
    if (activeLayout !== 'wilson') return;
    // Only auto-switch if the current layout still matches the device-default decision.
    if (String(prefs.keyboardLayout || '') !== preferredInitialKeyboardLayout) return;
    if (preferredInitialKeyboardLayout !== 'wilson') return;
    const key = String(event?.key || '');
    if (!(key.length === 1 || key === 'Enter' || key === 'Backspace')) return;
    const sourceCaps = event?.sourceCapabilities;
    const likelyPhysicalKeyboard = sourceCaps ? sourceCaps.firesTouchEvents === false : true;
    if (!likelyPhysicalKeyboard) return;
    autoPhysicalKeyboardSwitchApplied = true;
    applyWilsonMode(false);
    refreshKeyboardLayoutPreview();
    WQUI.showToast('Physical keyboard detected. Switched to QWERTY.');
  }
  window.addEventListener('keydown', maybeSwitchToQwertyForPhysicalKeyboard, { passive: true });

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
  _el('keyboard-layout-toggle')?.addEventListener('click', () => {
    if (isAssessmentRoundLocked()) {
      showAssessmentLockNotice();
      return;
    }
    const state = WQGame.getState?.();
    const hasActiveProgress = Boolean(state?.word && !state?.gameOver && (state?.guesses?.length || 0) > 0);
    const current = document.documentElement.getAttribute('data-keyboard-layout') || 'standard';
    const enableWilson = current !== 'wilson';
    applyWilsonMode(enableWilson);
    if (hasActiveProgress) {
      WQUI.showToast(enableWilson
        ? 'Wilson mode saved. It applies next word.'
        : 'QWERTY mode saved. It applies next word.');
      return;
    }
    refreshKeyboardLayoutPreview();
    WQUI.showToast(enableWilson
      ? 'Keyboard switched to Wilson mode.'
      : 'Keyboard switched to QWERTY.');
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
      prefs.lessonPack || _el('s-lesson-pack')?.value || _el('m-lesson-pack')?.value || DEFAULT_PREFS.lessonPack
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
  _el('m-curriculum-step')?.addEventListener('change', e => {
    if (isAssessmentRoundLocked()) {
      showAssessmentLockNotice('Finish this round before changing curriculum targets.');
      syncLessonPackControlsFromPrefs();
      return;
    }
    const next = parseMainCurriculumStepValue(e.target.value);
    if (next.packId === 'custom') {
      handleLessonPackSelectionChange('custom');
      updateLessonPackNote('custom', 'custom');
      refreshStandaloneMissionLabHub();
      return;
    }
    const preferredTarget = next.targetId === 'custom'
      ? resolveDefaultLessonTargetId(next.packId)
      : next.targetId;
    getLessonPackSelectElements().forEach((select) => { select.value = next.packId; });
    lessonPackApplying = true;
    let normalizedTarget = 'custom';
    try {
      normalizedTarget = populateLessonTargetSelect(next.packId, preferredTarget);
    } finally {
      lessonPackApplying = false;
    }
    getLessonTargetSelectElements().forEach((select) => { select.value = normalizedTarget; });
    setLessonPackPrefs(next.packId, normalizedTarget);
    updateLessonPackNote(next.packId, normalizedTarget);
    refreshStandaloneMissionLabHub();
    if (normalizedTarget !== 'custom') {
      applyLessonTargetConfig(next.packId, normalizedTarget, { toast: false });
    }
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
  _el('s-grade')?.addEventListener('change',   e => {
    setPref('grade', e.target.value);
    applyAllGradeLengthDefault({ toast: true });
    releaseLessonPackToManualMode();
    updateFocusGradeNote();
    updateGradeTargetInline();
    refreshStandaloneMissionLabHub();
  });
  _el('s-length')?.addEventListener('change',  e => {
    setPref('length', e.target.value);
    releaseLessonPackToManualMode();
    refreshStandaloneMissionLabHub();
  });
  _el('s-guesses')?.addEventListener('change', e => setPref('guesses',  e.target.value));
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
      ? 'Listening mode on: use Word + Meaning audio support.'
      : 'Listening mode off: detective sentence clues only.');
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
  _el('hint-clue-close-btn')?.addEventListener('click', (event) => {
    event.preventDefault();
    hideInformantHintCard();
  });
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
      ? 'Listening mode enabled.'
      : 'Guess-first mode enabled.');
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
  _el('session-copy-probe-export-btn')?.addEventListener('click', () => {
    void copyProbeSummary();
  });
  _el('session-copy-probe-csv-export-btn')?.addEventListener('click', () => {
    void copyProbeSummaryCsv();
  });
  _el('session-reset-btn')?.addEventListener('click', () => {
    resetSessionSummary();
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
  _el('teacher-studio-music-upload')?.addEventListener('change', (event) => {
    const files = event.target?.files || [];
    setLocalMusicFiles(files);
  });
  _el('s-music-clear-local')?.addEventListener('click', () => {
    clearLocalMusicFiles();
    const settingsInput = _el('s-music-upload');
    const teacherInput = _el('teacher-studio-music-upload');
    if (settingsInput) settingsInput.value = '';
    if (teacherInput) teacherInput.value = '';
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
      setVoicePracticeFeedback('Tap Record above to capture a 1-second clip, then compare with model audio.');
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
      setVoicePracticeFeedback('Tap Start 1-sec Recording to capture your voice.');
    }
    return true;
  }

  async function startVoiceRecording() {
    if (voiceIsRecording) return;
    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === 'undefined') {
      setVoicePracticeFeedback('Recording is not available on this device.', true);
      return;
    }
    recordVoiceAttempt();
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
        if (revealChallengeState) setChallengeTaskComplete('listen', true);
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
      setVoicePracticeFeedback('Tap Record to capture a 1-second clip.');
    });
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
      clearRevealAutoAdvanceTimer();
      hideInformantHintCard();
      originalShowModal(state);
      voiceTakeComplete = false;
      stopVoiceCaptureNow();
      clearVoiceClip();
      drawWaveform();
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
      const curriculumEl = _el('curriculum-main-bar');
      const nextActionEl = _el('next-action-line');
      const classroomTurnEl = _el('classroom-turn-line');
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
      const supportH = supportRowEl?.offsetHeight || 0;
      const audioH = supportH ? 0 : (gameplayAudioEl?.offsetHeight || 36);
      const headerH = headerEl?.offsetHeight || parsePx(rootStyle.getPropertyValue('--header-h'), 50);
      const focusH = focusEl?.offsetHeight || parsePx(rootStyle.getPropertyValue('--focus-h'), 44);
      const curriculumNestedInFocus = Boolean(curriculumEl && focusEl && focusEl.contains(curriculumEl));
      const curriculumH = curriculumNestedInFocus ? 0 : (curriculumEl?.offsetHeight || 0);
      const nextActionH = nextActionEl && !nextActionEl.classList.contains('hidden')
        ? Math.max(0, nextActionEl.offsetHeight || 0)
        : 0;
      const classroomTurnH = classroomTurnEl && !classroomTurnEl.classList.contains('hidden')
        ? Math.max(0, classroomTurnEl.offsetHeight || 0)
        : 0;
      const themeNestedInHeader = Boolean(themeStripEl && headerEl && headerEl.contains(themeStripEl));
      const themeStripPosition = themeStripEl ? getComputedStyle(themeStripEl).position : '';
      const themeStripOverlay = themeStripEl
        ? themeStripEl.classList.contains('quick-media-dock') || themeStripPosition === 'fixed' || themeStripPosition === 'absolute'
        : false;
      const themeH = (themeNestedInHeader || themeStripOverlay) ? 0 : (themeStripEl?.offsetHeight || 0);
      const viewportH = window.visualViewport?.height || window.innerHeight;
      const viewportW = window.visualViewport?.width || window.innerWidth;
      const keyboardLayout = document.documentElement.getAttribute('data-keyboard-layout') || 'standard';
      const chunkTabsOn = document.documentElement.getAttribute('data-chunk-tabs') !== 'off';
      const isLandscape = viewportW >= viewportH;
      let layoutMode = 'default';
      if (viewportW >= 1040 && viewportH >= 680) layoutMode = 'wide';
      else if (viewportH <= 600 || (isLandscape && viewportH <= 660)) layoutMode = 'compact';
      else if (viewportH <= 740) layoutMode = 'tight';
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
        ? (supportH ? 0 : Math.max(0, (hintRowEl.offsetHeight || 0) - 8))
        : 0;
      const supportReserveH = supportH ? Math.max(0, supportH - 2) : 0;
      const kbRows = 3;
      const keyboardSafetyPad = keyboardLayout === 'wilson'
        ? (layoutMode === 'compact' ? 30 : layoutMode === 'tight' ? 24 : 22)
        : 12;
      const kbH = kbRows * keyH + (kbRows - 1) * keyGap + chunkRowH + keyboardSafetyPad;

      const extraSafetyH = layoutMode === 'compact' ? 48 : layoutMode === 'tight' ? 36 : layoutMode === 'wide' ? 24 : 28;
      const reservedH = headerH + focusH + curriculumH + nextActionH + classroomTurnH + themeH + mainPadTop + mainPadBottom + audioH + kbH + boardZoneGap + hintH + supportReserveH + extraSafetyH;
      const availableBoardH = Math.max(140, viewportH - reservedH);
      const byHeight = Math.floor((availableBoardH - platePadY - tileGap * (maxGuesses - 1) - 6) / maxGuesses);

      const availableBoardW = Math.max(220, mainInnerW);
      const byWidth = Math.floor((availableBoardW - platePadX - tileGap * (wordLength - 1)) / wordLength);

      const sizeCap = layoutMode === 'wide' ? 62 : layoutMode === 'tight' ? 52 : layoutMode === 'compact' ? 44 : 56;
      const sizeFloor = layoutMode === 'compact' ? 24 : 28;
      const size = Math.max(sizeFloor, Math.min(byHeight, byWidth, sizeCap));
      const boardWidth = wordLength * size + (wordLength - 1) * tileGap;
      const playfieldW = Math.ceil(boardWidth);

      const adaptiveKeyFloor = layoutMode === 'compact' ? 34 : layoutMode === 'tight' ? 41 : 46;
      const adaptiveKeyCeil = layoutMode === 'wide' ? 58 : 54;
      const adaptiveKeyH = Math.max(adaptiveKeyFloor, Math.min(adaptiveKeyCeil, Math.round(size * 0.96)));
      let adaptiveKeyMinW = Math.max(layoutMode === 'compact' ? 22 : layoutMode === 'tight' ? 25 : 29, Math.min(48, Math.round(size * 0.8)));
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

  let lessonPackApplying = false;

  function getLessonPackSelectElements() {
    return [_el('s-lesson-pack'), _el('m-lesson-pack')]
      .filter(Boolean);
  }

  function getLessonTargetSelectElements() {
    return [_el('s-lesson-target'), _el('m-lesson-target')]
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

  function formatMainCurriculumStepValue(packId, targetId) {
    const normalizedPack = normalizeLessonPackId(packId);
    const normalizedTarget = normalizeLessonTargetId(normalizedPack, targetId);
    return `${normalizedPack}::${normalizedTarget}`;
  }

  function parseMainCurriculumStepValue(value) {
    const [packRaw = 'custom', targetRaw = 'custom'] = String(value || '').split('::');
    const packId = normalizeLessonPackId(packRaw);
    const targetId = normalizeLessonTargetId(packId, targetRaw);
    return { packId, targetId };
  }

  function buildMainCurriculumStepOptions() {
    const options = [{ value: 'custom::custom', label: 'Manual (no curriculum pack)', group: '' }];
    CURRICULUM_PACK_ORDER.forEach((packId) => {
      const pack = getLessonPackDefinition(packId);
      const recommendedId = getCurrentWeekRecommendedLessonTarget(packId)?.target?.id || '';
      pack.targets.forEach((target) => {
        const prefix = target.id === recommendedId ? '★ ' : '';
        options.push({
          value: `${packId}::${target.id}`,
          label: `${prefix}${target.label}`,
          group: pack.label
        });
      });
    });
    return options;
  }

  function syncMainCurriculumStepSelect(packId, targetId) {
    const select = _el('m-curriculum-step');
    if (!select) return;
    const options = buildMainCurriculumStepOptions();
    const byGroup = new Map();
    select.innerHTML = '';
    options.forEach((option) => {
      if (!option.group) {
        const node = document.createElement('option');
        node.value = option.value;
        node.textContent = option.label;
        select.appendChild(node);
        return;
      }
      let group = byGroup.get(option.group);
      if (!group) {
        group = document.createElement('optgroup');
        group.label = option.group;
        byGroup.set(option.group, group);
        select.appendChild(group);
      }
      const node = document.createElement('option');
      node.value = option.value;
      node.textContent = option.label;
      group.appendChild(node);
    });

    const preferredValue = formatMainCurriculumStepValue(packId, targetId);
    const fallbackValue = formatMainCurriculumStepValue(packId, resolveDefaultLessonTargetId(packId));
    const hasPreferred = options.some((option) => option.value === preferredValue);
    const hasFallback = options.some((option) => option.value === fallbackValue);
    const selectedValue = hasPreferred
      ? preferredValue
      : hasFallback
        ? fallbackValue
        : 'custom::custom';
    select.value = selectedValue;
    const selectedLabel = select.selectedOptions?.[0]?.textContent || 'Manual (no curriculum pack)';
    select.setAttribute('title', selectedLabel);
  }

  function updateMainLessonPackSummary(packId, targetId) {
    const summaryEl = _el('curriculum-main-summary');
    const normalizedPack = normalizeLessonPackId(packId);
    const normalizedTarget = normalizeLessonTargetId(normalizedPack, targetId);
    syncMainCurriculumStepSelect(normalizedPack, normalizedTarget);
    if (!summaryEl) return;
    if (normalizedPack === 'custom') {
      summaryEl.textContent = 'Curriculum: Manual mode';
      summaryEl.setAttribute('title', 'Manual mode keeps quest focus and word safety under teacher control.');
      return;
    }
    const pack = getLessonPackDefinition(normalizedPack);
    const target = getLessonTarget(normalizedPack, normalizedTarget);
    if (!target) {
      summaryEl.textContent = `Curriculum: ${pack.label} selected`;
      summaryEl.setAttribute('title', `${pack.label} selected. Choose a lesson target from the curriculum menu.`);
      return;
    }
    summaryEl.textContent = `Curriculum: ${pack.label} · ${target.label}`;
    summaryEl.setAttribute('title', `${pack.label} · ${target.label} (${formatLessonTargetPacing(target)})`);
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
    const noteEls = [_el('lesson-pack-note'), _el('main-lesson-pack-note')].filter(Boolean);
    const pacingEls = [_el('lesson-pack-pacing'), _el('main-lesson-pack-pacing')].filter(Boolean);
    const normalizedPack = normalizeLessonPackId(packId);
    const normalizedTarget = normalizeLessonTargetId(normalizedPack, targetId);
    updateMainLessonPackSummary(normalizedPack, normalizedTarget);
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
    const focusSelect = _el('setting-focus');
    const gradeSelect = _el('s-grade');
    const lengthSelect = _el('s-length');

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
      if (lengthSelect && lengthSelect.value !== target.length) {
        lengthSelect.value = target.length;
        setPref('length', target.length);
      }
    } finally {
      lessonPackApplying = false;
    }

    updateFocusGradeNote();
    updateGradeTargetInline();
    updateFocusSummaryLabel();
    refreshStandaloneMissionLabHub();
    if (options.toast) {
      const pack = getLessonPackDefinition(packId);
      WQUI.showToast(`${pack.label}: ${target.label} applied (${formatLessonTargetPacing(target)}).`);
    }
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

  function applyAllGradeLengthDefault(options = {}) {
    const focusValue = _el('setting-focus')?.value || prefs.focus || 'all';
    const preset = parseFocusPreset(focusValue);
    if (preset.kind === 'subject') return false;

    const gradeValue = String(_el('s-grade')?.value || prefs.grade || DEFAULT_PREFS.grade).trim().toLowerCase();
    if (gradeValue !== 'all') return false;

    const lengthSelect = _el('s-length');
    if (!lengthSelect) return false;
    if (String(lengthSelect.value || '').trim() === DEFAULT_PREFS.length) return false;

    lengthSelect.value = DEFAULT_PREFS.length;
    setPref('length', DEFAULT_PREFS.length);
    if (options.toast) {
      WQUI.showToast(`All grades mode defaults to ${DEFAULT_PREFS.length}-letter words.`);
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
    const mode = getHintMode();
    syncHintToggleUI(mode);
    const hintEl = _el('focus-hint');
    if (!hintEl) return;
    const hintRow = hintEl.closest('.focus-hint-row');
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

    if (preset.kind === 'classic') {
      hintText = '';
    } else if (phonicsTag && phonicsTag.toLowerCase() !== 'all') {
      hintText = phonicsTag;
    } else if (preset.kind === 'subject') {
      hintText = `${preset.subject.toUpperCase()} · ${preset.gradeBand}`;
    } else {
      hintText = '';
    }

    if (!hintText) {
      hintEl.textContent = '';
      hintEl.classList.add('hidden');
      if (hintRow) hintRow.classList.add('is-off');
      return;
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
      cvc: 'CVC Builders · short vowels',
      digraph: 'Sound Buddies · sh, ch, th',
      ccvc: 'Blend Launch · st, bl, tr',
      cvcc: 'Blend Landing · mp, nd, st',
      trigraph: 'Triple Sounds · tch, dge, igh',
      cvce: 'Magic E · CVCe',
      vowel_team: 'Vowel Teams · ai, ee, oa',
      r_controlled: 'Bossy R · ar, or, er',
      diphthong: 'Slide Sounds · oi, oy, ou',
      floss: 'Floss Rule · -ff, -ll, -ss, -zz',
      welded: 'Welded Sounds · -ang, -ing',
      schwa: 'Schwa Switch',
      prefix: 'Prefix Power · un-, re-',
      suffix: 'Suffix Power · -ing, -ed',
      compound: 'Word Joiners · compound words',
      multisyllable: 'Syllable Stretch'
    }));
    return labels[value] || String(fallback || value || '').trim();
  }

  function getFocusDisplayGroup(value, fallbackGroup = '') {
    const groups = getFocusDisplayGroup._groups || (getFocusDisplayGroup._groups = Object.freeze({
      all: 'Classic',
      cvc: 'Sound Quest',
      digraph: 'Sound Quest',
      ccvc: 'Sound Quest',
      cvcc: 'Sound Quest',
      trigraph: 'Sound Quest',
      cvce: 'Sound Quest',
      vowel_team: 'Sound Quest',
      r_controlled: 'Sound Quest',
      diphthong: 'Sound Quest',
      floss: 'Sound Quest',
      welded: 'Sound Quest',
      schwa: 'Sound Quest',
      prefix: 'Word Parts',
      suffix: 'Word Parts',
      compound: 'Word Parts',
      multisyllable: 'Word Parts'
    }));
    if (groups[value]) return groups[value];
    if (String(value || '').startsWith('vocab-')) return 'Subject Words';
    return String(fallbackGroup || 'General').trim() || 'General';
  }

  function getFocusEntries() {
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
          questValue: `focus::${value}`
        };
      });
  }

  function getCurriculumQuestEntries() {
    const entries = [{
      value: 'custom::custom',
      label: 'Manual (no curriculum pack)',
      group: 'Curriculum',
      kind: 'curriculum',
      packId: 'custom',
      targetId: 'custom',
      questValue: 'curriculum::custom::custom'
    }];
    CURRICULUM_PACK_ORDER.forEach((packId) => {
      const pack = getLessonPackDefinition(packId);
      if (!pack || !Array.isArray(pack.targets)) return;
      pack.targets.forEach((target) => {
        if (!target?.id) return;
        entries.push({
          value: `curriculum::${packId}::${target.id}`,
          label: `${pack.label} · ${target.label}`,
          group: `Curriculum · ${pack.label}`,
          kind: 'curriculum',
          packId,
          targetId: target.id,
          questValue: `curriculum::${packId}::${target.id}`
        });
      });
    });
    return entries;
  }

  function getQuestEntries() {
    return [...getFocusEntries(), ...getCurriculumQuestEntries()];
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
    inputEl.value = currentLabel;
    inputEl.dataset.lockedLabel = currentLabel.toLowerCase();
    inputEl.placeholder = 'Select your quest or track';
    inputEl.setAttribute('title', `Select your quest or track. Current selection: ${currentLabel}`);
    inputEl.setAttribute('aria-label', `Select your quest or track. Current selection: ${currentLabel}`);
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
  const FOCUS_EMPTY_VISIBLE_LIMIT = 24;
  const FOCUS_QUERY_VISIBLE_LIMIT = 20;
  const CURRICULUM_QUICK_VALUES = Object.freeze([]);
  const PHONICS_SEARCH_SHORTCUT = Object.freeze({
    value: '__phonics_curriculum__',
    label: 'Phonics Curriculum',
    group: 'Curriculum',
    kind: 'curriculum',
    packId: 'phonics',
    targetId: 'phonics-k2-cvc',
    questValue: 'curriculum::phonics::phonics-k2-cvc'
  });

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

  function setFocusSearchOpen(isOpen) {
    document.documentElement.setAttribute('data-focus-search-open', isOpen ? 'true' : 'false');
    const strip = _el('theme-preview-strip');
    if (strip) {
      strip.classList.toggle('is-search-hidden', !!isOpen);
    }
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
    window.dispatchEvent(new CustomEvent('wq:open-teacher-hub'));
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

  function renderFocusSearchList(rawQuery = '') {
    const listEl = _el('focus-inline-results');
    const inputEl = _el('focus-inline-search');
    if (!listEl) return;
    const query = String(rawQuery || '').trim().toLowerCase();
    const entries = getQuestEntries();
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
        if (visible.length >= FOCUS_EMPTY_VISIBLE_LIMIT) return;
        const found = entries.find((entry) => entry.value === value);
        if (found && !used.has(found.value)) {
          visible.push(found);
          used.add(found.value);
        }
      });
      entries.forEach((entry) => {
        if (entry.value === 'all') return;
        if (visible.length >= FOCUS_EMPTY_VISIBLE_LIMIT || used.has(entry.value)) return;
        visible.push(entry);
        used.add(entry.value);
      });
      const hasPhonicsShortcut = visible.some((entry) => entry.questValue === PHONICS_SEARCH_SHORTCUT.questValue);
      if (!hasPhonicsShortcut) {
        visible = [...visible, PHONICS_SEARCH_SHORTCUT];
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
    const actions = '<button type="button" class="focus-search-action" data-focus-action="teacher-words">👩‍🏫 Open Teacher Hub</button>';
    const guidance = !query
      ? '<div class="focus-search-empty focus-search-empty-hint">🎯 Start with a sound quest first, then choose curriculum targets below.</div>'
      : '';
    listEl.innerHTML = actions + guidance + visible.map((entry) => {
      const questValue = entry.questValue || `focus::${entry.value}`;
      const isPhonicsShortcut = entry.packId === 'phonics';
      const isActive = questValue === activeQuestValue || (isPhonicsShortcut && activePack === 'phonics');
      const activeClass = isActive ? ' is-active' : '';
      const selected = isActive ? 'true' : 'false';
      const meta = entry.value === 'all' ? '' : `<small>${escapeHtml(entry.group)}</small>`;
      return `<button type="button" class="focus-search-item${activeClass}" data-quest-value="${escapeHtml(questValue)}" role="option" aria-selected="${selected}"><span>${escapeHtml(entry.label)}</span>${meta}</button>`;
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

  function setQuestValue(nextValue, options = {}) {
    const raw = String(nextValue || '').trim();
    if (!raw) return;
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
        return;
      }
      handleLessonPackSelectionChange(packId);
      handleLessonTargetSelectionChange(targetId);
      if (options.toast) {
        const pack = getLessonPackDefinition(packId);
        const target = getLessonTarget(packId, targetId);
        if (target) WQUI.showToast(`Track set: ${pack.label} · ${target.label}.`);
      }
      updateFocusSummaryLabel();
      closeFocusSearchList();
      return;
    }
    const focusValue = raw.startsWith('focus::') ? raw.slice('focus::'.length) : raw;
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
      const preset = parseFocusPreset(opts.focus || opts.phonics || 'all');
      const requestedGradeBand = preset.kind === 'subject' ? preset.gradeBand : opts.gradeBand;
      const effectiveGradeBand = getEffectiveGameplayGradeBand(requestedGradeBand, opts.focus || opts.phonics || 'all');
      const basePool = originalGetPlayableWords({
        gradeBand: effectiveGradeBand || SAFE_DEFAULT_GRADE_BAND,
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
    releaseLessonPackToManualMode();
    syncGradeFromFocus(focus, { silent: lessonPackApplying });
    updateFocusHint();
    updateFocusGradeNote();
    updateFocusSummaryLabel();
    syncChunkTabsVisibility();
    refreshStandaloneMissionLabHub();
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
    setQuestValue(chosen.getAttribute('data-quest-value'));
    updateFocusSummaryLabel();
    event.preventDefault();
  });

  _el('focus-inline-results')?.addEventListener('click', (event) => {
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
      }
      return;
    }
    const button = event.target?.closest?.('[data-quest-value]');
    if (!button) return;
    const value = button.getAttribute('data-quest-value');
    setQuestValue(value);
    updateFocusSummaryLabel();
  });

  const initialLessonPackState = syncLessonPackControlsFromPrefs();
  if (initialLessonPackState.packId !== 'custom' && initialLessonPackState.targetId !== 'custom') {
    applyLessonTargetConfig(initialLessonPackState.packId, initialLessonPackState.targetId);
  }
  syncGradeFromFocus(_el('setting-focus')?.value || prefs.focus || 'all', { silent: true });
  applyAllGradeLengthDefault();
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
      <button type="button" class="midgame-boost-peek" aria-expanded="false" aria-label="Open clue peek">
        <span class="midgame-boost-peek-dot" aria-hidden="true"></span>
        Clue Peek
      </button>
      <div class="midgame-boost-bubble hidden">
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
    midgameBoostAutoHideTimer = setTimeout(hideMidgameBoost, hasAnswer ? 15000 : 12000);
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
      currentRoundVoiceAttempts = 0;
      currentRoundErrorCounts = Object.create(null);
      const skill = getSkillDescriptorForRound(nextResult);
      currentRoundSkillKey = skill.key;
      currentRoundSkillLabel = skill.label;
      return;
    }
    activeRoundStartedAt = 0;
    currentRoundHintRequested = false;
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
    el.classList.remove('is-good', 'is-warn');
    if (tone === 'good') el.classList.add('is-good');
    if (tone === 'warn') el.classList.add('is-warn');
  }

  function formatSignedDelta(value, digits = 1) {
    if (!Number.isFinite(value)) return '--';
    const rounded = Number(value.toFixed(digits));
    if (rounded > 0) return `+${rounded}`;
    return String(rounded);
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
    saveRosterState();
    renderRosterControls();
    return true;
  }

  function clearRosterStudents() {
    rosterState = { students: [], active: '' };
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
      focus
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
    if (missionCountEl) missionCountEl.textContent = `Mission Rounds: ${missionStats.count}`;
    if (missionScoreEl) {
      missionScoreEl.textContent = missionStats.count
        ? `Mission Avg Score: ${Math.round(missionStats.avgScore)}/100 · Strong+ ${Math.round(missionStats.strongRate * 100)}%`
        : 'Mission Avg Score: --';
    }
    if (missionCompletionEl) {
      missionCompletionEl.textContent = missionStats.count
        ? `Mission Completion: ${Math.round(missionStats.completionRate * 100)}% · On-time ${missionStats.completedCount ? `${Math.round(missionStats.onTimeRate * 100)}%` : '--'}`
        : 'Mission Completion: --';
    }
    if (missionLevelEl) {
      missionLevelEl.textContent = `Mission Top Level: ${missionStats.topLevelLabel}`;
    }
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
      `Mission Rounds: ${missionStats.count}`,
      `Mission Avg Score: ${missionStats.count ? `${Math.round(missionStats.avgScore)}/100` : '--'}`,
      `Mission Strong+ Rate: ${missionStats.count ? `${Math.round(missionStats.strongRate * 100)}%` : '--'}`,
      `Mission Completion: ${missionStats.count ? `${Math.round(missionStats.completionRate * 100)}%` : '--'}`,
      `Mission On-time: ${missionStats.completedCount ? `${Math.round(missionStats.onTimeRate * 100)}%` : '--'}`,
      `Mission Top Level: ${missionStats.topLevelLabel}`
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
      'Mission Rounds',
      'Mission Avg Score',
      'Mission Strong+',
      'Mission Completion',
      'Mission On-Time',
      'Mission Top Level'
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
        const score = Math.max(0, Number(record.score) || 0);
        const doneCount = ['listen', 'analyze', 'create']
          .reduce((count, task) => count + (tasks?.[task] ? 1 : 0), 0);
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
            listen: !!tasks.listen,
            analyze: !!tasks.analyze,
            create: !!tasks.create
          }
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
      'WordQuest Mission Lab Summary',
      `Student: ${activeStudent}`,
      `Generated: ${new Date().toLocaleString()}`,
      `Session started: ${new Date(sessionSummary.startedAt || Date.now()).toLocaleString()}`,
      `Mission rounds: ${stats.count}`,
      `Mission average score: ${stats.count ? `${Math.round(stats.avgScore)}/100` : '--'}`,
      `Strong+ missions: ${stats.count ? `${Math.round(stats.strongRate * 100)}%` : '--'}`,
      `Mission completion: ${stats.count ? `${Math.round(stats.completionRate * 100)}%` : '--'}`,
      `On-time finishes: ${stats.completedCount ? `${Math.round(stats.onTimeRate * 100)}%` : '--'}`,
      `Most-used Bloom level: ${stats.topLevelLabel}`
    ];
    if (recent) {
      lines.push(
        '',
        'Most recent mission',
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
      'Mission ID',
      'Source',
      'Student',
      'Word',
      'Topic',
      'Grade',
      'Bloom Level',
      'Score Band',
      'Mission Score',
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
      lines.push(['', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', 'No mission records yet.', '']);
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
      { name: `${prefix}-mission-lab.csv`, content: buildMissionLabCsvText() }
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
      'Mission summary copied.',
      'Could not copy mission summary on this device.'
    );
  }

  async function copyMissionSummaryCsv() {
    await copyTextToClipboard(
      buildMissionLabCsvText(),
      'Mission CSV copied.',
      'Could not copy mission CSV on this device.'
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

  function newGame() {
    hideInformantHintCard();
    closeRevealChallengeModal({ silent: true });
    clearClassroomTurnTimer();
    resetRoundTracking();
    if (firstRunSetupPending && !_el('first-run-setup-modal')?.classList.contains('hidden')) {
      WQUI.showToast('Pick a setup style or skip for now.');
      return;
    }
    if (isMissionLabStandaloneMode()) {
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
    const focus = _el('setting-focus')?.value || prefs.focus || 'all';
    const effectiveGradeBand = getEffectiveGameplayGradeBand(s.gradeBand || 'all', focus);
    const scope = `${effectiveGradeBand}:${s.length || 'any'}:${focus || 'all'}`;
    const playableSet = buildPlayableWordSet(effectiveGradeBand, s.length, focus);
    const reviewItem = peekDueReviewItemForPool(playableSet);
    if (reviewItem) {
      primeShuffleBagWithWord(scope, reviewItem.word);
    }

    const result = WQGame.startGame({
      ...s,
      gradeBand: effectiveGradeBand,
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
      updateNextActionLine({ dueCount: countDueReviewWords(playableSet) });
      syncClassroomTurnRuntime({ resetTurn: true });
      syncAssessmentLockRuntime();
      return;
    }
    resetRoundTracking(result);
    const startedWord = normalizeReviewWord(result.word);
    const servedReview = Boolean(reviewItem && startedWord && startedWord === reviewItem.word);
    if (servedReview) consumeReviewItem(reviewItem);
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
    updateNextActionLine({
      reviewWord: servedReview ? startedWord : '',
      dueCount: countDueReviewWords(playableSet)
    });
    scheduleStarterCoachHint();
    syncAssessmentLockRuntime();
  }

  const reflowLayout = () => {
    const s = WQGame.getState();
    if (s?.word) WQUI.calcLayout(s.wordLength, s.maxGuesses);
  };
  window.addEventListener('resize', reflowLayout);
  window.visualViewport?.addEventListener('resize', reflowLayout);
  window.addEventListener('beforeunload', () => {
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
    if (firstRunSetupPending && !_el('first-run-setup-modal')?.classList.contains('hidden')) return;
    const s = WQGame.getState();
    if (s.gameOver) return;

    if (key === 'Enter') {
      const themeAtSubmit = normalizeTheme(document.documentElement.getAttribute('data-theme'), getThemeFallback());
      const result = WQGame.submitGuess();
      if (!result) return;
      if (result.error === 'too_short') {
        WQUI.showToast('Fill in all the letters first');
        WQUI.shakeRow(s.guesses, s.wordLength);
        updateNextActionLine();
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
          const roundMetrics = buildRoundMetrics(result, s.maxGuesses);
          clearClassroomTurnTimer();
          updateClassroomTurnLine();
          awardQuestProgress(result, roundMetrics);
          trackRoundForReview(result, s.maxGuesses, roundMetrics);
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
            WQUI.showModal(result);
            _el('new-game-btn')?.classList.add('pulse');
            const settings = WQUI.getSettings();
            if (result.won && settings.confetti){ launchConfetti(); launchStars(); }
            if (normalizeTheme(document.documentElement.getAttribute('data-theme'), getThemeFallback()) !== themeAtSubmit) {
              applyTheme(themeAtSubmit);
            }
          }, 520);
        } else {
          maybeShowErrorCoach(result);
          advanceTeamTurn();
          updateNextActionLine();
        }
      });

    } else if (key === 'Backspace' || key === '⌫') {
      WQGame.deleteLetter();
      const s2 = WQGame.getState();
      WQUI.updateCurrentRow(s2.guess, s2.wordLength, s2.guesses.length);
      updateNextActionLine();

    } else if (/^[a-zA-Z]$/.test(key)) {
      WQGame.addLetter(key);
      const s2 = WQGame.getState();
      WQUI.updateCurrentRow(s2.guess, s2.wordLength, s2.guesses.length);
      updateNextActionLine();
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
    const phonicsClueOpen = !(_el('phonics-clue-modal')?.classList.contains('hidden'));
    if (phonicsClueOpen) {
      if (e.key === 'Escape') closePhonicsClueModal();
      return;
    }
    const challengeOpen = !(_el('challenge-modal')?.classList.contains('hidden'));
    if (challengeOpen) {
      if (e.key === 'Escape') closeRevealChallengeModal();
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
    void openPhonicsClueModal();
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
    note.textContent = `Selected Bloom target: ${getChallengeLevelDisplay(level)}. Start Mission Lab when ready.`;
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
  _el('challenge-hear-word')?.addEventListener('click', () => {
    cancelRevealNarration();
    const current = revealChallengeState?.result?.entry || entry();
    if (current) void WQAudio.playWord(current);
    setChallengeTaskComplete('listen', true);
  });
  _el('challenge-hear-sentence')?.addEventListener('click', () => {
    cancelRevealNarration();
    const current = revealChallengeState?.result?.entry || entry();
    if (current) void WQAudio.playSentence(current);
    setChallengeTaskComplete('listen', true);
  });
  _el('challenge-open-practice')?.addEventListener('click', () => {
    closeRevealChallengeModal({ silent: true });
    openVoicePracticeAndRecord({ autoStart: true });
    setChallengeTaskComplete('listen', true);
  });
  _el('challenge-analyze-input')?.addEventListener('input', (event) => {
    if (!revealChallengeState) return;
    revealChallengeState.responses.analyze = String(event.target?.value || '');
    const met = countWords(revealChallengeState.responses.analyze) >= CHALLENGE_MIN_TEXT_WORDS;
    setChallengeTaskComplete('analyze', met);
    updateChallengeWordCountUI();
  });
  _el('challenge-create-input')?.addEventListener('input', (event) => {
    if (!revealChallengeState) return;
    revealChallengeState.responses.create = String(event.target?.value || '');
    const met = countWords(revealChallengeState.responses.create) >= CHALLENGE_MIN_TEXT_WORDS;
    setChallengeTaskComplete('create', met);
    updateChallengeWordCountUI();
  });
  _el('challenge-analyze-starter')?.addEventListener('click', () => {
    applyChallengeStarter('analyze');
  });
  _el('challenge-create-starter')?.addEventListener('click', () => {
    applyChallengeStarter('create');
  });
  _el('challenge-save-reflection')?.addEventListener('click', () => {
    saveRevealChallengeResponses();
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
      teacher: 'Teacher lens: Bloom Remember · SoR word recognition + retrieval.'
    }),
    understand: Object.freeze({
      chip: 'Explain It (Understand)',
      teacher: 'Teacher lens: Bloom Understand · SoR semantics + background knowledge.'
    }),
    apply: Object.freeze({
      chip: 'Use It (Apply)',
      teacher: 'Teacher lens: Bloom Apply · SoR syntax + semantics in context.'
    }),
    analyze: Object.freeze({
      chip: 'Compare It (Analyze)',
      teacher: 'Teacher lens: Bloom Analyze · SoR pattern analysis + comprehension.'
    }),
    evaluate: Object.freeze({
      chip: 'Defend It (Evaluate)',
      teacher: 'Teacher lens: Bloom Evaluate · strategy reflection + comprehension.'
    }),
    create: Object.freeze({
      chip: 'Invent It (Create)',
      teacher: 'Teacher lens: Bloom Create · expressive language + transfer.'
    })
  });
  const CHALLENGE_REFLECTION_KEY = 'wq_v2_levelup_reflections_v1';
  const CHALLENGE_PROGRESS_KEY = 'wq_v2_mission_lab_progress_v1';
  const CHALLENGE_DRAFT_KEY = 'wq_v2_mission_lab_draft_v1';
  const CHALLENGE_SPRINT_SECONDS = 90;
  const CHALLENGE_MIN_TEXT_WORDS = 5;
  const CHALLENGE_STRONG_SCORE_MIN = 75;
  const CHALLENGE_COMPLETE_LINES = Object.freeze([
    'Mission complete. Detective brain unlocked.',
    'Mission lab complete. You cracked the bonus sprint.',
    'Quest complete. Your clue power just went up.'
  ]);
  const CHALLENGE_TASK_LABELS = Object.freeze({
    listen: 'Sound Sleuth',
    analyze: 'Clue Compare',
    create: 'Create A Clue'
  });
  const CHALLENGE_TEXT_STARTERS = Object.freeze({
    analyze: Object.freeze([
      'I noticed this word pattern because ',
      'A helpful strategy was ',
      'This word is different from _____ because '
    ]),
    create: Object.freeze([
      'I am thinking of a word that ',
      'My clue is: this word means ',
      'Riddle: what word can '
    ])
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
  const REVEAL_PACING_PRESETS = Object.freeze({
    guided: Object.freeze({ introDelay: 260, betweenDelay: 140, postMeaningDelay: 200 }),
    quick: Object.freeze({ introDelay: 140, betweenDelay: 70, postMeaningDelay: 120 }),
    slow: Object.freeze({ introDelay: 420, betweenDelay: 220, postMeaningDelay: 320 })
  });
  let revealAutoAdvanceTimer = 0;
  let revealAutoCountdownTimer = 0;
  let revealAutoAdvanceEndsAt = 0;
  let revealChallengeState = null;

  function pickRandom(items) {
    if (!Array.isArray(items) || !items.length) return '';
    const index = Math.floor(Math.random() * items.length);
    return items[index];
  }

  function clearChallengeSprintTimer() {
    if (!challengeSprintTimer) return;
    clearInterval(challengeSprintTimer);
    challengeSprintTimer = 0;
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

  function formatChallengeTimer(seconds) {
    const safe = Math.max(0, Number(seconds) || 0);
    return `${safe}s left`;
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

  function countWords(text) {
    return String(text || '')
      .trim()
      .split(/\s+/g)
      .filter(Boolean)
      .length;
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
    const length = String(_el('s-length')?.value || prefs.length || DEFAULT_PREFS.length).trim() || DEFAULT_PREFS.length;
    let pool = WQData.getPlayableWords({
      gradeBand,
      length,
      phonics: focus
    });
    if (!pool.length && length !== 'any') {
      pool = WQData.getPlayableWords({
        gradeBand,
        length: 'any',
        phonics: focus
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
    const focusLabel = getFocusLabel(focus).replace(/[—]/g, '').replace(/\s+/g, ' ').trim() || 'Classic';
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
        ? `${pool.length} mission-ready words in this filter. Launch now or pick a word and Bloom level.`
        : 'No mission-ready words in this filter. Switch quest or grade, then try again.';
    }
  }

  function startStandaloneMissionLab(options = {}) {
    const { pool } = getStandaloneMissionWordPool();
    if (!pool.length) {
      WQUI.showToast('No words match this Mission Lab filter. Adjust grade, quest, or word length.');
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
      WQUI.showToast('Could not pick a mission word. Try again.');
      return false;
    }

    const entryData = WQData.getEntry(word);
    if (!entryData) {
      WQUI.showToast('Mission word data is missing. Pick another word.');
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
      WQUI.showToast('Mission Lab could not start for this word.');
      return false;
    }

    revealChallengeState = nextState;
    revealChallengeState.sprintEndsAt = Date.now() + (CHALLENGE_SPRINT_SECONDS * 1000);
    renderRevealChallengeModal();
    _el('challenge-modal')?.classList.remove('hidden');
    startChallengeSprint();
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
    const analyzeEl = _el('challenge-analyze-count');
    const createEl = _el('challenge-create-count');
    if (!revealChallengeState) {
      if (analyzeEl) analyzeEl.textContent = `0 / ${CHALLENGE_MIN_TEXT_WORDS} words`;
      if (createEl) createEl.textContent = `0 / ${CHALLENGE_MIN_TEXT_WORDS} words`;
      return;
    }
    const analyzeWords = countWords(revealChallengeState.responses.analyze);
    const createWords = countWords(revealChallengeState.responses.create);
    if (analyzeEl) {
      analyzeEl.textContent = `${analyzeWords} / ${CHALLENGE_MIN_TEXT_WORDS} words`;
      analyzeEl.classList.toggle('is-complete', analyzeWords >= CHALLENGE_MIN_TEXT_WORDS);
    }
    if (createEl) {
      createEl.textContent = `${createWords} / ${CHALLENGE_MIN_TEXT_WORDS} words`;
      createEl.classList.toggle('is-complete', createWords >= CHALLENGE_MIN_TEXT_WORDS);
    }
  }

  function applyChallengeStarter(task) {
    if (!revealChallengeState) return;
    const key = task === 'create' ? 'create' : 'analyze';
    const starters = CHALLENGE_TEXT_STARTERS[key] || [];
    if (!starters.length) return;
    const input = _el(key === 'create' ? 'challenge-create-input' : 'challenge-analyze-input');
    if (!(input instanceof HTMLTextAreaElement)) return;

    const existing = String(input.value || '').trim();
    let starter = pickRandom(starters) || starters[0] || '';
    if (!starter) return;
    if (existing) {
      const alreadyHasStarter = starters.some((item) => existing.toLowerCase().startsWith(String(item).toLowerCase()));
      if (alreadyHasStarter) {
        starter = starters.find((item) => !existing.toLowerCase().startsWith(String(item).toLowerCase())) || starter;
      }
    }

    input.value = existing
      ? `${existing} ${starter}`.replace(/\s+/g, ' ').trim()
      : starter;
    input.dispatchEvent(new Event('input', { bubbles: true }));
    input.focus();
    setChallengeFeedback(`${CHALLENGE_TASK_LABELS[key]} starter added. Keep going.`, 'good');
  }

  function computeChallengeScore(state) {
    if (!state) return { clarity: 0, evidence: 0, vocabulary: 0, total: 0 };
    const analyzeText = String(state.responses?.analyze || '').trim();
    const createText = String(state.responses?.create || '').trim();
    const analyzeWords = countWords(analyzeText);
    const createWords = countWords(createText);
    const mergedText = `${analyzeText} ${createText}`.toLowerCase();
    const uniqueWords = new Set(mergedText.split(/[^a-z]+/g).filter((token) => token.length >= 3));
    const evidenceSignals = ['because', 'since', 'so', 'therefore', 'difference', 'pattern', 'strategy']
      .reduce((count, token) => count + (mergedText.includes(token) ? 1 : 0), 0);

    const clarity = Math.min(
      100,
      40 +
      (state.tasks.listen ? 22 : 0) +
      Math.min(18, analyzeWords * 2) +
      Math.min(14, createWords * 2)
    );
    const evidence = Math.min(
      100,
      30 +
      Math.min(34, analyzeWords * 4) +
      (state.tasks.analyze ? 16 : 0) +
      Math.min(20, evidenceSignals * 5)
    );
    const vocabulary = Math.min(
      100,
      34 +
      Math.min(38, uniqueWords.size * 2) +
      (state.tasks.create ? 18 : 0)
    );
    const total = Math.round((clarity + evidence + vocabulary) / 3);
    return { clarity, evidence, vocabulary, total };
  }

  function updateChallengeScoreUI() {
    const scoreLabel = _el('challenge-score-label');
    const scoreDetail = _el('challenge-score-detail');
    if (!scoreLabel || !scoreDetail) return;
    if (!revealChallengeState) {
      scoreLabel.textContent = 'Mission score: --';
      scoreDetail.textContent = 'Band -- · Clarity -- · Evidence -- · Vocabulary --';
      return;
    }
    const score = computeChallengeScore(revealChallengeState);
    const band = resolveMissionScoreBand(score.total);
    revealChallengeState.score = score;
    scoreLabel.textContent = `Mission score: ${score.total}/100`;
    scoreDetail.textContent = `${band} band · Clarity ${score.clarity} · Evidence ${score.evidence} · Vocabulary ${score.vocabulary}`;
  }

  function updateChallengeSprintUI() {
    const timerEl = _el('challenge-sprint-timer');
    const rankEl = _el('challenge-sprint-rank');
    const streakEl = _el('challenge-sprint-streak');
    if (!timerEl || !rankEl || !streakEl) return;
    if (!revealChallengeState) {
      timerEl.textContent = `${CHALLENGE_SPRINT_SECONDS}s left`;
      timerEl.classList.remove('is-warning', 'is-expired');
      const progress = loadChallengeProgress();
      const rank = resolveChallengeRank(progress.points);
      rankEl.textContent = `Rank: ${rank.label}`;
      streakEl.textContent = `Streak: ${progress.streak}`;
      return;
    }
    const progress = loadChallengeProgress();
    const rank = resolveChallengeRank(progress.points);
    rankEl.textContent = `Rank: ${rank.label}`;
    streakEl.textContent = `Streak: ${progress.streak}`;

    const endsAt = Number(revealChallengeState.sprintEndsAt || 0);
    const remaining = Math.max(0, Math.ceil((endsAt - Date.now()) / 1000));
    timerEl.textContent = remaining > 0 ? formatChallengeTimer(remaining) : 'Time up';
    timerEl.classList.toggle('is-warning', remaining > 0 && remaining <= 20);
    timerEl.classList.toggle('is-expired', remaining <= 0);
  }

  function startChallengeSprint() {
    if (!revealChallengeState) return;
    if (!Number.isFinite(revealChallengeState.sprintEndsAt) || revealChallengeState.sprintEndsAt <= 0) {
      revealChallengeState.sprintEndsAt = Date.now() + (CHALLENGE_SPRINT_SECONDS * 1000);
    }
    clearChallengeSprintTimer();
    updateChallengeSprintUI();
    challengeSprintTimer = setInterval(() => {
      updateChallengeSprintUI();
    }, 300);
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
    return ensureTerminalPunctuation(`${defBase}, ${funNoLeadPunc}`);
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
    const readAll = [readDef, readFun].filter(Boolean).join(' ').replace(/\s+/g, ' ').trim();
    return { definition, funAddOn, line, readAll };
  }

  function syncRevealMeaningHighlight(nextEntry) {
    const wrap = _el('modal-meaning-highlight');
    const lineEl = _el('modal-meaning-highlight-line');
    if (!wrap || !lineEl) return;

    const meaning = getRevealMeaningPayload(nextEntry);
    lineEl.textContent = meaning.line;
    wrap.classList.toggle('hidden', !meaning.line);
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
      if (label) label.textContent = '0 / 3 missions complete';
      if (fill) fill.style.width = '0%';
      if (finishBtn) finishBtn.disabled = true;
      if (finishBtn) finishBtn.textContent = 'Finish Mission Lab';
      setChallengeFeedback('');
      updateChallengeWordCountUI();
      updateChallengeScoreUI();
      updateChallengeSprintUI();
      return;
    }
    const doneCount = ['listen', 'analyze', 'create']
      .reduce((count, task) => count + (revealChallengeState.tasks[task] ? 1 : 0), 0);
    if (label) label.textContent = `${doneCount} / 3 missions complete`;
    if (fill) fill.style.width = `${Math.round((doneCount / 3) * 100)}%`;
    if (finishBtn) {
      finishBtn.disabled = doneCount < 2;
      finishBtn.textContent = doneCount >= 2 ? `Finish Mission Lab (${doneCount}/3)` : 'Finish Mission Lab';
    }
    updateChallengeWordCountUI();
    updateChallengeScoreUI();
    updateChallengeSprintUI();
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
        setChallengeFeedback(`${CHALLENGE_TASK_LABELS[task] || 'Mission'} complete.`, 'good');
      } else {
        setChallengeFeedback(`${CHALLENGE_TASK_LABELS[task] || 'Mission'} needs a little more detail.`, 'warn');
      }
    }
    saveChallengeDraft(revealChallengeState);
    updateChallengeProgressUI();
  }

  function renderRevealChallengeModal() {
    const state = revealChallengeState;
    if (!state) return;
    const challenge = state.challenge;
    if (!challenge) return;

    const levelChip = _el('challenge-level-chip');
    const wordChip = _el('challenge-word-chip');
    const topicChip = _el('challenge-topic-chip');
    const gradeChip = _el('challenge-grade-chip');
    const listenPrompt = _el('challenge-listen-prompt');
    const analyzePrompt = _el('challenge-analyze-prompt');
    const createPrompt = _el('challenge-create-prompt');
    const teacherLens = _el('challenge-teacher-lens');
    const analyzeInput = _el('challenge-analyze-input');
    const createInput = _el('challenge-create-input');

    if (levelChip) levelChip.textContent = challenge.chip;
    if (wordChip) wordChip.textContent = `Word: ${state.word}`;
    if (topicChip) topicChip.textContent = `Quest focus: ${state.topic}`;
    if (gradeChip) gradeChip.textContent = `Grade: ${state.grade}`;
    if (listenPrompt) listenPrompt.textContent = `Hear "${state.word}" and its sentence clue, then say it back with clear pacing.`;
    if (analyzePrompt) analyzePrompt.textContent = challenge.prompt;
    if (createPrompt) createPrompt.textContent = `Create a student-friendly clue for "${state.word}" without saying the word itself.`;
    if (teacherLens) teacherLens.textContent = `${challenge.teacher} Mission Lab score updates live for formative evidence.`;
    if (analyzeInput && analyzeInput.value !== state.responses.analyze) analyzeInput.value = state.responses.analyze;
    if (createInput && createInput.value !== state.responses.create) createInput.value = state.responses.create;

    setChallengeTaskComplete('listen', !!state.tasks.listen);
    setChallengeTaskComplete('analyze', !!state.tasks.analyze);
    setChallengeTaskComplete('create', !!state.tasks.create);
    setChallengeFeedback('Tip: complete any 2 missions to bank points.', 'default');
    updateChallengeProgressUI();
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
      responses: { analyze: '', create: '' },
      score: { clarity: 0, evidence: 0, vocabulary: 0, total: 0 },
      sprintEndsAt: 0,
      completedAt: 0
    };
    const draft = loadChallengeDraft(state);
    if (draft) {
      state.responses = { ...state.responses, ...draft.responses };
      state.tasks = { ...state.tasks, ...draft.tasks };
    }
    return state;
  }

  function syncRevealChallengeLaunch(result) {
    const wrap = _el('modal-challenge-launch');
    const meta = _el('modal-challenge-launch-meta');
    const helper = _el('modal-challenge-launch-helper');
    if (!wrap || !meta) return;
    if (!isMissionLabEnabled()) {
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
    meta.textContent = `${next.topic} · Grade ${next.grade} · ${CHALLENGE_SPRINT_SECONDS}s sprint`;
    if (helper) {
      helper.textContent = 'Optional extension only: keep practicing this same phonics focus in a quick Mission Lab challenge.';
    }
    wrap.classList.remove('hidden');
    const hasDraft = countWords(next.responses.analyze) > 0 || countWords(next.responses.create) > 0;
    setChallengeFeedback(hasDraft ? 'Draft mission notes restored on this device.' : '');
    updateChallengeProgressUI();
  }

  function openRevealChallengeModal() {
    if (!isMissionLabEnabled()) return;
    if (!revealChallengeState) {
      if (isMissionLabStandaloneMode()) {
        startStandaloneMissionLab();
        return;
      }
      WQUI.showToast('Finish a word to unlock Mission Lab.');
      return;
    }
    if (!Number.isFinite(revealChallengeState.sprintEndsAt) || revealChallengeState.sprintEndsAt <= Date.now()) {
      revealChallengeState.sprintEndsAt = Date.now() + (CHALLENGE_SPRINT_SECONDS * 1000);
    }
    hideInformantHintCard();
    renderRevealChallengeModal();
    _el('challenge-modal')?.classList.remove('hidden');
    startChallengeSprint();
  }

  function closeRevealChallengeModal(options = {}) {
    clearChallengeSprintTimer();
    _el('challenge-modal')?.classList.add('hidden');
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
    const requireText = options.requireText !== false;
    const silent = !!options.silent;
    const analyzeText = String(_el('challenge-analyze-input')?.value || '').trim();
    const createText = String(_el('challenge-create-input')?.value || '').trim();
    revealChallengeState.responses.analyze = analyzeText;
    revealChallengeState.responses.create = createText;
    setChallengeTaskComplete('analyze', countWords(analyzeText) >= CHALLENGE_MIN_TEXT_WORDS);
    setChallengeTaskComplete('create', countWords(createText) >= CHALLENGE_MIN_TEXT_WORDS);
    if (requireText && !analyzeText && !createText) {
      setChallengeFeedback('Add at least one response before saving.', 'warn');
      return false;
    }
    const score = computeChallengeScore(revealChallengeState);
    const scoreBand = resolveMissionScoreBand(score.total);
    const saveTs = Date.now();
    const completedAt = Math.max(0, Number(revealChallengeState.completedAt) || 0);
    const doneCount = ['listen', 'analyze', 'create']
      .reduce((count, task) => count + (revealChallengeState.tasks[task] ? 1 : 0), 0);
    const completed = completedAt > 0 || doneCount >= 2;
    const completionTs = completedAt || saveTs;
    const sprintEndsAt = Math.max(0, Number(revealChallengeState.sprintEndsAt) || 0);
    const secondsLeft = sprintEndsAt > 0 ? Math.max(0, Math.ceil((sprintEndsAt - completionTs) / 1000)) : 0;
    const onTime = completed ? secondsLeft > 0 : false;
    const record = {
      attemptId: String(revealChallengeState.attemptId || ''),
      source: String(revealChallengeState.source || 'reveal').trim() || 'reveal',
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
      tasks: { ...revealChallengeState.tasks }
    };
    persistRevealChallengeRecord(record);
    saveChallengeDraft(revealChallengeState);
    renderSessionSummary();
    if (!silent) setChallengeFeedback('Mission notes saved on this device.', 'good');
    return true;
  }

  function finishRevealChallenge() {
    if (!revealChallengeState) return;
    if (revealChallengeState.completedAt) return;
    const doneCount = ['listen', 'analyze', 'create']
      .reduce((count, task) => count + (revealChallengeState.tasks[task] ? 1 : 0), 0);
    if (doneCount < 2) {
      setChallengeFeedback('Complete at least 2 mission steps first.', 'warn');
      return;
    }
    const finishBtn = _el('challenge-finish-btn');
    if (finishBtn) finishBtn.disabled = true;
    revealChallengeState.completedAt = Date.now();
    saveRevealChallengeResponses({ requireText: false, silent: true });
    const score = computeChallengeScore(revealChallengeState);
    const secondsLeft = Math.max(
      0,
      Math.ceil((Math.max(0, Number(revealChallengeState.sprintEndsAt) || 0) - revealChallengeState.completedAt) / 1000)
    );
    const finishedOnTime = secondsLeft > 0;
    let pointsEarned = Math.max(8, Math.round(score.total / 10) + (doneCount * 3));
    if (!finishedOnTime) pointsEarned = Math.max(6, pointsEarned - 4);
    const progress = loadChallengeProgress();
    progress.points += pointsEarned;
    const today = localDayKey();
    if (progress.lastWinDay !== today) {
      progress.streak = isConsecutiveDay(progress.lastWinDay, today) ? progress.streak + 1 : 1;
      progress.lastWinDay = today;
    }
    saveChallengeProgress(progress);
    const rank = resolveChallengeRank(progress.points);
    const line = pickRandom(CHALLENGE_COMPLETE_LINES) || 'Mission complete.';
    const timingLine = finishedOnTime
      ? 'On-time sprint bonus secured.'
      : 'Time was up, but your mission still counts.';
    setChallengeFeedback(`${line} +${pointsEarned} points · Rank ${rank.label}. ${timingLine}`, 'good');
    clearChallengeDraft(revealChallengeState);
    updateChallengeSprintUI();
    renderSessionSummary();
    setTimeout(() => {
      closeRevealChallengeModal({ silent: true });
    }, 900);
  }

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
      const options = customTracks.length
        ? customTracks
        : (catalog?.modeIndex?.[playMode] || []);
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
      if (token !== playbackToken || playMode !== mode || !catalog) return false;
      const track = chooseTrack(playMode);
      if (!track) return false;

      const player = ensureAudioEl();
      const resolvedTrackUrl = new URL(track.src, window.location.href).toString();
      if (player.src !== resolvedTrackUrl) player.src = track.src;
      player.currentTime = 0;
      setTrackVolume(track.gain);
      try {
        await player.play();
        activeTrackId = track.id;
        player.dataset.wqTrackGain = String(track.gain || 1);
        return true;
      } catch {
        return false;
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

      const startedCatalogTrack = await playCatalogTrack(playMode, token);
      if (token !== playbackToken || playMode !== mode) return;
      if (!startedCatalogTrack) {
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
  newGame();

})();
