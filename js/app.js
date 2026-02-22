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
  function loadPrefs() {
    try { return JSON.parse(localStorage.getItem(PREF_KEY) || '{}'); } catch { return {}; }
  }
  function savePrefs(p) {
    try { localStorage.setItem(PREF_KEY, JSON.stringify(p)); } catch {}
  }
  const prefs = loadPrefs();
  function setPref(k, v) { prefs[k] = v; savePrefs(prefs); }

  const _el = id => document.getElementById(id);
  const ThemeRegistry = window.WQThemeRegistry || null;

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

  // Apply saved values to selects
  const PREF_SELECTS = {
    's-grade': 'grade', 's-length': 'length',
    's-guesses': 'guesses', 's-case': 'caseMode', 's-hint': 'hint',
    's-dupe': 'dupe', 's-confetti': 'confetti',
    's-projector': 'projector', 's-motion': 'motion'
  };
  Object.entries(PREF_SELECTS).forEach(([id, key]) => {
    const el = _el(id);
    if (el && prefs[key] !== undefined) el.value = prefs[key];
  });

  const themeSelect = _el('s-theme');
  if (themeSelect && ThemeRegistry && typeof ThemeRegistry.renderThemeOptions === 'function') {
    ThemeRegistry.renderThemeOptions(themeSelect, prefs.theme || getThemeFallback());
  } else if (themeSelect && prefs.theme) {
    themeSelect.value = prefs.theme;
  }

  // Apply theme + modes immediately
  const initialTheme = applyTheme(prefs.theme || getThemeFallback());
  if (prefs.theme !== initialTheme) setPref('theme', initialTheme);
  applyProjector(prefs.projector || 'off');
  applyMotion(prefs.motion || 'fun');
  applyHint(prefs.hint || 'on');
  applyFeedback(prefs.feedback || 'classic');
  WQUI.setCaseMode(prefs.caseMode || 'lower');

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
    const select = _el('s-theme');
    if (select && select.value !== normalized) select.value = normalized;
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
    document.documentElement.setAttribute('data-feedback', mode);
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
    setPref('theme', normalized);
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
  _el('s-grade')?.addEventListener('change',   e => setPref('grade',    e.target.value));
  _el('s-length')?.addEventListener('change',  e => setPref('length',   e.target.value));
  _el('s-guesses')?.addEventListener('change', e => setPref('guesses',  e.target.value));
  _el('s-hint')?.addEventListener('change',    e => { setPref('hint',   e.target.value); applyHint(e.target.value); updateFocusHint(); });
  _el('s-dupe')?.addEventListener('change',    e => setPref('dupe',     e.target.value));
  _el('s-confetti')?.addEventListener('change',e => setPref('confetti', e.target.value));
  _el('s-feedback')?.addEventListener('change', e => { applyFeedback(e.target.value); setPref('feedback', e.target.value); });
  _el('s-music')?.addEventListener('change', e => { setPref('music', e.target.value); WQMusic.setMode(e.target.value); });
  _el('s-music-vol')?.addEventListener('input', e => { setPref('musicVol', e.target.value); WQMusic.setVolume(parseFloat(e.target.value)); });

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
      if (options.persist !== false) setPref('theme', normalized);
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

  // ─── 6. Focus hint ──────────────────────────────────
  const FOCUS_HINTS = {
    cvc:'CVC · short vowel', digraph:'sh, ch, th, wh',
    ccvc:'st, bl, tr, fl…', cvcc:'mp, nd, st, nk…',
    trigraph:'tch, dge, igh', cvce:'Magic E',
    vowel_team:'ai, ee, oa…', r_controlled:'ar, or, er…',
    diphthong:'oi, oy, ou…', floss:'ff, ll, ss',
    welded:'-ang, -ing, -ong', schwa:'unstressed vowel',
    prefix:'un-, re-, pre-…', suffix:'-ing, -ed, -er…',
    compound:'two words joined', multisyllable:'2+ syllables',
  };

  function updateFocusHint() {
    const hintEl   = _el('focus-hint');
    const focusVal = _el('setting-focus')?.value;
    const showHint = _el('s-hint')?.value === 'on';
    if (!hintEl) return;
    if (showHint && FOCUS_HINTS[focusVal]) {
      hintEl.textContent = FOCUS_HINTS[focusVal];
      hintEl.classList.remove('hidden');
    } else {
      hintEl.classList.add('hidden');
    }
  }

  _el('setting-focus')?.addEventListener('change', updateFocusHint);

  // ─── 7. New game ────────────────────────────────────
  function newGame() {
    const s = WQUI.getSettings();
    const result = WQGame.startGame(s);
    if (!result) {
      WQUI.showToast('No words found — try "All Words" or change the focus');
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
  }

  window.addEventListener('resize', () => {
    const s = WQGame.getState();
    if (s?.word) WQUI.calcLayout(s.wordLength, s.maxGuesses);
  });

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
        if (result.won || result.lost) {
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
  _el('g-hear-word')?.addEventListener('click',     () => WQAudio.playWord(entry()));
  _el('g-hear-sentence')?.addEventListener('click', () => WQAudio.playSentence(entry()));

  // Modal audio buttons
  _el('hear-word-btn')?.addEventListener('click',     () => WQAudio.playWord(entry()));
  _el('hear-def-btn')?.addEventListener('click',      () => WQAudio.playDef(entry()));
  _el('hear-sentence-btn')?.addEventListener('click', () => WQAudio.playSentence(entry()));
  _el('hear-fun-btn')?.addEventListener('click',      () => WQAudio.playFun(entry()));

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
    let mode = 'off';
    let vol = 0.35;

    const ensure = () => {
      if (ctx) return;
      ctx = new (window.AudioContext || window.webkitAudioContext)();
      gain = ctx.createGain();
      gain.gain.value = vol;
      gain.connect(ctx.destination);
      // Auto-resume on user gesture
      const resume = () => { if (ctx.state === 'suspended') ctx.resume(); };
      document.addEventListener('pointerdown', resume, { once:true });
      document.addEventListener('keydown', resume, { once:true });
    };

    const beep = (freq, dur=0.12, type='sine') => {
      if (!ctx || !gain) return;
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.type = type;
      o.frequency.value = freq;
      g.gain.value = 0.0001;
      o.connect(g); g.connect(gain);
      const t = ctx.currentTime;
      g.gain.exponentialRampToValueAtTime(0.18, t + 0.01);
      g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      o.start(t);
      o.stop(t + dur + 0.02);
    };

    const patterns = {
      lofi:  [220, 0, 247, 0, 196, 0, 220, 0],
      arcade:[523, 659, 784, 659, 523, 392, 523, 659],
      fantasy:[262, 330, 392, 330, 440, 392, 330, 262],
      scifi: [440, 0, 880, 0, 660, 0, 990, 0],
      sports:[392, 392, 523, 392, 659, 523, 784, 659],
    };

    const start = () => {
      stop();
      if (mode === 'off') return;
      ensure();
      let i = 0;
      interval = setInterval(() => {
        const seq = patterns[mode] || patterns.lofi;
        const f = seq[i % seq.length];
        if (f) beep(f, 0.11, mode === 'arcade' ? 'square' : 'sine');
        i++;
      }, mode === 'lofi' ? 420 : 260);
    };

    const stop = () => { if (interval) clearInterval(interval); interval = null; };

    return {
      setMode(m){ mode = m; start(); },
      setVolume(v){ vol = Math.max(0, Math.min(1, v)); if (gain) gain.gain.value = vol; },
      initFromPrefs(p){
        mode = p.music || 'off';
        vol = parseFloat(p.musicVol ?? '0.35');
        // do not autoplay unless user picked a mode
        if (mode !== 'off') start();
        this.setVolume(vol);
      }
    };
  })();
// ─── 12. Start ───────────────────────────────────────
  WQAudio.setVoiceMode(prefs.voice || 'recorded');
  if (typeof WQAudio.primeAudioManifest === 'function') {
    void WQAudio.primeAudioManifest();
  }
  WQMusic.initFromPrefs(prefs);
  newGame();

})();
