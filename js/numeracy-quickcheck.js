(function initNumeracyQuickCheck(root) {
  "use strict";

  var state = {
    running: false,
    idx: 0,
    correct: 0,
    attempts: 0,
    startMs: 0,
    items: [],
    studentId: "demo-student",
    tier: "T2",
    durationSec: 90
  };

  function qs(id) { return document.getElementById(id); }

  function randomInt(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }

  function buildItems(count) {
    var rows = [];
    for (var i = 0; i < count; i += 1) {
      var a = randomInt(2, 20);
      var b = randomInt(1, 12);
      var op = Math.random() > 0.5 ? "+" : "-";
      if (op === "-" && b > a) {
        var t = a; a = b; b = t;
      }
      rows.push({
        prompt: a + " " + op + " " + b,
        answer: op === "+" ? a + b : a - b
      });
    }
    return rows;
  }

  function elapsedSec() {
    if (!state.startMs) return 0;
    return Math.max(0, Math.round((Date.now() - state.startMs) / 1000));
  }

  function render() {
    var prompt = qs("nq-prompt");
    var prog = qs("nq-progress");
    var timer = qs("nq-timer");
    if (!prompt || !prog || !timer) return;
    var current = state.items[state.idx];
    prompt.textContent = current ? current.prompt : "--";
    prog.textContent = Math.min(state.idx + 1, state.items.length) + "/" + state.items.length;
    timer.textContent = elapsedSec() + "s / " + state.durationSec + "s";
  }

  function finish() {
    if (!state.running) return;
    state.running = false;
    var elapsed = Math.max(1, elapsedSec());
    var accuracy = state.correct / Math.max(1, state.attempts);
    var summary = qs("nq-summary");
    if (summary) {
      summary.innerHTML = "Accuracy <strong>" + Math.round(accuracy * 100) + "%</strong> • "
        + "Correct " + state.correct + "/" + state.attempts + " • "
        + "Time " + elapsed + "s";
    }
    if (root.CSEvidenceEngine && typeof root.CSEvidenceEngine.recordEvidence === "function") {
      root.CSEvidenceEngine.recordEvidence({
        studentId: state.studentId,
        timestamp: new Date().toISOString(),
        module: "numeracy",
        activityId: "numeracy.quickcheck.v1",
        targets: ["NUM.FLU.FACT"],
        tier: state.tier,
        doseMin: 3,
        result: {
          attempts: state.attempts,
          accuracy: Number(accuracy.toFixed(3)),
          latencyMs: Math.round((elapsed * 1000) / Math.max(1, state.attempts))
        },
        confidence: 0.78,
        notes: "numeracy-quickcheck"
      });
    }
    if (root.CSSupportStore && typeof root.CSSupportStore.addEvidencePoint === "function") {
      root.CSSupportStore.addEvidencePoint(state.studentId, {
        module: "numeracy",
        domain: "numeracy.fluency",
        metrics: {
          attempts: state.attempts,
          accuracy: Math.round(accuracy * 100),
          timeOnTaskSec: elapsed
        },
        chips: [
          "Accuracy " + Math.round(accuracy * 100) + "%",
          "Attempts " + state.attempts,
          "Time " + elapsed + "s"
        ]
      });
    }
  }

  function submitAnswer() {
    if (!state.running) return;
    var input = qs("nq-answer");
    var val = Number(input && input.value);
    var current = state.items[state.idx];
    if (!current || !Number.isFinite(val)) return;
    state.attempts += 1;
    if (val === current.answer) state.correct += 1;
    if (input) input.value = "";
    state.idx += 1;
    if (state.idx >= state.items.length || elapsedSec() >= state.durationSec) {
      finish();
      render();
      return;
    }
    render();
  }

  function start() {
    var student = qs("nq-student");
    var tier = qs("nq-tier");
    state.studentId = (student && student.value || "demo-student").trim() || "demo-student";
    state.tier = tier && tier.value === "T3" ? "T3" : "T2";
    state.running = true;
    state.idx = 0;
    state.correct = 0;
    state.attempts = 0;
    state.startMs = Date.now();
    state.items = buildItems(12);
    var summary = qs("nq-summary");
    if (summary) summary.textContent = "Running quick check...";
    render();
    var input = qs("nq-answer");
    if (input) input.focus();
  }

  function bind() {
    var startBtn = qs("nq-start");
    var submitBtn = qs("nq-submit");
    var stopBtn = qs("nq-stop");
    var input = qs("nq-answer");
    if (startBtn) startBtn.addEventListener("click", start);
    if (submitBtn) submitBtn.addEventListener("click", submitAnswer);
    if (stopBtn) stopBtn.addEventListener("click", finish);
    if (input) {
      input.addEventListener("keydown", function (ev) {
        if (ev.key === "Enter") {
          ev.preventDefault();
          submitAnswer();
        }
      });
    }
    setInterval(function () {
      if (!state.running) return;
      if (elapsedSec() >= state.durationSec) finish();
      render();
    }, 500);
    render();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", bind);
  } else {
    bind();
  }
})(typeof window !== "undefined" ? window : this);
