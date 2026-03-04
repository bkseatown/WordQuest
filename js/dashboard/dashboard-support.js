(function dashboardSupportModule() {
  "use strict";

  function getSelectedStudent(store) {
    if (!store || typeof store.get !== "function") return "";
    var state = store.get();
    return String(state && state.selectedStudentId || "");
  }

  function create(options) {
    var config = options && typeof options === "object" ? options : {};
    var state = config.state || {};
    var el = config.el || {};
    var modalController = config.modalController || null;
    var hooks = config.hooks || {};
    var deps = config.deps || {};

    var Evidence = deps.Evidence || null;
    var SessionPlanner = deps.SessionPlanner || null;
    var ShareSummaryAPI = deps.ShareSummaryAPI || null;
    var SupportStore = deps.SupportStore || null;
    var SASLibrary = deps.SASLibrary || null;

    function setCoachLine(text) {
      if (typeof hooks.setCoachLine === "function") hooks.setCoachLine(text);
    }

    function download(name, contents, mime) {
      if (typeof hooks.download === "function") hooks.download(name, contents, mime);
    }

    function copyText(text, onDone) {
      if (typeof hooks.copyText === "function") {
        hooks.copyText(text, onDone);
        return;
      }
      if (navigator.clipboard && typeof navigator.clipboard.writeText === "function") {
        navigator.clipboard.writeText(String(text || "")).catch(function () {});
      }
      if (typeof onDone === "function") onDone();
    }

    function appendStudentParam(url, sid) {
      if (typeof hooks.appendStudentParam === "function") {
        return hooks.appendStudentParam(url, sid);
      }
      return String(url || "");
    }

    function getCurrentBuildId() {
      if (typeof hooks.getCurrentBuildId === "function") return hooks.getCurrentBuildId();
      return "";
    }

    function getSelectedStudentGradeBand() {
      var student = (state.caseload || []).find(function (row) {
        return row && row.id === state.selectedId;
      });
      var grade = student && student.grade ? String(student.grade) : "";
      var n = Number(String(grade).replace(/[^0-9]/g, ""));
      if (!Number.isFinite(n)) return "";
      if (n <= 2) return "K-2";
      if (n <= 5) return "3-5";
      if (n <= 8) return "6-8";
      return "9-12";
    }

    function buildShareSummaryText(studentId) {
      if (!Evidence || typeof Evidence.getStudentSummary !== "function") return "";
      var summary = Evidence.getStudentSummary(studentId);
      var sessions = (window.CSEvidence && typeof window.CSEvidence.getRecentSessions === "function")
        ? window.CSEvidence.getRecentSessions(studentId, { limit: 1 })
        : [];
      var row = sessions[0] || {};
      var sig = row.signals || {};
      var rec = (window.CSEvidence && typeof window.CSEvidence.recommendNextSteps === "function")
        ? window.CSEvidence.recommendNextSteps(sig)
        : { bullets: [summary.nextMove.line] };
      return [
        "Student: " + summary.student.name + " (" + summary.student.id + ")",
        "Date: " + new Date().toISOString().slice(0, 10),
        "Activity: Word Quest (90s)",
        "Observed:",
        "- Attempts: " + (row.outcomes && row.outcomes.attemptsUsed != null ? row.outcomes.attemptsUsed : "--"),
        "- Vowel swaps: " + (sig.vowelSwapCount != null ? sig.vowelSwapCount : "--"),
        "- Repeat same slot: " + (sig.repeatSameBadSlotCount != null ? sig.repeatSameBadSlotCount : "--"),
        "Next step (Tier 2):",
        "- " + (rec.bullets && rec.bullets[0] ? rec.bullets[0] : summary.nextMove.line),
        "Progress note:",
        "- " + summary.nextMove.line
      ].join("\n");
    }

    function buildSharePayload(studentId) {
      if (!Evidence || typeof Evidence.getStudentSummary !== "function") {
        return { text: "", json: {}, csv: "" };
      }
      var sid = String(studentId || "");
      var summary = Evidence.getStudentSummary(sid);
      var model = Evidence && typeof Evidence.getSkillModel === "function"
        ? Evidence.getSkillModel(sid)
        : { studentId: sid, mastery: {}, topNeeds: [] };
      var recentSessions = window.CSEvidence && typeof window.CSEvidence.getRecentSessions === "function"
        ? window.CSEvidence.getRecentSessions(sid, { limit: 7 })
        : [];
      var plan = SessionPlanner && typeof SessionPlanner.buildDailyPlan === "function"
        ? SessionPlanner.buildDailyPlan({
            studentId: sid,
            skillModel: model,
            topNeeds: model.topNeeds || [],
            timeBudgetMin: 20
          })
        : [];
      var teacherNotes = el.notesInput && typeof el.notesInput.value === "string"
        ? el.notesInput.value.trim()
        : "";
      if (ShareSummaryAPI && typeof ShareSummaryAPI.buildShareSummary === "function") {
        return ShareSummaryAPI.buildShareSummary({
          studentId: sid,
          studentProfile: summary.student,
          skillModel: model,
          recentSessions: recentSessions,
          plan: plan,
          teacherNotes: teacherNotes
        });
      }
      var fallbackText = buildShareSummaryText(sid);
      return {
        text: fallbackText,
        json: {
          studentId: sid,
          student: summary.student,
          topNeeds: model.topNeeds || [],
          skillModel: model,
          recentSessions: recentSessions,
          plan: plan,
          teacherNotes: teacherNotes
        },
        csv: "studentId,summary\\n\"" + sid + "\",\"" + fallbackText.replace(/\"/g, '""') + "\""
      };
    }

    function closeShareModal() {
      if (modalController) modalController.hide("share");
    }

    function openShareModal(studentId) {
      if (!el.shareModal || !el.sharePreview || !studentId) return;
      var payload = buildSharePayload(studentId);
      state.sharePayload = payload;
      el.sharePreview.value = payload.text;
      if (modalController) modalController.show("share");
    }

    function closeSasLibraryModal() {
      if (modalController) modalController.hide("sas-library");
    }

    function renderSasLibraryResults() {
      if (!el.sasList || !el.sasDetail || !state.sasPack || !SASLibrary) return;
      var query = String(el.sasSearch && el.sasSearch.value || "");
      var gradeBand = getSelectedStudentGradeBand();
      var rows = SASLibrary.search(state.sasPack, {
        tab: state.sasTab,
        query: query,
        gradeBand: gradeBand
      });
      if (!rows.length) {
        el.sasList.innerHTML = '<p class="td-reco-line">No matches. Adjust search or tab.</p>';
        el.sasDetail.textContent = "No item selected.";
        state.sasSelection = null;
        if (el.sasApplyPlan) el.sasApplyPlan.disabled = true;
        return;
      }
      el.sasList.innerHTML = rows.map(function (row) {
        return '<button class="td-sas-row" type="button" data-sas-id="' + row.id + '"><strong>' + row.title + '</strong><span>' + (row.subtitle || row.id) + '</span></button>';
      }).join("");
      Array.prototype.forEach.call(el.sasList.querySelectorAll("[data-sas-id]"), function (button, idx) {
        button.addEventListener("click", function () {
          var selected = rows.find(function (row) {
            return row.id === button.getAttribute("data-sas-id");
          }) || rows[0];
          state.sasSelection = selected;
          Array.prototype.forEach.call(el.sasList.querySelectorAll(".td-sas-row"), function (rowBtn) {
            rowBtn.classList.remove("is-active");
          });
          button.classList.add("is-active");
          el.sasDetail.textContent = SASLibrary.describeItem(state.sasTab, selected.row);
          if (el.sasApplyPlan) el.sasApplyPlan.disabled = false;
        });
        if (idx === 0) button.click();
      });
    }

    function openSasLibraryModal() {
      if (!el.sasLibraryModal) return;
      if (!SASLibrary || typeof SASLibrary.ensureLoaded !== "function") {
        if (el.sasDetail) el.sasDetail.textContent = "SAS library module unavailable.";
        if (modalController) modalController.show("sas-library");
        return;
      }
      SASLibrary.ensureLoaded().then(function (loaded) {
        state.sasPack = loaded.pack || null;
        state.sasSelection = null;
        if (el.sasApplyPlan) el.sasApplyPlan.disabled = true;
        renderSasLibraryResults();
        if (modalController) modalController.show("sas-library");
      }).catch(function (err) {
        if (el.sasDetail) {
          el.sasDetail.textContent = "SAS alignment pack unavailable. Run npm run sas:build. (" + String(err && err.message || "load error") + ")";
        }
        if (el.sasList) el.sasList.innerHTML = "";
        if (modalController) modalController.show("sas-library");
      });
    }

    function applySelectedSasItemToPlan() {
      if (!state.sasSelection) return;
      var row = state.sasSelection.row || {};
      var line = [
        state.sasSelection.title,
        row.goal_template_smart || row.progress_monitoring || row.cadence || ""
      ].filter(Boolean).join(" — ");
      if (el.notesInput) {
        var prefix = el.notesInput.value && !/\n$/.test(el.notesInput.value) ? "\n" : "";
        el.notesInput.value = (el.notesInput.value || "") + prefix + "[SAS] " + line;
      }
      setCoachLine("Added SAS-aligned item to plan notes.");
      closeSasLibraryModal();
    }

    function bindEvents() {
      if (el.shareAllNotes) {
        el.shareAllNotes.addEventListener("click", function () {
          if (!state.plan || !state.plan.progressNoteTemplate) return;
          var n = state.plan.progressNoteTemplate;
          var text = [
            "Teacher Note",
            n.teacher || "",
            "",
            "Family Update",
            n.family || "",
            "",
            "Team Update",
            n.team || ""
          ].join("\n");
          if (navigator.clipboard) navigator.clipboard.writeText(text).catch(function () {});
          setCoachLine("Copied teacher/family/team update block.");
        });
      }

      if (el.shareSummary) {
        el.shareSummary.addEventListener("click", function () {
          if (!state.selectedId) return;
          openShareModal(state.selectedId);
          setCoachLine("Share summary ready.");
        });
      }
      if (el.shareQuickCopy) {
        el.shareQuickCopy.addEventListener("click", function () {
          if (!state.selectedId) return;
          var payload = buildSharePayload(state.selectedId);
          copyText(payload.text || "", function () {
            if (!navigator.clipboard) {
              openShareModal(state.selectedId);
              setCoachLine("Clipboard unavailable. Summary opened for manual copy.");
              return;
            }
            setCoachLine("Summary copied.");
          });
        });
      }
      if (el.shareQuickPacket) {
        el.shareQuickPacket.addEventListener("click", function () {
          if (!state.selectedId || !SupportStore || typeof SupportStore.exportReferralPacket !== "function") return;
          var packet = SupportStore.exportReferralPacket(state.selectedId);
          download("mdt-packet-" + state.selectedId + ".html", packet.html, "text/html");
          setCoachLine("MDT packet exported.");
        });
      }
      if (el.shareLink) {
        el.shareLink.addEventListener("click", function () {
          if (!state.selectedId) return;
          var buildId = getCurrentBuildId();
          var link = appendStudentParam("./teacher-dashboard.html", state.selectedId);
          var url = new URL(link, window.location.href);
          if (buildId) url.searchParams.set("v", buildId);
          copyText(url.toString(), function () {
            if (!navigator.clipboard) {
              if (el.sharePreview) el.sharePreview.value = url.toString();
              if (modalController) modalController.show("share");
              else if (el.shareModal) el.shareModal.classList.remove("hidden");
              setCoachLine("Link ready in modal for manual copy.");
              return;
            }
            setCoachLine("Share link copied.");
          });
        });
      }
      if (el.shareModalClose) {
        el.shareModalClose.addEventListener("click", closeShareModal);
      }
      if (el.shareCopy) {
        el.shareCopy.addEventListener("click", function () {
          var text = state.sharePayload && state.sharePayload.text ? state.sharePayload.text : "";
          if (!text) return;
          if (navigator.clipboard) navigator.clipboard.writeText(text).catch(function () {});
          setCoachLine("Copied share summary.");
        });
      }
      if (el.shareDownloadJson) {
        el.shareDownloadJson.addEventListener("click", function () {
          if (!state.sharePayload || !state.sharePayload.json) return;
          var sid = state.selectedId || "student";
          download("student-summary-" + sid + ".json", JSON.stringify(state.sharePayload.json, null, 2), "application/json");
          setCoachLine("Downloaded share summary JSON.");
        });
      }
      if (el.shareDownloadCsv) {
        el.shareDownloadCsv.addEventListener("click", function () {
          if (!state.sharePayload || !state.sharePayload.csv) return;
          var sid = state.selectedId || "student";
          download("student-summary-" + sid + ".csv", state.sharePayload.csv, "text/csv");
          setCoachLine("Downloaded share summary CSV.");
        });
      }

      if (el.sasLibraryBtn) {
        el.sasLibraryBtn.addEventListener("click", openSasLibraryModal);
      }
      if (el.sasLibraryClose) {
        el.sasLibraryClose.addEventListener("click", closeSasLibraryModal);
      }
      if (el.sasSearch) {
        el.sasSearch.addEventListener("input", renderSasLibraryResults);
      }
      if (Array.isArray(el.sasTabs)) {
        el.sasTabs.forEach(function (tabBtn) {
          tabBtn.addEventListener("click", function () {
            state.sasTab = String(tabBtn.getAttribute("data-sas-tab") || "interventions");
            renderSasLibraryResults();
          });
        });
      }
      if (el.sasApplyPlan) {
        el.sasApplyPlan.addEventListener("click", applySelectedSasItemToPlan);
      }

      if (el.exportStudentCsv) {
        el.exportStudentCsv.addEventListener("click", function () {
          if (!state.selectedId || !window.CSEvidence || typeof window.CSEvidence.exportStudentCSV !== "function") return;
          var csv = window.CSEvidence.exportStudentCSV(state.selectedId);
          if (navigator.clipboard) navigator.clipboard.writeText(csv).catch(function () {});
          setCoachLine("Copied student session CSV.");
        });
      }
      if (el.exportJson) {
        el.exportJson.addEventListener("click", function () {
          if (!Evidence || typeof Evidence.exportStudentSnapshot !== "function") return;
          var id = state.selectedId || (state.caseload[0] && state.caseload[0].id) || "demo-student";
          var jsonPayload = (window.CSEvidence && typeof window.CSEvidence.exportStudentJSON === "function")
            ? window.CSEvidence.exportStudentJSON(id)
            : JSON.stringify(Evidence.exportStudentSnapshot(id).json, null, 2);
          download("student-summary-" + id + ".json", jsonPayload, "application/json");
          setCoachLine("Exported student summary JSON.");
        });
      }
      if (el.copyCsv) {
        el.copyCsv.addEventListener("click", function () {
          if (!Evidence || typeof Evidence.rosterCSV !== "function") return;
          var csv = Evidence.rosterCSV();
          if (navigator.clipboard) navigator.clipboard.writeText(csv).catch(function () {});
          setCoachLine("Copied roster CSV.");
        });
      }
      if (el.copySummary) {
        el.copySummary.addEventListener("click", function () {
          if (!state.selectedId || !Evidence || typeof Evidence.getStudentSummary !== "function") return;
          var summary = Evidence.getStudentSummary(state.selectedId);
          var text = [
            summary.student.name + " (" + summary.student.id + ")",
            "Focus: " + summary.focus,
            "Recommended next step: " + summary.nextMove.line
          ].join("\n");
          if (navigator.clipboard) navigator.clipboard.writeText(text).catch(function () {});
          setCoachLine("Copied family/admin summary.");
        });
      }
      if (el.supportExportPacket) {
        el.supportExportPacket.addEventListener("click", function () {
          if (!state.selectedId || !SupportStore || typeof SupportStore.exportReferralPacket !== "function") return;
          var packet = SupportStore.exportReferralPacket(state.selectedId);
          download("referral-packet-" + state.selectedId + ".html", packet.html, "text/html");
          setCoachLine("Exported referral-ready evidence packet.");
        });
      }
    }

    return {
      bindEvents: bindEvents,
      openShareModal: openShareModal,
      closeShareModal: closeShareModal,
      openSasLibraryModal: openSasLibraryModal,
      closeSasLibraryModal: closeSasLibraryModal,
      renderSasLibraryResults: renderSasLibraryResults,
      applySelectedSasItemToPlan: applySelectedSasItemToPlan,
      getSelectedStudentGradeBand: getSelectedStudentGradeBand
    };
  }

  window.CSDashboardSupport = {
    create: create,
    getSelectedStudent: getSelectedStudent
  };
})();
