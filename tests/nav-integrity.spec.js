const { test, expect } = require('@playwright/test');

test.describe('Navigation integrity', () => {
  test('canonical routes resolve without same-origin 4xx/5xx', async ({ page, baseURL }) => {
    const origin = new URL(baseURL || 'http://127.0.0.1:4173').origin;
    const failedResponses = [];

    page.on('response', (response) => {
      const url = response.url();
      if (!url.startsWith(origin)) return;
      const status = response.status();
      if (status >= 400) {
        failedResponses.push({ status, url });
      }
    });

    const routes = [
      { path: '/index.html', marker: 'body' },
      { path: '/teacher-hub-v2.html', marker: '#th2-main, #th2-shell, body' },
      { path: '/reports.html?audit=1&mode=daily', marker: '#td-shell' },
      { path: '/word-quest.html', marker: 'body' },
      { path: '/reading-lab.html', marker: '#rl-root' },
      { path: '/sentence-surgery.html', marker: '.ss-container' },
      { path: '/activities/decoding-diagnostic.html', marker: 'body' },
      { path: '/writing-studio.html', marker: 'body' },
      { path: '/numeracy.html', marker: 'body' },
      { path: '/admin-dashboard.html', marker: 'body' }
    ];

    for (const route of routes) {
      await page.goto(route.path, { waitUntil: 'domcontentloaded' });
      await expect(page.locator(route.marker).first()).toBeVisible();
    }

    const realFailures = failedResponses.filter((row) => !/\/favicon\.ico(?:\?|$)/.test(row.url));
    expect(
      realFailures,
      `same-origin request failures detected:\n${JSON.stringify(realFailures, null, 2)}`
    ).toEqual([]);
  });

  test('teacher-dashboard route redirects to reports prep', async ({ page }) => {
    await page.goto('/teacher-dashboard.html?audit=1', { waitUntil: 'domcontentloaded' });
    await expect(page).toHaveURL(/\/reports\.html(?:\?|$)/);
    await expect(page.locator('#td-shell')).toBeVisible();
  });
});
