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
    var WeeklyInsightGenerator = deps.WeeklyInsightGenerator || null;

    function buildWeeklyInsight(reportContext) {
      if (!WeeklyInsightGenerator || typeof WeeklyInsightGenerator.generateWeeklyInsights !== "function") return null;
      var insight = WeeklyInsightGenerator.generateWeeklyInsights({
        summary: reportContext && reportContext.summary,
        studentProfile: reportContext && reportContext.studentProfile,
        subject: reportContext && reportContext.summary && reportContext.summary.focus,
        goalLine: reportContext && reportContext.literacyData && reportContext.literacyData.nextStep,
        suggestedHomeSupport: reportContext && reportContext.reportDraft && reportContext.reportDraft.recommendedNextSteps
      });
      return {
        teacher: WeeklyInsightGenerator.generateTeacherSummary(insight),
        family: WeeklyInsightGenerator.generateFamilySummary(insight),
        student: WeeklyInsightGenerator.generateStudentReflection(insight)
      };
    }

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

    function summarizeText(text, maxLength) {
      var clean = String(text || "").replace(/\s+/g, " ").trim();
      if (!clean) return "";
      var limit = Number(maxLength || 140);
      if (clean.length <= limit) return clean;
      return clean.slice(0, limit).replace(/[,\s.;:!?-]+$/, "") + "...";
    }

    function getMeetingFormatLabel() {
      var value = String(state.meetingFormat || "sas");
      if (value === "optimized") return "Optimized narrative";
      if (value === "family") return "Family summary";
      return "SAS-compliant";
    }

    function renderMeetingSetupSummary() {
      if (!el.meetingSetupSummary) return;
      var language = getMeetingLanguage();
      var languageLabel = "English";
      if (el.meetingLanguage && el.meetingLanguage.selectedOptions && el.meetingLanguage.selectedOptions[0]) {
        languageLabel = String(el.meetingLanguage.selectedOptions[0].textContent || "English").trim();
      }
      var typeLabel = "SSM";
      if (el.meetingType && el.meetingType.selectedOptions && el.meetingType.selectedOptions[0]) {
        typeLabel = String(el.meetingType.selectedOptions[0].textContent || "SSM").trim();
      }
      var chips = [
        typeLabel,
        getMeetingFormatLabel(),
        languageLabel,
        state.liveTranslate ? "Live translate on" : "Manual capture"
      ];
      el.meetingSetupSummary.innerHTML = chips.map(function (chip) {
        return "<span class=\"td-meeting-setup-summary__chip\">" + escHtml(chip) + "</span>";
      }).join("");
    }

    function renderMeetingControlsVisibility() {
      var activeTab = String(state.workspaceTab || "summary");
      var expanded = !!state.meetingSetupExpanded;
      var shouldShow = activeTab !== "summary" || expanded;
      if (el.meetingControlsShell) {
        el.meetingControlsShell.classList.toggle("hidden", !shouldShow);
      }
      if (el.meetingSetupToggle) {
        el.meetingSetupToggle.textContent = shouldShow ? "Hide setup" : "Adjust setup";
      }
      if (el.meetingExportStrip) {
        el.meetingExportStrip.classList.toggle("hidden", activeTab !== "export");
      }
      if (el.meetingActionsStrip) {
        el.meetingActionsStrip.classList.toggle("hidden", activeTab === "summary" || activeTab === "deck");
      }
      if (el.meetingSttStatus) {
        el.meetingSttStatus.classList.toggle("hidden", activeTab === "export");
      }
    }

    function renderWorkspacePanels() {
      renderMeetingSetupSummary();
      if (el.workspaceSummaryPanel) {
        var lang = getMeetingLanguage();
        var report = state.reportDraft;
        if (report && ReportingGenerator && typeof ReportingGenerator.translateReport === "function") {
          report = ReportingGenerator.translateReport(report, lang);
        }
        if (report) {
          var topNeeds = state.reportContext && state.reportContext.summary && Array.isArray(state.reportContext.summary.topNeeds)
            ? state.reportContext.summary.topNeeds.filter(Boolean)
            : [];
          var readinessCards = [
            {
              label: "Packet",
              value: "Ready",
              detail: "Executive, tier, family, and weekly draft in one view."
            },
            {
              label: "Focus",
              value: topNeeds.slice(0, 2).join(" + ") || "Instruction",
              detail: topNeeds.length ? (topNeeds.length + " aligned skill signals pulled in.") : "Aligned need signal available."
            },
            {
              label: "Family",
              value: lang === "en" ? "English" : lang.toUpperCase(),
              detail: lang === "en" ? "Family summary ready to review." : "Translation assist enabled for review."
            }
          ];
          var weeklyInsight = buildWeeklyInsight({
            summary: state.reportContext && state.reportContext.summary,
            studentProfile: state.reportContext && state.reportContext.studentProfile,
            literacyData: state.reportContext && state.reportContext.literacyData,
            reportDraft: report
          });
          var storyCards = [
            {
              label: "Executive snapshot",
              title: "What matters most",
              detail: summarizeText(report.executiveSummary || "", 160)
            },
            {
              label: "Tier signal",
              title: "Support level",
              detail: summarizeText(report.tierStatement || "", 150)
            },
            {
              label: "Family view",
              title: lang === "en" ? "Ready in English" : "Translation assist on",
              detail: summarizeText(report.parentSummary || "", 150)
            }
          ];
          if (weeklyInsight) {
            storyCards.push({
              label: "Weekly insight",
              title: "Teacher draft ready",
              detail: summarizeText(weeklyInsight.teacher || "", 150)
            });
          }
          el.workspaceSummaryPanel.innerHTML = [
            "<section class=\"td-workspace-summary-hero\"><div><p class=\"td-workspace-summary-kicker\">Meeting packet</p><h3>Ready to review before you export.</h3><p class=\"td-workspace-summary-line\">Scan the packet first. Open Notes only when you need to capture the live meeting.</p></div><div class=\"td-workspace-summary-hero__signal\"><span>Packet status</span><strong>Ready</strong><p>Drafts, family view, and support signal are already pulled in.</p></div></section>",
            "<section class=\"td-workspace-summary-cards\">" + readinessCards.map(function (card) {
              return "<article class=\"td-workspace-summary-card\"><span>" + escHtml(card.label) + "</span><strong>" + escHtml(card.value) + "</strong><p>" + escHtml(card.detail) + "</p></article>";
            }).join("") + "</section>",
            "<section class=\"td-workspace-story-grid\">" + storyCards.map(function (card) {
              return "<article class=\"td-workspace-story-card\"><span>" + escHtml(card.label) + "</span><strong>" + escHtml(card.title) + "</strong><p>" + escHtml(card.detail) + "</p></article>";
            }).join("") + "</section>"
          ].join("");
          el.workspaceSummaryPanel.scrollTop = 0;
        } else {
          el.workspaceSummaryPanel.innerHTML = "<section><p>Generate report context by selecting a student.</p></section>";
          el.workspaceSummaryPanel.scrollTop = 0;
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
      if (next === "summary") {
        state.meetingSetupExpanded = false;
      } else {
        state.meetingSetupExpanded = true;
      }
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
      if (el.meetingPreview) el.meetingPreview.classList.toggle("hidden", next !== "export");
      if (el.meetingTranslationPreview) el.meetingTranslationPreview.classList.toggle("hidden", next !== "export");
      if (el.meetingTranslationBadge) el.meetingTranslationBadge.classList.toggle("hidden", next !== "export" || getMeetingLanguage() === "en");
      renderMeetingControlsVisibility();
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
        state.reportContext = context;
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
      state.meetingSetupExpanded = false;

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
      if (el.meetingSetupToggle) {
        el.meetingSetupToggle.addEventListener("click", function () {
          state.meetingSetupExpanded = !state.meetingSetupExpanded;
          renderMeetingControlsVisibility();
        });
      }
      if (el.meetingType) {
        el.meetingType.addEventListener("change", function () {
          open();
          renderMeetingSetupSummary();
        });
      }
      if (el.meetingFormatButtons && el.meetingFormatButtons.length) {
        el.meetingFormatButtons.forEach(function (btn) {
          btn.addEventListener("click", function () {
            state.meetingFormat = String(btn.getAttribute("data-meeting-format") || "sas");
            el.meetingFormatButtons.forEach(function (item) {
              item.classList.toggle("is-active", item === btn);
            });
            renderOutput();
            renderMeetingSetupSummary();
          });
        });
      }
      if (el.meetingLanguage) {
        el.meetingLanguage.addEventListener("change", function () {
          state.meetingLanguage = String(el.meetingLanguage.value || "en");
          renderOutput();
          renderMeetingSetupSummary();
        });
      }
      if (el.meetingLiveTranslate) {
        el.meetingLiveTranslate.addEventListener("change", function () {
          state.liveTranslate = !!el.meetingLiveTranslate.checked;
          renderOutput();
          renderMeetingSetupSummary();
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
