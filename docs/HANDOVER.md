# WordQuest Handover

## 1) Project Intention
WordQuest is being built as a playful but academically credible literacy platform that blends:
- structured word-learning progression,
- strong classroom usability,
- expressive visual themes,
- and high-quality audio/text content reuse.

The long-term direction is larger than a single game page: the page should become a stable platform shell that can grow into broader audio/text learning experiences without redesign regressions.

Primary product-vision reference:
- `/Users/robertwilliamknaus/Desktop/WordQuest/VISION.md`

## 2) Current Stabilization Status (Feb 22, 2026)
Completed:
- Canonical theme registry added and used as source of truth.
- Theme dropdown rendered from registry (not hardcoded HTML list).
- Theme nav arrows synced with canonical theme state.
- Theme persistence unified to app prefs (`wq_v2_prefs` in localStorage).
- Inline-style-heavy theme nav refactored to class-based CSS ownership.
- HUD docs/checklist/check script added.
- Contract checks pass (`npm run hud:check`).

Known active issue:
- Voice help modal close action can be blocked by settings panel layering in some UI states.

## 3) Critical File Ownership

### Canonical runtime wiring
- `/Users/robertwilliamknaus/Desktop/WordQuest/js/app.js`
  - owns persisted settings and theme runtime API (`window.WQTheme`).

### Canonical theme data
- `/Users/robertwilliamknaus/Desktop/WordQuest/js/theme-registry.js`
  - owns theme IDs, labels, family grouping, and normalization behavior.

### Theme navigation + teacher tools behavior
- `/Users/robertwilliamknaus/Desktop/WordQuest/js/theme-nav.js`
  - consumes `window.WQTheme` and `window.WQThemeRegistry`.
  - should not become source of truth for theme lists.

### Visual ownership
- `/Users/robertwilliamknaus/Desktop/WordQuest/style/themes.css`
  - token definitions per theme.
- `/Users/robertwilliamknaus/Desktop/WordQuest/style/components.css`
  - HUD/components styling and motion effects.
- `/Users/robertwilliamknaus/Desktop/WordQuest/style/modes.css`
  - mode-level overrides (`projector`, `motion`, feedback palette switches).

## 4) Enforced Guardrails

### Automation
- Script:
  - `/Users/robertwilliamknaus/Desktop/WordQuest/scripts/check-hud-contract.js`
  - `/Users/robertwilliamknaus/Desktop/WordQuest/scripts/check-change-scope.js`
- Command:
  - `npm run hud:check`
  - `npm run scope:view`
  - `npm run scope:check`
  - `npm run scope:strict`

### What it validates
- required tokens for every theme.
- registry/theme-block consistency.
- no hardcoded theme options in HTML select.
- no hardcoded theme order in `theme-nav.js`.
- no theme canonical persistence in `sessionStorage`.
- no inline style injection drift in `theme-nav.js`.
- canonical ownership blocks in CSS.
- theme background brightness floors (prevents regression to near-black pages).
- key/CTA token contrast floors (prevents low-contrast text regressions).
- file-change safety buckets for non-coder review (green/yellow/red).
  - `scope:check` fails on red only.
  - `scope:strict` fails on yellow, red, or unknown.

## 5) Fine-Tuning Workflow
Use small, measurable batches.

### Recommended batch size
- 1 to 3 visual/behavior deltas per pass.

### Request format
- `Surface` (example: keyboard key shape)
- `Intent` (example: toy-like, bubbly)
- `Must Keep` (example: readable labels, same key sizing constraints)
- `Must Avoid` (example: mushy/water-balloon wobble)
- `Acceptance` (example: radius >= X, bounce <= Y ms, disabled in reduced motion)

### Example for your current goals
- Surface: keyboard motion + tile lock effect
- Intent: bouncy and playful
- Must Keep: readable letterforms, no motion in reduced mode
- Must Avoid: water-balloon wobble, dark theme creep
- Acceptance:
  - key bounce has snappier easing and visible rebound
  - lock-in effect only in `data-motion="fun"`
  - effect disabled when `data-motion="reduced"`
  - all `hud:check` gates pass

## 6) Multi-Agent Anti-Drift Rules
If using Claude/ChatGPT/other tools:
1. Give them strict file scope first.
2. Require pass/fail output against `npm run hud:check`.
3. Reject patches that:
   - add second theme order lists,
   - move canonical theme persistence to session storage,
   - inject inline styles for HUD components,
   - bypass brightness guardrails.
4. Work in branches and merge only tested commits.
5. Keep `/Users/robertwilliamknaus/Desktop/WordQuest/docs/hud-spec-v1.md` as source of truth.

## 7) Smoke Test Baseline (Latest Run)
Passed:
- app load and render,
- theme switching and persistence,
- keyboard input and validation toast,
- tile/key coloring,
- modal audio controls,
- teacher tools activate/clear flows.

Failed:
- voice help modal close interaction can be blocked by stacking/pointer interception.

## 8) Next Priority Fixes
1. Resolve voice-help modal stacking and close interaction.
2. Tighten motion personality:
   - more elastic key bounce,
   - optional lock-in burst effect in fun mode only.
3. Tune theme 60-30-10 balance by family with measurable acceptance thresholds.

## 9) Operational Discipline
- Always edit live source folder:
  - `/Users/robertwilliamknaus/Desktop/WordQuest`
- Test locally before commit:
  - `python3 -m http.server 8787`
  - `npm run scope:view`
  - `npm run hud:check`
- Keep backups, but do not patch from zip snapshots directly.
- Non-coder quick reference:
  - `/Users/robertwilliamknaus/Desktop/WordQuest/docs/NONCODER_SAFETY_GUIDE.md`

## 10) Baseline Assessment (1-100)
Scored from current code + smoke test, not from classroom outcome data.

1. Student engagement and delight: **82**
2. Learning-loop clarity (guess/feedback/audio reinforcement): **78**
3. Teacher usability and control surface: **74**
4. Accessibility/readability safety: **68**
5. Theme-system maintainability: **85**
6. Visual balance consistency (including 60-30-10 discipline): **66**
7. Motion quality/personality fit: **61**
8. Audio integration reliability: **80**
9. Platform scalability readiness (for broader feature growth): **76**
10. Regression resistance and collaboration safety: **84**

Overall baseline: **75/100**

Main reasons score is not higher yet:
- one active modal layering bug,
- motion personality tuning still in progress,
- visual balance consistency still uneven across theme families,
- accessibility and responsive QA can be deepened.
