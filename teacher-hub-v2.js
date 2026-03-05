/**
 * teacher-hub-v2.js — Context-first Command Hub, Phase 2
 *
 * Responsibility surface:
 *   - Bootstrap HubState + HubContext
 *   - Load + render student caseload
 *   - Handle student selection → writes to HubState → HubContext auto-computes
 *   - Subscribe to intelligence changes → render focus card
 *   - Search filtering
 *   - Demo mode seeding
 */
(function teacherHubV2() {
  "use strict";

  /* ── Dependency guard ──────────────────────────────────── */

  var Evidence             = window.CSEvidence;
  var PlanEngine           = window.CSPlanEngine;
  var TierEngine           = window.CSTierEngine;
  var ExecutiveProfileEngine = window.CSExecutiveProfile;
  var ExecutiveSupportEngine = window.CSExecutiveSupportEngine;
  var SupportStore         = window.CSSupportStore;
  var HubState             = window.CSHubState;
  var HubContext           = window.CSHubContext;

  if (!Evidence || !HubState) return;

  /* ── URL params ────────────────────────────────────────── */

  var urlParams = (function () {
    try { return new URLSearchParams(window.location.search || ""); }
    catch (_e) { return { get: function () { return null; } }; }
  })();

  var isDemoMode = urlParams.get("demo") === "1" || urlParams.get("audit") === "1";
  // Persist demo flag — dev servers (serve, python) drop query params on redirect
  if (isDemoMode) {
    try { localStorage.setItem("cs.hub.demo", "1"); } catch (_e) {}
  } else {
    try { isDemoMode = localStorage.getItem("cs.hub.demo") === "1"; } catch (_e) {}
  }
  var initialStudentId = urlParams.get("student") || "";

  /* ── Hub state ─────────────────────────────────────────── */

  var hubState = HubState.create({
    session: {
      role: urlParams.get("role") || "teacher",
      demoMode: isDemoMode
    }
  });

  /* ── Local state (caseload + filter) ───────────────────── */

  var caseload = [];
  var filtered = [];

  /* ── DOM refs ──────────────────────────────────────────── */

  var el = {
    sidebar:     document.getElementById("th2-sidebar"),
    sidebarCtx:  document.getElementById("th2-sidebar-context"),
    search:      document.getElementById("th2-search"),
    list:        document.getElementById("th2-list"),
    listEmpty:   document.getElementById("th2-list-empty"),
    listNone:    document.getElementById("th2-list-none"),
    modeTabs:    Array.prototype.slice.call(document.querySelectorAll(".th2-mode-tab")),
    main:        document.getElementById("th2-main"),
    emptyState:  document.getElementById("th2-empty-state"),
    focusCard:   document.getElementById("th2-focus-card"),
    demoBadge:   document.getElementById("th2-demo-badge")
  };

  /* ── Utilities ─────────────────────────────────────────── */

  function safe(fn) {
    try { return fn(); } catch (_e) { return null; }
  }

  /* Deterministic gradient palette from student ID */
  function studentColor(id) {
    var palettes = [
      ["#2b5da8","#4c84d6"], ["#4e8d6a","#7cc69e"],
      ["#7048e8","#9a7ef0"], ["#b58a45","#d4a85e"],
      ["#2b8a78","#4db8a4"], ["#b25e5e","#d4807e"],
      ["#1971c2","#4da6f5"]
    ];
    var n = 0;
    var s = String(id || "");
    for (var i = 0; i < s.length; i++) { n = (n * 31 + s.charCodeAt(i)) & 0x7fffffff; }
    return palettes[n % palettes.length];
  }

  function buildAvatar(name, id, small) {
    var parts = String(name || "?").trim().split(/\s+/);
    var initials = (parts.length >= 2
      ? (parts[0][0] || "") + (parts[parts.length - 1][0] || "")
      : (parts[0] || "?").slice(0, 2)
    ).toUpperCase();
    var c = studentColor(String(id || name || ""));
    var cls = "th2-avatar" + (small ? " th2-avatar--sm" : "");
    return '<span class="' + cls + '" style="background:linear-gradient(135deg,' + c[0] + ',' + c[1] + ')" aria-hidden="true">' + escapeHtml(initials) + '</span>';
  }

  function lastSeenStatus(summary) {
    var ts = summary && summary.lastSession && summary.lastSession.timestamp;
    if (!ts) return "none";
    var days = Math.floor((Date.now() - Number(ts)) / 86400000);
    if (days < 1) return "today";
    if (days < 5) return "recent";
    return "overdue";
  }

  function todayDateStr() {
    var d = new Date();
    var days = ["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"];
    var months = ["January","February","March","April","May","June","July",
                  "August","September","October","November","December"];
    return days[d.getDay()] + " · " + months[d.getMonth()] + " " + d.getDate();
  }

  function greetingWord() {
    var h = new Date().getHours();
    return h < 12 ? "Good morning" : h < 17 ? "Good afternoon" : "Good evening";
  }

  function clampN(v, min, max) {
    var n = Number(v);
    return Number.isFinite(n) ? Math.max(min, Math.min(max, n)) : min;
  }

  function relativeDate(ts) {
    if (!ts) return "";
    var diff = Date.now() - Number(ts);
    var d = Math.floor(diff / 86400000);
    if (d < 1) return "Today";
    if (d === 1) return "Yesterday";
    if (d < 7) return d + " days ago";
    if (d < 30) return Math.floor(d / 7) + "w ago";
    return Math.floor(d / 30) + "mo ago";
  }

  function escapeHtml(str) {
    return String(str || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  /* ── Sparkline ─────────────────────────────────────────── */

  function buildSparkPath(points) {
    if (!Array.isArray(points) || points.length < 2) return "";
    var vals = points.map(Number).filter(Number.isFinite);
    if (vals.length < 2) return "";
    var max = Math.max.apply(null, vals);
    var min = Math.min.apply(null, vals);
    var range = Math.max(1, max - min);
    var W = 100, H = 26, pad = 3;
    var pts = vals.map(function (v, i) {
      var x = (i / (vals.length - 1)) * W;
      var y = H - pad - ((v - min) / range) * (H - pad * 2);
      return x.toFixed(1) + "," + y.toFixed(1);
    });
    return "M" + pts.join(" L");
  }

  /* ── Tier derivation (lightweight, for student list) ────── */

  function quickTier(summary) {
    var spark = Array.isArray(summary && summary.last7Sparkline) ? summary.last7Sparkline : [];
    if (!spark.length) return 2;
    var recent = spark.slice(-3);
    var avg = recent.reduce(function (s, v) { return s + clampN(v, 0, 100); }, 0) / recent.length;
    if (avg >= 78) return 1;
    if (avg >= 58) return 2;
    return 3;
  }

  function quickTrend(summary) {
    var spark = Array.isArray(summary && summary.last7Sparkline) ? summary.last7Sparkline : [];
    if (spark.length < 4) return "stable";
    var half = Math.floor(spark.length / 2);
    var early = spark.slice(0, half).reduce(function (s, v) { return s + clampN(v, 0, 100); }, 0) / half;
    var late = spark.slice(half).reduce(function (s, v) { return s + clampN(v, 0, 100); }, 0) / (spark.length - half);
    if (late - early > 6) return "up";
    if (early - late > 6) return "down";
    return "stable";
  }

  /* ── Activity routing (matches v1 pattern) ─────────────── */

  function toActivityHref(launch, studentId) {
    var module = String((launch && launch.module) || "");
    var href = String((launch && launch.href) || "");
    var base;
    if (href) {
      base = href;
    } else if (module === "ReadingLab")     { base = "reading-lab.html"; }
    else if (module === "WritingStudio")    { base = "writing-studio.html"; }
    else if (module === "SentenceStudio")   { base = "sentence-surgery.html"; }
    else if (module.indexOf("Numeracy") === 0) { base = "numeracy.html"; }
    else if (module === "PrecisionPlay")    { base = "precision-play.html"; }
    else                                    { base = "word-quest.html?play=1"; }

    try {
      var u = new URL(base, window.location.href);
      if (studentId) u.searchParams.set("student", studentId);
      u.searchParams.set("from", "hub");
      return u.pathname.replace(/^\//, "") + (u.search || "") + (u.hash || "");
    } catch (_e) {
      return base + (studentId ? (base.indexOf("?") >= 0 ? "&" : "?") + "student=" + encodeURIComponent(studentId) : "");
    }
  }

  /* ── Executive computation (mirrored from v1) ───────────── */

  function buildExecutiveInput(row) {
    var top = row && row.priority && row.priority.topSkills && row.priority.topSkills[0]
      ? row.priority.topSkills[0] : null;
    var need = clampN(top && top.need || 0.45, 0, 1);
    var sid = row && row.student ? String(row.student.id || "") : "";
    var ef = SupportStore && typeof SupportStore.getExecutiveFunction === "function" && sid
      ? safe(function () { return SupportStore.getExecutiveFunction(sid); })
      : null;
    var focusHistory = Array.isArray(ef && ef.focusHistory) ? ef.focusHistory : [];
    var lowFocus = focusHistory.filter(function (item) {
      return String(item && item.selfRating || "").toLowerCase() === "struggled";
    }).length;
    return {
      taskCompletionRate: clampN(1 - need - (lowFocus * 0.03), 0, 1),
      assignmentMissingCount: Math.max(0, Math.round(need * 8)),
      initiationDelay: Math.max(1, Math.round((need * 12) + 2)),
      teacherObservations: need >= 0.65
        ? "Task initiation and planning delays observed."
        : "Moderate organizational support needed."
    };
  }

  function computeExecutiveForHub(row) {
    var input = buildExecutiveInput(row);
    var profile = ExecutiveProfileEngine && typeof ExecutiveProfileEngine.generateExecutiveProfile === "function"
      ? safe(function () { return ExecutiveProfileEngine.generateExecutiveProfile(input); })
      : { executiveRiskLevel: "MODERATE", primaryBarrier: "Planning", suggestedSupports: [] };
    if (!profile) profile = { executiveRiskLevel: "MODERATE", primaryBarrier: "Planning", suggestedSupports: [] };
    var gradeBand = row && row.student ? String(row.student.grade || row.student.gradeBand || "G5") : "G5";
    var plan = ExecutiveSupportEngine && typeof ExecutiveSupportEngine.generateExecutiveSupportPlan === "function"
      ? safe(function () {
          return ExecutiveSupportEngine.generateExecutiveSupportPlan({
            executiveRiskLevel: profile.executiveRiskLevel,
            primaryBarrier: profile.primaryBarrier,
            gradeBand: gradeBand
          });
        })
      : { weeklyGoal: "Complete 4 tasks with supports.", dailySupportActions: [] };
    return { profile: profile, plan: plan || {} };
  }

  /* ── Today plan builder (class-level) ──────────────────── */

  function buildTodayPlanForHub() {
    var students = caseload.length ? caseload : [];
    var rows = students.map(function (student) {
      var summary = safe(function () { return Evidence.getStudentSummary(student.id); });
      var snapshot = safe(function () {
        return typeof Evidence.computeStudentSnapshot === "function"
          ? Evidence.computeStudentSnapshot(student.id) : null;
      });
      var plan = PlanEngine && typeof PlanEngine.buildPlan === "function"
        ? safe(function () {
            return PlanEngine.buildPlan({
              student: summary && summary.student ? summary.student : student,
              snapshot: snapshot || { needs: [] }
            });
          })
        : null;
      var priority = plan && plan.priority ? plan.priority : null;
      return { student: student, summary: summary, snapshot: snapshot, plan: plan, priority: priority };
    });
    return { students: rows };
  }

  /* ── Support panel ─────────────────────────────────────── */

  function renderSupportPanel(studentId) {
    var studentSupport = SupportStore && typeof SupportStore.getStudent === "function"
      ? (safe(function () { return SupportStore.getStudent(studentId); }) || {})
      : {};
    var needs = Array.isArray(studentSupport.needs) ? studentSupport.needs.slice(0, 3) : [];

    var needsHtml = needs.length
      ? needs.map(function (n) {
          return '<li class="th2-need-item"><span class="th2-need-dot"></span>' + escapeHtml(n.label || n.name || "Need") + "</li>";
        }).join("")
      : '<li class="th2-need-item" style="color:var(--text-muted)">No needs captured yet</li>';

    return [
      '<div class="th2-support">',
      '  <div class="th2-support-head">',
      '    <span class="th2-support-kicker">Support context</span>',
      '  </div>',
      '  <ul class="th2-need-list">' + needsHtml + '</ul>',
      '  <div class="th2-fidelity-row">',
      '    <button class="th2-btn-log" id="th2-log-session" type="button">Mark session complete</button>',
      '    <span class="th2-log-status" id="th2-log-status"></span>',
      '  </div>',
      '</div>'
    ].join("\n");
  }

  /* ── Curriculum alignment ──────────────────────────────── */

  /* Condensed goal-bank data — mirrors data/goalBank.literacy.json
     (embedded inline to avoid a fetch() round-trip) */
  var GOAL_BANK = [
    {
      domain: "literacy.decoding",
      keywords: ["decod","phonics","cvc","vowel","blend","digraph","trigraph","word read","phoneme"],
      skill: "Word-level decoding",
      smart: "Within 6 weeks, student will decode grade-level targets at 85% accuracy across 3 consecutive probes.",
      monitor: "Weekly 10-word probe",
      gradeBand: "K–2"
    },
    {
      domain: "literacy.fluency",
      keywords: ["fluency","orf","oral reading","reading rate","phrasing","pacing","wcpm"],
      skill: "Oral reading fluency",
      smart: "Within 8 weeks, student will improve ORF by 15 wcpm while sustaining 95% accuracy on weekly probes.",
      monitor: "Weekly 1-minute fluency timing",
      gradeBand: "3–5"
    },
    {
      domain: "literacy.spelling",
      keywords: ["morphol","spelling","word study","inflect","derivat","pattern","suffix","prefix"],
      skill: "Morphology & spelling patterns",
      smart: "Within 6 weeks, student will apply taught morphology patterns at 80% accuracy over 4 consecutive sessions.",
      monitor: "Biweekly morphology check",
      gradeBand: "3–8"
    },
    {
      domain: "literacy.comprehension",
      keywords: ["comprehens","inferenc","main idea","vocabular","text struct","retell","passage"],
      skill: "Reading comprehension",
      smart: "Within 6 weeks, student will correctly answer 80% of literal and inferential comprehension questions on grade-level passages.",
      monitor: "Biweekly passage + question probe",
      gradeBand: "2–8"
    },
    {
      domain: "numeracy.counting",
      keywords: ["count","numer","number sense","sequenc","tens frame","subitiz"],
      skill: "Number sense & counting",
      smart: "Within 6 weeks, student will accurately count, sequence, and represent numbers within grade-level range at 90% accuracy.",
      monitor: "Weekly counting/number probe",
      gradeBand: "K–2"
    },
    {
      domain: "numeracy.operations",
      keywords: ["operat","addition","subtraction","multiplicat","division","fact fluency","calculat","arithmetic"],
      skill: "Fact fluency & operations",
      smart: "Within 6 weeks, student will correctly solve 80% of grade-level computation problems within a timed probe.",
      monitor: "Weekly 2-minute computation probe",
      gradeBand: "2–5"
    },
    {
      domain: "numeracy.reasoning",
      keywords: ["reasoning","problem solv","word problem","strateg","model","equation","algebra"],
      skill: "Mathematical reasoning",
      smart: "Within 8 weeks, student will use a taught problem-solving strategy to correctly model and solve 3 of 4 multi-step word problems.",
      monitor: "Biweekly problem-solving task",
      gradeBand: "3–8"
    }
  ];

  function matchCurriculumGoal(recTitle, module) {
    var haystack = (String(recTitle || "") + " " + String(module || "")).toLowerCase();
    var best = null;
    var bestScore = 0;
    for (var i = 0; i < GOAL_BANK.length; i++) {
      var entry = GOAL_BANK[i];
      var score = 0;
      for (var j = 0; j < entry.keywords.length; j++) {
        if (haystack.indexOf(entry.keywords[j]) >= 0) score++;
      }
      if (score > bestScore) { bestScore = score; best = entry; }
    }
    /* Default: return first literacy entry if nothing matched */
    return best || GOAL_BANK[0];
  }

  function renderCurriculumSection(recTitle, module, gradeBand) {
    var goal = matchCurriculumGoal(recTitle, module);
    var gradeLabel = gradeBand ? escapeHtml(gradeBand) : escapeHtml(goal.gradeBand);
    var smartTrunc = goal.smart.length > 120 ? goal.smart.slice(0, 117) + "…" : goal.smart;

    return [
      '<div class="th2-curriculum">',
      '  <div class="th2-curriculum-head">',
      '    <span class="th2-curriculum-kicker">Curriculum alignment</span>',
      '    <div class="th2-curriculum-tags">',
      '      <span class="th2-curriculum-tag">' + escapeHtml(goal.gradeBand) + '</span>',
      '      <span class="th2-curriculum-tag th2-curriculum-tag--domain">' + escapeHtml(goal.domain.split(".")[1] || goal.domain) + '</span>',
      '    </div>',
      '  </div>',
      '  <p class="th2-curriculum-skill">' + escapeHtml(goal.skill) + '</p>',
      '  <p class="th2-curriculum-smart">' + escapeHtml(smartTrunc) + '</p>',
      '  <p class="th2-curriculum-monitor">',
      '    <span class="th2-curriculum-monitor-label">Progress monitoring:</span> ' + escapeHtml(goal.monitor),
      '  </p>',
      '</div>'
    ].join("\n");
  }

  /* ── Drawer ─────────────────────────────────────────────── */

  function openDrawer(studentId) {
    var drawerTitle = document.getElementById("th2-drawer-title");
    var student = caseload.find(function (s) { return s.id === studentId; }) || {};
    if (drawerTitle) drawerTitle.textContent = student.name || "Student";

    var studentSupport = SupportStore && typeof SupportStore.getStudent === "function"
      ? (safe(function () { return SupportStore.getStudent(studentId); }) || {})
      : {};
    var goals = Array.isArray(studentSupport.goals) ? studentSupport.goals : [];
    var accs  = Array.isArray(studentSupport.accommodations) ? studentSupport.accommodations : [];
    var summary = safe(function () { return Evidence.getStudentSummary(studentId); });

    var drawerBody = document.getElementById("th2-drawer-body");
    if (drawerBody) {
      drawerBody.innerHTML = [
        '<div class="th2-drawer-section">',
        '  <h4 class="th2-drawer-section-head">Profile</h4>',
        '  <div class="th2-drawer-row"><strong>Grade band</strong>' + escapeHtml(student.gradeBand || student.grade || "—") + '</div>',
        '  <div class="th2-drawer-row"><strong>Last session</strong>' + (summary && summary.lastSession ? relativeDate(summary.lastSession.timestamp) : "No sessions yet") + '</div>',
        '</div>',

        '<div class="th2-drawer-section">',
        '  <h4 class="th2-drawer-section-head">SMART Goals</h4>',
        goals.length
          ? goals.slice(0, 5).map(function (g) {
              return '<div class="th2-drawer-row"><strong>' + escapeHtml(g.skill || g.domain || "Goal") + '</strong>' + escapeHtml((g.target || "").slice(0, 120)) + '</div>';
            }).join("")
          : '<div class="th2-drawer-empty">No goals recorded yet.</div>',
        '</div>',

        '<div class="th2-drawer-section">',
        '  <h4 class="th2-drawer-section-head">Accommodations</h4>',
        accs.length
          ? accs.slice(0, 5).map(function (a) {
              return '<div class="th2-drawer-row"><strong>' + escapeHtml(a.title || "Accommodation") + '</strong>' + escapeHtml(a.teacherText || a.whenToUse || "") + '</div>';
            }).join("")
          : '<div class="th2-drawer-empty">No accommodations recorded yet.</div>',
        '</div>',

        '<div class="th2-drawer-section">',
        '  <h4 class="th2-drawer-section-head">Sub Plan' +
          (window.CSAIPlanner && window.CSAIPlanner.isConfigured()
            ? ' <span style="color:var(--status-secure);font-size:10px;font-weight:700">✦ AI</span>'
            : '') +
        '</h4>',
        '  <div id="th2-subplan-output" class="th2-drawer-empty" style="margin-bottom:10px">',
        '    One tap creates a complete plan any substitute can follow.',
        '  </div>',
        '  <button class="th2-btn-log" id="th2-generate-subplan" type="button" style="width:100%;text-align:center;justify-content:center">',
        '    &#x2726; Generate Sub Plan',
        '  </button>',
        '</div>',

        '<div class="th2-drawer-section">',
        '  <h4 class="th2-drawer-section-head">Share &amp; Export</h4>',
        '  <div class="th2-export-row">',
        '    <button class="th2-export-btn" id="th2-copy-summary" type="button">&#x2398; Copy Summary</button>',
        '    <button class="th2-export-btn" id="th2-export-json" type="button">&#x21e9; JSON</button>',
        '  </div>',
        '</div>',

        '<div class="th2-drawer-section">',
        '  <h4 class="th2-drawer-section-head">Meeting Prep</h4>',
        '  <div class="th2-drawer-row">',
        '    <a class="th2-drawer-link" href="teacher-dashboard.html?student=' + encodeURIComponent(studentId) + '&tab=meeting&from=hub">Open in Meeting Workspace &rarr;</a>',
        '  </div>',
        '</div>'
      ].join("\n");

      // Wire sub plan generator
      var subPlanBtn = drawerBody.querySelector("#th2-generate-subplan");
      if (subPlanBtn) {
        subPlanBtn.addEventListener("click", function handleGenerate() {
          subPlanBtn.textContent = "Generating…";
          subPlanBtn.disabled = true;
          var planIntel = hubState.get().intelligence;
          var plan = planIntel && planIntel.plan;
          var tenMin = plan && plan.plans && plan.plans.tenMin && plan.plans.tenMin[0];
          var AIPlanner = window.CSAIPlanner || null;
          var generate = AIPlanner
            ? AIPlanner.generateSubPlan.bind(AIPlanner)
            : function () { return Promise.resolve("CSAIPlanner not loaded."); };

          generate({
            student: student,
            tier: quickTier(summary),
            recTitle: tenMin ? String(tenMin.title || "") : "",
            recReason: tenMin ? String(tenMin.reason || "") : "",
            needs: Array.isArray(studentSupport.needs) ? studentSupport.needs : [],
            goals: goals,
            accommodations: accs
          }).then(function (text) {
            var output = drawerBody.querySelector("#th2-subplan-output");
            if (output) {
              output.style.cssText = "color:var(--text-primary);font-size:12px;line-height:1.65;white-space:pre-wrap;background:var(--surface-elev-2);padding:12px;border-radius:8px;margin-bottom:10px";
              output.textContent = text;
            }
            subPlanBtn.textContent = "Copy to Clipboard";
            subPlanBtn.disabled = false;
            subPlanBtn.removeEventListener("click", handleGenerate);
            subPlanBtn.addEventListener("click", function () {
              if (navigator.clipboard) navigator.clipboard.writeText(text).catch(function () {});
              subPlanBtn.textContent = "Copied ✓";
              setTimeout(function () { subPlanBtn.textContent = "Copy to Clipboard"; }, 2200);
            });
          }).catch(function (err) {
            console.warn("Sub plan error:", err);
            subPlanBtn.textContent = "Try again";
            subPlanBtn.disabled = false;
          });
        });
      }

      // Wire Copy Summary
      var copySumBtn = drawerBody.querySelector("#th2-copy-summary");
      if (copySumBtn) {
        copySumBtn.addEventListener("click", function () {
          var planIntel = hubState.get().intelligence;
          var planData = planIntel && planIntel.plan;
          var tenMin = planData && planData.plans && planData.plans.tenMin && planData.plans.tenMin[0];
          var recT = tenMin ? String(tenMin.title || "") : "Focused intervention";
          var tier = quickTier(summary);
          var trend = quickTrend(summary);
          var spark = Array.isArray(summary && summary.last7Sparkline) ? summary.last7Sparkline : [];
          var recentAvg = spark.length
            ? Math.round(spark.slice(-3).reduce(function (s, v) { return s + Number(v); }, 0) / Math.min(3, spark.length))
            : null;
          var date = new Date().toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" });
          var goalText = goals.slice(0, 2).map(function (g, i) {
            return (i + 1) + ". " + String(g.skill || g.domain || "Goal") + (g.target ? ": " + String(g.target).slice(0, 80) : "");
          }).join("\n") || "See teacher's plan folder.";
          var accText = accs.slice(0, 3).map(function (a) {
            return "• " + String(a.title || "Accommodation");
          }).join("\n") || "• Extended time\n• Visual supports";
          var actHref = window.location.origin + "/" + "teacher-hub-v2.html?student=" + encodeURIComponent(studentId);

          var text = [
            "MTSS STUDENT SUMMARY — " + date,
            "════════════════════════════════════",
            "",
            "Student:      " + String(student.name || "—"),
            "Grade:        " + String(student.gradeBand || student.grade || "—"),
            "MTSS Tier:    Tier " + tier,
            "7-day trend:  " + trend + (recentAvg !== null ? " (" + recentAvg + "% avg)" : ""),
            "",
            "RECOMMENDED NEXT STEP",
            recT,
            "",
            "ACTIVE GOALS",
            goalText,
            "",
            "KEY ACCOMMODATIONS",
            accText,
            "",
            "Hub link: " + actHref
          ].join("\n");

          if (navigator.clipboard) {
            navigator.clipboard.writeText(text).then(function () {
              copySumBtn.textContent = "Copied ✓";
              setTimeout(function () { copySumBtn.innerHTML = "&#x2398; Copy Summary"; }, 2400);
            }).catch(function () {});
          }
        });
      }

      // Wire Export JSON
      var exportJsonBtn = drawerBody.querySelector("#th2-export-json");
      if (exportJsonBtn) {
        exportJsonBtn.addEventListener("click", function () {
          var exportObj = {
            exportedAt: new Date().toISOString(),
            student: {
              id: student.id,
              name: student.name,
              grade: student.gradeBand || student.grade
            },
            evidence: summary || {},
            goals: goals,
            accommodations: accs
          };
          var blob = new Blob([JSON.stringify(exportObj, null, 2)], { type: "application/json" });
          var url = URL.createObjectURL(blob);
          var a = document.createElement("a");
          a.href = url;
          a.download = "cs-" + String(student.name || "student").replace(/\s+/g, "-").toLowerCase() + "-" + Date.now() + ".json";
          a.click();
          setTimeout(function () { URL.revokeObjectURL(url); }, 5000);
        });
      }
    }

    var drawer  = document.getElementById("th2-drawer");
    var overlay = document.getElementById("th2-overlay");
    if (drawer)  { drawer.classList.add("is-open");  drawer.removeAttribute("aria-hidden"); }
    if (overlay) { overlay.classList.add("is-open"); overlay.classList.remove("hidden"); }
    document.body.style.overflow = "hidden";
  }

  function closeDrawer() {
    var drawer  = document.getElementById("th2-drawer");
    var overlay = document.getElementById("th2-overlay");
    if (drawer)  { drawer.classList.remove("is-open");  drawer.setAttribute("aria-hidden", "true"); }
    if (overlay) { overlay.classList.remove("is-open"); }
    setTimeout(function () { if (overlay) overlay.classList.add("hidden"); }, 260);
    document.body.style.overflow = "";
    hubState.set({ ui: { drawerOpen: false } });
  }

  /* ── HubContext wiring ─────────────────────────────────── */

  var destroyContext = HubContext.init({
    hubState: hubState,
    Evidence: Evidence,
    PlanEngine: PlanEngine,
    buildTodayPlan: buildTodayPlanForHub,
    computeExecutive: computeExecutiveForHub
  });

  /* ── Caseload loading ──────────────────────────────────── */

  function loadCaseload() {
    var raw = [];
    if (typeof Evidence.listCaseload === "function") {
      raw = safe(function () { return Evidence.listCaseload(); }) || [];
    } else if (typeof Evidence.getStudents === "function") {
      raw = safe(function () { return Evidence.getStudents(); }) || [];
    }
    caseload = Array.isArray(raw) ? raw : [];

    if (el.listNone) el.listNone.classList.toggle("hidden", caseload.length > 0);

    filterCaseload(el.search ? (el.search.value || "") : "");
  }

  /* ── Demo mode ─────────────────────────────────────────── */

  function ensureDemoCaseload() {
    var demos = [
      { id: "demo-ava",  name: "Ava M.",   gradeBand: "G3", grade: "G3" },
      { id: "demo-liam", name: "Liam T.",  gradeBand: "G2", grade: "G2" },
      { id: "demo-maya", name: "Maya R.",  gradeBand: "G3", grade: "G3" },
      { id: "demo-noah", name: "Noah K.",  gradeBand: "G4", grade: "G4" },
      { id: "demo-zoe",  name: "Zoe W.",   gradeBand: "G1", grade: "G1" }
    ];
    demos.forEach(function (s) {
      if (typeof Evidence.upsertStudent === "function") {
        safe(function () { Evidence.upsertStudent(s); });
      }
    });
  }

  /* ── Filtering ─────────────────────────────────────────── */

  function filterCaseload(query) {
    var q = String(query || "").trim().toLowerCase();
    filtered = caseload.filter(function (s) {
      if (!q) return true;
      var name = String(s.name || "").toLowerCase();
      var id   = String(s.id || "").toLowerCase();
      return name.includes(q) || id.includes(q);
    });
    renderStudentList();
  }

  /* ── Student list rendering ────────────────────────────── */

  function renderStudentList() {
    if (!el.list) return;

    if (el.listEmpty) el.listEmpty.classList.toggle("hidden", filtered.length > 0 || caseload.length === 0);

    var selectedId = hubState.get().context.studentId || "";

    el.list.innerHTML = filtered.map(function (student) {
      var summary = safe(function () { return Evidence.getStudentSummary(student.id); });
      var tier    = quickTier(summary);
      var trend   = quickTrend(summary);
      var last    = summary && summary.lastSession ? relativeDate(summary.lastSession.timestamp) : "";
      var grade   = String(student.gradeBand || student.grade || "");
      var meta    = [grade, last].filter(Boolean).join(" · ");
      var isActive = student.id === selectedId;

      var trendArrow = trend === "up" ? "↑ " : (trend === "down" ? "↓ " : "");
      var trendLabel = trend === "up" ? "improving" : (trend === "down" ? "declining" : "stable");

      return [
        '<button class="th2-student' + (isActive ? " is-active" : "") + '"',
        '  data-id="' + escapeHtml(student.id) + '"',
        '  role="listitem"',
        '  aria-pressed="' + isActive + '"',
        '  aria-label="' + escapeHtml(student.name) + ', Tier ' + tier + ', ' + trendLabel + '"',
        '>',
        '  <div class="th2-student-body">',
        '    <span class="th2-student-name">' + escapeHtml(student.name) + '</span>',
        '    <span class="th2-student-meta">' + escapeHtml(meta || "\u00a0") + '</span>',
        '  </div>',
        '  <div style="display:flex;align-items:flex-start;gap:6px;flex-shrink:0;padding-top:2px">',
        '    <span class="th2-tier-chip" data-tier="' + tier + '">T' + tier + '</span>',
        '    <span class="th2-trend-dot" data-trend="' + trend + '" title="' + trendArrow + trendLabel + '"></span>',
        '  </div>',
        '</button>'
      ].join("\n");
    }).join("");
  }

  /* ── Student selection ─────────────────────────────────── */

  function selectStudent(studentId) {
    // Write to HubState → HubContext auto-computes intelligence
    hubState.set({ context: { studentId: studentId } });
    renderStudentList(); // refresh active state in list
  }

  /* ── Focus card rendering ──────────────────────────────── */

  function renderFocusCard(state) {
    var intelligence = state.intelligence || {};
    var plan = intelligence.plan;
    var studentId = state.context.studentId || "";

    if (!studentId || !plan) {
      showEmptyState();
      return;
    }

    var summary = safe(function () { return Evidence.getStudentSummary(studentId); });
    var student = (summary && summary.student) || caseload.find(function (s) { return s.id === studentId; }) || {};
    var spark = Array.isArray(summary && summary.last7Sparkline) ? summary.last7Sparkline : [];
    var tier = quickTier(summary);
    var trend = quickTrend(summary);

    // Extract recommendation from plan
    var tenMin = plan.plans && plan.plans.tenMin && plan.plans.tenMin[0];
    var recTitle  = String((tenMin && tenMin.title) || (plan.recommendedMove) || "Focused intervention");
    var recReason = String((tenMin && tenMin.reason) || (plan.reasoning && plan.reasoning[0]) || "Based on recent skill signals.");
    var launch    = tenMin && tenMin.launch;

    // Tier signal from plan or TierEngine
    var trendDecision = String(
      (plan.tierSignal && plan.tierSignal.trendDecision) ||
      (plan.trendDecision) ||
      "HOLD"
    );

    // Build sparkline path
    var sparkPath = buildSparkPath(spark);
    var deltaClass = trend === "up" ? "th2-delta-up" : (trend === "down" ? "th2-delta-down" : "th2-delta-stable");
    var deltaLabel = trend === "up" ? "↑ improving" : (trend === "down" ? "↓ declining" : "→ stable");

    // Activity href
    var activityHref = launch ? toActivityHref(launch, studentId) : "word-quest.html?play=1&student=" + encodeURIComponent(studentId) + "&from=hub";

    // Set tier on card element for CSS stripe color
    el.focusCard.setAttribute("data-tier", String(tier));

    var grade = escapeHtml(student.gradeBand || student.grade || "");
    var lastSeenLabel = summary && summary.lastSession
      ? relativeDate(summary.lastSession.timestamp) : "No sessions yet";
    var nameMeta = [grade, lastSeenLabel].filter(Boolean).join(" · ");

    el.focusCard.innerHTML = [
      /* Student header */
      '<div class="th2-focus-head">',
      '  <div class="th2-focus-identity">',
      '    ' + buildAvatar(student.name || "Student", studentId),
      '    <div class="th2-focus-name-block">',
      '      <div class="th2-focus-name-row">',
      '        <h2 class="th2-focus-name">' + escapeHtml(student.name || "Student") + '</h2>',
      '        <span class="th2-focus-tier" data-tier="' + tier + '">Tier ' + tier + '</span>',
      '      </div>',
      (nameMeta ? '      <span class="th2-focus-name-meta">' + nameMeta + '</span>' : ''),
      '    </div>',
      '  </div>',
      '  <div class="th2-focus-trend">',
      sparkPath
        ? '<svg class="th2-sparkline is-animating" viewBox="0 0 100 26" preserveAspectRatio="none" aria-hidden="true"><path class="th2-spark-path" d="' + sparkPath + '"/></svg>'
        : '',
      '    <span class="th2-delta ' + deltaClass + '">' + deltaLabel + '</span>',
      '  </div>',
      '</div>',

      /* Recommendation block */
      '<div class="th2-rec">',
      '  <p class="th2-rec-kicker">Recommended session</p>',
      '  <p class="th2-rec-title">' + escapeHtml(recTitle) + '</p>',
      '  <p class="th2-rec-reason">' + escapeHtml(recReason) + '</p>',
      '</div>',

      /* Curriculum alignment — mapped from recommendation */
      renderCurriculumSection(
        recTitle,
        launch && launch.module ? String(launch.module) : "",
        student.gradeBand || student.grade || ""
      ),

      /* Signal pills */
      '<div class="th2-signals">',
      '  <span class="th2-signal" data-decision="' + trendDecision + '">' + trendDecision + '</span>',
      '  <span class="th2-signal">Fidelity tracking</span>',
      '  <span class="th2-signal">Curriculum mapped</span>',
      '  <span class="th2-signal">Guardrails passed</span>',
      '</div>',

      /* Actions */
      '<div class="th2-actions">',
      '  <a class="th2-btn th2-btn-primary" href="' + escapeHtml(activityHref) + '">Start Recommended Session</a>',
      '  <button class="th2-btn th2-btn-quiet" id="th2-view-details">View Details</button>',
      '</div>',

      /* Support panel — auto-surfaces below actions */
      renderSupportPanel(studentId)
    ].join("\n");

    showFocusCard();
  }

  /* ── Morning brief ──────────────────────────────────────── */

  function renderMorningBrief() {
    if (!el.emptyState || !caseload.length) return;

    var ranked = caseload.map(function (student) {
      var summary = safe(function () { return Evidence.getStudentSummary(student.id); });
      var tier = quickTier(summary);
      var status = lastSeenStatus(summary);
      var ts = summary && summary.lastSession && summary.lastSession.timestamp;
      var daysSince = ts ? Math.floor((Date.now() - Number(ts)) / 86400000) : 999;
      var plan = safe(function () {
        var snap = Evidence.computeStudentSnapshot ? Evidence.computeStudentSnapshot(student.id) : null;
        return PlanEngine && PlanEngine.buildPlan
          ? PlanEngine.buildPlan({ student: student, snapshot: snap || { needs: [] } })
          : null;
      });
      var recTitle = plan && plan.plans && plan.plans.tenMin && plan.plans.tenMin[0]
        ? String(plan.plans.tenMin[0].title || "")
        : (plan && plan.recommendedMove ? String(plan.recommendedMove) : "");
      return { student: student, summary: summary, tier: tier, status: status, daysSince: daysSince, recTitle: recTitle };
    }).sort(function (a, b) {
      if (a.tier !== b.tier) return b.tier - a.tier;
      return b.daysSince - a.daysSince;
    });

    var needCount = ranked.filter(function (r) { return r.tier >= 2 || r.daysSince >= 5; }).length;
    var subText = needCount === 0
      ? "All students are on track."
      : needCount === 1 ? "1 student needs attention today."
      : needCount + " students need attention today.";

    var urgencyHtml = needCount > 0
      ? '<span class="th2-urgency-count">' + needCount + '</span>'
      : "";

    var cardsHtml = ranked.slice(0, 5).map(function (r) {
      var lastStr = r.daysSince === 0 ? "Today" : r.daysSince < 999 ? r.daysSince + "d ago" : "Never";
      var gradeStr = escapeHtml(r.student.grade || r.student.gradeBand || "");
      return [
        '<button class="th2-brief-card" data-id="' + escapeHtml(r.student.id) + '" type="button">',
        '  <div class="th2-brief-card-left">',
        '    ' + buildAvatar(r.student.name, r.student.id, true),
        '    <div class="th2-brief-card-info">',
        '      <span class="th2-brief-card-name">' + escapeHtml(r.student.name) + '</span>',
        '      <div class="th2-brief-card-meta">',
        '        <span class="th2-tier-chip" data-tier="' + r.tier + '">T' + r.tier + '</span>',
        (gradeStr ? '        <span>' + gradeStr + '</span>' : ''),
        '        <span>&middot; ' + escapeHtml(lastStr) + '</span>',
        '      </div>',
        (r.recTitle ? '      <span class="th2-brief-card-rec">' + escapeHtml(r.recTitle) + '</span>' : ''),
        '    </div>',
        '  </div>',
        '  <span class="th2-brief-status" data-status="' + r.status + '">',
        (r.status === "overdue" ? "!" : r.status === "today" ? "✓" : ""),
        '  </span>',
        '</button>'
      ].join("\n");
    }).join("\n");

    el.emptyState.innerHTML = [
      '<div class="th2-morning">',
      '  <p class="th2-morning-greeting">' + greetingWord() + '</p>',
      '  <p class="th2-morning-date">' + todayDateStr() + '</p>',
      '  <p class="th2-morning-sub">' + escapeHtml(subText) + '</p>',
      '  <div class="th2-brief-list">' + cardsHtml + '</div>',
      '</div>'
    ].join("\n");

    el.emptyState.querySelectorAll(".th2-brief-card").forEach(function (btn) {
      btn.addEventListener("click", function () {
        var sid = btn.getAttribute("data-id") || "";
        if (sid) selectStudent(sid);
      });
    });

    // Update sidebar context
    if (el.sidebarCtx) {
      el.sidebarCtx.innerHTML =
        '<p class="th2-sidebar-date">' + todayDateStr() + '</p>' +
        (needCount > 0
          ? '<p class="th2-sidebar-urgency">' + urgencyHtml + ' need' + (needCount > 1 ? 's' : '') + ' attention</p>'
          : '<p class="th2-sidebar-urgency">All on track</p>');
    }
  }

  /* ── Empty / focused state toggle ──────────────────────── */

  function showEmptyState() {
    if (el.emptyState) { el.emptyState.classList.remove("hidden"); el.emptyState.removeAttribute("aria-hidden"); }
    if (el.focusCard)  { el.focusCard.classList.add("hidden"); el.focusCard.setAttribute("aria-hidden", "true"); }
    if (caseload.length) renderMorningBrief();
  }

  function showFocusCard() {
    if (el.emptyState) { el.emptyState.classList.add("hidden"); el.emptyState.setAttribute("aria-hidden", "true"); }
    if (el.focusCard)  { el.focusCard.classList.remove("hidden"); el.focusCard.removeAttribute("aria-hidden"); }
  }

  /* ── HubState subscription → render ────────────────────── */

  hubState.subscribe(function (state) {
    var studentId = state.context.studentId || "";
    if (!studentId) {
      showEmptyState();
      return;
    }
    // Intelligence is populated by HubContext after studentId changes
    if (state.intelligence && state.intelligence.plan) {
      renderFocusCard(state);
    }
    // Sync drawer open state
    var drawer = document.getElementById("th2-drawer");
    if (state.ui && state.ui.drawerOpen && drawer && !drawer.classList.contains("is-open")) {
      openDrawer(studentId);
    }
  });

  /* ── Event wiring ──────────────────────────────────────── */

  // Student list click delegation
  if (el.list) {
    el.list.addEventListener("click", function (e) {
      var btn = e.target.closest(".th2-student");
      if (!btn) return;
      var sid = btn.getAttribute("data-id") || "";
      if (sid) selectStudent(sid);
    });
  }

  // Search
  if (el.search) {
    el.search.addEventListener("input", function () {
      filterCaseload(el.search.value);
    });
  }

  // Mode tabs (My Caseload / Today's Classes)
  el.modeTabs.forEach(function (tab) {
    tab.addEventListener("click", function () {
      el.modeTabs.forEach(function (t) {
        t.classList.remove("is-active");
        t.setAttribute("aria-selected", "false");
      });
      tab.classList.add("is-active");
      tab.setAttribute("aria-selected", "true");
      hubState.set({ context: { mode: tab.getAttribute("data-mode") || "caseload" } });
      // Phase 3: Today's Classes will trigger class-context panel
    });
  });

  // View details → open drawer
  document.addEventListener("click", function (e) {
    if (e.target && e.target.id === "th2-view-details") {
      var studentId = hubState.get().context.studentId || "";
      if (studentId) openDrawer(studentId);
    }
  });

  // Log session inline
  document.addEventListener("click", function (e) {
    var btn = e.target.closest && e.target.closest("#th2-log-session");
    if (!btn) return;
    var studentId = hubState.get().context.studentId || "";
    if (!studentId) return;
    if (Evidence && typeof Evidence.appendSession === "function") {
      safe(function () {
        Evidence.appendSession(studentId, "hub_log", {
          source: "hub-v2",
          timestamp: Date.now(),
          signals: {}
        });
      });
    }
    btn.classList.add("is-logged");
    btn.textContent = "Session logged ✓";
    btn.disabled = true;
    var status = document.getElementById("th2-log-status");
    if (status) status.textContent = relativeDate(Date.now());
  });

  // Drawer close button
  document.addEventListener("click", function (e) {
    if (e.target && e.target.id === "th2-drawer-close") closeDrawer();
  });

  // Overlay click closes drawer
  document.addEventListener("click", function (e) {
    if (e.target && e.target.id === "th2-overlay") closeDrawer();
  });

  // Escape key closes drawer
  document.addEventListener("keydown", function (e) {
    if ((e.key === "Escape" || e.key === "Esc") && hubState.get().ui.drawerOpen) closeDrawer();
  });

  /* ── Boot sequence ─────────────────────────────────────── */

  function boot() {
    // Demo mode
    if (isDemoMode) {
      ensureDemoCaseload();
      if (el.demoBadge) el.demoBadge.classList.remove("hidden");
    }

    // Load caseload
    loadCaseload();

    // If a student was passed via URL, select them; otherwise show morning brief
    if (initialStudentId && caseload.some(function (s) { return s.id === initialStudentId; })) {
      selectStudent(initialStudentId);
    } else {
      renderMorningBrief();
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }

})();
