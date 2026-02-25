(function () {
  'use strict';

  function freezeTarget(entry) {
    return Object.freeze({
      id: String(entry.id || '').trim(),
      label: String(entry.label || '').trim(),
      focus: String(entry.focus || 'cvc').trim(),
      gradeBand: String(entry.gradeBand || 'K-2').trim(),
      length: String(entry.length || 'any').trim(),
      pacing: String(entry.pacing || '').trim()
    });
  }

  function buildUfliTargets() {
    const lessonNames = Object.freeze([
      'a /a/',
      'm /m/',
      's /s/',
      't /t/',
      'VC and CVC Words',
      'p /p/',
      'f /f/',
      'i /i/',
      'n /n/',
      'CVC Practice (a, i)',
      'Nasalized A (am, an)',
      'o /o/',
      'd /d/',
      'c /k/',
      'u /u/',
      'g /g/',
      'b /b/',
      'e /e/',
      'VC and CVC Practice (all)',
      '-s /s/',
      '-s /z/',
      'k /k/',
      'h /h/',
      'r /r/ Part 1',
      'r /r/ Part 2',
      'l /l/ Part 1',
      'l /l/ Part 2, al',
      'w /w/',
      'j /j/',
      'y /y/',
      'x /ks/',
      'qu /kw/',
      'v /v/',
      'z /z/',
      'Short A Review (incl. Nasalized A)',
      'Short I Review',
      'Short O Review',
      'Short A, I, O Review',
      'Short U Review',
      'Short E Review',
      'Short Vowels Review (all)',
      'FLSZ Spelling Rule (ff, ll, ss, zz)',
      '-all, -oll, -ull',
      'ck /k/',
      'sh /sh/',
      'Voiced th /th/',
      'Unvoiced th /th/',
      'ch /ch/',
      'Digraphs Review 1',
      'wh /w/, ph /f/',
      'ng /ng/',
      'nk /nk/',
      'Digraphs Review 2 (incl. CCCVC)',
      'a_e /a/',
      'i_e /i/',
      'o_e /o/',
      'VCe Review 1, e_e /e/',
      'u_e /u/, /yu/',
      'VCe Review 2 (all)',
      '_ce /s/',
      '_ge /j/',
      'VCe Review 3, VCe Exceptions',
      '-es',
      '-ed',
      '-ing',
      'Closed and Open Syllables',
      'Closed/Closed',
      'Open/Closed',
      'tch /ch/',
      'dge /j/',
      'tch /ch/, dge /j/ Review',
      'Long VCC (-ild, -old, -ind, -olt, -ost)',
      'y /i/',
      'y /e/',
      '-le',
      'Ending Patterns Review',
      'ar /ar/',
      'or, ore /or/',
      'ar /ar/ and or, ore /or/ Review',
      'er /er/',
      'ir, ur /er/',
      'Spelling /er/: er, ir, ur, w + or',
      'R-Controlled Vowels Review',
      'ai, ay /a/',
      'ee, ea, ey /e/',
      'oa, ow, oe /o/',
      'ie, igh /i/',
      'Vowel Teams Review 1',
      'oo, u /oo/',
      'oo /u/',
      'ew, ui, ue /u/',
      'Vowel Teams Review 2',
      'au, aw, augh /aw/',
      'ea /e/, a /o/',
      'oi, oy /oi/',
      'ou, ow /ow/',
      'Vowel Teams and Diphthongs Review',
      'kn /n/, wr /r/, mb /m/',
      '-s/-es',
      '-er/-est',
      '-ly',
      '-less, -ful',
      'un-',
      'pre-, re-',
      'dis-',
      'Affixes Review 1',
      'Doubling Rule -ed, -ing',
      'Doubling Rule -er, -est',
      'Drop -e Rule',
      '-y to i Rule',
      '-ar, -or /er/',
      'air, are, ear /air/',
      'ear /ear/',
      'Alternate /a/ (ei, ey, eigh, aigh)',
      'Alternate Long U (ew, eu, ue /yu/; ou /u/)',
      'ough /aw/, /o/',
      'Signal Vowels (c /s/, g /j/)',
      'ch /sh/, /k/; gn /n/, gh /g/; silent letters',
      '-sion, -tion',
      '-ture',
      '-er, -or, -ist',
      '-ish',
      '-y',
      '-ness',
      '-ment',
      '-able, -ible',
      'uni-, bi-, tri',
      'Affixes Review 2'
    ]);
    const targets = [];
    lessonNames.forEach((name, index) => {
      const lesson = index + 1;
      targets.push(freezeTarget({
        id: `ufli-lesson-${lesson}`,
        label: `UFLI Foundations Lesson ${lesson} · ${name}`,
        focus: lesson <= 41
          ? 'cvc'
          : lesson <= 53
            ? 'digraph'
            : lesson <= 62
              ? 'cvce'
              : lesson <= 68
                ? 'multisyllable'
                : lesson <= 76
                  ? 'welded'
                  : lesson <= 83
                    ? 'r_controlled'
                    : lesson <= 94
                      ? 'vowel_team'
                      : lesson <= 98
                        ? 'diphthong'
                        : 'suffix',
        gradeBand: lesson <= 98 ? 'K-2' : 'G3-5',
        length: lesson <= 41 ? '3' : lesson <= 83 ? '4' : '5',
        pacing: `Lesson ${lesson}`
      }));
    });
    return Object.freeze(targets);
  }

  function buildFundationsTargets() {
    const levels = [
      Object.freeze({ key: 'k', label: 'K', gradeBand: 'K-2', units: [
        Object.freeze({ id: '1', weeks: '12' }),
        Object.freeze({ id: '2', weeks: '4' }),
        Object.freeze({ id: '3', weeks: '6' }),
        Object.freeze({ id: '4', weeks: '4' }),
        Object.freeze({ id: '5', weeks: '6' })
      ] }),
      Object.freeze({ key: '1', label: '1', gradeBand: 'K-2', units: [
        Object.freeze({ id: '1', weeks: '2-3' }),
        Object.freeze({ id: '2', weeks: '2-4' }),
        Object.freeze({ id: '3', weeks: '2' }),
        Object.freeze({ id: '4', weeks: '2' }),
        Object.freeze({ id: '5', weeks: '1' }),
        Object.freeze({ id: '6', weeks: '3' }),
        Object.freeze({ id: '7', weeks: '3' }),
        Object.freeze({ id: '8', weeks: '2' }),
        Object.freeze({ id: '9', weeks: '2' }),
        Object.freeze({ id: '10', weeks: '3' }),
        Object.freeze({ id: '11', weeks: '3' }),
        Object.freeze({ id: '12', weeks: '3' }),
        Object.freeze({ id: '13', weeks: '3' }),
        Object.freeze({ id: '14', weeks: '2' })
      ] }),
      Object.freeze({ key: '2', label: '2', gradeBand: 'G3-5', units: [
        Object.freeze({ id: '1', weeks: '2' }),
        Object.freeze({ id: '2', weeks: '2' }),
        Object.freeze({ id: '3', weeks: '1' }),
        Object.freeze({ id: '4', weeks: '2' }),
        Object.freeze({ id: '5', weeks: '2' }),
        Object.freeze({ id: '6', weeks: '2' }),
        Object.freeze({ id: '7', weeks: '3' }),
        Object.freeze({ id: '8', weeks: '1' }),
        Object.freeze({ id: '9', weeks: '2' }),
        Object.freeze({ id: '10', weeks: '2' }),
        Object.freeze({ id: '11', weeks: '2' }),
        Object.freeze({ id: '12', weeks: '1' }),
        Object.freeze({ id: '13', weeks: '3' }),
        Object.freeze({ id: '14', weeks: '2' }),
        Object.freeze({ id: '15', weeks: '2' }),
        Object.freeze({ id: '16', weeks: '1' }),
        Object.freeze({ id: '17', weeks: '2' })
      ] }),
      Object.freeze({ key: '3', label: '3', gradeBand: 'G3-5', units: [
        Object.freeze({ id: '1', weeks: '2' }),
        Object.freeze({ id: '2', weeks: '3' }),
        Object.freeze({ id: '3', weeks: '1' }),
        Object.freeze({ id: '4', weeks: '2' }),
        Object.freeze({ id: '5', weeks: '2' }),
        Object.freeze({ id: '6', weeks: '3' }),
        Object.freeze({ id: 'bonus', weeks: '2' }),
        Object.freeze({ id: '7', weeks: '2' }),
        Object.freeze({ id: '8', weeks: '3' }),
        Object.freeze({ id: '9', weeks: '3' }),
        Object.freeze({ id: '10', weeks: '3' }),
        Object.freeze({ id: '11', weeks: '2' }),
        Object.freeze({ id: '12', weeks: '2' }),
        Object.freeze({ id: '13', weeks: '2' }),
        Object.freeze({ id: '14', weeks: '2' })
      ] })
    ];
    const targets = [];

    levels.forEach((level) => {
      level.units.forEach((unitMeta) => {
        const unitValue = String(unitMeta.id || '');
        const unitNumber = Number(unitValue);
        const isNumericUnit = Number.isFinite(unitNumber);
        const focus = level.key === 'k' || level.key === '1'
          ? (isNumericUnit && unitNumber <= 4 ? 'cvc' : isNumericUnit && unitNumber <= 9 ? 'digraph' : 'welded')
          : level.key === '2'
            ? (isNumericUnit && unitNumber <= 9 ? 'r_controlled' : isNumericUnit && unitNumber <= 14 ? 'vowel_team' : 'suffix')
            : (isNumericUnit && unitNumber <= 6 ? 'multisyllable' : isNumericUnit && unitNumber <= 10 ? 'prefix' : 'suffix');

        const unitLabel = unitValue === 'bonus'
          ? `Fundations Level ${level.label} Bonus Unit`
          : `Fundations Level ${level.label} Unit ${unitValue}`;
        const targetId = unitValue === 'bonus'
          ? `fundations-l${level.key}-bonus`
          : `fundations-l${level.key}-u${unitValue}`;

        targets.push(freezeTarget({
          id: targetId,
          label: unitLabel,
          focus,
          gradeBand: level.gradeBand,
          length: level.key === 'k' || level.key === '1' ? '4' : '6',
          pacing: unitValue === 'bonus'
            ? `Level ${level.label} · Bonus Unit (${unitMeta.weeks} weeks)`
            : `Level ${level.label} · Unit ${unitValue} (${unitMeta.weeks} weeks)`
        }));
      });
    });

    return Object.freeze(targets);
  }

  function buildWilsonTargets() {
    const stepTargets = Object.freeze([
      Object.freeze({ step: 1, gradeBand: 'G3-5', length: '5', focus: 'cvc', lessons: [
        '1.1 · f, l, m, n, r, s, d, g, p, t, a, i, o (blending)',
        '1.2 · b, sh, h, j, c, k, ck, v, w, x, y, z, ch, th, qu, wh, u, e',
        '1.3 · Practice the above',
        '1.4 · Double consonants l, s, f and -all',
        '1.5 · am, an',
        '1.6 · suffix s'
      ] }),
      Object.freeze({ step: 2, gradeBand: 'G3-5', length: '5', focus: 'welded', lessons: [
        '2.1 · ang, ing, ong, ung, ank, ink, onk, unk',
        '2.2 · Closed syllables with blends',
        '2.3 · Closed syllable exceptions (ild, ind, old, ost, olt)',
        '2.4 · 5 sounds + suffix s',
        '2.5 · 3-letter blends (6 sounds)'
      ] }),
      Object.freeze({ step: 3, gradeBand: 'G3-5', length: '6', focus: 'multisyllable', lessons: [
        '3.1 · Two-syllable words with two closed syllables',
        '3.2 · Two closed syllables, including blends',
        '3.3 · Two closed syllables ending in ct',
        '3.4 · Multisyllabic words with closed syllables',
        '3.5 · -ed and -ing added to basewords'
      ] }),
      Object.freeze({ step: 4, gradeBand: 'G3-5', length: '6', focus: 'cvce', lessons: [
        '4.1 · VCE in one-syllable words',
        '4.2 · VCE combined with closed syllables',
        '4.3 · Multisyllabic words with two syllable types',
        '4.4 · ive exception'
      ] }),
      Object.freeze({ step: 5, gradeBand: 'G3-5', length: '6', focus: 'multisyllable', lessons: [
        '5.1 · Open syllable in one-syllable words, y as vowel',
        '5.2 · Open + VCE + closed in two-syllable words',
        '5.3 · y as vowel in two-syllable words',
        '5.4 · Multisyllabic words with 3 syllable types',
        '5.5 · a and i in unaccented syllables'
      ] }),
      Object.freeze({ step: 6, gradeBand: 'G3-5', length: '6', focus: 'suffix', lessons: [
        '6.1 · Suffixes er, est, en, es, able, ish, y, ive, ly, ty, less, ness, ment, ful',
        '6.2 · suffix -ed (sounds d, t)',
        '6.3 · Combining 2 suffixes to baseword',
        '6.4 · consonant-le, stle exception'
      ] }),
      Object.freeze({ step: 7, gradeBand: 'G3-5', length: '6', focus: 'digraph', lessons: [
        '7.1 · c or g before e, i, or y',
        '7.2 · ge, ce, dge',
        '7.3 · trigraph/digraph tch, ph',
        '7.4 · tion, sion',
        '7.5 · contractions'
      ] }),
      Object.freeze({ step: 8, gradeBand: 'G3-5', length: '6', focus: 'r_controlled', lessons: [
        '8.1 · ar, er, ir, or, ur in one-syllable words',
        '8.2 · ar, or in multisyllabic words',
        '8.3 · er, ir, ur in multisyllabic words',
        '8.4 · vowel rr exceptions',
        '8.5 · ar/or final-syllable exceptions; ard, ward'
      ] }),
      Object.freeze({ step: 9, gradeBand: 'G3-5', length: '6', focus: 'vowel_team', lessons: [
        '9.1 · ai, ay',
        '9.2 · ee, ey',
        '9.3 · oa, oe, ue',
        '9.4 · oi, oy, au, aw',
        '9.5 · ou, ow, oo',
        '9.6 · ea',
        '9.7 · eu, ew, ui'
      ] }),
      Object.freeze({ step: 10, gradeBand: 'G6-8', length: '7', focus: 'suffix', lessons: [
        '10.1 · VCE exceptions: ice, ace, age, ate, ile, ite, ine',
        '10.2 · Rule: baseword ending in e + suffix',
        '10.3 · Rule: 1-syllable closed/r-controlled baseword + suffix',
        '10.4 · Rule: double final consonant in multisyllabic baseword',
        '10.5 · Additional suffixes: ic, al, ible, ous, ist, ism, ity, ize, ary, ery'
      ] }),
      Object.freeze({ step: 11, gradeBand: 'G6-8', length: '7', focus: 'vowel_team', lessons: [
        '11.1 · y in open, closed, VCE syllable',
        '11.2 · Y spelling rule',
        '11.3 · i in open syllable as /e/; i as /y/',
        '11.4 · ie/ei',
        '11.5 · igh, eigh'
      ] }),
      Object.freeze({ step: 12, gradeBand: 'G6-8', length: '7', focus: 'prefix', lessons: [
        '12.1 · Split vowels: vowel team exceptions',
        '12.2 · Silent letters: rh, gh, mb, mn, kn, gn, wr',
        '12.3 · w influencing vowels',
        '12.4 · ch, que pronounced /k/',
        '12.5 · ti, ci, tu, ture',
        '12.6 · Chameleon prefixes'
      ] })
    ]);
    const targets = [];
    stepTargets.forEach((stepRow) => {
      stepRow.lessons.forEach((lessonLabel, idx) => {
        const lessonNumber = idx + 1;
        targets.push(freezeTarget({
          id: `wilson-step-${stepRow.step}-lesson-${lessonNumber}`,
          label: `Wilson Reading System ${lessonLabel}`,
          focus: stepRow.focus,
          gradeBand: stepRow.gradeBand,
          length: stepRow.length,
          pacing: `Step ${stepRow.step}.${lessonNumber}`
        }));
      });
    });
    return Object.freeze(targets);
  }

  function buildLexiaWidaTargets() {
    const rows = Object.freeze([
      Object.freeze({ id: 'lexia-wida-entering-k2', label: 'Lexia English WIDA Entering (1) · Grade K-2 · Lessons 1-2', focus: 'cvc', gradeBand: 'K-2', length: '3', pacing: 'Entering 1 · K-2' }),
      Object.freeze({ id: 'lexia-wida-entering-36', label: 'Lexia English WIDA Entering (1) · Grades 3-6 · Lessons 1-3', focus: 'multisyllable', gradeBand: 'G3-5', length: '5', pacing: 'Entering 1 · Grades 3-6' }),
      Object.freeze({ id: 'lexia-wida-emerging-k2', label: 'Lexia English WIDA Emerging (2) · Grade K-2 · Lessons 3-4', focus: 'digraph', gradeBand: 'K-2', length: '4', pacing: 'Emerging 2 · K-2' }),
      Object.freeze({ id: 'lexia-wida-emerging-36', label: 'Lexia English WIDA Emerging (2) · Grades 3-6 · Lessons 4-9', focus: 'multisyllable', gradeBand: 'G3-5', length: '6', pacing: 'Emerging 2 · Grades 3-6' }),
      Object.freeze({ id: 'lexia-wida-developing-k2', label: 'Lexia English WIDA Developing (3) · Grade K-2 · Lessons 5-6', focus: 'cvce', gradeBand: 'K-2', length: '4', pacing: 'Developing 3 · K-2' }),
      Object.freeze({ id: 'lexia-wida-developing-36', label: 'Lexia English WIDA Developing (3) · Grades 3-6 · Lessons 10-12', focus: 'prefix', gradeBand: 'G3-5', length: '6', pacing: 'Developing 3 · Grades 3-6' }),
      Object.freeze({ id: 'lexia-wida-expanding-k2', label: 'Lexia English WIDA Expanding (4) · Grade K-2 · Lessons 7-8', focus: 'vowel_team', gradeBand: 'K-2', length: '5', pacing: 'Expanding 4 · K-2' }),
      Object.freeze({ id: 'lexia-wida-expanding-36', label: 'Lexia English WIDA Expanding (4) · Grades 3-6 · Lessons 13-15', focus: 'suffix', gradeBand: 'G3-5', length: '6', pacing: 'Expanding 4 · Grades 3-6' }),
      Object.freeze({ id: 'lexia-wida-bridging-k2', label: 'Lexia English WIDA Bridging (5) · Grade K-2 · Lessons 9-10', focus: 'r_controlled', gradeBand: 'K-2', length: '5', pacing: 'Bridging 5 · K-2' }),
      Object.freeze({ id: 'lexia-wida-bridging-36', label: 'Lexia English WIDA Bridging (5) · Grades 3-6 · Lessons 16-18', focus: 'prefix', gradeBand: 'G3-5', length: '7', pacing: 'Bridging 5 · Grades 3-6' }),
      Object.freeze({ id: 'lexia-wida-reacting-k2', label: 'Lexia English WIDA Reacting (6) · Grade K-2 · Lessons 11-12', focus: 'vocab-ela-k2', gradeBand: 'K-2', length: 'any', pacing: 'Reacting 6 · K-2' }),
      Object.freeze({ id: 'lexia-wida-reacting-36', label: 'Lexia English WIDA Reacting (6) · Grades 3-6 · Lessons 19-20', focus: 'vocab-ela-35', gradeBand: 'G3-5', length: 'any', pacing: 'Reacting 6 · Grades 3-6' })
    ]);
    return Object.freeze(rows.map((row) => freezeTarget(row)));
  }

  window.WQCurriculumTaxonomy = Object.freeze({
    ufli: buildUfliTargets(),
    fundations: buildFundationsTargets(),
    wilson: buildWilsonTargets(),
    lexiawida: buildLexiaWidaTargets()
  });
})();
