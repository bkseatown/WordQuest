#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

const fileArg = process.argv[2] || 'data/ava-phrases-v2r2.json';
const filePath = path.isAbsolute(fileArg) ? fileArg : path.join(process.cwd(), fileArg);
if (!fs.existsSync(filePath)) {
  console.error(`Missing file: ${filePath}`);
  process.exit(1);
}

const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
const phrases = Array.isArray(data.phrases) ? data.phrases : [];

const labelPatterns = [
  /\bWQ\b/i,
  /(Before First Guess|First Miss|Second Miss|Idle)/i,
  /wordquest\./i,
  /^\s*[\w ]{3,30}:\s+/
];

const failures = [];
phrases.forEach((p) => {
  if (!p || !p.id || !p.text || !String(p.text).trim()) {
    failures.push({ id: p && p.id, reason: 'missing id/text', text: p && p.text });
    return;
  }
  const t = String(p.text).trim();
  if (labelPatterns.some((re) => re.test(t))) {
    failures.push({ id: p.id, reason: 'label-like', text: t });
  }
});

// Global uniqueness
const seen = new Set();
phrases.forEach((p) => {
  const key = String(p.text || '').toLowerCase().replace(/\s+/g, ' ').trim();
  if (seen.has(key)) {
    failures.push({ id: p.id, reason: 'duplicate-text', text: p.text });
  }
  seen.add(key);
});

console.log(`Checked ${phrases.length} phrases from ${filePath}`);
if (failures.length) {
  console.error(`Failures: ${failures.length}`);
  failures.slice(0, 10).forEach((f, i) => {
    console.error(`${i + 1}. ${f.id} :: ${f.reason} :: ${String(f.text).slice(0, 140)}`);
  });
  process.exit(1);
}
console.log('Validation passed.');
