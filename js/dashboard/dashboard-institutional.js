(function dashboardInstitutionalModule() {
  "use strict";

  function create(options) {
    var config = options && typeof options === "object" ? options : {};
    var state = config.state || {};
    var hooks = config.hooks || {};
    var deps = config.deps || {};
    var SupportStore = deps.SupportStore || null;

    function escAttr(value) {
      if (typeof hooks.escAttr === "function") return hooks.escAttr(value);
      return String(value == null ? "" : value)
        .replace(/&/g, "&amp;")
        .replace(/\"/g, "&quot;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;");
    }

    function parseGradeLevel(raw) {
      var text = String(raw || "").toUpperCase();
      var match = text.match(/(\d{1,2})/);
      if (match && Number.isFinite(Number(match[1]))) return Number(match[1]);
      return null;
    }

    function readingMapThreshold(gradeLevel) {
      if (!Number.isFinite(gradeLevel)) return 190;
      if (gradeLevel <= 1) return 175;
      if (gradeLevel <= 2) return 185;
      if (gradeLevel <= 3) return 195;
      if (gradeLevel <= 5) return 205;
      if (gradeLevel <= 8) return 215;
      return 225;
    }

    function isLowBenchmarkText(value) {
      var text = String(value || "").toLowerCase();
      if (!text) return false;
      return (
        text.indexOf("below") >= 0 ||
        text.indexOf("risk") >= 0 ||
        text.indexOf("intensive") >= 0 ||
        text.indexOf("low") >= 0 ||
        text.indexOf("strategic") >= 0
      );
    }

    function isEarlyWordsTheirWayStage(value) {
      var text = String(value || "").toLowerCase();
      if (!text) return false;
      return (
        text.indexOf("psi") >= 0 ||
        text.indexOf("early") >= 0 ||
        text.indexOf("letter") >= 0 ||
        text.indexOf("within word pattern") >= 0
      );
    }

    function isWeakGlossStage(value) {
      var text = String(value || "").toLowerCase();
      if (!text) return false;
      return (
        text.indexOf("early") >= 0 ||
        text.indexOf("emerging") >= 0 ||
        text.indexOf("limited") >= 0 ||
        text.indexOf("additive") >= 0
      );
    }

    function rankWeightFromAnchor(studentId, row, anchors) {
      var score = (4 - Math.max(1, Math.min(3, Number(row.rank || 3)))) * 10;
      var contexts = [];
      var caseload = Array.isArray(state.caseload) ? state.caseload : [];
      var student = caseload.find(function (s) {
        return String(s && s.id || "") === String(studentId || "");
      }) || null;
      var gradeLevel = parseGradeLevel(student && student.gradeBand ? student.gradeBand : "");
      var moduleName = String(row.module || "");
      var skillId = String(row.skillId || "").toUpperCase();

      var readingMap = anchors && anchors.reading ? Number(anchors.reading.mapRIT) : NaN;
      if (Number.isFinite(readingMap) && readingMap < readingMapThreshold(gradeLevel)) {
        if (moduleName === "WordQuest" || moduleName === "PrecisionPlay" || moduleName === "ReadingLab" || skillId.indexOf("LIT.") === 0) {
          score += 22;
          contexts.push("MAP RIT below benchmark; reinforcing literacy foundations.");
        }
      }
      if (anchors && anchors.reading && isLowBenchmarkText(anchors.reading.corePhonicsBenchmark)) {
        if (moduleName === "WordQuest") {
          score += 28;
          contexts.push("Core Phonics benchmark indicates support need; prioritizing decoding.");
        }
      }
      if (anchors && anchors.reading && isEarlyWordsTheirWayStage(anchors.reading.wordsTheirWayStage)) {
        if (moduleName === "WordQuest" || moduleName === "PrecisionPlay") {
          score += 16;
          contexts.push("Words Their Way stage is early; reinforcing morphology/decoding patterns.");
        }
      }
      if (anchors && anchors.math && isWeakGlossStage(anchors.math.glossStage)) {
        if (moduleName.indexOf("Numeracy") === 0 || skillId.indexOf("MATH") >= 0 || skillId.indexOf("NUM") >= 0) {
          score += 20;
          contexts.push("GLOSS stage suggests weak strategy use; reinforcing conceptual numeracy.");
        }
      }
      var writingRubric = anchors && anchors.writing ? Number(anchors.writing.onDemandRubricScore) : NaN;
      if (Number.isFinite(writingRubric) && writingRubric < 2.5) {
        if (moduleName === "WritingStudio" || skillId.indexOf("WRITE") >= 0) {
          score += 24;
          contexts.push("Writing rubric score is low; increasing paragraph structure reinforcement.");
        }
      }

      return {
        score: score,
        context: contexts[0] || ""
      };
    }

    function applyInstitutionalAnchorOverlay(studentId, rows) {
      if (!Array.isArray(rows) || !rows.length) return [];
      if (!SupportStore || typeof SupportStore.getInstitutionalAnchors !== "function") return rows.slice(0, 3);
      var anchors = SupportStore.getInstitutionalAnchors(studentId);
      var ranked = rows.slice(0, 3).map(function (row) {
        var weight = rankWeightFromAnchor(studentId, row, anchors);
        return Object.assign({}, row, {
          _anchorScore: weight.score,
          anchorContext: weight.context
        });
      });
      ranked.sort(function (a, b) {
        if (Number(b._anchorScore || 0) !== Number(a._anchorScore || 0)) return Number(b._anchorScore || 0) - Number(a._anchorScore || 0);
        return Number(a.rank || 3) - Number(b.rank || 3);
      });
      return ranked.slice(0, 3).map(function (row, idx) {
        return Object.assign({}, row, { rank: idx + 1 });
      });
    }

    function formatAlignmentLine(alignment) {
      if (!alignment) return "";
      var standard = "";
      if (Array.isArray(alignment.fishTank) && alignment.fishTank.length) standard = String(alignment.fishTank[0]);
      if (!standard && Array.isArray(alignment.illustrativeMath) && alignment.illustrativeMath.length) standard = String(alignment.illustrativeMath[0]);
      var strand = String(alignment.sasStrand || "");
      var category = String(alignment.mtssCategory || "");
      var lines = [];
      if (standard || strand) lines.push("Aligned to: " + [standard, strand].filter(Boolean).join(" - "));
      if (category) lines.push("MTSS Category: " + category);
      return lines.map(function (line) {
        return '<p class="td-sequencer-alignment">' + line + '</p>';
      }).join("");
    }

    function formatAnchorContextLine(contextLine) {
      var line = String(contextLine || "").trim();
      if (!line) return "";
      return '<p class="td-sequencer-alignment">Context: ' + line + '</p>';
    }

    function renderInstitutionalAnchorPanel(studentId, compact) {
      var isCompact = !!compact;
      if (!studentId || !SupportStore || typeof SupportStore.getInstitutionalAnchors !== "function") {
        return '<div class="td-support-item"><h4>Institutional Data Anchors</h4><p>Select a student to enter MAP/Aimsweb/Core Phonics/Writing/Math anchors.</p></div>';
      }
      var a = SupportStore.getInstitutionalAnchors(studentId);
      var cls = isCompact ? "td-anchor-grid is-compact" : "td-anchor-grid";
      return [
        '<div class="td-support-item td-anchor-panel">',
        '<h4>Institutional Data Anchors</h4>',
        '<div class="' + cls + '">',
        '<section class="td-anchor-group"><h5>Reading</h5>',
        '<label>MAP RIT<input class="td-anchor-input" data-anchor-path="reading.mapRIT" type="number" value="' + escAttr(a.reading.mapRIT == null ? "" : a.reading.mapRIT) + '" /></label>',
        '<label>Aimsweb Percentile<input class="td-anchor-input" data-anchor-path="reading.aimswebPercentile" type="number" min="0" max="99" value="' + escAttr(a.reading.aimswebPercentile == null ? "" : a.reading.aimswebPercentile) + '" /></label>',
        '<label>Core Phonics<input class="td-anchor-input" data-anchor-path="reading.corePhonicsBenchmark" type="text" value="' + escAttr(a.reading.corePhonicsBenchmark || "") + '" /></label>',
        '<label>Words Their Way Stage<input class="td-anchor-input" data-anchor-path="reading.wordsTheirWayStage" type="text" value="' + escAttr(a.reading.wordsTheirWayStage || "") + '" /></label>',
        '<label>Fundations Unit<input class="td-anchor-input" data-anchor-path="reading.fundationsUnit" type="text" value="' + escAttr(a.reading.fundationsUnit || "") + '" /></label>',
        '</section>',
        '<section class="td-anchor-group"><h5>Writing</h5>',
        '<label>On-Demand Rubric<input class="td-anchor-input" data-anchor-path="writing.onDemandRubricScore" type="number" step="0.1" value="' + escAttr(a.writing.onDemandRubricScore == null ? "" : a.writing.onDemandRubricScore) + '" /></label>',
        '<label>Current Goal<input class="td-anchor-input" data-anchor-path="writing.currentWritingGoal" type="text" value="' + escAttr(a.writing.currentWritingGoal || "") + '" /></label>',
        '</section>',
        '<section class="td-anchor-group"><h5>Math</h5>',
        '<label>MAP RIT<input class="td-anchor-input" data-anchor-path="math.mapRIT" type="number" value="' + escAttr(a.math.mapRIT == null ? "" : a.math.mapRIT) + '" /></label>',
        '<label>Bridges Unit Score<input class="td-anchor-input" data-anchor-path="math.bridgesUnitScore" type="number" step="0.1" value="' + escAttr(a.math.bridgesUnitScore == null ? "" : a.math.bridgesUnitScore) + '" /></label>',
        '<label>GLOSS Stage<input class="td-anchor-input" data-anchor-path="math.glossStage" type="text" value="' + escAttr(a.math.glossStage || "") + '" /></label>',
        '<label>Illustrative Checkpoint<input class="td-anchor-input" data-anchor-path="math.illustrativeCheckpoint" type="text" value="' + escAttr(a.math.illustrativeCheckpoint || "") + '" /></label>',
        '</section>',
        '</div>',
        '<div class="td-plan-tabs"><button class="td-top-btn" type="button" data-anchor-save="1">Save Anchors</button></div>',
        '</div>'
      ].join("");
    }

    function bindInstitutionalAnchorActions(studentId, rootEl, refreshDrawer) {
      var container = rootEl || document;
      var saveBtn = container.querySelector("[data-anchor-save='1']");
      if (!saveBtn || !SupportStore || typeof SupportStore.setInstitutionalAnchors !== "function") return;
      saveBtn.addEventListener("click", function () {
        var inputs = container.querySelectorAll(".td-anchor-input[data-anchor-path]");
        var patch = { reading: {}, writing: {}, math: {} };
        Array.prototype.forEach.call(inputs, function (input) {
          var path = String(input.getAttribute("data-anchor-path") || "");
          var value = String(input.value || "").trim();
          var parts = path.split(".");
          if (parts.length !== 2) return;
          var group = parts[0];
          var key = parts[1];
          if (!patch[group]) patch[group] = {};
          patch[group][key] = value;
        });
        SupportStore.setInstitutionalAnchors(studentId, patch);
        if (typeof hooks.setCoachLine === "function") hooks.setCoachLine("Institutional anchors saved.");
        if (typeof hooks.renderInstructionalSequencer === "function") hooks.renderInstructionalSequencer(studentId);
        if (refreshDrawer) {
          if (typeof hooks.renderDrawer === "function") hooks.renderDrawer(studentId);
        } else if (typeof hooks.renderSupportHub === "function") {
          hooks.renderSupportHub(studentId);
        }
      });
    }

    return {
      applyInstitutionalAnchorOverlay: applyInstitutionalAnchorOverlay,
      formatAlignmentLine: formatAlignmentLine,
      formatAnchorContextLine: formatAnchorContextLine,
      renderInstitutionalAnchorPanel: renderInstitutionalAnchorPanel,
      bindInstitutionalAnchorActions: bindInstitutionalAnchorActions
    };
  }

  window.CSDashboardInstitutional = {
    create: create
  };
})();
