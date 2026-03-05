/**
 * hub-state.js — Reactive state container for the v2 Command Hub.
 *
 * API:
 *   var hub = CSHubState.create();        // Create instance with defaults
 *   var hub = CSHubState.create(patch);   // Create with overrides
 *   hub.get()                             // Returns current state (do NOT mutate)
 *   hub.set({ context: { studentId: "x" } })  // Two-level merge + notify
 *   var off = hub.subscribe(fn)           // fn(state) on every set(); returns unsubscribe fn
 *   hub.unsubscribe(fn)                   // Explicit unsubscribe
 *
 * Two-level merge:
 *   set({ context: { studentId: "abc" } })
 *   merges into context, preserving mode / classId / lessonContext.
 *   Leaf values (including nested objects like lessonContext) are replaced, not merged.
 *
 * Published as window.CSHubState.
 */
(function hubStateModule(root, factory) {
  if (typeof module === "object" && module.exports) {
    module.exports = factory();
    return;
  }
  root.CSHubState = factory();
})(typeof globalThis !== "undefined" ? globalThis : window, function createHubStateFactory() {
  "use strict";

  /* ── Default state shape ────────────────────────────────── */

  var SHAPE = {
    context: {
      mode: "caseload",       // "caseload" | "class" | "recent"
      studentId: "",          // Primary selection key
      classId: null,          // Class context (push-in scenarios)
      lessonContext: null     // { grade, unit, lesson } or null
    },
    session: {
      role: "teacher",        // "teacher" | "admin" | "specialist"
      mode: "command",        // "command" | "reports" | "meeting"
      demoMode: false
    },
    intelligence: {
      snapshot: null,         // Evidence.computeStudentSnapshot result
      plan: null,             // PlanEngine.buildPlan result
      todayPlan: null,        // Class-level today plan
      executiveProfile: null, // ExecutiveProfileEngine result
      executivePlan: null     // ExecutiveSupportEngine result
    },
    ui: {
      activeModal: null,      // String modal ID or null (single-modal invariant)
      drawerOpen: false
    }
  };

  /* ── Helpers ────────────────────────────────────────────── */

  function isPlainObject(val) {
    return val !== null && typeof val === "object" && !Array.isArray(val);
  }

  /**
   * Clone state one level deep.
   * Top-level keys that are plain objects get a shallow copy.
   * Leaf values (strings, numbers, nulls, arrays, nested objects) are shared.
   */
  function cloneState(state) {
    var copy = {};
    var keys = Object.keys(state);
    for (var i = 0; i < keys.length; i++) {
      var k = keys[i];
      copy[k] = isPlainObject(state[k]) ? Object.assign({}, state[k]) : state[k];
    }
    return copy;
  }

  /**
   * Merge patch into base at two levels.
   *
   * Level 0 (top keys: context, session, intelligence, ui):
   *   If both base[k] and patch[k] are plain objects → Object.assign merge.
   *   Otherwise → replace.
   *
   * Level 1 (sub-keys: context.studentId, intelligence.plan, etc.):
   *   Always replace. No third-level merge.
   */
  function merge(base, patch) {
    var next = cloneState(base);
    var keys = Object.keys(patch);
    for (var i = 0; i < keys.length; i++) {
      var k = keys[i];
      if (isPlainObject(patch[k]) && isPlainObject(next[k])) {
        next[k] = Object.assign({}, next[k], patch[k]);
      } else {
        next[k] = patch[k];
      }
    }
    return next;
  }

  /* ── Factory ────────────────────────────────────────────── */

  function create(overrides) {
    var state = merge(cloneState(SHAPE), overrides || {});
    var listeners = [];

    return {
      /**
       * Returns current state.
       * Do NOT mutate the returned object — use set() instead.
       */
      get: function () {
        return state;
      },

      /**
       * Merge patch into state and notify all subscribers.
       * Returns the new state.
       *
       *   hub.set({ context: { studentId: "maya-123" } });
       *   hub.set({ ui: { activeModal: "share" } });
       *   hub.set({ intelligence: { snapshot: data, plan: plan } });
       */
      set: function (patch) {
        if (!isPlainObject(patch)) return state;
        state = merge(state, patch);
        var fns = listeners.slice();
        for (var i = 0; i < fns.length; i++) {
          try { fns[i](state); } catch (_e) {}
        }
        return state;
      },

      /**
       * Register a subscriber. Called with full state after every set().
       * Returns an unsubscribe function.
       *
       *   var off = hub.subscribe(function (state) { ... });
       *   off(); // unsubscribe
       */
      subscribe: function (fn) {
        if (typeof fn !== "function") return function () {};
        if (listeners.indexOf(fn) === -1) listeners.push(fn);
        return function () {
          var idx = listeners.indexOf(fn);
          if (idx >= 0) listeners.splice(idx, 1);
        };
      },

      /**
       * Explicit unsubscribe by function reference.
       */
      unsubscribe: function (fn) {
        var idx = listeners.indexOf(fn);
        if (idx >= 0) listeners.splice(idx, 1);
      }
    };
  }

  return { create: create };
});
