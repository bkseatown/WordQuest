# WordQuest Non-Coder Operating Manual

This is the single plain-English manual for running and improving WordQuest with confidence.

Use this file as your source of truth.

## 1) What You Built (In Plain English)

You now have a safety system with five layers:

1. Pre-merge checks catch risky code changes before they go live.
2. Smoke tests catch broken core classroom flow.
3. Deploy checks catch "pushed but not live" incidents.
4. In-app diagnostics help you identify cache/build/prefs issues quickly.
5. Weekly ROI + release health reporting tells you what to fix next.

You were correct: this is mostly about preventing regressions and reducing support/debug churn.

## 2) The Minimum You Need To Know

If all required checks are green, your release is likely safe.

If any required check is red, do not merge until fixed.

You do not need to read code to operate this system.

## 3) Your Control Panel (GitHub + Local)

### GitHub Actions workflows you should watch
- `UI Guardrails`
- `Deploy GitHub Pages`
- `UI Runtime Smoke`
- `Weekly ROI Report`

### Local command for quick status
From repo root:
- `npm run health:check`

This gives you:
- local release-check status
- latest workflow statuses for key pipelines

## 4) Daily Operator Routine (5-10 minutes)

1. Open GitHub Actions.
2. Confirm latest runs on `main` are green for:
   - UI Guardrails
   - Deploy GitHub Pages
   - UI Runtime Smoke
3. If something is red:
   - open the failing step
   - copy error text
   - file/fix before merging more changes

Rule: no new feature merges while a core reliability check is red.

## 5) Weekly Operator Routine (15 minutes)

1. Open latest `Weekly ROI Report` run.
2. Review the generated report + artifact.
3. Review the weekly `Release Health` issue.
4. Prioritize work in this order:
   1. Reliability drops / failing checks
   2. Funnel drop-offs (adoption friction)
   3. Learning completion drops

Rule: reliability first, then growth.

## 6) What "Red" Means And What To Do

### A) UI Guardrails red
Meaning: a contract/test/regression likely broke.
Do:
1. Open failing step.
2. Capture exact error line.
3. Fix only that scope.
4. Re-run checks.

### B) Deploy GitHub Pages red
Meaning: code might be fine but site may not be live.
Do:
1. Open deploy run logs.
2. Confirm release gate + deploy step.
3. Resolve deploy issue before assuming app bug.

### C) UI Runtime Smoke red
Meaning: user flow is blocked in runtime conditions.
Do:
1. Open the failing selector/action in logs.
2. Fix flow/selector robustness.
3. Re-run runtime smoke.

### D) Weekly ROI alert issue opens
Meaning: thresholds were crossed (e.g., reliability or completion drop).
Do:
1. Treat as priority triage.
2. Assign one fix owner.
3. Verify next report recovers.

## 7) Safe Merge Rule (Simple)

Merge only when:
1. PR checks are green.
2. Changed files are expected.
3. No unresolved red workflows on `main`.

If unsure, do not merge yet.

## 8) Where Codex Fits

Codex in this environment can:
- edit your repo directly
- run scripts/tests
- create commits/branches
- push for PR flow

That is why it feels integrated and fast.

## 9) If You Run Out Of Codex Credits

You can still operate safely using the system you already built.

### Continue confidently with this fallback
1. Run `npm run health:check` locally.
2. Use GitHub Actions status as merge gate.
3. Use Weekly ROI + Release Health issues for priorities.
4. Make only small scoped changes.
5. Re-run checks before merge.

### Using ChatGPT or Gemini without repo integration
Use them for:
- patch suggestions
- error explanation
- test ideas
- PR description drafting

Then apply changes manually in GitHub Desktop/VS Code and run checks yourself.

## 10) AI Tool Reality (Practical)

- Codex (this setup): best for direct repo operations.
- ChatGPT (typical web app use): strong reasoning, usually not directly connected to your local repo unless you configure tools/plugins.
- Gemini: similar; capability depends on your integration setup.

Key point: your reliability now comes from the pipeline, not from any single AI.

## 11) Change Discipline (How To Keep Momentum)

Use one-PR chunks:
1. Reliability fix
2. Adoption improvement
3. Learning improvement

Avoid bundling many themes in one PR.

## 12) Fast Prompts You Can Reuse With Any AI

### A) Fix failing workflow
`This workflow failed. Diagnose from this exact log and give the smallest safe patch. Do not propose broad refactors.`

### B) Safe scope patch
`Change only these files: <list>. If more files are needed, stop and explain why.`

### C) Non-coder release summary
`Summarize current release health in 10 bullets: what is green, what is red, what to do next.`

## 13) Reference Docs (If You Need More Detail)

- `docs/NONCODER_SAFETY_GUIDE.md`
- `docs/WEEKLY_ROI_REPORT.md`
- `docs/AUDIO_OFFLINE_DEPLOY_CHECKLIST.md`
- `docs/CAPACITY_PROOF_PLAYBOOK.md`
- `docs/HANDOVER.md`

