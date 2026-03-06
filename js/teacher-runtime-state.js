(function teacherRuntimeStateModule(root, factory) {
  if (typeof module === "object" && module.exports) {
    module.exports = factory();
    return;
  }
  root.CSTeacherRuntimeState = factory();
})(typeof globalThis !== "undefined" ? globalThis : window, function createTeacherRuntimeStateFactory() {
  "use strict";

  function isPlainObject(value) {
    return value !== null && typeof value === "object" && !Array.isArray(value);
  }

  function todayStamp() {
    var d = new Date();
    return [
      d.getFullYear(),
      String(d.getMonth() + 1).padStart(2, "0"),
      String(d.getDate()).padStart(2, "0")
    ].join("-");
  }

  function clone(value) {
    if (Array.isArray(value)) return value.slice();
    if (!isPlainObject(value)) return value;
    var copy = {};
    Object.keys(value).forEach(function (key) {
      copy[key] = clone(value[key]);
    });
    return copy;
  }

  function merge(base, patch) {
    var next = clone(base);
    Object.keys(patch || {}).forEach(function (key) {
      if (isPlainObject(next[key]) && isPlainObject(patch[key])) {
        next[key] = Object.assign({}, next[key], patch[key]);
      } else {
        next[key] = clone(patch[key]);
      }
    });
    return next;
  }

  function syncShape(state) {
    var next = merge({}, state || {});
    next.teacherProfile = isPlainObject(next.teacherProfile) ? next.teacherProfile : { id: "", name: "", email: "", school: "" };
    next.active_day = String(next.active_day || todayStamp());
    next.schedule_blocks = Array.isArray(next.schedule_blocks) ? next.schedule_blocks.slice() : [];
    next.active_block = isPlainObject(next.active_block) ? next.active_block : { id: "", label: "", timeLabel: "" };
    next.active_class_context = isPlainObject(next.active_class_context) ? next.active_class_context : { classId: "", label: "", supportType: "", lessonContextId: "" };
    next.active_student_context = isPlainObject(next.active_student_context) ? next.active_student_context : { studentId: "", studentName: "", grade: "" };
    next.search_context = isPlainObject(next.search_context) ? next.search_context : { query: "", scope: "global", results: [] };
    next.workspace_context = isPlainObject(next.workspace_context) ? next.workspace_context : { mode: "hub", tab: "summary", meetingWorkspace: { open: false, tab: "summary" } };
    next.session = isPlainObject(next.session) ? next.session : { role: "teacher", mode: "hub", demoMode: false };
    next.intelligence = isPlainObject(next.intelligence) ? next.intelligence : { snapshot: null, plan: null, todayPlan: null, executiveProfile: null, executivePlan: null };
    next.ui = isPlainObject(next.ui) ? next.ui : { activeModal: null, drawerOpen: false };

    next.context = {
      mode: String(next.context && next.context.mode || (next.workspace_context.mode === "workspace" ? "workspace" : "caseload")),
      studentId: String(next.active_student_context.studentId || next.selectedStudentId || next.context && next.context.studentId || ""),
      classId: String(next.active_class_context.classId || next.active_block.id || next.context && next.context.classId || ""),
      lessonContext: next.active_class_context.lessonContext || next.context && next.context.lessonContext || null
    };
    next.active_student_context.studentId = next.context.studentId;
    next.selectedStudentId = next.context.studentId;
    next.active_block.id = next.context.classId;
    if (!next.active_class_context.classId) next.active_class_context.classId = next.context.classId;

    next.role = String(next.role || next.session.role || "teacher");
    next.mode = String(next.mode || next.workspace_context.mode || "hub");
    next.featureFlags = Object.assign({ demoMode: false, adminMode: false }, next.featureFlags || {});
    next.featureFlags.demoMode = !!(next.featureFlags.demoMode || next.session.demoMode);
    next.featureFlags.adminMode = !!(next.featureFlags.adminMode || next.role === "admin" || next.session.role === "admin");
    next.session.role = next.role;
    next.session.demoMode = next.featureFlags.demoMode;

    next.meetingWorkspace = Object.assign({ open: false, tab: "summary" }, next.meetingWorkspace || {}, next.workspace_context.meetingWorkspace || {});
    next.workspace_context.meetingWorkspace = Object.assign({}, next.meetingWorkspace);
    if (!next.workspace_context.mode) next.workspace_context.mode = next.mode;

    return next;
  }

  function create(initial) {
    var runtimeRoot = typeof globalThis !== "undefined" ? globalThis : window;
    var TeacherStorage = runtimeRoot.CSTeacherStorage || null;
    if (TeacherStorage && typeof TeacherStorage.migrateLegacyTeacherData === "function") {
      try { TeacherStorage.migrateLegacyTeacherData(); } catch (_err) {}
    }
    var state = syncShape(merge({
      teacherProfile: TeacherStorage && TeacherStorage.loadTeacherProfile ? TeacherStorage.loadTeacherProfile() : {},
      active_day: todayStamp(),
      schedule_blocks: TeacherStorage && TeacherStorage.loadScheduleBlocks ? TeacherStorage.loadScheduleBlocks(todayStamp()) : [],
      active_block: { id: "", label: "", timeLabel: "" },
      active_class_context: { classId: "", label: "", supportType: "", lessonContextId: "" },
      active_student_context: { studentId: "", studentName: "", grade: "" },
      search_context: { query: "", scope: "global", results: [] },
      workspace_context: { mode: "hub", tab: "summary", meetingWorkspace: { open: false, tab: "summary" } },
      session: { role: "teacher", mode: "hub", demoMode: false },
      intelligence: { snapshot: null, plan: null, todayPlan: null, executiveProfile: null, executivePlan: null },
      ui: { activeModal: null, drawerOpen: false },
      featureFlags: { demoMode: false, adminMode: false }
    }, initial || {}));
    var listeners = [];

    function emit() {
      listeners.slice().forEach(function (fn) {
        try { fn(state); } catch (_err) {}
      });
    }

    function applyPatch(patch) {
      if (!isPlainObject(patch)) return state;
      state = syncShape(merge(state, patch));
      emit();
      return state;
    }

    return {
      get: function () {
        return state;
      },
      set: function (patch) {
        return applyPatch(patch);
      },
      subscribe: function (fn) {
        if (typeof fn !== "function") return function () {};
        listeners.push(fn);
        return function () {
          listeners = listeners.filter(function (row) { return row !== fn; });
        };
      },
      unsubscribe: function (fn) {
        listeners = listeners.filter(function (row) { return row !== fn; });
      },
      updateMeetingWorkspace: function (patch) {
        var current = state.workspace_context && state.workspace_context.meetingWorkspace
          ? state.workspace_context.meetingWorkspace
          : state.meetingWorkspace;
        return applyPatch({
          workspace_context: {
            meetingWorkspace: Object.assign({}, current || {}, patch || {})
          }
        });
      }
    };
  }

  return { create: create };
});
