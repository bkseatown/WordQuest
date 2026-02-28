#!/usr/bin/env node
"use strict";

const fs = require("fs");
const path = require("path");
const { chromium } = require("playwright");

const BASE_URL = "http://127.0.0.1:4174";
const ROUTES = ["/", "/reading-lab.html", "/sentence-surgery.html", "/teacher-dashboard.html"];
const VIEWPORTS = [
  { width: 1440, height: 900 },
  { width: 1024, height: 768 },
  { width: 390, height: 844 }
];
const OUT_DIR = path.join(process.cwd(), ".artifacts", "ui-audit");

function routeSlug(route) {
  if (route === "/") return "home";
  return route.replace(/^\//, "").replace(/\.html$/, "").replace(/[^a-z0-9-]/gi, "-");
}

function ensureDir(dir) {
  fs.mkdirSync(dir, { recursive: true });
}

async function runOne(browser, route, viewport) {
  const page = await browser.newPage({ viewport });
  const consoleErrors = [];
  const httpErrors = [];

  page.on("console", (msg) => {
    if (msg.type() === "error") {
      consoleErrors.push(msg.text());
    }
  });

  page.on("response", (response) => {
    const status = response.status();
    if (status >= 400) {
      httpErrors.push({ url: response.url(), status });
    }
  });

  const url = `${BASE_URL}${route}`;
  await page.goto(url, { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(400);

  const overflow = await page.evaluate(() => {
    const doc = document.documentElement;
    return {
      scrollHeight: doc.scrollHeight,
      clientHeight: doc.clientHeight,
      overflow: doc.scrollHeight > doc.clientHeight
    };
  });

  const name = `${routeSlug(route)}-${viewport.width}x${viewport.height}.png`;
  await page.screenshot({ path: path.join(OUT_DIR, name), fullPage: true });
  await page.close();

  return {
    route,
    viewport: `${viewport.width}x${viewport.height}`,
    overflow,
    consoleErrors,
    httpErrors
  };
}

(async function main() {
  ensureDir(OUT_DIR);
  const browser = await chromium.launch({ headless: true });
  const results = [];

  try {
    for (const route of ROUTES) {
      for (const viewport of VIEWPORTS) {
        const result = await runOne(browser, route, viewport);
        results.push(result);
        console.log(
          `[ui-audit] ${result.route} @ ${result.viewport} overflow=${result.overflow.overflow} ` +
          `(${result.overflow.scrollHeight}/${result.overflow.clientHeight}) ` +
          `consoleErrors=${result.consoleErrors.length} httpErrors=${result.httpErrors.length}`
        );
      }
    }
  } finally {
    await browser.close();
  }

  const outPath = path.join(OUT_DIR, "ui-audit-results.json");
  fs.writeFileSync(outPath, JSON.stringify(results, null, 2));
  console.log(`[ui-audit] wrote ${outPath}`);
})().catch((err) => {
  console.error("[ui-audit] failed:", err);
  process.exit(1);
});
