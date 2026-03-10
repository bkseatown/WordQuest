(function buildStampGlobal() {
  var buildId = "20260310-hubfix";
  var gitSha = "";
  var time = "2026-03-10T10:15:00.000Z";
  var payload = { buildId: buildId, stamp: buildId, version: buildId, gitSha: gitSha, sha: gitSha, time: time, builtAt: time };
  if (typeof window !== "undefined") {
    window.__BUILD__ = payload;
    window.CS_BUILD = Object.assign({}, window.CS_BUILD || {}, payload);
  }
  if (typeof self !== "undefined") self.__CS_BUILD__ = payload;
})();
