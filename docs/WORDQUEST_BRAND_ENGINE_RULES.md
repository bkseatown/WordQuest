# WordQuest Brand Engine Rules

These rules are engine-level guardrails for UI/UX decisions across themes, features, and future MTSS additions.

## 1) Header = High-Value Real Estate

- Keep the top band as the clearest orientation zone:
- Left: product identity (`Word•Quest`) with strong contrast.
- Right: primary controls only (theme/music/teacher/case/keyboard/settings).
- Avoid long instructional text in the top band.
- If space is tight, collapse secondary controls before reducing logo/title clarity.

## 2) 60-30-10 Color Balance

- `60%`: base canvas/surfaces (page + panel backgrounds).
- `30%`: structural secondary color (cards, rails, keyboard bodies).
- `10%`: accent for actionable highlights (CTA, active states, key affordances).
- Keep feedback semantics separate from brand accents unless contrast remains WCAG-safe.

## 3) Branding Is a System

- Theme identity must remain consistent across:
- color tokens
- typography
- iconography tone
- interaction feedback (hover/focus/pressed/selected)
- New features must consume shared tokens first, not one-off colors.

## 4) Reputation Over Messaging

- UI should prove reliability through behavior:
- predictable controls
- readable states
- stable layouts
- consistent interaction timing
- Avoid decorative changes that reduce legibility or confidence.

## 5) Words as Functional Design

- Text is not decoration; it is navigation and comprehension.
- Prioritize:
- short labels
- strong contrast
- consistent terminology
- concise action language (`Next Word`, `Use`, `Shuffle`, `Done`)

## 6) Gameplay Color Semantics Policy

- Default recommendation: keep `correct/present/absent` high-clarity semantic colors.
- Theme tinting is allowed only when:
- state meaning remains instantly distinguishable
- text contrast remains readable
- If either fails, fall back to semantic defaults.

## 7) PR Acceptance Checklist (UI)

- Header identity readable at first glance on desktop and tablet.
- Accent color use is selective (does not flood full layout).
- Controls and panel text meet readability expectations in all supported themes.
- Gameplay states remain clear independent of brand palette.
- No new component introduces off-token color hard-coding without justification.

