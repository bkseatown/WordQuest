#!/usr/bin/env node
/* eslint-disable no-console */
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT = path.resolve(__dirname, '..');
const INPUT_FILE = path.join(ROOT, 'data', 'words-inline.js');
const OUTPUT_FILE = path.join(ROOT, 'data', 'audio-manifest.json');

function loadWordData() {
  if (!fs.existsSync(INPUT_FILE)) {
    throw new Error(`Missing input file: ${INPUT_FILE}`);
  }

  const source = fs.readFileSync(INPUT_FILE, 'utf8');
  const sandbox = { window: {} };
  vm.createContext(sandbox);
  vm.runInContext(source, sandbox, { filename: 'words-inline.js' });

  const data = sandbox.window?.WQ_WORD_DATA;
  if (!data || typeof data !== 'object') {
    throw new Error('window.WQ_WORD_DATA was not found in data/words-inline.js');
  }
  return data;
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

function buildManifest(wordData) {
  const keyMap = {
    word: 'word_audio',
    def: 'definition_audio',
    sentence: 'sentence_audio',
    fun: 'fun_audio'
  };

  const counts = { word: 0, def: 0, sentence: 0, fun: 0 };
  const unique = new Set();

  for (const entry of Object.values(wordData)) {
    const audioPaths = entry?.audio_paths || {};
    Object.entries(keyMap).forEach(([type, sourceKey]) => {
      const normalized = normalizePath(audioPaths[sourceKey]);
      if (!normalized) return;
      counts[type] += 1;
      unique.add(normalized);
    });
  }

  const paths = [...unique].sort();
  const totalRefs = Object.values(counts).reduce((sum, n) => sum + n, 0);

  return {
    generated_at: new Date().toISOString(),
    source_file: 'data/words-inline.js',
    words_count: Object.keys(wordData).length,
    referenced_audio_count: totalRefs,
    unique_audio_paths_count: paths.length,
    counts_by_type: counts,
    paths
  };
}

function main() {
  const data = loadWordData();
  const manifest = buildManifest(data);
  fs.writeFileSync(OUTPUT_FILE, `${JSON.stringify(manifest, null, 2)}\n`, 'utf8');
  console.log(
    `Wrote data/audio-manifest.json with ${manifest.unique_audio_paths_count} unique audio path(s).`
  );
}

main();
