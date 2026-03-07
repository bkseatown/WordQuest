(function studentProfileStoreModule(root, factory) {
  if (typeof module === "object" && module.exports) {
    module.exports = factory();
    return;
  }
  root.CSStudentProfileStore = factory();
})(typeof globalThis !== "undefined" ? globalThis : window, function createStudentProfileStore() {
  "use strict";

  var KEY = "CS_STUDENT_PROFILE_RECORDS_V1";

  function nowIso() {
    return new Date().toISOString();
  }

  function parse(raw, fallback) {
    try {
      return raw ? JSON.parse(raw) : fallback;
    } catch (_err) {
      return fallback;
    }
  }

  function load() {
    var parsed = parse(localStorage.getItem(KEY), null);
    if (!parsed || typeof parsed !== "object") return { version: 1, students: {} };
    if (!parsed.students || typeof parsed.students !== "object") parsed.students = {};
    return parsed;
  }

  function save(state) {
    localStorage.setItem(KEY, JSON.stringify(state));
    return state;
  }

  function normalizeId(studentId) {
    return String(studentId || "").trim() || "demo-student";
  }

  function emptyRecord(studentId) {
    return {
      studentId: normalizeId(studentId),
      fbaIncidents: [],
      bipPlan: {
        targetBehavior: "",
        replacementBehavior: "",
        preventionMoves: "",
        adultResponse: "",
        reinforcementPlan: "",
        reviewDate: ""
      },
      stakeholderCheckins: [],
      reminders: []
    };
  }

  function ensureStudent(state, studentId) {
    var sid = normalizeId(studentId);
    if (!state.students[sid] || typeof state.students[sid] !== "object") {
      state.students[sid] = emptyRecord(sid);
    }
    var row = state.students[sid];
    if (!Array.isArray(row.fbaIncidents)) row.fbaIncidents = [];
    if (!row.bipPlan || typeof row.bipPlan !== "object") row.bipPlan = emptyRecord(sid).bipPlan;
    if (!Array.isArray(row.stakeholderCheckins)) row.stakeholderCheckins = [];
    if (!Array.isArray(row.reminders)) row.reminders = [];
    return row;
  }

  function uid(prefix) {
    return String(prefix || "item") + "_" + Date.now().toString(36) + "_" + Math.random().toString(36).slice(2, 7);
  }

  function getStudentRecord(studentId) {
    var state = load();
    return JSON.parse(JSON.stringify(ensureStudent(state, studentId)));
  }

  function addFBAIncident(studentId, payload) {
    var state = load();
    var record = ensureStudent(state, studentId);
    var src = payload && typeof payload === "object" ? payload : {};
    var incident = {
      id: uid("fba"),
      createdAt: nowIso(),
      when: String(src.when || ""),
      setting: String(src.setting || ""),
      frequency: String(src.frequency || ""),
      intensity: String(src.intensity || ""),
      antecedent: String(src.antecedent || ""),
      behavior: String(src.behavior || ""),
      teacherResponse: String(src.teacherResponse || ""),
      peerResponse: String(src.peerResponse || ""),
      probableFunction: String(src.probableFunction || ""),
      notes: String(src.notes || "").slice(0, 400)
    };
    record.fbaIncidents.unshift(incident);
    record.fbaIncidents = record.fbaIncidents.slice(0, 120);
    save(state);
    return JSON.parse(JSON.stringify(incident));
  }

  function saveBIPPlan(studentId, payload) {
    var state = load();
    var record = ensureStudent(state, studentId);
    var src = payload && typeof payload === "object" ? payload : {};
    record.bipPlan = {
      targetBehavior: String(src.targetBehavior || ""),
      replacementBehavior: String(src.replacementBehavior || ""),
      preventionMoves: String(src.preventionMoves || ""),
      adultResponse: String(src.adultResponse || ""),
      reinforcementPlan: String(src.reinforcementPlan || ""),
      reviewDate: String(src.reviewDate || ""),
      updatedAt: nowIso()
    };
    save(state);
    return JSON.parse(JSON.stringify(record.bipPlan));
  }

  function addStakeholderCheckin(studentId, payload) {
    var state = load();
    var record = ensureStudent(state, studentId);
    var src = payload && typeof payload === "object" ? payload : {};
    var entry = {
      id: uid("checkin"),
      createdAt: nowIso(),
      role: String(src.role || "Teacher"),
      summary: String(src.summary || "").slice(0, 280),
      nextStep: String(src.nextStep || "").slice(0, 180)
    };
    record.stakeholderCheckins.unshift(entry);
    record.stakeholderCheckins = record.stakeholderCheckins.slice(0, 80);
    save(state);
    return JSON.parse(JSON.stringify(entry));
  }

  function listReminders(studentId) {
    var record = getStudentRecord(studentId);
    var reminders = [];
    if (!record.fbaIncidents.length) {
      reminders.push({ id: "fba-empty", label: "No FBA incidents logged yet", tone: "info" });
    }
    if (!record.bipPlan.reviewDate) {
      reminders.push({ id: "bip-review", label: "Set a BIP review date", tone: "warn" });
    }
    if (!record.stakeholderCheckins.length) {
      reminders.push({ id: "stakeholder-empty", label: "Collect one teacher, family, or student check-in", tone: "info" });
    }
    return reminders;
  }

  return {
    KEY: KEY,
    getStudentRecord: getStudentRecord,
    addFBAIncident: addFBAIncident,
    saveBIPPlan: saveBIPPlan,
    addStakeholderCheckin: addStakeholderCheckin,
    listReminders: listReminders
  };
});
