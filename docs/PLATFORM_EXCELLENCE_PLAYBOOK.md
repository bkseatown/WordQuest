# Platform Excellence Playbook

This document defines the quality bar for future engineering, design, and game work in Cornerstone MTSS.

It is intended for:
- future Codex threads
- external AI contributors
- human collaborators

It should be read together with:
- `/Users/robertwilliamknaus/Desktop/Cornerstone MTSS/docs/HANDOVER.md`
- `/Users/robertwilliamknaus/Desktop/Cornerstone MTSS/docs/PLATFORM_DESIGN_SYSTEM.md`
- `/Users/robertwilliamknaus/Desktop/Cornerstone MTSS/docs/PLATFORM_LAYOUT_OWNERS.md`
- `/Users/robertwilliamknaus/Desktop/Cornerstone MTSS/docs/REGRESSION_GUARDRAILS.md`

## 1) Product Standard
Cornerstone MTSS should aim for best-in-class quality, not “functional school software.”

That means:
- premium visual design
- expert information hierarchy
- game feel with personality
- strong readability
- safe, adaptive support
- durable engineering with clear ownership

The target experience is:
- smart
- intentional
- visually alive
- calm enough for learning
- polished enough to compete with elite consumer products

## 2) Design Philosophy

### Premium, not sterile
Avoid:
- generic SaaS dashboard sameness
- flat cards with weak hierarchy
- endless pale boxes with no focal point

Favor:
- clearly dominant surfaces
- strong scene framing
- purposeful depth
- expressive but controlled typography
- clean rhythm and spacing

### Show, don’t explain
If a screen is carrying too much copy:
- cut copy first
- replace with a better preview artifact
- only add more text if clarity is still missing

Examples:
- Typing Quest should show a typing lane and key relationship.
- Word Quest should show the puzzle board as the star.
- Homepage cards should preview the activity, not describe it abstractly.

### One dominant artifact per surface
Every page or game state should have one unmistakable focal object.

Examples:
- Word Quest: board + keyboard stack
- Typing Quest: typing lane + lesson start
- Word Clue: clue card
- Sentence Builder: sentence assembly strip
- Error Detective: case file/evidence panel

If everything is equally prominent, the design has failed.

## 3) Advanced CSS Standards

### Token-first styling
Prefer tokens over one-off values.
Add or refine tokens before introducing repeated raw values.

Priorities:
- surface tokens
- reading/ink tokens
- spacing scale
- radius scale
- elevation scale
- motion scale

### Clear ownership
Every route family should have one layout owner.

Use:
- `/Users/robertwilliamknaus/Desktop/Cornerstone MTSS/home-v3.css` for homepage
- `/Users/robertwilliamknaus/Desktop/Cornerstone MTSS/style/components.css` for standalone Word Quest
- `/Users/robertwilliamknaus/Desktop/Cornerstone MTSS/games/ui/game-shell.css` for shared game platform routes

Do not:
- patch layout in multiple places unless neutralizing legacy behavior
- leave duplicate route-specific systems active
- pile on `!important` without deleting the older owner

### Modern CSS that is worth using
Strong candidates:
- CSS custom properties for local component tuning
- `clamp()` for typography and spacing
- layered gradients and subtle atmospheric backgrounds
- `color-mix()` where already supported in the codebase and it improves maintainability
- grid/flex compositions with explicit ownership
- `:has()` only when it removes extra JS and is safe for current support needs
- container-like thinking, even if not every route literally uses container queries yet

Use carefully:
- glassmorphism or translucent effects
- large shadows
- decorative pseudo-elements

These should support hierarchy, not create clutter.

## 4) Typography And Readability Standards

### Readability wins over novelty
Fonts, color, and layout should never compromise reading clarity.

Rules:
- body text needs strong contrast
- helper text must remain readable, not decorative
- headings can be expressive, but not at the expense of scanning
- avoid weak light-gray text on tinted cards

### Type hierarchy must be fast to scan
Every surface should separate:
- heading
- support line
- metadata
- action

If the eye cannot identify those roles quickly, the typography needs revision.

### Reduce conflicting font roles
Use:
- one clear heading voice
- one clear reading/body voice
- one restrained meta/label voice

Avoid:
- too many competing display styles
- decorative labels on every element
- excessive uppercase noise

## 5) Game Design Standards

### Each game must feel distinct
Shared platform quality is good.
Shared sameness is not.

Every game needs:
- one unique central object
- one unique pacing pattern
- one unique support model
- one unique success/failure feel

### Fun should come from feedback, not clutter
Use:
- meaningful success pulses
- satisfying locked-in states
- stronger reveal moments
- clear motion tied to state change

Avoid:
- random decorative movement
- too many simultaneous highlights
- motion that distracts from reading or decision-making

### State personality matters
All major states should feel designed:
- empty
- loading
- ready
- active
- success
- mistake
- next-step

This is especially important in educational products because motivation often comes from how the state transition feels.

## 6) Adaptive And EAL-Friendly Standards

The platform should support different learners without feeling watered down.

### Good scaffolding
Good scaffolding:
- gives the next helpful cue
- reduces ambiguity
- can fade as mastery improves
- does not flood the screen with explanation

### Support options should be layered
Use progressive support:
1. visual cue
2. short hint
3. stronger support
4. full intervention support

Do not put all support on screen at once.

### EAL-friendly design principles
- plain-language instructions
- visual pairing where possible
- predictable icons and actions
- short, concrete labels
- support for audio and repeated exposure
- avoid idiomatic teacher-only wording on student surfaces

## 7) No-Scroll-By-Default Standard

At normal laptop/desktop sizes, major entry screens should fit without document scroll unless there is a strong reason not to.

If a page scrolls:
- assume too much content is visible at once
- assume the page is over-explaining
- assume a secondary section should be collapsed or deferred

Scrolling is acceptable when:
- the viewport is unusually short/small
- the user intentionally opens a deeper section
- a long reference/workspace view is genuinely helpful

Scrolling should not be the default answer to weak hierarchy.

## 8) Verification Standards

### Code checks are not enough
For premium UI work, do not stop at syntax passes.

Minimum:
- syntax checks for touched JS
- real route render
- console check
- layout check at normal desktop viewport
- build/version freshness check

### Use visual verification
When layout or polish is the issue:
- inspect the actual rendered page
- use screenshots or accessibility snapshots
- compare the result against the stated intent

If a visible issue remains, the work is not done.

### Trust the page, not the theory
If the screenshot looks wrong, the implementation is wrong even if the code seems elegant.

## 9) Engineering Standards For Future Work

### Prefer deletion over patch layering
If a page is fighting itself:
- remove old code
- reduce owners
- simplify state paths

This repo has repeatedly shown that layered fixes often create new regressions later.

### Preserve safety instrumentation
Keep:
- `build.json`
- build stamp files
- build badge
- route-specific cache-busting discipline

These are not optional polish. They are part of verification.

### Modern patterns worth pursuing
Depending on the module, worthwhile improvements include:
- stronger componentized rendering inside the shared shell
- cleaner state derivation functions
- testable route-specific layout metrics
- deterministic screenshot/smoke loops
- more explicit UI state machines for complex game states

Avoid complexity for its own sake.
Every advanced technique should buy clarity, resilience, or quality.

## 10) What “Best Of The Best” Means Here

It does not mean:
- maximal animation
- maximal texture
- maximal feature count

It means:
- top-tier hierarchy
- top-tier clarity
- top-tier finish
- top-tier responsiveness to learner needs
- top-tier consistency without sameness

That is the standard future work should aim for.
