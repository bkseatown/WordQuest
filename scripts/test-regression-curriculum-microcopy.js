#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');

const appSource = fs.readFileSync(path.join(process.cwd(), 'js/app.js'), 'utf8');

function requireText(pattern, message) {
  if (!pattern.test(appSource)) throw new Error(message);
}

requireText(
  /function getCurriculumFocusChipLabel\(focusValue,\s*packId = ''\)/,
  'Curriculum focus-chip helper no longer accepts pack-specific labels.'
);
requireText(
  /pack === 'ufli' \|\| pack === 'fundations' \|\| pack === 'wilson'/,
  'Curated pattern labels are missing for UFLI/Fundations/Wilson.'
);
requireText(
  /pattern:\s*cvc short vowels/,
  'Pattern-first chip microcopy for core phonics labels is missing.'
);
requireText(
  /useCuratedPatternOnly = \['ufli', 'fundations', 'wilson'\]/,
  'Curriculum meta copy no longer enforces curated chips for top-used packs.'
);

console.log('regression check passed: curriculum chip microcopy');
