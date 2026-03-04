(function meetingGeneratorModule(root, factory) {
  if (typeof module === "object" && module.exports) {
    module.exports = factory(root || globalThis);
    return;
  }
  root.CSMeetingGenerator = factory(root || globalThis);
})(typeof globalThis !== "undefined" ? globalThis : window, function createMeetingGenerator(root) {
  "use strict";

  function t(value, fallback) {
    var s = String(value == null ? "" : value).trim();
    return s || String(fallback || "");
  }

  function n(value, fallback) {
    var x = Number(value);
    return Number.isFinite(x) ? x : Number(fallback || 0);
  }

  function pct(value, fallback) {
    var x = n(value, fallback);
    if (x > 1) x = x / 100;
    x = Math.max(0, Math.min(1, x));
    return Math.round(x * 100) + "%";
  }

  function asLines(items) {
    return (Array.isArray(items) ? items : []).filter(Boolean).map(function (item) {
      return "• " + t(item, "");
    });
  }

  function generateMeetingDeck(input) {
    var args = input && typeof input === "object" ? input : {};
    var profile = args.studentProfile || {};
    var lit = args.literacyData || {};
    var numData = args.numeracyData || {};
    var tierSignal = args.tierSignal || {};
    var fidelity = args.fidelityData || {};

    var name = t(profile.name, "Student");
    var grade = t(profile.grade || profile.gradeBand, "Grade not set");
    var supportFocus = t(lit.focus || numData.contentFocus, "Tier-aligned literacy and numeracy support");
    var tierLevel = t(tierSignal.tierLevel || profile.tier || numData.tierSignal, "Tier 2");

    var slides = [
      {
        title: "Student Overview",
        contentBlocks: [
          "Name: " + name,
          "Grade: " + grade,
          "Support focus: " + supportFocus,
          "Current Tier: " + tierLevel
        ],
        notes: "Open with current status and support scope."
      },
      {
        title: "Literacy Snapshot",
        contentBlocks: [
          "Skill focus: " + t(lit.focus, "Foundational literacy"),
          "Trend graph summary: Recent accuracy " + pct(profile.recentAccuracy, 0.72) + " vs goal " + pct(profile.goalAccuracy, 0.8),
          "Stability count: " + Math.max(0, Math.round(n(profile.stableCount, 2))),
          "Curriculum alignment: " + t(lit.curriculumAlignment, "Aligned to active literacy pacing")
        ],
        notes: "Highlight skill trend and alignment before intervention decisions."
      },
      {
        title: "Numeracy Snapshot",
        contentBlocks: [
          "Strategy stage: " + t(numData.strategyStage, "Additive"),
          "Content focus: " + t(numData.contentFocus, "Number Fluency"),
          "Trend summary: " + t(tierSignal.trendDecision, "HOLD") + " with practice mode " + t(numData.practiceMode, "Quick Check")
        ],
        notes: "Connect stage + representation impact on accuracy."
      },
      {
        title: "Intervention Summary",
        contentBlocks: [
          "Sessions delivered: " + Math.max(0, Math.round(n(fidelity.totalSessions, 0))),
          "Fidelity %: " + Math.round(n(fidelity.fidelityPercent, 0)) + "%",
          "Duration: " + Math.max(1, Math.round(n(profile.weeksInIntervention, 6))) + " weeks"
        ],
        notes: "Use delivery consistency to contextualize decision confidence."
      },
      {
        title: "Tier Decision & Rationale",
        contentBlocks: [
          "Trend: " + t(tierSignal.trendDecision, "HOLD"),
          "Goal comparison: " + pct(profile.recentAccuracy, 0.72) + " current vs " + pct(profile.goalAccuracy, 0.8) + " goal",
          "Rule triggered: " + t((tierSignal.reasoning && tierSignal.reasoning[0]), "Tier rule based on sustained performance and intervention duration")
        ],
        notes: "Keep this evidence-focused and rule-based."
      },
      {
        title: "Recommended Next Steps",
        contentBlocks: [
          "Instructional action: " + t(lit.nextStep || numData.recommendedAction, "Continue targeted strategy-based instruction"),
          "Practice modes: " + t(numData.practiceMode, "Quick Check") + " and " + t(numData.nextPracticeMode, "Strategy Builder"),
          "Duration plan: " + Math.max(2, Math.round(n(profile.weeksInIntervention, 6))) + " week cycle with weekly review"
        ],
        notes: "State what changes now, what stays stable, and review cadence."
      },
      {
        title: "Parent Summary",
        contentBlocks: [
          t(args.parentSummary || args.parentSlideSummary || "Your child is making progress with support in reading and math."),
          "What school is doing: short, targeted instruction with regular progress checks.",
          "What family can do: practice key skills for 10 minutes and celebrate effort."
        ],
        notes: "Plain language, 6th-grade readability, no jargon."
      }
    ];

    return slides;
  }

  function generateConcernSummary(input) {
    var args = input && typeof input === "object" ? input : {};
    var profile = args.studentProfile || {};
    var tierSignal = args.tierSignal || {};
    var fidelity = args.fidelityData || {};

    return [
      {
        title: "Concern Trend",
        contentBlocks: [
          "Data trend: " + pct(profile.recentAccuracy, 0.68) + " current vs " + pct(profile.goalAccuracy, 0.8) + " goal",
          "Trend decision: " + t(tierSignal.trendDecision, "HOLD")
        ],
        notes: "Lead with signal gap and direction."
      },
      {
        title: "Tier & Fidelity",
        contentBlocks: [
          "Tier duration: " + Math.max(1, Math.round(n(profile.weeksInIntervention, 6))) + " weeks",
          "Fidelity: " + Math.round(n(fidelity.fidelityPercent, 0)) + "% over " + Math.max(0, Math.round(n(fidelity.totalSessions, 0))) + " sessions"
        ],
        notes: "Clarify implementation quality before escalation decisions."
      },
      {
        title: "Decision Recommendation",
        contentBlocks: asLines([
          t((tierSignal.reasoning && tierSignal.reasoning[0]), "Review intervention intensity and maintain data checks."),
          "Recommendation: " + t(args.recommendation, "Adjust support intensity based on current trend.")
        ]),
        notes: "Concise decision line for MDT/concern review."
      }
    ];
  }

  return {
    generateMeetingDeck: generateMeetingDeck,
    generateConcernSummary: generateConcernSummary
  };
});
