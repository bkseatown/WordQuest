#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');

const appSource = fs.readFileSync(path.join(process.cwd(), 'js/app.js'), 'utf8');

function requireText(pattern, message) {
  if (!pattern.test(appSource)) throw new Error(message);
}

requireText(/const SW_RUNTIME_VERSION = '[^']+';/, 'SW runtime version token is missing.');
requireText(/const SW_RUNTIME_URL = `\.\/sw-runtime\.js\?v=\$\{encodeURIComponent\(SW_RUNTIME_VERSION\)\}`;/, 'SW runtime URL is no longer cache-busted by version.');
requireText(/navigator\.serviceWorker\.addEventListener\('controllerchange'/, 'SW controllerchange reload guard is missing.');
requireText(/navigator\.serviceWorker\.register\(SW_RUNTIME_URL,\s*\{[\s\S]*updateViaCache:\s*'none'/, 'SW registration no longer forces fresh runtime fetch.');
requireText(/registration\.addEventListener\('updatefound'/, 'SW updatefound handler is missing.');
requireText(/installing\.postMessage\(\{ type: 'WQ_SKIP_WAITING' \}\)/, 'SW skip-waiting handoff is missing.');

console.log('regression check passed: service worker upgrade path');
