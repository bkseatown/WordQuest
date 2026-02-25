# Smoke Selector Contract

This document defines stable selectors used by `scripts/smoke-playwright-teacher-daily-flow.js`.

Rule:
- Runtime smoke tests should target `data-testid` selectors, not presentation classes.
- Keep IDs for app wiring/accessibility, but treat `data-testid` as the test contract.

Current runtime smoke selectors:
- `loading-screen`
- `first-run-setup-modal`
- `first-run-start-btn`
- `first-run-skip-btn`
- `teacher-panel-btn`
- `teacher-panel-close`
- `session-group-assign-target-btn`
- `new-game-btn`
- `settings-btn`
- `session-reset-btn`
- `settings-close`

When changing UI:
1. Preserve these `data-testid` values, or update both this file and smoke scripts in the same PR.
2. Prefer making non-core smoke actions optional if they are not required for the core teacher flow.
3. Keep one path through the app deterministic and low-animation for CI stability.
