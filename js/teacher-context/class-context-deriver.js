(function classContextDeriverModule(root, factory) {
  if (typeof module === "object" && module.exports) {
    module.exports = factory();
    return;
  }
  root.CSClassContextDeriver = factory();
})(typeof globalThis !== "undefined" ? globalThis : window, function createClassContextDeriver() {
  "use strict";

  function toText(value) {
    return String(value == null ? "" : value).trim();
  }

  function uniqueList(values, maxItems) {
    var seen = {};
    var out = [];
    (Array.isArray(values) ? values : []).forEach(function (value) {
      var text = toText(value);
      if (!text) return;
      var key = text.toLowerCase();
      if (seen[key]) return;
      seen[key] = true;
      out.push(text);
    });
    return typeof maxItems === "number" ? out.slice(0, maxItems) : out;
  }

  function inferMode(source) {
    var context = source && typeof source === "object" ? source : {};
    if (toText(context.mode)) return toText(context.mode);
    var studentCount = Array.isArray(context.studentIds) ? context.studentIds.length : 0;
    if (context.studentId && studentCount <= 1) return "individual";
    if (studentCount >= 8 || toText(context.supportType).toLowerCase() === "whole-class") return "projector";
    return studentCount > 1 ? "small-group" : "individual";
  }

  function derivePrioritySignal(students, lessonContext) {
    var focusStudents = (Array.isArray(students) ? students : []).filter(function (student) {
      return /^T[23]/.test(toText(student.supportPriority).toUpperCase());
    });
    if (focusStudents.length) {
      return {
        level: focusStudents.length >= 3 ? "elevated" : "watch",
        count: focusStudents.length,
        label: focusStudents.length + " students need support in this lesson",
        shortLabel: "Focus students detected"
      };
    }
    return {
      level: "steady",
      count: 0,
      label: "Core supports are aligned for " + (lessonContext.subject || "today") + ".",
      shortLabel: "Lesson ready"
    };
  }

  function deriveClassContext(source, lessonContext, students, flexibleGroups) {
    var context = source && typeof source === "object" ? source : {};
    var uniqueStudentIds = uniqueList((students || []).map(function (student) { return student.studentId; }), 60);
    return {
      blockId: toText(context.blockId || context.id),
      classId: toText(context.classId || context.blockId || context.id),
      classLabel: toText(context.classLabel || context.label || context.classSection || context.blockLabel || "Class context"),
      teacher: toText(context.teacher),
      subject: lessonContext.subject,
      curriculum: lessonContext.curriculum,
      unit: lessonContext.unit,
      lesson: lessonContext.lesson,
      gradeBand: lessonContext.gradeBand || toText(context.gradeBand || context.grade),
      supportType: toText(context.supportType || "push-in"),
      mode: inferMode({
        mode: context.mode,
        supportType: context.supportType,
        studentIds: uniqueStudentIds,
        studentId: context.studentId
      }),
      lessonFocus: lessonContext.lessonFocus || lessonContext.mainConcept,
      conceptFocus: lessonContext.conceptFocus || lessonContext.mainConcept,
      languageDemands: lessonContext.languageDemands.slice(),
      mainConcept: lessonContext.mainConcept,
      misconceptions: lessonContext.misconceptions.slice(),
      recommendedMoves: lessonContext.recommendedMoves.slice(),
      targetSkills: lessonContext.targetSkills.slice(),
      studentIds: uniqueStudentIds,
      studentCount: uniqueStudentIds.length,
      flexibleGroups: Array.isArray(flexibleGroups) ? flexibleGroups.slice(0, 3) : [],
      prioritySignal: derivePrioritySignal(students, lessonContext)
    };
  }

  return {
    deriveClassContext: deriveClassContext,
    derivePrioritySignal: derivePrioritySignal,
    inferMode: inferMode
  };
});
