(function csConfigModule() {
  "use strict";

  var DEV_OVERRIDE_UNLOCK = false;

  var defaults = {
    environment: "prod",
    enableAI: true,
    enableAnalytics: true,
    enableDemo: true,
    aiEndpoint: null,
    requestTimeoutMs: 4000
  };

  function detectDevEnvironment() {
    try {
      var host = String(window.location.hostname || "");
      return host === "localhost" || host === "127.0.0.1" || host.endsWith(".local") || host === "";
    } catch (_e) {
      return false;
    }
  }

  function canUseDevOverrides(baseConfig) {
    var env = String((baseConfig && baseConfig.environment) || defaults.environment).toLowerCase();
    return env === "dev" || detectDevEnvironment() || DEV_OVERRIDE_UNLOCK;
  }

  function parseBooleanFlag(value, fallback) {
    if (value === undefined || value === null || value === "") return fallback;
    var normalized = String(value).toLowerCase().trim();
    if (normalized === "1" || normalized === "true" || normalized === "on") return true;
    if (normalized === "0" || normalized === "false" || normalized === "off") return false;
    return fallback;
  }

  function parseOverrideStorage() {
    try {
      var raw = localStorage.getItem("cs_config_override");
      if (!raw) return null;
      var parsed = JSON.parse(raw);
      return parsed && typeof parsed === "object" ? parsed : null;
    } catch (_e) {
      return null;
    }
  }

  function parseQueryOverrides(baseConfig) {
    if (!canUseDevOverrides(baseConfig)) return {};
    var out = {};
    try {
      var params = new URLSearchParams(window.location.search || "");
      if (params.has("env")) out.environment = String(params.get("env") || "").trim() || baseConfig.environment;
      if (params.has("ai")) out.enableAI = parseBooleanFlag(params.get("ai"), baseConfig.enableAI);
      if (params.has("analytics")) out.enableAnalytics = parseBooleanFlag(params.get("analytics"), baseConfig.enableAnalytics);
      if (params.has("demo")) out.enableDemo = parseBooleanFlag(params.get("demo"), baseConfig.enableDemo);
      if (params.has("timeout")) {
        var timeout = Number(params.get("timeout"));
        if (!Number.isNaN(timeout) && timeout >= 1000 && timeout <= 30000) out.requestTimeoutMs = timeout;
      }
    } catch (_e) {
      return {};
    }
    return out;
  }

  function buildConfig() {
    var base = Object.assign({}, defaults, window.CS_CONFIG || {});
    if (detectDevEnvironment() && !base.environment) base.environment = "dev";

    var storageOverride = canUseDevOverrides(base) ? parseOverrideStorage() : null;
    if (storageOverride) base = Object.assign({}, base, storageOverride);

    var queryOverride = parseQueryOverrides(base);
    base = Object.assign({}, base, queryOverride);

    if (!["dev", "prod"].includes(String(base.environment).toLowerCase())) {
      base.environment = detectDevEnvironment() ? "dev" : "prod";
    } else {
      base.environment = String(base.environment).toLowerCase();
    }

    base.requestTimeoutMs = Number(base.requestTimeoutMs || defaults.requestTimeoutMs);
    if (Number.isNaN(base.requestTimeoutMs) || base.requestTimeoutMs < 1000) base.requestTimeoutMs = defaults.requestTimeoutMs;

    if (base.aiEndpoint !== null && typeof base.aiEndpoint !== "string") base.aiEndpoint = null;

    return base;
  }

  window.CS_CONFIG = buildConfig();
})();
