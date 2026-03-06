(function workspaceFocusShellModule(root, factory) {
  if (typeof module === "object" && module.exports) {
    module.exports = factory();
    return;
  }
  root.CSWorkspaceFocusShell = factory();
})(typeof globalThis !== "undefined" ? globalThis : window, function createWorkspaceFocusShell() {
  "use strict";

  function buildSparkPath(points) {
    var arr = Array.isArray(points) && points.length ? points : [46, 49, 54, 58, 62, 60, 64];
    var max = Math.max.apply(Math, arr);
    var min = Math.min.apply(Math, arr);
    var span = Math.max(1, max - min);
    return arr.map(function (value, index) {
      var x = Math.round((index / Math.max(1, arr.length - 1)) * 180);
      var y = Math.round(46 - ((value - min) / span) * 40);
      return (index ? "L" : "M") + x + " " + y;
    }).join(" ");
  }

  function renderEmptyState(options) {
    var config = options && typeof options === "object" ? options : {};
    var el = config.el || {};
    if (el.centerEmpty) el.centerEmpty.classList.remove("hidden");
    if (el.centerSelected) el.centerSelected.classList.add("hidden");
    if (el.rightEmpty) el.rightEmpty.classList.remove("hidden");
    if (el.rightContent) el.rightContent.classList.add("hidden");
    if (el.metricAccuracy) el.metricAccuracy.textContent = "+0.0%";
    if (el.metricTier) el.metricTier.textContent = "Tier 2";
    if (el.metricSubline) el.metricSubline.textContent = "Accuracy +4.2% over last 3 sessions";
    if (el.lastSessionTitle) el.lastSessionTitle.textContent = "No recent quick check yet";
    if (el.lastSessionMeta) el.lastSessionMeta.textContent = "Run a 90-second Word Quest quick check to generate signals.";
  }

  function renderSelectedState(options) {
    var config = options && typeof options === "object" ? options : {};
    var el = config.el || {};
    var summary = config.summary || {};
    var plan = config.plan || null;
    var appendStudentParam = typeof config.appendStudentParam === "function" ? config.appendStudentParam : function (value) { return value; };
    if (el.centerEmpty) el.centerEmpty.classList.add("hidden");
    if (el.centerSelected) el.centerSelected.classList.remove("hidden");
    if (el.rightEmpty) el.rightEmpty.classList.add("hidden");
    if (el.rightContent) el.rightContent.classList.remove("hidden");

    var student = summary.student || {};
    var spark = Array.isArray(summary.last7Sparkline) ? summary.last7Sparkline : [];
    var tail = spark.slice(-3);
    var delta = tail.length > 1 ? (tail[tail.length - 1] - tail[0]) : 0;
    var tierLabel = summary.risk === "risk" ? "Tier 3" : "Tier 2";

    if (el.studentLabel) el.studentLabel.textContent = String(student.name || "") + " · " + String(student.id || "");
    if (el.focusTitle) el.focusTitle.textContent = tierLabel + " - Strategic Reinforcement Recommended";
    if (el.recoLine) el.recoLine.textContent = summary.nextMove && summary.nextMove.line ? String(summary.nextMove.line) : "";
    if (el.last7Summary) el.last7Summary.textContent = "Last 7 sessions · " + spark.join(" / ");
    if (el.sparkline) {
      el.sparkline.innerHTML = '<path d="' + buildSparkPath(spark) + '" fill="none" stroke="var(--accent)" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"></path>';
    }
    if (el.metricAccuracy) el.metricAccuracy.textContent = (delta >= 0 ? "+" : "") + delta.toFixed(1) + "%";
    if (el.metricTier) el.metricTier.textContent = tierLabel;
    if (el.metricSubline) el.metricSubline.textContent = "Accuracy " + (delta >= 0 ? "+" : "") + delta.toFixed(1) + "% over last 3 sessions";
    if (el.nextTierBadge) {
      el.nextTierBadge.textContent = tierLabel;
      el.nextTierBadge.className = "tier-badge " + (tierLabel === "Tier 3" ? "tier-3" : "tier-2");
    }
    if (el.quickCheck) {
      el.quickCheck.onclick = function () {
        var launch = plan && plan.plans && plan.plans.tenMin && plan.plans.tenMin[0] && plan.plans.tenMin[0].launch;
        var href = launch && launch.url ? launch.url : "word-quest.html?quick=1";
        window.location.href = appendStudentParam("./" + href.replace(/^\.\//, ""));
      };
    }
    if (el.startIntervention) {
      el.startIntervention.onclick = function () {
        el.startIntervention.classList.add("td-btn-once");
        setTimeout(function () { el.startIntervention.classList.remove("td-btn-once"); }, 260);
        var launch = plan && plan.plans && plan.plans.thirtyMin && plan.plans.thirtyMin[0] && plan.plans.thirtyMin[0].launch;
        var href = launch && launch.url ? launch.url : "word-quest.html?quick=1";
        window.location.href = appendStudentParam("./" + href.replace(/^\.\//, ""));
      };
    }

    return {
      delta: delta,
      tierLabel: tierLabel
    };
  }

  return {
    buildSparkPath: buildSparkPath,
    renderEmptyState: renderEmptyState,
    renderSelectedState: renderSelectedState
  };
});
