(function initDecodingDiagProbeStore(root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory(root);
  } else {
    root.CSDecodingDiagProbeStore = factory(root);
  }
}(typeof globalThis !== 'undefined' ? globalThis : window, function factory(root) {
  'use strict';

  var REQUIRED_TARGETS = [
    'LIT.DEC.PHG.CVC',
    'LIT.DEC.PHG.DIGRAPHS',
    'LIT.DEC.PHG.BLENDS',
    'LIT.DEC.SYL.CLOSED',
    'LIT.DEC.SYL.VCE',
    'LIT.DEC.SYL.RCONTROL',
    'LIT.DEC.SYL.VOWELTEAMS',
    'LIT.DEC.IRREG.HF'
  ];

  var cache = { loaded: false, ok: false, reason: '', data: null, tags: null, config: null };

  function byTargetMinForms(targetId) {
    if (targetId === 'LIT.DEC.PHG.CVC' || targetId === 'LIT.DEC.PHG.DIGRAPHS' || targetId === 'LIT.DEC.PHG.BLENDS' || targetId === 'LIT.DEC.SYL.VCE') return 3;
    return 2;
  }

  function readJsonPath(path) {
    var looksRemote = /^https?:\/\//i.test(String(path || ''));
    var looksLocal = /^(\/|\.\/|\.\.\/|[A-Za-z]:\\)/.test(String(path || ''));
    if (looksRemote && typeof fetch === 'function') {
      return fetch(path, { cache: 'no-store' }).then(function (r) {
        if (!r || !r.ok) throw new Error('fetch-failed:' + path);
        return r.json();
      });
    }
    if (typeof require === 'function') {
      var fs = require('fs');
      var text = fs.readFileSync(path, 'utf8');
      return Promise.resolve(JSON.parse(text));
    }
    if (looksLocal && typeof fetch === 'function') {
      return fetch(path, { cache: 'no-store' }).then(function (r) {
        if (!r || !r.ok) throw new Error('fetch-failed:' + path);
        return r.json();
      });
    }
    return Promise.reject(new Error('no-loader'));
  }

  function validateProbeData(data) {
    if (!data || data.version !== 'cs.decodingProbes.v1') throw new Error('invalid-probe-version');
    var targets = Array.isArray(data.targets) ? data.targets : [];
    REQUIRED_TARGETS.forEach(function (id) {
      var row = targets.find(function (t) { return t && t.targetId === id; });
      if (!row) throw new Error('missing-target:' + id);
      var forms = Array.isArray(row.forms) ? row.forms : [];
      if (forms.length < byTargetMinForms(id)) throw new Error('insufficient-forms:' + id);
      forms.forEach(function (f) {
        var items = Array.isArray(f.items) ? f.items : [];
        if (items.length < 15) throw new Error('short-form:' + (f.formId || id));
        items.forEach(function (item) {
          if (!item || !item.id || !item.text || !item.pattern || !Array.isArray(item.graphemes) || !Array.isArray(item.confusables)) {
            throw new Error('invalid-item:' + (f.formId || id));
          }
        });
      });
    });
  }

  function validateTagsData(data) {
    if (!data || data.version !== 'cs.decodingErrorTags.v1') throw new Error('invalid-tags-version');
  }

  function validateConfigData(data) {
    if (!data || data.version !== 'cs.decodingDiagConfig.v1') throw new Error('invalid-config-version');
  }

  function loadProbeStore(opts) {
    var o = opts || {};
    if (cache.loaded && !o.force) return Promise.resolve(cache);
    var probesPath = o.probesPath || './data/decodingdiag-probes.v1.json';
    var tagsPath = o.tagsPath || './data/decodingdiag-error-tags.v1.json';
    var configPath = o.configPath || './data/decodingdiag-config.v1.json';

    return Promise.resolve().then(function () {
      return Promise.all([
        readJsonPath(probesPath),
        readJsonPath(tagsPath),
        readJsonPath(configPath)
      ]);
    }).then(function (rows) {
      var probes = rows[0];
      var tags = rows[1];
      var config = rows[2];
      validateProbeData(probes);
      validateTagsData(tags);
      validateConfigData(config);
      cache = { loaded: true, ok: true, reason: '', data: probes, tags: tags, config: config };
      return cache;
    }).catch(function (err) {
      cache = { loaded: true, ok: false, reason: err && err.message ? err.message : 'load-failed', data: null, tags: null, config: null, manualMode: true };
      return cache;
    });
  }

  function getTarget(targetId) {
    var data = cache && cache.data;
    if (!data || !Array.isArray(data.targets)) return null;
    return data.targets.find(function (t) { return t && t.targetId === targetId; }) || null;
  }

  function listTargets() {
    var data = cache && cache.data;
    return data && Array.isArray(data.targets) ? data.targets.slice() : [];
  }

  function listForms(targetId) {
    var t = getTarget(targetId);
    return t && Array.isArray(t.forms) ? t.forms.slice() : [];
  }

  function getForm(targetId, formId) {
    var forms = listForms(targetId);
    return forms.find(function (f) { return f && f.formId === formId; }) || null;
  }

  return {
    REQUIRED_TARGETS: REQUIRED_TARGETS,
    loadProbeStore: loadProbeStore,
    listTargets: listTargets,
    listForms: listForms,
    getTarget: getTarget,
    getForm: getForm,
    _validateProbeData: validateProbeData,
    _resetForTest: function () { cache = { loaded: false, ok: false, reason: '', data: null, tags: null, config: null }; },
    _cache: function () { return cache; }
  };
}));
