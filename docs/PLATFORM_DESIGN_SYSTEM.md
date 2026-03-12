# Cornerstone MTSS Platform Design System

## Design Rationale

Cornerstone needs one product language across landing, teacher workflows, and games.
The system should feel:

- premium but calm
- classroom-friendly, not childish
- distinct from generic Bootstrap/dashboard UI
- spacious and readable at teacher distance
- restrained in motion and safe for reduced-motion users

The visual direction for the platform is:

- soft semi-3D surfaces rather than flat cards
- refined academic tone with a little playfulness
- mostly filled surfaces with selective outlines
- geometric base shapes softened by rounded corners
- abstract symbol-led accents rather than mascot-led branding

## Foundation Tokens

Defined in [/Users/robertwilliamknaus/Desktop/Cornerstone MTSS/style/tokens.css](/Users/robertwilliamknaus/Desktop/Cornerstone%20MTSS/style/tokens.css)

- Corner radius system:
  - `--radius-1` through `--radius-5`
  - `--radius-round`
- Shadow system:
  - `--shadow-soft`
  - `--shadow-medium`
  - `--shadow-strong`
  - `--shadow-stage`
- Border treatment:
  - `--border-hairline`
  - `--border-subtle-line`
  - `--border-strong-line`
  - `--border-accent-line`
- Spacing scale:
  - `--space-1` through `--space-9`
- Typography scale:
  - `--fs-0` through `--fs-9`
  - `--tracking-*`
  - `--lh-*`
- Accent glow:
  - `--accent-glow-soft`
  - `--accent-glow-strong`
- Hover behavior:
  - `--hover-lift-y`
  - `--hover-scale`
- Motion timing:
  - `--motion-fast`
  - `--motion-med`
  - `--motion-slow`
  - `--motion-ease`
  - `--ease-emphasized`
- Surface styles:
  - `--surface-card-bg`
  - `--surface-panel-bg`
  - `--surface-stage-bg`
  - `--surface-tint-*`

## Shared Component Patterns

Defined in [/Users/robertwilliamknaus/Desktop/Cornerstone MTSS/style/tokens.css](/Users/robertwilliamknaus/Desktop/Cornerstone%20MTSS/style/tokens.css) and [/Users/robertwilliamknaus/Desktop/Cornerstone MTSS/style/typography.css](/Users/robertwilliamknaus/Desktop/Cornerstone%20MTSS/style/typography.css)

- Premium surfaces:
  - `.surface-card`
  - `.surface-panel`
  - `.surface-stage`
  - `.surface-metric`
  - `.surface-modal`
- Hover and emphasis:
  - `.hover-spotlight`
  - `.interactive-press`
  - `.accent-glow`
  - `.accent-glow-strong`
- Surface tint helpers:
  - `.surface-tint-blue`
  - `.surface-tint-violet`
  - `.surface-tint-mint`
- States:
  - `.component-empty-state`
  - `.component-loading-state`
  - `.component-success-pulse`
- Type helpers:
  - `.display-hero`
  - `.display-page`
  - `.empty-state-copy`
  - `.loading-state-copy`
  - `.meta-copy`
- Button patterns:
  - `.button-premium`
  - `.button-secondary`
  - `.button-quiet`

## Animation Logic

Use motion only when it adds clarity or delight.

- Hover entry:
  - lift by a few pixels
  - slight scale only
  - soft accent glow on meaningful interactive surfaces
- Page intro:
  - prefer opacity/translate micro-intro per section, not long hero choreography
- Reveal:
  - use only for staged content and guided focus shifts
- Pressed state:
  - slight downward movement and reduced shadow
- Success feedback:
  - short pulse on the relevant surface only
- Loading:
  - subtle shimmer on dedicated loading placeholders

## Reduced Motion

Reduced-motion behavior is already wired in [/Users/robertwilliamknaus/Desktop/Cornerstone MTSS/style/tokens.css](/Users/robertwilliamknaus/Desktop/Cornerstone%20MTSS/style/tokens.css)

- `html[data-motion="reduced"]` disables animations and transitions
- `@media (prefers-reduced-motion: reduce)` reduces animation and scroll motion globally

Any future page-level motion should degrade to:

- no parallax
- no looping decorative animation
- no spatial movement beyond instant state change

## Component Guidance

### Landing hero

- one dominant CTA
- one supporting focus surface
- avoid multiple co-equal headlines

### Game card

- preview first
- title second
- short use-case line
- CTA aligned consistently

### Dashboard metric tile

- high-value number or status first
- supporting copy second
- no deep nesting

### Modal

- premium surface
- clear title and primary action
- minimal chrome

### Empty state

- explain why the area is empty
- offer one next step only

### Loading state

- shimmer only on reserved placeholders
- avoid page-wide spinners unless the entire route is blocked

## Performance and Maintainability

- Keep the system token-first. Add new page styling by consuming tokens instead of inventing one-off values.
- Prefer one authoritative layout owner per page:
  - landing: `home-v3.css`
  - Word Quest: `style/components.css`
  - game shell pages: `games/ui/game-shell.css`
- Avoid adding new inline layout CSS.
- Avoid adding `!important` unless it is neutralizing legacy behavior during cleanup.
- Reuse surface and button classes before creating new component-specific wrappers.
