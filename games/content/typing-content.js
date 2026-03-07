(function typingContentModule(root, factory) {
  if (typeof module === "object" && module.exports) {
    module.exports = factory();
    return;
  }
  root.CSTypingContent = factory();
})(typeof globalThis !== "undefined" ? globalThis : window, function createTypingContent() {
  "use strict";

  return [
    {
      id: "typing-k1",
      gradeBands: ["K-2"],
      subjects: ["ELA", "Intervention"],
      prompt: "Type the home-row word.",
      target: "sad",
      keyboardZone: "home row",
      orthographyFocus: "short a",
      fingerCue: "Keep your fingers parked on the home row, then reach only when you need to.",
      meaningHint: "This is a high-frequency word students use often in reading and writing."
    },
    {
      id: "typing-k2",
      gradeBands: ["K-2"],
      subjects: ["ELA", "Intervention"],
      prompt: "Type the no-excuse word.",
      target: "said",
      keyboardZone: "home row + top row",
      orthographyFocus: "high-frequency irregular",
      fingerCue: "Say the word, tap each sound, then type the full word smoothly.",
      meaningHint: "This is a no-excuse word worth seeing and typing often."
    },
    {
      id: "typing-k3",
      gradeBands: ["K-2"],
      subjects: ["ELA", "Intervention"],
      prompt: "Type the suffix word.",
      target: "jumped",
      keyboardZone: "home row + bottom row",
      orthographyFocus: "suffix -ed",
      fingerCue: "Type the base word first, then attach the suffix without stopping your rhythm.",
      meaningHint: "Notice how the suffix adds meaning at the end of the word."
    },
    {
      id: "typing-k4",
      gradeBands: ["K-2", "3-5"],
      subjects: ["ELA", "Intervention"],
      prompt: "Type the longer practice word.",
      target: "review",
      keyboardZone: "full keyboard",
      orthographyFocus: "prefix re-",
      fingerCue: "Chunk the word into re + view before you type it.",
      meaningHint: "A prefix can carry meaning even while students practice keyboard reach."
    },
    {
      id: "typing-35a",
      gradeBands: ["3-5"],
      subjects: ["ELA", "Intervention", "Writing"],
      prompt: "Type the lesson word with the suffix.",
      target: "reading",
      keyboardZone: "full keyboard",
      orthographyFocus: "suffix -ing",
      fingerCue: "Say read + ing quietly, then type it as one smooth word.",
      meaningHint: "Students see the base word and suffix together at typing speed."
    },
    {
      id: "typing-35b",
      gradeBands: ["3-5", "6-8"],
      subjects: ["ELA", "Intervention", "Writing"],
      prompt: "Type the morphology word.",
      target: "preview",
      keyboardZone: "full keyboard",
      orthographyFocus: "prefix pre-",
      fingerCue: "Spot the prefix before you start typing so the word feels grouped, not random.",
      meaningHint: "Typing can reinforce how prefixes stay stable across many words."
    },
    {
      id: "typing-35c",
      gradeBands: ["3-5", "6-8"],
      subjects: ["ELA", "Writing", "Math"],
      prompt: "Type the academic word.",
      target: "because",
      keyboardZone: "full keyboard",
      orthographyFocus: "high-frequency academic word",
      fingerCue: "Keep your eyes on the full word, not one letter at a time.",
      meaningHint: "This is a high-frequency connector that supports complete sentences."
    },
    {
      id: "typing-68a",
      gradeBands: ["6-8", "9-12"],
      subjects: ["ELA", "Writing", "Intervention"],
      prompt: "Type the multisyllable word.",
      target: "predictable",
      keyboardZone: "full keyboard",
      orthographyFocus: "prefix + base + suffix",
      fingerCue: "Chunk the word into pre + dict + able, then type across the chunks without stopping.",
      meaningHint: "Longer words become easier when students see the orthographic chunks first."
    }
  ];
});
