(function planEngineModule(root, factory) {
  if (typeof module === "object" && module.exports) {
    module.exports = factory();
    return;
  }
  root.CSPlanEngine = factory();
})(typeof self !== "undefined" ? self : this, function () {
  "use strict";

  var PLAN_LIBRARY = {
    constraint_tracking: {
      label: "Constraint Tracking",
      tenMin: {
        title: "Green Lock + One Move Rule",
        steps: [
          "Model: keep greens fixed before each guess.",
          "Student runs 4 guided guesses with one-slot change only.",
          "Debrief blocked-slot errors and correction strategy."
        ],
        successCriteria: "Repeat blocked-slot count <= 1 in next quick check.",
        launch: { activity: "wordquest", url: "word-quest.html?quick=1" }
      },
      thirtyMin: {
        title: "Blocked Slot Drill + One-Change Challenge",
        steps: [
          "10 prompt drill on blocked-slot recognition.",
          "Run One-Change Challenge round in Word Quest.",
          "Capture final rule statement in student words."
        ],
        successCriteria: "Constraint violations trend down across 2 sessions.",
        launch: { activity: "wordquest", url: "word-quest.html?quick=1" }
      }
    },
    vowel_mapping: {
      label: "Vowel Mapping",
      tenMin: {
        title: "Vowel Set Test",
        steps: [
          "Run short/long vowel minimal pair warm-up.",
          "Prompt student to predict likely vowel pattern.",
          "Apply pattern before first guess."
        ],
        successCriteria: "Vowel swap count <= 2 in next quick check.",
        launch: { activity: "wordquest", url: "word-quest.html?quick=1" }
      },
      thirtyMin: {
        title: "Swap-Two-Vowels Scaffold",
        steps: [
          "Teacher models two vowel swap examples.",
          "Student solves 3 scaffolded words.",
          "Finish with 90-second quick check."
        ],
        successCriteria: "Vowel mapping need severity drops by one band.",
        launch: { activity: "wordquest", url: "word-quest.html?quick=1" }
      }
    },
    positional_strategy: {
      label: "Positional Strategy",
      tenMin: {
        title: "Slide the Misplaced",
        steps: [
          "Mark misplaced letters and move one at a time.",
          "Keep non-target letters stable for one guess.",
          "Reflect on what changed and why."
        ],
        successCriteria: "Misplace rate trends downward next 2 sessions.",
        launch: { activity: "wordquest", url: "word-quest.html?quick=1" }
      },
      thirtyMin: {
        title: "Anchor + Probe Routine",
        steps: [
          "Anchor confirmed letters first.",
          "Probe one uncertain slot per guess.",
          "Run guided + independent rounds."
        ],
        successCriteria: "Student explains position strategy independently.",
        launch: { activity: "wordquest", url: "word-quest.html?quick=1" }
      }
    },
    guess_efficiency: {
      label: "Guess Efficiency",
      tenMin: {
        title: "First Guess Recipe",
        steps: [
          "Use 2 consonants + 2 vowels + 1 wildcard.",
          "Submit first guess under 10 seconds.",
          "Review clue uptake after each guess."
        ],
        successCriteria: "Avg guess latency improves by 15%.",
        launch: { activity: "wordquest", url: "word-quest.html?quick=1" }
      },
      thirtyMin: {
        title: "90s Sprint with Rule Cue",
        steps: [
          "Run one timed sprint with pace prompts.",
          "Repeat with fewer teacher prompts.",
          "Capture pace target for next session."
        ],
        successCriteria: "Latency and attempts remain in expected band.",
        launch: { activity: "wordquest", url: "word-quest.html?quick=1" }
      }
    },
    default: {
      label: "Fluency Maintenance",
      tenMin: {
        title: "Quick confidence round",
        steps: [
          "Run one 90-second quick check.",
          "Review one strategy win.",
          "Set one concrete target for tomorrow."
        ],
        successCriteria: "Maintain stable trend in next session.",
        launch: { activity: "wordquest", url: "word-quest.html?quick=1" }
      },
      thirtyMin: {
        title: "Guided practice block",
        steps: [
          "Warm-up strategy cue.",
          "Two coached rounds.",
          "Independent quick check + note."
        ],
        successCriteria: "Trend remains stable or improves.",
        launch: { activity: "wordquest", url: "word-quest.html?quick=1" }
      }
    }
  };

  function firstNeedKey(snapshot) {
    var needs = snapshot && Array.isArray(snapshot.needs) ? snapshot.needs : [];
    return needs.length ? String(needs[0].key || "") : "default";
  }

  function buildPlan(input) {
    var student = input && input.student ? input.student : { id: "demo-student", name: "Student" };
    var snapshot = input && input.snapshot ? input.snapshot : { needs: [] };
    var needs = Array.isArray(snapshot.needs) && snapshot.needs.length ? snapshot.needs : [{ key: "default", label: "Fluency Maintenance" }];
    var key = firstNeedKey(snapshot);
    var selected = PLAN_LIBRARY[key] || PLAN_LIBRARY.default;

    var focusKeys = needs.map(function (n) { return String(n.key || "default"); }).slice(0, 3);
    var teacher = [
      "Student: " + student.name + " (" + student.id + ")",
      "Top need: " + selected.label,
      "Today's plan: " + selected.tenMin.title,
      "Success criteria: " + selected.tenMin.successCriteria
    ].join("\n");

    var family = [
      student.name + " completed a targeted literacy check today.",
      "Focus: " + selected.label + ".",
      "Next step: " + selected.tenMin.title + "."
    ].join(" ");

    var team = [
      "Need: " + selected.label,
      "10m: " + selected.tenMin.title,
      "30m: " + selected.thirtyMin.title,
      "Monitor: " + selected.tenMin.successCriteria
    ].join("\n");

    return {
      focus: focusKeys,
      plans: {
        tenMin: [selected.tenMin],
        thirtyMin: [selected.thirtyMin]
      },
      progressNoteTemplate: {
        teacher: teacher,
        family: family,
        team: team
      }
    };
  }

  return {
    buildPlan: buildPlan,
    PLAN_LIBRARY: PLAN_LIBRARY
  };
});
