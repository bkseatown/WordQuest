# Figma Audit Scorecard

## Purpose
Use this scorecard to judge visual/product quality with the screenshot as the source of truth.

This is meant to stop vague claims like "better" or "fixed" when the rendered page still has obvious issues.

Rules:
- Judge the screenshot first, then the code.
- Score one screen and one state at a time.
- Use the canonical desktop audit viewport first: `1440x900`.
- Push only when the current slice is clearly better in the screenshot.
- If layout fit is broken, fix that before stylistic polish.

## Required Audit States
For game pages, audit these states separately:
- chooser / landing
- teacher panel open
- concealed play card
- revealed play card
- result / round end if applicable
- one dark-theme or alternate-theme state if the route supports them
- one restored-state / control-open state when shared shell, audio, or dropdown controls exist

For platform pages, audit the first visible screen at `1440x900` before anything below the fold.
For platform pages with local state or alternate lanes, also check one non-default state if it changes visible chrome.

## Scoring Categories
Score each category from `1-100`.

### 1. Layout Fit
Questions:
- Does the screen fit the target viewport at normal zoom?
- Is anything clipped or forced below the fold?
- Does the page avoid accidental scroll?

Guidance:
- `90-100`: fits cleanly with no clipping and no wasted vertical stress
- `70-89`: mostly fits, but still has awkward density or borderline crowding
- `50-69`: visible fit issues or unstable composition
- `<50`: clipped, overflowing, or structurally broken

### 2. Visual Hierarchy
Questions:
- Is there a clear owner on the screen?
- Do the most important elements win immediately?
- Is the eye led in a deliberate order?

Guidance:
- `90-100`: obvious primary owner and strong reading order
- `70-89`: mostly clear, but some competing surfaces remain
- `50-69`: eye has to work to understand what matters
- `<50`: flat or conflicting hierarchy

### 3. Component Consistency
Questions:
- Do repeated elements look like one family?
- Are cards, buttons, chips, and panels following the same system?
- Are variants controlled instead of ad hoc?

Guidance:
- `90-100`: repeated elements feel designed from one component contract
- `70-89`: mostly aligned with a few unresolved mismatches
- `50-69`: obvious variant drift
- `<50`: multiple visual systems fighting each other

### 4. Spacing Rhythm
Questions:
- Is spacing consistent and intentional?
- Are there empty slabs or cramped zones?
- Does padding support the hierarchy?

Guidance:
- `90-100`: spacing feels measured and premium
- `70-89`: generally strong with a few awkward gaps
- `50-69`: noticeable empty or cramped areas
- `<50`: spacing is distracting or unstable

### 5. Contrast and Separation
Questions:
- Are sections easy to distinguish from one another?
- Do important surfaces stand apart from the background?
- Is there enough contrast between adjacent sections and text?

Guidance:
- `90-100`: excellent readability and section separation
- `70-89`: good overall, but some surfaces still blend
- `50-69`: mono-color drift or weak boundaries remain
- `<50`: hard to read or hard to parse

### 6. Typography Quality
Questions:
- Is the type readable at a glance?
- Are sizes, weights, and line breaks intentional?
- Does the typography look premium rather than default?

Guidance:
- `90-100`: polished, confident, and highly legible
- `70-89`: strong overall with a few weak areas
- `50-69`: readable but still generic or awkward
- `<50`: inconsistent or low-clarity typography

### 7. Brand / Art Direction
Questions:
- Does the page have personality?
- Does the title, color, and ornamentation feel designed?
- Is the experience memorable without becoming noisy?

Guidance:
- `90-100`: distinct and cohesive branded identity
- `70-89`: clear direction, but still needs more signature quality
- `50-69`: serviceable but generic
- `<50`: no clear visual identity

### 8. Interaction Clarity
Questions:
- Is it obvious what is clickable?
- Are actions discoverable and unsurprising?
- Does the UI avoid redundant controls?

Guidance:
- `90-100`: interaction model is obvious and calm
- `70-89`: mostly clear with minor friction
- `50-69`: some ambiguity or redundant action patterns
- `<50`: confusing or misleading interaction model

### 9. Production Discipline
Questions:
- Is the visual behavior stable?
- Is there evidence of legacy collision or stale cached UI?
- Can the current state be trusted and built on?

Guidance:
- `90-100`: clean, stable, and ready for further polish
- `70-89`: mostly stable with some legacy residue
- `50-69`: noticeable fragility or conflict
- `<50`: too unstable to polish safely

## Overall Readiness
Average the category scores for an overall score.

Interpretation:
- `90-100`: premium / flagship-ready
- `80-89`: strong product quality with limited remaining polish
- `70-79`: meaningfully improved but still not premium-finished
- `60-69`: mid-repair; real progress but unresolved issues remain
- `<60`: structurally or visually unstable

## Required Written Output Per Pass
Every visual pass should include:
- the screenshot path
- the viewport used
- whether the page fits without clipping
- the score by category
- a blunt list of what is still wrong
- the next single highest-value pass

## Shared-Shell Regression Trap
The March 15 audit proved a major failure mode:
- a route can look acceptable in one default state and still be broken across the actual product matrix
- this happened with:
  - the gallery floating music strip
  - stale restored subject state
  - dark `forest` / `seahawks` readability collapse
  - `Build the Word` falling into placeholder content and hidden play artifacts

So for any shared shell or theme pass, the minimum required matrix is:
- gallery default
- gallery dark/forest
- one chooser route
- one live clue/card route
- one builder route

If that matrix is not checked, do not give a production-discipline score above `70`.

## Current Local Baseline: March 15 Stabilized Pack
Reference screenshots:
- `/Users/robertwilliamknaus/Desktop/Cornerstone MTSS/output/index-audit-r3.png`
- `/Users/robertwilliamknaus/Desktop/Cornerstone MTSS/output/hub-audit-r3.png`
- `/Users/robertwilliamknaus/Desktop/Cornerstone MTSS/output/hub-detail-audit-r3.png`
- `/Users/robertwilliamknaus/Desktop/Cornerstone MTSS/output/student-audit-r3.png`
- `/Users/robertwilliamknaus/Desktop/Cornerstone MTSS/output/reports-audit-r4.png`
- `/Users/robertwilliamknaus/Desktop/Cornerstone MTSS/output/gallery-audit-r3.png`
- `/Users/robertwilliamknaus/Desktop/Cornerstone MTSS/output/offlimits-audit-r3.png`
- `/Users/robertwilliamknaus/Desktop/Cornerstone MTSS/output/buildword-audit-r3.png`
- `/Users/robertwilliamknaus/Desktop/Cornerstone MTSS/output/buildword-fix11.png`

Current screen truths:
- `Student Profile` now fits honestly and is one of the stronger teacher-facing screens.
- `Specialist Hub` overview and class detail both fit honestly and now carry more trustworthy support language.
- `Reports` is structurally strong, but still has too many secondary controls competing with the output work.
- `Game Gallery` is stabilized and readable again, but still not at premium art-direction level.
- `Build the Word` is no longer in prototype collapse; its actual assembly area and tile tray are visible again, but it still needs a premium surface pass.

Current approximate readiness reads from the stabilized pack:
- Landing: `76`
- Specialist Hub overview: `82`
- Specialist Hub class detail: `86`
- Student profile: `85`
- Reports & Prep: `81`
- Gallery: `78`
- Off Limits chooser: `86`
- Build the Word: `72`

## Current Baseline Example: Off Limits Chooser
Reference screenshot:
- `/tmp/offlimits-reset4-1440x900.png`

Current scores:
- Layout Fit: `88`
- Visual Hierarchy: `72`
- Component Consistency: `76`
- Spacing Rhythm: `74`
- Contrast and Separation: `79`
- Typography Quality: `71`
- Brand / Art Direction: `66`
- Interaction Clarity: `84`
- Production Discipline: `68`

Current overall readiness:
- `76 / 100`

Interpretation:
- Meaningfully improved
- Structurally stable enough to continue
- Not yet at premium Figma-level quality

Current main issues:
- top hero row still feels generic
- title lockup still needs stronger branded resolution
- outer cards still feel slightly denser than middle cards
- chooser is stable now, but not yet special
