(function initCelebrations(root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory(root);
  } else {
    root.CSCelebrations = factory(root);
  }
}(typeof globalThis !== 'undefined' ? globalThis : window, function factory(root) {
  'use strict';

  function getSkillLabel(skillId) {
    var labels = root && root.CSSkillLabels;
    if (labels && typeof labels.getSkillLabel === 'function') return labels.getSkillLabel(skillId);
    return String(skillId || 'skill');
  }

  function getCelebration(studentId, topSkills) {
    var list = Array.isArray(topSkills) ? topSkills : [];
    var engine = root && root.CSEvidenceEngine;
    if (!studentId || !engine || typeof engine.getSkillTrajectory !== 'function') return null;

    for (var i = 0; i < list.length; i += 1) {
      var skill = list[i] || {};
      var skillId = String(skill.skillId || '');
      if (!skillId) continue;

      if (String(skill.band || '').toUpperCase() === 'HIGH' && Number(skill.stalenessNorm || 0) > 1.5) {
        continue;
      }

      var trend = engine.getSkillTrajectory(studentId, skillId, 3);
      if (trend && trend.direction === 'UP' && Number(trend.delta || 0) >= 0.08) {
        return {
          text: 'Improving in ' + getSkillLabel(skillId),
          skillId: skillId
        };
      }
    }
    return null;
  }

  return {
    getCelebration: getCelebration
  };
}));
