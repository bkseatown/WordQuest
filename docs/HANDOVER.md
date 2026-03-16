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

## 3) March 13-15, 2026 Baseline
Recently completed work:
- homepage cards are more premium and no longer read like generic placeholder boxes
- workspace card has a stronger briefing surface instead of a flat empty panel
- homepage games panel was simplified:
  - Typing Quest was removed from the homepage showcase
  - homepage now highlights Word Quest and Off Limits instead of trying to preview too many products at once
  - game-panel copy is shorter and less confusing
- homepage hero was tightened:
  - left hero content no longer floats inside a large empty box
  - hero reads more like one balanced surface
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
- Specialist Hub was materially refocused:
  - left rail remains the day schedule
  - center column no longer repeats routine schedule blocks in a coaching tone
  - center column now behaves more like a day-change / announcements / rotating-schedule surface
  - right rail remains the class lesson map and now includes objective + SWBAT + support load
  - clicking the left schedule or the right class lesson map opens the same class detail flow
  - class detail now includes a real lesson-sequence control with previous / next lesson movement and a set-position control for supported curricula
- Reports & Prep was made lighter:
  - reports landing is more clearly a launch surface
  - Meeting Prep now opens as a calmer summary-first surface instead of a settings slab
- Student profile first screen was tightened:
  - key support cues appear earlier
  - hero wastes less space
  - still not at flagship quality
- March 15 stabilization corrected a real shared-shell regression:
  - the gallery no longer shows the full-width translucent floating music strip
  - stale gallery subject restore no longer forces `Intervention` when there is no intervention context
  - dark `forest` / `seahawks` chooser and play surfaces are readable again
  - `Build the Word` no longer falls into placeholder/prototype content when valid morphology rows exist
  - `Build the Word` now shows the actual assembly area and word-part tray in the first viewport instead of hiding them below duplicate stage chrome
- March 15 curriculum-truth work is now live in code:
  - hub math detail uses the corrected IM Grade 4 Unit 2 Lesson 7 equivalent-fractions pairing
  - student records now use a real source-backed curriculum layer for current visible Fishtank / EL / Fundations / IM entries
  - EL should be treated as `6-8` only
  - Fishtank ELA should be treated as `K-5`
  - Fundations should be treated as Levels `K, 1, 2, 3`

Latest pushed commits from this thread:
- `42fbc93e` `Simplify homepage games showcase`
- `59e78f7d` `Tighten homepage hero balance`
- `f82f9c91` `Pull student profile support cues higher`
- `3dbf61f4` `Refine hub day overview and lesson sequence`

Latest verified local page markers from this thread:
- Typing Quest shell assets: `20260313u`
- Word Quest build badge: `20260313u`
- Word Quest stabilized asset refs:
  - `style/components.css?v=20260314c`
  - `js/app.js?v=20260314c`

Latest verified screenshot pack from the current local state:
- `/Users/robertwilliamknaus/Desktop/Cornerstone MTSS/output/index-audit-r3.png`
- `/Users/robertwilliamknaus/Desktop/Cornerstone MTSS/output/hub-audit-r3.png`
- `/Users/robertwilliamknaus/Desktop/Cornerstone MTSS/output/hub-detail-audit-r3.png`
- `/Users/robertwilliamknaus/Desktop/Cornerstone MTSS/output/student-audit-r3.png`
- `/Users/robertwilliamknaus/Desktop/Cornerstone MTSS/output/reports-audit-r4.png`
- `/Users/robertwilliamknaus/Desktop/Cornerstone MTSS/output/gallery-audit-r3.png`
- `/Users/robertwilliamknaus/Desktop/Cornerstone MTSS/output/offlimits-audit-r3.png`
- `/Users/robertwilliamknaus/Desktop/Cornerstone MTSS/output/buildword-audit-r3.png`
- `/Users/robertwilliamknaus/Desktop/Cornerstone MTSS/output/buildword-fix11.png`
- `/Users/robertwilliamknaus/Desktop/Cornerstone MTSS/output/buildword-fix11-forest.png`

## 4) What Still Needs Work
Highest-priority unresolved quality areas:

### Typing Quest
- still needs a stronger visual/product identity
- should feel like a premium typing product, not a cleaned-up dashboard/course document
- needs more “showing” and less instructional text
- course map styling is better structurally, but still visually generic
- homepage no longer needs to preview Typing Quest until the product itself is stronger

### Homepage top surface
- hero is meaningfully better than before, but still not a flagship surface
- keep reducing empty-feeling space and generic white-box energy
- avoid slogan copy and “sales page” tone

### Shared game family
- must feel like one product family without becoming one repeated layout
- each game needs a dominant play artifact and its own personality

### Specialist Hub
- major progress, but still not finished
- center column should stay focused on:
  - announcements
  - rotating schedule / cycle-day information
  - notable events that affect coverage, pacing, pull-out, or access
- avoid repeating the left rail schedule in the center
- class detail still needs to move closer to “walk in with a game plan”
- differentiation, flexible grouping, and support planning need to become clearer and faster to scan

### Lesson alignment trust
- one of the highest-risk product areas for teacher adoption
- there is now real curriculum and lesson-navigation structure for:
  - Illustrative Math
  - Fishtank
  - UFLI / Fundations-adjacent support
  - IS Word Study
- but do not overclaim trust yet
- some objective / SWBAT / lesson mapping still depends on local lesson-context data and heuristics
- before broad teacher rollout, strengthen the underlying lesson-alignment pipeline so:
  - grade
  - curriculum
  - unit
  - lesson
  - objective
  - SWBAT
  are reliably aligned and easy to correct when a class is ahead or behind

### Shared shell / theme system
- this is the highest-risk system area for regressions
- the March 15 audit proved that a route can look fine in one default state and still be broken across:
  - dark theme
  - music controls visible
  - dropdown open
  - restored local state
  - alternate live game routes
- do not call a shared-shell pass complete until the following are screenshot-checked:
  - gallery default
  - gallery dark/forest
  - Off Limits chooser
  - one live clue/card route
  - one builder route (`Build the Word`)
- `Build the Word` is now functionally repaired, but it still is not flagship-quality yet
- the current route is trustworthy enough to continue from; it is no longer in prototype collapse

### Reports / Workroom
- still one of the strongest teacher-facing routes
- the visible `Pilot Evaluation` section has now been hidden again because it was legacy/pilot chrome leaking into the live first screen
- reports still has too many small actions and older support rails competing with the main output engine
- next reports pass should be subtraction-first, not feature-first

## 5) Critical Product Rules

### Global rules
- Non-scrolling first-screen behavior is the default on normal desktop/laptop viewports.
- If a page needs scroll at typical laptop height, first assume the page is over-packed.
- Prefer showing over telling.
- Remove stale text before adding new text.
- Avoid sales language, slogans, and pitch-deck style sections.
- Pages should feel cognitively and visually light.
- The first screen should help the user know where to go within 2 to 5 seconds.
- Deeper detail should appear after clicking into a class, student, report, or tool.
- Every page should feel like it reduces teacher burden, not increases reading work.
- Add color and section contrast intentionally:
  - avoid giant white slabs
  - avoid mono-color zones with weak separation
  - use visual ownership so the eye knows what matters first
- Strong contrast must exist between:
  - page shell
  - card/surface
  - inset play/work scene
  - primary vs secondary information
- if a parent card and child card start blending into one low-contrast slab, treat that as a real failure even if text remains technically readable
- if a floating bar / overlay interrupts the main work surface, remove or contain it before polishing typography
- if a page is only “fixed” because content is hidden below a clipped internal surface, it is not fixed

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
- The product-facing name is now `Off Limits`.
- Keep the chooser focused on real card examples, minimal text, whole-card click behavior, and premium card anatomy.

### Specialist Hub rules
- Left rail = schedule.
- Center = only what changes the day, not a second schedule.
- Right rail = class lesson map with objective + SWBAT + support load.
- Clicking either side should open the same class-detail workflow.
- Class detail should answer:
  - what is being taught
  - which caseload students are in the room
  - what quick differentiation / small-group move to make
  - what to do if the class is on a different lesson today
- Rotating schedule patterns like Red / Blue / White Day 1/2 must be treated as first-class schedule information when present.

### Reports rules
- output surfaces should lead with:
  - what is ready
  - what is missing
  - what can be sent today
- remove pilot / meta-evaluation UI from the live first screen unless explicitly working on evaluation tooling
- the page should feel like a report engine, not a settings launcher

### Shared shell rules
- one route passing in one theme is not enough evidence
- every shell-level pass must be checked in at least:
  - default theme
  - one dark theme
  - one alternate interactive state (dropdown open, audio visible, chooser open, etc.)
- stale restored state is a product bug, not just a local annoyance
- builder routes must show the actual playable artifact in the first screen, not just surrounding shell chrome

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
- `/Users/robertwilliamknaus/Desktop/Cornerstone MTSS/games/content/game-content-registry.js`
- `/Users/robertwilliamknaus/Desktop/Cornerstone MTSS/games/content/game-content-generator.js`

### Homepage and dashboard shell
- `/Users/robertwilliamknaus/Desktop/Cornerstone MTSS/index.html`
- `/Users/robertwilliamknaus/Desktop/Cornerstone MTSS/home-v3.css`

### Specialist Hub
- `/Users/robertwilliamknaus/Desktop/Cornerstone MTSS/teacher-hub-v2.html`
- `/Users/robertwilliamknaus/Desktop/Cornerstone MTSS/teacher-hub-v2.js`
- `/Users/robertwilliamknaus/Desktop/Cornerstone MTSS/teacher-hub-v2.css`

### Reports / Workroom
- `/Users/robertwilliamknaus/Desktop/Cornerstone MTSS/reports.html`
- `/Users/robertwilliamknaus/Desktop/Cornerstone MTSS/teacher-dashboard.css`
- `/Users/robertwilliamknaus/Desktop/Cornerstone MTSS/teacher-dashboard.js`
- `/Users/robertwilliamknaus/Desktop/Cornerstone MTSS/js/dashboard/dashboard-meeting.js`

### Student profile
- `/Users/robertwilliamknaus/Desktop/Cornerstone MTSS/student-profile.html`
- `/Users/robertwilliamknaus/Desktop/Cornerstone MTSS/student-profile.js`
- `/Users/robertwilliamknaus/Desktop/Cornerstone MTSS/student-profile.css`

### Curriculum truth layer
- `/Users/robertwilliamknaus/Desktop/Cornerstone MTSS/js/curriculum-truth.js`
- `/Users/robertwilliamknaus/Desktop/Cornerstone MTSS/js/lesson-brief-panel.js`
- `/Users/robertwilliamknaus/Desktop/Cornerstone MTSS/js/teacher-context/lesson-context-deriver.js`

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

### Hub workflow trust
Known risk pattern:
- URL / state changes without the visible class-detail surface repainting
- center column drifting back into repeated schedule language
- lesson alignment looking authoritative when it is still heuristic

Safe response:
- verify real click flows:
  - left schedule block -> class detail
  - right lesson card -> class detail
  - switching from one class detail to another repaints immediately
- verify lesson navigator appears for supported curriculum blocks
- describe lesson-alignment trust honestly; do not overstate it

## 8) Required Verification Standard
Before claiming a page is fixed:
- syntax checks pass for touched JS
- touched page has no new console errors
- actual rendered page was inspected, not just code-read
- build/version marker is fresh enough to trust the review
- if the issue was visual overlap or layout drift, confirm that with a real rendered snapshot
- screenshot must be scrutinized critically, not defensively
- reject regressions even if the code change seemed directionally good
- when a screenshot still looks wrong, say so plainly
- do not claim “fixed” or “materially better” unless the screenshot truly supports that claim

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
- joyful, confidence-building interaction design for teachers and students
- support surfaces that feel like they do heavy lifting for overloaded specialists
- premium, cutting-edge but academically credible game design and CSS craft
- interfaces that feel Figma-level intentional, not assembled from leftovers
- visuals and motion that make the platform feel alive without becoming noisy

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
1. Strengthen lesson-alignment trust:
   - improve mapping for grade, curriculum, unit, lesson, objective, and SWBAT
   - prioritize IM, Fishtank, Fundations / Just Words / UFLI-adjacent support
   - make the class-detail lesson navigator reliable enough for real teacher correction
2. Specialist Hub class-detail “game plan” pass:
   - surface differentiation, small-group moves, and flexible grouping more clearly
   - keep the class-detail usable in seconds
3. Student profile first-screen pass:
   - reduce leftover chrome and text weight
   - bring the support story and next actions even higher
4. Reports / teacher workroom refinement:
   - keep landing surfaces light
   - let deeper complexity appear only after intent is clear
5. Word Quest flagship polish pass from the stable baseline
6. Off Limits flagship runtime pass:
   - preserve chooser
   - continue improving the post-selection card experience
7. Cross-platform consistency / contrast audit after the above are stronger

## 11.5) Figma Audit Rule
Visual work must now use the scorecard in:
- `/Users/robertwilliamknaus/Desktop/Cornerstone MTSS/docs/FIGMA_AUDIT_SCORECARD.md`

Required process:
- one screen/state at a time
- canonical desktop audit viewport first: `1440x900`
- screenshot is the source of truth
- no claiming a pass is fixed unless the screenshot supports it
- include category scores and a blunt list of what is still wrong
- use a Figma eye:
  - stronger composition
  - clearer visual ownership
  - better section contrast
  - fewer repeated words
  - fewer placeholder-feeling boxes
  - more showing through cards, artifacts, illustrations, progress surfaces, and useful visual summaries
- if the screenshot reads as visually heavy, cognitively noisy, generic, or redundant, it is not ready

## 12) Product Recommendation
What to do next:
- strengthen the core support-teacher workflow surfaces first:
  - hub
  - class detail
  - student profile
  - reports / workroom
- then keep polishing flagship games from stable baselines
- prefer screenshot-validated micro-passes over broad restyles

What to do ultimately:
- unify the platform around one premium shell language
- then make each flagship game feel intentionally different inside that system
- the platform will shine most when:
  - homepage/hub/reports feel leadership-ready
  - Word Quest feels like the polished fluency flagship
  - Off Limits feels like the polished speaking/small-group flagship
  - the support-teacher workflow feels like it reduces workload, clarifies next moves, and creates calm confidence instead of extra admin burden
