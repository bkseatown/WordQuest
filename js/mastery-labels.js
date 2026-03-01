(function initMasteryLabels(root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.CSMasteryLabels = factory();
  }
}(typeof globalThis !== 'undefined' ? globalThis : window, function factory() {
  'use strict';

  function masteryToBand(masteryAdj) {
    var m = Number(masteryAdj);
    if (!Number.isFinite(m)) m = 0.5;
    if (m < 0.45) return { band: 'EMERGING', label: 'Emerging' };
    if (m < 0.65) return { band: 'DEVELOPING', label: 'Developing' };
    if (m < 0.8) return { band: 'STRENGTHENING', label: 'Strengthening' };
    return { band: 'SECURE', label: 'Secure' };
  }

  return {
    masteryToBand: masteryToBand
  };
}));
