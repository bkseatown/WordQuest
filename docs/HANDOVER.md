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

## 3) March 13, 2026 Baseline
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

Latest pushed cleanup commit from this thread:
- `7d8fe9cf`

Latest verified local page markers from this thread:
- Typing Quest shell assets: `20260313u`
- Word Quest build badge: `20260313u`

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

### Typing Quest rules
- One welcome owner only.
- Do not allow overlapping hero + starter rail + placement stack combinations.
- Full course catalog belongs below the fold or behind a collapsed control.
- Theme/customization chrome must not dominate the course screen.

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
- `/Users/robertwilliamknaus/Desktop/Cornerstone MTSS/docs/REGRESSION_GUARDRAILS.md`
- `/Users/robertwilliamknaus/Desktop/Cornerstone MTSS/docs/PLATFORM_DESIGN_SYSTEM.md`
- `/Users/robertwilliamknaus/Desktop/Cornerstone MTSS/docs/PLATFORM_LAYOUT_OWNERS.md`
- `/Users/robertwilliamknaus/Desktop/Cornerstone MTSS/docs/PLATFORM_EXCELLENCE_PLAYBOOK.md`
- `/Users/robertwilliamknaus/Desktop/Cornerstone MTSS/progress.md`

## 11) Next Best Moves
1. Typing Quest premium identity pass
2. Homepage top-surface unification and contrast pass
3. Cross-game interaction polish pass
4. Continue reducing text and duplicate UI where possible
