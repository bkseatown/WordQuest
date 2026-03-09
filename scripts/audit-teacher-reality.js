#!/usr/bin/env node
'use strict';

const fs = require('fs');
const http = require('http');
const path = require('path');

const OUTPUT_DIR = path.join(process.cwd(), '.artifacts', 'teacher-reality-pass');
const REPORT_JSON = path.join(OUTPUT_DIR, 'teacher-reality-pass.json');
const REPORT_MD = path.join(OUTPUT_DIR, 'teacher-reality-pass.md');
const HESITATION_MS = 5000;

function ensureDir(dir) {
  fs.mkdirSync(dir, { recursive: true });
}

function prettyMs(value) {
  const ms = Math.max(0, Number(value) || 0);
  if (ms < 1000) return `${ms}ms`;
  return `${(ms / 1000).toFixed(2)}s`;
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
            : ext === '.json'
              ? 'application/json; charset=utf-8'
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

async function waitVisible(page, selector, timeout = 15000) {
  await page.waitForSelector(selector, { state: 'visible', timeout });
}

async function gotoReportsSurface(page, baseUrl) {
  await page.goto(`${baseUrl}/reports.html?audit=1&mode=daily`, { waitUntil: 'domcontentloaded', timeout: 30000 });
  await waitVisible(page, '#td-shell');
}

async function ensureStudentSelected(page) {
  await page.waitForSelector('#td-caseload-list [data-student-id]', { state: 'attached', timeout: 15000 });
  await page.evaluate(() => {
    const button = document.querySelector('#td-caseload-list [data-student-id]');
    if (button instanceof HTMLElement) button.click();
  });
  await page.waitForFunction(() => {
    const nameEl = document.getElementById('td-focus-student-name');
    if (!(nameEl instanceof HTMLElement)) return false;
    const txt = String(nameEl.textContent || '').trim().toLowerCase();
    return txt && txt !== 'select a student';
  }, { timeout: 10000 });
}

async function timedStep(scenario, step, fn, rows) {
  const start = Date.now();
  try {
    await fn();
    const elapsedMs = Date.now() - start;
    rows.push({ scenario, step, elapsedMs, hesitation: elapsedMs > HESITATION_MS, passed: true, error: '' });
  } catch (error) {
    const elapsedMs = Date.now() - start;
    rows.push({
      scenario,
      step,
      elapsedMs,
      hesitation: true,
      passed: false,
      error: String((error && error.message) || error || 'unknown error').slice(0, 500)
    });
  }
}

function writeReport(summary) {
  ensureDir(OUTPUT_DIR);
  fs.writeFileSync(REPORT_JSON, JSON.stringify(summary, null, 2));

  const lines = [];
  lines.push('# Teacher Reality Pass');
  lines.push('');
  lines.push(`Generated: ${summary.generatedAt}`);
  lines.push(`Base URL: ${summary.baseUrl}`);
  lines.push(`Scenarios: ${summary.scenarioCount}`);
  lines.push(`Steps: ${summary.stepCount}`);
  lines.push(`Passed: ${summary.passedSteps}`);
  lines.push(`Hesitations (>5s): ${summary.hesitationCount}`);
  lines.push('');
  lines.push('## Steps');
  summary.rows.forEach((row) => {
    const status = row.passed ? 'PASS' : 'FAIL';
    const hesitate = row.hesitation ? 'HESITATION' : 'OK';
    lines.push(`- [${status}] ${row.scenario} :: ${row.step} (${prettyMs(row.elapsedMs)}, ${hesitate})`);
    if (row.error) lines.push(`  - ${row.error}`);
  });

  fs.writeFileSync(REPORT_MD, `${lines.join('\n')}\n`);
}

async function run() {
  let playwright;
  try {
    playwright = require('playwright');
  } catch (_e) {
    throw new Error('Playwright dependency is required.');
  }

  const { chromium } = playwright;
  const { server, baseUrl } = await createStaticServer(process.cwd());
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();
  const rows = [];

  try {
    await timedStep('LS 1:1', 'Open reports prep surface', () => gotoReportsSurface(page, baseUrl), rows);
    await timedStep('LS 1:1', 'Select focus student', () => ensureStudentSelected(page), rows);
    await timedStep('LS 1:1', 'Start recommended session', async () => {
      await page.click('#td-focus-start-btn');
      await page.waitForURL((url) => !String(url).includes('reports.html'), { timeout: 10000 });
    }, rows);

    await timedStep('Classroom Quick Launch', 'Return to reports prep', () => gotoReportsSurface(page, baseUrl), rows);
    await timedStep('Classroom Quick Launch', 'Select student', () => ensureStudentSelected(page), rows);
    await timedStep('Classroom Quick Launch', 'Switch to classroom mode', () => page.click('#td-mode-classroom'), rows);
    await timedStep('Classroom Quick Launch', 'Launch classroom action', async () => {
      await waitVisible(page, '#td-focus-start-btn');
      await page.click('#td-focus-start-btn');
      await page.waitForURL((url) => !String(url).includes('reports.html'), { timeout: 10000 });
    }, rows);

    await timedStep('Meeting Prep', 'Return to reports prep', () => gotoReportsSurface(page, baseUrl), rows);
    await timedStep('Meeting Prep', 'Select student', () => ensureStudentSelected(page), rows);
    await timedStep('Meeting Prep', 'Switch to daily mode', () => page.click('#td-mode-daily'), rows);
    await timedStep('Meeting Prep', 'Open meeting workspace', async () => {
      await page.click('#td-top-overflow-toggle');
      await waitVisible(page, '#td-top-overflow-menu');
      await page.click('#td-meeting-workspace');
      await page.waitForFunction(() => {
        const modal = document.getElementById('td-meeting-modal');
        return modal instanceof HTMLElement && !modal.classList.contains('hidden');
      }, { timeout: 8000 });
    }, rows);
    await timedStep('Meeting Prep', 'Switch deck tab', () => page.click('#td-workspace-tab-deck'), rows);
    await timedStep('Meeting Prep', 'Switch notes tab', () => page.click('#td-workspace-tab-notes'), rows);
    await timedStep('Parent Language', 'Set meeting language to Mandarin', async () => {
      await page.selectOption('#td-meeting-language', 'zh');
      const value = await page.$eval('#td-meeting-language', (el) => el.value);
      if (value !== 'zh') throw new Error('Language selection did not apply.');
    }, rows);
  } finally {
    const passedSteps = rows.filter((row) => row.passed).length;
    const hesitationCount = rows.filter((row) => row.hesitation).length;
    const summary = {
      generatedAt: new Date().toISOString(),
      baseUrl,
      scenarioCount: new Set(rows.map((row) => row.scenario)).size,
      stepCount: rows.length,
      passedSteps,
      failedSteps: rows.length - passedSteps,
      hesitationCount,
      rows
    };

    writeReport(summary);
    await context.close();
    await browser.close();
    await closeServer(server);

    const line = `[teacher-reality] steps=${summary.stepCount} passed=${summary.passedSteps} hesitations=${summary.hesitationCount}`;
    if (summary.failedSteps > 0) {
      console.error(`${line} failed=${summary.failedSteps}`);
      process.exit(1);
    }
    console.log(line);
    console.log(`[teacher-reality] report=${REPORT_JSON}`);
  }
}

run().catch((error) => {
  console.error('[teacher-reality] FAIL', error && error.message ? error.message : error);
  process.exit(1);
});
