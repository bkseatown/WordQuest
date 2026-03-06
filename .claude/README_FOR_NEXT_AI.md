# ✅ Complete Handoff Package for Next AI Agent

**Date:** 2026-03-06
**Current Phase:** 16 (COMPLETE) — Domain-specific performance levels + confidential plans
**Next Priority:** Phase 17 (Google OAuth) — PILOT BLOCKER
**Repo Status:** Single main branch only (worktree deleted, no complexity)

---

## 📦 What's In This Package

You now have:

1. **Clean Repo Structure**
   - Single `/Users/robertwilliamknaus/Desktop/WordQuest/` repo
   - Only `main` branch
   - Worktree deleted (was causing sync confusion)
   - No parallel versions to worry about

2. **Phase 16 Complete** ✅
   - Domain-specific tiers (Reading, Math, Writing, Behavior/SEL)
   - 4-level performance rubric (1=Emerging, 2=Approaching, 3=Meeting, 4=Exemplary)
   - Privacy-protected support plans (IESP, IP, BIP, etc.) hidden from sidebar
   - Demo data with realistic plans + goals for all students
   - CSS styling complete

3. **Phases 17-20 Ready for Integration**
   - Complete code snippets for Google OAuth (Phase 17)
   - Complete data structure for Curriculum Panel (Phase 18)
   - Guidance for Azure TTS (Phase 19) + Session Auto-Log (Phase 20)
   - All in: `.claude/PHASE_17-20_IMPLEMENTATION.md`

4. **Clear Documentation**
   - `HANDOVER_PROMPT.md` — Architectural patterns + regression prevention
   - `PHASE_17-20_IMPLEMENTATION.md` — Step-by-step code + integration guide
   - This file — What you need to know

---

## 🎯 Your Job (Next AI Agent)

### Priority 1: Implement Phase 17 (Google OAuth) ⭐⭐⭐
**Why:** Unblocks school district pilot. Teachers can import Classroom roster with one click.
**Files:** `js/auth/google-auth.js` + `js/auth/google-classroom.js`
**Setup Time:** 2–3 hours
**Reference:** `.claude/PHASE_17-20_IMPLEMENTATION.md` — Complete code provided

**Steps:**
1. Create `js/auth/google-auth.js` (195 lines of code provided)
2. Create `js/auth/google-classroom.js` (160 lines of code provided)
3. Add script tags to `teacher-hub-v2.html`
4. Wire auth chip + sign-in button in `teacher-hub-v2.js`
5. Wire "Sync from Classroom" button
6. Test with personal Google account first, then school account
7. Bump cache buster: v=20260306f → v=20260306g
8. Commit to main

### Priority 2: Implement Phase 18 (Curriculum Panel) ⭐⭐
**Why:** Teachers immediately see value. Central hub for 54 units + assessments.
**Setup Time:** 4–5 hours
**Reference:** `.claude/PHASE_17-20_IMPLEMENTATION.md` — Data structures provided

**Key Steps:**
1. Create `data/curriculum-extended.json` with all 54 Fish Tank units
2. Create `js/curriculum-panel.js` (modal/drawer with 3 tabs)
3. Wire "📚 Curriculum" button in sidebar
4. Filter by student grade
5. Test panel opens/closes, searches work

### Priority 3-4: Phases 19-20 (As Time Permits)
- **Phase 19:** Azure TTS narration (polish)
- **Phase 20:** Session auto-log from Word Quest (automation)

---

## ⚠️ Critical Rules (Don't Break These)

### Rule 1: HubState Flow is Sacred
All UI updates: `hubState.set()` → HubContext recomputes → subscriber fires → render

**DO:**
```javascript
hubState.set({ context: { studentId: "s_123" } });
```

**DON'T:**
```javascript
hubState.context.studentId = "s_123"; // ❌ Mutation breaks subscribers
```

### Rule 2: Evidence Store is Source of Truth
Never duplicate student/session data elsewhere.

**DO:**
```javascript
Evidence.upsertStudent({ id: "s_123", name: "Ava", plans: ["IESP"] });
```

**DON'T:**
```javascript
myStudentList.push({ id: "s_123" }); // ❌ Duplicate data
```

### Rule 3: Cache Busters Are Non-Negotiable
Forget this, users will see old code.

**DO:**
```html
<link rel="stylesheet" href="./teacher-hub-v2.css?v=20260306g">
```

**DON'T:**
```html
<link rel="stylesheet" href="./teacher-hub-v2.css"> <!-- ❌ Browser caches forever -->
```

After EVERY JS/CSS change: bump the letter (f → g → h).

### Rule 4: One Repo, One Branch
No worktrees, no side branches, no "I'll test on a different copy."

**DO:**
```bash
cd /Users/robertwilliamknaus/Desktop/WordQuest/
# Make changes here only
npx serve -l 4242 .
```

**DON'T:**
```bash
# Don't create worktrees, branches, or multiple copies
```

### Rule 5: Test Before Committing
1. Make change
2. Bump cache buster
3. Run `npx serve -l 4242 .`
4. Hard refresh: Cmd+Shift+R
5. Verify you see the latest
6. Then commit

---

## 📋 What NOT to Do

❌ Rewrite anything in React/Vue/Angular
❌ Add a backend server or database
❌ Store PII in URLs or localStorage (except Evidence store)
❌ Forget cache busters
❌ Mutate HubState directly
❌ Create worktrees or parallel branches
❌ Touch `.claude/launch.json` (dev server config)
❌ Commit `js/google-auth-config.js` (user creates it)

---

## ✅ Testing Checklist

After completing Phase 17:
- [ ] "🔐 Sign in with Google" button appears
- [ ] Google popup shows when clicked
- [ ] User name + picture shown after sign-in
- [ ] "Sign out" works
- [ ] "📚 Sync from Classroom" button appears (if signed in)
- [ ] Courses dropdown shows real Google Classroom courses
- [ ] Classroom roster imports to caseload
- [ ] Demo still works (sign-in is optional)
- [ ] Hard refresh shows latest changes
- [ ] Local storage preserved after reload

---

## 🔗 Key Files Reference

| File | Purpose | Touch? |
|------|---------|--------|
| `teacher-hub-v2.html` | Hub shell + layout | ✅ Add auth chip + curriculum btn |
| `teacher-hub-v2.js` | Hub logic + rendering | ✅ Add auth + curriculum wiring |
| `teacher-hub-v2.css` | Hub styling | ✅ Add auth + curriculum styles |
| `js/dashboard/hub-state.js` | State singleton | ❌ Read-only |
| `js/evidence-store.js` | Student records | ❌ Read-only interface |
| `js/auth/google-auth.js` | (NEW) OAuth module | ✅ Create from PHASE_17-20_IMPLEMENTATION.md |
| `js/auth/google-classroom.js` | (NEW) Classroom API | ✅ Create from PHASE_17-20_IMPLEMENTATION.md |
| `data/curriculum-extended.json` | (NEW) Curriculum data | ✅ Create for Phase 18 |
| `.claude/PHASE_17-20_IMPLEMENTATION.md` | Complete code + steps | 🔵 Reference guide |

---

## 🚀 Git Workflow

```bash
# 1. Make changes
vim teacher-hub-v2.js
vim teacher-hub-v2.html  # Bump cache buster

# 2. Test
npx serve -l 4242 .
# Verify in browser

# 3. Commit
git add -A
git commit -m "Phase 17: Google OAuth implementation

- Create js/auth/google-auth.js (GIS OAuth flow)
- Create js/auth/google-classroom.js (roster fetch)
- Wire sign-in button + auth chip in sidebar
- Wire 'Sync from Classroom' button
- Test with personal Gmail + school Workspace account

Phase 17 unblocks teacher pilot with districts."

# 4. (Attempted push will likely fail due to large file limit)
# Don't worry—local main branch is what matters for your browser
```

---

## 💬 How to Ask for Help (Template)

If stuck, use this template for asking AI:

```
"I'm implementing Cornerstone MTSS teacher hub (vanilla JS, no frameworks).
Current repo: /Users/robertwilliamknaus/Desktop/WordQuest/ (main branch only)

Status: Phase 17 (Google OAuth) implementation

I'm trying to [specific task].

Here's what I did:
[code snippet or description]

Expected behavior: [what should happen]
Actual behavior: [what's happening instead]

Error message (if any): [paste error]

Reference files:
- .claude/PHASE_17-20_IMPLEMENTATION.md (has all code)
- HANDOVER_PROMPT.md (has architecture)

Architecture I need to preserve:
- HubState.set() dispatch → HubContext recompute → subscriber renders
- Evidence store is source of truth for students/sessions
- localStorage['cs.goals.v1'] for goal storage

What's the best way to [solve this problem]?"
```

---

## 📚 Documentation You Have

1. **HANDOVER_PROMPT.md**
   - Architectural patterns (HubState, Evidence, localStorage)
   - Regression prevention checklist
   - File inventory
   - Key learnings

2. **PHASE_17-20_IMPLEMENTATION.md**
   - Complete code for Phases 17-20
   - Step-by-step integration
   - Test checklist
   - Commit messages

3. **MEMORY.md** (in `.claude/projects/...`)
   - Session context (worktree, dev server, globals)
   - Should be refreshed after Phase 17 complete

---

## 🎓 Learning Path

**To understand the architecture:**
1. Read HANDOVER_PROMPT.md (15 min)
2. Open `js/dashboard/hub-state.js` + `hub-context.js` (10 min)
3. Open `js/evidence-store.js` (5 min)
4. Open `teacher-hub-v2.js` lines 1–200 (10 min)

**Then:**
1. Read PHASE_17-20_IMPLEMENTATION.md (20 min)
2. Create files in order (Google auth first)
3. Test locally
4. Commit

---

## 🏁 Success Criteria

You'll know Phase 17 is done when:
- ✅ User can click "🔐 Sign in with Google"
- ✅ Google OAuth popup appears
- ✅ User name + picture shown after sign-in
- ✅ Token persists across page reload
- ✅ "Sign out" clears session + reloads
- ✅ "Sync from Classroom" imports roster
- ✅ Demo mode still works (auth is optional)
- ✅ No errors in browser console
- ✅ Cache buster bumped
- ✅ Commit on main branch

---

**You've got everything you need. Go build! 🚀**
