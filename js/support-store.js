(function supportStoreModule(root, factory) {
  if (typeof module === "object" && module.exports) {
    module.exports = factory();
    return;
  }
  root.CSSupportStore = factory();
})(typeof self !== "undefined" ? self : this, function () {
  "use strict";

  var KEY = "CS_SUPPORT_STORE_V1";
  var VERSION = 1;

  function nowIso() {
    return new Date().toISOString();
  }

  function parse(raw) {
    if (!raw) return null;
    try { return JSON.parse(raw); } catch (_e) { return null; }
  }

  function emptyStore() {
    return { version: VERSION, students: {} };
  }

  function load() {
    var parsed = parse(localStorage.getItem(KEY));
    if (!parsed || typeof parsed !== "object") return emptyStore();
    if (!parsed.students || typeof parsed.students !== "object") parsed.students = {};
    return parsed;
  }

  function save(store) {
    localStorage.setItem(KEY, JSON.stringify(store));
    return store;
  }

  function normalizeId(studentId) {
    return String(studentId || "").trim() || "demo-student";
  }

  function ensureStudent(store, studentId, profile) {
    var sid = normalizeId(studentId);
    var row = store.students[sid];
    if (!row || typeof row !== "object") {
      row = {
        profile: {
          name: sid,
          grade: "",
          tags: [],
          createdAt: nowIso(),
          updatedAt: nowIso()
        },
        needs: [],
        goals: [],
        accommodations: [],
        interventions: [],
        meetings: [],
        artifacts: []
      };
      store.students[sid] = row;
    }
    row.profile = row.profile || {};
    if (profile && typeof profile === "object") {
      if (profile.name) row.profile.name = String(profile.name);
      if (profile.grade) row.profile.grade = String(profile.grade);
      if (Array.isArray(profile.tags)) row.profile.tags = profile.tags.slice(0, 20).map(String);
    }
    if (!Array.isArray(row.profile.tags)) row.profile.tags = [];
    if (!row.profile.createdAt) row.profile.createdAt = nowIso();
    row.profile.updatedAt = nowIso();
    ["needs", "goals", "accommodations", "interventions", "meetings", "artifacts"].forEach(function (key) {
      if (!Array.isArray(row[key])) row[key] = [];
    });
    return row;
  }

  function uid(prefix) {
    return String(prefix || "item") + "_" + Date.now().toString(36) + "_" + Math.random().toString(36).slice(2, 6);
  }

  function addItem(studentId, type, payload) {
    var store = load();
    var student = ensureStudent(store, studentId, payload && payload.profile);
    if (!Array.isArray(student[type])) return null;
    var item = Object.assign({}, payload || {});
    if (!item.id) item.id = uid(type);
    if (!item.createdAt) item.createdAt = nowIso();
    item.updatedAt = nowIso();
    student[type].unshift(item);
    save(store);
    return item;
  }

  function updateItem(studentId, type, id, patch) {
    var store = load();
    var student = ensureStudent(store, studentId);
    var list = student[type];
    if (!Array.isArray(list)) return null;
    for (var i = 0; i < list.length; i += 1) {
      if (String(list[i].id) !== String(id)) continue;
      list[i] = Object.assign({}, list[i], patch || {}, { updatedAt: nowIso() });
      save(store);
      return list[i];
    }
    return null;
  }

  function removeItem(studentId, type, id) {
    var store = load();
    var student = ensureStudent(store, studentId);
    var list = student[type];
    if (!Array.isArray(list)) return false;
    var next = list.filter(function (row) { return String(row.id) !== String(id); });
    if (next.length === list.length) return false;
    student[type] = next;
    save(store);
    return true;
  }

  function getStudent(studentId) {
    var store = load();
    var student = ensureStudent(store, studentId);
    return JSON.parse(JSON.stringify(student));
  }

  function setNeeds(studentId, needs) {
    var store = load();
    var student = ensureStudent(store, studentId);
    student.needs = Array.isArray(needs) ? needs.slice(0, 12).map(function (row) {
      return {
        key: String(row.key || row.skillId || ""),
        label: String(row.label || row.skillId || "Need"),
        domain: String(row.domain || ""),
        severity: Number(row.severity || 0)
      };
    }) : [];
    save(store);
    return student.needs;
  }

  function exportStudentSummary(studentId) {
    var sid = normalizeId(studentId);
    var student = getStudent(sid);
    var json = {
      studentId: sid,
      exportedAt: nowIso(),
      student: student
    };
    var html = [
      "<!doctype html><html><head><meta charset='utf-8'><title>Support Summary</title>",
      "<style>body{font:14px/1.45 -apple-system,Segoe UI,Arial;padding:24px;color:#122}h1,h2{margin:0 0 8px}section{margin:14px 0;padding:12px;border:1px solid #ccd;border-radius:8px}</style>",
      "</head><body>",
      "<h1>Student Support Summary</h1>",
      "<p><strong>" + escapeHtml(student.profile.name || sid) + "</strong> (" + escapeHtml(sid) + ")</p>",
      "<p>Exported: " + escapeHtml(nowIso()) + "</p>",
      "<section><h2>Needs</h2><ul>" + student.needs.map(function (n) { return "<li>" + escapeHtml(n.label || n.key || "Need") + "</li>"; }).join("") + "</ul></section>",
      "<section><h2>Goals</h2><ul>" + student.goals.map(function (g) { return "<li>" + escapeHtml(g.skill || g.domain || "Goal") + " - " + escapeHtml(g.target || "") + "</li>"; }).join("") + "</ul></section>",
      "<section><h2>Interventions</h2><ul>" + student.interventions.map(function (i) { return "<li>Tier " + escapeHtml(i.tier) + " - " + escapeHtml(i.focus || i.strategy || "") + "</li>"; }).join("") + "</ul></section>",
      "</body></html>"
    ].join("");
    return { json: json, html: html };
  }

  function exportReferralPacket(studentId) {
    var sid = normalizeId(studentId);
    var student = getStudent(sid);
    var interventions = student.interventions.slice(0, 20);
    var meetings = student.meetings.slice(0, 12);
    var html = [
      "<!doctype html><html><head><meta charset='utf-8'><title>Referral Packet</title>",
      "<style>body{font:14px/1.45 -apple-system,Segoe UI,Arial;padding:20px;color:#112}h1,h2{margin:0 0 8px}table{width:100%;border-collapse:collapse}th,td{border:1px solid #ccd;padding:6px;text-align:left}</style>",
      "</head><body>",
      "<h1>Referral-Ready Evidence Packet</h1>",
      "<p><strong>" + escapeHtml(student.profile.name || sid) + "</strong> (" + escapeHtml(sid) + ")</p>",
      "<h2>Interventions (Last 6-8 Weeks)</h2>",
      "<table><thead><tr><th>Tier</th><th>Domain</th><th>Strategy</th><th>Frequency</th><th>Duration</th></tr></thead><tbody>",
      interventions.map(function (i) {
        return "<tr><td>" + escapeHtml(i.tier || "") + "</td><td>" + escapeHtml(i.domain || "") + "</td><td>" + escapeHtml(i.strategy || i.focus || "") + "</td><td>" + escapeHtml(i.frequency || "") + "</td><td>" + escapeHtml(i.durationMin || "") + " min</td></tr>";
      }).join(""),
      "</tbody></table>",
      "<h2>Meetings + Decisions</h2>",
      "<ul>" + meetings.map(function (m) { return "<li>" + escapeHtml(m.type || "Meeting") + " (" + escapeHtml(m.date || "") + ") - " + escapeHtml(m.decisions || "") + "</li>"; }).join("") + "</ul>",
      "</body></html>"
    ].join("");
    return { html: html, json: { studentId: sid, exportedAt: nowIso(), student: student } };
  }

  function buildMeetingSummary(studentId, options) {
    var sid = normalizeId(studentId);
    var student = getStudent(sid);
    var opts = options && typeof options === "object" ? options : {};
    var strengths = String(opts.strengths || "Shows engagement in structured support routines.");
    var needs = (student.needs || []).slice(0, 4).map(function (n) { return n.label || n.key; }).join(", ") || "Collect baseline evidence";
    var nextSteps = String(opts.nextSteps || "Continue targeted intervention and review in 14 days.");
    var html = [
      "<!doctype html><html><head><meta charset='utf-8'><title>Meeting Summary</title>",
      "<style>body{font:14px/1.45 -apple-system,Segoe UI,Arial;padding:20px;color:#112}h1,h2{margin:0 0 8px}section{margin:12px 0;padding:10px;border:1px solid #ccd;border-radius:8px}</style>",
      "</head><body>",
      "<h1>Student Meeting Summary</h1>",
      "<p><strong>" + escapeHtml(student.profile.name || sid) + "</strong> (" + escapeHtml(sid) + ")</p>",
      "<section><h2>Strengths</h2><p>" + escapeHtml(strengths) + "</p></section>",
      "<section><h2>Needs</h2><p>" + escapeHtml(needs) + "</p></section>",
      "<section><h2>Interventions attempted</h2><p>" + escapeHtml((student.interventions || []).slice(0, 6).map(function (i) { return "Tier " + i.tier + " " + (i.strategy || i.focus || "support"); }).join(" • ")) + "</p></section>",
      "<section><h2>Next steps</h2><p>" + escapeHtml(nextSteps) + "</p></section>",
      "</body></html>"
    ].join("");
    return { html: html, text: "Student: " + (student.profile.name || sid) + "\nNeeds: " + needs + "\nNext steps: " + nextSteps };
  }

  function buildTier1EvidencePack(studentId, options) {
    var sid = normalizeId(studentId);
    var student = getStudent(sid);
    var opts = options && typeof options === "object" ? options : {};
    var domains = Array.isArray(opts.domains) ? opts.domains : ["Reading"];
    var duration = String(opts.duration || "6 weeks");
    var frequency = String(opts.frequency || "3x/week");
    var notes = String(opts.notes || "");
    var html = [
      "<!doctype html><html><head><meta charset='utf-8'><title>Tier 1 Evidence Pack</title>",
      "<style>body{font:14px/1.45 -apple-system,Segoe UI,Arial;padding:20px}h1,h2{margin:0 0 8px}table{width:100%;border-collapse:collapse}th,td{border:1px solid #ccd;padding:6px;text-align:left}</style>",
      "</head><body><h1>Tier 1 Evidence Pack</h1>",
      "<p><strong>" + escapeHtml(student.profile.name || sid) + "</strong> (" + escapeHtml(sid) + ")</p>",
      "<p>Concern areas: " + escapeHtml(domains.join(", ")) + " • Duration: " + escapeHtml(duration) + " • Frequency: " + escapeHtml(frequency) + "</p>",
      "<h2>Intervention log</h2><table><thead><tr><th>Date</th><th>Domain</th><th>Strategy</th><th>Minutes</th></tr></thead><tbody>",
      (student.interventions || []).slice(0, 14).map(function (i) {
        return "<tr><td>" + escapeHtml((i.startAt || "").slice(0, 10)) + "</td><td>" + escapeHtml(i.domain || "") + "</td><td>" + escapeHtml(i.strategy || i.focus || "") + "</td><td>" + escapeHtml(i.durationMin || "") + "</td></tr>";
      }).join(""),
      "</tbody></table>",
      "<h2>Notes</h2><p>" + escapeHtml(notes || "Teacher notes not provided.") + "</p>",
      "</body></html>"
    ].join("");
    var text = "Tier 1 Evidence Pack - " + (student.profile.name || sid) + "\nAreas: " + domains.join(", ") + "\nDuration: " + duration + " | Frequency: " + frequency + "\nNotes: " + notes;
    return { html: html, text: text };
  }

  function escapeHtml(value) {
    return String(value == null ? "" : value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/\"/g, "&quot;");
  }

  return {
    KEY: KEY,
    load: load,
    save: save,
    getStudent: getStudent,
    setNeeds: setNeeds,
    addGoal: function (studentId, payload) { return addItem(studentId, "goals", payload); },
    updateGoal: function (studentId, id, patch) { return updateItem(studentId, "goals", id, patch); },
    removeGoal: function (studentId, id) { return removeItem(studentId, "goals", id); },
    addAccommodation: function (studentId, payload) { return addItem(studentId, "accommodations", payload); },
    addIntervention: function (studentId, payload) { return addItem(studentId, "interventions", payload); },
    addMeeting: function (studentId, payload) { return addItem(studentId, "meetings", payload); },
    addArtifact: function (studentId, payload) { return addItem(studentId, "artifacts", payload); },
    exportStudentSummary: exportStudentSummary,
    exportReferralPacket: exportReferralPacket,
    buildMeetingSummary: buildMeetingSummary,
    buildTier1EvidencePack: buildTier1EvidencePack
  };
});
