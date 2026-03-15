(function studentProfilePage() {
  "use strict";

  var CaseloadStore = window.CSCaseloadStore || null;
  var SupportStore = window.CSSupportStore || null;
  var StudentProfileStore = window.CSStudentProfileStore || null;

  var state = {
    studentId: "",
    caseload: []
  };

  var el = {
    empty: document.getElementById("sp-empty-state"),
    content: document.getElementById("sp-content"),
    hero: document.getElementById("sp-hero"),
    programs: document.getElementById("sp-programs-panel"),
    assessments: document.getElementById("sp-assessment-panel"),
    plans: document.getElementById("sp-plans-panel"),
    team: document.getElementById("sp-team-panel")
  };

  var DEMO_STUDENTS = {
    "demo-ava": {
      identity: {
        display: "Ava M.",
        grade: "Grade 3",
        support: "Reading support",
        service: "Push-in literacy and small-group decoding",
        tags: ["IESP", "IAP", "DIBELS mCLASS", "Science of Reading"]
      },
      summary: "Current class work stays aligned to Grade 3 literacy and math while intervention targets phoneme-grapheme mapping, short-vowel accuracy, and written response stamina.",
      team: ["Specialist", "Classroom teacher", "School psychologist", "Case manager"],
      core: [
        {
          label: "ELA Core",
          title: "Fishtank ELA Grade 3",
          detail: "Unit text work and writing response in class. Support focuses on access to the same text and writing task with reduced decoding burden."
        },
        {
          label: "Math Core",
          title: "Illustrative Math Grade 3 Unit 6 Lesson 12",
          detail: "Upcoming end-of-unit assessment. Daily collection point is the lesson cool-down. Planning lens: conceptual math, strategy comparison, and student explanation."
        }
      ],
      intervention: [
        {
          label: "Reading Intervention",
          title: "Fundations Level 2 Unit 8",
          detail: "Lesson focus: glued sounds, closed syllables, dictated sentence accuracy."
        },
        {
          label: "Math Intervention",
          title: "Bridges Intervention T3 Module 2 Unit 1 Session 4",
          detail: "Goal: use place-value reasoning to solve two-step addition and subtraction within 1,000."
        }
      ],
      assessments: [
        {
          label: "DIBELS mCLASS",
          title: "MOY",
          detail: "ORF 68 wcpm, accuracy 93%, composite: strategic support. Progress monitoring every 2 weeks."
        },
        {
          label: "Illustrative Math",
          title: "Lesson cool-down",
          detail: "3/5. Missed comparison language on the final two items."
        },
        {
          label: "Fundations",
          title: "Weekly check",
          detail: "Encoding: 8/10. Unit test planned after Lesson 5."
        }
      ],
      goals: {
        quarter: [
          "Read closed-syllable and glued-sound words with 95% accuracy in connected text.",
          "Complete Grade 3 lesson cool-downs with one teacher prompt or less.",
          "Write a three-sentence response using a provided organizer."
        ],
        annual: [
          "IESP: improve decoding accuracy and oral reading fluency across grade-level text with explicit phonics support.",
          "IAP: sustain access to classroom assessment with read-aloud directions, repeated directions, and extended processing time."
        ],
        accommodations: [
          "Directions chunked and repeated before independent work",
          "Small-group testing when available",
          "Teacher check-in before written response block"
        ]
      },
      executiveFunction: [
        "Preview the independent task before transition to table work.",
        "Check materials and first-step completion before teacher leaves the group.",
        "Use a one-line visual checklist during cool-down and writing response."
      ],
      behavior: [],
      files: [
        { label: "IESP details", href: "./case-management.html#iesp" },
        { label: "IAP details", href: "./case-management.html#iap" },
        { label: "IP details", href: "./case-management.html#ip" }
      ],
      notes: [
        "Latest classroom evidence: cool-down and dictated sentence collected this week.",
        "Psychologist and case manager are looped into accommodation review this quarter."
      ]
    },
    "demo-liam": {
      identity: {
        display: "Liam T.",
        grade: "Grade 2",
        support: "Tier 3 reading intervention",
        service: "Daily pull-out phonics block",
        tags: ["IP", "Fundations", "DIBELS mCLASS"]
      },
      summary: "Intervention is tighter than core right now. The main record needs to show daily phonics instruction, benchmark status, and the current instructional entry point.",
      team: ["Specialist", "Classroom teacher", "Case manager"],
      core: [
        { label: "ELA Core", title: "EL Education Grade 2", detail: "Core literacy stays grade-aligned with reduced text load and direct vocabulary pre-teach." },
        { label: "Math Core", title: "Bridges Grade 2 Unit 5", detail: "Classroom math remains on-grade-level with concrete models and visual supports." }
      ],
      intervention: [
        { label: "Reading Intervention", title: "UFLI Foundations Lesson 52", detail: "Focus: digraph review, blending practice, encoding with immediate corrective feedback." }
      ],
      assessments: [
        { label: "DIBELS mCLASS", title: "Progress monitoring", detail: "NWF CLS 41. Weekly monitoring in place." },
        { label: "UFLI", title: "Weekly encoding", detail: "7/10 on dictated words; short vowels remain inconsistent." }
      ],
      goals: {
        quarter: ["Blend and read CVCC and CCVC words with automaticity.", "Write dictated short-vowel words with no more than one error in a set of 10."],
        annual: ["IP: strengthen foundational decoding and encoding for grade-level classroom access."],
        accommodations: ["Preview independent reading directions", "Visual articulation cueing during dictation"]
      },
      executiveFunction: [
        "Use a first-then strip for intervention entry.",
        "Keep only the active sound cards visible during decoding work."
      ],
      behavior: [],
      files: [{ label: "IP details", href: "./case-management.html#ip" }],
      notes: ["This student is the clearest K-2 science of reading example in the demo set."]
    },
    "demo-maya": {
      identity: {
        display: "Maya R.",
        grade: "Grade 3",
        support: "Writing support",
        service: "Push-in writing and organization support",
        tags: ["IAP", "Step Up to Writing"]
      },
      summary: "The main need is written output and organization, not decoding. Demo data should show writing structure and accommodation planning rather than reading-intervention language.",
      team: ["Specialist", "Classroom teacher", "School psychologist"],
      core: [
        { label: "ELA Core", title: "Fishtank ELA Grade 3", detail: "Writing task is grounded in text evidence and structured response." },
        { label: "Math Core", title: "Illustrative Math Grade 3 Unit 5", detail: "Math reasoning response needs sentence frame support." }
      ],
      intervention: [
        { label: "Writing Intervention", title: "Step Up to Writing", detail: "Focus: paragraph frame, color-coded organization, sentence expansion." }
      ],
      assessments: [
        { label: "Writing", title: "On-demand baseline", detail: "Topic sentence present; supporting details inconsistent." },
        { label: "Classroom writing", title: "Progress-monitoring note", detail: "Organizer used independently in 2 of 3 writing blocks." }
      ],
      goals: {
        quarter: ["Use a clear topic sentence and two supporting details in paragraph writing.", "Use the organizer before beginning a written response."],
        annual: ["IAP: produce classroom writing with reduced initiation barriers and structured organizer access."],
        accommodations: ["Color-coded organizer", "Sentence starter bank", "Teacher check before draft submission"]
      },
      executiveFunction: [
        "Start from a visible writing frame rather than a blank page.",
        "Mark off completion of topic sentence, detail 1, detail 2, and closing."
      ],
      behavior: [],
      files: [{ label: "IAP details", href: "./case-management.html#iap" }],
      notes: ["Writing data should stay concrete: rubric notes, organizer use, and classroom samples."]
    },
    "demo-noah": {
      identity: {
        display: "Noah K.",
        grade: "Grade 4",
        support: "Math intervention",
        service: "Push-in math support and supplemental small group",
        tags: ["IESP", "Illustrative Math", "Bridges Intervention"]
      },
      summary: "This profile demonstrates conceptual math support without turning philosophy into marketing language.",
      team: ["Specialist", "Classroom teacher", "Case manager"],
      core: [
        { label: "Math Core", title: "Illustrative Math Grade 4 Unit 4 Lesson 9", detail: "Current collection points: daily cool-down and end-of-unit assessment." },
        { label: "Planning Lens", title: "Pam Harris and Jo Boaler", detail: "Used here as planning lenses: relational thinking, multiple strategies, low-floor access, and mathematical discussion." }
      ],
      intervention: [
        { label: "Math Intervention", title: "Bridges Intervention T3 Module 3 Unit 2 Session 3", detail: "Goal: represent multi-step problems with equations and clear operation choice." }
      ],
      assessments: [
        { label: "Illustrative Math", title: "Cool-down", detail: "Solved 4/5 with equation written after prompting." },
        { label: "Bridges Intervention", title: "Progress monitoring", detail: "Correctly represented 3 of 4 problems with bar model support." }
      ],
      goals: {
        quarter: ["Explain operation choice using words, numbers, or a model.", "Complete end-of-lesson cool-downs independently with one self-check."],
        annual: ["IESP: improve access to grade-level problem solving through conceptual model use and strategy explanation."],
        accommodations: ["Model template", "Think time before explanation", "Reduced item set on intervention probes"]
      },
      executiveFunction: [
        "Highlight the operation decision before solving.",
        "Use a brief self-check after equation set-up."
      ],
      behavior: [],
      files: [{ label: "IESP details", href: "./case-management.html#iesp" }],
      notes: ["This is the cleanest place to show conceptual math philosophy as a planning lens, not as a fake product."]
    },
    "demo-zoe": {
      identity: {
        display: "Zoe W.",
        grade: "Grade 1",
        support: "Behavior and foundational reading support",
        service: "Push-in plus brief daily intervention",
        tags: ["BIP", "Fundations", "DIBELS mCLASS"]
      },
      summary: "The profile needs to hold both foundational reading and behavior plans without turning into a long form stack.",
      team: ["Specialist", "Classroom teacher", "School psychologist", "Behavior team"],
      core: [
        { label: "ELA Core", title: "EL Education Grade 1", detail: "Core lesson access depends on short directions and immediate start support." }
      ],
      intervention: [
        { label: "Reading Intervention", title: "Fundations Level K Unit 5", detail: "Focus: letter-sound fluency and dictated CVC work." },
        { label: "Behavior Plan", title: "BIP active", detail: "Replacement behavior: ask for help and return to task after one prompt." }
      ],
      assessments: [
        { label: "DIBELS mCLASS", title: "PSF progress monitor", detail: "24 correct. Weekly monitoring." },
        { label: "Behavior", title: "Daily note", detail: "2 successful transitions with visual cue." }
      ],
      goals: {
        quarter: ["Increase phoneme segmentation fluency.", "Use help-request routine during independent work."],
        annual: ["BIP: reduce task-avoidance behaviors during literacy block."],
        accommodations: ["Visual first-then", "Short work intervals", "Immediate feedback"]
      },
      executiveFunction: [
        "Visual first-then card before independent work.",
        "Timer for short work interval and return-to-task cue."
      ],
      behavior: [
        "FBA: task avoidance is most likely during independent literacy after whole-group transition.",
        "BIP: replacement behavior is help request plus return to task after one adult prompt.",
        "Review date set with psychologist and behavior team."
      ],
      files: [{ label: "BIP details", href: "./case-management.html#bip" }],
      notes: ["Keep behavior notes factual and brief: incident, response, next review date."]
    },
    "demo-jasmin": {
      identity: {
        display: "Jasmin P.",
        grade: "Grade 7",
        support: "Middle school literacy intervention",
        service: "Small-group decoding and morphology",
        tags: ["IAP", "Just Words", "DIBELS mCLASS"]
      },
      summary: "This is the middle-school example. It shows what older-student intervention records look like without changing the page structure.",
      team: ["Specialist", "ELA teacher", "School psychologist"],
      core: [
        { label: "ELA Core", title: "EL Education Grade 7", detail: "Classroom work remains text-based and discussion-heavy; intervention targets access to multisyllabic words." },
        { label: "Math Core", title: "Illustrative Math Grade 7 Unit 3", detail: "Assessment remains module and lesson based." }
      ],
      intervention: [
        { label: "Reading Intervention", title: "Just Words Unit 4", detail: "Focus: suffixing rules, multisyllabic decoding, and dictation." }
      ],
      assessments: [
        { label: "Just Words", title: "Progress check", detail: "Read 15/20 multisyllabic target words accurately." },
        { label: "DIBELS mCLASS", title: "ORF snapshot", detail: "Used as supplementary progress data; rate remains below benchmark." }
      ],
      goals: {
        quarter: ["Decode multisyllabic academic words accurately in connected text.", "Apply taught suffixing rules in dictation and writing."],
        annual: ["IAP: maintain access to grade-level content through explicit morphology and accommodation support."],
        accommodations: ["Preview vocabulary", "Teacher-provided notes", "Extended time on text-heavy tasks"]
      },
      executiveFunction: [
        "Preview assignment load and due date before beginning text work.",
        "Use a note-catcher with required sections already labeled."
      ],
      behavior: [],
      files: [{ label: "IAP details", href: "./case-management.html#iap" }],
      notes: ["Older-student demo data should feel leaner and more document-based than elementary."]
    },
    "demo-mateo": {
      identity: {
        display: "Mateo C.",
        grade: "Grade 10",
        support: "High school literacy support",
        service: "Intensive reading intervention plus class accommodations",
        tags: ["IESP", "IP", "Wilson / Corrective Reading"]
      },
      summary: "This is the high-school example. It should feel accommodation-heavy and document-heavy, not cute or elementary.",
      team: ["Specialist", "Case manager", "School psychologist", "Content-area teachers"],
      core: [
        { label: "Course Access", title: "Grade 10 humanities and algebra support", detail: "Primary work is access to text-heavy content and written response." }
      ],
      intervention: [
        { label: "Reading Intervention", title: "Wilson Reading System Step 7", detail: "Wordlist charting and dictation drive lesson mastery decisions." },
        { label: "Supplemental", title: "Corrective Reading placement level", detail: "Placement data used to identify instructional entry point for comprehension support." }
      ],
      assessments: [
        { label: "Wilson", title: "Wordlist charting", detail: "Step 7 wordlist 17/20; dictation errors on vowel teams." },
        { label: "Course assessment", title: "Accommodated writing task", detail: "Completed with scaffolded outline and extended time." }
      ],
      goals: {
        quarter: ["Increase accuracy on Wilson wordlist and dictation tasks.", "Complete content-area written responses using provided outline supports."],
        annual: ["IESP: improve access to secondary text and written tasks through structured literacy intervention and accommodations.", "IP: maintain targeted intensive reading intervention."],
        accommodations: ["Extended time", "Chunked text", "Teacher outline", "Read-aloud directions when allowed"]
      },
      executiveFunction: [
        "Break multi-step assignments into checkpoint deadlines.",
        "Use teacher outline before written response begins."
      ],
      behavior: [],
      files: [{ label: "IESP details", href: "./case-management.html#iesp" }, { label: "IP details", href: "./case-management.html#ip" }],
      notes: ["Case manager remains looped in on accommodations even while the specialist maintains active service delivery."]
    }
  };

  function esc(value) {
    return String(value == null ? "" : value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function text(value) {
    return String(value == null ? "" : value).trim();
  }

  function params() {
    try {
      return new URLSearchParams(window.location.search || "");
    } catch (_err) {
      return new URLSearchParams();
    }
  }

  function readStudentId() {
    var p = params();
    return text(p.get("student") || p.get("sid") || "demo-ava");
  }

  function loadCaseload() {
    if (!CaseloadStore || typeof CaseloadStore.loadCaseload !== "function") {
      state.caseload = [];
      return;
    }
    var rows = CaseloadStore.loadCaseload();
    state.caseload = rows && Array.isArray(rows.students) ? rows.students : [];
  }

  function ensureDemoCaseload() {
    if (!CaseloadStore || typeof CaseloadStore.seedDemoCaseload !== "function") return;
    if (state.caseload.length) return;
    CaseloadStore.seedDemoCaseload();
    loadCaseload();
  }

  function ensureSupportSeed(studentId, demo) {
    if (!SupportStore || typeof SupportStore.getStudent !== "function") return;
    var student = SupportStore.getStudent(studentId);
    if (!student || !Array.isArray(student.goals) || !student.goals.length) {
      demo.goals.quarter.forEach(function (goal) {
        SupportStore.addGoal(studentId, {
          skill: "current",
          target: goal,
          timeframe: "quarter"
        });
      });
      demo.goals.accommodations.forEach(function (item) {
        SupportStore.addAccommodation(studentId, {
          title: item,
          whenToUse: "classroom and assessment"
        });
      });
      demo.intervention.forEach(function (item) {
        SupportStore.addIntervention(studentId, {
          title: item.title,
          detail: item.detail,
          type: item.label
        });
      });
    }
  }

  function studentRow(studentId) {
    for (var i = 0; i < state.caseload.length; i += 1) {
      if (String(state.caseload[i].id) === String(studentId)) return state.caseload[i];
    }
    return null;
  }

  function demoFor(studentId) {
    return DEMO_STUDENTS[studentId] || DEMO_STUDENTS["demo-ava"];
  }

  function buildList(items) {
    return '<div class="sp-list">' + items.map(function (item) {
      return [
        '<article class="sp-list-item">',
        '  <p class="sp-tile-label">' + esc(item.label || "") + '</p>',
        '  <strong>' + esc(item.title || "") + '</strong>',
        '  <p>' + esc(item.detail || "") + '</p>',
        '</article>'
      ].join("");
    }).join("") + '</div>';
  }

  function compactLines(items) {
    return '<div class="sp-compact-lines">' + items.map(function (item) {
      return '<p class="sp-note-line">' + esc(item) + '</p>';
    }).join("") + '</div>';
  }

  function buildHero(student, demo) {
    var tags = Array.isArray(demo.identity.tags) ? demo.identity.tags : [];
    return [
      '<div class="sp-hero-main">',
      '  <p class="sp-kicker">Student</p>',
      '  <h1>' + esc(demo.identity.display || (student && student.name) || "Student") + '</h1>',
      '  <p class="sp-subline">' + esc([demo.identity.grade, demo.identity.support, demo.identity.service].filter(Boolean).join(" · ")) + '</p>',
      '  <p class="sp-hero-copy">' + esc(demo.summary) + '</p>',
      '  <div class="sp-chip-row">' + tags.map(function (tag) {
        return '<span class="sp-chip">' + esc(tag) + '</span>';
      }).join("") + '</div>',
      '</div>',
      '<div class="sp-hero-side">',
      '  <div class="sp-hero-summary">',
      '    <div class="sp-meta-card"><span>Reading</span><strong>' + esc((demo.assessments[0] && demo.assessments[0].title) || "Current record") + '</strong></div>',
      '    <div class="sp-meta-card"><span>Math</span><strong>' + esc((demo.core[1] && demo.core[1].title) || "Current class record") + '</strong></div>',
      '    <div class="sp-meta-card"><span>Plans</span><strong>' + esc(demo.files.map(function (item) { return item.label.replace(" details", ""); }).join(" · ")) + '</strong></div>',
      '  </div>',
      '  <p class="sp-note-line"><strong>Looped in:</strong> ' + esc(demo.team.join(" · ")) + '</p>',
      '</div>'
    ].join("");
  }

  function renderPrograms(demo) {
    var rows = [].concat(demo.core.slice(0, 1), demo.intervention.slice(0, 1));
    el.programs.innerHTML = [
      '<p class="sp-kicker">Current Program Record</p>',
      '<h2 class="sp-section-title">Curriculum and intervention</h2>',
      buildList(rows)
    ].join("");
  }

  function renderAssessments(demo) {
    var rows = demo.assessments.slice(0, 2);
    el.assessments.innerHTML = [
      '<p class="sp-kicker">Recent Assessments</p>',
      '<h2 class="sp-section-title">Collected measures</h2>',
      buildList(rows)
    ].join("");
  }

  function renderPlans(demo) {
    el.plans.innerHTML = [
      '<p class="sp-kicker">Goals and Plans</p>',
      '<h2 class="sp-section-title">Quarter and annual priorities</h2>',
      '<div class="sp-compact-card"><p class="sp-tile-label">Current quarter goals</p>' + compactLines(demo.goals.quarter.slice(0, 2)) + '</div>',
      '<div class="sp-compact-grid">' +
        '<div class="sp-compact-card"><p class="sp-tile-label">End-of-year goals</p>' + compactLines(demo.goals.annual.slice(0, 1)) + '</div>' +
        '<div class="sp-compact-card"><p class="sp-tile-label">Executive functioning</p>' + compactLines(demo.executiveFunction.slice(0, 1)) + '</div>' +
      '</div>',
      '<div class="sp-compact-card"><p class="sp-tile-label">Accommodations</p><div class="sp-stack">' + demo.goals.accommodations.slice(0, 2).map(function (item) {
        return '<span class="sp-chip">' + esc(item) + '</span>';
      }).join("") + '</div></div>',
      '<div class="sp-plan-links">' + demo.files.map(function (item) {
        return '<a class="sp-plan-link" href="' + esc(item.href) + '"><strong>' + esc(item.label) + '</strong></a>';
      }).join("") + '</div>'
    ].join("");
  }

  function renderTeam(demo) {
    if (!demo.behavior || !demo.behavior.length) {
      el.team.classList.add("hidden");
      el.team.innerHTML = "";
      return;
    }
    el.team.classList.remove("hidden");
    el.team.innerHTML = [
      '<p class="sp-kicker">FBA / BIP</p>',
      '<h2 class="sp-section-title">Behavior support</h2>',
      '<div class="sp-compact-card"><p class="sp-tile-label">Team</p><p>' + esc(demo.team.join(" · ")) + '</p></div>',
      '<div class="sp-compact-card"><p class="sp-tile-label">Current record</p>' + compactLines(demo.behavior) + '</div>'
    ].join("");
  }

  function render() {
    state.studentId = readStudentId();
    var student = studentRow(state.studentId);
    var demo = demoFor(state.studentId);
    ensureSupportSeed(state.studentId, demo);
    if (StudentProfileStore && typeof StudentProfileStore.ensureStudentRecord === "function") {
      StudentProfileStore.ensureStudentRecord(state.studentId);
    }

    el.empty.classList.add("hidden");
    el.content.classList.remove("hidden");
    el.hero.innerHTML = buildHero(student, demo);
    renderPrograms(demo);
    renderAssessments(demo);
    renderPlans(demo);
    renderTeam(demo);
  }

  function init() {
    loadCaseload();
    ensureDemoCaseload();
    if (!state.caseload.length) {
      el.empty.classList.remove("hidden");
      el.content.classList.add("hidden");
      return;
    }
    render();
  }

  init();
})();
