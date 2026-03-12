(function hubMemoryModule(root, factory) {
  if (typeof module === "object" && module.exports) {
    module.exports = factory();
    return;
  }
  root.CSHubMemory = factory();
})(typeof globalThis !== "undefined" ? globalThis : window, function createHubMemoryModule() {
  "use strict";

  function safeCall(fn, fallback) {
    try {
      var value = fn();
      return typeof value === "undefined" ? fallback : value;
    } catch (_err) {
      return fallback;
    }
  }

  function createAdapter(options) {
    var storage = options && options.storage && typeof options.storage === "object"
      ? options.storage
      : null;
    return {
      mode: storage ? "adapter" : "local-only",
      getString: function (key, fallback) {
        if (!key) return fallback || "";
        if (storage && typeof storage.get === "function") {
          var stored = safeCall(function () { return storage.get(key); }, "");
          if (stored !== null && typeof stored !== "undefined" && stored !== "") return String(stored);
        }
        return safeCall(function () {
          var localValue = localStorage.getItem(key);
          return localValue !== null && typeof localValue !== "undefined" ? String(localValue) : (fallback || "");
        }, fallback || "");
      },
      setString: function (key, value) {
        if (!key) return;
        if (storage && typeof storage.set === "function") {
          safeCall(function () { storage.set(key, value); }, null);
        }
        safeCall(function () {
          if (value === null || typeof value === "undefined" || value === "") localStorage.removeItem(key);
          else localStorage.setItem(key, String(value));
        }, null);
      },
      getJson: function (key, fallback) {
        var raw = this.getString(key, "");
        if (!raw) return fallback;
        return safeCall(function () { return JSON.parse(raw); }, fallback);
      },
      setJson: function (key, value) {
        this.setString(key, JSON.stringify(value));
      },
      remove: function (key) {
        if (!key) return;
        if (storage && typeof storage.remove === "function") {
          safeCall(function () { storage.remove(key); }, null);
        }
        safeCall(function () { localStorage.removeItem(key); }, null);
      }
    };
  }

  function memoryModeLabel(adapter) {
    var current = adapter && adapter.mode ? adapter.mode : "local-only";
    return current === "adapter"
      ? "Memory is running through the shared storage adapter and can be upgraded beyond this browser."
      : "Memory is saved in this browser for now and can be upgraded to shared sync later.";
  }

  return {
    createAdapter: createAdapter,
    memoryModeLabel: memoryModeLabel
  };
});
