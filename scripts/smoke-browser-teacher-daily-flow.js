#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');

const root = process.cwd();
const wordQuestHtml = fs.readFileSync(path.join(root, 'word-quest.html'), 'utf8');
const appSource = fs.readFileSync(path.join(root, 'js/app.js'), 'utf8');
const assignmentFeatureSource = fs.readFileSync(path.join(root, 'js/features/teacher-assignments.js'), 'utf8');

function requireText(source, pattern, message) {
  if (!pattern.test(source)) throw new Error(message);
}

const requiredIds = [
  'teacher-panel-btn',
  'session-group-assign-target-btn',
  'new-game-btn',
  'modal-challenge-launch',
  'challenge-modal',
  'session-reset-btn'
];

requiredIds.forEach((id) => {
  requireText(wordQuestHtml, new RegExp(`id="${id}"`), `Missing #${id} in word-quest.html.`);
});

requireText(
  appSource,
  /_el\('new-game-btn'\)\?\.addEventListener\('click',\s*newGame\)/,
  'New Word button is no longer wired to start gameplay.'
);
requireText(
  assignmentFeatureSource,
  /_el\('session-group-assign-target-btn'\)\?\.addEventListener\('click'/,
  'Assign Current Target button is no longer wired in teacher assignments feature.'
);
requireText(
  appSource,
  /emitTelemetry\('wq_funnel_deep_dive_completed'/,
  'Deep Dive completion funnel telemetry is missing.'
);
requireText(
  appSource,
  /_el\('session-reset-btn'\)\?\.addEventListener\('click',\s*\(\)\s*=>\s*\{\s*resetSessionSummary\(\);/m,
  'Teacher session reset action is no longer wired.'
);

console.log('browser smoke check passed: teacher daily flow contract');
