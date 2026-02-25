#!/usr/bin/env node
/* eslint-disable no-console */
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const OUT_DIR = path.join(ROOT, 'assets', 'music', 'tracks', 'focus-flow');
const SAMPLE_RATE = 32000;
const DURATION_SEC = 36;
const MAX_PEAK = 0.92;

const TRACKS = [
  {
    title: 'Cognitive Anchor',
    slug: 'cognitive-anchor',
    bpm: 72,
    rootMidi: 46,
    modes: ['deepfocus', 'focus', 'chill', 'coffee', 'stealth'],
    energy: 'low',
    profile: 'adhd-focus',
    prog: [
      [0, 3, 7],
      [2, 5, 9],
      [5, 8, 12],
      [3, 7, 10]
    ],
    melody: [0, 2, 3, 5, 3, 2, 0, 2]
  },
  {
    title: 'Flow State Lattice',
    slug: 'flow-state-lattice',
    bpm: 80,
    rootMidi: 48,
    modes: ['deepfocus', 'focus', 'lofi', 'coffee'],
    energy: 'low',
    profile: 'adhd-focus',
    prog: [
      [0, 4, 7],
      [2, 5, 9],
      [5, 9, 12],
      [4, 7, 11]
    ],
    melody: [0, 2, 4, 5, 7, 5, 4, 2]
  },
  {
    title: 'Hyperfocus Halo',
    slug: 'hyperfocus-halo',
    bpm: 88,
    rootMidi: 50,
    modes: ['deepfocus', 'focus', 'lofi', 'chill'],
    energy: 'mid',
    profile: 'adhd-focus',
    prog: [
      [0, 3, 7],
      [5, 8, 12],
      [2, 5, 9],
      [4, 7, 11]
    ],
    melody: [0, 3, 5, 7, 8, 7, 5, 3]
  },
  {
    title: 'Task Tunnel',
    slug: 'task-tunnel',
    bpm: 96,
    rootMidi: 52,
    modes: ['deepfocus', 'focus', 'upbeat', 'team'],
    energy: 'mid',
    profile: 'adhd-focus',
    prog: [
      [0, 4, 7],
      [5, 9, 12],
      [7, 11, 14],
      [2, 5, 9]
    ],
    melody: [0, 2, 4, 7, 9, 11, 9, 7]
  },
  {
    title: 'String Theory Sprint',
    slug: 'string-theory-sprint',
    bpm: 104,
    rootMidi: 55,
    modes: ['classicalbeats', 'focus', 'upbeat', 'sports'],
    energy: 'mid',
    profile: 'classical-beats',
    prog: [
      [0, 4, 7],
      [2, 5, 9],
      [4, 7, 11],
      [5, 9, 12]
    ],
    melody: [0, 4, 7, 9, 11, 9, 7, 4]
  },
  {
    title: 'Baroque Pulse',
    slug: 'baroque-pulse',
    bpm: 112,
    rootMidi: 57,
    modes: ['classicalbeats', 'focus', 'arcade', 'upbeat'],
    energy: 'mid',
    profile: 'classical-beats',
    prog: [
      [0, 3, 7],
      [7, 10, 14],
      [5, 8, 12],
      [3, 7, 10]
    ],
    melody: [0, 3, 7, 10, 12, 10, 7, 3]
  },
  {
    title: 'Counterpoint Drive',
    slug: 'counterpoint-drive',
    bpm: 118,
    rootMidi: 53,
    modes: ['classicalbeats', 'focus', 'sports', 'team'],
    energy: 'mid',
    profile: 'classical-beats',
    prog: [
      [0, 4, 7],
      [5, 9, 12],
      [2, 5, 9],
      [7, 11, 14]
    ],
    melody: [0, 2, 4, 7, 9, 7, 4, 2]
  },
  {
    title: 'Fugue Runner',
    slug: 'fugue-runner',
    bpm: 126,
    rootMidi: 50,
    modes: ['classicalbeats', 'focus', 'upbeat', 'arcade'],
    energy: 'mid',
    profile: 'classical-beats',
    prog: [
      [0, 3, 7],
      [2, 5, 9],
      [7, 10, 14],
      [5, 8, 12]
    ],
    melody: [0, 2, 3, 5, 7, 10, 12, 10]
  },
  {
    title: 'Code Cipher Run',
    slug: 'code-cipher-run',
    bpm: 132,
    rootMidi: 58,
    modes: ['nerdcore', 'focus', 'scifi', 'arcade', 'upbeat'],
    energy: 'mid',
    profile: 'nerdcore-inst',
    prog: [
      [0, 4, 7],
      [7, 11, 14],
      [5, 9, 12],
      [2, 5, 9]
    ],
    melody: [0, 4, 7, 11, 12, 11, 7, 4]
  },
  {
    title: 'Pixel Sonata Rush',
    slug: 'pixel-sonata-rush',
    bpm: 138,
    rootMidi: 55,
    modes: ['nerdcore', 'focus', 'arcade', 'sports', 'team'],
    energy: 'mid',
    profile: 'nerdcore-inst',
    prog: [
      [0, 3, 7],
      [5, 8, 12],
      [7, 10, 14],
      [2, 5, 9]
    ],
    melody: [0, 3, 5, 7, 10, 12, 10, 7]
  },
  {
    title: 'Boss Stage Blueprint',
    slug: 'boss-stage-blueprint',
    bpm: 142,
    rootMidi: 57,
    modes: ['nerdcore', 'focus', 'scifi', 'team'],
    energy: 'mid',
    profile: 'nerdcore-inst',
    prog: [
      [0, 4, 7],
      [2, 5, 9],
      [5, 9, 12],
      [7, 11, 14]
    ],
    melody: [0, 2, 4, 7, 11, 9, 7, 4]
  },
  {
    title: 'Arcade Algorithm',
    slug: 'arcade-algorithm',
    bpm: 128,
    rootMidi: 52,
    modes: ['nerdcore', 'focus', 'arcade', 'scifi', 'upbeat'],
    energy: 'low',
    profile: 'nerdcore-inst',
    prog: [
      [0, 3, 7],
      [5, 8, 12],
      [2, 5, 9],
      [7, 10, 14]
    ],
    melody: [0, 2, 3, 5, 7, 8, 10, 8]
  }
];

function mulberry32(seed) {
  let t = seed >>> 0;
  return () => {
    t += 0x6D2B79F5;
    let r = Math.imul(t ^ (t >>> 15), 1 | t);
    r ^= r + Math.imul(r ^ (r >>> 7), 61 | r);
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
}

function hashText(text) {
  let h = 2166136261;
  for (let i = 0; i < text.length; i += 1) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function midiToHz(midi) {
  return 440 * Math.pow(2, (midi - 69) / 12);
}

function clampSample(v) {
  if (!Number.isFinite(v)) return 0;
  if (v > 1) return 1;
  if (v < -1) return -1;
  return v;
}

function osc(kind, phase) {
  if (kind === 'triangle') {
    return 2 * Math.abs(2 * ((phase / (2 * Math.PI)) % 1) - 1) - 1;
  }
  if (kind === 'square') {
    return Math.sin(phase) >= 0 ? 1 : -1;
  }
  return Math.sin(phase);
}

function envelope(sampleIndex, totalSamples, attackSamples, releaseSamples) {
  if (sampleIndex < attackSamples) return sampleIndex / Math.max(1, attackSamples);
  const tailIndex = totalSamples - sampleIndex;
  if (tailIndex < releaseSamples) return tailIndex / Math.max(1, releaseSamples);
  return 1;
}

function addTone(buffer, startSec, durSec, freq, amp, wave = 'sine', detune = 0) {
  if (!freq || !amp || durSec <= 0) return;
  const start = Math.floor(startSec * SAMPLE_RATE);
  const total = Math.floor(durSec * SAMPLE_RATE);
  if (start >= buffer.length || total <= 2) return;
  const attack = Math.floor(Math.min(total * 0.2, SAMPLE_RATE * 0.015));
  const release = Math.floor(Math.min(total * 0.35, SAMPLE_RATE * 0.08));
  const maxLen = Math.min(total, buffer.length - start);
  const twoPi = Math.PI * 2;

  for (let i = 0; i < maxLen; i += 1) {
    const t = i / SAMPLE_RATE;
    const env = envelope(i, maxLen, attack, release);
    const base = osc(wave, twoPi * freq * t);
    const wobble = detune ? osc('sine', twoPi * (freq + detune) * t) * 0.22 : 0;
    buffer[start + i] += (base + wobble) * amp * env;
  }
}

function addKick(buffer, startSec, amp = 0.7) {
  const start = Math.floor(startSec * SAMPLE_RATE);
  const len = Math.floor(SAMPLE_RATE * 0.23);
  const maxLen = Math.min(len, buffer.length - start);
  if (maxLen <= 0) return;
  for (let i = 0; i < maxLen; i += 1) {
    const t = i / SAMPLE_RATE;
    const progress = i / maxLen;
    const freq = 148 - (106 * progress);
    const env = Math.exp(-7.2 * progress);
    const body = Math.sin(2 * Math.PI * freq * t);
    const click = Math.sin(2 * Math.PI * 190 * t) * Math.exp(-60 * progress);
    buffer[start + i] += (body * 0.95 + click * 0.18) * amp * env;
  }
}

function addSnare(buffer, startSec, rand, amp = 0.23) {
  const start = Math.floor(startSec * SAMPLE_RATE);
  const len = Math.floor(SAMPLE_RATE * 0.16);
  const maxLen = Math.min(len, buffer.length - start);
  if (maxLen <= 0) return;
  for (let i = 0; i < maxLen; i += 1) {
    const progress = i / maxLen;
    const env = Math.exp(-10 * progress);
    const noise = (rand() * 2 - 1);
    const tone = Math.sin(2 * Math.PI * 180 * (i / SAMPLE_RATE)) * 0.25;
    buffer[start + i] += (noise * 0.92 + tone) * amp * env;
  }
}

function addHat(buffer, startSec, rand, amp = 0.11) {
  const start = Math.floor(startSec * SAMPLE_RATE);
  const len = Math.floor(SAMPLE_RATE * 0.08);
  const maxLen = Math.min(len, buffer.length - start);
  if (maxLen <= 0) return;
  let hp = 0;
  for (let i = 0; i < maxLen; i += 1) {
    const progress = i / maxLen;
    const env = Math.exp(-16 * progress);
    const noise = rand() * 2 - 1;
    hp = noise - hp * 0.82;
    buffer[start + i] += hp * amp * env;
  }
}

function normalize(buffer) {
  let peak = 0;
  for (let i = 0; i < buffer.length; i += 1) {
    const abs = Math.abs(buffer[i]);
    if (abs > peak) peak = abs;
  }
  if (peak <= 0.00001) return;
  const gain = Math.min(1, MAX_PEAK / peak);
  for (let i = 0; i < buffer.length; i += 1) {
    buffer[i] *= gain;
  }
}

function writeWavMono16(filePath, samples) {
  const dataSize = samples.length * 2;
  const blockAlign = 2;
  const byteRate = SAMPLE_RATE * blockAlign;
  const buffer = Buffer.alloc(44 + dataSize);

  buffer.write('RIFF', 0, 4, 'ascii');
  buffer.writeUInt32LE(36 + dataSize, 4);
  buffer.write('WAVE', 8, 4, 'ascii');
  buffer.write('fmt ', 12, 4, 'ascii');
  buffer.writeUInt32LE(16, 16);
  buffer.writeUInt16LE(1, 20);
  buffer.writeUInt16LE(1, 22);
  buffer.writeUInt32LE(SAMPLE_RATE, 24);
  buffer.writeUInt32LE(byteRate, 28);
  buffer.writeUInt16LE(blockAlign, 32);
  buffer.writeUInt16LE(16, 34);
  buffer.write('data', 36, 4, 'ascii');
  buffer.writeUInt32LE(dataSize, 40);

  for (let i = 0; i < samples.length; i += 1) {
    const clamped = clampSample(samples[i]);
    const int16 = clamped < 0 ? Math.round(clamped * 32768) : Math.round(clamped * 32767);
    buffer.writeInt16LE(int16, 44 + (i * 2));
  }

  fs.writeFileSync(filePath, buffer);
}

function renderTrack(track) {
  const rand = mulberry32(hashText(`${track.slug}:${track.bpm}`));
  const totalSamples = Math.floor(SAMPLE_RATE * DURATION_SEC);
  const samples = new Float32Array(totalSamples);

  const beatSec = 60 / track.bpm;
  const barSec = beatSec * 4;
  const bars = Math.floor(DURATION_SEC / barSec);
  const melodyLen = track.melody.length;
  const profile = String(track.profile || '').trim().toLowerCase();
  const isAdhdFocus = profile === 'adhd-focus';
  const isClassicalBeats = profile === 'classical-beats';
  const isNerdcoreInst = profile === 'nerdcore-inst';

  for (let bar = 0; bar < bars; bar += 1) {
    const barStart = bar * barSec;
    const chord = track.prog[bar % track.prog.length];

    // Pad chord: long, soft, wide.
    chord.forEach((interval, idx) => {
      const midi = track.rootMidi + interval + (idx === 2 ? 12 : 0);
      const padAmp = isAdhdFocus ? 0.058 : 0.048;
      const padWave = isClassicalBeats ? 'sine' : 'triangle';
      addTone(samples, barStart, barSec * 0.95, midiToHz(midi), padAmp, padWave, idx === 0 ? 0.19 : 0.12);
      if (isClassicalBeats && idx <= 1) {
        addTone(samples, barStart + (idx * beatSec * 0.5), beatSec * 0.46, midiToHz(midi + 12), 0.043, 'triangle', 0.06);
      }
    });

    // Bass pulse each beat.
    for (let beat = 0; beat < 4; beat += 1) {
      const beatStart = barStart + beat * beatSec;
      const bassMidi = track.rootMidi + chord[0] - 12;
      addTone(samples, beatStart, beatSec * 0.62, midiToHz(bassMidi), isAdhdFocus ? 0.12 : 0.14, 'sine', 0.09);

      // Kick on each beat, stronger on 1 + 3.
      const kickAmp = isAdhdFocus ? (beat % 2 === 0 ? 0.48 : 0.39) : (beat % 2 === 0 ? 0.66 : 0.52);
      addKick(samples, beatStart, kickAmp);

      // Snare on beats 2 and 4.
      if (beat === 1 || beat === 3) {
        const snareAmp = isAdhdFocus
          ? (track.energy === 'mid' ? 0.16 : 0.13)
          : (track.energy === 'mid' ? 0.24 : 0.2);
        addSnare(samples, beatStart + beatSec * 0.02, rand, snareAmp);
      }

      // Hi-hat on eighth notes.
      const hatAmp = isAdhdFocus
        ? (track.energy === 'mid' ? 0.065 : 0.05)
        : (track.energy === 'mid' ? 0.13 : 0.1);
      addHat(samples, beatStart + beatSec * 0.5, rand, hatAmp);
    }

    // Melody on eighth notes.
    for (let step = 0; step < 8; step += 1) {
      const noteIndex = (bar * 8 + step) % melodyLen;
      const interval = track.melody[noteIndex];
      const start = barStart + step * (beatSec / 2);
      const dur = (beatSec / 2) * 0.82;
      const octave = step % 2 === 0 ? 12 : 0;
      const midi = track.rootMidi + interval + octave;
      const melodyWave = isClassicalBeats ? 'triangle' : isNerdcoreInst ? 'square' : (track.energy === 'mid' ? 'square' : 'triangle');
      const melodyAmp = isAdhdFocus
        ? (track.energy === 'mid' ? 0.06 : 0.05)
        : (track.energy === 'mid' ? 0.082 : 0.068);
      addTone(
        samples,
        start,
        dur,
        midiToHz(midi),
        melodyAmp,
        melodyWave,
        0.16
      );
      if (isNerdcoreInst && step % 2 === 1) {
        addTone(samples, start, dur * 0.72, midiToHz(midi + 12), 0.03, 'square', 0.12);
      }
    }
  }

  // Gentle master shimmer.
  for (let i = 0; i < samples.length; i += 1) {
    const t = i / SAMPLE_RATE;
    samples[i] += Math.sin(2 * Math.PI * 0.33 * t) * 0.006;
  }

  normalize(samples);

  const filename = `${track.slug}__modes-${track.modes.join('+')}__bpm-${track.bpm}__energy-${track.energy}__license-original-focus-flow-pack.wav`;
  const outPath = path.join(OUT_DIR, filename);
  writeWavMono16(outPath, samples);
  return { outPath, filename };
}

function main() {
  fs.mkdirSync(OUT_DIR, { recursive: true });
  fs.readdirSync(OUT_DIR)
    .filter((name) => name.toLowerCase().endsWith('.wav'))
    .forEach((name) => {
      fs.unlinkSync(path.join(OUT_DIR, name));
    });
  const made = TRACKS.map(renderTrack);
  console.log(`Generated ${made.length} focus-flow tracks:`);
  made.forEach((entry) => {
    const size = fs.statSync(entry.outPath).size;
    console.log(`- ${entry.filename} (${(size / (1024 * 1024)).toFixed(2)} MB)`);
  });
}

main();
