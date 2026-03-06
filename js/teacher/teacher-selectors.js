(function teacherSelectorsModule(root, factory) {
  if (typeof module === "object" && module.exports) {
    module.exports = factory();
    return;
  }
  root.CSTeacherSelectors = factory();
})(typeof globalThis !== "undefined" ? globalThis : window, function createTeacherSelectors() {
  "use strict";

  var runtimeRoot = typeof globalThis !== "undefined" ? globalThis : window;

  function safeParse(raw, fallback) {
    try {
      return raw ? JSON.parse(raw) : fallback;
    } catch (_err) {
      return fallback;
    }
  }

  function normalizeStudent(row) {
    var student = row && typeof row === "object" ? row : {};
    return {
      id: String(student.id || student.studentId || student.key || student.name || "").trim(),
      name: String(student.name || student.studentName || student.id || "Student").trim(),
      grade: String(student.grade || student.gradeLevel || student.gradeBand || "").trim(),
      gradeBand: String(student.gradeBand || student.grade || student.gradeLevel || "").trim(),
      tier: String(student.tier || "").trim(),
      risk: String(student.risk || "watch").trim(),
      focus: String(student.focus || "").trim(),
      tags: Array.isArray(student.tags) ? student.tags.slice() : []
    };
  }

  function uniqueStudents(rows) {
    var seen = {};
    return (Array.isArray(rows) ? rows : []).reduce(function (list, row) {
      var student = normalizeStudent(row);
      if (!student.id || seen[student.id]) return list;
      seen[student.id] = true;
      list.push(student);
      return list;
    }, []);
  }

  function loadCaseload(deps) {
    var options = deps && typeof deps === "object" ? deps : {};
    var TeacherStorage = options.TeacherStorage || runtimeRoot.CSTeacherStorage || null;
    var CaseloadStore = options.CaseloadStore || runtimeRoot.CSCaseloadStore || null;
    var Evidence = options.Evidence || runtimeRoot.CSEvidence || null;
    var rows = [];

    if (TeacherStorage && typeof TeacherStorage.loadStudentsStore === "function") {
      var studentStore = TeacherStorage.loadStudentsStore();
      Object.keys(studentStore || {}).forEach(function (studentId) {
        rows.push(Object.assign({ id: studentId }, studentStore[studentId] || {}));
      });
    }
    if (CaseloadStore && typeof CaseloadStore.getAll === "function") {
      rows = rows.concat(CaseloadStore.getAll() || []);
    }
    if (Evidence && typeof Evidence.listCaseload === "function") {
      rows = rows.concat(Evidence.listCaseload() || []);
    } else if (Evidence && typeof Evidence.getStudents === "function") {
      rows = rows.concat(Evidence.getStudents() || []);
    }

    rows = rows.concat(safeParse(localStorage.getItem("cs.caseload.v1"), []));
    return uniqueStudents(rows);
  }

  function loadScheduleBlocks(day, deps) {
    var options = deps && typeof deps === "object" ? deps : {};
    var TeacherStorage = options.TeacherStorage || runtimeRoot.CSTeacherStorage || null;
    if (!TeacherStorage || typeof TeacherStorage.loadScheduleBlocks !== "function") return [];
    return TeacherStorage.loadScheduleBlocks(day || (TeacherStorage.todayStamp ? TeacherStorage.todayStamp() : ""));
  }

  function getBlockById(blockId, day, deps) {
    var rows = loadScheduleBlocks(day, deps);
    var id = String(blockId || "");
    return rows.filter(function (row) { return String(row && row.id || "") === id; })[0] || null;
  }

  function getClassContext(blockId, deps) {
    var options = deps && typeof deps === "object" ? deps : {};
    var TeacherStorage = options.TeacherStorage || runtimeRoot.CSTeacherStorage || null;
    if (!TeacherStorage || typeof TeacherStorage.loadClassContexts !== "function") return null;
    var map = TeacherStorage.loadClassContexts();
    return map && map[String(blockId || "")] ? map[String(blockId || "")] : null;
  }

  function getLessonContext(contextId, deps) {
    var options = deps && typeof deps === "object" ? deps : {};
    var TeacherStorage = options.TeacherStorage || runtimeRoot.CSTeacherStorage || null;
    if (!TeacherStorage || typeof TeacherStorage.loadLessonContexts !== "function") return null;
    var map = TeacherStorage.loadLessonContexts();
    return map && map[String(contextId || "")] ? map[String(contextId || "")] : null;
  }

  function buildClassContext(block, deps) {
    var row = block && typeof block === "object" ? block : {};
    var classContext = getClassContext(row.id, deps) || {};
    var lessonContext = getLessonContext(row.lessonContextId || classContext.lessonContextId, deps) || {};
    return {
      blockId: String(row.id || ""),
      label: String(classContext.blockLabel || row.label || row.classSection || ""),
      timeLabel: String(classContext.blockTime || row.timeLabel || ""),
      supportType: String(classContext.supportType || row.supportType || ""),
      teacher: String(classContext.teacher || row.teacher || ""),
      subject: String(classContext.subject || row.subject || ""),
      curriculum: String(classContext.curriculum || row.curriculum || ""),
      lesson: String(lessonContext.title || row.lesson || ""),
      lessonContextId: String(row.lessonContextId || classContext.lessonContextId || ""),
      languageDemands: String(classContext.languageDemands || lessonContext.languageDemands || ""),
      conceptFocus: String(classContext.conceptFocus || lessonContext.conceptFocus || ""),
      notes: String(classContext.notes || lessonContext.notes || row.notes || "")
    };
  }

  function getStudentEvidence(studentId, deps) {
    if (!studentId) return null;
    var options = deps && typeof deps === "object" ? deps : {};
    var EvidenceEngine = options.EvidenceEngine || runtimeRoot.CSEvidenceEngine || null;
    var Evidence = options.Evidence || runtimeRoot.CSEvidence || null;
    if (EvidenceEngine && typeof EvidenceEngine.getStudentSkillSnapshot === "function") {
      return EvidenceEngine.getStudentSkillSnapshot(studentId);
    }
    if (Evidence && typeof Evidence.computeStudentSnapshot === "function") {
      return Evidence.computeStudentSnapshot(studentId);
    }
    var localEvidence = safeParse(localStorage.getItem("cs.evidence.v1"), {});
    return localEvidence[String(studentId)] || null;
  }

  return {
    normalizeStudent: normalizeStudent,
    loadCaseload: loadCaseload,
    loadScheduleBlocks: loadScheduleBlocks,
    getBlockById: getBlockById,
    getClassContext: getClassContext,
    getLessonContext: getLessonContext,
    buildClassContext: buildClassContext,
    getStudentEvidence: getStudentEvidence
  };
});
