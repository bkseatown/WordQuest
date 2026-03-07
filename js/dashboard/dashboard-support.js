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
    var TeacherSupportService = deps.TeacherSupportService || null;
    var WorkspaceSupportContent = deps.WorkspaceSupportContent || null;
    var WeeklyInsightGenerator = deps.WeeklyInsightGenerator || null;
    var MeetingTranslation = deps.MeetingTranslation || null;

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

    function getRecentSessions(studentId, query) {
      if (TeacherSupportService && typeof TeacherSupportService.getRecentSessions === "function") {
        return TeacherSupportService.getRecentSessions(studentId, query, { Evidence: Evidence });
      }
      return Evidence && typeof Evidence.getRecentSessions === "function" ? Evidence.getRecentSessions(studentId, query || {}) : [];
    }

    function buildShareSummaryText(studentId) {
      var summary = getStudentSummary(studentId);
      if (!summary) return "";
      var sessions = getRecentSessions(studentId, { limit: 1 });
      var row = sessions[0] || {};
      var sig = row.signals || {};
      var rec = (window.CSEvidence && typeof window.CSEvidence.recommendNextSteps === "function")
        ? window.CSEvidence.recommendNextSteps(sig)
        : { bullets: [summary.nextMove.line] };
      return WorkspaceSupportContent && typeof WorkspaceSupportContent.buildShareSummaryText === "function"
        ? WorkspaceSupportContent.buildShareSummaryText({
            summary: summary,
            sessions: sessions,
            recommendation: rec
          })
        : "";
    }

    function buildSharePayload(studentId) {
      var summary = getStudentSummary(studentId);
      if (!summary) {
        return { text: "", json: {}, csv: "" };
      }
      var sid = String(studentId || "");
      var model = Evidence && typeof Evidence.getSkillModel === "function"
        ? Evidence.getSkillModel(sid)
        : { studentId: sid, mastery: {}, topNeeds: [] };
      var recentSessions = getRecentSessions(sid, { limit: 7 });
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
      var recommendation = recentSessions[0] && recentSessions[0].signals && window.CSEvidence && typeof window.CSEvidence.recommendNextSteps === "function"
        ? window.CSEvidence.recommendNextSteps(recentSessions[0].signals)
        : { bullets: [summary.nextMove && summary.nextMove.line || "Continue focused support."] };
      var weeklyInsights = buildWeeklyInsightDraft(studentId, summary, model, recentSessions, teacherNotes);
      var payload = WorkspaceSupportContent && typeof WorkspaceSupportContent.buildSharePayload === "function"
        ? WorkspaceSupportContent.buildSharePayload({
            studentId: sid,
            summary: summary,
            model: model,
            recentSessions: recentSessions,
            plan: plan,
            teacherNotes: teacherNotes,
            recommendation: recommendation,
            ShareSummaryAPI: ShareSummaryAPI
          })
        : { text: "", json: {}, csv: "" };
      payload.weeklyInsights = weeklyInsights;
      if (weeklyInsights) {
        payload.text = [
          "Teacher Summary",
          weeklyInsights.teacherSummary || "",
          "",
          "Family Summary",
          weeklyInsights.familySummary || "",
          "",
          "Student Reflection",
          weeklyInsights.studentReflection || ""
        ].join("\n");
        if (payload.json && typeof payload.json === "object") {
          payload.json.weeklyInsights = weeklyInsights;
        }
      }
      return payload;
    }

    function buildWeeklyInsightDraft(studentId, summary, model, recentSessions, teacherNotes) {
      if (!WeeklyInsightGenerator || typeof WeeklyInsightGenerator.generateWeeklyInsights !== "function") return null;
      var supportProfile = SupportStore && typeof SupportStore.getStudent === "function"
        ? (SupportStore.getStudent(studentId) || {})
        : {};
      var lessonContexts = [];
      if (deps.TeacherSelectors && deps.TeacherStorage && typeof deps.TeacherStorage.loadLessonContexts === "function") {
        var lessonMap = deps.TeacherStorage.loadLessonContexts();
        lessonContexts = Object.keys(lessonMap || {}).map(function (key) { return lessonMap[key]; }).slice(0, 3);
      }
      var insightData = WeeklyInsightGenerator.generateWeeklyInsights({
        studentId: studentId,
        summary: summary,
        model: model,
        recentSessions: recentSessions,
        supportProfile: supportProfile,
        lessonContexts: lessonContexts,
        teacherNotes: teacherNotes,
        subject: summary && summary.focus || "",
        goalLine: summary && summary.nextMove && summary.nextMove.line || ""
      });
      return {
        data: insightData,
        teacherSummary: WeeklyInsightGenerator.generateTeacherSummary(insightData),
        familySummary: WeeklyInsightGenerator.generateFamilySummary(insightData),
        studentReflection: WeeklyInsightGenerator.generateStudentReflection(insightData)
      };
    }

    function populateWeeklyInsightFields(draft) {
      if (el.weeklyTeacher) el.weeklyTeacher.value = draft && draft.teacherSummary || "";
      if (el.weeklyFamily) el.weeklyFamily.value = draft && draft.familySummary || "";
      if (el.weeklyStudent) el.weeklyStudent.value = draft && draft.studentReflection || "";
      if (el.weeklyFamilyTranslation) {
        el.weeklyFamilyTranslation.value = "";
        el.weeklyFamilyTranslation.classList.add("hidden");
      }
      if (el.weeklyTranslationBadge) el.weeklyTranslationBadge.classList.add("hidden");
    }

    function buildCombinedWeeklyPreview() {
      return [
        "Teacher Summary",
        String(el.weeklyTeacher && el.weeklyTeacher.value || ""),
        "",
        "Family Summary",
        String(el.weeklyFamily && el.weeklyFamily.value || ""),
        "",
        "Student Reflection",
        String(el.weeklyStudent && el.weeklyStudent.value || "")
      ].join("\n");
    }

    function syncCombinedPreview() {
      if (el.sharePreview) el.sharePreview.value = buildCombinedWeeklyPreview();
      if (state.sharePayload) state.sharePayload.text = buildCombinedWeeklyPreview();
      if (state.sharePayload && state.sharePayload.json && state.sharePayload.json.weeklyInsights) {
        state.sharePayload.json.weeklyInsights.teacherSummary = String(el.weeklyTeacher && el.weeklyTeacher.value || "");
        state.sharePayload.json.weeklyInsights.familySummary = String(el.weeklyFamily && el.weeklyFamily.value || "");
        state.sharePayload.json.weeklyInsights.studentReflection = String(el.weeklyStudent && el.weeklyStudent.value || "");
      }
    }

    function translateFamilyDraft() {
      if (!el.weeklyFamily || !el.weeklyFamilyTranslation || !el.weeklyFamilyLanguage || !MeetingTranslation || typeof MeetingTranslation.translateText !== "function") return;
      var language = String(el.weeklyFamilyLanguage.value || "en");
      if (language === "en") {
        el.weeklyFamilyTranslation.classList.add("hidden");
        if (el.weeklyTranslationBadge) el.weeklyTranslationBadge.classList.add("hidden");
        return;
      }
      el.weeklyFamilyTranslation.value = MeetingTranslation.translateText(el.weeklyFamily.value || "", language);
      el.weeklyFamilyTranslation.classList.remove("hidden");
      if (el.weeklyTranslationBadge) {
        el.weeklyTranslationBadge.textContent = "Assisted draft translation — review recommended (" + MeetingTranslation.languageLabel(language) + ")";
        el.weeklyTranslationBadge.classList.remove("hidden");
      }
    }

    function closeShareModal() {
      if (modalController) modalController.hide("share");
    }

    function openShareModal(studentId) {
      if (!el.shareModal || !el.sharePreview || !studentId) return;
      var payload = buildSharePayload(studentId);
      state.sharePayload = payload;
      state.weeklyInsightDraft = payload.weeklyInsights || null;
      populateWeeklyInsightFields(state.weeklyInsightDraft);
      syncCombinedPreview();
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
          var link = appendStudentParam("./reports.html", state.selectedId);
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
          syncCombinedPreview();
          var text = state.sharePayload && state.sharePayload.text ? state.sharePayload.text : "";
          if (!text) return;
          if (navigator.clipboard) navigator.clipboard.writeText(text).catch(function () {});
          setCoachLine("Copied share summary.");
        });
      }
      [el.weeklyTeacher, el.weeklyFamily, el.weeklyStudent].forEach(function (field) {
        if (!field) return;
        field.addEventListener("input", syncCombinedPreview);
      });
      if (el.weeklyTranslateFamily) {
        el.weeklyTranslateFamily.addEventListener("click", function () {
          translateFamilyDraft();
          setCoachLine("Family translation draft updated.");
        });
      }
      document.addEventListener("click", function (e) {
        var copyBtn = e.target.closest && e.target.closest("[data-weekly-copy]");
        if (!copyBtn) return;
        var channel = copyBtn.getAttribute("data-weekly-copy") || "teacher";
        var text = channel === "family"
          ? String(el.weeklyFamily && el.weeklyFamily.value || "")
          : channel === "student"
            ? String(el.weeklyStudent && el.weeklyStudent.value || "")
            : String(el.weeklyTeacher && el.weeklyTeacher.value || "");
        if (!text) return;
        copyText(text, function () {
          setCoachLine("Copied " + channel + " weekly draft.");
        });
      });
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
          if (!state.selectedId) return;
          var summary = getStudentSummary(state.selectedId);
          if (!summary) return;
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
