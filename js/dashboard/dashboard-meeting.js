(function dashboardMeetingModule() {
  "use strict";

  function setWorkspaceState(store, patch) {
    if (!store || typeof store.updateMeetingWorkspace !== "function") return;
    store.updateMeetingWorkspace(patch || {});
  }

  function create(options) {
    var config = options && typeof options === "object" ? options : {};
    var state = config.state || {};
    var el = config.el || {};
    var appState = config.appState || null;
    var modalController = config.modalController || null;
    var hooks = config.hooks || {};
    var deps = config.deps || {};

    var MeetingNotes = deps.MeetingNotes || null;
    var MeetingTranslation = deps.MeetingTranslation || null;
    var ReportingGenerator = deps.ReportingGenerator || null;
    var MeetingGenerator = deps.MeetingGenerator || null;
    var SupportStore = deps.SupportStore || null;
    var Evidence = deps.Evidence || null;
    var TeacherSupportService = deps.TeacherSupportService || null;
    var WorkspaceMeetingContent = deps.WorkspaceMeetingContent || null;

    function escHtml(value) {
      if (typeof hooks.escHtml === "function") return hooks.escHtml(value);
      return String(value == null ? "" : value)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/\"/g, "&quot;")
        .replace(/'/g, "&#39;");
    }

    function setCoachLine(text) {
      if (typeof hooks.setCoachLine === "function") hooks.setCoachLine(text);
    }

    function download(name, contents, mime) {
      if (typeof hooks.download === "function") {
        hooks.download(name, contents, mime);
      }
    }

    function getSelectedPlanRow() {
      return typeof hooks.getSelectedPlanRow === "function" ? hooks.getSelectedPlanRow() : null;
    }

    function buildReportingContext(row) {
      return typeof hooks.buildReportingContext === "function" ? hooks.buildReportingContext(row) : null;
    }

    function renderSupportHub(studentId) {
      if (typeof hooks.renderSupportHub === "function") hooks.renderSupportHub(studentId);
    }

    function updateMeetingWorkspaceState(patch) {
      if (appState && typeof appState.updateMeetingWorkspace === "function") {
        setWorkspaceState(appState, patch || {});
      }
    }

    function insertAtCursor(text) {
      if (!el.meetingNotes) return;
      var noteText = String(text || "");
      var area = el.meetingNotes;
      var start = typeof area.selectionStart === "number" ? area.selectionStart : area.value.length;
      var end = typeof area.selectionEnd === "number" ? area.selectionEnd : area.value.length;
      var prefix = area.value.slice(0, start);
      var suffix = area.value.slice(end);
      area.value = prefix + noteText + suffix;
      var nextPos = prefix.length + noteText.length;
      area.selectionStart = area.selectionEnd = nextPos;
      area.focus();
    }

    function updateMeetingSttStatus(text, tone) {
      if (!el.meetingSttStatus) return;
      el.meetingSttStatus.textContent = String(text || "");
      el.meetingSttStatus.classList.toggle("is-live", tone === "live");
      el.meetingSttStatus.classList.toggle("is-warn", tone === "warn");
    }

    function stopRecognition() {
      if (state.meetingRecognizer && typeof state.meetingRecognizer.stop === "function") {
        state.meetingRecognizer.stop();
      }
      state.meetingRecognizer = null;
      if (el.meetingSttStop) el.meetingSttStop.disabled = true;
      if (el.meetingSttStart && MeetingNotes && typeof MeetingNotes.supportsSpeechRecognition === "function") {
        el.meetingSttStart.disabled = !MeetingNotes.supportsSpeechRecognition();
      }
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

    function meetingStudentContext() {
      var sid = state.selectedId || "student";
      var summary = getStudentSummary(sid);
      var model = Evidence && typeof Evidence.getSkillModel === "function"
        ? Evidence.getSkillModel(sid)
        : { topNeeds: [] };
      return WorkspaceMeetingContent && typeof WorkspaceMeetingContent.meetingStudentContext === "function"
        ? WorkspaceMeetingContent.meetingStudentContext({
            studentId: sid,
            summary: summary,
            model: model
          })
        : {
            sid: sid,
            studentName: summary && summary.student ? summary.student.name : sid,
            topNeeds: ["decoding accuracy"],
            riskText: "steady support",
            nextMove: summary && summary.nextMove ? summary.nextMove.line : "continue focused practice"
          };
    }

    function buildParentActions(context) {
      return WorkspaceMeetingContent && typeof WorkspaceMeetingContent.buildParentActions === "function"
        ? WorkspaceMeetingContent.buildParentActions(context)
        : [];
    }

    function buildFamilySummary(context, notesText, actionsText) {
      return WorkspaceMeetingContent && typeof WorkspaceMeetingContent.buildFamilySummary === "function"
        ? WorkspaceMeetingContent.buildFamilySummary(context, notesText, actionsText, {
            MeetingTranslation: MeetingTranslation
          })
        : "";
    }

    function buildMeetingNarrative(format, notesText, actionsText) {
      return WorkspaceMeetingContent && typeof WorkspaceMeetingContent.buildMeetingNarrative === "function"
        ? WorkspaceMeetingContent.buildMeetingNarrative(format, notesText, actionsText, {
            summary: getStudentSummary(state.selectedId || "student"),
            model: Evidence && typeof Evidence.getSkillModel === "function"
              ? Evidence.getSkillModel(state.selectedId || "student")
              : { topNeeds: [] },
            studentId: state.selectedId || "student",
            meetingType: el.meetingType ? String(el.meetingType.value || "SSM") : "SSM",
            MeetingTranslation: MeetingTranslation
          })
        : "";
    }

    function getMeetingLanguage() {
      if (!el.meetingLanguage) return "en";
      return String(el.meetingLanguage.value || "en");
    }

    function renderWorkspacePanels() {
      if (el.workspaceSummaryPanel) {
        var lang = getMeetingLanguage();
        var report = state.reportDraft;
        if (report && ReportingGenerator && typeof ReportingGenerator.translateReport === "function") {
          report = ReportingGenerator.translateReport(report, lang);
        }
        if (report) {
          el.workspaceSummaryPanel.innerHTML = [
            "<section><h3>Executive Summary</h3><p>" + escHtml(report.executiveSummary || "") + "</p></section>",
            "<section><h3>Tier Statement</h3><p>" + escHtml(report.tierStatement || "") + "</p></section>",
            "<section><h3>Executive Function &amp; Organizational Support</h3><p>" + escHtml(report.executiveFunctionSupport || "") + "</p></section>",
            "<section><h3>Parent Summary</h3><p>" + escHtml(report.parentSummary || "") + "</p></section>"
          ].join("");
        } else {
          el.workspaceSummaryPanel.innerHTML = "<section><p>Generate report context by selecting a student.</p></section>";
        }
      }

      if (el.workspaceDeckPanel) {
        var deck = Array.isArray(state.meetingDeck) ? state.meetingDeck : [];
        if (!deck.length) {
          el.workspaceDeckPanel.innerHTML = "<h3>No deck generated</h3><p>Use Meeting & Reports after selecting a student.</p>";
        } else {
          var index = Math.max(0, Math.min(deck.length - 1, Number(state.meetingDeckIndex || 0)));
          var slide = deck[index] || {};
          el.workspaceDeckPanel.innerHTML = "<h3>" + escHtml(slide.title || "Slide") + "</h3><ul>" +
            (Array.isArray(slide.contentBlocks) ? slide.contentBlocks : []).map(function (line) {
              return "<li>" + escHtml(String(line || "")) + "</li>";
            }).join("") + "</ul>";
        }
      }
    }

    function renderOutput() {
      var notesText = String(el.meetingNotes && el.meetingNotes.value || "").trim();
      var actionsText = String(el.meetingActions && el.meetingActions.value || "").trim();
      var english = buildMeetingNarrative(state.meetingFormat || "sas", notesText, actionsText);
      if (el.meetingPreview) el.meetingPreview.value = english;

      var language = state.meetingLanguage || getMeetingLanguage();
      var translated = english;
      if (MeetingTranslation && typeof MeetingTranslation.translateText === "function") {
        translated = MeetingTranslation.translateText(english, language);
      }

      var showTranslated = language !== "en" || !!state.liveTranslate;
      if (el.meetingTranslationPreview) {
        el.meetingTranslationPreview.classList.toggle("hidden", !showTranslated);
        if (showTranslated) {
          if (!state.liveTranslate || !String(el.meetingTranslationPreview.value || "").trim()) {
            el.meetingTranslationPreview.value = translated;
          }
        }
      }
      if (el.meetingTranslationBadge) {
        el.meetingTranslationBadge.classList.toggle("hidden", language === "en");
        if (language !== "en" && MeetingTranslation && typeof MeetingTranslation.languageLabel === "function") {
          el.meetingTranslationBadge.textContent = "Assisted draft translation — review recommended (" + MeetingTranslation.languageLabel(language) + ")";
        }
      }

      renderWorkspacePanels();
    }

    function setTab(tab) {
      var next = String(tab || "summary");
      state.workspaceTab = next;
      updateMeetingWorkspaceState({ tab: next });

      var map = {
        summary: el.workspaceTabSummary,
        deck: el.workspaceTabDeck,
        notes: el.workspaceTabNotes,
        export: el.workspaceTabExport
      };
      Object.keys(map).forEach(function (key) {
        if (map[key]) map[key].classList.toggle("is-active", key === next);
      });

      if (el.workspaceSummaryPanel) el.workspaceSummaryPanel.classList.toggle("hidden", next !== "summary");
      if (el.workspaceDeckPanel) el.workspaceDeckPanel.classList.toggle("hidden", next !== "deck");
      if (el.meetingNotes) el.meetingNotes.classList.toggle("hidden", next !== "notes");
      if (el.meetingActions) el.meetingActions.classList.toggle("hidden", next !== "notes");
      if (el.meetingPreview) el.meetingPreview.classList.toggle("hidden", next === "deck");
    }

    function buildExportHtml(mode, englishText, translatedText, language) {
      return WorkspaceMeetingContent && typeof WorkspaceMeetingContent.buildExportHtml === "function"
        ? WorkspaceMeetingContent.buildExportHtml(mode, englishText, translatedText, language, {
            MeetingTranslation: MeetingTranslation
          })
        : "";
    }

    function buildClipboardSummary() {
      var english = String(el.meetingPreview && el.meetingPreview.value || "").trim();
      if (!english) {
        renderOutput();
        english = String(el.meetingPreview && el.meetingPreview.value || "").trim();
      }
      var language = getMeetingLanguage();
      if (language === "en") return english;
      var translated = String(el.meetingTranslationPreview && el.meetingTranslationPreview.value || "").trim();
      return [
        english,
        "",
        "Assisted draft translation — review recommended",
        translated || english
      ].join("\n");
    }

    function open() {
      if (!el.meetingModal) return;
      updateMeetingWorkspaceState({ open: true });

      var row = getSelectedPlanRow();
      var context = buildReportingContext(row);
      if (context && ReportingGenerator && typeof ReportingGenerator.generateStudentReport === "function") {
        state.reportDraft = ReportingGenerator.generateStudentReport(context.studentProfile, context.literacyData, context.numeracyData);
      }
      if (context && MeetingGenerator && typeof MeetingGenerator.generateMeetingDeck === "function") {
        state.meetingDeck = MeetingGenerator.generateMeetingDeck({
          studentProfile: context.studentProfile,
          literacyData: context.literacyData,
          numeracyData: context.numeracyData,
          tierSignal: context.tierSignal,
          fidelityData: context.fidelityData,
          parentSummary: state.reportDraft && state.reportDraft.parentSummary
        }) || [];
        state.meetingDeckIndex = 0;
      }

      if (el.meetingType && MeetingNotes && MeetingNotes.templates) {
        var type = String(el.meetingType.value || "SSM");
        var preset = MeetingNotes.templates[type] || MeetingNotes.templates.SSM || {};
        var notesText = [
          "Agenda: " + String(preset.agenda || ""),
          "Concerns: " + String(preset.concerns || ""),
          "Strengths: " + String(preset.strengths || ""),
          "Data Reviewed: " + String(preset.dataReviewed || "")
        ].join("\n");
        if (el.meetingNotes) el.meetingNotes.value = notesText;
        if (el.meetingActions) el.meetingActions.value = "";
      }

      if (el.meetingFormatButtons && el.meetingFormatButtons.length) {
        el.meetingFormatButtons.forEach(function (btn) {
          btn.classList.toggle("is-active", btn.getAttribute("data-meeting-format") === state.meetingFormat);
        });
      }
      if (el.meetingLanguage) el.meetingLanguage.value = state.meetingLanguage || "en";
      if (el.meetingLiveTranslate) el.meetingLiveTranslate.checked = !!state.liveTranslate;

      var sttSupported = !!(MeetingNotes && typeof MeetingNotes.supportsSpeechRecognition === "function" && MeetingNotes.supportsSpeechRecognition());
      updateMeetingSttStatus(
        sttSupported
          ? "Transcription ready. Click Start STT to capture local text."
          : "Speech recognition unavailable in this browser. Manual notes mode is active.",
        sttSupported ? "" : "warn"
      );
      if (el.meetingSttStart) el.meetingSttStart.disabled = !sttSupported;
      if (el.meetingSttStop) el.meetingSttStop.disabled = true;

      renderOutput();
      setTab("summary");
      if (modalController) modalController.show("meeting", { openingClass: "is-opening", openingMs: 220 });
    }

    function close() {
      stopRecognition();
      updateMeetingWorkspaceState({ open: false });
      if (modalController) modalController.hide("meeting");
    }

    function bindEvents() {
      if (el.meetingClose) {
        el.meetingClose.addEventListener("click", close);
      }
      if (el.workspaceTabSummary) {
        el.workspaceTabSummary.addEventListener("click", function () { setTab("summary"); });
      }
      if (el.workspaceTabDeck) {
        el.workspaceTabDeck.addEventListener("click", function () { setTab("deck"); });
      }
      if (el.workspaceTabNotes) {
        el.workspaceTabNotes.addEventListener("click", function () { setTab("notes"); });
      }
      if (el.workspaceTabExport) {
        el.workspaceTabExport.addEventListener("click", function () { setTab("export"); });
      }
      if (el.meetingType) {
        el.meetingType.addEventListener("change", open);
      }
      if (el.meetingFormatButtons && el.meetingFormatButtons.length) {
        el.meetingFormatButtons.forEach(function (btn) {
          btn.addEventListener("click", function () {
            state.meetingFormat = String(btn.getAttribute("data-meeting-format") || "sas");
            el.meetingFormatButtons.forEach(function (item) {
              item.classList.toggle("is-active", item === btn);
            });
            renderOutput();
          });
        });
      }
      if (el.meetingLanguage) {
        el.meetingLanguage.addEventListener("change", function () {
          state.meetingLanguage = String(el.meetingLanguage.value || "en");
          renderOutput();
        });
      }
      if (el.meetingLiveTranslate) {
        el.meetingLiveTranslate.addEventListener("change", function () {
          state.liveTranslate = !!el.meetingLiveTranslate.checked;
          renderOutput();
        });
      }
      if (el.meetingNotes) {
        el.meetingNotes.addEventListener("input", function () {
          if (state.liveTranslate) renderOutput();
        });
      }
      if (el.meetingActions) {
        el.meetingActions.addEventListener("input", function () {
          if (state.liveTranslate) renderOutput();
        });
      }
      if (el.meetingSave) {
        el.meetingSave.addEventListener("click", function () {
          if (!state.selectedId || !SupportStore || typeof SupportStore.addMeeting !== "function") return;
          renderOutput();
          var canonicalEnglish = String(el.meetingPreview && el.meetingPreview.value || "").trim();
          var translatedOutput = String(el.meetingTranslationPreview && el.meetingTranslationPreview.value || "").trim();
          var meetingLanguage = getMeetingLanguage();
          var sttBanner = "Local-only notes. No audio recordings are stored by Cornerstone MTSS.";
          SupportStore.addMeeting(state.selectedId, {
            type: el.meetingType ? String(el.meetingType.value || "SSM") : "SSM",
            date: new Date().toISOString().slice(0, 10),
            attendees: "",
            agenda: (el.meetingNotes && el.meetingNotes.value || "").slice(0, 3000),
            notes: canonicalEnglish.slice(0, 3000),
            notesRaw: (el.meetingNotes && el.meetingNotes.value || "").slice(0, 3000),
            format: state.meetingFormat || "sas",
            language: meetingLanguage,
            translatedFromEnglish: meetingLanguage !== "en",
            translatedNotes: meetingLanguage !== "en" ? translatedOutput.slice(0, 3000) : "",
            liveTranslateMode: !!state.liveTranslate,
            decisions: "",
            actionItems: MeetingNotes && typeof MeetingNotes.toActionItems === "function"
              ? MeetingNotes.toActionItems(el.meetingActions && el.meetingActions.value || "")
              : [],
            sttNotice: sttBanner
          });
          renderSupportHub(state.selectedId);
          close();
          setCoachLine("Meeting notes saved (local-first).");
        });
      }
      if (el.meetingSttStart) {
        el.meetingSttStart.addEventListener("click", function () {
          if (!MeetingNotes || typeof MeetingNotes.createRecognizer !== "function") {
            updateMeetingSttStatus("Speech recognition unavailable. Manual notes mode is active.", "warn");
            return;
          }
          stopRecognition();
          state.meetingRecognizer = MeetingNotes.createRecognizer({
            onStatus: function (status) {
              if (status === "live") {
                updateMeetingSttStatus("Listening... transcription is local to this browser session.", "live");
                if (el.meetingSttStart) el.meetingSttStart.disabled = true;
                if (el.meetingSttStop) el.meetingSttStop.disabled = false;
                return;
              }
              updateMeetingSttStatus("Transcription stopped. Manual editing remains available.");
              if (el.meetingSttStart) {
                el.meetingSttStart.disabled = !(MeetingNotes && MeetingNotes.supportsSpeechRecognition && MeetingNotes.supportsSpeechRecognition());
              }
              if (el.meetingSttStop) el.meetingSttStop.disabled = true;
            },
            onTranscript: function (snippet) {
              if (!snippet) return;
              insertAtCursor((el.meetingNotes && el.meetingNotes.value ? " " : "") + snippet + " ");
            },
            onError: function (reason) {
              updateMeetingSttStatus("Transcription error: " + reason + ". Continue in manual mode.", "warn");
            }
          });
          if (!state.meetingRecognizer) {
            updateMeetingSttStatus("Speech recognition unavailable. Manual notes mode is active.", "warn");
            return;
          }
          state.meetingRecognizer.start();
        });
      }
      if (el.meetingSttStop) {
        el.meetingSttStop.addEventListener("click", function () {
          stopRecognition();
          updateMeetingSttStatus("Transcription stopped. Manual notes mode is active.");
        });
      }
      if (el.meetingStamp) {
        el.meetingStamp.addEventListener("click", function () {
          var stamp = "[" + new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) + "] ";
          insertAtCursor(stamp);
        });
      }
      if (el.meetingTagStudent) {
        el.meetingTagStudent.addEventListener("click", function () {
          if (!state.selectedId) return;
          insertAtCursor("[Student:" + state.selectedId + "] ");
        });
      }
      if (el.meetingTagTier) {
        el.meetingTagTier.addEventListener("click", function () {
          var tier = (el.metricTier && el.metricTier.textContent || "").match(/Tier\s*\d/)
            ? (el.metricTier.textContent.match(/Tier\s*\d/) || ["Tier 2"])[0]
            : "Tier 2";
          insertAtCursor("[" + tier + "] ");
        });
      }
      if (el.meetingCopySummary) {
        el.meetingCopySummary.addEventListener("click", function () {
          renderOutput();
          var text = buildClipboardSummary();
          if (navigator.clipboard) navigator.clipboard.writeText(text).catch(function () {});
          setCoachLine("Meeting summary copied.");
        });
      }
      if (el.meetingExportMdt) {
        el.meetingExportMdt.addEventListener("click", function () {
          if (!state.selectedId || !SupportStore || typeof SupportStore.buildMdtExport !== "function") return;
          renderOutput();
          var english = String(el.meetingPreview && el.meetingPreview.value || "").trim();
          var translated = String(el.meetingTranslationPreview && el.meetingTranslationPreview.value || "").trim();
          var lang = getMeetingLanguage();
          var exportMode = el.meetingExportFormat ? String(el.meetingExportFormat.value || "english") : "english";
          var exportText = exportMode === "english" ? english : buildClipboardSummary();
          var exportHtml = buildExportHtml(exportMode, english, translated, lang);
          var bundle = SupportStore.buildMdtExport(state.selectedId, { summary: exportText });
          download("mdt-export-" + state.selectedId + ".json", JSON.stringify(bundle.json, null, 2), "application/json");
          download("mdt-export-" + state.selectedId + ".csv", bundle.csv, "text/csv");
          download("meeting-summary-" + state.selectedId + ".html", exportHtml, "text/html");
          if (navigator.clipboard) navigator.clipboard.writeText(bundle.csv).catch(function () {});
          setCoachLine("MDT export generated and CSV copied.");
        });
      }
      if (el.meetingGoals) {
        el.meetingGoals.addEventListener("click", function () {
          if (!state.selectedId || !SupportStore || typeof SupportStore.addGoal !== "function") return;
          var actions = MeetingNotes && typeof MeetingNotes.toActionItems === "function"
            ? MeetingNotes.toActionItems(el.meetingActions && el.meetingActions.value || "")
            : [];
          var goals = MeetingNotes && typeof MeetingNotes.toDraftGoals === "function"
            ? MeetingNotes.toDraftGoals(actions)
            : [];
          goals.forEach(function (goal) { SupportStore.addGoal(state.selectedId, goal); });
          state.activeSupportTab = "plan";
          renderSupportHub(state.selectedId);
          setCoachLine("Converted action items to SMART-goal drafts.");
        });
      }
    }

    return {
      open: open,
      close: close,
      bindEvents: bindEvents,
      renderOutput: renderOutput,
      setTab: setTab,
      stopRecognition: stopRecognition
    };
  }

  window.CSDashboardMeeting = {
    create: create,
    setWorkspaceState: setWorkspaceState
  };
})();
