# Non-Coder Safety Guide (AI Change Control)

This file is for fast safety checks when an AI agent proposes changes.

## 1) One Rule First
Only treat this folder as real:
- `/Users/robertwilliamknaus/Desktop/Cornerstone MTSS`

If an agent tries to edit files outside this folder, stop and ask why.

## 2) File Areas In Plain English

### Usually safe to change (most design requests)
- `/Users/robertwilliamknaus/Desktop/Cornerstone MTSS/index.html`
- `/Users/robertwilliamknaus/Desktop/Cornerstone MTSS/style/components.css`
- `/Users/robertwilliamknaus/Desktop/Cornerstone MTSS/style/themes.css`
- `/Users/robertwilliamknaus/Desktop/Cornerstone MTSS/style/modes.css`
- `/Users/robertwilliamknaus/Desktop/Cornerstone MTSS/js/app.js`
- `/Users/robertwilliamknaus/Desktop/Cornerstone MTSS/js/theme-nav.js`
- `/Users/robertwilliamknaus/Desktop/Cornerstone MTSS/js/theme-registry.js`
- `/Users/robertwilliamknaus/Desktop/Cornerstone MTSS/docs/*`
- `/Users/robertwilliamknaus/Desktop/Cornerstone MTSS/scripts/*`

### Caution (ask for clear reason first)
- `/Users/robertwilliamknaus/Desktop/Cornerstone MTSS/js/game.js`
- `/Users/robertwilliamknaus/Desktop/Cornerstone MTSS/js/ui.js`
- `/Users/robertwilliamknaus/Desktop/Cornerstone MTSS/js/audio.js`
- `/Users/robertwilliamknaus/Desktop/Cornerstone MTSS/js/data.js`
- `/Users/robertwilliamknaus/Desktop/Cornerstone MTSS/data/*`

### Red flag (do not allow unless you explicitly asked)
- `/Users/robertwilliamknaus/Desktop/Cornerstone MTSS/assets/audio/*`
- `/Users/robertwilliamknaus/Desktop/Cornerstone MTSS/.git/*`
- `/Users/robertwilliamknaus/Desktop/Cornerstone MTSS/files/*`
- `*.bak` backup files
- `*.zip` snapshot files

## 3) Commands You Can Run

From repo root:
- `cd /Users/robertwilliamknaus/Desktop/Cornerstone MTSS`

Show changed-file safety buckets:
- `npm run scope:view`

Fail only on red flags:
- `npm run scope:check`

Fail on caution/red/unknown (strict):
- `npm run scope:strict`

Run HUD quality guardrails:
- `npm run hud:check`

## 4) What To Ask Any AI Agent Before It Edits
Use this text:

`Before editing, list exact files you will change and why each file is needed. Do not touch files outside the approved list.`

Then approve only if the list matches your request.

## 5) After Any AI Edit
1. Run `npm run scope:view`.
2. Run `npm run hud:check`.
3. Open app locally and check the exact requested behavior.
4. If unexpected files changed, reject and revert that patch.

## 6) Fast Red-Flag Questions
- Did it edit data/audio assets when I only asked for visuals?
- Did it add a second theme list/order somewhere?
- Did it reintroduce inline styles in JS for HUD controls?
- Did it bypass checks or skip showing pass/fail output?

If yes to any, stop and ask for a scoped correction.
