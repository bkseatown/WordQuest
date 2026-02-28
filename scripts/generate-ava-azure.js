#!/usr/bin/env node
// Offline Azure TTS batch generator for Ava v2 corpus
// Usage: node scripts/generate-ava-azure.js [--limit N] [--concurrency N] [--resume] [--voice en-US-AvaMultilingualNeural]

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { buildSsml } = require('./ssml');

const root = path.resolve(__dirname, '..');
const defaultCorpus = path.join(root, 'data/ava-phrases-v2r3.json');
const phrasesPathArg = process.argv.includes('--phrases') ? process.argv[process.argv.indexOf('--phrases') + 1] : '';
const corpusPath = phrasesPathArg
  ? (path.isAbsolute(phrasesPathArg) ? phrasesPathArg : path.join(process.cwd(), phrasesPathArg))
  : defaultCorpus;
let audioRoot = path.join(root, 'audio/ava/current');
let manifestPath = path.join(audioRoot, 'manifest.json');

const AZURE_KEY = process.env.AZURE_SPEECH_KEY || process.env.AZURE_SPEECH_SECRET || '';
const AZURE_REGION = process.env.AZURE_SPEECH_REGION || '';
const AZURE_ENDPOINT = process.env.AZURE_SPEECH_ENDPOINT || '';
const VOICE_NAME = process.env.AVA_VOICE_NAME || '';
const OUTPUT_FORMAT = process.env.AVA_OUTPUT_FORMAT || 'audio-24khz-48kbitrate-mono-mp3';

const args = process.argv.slice(2);
function hasFlag(flag) { return args.includes(flag); }
function getArg(flag, defaultValue) {
  const idx = args.indexOf(flag);
  if (idx === -1) return defaultValue;
  const val = args[idx + 1];
  if (val === undefined) return defaultValue;
  if (/^\d+$/.test(val)) return Number(val);
  return val;
}

const limit = getArg('--limit', Infinity);
const concurrency = Math.max(1, getArg('--concurrency', 3));
const resume = hasFlag('--resume');
const voiceName = getArg('--voice', VOICE_NAME);
const style = getArg('--style', '');
const rate = getArg('--rate', '0%');
const pitch = getArg('--pitch', '0%');
const maxRetries = 2;
const printCount = hasFlag('--print') ? Number(getArg('--print', 5)) : 0;
const outRootArg = getArg('--outRoot', '');
if (outRootArg) {
  audioRoot = path.isAbsolute(outRootArg) ? outRootArg : path.join(root, outRootArg);
  manifestPath = path.join(audioRoot, 'manifest.json');
}

if (!VOICE_NAME) {
  console.error('Missing AVA_VOICE_NAME (required).');
  process.exit(1);
}

if (printCount <= 0 && (!AZURE_KEY || !(AZURE_REGION || AZURE_ENDPOINT))) {
  console.error('Missing AZURE_SPEECH_KEY and AZURE_SPEECH_REGION (or AZURE_SPEECH_ENDPOINT).');
  process.exit(1);
}

const corpus = JSON.parse(fs.readFileSync(corpusPath, 'utf8'));
const phrases = Array.isArray(corpus.phrases) ? corpus.phrases : [];
let manifestCache = { version: '2.0', voice: voiceName, outputFormat: OUTPUT_FORMAT, phrases: {} };
try {
  if (fs.existsSync(manifestPath)) {
    const existing = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
    if (existing && typeof existing === 'object') manifestCache = existing;
    if (!manifestCache.phrases) manifestCache.phrases = {};
  }
} catch (_e) {
  manifestCache = { version: '2.0', voice: voiceName, outputFormat: OUTPUT_FORMAT, phrases: {} };
}

function slugPath(phrase) {
  const domain = String(phrase.domain || 'misc').toLowerCase();
  const event = String(phrase.event || 'event').toLowerCase();
  const id = String(phrase.id || `${domain}.${event}`);
  return path.join(audioRoot, domain, event, `${id}.mp3`);
}

function stripTags(ssml) {
  return String(ssml || '').replace(/<[^>]+>/g, ' ').replace(/\\s+/g, ' ').trim();
}

function resolveSpokenPhrase(phrase) {
  if (!phrase || typeof phrase !== 'object') throw new Error('Invalid phrase object');
  const id = String(phrase.id || '');
  const ssmlField = typeof phrase.ssml === 'string' ? phrase.ssml.trim() : '';
  const textField = typeof phrase.text === 'string' ? phrase.text.trim() : '';
  const phraseField = typeof phrase.phrase === 'string' ? phrase.phrase.trim() : '';
  const lineField = typeof phrase.line === 'string' ? phrase.line.trim() : '';

  if (ssmlField && /<speak/i.test(ssmlField)) {
    return { ssml: ssmlField, preview: stripTags(ssmlField) };
  }
  const spoken = textField || phraseField || lineField;
  if (!spoken) throw new Error(`No spoken text fields found for id=${id}`);
  return { ssml: buildSsml(spoken, voiceName, { rate, pitch, style }), preview: spoken };
}

function isIdLike(text) {
  const t = String(text || '').toLowerCase();
  return /wordquest\\./i.test(t) ||
    /(before_first_guess|first_miss|second_miss|idle_20s|rapid_wrong_streak)/i.test(t) ||
    /\\bwq\\b/.test(t) ||
    /\\.\\d{2}\\b/.test(t) ||
    /^\\s*[\\w ]{3,30}:\\s+/.test(t);
}

function normalizedText(preview) {
  return String(preview || '').toLowerCase().replace(/\\s+/g, ' ').trim();
}

function textHash(preview) {
  return crypto.createHash('sha256').update(normalizedText(preview) + voiceName + OUTPUT_FORMAT).digest('hex');
}

function md5(buffer) {
  return crypto.createHash('md5').update(buffer).digest('hex');
}

function ensureDir(filePath) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
}

function buildEndpoint() {
  if (AZURE_ENDPOINT) return AZURE_ENDPOINT.replace(/\/?$/, '/');
  return `https://${AZURE_REGION}.tts.speech.microsoft.com/cognitiveservices/v1`;
}

const endpoint = buildEndpoint();

function httpPostAzure(ssml) {
  if (typeof fetch === 'function') {
    return fetch(endpoint, {
      method: 'POST',
      headers: {
        'Ocp-Apim-Subscription-Key': AZURE_KEY,
        'Content-Type': 'application/ssml+xml',
        'X-Microsoft-OutputFormat': OUTPUT_FORMAT,
        'User-Agent': 'WordQuest-Ava-Generator/2.0'
      },
      body: ssml
    });
  }

  // Fallback for runtimes without fetch
  const https = require('https');
  const url = new URL(endpoint);
  return new Promise((resolve, reject) => {
    const req = https.request({
      hostname: url.hostname,
      path: url.pathname + url.search,
      method: 'POST',
      headers: {
        'Ocp-Apim-Subscription-Key': AZURE_KEY,
        'Content-Type': 'application/ssml+xml',
        'X-Microsoft-OutputFormat': OUTPUT_FORMAT,
        'User-Agent': 'WordQuest-Ava-Generator/2.0',
        'Content-Length': Buffer.byteLength(ssml)
      }
    }, (res) => {
      const chunks = [];
      res.on('data', (d) => chunks.push(d));
      res.on('end', () => {
        const buffer = Buffer.concat(chunks);
        const resp = {
          ok: res.statusCode >= 200 && res.statusCode < 300,
          status: res.statusCode,
          statusText: res.statusMessage,
          headers: {
            get(name) {
              const key = name.toLowerCase();
              const found = Object.entries(res.headers).find(([k]) => k.toLowerCase() === key);
              return found ? Array.isArray(found[1]) ? found[1][0] : found[1] : null;
            }
          },
          async arrayBuffer() { return buffer; },
          async text() { return buffer.toString('utf8'); }
        };
        resolve(resp);
      });
    });
    req.on('error', reject);
    req.setTimeout(20000, () => {
      req.destroy(new Error('request-timeout'));
    });
    req.write(ssml);
    req.end();
  });
}

async function synthesize(phrase) {
  const { ssml, preview } = resolveSpokenPhrase(phrase);
  if (isIdLike(preview)) {
    const err = new Error(`refusing-to-speak-idlike text; id=${phrase.id} text=${preview}`);
    err.status = 400;
    throw err;
  }
  let res;
  try {
    res = await httpPostAzure(ssml);
  } catch (err) {
    const e = new Error(`tts-request-failed id=${phrase.id} msg=${err.message || err}`);
    e.status = err.status || 0;
    throw e;
  }
  const ctype = (res.headers.get('content-type') || '').toLowerCase();
  if (!res.ok || !ctype.startsWith('audio/')) {
    const body = await res.text().catch(() => '');
    const snippet = body.slice(0, 200);
    const err = new Error(`tts-failed id=${phrase.id} status=${res.status} ${res.statusText} body=${snippet}`);
    err.status = res.status;
    throw err;
  }
  const buffer = Buffer.from(await res.arrayBuffer());
  return buffer;
}

function shouldRetry(err) {
  const status = Number(err.status || 0);
  if (status === 429) return true;
  if (status >= 500 && status < 600) return true;
  return false;
}

async function withRetry(fn, maxRetry) {
  let attempt = 0;
  while (true) {
    try {
      return await fn();
    } catch (err) {
      if (!shouldRetry(err) || attempt >= maxRetry) throw err;
      const jitter = Math.random() * 200;
      const delay = 500 * Math.pow(2, attempt) + jitter;
      await new Promise((r) => setTimeout(r, delay));
      attempt += 1;
    }
  }
}

async function processPhrase(phrase) {
  const resolved = resolveSpokenPhrase(phrase);
  if (isIdLike(resolved.preview)) {
    throw new Error(`refusing-to-speak-idlike text; id=${phrase.id} text=${resolved.preview}`);
  }
  const outPath = slugPath(phrase);
  const entry = manifestCache.phrases && manifestCache.phrases[phrase.id];
  const currentHash = textHash(resolved.preview);
  if (resume && fs.existsSync(outPath) && fs.statSync(outPath).size > 1024 && entry && entry.textHash === currentHash) {
    return { status: 'skipped', outPath };
  }
  ensureDir(outPath);
  const buffer = await withRetry(() => synthesize(phrase), maxRetries);
  fs.writeFileSync(outPath, buffer);
  const size = fs.statSync(outPath).size;
  if (size <= 1024) {
    fs.unlinkSync(outPath);
    throw new Error(`tts-too-small id=${phrase.id} size=${size}`);
  }
  const fileMd5 = md5(buffer);
  manifestCache.phrases[phrase.id] = {
    id: phrase.id,
    domain: phrase.domain,
    event: phrase.event,
    file: path.relative(root, outPath).replace(/\\\\/g, '/'),
    size,
    md5: fileMd5,
    textHash: currentHash
  };
  return { status: 'generated', outPath };
}

async function run() {
  let todo = phrases.slice(0, Number.isFinite(limit) ? limit : phrases.length);
  if (printCount > 0) {
    const sample = todo.slice(0, printCount);
    sample.forEach((p, i) => {
      const resolved = resolveSpokenPhrase(p);
      const preview = resolved.preview.slice(0, 120);
      const rel = path.relative(root, slugPath(p)).replace(/\\/g, '/');
      console.log(`${i + 1}. ${p.id} -> ${rel} :: ${preview}`);
    });
    process.exit(0);
  }

  console.log(`Phrases to process: ${todo.length}; concurrency=${concurrency}; resume=${resume}`);

  let generated = 0;
  let skipped = 0;
  let failed = 0;
  const errors = [];

  let idx = 0;
  const results = [];

  async function worker() {
    while (idx < todo.length) {
      const current = todo[idx++];
      try {
        const res = await processPhrase(current);
        if (res.status === 'generated') generated += 1; else skipped += 1;
      } catch (err) {
        failed += 1;
        errors.push({ id: current.id, error: err.message });
      }
      if ((generated + skipped + failed) % 25 === 0) {
        console.log(`Progress: gen=${generated} skip=${skipped} fail=${failed}`);
      }
    }
  }

  const workers = Array.from({ length: concurrency }, () => worker());
  await Promise.all(workers);

  manifestCache.version = '2.0';
  manifestCache.voice = voiceName;
  manifestCache.outputFormat = OUTPUT_FORMAT;
  manifestCache.generated = new Date().toISOString();
  ensureDir(manifestPath);
  fs.writeFileSync(manifestPath, JSON.stringify(manifestCache, null, 2) + '\n');

  console.log(`Done. generated=${generated}, skipped=${skipped}, failed=${failed}`);
  if (errors.length) {
    console.error('Failures:');
    errors.slice(0, 10).forEach((e) => console.error(` - ${e.id}: ${e.error}`));
  }
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
