#!/usr/bin/env node
/* eslint-disable no-console */
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');

const FILES = {
  index: 'index.html',
  app: 'js/app.js',
  nav: 'js/theme-nav.js',
  registry: 'js/theme-registry.js',
  components: 'style/components.css',
  themes: 'style/themes.css'
};

const REQUIRED_THEME_TOKENS = [
  '--page-bg',
  '--page-bg2',
  '--plate-bg',
  '--plate-border',
  '--tile-face',
  '--tile-border',
  '--tile-text',
  '--tile-shadow',
  '--tile-filled-border',
  '--key-bg',
  '--key-text',
  '--key-shadow',
  '--key-hover',
  '--brand',
  '--brand-dk',
  '--brand-text',
  '--header-bg',
  '--header-border',
  '--focusbar-bg',
  '--panel-bg',
  '--panel-border',
  '--text',
  '--text-muted'
];

const OWNED_SELECTORS = [
  'header',
  '.focus-bar',
  '.settings-panel',
  '#game-board',
  '#keyboard',
  '.gameplay-audio'
];

const PAGE_BG_LIGHTNESS_FLOORS = {
  default: { pageBg: 15, pageBg2: 10 },
  dark: { pageBg: 12, pageBg2: 8 }
};

const TOKEN_CONTRAST_FLOORS = {
  key: 4.5,
  brand: 4.5
};

function readFile(relativePath) {
  const fullPath = path.join(ROOT, relativePath);
  return fs.readFileSync(fullPath, 'utf8');
}

function escapeRegex(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function countSelectorBlocks(css, selector) {
  const regex = new RegExp(`^\\s*${escapeRegex(selector)}\\s*\\{`, 'gm');
  const matches = css.match(regex);
  return matches ? matches.length : 0;
}

function extractThemeIds(registryJs) {
  const ids = [...registryJs.matchAll(/id:\s*'([a-z0-9-]+)'/g)].map((match) => match[1]);
  return [...new Set(ids)];
}

function extractThemeFamilyMap(registryJs) {
  const map = new Map();
  const matches = registryJs.matchAll(
    /id:\s*'([a-z0-9-]+)'[\s\S]*?family:\s*'([a-z0-9-]+)'/g
  );
  for (const match of matches) {
    const [, id, family] = match;
    if (!map.has(id)) map.set(id, family);
  }
  return map;
}

function extractThemeBlock(css, themeId) {
  const regex = new RegExp(
    `\\[data-theme=["']${escapeRegex(themeId)}["']\\]\\s*\\{([\\s\\S]*?)\\n\\}`,
    'm'
  );
  const match = css.match(regex);
  return match ? match[1] : null;
}

function extractTokenValue(block, tokenName) {
  const regex = new RegExp(`${escapeRegex(tokenName)}\\s*:\\s*([^;]+);`);
  const match = block.match(regex);
  return match ? match[1].trim() : null;
}

function normalizeHexColor(colorValue) {
  if (!colorValue) return null;
  const hex = colorValue.trim().toLowerCase();
  const short = /^#([0-9a-f]{3})$/i;
  const long = /^#([0-9a-f]{6})$/i;
  if (short.test(hex)) {
    return `#${hex
      .slice(1)
      .split('')
      .map((c) => c + c)
      .join('')}`;
  }
  if (long.test(hex)) return hex;
  return null;
}

function getLightnessPercent(hexColor) {
  const normalized = normalizeHexColor(hexColor);
  if (!normalized) return null;
  const r = parseInt(normalized.slice(1, 3), 16) / 255;
  const g = parseInt(normalized.slice(3, 5), 16) / 255;
  const b = parseInt(normalized.slice(5, 7), 16) / 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  return ((max + min) / 2) * 100;
}

function srgbToLinear(channel) {
  return channel <= 0.03928 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4;
}

function relativeLuminance(hexColor) {
  const normalized = normalizeHexColor(hexColor);
  if (!normalized) return null;
  const r = srgbToLinear(parseInt(normalized.slice(1, 3), 16) / 255);
  const g = srgbToLinear(parseInt(normalized.slice(3, 5), 16) / 255);
  const b = srgbToLinear(parseInt(normalized.slice(5, 7), 16) / 255);
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function contrastRatio(foreground, background) {
  const fg = relativeLuminance(foreground);
  const bg = relativeLuminance(background);
  if (fg == null || bg == null) return null;
  const lighter = Math.max(fg, bg);
  const darker = Math.min(fg, bg);
  return (lighter + 0.05) / (darker + 0.05);
}

let failures = 0;

function pass(message) {
  console.log(`PASS: ${message}`);
}

function fail(message) {
  failures += 1;
  console.error(`FAIL: ${message}`);
}

function run() {
  const indexHtml = readFile(FILES.index);
  const appJs = readFile(FILES.app);
  const navJs = readFile(FILES.nav);
  const registryJs = readFile(FILES.registry);
  const componentsCss = readFile(FILES.components);
  const themesCss = readFile(FILES.themes);
  const themeFamilyById = extractThemeFamilyMap(registryJs);

  const themeIds = extractThemeIds(registryJs);
  if (!themeIds.length) {
    fail('No themes were discovered in js/theme-registry.js.');
  } else {
    pass(`Discovered ${themeIds.length} themes in js/theme-registry.js.`);
  }

  for (const themeId of themeIds) {
    const block = extractThemeBlock(themesCss, themeId);
    if (!block) {
      fail(`Missing [data-theme="${themeId}"] block in style/themes.css.`);
      continue;
    }

    const missingTokens = REQUIRED_THEME_TOKENS.filter(
      (token) => !new RegExp(`${escapeRegex(token)}\\s*:`).test(block)
    );
    if (missingTokens.length) {
      fail(
        `[data-theme="${themeId}"] is missing tokens: ${missingTokens.join(', ')}.`
      );
    } else {
      pass(`[data-theme="${themeId}"] contains all required tokens.`);
    }

    const family = themeFamilyById.get(themeId) || 'default';
    const floors = PAGE_BG_LIGHTNESS_FLOORS[family] || PAGE_BG_LIGHTNESS_FLOORS.default;
    const pageBg = extractTokenValue(block, '--page-bg');
    const pageBg2 = extractTokenValue(block, '--page-bg2');

    const pageBgLightness = getLightnessPercent(pageBg);
    const pageBg2Lightness = getLightnessPercent(pageBg2);

    if (pageBgLightness == null) {
      fail(
        `[data-theme="${themeId}"] uses non-hex --page-bg (${pageBg || 'missing'}) which breaks brightness guardrail checks.`
      );
    } else if (pageBgLightness < floors.pageBg) {
      fail(
        `[data-theme="${themeId}"] --page-bg is too dark (${pageBgLightness.toFixed(1)}%). Minimum is ${floors.pageBg}% for family "${family}".`
      );
    } else {
      pass(
        `[data-theme="${themeId}"] --page-bg lightness ${pageBgLightness.toFixed(1)}% meets floor ${floors.pageBg}%.`
      );
    }

    if (pageBg2Lightness == null) {
      fail(
        `[data-theme="${themeId}"] uses non-hex --page-bg2 (${pageBg2 || 'missing'}) which breaks brightness guardrail checks.`
      );
    } else if (pageBg2Lightness < floors.pageBg2) {
      fail(
        `[data-theme="${themeId}"] --page-bg2 is too dark (${pageBg2Lightness.toFixed(1)}%). Minimum is ${floors.pageBg2}% for family "${family}".`
      );
    } else {
      pass(
        `[data-theme="${themeId}"] --page-bg2 lightness ${pageBg2Lightness.toFixed(1)}% meets floor ${floors.pageBg2}%.`
      );
    }

    const keyText = extractTokenValue(block, '--key-text');
    const keyBg = extractTokenValue(block, '--key-bg');
    const keyContrast = contrastRatio(keyText, keyBg);
    if (keyContrast == null) {
      fail(
        `[data-theme="${themeId}"] uses non-hex key colors (--key-text: ${keyText || 'missing'}, --key-bg: ${keyBg || 'missing'}) so key contrast cannot be validated.`
      );
    } else if (keyContrast < TOKEN_CONTRAST_FLOORS.key) {
      fail(
        `[data-theme="${themeId}"] key contrast is too low (${keyContrast.toFixed(2)}). Minimum is ${TOKEN_CONTRAST_FLOORS.key.toFixed(1)}.`
      );
    } else {
      pass(
        `[data-theme="${themeId}"] key contrast ${keyContrast.toFixed(2)} meets floor ${TOKEN_CONTRAST_FLOORS.key.toFixed(1)}.`
      );
    }

    const brandText = extractTokenValue(block, '--brand-text');
    const brandBg = extractTokenValue(block, '--brand');
    const brandContrast = contrastRatio(brandText, brandBg);
    if (brandContrast == null) {
      fail(
        `[data-theme="${themeId}"] uses non-hex brand colors (--brand-text: ${brandText || 'missing'}, --brand: ${brandBg || 'missing'}) so CTA contrast cannot be validated.`
      );
    } else if (brandContrast < TOKEN_CONTRAST_FLOORS.brand) {
      fail(
        `[data-theme="${themeId}"] brand contrast is too low (${brandContrast.toFixed(2)}). Minimum is ${TOKEN_CONTRAST_FLOORS.brand.toFixed(1)}.`
      );
    } else {
      pass(
        `[data-theme="${themeId}"] brand contrast ${brandContrast.toFixed(2)} meets floor ${TOKEN_CONTRAST_FLOORS.brand.toFixed(1)}.`
      );
    }
  }

  for (const selector of OWNED_SELECTORS) {
    const count = countSelectorBlocks(componentsCss, selector);
    if (count === 0) {
      fail(`Owned HUD selector "${selector}" is missing a base block in style/components.css.`);
      continue;
    }
    if (count > 1) {
      fail(`Owned HUD selector "${selector}" has ${count} base blocks in style/components.css.`);
      continue;
    }
    pass(`Owned HUD selector "${selector}" has one canonical base block.`);
  }

  const inlineStyleCountInNav = (navJs.match(/style=|style\./g) || []).length;
  if (inlineStyleCountInNav > 0) {
    fail(`js/theme-nav.js still has ${inlineStyleCountInNav} inline style usages.`);
  } else {
    pass('js/theme-nav.js has no inline style injections.');
  }

  if (/const\s+THEME_ORDER\s*=/.test(navJs)) {
    fail('js/theme-nav.js still defines a hardcoded THEME_ORDER.');
  } else {
    pass('js/theme-nav.js does not hardcode THEME_ORDER.');
  }

  if (/sessionStorage\.setItem\(\s*['"]wq_theme['"]/.test(navJs)) {
    fail('js/theme-nav.js still persists canonical theme state in sessionStorage.');
  } else {
    pass('js/theme-nav.js does not persist canonical theme state in sessionStorage.');
  }

  if (
    appJs.includes('renderThemeOptions') &&
    appJs.includes('normalizeTheme') &&
    appJs.includes('window.WQTheme')
  ) {
    pass('js/app.js is wired to the theme registry and exposes canonical runtime theme API.');
  } else {
    fail('js/app.js is missing one or more required theme registry wiring hooks.');
  }

  const themeSelectMatch = indexHtml.match(/<select id="s-theme"[^>]*>([\s\S]*?)<\/select>/);
  if (!themeSelectMatch) {
    fail('index.html is missing <select id="s-theme">.');
  } else {
    const optionsHtml = themeSelectMatch[1];
    const hasHardcodedOptions =
      /<optgroup/i.test(optionsHtml) ||
      /value="default"/i.test(optionsHtml) ||
      /value="sunset"/i.test(optionsHtml);
    if (hasHardcodedOptions) {
      fail('index.html still contains hardcoded theme options in #s-theme.');
    } else {
      pass('index.html theme select is not hardcoded.');
    }
  }

  if (componentsCss.includes('.wq-theme-nav') && componentsCss.includes('.wq-teacher-tools')) {
    pass('HUD class ownership for theme nav and teacher tools lives in CSS.');
  } else {
    fail('Missing CSS ownership blocks for theme nav and/or teacher tools.');
  }

  if (failures > 0) {
    console.error(`\nHUD contract check failed with ${failures} issue(s).`);
    process.exit(1);
  }

  console.log('\nHUD contract check passed.');
}

run();
