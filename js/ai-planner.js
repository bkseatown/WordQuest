/**
 * ai-planner.js — Azure OpenAI integration for Cornerstone MTSS
 *
 * SETUP (one-time, 2 minutes):
 * ────────────────────────────────────────────────────────────────
 * 1. Go to https://portal.azure.com → search "Azure OpenAI"
 * 2. Create a resource (use the free/lowest tier, East US region)
 * 3. Inside the resource → "Model deployments" → Deploy "gpt-4o"
 *    (name the deployment "gpt-4o")
 * 4. Go to "Keys and Endpoint" → copy Endpoint + Key 1
 * 5. Create a file: js/ai-config.js with this content:
 *
 *    window.CSAIConfig = {
 *      endpoint: "https://YOUR-RESOURCE.openai.azure.com",
 *      apiKey:   "YOUR-KEY-1",
 *      deployment: "gpt-4o",   // must match your deployment name
 *      apiVersion: "2024-12-01-preview"
 *    };
 *
 * 6. Add to teacher-hub-v2.html (before ai-planner.js):
 *    <script src="./js/ai-config.js"></script>
 *
 * COST ESTIMATE (Azure GPT-4o):
 *   ~$5 per million input tokens, ~$15 per million output tokens
 *   A sub plan call uses ~800 tokens in + ~500 out ≈ $0.012 per call
 *   $100 credit → ~8,000+ sub plan generations
 * ────────────────────────────────────────────────────────────────
 *
 * Exports: window.CSAIPlanner
 *   .generateSubPlan(ctx)          → Promise<string>
 *   .generateCoachingNarration(ctx) → Promise<string>
 *   .generateDailyBrief(ctx)       → Promise<string>
 *   .isConfigured()                → boolean
 */
(function aiPlannerModule(root) {
  "use strict";

  var DEFAULT_SYSTEM = [
    "You are an expert learning support specialist and MTSS coordinator.",
    "You write concise, practical, evidence-based content for classroom teachers.",
    "Keep responses brief, action-oriented, and jargon-free.",
    "Use structured literacy and MTSS terminology naturally.",
    "Always reference the specific student name and skill targets provided.",
    "Never fabricate data — work only from what is given to you."
  ].join(" ");

  function getConfig() {
    return root.CSAIConfig || null;
  }

  function isConfigured() {
    var c = getConfig();
    return !!(c && c.endpoint && c.apiKey && c.deployment);
  }

  function buildUrl() {
    var c = getConfig();
    var version = c.apiVersion || "2024-12-01-preview";
    return c.endpoint.replace(/\/$/, "") +
      "/openai/deployments/" + encodeURIComponent(c.deployment) +
      "/chat/completions?api-version=" + version;
  }

  function callAzure(messages, maxTokens) {
    if (!isConfigured()) {
      return Promise.reject(new Error("CSAIConfig not set — see js/ai-planner.js setup instructions."));
    }
    var c = getConfig();
    var body = JSON.stringify({
      messages: messages,
      max_tokens: maxTokens || 600,
      temperature: 0.5
    });
    return fetch(buildUrl(), {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "api-key": c.apiKey
      },
      body: body
    }).then(function (res) {
      if (!res.ok) {
        return res.text().then(function (t) {
          throw new Error("Azure OpenAI error " + res.status + ": " + t.slice(0, 200));
        });
      }
      return res.json();
    }).then(function (data) {
      var choice = data.choices && data.choices[0];
      var text = choice && choice.message && choice.message.content;
      return String(text || "").trim();
    });
  }

  /* ── generateSubPlan ─────────────────────────────────────
   * ctx: { student, tier, recTitle, recReason, needs, goals,
   *         accommodations, teacherName, date }
   */
  function generateSubPlan(ctx) {
    var s = ctx.student || {};
    var name = s.name || "Student";
    var grade = s.gradeBand || s.grade || "";
    var tier = ctx.tier || 2;
    var needs = (ctx.needs || []).slice(0, 3).map(function (n) {
      return String(n.label || n.name || n);
    }).join(", ") || "structured literacy support";
    var goals = (ctx.goals || []).slice(0, 2).map(function (g) {
      return String(g.skill || g.domain || g);
    }).join("; ") || "skill building aligned to MTSS plan";
    var accs = (ctx.accommodations || []).slice(0, 3).map(function (a) {
      return String(a.title || a);
    }).join(", ") || "extended time, visual supports";
    var rec = ctx.recTitle || "Focused literacy session";
    var date = ctx.date || new Date().toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" });
    var teacherName = ctx.teacherName || "the learning support teacher";

    var prompt = [
      "Write a concise substitute teacher plan for ONE student.",
      "",
      "Student: " + name + " | Grade: " + grade + " | MTSS Tier: " + tier,
      "Current focus needs: " + needs,
      "Active goals: " + goals,
      "Accommodations in place: " + accs,
      "Recommended activity today: " + rec,
      "Date: " + date,
      "Regular teacher: " + teacherName,
      "",
      "Format:",
      "1. Student overview (2 sentences max — who they are, what they need)",
      "2. Today's session (step-by-step, 3-5 bullet points any sub can follow)",
      "3. If student finishes early (1-2 sentences)",
      "4. Key accommodations reminder (bullet list)",
      "5. Who to contact if unsure (leave a blank: ____________)",
      "",
      "Tone: warm, practical, 8th-grade reading level. No jargon."
    ].join("\n");

    return callAzure([
      { role: "system",  content: DEFAULT_SYSTEM },
      { role: "user",    content: prompt }
    ], 700);
  }

  /* ── generateCoachingNarration ───────────────────────────
   * ctx: { student, tier, recTitle, recReason, trendDecision, trend }
   */
  function generateCoachingNarration(ctx) {
    var s = ctx.student || {};
    var name = s.name || "This student";
    var grade = s.gradeBand || s.grade || "";
    var tier = ctx.tier || 2;
    var rec = ctx.recTitle || "focused skill practice";
    var reason = ctx.recReason || "based on recent skill signals";
    var trend = ctx.trend || "stable";
    var decision = ctx.trendDecision || "HOLD";

    var prompt = [
      "Write a 2-sentence coaching nudge for a teacher about to work with a student.",
      "",
      "Student: " + name + (grade ? " (Grade " + grade + ")" : ""),
      "MTSS Tier: " + tier,
      "Recommended activity: " + rec,
      "Why: " + reason,
      "Recent trend: " + trend + " | Intensity signal: " + decision,
      "",
      "Rules:",
      "- Exactly 2 sentences. First: what the data shows. Second: what to do.",
      "- Sound like a thoughtful colleague, not a robot.",
      "- Use the student's name.",
      "- Be specific about the skill."
    ].join("\n");

    return callAzure([
      { role: "system",  content: DEFAULT_SYSTEM },
      { role: "user",    content: prompt }
    ], 120);
  }

  /* ── generateDailyBrief ──────────────────────────────────
   * ctx: { date, students: [{ name, tier, recTitle, daysSince }] }
   */
  function generateDailyBrief(ctx) {
    var date = ctx.date || new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" });
    var students = (ctx.students || []).slice(0, 8);

    if (!students.length) {
      return Promise.resolve("No students in caseload.");
    }

    var studentLines = students.map(function (s) {
      return "- " + s.name + " (Tier " + s.tier + ")" +
        (s.recTitle ? ": " + s.recTitle : "") +
        (s.daysSince > 4 ? " — OVERDUE (" + s.daysSince + "d since last session)" : "");
    }).join("\n");

    var prompt = [
      "Write a 3-sentence daily priority briefing for a learning support teacher.",
      "Date: " + date,
      "",
      "Caseload today:",
      studentLines,
      "",
      "Format: 3 sentences only.",
      "Sentence 1: Who needs attention most urgently and why.",
      "Sentence 2: Any pattern across the caseload worth noting.",
      "Sentence 3: One concrete focus for the day.",
      "",
      "Tone: confident, collegial, brief."
    ].join("\n");

    return callAzure([
      { role: "system",  content: DEFAULT_SYSTEM },
      { role: "user",    content: prompt }
    ], 200);
  }

  /* ── Fallback generators (no API key needed) ─────────────*/

  function fallbackSubPlan(ctx) {
    var s = ctx.student || {};
    var name = s.name || "Student";
    var grade = s.gradeBand || s.grade || "";
    var tier = ctx.tier || 2;
    var rec = ctx.recTitle || "Focused literacy session";
    var accs = (ctx.accommodations || []).slice(0, 3).map(function (a) {
      return String(a.title || a);
    });
    var goals = (ctx.goals || []).slice(0, 2).map(function (g) {
      return String(g.skill || g.domain || g);
    });

    return [
      "SUB PLAN — " + name + (grade ? " (" + grade + ")" : "") + " — MTSS Tier " + tier,
      new Date().toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" }),
      "",
      "STUDENT OVERVIEW",
      name + " is receiving Tier " + tier + " support. Please follow the session plan below carefully.",
      "",
      "TODAY'S SESSION: " + rec,
      "1. Greet " + name + " and review what you'll be working on together.",
      "2. Complete the assigned activity (link provided below).",
      "3. Provide encouragement — this student responds well to positive feedback.",
      "4. Log whether the session was completed at the end.",
      "",
      "ACTIVE GOALS",
      goals.length ? goals.map(function (g, i) { return (i + 1) + ". " + g; }).join("\n") : "See teacher's plan folder.",
      "",
      "KEY ACCOMMODATIONS",
      accs.length ? accs.map(function (a) { return "• " + a; }).join("\n") : "• Extended time\n• Visual supports\n• Check for understanding frequently",
      "",
      "QUESTIONS? Contact: ____________"
    ].join("\n");
  }

  function fallbackNarration(ctx) {
    var s = ctx.student || {};
    var name = (s.name || "This student").split(" ")[0];
    var rec = ctx.recTitle || "the recommended activity";
    var trend = ctx.trend || "stable";
    var decision = ctx.trendDecision || "HOLD";
    return name + "'s recent trend is " + trend + " with a " + decision + " signal. " +
      "Focus today on " + rec.toLowerCase() + " to consolidate current skill targets.";
  }

  /* ── Public API ──────────────────────────────────────────*/

  var CSAIPlanner = {
    isConfigured: isConfigured,

    generateSubPlan: function (ctx) {
      if (!isConfigured()) return Promise.resolve(fallbackSubPlan(ctx));
      return generateSubPlan(ctx).catch(function (err) {
        console.warn("CSAIPlanner.generateSubPlan error:", err.message);
        return fallbackSubPlan(ctx);
      });
    },

    generateCoachingNarration: function (ctx) {
      if (!isConfigured()) return Promise.resolve(fallbackNarration(ctx));
      return generateCoachingNarration(ctx).catch(function (err) {
        console.warn("CSAIPlanner.generateCoachingNarration error:", err.message);
        return fallbackNarration(ctx);
      });
    },

    generateDailyBrief: function (ctx) {
      if (!isConfigured()) return Promise.resolve("AI daily brief unavailable — configure CSAIConfig to enable.");
      return generateDailyBrief(ctx).catch(function (err) {
        console.warn("CSAIPlanner.generateDailyBrief error:", err.message);
        return "Unable to generate brief. Check connection and CSAIConfig.";
      });
    }
  };

  root.CSAIPlanner = CSAIPlanner;

}(typeof globalThis !== "undefined" ? globalThis : window));
