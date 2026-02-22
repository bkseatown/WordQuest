/* engagement-boosts.js
   Kid-friendly mid-game boosts.
   Used for guess-3 encouragement popups.
*/
(function initEngagementBoosts() {
  'use strict';

  const jokes = [
    'Why did the pencil look confident? It had a sharp idea.',
    'What do you call a friendly letter? A pen-pal!',
    'Why did the comma break up the sentence? It needed a pause.',
    'What is a bee\'s favorite school subject? Spelling.',
    'Why did the book join the gym? To work on its core story.',
    'What did one vowel say to the other? We make a great pair.',
    'Why was the keyboard so calm? It had all the right keys.',
    'Why did the dictionary smile? It had so many definitions.',
    'What do words wear in winter? Letter jackets.',
    'Why did the student bring a ladder to reading? To reach new levels.',
    'What is a sentence\'s favorite snack? Comma chips.',
    'Why did the notebook win the race? It stayed on track.',
    'What do you call a dinosaur who loves spelling? A thesaurus!',
    'Why did the period feel important? It knew how to end strong.',
    'What is a phonics teacher\'s favorite dance? The sound check.',
    'Why did the word go to art class? To draw attention.',
    'What do silent letters do at parties? They keep it low-key.',
    'Why did the backpack blush? It was full of bright ideas.',
    'What did the letter A say to E? You\'re a real vowel model.',
    'Why did the chalk laugh? It got the board joke.',
    'What did the sentence say after practice? I feel complete.',
    'Why did the eraser feel proud? It helped fix mistakes.',
    'What did the paper say to the pen? You complete me.',
    'Why did the reader wear a cape? To become a word hero.',
    'What do you call a super-fast reader? A page turner.',
    'Why did the student high-five the clue? It finally clicked.',
    'What did the word cloud say? I\'m full of ideas.',
    'Why did the syllable cross the road? To join the next beat.',
    'What is a teacher\'s favorite weather? A brainstorm.',
    'Why did the marker sing? It wanted to hit the highlight.',
    'What did the letter O say? I\'m totally round with joy.',
    'Why did the puzzle love reading? Every piece made sense.',
    'What do rhymes eat for breakfast? Cereal words.',
    'Why did the board game smile? Everyone took turns.',
    'What did the clue whisper? You\'ve got this.',
    'Why was the spelling bee relaxed? It had good buzz control.'
  ];

  const facts = [
    'Reading aloud can improve memory and pronunciation.',
    'Your brain builds stronger pathways each time you practice.',
    'Short breaks can improve focus and accuracy.',
    'Many strong readers chunk words into parts first.',
    'Context clues often reveal meaning before a definition does.',
    'Repeating a new word out loud helps it stick.',
    'Trying different guesses helps pattern recognition grow.',
    'Sleep helps your brain save what you learned today.',
    'Syllables help long words feel easier to decode.',
    'When you self-correct, your learning speed increases.',
    'Letter patterns can unlock many words at once.',
    'Reading with expression boosts comprehension.',
    'Confidence rises when effort is noticed, not just scores.',
    'Mistakes are data that help your brain adjust faster.',
    'A steady pace often beats a rushed pace in reading.',
    'Listening and reading together supports deeper learning.',
    'Phonics and vocabulary work best as a team.',
    'Checking the sentence can help choose the right word.',
    'Practice in short rounds can improve long-term retention.',
    'Visual cues and audio cues together support more learners.',
    'Even one extra attempt can reveal a hidden pattern.',
    'The brain loves repetition with small variation.',
    'Writing a word can strengthen spelling memory.',
    'Good readers still pause and rethink difficult words.',
    'Word games improve attention to letter order.',
    'A growth mindset increases willingness to try hard tasks.',
    'Reading fluency grows through accuracy plus rhythm.',
    'Understanding roots and prefixes can speed up decoding.',
    'Teaching a word to someone else improves your recall.',
    'Curiosity boosts motivation and learning endurance.',
    'Feedback is most useful when it is quick and clear.',
    'Predicting before guessing can reduce random errors.',
    'Repeated exposure helps vocabulary feel familiar.',
    'Encouragement after effort improves persistence.',
    'Pacing matters: calm focus often beats frantic speed.',
    'Celebrating small wins helps keep learning momentum.'
  ];

  const quotes = [
    'Small steps still move you forward.',
    'Progress is built one try at a time.',
    'You are getting better with every round.',
    'Effort today becomes confidence tomorrow.',
    'Try, adjust, and try again.',
    'Learning is practice plus patience.',
    'Strong readers are built, not born overnight.',
    'Keep going. Your brain is training.',
    'You are one strategy away from a breakthrough.',
    'Growth starts where comfort ends.',
    'Your next guess can change everything.',
    'Curiosity is a superpower in learning.',
    'Focus on progress, not perfection.',
    'Consistency beats intensity.',
    'Practice turns confusion into clarity.',
    'You can be both calm and determined.',
    'Every correction is a smart move.',
    'Learning loves brave attempts.',
    'Your effort has real value.',
    'Keep your pace. Keep your power.',
    'Mistakes are part of mastery.',
    'A thoughtful guess is never wasted.',
    'You are building skill in real time.',
    'Confidence grows from action.',
    'Momentum comes from showing up.',
    'One more try often reveals the answer.',
    'Patience is part of performance.',
    'Great learning is active learning.',
    'Your voice matters in your learning journey.',
    'Clarity comes after practice, not before.',
    'You are stronger than one hard word.',
    'Learning is a team-up between effort and strategy.',
    'You are making your future self proud.',
    'Stay curious. Stay steady. Stay kind to yourself.',
    'Practice with purpose changes outcomes.',
    'You are improving, even when it feels slow.'
  ];

  const list = [
    ...jokes.map((text) => ({ type: 'joke', text })),
    ...facts.map((text) => ({ type: 'fact', text })),
    ...quotes.map((text) => ({ type: 'quote', text }))
  ];

  window.WQ_ENGAGEMENT_BOOSTS = Object.freeze(
    list.map((item) => Object.freeze({ type: item.type, text: item.text }))
  );
})();
