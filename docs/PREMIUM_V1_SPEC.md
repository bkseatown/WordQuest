# WordQuest Premium v1 Spec (Safe Rollout)

## Purpose
Define a premium visual package that upgrades quality and consistency while preserving current gameplay behavior and protecting the stable Classic experience.

## Product Position
- `Classic` remains the protected default baseline.
- `Premium` is an opt-in visual package.
- Premium v1 does not add new gameplay features.

## Current Baseline (Approved)
- Live baseline: Classic look and behavior.
- Theme picker, board, keyboard, settings, and deep-dive flows remain functional.

## Problems Premium v1 Must Solve
1. Weak visual hierarchy in the top control area.
2. Inconsistent spacing rhythm across header, board, keyboard, and modal surfaces.
3. Inconsistent component language (radius, borders, shadows, button weights).
4. Settings modal readability and grouping density.
5. Contrast inconsistency on muted/inactive states.

## Non-Goals (v1)
- No game logic changes.
- No curriculum/word-data schema changes.
- No route/page architecture changes.
- No hard switch of default from Classic to Premium.

## Premium v1 Design Contract

### Token System
Create or normalize token groups used by Premium selectors:
- Color tokens: surface, text-primary, text-muted, border, focus, accent.
- Elevation tokens: card shadow, active shadow, inset depth.
- Radius tokens: sm, md, lg, pill.
- Spacing tokens: 8/12/16/24/32 rhythm.
- Typography tokens: heading, body, label, helper.

All component styles in Premium must use tokens, not ad-hoc values.

### Component Targets (in order)
1. Header and top controls.
2. Settings modal and tabs/groups.
3. Board plate and tiles.
4. Keyboard and key states.
5. Teacher/deep-dive panels.

Each target ships as a separate slice.

## Rollout Plan (Lowest Risk)

### Slice 1: Header + Top Controls
- Improve hierarchy and spacing.
- Reduce equal-weight controls.
- Keep existing interactions unchanged.

### Slice 2: Settings Modal
- Clear section grouping and spacing.
- Stronger primary/secondary action contrast.
- Keep all current setting IDs and bindings.

### Slice 3: Board + Keyboard
- Preserve tile/key state semantics.
- Improve default surface contrast and depth.
- Keep accessibility focus visibility.

### Slice 4: Teacher + Deep Dive Surfaces
- Align cards/pills/buttons to same visual system.
- Remove carryover visual noise per page mode.

## Guardrails (Required)
No slice merges without all checks passing:
1. `npm run scope:strict`
2. `npm run hud:check`
3. `npm run test:visual:update` (or equivalent visual baseline check in CI)
4. Manual screenshot checklist on desktop + mobile viewport
5. Contrast spot-check on primary text, muted text, inactive controls, focus ring

## Visual Acceptance Checklist (Pass/Fail)
1. Header controls show one clear primary action.
2. Placeholder and helper text are readable at normal zoom.
3. Settings modal sections scan clearly without crowding.
4. Board and keyboard maintain clear separation and state legibility.
5. No clipped controls or overlap at common breakpoints.
6. Deep-dive page only shows relevant controls for that mode.

## Release Policy
1. Premium remains opt-in until all slices pass checklist.
2. Classic default can only change after explicit sign-off.
3. Any regression triggers immediate fallback to Classic default.
4. Build badge must clearly indicate `LOCAL`, `PREVIEW`, or `LIVE`.

## File Scope for Premium v1 Work
Primary:
- `/Users/robertwilliamknaus/Desktop/WordQuest/style/premium-theme.css`
- `/Users/robertwilliamknaus/Desktop/WordQuest/style/components.css`
- `/Users/robertwilliamknaus/Desktop/WordQuest/style/themes.css`
- `/Users/robertwilliamknaus/Desktop/WordQuest/index.html`
- `/Users/robertwilliamknaus/Desktop/WordQuest/js/app.js`

Supporting:
- `/Users/robertwilliamknaus/Desktop/WordQuest/scripts/*` (checks only)
- `/Users/robertwilliamknaus/Desktop/WordQuest/docs/*` (spec/checklists)

## Done Definition for Premium v1
Premium v1 is complete only when:
1. All slices shipped with no gameplay regressions.
2. Guardrails pass in PR and on main.
3. User sign-off confirms visual quality on live URL.
4. Classic fallback remains one-click and reliable.
