(function workspaceFamilyCommunicationModule(root, factory) {
  if (typeof module === "object" && module.exports) {
    module.exports = factory();
    return;
  }
  root.CSWorkspaceFamilyCommunication = factory();
})(typeof globalThis !== "undefined" ? globalThis : window, function createWorkspaceFamilyCommunication() {
  "use strict";

  function resolveNoteChannel(activeTab) {
    if (activeTab === "family") return "family";
    if (activeTab === "team") return "team";
    return "teacher";
  }

  return {
    resolveNoteChannel: resolveNoteChannel
  };
});
