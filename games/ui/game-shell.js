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
    var pathname = String(runtimeRoot.location && runtimeRoot.location.pathname || "");
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
      contentMode: String(params.get("contentMode") || "").trim(),
      typingPage: /(?:^|\/)typing-quest\.html$/i.test(pathname) || params.get("typingPage") === "1",
      typingCourseMode: String(params.get("typingCourseMode") || params.get("courseMode") || "").trim(),
      typingLessonId: String(params.get("lessonId") || "").trim(),
      typingLessonOrder: Math.max(0, Number(params.get("lessonOrder") || 0))
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
    var markers = ["/CornerstoneMTSS/", "/WordQuest/"];
    for (var m = 0; m < markers.length; m += 1) {
      var marker = markers[m];
      var idx = path.indexOf(marker);
      if (idx >= 0) return path.slice(0, idx + marker.length);
    }
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

  function storageGet(key, fallback) {
    try {
      var raw = runtimeRoot.localStorage.getItem(key);
      return raw == null ? fallback : raw;
    } catch (_e) {
      return fallback;
    }
  }

  function storageSet(key, value) {
    try {
      runtimeRoot.localStorage.setItem(key, value);
    } catch (_e) {}
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

    function wordConnectionsDifficultyCount(value) {
      var level = Math.max(1, Math.min(4, Number(value) || 3));
      return level + 1;
    }

    function compactTokens(text) {
      return String(text || "")
        .toLowerCase()
        .replace(/[^a-z0-9\s-]/g, " ")
        .split(/\s+/)
        .map(function (part) { return part.trim(); })
        .filter(function (part) { return part && part.length > 3; });
    }

    function buildForbiddenWords(row, generated, desiredCount) {
      var target = String(generated && generated.targetWord || row && row.target || "").toLowerCase();
      var seen = Object.create(null);
      function pushWord(list, value) {
        var lower = String(value || "").trim().toLowerCase();
        if (!lower || lower === target || seen[lower]) return;
        seen[lower] = true;
        list.push(lower);
      }
      var pool = [];
      (generated && generated.forbiddenWords || row && row.forbidden || row && row.tabooWords || []).forEach(function (value) {
        pushWord(pool, value);
      });
      compactTokens(row && row.definition || "").forEach(function (value) { pushWord(pool, value); });
      compactTokens(row && row.clue || "").forEach(function (value) { pushWord(pool, value); });
      compactTokens(row && row.example || row && row.exampleSentence || "").forEach(function (value) { pushWord(pool, value); });
      compactTokens(generated && generated.instructionalFocus || "").forEach(function (value) { pushWord(pool, value); });
      while (pool.length < desiredCount) pushWord(pool, "focus");
      return pool.slice(0, desiredCount).map(function (value) {
        return value.replace(/\b\w/g, function (letter) { return letter.toUpperCase(); });
      });
    }

    function wordConnectionsInstruction(mode) {
      if (mode === "draw") return "Draw the concept without writing the blocked words.";
      if (mode === "act") return "Act it out charades-style without saying the blocked words.";
      if (mode === "mixed") return "Choose whether to speak, draw, or act. Keep the blocked words off limits.";
      return "Describe the word without saying the blocked words.";
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
        title: "Typing Quest",
        subtitle: "Type the lesson word, lock the spelling pattern, and build keyboard confidence through real literacy practice.",
        tags: ["Typing + Literacy", "Orthographic Mapping", "Home Row to Full Keyboard"],
        modeLabel: "Type",
        baseTimerSeconds: 50,
        roundTarget: 1,
        resolveRoundTarget: function (input) {
          var currentContext = input && input.context || {};
          return String(currentContext.typingCourseMode || "").toLowerCase() === "placement" ? 4 : 1;
        },
        createRound: function (input) {
          var currentContext = roundContext(input);
          var deck = registry.filterDeck("word-typing", currentContext) || [];
          var row = registry.pickRound("word-typing", currentContext, input.history) || {};
          var lessonIndex = deck.findIndex(function (item) { return item && item.id === row.id; });
          var unitDeck = deck.filter(function (item) {
            return String(item && item.unitLabel || "") === String(row.unitLabel || "");
          });
          var unitIndex = unitDeck.findIndex(function (item) { return item && item.id === row.id; });
          var lessonTotal = deck.length || 1;
          var unitTotal = unitDeck.length || 1;
          return {
            id: row.id || ("typing-" + Date.now()),
            promptLabel: String(currentContext.typingCourseMode || "").toLowerCase() === "placement"
              ? "Placement check"
              : (row.prompt || "Begin the typing lesson."),
            entryLabel: input.settings.viewMode === "projector" || input.settings.viewMode === "classroom"
              ? "Model the pattern first, then type the lesson target together."
              : "Eyes on the full target. Accuracy first, then rhythm.",
            prompt: row.prompt || "Type the lesson target.",
            target: String(row.target || "fjfj").toUpperCase(),
            keyboardZone: row.keyboardZone || "home row",
            orthographyFocus: row.orthographyFocus || "high-frequency pattern",
            fingerCue: row.fingerCue || "Look across the whole word before you type.",
            hint: row.meaningHint || "Notice the spelling chunk that stays stable in the word.",
            swbat: row.swbat || "I can type the lesson target with accuracy and rhythm.",
            unitLabel: row.unitLabel || "Unit 0",
            lessonLabel: row.lessonLabel || ("Lesson " + String(Math.max(1, lessonIndex + 1))),
            stageLabel: row.stageLabel || "Typing practice",
            typingKind: row.typingKind || "word",
            lessonOrder: Number(row.lessonOrder || lessonIndex + 1 || 1),
            heartLetters: row.heartLetters || "",
            masteryGoalWpm: Number(row.masteryGoalWpm || 12),
            masteryGoalAccuracy: Number(row.masteryGoalAccuracy || 95),
            sequenceIndex: lessonIndex >= 0 ? lessonIndex + 1 : 1,
            sequenceTotal: lessonTotal,
            unitIndex: unitIndex >= 0 ? unitIndex + 1 : 1,
            unitTotal: unitTotal,
            courseMode: String(currentContext.typingCourseMode || "").toLowerCase() === "placement" ? "placement" : "lesson",
            placementRequired: currentContext.typingPlacementRequired === true,
            unitPath: unitDeck.slice(0, 8).map(function (item, index) {
              var itemOrder = Number(item && item.lessonOrder || index + 1);
              return {
                id: item.id,
                order: itemOrder,
                label: item.lessonLabel || ("Lesson " + String(index + 1)),
                shortLabel: item.target || item.stageLabel || ("L" + String(index + 1)),
                locked: String(currentContext.typingCourseMode || "").toLowerCase() === "lesson" && itemOrder > Number(currentContext.typingUnlockedOrder || 1),
                completed: Array.isArray(currentContext.typingCompletedLessons) && currentContext.typingCompletedLessons.indexOf(item.id) >= 0
              };
            }),
            timerSeconds: Number(row.timerSeconds || (row.typingKind === "phrase" ? 65 : row.typingKind === "keys" ? 35 : 50)),
            basePoints: 115
          };
        },
        evaluateRound: function (payload) {
          var response = payload.response || {};
          var round = payload.round || {};
          if (response.teacherOverride) return { correct: true, teacherOverride: true, message: "Teacher moved the class to the next typing word." };
          if (response.timedOut) return { correct: false, message: "Time ended. The word was " + String(round.target || "").toUpperCase() + "." };
          var typed = lockTypingProgress(String(response.value || ""), round.target || "");
          var target = String(round.target || "").toUpperCase();
          var stats = response.stats || null;
          if (!typed) return { correct: false, message: "No word typed. The target was " + target.toUpperCase() + "." };
          if (typed === target) {
            return {
              correct: true,
              message: stats
                ? ("Typed cleanly at " + stats.wpm + " WPM and " + stats.accuracy + "% accuracy.")
                : "Typed cleanly. Pattern locked in.",
              evaluation: typingEvaluation(target, typed),
              stats: stats
            };
          }
          var hitCount = typingMeaningfulCharCount(typed);
          var targetCount = Math.max(1, typingMeaningfulCharCount(target));
          return {
            correct: false,
            nearMiss: hitCount >= Math.max(1, Math.floor(targetCount / 2)),
            message: hitCount ? "Close. Recheck the next chunk and type it again." : "Reset the pattern and type it once more.",
            evaluation: typingEvaluation(target, typed),
            stats: stats
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
          var tabooMode = String(input.settings && input.settings.wordConnectionsMode || "speak").toLowerCase();
          var tabooDifficulty = Math.max(1, Math.min(4, Number(input.settings && input.settings.wordConnectionsDifficulty) || 3));
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
            forbiddenWords: buildForbiddenWords(row, generated, wordConnectionsDifficultyCount(tabooDifficulty)),
            scaffolds: generated && generated.scaffolds || row.scaffolds || [],
            requiredMove: row.requiredMove || (input.settings.viewMode === "projector" || input.settings.viewMode === "classroom"
              ? "Give one clean clue the whole class can build on without saying the blocked words."
              : "Use a clear clue in one or two complete sentences that fit the lesson."),
            timerSeconds: 45,
            hint: (generated && generated.scaffolds || row.scaffolds || [])[0] || "Try an example, function, or comparison instead of a definition.",
            playMode: tabooMode,
            modeInstruction: wordConnectionsInstruction(tabooMode),
            blockedCount: wordConnectionsDifficultyCount(tabooDifficulty),
            imageSrc: row.image || row.imageUrl || "",
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
    if (String(state && state.selectedGameId || "") === "word-typing") {
      return "Typing Quest Foundations · " + mode + " · " + (context.typingPlacementRequired ? "Placement" : ("Lesson " + String(context.currentTypingLessonOrder || 1)));
    }
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
    if (gameId === "word-typing") return "Best for: typing instruction, intervention, centers";
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
    if (game.id === "word-typing") return [round.unitLabel, round.keyboardZone, round.orthographyFocus].filter(Boolean).join(" · ");
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
      firstMove = group ? "Model the target once, then have students name the pattern before anyone types." : "Look at the whole target, notice the pattern, then type without looking down.";
      turnCue = group ? "Use projector mode for modeling, but save real fluency scores for individual keyboards." : "Accuracy comes first. Build to 5 stars before moving on.";
      winCue = "Type the full lesson target and meet the WPM and accuracy goal.";
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
      if (game.id === "word-typing") return "Next move: check the star rating, then either replay for mastery or move to the next lesson.";
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

  function teachingContextLine(game) {
    return galleryCaption(game && game.id || "").replace(/^Best for:\s*/i, "");
  }

  function renderTeachingContext(game) {
    if (!game) return "";
    return [
      '<div class="cg-teaching-context">',
      '  <p class="cg-micro-label">Best for</p>',
      '  <p class="cg-teaching-context__copy">' + runtimeRoot.CSGameComponents.escapeHtml(teachingContextLine(game)) + "</p>",
      "</div>"
    ].join("");
  }

  function renderZoneCard(type, title, body) {
    return [
      '<section class="cg-zone-card cg-zone-card--' + runtimeRoot.CSGameComponents.escapeHtml(type) + '">',
      '  <div class="cg-zone-card__header">',
      '    <p class="cg-zone-card__eyebrow">' + runtimeRoot.CSGameComponents.escapeHtml(title) + "</p>",
      "  </div>",
      '  <div class="cg-zone-card__body">' + (body || "") + "</div>",
      "</section>"
    ].join("");
  }

  function renderRoundTimer(state, round) {
    if (!round) return "";
    var total = Math.max(1, Number(round.timerSeconds || 45));
    var remaining = Math.max(0, Number(state && state.timerRemaining || total));
    var pct = Math.max(0, Math.min(100, Math.round((remaining / total) * 100)));
    var tone = pct > 50 ? "positive" : pct > 25 ? "warning" : "danger";
    return [
      '<div class="cg-inline-timer" data-tone="' + tone + '">',
      '  <div class="cg-inline-timer__copy"><span>Round timer</span><strong class="timer">' + remaining + "s</strong></div>",
      '  <div class="cg-inline-timer__track"><span style="width:' + pct + '%"></span></div>',
      "</div>"
    ].join("");
  }

  function renderGameScaffold(game, state, round, config) {
    var options = config || {};
    var segments = [];
    if (options.beforePlay) segments.push(options.beforePlay);
    if (options.timer !== false) segments.push(renderRoundTimer(state, round));
    segments.push(renderZoneCard("play", options.playTitle || "Play Surface", options.play || ""));
    if (options.controls) segments.push(renderZoneCard("controls", options.controlsTitle || "Controls", options.controls));
    segments.push(renderZoneCard("guide", options.guideTitle || "How To Play", (options.guide || "") + renderTeachingContext(game)));
    if (options.afterGuide) segments.push(options.afterGuide);
    return [
      '<div class="cg-game-scaffold cg-game-scaffold--' + runtimeRoot.CSGameComponents.escapeHtml(game && game.id || "game") + '" data-outcome="' + runtimeRoot.CSGameComponents.escapeHtml(resultTone(state && state.lastOutcome)) + '">',
      segments.join(""),
      "</div>"
    ].join("");
  }

  function currentChoicePreview(choice) {
    if (!choice) return '<span class="cg-choice-preview__empty">Nothing selected yet.</span>';
    return '<span class="cg-choice-preview__value">' + runtimeRoot.CSGameComponents.escapeHtml(choice) + "</span>";
  }

  function buildKeyboardStrip(answer, evaluation, guess, className) {
    var letters = [];
    String(guess || "").toUpperCase().split("").forEach(function (letter, index) {
      if (!letter || letters.some(function (entry) { return entry.letter === letter; })) return;
      letters.push({
        letter: letter,
        state: evaluation && evaluation[index] || "absent"
      });
    });
    if (!letters.length) {
      String(answer || "").toUpperCase().split("").forEach(function (letter) {
        if (!letter || letters.some(function (entry) { return entry.letter === letter; })) return;
        letters.push({ letter: letter, state: "" });
      });
    }
    return [
      '<div class="' + runtimeRoot.CSGameComponents.escapeHtml(className || "cg-key-strip") + '" aria-label="Letter feedback">',
      letters.map(function (entry) {
        return '<span class="cg-key-strip__key" data-state="' + runtimeRoot.CSGameComponents.escapeHtml(entry.state || "") + '">' + runtimeRoot.CSGameComponents.escapeHtml(entry.letter) + "</span>";
      }).join(""),
      "</div>"
    ].join("");
  }

  function liveOrderFeedback(selected, solution, type) {
    var built = Array.isArray(selected) ? selected : [];
    var target = Array.isArray(solution) ? solution : [];
    var correctCount = built.filter(function (value, index) { return target[index] === value; }).length;
    var label = type === "sentence" ? "Grammar check" : "Build check";
    var detail = correctCount
      ? (correctCount + " of " + target.length + " parts are in the right place.")
      : (type === "sentence" ? "Drag or tap words into a sentence that sounds right." : "Start with the part that gives the word its base meaning.");
    return [
      '<div class="cg-live-check" data-tone="' + (correctCount ? "positive" : "focus") + '">',
      '  <strong>' + label + "</strong>",
      '  <span>' + runtimeRoot.CSGameComponents.escapeHtml(detail) + "</span>",
      "</div>"
    ].join("");
  }

  function renderDetectiveFragments(text, selected) {
    return String(text || "").split(/\s+/).filter(Boolean).map(function (word, index) {
      var normalized = String(word || "").replace(/[^\w'-]/g, "");
      var isSelected = selected && normalized && normalized === selected;
      return '<button class="cg-detective-fragment' + (isSelected ? " is-selected" : "") + '" type="button" data-detective-fragment="' + runtimeRoot.CSGameComponents.escapeHtml(normalized || word) + '" aria-pressed="' + (isSelected ? "true" : "false") + '">' + runtimeRoot.CSGameComponents.escapeHtml(word) + "</button>";
    }).join(" ");
  }

  function splitTypingChars(value) {
    return String(value || "").toUpperCase().split("");
  }

  function renderTypingLane(round, typed, typedEvaluation) {
    var target = String(round && round.target || "").toUpperCase();
    var currentIndex = Math.min(String(typed || "").length, target.length);
    var typedMarkup = target.slice(0, currentIndex);
    var currentChar = target.charAt(currentIndex) || "";
    var remainingMarkup = target.slice(currentIndex + (currentChar ? 1 : 0));
    var cursorState = typedEvaluation[currentIndex] === "absent" ? "incorrect" : typedEvaluation[currentIndex] === "present" ? "incorrect" : "";
    return [
      '<div class="typing-lane cg-typing-lane" aria-label="Typing lane">',
      '  <span class="typed">' + (typedMarkup ? runtimeRoot.CSGameComponents.escapeHtml(typedMarkup) : "&nbsp;") + '</span>',
      '  <span class="cursor' + (cursorState ? " is-" + cursorState : "") + '">' + runtimeRoot.CSGameComponents.escapeHtml(currentChar || " ") + '</span>',
      '  <span class="remaining">' + (remainingMarkup ? runtimeRoot.CSGameComponents.escapeHtml(remainingMarkup) : "&nbsp;") + "</span>",
      "</div>"
    ].join("");
  }

  function normalizeCategoryEntries(value) {
    var seen = Object.create(null);
    return String(value || "")
      .split(/[\n,]/)
      .map(function (item) { return item.trim(); })
      .filter(Boolean)
      .filter(function (item) {
        var key = item.toLowerCase();
        if (seen[key]) return false;
        seen[key] = true;
        return true;
      })
      .slice(0, 12);
  }

  function normalizeTypingInput(raw, target) {
    var source = String(raw || "").toUpperCase().replace(/[^A-Z;,'!.?\-\/ ]/g, "");
    var goal = String(target || "").toUpperCase();
    return source.slice(0, goal.length);
  }

  function lockTypingProgress(raw, target) {
    var source = normalizeTypingInput(raw, target);
    var goal = String(target || "").toUpperCase();
    var locked = "";
    for (var i = 0; i < source.length && i < goal.length; i += 1) {
      if (source.charAt(i) !== goal.charAt(i)) break;
      locked += source.charAt(i);
    }
    return locked;
  }

  function typingMeaningfulCharCount(value) {
    return String(value || "").replace(/\s+/g, "").length;
  }

  function typingEvaluation(target, typed) {
    var goal = splitTypingChars(target);
    var value = String(typed || "").toUpperCase();
    return goal.map(function (_ch, index) {
      return index < value.length ? "correct" : "";
    });
  }

  function typingLiveMetrics(uiState, round, typed) {
    var goalsWpm = Math.max(6, Number(round && round.masteryGoalWpm || 12));
    var goalsAccuracy = Math.max(85, Math.min(100, Number(round && round.masteryGoalAccuracy || 95)));
    var typedCount = typingMeaningfulCharCount(typed);
    var targetCount = Math.max(1, typingMeaningfulCharCount(round && round.target || ""));
    var mistakes = Math.max(0, Number(uiState && uiState.typingMistakes || 0));
    var startedAt = Number(uiState && uiState.typingRoundStartedAt || 0) || Date.now();
    var elapsedMinutes = Math.max(1 / 60, (Date.now() - startedAt) / 60000);
    var attempts = typedCount + mistakes;
    var wpm = typedCount ? Math.round((typedCount / 5) / elapsedMinutes) : 0;
    var accuracy = attempts ? Math.round((typedCount / attempts) * 100) : 100;
    var progress = Math.round((typedCount / targetCount) * 100);
    return {
      wpm: Math.max(0, wpm),
      accuracy: Math.max(0, Math.min(100, accuracy)),
      progress: Math.max(0, Math.min(100, progress)),
      typedCount: typedCount,
      targetCount: targetCount,
      mistakes: mistakes,
      goalWpm: goalsWpm,
      goalAccuracy: goalsAccuracy
    };
  }

  function typingMasteryStars(metrics, round, complete) {
    var row = metrics || {};
    var isComplete = complete || row.progress >= 100;
    var stars = 0;
    if (row.progress >= 25) stars += 1;
    if (isComplete) stars += 1;
    if (isComplete && row.accuracy >= Math.max(88, row.goalAccuracy - 3)) stars += 1;
    if (isComplete && row.accuracy >= row.goalAccuracy) stars += 1;
    if (isComplete && row.wpm >= row.goalWpm) stars += 1;
    return Math.max(0, Math.min(5, stars));
  }

  function typingReadyToAdvance(metrics, round, complete) {
    var row = metrics || {};
    var isComplete = complete || row.progress >= 100;
    return Boolean(isComplete && row.accuracy >= Number(row.goalAccuracy || round && round.masteryGoalAccuracy || 95) && row.wpm >= Number(row.goalWpm || round && round.masteryGoalWpm || 12));
  }

  function typingProgressKey(context) {
    var studentKey = String(context && context.studentId || "").trim() || "local";
    var gradeKey = String(context && context.gradeBand || "K-2").trim().replace(/[^A-Za-z0-9_-]/g, "_");
    return "cs.typingquest.progress.v1." + studentKey + "." + gradeKey;
  }

  function defaultTypingProgress() {
    return {
      placementCompleted: false,
      placementRecommendedLessonOrder: 1,
      currentLessonOrder: 1,
      currentLessonId: "",
      unlockedLessonOrder: 1,
      completedLessonIds: [],
      lessonResults: {}
    };
  }

  function loadTypingProgress(context) {
    var base = defaultTypingProgress();
    var raw = storageGet(typingProgressKey(context), "");
    if (!raw) return base;
    try {
      raw = JSON.parse(raw);
      return {
        placementCompleted: raw.placementCompleted === true,
        placementRecommendedLessonOrder: Math.max(1, Number(raw.placementRecommendedLessonOrder || 1)),
        currentLessonOrder: Math.max(1, Number(raw.currentLessonOrder || 1)),
        currentLessonId: String(raw.currentLessonId || ""),
        unlockedLessonOrder: Math.max(1, Number(raw.unlockedLessonOrder || 1)),
        completedLessonIds: Array.isArray(raw.completedLessonIds) ? raw.completedLessonIds.map(function (value) { return String(value || ""); }).filter(Boolean) : [],
        lessonResults: raw.lessonResults && typeof raw.lessonResults === "object" ? raw.lessonResults : {}
      };
    } catch (_e) {
      return base;
    }
  }

  function saveTypingProgress(context, progress) {
    storageSet(typingProgressKey(context), JSON.stringify(progress || defaultTypingProgress()));
  }

  function typingPlacementRecommendation(progress, placementRows, history) {
    var rows = Array.isArray(placementRows) ? placementRows : [];
    var outcomes = {};
    (Array.isArray(history) ? history : []).forEach(function (row) {
      outcomes[String(row && row.roundId || "")] = row && row.result === "correct";
    });
    var passed = rows.filter(function (row) {
      return outcomes[String(row && row.id || "")] === true;
    }).length;
    if (passed >= 4) return 13;
    if (passed === 3) return 10;
    if (passed === 2) return 8;
    if (passed === 1) return 4;
    return 1;
  }

  function renderTypingStars(stars) {
    var filled = Math.max(0, Math.min(5, Number(stars) || 0));
    return '<div class="cg-typing-stars" aria-label="' + filled + ' out of 5 stars">' + [0, 1, 2, 3, 4].map(function (index) {
      return '<span class="cg-typing-star' + (index < filled ? ' is-earned' : '') + '" aria-hidden="true">★</span>';
    }).join("") + "</div>";
  }

  var TYPING_UNIT_META = {
    "Unit 0": { title: "Home Row Foundations", subtitle: "Anchors, sweeps, and home-row control", phase: "Week 1" },
    "Unit 1": { title: "Home Row Words", subtitle: "Decodable home-row words before new reaches", phase: "Week 2" },
    "Unit 2": { title: "Top Row Reach", subtitle: "Small reaches into top-row words and phrases", phase: "Week 3" },
    "Unit 3": { title: "Bottom Row Reach", subtitle: "Bottom-row control, digraphs, and short phrases", phase: "Week 4" },
    "Unit 4": { title: "Connected Text", subtitle: "Longer phrases once the keyboard map is ready", phase: "Week 5" }
  };

  function typingCourseSummary(progress, rows) {
    var courseRows = Array.isArray(rows) ? rows : [];
    var results = progress && progress.lessonResults || {};
    var completed = Array.isArray(progress && progress.completedLessonIds) ? progress.completedLessonIds.length : 0;
    var totalLessons = Math.max(1, courseRows.length);
    var stars = Object.keys(results).reduce(function (sum, key) {
      return sum + Math.max(0, Math.min(5, Number(results[key] && results[key].stars || 0)));
    }, 0);
    return {
      progressPercent: Math.round((completed / totalLessons) * 100),
      completedLessons: completed,
      totalLessons: totalLessons,
      totalStars: stars,
      totalPoints: stars * 200
    };
  }

  function typingUnitMeta(unitLabel, rows) {
    var list = Array.isArray(rows) ? rows : [];
    var fallbackTitle = list[0] && list[0].stageLabel || String(unitLabel || "Typing Unit");
    var fallbackSubtitle = list[0] && (list[0].keyboardZone || list[0].orthographyFocus) || "Typing practice";
    var meta = TYPING_UNIT_META[String(unitLabel || "")] || {};
    return {
      title: meta.title || fallbackTitle,
      subtitle: meta.subtitle || fallbackSubtitle,
      phase: meta.phase || String(unitLabel || "Unit")
    };
  }

  function renderTypingTargetMarkup(round) {
    var target = String(round && round.target || "").toUpperCase();
    var heart = String(round && round.heartLetters || "").toUpperCase();
    if (!target) return "";
    if (heart && target.indexOf(heart) >= 0) {
      var idx = target.indexOf(heart);
      return '<span class="cg-typing-target-word">'
        + runtimeRoot.CSGameComponents.escapeHtml(target.slice(0, idx))
        + '<mark>' + runtimeRoot.CSGameComponents.escapeHtml(heart) + '</mark>'
        + runtimeRoot.CSGameComponents.escapeHtml(target.slice(idx + heart.length))
        + '</span>';
    }
    return '<span class="cg-typing-target-word">' + runtimeRoot.CSGameComponents.escapeHtml(target) + '</span>';
  }

  function typingLessonGlyph(row) {
    var stage = String(row && row.stageLabel || "").toLowerCase();
    var target = String(row && row.target || "").toUpperCase().replace(/\s+/g, " ").trim();
    if (row && String(row.unitLabel || "").toLowerCase() === "placement") return "▶";
    if (stage.indexOf("review") >= 0) return "⌕";
    if (stage.indexOf("practice") >= 0) return "◔";
    if (stage.indexOf("hand") >= 0) return "⌨";
    if (stage.indexOf("play") >= 0) return "★";
    if (row && row.heartLetters) return "♥";
    if (!target) return "KEY";
    if (row && row.typingKind === "phrase") return "Aa";
    if (row && row.typingKind === "keys") return target.replace(/\s+/g, "").slice(0, 2);
    return target.slice(0, 3);
  }

  function typingLessonBadge(row) {
    var stage = String(row && row.stageLabel || "").toLowerCase();
    if (!row) return "Lesson";
    if (String(row.unitLabel || "").toLowerCase() === "placement") return "Check";
    if (stage.indexOf("review") >= 0) return "Review";
    if (stage.indexOf("practice") >= 0) return "Practice";
    if (stage.indexOf("play") >= 0) return "Game";
    if (stage.indexOf("introduc") >= 0) return "Intro";
    if (row.heartLetters) return "Heart";
    if (row.typingKind === "phrase") return "Phrase";
    if (row.typingKind === "keys") return "Keys";
    return "Word";
  }

  function renderTypingProgressStrip(summary, options) {
    var stats = summary || { progressPercent: 0, totalStars: 0, totalPoints: 0 };
    var extras = options || {};
    return [
      '<div class="cg-typing-progress-strip">',
      '  <span><strong>' + Number(stats.progressPercent || 0) + '%</strong> progress</span>',
      '  <span><strong>' + Number(stats.totalStars || 0) + '</strong> stars</span>',
      '  <span><strong>' + Number(stats.totalPoints || 0) + '</strong> points</span>',
      (extras.label ? '  <span class="cg-typing-progress-strip__label">' + runtimeRoot.CSGameComponents.escapeHtml(extras.label) + '</span>' : ""),
      "</div>"
    ].join("");
  }

  function typingPromptTitle(round) {
    if (!round) return "Start typing.";
    if (round.courseMode === "placement") return "Take a quick check to find the right lesson start.";
    if (round.typingKind === "keys") return "Find the keys, then type the pattern without looking down.";
    if (round.typingKind === "phrase") return "Read the full phrase first, then type it in one smooth rhythm.";
    return "Look at the whole word, then type it with control and rhythm.";
  }

  var TYPING_GUIDE_ROWS = [
    ["q", "w", "e", "r", "t", "y", "u", "i", "o", "p"],
    ["a", "s", "d", "f", "g", "h", "j", "k", "l", ";"],
    ["z", "x", "c", "v", "b", "n", "m"],
    ["space"]
  ];

  var TYPING_FINGER_MAP = {
    q: "Left pinky",
    a: "Left pinky",
    z: "Left pinky",
    w: "Left ring",
    s: "Left ring",
    x: "Left ring",
    e: "Left middle",
    d: "Left middle",
    c: "Left middle",
    r: "Left index",
    f: "Left index",
    v: "Left index",
    t: "Left index",
    g: "Left index",
    b: "Left index",
    y: "Right index",
    h: "Right index",
    n: "Right index",
    u: "Right index",
    j: "Right index",
    m: "Right index",
    i: "Right middle",
    k: "Right middle",
    o: "Right ring",
    l: "Right ring",
    p: "Right pinky",
    ";": "Right pinky",
    " ": "Thumbs",
    space: "Thumbs"
  };

  function typingGuideKeys(target) {
    var seen = {};
    return splitTypingChars(target || "").map(function (key) {
      return key === " " ? "space" : key.toLowerCase();
    }).filter(function (key) {
      if (!key || seen[key]) return false;
      seen[key] = true;
      return true;
    });
  }

  function renderTypingKeyboardGuide(round) {
    var activeKeys = typingGuideKeys(round && round.target || "");
    var activeLookup = {};
    var fingerLookup = {};
    activeKeys.forEach(function (key) {
      activeLookup[key] = true;
      fingerLookup[TYPING_FINGER_MAP[key] || "Watch target"] = true;
    });
    var activeFingers = Object.keys(fingerLookup);
    return [
      '<div class="cg-typing-guide" aria-label="Keyboard and finger guide">',
      '  <div class="cg-typing-guide-head">',
      '    <div>',
      '      <p class="cg-micro-label">' + runtimeRoot.CSGameComponents.escapeHtml(round && round.courseMode === "placement" ? "Placement keyboard check" : (round && round.typingKind === "keys" ? "New key introduction" : "Keyboard guide")) + "</p>",
      '      <h4>' + runtimeRoot.CSGameComponents.escapeHtml(round && round.fingerCue || "Keep your eyes on the target and return to home row after each reach.") + '</h4>',
      "    </div>",
      '    <div class="cg-typing-hand-legend">' + activeFingers.map(function (label) {
        return '<span class="cg-typing-finger-chip">' + runtimeRoot.CSGameComponents.escapeHtml(label) + "</span>";
      }).join("") + "</div>",
      "  </div>",
      '  <div class="cg-typing-guide-keys">' + TYPING_GUIDE_ROWS.map(function (row) {
        var rowIndex = TYPING_GUIDE_ROWS.indexOf(row) + 1;
        return '<div class="cg-typing-guide-row cg-typing-guide-row--' + rowIndex + '">' + row.map(function (key) {
          var displayKey = key === "space" ? "Space" : key.toUpperCase();
          var fingerLabel = TYPING_FINGER_MAP[key] || "Typing key";
          var isActive = activeLookup[key];
          var isHome = key === "f" || key === "j";
          return '<span class="cg-typing-guide-key' + (isActive ? ' is-active' : '') + (isHome ? ' is-home' : '') + (key === "space" ? ' is-space' : '') + '" aria-label="' + runtimeRoot.CSGameComponents.escapeHtml(displayKey + " · " + fingerLabel) + '"><strong>' + runtimeRoot.CSGameComponents.escapeHtml(displayKey) + '</strong><small>' + runtimeRoot.CSGameComponents.escapeHtml(fingerLabel) + "</small></span>";
        }).join("") + "</div>";
      }).join("") + "</div>",
      "</div>"
    ].join("");
  }

  function paintTypingPreview(round, typed, uiState) {
    var target = round && round.target || "";
    var cells = document.querySelectorAll(".cg-typing-text-entry__char");
    var promptCells = document.querySelectorAll(".cg-typing-text-line .cg-typing-text-char");
    var metrics = typingLiveMetrics(uiState, round, typed);
    var stars = typingMasteryStars(metrics, round, false);
    Array.prototype.forEach.call(cells, function (cell, index) {
      var letter = String(typed || "").charAt(index) || "";
      var state = letter ? "correct" : "";
      cell.textContent = letter || (String(target || "").charAt(index) === " " ? " " : "");
      cell.setAttribute("data-state", state);
      if (state) cell.classList.add("is-revealed");
      else cell.classList.remove("is-revealed");
    });
    Array.prototype.forEach.call(promptCells, function (cell, index) {
      cell.classList.toggle("is-correct", index < String(typed || "").length);
      cell.classList.toggle("is-current", index === String(typed || "").length);
    });
    var progressFill = document.getElementById("cg-typing-progress-fill");
    if (progressFill) progressFill.style.width = metrics.progress + "%";
    var questRunner = document.getElementById("cg-typing-quest-runner");
    if (questRunner) questRunner.style.left = "calc(" + metrics.progress + "% - 16px)";
    var wpmNode = document.getElementById("cg-typing-live-wpm");
    if (wpmNode) wpmNode.textContent = String(metrics.wpm);
    var accuracyNode = document.getElementById("cg-typing-live-accuracy");
    if (accuracyNode) accuracyNode.textContent = String(metrics.accuracy) + "%";
    var goalNode = document.getElementById("cg-typing-live-goal");
    if (goalNode) goalNode.textContent = metrics.goalWpm + " WPM · " + metrics.goalAccuracy + "%";
    var progressNode = document.getElementById("cg-typing-live-progress");
    if (progressNode) progressNode.textContent = metrics.typedCount + " / " + metrics.targetCount;
    var mistakesNode = document.getElementById("cg-typing-live-errors");
    if (mistakesNode) mistakesNode.textContent = String(metrics.mistakes);
    var starsNode = document.getElementById("cg-typing-live-stars");
    if (starsNode) starsNode.innerHTML = renderTypingStars(stars);
  }

  function paintCategoryPreview(items) {
    var host = document.querySelector(".cg-rush-preview");
    if (!host) return;
    host.innerHTML = (items || []).map(function (item, index) {
      return '<span class="cg-rush-preview__item" style="animation-delay:' + (index * 40) + 'ms">' + runtimeRoot.CSGameComponents.escapeHtml(item) + "</span>";
    }).join("");
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
    var typingProgress = loadTypingProgress(context);
    var typingCourseRows = runtimeRoot.CSGameContentRegistry && typeof runtimeRoot.CSGameContentRegistry.getTypingCourseRows === "function"
      ? runtimeRoot.CSGameContentRegistry.getTypingCourseRows(context)
      : [];
    var typingPlacementRows = runtimeRoot.CSGameContentRegistry && typeof runtimeRoot.CSGameContentRegistry.getTypingPlacementRows === "function"
      ? runtimeRoot.CSGameContentRegistry.getTypingPlacementRows(context)
      : [];

    function typingLessonByOrder(order) {
      var rows = typingCourseRows || [];
      var desired = Math.max(1, Number(order || 1));
      var exact = rows.filter(function (row) {
        return Number(row && row.lessonOrder || 0) === desired;
      })[0];
      if (exact) return exact;
      if (!rows.length) return null;
      return rows[Math.max(0, Math.min(rows.length - 1, desired - 1))] || rows[rows.length - 1] || null;
    }

    function typingLessonById(id) {
      var key = String(id || "").trim();
      if (!key) return null;
      return (typingCourseRows || []).filter(function (row) {
        return String(row && row.id || "") === key;
      })[0] || null;
    }

    function typingQuestHref(options) {
      var next = options || {};
      var url = new URL(withAppBase("typing-quest.html"));
      url.searchParams.set("play", "1");
      url.searchParams.set("game", "word-typing");
      url.searchParams.set("typingPage", "1");
      if (params.studentId) url.searchParams.set("student", params.studentId);
      if (params.classId) url.searchParams.set("classId", params.classId);
      if (params.lessonContextId) url.searchParams.set("lessonContextId", params.lessonContextId);
      if (context.subject) url.searchParams.set("subject", context.subject);
      if (context.gradeBand) url.searchParams.set("gradeBand", context.gradeBand);
      if (context.contentMode) url.searchParams.set("contentMode", context.contentMode);
      url.searchParams.set("typingCourseMode", String(next.typingCourseMode || "lesson"));
      if (next.lessonId) url.searchParams.set("lessonId", String(next.lessonId));
      if (next.lessonOrder) url.searchParams.set("lessonOrder", String(next.lessonOrder));
      return url.toString();
    }

    function refreshTypingCourseContext() {
      if (String(context.contentMode || "lesson").toLowerCase() !== "lesson") {
        context.typingCourseMode = "lesson";
        context.typingPlacementRequired = false;
        context.currentTypingLessonId = "";
        context.currentTypingLessonOrder = 0;
        context.typingUnlockedOrder = 999;
        context.typingCompletedLessons = [];
        return;
      }
      var recommendedOrder = Math.max(1, Number(typingProgress.placementRecommendedLessonOrder || 1));
      var currentOrder = Math.max(recommendedOrder, Number(typingProgress.currentLessonOrder || recommendedOrder));
      var lesson = typingProgress.currentLessonId
        ? typingCourseRows.filter(function (row) { return String(row && row.id || "") === String(typingProgress.currentLessonId || ""); })[0]
        : typingLessonByOrder(currentOrder);
      if (!lesson) lesson = typingLessonByOrder(recommendedOrder);
      context.typingCourseMode = typingProgress.placementCompleted ? "lesson" : "placement";
      context.typingPlacementRequired = !typingProgress.placementCompleted;
      context.currentTypingLessonId = lesson ? lesson.id : "";
      context.currentTypingLessonOrder = lesson ? Number(lesson.lessonOrder || 1) : 1;
      context.typingUnlockedOrder = typingProgress.placementCompleted ? Math.max(recommendedOrder, Number(typingProgress.unlockedLessonOrder || context.currentTypingLessonOrder || 1)) : 1;
      context.typingCompletedLessons = Array.isArray(typingProgress.completedLessonIds) ? typingProgress.completedLessonIds.slice() : [];
      context.typingPlacementRecommendedLessonOrder = recommendedOrder;
      context.typingPlacementRows = typingPlacementRows.slice();

      if (params.typingPage && recommendedGame === "word-typing") {
        var requestedMode = String(params.typingCourseMode || (params.typingLessonId || params.typingLessonOrder ? "lesson" : "") || "").toLowerCase();
        if (requestedMode === "placement") {
          context.typingCourseMode = "placement";
          context.typingPlacementRequired = true;
          context.currentTypingLessonId = "";
          context.currentTypingLessonOrder = 1;
          context.typingUnlockedOrder = 1;
        } else if (requestedMode === "lesson") {
          var requestedLesson = typingLessonById(params.typingLessonId) || typingLessonByOrder(params.typingLessonOrder || context.currentTypingLessonOrder || 1);
          if (requestedLesson) {
            context.typingCourseMode = "lesson";
            context.typingPlacementRequired = false;
            context.currentTypingLessonId = requestedLesson.id;
            context.currentTypingLessonOrder = Number(requestedLesson.lessonOrder || 1);
            context.typingUnlockedOrder = Math.max(Number(context.typingUnlockedOrder || 1), Number(requestedLesson.lessonOrder || 1));
          }
        }
      }
    }

    refreshTypingCourseContext();
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
    var GALLERY_PLAN_KEY = "cs.gallery.plan.v1";
    var GALLERY_POMODORO_KEY = "cs.gallery.pomodoro.v1";
    var GALLERY_POMODORO_UI_KEY = "cs.gallery.pomodoro.ui.v1";
    var pomodoroInterval = 0;
    var pomodoroPopout = null;
    var galleryPlan = (function loadGalleryPlan() {
      var raw = storageGet(GALLERY_PLAN_KEY, "");
      if (!raw) {
        return {
          classLabel: context.classLabel || "",
          sessionDate: "",
          agenda: ""
        };
      }
      try {
        raw = JSON.parse(raw);
        return {
          classLabel: String(raw.classLabel || context.classLabel || "").trim(),
          sessionDate: String(raw.sessionDate || "").trim(),
          agenda: String(raw.agenda || "").trim()
        };
      } catch (_e) {
        return {
          classLabel: context.classLabel || "",
          sessionDate: "",
          agenda: ""
        };
      }
    })();
    var galleryPomodoro = (function loadGalleryPomodoro() {
      var raw = storageGet(GALLERY_POMODORO_KEY, "");
      if (!raw) {
        return {
          durationMinutes: 25,
          remainingSeconds: 25 * 60,
          running: false,
          endsAt: 0
        };
      }
      try {
        raw = JSON.parse(raw);
        var duration = Math.max(5, Math.min(60, Number(raw.durationMinutes) || 25));
        return {
          durationMinutes: duration,
          remainingSeconds: Math.max(0, Number(raw.remainingSeconds) || duration * 60),
          running: Boolean(raw.running),
          endsAt: Number(raw.endsAt) || 0
        };
      } catch (_e) {
        return {
          durationMinutes: 25,
          remainingSeconds: 25 * 60,
          running: false,
          endsAt: 0
        };
      }
    })();
    var galleryPomodoroUi = (function loadGalleryPomodoroUi() {
      var raw = storageGet(GALLERY_POMODORO_UI_KEY, "");
      if (!raw) {
        return {
          open: false,
          minimized: false,
          mode: "timer",
          x: null,
          y: null
        };
      }
      try {
        raw = JSON.parse(raw);
        return {
          open: raw.open === true,
          minimized: raw.minimized === true,
          mode: raw.mode === "clock" ? "clock" : "timer",
          x: Number.isFinite(Number(raw.x)) ? Number(raw.x) : null,
          y: Number.isFinite(Number(raw.y)) ? Number(raw.y) : null
        };
      } catch (_e) {
        return {
          open: false,
          minimized: false,
          mode: "timer",
          x: null,
          y: null
        };
      }
    })();
    var uiState = {
      teacherPanelOpen: false,
      selectedChoice: "",
      builderSelection: [],
      revealedClues: 1,
      supportRevealOpen: false,
      detectiveSelection: "",
      typingLockedValue: "",
      typingErrorUntil: 0,
      typingRoundId: "",
      typingStartedRoundId: "",
      typingRoundStartedAt: 0,
      typingAcceptedChars: 0,
      typingMistakes: 0,
      categoryPreview: [],
      previous: { score: 0, streak: 0, rounds: 0 },
      bumpUntil: { score: 0, streak: 0, rounds: 0 },
      lastLoggedSummaryKey: "",
      lastSubmittedGuess: "",
      lastTypingPersistKey: ""
    };

    if (!shell) return;

    function persistGalleryPlan() {
      storageSet(GALLERY_PLAN_KEY, JSON.stringify(galleryPlan));
    }

    function persistGalleryPomodoro() {
      storageSet(GALLERY_POMODORO_KEY, JSON.stringify(galleryPomodoro));
    }

    function persistGalleryPomodoroUi() {
      storageSet(GALLERY_POMODORO_UI_KEY, JSON.stringify(galleryPomodoroUi));
    }

    function stopPomodoroInterval() {
      if (pomodoroInterval) {
        runtimeRoot.clearInterval(pomodoroInterval);
        pomodoroInterval = 0;
      }
    }

    function formatPomodoroClock(totalSeconds) {
      var safe = Math.max(0, Number(totalSeconds) || 0);
      var minutes = Math.floor(safe / 60);
      var seconds = Math.floor(safe % 60);
      return String(minutes).padStart(2, "0") + ":" + String(seconds).padStart(2, "0");
    }

    function formatWallClock(date) {
      var hours = date.getHours();
      var minutes = date.getMinutes();
      var suffix = hours >= 12 ? "PM" : "AM";
      hours = hours % 12;
      if (!hours) hours = 12;
      return hours + ":" + String(minutes).padStart(2, "0") + " " + suffix;
    }

    function syncPomodoroClock() {
      if (galleryPomodoro.running) {
        galleryPomodoro.remainingSeconds = Math.max(0, Math.ceil((galleryPomodoro.endsAt - Date.now()) / 1000));
        if (galleryPomodoro.remainingSeconds <= 0) {
          galleryPomodoro.running = false;
          galleryPomodoro.endsAt = 0;
        }
        persistGalleryPomodoro();
      }
      renderPomodoroPopout();
      if (galleryOnly && (galleryPomodoro.running || galleryPomodoroUi.mode === "clock")) render();
      if (!galleryPomodoro.running && galleryPomodoroUi.mode !== "clock" && (!pomodoroPopout || pomodoroPopout.closed)) {
        stopPomodoroInterval();
      }
    }

    function ensurePomodoroTicking() {
      stopPomodoroInterval();
      if (!galleryPomodoro.running && galleryPomodoroUi.mode !== "clock" && (!pomodoroPopout || pomodoroPopout.closed)) return;
      pomodoroInterval = runtimeRoot.setInterval(syncPomodoroClock, 1000);
    }

    function pomodoroVisualModel() {
      var ringCircumference = 276;
      if (galleryPomodoroUi.mode === "clock") {
        var now = new Date();
        var seconds = now.getSeconds();
        var clockProgress = Math.max(0.04, seconds / 60);
        return {
          title: "Clock",
          value: formatWallClock(now),
          sublabel: "Live classroom clock",
          offset: Math.round(ringCircumference * (1 - clockProgress)),
          dasharray: ringCircumference,
          tone: "clock"
        };
      }
      var durationSeconds = Math.max(1, galleryPomodoro.durationMinutes * 60);
      var timerProgress = Math.max(0.04, Math.min(1, galleryPomodoro.remainingSeconds / durationSeconds));
      return {
        title: "Timer",
        value: formatPomodoroClock(galleryPomodoro.remainingSeconds),
        sublabel: galleryPomodoro.running ? "Pomodoro in progress" : "Ready to start",
        offset: Math.round(ringCircumference * (1 - timerProgress)),
        dasharray: ringCircumference,
        tone: galleryPomodoro.running ? "timer-running" : "timer"
      };
    }

    function renderPomodoroLauncher() {
      return [
        '<button class="cg-pomo-tab" type="button" data-pomo-ui="toggle" aria-expanded="' + (galleryPomodoroUi.open ? "true" : "false") + '">',
        '  <span class="cg-pomo-tab-label">Class Timer</span>',
        '  <span class="cg-pomo-tab-value">' + (galleryPomodoroUi.mode === "clock" ? formatWallClock(new Date()) : formatPomodoroClock(galleryPomodoro.remainingSeconds)) + '</span>',
        '</button>'
      ].join("");
    }

    function renderPomodoroWidget() {
      var escapeHtml = runtimeRoot.CSGameComponents.escapeHtml;
      var options = [15, 25, 40].map(function (minutes) {
        return '<button class="cg-pomo-chip' + (galleryPomodoro.durationMinutes === minutes ? ' is-active' : '') + '" type="button" data-pomo-duration="' + minutes + '">' + minutes + ' min</button>';
      }).join("");
      var visual = pomodoroVisualModel();
      if (!galleryPomodoroUi.open) return "";
      var style = [];
      var widgetWidth = Math.min(360, Math.max(280, (runtimeRoot.innerWidth || 1280) - 32));
      var widgetHeight = galleryPomodoroUi.minimized ? 84 : 520;
      var safeLeft = Number.isFinite(galleryPomodoroUi.x)
        ? Math.max(12, Math.min((runtimeRoot.innerWidth || 1280) - widgetWidth - 12, galleryPomodoroUi.x))
        : null;
      var safeTop = Number.isFinite(galleryPomodoroUi.y)
        ? Math.max(92, Math.min((runtimeRoot.innerHeight || 900) - widgetHeight - 12, galleryPomodoroUi.y))
        : null;
      if (Number.isFinite(safeLeft)) style.push("left:" + Math.round(safeLeft) + "px");
      if (Number.isFinite(safeTop)) style.push("top:" + Math.round(safeTop) + "px");
      return [
        '<section class="cg-pomo-widget' + (galleryPomodoroUi.minimized ? ' is-minimized' : '') + '" aria-label="Class plan and Pomodoro timer" style="' + style.join(";") + '">',
        '  <div class="cg-pomo-widget-head" data-pomo-drag-handle="true">',
        '    <div>',
        '      <p class="cg-kicker">Classroom Planner</p>',
        '      <h2>Agenda + Pomodoro</h2>',
        '    </div>',
        '    <div class="cg-pomo-widget-controls">',
        '      <button class="cg-pomo-icon-btn" type="button" data-pomo-ui="mode">' + (galleryPomodoroUi.mode === "clock" ? 'Timer' : 'Clock') + '</button>',
        '      <button class="cg-pomo-icon-btn" type="button" data-pomo-ui="popout">Pop Out</button>',
        '      <button class="cg-pomo-icon-btn" type="button" data-pomo-ui="minimize">' + (galleryPomodoroUi.minimized ? 'Expand' : 'Minimize') + '</button>',
        '    </div>',
        '  </div>',
        '  <div class="cg-pomo-widget-body">',
        '    <div class="cg-pomo-ring-panel" data-tone="' + visual.tone + '">',
        '      <svg class="cg-pomo-ring" viewBox="0 0 120 120" aria-hidden="true">',
        '        <circle class="cg-pomo-ring-track" cx="60" cy="60" r="44"></circle>',
        '        <circle class="cg-pomo-ring-progress" cx="60" cy="60" r="44" stroke-dasharray="' + visual.dasharray + '" stroke-dashoffset="' + visual.offset + '"></circle>',
        '      </svg>',
        '      <div class="cg-pomo-ring-copy">',
        '        <span class="cg-pomo-mode-label">' + visual.title + '</span>',
        '        <span class="cg-pomo-time">' + visual.value + '</span>',
        '        <span class="cg-pomo-subcopy">' + visual.sublabel + '</span>',
        '      </div>',
        '    </div>',
        '    <div class="cg-pomo-panel" data-running="' + (galleryPomodoro.running ? 'true' : 'false') + '">',
        '      <div class="cg-pomo-actions">',
        '        <button class="cg-action cg-action-primary cg-action-compact" type="button" data-pomo-action="' + (galleryPomodoro.running ? 'pause' : 'start') + '">' + (galleryPomodoro.running ? 'Pause' : 'Start') + '</button>',
        '        <button class="cg-action cg-action-quiet cg-action-compact" type="button" data-pomo-action="reset">Reset</button>',
        '      </div>',
        '      <div class="cg-pomo-presets">' + options + '</div>',
        '      <div class="cg-gallery-plan-grid">',
        '    <label class="cg-setup-label cg-plan-field">Class / Block<input id="cg-plan-class" class="cg-input cg-plan-input" type="text" maxlength="80" value="' + escapeHtml(galleryPlan.classLabel || "") + '" placeholder="Grade 3 Reading Block"></label>',
        '    <label class="cg-setup-label cg-plan-field">Day / Date<input id="cg-plan-date" class="cg-input cg-plan-input" type="text" maxlength="60" value="' + escapeHtml(galleryPlan.sessionDate || "") + '" placeholder="Monday · March 8"></label>',
        '    <label class="cg-setup-label cg-plan-field cg-plan-field-wide">Agenda<textarea id="cg-plan-agenda" class="cg-input cg-plan-textarea" rows="4" placeholder="Warm-up&#10;Mini-lesson&#10;Word Quest rotation&#10;Exit ticket">' + escapeHtml(galleryPlan.agenda || "") + '</textarea></label>',
        '      </div>',
        '  </div>',
        ' </div>',
        '</section>'
      ].join("");
    }

    function renderPomodoroPopout() {
      if (!pomodoroPopout || pomodoroPopout.closed) return;
      var visual = pomodoroVisualModel();
      pomodoroPopout.document.title = "Class Timer";
      pomodoroPopout.document.body.innerHTML = [
        '<style>',
        'body{margin:0;font-family:ui-rounded,system-ui,sans-serif;background:#0f2745;color:#f8fafc;display:grid;place-items:center;min-height:100vh;}',
        '.wrap{width:min(92vw,320px);padding:18px;border-radius:24px;background:linear-gradient(180deg,rgba(18,48,79,.96),rgba(8,23,41,.96));box-shadow:0 18px 40px rgba(2,6,23,.45);text-align:center;}',
        '.ring{position:relative;width:188px;height:188px;margin:0 auto 14px;}',
        'svg{width:100%;height:100%;transform:rotate(-90deg)}',
        '.track{fill:none;stroke:rgba(255,255,255,.12);stroke-width:10}',
        '.prog{fill:none;stroke:#7ccf2e;stroke-width:10;stroke-linecap:round}',
        '.copy{position:absolute;inset:0;display:grid;place-items:center;text-align:center;padding:24px;}',
        '.mode{font-size:12px;font-weight:800;letter-spacing:.14em;text-transform:uppercase;color:rgba(226,232,240,.72)}',
        '.time{font-size:32px;font-weight:900;color:#fff}',
        '.sub{font-size:12px;color:rgba(226,232,240,.8)}',
        '</style>',
        '<div class="wrap"><div class="ring"><svg viewBox="0 0 120 120"><circle class="track" cx="60" cy="60" r="44"></circle><circle class="prog" cx="60" cy="60" r="44" stroke-dasharray="' + visual.dasharray + '" stroke-dashoffset="' + visual.offset + '"></circle></svg><div class="copy"><div><div class="mode">' + visual.title + '</div><div class="time">' + visual.value + '</div><div class="sub">' + visual.sublabel + '</div></div></div></div></div>'
      ].join("");
    }

    var engine = runtimeRoot.CSGameEngine.create({
      games: games,
      initialGameId: recommendedGame,
      context: context,
      sound: sound,
      settings: {
        viewMode: "individual",
        difficulty: "core",
        wordConnectionsDifficulty: 3,
        wordConnectionsMode: "speak",
        contentMode: context.contentMode || "lesson",
        timerEnabled: recommendedGame === "word-typing" ? false : !(recommendedGame === "word-typing" && context.typingPlacementRequired),
        hintsEnabled: true,
        soundEnabled: false,
        customWordSet: "",
        lessonLock: true
      }
    });

    function setTypingCurrentLessonByOrder(order) {
      var nextLesson = typingLessonByOrder(order);
      if (!nextLesson) return null;
      typingProgress.currentLessonOrder = Number(nextLesson.lessonOrder || order || 1);
      typingProgress.currentLessonId = nextLesson.id;
      saveTypingProgress(context, typingProgress);
      refreshTypingCourseContext();
      return nextLesson;
    }

    function persistTypingContextToEngine() {
      engine.updateContext({
        contentMode: context.contentMode,
        typingCourseMode: context.typingCourseMode,
        typingPlacementRequired: context.typingPlacementRequired,
        currentTypingLessonId: context.currentTypingLessonId,
        currentTypingLessonOrder: context.currentTypingLessonOrder,
        typingUnlockedOrder: context.typingUnlockedOrder,
        typingCompletedLessons: context.typingCompletedLessons.slice(),
        typingPlacementRecommendedLessonOrder: context.typingPlacementRecommendedLessonOrder
      });
    }

    function startTypingRound() {
      var state = engine.getState();
      if (state.selectedGameId !== "word-typing" || !state.round) return;
      uiState.typingStartedRoundId = state.round.id;
      if (!uiState.typingRoundStartedAt) uiState.typingRoundStartedAt = 0;
      render();
      runtimeRoot.requestAnimationFrame(function () {
        var input = document.getElementById("cg-word-typing-input");
        if (input && typeof input.focus === "function") input.focus();
      });
    }

    function restartTypingLesson(order) {
      if (typeof order === "number") setTypingCurrentLessonByOrder(order);
      refreshTypingCourseContext();
      persistTypingContextToEngine();
      resetRoundUi();
      engine.updateSettings({ timerEnabled: false });
      engine.restartGame();
    }

    function syncTypingProgressFromState(state) {
      if (state.selectedGameId !== "word-typing" || !state.round || !state.lastOutcome || state.status !== "round-summary") return;
      var lessonKey = [
        state.round.id,
        state.status,
        state.lastOutcome.correct,
        state.lastOutcome.stats && state.lastOutcome.stats.wpm || 0,
        state.lastOutcome.stats && state.lastOutcome.stats.accuracy || 0
      ].join(":");
      if (uiState.lastTypingPersistKey === lessonKey) return;
      uiState.lastTypingPersistKey = lessonKey;

      if (state.round.courseMode === "placement") {
        var recommendedOrder = typingPlacementRecommendation(typingProgress, typingPlacementRows, state.history);
        typingProgress.placementCompleted = true;
        typingProgress.placementRecommendedLessonOrder = recommendedOrder;
        typingProgress.unlockedLessonOrder = Math.max(typingProgress.unlockedLessonOrder || 1, recommendedOrder);
        setTypingCurrentLessonByOrder(recommendedOrder);
        saveTypingProgress(context, typingProgress);
        refreshTypingCourseContext();
        persistTypingContextToEngine();
        return;
      }

      var complete = !!(state.lastOutcome && state.lastOutcome.correct);
      var stats = Object.assign({}, typingLiveMetrics(uiState, state.round, state.round.target || ""), state.lastOutcome.stats || {});
      var stars = typingMasteryStars(stats, state.round, complete);
      var ready = typingReadyToAdvance(stats, state.round, complete);
      typingProgress.lessonResults[state.round.id] = {
        stars: Math.max(stars, Number(typingProgress.lessonResults[state.round.id] && typingProgress.lessonResults[state.round.id].stars || 0)),
        wpm: Math.max(Number(stats.wpm || 0), Number(typingProgress.lessonResults[state.round.id] && typingProgress.lessonResults[state.round.id].wpm || 0)),
        accuracy: Math.max(Number(stats.accuracy || 0), Number(typingProgress.lessonResults[state.round.id] && typingProgress.lessonResults[state.round.id].accuracy || 0)),
        complete: ready
      };
      if (ready) {
        if (typingProgress.completedLessonIds.indexOf(state.round.id) < 0) typingProgress.completedLessonIds.push(state.round.id);
        typingProgress.unlockedLessonOrder = Math.max(Number(typingProgress.unlockedLessonOrder || 1), Number(state.round.lessonOrder || 1) + 1);
        setTypingCurrentLessonByOrder(Number(state.round.lessonOrder || 1) + 1);
      } else {
        setTypingCurrentLessonByOrder(Number(state.round.lessonOrder || 1));
      }
      saveTypingProgress(context, typingProgress);
      refreshTypingCourseContext();
      persistTypingContextToEngine();
    }

    function resetRoundUi() {
      uiState.selectedChoice = "";
      uiState.builderSelection = [];
      uiState.revealedClues = 1;
      uiState.supportRevealOpen = false;
      uiState.detectiveSelection = "";
      uiState.typingLockedValue = "";
      uiState.typingErrorUntil = 0;
      uiState.typingRoundId = "";
      uiState.typingStartedRoundId = "";
      uiState.typingRoundStartedAt = 0;
      uiState.typingAcceptedChars = 0;
      uiState.typingMistakes = 0;
      uiState.categoryPreview = [];
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
          renderPomodoroLauncher(),
          renderPomodoroWidget(),
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

      var typingHubMode = currentGame.id === "word-typing" && !params.typingPage;
      var typingRuntimeMode = currentGame.id === "word-typing" && params.typingPage;
      var teacherPanelMarkup = [
        '<section class="cg-main-card cg-surface' + (uiState.teacherPanelOpen ? "" : " cg-hidden") + '" id="cg-teacher-panel">',
        '  <p class="cg-kicker">Teacher Control Panel</p>',
        '  <div class="cg-control-grid">',
        '    <div class="cg-field"><label for="cg-view-mode">Mode</label><select id="cg-view-mode" class="cg-select"><option value="individual">Individual</option><option value="smallGroup">Small Group</option><option value="classroom">Classroom</option><option value="projector">Projector</option></select></div>',
        '    <div class="cg-field"><label for="cg-difficulty">Difficulty</label><select id="cg-difficulty" class="cg-select"><option value="scaffolded">Scaffolded</option><option value="core">Core</option><option value="stretch">Stretch</option></select></div>',
        '    <div class="cg-field"><label for="cg-subject">Subject</label><select id="cg-subject" class="cg-select"><option value="ELA">ELA</option><option value="Intervention">Intervention</option><option value="Writing">Writing</option><option value="Math">Math</option><option value="Science">Science</option></select></div>',
        '    <div class="cg-field"><label for="cg-grade-band">Grade Band</label><select id="cg-grade-band" class="cg-select"><option value="K-2">K-2</option><option value="3-5">3-5</option><option value="6-8">6-8</option><option value="9-12">9-12</option></select></div>',
        '    <div class="cg-field"><label for="cg-content-mode">Content Set</label><select id="cg-content-mode" class="cg-select"><option value="lesson">Lesson-aligned</option><option value="subject">Broader subject bank</option><option value="morphology">Morphology family</option><option value="custom">Custom word lock</option></select></div>',
        '    <div class="cg-field"><label for="cg-skill-focus">Skill Focus</label><input id="cg-skill-focus" class="cg-input" type="text" value="' + runtimeRoot.CSGameComponents.escapeHtml(context.skillFocus || "") + '" placeholder="LIT.MOR.ROOT"></div>',
        '    <div class="cg-field"><label for="cg-custom-word-set">Custom Word Set / Lesson Lock</label><input id="cg-custom-word-set" class="cg-input" type="text" value="' + runtimeRoot.CSGameComponents.escapeHtml(state.settings.customWordSet || "") + '" placeholder="prefix, claim, ratio"></div>',
        '    <label class="cg-checkbox"><input id="cg-toggle-timer" type="checkbox"' + (state.settings.timerEnabled ? " checked" : "") + '>Timer enabled</label>',
        '    <label class="cg-checkbox"><input id="cg-toggle-hints" type="checkbox"' + (state.settings.hintsEnabled ? " checked" : "") + '>Hints enabled</label>',
        '    <label class="cg-checkbox"><input id="cg-toggle-sound" type="checkbox"' + (state.settings.soundEnabled ? " checked" : "") + '>Optional sound layer</label>',
        '    <button class="cg-action cg-action-quiet" type="button" data-action="teacher-override">' + runtimeRoot.CSGameComponents.iconFor("teacher") + 'Teacher Override</button>',
        "  </div>",
        "</section>"
      ].join("");
      var stageKicker = typingHubMode ? "Course Hub" : (typingRuntimeMode ? "Typing Lesson" : "Now Playing");
      var stageTitle = currentGame.title;
      var stageSubtitle = typingHubMode
        ? "Typing Quest Foundations"
        : (typingRuntimeMode
          ? ((state.round && state.round.lessonLabel || "Lesson") + " · " + (state.round && state.round.stageLabel || "Typing practice"))
          : (state.round && state.round.promptLabel || currentGame.subtitle));
      var toolbarHomeHref = typingRuntimeMode
        ? withAppBase("game-platform.html?play=1&game=word-typing")
        : withAppBase("game-platform.html");
      var toolbarParts = [
        '<a class="cg-action cg-action-quiet" href="' + runtimeRoot.CSGameComponents.escapeHtml(toolbarHomeHref) + '">' + runtimeRoot.CSGameComponents.iconFor("context") + (typingRuntimeMode ? 'Course Hub' : 'All Games') + '</a>',
        '<button class="cg-action cg-action-quiet" type="button" data-action="toggle-teacher">' + runtimeRoot.CSGameComponents.iconFor("teacher") + (uiState.teacherPanelOpen ? "Hide Controls" : "Teacher Controls") + "</button>"
      ];
      if (!typingHubMode) {
        toolbarParts.push('<button class="cg-action cg-action-quiet" type="button" data-action="hint">' + runtimeRoot.CSGameComponents.iconFor("hint") + "Hint</button>");
      }
      if (!typingHubMode || typingRuntimeMode) {
        toolbarParts.push('<button class="cg-action cg-action-primary" type="button" data-action="restart">' + runtimeRoot.CSGameComponents.iconFor("progress") + (typingRuntimeMode ? "Restart Lesson" : "Restart") + "</button>");
      }

      if (typingHubMode || typingRuntimeMode) {
        var typingSummary = typingCourseSummary(typingProgress, typingCourseRows);
        var typingHeaderSubtitle = typingRuntimeMode
          ? ((state.round && state.round.unitLabel || "Typing Quest Foundations") + " · " + (state.round && state.round.keyboardZone || "Keyboarding"))
          : "Typing Quest Foundations";
        var typingNavParts = [
          '<a class="cg-typing-appbar__brand" href="' + runtimeRoot.CSGameComponents.escapeHtml(withAppBase("game-platform.html?play=1&game=word-typing")) + '">Typing Quest</a>',
          '<nav class="cg-typing-appbar__nav">',
          '  <a class="cg-typing-appbar__link' + (typingHubMode ? ' is-active' : '') + '" href="' + runtimeRoot.CSGameComponents.escapeHtml(withAppBase("game-platform.html?play=1&game=word-typing")) + '">Course</a>',
          (typingRuntimeMode ? '  <a class="cg-typing-appbar__link is-active" href="' + runtimeRoot.CSGameComponents.escapeHtml(typingQuestHref({ typingCourseMode: state.round && state.round.courseMode || "lesson", lessonId: state.round && state.round.id || "", lessonOrder: state.round && state.round.lessonOrder || 1 })) + '">Lesson</a>' : ""),
          '  <button class="cg-typing-appbar__link" type="button" data-action="toggle-teacher">' + (uiState.teacherPanelOpen ? "Hide Controls" : "Teacher Controls") + '</button>',
          (typingRuntimeMode ? '  <button class="cg-typing-appbar__link" type="button" data-action="hint">Hint</button>' : ""),
          (typingRuntimeMode ? '  <button class="cg-typing-appbar__link" type="button" data-action="restart">Restart</button>' : ""),
          "</nav>"
        ].join("");
        shell.innerHTML = [
          '<div class="cg-typing-app-shell' + (typingRuntimeMode ? " is-runtime" : " is-hub") + '">',
          '  <header class="cg-typing-appbar">',
          '    <div class="cg-typing-appbar__left">' + typingNavParts + '</div>',
          '    <div class="cg-typing-appbar__right">',
          '      <a class="cg-typing-appbar__link" href="' + runtimeRoot.CSGameComponents.escapeHtml(typingRuntimeMode ? withAppBase("game-platform.html?play=1&game=word-typing") : withAppBase("game-platform.html")) + '">' + (typingRuntimeMode ? "Course Hub" : "All Games") + '</a>',
          '    </div>',
          "  </header>",
          '  <div class="cg-typing-page-wrap">',
          renderTypingProgressStrip(typingSummary, { label: typingHeaderSubtitle }),
          '    <section class="cg-typing-page-shell">',
          '      <div id="cg-stage-board" class="cg-stage-board cg-stage-board--typing"></div>',
          "    </section>",
          teacherPanelMarkup,
          "  </div>",
          "</div>"
        ].join("");

        var typingStageBoard = document.getElementById("cg-stage-board");
        if (typingStageBoard && state.round) typingStageBoard.innerHTML = renderRoundBoard(state, currentGame);
        bindInteractions();
        hydrateControls(state);
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
        '  <div class="cg-toolbar">' + toolbarParts.join("") + '</div>',
        "</div>",
        '<div class="cg-play-shell">',
        '  <section class="cg-main-card cg-surface cg-stage-shell cg-stage-shell--focused">',
        '    <div class="cg-stage-meta">',
        '      <div class="cg-stage-head">',
        "        <div>",
        '          <p class="cg-kicker">' + runtimeRoot.CSGameComponents.escapeHtml(stageKicker) + '</p>',
        '          <h2 class="cg-display">' + runtimeRoot.CSGameComponents.escapeHtml(stageTitle) + '</h2>',
        '          <p>' + runtimeRoot.CSGameComponents.escapeHtml(stageSubtitle) + '</p>',
        "        </div>",
        '        <div class="cg-stage-toolbar">',
        '          <span class="cg-chip">' + runtimeRoot.CSGameComponents.iconFor("projector") + runtimeRoot.CSGameComponents.escapeHtml((runtimeRoot.CSGameModes.VIEW_MODES[state.settings.viewMode] || {}).label || "Individual") + '</span>',
        '          <span class="cg-chip">' + runtimeRoot.CSGameComponents.iconFor("progress") + runtimeRoot.CSGameComponents.escapeHtml((runtimeRoot.CSGameModes.DIFFICULTY[state.settings.difficulty] || {}).label || "Core") + '</span>',
        (typingHubMode ? '          <span class="cg-chip" data-tone="focus">' + runtimeRoot.CSGameComponents.iconFor("context") + 'Lesson plans</span>' : '          <span class="cg-chip" data-tone="' + (state.settings.timerEnabled ? "positive" : "warning") + '">' + runtimeRoot.CSGameComponents.iconFor("timer") + (state.settings.timerEnabled ? "Timed" : "Untimed") + '</span>'),
        (state.streak >= 2 ? '          <span class="cg-chip cg-chip-streak" data-tone="positive">' + runtimeRoot.CSGameComponents.iconFor("progress") + state.streak + '\u2009streak</span>' : ""),
        "        </div>",
        "      </div>",
        '      <div class="cg-context-chips">',
        '        <span class="cg-chip" data-tone="focus">' + runtimeRoot.CSGameComponents.iconFor("context") + runtimeRoot.CSGameComponents.escapeHtml(supportLine(context, state)) + '</span>',
        (projectorSuggested ? '<span class="cg-chip">' + runtimeRoot.CSGameComponents.iconFor("projector") + 'Projector-safe layout ready</span>' : ""),
        "      </div>",
        (currentGame.id === "word-typing" ? "" : renderFeedback(state.feedback)),
        (currentGame.id === "word-typing" ? "" : renderResultBanner(state, currentGame)),
        '      <div id="cg-stage-board" class="cg-stage-board"></div>',
        "    </div>",
        "  </section>",
        teacherPanelMarkup,
        "</div>"
      ].join("");

      var stageBoard = document.getElementById("cg-stage-board");
      if (stageBoard && state.round) stageBoard.innerHTML = renderRoundBoard(state, currentGame);
      bindInteractions();
      hydrateControls(state);
    }

    function renderRoundBoard(state, game) {
      var round = state.round || {};
      function renderTypingPathMarkup(currentRound) {
        return '<div class="cg-typing-path" aria-label="Lesson path">' + (currentRound.unitPath || []).map(function (item, index) {
          var isCurrent = item.id === currentRound.id;
          var result = typingProgress.lessonResults && typingProgress.lessonResults[item.id] || {};
          var isDone = item.completed || result.complete;
          var stars = Math.max(0, Math.min(5, Number(result.stars || 0)));
          var statusLabel = item.locked
            ? "Locked"
            : isDone
              ? "Mastered"
              : isCurrent
                ? "Current"
                : "Open";
          return '<button class="cg-typing-path-card' + (isCurrent ? ' is-current' : '') + (isDone ? ' is-done' : '') + (item.locked ? ' is-locked' : '') + '" type="button" data-action="jump-typing-lesson" data-lesson-order="' + Number(item.order || index + 1) + '"' + (item.locked ? ' disabled aria-disabled="true"' : "") + '><span>' + runtimeRoot.CSGameComponents.escapeHtml(item.label || ("L" + (index + 1))) + '</span><strong>' + runtimeRoot.CSGameComponents.escapeHtml(String(item.shortLabel || "").toUpperCase()) + '</strong><small class="cg-typing-path-meta">' + runtimeRoot.CSGameComponents.escapeHtml(statusLabel) + '</small>' + (item.locked ? '<span class="cg-typing-path-lock">Locked</span>' : stars ? renderTypingStars(stars) : "") + "</button>";
        }).join("") + "</div>";
      }

      function renderTypingCourseMap(currentRound) {
        var units = [];
        var grouped = {};
        (typingCourseRows || []).forEach(function (row) {
          var unitKey = String(row && row.unitLabel || "Unit");
          var meta = typingUnitMeta(unitKey, (typingCourseRows || []).filter(function (candidate) {
            return String(candidate && candidate.unitLabel || "") === unitKey;
          }));
          if (!grouped[unitKey]) {
            grouped[unitKey] = {
              unitLabel: unitKey,
              lessonCount: 0,
              completedCount: 0,
              startOrder: Number(row && row.lessonOrder || 1),
              focusLabel: meta.title,
              preview: []
            };
            units.push(grouped[unitKey]);
          }
          grouped[unitKey].lessonCount += 1;
          if (typingProgress.completedLessonIds.indexOf(String(row && row.id || "")) >= 0) grouped[unitKey].completedCount += 1;
          if (grouped[unitKey].preview.length < 3 && row && row.target) grouped[unitKey].preview.push(String(row.target).toUpperCase());
        });
        return '<div class="cg-typing-course-map" aria-label="Typing course map">' + units.map(function (unit, index) {
          var active = Number(currentRound.lessonOrder || 1) >= unit.startOrder && Number(currentRound.lessonOrder || 1) < (unit.startOrder + unit.lessonCount);
          var unlocked = Number(context.typingUnlockedOrder || typingProgress.unlockedLessonOrder || 1) >= unit.startOrder;
          var meta = typingUnitMeta(unit.unitLabel, []);
          var stateLabel = unlocked ? (active ? "Current path" : (unit.completedCount >= unit.lessonCount ? "Mastered" : "Open")) : "Locked";
          var progressPercent = unit.lessonCount ? Math.round((unit.completedCount / unit.lessonCount) * 100) : 0;
          return '<button class="cg-typing-unit-card cg-typing-unit-card--step-' + String(index + 1) + (active ? ' is-current' : '') + (unlocked ? '' : ' is-locked') + '" type="button" data-action="jump-typing-lesson" data-lesson-order="' + unit.startOrder + '"' + (unlocked ? '' : ' disabled aria-disabled="true"') + '><span class="cg-typing-unit-label">' + runtimeRoot.CSGameComponents.escapeHtml(meta.phase || unit.unitLabel) + '</span><span class="cg-typing-unit-step">' + runtimeRoot.CSGameComponents.escapeHtml(String(index + 1).padStart(2, '0')) + '</span><strong>' + runtimeRoot.CSGameComponents.escapeHtml(unit.focusLabel) + '</strong><small>' + runtimeRoot.CSGameComponents.escapeHtml(unit.completedCount + " / " + unit.lessonCount + " complete") + '</small><div class="cg-typing-unit-preview">' + unit.preview.map(function (item) {
            return '<span>' + runtimeRoot.CSGameComponents.escapeHtml(item) + "</span>";
          }).join("") + '</div><div class="cg-typing-unit-progress"><span style="width:' + progressPercent + '%"></span></div><span class="cg-typing-unit-state">' + runtimeRoot.CSGameComponents.escapeHtml(stateLabel) + '</span></button>';
          }).join("") + "</div>";
      }

      function renderTypingLessonTiles(rows, currentRound) {
        var list = Array.isArray(rows) ? rows : [];
        return '<div class="cg-typing-lesson-grid" aria-label="Typing lessons">' + list.map(function (item) {
          var result = typingProgress.lessonResults && typingProgress.lessonResults[item.id] || {};
          var isDone = typingProgress.completedLessonIds.indexOf(String(item.id || "")) >= 0 || result.complete;
          var isCurrent = currentRound && String(currentRound.id || "") === String(item.id || "");
          var locked = Number(item.lessonOrder || 1) > Number(context.typingUnlockedOrder || typingProgress.unlockedLessonOrder || 1);
          var href = typingQuestHref({ typingCourseMode: "lesson", lessonId: item.id, lessonOrder: item.lessonOrder });
          var stars = Math.max(0, Math.min(5, Number(result.stars || 0)));
          var status = locked ? "Locked" : isDone ? "Mastered" : isCurrent ? "Current" : "Open";
          return '<a class="cg-typing-lesson-tile' + (isCurrent ? ' is-current' : '') + (isDone ? ' is-done' : '') + (locked ? ' is-locked' : '') + '" href="' + runtimeRoot.CSGameComponents.escapeHtml(locked ? "#" : href) + '"' + (locked ? ' aria-disabled="true"' : '') + '><span class="cg-typing-lesson-number">' + Number(item.lessonOrder || 0) + '</span><span class="cg-typing-lesson-glyph">' + runtimeRoot.CSGameComponents.escapeHtml(typingLessonGlyph(item)) + '</span><span class="cg-typing-lesson-badge">' + runtimeRoot.CSGameComponents.escapeHtml(typingLessonBadge(item)) + '</span><strong>' + runtimeRoot.CSGameComponents.escapeHtml(item.stageLabel || item.lessonLabel || "Lesson") + '</strong><small>' + runtimeRoot.CSGameComponents.escapeHtml(String(item.target || "").toUpperCase()) + '</small><span class="cg-typing-lesson-status">' + runtimeRoot.CSGameComponents.escapeHtml(status) + '</span>' + (stars ? renderTypingStars(stars) : "") + "</a>";
        }).join("") + "</div>";
      }

      function renderTypingPlacementTiles() {
        return '<div class="cg-typing-lesson-grid cg-typing-lesson-grid--placement" aria-label="Placement checks">' + (typingPlacementRows || []).map(function (item, index) {
          var current = index === 0;
          return '<a class="cg-typing-lesson-tile' + (current ? ' is-current' : '') + '" href="' + runtimeRoot.CSGameComponents.escapeHtml(typingQuestHref({ typingCourseMode: "placement" })) + '"><span class="cg-typing-lesson-number">' + (index + 1) + '</span><span class="cg-typing-lesson-glyph">' + runtimeRoot.CSGameComponents.escapeHtml(typingLessonGlyph(item)) + '</span><span class="cg-typing-lesson-badge">Check</span><strong>' + runtimeRoot.CSGameComponents.escapeHtml(item.stageLabel || item.prompt || "Placement") + '</strong><small>' + runtimeRoot.CSGameComponents.escapeHtml(String(item.target || "").toUpperCase()) + '</small><span class="cg-typing-lesson-status">' + runtimeRoot.CSGameComponents.escapeHtml(current ? "Start here" : "Placement") + "</span></a>";
        }).join("") + "</div>";
      }

      function renderTypingUnitSections(currentRound) {
        var grouped = {};
        var order = [];
        var currentUnitKey = String(currentRound && currentRound.unitLabel || "Unit 0");
        (typingCourseRows || []).forEach(function (item) {
          var key = String(item && item.unitLabel || "Unit");
          if (!grouped[key]) {
            grouped[key] = [];
            order.push(key);
          }
          grouped[key].push(item);
        });
        return order.map(function (key) {
          var rows = grouped[key] || [];
          var meta = typingUnitMeta(key, rows);
          var unitSlug = String(key || "unit").toLowerCase().replace(/[^a-z0-9]+/g, "-");
          var active = key === currentUnitKey;
          var unlocked = Number(context.typingUnlockedOrder || typingProgress.unlockedLessonOrder || 1) >= Number(rows[0] && rows[0].lessonOrder || 1);
          var completedCount = rows.filter(function (row) {
            var result = typingProgress.lessonResults && typingProgress.lessonResults[row.id] || {};
            return typingProgress.completedLessonIds.indexOf(String(row && row.id || "")) >= 0 || result.complete;
          }).length;
          var previewRows = active ? rows : rows.slice(0, Math.min(rows.length, 3));
          return [
            '<section class="cg-typing-unit-section cg-typing-unit-section--' + runtimeRoot.CSGameComponents.escapeHtml(unitSlug) + (active ? ' is-current' : ' is-collapsed') + (!unlocked ? ' is-locked' : '') + '">',
            '  <div class="cg-typing-unit-section__head">',
            '    <div><p class="cg-kicker">' + runtimeRoot.CSGameComponents.escapeHtml(meta.phase || key) + '</p><h3>' + runtimeRoot.CSGameComponents.escapeHtml(meta.title) + '</h3><p>' + runtimeRoot.CSGameComponents.escapeHtml(meta.subtitle) + '</p></div>',
            '    <div class="cg-typing-unit-section__status"><span class="cg-typing-unit-section__count">' + runtimeRoot.CSGameComponents.escapeHtml(rows.length + " lessons") + '</span><span class="cg-typing-unit-section__meter">' + runtimeRoot.CSGameComponents.escapeHtml(completedCount + " complete") + '</span>' + (active ? '<span class="cg-typing-unit-section__flag">Current week</span>' : (unlocked ? '<a class="cg-typing-unit-section__jump" href="' + runtimeRoot.CSGameComponents.escapeHtml(typingQuestHref({ typingCourseMode: "lesson", lessonId: rows[0] && rows[0].id || "", lessonOrder: rows[0] && rows[0].lessonOrder || 1 })) + '">Open week</a>' : '<span class="cg-typing-unit-section__flag is-locked">Locked</span>')) + '</div>',
            "  </div>",
            renderTypingLessonTiles(previewRows, currentRound),
            (!active && rows.length > previewRows.length ? '<div class="cg-typing-unit-section__more">+' + runtimeRoot.CSGameComponents.escapeHtml(String(rows.length - previewRows.length)) + ' more lessons in this week</div>' : ''),
            "</section>"
          ].join("");
        }).join("");
      }

      function renderTypingRuntimeSidebar(currentRound, metrics, stars, ready) {
        return [
          '<aside class="cg-typing-runtime-sidebar">',
          '  <div class="cg-typing-runtime-panel">',
          '    <p class="cg-kicker">Lesson rating</p>',
          '    <div class="cg-typing-summary-rating"><div id="cg-typing-live-stars">' + renderTypingStars(stars) + '</div><span>' + runtimeRoot.CSGameComponents.escapeHtml(ready ? "Ready to move on" : "Build to 5 stars") + '</span></div>',
          '  </div>',
          '  <div class="cg-typing-runtime-panel cg-typing-runtime-panel--stats">',
          '    <div class="cg-typing-runtime-stat"><span>Goal</span><strong>' + runtimeRoot.CSGameComponents.escapeHtml(metrics.goalWpm + " WPM") + '</strong><small>' + runtimeRoot.CSGameComponents.escapeHtml(metrics.goalAccuracy + "% accuracy") + '</small></div>',
          '    <div class="cg-typing-runtime-stat"><span>Speed</span><strong id="cg-typing-live-wpm">' + metrics.wpm + '</strong><small>WPM</small></div>',
          '    <div class="cg-typing-runtime-stat"><span>Accuracy</span><strong id="cg-typing-live-accuracy">' + metrics.accuracy + '%</strong><small>live</small></div>',
          '    <div class="cg-typing-runtime-stat"><span>Errors</span><strong id="cg-typing-live-errors">' + metrics.mistakes + '</strong><small>this run</small></div>',
          "  </div>",
          "</aside>"
        ].join("");
      }

      if (game.id === "word-typing" && !params.typingPage) {
        var courseSummary = typingCourseSummary(typingProgress, typingCourseRows);
        var currentLesson = typingLessonById(context.currentTypingLessonId) || typingLessonByOrder(context.currentTypingLessonOrder || 1) || round;
        var currentUnitMeta = typingUnitMeta(currentLesson && currentLesson.unitLabel || "Unit 0", (typingCourseRows || []).filter(function (row) {
          return String(row && row.unitLabel || "") === String(currentLesson && currentLesson.unitLabel || "");
        }));
        var continueHref = context.typingPlacementRequired
          ? typingQuestHref({ typingCourseMode: "placement" })
          : typingQuestHref({
              typingCourseMode: "lesson",
              lessonId: currentLesson && currentLesson.id || "",
              lessonOrder: currentLesson && currentLesson.lessonOrder || 1
            });
        return [
          '<div class="cg-typing-course-page">',
          '  <section class="cg-typing-course-hero">',
          '    <div class="cg-typing-course-start">',
          '      <div class="cg-typing-course-start__head">',
          '        <p class="cg-kicker">Start here</p>',
          '        <h2>' + runtimeRoot.CSGameComponents.escapeHtml(context.typingPlacementRequired ? "Take the placement check first" : ("Continue with " + currentUnitMeta.title)) + '</h2>',
          '        <p>' + runtimeRoot.CSGameComponents.escapeHtml(context.typingPlacementRequired ? "Four short checks place the learner into the right lesson path before the course map opens up." : ("Open " + ((currentLesson && currentLesson.lessonLabel) || "the next lesson") + " and keep building accuracy before moving on.")) + '</p>',
          '      </div>',
          '      <div class="cg-typing-course-start__action">',
          '        <span class="cg-typing-course-start__eyebrow">' + runtimeRoot.CSGameComponents.escapeHtml(context.typingPlacementRequired ? "Placement check" : "Next lesson") + '</span>',
          '        <strong class="cg-typing-course-start__target">' + runtimeRoot.CSGameComponents.escapeHtml(String((context.typingPlacementRequired ? "FJFJ" : (currentLesson && currentLesson.target) || round.target || "FJFJ")).toUpperCase()) + '</strong>',
          '        <span class="cg-typing-course-start__meta">' + runtimeRoot.CSGameComponents.escapeHtml(context.typingPlacementRequired ? "4 quick checks" : ((currentLesson && currentLesson.stageLabel) || "Typing practice")) + '</span>',
          '        <a class="cg-action cg-action-primary cg-typing-course-start__button" href="' + runtimeRoot.CSGameComponents.escapeHtml(continueHref) + '">' + runtimeRoot.CSGameComponents.escapeHtml(context.typingPlacementRequired ? "Take Placement Check" : "Open Lesson") + '</a>',
          '      </div>',
          '    </div>',
          '    <div class="cg-typing-course-hero__main">',
          '      <p class="cg-kicker">Course Path</p>',
          '      <h3 class="cg-display">Typing Quest Foundations</h3>',
          '      <p class="cg-typing-course-hero__subtitle">' + runtimeRoot.CSGameComponents.escapeHtml(context.typingPlacementRequired ? "Start with placement, then unlock the first lesson path." : ("Current path: " + currentUnitMeta.title + ".")) + '</p>',
          '      <div class="cg-typing-course-ribbon"><span>1. Home row</span><span>2. Home-row words</span><span>3. Top row reach</span><span>4. Bottom row reach</span><span>5. Connected text</span></div>',
          '      <div class="cg-typing-plan-progress"><div class="cg-typing-plan-progress-fill" style="width:' + courseSummary.progressPercent + '%"></div></div>',
          '      <div class="cg-typing-plan-meta"><span>' + courseSummary.completedLessons + ' of ' + courseSummary.totalLessons + ' lessons mastered</span><span>' + runtimeRoot.CSGameComponents.escapeHtml(context.typingPlacementRequired ? "Placement ready" : ((currentLesson && currentLesson.lessonLabel) || "Lesson 1")) + '</span></div>',
          '    </div>',
          '  </section>',
          renderTypingCourseMap(currentLesson || round),
          (context.typingPlacementRequired ? '<section class="cg-typing-unit-section cg-typing-unit-section--placement"><div class="cg-typing-unit-section__head"><div><p class="cg-kicker">Placement</p><h3>Find the right start point</h3><p>Four short checks, then the first lesson opens in order.</p></div><span class="cg-typing-unit-section__count">4 checks</span></div>' + renderTypingPlacementTiles() + '</section>' : ""),
          renderTypingUnitSections(currentLesson || round),
          '</div>'
        ].join("");
      }

      if (game.id === "word-typing") {
        var typedValue = String(uiState.typingLockedValue || uiState.lastSubmittedGuess || "").toUpperCase();
        var summaryMetrics = Object.assign({}, typingLiveMetrics(uiState, round, typedValue), state.lastOutcome && state.lastOutcome.stats || {});
        var summaryStars = typingMasteryStars(summaryMetrics, round, !!(state.lastOutcome && state.lastOutcome.correct));
        var canAdvance = typingReadyToAdvance(summaryMetrics, round, !!(state.lastOutcome && state.lastOutcome.correct));
        var nextLesson = typingLessonByOrder(Number(round.lessonOrder || 1) + 1);
        var recommendedLesson = typingLessonByOrder(Number(context.currentTypingLessonOrder || typingProgress.currentLessonOrder || 1));

        if (state.status === "round-complete" || state.status === "round-summary") {
          if (round.courseMode === "placement" && state.status === "round-summary") {
            return [
              '<div class="cg-typing-runtime">',
              '  <div class="cg-typing-runtime-main">',
              '    <div class="cg-typing-runtime-card cg-typing-runtime-card--summary">',
              '      <p class="cg-kicker">Placement Complete</p>',
              '      <h3 class="cg-display">Start with ' + runtimeRoot.CSGameComponents.escapeHtml((recommendedLesson && recommendedLesson.lessonLabel || "Lesson 1") + " · " + (recommendedLesson && recommendedLesson.stageLabel || "Foundations")) + '</h3>',
              '      <p class="cg-typing-summary-copy">The placement checks are done. Start at the first unlocked lesson and build up in order just like a real typing course.</p>',
              '      <div class="cg-typing-summary-stats">',
              '        <span class="cg-stat"><strong>' + runtimeRoot.CSGameComponents.escapeHtml(String(Math.max(1, Number(context.currentTypingLessonOrder || typingProgress.currentLessonOrder || 1)))) + '</strong> recommended lesson</span>',
              '        <span class="cg-stat"><strong>' + runtimeRoot.CSGameComponents.escapeHtml(String((state.history || []).filter(function (row) { return row.result === "correct"; }).length)) + '</strong> checks passed</span>',
              '        <span class="cg-stat"><strong>' + runtimeRoot.CSGameComponents.escapeHtml(String(Number(typingProgress.unlockedLessonOrder || 1))) + '</strong> lessons unlocked</span>',
              '      </div>',
              (recommendedLesson ? '<div class="cg-typing-summary-goal"><strong>SWBAT</strong><span>' + runtimeRoot.CSGameComponents.escapeHtml(recommendedLesson.swbat || "") + '</span></div>' : ""),
              '      <div class="cg-feedback-actions"><button class="cg-action cg-action-primary" type="button" data-action="next-typing-lesson">Start ' + runtimeRoot.CSGameComponents.escapeHtml(recommendedLesson && recommendedLesson.lessonLabel || "Lesson 1") + '</button><button class="cg-action cg-action-quiet" type="button" data-action="retake-typing-placement">Retake Placement</button></div>',
              "    </div>",
              renderTypingKeyboardGuide(recommendedLesson || round),
              "  </div>",
              renderTypingRuntimeSidebar(recommendedLesson || round, summaryMetrics, 5, true),
              "</div>"
            ].join("");
          }

          if (round.courseMode === "placement") {
            return [
              '<div class="cg-typing-runtime">',
              '  <div class="cg-typing-runtime-main">',
              '    <div class="cg-typing-runtime-card cg-typing-runtime-card--summary">',
              '      <p class="cg-kicker">Placement Check</p>',
              '      <h3 class="cg-display">' + runtimeRoot.CSGameComponents.escapeHtml((round.lessonLabel || "Check") + " complete") + '</h3>',
              '      <p class="cg-typing-summary-copy">' + runtimeRoot.CSGameComponents.escapeHtml(state.feedback && state.feedback.label || "Placement check recorded.") + '</p>',
              '      <div class="cg-typing-summary-stats">',
              '        <span class="cg-stat"><strong>' + summaryMetrics.wpm + '</strong> WPM</span>',
              '        <span class="cg-stat"><strong>' + summaryMetrics.accuracy + '%</strong> accuracy</span>',
              '        <span class="cg-stat"><strong>' + summaryMetrics.mistakes + '</strong> errors</span>',
              '      </div>',
              '      <div class="cg-feedback-actions"><button class="cg-action cg-action-primary" type="button" data-action="next-typing-check">Next Check</button><button class="cg-action cg-action-quiet" type="button" data-action="repeat-typing-lesson">Retry Check</button></div>',
              "    </div>",
              renderTypingKeyboardGuide(round),
              "  </div>",
              renderTypingRuntimeSidebar(round, summaryMetrics, summaryStars, false),
              "</div>"
            ].join("");
          }

          return [
            '<div class="cg-typing-runtime">',
            '  <div class="cg-typing-runtime-main">',
            '    <div class="cg-typing-runtime-card cg-typing-runtime-card--summary">',
            '      <p class="cg-kicker">Lesson Result</p>',
            '      <h3 class="cg-display">' + runtimeRoot.CSGameComponents.escapeHtml((round.lessonLabel || "Lesson") + " · " + (round.stageLabel || "Typing practice")) + '</h3>',
            '      <p class="cg-typing-summary-copy">' + runtimeRoot.CSGameComponents.escapeHtml(canAdvance ? "Goal met. This lesson is ready to count as mastered." : "Replay the lesson until both the speed and accuracy goals are met.") + '</p>',
            '      <div class="cg-typing-summary-rating">' + renderTypingStars(summaryStars) + '<span>' + runtimeRoot.CSGameComponents.escapeHtml(canAdvance ? "Ready to move on" : "Not yet at 5 stars") + '</span></div>',
            '      <div class="cg-typing-summary-stats">',
            '        <span class="cg-stat"><strong>' + summaryMetrics.wpm + '</strong> WPM</span>',
            '        <span class="cg-stat"><strong>' + summaryMetrics.accuracy + '%</strong> accuracy</span>',
            '        <span class="cg-stat"><strong>' + summaryMetrics.goalWpm + ' / ' + summaryMetrics.goalAccuracy + '</strong> goal</span>',
            '      </div>',
            '      <div class="cg-typing-summary-goal"><strong>SWBAT</strong><span>' + runtimeRoot.CSGameComponents.escapeHtml(round.swbat || "") + '</span></div>',
            '      <div class="cg-feedback-actions"><button class="cg-action cg-action-primary" type="button" data-action="repeat-typing-lesson">Replay Lesson</button>' + (canAdvance && nextLesson && nextLesson.id !== round.id ? '<button class="cg-action cg-action-quiet" type="button" data-action="next-typing-lesson">Open ' + runtimeRoot.CSGameComponents.escapeHtml(nextLesson.lessonLabel || "Next Lesson") + '</button>' : "") + '</div>',
            "    </div>",
            renderTypingKeyboardGuide(round),
            "  </div>",
            renderTypingRuntimeSidebar(round, summaryMetrics, summaryStars, canAdvance),
            "</div>"
          ].join("");
        }

        if (uiState.typingStartedRoundId !== round.id) {
          return [
            '<div class="cg-typing-runtime">',
            '  <div class="cg-typing-runtime-main">',
            renderHostControls(game, state, round),
            '    <div class="cg-typing-runtime-card cg-typing-runtime-card--launch">',
            '      <div class="cg-typing-runtime-intro">',
            '        <div class="cg-typing-runtime-intro__copy">',
            '          <p class="cg-kicker">' + runtimeRoot.CSGameComponents.escapeHtml(round.courseMode === "placement" ? "Placement check" : (round.lessonLabel || "Lesson")) + '</p>',
            '          <div class="cg-typing-runtime-lessonline"><span>Lesson ' + runtimeRoot.CSGameComponents.escapeHtml(String(round.lessonOrder || 1)) + ' of ' + runtimeRoot.CSGameComponents.escapeHtml(String((typingCourseRows || []).length || 1)) + '</span><span>' + runtimeRoot.CSGameComponents.escapeHtml(round.keyboardZone || round.unitLabel || "Typing Quest Foundations") + '</span></div>',
            '          <h3 class="cg-display">' + runtimeRoot.CSGameComponents.escapeHtml(typingPromptTitle(round)) + '</h3>',
            '          <p>' + runtimeRoot.CSGameComponents.escapeHtml(round.courseMode === "placement" ? "Four quick checks, then the course opens at the right lesson." : (round.swbat || "I can type the lesson target with accuracy and rhythm.")) + '</p>',
            '          <div class="cg-typing-launch-steps"><span>1. Look at the whole target</span><span>2. Type without looking down</span><span>3. Earn 5 stars to move on</span></div>',
            "        </div>",
            '        <div class="cg-typing-launch-target"><span class="cg-typing-launch-label">Target</span><strong>' + renderTypingTargetMarkup(round) + '</strong><span>' + runtimeRoot.CSGameComponents.escapeHtml(round.orthographyFocus || round.keyboardZone || "typing focus") + '</span></div>',
            "      </div>",
            '      <div class="cg-feedback-actions"><button class="cg-action cg-action-primary" type="button" data-action="start-typing-round">' + runtimeRoot.CSGameComponents.escapeHtml(round.courseMode === "placement" ? "Start Placement" : "Start Lesson") + '</button>' + (round.courseMode === "lesson" ? '<button class="cg-action cg-action-quiet" type="button" data-action="repeat-typing-lesson">Reset Lesson</button>' : "") + '</div>',
            "    </div>",
            renderTypingKeyboardGuide(round),
            "  </div>",
            renderTypingRuntimeSidebar(round, summaryMetrics, summaryStars, false),
            "</div>"
          ].join("");
        }

        var typed = String(uiState.typingLockedValue || uiState.lastSubmittedGuess || "").toUpperCase();
        var typedEvaluation = state.lastOutcome && state.lastOutcome.evaluation || typingEvaluation(round.target, typed);
        var targetChars = splitTypingChars(round.target || "");
        var typingMetrics = state.status === "playing"
          ? typingLiveMetrics(uiState, round, typed)
          : Object.assign({}, typingLiveMetrics(uiState, round, typed), state.lastOutcome && state.lastOutcome.stats || {});
        var typingStars = typingMasteryStars(state.lastOutcome && state.lastOutcome.stats || typingMetrics, round, typed === String(round.target || "").toUpperCase());
        var readyToAdvance = typed === String(round.target || "").toUpperCase()
          && typingMetrics.accuracy >= typingMetrics.goalAccuracy
          && typingMetrics.wpm >= typingMetrics.goalWpm;
        return [
          '<div class="cg-typing-runtime">',
          '  <div class="cg-typing-runtime-main">',
          renderHostControls(game, state, round),
          '    <div class="cg-typing-runtime-card cg-typing-runtime-card--lesson">',
          '      <div class="cg-typing-runtime-card__head">',
          '        <div>',
          '          <p class="cg-kicker">' + runtimeRoot.CSGameComponents.escapeHtml(round.unitLabel || "Typing Quest Foundations") + '</p>',
          '          <div class="cg-typing-runtime-lessonline"><span>Lesson ' + runtimeRoot.CSGameComponents.escapeHtml(String(round.lessonOrder || 1)) + ' of ' + runtimeRoot.CSGameComponents.escapeHtml(String((typingCourseRows || []).length || 1)) + '</span><span>' + runtimeRoot.CSGameComponents.escapeHtml(round.keyboardZone || round.orthographyFocus || "typing focus") + '</span></div>',
          '          <h3>' + runtimeRoot.CSGameComponents.escapeHtml((round.lessonLabel || "Lesson") + " · " + (round.stageLabel || "Typing practice")) + '</h3>',
          '          <p>' + runtimeRoot.CSGameComponents.escapeHtml(round.fingerCue || "Look across the whole word before you type.") + '</p>',
          "        </div>",
          '        <div class="cg-typing-runtime-goal"><span>Goal</span><strong id="cg-typing-live-goal">' + runtimeRoot.CSGameComponents.escapeHtml(typingMetrics.goalWpm + " WPM · " + typingMetrics.goalAccuracy + "%") + '</strong></div>',
          "      </div>",
          '      <div class="cg-typing-progress-panel">',
          '        <div class="cg-typing-progress-head"><strong>' + runtimeRoot.CSGameComponents.escapeHtml(round.swbat || "I can type the lesson target with accuracy and rhythm.") + '</strong><span id="cg-typing-live-progress">' + typingMetrics.typedCount + ' / ' + typingMetrics.targetCount + '</span></div>',
          '        <div class="cg-typing-lesson-cues"><span>Eyes on target</span><span>Return to home row</span><span>Finish with 5 stars</span></div>',
          '        <div class="cg-typing-progress-bar"><div id="cg-typing-progress-fill" class="cg-typing-progress-fill" style="width:' + typingMetrics.progress + '%"></div></div>',
          '        <div class="cg-typing-quest-lane"><div class="cg-typing-quest-track"></div><div id="cg-typing-quest-runner" class="cg-typing-quest-runner" style="left:calc(' + typingMetrics.progress + '% - 16px)"></div><div class="cg-typing-quest-goal">Finish</div></div>',
          "      </div>",
          '      <div class="cg-typing-text-board">',
          '        <div class="cg-typing-text-board__target">' + renderTypingTargetMarkup(round) + '</div>',
          renderTypingLane(round, typed, typedEvaluation),
          '        <div class="cg-typing-text-line" aria-label="Typing target">' + targetChars.map(function (ch, index) {
            var charClass = "cg-typing-text-char";
            if (index < typed.length) charClass += " is-correct";
            else if (index === typed.length) charClass += " is-current";
            if (ch === " ") charClass += " is-space";
            return '<span class="' + charClass + '">' + (ch === " " ? "&nbsp;" : runtimeRoot.CSGameComponents.escapeHtml(ch)) + "</span>";
          }).join("") + "</div>",
          '        <div class="cg-typing-text-entry">' + targetChars.map(function (_ch, index) {
            var stateLabel = typedEvaluation[index] || (index < typed.length ? "correct" : "");
            var displayChar = typed[index] || (_ch === " " ? " " : "");
            return '<span class="cg-typing-text-entry__char' + (stateLabel ? " is-revealed" : "") + (_ch === " " ? ' is-space' : '') + '" data-state="' + runtimeRoot.CSGameComponents.escapeHtml(stateLabel || "") + '">' + (displayChar === " " ? "&nbsp;" : runtimeRoot.CSGameComponents.escapeHtml(displayChar || "")) + "</span>";
          }).join("") + "</div>",
          "      </div>",
          '      <div class="cg-typing-entry">',
          '        <input id="cg-word-typing-input" class="cg-input' + (Date.now() < uiState.typingErrorUntil ? " is-invalid" : "") + '" maxlength="' + String(round.target || "").length + '" value="' + runtimeRoot.CSGameComponents.escapeHtml(typed) + '" placeholder="' + runtimeRoot.CSGameComponents.escapeHtml(isGroupView(state) ? "Type the lesson target for the class…" : "Type the lesson target…") + '" autocomplete="off" autocorrect="off" spellcheck="false" aria-label="Type the target word">',
          '        <button class="cg-action cg-action-quiet" type="button" data-action="hint">Pattern Hint</button>',
          '        <button class="cg-action cg-action-primary" type="button" data-submit="word-typing">' + runtimeRoot.CSGameComponents.escapeHtml(isGroupView(state) ? "Score Lesson" : "Complete Lesson") + '</button>',
          '        <button class="cg-action cg-action-quiet" type="button" data-action="repeat-typing-lesson">Restart Lesson</button>',
          '      </div>',
          (state.status !== "playing" ? '<div class="cg-typing-rating-summary"><strong>' + runtimeRoot.CSGameComponents.escapeHtml(readyToAdvance ? "5-star lesson. Move to the next target." : "Replay once more to hit the mastery goal.") + '</strong><span>' + runtimeRoot.CSGameComponents.escapeHtml("Goal: " + typingMetrics.goalWpm + " WPM and " + typingMetrics.goalAccuracy + "% accuracy") + '</span></div>' : ""),
          "    </div>",
          renderTypingKeyboardGuide(round),
          "  </div>",
          renderTypingRuntimeSidebar(round, typingMetrics, typingStars, readyToAdvance),
          "</div>"
        ].join("");
      }

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
          renderGameScaffold(game, state, round, {
            beforePlay: renderHostControls(game, state, round),
            play: [
              '<div class="cg-quest-board' + (state.lastOutcome && state.lastOutcome.correct ? " row-success" : "") + '">',
              '  <p class="cg-quest-clue">' + runtimeRoot.CSGameComponents.escapeHtml(round.prompt) + "</p>",
              '  <div class="cg-quest-grid">' + String(round.answer || "").split("").map(function (_letter, index) {
                return '<div class="cg-letter-box tile-flip' + (evaluation[index] ? " is-revealed" : "") + '" data-state="' + runtimeRoot.CSGameComponents.escapeHtml(evaluation[index] || "") + '" style="animation-delay:' + (index * 40) + 'ms">' + runtimeRoot.CSGameComponents.escapeHtml(guess[index] || "") + "</div>";
              }).join("") + "</div>",
              buildKeyboardStrip(round.answer || "", evaluation, guess, "cg-key-strip cg-key-press-strip"),
              (state.hintVisible ? '<span class="cg-chip" data-tone="warning">' + runtimeRoot.CSGameComponents.iconFor("hint") + runtimeRoot.CSGameComponents.escapeHtml(round.hint) + "</span>" : ""),
              "</div>"
            ].join(""),
            controls: [
              '<div class="cg-quest-input-row">',
              '  <input id="cg-word-guess" class="cg-input" maxlength="' + String(round.answer || "").length + '" placeholder="' + runtimeRoot.CSGameComponents.escapeHtml(isGroupView(state) ? "Class guess…" : "Your guess…") + '" autocomplete="off" autocorrect="off" spellcheck="false">',
              '  <button class="cg-action cg-action-primary" type="button" data-submit="word-quest">Submit</button>',
              '  <button class="cg-action cg-action-quiet" type="button" data-action="next-round">Skip</button>',
              '</div>'
            ].join(""),
            guide: roundGuide(game, state, round)
          })
        ].join("");
      }

      if (game.id === "word-connections") {
        var forbiddenStrike = state.lastOutcome && state.lastOutcome.forbidden;
        var speakerNum = ((Number(state.roundIndex || 0) % 4) + 1);
        return renderGameScaffold(game, state, round, {
          beforePlay: renderHostControls(game, state, round),
          play: [
            '<div class="cg-game-layout cg-game-layout--clue' + (forbiddenStrike ? " cg-focus-panel--forbidden" : "") + '">',
            '<div class="cg-clue-stage">',
            '<div class="cg-clue-stage__main">',
            (isGroupView(state) ? [
              '<div class="cg-taboo-zones">',
              '  <div class="cg-taboo-zone"><span class="cg-taboo-zone-label">Speaker</span><span class="cg-taboo-zone-name">Student ' + speakerNum + '</span></div>',
              '  <div class="cg-taboo-zone"><span class="cg-taboo-zone-label">Team</span><span class="cg-taboo-zone-name">Guess together</span></div>',
              '</div>'
            ].join("") : ""),
            '<div class="cg-taboo-card">',
            '  <p class="cg-taboo-label">' + runtimeRoot.CSGameComponents.escapeHtml(String(round.playMode || "speak").toUpperCase()) + ' mode</p>',
            '  <div class="cg-taboo-target target-word">' + runtimeRoot.CSGameComponents.escapeHtml(round.targetWord || "") + '</div>',
            (round.imageSrc ? '  <img class="cg-taboo-image word-image" src="' + runtimeRoot.CSGameComponents.escapeHtml(round.imageSrc) + '" alt="' + runtimeRoot.CSGameComponents.escapeHtml(round.targetWord || "Target word") + '">' : ""),
            '  <div class="cg-taboo-divider" role="presentation"></div>',
            '  <div class="cg-taboo-danger-band" aria-label="Blocked words">',
            '    <span class="cg-taboo-ban-label">Blocked words</span>',
            '    <ul class="cg-taboo-word-list blocked-words">' + (round.forbiddenWords || []).map(function (word) {
              return '<li class="cg-taboo-pill">' + runtimeRoot.CSGameComponents.escapeHtml(word) + "</li>";
            }).join("") + '</ul>',
            '  </div>',
            "</div>",
            '</div>',
            '<aside class="cg-clue-stage__side">',
            '<div class="cg-clue-brief">',
            '  <p class="cg-micro-label">Instruction</p>',
            '  <h4>' + runtimeRoot.CSGameComponents.escapeHtml(round.modeInstruction || round.requiredMove || "Give a clear clue without using blocked words.") + '</h4>',
            '  <p>' + runtimeRoot.CSGameComponents.escapeHtml((round.scaffolds || [round.hint || "Use an example, function, or comparison."])[0] || "") + '</p>',
            '</div>',
            '<div class="cg-clue-brief cg-clue-brief--soft">',
            '  <p class="cg-micro-label">Difficulty</p>',
            '  <h4>' + runtimeRoot.CSGameComponents.escapeHtml(String(round.blockedCount || 4)) + ' blocked words</h4>',
            '  <p>Use examples, function, or context instead of definitions or blocked words.</p>',
            '</div>',
            (uiState.supportRevealOpen ? '<div class="cg-support-reveal"><strong>Reveal</strong><span>' + runtimeRoot.CSGameComponents.escapeHtml((round.scaffolds || [round.hint || "Use an example or comparison."])[0] || "") + "</span></div>" : ""),
            '</aside>',
            '</div>',
            "</div>"
          ].join(""),
          controls: [
            '<div class="cg-choice-row cg-choice-row--stacked">',
            '  <label class="cg-field"><span>Mode</span><select id="cg-word-connections-mode" class="cg-select"><option value="speak"' + (round.playMode === "speak" ? " selected" : "") + '>Speak</option><option value="draw"' + (round.playMode === "draw" ? " selected" : "") + '>Draw</option><option value="act"' + (round.playMode === "act" ? " selected" : "") + '>Act</option><option value="mixed"' + (round.playMode === "mixed" ? " selected" : "") + '>Mixed</option></select></label>',
            '  <label class="cg-field"><span>Difficulty</span><select id="cg-word-connections-difficulty" class="cg-select"><option value="1"' + (round.blockedCount === 2 ? " selected" : "") + '>1 · 2 blocked words</option><option value="2"' + (round.blockedCount === 3 ? " selected" : "") + '>2 · 3 blocked words</option><option value="3"' + (round.blockedCount === 4 ? " selected" : "") + '>3 · 4 blocked words</option><option value="4"' + (round.blockedCount === 5 ? " selected" : "") + '>4 · 5 blocked words</option></select></label>',
            '</div>',
            '<textarea id="cg-word-connections-text" class="cg-textarea" placeholder="' + runtimeRoot.CSGameComponents.escapeHtml(isGroupView(state) ? "Record the clue or teacher notes for scoring…" : "Write the clue here…") + '" aria-label="Type your clue"></textarea>',
            '<div class="cg-feedback-actions"><button class="cg-action cg-action-quiet" type="button" data-action="toggle-support-reveal">' + (uiState.supportRevealOpen ? "Hide Reveal" : "Reveal Support") + '</button><button class="cg-action cg-action-primary" type="button" data-submit="word-connections">' + runtimeRoot.CSGameComponents.escapeHtml(isGroupView(state) ? "Score Clue" : "Check Clue") + '</button><button class="cg-action cg-action-quiet" type="button" data-action="next-round">Next Word</button></div>'
          ].join(""),
          guide: roundGuide(game, state, round)
        });
      }

      if (game.id === "morphology-builder") {
        var forgeChosen = Array.isArray(uiState.builderSelection) ? uiState.builderSelection : [];
        return renderGameScaffold(game, state, round, {
          beforePlay: renderHostControls(game, state, round),
          play: [
            '<div class="cg-game-layout cg-game-layout--builder">',
            '<div class="cg-forge">',
            '<div class="cg-forge-layout">',
            '  <div class="cg-forge-layout__main">',
            '    <div class="cg-forge-bench">',
            '      <p class="cg-forge-bench-label">Assembly Area</p>',
            '      <div class="cg-forge-equation"><span>Prefix</span><span>+</span><span>Root</span><span>+</span><span>Suffix</span></div>',
            '      <div class="cg-forge-slots" aria-label="Word assembly slots">' + (round.solution || []).map(function (_part, index) {
              var val = forgeChosen[index] || "";
              return '<button class="cg-forge-slot' + (val ? " is-filled" : "") + '" type="button" data-slot-index="' + index + '" data-drop-slot="' + index + '" aria-label="Assembly slot ' + (index + 1) + '">' + runtimeRoot.CSGameComponents.escapeHtml(val || "Drop here") + "</button>";
            }).join("") + "</div>",
            "    </div>",
            '    <div class="cg-forge-tray">',
            '      <p class="cg-forge-tray-label">Prefixes, roots, suffixes</p>',
            '      <div class="cg-forge-tiles">' + (round.tiles || []).map(function (tile) {
              var sel = forgeChosen.indexOf(tile) >= 0;
              return '<button class="cg-morph-tile' + (sel ? " is-selected" : "") + '" type="button" draggable="true" data-drag-tile="' + runtimeRoot.CSGameComponents.escapeHtml(tile) + '" data-tile="' + runtimeRoot.CSGameComponents.escapeHtml(tile) + '">' + runtimeRoot.CSGameComponents.escapeHtml(tile) + "</button>";
            }).join("") + "</div>",
            "    </div>",
            '  </div>',
            '  <aside class="cg-forge-layout__side">',
            '    <div class="cg-forge-note">',
            '      <p class="cg-micro-label">Meaning unlock</p>',
            '      <h4>' + runtimeRoot.CSGameComponents.escapeHtml(round.meaningHint || "Use what each part means to test your build.") + '</h4>',
            '      <p>Try the root first, then add the part that changes meaning.</p>',
            '    </div>',
            liveOrderFeedback(forgeChosen, round.solution, "morphology"),
            (state.hintVisible ? '<div class="cg-clue-reveal">' + runtimeRoot.CSGameComponents.iconFor("hint") + '<span>' + runtimeRoot.CSGameComponents.escapeHtml(round.hint) + "</span></div>" : ""),
            '  </aside>',
            '</div>',
            "</div>",
            "</div>"
          ].join(""),
          controls: '<div class="cg-feedback-actions"><button class="cg-action cg-action-quiet" type="button" data-action="hint">Reveal Meaning Hint</button><button class="cg-action cg-action-quiet" type="button" data-action="clear-build">Clear</button><button class="cg-action cg-action-primary" type="button" data-submit="morphology-builder">Check Build</button></div>',
          guide: roundGuide(game, state, round)
        });
      }

      if (game.id === "sentence-builder") {
        var sentChosen = Array.isArray(uiState.builderSelection) ? uiState.builderSelection : [];
        return renderGameScaffold(game, state, round, {
          beforePlay: renderHostControls(game, state, round),
          play: [
            '<div class="cg-game-layout cg-game-layout--builder">',
            '<div class="cg-sentence-sprint">',
            '  <div class="cg-sentence-lane">',
            '    <p class="cg-lane-label">Build the sentence</p>',
            '    <div class="cg-sentence-slots" aria-label="Sentence assembly">' + (round.solution || []).map(function (_part, index) {
              var val = sentChosen[index] || "";
              return '<button class="cg-sentence-slot' + (val ? " is-filled" : "") + '" type="button" data-slot-index="' + index + '" data-drop-slot="' + index + '" aria-label="Sentence slot ' + (index + 1) + '">' + runtimeRoot.CSGameComponents.escapeHtml(val || "Drop word") + "</button>";
            }).join("") + "</div>",
            "  </div>",
            '  <div class="cg-phrase-bank">',
            '    <p class="cg-phrase-bank-label">Word tiles</p>',
            '    <div class="cg-phrase-tiles">' + (round.tiles || []).map(function (tile) {
              var sel = sentChosen.indexOf(tile) >= 0;
              return '<button class="cg-phrase-tile' + (sel ? " is-selected" : "") + '" type="button" draggable="true" data-drag-tile="' + runtimeRoot.CSGameComponents.escapeHtml(tile) + '" data-tile="' + runtimeRoot.CSGameComponents.escapeHtml(tile) + '">' + runtimeRoot.CSGameComponents.escapeHtml(tile) + "</button>";
            }).join("") + "</div>",
            "  </div>",
            (round.requiredToken ? '<span class="cg-chip" data-tone="focus">' + runtimeRoot.CSGameComponents.iconFor("context") + "SWBAT use: " + runtimeRoot.CSGameComponents.escapeHtml(round.requiredToken) + "</span>" : ""),
            liveOrderFeedback(sentChosen, round.solution, "sentence"),
            (state.hintVisible ? '<div class="cg-clue-reveal">' + runtimeRoot.CSGameComponents.iconFor("hint") + '<span>' + runtimeRoot.CSGameComponents.escapeHtml(round.hint) + "</span></div>" : ""),
            "</div>",
            "</div>"
          ].join(""),
          controls: '<div class="cg-feedback-actions"><button class="cg-action cg-action-quiet" type="button" data-action="hint">Grammar Hint</button><button class="cg-action cg-action-quiet" type="button" data-action="clear-build">Clear</button><button class="cg-action cg-action-primary" type="button" data-submit="sentence-builder">Check Sentence</button></div>',
          guide: roundGuide(game, state, round)
        });
      }

      if (game.id === "concept-ladder") {
        var totalClues = (round.clues || []).length;
        var shownClues = Math.min(uiState.revealedClues, totalClues);
        return renderGameScaffold(game, state, round, {
          beforePlay: renderHostControls(game, state, round),
          playTitle: "Clue Ladder",
          play: [
            '<div class="cg-game-layout cg-game-layout--ladder">',
            '<div class="cg-step-chip">Step ' + shownClues + " of " + totalClues + "</div>",
            '<p class="cg-kicker">' + runtimeRoot.CSGameComponents.escapeHtml(round.prompt) + "</p>",
            '<div class="cg-ladder">' + (round.clues || []).map(function (clue, index) {
              if (index < shownClues) {
                return '<div class="cg-ladder-rung cg-ladder-rung--revealed" style="animation-delay:' + (index * 60) + 'ms"><span class="cg-rung-num">' + (index + 1) + '</span><div class="cg-rung-text">' + runtimeRoot.CSGameComponents.escapeHtml(clue) + "</div></div>";
              }
              return '<div class="cg-ladder-rung cg-ladder-rung--locked"><span class="cg-rung-num">' + (index + 1) + '</span><div class="cg-rung-locked-label">Reveal to unlock</div></div>';
            }).join("") + "</div>",
            "</div>"
          ].join(""),
          controls: [
            '<div class="cg-choice-row" aria-label="Possible answers">' + (round.options || []).map(function (option) {
              return '<button class="cg-choice' + (uiState.selectedChoice === option ? " is-selected" : "") + '" type="button" data-choice="' + runtimeRoot.CSGameComponents.escapeHtml(option) + '">' + runtimeRoot.CSGameComponents.escapeHtml(option) + "</button>";
            }).join("") + "</div>",
            '<div class="cg-choice-preview"><strong>Current solve</strong>' + currentChoicePreview(uiState.selectedChoice) + '</div>',
            '<div class="cg-feedback-actions">' + (shownClues < totalClues ? '<button class="cg-action cg-action-quiet" type="button" data-action="reveal-clue">Reveal Next Clue</button>' : "") + '<button class="cg-action cg-action-primary" type="button" data-submit="concept-ladder">Submit Solve</button></div>'
          ].join(""),
          guide: roundGuide(game, state, round)
        });
      }

      if (game.id === "error-detective") {
        return renderGameScaffold(game, state, round, {
          beforePlay: renderHostControls(game, state, round),
          play: [
            '<div class="cg-game-layout cg-game-layout--detective">',
            '<div class="cg-case-board">',
            '  <div class="cg-case-file">',
            '    <div class="cg-case-file-header">',
            '      <span class="cg-case-stamp">Case File</span>',
            '      <span class="cg-case-type">' + runtimeRoot.CSGameComponents.escapeHtml(round.misconception || "Reasoning Error") + '</span>',
            '    </div>',
            '    <div class="cg-case-error-text" aria-label="Incorrect statement">' + renderDetectiveFragments(round.incorrectExample || "", uiState.detectiveSelection) + '</div>',
            '    <div class="cg-case-highlight-row"><strong>Suspected error</strong><span>' + runtimeRoot.CSGameComponents.escapeHtml(uiState.detectiveSelection || "Highlight the part that looks wrong.") + '</span></div>',
            '  </div>',
            '  <div class="cg-case-paths">',
            '    <p class="cg-case-paths-label">Choose the fix that closes the case</p>',
            '    <div class="cg-choice-row">' + (round.options || []).map(function (option) {
              return '<button class="cg-choice' + (uiState.selectedChoice === option ? " is-selected" : "") + '" type="button" data-choice="' + runtimeRoot.CSGameComponents.escapeHtml(option) + '">' + runtimeRoot.CSGameComponents.escapeHtml(option) + "</button>";
            }).join("") + "</div>",
            '  </div>',
            (state.lastOutcome && !state.lastOutcome.correct ? '<div class="cg-support-reveal"><strong>Explanation</strong><span>' + runtimeRoot.CSGameComponents.escapeHtml(round.hint || "Look for the part that repairs the reasoning.") + "</span></div>" : ""),
            "</div>",
            "</div>"
          ].join(""),
          controls: '<div class="cg-feedback-actions"><button class="cg-action cg-action-quiet" type="button" data-action="hint">Reveal Explanation</button><button class="cg-action cg-action-primary" type="button" data-submit="error-detective">Confirm Correction</button></div>',
          guide: roundGuide(game, state, round)
        });
      }

      if (game.id === "rapid-category") {
        var timerSec = round.timerSeconds || game.baseTimerSeconds || 40;
        var remaining = typeof state.timerRemaining === "number" ? state.timerRemaining : timerSec;
        var timerPct = timerSec > 0 ? Math.round((remaining / timerSec) * 100) : 100;
        var timerTone = timerPct > 50 ? "positive" : timerPct > 25 ? "warning" : "danger";
        var circumference = 276.46;
        var dashOffset = Math.round(circumference * (1 - timerPct / 100));
        var ringStroke = timerTone === "positive" ? "var(--cg-positive)" : timerTone === "warning" ? "var(--cg-warning)" : "var(--cg-negative)";
        return renderGameScaffold(game, state, round, {
          beforePlay: renderHostControls(game, state, round),
          play: [
            '<div class="cg-game-layout cg-game-layout--rush">',
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
            '      <div class="cg-rush-scoreline"><span>Running score</span><strong>' + Number(state.score || 0) + '</strong></div>',
            '    </div>',
            '  </div>',
            '  <div class="cg-rush-preview" aria-live="polite">' + (uiState.categoryPreview || []).map(function (item, index) {
              return '<span class="cg-rush-preview__item" style="animation-delay:' + (index * 40) + 'ms">' + runtimeRoot.CSGameComponents.escapeHtml(item) + "</span>";
            }).join("") + '</div>',
            (state.hintVisible ? '<div class="cg-clue-reveal">' + runtimeRoot.CSGameComponents.iconFor("hint") + '<span>' + runtimeRoot.CSGameComponents.escapeHtml(round.hint) + "</span></div>" : ""),
            "</div>",
            "</div>"
          ].join(""),
          controls: [
            '<div class="cg-rush-entry">',
            '  <div class="cg-rush-fast-entry"><input id="cg-category-quick-input" class="cg-input" placeholder="' + runtimeRoot.CSGameComponents.escapeHtml(isGroupView(state) ? "Type one answer and press Enter…" : "Type one answer and press Enter…") + '" aria-label="Add quick category answer"><button class="cg-action cg-action-quiet" type="button" data-action="add-category-entry">Add</button></div>',
            '  <textarea id="cg-category-text" class="cg-textarea" placeholder="' + runtimeRoot.CSGameComponents.escapeHtml(isGroupView(state) ? "Team responses — one per line or comma-separated…" : "Enter responses — one per line or comma-separated…") + '" aria-label="Enter category responses">' + runtimeRoot.CSGameComponents.escapeHtml((uiState.categoryPreview || []).join("\n")) + '</textarea>',
            '  <div class="cg-feedback-actions"><button class="cg-action cg-action-quiet" type="button" data-action="hint">Show Hint</button><button class="cg-action cg-action-primary" type="button" data-submit="rapid-category">' + runtimeRoot.CSGameComponents.escapeHtml(isGroupView(state) ? "Score Round" : "Score Responses") + '</button></div>',
            '</div>'
          ].join(""),
          guide: roundGuide(game, state, round)
        });
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
          if (gameId === "word-typing") {
            refreshTypingCourseContext();
            persistTypingContextToEngine();
            engine.updateSettings({ timerEnabled: false });
          }
          engine.updateContext({
            subject: context.subject,
            gradeBand: context.gradeBand,
            skillFocus: context.skillFocus,
            contentMode: context.contentMode,
            typingCourseMode: context.typingCourseMode,
            currentTypingLessonId: context.currentTypingLessonId,
            currentTypingLessonOrder: context.currentTypingLessonOrder,
            typingUnlockedOrder: context.typingUnlockedOrder,
            typingCompletedLessons: context.typingCompletedLessons
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
          var currentState = engine.getState();
          var inTypingHub = currentState.selectedGameId === "word-typing" && !params.typingPage;
          var inTypingRuntime = currentState.selectedGameId === "word-typing" && params.typingPage;
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
          if (action === "start-typing-round") {
            if (inTypingHub) {
              runtimeRoot.location.href = typingQuestHref({
                typingCourseMode: context.typingPlacementRequired ? "placement" : "lesson",
                lessonId: context.currentTypingLessonId,
                lessonOrder: context.currentTypingLessonOrder
              });
              return;
            }
            startTypingRound();
            return;
          }
          if (action === "repeat-typing-lesson") {
            if (inTypingHub) {
              runtimeRoot.location.href = typingQuestHref({
                typingCourseMode: context.typingPlacementRequired ? "placement" : "lesson",
                lessonId: context.currentTypingLessonId,
                lessonOrder: context.currentTypingLessonOrder
              });
              return;
            }
            restartTypingLesson(Number(currentState.round && currentState.round.lessonOrder || context.currentTypingLessonOrder || 1));
            return;
          }
          if (action === "next-typing-check") {
            uiState.typingStartedRoundId = "";
            uiState.typingRoundStartedAt = 0;
            uiState.typingLockedValue = "";
            uiState.typingAcceptedChars = 0;
            uiState.typingMistakes = 0;
            uiState.lastSubmittedGuess = "";
            engine.nextRound();
            return;
          }
          if (action === "next-typing-lesson") {
            if (inTypingHub) {
              runtimeRoot.location.href = typingQuestHref({
                typingCourseMode: context.typingPlacementRequired ? "placement" : "lesson",
                lessonId: context.currentTypingLessonId,
                lessonOrder: context.currentTypingLessonOrder
              });
              return;
            }
            restartTypingLesson(Number(context.currentTypingLessonOrder || typingProgress.currentLessonOrder || 1));
            return;
          }
          if (action === "retake-typing-placement") {
            typingProgress = defaultTypingProgress();
            saveTypingProgress(context, typingProgress);
            refreshTypingCourseContext();
            persistTypingContextToEngine();
            if (inTypingHub) {
              runtimeRoot.location.href = typingQuestHref({ typingCourseMode: "placement" });
              return;
            }
            resetRoundUi();
            engine.updateSettings({ timerEnabled: false });
            engine.restartGame();
            return;
          }
          if (action === "jump-typing-lesson") {
            var lessonOrder = Number(button.getAttribute("data-lesson-order") || 0);
            if (!lessonOrder) return;
            if (inTypingHub) {
              var jumpLesson = typingLessonByOrder(lessonOrder);
              if (!jumpLesson || lessonOrder > Number(context.typingUnlockedOrder || 1)) return;
              runtimeRoot.location.href = typingQuestHref({
                typingCourseMode: "lesson",
                lessonId: jumpLesson.id,
                lessonOrder: jumpLesson.lessonOrder
              });
              return;
            }
            restartTypingLesson(lessonOrder);
            return;
          }
          if (action === "next-round") {
            resetRoundUi();
            engine.nextRound();
            return;
          }
          if (action === "add-category-entry") {
            var quickInput = document.getElementById("cg-category-quick-input");
            var categoryArea = document.getElementById("cg-category-text");
            var entry = String(quickInput && quickInput.value || "").trim();
            if (!entry) return;
            uiState.categoryPreview = normalizeCategoryEntries(uiState.categoryPreview.concat([entry]).join("\n"));
            if (categoryArea) categoryArea.value = uiState.categoryPreview.join("\n");
            if (quickInput) quickInput.value = "";
            paintCategoryPreview(uiState.categoryPreview);
            return;
          }
          if (action === "reveal-clue") {
            uiState.revealedClues = Math.min(uiState.revealedClues + 1, ((engine.getState().round && engine.getState().round.clues) || []).length);
            render();
            return;
          }
          if (action === "toggle-support-reveal") {
            uiState.supportRevealOpen = !uiState.supportRevealOpen;
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

      Array.prototype.forEach.call(shell.querySelectorAll("[data-detective-fragment]"), function (button) {
        button.addEventListener("click", function () {
          uiState.detectiveSelection = button.getAttribute("data-detective-fragment") || "";
          render();
        });
      });

      Array.prototype.forEach.call(shell.querySelectorAll("[data-tile]"), function (button) {
        button.addEventListener("click", function () {
          var tile = button.getAttribute("data-tile") || "";
          if (uiState.builderSelection.indexOf(tile) >= 0) return;
          var solutionLength = (((engine.getState().round || {}).solution) || []).length;
          var next = uiState.builderSelection.slice();
          var emptyIndex = next.indexOf("");
          if (emptyIndex < 0) emptyIndex = next.length < solutionLength ? next.length : -1;
          if (emptyIndex < 0) return;
          next[emptyIndex] = tile;
          uiState.builderSelection = next;
          render();
        });
      });

      Array.prototype.forEach.call(shell.querySelectorAll("[data-slot-index]"), function (button) {
        button.addEventListener("click", function () {
          var next = uiState.builderSelection.slice();
          next[Number(button.getAttribute("data-slot-index") || 0)] = "";
          uiState.builderSelection = next;
          render();
        });
      });

      Array.prototype.forEach.call(shell.querySelectorAll("[data-drag-tile]"), function (button) {
        button.addEventListener("dragstart", function (event) {
          var tile = button.getAttribute("data-drag-tile") || "";
          if (!event.dataTransfer || !tile) return;
          event.dataTransfer.setData("text/plain", tile);
          event.dataTransfer.effectAllowed = "move";
          button.classList.add("is-dragging");
        });
        button.addEventListener("dragend", function () {
          button.classList.remove("is-dragging");
        });
      });

      Array.prototype.forEach.call(shell.querySelectorAll("[data-drop-slot]"), function (slot) {
        slot.addEventListener("dragover", function (event) {
          event.preventDefault();
          slot.classList.add("is-drop-target");
        });
        slot.addEventListener("dragleave", function () {
          slot.classList.remove("is-drop-target");
        });
        slot.addEventListener("drop", function (event) {
          event.preventDefault();
          slot.classList.remove("is-drop-target");
          var tile = event.dataTransfer ? event.dataTransfer.getData("text/plain") : "";
          if (!tile || uiState.builderSelection.indexOf(tile) >= 0) return;
          var slotIndex = Number(slot.getAttribute("data-drop-slot") || -1);
          if (slotIndex < 0) return;
          var next = uiState.builderSelection.slice();
          next[slotIndex] = tile;
          uiState.builderSelection = next;
          render();
        });
      });

      var typingInput = document.getElementById("cg-word-typing-input");
      if (typingInput) {
        typingInput.addEventListener("input", function () {
          var round = engine.getState().round || {};
          var target = String(round.target || "").toUpperCase();
          var previous = uiState.typingLockedValue || "";
          var nextRaw = normalizeTypingInput(typingInput.value, target);
          var nextValue = lockTypingProgress(nextRaw, target);
          if (!uiState.typingRoundStartedAt) uiState.typingRoundStartedAt = Date.now();
          if (nextRaw.length > previous.length) {
            for (var i = previous.length; i < nextRaw.length; i += 1) {
              if (nextRaw.charAt(i) === target.charAt(i)) {
                if (nextRaw.charAt(i) !== " ") uiState.typingAcceptedChars += 1;
              } else {
                uiState.typingMistakes += 1;
                uiState.typingErrorUntil = Date.now() + 180;
              }
            }
          }
          uiState.typingLockedValue = nextValue;
          typingInput.value = nextValue;
          paintTypingPreview(round, nextValue, uiState);
        });
        typingInput.addEventListener("keydown", function (event) {
          if (event.key === "Enter") {
            event.preventDefault();
            handleSubmit("word-typing");
          }
        });
      }

      var clueInput = document.getElementById("cg-word-connections-text");
      if (clueInput) {
        clueInput.addEventListener("keydown", function (event) {
          if ((event.metaKey || event.ctrlKey) && event.key === "Enter") {
            event.preventDefault();
            handleSubmit("word-connections");
          }
        });
      }

      var clueMode = document.getElementById("cg-word-connections-mode");
      if (clueMode) clueMode.addEventListener("change", function () {
        engine.updateSettings({ wordConnectionsMode: clueMode.value });
        resetRoundUi();
        engine.restartGame();
      });

      var clueDifficulty = document.getElementById("cg-word-connections-difficulty");
      if (clueDifficulty) clueDifficulty.addEventListener("change", function () {
        engine.updateSettings({ wordConnectionsDifficulty: Number(clueDifficulty.value || 3) });
        resetRoundUi();
        engine.restartGame();
      });

      var categoryInput = document.getElementById("cg-category-text");
      if (categoryInput) {
        categoryInput.addEventListener("input", function () {
          uiState.categoryPreview = normalizeCategoryEntries(categoryInput.value || "");
          paintCategoryPreview(uiState.categoryPreview);
        });
      }

      var categoryQuickInput = document.getElementById("cg-category-quick-input");
      if (categoryQuickInput) {
        categoryQuickInput.addEventListener("keydown", function (event) {
          if (event.key !== "Enter") return;
          event.preventDefault();
          var addButton = shell.querySelector('[data-action="add-category-entry"]');
          if (addButton) addButton.click();
        });
      }

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
        refreshTypingCourseContext();
        engine.updateContext({ contentMode: contentMode.value });
        persistTypingContextToEngine();
        engine.updateSettings({ contentMode: contentMode.value });
        if (engine.getState().selectedGameId === "word-typing" && String(contentMode.value || "").toLowerCase() === "lesson") {
          engine.updateSettings({ timerEnabled: false });
        }
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

      Array.prototype.forEach.call(shell.querySelectorAll("[data-pomo-ui]"), function (button) {
        button.addEventListener("click", function () {
          var action = button.getAttribute("data-pomo-ui");
          if (action === "toggle") {
            galleryPomodoroUi.open = !galleryPomodoroUi.open;
            galleryPomodoroUi.minimized = false;
          } else if (action === "minimize") {
            galleryPomodoroUi.minimized = !galleryPomodoroUi.minimized;
          } else if (action === "mode") {
            galleryPomodoroUi.mode = galleryPomodoroUi.mode === "clock" ? "timer" : "clock";
          } else if (action === "popout") {
            pomodoroPopout = runtimeRoot.open("", "cs-gallery-pomodoro", "width=340,height=420,resizable=yes");
            renderPomodoroPopout();
          }
          persistGalleryPomodoroUi();
          render();
        });
      });

      var planClass = document.getElementById("cg-plan-class");
      if (planClass) planClass.addEventListener("input", function () {
        galleryPlan.classLabel = String(planClass.value || "");
        persistGalleryPlan();
        renderPomodoroPopout();
      });

      var planDate = document.getElementById("cg-plan-date");
      if (planDate) planDate.addEventListener("input", function () {
        galleryPlan.sessionDate = String(planDate.value || "");
        persistGalleryPlan();
        renderPomodoroPopout();
      });

      var planAgenda = document.getElementById("cg-plan-agenda");
      if (planAgenda) planAgenda.addEventListener("input", function () {
        galleryPlan.agenda = String(planAgenda.value || "");
        persistGalleryPlan();
      });

      Array.prototype.forEach.call(shell.querySelectorAll("[data-pomo-duration]"), function (button) {
        button.addEventListener("click", function () {
          var minutes = Math.max(5, Math.min(60, Number(button.getAttribute("data-pomo-duration")) || 25));
          galleryPomodoro.durationMinutes = minutes;
          galleryPomodoro.remainingSeconds = minutes * 60;
          galleryPomodoro.running = false;
          galleryPomodoro.endsAt = 0;
          stopPomodoroInterval();
          persistGalleryPomodoro();
          renderPomodoroPopout();
          render();
        });
      });

      Array.prototype.forEach.call(shell.querySelectorAll("[data-pomo-action]"), function (button) {
        button.addEventListener("click", function () {
          var action = button.getAttribute("data-pomo-action");
          if (action === "start") {
            galleryPomodoro.running = true;
            galleryPomodoro.endsAt = Date.now() + (Math.max(1, galleryPomodoro.remainingSeconds) * 1000);
            ensurePomodoroTicking();
          } else if (action === "pause") {
            syncPomodoroClock();
            galleryPomodoro.running = false;
            galleryPomodoro.endsAt = 0;
            stopPomodoroInterval();
          } else if (action === "reset") {
            galleryPomodoro.running = false;
            galleryPomodoro.endsAt = 0;
            galleryPomodoro.remainingSeconds = galleryPomodoro.durationMinutes * 60;
            stopPomodoroInterval();
          }
          persistGalleryPomodoro();
          renderPomodoroPopout();
          render();
        });
      });

      var dragHandle = shell.querySelector("[data-pomo-drag-handle]");
      if (dragHandle) {
        dragHandle.addEventListener("pointerdown", function (event) {
          var widget = shell.querySelector(".cg-pomo-widget");
          if (!widget || event.button !== 0 || event.target.closest("[data-pomo-ui], input, textarea, select, button, label")) return;
          var rect = widget.getBoundingClientRect();
          var startX = event.clientX;
          var startY = event.clientY;
          var offsetX = event.clientX - rect.left;
          var offsetY = event.clientY - rect.top;
          var pointerId = event.pointerId;
          var didDrag = false;
          function clampDrag(nextX, nextY) {
            galleryPomodoroUi.x = Math.max(12, Math.min(runtimeRoot.innerWidth - rect.width - 12, nextX));
            galleryPomodoroUi.y = Math.max(92, Math.min(runtimeRoot.innerHeight - rect.height - 12, nextY));
            widget.style.left = Math.round(galleryPomodoroUi.x) + "px";
            widget.style.top = Math.round(galleryPomodoroUi.y) + "px";
          }
          function cleanup() {
            runtimeRoot.removeEventListener("pointermove", onMove);
            runtimeRoot.removeEventListener("pointerup", onUp);
            runtimeRoot.removeEventListener("pointercancel", onUp);
            dragHandle.classList.remove("is-dragging");
            widget.classList.remove("is-dragging");
            if (runtimeRoot.document && runtimeRoot.document.body) {
              runtimeRoot.document.body.classList.remove("cg-pomo-dragging");
            }
            try { dragHandle.releasePointerCapture(pointerId); } catch (_error) {}
          }
          function onMove(moveEvent) {
            if (moveEvent.pointerId !== pointerId) return;
            var deltaX = moveEvent.clientX - startX;
            var deltaY = moveEvent.clientY - startY;
            if (!didDrag) {
              if ((deltaX * deltaX) + (deltaY * deltaY) < 36) return;
              didDrag = true;
              dragHandle.classList.add("is-dragging");
              widget.classList.add("is-dragging");
              if (runtimeRoot.document && runtimeRoot.document.body) {
                runtimeRoot.document.body.classList.add("cg-pomo-dragging");
              }
            }
            moveEvent.preventDefault();
            clampDrag(moveEvent.clientX - offsetX, moveEvent.clientY - offsetY);
          }
          function onUp(upEvent) {
            if (upEvent.pointerId !== pointerId) return;
            cleanup();
            if (didDrag) {
              upEvent.preventDefault();
              persistGalleryPomodoroUi();
            }
          }
          try { dragHandle.setPointerCapture(pointerId); } catch (_error) {}
          runtimeRoot.addEventListener("pointermove", onMove);
          runtimeRoot.addEventListener("pointerup", onUp);
          runtimeRoot.addEventListener("pointercancel", onUp);
        });
      }
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

    ensurePomodoroTicking();

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
        var typedValue = uiState.typingLockedValue || (typedWord ? typedWord.value : "");
        uiState.lastSubmittedGuess = String(typedValue || "").trim();
        engine.submit({ value: typedValue, stats: typingLiveMetrics(uiState, engine.getState().round || {}, typedValue) });
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
        uiState.categoryPreview = [];
        engine.submit({ value: category ? category.value : "" });
        return;
      }
      if (gameId === "morphology-builder" || gameId === "sentence-builder") {
        engine.submit({ value: uiState.builderSelection.slice() });
        uiState.builderSelection = [];
      }
    }

    engine.subscribe(function (state) {
      if (state.selectedGameId === "word-typing" && state.round && state.round.id !== uiState.typingRoundId) {
        uiState.typingRoundId = state.round.id;
        uiState.typingStartedRoundId = "";
        uiState.typingLockedValue = "";
        uiState.typingErrorUntil = 0;
        uiState.typingRoundStartedAt = 0;
        uiState.typingAcceptedChars = 0;
        uiState.typingMistakes = 0;
      }
      syncTypingProgressFromState(state);
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
