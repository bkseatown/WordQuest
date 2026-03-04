/* theme-registry.js
   Canonical theme registry for WordQuest HUD + settings UI.
*/
(function initThemeRegistry() {
  'use strict';

  var THEME_REGISTRY = Object.freeze([
    Object.freeze({ id: 'default', label: '🌿 Sage Classic', family: 'core' }),
    Object.freeze({ id: 'sunset', label: '🌅 Sunset', family: 'core' }),
    Object.freeze({ id: 'ocean', label: '🌊 Ocean', family: 'core' }),
    Object.freeze({ id: 'coffee', label: '☕ Coffeehouse', family: 'core' }),
    Object.freeze({ id: 'seahawks', label: '🦅 Seahawks', family: 'sports' }),
    Object.freeze({ id: 'huskies', label: '🐾 Huskies', family: 'sports' }),
    Object.freeze({ id: 'superman', label: '🦸 Superman', family: 'inspired' }),
    Object.freeze({ id: 'mario', label: '🍄 Mushroom Sprint', family: 'inspired' }),
    Object.freeze({ id: 'zelda', label: '🗡️ Forest Relic', family: 'inspired' }),
    Object.freeze({ id: 'amongus', label: '🚀 Cosmic Crew', family: 'inspired' }),
    Object.freeze({ id: 'rainbowfriends', label: '🌈 Neon Squad', family: 'inspired' }),
    Object.freeze({ id: 'minecraft', label: '⛏️ Minecraft', family: 'inspired' }),
    Object.freeze({ id: 'marvel', label: '💥 Marvel', family: 'inspired' }),
    Object.freeze({ id: 'ironman', label: '🔴 Iron Man', family: 'inspired' }),
    Object.freeze({ id: 'harleyquinn', label: '🎨 Pop Duo', family: 'inspired' }),
    Object.freeze({ id: 'kuromi', label: '🖤 Kuromi', family: 'inspired' }),
    Object.freeze({ id: 'poppink', label: '💖 Pop Pink', family: 'inspired' }),
    Object.freeze({ id: 'harrypotter', label: '🪄 Wizard House', family: 'inspired' }),
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

  var THEME_ALIASES = Object.freeze({
    barbie: 'poppink'
  });

  // Curated active list for the current K-8 rollout cohort.
  var ACTIVE_THEME_IDS = Object.freeze([
    'coffee',         // 1. Coffeehouse Green
    'matrix',         // 2. Emerald Grid
    'seahawks',       // 3. Pacific Flight
    'huskies',        // 4. Purple Gold Pride
    'superman',       // 5. Hero Blue-Red
    'minecraft',      // 6. Pixel Block World
    'mario',          // 7. Mushroom Sprint
    'rainbowfriends', // 9. Neon Squad
    'amongus',        // 10. Cosmic Crew
    'harrypotter'     // 11. Wizard House
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
