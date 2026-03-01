(function initSkillStore(root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory(root);
  } else {
    root.CSSkillStore = factory(root);
  }
}(typeof globalThis !== 'undefined' ? globalThis : window, function factory(root) {
  'use strict';

  var REQUIRED_IDS = [
    'LIT.DEC.PHG', 'LIT.DEC.SYL', 'LIT.DEC.IRREG',
    'LIT.MOR.INFLECT', 'LIT.MOR.DERIV',
    'LIT.FLU.ACC', 'LIT.FLU.PRO',
    'LIT.LANG.VOC', 'LIT.LANG.SYN',
    'LIT.WRITE.SENT', 'LIT.WRITE.PAR',
    'LIT.DEC.PHG.CVC', 'LIT.DEC.PHG.DIGRAPHS', 'LIT.DEC.PHG.BLENDS',
    'LIT.DEC.SYL.CLOSED', 'LIT.DEC.SYL.VCE', 'LIT.DEC.SYL.RCONTROL', 'LIT.DEC.SYL.VOWELTEAMS',
    'LIT.DEC.IRREG.HF',
    'LIT.MOR.INFLECT.S', 'LIT.MOR.INFLECT.ED', 'LIT.MOR.INFLECT.ING',
    'LIT.MOR.DERIV.PREFIX', 'LIT.MOR.DERIV.SUFFIX',
    'LIT.LANG.VOC.SYN', 'LIT.LANG.VOC.POLY',
    'LIT.LANG.SYN.STRUCT', 'LIT.LANG.SYN.CLAUSE'
  ];

  var state = {
    inited: false,
    disabled: false,
    reason: '',
    taxonomy: null,
    mapping: null,
    dictionaries: {
      strandLabelById: {},
      skillLabelById: {},
      microLabelById: {},
      parentSkillByMicroId: {},
      parentStrandBySkillId: {}
    }
  };

  var initPromise = null;

  function logError(msg) {
    try { console.error('[SkillStore] ' + msg); } catch (_e) {}
  }

  function buildDictionaries(taxonomy) {
    var dict = {
      strandLabelById: {},
      skillLabelById: {},
      microLabelById: {},
      parentSkillByMicroId: {},
      parentStrandBySkillId: {}
    };

    var strands = Array.isArray(taxonomy && taxonomy.strands) ? taxonomy.strands : [];
    strands.forEach(function (strand) {
      var strandId = String(strand && strand.id || '');
      if (!strandId) return;
      dict.strandLabelById[strandId] = String(strand.label || strandId);
      var skills = Array.isArray(strand.skills) ? strand.skills : [];
      skills.forEach(function (skill) {
        var skillId = String(skill && skill.id || '');
        if (!skillId) return;
        dict.skillLabelById[skillId] = String(skill.label || skillId);
        dict.parentStrandBySkillId[skillId] = strandId;
        var micro = Array.isArray(skill.micro) ? skill.micro : [];
        micro.forEach(function (m) {
          var microId = String(m && m.id || '');
          if (!microId) return;
          dict.microLabelById[microId] = String(m.label || microId);
          dict.parentSkillByMicroId[microId] = skillId;
        });
      });
    });
    return dict;
  }

  function validateRequired(dict) {
    var missing = REQUIRED_IDS.filter(function (id) {
      return !(dict.skillLabelById[id] || dict.microLabelById[id]);
    });
    return missing;
  }

  function initSkillStore() {
    if (state.inited) return Promise.resolve(getSkillStore());
    if (initPromise) return initPromise;

    var registry = root && root.CSDataRegistry;
    if (!registry || typeof registry.loadJsonAsset !== 'function' || !registry.DATA_ASSETS) {
      state.disabled = true;
      state.reason = 'CSDataRegistry unavailable';
      logError(state.reason);
      return Promise.resolve(getSkillStore());
    }

    initPromise = Promise.all([
      registry.loadJsonAsset(registry.DATA_ASSETS.skillTaxonomy),
      registry.loadJsonAsset(registry.DATA_ASSETS.skillMapping)
    ]).then(function (loaded) {
      var taxonomy = loaded[0];
      var mapping = loaded[1];
      var dict = buildDictionaries(taxonomy);
      var missing = validateRequired(dict);

      if (missing.length) {
        state.disabled = true;
        state.reason = 'Missing required taxonomy IDs: ' + missing.join(', ');
        logError(state.reason);
      } else {
        state.disabled = false;
        state.reason = '';
      }

      state.taxonomy = taxonomy;
      state.mapping = mapping;
      state.dictionaries = dict;
      state.inited = true;
      return getSkillStore();
    }).catch(function (err) {
      state.disabled = true;
      state.reason = err && err.message ? err.message : 'Unknown load error';
      logError(state.reason);
      return getSkillStore();
    });

    return initPromise;
  }

  function getSkillStore() {
    return {
      taxonomy: state.taxonomy,
      mapping: state.mapping,
      dictionaries: state.dictionaries,
      disabled: state.disabled,
      reason: state.reason,
      inited: state.inited
    };
  }

  return {
    initSkillStore: initSkillStore,
    getSkillStore: getSkillStore,
    _state: state
  };
}));
