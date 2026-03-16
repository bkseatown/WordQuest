# Trust And Adaptation Blueprint

## Purpose
This blueprint defines the lowest-regression path for making Cornerstone MTSS feel more trustworthy, more adaptive, and more specialist-owned without destabilizing the March 15 verified shell.

It is intentionally scoped around:
- specialist planning trust
- SAS-aligned goal recommendations
- contextual Google continuation workflows
- screenshot-first verification

## Non-Negotiable Product Outcomes
- The platform must stop looking smarter than the underlying data actually is.
- Recommendation flows must infer from visible student and class context before asking the specialist for input.
- Specialist actions should feel like contextual continuations of the current block, student, and lesson, not a tray of generic utilities.
- Shared-shell and specialist-surface work must preserve the March 15 fit and readability baseline.

## Current Risks To Correct

### 1. False-smart recommendation behavior
- `js/sas-alignment-library.js` currently accepts almost any baseline when suggesting goals.
- Risk: the UI can imply SAS-aligned personalization when the filtering is not actually responding to the specialist input.
- Fix rule: baseline-aware filtering must be honest. If confidence is low, the UI should say it is using a broad match.

### 2. Prompt-driven planning UX
- `js/dashboard/dashboard-support-view.js` currently uses blocking browser prompts for domain and baseline.
- Risk: the user does the interpretation work; the product feels like a form helper instead of an adaptive workspace.
- Fix rule: planning should open with inferred defaults from the student’s top needs, grade band, and current support record.

### 3. Generic Google utility behavior
- `js/lesson-brief-panel.js` exposes Drive/Calendar/Docs/Sheets/Slides as a flat utility set.
- Risk: the product reads as “Google tools attached” instead of “Cornerstone continuing today’s work into Google.”
- Fix rule: the first visible action should be framed around the current block, student, and lesson.

### 4. Curriculum trust overclaim
- `js/curriculum-truth.js` still mixes verified entries with broad placeholders.
- Risk: visual authority can outrun instructional authority.
- Fix rule: copy and recommendation surfaces should avoid implying lesson-level certainty when only broad alignment exists.

## Implementation Strategy

### Phase 1. Trust Layer Repair
- Fix baseline filtering in `js/sas-alignment-library.js`.
- Preserve graceful fallback behavior when no strong baseline match exists.
- Avoid changing pack structure or source JSON in this pass.

### Phase 2. Adaptive Specialist Planning
- Replace prompt-based goal suggestion with an inline planning brief.
- Derive defaults from:
  - selected student
  - top needs / skill model
  - existing goals
  - grade band
- Expose:
  - recommended domain
  - editable baseline summary
  - recommended time budget
  - clear “generate recommended plan” and “suggest goals” actions
- Keep output local-first and compatible with existing `SupportStore` APIs.

### Phase 3. Contextual Google Continuations
- Keep the current APIs and auth flow.
- Reframe actions around the current instructional context:
  - planning doc
  - progress tracker sheet
  - lesson deck
  - related Drive files
  - today’s calendar sync
- Surface:
  - current block context
  - current query
  - recommended next Google move

## Regression Guardrails
- Do not alter the shared-shell/theme system in this pass.
- Do not change layout ownership for hub, student profile, reports, or game gallery.
- Do not mutate curriculum source data or SAS source files.
- Do not remove existing export/apply-plan behaviors.
- Keep current local-first storage contract intact.

## Verification Matrix

### Code checks
- `node --check js/sas-alignment-library.js`
- `node --check js/dashboard/dashboard-support-view.js`
- `node --check js/lesson-brief-panel.js`

### Browser checks
- Specialist hub plan surface:
  - selected student
  - plan tab visible
  - recommended domain/baseline/time budget visible
  - goal suggestion list visible without prompts
- Reports / lesson brief surface:
  - Google workspace card visible
  - current block context visible
  - recommended Google next move visible
  - existing buttons still work/render

### Screenshot artifacts
- one refreshed specialist planning screenshot
- one refreshed reports / lesson brief screenshot

## Success Criteria
- The planning flow no longer uses `window.prompt` for the main SAS goal recommendation path.
- SAS goal suggestions are meaningfully filtered instead of always passing baseline matching.
- The Google workflow card reads like a lesson/block continuation surface rather than a generic tool launcher.
- No regression to current verified first-screen fit on the touched routes.
