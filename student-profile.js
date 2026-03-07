(function studentProfilePage() {
  "use strict";

  var Evidence = window.CSEvidence || null;
  var SupportStore = window.CSSupportStore || null;
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
    state.caseload = TeacherSelectors && typeof TeacherSelectors.loadCaseload === "function"
      ? TeacherSelectors.loadCaseload({ Evidence: Evidence })
      : [];
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

  function renderStudentList() {
    var rows = filteredCaseload();
    el.studentList.innerHTML = rows.length ? rows.map(function (student) {
      var summary = getSummary(student.id, student) || {};
      return [
        '<a class="sp-student-link' + (student.id === state.studentId ? ' is-active' : '') + '" href="student-profile.html?student=' + encodeURIComponent(student.id) + '">',
        '  <strong>' + esc(student.name || "Student") + '</strong>',
        '  <span>' + esc([student.gradeBand || student.grade || "", summary.focus || student.focus || "Support profile"].filter(Boolean).join(" · ")) + '</span>',
        '  <span>' + esc((summary.nextMove && summary.nextMove.line) || "Open profile") + '</span>',
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
    return [
      '<div>',
      '  <p class="sp-kicker">Student-specific support record</p>',
      '  <h1>' + esc(student.name || "Student") + '</h1>',
      '  <p class="sp-subline">' + esc([
        student.gradeBand || student.grade || "Grade not set",
        summary && summary.focus ? summary.focus : "Support focus forming",
        summary && summary.risk ? summary.risk : "steady"
      ].join(" · ")) + '</p>',
      '  <p class="sp-body-copy">' + esc((summary && summary.nextMove && summary.nextMove.line) || "Use the sections below to review support, evidence, behavior, communication, and next moves in one place.") + '</p>',
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
      '<div>',
      '  <div class="sp-meta-grid">',
      '    <div class="sp-meta-card"><span>Last session</span><strong>' + esc(summary && summary.lastSession ? relativeDate(summary.lastSession.timestamp) : "No sessions yet") + '</strong></div>',
      '    <div class="sp-meta-card"><span>Evidence points</span><strong>' + esc(String((SupportStore && typeof SupportStore.getRecentEvidencePoints === "function" ? SupportStore.getRecentEvidencePoints(student.id, 30, 40) : []).length || 0)) + '</strong></div>',
      '    <div class="sp-meta-card"><span>Top need</span><strong>' + esc(snapshot && snapshot.needs && snapshot.needs[0] ? (snapshot.needs[0].label || snapshot.needs[0].skillId || "Collect baseline") : "Collect baseline") + '</strong></div>',
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
    el.supportSnapshot.innerHTML = [
      '<div class="sp-list">',
      '<div class="sp-list-item"><strong>Current priority</strong><p>' + esc((summary && summary.nextMove && summary.nextMove.line) || "Priority still forming from available support data.") + '</p></div>',
      '<div class="sp-list-item"><strong>Top needs</strong><p>' + esc(needs.length ? needs.slice(0, 3).map(function (row) { return row.label || row.key || row.skillId || "Need"; }).join(" • ") : "No need profile captured yet.") + '</p></div>',
      '<div class="sp-list-item"><strong>Intervention history</strong><p>' + esc(interventions.length ? interventions.slice(0, 3).map(function (row) { return (row.domain || row.tier || "Support") + ": " + (row.strategy || row.focus || "Recorded"); }).join(" • ") : "No intervention history recorded yet.") + '</p></div>',
      '</div>'
    ].join("");
  }

  function renderGoals(support) {
    var goals = Array.isArray(support.goals) ? support.goals : [];
    var accs = Array.isArray(support.accommodations) ? support.accommodations : [];
    el.goalsPanel.innerHTML = [
      '<div class="sp-list">',
      '<div class="sp-list-item"><strong>Goals</strong><p>' + esc(goals.length ? goals.slice(0, 5).map(function (row) { return row.skill || row.domain || row.target || "Goal"; }).join(" • ") : "No goals recorded yet. Use ghost guidance only until real goals are saved.") + '</p></div>',
      '<div class="sp-list-item"><strong>Accommodations</strong><p>' + esc(accs.length ? accs.slice(0, 5).map(function (row) { return row.title || row.whenToUse || "Accommodation"; }).join(" • ") : "No accommodations logged yet.") + '</p></div>',
      '</div>'
    ].join("");
  }

  function renderEvidence(studentId, summary) {
    var evidenceRows = SupportStore && typeof SupportStore.getRecentEvidencePoints === "function"
      ? SupportStore.getRecentEvidencePoints(studentId, 30, 8)
      : [];
    var chips = summary && Array.isArray(summary.evidenceChips) ? summary.evidenceChips : [];
    el.evidencePanel.innerHTML = evidenceRows.length ? (
      '<div class="sp-timeline">' + evidenceRows.map(function (row) {
        return '<div class="sp-timeline-item"><strong>' + esc(row.module || "Support evidence") + '</strong><p>' + esc(relativeDate(row.createdAt) + " · " + ((row.chips || []).join(" • ") || "Evidence logged")) + '</p></div>';
      }).join("") + '</div>'
    ) : (
      '<div class="sp-list"><div class="sp-list-item"><strong>Recent evidence</strong><p>' + esc(chips.length ? chips.map(function (chip) { return chip.label + ": " + chip.value; }).join(" • ") : "No recent evidence points yet. As soon as support data is logged, the placeholder disappears.") + '</p></div></div>'
    );
  }

  function renderWeekly(weekly) {
    if (!weekly) {
      el.weeklyPanel.innerHTML = '<div class="sp-list-item"><strong>Weekly summary</strong><p>No weekly insight generated yet.</p></div>';
      return;
    }
    el.weeklyPanel.innerHTML = [
      '<div class="sp-list">',
      '<div class="sp-list-item"><strong>Strengths</strong><p>' + esc((weekly.strengths || []).join(" • ")) + '</p></div>',
      '<div class="sp-list-item"><strong>Growth focus</strong><p>' + esc((weekly.growthFocus || []).join(" • ")) + '</p></div>',
      '<div class="sp-list-item"><strong>Recent activities</strong><p>' + esc((weekly.recentActivities || []).join(" • ")) + '</p></div>',
      '</div>'
    ].join("");
  }

  function renderFBA(record) {
    el.fbaList.innerHTML = record.fbaIncidents && record.fbaIncidents.length ? record.fbaIncidents.slice(0, 6).map(function (row) {
      return '<div class="sp-record"><strong>' + esc(row.behavior || "Behavior incident") + '</strong><p>' + esc([row.when, row.setting, row.probableFunction].filter(Boolean).join(" • ")) + '</p><p>' + esc((row.teacherResponse || "No teacher response logged") + (row.notes ? " · " + row.notes : "")) + '</p></div>';
    }).join("") : '<div class="sp-google-empty">Ghost example only: log when, what preceded the behavior, what happened, and what adults or peers did. This disappears once real entries are saved.</div>';
  }

  function renderBIP(record) {
    var plan = record.bipPlan || {};
    el.bipView.innerHTML = plan.targetBehavior || plan.replacementBehavior || plan.reviewDate ? [
      '<div class="sp-list">',
      '<div class="sp-list-item"><strong>Target behavior</strong><p>' + esc(plan.targetBehavior || "Not set") + '</p></div>',
      '<div class="sp-list-item"><strong>Replacement behavior</strong><p>' + esc(plan.replacementBehavior || "Not set") + '</p></div>',
      '<div class="sp-list-item"><strong>Prevention + adult response</strong><p>' + esc([plan.preventionMoves, plan.adultResponse].filter(Boolean).join(" • ") || "Not set") + '</p></div>',
      '<div class="sp-list-item"><strong>Reinforcement + review</strong><p>' + esc([plan.reinforcementPlan, plan.reviewDate].filter(Boolean).join(" • ") || "Not set") + '</p></div>',
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
    renderSnapshot(student, support, summary, snapshot);
    renderGoals(support);
    renderEvidence(student.id, summary);
    renderWeekly(weekly);
    renderFBA(record);
    renderBIP(record);
    renderCheckins(record);
    renderGoogle(student);

    el.reportsLink.href = "./teacher-dashboard.html?student=" + encodeURIComponent(student.id);
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
          intensity: form.get("intensity"),
          antecedent: form.get("antecedent"),
          behavior: form.get("behavior"),
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
          replacementBehavior: form.get("replacementBehavior"),
          preventionMoves: form.get("preventionMoves"),
          adultResponse: form.get("adultResponse"),
          reinforcementPlan: form.get("reinforcementPlan"),
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
