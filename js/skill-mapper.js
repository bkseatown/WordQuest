(function skillMapperModule(root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory(root && root.CSSkillTaxonomy ? root.CSSkillTaxonomy : null);
    return;
  }
  root.CSSkillMapper = factory(root.CSSkillTaxonomy || null);
})(typeof self !== 'undefined' ? self : this, function (taxonomyApi) {
  'use strict';

  var TAX = taxonomyApi && Array.isArray(taxonomyApi.SKILLS) ? taxonomyApi : null;

  var SIGNAL_TO_SKILL_WEIGHTS = {
    vowel_confusion_rate: {
      'decoding.short_vowels': -1.2,
      'decoding.long_vowels': -1.1,
      'orthography.pattern_control': -0.4
    },
    repeat_same_slot_error: {
      'orthography.pattern_control': -1.4,
      'decoding.short_vowels': -0.5
    },
    guess_efficiency: {
      'fluency.pacing': 1.0,
      'orthography.pattern_control': 0.5
    },
    correction_after_feedback: {
      'orthography.pattern_control': 1.2,
      'decoding.long_vowels': 0.6
    },
    orthographic_pattern_miss: {
      'orthography.pattern_control': -1.1,
      'decoding.long_vowels': -0.8,
      'decoding.short_vowels': -0.5
    },
    morphology_hint_usage: {
      'morphology.inflectional': 0.7,
      'morphology.derivational': 0.5,
      'writing.elaboration': 0.2
    }
  };

  function toNum(value, fallback) {
    var n = Number(value);
    return Number.isFinite(n) ? n : Number(fallback || 0);
  }

  function clamp(value, min, max) {
    var n = toNum(value, min);
    if (n < min) return min;
    if (n > max) return max;
    return n;
  }

  function normalizeEvents(events) {
    if (!events || typeof events !== 'object') return {};
    return events;
  }

  function ensureKnownSkill(skillId) {
    if (!TAX) return true;
    return !!TAX.getSkill(skillId);
  }

  function deriveSignals(payload) {
    var session = payload && payload.session || {};
    var events = normalizeEvents(payload && payload.events);
    var result = payload && payload.result || {};
    var sig = session.signals || {};

    var guessCount = Math.max(1, toNum(sig.guessCount || result.attemptsUsed || result.guesses || 0, 1));
    var misplaceRate = clamp(sig.misplaceRate, 0, 1);
    var absentRate = clamp(sig.absentRate, 0, 1);
    var vowelSwapCount = Math.max(0, toNum(sig.vowelSwapCount, 0));
    var repeatBadSlot = Math.max(0, toNum(sig.repeatSameBadSlotCount, 0));
    var violations = Math.max(0, toNum(sig.constraintViolations, 0));

    var uniqueLetters = Math.max(0, toNum(events.uniqueLettersTested, toNum(result.uniqueLettersTested, 0)));
    var correctionAfterFirstMiss = clamp(toNum(events.correctionAfterFirstMiss, result.solved ? 1 : 0), 0, 1);
    var patternMisses = Math.max(0, toNum(events.patternMisses, violations));
    var morphHints = Math.max(0, toNum(events.morphologyHintsUsed, events.helpUsed ? 1 : 0));

    return {
      vowel_confusion_rate: clamp((misplaceRate * 0.65) + (vowelSwapCount / guessCount) * 0.35, 0, 1),
      repeat_same_slot_error: clamp(repeatBadSlot / guessCount, 0, 1),
      guess_efficiency: clamp(uniqueLetters / (guessCount * 2), 0, 1),
      correction_after_feedback: correctionAfterFirstMiss,
      orthographic_pattern_miss: clamp((patternMisses / guessCount) * 0.7 + absentRate * 0.3, 0, 1),
      morphology_hint_usage: clamp(morphHints / Math.max(1, guessCount / 2), 0, 1)
    };
  }

  function mapWQSignalsToSkillEvidence(payload) {
    var session = payload && payload.session || {};
    var studentId = String((session && session.studentId) || (payload && payload.studentId) || '').trim();
    var createdAt = String(session && session.createdAt || new Date().toISOString());
    var signals = deriveSignals(payload || {});

    var deltas = {};
    Object.keys(signals).forEach(function (signalKey) {
      var value = toNum(signals[signalKey], 0);
      var weights = SIGNAL_TO_SKILL_WEIGHTS[signalKey] || {};
      Object.keys(weights).forEach(function (skillId) {
        if (!ensureKnownSkill(skillId)) return;
        var weight = toNum(weights[skillId], 0);
        var signed = value * weight;
        deltas[skillId] = toNum(deltas[skillId], 0) + signed;
      });
    });

    var skillDelta = {};
    Object.keys(deltas).forEach(function (skillId) {
      var bounded = clamp(deltas[skillId], -2, 2);
      skillDelta[skillId] = Number(bounded.toFixed(3));
    });

    return {
      studentId: studentId,
      createdAt: createdAt,
      source: 'wordquest',
      skillDelta: skillDelta,
      features: signals
    };
  }

  return {
    SIGNAL_TO_SKILL_WEIGHTS: SIGNAL_TO_SKILL_WEIGHTS,
    mapWQSignalsToSkillEvidence: mapWQSignalsToSkillEvidence
  };
});
