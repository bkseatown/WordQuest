(function wordQuestPreviewModule() {
  "use strict";

  function create(container, options) {
    if (!(container instanceof HTMLElement)) return null;

    var opts = options && typeof options === "object" ? options : {};
    var shouldLoop = opts.loop !== false;
    var onEvent = typeof opts.onEvent === "function" ? opts.onEvent : null;
    var resetDelayMs = Number(opts.resetDelayMs || 1100);
    var resetFadeMs = Number(opts.resetFadeMs || 250);
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
      '<div class="hero-preview-title">Word Quest Preview</div>',
      '<div class="hero-board" data-board>',
      '  <div class="hero-row" data-row="0">' + Array(5).fill('<div class="hero-tile"></div>').join('') + '</div>',
      '  <div class="hero-row" data-row="1">' + Array(5).fill('<div class="hero-tile"></div>').join('') + '</div>',
      '  <div class="hero-row" data-row="2">' + Array(5).fill('<div class="hero-tile"></div>').join('') + '</div>',
      '</div>',
      '<div class="hero-kbd">',
      '  ' + 'qwertyuiopasdfghjklzxcvbnm'.split('').map(function (k) { return '<span class="hero-key" data-k="' + k + '">' + k + '</span>'; }).join(''),
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

    function reset() {
      root.querySelectorAll('.hero-tile').forEach(function (tile) {
        tile.textContent = '';
        tile.classList.remove('is-gray', 'is-yellow', 'is-green', 'flip', 'settle');
      });
      root.querySelectorAll('.hero-key').forEach(function (key) {
        key.classList.remove('is-gray', 'is-yellow', 'is-green');
      });
      root.classList.remove('is-resetting');
    }

    function colorKey(letter, stateClass) {
      var keyEl = root.querySelector('.hero-key[data-k="' + letter.toLowerCase() + '"]');
      if (!keyEl) return;
      keyEl.classList.remove('is-gray', 'is-yellow', 'is-green');
      keyEl.classList.add(stateClass);
      keyEl.classList.add('is-pop');
      setTimer(function () { keyEl.classList.remove('is-pop'); }, 120);
    }

    function animateGuess(rowIndex, word, states, done) {
      var row = root.querySelector('.hero-row[data-row="' + rowIndex + '"]');
      if (!row) return;
      var tiles = Array.prototype.slice.call(row.querySelectorAll('.hero-tile'));
      var t = 0;

      function typeNext() {
        if (!running || document.hidden) return;
        if (t >= word.length) {
          setTimer(function () { flipNext(0); }, 300);
          return;
        }
        tiles[t].textContent = word[t];
        t += 1;
        setTimer(typeNext, 80);
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
          setTimer(function () { tiles[index].classList.remove('settle'); }, 120);
          setTimer(function () { flipNext(index + 1); }, 120);
        }, 120);
      }

      typeNext();
    }

    function playRound() {
      if (!running || document.hidden) return;
      emit('round:start');
      animateGuess(0, 'SLATE', ['is-gray', 'is-green', 'is-green', 'is-yellow', 'is-gray'], function () {
        emit('round:first-feedback');
          setTimer(function () {
            emit('round:strategy');
            animateGuess(1, 'PLAIN', ['is-green', 'is-green', 'is-green', 'is-gray', 'is-gray'], function () {
              setTimer(function () {
                animateGuess(2, 'PLANT', ['is-green', 'is-green', 'is-green', 'is-green', 'is-green'], function () {
                  emit('round:complete');
                  setTimer(function () {
                  if (!running || document.hidden) return;
                  if (!shouldLoop) return;
                  root.classList.add('is-resetting');
                  emit('round:loop-reset');
                  setTimer(function () {
                    if (!running || document.hidden) return;
                    reset();
                    playRound();
                  }, resetFadeMs);
                }, resetDelayMs);
              });
            }, 300);
          });
        }, 300);
      });
    }

    function start() {
      if (running) return;
      running = true;
      reset();
      playRound();
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
