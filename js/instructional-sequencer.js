(function instructionalSequencerModule(root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory(root || globalThis);
    return;
  }
  root.CSInstructionalSequencer = factory(root || globalThis);
})(typeof window !== 'undefined' ? window : globalThis, function buildInstructionalSequencer(root) {
  'use strict';

  var DEFAULT_OPTIONS = Object.freeze([
    {
      rank: 1,
      module: 'WordQuest',
      practiceMode: 'Word Quest',
      title: 'Foundational Decoding Warm-up',
      skillId: 'LIT.DEC.PHG.CVC',
      durationMin: 7,
      reason: 'No recent evidence yet. Start with a focused decoding check to establish a clear baseline.'
    },
    {
      rank: 2,
      module: 'ReadingLab',
      practiceMode: 'Fluency Builder',
      title: 'Fluency Reinforcement Sprint',
      skillId: 'LIT.FLU.ACC',
      durationMin: 6,
      reason: 'A short fluency cycle helps verify pacing and accuracy before selecting a deeper intervention.'
    },
    {
      rank: 3,
      module: 'WritingStudio',
      practiceMode: 'Guided Practice',
      title: 'Sentence Clarity Check',
      skillId: 'LIT.WRITE.SENT',
      durationMin: 5,
      reason: 'Balanced writing evidence keeps literacy planning complete when prior data is limited.'
    }
  ]);

  var MODULE_ROUTE = Object.freeze({
    WordQuest: 'word-quest.html?play=1',
    WordConnections: 'precision-play.html',
    PrecisionPlay: 'precision-play.html',
    ReadingLab: 'reading-lab.html',
    WritingStudio: 'writing-studio.html',
    SentenceStudio: 'sentence-surgery.html',
    NumeracyQuickCheck: 'numeracy.html',
    NumeracyReinforcement: 'numeracy.html?mode=reinforcement',
    NumeracyErrorSprint: 'numeracy.html?mode=error-analysis'
  });

  function clamp(num, min, max) {
    var value = Number(num);
    if (!Number.isFinite(value)) return min;
    return Math.max(min, Math.min(max, value));
  }

  function toBand(raw) {
    var value = String(raw || '').toUpperCase();
    if (value === 'NOT_STARTED') return 'NOT_STARTED';
    if (value === 'EMERGING') return 'EMERGING';
    if (value === 'DEVELOPING') return 'DEVELOPING';
    if (value === 'SECURE') return 'SECURE';
    if (value === 'AUTOMATED') return 'AUTOMATED';
    return 'NOT_STARTED';
  }

  function getDomain(skillId) {
    var sid = String(skillId || '').toUpperCase();
    if (!sid) return 'literacy';
    if (sid.indexOf('MATH') >= 0 || sid.indexOf('NUM') >= 0 || sid.indexOf('NUMERACY') >= 0) return 'math';
    if (sid.indexOf('WRITE') >= 0 || sid.indexOf('WRITING') >= 0 || sid.indexOf('SENTENCE') >= 0) return 'writing';
    return 'literacy';
  }

  function getTierLevel(studentId, primarySkill) {
    var TierEngine = root.CSTierEngine;
    if (TierEngine && typeof TierEngine.computeTierSignal === 'function') {
      var rows = getSkillRows(studentId, primarySkill && primarySkill.skillId);
      var recentAccuracy = clamp(primarySkill && primarySkill.mastery, 0, 1);
      var goalAccuracy = 0.8;
      var stableCount = rows.slice(-5).reduce(function (count, row) {
        var score = Number(row && (row.accuracy != null ? row.accuracy : row.score));
        if (!Number.isFinite(score)) return count;
        if (score > 1) score = score / 100;
        return score >= goalAccuracy ? count + 1 : count;
      }, 0);
      var weeksInIntervention = Math.max(1, Math.round(rows.length / 2));
      var fidelityPercent = 85;
      var tier = TierEngine.computeTierSignal({
        recentAccuracy: recentAccuracy,
        goalAccuracy: goalAccuracy,
        stableCount: stableCount,
        weeksInIntervention: weeksInIntervention,
        fidelityPercent: fidelityPercent
      });
      if (tier && tier.tierLevel === 'Tier 3') return 3;
      if (tier && tier.tierLevel === 'Tier 2') return 2;
      return 1;
    }
    try {
      var SupportStore = root.CSSupportStore;
      if (SupportStore && typeof SupportStore.getStudent === 'function') {
        var student = SupportStore.getStudent(studentId);
        var interventions = student && Array.isArray(student.interventions) ? student.interventions : [];
        var maxTier = interventions.reduce(function (max, row) {
          return Math.max(max, Number(row && row.tier) || 0);
        }, 0);
        if (maxTier >= 1 && maxTier <= 3) return maxTier;
      }
    } catch (_e) {}
    var tierText = String(primarySkill && primarySkill.tier || '').toUpperCase();
    if (tierText === 'T3') return 3;
    if (tierText === 'T2') return 2;
    return 1;
  }

  function getRecentSessions(studentId) {
    try {
      var Evidence = root.CSEvidence;
      if (Evidence && typeof Evidence.getRecentSessions === 'function') {
        return Evidence.getRecentSessions(studentId, { limit: 5 }) || [];
      }
    } catch (_e) {}
    return [];
  }

  function getSkillRows(studentId, skillId) {
    try {
      var EvidenceEngine = root.CSEvidenceEngine;
      if (EvidenceEngine && typeof EvidenceEngine._getSkillRows === 'function') {
        return EvidenceEngine._getSkillRows(studentId, skillId) || [];
      }
    } catch (_e) {}
    return [];
  }

  function getTrend(studentId, skillId) {
    try {
      var EvidenceEngine = root.CSEvidenceEngine;
      if (EvidenceEngine && typeof EvidenceEngine.computeMtssTrendDecision === 'function') {
        var trend = EvidenceEngine.computeMtssTrendDecision(studentId, skillId) || {};
        var status = String(trend.status || '').toUpperCase();
        if (status === 'INTENSIFY' || status === 'HOLD' || status === 'FADE') return status;
      }
    } catch (_e) {}
    return 'HOLD';
  }

  function buildSkillSignals(studentId) {
    var signals = [];
    try {
      var EvidenceEngine = root.CSEvidenceEngine;
      if (!EvidenceEngine || typeof EvidenceEngine.getStudentSkillSnapshot !== 'function') return signals;
      var snapshot = EvidenceEngine.getStudentSkillSnapshot(studentId) || { skills: {} };
      var skills = snapshot.skills && typeof snapshot.skills === 'object' ? snapshot.skills : {};
      Object.keys(skills).forEach(function (skillId) {
        var skill = skills[skillId] || {};
        var band = toBand(skill.band);
        var trend = getTrend(studentId, skillId);
        var rows = getSkillRows(studentId, skillId);
        var latest = rows.length ? rows[rows.length - 1] : null;
        var tier = latest && latest.tier === 'T3' ? 'T3' : 'T2';
        signals.push({
          skillId: skillId,
          band: band,
          trend: trend,
          tier: tier,
          domain: getDomain(skillId),
          stalenessDays: Number(skill.stalenessDays || 0),
          latestTs: Number(skill.lastTs || 0),
          mastery: clamp(skill.mastery, 0, 1)
        });
      });
    } catch (_e) {}
    return signals;
  }

  function scoreSignal(signal, tierLevel) {
    var score = 0;
    if (signal.trend === 'INTENSIFY') score += 120;
    else if (signal.trend === 'HOLD') score += 70;
    else if (signal.trend === 'FADE') score += 45;

    if (signal.band === 'EMERGING') score += 55;
    else if (signal.band === 'NOT_STARTED') score += 50;
    else if (signal.band === 'DEVELOPING') score += 35;
    else if (signal.band === 'SECURE') score += 15;

    if (tierLevel >= 3) score += 25;
    else if (tierLevel === 2) score += 15;

    score += clamp(signal.stalenessDays / 2, 0, 20);
    return score;
  }

  function choosePrimarySkill(signals, tierLevel) {
    if (!signals.length) return null;
    var sorted = signals.slice().sort(function (a, b) {
      return scoreSignal(b, tierLevel) - scoreSignal(a, tierLevel);
    });

    var intensify = sorted.find(function (row) { return row.trend === 'INTENSIFY'; });
    if (intensify) return intensify;

    var emerging = sorted.find(function (row) { return row.band === 'EMERGING' || row.band === 'NOT_STARTED'; });
    if (emerging) return emerging;

    var tierDeveloping = sorted.find(function (row) { return row.band === 'DEVELOPING' && tierLevel >= 2; });
    if (tierDeveloping) return tierDeveloping;

    sorted.sort(function (a, b) { return (b.latestTs || 0) - (a.latestTs || 0); });
    return sorted[0] || null;
  }

  function isWordConnectionsEligible(skillId) {
    var sid = String(skillId || '').toUpperCase();
    if (!sid) return false;
    return (
      sid.indexOf('VOC') >= 0 ||
      sid.indexOf('MOR') >= 0 ||
      sid.indexOf('LANG') >= 0 ||
      sid.indexOf('SEM') >= 0 ||
      sid.indexOf('REL') >= 0 ||
      sid.indexOf('ACA') >= 0
    );
  }

  function moduleForSkill(domain, band, trend, skillId) {
    if (domain === 'literacy') {
      if (isWordConnectionsEligible(skillId) && (band === 'DEVELOPING' || trend === 'HOLD' || trend === 'INTENSIFY')) {
        return 'WordConnections';
      }
      if (band === 'EMERGING' || band === 'NOT_STARTED') return 'WordQuest';
      if (band === 'DEVELOPING') return 'PrecisionPlay';
      return trend === 'FADE' ? 'ReadingLab' : 'WordQuest';
    }
    if (domain === 'writing') {
      if (band === 'EMERGING' || band === 'NOT_STARTED') return 'WritingStudio';
      if (band === 'DEVELOPING') return 'PrecisionPlay';
      return 'WritingStudio';
    }
    if (domain === 'math') {
      if (band === 'EMERGING' || band === 'NOT_STARTED') return 'NumeracyQuickCheck';
      if (band === 'DEVELOPING') return 'NumeracyReinforcement';
      return 'NumeracyErrorSprint';
    }
    return 'WordQuest';
  }

  function titleForOption(domain, module, rank, trend, band) {
    if (domain === 'literacy') {
      if (module === 'WordConnections') return rank === 1 ? 'Academic Vocabulary Connections' : 'Word Relationship Reinforcement';
      if (module === 'WordQuest') return rank === 1 ? 'Targeted Decoding Reset' : 'Structured Decoding Repetition';
      if (module === 'PrecisionPlay') return rank === 1 ? 'Academic Language Precision Round' : 'Vocabulary-to-Meaning Reinforcement';
      if (module === 'ReadingLab') return trend === 'FADE' ? 'Fluency Generalization Sprint' : 'Fluency Stability Check';
    }
    if (domain === 'writing') {
      if (module === 'WritingStudio') return band === 'SECURE' ? 'Timed Writing Transfer Burst' : 'Guided Sentence Structure Practice';
      if (module === 'PrecisionPlay') return 'Academic Language Construction Drill';
    }
    if (domain === 'math') {
      if (module === 'NumeracyQuickCheck') return 'Numeracy Concept Follow-up';
      if (module === 'NumeracyReinforcement') return 'Concept Reinforcement Mini-Task';
      if (module === 'NumeracyErrorSprint') return 'Error Analysis Sprint';
    }
    return 'Focused Skill Reinforcement';
  }

  function reasonForOption(args) {
    var trend = args.trend;
    var tierLevel = args.tierLevel;
    var domain = args.domain;
    var rank = args.rank;

    if (trend === 'INTENSIFY' && rank === 1) {
      return 'Recent data shows 4 consecutive scores below goal; targeted skill reinforcement is recommended using the 4-point rule below goal.';
    }
    if (trend === 'FADE' && rank === 1) {
      return 'Current performance is stable; this move supports fluency transfer and fade support while maintaining accuracy.';
    }
    if (trend === 'HOLD' && rank === 1) {
      return 'Progress is steady but not fully stable; moderate reinforcement will consolidate this skill before increasing complexity.';
    }
    if (rank === 2 && tierLevel >= 2) {
      return 'Tier ' + tierLevel + ' support is active; this reinforcement move strengthens reliability between intervention cycles.';
    }
    if (rank === 2 && trend === 'HOLD') {
      return 'Cross-domain support is included to improve transfer and reduce regression risk in daily instruction.';
    }
    if (rank === 3 && tierLevel === 3) {
      return 'Maintenance practice preserves previously gained skills while remediation remains focused on the highest need.';
    }
    if (domain === 'writing') {
      return 'Focused writing rehearsal supports clarity and organization with manageable cognitive load.';
    }
    if (args.module === 'WordConnections') {
      return 'Vocabulary, morphology, and word relationships are priority signals; Word Connections provides structured language rehearsal tied to the current literacy focus.';
    }
    if (domain === 'math') {
      return 'Short structured math language practice helps maintain conceptual accuracy and response confidence.';
    }
    return 'This move balances reinforcement and generalization while keeping the session efficient for classroom use.';
  }

  function durationForOption(trend, tierLevel, rank) {
    if (trend === 'INTENSIFY') {
      if (rank === 1) return tierLevel >= 3 ? 10 : 8;
      if (rank === 2) return 7;
      return 6;
    }
    if (trend === 'FADE') {
      if (rank === 1) return 6;
      if (rank === 2) return 5;
      return 5;
    }
    if (rank === 1) return tierLevel >= 2 ? 7 : 6;
    if (rank === 2) return 6;
    return 5;
  }

  function practiceModeForModule(module) {
    var m = String(module || '');
    if (m === 'WordQuest') return 'Word Quest';
    if (m === 'WordConnections' || m === 'PrecisionPlay') return 'Word Connections';
    if (m === 'ReadingLab') return 'Fluency Builder';
    return 'Guided Practice';
  }

  function uniquePush(out, item) {
    if (!item) return;
    var key = String(item.module || '') + '|' + String(item.skillId || '') + '|' + String(item.title || '');
    if (out.__seen[key]) return;
    out.__seen[key] = true;
    out.rows.push(item);
  }

  function buildOptions(primary, tierLevel) {
    if (!primary) return DEFAULT_OPTIONS.slice();

    var options = { rows: [], __seen: {} };
    var trend = primary.trend || 'HOLD';
    var domain = primary.domain || 'literacy';

    var primaryModule = moduleForSkill(domain, primary.band, trend, primary.skillId);
    uniquePush(options, {
      rank: 1,
      module: primaryModule,
      practiceMode: practiceModeForModule(primaryModule),
      title: titleForOption(domain, primaryModule, 1, trend, primary.band),
      skillId: primary.skillId,
      durationMin: durationForOption(trend, tierLevel, 1),
      reason: reasonForOption({ trend: trend, tierLevel: tierLevel, domain: domain, rank: 1, module: primaryModule }),
      href: (MODULE_ROUTE[primaryModule] || 'word-quest.html?play=1') + (primaryModule === 'WordConnections' ? ('?mode=TARGETED&skill=' + encodeURIComponent(primary.skillId || 'literacy.vocabulary')) : '')
    });

    var secondDomain = trend === 'HOLD'
      ? (domain === 'literacy' ? 'writing' : 'literacy')
      : domain;
    var secondModule = moduleForSkill(secondDomain, 'DEVELOPING', trend === 'FADE' ? 'HOLD' : trend, primary.skillId);
    uniquePush(options, {
      rank: 2,
      module: secondModule,
      practiceMode: practiceModeForModule(secondModule),
      title: titleForOption(secondDomain, secondModule, 2, trend, 'DEVELOPING'),
      skillId: primary.skillId,
      durationMin: durationForOption(trend, tierLevel, 2),
      reason: reasonForOption({ trend: trend, tierLevel: tierLevel, domain: secondDomain, rank: 2, module: secondModule }),
      href: (MODULE_ROUTE[secondModule] || 'word-quest.html?play=1') + (secondModule === 'WordConnections' ? ('?mode=TARGETED&skill=' + encodeURIComponent(primary.skillId || 'literacy.vocabulary')) : '')
    });

    var thirdDomain = tierLevel >= 3 ? domain : (domain === 'math' ? 'literacy' : 'math');
    var thirdModule = moduleForSkill(thirdDomain, 'SECURE', trend === 'INTENSIFY' ? 'HOLD' : trend, primary.skillId);
    uniquePush(options, {
      rank: 3,
      module: thirdModule,
      practiceMode: practiceModeForModule(thirdModule),
      title: titleForOption(thirdDomain, thirdModule, 3, trend, 'SECURE'),
      skillId: primary.skillId,
      durationMin: durationForOption(trend, tierLevel, 3),
      reason: reasonForOption({ trend: trend, tierLevel: tierLevel, domain: thirdDomain, rank: 3, module: thirdModule }),
      href: (MODULE_ROUTE[thirdModule] || 'word-quest.html?play=1') + (thirdModule === 'WordConnections' ? ('?mode=TARGETED&skill=' + encodeURIComponent(primary.skillId || 'literacy.vocabulary')) : '')
    });

    var fallbackIdx = 0;
    while (options.rows.length < 3) {
      var fallback = DEFAULT_OPTIONS[fallbackIdx % DEFAULT_OPTIONS.length];
      uniquePush(options, {
        rank: options.rows.length + 1,
        module: fallback.module,
        practiceMode: fallback.practiceMode || practiceModeForModule(fallback.module),
        title: fallback.title,
        skillId: fallback.skillId,
        durationMin: fallback.durationMin,
        reason: fallback.reason,
        href: MODULE_ROUTE[fallback.module] || 'word-quest.html?play=1'
      });
      fallbackIdx += 1;
    }

    return options.rows.slice(0, 3).map(function (row, index) {
      return {
        rank: index + 1,
        module: row.module,
        practiceMode: row.practiceMode || practiceModeForModule(row.module),
        title: row.title,
        skillId: row.skillId,
        durationMin: clamp(row.durationMin, 5, 10),
        reason: String(row.reason || ''),
        href: row.href
      };
    });
  }

  function generateInstructionalOptions(studentId) {
    var sid = String(studentId || '').trim();
    if (!sid) {
      return DEFAULT_OPTIONS.slice();
    }

    var signals = buildSkillSignals(sid);
    var recentSessions = getRecentSessions(sid);
    if (!signals.length && !recentSessions.length) {
      return DEFAULT_OPTIONS.slice();
    }

    var primary = choosePrimarySkill(signals, 2);
    var tierLevel = getTierLevel(sid, primary);
    var options = buildOptions(primary, tierLevel);
    return options.slice(0, 3);
  }

  return {
    generateInstructionalOptions: generateInstructionalOptions
  };
});
