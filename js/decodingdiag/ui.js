(function initDecodingDiagUI(root) {
  'use strict';

  var ProbeStore = root.CSDecodingDiagProbeStore;
  var Scoring = root.CSDecodingDiagScoring;
  var EvidenceEngine = root.CSEvidenceEngine;
  var PrintAPI = root.CSDecodingDiagPrint;
  var ReportsAPI = root.CSDecodingDiagReports;

  if (!ProbeStore || !Scoring) return;

  var el = {
    student: document.getElementById('dd-student'),
    tier: document.getElementById('dd-tier'),
    mode: document.getElementById('dd-mode'),
    target: document.getElementById('dd-target'),
    form: document.getElementById('dd-form'),
    start: document.getElementById('dd-start'),
    end: document.getElementById('dd-end'),
    pause: document.getElementById('dd-pause'),
    title: document.getElementById('dd-title'),
    progress: document.getElementById('dd-progress'),
    timer: document.getElementById('dd-timer'),
    word: document.getElementById('dd-word'),
    tags: document.getElementById('dd-tags'),
    summary: document.getElementById('dd-summary'),
    summaryStats: document.getElementById('dd-summary-stats'),
    save: document.getElementById('dd-save'),
    copyStudent: document.getElementById('dd-copy-student'),
    copyFamily: document.getElementById('dd-copy-family'),
    copyAdmin: document.getElementById('dd-copy-admin')
    ,print: document.getElementById('dd-print')
    ,manual: document.getElementById('dd-manual')
    ,mAttempts: document.getElementById('dd-m-attempts')
    ,mCorrect: document.getElementById('dd-m-correct')
    ,mSC: document.getElementById('dd-m-sc')
    ,mElapsed: document.getElementById('dd-m-elapsed')
    ,mTags: document.getElementById('dd-m-tags')
    ,mSave: document.getElementById('dd-m-save')
  };

  var state = {
    store: null,
    targetId: '',
    formId: '',
    items: [],
    idx: 0,
    running: false,
    paused: false,
    startedAt: 0,
    timerId: 0,
    elapsedSec: 0,
    responsesById: {},
    selectedTags: [],
    summary: null
  };

  function queryParam(name) {
    try { return new URLSearchParams(root.location.search).get(name) || ''; } catch (_e) { return ''; }
  }

  function escapeHtml(s) {
    return String(s || '').replace(/[&<>"']/g, function (ch) {
      return ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[ch] || ch;
    });
  }

  function initStudent() {
    var student = queryParam('student');
    if (student && el.student) el.student.value = student;
  }

  function syncForms() {
    var targetId = String(el.target.value || '');
    state.targetId = targetId;
    var forms = ProbeStore.listForms(targetId);
    el.form.innerHTML = forms.map(function (f) {
      return '<option value="' + f.formId + '">' + f.formId + '</option>';
    }).join('');
    state.formId = forms.length ? forms[0].formId : '';
  }

  function renderTargets() {
    var targets = ProbeStore.listTargets();
    el.target.innerHTML = targets.map(function (t) {
      return '<option value="' + t.targetId + '">' + t.label + '</option>';
    }).join('');
    if (targets.length) {
      el.target.value = targets[0].targetId;
      syncForms();
    }
  }

  function activeItem() {
    return state.items[state.idx] || null;
  }

  function updateTimer() {
    if (!state.running || state.paused) return;
    state.elapsedSec = Math.max(1, Math.floor((Date.now() - state.startedAt) / 1000));
    if (el.mode.value === 'timed') {
      var left = Math.max(0, 60 - state.elapsedSec);
      el.timer.textContent = 'Time: ' + left + 's';
      if (left <= 0) {
        endSession();
      }
    } else {
      el.timer.textContent = 'Time: ' + state.elapsedSec + 's';
    }
  }

  function selectedTagSet() {
    var map = {};
    state.selectedTags.forEach(function (t) { map[t] = true; });
    return map;
  }

  function renderTags() {
    var recommended = [];
    var tags = state.store && state.store.tags && state.store.tags.recommendedByTarget;
    if (tags && state.targetId && tags[state.targetId]) recommended = tags[state.targetId].slice(0, 6);
    var tagDefs = (state.store && state.store.tags && state.store.tags.tags) || [];
    var labelById = {};
    tagDefs.forEach(function (t) { labelById[t.id] = t.short || t.label || t.id; });
    var selected = selectedTagSet();
    el.tags.innerHTML = recommended.map(function (id, i) {
      return '<button class="dd-tag ' + (selected[id] ? 'is-on' : '') + '" data-tag="' + id + '" type="button">' + (i + 1) + '. ' + escapeHtml(labelById[id] || id) + '</button>';
    }).join('');
    Array.prototype.forEach.call(el.tags.querySelectorAll('[data-tag]'), function (node) {
      node.addEventListener('click', function () {
        toggleTag(node.getAttribute('data-tag'));
      });
    });
  }

  function toggleTag(tagId) {
    var id = String(tagId || '');
    if (!id) return;
    if (state.selectedTags.indexOf(id) >= 0) state.selectedTags = state.selectedTags.filter(function (t) { return t !== id; });
    else state.selectedTags.push(id);
    renderTags();
  }

  function renderProbe() {
    var item = activeItem();
    el.progress.textContent = item ? (String(state.idx + 1) + '/' + String(state.items.length)) : 'Done';
    el.word.textContent = item ? item.text : 'Done';
    el.title.textContent = state.targetId ? ('Decoding Diagnostic • ' + state.targetId + ' • ' + state.formId) : 'Decoding Diagnostic';
    renderTags();
  }

  function saveResponse(status) {
    if (!state.running || state.paused) return;
    var item = activeItem();
    if (!item) return;
    state.responsesById[item.id] = {
      itemId: item.id,
      status: status,
      tags: state.selectedTags.slice(),
      selfCorrected: status === 'self_correct',
      responseMs: Date.now() - state.startedAt
    };
    state.selectedTags = [];
    nextItem();
  }

  function nextItem() {
    if (state.idx < state.items.length - 1) {
      state.idx += 1;
      renderProbe();
    } else {
      endSession();
    }
  }

  function startSession() {
    var form = ProbeStore.getForm(state.targetId, String(el.form.value || ''));
    state.formId = String(el.form.value || '');
    state.items = form && Array.isArray(form.items) ? form.items.slice(0, 15) : [];
    state.idx = 0;
    state.responsesById = {};
    state.selectedTags = [];
    state.summary = null;
    state.running = true;
    state.paused = false;
    state.startedAt = Date.now();
    state.elapsedSec = 1;
    el.summary.classList.remove('is-open');
    if (state.timerId) clearInterval(state.timerId);
    state.timerId = setInterval(updateTimer, 250);
    renderProbe();
  }

  function endSession() {
    if (!state.running) return;
    state.running = false;
    if (state.timerId) clearInterval(state.timerId);
    updateTimer();
    var responses = Object.keys(state.responsesById).map(function (k) { return state.responsesById[k]; });
    var scored = Scoring.scoreSession({
      mode: el.mode.value,
      responses: responses,
      elapsedSec: Math.max(1, state.elapsedSec),
      timedSeconds: 60,
      discontinueN: 5
    });
    state.summary = scored;
    renderSummary();
  }

  function renderSummary() {
    if (!state.summary) return;
    var s = state.summary;
    var tags = s.errorPattern.slice(0, 3).join(', ') || 'none';
    el.summaryStats.innerHTML = [
      '<p class="dd-stat"><strong>Attempts:</strong> ' + s.attempts + '</p>',
      '<p class="dd-stat"><strong>Accuracy:</strong> ' + Math.round(s.accuracy * 100) + '%</p>',
      (el.mode.value === 'timed' ? ('<p class="dd-stat"><strong>WCPM:</strong> ' + (s.wcpm || 0) + '</p>') : ''),
      '<p class="dd-stat"><strong>Self Corrections:</strong> ' + s.selfCorrections + '</p>',
      '<p class="dd-stat"><strong>Top Tags:</strong> ' + escapeHtml(tags) + '</p>',
      '<p class="dd-stat"><strong>Band:</strong> ' + s.sessionBand + '</p>',
      (s.discontinueSuggested ? '<p class="dd-stat"><strong>Discontinue suggested:</strong> 0 correct in first 5 attempted</p>' : '')
    ].join('');
    el.summary.classList.add('is-open');
  }

  function validateEvent(eventObj) {
    var err = '';
    if (!eventObj.studentId) err = 'Student ID required.';
    else if (!Array.isArray(eventObj.targets) || eventObj.targets.length !== 1) err = 'Exactly one target is required.';
    else if (eventObj.result.attempts < 0) err = 'Attempts must be >= 0.';
    else if (eventObj.result.accuracy < 0 || eventObj.result.accuracy > 1) err = 'Accuracy must be 0..1.';
    else if (eventObj.result.wcpm != null && !Number.isFinite(Number(eventObj.result.wcpm))) err = 'WCPM must be numeric.';
    else if (!Array.isArray(eventObj.result.errorPattern) || eventObj.result.errorPattern.some(function (x) { return !/^.+:\d+$/.test(String(x)); })) err = 'Error tags must be tagId:count.';
    return err;
  }

  function saveEvidence() {
    if (!state.summary || !EvidenceEngine || typeof EvidenceEngine.recordEvidence !== 'function') return;
    var eventObj = {
      studentId: String(el.student.value || '').trim(),
      timestamp: new Date().toISOString(),
      module: 'decodingdiag',
      activityId: el.mode.value === 'timed' ? 'dd.v1.timed' : 'dd.v1.untimed',
      targets: [state.targetId],
      tier: el.tier.value === 'T3' ? 'T3' : 'T2',
      doseMin: el.mode.value === 'timed' ? 3 : 5,
      result: {
        attempts: Number(state.summary.attempts || 0),
        accuracy: Number(state.summary.accuracy || 0),
        wcpm: el.mode.value === 'timed' ? Number(state.summary.wcpm || 0) : undefined,
        selfCorrections: Number(state.summary.selfCorrections || 0),
        errorPattern: state.summary.errorPattern.slice()
      },
      confidence: 0.85,
      notes: 'Form ' + state.formId
    };
    var err = validateEvent(eventObj);
    if (err) {
      alert(err);
      return;
    }
    EvidenceEngine.recordEvidence(eventObj);
    el.word.textContent = 'Evidence saved';
  }

  function saveManualEvidence() {
    if (!EvidenceEngine || typeof EvidenceEngine.recordEvidence !== 'function') return;
    var attempts = Math.max(0, Number(el.mAttempts.value || 0));
    var correct = Math.max(0, Number(el.mCorrect.value || 0));
    var sc = Math.max(0, Number(el.mSC.value || 0));
    var elapsed = Math.max(1, Number(el.mElapsed.value || 60));
    var tags = String(el.mTags.value || '').split(',').map(function (x) { return x.trim(); }).filter(Boolean);
    var accuracy = correct / Math.max(1, attempts);
    var wcpm = el.mode.value === 'timed' ? Math.round((correct / (elapsed / 60)) * 10) / 10 : undefined;
    var eventObj = {
      studentId: String(el.student.value || '').trim(),
      timestamp: new Date().toISOString(),
      module: 'decodingdiag',
      activityId: el.mode.value === 'timed' ? 'dd.v1.timed' : 'dd.v1.untimed',
      targets: [state.targetId || 'LIT.DEC.PHG.CVC'],
      tier: el.tier.value === 'T3' ? 'T3' : 'T2',
      doseMin: el.mode.value === 'timed' ? 3 : 5,
      result: {
        attempts: attempts,
        accuracy: accuracy,
        wcpm: wcpm,
        selfCorrections: sc,
        errorPattern: tags
      },
      confidence: 0.85,
      notes: 'Manual entry'
    };
    var err = validateEvent(eventObj);
    if (err) return alert(err);
    EvidenceEngine.recordEvidence(eventObj);
    el.word.textContent = 'Manual evidence saved';
  }

  function printProbe() {
    var form = ProbeStore.getForm(state.targetId, state.formId);
    var target = ProbeStore.getTarget(state.targetId);
    if (PrintAPI && typeof PrintAPI.openPrintView === 'function') {
      PrintAPI.openPrintView({
        title: 'Decoding Diagnostic (v1)',
        formId: state.formId,
        targetId: state.targetId,
        targetLabel: target && target.label ? target.label : state.targetId,
        mode: el.mode.value,
        items: form && form.items ? form.items : []
      });
    }
  }

  function copyText(text) {
    var t = String(text || '').trim();
    if (!t) return;
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(t).catch(function () {});
    }
  }

  function reportContext() {
    return {
      studentId: String(el.student.value || '').trim(),
      targetId: state.targetId,
      formId: state.formId,
      mode: el.mode.value,
      tier: el.tier.value,
      summary: state.summary || {}
    };
  }

  function bind() {
    el.target.addEventListener('change', syncForms);
    el.form.addEventListener('change', function () { state.formId = el.form.value; });
    el.start.addEventListener('click', startSession);
    el.end.addEventListener('click', endSession);
    el.pause.addEventListener('click', function () {
      state.paused = !state.paused;
      el.pause.textContent = state.paused ? 'Resume' : 'Pause';
    });
    el.save.addEventListener('click', saveEvidence);
    if (el.print) el.print.addEventListener('click', printProbe);
    if (el.mSave) el.mSave.addEventListener('click', saveManualEvidence);

    el.copyStudent.addEventListener('click', function () {
      if (!state.summary) return;
      if (ReportsAPI && typeof ReportsAPI.buildStudentNote === 'function') {
        copyText(ReportsAPI.buildStudentNote(reportContext()));
      } else {
        copyText('Date: ' + new Date().toISOString().slice(0, 10) + '\nProbe: Decoding Diagnostic - ' + state.targetId + ' (' + state.formId + ')\nTier: ' + el.tier.value + '\nResult: ' + Math.round(state.summary.accuracy * 100) + '% accuracy' + (el.mode.value === 'timed' ? (', ' + (state.summary.wcpm || 0) + ' WCPM') : ''));
      }
    });
    el.copyFamily.addEventListener('click', function () {
      if (!state.summary) return;
      if (ReportsAPI && typeof ReportsAPI.buildFamilyNote === 'function') {
        copyText(ReportsAPI.buildFamilyNote(reportContext()));
      } else {
        copyText('Today we practiced ' + state.targetId + '. Accuracy: ' + Math.round(state.summary.accuracy * 100) + '%. Next step: focused decoding practice.');
      }
    });
    el.copyAdmin.addEventListener('click', function () {
      if (!state.summary) return;
      if (ReportsAPI && typeof ReportsAPI.buildAdminSummary === 'function') {
        copyText(ReportsAPI.buildAdminSummary(reportContext()));
      } else {
        copyText('Student: ' + (el.student.value || '--') + ' | Probe: ' + state.targetId + ' | Accuracy: ' + Math.round(state.summary.accuracy * 100) + '% | Tier: ' + el.tier.value);
      }
    });

    document.addEventListener('keydown', function (e) {
      var key = String(e.key || '');
      if (key === 'Escape') { state.paused = true; el.pause.textContent = 'Resume'; return; }
      if (!state.running || state.paused) return;
      if (key === ' ') { e.preventDefault(); saveResponse('correct'); return; }
      if (key === 'x' || key === 'X') { saveResponse('incorrect'); return; }
      if (key === 's' || key === 'S') { saveResponse('self_correct'); return; }
      if (key === 't' || key === 'T') { saveResponse('told'); return; }
      if (key === 'Enter') { e.preventDefault(); nextItem(); return; }
      if (key === 'ArrowRight') { e.preventDefault(); nextItem(); return; }
      if (key === 'ArrowLeft') { e.preventDefault(); if (state.idx > 0) { state.idx -= 1; renderProbe(); } return; }
      if (e.shiftKey && (key === 'E' || key === 'e')) { e.preventDefault(); endSession(); return; }
      if (e.shiftKey && (key === 'P' || key === 'p')) { e.preventDefault(); printProbe(); return; }
      var n = Number(key);
      if (Number.isFinite(n) && n >= 1 && n <= 6) {
        var recommended = (state.store && state.store.tags && state.store.tags.recommendedByTarget && state.store.tags.recommendedByTarget[state.targetId]) || [];
        if (recommended[n - 1]) toggleTag(recommended[n - 1]);
      }
    });
  }

  ProbeStore.loadProbeStore().then(function (result) {
    state.store = result;
    initStudent();
    if (!result.ok) {
      el.word.textContent = 'Probe data unavailable. Manual mode enabled.';
      if (el.manual) el.manual.classList.remove('hidden');
      return;
    }
    renderTargets();
    bind();
  });
}(typeof globalThis !== 'undefined' ? globalThis : window));
