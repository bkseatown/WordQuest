(function sentenceSurgeryInit() {
  "use strict";

  var sentenceEl = document.getElementById("ssSentence");
  var meterBarEl = document.getElementById("ssMeterBar");
  var levelEl = document.getElementById("ssLevel");
  var actionButtons = Array.prototype.slice.call(document.querySelectorAll(".ss-actions button"));

  if (!sentenceEl || !meterBarEl || !levelEl) return;

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

  function sanitizeSentence(raw) {
    return String(raw || "")
      .replace(/[\n\r]+/g, " ")
      .replace(/\s+/g, " ")
      .trim();
  }

  function getSentenceText() {
    return sanitizeSentence(sentenceEl.textContent);
  }

  function setSentenceText(next) {
    var clean = sanitizeSentence(next);
    sentenceEl.textContent = clean || "The dog ran.";
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

  function hasClause(text) {
    return /\bbecause\b/i.test(text);
  }

  function hasStrongVerb(words) {
    return words.some(function (word) {
      return STRONG_VERBS.indexOf(word.toLowerCase()) >= 0;
    });
  }

  function getLevel(wordCount, clausePresent, strongVerbPresent) {
    var level;
    if (wordCount <= 5) {
      level = 1;
    } else if (wordCount <= 10) {
      level = 2;
    } else if (wordCount <= 15) {
      level = 3;
    } else {
      level = 3;
    }

    if (clausePresent) level = Math.max(level, 4);
    if (strongVerbPresent) level = Math.max(level, 5);

    return level;
  }

  function computeScore(wordCount, adjectiveCount, clausePresent, strongVerbPresent) {
    var score = Math.min(wordCount * 5, 55);
    score += Math.min(adjectiveCount * 6, 18);
    if (clausePresent) score += 14;
    if (strongVerbPresent) score += 18;
    return Math.min(100, Math.max(8, score));
  }

  function updateUI() {
    var text = getSentenceText();
    var words = splitWords(text);
    var wordCount = words.length;
    var adjectiveCount = countAdjectives(words);
    var clausePresent = hasClause(text);
    var strongVerbPresent = hasStrongVerb(words);
    var level = getLevel(wordCount, clausePresent, strongVerbPresent);
    var score = computeScore(wordCount, adjectiveCount, clausePresent, strongVerbPresent);

    meterBarEl.style.width = score + "%";
    levelEl.textContent = "Level " + level + " · " + wordCount + " words";
  }

  function ensurePeriod(text) {
    var trimmed = sanitizeSentence(text);
    if (!trimmed) return "";
    return /[.!?]$/.test(trimmed) ? trimmed : trimmed + ".";
  }

  function addWhy() {
    var text = getSentenceText();
    if (!text) {
      setSentenceText("I wrote this because ___.");
      return;
    }
    if (/\bbecause\b/i.test(text)) return;

    var noPunct = text.replace(/[.!?]+$/, "");
    setSentenceText(noPunct + " because ___.");
  }

  function addDetail() {
    var text = getSentenceText();
    if (!text) {
      setSentenceText("The dog ran across the yard.");
      return;
    }
    if (/\b(across|through|near|under|over|inside|outside)\b/i.test(text)) return;

    var noPunct = text.replace(/[.!?]+$/, "");
    setSentenceText(noPunct + " across the yard.");
  }

  function upgradeVerb() {
    var text = getSentenceText();
    if (!text) return;

    var upgraded = text;
    Object.keys(WEAK_TO_STRONG).some(function (weak) {
      var re = new RegExp("\\b" + weak + "\\b", "i");
      if (!re.test(upgraded)) return false;
      upgraded = upgraded.replace(re, WEAK_TO_STRONG[weak]);
      return true;
    });

    setSentenceText(ensurePeriod(upgraded));
  }

  function runAction(action) {
    if (action === "why") addWhy();
    if (action === "detail") addDetail();
    if (action === "verb") upgradeVerb();
    updateUI();
  }

  actionButtons.forEach(function (button) {
    button.addEventListener("click", function () {
      runAction(button.getAttribute("data-action"));
    });
  });

  sentenceEl.addEventListener("input", updateUI);
  sentenceEl.addEventListener("blur", function () {
    setSentenceText(ensurePeriod(getSentenceText()));
    updateUI();
  });

  sentenceEl.addEventListener("keydown", function (event) {
    if (event.key === "Enter") {
      event.preventDefault();
      sentenceEl.blur();
    }
  });

  setSentenceText(getSentenceText());
  updateUI();
})();
