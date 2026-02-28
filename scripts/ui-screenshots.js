#!/usr/bin/env node
"use strict";

const fs = require("fs");
const path = require("path");
const { chromium } = require("playwright");

const DEFAULT_BASE_URL = "https://bkseatown.github.io/WordQuest";

const PAGES = [
  { slug: "index", route: "./" },
  { slug: "play", route: "./?play=1" },
  { slug: "reading-lab", route: "reading-lab.html" },
  { slug: "sentence-surgery", route: "sentence-surgery.html" },
  { slug: "teacher-dashboard", route: "teacher-dashboard.html" }
];

const VIEWPORTS = [
  { width: 1440, height: 900 },
  { width: 1024, height: 768 },
  { width: 390, height: 844 }
];

function parseArgs(argv) {
  const out = {};
  for (let i = 2; i < argv.length; i += 1) {
    const arg = String(argv[i] || "");
    if (arg === "--baseUrl") {
      out.baseUrl = String(argv[i + 1] || "").trim();
      i += 1;
      continue;
    }
    if (arg === "--outDir") {
      out.outDir = String(argv[i + 1] || "").trim();
      i += 1;
      continue;
    }
  }
  return out;
}

function timestampSlug(now) {
  const pad = (n) => String(n).padStart(2, "0");
  return [
    now.getFullYear(),
    pad(now.getMonth() + 1),
    pad(now.getDate()),
    "-",
    pad(now.getHours()),
    pad(now.getMinutes()),
    pad(now.getSeconds())
  ].join("");
}

function buildOutDir(inputOutDir) {
  if (inputOutDir) return path.resolve(inputOutDir);
  const ts = timestampSlug(new Date());
  return path.resolve(".artifacts", "ui-audit", ts);
}

function joinUrl(baseUrl, route) {
  const base = String(baseUrl || "").replace(/\/+$/, "");
  const cleanRoute = String(route || "").replace(/^\/+/, "");
  return `${base}/${cleanRoute}`;
}

async function capturePage(page, baseUrl, outDir, item, viewport) {
  await page.setViewportSize(viewport);
  const url = joinUrl(baseUrl, item.route);
  let response;
  try {
    response = await page.goto(url, { waitUntil: "networkidle", timeout: 30000 });
  } catch (error) {
    throw new Error(`${url} failed to load: ${error.message}`);
  }

  if (!response) {
    throw new Error(`${url} returned no response`);
  }
  const status = response.status();
  if (status < 200 || status >= 300) {
    throw new Error(`${url} returned non-200 status: ${status}`);
  }

  await page.waitForTimeout(250);

  const filename = `${item.slug}__${viewport.width}x${viewport.height}.png`;
  const outPath = path.join(outDir, filename);
  await page.screenshot({ path: outPath, fullPage: true });
}

async function main() {
  const args = parseArgs(process.argv);
  const baseUrl = args.baseUrl || DEFAULT_BASE_URL;
  const outDir = buildOutDir(args.outDir);

  fs.mkdirSync(outDir, { recursive: true });

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ serviceWorkers: "block" });
  const page = await context.newPage();

  try {
    for (const item of PAGES) {
      for (const viewport of VIEWPORTS) {
        await capturePage(page, baseUrl, outDir, item, viewport);
      }
    }
  } catch (error) {
    await context.close();
    await browser.close();
    console.error(String(error && error.message ? error.message : error));
    process.exit(1);
  }

  await context.close();
  await browser.close();
  console.log(`Saved screenshots to: ${outDir}`);
}

main().catch((error) => {
  console.error(String(error && error.message ? error.message : error));
  process.exit(1);
});
