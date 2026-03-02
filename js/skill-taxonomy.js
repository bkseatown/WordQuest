(function skillTaxonomyModule(root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
    return;
  }
  root.CSSkillTaxonomy = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  var SKILLS = [
    { id: 'decoding.short_vowels', domain: 'decoding', label: 'Short Vowels', short: 'Short Vowels', desc: 'Accurate short-vowel decoding in CVC and closed syllables.', coverage: ['wordquest'] },
    { id: 'decoding.long_vowels', domain: 'decoding', label: 'Long Vowels / Silent-e', short: 'Long Vowels', desc: 'Consistent long-vowel control across VCe and open patterns.', coverage: ['wordquest'] },
    { id: 'orthography.pattern_control', domain: 'orthography', label: 'Pattern Control', short: 'Patterns', desc: 'Use of orthographic constraints and pattern-consistent guesses.', coverage: ['wordquest'] },
    { id: 'morphology.inflectional', domain: 'morphology', label: 'Inflectional Morphology', short: 'Inflections', desc: 'Awareness of -s/-ed/-ing patterns in decoding and word building.', coverage: ['wordquest', 'writing-studio'] },
    { id: 'morphology.derivational', domain: 'morphology', label: 'Derivational Morphology', short: 'Derivations', desc: 'Awareness of prefixes/suffixes and root shifts.', coverage: ['wordquest', 'sentence-surgery', 'writing-studio'] },
    { id: 'fluency.pacing', domain: 'fluency', label: 'Fluency Pacing', short: 'Pacing', desc: 'Efficient pace while preserving accuracy.', coverage: ['reading-lab', 'wordquest'] },
    { id: 'sentence.syntax_clarity', domain: 'sentence', label: 'Syntax Clarity', short: 'Syntax', desc: 'Accurate sentence structure and clause management.', coverage: ['sentence-surgery', 'writing-studio'] },
    { id: 'writing.elaboration', domain: 'writing', label: 'Writing Elaboration', short: 'Elaboration', desc: 'Expands and supports ideas with coherent detail.', coverage: ['writing-studio'] },
    { id: 'numeracy.fact_fluency', domain: 'numeracy', label: 'Fact Fluency', short: 'Fact Fluency', desc: 'Automatic retrieval of number facts under time pressure.', coverage: ['numeracy'] },
    { id: 'numeracy.strategy_use', domain: 'numeracy', label: 'Strategy Use', short: 'Strategies', desc: 'Applies efficient, explainable problem-solving strategies.', coverage: ['numeracy'] }
  ];

  var SKILL_DOMAINS = [
    { id: 'decoding', label: 'Decoding', desc: 'Sound-symbol mapping and vowel control.' },
    { id: 'orthography', label: 'Orthography', desc: 'Pattern accuracy and positional constraints.' },
    { id: 'morphology', label: 'Morphology', desc: 'Word-part awareness and transfer.' },
    { id: 'fluency', label: 'Fluency', desc: 'Rate and efficient processing.' },
    { id: 'sentence', label: 'Sentence', desc: 'Syntax and sentence meaning.' },
    { id: 'writing', label: 'Writing', desc: 'Organization and elaboration.' },
    { id: 'numeracy', label: 'Numeracy', desc: 'Fact fluency and strategy.' }
  ];

  function getSkill(skillId) {
    var id = String(skillId || '').trim();
    for (var i = 0; i < SKILLS.length; i += 1) {
      if (SKILLS[i].id === id) return SKILLS[i];
    }
    return null;
  }

  function listByDomain(domainId) {
    var id = String(domainId || '').trim();
    return SKILLS.filter(function (row) { return row.domain === id; });
  }

  return {
    SKILLS: SKILLS,
    SKILL_DOMAINS: SKILL_DOMAINS,
    getSkill: getSkill,
    listByDomain: listByDomain
  };
});
