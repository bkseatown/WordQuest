(function hubStateCompatibilityModule(root) {
  "use strict";

  function factory() {
    var runtime = root.CSTeacherRuntimeState;
    if (!runtime || typeof runtime.create !== "function") {
      return {
        create: function () {
          return {
            get: function () { return { context: {}, session: {}, intelligence: {}, ui: {} }; },
            set: function () {},
            subscribe: function () { return function () {}; },
            unsubscribe: function () {}
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
  root.CSHubState = factory();
})(typeof globalThis !== "undefined" ? globalThis : window);
