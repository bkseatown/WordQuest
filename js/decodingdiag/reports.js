(function initDecodingDiagReports(root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory(root);
  } else {
    root.CSDecodingDiagReports = factory(root);
  }
}(typeof globalThis !== 'undefined' ? globalThis : window, function factory(root) {
  'use strict';

  function pct(v) { return Math.round((Number(v || 0) * 100)); }

  function labelForSkill(skillId) {
    var labels = root && root.CSSkillLabels;
    if (labels && typeof labels.getSkillBreadcrumb === 'function') return labels.getSkillBreadcrumb(skillId);
    return String(skillId || 'Decoding');
  }

  function topTags(summary) {
    var rows = summary && Array.isArray(summary.errorPattern) ? summary.errorPattern.slice(0, 3) : [];
    return rows.length ? rows.join(', ') : 'none noted';
  }

  function nextStep(summary) {
    var tags = summary && Array.isArray(summary.errorPattern) ? summary.errorPattern.join(',') : '';
    if (tags.indexOf('vowel_confusion_long') >= 0) return 'VCe contrast drill (cap/cape, kit/kite)';
    if (tags.indexOf('blend_reduction') >= 0) return 'Continuous blending with CCVC/CVCC prompts';
    if (tags.indexOf('digraph_error') >= 0) return 'Digraph mapping and quick sort (sh/th/ch/wh)';
    if (tags.indexOf('told_by_teacher') >= 0) return 'Reduce list complexity or run untimed diagnostic';
    return 'Continue targeted decoding practice with brief daily probes';
  }

  function buildStudentNote(ctx) {
    var c = ctx || {};
    var s = c.summary || {};
    var timed = c.mode === 'timed';
    return [
      'Date: ' + new Date().toISOString().slice(0, 10),
      'Probe: Decoding Diagnostic (' + (timed ? 'timed' : 'untimed') + ') - ' + labelForSkill(c.targetId) + ' (Form ' + (c.formId || '--') + ')',
      'Tier: ' + (c.tier || 'T2') + ' | Dose: ' + (timed ? 3 : 5) + ' min',
      'Result: ' + pct(s.accuracy) + '% accuracy' + (timed ? (', ' + (s.wcpm || 0) + ' WCPM') : ''),
      'Patterns: ' + topTags(s),
      'Next step: ' + nextStep(s)
    ].join('\n');
  }

  function buildFamilyNote(ctx) {
    var c = ctx || {};
    var s = c.summary || {};
    var timed = c.mode === 'timed';
    return [
      'Date: ' + new Date().toISOString().slice(0, 10),
      'Today we practiced reading words with ' + labelForSkill(c.targetId) + '.',
      'Your child read ' + pct(s.accuracy) + '% correctly' + (timed ? (' at ' + (s.wcpm || 0) + ' words/min') : '') + '.',
      'Next step: ' + nextStep(s) + '.'
    ].join('\n');
  }

  function buildAdminSummary(ctx) {
    var c = ctx || {};
    var s = c.summary || {};
    var timed = c.mode === 'timed';
    var cadenceDays = c.tier === 'T3' ? 7 : 14;
    return [
      'Date: ' + new Date().toISOString().slice(0, 10),
      'Student: ' + (c.studentId || '--') + ' | Tier ' + (c.tier || 'T2'),
      'Probe: ' + labelForSkill(c.targetId) + ' (Form ' + (c.formId || '--') + ') - ' + (timed ? 'timed' : 'untimed'),
      'Accuracy: ' + pct(s.accuracy) + '%' + (timed ? (', ' + (s.wcpm || 0) + ' WCPM') : '') + '; cadence target ' + cadenceDays + 'd',
      'Key errors: ' + topTags(s) + '. Instructional implication: ' + nextStep(s)
    ].join('\n');
  }

  return {
    buildStudentNote: buildStudentNote,
    buildFamilyNote: buildFamilyNote,
    buildAdminSummary: buildAdminSummary
  };
}));
