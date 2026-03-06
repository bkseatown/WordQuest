(function dashboardStateCompatibilityModule(root) {
  "use strict";

  function factory() {
    var runtime = root.CSTeacherRuntimeState;
    if (!runtime || typeof runtime.create !== "function") {
      return {
        create: function () {
          return {
            get: function () { return { role: "teacher", mode: "workspace", selectedStudentId: "", meetingWorkspace: { open: false, tab: "summary" }, featureFlags: { demoMode: false, adminMode: false } }; },
            set: function () {},
            updateMeetingWorkspace: function () {},
            subscribe: function () { return function () {}; }
          };
        }
      };
    }
    return {
      create: function (overrides) {
        return runtime.create(overrides || {});
      }
    };
  }

  if (typeof module === "object" && module.exports) {
    module.exports = factory();
    return;
  }
  root.CSDashboardState = factory();
})(typeof globalThis !== "undefined" ? globalThis : window);
