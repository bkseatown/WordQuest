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
          if (response.teacherOverride) {
            return { correct: true, teacherOverride: true, message: "Teacher advanced the round." };
          }
          if (response.timedOut) {
            return { correct: false, message: "Time ended. The target was " + String(round.answer || "").toUpperCase() + "." };
          }
          var guess = String(response.value || "").trim().toLowerCase();
          if (!guess) return { correct: false, message: "No guess submitted. The target was " + String(round.answer || "").toUpperCase() + "." };
          if (guess === round.answer) {
            return { correct: true, message: "Correct. " + String(round.answer || "").toUpperCase() + " is the target." };
          }
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
          if (response.teacherOverride) {
            return { correct: true, teacherOverride: true, message: "Teacher marked the explanation as complete." };
          }
          if (response.timedOut) {
            return { correct: false, message: "Round ended. Recast " + round.targetWord + " with a shorter sentence next time." };
          }
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

  function renderTileBuilder(round, chosenValues) {
    var chosen = Array.isArray(chosenValues) ? chosenValues : [];
    var bank = (round.tiles || []).filter(function (_tile, index) {
      return chosen[index] == null || false;
    });
    return [
          '<div class="cg-prompt-card">',
          '  <p class="cg-micro-label">Prompt</p>',
          '  <h3 class="cg-prompt-title">' + runtimeRoot.CSGameComponents.escapeHtml(round.prompt) + "</h3>",
      "  <div class=\"cg-slot-row\">" + (round.solution || []).map(function (_part, index) {
        var value = chosen[index] || "";
        return '<button class="cg-word-slot' + (value ? " is-filled" : "") + '" type="button" data-slot-index="' + index + '">' + runtimeRoot.CSGameComponents.escapeHtml(value || "Tap a tile") + "</button>";
      }).join("") + "</div>",
      '  <div class="cg-tile-bank">' + (round.tiles || []).map(function (tile) {
        var selected = chosen.indexOf(tile) >= 0;
        return '<button class="cg-tile' + (selected ? " is-selected" : "") + '" type="button" data-tile="' + runtimeRoot.CSGameComponents.escapeHtml(tile) + '">' + runtimeRoot.CSGameComponents.escapeHtml(tile) + "</button>";
      }).join("") + "</div>",
      '</div>'
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

    var shell = document.getElementById("cg-shell");
    if (!shell) return;

    function render() {
      var state = engine.getState();
      var currentGame = games[state.selectedGameId];
      var progressPct = Math.max(0, Math.min(100, Math.round((state.roundsCompleted / Math.max(1, state.roundTarget)) * 100)));
      document.documentElement.setAttribute("data-view-mode", state.settings.viewMode || "individual");

      shell.innerHTML = [
        '<div class="cg-brandbar">',
        '  <div class="cg-brand">',
        '    <div class="cg-brand-mark">' + runtimeRoot.CSGameComponents.iconFor(state.selectedGameId) + "</div>",
        '    <div class="cg-brand-copy">',
        '      <p class="cg-kicker">Cornerstone MTSS</p>',
        '      <h1 class="cg-display">Game Platform</h1>',
        '      <p>Reusable runtime for Word Quest, Word Connections, and targeted instructional games.</p>',
        "    </div>",
        "  </div>",
        '  <div class="cg-toolbar">',
        '    <a class="cg-action cg-action-quiet" href="./teacher-hub-v2.html">Back to Teacher Hub</a>',
        '    <button class="cg-action cg-action-quiet" type="button" data-action="toggle-teacher">' + (state.teacherPanelOpen ? "Hide" : "Teacher Controls") + "</button>",
        '    <button class="cg-action cg-action-quiet" type="button" data-action="hint">Hint</button>',
        '    <button class="cg-action cg-action-primary" type="button" data-action="restart">Quick Restart</button>',
        "  </div>",
        "</div>",
        '<div class="cg-app">',
        '  <aside class="cg-rail cg-rail--left">',
        '    <section class="cg-rail-card cg-surface">',
        '      <p class="cg-kicker">Games</p>',
        '      <div class="cg-game-grid">' + Object.keys(games).map(function (id) {
          return runtimeRoot.CSGameComponents.renderGameCard(games[id], id === state.selectedGameId);
        }).join("") + "</div>",
        "    </section>",
        '    <section class="cg-rail-card cg-surface">',
        '      <p class="cg-kicker">Context</p>',
        '      <div class="cg-context-list">',
        '        <div><strong>Student</strong><span>' + runtimeRoot.CSGameComponents.escapeHtml(context.studentName || context.studentId || "Whole group") + "</span></div>",
        '        <div><strong>Class / Lesson</strong><span>' + runtimeRoot.CSGameComponents.escapeHtml(context.classLabel || context.lessonTitle || "No lesson lock") + "</span></div>",
        '        <div><strong>Subject</strong><span>' + runtimeRoot.CSGameComponents.escapeHtml(context.subject || "ELA") + "</span></div>",
        '        <div><strong>Program</strong><span>' + runtimeRoot.CSGameComponents.escapeHtml(context.programId || "General") + "</span></div>",
        '        <div><strong>Grade Band</strong><span>' + runtimeRoot.CSGameComponents.escapeHtml(context.gradeBand || "3-5") + "</span></div>",
        "      </div>",
        "    </section>",
        "  </aside>",
        '  <main class="cg-main">',
        '    <section class="cg-main-card cg-surface cg-stage-shell">',
        '      <div class="cg-stage-head">',
        "        <div>",
        '          <p class="cg-kicker">Unified Game Loop</p>',
        '          <h2 class="cg-display">' + runtimeRoot.CSGameComponents.escapeHtml(currentGame.title) + "</h2>",
        '          <p>' + runtimeRoot.CSGameComponents.escapeHtml(currentGame.subtitle) + "</p>",
        "        </div>",
        '        <div class="cg-inline-row">',
        '          <span class="cg-chip">' + runtimeRoot.CSGameComponents.escapeHtml((runtimeRoot.CSGameModes.VIEW_MODES[state.settings.viewMode] || {}).label || "Individual") + "</span>",
        '          <span class="cg-chip">' + runtimeRoot.CSGameComponents.escapeHtml((runtimeRoot.CSGameModes.DIFFICULTY[state.settings.difficulty] || {}).label || "Core") + "</span>",
        '          <span class="cg-chip" data-tone="' + (state.settings.timerEnabled ? "positive" : "") + '">' + (state.settings.timerEnabled ? "Timed" : "Untimed") + "</span>",
        "        </div>",
        "      </div>",
        '      <div class="cg-stat-grid">',
        '        <article class="cg-stat"><div class="cg-stat-label">Score</div><div class="cg-stat-value">' + state.score + "</div></article>",
        '        <article class="cg-stat"><div class="cg-stat-label">Round</div><div class="cg-stat-value">' + (state.roundsCompleted + 1) + "/" + state.roundTarget + "</div></article>",
        '        <article class="cg-stat"><div class="cg-stat-label">Streak</div><div class="cg-stat-value">' + state.streak + "</div></article>",
        '        <article class="cg-stat"><div class="cg-stat-label">Timer</div><div class="cg-stat-value">' + (state.settings.timerEnabled ? ((state.timerRemaining || 0) + "s") : "Off") + "</div></article>",
        "      </div>",
        (state.feedback ? '<div class="cg-feedback" data-tone="' + runtimeRoot.CSGameComponents.escapeHtml(state.feedback.tone || "neutral") + '">' + runtimeRoot.CSGameComponents.escapeHtml(state.feedback.label) + "</div>" : ""),
        '      <div class="cg-progress"><span style="width:' + progressPct + '%"></span></div>',
        '      <div id="cg-stage-board" class="cg-stage-board"></div>',
        "    </section>",
        "  </main>",
        '  <aside class="cg-rail cg-rail--right">',
        '    <section class="cg-rail-card cg-surface' + (state.teacherPanelOpen ? "" : " cg-hidden") + '" id="cg-teacher-panel">',
        '      <p class="cg-kicker">Teacher Controls</p>',
        '      <div class="cg-control-grid">',
        '        <div class="cg-field"><label for="cg-view-mode">Mode</label><select id="cg-view-mode" class="cg-select"><option value="individual">Individual</option><option value="smallGroup">Small Group</option><option value="classroom">Classroom</option><option value="projector">Projector</option></select></div>',
        '        <div class="cg-field"><label for="cg-difficulty">Difficulty</label><select id="cg-difficulty" class="cg-select"><option value="scaffolded">Scaffolded</option><option value="core">Core</option><option value="stretch">Stretch</option></select></div>',
        '        <div class="cg-field"><label for="cg-subject">Subject</label><select id="cg-subject" class="cg-select"><option value="ELA">ELA</option><option value="Intervention">Intervention</option><option value="Writing">Writing</option><option value="Math">Math</option><option value="Science">Science</option></select></div>',
        '        <div class="cg-field"><label for="cg-grade-band">Grade Band</label><select id="cg-grade-band" class="cg-select"><option value="K-2">K-2</option><option value="3-5">3-5</option><option value="6-8">6-8</option><option value="9-12">9-12</option></select></div>',
        '        <div class="cg-field"><label for="cg-skill-focus">Skill Focus</label><input id="cg-skill-focus" class="cg-input" type="text" value="' + runtimeRoot.CSGameComponents.escapeHtml(context.skillFocus || "") + '" placeholder="LIT.MOR.ROOT"></div>',
        '        <div class="cg-field"><label for="cg-custom-word-set">Custom Word Set / Lesson Lock</label><input id="cg-custom-word-set" class="cg-input" type="text" value="' + runtimeRoot.CSGameComponents.escapeHtml(state.settings.customWordSet || "") + '" placeholder="prefix, claim, ratio"></div>',
        '        <label class="cg-checkbox"><input id="cg-toggle-timer" type="checkbox"' + (state.settings.timerEnabled ? " checked" : "") + '>Timer enabled</label>',
        '        <label class="cg-checkbox"><input id="cg-toggle-hints" type="checkbox"' + (state.settings.hintsEnabled ? " checked" : "") + '>Hints enabled</label>',
        '        <label class="cg-checkbox"><input id="cg-toggle-sound" type="checkbox"' + (state.settings.soundEnabled ? " checked" : "") + '>Sound layer (off by default)</label>',
        '        <button class="cg-action cg-action-quiet" type="button" data-action="teacher-override">Teacher Override</button>',
        "      </div>",
        "    </section>",
        '    <section class="cg-rail-card cg-surface">',
        '      <p class="cg-kicker">Round History</p>',
        '      <div class="cg-summary-list">' + (state.history.length ? state.history.slice().reverse().map(function (row) {
          return '<div class="cg-summary-item"><strong>' + runtimeRoot.CSGameComponents.escapeHtml(row.label || currentGame.title) + '</strong><div>' + runtimeRoot.CSGameComponents.escapeHtml(row.result) + " · " + row.points + " pts</div></div>";
        }).join("") : '<div class="cg-summary-item">First round is ready.</div>') + "</div>",
        "    </section>",
        '    <section class="cg-rail-card cg-surface">',
        '      <p class="cg-kicker">Legacy Surfaces</p>',
        '      <div class="cg-legacy-card">',
        '        <strong>Existing standalone pages stay intact.</strong>',
        '        <p>Launch the current production Word Quest or Word Connections surface with the same context parameters when you need the full original experience.</p>',
        '        <div class="cg-footer-row">',
        '          <a class="cg-action cg-action-quiet" href="' + launchHref("./word-quest.html?play=1", context) + '">Open Word Quest</a>',
        '          <a class="cg-action cg-action-quiet" href="' + launchHref("./precision-play.html", context) + '">Open Word Connections</a>',
        "        </div>",
        "      </div>",
        "    </section>",
        "  </aside>",
        "</div>"
      ].join("");

      var stageBoard = document.getElementById("cg-stage-board");
      if (stageBoard && state.round) {
        stageBoard.innerHTML = renderRoundBoard(state, currentGame);
      }
      bindInteractions();
      hydrateControls(state);
    }

    function renderRoundBoard(state, game) {
      var round = state.round || {};
      if (state.status === "round-summary") {
        return [
          '<div class="cg-prompt-card">',
          '  <p class="cg-kicker">Session Summary</p>',
          '  <h3 class="cg-prompt-title">Round target met.</h3>',
          '  <p>Correct: ' + state.metrics.correct + ' · Near miss: ' + state.metrics.nearMiss + ' · Incorrect: ' + state.metrics.incorrect + "</p>",
          '  <div class="cg-footer-row"><button class="cg-action cg-action-primary" type="button" data-action="restart">Start New Session</button><button class="cg-action cg-action-quiet" type="button" data-action="repeat-game">Keep Same Game</button></div>',
          "</div>"
        ].join("");
      }

      if (game.id === "word-quest") {
        var guess = (state.lastSubmittedGuess || "").toUpperCase();
        var evaluation = state.lastOutcome && state.lastOutcome.evaluation || [];
        return [
          '<div class="cg-prompt-card">',
          '  <p class="cg-micro-label">Fast Entry</p>',
          '  <h3 class="cg-prompt-title">' + runtimeRoot.CSGameComponents.escapeHtml(round.prompt) + "</h3>",
          '  <div class="cg-input-row">',
          '    <input id="cg-word-guess" class="cg-input" maxlength="' + String(round.answer || "").length + '" placeholder="Type your guess">',
          '    <div class="cg-guess-grid">' + String(round.answer || "").split("").map(function (_letter, index) {
            return '<div class="cg-letter-box" data-state="' + runtimeRoot.CSGameComponents.escapeHtml(evaluation[index] || "") + '">' + runtimeRoot.CSGameComponents.escapeHtml(guess[index] || "") + "</div>";
          }).join("") + "</div>",
          '    <div class="cg-footer-row"><button class="cg-action cg-action-primary" type="button" data-submit="word-quest">Submit Guess</button><button class="cg-action cg-action-quiet" type="button" data-action="next-round">Skip Round</button></div>',
          "  </div>",
          (state.hintVisible ? '<div class="cg-chip" data-tone="warning">' + runtimeRoot.CSGameComponents.escapeHtml(round.hint) + "</div>" : ""),
          "</div>"
        ].join("");
      }

      if (game.id === "word-connections") {
        return [
          '<div class="cg-prompt-card">',
          '  <p class="cg-micro-label">Immediate First Action</p>',
          '  <h3 class="cg-prompt-title">Explain <strong>' + runtimeRoot.CSGameComponents.escapeHtml(round.targetWord) + "</strong> without these words.</h3>",
          '  <div class="cg-inline-row">' + (round.forbiddenWords || []).map(function (word) {
            return '<span class="cg-chip" data-tone="warning">' + runtimeRoot.CSGameComponents.escapeHtml(word) + "</span>";
          }).join("") + "</div>",
          '  <p>' + runtimeRoot.CSGameComponents.escapeHtml(round.requiredMove || "") + "</p>",
          '  <textarea id="cg-word-connections-text" class="cg-textarea" placeholder="Enter the explanation students would say or write."></textarea>',
          '  <div class="cg-footer-row"><button class="cg-action cg-action-primary" type="button" data-submit="word-connections">Score Round</button><button class="cg-action cg-action-quiet" type="button" data-action="next-round">Next Prompt</button></div>',
          (state.hintVisible ? '<div class="cg-chip">' + runtimeRoot.CSGameComponents.escapeHtml(round.hint) + "</div>" : ""),
          "</div>"
        ].join("");
      }

      if (game.id === "morphology-builder" || game.id === "sentence-builder") {
        return [
          renderTileBuilder(round, state.builderSelection || []),
          '<div class="cg-footer-row"><button class="cg-action cg-action-primary" type="button" data-submit="' + game.id + '">Check Build</button><button class="cg-action cg-action-quiet" type="button" data-action="clear-build">Clear</button></div>',
          (state.hintVisible ? '<div class="cg-chip">' + runtimeRoot.CSGameComponents.escapeHtml(round.hint) + "</div>" : "")
        ].join("");
      }

      if (game.id === "concept-ladder") {
        var revealed = Number(state.revealedClues || 1);
        return [
          '<div class="cg-prompt-card">',
          '  <p class="cg-micro-label">Reveal Steps</p>',
          '  <h3 class="cg-prompt-title">' + runtimeRoot.CSGameComponents.escapeHtml(round.prompt) + "</h3>",
          '  <div class="cg-summary-list">' + (round.clues || []).slice(0, revealed).map(function (clue, index) {
            return '<div class="cg-summary-item"><strong>Clue ' + (index + 1) + '</strong><div>' + runtimeRoot.CSGameComponents.escapeHtml(clue) + "</div></div>";
          }).join("") + "</div>",
          '  <div class="cg-choice-row">' + (round.options || []).map(function (option) {
            return '<button class="cg-choice' + (state.selectedChoice === option ? " is-selected" : "") + '" type="button" data-choice="' + runtimeRoot.CSGameComponents.escapeHtml(option) + '">' + runtimeRoot.CSGameComponents.escapeHtml(option) + "</button>";
          }).join("") + "</div>",
          '  <div class="cg-footer-row"><button class="cg-action cg-action-primary" type="button" data-submit="concept-ladder">Submit Solve</button><button class="cg-action cg-action-quiet" type="button" data-action="reveal-clue">Reveal Next Clue</button></div>',
          "</div>"
        ].join("");
      }

      if (game.id === "error-detective") {
        return [
          '<div class="cg-prompt-card">',
          '  <p class="cg-micro-label">Misconception Focus</p>',
          '  <h3 class="cg-prompt-title">' + runtimeRoot.CSGameComponents.escapeHtml(round.incorrectExample) + "</h3>",
          '  <div class="cg-choice-row">' + (round.options || []).map(function (option) {
            return '<button class="cg-choice' + (state.selectedChoice === option ? " is-selected" : "") + '" type="button" data-choice="' + runtimeRoot.CSGameComponents.escapeHtml(option) + '">' + runtimeRoot.CSGameComponents.escapeHtml(option) + "</button>";
          }).join("") + "</div>",
          '  <div class="cg-footer-row"><button class="cg-action cg-action-primary" type="button" data-submit="error-detective">Confirm Correction</button></div>',
          (state.hintVisible ? '<div class="cg-chip">' + runtimeRoot.CSGameComponents.escapeHtml(round.hint) + "</div>" : ""),
          "</div>"
        ].join("");
      }

      if (game.id === "rapid-category") {
        return [
          '<div class="cg-prompt-card">',
          '  <p class="cg-micro-label">Short Round</p>',
          '  <h3 class="cg-prompt-title">' + runtimeRoot.CSGameComponents.escapeHtml(round.prompt) + "</h3>",
          '  <textarea id="cg-category-text" class="cg-textarea" placeholder="Enter responses separated by commas or new lines."></textarea>',
          '  <div class="cg-footer-row"><button class="cg-action cg-action-primary" type="button" data-submit="rapid-category">Score Responses</button></div>',
          (state.hintVisible ? '<div class="cg-chip">' + runtimeRoot.CSGameComponents.escapeHtml(round.hint) + "</div>" : ""),
          "</div>"
        ].join("");
      }

      return '<div class="cg-prompt-card">Round ready.</div>';
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
            var state = engine.getState();
            engine.updateSettings({});
            engine.getState().teacherPanelOpen = !state.teacherPanelOpen;
            renderTeacherToggle(!state.teacherPanelOpen);
            return;
          }
          if (action === "hint") {
            if (engine.getState().settings.hintsEnabled) engine.revealHint();
            return;
          }
          if (action === "restart" || action === "repeat-game") {
            engine.restartGame();
            return;
          }
          if (action === "next-round") {
            engine.nextRound();
            return;
          }
          if (action === "reveal-clue") {
            renderClueReveal();
            return;
          }
          if (action === "teacher-override") {
            engine.teacherOverride();
            return;
          }
          if (action === "clear-build") {
            clearBuilder();
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
          engine.getState().selectedChoice = button.getAttribute("data-choice") || "";
          render();
        });
      });

      Array.prototype.forEach.call(shell.querySelectorAll("[data-tile]"), function (button) {
        button.addEventListener("click", function () {
          var state = engine.getState();
          var next = (state.builderSelection || []).slice();
          var tile = button.getAttribute("data-tile") || "";
          if (next.indexOf(tile) >= 0) return;
          next.push(tile);
          state.builderSelection = next;
          render();
        });
      });

      Array.prototype.forEach.call(shell.querySelectorAll("[data-slot-index]"), function (button) {
        button.addEventListener("click", function () {
          var state = engine.getState();
          var next = (state.builderSelection || []).slice();
          next.splice(Number(button.getAttribute("data-slot-index") || 0), 1);
          state.builderSelection = next;
          render();
        });
      });

      var viewMode = document.getElementById("cg-view-mode");
      if (viewMode) viewMode.addEventListener("change", function () {
        engine.updateSettings({ viewMode: viewMode.value });
        renderTeacherToggle(true);
        engine.restartGame();
      });
      var difficulty = document.getElementById("cg-difficulty");
      if (difficulty) difficulty.addEventListener("change", function () {
        engine.updateSettings({ difficulty: difficulty.value });
        engine.restartGame();
      });
      var subject = document.getElementById("cg-subject");
      if (subject) subject.addEventListener("change", function () {
        context.subject = subject.value;
        engine.updateContext({ subject: subject.value });
        engine.restartGame();
      });
      var gradeBand = document.getElementById("cg-grade-band");
      if (gradeBand) gradeBand.addEventListener("change", function () {
        context.gradeBand = gradeBand.value;
        engine.updateContext({ gradeBand: gradeBand.value });
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

    function renderTeacherToggle(open) {
      var state = engine.getState();
      state.teacherPanelOpen = !!open;
      render();
    }

    function clearBuilder() {
      engine.getState().builderSelection = [];
      render();
    }

    function renderClueReveal() {
      var state = engine.getState();
      state.revealedClues = Math.min((state.revealedClues || 1) + 1, ((state.round && state.round.clues) || []).length);
      render();
    }

    function handleSubmit(gameId) {
      if (gameId === "word-quest") {
        var guess = document.getElementById("cg-word-guess");
        var value = guess ? guess.value : "";
        engine.getState().lastSubmittedGuess = String(value || "").trim();
        engine.submit({ value: value });
        return;
      }
      if (gameId === "word-connections") {
        var explanation = document.getElementById("cg-word-connections-text");
        engine.submit({ value: explanation ? explanation.value : "" });
        return;
      }
      if (gameId === "concept-ladder") {
        engine.submit({ value: engine.getState().selectedChoice || "", clueCount: engine.getState().revealedClues || 1 });
        engine.getState().selectedChoice = "";
        engine.getState().revealedClues = 1;
        return;
      }
      if (gameId === "error-detective") {
        engine.submit({ value: engine.getState().selectedChoice || "" });
        engine.getState().selectedChoice = "";
        return;
      }
      if (gameId === "rapid-category") {
        var category = document.getElementById("cg-category-text");
        engine.submit({ value: category ? category.value : "" });
        return;
      }
      if (gameId === "morphology-builder" || gameId === "sentence-builder") {
        engine.submit({ value: (engine.getState().builderSelection || []).slice() });
        engine.getState().builderSelection = [];
      }
    }

    engine.subscribe(function (state) {
      if (state.feedback && state.feedback.label) live.announce(state.feedback.label);
      render();
    });

    engine.start();
    engine.getState().teacherPanelOpen = false;
    engine.getState().revealedClues = 1;
    render();
  }

  return {
    init: init
  };
});
