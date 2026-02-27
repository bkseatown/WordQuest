(function sentenceSurgeryInit() {
  "use strict";

  var sentenceEl = document.getElementById("ssSentence");
  var meterBarEl = document.getElementById("ssMeterBar");
  var levelEl = document.getElementById("ssLevel");
  var badgeEl = document.getElementById("ssBadge");
  var compareEl = document.getElementById("ssCompare");
  var compareBeforeEl = document.getElementById("ssCompareBefore");
  var compareAfterEl = document.getElementById("ssCompareAfter");
  var teacherToggleBtn = document.getElementById("ssTeacherToggle");
  var breakdownBodyEl = document.getElementById("ssBreakdownBody");
  var skillTagEl = document.getElementById("ssSkillTag");
  var groupingEl = document.getElementById("ssGrouping");
  var actionButtons = Array.prototype.slice.call(document.querySelectorAll(".ss-actions button[data-action]"));

  if (!sentenceEl || !meterBarEl || !levelEl) return;

  var traitEls = {
    clarity: {
      fill: document.getElementById("ssTraitClarity"),
      value: document.getElementById("ssTraitClarityValue")
    },
    detail: {
      fill: document.getElementById("ssTraitDetail"),
      value: document.getElementById("ssTraitDetailValue")
    },
    reasoning: {
      fill: document.getElementById("ssTraitReasoning"),
      value: document.getElementById("ssTraitReasoningValue")
    },
    control: {
      fill: document.getElementById("ssTraitControl"),
      value: document.getElementById("ssTraitControlValue")
    }
  };

  var WEAK_TO_STRONG = {
    ran: "sprinted",
    run: "dash",
    went: "traveled",
    go: "move",
    said: "announced",
    make: "construct",
    made: "crafted",
    got: "obtained",
    get: "secure",
    looked: "glanced",
    look: "observe"
  };

  var STRONG_VERBS = [
    "sprinted", "darted", "marched", "charged", "glanced", "observed", "insisted", "announced",
    "constructed", "crafted", "generated", "examined", "investigated", "calculated", "persuaded"
  ];

  var ADJECTIVE_BANK = [
    "small", "big", "quick", "slow", "loud", "quiet", "bright", "dark", "happy", "sad", "brave",
    "careful", "strong", "gentle", "curious", "fierce", "warm", "cold", "tall", "short"
  ];

  var CLAUSE_REGEX = /\b(because|although|when|if)\b[^,.!?;]*/gi;
  var SCAFFOLD_TOKEN_REGEX = /\b(?:because|to|with)\s+_{2,}\b/gi;

  var previousLevel = 1;
  var previousClauseCount = 0;
  var previousText = "";
  var recentCompletedStem = "";
  var badgeTimer = 0;
  var compareTimer = 0;

  function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
  }

  function sanitizeSentence(raw) {
    return String(raw || "")
      .replace(/[\n\r]+/g, " ")
      .replace(/\s+/g, " ")
      .trim();
  }

  function escapeHtml(text) {
    return String(text || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  function splitWords(text) {
    var clean = sanitizeSentence(text).replace(/[^a-zA-Z'\-\s]/g, " ");
    if (!clean) return [];
    return clean.split(/\s+/).filter(Boolean);
  }

  function countAdjectives(words) {
    return words.filter(function (word) {
      var lower = word.toLowerCase();
      if (ADJECTIVE_BANK.indexOf(lower) >= 0) return true;
      return /(y|ful|ous|ive|al|less|ic)$/.test(lower);
    }).length;
  }

  function countClauses(text) {
    var count = 0;
    var regex = new RegExp(CLAUSE_REGEX.source, "gi");
    while (regex.exec(text)) count += 1;
    return count;
  }

  function hasStrongVerb(words) {
    return words.some(function (word) {
      return STRONG_VERBS.indexOf(word.toLowerCase()) >= 0;
    });
  }

  function getLevel(wordCount, clausePresent, strongVerbPresent) {
    var level;
    if (wordCount <= 5) level = 1;
    else if (wordCount <= 10) level = 2;
    else level = 3;
    if (clausePresent) level = Math.max(level, 4);
    if (strongVerbPresent) level = Math.max(level, 5);
    return level;
  }

  function computeScore(wordCount, adjectiveCount, clauseCount, strongVerbPresent) {
    var score = Math.min(wordCount * 5, 55);
    score += Math.min(adjectiveCount * 6, 18);
    score += Math.min(clauseCount * 14, 21);
    if (strongVerbPresent) score += 18;
    return Math.min(100, Math.max(8, score));
  }

  function computeTraits(text, words) {
    var wordCount = words.length;
    var adjectiveCount = countAdjectives(words);
    var clauseCount = countClauses(text);
    var strongVerbPresent = hasStrongVerb(words);

    var clarity = clamp(Math.round((wordCount >= 4 ? 2 : 1) + (wordCount <= 16 ? 2 : 1) + (strongVerbPresent ? 1 : 0)), 0, 5);
    var detail = clamp(Math.round(Math.min(3, adjectiveCount) + (wordCount >= 8 ? 1 : 0) + (/\b(with|across|through|near|under|over|inside|outside)\b/i.test(text) ? 1 : 0)), 0, 5);
    var reasoning = clamp(Math.round(Math.min(3, clauseCount * 2) + (/\bbecause\b/i.test(text) ? 1 : 0) + (wordCount >= 10 ? 1 : 0)), 0, 5);
    var control = clamp(Math.round((/^[A-Z]/.test(text) ? 1 : 0) + (/[.!?]$/.test(text) ? 2 : 0) + (strongVerbPresent ? 1 : 0) + (wordCount > 0 ? 1 : 0)), 0, 5);

    return {
      clarity: clarity,
      detail: detail,
      reasoning: reasoning,
      control: control,
      adjectiveCount: adjectiveCount,
      clauseCount: clauseCount,
      strongVerbPresent: strongVerbPresent,
      wordCount: wordCount
    };
  }

  function getCaretOffset(root) {
    var selection = window.getSelection && window.getSelection();
    if (!selection || !selection.rangeCount) return null;
    var range = selection.getRangeAt(0);
    if (!root.contains(range.startContainer)) return null;
    var pre = range.cloneRange();
    pre.selectNodeContents(root);
    pre.setEnd(range.startContainer, range.startOffset);
    return pre.toString().length;
  }

  function setCaretOffset(root, offset) {
    if (offset == null) return;
    var selection = window.getSelection && window.getSelection();
    if (!selection) return;
    var walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, null);
    var node;
    var remaining = offset;
    while ((node = walker.nextNode())) {
      var length = node.textContent.length;
      if (remaining <= length) {
        var range = document.createRange();
        range.setStart(node, Math.max(0, remaining));
        range.collapse(true);
        selection.removeAllRanges();
        selection.addRange(range);
        return;
      }
      remaining -= length;
    }
  }

  function applyScaffoldMarkup(chunk) {
    return escapeHtml(chunk).replace(SCAFFOLD_TOKEN_REGEX, function (match) {
      var stem = String(match).trim().split(/\s+/)[0].toLowerCase();
      var classes = "scaffold" + (recentCompletedStem && stem === recentCompletedStem ? " scaffold-complete" : "");
      return '<span class="' + classes + '">' + escapeHtml(match) + '</span>';
    });
  }

  function renderSentenceMarkup(text, pulseClauses) {
    var clean = sanitizeSentence(text);
    if (!clean) clean = "The dog ran.";

    var ranges = [];
    var regex = new RegExp(CLAUSE_REGEX.source, "gi");
    var match;
    while ((match = regex.exec(clean))) {
      ranges.push({ start: match.index, end: match.index + match[0].length });
    }

    var html = "";
    var cursor = 0;
    ranges.forEach(function (range) {
      html += applyScaffoldMarkup(clean.slice(cursor, range.start));
      var clauseClass = pulseClauses ? "clause clause-pulse" : "clause";
      html += '<span class="' + clauseClass + '">' + applyScaffoldMarkup(clean.slice(range.start, range.end)) + '</span>';
      cursor = range.end;
    });
    html += applyScaffoldMarkup(clean.slice(cursor));

    var caret = getCaretOffset(sentenceEl);
    sentenceEl.innerHTML = html;
    setCaretOffset(sentenceEl, caret);

    if (recentCompletedStem) {
      window.setTimeout(function () {
        recentCompletedStem = "";
      }, 260);
    }

    return clean;
  }

  function showBadge(text) {
    if (!badgeEl) return;
    badgeEl.textContent = text;
    badgeEl.classList.add("show");
    window.clearTimeout(badgeTimer);
    badgeTimer = window.setTimeout(function () {
      badgeEl.classList.remove("show");
    }, 1200);
  }

  function showCompare(beforeText, afterText) {
    if (!compareEl || !compareBeforeEl || !compareAfterEl) return;
    compareBeforeEl.textContent = beforeText;
    compareAfterEl.textContent = afterText;
    compareEl.classList.remove("show");
    void compareEl.offsetWidth;
    compareEl.classList.add("show");
    window.clearTimeout(compareTimer);
    compareTimer = window.setTimeout(function () {
      compareEl.classList.remove("show");
    }, 2000);
  }

  function updateTraitBars(traits) {
    Object.keys(traitEls).forEach(function (key) {
      var value = clamp(Number(traits[key]) || 0, 0, 5);
      var row = traitEls[key];
      if (row.fill) row.fill.style.width = String(value * 20) + "%";
      if (row.value) row.value.textContent = String(value);
    });
  }

  function updateTeacherLens(traits) {
    var lowDetailAndClause = traits.detail <= 2 && traits.reasoning <= 2;
    var skillTag = "Developing sentence";
    if (traits.reasoning >= 4 && traits.control >= 4) skillTag = "Complex reasoning sentence";
    else if (traits.detail >= 4) skillTag = "Detailed sentence";
    else if (traits.clauseCount > 0) skillTag = "Reasoned sentence";

    if (skillTagEl) skillTagEl.textContent = skillTag;
    if (groupingEl) groupingEl.textContent = lowDetailAndClause ? "Tier 2 flag" : "Core";
    if (breakdownBodyEl) {
      breakdownBodyEl.textContent =
        "Words: " + traits.wordCount +
        " • Clauses: " + traits.clauseCount +
        " • Adjectives: " + traits.adjectiveCount +
        " • Strong verb: " + (traits.strongVerbPresent ? "Yes" : "No");
    }
  }

  function detectCompletedStem(prev, next) {
    if (!/\b(because|with|to)\s+_{2,}\b/i.test(prev)) return "";
    var stems = ["because", "with", "to"];
    for (var i = 0; i < stems.length; i += 1) {
      var stem = stems[i];
      var priorHasBlank = new RegExp("\\b" + stem + "\\s+_{2,}\\b", "i").test(prev);
      var nowHasBlank = new RegExp("\\b" + stem + "\\s+_{2,}\\b", "i").test(next);
      var nowHasCompleted = new RegExp("\\b" + stem + "\\s+[a-zA-Z]", "i").test(next);
      if (priorHasBlank && !nowHasBlank && nowHasCompleted) return stem;
    }
    return "";
  }

  function readPlainSentence() {
    return sanitizeSentence(sentenceEl.textContent || sentenceEl.innerText || "");
  }

  function ensurePeriod(text) {
    var trimmed = sanitizeSentence(text);
    if (!trimmed) return "";
    return /[.!?]$/.test(trimmed) ? trimmed : trimmed + ".";
  }

  function applySentence(next) {
    var text = sanitizeSentence(next) || "The dog ran.";
    var nextClauseCount = countClauses(text);
    var pulseClauses = nextClauseCount > previousClauseCount;
    var renderedText = renderSentenceMarkup(text, pulseClauses);
    var words = splitWords(renderedText);
    var traits = computeTraits(renderedText, words);
    var level = getLevel(traits.wordCount, traits.clauseCount > 0, traits.strongVerbPresent);
    var score = computeScore(traits.wordCount, traits.adjectiveCount, traits.clauseCount, traits.strongVerbPresent);

    if (pulseClauses) showBadge("Reason clause added");
    if (level > previousLevel && previousText && previousText !== renderedText) {
      showCompare(previousText, renderedText);
    }

    meterBarEl.style.width = String(score) + "%";
    levelEl.textContent = "Level " + level + " · " + traits.wordCount + " words";
    updateTraitBars(traits);
    updateTeacherLens(traits);

    previousLevel = level;
    previousClauseCount = traits.clauseCount;
    previousText = renderedText;
  }

  function addWhy() {
    var text = readPlainSentence();
    if (!text) return "I wrote this because ___.";
    if (/\bbecause\b/i.test(text)) return text;
    return text.replace(/[.!?]+$/, "") + " because ___.";
  }

  function addDetail() {
    var text = readPlainSentence();
    if (!text) return "The dog ran with ___ detail.";
    if (/\bwith\s+_{2,}\b/i.test(text)) return text;
    return text.replace(/[.!?]+$/, "") + " with ___ detail.";
  }

  function upgradeVerb() {
    var text = readPlainSentence();
    if (!text) return text;
    var upgraded = text;
    Object.keys(WEAK_TO_STRONG).some(function (weak) {
      var re = new RegExp("\\b" + weak + "\\b", "i");
      if (!re.test(upgraded)) return false;
      upgraded = upgraded.replace(re, WEAK_TO_STRONG[weak]);
      return true;
    });
    return ensurePeriod(upgraded);
  }

  function runAction(action) {
    var next = readPlainSentence();
    if (action === "why") next = addWhy();
    if (action === "detail") next = addDetail();
    if (action === "verb") next = upgradeVerb();
    recentCompletedStem = "";
    applySentence(next);
    sentenceEl.focus();
  }

  actionButtons.forEach(function (button) {
    button.addEventListener("click", function () {
      runAction(button.getAttribute("data-action"));
    });
  });

  if (teacherToggleBtn) {
    teacherToggleBtn.addEventListener("click", function () {
      var nextPressed = teacherToggleBtn.getAttribute("aria-pressed") !== "true";
      teacherToggleBtn.setAttribute("aria-pressed", nextPressed ? "true" : "false");
      document.body.classList.toggle("teacher-mode", nextPressed);
    });
  }

  sentenceEl.addEventListener("input", function () {
    var current = readPlainSentence();
    recentCompletedStem = detectCompletedStem(previousText, current);
    applySentence(current);
  });

  sentenceEl.addEventListener("blur", function () {
    recentCompletedStem = detectCompletedStem(previousText, ensurePeriod(readPlainSentence()));
    applySentence(ensurePeriod(readPlainSentence()));
  });

  sentenceEl.addEventListener("keydown", function (event) {
    if (event.key === "Enter") {
      event.preventDefault();
      sentenceEl.blur();
    }
  });

  applySentence(ensurePeriod(readPlainSentence()));
})();
