#!/usr/bin/env node
'use strict';

const fs = require('fs');
const http = require('http');
const path = require('path');

const OUTPUT_DIR = path.join(process.cwd(), '.artifacts', 'a11y-manual-proxy');
const REPORT_JSON = path.join(OUTPUT_DIR, 'a11y-manual-proxy.json');
const REPORT_MD = path.join(OUTPUT_DIR, 'a11y-manual-proxy.md');
const MIN_CONTRAST = 4.5;

function ensureDir(dir) {
  fs.mkdirSync(dir, { recursive: true });
}

function createStaticServer(rootDir) {
  const server = http.createServer((req, res) => {
    const requestPath = decodeURIComponent(String(req.url || '/').split('?')[0]);
    const cleanPath = requestPath === '/' ? '/index.html' : requestPath;
    const normalized = path.normalize(cleanPath).replace(/^([.][.](\/|\\|$))+/, '');
    const filePath = path.join(rootDir, normalized);
    if (!filePath.startsWith(rootDir)) {
      res.statusCode = 403;
      res.end('forbidden');
      return;
    }
    fs.readFile(filePath, (err, data) => {
      if (err) {
        res.statusCode = 404;
        res.end('not found');
        return;
      }
      const ext = path.extname(filePath).toLowerCase();
      const type = ext === '.html'
        ? 'text/html; charset=utf-8'
        : ext === '.js'
          ? 'application/javascript; charset=utf-8'
          : ext === '.css'
            ? 'text/css; charset=utf-8'
            : 'application/octet-stream';
      res.setHeader('content-type', type);
      res.end(data);
    });
  });

  return new Promise((resolve) => {
    server.listen(0, '127.0.0.1', () => {
      const address = server.address();
      resolve({ server, baseUrl: `http://127.0.0.1:${address.port}` });
    });
  });
}

async function closeServer(server) {
  if (!server) return;
  await new Promise((resolve) => server.close(resolve));
}

async function tabToElement(page, targetId, limit = 120) {
  for (let i = 0; i < limit; i += 1) {
    await page.keyboard.press('Tab');
    const active = await page.evaluate(() => {
      const el = document.activeElement;
      if (!(el instanceof HTMLElement)) return '';
      return String(el.id || '');
    });
    if (active === targetId) return i + 1;
  }
  return -1;
}

function writeReport(summary) {
  ensureDir(OUTPUT_DIR);
  fs.writeFileSync(REPORT_JSON, JSON.stringify(summary, null, 2));
  const lines = [];
  lines.push('# Accessibility Manual Proxy');
  lines.push('');
  lines.push(`Generated: ${summary.generatedAt}`);
  lines.push(`Passed checks: ${summary.passed}`);
  lines.push(`Failed checks: ${summary.failed}`);
  lines.push('');
  lines.push('## Checks');
  summary.checks.forEach((check) => {
    lines.push(`- [${check.ok ? 'PASS' : 'FAIL'}] ${check.name} :: ${check.detail}`);
  });
  fs.writeFileSync(REPORT_MD, `${lines.join('\n')}\n`);
}

async function run() {
  let playwright;
  try {
    playwright = require('playwright');
  } catch (_e) {
    throw new Error('Playwright is required.');
  }

  const { server, baseUrl } = await createStaticServer(process.cwd());
  const { chromium } = playwright;
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();
  const checks = [];

  function record(name, ok, detail) {
    checks.push({ name, ok: !!ok, detail: String(detail || '') });
  }

  try {
    await page.goto(`${baseUrl}/teacher-dashboard.html?audit=1`, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await page.waitForSelector('#td-shell', { state: 'visible', timeout: 15000 });

    await page.evaluate(() => {
      const row = document.querySelector('#td-caseload-list [data-student-id]');
      if (row instanceof HTMLElement) row.click();
    });

    const tabStepsStart = await tabToElement(page, 'td-focus-start-btn');
    record('Keyboard focus reaches Start Recommended Session', tabStepsStart > 0, tabStepsStart > 0 ? `tab steps=${tabStepsStart}` : 'not reachable by keyboard');

    if (tabStepsStart > 0) {
      await page.keyboard.press('Enter');
      await page.waitForTimeout(300);
      const leftDashboard = !String(page.url()).includes('teacher-dashboard.html');
      record('Keyboard Enter activates primary CTA', leftDashboard, leftDashboard ? 'navigated to activity surface' : 'no navigation');
    }

    await page.goto(`${baseUrl}/teacher-dashboard.html?audit=1`, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await page.waitForSelector('#td-shell', { state: 'visible', timeout: 15000 });

    const tabStepsMeeting = await tabToElement(page, 'td-meeting-workspace');
    record('Keyboard focus reaches Meeting & Reports', tabStepsMeeting > 0, tabStepsMeeting > 0 ? `tab steps=${tabStepsMeeting}` : 'not reachable by keyboard');

    if (tabStepsMeeting > 0) {
      await page.keyboard.press('Enter');
      const open = await page.waitForFunction(() => {
        const modal = document.getElementById('td-meeting-modal');
        return modal instanceof HTMLElement && !modal.classList.contains('hidden');
      }, { timeout: 8000 }).then(() => true).catch(() => false);
      record('Keyboard Enter opens meeting workspace', open, open ? 'meeting modal visible' : 'meeting modal not visible');
    }

    const semantics = await page.evaluate(() => {
      const main = document.querySelector('main');
      const header = document.querySelector('header');
      const headings = Array.from(document.querySelectorAll('h1,h2')).length;
      const unlabeledButtons = Array.from(document.querySelectorAll('button')).filter((btn) => {
        const style = window.getComputedStyle(btn);
        const hidden = style.display === 'none' || style.visibility === 'hidden' || btn.getAttribute('aria-hidden') === 'true';
        if (hidden) return false;
        if (btn.offsetParent === null && style.position !== 'fixed') return false;
        const aria = String(btn.getAttribute('aria-label') || '').trim();
        const txt = String(btn.textContent || '').trim();
        return !aria && !txt;
      }).length;
      return { main: !!main, header: !!header, headings, unlabeledButtons };
    });
    record('Screen reader proxy: semantic landmarks present', semantics.main && semantics.header && semantics.headings >= 1, `main=${semantics.main} header=${semantics.header} headings=${semantics.headings}`);
    record('Screen reader proxy: buttons have accessible names', semantics.unlabeledButtons === 0, `unlabeledButtons=${semantics.unlabeledButtons}`);

    const contrastRows = await page.evaluate((selectors) => {
      function parseRgb(value) {
        const match = String(value || '').match(/rgba?\(([^)]+)\)/i);
        if (!match) return null;
        const parts = match[1].split(',').map((x) => Number(String(x).trim()));
        if (parts.length < 3 || parts.some((n) => !Number.isFinite(n))) return null;
        return { r: parts[0], g: parts[1], b: parts[2], a: Number.isFinite(parts[3]) ? parts[3] : 1 };
      }
      function luminance(rgb) {
        const f = (c) => {
          const x = c / 255;
          return x <= 0.03928 ? x / 12.92 : Math.pow((x + 0.055) / 1.055, 2.4);
        };
        return 0.2126 * f(rgb.r) + 0.7152 * f(rgb.g) + 0.0722 * f(rgb.b);
      }
      function ratio(fg, bg) {
        const l1 = luminance(fg);
        const l2 = luminance(bg);
        const hi = Math.max(l1, l2);
        const lo = Math.min(l1, l2);
        return (hi + 0.05) / (lo + 0.05);
      }
      function resolveBackground(el) {
        let node = el;
        while (node) {
          const bg = parseRgb(getComputedStyle(node).backgroundColor);
          if (bg && bg.a > 0.95) return bg;
          node = node.parentElement;
        }
        return parseRgb(getComputedStyle(document.body).backgroundColor) || { r: 255, g: 255, b: 255, a: 1 };
      }

      return selectors.map((selector) => {
        const el = document.querySelector(selector);
        if (!(el instanceof HTMLElement)) return { selector, ok: false, ratio: 0, reason: 'missing' };
        const fg = parseRgb(getComputedStyle(el).color);
        const bg = resolveBackground(el);
        if (!fg || !bg) return { selector, ok: false, ratio: 0, reason: 'color-parse-failed' };
        const c = ratio(fg, bg);
        return { selector, ok: c >= 4.5, ratio: c, reason: '' };
      });
    }, ['#td-focus-start-btn', '#td-focus-view-details-btn', '#td-mode-daily', '#td-meeting-workspace']);

    contrastRows.forEach((row) => {
      record(`Contrast spot-check ${row.selector}`, row.ok, row.reason || `ratio=${row.ratio.toFixed(2)}`);
    });
  } finally {
    await context.close();
    await browser.close();
    await closeServer(server);
  }

  const failed = checks.filter((c) => !c.ok).length;
  const summary = {
    generatedAt: new Date().toISOString(),
    passed: checks.length - failed,
    failed,
    checks
  };

  writeReport(summary);

  if (failed) {
    console.error(`[a11y-manual-proxy] FAIL failed=${failed}`);
    process.exit(1);
  }
  console.log(`[a11y-manual-proxy] PASS checks=${checks.length}`);
  console.log(`[a11y-manual-proxy] report=${REPORT_JSON}`);
}

run().catch((error) => {
  console.error('[a11y-manual-proxy] FAIL', error && error.message ? error.message : error);
  process.exit(1);
});
