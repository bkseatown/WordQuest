# WordQuest

WordQuest is a classroom-friendly word game built for strong literacy practice with rich audio support, theme variety, and scalable data-driven content.

## Source Of Truth
- Primary working folder: `/Users/robertwilliamknaus/Desktop/WordQuest`
- Treat this folder as canonical.
- Keep `.zip` files as read-only backups, not as active dev sources.
- Product direction and requirements baseline:
  - `/Users/robertwilliamknaus/Desktop/WordQuest/VISION.md`

## Quick Start
1. Run local server:
   - `cd /Users/robertwilliamknaus/Desktop/WordQuest`
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
  - `/Users/robertwilliamknaus/Desktop/WordQuest/docs/hud-spec-v1.md`
  - `/Users/robertwilliamknaus/Desktop/WordQuest/docs/hud-acceptance-checklist.md`
  - `/Users/robertwilliamknaus/Desktop/WordQuest/docs/HANDOVER.md`
  - `/Users/robertwilliamknaus/Desktop/WordQuest/docs/NONCODER_SAFETY_GUIDE.md`
  - `/Users/robertwilliamknaus/Desktop/WordQuest/docs/AUDIO_OFFLINE_DEPLOY_CHECKLIST.md`
  - `/Users/robertwilliamknaus/Desktop/WordQuest/docs/CAPACITY_PROOF_PLAYBOOK.md`

## Key Architecture Files
- Entry/UI wiring:
  - `/Users/robertwilliamknaus/Desktop/WordQuest/index.html`
  - `/Users/robertwilliamknaus/Desktop/WordQuest/js/app.js`
- Theme system:
  - `/Users/robertwilliamknaus/Desktop/WordQuest/js/theme-registry.js`
  - `/Users/robertwilliamknaus/Desktop/WordQuest/js/theme-nav.js`
  - `/Users/robertwilliamknaus/Desktop/WordQuest/style/themes.css`
- HUD styles/motion:
  - `/Users/robertwilliamknaus/Desktop/WordQuest/style/components.css`
  - `/Users/robertwilliamknaus/Desktop/WordQuest/style/modes.css`
- Contract tooling:
  - `/Users/robertwilliamknaus/Desktop/WordQuest/scripts/check-hud-contract.js`
  - `/Users/robertwilliamknaus/Desktop/WordQuest/scripts/build-audio-manifest.js`
  - `/Users/robertwilliamknaus/Desktop/WordQuest/scripts/check-audio-manifest-sync.js`
  - `/Users/robertwilliamknaus/Desktop/WordQuest/scripts/check-offline-contract.js`

## Deploy Target
- GitHub Pages workflow:
  - `/Users/robertwilliamknaus/Desktop/WordQuest/.github/workflows/deploy-pages.yml`
- Deployment gate:
  - `npm run release:check`
- Deploy trigger:
  - push to `main` (or run workflow manually in GitHub Actions)

## Pages Freshness Monitor
- Scheduled workflow:
  - `/Users/robertwilliamknaus/Desktop/WordQuest/.github/workflows/pages-freshness.yml`
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

## Request Template For Future Edits
- `Surface`:
- `Intent`:
- `Must Keep`:
- `Must Avoid`:
- `Acceptance`:

## Offline Notes
- Service worker is registered from `/Users/robertwilliamknaus/Desktop/WordQuest/js/app.js` and defined in `/Users/robertwilliamknaus/Desktop/WordQuest/sw.js`.
- Audio path inventory is generated to `/Users/robertwilliamknaus/Desktop/WordQuest/data/audio-manifest.json`.
- Full library offline is browser-storage dependent; app shell and previously used audio are prioritized.

## Music Track Pipeline
- Drop licensed or self-made files into:
  - `/Users/robertwilliamknaus/Desktop/WordQuest/assets/music/tracks/`
- Optional filename metadata pattern:
  - `track-name__modes-focus+chill__bpm-92__energy-low.wav`
- Sync catalog + ledger:
  - `npm run music:catalog`
- Generated files:
  - `/Users/robertwilliamknaus/Desktop/WordQuest/data/music-catalog.json`
  - `/Users/robertwilliamknaus/Desktop/WordQuest/data/music-license-ledger.json`
- Runtime behavior:
  - File tracks are used first (by mode), with synth fallback if catalog/load/playback fails.

## Teacher Workflow
1. Open [teacher-dashboard.html](/Users/robertwilliamknaus/Desktop/WordQuest/teacher-dashboard.html) and search/select a student first.
2. Review the single “Today’s Move” recommendation and tier/confidence snapshot.
3. Click `Run 90-second Probe` or `Run 10-min session` to launch [session-runner.html](/Users/robertwilliamknaus/Desktop/WordQuest/session-runner.html).
4. Complete the session blocks, then end session to auto-generate teacher and parent notes.
5. Save the session to the selected student and confirm trend updates in the dashboard.
6. Export progress as CSV/JSON for admin, family, or MTSS documentation.

Screenshot placeholders:
- `[Screenshot: Search-first dashboard view]`
- `[Screenshot: Session runner in progress]`
- `[Screenshot: Auto-generated summary + export]`
