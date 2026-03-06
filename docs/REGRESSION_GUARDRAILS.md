# Regression Guardrails & AI Drift Prevention
**Last Updated:** March 6, 2026
**Purpose:** Prevent bugs like the March 5-6 syntax errors from recurring when multiple AI agents contribute to the codebase

---

## Executive Summary

After the critical JS syntax error (March 5-6) that prevented the entire hub from initializing, we've implemented defensive guardrails to catch regressions early, especially when other AI agents help polish elements.

**Key Risk Areas:**
- Silent JS parsing failures (no console error, module never executes)
- Browser cache masking file edits (304 Not Modified responses)
- CSS cascade order causing unintended overrides
- Mobile-responsive layout breaking on dimension changes
- Tour/modal/overlay auto-launch blocking content

---

## Layer 1: Syntax & Parsing Validation

### 1A. JavaScript Syntax Check (Pre-Commit)

**Tool:** ESLint
**When to run:** Before committing changes to `js/` or `.html` files with `<script>`
**Command:**
```bash
npm run lint:js
```

**What it catches:**
- Mismatched parentheses, brackets, braces
- Unused variables (aids debugging)
- Undefined globals (catches typos)
- Mixed quote types (e.g., `""` vs `''` in same statement)

**Configuration:** `.eslintrc.json` (add if missing)
```json
{
  "env": { "browser": true, "es2021": true },
  "extends": "eslint:recommended",
  "rules": {
    "no-undef": "error",
    "no-unused-vars": "warn",
    "quotes": ["error", "single", { "avoidEscape": true }]
  }
}
```

### 1B. CSS Syntax Check (Pre-Commit)

**Tool:** Stylelint
**When to run:** Before committing CSS changes
**Command:**
```bash
npm run lint:css
```

**What it catches:**
- Missing semicolons
- Invalid color values
- Duplicate selectors
- Specificity conflicts

**Configuration:** `.stylelintrc.json`
```json
{
  "extends": "stylelint-config-standard",
  "rules": {
    "no-descending-specificity": "warn",
    "color-no-invalid-hex": true
  }
}
```

### 1C. HTML Validation (Pre-Deploy)

**Tool:** HTML5 Validator
**When to run:** Before pushing to GitHub/deployment
**Command:**
```bash
npm run validate:html
```

**What it catches:**
- Missing required attributes (e.g., `alt` on `<img>`)
- Invalid nesting (e.g., `<button>` inside `<button>`)
- Unclosed tags
- Incorrect data attributes

---

## Layer 2: Runtime Testing & Smoke Tests

### 2A. Hub Initialization Test

**File:** `tests/hub-smoke.test.js` (to create)
**Runs:** On dev server startup via npm script
**What it tests:**
```javascript
// Check that teacher-hub-v2.js IIFE executes
window.CSHubState !== undefined
window.CSHubContext !== undefined
document.querySelector('.th2-sidebar') !== null  // sidebar renders
document.querySelectorAll('.th2-list [role="listitem"]').length > 0  // students populate
```

**Command:**
```bash
npm run test:smoke:hub
```

### 2B. Visual Regression Testing

**Tool:** Percy or Chromatic (recommended)
**Runs:** On PR creation
**What it catches:**
- Background color changes
- Layout shifts (flexbox reordering, margin/padding collisions)
- Typography rendering (font weight, size, line-height)
- Mobile breakpoint issues (when viewport < 768px, > 1024px)

**Setup:**
```bash
npm install --save-dev @percy/cli
```

**Command:**
```bash
npm run test:visual
```

### 2C. Mobile Layout Smoke Test

**File:** `tests/mobile-layout.test.js`
**What it verifies:**
```javascript
// Verify single-page scroll on mobile (375px width)
const shell = document.querySelector('.th2-shell');
const computed = getComputedStyle(shell);
computed.height === 'auto'  // NOT 100dvh
computed.overflow === 'visible'  // NOT hidden

// Verify footer doesn't overlap list
const footer = document.querySelector('.th2-sidebar-footer');
const list = document.querySelector('.th2-list');
footer.getBoundingClientRect().top >= list.getBoundingClientRect().bottom
```

**Command:**
```bash
npm run test:mobile:layout
```

---

## Layer 3: Cache & Deployment Guardrails

### 3A. Cache Buster Validation

**What to check:** All HTML files reference current cache busters
**Warning Signs:**
- Multiple different `v=` strings in a single file (indicates partial update)
- Old dates (e.g., `v=20260305a` when today is March 6) in production deploy

**Pre-Deploy Check:**
```bash
npm run check:cache-busters
```

**Script logic:**
```bash
#!/bin/bash
# Extract all cache busters from index.html, teacher-hub-v2.html, etc.
BUSTERS=$(grep -o 'v=[a-zA-Z0-9]*' *.html | cut -d'=' -f2 | sort -u)
if [ $(echo "$BUSTERS" | wc -l) -gt 1 ]; then
  echo "ERROR: Multiple cache buster versions detected!"
  echo "$BUSTERS"
  exit 1
fi
```

### 3B. Service Worker Verification

**Check:** SW registration doesn't mask errors
**Command:**
```bash
npm run check:sw
```

**What it validates:**
- `sw.js` has no syntax errors
- Service worker cache keys match version
- Offline fallback page exists and is referenced

---

## Layer 4: CSS Cascade & Media Query Order

### 4A. CSS Ordering Convention

**Rule:** Media queries and component overrides should follow this order:

```css
/* 1. Component base (desktop defaults) */
.component { }

/* 2. Desktop-only refinements (max-width: 1024px and up) */
@media (min-width: 1025px) { }

/* 3. Tablet refinements (768px to 1024px) */
@media (min-width: 768px) and (max-width: 1024px) { }

/* 4. Mobile refinements (max-width: 767px) — use !important only for layout-critical props */
@media (max-width: 767px) { }

/* 5. Micro-breakpoints (480px, 360px) */
@media (max-width: 480px) { }
```

**Validation Script:**
```bash
npm run check:css-order
```

### 4B. No Duplicate Media Blocks

**Check:** Each breakpoint appears only once in the final file
**Error Example:**
```css
/* BAD: two @media (max-width: 768px) blocks */
@media (max-width: 768px) { .list { flex: 1; } }
...
@media (max-width: 768px) { .list { overflow: auto; } }  /* 2nd wins, 1st ignored */
```

**Validation Script:**
```bash
npm run check:css-duplicates
```

---

## Layer 5: Module Dependency Checks

### 5A. Global Object Registration

**Pattern:** Every major module should register itself on `window`
**Check:** On page load, verify all expected globals exist

```javascript
// Smoke test
const REQUIRED_MODULES = [
  'CSHubState',
  'CSHubContext',
  'CSEvidence',
  'CSSupportStore',
  'CSPlanEngine',
  'CSBuildBadge'
];

REQUIRED_MODULES.forEach(mod => {
  if (!window[mod]) {
    console.error(`REGRESSION: Missing global "${mod}" — check script loading order`);
    throw new Error(`Module ${mod} not initialized`);
  }
});
```

**When to run:** In `teacher-hub-v2.js` during boot, or in a dedicated test suite

### 5B. Script Loading Order Validation

**File:** `scripts/check-script-order.js`
**What it does:**
- Parses HTML and extracts `<script src="...">` tags in order
- Verifies dependencies load before dependents
- Example: `hub-state.js` must load before `hub-context.js`

**Command:**
```bash
npm run check:script-order
```

---

## Layer 6: AI Agent Drift Prevention

### 6A. Before Merging a PR from Another AI Agent

**Checklist:**
- [ ] Ran `npm run lint:js` — 0 errors
- [ ] Ran `npm run lint:css` — 0 errors
- [ ] Ran `npm run test:smoke:hub` — 0 failures
- [ ] Ran `npm run test:mobile:layout` — 0 failures
- [ ] Manual desktop test at 1280px width — no layout shifts
- [ ] Manual mobile test at 375px width — single scroll, footer below list
- [ ] Cache busters updated to today's version (e.g., `v=20260306b` if agent made changes)
- [ ] No console errors at startup
- [ ] Tour doesn't auto-launch on page load

### 6B. Comment Block for External AI Agents

**Add to every file touched by external agent:**
```javascript
/**
 * CRITICAL GUARDRAILS for external AI edits:
 * - Do NOT remove this IIFE — if it fails to parse, the entire module silent-fails
 * - Do NOT wrap console.log() calls in try/catch — errors should bubble up
 * - Do NOT use template literals with unclosed backticks
 * - Do NOT modify cache buster version numbers — human/CI will increment
 * - Do NOT auto-initialize modules on page load without explicit [HUB-BOOT] logs
 * - If adding new global objects, register on window with window.CS* naming
 */
```

### 6C. Pre-Commit Hook (Git)

**File:** `.git/hooks/pre-commit` (create manually or via Husky)

```bash
#!/bin/bash
# Prevent commits with obvious syntax errors

# Check JS syntax
npx eslint js/ --max-warnings 0
if [ $? -ne 0 ]; then
  echo "❌ ESLint check failed. Fix errors before committing."
  exit 1
fi

# Check CSS syntax
npx stylelint style/ --max-warnings 0
if [ $? -ne 0 ]; then
  echo "❌ Stylelint check failed. Fix errors before committing."
  exit 1
fi

# Check cache busters are consistent
BUSTER_COUNT=$(grep -ho 'v=[a-zA-Z0-9]*' *.html | cut -d'=' -f2 | sort -u | wc -l)
if [ $BUSTER_COUNT -gt 1 ]; then
  echo "❌ Inconsistent cache busters. Update all to the same version."
  exit 1
fi

echo "✅ Pre-commit checks passed"
exit 0
```

**Install Husky (recommended):**
```bash
npm install husky --save-dev
npx husky install
npx husky add .husky/pre-commit "npm run lint"
```

---

## Layer 7: Monitoring & Alerting

### 7A. Build Badge Heartbeat

**What it does:** Pings `build.json` every 60 seconds on production
**Alerts on:**
- Stale build ID (older than 24 hours — indicates deployment failed)
- Missing `buildId` field
- 404 response

**File:** `js/build-badge.js` (already has this logic)

### 7B. Error Logging to Analytics

**File:** `js/analytics-local.js`
**What to log:**
- Module initialization failures
- Hub boot timeout
- Tour auto-launch errors
- Cache miss / stale SW

**Example:**
```javascript
window.addEventListener('error', (event) => {
  CSAnalyticsEngine.logEvent('error', {
    message: event.message,
    filename: event.filename,
    lineno: event.lineno,
    timestamp: new Date().toISOString()
  });
});
```

---

## Recommended npm Scripts Setup

Add these to `package.json`:

```json
{
  "scripts": {
    "lint:js": "eslint js/ --max-warnings 0",
    "lint:css": "stylelint style/ --max-warnings 0",
    "lint": "npm run lint:js && npm run lint:css",
    "test:smoke:hub": "node tests/hub-smoke.test.js",
    "test:mobile:layout": "node tests/mobile-layout.test.js",
    "test:smoke": "npm run test:smoke:hub && npm run test:mobile:layout",
    "test:visual": "percy exec -- npm run test:visual:snapshot",
    "check:cache-busters": "node scripts/check-cache-busters.js",
    "check:css-order": "node scripts/check-css-order.js",
    "check:css-duplicates": "node scripts/check-css-duplicates.js",
    "check:script-order": "node scripts/check-script-order.js",
    "check:sw": "node scripts/check-sw.js",
    "precommit": "npm run lint && npm run test:smoke && npm run check:cache-busters",
    "predeploy": "npm run lint && npm run test:smoke && npm run validate:html",
    "release": "npm run predeploy && git push origin main"
  }
}
```

---

## Quick Reference: When to Run What

| Scenario | Command | Why |
|----------|---------|-----|
| Before committing | `npm run lint` | Catch syntax errors early |
| After editing teacher-hub-v2.js | `npm run test:smoke:hub` | Verify hub initializes |
| After editing CSS media queries | `npm run check:css-order` | Prevent cascade issues |
| After mobile UI edits | `npm run test:mobile:layout` | Single scroll, no overlap |
| Before pushing to GitHub | `npm run precommit` | Run all guardrails |
| Before production deploy | `npm run predeploy` | Full validation suite |
| When external AI agent helps | Review **Layer 6A Checklist** | Prevent drift |

---

## Testing Actual Regression: Example

**Scenario:** Another AI agent accidentally introduces a syntax error similar to March 5

**Detection Flow:**
1. Agent edits `teacher-hub-v2.js` and commits
2. CI runs `npm run lint:js` → **ESLint catches `""` syntax error** → Build fails ✅
3. If ESLint somehow missed it, `npm run test:smoke:hub` → **Module initialization test fails** → Build fails ✅
4. If both missed it (rare), production monitoring sees stale `build.json` → Alert sent ✅

---

## Future Enhancements

1. **Percy Integration:** Automatic visual regression on every PR
2. **Lighthouse CI:** Track Core Web Vitals (LCP, CLS, FID)
3. **a11y Audits:** Axe-core automated accessibility checks on each commit
4. **Load Testing:** Verify hub stays responsive under 100+ student caseload
5. **E2E Tests:** Cypress/Playwright tests for full teacher workflows

---

## Contact & Escalation

If guardrails catch a regression:
1. Check the error message — it will point to the offending file and line
2. Fix the issue locally
3. Run `npm run precommit` to verify fix
4. Commit with message: `Fix: [brief description] — regression check: [which guardrail caught it]`

For questions about guardrails or adding new checks, document in this file and link in relevant code comments.
