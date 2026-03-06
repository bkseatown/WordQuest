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
    var TeacherSupportService = deps.TeacherSupportService || null;
    var WorkspaceDrawerContent = deps.WorkspaceDrawerContent || null;

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

    function getStudentSummary(studentId) {
      if (TeacherSupportService && typeof TeacherSupportService.getStudentSummary === "function") {
        return TeacherSupportService.getStudentSummary(studentId, {
          Evidence: Evidence,
          SupportStore: SupportStore,
          TeacherIntelligence: deps.TeacherIntelligence || null,
          TeacherSelectors: deps.TeacherSelectors || null
        });
      }
      return Evidence && typeof Evidence.getStudentSummary === "function" ? Evidence.getStudentSummary(studentId) : null;
    }

    function getSupportStudent(studentId) {
      if (TeacherSupportService && typeof TeacherSupportService.getSupportStudent === "function") {
        return TeacherSupportService.getSupportStudent(studentId, { SupportStore: SupportStore });
      }
      return SupportStore && typeof SupportStore.getStudent === "function"
        ? SupportStore.getStudent(studentId)
        : { goals: [], interventions: [] };
    }

    function getExecutiveFunction(studentId) {
      if (TeacherSupportService && typeof TeacherSupportService.getExecutiveFunction === "function") {
        return TeacherSupportService.getExecutiveFunction(studentId, { SupportStore: SupportStore });
      }
      return SupportStore && typeof SupportStore.getExecutiveFunction === "function"
        ? SupportStore.getExecutiveFunction(studentId)
        : { upcomingTasks: [] };
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
      var summary = getStudentSummary(studentId);
      if (!summary) return;
      var support = getSupportStudent(studentId);
      el.drawerTitle.textContent = String(summary.student.name || "Student") + " • " + String(summary.student.id || studentId);
      if (state.activeDrawerTab === "snapshot") {
        var efRow = getExecutiveFunction(studentId);
        el.drawerBody.innerHTML = WorkspaceDrawerContent && typeof WorkspaceDrawerContent.buildSnapshot === "function"
          ? WorkspaceDrawerContent.buildSnapshot({
              summary: summary,
              executive: efRow,
              studentId: studentId,
              escAttr: escAttr,
              renderInstitutionalAnchorPanel: renderInstitutionalAnchorPanel
            })
          : "";
        bindInstitutionalAnchorActions(studentId, el.drawerBody, true);
      } else if (state.activeDrawerTab === "goals") {
        el.drawerBody.innerHTML = WorkspaceDrawerContent && typeof WorkspaceDrawerContent.buildGoals === "function"
          ? WorkspaceDrawerContent.buildGoals({ support: support })
          : "";
      } else if (state.activeDrawerTab === "interventions") {
        el.drawerBody.innerHTML = WorkspaceDrawerContent && typeof WorkspaceDrawerContent.buildInterventions === "function"
          ? WorkspaceDrawerContent.buildInterventions({
              support: support,
              formatTier1Intervention: formatTier1Intervention
            })
          : "";
      } else if (state.activeDrawerTab === "evidence") {
        el.drawerBody.innerHTML = WorkspaceDrawerContent && typeof WorkspaceDrawerContent.buildEvidence === "function"
          ? WorkspaceDrawerContent.buildEvidence({ summary: summary })
          : "";
      } else {
        el.drawerBody.innerHTML = WorkspaceDrawerContent && typeof WorkspaceDrawerContent.buildShare === "function"
          ? WorkspaceDrawerContent.buildShare()
          : "";
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
            var tier1 = (getSupportStudent(studentId).interventions || []).find(function (row) { return Number(row.tier || 1) === 1; });
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
