(function initRiskBands(root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.CSRiskBands = factory();
  }
}(typeof globalThis !== 'undefined' ? globalThis : window, function factory() {
  'use strict';

  var HIGH_MIN = 1.15;
  var MODERATE_MIN = 0.65;

  function toNumber(v, fallback) {
    var n = Number(v);
    return Number.isFinite(n) ? n : (fallback || 0);
  }

  function pct(part, total) {
    if (!total) return 0;
    return Math.round((part / total) * 100);
  }

  function computeRiskBand(overallPriority) {
    var p = toNumber(overallPriority, 0);
    if (p >= HIGH_MIN) {
      return { band: 'HIGH', label: 'High Risk', short: 'High', colorClass: 'td-risk-high' };
    }
    if (p >= MODERATE_MIN) {
      return { band: 'MODERATE', label: 'Moderate', short: 'Mod', colorClass: 'td-risk-moderate' };
    }
    return { band: 'STABLE', label: 'Stable', short: 'Stable', colorClass: 'td-risk-stable' };
  }

  function bucketCaseload(priorities) {
    var list = Array.isArray(priorities) ? priorities : [];
    var highCount = 0;
    var moderateCount = 0;
    var stableCount = 0;

    list.forEach(function (value) {
      var b = computeRiskBand(value).band;
      if (b === 'HIGH') highCount += 1;
      else if (b === 'MODERATE') moderateCount += 1;
      else stableCount += 1;
    });

    var total = highCount + moderateCount + stableCount;
    return {
      highCount: highCount,
      moderateCount: moderateCount,
      stableCount: stableCount,
      total: total,
      pctHigh: pct(highCount, total),
      pctModerate: pct(moderateCount, total),
      pctStable: pct(stableCount, total)
    };
  }

  return {
    HIGH_MIN: HIGH_MIN,
    MODERATE_MIN: MODERATE_MIN,
    computeRiskBand: computeRiskBand,
    bucketCaseload: bucketCaseload
  };
}));
