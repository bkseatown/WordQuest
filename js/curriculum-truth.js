(function curriculumTruthBootstrap() {
  "use strict";

  function freeze(value) {
    return Object.freeze(value);
  }

  var ENTRIES = freeze({
    "im-g4-u2-l7": freeze({
      id: "im-g4-u2-l7",
      program: "Illustrative Math",
      label: "Illustrative Math Grade 4 Unit 2 Lesson 7",
      shortLabel: "Illustrative Math · Lesson 7",
      grade: "Grade 4",
      unit: "Unit 2",
      lesson: "Lesson 7",
      officialFocus: "Find and explain equivalent fractions.",
      supportMove: "Use fraction strips, area models, or number lines to show why two fractions are equal.",
      assessmentPoint: "Lesson cool-down",
      assessmentDetail: "Use the cool-down to check whether the student can identify equal amounts and explain the equivalence.",
      progressMonitoring: "Track whether the student can match a model to two equivalent fractions with one prompt or less.",
      progressDataNote: "Log the cool-down result, the student's model explanation, and whether the student identified equivalence independently or with prompting.",
      sourceUrl: "https://im.kendallhunt.com/K5/teachers/grade-4/unit-2/lesson-7/preparation.html",
      sourceType: "verified"
    }),
    "im-g3-u6-l12": freeze({
      id: "im-g3-u6-l12",
      program: "Illustrative Math",
      label: "Illustrative Math Grade 3 Unit 6 Lesson 12",
      shortLabel: "Illustrative Math · Grade 3 · Unit 6 · Lesson 12",
      grade: "Grade 3",
      unit: "Unit 6",
      lesson: "Lesson 12",
      officialFocus: "Solve and represent weight and liquid-volume situations.",
      supportMove: "Use diagrams, labels, and one matching equation before students solve independently.",
      assessmentPoint: "Lesson cool-down",
      assessmentDetail: "Check whether the student can match the situation to the correct diagram and explain the quantities.",
      progressMonitoring: "Track correct diagram matching and equation selection across cool-downs.",
      progressDataNote: "Log the cool-down score, the diagram/equation match, and whether the student explained the quantities without teacher language support.",
      sourceUrl: "https://im.kendallhunt.com/K5/teachers/grade-3/unit-6/lesson-12/preparation.html",
      sourceType: "verified"
    }),
    "im-g4-u4-l9": freeze({
      id: "im-g4-u4-l9",
      program: "Illustrative Math",
      label: "Illustrative Math Grade 4 Unit 4 Lesson 9",
      shortLabel: "Illustrative Math · Grade 4 · Unit 4 · Lesson 9",
      grade: "Grade 4",
      unit: "Unit 4",
      lesson: "Lesson 9",
      officialFocus: "Read, write, and compare numbers in different forms.",
      supportMove: "Use place-value charts and expanded form before asking for a verbal explanation.",
      assessmentPoint: "Lesson cool-down",
      assessmentDetail: "Check whether the student can explain a digit's value in the number and compare two forms correctly.",
      progressMonitoring: "Track explanation accuracy for digit value and comparison language on cool-downs.",
      progressDataNote: "Log the cool-down result, the student's place-value explanation, and whether comparison language was accurate independently.",
      sourceUrl: "https://im.kendallhunt.com/K5/teachers/grade-4/unit-4/lesson-9/preparation.html",
      sourceType: "verified"
    }),
    "fishtank-g3-current": freeze({
      id: "fishtank-g3-current",
      program: "Fishtank ELA",
      label: "Fishtank ELA Grade 3 current unit",
      shortLabel: "Fishtank ELA Grade 3",
      officialFocus: "Use the current unit's text study and writing task to build evidence-based reading, discussion, and written response.",
      supportMove: "Preview the key vocabulary, then keep one text-dependent question and one sentence frame visible during independent response.",
      assessmentPoint: "Unit assessment set",
      assessmentDetail: "Use the current unit's pre-, mid-, and end-of-unit assessment tasks to check reading, discussion, and writing performance.",
      progressMonitoring: "Track text evidence use, response completion, and independence with the unit writing task.",
      progressDataNote: "Log the current pre-, mid-, or end-of-unit task, plus discussion evidence use, writing completion, and the level of prompting needed.",
      sourceUrl: "https://www.fishtanklearning.org/curriculum/ela/3rd-grade/",
      sourceType: "broad"
    }),
    "fishtank-g1-current": freeze({
      id: "fishtank-g1-current",
      program: "Fishtank ELA",
      label: "Fishtank ELA Grade 1 current unit",
      shortLabel: "Fishtank ELA Grade 1",
      officialFocus: "Use the current unit's anchor text and writing task to build grade-level reading, speaking, and response work.",
      supportMove: "Preview the target vocabulary, then keep one oral rehearsal prompt and one response frame visible during work time.",
      assessmentPoint: "Unit assessment set",
      assessmentDetail: "Use the current unit's pre-, mid-, and end-of-unit tasks to check comprehension, discussion, and writing.",
      progressMonitoring: "Track oral response, text evidence use, and completion of the same classroom task with supports.",
      progressDataNote: "Log the current unit task, oral rehearsal strength, and how much support was needed to complete the same classroom response.",
      sourceUrl: "https://www.fishtanklearning.org/curriculum/ela/early-elementary/",
      sourceType: "broad"
    }),
    "fishtank-g2-current": freeze({
      id: "fishtank-g2-current",
      program: "Fishtank ELA",
      label: "Fishtank ELA Grade 2 current unit",
      shortLabel: "Fishtank ELA Grade 2",
      officialFocus: "Use the current unit's anchor text and writing task to build evidence-based reading, discussion, and written response.",
      supportMove: "Preteach the key vocabulary, then keep one note-catcher or sentence frame visible while the student completes the same task.",
      assessmentPoint: "Unit assessment set",
      assessmentDetail: "Use the current unit's pre-, mid-, and end-of-unit tasks to check reading, discussion, and writing performance.",
      progressMonitoring: "Track vocabulary carryover, response completion, and independence on the same classroom task.",
      progressDataNote: "Log the current unit task, target vocabulary carryover, and whether the student completed the classroom response with or without scaffolds.",
      sourceUrl: "https://www.fishtanklearning.org/curriculum/ela/early-elementary/",
      sourceType: "broad"
    }),
    "el-g7-current": freeze({
      id: "el-g7-current",
      program: "EL Education",
      label: "EL Education Grade 7 current module",
      shortLabel: "EL Education Grade 7",
      officialFocus: "Use the current module's close reading, discussion, and evidence-based writing to keep middle-school literacy work aligned.",
      supportMove: "Preview the critical vocabulary and note-catcher first, then keep the writing target and one model response visible during work time.",
      assessmentPoint: "Mid-unit / end-of-unit / performance task",
      assessmentDetail: "Use the module's mid-unit assessment, end-of-unit assessment, and performance task to track reading analysis and writing.",
      progressMonitoring: "Track note-catcher completion, text evidence selection, and written response accuracy across lessons.",
      progressDataNote: "Log the current EL assessment or check-in, note-catcher completion, evidence selection accuracy, and writing independence.",
      sourceType: "verified"
    }),
    "el-g6-current": freeze({
      id: "el-g6-current",
      program: "EL Education",
      label: "EL Education Grade 6 current module",
      shortLabel: "EL Education Grade 6",
      officialFocus: "Use the current module's close reading, discussion, and evidence-based writing to keep middle-school literacy work aligned.",
      supportMove: "Preview the key vocabulary and note-catcher first, then keep one text-dependent question and response frame visible during work time.",
      assessmentPoint: "Mid-unit / end-of-unit / performance task",
      assessmentDetail: "Use the module's mid-unit assessment, end-of-unit assessment, and performance task to track reading analysis and writing.",
      progressMonitoring: "Track note-catcher completion, evidence use, and written response accuracy across lessons.",
      progressDataNote: "Log the current EL assessment or check-in, note-catcher completion, evidence use, and writing independence.",
      sourceType: "verified"
    }),
    "el-g8-current": freeze({
      id: "el-g8-current",
      program: "EL Education",
      label: "EL Education Grade 8 current module",
      shortLabel: "EL Education Grade 8",
      officialFocus: "Use the current module's close reading, discussion, and evidence-based writing to keep middle-school literacy work aligned.",
      supportMove: "Preview the critical vocabulary and note-catcher first, then keep the writing target and one model response visible during work time.",
      assessmentPoint: "Mid-unit / end-of-unit / performance task",
      assessmentDetail: "Use the module's mid-unit assessment, end-of-unit assessment, and performance task to track reading analysis and writing.",
      progressMonitoring: "Track note-catcher completion, text evidence selection, and written response accuracy across lessons.",
      progressDataNote: "Log the current EL assessment or check-in, note-catcher completion, evidence selection accuracy, and writing independence.",
      sourceType: "verified"
    }),
    "fundations-l2-u8": freeze({
      id: "fundations-l2-u8",
      program: "Fundations",
      label: "Fundations Level 2 Unit 8",
      shortLabel: "Fundations Level 2 Unit 8",
      officialFocus: "R-controlled syllable types, including ar and or, with decoding, encoding, and dictation transfer.",
      supportMove: "Tap and mark ar/or words, then move quickly into connected dictation.",
      assessmentPoint: "Diagnostic check / Unit test / Dictation",
      assessmentDetail: "Use weekly dictation and unit-level checks to measure decoding and encoding of the target patterns.",
      progressMonitoring: "Track accuracy on ar/or word reading, dictated words, and short sentence dictation.",
      progressDataNote: "Log dictation accuracy, unit check results, and whether the target pattern transferred into connected reading or sentence writing.",
      sourceUrl: "https://www.wilsonlanguage.com/programs/fundations/",
      sourceType: "verified"
    }),
    "fundations-k-current": freeze({
      id: "fundations-k-current",
      program: "Fundations",
      label: "Fundations Level K current unit",
      shortLabel: "Fundations Level K current unit",
      officialFocus: "Use the current Fundations unit for explicit letter-sound work, CVC practice, and dictated word transfer.",
      supportMove: "Keep the oral routine, sound cards, and dictated word practice tightly sequenced.",
      assessmentPoint: "Diagnostic check / Unit test / Dictation",
      assessmentDetail: "Use current-unit checks and dictated word practice to monitor letter-sound and CVC accuracy.",
      progressMonitoring: "Track letter-sound fluency, CVC reading, and dictated-word accuracy.",
      progressDataNote: "Log unit check performance, dictated word accuracy, and whether the student held the pattern in reading and spelling.",
      sourceUrl: "https://www.wilsonlanguage.com/programs/fundations/",
      sourceType: "broad"
    }),
    "ufli-current": freeze({
      id: "ufli-current",
      program: "UFLI Foundations",
      label: "UFLI Foundations current lesson",
      shortLabel: "UFLI current lesson",
      officialFocus: "Keep the daily UFLI routine cumulative: review, model, blend, spell, read, and transfer.",
      supportMove: "Correct at the sound or pattern level, then reread immediately.",
      assessmentPoint: "Weekly encoding / concept check",
      assessmentDetail: "Use dictated words and concept-based checks to measure whether the current pattern is stable.",
      progressMonitoring: "Track encoding accuracy and transfer into a phrase or short sentence.",
      progressDataNote: "Log the concept check or dictation result, the target pattern, and whether the student transferred it into phrase or sentence work.",
      sourceUrl: "https://ufli.education.ufl.edu/foundations/",
      sourceType: "broad"
    }),
    "bridges-place-value-cycle": freeze({
      id: "bridges-place-value-cycle",
      program: "Bridges Intervention",
      label: "Bridges Intervention current cycle",
      shortLabel: "Bridges Intervention current cycle",
      officialFocus: "Use the current intervention cycle for place-value reasoning in multi-step addition and subtraction.",
      supportMove: "Anchor the work in one representation before moving to the equation.",
      assessmentPoint: "Placement / progress monitoring",
      assessmentDetail: "Use the current Bridges intervention monitoring task to check model use and equation accuracy.",
      progressMonitoring: "Track whether the student selects a representation that matches the quantities and operation.",
      progressDataNote: "Log the current monitoring task, the model chosen, equation accuracy, and whether the student explained why the representation fit.",
      sourceType: "broad"
    }),
    "bridges-multistep-cycle": freeze({
      id: "bridges-multistep-cycle",
      program: "Bridges Intervention",
      label: "Bridges Intervention current cycle",
      shortLabel: "Bridges Intervention current cycle",
      officialFocus: "Use the current intervention cycle to represent multi-step problems with equations and models.",
      supportMove: "Have the student explain which operation matches each quantity before solving.",
      assessmentPoint: "Placement / progress monitoring",
      assessmentDetail: "Use current-cycle monitoring to check model selection, equation writing, and explanation of operation choice.",
      progressMonitoring: "Track whether the student can choose an operation and defend it with a model.",
      progressDataNote: "Log the current monitoring task, operation choice, model match, and the quality of the student's explanation.",
      sourceType: "broad"
    }),
    "justwords-current": freeze({
      id: "justwords-current",
      program: "Just Words",
      label: "Just Words current unit",
      shortLabel: "Just Words current unit",
      officialFocus: "Use the current Just Words unit for multisyllabic reading, spelling, and transfer into connected text.",
      supportMove: "Keep the target set small, mark the chunks, then transfer into a phrase or sentence.",
      assessmentPoint: "Progress check / dictation",
      assessmentDetail: "Use progress checks and dictation to monitor multisyllabic decoding and spelling transfer.",
      progressMonitoring: "Track accuracy on target words and transfer into connected text.",
      progressDataNote: "Log the progress check, dictation accuracy, and whether the pattern transferred into connected reading or sentence-level writing.",
      sourceUrl: "https://www.wilsonlanguage.com/programs/just-words/",
      sourceType: "broad"
    }),
    "wilson-current-step": freeze({
      id: "wilson-current-step",
      program: "Wilson Reading System",
      label: "Wilson Reading System current step",
      shortLabel: "Wilson current step",
      officialFocus: "Use the current Wilson step for explicit word reading, wordlist charting, and dictation-based mastery.",
      supportMove: "Keep wordlist charting, word reading, and dictation in the same structured sequence.",
      assessmentPoint: "Wordlist charting / dictation",
      assessmentDetail: "Use charting and dictation to determine whether the student is ready to move within the current step.",
      progressMonitoring: "Track wordlist accuracy, dictation accuracy, and carryover into connected reading.",
      progressDataNote: "Log wordlist charting, dictation accuracy, controlled-text reading, and whether the student is ready to stay in or move beyond the current step.",
      sourceUrl: "https://www.wilsonlanguage.com/programs/wilson-reading-system/",
      sourceType: "broad"
    })
  });

  var PROGRAMS = freeze({
    "fishtank-ela": freeze({
      id: "fishtank-ela",
      label: "Fishtank ELA",
      grades: freeze(["K", "1", "2", "3", "4", "5"]),
      assessmentModel: "Pre-unit / mid-unit / end-of-unit",
      supportRule: "Use the anchor text, preteach critical vocabulary, and keep one text-dependent prompt or sentence frame visible during the same classroom task.",
      progressDataNote: "Progress data should name the current Fishtank task and capture reading, discussion, and writing performance on the same classroom assessment or check-in.",
      sourceUrl: "https://www.fishtanklearning.org/curriculum/ela/early-elementary/",
      gradeMap: freeze({
        "K": freeze([
          freeze({ unit: "K-1", title: "Welcome to School", focus: "community, belonging, and narrative comprehension" }),
          freeze({ unit: "K-2", title: "Noticing Patterns in Stories", focus: "story patterns, retelling, and vocabulary" }),
          freeze({ unit: "K-3", title: "Celebrating Fall", focus: "informational text, seasons, and key details" }),
          freeze({ unit: "K-4", title: "Falling in Love with Authors", focus: "author study, characters, and compare-contrast" }),
          freeze({ unit: "K-5", title: "Winter Wonderland", focus: "informational text, seasons, and questions about text" }),
          freeze({ unit: "K-6", title: "What Is Justice?", focus: "civics, fairness, and evidence from text" }),
          freeze({ unit: "K-7", title: "Exploring Life Cycles", focus: "science text, sequence, and domain vocabulary" }),
          freeze({ unit: "K-8", title: "Reduce, Reuse, Recycle", focus: "environmental argument, reasons, and opinion writing" })
        ]),
        "1": freeze([
          freeze({ unit: "1-1", title: "Being a Good Friend", focus: "character, social problem-solving, and narrative response" }),
          freeze({ unit: "1-2", title: "The Seven Continents", focus: "geography vocabulary, main idea, and compare-contrast" }),
          freeze({ unit: "1-3", title: "Folktales Around the World", focus: "theme, retelling, and cultural understanding" }),
          freeze({ unit: "1-4", title: "Amazing Animals", focus: "science text features, domain vocabulary, and comparison" }),
          freeze({ unit: "1-5", title: "Love Makes a Family", focus: "family structures, relationships, and narrative response" }),
          freeze({ unit: "1-6", title: "Inspiring Artists and Musicians", focus: "biography, chronology, and research writing" }),
          freeze({ unit: "1-7", title: "Making Old Stories New", focus: "retelling, story adaptation, and author's choices" }),
          freeze({ unit: "1-8", title: "Movements for Equality", focus: "civics, cause and effect, and opinion writing" }),
          freeze({ unit: "1-9", title: "The Power of Reading", focus: "reading response, recommendations, and narrative talk" }),
          freeze({ unit: "1-10", title: "Ancient Egypt", focus: "history, informational text, and domain vocabulary" })
        ]),
        "2": freeze([
          freeze({ unit: "2-1", title: "Exploring Habitats", focus: "ecosystems, text features, and research writing" }),
          freeze({ unit: "2-2", title: "Awesome Insects", focus: "scientific vocabulary, details, and expository writing" }),
          freeze({ unit: "2-3", title: "Stories of Immigration", focus: "perspective, character, and narrative response" }),
          freeze({ unit: "2-4", title: "People Who Changed the World", focus: "biography, chronology, and main idea" }),
          freeze({ unit: "2-5", title: "Inside the Human Body", focus: "health text, cause and effect, and research writing" }),
          freeze({ unit: "2-6", title: "Tall Tales", focus: "folklore, exaggeration, and narrative writing" }),
          freeze({ unit: "2-7", title: "Weather and Water", focus: "science explanation, text structure, and vocabulary" }),
          freeze({ unit: "2-8", title: "Poems About Us", focus: "poetry, imagery, and opinion response" }),
          freeze({ unit: "2-9", title: "Voting and Elections", focus: "civic vocabulary, reasons, and argument writing" })
        ]),
        "3": freeze([
          freeze({ unit: "3-1", title: "Defining Identity: Dyamonde Daniel and My Name Is Maria Isabel", focus: "identity, belonging, and character analysis", sourceUrl: "https://www.fishtanklearning.org/curriculum/ela/3rd-grade/" }),
          freeze({ unit: "3-2", title: "Rediscovering Thanksgiving: Fact vs. Fiction", focus: "informational reading, Indigenous history, and fact versus fiction", sourceUrl: "https://www.fishtanklearning.org/curriculum/ela/3rd-grade/" }),
          freeze({ unit: "3-3", title: "Passing Down Wisdom: Indigenous, Hispanic, and African American Traditional Stories", focus: "traditional stories, theme, and retelling with evidence", sourceUrl: "https://www.fishtanklearning.org/curriculum/ela/3rd-grade/" }),
          freeze({ unit: "3-4", title: "Understanding the Animal Kingdom", focus: "science text, key details, and text evidence", sourceUrl: "https://www.fishtanklearning.org/curriculum/ela/3rd-grade/" }),
          freeze({ unit: "3-5", title: "Embracing Difference: The Hundred Dresses and Garvey's Choice", focus: "acceptance, central message, and literary response", sourceUrl: "https://www.fishtanklearning.org/curriculum/ela/3rd-grade/" })
        ]),
        "4": freeze([
          freeze({ unit: "4-1", title: "Finding Fortune: Where the Mountain Meets the Moon", focus: "identity, values, beliefs, and literary analysis", sourceUrl: "https://www.fishtanklearning.org/curriculum/ela/4th-grade/" }),
          freeze({ unit: "4-2", title: "Preparing for the Worst: Natural Disasters", focus: "science knowledge, explanation, and informational reading", sourceUrl: "https://www.fishtanklearning.org/curriculum/ela/4th-grade/" }),
          freeze({ unit: "4-3", title: "Interpreting Perspectives: Greek Myths", focus: "mythology, perspective, and literary analysis", sourceUrl: "https://www.fishtanklearning.org/curriculum/ela/4th-grade/" }),
          freeze({ unit: "4-4", title: "Believing in Yourself: The Wild Book", focus: "learning differences, self-image, and character analysis", sourceUrl: "https://www.fishtanklearning.org/curriculum/ela/4th-grade/" }),
          freeze({ unit: "4-5", title: "Heart and Soul: The Story of America and African Americans", focus: "history, equality, and informational synthesis", sourceUrl: "https://www.fishtanklearning.org/curriculum/ela/4th-grade/" })
        ]),
        "5": freeze([
          freeze({ unit: "5-1", title: "Building Community: Seedfolks", focus: "community, multiple perspectives, and theme", sourceUrl: "https://www.fishtanklearning.org/curriculum/ela/5th-grade/" }),
          freeze({ unit: "5-2", title: "Exploring Human Rights: The Breadwinner", focus: "human rights, historical context, and literary analysis", sourceUrl: "https://www.fishtanklearning.org/curriculum/ela/5th-grade/" }),
          freeze({ unit: "5-3", title: "Protecting the Earth", focus: "plastic pollution, argument, and research", sourceUrl: "https://www.fishtanklearning.org/curriculum/ela/5th-grade/" }),
          freeze({ unit: "5-4", title: "Young Heroes: Children of the Civil Rights Movement", focus: "civil rights, multiple accounts, and informational analysis", sourceUrl: "https://www.fishtanklearning.org/curriculum/ela/5th-grade/" }),
          freeze({ unit: "5-5", title: "Friendship Across Boundaries: Return to Sender", focus: "immigration, stereotypes, and multiple perspectives", sourceUrl: "https://www.fishtanklearning.org/curriculum/ela/5th-grade/" })
        ])
      }),
      sourceType: "mixed"
    }),
    "el-education": freeze({
      id: "el-education",
      label: "EL Education",
      grades: freeze(["6", "7", "8"]),
      assessmentModel: "Mid-unit / end-of-unit / performance task",
      supportRule: "Preview the critical vocabulary and note-catcher first, then keep the writing target and one model response visible during the same classroom task.",
      progressDataNote: "Progress data should name the EL assessment point and capture note-catcher completion, evidence use, and writing independence.",
      sourceUrl: "https://curriculum.eleducation.org/",
      sourceType: "verified"
    }),
    "fundations": freeze({
      id: "fundations",
      label: "Fundations",
      grades: freeze(["K", "1", "2", "3"]),
      assessmentModel: "Diagnostic check / Unit test / Dictation",
      supportRule: "Keep the oral routine, mark-up, reading, spelling, and dictation tightly sequenced so students transfer the pattern instead of naming it only.",
      progressDataNote: "Progress data should name the Fundations check used and capture reading, dictation, and transfer accuracy for the target pattern.",
      sourceUrl: "https://www.wilsonlanguage.com/programs/fundations/",
      levels: freeze([
        freeze({ level: "K", units: freeze([
          freeze({ unit: "1", weeks: "12", swbat: "Match letters to sounds and read or build simple CVC words.", focus: "letter-sound knowledge, phonemic awareness, and early CVC transfer", sourceType: "broad" }),
          freeze({ unit: "2", weeks: "4", swbat: "Use the current taught sound-spelling patterns in reading and dictated words.", focus: "continued letter-sound and early word transfer", sourceType: "broad" }),
          freeze({ unit: "3", weeks: "6", swbat: "Use the current taught sound-spelling patterns in reading and dictated words.", focus: "continued letter-sound and CVC transfer", sourceType: "broad" }),
          freeze({ unit: "4", weeks: "4", swbat: "Use the current taught sound-spelling patterns in reading and dictated words.", focus: "continued phonics transfer into words and sentences", sourceType: "broad" }),
          freeze({ unit: "5", weeks: "6", swbat: "Use the current taught sound-spelling patterns in reading and dictated words.", focus: "continued phonics transfer into words and sentences", sourceType: "broad" })
        ]) }),
        freeze({ level: "1", units: freeze([
          freeze({ unit: "1", weeks: "2-3", swbat: "Read and spell words with the current taught short-vowel and consonant patterns.", focus: "short vowels, consonants, and routine transfer", sourceType: "broad" }),
          freeze({ unit: "2", weeks: "2-4", swbat: "Read and spell words with the current taught short-vowel and consonant patterns.", focus: "continued short-vowel decoding and encoding", sourceType: "broad" }),
          freeze({ unit: "3", weeks: "2", swbat: "Read and spell words with the current taught short-vowel and consonant patterns.", focus: "continued short-vowel decoding and encoding", sourceType: "broad" }),
          freeze({ unit: "4", weeks: "2", swbat: "Read and spell words with the current taught short-vowel and consonant patterns.", focus: "continued decoding, trick words, and sentence transfer", sourceType: "broad" }),
          freeze({ unit: "5", weeks: "1", swbat: "Read and spell words with the current taught short-vowel and consonant patterns.", focus: "continued decoding and transfer", sourceType: "broad" }),
          freeze({ unit: "6", weeks: "3", swbat: "Read and spell words with the current taught short-vowel and consonant patterns.", focus: "continued decoding and transfer", sourceType: "broad" }),
          freeze({ unit: "7", weeks: "3", swbat: "Read and spell words with the current taught short-vowel and consonant patterns.", focus: "continued decoding and transfer", sourceType: "broad" }),
          freeze({ unit: "8", weeks: "2", swbat: "Read and spell words with the current taught blends or digraph patterns.", focus: "blends, digraphs, and connected-text transfer", sourceType: "broad" }),
          freeze({ unit: "9", weeks: "2", swbat: "Read and spell words with the current taught patterns in dictation and text.", focus: "continued pattern work and dictation transfer", sourceType: "broad" }),
          freeze({ unit: "10", weeks: "3", swbat: "Read and spell words with the current taught patterns in dictation and text.", focus: "continued pattern work and dictation transfer", sourceType: "broad" }),
          freeze({ unit: "11", weeks: "3", swbat: "Read and spell words with the current taught patterns in dictation and text.", focus: "continued pattern work and dictation transfer", sourceType: "broad" }),
          freeze({ unit: "12", weeks: "3", swbat: "Read and spell words with the current taught patterns in dictation and text.", focus: "continued pattern work and dictation transfer", sourceType: "broad" }),
          freeze({ unit: "13", weeks: "3", swbat: "Read and spell words with the current taught patterns in dictation and text.", focus: "continued pattern work and dictation transfer", sourceType: "broad" }),
          freeze({ unit: "14", weeks: "2", swbat: "Read and spell words with the current taught patterns in dictation and text.", focus: "continued pattern work and dictation transfer", sourceType: "broad" })
        ]) }),
        freeze({ level: "2", units: freeze([
          freeze({ unit: "1", weeks: "2", swbat: "Use the current taught pattern in reading, spelling, and dictated sentences.", focus: "level 2 sequence, decoding, encoding, and transfer", sourceType: "broad" }),
          freeze({ unit: "2", weeks: "2", swbat: "Use the current taught pattern in reading, spelling, and dictated sentences.", focus: "level 2 sequence, decoding, encoding, and transfer", sourceType: "broad" }),
          freeze({ unit: "3", weeks: "1", swbat: "Use the current taught pattern in reading, spelling, and dictated sentences.", focus: "level 2 sequence, decoding, encoding, and transfer", sourceType: "broad" }),
          freeze({ unit: "4", weeks: "2", swbat: "Use the current taught pattern in reading, spelling, and dictated sentences.", focus: "level 2 sequence, decoding, encoding, and transfer", sourceType: "broad" }),
          freeze({ unit: "5", weeks: "2", swbat: "Use the current taught pattern in reading, spelling, and dictated sentences.", focus: "level 2 sequence, decoding, encoding, and transfer", sourceType: "broad" }),
          freeze({ unit: "6", weeks: "2", swbat: "Use the current taught pattern in reading, spelling, and dictated sentences.", focus: "level 2 sequence, decoding, encoding, and transfer", sourceType: "broad" }),
          freeze({ unit: "7", weeks: "3", swbat: "Use the current taught pattern in reading, spelling, and dictated sentences.", focus: "level 2 sequence, decoding, encoding, and transfer", sourceType: "broad" }),
          freeze({ unit: "8", weeks: "1", swbat: "Read and spell r-controlled syllable words, including ar and or, in dictation and connected text.", focus: "r-controlled syllables, ar/or, decoding, encoding, and dictation transfer", sourceType: "verified" }),
          freeze({ unit: "9", weeks: "2", swbat: "Use the current taught pattern in reading, spelling, and dictated sentences.", focus: "level 2 sequence, decoding, encoding, and transfer", sourceType: "broad" }),
          freeze({ unit: "10", weeks: "2", swbat: "Use the current taught pattern in reading, spelling, and dictated sentences.", focus: "level 2 sequence, decoding, encoding, and transfer", sourceType: "broad" }),
          freeze({ unit: "11", weeks: "2", swbat: "Use the current taught pattern in reading, spelling, and dictated sentences.", focus: "level 2 sequence, decoding, encoding, and transfer", sourceType: "broad" }),
          freeze({ unit: "12", weeks: "1", swbat: "Use the current taught pattern in reading, spelling, and dictated sentences.", focus: "level 2 sequence, decoding, encoding, and transfer", sourceType: "broad" }),
          freeze({ unit: "13", weeks: "3", swbat: "Use the current taught pattern in reading, spelling, and dictated sentences.", focus: "level 2 sequence, decoding, encoding, and transfer", sourceType: "broad" }),
          freeze({ unit: "14", weeks: "2", swbat: "Use the current taught pattern in reading, spelling, and dictated sentences.", focus: "level 2 sequence, decoding, encoding, and transfer", sourceType: "broad" }),
          freeze({ unit: "15", weeks: "2", swbat: "Use the current taught pattern in reading, spelling, and dictated sentences.", focus: "level 2 sequence, decoding, encoding, and transfer", sourceType: "broad" }),
          freeze({ unit: "16", weeks: "1", swbat: "Use the current taught pattern in reading, spelling, and dictated sentences.", focus: "level 2 sequence, decoding, encoding, and transfer", sourceType: "broad" }),
          freeze({ unit: "17", weeks: "2", swbat: "Use the current taught pattern in reading, spelling, and dictated sentences.", focus: "level 2 sequence, decoding, encoding, and transfer", sourceType: "broad" })
        ]) }),
        freeze({ level: "3", units: freeze([
          freeze({ unit: "1", weeks: "2", swbat: "Use the current taught pattern or morpheme in reading, spelling, and dictation.", focus: "advanced patterns, morphology, and dictation transfer", sourceType: "broad" }),
          freeze({ unit: "2", weeks: "3", swbat: "Use the current taught pattern or morpheme in reading, spelling, and dictation.", focus: "advanced patterns, morphology, and dictation transfer", sourceType: "broad" }),
          freeze({ unit: "3", weeks: "1", swbat: "Use the current taught pattern or morpheme in reading, spelling, and dictation.", focus: "advanced patterns, morphology, and dictation transfer", sourceType: "broad" }),
          freeze({ unit: "4", weeks: "2", swbat: "Use the current taught pattern or morpheme in reading, spelling, and dictation.", focus: "advanced patterns, morphology, and dictation transfer", sourceType: "broad" }),
          freeze({ unit: "5", weeks: "2", swbat: "Use the current taught pattern or morpheme in reading, spelling, and dictation.", focus: "advanced patterns, morphology, and dictation transfer", sourceType: "broad" }),
          freeze({ unit: "6", weeks: "3", swbat: "Use the current taught pattern or morpheme in reading, spelling, and dictation.", focus: "advanced patterns, morphology, and dictation transfer", sourceType: "broad" }),
          freeze({ unit: "bonus", weeks: "2", swbat: "Apply the bonus-unit pattern or morpheme in reading, spelling, and dictation.", focus: "bonus-unit review and transfer", sourceType: "broad" }),
          freeze({ unit: "7", weeks: "2", swbat: "Use the current taught pattern or morpheme in reading, spelling, and dictation.", focus: "advanced patterns, morphology, and dictation transfer", sourceType: "broad" }),
          freeze({ unit: "8", weeks: "3", swbat: "Use the current taught pattern or morpheme in reading, spelling, and dictation.", focus: "advanced patterns, morphology, and dictation transfer", sourceType: "broad" }),
          freeze({ unit: "9", weeks: "3", swbat: "Use the current taught pattern or morpheme in reading, spelling, and dictation.", focus: "advanced patterns, morphology, and dictation transfer", sourceType: "broad" }),
          freeze({ unit: "10", weeks: "3", swbat: "Use the current taught pattern or morpheme in reading, spelling, and dictation.", focus: "advanced patterns, morphology, and dictation transfer", sourceType: "broad" }),
          freeze({ unit: "11", weeks: "2", swbat: "Use the current taught pattern or morpheme in reading, spelling, and dictation.", focus: "advanced patterns, morphology, and dictation transfer", sourceType: "broad" }),
          freeze({ unit: "12", weeks: "2", swbat: "Use the current taught pattern or morpheme in reading, spelling, and dictation.", focus: "advanced patterns, morphology, and dictation transfer", sourceType: "broad" }),
          freeze({ unit: "13", weeks: "2", swbat: "Use the current taught pattern or morpheme in reading, spelling, and dictation.", focus: "advanced patterns, morphology, and dictation transfer", sourceType: "broad" }),
          freeze({ unit: "14", weeks: "2", swbat: "Use the current taught pattern or morpheme in reading, spelling, and dictation.", focus: "advanced patterns, morphology, and dictation transfer", sourceType: "broad" })
        ]) })
      ]),
      sourceType: "mixed"
    }),
    "illustrative-math": freeze({
      id: "illustrative-math",
      label: "Illustrative Math K-5",
      grades: freeze(["K", "1", "2", "3", "4", "5"]),
      assessmentModel: "Cool-down / section checkpoint / end-of-unit",
      supportRule: "Use the visual model, lesson language, and cool-down together. Ask students to show the quantity or relationship before naming it abstractly.",
      progressDataNote: "Progress data should name the IM cool-down or checkpoint and capture model use, explanation strength, and independence.",
      sourceUrl: "https://im.kendallhunt.com/k5/curriculum.html",
      gradeMap: freeze({
        "K": freeze([
          freeze({ unit: "1", title: "Math in Our World", focus: "explore tools, recognize quantities, and count collections" }),
          freeze({ unit: "2", title: "Numbers 1-10", focus: "count, compare, and connect quantities and numerals" }),
          freeze({ unit: "3", title: "Flat Shapes All Around Us", focus: "explore and make shapes in the environment" }),
          freeze({ unit: "4", title: "Understanding Addition and Subtraction", focus: "count to add and subtract and solve story problems within 10" }),
          freeze({ unit: "5", title: "Composing and Decomposing Numbers to 10", focus: "make and break apart numbers and solve more story problems" }),
          freeze({ unit: "6", title: "Numbers 0-20", focus: "count and represent teen numbers as 10 and some more" }),
          freeze({ unit: "7", title: "Solid Shapes All Around Us", focus: "describe, compare, and create solid shapes" }),
          freeze({ unit: "8", title: "Putting It All Together", focus: "fluency within 5, all about 10, and counting/comparing review" })
        ]),
        "1": freeze([
          freeze({ unit: "1", title: "Adding, Subtracting, and Working with Data", focus: "add and subtract within 10 and interpret categorical data" }),
          freeze({ unit: "2", title: "Addition and Subtraction Story Problems", focus: "solve add-to, take-from, and compare story problems" }),
          freeze({ unit: "3", title: "Adding and Subtracting Within 20", focus: "develop fluency and use ten as a unit" }),
          freeze({ unit: "4", title: "Numbers to 99", focus: "tens and ones, compare numbers, and compose numbers" }),
          freeze({ unit: "5", title: "Adding Within 100", focus: "use place value and make-a-ten strategies within 100" }),
          freeze({ unit: "6", title: "Length Measurements Within 120 Units", focus: "measure length, count to 120, and solve story problems" }),
          freeze({ unit: "7", title: "Geometry and Time", focus: "flat and solid shapes, halves/quarters, and tell time" }),
          freeze({ unit: "8", title: "Putting It All Together", focus: "review addition, subtraction, story problems, and numbers to 120" })
        ]),
        "2": freeze([
          freeze({ unit: "1", title: "Adding, Subtracting, and Working with Data", focus: "add/subtract within 20 and compare data" }),
          freeze({ unit: "2", title: "Adding and Subtracting within 100", focus: "place-value strategies and story problems within 100" }),
          freeze({ unit: "3", title: "Measuring Length", focus: "metric/customary measurement and line plots" }),
          freeze({ unit: "4", title: "Addition and Subtraction on the Number Line", focus: "use the number line structure to add and subtract" }),
          freeze({ unit: "5", title: "Numbers to 1,000", focus: "the value of three digits and comparing numbers within 1,000" }),
          freeze({ unit: "6", title: "Geometry, Time, and Money", focus: "shape attributes, equal shares, clocks, and money" }),
          freeze({ unit: "7", title: "Adding and Subtracting within 1,000", focus: "place-value strategies for adding and subtracting within 1,000" }),
          freeze({ unit: "8", title: "Equal Groups", focus: "odd/even, arrays, and equal-group reasoning" }),
          freeze({ unit: "9", title: "Putting It All Together", focus: "fluency within 20, measurement, and numbers to 1,000 review" })
        ]),
        "3": freeze([
          freeze({ unit: "1", title: "Introducing Multiplication", focus: "scaled graphs, arrays, and multiplication meaning" }),
          freeze({ unit: "2", title: "Area and Multiplication", focus: "area concepts and finding area with multiplication" }),
          freeze({ unit: "3", title: "Wrapping Up Addition and Subtraction Within 1,000", focus: "add/subtract within 1,000, round, and solve two-step problems" }),
          freeze({ unit: "4", title: "Relating Multiplication to Division", focus: "division meaning and larger-number multiplication/division" }),
          freeze({ unit: "5", title: "Fractions as Numbers", focus: "fractions, number line, equivalent fractions, and comparison" }),
          freeze({ unit: "6", title: "Measuring Length, Time, Liquid Volume, and Weight", focus: "measurement data, weight/liquid volume, and time" }),
          freeze({ unit: "7", title: "Two-dimensional Shapes and Perimeter", focus: "reason with shapes, perimeter, and design" }),
          freeze({ unit: "8", title: "Putting It All Together", focus: "fraction, measurement, and multiplication/division review" })
        ]),
        "4": freeze([
          freeze({ unit: "1", title: "Factors and Multiples", focus: "factor pairs, multiples, and prime/composite reasoning" }),
          freeze({ unit: "2", title: "Fraction Equivalence and Comparison", focus: "size/location of fractions, equivalent fractions, and comparison" }),
          freeze({ unit: "3", title: "Extending Operations to Fractions", focus: "equal groups, fraction addition/subtraction, and tenths/hundredths" }),
          freeze({ unit: "4", title: "From Hundredths to Hundred-thousands", focus: "decimals, place value, compare/order/round, and add/subtract" }),
          freeze({ unit: "5", title: "Multiplicative Comparison and Measurement", focus: "multiplicative comparison, conversion, and measurement problem solving" }),
          freeze({ unit: "6", title: "Multiplying and Dividing Multi-digit Numbers", focus: "patterns, multiplication, division, and problem solving" }),
          freeze({ unit: "7", title: "Angles and Angle Measurement", focus: "points/lines/angles and angle analysis" }),
          freeze({ unit: "8", title: "Properties of Two-dimensional Shapes", focus: "side lengths, angles, lines of symmetry, and attributes" }),
          freeze({ unit: "9", title: "Putting It All Together", focus: "reason with fractions and whole-number operations" })
        ]),
        "5": freeze([
          freeze({ unit: "1", title: "Finding Volume", focus: "unit cubes, expressions for finding volume, and solid figures" }),
          freeze({ unit: "2", title: "Fractions as Quotients and Fraction Multiplication", focus: "fractions as quotients and fractional side lengths" }),
          freeze({ unit: "3", title: "Multiplying and Dividing Fractions", focus: "fraction multiplication, division, and problem solving" }),
          freeze({ unit: "4", title: "Wrapping Up Multiplication and Division with Multi-Digit Numbers", focus: "multi-digit multiplication and division" }),
          freeze({ unit: "5", title: "Place Value Patterns and Decimal Operations", focus: "numbers to thousandths and decimal operations" }),
          freeze({ unit: "6", title: "More Decimal and Fraction Operations", focus: "measurement conversions, powers of 10, and fraction operations" }),
          freeze({ unit: "7", title: "Shapes on the Coordinate Plane", focus: "coordinate plane, hierarchy of shapes, and numerical patterns" }),
          freeze({ unit: "8", title: "Putting It All Together", focus: "volume plus fraction/decimal operations review" })
        ])
      }),
      sourceType: "verified"
    }),
    "wilson-reading-system": freeze({
      id: "wilson-reading-system",
      label: "Wilson Reading System",
      grades: freeze(["2", "3", "4", "5", "6", "7", "8", "9", "10", "11", "12"]),
      assessmentModel: "Wordlist charting / dictation / passage reading",
      supportRule: "Keep sounds, word cards, controlled text, and dictation in the planned Wilson sequence so mastery decisions stay evidence-based.",
      progressDataNote: "Progress data should name the Wilson check and capture wordlist charting, dictation, and controlled-text reading accuracy.",
      sourceUrl: "https://www.wilsonlanguage.com/programs/wilson-reading-system/",
      sourceType: "verified"
    }),
    "just-words": freeze({
      id: "just-words",
      label: "Just Words",
      grades: freeze(["4", "5", "6", "7", "8", "9", "10", "11", "12"]),
      assessmentModel: "Progress check / word reading / spelling dictation",
      supportRule: "Keep the target pattern set small, practice it in connected reading and spelling, and move quickly into sentence-level transfer.",
      progressDataNote: "Progress data should name the Just Words check and capture word reading, spelling dictation, and connected-text transfer.",
      sourceUrl: "https://www.wilsonlanguage.com/programs/just-words/",
      sourceType: "verified"
    }),
    "ufli-foundations": freeze({
      id: "ufli-foundations",
      label: "UFLI Foundations",
      grades: freeze(["K", "1", "2", "3", "4", "5"]),
      assessmentModel: "Daily concept checks / encoding / connected text",
      supportRule: "Run the cumulative routine in order and correct at the pattern level before asking for another independent response.",
      progressDataNote: "Progress data should name the UFLI concept check and capture decoding, encoding, and connected-text transfer.",
      sourceUrl: "https://ufli.education.ufl.edu/foundations/",
      sourceType: "verified"
    }),
    "bridges-intervention": freeze({
      id: "bridges-intervention",
      label: "Bridges Intervention",
      grades: freeze(["K", "1", "2", "3", "4", "5"]),
      assessmentModel: "Placement / ongoing progress monitoring",
      supportRule: "Anchor the work in one representation before moving to the equation. Use the current monitoring task to decide whether the student can explain the quantity and operation choice.",
      progressDataNote: "Progress data should name the Bridges monitoring task and capture representation choice, equation accuracy, and explanation strength.",
      sourceUrl: "https://www.mathlearningcenter.org/curriculum/bridges-intervention",
      cycleMap: freeze({
        "K-2": freeze([
          freeze({ cycle: "Quantity and counting", swbat: "Represent the quantity with one model and explain how the count matches the set.", focus: "counting, quantity, and one-to-one correspondence", sourceType: "broad" }),
          freeze({ cycle: "Addition and subtraction situations", swbat: "Choose a model that matches the situation and solve with support.", focus: "story problem structure and model matching", sourceType: "broad" }),
          freeze({ cycle: "Place value and number composition", swbat: "Show tens and ones with a representation before solving.", focus: "place value reasoning and composition/decomposition", sourceType: "broad" })
        ]),
        "3-5": freeze([
          freeze({ cycle: "Place-value reasoning", swbat: "Use one representation to explain the quantities before writing the equation.", focus: "place value, regrouping, and representation choice", sourceType: "broad" }),
          freeze({ cycle: "Multi-step problem structure", swbat: "Explain which operation matches each quantity before solving.", focus: "operation choice, equation writing, and model use", sourceType: "broad" }),
          freeze({ cycle: "Fraction and measurement support", swbat: "Use a visual model to explain the quantity or comparison before computing.", focus: "fraction/measurement reasoning and explanation", sourceType: "broad" })
        ])
      }),
      sourceType: "broad"
    })
  });

  function getEntry(id) {
    var key = String(id || "");
    return ENTRIES[key] || null;
  }

  function cloneEntry(id) {
    var entry = getEntry(id);
    return entry ? JSON.parse(JSON.stringify(entry)) : null;
  }

  function getProgram(id) {
    var key = String(id || "");
    return PROGRAMS[key] || null;
  }

  function cloneProgram(id) {
    var program = getProgram(id);
    return program ? JSON.parse(JSON.stringify(program)) : null;
  }

  window.CSCurriculumTruth = freeze({
    getEntry: getEntry,
    cloneEntry: cloneEntry,
    getProgram: getProgram,
    cloneProgram: cloneProgram,
    entries: ENTRIES,
    programs: PROGRAMS
  });
})();
