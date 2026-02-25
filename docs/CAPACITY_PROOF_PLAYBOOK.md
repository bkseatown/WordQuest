# Capacity-Proof Playbook (WordQuest)

This playbook keeps delivery moving when a model is rate-limited, at capacity, or credits are constrained.

## 1) Fast Triage
When you see: "model at capacity" or similar.

1. Start a new conversation on an available model.
2. Keep scope narrow: one shippable batch per turn.
3. Avoid open-ended prompts; use a concrete task template.

## 2) One-Batch Prompt Template
Use this exact structure:

```text
Goal: <single clear outcome>
Files in scope: <paths>
Do:
1) implement
2) run checks: <commands>
3) commit
4) push
Acceptance:
- <observable result 1>
- <observable result 2>
Constraints:
- do not touch unrelated files
```

## 3) Work Modes (Choose One)
### A) AI-Heavy (capacity available)
Use AI for full cycle: plan -> edit -> verify -> commit -> push.

### B) Mixed (partial capacity)
Use AI only for:
- architecture decisions
- diff generation for hardest files

Do easy edits and command runs manually.

### C) Manual (no capacity)
Run from terminal using this fixed sequence:

```bash
git pull
# edit files
npm run hud:check
npm run audio:manifest:check
npm run offline:check
git add -A
git commit -m "<clear message>"
git push
```

## 4) Low-Credit Strategy
1. Batch related changes into fewer turns.
2. Ask for "final diff only" instead of long explanations.
3. Reuse existing scripts before asking AI to re-derive logic.
4. Keep one backlog file with atomic tasks.

Recommended backlog file:
- `/Users/robertwilliamknaus/Desktop/WordQuest/docs/NEXT_ACTIONS.md`

Task format:

```text
[P1] <title>
Outcome:
Files:
Checks:
Done when:
```

## 5) Local Command Runbook (WordQuest)
Core checks:

```bash
npm run hud:check
npm run grade:check
npm run audio:manifest:check
npm run offline:check
npm run scope:check
```

Release gate:

```bash
npm run release:check
```

Music pipeline:

```bash
npm run music:focus-pack
npm run music:catalog
```

## 6) Branch + Commit Discipline
1. Keep commits small and atomic.
2. One concern per commit.
3. Commit message format:

```text
<surface>: <change>
```

Examples:
- `voice: add 3s countdown before recording`
- `music: replace focus-flow pack and recatalog`

## 7) Fallback AI Stack (Free/Low-Cost)
When premium model is blocked:
1. Use available lightweight cloud model for code drafting.
2. Use local/open models for boilerplate and test generation.
3. Reserve premium model for:
- risk review
- architecture tradeoffs
- final QA pass

## 8) FERPA-Safe Defaults During Crunch
When moving fast, do not relax these:
1. No raw student names in telemetry payloads.
2. No raw audio persistence unless explicitly required.
3. Keep pseudonymous IDs only.
4. Log access to student-linked reports.

## 9) "Blocked Right Now" Checklist
If capacity is blocked this minute:
1. Run all checks locally.
2. Ship documentation/test/cleanup tasks.
3. Prepare a tight AI batch prompt for next available window.
4. Queue 2-3 P1 tasks in `docs/NEXT_ACTIONS.md`.

## 10) Weekly Cadence (No Stalls)
1. Monday: prioritize backlog (P1/P2/P3).
2. Tue-Thu: ship 1-2 P1 batches/day.
3. Friday: run release gate + exports + deployment review.

This cadence keeps progress stable even with intermittent model access.
