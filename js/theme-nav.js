/* theme-nav.js
   Theme arrows and teacher word tools.
   Uses theme registry + app theme API as canonical sources.
*/
(function () {
  'use strict';

  const TEACHER_POOL_KEY = 'wq_teacher_words';

  const byId = (id) => document.getElementById(id);

  function getThemeOrder() {
    if (window.WQTheme && typeof window.WQTheme.getOrder === 'function') {
      return window.WQTheme.getOrder();
    }
    if (window.WQThemeRegistry && Array.isArray(window.WQThemeRegistry.order)) {
      return window.WQThemeRegistry.order.slice();
    }
    return ['default'];
  }

  function getThemeLabel(themeId) {
    if (window.WQTheme && typeof window.WQTheme.getLabel === 'function') {
      return window.WQTheme.getLabel(themeId);
    }
    if (window.WQThemeRegistry && typeof window.WQThemeRegistry.getLabel === 'function') {
      return window.WQThemeRegistry.getLabel(themeId);
    }
    return themeId;
  }

  function getCurrentTheme() {
    if (window.WQTheme && typeof window.WQTheme.getTheme === 'function') {
      return window.WQTheme.getTheme();
    }
    return document.documentElement.getAttribute('data-theme') || getThemeOrder()[0];
  }

  function setTheme(theme, persist = true) {
    if (window.WQTheme && typeof window.WQTheme.setTheme === 'function') {
      return window.WQTheme.setTheme(theme, { persist });
    }

    const normalized = String(theme || '').trim().toLowerCase() || getThemeOrder()[0];
    document.documentElement.setAttribute('data-theme', normalized);

    const select = byId('s-theme');
    if (select) {
      select.value = normalized;
      if (persist) {
        select.dispatchEvent(new Event('change', { bubbles: true }));
      }
    }

    return normalized;
  }

  function updateNavLabels(currentTheme) {
    const order = getThemeOrder();
    if (!order.length) return;

    const current = order.includes(currentTheme) ? currentTheme : order[0];
    const idx = order.indexOf(current);
    const prev = order[(idx - 1 + order.length) % order.length];
    const next = order[(idx + 1) % order.length];

    const label = byId('wq-theme-label');
    const labelBtn = byId('wq-theme-label-btn');
    const prevBtn = byId('wq-theme-prev');
    const nextBtn = byId('wq-theme-next');

    if (label) label.textContent = getThemeLabel(current);
    if (labelBtn) {
      labelBtn.title = `${getThemeLabel(current)} (use arrows to change)`;
      labelBtn.setAttribute('aria-label', `Current style: ${getThemeLabel(current)}. Use arrows to change.`);
    }
    if (prevBtn) prevBtn.title = getThemeLabel(prev);
    if (nextBtn) nextBtn.title = getThemeLabel(next);
  }

  function syncThemeQuickSelectOptions() {
    // No-op: quick theme UI is arrow-based (no direct dropdown picker).
  }

  function cycleTheme(direction) {
    const order = getThemeOrder();
    if (!order.length) return;

    const current = getCurrentTheme();
    const currentIdx = Math.max(0, order.indexOf(current));
    const nextIdx = (currentIdx + direction + order.length) % order.length;
    const nextTheme = setTheme(order[nextIdx], true);
    updateNavLabels(nextTheme);
  }

  function ensureThemeNav() {
    if (byId('wq-theme-nav')) return;

    const themeSelect = byId('s-theme');
    const previewSlot = byId('theme-preview-slot');
    const previewStrip = byId('theme-preview-strip');
    const host = previewSlot || previewStrip || themeSelect?.closest('.setting-row');
    if (!host) return;

    const nav = document.createElement('div');
    nav.id = 'wq-theme-nav';
    nav.className = 'wq-theme-nav';
    nav.innerHTML = [
      '<button id="wq-theme-prev" class="wq-theme-nav-btn" type="button" aria-label="Previous style">◀</button>',
      '<button id="wq-theme-label-btn" class="wq-theme-label-btn" type="button" aria-label="Current style">',
      '  <span id="wq-theme-label" class="wq-theme-label">Default</span>',
      '</button>',
      '<button id="wq-theme-next" class="wq-theme-nav-btn" type="button" aria-label="Next style">▶</button>'
    ].join('');
    host.appendChild(nav);

    byId('wq-theme-prev')?.addEventListener('click', () => cycleTheme(-1));
    byId('wq-theme-next')?.addEventListener('click', () => cycleTheme(1));
    byId('wq-theme-label-btn')?.addEventListener('click', () => cycleTheme(1));
    nav.addEventListener('keydown', (event) => {
      if (event.key === 'ArrowLeft') {
        event.preventDefault();
        cycleTheme(-1);
        return;
      }
      if (event.key === 'ArrowRight') {
        event.preventDefault();
        cycleTheme(1);
      }
    });
    nav.addEventListener('wheel', (event) => {
      if (!event.shiftKey) return;
      event.preventDefault();
      cycleTheme(event.deltaY > 0 ? 1 : -1);
    }, { passive: false });

    if (themeSelect && !themeSelect.dataset.wqThemeNavBound) {
      themeSelect.addEventListener('change', (event) => {
        const theme = event.target?.value;
        if (!theme) return;
        syncThemeQuickSelectOptions();
        updateNavLabels(theme);
      });
      themeSelect.dataset.wqThemeNavBound = '1';
    }

    syncThemeQuickSelectOptions();
    updateNavLabels(getCurrentTheme());
  }

  function parseTeacherWords(raw) {
    return String(raw || '')
      .split(/[\n,]+/)
      .map((word) => word.trim().toUpperCase())
      .filter((word) => /^[A-Z]{2,12}$/.test(word));
  }

  function persistTeacherWords(words) {
    try {
      if (Array.isArray(words) && words.length) {
        sessionStorage.setItem(TEACHER_POOL_KEY, JSON.stringify(words));
      } else {
        sessionStorage.removeItem(TEACHER_POOL_KEY);
      }
    } catch (_error) {
      // Storage can be unavailable in private browsing.
    }
  }

  function loadTeacherWords() {
    try {
      const raw = sessionStorage.getItem(TEACHER_POOL_KEY);
      const parsed = JSON.parse(raw || '[]');
      return Array.isArray(parsed) ? parsed : [];
    } catch (_error) {
      return [];
    }
  }

  function setTeacherMessage(message, isError) {
    const msg = byId('wq-teacher-msg');
    if (!msg) return;
    msg.textContent = message || '';
    msg.classList.toggle('is-error', !!isError);
  }

  function setTeacherStatus(activeWords) {
    const status = byId('wq-teacher-status');
    if (!status) return;
    if (Array.isArray(activeWords) && activeWords.length) {
      status.textContent = `ACTIVE (${activeWords.length})`;
      status.classList.remove('hidden');
      status.setAttribute('aria-hidden', 'false');
    } else {
      status.classList.add('hidden');
      status.setAttribute('aria-hidden', 'true');
    }
  }

  function applyTeacherPool(words, options = {}) {
    const next = Array.isArray(words) ? words : [];
    window.__WQ_TEACHER_POOL__ = next.length ? next : null;
    persistTeacherWords(next);
    setTeacherStatus(next);

    if (!options.silent) {
      if (next.length) {
        const preview = next.slice(0, 5).join(', ');
        const suffix = next.length > 5 ? '...' : '';
        setTeacherMessage(`Loaded ${next.length} word${next.length > 1 ? 's' : ''}: ${preview}${suffix}`, false);
      } else {
        setTeacherMessage('Word list cleared. Using full word bank.', false);
      }
    }
  }

  function syncTeacherHubSelectsFromSettings() {
    const mappings = [
      ['teacher-team-mode', 's-team-mode'],
      ['teacher-team-count', 's-team-count'],
      ['teacher-turn-timer', 's-turn-timer'],
      ['teacher-voice-task', 's-voice-task']
    ];
    mappings.forEach(([teacherId, settingsId]) => {
      const teacherSelect = byId(teacherId);
      const settingsSelect = byId(settingsId);
      if (!teacherSelect || !settingsSelect) return;
      teacherSelect.value = settingsSelect.value;
    });
  }

  function dispatchSettingsSelect(settingsId, value) {
    const settingsSelect = byId(settingsId);
    if (!settingsSelect) return;
    settingsSelect.value = value;
    settingsSelect.dispatchEvent(new Event('change', { bubbles: true }));
  }

  function bindTeacherHubControlSync() {
    if (document.body.dataset.wqTeacherHubControlBound === '1') return;
    const mappings = [
      ['teacher-team-mode', 's-team-mode'],
      ['teacher-team-count', 's-team-count'],
      ['teacher-turn-timer', 's-turn-timer'],
      ['teacher-voice-task', 's-voice-task']
    ];
    mappings.forEach(([teacherId, settingsId]) => {
      const teacherSelect = byId(teacherId);
      const settingsSelect = byId(settingsId);
      if (!teacherSelect || !settingsSelect) return;
      teacherSelect.addEventListener('change', (event) => {
        dispatchSettingsSelect(settingsId, event.target?.value || '');
      });
      settingsSelect.addEventListener('change', () => {
        teacherSelect.value = settingsSelect.value;
      });
    });
    document.body.dataset.wqTeacherHubControlBound = '1';
  }

  function bindTeacherStudioUploads() {
    if (document.body.dataset.wqTeacherStudioBound === '1') return;
    const msg = byId('teacher-studio-msg');
    const update = () => {
      const musicCount = byId('teacher-studio-music-upload')?.files?.length || 0;
      const wordCount = byId('teacher-studio-word-audio-upload')?.files?.length || 0;
      const phonemeCount = byId('teacher-studio-phoneme-upload')?.files?.length || 0;
      if (!msg) return;
      if (!musicCount && !wordCount && !phonemeCount) {
        msg.textContent = 'Files stay local on this device for now.';
        return;
      }
      msg.textContent = `Local files ready: music ${musicCount}, word audio ${wordCount}, phoneme voice ${phonemeCount}.`;
    };
    byId('teacher-studio-music-upload')?.addEventListener('change', update);
    byId('teacher-studio-word-audio-upload')?.addEventListener('change', update);
    byId('teacher-studio-phoneme-upload')?.addEventListener('change', update);
    document.body.dataset.wqTeacherStudioBound = '1';
  }

  function openTeacherPanel() {
    const panel = byId('teacher-panel');
    if (!panel) return;
    syncTeacherHubSelectsFromSettings();
    byId('settings-panel')?.classList.add('hidden');
    panel.classList.remove('hidden');
    window.dispatchEvent(new Event('wq:teacher-panel-toggle'));
    byId('wq-teacher-words')?.focus();
  }

  function closeTeacherPanel() {
    const panel = byId('teacher-panel');
    if (!panel) return;
    panel.classList.add('hidden');
    window.dispatchEvent(new Event('wq:teacher-panel-toggle'));
  }

  function bindTeacherPanel() {
    if (document.body.dataset.wqTeacherPanelBound === '1') return;
    byId('teacher-panel-btn')?.addEventListener('click', openTeacherPanel);
    byId('teacher-panel-close')?.addEventListener('click', closeTeacherPanel);
    byId('teacher-panel')?.addEventListener('click', (event) => {
      if (event.target?.id === 'teacher-panel') closeTeacherPanel();
    });
    window.addEventListener('keydown', (event) => {
      if (event.key !== 'Escape') return;
      const panel = byId('teacher-panel');
      if (!panel || panel.classList.contains('hidden')) return;
      closeTeacherPanel();
    });
    window.addEventListener('wq:open-teacher-hub', openTeacherPanel);
    document.body.dataset.wqTeacherPanelBound = '1';
  }

  function ensureTeacherTools() {
    if (document.body.dataset.wqTeacherToolsBound === '1') return;
    const wordsInput = byId('wq-teacher-words');
    if (!wordsInput) return;

    byId('wq-teacher-activate')?.addEventListener('click', () => {
      const words = parseTeacherWords(wordsInput?.value || '');
      if (!words.length) {
        setTeacherMessage('No valid words found. Use letters only, 2-12 chars.', true);
        return;
      }
      applyTeacherPool(words);
    });

    byId('wq-teacher-clear')?.addEventListener('click', () => {
      if (wordsInput) wordsInput.value = '';
      applyTeacherPool([]);
    });

    const restoredWords = loadTeacherWords();
    if (restoredWords.length) {
      wordsInput.value = restoredWords.join('\n');
      applyTeacherPool(restoredWords, { silent: true });
    } else {
      setTeacherStatus([]);
    }

    bindTeacherHubControlSync();
    bindTeacherStudioUploads();
    bindTeacherPanel();
    document.body.dataset.wqTeacherToolsBound = '1';
  }

  function init() {
    ensureThemeNav();
    ensureTeacherTools();

    byId('settings-btn')?.addEventListener('click', () => {
      requestAnimationFrame(() => {
        ensureThemeNav();
        ensureTeacherTools();
      });
    });

    const rootObserver = new MutationObserver(() => {
      updateNavLabels(getCurrentTheme());
    });
    rootObserver.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['data-theme']
    });

    const bodyObserver = new MutationObserver(() => {
      ensureThemeNav();
      syncThemeQuickSelectOptions();
      ensureTeacherTools();
    });
    bodyObserver.observe(document.body, { childList: true, subtree: true });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
