# Cornerstone MTSS Handover

## 1) Product Intention
Cornerstone MTSS is a specialist-facing instructional support platform.
It is not just one word game anymore.

The platform is being built to support:
- intervention teachers
- EAL/support teachers
- specialists managing student plans, goals, and progress
- classroom-ready literacy/language practice through premium interactive games

The desired product feel is:
- premium but calm
- academically credible
- visually alive without becoming noisy
- accessible, readable, EAL-friendly, and adaptable
- strong enough for K-8 and still respectable for older learners

Primary product vision:
- `/Users/robertwilliamknaus/Desktop/Cornerstone MTSS/VISION.md`

## 2) What Exists Now
The current platform includes these primary surfaces:
- `/index.html` as the landing/dashboard shell
- `/student-profile.html` as the student detail route
- `/reports.html` as the reports route
- `/game-platform.html` as the shared game gallery + play shell
- `/typing-quest.html` as the dedicated Typing Quest route
- `/word-quest.html` as the standalone flagship game

The product direction is now explicitly platform-first:
- shared game shell with distinct game identities
- specialist-facing dashboard surfaces
- local-first behavior and durable build/version visibility

## 3) March 13-14, 2026 Baseline
Recently completed work:
- homepage cards are more premium and no longer read like generic placeholder boxes
- workspace card has a stronger briefing surface instead of a flat empty panel
- Word Quest standalone was cleaned up substantially:
  - header hierarchy improved
  - keyboard/board fit stabilized
  - noisy translucent overlay boxes removed
  - coach text shortened
  - build/version markers aligned again
- shared game shell has been pushed toward one premium product family instead of several legacy-feeling pages
- Typing Quest has had the most important structural cleanup:
  - duplicate welcome-owner UI removed
  - first screen is now one welcome surface plus a collapsed course plan
  - first screen fits as a non-scrolling page locally at audited desktop size
  - page is cleaner, but still not at the final quality bar
- Word Clue was rebuilt into a real two-step flow:
  - landing page acts as a clean format chooser
  - play page is a separate focused clue stage
  - the landing page shown in the validated screenshot is the correct chooser and should be preserved as the baseline
  - after selecting a format, the runtime should open as one single-style game page for that format only
  - shared teacher controls were simplified, but the runtime still needs one stronger flagship composition pass
- Word Quest was re-stabilized after an overreaching runtime experiment:
  - live `Solve plan` / `Ava` ribbon is now hidden again
  - spelling/listening support row is hidden again on the play surface
  - keyboard fits fully in the viewport again on the validated desktop route
  - current state is a safe baseline, not a finished flagship redesign

Latest pushed cleanup commit from this thread:
- `7d8fe9cf`

Latest verified local page markers from this thread:
- Typing Quest shell assets: `20260313u`
- Word Quest build badge: `20260313u`
- Word Quest stabilized asset refs:
  - `style/components.css?v=20260314c`
  - `js/app.js?v=20260314c`

## 4) What Still Needs Work
Highest-priority unresolved quality areas:

### Typing Quest
- still needs a stronger visual/product identity
- should feel like a premium typing product, not a cleaned-up dashboard/course document
- needs more “showing” and less instructional text
- course map styling is better structurally, but still visually generic

### Homepage top surface
- left hero and right “Today” card still need to feel like one designed surface
- contrast hierarchy is better than before, but still not elite

### Shared game family
- must feel like one product family without becoming one repeated layout
- each game needs a dominant play artifact and its own personality

## 5) Critical Product Rules

### Global rules
- Non-scrolling first-screen behavior is the default on normal desktop/laptop viewports.
- If a page needs scroll at typical laptop height, first assume the page is over-packed.
- Prefer showing over telling.
- Remove stale text before adding new text.
- Strong contrast must exist between:
  - page shell
  - card/surface
  - inset play/work scene
  - primary vs secondary information

### Word Quest rules
- Board and keyboard remain the primary objects.
- Do not reintroduce large translucent stage boxes behind the board or keyboard.
- Keep student-safe navigation visible.
- Coach/help copy should stay short and purposeful.
- Do not add runtime support chrome until the core fit is stable and visually validated.
- If a new Word Quest idea is exploratory, isolate it first; do not mix it into shared live sizing rules mid-pass.

### Typing Quest rules
- One welcome owner only.
- Do not allow overlapping hero + starter rail + placement stack combinations.
- Full course catalog belongs below the fold or behind a collapsed control.
- Theme/customization chrome must not dominate the course screen.

### Word Clue rules
- Treat Word Clue as a locked two-step product flow:
  - first screen = format chooser
  - second screen = one single-style runtime for the selected format
- The format chooser screenshot validated by the user is the correct landing-page design.
- Do not redesign or collapse the chooser back into the runtime page.
- The post-selection runtime must be a portrait-style Taboo card, not a wide board/stage layout.
- Reduce top and bottom chrome aggressively on the runtime page.
- The card must be the visual owner after format selection.
- Avoid reintroducing bulky framing above the card or heavy footer bars below it.
- If a Word Clue pass makes the runtime feel wider, flatter, or more crowded, revert to the previous validated baseline before trying again.

## 6) Critical File Ownership

### Standalone Word Quest
- `/Users/robertwilliamknaus/Desktop/Cornerstone MTSS/word-quest.html`
- `/Users/robertwilliamknaus/Desktop/Cornerstone MTSS/js/app.js`
- `/Users/robertwilliamknaus/Desktop/Cornerstone MTSS/style/components.css`
- `/Users/robertwilliamknaus/Desktop/Cornerstone MTSS/style/themes.css`

### Shared game platform
- `/Users/robertwilliamknaus/Desktop/Cornerstone MTSS/game-platform.html`
- `/Users/robertwilliamknaus/Desktop/Cornerstone MTSS/typing-quest.html`
- `/Users/robertwilliamknaus/Desktop/Cornerstone MTSS/games/ui/game-shell.js`
- `/Users/robertwilliamknaus/Desktop/Cornerstone MTSS/games/ui/game-shell.css`

### Homepage and dashboard shell
- `/Users/robertwilliamknaus/Desktop/Cornerstone MTSS/index.html`
- `/Users/robertwilliamknaus/Desktop/Cornerstone MTSS/home-v3.css`

### Build/version truth
- `/Users/robertwilliamknaus/Desktop/Cornerstone MTSS/build.json`
- `/Users/robertwilliamknaus/Desktop/Cornerstone MTSS/build-stamp.js`
- `/Users/robertwilliamknaus/Desktop/Cornerstone MTSS/js/build-stamp.js`
- `/Users/robertwilliamknaus/Desktop/Cornerstone MTSS/js/build-badge.js`

## 7) Regression Hotspots

### Typing Quest
Known risk pattern:
- multiple generations of welcome/course CSS and markup coexisting

Symptoms:
- overlapping panels
- giant translucent blocks
- document-like first screen
- duplicate call-to-action ownership

Safe response:
- delete the older owner instead of layering another fix on top

### Word Quest
Known risk pattern:
- decorative overlays and support wrappers making the page feel broken or busy

Symptoms:
- translucent boxes behind main objects
- keyboard tray chrome that does not help play
- long coach ribbons that clutter the page

Safe response:
- simplify first
- shorten text
- keep board and keyboard central
- if runtime fit breaks, restore the last stable baseline before trying new interaction ideas

### Cache/build drift
Known risk pattern:
- reviewer is looking at stale assets and thinks the code is unchanged

Safe response:
- verify cache-busted asset URLs
- verify visible build badge/build stamp
- verify `build.json`

## 8) Required Verification Standard
Before claiming a page is fixed:
- syntax checks pass for touched JS
- touched page has no new console errors
- actual rendered page was inspected, not just code-read
- build/version marker is fresh enough to trust the review
- if the issue was visual overlap or layout drift, confirm that with a real rendered snapshot

## 9) Current Quality Bar
The platform should aim beyond “working.”

Target qualities:
- premium visual craft
- strong typography and contrast discipline
- EAL-friendly scaffolds
- game-specific identity
- minimal UI clutter
- stable layout ownership
- modern, resilient front-end architecture

Useful advanced practices to keep pushing:
- token-first design systems
- route-scoped layout owners
- deterministic UI verification where possible
- explicit build/version instrumentation
- compact, high-signal UI copy
- visual-first onboarding states instead of text-heavy instructions

## 10) Codex Context Limitation
A new Codex thread in the same worktree should not be assumed to know prior conversation history.
That includes archived chats.

Treat these files as the durable project memory:
- `/Users/robertwilliamknaus/Desktop/Cornerstone MTSS/README.md`
- `/Users/robertwilliamknaus/Desktop/Cornerstone MTSS/docs/HANDOVER.md`
- `/Users/robertwilliamknaus/Desktop/Cornerstone MTSS/docs/AGENT_CONTINUITY.md`
- `/Users/robertwilliamknaus/Desktop/Cornerstone MTSS/docs/FIGMA_AUDIT_SCORECARD.md`
- `/Users/robertwilliamknaus/Desktop/Cornerstone MTSS/docs/REGRESSION_GUARDRAILS.md`
- `/Users/robertwilliamknaus/Desktop/Cornerstone MTSS/docs/PLATFORM_DESIGN_SYSTEM.md`
- `/Users/robertwilliamknaus/Desktop/Cornerstone MTSS/docs/PLATFORM_MASTER_REDESIGN_BRIEF.md`
- `/Users/robertwilliamknaus/Desktop/Cornerstone MTSS/docs/PLATFORM_VISUAL_SPEC_V1.md`
- `/Users/robertwilliamknaus/Desktop/Cornerstone MTSS/docs/PLATFORM_LAYOUT_OWNERS.md`
- `/Users/robertwilliamknaus/Desktop/Cornerstone MTSS/docs/PLATFORM_EXCELLENCE_PLAYBOOK.md`
- `/Users/robertwilliamknaus/Desktop/Cornerstone MTSS/progress.md`

## 11) Next Best Moves
1. Word Quest controlled polish pass from the new stable baseline:
   - slightly smaller board
   - slightly larger keys/letters
   - verify at MacBook size after each single change
2. Word Clue flagship runtime composition pass:
   - preserve the current chooser landing page exactly
   - after format selection, move toward a portrait-style single-card Taboo runtime
   - reduce runtime chrome above and below the card
   - keep one dominant clue artifact, not a wide board-like stage
3. Typing Quest premium identity pass
4. Homepage top-surface unification and contrast pass
5. Cross-game interaction polish pass

## 11.5) Figma Audit Rule
Visual work must now use the scorecard in:
- `/Users/robertwilliamknaus/Desktop/Cornerstone MTSS/docs/FIGMA_AUDIT_SCORECARD.md`

Required process:
- one screen/state at a time
- canonical desktop audit viewport first: `1440x900`
- screenshot is the source of truth
- no claiming a pass is fixed unless the screenshot supports it
- include category scores and a blunt list of what is still wrong

## 12) Product Recommendation
What to do next:
- finish one flagship game runtime at a time from a stable baseline, starting with Word Quest or Word Clue
- prefer screenshot-validated micro-passes over broad restyles

What to do ultimately:
- unify the platform around one premium shell language
- then make each flagship game feel intentionally different inside that system
- the platform will shine most when:
  - homepage/hub/reports feel leadership-ready
  - Word Quest feels like the polished fluency flagship
  - Word Clue feels like the polished speaking/small-group flagship
  - Typing Quest feels like the polished skills-course flagship
