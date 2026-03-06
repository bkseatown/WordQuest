(function teacherContextEngineModule(root, factory) {
  if (typeof module === "object" && module.exports) {
    module.exports = factory(
      require("./lesson-context-deriver"),
      require("./student-support-deriver"),
      require("./class-context-deriver")
    );
    return;
  }
  root.CSTeacherContextEngine = factory(
    root.CSLessonContextDeriver,
    root.CSStudentSupportDeriver,
    root.CSClassContextDeriver
  );
})(typeof globalThis !== "undefined" ? globalThis : window, function createTeacherContextEngineFactory(LessonDeriver, StudentDeriver, ClassDeriver) {
  "use strict";

  var runtimeRoot = typeof globalThis !== "undefined" ? globalThis : window;
  var lessonTools = LessonDeriver || {};
  var studentTools = StudentDeriver || {};
  var classTools = ClassDeriver || {};

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

  function resolveDeps(deps) {
    var options = deps && typeof deps === "object" ? deps : {};
    return {
      TeacherStorage: options.TeacherStorage || runtimeRoot.CSTeacherStorage || null,
      TeacherSelectors: options.TeacherSelectors || runtimeRoot.CSTeacherSelectors || null,
      SupportStore: options.SupportStore || runtimeRoot.CSSupportStore || null
    };
  }

  function normalizeStudentRow(student) {
    var row = student && typeof student === "object" ? student : {};
    return {
      id: toText(row.id || row.studentId || row.key || row.name),
      name: toText(row.name || row.studentName || row.id || "Student"),
      grade: toText(row.grade || row.gradeBand || row.gradeLevel),
      gradeBand: toText(row.gradeBand || row.grade || row.gradeLevel),
      tier: toText(row.tier),
      focus: toText(row.focus),
      tags: Array.isArray(row.tags) ? row.tags.slice(0, 8) : []
    };
  }

  function getScheduleBlock(contextSource, tools) {
    var source = contextSource && typeof contextSource === "object" ? contextSource : {};
    if (source.block && typeof source.block === "object") return source.block;
    if (source.activeBlock && typeof source.activeBlock === "object") return source.activeBlock;
    if (source.blockId && tools.TeacherSelectors && typeof tools.TeacherSelectors.getBlockById === "function") {
      return tools.TeacherSelectors.getBlockById(source.blockId, source.day, { TeacherStorage: tools.TeacherStorage }) || null;
    }
    return null;
  }

  function getClassContext(source, tools, block) {
    if (source.classContext && typeof source.classContext === "object") return source.classContext;
    if (source.activeClassContext && typeof source.activeClassContext === "object") return source.activeClassContext;
    if (source.classId && tools.TeacherStorage && typeof tools.TeacherStorage.loadClassContexts === "function") {
      var classMap = tools.TeacherStorage.loadClassContexts();
      if (classMap[source.classId]) return classMap[source.classId];
    }
    if (block && tools.TeacherSelectors && typeof tools.TeacherSelectors.getClassContext === "function") {
      return tools.TeacherSelectors.getClassContext(block.id, { TeacherStorage: tools.TeacherStorage }) || null;
    }
    return null;
  }

  function getLessonContext(source, tools, block, classContext) {
    if (source.lessonContext && typeof source.lessonContext === "object") return source.lessonContext;
    var lessonContextId = toText(source.lessonContextId || (classContext && classContext.lessonContextId) || (block && block.lessonContextId));
    if (lessonContextId && tools.TeacherSelectors && typeof tools.TeacherSelectors.getLessonContext === "function") {
      return tools.TeacherSelectors.getLessonContext(lessonContextId, { TeacherStorage: tools.TeacherStorage }) || null;
    }
    return null;
  }

  function getStudentStoreRows(source, tools) {
    if (Array.isArray(source.students)) return source.students.map(normalizeStudentRow);
    var ids = Array.isArray(source.studentIds) ? source.studentIds.slice() : [];
    var block = source.block && typeof source.block === "object" ? source.block : null;
    if (!ids.length && block && Array.isArray(block.studentIds)) ids = block.studentIds.slice();
    if (!ids.length && block && Array.isArray(block.rosterRefs)) ids = block.rosterRefs.slice();
    var studentStore = tools.TeacherStorage && typeof tools.TeacherStorage.loadStudentsStore === "function"
      ? tools.TeacherStorage.loadStudentsStore()
      : {};
    return uniqueList(ids, 60).map(function (studentId) {
      return normalizeStudentRow(Object.assign({ id: studentId }, studentStore[studentId] || {}));
    }).filter(function (row) {
      return row.id;
    });
  }

  function getStudentSupport(studentId, tools) {
    if (!studentId) return {};
    if (tools.SupportStore && typeof tools.SupportStore.getStudent === "function") {
      try {
        return tools.SupportStore.getStudent(studentId) || {};
      } catch (_err) {}
    }
    if (tools.TeacherStorage && typeof tools.TeacherStorage.loadStudentSupportStore === "function") {
      var map = tools.TeacherStorage.loadStudentSupportStore();
      return map && map[studentId] ? map[studentId] : {};
    }
    return {};
  }

  function getStudentEvidence(studentId, tools) {
    if (!studentId || !tools.TeacherSelectors || typeof tools.TeacherSelectors.getStudentEvidence !== "function") {
      return null;
    }
    try {
      return tools.TeacherSelectors.getStudentEvidence(studentId, { TeacherStorage: tools.TeacherStorage }) || null;
    } catch (_err) {
      return null;
    }
  }

  function buildSourceContext(contextSource, block, classContext, lessonContext, students) {
    var source = contextSource && typeof contextSource === "object" ? contextSource : {};
    var firstStudent = students[0] || {};
    return {
      id: toText(source.id || (block && block.id) || (classContext && classContext.classId)),
      blockId: toText(source.blockId || (block && block.id)),
      classId: toText(source.classId || (classContext && classContext.classId) || (block && block.id)),
      classLabel: toText(source.classLabel || (classContext && classContext.label) || (block && block.label)),
      label: toText(source.label || (classContext && classContext.label) || (block && block.label)),
      classSection: toText(source.classSection || (block && block.classSection)),
      teacher: toText(source.teacher || (classContext && classContext.teacher) || (block && block.teacher)),
      subject: toText(source.subject || (classContext && classContext.subject) || (block && block.subject)),
      curriculum: toText(source.curriculum || (classContext && classContext.curriculum) || (block && block.curriculum)),
      unit: toText(source.unit || (lessonContext && lessonContext.unit)),
      lesson: toText(source.lesson || (lessonContext && lessonContext.title) || (classContext && classContext.lesson) || (block && block.lesson)),
      lessonFocus: toText(source.lessonFocus || source.conceptFocus || (classContext && classContext.conceptFocus) || (lessonContext && lessonContext.conceptFocus) || (classContext && classContext.notes)),
      conceptFocus: toText(source.conceptFocus || (classContext && classContext.conceptFocus) || (lessonContext && lessonContext.conceptFocus)),
      notes: toText(source.notes || (classContext && classContext.notes) || (block && block.notes)),
      lessonContextId: toText(source.lessonContextId || (classContext && classContext.lessonContextId) || (block && block.lessonContextId)),
      languageDemands: source.languageDemands || (classContext && classContext.languageDemands) || (lessonContext && lessonContext.languageDemands) || [],
      misconceptions: source.misconceptions || (lessonContext && lessonContext.misconceptions) || [],
      supportMoves: source.supportMoves || source.recommendedMoves || [],
      targetSkills: source.targetSkills || [],
      gradeBand: toText(source.gradeBand || source.grade || firstStudent.gradeBand || firstStudent.grade),
      supportType: toText(source.supportType || (classContext && classContext.supportType) || (block && block.supportType)),
      mode: toText(source.mode),
      studentId: toText(source.studentId),
      studentIds: students.map(function (student) { return student.id; })
    };
  }

  function deriveContext(contextSource, deps) {
    var source = contextSource && typeof contextSource === "object" ? contextSource : {};
    var tools = resolveDeps(deps);
    var block = getScheduleBlock(source, tools);
    source.block = block || source.block || null;
    var students = getStudentStoreRows(source, tools);
    var classContext = getClassContext(source, tools, block);
    var lessonContext = getLessonContext(source, tools, block, classContext);
    var seed = buildSourceContext(source, block, classContext, lessonContext, students);
    var lesson = lessonTools && typeof lessonTools.deriveLessonContext === "function"
      ? lessonTools.deriveLessonContext(seed)
      : {};
    var studentDetails = students.map(function (student) {
      var support = getStudentSupport(student.id, tools);
      var evidence = getStudentEvidence(student.id, tools);
      return studentTools.deriveStudentSupport(student, support, evidence, lesson, lesson.subject);
    });
    var flexibleGroups = studentTools.buildFlexibleGroups(studentDetails, lesson);
    var classSummary = classTools.deriveClassContext(seed, lesson, studentDetails, flexibleGroups);
    var priorities = uniqueList(studentDetails.map(function (student) { return student.supportPriority; }), 6);
    return {
      source: {
        block: block,
        classContext: classContext,
        lessonContext: lessonContext
      },
      teacher: {
        name: toText(source.teacher || classSummary.teacher),
        id: toText(source.teacherId)
      },
      subject: classSummary.subject,
      curriculum: classSummary.curriculum,
      unit: classSummary.unit,
      lesson: classSummary.lesson,
      classId: classSummary.classId,
      classLabel: classSummary.classLabel,
      blockId: classSummary.blockId,
      gradeBand: classSummary.gradeBand,
      supportType: classSummary.supportType,
      mode: classSummary.mode,
      lessonFocus: classSummary.lessonFocus,
      mainConcept: classSummary.mainConcept,
      conceptFocus: classSummary.conceptFocus,
      languageDemands: classSummary.languageDemands,
      misconceptions: classSummary.misconceptions,
      recommendedMoves: classSummary.recommendedMoves,
      targetSkills: classSummary.targetSkills,
      students: studentDetails,
      studentIds: classSummary.studentIds,
      supportPriorities: priorities,
      accommodations: uniqueList([].concat.apply([], studentDetails.map(function (student) {
        return student.accommodations || [];
      })), 8),
      flexibleGroups: flexibleGroups,
      prioritySignal: classSummary.prioritySignal
    };
  }

  function buildGamePayload(gameType, context) {
    var game = toText(gameType || "word-quest").toLowerCase();
    var data = context && typeof context === "object" ? context : {};
    return {
      gameType: game,
      subject: data.subject,
      curriculum: data.curriculum,
      unit: data.unit,
      lesson: data.lesson,
      classId: data.classId,
      studentIds: Array.isArray(data.studentIds) ? data.studentIds.slice(0, 12) : [],
      gradeBand: data.gradeBand,
      tierContext: Array.isArray(data.supportPriorities) ? data.supportPriorities.slice(0, 4) : [],
      lessonFocus: data.mainConcept || data.lessonFocus,
      languageDemands: Array.isArray(data.languageDemands) ? data.languageDemands.slice(0, 5) : [],
      targetSkills: Array.isArray(data.targetSkills) ? data.targetSkills.slice(0, 5) : [],
      accommodations: Array.isArray(data.accommodations) ? data.accommodations.slice(0, 6) : [],
      mode: data.mode
    };
  }

  return {
    deriveContext: deriveContext,
    buildGamePayload: buildGamePayload
  };
});
