# WordQuest HUD Spec v1

## Purpose
- Stop redesign regressions by using one decision-complete HUD contract.
- Limit changes to HUD surfaces only.
- Enforce objective acceptance checks before aesthetic tweaks are accepted.

## Scope
- In scope files:
  - `/Users/robertwilliamknaus/Desktop/WordQuest/index.html`
  - `/Users/robertwilliamknaus/Desktop/WordQuest/style/components.css`
  - `/Users/robertwilliamknaus/Desktop/WordQuest/style/themes.css`
  - `/Users/robertwilliamknaus/Desktop/WordQuest/style/modes.css`
  - `/Users/robertwilliamknaus/Desktop/WordQuest/js/app.js`
  - `/Users/robertwilliamknaus/Desktop/WordQuest/js/theme-registry.js`
  - `/Users/robertwilliamknaus/Desktop/WordQuest/js/theme-nav.js`
- Out of scope:
  - Core game mechanics in `js/game.js`
  - Data/content loading in `js/data.js`
  - Audio content logic in `js/audio.js`

## HUD Ownership Contract
- Owned surfaces:
  - `header`
  - `.focus-bar`
  - `.settings-panel`
  - `#game-board`
  - `#keyboard`
  - `.gameplay-audio`
  - `#wq-theme-nav`
  - `#wq-teacher-tools`
- Rule:
  - Each owned selector gets one canonical base block in `style/components.css`.
  - Responsive changes must be in media queries only.
  - Do not inject layout or color styles from JS for owned surfaces.

## Theme Contract
- Canonical registry:
  - `window.WQThemeRegistry` in `js/theme-registry.js`
- Canonical runtime API:
  - `window.WQTheme` in `js/app.js`
- Families (keep all current themes):
  - `core`
  - `sports`
  - `inspired`
  - `dark`
- Each `[data-theme="..."]` block in `style/themes.css` must define all required tokens:
  - `--page-bg`
  - `--page-bg2`
  - `--plate-bg`
  - `--plate-border`
  - `--tile-face`
  - `--tile-border`
  - `--tile-text`
  - `--tile-shadow`
  - `--tile-filled-border`
  - `--key-bg`
  - `--key-text`
  - `--key-shadow`
  - `--key-hover`
  - `--brand`
  - `--brand-dk`
  - `--brand-text`
  - `--header-bg`
  - `--header-border`
  - `--focusbar-bg`
  - `--panel-bg`
  - `--panel-border`
  - `--text`
  - `--text-muted`
- Brightness floor guardrails (HSL lightness):
  - For `core`, `sports`, and `inspired` families:
    - `--page-bg` >= 15%
    - `--page-bg2` >= 10%
  - For `dark` family:
    - `--page-bg` >= 12%
    - `--page-bg2` >= 8%
- Contrast floor guardrails (WCAG ratio approximation):
  - `--key-text` on `--key-bg` >= 4.5
  - `--brand-text` on `--brand` >= 4.5

## Runtime Behavior Contract
- Theme select (`#s-theme`) is rendered from the registry, not hardcoded HTML.
- Theme apply and persistence are deterministic:
  - Invalid/missing stored theme normalizes to registry fallback.
  - Theme arrows and select stay synchronized.
- No split persistence:
  - Theme persistence uses app prefs (`localStorage` via `wq_v2_prefs`).
  - Session-only theme storage is not used as a source of truth.

## Layout and Interaction Contract
- Visual baseline:
  - Readable classroom-first default.
  - Theme variety preserved via tokens only.
- Motion model:
  - `data-motion` values: `fun`, `calm`, `reduced`.
- Accessibility:
  - Focus-visible states must remain obvious.
  - Existing control IDs and ARIA semantics stay intact.

## Acceptance Workflow
- A change is done only if all pass:
  - `npm run hud:check`
  - Manual checks in `/Users/robertwilliamknaus/Desktop/WordQuest/docs/hud-acceptance-checklist.md`
- Process target:
  - One draft plus one revision max (2 rounds).

## Change Request Template
- Target surface:
- Exact desired delta:
- Non-regression rules:
- Acceptance checks to run:
