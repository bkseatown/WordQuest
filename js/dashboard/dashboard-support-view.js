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
    var SkillLabels = globalThis.CSSkillLabels || null;

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

    function normalizeText(value) {
      return String(value || "").toLowerCase().trim();
    }

    function escapeHtml(value) {
      return String(value == null ? "" : value)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#39;");
    }

    function canonicalSkillId(raw) {
      return String(raw || "").trim().toUpperCase();
    }

    function skillLabel(raw) {
      var id = canonicalSkillId(raw);
      if (!id) return "";
      if (SkillLabels && typeof SkillLabels[id] === "string" && SkillLabels[id]) return String(SkillLabels[id]);
      return "";
    }

    function swbatGoalForSkill(skillId, fallbackLabel) {
      var id = canonicalSkillId(skillId);
      var label = String(fallbackLabel || skillLabel(skillId) || "the current target skill").trim();
      if (id.indexOf("LIT.DEC.PHG") === 0) return "SWBAT match sounds to spellings more accurately while reading and spelling words.";
      if (id.indexOf("LIT.DEC.SYL") === 0) return "SWBAT read multisyllabic words more accurately by using syllable types and vowel patterns.";
      if (id.indexOf("LIT.DEC.IRREG") === 0) return "SWBAT read and write high-frequency irregular words more automatically.";
      if (id.indexOf("LIT.FLU") === 0) return "SWBAT read connected text more smoothly and accurately while keeping meaning.";
      if (id.indexOf("LIT.COMP") === 0) return "SWBAT explain what they read using evidence from the text.";
      if (id.indexOf("WRITE") >= 0 || id.indexOf("WRI.") >= 0) return "SWBAT write clearer sentences and organize ideas with stronger evidence.";
      if (id.indexOf("NUM") === 0 || id.indexOf("MATH") === 0) return "SWBAT explain their math thinking and solve problems more accurately using a clear strategy.";
      if (label) return "SWBAT strengthen " + label.toLowerCase() + " with less prompting.";
      return "SWBAT strengthen the current target skill with less prompting.";
    }

    function summarizeNeed(row) {
      var need = row && typeof row === "object" ? row : {};
      var label = String(need.label || skillLabel(need.skillId || need.id || need.key) || need.skill || need.domain || need.key || "priority support area");
      return {
        label: label,
        goal: swbatGoalForSkill(need.skillId || need.id || need.key, label)
      };
    }

    function inferGoalDomain(topNeeds, goals) {
      var pool = []
        .concat(Array.isArray(topNeeds) ? topNeeds : [])
        .concat(Array.isArray(goals) ? goals : []);
      var i;
      for (i = 0; i < pool.length; i++) {
        var row = pool[i] || {};
        var blob = normalizeText([
          row.domain,
          row.label,
          row.skill,
          row.key,
          row.skillId
        ].join(" "));
        if (!blob) continue;
        if (blob.indexOf("math") !== -1 || blob.indexOf("num") !== -1) return "math";
        if (blob.indexOf("write") !== -1 || blob.indexOf("sentence") !== -1 || blob.indexOf("paragraph") !== -1) return "writing";
        if (blob.indexOf("executive") !== -1 || blob.indexOf("attention") !== -1 || blob.indexOf("organization") !== -1) return "executive";
        if (blob.indexOf("behavior") !== -1 || blob.indexOf("regulation") !== -1) return "behavior";
        if (blob.indexOf("read") !== -1 || blob.indexOf("decod") !== -1 || blob.indexOf("flu") !== -1 || blob.indexOf("phon") !== -1 || blob.indexOf("morph") !== -1) {
          return "literacy";
        }
      }
      return "literacy";
    }

    function inferBaseline(studentId, topNeeds, studentSupport) {
      var anchors = SupportStore && typeof SupportStore.getInstitutionalAnchors === "function" && studentId
        ? SupportStore.getInstitutionalAnchors(studentId)
        : null;
      var evidenceBits = [];
      if (anchors && anchors.reading) {
        if (anchors.reading.aimswebPercentile != null) evidenceBits.push("Aimsweb+ reading percentile " + anchors.reading.aimswebPercentile);
        if (anchors.reading.classroomData) evidenceBits.push("reading classroom evidence: " + anchors.reading.classroomData);
        if (anchors.reading.interventionData) evidenceBits.push("reading intervention evidence: " + anchors.reading.interventionData);
      }
      if (anchors && anchors.writing) {
        if (anchors.writing.currentWritingGoal) evidenceBits.push("writing goal: " + anchors.writing.currentWritingGoal);
        if (anchors.writing.classroomData) evidenceBits.push("writing classroom evidence: " + anchors.writing.classroomData);
      }
      if (anchors && anchors.math) {
        if (anchors.math.illustrativeCheckpoint) evidenceBits.push("math checkpoint: " + anchors.math.illustrativeCheckpoint);
        if (anchors.math.classroomData) evidenceBits.push("math classroom evidence: " + anchors.math.classroomData);
        if (anchors.math.interventionData) evidenceBits.push("math intervention evidence: " + anchors.math.interventionData);
      }
      var needs = Array.isArray(topNeeds) ? topNeeds : [];
      var supportNeeds = studentSupport && Array.isArray(studentSupport.needs) ? studentSupport.needs : [];
      var source = needs[0] || supportNeeds[0] || null;
      if (source) {
        var label = source.label || source.skill || source.domain || source.key || "priority support area";
        return "Current classwork and quick checks show the clearest support need in " + label + ". " +
          (evidenceBits.length ? ("Use this evidence as the starting truth: " + evidenceBits.slice(0, 2).join("; ") + ". ") : "") +
          "Keep the next goal narrow enough to measure within the next two weeks.";
      }
      if (evidenceBits.length) {
        return "Visible school and classroom data already provide a starting baseline: " + evidenceBits.slice(0, 3).join("; ") + ". Use that to draft a measurable two-week goal before collecting more.";
      }
      return "Current baseline still needs one short classwork sample and one quick check. Start with a measurable goal the team can progress-monitor within two weeks.";
    }

    function inferTimeBudget(topNeeds, studentSupport) {
      var needsCount = Array.isArray(topNeeds) && topNeeds.length ? topNeeds.length : (studentSupport && Array.isArray(studentSupport.needs) ? studentSupport.needs.length : 0);
      if (needsCount >= 3) return 30;
      if (needsCount === 2) return 25;
      return 20;
    }

    function ensurePlanDraft(studentId, studentSupport) {
      if (!state.planDraft || state.planDraft.studentId !== studentId) {
        var skillModel = Evidence && typeof Evidence.getSkillModel === "function" ? Evidence.getSkillModel(studentId) : null;
        var topNeeds = skillModel && Array.isArray(skillModel.topNeeds) ? skillModel.topNeeds : (studentSupport.needs || []);
        state.planDraft = {
          studentId: studentId,
          domain: inferGoalDomain(topNeeds, studentSupport.goals || []),
          baseline: inferBaseline(studentId, topNeeds, studentSupport),
          timeBudgetMin: inferTimeBudget(topNeeds, studentSupport)
        };
      }
      return state.planDraft;
    }

    function anchorDrivenPriorities(studentId) {
      if (!SupportStore || typeof SupportStore.getInstitutionalAnchors !== "function" || !studentId) return [];
      var anchors = SupportStore.getInstitutionalAnchors(studentId);
      if (!anchors) return [];
      var priorities = [];
      if (anchors.reading && (anchors.reading.classroomData || anchors.reading.interventionData || anchors.reading.aimswebPercentile != null)) {
        priorities.push("SWBAT read connected text more accurately and independently using the current decoding strategy.");
      }
      if (anchors.writing && (anchors.writing.classroomData || anchors.writing.interventionData || anchors.writing.currentWritingGoal)) {
        priorities.push("SWBAT organize a written response more clearly and complete it with less prompting.");
      }
      if (anchors.math && (anchors.math.classroomData || anchors.math.interventionData || anchors.math.illustrativeCheckpoint || anchors.math.mapRIT != null)) {
        priorities.push("SWBAT explain their math thinking and solve lesson-aligned problems more independently.");
      }
      return priorities.slice(0, 3);
    }

    function renderPlanDraftCard(studentId, studentSupport) {
      var draft = ensurePlanDraft(studentId, studentSupport);
      var skillModel = Evidence && typeof Evidence.getSkillModel === "function" ? Evidence.getSkillModel(studentId) : null;
      var topNeeds = skillModel && Array.isArray(skillModel.topNeeds) ? skillModel.topNeeds : (studentSupport.needs || []);
      var needLine = topNeeds.length
        ? topNeeds.slice(0, 2).map(function (row) { return summarizeNeed(row).goal; }).join(" ")
        : "No instructional priorities surfaced yet.";
      var gradeBand = typeof hooks.getSelectedStudentGradeBand === "function"
        ? hooks.getSelectedStudentGradeBand()
        : "";
      return [
        '<div class="td-support-item td-plan-brief">',
        '<p class="td-plan-kicker">Recommended next move</p>',
        '<h4>Build a goal set from the current student context.</h4>',
        '<p>Cornerstone is using the selected student, visible needs, and current goals to suggest the starting lane before you edit anything.</p>',
        '<div class="td-plan-brief-grid">',
        '<div class="td-plan-brief-card"><span>Focus lane</span><strong>' + escapeHtml(draft.domain) + '</strong><p>' + escapeHtml(needLine) + '</p></div>',
        '<div class="td-plan-brief-card"><span>Time budget</span><strong>' + escapeHtml(String(draft.timeBudgetMin)) + ' min</strong><p>' + escapeHtml(gradeBand ? ("Grade band " + gradeBand + " context applied.") : "Grade context not yet set.") + '</p></div>',
        "</div>",
        '<div class="td-plan-domain-row">',
        ["literacy", "writing", "math", "executive", "behavior"].map(function (domain) {
          return '<button class="td-top-btn' + (draft.domain === domain ? ' is-active' : '') + '" type="button" data-plan-domain="' + domain + '">' + domain + "</button>";
        }).join(""),
        "</div>",
        '<label class="td-plan-field"><span>Baseline summary</span><textarea id="td-plan-baseline" class="td-anchor-input td-plan-textarea" rows="4" placeholder="What is true right now and what should the next goal tighten?">' + escapeHtml(draft.baseline) + "</textarea></label>",
        '<label class="td-plan-field"><span>Time budget for the support move</span><select id="td-plan-budget" class="td-anchor-input">' +
          [15, 20, 25, 30].map(function (minutes) {
            return '<option value="' + minutes + '"' + (draft.timeBudgetMin === minutes ? " selected" : "") + ">" + minutes + " minutes</option>";
          }).join("") +
          "</select></label>",
        '<div class="td-plan-tabs"><button id="td-create-plan-btn" class="td-top-btn" type="button">Build Recommended Plan</button><button id="td-suggest-goals-btn" class="td-top-btn" type="button">Suggest Goal Templates</button></div>',
        '<div id="td-suggested-goals"></div>',
        '<div id="td-generated-plan"></div>',
        "</div>"
      ].join("");
    }

    function bindPlanDraftControls(studentId) {
      var draft = state.planDraft;
      Array.prototype.forEach.call(document.querySelectorAll("[data-plan-domain]"), function (button) {
        button.addEventListener("click", function () {
          if (!draft) return;
          draft.domain = String(button.getAttribute("data-plan-domain") || "literacy");
          rerenderSupportHub(studentId);
        });
      });
      var baselineField = document.getElementById("td-plan-baseline");
      if (baselineField) {
        baselineField.addEventListener("input", function () {
          if (!draft) return;
          draft.baseline = String(baselineField.value || "");
        });
      }
      var budgetField = document.getElementById("td-plan-budget");
      if (budgetField) {
        budgetField.addEventListener("change", function () {
          if (!draft) return;
          draft.timeBudgetMin = Number(budgetField.value || draft.timeBudgetMin || 20);
        });
      }
    }

    function renderSuggestedGoals(studentId) {
      var target = document.getElementById("td-suggested-goals");
      if (!target || !state.sasPack || !SASLibrary) return;
      var draft = state.planDraft || {};
      var domainInput = String(draft.domain || "literacy");
      var baselineInput = String(draft.baseline || "").trim();
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
          '<span class="td-suggest-goal__meta">' + escapeHtml(domainInput) + ' • ' + escapeHtml(gradeBand || "broad grade match") + '</span>',
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
      setCoachLine("Suggested SAS goal templates ready from the current student context.");
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
        '<p>Frequency: ' + (plan.frequency || "3x/week") + ' • Progress cadence: ' + (plan.progressCadence || "Weekly mini-probe") + ' • Focus lane: ' + (plan.domain || "recommended") + "</p>",
        (plan.baselineSummary ? '<p>' + plan.baselineSummary + "</p>" : ""),
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
        var visiblePriorities = studentSupport.needs.length
          ? studentSupport.needs.slice(0, 3).map(function (n) { return summarizeNeed(n).goal; })
          : anchorDrivenPriorities(studentId);
        el.supportBody.innerHTML = [
          '<div class="td-support-item"><h4>Instructional priorities</h4><p>' + (visiblePriorities.length ? visiblePriorities.join(" ") : "No instructional priorities captured yet.") + "</p></div>",
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
        el.supportBody.innerHTML = renderPlanDraftCard(studentId, studentSupport) + (goals.length
          ? goals.slice(0, 5).map(function (goal) {
              return '<div class="td-support-item"><h4>' + (goal.skill || goal.domain || "Goal") + '</h4><p>Baseline ' + (goal.baseline || "--") + ' → Target ' + (goal.target || "--") + ' • Review every ' + (goal.reviewEveryDays || 14) + "d</p></div>";
            }).join("")
          : '<div class="td-support-item"><p>No SMART goals yet. Add from Meeting Notes conversion.</p></div>');
        renderGeneratedPlanner(studentId);
        bindPlanDraftControls(studentId);
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
            var draft = state.planDraft || {};
            InterventionPlanner.buildPlan({
              studentId: studentId,
              topNeeds: topNeeds,
              gradeBand: gradeBand,
              timeBudgetMin: Number(draft.timeBudgetMin || 20)
            }).then(function (plan) {
              plan.domain = draft.domain || inferGoalDomain(topNeeds, goals);
              plan.baselineSummary = String(draft.baseline || "");
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
