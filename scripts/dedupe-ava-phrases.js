#!/usr/bin/env node
// Deterministic dedupe + rewrite to ensure unique, label-free microcopy.
// Usage: node scripts/dedupe-ava-phrases.js --in data/ava-phrases-v2r2.json --out data/ava-phrases-v2r3.json

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const args = process.argv.slice(2);
function getArg(flag, def) {
  const idx = args.indexOf(flag);
  if (idx === -1) return def;
  return args[idx + 1] || def;
}
const inFile = getArg('--in', 'data/ava-phrases-v2r2.json');
const outFile = getArg('--out', 'data/ava-phrases-v2r3.json');

function load(file) {
  const full = path.isAbsolute(file) ? file : path.join(process.cwd(), file);
  const raw = JSON.parse(fs.readFileSync(full, 'utf8'));
  return Array.isArray(raw) ? raw : raw.phrases;
}

const openersByEvent = {
  before_first_guess: [
    'Plan one calm start', 'Begin steady with one clue', 'Choose one confident opener', 'Start deliberate and simple',
    'Anchor one rule before typing', 'Preview the pattern then pick one move', 'Open with control and one sure idea',
    'Take a breath and aim one step', 'Line up one clear action before you type', 'Settle your pace and pick one opener'
  ],
  first_miss: [
    'Miss is data; shift one slot', 'Use feedback and change one letter', 'Stay steady and make a single swap',
    'Read the clue and adjust once', 'Move one likely letter calmly', 'Let the colors guide one change',
    'Keep composure and alter one spot', 'Trust evidence; rotate one letter', 'Use the miss to target one fix',
    'Guide your next move from the clue'
  ],
  second_miss: [
    'Refine the pattern with one tweak', 'Tighten placement with a single shift', 'Focus this guess on one slot',
    'Lock greens and rotate a yellow', 'Pick the strongest letter and place it', 'Stabilize the pattern and move one piece',
    'Aim this try at the weakest slot', 'Concentrate on one correction now', 'Let certainty guide one position',
    'Use what you know and change one letter'
  ],
  rapid_wrong_streak: [
    'Slow down with one safe change', 'Pause, breathe, adjust one slot', 'Back off speed; fix one position',
    'Calm tempo with a single controlled move', 'Reset pace with one measured swap', 'Take control with one low-risk step',
    'Ease in and place one sure letter', 'Reduce rush; refine a single slot', 'Steady your rhythm; swap one piece',
    'Anchor control and make one edit'
  ],
  idle_20s: [
    'Re-engage with one sure letter', 'Pick a confident move to restart', 'Take a calm step to continue',
    'Focus back in and place one letter', 'Try one small move now', 'Wake the board with one certain slot',
    'Choose one vowel you trust', 'Nudge progress with one deliberate key', 'Simple restart: one careful letter',
    'Step back in with one grounded move'
  ],
  near_solve: [
    'You are close; verify one slot', 'Tighten the last piece carefully', 'Lock the pattern with one precise move',
    'Confirm endings before submitting', 'Hold gains; change one uncertain letter', 'Steady finish; check one placement',
    'Secure the final slot with intention', 'Review clues and adjust one last position', 'Protect greens and decide one yellow',
    'Aim for a clean close with one tweak'
  ],
  streak_three_correct: [
    'Level up with one justified move', 'Add challenge with one sharper test', 'Raise demand with a defended change',
    'Try an advanced pattern and explain it', 'Upgrade the pattern and state why', 'Stretch thinking with a precise shift',
    'Push yourself with one reasoned choice', 'Select the tougher option and back it', 'Elevate difficulty with control',
    'Make a bold move and justify it'
  ],
  win: [
    'Strong solve—note what worked next', 'Clean win—carry that control forward', 'Nice finish—queue a tougher word',
    'Great close—log the pattern that helped', 'Solved with poise—keep that tempo', 'Win logged—raise the bar gently',
    'Good finish—bookmark the best habit', 'Solid close—reuse that calm pace', 'You finished steady—line up the next',
    'Confident solve—apply it again soon'
  ],
  loss: [
    'Round down—reuse one learning', 'Reset with a new word, same calm pace', 'Loss logged—apply one takeaway',
    'Shake it off—start fresh with best habit', 'No worries—try again with one clear rule', 'Carry forward the strongest clue',
    'Restart with the most reliable opener', 'Use the lesson and retake the round', 'Take the insight and play again',
    'Reset tempo; keep your best move'
  ],
  default: [
    'Stay steady; act on clear evidence', 'Make one focused change', 'Calm tempo; single precise move',
    'Use the strongest clue; adjust once', 'Name the move, then do it', 'Select one action you trust',
    'Keep moves small and certain', 'Lead with the surest information', 'Move once with intent', 'Guide the step with evidence'
  ]
};

const actions = [
  'shift one letter with intent',
  'test a fresh vowel placement',
  'lock sure slots and adjust one neighbor',
  'avoid repeats and widen information',
  'place one high-info consonant',
  'confirm endings before adding risk',
  'narrow choices with a single swap',
  'keep greens fixed while rotating yellows',
  'protect gains and change one spot',
  'commit to the most likely letter',
  'verify the middle before the edges',
  'retest the vowel with a safer consonant',
  'focus on the least certain position',
  'probe a new consonant to learn more',
  'steady your hands and place one letter',
  'use contrast; change shape with one switch',
  'swap only what evidence suggests',
  'align pattern to endings first',
  'secure anchor letters, then adjust',
  'pair a vowel test with one steady consonant'
];

const closers = [
  'keep pace calm and specific',
  'aim for clarity over speed',
  'treat this as a quick test',
  'let the board teach you',
  'one step is enough right now',
  'stay in control of tempo',
  'listen to the evidence only',
  'finish this step before the next',
  'stay composed and precise',
  'observe the feedback after this move',
  'watch the colors and respond once',
  'stay even; no rush needed',
  'keep breathing steady as you place it',
  'notice the change and adjust next',
  'let the small move set up the next',
  'trust a single action to guide you',
  'remain patient while feedback appears',
  'commit then pause to read results',
  'hold calm focus through this change',
  'use this move to clarify the word'
];

function norm(text) {
  return String(text || '').replace(/\s+/g, ' ').trim().toLowerCase();
}

function buildUnique(phrase, used) {
  const openerList = openersByEvent[phrase.event] || openersByEvent.default;
  const hash = crypto.createHash('sha256').update(String(phrase.id)).digest('hex');
  let salt = parseInt(hash.slice(0, 8), 16);
  for (let attempt = 0; attempt < 5000; attempt += 1) {
    const o = openerList[(salt + attempt) % openerList.length];
    const a = actions[(salt + attempt * 3) % actions.length];
    const c = closers[(salt + attempt * 5) % closers.length];
    const line = `${o}. ${a}; ${c}.`.replace(/[:]/g, ' ').replace(/\s+/g, ' ').trim();
    if (!used.has(norm(line))) return line;
  }
  return `${openerList[0]}. ${actions[0]}; ${closers[0]}`;
}

const input = load(inFile);
const used = new Set();
const fixes = [];
let rewritten = 0;

const output = input.map((p) => {
  const out = { ...p };
  const fresh = buildUnique(out, used);
  out.text = fresh;
  rewritten += 1;
  fixes.push({ id: out.id, old: p.text, next: out.text });
  used.add(norm(out.text));
  return out;
});

// Final pass: enforce uniqueness by suffixing light variants if needed
const tailAdj = ['steady', 'clear', 'calm', 'focused', 'patient', 'measured', 'gentle', 'bright', 'sure', 'balanced', 'quiet', 'smooth', 'secure', 'solid', 'ready', 'soft', 'even', 'clean', 'precise', 'steadying'];
const tailNoun = ['signal', 'tempo', 'rhythm', 'step', 'stride', 'path', 'anchor', 'habit', 'breath', 'pacing', 'move', 'moment', 'choice', 'focus', 'guide', 'note', 'cue', 'line', 'pattern', 'touch'];
const tails = [];
for (let i = 0; i < 800; i += 1) {
  tails.push(`${tailAdj[i % tailAdj.length]} ${tailNoun[Math.floor(i / tailAdj.length) % tailNoun.length]}`);
}
const finalUsed = new Set();
output.forEach((p, idx) => {
  let t = p.text;
  let attempt = 0;
  while (finalUsed.has(norm(t)) && attempt < tails.length) {
    t = `${p.text} ${tails[(idx + attempt) % tails.length]}`.trim();
    attempt += 1;
  }
  if (finalUsed.has(norm(t))) {
    t = `${p.text} ${Date.now() % 1000}`; // last resort uniqueness
  }
  p.text = t;
  finalUsed.add(norm(t));
});

const outPayload = { version: '2.0', phrases: output };
const outFull = path.isAbsolute(outFile) ? outFile : path.join(process.cwd(), outFile);
fs.writeFileSync(outFull, JSON.stringify(outPayload, null, 2) + '\n');
console.log('Total phrases:', output.length);
console.log('Rewritten for uniqueness:', rewritten);
console.log('Examples:', fixes.slice(0, 10));
console.log('Wrote', outFull);
