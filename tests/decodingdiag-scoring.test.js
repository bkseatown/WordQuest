'use strict';

const assert = require('assert');
const scoring = require('../js/decodingdiag/scoring.js');

(function run() {
  const responses = [
    { itemId: '1', status: 'correct', tags: [] },
    { itemId: '2', status: 'self_correct', tags: [] },
    { itemId: '3', status: 'incorrect', tags: ['digraph_error'] },
    { itemId: '4', status: 'told', tags: [] },
    { itemId: '5', status: 'skipped', tags: [] }
  ];

  const scored = scoring.scoreSession({
    mode: 'timed',
    responses,
    elapsedSec: 30,
    timedSeconds: 60,
    discontinueN: 5
  });

  assert.strictEqual(scored.attempts, 4, 'attempted excludes skipped');
  assert.strictEqual(scored.correctCredit, 2, 'self_correct counts as correct');
  assert.strictEqual(scored.selfCorrections, 1, 'self correction count tracked');
  assert.strictEqual(scored.wcpm, 4, 'wcpm uses correctCredit / elapsedMin');
  assert(scored.errorPattern.includes('self_correction:1'), 'aggregates implied SC tag');
  assert(scored.errorPattern.includes('told_by_teacher:1'), 'aggregates implied told tag');

  const stopFlag = scoring.computeDiscontinueSuggested([
    { status: 'incorrect' },
    { status: 'told' },
    { status: 'incorrect' },
    { status: 'told' },
    { status: 'incorrect' }
  ], 5);
  assert.strictEqual(stopFlag, true, '0 correct in first 5 suggests discontinue');

  assert.strictEqual(scoring.masteryBand(0.91), 'Mastered');
  assert.strictEqual(scoring.masteryBand(0.70), 'Developing');
  assert.strictEqual(scoring.masteryBand(0.33), 'Emerging');

  const confirmed = scoring.isMasteryConfirmed([
    { timestamp: '2026-03-01T00:00:00.000Z', result: { accuracy: 0.92 } },
    { timestamp: '2026-02-25T00:00:00.000Z', result: { accuracy: 0.93 } }
  ], 14);
  assert.strictEqual(confirmed, true, 'two mastered sessions within cadence confirms mastery');

  console.log('decodingdiag-scoring.test: ok');
}());
