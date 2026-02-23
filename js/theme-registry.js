/* theme-registry.js
   Canonical theme registry for WordQuest HUD + settings UI.
*/
(function initThemeRegistry() {
  'use strict';

  var THEME_REGISTRY = Object.freeze([
    Object.freeze({ id: 'default', label: '🌿 Slate Classic', family: 'core' }),
    Object.freeze({ id: 'sunset', label: '🌅 Sunset', family: 'core' }),
    Object.freeze({ id: 'ocean', label: '🌊 Ocean', family: 'core' }),
    Object.freeze({ id: 'coffee', label: '☕ Coffeehouse', family: 'core' }),
    Object.freeze({ id: 'seahawks', label: '🦅 Seahawks', family: 'sports' }),
    Object.freeze({ id: 'huskies', label: '🐾 Huskies', family: 'sports' }),
    Object.freeze({ id: 'superman', label: '🦸 Superman', family: 'inspired' }),
    Object.freeze({ id: 'pokemon', label: '🕹️ Pokédex', family: 'inspired' }),
    Object.freeze({ id: 'minecraft', label: '⛏️ Minecraft', family: 'inspired' }),
    Object.freeze({ id: 'marvel', label: '💥 Marvel', family: 'inspired' }),
    Object.freeze({ id: 'ironman', label: '🔴 Iron Man', family: 'inspired' }),
    Object.freeze({ id: 'harleyquinn', label: '🎭 Harley Quinn', family: 'inspired' }),
    Object.freeze({ id: 'barbie', label: '💖 Pop Pink', family: 'inspired' }),
    Object.freeze({ id: 'kuromi', label: '🖤 Kuromi', family: 'inspired' }),
    Object.freeze({ id: 'demonhunter', label: '🌸 Demon Hunter', family: 'inspired' }),
    Object.freeze({ id: 'dark', label: '🌙 Dark', family: 'dark' }),
    Object.freeze({ id: 'matrix', label: '💻 Matrix', family: 'dark' })
  ]);

  var FAMILY_ORDER = Object.freeze(['core', 'sports', 'inspired', 'dark']);

  var FAMILY_LABELS = Object.freeze({
    core: 'Core Themes',
    sports: 'Sports-Inspired',
    inspired: 'Inspired Themes',
    dark: 'Dark Themes'
  });

  var DEFAULT_BY_MODE = Object.freeze({
    calm: 'default',
    professional: 'default',
    playful: 'sunset',
    'high-contrast': 'matrix'
  });

  var themeById = new Map();
  THEME_REGISTRY.forEach(function registerTheme(theme) {
    themeById.set(theme.id, theme);
  });

  var ORDER = Object.freeze(THEME_REGISTRY.map(function toId(theme) {
    return theme.id;
  }));

  function normalizeTheme(theme, fallback) {
    var nextFallback = fallback && themeById.has(fallback)
      ? fallback
      : DEFAULT_BY_MODE.calm;
    var value = String(theme || '').trim().toLowerCase();
    return themeById.has(value) ? value : nextFallback;
  }

  function defaultThemeForMode(mode) {
    var normalized = String(mode || '').trim().toLowerCase();
    return normalizeTheme(DEFAULT_BY_MODE[normalized] || DEFAULT_BY_MODE.calm, DEFAULT_BY_MODE.calm);
  }

  function renderThemeOptions(select, currentValue) {
    if (!(select instanceof HTMLSelectElement)) return;
    var preserved = normalizeTheme(currentValue || select.value, DEFAULT_BY_MODE.calm);
    select.innerHTML = '';

    FAMILY_ORDER.forEach(function appendFamily(family) {
      var group = document.createElement('optgroup');
      group.label = FAMILY_LABELS[family] || family;
      THEME_REGISTRY.forEach(function appendTheme(theme) {
        if (theme.family !== family) return;
        var option = document.createElement('option');
        option.value = theme.id;
        option.textContent = theme.label;
        group.appendChild(option);
      });
      if (group.children.length > 0) {
        select.appendChild(group);
      }
    });

    select.value = preserved;
  }

  window.WQThemeRegistry = Object.freeze({
    themes: THEME_REGISTRY,
    familyOrder: FAMILY_ORDER,
    familyLabels: FAMILY_LABELS,
    defaultsByMode: DEFAULT_BY_MODE,
    order: ORDER,
    normalizeTheme: normalizeTheme,
    defaultThemeForMode: defaultThemeForMode,
    renderThemeOptions: renderThemeOptions,
    getLabel: function getLabel(themeId) {
      var normalized = normalizeTheme(themeId, DEFAULT_BY_MODE.calm);
      var theme = themeById.get(normalized);
      return theme ? theme.label : normalized;
    }
  });
})();
