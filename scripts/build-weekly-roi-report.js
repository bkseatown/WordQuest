#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');

function argValue(flag, fallback = '') {
  const idx = process.argv.indexOf(flag);
  if (idx < 0) return fallback;
  return String(process.argv[idx + 1] || fallback);
}

function toNumber(value, fallback = 0) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function pct(value) {
  return Math.round(Math.max(0, Math.min(1, toNumber(value, 0))) * 100);
}

function normalizeRows(raw) {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((entry) => {
      const event = String(entry?.event_name || entry?.event || entry?.name || '').trim().toLowerCase();
      const ts = toNumber(entry?.ts_ms ?? entry?.ts ?? entry?.timestamp ?? entry?.time, 0);
      const payload = (entry && typeof entry === 'object') ? entry : {};
      return { event, ts, payload };
    })
    .filter((row) => row.event && row.ts > 0);
}

function rowsInWindow(rows, startMs, endMs) {
  return rows.filter((row) => row.ts >= startMs && row.ts < endMs);
}

function countByEvent(rows, eventName) {
  const target = String(eventName || '').toLowerCase();
  return rows.filter((row) => row.event === target).length;
}

function mean(values) {
  if (!values.length) return null;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function computeLearningScore(rows) {
  const rounds = rows.filter((row) => row.event === 'wq_round_complete');
  const wins = rounds.filter((row) => Boolean(row.payload?.won)).length;
  const roundWinRate = rounds.length ? (wins / rounds.length) : null;

  const deepDiveRows = rows.filter((row) =>
    row.event === 'wq_funnel_deep_dive_completed' || row.event === 'wq_deep_dive_complete'
  );
  const deepDiveRates = deepDiveRows
    .map((row) => toNumber(row.payload?.completion_rate ?? row.payload?.completionRate, NaN))
    .filter((value) => Number.isFinite(value))
    .map((value) => Math.max(0, Math.min(1, value)));
  const deepDiveCompletion = deepDiveRates.length ? mean(deepDiveRates) : null;

  const components = [roundWinRate, deepDiveCompletion].filter((value) => value !== null);
  return {
    roundWinRate,
    deepDiveCompletion,
    score: components.length ? Math.round(mean(components) * 100) : null
  };
}

function computeReliabilityScore(rows) {
  const errorRows = rows.filter((row) => row.event === 'wq_error');
  const blockerCount = errorRows.filter((row) => {
    const severity = String(row.payload?.severity || row.payload?.level || '').toLowerCase();
    return severity === 'blocker' || severity === 'critical' || severity === 'fatal';
  }).length;
  const score = Math.max(0, 100 - (blockerCount * 20));
  return { blockerCount, score };
}

function computeAdoptionScore(rows) {
  const sessions = countByEvent(rows, 'wq_funnel_session_start');
  const questSelects = countByEvent(rows, 'wq_funnel_quest_select');
  const deepDiveStarts = countByEvent(rows, 'wq_funnel_deep_dive_started');

  const sessionToQuest = sessions > 0 ? (questSelects / sessions) : null;
  const questToDeepDiveStart = questSelects > 0 ? (deepDiveStarts / questSelects) : null;
  const components = [sessionToQuest, questToDeepDiveStart].filter((value) => value !== null);
  const score = components.length ? Math.round(mean(components) * 100) : null;
  return { sessions, questSelects, deepDiveStarts, sessionToQuest, questToDeepDiveStart, score };
}

function buildFunnel(rows) {
  return {
    sessionStart: countByEvent(rows, 'wq_funnel_session_start'),
    questSelect: countByEvent(rows, 'wq_funnel_quest_select'),
    deepDiveStarted: countByEvent(rows, 'wq_funnel_deep_dive_started'),
    deepDiveCompleted: countByEvent(rows, 'wq_funnel_deep_dive_completed'),
    resetUsed: countByEvent(rows, 'wq_funnel_reset_used'),
    forceUpdateUsed: countByEvent(rows, 'wq_funnel_force_update_used')
  };
}

function buildFrictionSignals(rows, funnel) {
  const rounds = countByEvent(rows, 'wq_round_complete');
  const sessionWithoutQuest = Math.max(0, funnel.sessionStart - funnel.questSelect);
  const questWithoutDeepDiveStart = Math.max(0, funnel.questSelect - funnel.deepDiveStarted);
  const deepDiveStartWithoutComplete = Math.max(0, funnel.deepDiveStarted - funnel.deepDiveCompleted);
  const sessionWithoutRound = Math.max(0, funnel.sessionStart - rounds);
  const signals = [
    { label: 'Session start without quest select', value: sessionWithoutQuest },
    { label: 'Quest select without deep dive start', value: questWithoutDeepDiveStart },
    { label: 'Deep dive start without completion', value: deepDiveStartWithoutComplete },
    { label: 'Session start without round completion', value: sessionWithoutRound },
    { label: 'Reset used events', value: funnel.resetUsed },
    { label: 'Force update used events', value: funnel.forceUpdateUsed }
  ];
  return signals.sort((a, b) => b.value - a.value).slice(0, 5);
}

function formatDelta(current, previous) {
  if (current === null || previous === null) return '--';
  const delta = Math.round((current - previous) * 10) / 10;
  return delta > 0 ? `+${delta}` : String(delta);
}

function buildAlerts(current, previous, learningCurrent, learningPrevious) {
  const alerts = [];
  if (current.reliability.score < 80) {
    alerts.push(`Reliability alert: score ${current.reliability.score}/100 (threshold: 80).`);
  }
  if (learningCurrent.deepDiveCompletion !== null && learningPrevious.deepDiveCompletion !== null) {
    const dropPoints = (learningPrevious.deepDiveCompletion - learningCurrent.deepDiveCompletion) * 100;
    if (dropPoints > 15) {
      alerts.push(`Deep Dive completion dropped ${Math.round(dropPoints)} points week-over-week (>15).`);
    }
  }
  return alerts;
}

function main() {
  const inputPathArg = argValue('--input', process.env.TELEMETRY_REPORT_INPUT || 'data/telemetry-weekly.json');
  const outputPathArg = argValue('--output', process.env.TELEMETRY_REPORT_OUTPUT || 'reports/weekly-roi-report.md');
  const days = Math.max(1, toNumber(argValue('--days', process.env.TELEMETRY_REPORT_DAYS || '7'), 7));

  const inputPath = path.resolve(process.cwd(), inputPathArg);
  const outputPath = path.resolve(process.cwd(), outputPathArg);
  const now = Date.now();
  const windowMs = days * 24 * 60 * 60 * 1000;
  const currentStart = now - windowMs;
  const previousStart = currentStart - windowMs;

  let rows = [];
  let inputStatus = 'loaded';
  try {
    if (fs.existsSync(inputPath)) {
      const raw = JSON.parse(fs.readFileSync(inputPath, 'utf8'));
      rows = normalizeRows(raw);
    } else {
      inputStatus = 'missing';
    }
  } catch {
    inputStatus = 'invalid';
    rows = [];
  }

  const currentRows = rowsInWindow(rows, currentStart, now);
  const previousRows = rowsInWindow(rows, previousStart, currentStart);

  const current = {
    adoption: computeAdoptionScore(currentRows),
    learning: computeLearningScore(currentRows),
    reliability: computeReliabilityScore(currentRows),
    funnel: buildFunnel(currentRows)
  };
  const previous = {
    adoption: computeAdoptionScore(previousRows),
    learning: computeLearningScore(previousRows),
    reliability: computeReliabilityScore(previousRows),
    funnel: buildFunnel(previousRows)
  };

  const alerts = buildAlerts(current, previous, current.learning, previous.learning);
  const friction = buildFrictionSignals(currentRows, current.funnel);

  const lines = [
    '# Weekly ROI Report',
    '',
    `Generated: ${new Date(now).toLocaleString()}`,
    `Input: \`${inputPathArg}\` (${inputStatus})`,
    `Window: last ${days} days`,
    '',
    '## Scorecards',
    '',
    '| Dashboard | Current | Previous | Delta |',
    '|---|---:|---:|---:|',
    `| Adoption | ${current.adoption.score ?? '--'} | ${previous.adoption.score ?? '--'} | ${formatDelta(current.adoption.score, previous.adoption.score)} |`,
    `| Learning | ${current.learning.score ?? '--'} | ${previous.learning.score ?? '--'} | ${formatDelta(current.learning.score, previous.learning.score)} |`,
    `| Reliability | ${current.reliability.score} | ${previous.reliability.score} | ${formatDelta(current.reliability.score, previous.reliability.score)} |`,
    '',
    '## Funnel',
    '',
    '| Event | Current | Previous |',
    '|---|---:|---:|',
    `| Session start | ${current.funnel.sessionStart} | ${previous.funnel.sessionStart} |`,
    `| Quest select | ${current.funnel.questSelect} | ${previous.funnel.questSelect} |`,
    `| Deep dive started | ${current.funnel.deepDiveStarted} | ${previous.funnel.deepDiveStarted} |`,
    `| Deep dive completed | ${current.funnel.deepDiveCompleted} | ${previous.funnel.deepDiveCompleted} |`,
    `| Reset used | ${current.funnel.resetUsed} | ${previous.funnel.resetUsed} |`,
    `| Force update used | ${current.funnel.forceUpdateUsed} | ${previous.funnel.forceUpdateUsed} |`,
    '',
    '## Alerts',
    ''
  ];

  if (alerts.length) {
    alerts.forEach((alert) => lines.push(`- ${alert}`));
  } else {
    lines.push('- No threshold alerts this week.');
  }

  lines.push('', '## Top 5 Friction Signals', '');
  friction.forEach((entry) => {
    lines.push(`- ${entry.label}: ${entry.value}`);
  });

  if (!friction.length) {
    lines.push('- No friction signals available yet.');
  }

  lines.push('', '## Notes', '');
  if (!currentRows.length) {
    lines.push('- No telemetry rows found in the current window. Confirm telemetry input source is populated.');
  }
  if (inputStatus !== 'loaded') {
    lines.push(`- Telemetry input status: ${inputStatus}.`);
  }

  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.writeFileSync(outputPath, `${lines.join('\n')}\n`, 'utf8');

  console.log(`weekly roi report written: ${outputPath}`);
}

main();
