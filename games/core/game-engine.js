(function gameEngineModule(root, factory) {
  if (typeof module === "object" && module.exports) {
    module.exports = factory(
      require("./game-state"),
      require("./game-timer"),
      require("./game-score"),
      require("./game-feedback"),
      require("./game-modes")
    );
    return;
  }
  root.CSGameEngine = factory(
    root.CSGameState,
    root.CSGameTimer,
    root.CSGameScore,
    root.CSGameFeedback,
    root.CSGameModes
  );
})(typeof globalThis !== "undefined" ? globalThis : window, function createGameEngineFactory(GameState, GameTimer, GameScore, GameFeedback, GameModes) {
  "use strict";

  function create(config) {
    var cfg = config && typeof config === "object" ? config : {};
    var games = cfg.games || {};
    var state = GameState.create({
      selectedGameId: cfg.initialGameId || "word-quest",
      roundTarget: 6,
      settings: cfg.settings || {},
      context: cfg.context || {}
    });

    var timer = GameTimer.create({
      onTick: function (remaining) {
        state.patch({ timerRemaining: remaining });
      },
      onExpire: function () {
        submit({ timedOut: true, value: null });
      }
    });

    function getGame(gameId) {
      return games[String(gameId || state.get().selectedGameId)] || null;
    }

    function buildRound() {
      var current = state.get();
      var game = getGame(current.selectedGameId);
      if (!game || typeof game.createRound !== "function") return;
      var round = game.createRound({
        context: current.context,
        settings: current.settings,
        roundIndex: current.roundIndex,
        history: current.history.slice()
      });
      var timerSeconds = GameModes.resolveTimerSeconds(
        round && round.timerSeconds || game.baseTimerSeconds || 0,
        current.settings.viewMode,
        current.settings.timerEnabled
      );
      state.patch({
        status: "playing",
        round: round,
        feedback: GameFeedback.build("reveal", round && round.entryLabel ? round.entryLabel : "Round ready."),
        hintVisible: false,
        timerRemaining: timerSeconds
      });
      timer.start(timerSeconds);
    }

    function resetProgress(preserveGame) {
      var snapshot = state.get();
      state.patch({
        selectedGameId: preserveGame ? snapshot.selectedGameId : cfg.initialGameId || snapshot.selectedGameId,
        status: "idle",
        score: 0,
        streak: 0,
        roundsCompleted: 0,
        roundIndex: 0,
        history: [],
        round: null,
        feedback: null,
        hintVisible: false,
        metrics: { correct: 0, incorrect: 0, nearMiss: 0 }
      });
    }

    function selectGame(gameId) {
      var game = getGame(gameId);
      if (!game) return;
      timer.stop();
      state.patch({
        selectedGameId: game.id,
        score: 0,
        streak: 0,
        roundsCompleted: 0,
        roundIndex: 0,
        history: [],
        round: null,
        feedback: GameFeedback.build("reveal", game.subtitle || "Ready for the first round."),
        metrics: { correct: 0, incorrect: 0, nearMiss: 0 },
        roundTarget: GameModes.resolveRoundTarget(state.get().settings.viewMode, game.roundTarget)
      });
      buildRound();
    }

    function updateSettings(patch) {
      var nextSettings = Object.assign({}, state.get().settings, patch || {});
      state.patch({
        settings: nextSettings,
        roundTarget: GameModes.resolveRoundTarget(nextSettings.viewMode, getGame().roundTarget)
      });
      if (Object.prototype.hasOwnProperty.call(patch || {}, "soundEnabled") && cfg.sound && cfg.sound.update) {
        cfg.sound.update({ enabled: !!nextSettings.soundEnabled });
      }
    }

    function updateContext(patch) {
      state.patch({
        context: Object.assign({}, state.get().context, patch || {})
      });
    }

    function revealHint() {
      var current = state.get();
      if (!current.round) return;
      state.patch({
        hintVisible: true,
        feedback: GameFeedback.build("reveal", current.round.hintLabel || "Hint revealed.")
      });
    }

    function submit(response) {
      var current = state.get();
      if (!current.round || current.status !== "playing") return;
      var game = getGame(current.selectedGameId);
      if (!game || typeof game.evaluateRound !== "function") return;
      timer.stop();

      var outcome = game.evaluateRound({
        response: response || {},
        round: current.round,
        settings: current.settings,
        context: current.context
      }) || {};

      var hintsUsed = current.hintVisible ? 1 : 0;
      var points = GameScore.computeRoundScore({
        basePoints: outcome.basePoints || current.round.basePoints || 100,
        correct: !!outcome.correct,
        nearMiss: !!outcome.nearMiss,
        streak: outcome.correct ? current.streak + 1 : 0,
        timerSeconds: current.round.timerSeconds || 0,
        remainingSeconds: current.timerRemaining || 0,
        hintsUsed: hintsUsed,
        hintPenalty: current.settings.difficulty === "stretch" ? 16 : 12,
        teacherOverride: !!outcome.teacherOverride
      });

      var nextMetrics = Object.assign({}, current.metrics);
      if (outcome.correct) nextMetrics.correct += 1;
      else if (outcome.nearMiss) nextMetrics.nearMiss += 1;
      else nextMetrics.incorrect += 1;

      var nextStreak = outcome.correct ? current.streak + 1 : 0;
      var historyRow = {
        gameId: current.selectedGameId,
        roundId: current.round.id,
        label: current.round.promptLabel || current.round.entryLabel || "",
        result: outcome.correct ? "correct" : outcome.nearMiss ? "near-miss" : "incorrect",
        points: points,
        streak: nextStreak
      };
      var history = current.history.concat(historyRow).slice(-20);
      var roundsCompleted = current.roundsCompleted + 1;
      var finished = roundsCompleted >= current.roundTarget;

      state.patch({
        status: finished ? "round-summary" : "round-complete",
        score: current.score + points,
        streak: nextStreak,
        roundsCompleted: roundsCompleted,
        roundIndex: current.roundIndex + 1,
        history: history,
        metrics: nextMetrics,
        feedback: GameFeedback.fromResult({
          correct: !!outcome.correct,
          nearMiss: !!outcome.nearMiss,
          teacherOverride: !!outcome.teacherOverride,
          roundComplete: true,
          message: outcome.message || current.round.summaryLabel || "Round complete."
        }),
        lastOutcome: outcome,
        lastPoints: points
      });

      if (cfg.sound && outcome.correct) cfg.sound.play("correct");

      /* ── Auto difficulty arc (wait for a clearer pattern before changing) ── */
      if (roundsCompleted > 2 && !finished) {
        var curDiff = current.settings.difficulty;
        var recentHistory = history.slice(-4);
        var recentIncorrect = recentHistory.filter(function (r) { return r.result === "incorrect"; }).length;
        var recentCorrect = recentHistory.filter(function (r) { return r.result === "correct"; }).length;
        var newDiff = curDiff;
        if (nextStreak >= 5 && recentCorrect >= 3 && curDiff === "scaffolded") newDiff = "core";
        else if (nextStreak >= 6 && recentCorrect >= 4 && curDiff === "core") newDiff = "stretch";
        else if (recentIncorrect >= 3 && curDiff === "stretch") newDiff = "core";
        else if (recentIncorrect >= 3 && curDiff === "core") newDiff = "scaffolded";
        if (newDiff !== curDiff) {
          var nextSettings = Object.assign({}, current.settings, { difficulty: newDiff });
          state.patch({
            settings: nextSettings,
            feedback: GameFeedback.build("reveal", newDiff === "stretch" ? "Stepping up — stretch mode." : "Adjusting pace.", "positive")
          });
        }
      }
    }

    function teacherOverride() {
      submit({ teacherOverride: true });
    }

    function nextRound() {
      buildRound();
    }

    function restartGame() {
      timer.stop();
      resetProgress(true);
      buildRound();
    }

    function start() {
      state.patch({
        roundTarget: GameModes.resolveRoundTarget(state.get().settings.viewMode, getGame().roundTarget)
      });
      buildRound();
    }

    return {
      getState: state.get,
      subscribe: state.subscribe,
      start: start,
      selectGame: selectGame,
      nextRound: nextRound,
      submit: submit,
      revealHint: revealHint,
      restartGame: restartGame,
      updateSettings: updateSettings,
      updateContext: updateContext,
      teacherOverride: teacherOverride,
      resetProgress: resetProgress
    };
  }

  return {
    create: create
  };
});
