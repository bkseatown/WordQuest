#!/usr/bin/env node
"use strict";

const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

const ROOT = process.cwd();
const PHRASE_PATH = path.join(ROOT, "data", "ava-phrases-v1.json");
const OUT_ROOT = path.join(ROOT, "audio", "ava", "v1");
const MANIFEST_PATH = path.join(OUT_ROOT, "manifest.json");
const DEFAULT_LIMIT = 350;
const DEFAULT_CONCURRENCY = 5;
const MAX_RETRIES = 2;

function arg(name, fallback) {
  const i = process.argv.indexOf(name);
  if (i === -1) return fallback;
  const v = process.argv[i + 1];
  return v === undefined || v.startsWith("--") ? true : v;
}

const DRY_RUN = process.argv.includes("--dry-run");
const LIMIT = Number(arg("--limit", DEFAULT_LIMIT)) || DEFAULT_LIMIT;
const CONCURRENCY = Math.min(DEFAULT_CONCURRENCY, Math.max(1, Number(arg("--concurrency", DEFAULT_CONCURRENCY)) || DEFAULT_CONCURRENCY));
const AZURE_KEY = process.env.AZURE_SPEECH_KEY || process.env.AZURE_TTS_KEY || "";
const AZURE_REGION = process.env.AZURE_SPEECH_REGION || process.env.AZURE_TTS_REGION || "";

function sanitizeText(value) {
  return String(value || "").replace(/\s+/g, " ").trim();
}

function slugify(input) {
  const cleaned = sanitizeText(input)
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
  const base = cleaned || "phrase";
  return base.slice(0, 50).replace(/-$/g, "") || "phrase";
}

function hashSuffix(text) {
  return crypto.createHash("sha1").update(text).digest("hex").slice(0, 6);
}

function ensureDir(dir) {
  fs.mkdirSync(dir, { recursive: true });
}

function escapeXml(text) {
  return String(text || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function loadPhraseBank() {
  const parsed = JSON.parse(fs.readFileSync(PHRASE_PATH, "utf8"));
  if (!parsed || typeof parsed !== "object" || !parsed.categories) {
    throw new Error("Invalid phrase file: missing categories");
  }
  return parsed;
}

function validatePhraseBank(bank) {
  const all = [];
  for (const [category, subs] of Object.entries(bank.categories || {})) {
    if (!subs || typeof subs !== "object") throw new Error(`Category ${category} is empty`);
    const subNames = Object.keys(subs);
    if (!subNames.length) throw new Error(`Category ${category} has no subcategories`);
    for (const [subcategory, list] of Object.entries(subs)) {
      if (!Array.isArray(list) || !list.length) throw new Error(`${category}.${subcategory} is empty`);
      list.forEach((phrase, index) => {
        const text = sanitizeText(phrase);
        const words = text.split(/\s+/).filter(Boolean).length;
        if (!text) throw new Error(`${category}.${subcategory}[${index}] empty`);
        if (words < 4 || words > 12) throw new Error(`${category}.${subcategory}[${index}] word count ${words}`);
        all.push(text.toLowerCase());
      });
    }
  }
  if (new Set(all).size !== all.length) {
    throw new Error("Duplicate phrases detected in phrase bank");
  }
}

function roundRobinQueue(bank, limit) {
  const buckets = [];
  for (const [category, subs] of Object.entries(bank.categories || {})) {
    for (const [subcategory, list] of Object.entries(subs || {})) {
      const phrases = list.map((p) => sanitizeText(p)).filter(Boolean);
      buckets.push({ category, subcategory, phrases, idx: 0 });
    }
  }

  const queue = [];
  let progressed = true;
  while (queue.length < limit && progressed) {
    progressed = false;
    for (const bucket of buckets) {
      if (queue.length >= limit) break;
      if (bucket.idx >= bucket.phrases.length) continue;
      queue.push({
        category: bucket.category,
        subcategory: bucket.subcategory,
        text: bucket.phrases[bucket.idx]
      });
      bucket.idx += 1;
      progressed = true;
    }
  }

  return queue;
}

function assignOutputFiles(queue) {
  const usedPerDir = new Map();
  return queue.map((item) => {
    const relDir = path.join("audio", "ava", "v1", item.category, item.subcategory);
    const absDir = path.join(ROOT, relDir);
    const key = relDir;
    if (!usedPerDir.has(key)) usedPerDir.set(key, new Set());
    const used = usedPerDir.get(key);

    let slug = slugify(item.text);
    if (used.has(slug)) slug = `${slug.slice(0, 43)}-${hashSuffix(item.text)}`;
    used.add(slug);

    return {
      ...item,
      file: path.join(relDir, `${slug}.mp3`).replace(/\\/g, "/"),
      absFile: path.join(absDir, `${slug}.mp3`)
    };
  });
}

async function synthesizeAzureMp3(text) {
  if (!AZURE_KEY || !AZURE_REGION) {
    throw new Error("Missing AZURE_SPEECH_KEY/AZURE_SPEECH_REGION");
  }

  const endpoint = `https://${AZURE_REGION}.tts.speech.microsoft.com/cognitiveservices/v1`;
  const ssml = [
    '<speak version="1.0" xml:lang="en-US">',
    '<voice name="en-US-AvaMultilingualNeural">',
    `<prosody rate="0%" pitch="0%">${escapeXml(text)}</prosody>`,
    "</voice>",
    "</speak>"
  ].join("");

  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      "Ocp-Apim-Subscription-Key": AZURE_KEY,
      "Content-Type": "application/ssml+xml",
      "X-Microsoft-OutputFormat": "audio-48khz-192kbitrate-mono-mp3",
      "User-Agent": "WordQuestAvaPackGen/1.0"
    },
    body: ssml
  });

  if (!response.ok) {
    throw new Error(`Azure TTS failed: ${response.status}`);
  }
  const contentType = String(response.headers.get("content-type") || "");
  if (!contentType.toLowerCase().startsWith("audio")) {
    const body = await response.text();
    throw new Error(`Azure TTS non-audio response: ${response.status} ${contentType} ${body.slice(0, 200)}`);
  }
  const arrayBuffer = await response.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);
  if (buffer.length <= 1024) {
    throw new Error(`Azure TTS returned small payload (${buffer.length} bytes)`);
  }
  return buffer;
}

async function withRetry(fn, retries) {
  let lastErr = null;
  for (let attempt = 0; attempt <= retries; attempt += 1) {
    try {
      return await fn(attempt);
    } catch (err) {
      lastErr = err;
      if (attempt < retries) {
        await new Promise((r) => setTimeout(r, 300 * (attempt + 1)));
      }
    }
  }
  throw lastErr;
}

async function processQueue(entries) {
  let processed = 0;
  let success = 0;
  let skipped = 0;
  let failed = 0;
  const failures = [];

  async function work(entry) {
    if (fs.existsSync(entry.absFile)) {
      skipped += 1;
      processed += 1;
      if (processed % 10 === 0) {
        console.log(`[ava-pack] ${processed}/${entries.length} processed (resume skip)`);
      }
      return { ...entry, status: "skipped" };
    }

    if (DRY_RUN) {
      ensureDir(path.dirname(entry.absFile));
      processed += 1;
      if (processed % 10 === 0) {
        console.log(`[ava-pack] ${processed}/${entries.length} processed (dry-run)`);
      }
      return { ...entry, status: "dry-run" };
    }

    try {
      const mp3 = await withRetry(async () => {
        return await synthesizeAzureMp3(entry.text);
      }, MAX_RETRIES);
      ensureDir(path.dirname(entry.absFile));
      const tmp = `${entry.absFile}.tmp-${process.pid}`;
      fs.writeFileSync(tmp, mp3);
      const size = fs.statSync(tmp).size;
      if (size <= 1024) {
        fs.unlinkSync(tmp);
        throw new Error(`Generated file too small (${size} bytes)`);
      }
      fs.renameSync(tmp, entry.absFile);
      success += 1;
      processed += 1;
      if (processed % 10 === 0) {
        console.log(`[ava-pack] ${processed}/${entries.length} processed`);
      }
      return { ...entry, status: "generated" };
    } catch (err) {
      failed += 1;
      processed += 1;
      failures.push({ file: entry.file, text: entry.text, error: String(err && err.message || err) });
      if (processed % 10 === 0) {
        console.log(`[ava-pack] ${processed}/${entries.length} processed`);
      }
      return { ...entry, status: "failed" };
    }
  }

  const results = [];
  let cursor = 0;

  async function worker() {
    while (cursor < entries.length) {
      const idx = cursor;
      cursor += 1;
      const result = await work(entries[idx]);
      results[idx] = result;
    }
  }

  const workers = [];
  for (let i = 0; i < CONCURRENCY; i += 1) {
    workers.push(worker());
  }
  await Promise.all(workers);

  return { results, success, skipped, failed, failures };
}

function writeManifest(entries) {
  ensureDir(path.dirname(MANIFEST_PATH));
  const payload = {
    version: "v1",
    voice: "AvaMultilingualNeural",
    generated: new Date().toISOString(),
    totalFiles: entries.length,
    files: entries.map((entry) => ({
      category: entry.category,
      subcategory: entry.subcategory,
      text: entry.text,
      file: entry.file
    }))
  };
  fs.writeFileSync(MANIFEST_PATH, JSON.stringify(payload, null, 2) + "\n");
}

function verifyGenerated(entries) {
  const existing = entries.filter((e) => fs.existsSync(e.absFile));
  const uniqueFiles = new Set(existing.map((e) => e.file));
  const uniqueText = new Set(entries.map((e) => e.text.toLowerCase()));
  return {
    expected: entries.length,
    existingFiles: existing.length,
    uniqueFiles: uniqueFiles.size,
    uniqueText: uniqueText.size
  };
}

function countByCategory(entries) {
  const counts = {};
  entries.forEach((entry) => {
    counts[entry.category] = (counts[entry.category] || 0) + 1;
  });
  return counts;
}

(async function main() {
  if (!DRY_RUN && (!AZURE_KEY || !AZURE_REGION)) {
    throw new Error("Azure credentials missing. Set AZURE_SPEECH_KEY and AZURE_SPEECH_REGION.");
  }

  const bank = loadPhraseBank();
  validatePhraseBank(bank);

  const queue = roundRobinQueue(bank, LIMIT);
  if (!queue.length) throw new Error("No phrases queued for generation");

  const entries = assignOutputFiles(queue);
  const processResult = await processQueue(entries);

  const successfulEntries = processResult.results.filter((r) => {
    if (r.status !== "generated" && r.status !== "skipped") return false;
    return fs.existsSync(r.absFile);
  });
  writeManifest(successfulEntries);

  const verify = verifyGenerated(successfulEntries);
  const categoryCounts = countByCategory(successfulEntries);

  console.log("[ava-pack] generation summary");
  console.log(JSON.stringify({
    queued: entries.length,
    success: processResult.success,
    skipped: processResult.skipped,
    failed: processResult.failed,
    verify,
    categoryCounts
  }, null, 2));

  if (processResult.failures.length) {
    const failurePath = path.join(OUT_ROOT, "failures.json");
    fs.writeFileSync(failurePath, JSON.stringify(processResult.failures, null, 2) + "\n");
    console.log(`[ava-pack] wrote failures: ${failurePath}`);
  }

  if (!DRY_RUN && processResult.failed > 0) {
    process.exitCode = 1;
  }
})();
