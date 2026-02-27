(function demoModeModule() {
  "use strict";

  function isDemoMode() {
    try {
      var params = new URLSearchParams(window.location.search || "");
      return params.get("demo") === "1" || params.get("demo") === "true" || params.get("mode") === "demo" || window.WQ_DEMO === true;
    } catch (_e) {
      return window.WQ_DEMO === true;
    }
  }

  function create(controller) {
    var timers = [];

    function setTimer(fn, ms) {
      var id = window.setTimeout(fn, ms);
      timers.push(id);
      return id;
    }

    function clear() {
      while (timers.length) {
        window.clearTimeout(timers.pop());
      }
    }

    function runLoop() {
      if (!isDemoMode()) return;
      controller.setDemoActive(true);
      controller.resetSentence();

      setTimer(function () { controller.setCoachText("Guess the hidden word in 6 tries. Colors will guide you."); }, 200);
      setTimer(function () { controller.applyAction("detail"); controller.fillSlot("adjective", "quick"); }, 6000);
      setTimer(function () { controller.applyAction("why"); controller.fillSlot("reason", "it heard a crash"); }, 14000);
      setTimer(function () { controller.applyAction("verb"); controller.chooseVerb("sprinted"); }, 23000);
      setTimer(function () { controller.applyAction("clause"); controller.fillSlot("clause", "the rain started"); }, 32000);
      setTimer(function () { controller.toggleTeacherLens(true); controller.setCoachText("Teacher Lens: growth data updates in real time."); }, 43000);
      setTimer(function () {
        controller.finishSentence();
        controller.setCoachText("That is Sentence Surgery. Structured growth in under a minute.");
      }, 54000);
      setTimer(function () { clear(); runLoop(); }, 60000);
    }

    return {
      isDemoMode: isDemoMode,
      start: runLoop,
      stop: clear
    };
  }

  window.SSDemoMode = { create: create, isDemoMode: isDemoMode };
})();
