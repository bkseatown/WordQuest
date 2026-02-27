(function avaCoachModule(root, factory) {
  if (typeof module === "object" && module.exports) {
    module.exports = factory();
    return;
  }
  root.AvaCoach = factory();
})(typeof window !== "undefined" ? window : this, function avaCoachFactory() {
  "use strict";

  var PHRASE_URL = "./data/ava-phrases.json";
  var RECENT_LIMIT = 3;
  var FALLBACK_PHRASES = [
    "Pause and choose one clear next step.",
    "Use evidence from this attempt.",
    "Keep your strategy calm and specific.",
    "Try one focused revision now."
  ];

  var state = {
    bank: null,
    loadPromise: null,
    recentBySubcategory: Object.create(null)
  };

  function sanitizeText(value) {
    return String(value || "").replace(/\s+/g, " ").trim();
  }

  function isDemoMode() {
    try {
      var params = new URLSearchParams(window.location.search || "");
      return params.get("demo") === "1";
    } catch (_e) {
      return false;
    }
  }

  function randomInt(max) {
    return Math.floor(Math.random() * Math.max(1, max));
  }

  function normalizeEntry(entry) {
    if (!entry) return null;
    if (typeof entry === "string") {
      var text = sanitizeText(entry);
      return text ? { text: text, clip: "" } : null;
    }
    if (typeof entry === "object") {
      var phrase = sanitizeText(entry.text || entry.phrase || "");
      if (!phrase) return null;
      return {
        text: phrase,
        clip: sanitizeText(entry.clip || entry.audio || "")
      };
    }
    return null;
  }

  function getSubcategoryPool(category, subcategory) {
    if (!state.bank || !state.bank.categories) return [];
    var group = state.bank.categories[category];
    if (!group || typeof group !== "object") return [];
    var list = group[subcategory];
    if (!Array.isArray(list)) return [];
    return list.map(normalizeEntry).filter(Boolean);
  }

  function getCategoryFallbackPool(category) {
    if (!state.bank || !state.bank.categories) return [];
    var group = state.bank.categories[category];
    if (!group || typeof group !== "object") return [];
    var merged = [];
    Object.keys(group).forEach(function (sub) {
      var list = group[sub];
      if (!Array.isArray(list)) return;
      list.forEach(function (entry) {
        var normalized = normalizeEntry(entry);
        if (normalized) merged.push(normalized);
      });
    });
    return merged;
  }

  function pickEntry(category, subcategory) {
    var key = String(category || "") + ":" + String(subcategory || "");
    var recent = state.recentBySubcategory[key] || [];

    var pool = getSubcategoryPool(category, subcategory);
    if (!pool.length) {
      pool = getCategoryFallbackPool(category);
    }
    if (!pool.length) {
      pool = FALLBACK_PHRASES.map(function (phrase) { return { text: phrase, clip: "" }; });
    }

    var filtered = pool.filter(function (entry) {
      return recent.indexOf(entry.text) === -1;
    });
    var source = filtered.length ? filtered : pool;
    var selected = source[randomInt(source.length)] || { text: FALLBACK_PHRASES[0], clip: "" };

    var nextRecent = recent.slice();
    nextRecent.push(selected.text);
    if (nextRecent.length > RECENT_LIMIT) {
      nextRecent = nextRecent.slice(nextRecent.length - RECENT_LIMIT);
    }
    state.recentBySubcategory[key] = nextRecent;

    return selected;
  }

  function load() {
    if (state.bank) return Promise.resolve(state.bank);
    if (state.loadPromise) return state.loadPromise;

    state.loadPromise = fetch(PHRASE_URL, { cache: "no-store" })
      .then(function (res) {
        if (!res.ok) throw new Error("ava_phrase_bank_missing");
        return res.json();
      })
      .then(function (json) {
        state.bank = json && typeof json === "object" ? json : null;
        return state.bank;
      })
      .catch(function () {
        state.bank = null;
        return null;
      })
      .finally(function () {
        state.loadPromise = null;
      });

    return state.loadPromise;
  }

  function get(category, subcategory) {
    void load();
    var selected = pickEntry(category, subcategory);
    return selected.text;
  }

  function pickVoice(voices, preferAva) {
    var list = Array.isArray(voices) ? voices : [];
    if (!list.length) return null;
    if (preferAva) {
      var ava = list.find(function (voice) {
        return /^en(-|$)/i.test(String(voice.lang || "")) && /\bava\b/i.test(String(voice.name || ""));
      });
      if (ava) return ava;
    }
    var english = list.find(function (voice) {
      return /^en(-|$)/i.test(String(voice.lang || ""));
    });
    return english || list[0] || null;
  }

  function speakWithSpeechSynthesis(text) {
    return new Promise(function (resolve) {
      if (!window.speechSynthesis || !window.SpeechSynthesisUtterance) {
        resolve(false);
        return;
      }
      var safeText = sanitizeText(text);
      if (!safeText) {
        resolve(false);
        return;
      }
      var utterance = new SpeechSynthesisUtterance(safeText);
      utterance.rate = 0.92;
      utterance.pitch = 1;
      utterance.lang = "en-US";

      var voices = window.speechSynthesis.getVoices ? window.speechSynthesis.getVoices() : [];
      var preferred = pickVoice(voices, true);
      if (preferred) utterance.voice = preferred;

      utterance.onend = function () { resolve(true); };
      utterance.onerror = function () {
        if (preferred) {
          var fallback = new SpeechSynthesisUtterance(safeText);
          fallback.rate = 0.92;
          fallback.pitch = 1;
          fallback.lang = "en-US";
          fallback.onend = function () { resolve(true); };
          fallback.onerror = function () { resolve(false); };
          try {
            window.speechSynthesis.cancel();
            window.speechSynthesis.speak(fallback);
          } catch (_e2) {
            resolve(false);
          }
          return;
        }
        resolve(false);
      };

      try {
        window.speechSynthesis.cancel();
        window.speechSynthesis.speak(utterance);
      } catch (_e) {
        resolve(false);
      }
    });
  }

  async function speak(category, subcategory) {
    await load();
    var selected = pickEntry(category, subcategory);
    if (!selected || !selected.text) return "";

    var usedWQAudio = false;
    if (window.WQAudio && typeof window.WQAudio.playCoachPhrase === "function") {
      try {
        usedWQAudio = await window.WQAudio.playCoachPhrase({
          text: selected.text,
          clip: selected.clip
        }, {
          source: "ava-coach",
          demo: isDemoMode()
        });
      } catch (_err) {
        usedWQAudio = false;
      }
    }

    if (!usedWQAudio) {
      await speakWithSpeechSynthesis(selected.text);
    }

    return selected.text;
  }

  return {
    load: load,
    get: get,
    speak: speak
  };
});
