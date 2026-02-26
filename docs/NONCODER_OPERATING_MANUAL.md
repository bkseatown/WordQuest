# WordQuest Non-Coder Operating Manual

This is the only file you need for day-to-day operations.

## If You Only Do 3 Things

1. Before merging anything, confirm PR checks are green.
2. If any core workflow is red, do not merge until it is fixed.
3. Once a week, read `Weekly ROI Report` and `Release Health` issue to pick next priorities.

That is enough to run safely.

## Green/Red Decision Table

| Signal | Meaning | Action |
|---|---|---|
| PR checks green | Change is likely safe | Merge |
| `UI Guardrails` red | Regression/contract failure | Pause merge, fix failing step |
| `Deploy GitHub Pages` red | Site may not be live | Fix deploy before debugging app behavior |
| `UI Runtime Smoke` red | Core flow broke at runtime | Fix flow/selector reliability first |
| `ROI Alert` issue created | Performance/reliability threshold crossed | Triage this week, assign owner |

## What You Have (Plain English)

You now have an automated safety system:
- pre-merge regression checks
- runtime smoke checks
- deploy/live gate and deploy alerting
- in-app diagnostics for fast troubleshooting
- weekly ROI and release health reporting

Purpose: prevent regressions and reduce support/debug churn.

## Your Control Panel

### GitHub workflows to watch
- `UI Guardrails`
- `Deploy GitHub Pages`
- `UI Runtime Smoke`
- `Weekly ROI Report`

### One local command
From repo root:
- `npm run health:check`

This gives a quick local + workflow status summary.

## Minimal Operating Rhythm

### Before merge (required)
1. Open PR checks.
2. Confirm green.
3. Merge only if green.

### Weekly (15 minutes)
1. Open latest `Weekly ROI Report`.
2. Open latest `Release Health` issue.
3. Prioritize in this order:
   1. Reliability problems
   2. Adoption funnel drop-offs
   3. Learning completion drops

## Where Codex Fits

In this setup, Codex can:
- edit repo files directly
- run checks/scripts
- commit/push branches for PR flow

That is why it feels integrated.

## If You Run Out Of Codex Credits

You can still run confidently.

Use this fallback:
1. Run `npm run health:check`.
2. Use GitHub Actions as merge gate.
3. Only do small scoped PRs.
4. Re-run checks before merge.

Use ChatGPT/Gemini for:
- error diagnosis from logs
- patch suggestions
- test ideas
- PR writeups

Then apply changes manually in GitHub Desktop/VS Code and validate with your pipeline.

## Practical Rule

Your reliability now comes from the pipeline, not from any single AI tool.

## Fast Prompt Templates (Any AI)

### Fix failing workflow
`This workflow failed. Use this exact log and give the smallest safe patch. No broad refactor.`

### Keep scope tight
`Change only these files: <list>. If more are needed, stop and explain why.`

### Executive summary
`Summarize release health in 10 bullets: green, red, and what to do next.`

## Optional Deep-Dive Docs

- `docs/NONCODER_SAFETY_GUIDE.md`
- `docs/WEEKLY_ROI_REPORT.md`
- `docs/AUDIO_OFFLINE_DEPLOY_CHECKLIST.md`
- `docs/CAPACITY_PROOF_PLAYBOOK.md`
- `docs/HANDOVER.md`
