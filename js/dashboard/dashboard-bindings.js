(function dashboardBindingsModule() {
  "use strict";

  function create(options) {
    var config = options && typeof options === "object" ? options : {};
    var state = config.state || {};
    var el = config.el || {};
    var hooks = config.hooks || {};
    var deps = config.deps || {};

    var modalController = deps.modalController || null;
    var meetingController = deps.meetingController || null;
    var supportController = deps.supportController || null;
    var Evidence = deps.Evidence || null;
    var FidelityEngine = deps.FidelityEngine || null;
    var SupportStore = deps.SupportStore || null;

    function run(name) {
      if (typeof hooks[name] !== "function") return;
      return hooks[name].apply(null, Array.prototype.slice.call(arguments, 1));
    }

    function bindAccommodationQuickLog(button, supportType, successLine) {
      if (!button) return;
      button.addEventListener("click", function () {
        if (!FidelityEngine || typeof FidelityEngine.logAccommodationSupport !== "function") return;
        var sid = state.selectedId || "demo";
        FidelityEngine.logAccommodationSupport({
          studentId: sid,
          supportType: supportType
        });
        run("updateAccommodationButtons", sid);
        run("setCoachLine", successLine);
      });
    }

    function bindEvents() {
      if (modalController) {
        modalController.register("share", el.shareModal);
        modalController.register("meeting", el.meetingModal, function () { run("stopMeetingRecognition"); });
        modalController.register("sas-library", el.sasLibraryModal);
        modalController.bindBackdropClose("share");
        modalController.bindBackdropClose("meeting");
        modalController.bindBackdropClose("sas-library");
        modalController.closeOnEscape();
      }

      if (el.search) {
        el.search.addEventListener("input", function () { run("filterCaseload", el.search.value || ""); });
      }
      if (el.importExport) el.importExport.addEventListener("click", function () { run("handleImportExport"); });
      if (el.addStudent) el.addStudent.addEventListener("click", function () { run("addStudentQuick"); });
      if (el.settings) {
        el.settings.addEventListener("click", function () {
          var panel = document.getElementById("settings-panel");
          if (panel) {
            panel.classList.toggle("hidden");
            run("setCoachLine", panel.classList.contains("hidden") ? "Settings closed." : "Settings opened.");
            return;
          }
          if (window.CSBuildBadge && typeof window.CSBuildBadge.open === "function") {
            window.CSBuildBadge.open();
            run("setCoachLine", "Build controls opened. Use Force update for stale clients.");
            return;
          }
          run("setCoachLine", "Build controls unavailable. Reload this page.");
        });
      }

      if (el.homeBtn) {
        el.homeBtn.addEventListener("click", function () {
          window.location.href = run("appendStudentParam", "./index.html");
        });
      }
      if (el.brandHome) {
        el.brandHome.setAttribute("href", run("appendStudentParam", "./index.html"));
      }

      if (el.activitySelect) {
        el.activitySelect.addEventListener("change", function () {
          var target = String(el.activitySelect.value || "").trim();
          if (!target) return;
          window.location.href = run("appendStudentParam", "./" + target);
        });
      }

      if (Array.isArray(el.planTabs)) {
        el.planTabs.forEach(function (button) {
          button.addEventListener("click", function () {
            state.activePlanTab = String(button.getAttribute("data-plan-tab") || "ten");
            run("renderTodayPlan", state.plan);
          });
        });
      }

      if (Array.isArray(el.noteTabs)) {
        el.noteTabs.forEach(function (button) {
          button.addEventListener("click", function () {
            state.activeNoteTab = String(button.getAttribute("data-note-tab") || "teacher");
            if (!state.selectedId || !Evidence || typeof Evidence.getStudentSummary !== "function") return;
            var summary = Evidence.getStudentSummary(state.selectedId);
            run("renderProgressNote", state.plan, summary.student);
          });
        });
      }

      if (el.copyNote) {
        el.copyNote.addEventListener("click", function () {
          if (!el.noteText) return;
          var text = String(el.noteText.textContent || "").trim();
          if (!text) return;
          if (navigator.clipboard) navigator.clipboard.writeText(text).catch(function () {});
          run("setCoachLine", "Copied progress note.");
        });
      }

      if (meetingController && typeof meetingController.bindEvents === "function") {
        meetingController.bindEvents();
      }
      if (supportController && typeof supportController.bindEvents === "function") {
        supportController.bindEvents();
      }

      if (Array.isArray(el.supportTabs)) {
        el.supportTabs.forEach(function (tab) {
          tab.addEventListener("click", function () {
            state.activeSupportTab = String(tab.getAttribute("data-support-tab") || "snapshot");
            run("renderSupportHub", state.selectedId);
          });
        });
      }

      if (el.showAlignment) {
        el.showAlignment.addEventListener("change", function () {
          run("renderInstructionalSequencer", state.selectedId);
        });
      }

      if (el.openStudentDrawer) {
        el.openStudentDrawer.addEventListener("click", function () {
          if (!state.selectedId || !el.drawer) return;
          el.drawer.classList.remove("hidden");
          run("renderDrawer", state.selectedId);
        });
      }
      if (el.drawerClose) {
        el.drawerClose.addEventListener("click", function () {
          if (el.drawer) el.drawer.classList.add("hidden");
        });
      }
      if (Array.isArray(el.drawerTabs)) {
        el.drawerTabs.forEach(function (tab) {
          tab.addEventListener("click", function () {
            state.activeDrawerTab = String(tab.getAttribute("data-drawer-tab") || "snapshot");
            run("renderDrawer", state.selectedId);
          });
        });
      }
      if (el.meetingWorkspaceBtn) {
        el.meetingWorkspaceBtn.addEventListener("click", function () {
          if (!state.selectedId) return;
          run("openMeetingModal");
          run("setDashboardMode", "reports");
        });
      }
      if (el.focusViewDetailsBtn) {
        el.focusViewDetailsBtn.addEventListener("click", function () {
          run("setDashboardMode", "advanced");
        });
      }
      if (el.modeDaily) el.modeDaily.addEventListener("click", function () { run("setDashboardMode", "daily"); });
      if (el.modeAdvanced) el.modeAdvanced.addEventListener("click", function () { run("setDashboardMode", "advanced"); });
      if (el.modeReports) {
        el.modeReports.addEventListener("click", function () {
          run("setDashboardMode", "reports");
          if (state.selectedId) run("openMeetingModal");
        });
      }
      if (el.modeClassroom) el.modeClassroom.addEventListener("click", function () { run("setDashboardMode", "classroom"); });

      bindAccommodationQuickLog(el.accExtendedTimeBtn, "extended_time", "Extended time log captured.");
      bindAccommodationQuickLog(el.accVisualSupportsBtn, "visual_supports", "Visual supports log captured.");
      bindAccommodationQuickLog(el.accCheckInsBtn, "check_ins", "Check-ins log captured.");
      bindAccommodationQuickLog(el.accTaskChunkingBtn, "task_chunking", "Task chunking log captured.");

      if (el.tier1PackBtn) {
        el.tier1PackBtn.addEventListener("click", function () {
          if (!state.selectedId || !SupportStore) return;
          var concerns = window.prompt("Concern area(s) comma-separated", "Reading, Writing");
          var duration = window.prompt("Intervention duration", "6 weeks");
          var frequency = window.prompt("Frequency", "3x/week");
          var notes = window.prompt("Tier 1 notes", "");
          var packet = SupportStore.buildTier1EvidencePack(state.selectedId, {
            domains: String(concerns || "Reading").split(",").map(function (s) { return s.trim(); }).filter(Boolean),
            duration: duration || "6 weeks",
            frequency: frequency || "3x/week",
            notes: notes || ""
          });
          run("download", "tier1-evidence-pack-" + state.selectedId + ".html", packet.html, "text/html");
          if (navigator.clipboard) {
            navigator.clipboard.writeText(packet.text || ("Tier 1 Evidence Pack ready for " + state.selectedId + ".")).catch(function () {});
          }
          run("setCoachLine", "Tier 1 Evidence Pack exported.");
        });
      }

      if (Array.isArray(el.quickLaunchButtons)) {
        el.quickLaunchButtons.forEach(function (button) {
          button.addEventListener("click", function () {
            var target = String(button.getAttribute("data-quick") || "").trim();
            if (!target) return;
            run("recordLastActivity", run("currentStudentParam"), target);
            window.location.href = run("appendStudentParam", "./" + target + ".html");
          });
        });
      }

      if (el.todayRefresh) {
        el.todayRefresh.addEventListener("click", function () {
          state.todayPlan = run("buildTodayPlan");
          run("renderTodayEngine", state.todayPlan);
          run("updateAuditMarkers");
          run("setCoachLine", "Today plan refreshed.");
        });
      }

      if (el.priorityReview) {
        el.priorityReview.addEventListener("click", function () {
          if (el.todayRoot && typeof el.todayRoot.scrollIntoView === "function") {
            el.todayRoot.scrollIntoView({ behavior: "smooth", block: "start" });
          }
        });
      }

      if (el.viewAllStudents) {
        el.viewAllStudents.addEventListener("click", function () {
          if (el.list && typeof el.list.scrollIntoView === "function") {
            el.list.scrollIntoView({ behavior: "smooth", block: "start" });
          }
        });
      }

      if (el.todayGroupOpen) {
        el.todayGroupOpen.addEventListener("click", function () {
          if (el.todayGroupBuild) el.todayGroupBuild.disabled = false;
          if (el.groupPanel) el.groupPanel.open = true;
          run("renderFlexGroups", state.todayPlan && state.todayPlan.students ? state.todayPlan.students : []);
          run("setCoachLine", "Group selection ready. Pick 2-4 students, then build the shared plan.");
        });
      }

      if (el.todayGroupBuild) {
        el.todayGroupBuild.addEventListener("click", function () {
          run("renderFlexGroups", state.todayPlan && state.todayPlan.students ? state.todayPlan.students : []);
          run("setCoachLine", "Group plan v1 generated from shared skills and cadence signals.");
        });
      }

      if (el.numGradeSelect) {
        el.numGradeSelect.addEventListener("change", function () {
          if (el.numUnitSelect) el.numUnitSelect.value = "";
          if (el.numLessonSelect) el.numLessonSelect.value = "";
          run("syncNumeracyCurriculumSelectors");
          run("refreshNumeracyPanelFromSelection");
        });
      }
      if (el.numUnitSelect) {
        el.numUnitSelect.addEventListener("change", function () {
          if (el.numLessonSelect) el.numLessonSelect.value = "";
          run("syncNumeracyCurriculumSelectors");
          run("refreshNumeracyPanelFromSelection");
        });
      }
      if (el.numLessonSelect) {
        el.numLessonSelect.addEventListener("change", function () {
          run("renderNumeracyAlignmentLine");
          run("refreshNumeracyPanelFromSelection");
        });
      }
      if (el.numeracyPracticeMode) {
        el.numeracyPracticeMode.addEventListener("change", function () {
          run("refreshNumeracyPanelFromSelection");
        });
      }

      if (Array.isArray(el.emptyActions)) {
        el.emptyActions.forEach(function (button) {
          button.addEventListener("click", function () {
            var action = button.getAttribute("data-empty-action");
            if (action === "add") return run("addStudentQuick");
            if (action === "import") return run("handleImportExport");
            if (action === "demo") {
              run("ensureDemoCaseload");
              run("refreshCaseload");
            }
          });
        });
      }
    }

    return {
      bindEvents: bindEvents
    };
  }

  window.CSDashboardBindings = {
    create: create
  };
})();
