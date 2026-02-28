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
const OUT_DIR = path.join(process.cwd(), ".artifacts", "design-audit");

function routeSlug(route) {
  if (route === "/") return "home";
  return route.replace(/^\//, "").replace(/\.html$/, "").replace(/[^a-z0-9-]/gi, "-");
}

function ensureDir(dir) {
  fs.mkdirSync(dir, { recursive: true });
}

function boolWord(value) {
  return value ? "Yes" : "No";
}

function printSummary(results) {
  const headers = [
    "Route",
    "Viewport",
    "Overflow",
    "Zones",
    "Containers",
    "Buttons",
    "TypographySizes",
    "BorderOverload",
    "DominantStageOK"
  ];

  const rows = results.map((r) => [
    r.route,
    `${r.viewport.width}x${r.viewport.height}`,
    boolWord(r.overflow),
    String(r.aboveFoldZones),
    String(r.containerCount),
    String(r.buttonCount),
    String(r.typographyUniqueSizes.length),
    boolWord(r.borderCountAboveFold > 25),
    boolWord(r.dominantStageOK)
  ]);

  const widths = headers.map((h, i) => {
    const cellMax = rows.reduce((max, row) => Math.max(max, row[i].length), 0);
    return Math.max(h.length, cellMax);
  });

  const line = (cols) => cols.map((c, i) => c.padEnd(widths[i])).join(" | ");
  console.log(line(headers));
  console.log(widths.map((w) => "-".repeat(w)).join("-|-"));
  rows.forEach((row) => console.log(line(row)));
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
  await page.waitForTimeout(500);

  const metrics = await page.evaluate(() => {
    const doc = document.documentElement;
    const viewportHeight = window.innerHeight;

    const isVisible = (el) => {
      if (!el) return false;
      const style = window.getComputedStyle(el);
      if (style.display === "none" || style.visibility === "hidden" || Number(style.opacity) === 0) {
        return false;
      }
      const rect = el.getBoundingClientRect();
      return rect.width > 0 && rect.height > 0;
    };

    const selectorFor = (el) => {
      if (!el) return "";
      if (el.id) return `#${el.id}`;
      const classList = Array.from(el.classList || []).filter(Boolean);
      if (classList.length) return `.${classList.slice(0, 2).join(".")}`;
      return String(el.tagName || "").toLowerCase();
    };

    const overflow = {
      scrollHeight: doc.scrollHeight,
      clientHeight: doc.clientHeight,
      overflow: doc.scrollHeight > doc.clientHeight
    };

    const mainChildren = Array.from(document.querySelectorAll("main > *"));
    const surfaceMatches = Array.from(document.querySelectorAll('[class*="stage"], [class*="rail"], [class*="panel"], [class*="card"]'));
    const zoneSet = new Set([...mainChildren, ...surfaceMatches]);
    let aboveFoldZones = 0;
    zoneSet.forEach((el) => {
      if (!isVisible(el)) return;
      const rect = el.getBoundingClientRect();
      if (rect.top < viewportHeight) aboveFoldZones += 1;
    });

    const containerCount = Array.from(document.querySelectorAll('div[class*="card"], div[class*="panel"], div[class*="rail"], div[class*="stage"]')).length;

    const buttonCount = Array.from(document.querySelectorAll("button, a[role='button']")).filter(isVisible).length;

    const typographyUniqueSizes = Array.from(new Set(
      Array.from(document.querySelectorAll("h1, h2, h3, p, small"))
        .filter(isVisible)
        .map((el) => window.getComputedStyle(el).fontSize)
        .filter(Boolean)
    )).sort((a, b) => parseFloat(a) - parseFloat(b));

    const visibleElements = Array.from(document.querySelectorAll("*")).filter((el) => {
      if (!isVisible(el)) return false;
      const rect = el.getBoundingClientRect();
      return rect.top < viewportHeight && rect.bottom > 0;
    });

    let borderCountAboveFold = 0;
    visibleElements.forEach((el) => {
      const style = window.getComputedStyle(el);
      const widths = [
        style.borderTopWidth,
        style.borderRightWidth,
        style.borderBottomWidth,
        style.borderLeftWidth
      ];
      if (widths.some((w) => parseFloat(w || "0") > 0)) {
        borderCountAboveFold += 1;
      }
    });

    let dominantElement = null;
    let dominantArea = 0;
    visibleElements.forEach((el) => {
      const rect = el.getBoundingClientRect();
      const visibleTop = Math.max(rect.top, 0);
      const visibleBottom = Math.min(rect.bottom, viewportHeight);
      const visibleHeight = Math.max(0, visibleBottom - visibleTop);
      const area = Math.max(0, rect.width) * visibleHeight;
      if (area > dominantArea) {
        dominantArea = area;
        dominantElement = el;
      }
    });

    const dominantElementSelector = selectorFor(dominantElement);
    const dominantStageOK = Boolean(
      dominantElement && (
        dominantElement.matches(".cs-stage") ||
        dominantElement.matches("#game-board") ||
        dominantElement.matches(".sentence-workbench") ||
        dominantElement.matches(".reading-passage")
      )
    );

    return {
      overflow,
      aboveFoldZones,
      containerCount,
      buttonCount,
      typographyUniqueSizes,
      typographyDrift: typographyUniqueSizes.length > 6,
      borderCountAboveFold,
      borderOverload: borderCountAboveFold > 25,
      dominantElementSelector,
      dominantStageOK
    };
  });

  const slug = routeSlug(route);
  const vp = `${viewport.width}x${viewport.height}`;

  await page.screenshot({
    path: path.join(OUT_DIR, `${slug}-${vp}.png`),
    fullPage: true
  });

  const payload = {
    route,
    viewport,
    overflow: metrics.overflow.overflow,
    aboveFoldZones: metrics.aboveFoldZones,
    containerCount: metrics.containerCount,
    buttonCount: metrics.buttonCount,
    typographyUniqueSizes: metrics.typographyUniqueSizes,
    borderCountAboveFold: metrics.borderCountAboveFold,
    dominantElementSelector: metrics.dominantElementSelector,
    consoleErrors,
    httpErrors
  };

  fs.writeFileSync(
    path.join(OUT_DIR, `${slug}-${vp}.json`),
    JSON.stringify(payload, null, 2)
  );

  await page.close();

  return {
    ...payload,
    typographyDrift: metrics.typographyDrift,
    borderOverload: metrics.borderOverload,
    dominantStageOK: metrics.dominantStageOK
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
      }
    }
  } finally {
    await browser.close();
  }

  printSummary(results);
})().catch((err) => {
  console.error("[design-audit] failed:", err);
  process.exit(1);
});
