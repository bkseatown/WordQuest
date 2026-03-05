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

  /* ── Toast notifications ─────────────────────────────── */
  var _toastHost = null;
  function showToast(msg, type) {
    if (!_toastHost) {
      _toastHost = document.getElementById("th2-toast-host");
      if (!_toastHost) return;
    }
    var t = document.createElement("div");
    t.className = "th2-toast th2-toast--" + (type || "info");
    t.setAttribute("role", "status");
    t.textContent = msg;
    _toastHost.appendChild(t);
    requestAnimationFrame(function () {
      requestAnimationFrame(function () { t.classList.add("is-visible"); });
    });
    setTimeout(function () {
      t.classList.remove("is-visible");
      t.addEventListener("transitionend", function () {
        if (t.parentNode) t.parentNode.removeChild(t);
      }, { once: true });
    }, 3000);
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

  /* ── Curriculum alignment data ──────────────────────────
   * Inline copies of data/fishtank-ela-map.json and
   * data/iswordstudy-map.json — embedded to avoid fetch
   * round-trips in this static app.
   */

  /* Module-domain hints for demo / sparse-evidence students.
   * Keyed by student id. Value must match matchCurriculumGoal keywords.
   * These are used as fallback when the plan engine doesn't infer a module. */
  var MODULE_HINT_BY_STUDENT = {
    "demo-noah": "Numeracy",
    "demo-zoe":  "Phonics",
    "demo-liam": "Phonics"
  };

  /* ── F&P (Fountas & Pinnell) reading level badge ──────────
   * Stored in localStorage["cs.hub.fp.{studentId}"] as a
   * single letter A–Z (or null).  Demo students get realistic
   * seed levels so the badge appears without data entry.
   */
  var FP_DEMO_LEVELS = {
    "demo-ava":  "M",   // G3 mid-year on-grade
    "demo-liam": "G",   // G2 slightly below
    "demo-maya": "N",   // G3 on/above grade
    "demo-zoe":  "C"    // G1 early emergent
    /* demo-noah: numeracy focus — no F&P badge */
  };
  var FP_VALID = /^[A-Za-z]$/;

  function getFpLevel(studentId) {
    var lsKey = "cs.hub.fp." + studentId;
    var stored = localStorage.getItem(lsKey);
    if (stored !== null) return stored || null;   // "" means "cleared"
    var demo = FP_DEMO_LEVELS[studentId] || null;
    if (demo) localStorage.setItem(lsKey, demo);  // seed once
    return demo;
  }

  function setFpLevel(studentId, level) {
    localStorage.setItem("cs.hub.fp." + studentId, level ? String(level).toUpperCase().slice(0, 1) : "");
  }

  function renderFpBadge(studentId) {
    var level = getFpLevel(studentId);
    if (!level) return "";
    return '<button class="th2-fp-badge" data-fp-student="' + escapeHtml(studentId) + '" title="F&P Reading Level — click to update" type="button">F&amp;P ' + escapeHtml(level) + '</button>';
  }

  /* ── Tool badges (Words Their Way · Read Naturally · Lexia) ─
   * Stored in localStorage["cs.hub.{tool}.{studentId}"]
   * WtW:   stage abbreviation — E / LNA / WWP / SA / DR
   * RN:    WPM string           e.g. "67"
   * Lexia: level string         e.g. "12"
   */
  var WTW_STAGES = ["E", "LNA", "WWP", "SA", "DR"];
  var WTW_DEMO   = { "demo-zoe": "LNA", "demo-liam": "WWP" };
  var RN_DEMO    = { "demo-maya": "94", "demo-noah": "71" };

  function getToolBadge(studentId, tool) {
    var lsKey = "cs.hub." + tool + "." + studentId;
    var stored = localStorage.getItem(lsKey);
    if (stored !== null) return stored || null;
    // Seed demo values once
    var demo = (tool === "wtw" ? WTW_DEMO : tool === "rn" ? RN_DEMO : {})[studentId] || null;
    if (demo) localStorage.setItem(lsKey, demo);
    return demo;
  }

  function setToolBadge(studentId, tool, value) {
    if (value) localStorage.setItem("cs.hub." + tool + "." + studentId, String(value));
    else        localStorage.removeItem("cs.hub." + tool + "." + studentId);
  }

  function renderToolBadges(studentId) {
    var wtw   = getToolBadge(studentId, "wtw");
    var rn    = getToolBadge(studentId, "rn");
    var lexia = getToolBadge(studentId, "lexia");
    var parts = [];
    if (wtw)   parts.push('<button class="th2-tool-badge th2-tool-badge--wtw" data-tool-badge="wtw" data-tool-student="' + escapeHtml(studentId) + '" title="Words Their Way stage — click to update" type="button">WtW ' + escapeHtml(wtw) + '</button>');
    if (rn)    parts.push('<button class="th2-tool-badge th2-tool-badge--rn" data-tool-badge="rn" data-tool-student="' + escapeHtml(studentId) + '" title="Read Naturally WPM — click to update" type="button">RN ' + escapeHtml(rn) + ' wpm</button>');
    if (lexia) parts.push('<button class="th2-tool-badge th2-tool-badge--lexia" data-tool-badge="lexia" data-tool-student="' + escapeHtml(studentId) + '" title="Lexia level — click to update" type="button">Lexia ' + escapeHtml(lexia) + '</button>');
    parts.push('<button class="th2-tool-add" data-tool-add-student="' + escapeHtml(studentId) + '" title="Set tool levels (WtW · RN · Lexia)" type="button" aria-label="Set tool levels">+</button>');
    return parts.join("");
  }

  /* ── UDL accommodation strip ────────────────────────────────
   * Stored in localStorage["cs.hub.udl.{studentId}"] as JSON
   * array of active chip IDs.
   */
  var UDL_CHIPS = [
    { id: "ext_time",    label: "Extended time" },
    { id: "pref_seat",   label: "Pref. seating" },
    { id: "visual",      label: "Visual supports" },
    { id: "sent_frames", label: "Sentence frames" },
    { id: "reduced",     label: "Reduced load" },
    { id: "manipul",     label: "Manipulatives" },
    { id: "read_aloud",  label: "Read aloud" },
    { id: "calculator",  label: "Calculator" }
  ];

  function getUdlActive(studentId) {
    try { return JSON.parse(localStorage.getItem("cs.hub.udl." + studentId) || "[]"); }
    catch (_) { return []; }
  }

  function setUdlActive(studentId, ids) {
    localStorage.setItem("cs.hub.udl." + studentId, JSON.stringify(ids));
  }

  function renderUdlStrip(studentId) {
    var active = getUdlActive(studentId);
    var html = '<div class="th2-udl-strip" data-udl-student="' + escapeHtml(studentId) + '">';
    // Render active chips
    UDL_CHIPS.forEach(function (c) {
      if (active.indexOf(c.id) !== -1) {
        html += '<button class="th2-udl-chip is-active" data-udl-id="' + c.id +
                '" type="button">' + escapeHtml(c.label) + '</button>';
      }
    });
    // Toggle button
    html += '<button class="th2-udl-toggle" data-udl-toggle="' + escapeHtml(studentId) +
            '" type="button">' + (active.length ? '✎ Accommodations' : '+ Accommodations') + '</button>';
    html += '</div>';
    return html;
  }

  var FISHTANK_GRADES = {
    "K":  { label: "Kindergarten", slug: "kindergarten",
            units: [
              { seq:1, slug:"welcome-to-school",              lessonCount:17, title:"Welcome to School",            anchor:"Community & Belonging"    },
              { seq:2, slug:"noticing-patterns-in-stories",   lessonCount:15, title:"Noticing Patterns in Stories", anchor:"Literary Analysis"         },
              { seq:3, slug:"celebrating-fall",               lessonCount:14, title:"Celebrating Fall",             anchor:"Informational / Science"   },
              { seq:4, slug:"falling-in-love-with-authors",   lessonCount:15, title:"Falling in Love with Authors", anchor:"Author Study"              },
              { seq:5, slug:"winter-wonderland",              lessonCount:12, title:"Winter Wonderland",            anchor:"Informational / Seasons"   },
              { seq:6, slug:"what-is-justice",                lessonCount:16, title:"What is Justice?",             anchor:"Social Studies / Civics"   },
              { seq:7, slug:"exploring-life-cycles",          lessonCount:18, title:"Exploring Life Cycles",        anchor:"Science / Informational"   },
              { seq:8, slug:"reduce-reuse-recycle",           lessonCount:14, title:"Reduce, Reuse, Recycle",       anchor:"Environment / Argument"    }
            ]},
    "1":  { label: "Grade 1", slug: "1st-grade",
            units: [
              { seq:1,  slug:"being-a-good-friend",           lessonCount:20, title:"Being a Good Friend",          anchor:"Social Skills / Narrative"  },
              { seq:2,  slug:"the-seven-continents",          lessonCount:18, title:"The Seven Continents",          anchor:"Social Studies / Info"      },
              { seq:3,  slug:"folktales-around-the-world",    lessonCount:22, title:"Folktales Around the World",    anchor:"Literary Analysis"          },
              { seq:4,  slug:"amazing-animals",               lessonCount:20, title:"Amazing Animals",               anchor:"Science / Informational"    },
              { seq:5,  slug:"love-makes-a-family",           lessonCount:16, title:"Love Makes a Family",           anchor:"Community / Narrative"      },
              { seq:6,  slug:"inspiring-artists-and-musicians",lessonCount:18,title:"Inspiring Artists & Musicians", anchor:"Arts / Biography"           },
              { seq:7,  slug:"making-old-stories-new",        lessonCount:20, title:"Making Old Stories New",        anchor:"Narrative / Retelling"      },
              { seq:8,  slug:"movements-for-equality",        lessonCount:18, title:"Movements for Equality",        anchor:"Social Studies / Civics"    },
              { seq:9,  slug:"the-power-of-reading",          lessonCount:16, title:"The Power of Reading",          anchor:"Literacy / Narrative"       },
              { seq:10, slug:"ancient-egypt",                 lessonCount:20, title:"Ancient Egypt",                 anchor:"History / Informational"    }
            ]},
    "2":  { label: "Grade 2", slug: "2nd-grade",
            units: [
              { seq:1, slug:"exploring-habitats",             lessonCount:22, title:"Exploring Habitats",            anchor:"Science / Informational"    },
              { seq:2, slug:"awesome-insects",                lessonCount:20, title:"Awesome Insects",               anchor:"Science / Informational"    },
              { seq:3, slug:"stories-of-immigration",         lessonCount:24, title:"Stories of Immigration",        anchor:"Social Studies / Narrative" },
              { seq:4, slug:"people-who-changed-the-world",   lessonCount:20, title:"People Who Changed the World",  anchor:"Biography / History"        },
              { seq:5, slug:"inside-the-human-body",          lessonCount:22, title:"Inside the Human Body",         anchor:"Science / Informational"    }
            ]},
    "3":  { label: "Grade 3", slug: "3rd-grade",
            units: [
              { seq:1, slug:"garveys-choice",                 lessonCount:26, title:"Garvey's Choice",               anchor:"Identity / Novel Study",  coreText:"Garvey's Choice"                      },
              { seq:2, slug:"charlottes-web",                 lessonCount:30, title:"Charlotte's Web",               anchor:"Friendship / Novel Study", coreText:"Charlotte's Web"                     },
              { seq:3, slug:"dyamonde-daniel",                lessonCount:24, title:"Dyamonde Daniel",               anchor:"Community / Novel Study",  coreText:"Dyamonde Daniel series"              },
              { seq:4, slug:"ecosystems",                     lessonCount:20, title:"Ecosystems",                    anchor:"Science / Informational"                                                   },
              { seq:5, slug:"american-indians",               lessonCount:22, title:"American Indians",              anchor:"History / Informational"                                                   }
            ]},
    "4":  { label: "Grade 4", slug: "4th-grade",
            units: [
              { seq:1, slug:"taking-a-stand",                 lessonCount:27, title:"Taking a Stand",                anchor:"Character / Novel Study",  coreText:"Shiloh"                               },
              { seq:2, slug:"finding-fortune",                lessonCount:26, title:"Finding Fortune",               anchor:"Adventure / Novel Study",  coreText:"Where the Mountain Meets the Moon"    },
              { seq:3, slug:"believing-in-yourself",          lessonCount:24, title:"Believing in Yourself",         anchor:"Resilience / Novel Study", coreText:"The Wild Book"                        },
              { seq:4, slug:"interpreting-perspectives",      lessonCount:22, title:"Interpreting Perspectives",     anchor:"Mythology / Analysis",     coreText:"Greek Myths"                          },
              { seq:5, slug:"learning-differently",           lessonCount:24, title:"Learning Differently",          anchor:"LD Awareness / Novel",     coreText:"Joey Pigza Swallowed the Key"         },
              { seq:6, slug:"discovering-self",               lessonCount:26, title:"Discovering Self",              anchor:"Identity / Novel Study",   coreText:"Bud, Not Buddy"                       }
            ]},
    "5":  { label: "Grade 5", slug: "5th-grade",
            units: [
              { seq:1, slug:"building-community",             lessonCount:24, title:"Building Community",            anchor:"Community / Novel Study",  coreText:"Seedfolks"                            },
              { seq:2, slug:"exploring-human-rights",         lessonCount:28, title:"Exploring Human Rights",        anchor:"Global Issues / Novel",    coreText:"The Breadwinner"                      },
              { seq:3, slug:"protecting-the-earth",           lessonCount:20, title:"Protecting the Earth",          anchor:"Environment / Argument",   coreText:"Plastic Pollution"                    },
              { seq:4, slug:"young-heroes",                   lessonCount:22, title:"Young Heroes",                  anchor:"Civil Rights / History",   coreText:"Children of the Civil Rights Movement"},
              { seq:5, slug:"friendship-across-boundaries",   lessonCount:24, title:"Friendship Across Boundaries",  anchor:"Identity / Novel Study",   coreText:"Return to Sender"                     }
            ]}
  };
  var FT_BASE = "https://www.fishtanklearning.org/curriculum/ela/";

  /* ── IS Word Study inline data (SAS G3–5) ─────────────── */
  var ISWS_GRADES = {
    "3": { label: "Grade 3",
      semesters: [
        { id:"G3-S1", label:"Semester 1", pageUrl:"https://iswordstudy.wordpress.com/grade-3/quarter-1/", lessons: [
          { n:1,  title:"Word Origins 1 – The Story of English",        docUrl:"https://iswordstudy.wordpress.com/wp-content/uploads/2011/01/word-origins-1-the-story-of-english3.doc" },
          { n:2,  title:"Word Origins 2 – Word Webs",                   docUrl:"https://iswordstudy.wordpress.com/wp-content/uploads/2011/01/word-origins-2-word-webs3.doc" },
          { n:3,  title:"Vowels & Consonants 1 – Vowels",               docUrl:"https://iswordstudy.wordpress.com/wp-content/uploads/2011/01/vowels-and-consonants-1-vowels4.doc" },
          { n:4,  title:"Vowels & Consonants 2 – Long & Short Vowels",  docUrl:"https://iswordstudy.wordpress.com/wp-content/uploads/2011/01/vowels-and-consonants-2-long-and-short-vowels3.doc" },
          { n:5,  title:"Vowels & Consonants 3 – Making Long Vowels",   docUrl:"https://iswordstudy.wordpress.com/wp-content/uploads/2011/01/vowels-and-consonants-3-making-long-vowels2.doc" },
          { n:6,  title:"Vowels & Consonants 4 – Jobs of the Silent -e",docUrl:"https://iswordstudy.wordpress.com/wp-content/uploads/2011/01/vowels-and-consonants-4-jobs-the-silent-e2.doc" },
          { n:7,  title:"Vowels & Consonants 5 – More Long Vowels",     docUrl:"https://iswordstudy.wordpress.com/wp-content/uploads/2011/01/vowels-and-consonants-5-more-long-vowels2.doc" },
          { n:8,  title:"Vowels & Consonants 6 – k, ck, ch, or tch",   docUrl:"https://iswordstudy.wordpress.com/wp-content/uploads/2011/01/vowels-and-consonants-6-c-ck-ch-or-tch2.doc" },
          { n:9,  title:"Vowels & Consonants 7 – wh Words & them/they/their", docUrl:"https://iswordstudy.wordpress.com/wp-content/uploads/2011/01/vowels-and-consonants-7-wh-words-and-the-words-them-they-and-their4.doc" },
          { n:10, title:"Vowels & Consonants 8 & 9 – Homophones",       docUrl:"https://iswordstudy.wordpress.com/wp-content/uploads/2011/01/vowels-and-consonants-8-and-9-homophones2.doc" },
          { n:12, title:"Vowels & Consonants 10 – Base Words Ending f, l, s", docUrl:"https://iswordstudy.wordpress.com/wp-content/uploads/2011/01/vowels-and-consonants-10-base-words-ending-in-f-l-s2.doc" },
          { n:13, title:"Semester 1 – Review Assessment",               docUrl:"https://iswordstudy.wordpress.com/wp-content/uploads/2011/01/semester-1-review-assessment.docx", isAssessment:true }
        ]},
        { id:"G3-S2", label:"Semester 2", pageUrl:"https://iswordstudy.wordpress.com/grade-3/quarter-3/", lessons: [
          { n:1,  title:"Building Words 1 – The Basic Blocks",          docUrl:"https://iswordstudy.wordpress.com/wp-content/uploads/2011/01/semester-2-1-building-blocks.doc" },
          { n:2,  title:"Building Words 2 – Spelling Out",              docUrl:"https://iswordstudy.wordpress.com/wp-content/uploads/2011/01/building-words-2-spelling-out1.doc" },
          { n:3,  title:"Building Words 3 – A Closer Look at Prefixes", docUrl:"https://iswordstudy.wordpress.com/wp-content/uploads/2011/01/building-words-3-a-closer-look-at-prefixes1.doc" },
          { n:4,  title:"Building Words 4 – A Closer Look at Suffixes", docUrl:"https://iswordstudy.wordpress.com/wp-content/uploads/2011/01/building-words-4-a-closer-look-at-suffixes1.doc" },
          { n:5,  title:"Building Words 5 – The Vowel Suffix -ing",     docUrl:"https://iswordstudy.wordpress.com/wp-content/uploads/2011/01/building-words-5-the-scoop-on-the-vowel-suffix-ing2.doc" },
          { n:6,  title:"Building Words 6 – The Suffix -ed",            docUrl:"https://iswordstudy.wordpress.com/wp-content/uploads/2011/01/building-words-6-the-suffix-ed3.doc" },
          { n:7,  title:"Building Words 7 – Compound Words",            docUrl:"https://iswordstudy.wordpress.com/wp-content/uploads/2011/01/building-words-7-compound-words1.doc" },
          { n:8,  title:"Building Words 8 – Base Words Ending in y",    docUrl:"https://iswordstudy.wordpress.com/wp-content/uploads/2011/01/building-words-8-base-words-ending-in-y1.doc" },
          { n:9,  title:"Building Words 9 – Plurals",                   docUrl:"https://iswordstudy.wordpress.com/wp-content/uploads/2011/01/building-words-9-plurals1.doc" },
          { n:10, title:"Building Words 10 – Suffixes -est or -ist",    docUrl:"https://iswordstudy.wordpress.com/wp-content/uploads/2011/01/building-words-10-suffiixes-est-or-ist2.doc" },
          { n:11, title:"Building Words 11 – w and x",                  docUrl:"https://iswordstudy.wordpress.com/wp-content/uploads/2011/01/building-words-11-w-and-x1.doc" },
          { n:12, title:"Building Words 12 – Using a Matrix",           docUrl:"https://iswordstudy.wordpress.com/wp-content/uploads/2011/01/building-words-12-using-a-matrix1.doc" },
          { n:13, title:"Building Words 13 – Using Matrices",           docUrl:"https://iswordstudy.wordpress.com/wp-content/uploads/2011/01/building-words-13-using-matrices3.doc" },
          { n:14, title:"Building Words 14 – Assessment & Review",      docUrl:"https://iswordstudy.wordpress.com/wp-content/uploads/2011/01/assessment-reveiw2.docx", isAssessment:true }
        ]}
      ]},
    "4": { label: "Grade 4",
      semesters: [
        { id:"G4-S1", label:"Semester 1", pageUrl:"https://iswordstudy.wordpress.com/grade-4/quarter-1-2/", lessons: [
          { n:1,  title:"Word Origins 1 & 2 – The Story of English",    docUrl:"https://iswordstudy.wordpress.com/wp-content/uploads/2011/01/word-orgins-1-and-2-the-story-of-english1.doc" },
          { n:3,  title:"Word Origins 3 – Word Webs",                   docUrl:"https://iswordstudy.wordpress.com/wp-content/uploads/2011/01/word-orgins-3-word-webs1.doc" },
          { n:4,  title:"Vowels & Consonants 1 – Vowels",               docUrl:"https://iswordstudy.wordpress.com/wp-content/uploads/2011/01/vowels-and-consonants-1-vowels-1.doc" },
          { n:5,  title:"Vowels & Consonants 2 – Long Vowels",          docUrl:"https://iswordstudy.wordpress.com/wp-content/uploads/2011/01/vowels-and-consonants-2-long-vowels.doc" },
          { n:6,  title:"Vowels & Consonants 3 – Long and Short ea",    docUrl:"https://iswordstudy.wordpress.com/wp-content/uploads/2011/01/vowels-and-consonants-3-long-and-short-ea.doc" },
          { n:7,  title:"Vowels & Consonants 4 – dge or ge",            docUrl:"https://iswordstudy.wordpress.com/wp-content/uploads/2011/01/vowel-and-consonants-4-dge-or-ge.doc" },
          { n:8,  title:"Vowels & Consonants 5 – Phonology of -f",      docUrl:"https://iswordstudy.wordpress.com/wp-content/uploads/2011/01/vowel-and-consonants-5-phonology-of-f.doc" },
          { n:9,  title:"Vowels & Consonants 6 & 7 – Homophones",       docUrl:"https://iswordstudy.wordpress.com/wp-content/uploads/2011/01/vowels-and-consonants-6-7-homophones.doc" },
          { n:11, title:"Vowels & Consonants 8 & 9 – Schwa",            docUrl:"https://iswordstudy.wordpress.com/wp-content/uploads/2011/01/vowels-and-consonants-8-9-schwa.doc" },
          { n:13, title:"Vowels & Consonants Review",                   docUrl:null }
        ]},
        { id:"G4-S2", label:"Semester 2", pageUrl:"https://iswordstudy.wordpress.com/grade-4/quarter-3/", lessons: [
          { n:1,  title:"Building Words 1 – The Building Blocks",        docUrl:"https://iswordstudy.wordpress.com/wp-content/uploads/2011/01/building-words-1-the-building-blocks.doc" },
          { n:2,  title:"Building Words 2 – Consonant Suffixes",         docUrl:"https://iswordstudy.wordpress.com/wp-content/uploads/2011/01/building-words-2-building-with-consonant-suffixes1.doc" },
          { n:3,  title:"Building Words 3 – Building with Prefixes",     docUrl:"https://iswordstudy.wordpress.com/wp-content/uploads/2011/01/building-words-3-building-with-prefixes1.doc" },
          { n:4,  title:"Building Words 4 – Vowel Suffixes",             docUrl:"https://iswordstudy.wordpress.com/wp-content/uploads/2011/01/word-building-4-building-with-vowel-suffixes3.doc" },
          { n:5,  title:"Building Words 5 – Using a Matrix",             docUrl:"https://iswordstudy.wordpress.com/wp-content/uploads/2011/01/word-building-5-using-a-matrix.doc" },
          { n:6,  title:"Building Words 6 – Base Words in Y & Suffix Checker", docUrl:"https://iswordstudy.wordpress.com/wp-content/uploads/2011/01/building-words-6-base-words-ending-in-y-and-learning-to-use-a-suffix-checker.doc" },
          { n:7,  title:"Building Words 7 – Suffixing to Polysyllables", docUrl:"https://iswordstudy.wordpress.com/wp-content/uploads/2011/01/building-words-7-suffixing-to-polysyllables.doc" },
          { n:8,  title:"Building Words 8 – Vowel Suffixes -ion, -ian, -ity", docUrl:"https://iswordstudy.wordpress.com/wp-content/uploads/2011/01/building-words-8-suffixes-ion-ian-ity1.doc" },
          { n:9,  title:"Building Words 9 – Compound Words",             docUrl:"https://iswordstudy.wordpress.com/wp-content/uploads/2011/01/building-words-9-compound-words.doc" },
          { n:10, title:"Building Words 10 & 11 – Plurals 1 and 2",      docUrl:"https://iswordstudy.wordpress.com/wp-content/uploads/2011/01/word-building-10-11-plurals-1-and-2.doc" },
          { n:12, title:"Building Words 12 – Suffix -t instead of -ed",  docUrl:"https://iswordstudy.wordpress.com/wp-content/uploads/2011/01/building-words12-when-to-use-suffix-t-instead-of-ed.doc" },
          { n:13, title:"Building Words 13 – Learning from Prefix dis-", docUrl:"https://iswordstudy.wordpress.com/wp-content/uploads/2011/01/building-words-13-learning-from-the-prefix-dis.docx" },
          { n:14, title:"Building Words 14 – Assessment & Review",       docUrl:"https://iswordstudy.wordpress.com/wp-content/uploads/2011/01/building-words-14-assessments-review.docx", isAssessment:true }
        ]}
      ]},
    "5": { label: "Grade 5",
      semesters: [
        { id:"G5-S1", label:"Semester 1", pageUrl:"https://iswordstudy.wordpress.com/grade-5/quarter-1/", lessons: [
          { n:1,  title:"Word Origins 1 – Origins of the English Language",docUrl:"https://iswordstudy.wordpress.com/wp-content/uploads/2011/01/word-origins-1-origins-of-english-language.doc" },
          { n:2,  title:"Word Origins 2 – Origins of the English Language",docUrl:"https://iswordstudy.wordpress.com/wp-content/uploads/2011/01/word-origins-2-origins-of-english-language.doc" },
          { n:3,  title:"Word Origins 3 – New Words",                    docUrl:"https://iswordstudy.wordpress.com/wp-content/uploads/2011/01/word-origins-3-new-words1.doc" },
          { n:4,  title:"Word Origins 4 – Word Webs and Matrices",        docUrl:"https://iswordstudy.wordpress.com/wp-content/uploads/2011/01/word-origins-4-word-webs-and-matrices.doc" },
          { n:5,  title:"Word Origins 5 – Word Ladders",                  docUrl:"https://iswordstudy.wordpress.com/wp-content/uploads/2011/01/word-origins-5-word-ladders.doc" },
          { n:6,  title:"Vowels & Consonants 1 – Vowel Review",           docUrl:"https://iswordstudy.wordpress.com/wp-content/uploads/2011/01/vowels-and-consonants-1-vowel-review.doc" },
          { n:7,  title:"Vowels & Consonants 2 – Long Vowels Review",     docUrl:"https://iswordstudy.wordpress.com/wp-content/uploads/2011/01/vowels-and-consonants-2-long-vowels-review.doc" },
          { n:8,  title:"Vowels & Consonants 3 & 4 – Schwa",              docUrl:"https://iswordstudy.wordpress.com/wp-content/uploads/2011/01/vowels-and-consonants-3-4-schwa.doc" },
          { n:10, title:"Vowels & Consonants 5 – Homophones",             docUrl:"https://iswordstudy.wordpress.com/wp-content/uploads/2011/01/vowels-and-consonants-5-homophones1.doc" },
          { n:11, title:"Vowels & Consonants 6 – Homographs",             docUrl:"https://iswordstudy.wordpress.com/wp-content/uploads/2011/01/vowels-and-consonants-6-homographs.doc" },
          { n:12, title:"Vowels & Consonants 7 – Portmanteau Words",      docUrl:"https://iswordstudy.wordpress.com/wp-content/uploads/2011/01/vowels-and-consonants-7-portmanteau-words-gr-5.doc" },
          { n:13, title:"Semester 1 – Review Assessment",                 docUrl:"https://iswordstudy.wordpress.com/wp-content/uploads/2011/01/semester-1-end-of-unit-assessment.docx", isAssessment:true }
        ]},
        { id:"G5-S2", label:"Semester 2", pageUrl:"https://iswordstudy.wordpress.com/grade-5/quarter-3/", lessons: [
          { n:1,  title:"Word Building 1 & 2 – The Building Blocks",      docUrl:"https://iswordstudy.wordpress.com/wp-content/uploads/2011/01/word-building-1-2-the-building-blocks.doc" },
          { n:3,  title:"Word Building 3 – Using a Matrix",               docUrl:"https://iswordstudy.wordpress.com/wp-content/uploads/2011/01/word-building-3-using-a-matrix.doc" },
          { n:4,  title:"Word Building 4, 5 & 6 – Prefixes",              docUrl:"https://iswordstudy.wordpress.com/wp-content/uploads/2011/01/word-building-45-6-prefixes1.docx" },
          { n:7,  title:"Word Building 7 – Suffixing to Polysyllabic Base",docUrl:"https://iswordstudy.wordpress.com/wp-content/uploads/2011/01/word-building-7-suffixing-to-polysyllabic-base.doc" },
          { n:8,  title:"Word Building 8 – Base Ending in -y & Suffix Checker",docUrl:"https://iswordstudy.wordpress.com/wp-content/uploads/2011/01/word-building-8-ending-in-y-and-learning-to-use-a-suffix-checker.doc" },
          { n:9,  title:"Word Building 9 – Suffix -or vs. -er",           docUrl:"https://iswordstudy.wordpress.com/wp-content/uploads/2011/01/word-building-9-when-to-use-the-suffix-or-instead-of-er.doc" },
          { n:10, title:"Word Building 10 – Suffix -able or -ible",       docUrl:"https://iswordstudy.wordpress.com/wp-content/uploads/2011/01/word-building-10-when-to-use-the-suffix-able-or-ible.doc" },
          { n:11, title:"Word Building 11 – Plurals",                     docUrl:"https://iswordstudy.wordpress.com/wp-content/uploads/2011/01/word-building-11-plurals.doc" },
          { n:12, title:"Word Building 12 – Plurals 2",                   docUrl:"https://iswordstudy.wordpress.com/wp-content/uploads/2011/01/word-building-12-plurals-2.doc" },
          { n:13, title:"Assessment & Review",                            docUrl:null, isAssessment:true }
        ]}
      ]}
  };

  /* ── UFLI Foundations inline data (K–2 phonics) ─────────
   * 128 lessons in 13 range-groups. Range URLs are stable
   * on the UFLI toolbox; individual lesson deep links 404.
   */
  var UFLI_GROUPS = [
    { id:"A", label:"Alphabet",                  start:1,   end:34,  focus:"Letter formation, sound-symbol correspondences, initial blending" },
    { id:"B", label:"CVC & Consonant Blends",    start:35,  end:41,  focus:"Short vowels a/i/o/u/e, consonant blends" },
    { id:"C", label:"Consonant Digraphs",        start:42,  end:53,  focus:"FLOSS rule, ck, sh, th, ch, wh, ph, ng, nk" },
    { id:"D", label:"VCe — Silent E",            start:54,  end:62,  focus:"Long vowel-consonant-e patterns" },
    { id:"E", label:"Reading Longer Words",      start:63,  end:68,  focus:"-es, -ed, -ing, open/closed syllables, compound words" },
    { id:"F", label:"Special Patterns",          start:69,  end:76,  focus:"tch, dge, short vowel exceptions, final -y, -le" },
    { id:"G", label:"R-Controlled Vowels",       start:77,  end:83,  focus:"ar, or, ore, er, ir, ur, w+or" },
    { id:"H", label:"Long Vowel Teams",          start:84,  end:88,  focus:"ai/ay, ee/ea/ey, oa/ow/oe, ie" },
    { id:"I", label:"Vowel Teams 2",             start:89,  end:94,  focus:"oo (book/moon), ew/ui/ue, aw/au" },
    { id:"J", label:"Diphthongs & Silent Letters",start:95,  end:98,  focus:"Diphthongs, kn-, wr-, -mb" },
    { id:"K", label:"Suffixes & Prefixes",       start:99,  end:106, focus:"-es, -ed, -ing, -er, -est, -ly, -less, -ful, -ion" },
    { id:"L", label:"Advanced Morphology",       start:107, end:118, focus:"Advanced morphological patterns, complex word structures" },
    { id:"M", label:"Extended Affixes",          start:119, end:128, focus:"Additional prefixes/suffixes, morphological mastery" }
  ];
  var UFLI_BASE = "https://ufli.education.ufl.edu/foundations/toolbox/";
  var UFLI_TOTAL = 128;

  function ufliGroupForLesson(n) {
    for (var i = 0; i < UFLI_GROUPS.length; i++) {
      if (n >= UFLI_GROUPS[i].start && n <= UFLI_GROUPS[i].end) return UFLI_GROUPS[i];
    }
    return UFLI_GROUPS[UFLI_GROUPS.length - 1];
  }

  /* ── Illustrative Mathematics K–5 inline data ───────────
   * Confirmed URL pattern (live verified):
   * im.kendallhunt.com/K5/teachers/{gradeSlug}/unit-{u}/lesson-{l}/preparation.html
   */
  var IM_GRADES = {
    "K":  { label:"Kindergarten", slug:"kindergarten",
            units: [
              { u:1, title:"Math in Our World",                       lessonCount:17 },
              { u:2, title:"Numbers 1–10",                            lessonCount:22 },
              { u:3, title:"Flat Shapes All Around Us",               lessonCount:15 },
              { u:4, title:"Understanding Addition and Subtraction",  lessonCount:18 },
              { u:5, title:"Composing and Decomposing Numbers to 10", lessonCount:15 },
              { u:6, title:"Numbers 0–20",                            lessonCount:13 },
              { u:7, title:"Solid Shapes All Around Us",              lessonCount:16 },
              { u:8, title:"Putting It All Together",                 lessonCount:21 }
            ]},
    "1":  { label:"Grade 1", slug:"grade-1",
            units: [
              { u:1, title:"Adding, Subtracting, and Working with Data",   lessonCount:15 },
              { u:2, title:"Addition and Subtraction Story Problems",       lessonCount:22 },
              { u:3, title:"Adding and Subtracting Within 20",             lessonCount:28 },
              { u:4, title:"Numbers to 99",                                lessonCount:23 },
              { u:5, title:"Adding Within 100",                            lessonCount:14 },
              { u:6, title:"Length Measurements Within 120 Units",         lessonCount:17 },
              { u:7, title:"Geometry and Time",                            lessonCount:17 },
              { u:8, title:"Putting It All Together",                      lessonCount:10 }
            ]},
    "2":  { label:"Grade 2", slug:"grade-2",
            units: [
              { u:1, title:"Adding, Subtracting, and Working with Data",   lessonCount:18 },
              { u:2, title:"Adding and Subtracting within 100",            lessonCount:16 },
              { u:3, title:"Measuring Length",                             lessonCount:18 },
              { u:4, title:"Addition and Subtraction on the Number Line",  lessonCount:15 },
              { u:5, title:"Numbers to 1,000",                             lessonCount:14 },
              { u:6, title:"Geometry, Time, and Money",                    lessonCount:21 },
              { u:7, title:"Adding and Subtracting within 1,000",          lessonCount:18 },
              { u:8, title:"Equal Groups",                                 lessonCount:13 },
              { u:9, title:"Putting It All Together",                      lessonCount:13 }
            ]},
    "3":  { label:"Grade 3", slug:"grade-3",
            units: [
              { u:1, title:"Introducing Multiplication",                             lessonCount:21 },
              { u:2, title:"Area and Multiplication",                                lessonCount:15 },
              { u:3, title:"Wrapping Up Addition and Subtraction Within 1,000",      lessonCount:21 },
              { u:4, title:"Relating Multiplication to Division",                    lessonCount:22 },
              { u:5, title:"Fractions as Numbers",                                   lessonCount:18 },
              { u:6, title:"Measuring Length, Time, Liquid Volume, and Weight",      lessonCount:16 },
              { u:7, title:"Two-dimensional Shapes and Perimeter",                   lessonCount:15 },
              { u:8, title:"Putting It All Together",                                lessonCount:15 }
            ]},
    "4":  { label:"Grade 4", slug:"grade-4",
            units: [
              { u:1, title:"Factors and Multiples",                                  lessonCount:8  },
              { u:2, title:"Fraction Equivalence and Comparison",                    lessonCount:17 },
              { u:3, title:"Extending Operations to Fractions",                      lessonCount:20 },
              { u:4, title:"From Hundredths to Hundred-thousands",                   lessonCount:23 },
              { u:5, title:"Multiplicative Comparison and Measurement",              lessonCount:18 },
              { u:6, title:"Multiplying and Dividing Multi-digit Numbers",           lessonCount:25 },
              { u:7, title:"Angles and Angle Measurement",                           lessonCount:16 },
              { u:8, title:"Properties of Two-dimensional Shapes",                   lessonCount:10 },
              { u:9, title:"Putting It All Together",                                lessonCount:12 }
            ]},
    "5":  { label:"Grade 5", slug:"grade-5",
            units: [
              { u:1, title:"Finding Volume",                                                        lessonCount:12 },
              { u:2, title:"Fractions as Quotients and Fraction Multiplication",                    lessonCount:17 },
              { u:3, title:"Multiplying and Dividing Fractions",                                    lessonCount:20 },
              { u:4, title:"Wrapping Up Multiplication and Division with Multi-Digit Numbers",      lessonCount:21 },
              { u:5, title:"Place Value Patterns and Decimal Operations",                           lessonCount:26 },
              { u:6, title:"More Decimal and Fraction Operations",                                  lessonCount:21 },
              { u:7, title:"Shapes on the Coordinate Plane",                                        lessonCount:13 },
              { u:8, title:"Putting It All Together",                                               lessonCount:18 }
            ]}
  };
  var IM_BASE = "https://im.kendallhunt.com/K5/teachers/";

  function buildIMUrl(gradeSlug, unitN, lessonN) {
    return IM_BASE + gradeSlug + "/unit-" + unitN + "/lesson-" + lessonN + "/preparation.html";
  }

  /* ── Lesson navigator — localStorage state ────────────── */
  function lsNavKey(currId, grade)    { return "cs.lessonNav." + currId + "." + grade; }
  function getLessonNavState(currId, grade) {
    try {
      var raw = localStorage.getItem(lsNavKey(currId, grade));
      return raw ? JSON.parse(raw) : null;
    } catch (_e) { return null; }
  }
  function setLessonNavState(currId, grade, state) {
    try { localStorage.setItem(lsNavKey(currId, grade), JSON.stringify(state)); } catch (_e) {}
  }

  /* ── Lesson URL builders ──────────────────────────────── */
  function fishtankGradeKey(gradeBand) {
    if (!gradeBand) return null;
    var s = String(gradeBand).toUpperCase().replace(/\s/g, "");
    if (s === "K" || s === "GK" || s === "KG" || s === "G0") return "K";
    var m = s.match(/(\d)/);
    return m ? m[1] : null;
  }

  function buildFishtankLessonUrl(gradeSlug, unitSlug, lessonN) {
    return FT_BASE + gradeSlug + "/" + unitSlug + "/lesson-" + lessonN + "/";
  }

  /* ── Render: Fishtank lesson navigator ───────────────────
   * Returns HTML string; data-* attrs used for JS binding.
   */
  function renderFishtankNav(gradeKey) {
    var ftGrade = FISHTANK_GRADES[gradeKey];
    if (!ftGrade || !ftGrade.units || !ftGrade.units.length) return "";

    var state = getLessonNavState("fishtank", gradeKey) || { unitIdx: 0, lessonN: 1 };
    var unitIdx  = Math.max(0, Math.min(state.unitIdx  || 0, ftGrade.units.length - 1));
    var unit     = ftGrade.units[unitIdx];
    var lessonN  = Math.max(1, Math.min(state.lessonN || 1, unit.lessonCount));
    var lessonUrl = buildFishtankLessonUrl(ftGrade.slug, unit.slug, lessonN);
    var unitUrl   = FT_BASE + ftGrade.slug + "/" + unit.slug + "/";
    var coreText  = unit.coreText && unit.coreText !== unit.title ? " — " + unit.coreText : "";

    var prevUnitOk = unitIdx > 0;
    var nextUnitOk = unitIdx < ftGrade.units.length - 1;
    var prevLsnOk  = lessonN > 1;
    var nextLsnOk  = lessonN < unit.lessonCount;

    return [
      '<div class="th2-lnav" data-lnav-curr="fishtank" data-lnav-grade="' + escapeHtml(gradeKey) + '">',
      '  <div class="th2-lnav-header">',
      '    <span class="th2-lnav-badge th2-lnav-badge--fishtank">Fishtank ELA</span>',
      '    <span class="th2-lnav-grade">' + escapeHtml(ftGrade.label) + '</span>',
      '    <div class="th2-lnav-unit-nav">',
      '      <button class="th2-lnav-unit-btn" data-lnav-unit-dir="-1" title="Previous unit"' + (prevUnitOk ? '' : ' disabled') + '>‹</button>',
      '      <span class="th2-lnav-unit-label" title="' + escapeHtml(unit.anchor) + '">' + escapeHtml(unit.title) + escapeHtml(coreText) + '</span>',
      '      <button class="th2-lnav-unit-btn" data-lnav-unit-dir="1" title="Next unit"' + (nextUnitOk ? '' : ' disabled') + '>›</button>',
      '    </div>',
      '  </div>',
      '  <div class="th2-lnav-body">',
      '    <button class="th2-lnav-btn" data-lnav-dir="-1" title="Previous lesson"' + (prevLsnOk ? '' : ' disabled') + '>‹</button>',
      '    <div class="th2-lnav-lesson">',
      '      <a class="th2-lnav-lesson-link" href="' + escapeHtml(lessonUrl) + '" target="_blank" rel="noopener">',
      '        Lesson ' + lessonN,
      '      </a>',
      '      <span class="th2-lnav-lesson-of">of ' + unit.lessonCount + '</span>',
      '    </div>',
      '    <button class="th2-lnav-btn" data-lnav-dir="1" title="Next lesson"' + (nextLsnOk ? '' : ' disabled') + '>›</button>',
      '  </div>',
      '  <div class="th2-lnav-unit-link-row">',
      '    <a class="th2-lnav-unit-link" href="' + escapeHtml(unitUrl) + '" target="_blank" rel="noopener">Open full unit</a>',
      '    <button class="th2-lnav-setpos-btn" data-lnav-setpos type="button" title="Set current position">📍 Set position</button>',
      '  </div>',
      '</div>'
    ].join("\n");
  }

  /* ── Render: IS Word Study lesson navigator ───────────── */
  function renderISWSNav(gradeKey) {
    var grade = ISWS_GRADES[gradeKey];
    if (!grade || !grade.semesters || !grade.semesters.length) return "";

    var state   = getLessonNavState("iswordstudy", gradeKey) || { semIdx: 0, lessonIdx: 0 };
    var semIdx  = Math.max(0, Math.min(state.semIdx || 0, grade.semesters.length - 1));
    var sem     = grade.semesters[semIdx];
    var lessons = sem.lessons || [];
    var lessonIdx = Math.max(0, Math.min(state.lessonIdx || 0, lessons.length - 1));
    var lesson  = lessons[lessonIdx] || {};
    var docUrl  = lesson.docUrl || sem.pageUrl;

    var prevSemOk = semIdx > 0;
    var nextSemOk = semIdx < grade.semesters.length - 1;
    var prevLsnOk = lessonIdx > 0;
    var nextLsnOk = lessonIdx < lessons.length - 1;
    var titleShort = lesson.title && lesson.title.length > 52
      ? lesson.title.slice(0, 49) + "…" : (lesson.title || "");

    return [
      '<div class="th2-lnav th2-lnav--isws" data-lnav-curr="iswordstudy" data-lnav-grade="' + escapeHtml(gradeKey) + '">',
      '  <div class="th2-lnav-header">',
      '    <span class="th2-lnav-badge th2-lnav-badge--isws">IS Word Study</span>',
      '    <span class="th2-lnav-grade">' + escapeHtml(grade.label) + '</span>',
      '    <div class="th2-lnav-unit-nav">',
      '      <button class="th2-lnav-unit-btn" data-lnav-sem-dir="-1" title="Previous semester"' + (prevSemOk ? '' : ' disabled') + '>‹</button>',
      '      <span class="th2-lnav-unit-label">' + escapeHtml(sem.label) + '</span>',
      '      <button class="th2-lnav-unit-btn" data-lnav-sem-dir="1" title="Next semester"' + (nextSemOk ? '' : ' disabled') + '>›</button>',
      '    </div>',
      '  </div>',
      '  <div class="th2-lnav-body">',
      '    <button class="th2-lnav-btn" data-lnav-dir="-1" title="Previous lesson"' + (prevLsnOk ? '' : ' disabled') + '>‹</button>',
      '    <div class="th2-lnav-lesson">',
      '      <span class="th2-lnav-lesson-num">Lesson ' + (lessonIdx + 1) + ' of ' + lessons.length + '</span>',
      '      ' + (docUrl
          ? '<a class="th2-lnav-lesson-link" href="' + escapeHtml(docUrl) + '" target="_blank" rel="noopener">' + escapeHtml(titleShort) + '</a>'
          : '<span class="th2-lnav-lesson-nohref">' + escapeHtml(titleShort) + '</span>'),
      '    </div>',
      '    <button class="th2-lnav-btn" data-lnav-dir="1" title="Next lesson"' + (nextLsnOk ? '' : ' disabled') + '>›</button>',
      '  </div>',
      '  <div class="th2-lnav-unit-link-row">',
      '    <a class="th2-lnav-unit-link" href="' + escapeHtml(sem.pageUrl) + '" target="_blank" rel="noopener">Open semester page</a>',
      '    <button class="th2-lnav-setpos-btn" data-lnav-setpos type="button" title="Set current position">📍 Set position</button>',
      '  </div>',
      '</div>'
    ].join("\n");
  }

  /* ── Render: UFLI Foundations navigator ──────────────────
   * Lesson-level URLs 404; links to the range-group toolbox page.
   */
  function renderUFLINav(gradeKey) {
    /* UFLI is for K–2; grade key is used only for localStorage */
    var state   = getLessonNavState("ufli", gradeKey) || { lessonN: 1 };
    var lessonN = Math.max(1, Math.min(state.lessonN || 1, UFLI_TOTAL));
    var group   = ufliGroupForLesson(lessonN);
    var groupUrl = UFLI_BASE + group.start + "-" + group.end + "/";
    var prevOk  = lessonN > 1;
    var nextOk  = lessonN < UFLI_TOTAL;

    return [
      '<div class="th2-lnav th2-lnav--ufli" data-lnav-curr="ufli" data-lnav-grade="' + escapeHtml(gradeKey) + '">',
      '  <div class="th2-lnav-header">',
      '    <span class="th2-lnav-badge th2-lnav-badge--ufli">UFLI Foundations</span>',
      '    <span class="th2-lnav-grade">K–2 Phonics</span>',
      '    <div class="th2-lnav-unit-nav">',
      '      <span class="th2-lnav-unit-label" title="' + escapeHtml(group.focus) + '">' + escapeHtml(group.label) + '</span>',
      '    </div>',
      '  </div>',
      '  <div class="th2-lnav-body">',
      '    <button class="th2-lnav-btn" data-lnav-dir="-1" title="Previous lesson"' + (prevOk ? '' : ' disabled') + '>‹</button>',
      '    <div class="th2-lnav-lesson">',
      '      <a class="th2-lnav-lesson-link" href="' + escapeHtml(groupUrl) + '" target="_blank" rel="noopener">Lesson ' + lessonN + '</a>',
      '      <span class="th2-lnav-lesson-of">of ' + UFLI_TOTAL + '</span>',
      '    </div>',
      '    <button class="th2-lnav-btn" data-lnav-dir="1" title="Next lesson"' + (nextOk ? '' : ' disabled') + '>›</button>',
      '  </div>',
      '  <div class="th2-lnav-unit-link-row">',
      '    <span class="th2-lnav-lesson-focus">' + escapeHtml(group.focus) + '</span>',
      '    <button class="th2-lnav-setpos-btn" data-lnav-setpos type="button" title="Set current lesson">📍 Set position</button>',
      '  </div>',
      '</div>'
    ].join("\n");
  }

  /* ── Render: Illustrative Math navigator ─────────────────
   * Confirmed URL: im.kendallhunt.com/K5/teachers/{gradeSlug}/unit-{u}/lesson-{l}/preparation.html
   */
  function renderIMNav(gradeKey) {
    var imGrade = IM_GRADES[gradeKey];
    if (!imGrade || !imGrade.units || !imGrade.units.length) return "";

    var state    = getLessonNavState("illustrative-math", gradeKey) || { unitIdx: 0, lessonN: 1 };
    var unitIdx  = Math.max(0, Math.min(state.unitIdx || 0, imGrade.units.length - 1));
    var unit     = imGrade.units[unitIdx];
    var lessonN  = Math.max(1, Math.min(state.lessonN || 1, unit.lessonCount));
    var lessonUrl = buildIMUrl(imGrade.slug, unit.u, lessonN);
    var unitUrl   = IM_BASE + imGrade.slug + "/unit-" + unit.u + "/lessons.html";

    var prevUnitOk = unitIdx > 0;
    var nextUnitOk = unitIdx < imGrade.units.length - 1;
    var prevLsnOk  = lessonN > 1;
    var nextLsnOk  = lessonN < unit.lessonCount;

    return [
      '<div class="th2-lnav th2-lnav--im" data-lnav-curr="illustrative-math" data-lnav-grade="' + escapeHtml(gradeKey) + '">',
      '  <div class="th2-lnav-header">',
      '    <span class="th2-lnav-badge th2-lnav-badge--im">IM Math K–5</span>',
      '    <span class="th2-lnav-grade">' + escapeHtml(imGrade.label) + '</span>',
      '    <div class="th2-lnav-unit-nav">',
      '      <button class="th2-lnav-unit-btn" data-lnav-unit-dir="-1" title="Previous unit"' + (prevUnitOk ? '' : ' disabled') + '>‹</button>',
      '      <span class="th2-lnav-unit-label">Unit ' + unit.u + ': ' + escapeHtml(unit.title) + '</span>',
      '      <button class="th2-lnav-unit-btn" data-lnav-unit-dir="1" title="Next unit"' + (nextUnitOk ? '' : ' disabled') + '>›</button>',
      '    </div>',
      '  </div>',
      '  <div class="th2-lnav-body">',
      '    <button class="th2-lnav-btn" data-lnav-dir="-1" title="Previous lesson"' + (prevLsnOk ? '' : ' disabled') + '>‹</button>',
      '    <div class="th2-lnav-lesson">',
      '      <a class="th2-lnav-lesson-link" href="' + escapeHtml(lessonUrl) + '" target="_blank" rel="noopener">Lesson ' + lessonN + '</a>',
      '      <span class="th2-lnav-lesson-of">of ' + unit.lessonCount + '</span>',
      '    </div>',
      '    <button class="th2-lnav-btn" data-lnav-dir="1" title="Next lesson"' + (nextLsnOk ? '' : ' disabled') + '>›</button>',
      '  </div>',
      '  <div class="th2-lnav-unit-link-row">',
      '    <a class="th2-lnav-unit-link" href="' + escapeHtml(unitUrl) + '" target="_blank" rel="noopener">Open unit</a>',
      '    <button class="th2-lnav-setpos-btn" data-lnav-setpos type="button" title="Set current position">📍 Set position</button>',
      '  </div>',
      '</div>'
    ].join("\n");
  }

  /* ── Set-position form builder ───────────────────────────
   * Returns HTML for the inline form injected into the footer row
   * when the teacher clicks "📍 Set position".
   */
  function buildSetPosFormHtml(currId, gradeKey) {
    var html = ['<div class="th2-lnav-setpos-form" data-setpos-form>'];

    if (currId === "fishtank") {
      var ftGrade = FISHTANK_GRADES[gradeKey];
      var cur = getLessonNavState("fishtank", gradeKey) || { unitIdx: 0, lessonN: 1 };
      html.push('<select class="th2-lnav-setpos-select" data-setpos-unit>');
      (ftGrade ? ftGrade.units : []).forEach(function (u, i) {
        html.push('<option value="' + i + '"' + (i === (cur.unitIdx || 0) ? ' selected' : '') + '>Unit ' + u.seq + ': ' + escapeHtml(u.title) + '</option>');
      });
      html.push('</select>');
      html.push('<label class="th2-lnav-setpos-label">Lesson</label>');
      html.push('<input class="th2-lnav-setpos-num" data-setpos-lesson type="number" min="1" max="' + (ftGrade ? ftGrade.units[cur.unitIdx || 0].lessonCount : 99) + '" value="' + (cur.lessonN || 1) + '">');

    } else if (currId === "iswordstudy") {
      var iwGrade = ISWS_GRADES[gradeKey];
      var curIW = getLessonNavState("iswordstudy", gradeKey) || { semIdx: 0, lessonIdx: 0 };
      html.push('<select class="th2-lnav-setpos-select" data-setpos-sem>');
      (iwGrade ? iwGrade.semesters : []).forEach(function (s, i) {
        html.push('<option value="' + i + '"' + (i === (curIW.semIdx || 0) ? ' selected' : '') + '>' + escapeHtml(s.label) + '</option>');
      });
      html.push('</select>');
      var curSemLessons = iwGrade ? (iwGrade.semesters[curIW.semIdx || 0].lessons || []).length : 14;
      html.push('<label class="th2-lnav-setpos-label">Lesson</label>');
      html.push('<input class="th2-lnav-setpos-num" data-setpos-lesson type="number" min="1" max="' + curSemLessons + '" value="' + ((curIW.lessonIdx || 0) + 1) + '">');

    } else if (currId === "ufli") {
      var curUF = getLessonNavState("ufli", gradeKey) || { lessonN: 1 };
      html.push('<label class="th2-lnav-setpos-label">Lesson (1–128)</label>');
      html.push('<input class="th2-lnav-setpos-num" data-setpos-lesson type="number" min="1" max="128" value="' + (curUF.lessonN || 1) + '">');

    } else if (currId === "illustrative-math") {
      var imGr = IM_GRADES[gradeKey];
      var curIM = getLessonNavState("illustrative-math", gradeKey) || { unitIdx: 0, lessonN: 1 };
      html.push('<select class="th2-lnav-setpos-select" data-setpos-unit>');
      (imGr ? imGr.units : []).forEach(function (u, i) {
        html.push('<option value="' + i + '"' + (i === (curIM.unitIdx || 0) ? ' selected' : '') + '>Unit ' + u.u + ': ' + escapeHtml(u.title) + '</option>');
      });
      html.push('</select>');
      html.push('<label class="th2-lnav-setpos-label">Lesson</label>');
      html.push('<input class="th2-lnav-setpos-num" data-setpos-lesson type="number" min="1" max="' + (imGr ? imGr.units[curIM.unitIdx || 0].lessonCount : 99) + '" value="' + (curIM.lessonN || 1) + '">');
    }

    html.push('<button class="th2-lnav-setpos-save" data-setpos-save type="button">Save</button>');
    html.push('<button class="th2-lnav-setpos-cancel" data-setpos-cancel type="button">✕</button>');
    html.push('</div>');
    return html.join("");
  }

  /* ── Bind lesson navigator events ────────────────────────
   * Called after focusCard innerHTML is set.
   * Each .th2-lnav widget re-renders in-place on nav clicks.
   */
  function bindLessonNavEvents(container) {
    if (!container) return;

    container.querySelectorAll(".th2-lnav").forEach(function (navEl) {
      var currId  = navEl.getAttribute("data-lnav-curr")  || "";
      var gradeKey = navEl.getAttribute("data-lnav-grade") || "";

      /* Helper: re-render this specific nav widget */
      function rerender() {
        var html;
        if      (currId === "fishtank")          html = renderFishtankNav(gradeKey);
        else if (currId === "iswordstudy")        html = renderISWSNav(gradeKey);
        else if (currId === "ufli")               html = renderUFLINav(gradeKey);
        else if (currId === "illustrative-math")  html = renderIMNav(gradeKey);
        if (!html) return;
        var tmp = document.createElement("div");
        tmp.innerHTML = html;
        var newEl = tmp.firstElementChild;
        if (newEl && navEl.parentNode) {
          navEl.parentNode.replaceChild(newEl, navEl);
          bindLessonNavEvents(container);
        }
      }

      /* Fishtank + IM: unit prev/next ‹ › */
      navEl.querySelectorAll("[data-lnav-unit-dir]").forEach(function (btn) {
        btn.addEventListener("click", function () {
          var dir = parseInt(btn.getAttribute("data-lnav-unit-dir"), 10) || 0;
          if (currId === "fishtank") {
            var ftGrade = FISHTANK_GRADES[gradeKey];
            if (!ftGrade) return;
            var st = getLessonNavState("fishtank", gradeKey) || { unitIdx: 0, lessonN: 1 };
            setLessonNavState("fishtank", gradeKey, { unitIdx: Math.max(0, Math.min((st.unitIdx || 0) + dir, ftGrade.units.length - 1)), lessonN: 1 });
          } else if (currId === "illustrative-math") {
            var imGr = IM_GRADES[gradeKey];
            if (!imGr) return;
            var stIM = getLessonNavState("illustrative-math", gradeKey) || { unitIdx: 0, lessonN: 1 };
            setLessonNavState("illustrative-math", gradeKey, { unitIdx: Math.max(0, Math.min((stIM.unitIdx || 0) + dir, imGr.units.length - 1)), lessonN: 1 });
          }
          rerender();
        });
      });

      /* IS Word Study: semester prev/next */
      navEl.querySelectorAll("[data-lnav-sem-dir]").forEach(function (btn) {
        btn.addEventListener("click", function () {
          var dir   = parseInt(btn.getAttribute("data-lnav-sem-dir"), 10) || 0;
          var grade = ISWS_GRADES[gradeKey];
          if (!grade) return;
          var state = getLessonNavState("iswordstudy", gradeKey) || { semIdx: 0, lessonIdx: 0 };
          setLessonNavState("iswordstudy", gradeKey, { semIdx: Math.max(0, Math.min((state.semIdx || 0) + dir, grade.semesters.length - 1)), lessonIdx: 0 });
          rerender();
        });
      });

      /* Lesson prev/next ‹ › — all curricula */
      navEl.querySelectorAll("[data-lnav-dir]").forEach(function (btn) {
        btn.addEventListener("click", function () {
          var dir = parseInt(btn.getAttribute("data-lnav-dir"), 10) || 0;

          if (currId === "fishtank") {
            var ftGrade = FISHTANK_GRADES[gradeKey];
            if (!ftGrade) return;
            var st = getLessonNavState("fishtank", gradeKey) || { unitIdx: 0, lessonN: 1 };
            var unitIdx = Math.max(0, Math.min(st.unitIdx || 0, ftGrade.units.length - 1));
            setLessonNavState("fishtank", gradeKey, { unitIdx: unitIdx, lessonN: Math.max(1, Math.min((st.lessonN || 1) + dir, ftGrade.units[unitIdx].lessonCount)) });

          } else if (currId === "iswordstudy") {
            var gData = ISWS_GRADES[gradeKey];
            if (!gData) return;
            var st2 = getLessonNavState("iswordstudy", gradeKey) || { semIdx: 0, lessonIdx: 0 };
            var semIdx = Math.max(0, Math.min(st2.semIdx || 0, gData.semesters.length - 1));
            var lessons = gData.semesters[semIdx].lessons || [];
            setLessonNavState("iswordstudy", gradeKey, { semIdx: semIdx, lessonIdx: Math.max(0, Math.min((st2.lessonIdx || 0) + dir, lessons.length - 1)) });

          } else if (currId === "ufli") {
            var stUF = getLessonNavState("ufli", gradeKey) || { lessonN: 1 };
            setLessonNavState("ufli", gradeKey, { lessonN: Math.max(1, Math.min((stUF.lessonN || 1) + dir, UFLI_TOTAL)) });

          } else if (currId === "illustrative-math") {
            var imGr2 = IM_GRADES[gradeKey];
            if (!imGr2) return;
            var stIM2 = getLessonNavState("illustrative-math", gradeKey) || { unitIdx: 0, lessonN: 1 };
            var uIdx2 = Math.max(0, Math.min(stIM2.unitIdx || 0, imGr2.units.length - 1));
            setLessonNavState("illustrative-math", gradeKey, { unitIdx: uIdx2, lessonN: Math.max(1, Math.min((stIM2.lessonN || 1) + dir, imGr2.units[uIdx2].lessonCount)) });
          }
          rerender();
        });
      });

      /* Set-position button — show inline form */
      var setposBtn = navEl.querySelector("[data-lnav-setpos]");
      if (setposBtn) {
        setposBtn.addEventListener("click", function () {
          var footerRow = navEl.querySelector(".th2-lnav-unit-link-row");
          if (!footerRow) return;
          footerRow.innerHTML = buildSetPosFormHtml(currId, gradeKey);

          /* Save */
          var saveBtn = footerRow.querySelector("[data-setpos-save]");
          if (saveBtn) {
            saveBtn.addEventListener("click", function () {
              var unitSel  = footerRow.querySelector("[data-setpos-unit]");
              var semSel   = footerRow.querySelector("[data-setpos-sem]");
              var lessonIn = footerRow.querySelector("[data-setpos-lesson]");
              var uIdx  = unitSel  ? parseInt(unitSel.value,  10) : 0;
              var sIdx  = semSel   ? parseInt(semSel.value,   10) : 0;
              var lVal  = lessonIn ? parseInt(lessonIn.value, 10) : 1;
              if (isNaN(uIdx))  uIdx = 0;
              if (isNaN(sIdx))  sIdx = 0;
              if (isNaN(lVal) || lVal < 1) lVal = 1;

              if (currId === "fishtank") {
                setLessonNavState("fishtank", gradeKey, { unitIdx: uIdx, lessonN: lVal });
              } else if (currId === "iswordstudy") {
                setLessonNavState("iswordstudy", gradeKey, { semIdx: sIdx, lessonIdx: lVal - 1 });
              } else if (currId === "ufli") {
                setLessonNavState("ufli", gradeKey, { lessonN: lVal });
              } else if (currId === "illustrative-math") {
                setLessonNavState("illustrative-math", gradeKey, { unitIdx: uIdx, lessonN: lVal });
              }
              showToast("Position saved.", "success");
              rerender();
            });
          }
          /* Cancel */
          var cancelBtn = footerRow.querySelector("[data-setpos-cancel]");
          if (cancelBtn) {
            cancelBtn.addEventListener("click", function () { rerender(); });
          }
        });
      }
    });
  }

  /* ── Main curriculum alignment card ─────────────────────── */
  function renderCurriculumSection(recTitle, module, gradeBand) {
    var goal = matchCurriculumGoal(recTitle, module);
    var smartTrunc = goal.smart.length > 120 ? goal.smart.slice(0, 117) + "…" : goal.smart;

    var gradeKey  = fishtankGradeKey(gradeBand);
    var grade0to2 = gradeKey === "K" || gradeKey === "0" || gradeKey === "1" || gradeKey === "2";
    var grade3to5 = gradeKey === "3" || gradeKey === "4" || gradeKey === "5";
    var isNumera  = goal.domain.indexOf("numer") >= 0;
    var isDecod   = goal.domain.indexOf("decod") >= 0 || goal.domain.indexOf("phon") >= 0;
    var isSpell   = goal.domain.indexOf("spell") >= 0 || goal.domain.indexOf("morphol") >= 0;
    var isELA     = !isNumera;

    /* Determine which navigators to show */
    var showFishtank = !!gradeKey && isELA;
    var showISWS     = grade3to5  && (isSpell || isDecod);
    var showUFLI     = !!gradeKey && (isDecod || (grade0to2 && isELA));
    var showIM       = !!gradeKey && isNumera && !!IM_GRADES[gradeKey];

    var navsHtml = [
      showIM       ? renderIMNav(gradeKey)       : "",
      showFishtank ? renderFishtankNav(gradeKey) : "",
      showISWS     ? renderISWSNav(gradeKey)     : "",
      showUFLI     ? renderUFLINav(gradeKey)     : ""
    ].filter(Boolean).join("\n");

    /* Fallback — always show at least Fishtank for ELA-capable grades */
    if (!navsHtml && gradeKey && !isNumera) {
      navsHtml = renderFishtankNav(gradeKey);
    }

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
      navsHtml,
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

        /* Phase 11 — Progress Notes */
        (function () {
          var planIntel = hubState.get().intelligence;
          var drawerPlan = planIntel && planIntel.plan;
          var tmpl = drawerPlan && drawerPlan.progressNoteTemplate;
          var noteTeacher = (tmpl && tmpl.teacher) ? String(tmpl.teacher) : "No note available yet.";
          if (!tmpl) return "";
          return [
            '<div class="th2-drawer-section">',
            '  <h4 class="th2-drawer-section-head">Progress Notes <span class="th2-auto-badge">Auto-generated</span></h4>',
            '  <div class="th2-drawer-note-tabs">',
            '    <button class="th2-note-tab is-active" data-note-target="teacher">Teacher</button>',
            '    <button class="th2-note-tab" data-note-target="family">Parent</button>',
            '    <button class="th2-note-tab" data-note-target="team">Team</button>',
            '  </div>',
            '  <pre class="th2-note-text" id="th2-note-text">' + escapeHtml(noteTeacher) + '</pre>',
            '  <button class="th2-btn-log" id="th2-copy-note" data-note-target="teacher" type="button">&#x2398; Copy to clipboard</button>',
            '</div>'
          ].join("\n");
        })(),

        /* Phase 11 — IM Cool-Down Score */
        '<div class="th2-drawer-section">',
        '  <h4 class="th2-drawer-section-head">IM Cool-Down Score</h4>',
        '  <p class="th2-drawer-note-sub">Log today\'s score (0\u20134) to get an instant grouping suggestion.</p>',
        '  <div class="th2-cooldown-row">',
        '    <label class="th2-cooldown-label" for="th2-cooldown-score">Score</label>',
        '    <input class="th2-cooldown-input" id="th2-cooldown-score" type="number" min="0" max="4" step="1" placeholder="\u2014">',
        '    <button class="th2-btn-log" id="th2-cooldown-save" type="button">Log &amp; Group</button>',
        '  </div>',
        '  <div id="th2-cooldown-group-hint" class="th2-cooldown-hint"></div>',
        '</div>',

        '<div class="th2-drawer-section">',
        '  <h4 class="th2-drawer-section-head">Export</h4>',
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
    /* needDomain drives curriculum-section fallback when the plan engine
       can't infer a module from sparse demo evidence. Values must match
       the keyword lists in matchCurriculumGoal (e.g. "Numeracy", "Phonics"). */
    var demos = [
      { id: "demo-ava",  name: "Ava M.",   gradeBand: "G3", grade: "G3", needDomain: "Reading" },
      { id: "demo-liam", name: "Liam T.",  gradeBand: "G2", grade: "G2", needDomain: "Phonics" },
      { id: "demo-maya", name: "Maya R.",  gradeBand: "G3", grade: "G3", needDomain: "Reading" },
      { id: "demo-noah", name: "Noah K.",  gradeBand: "G4", grade: "G4", needDomain: "Numeracy" },
      { id: "demo-zoe",  name: "Zoe W.",   gradeBand: "G1", grade: "G1", needDomain: "Phonics" }
    ];
    demos.forEach(function (s) {
      if (typeof Evidence.upsertStudent === "function") {
        safe(function () { Evidence.upsertStudent(s); });
      }
    });

    /* Seed realistic session data (runs once per demo session) */
    var SEED_KEY = "cs.hub.demo.sessions.v2";
    if (!localStorage.getItem(SEED_KEY) && Evidence && typeof Evidence.appendSession === "function") {
      var DAY = 86400000;
      var now  = Date.now();
      /* Ava M. — reading lab sessions, improving fluency */
      safe(function () {
        Evidence.appendSession("demo-ava", "reading_lab", { accuracy: 0.72, wpmProxy: 54, selfCorrects: 2 }, now - 12 * DAY);
        Evidence.appendSession("demo-ava", "reading_lab", { accuracy: 0.75, wpmProxy: 58, selfCorrects: 3 }, now - 8  * DAY);
        Evidence.appendSession("demo-ava", "reading_lab", { accuracy: 0.78, wpmProxy: 61, selfCorrects: 2 }, now - 4  * DAY);
        Evidence.appendSession("demo-ava", "reading_lab", { accuracy: 0.81, wpmProxy: 64, selfCorrects: 4 }, now - 1  * DAY);
      });
      /* Liam T. — word quest phonics, struggling */
      safe(function () {
        Evidence.appendSession("demo-liam", "wordquest", { misplaceRate: 0.38, absentRate: 0.12, vowelSwapCount: 4 }, now - 14 * DAY);
        Evidence.appendSession("demo-liam", "wordquest", { misplaceRate: 0.35, absentRate: 0.10, vowelSwapCount: 3 }, now - 9  * DAY);
        Evidence.appendSession("demo-liam", "wordquest", { misplaceRate: 0.40, absentRate: 0.14, vowelSwapCount: 5 }, now - 4  * DAY);
        Evidence.appendSession("demo-liam", "wordquest", { misplaceRate: 0.37, absentRate: 0.11, vowelSwapCount: 4 }, now - 2  * DAY);
      });
      /* Maya R. — reading lab, strong ORF */
      safe(function () {
        Evidence.appendSession("demo-maya", "reading_lab", { accuracy: 0.88, wpmProxy: 87, selfCorrects: 1 }, now - 10 * DAY);
        Evidence.appendSession("demo-maya", "reading_lab", { accuracy: 0.90, wpmProxy: 91, selfCorrects: 2 }, now - 6  * DAY);
        Evidence.appendSession("demo-maya", "reading_lab", { accuracy: 0.92, wpmProxy: 94, selfCorrects: 1 }, now - 3  * DAY);
        Evidence.appendSession("demo-maya", "reading_lab", { accuracy: 0.93, wpmProxy: 97, selfCorrects: 2 }, now - 1  * DAY);
      });
      /* Noah K. — numeracy, moderate */
      safe(function () {
        Evidence.appendSession("demo-noah", "numeracy", { accuracy: 0.68, speedProxy: 42, hints: 3 }, now - 11 * DAY);
        Evidence.appendSession("demo-noah", "numeracy", { accuracy: 0.71, speedProxy: 45, hints: 2 }, now - 7  * DAY);
        Evidence.appendSession("demo-noah", "numeracy", { accuracy: 0.69, speedProxy: 44, hints: 3 }, now - 3  * DAY);
        Evidence.appendSession("demo-noah", "numeracy", { accuracy: 0.73, speedProxy: 48, hints: 2 }, now - 1  * DAY);
      });
      /* Zoe W. — word quest phonics, early stage */
      safe(function () {
        Evidence.appendSession("demo-zoe", "wordquest", { misplaceRate: 0.28, absentRate: 0.08, vowelSwapCount: 2 }, now - 9  * DAY);
        Evidence.appendSession("demo-zoe", "wordquest", { misplaceRate: 0.25, absentRate: 0.07, vowelSwapCount: 1 }, now - 5  * DAY);
        Evidence.appendSession("demo-zoe", "wordquest", { misplaceRate: 0.22, absentRate: 0.06, vowelSwapCount: 1 }, now - 2  * DAY);
      });
      localStorage.setItem(SEED_KEY, "1");
    }
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

  /* ── Phase 9: Live signal helpers ───────────────────────── */

  /** Evidence chip row — accuracy, ORF, vowel confusion etc. */
  function buildEvidenceChips(summary) {
    var chips = Array.isArray(summary && summary.evidenceChips) ? summary.evidenceChips : [];
    if (!chips.length) return "";
    var inner = chips.slice(0, 5).map(function (c) {
      return (
        '<span class="th2-ev-chip">' +
        '<span class="th2-ev-chip-label">' + escapeHtml(String(c.label || "")) + '</span>' +
        '<span class="th2-ev-chip-val">'   + escapeHtml(String(c.value || "")) + '</span>' +
        '</span>'
      );
    }).join("");
    return '<div class="th2-ev-chips">' + inner + '</div>';
  }

  /** Live signal pills — MTSS decision + reason, last session, accuracy, ORF */
  function buildLiveSignalPills(studentId, summary, plan) {
    var pills = [];

    /* 1 — MTSS decision pill with inline reason */
    var trendDecision = "HOLD";
    var trendReason   = "";
    var EE = window.CSEvidenceEngine;
    if (EE && typeof EE.computeMtssTrendDecision === "function") {
      var mtss = safe(function () { return EE.computeMtssTrendDecision(studentId, null); });
      if (mtss && mtss.status && mtss.status !== "INSUFFICIENT") {
        trendDecision = String(mtss.status);
        trendReason   = String(mtss.reason || "");
      }
    }
    if (trendDecision === "HOLD" && plan) {
      trendDecision = String(
        (plan.tierSignal && plan.tierSignal.trendDecision) ||
        (plan.trendDecision) || "HOLD"
      );
    }
    var reasonShort = trendReason.length > 40 ? trendReason.slice(0, 38) + "\u2026" : trendReason;
    pills.push(
      '<span class="th2-signal" data-decision="' + escapeHtml(trendDecision) +
      '" title="' + escapeHtml(trendReason) + '">' +
      escapeHtml(trendDecision) +
      (reasonShort ? ' <span class="th2-signal-reason">\u2014 ' + escapeHtml(reasonShort) + '</span>' : '') +
      '</span>'
    );

    /* 2 — Last session timestamp */
    var lastStr = (summary && summary.lastSession && summary.lastSession.timestamp)
      ? relativeDate(summary.lastSession.timestamp)
      : "No session yet";
    pills.push('<span class="th2-signal th2-signal--meta">\u23F1 ' + escapeHtml(lastStr) + '</span>');

    /* 3 & 4 — Accuracy + ORF from evidence store */
    var evChips = Array.isArray(summary && summary.evidenceChips) ? summary.evidenceChips : [];
    var accChip = null, orfChip = null;
    evChips.forEach(function (c) {
      if (c.label === "Accuracy") accChip = c;
      if (c.label === "ORF")      orfChip = c;
    });
    if (accChip) {
      pills.push('<span class="th2-signal th2-signal--acc">\u2714 ' + escapeHtml(accChip.value) + '</span>');
    }
    if (orfChip) {
      pills.push('<span class="th2-signal th2-signal--orf">\u25B6 ' + escapeHtml(orfChip.value) + '</span>');
    }

    return pills.join("\n");
  }

  /** Progress note copy buttons — teacher / parent / team */
  function buildProgressNoteActions(plan) {
    if (!plan || !plan.progressNoteTemplate) return "";
    return [
      '<div class="th2-note-actions">',
      '  <span class="th2-note-actions-label">Copy note</span>',
      '  <button class="th2-note-btn" data-note-type="teacher" type="button">&#x1F4CB; Teacher</button>',
      '  <button class="th2-note-btn" data-note-type="family"  type="button">&#x2709; Parent</button>',
      '  <button class="th2-note-btn" data-note-type="team"    type="button">&#x1F91D; Team</button>',
      '</div>'
    ].join("\n");
  }

  /* ── Phase 10: Caseload health bar ─────────────────────── */

  function buildCaseloadHealthBar(ranked) {
    var high = 0, mod = 0, stable = 0;
    ranked.forEach(function (r) {
      if (r.tier >= 3 || r.daysSince >= 7)      high++;
      else if (r.tier === 2 || r.daysSince >= 4) mod++;
      else                                        stable++;
    });
    var total = ranked.length;
    if (!total) return "";
    var hp = Math.round(high / total * 100);
    var mp = Math.round(mod  / total * 100);
    var sp = 100 - hp - mp;
    return [
      '<div class="th2-health-wrap">',
      '  <div class="th2-health-bar" title="Caseload health distribution">',
      (hp      ? '<div class="th2-health-seg th2-health-seg--high"   style="width:' + hp + '%"></div>' : ''),
      (mp      ? '<div class="th2-health-seg th2-health-seg--mod"    style="width:' + mp + '%"></div>' : ''),
      (sp > 0  ? '<div class="th2-health-seg th2-health-seg--stable" style="width:' + sp + '%"></div>' : ''),
      '  </div>',
      '  <div class="th2-health-legend">',
      (high   ? '<span class="th2-health-dot th2-health-dot--high">'   + high   + ' high risk</span>'  : ''),
      (mod    ? '<span class="th2-health-dot th2-health-dot--mod">'    + mod    + ' developing</span>' : ''),
      (stable ? '<span class="th2-health-dot th2-health-dot--stable">' + stable + ' stable</span>'     : ''),
      '  </div>',
      '</div>'
    ].join("\n");
  }

  /* ── Phase 12: Onboarding (first-use, empty caseload) ───── */

  function renderOnboarding() {
    if (!el.emptyState) return;
    el.emptyState.innerHTML = [
      '<div class="th2-onboarding">',
      '  <div class="th2-onboarding-icon">&#x1F4DA;</div>',
      '  <h2 class="th2-onboarding-title">Welcome to Cornerstone MTSS</h2>',
      '  <p class="th2-onboarding-sub">Your intelligence-powered command hub for reading &amp; math intervention.</p>',
      '  <ol class="th2-onboarding-steps">',
      '    <li class="th2-onboarding-step">',
      '      <span class="th2-step-num">1</span>',
      '      <div><strong>Add students</strong><p>Click <em>+ Add Student</em> to build your caseload.</p></div>',
      '    </li>',
      '    <li class="th2-onboarding-step">',
      '      <span class="th2-step-num">2</span>',
      '      <div><strong>Log sessions</strong><p>After each session, log results to unlock live intelligence.</p></div>',
      '    </li>',
      '    <li class="th2-onboarding-step">',
      '      <span class="th2-step-num">3</span>',
      '      <div><strong>Get recommendations</strong><p>Cornerstone surfaces MTSS decisions, goals &amp; next steps automatically.</p></div>',
      '    </li>',
      '  </ol>',
      '  <button class="th2-btn th2-btn-primary th2-onboarding-cta" id="th2-onboarding-add" type="button">+ Add your first student</button>',
      '</div>'
    ].join("\n");
    var addBtn = el.emptyState.querySelector("#th2-onboarding-add");
    if (addBtn) addBtn.addEventListener("click", openAddDrawer);
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
      renderFpBadge(studentId),
      renderToolBadges(studentId),
      '      </div>',
      (nameMeta ? '      <span class="th2-focus-name-meta">' + nameMeta + '</span>' : ''),
      renderUdlStrip(studentId),
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
      buildEvidenceChips(summary),
      '</div>',

      /* Curriculum alignment — mapped from recommendation.
         Fall back to MODULE_HINT_BY_STUDENT when the plan engine hasn't
         produced a specific launch.module (common in demo / sparse data). */
      renderCurriculumSection(
        recTitle,
        (launch && launch.module ? String(launch.module) : "") || String(MODULE_HINT_BY_STUDENT[studentId] || ""),
        student.gradeBand || student.grade || ""
      ),

      /* Signal pills — live data from evidence + plan engines */
      '<div class="th2-signals">',
      buildLiveSignalPills(studentId, summary, plan),
      '</div>',

      /* Actions */
      '<div class="th2-actions">',
      '  <a class="th2-btn th2-btn-primary" href="' + escapeHtml(activityHref) + '">Start Recommended Session</a>',
      '  <button class="th2-btn th2-btn-quiet" id="th2-view-details">View Details</button>',
      '</div>',
      buildProgressNoteActions(plan),

      /* Support panel — auto-surfaces below actions */
      renderSupportPanel(studentId)
    ].join("\n");

    /* Wire lesson navigator prev/next buttons */
    bindLessonNavEvents(el.focusCard);

    showFocusCard();
  }

  /* ── Hero card for morning brief ─────────────────────── */
  function buildHeroCard(r) {
    if (!r) return "";
    var lastStr  = r.daysSince === 0 ? "Today" : r.daysSince < 999 ? r.daysSince + "d ago" : "Never";
    var gradeStr = escapeHtml(r.student.grade || r.student.gradeBand || "");
    var tierMod  = "th2-hero-card--t" + r.tier;
    var showPriority = r.tier >= 2 || r.daysSince >= 5;
    return [
      '<button class="th2-hero-card ' + tierMod + '" data-id="' + escapeHtml(r.student.id) + '" data-tier="' + r.tier + '" type="button">',
      '  <div class="th2-hero-card-top">',
      '    ' + buildAvatar(r.student.name, r.student.id, false),
      '    <div class="th2-hero-card-identity">',
      '      <span class="th2-hero-card-name">' + escapeHtml(r.student.name) + '</span>',
      '      <div class="th2-hero-card-meta">',
      '        <span class="th2-tier-chip" data-tier="' + r.tier + '">T' + r.tier + '</span>',
      (gradeStr ? '        <span class="th2-hero-card-grade">' + gradeStr + '</span>' : ''),
      '        <span class="th2-hero-card-last">&middot; ' + escapeHtml(lastStr) + '</span>',
      '      </div>',
      '    </div>',
      (showPriority ? '    <span class="th2-hero-priority-badge">Priority</span>' : ''),
      '  </div>',
      (r.recTitle
        ? '<div class="th2-hero-card-rec"><span class="th2-hero-rec-label">Recommended next</span><span class="th2-hero-rec-title">' + escapeHtml(r.recTitle) + '</span></div>'
        : ''),
      '</button>'
    ].join("\n");
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

    /* Hero = most urgent; rest become compact cards */
    var heroHtml = buildHeroCard(ranked[0]);
    var cardsHtml = ranked.slice(1, 5).map(function (r) {
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
      '<div class="th2-morning th2-morning--entered">',
      '  <p class="th2-morning-greeting">' + greetingWord() + '</p>',
      '  <p class="th2-morning-date">' + todayDateStr() + '</p>',
      '  <p class="th2-morning-sub">' + escapeHtml(subText) + '</p>',
      buildCaseloadHealthBar(ranked),
      heroHtml,
      (cardsHtml ? '<div class="th2-brief-list">' + cardsHtml + '</div>' : ''),
      '</div>'
    ].join("\n");

    el.emptyState.querySelectorAll(".th2-hero-card,.th2-brief-card").forEach(function (btn) {
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
    var mode = hubState.get().context.mode;
    if (mode === "class") { renderClassSnapshot(); return; }
    if (!caseload.length) { renderOnboarding(); return; }
    renderMorningBrief();
  }

  function showFocusCard() {
    if (el.emptyState) { el.emptyState.classList.add("hidden"); el.emptyState.setAttribute("aria-hidden", "true"); }
    if (el.focusCard)  { el.focusCard.classList.remove("hidden"); el.focusCard.removeAttribute("aria-hidden"); }
  }

  /* ── Today's Classes snapshot ─────────────────────────── */
  function buildSnapshotCard(student) {
    var summary  = safe(function () { return Evidence.getStudentSummary(student.id); });
    var tier     = quickTier(summary);
    var gradeStr = escapeHtml(student.grade || student.gradeBand || "");
    return [
      '<button class="th2-snapshot-card" data-id="' + escapeHtml(student.id) + '" data-tier="' + tier + '" type="button">',
      '  ' + buildAvatar(student.name, student.id, true),
      '  <div class="th2-snapshot-card-body">',
      '    <span class="th2-snapshot-card-name">' + escapeHtml(student.name) + '</span>',
      '    <span class="th2-snapshot-card-meta">' + (gradeStr ? 'Gr ' + gradeStr + ' &middot; ' : '') + '<span class="th2-tier-chip" data-tier="' + tier + '">T' + tier + '</span></span>',
      '  </div>',
      '</button>'
    ].join("\n");
  }

  function renderClassSnapshot() {
    if (!el.emptyState) return;
    var byTier = { "3": [], "2": [], "1": [] };
    caseload.forEach(function (s) {
      var summary = safe(function () { return Evidence.getStudentSummary(s.id); });
      var tier    = quickTier(summary);
      var key     = String(tier);
      if (!byTier[key]) byTier[key] = [];
      byTier[key].push(s);
    });
    var groups = [];
    [3, 2, 1].forEach(function (t) {
      var arr = byTier[String(t)] || [];
      if (!arr.length) return;
      groups.push(
        '<div class="th2-snapshot-group">' +
        '<p class="th2-snapshot-group-label">Tier ' + t +
          ' <span style="opacity:0.65;font-weight:400;">(' + arr.length + ')</span></p>' +
        '<div class="th2-snapshot-grid">' + arr.map(buildSnapshotCard).join("") + '</div>' +
        '</div>'
      );
    });
    if (!groups.length) {
      el.emptyState.innerHTML =
        '<div class="th2-today-panel">' +
        '<p class="th2-today-title">Today\'s Classes</p>' +
        '<p class="th2-today-sub">No students in caseload.</p>' +
        '</div>';
      return;
    }
    el.emptyState.innerHTML =
      '<div class="th2-today-panel">' +
      '<p class="th2-today-title">Today\'s Classes</p>' +
      groups.join("") + '</div>';
    el.emptyState.querySelectorAll(".th2-snapshot-card").forEach(function (btn) {
      btn.addEventListener("click", function () {
        var sid = btn.getAttribute("data-id") || "";
        if (!sid) return;
        el.modeTabs.forEach(function (t) {
          var active = t.getAttribute("data-mode") === "caseload";
          t.classList.toggle("is-active", active);
          t.setAttribute("aria-selected", active ? "true" : "false");
        });
        hubState.set({ context: { mode: "caseload" } });
        selectStudent(sid);
      });
    });
  }

  function showTodaysClasses() {
    if (el.emptyState) { el.emptyState.classList.remove("hidden"); el.emptyState.removeAttribute("aria-hidden"); }
    if (el.focusCard)  { el.focusCard.classList.add("hidden"); el.focusCard.setAttribute("aria-hidden", "true"); }
    renderClassSnapshot();
  }

  /* ── HubState subscription → render ────────────────────── */

  hubState.subscribe(function (state) {
    var mode = state.context.mode || "caseload";
    if (mode === "class") { showTodaysClasses(); return; }
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

  /* ── Add Student drawer ──────────────────────────────── */
  function openAddDrawer() {
    var addDrawer = document.getElementById("th2-add-drawer");
    if (!addDrawer) return;
    renderAddStudentForm();
    addDrawer.classList.add("is-open");
    addDrawer.removeAttribute("aria-hidden");
    var overlay = document.getElementById("th2-overlay");
    if (overlay) { overlay.classList.remove("hidden"); overlay.removeAttribute("aria-hidden"); }
  }

  function closeAddDrawer() {
    var addDrawer = document.getElementById("th2-add-drawer");
    if (!addDrawer) return;
    addDrawer.classList.remove("is-open");
    addDrawer.setAttribute("aria-hidden", "true");
    if (!hubState.get().ui.drawerOpen) {
      var overlay = document.getElementById("th2-overlay");
      if (overlay) { overlay.classList.add("hidden"); overlay.setAttribute("aria-hidden", "true"); }
    }
  }

  function renderAddStudentForm() {
    var body = document.getElementById("th2-add-body");
    if (!body) return;
    var grades   = ["K","1","2","3","4","5"];
    var domains  = ["Phonics","Phonemic Awareness","Fluency","Comprehension","Numeracy","Vocabulary"];
    var fpLetters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");
    body.innerHTML = [
      '<form id="th2-add-form" class="th2-add-form" autocomplete="off">',
      '  <label class="th2-add-field">',
      '    <span class="th2-add-label">Student name</span>',
      '    <input id="th2-add-name" class="th2-add-input" type="text" placeholder="First Last" required maxlength="60">',
      '  </label>',
      '  <div class="th2-add-field">',
      '    <p class="th2-add-label">Grade</p>',
      '    <div class="th2-add-chip-row" id="th2-add-grade-chips">',
      grades.map(function (g) {
        return '      <button type="button" class="th2-add-chip" data-grade="' + g + '">' + g + '</button>';
      }).join("\n"),
      '    </div>',
      '  </div>',
      '  <div class="th2-add-field">',
      '    <p class="th2-add-label">Focus domain <span class="th2-add-label-opt">(optional)</span></p>',
      '    <div class="th2-add-chip-row" id="th2-add-domain-chips">',
      domains.map(function (d) {
        return '      <button type="button" class="th2-add-chip" data-domain="' + escapeHtml(d) + '">' + escapeHtml(d) + '</button>';
      }).join("\n"),
      '    </div>',
      '  </div>',
      '  <div class="th2-add-field">',
      '    <p class="th2-add-label">F&amp;P level <span class="th2-add-label-opt">(optional)</span></p>',
      '    <div class="th2-add-fp-grid">',
      fpLetters.map(function (l) {
        return '      <button type="button" class="th2-add-fp-btn" data-fp="' + l + '">' + l + '</button>';
      }).join("\n"),
      '    </div>',
      '  </div>',
      '  <div class="th2-add-actions">',
      '    <button type="submit" class="th2-btn th2-btn-primary">Add Student</button>',
      '    <button type="button" id="th2-add-cancel" class="th2-btn th2-btn-quiet">Cancel</button>',
      '  </div>',
      '</form>'
    ].join("\n");

    var selectedGrade   = "";
    var selectedDomains = [];
    var selectedFp      = "";

    body.querySelectorAll("[data-grade]").forEach(function (btn) {
      btn.addEventListener("click", function () {
        body.querySelectorAll("[data-grade]").forEach(function (b) { b.classList.remove("is-selected"); });
        if (selectedGrade === btn.getAttribute("data-grade")) {
          selectedGrade = "";
        } else {
          selectedGrade = btn.getAttribute("data-grade");
          btn.classList.add("is-selected");
        }
      });
    });

    body.querySelectorAll("[data-domain]").forEach(function (btn) {
      btn.addEventListener("click", function () {
        var d   = btn.getAttribute("data-domain");
        var idx = selectedDomains.indexOf(d);
        if (idx === -1) { selectedDomains.push(d); btn.classList.add("is-selected"); }
        else            { selectedDomains.splice(idx, 1); btn.classList.remove("is-selected"); }
      });
    });

    body.querySelectorAll(".th2-add-fp-btn").forEach(function (btn) {
      btn.addEventListener("click", function () {
        body.querySelectorAll(".th2-add-fp-btn").forEach(function (b) { b.classList.remove("is-selected"); });
        if (selectedFp === btn.getAttribute("data-fp")) {
          selectedFp = "";
        } else {
          selectedFp = btn.getAttribute("data-fp");
          btn.classList.add("is-selected");
        }
      });
    });

    var cancelBtn = document.getElementById("th2-add-cancel");
    if (cancelBtn) cancelBtn.addEventListener("click", closeAddDrawer);

    var form = document.getElementById("th2-add-form");
    if (form) {
      form.addEventListener("submit", function (e) {
        e.preventDefault();
        submitAddStudent(selectedGrade, selectedDomains, selectedFp);
      });
    }
  }

  function submitAddStudent(grade, domains, fpLevel) {
    var nameEl = document.getElementById("th2-add-name");
    var name   = nameEl ? nameEl.value.trim() : "";
    if (!name) { showToast("Please enter a student name.", "warn"); return; }
    var id = "s_" + Date.now();
    safe(function () {
      Evidence.upsertStudent({ id: id, name: name, gradeBand: grade || "", tags: [] });
      if (domains && domains.length && window.CSSupportStore) {
        window.CSSupportStore.setNeeds(id, domains);
      }
      if (fpLevel) setFpLevel(id, fpLevel);
    });
    caseload.push({ id: id, name: name, grade: grade || "", gradeBand: grade || "", tags: [] });
    renderCaseload(caseload);
    closeAddDrawer();
    showToast(name + " added to caseload.", "success");
    selectStudent(id);
  }

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
      var mode = tab.getAttribute("data-mode") || "caseload";
      hubState.set({ context: { mode: mode, studentId: "" } });
      if (mode === "class") { showTodaysClasses(); }
      else { showEmptyState(); }
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
    showToast("Session logged.", "success");
    var status = document.getElementById("th2-log-status");
    if (status) status.textContent = relativeDate(Date.now());
  });

  // F&P badge — click to update reading level inline
  document.addEventListener("click", function (e) {
    var badge = e.target.closest && e.target.closest(".th2-fp-badge");
    if (!badge) return;
    var sid = badge.getAttribute("data-fp-student") || "";
    if (!sid) return;
    var current = getFpLevel(sid) || "";
    var raw = window.prompt("Enter F&P reading level (A–Z) for this student:", current);
    if (raw === null) return;                        // cancelled
    var level = String(raw).trim().toUpperCase().slice(0, 1);
    if (level && !FP_VALID.test(level)) {
      window.alert("Please enter a single letter A–Z.");
      return;
    }
    setFpLevel(sid, level);
    // Re-render badge in place
    badge.textContent = level ? "F&P " + level : "";
    if (!level) badge.style.display = "none";
    showToast(level ? "F&P updated to " + level + "." : "F&P level cleared.", "info");
  });

  // Tool badge — click to update (individual badge)
  document.addEventListener("click", function (e) {
    var badge = e.target.closest && e.target.closest("[data-tool-badge]");
    if (!badge) return;
    var tool = badge.getAttribute("data-tool-badge");
    var sid  = badge.getAttribute("data-tool-student") || "";
    if (!sid || !tool) return;
    var current = getToolBadge(sid, tool) || "";
    var promptText = tool === "wtw"
      ? "Words Their Way stage (E / LNA / WWP / SA / DR) — leave blank to clear:"
      : tool === "rn" ? "Read Naturally WPM (e.g. 67) — leave blank to clear:"
      : "Lexia level (e.g. 12) — leave blank to clear:";
    var raw = window.prompt(promptText, current);
    if (raw === null) return;
    var val = String(raw).trim();
    if (tool === "wtw" && val) {
      val = val.toUpperCase();
      if (WTW_STAGES.indexOf(val) === -1) {
        window.alert("WtW stage must be one of: E, LNA, WWP, SA, DR");
        return;
      }
    }
    setToolBadge(sid, tool, val);
    var newLabel = tool === "wtw"   ? (val ? "WtW "   + val        : "")
                 : tool === "rn"    ? (val ? "RN "    + val + " wpm": "")
                 :                    (val ? "Lexia "  + val        : "");
    if (newLabel) { badge.textContent = newLabel; }
    else          { badge.remove(); }
    showToast(val ? "Tool level saved." : "Tool level cleared.", val ? "success" : "info");
  });

  // Tool add button — prompt for all three levels sequentially
  document.addEventListener("click", function (e) {
    var btn = e.target.closest && e.target.closest("[data-tool-add-student]");
    if (!btn) return;
    var sid = btn.getAttribute("data-tool-add-student") || "";
    if (!sid) return;
    var wtw   = window.prompt("Words Their Way stage (E / LNA / WWP / SA / DR) — blank to skip:", getToolBadge(sid, "wtw") || "");
    if (wtw === null) return;
    var rn    = window.prompt("Read Naturally WPM — blank to skip:", getToolBadge(sid, "rn") || "");
    if (rn === null) return;
    var lexia = window.prompt("Lexia level — blank to skip:", getToolBadge(sid, "lexia") || "");
    if (lexia === null) return;
    var wtwVal = String(wtw).trim().toUpperCase();
    if (wtwVal && WTW_STAGES.indexOf(wtwVal) === -1) {
      window.alert("WtW stage must be one of: E, LNA, WWP, SA, DR");
      return;
    }
    setToolBadge(sid, "wtw",   wtwVal);
    setToolBadge(sid, "rn",    String(rn).trim());
    setToolBadge(sid, "lexia", String(lexia).trim());
    // Re-render focus card to show updated badges
    var state = hubState.get();
    if (state.context.studentId === sid && state.intelligence && state.intelligence.plan) {
      renderFocusCard(state);
    }
    showToast("Tool levels saved.", "success");
  });

  // UDL toggle — open/close the chip picker
  document.addEventListener("click", function (e) {
    var btn = e.target.closest && e.target.closest("[data-udl-toggle]");
    if (!btn) return;
    var sid   = btn.getAttribute("data-udl-toggle") || "";
    var strip = btn.closest(".th2-udl-strip");
    if (!sid || !strip) return;
    var existing = strip.querySelector(".th2-udl-picker");
    if (existing) { existing.remove(); return; }
    var active  = getUdlActive(sid);
    var picker  = document.createElement("div");
    picker.className = "th2-udl-picker";
    UDL_CHIPS.forEach(function (c) {
      var chip = document.createElement("button");
      chip.type = "button";
      chip.className = "th2-udl-chip" + (active.indexOf(c.id) !== -1 ? " is-active" : "");
      chip.textContent = c.label;
      chip.addEventListener("click", function (ev) {
        ev.stopPropagation();
        var idx = active.indexOf(c.id);
        if (idx === -1) { active.push(c.id);      chip.classList.add("is-active"); }
        else            { active.splice(idx, 1);   chip.classList.remove("is-active"); }
        setUdlActive(sid, active);
        // Sync the visible active chips above the toggle
        strip.querySelectorAll(".th2-udl-chip[data-udl-id]").forEach(function (el) { el.remove(); });
        UDL_CHIPS.forEach(function (x) {
          if (active.indexOf(x.id) === -1) return;
          var ac = document.createElement("button");
          ac.type = "button";
          ac.className = "th2-udl-chip is-active";
          ac.setAttribute("data-udl-id", x.id);
          ac.textContent = x.label;
          strip.insertBefore(ac, btn);
        });
        btn.textContent = active.length ? "✎ Accommodations" : "+ Accommodations";
      });
      picker.appendChild(chip);
    });
    strip.appendChild(picker);
  });

  // UDL active chip — click active chip to remove it quickly
  document.addEventListener("click", function (e) {
    var chip = e.target.closest && e.target.closest(".th2-udl-chip[data-udl-id]");
    if (!chip) return;
    var strip = chip.closest(".th2-udl-strip");
    if (!strip) return;
    var sid = strip.getAttribute("data-udl-student") || "";
    var id  = chip.getAttribute("data-udl-id") || "";
    if (!sid || !id) return;
    var active = getUdlActive(sid);
    var idx = active.indexOf(id);
    if (idx !== -1) {
      active.splice(idx, 1);
      setUdlActive(sid, active);
      chip.remove();
      var tgl = strip.querySelector("[data-udl-toggle]");
      if (tgl) tgl.textContent = active.length ? "✎ Accommodations" : "+ Accommodations";
      showToast("Accommodation removed.", "info");
    }
  });

  // Drawer close button
  document.addEventListener("click", function (e) {
    if (e.target && e.target.id === "th2-drawer-close") closeDrawer();
  });

  // Overlay click closes drawer
  document.addEventListener("click", function (e) {
    if (e.target && e.target.id === "th2-overlay") {
      closeDrawer();
      closeAddDrawer();
    }
  });

  // Escape key closes drawer
  document.addEventListener("keydown", function (e) {
    if (e.key !== "Escape" && e.key !== "Esc") return;
    var addDrawer = document.getElementById("th2-add-drawer");
    if (addDrawer && addDrawer.classList.contains("is-open")) { closeAddDrawer(); return; }
    if (hubState.get().ui.drawerOpen) closeDrawer();
  });

  // Add Student button
  document.addEventListener("click", function (e) {
    if (e.target && e.target.id === "th2-add-student-btn") openAddDrawer();
  });

  // Phase 9: Progress note copy buttons (focus card)
  document.addEventListener("click", function (e) {
    var btn = e.target.closest && e.target.closest("[data-note-type]");
    if (!btn || !btn.classList.contains("th2-note-btn")) return;
    var noteType = btn.getAttribute("data-note-type") || "teacher";
    var state = hubState.get();
    var plan  = state.intelligence && state.intelligence.plan;
    var tmpl  = plan && plan.progressNoteTemplate;
    if (!tmpl) { showToast("No note available yet.", "info"); return; }
    var text = String(tmpl[noteType] || tmpl.teacher || "");
    if (!text) { showToast("No note for that type.", "info"); return; }
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(function () {
        showToast("Note copied to clipboard \u2713", "success");
        btn.textContent = "\u2714 Copied!";
        setTimeout(function () {
          var label = noteType === "teacher" ? "&#x1F4CB; Teacher"
                    : noteType === "family"  ? "&#x2709; Parent"
                    : "&#x1F91D; Team";
          btn.innerHTML = label;
        }, 1800);
      }).catch(function () {
        window.prompt("Copy this note:", text);
      });
    } else {
      window.prompt("Copy this note:", text);
    }
  });

  // Phase 11: Drawer progress note tabs + copy
  document.addEventListener("click", function (e) {
    var tab = e.target.closest && e.target.closest(".th2-note-tab");
    if (!tab) return;
    var drawerBody = document.getElementById("th2-drawer-body");
    if (!drawerBody) return;
    var target = tab.getAttribute("data-note-target") || "teacher";
    drawerBody.querySelectorAll(".th2-note-tab").forEach(function (t) {
      t.classList.toggle("is-active", t.getAttribute("data-note-target") === target);
    });
    var noteText = drawerBody.querySelector("#th2-note-text");
    if (noteText) {
      var state = hubState.get();
      var plan  = state.intelligence && state.intelligence.plan;
      var tmpl  = plan && plan.progressNoteTemplate;
      noteText.textContent = (tmpl && tmpl[target]) ? String(tmpl[target]) : "No note available.";
      var copyBtn = drawerBody.querySelector("#th2-copy-note");
      if (copyBtn) copyBtn.setAttribute("data-note-target", target);
    }
  });

  document.addEventListener("click", function (e) {
    var btn = e.target.closest && e.target.closest("#th2-copy-note");
    if (!btn) return;
    var noteText = document.querySelector("#th2-note-text");
    var text = noteText ? noteText.textContent : "";
    if (!text) { showToast("No note to copy.", "info"); return; }
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(function () {
        showToast("Note copied to clipboard \u2713", "success");
        btn.textContent = "\u2714 Copied!";
        setTimeout(function () { btn.textContent = "\u2398 Copy to clipboard"; }, 1800);
      }).catch(function () { window.prompt("Copy:", text); });
    } else {
      window.prompt("Copy:", text);
    }
  });

  // Phase 11: IM Cool-Down save
  document.addEventListener("click", function (e) {
    var btn = e.target.closest && e.target.closest("#th2-cooldown-save");
    if (!btn) return;
    var input = document.getElementById("th2-cooldown-score");
    if (!input) return;
    var val = parseInt(input.value, 10);
    if (isNaN(val) || val < 0 || val > 4) {
      showToast("Enter a score 0\u20134.", "info");
      return;
    }
    var studentId = hubState.get().context.studentId || "";
    if (studentId) {
      safe(function () {
        Evidence.appendSession(studentId, "im_cooldown", {
          source: "hub-v2-cooldown",
          timestamp: Date.now(),
          signals: { cooldownScore: val }
        });
      });
    }
    var hint = document.getElementById("th2-cooldown-group-hint");
    if (hint) {
      var group = val <= 1 ? "Small-group pull-out (intensive)"
                : val === 2 ? "Partner/guided group"
                : val === 3 ? "Independent + extension"
                : "Extension challenge";
      hint.innerHTML = '<span class="th2-cooldown-group">' + escapeHtml(group) + '</span>';
    }
    btn.textContent = "Saved \u2713";
    btn.disabled = true;
    showToast("Cool-down score logged.", "success");
  });

  // Add Student drawer close button
  document.addEventListener("click", function (e) {
    if (e.target && e.target.id === "th2-add-drawer-close") closeAddDrawer();
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

    // If a student was passed via URL, select them; otherwise morning brief or onboarding
    if (initialStudentId && caseload.some(function (s) { return s.id === initialStudentId; })) {
      selectStudent(initialStudentId);
    } else if (caseload.length) {
      renderMorningBrief();
    } else {
      renderOnboarding();
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }

})();
