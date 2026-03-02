(function homeV3Runtime() {
  "use strict";

  var previewEl = document.getElementById("home-sequencer-preview");
  var startBtn = document.getElementById("home-start-this");
  var seeAllBtn = document.getElementById("home-see-all");
  var allOptionsEl = document.getElementById("home-all-options");
  var openWordQuestLink = document.getElementById("home-open-wordquest");
  var demoContainer = document.getElementById("home-wordquest-demo");
  var sequencer = window.CSInstructionalSequencer;
  var previewRuntime = null;

  function appBasePath() {
    var path = String((window.location && window.location.pathname) || "");
    var marker = "/WordQuest/";
    var idx = path.indexOf(marker);
    return idx >= 0 ? path.slice(0, idx + marker.length - 1) : "";
  }

  function withAppBase(path) {
    var clean = String(path || "").replace(/^\.?\//, "");
    return appBasePath() + "/" + clean;
  }

  function canonicalWordQuestHref() {
    return withAppBase("word-quest.html?play=1#wordquest");
  }

  function mountWordQuestDemo() {
    if (!demoContainer || !window.WordQuestPreview || typeof window.WordQuestPreview.create !== "function") return;
    previewRuntime = window.WordQuestPreview.create(demoContainer, {
      includeWriting: false,
      loop: true,
      resetDelayMs: 2600,
      typeDelayMs: 200,
      preFlipDelayMs: 760,
      flipDurationMs: 210,
      flipGapMs: 210,
      betweenGuessDelayMs: 780
    });
    if (previewRuntime && typeof previewRuntime.start === "function") {
      previewRuntime.start();
    }
    document.addEventListener("visibilitychange", function () {
      if (!previewRuntime) return;
      if (document.hidden && typeof previewRuntime.stop === "function") {
        previewRuntime.stop();
      } else if (!document.hidden && typeof previewRuntime.start === "function") {
        previewRuntime.start();
      }
    });
  }

  function currentStudentId() {
    try {
      var sid = new URLSearchParams(window.location.search || "").get("student");
      if (sid) return String(sid);
    } catch (_e) {}
    try {
      var raw = localStorage.getItem("cs.lastActivityByStudent.v1");
      var map = raw ? JSON.parse(raw) : {};
      if (!map || typeof map !== "object" || Array.isArray(map)) return "";
      var latestStudentId = "";
      var latestTs = -1;
      Object.keys(map).forEach(function (studentId) {
        var row = map[studentId] || {};
        var ts = Number(row.ts || 0);
        if (Number.isFinite(ts) && ts > latestTs) {
          latestTs = ts;
          latestStudentId = String(studentId || "");
        }
      });
      return latestStudentId;
    } catch (_e) {
      return "";
    }
  }

  function toRouteHref(row) {
    var href = String(row && row.href || "").trim();
    if (href) return href;
    var module = String(row && row.module || "");
    if (module === "ReadingLab") return "reading-lab.html";
    if (module === "WritingStudio") return "writing-studio.html";
    if (module === "SentenceStudio") return "sentence-surgery.html";
    if (module.indexOf("Numeracy") === 0) return "numeracy.html";
    if (module === "PrecisionPlay") return "precision-play.html";
    return "word-quest.html?play=1";
  }

  function appendStudent(href, studentId) {
    var sid = String(studentId || "");
    if (!sid) return href;
    var u = new URL(String(href || ""), window.location.href);
    u.searchParams.set("student", sid);
    return u.pathname.replace(/^\//, "") + (u.search || "") + (u.hash || "");
  }

  function renderNoStudent() {
    previewEl.innerHTML = '<p class="home-option-reason">Select a student to generate recommendations.</p>';
    startBtn.disabled = false;
    startBtn.textContent = "Go to Dashboard";
    startBtn.onclick = function () {
      window.location.href = withAppBase("teacher-dashboard.html");
    };
    allOptionsEl.classList.add("hidden");
    allOptionsEl.innerHTML = "";
    seeAllBtn.disabled = false;
    seeAllBtn.onclick = function () {
      window.location.href = withAppBase("teacher-dashboard.html");
    };
  }

  function renderOptions(studentId, options) {
    var top = options[0];
    previewEl.innerHTML = [
      '<div class="home-option-top">',
      '<div>',
      '<h2 class="home-option-title">' + String(top.title || "Focused move") + '</h2>',
      '<p class="home-option-meta">' + String(top.module || "Module") + ' • ' + String(top.skillId || "Skill") + '</p>',
      '</div>',
      '<span class="home-duration">' + String(top.durationMin || 6) + ' min</span>',
      '</div>',
      '<p class="home-option-reason">' + String(top.reason || "Targeted reinforcement based on recent evidence.") + '</p>'
    ].join("");

    var launchHref = appendStudent(toRouteHref(top), studentId);
    startBtn.textContent = "Start This";
    startBtn.disabled = false;
    startBtn.onclick = function () {
      window.location.href = withAppBase(launchHref);
    };

    allOptionsEl.innerHTML = options.map(function (row) {
      return [
        '<article class="home-all-option">',
        '<div><span class="home-rank">' + String(row.rank || 1) + '</span><strong>' + String(row.title || "Move") + '</strong></div>',
        '<div class="home-option-meta">' + String(row.module || "Module") + ' • ' + String(row.durationMin || 6) + ' min</div>',
        '<div class="home-option-reason">' + String(row.reason || "") + '</div>',
        '</article>'
      ].join("");
    }).join("");

    seeAllBtn.disabled = false;
    seeAllBtn.onclick = function () {
      window.location.href = withAppBase("teacher-dashboard.html?student=" + encodeURIComponent(studentId));
    };
  }

  function init() {
    if (!previewEl || !startBtn || !seeAllBtn || !allOptionsEl) return;
    mountWordQuestDemo();

    if (openWordQuestLink) {
      var directHref = canonicalWordQuestHref();
      openWordQuestLink.setAttribute("href", directHref);
      openWordQuestLink.addEventListener("click", function (event) {
        event.preventDefault();
        window.location.href = directHref;
      });
    }

    var sid = currentStudentId();
    if (!sid || !sequencer || typeof sequencer.generateInstructionalOptions !== "function") {
      renderNoStudent();
      return;
    }
    var options = sequencer.generateInstructionalOptions(sid) || [];
    if (!Array.isArray(options) || options.length < 1) {
      renderNoStudent();
      return;
    }
    renderOptions(sid, options.slice(0, 3));
  }

  init();
})();
