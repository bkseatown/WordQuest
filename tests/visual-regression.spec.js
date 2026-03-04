const { test, expect } = require('@playwright/test');

test.use({ serviceWorkers: 'block' });

const VIEWPORTS = [
  { width: 1440, height: 900 },
  { width: 390, height: 844 }
];

const ROUTES = [
  { slug: 'index', url: './?audit=1', marker: 'body' },
  { slug: 'teacher-dashboard', url: 'teacher-dashboard.html?audit=1', marker: '#td-shell' },
  { slug: 'word-quest', url: 'word-quest.html?audit=1', marker: 'body' },
  { slug: 'reading-lab', url: 'reading-lab.html?audit=1', marker: '#rl-root' },
  { slug: 'sentence-surgery', url: 'sentence-surgery.html?audit=1', marker: '.ss-container' }
];

const MASK_SELECTORS = [
  '#td-buildline',
  '[data-build-badge]',
  '#cs-build-badge',
  '.build-badge',
  '#build-badge',
  '#build-version',
  '#version',
  '.version-chip'
];

test.describe('Visual regression snapshots', () => {
  for (const viewport of VIEWPORTS) {
    test(`${viewport.width}x${viewport.height} core surfaces remain visually stable`, async ({ page }) => {
      await page.setViewportSize(viewport);
      await page.addInitScript(() => {
        const style = document.createElement('style');
        style.textContent = `
          *, *::before, *::after {
            animation: none !important;
            transition: none !important;
            caret-color: transparent !important;
          }
        `;
        document.documentElement.appendChild(style);
      });

      for (const route of ROUTES) {
        const response = await page.goto(route.url, { waitUntil: 'domcontentloaded' });
        expect(response, `No response for ${route.url}`).toBeTruthy();
        expect(response.status(), `Unexpected status for ${route.url}`).toBe(200);
        await expect(page.locator(route.marker).first()).toBeVisible();
        await page.waitForTimeout(200);

        const mask = MASK_SELECTORS.map((selector) => page.locator(selector));
        await expect(page).toHaveScreenshot(
          `${route.slug}__${viewport.width}x${viewport.height}.png`,
          {
            fullPage: true,
            animations: 'disabled',
            caret: 'hide',
            maxDiffPixelRatio: 0.015,
            mask
          }
        );
      }
    });
  }
});
