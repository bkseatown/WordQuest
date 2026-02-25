#!/usr/bin/env node
'use strict';

const fs = require('fs');
const http = require('http');
const path = require('path');

async function run() {
  const SMOKE_VERSION = 'teacher-daily-flow-v5';
  let playwright;
  try {
    console.log(`Starting ${SMOKE_VERSION}`);
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
  await page.addInitScript(() => {
    try {
      localStorage.setItem('wq_v2_first_run_setup_v1', 'done');
    } catch {}
  });

  try {
    async function clickWithRetries(selector, options = {}) {
      const attempts = Math.max(1, Number(options.attempts) || 3);
      const optional = !!options.optional;
      const settleMs = Math.max(0, Number(options.settleMs) || 0);
      let lastError = null;
      for (let attempt = 0; attempt < attempts; attempt += 1) {
        try {
          const locator = page.locator(selector);
          if (!(await locator.count())) {
            if (optional) return false;
            throw new Error(`Selector not found: ${selector}`);
          }
          await locator.first().waitFor({ state: 'visible', timeout: 10000 });
          await page.waitForFunction((sel) => {
            const node = document.querySelector(sel);
            if (!node) return false;
            if (!(node instanceof HTMLElement)) return false;
            if (node.getAttribute('aria-disabled') === 'true') return false;
            return !node.hasAttribute('disabled');
          }, selector, { timeout: 10000 });
          await locator.first().click({ force: true, timeout: 5000 });
          if (settleMs) await page.waitForTimeout(settleMs);
          return true;
        } catch (error) {
          lastError = error;
          if (attempt < attempts - 1) {
            await page.waitForTimeout((attempt + 1) * 500);
            continue;
          }
        }
      }
      if (optional) return false;
      throw lastError || new Error(`Click failed for ${selector}`);
    }

    await page.goto(baseUrl, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await page.waitForSelector('#loading-screen', { state: 'hidden', timeout: 30000 });
    const firstRunVisible = await page.locator('#first-run-setup-modal:not(.hidden)').count();
    if (firstRunVisible) {
      if (await page.locator('#first-run-start-btn').count()) {
        await page.click('#first-run-start-btn');
      } else if (await page.locator('#first-run-skip-btn').count()) {
        await page.click('#first-run-skip-btn');
      }
      await page.waitForSelector('#first-run-setup-modal', { state: 'hidden', timeout: 10000 });
    }

    await page.waitForSelector('#teacher-panel-btn', { state: 'visible', timeout: 10000 });
    await page.evaluate(() => {
      const btn = document.getElementById('teacher-panel-btn');
      if (btn instanceof HTMLElement) btn.click();
    });
    await page.waitForFunction(() => {
      const panel = document.getElementById('teacher-panel');
      if (!(panel instanceof HTMLElement)) return false;
      const hiddenClass = panel.classList.contains('hidden');
      const hiddenAttr = panel.hidden || panel.getAttribute('aria-hidden') === 'true';
      const style = window.getComputedStyle(panel);
      const visuallyHidden = style.display === 'none' || style.visibility === 'hidden' || style.opacity === '0';
      return !hiddenClass && !hiddenAttr && !visuallyHidden;
    }, { timeout: 15000 });
    await clickWithRetries('#session-group-assign-target-btn', { attempts: 3, optional: true, settleMs: 300 });
    await page.evaluate(() => {
      const btn = document.getElementById('teacher-panel-close');
      if (btn instanceof HTMLElement) btn.click();
    });
    await page.waitForFunction(() => {
      const panel = document.getElementById('teacher-panel');
      if (!(panel instanceof HTMLElement)) return true;
      return panel.classList.contains('hidden') || panel.hidden || panel.getAttribute('aria-hidden') === 'true';
    }, { timeout: 15000 });

    await page.evaluate(() => {
      const focus = document.getElementById('setting-focus');
      if (focus instanceof HTMLSelectElement) {
        focus.value = 'all';
        focus.dispatchEvent(new Event('change', { bubbles: true }));
      }
      const grade = document.getElementById('s-grade');
      if (grade instanceof HTMLSelectElement) {
        grade.value = 'all';
        grade.dispatchEvent(new Event('change', { bubbles: true }));
      }
      const length = document.getElementById('s-length');
      if (length instanceof HTMLSelectElement) {
        length.value = '5';
        length.dispatchEvent(new Event('change', { bubbles: true }));
      }
    });

    let targetWord = '';
    for (let attempt = 0; attempt < 4; attempt += 1) {
      await clickWithRetries('#new-game-btn', { attempts: 3, settleMs: 250 });
      try {
        await page.waitForFunction(() => {
          const word = window.WQGame?.getState?.()?.word;
          return typeof word === 'string' && word.trim().length > 0;
        }, { timeout: 5000 });
        targetWord = await page.evaluate(() => {
          const word = window.WQGame?.getState?.()?.word || '';
          return String(word).trim().toLowerCase();
        });
        if (targetWord) break;
      } catch {}
      await page.waitForTimeout(300);
    }
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
