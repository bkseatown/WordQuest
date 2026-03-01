'use strict';

const assert = require('assert');
const engine = require('../js/evidence-engine.js');

global.localStorage = {
  _store: {},
  getItem(key) {
    return Object.prototype.hasOwnProperty.call(this._store, key) ? this._store[key] : null;
  },
  setItem(key, value) {
    this._store[key] = String(value);
  },
  removeItem(key) {
    delete this._store[key];
  }
};

function isoDaysAgo(days) {
  return new Date(Date.now() - days * 86400000).toISOString();
}

function run() {
  engine.setIntensityLadder({
    version: 'cs.intensityLadder.v1',
    tiers: {
      T2: { label: 'Tier 2', sessionsPerWeek: 3, minutesPerSession: 20, groupSizeMax: 4, evidenceCadenceDays: 14, priorityWeight: 1.0 },
      T3: { label: 'Tier 3', sessionsPerWeek: 4, minutesPerSession: 25, groupSizeMax: 2, evidenceCadenceDays: 7, priorityWeight: 1.2 }
    }
  });
  engine._clearAll();

  // 1) recordEvidence appends into cs.evidence.v2
  engine.recordEvidence({
    studentId: 'stu-a',
    timestamp: isoDaysAgo(4),
    module: 'wordquest',
    targets: ['LIT.DEC.SYL'],
    tier: 'T2',
    doseMin: 20,
    result: { accuracy: 0.6 },
    confidence: 0.7
  });
  let rawStore = JSON.parse(global.localStorage.getItem(engine.STORAGE_KEY));
  assert(rawStore.students['stu-a'].records.length === 1, 'Expected one stored evidence row');

  // add more points for rolling + mastery checks
  engine.recordEvidence({ studentId: 'stu-a', timestamp: isoDaysAgo(3), module: 'wordquest', targets: ['LIT.DEC.SYL'], tier: 'T2', result: { accuracy: 0.3 }, confidence: 0.6 });
  engine.recordEvidence({ studentId: 'stu-a', timestamp: isoDaysAgo(2), module: 'wordquest', targets: ['LIT.DEC.SYL'], tier: 'T2', result: { accuracy: 0.5 }, confidence: 0.6 });
  engine.recordEvidence({ studentId: 'stu-a', timestamp: isoDaysAgo(1), module: 'wordquest', targets: ['LIT.DEC.SYL'], tier: 'T2', result: { accuracy: 0.4 }, confidence: 0.6 });
  engine.recordEvidence({ studentId: 'stu-a', timestamp: isoDaysAgo(0), module: 'wordquest', targets: ['LIT.DEC.SYL'], tier: 'T2', result: { accuracy: 0.8 }, confidence: 0.6 });
  engine.recordEvidence({ studentId: 'stu-a', timestamp: isoDaysAgo(0), module: 'wordquest', targets: ['LIT.DEC.SYL'], tier: 'T2', result: { accuracy: 0.9 }, confidence: 0.6 });

  // 2) snapshot fields present
  const snapshot = engine.getStudentSkillSnapshot('stu-a');
  const syll = snapshot.skills.find((s) => s.skillId === 'LIT.DEC.SYL');
  assert(syll, 'Expected LIT.DEC.SYL in snapshot');
  assert(typeof syll.rawMastery === 'number', 'Expected rawMastery');
  assert(typeof syll.mastery === 'number', 'Expected mastery adj');
  assert(typeof syll.lastSeenTs === 'number' && syll.lastSeenTs > 0, 'Expected lastSeenTs');
  assert(typeof syll.stalenessDays === 'number', 'Expected stalenessDays');

  // 3) computePriority shape
  const pr = engine.computePriority('stu-a');
  assert(Array.isArray(pr.topSkills) && pr.topSkills.length > 0, 'Expected ranked topSkills');
  assert(typeof pr.overallPriority === 'number', 'Expected numeric overallPriority');
  for (let i = 1; i < pr.topSkills.length; i += 1) {
    assert(pr.topSkills[i - 1].priorityScore >= pr.topSkills[i].priorityScore, 'Expected descending priority sort');
  }

  // 4) rolling window: only last N=5 used
  assert.strictEqual(syll.n, 5, 'Expected rolling window of 5 records');

  // 5) T3 should outrank T2 for same evidence
  engine.recordEvidence({ studentId: 'stu-t2', timestamp: isoDaysAgo(5), module: 'wordquest', targets: ['LIT.DEC.PHG'], tier: 'T2', result: { accuracy: 0.5 }, confidence: 0.5 });
  engine.recordEvidence({ studentId: 'stu-t3', timestamp: isoDaysAgo(5), module: 'wordquest', targets: ['LIT.DEC.PHG'], tier: 'T3', result: { accuracy: 0.5 }, confidence: 0.5 });
  const p2 = engine.computePriority('stu-t2');
  const p3 = engine.computePriority('stu-t3');
  assert(p3.overallPriority > p2.overallPriority, 'Expected T3 to carry higher priority than T2 for same evidence');

  // EWMA + recency penalty should lower adjusted mastery vs raw when stale
  engine.recordEvidence({ studentId: 'stu-stale', timestamp: isoDaysAgo(30), module: 'wordquest', targets: ['LIT.DEC.IRREG'], tier: 'T2', result: { accuracy: 0.9 }, confidence: 0.8 });
  const staleSnap = engine.getStudentSkillSnapshot('stu-stale');
  const staleSkill = staleSnap.skills.find((s) => s.skillId === 'LIT.DEC.IRREG');
  assert(staleSkill.rawMastery > staleSkill.mastery, 'Expected recency penalty to reduce adjusted mastery');

  console.log('evidence-engine.test: ok');
}

run();
