const fs = require('fs');
const path = require('path');
const { test, expect } = require('@playwright/test');

const VIEWPORTS = [
  { width: 1440, height: 900 },
  { width: 1024, height: 768 },
  { width: 834, height: 1112 },
  { width: 390, height: 844 }
];

const PAGES = [
  { slug: 'index', url: './' },
  { slug: 'play', url: './?play=1' },
  { slug: 'reading-lab', url: 'reading-lab.html' },
  { slug: 'sentence-surgery', url: 'sentence-surgery.html' },
  { slug: 'teacher-dashboard', url: 'teacher-dashboard.html' }
];

const OUT_DIR = path.resolve('.artifacts', 'ui-audit', 'screenshots');
const NO_SCROLL_SLUGS = new Set(['index', 'play', 'teacher-dashboard']);

test.use({ serviceWorkers: 'block' });

function expectedMarker(pageSlug) {
  if (pageSlug === 'teacher-dashboard') return '#td-shell';
  if (pageSlug === 'reading-lab') return '#rl-root';
  if (pageSlug === 'sentence-surgery') return '.ss-container';
  if (pageSlug === 'play' || pageSlug === 'index') return 'body';
  return 'body';
}

test.describe('UI screenshot audit', () => {
  test('captures screenshots for all pages and viewports', async ({ browser, baseURL, request }) => {
    const context = await browser.newContext({ serviceWorkers: 'block' });
    const page = await context.newPage();
    fs.mkdirSync(OUT_DIR, { recursive: true });
    const normalizedBase = String(baseURL || '').endsWith('/') ? String(baseURL) : `${baseURL}/`;

    const rootUrl = new URL('./', normalizedBase).toString();
    const rootResp = await request.get(rootUrl);
    expect(rootResp.status(), 'Root URL 404 – deploy artifact missing index.html').toBe(200);

    const indexUrl = new URL('index.html', normalizedBase).toString();
    const indexResp = await request.get(indexUrl);
    expect(indexResp.status(), `Non-200 for ${indexUrl}`).toBe(200);

    for (const viewport of VIEWPORTS) {
      await page.setViewportSize(viewport);

      for (const pageDef of PAGES) {
        const fullUrl = new URL(pageDef.url, normalizedBase).toString();
        const auditUrl = fullUrl + (fullUrl.includes('?') ? '&' : '?') + 'audit=1';
        const response = await page.goto(auditUrl, { waitUntil: 'domcontentloaded' });
        expect(response, `No response for ${fullUrl}`).toBeTruthy();
        expect(response.status(), `Non-200 for ${fullUrl}`).toBe(200);
        await expect(page.locator(expectedMarker(pageDef.slug)).first()).toBeVisible();
        if (NO_SCROLL_SLUGS.has(pageDef.slug)) {
          const overflow = await page.evaluate(() => {
            const body = document.body;
            const doc = document.documentElement;
            const clientHeight = Math.min(doc.clientHeight || 0, window.innerHeight || 0);
            const scrollHeight = Math.max(body ? body.scrollHeight : 0, doc.scrollHeight || 0);
            return { scrollHeight, clientHeight };
          });
          expect(
            overflow.scrollHeight,
            `${pageDef.slug} overflows at ${viewport.width}x${viewport.height} (${overflow.scrollHeight} > ${overflow.clientHeight})`
          ).toBeLessThanOrEqual(overflow.clientHeight);
        }

        await page.waitForTimeout(250);

        const fileName = `${pageDef.slug}__${viewport.width}x${viewport.height}.png`;
        await page.screenshot({
          path: path.join(OUT_DIR, fileName),
          fullPage: true
        });
      }
    }
    await context.close();
  });
});
