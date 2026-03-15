(function gameShellModule(root, factory) {
  if (typeof module === "object" && module.exports) {
    module.exports = factory();
    return;
  }
  root.CSGameShell = factory();
})(typeof globalThis !== "undefined" ? globalThis : window, function createGameShellFactory() {
  "use strict";

  var runtimeRoot = typeof globalThis !== "undefined" ? globalThis : window;

  function normalizeGradeBand(value) {
    var raw = String(value || "").toUpperCase();
    if (raw === "K-2" || raw === "3-5" || raw === "6-8" || raw === "9-12") return raw;
    if (/K|1|2/.test(raw)) return "K-2";
    if (/3|4|5/.test(raw)) return "3-5";
    if (/6|7|8/.test(raw)) return "6-8";
    return "9-12";
  }

  function parseParams() {
    var params = new URLSearchParams(runtimeRoot.location.search || "");
    return {
      playMode: params.get("play") === "1",
      studentId: String(params.get("student") || "").trim(),
      classId: String(params.get("classId") || params.get("class") || params.get("blockId") || "").trim(),
      lessonContextId: String(params.get("lessonContextId") || "").trim(),
      subject: String(params.get("subject") || "").trim(),
      programId: String(params.get("programId") || "").trim(),
      gameId: String(params.get("game") || "").trim(),
      gradeBand: String(params.get("gradeBand") || params.get("grade") || "").trim(),
      lessonTitle: String(params.get("lesson") || "").trim(),
      skillFocus: String(params.get("skillFocus") || "").trim(),
      contentMode: String(params.get("contentMode") || "").trim(),
      typingPage: params.get("typingPage") === "1",
      typingCourseMode: String(params.get("typingCourseMode") || params.get("courseMode") || "").trim(),
      typingLessonId: String(params.get("lessonId") || "").trim(),
      typingLessonOrder: Math.max(0, Number(params.get("lessonOrder") || 0))
    };
  }

  function loadTeacherContext(params) {
    var context = {
      studentId: params.studentId,
      classId: params.classId,
      lessonContextId: params.lessonContextId,
      subject: params.subject,
      programId: params.programId,
      lessonTitle: params.lessonTitle,
      skillFocus: params.skillFocus,
      vocabularyFocus: params.skillFocus,
      contentMode: params.contentMode || "lesson"
    };
    var TeacherSelectors = runtimeRoot.CSTeacherSelectors || null;
    if (TeacherSelectors && typeof TeacherSelectors.loadCaseload === "function" && params.studentId) {
      var student = (TeacherSelectors.loadCaseload({ TeacherStorage: runtimeRoot.CSTeacherStorage }).filter(function (row) {
        return String(row.id || "") === params.studentId;
      })[0] || null);
      if (student) {
        context.studentName = student.name || "";
        context.gradeBand = normalizeGradeBand(student.gradeBand || student.grade || params.gradeBand || "K-2");
      }
    }
    if (!context.gradeBand) context.gradeBand = normalizeGradeBand(params.gradeBand || "K-2");
    if (TeacherSelectors && typeof TeacherSelectors.getLessonContext === "function" && params.lessonContextId) {
      var lesson = TeacherSelectors.getLessonContext(params.lessonContextId, { TeacherStorage: runtimeRoot.CSTeacherStorage }) || null;
      if (lesson) {
        context.lessonTitle = lesson.title || context.lessonTitle;
        context.subject = context.subject || lesson.subject || "";
        context.programId = context.programId || lesson.programId || "";
        context.conceptFocus = lesson.conceptFocus || "";
        context.vocabularyFocus = lesson.title || context.skillFocus || "";
      }
    }
    if (TeacherSelectors && typeof TeacherSelectors.buildClassContext === "function" && params.classId) {
      var block = TeacherSelectors.getBlockById ? TeacherSelectors.getBlockById(params.classId, "", { TeacherStorage: runtimeRoot.CSTeacherStorage }) : null;
      var classContext = TeacherSelectors.buildClassContext(block, { TeacherStorage: runtimeRoot.CSTeacherStorage }) || null;
      if (classContext) {
        context.classLabel = classContext.label || "";
        context.subject = context.subject || classContext.subject || "";
        context.programId = context.programId || classContext.curriculum || "";
        context.lessonTitle = context.lessonTitle || classContext.lesson || "";
        context.conceptFocus = context.conceptFocus || classContext.conceptFocus || "";
      }
    }
    context.subject = context.subject || (runtimeRoot.CSGameContentRegistry && runtimeRoot.CSGameContentRegistry.inferSubject
      ? runtimeRoot.CSGameContentRegistry.inferSubject(context)
      : "ELA");
    return context;
  }

  function appBasePath() {
    var path = String((runtimeRoot.location && runtimeRoot.location.pathname) || "");
    var markers = ["/CornerstoneMTSS/", "/WordQuest/"];
    for (var m = 0; m < markers.length; m += 1) {
      var marker = markers[m];
      var idx = path.indexOf(marker);
      if (idx >= 0) return path.slice(0, idx + marker.length);
    }
    try {
      var baseEl = runtimeRoot.document && runtimeRoot.document.querySelector && runtimeRoot.document.querySelector("base[href]");
      if (baseEl) {
        var baseUrl = new URL(baseEl.getAttribute("href"), runtimeRoot.location.href);
        var basePath = String(baseUrl.pathname || "");
        if (basePath) return basePath.endsWith("/") ? basePath : (basePath + "/");
      }
    } catch (_e) {}
    var dir = path.replace(/[^/]*$/, "");
    return dir || "/";
  }

  function withAppBase(path) {
    var clean = String(path || "").replace(/^\.?\//, "");
    return new URL(appBasePath() + clean, runtimeRoot.location.origin).toString();
  }

  function storageGet(key, fallback) {
    try {
      var raw = runtimeRoot.localStorage.getItem(key);
      return raw == null ? fallback : raw;
    } catch (_e) {
      return fallback;
    }
  }

  function storageSet(key, value) {
    try {
      runtimeRoot.localStorage.setItem(key, value);
    } catch (_e) {}
  }

  var GAME_MUSIC_ENABLED_KEY = "cs.game.music.enabled";
  var GAME_MUSIC_INDEX_KEY = "cs.game.music.index";
  var GAME_MUSIC_VOLUME_KEY = "cs.game.music.volume";
  var GAME_MUSIC_CATALOG_URL = "data/music-catalog.json";
  var sharedMusicState = {
    enabled: storageGet(GAME_MUSIC_ENABLED_KEY, "off") === "on",
    index: Math.max(0, Number(storageGet(GAME_MUSIC_INDEX_KEY, "0")) || 0),
    volume: Math.max(0.15, Math.min(0.6, Number(storageGet(GAME_MUSIC_VOLUME_KEY, "0.34")) || 0.34)),
    loading: false,
    ready: false,
    tracks: [],
    audio: null
  };

  function musicButtonLabel() {
    return sharedMusicState.enabled ? "Pause Music" : "Play Music";
  }

  function musicStatusLabel() {
    if (!sharedMusicState.ready || !sharedMusicState.tracks.length) {
      return sharedMusicState.enabled ? "Loading music" : "Music off";
    }
    var track = sharedMusicState.tracks[sharedMusicState.index] || sharedMusicState.tracks[0] || null;
    return sharedMusicState.enabled && track
      ? String(track.title || track.name || "Focus Flow")
      : "Music off";
  }

  function ensureMusicAudio() {
    if (sharedMusicState.audio) return sharedMusicState.audio;
    if (typeof runtimeRoot.Audio !== "function") return null;
    var audio = new runtimeRoot.Audio();
    audio.preload = "auto";
    audio.volume = sharedMusicState.volume;
    audio.addEventListener("ended", function () {
      stepSharedMusic(1, { preservePlayback: true });
    });
    sharedMusicState.audio = audio;
    return audio;
  }

  function normalizeMusicTrackList(raw) {
    return (Array.isArray(raw) ? raw : []).map(function (track, index) {
      var title = String(track && (track.title || track.name) || "").trim();
      var src = String(track && track.src || "").trim();
      if (!src) return null;
      return {
        id: String(track && track.id || ("track-" + String(index + 1))),
        title: title || ("Track " + String(index + 1)),
        src: src
      };
    }).filter(Boolean);
  }

  function loadSharedMusicCatalog() {
    if (sharedMusicState.ready) return Promise.resolve(sharedMusicState.tracks);
    if (sharedMusicState.loading) {
      return new Promise(function (resolve) {
        var wait = function () {
          if (!sharedMusicState.loading) {
            resolve(sharedMusicState.tracks);
            return;
          }
          runtimeRoot.setTimeout(wait, 60);
        };
        wait();
      });
    }
    sharedMusicState.loading = true;
    return runtimeRoot.fetch(GAME_MUSIC_CATALOG_URL, { cache: "no-store" })
      .then(function (response) { return response && response.ok ? response.json() : { tracks: [] }; })
      .then(function (catalog) {
        sharedMusicState.tracks = normalizeMusicTrackList(catalog && catalog.tracks);
        sharedMusicState.ready = true;
        if (sharedMusicState.tracks.length) {
          sharedMusicState.index = Math.max(0, Math.min(sharedMusicState.index, sharedMusicState.tracks.length - 1));
        } else {
          sharedMusicState.index = 0;
        }
        return sharedMusicState.tracks;
      })
      .catch(function () {
        sharedMusicState.tracks = [];
        sharedMusicState.ready = true;
        return sharedMusicState.tracks;
      })
      .finally(function () {
        sharedMusicState.loading = false;
      });
  }

  function syncSharedMusicUi() {
    Array.prototype.forEach.call(runtimeRoot.document.querySelectorAll("[data-music-label]"), function (node) {
      node.textContent = musicStatusLabel();
      node.setAttribute("title", musicStatusLabel());
    });
    Array.prototype.forEach.call(runtimeRoot.document.querySelectorAll("[data-action='toggle-music']"), function (button) {
      button.setAttribute("aria-pressed", sharedMusicState.enabled ? "true" : "false");
      if (button.classList.contains("cg-action")) {
        button.innerHTML = "♫ " + musicButtonLabel();
      } else {
        button.textContent = musicButtonLabel();
      }
    });
  }

  function playSharedMusicCurrentTrack() {
    var audio = ensureMusicAudio();
    if (!audio || !sharedMusicState.tracks.length) return Promise.resolve(false);
    var track = sharedMusicState.tracks[sharedMusicState.index] || sharedMusicState.tracks[0];
    if (!track) return Promise.resolve(false);
    audio.volume = sharedMusicState.volume;
    if (audio.getAttribute("data-track-src") !== track.src) {
      audio.src = track.src;
      audio.setAttribute("data-track-src", track.src);
    }
    return audio.play().then(function () {
      syncSharedMusicUi();
      return true;
    }).catch(function () {
      sharedMusicState.enabled = false;
      storageSet(GAME_MUSIC_ENABLED_KEY, "off");
      syncSharedMusicUi();
      return false;
    });
  }

  function stopSharedMusic() {
    if (sharedMusicState.audio) {
      try { sharedMusicState.audio.pause(); } catch (_error) {}
    }
    sharedMusicState.enabled = false;
    storageSet(GAME_MUSIC_ENABLED_KEY, "off");
    syncSharedMusicUi();
  }

  function startSharedMusic() {
    sharedMusicState.enabled = true;
    storageSet(GAME_MUSIC_ENABLED_KEY, "on");
    return loadSharedMusicCatalog().then(function () {
      return playSharedMusicCurrentTrack();
    });
  }

  function toggleSharedMusic() {
    if (sharedMusicState.enabled) {
      stopSharedMusic();
      return;
    }
    void startSharedMusic();
  }

  function stepSharedMusic(direction, options) {
    var settings = Object.assign({ preservePlayback: false }, options || {});
    return loadSharedMusicCatalog().then(function () {
      if (!sharedMusicState.tracks.length) return false;
      sharedMusicState.index = (sharedMusicState.index + sharedMusicState.tracks.length + (direction || 1)) % sharedMusicState.tracks.length;
      storageSet(GAME_MUSIC_INDEX_KEY, String(sharedMusicState.index));
      syncSharedMusicUi();
      if (sharedMusicState.enabled || settings.preservePlayback) {
        sharedMusicState.enabled = true;
        storageSet(GAME_MUSIC_ENABLED_KEY, "on");
        return playSharedMusicCurrentTrack();
      }
      return true;
    });
  }

  function guessState(guess, word) {
    var result = Array(word.length).fill("absent");
    var letters = word.split("");
    var guessLetters = guess.split("");
    guessLetters.forEach(function (letter, index) {
      if (letter === letters[index]) {
        result[index] = "correct";
        letters[index] = null;
        guessLetters[index] = null;
      }
    });
    guessLetters.forEach(function (letter, index) {
      if (letter && letters.indexOf(letter) >= 0) {
        result[index] = "present";
        letters[letters.indexOf(letter)] = null;
      }
    });
    return result;
  }

  function createGames(context) {
    var registry = runtimeRoot.CSGameContentRegistry;
    var WORD_CLUE_CUSTOM_CARDS_KEY = "cs.wordclue.customcards.v1";
    var WORD_CLUE_STARTER_DECKS_URL = "data/taboo-phonics-starter-decks.json";
    var WORD_CLUE_SUPPLEMENTAL_URL = "data/word-clue-supplemental-approved.json";
    var WORD_CLUE_OVERRIDES_URL = "data/word-clue-taboo-overrides.json";
    var WORD_CLUE_STARTER_CACHE_KEY = "cs.wordclue.starter.cache.v1";
    var trustedWordClueDeckState = {
      loaded: false,
      loading: false,
      cards: [],
      overrides: [],
      unmatchedTargets: [],
      starterCount: 0,
      matchedCount: 0
    };
    var wordClueRoundMemory = {
      lastTarget: "",
      altSetByTarget: Object.create(null)
    };

    function notifyTrustedWordClueDeckUpdate() {
      if (!runtimeRoot || typeof runtimeRoot.dispatchEvent !== "function") return;
      try {
        runtimeRoot.dispatchEvent(new runtimeRoot.CustomEvent("cs-word-clue-decks-updated", {
          detail: {
            loaded: trustedWordClueDeckState.loaded,
            loading: trustedWordClueDeckState.loading,
            starterCount: trustedWordClueDeckState.starterCount,
            matchedCount: trustedWordClueDeckState.matchedCount,
            unmatchedTargets: trustedWordClueDeckState.unmatchedTargets.slice()
          }
        }));
      } catch (_error) {}
    }

    function roundContext(input) {
      return Object.assign({}, input.context || {}, {
        customWordSet: input.settings && input.settings.customWordSet || "",
        wordSource: input.settings && input.settings.wordSource || input.context && input.context.wordSource || "",
        shuffleWordOrder: !!(input.settings && input.settings.shuffleWordOrder),
        contentMode: input.settings && input.settings.contentMode || input.context && input.context.contentMode || "lesson",
        difficulty: input.settings && input.settings.difficulty || "core",
        viewMode: input.settings && input.settings.viewMode || "individual",
        roundIndex: input.roundIndex || 0
      });
    }

    function parseTeacherWordList(value) {
      return String(value || "").split(/[\n,]/).map(function (item) {
        return String(item || "").trim().toLowerCase();
      }).filter(Boolean);
    }

    function wordConnectionsDifficultyCount(value) {
      var level = Math.max(1, Math.min(4, Number(value) || 3));
      return level + 1;
    }

    function wordConnectionsInstruction(mode) {
      if (mode === "draw") return "Draw the concept without writing the off-limits words.";
      if (mode === "act") return "Act it out charades-style without saying the off-limits words.";
      if (mode === "mixed") return "Choose whether to speak, draw, or act. Keep the off-limits words off limits.";
      return "Describe the word without saying the off-limits words.";
    }

    function wordClueVisualGlyph(keyword, targetWord) {
      var raw = normalizeWordKey(keyword || targetWord);
      var directMap = {
        dog: "🐶",
        cat: "🐱",
        bike: "🚲",
        pizza: "🍕",
        house: "🏠",
        sun: "☀️",
        rain: "🌧️",
        snow: "❄️",
        cloud: "☁️",
        star: "⭐",
        boat: "⛵",
        ship: "🚢",
        beach: "🏖️",
        bird: "🐦",
        seed: "🌱",
        fork: "🍴",
        coin: "🪙",
        storm: "⛈️",
        thunder: "⚡",
        winter: "⛄",
        team: "👥",
        park: "🌳",
        math: "➕",
        clean: "🧼",
        chain: "⛓️"
      };
      if (directMap[raw]) return directMap[raw];
      if (raw.indexOf("dog") >= 0) return "🐶";
      if (raw.indexOf("cat") >= 0) return "🐱";
      if (raw.indexOf("sun") >= 0) return "☀️";
      if (raw.indexOf("bike") >= 0) return "🚲";
      if (raw.indexOf("rain") >= 0) return "🌧️";
      if (raw.indexOf("snow") >= 0) return "❄️";
      if (raw.indexOf("cloud") >= 0) return "☁️";
      if (raw.indexOf("bird") >= 0) return "🐦";
      if (raw.indexOf("plant") >= 0 || raw.indexOf("seed") >= 0) return "🌱";
      if (raw.indexOf("math") >= 0 || raw.indexOf("number") >= 0) return "➕";
      return "🖼️";
    }

    function parseWordClueCards(raw, teacherCreated) {
      var list = [];
      if (!Array.isArray(raw)) return list;
      raw.forEach(function (card, index) {
        if (!card || typeof card !== "object") return;
        var targetWord = String(card.target_word || card.targetWord || "").trim();
        var forbiddenWords = Array.isArray(card.forbidden_words) ? card.forbidden_words : (Array.isArray(card.forbiddenWords) ? card.forbiddenWords : []);
        forbiddenWords = forbiddenWords.map(function (value) { return String(value || "").trim(); }).filter(Boolean).slice(0, 8);
        if (!targetWord || forbiddenWords.length < 2) return;
        var altSets = Array.isArray(card.alt_forbidden_sets) ? card.alt_forbidden_sets : [];
        altSets = altSets
          .map(function (set) { return Array.isArray(set) ? set.map(function (word) { return String(word || "").trim(); }).filter(Boolean) : []; })
          .filter(function (set) { return set.length >= 2; });
        list.push({
          id: String(card.id || ("wc-card-" + String(index + 1))),
          target_word: targetWord,
          grade_band: normalizeStarterGradeBand(card.grade_band || "K-1"),
          subject: String(card.subject || "ELA").toUpperCase(),
          difficulty: String(card.difficulty || "core").toLowerCase(),
          forbidden_words: forbiddenWords,
          alt_forbidden_sets: altSets,
          modes: Array.isArray(card.modes)
            ? card.modes.map(function (mode) {
                var normalizedMode = String(mode || "").trim().toLowerCase();
                return normalizedMode === "challenge" ? "mixed" : normalizedMode;
              }).filter(Boolean)
            : ["classic", "picture", "draw", "act", "mixed"],
          image_keyword: String(card.image_keyword || "").trim(),
          image_supported: card.image_supported !== false,
          acting_prompt: String(card.acting_prompt || "").trim(),
          drawing_prompt: String(card.drawing_prompt || "").trim(),
          curriculum_tag: String(card.curriculum_tag || "").trim(),
          teacher_created: teacherCreated === true || card.teacher_created === true
        });
      });
      return list;
    }

    function normalizeStarterGradeBand(value) {
      var band = String(value || "").trim().toUpperCase().replace(/\s+/g, "");
      if (band === "K-1" || band === "G2-3" || band === "G4-5") return band;
      if (band === "K-2") return "K-1";
      if (band === "3-5") return "G2-3";
      return "K-1";
    }

    function wordClueBandRank(value) {
      var band = normalizeStarterGradeBand(value);
      if (band === "G4-5") return 3;
      if (band === "G2-3") return 2;
      return 1;
    }

    function wordClueMaxWordLength(gradeBand) {
      var band = normalizeStarterGradeBand(gradeBand);
      if (band === "G4-5") return 12;
      if (band === "G2-3") return 10;
      return 8;
    }

    function wordClueLooksAbstract(word) {
      var normalized = normalizeWordKey(word);
      if (!normalized) return true;
      return [
        "analy", "argu", "claim", "concept", "context", "decompose", "evidence",
        "equivalent", "fraction", "hypothesis", "infer", "justify", "method",
        "perspective", "process", "ratio", "rhetoric", "summar", "syntax",
        "theme", "variable"
      ].some(function (stem) {
        return normalized.indexOf(stem) >= 0;
      });
    }

    function wordClueIsGuessFriendlyWord(word, gradeBand) {
      var normalized = normalizeWordKey(word);
      if (!normalized) return false;
      if (!/^[a-z]+(?: [a-z]+)?$/.test(normalized)) return false;
      if (normalized.indexOf(" ") >= 0) return false;
      if (normalized.length > wordClueMaxWordLength(gradeBand)) return false;
      if (wordClueLooksAbstract(normalized) && wordClueBandRank(gradeBand) < 3) return false;
      return true;
    }

    function wordClueCardIsStudentSafe(card, gradeBand) {
      if (!card || !wordClueIsGuessFriendlyWord(card.target_word, gradeBand)) return false;
      var blocked = getWordClueTabooSets(card)[0] || [];
      if (blocked.length < 2) return false;
      return blocked.every(function (word) {
        return wordClueIsGuessFriendlyWord(word, gradeBand);
      });
    }

    function wordClueAllowedGradeBand(cardBand, requestedBand) {
      return wordClueBandRank(cardBand || "K-1") <= wordClueBandRank(requestedBand || "K-1");
    }

    function normalizeWordKey(value) {
      return String(value || "").trim().toLowerCase().replace(/\s+/g, " ");
    }

    function extractWordBankWordSet() {
      var data = runtimeRoot && runtimeRoot.WQ_WORD_DATA && typeof runtimeRoot.WQ_WORD_DATA === "object"
        ? runtimeRoot.WQ_WORD_DATA
        : {};
      var set = Object.create(null);
      Object.keys(data).forEach(function (key) {
        var entry = data[key] || {};
        var raw = entry.display_word || key || "";
        var normalized = normalizeWordKey(raw);
        if (normalized) set[normalized] = true;
      });
      return set;
    }

    function resolveWordBankMatch(targetWord, wordBankWords) {
      var normalized = normalizeWordKey(targetWord);
      if (wordBankWords[normalized]) return { matched: true, canonical: normalized, strategy: "exact" };
      if (normalized.endsWith("ed")) {
        var baseEd = normalized.slice(0, -2);
        if (wordBankWords[baseEd]) return { matched: true, canonical: baseEd, strategy: "lemma-ed" };
      }
      if (normalized.endsWith("ing")) {
        var baseIng = normalized.slice(0, -3);
        var baseIngE = baseIng + "e";
        if (wordBankWords[baseIng]) return { matched: true, canonical: baseIng, strategy: "lemma-ing" };
        if (wordBankWords[baseIngE]) return { matched: true, canonical: baseIngE, strategy: "lemma-ing-e" };
      }
      return { matched: false, canonical: normalized, strategy: "none" };
    }

    function normalizeStarterCards(raw) {
      return (Array.isArray(raw) ? raw : []).map(function (card) {
        var altSets = Array.isArray(card.alt_taboo_sets)
          ? card.alt_taboo_sets
          : (Array.isArray(card.alt_forbidden_sets) ? card.alt_forbidden_sets : []);
        altSets = altSets.map(function (set) {
          return Array.isArray(set)
            ? set.map(function (word) { return String(word || "").trim(); }).filter(Boolean)
            : [];
        }).filter(function (set) { return set.length >= 2; });
        return {
          id: String(card.deck_id || "deck") + "__" + String(card.id || Date.now()),
          deck_id: String(card.deck_id || "").trim(),
          grade_band: normalizeStarterGradeBand(card.grade_band || ""),
          target_word: String(card.target_word || "").trim(),
          marked_word: String(card.marked_word || card.target_word || "").trim(),
          taboo_words: Array.isArray(card.taboo_words) ? card.taboo_words.map(function (word) { return String(word || "").trim(); }).filter(Boolean) : [],
          alt_forbidden_sets: altSets,
          definition: String(card.definition || "").trim(),
          example_sentence: String(card.example_sentence || "").trim(),
          image_keyword: String(card.target_word || "").trim(),
          image_supported: true,
          teacher_created: false
        };
      }).filter(function (card) {
        return card.target_word && card.taboo_words.length >= 2;
      });
    }

    function normalizeWordClueOverrides(raw) {
      return (Array.isArray(raw) ? raw : []).map(function (item) {
        var tabooWords = Array.isArray(item.taboo_words)
          ? item.taboo_words.map(function (word) { return String(word || "").trim(); }).filter(Boolean)
          : [];
        var altSets = Array.isArray(item.alt_taboo_sets)
          ? item.alt_taboo_sets
          : (Array.isArray(item.alt_forbidden_sets) ? item.alt_forbidden_sets : []);
        altSets = altSets.map(function (set) {
          return Array.isArray(set)
            ? set.map(function (word) { return String(word || "").trim(); }).filter(Boolean)
            : [];
        }).filter(function (set) { return set.length >= 2; });
        return {
          deck_id: String(item.deck_id || "").trim(),
          target_word: normalizeWordKey(item.target_word || ""),
          taboo_words: tabooWords,
          alt_forbidden_sets: altSets
        };
      }).filter(function (item) {
        return item.deck_id && item.target_word && item.taboo_words.length >= 2;
      });
    }

    function applyWordClueOverrides(cards) {
      var overrides = Array.isArray(trustedWordClueDeckState.overrides) ? trustedWordClueDeckState.overrides : [];
      if (!overrides.length) return cards;
      var map = Object.create(null);
      overrides.forEach(function (item) {
        var key = String(item.deck_id) + "::" + String(item.target_word);
        map[key] = item;
      });
      return cards.map(function (card) {
        var key = String(card.deck_id || "") + "::" + normalizeWordKey(card.target_word || "");
        var override = map[key];
        if (!override) return card;
        return Object.assign({}, card, {
          taboo_words: override.taboo_words.slice(),
          alt_forbidden_sets: override.alt_forbidden_sets.slice()
        });
      });
    }

    function setTrustedWordClueCards(rawStarterCards) {
      var starter = normalizeStarterCards(rawStarterCards);
      var wordBankWords = extractWordBankWordSet();
      var unmatched = [];
      var matched = starter.reduce(function (acc, card) {
        var resolved = resolveWordBankMatch(card.target_word, wordBankWords);
        if (!resolved.matched) {
          unmatched.push(card.target_word);
          return acc;
        }
        acc.push(Object.assign({}, card, {
          word_bank_word: resolved.canonical,
          match_strategy: resolved.strategy
        }));
        return acc;
      }, []);
      matched = applyWordClueOverrides(matched);
      trustedWordClueDeckState.cards = matched;
      trustedWordClueDeckState.unmatchedTargets = Object.keys(unmatched.reduce(function (acc, word) {
        acc[String(word)] = true;
        return acc;
      }, {})).sort();
      trustedWordClueDeckState.starterCount = starter.length;
      trustedWordClueDeckState.matchedCount = matched.length;
      trustedWordClueDeckState.loaded = true;
      storageSet(WORD_CLUE_STARTER_CACHE_KEY, JSON.stringify(starter));
      if (runtimeRoot.console && typeof runtimeRoot.console.info === "function") {
        runtimeRoot.console.info("[WordClue] Starter cards loaded:", trustedWordClueDeckState.starterCount);
        runtimeRoot.console.info("[WordClue] Matched to word bank:", trustedWordClueDeckState.matchedCount);
        if (trustedWordClueDeckState.unmatchedTargets.length) {
          runtimeRoot.console.info("[WordClue] Starter-only targets kept outside the live word bank:", trustedWordClueDeckState.unmatchedTargets);
        }
      }
      notifyTrustedWordClueDeckUpdate();
    }

    function normalizeSupplementalCards(raw) {
      return (Array.isArray(raw) ? raw : []).map(function (card) {
        return {
          id: String(card.deck_id || "supplemental") + "__" + String(card.id || Date.now()),
          deck_id: String(card.deck_id || "word_clue_supplemental_k1").trim(),
          grade_band: normalizeStarterGradeBand(card.grade_band || "K-1"),
          target_word: String(card.target_word || "").trim(),
          marked_word: String(card.marked_word || card.target_word || "").trim(),
          taboo_words: Array.isArray(card.taboo_words) ? card.taboo_words.map(function (word) { return String(word || "").trim(); }).filter(Boolean) : [],
          definition: String(card.definition || "").trim(),
          example_sentence: String(card.example_sentence || "").trim(),
          image_keyword: String(card.target_word || "").trim(),
          image_supported: true,
          teacher_created: false,
          source: String(card.source || "supplemental_word_clue"),
          approved_for_word_clue: card.approved_for_word_clue === true
        };
      }).filter(function (card) {
        return card.approved_for_word_clue === true && card.target_word && card.taboo_words.length >= 2;
      });
    }

    function mergeSupplementalIntoTrustedDeck(rawSupplementalCards) {
      var supplemental = normalizeSupplementalCards(rawSupplementalCards);
      if (!supplemental.length) return;
      var existing = Object.create(null);
      trustedWordClueDeckState.cards.forEach(function (card) {
        existing[String(card.id)] = true;
      });
      supplemental.forEach(function (card) {
        if (existing[String(card.id)]) return;
        trustedWordClueDeckState.cards.push(card);
      });
      trustedWordClueDeckState.cards = applyWordClueOverrides(trustedWordClueDeckState.cards);
      trustedWordClueDeckState.matchedCount = trustedWordClueDeckState.cards.length;
      if (runtimeRoot.console && typeof runtimeRoot.console.info === "function") {
        runtimeRoot.console.info("[WordClue] Supplemental approved cards added:", supplemental.length);
      }
      notifyTrustedWordClueDeckUpdate();
    }

    function ensureTrustedWordClueDecksLoaded() {
      if (trustedWordClueDeckState.loaded || trustedWordClueDeckState.loading) return;
      var cached = storageGet(WORD_CLUE_STARTER_CACHE_KEY, "");
      if (cached) {
        try {
          setTrustedWordClueCards(JSON.parse(cached));
          return;
        } catch (_e) {}
      }
      trustedWordClueDeckState.loading = true;
      if (typeof runtimeRoot.fetch === "function") {
        runtimeRoot.fetch(WORD_CLUE_OVERRIDES_URL, { cache: "no-store" })
          .then(function (response) { return response && response.ok ? response.json() : []; })
          .catch(function () { return []; })
          .then(function (overridesRaw) {
            trustedWordClueDeckState.overrides = normalizeWordClueOverrides(overridesRaw);
            return runtimeRoot.fetch(WORD_CLUE_STARTER_DECKS_URL, { cache: "no-store" })
              .then(function (response) { return response && response.ok ? response.json() : []; });
          })
          .then(function (starter) {
            setTrustedWordClueCards(starter);
            return runtimeRoot.fetch(WORD_CLUE_SUPPLEMENTAL_URL, { cache: "no-store" })
              .then(function (response) { return response && response.ok ? response.json() : []; })
              .then(function (supplemental) { mergeSupplementalIntoTrustedDeck(supplemental); })
              .catch(function () {});
          })
          .catch(function (error) {
            if (runtimeRoot.console && typeof runtimeRoot.console.error === "function") {
              runtimeRoot.console.error("[WordClue] Failed to load trusted starter decks", error);
            }
            trustedWordClueDeckState.loaded = true;
            trustedWordClueDeckState.cards = [];
            notifyTrustedWordClueDeckUpdate();
          })
          .finally(function () {
            trustedWordClueDeckState.loading = false;
            notifyTrustedWordClueDeckUpdate();
          });
      } else {
        trustedWordClueDeckState.loaded = true;
        trustedWordClueDeckState.cards = [];
        trustedWordClueDeckState.loading = false;
        notifyTrustedWordClueDeckUpdate();
      }
    }

    function loadWordClueCustomCards() {
      try {
        return parseWordClueCards(JSON.parse(storageGet(WORD_CLUE_CUSTOM_CARDS_KEY, "[]")), true);
      } catch (_e) {
        return [];
      }
    }

    function getWordClueTabooSets(card) {
      if (!card || typeof card !== "object") return [[]];
      var primary = Array.isArray(card.taboo_words)
        ? card.taboo_words
        : (Array.isArray(card.forbidden_words) ? card.forbidden_words : []);
      var alt = Array.isArray(card.alt_forbidden_sets)
        ? card.alt_forbidden_sets
        : (Array.isArray(card.alt_taboo_sets) ? card.alt_taboo_sets : []);
      var sets = [primary].concat(alt);
      sets = sets.map(function (set) {
        return Array.isArray(set) ? set.map(function (word) { return String(word || "").trim(); }).filter(Boolean) : [];
      }).filter(function (set) { return set.length >= 2; });
      return sets.length ? sets : [[]];
    }

    function buildWordClueDeck(input, mode, difficultyCount) {
      var settings = input && input.settings || {};
      var customTargets = parseTeacherWordList(settings.customWordSet || "");
      var requestedGradeBand = normalizeStarterGradeBand(settings.wordClueGradeBand || input && input.context && input.context.gradeBand || "K-2");
      var filters = {
        gradeBand: requestedGradeBand,
        subject: String(settings.wordClueSubject || "ELA").toUpperCase(),
        curriculum: String(settings.wordClueCurriculum || "").trim().toLowerCase(),
        roundType: String(settings.wordClueRoundType || mode || "any").toLowerCase(),
        difficulty: String(settings.wordClueDifficulty || "").toLowerCase()
      };
      var normalizedMode = String(mode || "speak").toLowerCase();
      var normalizedRoundType = normalizedMode === "speak"
        ? (String(settings.wordClueCardStyle || "").toLowerCase() === "mixed" ? "mixed" : "classic")
        : normalizedMode;
      ensureTrustedWordClueDecksLoaded();
      var deck = trustedWordClueDeckState.cards.slice().concat(loadWordClueCustomCards());
      if (!deck.length && trustedWordClueDeckState.loading && !trustedWordClueDeckState.loaded) {
        return {
          pending: true,
          filters: filters
        };
      }
      deck = deck.filter(function (card) {
        return wordClueAllowedGradeBand(card.grade_band || "K-1", requestedGradeBand);
      });
      deck = deck.filter(function (card) {
        return wordClueCardIsStudentSafe(card, requestedGradeBand);
      });
      if (String(settings.contentMode || "").toLowerCase() !== "custom") {
        deck = deck.filter(function (card) {
          return Boolean(card && card.word_bank_word);
        });
      }
      deck = deck.filter(function (card) {
        if (filters.gradeBand && filters.gradeBand !== "ALL" && !wordClueAllowedGradeBand(card.grade_band, filters.gradeBand)) return false;
        if (settings.wordClueDeckId && String(settings.wordClueDeckId).trim() && String(card.deck_id) !== String(settings.wordClueDeckId).trim()) return false;
        if (filters.curriculum && String(card.deck_id || "").toLowerCase().indexOf(filters.curriculum) === -1) return false;
        if (filters.roundType === "picture") return card.image_supported;
        if (filters.roundType === "draw") return normalizedRoundType === "draw" || normalizedRoundType === "act" || normalizedRoundType === "mixed" || normalizedRoundType === "classic";
        if (filters.roundType === "act") return normalizedRoundType === "act" || normalizedRoundType === "classic";
        return true;
      });
      if (String(settings.contentMode || "").toLowerCase() === "custom" && customTargets.length) {
        deck = deck.filter(function (card) {
          return customTargets.indexOf(normalizeWordKey(card.target_word || "")) >= 0;
        });
      }
      deck = settings.shuffleWordOrder
        ? shuffle(deck)
        : deck.slice().sort(function (a, b) { return String(a.target_word).localeCompare(String(b.target_word)); });
      var previousId = String((input.history || []).slice(-1)[0] || "");
      var filtered = deck.filter(function (card) { return String(card.id) !== previousId && String(card.target_word).toLowerCase() !== String(wordClueRoundMemory.lastTarget || "").toLowerCase(); });
      var picked = (filtered[0] || deck[0] || null);
      if (!picked) return null;
      var allSets = getWordClueTabooSets(picked);
      var targetKey = String(picked.target_word || "").toLowerCase();
      var nextSetIndex = (Number(wordClueRoundMemory.altSetByTarget[targetKey]) || 0) % allSets.length;
      wordClueRoundMemory.altSetByTarget[targetKey] = nextSetIndex + 1;
      var blocked = (allSets[nextSetIndex] || []).slice(0, Math.max(2, difficultyCount));
      wordClueRoundMemory.lastTarget = String(picked.target_word || "");
      var previewTargets = filtered
        .filter(function (card) { return String(card.id) !== String(picked.id); })
        .slice(0, 3)
        .map(function (card) { return String(card.target_word || "").trim(); })
        .filter(Boolean);
      return {
        card: picked,
        forbiddenWords: blocked,
        previewTargets: previewTargets,
        filters: filters
      };
    }

    return {
      "word-quest": {
        id: "word-quest",
        title: "Word Quest",
        subtitle: "Crack the clue, test your guess, and lock in the lesson word before the round ends.",
        tags: ["Clue Chase", "Fast Entry", "Timed or Untimed"],
        modeLabel: "Guess",
        baseTimerSeconds: 75,
        roundTarget: 6,
        createRound: function (input) {
          var row = registry.pickRound("word-quest", roundContext(input), input.history) || {};
          return {
            id: row.id || ("wq-" + Date.now()),
            promptLabel: "Crack the clue and find the word.",
            entryLabel: (input.roundIndex || 0) % 3 === 1
              ? "Fast start: read the clue and lock one strong guess."
              : (input.roundIndex || 0) % 3 === 2
                ? "Think about the meaning before the spelling."
                : (row.clue || "A new clue is on the board."),
            prompt: row.clue || "New clue ready.",
            answer: String(row.word || "trace").toLowerCase(),
            timerSeconds: 75,
            hint: "Look for a word tied to " + (input.context.subject || "today's lesson") + ". Try the idea before the exact spelling.",
            basePoints: 110
          };
        },
        evaluateRound: function (payload) {
          var response = payload.response || {};
          var round = payload.round || {};
          if (response.teacherOverride) return { correct: true, teacherOverride: true, message: "Teacher moved the team to the next word." };
          if (response.timedOut) return { correct: false, message: "Time ended. The word was " + String(round.answer || "").toUpperCase() + "." };
          var guess = String(response.value || "").trim().toLowerCase();
          if (!guess) return { correct: false, message: "No guess submitted. The word was " + String(round.answer || "").toUpperCase() + "." };
          if (guess === round.answer) return { correct: true, message: "Locked in. " + String(round.answer || "").toUpperCase() + " is correct." };
          var states = guessState(guess, round.answer);
          var hitCount = states.filter(function (value) { return value === "correct" || value === "present"; }).length;
          return {
            correct: false,
            nearMiss: hitCount >= Math.max(1, Math.floor(round.answer.length / 2)),
            message: hitCount ? "Close read. The word was " + String(round.answer || "").toUpperCase() + "." : "Not this round. The word was " + String(round.answer || "").toUpperCase() + ".",
            evaluation: states
          };
        }
      },
      "word-typing": {
        id: "word-typing",
        title: "Typing Quest",
        subtitle: "Type the lesson word, lock the spelling pattern, and build keyboard confidence through real literacy practice.",
        tags: ["Typing + Literacy", "Orthographic Mapping", "Home Row to Full Keyboard"],
        modeLabel: "Type",
        baseTimerSeconds: 50,
        roundTarget: 1,
        resolveRoundTarget: function (input) {
          var currentContext = input && input.context || {};
          return String(currentContext.typingCourseMode || "").toLowerCase() === "placement" ? 4 : 1;
        },
        createRound: function (input) {
          var currentContext = roundContext(input);
          var deck = registry.filterDeck("word-typing", currentContext) || [];
          var row = registry.pickRound("word-typing", currentContext, input.history) || {};
          var lessonIndex = deck.findIndex(function (item) { return item && item.id === row.id; });
          var unitDeck = deck.filter(function (item) {
            return String(item && item.unitLabel || "") === String(row.unitLabel || "");
          });
          var unitIndex = unitDeck.findIndex(function (item) { return item && item.id === row.id; });
          var lessonTotal = deck.length || 1;
          var unitTotal = unitDeck.length || 1;
          return {
            id: row.id || ("typing-" + Date.now()),
            promptLabel: String(currentContext.typingCourseMode || "").toLowerCase() === "placement"
              ? "Placement check"
              : (row.prompt || "Begin the typing lesson."),
            entryLabel: input.settings.viewMode === "projector" || input.settings.viewMode === "classroom"
              ? "Model the pattern first, then type the lesson target together."
              : "Eyes on the full target. Accuracy first, then rhythm.",
            prompt: row.prompt || "Type the lesson target.",
            target: String(row.target || "fjfj").toUpperCase(),
            keyboardZone: row.keyboardZone || "home row",
            orthographyFocus: row.orthographyFocus || "high-frequency pattern",
            fingerCue: row.fingerCue || "Look across the whole word before you type.",
            hint: row.meaningHint || "Notice the spelling chunk that stays stable in the word.",
            swbat: row.swbat || "I can type the lesson target with accuracy and rhythm.",
            unitLabel: row.unitLabel || "Unit 0",
            lessonLabel: row.lessonLabel || ("Lesson " + String(Math.max(1, lessonIndex + 1))),
            stageLabel: row.stageLabel || "Typing practice",
            typingKind: row.typingKind || "word",
            lessonOrder: Number(row.lessonOrder || lessonIndex + 1 || 1),
            heartLetters: row.heartLetters || "",
            masteryGoalWpm: Number(row.masteryGoalWpm || 12),
            masteryGoalAccuracy: Number(row.masteryGoalAccuracy || 95),
            sequenceIndex: lessonIndex >= 0 ? lessonIndex + 1 : 1,
            sequenceTotal: lessonTotal,
            unitIndex: unitIndex >= 0 ? unitIndex + 1 : 1,
            unitTotal: unitTotal,
            courseMode: String(currentContext.typingCourseMode || "").toLowerCase() === "placement" ? "placement" : "lesson",
            placementRequired: currentContext.typingPlacementRequired === true,
            unitPath: unitDeck.slice(0, 8).map(function (item, index) {
              var itemOrder = Number(item && item.lessonOrder || index + 1);
              return {
                id: item.id,
                order: itemOrder,
                label: item.lessonLabel || ("Lesson " + String(index + 1)),
                shortLabel: item.target || item.stageLabel || ("L" + String(index + 1)),
                locked: String(currentContext.typingCourseMode || "").toLowerCase() === "lesson" && itemOrder > Number(currentContext.typingUnlockedOrder || 1),
                completed: Array.isArray(currentContext.typingCompletedLessons) && currentContext.typingCompletedLessons.indexOf(item.id) >= 0
              };
            }),
            timerSeconds: Number(row.timerSeconds || (row.typingKind === "phrase" ? 65 : row.typingKind === "keys" ? 35 : 50)),
            basePoints: 115
          };
        },
        evaluateRound: function (payload) {
          var response = payload.response || {};
          var round = payload.round || {};
          if (response.teacherOverride) return { correct: true, teacherOverride: true, message: "Teacher moved the class to the next typing word." };
          if (response.timedOut) return { correct: false, message: "Time ended. The word was " + String(round.target || "").toUpperCase() + "." };
          var typed = lockTypingProgress(String(response.value || ""), round.target || "");
          var target = String(round.target || "").toUpperCase();
          var stats = response.stats || null;
          if (!typed) return { correct: false, message: "No word typed. The target was " + target.toUpperCase() + "." };
          if (typed === target) {
            return {
              correct: true,
              message: stats
                ? ("Typed cleanly at " + stats.wpm + " WPM and " + stats.accuracy + "% accuracy.")
                : "Typed cleanly. Pattern locked in.",
              evaluation: typingEvaluation(target, typed),
              stats: stats
            };
          }
          var hitCount = typingMeaningfulCharCount(typed);
          var targetCount = Math.max(1, typingMeaningfulCharCount(target));
          return {
            correct: false,
            nearMiss: hitCount >= Math.max(1, Math.floor(targetCount / 2)),
            message: hitCount ? "Close. Recheck the next chunk and type it again." : "Reset the pattern and type it once more.",
            evaluation: typingEvaluation(target, typed),
            stats: stats
          };
        }
      },
      "word-connections": {
        id: "word-connections",
        title: "Off Limits",
        subtitle: "Give a smart clue so your team can guess the lesson word without using the off-limits words on the card.",
        tags: ["Team Guessing", "Academic Language", "Projector Ready"],
        modeLabel: "Clue",
        baseTimerSeconds: 60,
        roundTarget: 6,
        createRound: function (input) {
          var currentContext = roundContext(input);
          var tabooMode = String(input.settings && input.settings.wordConnectionsMode || "speak").toLowerCase();
          var presentationMode = tabooMode;
          if (tabooMode === "mixed") {
            presentationMode = ["speak", "draw", "act"][Number(input.roundIndex || 0) % 3];
          }
          var tabooDifficulty = Math.max(1, Math.min(4, Number(input.settings && input.settings.wordConnectionsDifficulty) || 3));
          var desiredBlockedCount = wordConnectionsDifficultyCount(tabooDifficulty);
          var cardPick = buildWordClueDeck(input, tabooMode, desiredBlockedCount);
          var row = (cardPick && cardPick.card) ? cardPick.card : null;
          if (!row) {
            row = {
              id: cardPick && cardPick.pending ? "wc-loading" : "wc-fallback",
              target_word: cardPick && cardPick.pending ? "Loading cards…" : "No matching cards",
              taboo_words: [],
              grade_band: "K-1",
              subject: "ELA",
              curriculum_tag: cardPick && cardPick.pending
                ? "Trusted Word Clue deck is loading"
                : "Adjust grade/deck filters",
              drawing_prompt: "",
              acting_prompt: "",
              image_supported: false,
              image_keyword: "",
              teacher_created: false
            };
            cardPick = { card: row, forbiddenWords: row.taboo_words };
          }
          var resolvedForbidden = (cardPick.forbiddenWords || (Array.isArray(row.taboo_words) ? row.taboo_words : row.forbidden_words) || []).slice(0, desiredBlockedCount);
          var normalizedTarget = String(row.target_word || "").trim();
          var normalizedForbidden = resolvedForbidden.map(function (word) { return String(word || "").trim().toLowerCase(); }).filter(Boolean);
          if (normalizedForbidden.indexOf(normalizedTarget.toLowerCase()) >= 0) {
            if (runtimeRoot && runtimeRoot.console && typeof runtimeRoot.console.error === "function") {
              runtimeRoot.console.error("[WordClue] Invalid card data: target appears in forbidden set", {
                id: row.id,
                target: normalizedTarget,
                forbidden: resolvedForbidden
              });
            }
          }
          return {
            id: row.id || ("wc-" + Date.now()),
            promptLabel: "Clue the word without using the off-limits words.",
            entryLabel: (input.settings.viewMode === "projector" || input.settings.viewMode === "classroom"
              ? "One speaker clues. The group locks the guess."
              : "Give just enough clues so a partner can name the word."),
            targetWord: normalizedTarget || "House",
            forbiddenWords: resolvedForbidden.map(function (word) { return String(word || "").trim(); }).filter(Boolean),
            scaffolds: [row.curriculum_tag || ("Grade " + row.grade_band + " " + row.subject)],
            requiredMove: (presentationMode === "draw"
                ? (row.drawing_prompt || "Draw the concept with no letters or numbers.")
                : presentationMode === "act"
                  ? (row.acting_prompt || "Act out the idea with movement only.")
                  : "Give a clue that points to meaning, use, or context.") || (input.settings.viewMode === "projector" || input.settings.viewMode === "classroom"
              ? "Give one clean clue the whole class can build on without saying the off-limits words."
              : "Use a clear clue in one or two complete sentences that fit the lesson."),
            timerSeconds: 45,
            hint: (row.curriculum_tag || "") || "Try an example, function, or comparison instead of a definition.",
            playMode: tabooMode,
            presentationMode: presentationMode,
            modeInstruction: wordConnectionsInstruction(presentationMode),
            blockedCount: desiredBlockedCount,
            imageSrc: "",
            visualGlyph: row.image_supported ? wordClueVisualGlyph(row.image_keyword, row.target_word) : "",
            previewTargets: Array.isArray(cardPick.previewTargets) ? cardPick.previewTargets.slice(0, 3) : [],
            gradeBand: normalizeStarterGradeBand(row.grade_band || "K-1"),
            subject: row.subject || String(currentContext.subject || "ELA").toUpperCase(),
            curriculumTag: row.curriculum_tag || "",
            teacherCreated: Boolean(row.teacher_created),
            drawingPrompt: row.drawing_prompt || "",
            actingPrompt: row.acting_prompt || "",
            cardRecordId: row.id || "",
            basePoints: 100
          };
        },
        evaluateRound: function (payload) {
          var response = payload.response || {};
          var round = payload.round || {};
          if (response.teacherOverride) return { correct: true, teacherOverride: true, message: "Teacher counted the clue as a successful round." };
          if (response.timedOut) return { correct: false, message: "Round ended. Next time, clue " + round.targetWord + " with fewer filler words." };
          var text = String(response.value || "").toLowerCase();
          var blocked = (round.forbiddenWords || []).some(function (word) {
            return text.indexOf(String(word || "").toLowerCase()) >= 0;
          });
          var usesTarget = text.indexOf(String(round.targetWord || "").toLowerCase()) >= 0;
          if (usesTarget && !blocked && text.split(/\s+/).filter(Boolean).length >= 4) {
            return { correct: true, message: "Strong clue. The off-limits words stayed out." };
          }
          if (blocked) {
            return { correct: false, nearMiss: false, forbidden: true, message: "Off-limits word used — find a different angle." };
          }
          return {
            correct: false,
            nearMiss: text.length > 12,
            message: "Close. Add one more useful clue."
          };
        }
      },
      "morphology-builder": {
        id: "morphology-builder",
        title: "Build the Word",
        subtitle: "Snap roots, prefixes, and suffixes together to build a real lesson word and unlock its meaning.",
        tags: ["Roots and Affixes", "Tap to Build", "Meaning Link"],
        modeLabel: "Forge",
        baseTimerSeconds: 70,
        roundTarget: 6,
        createRound: function (input) {
          var row = registry.pickRound("morphology-builder", roundContext(input), input.history) || {};
          return {
            id: row.id || ("mb-" + Date.now()),
            promptLabel: row.prompt || "Forge the word.",
            entryLabel: "Build the target word from its parts.",
            prompt: row.prompt || "Forge the word.",
            tiles: (row.tiles || []).slice(),
            solution: (row.solution || []).slice(),
            hint: row.meaningHint || "Use what each part means to test your build.",
            timerSeconds: 70,
            meaningHint: row.meaningHint || "",
            basePoints: 105
          };
        },
        evaluateRound: function (payload) {
          var response = payload.response || {};
          var round = payload.round || {};
          if (response.teacherOverride) return { correct: true, teacherOverride: true, message: "Teacher moved the class to the next build." };
          var built = Array.isArray(response.value) ? response.value : [];
          var target = round.solution || [];
          var exact = built.join("|") === target.join("|");
          var partial = built.filter(function (part, index) { return target[index] === part; }).length;
          return exact
            ? { correct: true, message: "Forged. " + (round.meaningHint || "Meaning hint ready.") }
            : {
                correct: false,
                nearMiss: partial >= Math.max(1, target.length - 1),
                message: partial ? "Almost built. Recheck the order or the affix choice." : "Try another morpheme combination."
              };
        }
      },
      "concept-ladder": {
        id: "concept-ladder",
        title: "Clue Ladder",
        subtitle: "Take clues one rung at a time and solve the idea before the final reveal appears.",
        tags: ["Early Solve", "Clue Reveal", "Lesson Concepts"],
        modeLabel: "Climb",
        baseTimerSeconds: 55,
        roundTarget: 6,
        createRound: function (input) {
          var row = registry.pickRound("concept-ladder", roundContext(input), input.history) || {};
          return {
            id: row.id || ("ladder-" + Date.now()),
            promptLabel: row.prompt || "Name the concept.",
            entryLabel: input.settings.viewMode === "projector" || input.settings.viewMode === "classroom"
              ? "Pause after each clue so teams can decide."
              : "Reveal only the clues you need.",
            prompt: row.prompt || "Name the concept.",
            clues: (row.clues || []).slice(),
            answer: String(row.answer || ""),
            options: (row.options || []).slice(),
            timerSeconds: 55,
            hint: "Stop early if you already know it. Earlier solves score more.",
            basePoints: 110
          };
        },
        evaluateRound: function (payload) {
          var response = payload.response || {};
          var round = payload.round || {};
          if (response.teacherOverride) return { correct: true, teacherOverride: true, message: "Teacher awarded the solve." };
          var clueCount = Number(response.clueCount || 1);
          var value = String(response.value || "").toLowerCase();
          var correct = value === String(round.answer || "").toLowerCase();
          return correct
            ? { correct: true, basePoints: Math.max(70, 150 - (clueCount * 18)), message: "Solved on the climb." }
            : { correct: false, nearMiss: clueCount < (round.clues || []).length, message: "Not yet. Take the next clue or rethink the pattern." };
        }
      },
      "error-detective": {
        id: "error-detective",
        title: "Fix the Sentence",
        subtitle: "Spot the mistake, name what went wrong, and pick the fix that repairs the thinking.",
        tags: ["Misconceptions", "Literacy or Math", "Teacher Focus"],
        modeLabel: "Detect",
        baseTimerSeconds: 65,
        roundTarget: 6,
        createRound: function (input) {
          var row = registry.pickRound("error-detective", roundContext(input), input.history) || {};
          return {
            id: row.id || ("error-" + Date.now()),
            promptLabel: row.prompt || "Find the fix.",
            entryLabel: row.misconception ? ("Focus: " + row.misconception) : "Misconception round ready.",
            incorrectExample: row.incorrectExample || "",
            options: (row.options || []).slice(),
            answer: row.answer || "",
            hint: "Pick the move that fixes the reasoning, not just the wording.",
            timerSeconds: 65,
            basePoints: 105
          };
        },
        evaluateRound: function (payload) {
          var response = payload.response || {};
          var round = payload.round || {};
          if (response.teacherOverride) return { correct: true, teacherOverride: true, message: "Teacher accepted the fix." };
          var value = String(response.value || "");
          return value === String(round.answer || "")
            ? { correct: true, message: "Case closed. That fix repairs the misconception." }
            : { correct: false, nearMiss: !!value, message: value ? "Not quite. The right fix: \u201c" + String(round.answer || "") + "\u201d" : "No correction selected." };
        }
      },
      "rapid-category": {
        id: "rapid-category",
        title: "Word Categories",
        subtitle: "Race the clock to name as many lesson words as you can in the right category.",
        tags: ["Timed Retrieval", "Projector Ready", "Unique Responses"],
        modeLabel: "Rush",
        baseTimerSeconds: 40,
        roundTarget: 5,
        createRound: function (input) {
          var row = registry.pickRound("rapid-category", roundContext(input), input.history) || {};
          return {
            id: row.id || ("category-" + Date.now()),
            promptLabel: row.prompt || "Fill the category.",
            entryLabel: input.settings.viewMode === "projector" || input.settings.viewMode === "classroom"
              ? ((row.category || "Category rush") + " · teacher collects the team answers.")
              : ((input.roundIndex || 0) % 2 === 1 ? "Go for quality before quantity." : (row.category || "Category rush ready.")),
            prompt: row.prompt || "Fill the category.",
            accepted: (row.accepted || []).slice(),
            timerSeconds: 40,
            hint: "Aim for fast, unique, relevant responses.",
            basePoints: 120
          };
        },
        evaluateRound: function (payload) {
          var response = payload.response || {};
          var round = payload.round || {};
          if (response.teacherOverride) return { correct: true, teacherOverride: true, message: "Teacher accepted the category rush." };
          var entries = String(response.value || "")
            .split(/[\n,]/)
            .map(function (item) { return item.trim().toLowerCase(); })
            .filter(Boolean);
          var seen = {};
          var unique = entries.filter(function (item) {
            if (seen[item]) return false;
            seen[item] = true;
            return true;
          });
          var matches = unique.filter(function (item) {
            return (round.accepted || []).indexOf(item) >= 0;
          });
          return {
            correct: matches.length >= 3,
            nearMiss: matches.length >= 2,
            basePoints: 80 + (matches.length * 18),
            message: matches.length + " strong responses counted."
          };
        }
      },
      "sentence-builder": {
        id: "sentence-builder",
        title: "Build a Sentence",
        subtitle: "Rebuild the sentence so the ideas flow, the grammar works, and the lesson words stay in place.",
        tags: ["Academic Language", "EAL Support", "Lesson Lock"],
        modeLabel: "Build",
        baseTimerSeconds: 75,
        roundTarget: 6,
        createRound: function (input) {
          var row = registry.pickRound("sentence-builder", roundContext(input), input.history) || {};
          return {
            id: row.id || ("sentence-" + Date.now()),
            promptLabel: row.prompt || "Build the sentence.",
            entryLabel: row.scaffold || "Put the sentence back together.",
            prompt: row.prompt || "Build the sentence.",
            requiredToken: row.requiredToken || "",
            tiles: (row.tiles || []).slice(),
            solution: (row.solution || []).slice(),
            timerSeconds: 75,
            hint: row.scaffold || "Check the transition, word order, and verb placement.",
            basePoints: 110
          };
        },
        evaluateRound: function (payload) {
          var response = payload.response || {};
          var round = payload.round || {};
          if (response.teacherOverride) return { correct: true, teacherOverride: true, message: "Teacher accepted the sentence." };
          var built = Array.isArray(response.value) ? response.value : [];
          var exact = built.join(" ") === (round.solution || []).join(" ");
          var includesRequired = built.indexOf(round.requiredToken) >= 0;
          return exact
            ? { correct: true, message: "Sentence built with the target language move." }
            : { correct: false, nearMiss: includesRequired, message: includesRequired ? "Required language is present. Tighten the order." : "The target vocabulary or conjunction is still missing." };
        }
      }
    };
  }

  function launchHref(base, context) {
    var url = new URL(withAppBase(base));
    if (context.studentId) url.searchParams.set("student", context.studentId);
    if (context.classId) url.searchParams.set("classId", context.classId);
    if (context.lessonContextId) url.searchParams.set("lessonContextId", context.lessonContextId);
    if (context.subject) url.searchParams.set("subject", context.subject);
    if (context.programId) url.searchParams.set("programId", context.programId);
    url.searchParams.set("from", "game-platform");
    return url.toString();
  }

  function galleryLaunchHref(gameId, context) {
    if (gameId === "word-quest") return launchHref("./word-quest.html?play=1", context);
    return launchHref("./game-platform.html?play=1&game=" + encodeURIComponent(gameId), context);
  }

  function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
  }

  function feedbackTone(feedback) {
    var type = String(feedback && feedback.type || "").toLowerCase();
    if (type === "correct") return "positive";
    if (type === "near-miss") return "warning";
    if (type === "teacher-override" || type === "reveal") return "calm";
    if (type === "round-complete") return "positive";
    return "negative";
  }

  function feedbackTitle(feedback) {
    var type = String(feedback && feedback.type || "").toLowerCase();
    if (type === "correct") return "Correct answer";
    if (type === "near-miss") return "Near miss";
    if (type === "teacher-override") return "Teacher override";
    if (type === "reveal") return "Round ready";
    return "Keep moving";
  }

  function supportLine(context, state) {
    var subject = context.subject || "ELA";
    var mode = (runtimeRoot.CSGameModes.VIEW_MODES[state.settings.viewMode] || {}).label || "Individual";
    if (String(state && state.selectedGameId || "") === "word-typing") {
      return "Typing Quest Foundations · " + mode + " · " + (context.typingPlacementRequired ? "Placement" : ("Lesson " + String(context.currentTypingLessonOrder || 1)));
    }
    if (String(state && state.selectedGameId || "") === "morphology-builder") {
      return subject + " · " + mode + " · " + (context.lessonTitle || context.classLabel || "Word-build set");
    }
    return subject + " · " + mode + " · " + (context.lessonTitle || context.classLabel || "Lesson-aligned set");
  }

  function isGroupView(state) {
    var mode = String(state && state.settings && state.settings.viewMode || "");
    return mode === "smallGroup" || mode === "classroom" || mode === "projector";
  }

  function contentSetLabel(value) {
    var key = String(value || "lesson").toLowerCase();
    if (key === "subject") return "Broader subject bank";
    if (key === "morphology") return "Morphology family";
    if (key === "custom") return "Custom word lock";
    return "Lesson-aligned";
  }

  function galleryCaption(gameId) {
    if (gameId === "word-quest") return "Best for: solo, pairs, fast warm-ups";
    if (gameId === "word-typing") return "Best for: typing instruction, intervention, centers";
    if (gameId === "word-connections") return "Best for: partners, teams, projector play";
    if (gameId === "morphology-builder") return "Best for: intervention, word study, pairs";
    if (gameId === "concept-ladder") return "Best for: lesson launch, teams, projector";
    if (gameId === "error-detective") return "Best for: small group, discussion, reteach";
    if (gameId === "rapid-category") return "Best for: teams, projector, retrieval bursts";
    if (gameId === "sentence-builder") return "Best for: solo, partners, language support";
    return "Best for: quick lesson-ready practice";
  }

  function resultTone(outcome) {
    if (!outcome) return "calm";
    if (outcome.correct || outcome.teacherOverride) return "positive";
    if (outcome.nearMiss) return "warning";
    return "negative";
  }

  function roundFocusLabel(game, round) {
    if (!game || !round) return "";
    if (game.id === "word-typing") return [round.unitLabel, round.keyboardZone, round.orthographyFocus].filter(Boolean).join(" · ");
    if (game.id === "word-quest") return round.answer ? ("Target length · " + String(round.answer).length + " letters") : "";
    if (game.id === "word-connections") return "Off-limits words stay out";
    if (game.id === "morphology-builder") return round.meaningHint ? "Meaning unlock after build" : "Build from parts";
    if (game.id === "concept-ladder") return "Earlier solves earn more";
    if (game.id === "error-detective") return round.misconception || "Misconception repair";
    if (game.id === "rapid-category") return "Unique answers score stronger";
    if (game.id === "sentence-builder") return round.requiredToken ? ("Must include " + round.requiredToken) : "Academic language required";
    return "";
  }

  function roundGuide(game, state, round) {
    if (!game || !round) return "";
    var group = isGroupView(state);
    var firstMove = "";
    var turnCue = "";
    var winCue = "";

    if (game.id === "word-quest") {
      firstMove = group ? "Read the clue out loud and agree on one class guess." : "Read the clue and type one confident guess.";
      turnCue = group ? "Teacher chooses when to lock the team answer." : "Use the tile reveal to decide your next move fast.";
      winCue = "Land the correct word before the timer runs out.";
    } else if (game.id === "word-typing") {
      firstMove = group ? "Model the target once, then have students name the pattern before anyone types." : "Look at the whole target, notice the pattern, then type without looking down.";
      turnCue = group ? "Use projector mode for modeling, but save real fluency scores for individual keyboards." : "Accuracy comes first. Build to 5 stars before moving on.";
      winCue = "Type the full lesson target and meet the WPM and accuracy goal.";
    } else if (game.id === "word-connections") {
      firstMove = group ? "One speaker gives the first clue while the team listens for the target word." : "Give one clear clue without using any off-limits words.";
      turnCue = group ? "Rotate speakers each round so every team member gets a clue turn." : "Keep the clue short, useful, and lesson-linked.";
      winCue = "Help the guesser land the word without saying the off-limits words.";
    } else if (game.id === "morphology-builder") {
      firstMove = "Tap the parts in the order that builds a real word.";
      turnCue = group ? "Ask students to explain each morpheme before confirming the build." : "Use the meaning of each chunk to test your build.";
      winCue = "Build the complete word and unlock the meaning hint.";
    } else if (game.id === "concept-ladder") {
      firstMove = "Start with the first clue only.";
      turnCue = group ? "Pause after every clue so teams can commit before revealing more." : "Only reveal another clue if you really need it.";
      winCue = "Solve early to earn the strongest round.";
    } else if (game.id === "error-detective") {
      firstMove = "Spot what is wrong in the example before choosing a fix.";
      turnCue = group ? "Let teams explain why a choice repairs the thinking, not just the wording." : "Choose the fix that repairs the reasoning.";
      winCue = "Close the case with the option that truly fixes the misconception.";
    } else if (game.id === "rapid-category") {
      firstMove = group ? "Name fast ideas while one person records only the strongest responses." : "Type as many relevant words as you can before time ends.";
      turnCue = group ? "Reject repeats and keep only unique answers that fit the category." : "Unique, lesson-fit words beat filler.";
      winCue = "Collect enough strong responses to clear the round.";
    } else if (game.id === "sentence-builder") {
      firstMove = "Rebuild the sentence one tile at a time.";
      turnCue = group ? "Have partners justify the order before the class locks the sentence." : "Check transition, grammar, and target vocabulary together.";
      winCue = "Build a sentence that is correct, smooth, and lesson-ready.";
    }

    return [
      '<div class="cg-round-guide">',
      roundFocusLabel(game, round) ? ('  <div class="cg-round-guide__focus">' + runtimeRoot.CSGameComponents.escapeHtml(roundFocusLabel(game, round)) + '</div>') : "",
      '  <div class="cg-round-guide__row"><strong>First move</strong><span>' + runtimeRoot.CSGameComponents.escapeHtml(firstMove) + '</span></div>',
      '  <div class="cg-round-guide__row"><strong>' + runtimeRoot.CSGameComponents.escapeHtml(group ? "Teacher cue" : "Play cue") + '</strong><span>' + runtimeRoot.CSGameComponents.escapeHtml(turnCue) + '</span></div>',
      '  <div class="cg-round-guide__row"><strong>Win the round</strong><span>' + runtimeRoot.CSGameComponents.escapeHtml(winCue) + "</span></div>",
      "</div>"
    ].join("");
  }

  function nextStepLine(game, outcome) {
    if (!game || !outcome) return "";
    if (outcome.correct || outcome.teacherOverride) {
      if (game.id === "word-typing") return "Next move: check the star rating, then either replay for mastery or move to the next lesson.";
      if (game.id === "concept-ladder") return "Next move: start the next round with one clue fewer if the class is ready.";
      if (game.id === "rapid-category") return "Next move: raise the category challenge or switch teams.";
      return "Next move: take the next round while the pattern is still fresh.";
    }
    if (outcome.nearMiss) return "Next move: keep the same round and use the hint before moving on.";
    if (game.id === "word-connections") return "Next move: try one sharper clue path instead of a full reset.";
    return "Next move: reset cleanly and try the round again with one stronger first move.";
  }

  function turnRotationLabel(state) {
    var roundNumber = Number(state && state.roundIndex || 0) + 1;
    var seat = (roundNumber % 4) || 4;
    return "Speaker " + seat;
  }

  function roundVariationLine(game, state, round) {
    var step = Number(state && state.roundIndex || 0) % 3;
    if (!game || !round) return "";
    if (game.id === "word-quest") {
      return step === 0 ? "Variation: fast solve round." : step === 1 ? "Variation: justify before you lock the guess." : "Variation: use the clue meaning, not just the first letter.";
    }
    if (game.id === "word-typing") {
      return step === 0 ? "Variation: accuracy first." : step === 1 ? "Variation: say the chunk, then type it." : "Variation: type the whole word without pausing between parts.";
    }
    if (game.id === "word-connections") {
      return step === 0 ? "Variation: example clue." : step === 1 ? "Variation: function clue." : "Variation: compare-and-contrast clue.";
    }
    if (game.id === "morphology-builder") {
      return step === 0 ? "Variation: build by meaning." : step === 1 ? "Variation: build by order." : "Variation: explain each part before confirming.";
    }
    if (game.id === "concept-ladder") {
      return step === 0 ? "Variation: solve early." : step === 1 ? "Variation: justify before the reveal." : "Variation: team vote before the next rung.";
    }
    if (game.id === "error-detective") {
      return step === 0 ? "Variation: name the error first." : step === 1 ? "Variation: compare two possible fixes." : "Variation: explain why the wrong choice fails.";
    }
    if (game.id === "rapid-category") {
      return step === 0 ? "Variation: speed burst." : step === 1 ? "Variation: no repeats." : "Variation: quality over quantity.";
    }
    if (game.id === "sentence-builder") {
      return step === 0 ? "Variation: grammar check." : step === 1 ? "Variation: transition check." : "Variation: target vocabulary check.";
    }
    return "";
  }

  function renderHostControls(game, state, round) {
    if (!isGroupView(state) || !game || !round) return "";
    var primaryAction = "";
    var secondaryAction = "";
    if (game.id === "concept-ladder") {
      primaryAction = '<button class="cg-action cg-action-primary" type="button" data-action="reveal-clue">Reveal Next Clue</button>';
      secondaryAction = '<button class="cg-action cg-action-quiet" type="button" data-action="teacher-override">Award Solve</button>';
    } else if (game.id === "word-connections") {
      primaryAction = '<button class="cg-action cg-action-primary" type="button" data-action="teacher-override">Count Team Clue</button>';
      secondaryAction = '<button class="cg-action cg-action-quiet" type="button" data-action="next-round">Rotate Speaker</button>';
    } else if (game.id === "rapid-category") {
      primaryAction = '<button class="cg-action cg-action-primary" type="button" data-action="teacher-override">Count Team Round</button>';
      secondaryAction = '<button class="cg-action cg-action-quiet" type="button" data-action="next-round">Switch Team</button>';
    } else if (game.id === "error-detective") {
      primaryAction = '<button class="cg-action cg-action-primary" type="button" data-action="teacher-override">Accept Fix</button>';
      secondaryAction = '<button class="cg-action cg-action-quiet" type="button" data-action="next-round">Open Next Case</button>';
    } else {
      primaryAction = '<button class="cg-action cg-action-primary" type="button" data-action="teacher-override">Move Class Forward</button>';
      secondaryAction = '<button class="cg-action cg-action-quiet" type="button" data-action="next-round">Next Round</button>';
    }
    return [
      '<div class="cg-host-panel">',
      '  <div class="cg-host-panel__meta">',
      '    <span class="cg-host-pill">Projector host controls</span>',
      '    <strong>' + runtimeRoot.CSGameComponents.escapeHtml(turnRotationLabel(state)) + "</strong>",
      '    <span>' + runtimeRoot.CSGameComponents.escapeHtml(roundVariationLine(game, state, round)) + "</span>",
      "  </div>",
      '  <div class="cg-feedback-actions">' + primaryAction + secondaryAction + "</div>",
      "</div>"
    ].join("");
  }

  function renderFeedback(feedback) {
    if (!feedback) return "";
    var tone = feedbackTone(feedback);
    return [
      '<div class="cg-feedback" data-tone="' + tone + '">',
      '  <div class="cg-feedback-icon">' + runtimeRoot.CSGameComponents.iconFor(tone === "positive" ? "score" : tone === "warning" ? "hint" : tone === "calm" ? "teacher" : "progress") + "</div>",
      '  <div class="cg-feedback-copy"><strong>' + runtimeRoot.CSGameComponents.escapeHtml(feedbackTitle(feedback)) + '</strong><span>' + runtimeRoot.CSGameComponents.escapeHtml(feedback.label || "") + "</span></div>",
      '  <div class="cg-chip" data-tone="' + tone + '">' + runtimeRoot.CSGameComponents.escapeHtml(tone === "positive" ? "On track" : tone === "warning" ? "Close" : tone === "calm" ? "Teacher-led" : "Retry") + "</div>",
      "</div>"
    ].join("");
  }

  function renderResultBanner(state, game) {
    if (!state.lastOutcome || (state.status !== "round-complete" && state.status !== "round-summary")) return "";
    var tone = resultTone(state.lastOutcome);
    return [
      '<div class="cg-result-banner" data-tone="' + tone + '">',
      '  <div class="cg-result-banner-icon">' + runtimeRoot.CSGameComponents.iconFor(tone === "positive" ? "score" : tone === "warning" ? "hint" : "progress") + "</div>",
      '  <div class="cg-result-banner-copy"><strong>' + runtimeRoot.CSGameComponents.escapeHtml(state.lastOutcome.correct ? "Round complete" : state.lastOutcome.nearMiss ? "Reasoning close" : "Round reset") + '</strong><span>' + runtimeRoot.CSGameComponents.escapeHtml(state.feedback && state.feedback.label || "") + '</span><small>' + runtimeRoot.CSGameComponents.escapeHtml(nextStepLine(game, state.lastOutcome)) + "</small></div>",
      '  <div class="cg-points-badge">+' + Number(state.lastPoints || 0) + " pts</div>",
      "</div>"
    ].join("");
  }

  function renderTileBuilder(round, chosenValues) {
    var chosen = Array.isArray(chosenValues) ? chosenValues : [];
    return [
      '<div class="cg-prompt-card">',
      '  <p class="cg-micro-label">Action Area</p>',
      '  <h3 class="cg-prompt-title">' + runtimeRoot.CSGameComponents.escapeHtml(round.prompt) + "</h3>",
      '  <div class="cg-slot-row">' + (round.solution || []).map(function (_part, index) {
        var value = chosen[index] || "";
        return '<button class="cg-word-slot' + (value ? " is-filled" : "") + '" type="button" data-slot-index="' + index + '">' + runtimeRoot.CSGameComponents.escapeHtml(value || "Tap a tile") + "</button>";
      }).join("") + "</div>",
      '  <div class="cg-tile-bank">' + (round.tiles || []).map(function (tile) {
        var selected = chosen.indexOf(tile) >= 0;
        return '<button class="cg-tile' + (selected ? " is-selected" : "") + '" type="button" data-tile="' + runtimeRoot.CSGameComponents.escapeHtml(tile) + '">' + runtimeRoot.CSGameComponents.escapeHtml(tile) + "</button>";
      }).join("") + "</div>",
      "</div>"
    ].join("");
  }

  function teachingContextLine(game) {
    return galleryCaption(game && game.id || "").replace(/^Best for:\s*/i, "");
  }

  function renderTeachingContext(game) {
    if (!game) return "";
    return [
      '<div class="cg-teaching-context">',
      '  <p class="cg-micro-label">Best for</p>',
      '  <p class="cg-teaching-context__copy">' + runtimeRoot.CSGameComponents.escapeHtml(teachingContextLine(game)) + "</p>",
      "</div>"
    ].join("");
  }

  function renderZoneCard(type, title, body) {
    return [
      '<section class="cg-zone-card cg-zone-card--' + runtimeRoot.CSGameComponents.escapeHtml(type) + '">',
      '  <div class="cg-zone-card__header">',
      '    <p class="cg-zone-card__eyebrow">' + runtimeRoot.CSGameComponents.escapeHtml(title) + "</p>",
      "  </div>",
      '  <div class="cg-zone-card__body">' + (body || "") + "</div>",
      "</section>"
    ].join("");
  }

  function renderRoundTimer(state, round) {
    if (!round) return "";
    var total = Math.max(1, Number(round.timerSeconds || 45));
    var remaining = Math.max(0, Number(state && state.timerRemaining || total));
    var pct = Math.max(0, Math.min(100, Math.round((remaining / total) * 100)));
    var tone = pct > 50 ? "positive" : pct > 25 ? "warning" : "danger";
    return [
      '<div class="cg-inline-timer" data-tone="' + tone + '">',
      '  <div class="cg-inline-timer__copy"><span>Round timer</span><strong class="timer">' + remaining + "s</strong></div>",
      '  <div class="cg-inline-timer__track"><span style="width:' + pct + '%"></span></div>',
      "</div>"
    ].join("");
  }

  function renderGameScaffold(game, state, round, config) {
    var options = config || {};
    var segments = [];
    if (options.beforePlay) segments.push(options.beforePlay);
    if (options.timer !== false) segments.push(renderRoundTimer(state, round));
    segments.push(renderZoneCard("play", options.playTitle || "Play Surface", options.play || ""));
    if (options.controls) segments.push(renderZoneCard("controls", options.controlsTitle || "Controls", options.controls));
    segments.push(renderZoneCard("guide", options.guideTitle || "How To Play", (options.guide || "") + renderTeachingContext(game)));
    if (options.afterGuide) segments.push(options.afterGuide);
    return [
      '<div class="cg-game-scaffold cg-game-scaffold--' + runtimeRoot.CSGameComponents.escapeHtml(game && game.id || "game") + '" data-outcome="' + runtimeRoot.CSGameComponents.escapeHtml(resultTone(state && state.lastOutcome)) + '">',
      segments.join(""),
      "</div>"
    ].join("");
  }

  function currentChoicePreview(choice) {
    if (!choice) return '<span class="cg-choice-preview__empty">Nothing selected yet.</span>';
    return '<span class="cg-choice-preview__value">' + runtimeRoot.CSGameComponents.escapeHtml(choice) + "</span>";
  }

  function buildKeyboardStrip(answer, evaluation, guess, className) {
    var letters = [];
    String(guess || "").toUpperCase().split("").forEach(function (letter, index) {
      if (!letter || letters.some(function (entry) { return entry.letter === letter; })) return;
      letters.push({
        letter: letter,
        state: evaluation && evaluation[index] || "absent"
      });
    });
    if (!letters.length) {
      String(answer || "").toUpperCase().split("").forEach(function (letter) {
        if (!letter || letters.some(function (entry) { return entry.letter === letter; })) return;
        letters.push({ letter: letter, state: "" });
      });
    }
    return [
      '<div class="' + runtimeRoot.CSGameComponents.escapeHtml(className || "cg-key-strip") + '" aria-label="Letter feedback">',
      letters.map(function (entry) {
        return '<span class="cg-key-strip__key" data-state="' + runtimeRoot.CSGameComponents.escapeHtml(entry.state || "") + '">' + runtimeRoot.CSGameComponents.escapeHtml(entry.letter) + "</span>";
      }).join(""),
      "</div>"
    ].join("");
  }

  function liveOrderFeedback(selected, solution, type) {
    var built = Array.isArray(selected) ? selected : [];
    var target = Array.isArray(solution) ? solution : [];
    var correctCount = built.filter(function (value, index) { return target[index] === value; }).length;
    var label = type === "sentence" ? "Grammar check" : "Build check";
    var detail = correctCount
      ? (correctCount + " of " + target.length + " parts are in the right place.")
      : (type === "sentence" ? "Drag or tap words into a sentence that sounds right." : "Start with the part that gives the word its base meaning.");
    return [
      '<div class="cg-live-check" data-tone="' + (correctCount ? "positive" : "focus") + '">',
      '  <strong>' + label + "</strong>",
      '  <span>' + runtimeRoot.CSGameComponents.escapeHtml(detail) + "</span>",
      "</div>"
    ].join("");
  }

  function renderDetectiveFragments(text, selected) {
    return String(text || "").split(/\s+/).filter(Boolean).map(function (word, index) {
      var normalized = String(word || "").replace(/[^\w'-]/g, "");
      var isSelected = selected && normalized && normalized === selected;
      return '<button class="cg-detective-fragment' + (isSelected ? " is-selected" : "") + '" type="button" data-detective-fragment="' + runtimeRoot.CSGameComponents.escapeHtml(normalized || word) + '" aria-pressed="' + (isSelected ? "true" : "false") + '">' + runtimeRoot.CSGameComponents.escapeHtml(word) + "</button>";
    }).join(" ");
  }

  function splitTypingChars(value) {
    return String(value || "").toUpperCase().split("");
  }

  function renderTypingLane(round, typed, typedEvaluation) {
    var target = String(round && round.target || "").toUpperCase();
    var currentIndex = Math.min(String(typed || "").length, target.length);
    var typedMarkup = target.slice(0, currentIndex);
    var currentChar = target.charAt(currentIndex) || "";
    var remainingMarkup = target.slice(currentIndex + (currentChar ? 1 : 0));
    var cursorState = typedEvaluation[currentIndex] === "absent" ? "incorrect" : typedEvaluation[currentIndex] === "present" ? "incorrect" : "";
    return [
      '<div class="typing-lane cg-typing-lane" aria-label="Typing lane">',
      '  <span class="typed">' + (typedMarkup ? runtimeRoot.CSGameComponents.escapeHtml(typedMarkup) : "&nbsp;") + '</span>',
      '  <span class="cursor' + (cursorState ? " is-" + cursorState : "") + '">' + runtimeRoot.CSGameComponents.escapeHtml(currentChar || " ") + '</span>',
      '  <span class="remaining">' + (remainingMarkup ? runtimeRoot.CSGameComponents.escapeHtml(remainingMarkup) : "&nbsp;") + "</span>",
      "</div>"
    ].join("");
  }

  function normalizeCategoryEntries(value) {
    var seen = Object.create(null);
    return String(value || "")
      .split(/[\n,]/)
      .map(function (item) { return item.trim(); })
      .filter(Boolean)
      .filter(function (item) {
        var key = item.toLowerCase();
        if (seen[key]) return false;
        seen[key] = true;
        return true;
      })
      .slice(0, 12);
  }

  function normalizeTypingInput(raw, target) {
    var source = String(raw || "").toUpperCase().replace(/[^A-Z;,'!.?\-\/ ]/g, "");
    var goal = String(target || "").toUpperCase();
    return source.slice(0, goal.length);
  }

  function lockTypingProgress(raw, target) {
    var source = normalizeTypingInput(raw, target);
    var goal = String(target || "").toUpperCase();
    var locked = "";
    for (var i = 0; i < source.length && i < goal.length; i += 1) {
      if (source.charAt(i) !== goal.charAt(i)) break;
      locked += source.charAt(i);
    }
    return locked;
  }

  function typingMeaningfulCharCount(value) {
    return String(value || "").replace(/\s+/g, "").length;
  }

  function typingEvaluation(target, typed) {
    var goal = splitTypingChars(target);
    var value = String(typed || "").toUpperCase();
    return goal.map(function (_ch, index) {
      return index < value.length ? "correct" : "";
    });
  }

  function typingLiveMetrics(uiState, round, typed) {
    var goalsWpm = Math.max(6, Number(round && round.masteryGoalWpm || 12));
    var goalsAccuracy = Math.max(85, Math.min(100, Number(round && round.masteryGoalAccuracy || 95)));
    var typedCount = typingMeaningfulCharCount(typed);
    var targetCount = Math.max(1, typingMeaningfulCharCount(round && round.target || ""));
    var mistakes = Math.max(0, Number(uiState && uiState.typingMistakes || 0));
    var startedAt = Number(uiState && uiState.typingRoundStartedAt || 0) || Date.now();
    var elapsedMinutes = Math.max(1 / 60, (Date.now() - startedAt) / 60000);
    var attempts = typedCount + mistakes;
    var wpm = typedCount ? Math.round((typedCount / 5) / elapsedMinutes) : 0;
    var accuracy = attempts ? Math.round((typedCount / attempts) * 100) : 100;
    var progress = Math.round((typedCount / targetCount) * 100);
    return {
      wpm: Math.max(0, wpm),
      accuracy: Math.max(0, Math.min(100, accuracy)),
      progress: Math.max(0, Math.min(100, progress)),
      typedCount: typedCount,
      targetCount: targetCount,
      mistakes: mistakes,
      goalWpm: goalsWpm,
      goalAccuracy: goalsAccuracy
    };
  }

  function typingMasteryStars(metrics, round, complete) {
    var row = metrics || {};
    var isComplete = complete || row.progress >= 100;
    var stars = 0;
    if (row.progress >= 25) stars += 1;
    if (isComplete) stars += 1;
    if (isComplete && row.accuracy >= Math.max(88, row.goalAccuracy - 3)) stars += 1;
    if (isComplete && row.accuracy >= row.goalAccuracy) stars += 1;
    if (isComplete && row.wpm >= row.goalWpm) stars += 1;
    return Math.max(0, Math.min(5, stars));
  }

  function typingReadyToAdvance(metrics, round, complete) {
    var row = metrics || {};
    var isComplete = complete || row.progress >= 100;
    return Boolean(isComplete && row.accuracy >= Number(row.goalAccuracy || round && round.masteryGoalAccuracy || 95) && row.wpm >= Number(row.goalWpm || round && round.masteryGoalWpm || 12));
  }

  function typingProgressKey(context) {
    var studentKey = String(context && context.studentId || "").trim() || "local";
    var gradeKey = String(context && context.gradeBand || "K-2").trim().replace(/[^A-Za-z0-9_-]/g, "_");
    return "cs.typingquest.progress.v1." + studentKey + "." + gradeKey;
  }

  function defaultTypingProgress() {
    return {
      placementCompleted: false,
      placementRecommendedLessonOrder: 1,
      currentLessonOrder: 1,
      currentLessonId: "",
      unlockedLessonOrder: 1,
      completedLessonIds: [],
      lessonResults: {}
    };
  }

  function loadTypingProgress(context) {
    var base = defaultTypingProgress();
    var raw = storageGet(typingProgressKey(context), "");
    if (!raw) return base;
    try {
      raw = JSON.parse(raw);
      return {
        placementCompleted: raw.placementCompleted === true,
        placementRecommendedLessonOrder: Math.max(1, Number(raw.placementRecommendedLessonOrder || 1)),
        currentLessonOrder: Math.max(1, Number(raw.currentLessonOrder || 1)),
        currentLessonId: String(raw.currentLessonId || ""),
        unlockedLessonOrder: Math.max(1, Number(raw.unlockedLessonOrder || 1)),
        completedLessonIds: Array.isArray(raw.completedLessonIds) ? raw.completedLessonIds.map(function (value) { return String(value || ""); }).filter(Boolean) : [],
        lessonResults: raw.lessonResults && typeof raw.lessonResults === "object" ? raw.lessonResults : {}
      };
    } catch (_e) {
      return base;
    }
  }

  function saveTypingProgress(context, progress) {
    storageSet(typingProgressKey(context), JSON.stringify(progress || defaultTypingProgress()));
  }

  function typingPlacementRecommendation(progress, placementRows, history) {
    var rows = Array.isArray(placementRows) ? placementRows : [];
    var outcomes = {};
    (Array.isArray(history) ? history : []).forEach(function (row) {
      outcomes[String(row && row.roundId || "")] = row && row.result === "correct";
    });
    var passed = rows.filter(function (row) {
      return outcomes[String(row && row.id || "")] === true;
    }).length;
    if (passed >= 4) return 13;
    if (passed === 3) return 10;
    if (passed === 2) return 8;
    if (passed === 1) return 4;
    return 1;
  }

  function renderTypingStars(stars) {
    var filled = Math.max(0, Math.min(5, Number(stars) || 0));
    return '<div class="cg-typing-stars" aria-label="' + filled + ' out of 5 stars">' + [0, 1, 2, 3, 4].map(function (index) {
      return '<span class="cg-typing-star' + (index < filled ? ' is-earned' : '') + '" aria-hidden="true">★</span>';
    }).join("") + "</div>";
  }

  var TYPING_UNIT_META = {
    "Unit 0": { title: "Home Row Foundations", subtitle: "Anchors, sweeps, and home-row control", phase: "Week 1" },
    "Unit 1": { title: "Home Row Words", subtitle: "Decodable home-row words before new reaches", phase: "Week 2" },
    "Unit 2": { title: "Top Row Reach", subtitle: "Small reaches into top-row words and phrases", phase: "Week 3" },
    "Unit 3": { title: "Bottom Row Reach", subtitle: "Bottom-row control, digraphs, and short phrases", phase: "Week 4" },
    "Unit 4": { title: "Connected Text", subtitle: "Longer phrases once the keyboard map is ready", phase: "Week 5" }
  };

  function typingCourseSummary(progress, rows) {
    var courseRows = Array.isArray(rows) ? rows : [];
    var results = progress && progress.lessonResults || {};
    var completed = Array.isArray(progress && progress.completedLessonIds) ? progress.completedLessonIds.length : 0;
    var totalLessons = Math.max(1, courseRows.length);
    var stars = Object.keys(results).reduce(function (sum, key) {
      return sum + Math.max(0, Math.min(5, Number(results[key] && results[key].stars || 0)));
    }, 0);
    return {
      progressPercent: Math.round((completed / totalLessons) * 100),
      completedLessons: completed,
      totalLessons: totalLessons,
      totalStars: stars,
      totalPoints: stars * 200
    };
  }

  function typingUnitMeta(unitLabel, rows) {
    var list = Array.isArray(rows) ? rows : [];
    var fallbackTitle = list[0] && list[0].stageLabel || String(unitLabel || "Typing Unit");
    var fallbackSubtitle = list[0] && (list[0].keyboardZone || list[0].orthographyFocus) || "Typing practice";
    var meta = TYPING_UNIT_META[String(unitLabel || "")] || {};
    return {
      title: meta.title || fallbackTitle,
      subtitle: meta.subtitle || fallbackSubtitle,
      phase: meta.phase || String(unitLabel || "Unit")
    };
  }

  function renderTypingTargetMarkup(round) {
    var target = String(round && round.target || "").toUpperCase();
    var heart = String(round && round.heartLetters || "").toUpperCase();
    if (!target) return "";
    if (heart && target.indexOf(heart) >= 0) {
      var idx = target.indexOf(heart);
      return '<span class="cg-typing-target-word">'
        + runtimeRoot.CSGameComponents.escapeHtml(target.slice(0, idx))
        + '<mark>' + runtimeRoot.CSGameComponents.escapeHtml(heart) + '</mark>'
        + runtimeRoot.CSGameComponents.escapeHtml(target.slice(idx + heart.length))
        + '</span>';
    }
    return '<span class="cg-typing-target-word">' + runtimeRoot.CSGameComponents.escapeHtml(target) + '</span>';
  }

  function typingLessonGlyph(row) {
    var stage = String(row && row.stageLabel || "").toLowerCase();
    var target = String(row && row.target || "").toUpperCase().replace(/\s+/g, " ").trim();
    if (row && String(row.unitLabel || "").toLowerCase() === "placement") return "▶";
    if (stage.indexOf("review") >= 0) return "⌕";
    if (stage.indexOf("practice") >= 0) return "◔";
    if (stage.indexOf("hand") >= 0) return "⌨";
    if (stage.indexOf("play") >= 0) return "★";
    if (row && row.heartLetters) return "♥";
    if (!target) return "KEY";
    if (row && row.typingKind === "phrase") return "Aa";
    if (row && row.typingKind === "keys") return target.replace(/\s+/g, "").slice(0, 2);
    return target.slice(0, 3);
  }

  function typingLessonBadge(row) {
    var stage = String(row && row.stageLabel || "").toLowerCase();
    if (!row) return "Lesson";
    if (String(row.unitLabel || "").toLowerCase() === "placement") return "Check";
    if (stage.indexOf("review") >= 0) return "Review";
    if (stage.indexOf("practice") >= 0) return "Practice";
    if (stage.indexOf("play") >= 0) return "Game";
    if (stage.indexOf("introduc") >= 0) return "Intro";
    if (row.heartLetters) return "Heart";
    if (row.typingKind === "phrase") return "Phrase";
    if (row.typingKind === "keys") return "Keys";
    return "Word";
  }

  function renderTypingProgressStrip(summary, options) {
    var stats = summary || { progressPercent: 0, totalStars: 0, totalPoints: 0 };
    var extras = options || {};
    return [
      '<div class="cg-typing-progress-strip">',
      '  <span><strong>' + Number(stats.progressPercent || 0) + '%</strong> progress</span>',
      '  <span><strong>' + Number(stats.totalStars || 0) + '</strong> stars</span>',
      '  <span><strong>' + Number(stats.totalPoints || 0) + '</strong> points</span>',
      (extras.label ? '  <span class="cg-typing-progress-strip__label">' + runtimeRoot.CSGameComponents.escapeHtml(extras.label) + '</span>' : ""),
      "</div>"
    ].join("");
  }

  function typingPromptTitle(round) {
    if (!round) return "Start typing.";
    if (round.courseMode === "placement") return "Take a quick check to find the right lesson start.";
    if (round.typingKind === "keys") return "Find the keys, then type the pattern without looking down.";
    if (round.typingKind === "phrase") return "Read the full phrase first, then type it in one smooth rhythm.";
    return "Look at the whole word, then type it with control and rhythm.";
  }

  var TYPING_GUIDE_ROWS = [
    ["q", "w", "e", "r", "t", "y", "u", "i", "o", "p"],
    ["a", "s", "d", "f", "g", "h", "j", "k", "l", ";"],
    ["z", "x", "c", "v", "b", "n", "m"],
    ["space"]
  ];

  var TYPING_FINGER_MAP = {
    q: "Left pinky",
    a: "Left pinky",
    z: "Left pinky",
    w: "Left ring",
    s: "Left ring",
    x: "Left ring",
    e: "Left middle",
    d: "Left middle",
    c: "Left middle",
    r: "Left index",
    f: "Left index",
    v: "Left index",
    t: "Left index",
    g: "Left index",
    b: "Left index",
    y: "Right index",
    h: "Right index",
    n: "Right index",
    u: "Right index",
    j: "Right index",
    m: "Right index",
    i: "Right middle",
    k: "Right middle",
    o: "Right ring",
    l: "Right ring",
    p: "Right pinky",
    ";": "Right pinky",
    " ": "Thumbs",
    space: "Thumbs"
  };

  function typingGuideKeys(target) {
    var seen = {};
    return splitTypingChars(target || "").map(function (key) {
      return key === " " ? "space" : key.toLowerCase();
    }).filter(function (key) {
      if (!key || seen[key]) return false;
      seen[key] = true;
      return true;
    });
  }

  function renderTypingKeyboardGuide(round) {
    var activeKeys = typingGuideKeys(round && round.target || "");
    var activeLookup = {};
    var fingerLookup = {};
    activeKeys.forEach(function (key) {
      activeLookup[key] = true;
      fingerLookup[TYPING_FINGER_MAP[key] || "Watch target"] = true;
    });
    var activeFingers = Object.keys(fingerLookup);
    return [
      '<div class="cg-typing-guide" aria-label="Keyboard and finger guide">',
      '  <div class="cg-typing-guide-head">',
      '    <div>',
      '      <p class="cg-micro-label">' + runtimeRoot.CSGameComponents.escapeHtml(round && round.courseMode === "placement" ? "Placement keyboard check" : (round && round.typingKind === "keys" ? "New key introduction" : "Keyboard guide")) + "</p>",
      '      <h4>' + runtimeRoot.CSGameComponents.escapeHtml(round && round.fingerCue || "Keep your eyes on the target and return to home row after each reach.") + '</h4>',
      "    </div>",
      '    <div class="cg-typing-hand-legend">' + activeFingers.map(function (label) {
        return '<span class="cg-typing-finger-chip">' + runtimeRoot.CSGameComponents.escapeHtml(label) + "</span>";
      }).join("") + "</div>",
      "  </div>",
      '  <div class="cg-typing-guide-keys">' + TYPING_GUIDE_ROWS.map(function (row) {
        var rowIndex = TYPING_GUIDE_ROWS.indexOf(row) + 1;
        return '<div class="cg-typing-guide-row cg-typing-guide-row--' + rowIndex + '">' + row.map(function (key) {
          var displayKey = key === "space" ? "Space" : key.toUpperCase();
          var fingerLabel = TYPING_FINGER_MAP[key] || "Typing key";
          var isActive = activeLookup[key];
          var isHome = key === "f" || key === "j";
          return '<span class="cg-typing-guide-key' + (isActive ? ' is-active' : '') + (isHome ? ' is-home' : '') + (key === "space" ? ' is-space' : '') + '" aria-label="' + runtimeRoot.CSGameComponents.escapeHtml(displayKey + " · " + fingerLabel) + '"><strong>' + runtimeRoot.CSGameComponents.escapeHtml(displayKey) + '</strong><small>' + runtimeRoot.CSGameComponents.escapeHtml(fingerLabel) + "</small></span>";
        }).join("") + "</div>";
      }).join("") + "</div>",
      "</div>"
    ].join("");
  }

  function paintTypingPreview(round, typed, uiState) {
    var target = round && round.target || "";
    var cells = document.querySelectorAll(".cg-typing-text-entry__char");
    var promptCells = document.querySelectorAll(".cg-typing-text-line .cg-typing-text-char");
    var metrics = typingLiveMetrics(uiState, round, typed);
    var stars = typingMasteryStars(metrics, round, false);
    Array.prototype.forEach.call(cells, function (cell, index) {
      var letter = String(typed || "").charAt(index) || "";
      var state = letter ? "correct" : "";
      cell.textContent = letter || (String(target || "").charAt(index) === " " ? " " : "");
      cell.setAttribute("data-state", state);
      if (state) cell.classList.add("is-revealed");
      else cell.classList.remove("is-revealed");
    });
    Array.prototype.forEach.call(promptCells, function (cell, index) {
      cell.classList.toggle("is-correct", index < String(typed || "").length);
      cell.classList.toggle("is-current", index === String(typed || "").length);
    });
    var progressFill = document.getElementById("cg-typing-progress-fill");
    if (progressFill) progressFill.style.width = metrics.progress + "%";
    var questRunner = document.getElementById("cg-typing-quest-runner");
    if (questRunner) questRunner.style.left = "calc(" + metrics.progress + "% - 16px)";
    var wpmNode = document.getElementById("cg-typing-live-wpm");
    if (wpmNode) wpmNode.textContent = String(metrics.wpm);
    var accuracyNode = document.getElementById("cg-typing-live-accuracy");
    if (accuracyNode) accuracyNode.textContent = String(metrics.accuracy) + "%";
    var goalNode = document.getElementById("cg-typing-live-goal");
    if (goalNode) goalNode.textContent = metrics.goalWpm + " WPM · " + metrics.goalAccuracy + "%";
    var progressNode = document.getElementById("cg-typing-live-progress");
    if (progressNode) progressNode.textContent = metrics.typedCount + " / " + metrics.targetCount;
    var mistakesNode = document.getElementById("cg-typing-live-errors");
    if (mistakesNode) mistakesNode.textContent = String(metrics.mistakes);
    var starsNode = document.getElementById("cg-typing-live-stars");
    if (starsNode) starsNode.innerHTML = renderTypingStars(stars);
  }

  function paintCategoryPreview(items) {
    var host = document.querySelector(".cg-rush-preview");
    if (!host) return;
    host.innerHTML = (items || []).map(function (item, index) {
      return '<span class="cg-rush-preview__item" style="animation-delay:' + (index * 40) + 'ms">' + runtimeRoot.CSGameComponents.escapeHtml(item) + "</span>";
    }).join("");
  }

  function evidenceModuleForGame(gameId, context) {
    var id = String(gameId || "");
    var subject = String(context && context.subject || "").toLowerCase();
    if (id === "word-quest" || id === "word-typing" || id === "morphology-builder" || id === "rapid-category") return "wordquest";
    if (id === "sentence-builder") return "sentence_surgery";
    if (id === "word-connections") return "writing_studio";
    if (id === "concept-ladder") return subject === "math" ? "numeracy" : "reading_lab";
    if (id === "error-detective") return subject === "math" ? "numeracy" : "sentence_surgery";
    return "wordquest";
  }

  function buildLegacyMetrics(gameId, state, context) {
    var rounds = Math.max(1, Number(state && state.roundsCompleted || 0));
    var metrics = state && state.metrics ? state.metrics : {};
    var accuracyRatio = Math.max(0, Math.min(1, Number(metrics.correct || 0) / rounds));
    if (gameId === "word-quest" || gameId === "morphology-builder" || gameId === "rapid-category" || gameId === "word-typing") {
      return {
        solveSuccess: (metrics.correct || 0) >= Math.ceil(rounds / 2),
        totalGuesses: rounds,
        newInfoPerGuess: Number((0.45 + (accuracyRatio * 0.4)).toFixed(3)),
        constraintHonorRate: Number((0.5 + (accuracyRatio * 0.35)).toFixed(3)),
        vowelConfusionProxy: Number((1 - accuracyRatio).toFixed(3)),
        misplaceRate: Number((1 - accuracyRatio).toFixed(3)),
        absentRate: Number(Math.max(0, 0.35 - (accuracyRatio * 0.2)).toFixed(3)),
        vowelSwapCount: Math.max(0, Number(metrics.incorrect || 0))
      };
    }
    if (gameId === "word-connections") {
      return {
        paragraphs: Math.max(1, Number(metrics.correct || 0)),
        revisionCount: Math.max(0, Number(metrics.nearMiss || 0) + Number(metrics.incorrect || 0)),
        voiceFlatFlag: Number(metrics.incorrect || 0) > Number(metrics.correct || 0)
      };
    }
    if (gameId === "sentence-builder" || gameId === "error-detective") {
      return {
        reasoningAdded: Number(metrics.correct || 0) >= Number(metrics.incorrect || 0),
        runOnFlag: Number(metrics.incorrect || 0) > 0,
        fragmentFlag: Number(metrics.incorrect || 0) > Number(metrics.correct || 0),
        editsCount: Number(metrics.correct || 0) + Number(metrics.nearMiss || 0)
      };
    }
    if (gameId === "concept-ladder" && String(context && context.subject || "").toLowerCase() === "math") {
      return {
        accuracy: Number((accuracyRatio * 100).toFixed(0)),
        speedProxy: Math.max(25, 72 - (Number(metrics.incorrect || 0) * 6)),
        hints: Math.max(0, Number(metrics.nearMiss || 0))
      };
    }
    return {
      accuracy: Number((accuracyRatio * 100).toFixed(0)),
      wpmProxy: Math.max(30, 90 - (Number(metrics.incorrect || 0) * 5)),
      selfCorrects: Number(metrics.nearMiss || 0)
    };
  }

  function writeSessionToEvidence(gameId, state, context) {
    if (!runtimeRoot.CSEvidence || !context || !context.studentId) return false;
    var metrics = state && state.metrics ? state.metrics : {};
    var rounds = Math.max(1, Number(state && state.roundsCompleted || 0));
    var correct = Number(metrics.correct || 0);
    var accuracyRatio = Math.max(0, Math.min(1, correct / rounds));
    var module = evidenceModuleForGame(gameId, context);
    var envelope = {
      id: "game_" + String(gameId || "activity") + "_" + String(state && state.roundIndex || rounds) + "_" + Date.now().toString(36),
      studentId: context.studentId,
      createdAt: new Date().toISOString(),
      activity: String(gameId || "game"),
      durationSec: Math.max(0, rounds * 45),
      signals: {
        guessCount: rounds,
        avgGuessLatencyMs: Math.max(600, 2600 - (correct * 180)),
        misplaceRate: Number((1 - accuracyRatio).toFixed(3)),
        absentRate: Number(Math.max(0, 0.3 - (accuracyRatio * 0.2)).toFixed(3)),
        repeatSameBadSlotCount: Math.max(0, Number(metrics.incorrect || 0) - 1),
        vowelSwapCount: Math.max(0, Number(metrics.nearMiss || 0)),
        constraintViolations: Math.max(0, Number(metrics.incorrect || 0))
      },
      outcomes: {
        solved: correct >= Math.ceil(rounds / 2),
        attemptsUsed: rounds
      }
    };
    var session = runtimeRoot.CSEvidence.addSession(context.studentId, envelope);
    if (!session) return false;
    if (typeof runtimeRoot.CSEvidence.appendSession === "function") {
      runtimeRoot.CSEvidence.appendSession(context.studentId, module, buildLegacyMetrics(gameId, state, context), Date.now());
    }
    return true;
  }

  function init() {
    var params = parseParams();
    var galleryOnly = !params.playMode;
    var context = loadTeacherContext(params);
    var recommendedGame = params.gameId || (runtimeRoot.CSGameContentRegistry && runtimeRoot.CSGameContentRegistry.recommendedGame
      ? runtimeRoot.CSGameContentRegistry.recommendedGame(context)
      : "word-quest");
    var typingProgress = loadTypingProgress(context);
    var typingCourseRows = runtimeRoot.CSGameContentRegistry && typeof runtimeRoot.CSGameContentRegistry.getTypingCourseRows === "function"
      ? runtimeRoot.CSGameContentRegistry.getTypingCourseRows(context)
      : [];
    var typingPlacementRows = runtimeRoot.CSGameContentRegistry && typeof runtimeRoot.CSGameContentRegistry.getTypingPlacementRows === "function"
      ? runtimeRoot.CSGameContentRegistry.getTypingPlacementRows(context)
      : [];

    function typingLessonByOrder(order) {
      var rows = typingCourseRows || [];
      var desired = Math.max(1, Number(order || 1));
      var exact = rows.filter(function (row) {
        return Number(row && row.lessonOrder || 0) === desired;
      })[0];
      if (exact) return exact;
      if (!rows.length) return null;
      return rows[Math.max(0, Math.min(rows.length - 1, desired - 1))] || rows[rows.length - 1] || null;
    }

    function typingLessonById(id) {
      var key = String(id || "").trim();
      if (!key) return null;
      return (typingCourseRows || []).filter(function (row) {
        return String(row && row.id || "") === key;
      })[0] || null;
    }

    function typingQuestHref(options) {
      var next = options || {};
      var url = new URL(withAppBase("typing-quest.html"));
      url.searchParams.set("play", "1");
      url.searchParams.set("game", "word-typing");
      url.searchParams.set("typingPage", "1");
      if (params.studentId) url.searchParams.set("student", params.studentId);
      if (params.classId) url.searchParams.set("classId", params.classId);
      if (params.lessonContextId) url.searchParams.set("lessonContextId", params.lessonContextId);
      if (context.subject) url.searchParams.set("subject", context.subject);
      if (context.gradeBand) url.searchParams.set("gradeBand", context.gradeBand);
      if (context.contentMode) url.searchParams.set("contentMode", context.contentMode);
      url.searchParams.set("typingCourseMode", String(next.typingCourseMode || "lesson"));
      if (next.lessonId) url.searchParams.set("lessonId", String(next.lessonId));
      if (next.lessonOrder) url.searchParams.set("lessonOrder", String(next.lessonOrder));
      return url.toString();
    }

    function refreshTypingCourseContext() {
      if (String(context.contentMode || "lesson").toLowerCase() !== "lesson") {
        context.typingCourseMode = "lesson";
        context.typingPlacementRequired = false;
        context.currentTypingLessonId = "";
        context.currentTypingLessonOrder = 0;
        context.typingUnlockedOrder = 999;
        context.typingCompletedLessons = [];
        return;
      }
      var recommendedOrder = Math.max(1, Number(typingProgress.placementRecommendedLessonOrder || 1));
      var currentOrder = Math.max(recommendedOrder, Number(typingProgress.currentLessonOrder || recommendedOrder));
      var lesson = typingProgress.currentLessonId
        ? typingCourseRows.filter(function (row) { return String(row && row.id || "") === String(typingProgress.currentLessonId || ""); })[0]
        : typingLessonByOrder(currentOrder);
      if (!lesson) lesson = typingLessonByOrder(recommendedOrder);
      context.typingCourseMode = typingProgress.placementCompleted ? "lesson" : "placement";
      context.typingPlacementRequired = !typingProgress.placementCompleted;
      context.currentTypingLessonId = lesson ? lesson.id : "";
      context.currentTypingLessonOrder = lesson ? Number(lesson.lessonOrder || 1) : 1;
      context.typingUnlockedOrder = typingProgress.placementCompleted ? Math.max(recommendedOrder, Number(typingProgress.unlockedLessonOrder || context.currentTypingLessonOrder || 1)) : 1;
      context.typingCompletedLessons = Array.isArray(typingProgress.completedLessonIds) ? typingProgress.completedLessonIds.slice() : [];
      context.typingPlacementRecommendedLessonOrder = recommendedOrder;
      context.typingPlacementRows = typingPlacementRows.slice();

      if (params.typingPage && recommendedGame === "word-typing") {
        var requestedMode = String(params.typingCourseMode || (params.typingLessonId || params.typingLessonOrder ? "lesson" : "") || "").toLowerCase();
        if (requestedMode === "placement") {
          context.typingCourseMode = "placement";
          context.typingPlacementRequired = true;
          context.currentTypingLessonId = "";
          context.currentTypingLessonOrder = 1;
          context.typingUnlockedOrder = 1;
        } else if (requestedMode === "lesson") {
          var requestedLesson = typingLessonById(params.typingLessonId) || typingLessonByOrder(params.typingLessonOrder || context.currentTypingLessonOrder || 1);
          if (requestedLesson) {
            context.typingCourseMode = "lesson";
            context.typingPlacementRequired = false;
            context.currentTypingLessonId = requestedLesson.id;
            context.currentTypingLessonOrder = Number(requestedLesson.lessonOrder || 1);
            context.typingUnlockedOrder = Math.max(Number(context.typingUnlockedOrder || 1), Number(requestedLesson.lessonOrder || 1));
          }
        }
      }
    }

    refreshTypingCourseContext();
    /* Restore gallery context from localStorage when not in URL */
    try {
      var storedGrade = localStorage.getItem("cs.gallery.grade");
      var storedSubject = localStorage.getItem("cs.gallery.subject");
      if (!params.gradeBand && localStorage.getItem("cs.gallery.grade")) {
        context.gradeBand = storedGrade;
      }
      if (!params.subject && storedSubject) {
        var allowedSubjects = ["ELA", "Writing", "Math", "Science", "Intervention"];
        if (allowedSubjects.indexOf(storedSubject) >= 0) {
          var shouldHonorIntervention = storedSubject !== "Intervention"
            || Boolean(params.classId || params.lessonId || context.classLabel || context.lessonTitle);
          context.subject = shouldHonorIntervention ? storedSubject : (context.subject || "ELA");
        }
      }
    } catch (_e) {}
    var games = createGames(context);
    var live = runtimeRoot.CSGameA11y.createLiveRegion(document.getElementById("cg-live-region"));
    var sound = runtimeRoot.CSGameSound.create({ enabled: false });
    var shell = document.getElementById("cg-shell");
    var GALLERY_PLAN_KEY = "cs.gallery.plan.v1";
    var GALLERY_POMODORO_KEY = "cs.gallery.pomodoro.v1";
    var GALLERY_POMODORO_UI_KEY = "cs.gallery.pomodoro.ui.v1";
    var pomodoroInterval = 0;
    var pomodoroPopout = null;
    var galleryPlan = (function loadGalleryPlan() {
      var raw = storageGet(GALLERY_PLAN_KEY, "");
      if (!raw) {
        return {
          classLabel: context.classLabel || "",
          sessionDate: "",
          agenda: ""
        };
      }
      try {
        raw = JSON.parse(raw);
        return {
          classLabel: String(raw.classLabel || context.classLabel || "").trim(),
          sessionDate: String(raw.sessionDate || "").trim(),
          agenda: String(raw.agenda || "").trim()
        };
      } catch (_e) {
        return {
          classLabel: context.classLabel || "",
          sessionDate: "",
          agenda: ""
        };
      }
    })();
    var galleryPomodoro = (function loadGalleryPomodoro() {
      var raw = storageGet(GALLERY_POMODORO_KEY, "");
      if (!raw) {
        return {
          durationMinutes: 25,
          remainingSeconds: 25 * 60,
          running: false,
          endsAt: 0
        };
      }
      try {
        raw = JSON.parse(raw);
        var duration = Math.max(5, Math.min(60, Number(raw.durationMinutes) || 25));
        return {
          durationMinutes: duration,
          remainingSeconds: Math.max(0, Number(raw.remainingSeconds) || duration * 60),
          running: Boolean(raw.running),
          endsAt: Number(raw.endsAt) || 0
        };
      } catch (_e) {
        return {
          durationMinutes: 25,
          remainingSeconds: 25 * 60,
          running: false,
          endsAt: 0
        };
      }
    })();
    var galleryPomodoroUi = (function loadGalleryPomodoroUi() {
      var raw = storageGet(GALLERY_POMODORO_UI_KEY, "");
      if (!raw) {
        return {
          open: false,
          minimized: false,
          mode: "timer",
          x: null,
          y: null
        };
      }
      try {
        raw = JSON.parse(raw);
        return {
          open: raw.open === true,
          minimized: raw.minimized === true,
          mode: raw.mode === "clock" ? "clock" : "timer",
          x: Number.isFinite(Number(raw.x)) ? Number(raw.x) : null,
          y: Number.isFinite(Number(raw.y)) ? Number(raw.y) : null
        };
      } catch (_e) {
        return {
          open: false,
          minimized: false,
          mode: "timer",
          x: null,
          y: null
        };
      }
    })();
    var uiState = {
      teacherPanelOpen: false,
      selectedChoice: "",
      builderSelection: [],
      revealedClues: 1,
      supportRevealOpen: false,
      detectiveSelection: "",
      typingLockedValue: "",
      typingErrorUntil: 0,
      typingRoundId: "",
      typingStartedRoundId: "",
      typingRoundStartedAt: 0,
      typingAcceptedChars: 0,
      typingMistakes: 0,
      categoryPreview: [],
      previous: { score: 0, streak: 0, rounds: 0 },
      bumpUntil: { score: 0, streak: 0, rounds: 0 },
      lastLoggedSummaryKey: "",
      lastSubmittedGuess: "",
      lastTypingPersistKey: "",
      wordClue: {
        roundId: "",
        screen: "landing",
        phase: "setup",
        mode: "speak",
        groupMode: "teams",
        cardStyle: "standard",
        setupOpen: false,
        blockedCount: 4,
        timerPreset: "45",
        timerRemaining: 45,
        timerRunning: false,
        paused: false,
        categoryContext: "",
        result: "",
        filterGradeBand: "K-1",
        filterSubject: "ELA",
        filterDeckId: "",
        filterCurriculum: "",
        filterDifficulty: "all",
        filterRoundType: "any",
        customTargetWord: "",
        customForbiddenWords: "",
        customCurriculumTag: "",
        customGradeBand: "K-1",
        customSubject: String((context && context.subject) || "ELA").toUpperCase()
      },
      wordClueTimerId: 0
    };

    if (!shell) return;
    if (sharedMusicState.enabled) {
      void startSharedMusic();
    } else {
      void loadSharedMusicCatalog().then(syncSharedMusicUi);
    }

    function persistGalleryPlan() {
      storageSet(GALLERY_PLAN_KEY, JSON.stringify(galleryPlan));
    }

    function persistGalleryPomodoro() {
      storageSet(GALLERY_POMODORO_KEY, JSON.stringify(galleryPomodoro));
    }

    function persistGalleryPomodoroUi() {
      storageSet(GALLERY_POMODORO_UI_KEY, JSON.stringify(galleryPomodoroUi));
    }

    function stopPomodoroInterval() {
      if (pomodoroInterval) {
        runtimeRoot.clearInterval(pomodoroInterval);
        pomodoroInterval = 0;
      }
    }

    function formatPomodoroClock(totalSeconds) {
      var safe = Math.max(0, Number(totalSeconds) || 0);
      var minutes = Math.floor(safe / 60);
      var seconds = Math.floor(safe % 60);
      return String(minutes).padStart(2, "0") + ":" + String(seconds).padStart(2, "0");
    }

    function formatWallClock(date) {
      var hours = date.getHours();
      var minutes = date.getMinutes();
      var suffix = hours >= 12 ? "PM" : "AM";
      hours = hours % 12;
      if (!hours) hours = 12;
      return hours + ":" + String(minutes).padStart(2, "0") + " " + suffix;
    }

    function syncPomodoroClock() {
      if (galleryPomodoro.running) {
        galleryPomodoro.remainingSeconds = Math.max(0, Math.ceil((galleryPomodoro.endsAt - Date.now()) / 1000));
        if (galleryPomodoro.remainingSeconds <= 0) {
          galleryPomodoro.running = false;
          galleryPomodoro.endsAt = 0;
        }
        persistGalleryPomodoro();
      }
      renderPomodoroPopout();
      if (galleryOnly && (galleryPomodoro.running || galleryPomodoroUi.mode === "clock")) render();
      if (!galleryPomodoro.running && galleryPomodoroUi.mode !== "clock" && (!pomodoroPopout || pomodoroPopout.closed)) {
        stopPomodoroInterval();
      }
    }

    function ensurePomodoroTicking() {
      stopPomodoroInterval();
      if (!galleryPomodoro.running && galleryPomodoroUi.mode !== "clock" && (!pomodoroPopout || pomodoroPopout.closed)) return;
      pomodoroInterval = runtimeRoot.setInterval(syncPomodoroClock, 1000);
    }

    function pomodoroVisualModel() {
      var ringCircumference = 276;
      if (galleryPomodoroUi.mode === "clock") {
        var now = new Date();
        var seconds = now.getSeconds();
        var clockProgress = Math.max(0.04, seconds / 60);
        return {
          title: "Clock",
          value: formatWallClock(now),
          sublabel: "Live classroom clock",
          offset: Math.round(ringCircumference * (1 - clockProgress)),
          dasharray: ringCircumference,
          tone: "clock"
        };
      }
      var durationSeconds = Math.max(1, galleryPomodoro.durationMinutes * 60);
      var timerProgress = Math.max(0.04, Math.min(1, galleryPomodoro.remainingSeconds / durationSeconds));
      return {
        title: "Timer",
        value: formatPomodoroClock(galleryPomodoro.remainingSeconds),
        sublabel: galleryPomodoro.running ? "Pomodoro in progress" : "Ready to start",
        offset: Math.round(ringCircumference * (1 - timerProgress)),
        dasharray: ringCircumference,
        tone: galleryPomodoro.running ? "timer-running" : "timer"
      };
    }

    function renderPomodoroLauncher() {
      return [
        '<button class="cg-pomo-tab" type="button" data-pomo-ui="toggle" aria-expanded="' + (galleryPomodoroUi.open ? "true" : "false") + '">',
        '  <span class="cg-pomo-tab-label">Class Timer</span>',
        '  <span class="cg-pomo-tab-value">' + (galleryPomodoroUi.mode === "clock" ? formatWallClock(new Date()) : formatPomodoroClock(galleryPomodoro.remainingSeconds)) + '</span>',
        '</button>'
      ].join("");
    }

    function renderPomodoroWidget() {
      var escapeHtml = runtimeRoot.CSGameComponents.escapeHtml;
      var options = [15, 25, 40].map(function (minutes) {
        return '<button class="cg-pomo-chip' + (galleryPomodoro.durationMinutes === minutes ? ' is-active' : '') + '" type="button" data-pomo-duration="' + minutes + '">' + minutes + ' min</button>';
      }).join("");
      var visual = pomodoroVisualModel();
      if (!galleryPomodoroUi.open) return "";
      var style = [];
      var widgetWidth = Math.min(360, Math.max(280, (runtimeRoot.innerWidth || 1280) - 32));
      var widgetHeight = galleryPomodoroUi.minimized ? 84 : 520;
      var safeLeft = Number.isFinite(galleryPomodoroUi.x)
        ? Math.max(12, Math.min((runtimeRoot.innerWidth || 1280) - widgetWidth - 12, galleryPomodoroUi.x))
        : null;
      var safeTop = Number.isFinite(galleryPomodoroUi.y)
        ? Math.max(92, Math.min((runtimeRoot.innerHeight || 900) - widgetHeight - 12, galleryPomodoroUi.y))
        : null;
      if (Number.isFinite(safeLeft)) style.push("left:" + Math.round(safeLeft) + "px");
      if (Number.isFinite(safeTop)) style.push("top:" + Math.round(safeTop) + "px");
      return [
        '<section class="cg-pomo-widget' + (galleryPomodoroUi.minimized ? ' is-minimized' : '') + '" aria-label="Class plan and Pomodoro timer" style="' + style.join(";") + '">',
        '  <div class="cg-pomo-widget-head" data-pomo-drag-handle="true">',
        '    <div>',
        '      <p class="cg-kicker">Classroom Planner</p>',
        '      <h2>Agenda + Pomodoro</h2>',
        '    </div>',
        '    <div class="cg-pomo-widget-controls">',
        '      <button class="cg-pomo-icon-btn" type="button" data-pomo-ui="mode">' + (galleryPomodoroUi.mode === "clock" ? 'Timer' : 'Clock') + '</button>',
        '      <button class="cg-pomo-icon-btn" type="button" data-pomo-ui="popout">Pop Out</button>',
        '      <button class="cg-pomo-icon-btn" type="button" data-pomo-ui="minimize">' + (galleryPomodoroUi.minimized ? 'Expand' : 'Minimize') + '</button>',
        '    </div>',
        '  </div>',
        '  <div class="cg-pomo-widget-body">',
        '    <div class="cg-pomo-ring-panel" data-tone="' + visual.tone + '">',
        '      <svg class="cg-pomo-ring" viewBox="0 0 120 120" aria-hidden="true">',
        '        <circle class="cg-pomo-ring-track" cx="60" cy="60" r="44"></circle>',
        '        <circle class="cg-pomo-ring-progress" cx="60" cy="60" r="44" stroke-dasharray="' + visual.dasharray + '" stroke-dashoffset="' + visual.offset + '"></circle>',
        '      </svg>',
        '      <div class="cg-pomo-ring-copy">',
        '        <span class="cg-pomo-mode-label">' + visual.title + '</span>',
        '        <span class="cg-pomo-time">' + visual.value + '</span>',
        '        <span class="cg-pomo-subcopy">' + visual.sublabel + '</span>',
        '      </div>',
        '    </div>',
        '    <div class="cg-pomo-panel" data-running="' + (galleryPomodoro.running ? 'true' : 'false') + '">',
        '      <div class="cg-pomo-actions">',
        '        <button class="cg-action cg-action-primary cg-action-compact" type="button" data-pomo-action="' + (galleryPomodoro.running ? 'pause' : 'start') + '">' + (galleryPomodoro.running ? 'Pause' : 'Start') + '</button>',
        '        <button class="cg-action cg-action-quiet cg-action-compact" type="button" data-pomo-action="reset">Reset</button>',
        '      </div>',
        '      <div class="cg-pomo-presets">' + options + '</div>',
        '      <div class="cg-gallery-plan-grid">',
        '    <label class="cg-setup-label cg-plan-field">Class / Block<input id="cg-plan-class" class="cg-input cg-plan-input" type="text" maxlength="80" value="' + escapeHtml(galleryPlan.classLabel || "") + '" placeholder="Grade 3 Reading Block"></label>',
        '    <label class="cg-setup-label cg-plan-field">Day / Date<input id="cg-plan-date" class="cg-input cg-plan-input" type="text" maxlength="60" value="' + escapeHtml(galleryPlan.sessionDate || "") + '" placeholder="Monday · March 8"></label>',
        '    <label class="cg-setup-label cg-plan-field cg-plan-field-wide">Agenda<textarea id="cg-plan-agenda" class="cg-input cg-plan-textarea" rows="4" placeholder="Warm-up&#10;Mini-lesson&#10;Word Quest rotation&#10;Exit ticket">' + escapeHtml(galleryPlan.agenda || "") + '</textarea></label>',
        '      </div>',
        '  </div>',
        ' </div>',
        '</section>'
      ].join("");
    }

    function renderPomodoroPopout() {
      if (!pomodoroPopout || pomodoroPopout.closed) return;
      var visual = pomodoroVisualModel();
      pomodoroPopout.document.title = "Class Timer";
      pomodoroPopout.document.body.innerHTML = [
        '<style>',
        'body{margin:0;font-family:ui-rounded,system-ui,sans-serif;background:#0f2745;color:#f8fafc;display:grid;place-items:center;min-height:100vh;}',
        '.wrap{width:min(92vw,320px);padding:18px;border-radius:24px;background:linear-gradient(180deg,rgba(18,48,79,.96),rgba(8,23,41,.96));box-shadow:0 18px 40px rgba(2,6,23,.45);text-align:center;}',
        '.ring{position:relative;width:188px;height:188px;margin:0 auto 14px;}',
        'svg{width:100%;height:100%;transform:rotate(-90deg)}',
        '.track{fill:none;stroke:rgba(255,255,255,.12);stroke-width:10}',
        '.prog{fill:none;stroke:#7ccf2e;stroke-width:10;stroke-linecap:round}',
        '.copy{position:absolute;inset:0;display:grid;place-items:center;text-align:center;padding:24px;}',
        '.mode{font-size:12px;font-weight:800;letter-spacing:.14em;text-transform:uppercase;color:rgba(226,232,240,.72)}',
        '.time{font-size:32px;font-weight:900;color:#fff}',
        '.sub{font-size:12px;color:rgba(226,232,240,.8)}',
        '</style>',
        '<div class="wrap"><div class="ring"><svg viewBox="0 0 120 120"><circle class="track" cx="60" cy="60" r="44"></circle><circle class="prog" cx="60" cy="60" r="44" stroke-dasharray="' + visual.dasharray + '" stroke-dashoffset="' + visual.offset + '"></circle></svg><div class="copy"><div><div class="mode">' + visual.title + '</div><div class="time">' + visual.value + '</div><div class="sub">' + visual.sublabel + '</div></div></div></div></div>'
      ].join("");
    }

    var engine = runtimeRoot.CSGameEngine.create({
      games: games,
      initialGameId: recommendedGame,
      context: context,
      sound: sound,
      settings: {
        viewMode: "individual",
        difficulty: "core",
        wordConnectionsDifficulty: 3,
        wordConnectionsMode: "speak",
        wordClueCardStyle: "standard",
        wordClueGradeBand: "K-1",
        wordClueSubject: "ELA",
        wordClueDeckId: "",
        wordClueCurriculum: "",
        wordClueDifficulty: "all",
        contentMode: context.contentMode || "lesson",
        timerEnabled: (recommendedGame === "word-typing" || recommendedGame === "word-connections")
          ? false
          : !(recommendedGame === "word-typing" && context.typingPlacementRequired),
        hintsEnabled: true,
        soundEnabled: false,
        customWordSet: "",
        lessonLock: true
      }
    });

    function wordClueRoundNeedsDeckRefresh(state) {
      if (!state || state.selectedGameId !== "word-connections" || !state.round) return false;
      var target = String(state.round.targetWord || "").trim().toLowerCase();
      var recordId = String(state.round.cardRecordId || "").trim();
      return !recordId || target === "no matching cards" || target === "loading cards…";
    }

    if (runtimeRoot && typeof runtimeRoot.addEventListener === "function") {
      runtimeRoot.addEventListener("cs-word-clue-decks-updated", function (event) {
        var detail = event && event.detail || {};
        if (!detail.loaded || !detail.matchedCount) return;
        var state = engine.getState();
        if (!wordClueRoundNeedsDeckRefresh(state)) return;
        resetRoundUi();
        engine.restartGame();
        render();
      });
    }

    function setTypingCurrentLessonByOrder(order) {
      var nextLesson = typingLessonByOrder(order);
      if (!nextLesson) return null;
      typingProgress.currentLessonOrder = Number(nextLesson.lessonOrder || order || 1);
      typingProgress.currentLessonId = nextLesson.id;
      saveTypingProgress(context, typingProgress);
      refreshTypingCourseContext();
      return nextLesson;
    }

    function persistTypingContextToEngine() {
      engine.updateContext({
        contentMode: context.contentMode,
        typingCourseMode: context.typingCourseMode,
        typingPlacementRequired: context.typingPlacementRequired,
        currentTypingLessonId: context.currentTypingLessonId,
        currentTypingLessonOrder: context.currentTypingLessonOrder,
        typingUnlockedOrder: context.typingUnlockedOrder,
        typingCompletedLessons: context.typingCompletedLessons.slice(),
        typingPlacementRecommendedLessonOrder: context.typingPlacementRecommendedLessonOrder
      });
    }

    function startTypingRound() {
      var state = engine.getState();
      if (state.selectedGameId !== "word-typing" || !state.round) return;
      uiState.typingStartedRoundId = state.round.id;
      if (!uiState.typingRoundStartedAt) uiState.typingRoundStartedAt = 0;
      render();
      runtimeRoot.requestAnimationFrame(function () {
        var input = document.getElementById("cg-word-typing-input");
        if (input && typeof input.focus === "function") input.focus();
      });
    }

    function restartTypingLesson(order) {
      if (typeof order === "number") setTypingCurrentLessonByOrder(order);
      refreshTypingCourseContext();
      persistTypingContextToEngine();
      resetRoundUi();
      engine.updateSettings({ timerEnabled: false });
      engine.restartGame();
    }

    function stopWordClueTimer() {
      if (uiState.wordClueTimerId) {
        runtimeRoot.clearInterval(uiState.wordClueTimerId);
        uiState.wordClueTimerId = 0;
      }
      uiState.wordClue.timerRunning = false;
      uiState.wordClue.paused = false;
    }

    function wordCluePresetSeconds(value) {
      var key = String(value || "45");
      if (key === "untimed") return 0;
      if (key === "30") return 30;
      if (key === "60") return 60;
      return 45;
    }

    function syncWordClueRoundState(state) {
      if (!state || state.selectedGameId !== "word-connections" || !state.round) return;
      var clue = uiState.wordClue;
      if (clue.roundId === state.round.id) return;
      stopWordClueTimer();
      clue.roundId = state.round.id;
      clue.phase = "setup";
      if (clue.screen !== "play") clue.screen = "landing";
      clue.mode = String(state.round.playMode || clue.mode || "speak").toLowerCase();
      clue.blockedCount = Number(state.round.blockedCount || clue.blockedCount || 4);
      clue.setupOpen = false;
      clue.result = "";
      clue.timerRemaining = wordCluePresetSeconds(clue.timerPreset);
    }

    function wordClueStyleDescription(style) {
      if (style === "picture") return "Use the image to cue language without naming off-limits words.";
      if (style === "draw") return "Sketch the idea. No text or letters on the drawing.";
      if (style === "act") return "Act it out without saying the target or off-limits words.";
      if (style === "mixed") return "Mix speaking, drawing, and acting while keeping the clue words off limits.";
      if (style === "relay") return "Team relay: each speaker adds one legal clue.";
      return "Standard clue: one speaker gives a clear verbal clue.";
    }

    function startWordClueTimer(state) {
      var clue = uiState.wordClue;
      var duration = wordCluePresetSeconds(clue.timerPreset);
      stopWordClueTimer();
      if (!duration) {
        clue.timerRemaining = 0;
        return;
      }
      clue.timerRemaining = duration;
      clue.timerRunning = true;
      clue.paused = false;
      uiState.wordClueTimerId = runtimeRoot.setInterval(function () {
        if (clue.paused) return;
        clue.timerRemaining = Math.max(0, Number(clue.timerRemaining || 0) - 1);
        if (clue.timerRemaining <= 0) {
          stopWordClueTimer();
          clue.phase = "reveal";
          clue.result = "timeout";
          if (state.selectedGameId === "word-connections" && state.status === "playing") {
            engine.submit({ timedOut: true, value: "" });
          }
        }
        render();
      }, 1000);
    }

    function syncTypingProgressFromState(state) {
      if (state.selectedGameId !== "word-typing" || !state.round || !state.lastOutcome || state.status !== "round-summary") return;
      var lessonKey = [
        state.round.id,
        state.status,
        state.lastOutcome.correct,
        state.lastOutcome.stats && state.lastOutcome.stats.wpm || 0,
        state.lastOutcome.stats && state.lastOutcome.stats.accuracy || 0
      ].join(":");
      if (uiState.lastTypingPersistKey === lessonKey) return;
      uiState.lastTypingPersistKey = lessonKey;

      if (state.round.courseMode === "placement") {
        var recommendedOrder = typingPlacementRecommendation(typingProgress, typingPlacementRows, state.history);
        typingProgress.placementCompleted = true;
        typingProgress.placementRecommendedLessonOrder = recommendedOrder;
        typingProgress.unlockedLessonOrder = Math.max(typingProgress.unlockedLessonOrder || 1, recommendedOrder);
        setTypingCurrentLessonByOrder(recommendedOrder);
        saveTypingProgress(context, typingProgress);
        refreshTypingCourseContext();
        persistTypingContextToEngine();
        return;
      }

      var complete = !!(state.lastOutcome && state.lastOutcome.correct);
      var stats = Object.assign({}, typingLiveMetrics(uiState, state.round, state.round.target || ""), state.lastOutcome.stats || {});
      var stars = typingMasteryStars(stats, state.round, complete);
      var ready = typingReadyToAdvance(stats, state.round, complete);
      typingProgress.lessonResults[state.round.id] = {
        stars: Math.max(stars, Number(typingProgress.lessonResults[state.round.id] && typingProgress.lessonResults[state.round.id].stars || 0)),
        wpm: Math.max(Number(stats.wpm || 0), Number(typingProgress.lessonResults[state.round.id] && typingProgress.lessonResults[state.round.id].wpm || 0)),
        accuracy: Math.max(Number(stats.accuracy || 0), Number(typingProgress.lessonResults[state.round.id] && typingProgress.lessonResults[state.round.id].accuracy || 0)),
        complete: ready
      };
      if (ready) {
        if (typingProgress.completedLessonIds.indexOf(state.round.id) < 0) typingProgress.completedLessonIds.push(state.round.id);
        typingProgress.unlockedLessonOrder = Math.max(Number(typingProgress.unlockedLessonOrder || 1), Number(state.round.lessonOrder || 1) + 1);
        setTypingCurrentLessonByOrder(Number(state.round.lessonOrder || 1) + 1);
      } else {
        setTypingCurrentLessonByOrder(Number(state.round.lessonOrder || 1));
      }
      saveTypingProgress(context, typingProgress);
      refreshTypingCourseContext();
      persistTypingContextToEngine();
    }

    function resetRoundUi() {
      stopWordClueTimer();
      uiState.selectedChoice = "";
      uiState.builderSelection = [];
      uiState.revealedClues = 1;
      uiState.supportRevealOpen = false;
      uiState.detectiveSelection = "";
      uiState.typingLockedValue = "";
      uiState.typingErrorUntil = 0;
      uiState.typingRoundId = "";
      uiState.typingStartedRoundId = "";
      uiState.typingRoundStartedAt = 0;
      uiState.typingAcceptedChars = 0;
      uiState.typingMistakes = 0;
      uiState.categoryPreview = [];
      uiState.wordClue.roundId = "";
      uiState.wordClue.phase = "setup";
      uiState.wordClue.setupOpen = false;
      uiState.wordClue.result = "";
      uiState.wordClue.timerRemaining = wordCluePresetSeconds(uiState.wordClue.timerPreset);
    }

    function applyMetricBumps(state) {
      var now = Date.now();
      if (state.score > uiState.previous.score) uiState.bumpUntil.score = now + 260;
      if (state.streak > uiState.previous.streak) uiState.bumpUntil.streak = now + 260;
      if (state.roundsCompleted > uiState.previous.rounds) uiState.bumpUntil.rounds = now + 260;
      uiState.previous.score = state.score;
      uiState.previous.streak = state.streak;
      uiState.previous.rounds = state.roundsCompleted;
    }

    function render() {
      var state = engine.getState();
      var currentGame = games[state.selectedGameId];
      syncWordClueRoundState(state);
      if (runtimeRoot.document && currentGame) {
        runtimeRoot.document.title = galleryOnly
          ? "Cornerstone MTSS - Game Platform"
          : ("Cornerstone MTSS - " + currentGame.title);
      }
      var projectorSuggested = state.settings.viewMode === "projector" || state.settings.viewMode === "classroom";
      runtimeRoot.document.documentElement.setAttribute("data-view-mode", state.settings.viewMode || "individual");
      runtimeRoot.document.body.setAttribute("data-shell-view", galleryOnly ? "gallery" : "play");
      runtimeRoot.document.body.setAttribute("data-game-id", state.selectedGameId || "");

      if (galleryOnly) {
        shell.innerHTML = [
          '<div class="cg-brandbar cg-brandbar--gallery">',
          '  <div class="cg-brand">',
          '    <div class="cg-brand-mark">' + runtimeRoot.CSGameComponents.iconFor(state.selectedGameId, "cg-icon cg-icon--game") + "</div>",
          '    <div class="cg-brand-copy">',
          '      <p class="cg-kicker">Cornerstone MTSS</p>',
          '      <h1 class="cg-display">Choose a Game</h1>',
          '      <p>Short, lesson-ready games for classroom practice, family play, and student choice.</p>',
          "    </div>",
          "  </div>",
          "</div>",
          '<section class="cg-gallery-shell">',
          '  <section class="cg-gallery-hero">',
          '    <div class="cg-gallery-hero__copy">',
          '      <p class="cg-kicker">Flagship routines</p>',
          '      <h2>Pick a routine. Start fast.</h2>',
          '      <p>Choose one strong practice move for the lesson in front of you.</p>',
          '      <div class="cg-gallery-hero__chips"><span class="cg-chip" data-tone="focus">Ready in one click</span><span class="cg-chip" data-tone="positive">Lesson-linked</span><span class="cg-chip">Small-group friendly</span></div>',
          "    </div>",
          '    <div class="cg-gallery-hero__panel">',
          '      <div class="cg-gallery-hero__panel-kicker">Best next move</div>',
          '      <strong>Use one clear game for one clear purpose.</strong>',
          '      <div class="cg-gallery-hero__panel-grid">',
          '        <div class="cg-gallery-hero__stat"><span>Guess</span><strong>Word Quest</strong><p>Vocabulary warm-up</p></div>',
          '        <div class="cg-gallery-hero__stat"><span>Type</span><strong>Typing Quest</strong><p>Fluency + keyboarding</p></div>',
          '        <div class="cg-gallery-hero__stat"><span>Clue</span><strong>Off Limits</strong><p>Speaking + teams</p></div>',
          '      </div>',
          "    </div>",
          "  </section>",
          '  <div class="cg-gallery-setup">',
          '    <div class="cg-setup-row">',
          '      <label class="cg-setup-label">Grade<select id="cg-setup-grade" class="cg-select cg-select-sm">',
          '        <option value="">Any</option>',
          '        <option value="K-2"' + (context.gradeBand === "K-2" ? " selected" : "") + '>K-2</option>',
          '        <option value="3-5"' + (context.gradeBand === "3-5" ? " selected" : "") + '>3-5</option>',
          '        <option value="6-8"' + (context.gradeBand === "6-8" ? " selected" : "") + '>6-8</option>',
          '        <option value="9-12"' + (context.gradeBand === "9-12" ? " selected" : "") + '>9-12</option>',
          '      </select></label>',
          '      <label class="cg-setup-label">Subject<select id="cg-setup-subject" class="cg-select cg-select-sm">',
          '        <option value="ELA"' + (!context.subject || context.subject === "ELA" ? " selected" : "") + '>ELA</option>',
          '        <option value="Intervention"' + (context.subject === "Intervention" ? " selected" : "") + '>Intervention</option>',
          '        <option value="Writing"' + (context.subject === "Writing" ? " selected" : "") + '>Writing</option>',
          '        <option value="Math"' + (context.subject === "Math" ? " selected" : "") + '>Math</option>',
          '        <option value="Science"' + (context.subject === "Science" ? " selected" : "") + '>Science</option>',
          '      </select></label>',
          '    </div>',
          '    <div class="cg-audio-cluster cg-audio-cluster--gallery" aria-label="Music controls"><button class="cg-action cg-action-quiet" type="button" data-action="toggle-music" aria-pressed="' + (sharedMusicState.enabled ? "true" : "false") + '">♫ ' + musicButtonLabel() + '</button><button class="cg-action cg-action-quiet" type="button" data-action="next-music">Next Vibe</button><span class="cg-audio-label" data-music-label>' + runtimeRoot.CSGameComponents.escapeHtml(musicStatusLabel()) + '</span></div>',
          '    <p class="cg-gallery-setup__hint">Filter once, then launch.</p>',
          '  </div>',
          renderPomodoroLauncher(),
          renderPomodoroWidget(),
          '  <div class="cg-gallery-grid">' + Object.keys(games).map(function (id) {
            var isRec = id === recommendedGame;
            return runtimeRoot.CSGameComponents.renderGameCard(games[id], isRec, {
              href: galleryLaunchHref(id, context),
              actionLabel: isRec ? "Start Recommended" : "Open Game",
              caption: galleryCaption(id)
            });
          }).join("") + "</div>",
          "</section>"
        ].join("");
        bindInteractions();
        assertViewportFit(state);
        return;
      }

      var typingHubMode = currentGame.id === "word-typing" && !params.typingPage;
      var typingRuntimeMode = currentGame.id === "word-typing" && params.typingPage;
      var teacherPanelMarkup = uiState.teacherPanelOpen ? [
        '<section class="cg-main-card cg-surface" id="cg-teacher-panel">',
        '  <div class="cg-teacher-panel-head"><p class="cg-kicker">Teacher Control Panel</p><h3>Set the round tone</h3><p class="cg-teacher-panel-copy">Starts with K-2 friendly curriculum words by default.</p></div>',
        '  <div class="cg-control-grid cg-control-grid--teacher">',
        '    <div class="cg-field"><label for="cg-grade-band">Age / Grade Band</label><select id="cg-grade-band" class="cg-select"><option value="K-2">K-2</option><option value="3-5">3-5</option><option value="6-8">6-8</option><option value="9-12">9-12</option></select></div>',
        '    <div class="cg-field"><label for="cg-word-source">Word Source</label><select id="cg-word-source" class="cg-select"><option value="lesson">Curriculum deck</option><option value="random">Random graded bank</option><option value="custom">Teacher word list</option><option value="mixed">Teacher + bank mix</option></select><small class="cg-field-help">Word Clue works best with words students can describe, draw, or act out.</small></div>',
        '    <div class="cg-field cg-field--wide"><label for="cg-custom-word-set">Teacher Word List</label><textarea id="cg-custom-word-set" class="cg-textarea" rows="3" placeholder="Add one word per line or use commas. Example: dog, rain, bicycle">' + runtimeRoot.CSGameComponents.escapeHtml(state.settings.customWordSet || "") + '</textarea><small class="cg-field-help">Use this for your own lesson list, focus group words, or a quick custom round.</small></div>',
        '    <div class="cg-toggle-cluster">',
        '      <label class="cg-checkbox"><input id="cg-toggle-team-play" type="checkbox"' + (isGroupView(state) ? " checked" : "") + '>Team play</label>',
        '      <label class="cg-checkbox"><input id="cg-toggle-timer" type="checkbox"' + (state.settings.timerEnabled ? " checked" : "") + '>Timer enabled</label>',
        '      <label class="cg-checkbox"><input id="cg-toggle-hints" type="checkbox"' + (state.settings.hintsEnabled ? " checked" : "") + '>Hints enabled</label>',
        '      <label class="cg-checkbox"><input id="cg-toggle-shuffle-words" type="checkbox"' + (state.settings.shuffleWordOrder ? " checked" : "") + '>Shuffle teacher words</label>',
        '    </div>',
        '    <button class="cg-action cg-action-quiet cg-teacher-panel-override" type="button" data-action="teacher-override">' + runtimeRoot.CSGameComponents.iconFor("teacher") + 'Teacher Override</button>',
        "  </div>",
        "</section>"
      ].join("") : "";
      var stageKicker = typingHubMode ? "Course Hub" : (typingRuntimeMode ? "Typing Lesson" : "Now Playing");
      var stageTitle = currentGame.title;
      var stageSubtitle = typingHubMode
        ? "Typing Quest Foundations"
        : (typingRuntimeMode
          ? ((state.round && state.round.lessonLabel || "Lesson") + " · " + (state.round && state.round.stageLabel || "Typing practice"))
          : (state.round && state.round.promptLabel || currentGame.subtitle));
      var toolbarHomeHref = typingRuntimeMode
        ? withAppBase("game-platform.html?play=1&game=word-typing")
        : withAppBase("game-platform.html");
      var toolbarParts = [
        '<a class="cg-action cg-action-quiet" href="' + runtimeRoot.CSGameComponents.escapeHtml(toolbarHomeHref) + '">' + runtimeRoot.CSGameComponents.iconFor("context") + (typingRuntimeMode ? 'Course Hub' : 'All Games') + '</a>',
        '<button class="cg-action cg-action-quiet" type="button" data-action="toggle-teacher">' + runtimeRoot.CSGameComponents.iconFor("teacher") + (uiState.teacherPanelOpen ? "Close Panel" : "Teacher Controls") + "</button>",
        '<div class="cg-audio-cluster" aria-label="Music controls"><button class="cg-action cg-action-quiet" type="button" data-action="toggle-music" aria-pressed="' + (sharedMusicState.enabled ? "true" : "false") + '">♫ ' + musicButtonLabel() + '</button><button class="cg-action cg-action-quiet" type="button" data-action="next-music">Next Vibe</button><span class="cg-audio-label" data-music-label>' + runtimeRoot.CSGameComponents.escapeHtml(musicStatusLabel()) + '</span></div>'
      ];
      if (!typingHubMode) {
        toolbarParts.push('<button class="cg-action cg-action-quiet" type="button" data-action="hint">' + runtimeRoot.CSGameComponents.iconFor("hint") + "Hint</button>");
      }
      if (!typingHubMode || typingRuntimeMode) {
        toolbarParts.push('<button class="cg-action cg-action-primary" type="button" data-action="restart">' + runtimeRoot.CSGameComponents.iconFor("progress") + (typingRuntimeMode ? "Restart Lesson" : "Restart") + "</button>");
      }

      if (typingHubMode || typingRuntimeMode) {
        var typingSummary = typingCourseSummary(typingProgress, typingCourseRows);
        var typingHeaderSubtitle = typingRuntimeMode
          ? ((state.round && state.round.unitLabel || "Typing Quest Foundations") + " · " + (state.round && state.round.keyboardZone || "Keyboarding"))
          : "Typing Quest Foundations";
        var typingNavParts = [
          '<a class="cg-typing-appbar__brand" href="' + runtimeRoot.CSGameComponents.escapeHtml(withAppBase("game-platform.html?play=1&game=word-typing")) + '">Typing Quest</a>',
          '<nav class="cg-typing-appbar__nav">',
          '  <a class="cg-typing-appbar__link' + (typingHubMode ? ' is-active' : '') + '" href="' + runtimeRoot.CSGameComponents.escapeHtml(withAppBase("game-platform.html?play=1&game=word-typing")) + '">Course</a>',
          (typingRuntimeMode ? '  <a class="cg-typing-appbar__link is-active" href="' + runtimeRoot.CSGameComponents.escapeHtml(typingQuestHref({ typingCourseMode: state.round && state.round.courseMode || "lesson", lessonId: state.round && state.round.id || "", lessonOrder: state.round && state.round.lessonOrder || 1 })) + '">Lesson</a>' : ""),
          (typingRuntimeMode ? '  <button class="cg-typing-appbar__link" type="button" data-action="toggle-teacher">' + (uiState.teacherPanelOpen ? "Close Panel" : "Teacher Controls") + '</button>' : ""),
          '  <button class="cg-typing-appbar__link" type="button" data-action="toggle-music" aria-pressed="' + (sharedMusicState.enabled ? "true" : "false") + '">' + musicButtonLabel() + '</button>',
          '  <button class="cg-typing-appbar__link" type="button" data-action="next-music">Next Vibe</button>',
          (typingRuntimeMode ? '  <button class="cg-typing-appbar__link" type="button" data-action="hint">Hint</button>' : ""),
          (typingRuntimeMode ? '  <button class="cg-typing-appbar__link" type="button" data-action="restart">Restart</button>' : ""),
          "</nav>"
        ].join("");
        shell.innerHTML = [
          '<div class="cg-typing-app-shell' + (typingRuntimeMode ? " is-runtime" : " is-hub") + '">',
          '  <header class="cg-typing-appbar">',
          '    <div class="cg-typing-appbar__left">' + typingNavParts + '</div>',
          '    <div class="cg-typing-appbar__right">',
          '      ' + (typingHubMode
            ? '<span class="cg-typing-appbar__chip">Placement first</span>'
            : '<a class="cg-typing-appbar__link" href="' + runtimeRoot.CSGameComponents.escapeHtml(withAppBase("game-platform.html?play=1&game=word-typing")) + '">Course Hub</a>') +
          '      <span class="cg-audio-label" data-music-label>' + runtimeRoot.CSGameComponents.escapeHtml(musicStatusLabel()) + '</span>',
          '      <a class="cg-typing-appbar__link" href="' + runtimeRoot.CSGameComponents.escapeHtml(withAppBase("game-platform.html")) + '">All Games</a>',
          '    </div>',
          "  </header>",
          '  <div class="cg-typing-page-wrap">',
          renderTypingProgressStrip(typingSummary, { label: typingHeaderSubtitle }),
          '    <section class="cg-typing-page-shell">',
          '      <div id="cg-stage-board" class="cg-stage-board cg-stage-board--typing"></div>',
          "    </section>",
          teacherPanelMarkup,
          "  </div>",
          "</div>"
        ].join("");

        var typingStageBoard = document.getElementById("cg-stage-board");
        if (typingStageBoard && state.round) typingStageBoard.innerHTML = renderRoundBoard(state, currentGame);
        bindInteractions();
        hydrateControls(state);
        assertViewportFit(state);
        return;
      }

      if (currentGame.id === "word-connections" && state.round) {
        var clue = uiState.wordClue;
        var landingScreen = clue.screen !== "play";
        if (state.round && (typeof state.round.targetWord !== "string" || !Array.isArray(state.round.forbiddenWords))) {
          if (runtimeRoot.console && typeof runtimeRoot.console.error === "function") {
            runtimeRoot.console.error("[WordClue] Invalid active card object", state.round);
          }
        }
        var timerSeconds = wordCluePresetSeconds(clue.timerPreset);
        var timerBadge = timerSeconds ? (String(timerSeconds) + "s") : "Untimed";
        var styleBadge = String(clue.cardStyle || "standard").replace(/\b\w/g, function (ch) { return ch.toUpperCase(); });
        var presentationMode = String(state.round.presentationMode || clue.mode || "speak");
        var allowImage = presentationMode === "picture";
        var showDrawPrompt = presentationMode === "draw";
        var mixedStyle = clue.cardStyle === "mixed";
        var relayStyle = clue.cardStyle === "relay";
        var pictureStyle = presentationMode === "picture";
        var standardStyle = presentationMode === "speak";
        var revealSpeakerCard = clue.phase === "live" || clue.phase === "reveal";
        var stateLabel = clue.phase === "live" ? "Live" : clue.phase === "ready" ? "Ready" : clue.phase === "reveal" ? "Reveal" : "Setup";
        var resultLabel = clue.result === "gotit"
          ? "Solved"
          : clue.result === "pass"
            ? "Passed"
            : clue.result === "reveal"
              ? "Revealed"
          : clue.result === "timeout"
                ? "Time ended"
                : "";
        var blockedWords = (state.round.forbiddenWords || []).slice(0, Math.max(2, Number(clue.blockedCount || 4)));
        var hasBlockedWords = blockedWords.length > 0;
        if (String(state.round.targetWord || "").trim() && blockedWords.some(function (word) {
          return String(word || "").trim().toLowerCase() === String(state.round.targetWord || "").trim().toLowerCase();
        })) {
          if (runtimeRoot.console && typeof runtimeRoot.console.error === "function") {
            runtimeRoot.console.error("[WordClue] Active card failed integrity check: target is inside forbidden words", {
              targetWord: state.round.targetWord,
              forbiddenWords: blockedWords,
              cardRecordId: state.round.cardRecordId || ""
            });
          }
        }
        var revealHint = (state.round.scaffolds || [state.round.hint || "Use examples, function, or context clues."])[0] || "";
        var roundGuideTitle = clue.phase === "live"
          ? "Speaker live"
          : clue.phase === "reveal"
            ? "Round closed"
            : "Speaker check";
        var roundGuideCopy = clue.phase === "live"
          ? "Give one clear clue. Do not say the off-limits words. Let your team do the guessing."
          : clue.phase === "reveal"
            ? "Look at how the round went, then choose whether to replay, switch speakers, or move on."
            : "Pick a clue style, check the timer, and reveal the speaker card when you are ready.";
        var startRoundLabel = clue.phase === "setup"
          ? "Get Ready"
          : clue.phase === "ready"
            ? "Show Card"
            : "Card Live";
        if (landingScreen) {
          shell.innerHTML = [
            '<section class="cg-word-clue-landing" data-style="' + runtimeRoot.CSGameComponents.escapeHtml(clue.cardStyle) + '">',
            '  <header class="cg-word-clue-v2-topbar">',
            '    <div class="cg-word-clue-v2-title"><h1>Off Limits</h1></div>',
            '    <div class="cg-word-clue-v2-actions">' + toolbarParts.join("") + "</div>",
            "  </header>",
            teacherPanelMarkup,
            (uiState.teacherPanelOpen ? "" : [
              '  <section class="cg-word-clue-landing-hero">',
              '    <div class="cg-word-clue-landing-copy"><span class="cg-word-clue-landing-kicker">4 ways to play</span><h2>Pick a style. Then let the card lead.</h2></div>',
              '    <div class="cg-word-clue-landing-note"><span class="cg-word-clue-landing-kicker cg-word-clue-landing-kicker--quiet">Direct play</span><strong>Each card opens that mode.</strong></div>',
              "  </section>",
              '  <section class="cg-word-clue-landing-grid" aria-label="Word Clue formats">',
              '    <article class="cg-word-clue-format-card cg-word-clue-format-card--classic' + (clue.cardStyle === "standard" ? " is-active" : "") + '" role="button" tabindex="0" data-action="wc-open-format" data-format="standard"><div class="cg-word-clue-format-card__head"><span class="cg-chip">Classic</span></div><div class="cg-word-clue-format-card__preview cg-word-clue-format-card__preview--taboo"><div class="cg-word-clue-preview-topline"><span class="cg-word-clue-preview-label">Target Word</span></div><div class="cg-word-clue-preview-main"><strong>HOUSE</strong></div><div class="cg-word-clue-preview-footer cg-word-clue-preview-footer--alert"><span class="cg-word-clue-preview-section">Off Limits</span><div class="cg-word-clue-preview-list"><b>HOME</b><b>LIVE</b><b>FAMILY</b></div></div></div></article>',
              '    <article class="cg-word-clue-format-card cg-word-clue-format-card--draw' + (clue.cardStyle === "draw" ? " is-active" : "") + '" role="button" tabindex="0" data-action="wc-open-format" data-format="draw"><div class="cg-word-clue-format-card__head"><span class="cg-chip">Draw</span></div><div class="cg-word-clue-format-card__preview cg-word-clue-format-card__preview--drawcard"><div class="cg-word-clue-preview-topline"><span class="cg-word-clue-preview-label">Target Word</span></div><div class="cg-word-clue-preview-main cg-word-clue-preview-main--icon"><span class="cg-word-clue-preview-icon" aria-hidden="true">✏️</span><strong>SUN</strong></div><div class="cg-word-clue-preview-footer"><div class="cg-word-clue-preview-draw">Sketch it. No letters.</div></div></div></article>',
              '    <article class="cg-word-clue-format-card cg-word-clue-format-card--act' + (clue.cardStyle === "act" ? " is-active" : "") + '" role="button" tabindex="0" data-action="wc-open-format" data-format="act"><div class="cg-word-clue-format-card__head"><span class="cg-chip">Act</span></div><div class="cg-word-clue-format-card__preview cg-word-clue-format-card__preview--act"><div class="cg-word-clue-preview-topline"><span class="cg-word-clue-preview-label">Target Word</span></div><div class="cg-word-clue-preview-main cg-word-clue-preview-main--icon"><span class="cg-word-clue-preview-icon" aria-hidden="true">🙆</span><strong>JUMP</strong></div><div class="cg-word-clue-preview-footer"><div class="cg-word-clue-preview-act">Act it out. No words.</div></div></div></article>',
              '    <article class="cg-word-clue-format-card cg-word-clue-format-card--mixed' + (clue.cardStyle === "mixed" ? " is-active" : "") + '" role="button" tabindex="0" data-action="wc-open-format" data-format="mixed"><div class="cg-word-clue-format-card__head"><span class="cg-chip">Mixed</span></div><div class="cg-word-clue-format-card__preview cg-word-clue-format-card__preview--mix"><div class="cg-word-clue-preview-topline"><span class="cg-word-clue-preview-label">Target Word</span></div><div class="cg-word-clue-preview-main"><strong>HOUSE</strong></div><div class="cg-word-clue-preview-footer cg-word-clue-preview-footer--alert"><span class="cg-word-clue-preview-section">Style Mix</span><div class="cg-word-clue-preview-list"><b>SAY</b><b>DRAW</b><b>ACT</b></div></div></div></article>',
              "  </section>"
            ].join("")),
            "</section>"
          ].join("");
          bindInteractions();
          hydrateControls(state);
          assertViewportFit(state);
          return;
        }
        shell.innerHTML = [
          '<section class="cg-word-clue-v2' + (clue.setupOpen ? ' has-setup-open' : '') + (uiState.teacherPanelOpen ? ' has-teacher-open' : '') + '" data-phase="' + runtimeRoot.CSGameComponents.escapeHtml(clue.phase) + '" data-style="' + runtimeRoot.CSGameComponents.escapeHtml(clue.cardStyle) + '">',
          '  <header class="cg-word-clue-v2-topbar">',
          '    <div class="cg-word-clue-v2-title"><h1>Off Limits</h1></div>',
          '    <div class="cg-word-clue-v2-actions">' + toolbarParts.join("") + '<button class="cg-action cg-action-quiet" type="button" data-action="wc-back-landing">Formats</button><button class="cg-action cg-action-quiet" type="button" data-action="wc-toggle-setup">' + runtimeRoot.CSGameComponents.escapeHtml(clue.setupOpen ? "Close Round Setup" : "Round Setup") + "</button></div>",
          "  </header>",
          teacherPanelMarkup,
          '  <main class="cg-word-clue-v2-stage">',
          '    <div class="cg-word-clue-v2-stage-grid">',
          '    <article class="cg-word-clue-v2-card">',
          '      <div class="cg-word-clue-v2-card-head">',
          (clue.phase !== "setup" ? ('        <span class="cg-chip cg-word-clue-state" data-state="' + runtimeRoot.CSGameComponents.escapeHtml(clue.phase) + '">' + runtimeRoot.CSGameComponents.escapeHtml(stateLabel) + '</span>') : ""),
          (state.round.teacherCreated ? '        <span class="cg-chip">Teacher card</span>' : ""),
          "      </div>",
          '      <div class="cg-word-clue-v2-guide"><span class="cg-word-clue-v2-guide-kicker">' + runtimeRoot.CSGameComponents.escapeHtml(roundGuideTitle) + '</span><p>' + runtimeRoot.CSGameComponents.escapeHtml(roundGuideCopy) + '</p></div>',
          '      <div class="cg-word-clue-target-card cg-word-clue-target-card--portrait' + (standardStyle ? " is-standard" : "") + (pictureStyle ? " is-picture" : "") + (showDrawPrompt ? " is-draw" : "") + (mixedStyle ? " is-mixed" : "") + (relayStyle ? " is-relay" : "") + (!revealSpeakerCard ? " is-concealed" : "") + '">',
          (revealSpeakerCard
            ? ('        <p class="cg-word-clue-target-label">Target Word</p>'
              + '        <div class="cg-word-clue-target">' + runtimeRoot.CSGameComponents.escapeHtml(state.round.targetWord || "") + '</div>'
              + (clue.categoryContext ? ('        <span class="cg-word-clue-category">' + runtimeRoot.CSGameComponents.escapeHtml(clue.categoryContext) + '</span>') : "")
              + (allowImage
                ? ('        <div class="cg-word-clue-image-zone">' + (state.round.imageSrc
                  ? ('<img class="cg-word-clue-image" src="' + runtimeRoot.CSGameComponents.escapeHtml(state.round.imageSrc) + '" alt="' + runtimeRoot.CSGameComponents.escapeHtml((state.round.targetWord || "Target") + " visual support") + '">')
                  : ('<div class="cg-word-clue-image-placeholder"><span class="cg-word-clue-visual-art" aria-hidden="true">' + runtimeRoot.CSGameComponents.escapeHtml(state.round.visualGlyph || "🖼️") + '</span><span class="cg-word-clue-visual-label">Picture clue</span></div>')) + '</div>')
                : "")
              + (showDrawPrompt ? '        <div class="cg-word-clue-draw-zone"><strong>Draw It</strong><span>Sketch the idea. Do not write letters.</span></div>' : "")
              + (relayStyle ? '<div class="cg-word-clue-relay-band"><span>Speaker 1</span><span>Speaker 2</span><span>Speaker 3</span></div>' : "")
              + (mixedStyle ? '<div class="cg-word-clue-urgency">Mixed round: the clue style can change each turn.</div>' : "")
              + '        <div class="cg-word-clue-danger" aria-label="Off-limits words">'
              + '          <div class="cg-word-clue-danger-head"><strong>Off Limits</strong><span>Try not to use these clue words</span></div>'
              + '          <ul class="cg-word-clue-blocked">' + (hasBlockedWords
                ? blockedWords.map(function (word, index) {
                    return '<li><span class="cg-word-clue-blocked-index">' + String(index + 1) + '</span><span class="cg-word-clue-blocked-word">' + runtimeRoot.CSGameComponents.escapeHtml(word) + "</span></li>";
                  }).join("")
                : '<li class="cg-word-clue-blocked-empty"><span class="cg-word-clue-blocked-index">!</span><span class="cg-word-clue-blocked-word">No off-limits words available for this card. Check filters or deck data.</span></li>') + '</ul>'
              + "        </div>")
            : ('        <div class="cg-word-clue-cover"><span class="cg-word-clue-cover-kicker">Off Limits</span><strong>Speaker card ready</strong><span>Press Show Card to flip and reveal the word.</span></div>')),
          "      </div>",
          '      <div class="cg-word-clue-prompt">' + runtimeRoot.CSGameComponents.escapeHtml(wordClueStyleDescription(clue.cardStyle)) + "</div>",
          (clue.phase === "reveal" && resultLabel ? ('      <div class="cg-word-clue-result" data-result="' + runtimeRoot.CSGameComponents.escapeHtml(clue.result || "reveal") + '"><strong>' + runtimeRoot.CSGameComponents.escapeHtml(resultLabel) + '</strong><span>' + runtimeRoot.CSGameComponents.escapeHtml(clue.result === "gotit" ? "Strong clue round." : (clue.result === "timeout" ? "Timer expired before a solve." : "Round closed.")) + "</span></div>") : ""),
          "    </article>",
          '    <aside class="cg-word-clue-v2-setup' + (clue.setupOpen ? " is-open" : "") + '">',
          '      <div class="cg-word-clue-v2-setup-head"><h3>Round setup</h3><p>Secondary controls</p></div>',
          '      <label class="cg-field"><span>Class mode</span><select id="cg-word-clue-group" class="cg-select"><option value="individual"' + (clue.groupMode === "individual" ? " selected" : "") + '>Individual</option><option value="partners"' + (clue.groupMode === "partners" ? " selected" : "") + '>Partners</option><option value="teams"' + (clue.groupMode === "teams" ? " selected" : "") + '>Teams</option><option value="whole-class"' + (clue.groupMode === "whole-class" ? " selected" : "") + '>Whole class</option></select></label>',
          '      <label class="cg-field"><span>Round type</span><select id="cg-word-connections-mode" class="cg-select"><option value="speak"' + (clue.mode === "speak" ? " selected" : "") + '>Classic clue</option><option value="picture"' + (clue.mode === "picture" ? " selected" : "") + '>Picture clue</option><option value="draw"' + (clue.mode === "draw" ? " selected" : "") + '>Draw it</option><option value="mixed"' + (clue.mode === "mixed" ? " selected" : "") + '>Mixed</option></select></label>',
          '      <label class="cg-field"><span>Difficulty</span><select id="cg-word-connections-difficulty" class="cg-select"><option value="1"' + (clue.blockedCount === 2 ? " selected" : "") + '>2 off-limits words</option><option value="2"' + (clue.blockedCount === 3 ? " selected" : "") + '>3 off-limits words</option><option value="3"' + (clue.blockedCount === 4 ? " selected" : "") + '>4 off-limits words</option><option value="4"' + (clue.blockedCount === 5 ? " selected" : "") + '>5 off-limits words</option></select></label>',
          '      <label class="cg-field"><span>Timer</span><select id="cg-word-clue-timer" class="cg-select"><option value="untimed"' + (clue.timerPreset === "untimed" ? " selected" : "") + '>Untimed</option><option value="30"' + (clue.timerPreset === "30" ? " selected" : "") + '>30s</option><option value="45"' + (clue.timerPreset === "45" ? " selected" : "") + '>45s</option><option value="60"' + (clue.timerPreset === "60" ? " selected" : "") + '>60s</option></select></label>',
          '      <label class="cg-field"><span>Category</span><input id="cg-word-clue-category" class="cg-input" type="text" maxlength="48" value="' + runtimeRoot.CSGameComponents.escapeHtml(clue.categoryContext || "") + '" placeholder="e.g., Ecosystems"></label>',
          '      <div class="cg-word-clue-setup-divider"></div>',
          '      <label class="cg-field"><span>Filter grade band</span><select id="cg-word-clue-filter-grade" class="cg-select"><option value="K-1"' + (clue.filterGradeBand === "K-1" ? " selected" : "") + '>K-1</option><option value="G2-3"' + (clue.filterGradeBand === "G2-3" ? " selected" : "") + '>G2-3</option><option value="G4-5"' + (clue.filterGradeBand === "G4-5" ? " selected" : "") + '>G4-5</option></select></label>',
          '      <label class="cg-field"><span>Filter deck</span><select id="cg-word-clue-filter-deck" class="cg-select"><option value=""' + (!clue.filterDeckId ? " selected" : "") + '>All decks</option><option value="taboo_phonics_k_1_starter_30"' + (clue.filterDeckId === "taboo_phonics_k_1_starter_30" ? " selected" : "") + '>K-1 starter</option><option value="taboo_phonics_g2_3_starter_30"' + (clue.filterDeckId === "taboo_phonics_g2_3_starter_30" ? " selected" : "") + '>G2-3 starter</option><option value="taboo_phonics_g4_5_starter_30"' + (clue.filterDeckId === "taboo_phonics_g4_5_starter_30" ? " selected" : "") + '>G4-5 starter</option></select></label>',
          '      <label class="cg-field"><span>Curriculum tag</span><input id="cg-word-clue-filter-curriculum" class="cg-input" type="text" maxlength="48" value="' + runtimeRoot.CSGameComponents.escapeHtml(clue.filterCurriculum || "") + '" placeholder="e.g., Weather"></label>',
          '      <label class="cg-field"><span>Deck difficulty</span><select id="cg-word-clue-filter-difficulty" class="cg-select"><option value="all"' + (clue.filterDifficulty === "all" ? " selected" : "") + '>All</option><option value="core"' + (clue.filterDifficulty === "core" ? " selected" : "") + '>Core</option><option value="stretch"' + (clue.filterDifficulty === "stretch" ? " selected" : "") + '>Stretch</option></select></label>',
          '      <div class="cg-word-clue-setup-divider"></div>',
          '      <h4 class="cg-word-clue-setup-subhead">Teacher card</h4>',
          '      <label class="cg-field"><span>Target word</span><input id="cg-word-clue-custom-target" class="cg-input" type="text" maxlength="48" value="' + runtimeRoot.CSGameComponents.escapeHtml(clue.customTargetWord || "") + '" placeholder="e.g., Chair"></label>',
          '      <label class="cg-field"><span>Forbidden words (comma separated)</span><input id="cg-word-clue-custom-forbidden" class="cg-input" type="text" maxlength="160" value="' + runtimeRoot.CSGameComponents.escapeHtml(clue.customForbiddenWords || "") + '" placeholder="sit, seat, table, legs"></label>',
          '      <label class="cg-field"><span>Grade band</span><select id="cg-word-clue-custom-grade" class="cg-select"><option value="K-1"' + (clue.customGradeBand === "K-1" ? " selected" : "") + '>K-1</option><option value="G2-3"' + (clue.customGradeBand === "G2-3" ? " selected" : "") + '>G2-3</option><option value="G4-5"' + (clue.customGradeBand === "G4-5" ? " selected" : "") + '>G4-5</option></select></label>',
          '      <label class="cg-field"><span>Subject</span><select id="cg-word-clue-custom-subject" class="cg-select"><option value="ELA"' + (clue.customSubject === "ELA" ? " selected" : "") + '>ELA</option><option value="SCIENCE"' + (clue.customSubject === "SCIENCE" ? " selected" : "") + '>Science</option><option value="SEL"' + (clue.customSubject === "SEL" ? " selected" : "") + '>SEL</option></select></label>',
          '      <label class="cg-field"><span>Curriculum tag</span><input id="cg-word-clue-custom-curriculum" class="cg-input" type="text" maxlength="48" value="' + runtimeRoot.CSGameComponents.escapeHtml(clue.customCurriculumTag || "") + '" placeholder="e.g., Classroom routines"></label>',
          '      <button class="cg-action cg-action-quiet" type="button" data-action="wc-save-custom-card">Save to custom deck</button>',
          '      <textarea id="cg-word-connections-text" class="cg-textarea" placeholder="' + runtimeRoot.CSGameComponents.escapeHtml("Notes / transcript (optional)…") + '" aria-label="Clue notes"></textarea>',
          (clue.phase === "reveal" ? ('      <div class="cg-word-clue-reveal-note"><strong>Reveal support:</strong> ' + runtimeRoot.CSGameComponents.escapeHtml(revealHint) + "</div>") : ""),
          "    </aside>",
          "    </div>",
          "  </main>",
          '  <footer class="cg-word-clue-v2-controls">',
          '    <div class="cg-word-clue-timer' + (clue.phase === "live" && timerSeconds ? " is-live" : "") + '"' + (!timerSeconds ? ' data-untimed="true"' : "") + '><span>' + (timerSeconds ? "Countdown" : "Untimed") + '</span><strong class="timer">' + (timerSeconds ? runtimeRoot.CSGameComponents.escapeHtml(String(clue.timerRemaining || timerSeconds) + "s") : "No timer") + '</strong></div>',
          '    <div class="cg-word-clue-v2-action-row">',
          '      <button class="cg-action cg-action-primary" type="button" data-action="wc-start-round">' + runtimeRoot.CSGameComponents.escapeHtml(startRoundLabel) + '</button>',
          '      <button class="cg-action cg-action-quiet" type="button" data-action="wc-pass">Pass</button>',
          '      <button class="cg-action cg-action-primary" type="button" data-action="wc-got-it">Got it</button>',
          '      <button class="cg-action cg-action-quiet" type="button" data-action="wc-reveal">Reveal</button>',
          '      <button class="cg-action cg-action-quiet" type="button" data-action="next-round">Next Card</button>',
          "    </div>",
          "  </footer>",
          "</section>"
        ].join("");
        bindInteractions();
        hydrateControls(state);
        assertViewportFit(state);
        return;
      }

      var compactStageChrome = currentGame.id === "morphology-builder";
      shell.innerHTML = [
        '<div class="cg-brandbar cg-brandbar--play">',
        '  <div class="cg-brand">',
        '    <div class="cg-brand-mark">' + runtimeRoot.CSGameComponents.iconFor(state.selectedGameId, "cg-icon cg-icon--game") + "</div>",
        '    <div class="cg-brand-copy">',
        '      <p class="cg-kicker">Cornerstone MTSS</p>',
        '      <h1 class="cg-display">' + runtimeRoot.CSGameComponents.escapeHtml(currentGame.title) + "</h1>",
        '      <p>' + runtimeRoot.CSGameComponents.escapeHtml(currentGame.subtitle) + "</p>",
        "    </div>",
        "  </div>",
        '  <div class="cg-toolbar">' + toolbarParts.join("") + '</div>',
        "</div>",
        '<div class="cg-play-shell">',
        '  <section class="cg-main-card cg-surface cg-stage-shell cg-stage-shell--focused">',
        '    <div class="cg-stage-meta">',
        (compactStageChrome ? "" : '      <div class="cg-stage-head">'),
        (compactStageChrome ? "" : "        <div>"),
        (compactStageChrome ? "" : ('          <p class="cg-kicker">' + runtimeRoot.CSGameComponents.escapeHtml(stageKicker) + '</p>')),
        (compactStageChrome ? "" : ('          <h2 class="cg-display">' + runtimeRoot.CSGameComponents.escapeHtml(stageTitle) + '</h2>')),
        (compactStageChrome ? "" : ('          <p>' + runtimeRoot.CSGameComponents.escapeHtml(stageSubtitle) + '</p>')),
        (compactStageChrome ? "" : "        </div>"),
        (compactStageChrome ? "" : '        <div class="cg-stage-toolbar">'),
        (compactStageChrome ? "" : ('          <span class="cg-chip">' + runtimeRoot.CSGameComponents.iconFor("projector") + runtimeRoot.CSGameComponents.escapeHtml((runtimeRoot.CSGameModes.VIEW_MODES[state.settings.viewMode] || {}).label || "Individual") + '</span>')),
        (compactStageChrome ? "" : ('          <span class="cg-chip">' + runtimeRoot.CSGameComponents.iconFor("progress") + runtimeRoot.CSGameComponents.escapeHtml((runtimeRoot.CSGameModes.DIFFICULTY[state.settings.difficulty] || {}).label || "Core") + '</span>')),
        (compactStageChrome ? "" : (typingHubMode ? '          <span class="cg-chip" data-tone="focus">' + runtimeRoot.CSGameComponents.iconFor("context") + 'Lesson plans</span>' : '          <span class="cg-chip" data-tone="' + (state.settings.timerEnabled ? "positive" : "warning") + '">' + runtimeRoot.CSGameComponents.iconFor("timer") + (state.settings.timerEnabled ? "Timed" : "Untimed") + '</span>')),
        (compactStageChrome ? "" : (state.streak >= 2 ? '          <span class="cg-chip cg-chip-streak" data-tone="positive">' + runtimeRoot.CSGameComponents.iconFor("progress") + state.streak + '\u2009streak</span>' : "")),
        (compactStageChrome ? "" : "        </div>"),
        (compactStageChrome ? "" : "      </div>"),
        (compactStageChrome ? "" : '      <div class="cg-context-chips">'),
        (compactStageChrome ? "" : ('        <span class="cg-chip" data-tone="focus">' + runtimeRoot.CSGameComponents.iconFor("context") + runtimeRoot.CSGameComponents.escapeHtml(supportLine(context, state)) + '</span>')),
        (compactStageChrome ? "" : (projectorSuggested ? '<span class="cg-chip">' + runtimeRoot.CSGameComponents.iconFor("projector") + 'Projector-safe layout ready</span>' : "")),
        (compactStageChrome ? "" : "      </div>"),
        (compactStageChrome || currentGame.id === "word-typing" ? "" : renderFeedback(state.feedback)),
        (currentGame.id === "word-typing" ? "" : renderResultBanner(state, currentGame)),
        '      <div id="cg-stage-board" class="cg-stage-board"></div>',
        "    </div>",
        "  </section>",
        teacherPanelMarkup,
        "</div>"
      ].join("");

      var stageBoard = document.getElementById("cg-stage-board");
      if (stageBoard && state.round) stageBoard.innerHTML = renderRoundBoard(state, currentGame);
      bindInteractions();
      hydrateControls(state);
      assertViewportFit(state);
    }

    function assertViewportFit(state) {
      if (!runtimeRoot || !runtimeRoot.console || typeof runtimeRoot.console.warn !== "function") return;
      var host = runtimeRoot.location && /localhost|127\.0\.0\.1/.test(String(runtimeRoot.location.hostname || ""));
      if (!host) return;
      var vw = runtimeRoot.innerWidth || 0;
      var vh = runtimeRoot.innerHeight || 0;
      function measure(selector) {
        var node = document.querySelector(selector);
        if (!node) return null;
        var r = node.getBoundingClientRect();
        return {
          selector: selector,
          left: Math.round(r.left),
          right: Math.round(r.right),
          top: Math.round(r.top),
          bottom: Math.round(r.bottom),
          width: Math.round(r.width),
          height: Math.round(r.height)
        };
      }
      function out(rect) {
        return rect && (rect.left < -1 || rect.right > vw + 1 || rect.bottom > vh + 1);
      }
      if (state && state.selectedGameId === "word-typing") {
        var overlays = Array.prototype.filter.call(document.querySelectorAll(".cg-typing-course-page, .cg-typing-runtime"), function (node) {
          if (!node) return false;
          var rect = node.getBoundingClientRect();
          return rect.width > 0 && rect.height > 0;
        });
        if (overlays.length > 1) {
          runtimeRoot.console.warn("[LayoutFit][typing] duplicate visible layers", { count: overlays.length });
        }
        var typingRect = measure(".cg-typing-runtime")
          || measure(".cg-typing-page-shell")
          || measure(".cg-typing-app-shell.is-hub")
          || measure(".cg-typing-course-page");
        if (out(typingRect)) runtimeRoot.console.warn("[LayoutFit][typing] overflow", { viewport: { width: vw, height: vh }, rect: typingRect });
      }
      if (state && state.selectedGameId === "word-connections") {
        var stageRect = measure(".cg-word-clue-v2");
        var controlsRect = measure(".cg-word-clue-v2-controls");
        if (out(stageRect)) runtimeRoot.console.warn("[LayoutFit][word-clue] stage overflow", { viewport: { width: vw, height: vh }, rect: stageRect });
        if (out(controlsRect)) runtimeRoot.console.warn("[LayoutFit][word-clue] controls overflow", { viewport: { width: vw, height: vh }, rect: controlsRect });
      }
    }

    function renderRoundBoard(state, game) {
      var round = state.round || {};
      function renderTypingPathMarkup(currentRound) {
        return '<div class="cg-typing-path" aria-label="Lesson path">' + (currentRound.unitPath || []).map(function (item, index) {
          var isCurrent = item.id === currentRound.id;
          var result = typingProgress.lessonResults && typingProgress.lessonResults[item.id] || {};
          var isDone = item.completed || result.complete;
          var stars = Math.max(0, Math.min(5, Number(result.stars || 0)));
          var statusLabel = item.locked
            ? "Locked"
            : isDone
              ? "Mastered"
              : isCurrent
                ? "Current"
                : "Open";
          return '<button class="cg-typing-path-card' + (isCurrent ? ' is-current' : '') + (isDone ? ' is-done' : '') + (item.locked ? ' is-locked' : '') + '" type="button" data-action="jump-typing-lesson" data-lesson-order="' + Number(item.order || index + 1) + '"' + (item.locked ? ' disabled aria-disabled="true"' : "") + '><span>' + runtimeRoot.CSGameComponents.escapeHtml(item.label || ("L" + (index + 1))) + '</span><strong>' + runtimeRoot.CSGameComponents.escapeHtml(String(item.shortLabel || "").toUpperCase()) + '</strong><small class="cg-typing-path-meta">' + runtimeRoot.CSGameComponents.escapeHtml(statusLabel) + '</small>' + (item.locked ? '<span class="cg-typing-path-lock">Locked</span>' : stars ? renderTypingStars(stars) : "") + "</button>";
        }).join("") + "</div>";
      }

      function renderTypingCourseMap(currentRound) {
        var units = [];
        var grouped = {};
        (typingCourseRows || []).forEach(function (row) {
          var unitKey = String(row && row.unitLabel || "Unit");
          var meta = typingUnitMeta(unitKey, (typingCourseRows || []).filter(function (candidate) {
            return String(candidate && candidate.unitLabel || "") === unitKey;
          }));
          if (!grouped[unitKey]) {
            grouped[unitKey] = {
              unitLabel: unitKey,
              lessonCount: 0,
              completedCount: 0,
              startOrder: Number(row && row.lessonOrder || 1),
              focusLabel: meta.title,
              preview: []
            };
            units.push(grouped[unitKey]);
          }
          grouped[unitKey].lessonCount += 1;
          if (typingProgress.completedLessonIds.indexOf(String(row && row.id || "")) >= 0) grouped[unitKey].completedCount += 1;
          if (grouped[unitKey].preview.length < 3 && row && row.target) grouped[unitKey].preview.push(String(row.target).toUpperCase());
        });
        return '<div class="cg-typing-course-map" aria-label="Typing course map">' + units.map(function (unit, index) {
          var active = Number(currentRound.lessonOrder || 1) >= unit.startOrder && Number(currentRound.lessonOrder || 1) < (unit.startOrder + unit.lessonCount);
          var unlocked = Number(context.typingUnlockedOrder || typingProgress.unlockedLessonOrder || 1) >= unit.startOrder;
          var meta = typingUnitMeta(unit.unitLabel, []);
          var stateLabel = unlocked ? (active ? "Current path" : (unit.completedCount >= unit.lessonCount ? "Mastered" : "Open")) : "Locked";
          var progressPercent = unit.lessonCount ? Math.round((unit.completedCount / unit.lessonCount) * 100) : 0;
          return '<button class="cg-typing-unit-card cg-typing-unit-card--step-' + String(index + 1) + (active ? ' is-current' : '') + (unlocked ? '' : ' is-locked') + '" type="button" data-action="jump-typing-lesson" data-lesson-order="' + unit.startOrder + '"' + (unlocked ? '' : ' disabled aria-disabled="true"') + '><span class="cg-typing-unit-label">' + runtimeRoot.CSGameComponents.escapeHtml(meta.phase || unit.unitLabel) + '</span><span class="cg-typing-unit-step">' + runtimeRoot.CSGameComponents.escapeHtml(String(index + 1).padStart(2, '0')) + '</span><strong>' + runtimeRoot.CSGameComponents.escapeHtml(unit.focusLabel) + '</strong><small>' + runtimeRoot.CSGameComponents.escapeHtml(unit.completedCount + " / " + unit.lessonCount + " complete") + '</small><div class="cg-typing-unit-preview">' + unit.preview.map(function (item) {
            return '<span>' + runtimeRoot.CSGameComponents.escapeHtml(item) + "</span>";
          }).join("") + '</div><div class="cg-typing-unit-progress"><span style="width:' + progressPercent + '%"></span></div><span class="cg-typing-unit-state">' + runtimeRoot.CSGameComponents.escapeHtml(stateLabel) + '</span></button>';
          }).join("") + "</div>";
      }

      function renderTypingLessonTiles(rows, currentRound) {
        var list = Array.isArray(rows) ? rows : [];
        return '<div class="cg-typing-lesson-grid" aria-label="Typing lessons">' + list.map(function (item) {
          var result = typingProgress.lessonResults && typingProgress.lessonResults[item.id] || {};
          var isDone = typingProgress.completedLessonIds.indexOf(String(item.id || "")) >= 0 || result.complete;
          var isCurrent = currentRound && String(currentRound.id || "") === String(item.id || "");
          var locked = Number(item.lessonOrder || 1) > Number(context.typingUnlockedOrder || typingProgress.unlockedLessonOrder || 1);
          var href = typingQuestHref({ typingCourseMode: "lesson", lessonId: item.id, lessonOrder: item.lessonOrder });
          var stars = Math.max(0, Math.min(5, Number(result.stars || 0)));
          var status = locked ? "Locked" : isDone ? "Mastered" : isCurrent ? "Current" : "Open";
          return '<a class="cg-typing-lesson-tile' + (isCurrent ? ' is-current' : '') + (isDone ? ' is-done' : '') + (locked ? ' is-locked' : '') + '" href="' + runtimeRoot.CSGameComponents.escapeHtml(locked ? "#" : href) + '"' + (locked ? ' aria-disabled="true"' : '') + '><span class="cg-typing-lesson-number">' + Number(item.lessonOrder || 0) + '</span><span class="cg-typing-lesson-glyph">' + runtimeRoot.CSGameComponents.escapeHtml(typingLessonGlyph(item)) + '</span><span class="cg-typing-lesson-badge">' + runtimeRoot.CSGameComponents.escapeHtml(typingLessonBadge(item)) + '</span><strong>' + runtimeRoot.CSGameComponents.escapeHtml(item.stageLabel || item.lessonLabel || "Lesson") + '</strong><small>' + runtimeRoot.CSGameComponents.escapeHtml(String(item.target || "").toUpperCase()) + '</small><span class="cg-typing-lesson-status">' + runtimeRoot.CSGameComponents.escapeHtml(status) + '</span>' + (stars ? renderTypingStars(stars) : "") + "</a>";
        }).join("") + "</div>";
      }

      function renderTypingPlacementTiles() {
        return '<div class="cg-typing-lesson-grid cg-typing-lesson-grid--placement" aria-label="Placement checks">' + (typingPlacementRows || []).map(function (item, index) {
          var current = index === 0;
          return '<a class="cg-typing-lesson-tile' + (current ? ' is-current' : '') + '" href="' + runtimeRoot.CSGameComponents.escapeHtml(typingQuestHref({ typingCourseMode: "placement" })) + '"><span class="cg-typing-lesson-number">' + (index + 1) + '</span><span class="cg-typing-lesson-glyph">' + runtimeRoot.CSGameComponents.escapeHtml(typingLessonGlyph(item)) + '</span><span class="cg-typing-lesson-badge">Check</span><strong>' + runtimeRoot.CSGameComponents.escapeHtml(item.stageLabel || item.prompt || "Placement") + '</strong><small>' + runtimeRoot.CSGameComponents.escapeHtml(String(item.target || "").toUpperCase()) + '</small><span class="cg-typing-lesson-status">' + runtimeRoot.CSGameComponents.escapeHtml(current ? "Start here" : "Placement") + "</span></a>";
        }).join("") + "</div>";
      }

      function renderTypingUnitSections(currentRound) {
        var grouped = {};
        var order = [];
        var currentUnitKey = String(currentRound && currentRound.unitLabel || "Unit 0");
        (typingCourseRows || []).forEach(function (item) {
          var key = String(item && item.unitLabel || "Unit");
          if (!grouped[key]) {
            grouped[key] = [];
            order.push(key);
          }
          grouped[key].push(item);
        });
        return order.map(function (key) {
          var rows = grouped[key] || [];
          var meta = typingUnitMeta(key, rows);
          var unitSlug = String(key || "unit").toLowerCase().replace(/[^a-z0-9]+/g, "-");
          var active = key === currentUnitKey;
          var unlocked = Number(context.typingUnlockedOrder || typingProgress.unlockedLessonOrder || 1) >= Number(rows[0] && rows[0].lessonOrder || 1);
          var completedCount = rows.filter(function (row) {
            var result = typingProgress.lessonResults && typingProgress.lessonResults[row.id] || {};
            return typingProgress.completedLessonIds.indexOf(String(row && row.id || "")) >= 0 || result.complete;
          }).length;
          var previewRows = active ? rows : rows.slice(0, Math.min(rows.length, 3));
          return [
            '<section class="cg-typing-unit-section cg-typing-unit-section--' + runtimeRoot.CSGameComponents.escapeHtml(unitSlug) + (active ? ' is-current' : ' is-collapsed') + (!unlocked ? ' is-locked' : '') + '">',
            '  <div class="cg-typing-unit-section__head">',
            '    <div><p class="cg-kicker">' + runtimeRoot.CSGameComponents.escapeHtml(meta.phase || key) + '</p><h3>' + runtimeRoot.CSGameComponents.escapeHtml(meta.title) + '</h3><p>' + runtimeRoot.CSGameComponents.escapeHtml(meta.subtitle) + '</p></div>',
            '    <div class="cg-typing-unit-section__status"><span class="cg-typing-unit-section__count">' + runtimeRoot.CSGameComponents.escapeHtml(rows.length + " lessons") + '</span><span class="cg-typing-unit-section__meter">' + runtimeRoot.CSGameComponents.escapeHtml(completedCount + " complete") + '</span>' + (active ? '<span class="cg-typing-unit-section__flag">Current week</span>' : (unlocked ? '<a class="cg-typing-unit-section__jump" href="' + runtimeRoot.CSGameComponents.escapeHtml(typingQuestHref({ typingCourseMode: "lesson", lessonId: rows[0] && rows[0].id || "", lessonOrder: rows[0] && rows[0].lessonOrder || 1 })) + '">Open week</a>' : '<span class="cg-typing-unit-section__flag is-locked">Locked</span>')) + '</div>',
            "  </div>",
            renderTypingLessonTiles(previewRows, currentRound),
            (!active && rows.length > previewRows.length ? '<div class="cg-typing-unit-section__more">+' + runtimeRoot.CSGameComponents.escapeHtml(String(rows.length - previewRows.length)) + ' more lessons in this week</div>' : ''),
            "</section>"
          ].join("");
        }).join("");
      }

      function renderTypingCurrentUnitSection(currentRound) {
        var currentUnitKey = String(currentRound && currentRound.unitLabel || "Unit 0");
        var rows = (typingCourseRows || []).filter(function (item) {
          return String(item && item.unitLabel || "") === currentUnitKey;
        });
        if (!rows.length) rows = typingCourseRows.slice(0, 4);
        var previewRows = context.typingPlacementRequired ? rows.slice(0, Math.min(rows.length, 2)) : rows;
        var meta = typingUnitMeta(currentUnitKey, rows);
        var completedCount = rows.filter(function (row) {
          var result = typingProgress.lessonResults && typingProgress.lessonResults[row.id] || {};
          return typingProgress.completedLessonIds.indexOf(String(row && row.id || "")) >= 0 || result.complete;
        }).length;
        var nextUnitRow = (typingCourseRows || []).filter(function (item) {
          return Number(item && item.lessonOrder || 0) > Number(rows[rows.length - 1] && rows[rows.length - 1].lessonOrder || 0);
        })[0] || null;
        var nextUnitMeta = nextUnitRow ? typingUnitMeta(nextUnitRow.unitLabel, (typingCourseRows || []).filter(function (candidate) {
          return String(candidate && candidate.unitLabel || "") === String(nextUnitRow.unitLabel || "");
        })) : null;
        return [
          '<section class="cg-typing-unit-section cg-typing-unit-section--focus cg-typing-unit-section--' + runtimeRoot.CSGameComponents.escapeHtml(String(currentUnitKey || "unit").toLowerCase().replace(/[^a-z0-9]+/g, "-")) + ' is-current' + (context.typingPlacementRequired ? ' is-teaser' : '') + '">',
          '  <div class="cg-typing-unit-section__head">',
          '    <div><p class="cg-kicker">' + runtimeRoot.CSGameComponents.escapeHtml(context.typingPlacementRequired ? "First unit preview" : "Current path") + '</p><h3>' + runtimeRoot.CSGameComponents.escapeHtml(meta.title) + '</h3><p>' + runtimeRoot.CSGameComponents.escapeHtml(context.typingPlacementRequired ? "After placement, the course opens here first." : meta.subtitle) + '</p></div>',
          '    <div class="cg-typing-unit-section__status"><span class="cg-typing-unit-section__count">' + runtimeRoot.CSGameComponents.escapeHtml(rows.length + " lessons") + '</span><span class="cg-typing-unit-section__meter">' + runtimeRoot.CSGameComponents.escapeHtml(completedCount + " complete") + '</span><span class="cg-typing-unit-section__flag">' + runtimeRoot.CSGameComponents.escapeHtml(context.typingPlacementRequired ? "Opens after placement" : "Active now") + '</span></div>',
          "  </div>",
          renderTypingLessonTiles(previewRows, currentRound),
          (context.typingPlacementRequired && rows.length > previewRows.length ? '<div class="cg-typing-unit-section__more">+' + runtimeRoot.CSGameComponents.escapeHtml(String(rows.length - previewRows.length)) + ' more lessons unlock in this first unit</div>' : ''),
          (nextUnitMeta ? '<div class="cg-typing-unit-section__handoff"><strong>Next up:</strong><span>' + runtimeRoot.CSGameComponents.escapeHtml(nextUnitMeta.title + " once this path is secure.") + '</span></div>' : ""),
          "</section>"
        ].join("");
      }

      function renderTypingWelcomePreview(currentLesson) {
        var lesson = currentLesson || {};
        var target = String(lesson.target || "FJFJ").toUpperCase();
        var previewTyped = target.slice(0, Math.min(2, target.length));
        var remaining = target.slice(previewTyped.length);
        var activeKeys = typingGuideKeys(target);
        var homeKeys = ["A", "S", "D", "F", "G", "H", "J", "K", "L"];
        return [
          '<div class="cg-typing-welcome-preview" aria-hidden="true">',
          '  <div class="cg-typing-welcome-preview__track"><span>eyes up</span><span>home row first</span><span>smooth pace</span></div>',
          '  <div class="cg-typing-welcome-lane"><span class="typed">' + runtimeRoot.CSGameComponents.escapeHtml(previewTyped.toLowerCase()) + '</span><span class="cursor">|</span><span class="remaining">' + runtimeRoot.CSGameComponents.escapeHtml(remaining.toLowerCase()) + '</span></div>',
          '  <div class="cg-typing-welcome-coach"><span>Eyes on the screen</span><strong>Find the home-row bumps first</strong></div>',
          '  <div class="cg-typing-welcome-keyboard">' + homeKeys.map(function (key) {
            var lower = key.toLowerCase();
            var cls = activeKeys.indexOf(lower) >= 0 ? ' is-active' : (key === 'F' || key === 'J' ? ' is-home' : '');
            return '<span class="cg-typing-welcome-key' + cls + '">' + runtimeRoot.CSGameComponents.escapeHtml(key) + '</span>';
          }).join("") + '</div>',
          '</div>'
        ].join("");
      }

      function renderTypingJumpStrip(currentLesson) {
        var unitStarts = [];
        var seen = {};
        (typingCourseRows || []).forEach(function (item) {
          var unitKey = String(item && item.unitLabel || "");
          if (!unitKey || seen[unitKey]) return;
          seen[unitKey] = true;
          unitStarts.push(item);
        });
        return '<div class="cg-typing-jump-strip" aria-label="Jump to a unit">' + unitStarts.map(function (item, index) {
          var unlocked = Number(context.typingUnlockedOrder || typingProgress.unlockedLessonOrder || 1) >= Number(item.lessonOrder || 1);
          var href = typingQuestHref({ typingCourseMode: "lesson", lessonId: item.id, lessonOrder: item.lessonOrder });
          return '<a class="cg-typing-jump-chip' + (unlocked ? '' : ' is-locked') + '" href="' + runtimeRoot.CSGameComponents.escapeHtml(unlocked ? href : "#") + '"' + (unlocked ? '' : ' aria-disabled="true"') + '><span class="cg-typing-jump-chip__step">' + runtimeRoot.CSGameComponents.escapeHtml(String(index + 1)) + '</span><span class="cg-typing-jump-chip__label">' + runtimeRoot.CSGameComponents.escapeHtml(typingUnitMeta(item.unitLabel, []).title) + '</span></a>';
        }).join("") + '</div>';
      }

      function renderTypingRuntimeSidebar(currentRound, metrics, stars, ready) {
        return [
          '<aside class="cg-typing-runtime-sidebar">',
          '  <div class="cg-typing-runtime-panel">',
          '    <p class="cg-kicker">Lesson rating</p>',
          '    <div class="cg-typing-summary-rating"><div id="cg-typing-live-stars">' + renderTypingStars(stars) + '</div><span>' + runtimeRoot.CSGameComponents.escapeHtml(ready ? "Ready to move on" : "Build to 5 stars") + '</span></div>',
          '  </div>',
          '  <div class="cg-typing-runtime-panel cg-typing-runtime-panel--stats">',
          '    <div class="cg-typing-runtime-stat"><span>Goal</span><strong>' + runtimeRoot.CSGameComponents.escapeHtml(metrics.goalWpm + " WPM") + '</strong><small>' + runtimeRoot.CSGameComponents.escapeHtml(metrics.goalAccuracy + "% accuracy") + '</small></div>',
          '    <div class="cg-typing-runtime-stat"><span>Speed</span><strong id="cg-typing-live-wpm">' + metrics.wpm + '</strong><small>WPM</small></div>',
          '    <div class="cg-typing-runtime-stat"><span>Accuracy</span><strong id="cg-typing-live-accuracy">' + metrics.accuracy + '%</strong><small>live</small></div>',
          '    <div class="cg-typing-runtime-stat"><span>Errors</span><strong id="cg-typing-live-errors">' + metrics.mistakes + '</strong><small>this run</small></div>',
          "  </div>",
          "</aside>"
        ].join("");
      }

      if (game.id === "word-typing" && !params.typingPage) {
        var courseSummary = typingCourseSummary(typingProgress, typingCourseRows);
        var currentLesson = typingLessonById(context.currentTypingLessonId) || typingLessonByOrder(context.currentTypingLessonOrder || 1) || round;
        var currentUnitMeta = typingUnitMeta(currentLesson && currentLesson.unitLabel || "Unit 0", (typingCourseRows || []).filter(function (row) {
          return String(row && row.unitLabel || "") === String(currentLesson && currentLesson.unitLabel || "");
        }));
        var completedLessons = Number(courseSummary.completedLessons || 0);
        var totalLessons = Math.max(1, Number(courseSummary.totalLessons || 1));
        var progressDots = [0, 1, 2, 3, 4].map(function (index) {
          return '<span class="' + (index < Math.max(1, Math.round((completedLessons / totalLessons) * 5)) ? "is-on" : "") + '"></span>';
        }).join("");
        var continueHref = context.typingPlacementRequired
          ? typingQuestHref({ typingCourseMode: "placement" })
          : typingQuestHref({
              typingCourseMode: "lesson",
              lessonId: currentLesson && currentLesson.id || "",
              lessonOrder: currentLesson && currentLesson.lessonOrder || 1
            });
        return [
          '<div class="cg-typing-course-page">',
          '  <section class="cg-typing-course-welcome">',
          '    <div class="cg-typing-course-start cg-typing-course-start--welcome">',
          '      <div class="cg-typing-course-start__head">',
          '        <p class="cg-kicker">Start your course</p>',
          '        <h2>' + runtimeRoot.CSGameComponents.escapeHtml(context.typingPlacementRequired ? "Start in the right spot" : ("Continue with " + currentUnitMeta.title)) + '</h2>',
          '        <p>' + runtimeRoot.CSGameComponents.escapeHtml(context.typingPlacementRequired ? "Take one short check, unlock the right path, and begin with confidence." : ("Open " + ((currentLesson && currentLesson.lessonLabel) || "the next lesson") + " and keep building fluent finger patterns.")) + '</p>',
          '      </div>',
          '      <div class="cg-typing-course-start__action">',
          '        <span class="cg-typing-course-start__eyebrow">' + runtimeRoot.CSGameComponents.escapeHtml(context.typingPlacementRequired ? "Placement check" : "Next lesson") + '</span>',
          '        <strong class="cg-typing-course-start__target">' + runtimeRoot.CSGameComponents.escapeHtml(String((context.typingPlacementRequired ? "FJFJ" : (currentLesson && currentLesson.target) || round.target || "FJFJ")).toUpperCase()) + '</strong>',
          '        <span class="cg-typing-course-start__meta">' + runtimeRoot.CSGameComponents.escapeHtml(context.typingPlacementRequired ? "4 quick checks · eyes up and steady" : (((currentLesson && currentLesson.stageLabel) || "Typing practice") + " · target word fluency")) + '</span>',
          renderTypingWelcomePreview(currentLesson || round),
          '        <div class="cg-typing-welcome-meter"><div class="cg-typing-welcome-meter__lane"><span class="cg-typing-welcome-meter__label">Course rhythm</span><strong>' + runtimeRoot.CSGameComponents.escapeHtml(context.typingPlacementRequired ? "Placement -> Home row -> Word runs" : ("Now in " + currentUnitMeta.title)) + '</strong></div><div class="cg-typing-welcome-meter__dots">' + progressDots + '</div></div>',
          '        <div class="cg-typing-course-start__actions"><a class="cg-action cg-action-primary cg-typing-course-start__button" href="' + runtimeRoot.CSGameComponents.escapeHtml(continueHref) + '">' + runtimeRoot.CSGameComponents.escapeHtml(context.typingPlacementRequired ? "Start Placement" : "Open Lesson") + '</a><a class="cg-action cg-action-quiet cg-typing-course-start__subaction" href="' + runtimeRoot.CSGameComponents.escapeHtml(typingQuestHref({ typingCourseMode: "lesson", lessonId: currentLesson && currentLesson.id || "", lessonOrder: currentLesson && currentLesson.lessonOrder || 1 })) + '">' + runtimeRoot.CSGameComponents.escapeHtml(context.typingPlacementRequired ? "Unit 1" : "Current Unit") + '</a></div>',
          '      </div>',
          '    </div>',
          '    <div class="cg-typing-course-overview cg-typing-course-overview--journey">',
          '      <div class="cg-typing-course-overview__head"><p class="cg-kicker">Course map</p><h3>Typing Quest Foundations</h3><p>' + runtimeRoot.CSGameComponents.escapeHtml(context.typingPlacementRequired ? "Placement opens the first unit." : currentUnitMeta.title) + '</p></div>',
          '      <div class="cg-typing-course-ribbon"><span>1. Home row</span><span>2. Home-row words</span><span>3. Top row reach</span><span>4. Bottom row reach</span><span>5. Connected text</span></div>',
          '      <div class="cg-typing-plan-progress"><div class="cg-typing-plan-progress-fill" style="width:' + courseSummary.progressPercent + '%"></div></div>',
          '      <div class="cg-typing-plan-meta"><span>' + courseSummary.completedLessons + ' of ' + courseSummary.totalLessons + ' lessons mastered</span><span>' + runtimeRoot.CSGameComponents.escapeHtml(context.typingPlacementRequired ? "Placement ready" : ((currentLesson && currentLesson.lessonLabel) || "Lesson 1")) + '</span></div>',
          renderTypingJumpStrip(currentLesson || round),
          '    </div>',
          '  </section>',
          '<details class="cg-typing-course-catalog" id="typing-course-catalog"><summary><span>See full course plan</span><small>' + runtimeRoot.CSGameComponents.escapeHtml(courseSummary.totalLessons + " lessons across 5 phases") + '</small></summary><div class="cg-typing-course-catalog__body">' + renderTypingUnitSections(currentLesson || round) + '</div></details>',
          '</div>'
        ].join("");
      }

      if (game.id === "word-typing") {
        var typedValue = String(uiState.typingLockedValue || uiState.lastSubmittedGuess || "").toUpperCase();
        var summaryMetrics = Object.assign({}, typingLiveMetrics(uiState, round, typedValue), state.lastOutcome && state.lastOutcome.stats || {});
        var summaryStars = typingMasteryStars(summaryMetrics, round, !!(state.lastOutcome && state.lastOutcome.correct));
        var canAdvance = typingReadyToAdvance(summaryMetrics, round, !!(state.lastOutcome && state.lastOutcome.correct));
        var nextLesson = typingLessonByOrder(Number(round.lessonOrder || 1) + 1);
        var recommendedLesson = typingLessonByOrder(Number(context.currentTypingLessonOrder || typingProgress.currentLessonOrder || 1));

        if (state.status === "round-complete" || state.status === "round-summary") {
          if (round.courseMode === "placement" && state.status === "round-summary") {
            return [
              '<div class="cg-typing-runtime">',
              '  <div class="cg-typing-runtime-main">',
              '    <div class="cg-typing-runtime-card cg-typing-runtime-card--summary">',
              '      <p class="cg-kicker">Placement Complete</p>',
              '      <h3 class="cg-display">Start with ' + runtimeRoot.CSGameComponents.escapeHtml((recommendedLesson && recommendedLesson.lessonLabel || "Lesson 1") + " · " + (recommendedLesson && recommendedLesson.stageLabel || "Foundations")) + '</h3>',
              '      <p class="cg-typing-summary-copy">Placement is complete. The course can now open at the first lesson that fits this learner so practice starts with the right amount of support.</p>',
              '      <div class="cg-typing-summary-stats">',
              '        <span class="cg-stat"><strong>' + runtimeRoot.CSGameComponents.escapeHtml(String(Math.max(1, Number(context.currentTypingLessonOrder || typingProgress.currentLessonOrder || 1)))) + '</strong> recommended lesson</span>',
              '        <span class="cg-stat"><strong>' + runtimeRoot.CSGameComponents.escapeHtml(String((state.history || []).filter(function (row) { return row.result === "correct"; }).length)) + '</strong> checks passed</span>',
              '        <span class="cg-stat"><strong>' + runtimeRoot.CSGameComponents.escapeHtml(String(Number(typingProgress.unlockedLessonOrder || 1))) + '</strong> lessons unlocked</span>',
              '      </div>',
              (recommendedLesson ? '<div class="cg-typing-summary-goal"><strong>SWBAT</strong><span>' + runtimeRoot.CSGameComponents.escapeHtml(recommendedLesson.swbat || "") + '</span></div>' : ""),
              '      <div class="cg-feedback-actions"><button class="cg-action cg-action-primary" type="button" data-action="next-typing-lesson">Start ' + runtimeRoot.CSGameComponents.escapeHtml(recommendedLesson && recommendedLesson.lessonLabel || "Lesson 1") + '</button><button class="cg-action cg-action-quiet" type="button" data-action="retake-typing-placement">Retake Placement</button></div>',
              "    </div>",
              renderTypingKeyboardGuide(recommendedLesson || round),
              "  </div>",
              renderTypingRuntimeSidebar(recommendedLesson || round, summaryMetrics, 5, true),
              "</div>"
            ].join("");
          }

          if (round.courseMode === "placement") {
            return [
              '<div class="cg-typing-runtime">',
              '  <div class="cg-typing-runtime-main">',
              '    <div class="cg-typing-runtime-card cg-typing-runtime-card--summary">',
              '      <p class="cg-kicker">Placement Check</p>',
              '      <h3 class="cg-display">' + runtimeRoot.CSGameComponents.escapeHtml((round.lessonLabel || "Check") + " complete") + '</h3>',
              '      <p class="cg-typing-summary-copy">' + runtimeRoot.CSGameComponents.escapeHtml(state.feedback && state.feedback.label || "Placement check recorded.") + '</p>',
              '      <div class="cg-typing-summary-stats">',
              '        <span class="cg-stat"><strong>' + summaryMetrics.wpm + '</strong> WPM</span>',
              '        <span class="cg-stat"><strong>' + summaryMetrics.accuracy + '%</strong> accuracy</span>',
              '        <span class="cg-stat"><strong>' + summaryMetrics.mistakes + '</strong> errors</span>',
              '      </div>',
              '      <div class="cg-feedback-actions"><button class="cg-action cg-action-primary" type="button" data-action="next-typing-check">Next Check</button><button class="cg-action cg-action-quiet" type="button" data-action="repeat-typing-lesson">Retry Check</button></div>',
              "    </div>",
              renderTypingKeyboardGuide(round),
              "  </div>",
              renderTypingRuntimeSidebar(round, summaryMetrics, summaryStars, false),
              "</div>"
            ].join("");
          }

          return [
            '<div class="cg-typing-runtime">',
            '  <div class="cg-typing-runtime-main">',
            '    <div class="cg-typing-runtime-card cg-typing-runtime-card--summary">',
              '      <p class="cg-kicker">Lesson Result</p>',
            '      <h3 class="cg-display">' + runtimeRoot.CSGameComponents.escapeHtml((round.lessonLabel || "Lesson") + " · " + (round.stageLabel || "Typing practice")) + '</h3>',
            '      <p class="cg-typing-summary-copy">' + runtimeRoot.CSGameComponents.escapeHtml(canAdvance ? "Goal met. This lesson is ready to count as mastered, and the learner can move forward with confidence." : "This lesson is close, but it should be replayed until both the speed and accuracy goals are secure.") + '</p>',
            '      <div class="cg-typing-summary-rating">' + renderTypingStars(summaryStars) + '<span>' + runtimeRoot.CSGameComponents.escapeHtml(canAdvance ? "Ready to move on" : "Not yet at 5 stars") + '</span></div>',
            '      <div class="cg-typing-summary-stats">',
            '        <span class="cg-stat"><strong>' + summaryMetrics.wpm + '</strong> WPM</span>',
            '        <span class="cg-stat"><strong>' + summaryMetrics.accuracy + '%</strong> accuracy</span>',
            '        <span class="cg-stat"><strong>' + summaryMetrics.goalWpm + ' / ' + summaryMetrics.goalAccuracy + '</strong> goal</span>',
            '      </div>',
            '      <div class="cg-typing-summary-goal"><strong>SWBAT</strong><span>' + runtimeRoot.CSGameComponents.escapeHtml(round.swbat || "") + '</span></div>',
            '      <p class="cg-focus-line cg-focus-line--premium"><strong>Why it matters:</strong> ' + runtimeRoot.CSGameComponents.escapeHtml(canAdvance ? "The learner met the fluency target for this pattern." : "The learner still needs steadier accuracy or speed before this target should count as secure.") + '</p>',
            '      <div class="cg-feedback-actions"><button class="cg-action cg-action-primary" type="button" data-action="repeat-typing-lesson">' + runtimeRoot.CSGameComponents.escapeHtml(canAdvance ? "Replay For Fluency" : "Replay Lesson") + '</button>' + (canAdvance && nextLesson && nextLesson.id !== round.id ? '<button class="cg-action cg-action-quiet" type="button" data-action="next-typing-lesson">Open ' + runtimeRoot.CSGameComponents.escapeHtml(nextLesson.lessonLabel || "Next Lesson") + '</button>' : "") + '</div>',
            "    </div>",
            renderTypingKeyboardGuide(round),
            "  </div>",
            renderTypingRuntimeSidebar(round, summaryMetrics, summaryStars, canAdvance),
            "</div>"
          ].join("");
        }

        if (uiState.typingStartedRoundId !== round.id) {
          return [
            '<div class="cg-typing-runtime">',
            '  <div class="cg-typing-runtime-main">',
            renderHostControls(game, state, round),
            '    <div class="cg-typing-runtime-card cg-typing-runtime-card--launch">',
            '      <div class="cg-typing-runtime-intro">',
            '        <div class="cg-typing-runtime-intro__copy">',
            '          <p class="cg-kicker">' + runtimeRoot.CSGameComponents.escapeHtml(round.courseMode === "placement" ? "Placement check" : (round.lessonLabel || "Lesson")) + '</p>',
            '          <div class="cg-typing-runtime-lessonline"><span>Lesson ' + runtimeRoot.CSGameComponents.escapeHtml(String(round.lessonOrder || 1)) + ' of ' + runtimeRoot.CSGameComponents.escapeHtml(String((typingCourseRows || []).length || 1)) + '</span><span>' + runtimeRoot.CSGameComponents.escapeHtml(round.keyboardZone || round.unitLabel || "Typing Quest Foundations") + '</span></div>',
            '          <h3 class="cg-display">' + runtimeRoot.CSGameComponents.escapeHtml(typingPromptTitle(round)) + '</h3>',
            '          <p>' + runtimeRoot.CSGameComponents.escapeHtml(round.courseMode === "placement" ? "Four quick checks, then the course opens at the right lesson." : (round.swbat || "I can type the lesson target with accuracy and rhythm.")) + '</p>',
            '          <div class="cg-typing-launch-steps"><span>1. Look at the whole target</span><span>2. Type without looking down</span><span>3. Earn 5 stars to move on</span></div>',
            '          <div class="cg-typing-launch-coach"><strong>Coach note</strong><span>' + runtimeRoot.CSGameComponents.escapeHtml(round.courseMode === "placement" ? "This check is about finding the right starting point, not rushing." : (round.fingerCue || "Lift your eyes, return to home row, and let the pattern settle before you type.")) + '</span></div>',
            "        </div>",
            '        <div class="cg-typing-launch-target"><span class="cg-typing-launch-label">Target</span><strong>' + renderTypingTargetMarkup(round) + '</strong><span>' + runtimeRoot.CSGameComponents.escapeHtml(round.orthographyFocus || round.keyboardZone || "typing focus") + '</span></div>',
            "      </div>",
            '      <div class="cg-feedback-actions"><button class="cg-action cg-action-primary" type="button" data-action="start-typing-round">' + runtimeRoot.CSGameComponents.escapeHtml(round.courseMode === "placement" ? "Start Placement" : "Start Lesson") + '</button>' + (round.courseMode === "lesson" ? '<button class="cg-action cg-action-quiet" type="button" data-action="repeat-typing-lesson">Reset Lesson</button>' : "") + '</div>',
            "    </div>",
            renderTypingKeyboardGuide(round),
            "  </div>",
            renderTypingRuntimeSidebar(round, summaryMetrics, summaryStars, false),
            "</div>"
          ].join("");
        }

        var typed = String(uiState.typingLockedValue || uiState.lastSubmittedGuess || "").toUpperCase();
        var typedEvaluation = state.lastOutcome && state.lastOutcome.evaluation || typingEvaluation(round.target, typed);
        var targetChars = splitTypingChars(round.target || "");
        var typingMetrics = state.status === "playing"
          ? typingLiveMetrics(uiState, round, typed)
          : Object.assign({}, typingLiveMetrics(uiState, round, typed), state.lastOutcome && state.lastOutcome.stats || {});
        var typingStars = typingMasteryStars(state.lastOutcome && state.lastOutcome.stats || typingMetrics, round, typed === String(round.target || "").toUpperCase());
        var readyToAdvance = typed === String(round.target || "").toUpperCase()
          && typingMetrics.accuracy >= typingMetrics.goalAccuracy
          && typingMetrics.wpm >= typingMetrics.goalWpm;
        return [
          '<div class="cg-typing-runtime">',
          '  <div class="cg-typing-runtime-main">',
          renderHostControls(game, state, round),
          '    <div class="cg-typing-runtime-card cg-typing-runtime-card--lesson">',
          '      <div class="cg-typing-runtime-card__head">',
          '        <div>',
          '          <p class="cg-kicker">' + runtimeRoot.CSGameComponents.escapeHtml(round.unitLabel || "Typing Quest Foundations") + '</p>',
          '          <div class="cg-typing-runtime-lessonline"><span>Lesson ' + runtimeRoot.CSGameComponents.escapeHtml(String(round.lessonOrder || 1)) + ' of ' + runtimeRoot.CSGameComponents.escapeHtml(String((typingCourseRows || []).length || 1)) + '</span><span>' + runtimeRoot.CSGameComponents.escapeHtml(round.keyboardZone || round.orthographyFocus || "typing focus") + '</span></div>',
          '          <h3>' + runtimeRoot.CSGameComponents.escapeHtml((round.lessonLabel || "Lesson") + " · " + (round.stageLabel || "Typing practice")) + '</h3>',
          '          <p>' + runtimeRoot.CSGameComponents.escapeHtml(round.fingerCue || "Look across the whole word before you type.") + '</p>',
          '          <div class="cg-typing-runtime-cues"><span>Eyes on the target</span><span>Return to home row</span><span>Finish with control</span></div>',
          "        </div>",
          '        <div class="cg-typing-runtime-goal"><span>Goal</span><strong id="cg-typing-live-goal">' + runtimeRoot.CSGameComponents.escapeHtml(typingMetrics.goalWpm + " WPM · " + typingMetrics.goalAccuracy + "%") + '</strong></div>',
          "      </div>",
          '      <div class="cg-typing-progress-panel">',
          '        <div class="cg-typing-progress-head"><strong>' + runtimeRoot.CSGameComponents.escapeHtml(round.swbat || "I can type the lesson target with accuracy and rhythm.") + '</strong><span id="cg-typing-live-progress">' + typingMetrics.typedCount + ' / ' + typingMetrics.targetCount + '</span></div>',
          '        <div class="cg-typing-lesson-cues"><span>Eyes on target</span><span>Return to home row</span><span>Finish with 5 stars</span></div>',
          '        <div class="cg-typing-progress-bar"><div id="cg-typing-progress-fill" class="cg-typing-progress-fill" style="width:' + typingMetrics.progress + '%"></div></div>',
          '        <div class="cg-typing-quest-lane"><div class="cg-typing-quest-track"></div><div id="cg-typing-quest-runner" class="cg-typing-quest-runner" style="left:calc(' + typingMetrics.progress + '% - 16px)"></div><div class="cg-typing-quest-goal">Finish</div></div>',
          "      </div>",
          '      <div class="cg-typing-text-board">',
          '        <div class="cg-typing-text-board__target">' + renderTypingTargetMarkup(round) + '</div>',
          renderTypingLane(round, typed, typedEvaluation),
          '        <div class="cg-typing-text-line" aria-label="Typing target">' + targetChars.map(function (ch, index) {
            var charClass = "cg-typing-text-char";
            if (index < typed.length) charClass += " is-correct";
            else if (index === typed.length) charClass += " is-current";
            if (ch === " ") charClass += " is-space";
            return '<span class="' + charClass + '">' + (ch === " " ? "&nbsp;" : runtimeRoot.CSGameComponents.escapeHtml(ch)) + "</span>";
          }).join("") + "</div>",
          '        <div class="cg-typing-text-entry">' + targetChars.map(function (_ch, index) {
            var stateLabel = typedEvaluation[index] || (index < typed.length ? "correct" : "");
            var displayChar = typed[index] || (_ch === " " ? " " : "");
            return '<span class="cg-typing-text-entry__char' + (stateLabel ? " is-revealed" : "") + (_ch === " " ? ' is-space' : '') + '" data-state="' + runtimeRoot.CSGameComponents.escapeHtml(stateLabel || "") + '">' + (displayChar === " " ? "&nbsp;" : runtimeRoot.CSGameComponents.escapeHtml(displayChar || "")) + "</span>";
          }).join("") + "</div>",
          "      </div>",
          '      <div class="cg-typing-entry">',
          '        <input id="cg-word-typing-input" class="cg-input' + (Date.now() < uiState.typingErrorUntil ? " is-invalid" : "") + '" maxlength="' + String(round.target || "").length + '" value="' + runtimeRoot.CSGameComponents.escapeHtml(typed) + '" placeholder="' + runtimeRoot.CSGameComponents.escapeHtml(isGroupView(state) ? "Type the lesson target for the class…" : "Type the lesson target…") + '" autocomplete="off" autocorrect="off" spellcheck="false" aria-label="Type the target word">',
          '        <button class="cg-action cg-action-quiet" type="button" data-action="hint">Pattern Hint</button>',
          '        <button class="cg-action cg-action-primary" type="button" data-submit="word-typing">' + runtimeRoot.CSGameComponents.escapeHtml(isGroupView(state) ? "Score Lesson" : "Complete Lesson") + '</button>',
          '        <button class="cg-action cg-action-quiet" type="button" data-action="repeat-typing-lesson">Restart Lesson</button>',
          '      </div>',
          (state.status !== "playing" ? '<div class="cg-typing-rating-summary"><strong>' + runtimeRoot.CSGameComponents.escapeHtml(readyToAdvance ? "5-star lesson. Move to the next target." : "Replay once more to hit the mastery goal.") + '</strong><span>' + runtimeRoot.CSGameComponents.escapeHtml("Goal: " + typingMetrics.goalWpm + " WPM and " + typingMetrics.goalAccuracy + "% accuracy") + '</span></div>' : ""),
          "    </div>",
          renderTypingKeyboardGuide(round),
          "  </div>",
          renderTypingRuntimeSidebar(round, typingMetrics, typingStars, readyToAdvance),
          "</div>"
        ].join("");
      }

      if (state.status === "round-summary") {
        var peakStreak = state.history.reduce(function (max, r) { return Math.max(max, r.streak || 0); }, 0);
        var strongWords = state.history.filter(function (r) { return r.result === "correct"; }).map(function (r) { return r.label; }).filter(Boolean).slice(0, 5);
        var missedWords = state.history.filter(function (r) { return r.result === "incorrect"; }).map(function (r) { return r.label; }).filter(Boolean).slice(0, 5);
        return [
          '<div class="cg-focus-panel">',
          '  <p class="cg-kicker">Session Complete</p>',
          '  <h3 class="cg-display">Score: ' + state.score + '</h3>',
          '  <p class="cg-focus-line cg-focus-line--premium"><strong>Session story:</strong> ' + runtimeRoot.CSGameComponents.escapeHtml((state.metrics.correct || 0) >= Math.max(3, (state.metrics.incorrect || 0)) ? "Most responses landed correctly, so this set looks ready for extension or a fresh round." : "This round exposed a few patterns worth reteaching before moving on.") + '</p>',
          '  <div class="cg-summary-stats">',
          '    <span class="cg-stat"><strong>' + state.metrics.correct + '</strong> correct</span>',
          (state.metrics.nearMiss ? '    <span class="cg-stat"><strong>' + state.metrics.nearMiss + '</strong> near miss</span>' : ""),
          (state.metrics.incorrect ? '    <span class="cg-stat"><strong>' + state.metrics.incorrect + '</strong> incorrect</span>' : ""),
          (peakStreak >= 2 ? '    <span class="cg-stat cg-stat-streak"><strong>' + peakStreak + '</strong> best streak</span>' : ""),
          '  </div>',
          (strongWords.length ? '  <p class="cg-focus-line"><strong>Strong:</strong> ' + runtimeRoot.CSGameComponents.escapeHtml(strongWords.join(", ")) + "</p>" : ""),
          (missedWords.length ? '  <p class="cg-focus-line"><strong>Review:</strong> ' + runtimeRoot.CSGameComponents.escapeHtml(missedWords.join(", ")) + "</p>" : ""),
          '  <div class="cg-feedback-actions"><button class="cg-action cg-action-primary" type="button" data-action="restart">' + runtimeRoot.CSGameComponents.iconFor("progress") + 'New Session</button><button class="cg-action cg-action-quiet" type="button" data-action="repeat-game">Revisit This Set</button></div>',
          "</div>"
        ].join("");
      }

      if (game.id === "word-quest") {
        var guess = String(uiState.lastSubmittedGuess || "").toUpperCase();
        var evaluation = state.lastOutcome && state.lastOutcome.evaluation || [];
        return [
          renderGameScaffold(game, state, round, {
            beforePlay: renderHostControls(game, state, round),
            play: [
              '<div class="cg-premium-stage cg-premium-stage--quest' + (state.lastOutcome && state.lastOutcome.correct ? " is-success" : "") + '">',
              '  <section class="cg-quest-hero">',
              '    <div class="cg-quest-hero__copy">',
              '      <p class="cg-micro-label">Clue to solve</p>',
              '      <h3>Use the clue, test the pattern, and lock in the hidden word.</h3>',
              '      <p class="cg-quest-clue">' + runtimeRoot.CSGameComponents.escapeHtml(round.prompt) + '</p>',
              '    </div>',
              '    <div class="cg-quest-hero__stats">',
              '      <div class="cg-quest-stat"><span>Target length</span><strong>' + runtimeRoot.CSGameComponents.escapeHtml(String(String(round.answer || "").length)) + ' letters</strong></div>',
              '      <div class="cg-quest-stat"><span>Status</span><strong>' + runtimeRoot.CSGameComponents.escapeHtml(state.lastOutcome && state.lastOutcome.correct ? "Solved" : (guess ? "Attempt in view" : "Ready to guess")) + '</strong></div>',
              "    </div>",
              "  </section>",
              '<div class="cg-quest-workbench">',
              '  <div class="cg-quest-board' + (state.lastOutcome && state.lastOutcome.correct ? " row-success" : "") + '">',
              '    <div class="cg-quest-grid">' + String(round.answer || "").split("").map(function (_letter, index) {
                return '<div class="cg-letter-box tile-flip' + (evaluation[index] ? " is-revealed" : "") + '" data-state="' + runtimeRoot.CSGameComponents.escapeHtml(evaluation[index] || "") + '" style="animation-delay:' + (index * 40) + 'ms">' + runtimeRoot.CSGameComponents.escapeHtml(guess[index] || "") + "</div>";
              }).join("") + "</div>",
              "  </div>",
              '  <aside class="cg-quest-sidebar">',
              '    <div class="cg-premium-note">',
              '      <p class="cg-micro-label">Solve move</p>',
              '      <h4>' + runtimeRoot.CSGameComponents.escapeHtml(round.hint || "Start with the clue meaning, then test the letters you know.") + '</h4>',
              '      <p>Use one strong guess instead of random resets. The color row will show what to keep.</p>',
              '    </div>',
              buildKeyboardStrip(round.answer || "", evaluation, guess, "cg-key-strip cg-key-press-strip"),
              (state.hintVisible ? '<span class="cg-chip" data-tone="warning">' + runtimeRoot.CSGameComponents.iconFor("hint") + runtimeRoot.CSGameComponents.escapeHtml(round.hint) + "</span>" : ""),
              "  </aside>",
              "</div>",
              "</div>"
            ].join(""),
            controls: [
              '<div class="cg-quest-input-row">',
              '  <input id="cg-word-guess" class="cg-input" maxlength="' + String(round.answer || "").length + '" placeholder="' + runtimeRoot.CSGameComponents.escapeHtml(isGroupView(state) ? "Class guess…" : "Your guess…") + '" autocomplete="off" autocorrect="off" spellcheck="false">',
              '  <button class="cg-action cg-action-primary" type="button" data-submit="word-quest">Submit</button>',
              '  <button class="cg-action cg-action-quiet" type="button" data-action="next-round">Skip</button>',
              '</div>'
            ].join(""),
            guide: roundGuide(game, state, round)
          })
        ].join("");
      }

      if (game.id === "word-connections") {
        var forbiddenStrike = state.lastOutcome && state.lastOutcome.forbidden;
        var speakerNum = ((Number(state.roundIndex || 0) % 4) + 1);
        return renderGameScaffold(game, state, round, {
          beforePlay: renderHostControls(game, state, round),
          play: [
            '<div class="cg-game-layout cg-game-layout--clue' + (forbiddenStrike ? " cg-focus-panel--forbidden" : "") + '">',
            '<div class="cg-clue-stage">',
            '<div class="cg-clue-stage__main">',
            (isGroupView(state) ? [
              '<div class="cg-taboo-zones">',
              '  <div class="cg-taboo-zone"><span class="cg-taboo-zone-label">Speaker</span><span class="cg-taboo-zone-name">Student ' + speakerNum + '</span></div>',
              '  <div class="cg-taboo-zone"><span class="cg-taboo-zone-label">Team</span><span class="cg-taboo-zone-name">Guess together</span></div>',
              '</div>'
            ].join("") : ""),
            '<div class="cg-taboo-card">',
            '  <p class="cg-taboo-label">' + runtimeRoot.CSGameComponents.escapeHtml(String(round.playMode || "speak").toUpperCase()) + ' mode</p>',
            '  <div class="cg-taboo-target target-word">' + runtimeRoot.CSGameComponents.escapeHtml(round.targetWord || "") + '</div>',
            (round.imageSrc ? '  <img class="cg-taboo-image word-image" src="' + runtimeRoot.CSGameComponents.escapeHtml(round.imageSrc) + '" alt="' + runtimeRoot.CSGameComponents.escapeHtml(round.targetWord || "Target word") + '">' : ""),
            '  <div class="cg-taboo-divider" role="presentation"></div>',
            '  <div class="cg-taboo-danger-band" aria-label="Off-limits words">',
            '    <span class="cg-taboo-ban-label">Off Limits</span>',
            '    <ul class="cg-taboo-word-list blocked-words">' + (round.forbiddenWords || []).map(function (word) {
              return '<li class="cg-taboo-pill">' + runtimeRoot.CSGameComponents.escapeHtml(word) + "</li>";
            }).join("") + '</ul>',
            '  </div>',
            "</div>",
            '</div>',
            '<aside class="cg-clue-stage__side">',
            '<div class="cg-clue-brief">',
            '  <p class="cg-micro-label">Instruction</p>',
            '  <h4>' + runtimeRoot.CSGameComponents.escapeHtml(round.modeInstruction || round.requiredMove || "Give a clear clue without using off-limits words.") + '</h4>',
            '  <p>' + runtimeRoot.CSGameComponents.escapeHtml((round.scaffolds || [round.hint || "Use an example, function, or comparison."])[0] || "") + '</p>',
            '</div>',
            '<div class="cg-clue-brief cg-clue-brief--soft">',
            '  <p class="cg-micro-label">Difficulty</p>',
            '  <h4>' + runtimeRoot.CSGameComponents.escapeHtml(String(round.blockedCount || 4)) + ' off-limits words</h4>',
            '  <p>Use examples, function, or context instead of definitions or off-limits words.</p>',
            '</div>',
            (uiState.supportRevealOpen ? '<div class="cg-support-reveal"><strong>Reveal</strong><span>' + runtimeRoot.CSGameComponents.escapeHtml((round.scaffolds || [round.hint || "Use an example or comparison."])[0] || "") + "</span></div>" : ""),
            '</aside>',
            '</div>',
            "</div>"
          ].join(""),
          controls: [
            '<div class="cg-choice-row cg-choice-row--stacked">',
            '  <label class="cg-field"><span>Mode</span><select id="cg-word-connections-mode" class="cg-select"><option value="speak"' + (round.playMode === "speak" ? " selected" : "") + '>Classic</option><option value="draw"' + (round.playMode === "draw" ? " selected" : "") + '>Draw</option><option value="act"' + (round.playMode === "act" ? " selected" : "") + '>Act</option><option value="mixed"' + (round.playMode === "mixed" ? " selected" : "") + '>Mixed</option></select></label>',
            '  <label class="cg-field"><span>Difficulty</span><select id="cg-word-connections-difficulty" class="cg-select"><option value="1"' + (round.blockedCount === 2 ? " selected" : "") + '>1 · 2 off-limits words</option><option value="2"' + (round.blockedCount === 3 ? " selected" : "") + '>2 · 3 off-limits words</option><option value="3"' + (round.blockedCount === 4 ? " selected" : "") + '>3 · 4 off-limits words</option><option value="4"' + (round.blockedCount === 5 ? " selected" : "") + '>4 · 5 off-limits words</option></select></label>',
            '</div>',
            '<textarea id="cg-word-connections-text" class="cg-textarea" placeholder="' + runtimeRoot.CSGameComponents.escapeHtml(isGroupView(state) ? "Record the clue or teacher notes for scoring…" : "Write the clue here…") + '" aria-label="Type your clue"></textarea>',
            '<div class="cg-feedback-actions"><button class="cg-action cg-action-quiet" type="button" data-action="toggle-support-reveal">' + (uiState.supportRevealOpen ? "Hide Reveal" : "Reveal Support") + '</button><button class="cg-action cg-action-primary" type="button" data-submit="word-connections">' + runtimeRoot.CSGameComponents.escapeHtml(isGroupView(state) ? "Score Clue" : "Check Clue") + '</button><button class="cg-action cg-action-quiet" type="button" data-action="next-round">Next Word</button></div>'
          ].join(""),
          guide: roundGuide(game, state, round)
        });
      }

      if (game.id === "morphology-builder") {
        var forgeChosen = Array.isArray(uiState.builderSelection) ? uiState.builderSelection : [];
        var forgeFilled = forgeChosen.filter(Boolean).length;
        var forgeTargetCount = Array.isArray(round.solution) ? round.solution.length : 0;
        return renderGameScaffold(game, state, round, {
          timer: false,
          play: [
            '<div class="cg-game-layout cg-game-layout--builder">',
            '<div class="cg-premium-stage cg-premium-stage--forge">',
            '  <section class="cg-forge-hero">',
            '    <div class="cg-forge-hero__copy">',
            '      <p class="cg-micro-label">Word build</p>',
            '      <h3>Combine meaningful parts into one precise academic word.</h3>',
            '      <p>' + runtimeRoot.CSGameComponents.escapeHtml(round.prompt || "Build the target word from its parts.") + '</p>',
            '    </div>',
            '    <div class="cg-forge-hero__stats">',
            '      <div class="cg-forge-stat"><span>Placed</span><strong>' + forgeFilled + " / " + forgeTargetCount + '</strong></div>',
            "    </div>",
            "  </section>",
            '<div class="cg-forge">',
            '<div class="cg-forge-layout">',
            '  <div class="cg-forge-layout__main">',
            '    <div class="cg-forge-bench">',
            '      <div class="cg-forge-bench__head"><p class="cg-forge-bench-label">Assembly Area</p><span>' + runtimeRoot.CSGameComponents.escapeHtml(forgeTargetCount ? (forgeTargetCount + " parts") : "Build path") + '</span></div>',
            '      <div class="cg-forge-equation"><span>Prefix</span><span>+</span><span>Root</span><span>+</span><span>Suffix</span></div>',
            '      <div class="cg-forge-slots" aria-label="Word assembly slots">' + (round.solution || []).map(function (_part, index) {
              var val = forgeChosen[index] || "";
              return '<button class="cg-forge-slot' + (val ? " is-filled" : "") + '" type="button" data-slot-index="' + index + '" data-drop-slot="' + index + '" aria-label="Assembly slot ' + (index + 1) + '">' + runtimeRoot.CSGameComponents.escapeHtml(val || "Drop here") + "</button>";
            }).join("") + "</div>",
            "    </div>",
            '    <div class="cg-forge-tray">',
            '      <div class="cg-forge-tray__head"><p class="cg-forge-tray-label">Prefixes, roots, suffixes</p><span>Drag or tap to build</span></div>',
            '      <div class="cg-forge-tiles">' + (round.tiles || []).map(function (tile) {
              var sel = forgeChosen.indexOf(tile) >= 0;
              return '<button class="cg-morph-tile' + (sel ? " is-selected" : "") + '" type="button" draggable="true" data-drag-tile="' + runtimeRoot.CSGameComponents.escapeHtml(tile) + '" data-tile="' + runtimeRoot.CSGameComponents.escapeHtml(tile) + '">' + runtimeRoot.CSGameComponents.escapeHtml(tile) + "</button>";
            }).join("") + "</div>",
            "    </div>",
            '  </div>',
            '  <aside class="cg-forge-layout__side">',
            '    <div class="cg-premium-note">',
            '      <p class="cg-micro-label">Meaning unlock</p>',
            '      <h4>' + runtimeRoot.CSGameComponents.escapeHtml(round.meaningHint || "Use what each part means to test your build.") + '</h4>',
            '      <p>Try the root first, then add the part that changes meaning.</p>',
            '    </div>',
            liveOrderFeedback(forgeChosen, round.solution, "morphology"),
            (state.hintVisible ? '<div class="cg-clue-reveal">' + runtimeRoot.CSGameComponents.iconFor("hint") + '<span>' + runtimeRoot.CSGameComponents.escapeHtml(round.hint) + "</span></div>" : ""),
            '  </aside>',
            '</div>',
            "</div>",
            "</div>"
          ].join(""),
          controls: '<div class="cg-feedback-actions"><button class="cg-action cg-action-quiet" type="button" data-action="hint">Reveal Meaning Hint</button><button class="cg-action cg-action-quiet" type="button" data-action="clear-build">Clear</button><button class="cg-action cg-action-primary" type="button" data-submit="morphology-builder">Check Build</button></div>',
          guide: roundGuide(game, state, round)
        });
      }

      if (game.id === "sentence-builder") {
        var sentChosen = Array.isArray(uiState.builderSelection) ? uiState.builderSelection : [];
        var sentenceFilled = sentChosen.filter(Boolean).length;
        var sentenceTargetCount = Array.isArray(round.solution) ? round.solution.length : 0;
        return renderGameScaffold(game, state, round, {
          beforePlay: renderHostControls(game, state, round),
          play: [
            '<div class="cg-game-layout cg-game-layout--builder">',
            '<div class="cg-premium-stage cg-premium-stage--sentence">',
            '  <section class="cg-sentence-hero">',
            '    <div class="cg-sentence-hero__head">',
            '      <p class="cg-micro-label">Language move</p>',
            '      <h3>Assemble the sentence with the strongest academic order.</h3>',
            '      <p>' + runtimeRoot.CSGameComponents.escapeHtml(round.prompt || "Arrange the tiles into a complete sentence.") + '</p>',
            '    </div>',
            '    <div class="cg-sentence-hero__stats">',
            '      <div class="cg-sentence-stat"><span>Placed</span><strong>' + sentenceFilled + " / " + sentenceTargetCount + '</strong></div>',
            '      <div class="cg-sentence-stat"><span>Status</span><strong>' + runtimeRoot.CSGameComponents.escapeHtml(sentenceFilled === sentenceTargetCount ? "Ready to check" : "Still building") + '</strong></div>',
            (round.requiredToken ? '<div class="cg-sentence-stat cg-sentence-stat--focus"><span>Must use</span><strong>' + runtimeRoot.CSGameComponents.escapeHtml(round.requiredToken) + '</strong></div>' : ""),
            "    </div>",
            "  </section>",
            '  <div class="cg-sentence-workbench">',
            '    <div class="cg-sentence-lane-card">',
            '      <div class="cg-sentence-lane">',
            '        <p class="cg-lane-label">Build the sentence</p>',
            '        <div class="cg-sentence-slots" aria-label="Sentence assembly">' + (round.solution || []).map(function (_part, index) {
              var val = sentChosen[index] || "";
              return '<button class="cg-sentence-slot' + (val ? " is-filled" : "") + '" type="button" data-slot-index="' + index + '" data-drop-slot="' + index + '" aria-label="Sentence slot ' + (index + 1) + '">' + runtimeRoot.CSGameComponents.escapeHtml(val || "Drop word") + "</button>";
            }).join("") + "</div>",
            "      </div>",
            "    </div>",
            '    <aside class="cg-sentence-sidebar">',
            '      <div class="cg-premium-note">',
            '        <p class="cg-micro-label">Coach cue</p>',
            '        <h4>' + runtimeRoot.CSGameComponents.escapeHtml(round.requiredToken ? ("Use " + round.requiredToken + " in the right spot.") : "Start with the words that sound like the sentence stem.") + '</h4>',
            '        <p>' + runtimeRoot.CSGameComponents.escapeHtml(round.hint || "Read it aloud after every move to hear whether it flows.") + '</p>',
            "      </div>",
            liveOrderFeedback(sentChosen, round.solution, "sentence"),
            (state.hintVisible ? '<div class="cg-clue-reveal">' + runtimeRoot.CSGameComponents.iconFor("hint") + '<span>' + runtimeRoot.CSGameComponents.escapeHtml(round.hint) + "</span></div>" : ""),
            "    </aside>",
            "  </div>",
            '  <div class="cg-phrase-bank cg-phrase-bank--premium">',
            '    <div class="cg-phrase-bank__head"><p class="cg-phrase-bank-label">Word tiles</p><span>' + runtimeRoot.CSGameComponents.escapeHtml(sentenceTargetCount ? (sentenceTargetCount + "-part sentence") : "Tile set") + "</span></div>",
            '    <div class="cg-phrase-tiles">' + (round.tiles || []).map(function (tile) {
              var sel = sentChosen.indexOf(tile) >= 0;
              return '<button class="cg-phrase-tile' + (sel ? " is-selected" : "") + '" type="button" draggable="true" data-drag-tile="' + runtimeRoot.CSGameComponents.escapeHtml(tile) + '" data-tile="' + runtimeRoot.CSGameComponents.escapeHtml(tile) + '">' + runtimeRoot.CSGameComponents.escapeHtml(tile) + "</button>";
            }).join("") + "</div>",
            "  </div>",
            "</div>",
            "</div>"
          ].join(""),
          controls: '<div class="cg-feedback-actions"><button class="cg-action cg-action-quiet" type="button" data-action="hint">Grammar Hint</button><button class="cg-action cg-action-quiet" type="button" data-action="clear-build">Clear</button><button class="cg-action cg-action-primary" type="button" data-submit="sentence-builder">Check Sentence</button></div>',
          guide: roundGuide(game, state, round)
        });
      }

      if (game.id === "concept-ladder") {
        var totalClues = (round.clues || []).length;
        var shownClues = Math.min(uiState.revealedClues, totalClues);
        var cluesLeft = Math.max(totalClues - shownClues, 0);
        return renderGameScaffold(game, state, round, {
          beforePlay: renderHostControls(game, state, round),
          playTitle: "Clue Ladder",
          play: [
            '<div class="cg-game-layout cg-game-layout--ladder">',
            '<div class="cg-premium-stage cg-premium-stage--ladder">',
            '  <section class="cg-ladder-hero">',
            '    <div class="cg-ladder-hero__copy">',
            '      <p class="cg-micro-label">Inference build</p>',
            '      <h3>Climb from broad clue to precise solve.</h3>',
            '      <p>' + runtimeRoot.CSGameComponents.escapeHtml(round.prompt) + '</p>',
            '    </div>',
            '    <div class="cg-ladder-hero__stats">',
            '      <div class="cg-ladder-stat"><span>Revealed</span><strong>' + shownClues + " / " + totalClues + '</strong></div>',
            '      <div class="cg-ladder-stat"><span>Points lane</span><strong>' + runtimeRoot.CSGameComponents.escapeHtml(cluesLeft > 0 ? "High-value solve live" : "Final clue open") + '</strong></div>',
            "    </div>",
            "  </section>",
            '  <div class="cg-ladder-stage">',
            '    <div class="cg-ladder-stage__main">',
            '      <div class="cg-step-chip">Step ' + shownClues + " of " + totalClues + "</div>",
            '      <div class="cg-ladder">' + (round.clues || []).map(function (clue, index) {
              if (index < shownClues) {
                return '<div class="cg-ladder-rung cg-ladder-rung--revealed" style="animation-delay:' + (index * 60) + 'ms"><span class="cg-rung-num">' + (index + 1) + '</span><div class="cg-rung-text">' + runtimeRoot.CSGameComponents.escapeHtml(clue) + "</div></div>";
              }
              return '<div class="cg-ladder-rung cg-ladder-rung--locked"><span class="cg-rung-num">' + (index + 1) + '</span><div class="cg-rung-locked-label">Reveal to unlock</div></div>';
            }).join("") + "</div>",
            "    </div>",
            '    <aside class="cg-ladder-stage__side">',
            '      <div class="cg-premium-note">',
            '        <p class="cg-micro-label">Solve strategy</p>',
            '        <h4>' + runtimeRoot.CSGameComponents.escapeHtml(cluesLeft > 1 ? "Pause before revealing the next clue." : "Use every clue to eliminate distractors.") + '</h4>',
            '        <p>' + runtimeRoot.CSGameComponents.escapeHtml(round.hint || "Name what the clues all have in common before you pick the answer.") + '</p>',
            "      </div>",
            '      <div class="cg-choice-preview"><strong>Current solve</strong>' + currentChoicePreview(uiState.selectedChoice) + '</div>',
            "    </aside>",
            "  </div>",
            "</div>"
          ].join(""),
          controls: [
            '<div class="cg-choice-row" aria-label="Possible answers">' + (round.options || []).map(function (option) {
              return '<button class="cg-choice' + (uiState.selectedChoice === option ? " is-selected" : "") + '" type="button" data-choice="' + runtimeRoot.CSGameComponents.escapeHtml(option) + '">' + runtimeRoot.CSGameComponents.escapeHtml(option) + "</button>";
            }).join("") + "</div>",
            '<div class="cg-feedback-actions">' + (shownClues < totalClues ? '<button class="cg-action cg-action-quiet" type="button" data-action="reveal-clue">Reveal Next Clue</button>' : "") + '<button class="cg-action cg-action-primary" type="button" data-submit="concept-ladder">Submit Solve</button></div>'
          ].join(""),
          guide: roundGuide(game, state, round)
        });
      }

      if (game.id === "error-detective") {
        return renderGameScaffold(game, state, round, {
          beforePlay: renderHostControls(game, state, round),
          play: [
            '<div class="cg-game-layout cg-game-layout--detective">',
            '<div class="cg-premium-stage cg-premium-stage--detective">',
            '  <section class="cg-detective-hero">',
            '    <div class="cg-detective-hero__copy">',
            '      <p class="cg-micro-label">Correction case</p>',
            '      <h3>Find the weak reasoning and close the case with the strongest fix.</h3>',
            '      <p>' + runtimeRoot.CSGameComponents.escapeHtml(round.prompt || "Tap the part that is wrong, then choose the best correction.") + '</p>',
            '    </div>',
            '    <div class="cg-detective-hero__badge">' + runtimeRoot.CSGameComponents.escapeHtml(round.misconception || "Reasoning Error") + '</div>',
            '  </section>',
            '  <div class="cg-case-board cg-case-board--premium">',
            '    <div class="cg-case-file">',
            '      <div class="cg-case-file-header">',
            '        <span class="cg-case-stamp">Case File</span>',
            '        <span class="cg-case-type">' + runtimeRoot.CSGameComponents.escapeHtml(round.misconception || "Reasoning Error") + '</span>',
            '      </div>',
            '      <div class="cg-case-error-text" aria-label="Incorrect statement">' + renderDetectiveFragments(round.incorrectExample || "", uiState.detectiveSelection) + '</div>',
            '      <div class="cg-case-highlight-row"><strong>Suspected error</strong><span>' + runtimeRoot.CSGameComponents.escapeHtml(uiState.detectiveSelection || "Highlight the part that looks wrong.") + '</span></div>',
            '    </div>',
            '    <aside class="cg-case-sidebar">',
            '      <div class="cg-premium-note cg-premium-note--danger">',
            '        <p class="cg-micro-label">Evidence cue</p>',
            '        <h4>' + runtimeRoot.CSGameComponents.escapeHtml(round.hint || "Look for the phrase that breaks the meaning or logic.") + '</h4>',
            '        <p>Pick the correction that repairs the idea, not just the wording.</p>',
            '      </div>',
            '      <div class="cg-case-paths">',
            '        <p class="cg-case-paths-label">Choose the fix that closes the case</p>',
            '        <div class="cg-choice-row cg-choice-row--stacked">' + (round.options || []).map(function (option) {
              return '<button class="cg-choice' + (uiState.selectedChoice === option ? " is-selected" : "") + '" type="button" data-choice="' + runtimeRoot.CSGameComponents.escapeHtml(option) + '">' + runtimeRoot.CSGameComponents.escapeHtml(option) + "</button>";
            }).join("") + "</div>",
            '      </div>',
            '    </aside>',
            '  </div>',
            (state.lastOutcome && !state.lastOutcome.correct ? '<div class="cg-support-reveal"><strong>Explanation</strong><span>' + runtimeRoot.CSGameComponents.escapeHtml(round.hint || "Look for the part that repairs the reasoning.") + "</span></div>" : ""),
            "</div>",
            "</div>"
          ].join(""),
          controls: '<div class="cg-feedback-actions"><button class="cg-action cg-action-quiet" type="button" data-action="hint">Reveal Explanation</button><button class="cg-action cg-action-primary" type="button" data-submit="error-detective">Confirm Correction</button></div>',
          guide: roundGuide(game, state, round)
        });
      }

      if (game.id === "rapid-category") {
        var timerSec = round.timerSeconds || game.baseTimerSeconds || 40;
        var remaining = typeof state.timerRemaining === "number" ? state.timerRemaining : timerSec;
        var timerPct = timerSec > 0 ? Math.round((remaining / timerSec) * 100) : 100;
        var timerTone = timerPct > 50 ? "positive" : timerPct > 25 ? "warning" : "danger";
        var circumference = 276.46;
        var dashOffset = Math.round(circumference * (1 - timerPct / 100));
        var ringStroke = timerTone === "positive" ? "var(--cg-positive)" : timerTone === "warning" ? "var(--cg-warning)" : "var(--cg-negative)";
        return renderGameScaffold(game, state, round, {
          beforePlay: renderHostControls(game, state, round),
          play: [
            '<div class="cg-game-layout cg-game-layout--rush">',
            '<div class="cg-premium-stage cg-premium-stage--rush">',
            '  <section class="cg-rush-hero">',
            '    <div class="cg-rush-stage">',
            '      <div class="cg-rush-timer-ring" aria-label="' + remaining + ' seconds remaining">',
            '        <svg viewBox="0 0 108 108" aria-hidden="true">',
            '          <circle class="track" cx="54" cy="54" r="44" stroke="rgba(20,34,51,0.10)" stroke-width="8" fill="none"/>',
            '          <circle class="fill" cx="54" cy="54" r="44" stroke="' + ringStroke + '" stroke-width="8" fill="none" stroke-linecap="round" stroke-dasharray="' + circumference + '" stroke-dashoffset="' + dashOffset + '" style="transition:stroke-dashoffset .9s linear,stroke .5s"/>',
            '        </svg>',
            '        <div class="cg-rush-timer-text">' + remaining + '<small>sec</small></div>',
            '      </div>',
            '      <div class="cg-rush-prompt-block">',
            '        <p class="cg-rush-category-label">Category</p>',
            '        <h3 class="cg-rush-prompt-text">' + runtimeRoot.CSGameComponents.escapeHtml(round.prompt) + '</h3>',
            '        <div class="cg-rush-scoreline"><span>Running score</span><strong>' + Number(state.score || 0) + '</strong></div>',
            '      </div>',
            '      <div class="cg-rush-hero__tips"><span>' + runtimeRoot.CSGameComponents.escapeHtml(timerPct > 40 ? "Fast unique answers score best." : "Push for one more unique response.") + '</span><span>' + runtimeRoot.CSGameComponents.escapeHtml(round.hint || "Switch to a new subcategory if you stall.") + '</span></div>',
            '    </div>',
            '    <div class="cg-rush-preview" aria-live="polite">' + (uiState.categoryPreview || []).map(function (item, index) {
              return '<span class="cg-rush-preview__item" style="animation-delay:' + (index * 40) + 'ms">' + runtimeRoot.CSGameComponents.escapeHtml(item) + "</span>";
            }).join("") + '</div>',
            (state.hintVisible ? '<div class="cg-clue-reveal">' + runtimeRoot.CSGameComponents.iconFor("hint") + '<span>' + runtimeRoot.CSGameComponents.escapeHtml(round.hint) + "</span></div>" : ""),
            '  </section>',
            "</div>",
            "</div>"
          ].join(""),
          controls: [
            '<div class="cg-rush-entry">',
            '  <div class="cg-rush-fast-entry"><input id="cg-category-quick-input" class="cg-input" placeholder="' + runtimeRoot.CSGameComponents.escapeHtml(isGroupView(state) ? "Type one answer and press Enter…" : "Type one answer and press Enter…") + '" aria-label="Add quick category answer"><button class="cg-action cg-action-quiet" type="button" data-action="add-category-entry">Add</button></div>',
            '  <textarea id="cg-category-text" class="cg-textarea" placeholder="' + runtimeRoot.CSGameComponents.escapeHtml(isGroupView(state) ? "Team responses — one per line or comma-separated…" : "Enter responses — one per line or comma-separated…") + '" aria-label="Enter category responses">' + runtimeRoot.CSGameComponents.escapeHtml((uiState.categoryPreview || []).join("\n")) + '</textarea>',
            '  <div class="cg-feedback-actions"><button class="cg-action cg-action-quiet" type="button" data-action="hint">Show Hint</button><button class="cg-action cg-action-primary" type="button" data-submit="rapid-category">' + runtimeRoot.CSGameComponents.escapeHtml(isGroupView(state) ? "Score Round" : "Score Responses") + '</button></div>',
            '</div>'
          ].join(""),
          guide: roundGuide(game, state, round)
        });
      }

      return '<div class="cg-focus-panel">Round ready.</div>';
    }

    function hydrateControls(state) {
      var map = {
        "cg-grade-band": context.gradeBand,
        "cg-content-mode": state.settings.contentMode || context.contentMode || "lesson",
        "cg-word-source": state.settings.wordSource || context.wordSource || "lesson",
        "cg-custom-word-set": state.settings.customWordSet || ""
      };
      Object.keys(map).forEach(function (id) {
        var element = document.getElementById(id);
        if (element) element.value = map[id];
      });
    }

    function bindInteractions() {
      Array.prototype.forEach.call(shell.querySelectorAll("[data-game-id]"), function (button) {
        button.addEventListener("click", function () {
          var gameId = button.getAttribute("data-game-id") || "";
          if (!gameId) return;
          if (galleryOnly) {
            var href = button.getAttribute("href") || button.getAttribute("data-href") || "";
            if (href) {
              runtimeRoot.location.href = href;
            }
            return;
          }
          resetRoundUi();
          if (gameId === "word-typing") {
            refreshTypingCourseContext();
            persistTypingContextToEngine();
            engine.updateSettings({ timerEnabled: false });
          }
          engine.updateContext({
            subject: context.subject,
            gradeBand: context.gradeBand,
            skillFocus: context.skillFocus,
            contentMode: context.contentMode,
            typingCourseMode: context.typingCourseMode,
            currentTypingLessonId: context.currentTypingLessonId,
            currentTypingLessonOrder: context.currentTypingLessonOrder,
            typingUnlockedOrder: context.typingUnlockedOrder,
            typingCompletedLessons: context.typingCompletedLessons
          });
          engine.selectGame(gameId);
        });
        if (galleryOnly && button.getAttribute("role") === "link") {
          button.addEventListener("keydown", function (event) {
            if (event.key !== "Enter" && event.key !== " ") return;
            event.preventDefault();
            var href = button.getAttribute("data-href") || "";
            if (href) runtimeRoot.location.href = href;
          });
        }
      });

      Array.prototype.forEach.call(shell.querySelectorAll("[data-action]"), function (button) {
        button.addEventListener("click", function () {
          var action = button.getAttribute("data-action");
          var currentState = engine.getState();
          var inTypingHub = currentState.selectedGameId === "word-typing" && !params.typingPage;
          var inTypingRuntime = currentState.selectedGameId === "word-typing" && params.typingPage;
          if (action === "toggle-teacher") {
            uiState.teacherPanelOpen = !uiState.teacherPanelOpen;
            var picker = runtimeRoot.document.getElementById("cg-theme-picker");
            if (picker) picker.setAttribute("data-open", "false");
            render();
            return;
          }
          if (action === "hint") {
            if (engine.getState().settings.hintsEnabled) engine.revealHint();
            return;
          }
          if (action === "restart" || action === "repeat-game") {
            resetRoundUi();
            engine.restartGame();
            return;
          }
          if (action === "toggle-music") {
            toggleSharedMusic();
            return;
          }
          if (action === "next-music") {
            void stepSharedMusic(1);
            return;
          }
          if (action === "start-typing-round") {
            if (inTypingHub) {
              runtimeRoot.location.href = typingQuestHref({
                typingCourseMode: context.typingPlacementRequired ? "placement" : "lesson",
                lessonId: context.currentTypingLessonId,
                lessonOrder: context.currentTypingLessonOrder
              });
              return;
            }
            startTypingRound();
            return;
          }
          if (action === "repeat-typing-lesson") {
            if (inTypingHub) {
              runtimeRoot.location.href = typingQuestHref({
                typingCourseMode: context.typingPlacementRequired ? "placement" : "lesson",
                lessonId: context.currentTypingLessonId,
                lessonOrder: context.currentTypingLessonOrder
              });
              return;
            }
            restartTypingLesson(Number(currentState.round && currentState.round.lessonOrder || context.currentTypingLessonOrder || 1));
            return;
          }
          if (action === "next-typing-check") {
            uiState.typingStartedRoundId = "";
            uiState.typingRoundStartedAt = 0;
            uiState.typingLockedValue = "";
            uiState.typingAcceptedChars = 0;
            uiState.typingMistakes = 0;
            uiState.lastSubmittedGuess = "";
            engine.nextRound();
            return;
          }
          if (action === "next-typing-lesson") {
            if (inTypingHub) {
              runtimeRoot.location.href = typingQuestHref({
                typingCourseMode: context.typingPlacementRequired ? "placement" : "lesson",
                lessonId: context.currentTypingLessonId,
                lessonOrder: context.currentTypingLessonOrder
              });
              return;
            }
            restartTypingLesson(Number(context.currentTypingLessonOrder || typingProgress.currentLessonOrder || 1));
            return;
          }
          if (action === "retake-typing-placement") {
            typingProgress = defaultTypingProgress();
            saveTypingProgress(context, typingProgress);
            refreshTypingCourseContext();
            persistTypingContextToEngine();
            if (inTypingHub) {
              runtimeRoot.location.href = typingQuestHref({ typingCourseMode: "placement" });
              return;
            }
            resetRoundUi();
            engine.updateSettings({ timerEnabled: false });
            engine.restartGame();
            return;
          }
          if (action === "jump-typing-lesson") {
            var lessonOrder = Number(button.getAttribute("data-lesson-order") || 0);
            if (!lessonOrder) return;
            if (inTypingHub) {
              var jumpLesson = typingLessonByOrder(lessonOrder);
              if (!jumpLesson || lessonOrder > Number(context.typingUnlockedOrder || 1)) return;
              runtimeRoot.location.href = typingQuestHref({
                typingCourseMode: "lesson",
                lessonId: jumpLesson.id,
                lessonOrder: jumpLesson.lessonOrder
              });
              return;
            }
            restartTypingLesson(lessonOrder);
            return;
          }
          if (action === "next-round") {
            resetRoundUi();
            engine.nextRound();
            return;
          }
          if (action === "wc-start-round") {
            if (uiState.wordClue.phase === "setup" || uiState.wordClue.phase === "reveal") {
              uiState.wordClue.phase = "ready";
              uiState.wordClue.result = "";
              uiState.wordClue.timerRemaining = wordCluePresetSeconds(uiState.wordClue.timerPreset);
            } else if (uiState.wordClue.phase === "ready") {
              uiState.wordClue.phase = "live";
              uiState.wordClue.result = "";
              startWordClueTimer(currentState);
            }
            render();
            return;
          }
          if (action === "wc-toggle-setup") {
            uiState.wordClue.setupOpen = !uiState.wordClue.setupOpen;
            render();
            return;
          }
          if (action === "wc-open-format") {
            var format = String(button.getAttribute("data-format") || "standard");
            var pickerOpen = runtimeRoot.document.getElementById("cg-theme-picker");
            if (pickerOpen) pickerOpen.setAttribute("data-open", "false");
            uiState.wordClue.screen = "play";
            uiState.wordClue.setupOpen = false;
            uiState.wordClue.phase = "setup";
            if (format === "picture") {
              uiState.wordClue.cardStyle = "picture";
              uiState.wordClue.mode = "speak";
              engine.updateSettings({ wordConnectionsMode: "speak", wordClueCardStyle: "picture" });
            } else if (format === "draw") {
              uiState.wordClue.cardStyle = "draw";
              uiState.wordClue.mode = "draw";
              engine.updateSettings({ wordConnectionsMode: "draw", wordClueCardStyle: "draw" });
            } else if (format === "act") {
              uiState.wordClue.cardStyle = "act";
              uiState.wordClue.mode = "act";
              engine.updateSettings({ wordConnectionsMode: "act", wordClueCardStyle: "act" });
            } else if (format === "mixed") {
              uiState.wordClue.cardStyle = "mixed";
              uiState.wordClue.mode = "mixed";
              engine.updateSettings({ wordConnectionsMode: "mixed", wordClueCardStyle: "mixed" });
            } else {
              uiState.wordClue.cardStyle = "standard";
              uiState.wordClue.mode = "speak";
              engine.updateSettings({ wordConnectionsMode: "speak", wordClueCardStyle: "standard" });
            }
            resetRoundUi();
            uiState.wordClue.screen = "play";
            engine.restartGame();
            return;
          }
          if (action === "wc-back-landing") {
            resetRoundUi();
            uiState.wordClue.screen = "landing";
            render();
            return;
          }
          if (action === "wc-save-custom-card") {
            var customTarget = String(uiState.wordClue.customTargetWord || "").trim();
            var customForbidden = String(uiState.wordClue.customForbiddenWords || "")
              .split(",")
              .map(function (value) { return String(value || "").trim(); })
              .filter(Boolean)
              .slice(0, 8);
            if (!customTarget || customForbidden.length < 2) return;
            var customCards = [];
            try {
              customCards = JSON.parse(storageGet("cs.wordclue.customcards.v1", "[]"));
              if (!Array.isArray(customCards)) customCards = [];
            } catch (_e) {
              customCards = [];
            }
            customCards.push({
              id: "wc-custom-" + Date.now(),
              target_word: customTarget,
              grade_band: normalizeStarterGradeBand(uiState.wordClue.customGradeBand || "K-1"),
              subject: uiState.wordClue.customSubject || "ELA",
              difficulty: "core",
              forbidden_words: customForbidden,
              alt_forbidden_sets: [],
              image_keyword: customTarget,
              image_supported: true,
              curriculum_tag: uiState.wordClue.customCurriculumTag || "",
              teacher_created: true
            });
            storageSet("cs.wordclue.customcards.v1", JSON.stringify(customCards));
            uiState.wordClue.customTargetWord = "";
            uiState.wordClue.customForbiddenWords = "";
            resetRoundUi();
            engine.restartGame();
            return;
          }
          if (action === "wc-begin-live") {
            if (currentState.selectedGameId !== "word-connections") return;
            uiState.wordClue.phase = "live";
            uiState.wordClue.result = "";
            startWordClueTimer(currentState);
            render();
            return;
          }
          if (action === "wc-pass") {
            if (currentState.selectedGameId !== "word-connections" || currentState.status !== "playing" || uiState.wordClue.phase !== "live") return;
            stopWordClueTimer();
            uiState.wordClue.phase = "reveal";
            uiState.wordClue.result = "pass";
            engine.submit({ value: "" });
            return;
          }
          if (action === "wc-got-it") {
            if (currentState.selectedGameId !== "word-connections" || currentState.status !== "playing" || uiState.wordClue.phase !== "live") return;
            stopWordClueTimer();
            uiState.wordClue.phase = "reveal";
            uiState.wordClue.result = "gotit";
            engine.teacherOverride();
            return;
          }
          if (action === "wc-reveal") {
            if (currentState.selectedGameId !== "word-connections" || currentState.status !== "playing" || uiState.wordClue.phase !== "live") return;
            stopWordClueTimer();
            uiState.wordClue.phase = "reveal";
            uiState.wordClue.result = "reveal";
            engine.submit({ value: "" });
            return;
          }
          if (action === "wc-pause") {
            if (currentState.selectedGameId !== "word-connections" || uiState.wordClue.phase !== "live") return;
            uiState.wordClue.paused = !uiState.wordClue.paused;
            render();
            return;
          }
          if (action === "wc-replay-round") {
            stopWordClueTimer();
            uiState.wordClue.phase = "ready";
            uiState.wordClue.result = "";
            uiState.wordClue.timerRemaining = wordCluePresetSeconds(uiState.wordClue.timerPreset);
            render();
            return;
          }
          if (action === "wc-back-setup") {
            stopWordClueTimer();
            uiState.wordClue.phase = "setup";
            uiState.wordClue.result = "";
            uiState.wordClue.timerRemaining = wordCluePresetSeconds(uiState.wordClue.timerPreset);
            render();
            return;
          }
          if (action === "add-category-entry") {
            var quickInput = document.getElementById("cg-category-quick-input");
            var categoryArea = document.getElementById("cg-category-text");
            var entry = String(quickInput && quickInput.value || "").trim();
            if (!entry) return;
            uiState.categoryPreview = normalizeCategoryEntries(uiState.categoryPreview.concat([entry]).join("\n"));
            if (categoryArea) categoryArea.value = uiState.categoryPreview.join("\n");
            if (quickInput) quickInput.value = "";
            paintCategoryPreview(uiState.categoryPreview);
            return;
          }
          if (action === "reveal-clue") {
            uiState.revealedClues = Math.min(uiState.revealedClues + 1, ((engine.getState().round && engine.getState().round.clues) || []).length);
            render();
            return;
          }
          if (action === "toggle-support-reveal") {
            uiState.supportRevealOpen = !uiState.supportRevealOpen;
            render();
            return;
          }
          if (action === "teacher-override") {
            engine.teacherOverride();
            return;
          }
          if (action === "clear-build") {
            uiState.builderSelection = [];
            render();
          }
        });
      });

      Array.prototype.forEach.call(shell.querySelectorAll(".cg-word-clue-format-card[role='button']"), function (card) {
        card.addEventListener("keydown", function (event) {
          if (event.key !== "Enter" && event.key !== " ") return;
          event.preventDefault();
          card.click();
        });
      });
      syncSharedMusicUi();

      Array.prototype.forEach.call(shell.querySelectorAll("[data-submit]"), function (button) {
        button.addEventListener("click", function () {
          handleSubmit(button.getAttribute("data-submit") || "");
        });
      });

      Array.prototype.forEach.call(shell.querySelectorAll("[data-choice]"), function (button) {
        button.addEventListener("click", function () {
          uiState.selectedChoice = button.getAttribute("data-choice") || "";
          render();
        });
      });

      Array.prototype.forEach.call(shell.querySelectorAll("[data-detective-fragment]"), function (button) {
        button.addEventListener("click", function () {
          uiState.detectiveSelection = button.getAttribute("data-detective-fragment") || "";
          render();
        });
      });

      Array.prototype.forEach.call(shell.querySelectorAll("[data-tile]"), function (button) {
        button.addEventListener("click", function () {
          var tile = button.getAttribute("data-tile") || "";
          if (uiState.builderSelection.indexOf(tile) >= 0) return;
          var solutionLength = (((engine.getState().round || {}).solution) || []).length;
          var next = uiState.builderSelection.slice();
          var emptyIndex = next.indexOf("");
          if (emptyIndex < 0) emptyIndex = next.length < solutionLength ? next.length : -1;
          if (emptyIndex < 0) return;
          next[emptyIndex] = tile;
          uiState.builderSelection = next;
          render();
        });
      });

      Array.prototype.forEach.call(shell.querySelectorAll("[data-word-clue-style]"), function (button) {
        button.addEventListener("click", function () {
          uiState.wordClue.cardStyle = String(button.getAttribute("data-word-clue-style") || "standard");
          engine.updateSettings({ wordClueCardStyle: uiState.wordClue.cardStyle });
          if (uiState.wordClue.cardStyle === "draw") {
            uiState.wordClue.mode = "draw";
            engine.updateSettings({ wordConnectionsMode: "draw" });
          } else if (uiState.wordClue.cardStyle === "picture" || uiState.wordClue.cardStyle === "standard") {
            uiState.wordClue.mode = "speak";
            engine.updateSettings({ wordConnectionsMode: "speak" });
          }
          resetRoundUi();
          engine.restartGame();
          render();
        });
      });

      Array.prototype.forEach.call(shell.querySelectorAll("[data-preview-mode]"), function (button) {
        button.addEventListener("click", function () {
          var previewMode = String(button.getAttribute("data-preview-mode") || "classic");
          if (previewMode === "picture") {
            uiState.wordClue.cardStyle = "picture";
            uiState.wordClue.mode = "speak";
            engine.updateSettings({ wordConnectionsMode: "speak", wordClueCardStyle: "picture" });
          } else if (previewMode === "draw") {
            uiState.wordClue.cardStyle = "draw";
            uiState.wordClue.mode = "draw";
            engine.updateSettings({ wordConnectionsMode: "draw", wordClueCardStyle: "draw" });
          } else if (previewMode === "act") {
            uiState.wordClue.cardStyle = "act";
            uiState.wordClue.mode = "act";
            engine.updateSettings({ wordConnectionsMode: "act", wordClueCardStyle: "act" });
          } else if (previewMode === "mixed") {
            uiState.wordClue.cardStyle = "mixed";
            uiState.wordClue.mode = "mixed";
            engine.updateSettings({ wordConnectionsMode: "mixed", wordClueCardStyle: "mixed" });
          } else {
            uiState.wordClue.cardStyle = "standard";
            uiState.wordClue.mode = "speak";
            engine.updateSettings({ wordConnectionsMode: "speak", wordClueCardStyle: "standard" });
          }
          resetRoundUi();
          uiState.wordClue.screen = "play";
          engine.restartGame();
        });
      });

      Array.prototype.forEach.call(shell.querySelectorAll("select[data-action='wc-set-blocked']"), function (select) {
        select.addEventListener("change", function () {
          var blocked = Math.max(2, Math.min(5, Number(select.value || 4)));
          var styleTarget = String(select.getAttribute("data-style-target") || "");
          uiState.wordClue.blockedCount = blocked;
          if (styleTarget) uiState.wordClue.cardStyle = styleTarget === "mixed" ? "mixed" : styleTarget;
          engine.updateSettings({ wordConnectionsDifficulty: blocked - 1, wordClueCardStyle: uiState.wordClue.cardStyle });
        });
      });

      Array.prototype.forEach.call(shell.querySelectorAll("[data-word-clue-mode]"), function (button) {
        button.addEventListener("click", function () {
          uiState.wordClue.mode = String(button.getAttribute("data-word-clue-mode") || "speak");
          if (uiState.wordClue.mode === "picture") uiState.wordClue.cardStyle = "picture";
          if (uiState.wordClue.mode === "mixed") uiState.wordClue.cardStyle = "mixed";
          if (uiState.wordClue.mode === "speak") uiState.wordClue.cardStyle = "standard";
          if (uiState.wordClue.mode === "draw") uiState.wordClue.cardStyle = "draw";
          engine.updateSettings({ wordConnectionsMode: uiState.wordClue.mode });
          resetRoundUi();
          engine.restartGame();
        });
      });

      Array.prototype.forEach.call(shell.querySelectorAll("[data-slot-index]"), function (button) {
        button.addEventListener("click", function () {
          var next = uiState.builderSelection.slice();
          next[Number(button.getAttribute("data-slot-index") || 0)] = "";
          uiState.builderSelection = next;
          render();
        });
      });

      Array.prototype.forEach.call(shell.querySelectorAll("[data-drag-tile]"), function (button) {
        button.addEventListener("dragstart", function (event) {
          var tile = button.getAttribute("data-drag-tile") || "";
          if (!event.dataTransfer || !tile) return;
          event.dataTransfer.setData("text/plain", tile);
          event.dataTransfer.effectAllowed = "move";
          button.classList.add("is-dragging");
        });
        button.addEventListener("dragend", function () {
          button.classList.remove("is-dragging");
        });
      });

      Array.prototype.forEach.call(shell.querySelectorAll("[data-drop-slot]"), function (slot) {
        slot.addEventListener("dragover", function (event) {
          event.preventDefault();
          slot.classList.add("is-drop-target");
        });
        slot.addEventListener("dragleave", function () {
          slot.classList.remove("is-drop-target");
        });
        slot.addEventListener("drop", function (event) {
          event.preventDefault();
          slot.classList.remove("is-drop-target");
          var tile = event.dataTransfer ? event.dataTransfer.getData("text/plain") : "";
          if (!tile || uiState.builderSelection.indexOf(tile) >= 0) return;
          var slotIndex = Number(slot.getAttribute("data-drop-slot") || -1);
          if (slotIndex < 0) return;
          var next = uiState.builderSelection.slice();
          next[slotIndex] = tile;
          uiState.builderSelection = next;
          render();
        });
      });

      var typingInput = document.getElementById("cg-word-typing-input");
      if (typingInput) {
        typingInput.addEventListener("input", function () {
          var round = engine.getState().round || {};
          var target = String(round.target || "").toUpperCase();
          var previous = uiState.typingLockedValue || "";
          var nextRaw = normalizeTypingInput(typingInput.value, target);
          var nextValue = lockTypingProgress(nextRaw, target);
          if (!uiState.typingRoundStartedAt) uiState.typingRoundStartedAt = Date.now();
          if (nextRaw.length > previous.length) {
            for (var i = previous.length; i < nextRaw.length; i += 1) {
              if (nextRaw.charAt(i) === target.charAt(i)) {
                if (nextRaw.charAt(i) !== " ") uiState.typingAcceptedChars += 1;
              } else {
                uiState.typingMistakes += 1;
                uiState.typingErrorUntil = Date.now() + 180;
              }
            }
          }
          uiState.typingLockedValue = nextValue;
          typingInput.value = nextValue;
          paintTypingPreview(round, nextValue, uiState);
        });
        typingInput.addEventListener("keydown", function (event) {
          if (event.key === "Enter") {
            event.preventDefault();
            handleSubmit("word-typing");
          }
        });
      }

      var clueInput = document.getElementById("cg-word-connections-text");
      if (clueInput) {
        clueInput.addEventListener("keydown", function (event) {
          if ((event.metaKey || event.ctrlKey) && event.key === "Enter") {
            event.preventDefault();
            handleSubmit("word-connections");
          }
        });
      }

      var clueMode = document.getElementById("cg-word-connections-mode");
      if (clueMode) clueMode.addEventListener("change", function () {
        uiState.wordClue.mode = String(clueMode.value || "speak");
        if (uiState.wordClue.mode === "picture") uiState.wordClue.cardStyle = "picture";
        if (uiState.wordClue.mode === "draw") uiState.wordClue.cardStyle = "draw";
        if (uiState.wordClue.mode === "act") uiState.wordClue.cardStyle = "act";
        if (uiState.wordClue.mode === "mixed") uiState.wordClue.cardStyle = "mixed";
        if (uiState.wordClue.mode === "speak") uiState.wordClue.cardStyle = "standard";
        engine.updateSettings({ wordConnectionsMode: clueMode.value, wordClueCardStyle: uiState.wordClue.cardStyle });
        resetRoundUi();
        engine.restartGame();
      });

      var clueDifficulty = document.getElementById("cg-word-connections-difficulty");
      if (clueDifficulty) clueDifficulty.addEventListener("change", function () {
        var nextDifficulty = Number(clueDifficulty.value || 3);
        uiState.wordClue.blockedCount = nextDifficulty + 1;
        engine.updateSettings({ wordConnectionsDifficulty: nextDifficulty });
        resetRoundUi();
        engine.restartGame();
      });

      var clueGroupMode = document.getElementById("cg-word-clue-group");
      if (clueGroupMode) clueGroupMode.addEventListener("change", function () {
        uiState.wordClue.groupMode = String(clueGroupMode.value || "teams");
        render();
      });

      var clueTimerMode = document.getElementById("cg-word-clue-timer");
      if (clueTimerMode) clueTimerMode.addEventListener("change", function () {
        uiState.wordClue.timerPreset = String(clueTimerMode.value || "45");
        uiState.wordClue.timerRemaining = wordCluePresetSeconds(uiState.wordClue.timerPreset);
        render();
      });

      var clueCategory = document.getElementById("cg-word-clue-category");
      if (clueCategory) clueCategory.addEventListener("input", function () {
        uiState.wordClue.categoryContext = String(clueCategory.value || "").trim();
      });

      var clueFilterGrade = document.getElementById("cg-word-clue-filter-grade");
      if (clueFilterGrade) clueFilterGrade.addEventListener("change", function () {
        uiState.wordClue.filterGradeBand = normalizeStarterGradeBand(clueFilterGrade.value || "K-1");
        engine.updateSettings({ wordClueGradeBand: uiState.wordClue.filterGradeBand });
        resetRoundUi();
        engine.restartGame();
      });

      var clueFilterDeck = document.getElementById("cg-word-clue-filter-deck");
      if (clueFilterDeck) clueFilterDeck.addEventListener("change", function () {
        uiState.wordClue.filterDeckId = String(clueFilterDeck.value || "").trim();
        engine.updateSettings({ wordClueDeckId: uiState.wordClue.filterDeckId });
        resetRoundUi();
        engine.restartGame();
      });

      var clueFilterCurriculum = document.getElementById("cg-word-clue-filter-curriculum");
      if (clueFilterCurriculum) clueFilterCurriculum.addEventListener("input", function () {
        uiState.wordClue.filterCurriculum = String(clueFilterCurriculum.value || "").trim();
      });
      if (clueFilterCurriculum) clueFilterCurriculum.addEventListener("change", function () {
        engine.updateSettings({ wordClueCurriculum: uiState.wordClue.filterCurriculum });
        resetRoundUi();
        engine.restartGame();
      });

      var clueFilterDifficulty = document.getElementById("cg-word-clue-filter-difficulty");
      if (clueFilterDifficulty) clueFilterDifficulty.addEventListener("change", function () {
        uiState.wordClue.filterDifficulty = String(clueFilterDifficulty.value || "all").toLowerCase();
        engine.updateSettings({ wordClueDifficulty: uiState.wordClue.filterDifficulty });
        resetRoundUi();
        engine.restartGame();
      });

      var clueCustomTarget = document.getElementById("cg-word-clue-custom-target");
      if (clueCustomTarget) clueCustomTarget.addEventListener("input", function () {
        uiState.wordClue.customTargetWord = String(clueCustomTarget.value || "").trim();
      });

      var clueCustomForbidden = document.getElementById("cg-word-clue-custom-forbidden");
      if (clueCustomForbidden) clueCustomForbidden.addEventListener("input", function () {
        uiState.wordClue.customForbiddenWords = String(clueCustomForbidden.value || "");
      });

      var clueCustomGrade = document.getElementById("cg-word-clue-custom-grade");
      if (clueCustomGrade) clueCustomGrade.addEventListener("change", function () {
        uiState.wordClue.customGradeBand = normalizeStarterGradeBand(clueCustomGrade.value || "K-1");
      });

      var clueCustomSubject = document.getElementById("cg-word-clue-custom-subject");
      if (clueCustomSubject) clueCustomSubject.addEventListener("change", function () {
        uiState.wordClue.customSubject = String(clueCustomSubject.value || "ELA").toUpperCase();
      });

      var clueCustomCurriculum = document.getElementById("cg-word-clue-custom-curriculum");
      if (clueCustomCurriculum) clueCustomCurriculum.addEventListener("input", function () {
        uiState.wordClue.customCurriculumTag = String(clueCustomCurriculum.value || "").trim();
      });

      var categoryInput = document.getElementById("cg-category-text");
      if (categoryInput) {
        categoryInput.addEventListener("input", function () {
          uiState.categoryPreview = normalizeCategoryEntries(categoryInput.value || "");
          paintCategoryPreview(uiState.categoryPreview);
        });
      }

      var categoryQuickInput = document.getElementById("cg-category-quick-input");
      if (categoryQuickInput) {
        categoryQuickInput.addEventListener("keydown", function (event) {
          if (event.key !== "Enter") return;
          event.preventDefault();
          var addButton = shell.querySelector('[data-action="add-category-entry"]');
          if (addButton) addButton.click();
        });
      }

      var gradeBand = document.getElementById("cg-grade-band");
      if (gradeBand) gradeBand.addEventListener("change", function () {
        context.gradeBand = gradeBand.value;
        uiState.wordClue.filterGradeBand = normalizeStarterGradeBand(gradeBand.value);
        engine.updateContext({ gradeBand: gradeBand.value });
        engine.updateSettings({ wordClueGradeBand: normalizeStarterGradeBand(gradeBand.value) });
        resetRoundUi();
        engine.restartGame();
      });

      var contentMode = document.getElementById("cg-content-mode");
      if (contentMode) contentMode.addEventListener("change", function () {
        context.contentMode = contentMode.value;
        refreshTypingCourseContext();
        engine.updateContext({ contentMode: contentMode.value });
        persistTypingContextToEngine();
        engine.updateSettings({ contentMode: contentMode.value });
        if (engine.getState().selectedGameId === "word-typing" && String(contentMode.value || "").toLowerCase() === "lesson") {
          engine.updateSettings({ timerEnabled: false });
        }
        resetRoundUi();
        engine.restartGame();
      });

      var wordSource = document.getElementById("cg-word-source");
      if (wordSource) wordSource.addEventListener("change", function () {
        var source = String(wordSource.value || "lesson");
        var mappedContentMode = source === "custom"
          ? "custom"
          : source === "random"
            ? "subject"
            : source === "subject"
            ? "subject"
          : source === "morphology"
              ? "morphology"
              : "lesson";
        context.wordSource = source;
        context.contentMode = mappedContentMode;
        refreshTypingCourseContext();
        engine.updateContext({
          wordSource: source,
          contentMode: mappedContentMode
        });
        persistTypingContextToEngine();
        engine.updateSettings({
          wordSource: source,
          contentMode: mappedContentMode
        });
        resetRoundUi();
        engine.restartGame();
      });

      var custom = document.getElementById("cg-custom-word-set");
      if (custom) custom.addEventListener("change", function () {
        var raw = String(custom.value || "");
        var activeWordSource = String((wordSource && wordSource.value) || state.settings.wordSource || "lesson");
        if (raw && activeWordSource === "custom") {
          context.contentMode = "custom";
          engine.updateContext({ contentMode: "custom", customWordSet: raw });
          engine.updateSettings({ contentMode: "custom" });
        } else {
          engine.updateContext({ customWordSet: raw });
        }
        engine.updateSettings({ customWordSet: raw });
        resetRoundUi();
        engine.restartGame();
      });

      var timerToggle = document.getElementById("cg-toggle-timer");
      if (timerToggle) timerToggle.addEventListener("change", function () {
        engine.updateSettings({ timerEnabled: !!timerToggle.checked });
        resetRoundUi();
        engine.restartGame();
      });

      var hintsToggle = document.getElementById("cg-toggle-hints");
      if (hintsToggle) hintsToggle.addEventListener("change", function () {
        engine.updateSettings({ hintsEnabled: !!hintsToggle.checked });
      });

      var teamPlayToggle = document.getElementById("cg-toggle-team-play");
      if (teamPlayToggle) teamPlayToggle.addEventListener("change", function () {
        var nextViewMode = teamPlayToggle.checked ? "smallGroup" : "individual";
        engine.updateSettings({ viewMode: nextViewMode });
        resetRoundUi();
        engine.restartGame();
      });

      var shuffleWordsToggle = document.getElementById("cg-toggle-shuffle-words");
      if (shuffleWordsToggle) shuffleWordsToggle.addEventListener("change", function () {
        var nextValue = !!shuffleWordsToggle.checked;
        context.shuffleWordOrder = nextValue;
        engine.updateContext({ shuffleWordOrder: nextValue });
        engine.updateSettings({ shuffleWordOrder: nextValue });
        resetRoundUi();
        engine.restartGame();
      });

      Array.prototype.forEach.call(shell.querySelectorAll("[data-pomo-ui]"), function (button) {
        button.addEventListener("click", function () {
          var action = button.getAttribute("data-pomo-ui");
          if (action === "toggle") {
            galleryPomodoroUi.open = !galleryPomodoroUi.open;
            galleryPomodoroUi.minimized = false;
          } else if (action === "minimize") {
            galleryPomodoroUi.minimized = !galleryPomodoroUi.minimized;
          } else if (action === "mode") {
            galleryPomodoroUi.mode = galleryPomodoroUi.mode === "clock" ? "timer" : "clock";
          } else if (action === "popout") {
            pomodoroPopout = runtimeRoot.open("", "cs-gallery-pomodoro", "width=340,height=420,resizable=yes");
            renderPomodoroPopout();
          }
          persistGalleryPomodoroUi();
          render();
        });
      });

      var planClass = document.getElementById("cg-plan-class");
      if (planClass) planClass.addEventListener("input", function () {
        galleryPlan.classLabel = String(planClass.value || "");
        persistGalleryPlan();
        renderPomodoroPopout();
      });

      var planDate = document.getElementById("cg-plan-date");
      if (planDate) planDate.addEventListener("input", function () {
        galleryPlan.sessionDate = String(planDate.value || "");
        persistGalleryPlan();
        renderPomodoroPopout();
      });

      var planAgenda = document.getElementById("cg-plan-agenda");
      if (planAgenda) planAgenda.addEventListener("input", function () {
        galleryPlan.agenda = String(planAgenda.value || "");
        persistGalleryPlan();
      });

      Array.prototype.forEach.call(shell.querySelectorAll("[data-pomo-duration]"), function (button) {
        button.addEventListener("click", function () {
          var minutes = Math.max(5, Math.min(60, Number(button.getAttribute("data-pomo-duration")) || 25));
          galleryPomodoro.durationMinutes = minutes;
          galleryPomodoro.remainingSeconds = minutes * 60;
          galleryPomodoro.running = false;
          galleryPomodoro.endsAt = 0;
          stopPomodoroInterval();
          persistGalleryPomodoro();
          renderPomodoroPopout();
          render();
        });
      });

      Array.prototype.forEach.call(shell.querySelectorAll("[data-pomo-action]"), function (button) {
        button.addEventListener("click", function () {
          var action = button.getAttribute("data-pomo-action");
          if (action === "start") {
            galleryPomodoro.running = true;
            galleryPomodoro.endsAt = Date.now() + (Math.max(1, galleryPomodoro.remainingSeconds) * 1000);
            ensurePomodoroTicking();
          } else if (action === "pause") {
            syncPomodoroClock();
            galleryPomodoro.running = false;
            galleryPomodoro.endsAt = 0;
            stopPomodoroInterval();
          } else if (action === "reset") {
            galleryPomodoro.running = false;
            galleryPomodoro.endsAt = 0;
            galleryPomodoro.remainingSeconds = galleryPomodoro.durationMinutes * 60;
            stopPomodoroInterval();
          }
          persistGalleryPomodoro();
          renderPomodoroPopout();
          render();
        });
      });

      var dragHandle = shell.querySelector("[data-pomo-drag-handle]");
      if (dragHandle) {
        dragHandle.addEventListener("pointerdown", function (event) {
          var widget = shell.querySelector(".cg-pomo-widget");
          if (!widget || event.button !== 0 || event.target.closest("[data-pomo-ui], input, textarea, select, button, label")) return;
          var rect = widget.getBoundingClientRect();
          var startX = event.clientX;
          var startY = event.clientY;
          var offsetX = event.clientX - rect.left;
          var offsetY = event.clientY - rect.top;
          var pointerId = event.pointerId;
          var didDrag = false;
          function clampDrag(nextX, nextY) {
            galleryPomodoroUi.x = Math.max(12, Math.min(runtimeRoot.innerWidth - rect.width - 12, nextX));
            galleryPomodoroUi.y = Math.max(92, Math.min(runtimeRoot.innerHeight - rect.height - 12, nextY));
            widget.style.left = Math.round(galleryPomodoroUi.x) + "px";
            widget.style.top = Math.round(galleryPomodoroUi.y) + "px";
          }
          function cleanup() {
            runtimeRoot.removeEventListener("pointermove", onMove);
            runtimeRoot.removeEventListener("pointerup", onUp);
            runtimeRoot.removeEventListener("pointercancel", onUp);
            dragHandle.classList.remove("is-dragging");
            widget.classList.remove("is-dragging");
            if (runtimeRoot.document && runtimeRoot.document.body) {
              runtimeRoot.document.body.classList.remove("cg-pomo-dragging");
            }
            try { dragHandle.releasePointerCapture(pointerId); } catch (_error) {}
          }
          function onMove(moveEvent) {
            if (moveEvent.pointerId !== pointerId) return;
            var deltaX = moveEvent.clientX - startX;
            var deltaY = moveEvent.clientY - startY;
            if (!didDrag) {
              if ((deltaX * deltaX) + (deltaY * deltaY) < 36) return;
              didDrag = true;
              dragHandle.classList.add("is-dragging");
              widget.classList.add("is-dragging");
              if (runtimeRoot.document && runtimeRoot.document.body) {
                runtimeRoot.document.body.classList.add("cg-pomo-dragging");
              }
            }
            moveEvent.preventDefault();
            clampDrag(moveEvent.clientX - offsetX, moveEvent.clientY - offsetY);
          }
          function onUp(upEvent) {
            if (upEvent.pointerId !== pointerId) return;
            cleanup();
            if (didDrag) {
              upEvent.preventDefault();
              persistGalleryPomodoroUi();
            }
          }
          try { dragHandle.setPointerCapture(pointerId); } catch (_error) {}
          runtimeRoot.addEventListener("pointermove", onMove);
          runtimeRoot.addEventListener("pointerup", onUp);
          runtimeRoot.addEventListener("pointercancel", onUp);
        });
      }
    }

    /* ── Gallery setup selects ───────────────────────────── */
    var setupGrade   = document.getElementById("cg-setup-grade");
    var setupSubject = document.getElementById("cg-setup-subject");
    function applyGallerySetup() {
      if (setupGrade)   { context.gradeBand = setupGrade.value || context.gradeBand; try { localStorage.setItem("cs.gallery.grade", setupGrade.value); } catch (_e) {} }
      if (setupSubject) { context.subject = setupSubject.value || context.subject;   try { localStorage.setItem("cs.gallery.subject", setupSubject.value); } catch (_e) {} }
      render();
    }
    if (setupGrade)   setupGrade.addEventListener("change", applyGallerySetup);
    if (setupSubject) setupSubject.addEventListener("change", applyGallerySetup);

    ensurePomodoroTicking();

    function handleSubmit(gameId) {
      if (gameId === "word-quest") {
        var guess = document.getElementById("cg-word-guess");
        var value = guess ? guess.value : "";
        uiState.lastSubmittedGuess = String(value || "").trim();
        engine.submit({ value: value });
        return;
      }
      if (gameId === "word-typing") {
        var typedWord = document.getElementById("cg-word-typing-input");
        var typedValue = uiState.typingLockedValue || (typedWord ? typedWord.value : "");
        uiState.lastSubmittedGuess = String(typedValue || "").trim();
        engine.submit({ value: typedValue, stats: typingLiveMetrics(uiState, engine.getState().round || {}, typedValue) });
        return;
      }
      if (gameId === "word-connections") {
        var explanation = document.getElementById("cg-word-connections-text");
        engine.submit({ value: explanation ? explanation.value : "" });
        return;
      }
      if (gameId === "concept-ladder") {
        engine.submit({ value: uiState.selectedChoice || "", clueCount: uiState.revealedClues || 1 });
        uiState.selectedChoice = "";
        uiState.revealedClues = 1;
        return;
      }
      if (gameId === "error-detective") {
        engine.submit({ value: uiState.selectedChoice || "" });
        uiState.selectedChoice = "";
        return;
      }
      if (gameId === "rapid-category") {
        var category = document.getElementById("cg-category-text");
        uiState.categoryPreview = [];
        engine.submit({ value: category ? category.value : "" });
        return;
      }
      if (gameId === "morphology-builder" || gameId === "sentence-builder") {
        engine.submit({ value: uiState.builderSelection.slice() });
        uiState.builderSelection = [];
      }
    }

    engine.subscribe(function (state) {
      syncWordClueRoundState(state);
      if (state.selectedGameId === "word-connections" && (state.status === "round-complete" || state.status === "round-summary")) {
        stopWordClueTimer();
        if (!uiState.wordClue.result) {
          if (state.lastOutcome && (state.lastOutcome.correct || state.lastOutcome.teacherOverride)) uiState.wordClue.result = "gotit";
          else if (state.lastOutcome && state.lastOutcome.timedOut) uiState.wordClue.result = "timeout";
          else uiState.wordClue.result = "reveal";
        }
        uiState.wordClue.phase = "reveal";
      }
      if (state.selectedGameId === "word-typing" && state.round && state.round.id !== uiState.typingRoundId) {
        uiState.typingRoundId = state.round.id;
        uiState.typingStartedRoundId = "";
        uiState.typingLockedValue = "";
        uiState.typingErrorUntil = 0;
        uiState.typingRoundStartedAt = 0;
        uiState.typingAcceptedChars = 0;
        uiState.typingMistakes = 0;
      }
      syncTypingProgressFromState(state);
      applyMetricBumps(state);
      if (state.status === "round-summary") {
        var sessionKey = [
          state.selectedGameId,
          state.roundsCompleted,
          state.score,
          state.metrics && state.metrics.correct || 0,
          state.metrics && state.metrics.incorrect || 0
        ].join(":");
        if (uiState.lastLoggedSummaryKey !== sessionKey) {
          writeSessionToEvidence(state.selectedGameId, state, context);
          uiState.lastLoggedSummaryKey = sessionKey;
        }
      } else if (state.status === "playing" && Number(state.roundsCompleted || 0) === 0) {
        uiState.lastLoggedSummaryKey = "";
      }
      if (state.feedback && state.feedback.label) live.announce(state.feedback.label);
      render();
    });

    engine.start();
    render();
  }

  return {
    init: init
  };
});
