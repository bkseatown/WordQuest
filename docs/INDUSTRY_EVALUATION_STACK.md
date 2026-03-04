# Industry Evaluation Stack (Web/UI/UX)

This repo now includes automated checks aligned to common product-quality practice for education SaaS.

## Automated Gates

1. Accessibility (WCAG A/AA, serious/critical)
- Command: `npm run audit:a11y`
- Test file: `tests/a11y-audit.spec.js`
- Scope: core pages used by teachers and students.
- Notes: `color-contrast` is excluded from automation and should be manually validated by theme.

2. Core Web Vitals Budget Gate
- Command: `npm run audit:performance`
- Test file: `tests/perf-web-vitals.spec.js`
- Budget metrics:
  - TTFB <= 1200ms
  - FCP <= 3000ms
  - LCP <= 4000ms
  - CLS <= 0.10
  - INP <= 300ms

3. Visual Regression
- Baseline capture: `npm run test:visual:update`
- Regression check: `npm run test:visual:regression`
- Test file: `tests/visual-regression.spec.js`
- Scope: index, teacher dashboard, Word Quest, Reading Lab, Sentence Studio (desktop + mobile viewport).

4. Cross-browser Matrix
- Command: `npm run audit:matrix`
- Covers runtime guardrails + accessibility on Chromium, Firefox, and WebKit.

5. Full Industry Audit Bundle
- Command: `npm run audit:industry`
- Runs: UI audit + runtime guardrails + accessibility + performance + visual regression.

## Manual Checks Still Required (Industry Standard)

These are not replaced by automation:

1. Keyboard-only walkthrough
- Verify every primary and secondary action is operable with keyboard only.

2. Screen reader verification
- NVDA/JAWS (Windows) and VoiceOver (macOS/iOS) quick pass on:
  - Dashboard focus flow
  - Meeting workspace
  - Word Quest launch + return path

3. Color/contrast review
- Validate light/dark variants and branded themes against WCAG 2.2 AA.

4. Task-based usability sessions
- Collect success rate, time-to-task completion, error events, and confidence rating.

5. Comparative benchmark
- Compare against current school workflow baseline:
  - Time to plan session
  - Time to prepare meeting summary
  - Number of clicks to launch intervention
