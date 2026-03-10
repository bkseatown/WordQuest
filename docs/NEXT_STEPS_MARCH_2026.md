# Next Steps for Cornerstone MTSS — March 2026
**Last Updated:** March 6, 2026
**Status:** All Phase 15 visual bugs fixed. Ready for Phase 16.

---

## What's Completed (Phase 15: Bug Fixes & Polish)

✅ **Critical Bug Fixes:**
- JS IIFE syntax error (line 2889) — hub now boots correctly
- Tour auto-launch removed — no content-blocking popups
- Mobile double-scroll fixed — single unified scroll
- Mobile footer overlap fixed — all students visible
- Azure cost dashboard auto-show removed
- Browser cache issues fixed — all files reload fresh

✅ **Visual Polish:**
- Light cool-gray gradient background applied universally (#e8edf4 → #dce4ee → #d1dae8)
- Build badge de-emphasized to ghost style (opacity 0.5, 9px font)
- Dark background issue resolved

✅ **Documentation:**
- README updated with Phase 15 changelog
- Regression guardrails documented in `REGRESSION_GUARDRAILS.md`
- All changes pushed to GitHub (`origin/claude/inspiring-sinoussi`)

---

## Recommended Next: Phase 16 (Strength-Based Tier System)

### 16.1 — Replace Red Tier Labels with Growth-Focused Colors

**Why:** Red communicates "alarm" and conflicts with strength-based philosophy. Your system is about growth, not deficits.

**Current Colors:**
| Tier | Current | Perception |
|------|---------|-----------|
| T3 (Needs most support) | 🔴 Red (#c41e3a) | "Bad" / "Failing" |
| T2 (On track) | 🟡 Yellow (#f4c978) | "Caution" / "Warning" |
| T1 (Proficient) | 🟢 Green (#4e8d6a) | "Good" / "Safe" |

**Proposed: Growth Mindset Colors**
| Tier | New Label | Color | Philosophy |
|------|-----------|-------|-----------|
| T3 | Emerging | 🟠 Gold (#d97706) | "Just beginning, lots of potential" |
| T2 | Developing | 🟣 Purple (#7c3aed) | "Making progress, growing" |
| T1 | Proficient | 🔵 Blue (#0369a1) | "Mastery achieved, ready for challenge" |

**Implementation (Estimated 2 hours):**

1. **Update token colors** in `style/tokens.css`:
   ```css
   --status-emerging: #d97706;    /* was --status-risk */
   --status-developing: #7c3aed;  /* was --status-intensify */
   --status-proficient: #0369a1;  /* was --status-secure */

   --bg-emerging: #fef3c7;   /* lighter gold for card backgrounds */
   --bg-developing: #e9d5ff; /* lighter purple */
   --bg-proficient: #bae6fd; /* lighter blue */
   ```

2. **Update label text** in JS files:
   - `js/tier-engine.js` — change tier display names
   - `teacher-hub-v2.js` — update badge labels in morning brief
   - `teacher-dashboard.html` — change T1/T2/T3 labels to Proficient/Developing/Emerging

3. **Update CSS color references:**
   - `style/components.css` — tier stripe backgrounds
   - `style/premium-theme.css` — card backgrounds
   - `teacher-hub-v2.css` — tier indicators

4. **Visual testing:**
   - Verify all tier colors render correctly on light background
   - Test on mobile (375px) — colors should be equally visible
   - Verify print-friendly (if you export PDFs)

5. **Stakeholder communication:**
   - Email teachers: "We've renamed tiers to reflect growth mindset: Emerging → Developing → Proficient"
   - Update documentation
   - Brief student-facing language (if applicable)

**Guardrails:**
- Run `npm run test:visual` to catch any color changes
- Check all tier-colored elements on both desktop and mobile
- Verify sufficient contrast ratios for accessibility (WCAG AA minimum 4.5:1)

---

## Phase 17 Option A: Google Classroom + OAuth (If Desired)

Your plan file includes a detailed Phase 15 plan for this. Only pursue if you want roster sync functionality.

**Scope:**
- Google Identity Services OAuth (free, no server)
- Classroom API roster sync
- Estimated: 6-8 hours

**Files to create:**
- `js/auth/google-auth.js`
- `js/auth/google-classroom.js`
- `js/google-auth-config.js` (user provides Client ID)

**UI changes:**
- Home page: "Sign in with Google" button
- Teacher hub: Avatar chip + "Sync from Classroom" button

**Decision point:** Do you want this before the pilot, or is it optional?

---

## Phase 17 Option B: Curriculum Reference Panel

**Why:** Teachers need quick access to all 54 Fish Tank units, assessment batteries, and curated resources without leaving the hub.

**Scope:**
- Build curriculum data JSON files (Fish Tank units, IM, UFLI, Bridges, etc.)
- Create slide-in panel with three tabs: Resources | Assessments | Videos
- Integrate alignment-loader for deep linking
- Estimated: 8-10 hours

**MVP Features:**
- Fish Tank unit grid with deep links to fishtanklearning.org
- ORF fluency passages with Lexile levels and timer
- Pam Harris number talk sequences
- YouTube links (Khan Academy, phonics, math, etc.)

**Advanced:**
- AI-generated passages (if Azure OpenAI configured)
- Print-friendly assessment cards

**Decision point:** Is curriculum reference essential for pilot, or nice-to-have?

---

## Phase 18: Tier Color Refinement in Planning UI

Once tier labels are updated, ensure planning-related UI reflects new terminology:

**Files to audit:**
- `js/plan-engine.js` — coaching narration mentioning tiers
- `js/ai-planner.js` — AI-generated plans using tier language
- Any templates or prompt examples mentioning "T1/T2/T3"

**Example coaching narration update:**
```javascript
// BEFORE:
"This student is in Tier 3 — high risk for literacy gaps."

// AFTER:
"This student is Emerging in [skill] — let's support their growth with scaffolded practice."
```

---

## Phase 19: Performance & Analytics

Once the hub is stable, measure and optimize:

**Metrics to track:**
- Time-to-interactive (TTI): Should be < 2 seconds on 3G
- Core Web Vitals (LCP, CLS, FID)
- Accessibility score (Lighthouse A11y)
- Student usage patterns (which features are actually used?)

**Tools:**
- Lighthouse CI: `npm run audit:performance`
- Axe-core: `npm run audit:a11y`
- Google Analytics (optional, if you want aggregate usage data)

---

## Tier 0 Immediate Actions (Before Pilot)

**Do these this week:**

### 1. Test All Pages at Realistic Breakpoints
- [ ] Desktop (1280px, 1920px)
- [ ] Tablet (768px, 1024px)
- [ ] Mobile (375px, 414px)
- [ ] Verify footer doesn't overlap content anywhere

**Tools:**
```bash
npm run test:mobile:layout   # automated
# Manual: use Chrome DevTools device emulation
```

### 2. Smoke Test Teacher Workflows

**Teacher hub (Command Hub):**
- [ ] Demo mode loads automatically
- [ ] 5 students populate sidebar
- [ ] Morning brief renders with urgency ranking
- [ ] Click on student → focus card appears
- [ ] No console errors on startup

**Teacher dashboard (v1):**
- [ ] Search works
- [ ] Select student → dashboard loads
- [ ] Tier/confidence snapshot displays
- [ ] "Start Recommended Session" button clickable

**Command:**
```bash
npm run test:smoke
```

### 3. Verify Cache Buster Consistency

Ensure all files use same version:
```bash
grep -h 'v=[a-zA-Z0-9]*' *.html | sort | uniq
# Should return only ONE line, e.g., "v=20260306a"
```

### 4. Test on Real Devices (If Possible)

- [ ] iPad (tablet breakpoint)
- [ ] iPhone (mobile)
- [ ] Android (mobile)
- [ ] Verify touch interactions work smoothly

---

## Tier 1: Enhancements (Pilot Nice-to-Have)

In order of impact:

### 1. Tour Auto-Resume Fix
If teacher starts tour, navigates away, comes back → tour should resume where it left off (not restart)

**File:** `js/onboarding-tour.js`
**Estimated:** 1 hour

### 2. Curriculum Quick-Reference (Phase 17B MVP)
Essential for pilot feedback — teachers will ask "Where's the math curriculum mapping?" within 5 minutes

**File:** New `js/curriculum-panel.js`
**Estimated:** 6 hours

### 3. Visible Tier Labels on Student Cards
Currently shows "T3" badge but not the label "Emerging" — adding label helps new users understand tier system

**File:** `teacher-hub-v2.js` (student card template, ~20 lines)
**Estimated:** 30 mins

### 4. Printable Evidence Summary
Teachers want to print a student's monthly evidence snapshot for parent-teacher conferences

**File:** New `js/export-evidence.js` or CSS print styles
**Estimated:** 2 hours

---

## Known Limitations (Document for Stakeholders)

**Be transparent about what's NOT ready:**

1. **No Google Classroom sync** (unless you implement Phase 17A)
   - Teachers must add students manually
   - Workaround: "Add Student" button in hub

2. **Assessment content is demo/placeholder**
   - Real ORF passages, number talks, etc. not yet loaded
   - You'll populate via data JSON files or Azure AI

3. **No real Azure OpenAI integration** (unless configured)
   - Coaching narration and sub-plans won't auto-generate
   - Falls back gracefully to template text

4. **No parent/admin portal yet**
   - Only teacher-facing functionality
   - Roadmap: Phase 20

5. **Mobile experience is single-column**
   - Acceptable for viewing student details
   - Not ideal for side-by-side comparisons

---

## Recommended Pilot Plan

**Week 1: Phase 16 (Color Rename)**
- [ ] Update tier labels to Emerging/Developing/Proficient
- [ ] Test on all devices
- [ ] Get stakeholder sign-off on new terminology

**Week 2: Phase 17B (Curriculum Panel, Optional)**
- [ ] If essential for pilot: build curriculum quick-ref panel
- [ ] If not essential: defer to Week 3

**Week 3: Stabilization & Bug Fixes**
- [ ] Run guardrail checks daily
- [ ] Fix any issues found by pilot users
- [ ] Collect usage analytics
- [ ] Gather feedback for Phase 18+

**Week 4+: Iterate**
- [ ] Implement high-impact feedback
- [ ] Plan Phase 18/19 work

---

## Handoff to Other AI Agents (If Applicable)

**Important:** If you bring in other AI agents to help with Phases 16-19, share this:

1. **Read this file first:** `docs/REGRESSION_GUARDRAILS.md`
2. **Run pre-commit checks:** `npm run lint && npm run test:smoke`
3. **Use the comment block template** for every file edited
4. **Update cache busters** if you edit `.js` or `.css` files
5. **Manual mobile test** at 375px width before submitting

---

## Success Criteria for Phase 15 (Current)

✅ All items complete:
- [ ] Hub initializes without syntax errors (console shows no errors at startup)
- [ ] Mobile single-scroll works (no double scroll bars)
- [ ] Footer doesn't overlap content on any page
- [ ] Light background applied to all pages
- [ ] Tour doesn't auto-launch
- [ ] Cache busters are consistent across all HTML files
- [ ] README documents all recent fixes

**Verification command:**
```bash
npm run test:smoke && npm run check:cache-busters && npm run lint
```

---

## Questions for You

Before proceeding to Phase 16, consider:

1. **Tier terminology:** Do Emerging/Developing/Proficient feel right to your school context, or do you prefer different labels?

2. **Pilot scope:** Is Phase 17A (Google Classroom) essential, nice-to-have, or post-pilot?

3. **Assessment content:** Are the fluency passages, number talks, and screeners ready to load, or are they placeholder data for now?

4. **Stakeholder feedback:** Have you shared the hub with any teachers yet? Any early feedback?

5. **Timeline:** When does the pilot start? (This determines urgency of Phase 16 vs 17A vs 17B)

---

## Resources

- **Phase 15 detailed fixes:** `README.md` (Phase 15 section)
- **Regression prevention:** `docs/REGRESSION_GUARDRAILS.md`
- **Azure setup (optional):** `docs/HANDOVER.md` (search "CSAIConfig")
- **Codebase overview:** `docs/CONTINUITY_PLAYBOOK.md`
- **Live branch:** `https://github.com/bkseatown/CornerstoneMTSS` (branch: `claude/inspiring-sinoussi`)

---

## Next Immediate Action

**Recommended:** Implement Phase 16 (tier color rename) this week, then schedule a call with 1-2 teachers to get feedback before the full pilot.

**Command to track progress:**
```bash
npm run lint && npm run test:smoke && npm run check:cache-busters
```

Good luck with the pilot! 🎉
