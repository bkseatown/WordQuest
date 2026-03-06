(function teacherSearchServiceModule(root, factory) {
  if (typeof module === "object" && module.exports) {
    module.exports = factory();
    return;
  }
  root.CSTeacherSearchService = factory();
})(typeof globalThis !== "undefined" ? globalThis : window, function createTeacherSearchServiceFactory() {
  "use strict";

  function create(options) {
    var config = options && typeof options === "object" ? options : {};
    var TeacherSearchIndex = config.TeacherSearchIndex || root.CSTeacherSearchIndex || null;

    function collectStudents() {
      var rows = [];
      var seen = {};
      var fromStore = typeof config.getStudentsStore === "function" ? config.getStudentsStore() : {};
      Object.keys(fromStore || {}).forEach(function (studentId) {
        if (!fromStore[studentId]) return;
        seen[String(studentId)] = true;
        rows.push(Object.assign({ id: studentId }, fromStore[studentId] || {}));
      });
      var fromCaseload = typeof config.getCaseload === "function" ? config.getCaseload() : [];
      (Array.isArray(fromCaseload) ? fromCaseload : []).forEach(function (student) {
        var id = String(student && student.id || "");
        if (!id || seen[id]) return;
        seen[id] = true;
        rows.push(student);
      });
      return rows;
    }

    function collectBlocks() {
      var rows = typeof config.getBlocks === "function" ? config.getBlocks() : [];
      return Array.isArray(rows) ? rows : [];
    }

    function collectResources() {
      var rows = typeof config.getResources === "function" ? config.getResources() : config.resources;
      return Array.isArray(rows) ? rows : [];
    }

    function buildIndex() {
      if (!TeacherSearchIndex || typeof TeacherSearchIndex.create !== "function") return null;
      return TeacherSearchIndex.create({
        students: collectStudents(),
        blocks: collectBlocks(),
        resources: collectResources()
      });
    }

    return {
      query: function (input) {
        var index = buildIndex();
        return index && typeof index.query === "function" ? index.query(input) : [];
      },
      group: function (input) {
        var index = buildIndex();
        return index && typeof index.group === "function" ? index.group(input) : {};
      },
      all: function () {
        var index = buildIndex();
        return index && typeof index.all === "function" ? index.all() : [];
      }
    };
  }

  return { create: create };
});
