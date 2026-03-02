(function wordQuestPreviewModule() {
  "use strict";

  function create(container, options) {
    if (!(container instanceof HTMLElement)) return null;

    var opts = options && typeof options === "object" ? options : {};
    var shouldLoop = opts.loop !== false;
    var onEvent = typeof opts.onEvent === "function" ? opts.onEvent : null;
    var resetDelayMs = Number(opts.resetDelayMs || 1800);
    var resetFadeMs = Number(opts.resetFadeMs || 250);
    var typeDelayMs = Number(opts.typeDelayMs || 130);
    var preFlipDelayMs = Number(opts.preFlipDelayMs || 520);
    var flipDurationMs = Number(opts.flipDurationMs || 180);
    var flipGapMs = Number(opts.flipGapMs || 180);
    var betweenGuessDelayMs = Number(opts.betweenGuessDelayMs || 520);
    var writingLineDelayMs = Number(opts.writingLineDelayMs || 420);
    var writingScoreDelayMs = Number(opts.writingScoreDelayMs || 520);
    var timers = [];
    var running = false;

    function setTimer(fn, ms) {
      var id = window.setTimeout(fn, ms);
      timers.push(id);
      return id;
    }

    function clearTimers() {
      while (timers.length) {
        window.clearTimeout(timers.pop());
      }
    }

    var root = document.createElement("div");
    root.className = "hero-wq-preview";
    root.innerHTML = [
      '<div class="hero-scene-title" data-scene-label>Word Quest</div>',
      '<div class="hero-scene is-active" data-scene="wordquest">',
      '  <div class="hero-board" data-board>',
      '    <div class="hero-row" data-row="0">' + Array(5).fill('<div class="tile hero-game-tile"></div>').join('') + '</div>',
      '    <div class="hero-row" data-row="1">' + Array(5).fill('<div class="tile hero-game-tile"></div>').join('') + '</div>',
      '    <div class="hero-row" data-row="2">' + Array(5).fill('<div class="tile hero-game-tile"></div>').join('') + '</div>',
      '  </div>',
      '  <div class="hero-kbd" id="hero-kbd">',
      '    <div class="key-row">' + 'qwertyuiop'.split('').map(function (k) { return '<span class="key hero-game-key" data-k="' + k + '">' + k + '</span>'; }).join('') + '</div>',
      '    <div class="key-row">' + 'asdfghjkl'.split('').map(function (k) { return '<span class="key hero-game-key" data-k="' + k + '">' + k + '</span>'; }).join('') + '</div>',
      '    <div class="key-row">' + 'zxcvbnm'.split('').map(function (k) { return '<span class="key hero-game-key" data-k="' + k + '">' + k + '</span>'; }).join('') + '</div>',
      '  </div>',
      '</div>',
      '<div class="hero-scene" data-scene="writing">',
      '  <div class="hero-writing-shell">',
      '    <div class="hero-writing-line" data-write-line="0"></div>',
      '    <div class="hero-writing-line" data-write-line="1"></div>',
      '    <div class="hero-writing-line" data-write-line="2"></div>',
      '    <div class="hero-writing-bars">',
      '      <div class="hero-writing-bar"><span data-write-bar="0"></span></div>',
      '      <div class="hero-writing-bar"><span data-write-bar="1"></span></div>',
      '      <div class="hero-writing-bar"><span data-write-bar="2"></span></div>',
      '    </div>',
      '  </div>',
      '</div>'
    ].join('');

    container.appendChild(root);

    function emit(type, detail) {
      if (!onEvent) return;
      onEvent({
        type: String(type || ""),
        detail: detail && typeof detail === "object" ? detail : {}
      });
    }

    var sceneLabel = root.querySelector('[data-scene-label]');
    var scenes = {
      wordquest: root.querySelector('[data-scene="wordquest"]'),
      writing: root.querySelector('[data-scene="writing"]')
    };
    var sceneOrder = ["wordquest", "writing"];
    var sceneIndex = 0;

    function setScene(name) {
      Object.keys(scenes).forEach(function (key) {
        if (!scenes[key]) return;
        scenes[key].classList.toggle('is-active', key === name);
      });
      if (sceneLabel) {
        sceneLabel.textContent = name === "writing" ? "Writing Studio" : "Word Quest";
      }
    }

    function resetWordQuest() {
      root.querySelectorAll('.hero-game-tile').forEach(function (tile) {
        tile.textContent = '';
        tile.classList.remove('correct', 'present', 'absent', 'flip', 'settle', 'filled');
      });
      root.querySelectorAll('.hero-game-key').forEach(function (key) {
        key.classList.remove('correct', 'present', 'absent', 'wq-demo-key-pulse');
      });
      root.classList.remove('is-resetting');
    }

    function resetWriting() {
      root.querySelectorAll('[data-write-line]').forEach(function (line) {
        line.textContent = '';
      });
      root.querySelectorAll('[data-write-bar]').forEach(function (bar) {
        bar.style.width = '0%';
      });
    }

    function reset() {
      resetWordQuest();
      resetWriting();
    }

    function colorKey(letter, stateClass) {
      var keyEl = root.querySelector('.hero-game-key[data-k="' + letter.toLowerCase() + '"]');
      if (!keyEl) return;
      keyEl.classList.remove('correct', 'present', 'absent');
      keyEl.classList.add(stateClass);
      keyEl.classList.add('wq-demo-key-pulse');
      setTimer(function () { keyEl.classList.remove('wq-demo-key-pulse'); }, 140);
    }

    function animateGuess(rowIndex, word, states, done) {
      var row = root.querySelector('.hero-row[data-row="' + rowIndex + '"]');
      if (!row) return;
      var tiles = Array.prototype.slice.call(row.querySelectorAll('.hero-game-tile'));
      var t = 0;

      function typeNext() {
        if (!running || document.hidden) return;
        if (t >= word.length) {
          setTimer(function () { flipNext(0); }, preFlipDelayMs);
          return;
        }
        tiles[t].textContent = word[t];
        tiles[t].classList.add('filled');
        t += 1;
        setTimer(typeNext, typeDelayMs);
      }

      function flipNext(index) {
        if (!running || document.hidden) return;
        if (index >= tiles.length) {
          if (typeof done === 'function') done();
          return;
        }
        tiles[index].classList.add('flip');
        setTimer(function () {
          tiles[index].classList.remove('flip');
          var tileState = states[index];
          tiles[index].classList.add(tileState);
          tiles[index].classList.add('settle');
          colorKey(word[index], tileState);
          emit('tile:state', {
            rowIndex: rowIndex,
            tileIndex: index,
            letter: word[index],
            state: tileState
          });
          setTimer(function () { tiles[index].classList.remove('settle'); }, flipDurationMs);
          setTimer(function () { flipNext(index + 1); }, flipGapMs);
        }, flipDurationMs);
      }

      typeNext();
    }

    function playWordQuestRound(next) {
      if (!running || document.hidden) return;
      emit('round:start');
      animateGuess(0, 'SLATE', ['absent', 'correct', 'correct', 'present', 'absent'], function () {
        emit('round:first-feedback');
          setTimer(function () {
            emit('round:strategy');
            animateGuess(1, 'PLAIN', ['correct', 'correct', 'correct', 'absent', 'absent'], function () {
              setTimer(function () {
                animateGuess(2, 'PLANT', ['correct', 'correct', 'correct', 'correct', 'correct'], function () {
                  emit('round:complete');
                  setTimer(function () {
                    if (typeof next === 'function') next();
                  }, resetDelayMs);
              });
            }, betweenGuessDelayMs);
          });
        }, betweenGuessDelayMs);
      });
    }

    function playWritingRound(next) {
      if (!running || document.hidden) return;
      var lines = [
        "Claim: The strongest evidence comes from...",
        "Because the text shows clear causal links...",
        "Revision: add transition and precise verb."
      ];
      var bars = [86, 74, 82];
      var lineEls = Array.prototype.slice.call(root.querySelectorAll('[data-write-line]'));
      var barEls = Array.prototype.slice.call(root.querySelectorAll('[data-write-bar]'));
      var idx = 0;

      function typeLine() {
        if (!running || document.hidden) return;
        if (idx >= lines.length) {
          setTimer(function () {
            barEls.forEach(function (bar, barIndex) {
              setTimer(function () {
                bar.style.width = String(bars[barIndex]) + '%';
              }, barIndex * 120);
            });
            setTimer(function () {
              if (typeof next === 'function') next();
            }, resetDelayMs);
          }, writingScoreDelayMs);
          return;
        }
        lineEls[idx].textContent = lines[idx];
        idx += 1;
        setTimer(typeLine, writingLineDelayMs);
      }

      typeLine();
    }

    function loopScenes() {
      if (!running || document.hidden) return;
      var scene = sceneOrder[sceneIndex % sceneOrder.length];
      setScene(scene);
      if (scene === "writing") {
        playWritingRound(function () {
          if (!running || document.hidden || !shouldLoop) return;
          sceneIndex += 1;
          root.classList.add('is-resetting');
          setTimer(function () {
            root.classList.remove('is-resetting');
            reset();
            loopScenes();
          }, resetFadeMs);
        });
        return;
      }
      playWordQuestRound(function () {
        if (!running || document.hidden || !shouldLoop) return;
        sceneIndex += 1;
        root.classList.add('is-resetting');
        emit('round:loop-reset');
        setTimer(function () {
          root.classList.remove('is-resetting');
          reset();
          loopScenes();
        }, resetFadeMs);
      });
    }

    function start() {
      if (running) return;
      running = true;
      reset();
      sceneIndex = 0;
      loopScenes();
    }

    function stop() {
      running = false;
      clearTimers();
    }

    function destroy() {
      stop();
      if (root.parentNode) root.parentNode.removeChild(root);
    }

    return {
      root: root,
      start: start,
      stop: stop,
      reset: reset,
      destroy: destroy
    };
  }

  window.WordQuestPreview = { create: create };
})();
