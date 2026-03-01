(function initFlexGroupEngineV2(root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory(root);
  } else {
    root.CSFlexGroupEngineV2 = factory(root);
  }
}(typeof globalThis !== 'undefined' ? globalThis : window, function factory(root) {
  'use strict';

  function topSkill(row) {
    return row && row.priority && row.priority.topSkills && row.priority.topSkills[0]
      ? row.priority.topSkills[0]
      : null;
  }

  function toLabel(skillId) {
    var labels = root && root.CSSkillLabels;
    if (labels && typeof labels.getSkillLabel === 'function') return labels.getSkillLabel(skillId);
    return String(skillId || 'Baseline');
  }

  function buildGroups(caseload, skillSnapshots) {
    var rows = Array.isArray(caseload) ? caseload : [];
    var bySkill = {};
    rows.forEach(function (row) {
      var top = topSkill(row);
      var sid = top && top.skillId ? String(top.skillId) : 'BASELINE';
      if (!bySkill[sid]) bySkill[sid] = [];
      bySkill[sid].push(row);
    });

    var out = [];
    Object.keys(bySkill).forEach(function (skillId) {
      var groupRows = bySkill[skillId];
      if (!groupRows.length) return;
      var firstTop = topSkill(groupRows[0]);
      var tier = firstTop && firstTop.tier === 'T3' ? 'T3' : 'T2';
      var cfg = skillSnapshots && typeof skillSnapshots.getTierConfig === 'function'
        ? skillSnapshots.getTierConfig(tier)
        : { groupSizeMax: tier === 'T3' ? 2 : 4, minutesPerSession: tier === 'T3' ? 25 : 20 };
      var maxSize = Math.max(2, Number(cfg.groupSizeMax || 4));
      var sorted = groupRows.slice().sort(function (a, b) {
        return Number((b && b.score) || 0) - Number((a && a.score) || 0);
      });
      for (var i = 0; i < sorted.length; i += maxSize) {
        var batch = sorted.slice(i, i + maxSize);
        if (batch.length < 2) continue;
        var avgPriority = batch.reduce(function (sum, row) {
          var t = topSkill(row);
          return sum + Number((t && t.priorityScore) || 0);
        }, 0) / batch.length;
        out.push({
          targetSkillId: skillId,
          label: toLabel(skillId),
          students: batch.map(function (row) { return row.student; }),
          suggestedMinutes: Number(cfg.minutesPerSession || 20),
          tierMix: batch.map(function (row) {
            var t = topSkill(row);
            return t && t.tier === 'T3' ? 'T3' : 'T2';
          }),
          avgPriorityScore: Number(avgPriority.toFixed(4))
        });
      }
    });

    out.sort(function (a, b) { return b.avgPriorityScore - a.avgPriorityScore; });
    return out;
  }

  return {
    buildGroups: buildGroups
  };
}));
