(function initEvidenceEngine(root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory(root);
  } else {
    root.CSEvidenceEngine = factory(root);
  }
}(typeof globalThis !== 'undefined' ? globalThis : window, function factory(root) {
  'use strict';

  var STORAGE_KEY = 'cs.evidence.v2';
  var WINDOW_N = 5;
  var DEFAULT_CONFIDENCE = 0.5;
  var EWMA_ALPHA = 0.55;
  var INTENSITY_DEFAULTS = {
    version: 'cs.intensityLadder.v1',
    tiers: {
      T2: {
        label: 'Tier 2',
        sessionsPerWeek: 3,
        minutesPerSession: 20,
        groupSizeMax: 4,
        evidenceCadenceDays: 14,
        priorityWeight: 1.0
      },
      T3: {
        label: 'Tier 3',
        sessionsPerWeek: 4,
        minutesPerSession: 25,
        groupSizeMax: 2,
        evidenceCadenceDays: 7,
        priorityWeight: 1.2
      }
    }
  };
  var intensityLadder = INTENSITY_DEFAULTS;
  var intensityLoadStarted = false;

  function clamp(v, lo, hi) {
    return Math.max(lo, Math.min(hi, v));
  }

  function safeParse(raw, fallback) {
    try {
      return JSON.parse(raw);
    } catch (_err) {
      return fallback;
    }
  }

  function toMs(value) {
    if (!value) return 0;
    if (typeof value === 'number' && Number.isFinite(value)) return value;
    var parsed = Date.parse(String(value));
    return Number.isFinite(parsed) ? parsed : 0;
  }

  function daysSince(ts) {
    if (!ts) return 0;
    var delta = Date.now() - ts;
    return Math.max(0, Math.floor(delta / 86400000));
  }

  function computeEwma(values, alpha) {
    if (!Array.isArray(values) || !values.length) return 0.5;
    var a = Number.isFinite(Number(alpha)) ? Number(alpha) : EWMA_ALPHA;
    var ewma = clamp(Number(values[0]), 0, 1);
    for (var i = 1; i < values.length; i += 1) {
      var x = clamp(Number(values[i]), 0, 1);
      ewma = (a * x) + ((1 - a) * ewma);
    }
    return clamp(ewma, 0, 1);
  }

  function normalizeIntensityLadder(input) {
    var src = input && typeof input === 'object' ? input : {};
    var tiers = src.tiers && typeof src.tiers === 'object' ? src.tiers : {};
    function tierValue(tierKey, fallback) {
      var raw = tiers[tierKey] && typeof tiers[tierKey] === 'object' ? tiers[tierKey] : {};
      return {
        label: String(raw.label || fallback.label),
        sessionsPerWeek: Math.max(1, Number(raw.sessionsPerWeek || fallback.sessionsPerWeek)),
        minutesPerSession: Math.max(1, Number(raw.minutesPerSession || fallback.minutesPerSession)),
        groupSizeMax: Math.max(1, Number(raw.groupSizeMax || fallback.groupSizeMax)),
        evidenceCadenceDays: Math.max(1, Number(raw.evidenceCadenceDays || fallback.evidenceCadenceDays)),
        priorityWeight: Math.max(0, Number(raw.priorityWeight || fallback.priorityWeight))
      };
    }
    return {
      version: String(src.version || INTENSITY_DEFAULTS.version),
      tiers: {
        T2: tierValue('T2', INTENSITY_DEFAULTS.tiers.T2),
        T3: tierValue('T3', INTENSITY_DEFAULTS.tiers.T3)
      }
    };
  }

  function getIntensityTier(tier) {
    var key = tier === 'T3' ? 'T3' : 'T2';
    var table = intensityLadder && intensityLadder.tiers ? intensityLadder.tiers : INTENSITY_DEFAULTS.tiers;
    return table[key] || INTENSITY_DEFAULTS.tiers[key];
  }

  function tryLoadIntensityLadder() {
    if (intensityLoadStarted) return;
    intensityLoadStarted = true;
    if (typeof fetch !== 'function') return;

    var loadFromUrl = function (url) {
      return fetch(url, { cache: 'no-store' })
        .then(function (resp) { return resp && resp.ok ? resp.json() : null; })
        .then(function (json) {
          if (json && typeof json === 'object') {
            intensityLadder = normalizeIntensityLadder(json);
          }
        });
    };

    var globalRegistry = root && root.CSDataRegistry;
    if (globalRegistry && typeof globalRegistry.loadJsonAsset === 'function' && globalRegistry.DATA_ASSETS && globalRegistry.DATA_ASSETS.intensityLadder) {
      globalRegistry.loadJsonAsset(globalRegistry.DATA_ASSETS.intensityLadder)
        .then(function (json) { intensityLadder = normalizeIntensityLadder(json); })
        .catch(function () {});
      return;
    }

    loadFromUrl('./data/intensity-ladder.v1.json').catch(function () {});
  }

  function readStore() {
    if (typeof localStorage === 'undefined') return { version: STORAGE_KEY, students: {} };
    var parsed = safeParse(localStorage.getItem(STORAGE_KEY), { version: STORAGE_KEY, students: {} });
    if (!parsed || typeof parsed !== 'object') parsed = { version: STORAGE_KEY, students: {} };
    if (!parsed.students || typeof parsed.students !== 'object') parsed.students = {};
    if (!parsed.version) parsed.version = STORAGE_KEY;
    return parsed;
  }

  function writeStore(store) {
    if (typeof localStorage === 'undefined') return;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
  }

  function ensureStudent(store, studentId) {
    var sid = String(studentId || '');
    if (!sid) return null;
    if (!store.students[sid]) {
      store.students[sid] = { skills: {} };
    }
    if (!store.students[sid].skills || typeof store.students[sid].skills !== 'object') {
      store.students[sid].skills = {};
    }
    return sid;
  }

  function normalizeModuleName(value) {
    return String(value || 'wordquest').toLowerCase().replace(/[^a-z]/g, '');
  }

  function normalizeResult(result) {
    var src = result && typeof result === 'object' ? result : {};
    var out = {};
    if (Number.isFinite(Number(src.accuracy))) out.accuracy = clamp(Number(src.accuracy), 0, 1);
    if (Number.isFinite(Number(src.latencyMs))) out.latencyMs = Math.max(0, Number(src.latencyMs));
    if (Number.isFinite(Number(src.wcpm))) out.wcpm = Math.max(0, Number(src.wcpm));
    if (Number.isFinite(Number(src.attempts))) out.attempts = Math.max(0, Number(src.attempts));
    if (Number.isFinite(Number(src.errorRate))) out.errorRate = clamp(Number(src.errorRate), 0, 1);
    if (Array.isArray(src.errorPattern)) out.errorPattern = src.errorPattern.slice(0, 10);
    else if (src.errorPattern != null) out.errorPattern = [String(src.errorPattern)];
    return out;
  }

  function normalizeTargets(event) {
    var inTargets = Array.isArray(event.targets) ? event.targets : [];
    return inTargets
      .map(function (id) { return String(id || '').trim(); })
      .filter(Boolean)
      .slice(0, 8);
  }

  function normalizeEvent(event) {
    var e = event && typeof event === 'object' ? event : {};
    var ts = toMs(e.timestamp);
    var timestampIso = ts ? new Date(ts).toISOString() : new Date().toISOString();
    return {
      studentId: String(e.studentId || ''),
      timestamp: timestampIso,
      module: normalizeModuleName(e.module),
      activityId: String(e.activityId || ''),
      targets: normalizeTargets(e),
      tier: e.tier === 'T3' ? 'T3' : 'T2',
      doseMin: Math.max(0, Number(e.doseMin || 0)),
      result: normalizeResult(e.result),
      confidence: Number.isFinite(Number(e.confidence)) ? clamp(Number(e.confidence), 0, 1) : DEFAULT_CONFIDENCE,
      notes: e.notes != null ? String(e.notes) : ''
    };
  }

  function recordEvidence(event) {
    var normalized = normalizeEvent(event);
    if (!normalized.studentId || !normalized.targets.length) return null;

    var store = readStore();
    var sid = ensureStudent(store, normalized.studentId);
    if (!sid) return null;

    normalized.targets.forEach(function (targetId) {
      if (!store.students[sid].skills[targetId]) {
        store.students[sid].skills[targetId] = { records: [], lastTs: 0 };
      }
      var bucket = store.students[sid].skills[targetId];
      bucket.records.push(normalized);
      if (bucket.records.length > WINDOW_N) {
        bucket.records = bucket.records.slice(-WINDOW_N);
      }
      bucket.lastTs = toMs(normalized.timestamp);
    });

    writeStore(store);
    return normalized;
  }

  function getSkillRows(studentId, targetId) {
    var sid = String(studentId || '');
    var tid = String(targetId || '');
    if (!sid || !tid) return [];
    var store = readStore();
    var bucket = store.students[sid] && store.students[sid].skills && store.students[sid].skills[tid];
    var rows = bucket && Array.isArray(bucket.records) ? bucket.records.slice() : [];
    rows.sort(function (a, b) { return toMs(a.timestamp) - toMs(b.timestamp); });
    return rows;
  }

  function getStudentSkillSnapshot(studentId, _opts) {
    var sid = String(studentId || '');
    var store = readStore();
    var skills = {};
    var skillMap = store.students[sid] && store.students[sid].skills ? store.students[sid].skills : {};

    Object.keys(skillMap).forEach(function (targetId) {
      var rows = getSkillRows(sid, targetId).slice(-WINDOW_N);
      var lastTs = rows.length ? toMs(rows[rows.length - 1].timestamp) : 0;
      var stalenessDays = daysSince(lastTs);
      var accuracyValues = rows
        .map(function (r) { return r && r.result ? r.result.accuracy : null; })
        .filter(function (v) { return Number.isFinite(Number(v)); })
        .map(function (v) { return clamp(Number(v), 0, 1); });

      var rawMastery = accuracyValues.length
        ? computeEwma(accuracyValues, EWMA_ALPHA)
        : 0.5;
      var recencyPenalty = clamp(stalenessDays / 30, 0, 0.25);
      var masteryAdj = clamp(rawMastery - recencyPenalty, 0.05, 0.98);

      skills[targetId] = {
        n: rows.length,
        rawMastery: Number(rawMastery.toFixed(4)),
        mastery: Number(masteryAdj.toFixed(4)),
        lastTs: lastTs,
        stalenessDays: stalenessDays
      };
    });

    return {
      studentId: sid,
      skills: skills
    };
  }

  function computePriority(studentId, _opts) {
    tryLoadIntensityLadder();
    var sid = String(studentId || '');
    var snapshot = getStudentSkillSnapshot(sid);
    var rows = [];

    Object.keys(snapshot.skills).forEach(function (skillId) {
      var skill = snapshot.skills[skillId];
      var recentRows = getSkillRows(sid, skillId);
      var latest = recentRows.length ? recentRows[recentRows.length - 1] : null;
      var confidence = latest && Number.isFinite(Number(latest.confidence))
        ? clamp(Number(latest.confidence), 0, 1)
        : DEFAULT_CONFIDENCE;
      var tier = latest && latest.tier === 'T3' ? 'T3' : 'T2';
      var tierCfg = getIntensityTier(tier);
      var cadenceDays = Math.max(1, Number(tierCfg.evidenceCadenceDays || 14));
      var intensityWeight = Math.max(0, Number(tierCfg.priorityWeight || 1));
      var stalenessNorm = clamp(Number(skill.stalenessDays || 0) / cadenceDays, 0, 2);
      var need = 1 - Number(skill.mastery || 0.5);
      var priorityScore = (need * 0.55)
        + (stalenessNorm * 0.25)
        + ((intensityWeight - 1) * 0.2)
        - (confidence * 0.1);
      rows.push({
        skillId: skillId,
        priorityScore: Number(priorityScore.toFixed(4)),
        need: Number(need.toFixed(4)),
        stalenessDays: Number(skill.stalenessDays || 0),
        cadenceDays: cadenceDays,
        stalenessNorm: Number(stalenessNorm.toFixed(4)),
        tier: tier,
        intensityWeight: Number(intensityWeight.toFixed(4)),
        confidence: Number(confidence.toFixed(4))
      });
    });

    rows.sort(function (a, b) { return b.priorityScore - a.priorityScore; });
    var topSkills = rows.slice(0, 3);
    var overallPriority = topSkills.reduce(function (sum, row) { return sum + Number(row.priorityScore || 0); }, 0);

    if (!topSkills.length) {
      topSkills.push({
        skillId: 'MISSING_EVIDENCE',
        priorityScore: 0.9,
        need: 0.5,
        stalenessDays: 0,
        cadenceDays: 14,
        stalenessNorm: 0,
        tier: 'T2',
        intensityWeight: 1,
        confidence: DEFAULT_CONFIDENCE
      });
      overallPriority = 0.9;
    }

    return {
      studentId: sid,
      topSkills: topSkills,
      overallPriority: Number(overallPriority.toFixed(4))
    };
  }

  function _clearAll() {
    if (typeof localStorage !== 'undefined') {
      localStorage.removeItem(STORAGE_KEY);
    }
  }

  return {
    STORAGE_KEY: STORAGE_KEY,
    WINDOW_N: WINDOW_N,
    recordEvidence: recordEvidence,
    getStudentSkillSnapshot: getStudentSkillSnapshot,
    computePriority: computePriority,
    getIntensityTier: getIntensityTier,
    _setIntensityLadderForTest: function (ladder) {
      intensityLadder = normalizeIntensityLadder(ladder);
      intensityLoadStarted = true;
    },
    _clearAll: _clearAll,
    _getSkillRows: getSkillRows
  };
}));
