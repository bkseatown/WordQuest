(function gameShellModule(root, factory) {
  if (typeof module === "object" && module.exports) {
    module.exports = factory();
    return;
  }
  root.CSGameShell = factory();
})(typeof globalThis !== "undefined" ? globalThis : window, function createGameShellFactory() {
  "use strict";

  var runtimeRoot = typeof globalThis !== "undefined" ? globalThis : window;

  function normalizeGradeBand(value) {
    var raw = String(value || "").toUpperCase();
    if (raw === "K-2" || raw === "3-5" || raw === "6-8" || raw === "9-12") return raw;
    if (/K|1|2/.test(raw)) return "K-2";
    if (/3|4|5/.test(raw)) return "3-5";
    if (/6|7|8/.test(raw)) return "6-8";
    return "9-12";
  }

  function parseParams() {
    var params = new URLSearchParams(runtimeRoot.location.search || "");
    return {
      studentId: String(params.get("student") || "").trim(),
      classId: String(params.get("classId") || params.get("class") || params.get("blockId") || "").trim(),
      lessonContextId: String(params.get("lessonContextId") || "").trim(),
      subject: String(params.get("subject") || "").trim(),
      programId: String(params.get("programId") || "").trim(),
      gameId: String(params.get("game") || "").trim(),
      gradeBand: String(params.get("gradeBand") || params.get("grade") || "").trim(),
      lessonTitle: String(params.get("lesson") || "").trim(),
      skillFocus: String(params.get("skillFocus") || "").trim()
    };
  }

  function loadTeacherContext(params) {
    var context = {
      studentId: params.studentId,
      classId: params.classId,
      lessonContextId: params.lessonContextId,
      subject: params.subject,
      programId: params.programId,
      lessonTitle: params.lessonTitle,
      skillFocus: params.skillFocus,
      vocabularyFocus: params.skillFocus
    };
    var TeacherSelectors = runtimeRoot.CSTeacherSelectors || null;
    if (TeacherSelectors && typeof TeacherSelectors.loadCaseload === "function" && params.studentId) {
      var student = (TeacherSelectors.loadCaseload({ TeacherStorage: runtimeRoot.CSTeacherStorage }).filter(function (row) {
        return String(row.id || "") === params.studentId;
      })[0] || null);
      if (student) {
        context.studentName = student.name || "";
        context.gradeBand = normalizeGradeBand(student.gradeBand || student.grade || params.gradeBand || "3-5");
      }
    }
    if (!context.gradeBand) context.gradeBand = normalizeGradeBand(params.gradeBand || "3-5");
    if (TeacherSelectors && typeof TeacherSelectors.getLessonContext === "function" && params.lessonContextId) {
      var lesson = TeacherSelectors.getLessonContext(params.lessonContextId, { TeacherStorage: runtimeRoot.CSTeacherStorage }) || null;
      if (lesson) {
        context.lessonTitle = lesson.title || context.lessonTitle;
        context.subject = context.subject || lesson.subject || "";
        context.programId = context.programId || lesson.programId || "";
        context.conceptFocus = lesson.conceptFocus || "";
        context.vocabularyFocus = lesson.title || context.skillFocus || "";
      }
    }
    if (TeacherSelectors && typeof TeacherSelectors.buildClassContext === "function" && params.classId) {
      var block = TeacherSelectors.getBlockById ? TeacherSelectors.getBlockById(params.classId, "", { TeacherStorage: runtimeRoot.CSTeacherStorage }) : null;
      var classContext = TeacherSelectors.buildClassContext(block, { TeacherStorage: runtimeRoot.CSTeacherStorage }) || null;
      if (classContext) {
        context.classLabel = classContext.label || "";
        context.subject = context.subject || classContext.subject || "";
        context.programId = context.programId || classContext.curriculum || "";
        context.lessonTitle = context.lessonTitle || classContext.lesson || "";
        context.conceptFocus = context.conceptFocus || classContext.conceptFocus || "";
      }
    }
    context.subject = context.subject || (runtimeRoot.CSGameContentRegistry && runtimeRoot.CSGameContentRegistry.inferSubject
      ? runtimeRoot.CSGameContentRegistry.inferSubject(context)
      : "ELA");
    return context;
  }

  function guessState(guess, word) {
    var result = Array(word.length).fill("absent");
    var letters = word.split("");
    var guessLetters = guess.split("");
    guessLetters.forEach(function (letter, index) {
      if (letter === letters[index]) {
        result[index] = "correct";
        letters[index] = null;
        guessLetters[index] = null;
      }
    });
    guessLetters.forEach(function (letter, index) {
      if (letter && letters.indexOf(letter) >= 0) {
        result[index] = "present";
        letters[letters.indexOf(letter)] = null;
      }
    });
    return result;
  }

  function createGames(context) {
    var registry = runtimeRoot.CSGameContentRegistry;
    var wordConnectionsEngine = runtimeRoot.CSWordConnectionsEngine;

    return {
      "word-quest": {
        id: "word-quest",
        title: "Word Quest",
        subtitle: "Shared-engine version with the same quick, clue-first cadence.",
        tags: ["Literacy", "Fast Entry", "Timed or Untimed"],
        modeLabel: "Core Game",
        baseTimerSeconds: 75,
        roundTarget: 6,
        createRound: function (input) {
          var row = registry.pickRound("word-quest", input.context, input.history) || {};
          return {
            id: row.id || ("wq-" + Date.now()),
            promptLabel: "Solve the target word from the clue.",
            entryLabel: row.clue || "New clue ready.",
            prompt: row.clue || "New clue ready.",
            answer: String(row.word || "trace").toLowerCase(),
            timerSeconds: 75,
            hint: "Look for a word tied to " + (input.context.subject || "today's lesson") + ".",
            basePoints: 110
          };
        },
        evaluateRound: function (payload) {
          var response = payload.response || {};
          var round = payload.round || {};
          if (response.teacherOverride) return { correct: true, teacherOverride: true, message: "Teacher advanced the round." };
          if (response.timedOut) return { correct: false, message: "Time ended. The target was " + String(round.answer || "").toUpperCase() + "." };
          var guess = String(response.value || "").trim().toLowerCase();
          if (!guess) return { correct: false, message: "No guess submitted. The target was " + String(round.answer || "").toUpperCase() + "." };
          if (guess === round.answer) return { correct: true, message: "Correct. " + String(round.answer || "").toUpperCase() + " is the target." };
          var states = guessState(guess, round.answer);
          var hitCount = states.filter(function (value) { return value === "correct" || value === "present"; }).length;
          return {
            correct: false,
            nearMiss: hitCount >= Math.max(1, Math.floor(round.answer.length / 2)),
            message: hitCount ? "Strong partial match. The target was " + String(round.answer || "").toUpperCase() + "." : "Not this round. The target was " + String(round.answer || "").toUpperCase() + ".",
            evaluation: states
          };
        }
      },
      "word-connections": {
        id: "word-connections",
        title: "Word Connections",
        subtitle: "Academic language round built on the shared runtime.",
        tags: ["Vocabulary", "Morphology", "Teacher Guided"],
        modeLabel: "Shared Practice",
        baseTimerSeconds: 60,
        roundTarget: 6,
        createRound: function (input) {
          var row = registry.pickRound("word-connections", input.context, input.history) || {};
          var generated = wordConnectionsEngine && typeof wordConnectionsEngine.generateWordConnectionsRound === "function"
            ? wordConnectionsEngine.generateWordConnectionsRound({
                mode: String(input.settings.difficulty || "core").toUpperCase() === "STRETCH" ? "INTERVENTION" : "TARGETED",
                skillNode: input.context.skillFocus || row.skillTag || "LIT.VOC.ACAD",
                tierLevel: input.settings.viewMode === "projector" ? "Tier 2" : "Tier 3",
                selectedCard: row
              })
            : null;
          return {
            id: row.id || ("wc-" + Date.now()),
            promptLabel: "Explain the target without the forbidden words.",
            entryLabel: generated && generated.instructionalFocus || "Explain with academic precision.",
            targetWord: generated && generated.targetWord || row.target || "analyze",
            forbiddenWords: generated && generated.forbiddenWords || row.forbidden || [],
            scaffolds: generated && generated.scaffolds || row.scaffolds || [],
            requiredMove: row.requiredMove || "Use one complete academic sentence.",
            timerSeconds: generated && generated.timerSeconds || 60,
            hint: (generated && generated.scaffolds || row.scaffolds || [])[0] || "Use a classroom example.",
            basePoints: 100
          };
        },
        evaluateRound: function (payload) {
          var response = payload.response || {};
          var round = payload.round || {};
          if (response.teacherOverride) return { correct: true, teacherOverride: true, message: "Teacher marked the explanation as complete." };
          if (response.timedOut) return { correct: false, message: "Round ended. Recast " + round.targetWord + " with a shorter sentence next time." };
          var text = String(response.value || "").toLowerCase();
          var blocked = (round.forbiddenWords || []).some(function (word) {
            return text.indexOf(String(word || "").toLowerCase()) >= 0;
          });
          var usesTarget = text.indexOf(String(round.targetWord || "").toLowerCase()) >= 0;
          if (usesTarget && !blocked && text.split(/\s+/).filter(Boolean).length >= 4) {
            return { correct: true, message: "Clear explanation. Forbidden words stayed out." };
          }
          return {
            correct: false,
            nearMiss: !blocked && text.length > 12,
            message: blocked ? "A forbidden word slipped in. Tighten the phrasing." : "Add one more precise sentence move."
          };
        }
      },
      "morphology-builder": {
        id: "morphology-builder",
        title: "Morphology Builder",
        subtitle: "Build words from roots, prefixes, and suffixes with meaning support.",
        tags: ["Science of Reading", "Tap to Build", "Grade Bands"],
        modeLabel: "Builder",
        baseTimerSeconds: 70,
        roundTarget: 6,
        createRound: function (input) {
          var row = registry.pickRound("morphology-builder", input.context, input.history) || {};
          return {
            id: row.id || ("mb-" + Date.now()),
            promptLabel: row.prompt || "Build the word.",
            entryLabel: "Build the target word.",
            prompt: row.prompt || "Build the target word.",
            tiles: (row.tiles || []).slice(),
            solution: (row.solution || []).slice(),
            hint: row.meaningHint || "Use the meaning of each part.",
            timerSeconds: 70,
            meaningHint: row.meaningHint || "",
            basePoints: 105
          };
        },
        evaluateRound: function (payload) {
          var response = payload.response || {};
          var round = payload.round || {};
          if (response.teacherOverride) return { correct: true, teacherOverride: true, message: "Teacher advanced the morphology round." };
          var built = Array.isArray(response.value) ? response.value : [];
          var target = round.solution || [];
          var exact = built.join("|") === target.join("|");
          var partial = built.filter(function (part, index) { return target[index] === part; }).length;
          return exact
            ? { correct: true, message: "Word built. " + (round.meaningHint || "Meaning hint ready.") }
            : {
                correct: false,
                nearMiss: partial >= Math.max(1, target.length - 1),
                message: partial ? "Parts are close. Recheck the order or affix choice." : "Try another combination from the available morphemes."
              };
        }
      },
      "concept-ladder": {
        id: "concept-ladder",
        title: "Concept Ladder",
        subtitle: "Reveal clues step by step and solve early for more points.",
        tags: ["Clue Reveal", "Literacy", "Numeracy"],
        modeLabel: "Reveal",
        baseTimerSeconds: 55,
        roundTarget: 6,
        createRound: function (input) {
          var row = registry.pickRound("concept-ladder", input.context, input.history) || {};
          return {
            id: row.id || ("ladder-" + Date.now()),
            promptLabel: row.prompt || "Solve the concept.",
            entryLabel: "Reveal one clue at a time.",
            prompt: row.prompt || "Solve the concept.",
            clues: (row.clues || []).slice(),
            answer: String(row.answer || ""),
            options: (row.options || []).slice(),
            timerSeconds: 55,
            hint: "Reveal only what you need.",
            basePoints: 110
          };
        },
        evaluateRound: function (payload) {
          var response = payload.response || {};
          var round = payload.round || {};
          if (response.teacherOverride) return { correct: true, teacherOverride: true, message: "Teacher awarded the solve." };
          var clueCount = Number(response.clueCount || 1);
          var value = String(response.value || "").toLowerCase();
          var correct = value === String(round.answer || "").toLowerCase();
          return correct
            ? { correct: true, basePoints: Math.max(70, 150 - (clueCount * 18)), message: "Solved before the final clue." }
            : { correct: false, nearMiss: clueCount < (round.clues || []).length, message: "Not the concept yet. Use the next clue or review the pattern." };
        }
      },
      "error-detective": {
        id: "error-detective",
        title: "Error Detective",
        subtitle: "Spot the misconception and select the strongest correction.",
        tags: ["Literacy", "Math", "Teacher Focus"],
        modeLabel: "Correction",
        baseTimerSeconds: 65,
        roundTarget: 6,
        createRound: function (input) {
          var row = registry.pickRound("error-detective", input.context, input.history) || {};
          return {
            id: row.id || ("error-" + Date.now()),
            promptLabel: row.prompt || "Find the correction.",
            entryLabel: row.misconception ? ("Focus: " + row.misconception) : "Misconception round ready.",
            incorrectExample: row.incorrectExample || "",
            options: (row.options || []).slice(),
            answer: row.answer || "",
            hint: "Look for the idea that best fixes the reasoning, not just the wording.",
            timerSeconds: 65,
            basePoints: 105
          };
        },
        evaluateRound: function (payload) {
          var response = payload.response || {};
          var round = payload.round || {};
          if (response.teacherOverride) return { correct: true, teacherOverride: true, message: "Teacher accepted the correction." };
          var value = String(response.value || "");
          return value === String(round.answer || "")
            ? { correct: true, message: "Correction selected. The misconception is repaired." }
            : { correct: false, nearMiss: !!value, message: "That does not fully repair the misconception." };
        }
      },
      "rapid-category": {
        id: "rapid-category",
        title: "Rapid Category",
        subtitle: "Generate relevant vocabulary under pressure with projector-ready pacing.",
        tags: ["Timed Retrieval", "Projector Ready", "Unique Responses"],
        modeLabel: "Sprint",
        baseTimerSeconds: 40,
        roundTarget: 5,
        createRound: function (input) {
          var row = registry.pickRound("rapid-category", input.context, input.history) || {};
          return {
            id: row.id || ("category-" + Date.now()),
            promptLabel: row.prompt || "Generate category words.",
            entryLabel: row.category || "Category sprint ready.",
            prompt: row.prompt || "Generate category words.",
            accepted: (row.accepted || []).slice(),
            timerSeconds: 40,
            hint: "Aim for unique, relevant responses only.",
            basePoints: 120
          };
        },
        evaluateRound: function (payload) {
          var response = payload.response || {};
          var round = payload.round || {};
          if (response.teacherOverride) return { correct: true, teacherOverride: true, message: "Teacher accepted the category sprint." };
          var entries = String(response.value || "")
            .split(/[\n,]/)
            .map(function (item) { return item.trim().toLowerCase(); })
            .filter(Boolean);
          var seen = {};
          var unique = entries.filter(function (item) {
            if (seen[item]) return false;
            seen[item] = true;
            return true;
          });
          var matches = unique.filter(function (item) {
            return (round.accepted || []).indexOf(item) >= 0;
          });
          return {
            correct: matches.length >= 3,
            nearMiss: matches.length >= 2,
            basePoints: 80 + (matches.length * 18),
            message: matches.length + " relevant responses counted."
          };
        }
      },
      "sentence-builder": {
        id: "sentence-builder",
        title: "Sentence Builder",
        subtitle: "Assemble academic sentences with transitions, conjunctions, and target vocabulary.",
        tags: ["Academic Language", "EAL Support", "Lesson Lock"],
        modeLabel: "Syntax",
        baseTimerSeconds: 75,
        roundTarget: 6,
        createRound: function (input) {
          var row = registry.pickRound("sentence-builder", input.context, input.history) || {};
          return {
            id: row.id || ("sentence-" + Date.now()),
            promptLabel: row.prompt || "Build the sentence.",
            entryLabel: row.scaffold || "Assemble the sentence.",
            prompt: row.prompt || "Build the sentence.",
            requiredToken: row.requiredToken || "",
            tiles: (row.tiles || []).slice(),
            solution: (row.solution || []).slice(),
            timerSeconds: 75,
            hint: row.scaffold || "Check the transition and verb placement.",
            basePoints: 110
          };
        },
        evaluateRound: function (payload) {
          var response = payload.response || {};
          var round = payload.round || {};
          if (response.teacherOverride) return { correct: true, teacherOverride: true, message: "Teacher accepted the sentence." };
          var built = Array.isArray(response.value) ? response.value : [];
          var exact = built.join(" ") === (round.solution || []).join(" ");
          var includesRequired = built.indexOf(round.requiredToken) >= 0;
          return exact
            ? { correct: true, message: "Sentence built with the target language move." }
            : { correct: false, nearMiss: includesRequired, message: includesRequired ? "Required language is present. Tighten the order." : "The target vocabulary or conjunction is still missing." };
        }
      }
    };
  }

  function launchHref(base, context) {
    var url = new URL(base, runtimeRoot.location.href);
    if (context.studentId) url.searchParams.set("student", context.studentId);
    if (context.classId) url.searchParams.set("classId", context.classId);
    if (context.lessonContextId) url.searchParams.set("lessonContextId", context.lessonContextId);
    if (context.subject) url.searchParams.set("subject", context.subject);
    if (context.programId) url.searchParams.set("programId", context.programId);
    url.searchParams.set("from", "game-platform");
    return url.pathname.replace(/^\//, "./") + (url.search || "");
  }

  function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
  }

  function feedbackTone(feedback) {
    var type = String(feedback && feedback.type || "").toLowerCase();
    if (type === "correct") return "positive";
    if (type === "near-miss") return "warning";
    if (type === "teacher-override" || type === "reveal") return "calm";
    if (type === "round-complete") return "positive";
    return "negative";
  }

  function feedbackTitle(feedback) {
    var type = String(feedback && feedback.type || "").toLowerCase();
    if (type === "correct") return "Correct answer";
    if (type === "near-miss") return "Near miss";
    if (type === "teacher-override") return "Teacher override";
    if (type === "reveal") return "Round ready";
    return "Keep moving";
  }

  function renderProgressSteps(state) {
    var rows = [];
    for (var i = 0; i < state.roundTarget; i += 1) {
      var className = "cg-progress-step";
      if (i < state.roundsCompleted) className += " is-complete";
      else if (i === state.roundsCompleted) className += " is-active";
      rows.push('<span class="' + className + '"></span>');
    }
    return rows.join("");
  }

  function buildConfidenceRing(state) {
    var total = Math.max(1, state.metrics.correct + state.metrics.incorrect + state.metrics.nearMiss);
    var ratio = clamp((state.metrics.correct + (state.metrics.nearMiss * 0.5)) / total, 0, 1);
    var radius = 16;
    var circumference = 2 * Math.PI * radius;
    var dash = Math.round(circumference * ratio * 1000) / 1000;
    return [
      '<svg class="cg-ring" viewBox="0 0 40 40" aria-hidden="true">',
      '  <circle class="cg-ring-track" cx="20" cy="20" r="' + radius + '"></circle>',
      '  <circle class="cg-ring-value" cx="20" cy="20" r="' + radius + '" stroke-dasharray="' + dash + " " + circumference + '"></circle>',
      '  <text class="cg-ring-label" x="20" y="22" text-anchor="middle">' + Math.round(ratio * 100) + "%</text>",
      "</svg>"
    ].join("");
  }

  function momentumLabel(state) {
    if (state.streak >= 3) return "Momentum high";
    if (state.metrics.nearMiss > state.metrics.correct) return "Hints close to landing";
    if (state.roundsCompleted === 0) return "Immediate first action ready";
    return "Progress steady";
  }

  function supportLine(context, state) {
    var subject = context.subject || "ELA";
    var mode = (runtimeRoot.CSGameModes.VIEW_MODES[state.settings.viewMode] || {}).label || "Individual";
    return subject + " · " + mode + " · " + (context.lessonTitle || context.classLabel || "Context-aware set");
  }

  function resultTone(outcome) {
    if (!outcome) return "calm";
    if (outcome.correct || outcome.teacherOverride) return "positive";
    if (outcome.nearMiss) return "warning";
    return "negative";
  }

  function renderFeedback(feedback) {
    if (!feedback) return "";
    var tone = feedbackTone(feedback);
    return [
      '<div class="cg-feedback" data-tone="' + tone + '">',
      '  <div class="cg-feedback-icon">' + runtimeRoot.CSGameComponents.iconFor(tone === "positive" ? "score" : tone === "warning" ? "hint" : tone === "calm" ? "teacher" : "progress") + "</div>",
      '  <div class="cg-feedback-copy"><strong>' + runtimeRoot.CSGameComponents.escapeHtml(feedbackTitle(feedback)) + '</strong><span>' + runtimeRoot.CSGameComponents.escapeHtml(feedback.label || "") + "</span></div>",
      '  <div class="cg-chip" data-tone="' + tone + '">' + runtimeRoot.CSGameComponents.escapeHtml(tone === "positive" ? "On track" : tone === "warning" ? "Close" : tone === "calm" ? "Teacher-led" : "Retry") + "</div>",
      "</div>"
    ].join("");
  }

  function renderResultBanner(state) {
    if (!state.lastOutcome || (state.status !== "round-complete" && state.status !== "round-summary")) return "";
    var tone = resultTone(state.lastOutcome);
    return [
      '<div class="cg-result-banner" data-tone="' + tone + '">',
      '  <div class="cg-result-banner-icon">' + runtimeRoot.CSGameComponents.iconFor(tone === "positive" ? "score" : tone === "warning" ? "hint" : "progress") + "</div>",
      '  <div class="cg-result-banner-copy"><strong>' + runtimeRoot.CSGameComponents.escapeHtml(state.lastOutcome.correct ? "Round complete" : state.lastOutcome.nearMiss ? "Reasoning close" : "Round reset") + '</strong><span>' + runtimeRoot.CSGameComponents.escapeHtml(state.feedback && state.feedback.label || "") + "</span></div>",
      '  <div class="cg-points-badge">+' + Number(state.lastPoints || 0) + " pts</div>",
      "</div>"
    ].join("");
  }

  function renderTileBuilder(round, chosenValues) {
    var chosen = Array.isArray(chosenValues) ? chosenValues : [];
    return [
      '<div class="cg-prompt-card">',
      '  <p class="cg-micro-label">Action Area</p>',
      '  <h3 class="cg-prompt-title">' + runtimeRoot.CSGameComponents.escapeHtml(round.prompt) + "</h3>",
      '  <div class="cg-slot-row">' + (round.solution || []).map(function (_part, index) {
        var value = chosen[index] || "";
        return '<button class="cg-word-slot' + (value ? " is-filled" : "") + '" type="button" data-slot-index="' + index + '">' + runtimeRoot.CSGameComponents.escapeHtml(value || "Tap a tile") + "</button>";
      }).join("") + "</div>",
      '  <div class="cg-tile-bank">' + (round.tiles || []).map(function (tile) {
        var selected = chosen.indexOf(tile) >= 0;
        return '<button class="cg-tile' + (selected ? " is-selected" : "") + '" type="button" data-tile="' + runtimeRoot.CSGameComponents.escapeHtml(tile) + '">' + runtimeRoot.CSGameComponents.escapeHtml(tile) + "</button>";
      }).join("") + "</div>",
      "</div>"
    ].join("");
  }

  function init() {
    var params = parseParams();
    var context = loadTeacherContext(params);
    var recommendedGame = params.gameId || (runtimeRoot.CSGameContentRegistry && runtimeRoot.CSGameContentRegistry.recommendedGame
      ? runtimeRoot.CSGameContentRegistry.recommendedGame(context)
      : "word-quest");
    var games = createGames(context);
    var live = runtimeRoot.CSGameA11y.createLiveRegion(document.getElementById("cg-live-region"));
    var sound = runtimeRoot.CSGameSound.create({ enabled: false });
    var shell = document.getElementById("cg-shell");
    var uiState = {
      teacherPanelOpen: false,
      selectedChoice: "",
      builderSelection: [],
      revealedClues: 1,
      previous: { score: 0, streak: 0, rounds: 0 },
      bumpUntil: { score: 0, streak: 0, rounds: 0 }
    };

    if (!shell) return;

    var engine = runtimeRoot.CSGameEngine.create({
      games: games,
      initialGameId: recommendedGame,
      context: context,
      sound: sound,
      settings: {
        viewMode: "individual",
        difficulty: "core",
        timerEnabled: true,
        hintsEnabled: true,
        soundEnabled: false,
        customWordSet: "",
        lessonLock: true
      }
    });

    function resetRoundUi() {
      uiState.selectedChoice = "";
      uiState.builderSelection = [];
      uiState.revealedClues = 1;
    }

    function applyMetricBumps(state) {
      var now = Date.now();
      if (state.score > uiState.previous.score) uiState.bumpUntil.score = now + 260;
      if (state.streak > uiState.previous.streak) uiState.bumpUntil.streak = now + 260;
      if (state.roundsCompleted > uiState.previous.rounds) uiState.bumpUntil.rounds = now + 260;
      uiState.previous.score = state.score;
      uiState.previous.streak = state.streak;
      uiState.previous.rounds = state.roundsCompleted;
    }

    function render() {
      var state = engine.getState();
      var currentGame = games[state.selectedGameId];
      var now = Date.now();
      var progressPct = Math.max(0, Math.min(100, Math.round((state.roundsCompleted / Math.max(1, state.roundTarget)) * 100)));
      var totalAttempts = Math.max(1, state.metrics.correct + state.metrics.incorrect + state.metrics.nearMiss);
      var projectorSuggested = state.settings.viewMode === "projector" || state.settings.viewMode === "classroom";
      runtimeRoot.document.documentElement.setAttribute("data-view-mode", state.settings.viewMode || "individual");

      shell.innerHTML = [
        '<div class="cg-brandbar">',
        '  <div class="cg-brand">',
        '    <div class="cg-brand-mark">' + runtimeRoot.CSGameComponents.iconFor(state.selectedGameId, "cg-icon cg-icon--game") + "</div>",
        '    <div class="cg-brand-copy">',
        '      <p class="cg-kicker">Cornerstone MTSS</p>',
        '      <h1 class="cg-display">Game Platform</h1>',
        '      <p>Professional-grade shared shell for instructional games, tuned for live teaching, small groups, and projector play.</p>',
        "    </div>",
        "  </div>",
        '  <div class="cg-toolbar">',
        '    <a class="cg-action cg-action-quiet" href="./teacher-hub-v2.html">' + runtimeRoot.CSGameComponents.iconFor("context") + 'Back to Teacher Hub</a>',
        '    <button class="cg-action cg-action-quiet" type="button" data-action="toggle-teacher">' + runtimeRoot.CSGameComponents.iconFor("teacher") + (uiState.teacherPanelOpen ? "Hide Controls" : "Teacher Controls") + "</button>",
        '    <button class="cg-action cg-action-quiet" type="button" data-action="hint">' + runtimeRoot.CSGameComponents.iconFor("hint") + "Hint</button>",
        '    <button class="cg-action cg-action-primary" type="button" data-action="restart">' + runtimeRoot.CSGameComponents.iconFor("progress") + "Quick Restart</button>",
        "  </div>",
        "</div>",
        '<div class="cg-app">',
        '  <aside class="cg-rail cg-rail--left">',
        '    <section class="cg-rail-card cg-surface">',
        '      <p class="cg-kicker">Game Header</p>',
        '      <div class="cg-game-grid">' + Object.keys(games).map(function (id) {
          return runtimeRoot.CSGameComponents.renderGameCard(games[id], id === state.selectedGameId);
        }).join("") + "</div>",
        "    </section>",
        '    <section class="cg-rail-card cg-surface cg-context-card">',
        '      <p class="cg-kicker">Context Injection</p>',
        '      <div class="cg-context-list">',
        '        <div><strong>Student</strong><span>' + runtimeRoot.CSGameComponents.escapeHtml(context.studentName || context.studentId || "Whole group") + "</span></div>",
        '        <div><strong>Class / Lesson</strong><span>' + runtimeRoot.CSGameComponents.escapeHtml(context.classLabel || context.lessonTitle || "No lesson lock") + "</span></div>",
        '        <div><strong>Subject</strong><span>' + runtimeRoot.CSGameComponents.escapeHtml(context.subject || "ELA") + "</span></div>",
        '        <div><strong>Program</strong><span>' + runtimeRoot.CSGameComponents.escapeHtml(context.programId || "General") + "</span></div>",
        '        <div><strong>Grade Band</strong><span>' + runtimeRoot.CSGameComponents.escapeHtml(context.gradeBand || "3-5") + "</span></div>",
        "      </div>",
        '      <div class="cg-context-chips">',
        '        <span class="cg-chip" data-tone="focus">' + runtimeRoot.CSGameComponents.iconFor("context") + runtimeRoot.CSGameComponents.escapeHtml(supportLine(context, state)) + "</span>",
        (projectorSuggested ? '<span class="cg-chip">' + runtimeRoot.CSGameComponents.iconFor("projector") + 'Projector-safe layout ready</span>' : ""),
        "      </div>",
        "    </section>",
        "  </aside>",
        '  <main class="cg-main">',
        '    <section class="cg-main-card cg-surface cg-stage-shell">',
        '      <div class="cg-stage-meta">',
        '        <div class="cg-stage-head">',
        "          <div>",
        '            <p class="cg-kicker">Unified Game Loop</p>',
        '            <h2 class="cg-display">' + runtimeRoot.CSGameComponents.escapeHtml(currentGame.title) + "</h2>",
        '            <p>' + runtimeRoot.CSGameComponents.escapeHtml(currentGame.subtitle) + "</p>",
        "          </div>",
        '          <div class="cg-stage-toolbar">',
        '            <span class="cg-chip">' + runtimeRoot.CSGameComponents.iconFor("projector") + runtimeRoot.CSGameComponents.escapeHtml((runtimeRoot.CSGameModes.VIEW_MODES[state.settings.viewMode] || {}).label || "Individual") + "</span>",
        '            <span class="cg-chip">' + runtimeRoot.CSGameComponents.iconFor("progress") + runtimeRoot.CSGameComponents.escapeHtml((runtimeRoot.CSGameModes.DIFFICULTY[state.settings.difficulty] || {}).label || "Core") + "</span>",
        '            <span class="cg-chip" data-tone="' + (state.settings.timerEnabled ? "positive" : "warning") + '">' + runtimeRoot.CSGameComponents.iconFor("timer") + (state.settings.timerEnabled ? "Timed" : "Untimed") + "</span>",
        "          </div>",
        "        </div>",
        '        <div class="cg-mission-card">',
        '          <div class="cg-mission-grid">',
        '            <div class="cg-mission-copy">',
        '              <p class="cg-kicker">Focus Panel</p>',
        '              <h3 class="cg-display">' + runtimeRoot.CSGameComponents.escapeHtml(state.round && state.round.promptLabel || "Fast entry") + "</h3>",
        '              <p class="cg-mission-line">' + runtimeRoot.CSGameComponents.escapeHtml(momentumLabel(state)) + "</p>",
        '              <div class="cg-context-chips">',
        '                <span class="cg-chip" data-tone="focus">' + runtimeRoot.CSGameComponents.iconFor("hint") + runtimeRoot.CSGameComponents.escapeHtml(state.round && state.round.hint || "Hint ready on demand") + "</span>",
        '                <span class="cg-chip">' + runtimeRoot.CSGameComponents.iconFor("teacher") + runtimeRoot.CSGameComponents.escapeHtml(state.settings.hintsEnabled ? "Hints available" : "Hints locked") + "</span>",
        "              </div>",
        "            </div>",
        '            <div class="cg-stat-confidence"><div>' + buildConfidenceRing(state) + '<div class="cg-stat-note">Confidence ring · ' + totalAttempts + " rounds read</div></div></div>",
        "          </div>",
        "        </div>",
        renderFeedback(state.feedback),
        renderResultBanner(state),
        '        <div class="cg-stat-grid">',
        '          <article class="cg-stat' + (uiState.bumpUntil.score > now ? " is-bump" : "") + '"><div class="cg-stat-head"><div class="cg-stat-label">' + runtimeRoot.CSGameComponents.iconFor("score") + 'Score</div><span class="cg-chip">' + totalAttempts + ' tracked</span></div><div class="cg-stat-value">' + state.score + '</div><div class="cg-stat-note">Scoreboard update anchors the round.</div></article>',
        '          <article class="cg-stat' + (uiState.bumpUntil.rounds > now ? " is-bump" : "") + '"><div class="cg-stat-head"><div class="cg-stat-label">' + runtimeRoot.CSGameComponents.iconFor("progress") + 'Round</div><span class="cg-chip">' + (state.roundsCompleted + 1) + "/" + state.roundTarget + '</span></div><div class="cg-stat-value">' + (state.roundsCompleted + 1) + '</div><div class="cg-stat-note">Students always see what comes next.</div></article>',
        '          <article class="cg-stat' + (uiState.bumpUntil.streak > now ? " is-bump" : "") + '"><div class="cg-stat-head"><div class="cg-stat-label">' + runtimeRoot.CSGameComponents.iconFor("streak") + 'Streak</div><span class="cg-chip" data-tone="' + (state.streak >= 3 ? "positive" : "focus") + '">' + momentumLabel(state) + '</span></div><div class="cg-stat-value">' + state.streak + '</div><div class="cg-stat-note">Challenge meter without noise.</div></article>',
        '          <article class="cg-stat"><div class="cg-stat-head"><div class="cg-stat-label">' + runtimeRoot.CSGameComponents.iconFor("timer") + 'Timer</div><span class="cg-chip" data-tone="' + (state.timerRemaining <= 10 && state.settings.timerEnabled ? "warning" : "focus") + '">' + (state.settings.timerEnabled ? "Live" : "Off") + '</span></div><div class="cg-stat-value">' + (state.settings.timerEnabled ? ((state.timerRemaining || 0) + "s") : "Off") + '</div><div class="cg-stat-note">120–260ms motion; no layout-heavy effects.</div></article>',
        "        </div>",
        '        <div class="cg-progress-shell"><div class="cg-progress"><span style="width:' + progressPct + '%"></span></div><div class="cg-progress-steps">' + renderProgressSteps(state) + "</div></div>",
        '      </div>',
        '      <div id="cg-stage-board" class="cg-stage-board"></div>',
        "    </section>",
        "  </main>",
        '  <aside class="cg-rail cg-rail--right">',
        '    <section class="cg-rail-card cg-surface' + (uiState.teacherPanelOpen ? "" : " cg-hidden") + '" id="cg-teacher-panel">',
        '      <p class="cg-kicker">Teacher Control Panel</p>',
        '      <div class="cg-control-grid">',
        '        <div class="cg-field"><label for="cg-view-mode">Mode</label><select id="cg-view-mode" class="cg-select"><option value="individual">Individual</option><option value="smallGroup">Small Group</option><option value="classroom">Classroom</option><option value="projector">Projector</option></select></div>',
        '        <div class="cg-field"><label for="cg-difficulty">Difficulty</label><select id="cg-difficulty" class="cg-select"><option value="scaffolded">Scaffolded</option><option value="core">Core</option><option value="stretch">Stretch</option></select></div>',
        '        <div class="cg-field"><label for="cg-subject">Subject</label><select id="cg-subject" class="cg-select"><option value="ELA">ELA</option><option value="Intervention">Intervention</option><option value="Writing">Writing</option><option value="Math">Math</option><option value="Science">Science</option></select></div>',
        '        <div class="cg-field"><label for="cg-grade-band">Grade Band</label><select id="cg-grade-band" class="cg-select"><option value="K-2">K-2</option><option value="3-5">3-5</option><option value="6-8">6-8</option><option value="9-12">9-12</option></select></div>',
        '        <div class="cg-field"><label for="cg-skill-focus">Skill Focus</label><input id="cg-skill-focus" class="cg-input" type="text" value="' + runtimeRoot.CSGameComponents.escapeHtml(context.skillFocus || "") + '" placeholder="LIT.MOR.ROOT"></div>',
        '        <div class="cg-field"><label for="cg-custom-word-set">Custom Word Set / Lesson Lock</label><input id="cg-custom-word-set" class="cg-input" type="text" value="' + runtimeRoot.CSGameComponents.escapeHtml(state.settings.customWordSet || "") + '" placeholder="prefix, claim, ratio"></div>',
        '        <label class="cg-checkbox"><input id="cg-toggle-timer" type="checkbox"' + (state.settings.timerEnabled ? " checked" : "") + '>Timer enabled</label>',
        '        <label class="cg-checkbox"><input id="cg-toggle-hints" type="checkbox"' + (state.settings.hintsEnabled ? " checked" : "") + '>Hints enabled</label>',
        '        <label class="cg-checkbox"><input id="cg-toggle-sound" type="checkbox"' + (state.settings.soundEnabled ? " checked" : "") + '>Optional sound layer</label>',
        '        <button class="cg-action cg-action-quiet" type="button" data-action="teacher-override">' + runtimeRoot.CSGameComponents.iconFor("teacher") + 'Teacher Override</button>',
        "      </div>",
        "    </section>",
        '    <section class="cg-rail-card cg-surface cg-support-card">',
        '      <p class="cg-kicker">Momentum</p>',
        '      <div class="cg-summary-list">',
        '        <div class="cg-summary-item"><strong>Correct</strong><div>' + state.metrics.correct + ' rounds landed cleanly.</div></div>',
        '        <div class="cg-summary-item"><strong>Near Miss</strong><div>' + state.metrics.nearMiss + ' rounds earned guidance without full reset.</div></div>',
        '        <div class="cg-summary-item"><strong>Next Move</strong><div>' + runtimeRoot.CSGameComponents.escapeHtml(state.settings.hintsEnabled ? "Hint prompt available after any miss." : "Teacher-led support only.") + "</div></div>",
        "      </div>",
        "    </section>",
        '    <section class="cg-rail-card cg-surface">',
        '      <p class="cg-kicker">Legacy Surfaces</p>',
        '      <div class="cg-legacy-card">',
        '        <strong>Existing standalone pages stay intact.</strong>',
        '        <p>Launch the current production Word Quest or Word Connections surface with the same context parameters when the full original activity is needed.</p>',
        '        <div class="cg-footer-row">',
        '          <a class="cg-action cg-action-quiet" href="' + launchHref("./word-quest.html?play=1", context) + '">' + runtimeRoot.CSGameComponents.iconFor("word-quest") + 'Open Word Quest</a>',
        '          <a class="cg-action cg-action-quiet" href="' + launchHref("./precision-play.html", context) + '">' + runtimeRoot.CSGameComponents.iconFor("word-connections") + 'Open Word Connections</a>',
        "        </div>",
        "      </div>",
        "    </section>",
        "  </aside>",
        "</div>"
      ].join("");

      var stageBoard = document.getElementById("cg-stage-board");
      if (stageBoard && state.round) stageBoard.innerHTML = renderRoundBoard(state, currentGame);
      bindInteractions();
      hydrateControls(state);
    }

    function renderRoundBoard(state, game) {
      var round = state.round || {};
      if (state.status === "round-summary") {
        return [
          '<div class="cg-focus-panel">',
          '  <p class="cg-kicker">End of Round Summary</p>',
          '  <h3 class="cg-display">Session target met</h3>',
          '  <p class="cg-focus-line">Correct: ' + state.metrics.correct + ' · Near miss: ' + state.metrics.nearMiss + ' · Incorrect: ' + state.metrics.incorrect + "</p>",
          '  <div class="cg-feedback-actions"><button class="cg-action cg-action-primary" type="button" data-action="restart">' + runtimeRoot.CSGameComponents.iconFor("progress") + 'Start New Session</button><button class="cg-action cg-action-quiet" type="button" data-action="repeat-game">Keep Same Game</button></div>',
          "</div>"
        ].join("");
      }

      if (game.id === "word-quest") {
        var guess = String(uiState.lastSubmittedGuess || "").toUpperCase();
        var evaluation = state.lastOutcome && state.lastOutcome.evaluation || [];
        return [
          '<div class="cg-focus-panel">',
          '  <p class="cg-kicker">Focus Panel</p>',
          '  <h3 class="cg-prompt-title">' + runtimeRoot.CSGameComponents.escapeHtml(round.prompt) + "</h3>",
          '  <p class="cg-focus-line">Type the answer and watch the tile reveal carry the feedback.</p>',
          '  <div class="cg-input-row">',
          '    <input id="cg-word-guess" class="cg-input" maxlength="' + String(round.answer || "").length + '" placeholder="Type your guess">',
          '    <div class="cg-guess-grid">' + String(round.answer || "").split("").map(function (_letter, index) {
            return '<div class="cg-letter-box' + (evaluation[index] ? ' is-revealed' : '') + '" data-state="' + runtimeRoot.CSGameComponents.escapeHtml(evaluation[index] || "") + '" style="animation-delay:' + (index * 40) + 'ms">' + runtimeRoot.CSGameComponents.escapeHtml(guess[index] || "") + "</div>";
          }).join("") + "</div>",
          '    <div class="cg-feedback-actions"><button class="cg-action cg-action-primary" type="button" data-submit="word-quest">Submit Guess</button><button class="cg-action cg-action-quiet" type="button" data-action="next-round">Skip Round</button></div>',
          "  </div>",
          (state.hintVisible ? '<span class="cg-chip" data-tone="warning">' + runtimeRoot.CSGameComponents.iconFor("hint") + runtimeRoot.CSGameComponents.escapeHtml(round.hint) + "</span>" : ""),
          "</div>"
        ].join("");
      }

      if (game.id === "word-connections") {
        return [
          '<div class="cg-focus-panel">',
          '  <p class="cg-kicker">Focus Panel</p>',
          '  <h3 class="cg-prompt-title">Explain <strong>' + runtimeRoot.CSGameComponents.escapeHtml(round.targetWord) + "</strong> without these words</h3>",
          '  <div class="cg-context-chips">' + (round.forbiddenWords || []).map(function (word) {
            return '<span class="cg-chip" data-tone="warning">' + runtimeRoot.CSGameComponents.escapeHtml(word) + "</span>";
          }).join("") + "</div>",
          '  <p class="cg-focus-line">' + runtimeRoot.CSGameComponents.escapeHtml(round.requiredMove || "") + "</p>",
          '  <textarea id="cg-word-connections-text" class="cg-textarea" placeholder="Enter the explanation students would say or write."></textarea>',
          '  <div class="cg-feedback-actions"><button class="cg-action cg-action-primary" type="button" data-submit="word-connections">Score Round</button><button class="cg-action cg-action-quiet" type="button" data-action="next-round">Next Prompt</button></div>',
          (state.hintVisible ? '<span class="cg-chip">' + runtimeRoot.CSGameComponents.iconFor("hint") + runtimeRoot.CSGameComponents.escapeHtml(round.hint) + "</span>" : ""),
          "</div>"
        ].join("");
      }

      if (game.id === "morphology-builder" || game.id === "sentence-builder") {
        return [
          renderTileBuilder(round, uiState.builderSelection),
          '<div class="cg-feedback-actions"><button class="cg-action cg-action-primary" type="button" data-submit="' + game.id + '">Check Build</button><button class="cg-action cg-action-quiet" type="button" data-action="clear-build">Clear</button></div>',
          (state.hintVisible ? '<span class="cg-chip">' + runtimeRoot.CSGameComponents.iconFor("hint") + runtimeRoot.CSGameComponents.escapeHtml(round.hint) + "</span>" : "")
        ].join("");
      }

      if (game.id === "concept-ladder") {
        return [
          '<div class="cg-focus-panel">',
          '  <p class="cg-kicker">Progressive Reveal</p>',
          '  <h3 class="cg-prompt-title">' + runtimeRoot.CSGameComponents.escapeHtml(round.prompt) + "</h3>",
          '  <div class="cg-summary-list">' + (round.clues || []).slice(0, uiState.revealedClues).map(function (clue, index) {
            return '<div class="cg-summary-item" data-reveal="true" style="animation-delay:' + (index * 50) + 'ms"><strong>Clue ' + (index + 1) + '</strong><div>' + runtimeRoot.CSGameComponents.escapeHtml(clue) + "</div></div>";
          }).join("") + "</div>",
          '  <div class="cg-choice-row">' + (round.options || []).map(function (option) {
            return '<button class="cg-choice' + (uiState.selectedChoice === option ? " is-selected" : "") + '" type="button" data-choice="' + runtimeRoot.CSGameComponents.escapeHtml(option) + '">' + runtimeRoot.CSGameComponents.escapeHtml(option) + "</button>";
          }).join("") + "</div>",
          '  <div class="cg-feedback-actions"><button class="cg-action cg-action-primary" type="button" data-submit="concept-ladder">Submit Solve</button><button class="cg-action cg-action-quiet" type="button" data-action="reveal-clue">Reveal Next Clue</button></div>',
          "</div>"
        ].join("");
      }

      if (game.id === "error-detective") {
        return [
          '<div class="cg-focus-panel">',
          '  <p class="cg-kicker">Common Misconception</p>',
          '  <h3 class="cg-prompt-title">' + runtimeRoot.CSGameComponents.escapeHtml(round.incorrectExample) + "</h3>",
          '  <div class="cg-choice-row">' + (round.options || []).map(function (option) {
            return '<button class="cg-choice' + (uiState.selectedChoice === option ? " is-selected" : "") + '" type="button" data-choice="' + runtimeRoot.CSGameComponents.escapeHtml(option) + '">' + runtimeRoot.CSGameComponents.escapeHtml(option) + "</button>";
          }).join("") + "</div>",
          '  <div class="cg-feedback-actions"><button class="cg-action cg-action-primary" type="button" data-submit="error-detective">Confirm Correction</button></div>',
          (state.hintVisible ? '<span class="cg-chip">' + runtimeRoot.CSGameComponents.iconFor("hint") + runtimeRoot.CSGameComponents.escapeHtml(round.hint) + "</span>" : ""),
          "</div>"
        ].join("");
      }

      if (game.id === "rapid-category") {
        return [
          '<div class="cg-focus-panel">',
          '  <p class="cg-kicker">Challenge Meter</p>',
          '  <h3 class="cg-prompt-title">' + runtimeRoot.CSGameComponents.escapeHtml(round.prompt) + "</h3>",
          '  <p class="cg-focus-line">Enter relevant responses only. Unique ideas score better than repeated ones.</p>',
          '  <textarea id="cg-category-text" class="cg-textarea" placeholder="Enter responses separated by commas or new lines."></textarea>',
          '  <div class="cg-feedback-actions"><button class="cg-action cg-action-primary" type="button" data-submit="rapid-category">Score Responses</button></div>',
          (state.hintVisible ? '<span class="cg-chip">' + runtimeRoot.CSGameComponents.iconFor("hint") + runtimeRoot.CSGameComponents.escapeHtml(round.hint) + "</span>" : ""),
          "</div>"
        ].join("");
      }

      return '<div class="cg-focus-panel">Round ready.</div>';
    }

    function hydrateControls(state) {
      var map = {
        "cg-view-mode": state.settings.viewMode,
        "cg-difficulty": state.settings.difficulty,
        "cg-subject": context.subject,
        "cg-grade-band": context.gradeBand
      };
      Object.keys(map).forEach(function (id) {
        var element = document.getElementById(id);
        if (element) element.value = map[id];
      });
    }

    function bindInteractions() {
      Array.prototype.forEach.call(shell.querySelectorAll("[data-game-id]"), function (button) {
        button.addEventListener("click", function () {
          var gameId = button.getAttribute("data-game-id") || "";
          resetRoundUi();
          engine.updateContext({
            subject: context.subject,
            gradeBand: context.gradeBand,
            skillFocus: context.skillFocus
          });
          engine.selectGame(gameId);
        });
      });

      Array.prototype.forEach.call(shell.querySelectorAll("[data-action]"), function (button) {
        button.addEventListener("click", function () {
          var action = button.getAttribute("data-action");
          if (action === "toggle-teacher") {
            uiState.teacherPanelOpen = !uiState.teacherPanelOpen;
            render();
            return;
          }
          if (action === "hint") {
            if (engine.getState().settings.hintsEnabled) engine.revealHint();
            return;
          }
          if (action === "restart" || action === "repeat-game") {
            resetRoundUi();
            engine.restartGame();
            return;
          }
          if (action === "next-round") {
            resetRoundUi();
            engine.nextRound();
            return;
          }
          if (action === "reveal-clue") {
            uiState.revealedClues = Math.min(uiState.revealedClues + 1, ((engine.getState().round && engine.getState().round.clues) || []).length);
            render();
            return;
          }
          if (action === "teacher-override") {
            engine.teacherOverride();
            return;
          }
          if (action === "clear-build") {
            uiState.builderSelection = [];
            render();
          }
        });
      });

      Array.prototype.forEach.call(shell.querySelectorAll("[data-submit]"), function (button) {
        button.addEventListener("click", function () {
          handleSubmit(button.getAttribute("data-submit") || "");
        });
      });

      Array.prototype.forEach.call(shell.querySelectorAll("[data-choice]"), function (button) {
        button.addEventListener("click", function () {
          uiState.selectedChoice = button.getAttribute("data-choice") || "";
          render();
        });
      });

      Array.prototype.forEach.call(shell.querySelectorAll("[data-tile]"), function (button) {
        button.addEventListener("click", function () {
          var tile = button.getAttribute("data-tile") || "";
          if (uiState.builderSelection.indexOf(tile) >= 0) return;
          uiState.builderSelection = uiState.builderSelection.concat(tile);
          render();
        });
      });

      Array.prototype.forEach.call(shell.querySelectorAll("[data-slot-index]"), function (button) {
        button.addEventListener("click", function () {
          var next = uiState.builderSelection.slice();
          next.splice(Number(button.getAttribute("data-slot-index") || 0), 1);
          uiState.builderSelection = next;
          render();
        });
      });

      var viewMode = document.getElementById("cg-view-mode");
      if (viewMode) viewMode.addEventListener("change", function () {
        engine.updateSettings({ viewMode: viewMode.value });
        uiState.teacherPanelOpen = true;
        resetRoundUi();
        engine.restartGame();
      });

      var difficulty = document.getElementById("cg-difficulty");
      if (difficulty) difficulty.addEventListener("change", function () {
        engine.updateSettings({ difficulty: difficulty.value });
        resetRoundUi();
        engine.restartGame();
      });

      var subject = document.getElementById("cg-subject");
      if (subject) subject.addEventListener("change", function () {
        context.subject = subject.value;
        engine.updateContext({ subject: subject.value });
        resetRoundUi();
        engine.restartGame();
      });

      var gradeBand = document.getElementById("cg-grade-band");
      if (gradeBand) gradeBand.addEventListener("change", function () {
        context.gradeBand = gradeBand.value;
        engine.updateContext({ gradeBand: gradeBand.value });
        resetRoundUi();
        engine.restartGame();
      });

      var skillFocus = document.getElementById("cg-skill-focus");
      if (skillFocus) skillFocus.addEventListener("change", function () {
        context.skillFocus = skillFocus.value;
        engine.updateContext({ skillFocus: skillFocus.value, vocabularyFocus: skillFocus.value });
      });

      var custom = document.getElementById("cg-custom-word-set");
      if (custom) custom.addEventListener("change", function () {
        engine.updateSettings({ customWordSet: custom.value });
      });

      var timerToggle = document.getElementById("cg-toggle-timer");
      if (timerToggle) timerToggle.addEventListener("change", function () {
        engine.updateSettings({ timerEnabled: !!timerToggle.checked });
        resetRoundUi();
        engine.restartGame();
      });

      var hintsToggle = document.getElementById("cg-toggle-hints");
      if (hintsToggle) hintsToggle.addEventListener("change", function () {
        engine.updateSettings({ hintsEnabled: !!hintsToggle.checked });
      });

      var soundToggle = document.getElementById("cg-toggle-sound");
      if (soundToggle) soundToggle.addEventListener("change", function () {
        engine.updateSettings({ soundEnabled: !!soundToggle.checked });
      });
    }

    function handleSubmit(gameId) {
      if (gameId === "word-quest") {
        var guess = document.getElementById("cg-word-guess");
        var value = guess ? guess.value : "";
        uiState.lastSubmittedGuess = String(value || "").trim();
        engine.submit({ value: value });
        return;
      }
      if (gameId === "word-connections") {
        var explanation = document.getElementById("cg-word-connections-text");
        engine.submit({ value: explanation ? explanation.value : "" });
        return;
      }
      if (gameId === "concept-ladder") {
        engine.submit({ value: uiState.selectedChoice || "", clueCount: uiState.revealedClues || 1 });
        uiState.selectedChoice = "";
        uiState.revealedClues = 1;
        return;
      }
      if (gameId === "error-detective") {
        engine.submit({ value: uiState.selectedChoice || "" });
        uiState.selectedChoice = "";
        return;
      }
      if (gameId === "rapid-category") {
        var category = document.getElementById("cg-category-text");
        engine.submit({ value: category ? category.value : "" });
        return;
      }
      if (gameId === "morphology-builder" || gameId === "sentence-builder") {
        engine.submit({ value: uiState.builderSelection.slice() });
        uiState.builderSelection = [];
      }
    }

    engine.subscribe(function (state) {
      applyMetricBumps(state);
      if (state.feedback && state.feedback.label) live.announce(state.feedback.label);
      render();
    });

    engine.start();
    render();
  }

  return {
    init: init
  };
});
