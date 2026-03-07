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
      playMode: params.get("play") === "1",
      studentId: String(params.get("student") || "").trim(),
      classId: String(params.get("classId") || params.get("class") || params.get("blockId") || "").trim(),
      lessonContextId: String(params.get("lessonContextId") || "").trim(),
      subject: String(params.get("subject") || "").trim(),
      programId: String(params.get("programId") || "").trim(),
      gameId: String(params.get("game") || "").trim(),
      gradeBand: String(params.get("gradeBand") || params.get("grade") || "").trim(),
      lessonTitle: String(params.get("lesson") || "").trim(),
      skillFocus: String(params.get("skillFocus") || "").trim(),
      contentMode: String(params.get("contentMode") || "").trim()
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
      vocabularyFocus: params.skillFocus,
      contentMode: params.contentMode || "lesson"
    };
    var TeacherSelectors = runtimeRoot.CSTeacherSelectors || null;
    if (TeacherSelectors && typeof TeacherSelectors.loadCaseload === "function" && params.studentId) {
      var student = (TeacherSelectors.loadCaseload({ TeacherStorage: runtimeRoot.CSTeacherStorage }).filter(function (row) {
        return String(row.id || "") === params.studentId;
      })[0] || null);
      if (student) {
        context.studentName = student.name || "";
        context.gradeBand = normalizeGradeBand(student.gradeBand || student.grade || params.gradeBand || "K-2");
      }
    }
    if (!context.gradeBand) context.gradeBand = normalizeGradeBand(params.gradeBand || "K-2");
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

  function appBasePath() {
    var path = String((runtimeRoot.location && runtimeRoot.location.pathname) || "");
    var marker = "/WordQuest/";
    var idx = path.indexOf(marker);
    if (idx >= 0) return path.slice(0, idx + marker.length);
    try {
      var baseEl = runtimeRoot.document && runtimeRoot.document.querySelector && runtimeRoot.document.querySelector("base[href]");
      if (baseEl) {
        var baseUrl = new URL(baseEl.getAttribute("href"), runtimeRoot.location.href);
        var basePath = String(baseUrl.pathname || "");
        if (basePath) return basePath.endsWith("/") ? basePath : (basePath + "/");
      }
    } catch (_e) {}
    var dir = path.replace(/[^/]*$/, "");
    return dir || "/";
  }

  function withAppBase(path) {
    var clean = String(path || "").replace(/^\.?\//, "");
    return new URL(appBasePath() + clean, runtimeRoot.location.origin).toString();
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

    function roundContext(input) {
      return Object.assign({}, input.context || {}, {
        customWordSet: input.settings && input.settings.customWordSet || "",
        contentMode: input.settings && input.settings.contentMode || input.context && input.context.contentMode || "lesson",
        difficulty: input.settings && input.settings.difficulty || "core",
        viewMode: input.settings && input.settings.viewMode || "individual",
        roundIndex: input.roundIndex || 0
      });
    }

    return {
      "word-quest": {
        id: "word-quest",
        title: "Word Quest",
        subtitle: "Crack the clue, test your guess, and lock in the lesson word before the round ends.",
        tags: ["Clue Chase", "Fast Entry", "Timed or Untimed"],
        modeLabel: "Guess",
        baseTimerSeconds: 75,
        roundTarget: 6,
        createRound: function (input) {
          var row = registry.pickRound("word-quest", roundContext(input), input.history) || {};
          return {
            id: row.id || ("wq-" + Date.now()),
            promptLabel: "Crack the clue and find the word.",
            entryLabel: (input.roundIndex || 0) % 3 === 1
              ? "Fast start: read the clue and lock one strong guess."
              : (input.roundIndex || 0) % 3 === 2
                ? "Think about the meaning before the spelling."
                : (row.clue || "A new clue is on the board."),
            prompt: row.clue || "New clue ready.",
            answer: String(row.word || "trace").toLowerCase(),
            timerSeconds: 75,
            hint: "Look for a word tied to " + (input.context.subject || "today's lesson") + ". Try the idea before the exact spelling.",
            basePoints: 110
          };
        },
        evaluateRound: function (payload) {
          var response = payload.response || {};
          var round = payload.round || {};
          if (response.teacherOverride) return { correct: true, teacherOverride: true, message: "Teacher moved the team to the next word." };
          if (response.timedOut) return { correct: false, message: "Time ended. The word was " + String(round.answer || "").toUpperCase() + "." };
          var guess = String(response.value || "").trim().toLowerCase();
          if (!guess) return { correct: false, message: "No guess submitted. The word was " + String(round.answer || "").toUpperCase() + "." };
          if (guess === round.answer) return { correct: true, message: "Locked in. " + String(round.answer || "").toUpperCase() + " is correct." };
          var states = guessState(guess, round.answer);
          var hitCount = states.filter(function (value) { return value === "correct" || value === "present"; }).length;
          return {
            correct: false,
            nearMiss: hitCount >= Math.max(1, Math.floor(round.answer.length / 2)),
            message: hitCount ? "Close read. The word was " + String(round.answer || "").toUpperCase() + "." : "Not this round. The word was " + String(round.answer || "").toUpperCase() + ".",
            evaluation: states
          };
        }
      },
      "word-typing": {
        id: "word-typing",
        title: "Word Keys",
        subtitle: "Type the lesson word, lock the spelling pattern, and build keyboard confidence through real literacy practice.",
        tags: ["Typing + Literacy", "Orthographic Mapping", "Home Row to Full Keyboard"],
        modeLabel: "Type",
        baseTimerSeconds: 50,
        roundTarget: 6,
        createRound: function (input) {
          var row = registry.pickRound("word-typing", roundContext(input), input.history) || {};
          return {
            id: row.id || ("typing-" + Date.now()),
            promptLabel: row.prompt || "Type the word.",
            entryLabel: input.settings.viewMode === "projector" || input.settings.viewMode === "classroom"
              ? "Model once, then type the word together."
              : "Eyes on the full word. Type with steady rhythm.",
            prompt: row.prompt || "Type the word.",
            target: String(row.target || "said").toLowerCase(),
            keyboardZone: row.keyboardZone || "home row",
            orthographyFocus: row.orthographyFocus || "high-frequency pattern",
            fingerCue: row.fingerCue || "Look across the whole word before you type.",
            hint: row.meaningHint || "Notice the spelling chunk that stays stable in the word.",
            timerSeconds: 50,
            basePoints: 115
          };
        },
        evaluateRound: function (payload) {
          var response = payload.response || {};
          var round = payload.round || {};
          if (response.teacherOverride) return { correct: true, teacherOverride: true, message: "Teacher moved the class to the next typing word." };
          if (response.timedOut) return { correct: false, message: "Time ended. The word was " + String(round.target || "").toUpperCase() + "." };
          var typed = String(response.value || "").trim().toLowerCase();
          var target = String(round.target || "").toLowerCase();
          if (!typed) return { correct: false, message: "No word typed. The target was " + target.toUpperCase() + "." };
          if (typed === target) return { correct: true, message: "Typed cleanly. Pattern locked in." };
          var states = guessState(typed, target);
          var hitCount = states.filter(function (value) { return value === "correct" || value === "present"; }).length;
          return {
            correct: false,
            nearMiss: hitCount >= Math.max(1, Math.floor(target.length / 2)),
            message: hitCount ? "Close. Recheck the spelling chunk and try again." : "Reset the pattern and type it once more.",
            evaluation: states
          };
        }
      },
      "word-connections": {
        id: "word-connections",
        title: "Say It Another Way",
        subtitle: "Give a smart clue so your team can guess the lesson word without using the blocked words on the card.",
        tags: ["Team Guessing", "Academic Language", "Projector Ready"],
        modeLabel: "Clue",
        baseTimerSeconds: 60,
        roundTarget: 6,
        createRound: function (input) {
          var currentContext = roundContext(input);
          var row = registry.pickRound("word-connections", currentContext, input.history) || {};
          var generated = wordConnectionsEngine && typeof wordConnectionsEngine.generateWordConnectionsRound === "function"
            ? wordConnectionsEngine.generateWordConnectionsRound({
                mode: String(input.settings.difficulty || "core").toUpperCase() === "STRETCH" ? "INTERVENTION" : "TARGETED",
                skillNode: currentContext.skillFocus || row.skillTag || "LIT.VOC.ACAD",
                tierLevel: input.settings.viewMode === "projector" ? "Tier 2" : "Tier 3",
                selectedCard: row
              })
            : null;
          return {
            id: row.id || ("wc-" + Date.now()),
            promptLabel: "Clue the word without using the blocked words.",
            entryLabel: generated && generated.instructionalFocus || (input.settings.viewMode === "projector" || input.settings.viewMode === "classroom"
              ? "One speaker clues. The group locks the guess."
              : "Give just enough clues so a partner can name the word."),
            targetWord: generated && generated.targetWord || row.target || "analyze",
            forbiddenWords: generated && generated.forbiddenWords || row.forbidden || [],
            scaffolds: generated && generated.scaffolds || row.scaffolds || [],
            requiredMove: row.requiredMove || (input.settings.viewMode === "projector" || input.settings.viewMode === "classroom"
              ? "Give one clean clue the whole class can build on without saying the blocked words."
              : "Use a clear clue in one or two complete sentences that fit the lesson."),
            timerSeconds: generated && generated.timerSeconds || 60,
            hint: (generated && generated.scaffolds || row.scaffolds || [])[0] || "Try an example, function, or comparison instead of a definition.",
            basePoints: 100
          };
        },
        evaluateRound: function (payload) {
          var response = payload.response || {};
          var round = payload.round || {};
          if (response.teacherOverride) return { correct: true, teacherOverride: true, message: "Teacher counted the clue as a successful round." };
          if (response.timedOut) return { correct: false, message: "Round ended. Next time, clue " + round.targetWord + " with fewer filler words." };
          var text = String(response.value || "").toLowerCase();
          var blocked = (round.forbiddenWords || []).some(function (word) {
            return text.indexOf(String(word || "").toLowerCase()) >= 0;
          });
          var usesTarget = text.indexOf(String(round.targetWord || "").toLowerCase()) >= 0;
          if (usesTarget && !blocked && text.split(/\s+/).filter(Boolean).length >= 4) {
            return { correct: true, message: "Strong clue. The blocked words stayed out." };
          }
          if (blocked) {
            return { correct: false, nearMiss: false, forbidden: true, message: "Blocked word used — find a different angle." };
          }
          return {
            correct: false,
            nearMiss: text.length > 12,
            message: "Close. Add one more useful clue."
          };
        }
      },
      "morphology-builder": {
        id: "morphology-builder",
        title: "Word Forge",
        subtitle: "Snap roots, prefixes, and suffixes together to build a real lesson word and unlock its meaning.",
        tags: ["Roots and Affixes", "Tap to Build", "Meaning Link"],
        modeLabel: "Forge",
        baseTimerSeconds: 70,
        roundTarget: 6,
        createRound: function (input) {
          var row = registry.pickRound("morphology-builder", roundContext(input), input.history) || {};
          return {
            id: row.id || ("mb-" + Date.now()),
            promptLabel: row.prompt || "Forge the word.",
            entryLabel: "Build the target word from its parts.",
            prompt: row.prompt || "Forge the word.",
            tiles: (row.tiles || []).slice(),
            solution: (row.solution || []).slice(),
            hint: row.meaningHint || "Use what each part means to test your build.",
            timerSeconds: 70,
            meaningHint: row.meaningHint || "",
            basePoints: 105
          };
        },
        evaluateRound: function (payload) {
          var response = payload.response || {};
          var round = payload.round || {};
          if (response.teacherOverride) return { correct: true, teacherOverride: true, message: "Teacher moved the class to the next build." };
          var built = Array.isArray(response.value) ? response.value : [];
          var target = round.solution || [];
          var exact = built.join("|") === target.join("|");
          var partial = built.filter(function (part, index) { return target[index] === part; }).length;
          return exact
            ? { correct: true, message: "Forged. " + (round.meaningHint || "Meaning hint ready.") }
            : {
                correct: false,
                nearMiss: partial >= Math.max(1, target.length - 1),
                message: partial ? "Almost built. Recheck the order or the affix choice." : "Try another morpheme combination."
              };
        }
      },
      "concept-ladder": {
        id: "concept-ladder",
        title: "Clue Climb",
        subtitle: "Take clues one rung at a time and solve the idea before the final reveal appears.",
        tags: ["Early Solve", "Clue Reveal", "Lesson Concepts"],
        modeLabel: "Climb",
        baseTimerSeconds: 55,
        roundTarget: 6,
        createRound: function (input) {
          var row = registry.pickRound("concept-ladder", roundContext(input), input.history) || {};
          return {
            id: row.id || ("ladder-" + Date.now()),
            promptLabel: row.prompt || "Name the concept.",
            entryLabel: input.settings.viewMode === "projector" || input.settings.viewMode === "classroom"
              ? "Pause after each clue so teams can decide."
              : "Reveal only the clues you need.",
            prompt: row.prompt || "Name the concept.",
            clues: (row.clues || []).slice(),
            answer: String(row.answer || ""),
            options: (row.options || []).slice(),
            timerSeconds: 55,
            hint: "Stop early if you already know it. Earlier solves score more.",
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
            ? { correct: true, basePoints: Math.max(70, 150 - (clueCount * 18)), message: "Solved on the climb." }
            : { correct: false, nearMiss: clueCount < (round.clues || []).length, message: "Not yet. Take the next clue or rethink the pattern." };
        }
      },
      "error-detective": {
        id: "error-detective",
        title: "Fix-It Detective",
        subtitle: "Spot the mistake, name what went wrong, and pick the fix that repairs the thinking.",
        tags: ["Misconceptions", "Literacy or Math", "Teacher Focus"],
        modeLabel: "Detect",
        baseTimerSeconds: 65,
        roundTarget: 6,
        createRound: function (input) {
          var row = registry.pickRound("error-detective", roundContext(input), input.history) || {};
          return {
            id: row.id || ("error-" + Date.now()),
            promptLabel: row.prompt || "Find the fix.",
            entryLabel: row.misconception ? ("Focus: " + row.misconception) : "Misconception round ready.",
            incorrectExample: row.incorrectExample || "",
            options: (row.options || []).slice(),
            answer: row.answer || "",
            hint: "Pick the move that fixes the reasoning, not just the wording.",
            timerSeconds: 65,
            basePoints: 105
          };
        },
        evaluateRound: function (payload) {
          var response = payload.response || {};
          var round = payload.round || {};
          if (response.teacherOverride) return { correct: true, teacherOverride: true, message: "Teacher accepted the fix." };
          var value = String(response.value || "");
          return value === String(round.answer || "")
            ? { correct: true, message: "Case closed. That fix repairs the misconception." }
            : { correct: false, nearMiss: !!value, message: value ? "Not quite. The right fix: \u201c" + String(round.answer || "") + "\u201d" : "No correction selected." };
        }
      },
      "rapid-category": {
        id: "rapid-category",
        title: "Category Rush",
        subtitle: "Race the clock to name as many lesson words as you can in the right category.",
        tags: ["Timed Retrieval", "Projector Ready", "Unique Responses"],
        modeLabel: "Rush",
        baseTimerSeconds: 40,
        roundTarget: 5,
        createRound: function (input) {
          var row = registry.pickRound("rapid-category", roundContext(input), input.history) || {};
          return {
            id: row.id || ("category-" + Date.now()),
            promptLabel: row.prompt || "Fill the category.",
            entryLabel: input.settings.viewMode === "projector" || input.settings.viewMode === "classroom"
              ? ((row.category || "Category rush") + " · teacher collects the team answers.")
              : ((input.roundIndex || 0) % 2 === 1 ? "Go for quality before quantity." : (row.category || "Category rush ready.")),
            prompt: row.prompt || "Fill the category.",
            accepted: (row.accepted || []).slice(),
            timerSeconds: 40,
            hint: "Aim for fast, unique, relevant responses.",
            basePoints: 120
          };
        },
        evaluateRound: function (payload) {
          var response = payload.response || {};
          var round = payload.round || {};
          if (response.teacherOverride) return { correct: true, teacherOverride: true, message: "Teacher accepted the category rush." };
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
            message: matches.length + " strong responses counted."
          };
        }
      },
      "sentence-builder": {
        id: "sentence-builder",
        title: "Sentence Sprint",
        subtitle: "Rebuild the sentence so the ideas flow, the grammar works, and the lesson words stay in place.",
        tags: ["Academic Language", "EAL Support", "Lesson Lock"],
        modeLabel: "Build",
        baseTimerSeconds: 75,
        roundTarget: 6,
        createRound: function (input) {
          var row = registry.pickRound("sentence-builder", roundContext(input), input.history) || {};
          return {
            id: row.id || ("sentence-" + Date.now()),
            promptLabel: row.prompt || "Build the sentence.",
            entryLabel: row.scaffold || "Put the sentence back together.",
            prompt: row.prompt || "Build the sentence.",
            requiredToken: row.requiredToken || "",
            tiles: (row.tiles || []).slice(),
            solution: (row.solution || []).slice(),
            timerSeconds: 75,
            hint: row.scaffold || "Check the transition, word order, and verb placement.",
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
    var url = new URL(withAppBase(base));
    if (context.studentId) url.searchParams.set("student", context.studentId);
    if (context.classId) url.searchParams.set("classId", context.classId);
    if (context.lessonContextId) url.searchParams.set("lessonContextId", context.lessonContextId);
    if (context.subject) url.searchParams.set("subject", context.subject);
    if (context.programId) url.searchParams.set("programId", context.programId);
    url.searchParams.set("from", "game-platform");
    return url.toString();
  }

  function galleryLaunchHref(gameId, context) {
    if (gameId === "word-quest") return launchHref("./word-quest.html?play=1", context);
    return launchHref("./game-platform.html?play=1&game=" + encodeURIComponent(gameId), context);
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

  function supportLine(context, state) {
    var subject = context.subject || "ELA";
    var mode = (runtimeRoot.CSGameModes.VIEW_MODES[state.settings.viewMode] || {}).label || "Individual";
    return subject + " · " + mode + " · " + (context.lessonTitle || context.classLabel || "Context-aware set");
  }

  function isGroupView(state) {
    var mode = String(state && state.settings && state.settings.viewMode || "");
    return mode === "smallGroup" || mode === "classroom" || mode === "projector";
  }

  function contentSetLabel(value) {
    var key = String(value || "lesson").toLowerCase();
    if (key === "subject") return "Broader subject bank";
    if (key === "morphology") return "Morphology family";
    if (key === "custom") return "Custom word lock";
    return "Lesson-aligned";
  }

  function galleryCaption(gameId) {
    if (gameId === "word-quest") return "Best for: solo, pairs, fast warm-ups";
    if (gameId === "word-typing") return "Best for: literacy typing, centers, keyboard warm-ups";
    if (gameId === "word-connections") return "Best for: partners, teams, projector play";
    if (gameId === "morphology-builder") return "Best for: intervention, word study, pairs";
    if (gameId === "concept-ladder") return "Best for: lesson launch, teams, projector";
    if (gameId === "error-detective") return "Best for: small group, discussion, reteach";
    if (gameId === "rapid-category") return "Best for: teams, projector, retrieval bursts";
    if (gameId === "sentence-builder") return "Best for: solo, partners, language support";
    return "Best for: quick lesson-ready practice";
  }

  function resultTone(outcome) {
    if (!outcome) return "calm";
    if (outcome.correct || outcome.teacherOverride) return "positive";
    if (outcome.nearMiss) return "warning";
    return "negative";
  }

  function roundFocusLabel(game, round) {
    if (!game || !round) return "";
    if (game.id === "word-typing") return [round.keyboardZone, round.orthographyFocus].filter(Boolean).join(" · ");
    if (game.id === "word-quest") return round.answer ? ("Target length · " + String(round.answer).length + " letters") : "";
    if (game.id === "word-connections") return "Blocked words stay out";
    if (game.id === "morphology-builder") return round.meaningHint ? "Meaning unlock after build" : "Build from parts";
    if (game.id === "concept-ladder") return "Earlier solves earn more";
    if (game.id === "error-detective") return round.misconception || "Misconception repair";
    if (game.id === "rapid-category") return "Unique answers score stronger";
    if (game.id === "sentence-builder") return round.requiredToken ? ("Must include " + round.requiredToken) : "Academic language required";
    return "";
  }

  function roundGuide(game, state, round) {
    if (!game || !round) return "";
    var group = isGroupView(state);
    var firstMove = "";
    var turnCue = "";
    var winCue = "";

    if (game.id === "word-quest") {
      firstMove = group ? "Read the clue out loud and agree on one class guess." : "Read the clue and type one confident guess.";
      turnCue = group ? "Teacher chooses when to lock the team answer." : "Use the tile reveal to decide your next move fast.";
      winCue = "Land the correct word before the timer runs out.";
    } else if (game.id === "word-typing") {
      firstMove = group ? "Model the word once, then have the class type it together." : "Look across the whole word, then type it smoothly.";
      turnCue = group ? "Pause after each word so students notice the spelling chunk before the next round." : "Accuracy comes first. Speed follows once the pattern feels automatic.";
      winCue = "Type the target word exactly and lock in the keyboard pattern.";
    } else if (game.id === "word-connections") {
      firstMove = group ? "One speaker gives the first clue while the team listens for the target word." : "Give one clear clue without using any blocked words.";
      turnCue = group ? "Rotate speakers each round so every team member gets a clue turn." : "Keep the clue short, useful, and lesson-linked.";
      winCue = "Help the guesser land the word without saying the blocked words.";
    } else if (game.id === "morphology-builder") {
      firstMove = "Tap the parts in the order that builds a real word.";
      turnCue = group ? "Ask students to explain each morpheme before confirming the build." : "Use the meaning of each chunk to test your build.";
      winCue = "Build the complete word and unlock the meaning hint.";
    } else if (game.id === "concept-ladder") {
      firstMove = "Start with the first clue only.";
      turnCue = group ? "Pause after every clue so teams can commit before revealing more." : "Only reveal another clue if you really need it.";
      winCue = "Solve early to earn the strongest round.";
    } else if (game.id === "error-detective") {
      firstMove = "Spot what is wrong in the example before choosing a fix.";
      turnCue = group ? "Let teams explain why a choice repairs the thinking, not just the wording." : "Choose the fix that repairs the reasoning.";
      winCue = "Close the case with the option that truly fixes the misconception.";
    } else if (game.id === "rapid-category") {
      firstMove = group ? "Name fast ideas while one person records only the strongest responses." : "Type as many relevant words as you can before time ends.";
      turnCue = group ? "Reject repeats and keep only unique answers that fit the category." : "Unique, lesson-fit words beat filler.";
      winCue = "Collect enough strong responses to clear the round.";
    } else if (game.id === "sentence-builder") {
      firstMove = "Rebuild the sentence one tile at a time.";
      turnCue = group ? "Have partners justify the order before the class locks the sentence." : "Check transition, grammar, and target vocabulary together.";
      winCue = "Build a sentence that is correct, smooth, and lesson-ready.";
    }

    return [
      '<div class="cg-round-guide">',
      roundFocusLabel(game, round) ? ('  <div class="cg-round-guide__focus">' + runtimeRoot.CSGameComponents.escapeHtml(roundFocusLabel(game, round)) + '</div>') : "",
      '  <div class="cg-round-guide__row"><strong>First move</strong><span>' + runtimeRoot.CSGameComponents.escapeHtml(firstMove) + '</span></div>',
      '  <div class="cg-round-guide__row"><strong>' + runtimeRoot.CSGameComponents.escapeHtml(group ? "Teacher cue" : "Play cue") + '</strong><span>' + runtimeRoot.CSGameComponents.escapeHtml(turnCue) + '</span></div>',
      '  <div class="cg-round-guide__row"><strong>Win the round</strong><span>' + runtimeRoot.CSGameComponents.escapeHtml(winCue) + "</span></div>",
      "</div>"
    ].join("");
  }

  function nextStepLine(game, outcome) {
    if (!game || !outcome) return "";
    if (outcome.correct || outcome.teacherOverride) {
      if (game.id === "word-typing") return "Next move: add one more word from the same spelling pattern.";
      if (game.id === "concept-ladder") return "Next move: start the next round with one clue fewer if the class is ready.";
      if (game.id === "rapid-category") return "Next move: raise the category challenge or switch teams.";
      return "Next move: take the next round while the pattern is still fresh.";
    }
    if (outcome.nearMiss) return "Next move: keep the same round and use the hint before moving on.";
    if (game.id === "word-connections") return "Next move: try one sharper clue path instead of a full reset.";
    return "Next move: reset cleanly and try the round again with one stronger first move.";
  }

  function turnRotationLabel(state) {
    var roundNumber = Number(state && state.roundIndex || 0) + 1;
    var seat = (roundNumber % 4) || 4;
    return "Speaker " + seat;
  }

  function roundVariationLine(game, state, round) {
    var step = Number(state && state.roundIndex || 0) % 3;
    if (!game || !round) return "";
    if (game.id === "word-quest") {
      return step === 0 ? "Variation: fast solve round." : step === 1 ? "Variation: justify before you lock the guess." : "Variation: use the clue meaning, not just the first letter.";
    }
    if (game.id === "word-typing") {
      return step === 0 ? "Variation: accuracy first." : step === 1 ? "Variation: say the chunk, then type it." : "Variation: type the whole word without pausing between parts.";
    }
    if (game.id === "word-connections") {
      return step === 0 ? "Variation: example clue." : step === 1 ? "Variation: function clue." : "Variation: compare-and-contrast clue.";
    }
    if (game.id === "morphology-builder") {
      return step === 0 ? "Variation: build by meaning." : step === 1 ? "Variation: build by order." : "Variation: explain each part before confirming.";
    }
    if (game.id === "concept-ladder") {
      return step === 0 ? "Variation: solve early." : step === 1 ? "Variation: justify before the reveal." : "Variation: team vote before the next rung.";
    }
    if (game.id === "error-detective") {
      return step === 0 ? "Variation: name the error first." : step === 1 ? "Variation: compare two possible fixes." : "Variation: explain why the wrong choice fails.";
    }
    if (game.id === "rapid-category") {
      return step === 0 ? "Variation: speed burst." : step === 1 ? "Variation: no repeats." : "Variation: quality over quantity.";
    }
    if (game.id === "sentence-builder") {
      return step === 0 ? "Variation: grammar check." : step === 1 ? "Variation: transition check." : "Variation: target vocabulary check.";
    }
    return "";
  }

  function renderHostControls(game, state, round) {
    if (!isGroupView(state) || !game || !round) return "";
    var primaryAction = "";
    var secondaryAction = "";
    if (game.id === "concept-ladder") {
      primaryAction = '<button class="cg-action cg-action-primary" type="button" data-action="reveal-clue">Reveal Next Clue</button>';
      secondaryAction = '<button class="cg-action cg-action-quiet" type="button" data-action="teacher-override">Award Solve</button>';
    } else if (game.id === "word-connections") {
      primaryAction = '<button class="cg-action cg-action-primary" type="button" data-action="teacher-override">Count Team Clue</button>';
      secondaryAction = '<button class="cg-action cg-action-quiet" type="button" data-action="next-round">Rotate Speaker</button>';
    } else if (game.id === "rapid-category") {
      primaryAction = '<button class="cg-action cg-action-primary" type="button" data-action="teacher-override">Count Team Round</button>';
      secondaryAction = '<button class="cg-action cg-action-quiet" type="button" data-action="next-round">Switch Team</button>';
    } else if (game.id === "error-detective") {
      primaryAction = '<button class="cg-action cg-action-primary" type="button" data-action="teacher-override">Accept Fix</button>';
      secondaryAction = '<button class="cg-action cg-action-quiet" type="button" data-action="next-round">Open Next Case</button>';
    } else {
      primaryAction = '<button class="cg-action cg-action-primary" type="button" data-action="teacher-override">Move Class Forward</button>';
      secondaryAction = '<button class="cg-action cg-action-quiet" type="button" data-action="next-round">Next Round</button>';
    }
    return [
      '<div class="cg-host-panel">',
      '  <div class="cg-host-panel__meta">',
      '    <span class="cg-host-pill">Projector host controls</span>',
      '    <strong>' + runtimeRoot.CSGameComponents.escapeHtml(turnRotationLabel(state)) + "</strong>",
      '    <span>' + runtimeRoot.CSGameComponents.escapeHtml(roundVariationLine(game, state, round)) + "</span>",
      "  </div>",
      '  <div class="cg-feedback-actions">' + primaryAction + secondaryAction + "</div>",
      "</div>"
    ].join("");
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

  function renderResultBanner(state, game) {
    if (!state.lastOutcome || (state.status !== "round-complete" && state.status !== "round-summary")) return "";
    var tone = resultTone(state.lastOutcome);
    return [
      '<div class="cg-result-banner" data-tone="' + tone + '">',
      '  <div class="cg-result-banner-icon">' + runtimeRoot.CSGameComponents.iconFor(tone === "positive" ? "score" : tone === "warning" ? "hint" : "progress") + "</div>",
      '  <div class="cg-result-banner-copy"><strong>' + runtimeRoot.CSGameComponents.escapeHtml(state.lastOutcome.correct ? "Round complete" : state.lastOutcome.nearMiss ? "Reasoning close" : "Round reset") + '</strong><span>' + runtimeRoot.CSGameComponents.escapeHtml(state.feedback && state.feedback.label || "") + '</span><small>' + runtimeRoot.CSGameComponents.escapeHtml(nextStepLine(game, state.lastOutcome)) + "</small></div>",
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

  function evidenceModuleForGame(gameId, context) {
    var id = String(gameId || "");
    var subject = String(context && context.subject || "").toLowerCase();
    if (id === "word-quest" || id === "word-typing" || id === "morphology-builder" || id === "rapid-category") return "wordquest";
    if (id === "sentence-builder") return "sentence_surgery";
    if (id === "word-connections") return "writing_studio";
    if (id === "concept-ladder") return subject === "math" ? "numeracy" : "reading_lab";
    if (id === "error-detective") return subject === "math" ? "numeracy" : "sentence_surgery";
    return "wordquest";
  }

  function buildLegacyMetrics(gameId, state, context) {
    var rounds = Math.max(1, Number(state && state.roundsCompleted || 0));
    var metrics = state && state.metrics ? state.metrics : {};
    var accuracyRatio = Math.max(0, Math.min(1, Number(metrics.correct || 0) / rounds));
    if (gameId === "word-quest" || gameId === "morphology-builder" || gameId === "rapid-category" || gameId === "word-typing") {
      return {
        solveSuccess: (metrics.correct || 0) >= Math.ceil(rounds / 2),
        totalGuesses: rounds,
        newInfoPerGuess: Number((0.45 + (accuracyRatio * 0.4)).toFixed(3)),
        constraintHonorRate: Number((0.5 + (accuracyRatio * 0.35)).toFixed(3)),
        vowelConfusionProxy: Number((1 - accuracyRatio).toFixed(3)),
        misplaceRate: Number((1 - accuracyRatio).toFixed(3)),
        absentRate: Number(Math.max(0, 0.35 - (accuracyRatio * 0.2)).toFixed(3)),
        vowelSwapCount: Math.max(0, Number(metrics.incorrect || 0))
      };
    }
    if (gameId === "word-connections") {
      return {
        paragraphs: Math.max(1, Number(metrics.correct || 0)),
        revisionCount: Math.max(0, Number(metrics.nearMiss || 0) + Number(metrics.incorrect || 0)),
        voiceFlatFlag: Number(metrics.incorrect || 0) > Number(metrics.correct || 0)
      };
    }
    if (gameId === "sentence-builder" || gameId === "error-detective") {
      return {
        reasoningAdded: Number(metrics.correct || 0) >= Number(metrics.incorrect || 0),
        runOnFlag: Number(metrics.incorrect || 0) > 0,
        fragmentFlag: Number(metrics.incorrect || 0) > Number(metrics.correct || 0),
        editsCount: Number(metrics.correct || 0) + Number(metrics.nearMiss || 0)
      };
    }
    if (gameId === "concept-ladder" && String(context && context.subject || "").toLowerCase() === "math") {
      return {
        accuracy: Number((accuracyRatio * 100).toFixed(0)),
        speedProxy: Math.max(25, 72 - (Number(metrics.incorrect || 0) * 6)),
        hints: Math.max(0, Number(metrics.nearMiss || 0))
      };
    }
    return {
      accuracy: Number((accuracyRatio * 100).toFixed(0)),
      wpmProxy: Math.max(30, 90 - (Number(metrics.incorrect || 0) * 5)),
      selfCorrects: Number(metrics.nearMiss || 0)
    };
  }

  function writeSessionToEvidence(gameId, state, context) {
    if (!runtimeRoot.CSEvidence || !context || !context.studentId) return false;
    var metrics = state && state.metrics ? state.metrics : {};
    var rounds = Math.max(1, Number(state && state.roundsCompleted || 0));
    var correct = Number(metrics.correct || 0);
    var accuracyRatio = Math.max(0, Math.min(1, correct / rounds));
    var module = evidenceModuleForGame(gameId, context);
    var envelope = {
      id: "game_" + String(gameId || "activity") + "_" + String(state && state.roundIndex || rounds) + "_" + Date.now().toString(36),
      studentId: context.studentId,
      createdAt: new Date().toISOString(),
      activity: String(gameId || "game"),
      durationSec: Math.max(0, rounds * 45),
      signals: {
        guessCount: rounds,
        avgGuessLatencyMs: Math.max(600, 2600 - (correct * 180)),
        misplaceRate: Number((1 - accuracyRatio).toFixed(3)),
        absentRate: Number(Math.max(0, 0.3 - (accuracyRatio * 0.2)).toFixed(3)),
        repeatSameBadSlotCount: Math.max(0, Number(metrics.incorrect || 0) - 1),
        vowelSwapCount: Math.max(0, Number(metrics.nearMiss || 0)),
        constraintViolations: Math.max(0, Number(metrics.incorrect || 0))
      },
      outcomes: {
        solved: correct >= Math.ceil(rounds / 2),
        attemptsUsed: rounds
      }
    };
    var session = runtimeRoot.CSEvidence.addSession(context.studentId, envelope);
    if (!session) return false;
    if (typeof runtimeRoot.CSEvidence.appendSession === "function") {
      runtimeRoot.CSEvidence.appendSession(context.studentId, module, buildLegacyMetrics(gameId, state, context), Date.now());
    }
    return true;
  }

  function init() {
    var params = parseParams();
    var galleryOnly = !params.playMode;
    var context = loadTeacherContext(params);
    var recommendedGame = params.gameId || (runtimeRoot.CSGameContentRegistry && runtimeRoot.CSGameContentRegistry.recommendedGame
      ? runtimeRoot.CSGameContentRegistry.recommendedGame(context)
      : "word-quest");
    /* Restore gallery context from localStorage when not in URL */
    try {
      if (!params.gradeBand && localStorage.getItem("cs.gallery.grade")) {
        context.gradeBand = localStorage.getItem("cs.gallery.grade");
      }
      if (!params.subject && localStorage.getItem("cs.gallery.subject")) {
        context.subject = localStorage.getItem("cs.gallery.subject");
      }
    } catch (_e) {}
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
      bumpUntil: { score: 0, streak: 0, rounds: 0 },
      lastLoggedSummaryKey: "",
      lastSubmittedGuess: ""
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
        contentMode: context.contentMode || "lesson",
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
      var projectorSuggested = state.settings.viewMode === "projector" || state.settings.viewMode === "classroom";
      runtimeRoot.document.documentElement.setAttribute("data-view-mode", state.settings.viewMode || "individual");
      runtimeRoot.document.body.setAttribute("data-shell-view", galleryOnly ? "gallery" : "play");
      runtimeRoot.document.body.setAttribute("data-game-id", state.selectedGameId || "");

      if (galleryOnly) {
        shell.innerHTML = [
          '<div class="cg-brandbar cg-brandbar--gallery">',
          '  <div class="cg-brand">',
          '    <div class="cg-brand-mark">' + runtimeRoot.CSGameComponents.iconFor(state.selectedGameId, "cg-icon cg-icon--game") + "</div>",
          '    <div class="cg-brand-copy">',
          '      <p class="cg-kicker">Cornerstone MTSS</p>',
          '      <h1 class="cg-display">Choose a Game</h1>',
          '      <p>Short, lesson-ready games for classroom practice, family play, and student choice.</p>',
          "    </div>",
          "  </div>",
          "</div>",
          '<section class="cg-gallery-shell">',
          '  <div class="cg-gallery-setup">',
          '    <div class="cg-setup-row">',
          '      <label class="cg-setup-label">Grade<select id="cg-setup-grade" class="cg-select cg-select-sm">',
          '        <option value="">Any</option>',
          '        <option value="K-2"' + (context.gradeBand === "K-2" ? " selected" : "") + '>K-2</option>',
          '        <option value="3-5"' + (context.gradeBand === "3-5" ? " selected" : "") + '>3-5</option>',
          '        <option value="6-8"' + (context.gradeBand === "6-8" ? " selected" : "") + '>6-8</option>',
          '        <option value="9-12"' + (context.gradeBand === "9-12" ? " selected" : "") + '>9-12</option>',
          '      </select></label>',
          '      <label class="cg-setup-label">Subject<select id="cg-setup-subject" class="cg-select cg-select-sm">',
          '        <option value="ELA"' + (!context.subject || context.subject === "ELA" ? " selected" : "") + '>ELA</option>',
          '        <option value="Intervention"' + (context.subject === "Intervention" ? " selected" : "") + '>Intervention</option>',
          '        <option value="Writing"' + (context.subject === "Writing" ? " selected" : "") + '>Writing</option>',
          '        <option value="Math"' + (context.subject === "Math" ? " selected" : "") + '>Math</option>',
          '        <option value="Science"' + (context.subject === "Science" ? " selected" : "") + '>Science</option>',
          '      </select></label>',
          '    </div>',
          '  </div>',
          '  <div class="cg-gallery-grid">' + Object.keys(games).map(function (id) {
            var isRec = id === recommendedGame;
            return runtimeRoot.CSGameComponents.renderGameCard(games[id], isRec, {
              href: galleryLaunchHref(id, context),
              actionLabel: isRec ? "Start Recommended" : "Open Game",
              caption: galleryCaption(id)
            });
          }).join("") + "</div>",
          "</section>"
        ].join("");
        bindInteractions();
        return;
      }

      shell.innerHTML = [
        '<div class="cg-brandbar cg-brandbar--play">',
        '  <div class="cg-brand">',
        '    <div class="cg-brand-mark">' + runtimeRoot.CSGameComponents.iconFor(state.selectedGameId, "cg-icon cg-icon--game") + "</div>",
        '    <div class="cg-brand-copy">',
        '      <p class="cg-kicker">Cornerstone MTSS</p>',
        '      <h1 class="cg-display">' + runtimeRoot.CSGameComponents.escapeHtml(currentGame.title) + "</h1>",
        '      <p>' + runtimeRoot.CSGameComponents.escapeHtml(currentGame.subtitle) + "</p>",
        "    </div>",
        "  </div>",
        '  <div class="cg-toolbar">',
        '    <a class="cg-action cg-action-quiet" href="' + runtimeRoot.CSGameComponents.escapeHtml(withAppBase("game-platform.html")) + '">' + runtimeRoot.CSGameComponents.iconFor("context") + 'All Games</a>',
        '    <button class="cg-action cg-action-quiet" type="button" data-action="toggle-teacher">' + runtimeRoot.CSGameComponents.iconFor("teacher") + (uiState.teacherPanelOpen ? "Hide Controls" : "Teacher Controls") + "</button>",
        '    <button class="cg-action cg-action-quiet" type="button" data-action="hint">' + runtimeRoot.CSGameComponents.iconFor("hint") + "Hint</button>",
        '    <button class="cg-action cg-action-primary" type="button" data-action="restart">' + runtimeRoot.CSGameComponents.iconFor("progress") + "Restart</button>",
        "  </div>",
        "</div>",
        '<div class="cg-play-shell">',
        '  <section class="cg-main-card cg-surface cg-stage-shell cg-stage-shell--focused">',
        '    <div class="cg-stage-meta">',
        '      <div class="cg-stage-head">',
        "        <div>",
        '          <p class="cg-kicker">Now Playing</p>',
        '          <h2 class="cg-display">' + runtimeRoot.CSGameComponents.escapeHtml(currentGame.title) + '</h2>',
        '          <p>' + runtimeRoot.CSGameComponents.escapeHtml(state.round && state.round.promptLabel || currentGame.subtitle) + '</p>',
        "        </div>",
        '        <div class="cg-stage-toolbar">',
        '          <span class="cg-chip">' + runtimeRoot.CSGameComponents.iconFor("projector") + runtimeRoot.CSGameComponents.escapeHtml((runtimeRoot.CSGameModes.VIEW_MODES[state.settings.viewMode] || {}).label || "Individual") + '</span>',
        '          <span class="cg-chip">' + runtimeRoot.CSGameComponents.iconFor("progress") + runtimeRoot.CSGameComponents.escapeHtml((runtimeRoot.CSGameModes.DIFFICULTY[state.settings.difficulty] || {}).label || "Core") + '</span>',
        '          <span class="cg-chip" data-tone="' + (state.settings.timerEnabled ? "positive" : "warning") + '">' + runtimeRoot.CSGameComponents.iconFor("timer") + (state.settings.timerEnabled ? "Timed" : "Untimed") + '</span>',
        (state.streak >= 2 ? '          <span class="cg-chip cg-chip-streak" data-tone="positive">' + runtimeRoot.CSGameComponents.iconFor("progress") + state.streak + '\u2009streak</span>' : ""),
        "        </div>",
        "      </div>",
        '      <div class="cg-context-chips">',
        '        <span class="cg-chip" data-tone="focus">' + runtimeRoot.CSGameComponents.iconFor("context") + runtimeRoot.CSGameComponents.escapeHtml(supportLine(context, state)) + '</span>',
        (projectorSuggested ? '<span class="cg-chip">' + runtimeRoot.CSGameComponents.iconFor("projector") + 'Projector-safe layout ready</span>' : ""),
        "      </div>",
        renderFeedback(state.feedback),
        renderResultBanner(state, currentGame),
        '      <div id="cg-stage-board" class="cg-stage-board"></div>',
        "    </div>",
        "  </section>",
        '  <section class="cg-main-card cg-surface' + (uiState.teacherPanelOpen ? "" : " cg-hidden") + '" id="cg-teacher-panel">',
        '    <p class="cg-kicker">Teacher Control Panel</p>',
        '    <div class="cg-control-grid">',
        '      <div class="cg-field"><label for="cg-view-mode">Mode</label><select id="cg-view-mode" class="cg-select"><option value="individual">Individual</option><option value="smallGroup">Small Group</option><option value="classroom">Classroom</option><option value="projector">Projector</option></select></div>',
        '      <div class="cg-field"><label for="cg-difficulty">Difficulty</label><select id="cg-difficulty" class="cg-select"><option value="scaffolded">Scaffolded</option><option value="core">Core</option><option value="stretch">Stretch</option></select></div>',
        '      <div class="cg-field"><label for="cg-subject">Subject</label><select id="cg-subject" class="cg-select"><option value="ELA">ELA</option><option value="Intervention">Intervention</option><option value="Writing">Writing</option><option value="Math">Math</option><option value="Science">Science</option></select></div>',
        '      <div class="cg-field"><label for="cg-grade-band">Grade Band</label><select id="cg-grade-band" class="cg-select"><option value="K-2">K-2</option><option value="3-5">3-5</option><option value="6-8">6-8</option><option value="9-12">9-12</option></select></div>',
        '      <div class="cg-field"><label for="cg-content-mode">Content Set</label><select id="cg-content-mode" class="cg-select"><option value="lesson">Lesson-aligned</option><option value="subject">Broader subject bank</option><option value="morphology">Morphology family</option><option value="custom">Custom word lock</option></select></div>',
        '      <div class="cg-field"><label for="cg-skill-focus">Skill Focus</label><input id="cg-skill-focus" class="cg-input" type="text" value="' + runtimeRoot.CSGameComponents.escapeHtml(context.skillFocus || "") + '" placeholder="LIT.MOR.ROOT"></div>',
        '      <div class="cg-field"><label for="cg-custom-word-set">Custom Word Set / Lesson Lock</label><input id="cg-custom-word-set" class="cg-input" type="text" value="' + runtimeRoot.CSGameComponents.escapeHtml(state.settings.customWordSet || "") + '" placeholder="prefix, claim, ratio"></div>',
        '      <label class="cg-checkbox"><input id="cg-toggle-timer" type="checkbox"' + (state.settings.timerEnabled ? " checked" : "") + '>Timer enabled</label>',
        '      <label class="cg-checkbox"><input id="cg-toggle-hints" type="checkbox"' + (state.settings.hintsEnabled ? " checked" : "") + '>Hints enabled</label>',
        '      <label class="cg-checkbox"><input id="cg-toggle-sound" type="checkbox"' + (state.settings.soundEnabled ? " checked" : "") + '>Optional sound layer</label>',
        '      <button class="cg-action cg-action-quiet" type="button" data-action="teacher-override">' + runtimeRoot.CSGameComponents.iconFor("teacher") + 'Teacher Override</button>',
        "    </div>",
        "  </section>",
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
        var peakStreak = state.history.reduce(function (max, r) { return Math.max(max, r.streak || 0); }, 0);
        var strongWords = state.history.filter(function (r) { return r.result === "correct"; }).map(function (r) { return r.label; }).filter(Boolean).slice(0, 5);
        var missedWords = state.history.filter(function (r) { return r.result === "incorrect"; }).map(function (r) { return r.label; }).filter(Boolean).slice(0, 5);
        return [
          '<div class="cg-focus-panel">',
          '  <p class="cg-kicker">Session Complete</p>',
          '  <h3 class="cg-display">Score: ' + state.score + '</h3>',
          '  <div class="cg-summary-stats">',
          '    <span class="cg-stat"><strong>' + state.metrics.correct + '</strong> correct</span>',
          (state.metrics.nearMiss ? '    <span class="cg-stat"><strong>' + state.metrics.nearMiss + '</strong> near miss</span>' : ""),
          (state.metrics.incorrect ? '    <span class="cg-stat"><strong>' + state.metrics.incorrect + '</strong> incorrect</span>' : ""),
          (peakStreak >= 2 ? '    <span class="cg-stat cg-stat-streak"><strong>' + peakStreak + '</strong> best streak</span>' : ""),
          '  </div>',
          (strongWords.length ? '  <p class="cg-focus-line"><strong>Strong:</strong> ' + runtimeRoot.CSGameComponents.escapeHtml(strongWords.join(", ")) + "</p>" : ""),
          (missedWords.length ? '  <p class="cg-focus-line"><strong>Review:</strong> ' + runtimeRoot.CSGameComponents.escapeHtml(missedWords.join(", ")) + "</p>" : ""),
          '  <div class="cg-feedback-actions"><button class="cg-action cg-action-primary" type="button" data-action="restart">' + runtimeRoot.CSGameComponents.iconFor("progress") + 'New Session</button><button class="cg-action cg-action-quiet" type="button" data-action="repeat-game">Same Game</button></div>',
          "</div>"
        ].join("");
      }

      if (game.id === "word-quest") {
        var guess = String(uiState.lastSubmittedGuess || "").toUpperCase();
        var evaluation = state.lastOutcome && state.lastOutcome.evaluation || [];
        return [
          roundGuide(game, state, round),
          renderHostControls(game, state, round),
          '<div class="cg-quest-board">',
          '  <p class="cg-quest-clue">' + runtimeRoot.CSGameComponents.escapeHtml(round.prompt) + "</p>",
          '  <div class="cg-quest-grid">' + String(round.answer || "").split("").map(function (_letter, index) {
            return '<div class="cg-letter-box' + (evaluation[index] ? " is-revealed" : "") + '" data-state="' + runtimeRoot.CSGameComponents.escapeHtml(evaluation[index] || "") + '" style="animation-delay:' + (index * 40) + 'ms">' + runtimeRoot.CSGameComponents.escapeHtml(guess[index] || "") + "</div>";
          }).join("") + "</div>",
          '  <div class="cg-quest-input-row">',
          '    <input id="cg-word-guess" class="cg-input" maxlength="' + String(round.answer || "").length + '" placeholder="' + runtimeRoot.CSGameComponents.escapeHtml(isGroupView(state) ? "Class guess…" : "Your guess…") + '" autocomplete="off" autocorrect="off" spellcheck="false">',
          '    <button class="cg-action cg-action-primary" type="button" data-submit="word-quest">Submit</button>',
          '    <button class="cg-action cg-action-quiet" type="button" data-action="next-round">Skip</button>',
          "  </div>",
          (state.hintVisible ? '<span class="cg-chip" data-tone="warning">' + runtimeRoot.CSGameComponents.iconFor("hint") + runtimeRoot.CSGameComponents.escapeHtml(round.hint) + "</span>" : ""),
          "</div>"
        ].join("");
      }

      if (game.id === "word-connections") {
        var forbiddenStrike = state.lastOutcome && state.lastOutcome.forbidden;
        var speakerNum = ((Number(state.roundIndex || 0) % 4) + 1);
        return [
          '<div class="cg-game-layout cg-game-layout--clue' + (forbiddenStrike ? " cg-focus-panel--forbidden" : "") + '">',
          roundGuide(game, state, round),
          renderHostControls(game, state, round),
          (isGroupView(state) ? [
            '<div class="cg-taboo-zones">',
            '  <div class="cg-taboo-zone"><span class="cg-taboo-zone-label">Speaker</span><span class="cg-taboo-zone-name">Student ' + speakerNum + '</span></div>',
            '  <div class="cg-taboo-zone"><span class="cg-taboo-zone-label">Team</span><span class="cg-taboo-zone-name">Guess together</span></div>',
            '</div>'
          ].join("") : ""),
          '<div class="cg-taboo-card">',
          '  <p class="cg-taboo-label">Clue the word without saying:</p>',
          '  <div class="cg-taboo-target">' + runtimeRoot.CSGameComponents.escapeHtml(round.targetWord || "") + '</div>',
          '  <div class="cg-taboo-danger-band">',
          '    <span class="cg-taboo-ban-label">Do not say</span>',
          (round.forbiddenWords || []).map(function (word) {
            return '    <span class="cg-chip" data-tone="negative">' + runtimeRoot.CSGameComponents.escapeHtml(word) + "</span>";
          }).join(""),
          '  </div>',
          "</div>",
          '<textarea id="cg-word-connections-text" class="cg-textarea" placeholder="' + runtimeRoot.CSGameComponents.escapeHtml(isGroupView(state) ? "Record the clue or teacher notes for scoring…" : "Write the clue here…") + '"></textarea>',
          '<div class="cg-feedback-actions"><button class="cg-action cg-action-primary" type="button" data-submit="word-connections">' + runtimeRoot.CSGameComponents.escapeHtml(isGroupView(state) ? "Score Clue" : "Check Clue") + '</button><button class="cg-action cg-action-quiet" type="button" data-action="next-round">Next Prompt</button></div>',
          (state.hintVisible ? '<span class="cg-chip">' + runtimeRoot.CSGameComponents.iconFor("hint") + runtimeRoot.CSGameComponents.escapeHtml(round.hint) + "</span>" : ""),
          "</div>"
        ].join("");
      }

      if (game.id === "morphology-builder") {
        var forgeChosen = Array.isArray(uiState.builderSelection) ? uiState.builderSelection : [];
        return [
          '<div class="cg-game-layout cg-game-layout--builder">',
          roundGuide(game, state, round),
          renderHostControls(game, state, round),
          '<div class="cg-forge">',
          '  <div class="cg-forge-bench">',
          '    <p class="cg-forge-bench-label">Build Bench</p>',
          '    <div class="cg-forge-slots">' + (round.solution || []).map(function (_part, index) {
            var val = forgeChosen[index] || "";
            return '<button class="cg-forge-slot' + (val ? " is-filled" : "") + '" type="button" data-slot-index="' + index + '">' + runtimeRoot.CSGameComponents.escapeHtml(val || "—") + "</button>";
          }).join("") + "</div>",
          "  </div>",
          '  <div class="cg-forge-tray">',
          '    <p class="cg-forge-tray-label">Morpheme Parts</p>',
          '    <div class="cg-forge-tiles">' + (round.tiles || []).map(function (tile) {
            var sel = forgeChosen.indexOf(tile) >= 0;
            return '<button class="cg-morph-tile' + (sel ? " is-selected" : "") + '" type="button" data-tile="' + runtimeRoot.CSGameComponents.escapeHtml(tile) + '">' + runtimeRoot.CSGameComponents.escapeHtml(tile) + "</button>";
          }).join("") + "</div>",
          "  </div>",
          '  <div class="cg-feedback-actions"><button class="cg-action cg-action-primary" type="button" data-submit="morphology-builder">Check Build</button><button class="cg-action cg-action-quiet" type="button" data-action="clear-build">Clear</button></div>',
          (state.hintVisible ? '  <span class="cg-chip">' + runtimeRoot.CSGameComponents.iconFor("hint") + runtimeRoot.CSGameComponents.escapeHtml(round.hint) + "</span>" : ""),
          "</div>",
          "</div>"
        ].join("");
      }

      if (game.id === "sentence-builder") {
        var sentChosen = Array.isArray(uiState.builderSelection) ? uiState.builderSelection : [];
        return [
          '<div class="cg-game-layout cg-game-layout--builder">',
          roundGuide(game, state, round),
          renderHostControls(game, state, round),
          '<div class="cg-sentence-sprint">',
          '  <div class="cg-sentence-lane">',
          '    <p class="cg-lane-label">Build the sentence \u2192</p>',
          '    <div class="cg-sentence-slots">' + (round.solution || []).map(function (_part, index) {
            var val = sentChosen[index] || "";
            return '<button class="cg-sentence-slot' + (val ? " is-filled" : "") + '" type="button" data-slot-index="' + index + '">' + runtimeRoot.CSGameComponents.escapeHtml(val || "\u00B7\u00B7\u00B7") + "</button>";
          }).join("") + "</div>",
          "  </div>",
          '  <div class="cg-phrase-bank">',
          '    <p class="cg-phrase-bank-label">Word Tiles</p>',
          '    <div class="cg-phrase-tiles">' + (round.tiles || []).map(function (tile) {
            var sel = sentChosen.indexOf(tile) >= 0;
            return '<button class="cg-phrase-tile' + (sel ? " is-selected" : "") + '" type="button" data-tile="' + runtimeRoot.CSGameComponents.escapeHtml(tile) + '">' + runtimeRoot.CSGameComponents.escapeHtml(tile) + "</button>";
          }).join("") + "</div>",
          "  </div>",
          (round.requiredToken ? '  <span class="cg-chip" data-tone="focus">' + runtimeRoot.CSGameComponents.iconFor("context") + "Must include: " + runtimeRoot.CSGameComponents.escapeHtml(round.requiredToken) + "</span>" : ""),
          '  <div class="cg-feedback-actions"><button class="cg-action cg-action-primary" type="button" data-submit="sentence-builder">Check Sentence</button><button class="cg-action cg-action-quiet" type="button" data-action="clear-build">Clear</button></div>',
          (state.hintVisible ? '  <span class="cg-chip">' + runtimeRoot.CSGameComponents.iconFor("hint") + runtimeRoot.CSGameComponents.escapeHtml(round.hint) + "</span>" : ""),
          "</div>",
          "</div>"
        ].join("");
      }

      if (game.id === "concept-ladder") {
        var totalClues = (round.clues || []).length;
        var shownClues = Math.min(uiState.revealedClues, totalClues);
        return [
          '<div class="cg-game-layout cg-game-layout--ladder">',
          roundGuide(game, state, round),
          renderHostControls(game, state, round),
          '<p class="cg-kicker">' + runtimeRoot.CSGameComponents.escapeHtml(round.prompt) + ' \u2014 Clue ' + shownClues + ' of ' + totalClues + '</p>',
          '<div class="cg-ladder">' + (round.clues || []).map(function (clue, index) {
            if (index < shownClues) {
              return '<div class="cg-ladder-rung cg-ladder-rung--revealed" style="animation-delay:' + (index * 60) + 'ms"><span class="cg-rung-num">' + (index + 1) + '</span><div class="cg-rung-text">' + runtimeRoot.CSGameComponents.escapeHtml(clue) + "</div></div>";
            }
            return '<div class="cg-ladder-rung cg-ladder-rung--locked"><span class="cg-rung-num">' + (index + 1) + '</span><div class="cg-rung-locked-label">Reveal to unlock</div></div>';
          }).join("") + "</div>",
          '<div class="cg-choice-row">' + (round.options || []).map(function (option) {
            return '<button class="cg-choice' + (uiState.selectedChoice === option ? " is-selected" : "") + '" type="button" data-choice="' + runtimeRoot.CSGameComponents.escapeHtml(option) + '">' + runtimeRoot.CSGameComponents.escapeHtml(option) + "</button>";
          }).join("") + "</div>",
          '<div class="cg-feedback-actions"><button class="cg-action cg-action-primary" type="button" data-submit="concept-ladder">Submit Solve</button>' + (shownClues < totalClues ? '<button class="cg-action cg-action-quiet" type="button" data-action="reveal-clue">Reveal Next Clue</button>' : "") + "</div>",
          "</div>"
        ].join("");
      }

      if (game.id === "error-detective") {
        return [
          '<div class="cg-game-layout cg-game-layout--detective">',
          roundGuide(game, state, round),
          renderHostControls(game, state, round),
          '<div class="cg-case-board">',
          '  <div class="cg-case-file">',
          '    <div class="cg-case-file-header">',
          '      <span class="cg-case-stamp">Case File</span>',
          '      <span class="cg-case-type">' + runtimeRoot.CSGameComponents.escapeHtml(round.misconception || "Reasoning Error") + '</span>',
          '    </div>',
          '    <div class="cg-case-error-text">' + runtimeRoot.CSGameComponents.escapeHtml(round.incorrectExample || "") + '</div>',
          '  </div>',
          '  <div class="cg-case-paths">',
          '    <p class="cg-case-paths-label">Choose the fix that closes the case</p>',
          '    <div class="cg-choice-row">' + (round.options || []).map(function (option) {
            return '<button class="cg-choice' + (uiState.selectedChoice === option ? " is-selected" : "") + '" type="button" data-choice="' + runtimeRoot.CSGameComponents.escapeHtml(option) + '">' + runtimeRoot.CSGameComponents.escapeHtml(option) + "</button>";
          }).join("") + "</div>",
          '  </div>',
          '  <div class="cg-feedback-actions"><button class="cg-action cg-action-primary" type="button" data-submit="error-detective">Confirm Correction</button></div>',
          (state.hintVisible ? '  <span class="cg-chip">' + runtimeRoot.CSGameComponents.iconFor("hint") + runtimeRoot.CSGameComponents.escapeHtml(round.hint) + "</span>" : ""),
          "</div>",
          "</div>"
        ].join("");
      }

      if (game.id === "rapid-category") {
        var timerSec = round.timerSeconds || game.baseTimerSeconds || 40;
        var remaining = typeof state.timerRemaining === "number" ? state.timerRemaining : timerSec;
        var timerPct = timerSec > 0 ? Math.round((remaining / timerSec) * 100) : 100;
        var timerTone = timerPct > 50 ? "positive" : timerPct > 25 ? "warning" : "danger";
        var circumference = 276.46;
        var dashOffset = Math.round(circumference * (1 - timerPct / 100));
        var ringStroke = timerTone === "positive" ? "var(--cg-positive)" : timerTone === "warning" ? "var(--cg-warning)" : "var(--cg-negative)";
        return [
          '<div class="cg-game-layout cg-game-layout--rush">',
          roundGuide(game, state, round),
          renderHostControls(game, state, round),
          '<div class="cg-rush-arena">',
          '  <div class="cg-rush-stage">',
          '    <div class="cg-rush-timer-ring" aria-label="' + remaining + ' seconds remaining">',
          '      <svg viewBox="0 0 108 108" aria-hidden="true">',
          '        <circle class="track" cx="54" cy="54" r="44" stroke="rgba(20,34,51,0.10)" stroke-width="8" fill="none"/>',
          '        <circle class="fill" cx="54" cy="54" r="44" stroke="' + ringStroke + '" stroke-width="8" fill="none" stroke-linecap="round" stroke-dasharray="' + circumference + '" stroke-dashoffset="' + dashOffset + '" style="transition:stroke-dashoffset .9s linear,stroke .5s"/>',
          '      </svg>',
          '      <div class="cg-rush-timer-text">' + remaining + '<small>sec</small></div>',
          '    </div>',
          '    <div class="cg-rush-prompt-block">',
          '      <p class="cg-rush-category-label">Category</p>',
          '      <h3 class="cg-rush-prompt-text">' + runtimeRoot.CSGameComponents.escapeHtml(round.prompt) + '</h3>',
          '    </div>',
          '  </div>',
          '  <div class="cg-rush-entry">',
          '    <textarea id="cg-category-text" class="cg-textarea" placeholder="' + runtimeRoot.CSGameComponents.escapeHtml(isGroupView(state) ? "Team responses — one per line or comma-separated…" : "Enter responses — one per line or comma-separated…") + '"></textarea>',
          '    <div class="cg-feedback-actions"><button class="cg-action cg-action-primary" type="button" data-submit="rapid-category">' + runtimeRoot.CSGameComponents.escapeHtml(isGroupView(state) ? "Score Round" : "Score Responses") + '</button></div>',
          '  </div>',
          (state.hintVisible ? '  <span class="cg-chip">' + runtimeRoot.CSGameComponents.iconFor("hint") + runtimeRoot.CSGameComponents.escapeHtml(round.hint) + "</span>" : ""),
          "</div>",
          "</div>"
        ].join("");
      }

      if (game.id === "word-typing") {
        var typed = String(uiState.lastSubmittedGuess || "").toUpperCase();
        var typedEvaluation = state.lastOutcome && state.lastOutcome.evaluation || [];
        var targetChars = String(round.target || "").toUpperCase().split("");
        return [
          '<div class="cg-game-layout cg-game-layout--typing">',
          roundGuide(game, state, round),
          renderHostControls(game, state, round),
          '<div class="cg-typing-studio">',
          '  <div class="cg-typing-zone-badge">',
          '    <span class="cg-chip" data-tone="focus">' + runtimeRoot.CSGameComponents.escapeHtml(round.keyboardZone || "full keyboard") + '</span>',
          '    <span class="cg-chip">' + runtimeRoot.CSGameComponents.escapeHtml(round.orthographyFocus || "typing pattern") + '</span>',
          '  </div>',
          '  <div class="cg-typing-target">' + targetChars.map(function (ch) {
            return '<div class="cg-typing-char">' + runtimeRoot.CSGameComponents.escapeHtml(ch) + "</div>";
          }).join("") + "</div>",
          (typedEvaluation.length ? '  <div class="cg-typing-track">' + targetChars.map(function (_ch, index) {
            return '<div class="cg-letter-box' + (typedEvaluation[index] ? " is-revealed" : "") + '" data-state="' + runtimeRoot.CSGameComponents.escapeHtml(typedEvaluation[index] || "") + '" style="animation-delay:' + (index * 40) + 'ms">' + runtimeRoot.CSGameComponents.escapeHtml(typed[index] || "") + "</div>";
          }).join("") + "</div>" : ""),
          '  <div class="cg-typing-entry">',
          '    <input id="cg-word-typing-input" class="cg-input" maxlength="' + String(round.target || "").length + '" placeholder="' + runtimeRoot.CSGameComponents.escapeHtml(isGroupView(state) ? "Type the word for the class…" : "Type the word…") + '" autocomplete="off" autocorrect="off" spellcheck="false">',
          '    <button class="cg-action cg-action-primary" type="button" data-submit="word-typing">' + runtimeRoot.CSGameComponents.escapeHtml(isGroupView(state) ? "Check Class Word" : "Check Word") + '</button>',
          '    <button class="cg-action cg-action-quiet" type="button" data-action="next-round">Next Word</button>',
          '  </div>',
          '  <p class="cg-typing-cue">' + runtimeRoot.CSGameComponents.escapeHtml(round.fingerCue || "Look across the whole word before you type.") + "</p>",
          (state.hintVisible ? '  <span class="cg-chip">' + runtimeRoot.CSGameComponents.iconFor("hint") + runtimeRoot.CSGameComponents.escapeHtml(round.hint) + "</span>" : ""),
          "</div>",
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
        "cg-grade-band": context.gradeBand,
        "cg-content-mode": state.settings.contentMode || context.contentMode || "lesson"
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
          if (!gameId) return;
          if (galleryOnly) {
            var href = button.getAttribute("href") || button.getAttribute("data-href") || "";
            if (href) {
              runtimeRoot.location.href = href;
            }
            return;
          }
          resetRoundUi();
          engine.updateContext({
            subject: context.subject,
            gradeBand: context.gradeBand,
            skillFocus: context.skillFocus
          });
          engine.selectGame(gameId);
        });
        if (galleryOnly && button.getAttribute("role") === "link") {
          button.addEventListener("keydown", function (event) {
            if (event.key !== "Enter" && event.key !== " ") return;
            event.preventDefault();
            var href = button.getAttribute("data-href") || "";
            if (href) runtimeRoot.location.href = href;
          });
        }
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

      var contentMode = document.getElementById("cg-content-mode");
      if (contentMode) contentMode.addEventListener("change", function () {
        context.contentMode = contentMode.value;
        engine.updateContext({ contentMode: contentMode.value });
        engine.updateSettings({ contentMode: contentMode.value });
        resetRoundUi();
        engine.restartGame();
      });

      var skillFocus = document.getElementById("cg-skill-focus");
      if (skillFocus) skillFocus.addEventListener("change", function () {
        context.skillFocus = skillFocus.value;
        engine.updateContext({ skillFocus: skillFocus.value, vocabularyFocus: skillFocus.value });
        resetRoundUi();
        engine.restartGame();
      });

      var custom = document.getElementById("cg-custom-word-set");
      if (custom) custom.addEventListener("change", function () {
        if (custom.value) {
          context.contentMode = "custom";
          engine.updateContext({ contentMode: "custom" });
          engine.updateSettings({ contentMode: "custom" });
        }
        engine.updateSettings({ customWordSet: custom.value });
        resetRoundUi();
        engine.restartGame();
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

    /* ── Gallery setup selects ───────────────────────────── */
    var setupGrade   = document.getElementById("cg-setup-grade");
    var setupSubject = document.getElementById("cg-setup-subject");
    function applyGallerySetup() {
      if (setupGrade)   { context.gradeBand = setupGrade.value || context.gradeBand; try { localStorage.setItem("cs.gallery.grade", setupGrade.value); } catch (_e) {} }
      if (setupSubject) { context.subject = setupSubject.value || context.subject;   try { localStorage.setItem("cs.gallery.subject", setupSubject.value); } catch (_e) {} }
      render();
    }
    if (setupGrade)   setupGrade.addEventListener("change", applyGallerySetup);
    if (setupSubject) setupSubject.addEventListener("change", applyGallerySetup);

    function handleSubmit(gameId) {
      if (gameId === "word-quest") {
        var guess = document.getElementById("cg-word-guess");
        var value = guess ? guess.value : "";
        uiState.lastSubmittedGuess = String(value || "").trim();
        engine.submit({ value: value });
        return;
      }
      if (gameId === "word-typing") {
        var typedWord = document.getElementById("cg-word-typing-input");
        var typedValue = typedWord ? typedWord.value : "";
        uiState.lastSubmittedGuess = String(typedValue || "").trim();
        engine.submit({ value: typedValue });
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
      if (state.status === "round-summary") {
        var sessionKey = [
          state.selectedGameId,
          state.roundsCompleted,
          state.score,
          state.metrics && state.metrics.correct || 0,
          state.metrics && state.metrics.incorrect || 0
        ].join(":");
        if (uiState.lastLoggedSummaryKey !== sessionKey) {
          writeSessionToEvidence(state.selectedGameId, state, context);
          uiState.lastLoggedSummaryKey = sessionKey;
        }
      } else if (state.status === "playing" && Number(state.roundsCompleted || 0) === 0) {
        uiState.lastLoggedSummaryKey = "";
      }
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
