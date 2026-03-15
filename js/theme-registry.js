/* theme-registry.js
   Canonical theme registry for WordQuest HUD + settings UI.
*/
(function initThemeRegistry() {
  'use strict';

  var THEME_REGISTRY = Object.freeze([
    Object.freeze({ id: 'default', label: 'Scholar Light', family: 'studio' }),
    Object.freeze({ id: 'ocean', label: 'Sky Lab', family: 'studio' }),
    Object.freeze({ id: 'forest', label: 'Forest Studio', family: 'studio' }),
    Object.freeze({ id: 'classic', label: 'Storybook Classic', family: 'studio' }),
    Object.freeze({ id: 'sunset', label: 'Sunset Workshop', family: 'studio' }),
    Object.freeze({ id: 'coffee', label: 'Reading Nook', family: 'studio' }),
    Object.freeze({ id: 'seahawks', label: 'Northwest Field', family: 'spirited' }),
    Object.freeze({ id: 'huskies', label: 'Victory Hall', family: 'spirited' }),
    Object.freeze({ id: 'superman', label: 'Hero Signal', family: 'inspired' }),
    Object.freeze({ id: 'mario', label: 'Mushroom Sprint', family: 'inspired' }),
    Object.freeze({ id: 'zelda', label: 'Adventure Map', family: 'inspired' }),
    Object.freeze({ id: 'amongus', label: 'Cosmic Crew', family: 'inspired' }),
    Object.freeze({ id: 'rainbowfriends', label: 'Neon Parade', family: 'inspired' }),
    Object.freeze({ id: 'minecraft', label: 'Block Build', family: 'inspired' }),
    Object.freeze({ id: 'marvel', label: 'Action Panel', family: 'inspired' }),
    Object.freeze({ id: 'ironman', label: 'Forge Red', family: 'inspired' }),
    Object.freeze({ id: 'harleyquinn', label: 'Pop Mix', family: 'inspired' }),
    Object.freeze({ id: 'kuromi', label: 'Midnight Pop', family: 'inspired' }),
    Object.freeze({ id: 'poppink', label: 'Candy Studio', family: 'inspired' }),
    Object.freeze({ id: 'harrypotter', label: 'House Library', family: 'inspired' }),
    Object.freeze({ id: 'demonhunter', label: 'Blossom Edge', family: 'inspired' }),
    Object.freeze({ id: 'dark', label: 'Story Night', family: 'night' }),
    Object.freeze({ id: 'matrix', label: 'Signal Grid', family: 'night' })
  ]);

  var FAMILY_ORDER = Object.freeze(['studio', 'spirited', 'inspired', 'night']);

  var FAMILY_LABELS = Object.freeze({
    studio: 'Studio Themes',
    spirited: 'Spirited Themes',
    inspired: 'Inspired Themes',
    night: 'Night Themes'
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

  var THEME_ALIASES = Object.freeze({
    barbie: 'poppink'
  });

  // Curate the exposed picker set so the platform stays readable and premium.
  // Legacy themes remain valid if already saved or referenced directly.
  var ACTIVE_THEME_IDS = Object.freeze([
    'default',
    'ocean',
    'forest',
    'classic',
    'sunset',
    'coffee',
    'seahawks',
    'huskies',
    'zelda',
    'minecraft',
    'dark',
    'matrix'
  ]);

  var ORDER = Object.freeze(ACTIVE_THEME_IDS.filter(function onlyKnownTheme(id) {
    return themeById.has(id);
  }));

  function normalizeTheme(theme, fallback) {
    var nextFallback = fallback && themeById.has(fallback)
      ? fallback
      : DEFAULT_BY_MODE.calm;
    var value = String(theme || '').trim().toLowerCase();
    if (THEME_ALIASES[value]) value = THEME_ALIASES[value];
    return themeById.has(value) ? value : nextFallback;
  }

  function defaultThemeForMode(mode) {
    var normalized = String(mode || '').trim().toLowerCase();
    return normalizeTheme(DEFAULT_BY_MODE[normalized] || DEFAULT_BY_MODE.calm, DEFAULT_BY_MODE.calm);
  }

  function renderThemeOptions(select, currentValue) {
    if (!(select instanceof HTMLSelectElement)) return;
    var fallback = ORDER[0] || DEFAULT_BY_MODE.calm;
    var preserved = normalizeTheme(currentValue || select.value, fallback);
    var allowed = new Set(ORDER);
    if (!allowed.has(preserved) && ORDER.length) preserved = ORDER[0];
    select.innerHTML = '';

    FAMILY_ORDER.forEach(function appendFamily(family) {
      var group = document.createElement('optgroup');
      group.label = FAMILY_LABELS[family] || family;
      THEME_REGISTRY.forEach(function appendTheme(theme) {
        if (theme.family !== family || !allowed.has(theme.id)) return;
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
