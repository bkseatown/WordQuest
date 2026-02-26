#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');

const root = process.cwd();
const cssPath = path.join(root, 'style', 'components.css');
const htmlPath = path.join(root, 'index.html');

const css = fs.readFileSync(cssPath, 'utf8');
const html = fs.readFileSync(htmlPath, 'utf8');

function escapeForRegex(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function requirePattern(pattern, message) {
  if (!pattern.test(css) && !pattern.test(html)) {
    throw new Error(message);
  }
}

function readBlock(selector) {
  const pattern = new RegExp(`${escapeForRegex(selector)}\\s*\\{([\\s\\S]*?)\\n\\}`, 'm');
  const match = css.match(pattern);
  return match ? match[1] : '';
}

function readRem(selector, propertyName) {
  const block = readBlock(selector);
  if (!block) return 0;
  const pattern = new RegExp(`${escapeForRegex(propertyName)}\\s*:\\s*([0-9.]+)rem`, 'i');
  const match = block.match(pattern);
  return match ? Number(match[1]) : 0;
}

function requireMinRem(selector, propertyName, minValue, label) {
  const value = readRem(selector, propertyName);
  if (!(value >= minValue)) {
    throw new Error(`${label} expected ${propertyName} >= ${minValue}rem, found ${value || 0}rem.`);
  }
}

requirePattern(
  /id="home-logo-btn"/,
  'Home logo button is missing in index.html.'
);
requirePattern(
  /\.focus-inline-results\.is-curriculum-list\s*\{/,
  'Curriculum single-column list mode class is missing.'
);
requirePattern(
  /html\[data-page-mode="mission-lab"\]\s+#phonics-clue-open-btn\s*\{\s*display:\s*none !important;/,
  'Mission-lab mode should hide clue quick action for mode clarity.'
);
requirePattern(
  /html\[data-page-mode="mission-lab"\]\s+#starter-word-open-btn,\s*[\r\n]+html\[data-page-mode="mission-lab"\]\s+#new-game-btn\s*\{\s*display:\s*none !important;/m,
  'Mission-lab mode should hide extra quick actions for hierarchy clarity.'
);

requireMinRem('.mission-lab-hub-title-wrap strong', 'font-size', 1.0, 'Deep Dive title readability');
requireMinRem('.mission-lab-hub-meta', 'font-size', 0.85, 'Deep Dive meta readability');
requireMinRem('html[data-page-mode="mission-lab"] .focus-inline-search', 'font-size', 1.0, 'Mission-lab search readability');
requireMinRem('.focus-search-item', 'font-size', 0.82, 'Curriculum row readability');
requireMinRem('.focus-search-item small', 'font-size', 0.72, 'Curriculum detail readability');

console.log('visual baseline check passed');
