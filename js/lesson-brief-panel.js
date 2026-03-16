(function lessonBriefPanelModule(root) {
  "use strict";

  var PANEL_ID = "cs-brief-panel";
  var OVERLAY_ID = "cs-brief-overlay";
  var BODY_ID = "cs-brief-body";
  var RECENTS_KEY = "cs.lessonBrief.recents.v1";
  var SELECTION_KEY = "cs.lessonBrief.selection.v2";
  var DAILY_KEY = "cs.lessonBrief.daily.v2";
  var NOTES_KEY = "cs.lessonBrief.notes.v2";
  var TeacherStorage = root.CSTeacherStorage || null;
  var CurriculumTruth = root.CSCurriculumTruth || null;

  var Evidence = root.CSEvidence || null;
  var _data = null;
  var _fishtankUnits = [];
  var _curriculumMeta = {};
  var _loadPromise = null;
  var _selection = loadSelection();
  var _context = {
    caseload: [],
    roster: [],
    studentId: "",
    studentName: "",
    grade: ""
  };
  var _googleState = {
    status: "",
    busy: false,
    driveResults: [],
    youtubeResults: [],
    lastCreated: null
  };

  function truth(id) {
    return CurriculumTruth && typeof CurriculumTruth.cloneEntry === "function"
      ? CurriculumTruth.cloneEntry(id)
      : null;
  }

  function truthLines(entry, fallback) {
    var lines = [];
    if (entry && entry.officialFocus) lines.push(entry.officialFocus);
    if (entry && entry.assessmentDetail) lines.push(entry.assessmentDetail);
    if (lines.length) return lines.join(" ");
    return String(fallback || "");
  }

  function truthProgram(id) {
    return CurriculumTruth && typeof CurriculumTruth.cloneProgram === "function"
      ? CurriculumTruth.cloneProgram(id)
      : null;
  }

  function progressDataLine(entry, program) {
    if (entry && entry.progressDataNote) return String(entry.progressDataNote);
    if (program && program.progressDataNote) return String(program.progressDataNote);
    return "";
  }

  function buildFishtankGradeLink(unit) {
    var gradeSlug = String(unit && unit.gradeSlug || "").trim();
    if (!gradeSlug) return "https://www.fishtanklearning.org/curriculum/ela/";
    return "https://www.fishtanklearning.org/curriculum/ela/" + gradeSlug + "/";
  }

  function buildElModuleLinks(grade, module, unit) {
    var gradeText = String(grade || "").trim();
    var moduleId = String(module && module.id || "").trim();
    var unitId = String(unit && unit.id || "").trim();
    var gradeNum = gradeText.replace(/[^\d]/g, "");
    var moduleNumMatch = moduleId.match(/m(\d+)/i);
    var unitNumMatch = unitId.match(/u(\d+)/i);
    if (!gradeNum || !moduleNumMatch) {
      return {
        moduleHref: "https://curriculum.eleducation.org/",
        unitHref: "https://curriculum.eleducation.org/"
      };
    }
    var moduleHref = "https://curriculum.eleducation.org/curriculum/ela/2019/grade-" + gradeNum + "/module-" + moduleNumMatch[1];
    return {
      moduleHref: moduleHref,
      unitHref: unitNumMatch ? (moduleHref + "/unit-" + unitNumMatch[1]) : moduleHref
    };
  }

  var SUPPORT_TYPES = [
    { id: "push-in", label: "Push-in class support" },
    { id: "pullout", label: "Tier 2 / Tier 3 pullout" },
    { id: "planning", label: "Planning preview" }
  ];

  var AREAS = [
    { id: "ela", label: "Core ELA" },
    { id: "intervention", label: "Literacy intervention" },
    { id: "math", label: "Math" },
    { id: "writing", label: "Writing" },
    { id: "humanities", label: "Humanities" }
  ];

  var PROGRAMS = [
    { id: "fishtank-ela", label: "Fishtank ELA", area: "ela", grades: ["K", "1", "2", "3", "4", "5"], type: "fishtank" },
    { id: "el-education", label: "EL Education ELA", area: "ela", grades: ["6", "7", "8"], type: "el" },
    { id: "ufli", label: "UFLI Foundations", area: "intervention", grades: ["K", "1", "2"], type: "ufli" },
    { id: "fundations", label: "Fundations", area: "intervention", grades: ["K", "1", "2", "3"], type: "fundations" },
    { id: "just-words", label: "Just Words", area: "intervention", grades: ["4", "5", "6", "7", "8"], type: "just-words" },
    { id: "haggerty", label: "Heggerty / Haggerty PA", area: "intervention", grades: ["K", "1", "2"], type: "haggerty" },
    { id: "illustrative-math", label: "Illustrative Math", area: "math", grades: ["K", "1", "2", "3", "4", "5"], type: "illustrative" },
    { id: "bridges-math", label: "Bridges Math", area: "math", grades: ["K", "1", "2", "3", "4", "5"], type: "bridges" },
    { id: "step-up-writing", label: "Step Up to Writing", area: "writing", grades: ["2", "3", "4", "5", "6", "7", "8", "9"], type: "step-up" },
    { id: "sas-humanities-9", label: "SAS Humanities 9", area: "humanities", grades: ["9"], type: "humanities" }
  ];

  var FUNDATIONS_LEVELS = [
    { id: "1", label: "Level 1", units: 14 },
    { id: "2", label: "Level 2", units: 17 },
    { id: "3", label: "Level 3", units: 16 }
  ];

  var JUST_WORDS_UNITS = [
    { id: "jw-1", label: "Unit 1", focus: "multisyllabic reading, spelling, and discussion" },
    { id: "jw-2", label: "Unit 2", focus: "multisyllabic reading, spelling, and discussion" },
    { id: "jw-3", label: "Unit 3", focus: "multisyllabic reading, spelling, and discussion" },
    { id: "jw-4", label: "Unit 4", focus: "multisyllabic reading, spelling, and discussion" },
    { id: "jw-5", label: "Unit 5", focus: "multisyllabic reading, spelling, and discussion" }
  ];

  var HEGGERTY_ROUTINES = [
    { id: "blend", label: "Blending", focus: "holding sounds in sequence and blending orally" },
    { id: "segment", label: "Segmenting", focus: "hearing every phoneme and saying each sound in order" },
    { id: "manipulate", label: "Phoneme manipulation", focus: "adding, deleting, and substituting sounds without print" },
    { id: "advanced", label: "Advanced PA", focus: "rapid manipulation and transfer to stronger phonics readiness" }
  ];

  var BRIDGES_COMPONENTS = [
    {
      id: "problems",
      label: "Problems & Investigations",
      phaseLabel: "Concept build",
      summary: "Students are reasoning through the main math task, so support should keep them grounded in one representation and one idea at a time.",
      mainConcept: "Bridges main lessons build understanding before speed. Students need help connecting a model, a strategy, and an explanation.",
      workedExample: "Ask: Which model is helping you here, and what does each part of the model stand for?",
      confusions: [
        "Jumping to a procedure without understanding the model.",
        "Explaining what they did but not why it works.",
        "Treating the visual as decoration instead of mathematical evidence."
      ],
      moves: [
        "Have the student point to one quantity or relationship on the model before solving.",
        "Ask what stays the same and what changes in the representation.",
        "Keep the explanation sentence short: I know this because the model shows ___."
      ],
      lookFors: [
        "Student connects language to the model.",
        "Student can justify a step, not just give an answer.",
        "Student uses precise math words instead of vague pointing."
      ],
      prompts: [
        "What does this part of the model represent?",
        "How does the model prove your answer?",
        "Which strategy fits this problem best and why?"
      ]
    },
    {
      id: "number-corner",
      label: "Number Corner",
      phaseLabel: "Daily routine",
      summary: "Number Corner is short and cumulative. Support works best when you help students notice patterns and say the pattern out loud before computing.",
      mainConcept: "These routines preview or revisit big ideas through repeated structures, so the goal is pattern noticing and flexible reasoning.",
      workedExample: "Pause on one calendar marker, fraction, or equation and ask what changed from yesterday and why that change matters.",
      confusions: [
        "Treating each day as disconnected instead of cumulative.",
        "Noticing a pattern but struggling to explain the rule.",
        "Answering quickly without checking for reasonableness."
      ],
      moves: [
        "Rephrase the routine in plain language before asking for the answer.",
        "Have the student predict the next step before the teacher reveals it.",
        "Use one sentence stem: I noticed ___ so I think ___ next."
      ],
      lookFors: [
        "Student sees the pattern and can state it.",
        "Student checks the next value against the rule.",
        "Student explains using math vocabulary from the lesson."
      ],
      prompts: [
        "What pattern do you notice first?",
        "What should come next and why?",
        "How do you know your answer fits the pattern?"
      ]
    },
    {
      id: "work-places",
      label: "Work Places",
      phaseLabel: "Independent practice",
      summary: "Work Places ask students to apply a known strategy with growing independence. Support should clarify directions and one target move, not reteach the whole unit.",
      mainConcept: "These centers are meant to surface strategy use. The key support move is helping students know which strategy the game or task is actually practicing.",
      workedExample: "Before the student starts, ask: What skill is this game trying to strengthen, and what move will you use first?",
      confusions: [
        "Focusing on the game rules but missing the math goal.",
        "Choosing an inefficient strategy repeatedly.",
        "Getting stuck on recording expectations."
      ],
      moves: [
        "Name the one strategy to try before play begins.",
        "Model one turn and stop before doing the full task for the student.",
        "Check in after the first round rather than hovering continuously."
      ],
      lookFors: [
        "Student can name the math goal.",
        "Student applies the intended strategy at least once.",
        "Student records enough thinking to show understanding."
      ],
      prompts: [
        "What skill is this practice built for?",
        "Which strategy will you try first?",
        "How will you show your thinking in one quick note or sketch?"
      ]
    },
    {
      id: "intervention",
      label: "Assessment / intervention",
      phaseLabel: "Targeted support",
      summary: "This is a smaller support move around a Bridges concept, so keep the work narrow and concrete.",
      mainConcept: "Students usually need one representation, one language frame, and one practice set before the concept becomes usable in class.",
      workedExample: "Take one item, one model, and one sentence frame. Solve it together, then have the student try a nearly identical problem alone.",
      confusions: [
        "Cognitive overload from too many examples at once.",
        "Not connecting the intervention practice back to class work.",
        "Losing accuracy when switching from model to symbolic form."
      ],
      moves: [
        "Keep the intervention set to 2-4 items on the same idea.",
        "Say explicitly how this connects to the class lesson or station.",
        "Return to the same model until the idea stabilizes."
      ],
      lookFors: [
        "Student can solve one similar problem independently.",
        "Student explains the target idea using simple math language.",
        "Student recognizes the same structure in class work."
      ],
      prompts: [
        "What is the one idea we are practicing right now?",
        "How does this model help you know what to do?",
        "Can you try one more that looks almost the same?"
      ]
    }
  ];

  var STEP_UP_GENRES = [
    { id: "informational", label: "Informational / explanatory" },
    { id: "argument", label: "Argument / opinion" },
    { id: "narrative", label: "Narrative" },
    { id: "response", label: "Short response / constructed response" }
  ];

  var STEP_UP_STAGES = [
    { id: "plan", label: "Plan and organize", concept: "Students sort ideas and build a clear structure before drafting." },
    { id: "draft", label: "Draft with color cues", concept: "Students turn an outline into complete sentences that stay aligned to the structure." },
    { id: "elaborate", label: "Elaborate details", concept: "Students expand ideas with examples, evidence, and explanation rather than repeating themselves." },
    { id: "transition", label: "Add transitions", concept: "Students guide the reader with clear links between ideas." },
    { id: "revise", label: "Revise for clarity", concept: "Students strengthen organization, specificity, and sentence control." }
  ];

  function el(id) {
    return document.getElementById(id);
  }

  function escapeHtml(value) {
    return String(value == null ? "" : value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  function safeJsonParse(raw, fallback) {
    try {
      return raw ? JSON.parse(raw) : fallback;
    } catch (_err) {
      return fallback;
    }
  }

  function readStorage(key, fallback) {
    try {
      return safeJsonParse(localStorage.getItem(key), fallback);
    } catch (_err) {
      return fallback;
    }
  }

  function writeStorage(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch (_err) {}
  }

  function setGoogleStatus(message) {
    _googleState.status = String(message || "");
  }

  function defaultSelection() {
    return {
      blockId: "",
      blockLabel: "",
      blockTime: "",
      supportType: "push-in",
      area: "ela",
      programId: "",
      studentId: "",
      studentName: "",
      grade: "",
      rosterCandidateId: "",
      unitId: "",
      lesson: "1",
      moduleId: "",
      moduleUnitId: "",
      level: "1",
      jwUnitId: "jw-1",
      haggertyRoutine: "blend",
      bridgesComponent: "problems",
      stepUpGenre: "informational",
      stepUpStage: "plan",
      lessonLabel: "",
      customCourse: "",
      customUnit: "",
      customText: ""
    };
  }

  function mergeSelection(base, patch) {
    var next = {};
    var keys = Object.keys(base);
    var i;
    for (i = 0; i < keys.length; i++) next[keys[i]] = base[keys[i]];
    if (!patch || typeof patch !== "object") return next;
    keys = Object.keys(patch);
    for (i = 0; i < keys.length; i++) {
      if (next.hasOwnProperty(keys[i])) next[keys[i]] = patch[keys[i]];
    }
    return next;
  }

  function loadSelection() {
    return mergeSelection(defaultSelection(), readStorage(SELECTION_KEY, null));
  }

  function saveSelection() {
    writeStorage(SELECTION_KEY, mergeSelection(defaultSelection(), _selection));
  }

  function pad2(value) {
    return value < 10 ? "0" + value : String(value);
  }

  function todayStamp() {
    var d = new Date();
    return [d.getFullYear(), pad2(d.getMonth() + 1), pad2(d.getDate())].join("-");
  }

  function normalizeGrade(raw) {
    var value = String(raw == null ? "" : raw).trim().toUpperCase();
    if (!value) return "";
    if (value === "K" || value === "0") return "K";
    if (value.indexOf("GRADE ") === 0) value = value.slice(6);
    if (value.indexOf("G") === 0 && value.length > 1) value = value.slice(1);
    if (/^(10|11|12|[1-9])$/.test(value)) return value;
    var match = value.match(/10|11|12|[1-9]/);
    return match && match[0] ? match[0] : "";
  }

  function formatGradeLabel(grade) {
    return grade === "K" ? "Kindergarten" : "Grade " + grade;
  }

  function rangeGrades() {
    return ["K", "1", "2", "3", "4", "5", "6", "7", "8", "9", "10", "11", "12"];
  }

  function programById(programId) {
    var i;
    for (i = 0; i < PROGRAMS.length; i++) {
      if (PROGRAMS[i].id === programId) return PROGRAMS[i];
    }
    return null;
  }

  function labelFor(list, id) {
    var i;
    for (i = 0; i < list.length; i++) {
      if (list[i].id === id) return list[i].label;
    }
    return "";
  }

  function programSupportsGrade(program, grade) {
    if (!program) return false;
    if (!grade) return true;
    return program.grades.indexOf(grade) >= 0;
  }

  function programsForArea(area, grade) {
    return PROGRAMS.filter(function (program) {
      return (!area || program.area === area) && programSupportsGrade(program, grade);
    });
  }

  function inferAreaFromBlockLabel(label) {
    var lower = String(label || "").toLowerCase();
    if (!lower) return "";
    if (lower.indexOf("math") >= 0 || lower.indexOf("bridges") >= 0 || lower.indexOf("numeracy") >= 0) return "math";
    if (lower.indexOf("writing") >= 0 || lower.indexOf("step up") >= 0) return "writing";
    if (lower.indexOf("humanities") >= 0 || lower.indexOf("history") >= 0) return "humanities";
    if (lower.indexOf("fundations") >= 0 || lower.indexOf("just words") >= 0 || lower.indexOf("ufli") >= 0 || lower.indexOf("heggerty") >= 0 || lower.indexOf("pullout") >= 0 || lower.indexOf("intervention") >= 0) return "intervention";
    return "ela";
  }

  function suggestedArea() {
    if (_selection.area && programsForArea(_selection.area, _selection.grade).length) return _selection.area;
    if (_selection.blockLabel) {
      var guessed = inferAreaFromBlockLabel(_selection.blockLabel);
      if (guessed) return guessed;
    }
    if (_selection.supportType === "pullout") return "intervention";
    if (_selection.grade === "9") return "humanities";
    return "ela";
  }

  function suggestedProgram(area, grade) {
    var options = programsForArea(area, grade);
    if (!options.length) options = programsForArea(area, "");
    if (!options.length) return "";
    if (area === "intervention") {
      if (grade === "K" || grade === "1" || grade === "2") return grade === "K" || grade === "1" ? "haggerty" : "ufli";
      if (grade === "3") return "fundations";
      return "just-words";
    }
    if (area === "math") return "bridges-math";
    if (area === "writing") return "step-up-writing";
    if (area === "humanities") return "sas-humanities-9";
    if (grade === "6" || grade === "7" || grade === "8") return "el-education";
    return "fishtank-ela";
  }

  function getCaseload() {
    if (Array.isArray(_context.caseload) && _context.caseload.length) return _context.caseload.slice();
    if (Evidence && typeof Evidence.listCaseload === "function") {
      try { return Evidence.listCaseload() || []; } catch (_err) {}
    }
    return [];
  }

  function findStudent(studentId) {
    var roster = getCaseload();
    var i;
    for (i = 0; i < roster.length; i++) {
      if (String(roster[i].id || "") === String(studentId || "")) return roster[i];
    }
    return null;
  }

  function currentStudent() {
    return findStudent(_selection.studentId) || null;
  }

  function inferProgramIdFromBlock(block, area) {
    var curriculumId = String(block && (block.curriculumId || block.programId) || "").trim().toLowerCase();
    var curriculum = String(block && block.curriculum || "").trim().toLowerCase();
    var subject = String(block && block.subject || "").trim().toLowerCase();
    var label = String(block && block.label || "").trim().toLowerCase();
    var text = [curriculumId, curriculum, subject, label].join(" ");
    if (curriculumId === "illustrative-math" || text.indexOf("illustrative") >= 0) return "illustrative-math";
    if (curriculumId === "fishtank-ela" || text.indexOf("fishtank") >= 0) return "fishtank-ela";
    if (curriculumId === "fundations" || text.indexOf("fundations") >= 0) return "fundations";
    if (curriculumId === "ufli" || text.indexOf("ufli") >= 0) return "ufli";
    if (curriculumId === "just-words" || text.indexOf("just words") >= 0) return "just-words";
    if (curriculumId === "haggerty" || curriculumId === "heggerty" || text.indexOf("heggerty") >= 0 || text.indexOf("haggerty") >= 0) return "haggerty";
    if (curriculumId === "bridges" || curriculumId === "bridges-intervention" || text.indexOf("bridges") >= 0) return area === "math" ? "bridges-math" : "bridges-math";
    if (text.indexOf("el education") >= 0) return "el-education";
    if (text.indexOf("step up") >= 0) return "step-up-writing";
    if (area === "math") return "";
    if (area === "writing") return "step-up-writing";
    if (area === "humanities") return "sas-humanities-9";
    if (area === "intervention") return "";
    return "fishtank-ela";
  }

  function inferAreaFromBlock(block) {
    var explicit = String(block && block.area || "").trim();
    if (explicit) return explicit;
    var subject = String(block && block.subject || "").trim();
    var curriculum = String(block && block.curriculum || "").trim();
    var classSection = String(block && block.classSection || "").trim();
    return inferAreaFromBlockLabel([subject, curriculum, classSection, block && block.label || ""].join(" "));
  }

  function currentBlock() {
    var blocks = getBlocks();
    var i;
    for (i = 0; i < blocks.length; i++) {
      if (blocks[i].id === _selection.blockId) return blocks[i];
    }
    return null;
  }

  function currentBlockRoster() {
    var block = currentBlock();
    var all = getCaseload();
    var ids = block && Array.isArray(block.studentIds) ? block.studentIds : [];
    return all.filter(function (row) {
      return ids.indexOf(String(row.id || "")) >= 0;
    });
  }

  function normalizeBlock(block) {
    var profile = TeacherStorage && typeof TeacherStorage.loadTeacherProfile === "function"
      ? TeacherStorage.loadTeacherProfile()
      : { name: "" };
    var area = inferAreaFromBlock(block);
    var programId = String(block && block.programId || inferProgramIdFromBlock(block, area) || "");
    var program = programById(programId);
    var next = {
      id: String(block && block.id || "blk-" + Date.now()),
      label: String(block && block.label || "").trim(),
      timeLabel: String(block && block.timeLabel || "").trim(),
      supportType: String(block && block.supportType || "push-in"),
      area: area || "ela",
      programId: programId,
      subject: String(block && block.subject || block && block.area || area || "ela").trim(),
      teacher: String(block && block.teacher || profile.name || "").trim(),
      curriculum: String(block && block.curriculum || program && program.label || "").trim(),
      lesson: String(block && block.lesson || "").trim(),
      classSection: String(block && block.classSection || block && block.label || "").trim(),
      notes: String(block && block.notes || "").trim(),
      studentIds: [],
      rosterRefs: []
    };
    var ids = Array.isArray(block && block.studentIds) ? block.studentIds : [];
    next.studentIds = ids.map(function (value) {
      return String(value || "");
    }).filter(Boolean);
    next.rosterRefs = next.studentIds.slice();
    return next;
  }

  function getBlocks() {
    if (TeacherStorage && typeof TeacherStorage.loadScheduleBlocks === "function") {
      return TeacherStorage.loadScheduleBlocks(todayStamp()).map(normalizeBlock);
    }
    var legacyMap = readStorage("cs.lessonBrief.blocks.v1", {});
    var rows = legacyMap && Array.isArray(legacyMap[todayStamp()]) ? legacyMap[todayStamp()] : [];
    return rows.map(normalizeBlock);
  }

  function saveBlocks(rows) {
    var normalized = Array.isArray(rows) ? rows.map(normalizeBlock) : [];
    if (TeacherStorage && typeof TeacherStorage.saveScheduleBlocks === "function") {
      TeacherStorage.saveScheduleBlocks(todayStamp(), normalized);
      return;
    }
    var legacyMap = readStorage("cs.lessonBrief.blocks.v1", {});
    legacyMap[todayStamp()] = normalized;
    writeStorage("cs.lessonBrief.blocks.v1", legacyMap);
  }

  function saveDailySelection() {
    if (!_selection.studentId) return;
    var map = readStorage(DAILY_KEY, {});
    var key = [todayStamp(), _selection.blockId || "no-block", _selection.studentId].join(":");
    map[key] = mergeSelection(defaultSelection(), _selection);
    writeStorage(DAILY_KEY, map);
  }

  function loadDailySelection(studentId, blockId) {
    var map = readStorage(DAILY_KEY, {});
    var key = [todayStamp(), blockId || "no-block", studentId || ""].join(":");
    return map && map[key] ? mergeSelection(defaultSelection(), map[key]) : null;
  }

  function getNoteMap() {
    return readStorage(NOTES_KEY, {});
  }

  function noteKeyForBrief(brief) {
    return [brief.key, _selection.blockId || "no-block", _selection.studentId || "no-student"].join(":");
  }

  function getNoteForKey(key) {
    var map = getNoteMap();
    return map && map[key] ? String(map[key]) : "";
  }

  function getRecents() {
    return readStorage(RECENTS_KEY, []);
  }

  function buildPanel() {
    if (el(PANEL_ID)) return;

    var overlay = document.createElement("div");
    overlay.id = OVERLAY_ID;
    overlay.className = "cs-brief-overlay";
    document.body.appendChild(overlay);

    var panel = document.createElement("aside");
    panel.id = PANEL_ID;
    panel.className = "cs-brief-panel";
    panel.setAttribute("role", "dialog");
    panel.setAttribute("aria-modal", "true");
    panel.setAttribute("aria-labelledby", "cs-brief-title");
    panel.innerHTML = [
      '<div class="cs-brief-head">',
      '  <div class="cs-brief-head-copy">',
      '    <h2 id="cs-brief-title" class="cs-brief-title">Today\'s Briefing</h2>',
      '    <p class="cs-brief-sub">Start with the block of time, then the roster you support, then the lesson you are walking into.</p>',
      "  </div>",
      '  <button id="cs-brief-close" class="cs-brief-close" type="button" aria-label="Close lesson brief panel">x</button>',
      "</div>",
      '<div id="' + BODY_ID + '" class="cs-brief-body"></div>'
    ].join("");
    document.body.appendChild(panel);

    overlay.addEventListener("click", close);
    panel.addEventListener("click", handleClick);
    panel.addEventListener("change", handleChange);
    panel.addEventListener("input", handleInput);

    var closeBtn = el("cs-brief-close");
    if (closeBtn) closeBtn.addEventListener("click", close);
  }

  function loadData() {
    if (_loadPromise) return _loadPromise;
    _loadPromise = Promise.all([
      fetch("./data/lesson-briefs.json?v=20260316a").then(function (response) {
        return response.ok ? response.json() : null;
      }).catch(function () { return null; }),
      fetch("./data/curriculum-extended.json?v=20260316a").then(function (response) {
        return response.ok ? response.json() : null;
      }).catch(function () { return null; })
    ]).then(function (payload) {
      _data = payload[0] || {};
      var curriculumData = payload[1] || {};
      _fishtankUnits = Array.isArray(curriculumData.fishtankUnits) ? curriculumData.fishtankUnits.slice() : [];
      _curriculumMeta = {};
      if (Array.isArray(curriculumData.curricula)) {
        curriculumData.curricula.forEach(function (row) {
          _curriculumMeta[String(row.id || "")] = row;
        });
      }
      ensureSelectionValid();
      return true;
    });
    return _loadPromise;
  }

  function applyContext(context) {
    context = context || null;
    if (!context) {
      ensureSelectionValid();
      saveSelection();
      return;
    }

    if (Array.isArray(context.caseload)) _context.caseload = context.caseload.slice();
    if (Array.isArray(context.roster)) _context.roster = context.roster.slice();
    if (context.studentId) _context.studentId = String(context.studentId);
    if (context.studentName) _context.studentName = String(context.studentName);
    if (context.grade) _context.grade = normalizeGrade(context.grade);

    if (context.blockId) _selection.blockId = String(context.blockId);
    if (context.blockLabel) _selection.blockLabel = String(context.blockLabel);
    if (context.blockTime) _selection.blockTime = String(context.blockTime);
    if (context.supportType) _selection.supportType = String(context.supportType);
    if (context.area) _selection.area = String(context.area);
    if (context.programId) _selection.programId = String(context.programId);

    if (context.studentId) {
      _selection.studentId = String(context.studentId);
      var saved = loadDailySelection(_selection.studentId, _selection.blockId);
      if (saved) _selection = mergeSelection(defaultSelection(), saved);
    }
    if (context.studentName) _selection.studentName = String(context.studentName);
    if (context.grade) _selection.grade = normalizeGrade(context.grade);

    if (!_selection.studentId && _context.studentId) _selection.studentId = _context.studentId;
    if (!_selection.studentName && _context.studentName) _selection.studentName = _context.studentName;
    if (!_selection.grade && _context.grade) _selection.grade = _context.grade;

    ensureSelectionValid();
    saveSelection();
  }

  function ensureSelectionValid() {
    var block = currentBlock();
    var previousProgramId = _selection.programId;
    if (block) {
      if (block.label) _selection.blockLabel = block.label;
      if (block.timeLabel) _selection.blockTime = block.timeLabel;
      if (block.supportType) _selection.supportType = block.supportType;
      if (block.area) _selection.area = block.area;
      if (block.programId) _selection.programId = block.programId;
      if (block.lesson && (!_selection.lessonLabel || (block.programId && block.programId !== previousProgramId))) {
        _selection.lessonLabel = String(block.lesson);
      }
      if (_selection.studentId && block.studentIds.length && block.studentIds.indexOf(_selection.studentId) < 0) {
        _selection.studentId = block.studentIds[0];
      }
      if (!_selection.studentId && block.studentIds.length === 1) _selection.studentId = block.studentIds[0];
    }

    var student = currentStudent();
    if (student) {
      _selection.studentName = String(student.name || _selection.studentName || "");
      if (!_selection.grade) _selection.grade = normalizeGrade(student.grade || student.gradeBand || "");
    }

    if (!_selection.area) _selection.area = suggestedArea();
    if (!_selection.programId || !programById(_selection.programId) || !programSupportsGrade(programById(_selection.programId), _selection.grade)) {
      _selection.programId = suggestedProgram(_selection.area, _selection.grade);
    }
    if (!programById(_selection.programId) && PROGRAMS[0]) _selection.programId = PROGRAMS[0].id;

    ensureProgramSpecificSelection();
  }

  function ensureProgramSpecificSelection() {
    var program = programById(_selection.programId);
    if (!program) return;
    if (!programSupportsGrade(program, _selection.grade)) {
      _selection.grade = program.grades[0] || _selection.grade;
    }
    if (program.type === "fishtank") ensureFishtankSelection();
    else if (program.type === "el") ensureElSelection();
    else if (program.type === "ufli") {
      _selection.lesson = String(Math.max(1, Math.min(Number(_selection.lesson || 1), 128)));
    } else if (program.type === "fundations") {
      ensureFundationsSelection();
    } else if (program.type === "just-words") {
      if (!JUST_WORDS_UNITS.some(function (row) { return row.id === _selection.jwUnitId; })) _selection.jwUnitId = JUST_WORDS_UNITS[0].id;
    } else if (program.type === "haggerty") {
      if (!HEGGERTY_ROUTINES.some(function (row) { return row.id === _selection.haggertyRoutine; })) _selection.haggertyRoutine = HEGGERTY_ROUTINES[0].id;
    } else if (program.type === "bridges") {
      if (!BRIDGES_COMPONENTS.some(function (row) { return row.id === _selection.bridgesComponent; })) _selection.bridgesComponent = BRIDGES_COMPONENTS[0].id;
    } else if (program.type === "step-up") {
      if (!STEP_UP_GENRES.some(function (row) { return row.id === _selection.stepUpGenre; })) _selection.stepUpGenre = STEP_UP_GENRES[0].id;
      if (!STEP_UP_STAGES.some(function (row) { return row.id === _selection.stepUpStage; })) _selection.stepUpStage = STEP_UP_STAGES[0].id;
    }
  }

  function getFishtankGrades() {
    var seen = {};
    return _fishtankUnits.reduce(function (list, unit) {
      var grade = normalizeGrade(unit && unit.grade);
      if (grade && !seen[grade]) {
        seen[grade] = true;
        list.push(grade);
      }
      return list;
    }, []).sort(function (a, b) {
      if (a === "K") return -1;
      if (b === "K") return 1;
      return Number(a) - Number(b);
    });
  }

  function getFishtankUnitsForGrade(grade) {
    return _fishtankUnits.filter(function (unit) {
      return normalizeGrade(unit && unit.grade) === normalizeGrade(grade);
    });
  }

  function findFishtankUnit(unitId) {
    var i;
    for (i = 0; i < _fishtankUnits.length; i++) {
      if (_fishtankUnits[i].id === unitId) return _fishtankUnits[i];
    }
    return null;
  }

  function ensureFishtankSelection() {
    var grades = getFishtankGrades();
    if (grades.indexOf(_selection.grade) < 0) _selection.grade = grades[0] || "K";
    var units = getFishtankUnitsForGrade(_selection.grade);
    if (units.length && !units.some(function (row) { return row.id === _selection.unitId; })) _selection.unitId = units[0].id;
    var activeUnit = findFishtankUnit(_selection.unitId);
    var lessonCount = Number(activeUnit && activeUnit.lessonCount || 1);
    var lesson = Number(_selection.lesson || 1);
    if (!lesson || lesson < 1 || lesson > lessonCount) _selection.lesson = "1";
    _selection.moduleId = "";
    _selection.moduleUnitId = "";
  }

  function getElGrades() {
    var gradesNode = _data && _data.elEducation && _data.elEducation.grades ? _data.elEducation.grades : {};
    return Object.keys(gradesNode).sort();
  }

  function getElModulesForGrade(grade) {
    var gradeNode = _data && _data.elEducation && _data.elEducation.grades
      ? _data.elEducation.grades[String(grade)]
      : null;
    return gradeNode && Array.isArray(gradeNode.modules) ? gradeNode.modules : [];
  }

  function findElModule(grade, moduleId) {
    var modules = getElModulesForGrade(grade);
    var i;
    for (i = 0; i < modules.length; i++) {
      if (modules[i].id === moduleId) return modules[i];
    }
    return null;
  }

  function findElUnit(grade, moduleId, unitId) {
    var module = findElModule(grade, moduleId);
    var units = module && Array.isArray(module.units) ? module.units : [];
    var i;
    for (i = 0; i < units.length; i++) {
      if (units[i].id === unitId) return units[i];
    }
    return null;
  }

  function ensureElSelection() {
    var grades = getElGrades();
    if (grades.indexOf(_selection.grade) < 0) _selection.grade = grades[0] || "6";
    var modules = getElModulesForGrade(_selection.grade);
    if (modules.length && !modules.some(function (row) { return row.id === _selection.moduleId; })) _selection.moduleId = modules[0].id;
    var module = findElModule(_selection.grade, _selection.moduleId);
    var units = module && Array.isArray(module.units) ? module.units : [];
    if (units.length && !units.some(function (row) { return row.id === _selection.moduleUnitId; })) _selection.moduleUnitId = units[0].id;
    _selection.unitId = "";
    _selection.lesson = "1";
  }

  function ensureFundationsSelection() {
    if (!FUNDATIONS_LEVELS.some(function (row) { return row.id === _selection.level; })) _selection.level = FUNDATIONS_LEVELS[0].id;
    var level = FUNDATIONS_LEVELS.filter(function (row) { return row.id === _selection.level; })[0];
    var lesson = Number(_selection.lesson || 1);
    if (!lesson || lesson < 1 || lesson > Number(level && level.units || 1)) _selection.lesson = "1";
  }

  function isOpen() {
    var panel = el(PANEL_ID);
    return !!(panel && panel.classList.contains("is-open"));
  }

  function renderLoading() {
    var body = el(BODY_ID);
    if (!body) return;
    body.innerHTML = '<div class="cs-brief-loading">Loading schedule and lesson briefing data...</div>';
  }

  function open(context) {
    buildPanel();
    if (TeacherStorage && typeof TeacherStorage.migrateLessonBriefBlocks === "function") {
      TeacherStorage.migrateLessonBriefBlocks();
    }
    applyContext(context || null);
    var overlay = el(OVERLAY_ID);
    var panel = el(PANEL_ID);
    if (overlay) overlay.classList.add("is-open");
    if (panel) panel.classList.add("is-open");
    renderLoading();
    loadData().then(function () {
      render();
    });
  }

  function close() {
    var overlay = el(OVERLAY_ID);
    var panel = el(PANEL_ID);
    if (overlay) overlay.classList.remove("is-open");
    if (panel) panel.classList.remove("is-open");
  }

  function toggle(context) {
    if (isOpen()) {
      close();
    } else {
      open(context);
    }
  }

  function setContext(context) {
    applyContext(context || null);
    if (isOpen()) render();
  }

  function render() {
    var body = el(BODY_ID);
    if (!body) return;
    if (!_data) {
      renderLoading();
      return;
    }

    ensureSelectionValid();
    saveSelection();

    var brief = currentBrief();
    var bodyParts = [
      renderRecents(),
      renderBlocksCard(),
      renderRosterCard(),
      renderSetupCard()
    ];
    if (brief) bodyParts.push(renderBriefCard(brief));
    else bodyParts.push('<section class="cs-brief-card"><p class="cs-brief-empty">Choose a block, student, and lesson context to generate the quick briefing.</p></section>');
    bodyParts.push(renderGoogleWorkspaceCard(brief));
    body.innerHTML = bodyParts.join("\n");

    if (brief) notifySelection(brief);
  }

  function renderRecents() {
    var recents = getRecents();
    if (!Array.isArray(recents) || !recents.length) {
      return [
        '<section class="cs-brief-card">',
        '  <p class="cs-brief-kicker">Recent briefings</p>',
        '  <p class="cs-brief-empty">Saved student briefs will appear here for one-tap reuse before class.</p>',
        "</section>"
      ].join("\n");
    }
    var chips = recents.map(function (item) {
      return '<button class="cs-brief-chip" data-brief-recent="' + escapeHtml(item.key) + '" type="button">' + escapeHtml(item.label) + "</button>";
    }).join("");
    return [
      '<section class="cs-brief-card">',
      '  <p class="cs-brief-kicker">Recent briefings</p>',
      '  <div class="cs-brief-chip-row">' + chips + "</div>",
      "</section>"
    ].join("\n");
  }

  function renderBlocksCard() {
    var blocks = getBlocks();
    var programOptions = programsForArea(_selection.area, _selection.grade).map(function (row) {
      return renderOption(row.id, row.label, row.id === _selection.programId);
    }).join("");
    if (!programOptions) {
      programOptions = PROGRAMS.map(function (row) {
        return renderOption(row.id, row.label, row.id === _selection.programId);
      }).join("");
    }
    var chips = blocks.length ? blocks.map(function (block) {
      var count = Array.isArray(block.studentIds) ? block.studentIds.length : 0;
      return '<button class="cs-brief-chip' + (block.id === _selection.blockId ? " is-active" : "") + '" data-brief-block="' + escapeHtml(block.id) + '" type="button">' + escapeHtml((block.timeLabel ? block.timeLabel + " - " : "") + block.label + " (" + count + ")") + "</button>";
    }).join("") : '<p class="cs-brief-empty">No blocks saved for today yet. Add the periods or pullout windows you are supporting.</p>';

    return [
      '<section class="cs-brief-card">',
      '  <p class="cs-brief-kicker">Today\'s blocks</p>',
      '  <div class="cs-brief-chip-row">' + chips + "</div>",
      '  <div class="cs-brief-grid">',
      '    <div class="cs-brief-field">',
      '      <label>Time / period</label>',
      '      <input id="cs-brief-block-time" type="text" value="' + escapeHtml(_selection.blockTime) + '" placeholder="8:15-9:00 or Block A">',
      "    </div>",
      '    <div class="cs-brief-field">',
      '      <label>Block name</label>',
      '      <input id="cs-brief-block-label" type="text" value="' + escapeHtml(_selection.blockLabel) + '" placeholder="Grade 7 EL push-in">',
      "    </div>",
      '    <div class="cs-brief-field">',
      '      <label>Support type</label>',
      '      <select id="cs-brief-support-type">' + SUPPORT_TYPES.map(function (row) { return renderOption(row.id, row.label, row.id === _selection.supportType); }).join("") + "</select>",
      "    </div>",
      '    <div class="cs-brief-field">',
      '      <label>Focus area</label>',
      '      <select id="cs-brief-area">' + AREAS.map(function (row) { return renderOption(row.id, row.label, row.id === _selection.area); }).join("") + "</select>",
      "    </div>",
      '    <div class="cs-brief-field cs-brief-field--full">',
      '      <label>Default program for this block</label>',
      '      <select id="cs-brief-block-program">' + programOptions + "</select>",
      "    </div>",
      "  </div>",
      '  <div class="cs-brief-actions">',
      '    <button class="cs-brief-btn cs-brief-btn--primary" data-brief-save-block="1" type="button">' + (_selection.blockId ? "Update block" : "Add block") + "</button>",
      '    <button class="cs-brief-btn cs-brief-btn--quiet" data-brief-google-calendar-sync="1" type="button">Import Google Calendar</button>',
      '    <button class="cs-brief-btn cs-brief-btn--quiet" data-brief-new-block="1" type="button">New block</button>',
      (_selection.blockId ? '<button class="cs-brief-btn cs-brief-btn--quiet" data-brief-delete-block="' + escapeHtml(_selection.blockId) + '" type="button">Delete block</button>' : ""),
      "  </div>",
      "</section>"
    ].join("\n");
  }

  function renderRosterCard() {
    var block = currentBlock();
    if (!block) {
      return [
        '<section class="cs-brief-card">',
        '  <p class="cs-brief-kicker">Supported roster</p>',
        '  <p class="cs-brief-empty">Pick a block first. Then you can assign the students you support in that time period.</p>',
        "</section>"
      ].join("\n");
    }

    var roster = currentBlockRoster();
    var all = getCaseload();
    var candidateOptions = all.map(function (row) {
      var grade = normalizeGrade(row.grade || row.gradeBand || "");
      var label = String(row.name || row.id || "") + (grade ? " - " + formatGradeLabel(grade) : "");
      return renderOption(String(row.id || ""), label, String(row.id || "") === String(_selection.rosterCandidateId || ""));
    }).join("");

    var chips = roster.length
      ? roster.map(function (row) {
          var active = String(row.id || "") === String(_selection.studentId || "");
          return '<button class="cs-brief-chip' + (active ? " is-active" : "") + '" data-brief-student="' + escapeHtml(String(row.id || "")) + '" type="button">' + escapeHtml(String(row.name || row.id || "")) + "</button>";
        }).join("")
      : '<p class="cs-brief-empty">No students are assigned to this block yet.</p>';

    return [
      '<section class="cs-brief-card">',
      '  <p class="cs-brief-kicker">Supported roster</p>',
      '  <p class="cs-brief-summary">' + escapeHtml((block.timeLabel ? block.timeLabel + " - " : "") + block.label) + "</p>",
      '  <div class="cs-brief-chip-row">' + chips + "</div>",
      '  <div class="cs-brief-grid">',
      '    <div class="cs-brief-field cs-brief-field--full">',
      '      <label>Add student to this block</label>',
      '      <select id="cs-brief-roster-candidate">' + candidateOptions + "</select>",
      "    </div>",
      "  </div>",
      '  <div class="cs-brief-actions">',
      '    <button class="cs-brief-btn cs-brief-btn--primary" data-brief-add-student="1" type="button">Assign to block</button>',
      (_selection.studentId ? '<button class="cs-brief-btn cs-brief-btn--quiet" data-brief-remove-student="' + escapeHtml(_selection.studentId) + '" type="button">Remove selected</button>' : ""),
      "  </div>",
      "</section>"
    ].join("\n");
  }

  function renderSetupCard() {
    var programOptions = programsForArea(_selection.area, _selection.grade).map(function (row) {
      return renderOption(row.id, row.label, row.id === _selection.programId);
    }).join("");
    if (!programOptions) {
      programOptions = PROGRAMS.map(function (row) {
        return renderOption(row.id, row.label, row.id === _selection.programId);
      }).join("");
    }

    var student = currentStudent();
    var contextLine = [
      _selection.studentName || (student && student.name) || "No student selected",
      _selection.blockTime || "",
      _selection.blockLabel || "",
      labelFor(SUPPORT_TYPES, _selection.supportType)
    ].filter(Boolean).join(" • ");

    return [
      '<section class="cs-brief-card">',
      '  <p class="cs-brief-kicker">Lesson setup</p>',
      '  <p class="cs-brief-summary">' + escapeHtml(contextLine || "Set the context for today\'s support.") + "</p>",
      '  <div class="cs-brief-grid">',
      '    <div class="cs-brief-field">',
      '      <label>Grade</label>',
      '      <select id="cs-brief-grade">' + rangeGrades().map(function (grade) { return renderOption(grade, formatGradeLabel(grade), grade === _selection.grade); }).join("") + "</select>",
      "    </div>",
      '    <div class="cs-brief-field">',
      '      <label>Program</label>',
      '      <select id="cs-brief-program">' + programOptions + "</select>",
      "    </div>",
      renderProgramControls(),
      "  </div>",
      "</section>"
    ].join("\n");
  }

  function renderProgramControls() {
    var program = programById(_selection.programId);
    if (!program) return "";

    if (program.type === "fishtank") return renderFishtankControls();
    if (program.type === "el") return renderElControls();
    if (program.type === "illustrative") return renderIllustrativeControls();
    if (program.type === "ufli") {
      return [
        '<div class="cs-brief-field">',
        "  <label>Lesson</label>",
        '  <select id="cs-brief-lesson">' + renderNumberOptions(128, _selection.lesson, "Lesson ") + "</select>",
        "</div>"
      ].join("\n");
    }
    if (program.type === "fundations") {
      var levelOptions = FUNDATIONS_LEVELS.map(function (row) {
        return renderOption(row.id, row.label, row.id === _selection.level);
      }).join("");
      var level = FUNDATIONS_LEVELS.filter(function (row) { return row.id === _selection.level; })[0] || FUNDATIONS_LEVELS[0];
      return [
        '<div class="cs-brief-field">',
        "  <label>Level</label>",
        '  <select id="cs-brief-level">' + levelOptions + "</select>",
        "</div>",
        '<div class="cs-brief-field">',
        "  <label>Unit</label>",
        '  <select id="cs-brief-lesson">' + renderNumberOptions(level.units, _selection.lesson, "Unit ") + "</select>",
        "</div>",
        '<div class="cs-brief-field cs-brief-field--full">',
        "  <label>Lesson / word focus</label>",
        '  <input id="cs-brief-lesson-label" type="text" value="' + escapeHtml(_selection.lessonLabel) + '" placeholder="Optional: trick words, dictation, suffix review">',
        "</div>"
      ].join("\n");
    }
    if (program.type === "just-words") {
      return [
        '<div class="cs-brief-field">',
        "  <label>Unit</label>",
        '  <select id="cs-brief-jw-unit">' + JUST_WORDS_UNITS.map(function (row) { return renderOption(row.id, row.label, row.id === _selection.jwUnitId); }).join("") + "</select>",
        "</div>",
        '<div class="cs-brief-field cs-brief-field--full">',
        "  <label>Lesson / focus note</label>",
        '  <input id="cs-brief-lesson-label" type="text" value="' + escapeHtml(_selection.lessonLabel) + '" placeholder="Optional: lesson, wordlist, dictation, or transfer target">',
        "</div>"
      ].join("\n");
    }
    if (program.type === "haggerty") {
      return [
        '<div class="cs-brief-field">',
        "  <label>Routine</label>",
        '  <select id="cs-brief-haggerty-routine">' + HEGGERTY_ROUTINES.map(function (row) { return renderOption(row.id, row.label, row.id === _selection.haggertyRoutine); }).join("") + "</select>",
        "</div>",
        '<div class="cs-brief-field cs-brief-field--full">',
        "  <label>Lesson / week</label>",
        '  <input id="cs-brief-lesson-label" type="text" value="' + escapeHtml(_selection.lessonLabel) + '" placeholder="Example: Week 3 Day 2">',
        "</div>"
      ].join("\n");
    }
    if (program.type === "bridges") {
      return [
        '<div class="cs-brief-field">',
        "  <label>Component</label>",
        '  <select id="cs-brief-bridges-component">' + BRIDGES_COMPONENTS.map(function (row) { return renderOption(row.id, row.label, row.id === _selection.bridgesComponent); }).join("") + "</select>",
        "</div>",
        '<div class="cs-brief-field cs-brief-field--full">',
        "  <label>Lesson / unit label</label>",
        '  <input id="cs-brief-lesson-label" type="text" value="' + escapeHtml(_selection.lessonLabel) + '" placeholder="Example: Equivalent fractions on a number line">',
        "</div>"
      ].join("\n");
    }
    if (program.type === "step-up") {
      return [
        '<div class="cs-brief-field">',
        "  <label>Writing type</label>",
        '  <select id="cs-brief-stepup-genre">' + STEP_UP_GENRES.map(function (row) { return renderOption(row.id, row.label, row.id === _selection.stepUpGenre); }).join("") + "</select>",
        "</div>",
        '<div class="cs-brief-field">',
        "  <label>Stage</label>",
        '  <select id="cs-brief-stepup-stage">' + STEP_UP_STAGES.map(function (row) { return renderOption(row.id, row.label, row.id === _selection.stepUpStage); }).join("") + "</select>",
        "</div>",
        '<div class="cs-brief-field cs-brief-field--full">',
        "  <label>Task / lesson focus</label>",
        '  <input id="cs-brief-lesson-label" type="text" value="' + escapeHtml(_selection.lessonLabel) + '" placeholder="Example: short response using evidence">',
        "</div>"
      ].join("\n");
    }
    if (program.type === "humanities") {
      return [
        '<div class="cs-brief-field">',
        "  <label>Course</label>",
        '  <input id="cs-brief-custom-course" type="text" value="' + escapeHtml(_selection.customCourse) + '" placeholder="Example: Humanities 9">',
        "</div>",
        '<div class="cs-brief-field">',
        "  <label>Unit / text</label>",
        '  <input id="cs-brief-custom-unit" type="text" value="' + escapeHtml(_selection.customUnit) + '" placeholder="Example: Migration narratives">',
        "</div>",
        '<div class="cs-brief-field">',
        "  <label>Anchor text / source</label>",
        '  <input id="cs-brief-custom-text" type="text" value="' + escapeHtml(_selection.customText) + '" placeholder="Optional">',
        "</div>",
        '<div class="cs-brief-field">',
        "  <label>Today\'s lesson</label>",
        '  <input id="cs-brief-lesson-label" type="text" value="' + escapeHtml(_selection.lessonLabel) + '" placeholder="Example: annotate claim and evidence">',
        "</div>"
      ].join("\n");
    }
    return "";
  }

  function renderFishtankControls() {
    var units = getFishtankUnitsForGrade(_selection.grade);
    return [
      '<div class="cs-brief-field">',
      "  <label>Unit</label>",
      '  <select id="cs-brief-unit">' + units.map(function (row) { return renderOption(row.id, row.title || row.id, row.id === _selection.unitId); }).join("") + "</select>",
      "</div>",
      '<div class="cs-brief-field">',
      "  <label>Lesson</label>",
      '  <select id="cs-brief-lesson">' + renderNumberOptions(Number(findFishtankUnit(_selection.unitId) && findFishtankUnit(_selection.unitId).lessonCount || 1), _selection.lesson, "Lesson ") + "</select>",
      "</div>"
    ].join("\n");
  }

  function renderElControls() {
    var modules = getElModulesForGrade(_selection.grade);
    var module = findElModule(_selection.grade, _selection.moduleId);
    var units = module && Array.isArray(module.units) ? module.units : [];
    return [
      '<div class="cs-brief-field">',
      "  <label>Module</label>",
      '  <select id="cs-brief-module">' + modules.map(function (row) { return renderOption(row.id, row.title || row.id, row.id === _selection.moduleId); }).join("") + "</select>",
      "</div>",
      '<div class="cs-brief-field">',
      "  <label>Unit</label>",
      '  <select id="cs-brief-module-unit">' + units.map(function (row) { return renderOption(row.id, row.title || row.id, row.id === _selection.moduleUnitId); }).join("") + "</select>",
      "</div>"
    ].join("\n");
  }

  function renderIllustrativeControls() {
    return [
      '<div class="cs-brief-field">',
      "  <label>Unit</label>",
      '  <input id="cs-brief-custom-unit" type="text" value="' + escapeHtml(_selection.customUnit) + '" placeholder="Example: Unit 2">',
      "</div>",
      '<div class="cs-brief-field">',
      "  <label>Lesson</label>",
      '  <input id="cs-brief-lesson-label" type="text" value="' + escapeHtml(_selection.lessonLabel) + '" placeholder="Example: Lesson 7">',
      "</div>"
    ].join("\n");
  }

  function renderBriefCard(brief) {
    var noteKey = noteKeyForBrief(brief);
    var noteText = getNoteForKey(noteKey);
    var saved = !!loadDailySelection(_selection.studentId, _selection.blockId);
    return [
      '<section class="cs-brief-card">',
      '  <p class="cs-brief-kicker">' + escapeHtml(brief.curriculumLabel) + "</p>",
      '  <h3 class="cs-brief-card-title">' + escapeHtml(brief.title) + "</h3>",
      (brief.contextLine ? '<p class="cs-brief-summary">' + escapeHtml(brief.contextLine) + "</p>" : ""),
      '  <span class="cs-brief-phase">' + escapeHtml(brief.phaseLabel) + "</span>",
      '  <div class="cs-brief-section">',
      '    <h4 class="cs-brief-section-title">60-second brief</h4>',
      '    <p class="cs-brief-copy">' + escapeHtml(brief.summary) + "</p>",
      "  </div>",
      '  <div class="cs-brief-grid">',
      '    <div class="cs-brief-field">',
      "      <label>Main concept</label>",
      '      <p class="cs-brief-copy">' + escapeHtml(brief.mainConcept) + "</p>",
      "    </div>",
      '    <div class="cs-brief-field">',
      "      <label>Worked example</label>",
      '      <p class="cs-brief-copy">' + escapeHtml(brief.workedExample) + "</p>",
      "    </div>",
      renderResourceLinks(brief.resourceLinks),
      '    <div class="cs-brief-field">',
      "      <label>Likely confusions</label>",
      renderList(brief.likelyConfusions),
      "    </div>",
      '    <div class="cs-brief-field">',
      "      <label>Fast support moves</label>",
      renderList(brief.supportMoves),
      "    </div>",
      '    <div class="cs-brief-field">',
      "      <label>What to look for</label>",
      renderList(brief.lookFors),
      "    </div>",
      (brief.progressDataNote ? [
        '    <div class="cs-brief-field cs-brief-field--full">',
        "      <label>Progress data note</label>",
        '      <p class="cs-brief-copy">' + escapeHtml(brief.progressDataNote) + "</p>",
        "    </div>"
      ].join("\n") : ""),
      '    <div class="cs-brief-field">',
      "      <label>Useful prompts</label>",
      renderList(brief.prompts),
      "    </div>",
      '    <div class="cs-brief-field cs-brief-field--full">',
      "      <label>Local classroom note</label>",
      '      <textarea id="cs-brief-note" data-brief-key="' + escapeHtml(noteKey) + '" placeholder="Add a note for this block or student.">' + escapeHtml(noteText) + "</textarea>",
      '      <p class="cs-brief-note-meta">' + (saved ? "Saved for today." : "Save this context once you have the right lesson.") + "</p>",
      "    </div>",
      "  </div>",
      '  <div class="cs-brief-actions">',
      '    <button class="cs-brief-btn cs-brief-btn--primary" data-brief-save-context="' + escapeHtml(brief.key) + '" type="button">Save today\'s context</button>',
      '    <button class="cs-brief-btn cs-brief-btn--quiet" data-brief-copy="' + escapeHtml(brief.key) + '" type="button">Copy briefing</button>',
      '    <button class="cs-brief-btn cs-brief-btn--quiet" data-brief-save-note="' + escapeHtml(noteKey) + '" type="button">Save note</button>',
      "  </div>",
      "</section>"
    ].join("\n");
  }

  function googleWorkspaceModule() {
    return root.CSGoogleWorkspace || null;
  }

  function googleWorkspaceReady() {
    var api = googleWorkspaceModule();
    return !!(api && api.isConfigured && api.isConfigured());
  }

  function googleSignedIn() {
    var api = googleWorkspaceModule();
    return !!(api && api.isSignedIn && api.isSignedIn());
  }

  function currentProgramLabel() {
    var program = programById(_selection.programId);
    return program ? program.label : "";
  }

  function currentBlockProgramLabel() {
    var block = currentBlock();
    if (block) {
      if (block.curriculum) return String(block.curriculum);
      if (block.programId) {
        var blockProgram = programById(block.programId);
        if (blockProgram && blockProgram.label) return blockProgram.label;
      }
    }
    return currentProgramLabel();
  }

  function currentGoogleQuery(brief) {
    var bits = [];
    var seen = {};

    function pushBit(value) {
      var text = String(value || "").trim();
      var key = text.toLowerCase();
      if (!text || seen[key]) return;
      seen[key] = true;
      bits.push(text);
    }

    pushBit(_selection.studentName);
    pushBit(brief && brief.title || _selection.lessonLabel);
    pushBit(_selection.customUnit);
    pushBit(_selection.blockLabel);
    pushBit(currentBlockProgramLabel());
    return bits.join(" ").trim() || "lesson support";
  }

  function googleWorkspaceRecommendation(brief) {
    var supportTypeLabel = labelFor(SUPPORT_TYPES, _selection.supportType) || "support";
    var studentName = _selection.studentName || "the selected student";
    var title = brief && brief.title || _selection.lessonLabel || "today's lesson";
    var blockLabel = _selection.blockLabel || "today's block";
    var primaryAction = "Create a planning doc for " + blockLabel + " so notes, lesson moves, and follow-up stay together.";
    if (_selection.supportType === "pullout") {
      primaryAction = "Create a progress tracker for " + studentName + " so you can log the pullout move, evidence, and next step in one place.";
    } else if (_selection.area === "writing" || _selection.area === "humanities") {
      primaryAction = "Open the lesson deck or notes for " + title + " before class so prompts and support language stay aligned.";
    }
    return {
      contextLine: [studentName, blockLabel, supportTypeLabel, currentBlockProgramLabel()].filter(Boolean).join(" • "),
      nextMove: primaryAction
    };
  }

  function renderLinkList(items, kind) {
    if (!Array.isArray(items) || !items.length) return '<p class="cs-brief-empty">No ' + escapeHtml(kind) + " results loaded yet.</p>";
    return '<div class="cs-brief-link-list">' + items.map(function (item) {
      var meta = [];
      if (item.channel) meta.push(item.channel);
      if (item.mimeType) meta.push(String(item.mimeType).split(".").pop());
      if (item.modifiedTime) meta.push(new Date(item.modifiedTime).toLocaleDateString());
      return [
        '<a class="cs-brief-link-item" href="' + escapeHtml(item.url || item.webViewLink || "#") + '" target="_blank" rel="noopener">',
        '  <strong>' + escapeHtml(item.title || item.name || kind) + "</strong>",
        (meta.length ? '  <span>' + escapeHtml(meta.join(" - ")) + "</span>" : ""),
        "</a>"
      ].join("");
    }).join("") + "</div>";
  }

  function renderGoogleWorkspaceCard(brief) {
    var configured = googleWorkspaceReady();
    var signedIn = googleSignedIn();
    var query = currentGoogleQuery(brief);
    var recommendation = googleWorkspaceRecommendation(brief);
    var lastCreated = _googleState.lastCreated
      ? '<a class="cs-brief-inline-link" href="' + escapeHtml(_googleState.lastCreated.url) + '" target="_blank" rel="noopener">Open latest: ' + escapeHtml(_googleState.lastCreated.label) + "</a>"
      : "";
    var stateLine = configured
      ? (signedIn ? "Connected. Continue today's support work into Google without rebuilding the context." : "Google is configured. Sign in to continue today's support work into Calendar and Drive.")
      : "Add your Google client details in js/google-auth-config.js to enable Calendar, Drive, Docs, Sheets, Slides, and YouTube.";
    return [
      '<section class="cs-brief-card">',
      '  <p class="cs-brief-kicker">Google Workspace</p>',
      '  <p class="cs-brief-summary">' + escapeHtml(stateLine) + "</p>",
      '  <div class="cs-brief-google-next"><span>Best next move</span><strong>' + escapeHtml(recommendation.nextMove) + '</strong><p>' + escapeHtml(recommendation.contextLine || "Pick a block and student to tighten the recommendation.") + "</p></div>",
      (_googleState.status ? '  <p class="cs-brief-status">' + escapeHtml(_googleState.status) + "</p>" : ""),
      (lastCreated ? '  <p class="cs-brief-status">' + lastCreated + "</p>" : ""),
      '  <div class="cs-brief-actions">',
      (configured && !signedIn ? '    <button class="cs-brief-btn cs-brief-btn--primary" data-brief-google-connect="1" type="button">Sign in with Google</button>' : ""),
      '    <button class="cs-brief-btn cs-brief-btn--quiet" data-brief-google-calendar-sync="1" type="button">Sync today\'s blocks</button>',
      '    <button class="cs-brief-btn cs-brief-btn--quiet" data-brief-google-calendar-open="1" type="button">Open Calendar</button>',
      '    <button class="cs-brief-btn cs-brief-btn--quiet" data-brief-google-doc="1" type="button">Create planning doc</button>',
      '    <button class="cs-brief-btn cs-brief-btn--quiet" data-brief-google-sheet="1" type="button">Create progress sheet</button>',
      '    <button class="cs-brief-btn cs-brief-btn--quiet" data-brief-google-slide="1" type="button">Create lesson slides</button>',
      '    <button class="cs-brief-btn cs-brief-btn--quiet" data-brief-google-drive="1" type="button">Find related Drive files</button>',
      '    <button class="cs-brief-btn cs-brief-btn--quiet" data-brief-google-youtube="1" type="button">Find YouTube support</button>',
      "  </div>",
      '  <div class="cs-brief-grid">',
      '    <div class="cs-brief-field cs-brief-field--full">',
      "      <label>Current block context</label>",
      '      <p class="cs-brief-copy">' + escapeHtml(recommendation.contextLine || "No block context selected yet.") + "</p>",
      "    </div>",
      '    <div class="cs-brief-field cs-brief-field--full">',
      "      <label>Current query</label>",
      '      <p class="cs-brief-copy">' + escapeHtml(query) + "</p>",
      "    </div>",
      '    <div class="cs-brief-field cs-brief-field--full">',
      "      <label>Drive results</label>",
      renderLinkList(_googleState.driveResults, "Drive"),
      "    </div>",
      '    <div class="cs-brief-field cs-brief-field--full">',
      "      <label>YouTube supports</label>",
      renderLinkList(_googleState.youtubeResults, "YouTube"),
      "    </div>",
      "  </div>",
      "</section>"
    ].join("\n");
  }

  function renderOption(value, label, selected) {
    return '<option value="' + escapeHtml(value) + '"' + (selected ? " selected" : "") + ">" + escapeHtml(label) + "</option>";
  }

  function renderNumberOptions(total, selectedValue, prefix) {
    var out = [];
    var i;
    for (i = 1; i <= Math.max(1, total); i++) {
      out.push(renderOption(String(i), String(prefix || "") + i, String(i) === String(selectedValue || "1")));
    }
    return out.join("");
  }

  function renderList(items) {
    if (!Array.isArray(items) || !items.length) return '<p class="cs-brief-empty">No items yet.</p>';
    return '<ul class="cs-brief-list">' + items.map(function (item) {
      return "<li>" + escapeHtml(item) + "</li>";
    }).join("") + "</ul>";
  }

  function renderResourceLinks(items) {
    var seen = {};
    var links = (items || []).filter(function (item) {
      var href = String(item && item.href || "").trim();
      if (!href || seen[href]) return false;
      seen[href] = true;
      return true;
    });
    if (!links.length) return "";
    return [
      '    <div class="cs-brief-field cs-brief-field--full">',
      "      <label>Bigger picture</label>",
      '      <div class="cs-brief-link-list">' + links.map(function (item) {
        return '<a class="cs-brief-link-item" href="' + escapeHtml(item.href) + '" target="_blank" rel="noopener"><strong>' + escapeHtml(item.label || "Open resource") + "</strong>" + (item.meta ? "<span>" + escapeHtml(item.meta) + "</span>" : "") + "</a>";
      }).join("") + "</div>",
      "    </div>"
    ].join("\n");
  }

  function renderWithTips(base, programId) {
    var meta = _curriculumMeta[programId] || null;
    var tips = meta && Array.isArray(meta.quickTips) ? meta.quickTips.slice(0, 2) : [];
    return dedupeList((base || []).concat(tips));
  }

  function dedupeList(items) {
    var seen = {};
    return (items || []).filter(function (item) {
      var key = String(item || "").trim();
      if (!key || seen[key]) return false;
      seen[key] = true;
      return true;
    });
  }

  function contextLine() {
    var bits = [];
    if (_selection.studentName) bits.push(_selection.studentName);
    if (_selection.blockTime) bits.push(_selection.blockTime);
    if (_selection.blockLabel) bits.push(_selection.blockLabel);
    if (_selection.supportType) bits.push(labelFor(SUPPORT_TYPES, _selection.supportType));
    return bits.join(" • ");
  }

  function parseIllustrativeReference() {
    var block = currentBlock();
    var unitSource = [_selection.customUnit, block && block.lesson, _selection.lessonLabel].filter(Boolean).join(" ");
    var lessonSource = [_selection.lessonLabel, block && block.lesson].filter(Boolean).join(" ");
    var gradeSource = [
      block && block.classSection,
      block && block.lesson,
      _selection.blockLabel,
      _selection.grade
    ].filter(Boolean).join(" ");
    var unitMatch = unitSource.match(/unit\s*(\d+)/i);
    var lessonMatch = lessonSource.match(/lesson\s*(\d+)/i);
    var gradeMatch = gradeSource.match(/grade\s*(k|[1-9]|1[0-2])/i);
    return {
      grade: gradeMatch && gradeMatch[1] ? normalizeGrade(gradeMatch[1]) : normalizeGrade(_selection.grade),
      unit: unitMatch && unitMatch[1] ? String(Number(unitMatch[1])) : "",
      lesson: lessonMatch && lessonMatch[1] ? String(Number(lessonMatch[1])) : ""
    };
  }

  function buildIllustrativeBrief() {
    var reference = parseIllustrativeReference();
    var grade = reference.grade || "4";
    var unit = reference.unit || "";
    var lesson = reference.lesson || "";
    var truthId = grade && unit && lesson ? ["im", "g" + String(grade).toLowerCase(), "u" + unit, "l" + lesson].join("-") : "";
    var entry = truthId && CurriculumTruth && typeof CurriculumTruth.cloneEntry === "function"
      ? CurriculumTruth.cloneEntry(truthId)
      : null;
    var program = CurriculumTruth && typeof CurriculumTruth.cloneProgram === "function"
      ? CurriculumTruth.cloneProgram("illustrative-math")
      : null;
    var gradeMap = program && program.gradeMap ? program.gradeMap[String(grade)] : null;
    var unitMeta = Array.isArray(gradeMap)
      ? gradeMap.filter(function (row) { return String(row.unit || "") === String(unit || ""); })[0] || null
      : null;
    var resourceLinks = [];
    if (entry && entry.sourceUrl) resourceLinks.push({ label: "Open lesson overview", href: entry.sourceUrl, meta: "Illustrative lesson context" });
    if (program && program.sourceUrl) resourceLinks.push({ label: "Open K-5 scope and sequence", href: program.sourceUrl, meta: "Illustrative curriculum overview" });
    var titleBits = [];
    if (grade) titleBits.push(formatGradeLabel(grade));
    if (unit) titleBits.push("Unit " + unit);
    if (lesson) titleBits.push("Lesson " + lesson);
    return {
      key: ["illustrative", grade || "g", unit || "u", lesson || "l"].join(":"),
      curriculumLabel: "Illustrative Math",
      title: titleBits.join(" - ") || "Illustrative Math",
      contextLine: contextLine(),
      phaseLabel: "Lesson briefing",
      summary: entry && entry.officialFocus
        ? entry.officialFocus
        : unitMeta && unitMeta.focus
          ? "Stay aligned to the active Illustrative Math pathway: " + unitMeta.focus + "."
          : "Use the current Illustrative Math lesson goal, visual model, and cool-down together.",
      mainConcept: entry && entry.assessmentDetail
        ? entry.assessmentDetail
        : unitMeta && unitMeta.focus
          ? "The main concept in this unit is " + unitMeta.focus + "."
          : "Students should show the quantity or relationship first, then explain the math language.",
      workedExample: entry && entry.supportMove
        ? entry.supportMove
        : "Model one example with a visual representation before asking for independent explanation.",
      likelyConfusions: [
        "Naming an answer without showing the model or quantity first.",
        "Using the right representation but not explaining what it proves.",
        "Switching procedures before the relationship in the problem is clear."
      ],
      supportMoves: dedupeList([
        entry && entry.supportMove,
        "Keep the class representation visible while the student explains the relationship.",
        "Ask the student to point to the equal amount, part, or comparison before naming it."
      ]),
      progressDataNote: progressDataLine(entry, program),
      resourceLinks: resourceLinks,
      lookFors: dedupeList([
        entry && entry.progressMonitoring,
        "Student matches the model to the mathematical idea with one prompt or less.",
        "Student uses lesson language to explain why the representation works."
      ]),
      prompts: [
        "What in the model shows your answer is true?",
        "Which two quantities match here, and how do you know?",
        "Can you explain the relationship before you compute?"
      ],
      recentLabel: ((_selection.studentName || "Planning") + " - Illustrative Math " + (lesson ? "L" + lesson : "brief"))
    };
  }

  function buildFishtankBrief(unit, lessonNumber) {
    if (!unit || !_data || !_data.fishtank || !_data.fishtank.domains) return null;
    var domain = String(unit.domain || "narrative");
    var domainNode = _data.fishtank.domains[domain] || _data.fishtank.domains.narrative;
    var lessonCount = Number(unit.lessonCount || 1);
    var lesson = Number(lessonNumber || 1);
    var phaseKey = lesson <= Math.max(2, Math.ceil(lessonCount * 0.3)) ? "launch" : lesson >= Math.max(3, Math.ceil(lessonCount * 0.76)) ? "synthesize" : "build";
    var phaseNode = domainNode[phaseKey] || domainNode.build;
    var skills = Array.isArray(unit.keySkills) && unit.keySkills.length ? unit.keySkills : ["text evidence", "academic discussion"];
    var tokens = {
      unitTitle: unit.title || "this unit",
      anchor: unit.anchor || "the anchor theme",
      skill1: skills[0] || "text evidence",
      skill2: skills[1] || skills[0] || "discussion",
      textReference: unit.coreText || unit.title || "the anchor text"
    };

    function replace(template) {
      return String(template || "").replace(/\{([a-zA-Z0-9]+)\}/g, function (_match, key) {
        return tokens[key] == null ? "" : String(tokens[key]);
      });
    }

    return {
      key: ["fishtank", unit.id, lesson].join(":"),
      curriculumLabel: "Fishtank ELA",
      title: formatGradeLabel(normalizeGrade(unit.grade)) + " - " + (unit.title || "Fishtank unit") + " - Lesson " + lesson,
      contextLine: contextLine(),
      phaseLabel: phaseNode.phaseLabel || "Lesson briefing",
      summary: replace(phaseNode.summaryTemplate),
      mainConcept: replace(phaseNode.coreConceptTemplate),
      workedExample: replace(phaseNode.workedExampleTemplate),
      likelyConfusions: Array.isArray(domainNode.likelyConfusions) ? domainNode.likelyConfusions.slice() : [],
      supportMoves: renderWithTips(Array.isArray(domainNode.supportMoves) ? domainNode.supportMoves.slice() : [], "fishtank-ela"),
      progressDataNote: progressDataLine(null, truthProgram("fishtank-ela")),
      resourceLinks: [
        { label: "Open grade sequence", href: buildFishtankGradeLink(unit), meta: "Fishtank grade overview" },
        { label: "Open curriculum overview", href: "https://www.fishtanklearning.org/curriculum/ela/", meta: "Fishtank ELA overview" }
      ],
      lookFors: Array.isArray(domainNode.lookFors) ? domainNode.lookFors.slice() : [],
      prompts: Array.isArray(domainNode.prompts) ? domainNode.prompts.slice() : [],
      recentLabel: ((_selection.studentName || "Planning") + " - " + (unit.title || "Fishtank") + " L" + lesson)
    };
  }

  function buildElBrief(unit, module, grade) {
    if (!unit) return null;
    var entry = truth(grade === "6" ? "el-g6-current" : grade === "7" ? "el-g7-current" : grade === "8" ? "el-g8-current" : "");
    var links = buildElModuleLinks(grade, module, unit);
    return {
      key: ["el", grade, module && module.id, unit.id].join(":"),
      curriculumLabel: "EL Education ELA",
      title: formatGradeLabel(grade) + " - " + (unit.title || "EL unit"),
      contextLine: contextLine(),
      phaseLabel: "Unit briefing",
      summary: entry && entry.officialFocus ? entry.officialFocus : String(unit.summary || ""),
      mainConcept: entry && entry.assessmentDetail ? entry.assessmentDetail : String(unit.mainConcept || ""),
      workedExample: String(unit.workedExample || ""),
      likelyConfusions: Array.isArray(unit.likelyConfusions) ? unit.likelyConfusions.slice() : [],
      supportMoves: dedupeList((entry && entry.supportMove ? [entry.supportMove] : []).concat(unit.supportMoves ? unit.supportMoves.slice() : [])),
      progressDataNote: progressDataLine(entry, truthProgram("el-education")),
      resourceLinks: [
        { label: "Open module overview", href: links.moduleHref, meta: "EL module overview" },
        { label: "Open current unit", href: links.unitHref, meta: "EL unit overview" }
      ],
      lookFors: unit.lookFors ? unit.lookFors.slice() : [],
      prompts: unit.prompts ? unit.prompts.slice() : [],
      recentLabel: ((_selection.studentName || "Planning") + " - " + (unit.title || "EL unit"))
    };
  }

  function buildUfliBrief() {
    var entry = truth("ufli-current");
    return {
      key: ["ufli", _selection.lesson].join(":"),
      curriculumLabel: "UFLI Foundations",
      title: "UFLI Lesson " + _selection.lesson,
      contextLine: contextLine(),
      phaseLabel: "Current lesson",
      summary: entry && entry.officialFocus ? entry.officialFocus : "Keep the UFLI routine tight and cumulative: review, model, blend, spell, read, and transfer.",
      mainConcept: entry && entry.assessmentDetail ? entry.assessmentDetail : "Students need accuracy at the sound-pattern level before speed or independence.",
      workedExample: "Pick one target word, say each sound, blend it, spell it, then reread it in a short phrase or sentence.",
      likelyConfusions: [
        "Guessing from the whole word shape instead of mapping sounds.",
        "Dropping the new pattern when reading connected text.",
        "Moving too fast and skipping cumulative review."
      ],
      supportMoves: renderWithTips((entry && entry.supportMove ? [entry.supportMove] : []).concat([
        "Keep the UFLI routine in the same order every time.",
        "Correct at the sound or pattern level, then have the student reread immediately.",
        "Use one short transfer sentence before moving on."
      ]), "ufli"),
      progressDataNote: progressDataLine(entry, truthProgram("ufli-foundations")),
      resourceLinks: [{ label: "Open UFLI Foundations overview", href: "https://ufli.education.ufl.edu/foundations/", meta: "Program overview" }],
      lookFors: [
        "Student reads with sound-by-sound accuracy first.",
        "Student can spell the target pattern, not just read it.",
        "Student carries the pattern into a second example."
      ],
      prompts: [
        "Which sound or chunk do you know first?",
        "Can you tap it, blend it, then reread it smoothly?",
        "Where do you see the same pattern in the next word?"
      ],
      recentLabel: ((_selection.studentName || "Planning") + " - UFLI L" + _selection.lesson)
    };
  }

  function buildFundationsBrief() {
    var entry = _selection.level === "2" && String(_selection.lesson || "") === "8"
      ? truth("fundations-l2-u8")
      : truth("fundations-k-current");
    return {
      key: ["fundations", _selection.level, _selection.lesson].join(":"),
      curriculumLabel: "Fundations",
      title: "Fundations " + labelFor(FUNDATIONS_LEVELS, _selection.level) + " - Unit " + _selection.lesson,
      contextLine: contextLine(),
      phaseLabel: "Structured literacy",
      summary: truthLines(entry, "Use the current Fundations unit for explicit decoding, encoding, and connected-text transfer."),
      mainConcept: entry && entry.progressMonitoring ? entry.progressMonitoring : "Students need to connect sounds, letters, marking, and spelling in the same routine so the pattern becomes stable.",
      workedExample: "Tap the sounds in one word, mark the pattern, read it, spell it, and use it in a short dictated sentence.",
      likelyConfusions: [
        "Skipping the sound routine and jumping to the whole word.",
        "Remembering the pattern in isolation but losing it in dictation.",
        "Mixing known and new trick words."
      ],
      supportMoves: renderWithTips((entry && entry.supportMove ? [entry.supportMove] : []).concat([
        "Use the same oral routine the classroom teacher uses.",
        "Keep modeling brief, then get the student producing the response.",
        "Return to one previously taught pattern before introducing the new part."
      ]), "fundations"),
      progressDataNote: progressDataLine(entry, truthProgram("fundations")),
      resourceLinks: [{ label: "Open Fundations overview", href: "https://www.wilsonlanguage.com/programs/fundations/", meta: "Program overview" }],
      lookFors: [
        "Student can tap, read, and spell the target pattern.",
        "Student marks or explains the pattern accurately enough to show understanding.",
        "Student transfers the pattern into a second word or sentence."
      ],
      prompts: [
        "What pattern do you notice in this word?",
        "Can you tap it, read it, then write it?",
        "Where is the tricky part we need to remember?"
      ],
      recentLabel: ((_selection.studentName || "Planning") + " - Fundations L" + _selection.level + "U" + _selection.lesson)
    };
  }

  function buildJustWordsBrief() {
    var unit = JUST_WORDS_UNITS.filter(function (row) { return row.id === _selection.jwUnitId; })[0] || JUST_WORDS_UNITS[0];
    var entry = truth("justwords-current");
    return {
      key: ["just-words", unit.id].join(":"),
      curriculumLabel: "Just Words",
      title: unit.label,
      contextLine: contextLine(),
      phaseLabel: "Word study intervention",
      summary: entry && entry.officialFocus ? entry.officialFocus : "Keep Just Words fast, explicit, and closely tied to reading and spelling transfer.",
      mainConcept: entry && entry.assessmentDetail ? entry.assessmentDetail : "Older students need direct word analysis plus immediate application in connected text, not isolated drills only.",
      workedExample: "Take one multisyllabic word or morpheme pattern, mark the chunks, read it, spell it, then use it in a phrase or short sentence.",
      likelyConfusions: [
        "Reading the word once without analyzing the meaningful chunks.",
        "Knowing the pattern in word study but not applying it while reading text.",
        "Confusing a prefix or suffix label with its function in the word."
      ],
      supportMoves: renderWithTips((entry && entry.supportMove ? [entry.supportMove] : []).concat([
        "Keep the target set small and cumulative.",
        "Ask the student to explain which chunk helped unlock the word.",
        "Finish with a quick transfer read or write."
      ]), "just-words"),
      progressDataNote: progressDataLine(entry, truthProgram("just-words")),
      resourceLinks: [{ label: "Open Just Words overview", href: "https://www.wilsonlanguage.com/programs/just-words/", meta: "Program overview" }],
      lookFors: [
        "Student identifies the relevant chunk or morpheme.",
        "Student can read and spell the word family more accurately.",
        "Student applies the pattern in a new example."
      ],
      prompts: [
        "Which part of the word gives you the best clue first?",
        "How does this chunk affect pronunciation or meaning?",
        "Can you use the same pattern in one more word?"
      ],
      recentLabel: ((_selection.studentName || "Planning") + " - " + unit.label)
    };
  }

  function buildHaggertyBrief() {
    var routine = HEGGERTY_ROUTINES.filter(function (row) { return row.id === _selection.haggertyRoutine; })[0] || HEGGERTY_ROUTINES[0];
    return {
      key: ["haggerty", routine.id, _selection.lessonLabel || ""].join(":"),
      curriculumLabel: "Heggerty / Haggerty PA",
      title: "Heggerty routine - " + routine.label,
      contextLine: contextLine(),
      phaseLabel: "Oral phonemic awareness",
      summary: "This routine is targeting " + routine.focus + ". Keep it oral, brisk, and highly responsive to student errors.",
      mainConcept: "Heggerty is about hearing and manipulating sounds before print gets added, so the support job is precision and pace.",
      workedExample: "Say the word, pause, and have the student say the sounds or manipulate one sound before repeating the full word.",
      likelyConfusions: [
        "Adding print too early instead of staying oral.",
        "Collapsing sounds together when segmenting.",
        "Needing more wait time when sounds are added, deleted, or substituted."
      ],
      supportMoves: renderWithTips([
        "Keep the response window short but fair.",
        "Repeat the task with cleaner articulation instead of overexplaining.",
        "Return to one easier item before retrying the harder manipulation."
      ], "haggerty"),
      lookFors: [
        "Student can hear each phoneme clearly enough to respond accurately.",
        "Student improves with one immediate redo.",
        "Student keeps the full word stable after manipulating one sound."
      ],
      prompts: [
        "Say the word. Now say each sound.",
        "Say it again without the first sound.",
        "Change the first sound. What is the new word?"
      ],
      recentLabel: ((_selection.studentName || "Planning") + " - Heggerty " + routine.label)
    };
  }

  function buildBridgesBrief() {
    var component = BRIDGES_COMPONENTS.filter(function (row) { return row.id === _selection.bridgesComponent; })[0] || BRIDGES_COMPONENTS[0];
    return {
      key: ["bridges", _selection.bridgesComponent, _selection.lessonLabel || ""].join(":"),
      curriculumLabel: "Bridges Math",
      title: component.label + (_selection.lessonLabel ? " - " + _selection.lessonLabel : ""),
      contextLine: contextLine(),
      phaseLabel: component.phaseLabel,
      summary: component.summary,
      mainConcept: component.mainConcept,
      workedExample: component.workedExample,
      likelyConfusions: component.confusions.slice(),
      supportMoves: renderWithTips(component.moves.slice(), "bridges-math"),
      progressDataNote: progressDataLine(null, truthProgram("bridges-intervention")),
      resourceLinks: [{ label: "Open Bridges Intervention overview", href: "https://www.mathlearningcenter.org/curriculum/bridges-intervention", meta: "Program overview" }],
      lookFors: component.lookFors.slice(),
      prompts: component.prompts.slice(),
      recentLabel: ((_selection.studentName || "Planning") + " - Bridges " + component.label)
    };
  }

  function buildStepUpBrief() {
    var genre = STEP_UP_GENRES.filter(function (row) { return row.id === _selection.stepUpGenre; })[0] || STEP_UP_GENRES[0];
    var stage = STEP_UP_STAGES.filter(function (row) { return row.id === _selection.stepUpStage; })[0] || STEP_UP_STAGES[0];
    return {
      key: ["step-up", genre.id, stage.id, _selection.lessonLabel || ""].join(":"),
      curriculumLabel: "Step Up to Writing",
      title: genre.label + " - " + stage.label,
      contextLine: contextLine(),
      phaseLabel: "Writing support",
      summary: "This writing block is centered on " + genre.label.toLowerCase() + " work during the " + stage.label.toLowerCase() + " stage.",
      mainConcept: stage.concept,
      workedExample: "Take one paragraph or sentence set and ask the student to name the color-coded job of each part before revising the writing itself.",
      likelyConfusions: [
        "Adding sentences without a clear structure.",
        "Confusing elaboration with repetition.",
        "Using transitions that do not match the relationship between ideas."
      ],
      supportMoves: [
        "Anchor the student in one organizer row or one paragraph at a time.",
        "Ask what each sentence is doing before asking whether it sounds good.",
        "Use one sentence frame or color cue to tighten structure quickly."
      ],
      lookFors: [
        "Student can name the role of a sentence or paragraph.",
        "Student organizes evidence or details more clearly after one prompt.",
        "Student revises with purpose instead of just adding length."
      ],
      prompts: [
        "What job is this sentence doing?",
        "What detail or evidence belongs here?",
        "Which transition best matches the relationship between these ideas?"
      ],
      recentLabel: ((_selection.studentName || "Planning") + " - Step Up " + stage.label)
    };
  }

  function buildHumanitiesBrief() {
    var course = _selection.customCourse || "SAS Humanities 9";
    var unit = _selection.customUnit || "current unit";
    var text = _selection.customText ? " using " + _selection.customText : "";
    var lesson = _selection.lessonLabel || "today's lesson";
    return {
      key: ["humanities-9", course, unit, lesson].join(":"),
      curriculumLabel: "SAS Humanities 9",
      title: course + " - " + lesson,
      contextLine: contextLine(),
      phaseLabel: "Manual humanities briefing",
      summary: "This briefing is anchored to " + unit + text + ". The main support job is helping the student track the central claim, the evidence that matters, and the language needed to discuss it clearly.",
      mainConcept: "Humanities support usually means reducing task load without reducing the intellectual demand: one question, one claim, one piece of evidence at a time.",
      workedExample: "Ask the student to identify the strongest line, image, or idea in the source and explain what it suggests in one clear sentence before expanding.",
      likelyConfusions: [
        "Reading for completion instead of reading for a claim or idea.",
        "Quoting evidence without explaining its significance.",
        "Losing the thread of the discussion or annotation task."
      ],
      supportMoves: [
        "Name the essential question before reading or annotating.",
        "Keep the student on one paragraph, image, or source excerpt at a time.",
        "Use one frame: This matters because it shows ___."
      ],
      resourceLinks: [],
      lookFors: [
        "Student can name the central idea or claim in plain language.",
        "Student connects one piece of evidence to that idea.",
        "Student can speak or write one complete analytical sentence."
      ],
      prompts: [
        "What idea is this source pushing us toward?",
        "Which piece of evidence matters most here?",
        "How would you explain that evidence in one precise sentence?"
      ],
      recentLabel: ((_selection.studentName || "Planning") + " - " + lesson)
    };
  }

  function currentBrief() {
    if (!_data) return null;
    ensureSelectionValid();
    var program = programById(_selection.programId);
    if (!program) return null;
    if (program.type === "illustrative") return buildIllustrativeBrief();
    if (program.type === "fishtank") return buildFishtankBrief(findFishtankUnit(_selection.unitId), _selection.lesson);
    if (program.type === "el") return buildElBrief(findElUnit(_selection.grade, _selection.moduleId, _selection.moduleUnitId), findElModule(_selection.grade, _selection.moduleId), _selection.grade);
    if (program.type === "ufli") return buildUfliBrief();
    if (program.type === "fundations") return buildFundationsBrief();
    if (program.type === "just-words") return buildJustWordsBrief();
    if (program.type === "haggerty") return buildHaggertyBrief();
    if (program.type === "bridges") return buildBridgesBrief();
    if (program.type === "step-up") return buildStepUpBrief();
    if (program.type === "humanities") return buildHumanitiesBrief();
    return null;
  }

  function syncLiveFields() {
    var map = {
      "cs-brief-block-time": "blockTime",
      "cs-brief-block-label": "blockLabel",
      "cs-brief-lesson-label": "lessonLabel",
      "cs-brief-custom-course": "customCourse",
      "cs-brief-custom-unit": "customUnit",
      "cs-brief-custom-text": "customText"
    };
    Object.keys(map).forEach(function (id) {
      var field = el(id);
      if (field) _selection[map[id]] = String(field.value || "");
    });
  }

  function confirmCurrentBrief() {
    syncLiveFields();
    ensureSelectionValid();
    saveSelection();
    saveDailySelection();
    pushRecent();
  }

  function pushRecent() {
    var brief = currentBrief();
    if (!brief) return;
    var next = getRecents().filter(function (item) {
      return item && item.key !== brief.key;
    });
    next.unshift({
      key: brief.key,
      label: brief.recentLabel,
      selection: mergeSelection(defaultSelection(), _selection)
    });
    writeStorage(RECENTS_KEY, next.slice(0, Math.max(1, Number(_data && _data.recentLimit || 6))));
  }

  function loadRecentSelection(key) {
    var recents = getRecents();
    var i;
    for (i = 0; i < recents.length; i++) {
      if (recents[i] && recents[i].key === key && recents[i].selection) {
        _selection = mergeSelection(defaultSelection(), recents[i].selection);
        ensureSelectionValid();
        saveSelection();
        return;
      }
    }
  }

  function saveCurrentNote(key) {
    var field = el("cs-brief-note");
    var map = getNoteMap();
    map[key] = field ? String(field.value || "").trim() : "";
    writeStorage(NOTES_KEY, map);
  }

  function joinLines(items) {
    return Array.isArray(items) && items.length ? items.map(function (item) { return "- " + item; }).join("\n") : "- None yet";
  }

  function fallbackCopy(text) {
    var area = document.createElement("textarea");
    area.value = text;
    document.body.appendChild(area);
    area.select();
    try { document.execCommand("copy"); } catch (_err) {}
    document.body.removeChild(area);
  }

  function copyBriefToClipboard(brief) {
    var note = getNoteForKey(noteKeyForBrief(brief));
    var lines = [
      brief.title,
      brief.contextLine || "",
      "",
      "Summary: " + brief.summary,
      "",
      "Main concept: " + brief.mainConcept,
      "",
      "Worked example: " + brief.workedExample,
      "",
      "Likely confusions:",
      joinLines(brief.likelyConfusions),
      "",
      "Support moves:",
      joinLines(brief.supportMoves),
      "",
      "Look fors:",
      joinLines(brief.lookFors),
      "",
      "Prompts:",
      joinLines(brief.prompts)
    ];
    if (note) lines.push("", "Local note: " + note);
    var text = lines.join("\n");
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).catch(function () {
        fallbackCopy(text);
      });
    } else {
      fallbackCopy(text);
    }
  }

  function notifySelection(brief) {
    var lessonContextId = [_selection.blockId || "no-block", _selection.programId || "no-program", _selection.lessonLabel || brief.title || "lesson"].join(":");
    if (TeacherStorage && typeof TeacherStorage.saveLessonContext === "function") {
      TeacherStorage.saveLessonContext(lessonContextId, {
        blockId: _selection.blockId,
        blockLabel: _selection.blockLabel,
        blockTime: _selection.blockTime,
        supportType: _selection.supportType,
        area: _selection.area,
        programId: _selection.programId,
        curriculum: currentProgramLabel(),
        title: brief.title,
        lesson: _selection.lessonLabel || brief.title || "",
        updatedAt: new Date().toISOString()
      });
    }
    if (TeacherStorage && typeof TeacherStorage.saveClassContext === "function" && _selection.blockId) {
      TeacherStorage.saveClassContext(_selection.blockId, {
        classId: _selection.blockId,
        label: _selection.blockLabel,
        timeLabel: _selection.blockTime,
        supportType: _selection.supportType,
        area: _selection.area,
        programId: _selection.programId,
        curriculum: currentProgramLabel(),
        lesson: _selection.lessonLabel || brief.title || "",
        rosterRefs: currentBlockRoster().map(function (row) { return String(row.id || ""); }),
        updatedAt: new Date().toISOString()
      });
    }
    try {
      root.dispatchEvent(new CustomEvent("cs-lesson-brief-selected", {
        detail: {
          blockId: _selection.blockId,
          blockLabel: _selection.blockLabel,
          blockTime: _selection.blockTime,
          supportType: _selection.supportType,
          studentId: _selection.studentId,
          studentName: _selection.studentName,
          grade: _selection.grade,
          programId: _selection.programId,
          title: brief.title,
          lessonContextId: lessonContextId,
          selection: mergeSelection(defaultSelection(), _selection)
        }
      }));
    } catch (_err) {}
  }

  function saveOrUpdateBlock() {
    syncLiveFields();
    var rows = getBlocks();
    var brief = currentBrief();
    var profile = TeacherStorage && typeof TeacherStorage.loadTeacherProfile === "function"
      ? TeacherStorage.loadTeacherProfile()
      : { name: "" };
    var block = normalizeBlock({
      id: _selection.blockId || "blk-" + Date.now(),
      label: _selection.blockLabel,
      timeLabel: _selection.blockTime,
      supportType: _selection.supportType,
      area: _selection.area,
      programId: _selection.programId,
      subject: _selection.area,
      teacher: profile.name || "",
      curriculum: currentProgramLabel(),
      lesson: _selection.lessonLabel || (brief && brief.title) || "",
      classSection: _selection.blockLabel,
      notes: "",
      studentIds: currentBlock() && currentBlock().studentIds || []
    });
    if (!block.label) return;
    var replaced = false;
    rows = rows.map(function (row) {
      if (row.id === block.id) {
        replaced = true;
        return block;
      }
      return row;
    });
    if (!replaced) rows.push(block);
    saveBlocks(rows);
    _selection.blockId = block.id;
    ensureSelectionValid();
    saveSelection();
    render();
  }

  function deleteBlock(blockId) {
    var rows = getBlocks().filter(function (row) {
      return row.id !== blockId;
    });
    saveBlocks(rows);
    _selection.blockId = "";
    _selection.blockLabel = "";
    _selection.blockTime = "";
    render();
  }

  function selectBlock(blockId) {
    var block = getBlocks().filter(function (row) { return row.id === blockId; })[0] || null;
    if (!block) return;
    _selection.blockId = block.id;
    _selection.blockLabel = block.label;
    _selection.blockTime = block.timeLabel;
    _selection.supportType = block.supportType;
    _selection.area = block.area;
    _selection.programId = block.programId || _selection.programId;
    if (block.studentIds.length && block.studentIds.indexOf(_selection.studentId) < 0) {
      _selection.studentId = block.studentIds[0];
      var student = currentStudent();
      if (student) {
        _selection.studentName = String(student.name || "");
        _selection.grade = normalizeGrade(student.grade || student.gradeBand || "");
      }
    }
    var saved = loadDailySelection(_selection.studentId, block.id);
    if (saved) _selection = mergeSelection(defaultSelection(), saved);
    ensureSelectionValid();
    saveSelection();
    render();
  }

  function assignStudentToBlock() {
    var block = currentBlock();
    if (!block || !_selection.rosterCandidateId) return;
    if (block.studentIds.indexOf(_selection.rosterCandidateId) < 0) block.studentIds.push(_selection.rosterCandidateId);
    saveBlocks(getBlocks().map(function (row) {
      return row.id === block.id ? block : row;
    }));
    _selection.studentId = _selection.rosterCandidateId;
    var student = currentStudent();
    if (student) {
      _selection.studentName = String(student.name || "");
      _selection.grade = normalizeGrade(student.grade || student.gradeBand || "");
    }
    ensureSelectionValid();
    saveSelection();
    render();
  }

  function removeSelectedStudentFromBlock() {
    var block = currentBlock();
    if (!block || !_selection.studentId) return;
    block.studentIds = block.studentIds.filter(function (id) {
      return id !== _selection.studentId;
    });
    saveBlocks(getBlocks().map(function (row) {
      return row.id === block.id ? block : row;
    }));
    _selection.studentId = block.studentIds[0] || "";
    var student = currentStudent();
    _selection.studentName = student ? String(student.name || "") : "";
    _selection.grade = student ? normalizeGrade(student.grade || student.gradeBand || "") : _selection.grade;
    ensureSelectionValid();
    saveSelection();
    render();
  }

  function mergeImportedBlocks(imported) {
    var existing = getBlocks();
    var byKey = {};
    existing.forEach(function (row) {
      byKey[(row.timeLabel + "|" + row.label).toLowerCase()] = row;
    });
    (imported || []).forEach(function (row) {
      var block = normalizeBlock(row);
      var key = (block.timeLabel + "|" + block.label).toLowerCase();
      if (byKey[key]) {
        byKey[key].timeLabel = block.timeLabel;
        byKey[key].label = block.label;
        byKey[key].supportType = block.supportType;
        byKey[key].area = block.area;
        byKey[key].programId = block.programId;
      } else {
        existing.push(block);
        byKey[key] = block;
      }
    });
    saveBlocks(existing);
  }

  function workspaceContext(brief) {
    return {
      studentName: _selection.studentName || "",
      blockLabel: _selection.blockLabel || "",
      title: brief && brief.title || _selection.lessonLabel || "",
      programLabel: currentProgramLabel()
    };
  }

  function openExternal(url) {
    if (!url) return;
    try {
      root.open(url, "_blank", "noopener");
    } catch (_err) {}
  }

  function ensureGoogleConnection() {
    var api = googleWorkspaceModule();
    if (!api) return Promise.reject(new Error("Google Workspace module is unavailable on this page."));
    if (!api.isConfigured || !api.isConfigured()) {
      return Promise.reject(new Error("Google auth is not configured yet. Update js/google-auth-config.js."));
    }
    if (api.isSignedIn && api.isSignedIn()) return Promise.resolve();
    return api.connect().then(function () {
      setGoogleStatus("Connected to Google.");
    });
  }

  function importGoogleCalendarBlocks() {
    var api = googleWorkspaceModule();
    if (!api) return;
    _googleState.busy = true;
    setGoogleStatus("Importing today's calendar blocks...");
    render();
    ensureGoogleConnection()
      .then(function () {
        return api.importCalendarBlocks();
      })
      .then(function (blocks) {
        mergeImportedBlocks(blocks);
        setGoogleStatus(blocks && blocks.length ? ("Imported " + blocks.length + " block(s) from Google Calendar.") : "No calendar events found for today.");
        if (!_selection.blockId) {
          var rows = getBlocks();
          if (rows.length) selectBlock(rows[0].id);
        }
      })
      .catch(function (err) {
        setGoogleStatus(err && err.message ? err.message : "Google Calendar import failed.");
      })
      .finally(function () {
        _googleState.busy = false;
        render();
      });
  }

  function createGoogleFile(kind) {
    var api = googleWorkspaceModule();
    var brief = currentBrief();
    if (!api) return;
    _googleState.busy = true;
    setGoogleStatus("Creating Google " + kind + "...");
    render();
    ensureGoogleConnection()
      .then(function () {
        if (kind === "Doc") return api.createDoc(workspaceContext(brief));
        if (kind === "Sheet") return api.createSheet(workspaceContext(brief));
        return api.createSlideDeck(workspaceContext(brief));
      })
      .then(function (file) {
        var url = file.webViewLink || file.webContentLink || "";
        _googleState.lastCreated = { label: kind, url: url };
        setGoogleStatus(kind + " created in Google Drive.");
        openExternal(url);
      })
      .catch(function (err) {
        setGoogleStatus(err && err.message ? err.message : ("Google " + kind + " creation failed."));
      })
      .finally(function () {
        _googleState.busy = false;
        render();
      });
  }

  function searchGoogleDrive() {
    var api = googleWorkspaceModule();
    var brief = currentBrief();
    if (!api) return;
    _googleState.busy = true;
    setGoogleStatus("Searching Google Drive...");
    render();
    ensureGoogleConnection()
      .then(function () {
        return api.searchDriveFiles(currentGoogleQuery(brief));
      })
      .then(function (files) {
        _googleState.driveResults = (files || []).map(function (file) {
          return {
            name: file.name || "Drive file",
            webViewLink: file.webViewLink || "",
            mimeType: file.mimeType || "",
            modifiedTime: file.modifiedTime || ""
          };
        });
        setGoogleStatus(_googleState.driveResults.length ? ("Loaded " + _googleState.driveResults.length + " Drive file(s).") : "No matching Drive files found.");
      })
      .catch(function (err) {
        setGoogleStatus(err && err.message ? err.message : "Google Drive search failed.");
      })
      .finally(function () {
        _googleState.busy = false;
        render();
      });
  }

  function searchGoogleYouTube() {
    var api = googleWorkspaceModule();
    var brief = currentBrief();
    if (!api) return;
    _googleState.busy = true;
    setGoogleStatus("Searching YouTube supports...");
    render();
    ensureGoogleConnection()
      .then(function () {
        return api.searchYouTube(currentGoogleQuery(brief));
      })
      .then(function (items) {
        _googleState.youtubeResults = items || [];
        setGoogleStatus(_googleState.youtubeResults.length ? ("Loaded " + _googleState.youtubeResults.length + " YouTube support video(s).") : "No matching YouTube supports found.");
      })
      .catch(function (err) {
        setGoogleStatus(err && err.message ? err.message : "YouTube search failed.");
      })
      .finally(function () {
        _googleState.busy = false;
        render();
      });
  }

  function chooseStudent(studentId) {
    var student = findStudent(studentId);
    _selection.studentId = String(studentId || "");
    _selection.studentName = student ? String(student.name || "") : "";
    _selection.grade = student ? normalizeGrade(student.grade || student.gradeBand || "") : _selection.grade;
    var saved = loadDailySelection(_selection.studentId, _selection.blockId);
    if (saved) _selection = mergeSelection(defaultSelection(), saved);
    ensureSelectionValid();
    saveSelection();
    render();
  }

  function handleChange(event) {
    var target = event.target;
    if (!target || !target.id) return;

    if (target.id === "cs-brief-support-type") {
      _selection.supportType = String(target.value || "push-in");
      saveSelection();
      return;
    }
    if (target.id === "cs-brief-area") {
      _selection.area = String(target.value || "ela");
      _selection.programId = suggestedProgram(_selection.area, _selection.grade);
      ensureSelectionValid();
      saveSelection();
      render();
      return;
    }
    if (target.id === "cs-brief-block-program" || target.id === "cs-brief-program") {
      _selection.programId = String(target.value || "");
      ensureSelectionValid();
      saveSelection();
      render();
      return;
    }
    if (target.id === "cs-brief-roster-candidate") {
      _selection.rosterCandidateId = String(target.value || "");
      saveSelection();
      return;
    }
    if (target.id === "cs-brief-grade") {
      _selection.grade = normalizeGrade(target.value);
      _selection.programId = suggestedProgram(_selection.area, _selection.grade) || _selection.programId;
      ensureSelectionValid();
      saveSelection();
      render();
      return;
    }
    if (target.id === "cs-brief-unit") {
      _selection.unitId = String(target.value || "");
      _selection.lesson = "1";
      ensureSelectionValid();
      saveSelection();
      confirmCurrentBrief();
      render();
      return;
    }
    if (target.id === "cs-brief-lesson") {
      _selection.lesson = String(target.value || "1");
      ensureSelectionValid();
      saveSelection();
      confirmCurrentBrief();
      render();
      return;
    }
    if (target.id === "cs-brief-module") {
      _selection.moduleId = String(target.value || "");
      ensureSelectionValid();
      saveSelection();
      confirmCurrentBrief();
      render();
      return;
    }
    if (target.id === "cs-brief-module-unit") {
      _selection.moduleUnitId = String(target.value || "");
      ensureSelectionValid();
      saveSelection();
      confirmCurrentBrief();
      render();
      return;
    }
    if (target.id === "cs-brief-level") {
      _selection.level = String(target.value || "1");
      _selection.lesson = "1";
      ensureSelectionValid();
      saveSelection();
      confirmCurrentBrief();
      render();
      return;
    }
    if (target.id === "cs-brief-jw-unit") {
      _selection.jwUnitId = String(target.value || JUST_WORDS_UNITS[0].id);
      saveSelection();
      confirmCurrentBrief();
      render();
      return;
    }
    if (target.id === "cs-brief-haggerty-routine") {
      _selection.haggertyRoutine = String(target.value || HEGGERTY_ROUTINES[0].id);
      saveSelection();
      confirmCurrentBrief();
      render();
      return;
    }
    if (target.id === "cs-brief-bridges-component") {
      _selection.bridgesComponent = String(target.value || BRIDGES_COMPONENTS[0].id);
      saveSelection();
      confirmCurrentBrief();
      render();
      return;
    }
    if (target.id === "cs-brief-stepup-genre") {
      _selection.stepUpGenre = String(target.value || STEP_UP_GENRES[0].id);
      saveSelection();
      confirmCurrentBrief();
      render();
      return;
    }
    if (target.id === "cs-brief-stepup-stage") {
      _selection.stepUpStage = String(target.value || STEP_UP_STAGES[0].id);
      saveSelection();
      confirmCurrentBrief();
      render();
      return;
    }
    if (target.id === "cs-brief-block-time" || target.id === "cs-brief-block-label" || target.id === "cs-brief-lesson-label" || target.id === "cs-brief-custom-course" || target.id === "cs-brief-custom-unit" || target.id === "cs-brief-custom-text") {
      syncLiveFields();
      saveSelection();
      confirmCurrentBrief();
      render();
    }
  }

  function handleInput(event) {
    var target = event.target;
    if (!target || !target.id) return;
    if (target.id === "cs-brief-block-time" || target.id === "cs-brief-block-label" || target.id === "cs-brief-lesson-label" || target.id === "cs-brief-custom-course" || target.id === "cs-brief-custom-unit" || target.id === "cs-brief-custom-text") {
      syncLiveFields();
      saveSelection();
    }
  }

  function handleClick(event) {
    var target = event.target;
    if (!target) return;
    var blockId = target.getAttribute("data-brief-block");
    if (blockId) {
      selectBlock(blockId);
      return;
    }
    if (target.getAttribute("data-brief-save-block")) {
      saveOrUpdateBlock();
      return;
    }
    if (target.getAttribute("data-brief-new-block")) {
      _selection.blockId = "";
      _selection.blockLabel = "";
      _selection.blockTime = "";
      _selection.rosterCandidateId = "";
      saveSelection();
      render();
      return;
    }
    var deleteId = target.getAttribute("data-brief-delete-block");
    if (deleteId) {
      deleteBlock(deleteId);
      return;
    }
    if (target.getAttribute("data-brief-add-student")) {
      assignStudentToBlock();
      return;
    }
    var removeStudentId = target.getAttribute("data-brief-remove-student");
    if (removeStudentId) {
      removeSelectedStudentFromBlock();
      return;
    }
    var studentId = target.getAttribute("data-brief-student");
    if (studentId) {
      chooseStudent(studentId);
      return;
    }
    var recentKey = target.getAttribute("data-brief-recent");
    if (recentKey) {
      loadRecentSelection(recentKey);
      render();
      return;
    }
    var saveContextKey = target.getAttribute("data-brief-save-context");
    if (saveContextKey) {
      confirmCurrentBrief();
      render();
      return;
    }
    var copyKey = target.getAttribute("data-brief-copy");
    if (copyKey) {
      var brief = currentBrief();
      if (brief && brief.key === copyKey) {
        confirmCurrentBrief();
        copyBriefToClipboard(brief);
      }
      return;
    }
    var noteKey = target.getAttribute("data-brief-save-note");
    if (noteKey) {
      saveCurrentNote(noteKey);
      setGoogleStatus("Local note saved.");
      render();
      return;
    }
    if (target.getAttribute("data-brief-google-connect")) {
      ensureGoogleConnection().then(function () {
        render();
      }).catch(function (err) {
        setGoogleStatus(err && err.message ? err.message : "Google sign-in failed.");
        render();
      });
      return;
    }
    if (target.getAttribute("data-brief-google-calendar-sync")) {
      importGoogleCalendarBlocks();
      return;
    }
    if (target.getAttribute("data-brief-google-calendar-open")) {
      var api = googleWorkspaceModule();
      openExternal(api && api.openCalendarUrl ? api.openCalendarUrl() : "https://calendar.google.com/");
      return;
    }
    if (target.getAttribute("data-brief-google-doc")) {
      createGoogleFile("Doc");
      return;
    }
    if (target.getAttribute("data-brief-google-sheet")) {
      createGoogleFile("Sheet");
      return;
    }
    if (target.getAttribute("data-brief-google-slide")) {
      createGoogleFile("Slides");
      return;
    }
    if (target.getAttribute("data-brief-google-drive")) {
      searchGoogleDrive();
      return;
    }
    if (target.getAttribute("data-brief-google-youtube")) {
      searchGoogleYouTube();
      return;
    }
  }

  root.CSLessonBriefPanel = {
    open: open,
    close: close,
    toggle: toggle,
    setContext: setContext
  };
})(window);
