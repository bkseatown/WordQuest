(function avaCoachModule(root, factory) {
  if (typeof module === "object" && module.exports) {
    module.exports = factory();
    return;
  }
  root.AvaCoach = factory();
})(typeof window !== "undefined" ? window : this, function avaCoachFactory() {
  "use strict";

  var PHRASE_URLS = ["./data/ava-phrases-v1.json", "./data/ava-phrases.json"];
  var PERSONA_URL = "./data/ava-persona.json";
  var EVENT_MATRIX_URL = "./data/ava-event-matrix.json";
  // Always resolve audio from the current pack
  var LOCAL_MANIFEST_URL = "./audio/ava/current/manifest.json";
  var RECENT_LIMIT = 5;

  var FALLBACK_PHRASES = [
    {
      id: "fallback.wordquest.after_first_miss.01",
      text: "First miss recorded. Keep the process steady and specific. Use one letter-position check before the next try.",
      domain: "wordquest",
      event: "after_first_miss",
      lane: "neutral_coach",
      length: "short",
      tier: ["2", "3"],
      audience: ["student", "teacher"]
    },
    {
      id: "fallback.wordquest.after_second_miss.01",
      text: "Second miss recorded. Do this next in order. Switch one tested pattern and submit one precise try.",
      domain: "wordquest",
      event: "after_second_miss",
      lane: "direct_instruction",
      length: "short",
      tier: ["2", "3"],
      audience: ["student", "teacher"]
    },
    {
      id: "fallback.wordquest.rapid_wrong_streak.01",
      text: "Wrong streak is moving too fast. Pause now. Pause, breathe, and restart with one controlled step.",
      domain: "wordquest",
      event: "rapid_wrong_streak",
      lane: "deescalation",
      length: "micro",
      tier: ["2", "3"],
      audience: ["student", "teacher"]
    }
  ];

  var state = {
    phrases: null,
    loadPromise: null,
    persona: null,
    personaPromise: null,
    manifest: null,
    manifestPromise: null,
    matrixPromise: null,
    recentPhraseIds: [],
    lastEvent: "",
    lastSpokenAt: 0,
    liveAudio: null,
    liveAudioUrl: ""
  };

  function sanitizeText(value) {
    return String(value || "").replace(/\s+/g, " ").trim();
  }

  function normalizeKey(value) {
    return sanitizeText(value).toLowerCase();
  }

  function isDebug() {
    return !!(typeof window !== "undefined" && window.CS_AVA_DEBUG);
  }

  if (typeof window !== "undefined" && typeof window.CS_AVA_DEBUG === "undefined") {
    window.CS_AVA_DEBUG = false;
  }

  function normalizeTier(value) {
    var raw = String(value == null ? "" : value).trim();
    if (raw === "3") return "3";
    return "2";
  }

  function normalizeLength(value, fallbackText) {
    var key = normalizeKey(value);
    if (key === "micro" || key === "short" || key === "medium") return key;
    var words = sanitizeText(fallbackText).split(/\s+/).filter(Boolean).length;
    if (words <= 4) return "micro";
    if (words <= 8) return "short";
    return "medium";
  }

  function normalizePhrase(entry, idx) {
    if (!entry || typeof entry !== "object") return null;
    var text = sanitizeText(entry.text || entry.phrase || "");
    if (!text) return null;
    var domain = normalizeKey(entry.domain || entry.category || "wordquest") || "wordquest";
    var event = normalizeKey(entry.event || entry.subcategory || "after_first_miss") || "after_first_miss";
    var lane = normalizeKey(entry.lane || "neutral_coach") || "neutral_coach";
    var audience = Array.isArray(entry.audience) && entry.audience.length
      ? entry.audience.map(function (v) { return normalizeKey(v); }).filter(Boolean)
      : ["student"];
    var tier = Array.isArray(entry.tier) && entry.tier.length
      ? entry.tier.map(function (v) { return String(v); })
      : ["2", "3"];

    return {
      id: sanitizeText(entry.id || (domain + "." + event + "." + String(idx + 1).padStart(2, "0"))),
      text: text,
      domain: domain,
      event: event,
      lane: lane,
      length: normalizeLength(entry.length, text),
      tier: tier,
      audience: audience,
      clip: sanitizeText(entry.clip || entry.audio || entry.file || "")
    };
  }

  function flattenLegacyCategories(json) {
    var out = [];
    if (!json || !json.categories || typeof json.categories !== "object") return out;
    Object.keys(json.categories).forEach(function (domain) {
      var group = json.categories[domain];
      if (!group || typeof group !== "object") return;
      Object.keys(group).forEach(function (eventKey) {
        var list = group[eventKey];
        if (!Array.isArray(list)) return;
        list.forEach(function (item, index) {
          var row = item && typeof item === "object"
            ? {
              id: item.id,
              text: item.text || item.phrase,
              domain: item.domain || (item.tags && item.tags.domain) || domain,
              event: item.event || eventKey,
              lane: item.lane || (item.tags && item.tags.lane),
              length: item.length || (item.tags && item.tags.length),
              tier: item.tier || (item.tags && item.tags.tier) || (item.tags && item.tags.tierHints),
              audience: item.audience || (item.tags && item.tags.audience),
              clip: item.clip || item.audio || item.file
            }
            : {
              id: domain + "." + eventKey + "." + String(index + 1),
              text: String(item || ""),
              domain: domain,
              event: eventKey,
              lane: "neutral_coach",
              length: "short",
              tier: ["2", "3"],
              audience: ["student"]
            };
          out.push(row);
        });
      });
    });
    return out;
  }

  function load() {
    if (state.phrases) return Promise.resolve(state.phrases);
    if (state.loadPromise) return state.loadPromise;

    state.loadPromise = PHRASE_URLS.reduce(function (chain, url) {
      return chain.then(function (loaded) {
        if (loaded) return loaded;
        return fetch(url, { cache: "no-store" })
          .then(function (res) { return res.ok ? res.json() : null; })
          .then(function (json) {
            if (!json || typeof json !== "object") return null;
            var source = Array.isArray(json.phrases) ? json.phrases : flattenLegacyCategories(json);
            var normalized = source.map(normalizePhrase).filter(Boolean);
            if (!normalized.length) return null;
            state.phrases = normalized;
            return normalized;
          })
          .catch(function () { return null; });
      });
    }, Promise.resolve(null)).then(function (result) {
      if (result && result.length) return result;
      state.phrases = FALLBACK_PHRASES.slice();
      return state.phrases;
    }).finally(function () {
      state.loadPromise = null;
    });

    return state.loadPromise;
  }

  function loadPersona() {
    if (state.persona) return Promise.resolve(state.persona);
    if (state.personaPromise) return state.personaPromise;
    state.personaPromise = fetch(PERSONA_URL, { cache: "no-store" })
      .then(function (res) { return res.ok ? res.json() : null; })
      .then(function (json) {
        state.persona = json && typeof json === "object" ? json : {};
        return state.persona;
      })
      .catch(function () {
        state.persona = {};
        return state.persona;
      })
      .finally(function () {
        state.personaPromise = null;
      });
    return state.personaPromise;
  }

  function loadEventMatrix() {
    if (state.matrixPromise) return state.matrixPromise;
    state.matrixPromise = fetch(EVENT_MATRIX_URL, { cache: "no-store" })
      .then(function (res) { return res.ok ? res.json() : null; })
      .then(function (json) {
        if (json && window.AvaIntensity && typeof window.AvaIntensity.setEventMatrix === "function") {
          window.AvaIntensity.setEventMatrix(json);
        }
        return json;
      })
      .catch(function () { return null; })
      .finally(function () {
        state.matrixPromise = null;
      });
    return state.matrixPromise;
  }

  function loadManifest() {
    if (state.manifest) return Promise.resolve(state.manifest);
    if (state.manifestPromise) return state.manifestPromise;

    state.manifestPromise = fetch(LOCAL_MANIFEST_URL, { cache: "no-store" })
      .then(function (res) { return res.ok ? res.json() : null; })
      .then(function (json) {
        var byText = Object.create(null);
        if (json && Array.isArray(json.files)) {
          json.files.forEach(function (entry) {
            var text = normalizeKey(entry && entry.text);
            var file = sanitizeText(entry && entry.file);
            if (text && file) byText[text] = file;
          });
        }
        state.manifest = { byText: byText };
        return state.manifest;
      })
      .catch(function () {
        state.manifest = { byText: Object.create(null) };
        return state.manifest;
      })
      .finally(function () {
        state.manifestPromise = null;
      });

    return state.manifestPromise;
  }

  function resolveAzureConfig() {
    var key = sanitizeText(window.CS_AZURE_TTS_KEY || window.AZURE_TTS_KEY || window.AZURE_SPEECH_KEY || "");
    var region = sanitizeText(window.CS_AZURE_TTS_REGION || window.AZURE_TTS_REGION || window.AZURE_SPEECH_REGION || "");
    if (!key || !region) return null;
    return { key: key, region: region };
  }

  function playBlobAudio(blob) {
    return new Promise(function (resolve) {
      try {
        if (state.liveAudio) {
          state.liveAudio.pause();
          state.liveAudio.currentTime = 0;
        }
        if (state.liveAudioUrl) {
          URL.revokeObjectURL(state.liveAudioUrl);
          state.liveAudioUrl = "";
        }
        var audio = state.liveAudio || new Audio();
        state.liveAudio = audio;
        state.liveAudioUrl = URL.createObjectURL(blob);
        audio.src = state.liveAudioUrl;
        audio.preload = "auto";
        audio.volume = 0.92;
        var done = false;
        function finish(ok) {
          if (done) return;
          done = true;
          resolve(!!ok);
        }
        audio.onended = function () { finish(true); };
        audio.onerror = function () { finish(false); };
        var promise = audio.play();
        if (promise && typeof promise.catch === "function") promise.catch(function () { finish(false); });
      } catch (_e) {
        resolve(false);
      }
    });
  }

  function speakWithSpeechSynthesis(text) {
    return new Promise(function (resolve) {
      if (!window.speechSynthesis || !window.SpeechSynthesisUtterance) {
        resolve(false);
        return;
      }
      var utterance = new SpeechSynthesisUtterance(sanitizeText(text));
      utterance.rate = 0.92;
      utterance.pitch = 1;
      utterance.lang = "en-US";
      utterance.onend = function () { resolve(true); };
      utterance.onerror = function () { resolve(false); };
      try {
        window.speechSynthesis.cancel();
        window.speechSynthesis.speak(utterance);
      } catch (_e) {
        resolve(false);
      }
    });
  }

  async function synthesizeAzureLive(text) {
    var cfg = resolveAzureConfig();
    if (!cfg || !text) return false;
    var endpoint = "https://" + cfg.region + ".tts.speech.microsoft.com/cognitiveservices/v1";
    var escaped = text
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/\"/g, "&quot;")
      .replace(/'/g, "&apos;");
    var ssml = [
      '<speak version="1.0" xml:lang="en-US">',
      '<voice name="en-US-AvaMultilingualNeural">',
      '<prosody rate="0%" pitch="0%">' + escaped + '</prosody>',
      '</voice>',
      '</speak>'
    ].join("");

    try {
      var response = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Ocp-Apim-Subscription-Key": cfg.key,
          "Content-Type": "application/ssml+xml",
          "X-Microsoft-OutputFormat": "audio-48khz-192kbitrate-mono-mp3",
          "User-Agent": "WordQuestAvaCoach/2.0"
        },
        body: ssml
      });
      if (!response.ok) return false;
      var blob = await response.blob();
      if (!blob || !blob.size) return false;
      return playBlobAudio(blob);
    } catch (_e) {
      return false;
    }
  }

  function rememberPhrase(id, event) {
    if (!id) return;
    state.recentPhraseIds.push(id);
    if (state.recentPhraseIds.length > RECENT_LIMIT) {
      state.recentPhraseIds = state.recentPhraseIds.slice(state.recentPhraseIds.length - RECENT_LIMIT);
    }
    state.lastEvent = sanitizeText(event || "");
  }

  function filterByContext(pool, context, resolved) {
    var moduleName = normalizeKey(context.module || "wordquest") || "wordquest";
    var tier = normalizeTier(context.tier);
    var audience = normalizeKey(context.audience || (moduleName === "teacher_dashboard" ? "teacher" : "student")) || "student";

    return pool.filter(function (phrase) {
      if (phrase.domain !== moduleName) return false;
      if (phrase.event !== resolved.event) return false;
      if (Array.isArray(phrase.tier) && phrase.tier.length && phrase.tier.indexOf(tier) === -1) return false;
      if (Array.isArray(phrase.audience) && phrase.audience.length && phrase.audience.indexOf(audience) === -1 && phrase.audience.indexOf("student") === -1) return false;
      return true;
    });
  }

  function pickPhrase(pool, event, lane) {
    var sameLane = pool.filter(function (phrase) { return phrase.lane === lane; });
    var withoutRecent = sameLane.filter(function (phrase) {
      return state.recentPhraseIds.indexOf(phrase.id) === -1;
    });
    if (withoutRecent.length) return withoutRecent[0];
    if (sameLane.length) return sameLane[0];

    var noRecentAny = pool.filter(function (phrase) { return state.recentPhraseIds.indexOf(phrase.id) === -1; });
    if (noRecentAny.length) return noRecentAny[0];

    var rotated = pool.find(function (phrase) {
      return phrase.event === event && phrase.lane !== lane;
    });
    return rotated || pool[0] || FALLBACK_PHRASES[0];
  }

  function parseAdaptiveArgs(arg1, arg2, arg3) {
    if (arg1 && typeof arg1 === "object") return Object.assign({}, arg1);
    var context = arg3 && typeof arg3 === "object" ? Object.assign({}, arg3) : {};
    context.module = context.module || arg1 || "wordquest";
    context.event = context.event || arg2 || "";
    return context;
  }

  function computeAdaptiveContext(context) {
    var ctx = context && typeof context === "object" ? Object.assign({}, context) : {};
    ctx.module = normalizeKey(ctx.module || "wordquest") || "wordquest";
    ctx.tier = Number(normalizeTier(ctx.tier));

    var resolved = window.AvaIntensity && typeof window.AvaIntensity.compute === "function"
      ? window.AvaIntensity.compute(ctx)
      : {
        event: normalizeKey(ctx.event || "after_first_miss"),
        lane: "neutral_coach",
        length: "short",
        reason: "fallback intensity"
      };

    return {
      context: ctx,
      resolved: resolved
    };
  }

  function getAdaptive(arg1, arg2, arg3) {
    var parsed = parseAdaptiveArgs(arg1, arg2, arg3);
    var source = Array.isArray(state.phrases) && state.phrases.length ? state.phrases : FALLBACK_PHRASES;

    var calc = computeAdaptiveContext(parsed);
    var ctx = calc.context;
    var resolved = calc.resolved;

    var pool = filterByContext(source, ctx, resolved);
    if (!pool.length) {
      pool = source.filter(function (phrase) {
        return phrase.domain === ctx.module && phrase.event === resolved.event;
      });
    }

    var targetLane = normalizeKey(resolved.lane || "neutral_coach") || "neutral_coach";
    var targetLength = normalizeKey(resolved.length || "short") || "short";
    if (ctx.forceShort || normalizeTier(ctx.tier) === "3") {
      if (targetLength === "medium") targetLength = "short";
    }

    var strictPool = pool.filter(function (phrase) {
      return phrase.lane === targetLane && phrase.length === targetLength;
    });

    var relaxedLengthPool = pool.filter(function (phrase) {
      return phrase.lane === targetLane;
    });

    if (ctx.forceShort || normalizeTier(ctx.tier) === "3") {
      relaxedLengthPool = relaxedLengthPool.filter(function (phrase) { return phrase.length !== "medium"; });
      if (!relaxedLengthPool.length) {
        relaxedLengthPool = pool.filter(function (phrase) {
          return phrase.lane === targetLane;
        });
      }
    }

    var neutralLanePool = pool.filter(function (phrase) {
      return phrase.lane === "neutral_coach";
    });

    var selectedPool = strictPool.length ? strictPool : (relaxedLengthPool.length ? relaxedLengthPool : (neutralLanePool.length ? neutralLanePool : pool));
    if (!selectedPool.length) selectedPool = FALLBACK_PHRASES;

    var phrase = pickPhrase(selectedPool, resolved.event, targetLane);
    rememberPhrase(phrase.id, resolved.event);

    var result = {
      id: phrase.id,
      text: phrase.text,
      clip: phrase.clip || "",
      domain: phrase.domain,
      event: resolved.event,
      lane: targetLane,
      length: normalizeLength(phrase.length || targetLength, phrase.text),
      reason: resolved.reason
    };

    if (isDebug()) {
      try {
        console.debug("[AvaCoach]", {
          event: result.event,
          lane: result.lane,
          reason: result.reason,
          phraseId: result.id
        });
      } catch (_e) {
        // no-op
      }
    }

    return result;
  }

  async function speakAdaptive(arg1, arg2, arg3) {
    await load();
    await loadPersona();
    void loadEventMatrix();

    var selected = getAdaptive(arg1, arg2, arg3);
    var text = sanitizeText(selected && selected.text);
    if (!text) return "";

    var manifest = await loadManifest();
    var fromManifest = manifest && manifest.byText ? manifest.byText[normalizeKey(text)] : "";
    var localClip = sanitizeText(selected.clip || fromManifest || "");

    var spoke = false;
    if (window.WQAudio && typeof window.WQAudio.playCoachPhrase === "function" && localClip) {
      try {
        spoke = await window.WQAudio.playCoachPhrase({ text: text, clip: localClip }, {
          source: "ava-coach-adaptive",
          demo: !!(arg1 && arg1.demo)
        });
      } catch (_e) {
        spoke = false;
      }
    }

    if (!spoke) spoke = await synthesizeAzureLive(text);
    if (!spoke) await speakWithSpeechSynthesis(text);

    state.lastSpokenAt = Date.now();

    return text;
  }

  function resolveScaling(context, persona) {
    var cfg = (persona && persona.intensityScaling) || {};
    var audience = normalizeKey(context.audience || (normalizeKey(context.module) === "teacher_dashboard" ? "teacher" : "student"));
    if (audience === "teacher") return Number(cfg.teacher || 1.2);
    return normalizeTier(context.tier) === "3" ? Number(cfg.tier3 || 0.8) : Number(cfg.tier2 || 1.0);
  }

  async function emitAdaptive(context) {
    var ctx = context && typeof context === "object" ? Object.assign({}, context) : {};
    await load();
    var persona = await loadPersona();
    void loadEventMatrix();

    var event = window.AvaIntensity && typeof window.AvaIntensity.resolveEvent === "function"
      ? window.AvaIntensity.resolveEvent(ctx)
      : normalizeKey(ctx.event || "");

    var priority = window.AvaIntensity && typeof window.AvaIntensity.getEventPriority === "function"
      ? window.AvaIntensity.getEventPriority(ctx.module, event)
      : 0;

    var scale = resolveScaling(ctx, persona);
    var minGapMs = Math.round(3000 / Math.max(0.5, scale));
    var now = Date.now();

    if (now - state.lastSpokenAt < minGapMs) {
      return { skipped: true, reason: "cooldown", event: event };
    }

    if (normalizeTier(ctx.tier) === "3") {
      if (priority <= 2 && state.lastEvent === event && now - state.lastSpokenAt < (minGapMs * 2)) {
        return { skipped: true, reason: "tier3-frequency", event: event };
      }
      ctx.forceShort = true;
    }

    var spoken = await speakAdaptive(ctx);
    return { skipped: false, event: event, text: spoken };
  }

  function get(category, subcategory) {
    var selected = getAdaptive({ module: category || "wordquest", event: subcategory || "after_first_miss", tier: 2 });
    return selected && selected.text ? selected.text : "";
  }

  async function speak(category, subcategory) {
    return speakAdaptive({ module: category || "wordquest", event: subcategory || "after_first_miss", tier: 2 });
  }

  if (typeof window !== "undefined") {
    window.CSEmitAva = emitAdaptive;
  }

  return {
    load: load,
    loadPersona: loadPersona,
    loadEventMatrix: loadEventMatrix,
    get: get,
    getAdaptive: getAdaptive,
    speak: speak,
    speakAdaptive: speakAdaptive,
    emitAdaptive: emitAdaptive
  };
});
