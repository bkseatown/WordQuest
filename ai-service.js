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
  var schema = window.CSStorageSchema || null;

  if (schema && typeof schema.migrateStorageIfNeeded === "function") {
    schema.migrateStorageIfNeeded();
  }

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

  function clampTierLevel(rawTier) {
    var engine = window.CSPedagogyEngine;
    if (engine && typeof engine.clampTier === "function") return engine.clampTier(rawTier);
    var n = Number(rawTier);
    if (n === 1 || n === 2 || n === 3) return n;
    var text = String(rawTier || "").toLowerCase();
    if (text.indexOf("tier 1") >= 0 || text.indexOf("tier1") >= 0 || text === "1") return 1;
    if (text.indexOf("tier 3") >= 0 || text.indexOf("tier3") >= 0 || text === "3") return 3;
    return 2;
  }

  function validPrimaryFocus(value) {
    var focus = String(value || "");
    var list = (window.CSPedagogyEngine && window.CSPedagogyEngine.VALID_PRIMARY) || [
      "reasoning",
      "detail",
      "verb_precision",
      "cohesion",
      "sentence_control"
    ];
    return list.indexOf(focus) >= 0 ? focus : "";
  }

  function compactWords(text, limit) {
    return String(text || "").trim().split(/\s+/).filter(Boolean).slice(0, limit).join(" ");
  }

  function normalizeInstructionalLens(options, focusArea, tierLevel, analysis) {
    var opts = options || {};
    var engine = window.CSPedagogyEngine;
    var lensInput = opts.instructionalLens && typeof opts.instructionalLens === "object"
      ? opts.instructionalLens
      : {
        studentTier: tierLevel,
        targetSkill: focusArea || (analysis && analysis.suggested_focus) || "reasoning",
        focus: Array.isArray(opts.focus) ? opts.focus : (focusArea ? [focusArea] : []),
        languageProfile: opts.languageProfile || "general",
        gradeBand: opts.gradeBand || "6-8"
      };
    if (engine && typeof engine.buildInstructionalLens === "function") {
      return engine.buildInstructionalLens(lensInput, tierLevel, focusArea || (analysis && analysis.suggested_focus));
    }
    return lensInput;
  }

  function fallbackPedagogy(sentence, focusArea, tierLevel, analysis, lens) {
    var engine = window.CSPedagogyEngine;
    var instructionalLens = normalizeInstructionalLens({ instructionalLens: lens }, focusArea, tierLevel, analysis);
    var clean = normalizeSentence(sentence);
    if (engine && typeof engine.heuristicStructuredFeedback === "function" && typeof engine.toLegacyPedagogy === "function") {
      var structured = engine.heuristicStructuredFeedback(clean, instructionalLens, analysis || heuristic(clean));
      var legacy = engine.toLegacyPedagogy(structured, instructionalLens, analysis || heuristic(clean));
      return {
        instructional_lens: instructionalLens,
        tier_policy: engine.getTierPolicy ? engine.getTierPolicy(instructionalLens) : { tierLevel: clampTierLevel(tierLevel) },
        structured_feedback: structured,
        skills_detected: legacy.skills_detected,
        primary_focus: legacy.primary_focus,
        coach_prompt: legacy.coach_prompt,
        suggested_stem: legacy.suggested_stem,
        extension_option: legacy.extension_option
      };
    }
    var tier = clampTierLevel(tierLevel);
    var focus = validPrimaryFocus(focusArea) || (analysis && validPrimaryFocus(analysis.suggested_focus)) || "reasoning";
    var coach = fallbackCoach(focus);
    return {
      instructional_lens: instructionalLens,
      tier_policy: { tierLevel: tier },
      structured_feedback: {
        clarity_score: 1,
        complexity_score: 1,
        cohesion_score: 1,
        reasoning_score: focus === "reasoning" ? 1 : 2,
        specific_next_step: compactWords(coach, 18),
        model_revision: tier === 3 ? "Because ___, ___." : "Add one precise revision.",
        teacher_note: "Use one guided revision cycle aligned to target skill."
      },
      skills_detected: {
        reasoning: !!(analysis && analysis.has_reasoning),
        detail_score: Number((analysis && analysis.detail_score) || 1),
        verb_strength: String((analysis && analysis.verb_strength) || "adequate"),
        cohesion_score: analysis && analysis.has_reasoning ? 3 : 1,
        sentence_control_score: /[.!?]$/.test(clean) ? 3 : 1
      },
      primary_focus: focus,
      coach_prompt: compactWords(coach, 30),
      suggested_stem: tier === 3 ? "Because ___, ___." : null,
      extension_option: tier === 1 ? "Add one contrast or qualifying clause to deepen precision." : null
    };
  }

  function parseStructuredFeedback(payload) {
    if (!payload || typeof payload !== "object") throw new Error("invalid_json");
    var shaped = {
      clarity_score: Math.max(0, Math.min(4, Number(payload.clarity_score))),
      complexity_score: Math.max(0, Math.min(4, Number(payload.complexity_score))),
      cohesion_score: Math.max(0, Math.min(4, Number(payload.cohesion_score))),
      reasoning_score: Math.max(0, Math.min(4, Number(payload.reasoning_score))),
      specific_next_step: compactWords(String(payload.specific_next_step || ""), 30),
      model_revision: compactWords(String(payload.model_revision || ""), 24),
      teacher_note: compactWords(String(payload.teacher_note || ""), 30)
    };
    if (!shaped.specific_next_step || !shaped.model_revision || !shaped.teacher_note) {
      throw new Error("schema_mismatch");
    }
    return shaped;
  }

  function parsePedagogyShape(payload, sentence, focusArea, tierLevel, analysis, lens) {
    if (!payload || typeof payload !== "object") throw new Error("invalid_json");
    var engine = window.CSPedagogyEngine;
    var instructionalLens = normalizeInstructionalLens({ instructionalLens: lens }, focusArea, tierLevel, analysis);
    var policy = engine && typeof engine.getTierPolicy === "function"
      ? engine.getTierPolicy(instructionalLens)
      : { tierLevel: clampTierLevel(tierLevel), stemAllowed: clampTierLevel(tierLevel) === 3, challengeAllowed: clampTierLevel(tierLevel) === 1 };

    // Preferred new contract
    if (payload.clarity_score !== undefined && payload.complexity_score !== undefined && payload.cohesion_score !== undefined && payload.reasoning_score !== undefined) {
      var structured = parseStructuredFeedback(payload);
      var legacy = engine && typeof engine.toLegacyPedagogy === "function"
        ? engine.toLegacyPedagogy(structured, instructionalLens, analysis)
        : null;
      var fallbackPrimary = validPrimaryFocus(focusArea) || "reasoning";
      return {
        instructional_lens: instructionalLens,
        tier_policy: policy,
        structured_feedback: structured,
        skills_detected: legacy ? legacy.skills_detected : {
          reasoning: structured.reasoning_score >= 2,
          detail_score: Math.round((structured.clarity_score / 4) * 5),
          verb_strength: structured.complexity_score >= 3 ? "strong" : "adequate",
          cohesion_score: Math.round((structured.cohesion_score / 4) * 5),
          sentence_control_score: Math.round((structured.clarity_score / 4) * 5)
        },
        primary_focus: legacy ? legacy.primary_focus : fallbackPrimary,
        coach_prompt: legacy ? legacy.coach_prompt : compactWords(structured.specific_next_step, 30),
        suggested_stem: policy.stemAllowed ? (legacy ? legacy.suggested_stem : structured.model_revision) : null,
        extension_option: policy.challengeAllowed ? (legacy ? legacy.extension_option : structured.teacher_note) : null
      };
    }

    // Backward-compatible legacy contract from previous endpoint behavior.
    if (!payload.skills_detected || typeof payload.skills_detected !== "object") throw new Error("schema_mismatch");
    var primary = validPrimaryFocus(payload.primary_focus);
    if (!primary) throw new Error("schema_mismatch");

    var tier = clampTierLevel(tierLevel);
    var skills = payload.skills_detected || {};
    var verbStrength = String(skills.verb_strength || "adequate").toLowerCase();
    if (verbStrength !== "weak" && verbStrength !== "adequate" && verbStrength !== "strong") {
      verbStrength = "adequate";
    }

    var legacyShaped = {
      skills_detected: {
        reasoning: !!skills.reasoning,
        detail_score: Math.max(0, Math.min(5, Number(skills.detail_score || 0))),
        verb_strength: verbStrength,
        cohesion_score: Math.max(0, Math.min(5, Number(skills.cohesion_score || 0))),
        sentence_control_score: Math.max(0, Math.min(5, Number(skills.sentence_control_score || 0)))
      },
      primary_focus: primary,
      coach_prompt: compactWords(String(payload.coach_prompt || ""), 30),
      suggested_stem: payload.suggested_stem == null ? null : String(payload.suggested_stem),
      extension_option: payload.extension_option == null ? null : String(payload.extension_option)
    };

    if (!legacyShaped.coach_prompt) throw new Error("schema_mismatch");
    if (tier !== 3) legacyShaped.suggested_stem = null;
    if (tier !== 1) legacyShaped.extension_option = null;
    var structuredFromLegacy = engine && typeof engine.heuristicStructuredFeedback === "function"
      ? engine.heuristicStructuredFeedback(sentence, instructionalLens, analysis)
      : {
        clarity_score: Math.max(0, Math.min(4, Math.round((legacyShaped.skills_detected.sentence_control_score || 0) / 5 * 4))),
        complexity_score: Math.max(0, Math.min(4, legacyShaped.skills_detected.verb_strength === "strong" ? 3 : 2)),
        cohesion_score: Math.max(0, Math.min(4, Math.round((legacyShaped.skills_detected.cohesion_score || 0) / 5 * 4))),
        reasoning_score: legacyShaped.skills_detected.reasoning ? 3 : 1,
        specific_next_step: legacyShaped.coach_prompt,
        model_revision: legacyShaped.suggested_stem || "Add one targeted revision.",
        teacher_note: legacyShaped.extension_option || "Continue targeted practice."
      };
    return {
      instructional_lens: instructionalLens,
      tier_policy: policy,
      structured_feedback: structuredFromLegacy,
      skills_detected: legacyShaped.skills_detected,
      primary_focus: legacyShaped.primary_focus,
      coach_prompt: legacyShaped.coach_prompt,
      suggested_stem: legacyShaped.suggested_stem,
      extension_option: legacyShaped.extension_option
    };
  }

  function fallbackMiniLesson(input) {
    var src = input && typeof input === "object" ? input : {};
    var skill = String(src.targetSkill || "reasoning");
    var gradeBand = String(src.gradeBand || "3-5");
    return {
      objective: "Students will improve " + skill.replace(/_/g, " ") + " in one revised sentence.",
      teacherModel: "Model: Because the roads were flooded, buses arrived late.",
      guidedPrompt: "Revise: The buses were late. Show " + skill.replace(/_/g, " ") + ".",
      commonErrors: ["No explicit connector", "Vague language", "Missing punctuation"],
      quickPractice: "Students revise one sentence and share the exact change they made.",
      exitTicket: "Write one grade-" + gradeBand + " sentence that shows " + skill.replace(/_/g, " ") + "."
    };
  }

  function parseMiniLessonShape(payload) {
    if (!payload || typeof payload !== "object") throw new Error("invalid_json");
    var commonErrors = Array.isArray(payload.commonErrors) ? payload.commonErrors : [];
    var shaped = {
      objective: compactWords(String(payload.objective || ""), 45),
      teacherModel: compactWords(String(payload.teacherModel || ""), 45),
      guidedPrompt: compactWords(String(payload.guidedPrompt || ""), 45),
      commonErrors: commonErrors.slice(0, 4).map(function (x) { return compactWords(String(x || ""), 12); }).filter(Boolean),
      quickPractice: compactWords(String(payload.quickPractice || ""), 45),
      exitTicket: compactWords(String(payload.exitTicket || ""), 45)
    };
    if (!shaped.objective || !shaped.teacherModel || !shaped.guidedPrompt || !shaped.quickPractice || !shaped.exitTicket) {
      throw new Error("schema_mismatch");
    }
    if (!shaped.commonErrors.length) shaped.commonErrors = ["Vague language", "Missing connector"];
    return shaped;
  }

  function fallbackTeacherSummary(input) {
    var src = input && typeof input === "object" ? input : {};
    var snapshot = src.snapshot && typeof src.snapshot === "object" ? src.snapshot : {};
    var reasoningPct = Math.round(Number(snapshot.reasoningPct || 0));
    var strongPct = Math.round(Number(snapshot.strongPct || 0));
    var cohesion = Number(snapshot.cohesionAvg || 0);
    if (reasoningPct < 40) {
      return {
        summary: "Class shows weak causal reasoning across sentences.",
        action: "Run a 15-minute Tier 2 small group: Sentence Surgery Timed Level 2 + Because/But/So expansion."
      };
    }
    if (strongPct < 40) {
      return {
        summary: "Verb precision is below target despite basic sentence completion.",
        action: "Run a 15-minute verb precision cycle with guided revision and one timed round."
      };
    }
    if (cohesion < 2.2) {
      return {
        summary: "Sentence-to-sentence cohesion is inconsistent.",
        action: "Run a 15-minute connector routine: Connect-It matching + one revised paragraph transfer."
      };
    }
    return {
      summary: "Class trend is stable with strongest performance in sentence control.",
      action: "Assign Tier 1 extension: multi-clause precision and stylistic refinement."
    };
  }

  function parseTeacherSummary(payload) {
    if (!payload || typeof payload !== "object") throw new Error("invalid_json");
    var summary = compactWords(String(payload.summary || ""), 30);
    var action = compactWords(String(payload.action || ""), 30);
    if (!summary || !action) throw new Error("schema_mismatch");
    return { summary: summary, action: action };
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
      var row = schema && typeof schema.safeLoadJSON === "function"
        ? schema.safeLoadJSON(usageKey, {})
        : JSON.parse(localStorage.getItem(usageKey) || "{}");
      row[field] = Number(row[field] || 0) + 1;
      row.lastAt = Date.now();
      if (schema && typeof schema.safeSaveJSON === "function") schema.safeSaveJSON(usageKey, row);
      else localStorage.setItem(usageKey, JSON.stringify(row));
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
    var pedagogy = await generatePedagogyFeedback(sentence, focusArea, options);
    return pedagogy && pedagogy.coach_prompt ? pedagogy.coach_prompt : fallbackCoach(focusArea);
  }

  async function generatePedagogyFeedback(sentence, focusArea, options) {
    var opts = options || {};
    var clean = normalizeSentence(sentence);
    var focus = String(focusArea || "reasoning").toLowerCase();
    var tierLevel = clampTierLevel(opts.tierLevel);
    var baseAnalysis = opts.analysis && typeof opts.analysis === "object"
      ? opts.analysis
      : heuristic(clean);
    var lens = normalizeInstructionalLens(opts, focus, tierLevel, baseAnalysis);
    if (!clean) return fallbackPedagogy(clean, focus, tierLevel, baseAnalysis, lens);

    var hash = await hashSentence(clean + "::" + focus + "::t" + String(tierLevel) + "::lens::" + JSON.stringify(lens));
    var cache = window.CSCacheEngine && window.CSCacheEngine.get ? window.CSCacheEngine.get(hash) : null;
    if (cache && cache.pedagogy) {
      usageBump("cache_hits");
      return cache.pedagogy;
    }

    var coachEndpoint = opts.pedagogyEndpoint || opts.coachEndpoint || window.WS_COACH_ENDPOINT || window.PB_COACH_ENDPOINT || "";
    if (shouldSkipAI(coachEndpoint)) {
      usageBump("fallback_count");
      return fallbackPedagogy(clean, focus, tierLevel, baseAnalysis, lens);
    }

    await runDebounce(hash);

    if (!claimRateLimitSlot()) {
      usageBump("rate_limited");
      return fallbackPedagogy(clean, focus, tierLevel, baseAnalysis, lens);
    }

    var channel = String(opts.channel || "global-pedagogy");
    var engine = window.CSPedagogyEngine;
    var systemPrompt = engine && typeof engine.buildPedagogyPrompt === "function"
      ? engine.buildPedagogyPrompt(clean, lens)
      : "";

    try {
      var json = await fetchJsonWithTimeout(coachEndpoint, {
        sentence: clean,
        focus: focus,
        tier_level: tierLevel,
        instructional_lens: lens,
        response_format: "json",
        system_prompt: systemPrompt
      }, channel);
      var shaped = parsePedagogyShape(json, clean, focus, tierLevel, baseAnalysis, lens);
      if (window.CSCacheEngine && window.CSCacheEngine.set) {
        window.CSCacheEngine.set(hash, { pedagogy: shaped, coach: shaped.coach_prompt });
      }
      usageBump("ai_calls");
      logDebug("generatePedagogyFeedback ai", { channel: channel, hash: hash.slice(0, 8) });
      return shaped;
    } catch (err) {
      usageBump("fallback_count");
      logDebug("generatePedagogyFeedback fallback", err && err.message ? err.message : err);
      return fallbackPedagogy(clean, focus, tierLevel, baseAnalysis, lens);
    }
  }

  async function generateMiniLesson(input) {
    var req = input && typeof input === "object" ? input : {};
    var targetSkill = String(req.targetSkill || "reasoning");
    var gradeBand = String(req.gradeBand || "3-5");
    var tier = clampTierLevel(req.tier);
    var channel = String(req.channel || "global-mini-lesson");
    var endpoint = req.lessonEndpoint || req.coachEndpoint || window.WS_COACH_ENDPOINT || window.PB_COACH_ENDPOINT || "";

    var hash = await hashSentence("mini-lesson::" + targetSkill + "::" + gradeBand + "::tier" + tier);
    var cache = window.CSCacheEngine && window.CSCacheEngine.get ? window.CSCacheEngine.get(hash) : null;
    if (cache && cache.miniLesson) {
      usageBump("cache_hits");
      return cache.miniLesson;
    }

    if (shouldSkipAI(endpoint)) {
      usageBump("fallback_count");
      return fallbackMiniLesson(req);
    }

    await runDebounce(hash);
    if (!claimRateLimitSlot()) {
      usageBump("rate_limited");
      return fallbackMiniLesson(req);
    }

    var skillKeys = Object.keys((window.CSPedagogyEngine && window.CSPedagogyEngine.CS_SKILLS) || {
      reasoning: true,
      detail: true,
      verb_precision: true,
      cohesion: true,
      sentence_control: true
    });
    var systemPrompt = [
      "You are a literacy intervention assistant.",
      "Return ONLY valid JSON with keys: objective, teacherModel, guidedPrompt, commonErrors, quickPractice, exitTicket.",
      "Total output under 250 words.",
      "Structured concise language only. No fluff.",
      "Include one explicit modeling sentence in teacherModel.",
      "Tier-aware supports: Tier 3 include stem support; Tier 2 guided revision; Tier 1 extension challenge.",
      "Align to skill taxonomy: " + skillKeys.join(", ") + "."
    ].join(" ");
    try {
      var json = await fetchJsonWithTimeout(endpoint, {
        response_format: "json",
        mode: "mini_lesson",
        target_skill: targetSkill,
        grade_band: gradeBand,
        tier_level: tier,
        system_prompt: systemPrompt
      }, channel);
      var shaped = parseMiniLessonShape(json);
      if (window.CSCacheEngine && window.CSCacheEngine.set) {
        window.CSCacheEngine.set(hash, { miniLesson: shaped });
      }
      usageBump("ai_calls");
      logDebug("generateMiniLesson ai", { channel: channel, hash: hash.slice(0, 8) });
      return shaped;
    } catch (err) {
      usageBump("fallback_count");
      logDebug("generateMiniLesson fallback", err && err.message ? err.message : err);
      return fallbackMiniLesson(req);
    }
  }

  async function generateTeacherSummary(input) {
    var req = input && typeof input === "object" ? input : {};
    var endpoint = req.summaryEndpoint || req.coachEndpoint || window.WS_COACH_ENDPOINT || window.PB_COACH_ENDPOINT || "";
    var channel = String(req.channel || "global-teacher-summary");
    if (shouldSkipAI(endpoint)) return fallbackTeacherSummary(req);
    if (!claimRateLimitSlot()) return fallbackTeacherSummary(req);

    try {
      var json = await fetchJsonWithTimeout(endpoint, {
        response_format: "json",
        mode: "teacher_summary",
        class_snapshot: req.snapshot || {},
        group_recommendations: req.recommendations || [],
        system_prompt: "Return JSON only with keys summary and action. Keep both concise and intervention-focused."
      }, channel);
      usageBump("ai_calls");
      return parseTeacherSummary(json);
    } catch (_err) {
      usageBump("fallback_count");
      return fallbackTeacherSummary(req);
    }
  }

  window.CSAIService = {
    hashSentence: hashSentence,
    analyzeSentence: analyzeSentence,
    generatePedagogyFeedback: generatePedagogyFeedback,
    generateMiniLesson: generateMiniLesson,
    generateTeacherSummary: generateTeacherSummary,
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
