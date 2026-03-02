(function sasAlignmentLibraryModule(root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
    return;
  }
  root.CSSASLibrary = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  var PACK_URL = './docs/sas/derived/sas_alignment_pack.json';
  var INDEX_URL = './docs/sas/derived/sas_alignment_index.json';

  var cache = {
    pack: null,
    index: null,
    loaded: false
  };

  function normalize(v) {
    return String(v || '').toLowerCase().trim();
  }

  function fetchJson(url) {
    return fetch(url, { cache: 'no-cache' }).then(function (res) {
      if (!res.ok) throw new Error('HTTP ' + res.status + ' for ' + url);
      return res.json();
    });
  }

  function ensureLoaded() {
    if (cache.loaded && cache.pack && cache.index) {
      return Promise.resolve(cache);
    }
    return Promise.all([fetchJson(PACK_URL), fetchJson(INDEX_URL)]).then(function (rows) {
      cache.pack = rows[0];
      cache.index = rows[1];
      cache.loaded = true;
      return cache;
    });
  }

  function listSection(pack, tab) {
    if (!pack || typeof pack !== 'object') return [];
    if (tab === 'interventions') return Array.isArray(pack.interventions) ? pack.interventions : [];
    if (tab === 'goals') return Array.isArray(pack.goal_bank) ? pack.goal_bank : [];
    if (tab === 'assessments') return Array.isArray(pack.assessments) ? pack.assessments : [];
    if (tab === 'principles') return Array.isArray(pack.beliefs_principles) ? pack.beliefs_principles : [];
    if (tab === 'templates') return Array.isArray(pack.forms_templates) ? pack.forms_templates : [];
    return [];
  }

  function toTitle(tab, row) {
    if (!row) return '';
    if (tab === 'goals') return row.skill || row.id;
    if (tab === 'principles') return row.principle || row.id;
    return row.name || row.label || row.id;
  }

  function rowMatches(tab, row, query) {
    if (!query) return true;
    var blob = normalize([
      row.id,
      row.name,
      row.label,
      row.domain,
      row.area,
      row.skill,
      row.goal_template_smart,
      row.principle,
      row.usage_notes,
      Array.isArray(row.tags) ? row.tags.join(' ') : '',
      Array.isArray(row.grades) ? row.grades.join(' ') : ''
    ].join(' '));
    return blob.indexOf(query) !== -1;
  }

  function search(pack, opts) {
    var tab = (opts && opts.tab) || 'interventions';
    var query = normalize(opts && opts.query);
    var gradeBand = normalize(opts && opts.gradeBand);
    var rows = listSection(pack, tab);
    return rows.filter(function (row) {
      if (!rowMatches(tab, row, query)) return false;
      if (!gradeBand) return true;
      if (tab === 'goals' && row.grade_band) return normalize(row.grade_band).indexOf(gradeBand) !== -1;
      if (Array.isArray(row.grades) && row.grades.length) {
        return normalize(row.grades.join(' ')).indexOf(gradeBand) !== -1;
      }
      return true;
    }).slice(0, 60).map(function (row) {
      return {
        id: row.id,
        tab: tab,
        title: toTitle(tab, row),
        subtitle: row.domain || row.area || row.grade_band || row.tier || '',
        row: row
      };
    });
  }

  function suggestGoals(pack, opts) {
    var domain = normalize(opts && opts.domain);
    var gradeBand = normalize(opts && opts.gradeBand);
    var baseline = normalize(opts && opts.baseline);
    var goals = Array.isArray(pack && pack.goal_bank) ? pack.goal_bank : [];
    return goals.filter(function (goal) {
      var gDomain = normalize(goal.domain);
      var gGrade = normalize(goal.grade_band);
      if (domain && gDomain.indexOf(domain) === -1) return false;
      if (gradeBand && gGrade.indexOf(gradeBand) === -1) return false;
      if (!baseline) return true;
      var blob = normalize([goal.skill, goal.goal_template_smart, goal.progress_monitoring_method].join(' '));
      return blob.indexOf(baseline.split(' ')[0] || '') !== -1 || true;
    }).slice(0, 5);
  }

  function describeItem(tab, row) {
    if (!row) return '';
    if (tab === 'interventions') {
      return [
        row.name,
        row.area ? ('Area: ' + row.area) : '',
        row.tier ? ('Tier: ' + row.tier) : '',
        row.dosage ? ('Dosage: ' + row.dosage) : '',
        row.progress_monitoring ? ('Progress monitoring: ' + row.progress_monitoring) : ''
      ].filter(Boolean).join('\n');
    }
    if (tab === 'goals') {
      return [
        row.skill,
        row.goal_template_smart,
        row.progress_monitoring_method ? ('Progress monitoring: ' + row.progress_monitoring_method) : ''
      ].filter(Boolean).join('\n');
    }
    if (tab === 'assessments') {
      return [
        row.name,
        row.cadence ? ('Cadence: ' + row.cadence) : '',
        row.what_it_measures || ''
      ].filter(Boolean).join('\n');
    }
    if (tab === 'principles') return [row.principle, row.implication_for_design].filter(Boolean).join('\n');
    return [row.name, row.usage_notes].filter(Boolean).join('\n');
  }

  return {
    ensureLoaded: ensureLoaded,
    listSection: listSection,
    search: search,
    suggestGoals: suggestGoals,
    describeItem: describeItem
  };
});
