(function initDecodingDiagScoring(root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.CSDecodingDiagScoring = factory();
  }
}(typeof globalThis !== 'undefined' ? globalThis : window, function factory() {
  'use strict';

  function clamp(v, lo, hi) {
    return Math.max(lo, Math.min(hi, v));
  }

  function round(v, digits) {
    var p = Math.pow(10, digits || 0);
    return Math.round((Number(v) || 0) * p) / p;
  }

  function ensureArray(v) {
    return Array.isArray(v) ? v : [];
  }

  function aggregateErrorTags(responses) {
    var rows = ensureArray(responses);
    var counts = {};
    rows.forEach(function (r) {
      var tags = ensureArray(r && r.tags);
      if (r && r.status === 'told') tags = tags.concat(['told_by_teacher']);
      if (r && r.status === 'self_correct') tags = tags.concat(['self_correction']);
      tags.forEach(function (t) {
        var id = String(t || '').trim();
        if (!id) return;
        counts[id] = (counts[id] || 0) + 1;
      });
    });
    return Object.keys(counts)
      .sort(function (a, b) {
        if (counts[b] !== counts[a]) return counts[b] - counts[a];
        return a.localeCompare(b);
      })
      .map(function (id) { return id + ':' + counts[id]; });
  }

  function computeDiscontinueSuggested(responses, n) {
    var rows = ensureArray(responses).filter(function (r) { return r && r.status !== 'skipped'; }).slice(0, Math.max(1, Number(n || 5)));
    if (!rows.length) return false;
    var correct = rows.filter(function (r) { return r.status === 'correct' || r.status === 'self_correct'; }).length;
    return rows.length >= Math.max(1, Number(n || 5)) && correct === 0;
  }

  function masteryBand(accuracy) {
    var a = Number(accuracy || 0);
    if (a >= 0.9) return 'Mastered';
    if (a >= 0.7) return 'Developing';
    return 'Emerging';
  }

  function scoreSession(input) {
    var responses = ensureArray(input && input.responses);
    var elapsedSec = Math.max(1, Number(input && input.elapsedSec || 0));
    var timedSeconds = Math.max(1, Number(input && input.timedSeconds || 60));
    var isTimed = !!(input && input.mode === 'timed');

    var attemptedRows = responses.filter(function (r) { return r && r.status !== 'skipped'; });
    var attempted = attemptedRows.length;
    var correctCredit = attemptedRows.filter(function (r) { return r.status === 'correct' || r.status === 'self_correct'; }).length;
    var selfCorrections = attemptedRows.filter(function (r) { return r.status === 'self_correct'; }).length;
    var accuracy = correctCredit / Math.max(1, attempted);
    var elapsedUsed = isTimed ? Math.min(elapsedSec, timedSeconds) : elapsedSec;
    var wcpm = isTimed ? round(correctCredit / (elapsedUsed / 60), 1) : undefined;

    return {
      attempts: attempted,
      correctCredit: correctCredit,
      selfCorrections: selfCorrections,
      accuracy: round(clamp(accuracy, 0, 1), 4),
      wcpm: Number.isFinite(wcpm) ? wcpm : undefined,
      errorPattern: aggregateErrorTags(attemptedRows),
      discontinueSuggested: computeDiscontinueSuggested(attemptedRows, input && input.discontinueN || 5),
      sessionBand: masteryBand(accuracy)
    };
  }

  function isMasteryConfirmed(sessionRows, cadenceDays) {
    var rows = ensureArray(sessionRows).slice().sort(function (a, b) {
      return Date.parse(String(b && b.timestamp || 0)) - Date.parse(String(a && a.timestamp || 0));
    });
    if (rows.length < 2) return false;
    var a = rows[0];
    var b = rows[1];
    var accA = Number(a && a.result && a.result.accuracy || 0);
    var accB = Number(b && b.result && b.result.accuracy || 0);
    if (accA < 0.9 || accB < 0.9) return false;
    var cDays = Math.max(1, Number(cadenceDays || 14));
    var diffMs = Math.abs(Date.parse(String(a.timestamp || 0)) - Date.parse(String(b.timestamp || 0)));
    return diffMs <= cDays * 86400000;
  }

  return {
    scoreSession: scoreSession,
    aggregateErrorTags: aggregateErrorTags,
    computeDiscontinueSuggested: computeDiscontinueSuggested,
    masteryBand: masteryBand,
    isMasteryConfirmed: isMasteryConfirmed
  };
}));
