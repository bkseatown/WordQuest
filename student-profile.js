(function studentProfilePage() {
  "use strict";

  var Evidence = window.CSEvidence || null;
  var SupportStore = window.CSSupportStore || null;
  var CaseloadStore = window.CSCaseloadStore || null;
  var TeacherSelectors = window.CSTeacherSelectors || null;
  var TeacherIntelligence = window.CSTeacherIntelligence || null;
  var WeeklyInsightGenerator = window.CSWeeklyInsightGenerator || null;
  var GoogleWorkspace = window.CSGoogleWorkspace || null;
  var GoogleAuth = window.CSGoogleAuth || null;
  var StudentProfileStore = window.CSStudentProfileStore || null;

  if (GoogleAuth && typeof GoogleAuth.init === "function") {
    try { GoogleAuth.init(); } catch (_err) {}
  }

  var state = {
    studentId: "",
    query: "",
    caseload: []
  };

  var ghostExamples = [
    "Try: Maya R.",
    "Try: Tier 2 writing",
    "Try: fraction support",
    "Try: BIP review"
  ];
  var ghostIndex = 0;
  var ghostTimer = null;

  var el = {
    search: document.getElementById("sp-search-input"),
    searchGhost: document.getElementById("sp-search-ghost"),
    studentList: document.getElementById("sp-student-list"),
    empty: document.getElementById("sp-empty-state"),
    content: document.getElementById("sp-content"),
    hero: document.getElementById("sp-hero"),
    supportSnapshot: document.getElementById("sp-support-snapshot"),
    goalsPanel: document.getElementById("sp-goals-panel"),
    evidencePanel: document.getElementById("sp-evidence-panel"),
    weeklyPanel: document.getElementById("sp-weekly-panel"),
    fbaForm: document.getElementById("sp-fba-form"),
    fbaList: document.getElementById("sp-fba-list"),
    bipForm: document.getElementById("sp-bip-form"),
    bipView: document.getElementById("sp-bip-view"),
    checkinForm: document.getElementById("sp-checkin-form"),
    checkinList: document.getElementById("sp-checkin-list"),
    googlePanel: document.getElementById("sp-google-panel"),
    reportsLink: document.getElementById("sp-reports-link"),
    gamesLink: document.getElementById("sp-games-link")
  };

  function esc(value) {
    return String(value == null ? "" : value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function text(value) {
    return String(value == null ? "" : value).trim();
  }

  function params() {
    try {
      return new URLSearchParams(window.location.search || "");
    } catch (_err) {
      return new URLSearchParams();
    }
  }

  function readStudentId() {
    var p = params();
    return text(p.get("student") || p.get("sid"));
  }

  function setStudentId(studentId, push) {
    state.studentId = text(studentId);
    if (!state.studentId) return;
    if (push !== false) {
      var url = new URL(window.location.href);
      url.searchParams.set("student", state.studentId);
      window.history.replaceState({}, "", url.toString());
    }
    render();
  }

  function relativeDate(value) {
    var ts = typeof value === "number" ? value : Date.parse(String(value || ""));
    if (!Number.isFinite(ts)) return "No recent entry";
    var diffHours = Math.round((Date.now() - ts) / 3600000);
    if (diffHours < 24) return diffHours <= 1 ? "Within the last hour" : diffHours + " hours ago";
    var diffDays = Math.round(diffHours / 24);
    return diffDays + " day" + (diffDays === 1 ? "" : "s") + " ago";
  }

  function loadCaseload() {
    var rows = TeacherSelectors && typeof TeacherSelectors.loadCaseload === "function"
      ? TeacherSelectors.loadCaseload({ CaseloadStore: CaseloadStore, Evidence: Evidence })
      : [];
    if ((!rows || !rows.length) && CaseloadStore && typeof CaseloadStore.loadCaseload === "function") {
      var seeded = CaseloadStore.loadCaseload();
      rows = seeded && Array.isArray(seeded.students) ? seeded.students.map(function (student) {
        var src = student && typeof student === "object" ? student : {};
        return {
          id: String(src.id || ""),
          name: String(src.name || src.id || "Student"),
          grade: String(src.grade || src.gradeBand || ""),
          gradeBand: String(src.gradeBand || src.grade || ""),
          tier: String(src.tier || ""),
          risk: "steady",
          focus: String(src.focus || src.focusSkill || ""),
          tags: Array.isArray(src.tags) ? src.tags.slice() : []
        };
      }) : [];
    }
    state.caseload = Array.isArray(rows) ? rows : [];
  }

  function ensureDemoCaseload() {
    if (!CaseloadStore || typeof CaseloadStore.seedDemoCaseload !== "function") return;
    if (state.caseload.length) return;
    CaseloadStore.seedDemoCaseload();
    loadCaseload();
  }

  function filteredCaseload() {
    var q = state.query.toLowerCase();
    if (!q) return state.caseload.slice();
    return state.caseload.filter(function (student) {
      return [
        student.name,
        student.grade,
        student.gradeBand,
        student.focus,
        student.tier
      ].join(" ").toLowerCase().indexOf(q) >= 0;
    });
  }

  function getStudent(studentId) {
    return filteredCaseload().find(function (row) { return row.id === studentId; })
      || state.caseload.find(function (row) { return row.id === studentId; })
      || null;
  }

  function getSupport(studentId) {
    return SupportStore && typeof SupportStore.getStudent === "function"
      ? (SupportStore.getStudent(studentId) || {})
      : {};
  }

  function getSummary(studentId, student) {
    return TeacherIntelligence && typeof TeacherIntelligence.getStudentSummary === "function"
      ? TeacherIntelligence.getStudentSummary(studentId, student, { Evidence: Evidence, TeacherSelectors: TeacherSelectors })
      : (Evidence && typeof Evidence.getStudentSummary === "function" ? Evidence.getStudentSummary(studentId) : null);
  }

  function getSnapshot(studentId) {
    return TeacherIntelligence && typeof TeacherIntelligence.getStudentSnapshot === "function"
      ? TeacherIntelligence.getStudentSnapshot(studentId, { Evidence: Evidence, TeacherSelectors: TeacherSelectors })
      : (TeacherSelectors && typeof TeacherSelectors.getStudentEvidence === "function" ? TeacherSelectors.getStudentEvidence(studentId, { Evidence: Evidence }) : null);
  }

  function getWeekly(studentId, student, support, summary, snapshot) {
    if (!WeeklyInsightGenerator || typeof WeeklyInsightGenerator.generateWeeklyInsights !== "function") return null;
    return WeeklyInsightGenerator.generateWeeklyInsights({
      studentProfile: student,
      supportProfile: support,
      summary: summary,
      model: snapshot
    });
  }

  function getProfileRecord(studentId) {
    return StudentProfileStore && typeof StudentProfileStore.getStudentRecord === "function"
      ? StudentProfileStore.getStudentRecord(studentId)
      : { fbaIncidents: [], bipPlan: {}, stakeholderCheckins: [] };
  }

  function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
  }

  function toneForRisk(risk) {
    var value = String(risk || "").toLowerCase();
    if (value.indexOf("high") >= 0 || value.indexOf("risk") >= 0) return "alert";
    if (value.indexOf("watch") >= 0 || value.indexOf("mod") >= 0) return "watch";
    return "steady";
  }

  function getRecentEvidence(studentId, limit) {
    return SupportStore && typeof SupportStore.getRecentEvidencePoints === "function"
      ? SupportStore.getRecentEvidencePoints(studentId, 30, limit || 8)
      : [];
  }

  function estimateGoalProgress(goal, index) {
    var row = goal && typeof goal === "object" ? goal : {};
    var explicit = Number(row.progress || row.mastery || row.percent || row.completion);
    if (Number.isFinite(explicit) && explicit > 0) return clamp(Math.round(explicit), 8, 100);
    return [36, 58, 74, 49][index % 4];
  }

  function buildMeter(label, value, tone, detail) {
    var pct = clamp(Math.round(Number(value) || 0), 0, 100);
    return [
      '<div class="sp-meter sp-meter--' + esc(tone || "steady") + '">',
      '  <div class="sp-meter-top"><span>' + esc(label) + '</span><strong>' + esc(String(pct)) + '%</strong></div>',
      '  <div class="sp-meter-track"><span style="width:' + esc(String(pct)) + '%"></span></div>',
      detail ? '  <p>' + esc(detail) + '</p>' : "",
      '</div>'
    ].join("");
  }

  function buildSignalPills(items, fallback) {
    var rows = (Array.isArray(items) ? items : []).filter(Boolean);
    if (!rows.length) rows = [fallback];
    return '<div class="sp-pill-row">' + rows.map(function (item) {
      return '<span class="sp-pill">' + esc(item) + '</span>';
    }).join("") + '</div>';
  }

  function buildInterventionLane(interventions) {
    var rows = Array.isArray(interventions) ? interventions.slice(0, 3) : [];
    if (!rows.length) {
      return '<div class="sp-lane-empty">No intervention cycle recorded yet. Start with one short move and track the response here.</div>';
    }
    return '<div class="sp-lane">' + rows.map(function (row, index) {
      var label = row.domain || row.tier || "Support cycle";
      var focus = row.strategy || row.focus || "Targeted move recorded";
      var metric = row.progressMetric || row.metric || row.schedule || "Monitoring cue not set yet";
      return [
        '<article class="sp-lane-card">',
        '  <div class="sp-lane-step">0' + esc(String(index + 1)) + '</div>',
        '  <div class="sp-lane-copy">',
        '    <strong>' + esc(label) + '</strong>',
        '    <p>' + esc(focus) + '</p>',
        '    <span>' + esc(metric) + '</span>',
        '  </div>',
        '</article>'
      ].join("");
    }).join("") + '</div>';
  }

  function buildEvidenceMoments(evidenceRows, chips) {
    var rows = Array.isArray(evidenceRows) ? evidenceRows.slice(0, 3) : [];
    if (rows.length) {
      return '<div class="sp-moment-list">' + rows.map(function (row) {
        return [
          '<article class="sp-moment">',
          '  <strong>' + esc(row.module || row.type || "Support signal") + '</strong>',
          '  <p>' + esc(relativeDate(row.createdAt)) + '</p>',
          '</article>'
        ].join("");
      }).join("") + '</div>';
    }
    return buildSignalPills((chips || []).map(function (chip) {
      return chip.label + ": " + chip.value;
    }), "First progress signal still needed");
  }

  function renderStudentList() {
    var rows = filteredCaseload();
    el.studentList.innerHTML = rows.length ? rows.map(function (student) {
      var summary = getSummary(student.id, student) || {};
      return [
        '<a class="sp-student-link' + (student.id === state.studentId ? ' is-active' : '') + '" href="student-profile.html?student=' + encodeURIComponent(student.id) + '">',
        '  <strong>' + esc(student.name || "Student") + '</strong>',
        '  <span>' + esc([student.gradeBand || student.grade || "", summary.focus || student.focus || "Support profile"].filter(Boolean).join(" · ")) + '</span>',
        '  <span>' + esc(summary && summary.risk ? ("Status: " + summary.risk) : "Open profile") + '</span>',
        '</a>'
      ].join("");
    }).join("") : '<p class="sp-muted">No students match this search yet.</p>';
  }

  function buildHero(student, support, summary, snapshot, record) {
    var goals = Array.isArray(support.goals) ? support.goals : [];
    var accommodations = Array.isArray(support.accommodations) ? support.accommodations : [];
    var reminders = StudentProfileStore && typeof StudentProfileStore.listReminders === "function"
      ? StudentProfileStore.listReminders(student.id)
      : [];
    var evidenceCount = (SupportStore && typeof SupportStore.getRecentEvidencePoints === "function"
      ? SupportStore.getRecentEvidencePoints(student.id, 30, 40)
      : []).length || 0;
    return [
      '<div class="sp-hero-main">',
      '  <p class="sp-kicker">Dedicated support record</p>',
      '  <h1>' + esc(student.name || "Student") + '</h1>',
      '  <p class="sp-subline">' + esc([
        student.gradeBand || student.grade || "Grade not set",
        summary && summary.focus ? summary.focus : "Support focus forming",
        summary && summary.risk ? summary.risk : "steady"
      ].join(" · ")) + '</p>',
      '  <p class="sp-body-copy">' + esc((summary && summary.nextMove && summary.nextMove.line) || "Review support, evidence, behavior planning, communication, and next steps for this student in one place.") + '</p>',
      '  <div class="sp-chip-row">' +
      [
        goals[0] && ("Goal: " + (goals[0].skill || goals[0].domain || "Goal")),
        accommodations[0] && ("Accommodation: " + (accommodations[0].title || "Support")),
        record.bipPlan && record.bipPlan.reviewDate && ("BIP review " + record.bipPlan.reviewDate)
      ].filter(Boolean).map(function (item) {
        return '<span class="sp-chip">' + esc(item) + '</span>';
      }).join("") +
      '</div>',
      '</div>',
      '<div class="sp-hero-side">',
      '  <div class="sp-meta-grid">',
      '    <div class="sp-meta-card"><span>Last session</span><strong>' + esc(summary && summary.lastSession ? relativeDate(summary.lastSession.timestamp) : "No sessions yet") + '</strong></div>',
      '    <div class="sp-meta-card"><span>Evidence points</span><strong>' + esc(String(evidenceCount)) + '</strong></div>',
      '    <div class="sp-meta-card"><span>Top need</span><strong>' + esc(snapshot && snapshot.needs && snapshot.needs[0] ? (snapshot.needs[0].label || snapshot.needs[0].skillId || "Collect current literacy baseline") : "Collect current literacy baseline") + '</strong></div>',
      '  </div>',
      '  <div class="sp-evidence-story">',
      '    <p class="sp-kicker">Momentum</p>',
      '    <div id="sp-hero-evidence-visual"></div>',
      '  </div>',
      '  <div class="sp-reminder-list">' + (reminders.length ? reminders.map(function (row) {
        return '<span class="sp-reminder" data-tone="' + esc(row.tone || "info") + '">' + esc(row.label) + '</span>';
      }).join("") : '<span class="sp-reminder" data-tone="info">No profile reminders waiting.</span>') + '</div>',
      '</div>'
    ].join("");
  }

  function renderSnapshot(student, support, summary, snapshot) {
    var needs = snapshot && Array.isArray(snapshot.needs) ? snapshot.needs : [];
    var interventions = Array.isArray(support.interventions) ? support.interventions : [];
    var evidenceCount = getRecentEvidence(student.id, 24).length;
    var readiness = clamp(28 + (interventions.length * 16) + Math.min(evidenceCount, 6) * 6, 18, 96);
    var continuity = clamp(22 + (interventions.length * 20), 16, 92);
    var freshness = clamp(evidenceCount * 11, 10, 94);
    el.supportSnapshot.innerHTML = [
      '<p class="sp-kicker">Support Snapshot</p>',
      '<h3 class="sp-card-title">Intervention posture</h3>',
      '<p class="sp-panel-intro">' + esc((summary && summary.nextMove && summary.nextMove.line) || "Priority still forming from available support data.") + '</p>',
      '<div class="sp-meter-grid">',
      buildMeter("Readiness", readiness, toneForRisk(summary && summary.risk), "How ready this profile is for a confident next move."),
      buildMeter("Fresh signal", freshness, "steady", evidenceCount ? "Recent evidence is visible across the last 30 days." : "Collect one quick check to strengthen the picture."),
      buildMeter("Continuity", continuity, "watch", interventions.length ? "Interventions are starting to form a usable story." : "No consistent intervention rhythm recorded yet."),
      '</div>',
      '<div class="sp-card-band">',
      '  <strong>Shared needs</strong>',
      buildSignalPills(needs.slice(0, 4).map(function (row) { return row.label || row.key || row.skillId || "Need"; }), "Need profile still taking shape"),
      '</div>',
      '<div class="sp-card-band">',
      '  <strong>Intervention lane</strong>',
      buildInterventionLane(interventions),
      '</div>'
    ].join("");
  }

  function renderGoals(support) {
    var goals = Array.isArray(support.goals) ? support.goals : [];
    var accs = Array.isArray(support.accommodations) ? support.accommodations : [];
    var goalRows = goals.slice(0, 3).map(function (row, index) {
      var label = row.skill || row.domain || row.target || "Goal in progress";
      var progress = estimateGoalProgress(row, index);
      return [
        '<article class="sp-goal-track">',
        '  <div class="sp-goal-track-top"><strong>' + esc(label) + '</strong><span>' + esc(String(progress)) + '%</span></div>',
        '  <div class="sp-goal-track-bar"><span style="width:' + esc(String(progress)) + '%"></span></div>',
        '  <p>' + esc(row.metric || row.measure || row.target || "Goal language still needs a sharper success measure.") + '</p>',
        '</article>'
      ].join("");
    });
    el.goalsPanel.innerHTML = [
      '<p class="sp-kicker">Goals & Accommodations</p>',
      '<h3 class="sp-card-title">Progress map</h3>',
      '<p class="sp-panel-intro">See where support is already moving and where scaffolds still need to be anchored.</p>',
      (goalRows.length ? '<div class="sp-goal-track-list">' + goalRows.join("") + '</div>' : '<div class="sp-lane-empty">No goals recorded yet. Add one target and this area will start showing momentum.</div>'),
      '<div class="sp-card-band">',
      '  <strong>Supports on deck</strong>',
      buildSignalPills(accs.slice(0, 6).map(function (row) { return row.title || row.whenToUse || "Accommodation"; }), "No accommodations logged yet"),
      '</div>'
    ].join("");
  }

  function renderEvidence(studentId, summary) {
    var evidenceRows = getRecentEvidence(studentId, 8);
    var chips = summary && Array.isArray(summary.evidenceChips) ? summary.evidenceChips : [];
    var series = evidenceRows.length ? evidenceRows.map(function (row, index) {
      return 30 + Math.round((((index + 1) / evidenceRows.length) * 48));
    }) : [22, 28, 18, 34, 26, 40, 22, 30];
    var cadence = evidenceRows.length >= 6 ? "Healthy cadence" : (evidenceRows.length >= 3 ? "Building cadence" : "Thin cadence");
    el.evidencePanel.innerHTML = [
      '<p class="sp-kicker">Evidence Pulse</p>',
      '<h3 class="sp-card-title">Progress monitoring</h3>',
      '<p class="sp-panel-intro">Quick read on data flow, recency, and what the team can trust today.</p>',
      '<div class="sp-evidence-story">',
      '  <div class="sp-signal-bar">' + series.map(function (value) {
        return '<span style="height:' + value + 'px"></span>';
      }).join("") + '</div>',
      '  <div class="sp-signal-caption"><span>' + esc(cadence) + '</span><span>' + esc(evidenceRows.length ? (evidenceRows.length + " points") : "0 points") + '</span></div>',
      '</div>',
      '<div class="sp-card-band">',
      '  <strong>Recent signal moments</strong>',
      buildEvidenceMoments(evidenceRows, chips),
      '</div>'
    ].join("");
  }

  function renderWeekly(weekly) {
    if (!weekly) {
      el.weeklyPanel.innerHTML = '<div class="sp-weekly-card"><strong>Weekly summary</strong><p>No weekly insight generated yet.</p></div>';
      return;
    }
    var strengths = (weekly.strengths || []).slice(0, 2);
    var growth = (weekly.growthFocus || []).slice(0, 2);
    var activities = (weekly.recentActivities || []).slice(0, 3);
    el.weeklyPanel.innerHTML = [
      '<div class="sp-weekly-feature">',
      '  <span class="sp-weekly-eyebrow">This week</span>',
      '  <strong>' + esc(growth[0] || strengths[0] || "Weekly story is forming.") + '</strong>',
      '  <p>' + esc(strengths[0] ? ("Keep leaning on " + strengths[0].toLowerCase() + " while tightening the next support move.") : "Run one more support cycle to strengthen the weekly readout.") + '</p>',
      '</div>',
      '<div class="sp-list">',
      '<div class="sp-weekly-card"><strong>Strengths</strong><p>' + esc(strengths.join(" • ") || "No strength pattern surfaced yet.") + '</p></div>',
      '<div class="sp-weekly-card"><strong>Growth focus</strong><p>' + esc(growth.join(" • ") || "No growth focus surfaced yet.") + '</p></div>',
      '<div class="sp-weekly-card"><strong>Recent activities</strong><p>' + esc(activities.join(" • ") || "No recent activities recorded yet.") + '</p></div>',
      '</div>'
    ].join("");
  }

  function renderFBA(record) {
    el.fbaList.innerHTML = record.fbaIncidents && record.fbaIncidents.length ? record.fbaIncidents.slice(0, 6).map(function (row) {
      return '<div class="sp-record"><strong>' + esc(row.behavior || "Behavior incident") + '</strong><p>' + esc([row.when, row.setting, row.frequency, row.duration, row.probableFunction].filter(Boolean).join(" • ")) + '</p><p>' + esc([row.antecedent, row.consequence].filter(Boolean).join(" → ") || "ABC data not complete yet.") + '</p><p>' + esc((row.teacherResponse || "No teacher response logged") + (row.notes ? " · " + row.notes : "")) + '</p></div>';
    }).join("") : '<div class="sp-google-empty">Ghost example only: log when, what preceded the behavior, what happened, and what adults or peers did. This disappears once real entries are saved.</div>';
  }

  function renderBIP(record) {
    var plan = record.bipPlan || {};
    el.bipView.innerHTML = plan.targetBehavior || plan.replacementBehavior || plan.reviewDate ? [
      '<div class="sp-list">',
      '<div class="sp-list-item"><strong>Target behavior</strong><p>' + esc(plan.targetBehavior || "Not set") + '</p></div>',
      '<div class="sp-list-item"><strong>Function + replacement behavior</strong><p>' + esc([plan.hypothesizedFunction, plan.replacementBehavior].filter(Boolean).join(" • ") || "Not set") + '</p></div>',
      '<div class="sp-list-item"><strong>Prevent + teach</strong><p>' + esc([plan.preventionSupports, plan.teachingMoves].filter(Boolean).join(" • ") || "Not set") + '</p></div>',
      '<div class="sp-list-item"><strong>Respond + reinforce</strong><p>' + esc([plan.responsePlan, plan.reinforcementPlan].filter(Boolean).join(" • ") || "Not set") + '</p></div>',
      '<div class="sp-list-item"><strong>Progress monitoring</strong><p>' + esc(plan.progressMonitoring || "Not set") + '</p></div>',
      '<div class="sp-list-item"><strong>Review date</strong><p>' + esc(plan.reviewDate || "Not set") + '</p></div>',
      '</div>'
    ].join("") : '<div class="sp-google-empty">Set a replacement behavior, adult response, and review date here so the plan can drive reminders and reports later.</div>';
  }

  function renderCheckins(record) {
    el.checkinList.innerHTML = record.stakeholderCheckins && record.stakeholderCheckins.length ? record.stakeholderCheckins.slice(0, 6).map(function (row) {
      return '<div class="sp-record"><strong>' + esc(row.role || "Check-in") + '</strong><p>' + esc(row.summary || "No summary") + '</p><p>' + esc(row.nextStep || "No next step") + '</p></div>';
    }).join("") : '<div class="sp-google-empty">Start with one teacher, family, or student reflection. The example guidance goes away on first save.</div>';
  }

  function renderGoogle(student) {
    var configured = GoogleWorkspace && typeof GoogleWorkspace.isConfigured === "function" && GoogleWorkspace.isConfigured();
    if (!configured) {
      el.googlePanel.innerHTML = '<div class="sp-google-empty"><strong>Google remains optional.</strong><p class="sp-muted">Once configured, this student page can create Docs, Sheets, or Slides tied to this profile. Until then, local-first tracking stays active.</p></div>';
      return;
    }
    var signedIn = GoogleWorkspace.isSignedIn && GoogleWorkspace.isSignedIn();
    var studentName = student && student.name ? student.name : "Student";
    el.googlePanel.innerHTML = [
      '<div class="sp-list">',
      '<div class="sp-list-item"><strong>Google status</strong><p>' + esc(signedIn ? "Connected" : "Configured but not connected") + '</p></div>',
      '<div class="sp-list-item"><strong>Suggested actions</strong><p>Create a meeting doc, progress sheet, or family update deck for ' + esc(studentName) + ' from here.</p></div>',
      '</div>'
    ].join("");
  }

  function renderHeroEvidence(studentId) {
    var target = document.getElementById("sp-hero-evidence-visual");
    if (!target) return;
    var evidenceRows = SupportStore && typeof SupportStore.getRecentEvidencePoints === "function"
      ? SupportStore.getRecentEvidencePoints(studentId, 30, 8)
      : [];
    var bars = evidenceRows.length ? evidenceRows.map(function (_row, index) {
      return 24 + (index * 8);
    }) : [18, 26, 20, 34, 28, 42, 36, 46];
    target.innerHTML = [
      '<div class="sp-signal-bar">' + bars.map(function (value) {
        return '<span style="height:' + value + 'px"></span>';
      }).join("") + '</div>',
      '<div class="sp-signal-caption"><span>' + esc(evidenceRows.length ? "More signal than noise" : "Collect first signal") + '</span><span>' + esc(evidenceRows.length ? "last 30 days" : "start with one check") + '</span></div>'
    ].join("");
  }

  function render() {
    renderStudentList();
    var student = state.studentId ? getStudent(state.studentId) : null;
    if (!student) {
      el.empty.classList.remove("hidden");
      el.content.classList.add("hidden");
      return;
    }
    var support = getSupport(student.id);
    var summary = getSummary(student.id, student);
    var snapshot = getSnapshot(student.id) || {};
    var weekly = getWeekly(student.id, student, support, summary, snapshot);
    var record = getProfileRecord(student.id);

    el.empty.classList.add("hidden");
    el.content.classList.remove("hidden");
    el.hero.innerHTML = buildHero(student, support, summary, snapshot, record);
    renderHeroEvidence(student.id);
    renderSnapshot(student, support, summary, snapshot);
    renderGoals(support);
    renderEvidence(student.id, summary);
    renderWeekly(weekly);
    renderFBA(record);
    renderBIP(record);
    renderCheckins(record);
    renderGoogle(student);

    el.reportsLink.href = "./reports.html?student=" + encodeURIComponent(student.id);
    el.gamesLink.href = "./game-platform.html?student=" + encodeURIComponent(student.id);
  }

  function rotateGhost() {
    if (!el.searchGhost) return;
    if (state.query) {
      el.searchGhost.textContent = "";
      return;
    }
    ghostIndex = (ghostIndex + 1) % ghostExamples.length;
    el.searchGhost.textContent = ghostExamples[ghostIndex];
  }

  function bindForms() {
    if (el.fbaForm) {
      el.fbaForm.addEventListener("submit", function (event) {
        event.preventDefault();
        if (!state.studentId || !StudentProfileStore || typeof StudentProfileStore.addFBAIncident !== "function") return;
        var form = new FormData(el.fbaForm);
        StudentProfileStore.addFBAIncident(state.studentId, {
          when: form.get("when"),
          setting: form.get("setting"),
          frequency: form.get("frequency"),
          duration: form.get("duration"),
          intensity: form.get("intensity"),
          dataSource: form.get("dataSource"),
          antecedent: form.get("antecedent"),
          behavior: form.get("behavior"),
          consequence: form.get("consequence"),
          teacherResponse: form.get("teacherResponse"),
          peerResponse: form.get("peerResponse"),
          probableFunction: form.get("probableFunction"),
          notes: form.get("notes")
        });
        el.fbaForm.reset();
        render();
      });
    }
    if (el.bipForm) {
      el.bipForm.addEventListener("submit", function (event) {
        event.preventDefault();
        if (!state.studentId || !StudentProfileStore || typeof StudentProfileStore.saveBIPPlan !== "function") return;
        var form = new FormData(el.bipForm);
        StudentProfileStore.saveBIPPlan(state.studentId, {
          targetBehavior: form.get("targetBehavior"),
          hypothesizedFunction: form.get("hypothesizedFunction"),
          replacementBehavior: form.get("replacementBehavior"),
          preventionSupports: form.get("preventionSupports"),
          teachingMoves: form.get("teachingMoves"),
          responsePlan: form.get("responsePlan"),
          reinforcementPlan: form.get("reinforcementPlan"),
          progressMonitoring: form.get("progressMonitoring"),
          reviewDate: form.get("reviewDate")
        });
        render();
      });
    }
    if (el.checkinForm) {
      el.checkinForm.addEventListener("submit", function (event) {
        event.preventDefault();
        if (!state.studentId || !StudentProfileStore || typeof StudentProfileStore.addStakeholderCheckin !== "function") return;
        var form = new FormData(el.checkinForm);
        StudentProfileStore.addStakeholderCheckin(state.studentId, {
          role: form.get("role"),
          summary: form.get("summary"),
          nextStep: form.get("nextStep")
        });
        el.checkinForm.reset();
        render();
      });
    }
  }

  function bindSearch() {
    if (!el.search) return;
    el.search.addEventListener("input", function () {
      state.query = text(el.search.value);
      if (state.query && ghostTimer) {
        clearInterval(ghostTimer);
        ghostTimer = null;
      }
      renderStudentList();
    });
  }

  function init() {
    loadCaseload();
    ensureDemoCaseload();
    bindSearch();
    bindForms();
    state.studentId = readStudentId() || (state.caseload[0] && state.caseload[0].id) || "";
    render();
    if (el.searchGhost) {
      ghostTimer = window.setInterval(rotateGhost, 3600);
    }
  }

  init();
})();
