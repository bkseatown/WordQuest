#!/usr/bin/env node
'use strict';

const http = require('http');
const path = require('path');
const fs = require('fs');

const DASHBOARD_RUNTIME_KEY = 'cs.dashboard.runtime.v1';
const FIRST_RUN_SETUP_KEY = 'wq_v2_first_run_setup_v1';

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

async function run() {
  let playwright;
  try {
    playwright = require('playwright');
  } catch (_e) {
    throw new Error('Playwright is required for pilot reset.');
  }

  const { chromium } = playwright;
  const { server, baseUrl } = await createStaticServer(process.cwd());
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();

  try {
    await page.goto(`${baseUrl}/teacher-dashboard.html`, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await page.evaluate(async ({ runtimeKey, firstRunKey }) => {
      localStorage.clear();
      sessionStorage.clear();

      localStorage.setItem(runtimeKey, JSON.stringify({
        role: 'teacher',
        featureFlags: { demoMode: false, adminMode: false }
      }));
      localStorage.setItem('cs_role', 'teacher');
      localStorage.setItem(firstRunKey, 'done');

      if ('caches' in window) {
        const names = await caches.keys();
        await Promise.all(names.map((name) => caches.delete(name)));
      }

      if ('indexedDB' in window && typeof indexedDB.databases === 'function') {
        const dbs = await indexedDB.databases();
        await Promise.all((dbs || []).map((db) => {
          if (!db || !db.name) return Promise.resolve();
          return new Promise((resolve) => {
            const req = indexedDB.deleteDatabase(db.name);
            req.onsuccess = () => resolve();
            req.onerror = () => resolve();
            req.onblocked = () => resolve();
          });
        }));
      }
    }, { runtimeKey: DASHBOARD_RUNTIME_KEY, firstRunKey: FIRST_RUN_SETUP_KEY });

    await page.goto(`${baseUrl}/teacher-dashboard.html?audit=1`, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await page.waitForSelector('#td-shell', { state: 'visible', timeout: 15000 });

    const seeded = await page.evaluate(() => {
      const list = document.querySelectorAll('#td-caseload-list [data-student-id]');
      return list.length;
    });

    console.log(`[pilot-reset] PASS caseloadRows=${seeded}`);
    console.log('[pilot-reset] Runtime state reset to teacher mode with first-run setup marked complete.');
  } finally {
    await context.close();
    await browser.close();
    await closeServer(server);
  }
}

run().catch((error) => {
  console.error('[pilot-reset] FAIL', error && error.message ? error.message : error);
  process.exit(1);
});
