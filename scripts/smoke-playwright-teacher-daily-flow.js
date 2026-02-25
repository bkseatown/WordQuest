#!/usr/bin/env node
'use strict';

const fs = require('fs');
const http = require('http');
const path = require('path');

async function run() {
  let playwright;
  try {
    playwright = require('playwright');
  } catch {
    throw new Error('Playwright is required. Run: npm install --no-save playwright');
  }

  const root = process.cwd();
  const server = http.createServer((req, res) => {
    const urlPath = decodeURIComponent(String(req.url || '/').split('?')[0]);
    const rawPath = urlPath === '/' ? '/index.html' : urlPath;
    const safePath = path.normalize(rawPath).replace(/^(\.\.(\/|\\|$))+/, '');
    const filePath = path.join(root, safePath);
    if (!filePath.startsWith(root)) {
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
        ? 'text/html'
        : ext === '.js'
          ? 'application/javascript'
          : ext === '.css'
            ? 'text/css'
            : ext === '.json'
              ? 'application/json'
              : 'application/octet-stream';
      res.setHeader('content-type', type);
      res.end(data);
    });
  });

  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  const address = server.address();
  const baseUrl = `http://127.0.0.1:${address.port}`;

  const browser = await playwright.chromium.launch({ headless: true });
  const page = await browser.newPage();
  const pageErrors = [];
  page.on('pageerror', (error) => pageErrors.push(String(error?.message || error)));

  try {
    await page.goto(baseUrl, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await page.waitForSelector('#loading-screen.hidden', { timeout: 30000 });

    await page.click('#teacher-panel-btn');
    await page.waitForSelector('#teacher-panel:not(.hidden)', { timeout: 10000 });
    await page.click('#session-group-assign-target-btn');
    await page.click('#teacher-panel-close');
    await page.waitForSelector('#teacher-panel.hidden', { timeout: 10000 });

    await page.click('#new-game-btn');
    const targetWord = await page.evaluate(() => window.WQGame?.getState?.()?.word || '');
    if (!targetWord) throw new Error('No active word found after clicking New/Next Word.');
    await page.keyboard.type(String(targetWord));
    await page.keyboard.press('Enter');
    await page.waitForSelector('#modal-overlay:not(.hidden)', { timeout: 10000 });
    await page.click('#play-again-btn');
    await page.waitForSelector('#modal-overlay.hidden', { timeout: 10000 });

    await page.click('#settings-btn');
    await page.waitForSelector('#settings-panel:not(.hidden)', { timeout: 10000 });
    await page.click('#session-reset-btn');
    await page.waitForFunction(() => {
      const chip = document.getElementById('session-rounds');
      return chip && /Rounds:\s*0\b/.test(String(chip.textContent || ''));
    }, { timeout: 10000 });
    await page.click('#settings-close');

    if (pageErrors.length) {
      throw new Error(`Runtime page errors: ${pageErrors.join(' | ')}`);
    }

    console.log('playwright smoke passed: teacher daily flow runtime');
  } finally {
    await browser.close();
    await new Promise((resolve) => server.close(resolve));
  }
}

run().catch((error) => {
  console.error(error?.stack || error?.message || error);
  process.exit(1);
});
