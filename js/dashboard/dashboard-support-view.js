(function dashboardSupportViewModule() {
  "use strict";

  function create(options) {
    var config = options && typeof options === "object" ? options : {};
    var state = config.state || {};
    var el = config.el || {};
    var hooks = config.hooks || {};
    var deps = config.deps || {};

    var SupportStore = deps.SupportStore || null;
    var Evidence = deps.Evidence || null;
    var InterventionPlanner = deps.InterventionPlanner || null;
    var SASLibrary = deps.SASLibrary || null;

    function setCoachLine(text) {
      if (typeof hooks.setCoachLine === "function") hooks.setCoachLine(text);
    }

    function rerenderSupportHub(studentId) {
      if (typeof hooks.rerenderSupportHub === "function") {
        hooks.rerenderSupportHub(studentId);
        return;
      }
      renderSupportHub(studentId);
    }

    function rerenderDrawer(studentId) {
      if (typeof hooks.rerenderDrawer === "function") hooks.rerenderDrawer(studentId);
    }

    function supportsPanelMetric(metric) {
      var value = String(metric || "").trim();
      return value || "MAP";
    }

    function tier1ReadyLabel(readiness) {
      if (!readiness) return "Gathering data";
      return readiness.ready
        ? "Ready to Refer"
        : ("Collecting evidence (" + readiness.datapoints + "/" + readiness.thresholds.minDatapoints + ")");
    }

    function interventionSparkline(datapoints) {
      var points = (Array.isArray(datapoints) ? datapoints : [])
        .slice(0, 6)
        .map(function (point) { return Number(point.value || 0); })
        .reverse();
      if (!points.length) return "M0,12 L72,12";
      if (typeof hooks.buildTinySpark === "function") return hooks.buildTinySpark(points);
      return "M0,12 L72,12";
    }

    function formatTier1Intervention(intervention) {
      var row = intervention && typeof intervention === "object" ? intervention : {};
      var readiness = SupportStore && typeof SupportStore.getReferralReadiness === "function"
        ? SupportStore.getReferralReadiness(row)
        : null;
      var fidelity = Array.isArray(row.fidelityChecklist) ? row.fidelityChecklist : [];
      var checksDone = fidelity.filter(function (item) { return !!(item && (item.done || item === true)); }).length;
      var metric = supportsPanelMetric(row.progressMetric);
      var points = Array.isArray(row.datapoints) ? row.datapoints : [];
      return {
        id: String(row.id || ""),
        domain: String(row.domain || "Reading"),
        strategy: String(row.strategy || row.focus || "Tier 1 support"),
        frequency: String(row.frequency || "3x/week"),
        duration: Number(row.durationMinutes || row.durationMin || 20),
        metric: metric,
        datapoints: points,
        datapointsCount: points.length,
        latestPoint: points[0] || null,
        sparkPath: interventionSparkline(points),
        readiness: readiness,
        readinessLabel: tier1ReadyLabel(readiness),
        checksDone: checksDone,
        checksTotal: fidelity.length,
        fidelity: fidelity
      };
    }

    function renderAccommodationRows(accommodations) {
      var rows = Array.isArray(accommodations) ? accommodations.slice() : [];
      if (!rows.length) return '<div class="td-support-item"><p>No accommodation cards yet.</p></div>';
      var sorted = rows.sort(function (a, b) {
        return Number(b.priority || 0) - Number(a.priority || 0);
      });
      var topFive = sorted.slice(0, 5);
      var classRows = topFive.filter(function (a) { return String(a.whenToUse || "").toLowerCase().indexOf("assessment") === -1; });
      var assessRows = topFive.filter(function (a) { return String(a.whenToUse || "").toLowerCase().indexOf("assessment") !== -1; });
      function section(title, list, ctx) {
        if (!list.length) return "";
        return [
          '<div class="td-support-item"><h4>' + title + '</h4>',
          list.map(function (a) {
            var lastReviewed = a.lastReviewed ? String(a.lastReviewed).slice(0, 10) : "—";
            return '<div class="td-support-line"><strong>' + (a.title || "Accommodation") + '</strong><p>' + (a.teacherText || a.whenToUse || "Actionable support step.") + '</p><div class="td-plan-tabs"><span class="td-chip">Reviewed ' + lastReviewed + '</span><button class="td-top-btn" type="button" data-accommodation-toggle="' + String(a.id || "") + '" data-accommodation-context="' + ctx + '">I implemented this today</button></div></div>';
          }).join(""),
          "</div>"
        ].join("");
      }
      return section("During class", classRows, "class") + section("During assessment", assessRows, "assessment");
    }

    function renderSuggestedGoals(studentId) {
      var target = document.getElementById("td-suggested-goals");
      if (!target || !state.sasPack || !SASLibrary) return;
      var domainInput = window.prompt("Goal domain (literacy/math/writing/behavior/executive)", "literacy");
      if (!domainInput) return;
      var baselineInput = window.prompt("Baseline note (short)", "Current baseline from classwork and quick checks");
      if (baselineInput == null) return;
      var gradeBand = typeof hooks.getSelectedStudentGradeBand === "function"
        ? hooks.getSelectedStudentGradeBand()
        : "";
      var suggested = SASLibrary.suggestGoals(state.sasPack, {
        domain: domainInput,
        gradeBand: gradeBand,
        baseline: baselineInput
      });
      if (!suggested.length) {
        target.innerHTML = '<p class="td-reco-line">No goal templates matched that domain/grade. Try broader domain.</p>';
        return;
      }
      target.innerHTML = suggested.map(function (goal) {
        return [
          '<article class="td-suggest-goal">',
          '<strong>' + (goal.skill || goal.domain || "Goal") + '</strong>',
          '<p>' + (goal.goal_template_smart || "") + '</p>',
          "</article>"
        ].join("");
      }).join("");
      if (SupportStore && studentId && typeof SupportStore.addGoal === "function") {
        suggested.slice(0, 2).forEach(function (goal) {
          SupportStore.addGoal(studentId, {
            domain: goal.domain || domainInput,
            skill: goal.skill || "SAS aligned goal",
            baseline: baselineInput || (goal.baseline_prompt || "Baseline"),
            target: (goal.goal_template_smart || "").slice(0, 180),
            metric: goal.progress_monitoring_method || "Progress monitoring method",
            method: "SAS goal-bank suggestion",
            schedule: "2-3x/week",
            reviewEveryDays: 14,
            notes: "Auto-suggested from SAS Alignment Pack"
          });
        });
      }
      setCoachLine("Suggested SAS goal templates ready.");
    }

    function renderGeneratedPlanner(studentId) {
      var target = document.getElementById("td-generated-plan");
      if (!target) return;
      var plan = state.generatedPlanner;
      if (!plan) {
        target.innerHTML = '<p class="td-reco-line">Create Plan to draft SMART goals and recommended activities.</p>';
        return;
      }
      target.innerHTML = [
        '<div class="td-support-item">',
        "<h4>Plan Summary</h4>",
        '<p>Frequency: ' + (plan.frequency || "3x/week") + ' • Progress cadence: ' + (plan.progressCadence || "Weekly mini-probe") + "</p>",
        "</div>",
        '<div class="td-support-item"><h4>SMART Goals</h4>' + (plan.goals || []).map(function (goal) {
          return '<div class="td-support-line"><strong>' + (goal.skill || goal.domain || "Goal") + '</strong><p>' + (goal.goal_template_smart || "") + "</p></div>";
        }).join("") + "</div>",
        '<div class="td-support-item"><h4>Recommended Activities</h4>' + (plan.activities || []).map(function (act) {
          return '<div class="td-support-line"><strong>' + act.title + '</strong><p>' + (act.focusSkill || "") + " • " + act.minutes + " min</p></div>";
        }).join("") + "</div>",
        '<div class="td-plan-tabs"><button class="td-top-btn" type="button" id="td-apply-plan">Apply plan to student goals</button><button class="td-top-btn" type="button" id="td-copy-sheet-row">Copy Google Sheet row</button></div>'
      ].join("");
      var applyBtn = document.getElementById("td-apply-plan");
      if (applyBtn) {
        applyBtn.addEventListener("click", function () {
          if (!SupportStore || typeof SupportStore.addGoal !== "function") return;
          (plan.goals || []).slice(0, 3).forEach(function (goal) {
            SupportStore.addGoal(studentId, {
              domain: goal.domain || "literacy",
              skill: goal.skill || "Goal",
              baseline: goal.baseline_prompt || "Current baseline",
              target: goal.goal_template_smart || "",
              metric: goal.progress_monitoring_method || "Weekly mini-probe",
              schedule: plan.frequency || "3x/week",
              reviewEveryDays: 7,
              notes: "Auto-generated from Intervention Planner"
            });
          });
          setCoachLine("Plan applied to student goals.");
          rerenderSupportHub(studentId);
        });
      }
      var copyBtn = document.getElementById("td-copy-sheet-row");
      if (copyBtn) {
        copyBtn.addEventListener("click", function () {
          if (!Evidence || typeof Evidence.getStudentSummary !== "function") return;
          var student = Evidence.getStudentSummary(studentId).student;
          var goalText = (plan.goals || []).map(function (goal) { return goal.skill || goal.domain; }).join(" | ");
          var nextActivities = (plan.activities || []).map(function (act) { return act.title; }).join(" | ");
          var row = [
            student.id || studentId,
            student.name || studentId,
            new Date().toISOString().slice(0, 10),
            goalText,
            plan.frequency || "3x/week",
            nextActivities,
            "Generated via Cornerstone MTSS planner"
          ].join("\t");
          if (navigator.clipboard) navigator.clipboard.writeText(row).catch(function () {});
          setCoachLine("Copied Google Sheets row.");
        });
      }
    }

    function renderSupportHub(studentId) {
      if (!el.supportBody) return;
      if (!studentId) {
        el.supportBody.innerHTML = '<div class="td-support-item"><p>Select a student to load support workflows.</p></div>';
        return;
      }
      var studentSupport = SupportStore && typeof SupportStore.getStudent === "function"
        ? SupportStore.getStudent(studentId)
        : { needs: [], goals: [], accommodations: [], interventions: [], meetings: [] };
      if (state.activeSupportTab === "snapshot") {
        var anchorPanel = typeof hooks.renderInstitutionalAnchorPanel === "function"
          ? hooks.renderInstitutionalAnchorPanel(studentId, false)
          : "";
        el.supportBody.innerHTML = [
          '<div class="td-support-item"><h4>Top Needs</h4><p>' + (studentSupport.needs.length ? studentSupport.needs.slice(0, 5).map(function (n) { return n.label; }).join(" • ") : "No needs captured yet.") + "</p></div>",
          '<div class="td-support-item"><h4>Last 14 days trend</h4><p>Use Skill Tiles + Recent Sessions for trend checks before meetings.</p></div>',
          anchorPanel
        ].join("");
        if (typeof hooks.bindInstitutionalAnchorActions === "function") {
          hooks.bindInstitutionalAnchorActions(studentId, el.supportBody, false);
        }
        return;
      }
      if (state.activeSupportTab === "plan") {
        var goals = studentSupport.goals || [];
        el.supportBody.innerHTML = '<div class="td-support-item"><h4>SMART Goal Builder</h4><p>Generate 3-5 SAS-aligned goal templates by domain + baseline.</p><div class="td-plan-tabs"><button id="td-create-plan-btn" class="td-top-btn" type="button">Create Plan</button><button id="td-suggest-goals-btn" class="td-top-btn" type="button">Suggest Goals</button></div><div id="td-suggested-goals"></div><div id="td-generated-plan"></div></div>' + (goals.length
          ? goals.slice(0, 5).map(function (goal) {
              return '<div class="td-support-item"><h4>' + (goal.skill || goal.domain || "Goal") + '</h4><p>Baseline ' + (goal.baseline || "--") + ' → Target ' + (goal.target || "--") + ' • Review every ' + (goal.reviewEveryDays || 14) + "d</p></div>";
            }).join("")
          : '<div class="td-support-item"><p>No SMART goals yet. Add from Meeting Notes conversion.</p></div>');
        renderGeneratedPlanner(studentId);
        var createPlanBtn = document.getElementById("td-create-plan-btn");
        if (createPlanBtn) {
          createPlanBtn.addEventListener("click", function () {
            if (!InterventionPlanner || typeof InterventionPlanner.buildPlan !== "function") {
              setCoachLine("Planner unavailable. Continue with manual goals.");
              return;
            }
            var skillModel = Evidence && typeof Evidence.getSkillModel === "function" ? Evidence.getSkillModel(studentId) : null;
            var topNeeds = skillModel && Array.isArray(skillModel.topNeeds) ? skillModel.topNeeds : (studentSupport.needs || []);
            var gradeBand = typeof hooks.getSelectedStudentGradeBand === "function"
              ? hooks.getSelectedStudentGradeBand()
              : "";
            InterventionPlanner.buildPlan({
              studentId: studentId,
              topNeeds: topNeeds,
              gradeBand: gradeBand,
              timeBudgetMin: 20
            }).then(function (plan) {
              state.generatedPlanner = plan;
              renderGeneratedPlanner(studentId);
              setCoachLine("SAS-aligned intervention plan generated.");
            });
          });
        }
        var suggestBtn = document.getElementById("td-suggest-goals-btn");
        if (suggestBtn) {
          suggestBtn.addEventListener("click", function () {
            renderSuggestedGoals(studentId);
          });
        }
        return;
      }
      if (state.activeSupportTab === "accommodations") {
        var acc = studentSupport.accommodations || [];
        el.supportBody.innerHTML = renderAccommodationRows(acc);
        Array.prototype.forEach.call(el.supportBody.querySelectorAll("[data-accommodation-toggle]"), function (button) {
          button.addEventListener("click", function () {
            if (!SupportStore || typeof SupportStore.toggleAccommodationImplemented !== "function") return;
            var id = String(button.getAttribute("data-accommodation-toggle") || "");
            var context = String(button.getAttribute("data-accommodation-context") || "class");
            if (!id) return;
            SupportStore.toggleAccommodationImplemented(studentId, id, context);
            setCoachLine("Accommodation implementation logged.");
            rerenderSupportHub(studentId);
          });
        });
        return;
      }
      if (state.activeSupportTab === "interventions") {
        var interventions = studentSupport.interventions || [];
        var tier1 = interventions.filter(function (row) { return Number(row.tier || 1) === 1; });
        var head = [
          '<div class="td-support-item">',
          "<h4>Tier 1 Evidence</h4>",
          "<p>Start a Tier 1 plan, log datapoints in under 60 seconds, and watch referral readiness.</p>",
          '<div class="td-plan-tabs">',
          '<button class="td-top-btn" type="button" data-tier1-action="start">Start Tier 1 Plan</button>',
          '<button class="td-top-btn" type="button" data-tier1-action="datapoint">Log Datapoint</button>',
          '<button class="td-top-btn" type="button" data-tier1-action="attach">Attach Artifact Link</button>',
          "</div>",
          "</div>"
        ].join("");
        var rows = tier1.length
          ? tier1.slice(0, 8).map(function (row) {
              var view = formatTier1Intervention(row);
              return [
                '<div class="td-support-item">',
                "<h4>Tier 1 • " + view.domain + "</h4>",
                "<p>" + view.strategy + " • " + view.frequency + " • " + view.duration + " min • Metric: " + view.metric + "</p>",
                '<div class="td-plan-tabs"><span class="td-chip">' + view.readinessLabel + '</span><span class="td-chip">Fidelity ' + view.checksDone + "/" + view.checksTotal + '</span><span class="td-chip">Datapoints ' + view.datapointsCount + "</span></div>",
                '<svg class="td-mini-spark" viewBox="0 0 72 24" preserveAspectRatio="none"><path d="' + view.sparkPath + '" /></svg>',
                '<div class="td-plan-tabs"><button class="td-top-btn" type="button" data-tier1-point="' + view.id + '">+ datapoint</button><button class="td-top-btn" type="button" data-tier1-fidelity="' + view.id + '" data-tier1-fidelity-index="0">Toggle fidelity</button></div>',
                "</div>"
              ].join("");
            }).join("")
          : '<div class="td-support-item"><p>No Tier 1 intervention logs yet.</p></div>';
        el.supportBody.innerHTML = head + rows;
        var startBtn = el.supportBody.querySelector("[data-tier1-action='start']");
        if (startBtn) {
          startBtn.addEventListener("click", function () {
            if (!SupportStore || typeof SupportStore.startTier1Plan !== "function") return;
            var domain = window.prompt("Tier 1 domain", "Reading") || "Reading";
            var strategy = window.prompt("Tier 1 strategy", "Targeted classroom support") || "Targeted classroom support";
            var metric = window.prompt("Progress metric", "MAP") || "MAP";
            var created = SupportStore.startTier1Plan(studentId, {
              domain: domain,
              strategy: strategy,
              focus: domain + " support",
              progressMetric: metric,
              frequency: "3x/week",
              durationMinutes: 20
            });
            if (created && window.CSEvidence && typeof window.CSEvidence.addSession === "function") {
              window.CSEvidence.addSession(studentId, {
                id: "tier1_" + Date.now(),
                createdAt: new Date().toISOString(),
                activity: "tier1-plan",
                durationSec: 60,
                signals: { guessCount: 0, avgGuessLatencyMs: 0, misplaceRate: 0, absentRate: 0, repeatSameBadSlotCount: 0, vowelSwapCount: 0, constraintViolations: 0 },
                outcomes: { solved: false, attemptsUsed: 0 }
              });
            }
            setCoachLine("Tier 1 plan started.");
            rerenderSupportHub(studentId);
            rerenderDrawer(studentId);
          });
        }
        var pointBtn = el.supportBody.querySelector("[data-tier1-action='datapoint']");
        if (pointBtn) {
          pointBtn.addEventListener("click", function () {
            if (!SupportStore || typeof SupportStore.getStudent !== "function" || typeof SupportStore.addInterventionDatapoint !== "function") return;
            var current = (SupportStore.getStudent(studentId).interventions || []).find(function (row) { return Number(row.tier || 1) === 1; });
            if (!current) return;
            var value = Number(window.prompt("Datapoint value", "70") || 0);
            var note = window.prompt("Datapoint note", "") || "";
            SupportStore.addInterventionDatapoint(studentId, current.id, {
              date: new Date().toISOString().slice(0, 10),
              value: value,
              note: note
            });
            setCoachLine("Tier 1 datapoint logged.");
            rerenderSupportHub(studentId);
            rerenderDrawer(studentId);
          });
        }
        var attachBtn = el.supportBody.querySelector("[data-tier1-action='attach']");
        if (attachBtn) {
          attachBtn.addEventListener("click", function () {
            if (!SupportStore || typeof SupportStore.getStudent !== "function" || typeof SupportStore.addInterventionAttachment !== "function") return;
            var current = (SupportStore.getStudent(studentId).interventions || []).find(function (row) { return Number(row.tier || 1) === 1; });
            if (!current) return;
            var title = window.prompt("Artifact title", "Session summary") || "Session summary";
            var link = window.prompt("Artifact link / reference", "word-quest summary") || "";
            SupportStore.addInterventionAttachment(studentId, current.id, { title: title, link: link });
            setCoachLine("Artifact linked to Tier 1 plan.");
            rerenderSupportHub(studentId);
          });
        }
        Array.prototype.forEach.call(el.supportBody.querySelectorAll("[data-tier1-point]"), function (button) {
          button.addEventListener("click", function () {
            if (!SupportStore || typeof SupportStore.addInterventionDatapoint !== "function") return;
            var interventionId = String(button.getAttribute("data-tier1-point") || "");
            if (!interventionId) return;
            var value = Number(window.prompt("Datapoint value", "70") || 0);
            var note = window.prompt("Datapoint note", "") || "";
            SupportStore.addInterventionDatapoint(studentId, interventionId, {
              date: new Date().toISOString().slice(0, 10),
              value: value,
              note: note
            });
            setCoachLine("Datapoint logged.");
            rerenderSupportHub(studentId);
            rerenderDrawer(studentId);
          });
        });
        Array.prototype.forEach.call(el.supportBody.querySelectorAll("[data-tier1-fidelity]"), function (button) {
          button.addEventListener("click", function () {
            if (!SupportStore || typeof SupportStore.toggleFidelityCheck !== "function") return;
            var interventionId = String(button.getAttribute("data-tier1-fidelity") || "");
            var idx = Number(button.getAttribute("data-tier1-fidelity-index") || 0);
            SupportStore.toggleFidelityCheck(studentId, interventionId, idx);
            setCoachLine("Fidelity log updated.");
            rerenderSupportHub(studentId);
          });
        });
        return;
      }
      el.supportBody.innerHTML = [
        '<div class="td-support-item"><h4>Exports</h4><p>Share Summary for quick updates. Referral Packet for MDT-ready evidence.</p></div>',
        '<div class="td-support-item"><p>All data remains local-first unless exported intentionally.</p></div>'
      ].join("");
    }

    return {
      formatTier1Intervention: formatTier1Intervention,
      renderAccommodationRows: renderAccommodationRows,
      renderSuggestedGoals: renderSuggestedGoals,
      renderGeneratedPlanner: renderGeneratedPlanner,
      renderSupportHub: renderSupportHub
    };
  }

  window.CSDashboardSupportView = {
    create: create
  };
})();
