(function meetingNotesModule(root, factory) {
  if (typeof module === "object" && module.exports) {
    module.exports = factory();
    return;
  }
  root.CSMeetingNotes = factory();
})(typeof self !== "undefined" ? self : this, function () {
  "use strict";

  var templates = {
    SSM: {
      agenda: "Data review, support barriers, immediate next steps",
      concerns: "Classroom access and consistency with accommodations",
      strengths: "Student engagement moments and recent growth",
      dataReviewed: "MAP / classroom work samples / intervention logs"
    },
    MDT: {
      agenda: "Multi-disciplinary review and referral readiness",
      concerns: "Cross-setting impact and fidelity of supports",
      strengths: "Progress in targeted domain and participation",
      dataReviewed: "Tier 1/2 logs, progress trends, accommodations implementation"
    },
    Parent: {
      agenda: "Home-school partnership goals and practical supports",
      concerns: "Completion stress and confidence dips",
      strengths: "Effort, strengths, and interests to leverage",
      dataReviewed: "Recent class samples and intervention highlights"
    }
  };

  function toActionItems(text) {
    return String(text || "")
      .split(/\r?\n/)
      .map(function (line) { return line.trim(); })
      .filter(Boolean)
      .slice(0, 8)
      .map(function (line, idx) {
        return {
          id: "act_" + Date.now().toString(36) + "_" + idx,
          text: line,
          owner: "",
          dueDate: ""
        };
      });
  }

  function toDraftGoals(actionItems) {
    var rows = Array.isArray(actionItems) ? actionItems : [];
    return rows.slice(0, 5).map(function (item, idx) {
      return {
        id: "goal_" + Date.now().toString(36) + "_" + idx,
        domain: "literacy",
        skill: item.text.slice(0, 90),
        baseline: "Current classroom baseline",
        target: "Measurable improvement in 6-8 weeks",
        metric: "Teacher + intervention evidence",
        method: "Weekly progress check",
        schedule: "2-3x/week",
        reviewEveryDays: 14,
        notes: "Converted from meeting action item"
      };
    });
  }

  function supportsSpeechRecognition() {
    return !!(typeof window !== "undefined" && (window.SpeechRecognition || window.webkitSpeechRecognition));
  }

  function createRecognizer(handlers) {
    if (!supportsSpeechRecognition()) return null;
    var RecognitionCtor = window.SpeechRecognition || window.webkitSpeechRecognition;
    var recognition = new RecognitionCtor();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = "en-US";

    var active = false;
    recognition.onstart = function () {
      active = true;
      if (handlers && typeof handlers.onStatus === "function") handlers.onStatus("live");
    };
    recognition.onend = function () {
      active = false;
      if (handlers && typeof handlers.onStatus === "function") handlers.onStatus("stopped");
    };
    recognition.onerror = function (event) {
      if (handlers && typeof handlers.onError === "function") {
        handlers.onError(event && event.error ? String(event.error) : "speech-error");
      }
    };
    recognition.onresult = function (event) {
      var finalText = "";
      for (var i = event.resultIndex; i < event.results.length; i += 1) {
        var part = event.results[i] && event.results[i][0] ? event.results[i][0].transcript : "";
        if (event.results[i].isFinal) finalText += part + " ";
      }
      if (finalText && handlers && typeof handlers.onTranscript === "function") {
        handlers.onTranscript(finalText.trim());
      }
    };

    return {
      start: function () {
        try { recognition.start(); } catch (_e) {}
      },
      stop: function () {
        try { recognition.stop(); } catch (_e) {}
      },
      isActive: function () { return active; }
    };
  }

  return {
    templates: templates,
    toActionItems: toActionItems,
    toDraftGoals: toDraftGoals,
    supportsSpeechRecognition: supportsSpeechRecognition,
    createRecognizer: createRecognizer
  };
});
