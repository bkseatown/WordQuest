(function initWritingStudio() {
  "use strict";

  var DRAFT_KEY = "ws_draft_v1";
  var FALLBACK_ACCENT = "#7aa7ff";
  var ACADEMIC_WORDS = ["analyze", "evidence", "infer", "structure", "contrast", "precise", "context", "impact", "support", "sequence"];
  var STARTER_VOCAB = ["because", "detail", "compare", "sequence", "evidence", "describe", "explain", "revise", "clarify", "conclude"];
  var CONJUNCTION_RE = /\b(and|but|or|so|because|although|however|therefore|while|if)\b/i;

  var body = document.body;
  var editor = document.getElementById("ws-editor");
  var metrics = document.getElementById("ws-metrics");
  var coach = document.getElementById("ws-coach");
  var vocab = document.getElementById("ws-vocab");
  var saveBtn = document.getElementById("ws-save");
  var clearBtn = document.getElementById("ws-clear");
  var modeButtons = Array.prototype.slice.call(document.querySelectorAll(".ws-chip[data-mode]"));
  var settingsBtn = document.getElementById("ws-settings");

  if (!editor || !metrics || !coach || !vocab || !saveBtn || !clearBtn) {
    return;
  }

  function splitSentences(text) {
    return text
      .split(/[.!?]+/)
      .map(function trimSentence(part) { return part.trim(); })
      .filter(Boolean);
  }

  function getWordCount(text) {
    var words = text.trim().match(/\b[\w'-]+\b/g);
    return words ? words.length : 0;
  }

  function countAcademicWords(text) {
    var lower = text.toLowerCase();
    return ACADEMIC_WORDS.filter(function (word) {
      return lower.indexOf(word) !== -1;
    }).length;
  }

  function renderCoachTips(text, words, sentenceCount) {
    var tips = [];
    var avgLength = sentenceCount > 0 ? words / sentenceCount : 0;
    var hasConjunction = CONJUNCTION_RE.test(text);
    var academicCount = countAcademicWords(text);

    if (avgLength < 8 && words > 0) {
      tips.push("Your sentences are short. Add one detail phrase to each idea.");
    } else {
      tips.push("Sentence length is balanced. Keep your strongest point at the start.");
    }

    if (!hasConjunction) {
      tips.push("Try linking ideas with because, so, or but to improve flow.");
    } else {
      tips.push("Great connection words. Check if each connector clarifies meaning.");
    }

    if (academicCount === 0) {
      tips.push("Try 1-2 academic words: analyze, evidence, and impact.");
    } else if (academicCount < 3) {
      tips.push("You used academic vocabulary. Add one more precise term.");
    } else {
      tips.push("Strong academic language use. Keep word choice specific.");
    }

    coach.innerHTML = "";
    tips.slice(0, 3).forEach(function (tip) {
      var el = document.createElement("div");
      el.className = "ws-tip";
      el.textContent = tip;
      coach.appendChild(el);
    });
  }

  function updateMetricsAndCoach() {
    var text = editor.value;
    var words = getWordCount(text);
    var sentences = splitSentences(text).length;
    metrics.textContent = sentences + " sentence" + (sentences === 1 ? "" : "s") + " • " + words + " word" + (words === 1 ? "" : "s");
    renderCoachTips(text, words, sentences);
  }

  function renderVocabPills() {
    vocab.innerHTML = "";
    STARTER_VOCAB.slice(0, 10).forEach(function (word) {
      var pill = document.createElement("button");
      pill.type = "button";
      pill.className = "ws-pill";
      pill.textContent = word;
      pill.addEventListener("click", function () {
        var next = editor.value.trim().length === 0 ? word : editor.value + " " + word;
        editor.value = next;
        editor.focus();
        updateMetricsAndCoach();
      });
      vocab.appendChild(pill);
    });
  }

  function showToast(message) {
    var toast = document.getElementById("ws-toast");
    if (!toast) {
      toast = document.createElement("div");
      toast.id = "ws-toast";
      document.body.appendChild(toast);
    }
    toast.textContent = message;
    toast.classList.add("is-visible");
    window.setTimeout(function () {
      toast.classList.remove("is-visible");
    }, 1200);
  }

  function saveDraft() {
    localStorage.setItem(DRAFT_KEY, editor.value);
    showToast("Draft saved");
  }

  function clearDraft() {
    editor.value = "";
    localStorage.removeItem(DRAFT_KEY);
    updateMetricsAndCoach();
    showToast("Draft cleared");
  }

  function loadDraft() {
    var saved = localStorage.getItem(DRAFT_KEY);
    if (saved) {
      editor.value = saved;
    }
    updateMetricsAndCoach();
  }

  function setMode(mode) {
    modeButtons.forEach(function (btn) {
      var isActive = btn.getAttribute("data-mode") === mode;
      btn.classList.toggle("is-active", isActive);
    });
    editor.placeholder = mode === "paragraph"
      ? "Write a focused paragraph with a clear topic and supporting details…"
      : "Start here…";
  }

  function getThemeList() {
    if (window.WQThemeRegistry && Array.isArray(window.WQThemeRegistry.order)) {
      return window.WQThemeRegistry.order.slice();
    }
    return ["default", "sunset", "ocean", "coffee", "seahawks", "huskies", "dark", "matrix"];
  }

  function syncAccentVar() {
    var style = getComputedStyle(document.documentElement);
    var accent = style.getPropertyValue("--accent").trim() || FALLBACK_ACCENT;
    document.documentElement.style.setProperty("--hv2-accent", accent);
  }

  function applyTheme(themeId) {
    document.documentElement.setAttribute("data-theme", themeId);
    body.className = body.className.replace(/\bcs-hv2-theme-[a-z0-9-]+\b/g, "").trim();
    body.classList.add("cs-hv2-theme-" + themeId);
    syncAccentVar();
  }

  function cycleTheme() {
    var list = getThemeList();
    var current = document.documentElement.getAttribute("data-theme") || "default";
    var idx = list.indexOf(current);
    var next = list[(idx + 1 + list.length) % list.length];
    applyTheme(next);
    localStorage.setItem("theme", next);
    showToast("Theme: " + next);
  }

  modeButtons.forEach(function (btn) {
    btn.addEventListener("click", function () {
      setMode(btn.getAttribute("data-mode"));
    });
  });

  editor.addEventListener("input", updateMetricsAndCoach);
  saveBtn.addEventListener("click", saveDraft);
  clearBtn.addEventListener("click", clearDraft);
  settingsBtn.addEventListener("click", cycleTheme);

  applyTheme(localStorage.getItem("theme") || document.documentElement.getAttribute("data-theme") || "default");
  renderVocabPills();
  loadDraft();
  setMode("sentence");
})();
