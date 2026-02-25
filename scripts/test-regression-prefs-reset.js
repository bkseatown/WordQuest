#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');

const appSource = fs.readFileSync(path.join(process.cwd(), 'js/app.js'), 'utf8');

function requireText(pattern, message) {
  if (!pattern.test(appSource)) throw new Error(message);
}

requireText(/async function resetAppearanceAndCache\(\)/, 'resetAppearanceAndCache function is missing.');
requireText(/localStorage\.removeItem\(PREF_KEY\)/, 'Appearance reset no longer clears saved preferences.');
requireText(/Object\.keys\(prefs\)\.forEach\(\(key\) => \{ delete prefs\[key\]; \}\);/, 'Appearance reset no longer wipes in-memory prefs.');
requireText(/markDiagnosticsReset\('appearance_reset'\)/, 'Appearance reset no longer records diagnostics reset timestamp.');
requireText(/emitTelemetry\('wq_funnel_reset_used',\s*\{ source: 'settings' \}\)/, 'Appearance reset funnel telemetry is missing.');

console.log('regression check passed: preferences reset');
