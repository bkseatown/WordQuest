#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');

const root = process.cwd();
const indexHtml = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const appSource = fs.readFileSync(path.join(root, 'js/app.js'), 'utf8');

function requireText(source, pattern, message) {
  if (!pattern.test(source)) throw new Error(message);
}

requireText(indexHtml, /id="new-game-btn">Next Word</, 'Primary CTA text should be "Next Word".');
requireText(indexHtml, /id="hint-clue-title"[^>]*>Quick Clue</, 'Hint card title microcopy regressed.');
requireText(indexHtml, /id="starter-word-title"[^>]*>Try a Starter Word</, 'Starter word title microcopy regressed.');
requireText(indexHtml, /id="modal-challenge-launch-helper"[^>]*>Optional after each solved word\. Complete 3 quick steps\.</, 'Deep Dive helper microcopy regressed.');
requireText(appSource, /'Tap Next Word to start\. Make your first guess when ready\.'/, 'Next action prompt microcopy regressed.');
requireText(appSource, /'Voice practice is required before moving on\.'/, 'Voice practice microcopy regressed.');

console.log('regression check passed: student microcopy');
