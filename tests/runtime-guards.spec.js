const { test, expect } = require('@playwright/test');

test.use({ serviceWorkers: 'block' });

const CRITICAL_ASSETS = [
  'style/typography.css',
  'style/tokens.css',
  'style/nav-shell.css',
  'style/components.css',
  'style/home-lock.css',
  'hero-v2.css',
  'js/build-badge.js',
  'js/nav-shell.js',
  'word-quest-preview.js',
  'build-stamp.js',
  'hero-v2.js',
  'storage-schema.js'
];

const RUNTIME_ROUTES = [
  { url: './?play=1', marker: 'body' },
  { url: 'word-quest.html?play=1#wordquest', marker: '.tile' },
  { url: 'precision-play.html', marker: '#pp-shell' },
  { url: 'teacher-dashboard.html', marker: '#td-shell' },
  { url: 'reading-lab.html', marker: '#rl-root' },
  { url: 'sentence-surgery.html', marker: '.ss-container' }
];

function shouldIgnoreConsoleError(text) {
  const msg = String(text || '');
  return msg.includes('Failed to load resource: the server responded with a status of 404') && msg.includes('favicon');
}

test.describe('Runtime guardrails', () => {
  test('critical assets resolve with 200', async ({ request, baseURL }) => {
    const normalizedBase = String(baseURL || '').endsWith('/') ? String(baseURL) : `${baseURL}/`;
    for (const asset of CRITICAL_ASSETS) {
      const url = new URL(asset, normalizedBase).toString();
      const response = await request.get(url, {
        headers: { 'Cache-Control': 'no-cache', Pragma: 'no-cache' }
      });
      expect(response.status(), `Critical asset failed: ${url}`).toBe(200);
    }
  });

  test('key routes load with no runtime errors', async ({ browser, baseURL }, testInfo) => {
    const normalizedBase = String(baseURL || '').endsWith('/') ? String(baseURL) : `${baseURL}/`;
    const context = await browser.newContext({ serviceWorkers: 'block' });
    const page = await context.newPage();

    for (const route of RUNTIME_ROUTES) {
      const errors = [];
      page.removeAllListeners('pageerror');
      page.removeAllListeners('console');
      page.on('pageerror', (error) => errors.push(`pageerror:${error.message}`));
      page.on('console', (message) => {
        if (message.type() !== 'error') return;
        if (shouldIgnoreConsoleError(message.text())) return;
        errors.push(`console:${message.text()}`);
      });

      const url = new URL(route.url, normalizedBase).toString();
      const response = await page.goto(url, { waitUntil: 'networkidle' });
      expect(response, `No response for ${url}`).toBeTruthy();
      expect(response.status(), `Non-200 for ${url}`).toBe(200);
      await expect(page.locator(route.marker).first(), `Missing marker ${route.marker} on ${url}`).toBeVisible();
      await page.waitForTimeout(1500);

      if (errors.length) {
        testInfo.attach(`runtime-errors-${route.url.replace(/[^\w]+/g, '_')}`, {
          body: Buffer.from(JSON.stringify(errors, null, 2)),
          contentType: 'application/json'
        });
      }
      expect(errors, `Runtime errors on ${url}`).toEqual([]);
    }

    await context.close();
  });

  test('teacher dashboard enforces single-modal visibility', async ({ page, baseURL }) => {
    const normalizedBase = String(baseURL || '').endsWith('/') ? String(baseURL) : `${baseURL}/`;
    const url = new URL('teacher-dashboard.html?audit=1', normalizedBase).toString();
    await page.goto(url, { waitUntil: 'domcontentloaded' });
    await expect(page.locator('#td-shell')).toBeVisible();

    await page.waitForSelector('#td-caseload-list [data-student-id]', { state: 'attached', timeout: 5000 });
    await page.evaluate(() => {
      const first = document.querySelector('#td-caseload-list [data-student-id]');
      if (first instanceof HTMLElement) first.click();
    });

    const visibleModalIds = async () => page.evaluate(() => {
      return Array.from(document.querySelectorAll('.td-modal'))
        .filter((node) => !node.classList.contains('hidden'))
        .map((node) => node.id);
    });

    const expectOnlyModal = async (expectedId) => {
      await page.waitForFunction((id) => {
        const visible = Array.from(document.querySelectorAll('.td-modal'))
          .filter((node) => !node.classList.contains('hidden'))
          .map((node) => node.id);
        return visible.length === 1 && visible[0] === id;
      }, expectedId, { timeout: 5000 });
      const ids = await visibleModalIds();
      expect(ids, `Expected only ${expectedId} visible`).toEqual([expectedId]);
    };

    await page.click('#td-meeting-workspace');
    await expectOnlyModal('td-meeting-modal');

    await page.evaluate(() => {
      const btn = document.getElementById('td-sas-library-btn');
      if (btn instanceof HTMLElement) btn.click();
    });
    await expectOnlyModal('td-sas-library-modal');

    await page.evaluate(() => {
      const btn = document.getElementById('td-share-summary');
      if (btn instanceof HTMLElement) btn.click();
    });
    await expectOnlyModal('td-share-modal');
  });
});
