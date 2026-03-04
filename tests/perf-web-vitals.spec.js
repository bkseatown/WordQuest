const { test, expect } = require('@playwright/test');

test.use({
  serviceWorkers: 'block',
  viewport: { width: 1366, height: 768 }
});

const ROUTES = [
  {
    slug: 'index',
    url: './?audit=1',
    marker: 'body',
    interactionSelectors: ['#roleTeacher', 'button']
  },
  {
    slug: 'teacher-dashboard',
    url: 'teacher-dashboard.html?audit=1',
    marker: '#td-shell',
    interactionSelectors: ['#td-focus-start-btn', '#td-mode-daily', 'button']
  },
  {
    slug: 'word-quest',
    url: 'word-quest.html?audit=1',
    marker: '#game-board, #gameBoard, .game-board, body',
    interactionSelectors: ['#nextWordBtn', '#next-word-btn', '#nextWord', 'button']
  },
  {
    slug: 'reading-lab',
    url: 'reading-lab.html?audit=1',
    marker: '#rl-root',
    interactionSelectors: ['#rl-start', 'button']
  }
];

const BUDGETS = {
  ttfb: 1200,
  fcp: 3000,
  lcp: 4000,
  cls: 0.1,
  inp: 300
};

function markerCandidates(selectorText) {
  return String(selectorText || '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
}

async function clickFirstAvailable(page, selectors) {
  for (const selector of selectors) {
    const locator = page.locator(selector).first();
    const count = await locator.count();
    if (!count) continue;
    if (!(await locator.isVisible())) continue;
    try {
      await locator.click({ timeout: 1000 });
      return selector;
    } catch (_error) {
      // Continue to next candidate.
    }
  }
  return null;
}

test.describe('Performance budgets (Core Web Vitals)', () => {
  for (const route of ROUTES) {
    test(`${route.slug} meets web-vitals budgets`, async ({ page }, testInfo) => {
      await page.addInitScript(() => {
        window.__CS_WEB_VITALS__ = { cls: 0, inp: 0, fcp: null, lcp: null };

        try {
          const clsObserver = new PerformanceObserver((list) => {
            for (const entry of list.getEntries()) {
              if (!entry.hadRecentInput) {
                window.__CS_WEB_VITALS__.cls += entry.value;
              }
            }
          });
          clsObserver.observe({ type: 'layout-shift', buffered: true });
        } catch (_error) {}

        try {
          const inpObserver = new PerformanceObserver((list) => {
            for (const entry of list.getEntries()) {
              const duration = Number(entry.duration || 0);
              if (duration > window.__CS_WEB_VITALS__.inp) {
                window.__CS_WEB_VITALS__.inp = duration;
              }
            }
          });
          inpObserver.observe({ type: 'event', buffered: true, durationThreshold: 16 });
        } catch (_error) {}

        try {
          const paintObserver = new PerformanceObserver((list) => {
            for (const entry of list.getEntries()) {
              if (entry.name === 'first-contentful-paint') {
                window.__CS_WEB_VITALS__.fcp = entry.startTime;
              }
            }
          });
          paintObserver.observe({ type: 'paint', buffered: true });
        } catch (_error) {}

        try {
          const lcpObserver = new PerformanceObserver((list) => {
            for (const entry of list.getEntries()) {
              window.__CS_WEB_VITALS__.lcp = entry.startTime;
            }
          });
          lcpObserver.observe({ type: 'largest-contentful-paint', buffered: true });
        } catch (_error) {}
      });

      const response = await page.goto(route.url, { waitUntil: 'load' });
      expect(response, `No response for ${route.url}`).toBeTruthy();
      expect(response.status(), `Unexpected status for ${route.url}`).toBe(200);

      let markerVisible = false;
      for (const selector of markerCandidates(route.marker)) {
        const locator = page.locator(selector).first();
        if (await locator.count()) {
          await expect(locator).toBeVisible();
          markerVisible = true;
          break;
        }
      }
      expect(markerVisible, `No route marker visible for ${route.slug}`).toBe(true);

      await page.waitForTimeout(1200);
      const clicked = await clickFirstAvailable(page, route.interactionSelectors || []);
      if (clicked) {
        await page.waitForTimeout(250);
      }

      const metrics = await page.evaluate(() => {
        const nav = performance.getEntriesByType('navigation')[0];
        const paints = performance.getEntriesByType('paint');
        const fcpEntry = paints.find((entry) => entry.name === 'first-contentful-paint');
        const lcpEntries = performance.getEntriesByType('largest-contentful-paint');
        const lcp = lcpEntries.length ? lcpEntries[lcpEntries.length - 1].startTime : null;
        const vitals = window.__CS_WEB_VITALS__ || { cls: null, inp: null, fcp: null, lcp: null };

        return {
          ttfb: nav ? nav.responseStart : null,
          fcp: fcpEntry ? fcpEntry.startTime : vitals.fcp,
          lcp: lcp || vitals.lcp,
          cls: vitals.cls,
          inp: vitals.inp
        };
      });

      testInfo.attach(`perf-${route.slug}`, {
        body: Buffer.from(JSON.stringify({ clicked, metrics, budgets: BUDGETS }, null, 2)),
        contentType: 'application/json'
      });

      expect(metrics.ttfb, `${route.slug} missing TTFB metric`).not.toBeNull();
      expect(metrics.fcp, `${route.slug} missing FCP metric`).not.toBeNull();
      expect(metrics.lcp, `${route.slug} missing LCP metric`).not.toBeNull();
      expect(metrics.cls, `${route.slug} missing CLS metric`).not.toBeNull();
      expect(metrics.inp, `${route.slug} missing INP metric`).not.toBeNull();

      expect(metrics.ttfb, `${route.slug} TTFB budget exceeded`).toBeLessThanOrEqual(BUDGETS.ttfb);
      expect(metrics.fcp, `${route.slug} FCP budget exceeded`).toBeLessThanOrEqual(BUDGETS.fcp);
      expect(metrics.lcp, `${route.slug} LCP budget exceeded`).toBeLessThanOrEqual(BUDGETS.lcp);
      expect(metrics.cls, `${route.slug} CLS budget exceeded`).toBeLessThanOrEqual(BUDGETS.cls);
      expect(metrics.inp, `${route.slug} INP budget exceeded`).toBeLessThanOrEqual(BUDGETS.inp);
    });
  }
});
