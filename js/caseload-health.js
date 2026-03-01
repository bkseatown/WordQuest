(function initCaseloadHealth(root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory(root);
  } else {
    root.CSCaseloadHealth = factory(root);
  }
}(typeof globalThis !== 'undefined' ? globalThis : window, function factory(root) {
  'use strict';

  function clamp(v, lo, hi) {
    return Math.max(lo, Math.min(hi, v));
  }

  function toNum(v, fallback) {
    var n = Number(v);
    return Number.isFinite(n) ? n : (fallback || 0);
  }

  function computeCaseloadHealth(studentsPriorityData) {
    var rows = Array.isArray(studentsPriorityData) ? studentsPriorityData : [];
    if (!rows.length) {
      return { score: 100, band: 'Stable', highRiskPct: 0, avgNeed: 0, avgStalenessNorm: 0 };
    }
    var total = rows.length;
    var highRisk = 0;
    var sumPriority = 0;
    var sumNeed = 0;
    var sumStaleNorm = 0;

    rows.forEach(function (row) {
      var p = toNum(row.overallPriority, 0);
      var n = toNum(row.avgNeed, 0.5);
      var s = toNum(row.avgStalenessNorm, 0);
      sumPriority += p;
      sumNeed += n;
      sumStaleNorm += s;
      if (p >= 1.15) highRisk += 1;
    });

    var avgPriority = sumPriority / total;
    var score = clamp(Math.round(100 - (avgPriority * 35)), 0, 100);
    var band = score >= 80 ? 'Stable' : (score >= 60 ? 'Watch' : 'Intensive');
    return {
      score: score,
      band: band,
      highRiskPct: Math.round((highRisk / total) * 100),
      avgNeed: Number((sumNeed / total).toFixed(3)),
      avgStalenessNorm: Number((sumStaleNorm / total).toFixed(3))
    };
  }

  return {
    computeCaseloadHealth: computeCaseloadHealth
  };
}));
