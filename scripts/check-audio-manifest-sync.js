#!/usr/bin/env node
/* eslint-disable no-console */
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT = path.resolve(__dirname, '..');
const WORDS_FILE = path.join(ROOT, 'data', 'words-inline.js');
const MANIFEST_FILE = path.join(ROOT, 'data', 'audio-manifest.json');

function fail(message) {
  console.error(`FAIL: ${message}`);
  process.exit(1);
}

function normalizePath(value) {
  if (!value || typeof value !== 'string') return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  if (/^(https?:)?\/\//i.test(trimmed) || trimmed.startsWith('blob:') || trimmed.startsWith('data:')) {
    return trimmed;
  }
  return trimmed.startsWith('/') ? trimmed : `/${trimmed}`;
}

function loadWords() {
  if (!fs.existsSync(WORDS_FILE)) {
    fail('Missing data/words-inline.js');
  }
  const source = fs.readFileSync(WORDS_FILE, 'utf8');
  const sandbox = { window: {} };
  vm.createContext(sandbox);
  vm.runInContext(source, sandbox, { filename: 'words-inline.js' });
  const data = sandbox.window?.WQ_WORD_DATA;
  if (!data || typeof data !== 'object') {
    fail('window.WQ_WORD_DATA is missing in data/words-inline.js');
  }
  return data;
}

function expectedFromWords(wordData) {
  const keyMap = ['word_audio', 'definition_audio', 'sentence_audio', 'fun_audio'];
  const paths = new Set();
  for (const entry of Object.values(wordData)) {
    const audio = entry?.audio_paths || {};
    keyMap.forEach((key) => {
      const value = normalizePath(audio[key]);
      if (value) paths.add(value);
    });
  }
  return [...paths].sort();
}

function run() {
  if (!fs.existsSync(MANIFEST_FILE)) {
    fail('Missing data/audio-manifest.json (run npm run audio:manifest)');
  }

  let manifest;
  try {
    manifest = JSON.parse(fs.readFileSync(MANIFEST_FILE, 'utf8'));
  } catch (error) {
    fail(`Invalid data/audio-manifest.json (${error.message})`);
  }

  if (!Array.isArray(manifest.paths)) {
    fail('data/audio-manifest.json must contain a paths[] array');
  }

  const expectedPaths = expectedFromWords(loadWords());
  const currentPaths = manifest.paths.map((p) => normalizePath(p)).filter(Boolean).sort();

  if (currentPaths.length !== expectedPaths.length) {
    fail(
      `audio manifest size mismatch: expected ${expectedPaths.length}, got ${currentPaths.length}. Run npm run audio:manifest`
    );
  }

  for (let i = 0; i < expectedPaths.length; i += 1) {
    if (expectedPaths[i] !== currentPaths[i]) {
      fail(
        `audio manifest drift at index ${i}. Expected ${expectedPaths[i]}, got ${currentPaths[i]}. Run npm run audio:manifest`
      );
    }
  }

  console.log(`PASS: data/audio-manifest.json is in sync (${currentPaths.length} unique paths).`);
}

run();
