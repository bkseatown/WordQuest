/**
 * audio.js — Word Quest v2
 * Smart voice selection: prefers neural/enhanced/premium voices.
 * No robotic browser default — finds the best available.
 * Falls back gracefully if nothing good is found.
 */

const WQAudio = (() => {

  const VOICE_PREF_KEY = 'wq_v2_voice';
  const VOICE_MODE_KEY = "wq_voice_mode_v1";
  const AUDIO_MANIFEST_URL = './data/audio-manifest.json';
  const ALLOWED_VOICE_MODES = new Set(["recorded", "auto", "device", "off"]);
  function _normalizeVoiceMode(mode) {
    const normalized = String(mode || "").toLowerCase().trim();
    return ALLOWED_VOICE_MODES.has(normalized) ? normalized : "recorded";
  }
  let _voiceMode = _normalizeVoiceMode(localStorage.getItem(VOICE_MODE_KEY) || "recorded");
  let _selectedVoice = null;
  let _allVoices = [];
  let _voicesReady = false;
  let _audioManifestSet = null;
  let _audioManifestReady = false;
  let _audioManifestLoad = null;
  let _assetBasePath = null;

  function _getAssetBasePath() {
    if (_assetBasePath !== null) return _assetBasePath;
    const pathname = window.location.pathname || '/';
    let base = '';
    if (pathname.endsWith('/')) {
      base = pathname.slice(0, -1);
    } else {
      const last = pathname.split('/').pop() || '';
      if (last.includes('.')) {
        base = pathname.slice(0, -(last.length + 1));
      } else {
        base = pathname;
      }
    }
    _assetBasePath = base === '/' ? '' : base;
    return _assetBasePath;
  }

  function _normalizeAudioPath(path) {
    if (!path || typeof path !== 'string') return null;
    const raw = path.trim();
    if (!raw) return null;
    if (/^(https?:)?\/\//i.test(raw) || raw.startsWith('blob:') || raw.startsWith('data:')) {
      return raw;
    }
    if (raw.startsWith('./') || raw.startsWith('../')) {
      try {
        return new URL(raw, window.location.href).pathname;
      } catch {
        return raw;
      }
    }
    const base = _getAssetBasePath();
    const normalized = raw.startsWith('/') ? raw : `/${raw}`;
    if (!base) return normalized;
    if (normalized.startsWith(`${base}/`) || normalized === base) return normalized;
    if (normalized.startsWith('/assets/')) return `${base}${normalized}`;
    return normalized;
  }

  async function _primeAudioManifest() {
    if (_audioManifestReady) return _audioManifestSet;
    if (_audioManifestLoad) return _audioManifestLoad;
    _audioManifestLoad = (async () => {
      try {
        const res = await fetch(AUDIO_MANIFEST_URL, { cache: 'no-store' });
        if (!res.ok) throw new Error(`Manifest request failed: ${res.status}`);
        const manifest = await res.json();
        const paths = Array.isArray(manifest?.paths) ? manifest.paths : [];
        _audioManifestSet = new Set(
          paths.map((p) => _normalizeAudioPath(p)).filter(Boolean)
        );
      } catch {
        _audioManifestSet = null;
      } finally {
        _audioManifestReady = true;
      }
      return _audioManifestSet;
    })();
    return _audioManifestLoad;
  }

  function _isKnownAudioPath(path) {
    if (!_audioManifestSet) return null;
    return _audioManifestSet.has(path);
  }

  // Score a voice by quality (higher = better)
  function _scoreVoice(v) {
    const n = (v.name || '').toLowerCase();
    const l = (v.lang || '').toLowerCase();
    let s = 0;

    // Language preference: en-US > en-GB > en-* > other
    if (l === 'en-us') s += 20;
    else if (l.startsWith('en-')) s += 12;
    else if (!l.startsWith('en')) return -999; // non-English: skip

    // Neural / premium voices (macOS Ventura+, iOS 17+, Windows 11)
    if (n.includes('neural'))    s += 30;
    if (n.includes('premium'))   s += 28;
    if (n.includes('enhanced'))  s += 22;
    if (n.includes('natural'))   s += 18;

    // Known high-quality named voices
    if (n.includes('samantha'))  s += 16; // macOS default, sounds good
    if (n.includes('karen'))     s += 15; // macOS
    if (n.includes('daniel'))    s += 15; // macOS/iOS
    if (n.includes('ava'))       s += 14; // macOS/iOS neural
    if (n.includes('allison'))   s += 14; // macOS
    if (n.includes('siri'))      s += 12; // iOS native
    if (n.includes('microsoft')) s += 10; // Windows voices tend to be clear
    if (n.includes('google'))    s += 10; // Android

    // Penalise known low-quality voices
    if (n.includes('compact'))   s -= 15;
    if (n.includes('espeak'))    s -= 20;

    // Slight bonus for default system voice
    if (v.default) s += 3;

    return s;
  }

  function _loadVoices() {
    _allVoices = window.speechSynthesis.getVoices();
    if (!_allVoices.length) return;
    _voicesReady = true;

    const avaVoices = _allVoices
      .filter((voice) => /^en(-|$)/i.test(String(voice.lang || '')) && /\bava\b/i.test(String(voice.name || '')))
      .map((voice) => ({ voice, score: _scoreVoice(voice) }))
      .sort((a, b) => b.score - a.score);
    const preferredAvaVoice = avaVoices[0]?.voice || null;

    // Apply saved preference, or pick best automatically
    const saved = localStorage.getItem(VOICE_PREF_KEY);
    if (saved && saved !== 'auto') {
      _selectedVoice = _allVoices.find(v => v.name === saved) || null;
    }
    // Keep reveal voice on Ava when the device provides one.
    if (preferredAvaVoice && !_selectedVoice) {
      _selectedVoice = preferredAvaVoice;
    } else if (
      preferredAvaVoice &&
      _selectedVoice &&
      !/\bava\b/i.test(String(_selectedVoice.name || ''))
    ) {
      _selectedVoice = preferredAvaVoice;
    }
    if (!_selectedVoice) {
      const ranked = [..._allVoices]
        .map(v => ({ v, score: _scoreVoice(v) }))
        .filter(x => x.score > -999)
        .sort((a, b) => b.score - a.score);
      _selectedVoice = ranked[0]?.v || null;
    }
  }

  // Voices load asynchronously on many browsers
  if (window.speechSynthesis) {
    window.speechSynthesis.onvoiceschanged = _loadVoices;
    _loadVoices(); // try immediately too
  }

  // ─── Playback ───────────────────────────────────
  let _active = null;

  function _stop() {
    if (_active) { _active.pause(); _active.currentTime = 0; _active = null; }
    if (window.speechSynthesis) window.speechSynthesis.cancel();
  }

  function _playFile(path) {
    return new Promise((res, rej) => {
      _stop();
      const a = new Audio(path);
      a.preload = 'auto';
      _active = a;
      a.onended = () => { _active = null; res(); };
      a.onerror = () => { _active = null; rej(); };
      a.play().catch(rej);
    });
  }

  function _speak(text, rate = 0.88, pitch = 1, options = {}) {
    return new Promise(res => {
      const stopFirst = options.stopFirst !== false;
      if (stopFirst) {
        _stop();
      } else {
        if (_active) { res(false); return; }
        if (window.speechSynthesis && (window.speechSynthesis.speaking || window.speechSynthesis.pending)) {
          res(false);
          return;
        }
      }
      if (!window.speechSynthesis) { res(); return; }
      if (!_voicesReady) _loadVoices();

      const utt = new SpeechSynthesisUtterance(text);
      utt.rate  = rate;
      utt.pitch = pitch;
      utt.lang  = 'en-US';
      if (_selectedVoice) utt.voice = _selectedVoice;
      utt.onend   = () => res(true);
      utt.onerror = () => res(false);
      window.speechSynthesis.speak(utt);
    });
  }

  async function _play(path, fallback, rate = 0.88) {
    const mode = _normalizeVoiceMode(_voiceMode || 'recorded');
    if (mode === 'off') {
      _stop();
      return;
    }
    const allowRecorded = mode !== 'device';
    const allowFallbackTTS = mode !== 'recorded';
    const resolvedPath = _normalizeAudioPath(path);

    void _primeAudioManifest();

    if (allowRecorded && resolvedPath) {
      const known = _isKnownAudioPath(resolvedPath);
      if (known !== false) {
        try { await _playFile(resolvedPath); return; } catch { /* fall through */ }
      }
    }

    if (allowFallbackTTS && fallback) await _speak(fallback, rate, 1, { stopFirst: true });
  }

  function _normalizeSpeechText(value) {
    return String(value || '').replace(/\s+/g, ' ').trim();
  }

  function _ensureTerminalPunctuation(value) {
    const text = _normalizeSpeechText(value);
    if (!text) return '';
    return /[.!?]$/.test(text) ? text : `${text}.`;
  }

  async function playMeaningBundle(entry, options = {}) {
    const includeFun = options.includeFun !== false;
    const allowFallbackInRecorded = options.allowFallbackInRecorded === true;
    const mode = _normalizeVoiceMode(_voiceMode || 'recorded');
    if (mode === 'off') {
      _stop();
      return false;
    }

    const definition = _normalizeSpeechText(entry?.definition);
    const funText = includeFun ? _normalizeSpeechText(entry?.fun_add_on) : '';
    const readDefinition = _normalizeSpeechText(entry?.text_to_read_definition)
      || _ensureTerminalPunctuation(entry?.word && definition ? `${entry.word}. ${definition}` : definition);
    const readFun = includeFun
      ? _normalizeSpeechText(entry?.text_to_read_fun) || funText
      : '';
    const fallbackText = _normalizeSpeechText(options.fallbackText)
      || _normalizeSpeechText([readDefinition, readFun].filter(Boolean).join(' '));

    const canUseRecorded = mode !== 'device';
    const allowTtsFallback = mode !== 'recorded' || allowFallbackInRecorded;
    const defPath = _normalizeAudioPath(entry?.audio?.def);
    const funPath = includeFun ? _normalizeAudioPath(entry?.audio?.fun) : null;
    const hasDefRecorded = canUseRecorded && !!defPath && _isKnownAudioPath(defPath) !== false;
    const hasFunRecorded = includeFun && !!readFun && canUseRecorded && !!funPath && _isKnownAudioPath(funPath) !== false;

    // If both recorded clips exist, keep the natural studio voice.
    if (hasDefRecorded && (!readFun || hasFunRecorded)) {
      try {
        await _playFile(defPath);
        if (readFun && hasFunRecorded) await _playFile(funPath);
        return true;
      } catch {
        // Fall through to TTS fallback.
      }
    }

    if (allowTtsFallback && fallbackText) {
      const spoken = await _speak(fallbackText, 0.9, 1, { stopFirst: true });
      if (spoken) return true;
    }

    // If TTS fallback is disabled, attempt whatever recorded audio is available.
    if (hasDefRecorded) {
      try {
        await _playFile(defPath);
        if (readFun && hasFunRecorded) await _playFile(funPath);
        return true;
      } catch {
        return false;
      }
    }

    return false;
  }

  async function playCoachPhrase(input = {}, options = {}) {
    const mode = _normalizeVoiceMode(_voiceMode || 'recorded');
    if (mode === 'off') {
      _stop();
      return false;
    }

    const text = _normalizeSpeechText(input?.text || input?.phrase || '');
    const clipPath = _normalizeAudioPath(input?.clip || input?.audio || input?.path || '');
    const allowRecorded = mode !== 'device';
    const allowFallbackTTS = options.allowFallbackTTS !== false;

    void _primeAudioManifest();

    if (allowRecorded && clipPath) {
      const known = _isKnownAudioPath(clipPath);
      if (known !== false) {
        try {
          await _playFile(clipPath);
          return true;
        } catch {
          // Fall through to speech fallback.
        }
      }
    }

    if (allowFallbackTTS && text) {
      return !!(await _speak(text, 0.92, 1, { stopFirst: true }));
    }

    return false;
  }

  // ─── Public API ─────────────────────────────────
  function playWord(entry)     { return _play(entry?.audio?.word,     entry?.word,        0.82); }
  function playDef(entry)      { return _play(entry?.audio?.def,      entry ? `${entry.word}. ${entry.definition}` : '', 0.9); }
  function playSentence(entry) { return _play(entry?.audio?.sentence, entry?.sentence,    0.9);  }
  function playFun(entry)      { return _play(entry?.audio?.fun,      entry?.fun_add_on,  0.9);  }
  function stop()              { _stop(); }
  // Gameplay cue speech is intentionally disabled.
  // Keep API shape for backward compatibility with older callers.
  function speakCue() {
    return Promise.resolve(false);
  }

  // Returns list of English voices for settings UI
  function getAvailableVoices() {
    if (!_voicesReady) _loadVoices();
    return _allVoices
      .filter(v => v.lang.startsWith('en'))
      .sort((a, b) => _scoreVoice(b) - _scoreVoice(a));
  }

  function setVoiceMode(mode){
    _voiceMode = _normalizeVoiceMode(mode);
    try{ localStorage.setItem(VOICE_MODE_KEY, _voiceMode); }catch(e){}
  }
  function getVoiceMode(){ return _normalizeVoiceMode(_voiceMode || "recorded"); }

  function setVoiceByName(name) {
    if (name === 'auto') {
      localStorage.removeItem(VOICE_PREF_KEY);
      _selectedVoice = null;
      _loadVoices();
    } else {
      const v = _allVoices.find(v => v.name === name);
      if (v) { _selectedVoice = v; localStorage.setItem(VOICE_PREF_KEY, name); }
    }
  }

  function getCurrentVoiceName() {
    return _selectedVoice?.name || 'auto';
  }

  function getAudioManifestStatus() {
    return {
      ready: _audioManifestReady,
      entries: _audioManifestSet?.size || 0,
      basePath: _getAssetBasePath()
    };
  }

  return { playWord, playDef, playSentence, playFun, playMeaningBundle, playCoachPhrase, stop, speakCue,
           setVoiceMode, getVoiceMode,
           getAvailableVoices, setVoiceByName, getCurrentVoiceName,
           primeAudioManifest: _primeAudioManifest,
           getAudioManifestStatus };
})();
