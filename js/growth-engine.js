(function initGrowthEngine(root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory(root);
  } else {
    root.CSGrowthEngine = factory(root);
  }
}(typeof globalThis !== 'undefined' ? globalThis : window, function factory(root) {
  'use strict';

  function toMs(v) {
    var n = Date.parse(String(v || ''));
    return Number.isFinite(n) ? n : 0;
  }

  function getRows(studentId, skillId) {
    var engine = root && root.CSEvidenceEngine;
    if (!engine || typeof engine._getSkillRows !== 'function') return [];
    return engine._getSkillRows(studentId, skillId).slice(-4);
  }

  function masteryFromRows(rows) {
    return rows.map(function (r) {
      var acc = r && r.result ? Number(r.result.accuracy) : NaN;
      return Number.isFinite(acc) ? Math.max(0, Math.min(1, acc)) : null;
    }).filter(function (v) { return v != null; });
  }

  function computeGrowthVelocity(studentId, skillId) {
    var rows = getRows(studentId, skillId);
    var mastery = masteryFromRows(rows);
    if (rows.length < 3 || mastery.length < 3) {
      return { slope: 0, direction: 'INSUFFICIENT', weeksSpan: 0, confidence: 0.25 };
    }
    var firstTs = toMs(rows[0].timestamp);
    var lastTs = toMs(rows[rows.length - 1].timestamp);
    var weeks = Math.max(0.25, (lastTs - firstTs) / (7 * 86400000));
    var slope = (mastery[mastery.length - 1] - mastery[0]) / weeks;
    var direction = slope >= 0.02 ? 'ACCELERATING' : (slope <= -0.02 ? 'DECLINING' : 'FLAT');
    var confidence = Math.min(1, rows.length / 4);
    return {
      slope: Number(slope.toFixed(4)),
      direction: direction,
      weeksSpan: Number(weeks.toFixed(2)),
      confidence: Number(confidence.toFixed(3))
    };
  }

  return {
    computeGrowthVelocity: computeGrowthVelocity
  };
}));
