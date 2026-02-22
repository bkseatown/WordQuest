# HUD Acceptance Checklist

## Objective Gates (Must Pass)
- `npm run hud:check` exits with code 0.
- No JS-injected inline style attributes for HUD surfaces (`#wq-theme-nav`, `#wq-teacher-tools`).
- Every theme in `js/theme-registry.js` has a matching `[data-theme="..."]` block with required tokens.
- Every theme satisfies page background brightness floors (no near-black page backgrounds).
- Every theme satisfies token contrast floors:
  - `--key-text` on `--key-bg` >= 4.5
  - `--brand-text` on `--brand` >= 4.5
- No duplicate canonical base selector blocks for owned HUD surfaces in `style/components.css`.
- `#s-theme` is registry-driven (rendered at runtime, not static option list).

## Functional QA
- Theme select changes `data-theme` immediately and persists across reload.
- Theme arrows (`◀/▶`) cycle through all registry themes and keep label/select synchronized.
- Invalid stored theme falls back to canonical default.
- Settings panel opens/closes without breaking layout.
- Teacher word input:
  - Valid list activates and shows active status.
  - Clear resets pool and status.
  - Invalid input shows validation message.

## Gameplay Non-Regression QA
- New game starts and board renders correctly.
- Physical and on-screen keyboard still enter letters.
- Enter submits guess, backspace deletes, row reveal works.
- Keyboard state colors update correctly.
- Win/loss modal still appears with expected controls.

## Responsive QA
- Mobile portrait: no clipped keyboard rows.
- Tablet: board + keyboard remain centered and usable.
- Desktop: settings panel and HUD controls align cleanly.

## Accessibility Sanity
- Focus states visible on key buttons and settings controls.
- Contrast readable in default, dark, and one sports/inspired theme.
- Existing IDs/ARIA labels used by controls remain unchanged.
