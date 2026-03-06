(function gameContentRegistryModule(root, factory) {
  if (typeof module === "object" && module.exports) {
    module.exports = factory(
      require("./morphology-content"),
      require("./ladder-content"),
      require("./error-content"),
      require("./category-content"),
      require("./sentence-content"),
      require("./game-content-generator")
    );
    return;
  }
  root.CSGameContentRegistry = factory(
    root.CSMorphologyContent,
    root.CSLadderContent,
    root.CSErrorContent,
    root.CSCategoryContent,
    root.CSSentenceContent,
    root.CSGameContentGenerator
  );
})(typeof globalThis !== "undefined" ? globalThis : window, function createGameContentRegistry(
  morphologyContent,
  ladderContent,
  errorContent,
  categoryContent,
  sentenceContent,
  generator
) {
  "use strict";

  var WORD_QUEST_PACK = [
    { id: "wq-1", word: "trace", clue: "Follow or mark the path.", gradeBands: ["3-5"], subjects: ["ELA"] },
    { id: "wq-2", word: "ratio", clue: "A comparison between two quantities.", gradeBands: ["6-8"], subjects: ["Math"] },
    { id: "wq-3", word: "claim", clue: "A statement a writer supports with evidence.", gradeBands: ["6-8", "9-12"], subjects: ["Writing", "ELA"] },
    { id: "wq-4", word: "roots", clue: "Plant structures that anchor and absorb.", gradeBands: ["3-5"], subjects: ["Science"] }
  ];

  var WORD_CONNECTIONS_PACK = [
    {
      id: "wc-1",
      target: "analyze",
      forbidden: ["study", "look", "think", "read"],
      scaffolds: ["Use a precise academic sentence.", "Connect the word to lesson evidence."],
      requiredMove: "Use analyze in a complete explanation.",
      skillTag: "LIT.VOC.ACAD",
      gradeBands: ["6-8", "9-12"],
      subjects: ["ELA", "Writing"]
    },
    {
      id: "wc-2",
      target: "fraction",
      forbidden: ["part", "number", "piece", "math"],
      scaffolds: ["Use a representation or model.", "Describe the relationship between numerator and denominator."],
      requiredMove: "Explain with math language, not everyday language.",
      skillTag: "MATH.CONCEPT.PARTWHOLE",
      gradeBands: ["3-5", "6-8"],
      subjects: ["Math"]
    }
  ];

  var CONTENT = Object.freeze({
    "word-quest": WORD_QUEST_PACK,
    "word-connections": WORD_CONNECTIONS_PACK,
    "morphology-builder": morphologyContent || [],
    "concept-ladder": ladderContent || [],
    "error-detective": errorContent || [],
    "rapid-category": categoryContent || [],
    "sentence-builder": sentenceContent || []
  });

  function normalizeGradeBand(value) {
    var raw = String(value || "").toUpperCase();
    if (raw === "K-2" || raw === "3-5" || raw === "6-8" || raw === "9-12") return raw;
    if (/K|1|2/.test(raw)) return "K-2";
    if (/3|4|5/.test(raw)) return "3-5";
    if (/6|7|8/.test(raw)) return "6-8";
    return "9-12";
  }

  function inferSubject(context) {
    var ctx = context && typeof context === "object" ? context : {};
    var program = String(ctx.programId || "").toLowerCase();
    var subject = String(ctx.subject || "").trim();
    var title = String(ctx.lessonTitle || ctx.conceptFocus || "").toLowerCase();
    if (subject) return subject;
    if (program.indexOf("illustrative") >= 0 || program.indexOf("bridges") >= 0 || title.indexOf("math") >= 0) return "Math";
    if (program.indexOf("fundations") >= 0 || program.indexOf("wilson") >= 0 || program.indexOf("ufli") >= 0 || program.indexOf("just-words") >= 0) return "Intervention";
    if (program.indexOf("writing") >= 0 || title.indexOf("writing") >= 0) return "Writing";
    if (title.indexOf("science") >= 0) return "Science";
    return "ELA";
  }

  function recommendedGame(context) {
    var subject = inferSubject(context);
    var program = String(context && context.programId || "").toLowerCase();
    if (program.indexOf("fundations") >= 0 || program.indexOf("wilson") >= 0 || program.indexOf("ufli") >= 0) return "morphology-builder";
    if (subject === "Math") return "concept-ladder";
    if (subject === "Writing") return "sentence-builder";
    return "word-quest";
  }

  function filterDeck(gameId, context) {
    var ctx = context && typeof context === "object" ? context : {};
    var gradeBand = normalizeGradeBand(ctx.gradeBand || ctx.grade || "3-5");
    var subject = inferSubject(ctx);
    var programId = String(ctx.programId || "").toLowerCase();
    var rows = (CONTENT[gameId] || []).filter(function (row) {
      var gradeOk = !row.gradeBands || row.gradeBands.indexOf(gradeBand) >= 0;
      var subjectOk = !row.subjects || row.subjects.indexOf(subject) >= 0 || row.subjects.indexOf("ELA") >= 0 && subject === "Intervention";
      var programOk = !row.programs || !row.programs.length || row.programs.some(function (value) {
        return programId.indexOf(String(value || "").toLowerCase()) >= 0;
      });
      return gradeOk && subjectOk && programOk;
    });
    if (!rows.length) rows = (CONTENT[gameId] || []).slice();
    return rows;
  }

  function pickRound(gameId, context, history) {
    var rows = filterDeck(gameId, context);
    var used = {};
    (Array.isArray(history) ? history : []).forEach(function (row) {
      used[String(row && row.label || "")] = true;
    });
    var unused = rows.filter(function (row) {
      return !used[String(row.prompt || row.word || row.target || row.id || "")];
    });
    var pool = unused.length ? unused : rows;
    if (!pool.length) {
      return generator && typeof generator.generateGameContent === "function"
        ? generator.generateGameContent({
            gameType: gameId,
            gradeBand: normalizeGradeBand(context && context.gradeBand),
            subject: inferSubject(context),
            lessonContext: context || {},
            vocabularyFocus: context && context.vocabularyFocus || ""
          })
        : null;
    }
    return pool[Math.floor(Math.random() * pool.length)];
  }

  return {
    inferSubject: inferSubject,
    recommendedGame: recommendedGame,
    pickRound: pickRound,
    filterDeck: filterDeck,
    generateGameContent: generator && generator.generateGameContent
      ? generator.generateGameContent
      : function () { return null; }
  };
});
