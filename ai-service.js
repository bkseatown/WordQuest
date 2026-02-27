(function aiServiceModule() {
  "use strict";

  var DEBOUNCE_MS = 400;
  var RATE_LIMIT_MAX = 20;
  var RATE_LIMIT_WINDOW_MS = 60 * 1000;

  if (!window.CS_CONFIG) {
    var isLocal = false;
    try {
      var host = String(window.location.hostname || "");
      isLocal = host === "localhost" || host === "127.0.0.1" || host.endsWith(".local") || host === "";
    } catch (_e) {
      isLocal = true;
    }
    window.CS_CONFIG = {
      environment: isLocal ? "dev" : "prod",
      enableAI: true,
      enableAnalytics: true
    };
  }

  if (!window.__CS_ERROR_HANDLERS_BOUND) {
    window.__CS_ERROR_HANDLERS_BOUND = true;
    window.addEventListener("error", function (e) {
      if (!window.CS_CONFIG || window.CS_CONFIG.environment !== "dev") return;
      try {
        console.warn("CS Error:", e && e.message ? e.message : "Unknown error");
      } catch (_err) {
        // ignore
      }
    });
    window.addEventListener("unhandledrejection", function (e) {
      if (!window.CS_CONFIG || window.CS_CONFIG.environment !== "dev") return;
      try {
        console.warn("CS Promise Rejection:", e && e.reason ? e.reason : "Unknown rejection");
      } catch (_err) {
        // ignore
      }
    });
  }

  var limiter = window.__CS_AI_LIMITER || {
    AI_CALL_COUNT: 0,
    AI_WINDOW_START: Date.now()
  };
  window.__CS_AI_LIMITER = limiter;

  var requestControllers = {};
  var lastCallByHash = {};
  var usageKey = "cs_ai_usage";

  function logDebug() {
    if (!window.CS_CONFIG || window.CS_CONFIG.environment !== "dev") return;
    try {
      var args = Array.prototype.slice.call(arguments);
      args.unshift("[CS AI]");
      console.log.apply(console, args);
    } catch (_e) {
      // ignore
    }
  }

  function getTimeoutMs() {
    var cfgTimeout = Number(window.CS_CONFIG && window.CS_CONFIG.requestTimeoutMs);
    if (!Number.isNaN(cfgTimeout) && cfgTimeout >= 1000 && cfgTimeout <= 30000) return cfgTimeout;
    return 4000;
  }

  function isDemoMode() {
    try {
      if (window.SSDemoMode && typeof window.SSDemoMode.isDemoMode === "function") {
        if (window.SSDemoMode.isDemoMode()) return true;
      }
      var params = new URLSearchParams(window.location.search || "");
      return params.get("demo") === "1" || params.get("demo") === "true" || params.get("mode") === "demo" || window.WQ_DEMO === true;
    } catch (_e) {
      return window.WQ_DEMO === true;
    }
  }

  function normalizeSentence(sentence) {
    return String(sentence || "").replace(/\s+/g, " ").trim();
  }

  function heuristic(sentence) {
    var clean = normalizeSentence(sentence);
    var words = clean ? clean.split(/\s+/).filter(Boolean) : [];
    var lower = clean.toLowerCase();
    var subordinators = ["because", "although", "since", "while", "if", "when", "after", "before"];
    var strongVerbs = ["sprinted", "dashed", "bolted", "lunged", "glared", "shattered", "gripped", "raced", "hurried"];

    var hasReasoning = subordinators.some(function (w) { return lower.indexOf(w) >= 0; });
    var strong = strongVerbs.some(function (v) { return lower.indexOf(v) >= 0; });
    var sentenceType = "simple";
    if (/\b(and|but|so)\b/.test(lower)) sentenceType = "compound";
    if (hasReasoning) sentenceType = "complex";

    return {
      sentence_type: sentenceType,
      has_reasoning: hasReasoning,
      detail_score: words.length > 10 ? 3 : words.length > 7 ? 2 : 1,
      verb_strength: strong ? "strong" : "adequate",
      word_count: words.length,
      suggested_focus: !hasReasoning
        ? "reasoning"
        : strong
          ? "clause_variety"
          : "verb_upgrade"
    };
  }

  function fallbackCoach(focus) {
    var local = {
      reasoning: "Add one because clause so readers understand why this happened.",
      sensory_detail: "Add one sensory detail so readers can see or hear the scene.",
      verb_upgrade: "Swap in a stronger action verb to sharpen your sentence impact.",
      clause_variety: "Add a short opening clause to vary rhythm and sentence control."
    };
    return local[focus] || "Add one precise detail, then read it aloud for punctuation control.";
  }

  function sleep(ms) {
    return new Promise(function (resolve) { window.setTimeout(resolve, ms); });
  }

  async function hashSentence(sentence) {
    var clean = normalizeSentence(sentence);
    var encoder = new TextEncoder();
    var digest = await crypto.subtle.digest("SHA-256", encoder.encode(clean));
    var bytes = Array.from(new Uint8Array(digest));
    return bytes.map(function (b) { return b.toString(16).padStart(2, "0"); }).join("");
  }

  function usageBump(field) {
    try {
      var row = JSON.parse(localStorage.getItem(usageKey) || "{}");
      row[field] = Number(row[field] || 0) + 1;
      row.lastAt = Date.now();
      localStorage.setItem(usageKey, JSON.stringify(row));
    } catch (_e) {
      // ignore
    }
  }

  function inRateLimitWindow() {
    var now = Date.now();
    if (now - limiter.AI_WINDOW_START > RATE_LIMIT_WINDOW_MS) {
      limiter.AI_WINDOW_START = now;
      limiter.AI_CALL_COUNT = 0;
    }
    return limiter.AI_CALL_COUNT < RATE_LIMIT_MAX;
  }

  function claimRateLimitSlot() {
    if (!inRateLimitWindow()) return false;
    limiter.AI_CALL_COUNT += 1;
    return true;
  }

  function shouldSkipAI(endpoint) {
    if (isDemoMode()) return true;
    if (!window.CS_CONFIG || window.CS_CONFIG.enableAI === false) return true;
    if (!endpoint) return true;
    return false;
  }

  async function fetchJsonWithTimeout(url, body, channel) {
    if (requestControllers[channel]) {
      try { requestControllers[channel].abort(); } catch (_e) { /* ignore */ }
    }
    var controller = new AbortController();
    requestControllers[channel] = controller;

    var timeoutId = window.setTimeout(function () {
      try { controller.abort(); } catch (_e) { /* ignore */ }
    }, getTimeoutMs());

    try {
      var res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
        signal: controller.signal
      });
      if (!res.ok) throw new Error("request_failed");
      var json = await res.json();
      if (!json || typeof json !== "object") throw new Error("invalid_json");
      return json;
    } finally {
      window.clearTimeout(timeoutId);
      if (requestControllers[channel] === controller) delete requestControllers[channel];
    }
  }

  async function fetchTextWithTimeout(url, body, channel) {
    if (requestControllers[channel]) {
      try { requestControllers[channel].abort(); } catch (_e) { /* ignore */ }
    }
    var controller = new AbortController();
    requestControllers[channel] = controller;

    var timeoutId = window.setTimeout(function () {
      try { controller.abort(); } catch (_e) { /* ignore */ }
    }, getTimeoutMs());

    try {
      var res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
        signal: controller.signal
      });
      if (!res.ok) throw new Error("request_failed");
      var text = String(await res.text() || "").replace(/\s+/g, " ").trim();
      if (!text) throw new Error("invalid_text");
      return text;
    } finally {
      window.clearTimeout(timeoutId);
      if (requestControllers[channel] === controller) delete requestControllers[channel];
    }
  }

  async function runDebounce(hash) {
    var now = Date.now();
    var last = Number(lastCallByHash[hash] || 0);
    var wait = Math.max(0, DEBOUNCE_MS - (now - last));
    if (wait > 0) await sleep(wait);
    lastCallByHash[hash] = Date.now();
  }

  function maybeTrackAnalytics(analysis, options) {
    if (isDemoMode()) return;
    if (!window.CSAnalyticsEngine || typeof window.CSAnalyticsEngine.updateFromAnalysis !== "function") return;
    if (window.CS_CONFIG && window.CS_CONFIG.enableAnalytics === false) return;
    window.CSAnalyticsEngine.updateFromAnalysis(analysis, {
      cohesion: options && typeof options.cohesion === "number" ? options.cohesion : undefined
    });
  }

  async function analyzeSentence(sentence, options) {
    var opts = options || {};
    var clean = normalizeSentence(sentence);
    if (!clean) {
      var empty = heuristic(clean);
      maybeTrackAnalytics(empty, opts);
      return empty;
    }

    var hash = await hashSentence(clean);
    var cache = window.CSCacheEngine && window.CSCacheEngine.get ? window.CSCacheEngine.get(hash) : null;
    if (cache && cache.analysis) {
      usageBump("cache_hits");
      maybeTrackAnalytics(cache.analysis, opts);
      return cache.analysis;
    }

    var endpoint = opts.endpoint || window.WS_AI_ENDPOINT || window.PB_AI_ENDPOINT || "";
    if (shouldSkipAI(endpoint)) {
      var local = heuristic(clean);
      usageBump("fallback_count");
      maybeTrackAnalytics(local, opts);
      return local;
    }

    await runDebounce(hash);

    if (!claimRateLimitSlot()) {
      usageBump("rate_limited");
      var limited = heuristic(clean);
      maybeTrackAnalytics(limited, opts);
      return limited;
    }

    var channel = String(opts.channel || "global-analyze");

    try {
      var json = await fetchJsonWithTimeout(endpoint, { sentence: clean }, channel);
      if (typeof json.word_count !== "number") throw new Error("schema_mismatch");
      var shaped = {
        sentence_type: json.sentence_type || "simple",
        has_reasoning: !!json.has_reasoning,
        detail_score: Number(json.detail_score || 0),
        verb_strength: json.verb_strength || "adequate",
        word_count: Number(json.word_count || 0),
        suggested_focus: json.suggested_focus || heuristic(clean).suggested_focus
      };
      if (window.CSCacheEngine && window.CSCacheEngine.set) {
        window.CSCacheEngine.set(hash, { analysis: shaped });
      }
      usageBump("ai_calls");
      maybeTrackAnalytics(shaped, opts);
      logDebug("analyzeSentence ai", { channel: channel, hash: hash.slice(0, 8) });
      return shaped;
    } catch (err) {
      var fallback = heuristic(clean);
      usageBump("fallback_count");
      maybeTrackAnalytics(fallback, opts);
      logDebug("analyzeSentence fallback", err && err.message ? err.message : err);
      return fallback;
    }
  }

  async function generateMicroCoach(sentence, focusArea, options) {
    var opts = options || {};
    var clean = normalizeSentence(sentence);
    var focus = String(focusArea || "reasoning").toLowerCase();

    if (!clean) return fallbackCoach(focus);

    var hash = await hashSentence(clean + "::" + focus);
    var cache = window.CSCacheEngine && window.CSCacheEngine.get ? window.CSCacheEngine.get(hash) : null;
    if (cache && cache.coach) {
      usageBump("cache_hits");
      return cache.coach;
    }

    var coachEndpoint = opts.coachEndpoint || window.WS_COACH_ENDPOINT || window.PB_COACH_ENDPOINT || "";
    if (shouldSkipAI(coachEndpoint)) {
      usageBump("fallback_count");
      return fallbackCoach(focus);
    }

    await runDebounce(hash);

    if (!claimRateLimitSlot()) {
      usageBump("rate_limited");
      return fallbackCoach(focus);
    }

    var channel = String(opts.channel || "global-coach");

    try {
      var text = await fetchTextWithTimeout(coachEndpoint, {
        sentence: clean,
        focus: focus
      }, channel);
      var compact = text.split(" ").slice(0, 22).join(" ");
      if (window.CSCacheEngine && window.CSCacheEngine.set) {
        window.CSCacheEngine.set(hash, { coach: compact });
      }
      usageBump("ai_calls");
      logDebug("generateMicroCoach ai", { channel: channel, hash: hash.slice(0, 8) });
      return compact;
    } catch (err) {
      usageBump("fallback_count");
      logDebug("generateMicroCoach fallback", err && err.message ? err.message : err);
      return fallbackCoach(focus);
    }
  }

  window.CSAIService = {
    hashSentence: hashSentence,
    analyzeSentence: analyzeSentence,
    generateMicroCoach: generateMicroCoach,
    heuristicAnalyze: heuristic,
    isDemoMode: isDemoMode,
    getLimiterState: function () {
      return {
        AI_CALL_COUNT: limiter.AI_CALL_COUNT,
        AI_WINDOW_START: limiter.AI_WINDOW_START
      };
    }
  };
})();
