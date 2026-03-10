# WordQuest

WordQuest is a classroom-friendly word game built for strong literacy practice with rich audio support, theme variety, and scalable data-driven content.

## Source Of Truth
- Primary working folder: `/Users/robertwilliamknaus/Desktop/Cornerstone MTSS`
- Treat this folder as canonical.
- Keep `.zip` files as read-only backups, not as active dev sources.
- Product direction and requirements baseline:
  - `/Users/robertwilliamknaus/Desktop/Cornerstone MTSS/VISION.md`

## Quick Start
1. Run local server:
   - `cd /Users/robertwilliamknaus/Desktop/Cornerstone MTSS`
   - `python3 -m http.server 8787`
2. Open:
   - `http://127.0.0.1:8787/index.html?t=1`
3. Hard refresh when needed:
   - `Cmd+Shift+R`

## HUD Guardrails
- Run contract checks:
  - `npm run hud:check`
- Run offline/audio checks:
  - `npm run audio:manifest`
  - `npm run audio:manifest:check`
  - `npm run offline:check`
- Run pre-deploy gate:
  - `npm run release:check`
- Run file-scope safety checks:
  - `npm run scope:view`
  - `npm run scope:check`
  - `npm run scope:strict`
- Main docs:
  - `/Users/robertwilliamknaus/Desktop/Cornerstone MTSS/docs/hud-spec-v1.md`
  - `/Users/robertwilliamknaus/Desktop/Cornerstone MTSS/docs/hud-acceptance-checklist.md`
  - `/Users/robertwilliamknaus/Desktop/Cornerstone MTSS/docs/HANDOVER.md`
  - `/Users/robertwilliamknaus/Desktop/Cornerstone MTSS/docs/CONTINUITY_PLAYBOOK.md`
  - `/Users/robertwilliamknaus/Desktop/Cornerstone MTSS/docs/AGENT_CONTINUITY.md`
  - `/Users/robertwilliamknaus/Desktop/Cornerstone MTSS/docs/SESSION_LOG.md`
  - `/Users/robertwilliamknaus/Desktop/Cornerstone MTSS/docs/NONCODER_SAFETY_GUIDE.md`
  - `/Users/robertwilliamknaus/Desktop/Cornerstone MTSS/docs/AUDIO_OFFLINE_DEPLOY_CHECKLIST.md`
  - `/Users/robertwilliamknaus/Desktop/Cornerstone MTSS/docs/CAPACITY_PROOF_PLAYBOOK.md`

## Key Architecture Files
- Entry/UI wiring:
  - `/Users/robertwilliamknaus/Desktop/Cornerstone MTSS/index.html`
  - `/Users/robertwilliamknaus/Desktop/Cornerstone MTSS/js/app.js`
- Theme system:
  - `/Users/robertwilliamknaus/Desktop/Cornerstone MTSS/js/theme-registry.js`
  - `/Users/robertwilliamknaus/Desktop/Cornerstone MTSS/js/theme-nav.js`
  - `/Users/robertwilliamknaus/Desktop/Cornerstone MTSS/style/themes.css`
- HUD styles/motion:
  - `/Users/robertwilliamknaus/Desktop/Cornerstone MTSS/style/components.css`
  - `/Users/robertwilliamknaus/Desktop/Cornerstone MTSS/style/modes.css`
- Contract tooling:
  - `/Users/robertwilliamknaus/Desktop/Cornerstone MTSS/scripts/check-hud-contract.js`
  - `/Users/robertwilliamknaus/Desktop/Cornerstone MTSS/scripts/build-audio-manifest.js`
  - `/Users/robertwilliamknaus/Desktop/Cornerstone MTSS/scripts/check-audio-manifest-sync.js`
  - `/Users/robertwilliamknaus/Desktop/Cornerstone MTSS/scripts/check-offline-contract.js`

## Deploy Target
- GitHub Pages workflow:
  - `/Users/robertwilliamknaus/Desktop/Cornerstone MTSS/.github/workflows/deploy-pages.yml`
- Deployment gate:
  - `npm run release:check`
- Deploy trigger:
  - push to `main` (or run workflow manually in GitHub Actions)

## Pages Freshness Monitor
- Scheduled workflow:
  - `/Users/robertwilliamknaus/Desktop/Cornerstone MTSS/.github/workflows/pages-freshness.yml`
- Schedule:
  - runs hourly (`cron: 17 * * * *`) and on manual dispatch.
- What it checks on live GitHub Pages:
  - `/WordQuest/build.json` returns valid JSON and contains `buildId`.
  - `build.json.time` is parseable and not stale (older than 14 days).
  - `/WordQuest/teacher-dashboard.html` includes:
    - `build-stamp.js`
    - `js/build-badge.js`
    - `js/nav-shell.js`
  - `/WordQuest/style/tokens.css` returns `200` and `content-type: text/css`.
- Failure behavior:
  - workflow fails and opens a GitHub issue with a link to the failed run.
- Manual run:
  1. Open GitHub Actions.
  2. Select `Pages Freshness`.
  3. Click `Run workflow` (branch `main`).
  4. Review logs and summary table.

## Collaboration Workflow (Recommended)
1. Propose a small change batch (1-3 deltas).
2. Convert request into measurable acceptance rules.
3. Implement only in scoped files.
4. Run `npm run hud:check`.
5. Run smoke test.
6. Commit only after pass/fail report is clean.

## Industry UI/UX Audit Commands
- Accessibility (serious/critical WCAG A/AA): `npm run audit:a11y`
- Core Web Vitals budget checks: `npm run audit:performance`
- Visual baseline capture: `npm run test:visual:update`
- Visual regression check: `npm run test:visual:regression`
- Cross-browser runtime + a11y matrix: `npm run audit:matrix`
- Full audit bundle: `npm run audit:industry`
- Audit stack details: [INDUSTRY_EVALUATION_STACK.md](/Users/robertwilliamknaus/Desktop/Cornerstone MTSS/docs/INDUSTRY_EVALUATION_STACK.md)

## Request Template For Future Edits
- `Surface`:
- `Intent`:
- `Must Keep`:
- `Must Avoid`:
- `Acceptance`:

## Offline Notes
- Service worker is registered from `/Users/robertwilliamknaus/Desktop/Cornerstone MTSS/js/app.js` and defined in `/Users/robertwilliamknaus/Desktop/Cornerstone MTSS/sw.js`.
- Audio path inventory is generated to `/Users/robertwilliamknaus/Desktop/Cornerstone MTSS/data/audio-manifest.json`.
- Full library offline is browser-storage dependent; app shell and previously used audio are prioritized.

## Music Track Pipeline
- Drop licensed or self-made files into:
  - `/Users/robertwilliamknaus/Desktop/Cornerstone MTSS/assets/music/tracks/`
- Optional filename metadata pattern:
  - `track-name__modes-focus+chill__bpm-92__energy-low.wav`
- Sync catalog + ledger:
  - `npm run music:catalog`
- Generated files:
  - `/Users/robertwilliamknaus/Desktop/Cornerstone MTSS/data/music-catalog.json`
  - `/Users/robertwilliamknaus/Desktop/Cornerstone MTSS/data/music-license-ledger.json`
- Runtime behavior:
  - File tracks are used first (by mode), with synth fallback if catalog/load/playback fails.

## Phase 15: Bug Fixes & Visual Polish (March 2026)

### Critical Fixes
1. **JS IIFE Syntax Error (Line 2889)**
   - **Issue:** Straight double-quotes (`””`) used in a `.showToast()` call where curly quotes were intended
   - **Effect:** Entire `teacher-hub-v2.js` module failed to parse silently; hub did not initialize
   - **Fix:** Replaced `””` with escaped single quotes `’` in the Classroom sync toast message
   - **Impact:** Hub now boots correctly, morning brief renders, students populate sidebar

2. **Tour Auto-Launch Blocking Content**
   - **Issue:** `CSTour.init()` ran automatically with 600ms delay on every page load, triggering popup overlays that blocked the main interface
   - **Fix:** Removed auto-launch; tour now initializes lazily only when user clicks “Tour” button
   - **Impact:** Landing page and hub load cleanly without blocking popups

3. **Mobile Layout: Double Scroll & Footer Overlap**
   - **Issue:** Shell was `height: 100dvh; overflow: hidden` with two independent scroll regions (sidebar @ 42dvh, main @ remainder), causing two separate scroll bars. Footer (Curriculum/Tour/Analytics) overlapped between student list items.
   - **Root Cause:** `.th2-list { flex: 1 1 0% }` from desktop (shrink-to-fill) was collapsing list to 148px in an auto-height parent on mobile.
   - **Fixes:**
     - Changed shell to `height: auto; min-height: 100dvh; overflow: visible` for single-page scroll
     - Override list to `flex: 0 0 auto` on mobile so it sizes to natural content height (all 5 students visible)
   - **Impact:** Single unified scroll on mobile, no overlapping footer, all students visible before footer

4. **Azure Cost Dashboard Auto-Show**
   - **Issue:** Cost tracking dashboard auto-showed on localhost, blocking content
   - **Fix:** Removed auto-show logic; dashboard stays hidden until user explicitly opens it
   - **Impact:** Cleaner developer experience, no content blocked

5. **Browser Cache Preventing Updates**
   - **Issue:** Cache busters in HTML (`v=20260305a`) were static; edits to .js/.css files returned 304 Not Modified
   - **Fix:** Bumped all 33 cache buster references from `v=20260305a` → `v=20260306a`
   - **Impact:** Fresh file loads immediately in browser

### Visual Improvements

6. **Dark Background → Light Cool Gray**
   - **Before:** Dark slate gradient `#8fa3bd → #7d94b0 → #6f8ba5` (hard on eyes, high contrast)
   - **After:** Light cool gray gradient `#e8edf4 → #dce4ee → #d1dae8` (soft, calming, accessible)
   - **Sidebar:** Updated to `#f0f3f8` with `#c5cfe0` subtle borders
   - **Impact:** Better readability, reduces eye strain, professional appearance

7. **Build Badge Too Prominent**
   - **Before:** Dark pill background, green status dot, z-index 2147483600, high opacity, 11px font
   - **After:** Ghost style with opacity 0.5, 9px font, no dot, subtle gray text
   - **Impact:** Badge no longer distracts from main content while remaining available for debugging

### Browser/Cache Considerations

- **serve strips query params on redirects** — demo flag persisted to `localStorage[“cs.hub.demo”]`
- All files now properly cache-busted to force fresh loads after edits
- CSS media queries reorganized to prevent duplicate blocks (removed stale 600px duplicates)

### Testing Completed

✅ Desktop (1280px): Two-column layout, light background, all UI elements visible, no overlapping
✅ Mobile (375px): Single-page scroll, footer properly positioned below all students, no double scroll
✅ Tour: Launches only on button click, no auto-popups blocking content
✅ Cache: All files load fresh; edits immediately reflected in browser

---

## Teacher Workflow (Command Hub)
1. Open [teacher-hub-v2.html](/Users/robertwilliamknaus/Desktop/Cornerstone MTSS/teacher-hub-v2.html) — the new Command Hub (Phase 15)
2. **Sign in with Google** (optional) to sync roster from Google Classroom
3. View your caseload with urgency-ranked students in sidebar
4. **Morning Brief:** Rich intelligence surface showing tier distributions, top priority students, and recommended next steps
5. Click a student to see **Focus Card** with plan recommendations, support strategies, and evidence snapshots
6. Use **Curriculum panel** (📚 button) to quick-reference all 54 Fish Tank units, assessment batteries, and YouTube resources
7. Track usage with optional **Analytics panel** (📊 button)
8. Optional: Configure Azure OpenAI for AI-powered coaching narration and sub-plan generation

### Legacy Workflow (Teacher Dashboard v1)
1. Open [teacher-dashboard.html](/Users/robertwilliamknaus/Desktop/Cornerstone MTSS/teacher-dashboard.html) — the original dashboard
2. Search/select a student
3. Review tier and confidence snapshot
4. Click `Run 90-second Probe` or `Run 10-min session` to launch [session-runner.html](/Users/robertwilliamknaus/Desktop/Cornerstone MTSS/session-runner.html)
5. Complete session blocks; auto-generate teacher notes
6. Save session and confirm trend updates
7. Export progress as CSV/JSON
