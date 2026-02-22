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
    const prevBtn = byId('wq-theme-prev');
    const nextBtn = byId('wq-theme-next');

    if (label) label.textContent = getThemeLabel(current);
    if (prevBtn) prevBtn.title = getThemeLabel(prev);
    if (nextBtn) nextBtn.title = getThemeLabel(next);
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
    const row = themeSelect?.closest('.setting-row');
    const previewStrip = byId('theme-preview-strip');
    const host = previewStrip || row;
    if (!host) return;

    const nav = document.createElement('div');
    nav.id = 'wq-theme-nav';
    nav.className = 'wq-theme-nav';
    nav.innerHTML = [
      '<button id="wq-theme-prev" class="wq-theme-nav-btn" type="button" aria-label="Previous theme">◀</button>',
      '<span id="wq-theme-label" class="wq-theme-label" aria-live="polite"></span>',
      '<button id="wq-theme-next" class="wq-theme-nav-btn" type="button" aria-label="Next theme">▶</button>'
    ].join('');
    host.appendChild(nav);

    byId('wq-theme-prev')?.addEventListener('click', () => cycleTheme(-1));
    byId('wq-theme-next')?.addEventListener('click', () => cycleTheme(1));
    nav.addEventListener('wheel', (event) => {
      event.preventDefault();
      cycleTheme(event.deltaY > 0 ? 1 : -1);
    }, { passive: false });

    if (themeSelect && !themeSelect.dataset.wqThemeNavBound) {
      themeSelect.addEventListener('change', (event) => {
        const theme = event.target?.value;
        if (!theme) return;
        updateNavLabels(theme);
      });
      themeSelect.dataset.wqThemeNavBound = '1';
    }

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

  function ensureTeacherTools() {
    if (byId('wq-teacher-tools')) return;

    const settingsBody = document.querySelector('.settings-body');
    if (!settingsBody) return;

    const section = document.createElement('div');
    section.id = 'wq-teacher-tools';
    section.className = 'setting-row setting-row-full wq-teacher-tools';
    section.innerHTML = [
      '<button id="wq-teacher-toggle" class="wq-teacher-toggle" type="button" aria-expanded="false">',
      '  <span class="wq-teacher-heading">Teacher Word Input</span>',
      '  <span id="wq-teacher-arrow" class="wq-teacher-arrow" aria-hidden="true">▼</span>',
      '  <span id="wq-teacher-status" class="wq-teacher-status hidden" aria-hidden="true">ACTIVE</span>',
      '</button>',
      '<div id="wq-teacher-body" class="wq-teacher-body hidden">',
      '  <p class="wq-teacher-help">Enter one word per line or comma-separated. Letters only, 2-12 chars.</p>',
      '  <textarea id="wq-teacher-words" class="wq-teacher-words" placeholder="cat\ndog\nbat\n(or: cat, dog, bat)"></textarea>',
      '  <div class="wq-teacher-actions">',
      '    <button id="wq-teacher-activate" class="wq-teacher-btn wq-teacher-btn-primary" type="button">Activate Word List</button>',
      '    <button id="wq-teacher-clear" class="wq-teacher-btn wq-teacher-btn-muted" type="button">Clear</button>',
      '  </div>',
      '  <div id="wq-teacher-msg" class="wq-teacher-msg" aria-live="polite"></div>',
      '</div>'
    ].join('');

    settingsBody.appendChild(section);

    const body = byId('wq-teacher-body');
    const arrow = byId('wq-teacher-arrow');
    const toggle = byId('wq-teacher-toggle');
    const wordsInput = byId('wq-teacher-words');

    toggle?.addEventListener('click', () => {
      if (!body || !arrow || !toggle) return;
      const isOpen = !body.classList.contains('hidden');
      body.classList.toggle('hidden', isOpen);
      arrow.textContent = isOpen ? '▼' : '▲';
      toggle.setAttribute('aria-expanded', String(!isOpen));
    });

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
      if (wordsInput) wordsInput.value = restoredWords.join('\n');
      applyTeacherPool(restoredWords, { silent: true });
    } else {
      setTeacherStatus([]);
    }
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
