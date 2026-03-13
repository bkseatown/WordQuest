Original prompt: You are improving the Cornerstone MTSS game platform UI.

- 2026-03-10: Located shared runtime in `games/ui/game-shell.js` and `games/ui/game-shell.css`; confirmed game platform uses a shared shell with game-specific surfaces.
- 2026-03-10: Plan for this pass is shell-first: increase gameplay surface, compress whitespace, add shared motion/feedback, then patch Say It Another Way, Typing Quest, Word Quest, Word Forge, and Category Rush inside existing render branches.
- 2026-03-10: Implemented shell-first gameplay UI pass in `games/ui/game-shell.js` and `games/ui/game-shell.css`: larger play surface, shared timer, Taboo card, typing lane, larger Word Quest board, forge equation, quick-entry Category Rush.
- 2026-03-10: Skill Playwright client could not launch local Chromium in this environment due MachPort sandbox permission fault; falling back to built-in browser tooling for visual QA.
- 2026-03-10: Browser QA complete on `game-platform.html` and `typing-quest.html` for word-connections, word-quest, word-typing, morphology-builder, and rapid-category. Verified 0 console errors/warnings. Confirmed Taboo mode+difficulty update, Category Rush quick entry dedupes correctly, and Typing Quest runtime shows the new lane after starting placement.

- 2026-03-10: Continued cross-page UI pass for landing, game gallery, and reports cockpit. Landing now uses compact no-scroll sizing, static game previews, and stronger action-color accents in `index.html` and `home-v3.css`.
- 2026-03-10: Updated `reports.html` and `teacher-dashboard.css` into a three-zone Teacher Cockpit with sidebar search/workspace nav, compact student support queue, and a color-coded timeline/blocks rail.
- 2026-03-10: Bumped `game-platform.html` and `typing-quest.html` asset versions to `20260310c` so shared game preview changes in `games/ui/game-components.js` and `games/ui/game-shell.css` break stale cache paths.
- 2026-03-10: Browser QA on local http server confirmed `index.html` fits in viewport with no page scroll, `game-platform.html` now shows static previews with no random Word Quest word, and `reports.html` loads the cockpit layout with no console warnings/errors.
- 2026-03-10: Fixed `typing-quest.html` boot so the page now rewrites to `play=1&game=word-typing&typingCourseMode=placement` before shell init, opening directly into the real Typing Quest placement flow instead of the gallery.
- 2026-03-10: Added Word Quest safe-upgrade layer only in `js/app.js`, `js/ui.js`, `style/components.css`, `word-quest.html`, and `word-quest-preview.js`. Core game engine in `js/game.js` remains untouched.
- 2026-03-10: Live Word Quest QA complete. Verified `js/game.js` stayed untouched, on-screen keyboard still enters guesses, existing evaluation states still return `correct/present/absent`, solved-round modal still triggers, and the new safe streak counter increments only as a cosmetic layer.
- 2026-03-11: Completed global viewport-fit layout system pass and pushed `8732a7d2` on `main` (landing, hub, gallery, stage/course sizing tokens and breakpoints).
- 2026-03-11: Naming consistency pass in progress: canonicalized game titles in `games/ui/game-shell.js` to match gallery card labels (`Word Clue`, `Build the Word`, `Clue Ladder`, `Fix the Sentence`, `Word Categories`, `Build a Sentence`) and added dynamic `document.title` sync for play vs gallery views.
- 2026-03-11: Cache-bust updated `game-platform.html` and `typing-quest.html` to load `game-shell.js?v=20260311f`; runtime guardrails pass green after change (`npm run guard:runtime`).
- 2026-03-11: Rebuilt `word-connections` play page into a dedicated Word Clue stage layout with explicit Setup/Ready/Live/Reveal states in `games/ui/game-shell.js` + scoped UI in `games/ui/game-shell.css` (no routing or engine refactor).
- 2026-03-11: Word Clue timer behavior changed to manual round control only: no timer auto-start on load, timer begins on `Begin Timer`, supports pause/resume, and stops on reveal/end.
- 2026-03-11: Updated cache-bust to `game-shell.css/js?v=20260311g` in `game-platform.html` and `typing-quest.html`; syntax check + runtime guardrails pass green.
- 2026-03-11: Card-first visual rebuild pass for Word Clue: added round-style variant strip (Standard, Picture, Draw, Challenge, Team Relay), card-variant-aware hero rendering, compact secondary setup rail, and stronger projection readability.
- 2026-03-11: Contrast pass: forced high-contrast light headings/subtitles on dark play hero bars to eliminate dark-on-purple title regressions.
- 2026-03-11: Hard-reset alternate layout pass for Word Clue (v2): replaced the in-place two-column stage with compact top utility bar + centered hero card stage + immediate action row + collapsible setup drawer.
- 2026-03-11: Word Clue v2 variants now visibly alter presentation (picture panel, draw-only cue, challenge urgency styling, relay cue), and blocked-word rendering scales with difficulty.
- 2026-03-12: Began platform-wide legacy conflict cleanup. Rebuilt landing page onto a single structural path in `index.html` + `home-v3.css`, replacing the nested `home-role-btn` dashboard stack with a three-zone welcome/dashboard shell.
- 2026-03-12: Removed a conflicting short-height Word Quest media block from `style/components.css` that was inflating tiles and keyboard after the newer viewport-budget system applied.
- 2026-03-12: Added a shared design-system foundation in `style/tokens.css` and `style/typography.css` covering radius, shadows, border treatments, spacing, typography, motion, premium surfaces, button patterns, and reduced-motion-safe state helpers.
- 2026-03-12: Added `docs/PLATFORM_DESIGN_SYSTEM.md` as the source-of-truth for visual language, component patterns, motion rules, and page ownership. Next pass should apply these classes/tokens progressively to landing, hub, gallery, and game shells instead of inventing new one-off styles.
- 2026-03-12: Moved `game-platform.html` theme-picker layout CSS into `games/ui/game-shell.css` so the CG shell owns that layout instead of page-level inline styles.
- 2026-03-12: Added `docs/PLATFORM_LAYOUT_OWNERS.md` documenting the single layout owner per page family and the guardrails for future cleanup/refinement.
- 2026-03-12: Added localhost-safe build-line behavior to `teacher-dashboard.js` to reduce direct local `build.json` fetch noise outside the shared build badge helpers.

- 2026-03-12: Tightened Word Quest protected shell again in `style/components.css` by reducing actual header chrome, row gaps, wide-key widths, and keyboard height; bumped `word-quest.html` stylesheet cache-buster to `20260312f` so live refreshes pick up the owner CSS immediately.
- 2026-03-12: Stabilized landing destination cards in `home-v3.css` by replacing flex/space-between content stacking with explicit grid rows to prevent preview/text/button overlap; bumped `index.html` cache-buster to `20260312f`.
- 2026-03-12: Reduced landing page shell shadow/height pressure in `home-v3.css` and added a localhost-safe synthetic `build.json` response in `sw-runtime.js` to remove local QA 404 noise from the service worker path.

- 2026-03-12: Neutralized older Word Quest play-layout rules earlier in `style/components.css` so the protected viewport-fit block later in the file is the single sizing authority; older play key sizes now align with the protected shell instead of fighting it.
- 2026-03-12: Removed an older duplicated viewport-fit block from `games/ui/game-shell.css`; the later hard-lock/play-shell owner remains active. Local browser sanity check shows Word Quest fit is stable, while Word Clue still reports stage/control overflow and needs a dedicated CG-shell cleanup pass next.
- 2026-03-12: Repaired Word Clue trusted-deck runtime wiring in `games/ui/game-shell.js`. The active round now shows a loading placeholder while starter decks fetch, dispatches `cs-word-clue-decks-updated` when trusted/supplemental cards land, and restarts only stale `No matching cards` / loading rounds so the live card rebinds from one trusted object.
- 2026-03-12: Bumped `game-platform.html` and `typing-quest.html` shell assets to `20260312j`. Browser QA at `1365x768` now shows Word Clue rendering a matched trusted card (`bike` with `ride / wheels / pedal`) and the prior stage/control fit warnings are gone.
- 2026-03-12: Moved Word Quest fit control into the real runtime owner in `js/app.js` instead of relying on CSS alone. The adaptive keyboard math now respects play-mode viewport budgets and safe-edge padding, reducing `--key-h`/`--gap-key` structurally. `word-quest.html` cache-bust updated to `js/app.js?v=20260312h`.
- 2026-03-12: Browser QA at `1365x768` confirms Word Quest no longer logs keyboard overflow and the keyboard rect now stays inside the viewport (`bottom: 759` on a `768`-high viewport). Landing page remains clean at `1365x768` with no preview/text/button overlap.
- 2026-03-12: Removed stale Word Clue preview-strip selectors and an older duplicate fit layer from `games/ui/game-shell.css`, leaving the later hard-lock block as the active viewport owner for CG pages. Word Clue still renders a trusted active card with no fit warnings after this cleanup.
- 2026-03-12: Fixed Typing Quest by targeting its real runtime shell (`.cg-typing-app-shell.is-runtime`, `.cg-typing-page-wrap`, `.cg-stage-board--typing`) instead of the generic `.cg-play-shell` path. The runtime now fits at `1365x768` with no `[LayoutFit][typing]` warnings, and internal scroll is limited to secondary guide/sidebar content.
- 2026-03-12: Tightened `main.cg-shell` to `box-sizing:border-box` in play mode so shell padding no longer pushes the overall game page past the viewport. Sanity check confirms Word Quest still holds its protected keyboard fit after the shared shell cleanup.
- 2026-03-12: Added a protected short-laptop clamp in `js/app.js` for Word Quest (`viewportH <= 730` in play mode). On `1280x720`, the runtime now trims tile size to `58px`, reduces keyboard spacing, and keeps the keyboard inside the viewport (`bottom: 710`) with no `[LayoutFit][word-quest]` warnings.
- 2026-03-12: Rebuilt the landing page structure in `index.html` and `home-v3.css` into a single calm welcome surface + two destination portals + a quieter utility rail. This removes the older split-hero / boxed-feature-panel rhythm and gives landing one clearer layout path.
- 2026-03-12: Landing viewport checks now pass at both `1365x768` and `1280x720` without overlap. The page still allows natural scrolling on smaller windows because the new shell uses compact breakpoint compression instead of brittle clipping rules.
- 2026-03-12: Switched Teacher Hub class clicks to URL-driven class-detail routes via ?classId=..., removed the floating Start Session/support drawer entry point, and trimmed duplicate day views so schedule/detail surfaces no longer repeat the same calendar twice.
- 2026-03-12: Rebalanced the class-detail layout so the block summary spans the page top, companion/context content no longer creates a tall narrow sidebar, and the support roster sits below as a full-width section.
- 2026-03-12: Simplified the Teacher Hub class page to the essential flow: class header, block summary, lesson/SWBAT/alignment, and clickable student support cards with profile/report links; removed the extra class actions strip and companion-heavy side content.
- 2026-03-12: Started the premium shared-game-shell uplift for weaker CG runtimes in `games/ui/game-shell.js` + `games/ui/game-shell.css`. Sentence Builder, Clue Ladder, Error Detective, and Word Categories now render with premium hero/workbench/sidebar surfaces instead of the flatter first-pass cards; `game-platform.html` and `typing-quest.html` cache-busters moved to `20260312m`.
- 2026-03-12: Continued the shared-shell uplift for `morphology-builder` and the shared-shell `word-quest` branch only. Both now use premium hero/workbench/insight-rail patterns in `games/ui/game-shell.js` + `games/ui/game-shell.css`; standalone `word-quest.html` runtime owner remains untouched. Shell cache-busters moved to `20260312n`.
- 2026-03-12: Added a CSS-only family-consistency pass across shared-shell premium games. `games/ui/game-shell.css` now aligns Typing Quest runtime/course cards and Word Clue v2 surfaces with the same rounded premium card treatment and softer chip/ribbon language used by Quest/Forge/Sentence. Shell cache-busters moved to `20260312o`.
- 2026-03-12: Began distinct per-game identity layering in `games/ui/game-shell.css` so premium games stop reading as clones. Sentence Builder now feels more editorial/tile-strip, Build the Word more like a word lab/blueprint bench, Clue Ladder more like a guided inference climb, Error Detective more case-file driven, Word Categories more game-show bursty, and shared-shell Word Quest more clue-board focused. Shell stylesheet cache-buster moved to `20260312p`.
- 2026-03-13: Started a preservation refactor on standalone `word-quest.html` instead of a replacement. Kept the existing quest finder, specialist/settings/music tools, and quick actions, but reassigned play-mode header ownership in `style/components.css` so the logo sits inside the banner again, the search/support area occupies a true center lane, and the quick actions no longer force excess top chrome. Bumped `word-quest.html` stylesheet cache-buster to `20260313a`.
- 2026-03-13: Local Playwright QA on `http://127.0.0.1:4174/word-quest.html?cb=20260313-pass2` confirmed the standalone Word Quest header height dropped from roughly 149px to 85px, the logo re-centered inside the shell, the keyboard now fits fully in-view with no `[LayoutFit][word-quest]` warnings, and on-screen keyboard input still populates the first guess row (`crane`) correctly.
- 2026-03-13: Tuned the standalone Seahawks Word Quest palette in `style/themes.css` to a slightly deeper blue-gray without making the page feel dark. Updated `word-quest.html` to `themes.css?v=20260313a`. Local QA on `http://127.0.0.1:4174/word-quest.html?cb=20260313-pass4` confirmed the new palette tokens are active, keyboard fit remains clean, and on-screen keyboard entry still works (`stone` populated the first guess row) with 0 warning-level console messages.
- 2026-03-13: Started platform-wide theme generalization in `games/ui/game-theme.css` across eight shared themes: Ocean, Sunset, Classic, Coffeehouse, Seahawks, Huskies, Superman/Marvel, and Mushroom Sprint. Shifted them toward stronger inspiration-specific gradients and more distinct atmosphere while keeping gameplay surfaces readable.
- 2026-03-13: Added shared shell readability guardrails in `games/ui/game-theme.css` + `games/ui/game-shell.css`: separate heading/copy font tokens, neutral reading-ink tokens, and shared surface tokens so theme changes stop causing frequent font/color readability conflicts. Bumped `game-platform.html` and `typing-quest.html` theme/shell cache-busters to `20260313a`.
- 2026-03-13: Local browser QA on `http://127.0.0.1:4174/game-platform.html?play=1&game=word-connections&cb=20260313-theme-pass2` confirmed the updated shell assets load, theme switching still works (spot-checked Ocean), and the new reading/surface tokens are active with 0 errors and only the existing Word Clue starter-deck unmatched-target warning.
- 2026-03-13: Finished another shared-theme pass in `games/ui/game-theme.css` for Zelda/Minecraft, Iron Man, Among Us, Matrix, Harley Quinn/Pop Pink, Kuromi, Harry Potter, and Demon Hunter so the extended theme library reads more like distinct product worlds instead of one reused dark-card treatment.
- 2026-03-13: Reworked the shared-shell theme picker in `games/ui/game-shell.css` from a detached hard pill into a softer integrated tray that inherits shell surfaces/borders and stays available on mobile instead of disappearing entirely.
- 2026-03-13: Local browser QA on `http://127.0.0.1:4174/game-platform.html?play=1&game=word-connections&cb=20260313-theme-pass3` confirmed theme switching still works after the tray/theme pass (spot-checked Ocean and Iron Man), reading-ink tokens remain neutral for readability, and no new console errors were introduced beyond the existing Word Clue unmatched-target warning.
## 2026-03-13 (Word Quest header hierarchy follow-up)

- tightened the standalone `word-quest.html` play header so the brand no longer occupies two visual rows during active play
- reduced the Word Quest title scale, widened the quest/support lane, and aligned the quick actions into a cleaner second-row toolbar
- bumped standalone Word Quest stylesheet cache-busters to `20260313b` so live Pages picks up the refined header immediately
- verified locally on `http://127.0.0.1:4174/word-quest.html?cb=20260313-pass5` with screenshot capture and live input check (`e` typed successfully on the on-screen keyboard)

## 2026-03-13 (Word Quest stage polish follow-up)

- added a subtle premium play-stage frame around the centered board/keyboard stack so Word Quest uses its horizontal space with more intention without abandoning the focused puzzle layout
- gave the standalone play shell a softer atmospheric overlay and tuned the Seahawks base blues slightly darker so the page feels richer while staying light
- upgraded the support strip under the board into a surfaced control band instead of loose controls floating between the board and keyboard
- bumped standalone Word Quest stylesheet cache-busters to `20260313c` and re-verified locally on `http://127.0.0.1:4174/word-quest.html?cb=20260313-pass6` with layout metrics plus a live on-screen keypress check

## 2026-03-13 (Word Quest visual QA cleanup)

- hid the play support band automatically when it has no visible controls so active play no longer leaves an empty spacer between the board and keyboard
- softened the floating build badge during active play so it stays available for debugging without competing with the puzzle surface
- bumped standalone Word Quest stylesheet cache-busters to `20260313d`
- rechecked locally on `http://127.0.0.1:4174/word-quest.html?cb=20260313-pass8`; support row collapsed correctly, board-to-keyboard spacing tightened, console stayed clean, and on-screen keyboard input still worked

## 2026-03-13 (Word Quest tile and keyboard polish)

- upgraded active-play tile states so filled, correct, present, and absent tiles read with more crafted depth and clearer feedback instead of flatter flat-color blocks
- wrapped the active-play keyboard in a softer keybed surface with a subtle top sheen so the board and keyboard feel like part of the same premium puzzle object
- bumped standalone Word Quest stylesheet cache-busters to `20260313e`
- rechecked locally on `http://127.0.0.1:4174/word-quest.html?cb=20260313-pass9`; no overflow, no new console issues, and on-screen key input still worked after the visual polish

## 2026-03-13 (Word Quest support language polish)

- made active-play support affordances read more like learner-facing game help instead of internal tool labels
- updated the clue launcher copy to `Need Hint?`, improved the quest picker placeholder/title to show the current quest directly, and clarified active-play navigation labels like `Open all games`
- bumped the standalone Word Quest app script cache-buster to `20260313f` so the updated runtime copy loads reliably
- rechecked locally on `http://127.0.0.1:4174/word-quest.html?cb=20260313-pass11`; new copy rendered correctly, on-screen input still worked, and console output stayed clean

## 2026-03-13 (Word Quest support behavior polish)

- restored active-play coach guidance so the first-turn state no longer feels like a disabled mystery button with no explanation
- updated the early-round coach copy to explain the expected first guess and when help becomes available, and refreshed the post-miss coach copy to point learners toward feedback plus support unlocks
- piped the existing hint-unlock copy into the help affordance logic and bumped the standalone Word Quest app script cache-buster through `20260313h`
- rechecked locally on `http://127.0.0.1:4174/word-quest.html?cb=20260313-pass13`; the coach ribbon now renders in active play, keyboard input still works, and console output stayed clean

## 2026-03-13 (Typing Quest course-first cleanup)

- tightened the Typing Quest top app bar so the course hub no longer carries extra runtime controls; the course page now emphasizes `Course`, `Placement first`, and `All Games` instead of reading like a full game control strip
- rewrote the placement/course hero copy in `games/ui/game-shell.js` so it reads more like a calm instructional start than a promo dashboard
- bumped local Typing Quest and shared game-platform shell asset versions (`game-shell.js` `20260313i`, shell CSS `20260313c`, theme CSS `20260313b`) in `typing-quest.html` and `game-platform.html`
- verified locally on `http://127.0.0.1:4174/typing-quest.html?cb=20260313-typing-pass2` and `http://127.0.0.1:4174/game-platform.html?play=1&game=word-typing&cb=20260313-typing-pass3`; the calmer course hub changes rendered correctly, but the existing `[LayoutFit][typing] overflow` warning still remains in the shared typing shell and needs a later fit pass

## 2026-03-13 (Typing Quest fit diagnostics cleanup)

- kept the shared Typing Quest hub inside a fixed-height scroll shell in `games/ui/game-shell.css` so the course map can scroll internally without expanding the whole viewport-owned stage
- updated the shared layout diagnostics in `games/ui/game-shell.js` to measure the visible typing shell (`.cg-typing-runtime`, `.cg-typing-page-shell`, or `.cg-typing-app-shell.is-hub`) instead of the full internal course-page content height
- filtered duplicate-layer warnings down to actually visible typing layers only, which removes false positives from hidden/inactive markup
- bumped the shared shell asset version to `20260313j` in `typing-quest.html` and `game-platform.html`

## 2026-03-13 (Homepage contrast and preview redesign)

- redesigned the home dashboard surfaces in `home-v3.css` so the hero, games destination, and workspace destination have stronger contrast and clearer visual ownership instead of pale cards blending together
- rebuilt the homepage game previews in `index.html` to better match the actual products: Word Quest now shows a realistic three-row solve progression, Typing Quest now shows a calmer home-row prompt with a proper keyboard order, and Word Clue keeps a cleaner taboo-card artifact
- upgraded the workspace destination preview into a real briefing panel with a weekly-planning summary, signal metrics, and action-ready items instead of a mostly empty pale box
- bumped the homepage stylesheet cache-buster to `20260313b`

## 2026-03-13 (Typing Quest course hub cleanup, pass 1)

- widened the Typing Quest course container in `games/ui/game-shell.css` so the course hub does not read like a tiny centered strip on large screens
- compacted the shared theme picker for Typing Quest routes into a smaller horizontal tray and added responsive guards so it stops dominating the top-right corner
- reserved extra right padding in the typing app bar on large screens so the compact theme tray does not collide with the course header
- bumped the shared shell stylesheet cache-buster to `20260313e` in `typing-quest.html` and `game-platform.html`

## 2026-03-13 (Typing Quest welcome-page restructure, pass 2)

- removed the implicit `typing-quest.html => runtime lesson` routing fallback in `games/ui/game-shell.js`; Typing Quest now enters lesson runtime only when `typingPage=1` is explicitly present
- rebuilt the Typing Quest course hub above-the-fold structure in `games/ui/game-shell.js` so the first screen is a welcome/start page with clear actions (`Start Placement`, `Jump to Current Unit`, `Browse lessons`) instead of a full curriculum stack
- moved the full Typing course catalog behind a collapsed details section and promoted only the current unit plus placement lane into primary view, which keeps the first screen inside the viewport
- expanded the shared course page width and added catalog/action styling in `games/ui/game-shell.css`
- updated shell cache-busters to `20260313k` in `typing-quest.html` and `game-platform.html`, and updated the homepage stylesheet cache-buster to `20260313c` in `index.html`
- tightened homepage shell sizing and destination scene heights in `home-v3.css` so the richer workspace destination does not push the landing page into an oversized desktop scroll state
- local verification:
  - `node --check games/ui/game-shell.js` passes
  - local browser snapshot on `http://127.0.0.1:4174/typing-quest.html?cb=20260313k2` now shows the welcome/course-start hub instead of dropping directly into the live lesson runtime
  - local browser metrics on the Typing Quest welcome page report `scrollHeight === innerHeight` with the full-course catalog collapsed
  - local browser snapshot on `http://127.0.0.1:4174/index.html?cb=20260313c` shows the tightened homepage shell and improved workspace contrast with the full dashboard visible in a single screen-sized shell

## 2026-03-13 (Typing Quest welcome-page visual pass, pass 3)

- added a visual typing demo artifact to the Typing Quest welcome hero in `games/ui/game-shell.js` + `games/ui/game-shell.css` so the first screen shows a lane, coach cue, and home-row keyboard instead of relying mostly on explanatory text
- added a visual unit-jump strip to the course map panel so learners can see the sequence of units and jump directly to unlocked units from the welcome page
- kept the course catalog collapsed as secondary content and verified the larger curriculum-document problem is still resolved
- local verification:
  - `node --check games/ui/game-shell.js` passes
  - local browser snapshot on `http://127.0.0.1:4174/typing-quest.html?cb=20260313k3` shows the new preview lane and unit-jump strip in the welcome screen
  - browser metrics still show a very small outer-document overflow (`scrollHeight 745` vs `innerHeight 739`) even though the main Typing shell itself remains compact (`mainHeight ~732px`), so there is still a small fit cleanup available later if we want pixel-perfect no-scroll behavior

## 2026-03-13 (Typing Quest placement strip separation fix)

- found that the placement section was still visually reading like a giant translucent sheet under the hero even after the course-hub restructure; the issue was not negative positioning, but an oversized, pale placement block that blended back into the hero
- applied stronger page-specific placement styling in `games/ui/game-shell.css` using the route-scoped `body.game-platform-page[data-shell-view="play"][data-game-id="word-typing"]` selector so later generic Typing section rules no longer override the compact placement layout
- made the placement lane more opaque, reduced its internal padding, tightened the four check tiles, and kept the row as a clearer launch strip rather than a second giant card
- bumped the shared shell CSS cache-buster to `20260313m` in `typing-quest.html` and `game-platform.html`
- local verification:
  - `node --check games/ui/game-shell.js` passes
  - local browser metrics on `http://127.0.0.1:4174/typing-quest.html?cb=20260313m1` show the placement section height reduced from ~404px to ~337px with the new opaque background applied

## 2026-03-13 (Typing Quest no-scroll welcome cleanup)

- adopted the platform rule for this screen directly: no page scroll unless the window is genuinely too small to support the layout
- in `games/ui/game-shell.js`, reduced explanatory copy on the Typing Quest welcome page and turned the first-unit block into a smaller teaser when placement is still pending instead of rendering the full four-lesson unit immediately
- in `games/ui/game-shell.css`, removed the forced viewport-filling min-height on the course page and tightened welcome text sizing so the screen relies more on visual artifacts and less on stacked copy
- bumped the Typing Quest shell CSS cache-buster to `20260313n` in `typing-quest.html`
- local verification:
  - `node --check games/ui/game-shell.js` passes
  - local browser metrics on `http://127.0.0.1:4174/typing-quest.html?cb=20260313n1` now report `scrollHeight === innerHeight` with hero, placement strip, and first-unit teaser all visible in one non-scrolling welcome screen

## 2026-03-13 (Gallery no-scroll shell cleanup)

- carried the same no-scroll rule into the game gallery instead of treating it like a long catalog document
- compacted the gallery setup strip and theme tray in `games/ui/game-shell.css`, then fixed the remaining root-shell issue by removing the outer `main.cg-shell` padding in gallery mode and locking the gallery root to viewport height
- bumped the shared gallery/play shell CSS cache-buster to `20260313o` in `game-platform.html`
- local verification:
  - `node --check games/ui/game-shell.js` passes
  - local browser metrics on `http://127.0.0.1:4174/game-platform.html?cb=20260313-gallery5` now report `scrollHeight === innerHeight` with the gallery visible in one non-scrolling screen

## 2026-03-13 (Typing Quest welcome-page overlap cleanup)

- replaced the stacked placement block and first-unit teaser on the Typing Quest welcome screen with a compact two-panel starter rail in `games/ui/game-shell.js`, so the page now shows placement and jump-in choices without behaving like a clipped long document
- tightened the active Typing Quest course-hub styles in `games/ui/game-shell.css`: smaller hero typography, smaller preview keyboard, smaller theme tray, and compact starter cards that fit under the hero instead of overlapping it
- bumped the shared shell CSS/JS cache-busters to `20260313p` in `typing-quest.html` and `game-platform.html` so the updated welcome layout can break stale cached assets
- local verification:
  - `node --check games/ui/game-shell.js` passes
  - local browser snapshot on `http://127.0.0.1:4174/typing-quest.html?cb=layout-audit2` shows hero + starter rail + collapsed course plan with no visible overlap
  - local browser metrics report the Typing welcome shell at ~509px tall inside a ~772px viewport, with `scrollHeight === innerHeight` and 0 browser warnings

## 2026-03-13 (Word Quest de-noise + build-stamp alignment)

- removed the large translucent standalone Word Quest play-stage scaffolding in `style/components.css` by disabling the extra `.board-zone::before` panel and clearing the decorative keyboard tray background so the board and keys are the focus again
- added a route-scoped final reset in `games/ui/game-shell.css` for the Typing Quest welcome branch to force smaller hero text, smaller preview artifacts, and tighter action/button sizing at the end of the file where older Typing rules can no longer override them
- aligned visible build metadata and asset cache-busters for the pages under active review: `word-quest.html`, `typing-quest.html`, `game-platform.html`, `build.json`, `build-stamp.js`, and `js/build-stamp.js` now point at build `20260313q`
- local verification:
  - `node --check games/ui/game-shell.js` passes
  - local Word Quest browser check on `http://127.0.0.1:4174/word-quest.html?cb=20260313q-final&play=1` shows build badge `20260313q`
  - local Typing Quest browser metrics still report in-viewport fit and the action/button bounding boxes remain inside the viewport

## 2026-03-13 (Typing Quest welcome simplification reset)

- simplified the Typing Quest welcome branch in `games/ui/game-shell.js` by removing duplicate panel-level CTA buttons from the lower starter panels, leaving the main hero as the single action owner for placement/jump choices
- tightened the final route-scoped Typing Quest overrides in `games/ui/game-shell.css` again so the welcome shell is smaller, denser, and more opaque instead of reading like layered translucent sheets
- bumped the Typing shared shell cache-busters to `20260313r` in `typing-quest.html` and `game-platform.html`
- local verification:
  - `node --check games/ui/game-shell.js` passes
  - local browser snapshot on `http://127.0.0.1:4174/typing-quest.html?cb=20260313r-check&play=1&game=word-typing&typingCourseMode=lesson` shows a smaller welcome shell with panel-level CTA duplication removed
  - local browser metrics report `scrollHeight === innerHeight` and a Typing welcome shell height of ~465px in a ~772px viewport

## 2026-03-13 (Typing Quest unified welcome surface)

## 2026-03-13 (Typing Quest duplicate-text removal + Word Quest text trim)

- removed the older Typing Quest starter rail from `games/ui/game-shell.js` so the welcome page now has one owner instead of the newer hero plus a second leftover placement/jump panel underneath it
- shortened Typing Quest welcome copy and action labels so the page leans more on the typing preview and less on stacked explanation text
- trimmed Word Quest coach language in `js/app.js` and removed the extra translucent support-row panel treatment in `style/components.css` so the screen carries less narration and less decorative framing
- bumped cache-busters to `20260313u` in `typing-quest.html`, `game-platform.html`, and `word-quest.html`
- local verification:
  - `node --check games/ui/game-shell.js` passes
  - `node --check js/app.js` passes
  - final browser relaunch/visual check is the next step after killing the stuck Chrome session that was blocking Playwright

## 2026-03-13 (Repo continuity docs refresh)

- updated `README.md` to describe the repo as Cornerstone MTSS rather than only WordQuest, and to direct fresh Codex threads to the continuity docs instead of assuming access to prior chat history
- replaced `docs/HANDOVER.md` with a platform-first handover describing the current March 13, 2026 baseline, critical file ownership, active risks, product guardrails, and next priority moves
- updated `docs/AGENT_CONTINUITY.md`, `docs/REGRESSION_GUARDRAILS.md`, and `docs/CONTINUITY_PLAYBOOK.md` to encode current regression traps:
  - duplicate layout owners
  - cache/build drift
  - no-scroll-by-default requirement
  - stale decorative overlay risk
  - need for rendered verification before claiming UI work is complete

## 2026-03-13 (Platform excellence playbook)

- added `docs/PLATFORM_EXCELLENCE_PLAYBOOK.md` as the new platform-wide “best of the best” standard for future work
- documented advanced expectations for:
  - premium CSS and token-first design
  - typography/readability
  - game identity and feedback
  - adaptive/EAL-friendly scaffolding
  - no-scroll-by-default hierarchy
  - verification discipline
  - advanced engineering patterns that are worth using in this repo
- linked the new playbook from `README.md` and `docs/HANDOVER.md`

- replaced the split top-level Typing Quest hero/card composition in `games/ui/game-shell.js` with one unified welcome surface: the main start card plus a lighter integrated course overview block in the same section
- updated the final route-scoped Typing Quest CSS in `games/ui/game-shell.css` so the unified welcome surface keeps a two-column desktop layout while staying visually connected and inside the viewport budget
- bumped the Typing shared shell cache-busters to `20260313s` in `typing-quest.html` and `game-platform.html`
- local verification:
  - `node --check games/ui/game-shell.js` passes
  - local browser snapshot on `http://127.0.0.1:4174/typing-quest.html?cb=20260313s2-check&play=1&game=word-typing&typingCourseMode=lesson` shows the unified welcome surface with no browser warnings
  - local browser metrics report `scrollHeight === innerHeight`, unified welcome section height ~459px, and total welcome page shell height ~736px inside a ~772px viewport

## 2026-03-13 (Typing Quest visual identity pass)

- kept the stable unified Typing welcome structure and layered in a stronger visual identity in `games/ui/game-shell.js` + `games/ui/game-shell.css`: added a small coaching track over the typing preview, a compact course-rhythm meter, stronger welcome-surface atmosphere, and cleaner card depth on the jump path chips
- avoided reopening the old fit fight by appending the visual layer at the end of the route-scoped Typing Quest rules instead of restructuring the page again
- bumped the Typing shared shell cache-busters to `20260313t` in `typing-quest.html` and `game-platform.html`
- verification:
  - `node --check games/ui/game-shell.js` passes
  - Playwright browser re-check was blocked by the existing Chrome persistent-session launch issue immediately after this pass, so final visual verification for this layer is still pending a fresh browser session
