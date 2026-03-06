(function workspaceSelectionModule(root, factory) {
  if (typeof module === "object" && module.exports) {
    module.exports = factory();
    return;
  }
  root.CSWorkspaceSelection = factory();
})(typeof globalThis !== "undefined" ? globalThis : window, function createWorkspaceSelection() {
  "use strict";

  function selectStudent(options) {
    var cfg = options && typeof options === "object" ? options : {};
    var state = cfg.state || {};
    var appState = cfg.appState || null;
    var studentId = String(cfg.studentId || "");
    var caseload = Array.isArray(state.caseload) ? state.caseload : [];
    var DashboardFocus = cfg.DashboardFocus || null;
    var TeacherIntelligence = cfg.TeacherIntelligence || null;
    var WorkspaceFocusShell = cfg.WorkspaceFocusShell || null;
    var appendStudentParam = typeof cfg.appendStudentParam === "function" ? cfg.appendStudentParam : function (value) { return value; };
    var hooks = cfg.hooks || {};

    state.selectedId = studentId;
    if (DashboardFocus && typeof DashboardFocus.setSelectedStudent === "function") {
      DashboardFocus.setSelectedStudent(appState, state.selectedId);
    } else if (appState && typeof appState.set === "function") {
      appState.set({ selectedStudentId: state.selectedId });
    }

    var selectedStudent = caseload.filter(function (row) {
      return String(row && row.id || "") === state.selectedId;
    })[0] || null;

    if (appState && typeof appState.set === "function") {
      appState.set({
        active_student_context: {
          studentId: state.selectedId,
          studentName: selectedStudent && selectedStudent.name || "",
          grade: selectedStudent && (selectedStudent.gradeBand || selectedStudent.grade || "") || ""
        },
        workspace_context: {
          mode: "workspace",
          tab: state.workspaceTab || "summary"
        }
      });
    }

    state.generatedPlanner = null;
    if (typeof hooks.renderCaseload === "function") hooks.renderCaseload();

    if (!state.selectedId) {
      if (WorkspaceFocusShell && typeof WorkspaceFocusShell.renderEmptyState === "function") {
        WorkspaceFocusShell.renderEmptyState({ el: cfg.el || {} });
      }
      if (typeof hooks.onEmpty === "function") hooks.onEmpty();
      return null;
    }

    var studentContext = TeacherIntelligence && typeof TeacherIntelligence.buildStudentContextById === "function"
      ? TeacherIntelligence.buildStudentContextById(state.selectedId, selectedStudent || { id: state.selectedId }, cfg.intelligenceDeps || {})
      : null;
    var summary = studentContext && studentContext.summary ? studentContext.summary : null;
    state.snapshot = studentContext && Object.prototype.hasOwnProperty.call(studentContext, "snapshot")
      ? studentContext.snapshot
      : null;
    state.plan = studentContext && Object.prototype.hasOwnProperty.call(studentContext, "plan")
      ? studentContext.plan
      : null;

    var focusView = WorkspaceFocusShell && typeof WorkspaceFocusShell.renderSelectedState === "function"
      ? WorkspaceFocusShell.renderSelectedState({
          el: cfg.el || {},
          summary: summary || {},
          plan: state.plan,
          appendStudentParam: appendStudentParam
        })
      : { delta: 0, tierLabel: "" };

    if (typeof hooks.onSelected === "function") {
      hooks.onSelected({
        summary: summary,
        snapshot: state.snapshot,
        plan: state.plan,
        focusView: focusView
      });
    }

    return {
      summary: summary,
      snapshot: state.snapshot,
      plan: state.plan,
      focusView: focusView
    };
  }

  return {
    selectStudent: selectStudent
  };
});
