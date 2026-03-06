(function gameSoundModule(root, factory) {
  if (typeof module === "object" && module.exports) {
    module.exports = factory();
    return;
  }
  root.CSGameSound = factory();
})(typeof globalThis !== "undefined" ? globalThis : window, function createGameSound() {
  "use strict";

  var runtimeRoot = typeof globalThis !== "undefined" ? globalThis : window;

  function create(config) {
    var settings = Object.assign({ enabled: false }, config || {});

    function play(_type) {
      if (!settings.enabled) return;
      if (!runtimeRoot.AudioContext && !runtimeRoot.webkitAudioContext) return;
      try {
        var AudioCtx = runtimeRoot.AudioContext || runtimeRoot.webkitAudioContext;
        var context = new AudioCtx();
        var oscillator = context.createOscillator();
        var gain = context.createGain();
        oscillator.frequency.value = 520;
        gain.gain.value = 0.015;
        oscillator.connect(gain);
        gain.connect(context.destination);
        oscillator.start();
        setTimeout(function () {
          oscillator.stop();
          context.close();
        }, 100);
      } catch (_err) {}
    }

    return {
      play: play,
      update: function (patch) {
        settings = Object.assign({}, settings, patch || {});
      }
    };
  }

  return {
    create: create
  };
});
