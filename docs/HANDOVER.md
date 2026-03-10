# WordQuest Handover

## 1) Project Intention
WordQuest is being built as a playful but academically credible literacy platform that blends:
- structured word-learning progression,
- strong classroom usability,
- expressive visual themes,
- and high-quality audio/text content reuse.

The long-term direction is larger than a single game page: the page should become a stable platform shell that can grow into broader audio/text learning experiences without redesign regressions.

Primary product-vision reference:
- `/Users/robertwilliamknaus/Desktop/Cornerstone MTSS/VISION.md`

## 2) Current Stabilization Status (March 8, 2026)
Completed:
- App architecture is now centered around:
  - `Home`
  - `Specialist Hub`
  - `Games`
  - `Student Profile`
  - `Reports`
- `reports.html` is the canonical reports route.
- `student-profile.html` is the canonical one-student detail route.
- Local-first backup/export/import exists, including optional Google Drive upload flow.
- Shared games and Word Quest now use the restored full theme library again.
- Word Quest play routing now returns to `Game Gallery`, not directly to Hub.
- GitHub Pages deploy noise was reduced by limiting redundant QA triggers and removing the extra deploy-alert issue behavior.
- HUD/DOM contract checks pass on the current Word Quest / Seahawks work.
- Latest pushed Word Quest stabilization commit is `8e17d453`.
- Latest confirmed live Word Quest build is `8e17d453ea00-356`.
- Latest validated local screenshot for the current Seahawks state:
  - `/Users/robertwilliamknaus/Desktop/Cornerstone MTSS/artifacts/wordquest-seahawks-validate-25.png`

Current active focus:
- Word Quest Seahawks theme refinement in play mode.
- The correct mental model is:
  - `themes.css` owns bespoke visual identity
  - `components.css` owns shared structure/layout

Known active issues:
- Seahawks theme still needs deeper bespoke object styling for:
  - board frame
  - keyboard
  - theme-specific visual identity beyond color/header
- Current stable traits that should not regress:
  - `Back to Game Gallery` on student-facing Word Quest play pages
  - action-green `Next Word` fill
  - blue-only banner behind the Word Quest logo
  - support buttons remain visible in play mode
  - broad slash-heavy Seahawks board treatment removed
- Word Quest play header has improved, but still needs continued responsive visual QA at narrower widths.
- Some live screenshots may appear stale if GitHub Pages is behind the latest push; always verify `build.json` before judging the public URL.
- Do not share a public link as “updated” unless the live `build.json` matches the commit being referenced.

## 3) Critical File Ownership

### Canonical runtime wiring
- `/Users/robertwilliamknaus/Desktop/Cornerstone MTSS/js/app.js`
  - owns persisted settings and theme runtime API (`window.WQTheme`).

### Canonical theme data
- `/Users/robertwilliamknaus/Desktop/Cornerstone MTSS/js/theme-registry.js`
  - owns theme IDs, labels, family grouping, and normalization behavior.

### Theme navigation + teacher tools behavior
- `/Users/robertwilliamknaus/Desktop/Cornerstone MTSS/js/theme-nav.js`
  - consumes `window.WQTheme` and `window.WQThemeRegistry`.
  - should not become source of truth for theme lists.

### Visual ownership
- `/Users/robertwilliamknaus/Desktop/Cornerstone MTSS/style/themes.css`
  - token definitions per theme.
- `/Users/robertwilliamknaus/Desktop/Cornerstone MTSS/style/components.css`
  - HUD/components styling and motion effects.
- `/Users/robertwilliamknaus/Desktop/Cornerstone MTSS/style/modes.css`
  - mode-level overrides (`projector`, `motion`, feedback palette switches).

## 4) Enforced Guardrails

### Automation
- Script:
  - `/Users/robertwilliamknaus/Desktop/Cornerstone MTSS/scripts/check-hud-contract.js`
  - `/Users/robertwilliamknaus/Desktop/Cornerstone MTSS/scripts/check-change-scope.js`
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
5. Keep `/Users/robertwilliamknaus/Desktop/Cornerstone MTSS/docs/hud-spec-v1.md` as source of truth.

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
1. Continue Seahawks v2/v3 bespoke pass:
   - stronger board frame object
   - stronger keyboard object
   - cleaner Northwest/totem-inspired detailing
   - preserve current spacing unless a validated screenshot proves otherwise
   - do not regress the current blue banner / green Quest / green Next Word relationship
2. Apply the same theme-ownership model to the next bespoke theme after Seahawks.
3. Keep validating visual changes with rendered screenshots before presenting public links.
4. Continue hardening student-safe routing so student-facing game pages never expose teacher-only destinations.

## 9) Operational Discipline
- Always edit live source folder:
  - `/Users/robertwilliamknaus/Desktop/Cornerstone MTSS`
- Test locally before commit:
  - `python3 -m http.server 8787`
  - `npm run scope:view`
  - `npm run hud:check`
- Keep backups, but do not patch from zip snapshots directly.
- Non-coder quick reference:
  - `/Users/robertwilliamknaus/Desktop/Cornerstone MTSS/docs/NONCODER_SAFETY_GUIDE.md`

## 10) Current Practical Assessment
Scored from current code + validated local renders, not classroom outcome data.

1. Student engagement and delight: **86**
2. Learning-loop clarity: **82**
3. Teacher usability and control surface: **81**
4. Accessibility/readability safety: **78**
5. Theme-system maintainability: **88**
6. Visual balance consistency: **73**
7. Motion quality/personality fit: **72**
8. Audio integration reliability: **82**
9. Platform scalability readiness: **84**
10. Regression resistance and collaboration safety: **79**

Overall current baseline: **80/100**

Main reasons score is not higher yet:
- bespoke theme object design is still stronger in the header than in the board/keyboard
- live-vs-local validation discipline improved late and needs to stay strict
- visual regressions have been caused by overlapping shared/theme layers, especially in Word Quest play mode
