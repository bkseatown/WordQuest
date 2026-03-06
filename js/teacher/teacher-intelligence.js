(function teacherIntelligenceModule(root, factory) {
  if (typeof module === "object" && module.exports) {
    module.exports = factory();
    return;
  }
  root.CSTeacherIntelligence = factory();
})(typeof globalThis !== "undefined" ? globalThis : window, function createTeacherIntelligence() {
  "use strict";

  var LAST_ACTIVITY_KEY = "cs.lastActivityByStudent.v1";

  function safeCall(fn, fallback) {
    try {
      var value = fn();
      return value == null ? fallback : value;
    } catch (_err) {
      return fallback;
    }
  }

  function normalizeStudent(student, deps) {
    var TeacherSelectors = deps && deps.TeacherSelectors || root.CSTeacherSelectors || null;
    if (TeacherSelectors && typeof TeacherSelectors.normalizeStudent === "function") {
      return TeacherSelectors.normalizeStudent(student || {});
    }
    var row = student && typeof student === "object" ? student : {};
    return {
      id: String(row.id || row.studentId || row.name || "").trim(),
      name: String(row.name || row.studentName || row.id || "Student").trim(),
      grade: String(row.grade || row.gradeBand || row.gradeLevel || "").trim(),
      gradeBand: String(row.gradeBand || row.grade || row.gradeLevel || "").trim(),
      tier: String(row.tier || "").trim(),
      risk: String(row.risk || "watch").trim(),
      focus: String(row.focus || "").trim(),
      tags: Array.isArray(row.tags) ? row.tags.slice() : []
    };
  }

  function getStudentSummary(studentId, fallbackStudent, deps) {
    var id = String(studentId || "");
    if (!id) return null;
    var options = deps && typeof deps === "object" ? deps : {};
    var Evidence = options.Evidence || root.CSEvidence || null;
    var fallback = normalizeStudent(fallbackStudent || { id: id }, options);
    var summary = Evidence && typeof Evidence.getStudentSummary === "function"
      ? safeCall(function () { return Evidence.getStudentSummary(id); }, null)
      : null;
    if (summary && summary.student) return summary;
    return {
      student: fallback,
      evidenceChips: [],
      last7Sparkline: [],
      lastSession: null,
      sessions: []
    };
  }

  function getStudentSnapshot(studentId, deps) {
    var id = String(studentId || "");
    if (!id) return null;
    var options = deps && typeof deps === "object" ? deps : {};
    var TeacherSelectors = options.TeacherSelectors || root.CSTeacherSelectors || null;
    if (TeacherSelectors && typeof TeacherSelectors.getStudentEvidence === "function") {
      return TeacherSelectors.getStudentEvidence(id, options);
    }
    var Evidence = options.Evidence || root.CSEvidence || null;
    if (Evidence && typeof Evidence.computeStudentSnapshot === "function") {
      return safeCall(function () { return Evidence.computeStudentSnapshot(id); }, null);
    }
    return null;
  }

  function buildStudentPlan(studentId, fallbackStudent, deps) {
    var id = String(studentId || "");
    if (!id) return null;
    var options = deps && typeof deps === "object" ? deps : {};
    var PlanEngine = options.PlanEngine || root.CSPlanEngine || null;
    if (!PlanEngine || typeof PlanEngine.buildPlan !== "function") return null;
    var summary = getStudentSummary(id, fallbackStudent, options);
    var snapshot = getStudentSnapshot(id, options) || { needs: [] };
    return safeCall(function () {
      return PlanEngine.buildPlan({
        student: summary && summary.student ? summary.student : normalizeStudent(fallbackStudent || { id: id }, options),
        snapshot: snapshot
      });
    }, null);
  }

  function getLastActivityMap() {
    return safeCall(function () {
      var parsed = JSON.parse(localStorage.getItem(LAST_ACTIVITY_KEY) || "{}");
      return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed : {};
    }, {});
  }

  function setLastActivityMap(map) {
    safeCall(function () {
      localStorage.setItem(LAST_ACTIVITY_KEY, JSON.stringify(map || {}));
      return true;
    }, false);
  }

  function getLastActivity(studentId) {
    if (!studentId) return null;
    return getLastActivityMap()[String(studentId)] || null;
  }

  function recordLastActivity(studentId, moduleKey) {
    if (!studentId || !moduleKey) return;
    var map = getLastActivityMap();
    map[String(studentId)] = { module: String(moduleKey), ts: Date.now() };
    setLastActivityMap(map);
  }

  function ageDays(ts) {
    if (!ts || !Number.isFinite(Number(ts))) return 999;
    return Math.max(0, Math.floor((Date.now() - Number(ts)) / 86400000));
  }

  function focusFromSnapshot(snapshot, deps) {
    var options = deps && typeof deps === "object" ? deps : {};
    var SkillLabels = options.SkillLabels || root.CSSkillLabels || null;
    if (snapshot && Array.isArray(snapshot.topSkills) && snapshot.topSkills.length) {
      var skillIds = snapshot.topSkills.slice(0, 3).map(function (skill) { return String(skill.skillId || ""); });
      if (SkillLabels && typeof SkillLabels.getPrettyTargets === "function") {
        return SkillLabels.getPrettyTargets(skillIds);
      }
      return skillIds.filter(Boolean);
    }
    var needs = snapshot && Array.isArray(snapshot.needs) ? snapshot.needs : [];
    if (needs.length) {
      return needs.slice(0, 2).map(function (need) { return String(need.label || "Need"); });
    }
    return ["Collect baseline"];
  }

  function safeComputePriority(studentId, deps) {
    var options = deps && typeof deps === "object" ? deps : {};
    var EvidenceEngine = options.EvidenceEngine || root.CSEvidenceEngine || null;
    if (!EvidenceEngine || typeof EvidenceEngine.computePriority !== "function") {
      return { ok: false, priority: null, reason: "missing-engine" };
    }
    return safeCall(function () {
      var priority = EvidenceEngine.computePriority(String(studentId || ""));
      return { ok: true, priority: priority || null, reason: "" };
    }, { ok: false, priority: null, reason: "compute-failed" });
  }

  function heuristicScore(student, snapshot) {
    var sid = String(student && student.id || "");
    var snap = snapshot || {};
    var last = getLastActivity(sid);
    var trend = snap.trends && snap.trends.wordquest;
    var lastPoint = trend && Array.isArray(trend.last7) && trend.last7.length ? trend.last7[trend.last7.length - 1] : null;
    var score = 0;
    if (!lastPoint) score += 35;
    if (lastPoint && Number(lastPoint.score || 0) < 65) score += 25;
    if (snap.needs && snap.needs.length) {
      score += snap.needs.reduce(function (sum, need) {
        return sum + (Number(need.severity || 1) * Number(need.confidence || 0.5) * 3);
      }, 0);
    }
    if (snap.updatedAt) score += Math.min(20, ageDays(Date.parse(snap.updatedAt)) * 2);
    score += Math.min(20, ageDays(last && last.ts) * 2);
    return score;
  }

  function buildStudentContext(student, deps) {
    var normalized = normalizeStudent(student, deps);
    var sid = String(normalized.id || "");
    var summary = getStudentSummary(sid, normalized, deps);
    var snapshot = getStudentSnapshot(sid, deps) || null;
    var plan = buildStudentPlan(sid, summary && summary.student ? summary.student : normalized, deps);
    var computed = safeComputePriority(sid, deps);
    var priority = plan && plan.priority ? plan.priority : (computed.ok ? computed.priority : null);
    var fallbackScore = heuristicScore(normalized, snapshot || {});
    return {
      student: summary && summary.student ? summary.student : normalized,
      summary: summary,
      snapshot: snapshot,
      plan: plan,
      priority: priority,
      priorityFallback: !priority,
      focus: focusFromSnapshot(priority && priority.topSkills && priority.topSkills.length ? priority : snapshot, deps),
      lastActivity: getLastActivity(sid),
      score: priority ? Number(priority.overallPriority || 0) : fallbackScore
    };
  }

  function buildStudentContextById(studentId, fallbackStudent, deps) {
    return buildStudentContext(Object.assign({}, fallbackStudent || {}, { id: studentId }), deps);
  }

  function buildTodayPlan(students, deps) {
    var rows = (Array.isArray(students) ? students : []).map(function (student) {
      return buildStudentContext(student, deps);
    });
    var ranked = rows.slice().sort(function (a, b) { return b.score - a.score; }).slice(0, 3);
    if (!ranked.length) {
      ranked = [
        { id: "demo-a", name: "Demo Student A", grade: "G5" },
        { id: "demo-b", name: "Demo Student B", grade: "G4" },
        { id: "demo-c", name: "Demo Student C", grade: "G6" }
      ].map(function (student) {
        return {
          student: student,
          summary: { student: student, evidenceChips: [], last7Sparkline: [], lastSession: null, sessions: [] },
          snapshot: null,
          plan: null,
          priority: null,
          priorityFallback: true,
          focus: ["Collect baseline"],
          lastActivity: getLastActivity(student.id),
          score: 0
        };
      });
    }
    return { students: ranked, allStudents: rows };
  }

  return {
    getStudentSummary: getStudentSummary,
    getStudentSnapshot: getStudentSnapshot,
    buildStudentPlan: buildStudentPlan,
    buildStudentContext: buildStudentContext,
    buildStudentContextById: buildStudentContextById,
    buildTodayPlan: buildTodayPlan,
    focusFromSnapshot: focusFromSnapshot,
    safeComputePriority: safeComputePriority,
    heuristicScore: heuristicScore,
    getLastActivity: getLastActivity,
    recordLastActivity: recordLastActivity
  };
});
