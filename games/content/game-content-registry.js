(function gameContentRegistryModule(root, factory) {
  if (typeof module === "object" && module.exports) {
    module.exports = factory(
      require("./morphology-content"),
      require("./ladder-content"),
      require("./error-content"),
      require("./category-content"),
      require("./sentence-content"),
      require("./typing-content"),
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
    root.CSTypingContent,
    root.CSGameContentGenerator
  );
})(typeof globalThis !== "undefined" ? globalThis : window, function createGameContentRegistry(
  morphologyContent,
  ladderContent,
  errorContent,
  categoryContent,
  sentenceContent,
  typingContent,
  generator
) {
  "use strict";

  var runtimeRoot = typeof globalThis !== "undefined" ? globalThis : window;
  var COMMON_WORDS = {
    a: true, an: true, and: true, are: true, as: true, at: true, be: true, because: true, by: true, can: true,
    for: true, from: true, how: true, in: true, into: true, is: true, it: true, its: true, of: true, on: true,
    or: true, that: true, the: true, their: true, this: true, to: true, use: true, when: true, with: true, your: true
  };
  var COMMON_PREFIXES = ["re", "un", "dis", "pre", "mis", "non", "sub", "inter", "trans", "con", "de", "pro", "im", "in", "ab", "ad"];
  var COMMON_SUFFIXES = ["ing", "ed", "er", "est", "ly", "ful", "less", "ment", "tion", "sion", "ion", "ity", "al", "ous", "ive", "able", "ible", "ist"];
  var STATIC_DYNAMIC_GAMES = {
    "word-quest": true,
    "word-connections": true,
    "morphology-builder": true,
    "concept-ladder": true,
    "error-detective": true,
    "rapid-category": true,
    "sentence-builder": true,
    "word-typing": true
  };

  var WORD_QUEST_PACK = [
    { id: "wq-k1", word: "blend", clue: "Combine two or more sounds together.", gradeBands: ["K-2"], subjects: ["ELA", "Intervention"] },
    { id: "wq-k2", word: "vowel", clue: "A sound made with an open mouth — a, e, i, o, u.", gradeBands: ["K-2"], subjects: ["ELA", "Intervention"] },
    { id: "wq-k3", word: "chunk", clue: "A group of letters that go together in a word.", gradeBands: ["K-2"], subjects: ["Intervention"] },
    { id: "wq-1", word: "trace", clue: "Follow or mark the path.", gradeBands: ["3-5"], subjects: ["ELA"] },
    { id: "wq-35a", word: "infer", clue: "Use clues in the text to figure out what the author means.", gradeBands: ["3-5"], subjects: ["ELA"] },
    { id: "wq-35b", word: "theme", clue: "The central message or big idea of a story.", gradeBands: ["3-5"], subjects: ["ELA"] },
    { id: "wq-35c", word: "prefix", clue: "A word part added to the beginning that changes meaning.", gradeBands: ["3-5"], subjects: ["ELA", "Intervention"] },
    { id: "wq-35d", word: "context", clue: "The information around a word that helps explain its meaning.", gradeBands: ["3-5"], subjects: ["ELA"] },
    { id: "wq-35m1", word: "product", clue: "The answer when you multiply two numbers.", gradeBands: ["3-5"], subjects: ["Math"] },
    { id: "wq-35m2", word: "factor", clue: "A number that divides evenly into another number.", gradeBands: ["3-5"], subjects: ["Math"] },
    { id: "wq-4", word: "roots", clue: "Plant structures that anchor and absorb water.", gradeBands: ["3-5"], subjects: ["Science"] },
    { id: "wq-35s1", word: "predict", clue: "Say what you think will happen based on evidence.", gradeBands: ["3-5"], subjects: ["Science"] },
    { id: "wq-3", word: "claim", clue: "A statement a writer supports with evidence.", gradeBands: ["6-8", "9-12"], subjects: ["Writing", "ELA"] },
    { id: "wq-68a", word: "syntax", clue: "The arrangement of words and phrases to form sentences.", gradeBands: ["6-8"], subjects: ["ELA", "Writing"] },
    { id: "wq-68b", word: "cite", clue: "Point directly to evidence in a text to support your idea.", gradeBands: ["6-8", "9-12"], subjects: ["ELA", "Writing"] },
    { id: "wq-68c", word: "perspective", clue: "The viewpoint or position from which someone sees something.", gradeBands: ["6-8"], subjects: ["ELA"] },
    { id: "wq-2", word: "ratio", clue: "A comparison between two quantities.", gradeBands: ["6-8"], subjects: ["Math"] },
    { id: "wq-68m1", word: "variable", clue: "A symbol — often a letter — that represents an unknown value.", gradeBands: ["6-8"], subjects: ["Math"] },
    { id: "wq-68m2", word: "equation", clue: "A mathematical statement that two expressions are equal.", gradeBands: ["6-8"], subjects: ["Math"] },
    { id: "wq-68s1", word: "hypothesis", clue: "A testable prediction about what will happen in an experiment.", gradeBands: ["6-8"], subjects: ["Science"] },
    { id: "wq-912a", word: "synthesis", clue: "Combining ideas from multiple sources into a unified whole.", gradeBands: ["9-12"], subjects: ["ELA", "Writing"] },
    { id: "wq-912b", word: "rhetoric", clue: "The art of effective and persuasive communication.", gradeBands: ["9-12"], subjects: ["ELA", "Writing"] },
    { id: "wq-912c", word: "nuance", clue: "A subtle difference in meaning, expression, or tone.", gradeBands: ["9-12"], subjects: ["ELA"] }
  ];

  var WORD_CONNECTIONS_PACK = [
    { id: "wc-k1", target: "blend", forbidden: ["mix", "sound", "read", "word"], scaffolds: ["Tell what happens when sounds slide together.", "Use a simple reading example."], requiredMove: "Describe blend in a short reading sentence.", skillTag: "LIT.PHONICS.BLEND", gradeBands: ["K-2"], subjects: ["ELA", "Intervention"] },
    { id: "wc-k2", target: "compare", forbidden: ["same", "look", "see", "tell"], scaffolds: ["Say how two things are alike or different.", "Use one math or reading example."], requiredMove: "Use compare in a sentence about two ideas or objects.", skillTag: "LANG.COMPARE", gradeBands: ["K-2", "3-5"], subjects: ["ELA", "Math"] },
    { id: "wc-1", target: "analyze", forbidden: ["study", "look", "think", "read"], scaffolds: ["Use a precise academic sentence.", "Connect the word to lesson evidence."], requiredMove: "Use analyze in a complete explanation.", skillTag: "LIT.VOC.ACAD", gradeBands: ["6-8", "9-12"], subjects: ["ELA", "Writing"] },
    { id: "wc-2", target: "fraction", forbidden: ["part", "number", "piece", "math"], scaffolds: ["Use a representation or model.", "Describe the relationship between numerator and denominator."], requiredMove: "Explain with math language, not everyday language.", skillTag: "MATH.CONCEPT.PARTWHOLE", gradeBands: ["3-5", "6-8"], subjects: ["Math"] },
    { id: "wc-3", target: "summarize", forbidden: ["copy", "list", "write", "say"], scaffolds: ["Use your own words.", "Include the most important idea and two key details."], requiredMove: "Summarize in 1–2 sentences without looking at the text.", skillTag: "LIT.COMP.SUMMARIZE", gradeBands: ["3-5", "6-8"], subjects: ["ELA"] },
    { id: "wc-4", target: "evidence", forbidden: ["proof", "fact", "example", "quote"], scaffolds: ["Connect your evidence to your claim.", "Use: 'This shows that…'"], requiredMove: "Use evidence in a sentence that supports a specific claim.", skillTag: "LIT.WRITING.ARGUMENT", gradeBands: ["5-8", "6-8", "9-12"], subjects: ["ELA", "Writing"] },
    { id: "wc-5", target: "equivalent", forbidden: ["same", "equal", "match", "similar"], scaffolds: ["Use a representation (fraction bar, number line, or area model).", "Explain why two forms represent the same value."], requiredMove: "Explain equivalent without using the word 'same'.", skillTag: "MATH.CONCEPT.EQUIVALENCE", gradeBands: ["3-5", "6-8"], subjects: ["Math"] },
    { id: "wc-6", target: "decompose", forbidden: ["break", "split", "divide", "cut"], scaffolds: ["Use a place value chart or area model.", "Name the parts you broke the number into."], requiredMove: "Use decompose in a sentence about a specific number or shape.", skillTag: "MATH.CONCEPT.DECOMPOSE", gradeBands: ["K-2", "3-5"], subjects: ["Math"] },
    { id: "wc-7", target: "infer", forbidden: ["guess", "think", "know", "feel"], scaffolds: ["Use a text clue + background knowledge together.", "Sentence frame: 'I infer ___ because the text says ___ and I know ___.'"], requiredMove: "Make an inference and cite the evidence you used.", skillTag: "LIT.COMP.INFERENCE", gradeBands: ["3-5", "6-8"], subjects: ["ELA"] },
    { id: "wc-8", target: "justify", forbidden: ["explain", "show", "prove", "tell"], scaffolds: ["State your answer first, then support it.", "Use: 'I know this because…'"], requiredMove: "Justify your answer using at least one piece of evidence.", skillTag: "LIT.WRITING.JUSTIFY", gradeBands: ["3-5", "6-8", "9-12"], subjects: ["ELA", "Writing", "Math"] }
  ];

  var CONTENT = Object.freeze({
    "word-quest": WORD_QUEST_PACK,
    "word-connections": WORD_CONNECTIONS_PACK,
    "morphology-builder": morphologyContent || [],
    "concept-ladder": ladderContent || [],
    "error-detective": errorContent || [],
    "rapid-category": categoryContent || [],
    "sentence-builder": sentenceContent || [],
    "word-typing": typingContent || []
  });

  function normalizeGradeBand(value) {
    var raw = String(value || "").trim().toUpperCase();
    if (raw === "K-2" || raw === "3-5" || raw === "6-8" || raw === "9-12") return raw;
    if (/^K-?2$/.test(raw) || /^G?[12]$/.test(raw) || /^K$/.test(raw)) return "K-2";
    if (/^G?3-?5$/.test(raw) || /^G?[345]$/.test(raw)) return "3-5";
    if (/^G?4-?6$/.test(raw)) return "3-5";
    if (/^G?6-?8$/.test(raw) || /^G?[678]$/.test(raw)) return "6-8";
    if (/^G?11-?12$/.test(raw) || /^G?9-?12$/.test(raw) || /^G?(9|10|11|12)$/.test(raw)) return "9-12";
    return "K-2";
  }

  function normalizeWordGradeBands(value) {
    var raw = String(value || "").trim().toUpperCase();
    if (!raw) return [];
    if (!/^K-?2$/.test(raw) && !/^G?3-?5$/.test(raw) && !/^G?4-?6$/.test(raw) && !/^G?6-?8$/.test(raw) && !/^G?11-?12$/.test(raw) && !/^G?9-?12$/.test(raw)) {
      return [];
    }
    if (raw === "G4-6") return ["3-5", "6-8"];
    return [normalizeGradeBand(raw)];
  }

  function inferSubject(context) {
    var ctx = context && typeof context === "object" ? context : {};
    var program = String(ctx.programId || "").toLowerCase();
    var subject = String(ctx.subject || "").trim();
    var title = String(ctx.lessonTitle || ctx.conceptFocus || ctx.lessonFocus || "").toLowerCase();
    if (subject) return subject;
    if (program.indexOf("illustrative") >= 0 || program.indexOf("bridges") >= 0 || title.indexOf("fraction") >= 0 || title.indexOf("math") >= 0) return "Math";
    if (program.indexOf("fundations") >= 0 || program.indexOf("wilson") >= 0 || program.indexOf("ufli") >= 0 || program.indexOf("just-words") >= 0 || title.indexOf("phonics") >= 0) return "Intervention";
    if (program.indexOf("writing") >= 0 || title.indexOf("writing") >= 0 || title.indexOf("claim") >= 0) return "Writing";
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

  function uniqueList(values, maxItems) {
    var seen = {};
    var out = [];
    (Array.isArray(values) ? values : []).forEach(function (value) {
      var text = String(value || "").trim();
      if (!text) return;
      var key = text.toLowerCase();
      if (seen[key]) return;
      seen[key] = true;
      out.push(text);
    });
    return typeof maxItems === "number" ? out.slice(0, maxItems) : out;
  }

  function tokenize(text) {
    return uniqueList(String(text || "").toLowerCase().replace(/[^a-z0-9\s-]/g, " ").split(/\s+/).filter(function (token) {
      return token && token.length > 2 && !COMMON_WORDS[token];
    }), 24);
  }

  function parseCustomWordSet(value) {
    return uniqueList(String(value || "").split(/[\n,]/).map(function (item) {
      return item.trim().toLowerCase();
    }).filter(Boolean), 20);
  }

  function buildContextTerms(context) {
    var ctx = context && typeof context === "object" ? context : {};
    return {
      customWords: parseCustomWordSet(ctx.customWordSet),
      lessonTerms: uniqueList(
        tokenize(ctx.lessonTitle).concat(tokenize(ctx.lessonFocus)).concat(tokenize(ctx.conceptFocus)).concat(tokenize(ctx.vocabularyFocus)).concat(tokenize(ctx.skillFocus)),
        24
      )
    };
  }

  function mapSubjects(tags) {
    var mapped = uniqueList((Array.isArray(tags) ? tags : []).map(function (tag) {
      var value = String(tag || "").trim().toUpperCase();
      if (value === "ELA" || value === "READING") return "ELA";
      if (value === "WRITING") return "Writing";
      if (value === "INTERVENTION" || value === "PHONICS") return "Intervention";
      if (value === "MATH" || value === "MATHEMATICS") return "Math";
      if (value === "SCI" || value === "SCIENCE" || value === "STEM") return "Science";
      return "ELA";
    }), 4);
    return mapped.length ? mapped : ["ELA"];
  }

  function normalizeWordEntry(raw, key) {
    var row = raw && typeof raw === "object" ? raw : {};
    var word = String(row.display_word || key || "").trim().toLowerCase();
    if (!word) return null;
    return {
      id: "wb-" + word,
      word: word,
      definition: String(row.content && row.content.definition || "").trim(),
      sentence: String(row.content && row.content.sentence || "").trim(),
      fun: String(row.content && row.content.fun_add_on || "").trim(),
      gradeBands: normalizeWordGradeBands(row.metadata && row.metadata.grade_band),
      subjects: mapSubjects(row.instructional_paths && row.instructional_paths.subject_tags),
      tier: String(row.metadata && row.metadata.tier || "").trim(),
      partOfSpeech: String(row.metadata && row.metadata.pos || "").trim(),
      morphologyFamily: String(row.instructional_paths && row.instructional_paths.morphology_family || "").trim().toLowerCase(),
      phonics: String(row.instructional_paths && row.instructional_paths.phonics || "").trim().toLowerCase()
    };
  }

  function getWordBankEntries() {
    var data = runtimeRoot && runtimeRoot.WQ_WORD_DATA && typeof runtimeRoot.WQ_WORD_DATA === "object"
      ? runtimeRoot.WQ_WORD_DATA
      : {};
    return Object.keys(data).map(function (key) {
      return normalizeWordEntry(data[key], key);
    }).filter(Boolean);
  }

  function subjectMatches(entry, subject) {
    if (!entry || !subject) return true;
    if (entry.subjects.indexOf(subject) >= 0) return true;
    if (subject === "Intervention" && entry.subjects.indexOf("ELA") >= 0) return true;
    return false;
  }

  function scoreWordEntry(entry, context, termState) {
    var text = [entry.word, entry.definition, entry.sentence, entry.morphologyFamily, entry.phonics].join(" ").toLowerCase();
    var subject = inferSubject(context);
    var score = subjectMatches(entry, subject) ? 6 : 0;
    if ((entry.gradeBands || []).indexOf(normalizeGradeBand(context.gradeBand || context.grade || "K-2")) >= 0) score += 3;
    termState.customWords.forEach(function (term) {
      if (entry.word === term) score += 24;
      else if (text.indexOf(term) >= 0) score += 12;
    });
    termState.lessonTerms.forEach(function (term) {
      if (entry.word === term) score += 16;
      else if (entry.word.indexOf(term) >= 0) score += 10;
      else if (text.indexOf(term) >= 0) score += 4;
    });
    if (String(context.contentMode || "").toLowerCase() === "morphology" && entry.morphologyFamily) score += 12;
    if (String(context.contentMode || "").toLowerCase() === "custom" && termState.customWords.length) score += entry.word === termState.customWords[0] ? 10 : 0;
    return score;
  }

  function countTermHits(entry, termState) {
    var text = [entry.word, entry.definition, entry.sentence, entry.morphologyFamily, entry.phonics].join(" ").toLowerCase();
    var hits = 0;
    termState.customWords.forEach(function (term) {
      if (text.indexOf(term) >= 0) hits += 2;
    });
    termState.lessonTerms.forEach(function (term) {
      if (text.indexOf(term) >= 0) hits += 1;
    });
    return hits;
  }

  function hasExactFocusMatch(entry, termState) {
    var word = String(entry && entry.word || "").toLowerCase();
    return termState.customWords.concat(termState.lessonTerms).some(function (term) {
      return word === term || word.indexOf(term) >= 0 || term.indexOf(word) >= 0;
    });
  }

  function isAgeSafeWordEntry(entry, gradeBand, contentMode) {
    var bands = Array.isArray(entry && entry.gradeBands) ? entry.gradeBands : [];
    var word = String(entry && entry.word || "");
    if (gradeBand !== "K-2") return true;
    if (bands.indexOf("K-2") >= 0) return true;
    if (bands.length) return false;
    if (String(contentMode || "").toLowerCase() === "morphology") return !!(entry && (entry.morphologyFamily || entry.phonics));
    if (entry && entry.phonics) return true;
    if (entry && entry.morphologyFamily && word.length <= 9) return true;
    return word.length <= 7;
  }

  function selectWordBankEntries(context) {
    var ctx = context && typeof context === "object" ? context : {};
    var subject = inferSubject(ctx);
    var gradeBand = normalizeGradeBand(ctx.gradeBand || ctx.grade || "K-2");
    var termState = buildContextTerms(ctx);
    var contentMode = String(ctx.contentMode || "lesson").toLowerCase();
    var rows = getWordBankEntries().filter(function (entry) {
      if (!isAgeSafeWordEntry(entry, gradeBand, contentMode)) return false;
      var gradeOk = !entry.gradeBands.length || entry.gradeBands.indexOf(gradeBand) >= 0;
      if (!gradeOk) return false;
      if (contentMode === "morphology" && !entry.morphologyFamily) return false;
      if (subject === "Math" || subject === "Science" || subject === "Writing") {
        return subjectMatches(entry, subject) || hasExactFocusMatch(entry, termState);
      }
      return subjectMatches(entry, subject) || contentMode === "custom" || contentMode === "lesson";
    }).map(function (entry) {
      return { entry: entry, score: scoreWordEntry(entry, ctx, termState) };
    }).sort(function (left, right) {
      if (right.score !== left.score) return right.score - left.score;
      return left.entry.word.localeCompare(right.entry.word);
    });

    if (!rows.length && subject !== "ELA" && gradeBand !== "K-2") {
      rows = getWordBankEntries().map(function (entry) {
        return { entry: entry, score: scoreWordEntry(entry, ctx, termState) };
      }).sort(function (left, right) {
        return right.score - left.score;
      });
    }

    if ((contentMode === "lesson" || contentMode === "custom") && (termState.lessonTerms.length || termState.customWords.length)) {
      var focusedRows = rows.filter(function (item) {
        return countTermHits(item.entry, termState) > 0;
      });
      if (focusedRows.length >= 6) rows = focusedRows.concat(rows.filter(function (item) {
        return countTermHits(item.entry, termState) === 0;
      }));
    }

    return rows.slice(0, 40).map(function (item) { return item.entry; });
  }

  function shuffle(values) {
    var out = (Array.isArray(values) ? values : []).slice();
    for (var index = out.length - 1; index > 0; index -= 1) {
      var swapIndex = Math.floor(Math.random() * (index + 1));
      var tmp = out[index];
      out[index] = out[swapIndex];
      out[swapIndex] = tmp;
    }
    return out;
  }

  function cleanSentenceTokens(sentence) {
    return String(sentence || "").replace(/[^\w\s'-]/g, "").split(/\s+/).map(function (token) {
      return token.trim();
    }).filter(Boolean);
  }

  function meaningClue(entry) {
    return entry.definition || entry.sentence || ("Use " + entry.word + " in a lesson sentence.");
  }

  function blankedSentence(entry) {
    var sentence = entry.sentence || "";
    if (!sentence) return "It belongs in today's lesson language.";
    var regex = new RegExp(entry.word, "ig");
    return sentence.replace(regex, "_____");
  }

  function sampleDistractors(entries, targetWord, count) {
    return entries.filter(function (entry) {
      return entry.word !== targetWord;
    }).slice(0, count || 3).map(function (entry) {
      return entry.word;
    });
  }

  function deriveForbiddenWords(entry) {
    var banned = tokenize(entry.definition).slice(0, 2).concat(["thing", "word"]);
    return uniqueList(banned.filter(function (token) {
      return token !== entry.word;
    }), 4);
  }

  function splitMorphology(word, family) {
    var text = String(word || "").toLowerCase();
    var root = String(family || "").toLowerCase();
    if (!text) return [];
    if (root && text !== root && text.indexOf(root) > 0) {
      var start = text.indexOf(root);
      var prefixPart = text.slice(0, start);
      var suffixPart = text.slice(start + root.length);
      return [prefixPart, root, suffixPart].filter(Boolean);
    }
    var prefix = "";
    var rest = text;
    COMMON_PREFIXES.some(function (candidate) {
      if (text.indexOf(candidate) === 0 && text.length - candidate.length >= 3) {
        prefix = candidate;
        rest = text.slice(candidate.length);
        return true;
      }
      return false;
    });
    var suffix = "";
    COMMON_SUFFIXES.some(function (candidate) {
      if (rest.length - candidate.length >= 3 && rest.slice(-candidate.length) === candidate) {
        suffix = candidate;
        rest = rest.slice(0, -candidate.length);
        return true;
      }
      return false;
    });
    return [prefix, rest, suffix].filter(Boolean);
  }

  function buildWordQuestRows(entries, context) {
    return entries.slice(0, 18).map(function (entry, index) {
      return {
        id: "wq-bank-" + entry.word + "-" + index,
        source: "word-bank",
        word: entry.word,
        clue: meaningClue(entry),
        gradeBands: entry.gradeBands,
        subjects: entry.subjects
      };
    });
  }

  function buildWordConnectionsRows(entries, context) {
    return entries.slice(0, 16).map(function (entry, index) {
      return {
        id: "wc-bank-" + entry.word + "-" + index,
        source: "word-bank",
        target: entry.word,
        forbidden: deriveForbiddenWords(entry),
        scaffolds: uniqueList([
          "Use " + inferSubject(context) + " language from the lesson.",
          entry.sentence ? "Connect to this sentence frame: " + blankedSentence(entry) : "",
          "Define the term without using the target word."
        ], 3),
        requiredMove: "Explain " + entry.word + " in a lesson-specific sentence.",
        skillTag: String(context && context.skillFocus || "").trim() || "LIT.VOC.ACAD",
        gradeBands: entry.gradeBands,
        subjects: entry.subjects
      };
    });
  }

  function buildMorphologyRows(entries) {
    return entries.map(function (entry, index) {
      var solution = splitMorphology(entry.word, entry.morphologyFamily);
      if (solution.length < 2) return null;
      var extras = entry.morphologyFamily && entry.word.indexOf(entry.morphologyFamily) >= 0 && solution.indexOf(entry.morphologyFamily) < 0
        ? [entry.morphologyFamily]
        : [];
      return {
        id: "mb-bank-" + entry.word + "-" + index,
        source: "word-bank",
        prompt: "Build the lesson word " + entry.word + ".",
        tiles: shuffle(solution.concat(extras)).slice(0, Math.max(solution.length, 3)),
        solution: solution,
        meaningHint: meaningClue(entry),
        gradeBands: entry.gradeBands,
        subjects: entry.subjects
      };
    }).filter(Boolean).slice(0, 14);
  }

  function buildConceptLadderRows(entries, context) {
    return entries.slice(0, 14).map(function (entry, index) {
      var distractors = sampleDistractors(entries.slice(index + 1).concat(entries.slice(0, index)), entry.word, 3);
      return {
        id: "ladder-bank-" + entry.word + "-" + index,
        source: "word-bank",
        prompt: "Solve the lesson term.",
        clues: uniqueList([
          "This term belongs in " + inferSubject(context) + ".",
          entry.definition,
          blankedSentence(entry)
        ], 3),
        answer: entry.word,
        options: shuffle([entry.word].concat(distractors)).slice(0, 4),
        gradeBands: entry.gradeBands,
        subjects: entry.subjects
      };
    });
  }

  function buildErrorDetectiveRows(entries) {
    return entries.slice(0, 12).map(function (entry, index) {
      var distractor = entries[(index + 1) % entries.length] || entry;
      var correct = entry.word + " means " + meaningClue(entry).replace(/\.$/, "") + ".";
      var wrongDefinition = entry.word + " means " + meaningClue(distractor).replace(/\.$/, "") + ".";
      var vagueMove = "Use " + entry.word + " whenever the answer sounds academic.";
      return {
        id: "error-bank-" + entry.word + "-" + index,
        source: "word-bank",
        prompt: "Choose the correction that repairs the meaning.",
        misconception: "Definition precision",
        incorrectExample: wrongDefinition,
        options: shuffle([correct, wrongDefinition, vagueMove]).slice(0, 3),
        answer: correct,
        gradeBands: entry.gradeBands,
        subjects: entry.subjects
      };
    });
  }

  function buildRapidCategoryRows(entries, context) {
    var groups = [];
    var byFamily = {};
    entries.forEach(function (entry) {
      if (entry.morphologyFamily) {
        if (!byFamily[entry.morphologyFamily]) byFamily[entry.morphologyFamily] = [];
        byFamily[entry.morphologyFamily].push(entry.word);
      }
    });
    Object.keys(byFamily).forEach(function (family) {
      if (byFamily[family].length >= 4) {
        groups.push({
          id: "category-family-" + family,
          source: "word-bank",
          prompt: "Generate words connected to the " + family + " family.",
          category: family + " family",
          accepted: uniqueList(byFamily[family], 8)
        });
      }
    });
    if (!groups.length) {
      groups.push({
        id: "category-lesson-" + inferSubject(context).toLowerCase(),
        source: "word-bank",
        prompt: "Generate words connected to today's " + inferSubject(context) + " focus.",
        category: inferSubject(context) + " lesson terms",
        accepted: uniqueList(entries.slice(0, 8).map(function (entry) { return entry.word; }), 8)
      });
    }
    return groups.slice(0, 6);
  }

  function buildSentenceRows(entries, context) {
    return entries.filter(function (entry) {
      return entry.sentence;
    }).map(function (entry, index) {
      var solution = cleanSentenceTokens(entry.sentence);
      if (solution.length < 4 || solution.length > 12) return null;
      return {
        id: "sentence-bank-" + entry.word + "-" + index,
        source: "word-bank",
        prompt: "Build the sentence using " + entry.word + ".",
        scaffold: "Use the lesson word in a complete academic sentence.",
        requiredToken: entry.word,
        tiles: shuffle(solution),
        solution: solution,
        gradeBands: entry.gradeBands,
        subjects: entry.subjects
      };
    }).filter(Boolean).slice(0, 14);
  }

  function inferKeyboardZone(word) {
    var text = String(word || "").toLowerCase();
    if (!text) return "home row";
    if (/^[asdfjkl;]+$/.test(text)) return "home row";
    if (/^[asdfjkl;qwertyuiop]+$/.test(text)) return "home row + top row";
    if (/^[asdfjkl;zxcvbnm]+$/.test(text)) return "home row + bottom row";
    return "full keyboard";
  }

  function buildTypingRows(entries) {
    return entries.slice(0, 18).map(function (entry, index) {
      var focus = entry.morphologyFamily
        ? ("morphology family " + entry.morphologyFamily)
        : entry.phonics
          ? entry.phonics
          : (entry.word.length <= 5 ? "high-frequency pattern" : "multisyllable practice");
      return {
        id: "typing-bank-" + entry.word + "-" + index,
        source: "word-bank",
        prompt: "Type the lesson word.",
        target: entry.word,
        keyboardZone: inferKeyboardZone(entry.word),
        orthographyFocus: focus,
        fingerCue: entry.morphologyFamily
          ? ("Chunk " + entry.word + " by meaning parts before you type it.")
          : "Look across the whole word, then type with steady rhythm.",
        meaningHint: meaningClue(entry),
        gradeBands: entry.gradeBands,
        subjects: entry.subjects
      };
    });
  }

  function buildDynamicRows(gameId, context) {
    if (!STATIC_DYNAMIC_GAMES[gameId]) return [];
    var entries = selectWordBankEntries(context);
    if (!entries.length) return [];
    if (gameId === "word-quest") return buildWordQuestRows(entries, context);
    if (gameId === "word-connections") return buildWordConnectionsRows(entries, context);
    if (gameId === "morphology-builder") return buildMorphologyRows(entries);
    if (gameId === "concept-ladder") return buildConceptLadderRows(entries, context);
    if (gameId === "error-detective") return buildErrorDetectiveRows(entries);
    if (gameId === "rapid-category") return buildRapidCategoryRows(entries, context);
    if (gameId === "sentence-builder") return buildSentenceRows(entries, context);
    if (gameId === "word-typing") return buildTypingRows(entries, context);
    return [];
  }

  function filterStaticDeck(gameId, context) {
    var ctx = context && typeof context === "object" ? context : {};
    var gradeBand = normalizeGradeBand(ctx.gradeBand || ctx.grade || "K-2");
    var subject = inferSubject(ctx);
    var programId = String(ctx.programId || "").toLowerCase();
    var rows = (CONTENT[gameId] || []).filter(function (row) {
      var gradeOk = !row.gradeBands || row.gradeBands.some(function (band) {
        var text = String(band || "").toUpperCase();
        if (text === gradeBand) return true;
        if (text === "5-8") return gradeBand === "3-5" || gradeBand === "6-8";
        return normalizeGradeBand(text) === gradeBand;
      });
      var subjectOk = !row.subjects || row.subjects.indexOf(subject) >= 0 || (row.subjects.indexOf("ELA") >= 0 && subject === "Intervention");
      var programOk = !row.programs || !row.programs.length || row.programs.some(function (value) {
        return programId.indexOf(String(value || "").toLowerCase()) >= 0;
      });
      return gradeOk && subjectOk && programOk;
    });
    return rows.length ? rows : [];
  }

  function filterDeck(gameId, context) {
    var dynamic = buildDynamicRows(gameId, context);
    var rows = filterStaticDeck(gameId, context);
    if (dynamic.length) return dynamic.concat(rows);
    return rows;
  }

  function pickRound(gameId, context, history) {
    var rows = filterDeck(gameId, context);
    var used = {};
    (Array.isArray(history) ? history : []).forEach(function (row) {
      used[String(row && (row.label || row.prompt || row.word || row.target || row.answer || row.id) || "")] = true;
    });
    var unused = rows.filter(function (row) {
      return !used[String(row.prompt || row.word || row.target || row.answer || row.id || "")];
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
