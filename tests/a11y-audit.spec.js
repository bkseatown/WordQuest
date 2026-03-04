const { test, expect } = require('@playwright/test');
const AxeBuilder = require('@axe-core/playwright').default;

test.use({ serviceWorkers: 'block' });

const ROUTES = [
  { slug: 'index', url: './?audit=1', marker: 'body' },
  { slug: 'teacher-dashboard', url: 'teacher-dashboard.html?audit=1', marker: '#td-shell' },
  { slug: 'word-quest', url: 'word-quest.html?audit=1', marker: '#game-board, #gameBoard, .game-board, body' },
  { slug: 'reading-lab', url: 'reading-lab.html?audit=1', marker: '#rl-root' },
  { slug: 'sentence-surgery', url: 'sentence-surgery.html?audit=1', marker: '.ss-container' }
];

const DISABLED_RULES = [
  // Contrast requires theme-by-theme manual verification in this repo.
  'color-contrast'
];

function normalizeMarker(marker) {
  const parts = String(marker).split(',').map((part) => part.trim()).filter(Boolean);
  return parts.length ? parts : ['body'];
}

test.describe('Accessibility audit (WCAG A/AA)', () => {
  for (const route of ROUTES) {
    test(`${route.slug} has no critical/serious axe violations`, async ({ page }, testInfo) => {
      const response = await page.goto(route.url, { waitUntil: 'domcontentloaded' });
      expect(response, `No response for ${route.url}`).toBeTruthy();
      expect(response.status(), `Non-200 for ${route.url}`).toBe(200);

      const markerCandidates = normalizeMarker(route.marker);
      let markerVisible = false;
      for (const selector of markerCandidates) {
        const locator = page.locator(selector).first();
        if (await locator.count()) {
          await expect(locator).toBeVisible();
          markerVisible = true;
          break;
        }
      }
      expect(markerVisible, `No marker visible for ${route.slug}`).toBe(true);

      const results = await new AxeBuilder({ page })
        .disableRules(DISABLED_RULES)
        .withTags(['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa'])
        .analyze();

      const severe = results.violations.filter((violation) => {
        return violation.impact === 'critical' || violation.impact === 'serious';
      });

      testInfo.attach(`a11y-${route.slug}-full`, {
        body: Buffer.from(JSON.stringify(results, null, 2)),
        contentType: 'application/json'
      });

      if (severe.length) {
        testInfo.attach(`a11y-${route.slug}-severe`, {
          body: Buffer.from(JSON.stringify(severe, null, 2)),
          contentType: 'application/json'
        });
      }

      expect(severe, `${route.slug} has critical/serious accessibility issues`).toEqual([]);
    });
  }
});
