(function gameTimerModule(root, factory) {
  if (typeof module === "object" && module.exports) {
    module.exports = factory();
    return;
  }
  root.CSGameTimer = factory();
})(typeof globalThis !== "undefined" ? globalThis : window, function createGameTimerFactory() {
  "use strict";

  function create(config) {
    var cfg = config && typeof config === "object" ? config : {};
    var tickId = 0;
    var startedAt = 0;
    var remaining = 0;

    function stop() {
      if (tickId) clearInterval(tickId);
      tickId = 0;
    }

    function emitTick() {
      if (typeof cfg.onTick === "function") cfg.onTick(remaining);
    }

    function start(seconds) {
      stop();
      remaining = Math.max(0, Math.round(Number(seconds || 0)));
      startedAt = Date.now();
      emitTick();
      if (!remaining) return;
      tickId = setInterval(function () {
        remaining -= 1;
        emitTick();
        if (remaining <= 0) {
          stop();
          remaining = 0;
          emitTick();
          if (typeof cfg.onExpire === "function") cfg.onExpire();
        }
      }, 1000);
    }

    return {
      start: start,
      stop: stop,
      getRemaining: function () { return remaining; },
      getElapsed: function () {
        if (!startedAt) return 0;
        return Math.max(0, Math.round((Date.now() - startedAt) / 1000));
      }
    };
  }

  return {
    create: create
  };
});
