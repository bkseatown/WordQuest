'use strict';

const assert = require('assert');
const path = require('path');
const store = require('../js/decodingdiag/probe-store.js');

(async function run() {
  store._resetForTest();

  const base = process.cwd();
  const ok = await store.loadProbeStore({
    probesPath: path.join(base, 'data/decodingdiag-probes.v1.json'),
    tagsPath: path.join(base, 'data/decodingdiag-error-tags.v1.json'),
    configPath: path.join(base, 'data/decodingdiag-config.v1.json')
  });

  assert.strictEqual(ok.ok, true, 'loads valid v1 datasets');
  assert(store.listTargets().length >= 8, 'target list available');

  const vce = store.getTarget('LIT.DEC.SYL.VCE');
  assert(vce && vce.forms.length >= 3, 'VCE has minimum forms');

  const sampleForm = store.getForm('LIT.DEC.PHG.CVC', 'CVC-A');
  assert(sampleForm && sampleForm.items.length >= 15, 'form includes required items');

  let unknownRejected = false;
  try {
    store._validateProbeData({ version: 'cs.decodingProbes.v1', targets: [{ targetId: 'UNKNOWN', forms: [] }] });
  } catch (_e) {
    unknownRejected = true;
  }
  assert.strictEqual(unknownRejected, true, 'rejects missing required target map');

  store._resetForTest();
  const failed = await store.loadProbeStore({
    probesPath: '/tmp/does-not-exist-probes.json',
    tagsPath: '/tmp/does-not-exist-tags.json',
    configPath: '/tmp/does-not-exist-config.json'
  });
  assert.strictEqual(failed.ok, false, 'soft-fails when json cannot load');
  assert.strictEqual(failed.manualMode, true, 'falls back to manual mode');

  console.log('decodingdiag-probe-store.test: ok');
}()).catch((err) => {
  console.error(err);
  process.exit(1);
});
