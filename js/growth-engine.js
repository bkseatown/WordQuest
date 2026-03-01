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

  function expectedGrowthRate(tier) {
    return String(tier || 'T2').toUpperCase() === 'T3' ? 0.015 : 0.01;
  }

  function compareToExpected(studentId, skillId) {
    var velocity = computeGrowthVelocity(studentId, skillId);
    var tier = 'T2';
    var engine = root && root.CSEvidenceEngine;
    if (engine && typeof engine._getSkillRows === 'function') {
      var rows = engine._getSkillRows(studentId, skillId);
      if (rows && rows.length) {
        var latest = rows[rows.length - 1];
        tier = latest && latest.tier === 'T3' ? 'T3' : 'T2';
      }
    }
    var expected = expectedGrowthRate(tier);
    var deltaFromExpected = Number((velocity.slope - expected).toFixed(4));
    return {
      meetsExpectation: velocity.direction !== 'INSUFFICIENT' && velocity.slope >= expected,
      deltaFromExpected: deltaFromExpected,
      tier: tier,
      slope: velocity.slope
    };
  }

  function computeTrackStatus(studentId) {
    var engine = root && root.CSEvidenceEngine;
    if (!engine || typeof engine.computePriority !== 'function') {
      return { status: 'WATCH', reason: 'Priority unavailable' };
    }
    var priority = engine.computePriority(String(studentId || ''));
    var top = priority && Array.isArray(priority.topSkills) && priority.topSkills.length
      ? priority.topSkills[0]
      : null;
    if (!top || !top.skillId || top.skillId === 'MISSING_EVIDENCE') {
      return { status: 'WATCH', reason: 'Insufficient growth evidence' };
    }
    var cmp = compareToExpected(studentId, top.skillId);
    if (cmp.slope < 0) {
      return { status: 'OFF_TRACK', reason: 'Negative growth trend vs expected slope' };
    }
    if (cmp.meetsExpectation) {
      return { status: 'ON_TRACK', reason: 'Growth rate meets tier expectation' };
    }
    return { status: 'WATCH', reason: 'Growth below expected rate' };
  }

  return {
    computeGrowthVelocity: computeGrowthVelocity,
    expectedGrowthRate: expectedGrowthRate,
    compareToExpected: compareToExpected,
    computeTrackStatus: computeTrackStatus
  };
}));
