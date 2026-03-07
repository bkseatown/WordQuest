(function morphologyContentModule(root, factory) {
  if (typeof module === "object" && module.exports) {
    module.exports = factory();
    return;
  }
  root.CSMorphologyContent = factory();
})(typeof globalThis !== "undefined" ? globalThis : window, function createMorphologyContent() {
  "use strict";

  return [
    {
      id: "morph-k1",
      gradeBands: ["K-2"],
      subjects: ["ELA", "Intervention"],
      programs: ["fundations", "just-words", "wilson", "ufli"],
      prompt: "Build the word for someone who hops again.",
      solution: ["re", "hop"],
      tiles: ["re", "hop", "un", "ing"],
      meaningHint: "'re-' means again, so the action happens one more time.",
      focus: "prefix"
    },
    {
      id: "morph-1",
      gradeBands: ["3-5", "6-8"],
      subjects: ["ELA", "Intervention"],
      programs: ["fundations", "just-words", "wilson", "ufli"],
      prompt: "Build the word that means to write again.",
      solution: ["re", "write"],
      tiles: ["re", "write", "un", "ing"],
      meaningHint: "The prefix changes the action to 'again.'",
      focus: "prefix"
    },
    {
      id: "morph-2",
      gradeBands: ["3-5", "6-8"],
      subjects: ["ELA", "Science"],
      programs: ["fundations", "wilson"],
      prompt: "Build the science word for a living thing that makes food with light.",
      solution: ["photo", "synth", "esis"],
      tiles: ["photo", "synth", "esis", "graph"],
      meaningHint: "'photo' means light and 'synth' means put together.",
      focus: "root"
    },
    {
      id: "morph-3",
      gradeBands: ["6-8", "9-12"],
      subjects: ["Science", "ELA"],
      programs: ["im", "bridges-math", "science"],
      prompt: "Build the word that means unable to be predicted.",
      solution: ["un", "predict", "able"],
      tiles: ["predict", "able", "un", "re", "tion"],
      meaningHint: "The suffix turns the verb into an adjective.",
      focus: "suffix"
    },
    {
      id: "morph-4",
      gradeBands: ["K-2", "3-5"],
      subjects: ["ELA", "Intervention"],
      programs: ["fundations", "ufli"],
      prompt: "Build the word for someone who is teaching.",
      solution: ["teach", "er"],
      tiles: ["teach", "er", "ing", "pre"],
      meaningHint: "'-er' can name the person doing the action.",
      focus: "suffix"
    },
    {
      id: "morph-k2",
      gradeBands: ["K-2", "3-5"],
      subjects: ["ELA", "Intervention"],
      programs: ["fundations", "ufli", "wilson"],
      prompt: "Build the longer word that means to look again.",
      solution: ["re", "view"],
      tiles: ["re", "view", "er", "ing"],
      meaningHint: "This is a longer practice word, but 're-' still means again.",
      focus: "multisyllable"
    }
  ];
});
