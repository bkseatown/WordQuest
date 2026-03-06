(function workspaceDrawerContentModule(root, factory) {
  if (typeof module === "object" && module.exports) {
    module.exports = factory();
    return;
  }
  root.CSWorkspaceDrawerContent = factory();
})(typeof globalThis !== "undefined" ? globalThis : window, function createWorkspaceDrawerContent() {
  "use strict";

  function buildSnapshot(options) {
    var config = options && typeof options === "object" ? options : {};
    var summary = config.summary || { evidenceChips: [], nextMove: {} };
    var escAttr = typeof config.escAttr === "function" ? config.escAttr : function (value) { return String(value || ""); };
    var renderInstitutionalAnchorPanel = typeof config.renderInstitutionalAnchorPanel === "function"
      ? config.renderInstitutionalAnchorPanel
      : function () { return ""; };
    var efRow = config.executive || { upcomingTasks: [] };
    var studentId = String(config.studentId || "");
    var upcomingTasks = Array.isArray(efRow.upcomingTasks) ? efRow.upcomingTasks.slice(0, 3) : [];
    var assignmentSnapshot = '<div class="td-support-item"><h4>Upcoming Tasks</h4>' + (
      upcomingTasks.length
        ? upcomingTasks.map(function (task) {
            return '<p>' + escAttr(task.name || "Task") + ' • ' + escAttr(task.dueDate || "No due date") + ' • ' + escAttr(task.status || "Not Started") + '</p>';
          }).join("")
        : "<p>No upcoming tasks yet.</p>"
    ) + "</div>";
    return [
      '<div class="td-support-item"><h4>Last 7 Days Minutes</h4><p>Derived from recent sessions and quick checks.</p></div>',
      '<div class="td-support-item"><h4>Top Signals</h4><p>' + (summary.evidenceChips || []).slice(0, 5).map(function (c) { return c.label + " " + c.value; }).join(" • ") + '</p></div>',
      '<div class="td-support-item"><h4>Next Best Activity</h4><p>' + (summary.nextMove && summary.nextMove.line || "") + '</p><button class="td-top-btn" type="button" data-drawer-launch="' + escAttr(summary.nextMove && summary.nextMove.quickHref || "word-quest.html?quick=1") + '">Launch</button></div>',
      assignmentSnapshot,
      renderInstitutionalAnchorPanel(studentId, true)
    ].join("");
  }

  function buildGoals(options) {
    var config = options && typeof options === "object" ? options : {};
    var support = config.support || { goals: [] };
    var goalsList = (support.goals || []).length
      ? support.goals.slice(0, 6).map(function (goal) {
          return '<div class="td-support-item"><h4>' + (goal.skill || goal.domain || "Goal") + '</h4><p>' + (goal.baseline || "--") + ' → ' + (goal.target || "--") + ' • updated ' + (goal.updatedAt || goal.createdAt || "") + '</p></div>';
        }).join("")
      : '<div class="td-support-item"><p>No goals yet. Use Meeting Notes → Convert to Goals.</p></div>';
    return '<div class="td-support-item"><h4>SMART Goal Builder</h4><p>Quick add one baseline-to-target goal from today\'s discussion.</p><button class="td-top-btn" type="button" data-drawer-action="add-goal">Add Goal</button></div>' + goalsList;
  }

  function buildInterventions(options) {
    var config = options && typeof options === "object" ? options : {};
    var support = config.support || { interventions: [] };
    var formatTier1Intervention = typeof config.formatTier1Intervention === "function"
      ? config.formatTier1Intervention
      : function (row) { return { readinessLabel: "Gathering data", datapointsCount: Array.isArray(row && row.datapoints) ? row.datapoints.length : 0 }; };
    var interventionList = (support.interventions || []).length
      ? support.interventions.slice(0, 8).map(function (intervention) {
          var view = formatTier1Intervention(intervention);
          return '<div class="td-support-item"><h4>Tier ' + (intervention.tier || 1) + ' • ' + (intervention.domain || "") + '</h4><p>' + (intervention.strategy || intervention.focus || "") + ' • ' + (intervention.frequency || "") + ' • ' + (intervention.durationMinutes || intervention.durationMin || "--") + ' min</p><div class="td-plan-tabs"><span class="td-chip">' + view.readinessLabel + '</span><span class="td-chip">Datapoints ' + view.datapointsCount + '</span></div></div>';
        }).join("")
      : '<div class="td-support-item"><p>No intervention entries yet.</p></div>';
    return '<div class="td-support-item"><h4>Tier 1/2/3 Quick Log</h4><p>3-click entry for what/when/how long.</p><div class="td-plan-tabs"><button class="td-top-btn" type="button" data-drawer-action="start-tier1">Start Tier 1 Plan</button><button class="td-top-btn" type="button" data-drawer-action="add-intervention">Quick Log</button><button class="td-top-btn" type="button" data-drawer-action="add-datapoint">Log Datapoint</button></div></div>' + interventionList;
  }

  function buildEvidence(options) {
    var config = options && typeof options === "object" ? options : {};
    var summary = config.summary || { evidenceChips: [] };
    return '<div class="td-support-item"><h4>Evidence (filterable)</h4><p>' + (summary.evidenceChips || []).map(function (chip) { return chip.label + ": " + chip.value; }).join(" • ") + '</p></div>';
  }

  function buildShare() {
    return [
      '<div class="td-support-item"><h4>Share</h4><p>Generate meeting-ready outputs in one click.</p></div>',
      '<div class="td-support-item"><button id="td-drawer-share-now" class="td-top-btn" type="button">Open Share Summary</button></div>',
      '<div class="td-support-item"><button class="td-top-btn" type="button" data-drawer-action="meeting-summary">Meeting Summary (printable)</button></div>',
      '<div class="td-support-item"><button class="td-top-btn" type="button" data-drawer-action="tier1-pack">Tier 1 Evidence Pack</button></div>',
      '<div class="td-support-item"><button class="td-top-btn" type="button" data-drawer-action="mdt-export">Export for MDT (JSON + CSV)</button></div>'
    ].join("");
  }

  return {
    buildSnapshot: buildSnapshot,
    buildGoals: buildGoals,
    buildInterventions: buildInterventions,
    buildEvidence: buildEvidence,
    buildShare: buildShare
  };
});
