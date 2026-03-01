(function initEvidenceEngine(root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.CSEvidenceEngine = factory();
  }
}(typeof globalThis !== 'undefined' ? globalThis : window, function factory() {
  'use strict';

  var STORAGE_KEY = 'cs.evidence.v2';
  var WINDOW_N = 5;
  var EWMA_ALPHA = 0.55;

  var DEFAULT_MAPPING = {
    modules: {
      wordquest: {
        primary: ['LIT.DEC.PHG', 'LIT.DEC.SYL', 'LIT.DEC.IRREG'],
        secondary: ['LIT.LANG.VOC'],
        evidence: ['accuracy', 'error_pattern', 'latency', 'retrieval_strength']
      },
      readinglab: {
        primary: ['LIT.FLU.ACC', 'LIT.FLU.PRO'],
        secondary: ['LIT.LANG.SYN'],
        evidence: ['wcpm', 'error_rate', 'self_correction', 'prosody_rating']
      },
      sentencesurgery: {
        primary: ['LIT.LANG.SYN'],
        secondary: ['LIT.LANG.VOC', 'LIT.WRITE.SENT'],
        evidence: ['sentence_repair', 'cloze', 'grammar_events']
      },
      writingstudio: {
        primary: ['LIT.WRITE.SENT', 'LIT.WRITE.PAR'],
        secondary: ['LIT.LANG.VOC'],
        evidence: ['sentence_quality', 'cohesion_events']
      }
    }
  };

  var DEFAULT_INTENSITY = {
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

  var mappingConfig = DEFAULT_MAPPING;
  var intensityConfig = DEFAULT_INTENSITY;
  var intensityLoadStarted = false;

  function clamp(v, lo, hi) {
    return Math.max(lo, Math.min(hi, v));
  }

  function mean(values) {
    if (!values.length) return 0;
    return values.reduce(function (sum, v) { return sum + v; }, 0) / values.length;
  }

  function nowTs() {
    return Date.now();
  }

  function toMs(value) {
    if (!value) return 0;
    if (typeof value === 'number') return value;
    var parsed = Date.parse(String(value));
    return Number.isFinite(parsed) ? parsed : 0;
  }

  function daysSince(ts) {
    if (!ts) return 365;
    return Math.max(0, Math.floor((nowTs() - ts) / 86400000));
  }

  function safeParse(raw, fallback) {
    try {
      return JSON.parse(raw);
    } catch (_e) {
      return fallback;
    }
  }

  function readStore() {
    if (typeof localStorage === 'undefined') {
      return { students: {} };
    }
    var parsed = safeParse(localStorage.getItem(STORAGE_KEY), { students: {} });
    if (!parsed || typeof parsed !== 'object') return { students: {} };
    if (!parsed.students || typeof parsed.students !== 'object') parsed.students = {};
    return parsed;
  }

  function writeStore(store) {
    if (typeof localStorage === 'undefined') return;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
  }

  function normalizeModule(moduleName) {
    return String(moduleName || '').toLowerCase().replace(/[^a-z]/g, '');
  }

  function inferTargets(event) {
    var mod = normalizeModule(event.module);
    var fromMap = mappingConfig.modules[mod];
    if (fromMap && Array.isArray(fromMap.primary) && fromMap.primary.length) {
      return fromMap.primary.slice(0, 2);
    }
    return [];
  }

  function normalizeAccuracy(result) {
    if (!result || typeof result !== 'object') return null;
    if (Number.isFinite(Number(result.accuracy))) {
      var raw = Number(result.accuracy);
      if (raw > 1) return clamp(raw / 100, 0, 1);
      return clamp(raw, 0, 1);
    }
    if (Number.isFinite(Number(result.wcpm))) {
      return clamp(Number(result.wcpm) / 150, 0, 1);
    }
    if (Number.isFinite(Number(result.attempts)) && result.attempts > 0) {
      return clamp(1 - (Number(result.errorCount || 0) / Number(result.attempts)), 0, 1);
    }
    return null;
  }

  function ensureStudent(store, studentId) {
    var sid = String(studentId || '');
    if (!sid) return null;
    if (!store.students[sid]) {
      store.students[sid] = {
        records: []
      };
    }
    return sid;
  }

  function normalizeIntensity(nextIntensity) {
    if (!nextIntensity || typeof nextIntensity !== 'object' || !nextIntensity.tiers) {
      return DEFAULT_INTENSITY;
    }
    var t2 = nextIntensity.tiers.T2 || DEFAULT_INTENSITY.tiers.T2;
    var t3 = nextIntensity.tiers.T3 || DEFAULT_INTENSITY.tiers.T3;
    return {
      version: String(nextIntensity.version || DEFAULT_INTENSITY.version),
      tiers: {
        T2: {
          label: String(t2.label || 'Tier 2'),
          sessionsPerWeek: Number(t2.sessionsPerWeek || 3),
          minutesPerSession: Number(t2.minutesPerSession || 20),
          groupSizeMax: Number(t2.groupSizeMax || 4),
          evidenceCadenceDays: Number(t2.evidenceCadenceDays || 14),
          priorityWeight: Number(t2.priorityWeight || 1.0)
        },
        T3: {
          label: String(t3.label || 'Tier 3'),
          sessionsPerWeek: Number(t3.sessionsPerWeek || 4),
          minutesPerSession: Number(t3.minutesPerSession || 25),
          groupSizeMax: Number(t3.groupSizeMax || 2),
          evidenceCadenceDays: Number(t3.evidenceCadenceDays || 7),
          priorityWeight: Number(t3.priorityWeight || 1.2)
        }
      }
    };
  }

  function getTierConfig(tier) {
    var key = tier === 'T3' ? 'T3' : 'T2';
    return intensityConfig.tiers[key] || DEFAULT_INTENSITY.tiers[key];
  }

  function tryLoadIntensityLadder() {
    if (intensityLoadStarted) return;
    intensityLoadStarted = true;
    if (typeof fetch !== 'function') return;
    fetch('./data/intensity-ladder.v1.json', { cache: 'no-store' })
      .then(function (resp) { return resp && resp.ok ? resp.json() : null; })
      .then(function (json) {
        if (json && typeof json === 'object') intensityConfig = normalizeIntensity(json);
      })
      .catch(function () {});
  }

  function ewma(values, alpha) {
    if (!values.length) return 0.5;
    var acc = values[0];
    for (var i = 1; i < values.length; i += 1) {
      acc = (alpha * values[i]) + ((1 - alpha) * acc);
    }
    return acc;
  }

  function recordEvidence(event) {
    var store = readStore();
    var sid = ensureStudent(store, event && event.studentId);
    if (!sid) return null;

    var normalized = {
      studentId: sid,
      timestamp: event.timestamp || new Date().toISOString(),
      module: String(event.module || 'wordquest'),
      activityId: String(event.activityId || ''),
      targets: Array.isArray(event.targets) && event.targets.length ? event.targets.slice(0, 4) : inferTargets(event || {}),
      tier: event.tier === 'T3' ? 'T3' : 'T2',
      doseMin: Number(event.doseMin || 0),
      result: event.result && typeof event.result === 'object' ? event.result : {},
      confidence: Number.isFinite(Number(event.confidence)) ? clamp(Number(event.confidence), 0, 1) : 0.5
    };

    store.students[sid].records.push(normalized);
    if (store.students[sid].records.length > 400) {
      store.students[sid].records = store.students[sid].records.slice(-400);
    }
    writeStore(store);
    return normalized;
  }

  function getStudentRecords(studentId) {
    var store = readStore();
    var sid = String(studentId || '');
    var rows = (store.students[sid] && store.students[sid].records) || [];
    return rows.slice().sort(function (a, b) {
      return toMs(a.timestamp) - toMs(b.timestamp);
    });
  }

  function getStudentSkillSnapshot(studentId) {
    tryLoadIntensityLadder();
    var records = getStudentRecords(studentId);
    var bySkill = {};

    records.forEach(function (row) {
      var targets = Array.isArray(row.targets) ? row.targets : [];
      if (!targets.length) return;
      var acc = normalizeAccuracy(row.result);
      targets.forEach(function (skillId) {
        if (!bySkill[skillId]) bySkill[skillId] = [];
        bySkill[skillId].push({
          ts: toMs(row.timestamp),
          tier: row.tier === 'T3' ? 'T3' : 'T2',
          confidence: Number.isFinite(Number(row.confidence)) ? clamp(Number(row.confidence), 0, 1) : 0.5,
          masteryPoint: acc,
          doseMin: Number(row.doseMin || 0)
        });
      });
    });

    var skills = Object.keys(bySkill).map(function (skillId) {
      var rows = bySkill[skillId].slice(-WINDOW_N);
      var masteryValues = rows
        .map(function (r) { return r.masteryPoint; })
        .filter(function (v) { return Number.isFinite(v); });
      var rawMastery = masteryValues.length ? ewma(masteryValues, EWMA_ALPHA) : 0.5;
      var last = rows[rows.length - 1] || {};
      var tier = last.tier || 'T2';
      var staleness = daysSince(last.ts || 0);
      var penalty = clamp(staleness / 30, 0, 0.25);
      var masteryAdj = clamp(rawMastery - penalty, 0.05, 0.98);
      var tierCfg = getTierConfig(tier);
      return {
        skillId: skillId,
        n: rows.length,
        rawMastery: Number(clamp(rawMastery, 0, 1).toFixed(4)),
        mastery: Number(masteryAdj.toFixed(4)),
        records: rows.length,
        tier: tier,
        confidence: Number.isFinite(Number(last.confidence)) ? clamp(Number(last.confidence), 0, 1) : 0.5,
        lastSeenTs: last.ts || 0,
        stalenessDays: staleness,
        cadenceTargetDays: Number(tierCfg.evidenceCadenceDays || 14),
        doseTargetMin: Number(tierCfg.minutesPerSession || 20)
      };
    });

    return {
      studentId: String(studentId || ''),
      updatedAt: new Date().toISOString(),
      skills: skills
    };
  }

  function computePriority(studentId) {
    var snapshot = getStudentSkillSnapshot(studentId);
    var topSkills = snapshot.skills.map(function (skill) {
      var need = 1 - skill.mastery;
      var tierCfg = getTierConfig(skill.tier);
      var intensityWeight = Number(tierCfg.priorityWeight || 1.0);
      var cadence = Math.max(1, Number(tierCfg.evidenceCadenceDays || 14));
      var stalenessNorm = clamp(skill.stalenessDays / cadence, 0, 2);
      var confidence = Number.isFinite(Number(skill.confidence)) ? skill.confidence : 0.5;
      var priority =
        (need * 0.55) +
        (stalenessNorm * 0.25) +
        ((intensityWeight - 1) * 0.20) -
        (confidence * 0.10);
      return {
        skillId: skill.skillId,
        tier: skill.tier,
        priorityScore: Number(priority.toFixed(4)),
        need: Number(need.toFixed(4)),
        stalenessDays: skill.stalenessDays,
        stalenessNorm: Number(stalenessNorm.toFixed(4)),
        cadenceTargetDays: cadence,
        intensityWeight: intensityWeight,
        confidence: confidence,
        mastery: skill.mastery,
        rawMastery: skill.rawMastery,
        rationale: 'Priority: ' + skill.skillId + ' — low mastery + ' + skill.stalenessDays + ' days stale'
      };
    }).sort(function (a, b) {
      return b.priorityScore - a.priorityScore;
    });

    var overall = topSkills.length ? mean(topSkills.map(function (s) { return s.priorityScore; })) : 0;

    return {
      studentId: String(studentId || ''),
      topSkills: topSkills.slice(0, 3),
      overallPriority: Number(overall.toFixed(4))
    };
  }

  function setMapping(nextMapping) {
    if (nextMapping && typeof nextMapping === 'object' && nextMapping.modules) {
      mappingConfig = nextMapping;
    }
  }

  function setIntensityLadder(nextIntensity) {
    intensityConfig = normalizeIntensity(nextIntensity);
  }

  function _clearAll() {
    if (typeof localStorage !== 'undefined') localStorage.removeItem(STORAGE_KEY);
  }

  return {
    STORAGE_KEY: STORAGE_KEY,
    recordEvidence: recordEvidence,
    getStudentSkillSnapshot: getStudentSkillSnapshot,
    computePriority: computePriority,
    setMapping: setMapping,
    setIntensityLadder: setIntensityLadder,
    getTierConfig: getTierConfig,
    _clearAll: _clearAll
  };
}));
