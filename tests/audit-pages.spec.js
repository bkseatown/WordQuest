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
  { slug: 'word-quest', url: 'word-quest.html' },
  { slug: 'reading-lab', url: 'reading-lab.html' },
  { slug: 'sentence-surgery', url: 'sentence-surgery.html' },
  { slug: 'teacher-dashboard', url: 'teacher-dashboard.html' }
];

const OUT_DIR = path.resolve('.artifacts', 'ui-audit', 'screenshots');
const NO_SCROLL_SLUGS = new Set(['index', 'play', 'word-quest', 'teacher-dashboard']);

test.use({ serviceWorkers: 'block' });

function expectedMarker(pageSlug) {
  if (pageSlug === 'teacher-dashboard') return '#td-shell';
  if (pageSlug === 'reading-lab') return '#rl-root';
  if (pageSlug === 'sentence-surgery') return '.ss-container';
  if (pageSlug === 'word-quest') return 'body';
  if (pageSlug === 'play' || pageSlug === 'index') return 'body';
  return 'body';
}

async function getBuildId(page) {
  try {
    const resp = await page.request.get('/build.json', {
      headers: { 'Cache-Control': 'no-cache', Pragma: 'no-cache' }
    });
    if (resp.ok()) {
      const data = await resp.json();
      return String(data.buildId || data.build || data.id || 'unknown');
    }
  } catch (_e) {}

  return page.evaluate(() => {
    const el = document.querySelector('[data-build-badge], .build-badge, #build-badge, #cs-build-badge');
    return el ? String(el.textContent || '').trim() : 'no-badge';
  });
}

async function getDashboardMarkers(page) {
  return page.evaluate(() => {
    const audit = window.__CS_AUDIT__ || {};
    const tdAudit = window.__TD_MARKERS__ || {};
    const anchorsAndButtons = Array.from(document.querySelectorAll('a,button'));
    const controlNodes = Array.from(document.querySelectorAll('select,button,a'));
    return {
      hasHomeBtnText: anchorsAndButtons.some((n) => String(n.textContent || '').trim() === 'Home'),
      hasHomeBtnId: !!document.getElementById('td-home-btn') || !!audit.hasHomeBtnId,
      hasActivities: !!document.getElementById('td-activity-select') || controlNodes.some((n) => {
        const txt = String(n.textContent || '');
        const aria = String(n.getAttribute('aria-label') || '');
        return txt.includes('Activities') || aria.includes('Activities');
      }) || !!audit.hasActivities,
      hasBrandHome: !!document.querySelector('a[aria-label="Home"]') || !!audit.hasBrandHome,
      hasStudentDrawer: !!document.getElementById('td-last-session-card') || !!audit.hasStudentDrawer,
      hasShareSummary: !!document.getElementById('td-share-summary') || !!audit.hasShareSummary,
      hasNeedsChips: !!document.getElementById('td-needs-chip-list') || !!audit.hasNeedsChips,
      hasTodayPlan: !!document.getElementById('td-today-plan') || !!audit.hasTodayPlan,
      hasProgressNote: !!document.getElementById('td-progress-note') || !!audit.hasProgressNote,
      hasToday: !!document.getElementById('td-today') || !!audit.hasToday || !!tdAudit.hasToday,
      hasTodayList: !!document.getElementById('td-today-list') || !!audit.hasTodayList || !!tdAudit.hasTodayList,
      hasBuildBlock: !!document.querySelector('[data-build-block]') || !!audit.hasBuildBlock || !!tdAudit.hasBuildBlock,
      hasTier1EvidenceTool: !!document.getElementById('td-tier1-pack') || !!audit.hasTier1EvidenceTool,
      hasAccommodationsPanel: !!document.querySelector('[data-support-tab="accommodations"]') || !!audit.hasAccommodationsPanel,
      hasMeetingNotesTool: !!document.getElementById('td-meeting-mode') || !!audit.hasMeetingNotesTool,
      hasReferralPacketExport: !!document.getElementById('td-support-export-packet') || !!audit.hasReferralPacketExport,
      tdShell: !!document.querySelector('.td-shell'),
      bodyClass: document.body.className
    };
  });
}

test.describe('UI screenshot audit', () => {
  test('captures screenshots for all pages and viewports', async ({ browser, baseURL, request }, testInfo) => {
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

        const buildId = await getBuildId(page);
        const targetMeta = {
          baseURL: normalizedBase,
          url: page.url(),
          buildId,
          page: pageDef.slug,
          viewport
        };
        testInfo.attach(`audit-target-${pageDef.slug}-${viewport.width}x${viewport.height}`, {
          body: Buffer.from(JSON.stringify(targetMeta, null, 2)),
          contentType: 'application/json'
        });
        console.log(`[audit] baseURL=${normalizedBase} url=${page.url()} buildId=${buildId} page=${pageDef.slug} viewport=${viewport.width}x${viewport.height}`);

        if (pageDef.slug === 'teacher-dashboard') {
          const markers = await getDashboardMarkers(page);
          expect(markers.hasTier1EvidenceTool, 'teacher-dashboard missing Tier 1 Evidence tool').toBe(true);
          expect(markers.hasAccommodationsPanel, 'teacher-dashboard missing accommodations panel').toBe(true);
          expect(markers.hasMeetingNotesTool, 'teacher-dashboard missing meeting notes tool').toBe(true);
          expect(markers.hasReferralPacketExport, 'teacher-dashboard missing referral packet export').toBe(true);
          testInfo.attach(`audit-dashboard-markers-${viewport.width}x${viewport.height}`, {
            body: Buffer.from(JSON.stringify(markers, null, 2)),
            contentType: 'application/json'
          });
          console.log('[audit] dashboard-markers', markers);
        }

        if (NO_SCROLL_SLUGS.has(pageDef.slug)) {
          const overflow = await page.evaluate(() => {
            const el = document.scrollingElement;
            const body = getComputedStyle(document.body);
            const root = getComputedStyle(document.documentElement);
            return el ? {
              delta: el.scrollHeight - el.clientHeight,
              scrollHeight: el.scrollHeight,
              clientHeight: el.clientHeight,
              bodyPaddingTop: body.paddingTop,
              bodyPaddingBottom: body.paddingBottom,
              navH: root.getPropertyValue('--nav-h').trim()
            } : {
              delta: 0,
              scrollHeight: 0,
              clientHeight: 0,
              bodyPaddingTop: body.paddingTop,
              bodyPaddingBottom: body.paddingBottom,
              navH: root.getPropertyValue('--nav-h').trim()
            };
          });
          console.log('[audit] overflow-debug', pageDef.slug, viewport, overflow);
          expect(overflow.delta, `${pageDef.slug} document overflow at ${viewport.width}x${viewport.height}`).toBe(0);
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
