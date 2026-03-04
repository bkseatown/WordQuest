(function dashboardDrawerModule() {
  "use strict";

  function create(options) {
    var config = options && typeof options === "object" ? options : {};
    var state = config.state || {};
    var el = config.el || {};
    var hooks = config.hooks || {};
    var deps = config.deps || {};

    var Evidence = deps.Evidence || null;
    var SupportStore = deps.SupportStore || null;

    function escAttr(value) {
      if (typeof hooks.escAttr === "function") return hooks.escAttr(value);
      return String(value == null ? "" : value)
        .replace(/&/g, "&amp;")
        .replace(/\"/g, "&quot;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;");
    }

    function renderInstitutionalAnchorPanel(studentId, compact) {
      if (typeof hooks.renderInstitutionalAnchorPanel === "function") {
        return hooks.renderInstitutionalAnchorPanel(studentId, compact);
      }
      return "";
    }

    function bindInstitutionalAnchorActions(studentId, rootEl, refreshDrawer) {
      if (typeof hooks.bindInstitutionalAnchorActions === "function") {
        hooks.bindInstitutionalAnchorActions(studentId, rootEl, refreshDrawer);
      }
    }

    function formatTier1Intervention(intervention) {
      if (typeof hooks.formatTier1Intervention === "function") {
        return hooks.formatTier1Intervention(intervention);
      }
      var row = intervention && typeof intervention === "object" ? intervention : {};
      return {
        readinessLabel: "Gathering data",
        datapointsCount: Array.isArray(row.datapoints) ? row.datapoints.length : 0
      };
    }

    function openShareModal(studentId) {
      if (typeof hooks.openShareModal === "function") hooks.openShareModal(studentId);
    }

    function appendStudentParam(url, overrideStudentId) {
      if (typeof hooks.appendStudentParam === "function") return hooks.appendStudentParam(url, overrideStudentId);
      return String(url || "");
    }

    function download(name, contents, mime) {
      if (typeof hooks.download === "function") hooks.download(name, contents, mime);
    }

    function setCoachLine(text) {
      if (typeof hooks.setCoachLine === "function") hooks.setCoachLine(text);
    }

    function renderSupportHub(studentId) {
      if (typeof hooks.renderSupportHub === "function") hooks.renderSupportHub(studentId);
    }

    function renderDrawer(studentId) {
      if (!el.drawerBody || !el.drawerTitle) return;
      if (!studentId) {
        el.drawerTitle.textContent = "Student Drawer";
        el.drawerBody.innerHTML = '<div class="td-support-item"><p>Select a student to open the drawer.</p></div>';
        return;
      }
      if (!Evidence || typeof Evidence.getStudentSummary !== "function") return;
      var summary = Evidence.getStudentSummary(studentId);
      var support = SupportStore && typeof SupportStore.getStudent === "function"
        ? SupportStore.getStudent(studentId)
        : { goals: [], interventions: [] };
      el.drawerTitle.textContent = String(summary.student.name || "Student") + " • " + String(summary.student.id || studentId);
      if (state.activeDrawerTab === "snapshot") {
        var drawerAnchorPanel = renderInstitutionalAnchorPanel(studentId, true);
        var efRow = SupportStore && typeof SupportStore.getExecutiveFunction === "function"
          ? SupportStore.getExecutiveFunction(studentId)
          : { upcomingTasks: [] };
        var upcomingTasks = Array.isArray(efRow.upcomingTasks) ? efRow.upcomingTasks.slice(0, 3) : [];
        var assignmentSnapshot = '<div class="td-support-item"><h4>Upcoming Tasks</h4>' + (
          upcomingTasks.length
            ? upcomingTasks.map(function (task) {
                return '<p>' + escAttr(task.name || "Task") + ' • ' + escAttr(task.dueDate || "No due date") + ' • ' + escAttr(task.status || "Not Started") + '</p>';
              }).join("")
            : "<p>No upcoming tasks yet.</p>"
        ) + "</div>";
        el.drawerBody.innerHTML = [
          '<div class="td-support-item"><h4>Last 7 Days Minutes</h4><p>Derived from recent sessions and quick checks.</p></div>',
          '<div class="td-support-item"><h4>Top Signals</h4><p>' + (summary.evidenceChips || []).slice(0, 5).map(function (c) { return c.label + " " + c.value; }).join(" • ") + '</p></div>',
          '<div class="td-support-item"><h4>Next Best Activity</h4><p>' + summary.nextMove.line + '</p><button class="td-top-btn" type="button" data-drawer-launch="' + summary.nextMove.quickHref + '">Launch</button></div>',
          assignmentSnapshot,
          drawerAnchorPanel
        ].join("");
        bindInstitutionalAnchorActions(studentId, el.drawerBody, true);
      } else if (state.activeDrawerTab === "goals") {
        var goalsList = (support.goals || []).length
          ? support.goals.slice(0, 6).map(function (goal) {
              return '<div class="td-support-item"><h4>' + (goal.skill || goal.domain || "Goal") + '</h4><p>' + (goal.baseline || "--") + ' → ' + (goal.target || "--") + ' • updated ' + (goal.updatedAt || goal.createdAt || "") + '</p></div>';
            }).join("")
          : '<div class="td-support-item"><p>No goals yet. Use Meeting Notes → Convert to Goals.</p></div>';
        el.drawerBody.innerHTML = '<div class="td-support-item"><h4>SMART Goal Builder</h4><p>Quick add one baseline-to-target goal from today\'s discussion.</p><button class="td-top-btn" type="button" data-drawer-action="add-goal">Add Goal</button></div>' + goalsList;
      } else if (state.activeDrawerTab === "interventions") {
        var interventionList = (support.interventions || []).length
          ? support.interventions.slice(0, 8).map(function (intervention) {
              var view = formatTier1Intervention(intervention);
              return '<div class="td-support-item"><h4>Tier ' + (intervention.tier || 1) + ' • ' + (intervention.domain || "") + '</h4><p>' + (intervention.strategy || intervention.focus || "") + ' • ' + (intervention.frequency || "") + ' • ' + (intervention.durationMinutes || intervention.durationMin || "--") + ' min</p><div class="td-plan-tabs"><span class="td-chip">' + view.readinessLabel + '</span><span class="td-chip">Datapoints ' + view.datapointsCount + '</span></div></div>';
            }).join("")
          : '<div class="td-support-item"><p>No intervention entries yet.</p></div>';
        el.drawerBody.innerHTML = '<div class="td-support-item"><h4>Tier 1/2/3 Quick Log</h4><p>3-click entry for what/when/how long.</p><div class="td-plan-tabs"><button class="td-top-btn" type="button" data-drawer-action="start-tier1">Start Tier 1 Plan</button><button class="td-top-btn" type="button" data-drawer-action="add-intervention">Quick Log</button><button class="td-top-btn" type="button" data-drawer-action="add-datapoint">Log Datapoint</button></div></div>' + interventionList;
      } else if (state.activeDrawerTab === "evidence") {
        el.drawerBody.innerHTML = '<div class="td-support-item"><h4>Evidence (filterable)</h4><p>' + (summary.evidenceChips || []).map(function (chip) { return chip.label + ": " + chip.value; }).join(" • ") + '</p></div>';
      } else {
        el.drawerBody.innerHTML = [
          '<div class="td-support-item"><h4>Share</h4><p>Generate meeting-ready outputs in one click.</p></div>',
          '<div class="td-support-item"><button id="td-drawer-share-now" class="td-top-btn" type="button">Open Share Summary</button></div>',
          '<div class="td-support-item"><button class="td-top-btn" type="button" data-drawer-action="meeting-summary">Meeting Summary (printable)</button></div>',
          '<div class="td-support-item"><button class="td-top-btn" type="button" data-drawer-action="tier1-pack">Tier 1 Evidence Pack</button></div>',
          '<div class="td-support-item"><button class="td-top-btn" type="button" data-drawer-action="mdt-export">Export for MDT (JSON + CSV)</button></div>'
        ].join("");
      }
      Array.prototype.forEach.call(el.drawerBody.querySelectorAll("[data-drawer-launch]"), function (button) {
        button.addEventListener("click", function () {
          var href = String(button.getAttribute("data-drawer-launch") || "word-quest.html?quick=1");
          window.location.href = appendStudentParam("./" + href.replace(/^\.\//, ""));
        });
      });
      var shareBtn = document.getElementById("td-drawer-share-now");
      if (shareBtn) {
        shareBtn.addEventListener("click", function () { openShareModal(studentId); });
      }
      Array.prototype.forEach.call(el.drawerBody.querySelectorAll("[data-drawer-action]"), function (button) {
        button.addEventListener("click", function () {
          var action = String(button.getAttribute("data-drawer-action") || "");
          if (!SupportStore) return;
          if (action === "add-goal") {
            SupportStore.addGoal(studentId, {
              domain: "literacy",
              skill: "Decoding strategy",
              baseline: "Current classroom baseline",
              target: "Target growth in 6 weeks",
              metric: "Session evidence + class sample",
              method: "Weekly check",
              schedule: "3x/week",
              reviewEveryDays: 14
            });
            renderDrawer(studentId);
            return;
          }
          if (action === "add-intervention") {
            SupportStore.addIntervention(studentId, {
              tier: 1,
              domain: "Reading",
              focus: "Decoding",
              startAt: new Date().toISOString(),
              frequency: "3x/week",
              durationMin: 20,
              strategy: "Phonics routine + guided decoding",
              fidelityChecklist: ["Modeled", "Prompted", "Checked for transfer"]
            });
            renderDrawer(studentId);
            return;
          }
          if (action === "start-tier1") {
            if (typeof SupportStore.startTier1Plan === "function") {
              SupportStore.startTier1Plan(studentId, {
                domain: "Reading",
                strategy: "Tier 1 classroom support",
                frequency: "3x/week",
                durationMinutes: 20,
                progressMetric: "MAP"
              });
              setCoachLine("Tier 1 plan started.");
              renderDrawer(studentId);
              renderSupportHub(studentId);
            }
            return;
          }
          if (action === "add-datapoint") {
            var tier1 = (SupportStore.getStudent(studentId).interventions || []).find(function (row) { return Number(row.tier || 1) === 1; });
            if (!tier1 || typeof SupportStore.addInterventionDatapoint !== "function") return;
            var value = Number(window.prompt("Datapoint value", "70") || 0);
            var note = window.prompt("Datapoint note", "") || "";
            SupportStore.addInterventionDatapoint(studentId, tier1.id, { date: new Date().toISOString().slice(0, 10), value: value, note: note });
            setCoachLine("Datapoint logged.");
            renderDrawer(studentId);
            renderSupportHub(studentId);
            return;
          }
          if (action === "meeting-summary") {
            var meeting = SupportStore.buildMeetingSummary(studentId, {});
            download("meeting-summary-" + studentId + ".html", meeting.html, "text/html");
            if (navigator.clipboard) navigator.clipboard.writeText(meeting.text).catch(function () {});
            setCoachLine("Meeting Summary exported + copied.");
            return;
          }
          if (action === "tier1-pack") {
            var pack = SupportStore.buildTier1EvidencePack(studentId, { domains: ["Reading", "Writing"] });
            download("tier1-evidence-pack-" + studentId + ".html", pack.html, "text/html");
            if (navigator.clipboard) navigator.clipboard.writeText(pack.text).catch(function () {});
            setCoachLine("Tier 1 Evidence Pack exported + copied.");
            return;
          }
          if (action === "mdt-export") {
            if (typeof SupportStore.buildMdtExport !== "function") return;
            var bundle = SupportStore.buildMdtExport(studentId, {});
            download("mdt-export-" + studentId + ".json", JSON.stringify(bundle.json, null, 2), "application/json");
            download("mdt-export-" + studentId + ".csv", bundle.csv, "text/csv");
            if (navigator.clipboard) navigator.clipboard.writeText(bundle.csv).catch(function () {});
            setCoachLine("MDT export generated (JSON + CSV).");
          }
        });
      });
    }

    return {
      renderDrawer: renderDrawer
    };
  }

  window.CSDashboardDrawer = {
    create: create
  };
})();
