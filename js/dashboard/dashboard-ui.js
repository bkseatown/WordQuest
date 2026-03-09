(function dashboardUiModule() {
  "use strict";

  function applyMode(mode, el) {
    var next = String(mode || "daily").toLowerCase();
    document.body.classList.remove("td-daily-mode", "td-advanced-mode", "td-reports-mode", "td-classroom-mode");
    if (next === "advanced") document.body.classList.add("td-advanced-mode");
    else if (next === "reports") document.body.classList.add("td-reports-mode");
    else if (next === "classroom") document.body.classList.add("td-classroom-mode");
    else document.body.classList.add("td-daily-mode");

    if (el && el.modeDaily) el.modeDaily.classList.toggle("is-active", next === "daily");
    if (el && el.modeAdvanced) el.modeAdvanced.classList.toggle("is-active", next === "advanced");
    if (el && el.modeReports) el.modeReports.classList.toggle("is-active", next === "reports");
    if (el && el.modeClassroom) el.modeClassroom.classList.toggle("is-active", next === "classroom");
    if (el && el.modeDaily) el.modeDaily.setAttribute("aria-pressed", next === "daily" ? "true" : "false");
    if (el && el.modeAdvanced) el.modeAdvanced.setAttribute("aria-pressed", next === "advanced" ? "true" : "false");
    if (el && el.modeReports) el.modeReports.setAttribute("aria-pressed", next === "reports" ? "true" : "false");
    if (el && el.modeClassroom) el.modeClassroom.setAttribute("aria-pressed", next === "classroom" ? "true" : "false");
    return next;
  }

  window.CSDashboardUI = { applyMode: applyMode };
})();
