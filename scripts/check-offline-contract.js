#!/usr/bin/env node
/* eslint-disable no-console */
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const REQUIRED_FILES = [
  'sw.js',
  'sw-runtime.js',
  'data/audio-manifest.json',
  'js/app.js',
  'js/audio.js',
  'index.html'
];

let failures = 0;

function pass(msg) {
  console.log(`PASS: ${msg}`);
}

function fail(msg) {
  failures += 1;
  console.error(`FAIL: ${msg}`);
}

function read(relativePath) {
  return fs.readFileSync(path.join(ROOT, relativePath), 'utf8');
}

function exists(relativePath) {
  return fs.existsSync(path.join(ROOT, relativePath));
}

for (const file of REQUIRED_FILES) {
  if (exists(file)) pass(`${file} exists`);
  else fail(`${file} is missing`);
}

if (!failures) {
  try {
    const manifest = JSON.parse(read('data/audio-manifest.json'));
    if (!Array.isArray(manifest.paths) || manifest.paths.length < 1000) {
      fail('data/audio-manifest.json must contain a non-trivial paths[] array');
    } else {
      pass(`audio manifest has ${manifest.paths.length} path(s)`);
    }
  } catch (error) {
    fail(`data/audio-manifest.json is not valid JSON (${error.message})`);
  }
}

const appJs = exists('js/app.js') ? read('js/app.js') : '';
const audioJs = exists('js/audio.js') ? read('js/audio.js') : '';
const swJs = exists('sw.js') ? read('sw.js') : '';
const swRuntimeJs = exists('sw-runtime.js') ? read('sw-runtime.js') : '';

const hasWorkerRegisterCall = /serviceWorker\.register\(\s*(?:SW_RUNTIME_URL|['"]\.\/sw(?:-runtime)?\.js(?:\?[^'"]*)?['"])/.test(appJs);
const hasRuntimePath = /(?:SW_RUNTIME_URL\s*=\s*[`'"]\.\/sw-runtime\.js(?:\?[^`'"]*)?[`'"])|(?:serviceWorker\.register\(\s*['"]\.\/sw(?:-runtime)?\.js(?:\?[^'"]*)?['"])/.test(appJs);

if (!hasWorkerRegisterCall || !hasRuntimePath) {
  fail('js/app.js is missing service worker registration for ./sw.js or ./sw-runtime.js');
} else {
  pass('js/app.js registers service worker runtime');
}

if (!/AUDIO_MANIFEST_URL/.test(audioJs) || !/audio-manifest\.json/.test(audioJs)) {
  fail('js/audio.js is missing manifest wiring');
} else {
  pass('js/audio.js references audio manifest');
}

const swRuntimeSource = swRuntimeJs || swJs;
if (!/assets\/audio/.test(swRuntimeSource) || !/AUDIO_CACHE/.test(swRuntimeSource)) {
  fail('service worker runtime is missing runtime audio cache strategy');
} else {
  pass('service worker runtime defines runtime audio cache strategy');
}

if (failures) {
  console.error(`\nOffline contract check failed with ${failures} issue(s).`);
  process.exit(1);
}

console.log('\nOffline contract check passed.');
