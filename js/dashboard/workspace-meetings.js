(function workspaceMeetingsModule(root, factory) {
  if (typeof module === "object" && module.exports) {
    module.exports = factory();
    return;
  }
  root.CSWorkspaceMeetings = factory();
})(typeof globalThis !== "undefined" ? globalThis : window, function createWorkspaceMeetings() {
  "use strict";

  function openMeetingWorkspace(controller) {
    if (!controller || typeof controller.open !== "function") return false;
    controller.open();
    return true;
  }

  return {
    openMeetingWorkspace: openMeetingWorkspace
  };
});
