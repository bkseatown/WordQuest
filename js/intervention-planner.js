(function interventionPlannerModule(root, factory) {
  if (typeof module === "object" && module.exports) {
    module.exports = factory();
    return;
  }
  root.CSInterventionPlanner = factory();
})(typeof self !== "undefined" ? self : this, function () {
  "use strict";

  var CACHE = null;

  function loadJson(url) {
    return fetch(url, { cache: "no-store" }).then(function (resp) {
      if (!resp.ok) throw new Error("Failed to load " + url);
      return resp.json();
    });
  }

  function ensureCatalog() {
    if (CACHE) return Promise.resolve(CACHE);
    return Promise.all([
      loadJson("./data/goalBank.literacy.json"),
      loadJson("./data/goalBank.writing.json"),
      loadJson("./data/goalBank.math.json"),
      loadJson("./data/interventions.catalog.json")
    ]).then(function (rows) {
      CACHE = {
        goals: [].concat(rows[0].goals || [], rows[1].goals || [], rows[2].goals || []),
        interventions: rows[3].interventions || []
      };
      return CACHE;
    }).catch(function () {
      CACHE = { goals: [], interventions: [] };
      return CACHE;
    });
  }

  function mapNeedToDomain(needKey) {
    var key = String(needKey || "").toLowerCase();
    if (key.indexOf("vowel") >= 0 || key.indexOf("dec") >= 0 || key.indexOf("syll") >= 0) return "literacy.decoding";
    if (key.indexOf("flu") >= 0 || key.indexOf("pace") >= 0) return "literacy.fluency";
    if (key.indexOf("spell") >= 0 || key.indexOf("morph") >= 0) return "literacy.spelling";
    if (key.indexOf("write") >= 0 || key.indexOf("sentence") >= 0) return "writing.sentence";
    if (key.indexOf("num") >= 0 || key.indexOf("math") >= 0) return "numeracy.fluency";
    return "literacy.decoding";
  }

  function pickGoals(goals, domains, gradeBand) {
    return goals.filter(function (goal) {
      var domainOk = domains.indexOf(goal.domain) >= 0;
      var gradeOk = !gradeBand || String(goal.grade_band || "").indexOf(gradeBand) >= 0;
      return domainOk && gradeOk;
    }).slice(0, 3);
  }

  function pickInterventions(catalog, domains, timeBudgetMin) {
    var rows = catalog.filter(function (it) { return domains.indexOf(it.domain) >= 0; });
    var base = Math.max(6, Math.floor((timeBudgetMin || 20) / Math.max(1, Math.min(3, rows.length || 1))));
    return rows.slice(0, 3).map(function (it) {
      return {
        interventionId: it.id,
        title: it.name,
        focusSkill: it.domain,
        minutes: base,
        notes: it.descriptor,
        tags: it.tags || []
      };
    });
  }

  function buildPlan(input) {
    var row = input && typeof input === "object" ? input : {};
    var needs = Array.isArray(row.topNeeds) ? row.topNeeds : [];
    var gradeBand = String(row.gradeBand || "");
    var timeBudgetMin = Number(row.timeBudgetMin || 20);
    return ensureCatalog().then(function (catalog) {
      var domains = needs.slice(0, 3).map(function (need) {
        return mapNeedToDomain(need.key || need.skillId || need.label || "");
      });
      if (!domains.length) domains = ["literacy.decoding", "literacy.fluency", "writing.sentence"];
      var uniqueDomains = domains.filter(function (value, index, list) { return list.indexOf(value) === index; });
      return {
        goals: pickGoals(catalog.goals, uniqueDomains, gradeBand),
        activities: pickInterventions(catalog.interventions, uniqueDomains, timeBudgetMin),
        frequency: "3x/week",
        progressCadence: "Weekly mini-probe",
        generatedAt: new Date().toISOString()
      };
    });
  }

  return {
    ensureCatalog: ensureCatalog,
    buildPlan: buildPlan
  };
});
