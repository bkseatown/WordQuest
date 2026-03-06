(function workspaceSupportOpsModule(root, factory) {
  if (typeof module === "object" && module.exports) {
    module.exports = factory();
    return;
  }
  root.CSWorkspaceSupportOps = factory();
})(typeof globalThis !== "undefined" ? globalThis : window, function createWorkspaceSupportOps() {
  "use strict";

  function decomposeTask(name) {
    var text = String(name || "").toLowerCase();
    if (text.indexOf("write") >= 0 || text.indexOf("paragraph") >= 0 || text.indexOf("essay") >= 0) {
      return ["Identify claim", "Brainstorm 2-3 reasons", "Draft paragraph", "Add explanation", "Quick revision check"];
    }
    if (text.indexOf("read") >= 0 || text.indexOf("text") >= 0 || text.indexOf("article") >= 0) {
      return ["Preview text", "Identify purpose", "Annotate 3 key points", "Summarize", "Reflect"];
    }
    if (text.indexOf("math") >= 0 || text.indexOf("solve") >= 0 || text.indexOf("equation") >= 0 || text.indexOf("problem") >= 0) {
      return ["Identify problem type", "List knowns/unknowns", "Solve step-by-step", "Check answer", "Explain reasoning"];
    }
    return ["Define task objective", "Break into 3-5 steps", "Complete first step", "Review progress", "Finalize"];
  }

  function ratingAccuracy(value) {
    var v = String(value || "");
    if (v === "On Task") return 1;
    if (v === "Mostly") return 0.75;
    return 0.45;
  }

  function clearEfTimer(state) {
    if (state && state.efTimer) {
      window.clearInterval(state.efTimer);
      state.efTimer = null;
    }
  }

  function emitExecutiveEvidence(studentId, skillId, accuracy, EvidenceEngine) {
    if (!studentId || !skillId || !EvidenceEngine || typeof EvidenceEngine.recordEvidence !== "function") return;
    EvidenceEngine.recordEvidence({
      studentId: String(studentId),
      timestamp: new Date().toISOString(),
      module: "executive_function",
      activityId: "ef.v1",
      targets: [String(skillId)],
      tier: "T2",
      doseMin: 5,
      result: {
        attempts: 1,
        accuracy: Math.max(0, Math.min(1, Number(accuracy || 0))),
        selfCorrections: 0,
        errorPattern: []
      },
      confidence: 0.8,
      notes: "Phase 19 executive function signal"
    });
  }

  function renderImplementationToday(options) {
    var config = options && typeof options === "object" ? options : {};
    var studentId = String(config.studentId || "");
    var el = config.el || {};
    var SupportStore = config.SupportStore || null;
    var escAttr = typeof config.escAttr === "function" ? config.escAttr : function (value) { return String(value || ""); };
    var isAdminContext = typeof config.isAdminContext === "function" ? config.isAdminContext : function () { return false; };
    var renderInstructionalSequencer = typeof config.renderInstructionalSequencer === "function" ? config.renderInstructionalSequencer : function () {};
    var setCoachLine = typeof config.setCoachLine === "function" ? config.setCoachLine : function () {};
    if (!el.implementationTodayBody) return;
    if (!studentId || !SupportStore || typeof SupportStore.getStudent !== "function") {
      el.implementationTodayBody.innerHTML = '<p class="td-reco-line">Select a student to track implementation fidelity.</p>';
      return;
    }
    var student = SupportStore.getStudent(studentId);
    var tracking = typeof SupportStore.getImplementationTracking === "function"
      ? SupportStore.getImplementationTracking(studentId)
      : { accommodations: [], tier1Interventions: [] };
    var accommodations = (student.accommodations || []).slice(0, 4);
    var today = new Date().toISOString().slice(0, 10);
    var toggles = accommodations.length ? accommodations.map(function (acc) {
      var trackRow = (tracking.accommodations || []).find(function (row) { return String(row.id) === String(acc.id); });
      var implementedToday = !!(trackRow && Array.isArray(trackRow.history) && trackRow.history.some(function (h) {
        return String(h.date || "").slice(0, 10) === today && h.implemented === true;
      }));
      return '<label class="td-impl-chip"><input type="checkbox" data-impl-acc="' + escAttr(String(acc.id || "")) + '"' + (implementedToday ? " checked" : "") + '> ' + escAttr(acc.title || "Accommodation") + '</label>';
    }).join("") : '<span class="td-reco-line">No active accommodations yet.</span>';

    var tier1Interventions = (student.interventions || []).filter(function (row) { return Number(row.tier || 1) === 1; }).slice(0, 8);
    var optionsHtml = tier1Interventions.length
      ? tier1Interventions.map(function (row) {
          return '<option value="' + escAttr(String(row.id || "")) + '">' + escAttr(row.strategy || row.focus || "Tier 1 intervention") + '</option>';
        }).join("")
      : '<option value="">Tier 1 intervention</option>';

    var consistency = typeof SupportStore.calculateImplementationConsistency === "function"
      ? SupportStore.calculateImplementationConsistency(studentId, 21)
      : { percent: 0 };

    var body = [
      '<div class="td-impl-row">' + toggles + '</div>',
      '<div class="td-impl-form">',
      '<select id="td-impl-intervention">' + optionsHtml + '</select>',
      '<select id="td-impl-duration"><option value="5">5m</option><option value="10" selected>10m</option><option value="15">15m</option><option value="20">20m</option></select>',
      '<select id="td-impl-context"><option value="ELA" selected>ELA</option><option value="Math">Math</option><option value="Other">Other</option></select>',
      '<button id="td-impl-log" class="td-top-btn" type="button">Log Intervention</button>',
      '</div>',
      '<p class="td-sequencer-alignment">Implementation Consistency (Past 3 Weeks): ' + Number(consistency.percent || 0).toFixed(1) + '%</p>'
    ];

    if (isAdminContext()) {
      var accTotal = (tracking.accommodations || []).reduce(function (sum, row) {
        var hits = Array.isArray(row.history) ? row.history.filter(function (h) { return h && h.implemented === true; }).length : 0;
        return sum + hits;
      }, 0);
      var recentTier1 = (tracking.tier1Interventions || []).filter(function (row) {
        var ts = Date.parse(String(row.date || ""));
        return Number.isFinite(ts) && ts >= (Date.now() - (28 * 86400000));
      });
      var byCtx = {};
      recentTier1.forEach(function (row) {
        var key = String(row.context || "Other");
        byCtx[key] = (byCtx[key] || 0) + 1;
      });
      body.push('<p class="td-impl-admin">Admin: accommodation logs=' + accTotal + ' • Tier 1/week=' + (Math.round((recentTier1.length / 4) * 10) / 10) + ' • Context: ' + Object.keys(byCtx).map(function (k) { return k + " " + byCtx[k]; }).join(" • ") + '</p>');
    }

    el.implementationTodayBody.innerHTML = body.join("");

    Array.prototype.forEach.call(el.implementationTodayBody.querySelectorAll("[data-impl-acc]"), function (cb) {
      cb.addEventListener("change", function () {
        var id = String(cb.getAttribute("data-impl-acc") || "");
        if (!id) return;
        var acc = accommodations.find(function (row) { return String(row.id) === id; }) || {};
        if (typeof SupportStore.logAccommodationImplementation === "function") {
          SupportStore.logAccommodationImplementation(studentId, { id: id, name: acc.title || "Accommodation", implemented: !!cb.checked });
        }
        if (cb.checked && typeof SupportStore.toggleAccommodationImplemented === "function") {
          SupportStore.toggleAccommodationImplemented(studentId, id, "class");
        }
        renderImplementationToday(options);
        renderInstructionalSequencer(studentId);
      });
    });

    var logBtn = document.getElementById("td-impl-log");
    if (logBtn) {
      logBtn.addEventListener("click", function () {
        var select = document.getElementById("td-impl-intervention");
        var durationEl = document.getElementById("td-impl-duration");
        var contextEl = document.getElementById("td-impl-context");
        var interventionId = String(select && select.value || "");
        var intervention = tier1Interventions.find(function (row) { return String(row.id || "") === interventionId; }) || {};
        if (typeof SupportStore.logTier1InterventionUsage === "function") {
          SupportStore.logTier1InterventionUsage(studentId, {
            id: interventionId || ("tier1_" + Date.now()),
            name: intervention.strategy || intervention.focus || "Tier 1 intervention",
            durationMin: Number(durationEl && durationEl.value || 10),
            context: String(contextEl && contextEl.value || "ELA")
          });
        }
        renderImplementationToday(options);
        renderInstructionalSequencer(studentId);
        setCoachLine("Tier 1 intervention logged.");
      });
    }
  }

  function renderExecutiveSupport(options) {
    var config = options && typeof options === "object" ? options : {};
    var studentId = String(config.studentId || "");
    var state = config.state || {};
    var el = config.el || {};
    var SupportStore = config.SupportStore || null;
    var TaskBreakdownTool = config.TaskBreakdownTool || null;
    var EvidenceEngine = config.EvidenceEngine || null;
    var escAttr = typeof config.escAttr === "function" ? config.escAttr : function (value) { return String(value || ""); };
    var renderDrawer = typeof config.renderDrawer === "function" ? config.renderDrawer : function () {};
    var renderInstructionalSequencer = typeof config.renderInstructionalSequencer === "function" ? config.renderInstructionalSequencer : function () {};
    var setCoachLine = typeof config.setCoachLine === "function" ? config.setCoachLine : function () {};
    clearEfTimer(state);
    if (!el.executiveSupportBody) return;
    if (!studentId || !SupportStore || typeof SupportStore.getExecutiveFunction !== "function") {
      el.executiveSupportBody.innerHTML = '<p class="td-reco-line">Select a student to open executive-function scaffolds.</p>';
      return;
    }
    var ef = SupportStore.getExecutiveFunction(studentId);
    var breakdown = TaskBreakdownTool && typeof TaskBreakdownTool.load === "function"
      ? TaskBreakdownTool.load(studentId)
      : { assignmentName: "", steps: [], timerMinutes: 10 };
    var activeTask = ef.activeTask || null;
    var upcoming = Array.isArray(ef.upcomingTasks) ? ef.upcomingTasks.slice(0, 3) : [];
    var stepsHtml = "";
    if (activeTask && Array.isArray(activeTask.steps) && activeTask.steps.length) {
      stepsHtml = '<div class="td-ef-steps">' + activeTask.steps.map(function (step, idx) {
        var checked = Array.isArray(activeTask.completedSteps) && activeTask.completedSteps.indexOf(idx) >= 0;
        var minutes = Array.isArray(breakdown.steps) && breakdown.steps[idx] ? Number(breakdown.steps[idx].minutes || 10) : 10;
        return '<label class="td-ef-step"><input type="checkbox" data-ef-step="' + idx + '"' + (checked ? " checked" : "") + '> ' + escAttr(step) + ' <span class="td-chip">' + minutes + ' min</span></label>';
      }).join("") + "</div>";
    }
    var upcomingHtml = upcoming.length
      ? upcoming.map(function (task) {
          return '<div class="td-impl-chip">' + escAttr(task.name) + " • " + escAttr(task.dueDate || "No due date") + " • " + escAttr(task.status || "Not Started") + ' <button class="td-top-btn" type="button" data-ef-break="' + escAttr(String(task.id || "")) + '">Break into Steps</button></div>';
        }).join("")
      : '<span class="td-reco-line">No upcoming tasks yet.</span>';

    el.executiveSupportBody.innerHTML = [
      '<div class="td-impl-form">',
      '<input id="td-ef-task-input" class="td-anchor-input" type="text" placeholder="Enter assignment or task" value="' + escAttr(String(breakdown.assignmentName || "")) + '">',
      '<input id="td-ef-step-minutes" class="td-anchor-input" type="number" min="3" max="40" step="1" value="' + Math.max(3, Math.min(40, Number(breakdown.timerMinutes || 10))) + '" title="Estimated minutes per step">',
      '<button id="td-ef-build" class="td-top-btn" type="button">Build Steps</button>',
      '<button id="td-ef-add-upcoming" class="td-top-btn" type="button">Add Upcoming</button>',
      '<button id="td-ef-save-breakdown" class="td-top-btn" type="button">Save Breakdown</button>',
      '</div>',
      (activeTask ? '<p class="td-sequencer-alignment">Active Task: ' + escAttr(activeTask.name || "Task") + "</p>" : '<p class="td-sequencer-alignment">No active executive task.</p>'),
      stepsHtml,
      '<div class="td-impl-form">',
      '<span class="td-ef-timer" id="td-ef-timer">10:00</span>',
      '<button id="td-ef-start-sprint" class="td-top-btn" type="button">Start Focus Sprint</button>',
      '<input id="td-ef-timer-minutes" class="td-anchor-input" type="number" min="3" max="45" step="1" value="' + Math.max(3, Math.min(45, Number(breakdown.timerMinutes || 10))) + '">',
      '<select id="td-ef-rating"><option>On Task</option><option selected>Mostly</option><option>Struggled</option></select>',
      '<button id="td-ef-log-rating" class="td-top-btn" type="button">Log Focus</button>',
      '</div>',
      '<div class="td-support-item"><h4>Upcoming Tasks</h4><div class="td-impl-row">' + upcomingHtml + "</div></div>",
      (activeTask ? '<div class="td-plan-tabs"><button id="td-ef-complete-task" class="td-top-btn" type="button">Mark Task Complete</button><button id="td-ef-open-task" class="td-top-btn" type="button">Open Task Plan</button></div>' : "")
    ].join("");

    var buildBtn = document.getElementById("td-ef-build");
    if (buildBtn) {
      buildBtn.addEventListener("click", function () {
        var input = document.getElementById("td-ef-task-input");
        var minutesEl = document.getElementById("td-ef-step-minutes");
        var name = String(input && input.value || "").trim();
        if (!name) return;
        var steps = decomposeTask(name);
        var mins = Math.max(3, Math.min(40, Number(minutesEl && minutesEl.value || 10) || 10));
        if (TaskBreakdownTool && typeof TaskBreakdownTool.save === "function") {
          TaskBreakdownTool.save(studentId, {
            assignmentName: name,
            steps: steps.map(function (step) { return { name: step, minutes: mins }; }),
            timerMinutes: mins
          });
        }
        SupportStore.setActiveExecutiveTask(studentId, { name: name, steps: steps, completedSteps: [] });
        renderExecutiveSupport(options);
      });
    }
    var addUpcomingBtn = document.getElementById("td-ef-add-upcoming");
    if (addUpcomingBtn) {
      addUpcomingBtn.addEventListener("click", function () {
        var input = document.getElementById("td-ef-task-input");
        var name = String(input && input.value || "").trim();
        if (!name) return;
        var due = window.prompt("Due date (YYYY-MM-DD)", "") || "";
        SupportStore.addUpcomingTask(studentId, { name: name, dueDate: due, status: "Not Started" });
        renderExecutiveSupport(options);
      });
    }
    var saveBreakdownBtn = document.getElementById("td-ef-save-breakdown");
    if (saveBreakdownBtn) {
      saveBreakdownBtn.addEventListener("click", function () {
        if (!TaskBreakdownTool || typeof TaskBreakdownTool.save !== "function") return;
        var input = document.getElementById("td-ef-task-input");
        var stepMins = document.getElementById("td-ef-step-minutes");
        var timerMins = document.getElementById("td-ef-timer-minutes");
        var name = String(input && input.value || "").trim();
        var mins = Math.max(3, Math.min(40, Number(stepMins && stepMins.value || 10) || 10));
        var steps = decomposeTask(name || "Task");
        TaskBreakdownTool.save(studentId, {
          assignmentName: name,
          steps: steps.map(function (step) { return { name: step, minutes: mins }; }),
          timerMinutes: Math.max(3, Math.min(45, Number(timerMins && timerMins.value || mins) || mins))
        });
        setCoachLine("Task breakdown saved locally.");
        renderExecutiveSupport(options);
      });
    }
    Array.prototype.forEach.call(el.executiveSupportBody.querySelectorAll("[data-ef-step]"), function (box) {
      box.addEventListener("change", function () {
        var active = SupportStore.getExecutiveFunction(studentId).activeTask;
        if (!active) return;
        var done = Array.isArray(active.completedSteps) ? active.completedSteps.slice() : [];
        var idx = Number(box.getAttribute("data-ef-step") || -1);
        if (idx < 0) return;
        if (box.checked && done.indexOf(idx) === -1) done.push(idx);
        if (!box.checked) done = done.filter(function (v) { return Number(v) !== idx; });
        SupportStore.updateExecutiveTaskProgress(studentId, done);
      });
    });
    var startSprintBtn = document.getElementById("td-ef-start-sprint");
    if (startSprintBtn) {
      startSprintBtn.addEventListener("click", function () {
        var timerEl = document.getElementById("td-ef-timer");
        var timerMinsEl = document.getElementById("td-ef-timer-minutes");
        var timerMins = Math.max(3, Math.min(45, Number(timerMinsEl && timerMinsEl.value || 10) || 10));
        clearEfTimer(state);
        state.efSecondsLeft = timerMins * 60;
        if (timerEl) timerEl.textContent = String(timerMins).padStart(2, "0") + ":00";
        state.efTimer = window.setInterval(function () {
          state.efSecondsLeft -= 1;
          if (timerEl) {
            var mm = Math.floor(Math.max(0, state.efSecondsLeft) / 60);
            var ss = Math.max(0, state.efSecondsLeft) % 60;
            timerEl.textContent = String(mm).padStart(2, "0") + ":" + String(ss).padStart(2, "0");
          }
          if (state.efSecondsLeft <= 0) {
            clearEfTimer(state);
            window.alert("Focus sprint complete. Log focus rating.");
          }
        }, 1000);
      });
    }
    var logFocusBtn = document.getElementById("td-ef-log-rating");
    if (logFocusBtn) {
      logFocusBtn.addEventListener("click", function () {
        var ratingEl = document.getElementById("td-ef-rating");
        var rating = String(ratingEl && ratingEl.value || "Mostly");
        var taskId = activeTask && activeTask.id ? String(activeTask.id) : "";
        SupportStore.logFocusSprint(studentId, { taskId: taskId, duration: 10, selfRating: rating });
        emitExecutiveEvidence(studentId, "EXEC.FUNCTION.SUSTAINED_ATTENTION", ratingAccuracy(rating), EvidenceEngine);
        renderExecutiveSupport(options);
        renderInstructionalSequencer(studentId);
      });
    }
    var completeBtn = document.getElementById("td-ef-complete-task");
    if (completeBtn) {
      completeBtn.addEventListener("click", function () {
        var done = SupportStore.completeExecutiveTask(studentId);
        if (done) emitExecutiveEvidence(studentId, "EXEC.FUNCTION.TASK_COMPLETION", 1, EvidenceEngine);
        renderExecutiveSupport(options);
        renderInstructionalSequencer(studentId);
      });
    }
    var openTaskBtn = document.getElementById("td-ef-open-task");
    if (openTaskBtn) {
      openTaskBtn.addEventListener("click", function () {
        if (el.drawer) el.drawer.classList.remove("hidden");
        state.activeDrawerTab = "snapshot";
        renderDrawer(studentId);
      });
    }
    Array.prototype.forEach.call(el.executiveSupportBody.querySelectorAll("[data-ef-break]"), function (btn) {
      btn.addEventListener("click", function () {
        var id = String(btn.getAttribute("data-ef-break") || "");
        if (!id) return;
        var task = (SupportStore.getExecutiveFunction(studentId).upcomingTasks || []).find(function (t) { return String(t.id) === id; }) || null;
        if (!task) return;
        var steps = decomposeTask(task.name || "");
        SupportStore.setActiveExecutiveTask(studentId, { name: task.name || "Task", steps: steps, completedSteps: [] });
        SupportStore.updateUpcomingTask(studentId, id, { status: "In Progress" });
        renderExecutiveSupport(options);
      });
    });
  }

  return {
    renderImplementationToday: renderImplementationToday,
    renderExecutiveSupport: renderExecutiveSupport
  };
});
