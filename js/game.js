/**
 * game.js — Word Quest v2
 * Core game logic. No audio, no UI chrome — just the game.
 * Ported from the working logic in the existing app.js.
 */

const WQGame = (() => {

  // ─── State ─────────────────────────────────────────────────────────
  let currentWord    = '';
  let currentEntry   = null;
  let currentGuess   = '';
  let guesses        = [];
  let gameOver       = false;
  let maxGuesses     = 6;
  let wordLength     = 5;
  let lastStartError = null;

  // Shuffle bag — prevents same word repeating
  const BAG_KEY = 'wq_v2_shuffle_bag';

  function _shuffleList(arr) {
    const a = [...arr];
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }

  function _readBag(scope) {
    try {
      const saved = JSON.parse(localStorage.getItem(`${BAG_KEY}:${scope}`) || '{}');
      return Array.isArray(saved.queue) ? saved : { queue: [], last: '' };
    } catch { return { queue: [], last: '' }; }
  }

  function _writeBag(scope, state) {
    try {
      localStorage.setItem(`${BAG_KEY}:${scope}`, JSON.stringify(state));
    } catch { /* storage full — silent */ }
  }

  function _pickWord(pool, scope) {
    if (!pool.length) return null;
    const state  = _readBag(scope);
    let queue = state.queue.filter(w => pool.includes(w));
    if (!queue.length) {
      queue = _shuffleList(pool);
      // Avoid repeating the last word
      if (queue.length > 1 && queue[queue.length - 1] === state.last) {
        [queue[0], queue[queue.length - 1]] = [queue[queue.length - 1], queue[0]];
      }
    }
    const next = queue.pop();
    _writeBag(scope, { queue, last: next });
    return next;
  }

  function _getTeacherPool() {
    const raw = Array.isArray(window.__WQ_TEACHER_POOL__) ? window.__WQ_TEACHER_POOL__ : [];
    const normalized = raw
      .map((word) => String(word || '').trim().toLowerCase())
      .filter((word) => /^[a-z]{2,12}$/.test(word));
    return Array.from(new Set(normalized));
  }

  // ─── Core algorithm — ported verbatim from evaluate() ──────────────
  function _evaluate(guess, target) {
    const res  = Array(target.length).fill('absent');
    const tArr = target.split('');
    const gArr = guess.split('');

    // Pass 1: exact matches
    gArr.forEach((c, i) => {
      if (c === tArr[i]) {
        res[i]  = 'correct';
        tArr[i] = null;
        gArr[i] = null;
      }
    });
    // Pass 2: present but wrong position
    gArr.forEach((c, i) => {
      if (c && tArr.includes(c)) {
        res[i] = 'present';
        tArr[tArr.indexOf(c)] = null;
      }
    });
    return res;
  }

  // ─── Progress tracking ─────────────────────────────────────────────
  const PROGRESS_KEY = 'wq_v2_progress';

  function _saveProgress(word, won, guessCount) {
    try {
      const data = JSON.parse(localStorage.getItem(PROGRESS_KEY) || '{}');
      const today = new Date().toISOString().slice(0, 10);
      if (!data[today]) data[today] = { words: [], wins: 0, total: 0 };
      data[today].words.push({ word, won, guesses: guessCount, ts: Date.now() });
      data[today].total++;
      if (won) data[today].wins++;
      // Keep 90 days of data
      const keys = Object.keys(data).sort();
      while (keys.length > 90) delete data[keys.shift()];
      localStorage.setItem(PROGRESS_KEY, JSON.stringify(data));
      return data;
    } catch { return {}; }
  }

  function getProgress() {
    try {
      return JSON.parse(localStorage.getItem(PROGRESS_KEY) || '{}');
    } catch { return {}; }
  }

  // ─── Public start/input API ────────────────────────────────────────
  function startGame(opts = {}) {
    lastStartError = null;
    const gradeBand = opts.gradeBand || localStorage.getItem('wq_v2_grade_band') || 'all';
    const lengthPref = opts.length   || localStorage.getItem('wq_v2_length')     || 'any';
    const phonics    = opts.phonics  || 'all';
    const normalizedPhonics = String(phonics || '').trim().toLowerCase();
    const includeLowerBands = normalizedPhonics !== 'all' && !normalizedPhonics.startsWith('vocab-');
    const teacherPool = _getTeacherPool();
    let effectiveLengthPref = lengthPref;
    let pool = [];
    if (teacherPool.length) {
      pool = teacherPool.slice();
      effectiveLengthPref = 'teacher';
    } else {
      pool = WQData.getPlayableWords({
        gradeBand,
        length: lengthPref,
        phonics,
        includeLowerBands
      });
      if (!pool.length && effectiveLengthPref !== 'any' && normalizedPhonics !== 'all') {
        const relaxed = WQData.getPlayableWords({
          gradeBand,
          length: 'any',
          phonics,
          includeLowerBands
        });
        if (relaxed.length) {
          pool = relaxed;
          effectiveLengthPref = 'any';
        }
      }
    }
    const scopeGrade = includeLowerBands && gradeBand !== 'all'
      ? `${gradeBand}+down`
      : gradeBand;
    const scopePrefix = teacherPool.length ? 'teacher' : scopeGrade;
    const scope      = `${scopePrefix}:${effectiveLengthPref}:${phonics}`;
    if (!pool.length) {
      const hasFilters = gradeBand !== 'all' || lengthPref !== 'any' || phonics !== 'all';
      if (hasFilters) {
        lastStartError = {
          code: 'EMPTY_FILTERED_POOL',
          gradeBand,
          length: lengthPref,
          phonics
        };
        console.warn('[WQGame] Empty filtered pool — strict gate blocks fallback to all words');
        return false;
      }
      console.warn('[WQGame] Empty unfiltered pool.');
    }
    const word = _pickWord(pool, scope);

    if (!word) {
      console.error('[WQGame] Could not pick a word');
      lastStartError = {
        code: 'NO_WORD_PICKED',
        gradeBand,
        length: lengthPref,
        phonics
      };
      return false;
    }

    currentWord  = word;
    currentEntry = WQData.getEntry(word);
    currentGuess = '';
    guesses      = [];
    gameOver     = false;
    wordLength   = word.length;
    maxGuesses   = opts.maxGuesses || 6;

    return { word, entry: currentEntry, wordLength, maxGuesses };
  }

  function getLastStartError() {
    return lastStartError ? { ...lastStartError } : null;
  }

  function addLetter(letter) {
    if (gameOver) return null;
    if (currentGuess.length >= wordLength) return null;
    currentGuess += letter.toLowerCase();
    return { guess: currentGuess };
  }

  function deleteLetter() {
    if (gameOver) return null;
    if (!currentGuess.length) return null;
    currentGuess = currentGuess.slice(0, -1);
    return { guess: currentGuess };
  }

  function submitGuess() {
    if (gameOver) return null;
    if (currentGuess.length !== wordLength) {
      return { error: 'too_short' };
    }

    const result = _evaluate(currentGuess, currentWord);
    const won    = currentGuess === currentWord;
    guesses.push(currentGuess);

    const state = {
      result,
      guess:    currentGuess,
      guesses:  [...guesses],
      won,
      lost:     !won && guesses.length >= maxGuesses,
      word:     currentWord,
      entry:    currentEntry,
    };

    if (won || state.lost) {
      gameOver = true;
      _saveProgress(currentWord, won, guesses.length);
    } else {
      currentGuess = '';
    }

    return state;
  }

  function getState() {
    return {
      word:        currentWord,
      entry:       currentEntry,
      guess:       currentGuess,
      guesses:     [...guesses],
      gameOver,
      wordLength,
      maxGuesses,
    };
  }

  return { startGame, getLastStartError, addLetter, deleteLetter, submitGuess, getState, getProgress };
})();
