#!/usr/bin/env node
'use strict';

const fs = require('fs');
const http = require('http');
const path = require('path');

const OUTPUT_DIR = path.join(process.cwd(), '.artifacts', 'ux-task-benchmark');
const REPORT_JSON = path.join(OUTPUT_DIR, 'ux-task-benchmark.json');
const REPORT_MD = path.join(OUTPUT_DIR, 'ux-task-benchmark.md');

const TASK_SLO_MS = {
  selectStudent: 8000,
  startRecommendedSession: 9000,
  openMeetingWorkspace: 6000,
  switchMeetingTabs: 6000,
  launchWordQuest: 7000,
  launchWordConnections: 7000
};

function ensureDir(dir) {
  fs.mkdirSync(dir, { recursive: true });
}

function nowMs() {
  return Date.now();
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
      resolve({
        server,
        baseUrl: `http://127.0.0.1:${address.port}`
      });
    });
  });
}

async function closeServer(server) {
  if (!server) return;
  await new Promise((resolve) => server.close(resolve));
}

async function waitForVisible(page, selector, timeout = 12000) {
  await page.waitForSelector(selector, { state: 'visible', timeout });
}

async function waitForAttached(page, selector, timeout = 12000) {
  await page.waitForSelector(selector, { state: 'attached', timeout });
}

async function waitForDestinationReady(page, urlPattern, readySelector, options = {}) {
  const timeout = Math.max(1000, Number(options.timeout) || 12000);
  await page.waitForFunction((pattern) => {
    var href = String(window.location.href || "");
    return new RegExp(pattern.source, pattern.flags).test(href);
  }, { source: urlPattern.source, flags: urlPattern.flags }, { timeout });
  await waitForAttached(page, readySelector, timeout);
  if (typeof options.afterReady === 'function') {
    await options.afterReady(page, timeout);
  } else {
    await waitForVisible(page, readySelector, timeout);
  }
}

async function gotoDashboard(page, baseUrl) {
  await page.goto(`${baseUrl}/teacher-dashboard.html?audit=1`, { waitUntil: 'domcontentloaded', timeout: 30000 });
  await waitForVisible(page, '#td-shell');
}

async function gotoReportsSurface(page, baseUrl) {
  await page.goto(`${baseUrl}/reports.html?audit=1&mode=daily`, { waitUntil: 'domcontentloaded', timeout: 30000 });
  await waitForVisible(page, '#td-shell');
}

async function openActivitiesMenu(page) {
  const isDirectlyVisible = await page.evaluate(() => {
    const select = document.getElementById('td-activity-select');
    if (!(select instanceof HTMLElement)) return false;
    const style = window.getComputedStyle(select);
    return style.display !== 'none' && style.visibility !== 'hidden' && select.offsetParent !== null;
  });
  if (isDirectlyVisible) return;

  await waitForAttached(page, '#td-top-overflow-toggle');
  const alreadyOpen = await page.evaluate(() => {
    const menu = document.getElementById('td-top-overflow-menu');
    return menu instanceof HTMLElement && !menu.classList.contains('hidden');
  });
  if (!alreadyOpen) {
    await page.click('#td-top-overflow-toggle');
    await page.waitForFunction(() => {
      const menu = document.getElementById('td-top-overflow-menu');
      return menu instanceof HTMLElement && !menu.classList.contains('hidden');
    }, { timeout: 5000 });
  }
  await waitForVisible(page, '#td-activity-select', 5000);
}

async function ensureStudentSelected(page) {
  const alreadySelected = await page.evaluate(() => {
    const nameEl = document.getElementById('td-focus-student-name');
    if (!(nameEl instanceof HTMLElement)) return false;
    const text = String(nameEl.textContent || '').trim().toLowerCase();
    return text.length > 0 && text !== 'select a student';
  });
  if (alreadySelected) return;

  await waitForAttached(page, '#td-caseload-list [data-student-id]', 15000);
  const clicked = await page.evaluate(() => {
    const button = document.querySelector('#td-caseload-list [data-student-id]');
    if (!(button instanceof HTMLElement)) return false;
    button.click();
    return true;
  });
  if (!clicked) throw new Error('Unable to select student from caseload list.');
  await page.waitForFunction(() => {
    const nameEl = document.getElementById('td-focus-student-name');
    if (!(nameEl instanceof HTMLElement)) return false;
    const text = String(nameEl.textContent || '').trim().toLowerCase();
    return text.length > 0 && text !== 'select a student';
  }, { timeout: 10000 });
}

async function openMeetingWorkspace(page) {
  const opened = await page.evaluate(() => {
    const button = document.getElementById('td-meeting-workspace');
    if (!(button instanceof HTMLElement)) return false;
    button.click();
    return true;
  });
  if (!opened) throw new Error('Meeting workspace trigger not found.');
  await page.waitForFunction(() => {
    const modal = document.getElementById('td-meeting-modal');
    return modal instanceof HTMLElement && !modal.classList.contains('hidden');
  }, { timeout: 8000 });
}

async function runTask(results, key, label, taskFn) {
  const start = nowMs();
  try {
    await taskFn();
    const elapsedMs = nowMs() - start;
    const targetMs = TASK_SLO_MS[key] || null;
    results.push({
      key,
      label,
      passed: true,
      elapsedMs,
      sloMs: targetMs,
      sloPassed: targetMs == null ? true : elapsedMs <= targetMs,
      error: ''
    });
    console.log(`[ux-task] PASS ${label} (${prettyMs(elapsedMs)})`);
  } catch (error) {
    const elapsedMs = nowMs() - start;
    const message = String((error && error.message) || error || 'unknown error').slice(0, 600);
    const targetMs = TASK_SLO_MS[key] || null;
    results.push({
      key,
      label,
      passed: false,
      elapsedMs,
      sloMs: targetMs,
      sloPassed: false,
      error: message
    });
    console.error(`[ux-task] FAIL ${label} (${prettyMs(elapsedMs)}) -> ${message}`);
  }
}

function buildSummary(baseUrl, pageErrors, results) {
  const passedCount = results.filter((r) => r.passed).length;
  const sloPassedCount = results.filter((r) => r.sloPassed).length;
  const avgMs = results.length
    ? Math.round(results.reduce((sum, row) => sum + Number(row.elapsedMs || 0), 0) / results.length)
    : 0;
  const slowTasks = results
    .filter((r) => r.sloMs != null && Number(r.elapsedMs) > Number(r.sloMs))
    .map((r) => ({ key: r.key, label: r.label, elapsedMs: r.elapsedMs, sloMs: r.sloMs }));

  return {
    generatedAt: new Date().toISOString(),
    baseUrl,
    totals: {
      tasks: results.length,
      passed: passedCount,
      failed: results.length - passedCount,
      sloPassed: sloPassedCount,
      sloFailed: results.length - sloPassedCount,
      averageDurationMs: avgMs
    },
    pageErrors,
    slowTasks,
    results,
    allPassed: passedCount === results.length,
    allSloPassed: sloPassedCount === results.length && results.length > 0
  };
}

function writeReports(summary) {
  ensureDir(OUTPUT_DIR);
  fs.writeFileSync(REPORT_JSON, JSON.stringify(summary, null, 2));

  const lines = [];
  lines.push('# UX Task Benchmark');
  lines.push('');
  lines.push(`Generated: ${summary.generatedAt}`);
  lines.push(`Base URL: ${summary.baseUrl}`);
  lines.push('');
  lines.push('## Totals');
  lines.push(`- Tasks: ${summary.totals.tasks}`);
  lines.push(`- Passed: ${summary.totals.passed}`);
  lines.push(`- Failed: ${summary.totals.failed}`);
  lines.push(`- SLO passed: ${summary.totals.sloPassed}`);
  lines.push(`- SLO failed: ${summary.totals.sloFailed}`);
  lines.push(`- Average duration: ${prettyMs(summary.totals.averageDurationMs)}`);
  lines.push('');
  lines.push('## Task Results');
  summary.results.forEach((row) => {
    const status = row.passed ? 'PASS' : 'FAIL';
    const slo = row.sloMs == null ? 'n/a' : `${prettyMs(row.elapsedMs)} / target ${prettyMs(row.sloMs)}`;
    lines.push(`- ${status} ${row.label} (${slo})`);
    if (row.error) lines.push(`  - Error: ${row.error}`);
  });
  lines.push('');
  lines.push('## Runtime Errors');
  if (!summary.pageErrors.length) {
    lines.push('- None captured');
  } else {
    summary.pageErrors.forEach((err) => lines.push(`- ${err}`));
  }

  fs.writeFileSync(REPORT_MD, `${lines.join('\n')}\n`);
}

async function run() {
  let playwright;
  try {
    playwright = require('playwright');
  } catch (_e) {
    throw new Error('Playwright is required. Run npm install first.');
  }

  const providedBaseUrl = String(process.env.BASE_URL || '').trim().replace(/\/$/, '');
  const root = process.cwd();
  let serverHandle = null;
  let baseUrl = providedBaseUrl;

  if (!baseUrl) {
    serverHandle = await createStaticServer(root);
    baseUrl = serverHandle.baseUrl;
  }

  const browser = await playwright.chromium.launch({ headless: true });
  const page = await browser.newPage();
  const pageErrors = [];
  page.on('pageerror', (error) => pageErrors.push(String(error && error.message ? error.message : error)));

  const results = [];

  try {
    await runTask(results, 'selectStudent', 'Select student from caseload', async () => {
      await gotoDashboard(page, baseUrl);
      await ensureStudentSelected(page);
    });

    await runTask(results, 'startRecommendedSession', 'Launch Start Recommended Session', async () => {
      await gotoDashboard(page, baseUrl);
      await ensureStudentSelected(page);
      const before = page.url();
      await Promise.all([
        page.waitForURL((url) => String(url) !== before, { timeout: 12000 }),
        page.click('#td-focus-start-btn')
      ]);
      const after = page.url();
      if (/teacher-dashboard\.html(?:\?|$)/i.test(after)) {
        throw new Error(`Expected navigation to intervention surface, stayed on ${after}`);
      }
    });

    await runTask(results, 'openMeetingWorkspace', 'Open Meeting Workspace', async () => {
      await gotoDashboard(page, baseUrl);
      await ensureStudentSelected(page);
      await openMeetingWorkspace(page);
    });

    await runTask(results, 'switchMeetingTabs', 'Switch Meeting Workspace tabs', async () => {
      await gotoDashboard(page, baseUrl);
      await ensureStudentSelected(page);
      await openMeetingWorkspace(page);
      const tabs = [
        { id: '#td-workspace-tab-deck', key: 'deck' },
        { id: '#td-workspace-tab-notes', key: 'notes' },
        { id: '#td-workspace-tab-export', key: 'export' },
        { id: '#td-workspace-tab-summary', key: 'summary' }
      ];
      for (const tab of tabs) {
        await page.click(tab.id);
        await page.waitForFunction((sel) => {
          const node = document.querySelector(sel);
          return node instanceof HTMLElement && node.classList.contains('is-active');
        }, tab.id, { timeout: 5000 });
      }
    });

    await runTask(results, 'launchWordQuest', 'Launch Word Quest from Activities', async () => {
      await gotoReportsSurface(page, baseUrl);
      await openActivitiesMenu(page);
      await Promise.all([
        waitForDestinationReady(page, /word-quest\.html/i, '#game-board', {
          timeout: 12000,
          afterReady: async (nextPage, timeout) => {
            await nextPage.waitForSelector('#loading-screen', { state: 'hidden', timeout });
            await waitForVisible(nextPage, '#game-board', timeout);
          }
        }),
        page.selectOption('#td-activity-select', 'word-quest.html')
      ]);
    });

    await runTask(results, 'launchWordConnections', 'Launch Word Connections from Activities', async () => {
      await gotoReportsSurface(page, baseUrl);
      await openActivitiesMenu(page);
      await Promise.all([
        waitForDestinationReady(page, /precision-play\.html/i, '#pp-shell', { timeout: 12000 }),
        page.selectOption('#td-activity-select', 'precision-play.html')
      ]);
    });
  } finally {
    await browser.close();
    if (serverHandle && serverHandle.server) {
      await closeServer(serverHandle.server);
    }
  }

  const summary = buildSummary(baseUrl, pageErrors, results);
  writeReports(summary);

  console.log('\nUX task benchmark summary');
  console.log(`- Tasks: ${summary.totals.tasks}`);
  console.log(`- Passed: ${summary.totals.passed}`);
  console.log(`- Failed: ${summary.totals.failed}`);
  console.log(`- SLO passed: ${summary.totals.sloPassed}`);
  console.log(`- SLO failed: ${summary.totals.sloFailed}`);
  console.log(`- Avg duration: ${prettyMs(summary.totals.averageDurationMs)}`);
  console.log(`- Report: ${REPORT_JSON}`);

  if (!summary.allPassed) process.exit(1);
}

run().catch((error) => {
  console.error('[ux-task-benchmark] failed:', error && error.message ? error.message : error);
  process.exit(1);
});
