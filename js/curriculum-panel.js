/**
 * curriculum-panel.js — Curriculum Quick-Reference Panel
 *
 * Three-tab panel: Resources · Assessments · Videos
 *
 * Resources:  Curriculum program cards (FT, IM, UFLI, Bridges, etc.)
 *             + All 54 Fish Tank units with deep links
 * Assessments: ORF fluency passages (timed), Pam Harris number talks,
 *              Quick screener battery (PSF, NWF, sight words, comp)
 * Videos:     Curated YouTube links by subject and grade
 *
 * Exports: window.CSCurriculumPanel
 *   .open(tab?)    → opens panel (tab: "resources"|"assessments"|"videos")
 *   .close()       → closes panel
 *   .setGrade(g)   → filter content by grade
 */

(function curriculumPanelModule(root) {
  "use strict";

  var _grade = "all";
  var _tab   = "resources";
  var _data  = { curricula: null, fishtankUnits: null };
  var _assessData = { fluencyPassages: null, numberTalks: null, screeners: null };
  var _assessTab = "fluency";
  var _timer = null;
  var _timerRunning = false;
  var _timerSeconds = 0;

  /* ── DOM helpers ────────────────────────────────────────── */
  function el(id) { return document.getElementById(id); }
  function qs(sel, ctx) { return (ctx || document).querySelector(sel); }
  function qsa(sel, ctx) { return Array.prototype.slice.call((ctx || document).querySelectorAll(sel)); }

  function escapeHtml(s) {
    return String(s || "").replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }

  /* ── Panel open / close ─────────────────────────────────── */
  function open(tab) {
    _tab = tab || _tab || "resources";
    var panel = el("cs-cur-panel");
    if (!panel) { buildPanel(); panel = el("cs-cur-panel"); }
    panel.classList.add("is-open");
    loadData();
    renderTab(_tab);
  }

  function close() {
    stopTimer();
    var panel = el("cs-cur-panel");
    if (panel) panel.classList.remove("is-open");
  }

  /* ── Build panel DOM (once) ─────────────────────────────── */
  function buildPanel() {
    var div = document.createElement("div");
    div.id = "cs-cur-panel";
    div.setAttribute("role", "dialog");
    div.setAttribute("aria-modal", "true");
    div.setAttribute("aria-label", "Curriculum Quick Reference");
    div.innerHTML = [
      '<div class="cs-cur-head">',
      '  <div style="flex:1">',
      '    <h2 class="cs-cur-head-title">📚 Curriculum Quick Reference</h2>',
      '    <p class="cs-cur-head-sub">Resources · Assessments · Videos</p>',
      '  </div>',
      '  <button class="cs-cur-close" id="cs-cur-close-btn" aria-label="Close panel">&#x2715;</button>',
      '</div>',
      '<div class="cs-cur-tabs" role="tablist">',
      '  <button class="cs-cur-tab is-active" data-tab="resources" role="tab" aria-selected="true">🏫 Resources</button>',
      '  <button class="cs-cur-tab" data-tab="assessments" role="tab" aria-selected="false">📊 Assessments</button>',
      '  <button class="cs-cur-tab" data-tab="videos" role="tab" aria-selected="false">▶️ Videos</button>',
      '</div>',
      '<div class="cs-cur-grade-strip" id="cs-cur-grades">',
      '  <button class="cs-cur-grade-btn is-active" data-grade="all">All Grades</button>',
      '  <button class="cs-cur-grade-btn" data-grade="K">K</button>',
      '  <button class="cs-cur-grade-btn" data-grade="1">Grade 1</button>',
      '  <button class="cs-cur-grade-btn" data-grade="2">Grade 2</button>',
      '  <button class="cs-cur-grade-btn" data-grade="3">Grade 3</button>',
      '  <button class="cs-cur-grade-btn" data-grade="4">Grade 4</button>',
      '  <button class="cs-cur-grade-btn" data-grade="5">Grade 5</button>',
      '</div>',
      '<div class="cs-cur-body" id="cs-cur-body"></div>'
    ].join("\n");
    document.body.appendChild(div);

    /* Close button */
    var closeBtn = el("cs-cur-close-btn");
    if (closeBtn) closeBtn.addEventListener("click", close);

    /* Tab switching */
    qsa(".cs-cur-tab", div).forEach(function (btn) {
      btn.addEventListener("click", function () {
        _tab = btn.getAttribute("data-tab");
        qsa(".cs-cur-tab", div).forEach(function (t) {
          t.classList.toggle("is-active", t === btn);
          t.setAttribute("aria-selected", t === btn ? "true" : "false");
        });
        renderTab(_tab);
      });
    });

    /* Grade filter */
    qsa(".cs-cur-grade-btn", div).forEach(function (btn) {
      btn.addEventListener("click", function () {
        _grade = btn.getAttribute("data-grade");
        qsa(".cs-cur-grade-btn", div).forEach(function (b) {
          b.classList.toggle("is-active", b === btn);
        });
        renderTab(_tab);
      });
    });

    /* Close on overlay click */
    div.addEventListener("click", function (e) {
      if (e.target === div) close();
    });
  }

  /* ── Load data ──────────────────────────────────────────── */
  function loadData() {
    if (!_data.curricula) {
      fetch("./data/curriculum-extended.json")
        .then(function (r) { return r.ok ? r.json() : null; })
        .then(function (d) {
          if (d) {
            _data.curricula      = d.curricula || [];
            _data.fishtankUnits  = d.fishtankUnits || [];
            if (_tab === "resources") renderResources();
          }
        }).catch(function () {});
    }
    if (!_assessData.fluencyPassages) {
      fetch("./data/assessment-library.json")
        .then(function (r) { return r.ok ? r.json() : null; })
        .then(function (d) {
          if (d) {
            _assessData.fluencyPassages = d.fluencyPassages || [];
            _assessData.numberTalks     = d.numberTalks     || [];
            _assessData.screeners       = d.screeners       || [];
            if (_tab === "assessments") renderAssessments();
          }
        }).catch(function () {});
    }
  }

  /* ── Render by tab ──────────────────────────────────────── */
  function renderTab(tab) {
    stopTimer();
    if (tab === "resources")   renderResources();
    else if (tab === "assessments") renderAssessments();
    else if (tab === "videos") renderVideos();
  }

  /* ═══════════════════════════════════════════════════════
     RESOURCES TAB
  ═══════════════════════════════════════════════════════ */
  function renderResources() {
    var body = el("cs-cur-body");
    if (!body) return;

    if (!_data.curricula) {
      body.innerHTML = '<div class="cs-panel-loading"><div class="cs-panel-loading-spin"></div>Loading curriculum data…</div>';
      return;
    }

    var html = [];

    /* Curriculum program cards */
    html.push('<p class="cs-cur-section-head">Curriculum Programs</p>');
    (_data.curricula || []).forEach(function (c) {
      html.push(buildCurriculumCard(c));
    });

    /* Fish Tank units */
    var units = (_data.fishtankUnits || []).filter(function (u) {
      return _grade === "all" || u.grade === _grade;
    });

    if (units.length) {
      html.push('<p class="cs-cur-section-head">Fish Tank ELA Units (' + units.length + ')</p>');
      html.push('<div class="cs-unit-list">');
      units.forEach(function (u) {
        var gradeSlug = gradeToSlug(u.grade);
        var url = "https://www.fishtanklearning.org/curriculum/ela/" + gradeSlug + "/" + escapeHtml(u.unitSlug) + "/lesson-1/";
        var domainClass = "domain-" + (u.domain || "narrative");
        html.push([
          '<a class="cs-unit-row" href="' + escapeHtml(url) + '" target="_blank" rel="noopener">',
          '  <div class="cs-unit-row-grade">' + escapeHtml(u.grade === "K" ? "K" : "G" + u.grade) + '</div>',
          '  <div class="cs-unit-row-info">',
          '    <div class="cs-unit-row-title">' + escapeHtml(u.title || u.unitSlug) + '</div>',
          '    <div class="cs-unit-row-meta">' + (u.lessonCount || "~20") + ' lessons · ' + escapeHtml((u.themes || []).join(", ")) + '</div>',
          '  </div>',
          '  <span class="cs-unit-row-domain ' + domainClass + '">' + escapeHtml(u.domain || "narrative") + '</span>',
          '</a>'
        ].join("\n"));
      });
      html.push('</div>');
    }

    body.innerHTML = html.join("\n");
  }

  function buildCurriculumCard(c) {
    var accessClass = c.access === "open" ? "open" : c.access === "login-required" ? "login" : "purchase";
    var accessLabel = c.access === "open" ? "Open" : c.access === "login-required" ? "Login Required" : "Purchased";
    var tips = (c.quickTips || []).map(function (t) { return "<li>" + escapeHtml(t) + "</li>"; }).join("");
    var ytLinks = (c.youtubeLinks || []).map(function (l) {
      return '<a href="' + escapeHtml(l.url) + '" target="_blank" rel="noopener" class="cs-cur-link-btn secondary">▶ ' + escapeHtml(l.title) + '</a>';
    }).join("");

    return [
      '<div class="cs-cur-card">',
      '  <div class="cs-cur-card-head">',
      '    <div class="cs-cur-card-dot" style="background:' + escapeHtml(c.color || "#2b5da8") + '"></div>',
      '    <span class="cs-cur-card-title">' + escapeHtml(c.name) + '</span>',
      '    <span class="cs-cur-card-grades">' + escapeHtml(c.grades || "K-5") + '</span>',
      '    <span class="cs-cur-card-access ' + accessClass + '">' + accessLabel + '</span>',
      '  </div>',
      '  <p class="cs-cur-card-summary">' + escapeHtml(c.summary || "") + '</p>',
      tips ? '<ul class="cs-cur-card-tips">' + tips + '</ul>' : '',
      '  <div class="cs-cur-card-actions">',
      c.url ? '<a href="' + escapeHtml(c.url) + '" target="_blank" rel="noopener" class="cs-cur-link-btn primary">→ Open Resource</a>' : '',
      ytLinks,
      '  </div>',
      '</div>'
    ].join("\n");
  }

  function gradeToSlug(grade) {
    var map = { K: "kindergarten", "1": "1st-grade", "2": "2nd-grade", "3": "3rd-grade", "4": "4th-grade", "5": "5th-grade" };
    return map[String(grade)] || String(grade).toLowerCase() + "th-grade";
  }

  /* ═══════════════════════════════════════════════════════
     ASSESSMENTS TAB
  ═══════════════════════════════════════════════════════ */
  function renderAssessments() {
    var body = el("cs-cur-body");
    if (!body) return;

    if (!_assessData.fluencyPassages) {
      body.innerHTML = '<div class="cs-panel-loading"><div class="cs-panel-loading-spin"></div>Loading assessment library…</div>';
      return;
    }

    var html = [];

    /* Sub-tab row */
    html.push([
      '<div style="display:flex;gap:6px;margin-bottom:12px;flex-wrap:wrap;">',
      buildAssessSubTab("fluency",  "📖 ORF Passages", _assessTab),
      buildAssessSubTab("numtalks", "🔢 Number Talks", _assessTab),
      buildAssessSubTab("screener", "🔍 Screeners",    _assessTab),
      '</div>'
    ].join(""));

    if (_assessTab === "fluency")  html.push(renderFluency());
    else if (_assessTab === "numtalks") html.push(renderNumberTalks());
    else if (_assessTab === "screener") html.push(renderScreeners());

    body.innerHTML = html.join("\n");

    /* Sub-tab click wiring */
    qsa("[data-assess-tab]", body).forEach(function (btn) {
      btn.addEventListener("click", function () {
        _assessTab = btn.getAttribute("data-assess-tab");
        renderAssessments();
      });
    });

    /* Wire timer buttons */
    qsa(".cs-assess-timer-btn", body).forEach(function (btn) {
      var display = btn.closest(".cs-assess-timer") && btn.closest(".cs-assess-timer").querySelector(".cs-assess-timer-display");
      var seconds = parseInt(btn.getAttribute("data-seconds") || "60", 10);
      btn.addEventListener("click", function () {
        if (_timerRunning) { stopTimer(); renderAssessments(); return; }
        startTimer(display, seconds, btn);
      });
    });

    /* Wire score input → benchmark band feedback */
    qsa(".cs-scr-score-input", body).forEach(function (input) {
      input.addEventListener("input", function () {
        var val = parseInt(input.value, 10);
        var band = input.parentElement && input.parentElement.querySelector(".cs-scr-score-band");
        if (!band || isNaN(val)) return;
        var benchmarkAttr = input.getAttribute("data-benchmark") || "{}";
        var benchmarks = {};
        try { benchmarks = JSON.parse(benchmarkAttr); } catch (_e) {}
        var low = benchmarks.low || 0;
        var some = benchmarks.some || 0;
        var bench = benchmarks.benchmark || 0;
        if (val >= bench) {
          band.textContent = "✓ Benchmark";
          band.style.background = "#dcfce7";
          band.style.color = "#16a34a";
        } else if (val >= some) {
          band.textContent = "Some Risk";
          band.style.background = "#fef3c7";
          band.style.color = "#d97706";
        } else {
          band.textContent = "⚠ At Risk";
          band.style.background = "#fee2e2";
          band.style.color = "#dc2626";
        }
      });
    });
  }

  function buildAssessSubTab(id, label, current) {
    var active = current === id;
    return '<button data-assess-tab="' + id + '" style="padding:6px 14px;border-radius:8px;border:1.5px solid ' +
      (active ? '#2b5da8' : '#c5d5ea') + ';background:' + (active ? '#2b5da8' : '#fff') +
      ';color:' + (active ? '#fff' : '#3d4559') + ';font-size:12px;font-weight:700;cursor:pointer;">' + label + '</button>';
  }

  function renderFluency() {
    var passages = (_assessData.fluencyPassages || []).filter(function (p) {
      return _grade === "all" || p.grade === _grade;
    });
    if (!passages.length) return '<div class="cs-panel-loading">No passages for this grade filter.</div>';
    var html = ['<p class="cs-cur-section-head">Oral Reading Fluency Passages (1-minute)</p>'];
    passages.forEach(function (p) {
      html.push(buildFluencyCard(p));
    });
    return html.join("\n");
  }

  function buildFluencyCard(p) {
    var benchmarkRow = p.wcpm_benchmark ? (
      '<table class="cs-benchmark-table"><thead><tr><th>Season</th><th>Benchmark WCPM</th></tr></thead><tbody>' +
      Object.keys(p.wcpm_benchmark || {}).map(function (season) {
        return '<tr><td>' + season.charAt(0).toUpperCase() + season.slice(1) + '</td><td class="band-benchmark">' + p.wcpm_benchmark[season] + '</td></tr>';
      }).join("") +
      '</tbody></table>'
    ) : "";

    var alignBadges = (p.alignment || []).map(function (a) {
      return '<span style="font-size:10px;padding:2px 8px;border-radius:99px;background:#e0f2fe;color:#0369a1;font-weight:700;">' + escapeHtml(a) + '</span>';
    }).join(" ");

    return [
      '<div class="cs-assess-card">',
      '  <div class="cs-assess-head">',
      '    <div style="flex:1">',
      '      <div class="cs-assess-title">' + escapeHtml(p.title || "Reading Passage") + '</div>',
      '      <div class="cs-assess-meta">Grade ' + escapeHtml(p.grade) + ' · ' + (p.wordCount || "?") + ' words · ' + escapeHtml(p.lexile || "") + ' ' + alignBadges + '</div>',
      '    </div>',
      '  </div>',
      '  <div class="cs-assess-body">',
      '    <div class="cs-assess-text-block">',
      '      <span class="cs-assess-lexile">' + escapeHtml(p.lexile || "") + '</span>',
      '      ' + escapeHtml(p.text || ""),
      '    </div>',
      '    <div class="cs-assess-timer">',
      '      <button class="cs-assess-timer-btn" data-seconds="' + (p.timedSeconds || 60) + '">▶ Start 60s Timer</button>',
      '      <div class="cs-assess-timer-display">1:00</div>',
      '    </div>',
      '    <div style="font-size:12px;color:#3d4559"><strong>Scoring:</strong> ' + escapeHtml(p.scoringGuide || "Count words read correctly in 60 seconds (WCPM).") + '</div>',
      benchmarkRow,
      '    <div class="cs-research-cite">' + escapeHtml(p.researchBase || p.source || "") + '</div>',
      '  </div>',
      '</div>'
    ].join("\n");
  }

  function renderNumberTalks() {
    var talks = (_assessData.numberTalks || []).filter(function (t) {
      return _grade === "all" || t.grade === _grade;
    });
    if (!talks.length) return '<div class="cs-panel-loading">No number talks for this grade.</div>';
    var html = [
      '<p class="cs-cur-section-head">Pam Harris–Style Number Talks</p>',
      '<div style="font-size:12px;color:#6b7591;margin-bottom:8px;">Connected sequences that build multiplicative reasoning. Each talk connects to the next.</div>'
    ];
    talks.forEach(function (t) { html.push(buildNumberTalkCard(t)); });
    return html.join("\n");
  }

  function buildNumberTalkCard(t) {
    var strategies = (t.anticipatedStrategies || []).map(function (s) {
      return '<span class="cs-nt-strategy-pill">' + escapeHtml(s) + '</span>';
    }).join("");
    var connectsTo = (t.connectsTo || []).join(", ");

    return [
      '<div class="cs-nt-card">',
      '  <div class="cs-nt-head">',
      '    <div style="flex:1">',
      '      <div class="cs-nt-title">Grade ' + escapeHtml(t.grade) + ' · ' + escapeHtml(t.pamHarrisType || t.domain || "") + '</div>',
      '      <div style="font-size:11px;color:#6b7591;">' + escapeHtml(t.anchor || "") + '</div>',
      '    </div>',
      '    <span class="cs-nt-sequence">Talk #' + (t.sequence || "") + '</span>',
      '  </div>',
      '  <div class="cs-nt-body">',
      '    <div class="cs-nt-problem">' + escapeHtml(t.problem || "") + '</div>',
      '    <div>',
      '      <div class="cs-nt-script-label">Teacher Script</div>',
      '      <div class="cs-nt-script">' + escapeHtml(t.teacherScript || t.teacherNotes || "") + '</div>',
      '    </div>',
      strategies ? '<div class="cs-nt-strategies">' + strategies + '</div>' : '',
      connectsTo ? '<div class="cs-nt-connect">Next in sequence → ' + escapeHtml(connectsTo) + '</div>' : '',
      t.youtubeExample ? '<a href="' + escapeHtml(t.youtubeExample) + '" target="_blank" rel="noopener" class="cs-cur-link-btn secondary" style="align-self:flex-start;">▶ Watch example</a>' : '',
      '    <div class="cs-research-cite">' + escapeHtml(t.researchBase || "Parrish (2010). Number Talks. Math Solutions.") + '</div>',
      '  </div>',
      '</div>'
    ].join("\n");
  }

  function renderScreeners() {
    var screeners = (_assessData.screeners || []).filter(function (s) {
      var grades = s.grades || [s.grade];
      return _grade === "all" || grades.indexOf(_grade) !== -1;
    });
    if (!screeners.length) return '<div class="cs-panel-loading">No screeners for this grade.</div>';
    var html = [
      '<p class="cs-cur-section-head">Quick Screener Battery</p>',
      '<div style="font-size:12px;color:#6b7591;margin-bottom:8px;">3–5 minute mini-assessments aligned to AIMSweb+, Dibels 8th ed., mClass, Lexia Core 5.</div>'
    ];
    screeners.forEach(function (s) { html.push(buildScreenerCard(s)); });
    return html.join("\n");
  }

  function buildScreenerCard(s) {
    var alignBadges = (s.alignedTo || []).map(function (a) {
      return '<span style="font-size:10px;padding:2px 8px;border-radius:99px;background:#fef3c7;color:#92400e;font-weight:700;margin-right:4px;">' + escapeHtml(a) + '</span>';
    }).join("");

    var items = (s.items || []).map(function (item) {
      var phonemes = Array.isArray(item.phonemes) ? item.phonemes.join(" · ") : (item.phonemes || "");
      var expected = item.expected !== undefined ? String(item.expected) : "";
      return [
        '<div class="cs-scr-item">',
        '  <div class="cs-scr-word">' + escapeHtml(item.word || item.target || "") + '</div>',
        phonemes ? '<div class="cs-scr-phonemes">' + escapeHtml(phonemes) + '</div>' : '',
        expected ? '<span class="cs-scr-count">' + escapeHtml(expected) + '</span>' : '',
        '</div>'
      ].join("");
    }).join("");

    /* Build benchmark for current grade or first grade in array */
    var gradeForBenchmark = _grade !== "all" ? _grade : ((s.grades && s.grades[0]) || s.grade);
    var benchmark = (s.benchmark && s.benchmark[gradeForBenchmark]) || {};
    var winterBenchmark = (benchmark.winter && benchmark.winter.benchmark) || 0;
    var winterSome = (benchmark.winter && benchmark.winter.some) || 0;
    var benchmarkData = JSON.stringify({ low: (benchmark.winter && benchmark.winter.low) || 0, some: winterSome, benchmark: winterBenchmark });

    return [
      '<div class="cs-scr-card">',
      '  <div class="cs-scr-head">',
      '    <div style="flex:1">',
      '      <div class="cs-scr-title">' + escapeHtml(s.name || s.skill) + '</div>',
      '      <div style="font-size:11px;color:#92400e;">Grades ' + escapeHtml((s.grades || [s.grade]).join(", ")) + ' · ' + alignBadges + '</div>',
      '    </div>',
      '    <span class="cs-scr-time">~' + (s.minutesToAdminister || 3) + ' min</span>',
      '  </div>',
      '  <div class="cs-scr-body">',
      s.adminInstructions ? '<div class="cs-scr-admin"><strong>Say:</strong> ' + escapeHtml(s.adminInstructions) + '</div>' : '',
      items ? '<div class="cs-scr-items">' + items + '</div>' : '',
      s.scoringGuide ? '<div style="font-size:12px;color:#3d4559;"><strong>Scoring:</strong> ' + escapeHtml(s.scoringGuide) + '</div>' : '',
      '    <div class="cs-scr-score-row">',
      '      <input class="cs-scr-score-input" type="number" min="0" max="200" placeholder="Score" data-benchmark=\'' + escapeHtml(benchmarkData) + '\'>',
      '      <div class="cs-scr-score-band" style="padding:6px 12px;border-radius:6px;background:#f0f4fb;color:#3d4559;font-weight:700;font-size:12px;">Enter score →</div>',
      '    </div>',
      '    <div class="cs-research-cite">' + escapeHtml(s.researchCitation || s.researchBase || "") + '</div>',
      '  </div>',
      '</div>'
    ].join("\n");
  }

  /* ═══════════════════════════════════════════════════════
     VIDEOS TAB
  ═══════════════════════════════════════════════════════ */
  var VIDEO_LIBRARY = [
    /* Literacy — phonics + structured literacy */
    { title: "Phonics Overview — Science of Reading", channel: "Reading Rockets", subject: "literacy", grades: ["K","1","2"], url: "https://www.youtube.com/watch?v=qCh-NpSdlsM", emoji: "📖" },
    { title: "UFLI Foundations Overview", channel: "University of Florida Literacy Institute", subject: "literacy", grades: ["K","1","2"], url: "https://www.youtube.com/watch?v=0m8xDXsOCpU", emoji: "🔤" },
    { title: "Phoneme Segmentation Demo (Dibels PSF)", channel: "ReadingHorizons", subject: "literacy", grades: ["K","1"], url: "https://www.youtube.com/watch?v=Ej0g1TXEKJA", emoji: "🎯" },
    { title: "Fluency: Repeated Reading Strategy", channel: "Reading Rockets", subject: "literacy", grades: ["1","2","3"], url: "https://www.youtube.com/watch?v=5_pPNJuBCSk", emoji: "⏱" },
    { title: "Vocabulary: Rich Instruction (Beck, McKeown)", channel: "Reading Rockets", subject: "literacy", grades: ["2","3","4","5"], url: "https://www.youtube.com/watch?v=Fm3D4Qqkh_M", emoji: "📚" },
    { title: "Reading Comprehension Strategies", channel: "Khan Academy", subject: "literacy", grades: ["3","4","5"], url: "https://www.youtube.com/watch?v=LnqOYH3bNtA", emoji: "🧠" },

    /* Numeracy — Khan Academy + Pam Harris */
    { title: "K: Counting and Cardinality (Khan)", channel: "Khan Academy", subject: "math", grades: ["K"], url: "https://www.youtube.com/watch?v=9G-tgBEMjM8", emoji: "🔢" },
    { title: "G1: Addition and Subtraction (Khan)", channel: "Khan Academy", subject: "math", grades: ["1"], url: "https://www.youtube.com/watch?v=0SPqVDzjqVo", emoji: "➕" },
    { title: "G2: Place Value (Khan)", channel: "Khan Academy", subject: "math", grades: ["2"], url: "https://www.youtube.com/watch?v=7xHd6hnGCBM", emoji: "💯" },
    { title: "G3: Introduction to Multiplication (Khan)", channel: "Khan Academy", subject: "math", grades: ["3"], url: "https://www.youtube.com/watch?v=mvOkMYCygps", emoji: "✖️" },
    { title: "G4: Multi-digit Multiplication (Khan)", channel: "Khan Academy", subject: "math", grades: ["4"], url: "https://www.youtube.com/watch?v=G40MJFPMa3A", emoji: "🔢" },
    { title: "G5: Fractions: Adding and Subtracting (Khan)", channel: "Khan Academy", subject: "math", grades: ["5"], url: "https://www.youtube.com/watch?v=52ZlXsFJULI", emoji: "½" },
    { title: "Number Talks — What & Why (Pam Harris)", channel: "Math is Figure-Out-Able", subject: "math", grades: ["K","1","2","3","4","5"], url: "https://www.youtube.com/watch?v=LM5tMpx_5Is", emoji: "💬" },
    { title: "Dot Images for Subitizing (Number Talks)", channel: "Math is Figure-Out-Able", subject: "math", grades: ["K","1"], url: "https://www.youtube.com/watch?v=U8cBTm7g9Bc", emoji: "⚫" },

    /* MTSS / Intervention */
    { title: "What is MTSS? (Overview)", channel: "National Center on Intensive Intervention", subject: "mtss", grades: ["K","1","2","3","4","5"], url: "https://www.youtube.com/watch?v=pLJNrY5kpBo", emoji: "🏫" },
    { title: "Progress Monitoring Basics", channel: "IRIS Center (Vanderbilt)", subject: "mtss", grades: ["K","1","2","3","4","5"], url: "https://www.youtube.com/watch?v=SWFqhCT3uPc", emoji: "📈" },
    { title: "Structured Literacy Interventions", channel: "International Dyslexia Association", subject: "mtss", grades: ["1","2","3"], url: "https://www.youtube.com/watch?v=V8x71H6wHHg", emoji: "🔍" },

    /* Parent communication */
    { title: "Talking to Parents About Reading Support", channel: "Reading Rockets", subject: "parents", grades: ["K","1","2","3","4","5"], url: "https://www.youtube.com/watch?v=Z1uqSGS5_3c", emoji: "👨‍👩‍👧" },
    { title: "Home Reading Activities: Grade K-2", channel: "Reading Rockets", subject: "parents", grades: ["K","1","2"], url: "https://www.youtube.com/watch?v=OwFIgE05WTs", emoji: "🏠" }
  ];

  function renderVideos() {
    var body = el("cs-cur-body");
    if (!body) return;

    var subjects = [
      { id: "all",     label: "All" },
      { id: "literacy",label: "Literacy" },
      { id: "math",    label: "Math" },
      { id: "mtss",    label: "MTSS" },
      { id: "parents", label: "Parents" }
    ];

    var currentSubject = body.getAttribute("data-video-subject") || "all";

    var filtered = VIDEO_LIBRARY.filter(function (v) {
      var gradeOk = _grade === "all" || v.grades.indexOf(_grade) !== -1;
      var subjectOk = currentSubject === "all" || v.subject === currentSubject;
      return gradeOk && subjectOk;
    });

    var subjectBtns = subjects.map(function (s) {
      var active = currentSubject === s.id;
      return '<button data-video-subject="' + s.id + '" style="padding:5px 12px;border-radius:99px;border:1.5px solid ' +
        (active ? "#2b5da8" : "#c5d5ea") + ';background:' + (active ? "#2b5da8" : "#fff") +
        ';color:' + (active ? "#fff" : "#3d4559") + ';font-size:12px;font-weight:600;cursor:pointer;">' + s.label + '</button>';
    }).join("");

    var videoCards = filtered.map(function (v) {
      return [
        '<a class="cs-video-chip" href="' + escapeHtml(v.url) + '" target="_blank" rel="noopener">',
        '  <div class="cs-video-thumb">' + v.emoji + '</div>',
        '  <div class="cs-video-chip-title">' + escapeHtml(v.title) + '</div>',
        '  <div class="cs-video-chip-channel"><span class="cs-video-yt-badge">▶ YouTube</span> · ' + escapeHtml(v.channel) + '</div>',
        '</a>'
      ].join("");
    }).join("");

    body.innerHTML = [
      '<p class="cs-cur-section-head">Curated Video Resources</p>',
      '<div style="display:flex;gap:6px;flex-wrap:wrap;margin-bottom:12px;">' + subjectBtns + '</div>',
      filtered.length ?
        '<div class="cs-video-grid">' + videoCards + '</div>' :
        '<div class="cs-panel-loading">No videos match this filter.</div>'
    ].join("\n");

    /* Subject filter wiring */
    qsa("[data-video-subject]", body).forEach(function (btn) {
      btn.addEventListener("click", function () {
        body.setAttribute("data-video-subject", btn.getAttribute("data-video-subject"));
        renderVideos();
      });
    });
  }

  /* ═══════════════════════════════════════════════════════
     TIMER
  ═══════════════════════════════════════════════════════ */
  function startTimer(display, seconds, btn) {
    stopTimer();
    _timerRunning = true;
    _timerSeconds = seconds;
    if (btn) btn.textContent = "■ Stop";
    if (display) display.classList.add("running");

    _timer = setInterval(function () {
      _timerSeconds--;
      if (display) {
        var m = Math.floor(_timerSeconds / 60);
        var s = _timerSeconds % 60;
        display.textContent = m + ":" + String(s).padStart(2, "0");
      }
      if (_timerSeconds <= 0) {
        stopTimer();
        if (btn)     btn.textContent = "▶ Start Again";
        if (display) { display.textContent = "Done!"; display.classList.remove("running"); display.classList.add("done"); }
        /* Optional: play a tone */
        try {
          var ctx = new (window.AudioContext || window.webkitAudioContext)();
          var osc = ctx.createOscillator();
          osc.connect(ctx.destination);
          osc.frequency.value = 880;
          osc.start();
          osc.stop(ctx.currentTime + 0.3);
        } catch (_e) {}
      }
    }, 1000);
  }

  function stopTimer() {
    if (_timer) { clearInterval(_timer); _timer = null; }
    _timerRunning = false;
  }

  /* ── Public API ─────────────────────────────────────────── */
  root.CSCurriculumPanel = {
    open:     open,
    close:    close,
    setGrade: function (g) { _grade = g || "all"; },
    toggle:   function () {
      var panel = el("cs-cur-panel");
      if (panel && panel.classList.contains("is-open")) close();
      else open();
    }
  };

})(window);
