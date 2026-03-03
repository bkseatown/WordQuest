(function frameworkRegistryModule(root, factory) {
  if (typeof module === "object" && module.exports) {
    module.exports = factory();
    return;
  }
  root.CSFrameworkRegistry = factory();
})(typeof globalThis !== "undefined" ? globalThis : window, function createFrameworkRegistry() {
  "use strict";

  var FRAMEWORK_LABELS = Object.freeze([
    { key: "scienceOfReading", label: "Science of Reading Aligned" },
    { key: "structuredLiteracy", label: "Structured Literacy" },
    { key: "illustrativeMath", label: "Illustrative Math Aligned" },
    { key: "mtssTieredModel", label: "MTSS Tier Logic" },
    { key: "progressMonitoring", label: "Progress Monitoring Supported" }
  ]);

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

  function getFrameworkLabels(alignment) {
    var src = alignment && typeof alignment === "object" ? alignment : DEFAULT_ALIGNMENT;
    return FRAMEWORK_LABELS.filter(function (row) {
      return !!src[row.key];
    }).map(function (row) {
      return row.label;
    });
  }

  return {
    getFrameworkAlignment: getFrameworkAlignment,
    getFrameworkLabels: getFrameworkLabels
  };
});
