/* ═══════════════════════════════════════════════════════════
   Cornerstone MTSS — First-visit Onboarding Tour
   js/onboarding-tour.js

   window.CSTour
   ─────────────────────────────────────────────────────────── */

(function (root) {
  "use strict";

  var STORAGE_KEY = "cs.tour.v1";
  var RESET_KEY   = "cs.tour.reset";   /* set to "1" to force replay */

  /* ── Tour step definitions ──────────────────────────────── */

  var STEPS = [
    {
      id: "morning-brief",
      icon: "☀️",
      title: "Your Morning Brief",
      body: "Every morning the hub ranks your caseload by urgency. The student at the top needs attention first — based on their Tier, recent assessments, and days since last intervention.",
      target: ".th2-brief-card, .th2-morning-brief, .th2-focus-card",
      position: "right",
      highlight: true
    },
    {
      id: "caseload",
      icon: "👥",
      title: "Your Caseload",
      body: "Click any student in the sidebar to pull up their full profile — Tier, active domains, support plan, evidence timeline, and AI-generated coaching notes.",
      target: ".th2-list, .th2-sidebar",
      position: "right",
      highlight: true
    },
    {
      id: "focus-card",
      icon: "🎯",
      title: "Focus Card",
      body: "The focus card shows a student's live profile: their Tier stripe, session sparkline, active support strategies, and a one-click path to generate or update their plan.",
      target: ".th2-focus-card, .th2-main",
      position: "left",
      highlight: false
    },
    {
      id: "quick-log",
      icon: "⚡",
      title: "Quick Log",
      body: "Tap Quick Log after any session to record accuracy, notes, or a fluency score. These data points feed directly into the student's evidence timeline and inform MTSS decisions.",
      target: ".th2-action-btn[data-action='log'], .th2-quick-log-btn, .th2-log-btn, [id*='quick-log']",
      position: "top",
      highlight: true
    },
    {
      id: "curriculum",
      icon: "📚",
      title: "Curriculum Quick-Reference",
      body: "Click the Curriculum button at the bottom of the sidebar anytime for instant access to ORF passages with a 60-second timer, number talks, screeners, curriculum deep-links, and curated video resources.",
      target: "#th2-cur-btn, .th2-cur-btn",
      position: "right",
      highlight: true
    },
    {
      id: "ai",
      icon: "✦",
      title: "AI Planning",
      body: "The hub can generate a sub plan, coaching narrative, or daily brief using Azure OpenAI. Look for the ✦ AI buttons in the focus card. All AI calls are tracked in the cost dashboard (bottom-right in dev mode).",
      target: ".th2-ai-btn, [data-action='ai-plan'], .th2-generate-btn",
      position: "top",
      highlight: false
    }
  ];

  /* ── State ──────────────────────────────────────────────── */

  var state = {
    active:      false,
    step:        0,
    welcome:     null,
    backdrop:    null,
    spotlight:   null,
    tooltip:     null,
    currentEl:   null,
    listeners:   []
  };

  /* ── Helpers ────────────────────────────────────────────── */

  function $(sel, ctx) {
    return (ctx || document).querySelector(sel);
  }

  function qs(sel) {
    /* Try multiple selectors (comma-separated) and return first match */
    var parts = sel.split(",").map(function (s) { return s.trim(); });
    for (var i = 0; i < parts.length; i++) {
      try {
        var el = document.querySelector(parts[i]);
        if (el) return el;
      } catch (e) { /* invalid selector — skip */ }
    }
    return null;
  }

  function isFirstVisit() {
    if (localStorage.getItem(RESET_KEY) === "1") {
      localStorage.removeItem(RESET_KEY);
      return true;
    }
    return !localStorage.getItem(STORAGE_KEY);
  }

  function markSeen() {
    localStorage.setItem(STORAGE_KEY, "1");
  }

  function on(el, ev, fn) {
    if (!el) return;
    el.addEventListener(ev, fn);
    state.listeners.push({ el: el, ev: ev, fn: fn });
  }

  function cleanup() {
    state.listeners.forEach(function (l) {
      try { l.el.removeEventListener(l.ev, l.fn); } catch (e) {}
    });
    state.listeners = [];
    if (state.currentEl) {
      state.currentEl.classList.remove("cs-tour-target");
      state.currentEl.classList.remove("cs-tour-highlight");
      state.currentEl = null;
    }
  }

  /* ── DOM builders ───────────────────────────────────────── */

  function buildBackdrop() {
    var el = document.createElement("div");
    el.className = "cs-tour-backdrop";
    el.setAttribute("aria-hidden", "true");
    document.body.appendChild(el);
    return el;
  }

  function buildSpotlight() {
    var el = document.createElement("div");
    el.className = "cs-tour-spotlight";
    el.setAttribute("aria-hidden", "true");
    document.body.appendChild(el);
    return el;
  }

  function buildTooltip() {
    var el = document.createElement("div");
    el.className = "cs-tour-tooltip";
    el.setAttribute("role", "dialog");
    el.setAttribute("aria-modal", "false");
    el.setAttribute("aria-live", "polite");
    document.body.appendChild(el);
    return el;
  }

  function buildWelcome() {
    var el = document.createElement("div");
    el.className = "cs-tour-welcome";
    el.innerHTML =
      "<div class='cs-tour-welcome-card'>" +
        "<span class='cs-tour-welcome-emoji'>🧭</span>" +
        "<h2 class='cs-tour-welcome-title'>Welcome to Command Hub</h2>" +
        "<p class='cs-tour-welcome-subtitle'>This 30-second tour will show you the six key features. You can replay it anytime from the Help menu.</p>" +
        "<div class='cs-tour-welcome-actions'>" +
          "<button class='cs-tour-btn-start' data-action='start'>Show me around →</button>" +
          "<button class='cs-tour-btn-nothanks' data-action='skip'>I'll explore on my own</button>" +
        "</div>" +
      "</div>";
    document.body.appendChild(el);
    return el;
  }

  /* ── Position helpers ───────────────────────────────────── */

  var PAD = 12; /* spotlight padding around target */

  function getTargetRect(target) {
    if (!target) {
      /* centre of viewport */
      return { top: window.innerHeight / 2 - 60, left: window.innerWidth / 2 - 100, width: 200, height: 120 };
    }
    var r = target.getBoundingClientRect();
    return {
      top:    r.top    - PAD,
      left:   r.left   - PAD,
      width:  r.width  + PAD * 2,
      height: r.height + PAD * 2
    };
  }

  function positionSpotlight(rect) {
    var s = state.spotlight;
    s.style.top    = rect.top  + "px";
    s.style.left   = rect.left + "px";
    s.style.width  = rect.width  + "px";
    s.style.height = rect.height + "px";
  }

  function positionTooltip(step, targetEl) {
    var tt   = state.tooltip;
    var pos  = step.position || "right";
    var ttW  = 300;
    var ttH  = tt.offsetHeight || 200;
    var vW   = window.innerWidth;
    var vH   = window.innerHeight;
    var r    = targetEl ? targetEl.getBoundingClientRect() : { top: vH/2 - 100, left: vW/2 - 100, right: vW/2+100, bottom: vH/2+100, width: 200, height: 200 };
    var top, left;
    var GAP  = 18;

    if (pos === "right") {
      top  = r.top;
      left = r.right + GAP;
      if (left + ttW > vW - 8) { pos = "left"; left = r.left - ttW - GAP; }
    } else if (pos === "left") {
      top  = r.top;
      left = r.left - ttW - GAP;
      if (left < 8) { pos = "right"; left = r.right + GAP; }
    } else if (pos === "top") {
      top  = r.top - ttH - GAP;
      left = r.left + r.width / 2 - ttW / 2;
      if (top < 8) { pos = "bottom"; top = r.bottom + GAP; }
    } else { /* bottom */
      top  = r.bottom + GAP;
      left = r.left + r.width / 2 - ttW / 2;
    }

    /* clamp */
    top  = Math.max(8, Math.min(top,  vH - ttH - 8));
    left = Math.max(8, Math.min(left, vW - ttW - 8));

    tt.style.top  = top  + "px";
    tt.style.left = left + "px";
    tt.setAttribute("data-arrow", (pos === "right" ? "left" : pos === "left" ? "right" : pos === "top" ? "bottom" : "top"));
  }

  /* ── Render step ────────────────────────────────────────── */

  function renderStep(idx) {
    var step     = STEPS[idx];
    var total    = STEPS.length;
    var isFirst  = idx === 0;
    var isLast   = idx === total - 1;
    var targetEl = qs(step.target);

    /* Update spotlight */
    if (targetEl) {
      var rect = getTargetRect(targetEl);
      positionSpotlight(rect);
      state.spotlight.style.display = "block";
    } else {
      state.spotlight.style.display = "none";
    }

    /* Always elevate the target above the backdrop; pulse only when requested. */
    if (state.currentEl) {
      state.currentEl.classList.remove("cs-tour-target");
      state.currentEl.classList.remove("cs-tour-highlight");
    }
    if (targetEl) {
      targetEl.classList.add("cs-tour-target");
      if (step.highlight) targetEl.classList.add("cs-tour-highlight");
      state.currentEl = targetEl;
    } else {
      state.currentEl = null;
    }

    /* Build dots */
    var dots = "";
    for (var d = 0; d < total; d++) {
      dots += "<span class='cs-tour-dot" + (d === idx ? " active" : "") + "'></span>";
    }

    /* Build tooltip HTML */
    var prevBtn = !isFirst ?
      "<button class='cs-tour-btn cs-tour-btn-prev' data-action='prev'>← Back</button>" : "";
    var nextBtn = !isLast ?
      "<button class='cs-tour-btn cs-tour-btn-next' data-action='next'>Next →</button>" :
      "<button class='cs-tour-btn cs-tour-btn-finish' data-action='finish'>Get started ✓</button>";

    state.tooltip.innerHTML =
      "<div class='cs-tour-tooltip-head'>" +
        "<span class='cs-tour-tooltip-icon'>" + (step.icon || "✦") + "</span>" +
        "<h3 class='cs-tour-tooltip-title'>" + step.title + "</h3>" +
      "</div>" +
      "<p class='cs-tour-tooltip-body'>" + step.body + "</p>" +
      "<div class='cs-tour-tooltip-footer'>" +
        "<div class='cs-tour-step-dots'>" + dots + "</div>" +
        "<div class='cs-tour-nav'>" +
          "<button class='cs-tour-btn cs-tour-btn-skip' data-action='skip'>Skip</button>" +
          prevBtn +
          nextBtn +
        "</div>" +
      "</div>";

    /* Position tooltip */
    positionTooltip(step, targetEl);
    state.tooltip.classList.add("cs-tour-visible");

    /* Wire buttons */
    cleanup();
    state.tooltip.querySelectorAll("[data-action]").forEach(function (btn) {
      on(btn, "click", function (e) {
        var action = btn.getAttribute("data-action");
        if (action === "next")   api.next();
        if (action === "prev")   api.prev();
        if (action === "skip")   api.stop(false);
        if (action === "finish") api.stop(true);
      });
    });

    /* Scroll target into view if off-screen */
    if (targetEl) {
      targetEl.scrollIntoView({ block: "nearest", behavior: "smooth" });
    }
  }

  /* ── Public API ─────────────────────────────────────────── */

  var api = {

    /** Check if it's the user's first visit and show tour if so */
    init: function () {
      if (isFirstVisit()) {
        /* Slight delay so the hub is fully rendered */
        setTimeout(api.showWelcome, 800);
      }
    },

    /** Force-replay the tour (e.g., from Help menu) */
    replay: function () {
      localStorage.setItem(RESET_KEY, "1");
      api.showWelcome();
    },

    /** Show the welcome card (pre-tour) */
    showWelcome: function () {
      if (state.active) return;

      /* Build overlay */
      state.backdrop  = buildBackdrop();
      state.spotlight = buildSpotlight();
      state.tooltip   = buildTooltip();
      state.welcome   = buildWelcome();

      /* Animate backdrop */
      requestAnimationFrame(function () {
        state.backdrop.classList.add("cs-tour-visible");
        state.spotlight.style.display = "none";
      });

      /* Wire welcome buttons */
      state.welcome.querySelectorAll("[data-action]").forEach(function (btn) {
        btn.addEventListener("click", function () {
          var action = btn.getAttribute("data-action");
          if (action === "start") {
            state.welcome.remove();
            state.welcome = null;
            api.start();
          }
          if (action === "skip") {
            api.stop(false);
          }
        });
      });
    },

    /** Begin the step sequence */
    start: function () {
      state.active = true;
      state.step   = 0;
      renderStep(0);
    },

    /** Move to next step */
    next: function () {
      if (state.step < STEPS.length - 1) {
        state.step++;
        renderStep(state.step);
      }
    },

    /** Move to previous step */
    prev: function () {
      if (state.step > 0) {
        state.step--;
        renderStep(state.step);
      }
    },

    /** End the tour */
    stop: function (completed) {
      markSeen();
      cleanup();
      state.active = false;

      var removeEl = function (el) { if (el) { el.classList.remove("cs-tour-visible"); setTimeout(function () { if (el.parentNode) el.remove(); }, 350); } };
      removeEl(state.backdrop);
      removeEl(state.spotlight);
      removeEl(state.tooltip);
      if (state.welcome && state.welcome.parentNode) state.welcome.remove();

      state.backdrop  = null;
      state.spotlight = null;
      state.tooltip   = null;
      state.welcome   = null;

      if (completed) {
        /* Dispatch event so analytics can track it */
        window.dispatchEvent(new CustomEvent("cs-tour-completed", { detail: { steps: STEPS.length } }));
      }
    },

    /** Returns true if tour has been seen */
    hasBeenSeen: function () { return !!localStorage.getItem(STORAGE_KEY); },

    /** Force reset (show on next init) */
    reset: function () { localStorage.removeItem(STORAGE_KEY); }
  };

  /* ── Handle viewport resize ─────────────────────────────── */

  window.addEventListener("resize", function () {
    if (!state.active) return;
    renderStep(state.step);
  });

  /* ── Keyboard nav ───────────────────────────────────────── */

  document.addEventListener("keydown", function (e) {
    if (!state.active) return;
    if (e.key === "ArrowRight" || e.key === "Enter") api.next();
    if (e.key === "ArrowLeft") api.prev();
    if (e.key === "Escape") api.stop(false);
  });

  root.CSTour = api;

})(window);
