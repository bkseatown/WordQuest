(function gameStateModule(root, factory) {
  if (typeof module === "object" && module.exports) {
    module.exports = factory();
    return;
  }
  root.CSGameState = factory();
})(typeof globalThis !== "undefined" ? globalThis : window, function createGameState() {
  "use strict";

  function clone(value) {
    if (Array.isArray(value)) return value.slice();
    if (!value || typeof value !== "object") return value;
    var out = {};
    Object.keys(value).forEach(function (key) {
      out[key] = clone(value[key]);
    });
    return out;
  }

  function create(initialState) {
    var state = Object.assign({
      selectedGameId: "word-quest",
      status: "idle",
      score: 0,
      streak: 0,
      roundsCompleted: 0,
      roundTarget: 6,
      roundIndex: 0,
      round: null,
      history: [],
      feedback: null,
      hintVisible: false,
      teacherPanelOpen: false,
      settings: {},
      context: {},
      metrics: {
        correct: 0,
        incorrect: 0,
        nearMiss: 0
      }
    }, clone(initialState || {}));

    var listeners = [];

    function notify() {
      listeners.slice().forEach(function (listener) {
        try { listener(state); } catch (_err) {}
      });
    }

    function patch(nextPatch) {
      state = Object.assign({}, state, clone(nextPatch || {}));
      notify();
      return state;
    }

    return {
      get: function () {
        return state;
      },
      patch: patch,
      subscribe: function (listener) {
        if (typeof listener !== "function") return function () {};
        listeners.push(listener);
        return function () {
          listeners = listeners.filter(function (item) { return item !== listener; });
        };
      }
    };
  }

  return {
    create: create
  };
});
