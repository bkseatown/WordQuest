(function initFlexGroupEngine(root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.CSFlexGroupEngine = factory();
  }
}(typeof globalThis !== 'undefined' ? globalThis : window, function factory() {
  'use strict';

  function chunk(rows, size) {
    var out = [];
    for (var i = 0; i < rows.length; i += size) {
      out.push(rows.slice(i, i + size));
    }
    return out;
  }

  function deriveSkillId(row) {
    return row && row.priority && row.priority.topSkills && row.priority.topSkills[0]
      ? String(row.priority.topSkills[0].skillId || '')
      : '';
  }

  function deriveTier(row) {
    return row && row.priority && row.priority.topSkills && row.priority.topSkills[0]
      ? String(row.priority.topSkills[0].tier || 'T2')
      : 'T2';
  }

  function getSkillLabel(skillId, labelsApi) {
    if (labelsApi && typeof labelsApi.getSkillLabel === 'function') {
      return labelsApi.getSkillLabel(skillId);
    }
    return skillId || 'Baseline';
  }

  function buildGroups(rows, opts) {
    var options = opts || {};
    var labelApi = options.labelsApi || null;
    var getTierConfig = typeof options.getTierConfig === 'function'
      ? options.getTierConfig
      : function () { return { minutesPerSession: 20, groupSizeMax: 4 }; };

    var bySkill = {};
    (Array.isArray(rows) ? rows : []).forEach(function (row) {
      var skill = deriveSkillId(row) || 'BASELINE';
      if (!bySkill[skill]) bySkill[skill] = [];
      bySkill[skill].push(row);
    });

    var groups = [];
    Object.keys(bySkill).forEach(function (skillId) {
      var skillRows = bySkill[skillId];
      if (!skillRows.length) return;
      var tier = deriveTier(skillRows[0]);
      var cfg = getTierConfig(tier) || {};
      var maxSize = Math.max(2, Number(cfg.groupSizeMax || (tier === 'T3' ? 2 : 4)));
      var slots = chunk(skillRows, maxSize);
      slots.forEach(function (slot) {
        if (slot.length < 2 && groups.length) return;
        groups.push({
          skillId: skillId,
          skillLabel: getSkillLabel(skillId, labelApi),
          tier: tier,
          minutesPerSession: Number(cfg.minutesPerSession || (tier === 'T3' ? 25 : 20)),
          students: slot.map(function (row) { return row.student; })
        });
      });
    });

    return {
      groups: groups.slice(0, 3)
    };
  }

  return {
    buildGroups: buildGroups
  };
}));
