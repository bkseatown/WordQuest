(function wordQuestPreviewModule() {
  "use strict";

  function create(container) {
    if (!(container instanceof HTMLElement)) return null;

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

    function reset() {
      root.querySelectorAll('.hero-tile').forEach(function (tile) {
        tile.textContent = '';
        tile.classList.remove('is-gray', 'is-yellow', 'is-green', 'flip');
      });
      root.querySelectorAll('.hero-key').forEach(function (key) {
        key.classList.remove('is-gray', 'is-yellow', 'is-green');
      });
    }

    function colorKey(letter, stateClass) {
      var keyEl = root.querySelector('.hero-key[data-k="' + letter.toLowerCase() + '"]');
      if (!keyEl) return;
      keyEl.classList.remove('is-gray', 'is-yellow', 'is-green');
      keyEl.classList.add(stateClass);
    }

    function animateGuess(rowIndex, word, states, done) {
      var row = root.querySelector('.hero-row[data-row="' + rowIndex + '"]');
      if (!row) return;
      var tiles = Array.prototype.slice.call(row.querySelectorAll('.hero-tile'));
      var t = 0;

      function typeNext() {
        if (!running || document.hidden) return;
        if (t >= word.length) {
          flipNext(0);
          return;
        }
        tiles[t].textContent = word[t];
        t += 1;
        setTimer(typeNext, 70);
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
          colorKey(word[index], tileState);
          setTimer(function () { flipNext(index + 1); }, 280);
        }, 280);
      }

      typeNext();
    }

    function playRound() {
      if (!running || document.hidden) return;
      reset();
      animateGuess(0, 'SLATE', ['is-gray', 'is-green', 'is-green', 'is-yellow', 'is-gray'], function () {
        setTimer(function () {
          animateGuess(1, 'PLAIN', ['is-green', 'is-green', 'is-green', 'is-gray', 'is-gray'], function () {
            setTimer(function () {
              animateGuess(2, 'PLANT', ['is-green', 'is-green', 'is-green', 'is-green', 'is-green'], function () {
                setTimer(function () {
                  if (!running || document.hidden) return;
                  playRound();
                }, 1500);
              });
            }, 380);
          });
        }, 380);
      });
    }

    function start() {
      if (running) return;
      running = true;
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
