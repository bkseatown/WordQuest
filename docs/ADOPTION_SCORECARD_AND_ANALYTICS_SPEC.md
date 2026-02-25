# WordQuest Adoption Scorecard + Analytics Spec

## 1) Purpose
This document defines the highest-ROI indicators for broad acceptance by:
- Teachers
- Students
- Parents/Caregivers
- Administrators

It also defines event names, payload schema, thresholds, and where to instrument in `js/app.js`.

Primary vision alignment:
- `/Users/robertwilliamknaus/Desktop/WordQuest/VISION.md`
- `/Users/robertwilliamknaus/Desktop/WordQuest/VISION_AND_DESIGN_SYSTEM.md`

## 2) North Star Metric
`Meaningful Reading Growth per 20 minutes`

Composite:
- Decoding accuracy delta
- Encoding transfer delta
- Meaning accuracy delta
- Syntax accuracy delta
- Confidence/frustration trend

Why:
- Captures both sides of the Simple View (word recognition + language comprehension).
- Prevents "just guessing words" optimization.

## 3) Indicator Set (Most Important)
Use these 12 indicators as the product scorecard.

1. First 90-Second Clarity
- Definition: New user can start and finish first playable round with no adult rescue.
- Event inputs: `wq_onboarding_complete`, `wq_round_complete`, `wq_help_opened`.
- Target:
  - Green: >= 90%
  - Yellow: 80-89%
  - Red: < 80%

2. Productive Difficulty (ZPD Fit)
- Definition: Percent of rounds within challenge band.
- Band rule (initial): won in 3-5 attempts OR loss after 5-6 with >= 1 support use.
- Event inputs: `wq_round_complete`, `wq_support_used`.
- Target:
  - Green: 70-80%
  - Yellow: 60-69% or 81-88%
  - Red: < 60% or > 88%

3. Decode -> Encode Transfer
- Definition: Performance on analogous words after target-word solve.
- Event inputs: `wq_transfer_prompt_start`, `wq_transfer_prompt_submit`.
- Target:
  - Green: +20% same-session gain
  - Yellow: +10-19%
  - Red: < +10%

4. Word -> Meaning -> Syntax Completion
- Definition: Completion rate for all 3 layers in Deep Dive sequence.
- Event inputs: `wq_deep_dive_start`, `wq_deep_dive_step_complete`, `wq_deep_dive_complete`.
- Target:
  - Green: >= 75%
  - Yellow: 60-74%
  - Red: < 60%

5. Teacher Setup Time
- Definition: Time from opening Teacher Hub to launching targeted lesson.
- Event inputs: `wq_teacher_hub_open`, `wq_target_apply`.
- Target:
  - Green: <= 120s
  - Yellow: 121-180s
  - Red: > 180s

6. Lesson Fidelity
- Definition: Selected program/week/lesson maps to intended words.
- Event inputs: `wq_target_apply`, `wq_round_start`.
- Target:
  - Green: >= 95%
  - Yellow: 90-94%
  - Red: < 90%

7. Student Affective Signal
- Definition: Replay intent, voluntary deep dive, low quit-under-stress.
- Event inputs: `wq_round_complete`, `wq_new_word_click`, `wq_deep_dive_start`, `wq_session_end`.
- Target:
  - Green: replay >= 60% and frustration exit < 10%
  - Yellow: replay 45-59% or frustration 10-15%
  - Red: replay < 45% or frustration > 15%

8. Reliability + Smoothness
- Definition: No blocking UX errors, responsive input/audio.
- Event inputs: `wq_error`, `wq_audio_play_result`, `wq_input_latency_sample`.
- Target:
  - Green: blocker rate < 0.5%, p95 input latency < 100ms
  - Yellow: blocker 0.5-1.0%, p95 100-150ms
  - Red: blocker > 1.0%, p95 > 150ms

9. Accessibility Confidence
- Definition: Usable via keyboard/focus/contrast across default + dark + one theme family.
- Event inputs: `wq_accessibility_check_snapshot` (manual QA batch event).
- Target:
  - Green: 100% checklist pass
  - Yellow: 95-99%
  - Red: < 95%

10. Parent Explainability
- Definition: Parent can state "what improved" + "what to practice next."
- Event inputs: `wq_family_report_open`, `wq_family_report_export`.
- Target:
  - Green: >= 85% positive response (survey)
  - Yellow: 70-84%
  - Red: < 70%

11. Administrator Evidence Readiness
- Definition: Weekly growth report export rate + completeness.
- Event inputs: `wq_probe_complete`, `wq_report_export`.
- Target:
  - Green: >= 90% weekly groups with complete report
  - Yellow: 75-89%
  - Red: < 75%

12. Longitudinal Growth Signal
- Definition: 4-week trend on accuracy + guess efficiency + meaning/syntax scores.
- Event inputs: `wq_probe_complete`, `wq_deep_dive_complete`.
- Target:
  - Green: positive trend on >= 3/4 indicators
  - Yellow: positive on 2/4
  - Red: positive on <= 1/4

## 4) Event Taxonomy
Event naming rule:
- prefix all events with `wq_`
- snake_case
- verb-oriented

### Session + Context
- `wq_session_start`
- `wq_session_end`
- `wq_mode_change`
- `wq_theme_change`
- `wq_music_change`

### Teaching Workflow
- `wq_teacher_hub_open`
- `wq_teacher_hub_close`
- `wq_program_select`
- `wq_week_select`
- `wq_lesson_select`
- `wq_target_apply`
- `wq_playlist_assign`

### Core Gameplay
- `wq_round_start`
- `wq_guess_submit`
- `wq_support_used`
- `wq_round_complete`
- `wq_new_word_click`

### Listening / Encoding
- `wq_listening_replay`
- `wq_listening_submit`
- `wq_voice_attempt`
- `wq_voice_feedback`

### Deep Dive
- `wq_deep_dive_open`
- `wq_deep_dive_start`
- `wq_deep_dive_step_complete`
- `wq_deep_dive_complete`

### Data/Quality
- `wq_error`
- `wq_audio_play_result`
- `wq_input_latency_sample`
- `wq_accessibility_check_snapshot`
- `wq_report_export`
- `wq_family_report_export`

## 5) Payload Contract (Required Fields)
Required on every event:
- `event_name`
- `ts_ms`
- `session_id`
- `device_id_local` (hashed local ID)
- `app_version`
- `page_mode` (`wordquest`/`mission-lab`)
- `play_style` (`detective`/`listening`)
- `grade_band`
- `focus_id`
- `lesson_pack_id`
- `lesson_target_id`

Recommended optional fields:
- `student_id_local` (hashed/alias)
- `teacher_mode` (`class`/`intervention`/`solo`)
- `word_id`
- `word_length`
- `guess_index`
- `is_correct`
- `hints_used_count`
- `duration_ms`
- `audio_mode`
- `voice_mode`
- `error_code`
- `error_stage`

Privacy guardrails:
- no raw student name
- no microphone audio upload by default
- no freeform personal text in telemetry payload

## 6) Derived Metrics Formulas
1. First 90-Second Clarity
- Numerator: sessions with `wq_round_complete` within 90s and no `wq_help_opened`
- Denominator: new sessions

2. ZPD Fit
- In-band round:
  - `is_correct && guess_index in [3..5]`
  - OR `!is_correct && guess_index == max_guesses && hints_used_count >= 1`

3. Transfer Gain
- `(post_transfer_accuracy - pre_transfer_accuracy) * 100`

4. Meaning-Syntax Completion
- Deep Dive complete where all required steps emitted `wq_deep_dive_step_complete`

5. Reliability
- blocker rate = `count(wq_error severity=blocker) / count(wq_session_start)`

## 7) Threshold Dashboard (Single View)
Render 4 stakeholder tabs:
- Teacher
- Student
- Parent
- Admin

And one combined "Adoption Health" score:
- 35% instructional outcomes
- 25% teacher workflow
- 20% student engagement
- 20% reliability/accessibility

## 8) app.js Instrumentation Map (Hook Points)
Use existing runtime functions in `/Users/robertwilliamknaus/Desktop/WordQuest/js/app.js`.

Core hooks:
- Session start/end:
  - app init block (top-level IIFE)
  - `beforeunload` handler
- Mode/theme/music changes:
  - `applyPlayStyle()`
  - `applyTheme()`
  - `syncMusicForTheme()`
- Round lifecycle:
  - where new word starts (`newGame` flow)
  - guess submit handler (enter key path)
  - reveal result completion
- Support use:
  - `focus-hint-toggle` click handler
  - clue modal open
- Teacher workflow:
  - `openTeacherPanel()`
  - lesson/focus apply handlers (`applyLessonTargetSelection`, focus search apply branch)
- Deep Dive:
  - `showChallengeModal()`
  - deep dive step actions + complete action
- Reliability:
  - service worker register catch
  - audio play catch branches
  - any existing error toast branches

## 9) Minimal Telemetry Wrapper (Drop-in Pattern)
Implement a no-op safe local queue first, then wire remote endpoint later.

```js
const WQTelemetry = (() => {
  const QUEUE_LIMIT = 500;
  const queue = [];
  function base() {
    return {
      ts_ms: Date.now(),
      app_version: window.__WQ_BUILD__ || 'local',
      page_mode: document.documentElement.getAttribute('data-page-mode') || 'wordquest',
      play_style: document.documentElement.getAttribute('data-play-style') || 'detective'
    };
  }
  function emit(eventName, payload = {}) {
    if (!eventName) return;
    queue.push({ event_name: eventName, ...base(), ...payload });
    if (queue.length > QUEUE_LIMIT) queue.shift();
  }
  function flush() { return queue.splice(0, queue.length); }
  return Object.freeze({ emit, flush });
})();
```

## 10) Phase Plan
Phase 1 (now):
- Add wrapper + 12 core events only.
- Log to memory/localStorage.
- Build one internal scorecard panel in Teacher Hub.

Phase 2:
- Add weekly lesson fidelity checks.
- Add parent/admin export summary cards.

Phase 3:
- Add adaptive policy loop:
  - increase/decrease difficulty based on ZPD fit and affective signal.

## 11) Acceptance Criteria
1. Event schema contract documented and versioned.
2. 12 indicators compute without manual spreadsheet work.
3. Stakeholder tabs show meaningful weekly trend.
4. No noticeable gameplay lag from instrumentation.
5. No personal student data leakage in payloads.

