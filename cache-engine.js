(function cacheEngineModule() {
  "use strict";

  var CACHE_KEY = "cs_ai_cache";
  var TTL_MS = 24 * 60 * 60 * 1000;

  function now() {
    return Date.now();
  }

  function readStore() {
    try {
      var raw = localStorage.getItem(CACHE_KEY);
      var parsed = raw ? JSON.parse(raw) : {};
      return parsed && typeof parsed === "object" ? parsed : {};
    } catch (_e) {
      return {};
    }
  }

  function writeStore(store) {
    try {
      localStorage.setItem(CACHE_KEY, JSON.stringify(store || {}));
    } catch (_e) {
      // ignore storage write failures
    }
  }

  function cleanupExpired(store) {
    var src = store && typeof store === "object" ? store : readStore();
    var changed = false;
    Object.keys(src).forEach(function (key) {
      var row = src[key];
      var ts = Number(row && row.timestamp);
      if (!ts || now() - ts > TTL_MS) {
        delete src[key];
        changed = true;
      }
    });
    if (changed) writeStore(src);
    return src;
  }

  function get(hash) {
    if (!hash) return null;
    var store = cleanupExpired(readStore());
    return store[hash] || null;
  }

  function set(hash, payload) {
    if (!hash) return;
    var store = cleanupExpired(readStore());
    var prev = store[hash] || {};
    store[hash] = {
      analysis: payload && payload.analysis !== undefined ? payload.analysis : prev.analysis,
      coach: payload && payload.coach !== undefined ? payload.coach : prev.coach,
      timestamp: now()
    };
    writeStore(store);
  }

  window.CSCacheEngine = {
    CACHE_KEY: CACHE_KEY,
    TTL_MS: TTL_MS,
    readStore: readStore,
    writeStore: writeStore,
    cleanupExpired: cleanupExpired,
    get: get,
    set: set
  };
})();
