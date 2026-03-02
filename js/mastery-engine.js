(function initMasteryEngine(root, factory) {
  if (typeof module === "object" && module.exports) {
    module.exports = factory();
    return;
  }
  root.CSMasteryEngine = factory();
})(typeof self !== "undefined" ? self : this, function () {
  "use strict";

  var MasteryBand = Object.freeze({
    NOT_STARTED: "NOT_STARTED",
    EMERGING: "EMERGING",
    DEVELOPING: "DEVELOPING",
    SECURE: "SECURE",
    AUTOMATED: "AUTOMATED"
  });

  var BAND_RANK = Object.freeze({
    NOT_STARTED: 0,
    EMERGING: 1,
    DEVELOPING: 2,
    SECURE: 3,
    AUTOMATED: 4
  });

  function clamp01(value) {
    var n = Number(value);
    if (!Number.isFinite(n)) return 0;
    return Math.max(0, Math.min(1, n));
  }

  function toTime(point) {
    if (!point || typeof point !== "object") return 0;
    if (Number.isFinite(Number(point.timestamp))) return Number(point.timestamp);
    if (Number.isFinite(Number(point.date))) return Number(point.date);
    var parsed = Date.parse(String(point.timestamp || point.date || ""));
    return Number.isFinite(parsed) ? parsed : 0;
  }

  function sortPoints(dataPoints) {
    var rows = Array.isArray(dataPoints) ? dataPoints.slice() : [];
    rows.sort(function (a, b) { return toTime(a) - toTime(b); });
    return rows;
  }

  function bandFromMean(mean) {
    if (mean < 0.6) return MasteryBand.EMERGING;
    if (mean < 0.75) return MasteryBand.DEVELOPING;
    if (mean < 0.9) return MasteryBand.SECURE;
    return MasteryBand.AUTOMATED;
  }

  function computeMasteryBand(dataPoints) {
    var sorted = sortPoints(dataPoints);
    if (!sorted.length) return MasteryBand.NOT_STARTED;

    var recent = sorted.slice(-3);
    var valid = recent
      .map(function (point) { return Number(point && point.accuracy); })
      .filter(function (n) { return Number.isFinite(n); });
    if (!valid.length) return MasteryBand.NOT_STARTED;

    var mean = valid.reduce(function (sum, n) { return sum + clamp01(n); }, 0) / valid.length;
    return bandFromMean(mean);
  }

  function computeMasteryState(dataPoints) {
    var sorted = sortPoints(dataPoints);
    var band = computeMasteryBand(sorted);
    var stableCount = 0;
    for (var i = sorted.length - 1; i >= 0; i -= 1) {
      var acc = Number(sorted[i] && sorted[i].accuracy);
      if (!Number.isFinite(acc)) break;
      var pointBand = bandFromMean(clamp01(acc));
      if (pointBand === MasteryBand.SECURE || pointBand === MasteryBand.AUTOMATED) stableCount += 1;
      else break;
    }
    return { band: band, stableCount: stableCount };
  }

  function computeMtssTrendDecision(dataPoints, goalAccuracy) {
    var sorted = sortPoints(dataPoints);
    if (sorted.length < 6) return "HOLD";
    var goal = clamp01(Number.isFinite(Number(goalAccuracy)) ? Number(goalAccuracy) : 0.85);
    var recent4 = sorted.slice(-4).map(function (point) { return clamp01(Number(point && point.accuracy)); });
    if (recent4.every(function (a) { return a >= goal; })) return "FADE";
    if (recent4.every(function (a) { return a < goal; })) return "INTENSIFY";
    return "HOLD";
  }

  function nextBestSkill(skillGraph, studentMastery) {
    var graph = skillGraph && typeof skillGraph === "object" ? skillGraph : {};
    var mastery = studentMastery && typeof studentMastery === "object" ? studentMastery : {};
    var allSkills = Object.keys(graph);
    if (!allSkills.length) return null;

    var queue = allSkills.filter(function (id) {
      var prereq = Array.isArray(graph[id] && graph[id].prereq) ? graph[id].prereq : [];
      return prereq.length === 0;
    });
    var seen = {};

    while (queue.length) {
      var skillId = String(queue.shift() || "");
      if (!skillId || seen[skillId]) continue;
      seen[skillId] = true;
      var row = graph[skillId] || {};
      var prereq = Array.isArray(row.prereq) ? row.prereq : [];
      var next = Array.isArray(row.next) ? row.next : [];
      var prereqReady = prereq.every(function (p) {
        var band = mastery[p] || MasteryBand.NOT_STARTED;
        return (BAND_RANK[band] || 0) >= BAND_RANK[MasteryBand.DEVELOPING];
      });
      var currentBand = mastery[skillId] || MasteryBand.NOT_STARTED;
      if (prereqReady && (currentBand === MasteryBand.NOT_STARTED || currentBand === MasteryBand.EMERGING)) {
        return skillId;
      }
      next.forEach(function (n) {
        if (!seen[n]) queue.push(n);
      });
    }

    return null;
  }

  function generateFadeSchedule(weeks, steps) {
    var total = Math.max(1, Math.floor(Number(weeks || 5) * Number(steps || 1)));
    if (total === 1) return [1];
    var schedule = [];
    for (var i = 0; i < total; i += 1) {
      schedule.push(Number((1 - (i / (total - 1))).toFixed(6)));
    }
    return schedule;
  }

  return {
    MasteryBand: MasteryBand,
    computeMasteryBand: computeMasteryBand,
    computeMasteryState: computeMasteryState,
    computeMtssTrendDecision: computeMtssTrendDecision,
    nextBestSkill: nextBestSkill,
    generateFadeSchedule: generateFadeSchedule
  };
});
