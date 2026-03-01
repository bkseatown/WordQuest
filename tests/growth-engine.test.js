'use strict';

const assert = require('assert');

global.localStorage = {
  _store: {},
  getItem(key) { return Object.prototype.hasOwnProperty.call(this._store, key) ? this._store[key] : null; },
  setItem(key, value) { this._store[key] = String(value); },
  removeItem(key) { delete this._store[key]; }
};

const evidence = require('../js/evidence-engine.js');
global.CSEvidenceEngine = evidence;
const growth = require('../js/growth-engine.js');

function isoDaysAgo(days) {
  return new Date(Date.now() - days * 86400000).toISOString();
}

function seed(studentId, skillId, tier, points) {
  points.forEach((p, idx) => {
    evidence.recordEvidence({
      studentId,
      timestamp: isoDaysAgo(p.daysAgo),
      module: 'wordquest',
      activityId: `seed-${idx}`,
      targets: [skillId],
      tier,
      result: { accuracy: p.acc },
      confidence: 0.7
    });
  });
}

function run() {
  evidence._clearAll();

  seed('g-up', 'LIT.DEC.SYL', 'T2', [
    { daysAgo: 28, acc: 0.42 },
    { daysAgo: 21, acc: 0.53 },
    { daysAgo: 14, acc: 0.60 },
    { daysAgo: 7, acc: 0.70 }
  ]);
  const up = growth.computeGrowthVelocity('g-up', 'LIT.DEC.SYL');
  assert.strictEqual(up.direction, 'ACCELERATING', 'growth should be accelerating');
  assert(up.slope >= 0.02, 'slope should meet accelerating threshold');

  seed('g-flat', 'LIT.DEC.SYL', 'T2', [
    { daysAgo: 28, acc: 0.55 },
    { daysAgo: 21, acc: 0.56 },
    { daysAgo: 14, acc: 0.56 },
    { daysAgo: 7, acc: 0.57 }
  ]);
  const flat = growth.computeGrowthVelocity('g-flat', 'LIT.DEC.SYL');
  assert.strictEqual(flat.direction, 'FLAT', 'small changes should be flat');

  seed('g-down', 'LIT.DEC.SYL', 'T3', [
    { daysAgo: 28, acc: 0.78 },
    { daysAgo: 21, acc: 0.68 },
    { daysAgo: 14, acc: 0.62 },
    { daysAgo: 7, acc: 0.54 }
  ]);
  const down = growth.computeGrowthVelocity('g-down', 'LIT.DEC.SYL');
  assert.strictEqual(down.direction, 'DECLINING', 'negative slope should decline');

  const exT2 = growth.expectedGrowthRate('T2');
  const exT3 = growth.expectedGrowthRate('T3');
  assert.strictEqual(exT2, 0.01);
  assert.strictEqual(exT3, 0.015);

  const cmpUp = growth.compareToExpected('g-up', 'LIT.DEC.SYL');
  assert.strictEqual(cmpUp.tier, 'T2');
  assert.strictEqual(cmpUp.meetsExpectation, true);

  const cmpDown = growth.compareToExpected('g-down', 'LIT.DEC.SYL');
  assert.strictEqual(cmpDown.tier, 'T3');
  assert.strictEqual(cmpDown.meetsExpectation, false);
  assert(cmpDown.deltaFromExpected < 0, 'declining should be below expected');

  const trackUp = growth.computeTrackStatus('g-up');
  assert.strictEqual(trackUp.status, 'ON_TRACK');
  const trackDown = growth.computeTrackStatus('g-down');
  assert.strictEqual(trackDown.status, 'OFF_TRACK');

  const stable = growth.computeGrowthStability('g-flat', 'LIT.DEC.SYL');
  assert.strictEqual(stable.stability, 'STABLE');

  seed('g-volatile', 'LIT.DEC.SYL', 'T2', [
    { daysAgo: 20, acc: 0.2 },
    { daysAgo: 15, acc: 0.9 },
    { daysAgo: 10, acc: 0.25 },
    { daysAgo: 5, acc: 0.85 }
  ]);
  const variable = growth.computeGrowthStability('g-volatile', 'LIT.DEC.SYL');
  assert.strictEqual(variable.stability, 'VARIABLE');

  const insufficient = growth.computeGrowthVelocity('none', 'LIT.DEC.SYL');
  assert.strictEqual(insufficient.direction, 'INSUFFICIENT');

  console.log('growth-engine.test: ok');
}

run();
