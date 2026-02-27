(function teacherDashboardV1() {
  "use strict";

  var STORAGE_KEY = 'cs_student_data';
  var complexFill = document.getElementById('td-complex');
  var reasoningFill = document.getElementById('td-reasoning');
  var verbsFill = document.getElementById('td-verbs');
  var cohesionFill = document.getElementById('td-cohesion');
  var groupsEl = document.getElementById('td-groups');
  var heatmapTable = document.getElementById('td-heatmap-table');
  var lessonEl = document.getElementById('td-lesson-suggestion');

  if (!complexFill || !reasoningFill || !verbsFill || !cohesionFill || !groupsEl || !heatmapTable || !lessonEl) return;

  function isDemoMode() {
    try {
      return new URLSearchParams(window.location.search || '').get('demo') === '1';
    } catch (_e) {
      return false;
    }
  }

  function loadData() {
    var parsed = [];
    try {
      var raw = localStorage.getItem(STORAGE_KEY);
      parsed = raw ? JSON.parse(raw) : [];
    } catch (_e) {
      parsed = [];
    }
    if (!Array.isArray(parsed) || !parsed.length) {
      if (isDemoMode()) return buildDemoData();
      return [];
    }
    return parsed;
  }

  function loadAnalytics() {
    if (window.CSAnalyticsEngine && typeof window.CSAnalyticsEngine.read === 'function') {
      return window.CSAnalyticsEngine.read();
    }
    try {
      var parsed = JSON.parse(localStorage.getItem('cs_analytics') || 'null');
      return parsed && typeof parsed === 'object' ? parsed : null;
    } catch (_e) {
      return null;
    }
  }

  function buildDemoData() {
    return [
      fakeStudent('Ava', 0.2, 1.7, 0.1, 1.2),
      fakeStudent('Leo', 0.35, 2.1, 0.2, 1.8),
      fakeStudent('Mia', 0.7, 3.1, 0.6, 3.3),
      fakeStudent('Noah', 0.42, 2.4, 0.33, 2.1),
      fakeStudent('Iris', 0.15, 1.5, 0.15, 1.0),
      fakeStudent('Zane', 0.62, 3.0, 0.5, 2.8),
      fakeStudent('Ella', 0.5, 2.6, 0.4, 2.4),
      fakeStudent('Omar', 0.28, 1.9, 0.2, 1.5)
    ];
  }

  function fakeStudent(name, reasoningRate, detailAvg, strongVerbRate, cohesionAvg) {
    var sentences = [];
    for (var i = 0; i < 6; i += 1) {
      var hasReasoning = Math.random() < reasoningRate;
      var strongVerb = Math.random() < strongVerbRate;
      var sentenceType = hasReasoning ? 'complex' : (Math.random() < 0.3 ? 'compound' : 'simple');
      sentences.push({
        sentence_type: sentenceType,
        has_reasoning: hasReasoning,
        verb_strength: strongVerb ? 'strong' : 'adequate',
        detail_score: clamp(detailAvg + (Math.random() - 0.5), 1, 5),
        cohesion: clamp(cohesionAvg + (Math.random() - 0.5), 0, 5)
      });
    }
    return { name: name, sentences: sentences };
  }

  function clamp(v, min, max) {
    return Math.max(min, Math.min(max, v));
  }

  function toPct(part, total) {
    if (!total) return 0;
    return Math.round((part / total) * 100);
  }

  function studentStats(student) {
    var rows = Array.isArray(student && student.sentences) ? student.sentences : [];
    var count = Math.max(1, rows.length);
    var complexCount = rows.filter(function (r) { return r.sentence_type === 'complex'; }).length;
    var reasoningCount = rows.filter(function (r) { return !!r.has_reasoning; }).length;
    var strongCount = rows.filter(function (r) { return String(r.verb_strength || '') === 'strong'; }).length;
    var detailAvg = rows.reduce(function (sum, r) { return sum + Number(r.detail_score || 0); }, 0) / count;
    var cohesionAvg = rows.reduce(function (sum, r) { return sum + Number(r.cohesion || 0); }, 0) / count;

    return {
      name: String(student.name || 'Student'),
      complexPct: toPct(complexCount, count),
      reasoningPct: toPct(reasoningCount, count),
      strongPct: toPct(strongCount, count),
      detailAvg: Number(detailAvg.toFixed(2)),
      cohesionAvg: Number(cohesionAvg.toFixed(2))
    };
  }

  function classSnapshot(stats) {
    var count = Math.max(1, stats.length);
    return {
      complexPct: Math.round(stats.reduce(function (sum, s) { return sum + s.complexPct; }, 0) / count),
      reasoningPct: Math.round(stats.reduce(function (sum, s) { return sum + s.reasoningPct; }, 0) / count),
      strongPct: Math.round(stats.reduce(function (sum, s) { return sum + s.strongPct; }, 0) / count),
      cohesionAvg: Number((stats.reduce(function (sum, s) { return sum + s.cohesionAvg; }, 0) / count).toFixed(2))
    };
  }

  function pickTier(s) {
    if (s.reasoningPct < 30 || s.detailAvg < 2) return 'Tier 3';
    if (s.strongPct < 50 && s.complexPct < 40) return 'Tier 2';
    return 'Tier 1';
  }

  function renderGroups(stats) {
    var tier3 = [];
    var tier2 = [];
    var tier1 = [];
    stats.forEach(function (s) {
      var tier = pickTier(s);
      if (tier === 'Tier 3') tier3.push(s.name);
      else if (tier === 'Tier 2') tier2.push(s.name);
      else tier1.push(s.name);
    });

    groupsEl.innerHTML = [
      '<div class="td-grouping-list">',
      groupHtml('Group A (Tier 3 – Structure Support)', tier3),
      groupHtml('Group B (Tier 2 – Reasoning + Verb Precision)', tier2),
      groupHtml('Group C (Tier 1 – Extension & Variety)', tier1),
      '</div>'
    ].join('');
  }

  function groupHtml(title, names) {
    return [
      '<div class="td-group">',
      '<div class="td-group-title">' + title + '</div>',
      '<div>' + (names.length ? names.join(', ') : 'No students currently') + '</div>',
      '</div>'
    ].join('');
  }

  function heatClass(value, high, low) {
    if (value >= high) return 'heat-high';
    if (value <= low) return 'heat-low';
    return 'heat-mid';
  }

  function tierClass(tier) {
    if (tier === 'Tier 1') return 'tier-1';
    if (tier === 'Tier 2') return 'tier-2';
    return 'tier-3';
  }

  function renderHeatmap(stats) {
    var html = [
      '<thead><tr><th>Student</th><th>Reasoning</th><th>Detail</th><th>Verb Strength</th><th>Cohesion</th><th>Tier</th></tr></thead>',
      '<tbody>'
    ];

    stats.forEach(function (s) {
      var tier = pickTier(s);
      html.push('<tr>');
      html.push('<td>' + s.name + '</td>');
      html.push('<td class="' + heatClass(s.reasoningPct, 60, 30) + '">' + s.reasoningPct + '%</td>');
      html.push('<td class="' + heatClass(s.detailAvg, 3, 2) + '">' + s.detailAvg.toFixed(1) + '</td>');
      html.push('<td class="' + heatClass(s.strongPct, 60, 30) + '">' + s.strongPct + '%</td>');
      html.push('<td class="' + heatClass(s.cohesionAvg, 3, 2) + '">' + s.cohesionAvg.toFixed(1) + '</td>');
      html.push('<td class="' + tierClass(tier) + '">' + tier + '</td>');
      html.push('</tr>');
    });

    html.push('</tbody>');
    heatmapTable.innerHTML = html.join('');
  }

  function renderLesson(snapshot) {
    if (snapshot.reasoningPct < 40) {
      lessonEl.textContent = 'Model subordinating conjunctions (because, although, since).';
      return;
    }
    if (snapshot.strongPct < 40) {
      lessonEl.textContent = 'Mini-lesson on strong, precise verbs.';
      return;
    }
    if (snapshot.cohesionAvg < 2) {
      lessonEl.textContent = 'Practice linking sentences with transitions.';
      return;
    }
    lessonEl.textContent = 'Challenge: multi-clause paragraph construction.';
  }

  function animateFill(el, pct) {
    if (!el) return;
    el.style.width = '0%';
    requestAnimationFrame(function () {
      el.style.width = String(clamp(pct, 0, 100)) + '%';
    });
  }

  function render() {
    var data = loadData();
    var analytics = loadAnalytics();
    if (!data.length) {
      if (analytics && Number(analytics.totalSentences || 0) > 0) {
        var reasoningPct = Math.round(Number(analytics.reasoningRate || 0) * 100);
        var detailPct = Math.round(Math.max(0, Math.min(100, Number(analytics.avgDetail || 0) * 20)));
        var cohesionPct = Math.round(Math.max(0, Math.min(100, Number(analytics.avgCohesion || 0) * 20)));
        animateFill(complexFill, detailPct);
        animateFill(reasoningFill, reasoningPct);
        animateFill(verbsFill, detailPct);
        animateFill(cohesionFill, cohesionPct);
        groupsEl.innerHTML = '<div class="td-group">Displaying anonymized analytics snapshot from <code>cs_analytics</code> (' + Number(analytics.totalSentences || 0) + ' sentences).</div>';
        heatmapTable.innerHTML = '';
        if (reasoningPct < 40) lessonEl.textContent = 'Model subordinating conjunctions (because, although, since).';
        else if (detailPct < 50) lessonEl.textContent = 'Mini-lesson on adding precise detail and evidence.';
        else lessonEl.textContent = 'Challenge: multi-clause paragraph construction.';
        return;
      }
      groupsEl.innerHTML = '<div class="td-group">No student structural data found. Add <code>cs_student_data</code> or let <code>cs_analytics</code> populate through student writing.</div>';
      heatmapTable.innerHTML = '';
      lessonEl.textContent = 'No recommendation yet.';
      animateFill(complexFill, 0);
      animateFill(reasoningFill, 0);
      animateFill(verbsFill, 0);
      animateFill(cohesionFill, 0);
      return;
    }

    var stats = data.map(studentStats);
    var snapshot = classSnapshot(stats);

    animateFill(complexFill, snapshot.complexPct);
    animateFill(reasoningFill, snapshot.reasoningPct);
    animateFill(verbsFill, snapshot.strongPct);
    animateFill(cohesionFill, Math.round(snapshot.cohesionAvg * 20));

    renderGroups(stats);
    renderHeatmap(stats);
    renderLesson(snapshot);
  }

  render();
})();
