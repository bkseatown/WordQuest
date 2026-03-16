# Full Product Audit Blueprint

Date: 2026-03-16

Scope:
- Live route audit with screenshots
- Manual button testing on primary workflows
- Code-path review for surfaced trust and UX issues
- Product blueprint informed by current MTSS, intervention, family communication, and teacher-workflow platforms

Screenshots captured in this pass:
- `/tmp/audit-index-20260316.png`
- `/tmp/audit-hub-20260316.png`
- `/tmp/audit-student-profile-20260316.png`
- `/tmp/audit-game-platform-20260316.png`
- `/tmp/audit-reports-20260316.png`
- `/tmp/reports-family-comms-and-planning-cleanup.png`
- `/tmp/reports-weekly-draft-plain-language.png`

Best-practice references reviewed:
- Panorama Student Success: https://www.panoramaed.com/products/student-success
- Panorama Playbook: https://www.panoramaed.com/products/playbook
- Branching Minds MTSS platform: https://www.branchingminds.com/
- Branching Minds Meeting Assistant: https://www.branchingminds.com/mtss-meeting-assistant-ai
- Branching Minds Intervention Library: https://www.branchingminds.com/intervention-library
- SchoolStatus: https://www.schoolstatus.com/
- Amplify mCLASS: https://amplify.com/mclass/
- Curriculum Associates Teacher Toolbox: https://www.curriculumassociates.com/programs/i-ready-learning/teacher-toolbox

What leading platforms consistently do well:
- Put the next decision first, not the data archive first.
- Keep planning, evidence, communication, and meeting prep on one continuous workflow.
- Show plain-language instructional priorities while preserving standards and metadata beneath the surface.
- Turn family communication into an evidence-aware extension of the same record, not a separate writing task.
- Avoid generic prompts and browser dialogs in core teacher workflows.
- Make intervention and reporting tools feel dependable, quiet, and fast.

## Audit Summary

Current strengths:
- The product now has a credible specialist shell rather than a generic ed-tech dashboard.
- The Hub is the strongest route for first-glance situational awareness.
- Reports is significantly improved and now has clearer family communication entry points.
- Student Profile communicates seriousness and instructional purpose better than earlier passes.
- Curriculum truth and progress-data notes are starting to create a more trustworthy planning spine.

Current risks:
- Several surfaces still over-promise smartness relative to what the visible planner and workflow actually synthesize.
- Some call-to-action labels do not match what the button really does.
- Cross-surface truth is still inconsistent in a few places, especially around support lane and student/program continuity.
- Reports remains visually calmer than before, but it still asks the eye to process too many parallel columns and states at once.

## Verified Findings

### P1 Trust and Meaning

1. Hub class detail can still present the wrong primary support lane for the active class.
- Verified live on the Math block: the class detail showed `Primary lane: T3 Reading` while the active class was Illustrative Math.
- Screenshot evidence: `/tmp/audit-hub-20260316.png`
- Root cause is visible in `teacher-hub-v2.js`.
- `inferPrimarySupportArea()` prioritizes each student's historical related supports before the current block subject.
- `deriveBlockSupportSummary()` then aggregates those areas into the class command chip.
- Ownership:
  - `teacher-hub-v2.js:890`
  - `teacher-hub-v2.js:903`
  - `teacher-hub-v2.js:1253`
- Impact:
  - This weakens specialist trust immediately.
  - It makes the product feel “almost smart” instead of dependable.

2. Reports still contains legacy workflow behavior behind a modern surface.
- The `Export / Save to Drive` action is still wired through the legacy import/export handler path rather than a contextual export workflow.
- In code, the visible CTA routes to `el.importExport.click()`.
- Ownership:
  - `reports.html:244`
  - `js/dashboard/dashboard-bindings.js:195`
  - `teacher-dashboard.js:2612`
- During live testing, the flow still behaved like a utility/export system instead of a specialist-facing “send/save/share” flow.
- Impact:
  - The label promises a polished delivery action.
  - The actual behavior still belongs to an internal local-data maintenance tool.

3. The visible specialist planner is not synthesizing enough from the evidence already on screen.
- The Reports planning panel showed `No instructional priorities captured yet` while reading and math institutional evidence were already populated.
- Screenshot evidence: `/tmp/audit-reports-20260316.png`
- Ownership:
  - `js/dashboard/dashboard-support-view.js:419`
- Impact:
  - The planner reads as less intelligent than the surrounding product language claims.
  - Teachers still have to translate raw evidence into priorities themselves.

### P1 Workflow Fit

4. Reports still starts with parallel choices instead of one dominant next move.
- The first Reports screen is improved, but it still splits attention across queue, output, planning, timeline, sidebar, and family communication.
- Screenshot evidence: `/tmp/audit-reports-20260316.png`
- Best-in-class comparison:
  - Panorama and Branching Minds center the next meeting/intervention move more strongly.
  - SchoolStatus-style communication tools pull the “send now” action closer to the evidence itself.
- Impact:
  - Teachers must still decide where to look before they can decide what to do.

5. The game gallery sells “start fast” well, but the activity layer still feels less operationally integrated than the rest of the platform.
- Game launch works and Word Quest still opens successfully.
- Screenshot evidence:
  - `/tmp/audit-game-platform-20260316.png`
- Verified:
  - `Start Recommended` launched `word-quest.html?play=1...`
- Remaining issue:
  - The gallery is strong as a catalog, but it still feels separate from live class execution and reporting.
  - In Word Quest, a visible `Open help options` control was disabled during audit.
- Impact:
  - The games feel usable, but not yet fully embedded in the “teach -> log -> report -> communicate” system story.

### P2 Clarity and Copy

6. Student Profile is strong, but cross-surface coherence still needs tightening.
- Example:
  - In Student Profile, Ava’s math record is tied to Grade 3 IM.
  - In Hub and Reports contexts, Ava also appears in other support lanes and block contexts.
- Ownership:
  - `student-profile.js:67`
  - `student-profile.js:81`
- Impact:
  - Demo data can make the platform feel contradictory even when the page itself looks polished.

7. Some CTA naming still reflects internal tooling rather than user intent.
- `Progress Report Format` currently opens the SAS Library modal.
- The SAS Library modal opened during live audit, but the label does not match the action.
- Ownership:
  - `reports.html:243`
  - `js/dashboard/dashboard-bindings.js:187`
- Impact:
  - This slows comprehension and makes the workflow feel assembled instead of designed.

8. Reports still has contrast and density issues at first glance.
- The latest pass improved separation, but the queue tiles, output tiles, and planning surface still compete visually.
- Screenshot evidence: `/tmp/audit-reports-20260316.png`
- Impact:
  - Better than before, but not yet “powerhouse” simple.

## Buttons Tested

Verified working:
- Index:
  - `Open Hub`
  - `Open Workspace`
- Hub:
  - `Sync Google Calendar` shows configured-status feedback
  - lesson map class cards open class detail
  - student links open Student Profile
- Reports:
  - `Meeting Prep`
  - `Generate Family Update`
  - `Open family update`
  - `Open translation tools`
  - `Open meeting summary`
  - `Progress Report Format` opens SAS Library
- Games:
  - `Start Recommended` launches Word Quest

Verified but misaligned:
- `Export / Save to Drive`
  - behavior still maps to local backup/import/export infrastructure rather than a context-aware share/save flow

Verified friction points:
- Word Quest shows a disabled quick-support/help control in the header during live audit
- Reports planner can still show no priorities while evidence is already visible
- Hub primary lane chip can mislabel the current class support domain

## Product Blueprint

### Workstream 1: Trust Before Flair

Goal:
- Make the platform’s visible intelligence match the actual decision logic.

Actions:
- Rebuild Hub primary lane logic so current block subject and current instructional goal outrank historical support area.
- Add a “context confidence” rule:
  - if class subject and student intervention lane conflict, show `Cross-support block` instead of a false single-lane label
- Derive visible instructional priorities directly from:
  - current block
  - current curriculum truth
  - institutional anchors
  - current active goals
- Never show “No instructional priorities captured yet” if evidence exists on the page.

Implementation ownership:
- `teacher-hub-v2.js`
- `js/dashboard/dashboard-support-view.js`
- `js/dashboard/workspace-meeting-content.js`
- `js/weekly-insight-generator.js`

Regression guardrails:
- For every active block state, verify:
  - block subject
  - curriculum
  - support lane
  - student goals
  - family update draft
  all stay coherent.

### Workstream 2: Decision-First Reports

Goal:
- Make Reports feel like the most dependable “next move” workspace on the platform.

Actions:
- Replace the current parallel opening layout with one dominant action rail:
  - `Start with this student`
  - `Prepare this output`
  - `Send/share/save`
- Collapse or defer lower-priority widgets until after a student and output are chosen.
- Convert the queue into ranked action cards with:
  - student
  - why now
  - due status
  - one-click next move
- Move the family communication panel closer to the evidence and output selection region.

Best-practice model:
- Panorama-style action-first student success workflow
- Branching Minds-style meeting and intervention continuation
- SchoolStatus-style communication readiness

Implementation ownership:
- `reports.html`
- `teacher-dashboard.css`
- `teacher-dashboard.js`
- `js/dashboard/workspace-reports.js`

Regression guardrails:
- No core report workflow should require:
  - browser prompt
  - browser confirm
  - raw import/export language
  - hidden runtime-only controls

### Workstream 3: Rename Actions to Match Reality

Goal:
- Remove every mismatch between button text and actual behavior.

Actions:
- Rename `Progress Report Format` to what it really is if it still opens SAS Library.
- Split `Export / Save to Drive` into explicit actions:
  - `Export backup`
  - `Save report to Drive`
  - `Copy share link`
  - `Download packet`
- Keep backup tools behind a lower-level utility entry, not in the main report workflow.

Implementation ownership:
- `reports.html`
- `js/dashboard/dashboard-bindings.js`
- `teacher-dashboard.js`
- `js/backup-manager.js`

### Workstream 4: Curriculum-Coherent Student Story

Goal:
- Make every student feel like one believable cross-surface instructional story.

Actions:
- Audit demo students across:
  - Hub
  - Reports
  - Student Profile
  - Lesson brief
  - Games context
- Align each student’s:
  - grade
  - current core program
  - intervention lane
  - current lesson
  - progress note examples
- Add a “current classroom context” line on Student Profile that mirrors the active Hub/Reports block if the student was opened from there.

Implementation ownership:
- `student-profile.js`
- `teacher-hub-v2.js`
- `js/lesson-brief-panel.js`
- demo data stores

Regression guardrails:
- For each demo student, verify one continuous story across all routes.

### Workstream 5: Family Communication as a First-Class Surface

Goal:
- Make family communication feel as polished and useful as reporting and planning.

Actions:
- Turn the weekly draft into a lighter communication composer:
  - short summary
  - next step
  - how family can help
  - translation review
  - optional standards/goal appendix
- Keep standards and SAS alignment linked underneath, not in the main family-facing text.
- Add communication mode presets:
  - email-style
  - text-style
  - meeting follow-up
  - home practice update

Best-practice model:
- SchoolStatus-style family communication readiness
- Panorama-style evidence-linked student summary

Implementation ownership:
- `js/weekly-insight-generator.js`
- `js/dashboard/dashboard-support.js`
- `reports.html`

### Workstream 6: Activity Layer Integration

Goal:
- Make games feel like instructional moves inside the platform, not a separate product.

Actions:
- Launch games with visible context:
  - target skill
  - lesson fit
  - suggested group size
  - quick log expectation after play
- Add a one-click “log result back to report” flow after each game session.
- Replace disabled quick-support affordances with real, small in-game teacher tools.

Implementation ownership:
- `game-platform.html`
- `word-quest.html`
- `js/app.js`
- game context injection files

Regression guardrails:
- Every flagship game should support:
  - launch
  - in-session help
  - completion
  - return-to-platform path

## Execution Order

Phase 1:
- Fix trust mismatches
- Fix misnamed report actions
- Remove legacy prompt/export behavior from primary report flow

Phase 2:
- Rebuild Reports as a ranked decision-first workspace
- Synthesize visible instructional priorities from existing evidence

Phase 3:
- Tighten student-story continuity across Hub, Reports, Profile, and lesson brief
- Upgrade family communication composer and translation flow

Phase 4:
- Integrate games more tightly into lesson, evidence, and reporting loops

## Verification Matrix

Every major pass should be checked in these states, not from one happy-path screenshot:
- Hub default day overview
- Hub active class detail
- Reports default
- Reports with weekly draft open
- Reports with meeting workroom open
- Reports with SAS library open
- Student Profile opened directly
- Student Profile opened from Hub
- Game gallery
- One flagship game live
- light theme
- dark/alt theme if present
- scrolled states
- narrow desktop and tablet width

## Definition of Better

This becomes a powerhouse when:
- a specialist can tell the next move in under five seconds
- the curriculum truth is believable across surfaces
- the family message is generated from the same evidence the teacher already trusts
- the student story stays coherent everywhere
- the games feel like classroom tools, not side attractions
- no high-value workflow depends on prompts, raw codes, or utility-style detours
