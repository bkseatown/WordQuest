(function initProgressSummary(root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.CSProgressSummary = factory();
  }
}(typeof globalThis !== 'undefined' ? globalThis : window, function factory() {
  'use strict';

  function buildExecutiveSummary(caseloadMetrics) {
    var rows = Array.isArray(caseloadMetrics) ? caseloadMetrics : [];
    if (!rows.length) {
      return {
        headline: 'No caseload evidence yet',
        bulletPoints: ['Run quick checks to establish baseline signals.'],
        riskShiftTrend: 'No trend data'
      };
    }
    var highRisk = rows.filter(function (r) { return Number(r.overallPriority || 0) >= 1.15; }).length;
    var avgStale = rows.reduce(function (sum, r) { return sum + Number(r.stalenessDays || 0); }, 0) / rows.length;
    var improving = rows.filter(function (r) { return String(r.trajectory || '') === 'UP'; }).length;
    var variableGrowth = rows.filter(function (r) { return String(r.stability || '') === 'VARIABLE'; }).length;
    var dominant = rows.reduce(function (acc, row) {
      var key = String(row.topSkillId || 'BASELINE');
      acc[key] = (acc[key] || 0) + 1;
      return acc;
    }, {});
    var dominantSkillId = Object.keys(dominant).sort(function (a, b) { return dominant[b] - dominant[a]; })[0] || 'Baseline';

    var bullets = [
      highRisk + ' students high-risk',
      'Average cadence ' + Math.round(avgStale) + 'd',
      improving + ' students improving'
    ];
    if (variableGrowth > Math.ceil(rows.length * 0.3)) {
      bullets.push('Growth variability elevated in ' + variableGrowth + ' students');
    }

    return {
      headline: dominantSkillId + ' remains primary driver (' + Math.round((dominant[dominantSkillId] || 0) * 100 / rows.length) + '% of caseload)',
      bulletPoints: bullets,
      riskShiftTrend: highRisk > Math.ceil(rows.length * 0.3) ? 'Risk elevated' : 'Risk stabilizing'
    };
  }

  return {
    buildExecutiveSummary: buildExecutiveSummary
  };
}));
