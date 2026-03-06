(function workspaceStudentIntelligenceModule(root, factory) {
  if (typeof module === "object" && module.exports) {
    module.exports = factory();
    return;
  }
  root.CSWorkspaceStudentIntelligence = factory();
})(typeof globalThis !== "undefined" ? globalThis : window, function createWorkspaceStudentIntelligence() {
  "use strict";

  function buildTinySpark(points) {
    var arr = Array.isArray(points) && points.length ? points : [38, 42, 46, 50];
    var max = Math.max.apply(Math, arr);
    var min = Math.min.apply(Math, arr);
    var span = Math.max(1, max - min);
    return arr.map(function (value, idx) {
      var x = Math.round((idx / Math.max(1, arr.length - 1)) * 72);
      var y = Math.round(22 - ((Number(value || 0) - min) / span) * 18);
      return (idx ? "L" : "M") + x + " " + y;
    }).join(" ");
  }

  function renderEvidenceChips(options) {
    var config = options && typeof options === "object" ? options : {};
    var el = config.el || {};
    var rows = Array.isArray(config.chips) ? config.chips.slice(0, 8) : [];
    if (config.SupportStore && config.studentId && typeof config.SupportStore.getRecentEvidencePoints === "function") {
      try {
        var recent = config.SupportStore.getRecentEvidencePoints(config.studentId, 7, 8);
        recent.forEach(function (row) {
          if (Array.isArray(row.chips) && row.chips.length) {
            row.chips.slice(0, 2).forEach(function (chipText) {
              rows.push({ label: String(row.module || "Activity"), value: String(chipText || "") });
            });
          }
        });
      } catch (_e) {}
    }
    if (!el.evidenceChips) return;
    if (!rows.length) {
      el.evidenceChips.innerHTML = '<span class="td-chip">No recent evidence yet</span>';
      return;
    }
    el.evidenceChips.innerHTML = rows.slice(0, 12).map(function (chip) {
      return '<span class="td-chip"><strong>' + chip.label + ':</strong> ' + chip.value + '</span>';
    }).join("");
  }

  function renderSkillTiles(options) {
    var config = options && typeof options === "object" ? options : {};
    var el = config.el || {};
    var studentId = String(config.studentId || "");
    var Evidence = config.Evidence || null;
    var getSkillLabelSafe = typeof config.getSkillLabelSafe === "function" ? config.getSkillLabelSafe : function (id) { return String(id || "Skill"); };
    if (!el.skillTiles) return;
    if (!studentId || !Evidence || typeof Evidence.getSkillModel !== "function") {
      el.skillTiles.innerHTML = '<div class="td-skill-tile"><p class="td-reco-line">Select a student to view skill tiles.</p></div>';
      return;
    }
    var model = Evidence.getSkillModel(studentId);
    var rows = model && model.mastery && typeof model.mastery === "object"
      ? Object.keys(model.mastery).map(function (skillId) {
          var row = model.mastery[skillId] || {};
          var mastery = Math.max(0, Math.min(100, Number(row.mastery || 0)));
          return {
            skillId: skillId,
            label: getSkillLabelSafe(skillId),
            mastery: mastery,
            level: Math.max(0, Math.min(3, Number(row.level || 0))),
            lastUpdated: String(row.lastUpdated || ""),
            sparkline: Array.isArray(row.sparkline) ? row.sparkline.slice(-7) : []
          };
        })
      : [];
    rows.sort(function (a, b) { return a.mastery - b.mastery; });
    if (!rows.length) {
      el.skillTiles.innerHTML = '<div class="td-skill-tile"><p class="td-reco-line">No skill evidence yet. Run a quick check.</p></div>';
      return;
    }
    el.skillTiles.innerHTML = rows.slice(0, 8).map(function (row) {
      var updated = row.lastUpdated ? new Date(row.lastUpdated).toLocaleDateString() : "—";
      return [
        '<article class="td-skill-tile">',
        '<div class="td-skill-head">',
        '<strong>' + row.label + '</strong>',
        '<span class="tier-badge tier-' + Math.max(1, Math.min(3, row.level + 1)) + '">L' + row.level + '</span>',
        '</div>',
        '<div class="td-skill-meter"><span style="width:' + row.mastery + '%"></span></div>',
        '<div class="td-skill-meta">',
        '<svg viewBox="0 0 72 24" preserveAspectRatio="none"><path d="' + buildTinySpark(row.sparkline) + '" /></svg>',
        '<span>' + row.mastery + '% · ' + updated + '</span>',
        '</div>',
        '</article>'
      ].join("");
    }).join("");
  }

  function renderNeeds(options) {
    var config = options && typeof options === "object" ? options : {};
    var el = config.el || {};
    var needs = config.snapshot && Array.isArray(config.snapshot.needs) ? config.snapshot.needs : [];
    if (!el.needsChipList) return;
    if (!needs.length) {
      el.needsChipList.innerHTML = '<span class="td-chip">Run Quick Check to detect needs</span>';
      return;
    }
    el.needsChipList.innerHTML = needs.slice(0, 4).map(function (need) {
      var sev = Math.max(1, Math.min(5, Number(need.severity || 1)));
      var tierClass = sev >= 4 ? "tier-3" : (sev >= 3 ? "tier-2" : "tier-1");
      return '<span class="tier-badge ' + tierClass + '">' + need.label + ' · S' + sev + '</span>';
    }).join("");
    if (config.SupportStore && config.studentId) {
      try {
        config.SupportStore.setNeeds(config.studentId, needs.map(function (need) {
          return {
            key: String(need.key || need.skillId || need.label || ""),
            label: String(need.label || need.skillId || "Need"),
            domain: String(need.domain || ""),
            severity: Number(need.severity || 0)
          };
        }));
      } catch (_e) {}
    }
  }

  function getSkillEvidencePoints(studentId, skillId, EvidenceEngine) {
    var sid = String(studentId || "");
    var id = String(skillId || "");
    if (!sid || !id) return [];
    if (EvidenceEngine && typeof EvidenceEngine._getSkillRows === "function") {
      return (EvidenceEngine._getSkillRows(sid, id) || []).map(function (row) {
        return {
          timestamp: row && row.timestamp,
          accuracy: row && row.result ? Number(row.result.accuracy) : NaN
        };
      });
    }
    return [];
  }

  function buildSkillGraph() {
    var graph = {};
    var taxonomy = root.__CS_SKILLSTORE__ && root.__CS_SKILLSTORE__.taxonomy;
    if (taxonomy && Array.isArray(taxonomy.strands)) {
      taxonomy.strands.forEach(function (strand) {
        (strand.skills || []).forEach(function (skill) {
          var id = String(skill && skill.id || "");
          if (!id) return;
          graph[id] = graph[id] || { prereq: [], next: [] };
          graph[id].prereq = Array.isArray(skill.prereq) ? skill.prereq.slice() : [];
        });
      });
      Object.keys(graph).forEach(function (id) {
        (graph[id].prereq || []).forEach(function (pre) {
          if (!graph[pre]) graph[pre] = { prereq: [], next: [] };
          if (graph[pre].next.indexOf(id) === -1) graph[pre].next.push(id);
        });
      });
      return graph;
    }
    return {
      "LIT.DEC.PHG": { prereq: [], next: ["LIT.DEC.SYL", "LIT.DEC.IRREG"] },
      "LIT.DEC.SYL": { prereq: ["LIT.DEC.PHG"], next: ["LIT.FLU.ACC"] },
      "LIT.DEC.IRREG": { prereq: ["LIT.DEC.PHG"], next: ["LIT.FLU.ACC"] },
      "LIT.FLU.ACC": { prereq: ["LIT.DEC.SYL"], next: ["LIT.LANG.SYN"] },
      "LIT.LANG.SYN": { prereq: ["LIT.FLU.ACC"], next: ["LIT.WRITE.SENT"] },
      "LIT.WRITE.SENT": { prereq: ["LIT.LANG.SYN"], next: [] },
      "NUM.FLU.FACT": { prereq: [], next: ["NUM.STRAT.USE"] },
      "NUM.STRAT.USE": { prereq: ["NUM.FLU.FACT"], next: [] }
    };
  }

  function renderMasteryUI(options) {
    var config = options && typeof options === "object" ? options : {};
    var el = config.el || {};
    var studentId = String(config.studentId || "");
    var MasteryEngine = config.MasteryEngine || null;
    var Evidence = config.Evidence || null;
    var EvidenceEngine = config.EvidenceEngine || null;
    var getSkillLabelSafe = typeof config.getSkillLabelSafe === "function" ? config.getSkillLabelSafe : function (id) { return String(id || "Skill"); };
    if (!el.masteryList || !el.nextSkill) return;
    if (!studentId || !MasteryEngine) {
      el.masteryList.innerHTML = '<div class="td-skill-row"><span class="td-skill-name">Select a student to view mastery.</span></div>';
      el.nextSkill.innerHTML = '<div class="td-skill-row"><span class="td-skill-name">No recommendation yet.</span></div>';
      return;
    }

    var model = Evidence && typeof Evidence.getSkillModel === "function" ? Evidence.getSkillModel(studentId) : { mastery: {} };
    var rows = model && model.mastery && typeof model.mastery === "object" ? Object.keys(model.mastery) : [];
    var masteryMap = {};
    if (!rows.length) {
      el.masteryList.innerHTML = '<div class="td-skill-row"><span class="td-skill-name">Run quick checks to build mastery evidence.</span></div>';
    } else {
      el.masteryList.innerHTML = rows.slice(0, 8).map(function (skillId) {
        var points = getSkillEvidencePoints(studentId, skillId, EvidenceEngine);
        var masteryState = MasteryEngine.computeMasteryState(points);
        var mtss = MasteryEngine.computeMtssTrendDecision(points, 0.85);
        masteryMap[skillId] = masteryState.band;
        var fadePreview = "";
        if (mtss === "FADE") {
          fadePreview = '<div class="td-fade-preview">Fade: ' + MasteryEngine.generateFadeSchedule(5, 1).join(" → ") + '</div>';
        }
        return [
          '<div class="td-skill-row">',
          '<span class="td-skill-name">' + getSkillLabelSafe(skillId) + '</span>',
          '<span class="td-band-chip td-band-' + masteryState.band + '">' + masteryState.band + '</span>',
          '<span class="td-mtss-badge td-mtss-' + mtss + '">' + mtss + '</span>',
          '</div>',
          fadePreview
        ].join("");
      }).join("");
    }

    var nextSkillId = MasteryEngine.nextBestSkill(buildSkillGraph(), masteryMap);
    if (!nextSkillId) {
      el.nextSkill.innerHTML = '<div class="td-skill-row"><strong>All foundational skills secured.</strong></div>';
    } else {
      el.nextSkill.innerHTML = '<div class="td-skill-row"><strong>' + getSkillLabelSafe(nextSkillId) + '</strong><span>Target for instruction</span></div>';
    }
  }

  function renderProgressNote(options) {
    var config = options && typeof options === "object" ? options : {};
    var el = config.el || {};
    if (!el.noteText) return;
    if (!config.plan || !config.plan.progressNoteTemplate) {
      el.noteText.textContent = "Select a student to generate a progress note.";
      return;
    }
    var notes = config.plan.progressNoteTemplate;
    var WorkspaceFamilyCommunication = config.WorkspaceFamilyCommunication || null;
    var key = WorkspaceFamilyCommunication && typeof WorkspaceFamilyCommunication.resolveNoteChannel === "function"
      ? WorkspaceFamilyCommunication.resolveNoteChannel(config.activeNoteTab)
      : (config.activeNoteTab === "family" ? "family" : (config.activeNoteTab === "team" ? "team" : "teacher"));
    el.noteText.textContent = String(notes[key] || ("Student: " + (config.student && config.student.name ? config.student.name : "Student")));
  }

  function renderLastSessionSummary(options) {
    var config = options && typeof options === "object" ? options : {};
    var el = config.el || {};
    var Evidence = config.Evidence || root.CSEvidence || null;
    if (!Evidence || typeof Evidence.getRecentSessions !== "function") return;
    var sessions = Evidence.getRecentSessions(config.studentId, { limit: 1 });
    var row = sessions[0];
    var WorkspaceHistory = config.WorkspaceHistory || null;
    var historyView = WorkspaceHistory && typeof WorkspaceHistory.summarizeSession === "function"
      ? WorkspaceHistory.summarizeSession(row)
      : { title: "No recent quick check yet", meta: "Run a 90-second Word Quest quick check to generate signals." };
    if (el.lastSessionTitle) el.lastSessionTitle.textContent = historyView.title;
    if (el.lastSessionMeta) el.lastSessionMeta.textContent = historyView.meta;
  }

  return {
    buildTinySpark: buildTinySpark,
    renderEvidenceChips: renderEvidenceChips,
    renderSkillTiles: renderSkillTiles,
    renderNeeds: renderNeeds,
    renderMasteryUI: renderMasteryUI,
    renderProgressNote: renderProgressNote,
    renderLastSessionSummary: renderLastSessionSummary
  };
});
