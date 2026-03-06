# Cornerstone MTSS — Handover for Multi-AI Development

## 🎯 Current State (as of 2026-03-06)

**Project:** Teacher command hub for MTSS (Multi-Tiered System of Supports) intelligence
**Latest Commit:** `8e56edcd` — Phase 16: Domain-specific performance levels, confidential plans
**Architecture:** Parallel two-panel hub (NOT replacing v1 yet); Phase 2 complete → Phase 4 in progress
**Repo Structure:** **SINGLE main repo only** (worktree deleted for clarity)
**Dev Server:** `npx serve -l 4242 .` (main repo, only one needed)

### Phase 16 ✅ COMPLETE
Implemented domain-specific performance tracking with privacy-protected plan types:
- **4-level rubric:** 1=Emerging, 2=Approaching, 3=Meeting, 4=Exemplary
- **Demo data:** Sample goals per domain + support plans (IESP, IP, BIP) for all 5 demo students
- **UI:** Add Student form with level dropdowns + confidential plan section in View Details drawer
- **Privacy:** Plan types (IESP/IP/IAP/BIP/504) hidden from sidebar; only visible in locked drawer
- **Storage:** `localStorage["cs.goals.v1"]` for goals; `student.plans` array in Evidence store

---

## 📋 Critical Architectural Patterns (DO NOT BREAK)

### 1. **HubState ↔ HubContext Flow** (Phase 1b-2)
```
User action → HubState.set({context, session, ui, intelligence})
           ↓
      HubContext listens → auto-computes intelligence via Evidence + Plan engines
           ↓
      HubState subscriber fires → UI re-renders (renderFocusCard, openDrawer, etc.)
```
**Why:** Decouples UI from intelligence; allows intelligent features to auto-trigger without tight coupling.
**Keep:** Always dispatch state changes via `hubState.set()`, never directly mutate state.

### 2. **Evidence Store is Source of Truth** (js/evidence-store.js)
```
window.CSEvidence.upsertStudent({id, name, plans, gradeBand, ...})
window.CSEvidence.appendSession(studentId, module, {accuracy, wpm, ...})
window.CSEvidence.getStudentSummary(studentId) → {student, summary, lastSession, evidenceChips}
```
**Why:** Central location for all session data and student records; enables rollup stats and MTSS decisions.
**Keep:** NEVER store student state outside CSEvidence (except localStorage for goals/plans).

### 3. **Goal Storage Pattern** (localStorage)
```javascript
localStorage["cs.goals.v1"] = JSON.stringify({
  "student-id": [
    {domain: "reading", skill: "ORF Fluency", level: 2},
    {domain: "math", skill: "Addition Facts", level: 3}
  ]
})
```
**Why:** Lightweight client-side storage; survives page reload; not synced to server (teacher's local state).
**Keep:** Always validate level is 1-4; domain is one of [reading, math, writing, behavior]; skill is string.

### 4. **Plan Storage Pattern** (Evidence record)
```javascript
Evidence.upsertStudent({id: "s123", name: "Maya", plans: ["IESP", "BIP"]})
// Retrieved via: Evidence.getStudentSummary().student.plans
```
**Why:** Plans are persistent student metadata; tied to Evidence store; auto-saved on drawer change.
**Keep:** Plans array always defined (empty [] if no plans); never undefined.

### 5. **CSS Naming Convention** (BEM + Semantic)
- `.th2-*` = Teacher Hub v2 component
- `.th2-*-head` = header section
- `.th2-*-body` = content section
- `.th2-tier-*`, `.th2-level-*` = tier/level chips
- `.is-*` = state class (is-selected, is-open, is-active)
- `data-*` = element data attributes (data-tier, data-level, data-id, etc.)

**Why:** Predictable scoping prevents style leaks; state classes separate from structure.
**Keep:** Never use !important; use data-* for element-specific logic.

### 6. **Cache Busters** (query string versioning)
All CSS/JS in HTML use `?v=YYYYMMDDX` where X increments per day's changes.
```html
<link rel="stylesheet" href="./teacher-hub-v2.css?v=20260306f">
<script src="./teacher-hub-v2.js?v=20260306f"></script>
```
**Why:** Browser caches aggressively; cache buster forces fresh fetch on deploy.
**Keep:** Bump ALWAYS after JS/CSS changes; test preview.microsoft.com (live URL) after bump.

---

## ⚠️ Regression Prevention Checklist

### Before Committing ANY Changes:
- [ ] **HubState flow intact?** Check `hubState.set()` calls still dispatch; subscribers still fire.
- [ ] **Evidence store unchanged?** Never modify Evidence interface; only extend (add new `appendSession` params = OK; remove params = BREAK).
- [ ] **localStorage keys consistent?** "cs.goals.v1" always; version bump if schema changes.
- [ ] **CSS scoped to .th2-*?** No global styles that might bleed into `.teacher-dashboard` or `.word-quest`.
- [ ] **Cache busters bumped?** v=20260306g in ALL HTML files after EVERY change.
- [ ] **Demo data survives?** `ensureDemoCaseload()` still populates correctly; demo badge appears.
- [ ] **Only main repo changed?** No worktrees, no side branches—just main.

### Testing Workflow:
```bash
# 1. Make changes in main repo
cd /Users/robertwilliamknaus/Desktop/WordQuest/
# edit teacher-hub-v2.js, teacher-hub-v2.css, etc.

# 2. Bump cache buster in HTML files
# Change: v=20260306f → v=20260306g (or next letter)

# 3. Test locally
npx serve -l 4242 .
# Open http://127.0.0.1:4242/teacher-hub-v2.html

# 4. Hard refresh in browser
# Cmd+Shift+R (macOS) or Ctrl+Shift+R (Windows/Linux)

# 5. Verify you see the latest changes
# If not, hard refresh again + check cache buster in HTML

# 6. Commit only after changes verified
git add -A && git commit -m "..."
```

---

## 💡 ROI Recommendations (High-Impact, Quick Wins)

### Phase 17: Google OAuth + Classroom Sync ⭐⭐⭐ BLOCKING PILOT
**Impact:** Enables teacher roster auto-population; unblocks pilot with school districts.
**Effort:** 2–3 hours (all boilerplate, documented in Phase 15 plan).
**Implementation:**
1. User creates Google Cloud project (2 min) + gets Client ID
2. Create `js/auth/google-auth.js` (GIS library, localStorage token storage)
3. Create `js/auth/google-classroom.js` (roster fetch + sync to Evidence.upsertStudent)
4. Wire "Sync from Classroom" button in hub sidebar
5. Test with school Google Workspace account (e.g., @sas.edu.sg domain)

**Why ROI:** School districts require Google/Microsoft integration for trust + adoption.
**Code Path:** `teacher-hub-v2.html` button → `openGoogleSignin()` → `CSGoogleClassroom.syncRoster()` → `Evidence.upsertStudent()` for each student.

### Phase 18: Curriculum Quick-Reference Panel ⭐⭐⭐ CONTENT HUB
**Impact:** Teachers access 54 Fish Tank units + 3 assessment types (ORF, Pam Harris, screeners) in one place.
**Effort:** 4–5 hours (data + UI).
**Implementation:**
1. Create `data/curriculum-extended.json` (all 54 FT units + 8 curricula with summaries + deep links)
2. Create `data/assessment-library.json` (45 ORF passages + 90 number talks + 72 screeners with timers)
3. Create `js/curriculum-panel.js` (modal/drawer with 3 tabs: Resources, Assessments, Videos)
4. Wire "📚 Curriculum" button in hub sidebar
5. Hook curriculum panel to student grade for filtering

**Why ROI:** Teachers are drowning in scattered curriculum PDFs; centralizing with deep links + assessment timers is immediate value.
**Code Path:** Same pattern as View Details drawer; `.th2-drawer` class; tabs with `data-tab` attribute.

### Phase 19: Azure TTS Coaching Narration ⭐⭐ DELIGHT
**Impact:** Polished UX; coach recommendations read aloud (warm, professional voice).
**Effort:** 2–3 hours (template mapping + TTS integration).
**Implementation:**
1. Choose Azure Speech Studio voice (e.g., `en-US-AriaNeural`) + generate ~120 narration templates
2. Create `js/tts-provider.js` (lazy-load Azure SDK; cache audio blobs in localStorage)
3. Wire "🔊 Hear recommendation" button in focus card
4. Map plan engine outputs to narration templates (e.g., "MTSS Tier 2 → Intensive small-group" → pre-recorded clip)

**Why ROI:** Accessibility + professionalism; coaches perceive system as more "intelligent"; increases trust in recommendations.
**Code Path:** `buildLiveSignalPills()` → add `<button>🔊</button>` → click → `TTS.narrate(recommendedMove)`.

### Phase 20: Sub-Plan Executor + Session Auto-Log ⭐ AUTO-WORKFLOW
**Impact:** Reduce teacher friction; auto-populate session log from student activity data.
**Effort:** 3 hours (data flow + UI polish).
**Implementation:**
1. Extend `Evidence.appendSession()` to accept `source: "auto"` flag
2. Wire sub-plan executor to student interactions (e.g., Word Quest session → auto-log with accuracy/WPM)
3. Show "Auto-logged session from Word Quest" toast + pre-fill drawer Quick Log with extracted data
4. Let teacher edit/confirm before save

**Why ROI:** Teachers spend ~10 min per student per week logging sessions manually; automation saves 50+ hours per year per teacher.

---

## 🛠️ Implementation Guidance for Other AIs

**CRITICAL:** Worktree has been deleted. Work ONLY in main repo.

### Using ChatGPT / Codex / Gemini to Continue:

**DO:**
```
"I'm building a teacher command hub for reading intervention.

REPO STRUCTURE:
- ONE repo: /Users/robertwilliamknaus/Desktop/WordQuest/
- ONE branch: main
- NO worktrees, NO parallel branches
- Test server: npx serve -l 4242 .

CURRENT FEATURES (Phase 16 complete):
- Teacher-hub-v2 hub with student caseload + focus card
- Domain-specific performance tracking (1–4 levels per subject)
- Confidential support plans (IESP/IP/BIP) hidden from sidebar
- Evidence store in localStorage for sessions + students
- HubState subscription model for UI updates
- Goal storage: localStorage['cs.goals.v1']

NEXT PHASES (in order):
1. Phase 17: Google OAuth + Classroom roster sync (PILOT BLOCKER)
   → See .claude/PHASE_17-20_IMPLEMENTATION.md for complete code
2. Phase 18: Curriculum Panel (54 units + assessments)
3. Phase 19: Azure TTS narration
4. Phase 20: Session auto-log

I need to implement [Phase 17 | Phase 18 | etc.].
Here's the complete implementation guide with code: .claude/PHASE_17-20_IMPLEMENTATION.md
What's the best way to integrate this without breaking the HubState flow?"
```

**DON'T:**
```
❌ "Create a worktree or parallel branch"
❌ "Work anywhere but the main repo"
❌ "Rewrite the entire app in React"
❌ "Use a CSS framework"
❌ "Add a server/database"
❌ "Store personal data in URLs"
❌ "Forget to bump cache busters (?v=20260306f → g)"
❌ "Mutate HubState outside of hubState.set()"
```

### Code Review Checklist for Each Phase:
1. **State Flow:** Does `hubState.set()` trigger the right intelligence recompute?
2. **Privacy:** No student email/ID in URL params or localStorage outside Evidence store?
3. **Evidence Schema:** Any new session fields documented + backward-compatible?
4. **CSS Scope:** All new styles under `.th2-*` or restricted selector?
5. **Cache Buster:** Bumped in index.html + teacher-hub-v2.html?
6. **Demo Data:** `ensureDemoCaseload()` still works + shows meaningful data?
7. **Offline:** Feature works after browser reload without server call?
8. **Tests:** Manual test on both main repo (port 4242) and worktree (port 4243).

---

## 📁 File Inventory & Purposes

### Core Hub Files (Teacher Hub v2)
| File | Purpose | Touch? |
|------|---------|--------|
| `teacher-hub-v2.html` | Hub shell + sidebar + drawer templates | ✅ Layout changes only |
| `teacher-hub-v2.js` | Hub logic, state dispatch, rendering | ✅ Add event handlers, render functions |
| `teacher-hub-v2.css` | Hub styling (2-panel layout, cards, chips) | ✅ Add component styles; maintain naming |

### State Management
| File | Purpose | Touch? |
|------|---------|--------|
| `js/dashboard/hub-state.js` | HubState singleton + setter | ❌ Read-only (unless extending schema) |
| `js/dashboard/hub-context.js` | Auto-compute intelligence on state change | ❌ Read-only (unless new intelligence type) |

### Data Stores
| File | Purpose | Touch? |
|------|---------|--------|
| `js/evidence-store.js` | Student + session records (source of truth) | ❌ Read-only interface; extend with care |
| `js/evidence-engine.js` | MTSS tier + trend computation | ❌ Read-only |
| `js/plan-engine.js` | Recommendation + coaching logic | ✅ Extend with new plan types |
| `js/ai-planner.js` | Azure OpenAI integration (optional) | ✅ Add new prompts; upgrade models |

### Utilities
| File | Purpose | Touch? |
|------|---------|--------|
| `js/alignment-loader.js` | Load curriculum alignment data | ✅ For Phase 18 (curriculum panel) |
| `js/data-registry.js` | Async asset loader | ✅ For Phase 18 (load assessment library) |
| `js/support-store.js` | Persist teacher support needs per student | ✅ Extend with new domain types |

### Config Files (USER CREATES)
| File | Purpose | Where? |
|------|---------|--------|
| `js/ai-config.js` | Azure OpenAI endpoint + key | Gitignored; user creates |
| `js/google-auth-config.js` | Google OAuth Client ID | Gitignored; user creates (Phase 17) |

---

## 🚀 Next Phases (Priority Order)

### Phase 17: Google OAuth ✅ PILOT BLOCKER
- **Prerequisite:** User must create Google Cloud project + provide Client ID
- **Expected complexity:** 2–3 hours
- **Success metric:** Classroom roster syncs to caseload; demo shows "Sync from Classroom" button

### Phase 18: Curriculum Panel ✅ HIGH VALUE
- **Data to create:** 54 Fish Tank units, 3 assessment types (45 ORF + 90 number talks + 72 screeners)
- **Expected complexity:** 4–5 hours
- **Success metric:** "📚 Curriculum" button opens panel; all 3 tabs render; searches work; assessments have timers

### Phase 19: Azure TTS ✅ DELIGHT
- **Prerequisite:** Azure Speech resource + remaining budget check ($100+)
- **Expected complexity:** 2–3 hours
- **Success metric:** "🔊 Hear recommendation" plays 5–10 pre-recorded coaching clips; caching works

### Phase 20: Session Auto-Log ✅ AUTO-WORKFLOW
- **Prerequisite:** Word Quest integration for extracting session data
- **Expected complexity:** 3 hours
- **Success metric:** Student completes Word Quest session → auto-log appears in drawer; teacher confirms/edits

### Phase 21: Admin/Specialist Routes ✅ B2B READY
- **New paths:** `teacher-dashboard.html?role=admin` for caseload review + reporting
- **Expected complexity:** 3–4 hours
- **Success metric:** Admin sees all teachers' students; filter by tier; export CSV

### Phase 22: Progress Tracking + Analytics ✅ INSIGHTS
- **Metrics:** Student growth over time; intervention effectiveness; resource utilization
- **Expected complexity:** 4–5 hours
- **Success metric:** "Analytics" tab shows charts; downloadable reports

---

## 🔐 Privacy & Compliance Reminders

### FERPA Checklist:
- ✅ Plan types (IESP/IP/IAP/BIP/504) NOT visible in default sidebar
- ✅ No student email in URLs
- ✅ No PII in localStorage outside Evidence store
- ✅ Support data (goals/plans) encrypted if synced to server (Phase 4+)

### Data Residency:
- Classroom data: Only in-memory during sync; not persisted unless teacher saves
- Session data: localStorage + Evidence store (teacher's computer); not synced unless Phase 4 server
- Audio (TTS): Cached locally; not uploaded

---

## 📞 Common Issues & Solutions

### Issue: Preview (port 4243) doesn't match main repo (port 4242)
**Root:** Worktree not synced after changes.
**Fix:** `cp teacher-hub-v2.js .claude/worktrees/inspiring-sinoussi/` + bump cache buster.

### Issue: `hubState.set()` not triggering intelligence recompute
**Root:** HubContext subscriber not wired; or Intelligence subscription fired before Intelligence computed.
**Fix:** Check `hubState.subscribe()` in teacher-hub-v2.js; ensure HubContext fires AFTER state.set().

### Issue: Demo students don't show up
**Root:** `ensureDemoCaseload()` not called in `boot()` OR demo mode flag not set.
**Fix:** Check `isDemoMode` flag; ensure localStorage["cs.hub.demo"] is "1".

### Issue: Cache buster not working; old CSS still loads
**Root:** Browser cache TTL > version diff; or CDN caching.
**Fix:** Hard refresh (Cmd+Shift+R); clear browser cache; confirm HTML has new ?v= value.

---

## 📚 Documentation Files

| File | Purpose | Read First? |
|------|---------|-------------|
| `MEMORY.md` | Session memory for Claude (state of worktree, config, globals) | 🟢 Always |
| `phase-15-completion.txt` | Phase 15 summary (context before Phase 16) | 🟡 If Phase 16+ unclear |
| `.claude/plans/wiggly-wondering-pancake.md` | Full Phase 15 plan (Google OAuth + Curriculum Panel specs) | 🔵 For Phase 17–18 |

---

## ✅ Final Checklist Before Handing Off

- [x] Phase 16 commit created + code review passed
- [x] Demo data includes sample goals + plans for all 5 students
- [x] Cache busters bumped (v=20260306f)
- [x] **Worktree DELETED** — single main repo only
- [x] Git log shows clean commit history (30+ commits ahead of origin/main)
- [x] `.gitignore` includes `js/ai-config.js` + `js/google-auth-config.js`
- [x] HubState flow tested (click student → intelligence renders → view details opens)
- [x] Privacy verified (plan types hidden from sidebar; only in drawer)
- [x] Phases 17-20 complete implementation guide created (PHASE_17-20_IMPLEMENTATION.md)

---

## 🎓 Key Learnings for Multi-AI Development

1. **Preserve HubState flow:** All state changes go through one source. Don't scatter state mutations.
2. **Evidence store is sacred:** It's the SSoT (source of single truth). Respect its interface.
3. **CSS naming prevents conflicts:** .th2-* scoping works because no other part of the app uses it.
4. **Cache busters are critical:** Forgetting them causes "works for me, not for user" bugs.
5. **Demo data validates the flow:** If demo data breaks, the feature is broken. Always test demo mode.
6. **Privacy-first design:** FERPA compliance isn't an afterthought; it's a first-class concern.

---

## 📞 Contact Points for Clarification

If using other AIs and you hit ambiguity on:
- **State flow questions:** Reference `hub-state.js` line 1–50 + `hub-context.js` subscription logic
- **Evidence schema:** Reference `evidence-store.js` upsertStudent() + appendSession() signatures
- **Goal/plan storage:** Reference `teacher-hub-v2.js` lines 85–140 (constants) + 900–1100 (helper functions)
- **CSS patterns:** Reference `teacher-hub-v2.css` lines 52–150 (shell) + 1714–1835 (form).

---

**Go build something great! 🚀**
