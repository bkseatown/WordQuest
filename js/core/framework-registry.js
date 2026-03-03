(function frameworkRegistryModule(root, factory) {
  if (typeof module === "object" && module.exports) {
    module.exports = factory();
    return;
  }
  root.CSFrameworkRegistry = factory();
})(typeof globalThis !== "undefined" ? globalThis : window, function createFrameworkRegistry() {
  "use strict";

  var DEFAULT_ALIGNMENT = Object.freeze({
    scienceOfReading: false,
    structuredLiteracy: false,
    illustrativeMath: false,
    mtssTieredModel: true,
    progressMonitoring: true
  });

  function cloneAlignment(base) {
    return {
      scienceOfReading: !!base.scienceOfReading,
      structuredLiteracy: !!base.structuredLiteracy,
      illustrativeMath: !!base.illustrativeMath,
      mtssTieredModel: !!base.mtssTieredModel,
      progressMonitoring: !!base.progressMonitoring
    };
  }

  function getFrameworkAlignment(skillNode) {
    var node = String(skillNode || "").toLowerCase();
    var out = cloneAlignment(DEFAULT_ALIGNMENT);

    if (!node) return out;

    if (/lit|read|phon|decod|fluenc|compreh|writing|sentence/.test(node)) {
      out.scienceOfReading = true;
      out.structuredLiteracy = true;
    }

    if (/num|math|number|fraction|ratio|algebra|place\s*value|illustrative/.test(node)) {
      out.illustrativeMath = true;
    }

    return out;
  }

  return {
    getFrameworkAlignment: getFrameworkAlignment
  };
});
