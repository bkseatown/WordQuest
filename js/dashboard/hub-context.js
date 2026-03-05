/**
 * hub-context.js — Intelligence auto-derivation layer for the v2 Command Hub.
 *
 * Watches HubState.context.studentId. When it changes, auto-invokes
 * the engine pipeline and writes results to intelligence.* in a single
 * batched set() call.
 *
 * Pipeline (executed in order):
 *   1. Evidence.computeStudentSnapshot(studentId)  → intelligence.snapshot
 *   2. Evidence.getStudentSummary(studentId)        (intermediate — feeds PlanEngine)
 *   3. PlanEngine.buildPlan({ student, snapshot })  → intelligence.plan
 *   4. buildTodayPlan()                             → intelligence.todayPlan
 *   5. computeExecutive(todayPlanRow)               → intelligence.executiveProfile
 *                                                     intelligence.executivePlan
 *
 * If a student is cleared (empty studentId), all intelligence fields reset to null.
 *
 * Usage:
 *   var cleanup = CSHubContext.init({
 *     hubState:          hubState,            // CSHubState instance
 *     Evidence:          window.CSEvidence,   // computeStudentSnapshot, getStudentSummary
 *     PlanEngine:        window.CSPlanEngine, // buildPlan
 *     buildTodayPlan:    fn,                  // () → todayPlan object
 *     computeExecutive:  fn                   // (row) → { profile, plan }
 *   });
 *
 *   cleanup(); // unsubscribe
 *
 * Published as window.CSHubContext.
 */
(function hubContextModule(root, factory) {
  if (typeof module === "object" && module.exports) {
    module.exports = factory();
    return;
  }
  root.CSHubContext = factory();
})(typeof globalThis !== "undefined" ? globalThis : window, function createHubContextFactory() {
  "use strict";

  /* ── Helpers ────────────────────────────────────────────── */

  function safe(fn) {
    try { return fn(); }
    catch (_e) { return null; }
  }

  function hasMethod(obj, name) {
    return obj && typeof obj[name] === "function";
  }

  /**
   * Find the plan row for a specific student in a todayPlan object.
   * Returns null if not found.
   */
  function findPlanRow(todayPlan, studentId) {
    var rows = todayPlan && Array.isArray(todayPlan.students)
      ? todayPlan.students
      : [];
    for (var i = 0; i < rows.length; i++) {
      if (rows[i] && rows[i].student && String(rows[i].student.id || "") === studentId) {
        return rows[i];
      }
    }
    return rows[0] || null;
  }

  var NULL_INTELLIGENCE = {
    snapshot: null,
    plan: null,
    todayPlan: null,
    executiveProfile: null,
    executivePlan: null
  };

  /* ── Init ───────────────────────────────────────────────── */

  function init(config) {
    var cfg = config && typeof config === "object" ? config : {};

    var hubState          = cfg.hubState;
    var Evidence          = cfg.Evidence          || null;
    var PlanEngine        = cfg.PlanEngine        || null;
    var buildTodayPlanFn  = typeof cfg.buildTodayPlan   === "function" ? cfg.buildTodayPlan   : null;
    var computeExecutiveFn = typeof cfg.computeExecutive === "function" ? cfg.computeExecutive : null;

    if (!hubState || typeof hubState.get !== "function" || typeof hubState.set !== "function") {
      return function () {};
    }

    var lastStudentId = hubState.get().context.studentId || "";

    /* ── Engine pipeline ─────────────────────────────────── */

    function recompute(studentId) {
      if (!studentId) {
        hubState.set({ intelligence: NULL_INTELLIGENCE });
        return;
      }

      // 1. Student snapshot
      var snapshot = safe(function () {
        return hasMethod(Evidence, "computeStudentSnapshot")
          ? Evidence.computeStudentSnapshot(studentId)
          : null;
      });

      // 2. Student summary (intermediate — needed for PlanEngine input)
      var summary = safe(function () {
        return hasMethod(Evidence, "getStudentSummary")
          ? Evidence.getStudentSummary(studentId)
          : null;
      });

      // 3. Plan
      var plan = safe(function () {
        if (!hasMethod(PlanEngine, "buildPlan")) return null;
        var student = summary && summary.student ? summary.student : null;
        return PlanEngine.buildPlan({
          student: student,
          snapshot: snapshot || { needs: [] }
        });
      });

      // 4. Today plan (class-level)
      var todayPlan = safe(function () {
        return buildTodayPlanFn ? buildTodayPlanFn() : null;
      });

      // 5. Executive profile + plan
      var executiveProfile = null;
      var executivePlan = null;
      if (computeExecutiveFn) {
        var row = findPlanRow(todayPlan, studentId);
        var ef = safe(function () { return computeExecutiveFn(row); });
        if (ef) {
          executiveProfile = ef.profile || null;
          executivePlan = ef.plan || null;
        }
      }

      // 6. Batch write — single set() call, single subscriber notification
      hubState.set({
        intelligence: {
          snapshot: snapshot,
          plan: plan,
          todayPlan: todayPlan,
          executiveProfile: executiveProfile,
          executivePlan: executivePlan
        }
      });
    }

    /* ── Subscriber ──────────────────────────────────────── */

    function onStateChange(state) {
      var currentId = (state.context && state.context.studentId) || "";
      if (currentId === lastStudentId) return;
      lastStudentId = currentId;
      recompute(currentId);
    }

    var unsubscribe = hubState.subscribe(onStateChange);

    // If a student is already selected at init time, compute immediately
    if (lastStudentId) {
      recompute(lastStudentId);
    }

    return unsubscribe;
  }

  return { init: init };
});
