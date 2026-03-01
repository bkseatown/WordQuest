(function initSkillLabels(root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.CSSkillLabels = factory();
  }
}(typeof globalThis !== 'undefined' ? globalThis : window, function factory() {
  'use strict';

  var DEFAULT_TAXONOMY = {
    strands: [
      {
        id: 'LIT.DEC',
        label: 'Decoding',
        skills: [
          { id: 'LIT.DEC.PHG', label: 'Phoneme-Grapheme Mapping', micro: [{ id: 'LIT.DEC.PHG.CVC', label: 'CVC consistency' }] },
          { id: 'LIT.DEC.SYL', label: 'Syllable Types & Vowel Patterns', micro: [{ id: 'LIT.DEC.SYL.CLOSED', label: 'Closed syllables' }, { id: 'LIT.DEC.SYL.VCE', label: 'VCe patterns' }, { id: 'LIT.DEC.SYL.RCONTROL', label: 'R-controlled vowels' }, { id: 'LIT.DEC.SYL.VOWELTEAMS', label: 'Vowel teams' }] },
          { id: 'LIT.DEC.IRREG', label: 'Heart Words', micro: [{ id: 'LIT.DEC.IRREG.SET', label: 'High-frequency irregular set' }] }
        ]
      },
      {
        id: 'LIT.MOR',
        label: 'Morphology',
        skills: [
          { id: 'LIT.MOR.INFLECT', label: 'Inflectional Morphology', micro: [{ id: 'LIT.MOR.INFLECT.S', label: '-s endings' }, { id: 'LIT.MOR.INFLECT.ED', label: '-ed endings' }, { id: 'LIT.MOR.INFLECT.ING', label: '-ing endings' }] },
          { id: 'LIT.MOR.DERIV', label: 'Derivational Morphology', micro: [{ id: 'LIT.MOR.DERIV.PREFIX', label: 'Prefix analysis' }] }
        ]
      },
      {
        id: 'LIT.FLU',
        label: 'Fluency',
        skills: [
          { id: 'LIT.FLU.ACC', label: 'Fluency Accuracy', micro: [] },
          { id: 'LIT.FLU.PRO', label: 'Fluency Prosody', micro: [] }
        ]
      },
      {
        id: 'LIT.LANG',
        label: 'Language Comprehension',
        skills: [
          { id: 'LIT.LANG.VOC', label: 'Vocabulary Access', micro: [{ id: 'LIT.LANG.VOC.SYN', label: 'Synonym precision' }, { id: 'LIT.LANG.VOC.POLY', label: 'Multiple-meaning words' }] },
          { id: 'LIT.LANG.SYN', label: 'Sentence Syntax', micro: [{ id: 'LIT.LANG.SYN.STRUCT', label: 'Sentence structure cues' }, { id: 'LIT.LANG.SYN.CLAUSE', label: 'Clause linking' }] }
        ]
      },
      {
        id: 'LIT.WRITE',
        label: 'Writing',
        skills: [
          { id: 'LIT.WRITE.SENT', label: 'Sentence Construction', micro: [] },
          { id: 'LIT.WRITE.PAR', label: 'Paragraph Cohesion', micro: [] }
        ]
      }
    ]
  };

  var cache = {
    loaded: false,
    loading: false,
    strandLabelById: {},
    skillLabelById: {},
    microLabelById: {},
    skillToStrand: {},
    microToSkill: {}
  };

  function toTitleFallback(id) {
    return String(id || '')
      .replace(/^LIT\./, '')
      .split(/[._]/)
      .filter(Boolean)
      .map(function (part) {
        return part.charAt(0) + part.slice(1).toLowerCase();
      }).join(' ');
  }

  function shortLabel(label) {
    var map = {
      'Syllable Types & Vowel Patterns': 'Syllables',
      'Phoneme-Grapheme Mapping': 'Sound Mapping',
      'Irregular Word Mapping': 'Heart Words',
      'Vocabulary Access': 'Vocabulary',
      'Sentence Syntax': 'Syntax',
      'Syntactic Processing': 'Syntax',
      'Sentence Construction': 'Sentence',
      'Paragraph Cohesion': 'Paragraphs',
      'Fluency Accuracy': 'Fluency',
      'Fluency Prosody': 'Prosody'
    };
    return map[label] || label;
  }

  function setTaxonomyData(taxonomy) {
    var strands = Array.isArray(taxonomy && taxonomy.strands) ? taxonomy.strands : DEFAULT_TAXONOMY.strands;
    cache.strandLabelById = {};
    cache.skillLabelById = {};
    cache.microLabelById = {};
    cache.skillToStrand = {};
    cache.microToSkill = {};

    strands.forEach(function (strand) {
      var strandId = String(strand && strand.id || '');
      if (!strandId) return;
      var strandLabel = String(strand.label || toTitleFallback(strandId));
      cache.strandLabelById[strandId] = strandLabel;
      (Array.isArray(strand.skills) ? strand.skills : []).forEach(function (skill) {
        var skillId = String(skill && skill.id || '');
        if (!skillId) return;
        cache.skillLabelById[skillId] = String(skill.label || toTitleFallback(skillId));
        cache.skillToStrand[skillId] = strandId;
        (Array.isArray(skill.micro) ? skill.micro : []).forEach(function (micro) {
          var microId = String(micro && micro.id || '');
          if (!microId) return;
          cache.microLabelById[microId] = String(micro.label || toTitleFallback(microId));
          cache.microToSkill[microId] = skillId;
        });
      });
    });

    cache.loaded = true;
  }

  function ensureLoaded() {
    if (cache.loaded || cache.loading || typeof fetch !== 'function') return;
    cache.loading = true;
    fetch('./data/skill-taxonomy.v1.json', { cache: 'no-store' })
      .then(function (resp) { return resp && resp.ok ? resp.json() : null; })
      .then(function (json) {
        setTaxonomyData(json || DEFAULT_TAXONOMY);
      })
      .catch(function () {
        setTaxonomyData(DEFAULT_TAXONOMY);
      })
      .finally(function () {
        cache.loading = false;
      });
  }

  function getSkillLabel(skillId) {
    if (!cache.loaded) setTaxonomyData(DEFAULT_TAXONOMY);
    ensureLoaded();
    var id = String(skillId || '');
    return cache.skillLabelById[id] || toTitleFallback(id) || 'Skill';
  }

  function getSkillBreadcrumb(skillId) {
    var id = String(skillId || '');
    var strandId = cache.skillToStrand[id];
    var strand = strandId ? cache.strandLabelById[strandId] : toTitleFallback(id.split('.').slice(0, 2).join('.'));
    return String(strand || 'Literacy') + ' -> ' + getSkillLabel(id);
  }

  function getMicroLabel(microId) {
    if (!cache.loaded) setTaxonomyData(DEFAULT_TAXONOMY);
    ensureLoaded();
    var id = String(microId || '');
    return cache.microLabelById[id] || toTitleFallback(id) || 'Micro-skill';
  }

  function getPrettyTargets(targetIds) {
    if (!Array.isArray(targetIds) || !targetIds.length) return ['Collect baseline'];
    var dedupe = [];
    targetIds.forEach(function (id) {
      var label = shortLabel(getSkillLabel(id));
      if (dedupe.indexOf(label) === -1) dedupe.push(label);
    });
    return dedupe.slice(0, 3);
  }

  if (!cache.loaded) setTaxonomyData(DEFAULT_TAXONOMY);
  ensureLoaded();

  return {
    setTaxonomyData: setTaxonomyData,
    getSkillLabel: getSkillLabel,
    getSkillBreadcrumb: getSkillBreadcrumb,
    getMicroLabel: getMicroLabel,
    getPrettyTargets: getPrettyTargets,
    _cache: cache
  };
}));
