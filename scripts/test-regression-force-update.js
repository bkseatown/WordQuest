#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');

const appSource = fs.readFileSync(path.join(process.cwd(), 'js/app.js'), 'utf8');

function requireText(pattern, message) {
  if (!pattern.test(appSource)) throw new Error(message);
}

requireText(/async function forceUpdateNow\(\)/, 'forceUpdateNow function is missing.');
requireText(/window\.confirm\('Force update now\? This clears offline cache and reloads the latest build\.'\)/, 'Force-update confirmation prompt changed unexpectedly.');
requireText(/targets = names\.filter\(\(name\) => String\(name \|\| ''\)\.startsWith\('wq-'\)\)/, 'Force-update no longer targets WordQuest cache buckets.');
requireText(/registration\.unregister\(\)\.catch\(\(\) => false\)/, 'Force-update no longer unregisters service workers.');
requireText(/markDiagnosticsReset\('force_update'\)/, 'Force-update no longer records diagnostics reset timestamp.');
requireText(/emitTelemetry\('wq_funnel_force_update_used',\s*\{ source: 'settings' \}\)/, 'Force-update funnel telemetry is missing.');
requireText(/location\.replace\(nextUrl\)/, 'Force-update no longer forces a cache-busting reload.');

console.log('regression check passed: force update path');
