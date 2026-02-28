/**
 * ui.js — Word Quest v2
 * Board/keyboard share --playfield-width token.
 * Jiggle on type, flip on reveal.
 * Key inflate/deflate by state.
 * Vowel ring removed once state applied.
 */

const WQUI = (() => {

  const VOWELS = new Set(['a','e','i','o','u']);

  // GBoard: ⌫ left, Enter right
  const KEY_ROWS_QWERTY = [
    ['q','w','e','r','t','y','u','i','o','p'],
    ['a','s','d','f','g','h','j','k','l'],
    ['⌫','z','x','c','v','b','n','m','Enter']
  ];
  const KEY_ROWS_ALPHABET = [
    ['a','b','c','d','e','f','g','h','i'],
    ['j','k','l','m','n','o','p','q','r'],
    ['⌫','s','t','u','v','w','x','y','z','Enter']
  ];
  const KEY_ROWS_ALPHABET_ARC = [
    ['a','b','c','d','e','f','g','h'],
    ['i','j','k','l','m','n','o','p','q','r'],
    ['⌫','s','t','u','v','w','x','y','z','Enter']
  ];
  const KEY_ROWS_SOUNDCARD = [
    ['a','b','c','d','e','f','g','h','i'],
    ['j','k','l','m','n','o','p','q','r'],
    ['s','t','u','v','w','x','y','z','⌫','Enter']
  ];
  const SOUNDCARD_QUICK_CHUNKS = Object.freeze({
    default: ['sh', 'ch', 'th', 'wh', 'ck', 'qu'],
    digraph: ['sh', 'ch', 'th', 'wh', 'ph', 'ck'],
    ccvc: ['bl', 'tr', 'st', 'dr', 'sl', 'cl'],
    cvcc: ['mp', 'nd', 'st', 'nt', 'nk', 'lt'],
    trigraph: ['tch', 'dge', 'igh', 'ear', 'air', 'ure'],
    vowel_team: ['ai', 'ee', 'oa', 'ea', 'ie', 'ou'],
    r_controlled: ['ar', 'or', 'er', 'ir', 'ur', 'ear'],
    diphthong: ['oi', 'oy', 'ou', 'ow', 'au', 'aw'],
    floss: ['ff', 'll', 'ss', 'zz', 'ck', 'tch'],
    welded: ['ang', 'ing', 'ank', 'ink', 'ong', 'ung']
  });

  let _board, _keyboard, _modal, _overlay, _toast;
  let _caseMode = 'lower';
  let _toastTimer = null;

  const _el = id => document.getElementById(id);
  const _fmt = letter => _caseMode === 'upper' ? letter.toUpperCase() : letter.toLowerCase();

  function getSoundCardQuickChunks() {
    const focusValue = String(_el('setting-focus')?.value || '').toLowerCase();
    return SOUNDCARD_QUICK_CHUNKS[focusValue] || SOUNDCARD_QUICK_CHUNKS.default;
  }

  // ─── Toast ──────────────────────────────────────
  function showToast(msg, duration = 2200) {
    if (!_toast) return;
    _toast.textContent = msg;
    _toast.classList.add('visible');
    clearTimeout(_toastTimer);
    _toastTimer = setTimeout(() => _toast.classList.remove('visible'), duration);
  }

  // ─── Board ──────────────────────────────────────
  function buildBoard(wordLength, maxGuesses) {
    _board.innerHTML = '';
    _board.style.setProperty('--word-length', wordLength);
    _board.style.setProperty('--max-guesses', maxGuesses);
    for (let i = 0; i < maxGuesses * wordLength; i++) {
      const t = document.createElement('div');
      t.className = 'tile';
      t.id = `tile-${i}`;
      _board.appendChild(t);
    }
  }

  // Updates ONLY the active input row — never touches revealed rows
  function updateCurrentRow(guess, wordLength, activeRow) {
    for (let col = 0; col < wordLength; col++) {
      const t = _el(`tile-${activeRow * wordLength + col}`);
      if (!t) continue;
      if (t.classList.contains('correct') || t.classList.contains('present') || t.classList.contains('absent')) continue;

      const letter = guess[col] || '';
      const hadLetter = t.classList.contains('filled');
      const hasLetter = !!letter;

      t.textContent = letter ? _fmt(letter) : '';

      if (hasLetter && !hadLetter) {
        t.classList.add('filled');
        // Jiggle on new letter input
        t.classList.remove('just-typed');
        void t.offsetWidth;
        t.classList.add('just-typed');
        setTimeout(() => t.classList.remove('just-typed'), 260);
      } else if (!hasLetter) {
        t.classList.remove('filled');
      }
    }
  }

  // Flip reveal with staggered timing
  function revealRow(guess, result, row, wordLength, onDone) {
    const STAGGER = 200;
    result.forEach((status, col) => {
      const t = _el(`tile-${row * wordLength + col}`);
      if (!t) return;
      t.textContent = _fmt(guess[col]);
      setTimeout(() => {
        t.classList.add('flip');
        setTimeout(() => {
          t.classList.remove('flip', 'filled', 'just-typed');
          t.classList.add(status, 'wq-reveal');
          setTimeout(()=>t.classList.remove('wq-reveal'), 260);
        }, 230);
      }, col * STAGGER);
    });
    if (onDone) setTimeout(onDone, result.length * STAGGER + 280);
  }

  function shakeRow(guesses, wordLength) {
    const row = guesses.length;
    for (let col = 0; col < wordLength; col++) {
      const t = _el(`tile-${row * wordLength + col}`);
      if (!t) continue;
      t.classList.remove('shake');
      void t.offsetWidth;
      t.classList.add('shake');
      setTimeout(() => t.classList.remove('shake'), 450);
    }
  }

  // ─── Keyboard ───────────────────────────────────
  function buildKeyboard() {
    _keyboard.innerHTML = '';
    const layoutRaw = String(document.documentElement.getAttribute('data-keyboard-layout') || 'standard').toLowerCase();
    const layout = layoutRaw === 'qwerty' ? 'standard' : layoutRaw;
    const soundCard = layout === 'wilson';
    const rows = soundCard
      ? KEY_ROWS_SOUNDCARD
      : layout === 'alphabet'
        ? KEY_ROWS_ALPHABET
        : layout === 'alphabet-arc'
          ? KEY_ROWS_ALPHABET_ARC
          : KEY_ROWS_QWERTY;

    if (soundCard) {
      const chunkRow = document.createElement('div');
      chunkRow.className = 'key-row key-row-chunks';
      getSoundCardQuickChunks().forEach((chunk) => {
        const chunkBtn = document.createElement('button');
        chunkBtn.className = 'key key-chunk';
        chunkBtn.type = 'button';
        chunkBtn.dataset.key = chunk;
        chunkBtn.dataset.seq = chunk;
        chunkBtn.textContent = _fmt(chunk);
        chunkBtn.addEventListener('pointerdown', () => {
          chunkBtn.classList.add('bounce');
          setTimeout(() => chunkBtn.classList.remove('bounce'), 160);
        });
        chunkRow.appendChild(chunkBtn);
      });
      _keyboard.appendChild(chunkRow);
    }

    rows.forEach((row, rowIndex) => {
      const rowEl = document.createElement('div');
      rowEl.className = `key-row key-row-${rowIndex + 1}`;
      row.forEach(key => {
        const btn = document.createElement('button');
        btn.className = 'key';
        btn.type = 'button';
        btn.dataset.key = key;
        if (/^[a-z]$/i.test(key)) btn.dataset.letter = key.toLowerCase();

        if (key === '⌫') {
          btn.textContent = '⌫';
          if (layout === 'standard') btn.classList.add('wide');
        } else if (key === 'Enter') {
          btn.textContent = 'Enter';
          if (layout === 'standard') btn.classList.add('wide');
        } else {
          btn.textContent = _fmt(key);
          if (key.length > 1) {
            btn.dataset.seq = key.toLowerCase();
          }
          if (VOWELS.has(key)) btn.classList.add('vowel', 'is-vowel');
        }

        btn.addEventListener('pointerdown', () => {
          btn.classList.add('bounce');
          setTimeout(() => btn.classList.remove('bounce'), 160);
        });

        rowEl.appendChild(btn);
      });
      _keyboard.appendChild(rowEl);
    });
  }

  function clearKeyboard() {
    _keyboard.querySelectorAll('.key').forEach(k => {
      k.classList.remove('correct','present','absent','in-play','dupe-pulse');
    });
  }

  // Update key states + inflate/deflate after each guess
  function updateKeyboard(result, guess) {
    result.forEach((status, i) => {
      const k = _keyboard.querySelector(`.key[data-key="${guess[i]}"]`);
      if (!k) return;
      if (status === 'correct') {
        k.classList.remove('present','absent','in-play');
        k.classList.add('correct');
      } else if (status === 'present' && !k.classList.contains('correct')) {
        k.classList.remove('absent');
        k.classList.add('present');
      } else if (status === 'absent' &&
                 !k.classList.contains('correct') &&
                 !k.classList.contains('present')) {
        k.classList.add('absent');
      }
    });

    // Inflate remaining unknown letters
    _keyboard.querySelectorAll('.key').forEach(k => {
      const key = k.dataset.key;
      if (!key || key.length > 1) return;
      const isGone    = k.classList.contains('absent');
      const isCorrect = k.classList.contains('correct');
      const isPresent = k.classList.contains('present');
      const isUnknown = !isGone && !isCorrect && !isPresent;

      if (isUnknown) {
        k.classList.add('in-play');
      } else {
        k.classList.remove('in-play');
      }
    });
  }

  function pulseDupeKey(letter) {
    const k = _keyboard.querySelector(`.key[data-key="${letter}"]`);
    if (k) {
      k.classList.remove('absent');
      k.classList.add('in-play', 'dupe-pulse');
    }
  }

  // ─── Modal ──────────────────────────────────────
  function showModal(state) {
    const { won, word, entry, guesses } = state;

    _el('modal-result').textContent  = won ? '🎉 You got it!' : 'Nice try!';
    _el('modal-guesses').textContent = won
      ? `Solved in ${guesses.length} guess${guesses.length === 1 ? '' : 'es'}`
      : 'The word was:';

    const wordEl = _el('modal-word');
    if (wordEl) {
      wordEl.innerHTML = word.toUpperCase().split('')
        .map((ch, i) => `<span style="--i:${i}">${ch}</span>`).join('');
    }

    const sylEl = _el('modal-syllables');
    if (sylEl) {
      const syl = entry?.syllables && entry.syllables !== word
        ? entry.syllables.replace(/-/g, ' • ') : '';
      sylEl.textContent  = syl;
      sylEl.style.display = syl ? '' : 'none';
    }

    const badgeEl = _el('modal-badge');
    if (badgeEl) {
      const parts = [entry?.grade_band, entry?.tier].filter(Boolean);
      badgeEl.textContent   = parts.join(' · ');
      badgeEl.style.display = parts.length ? '' : 'none';
    }

    _el('modal-def').textContent      = entry?.definition || '';
    _el('modal-sentence').textContent = entry?.sentence ? `"${entry.sentence}"` : '';

    const funEl   = _el('modal-fun');
    const funWrap = _el('modal-fun-wrap');
    if (funEl && funWrap) {
      const fun = entry?.fun_add_on || '';
      funEl.textContent     = fun;
      funWrap.style.display = fun ? '' : 'none';
    }

    _overlay.classList.remove('hidden');
    _modal.classList.remove('hidden');
    _modal.classList.toggle('win', won);
    _modal.classList.toggle('loss', !won);
  }

  function hideModal() {
    _modal.classList.add('hidden');
    _overlay.classList.add('hidden');
  }

  // ─── Shared playfield width + tile size calculator ───
  function calcLayout(wordLength, maxGuesses) {
    const headerH    = _el('header')?.offsetHeight    || 50;
    const focusH     = document.querySelector('.focus-bar')?.offsetHeight || 44;
    const mainPad    = 20;  // 10px top + 10px bottom
    const boardGap   = 16;  // board zone gap
    const audioH     = 36;  // gameplay audio buttons height
    const audioGap   = 10;
    const kbGap      = 10;
    const keyH       = 50;
    const kbRows     = 3;
    const kbH        = kbRows * keyH + (kbRows - 1) * 5 + 8;
    const tileGap    = 9;
    const platePad   = 22 * 2;  // 22px top/bottom
    const tileGaps   = (maxGuesses - 1) * tileGap;
    const chrome     = headerH + focusH + mainPad + platePad + boardGap + audioH + audioGap + kbGap + kbH;
    const availableH = window.innerHeight - chrome;
    const byHeight   = Math.floor((availableH - tileGaps) / maxGuesses);

    // Width: constrain to viewport
    const vw = Math.min(window.innerWidth, 560) - 24; // 12px each side
    const byWidth = Math.floor((vw - 52 - (wordLength - 1) * tileGap) / wordLength); // 52 = plate sides

    const size = Math.max(44, Math.min(byHeight, byWidth, 102));

    // Keyboard width matches the board width including plate padding
    const boardWidth = wordLength * size + (wordLength - 1) * tileGap;
    const playfieldW = boardWidth; // keyboard matches board grid, not plate

    document.documentElement.style.setProperty('--tile-size',       size + 'px');
    document.documentElement.style.setProperty('--gap-tile',        tileGap + 'px');
    document.documentElement.style.setProperty('--playfield-width', playfieldW + 'px');
    return { size, playfieldW };
  }

  // ─── Settings helpers ──────────────────────────────
  function getSettings() {
    return {
      focus:      _el('setting-focus')?.value || 'all',
      gradeBand:  _el('s-grade')?.value       || 'all',
      length:     _el('s-length')?.value      || 'any',
      maxGuesses: parseInt(_el('s-guesses')?.value || '6', 10),
      caseMode:   _el('s-case')?.value        || 'lower',
      showHint:   (_el('s-hint')?.value       || 'off') === 'on',
      dupeHint:   (_el('s-dupe')?.value       || 'on')  === 'on',
      confetti:   (_el('s-confetti')?.value   || 'on')  === 'on',
    };
  }

  function setCaseMode(mode) {
    _caseMode = mode;
    document.documentElement.setAttribute('data-case', mode);
    _keyboard?.querySelectorAll('.key').forEach(k => {
      const key = k.dataset.key;
      if (key && key !== 'Enter' && key !== '⌫') k.textContent = _fmt(key);
    });
  }

  // ─── Init ──────────────────────────────────────────
  function init() {
    _board    = _el('game-board');
    _keyboard = _el('keyboard');
    _modal    = _el('end-modal');
    _overlay  = _el('modal-overlay');
    _toast    = _el('toast');
  }

  return {
    init, buildBoard, updateCurrentRow, revealRow, shakeRow,
    buildKeyboard, clearKeyboard, updateKeyboard, pulseDupeKey,
    showModal, hideModal, showToast, getSettings, setCaseMode, calcLayout
  };
})();
