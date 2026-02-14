# Word Quest — Spanish Mode Design & Code Maintenance Guide

## Part 1: Spanish Mode ("Modo Español")

### Why Spanish Mode Is Different from English Mode

Spanish is ~95% phonetically regular — letters almost always make the same sound. So the game shifts from "phonics decoding" to:

1. **Vocabulary building** — learning new Spanish words and their meanings
2. **Accent mark awareness** — knowing WHERE the stress falls (café vs cafe)
3. **Syllable segmentation** — Spanish divides syllables differently than English
4. **False cognate traps** — words that look like English but mean something different
5. **Gender and articles** — el/la, un/una awareness
6. **Fun cultural connections** — idioms, sayings, food, places

### Recommended Spanish Word Categories (500-1000 words)

#### Tier 1: High-Frequency (200 words)
- Common nouns: casa, perro, gato, agua, libro, escuela, amigo, comida, tiempo, familia
- Common verbs: ser, estar, tener, hacer, ir, comer, beber, jugar, leer, escribir
- Common adjectives: grande, pequeño, bonito, feo, rápido, lento, nuevo, viejo, feliz, triste
- Numbers, colors, days, months

#### Tier 2: Thematic Fun (300 words)
- Food: taco, churro, empanada, mango, tortilla, frijoles, arroz, ceviche
- Animals: mariposa, cocodrilo, tortuga, tiburón, delfín, pingüino, murciélago
- School: mochila, lápiz, borrador, tarea, recreo, pizarra, examen
- Sports: gol, cancha, equipo, partido, campeón
- Family: abuela, tío, prima, hermano, sobrino
- Geography: montaña, río, playa, volcán, selva, desierto, isla

#### Tier 3: Fun Discoveries (200-500 words)
- False cognates: embarazada (≠ embarrassed), éxito (≠ exit), librería (≠ library)
- Compound words: rascacielos (skyscraper), sacacorchos (corkscrew), paraguas (umbrella)
- Onomatopoeia: miau, guau, croac, tic-tac, pum
- Idioms as words: madrugador (early riser), cumpleaños (birthday), girasol (sunflower)
- Cultural: piñata, quinceañera, telenovela, siesta, fiesta

### How Spanish Mode Would Differ in the UI

| Feature | English Mode | Spanish Mode |
|---------|-------------|--------------|
| Phonics focus paths | 17 decoding patterns | Syllable types, accent rules, cognates |
| Hint system | Phonics-based | Syllable-based + gender hint (el/la) |
| Audio | English TTS | Spanish TTS (multiple dialects ideally) |
| Reveal modal | English def + Spanish translation | Spanish def + English translation (reversed!) |
| Keyboard | Standard QWERTY | Add ñ, accent buttons (á, é, í, ó, ú, ü) |
| Bonus content | English jokes/facts | Spanish dichos (sayings), cultural facts |
| Tile colors | Green/yellow/gray | Same, but celebrate accent marks with special animation |
| Recording | Practice English pronunciation | Practice Spanish pronunciation + accent placement |

### Implementation Notes
- Spanish mode would need its own `words-es.js` file with Spanish as the primary language
- The existing translation system already handles the reverse direction
- Keyboard would need ñ and accent key additions (or long-press for accents on mobile)
- Could be toggled from the header alongside Classic/Listen & Spell

---

## Part 2: Pronunciation Feedback Feature (Future)

### What's Possible Today (Browser APIs)

The Web Speech API (`SpeechRecognition`) can:
- Convert speech to text in real-time
- Detect confidence scores per word
- Work in multiple languages (including Spanish)

### Proposed "Pronunciation Coach" Feature

#### Level 1: Text Matching (Achievable Now)
1. Student says the word
2. Browser's SpeechRecognition API converts to text
3. Compare recognized text to target word
4. Show: ✅ "Perfect!" / ⚠️ "Close! I heard '[what they said]'" / ❌ "Try again"

```javascript
// Simplified concept
const recognition = new webkitSpeechRecognition();
recognition.lang = 'en-US';
recognition.onresult = (event) => {
    const heard = event.results[0][0].transcript.toLowerCase();
    const target = currentWord.toLowerCase();
    const confidence = event.results[0][0].confidence;
    if (heard === target && confidence > 0.8) {
        showFeedback('perfect');
    } else if (heard.includes(target) || target.includes(heard)) {
        showFeedback('close', heard);
    } else {
        showFeedback('retry', heard);
    }
};
```

#### Level 2: Visual Waveform (Medium Effort)
- Use Web Audio API's `AnalyserNode` to visualize audio in real-time
- Show a simple amplitude waveform while recording
- Side-by-side: "Your pronunciation" waveform vs "Correct" waveform
- Not phoneme-level analysis, but gives visual feedback about rhythm and emphasis

#### Level 3: Phoneme-Level Feedback (Advanced — Would Need External API)
- Services like Azure Speech Assessment API can score:
  - Accuracy (per phoneme)
  - Fluency (smoothness)
  - Prosody (rhythm and stress)
- Returns per-syllable scores and specific mispronounced phonemes
- Cost: ~$1 per 1000 assessments
- Would require a backend proxy (can't call Azure directly from browser)

### Recommendation for Demo
Start with Level 1 (text matching) + a simple waveform visualization. It's impressive visually, works entirely in the browser, and costs nothing. Level 3 can be a "future roadmap" slide.

---

## Part 3: Code Maintenance — Future-Proofing Against Regression

### The Core Problem

Bob's app has gone through many AI agents and sessions. Each one adds CSS/JS to fix problems but doesn't remove the OLD conflicting code. Result: a growing pile of contradictory rules where the last one wins — until something changes the cascade order and everything breaks.

### Rules for All AI Agents (Add to README)

#### Rule 1: Replace, Don't Override
When fixing a CSS rule, find the ORIGINAL rule and change it. Do NOT add a new rule at the bottom with `!important`.

```css
/* BAD — adds override at bottom */
.tile { width: 50px; }
/* ... 500 lines later ... */
.tile { width: 68px !important; }  /* "fixed" */

/* GOOD — replace the original */
.tile { width: 68px; }  /* was 50px, updated for wider tiles */
```

#### Rule 2: One Source of Truth Per Element
Every visual property of an element should be set in ONE place. If you find 3 different rules setting `#game-board`'s width, consolidate them into one.

Before making changes, search: `grep -n "game-board" style.css | grep "width\|max-width"`

#### Rule 3: Comment Your Changes with Build Hash
```css
/* [e9f6a745] Widened tiles for visual balance */
.tile { width: min(76px, calc((100vh - 320px) / 7)); }
```

#### Rule 4: Pre-Flight Checks Before Every Change
```bash
# 1. Count occurrences of the property you're changing
grep -c "selector-you-are-changing" style.css

# 2. If count > 1, consolidate FIRST
# 3. Make your change
# 4. Verify CSS braces balanced
python3 -c "
with open('style.css') as f: css = f.read()
print('Balanced' if css.count('{') == css.count('}') else 'BROKEN')
"

# 5. Verify JS syntax
node -c app.js
```

#### Rule 5: Never Add display:flex to #game-board
It's CSS Grid. This has been broken 3 times by different agents.

#### Rule 6: Never Add `@media (prefers-color-scheme: dark)`
The theme system handles all dark styling. This has been removed twice.

#### Rule 7: Build Stamp Is Sacred
Every deploy MUST update:
- `cs-build-hash` meta tag
- `cs-build-time` meta tag
- `?v=` query strings on all 3 file references

#### Rule 8: Update the README
After every session, add to the changelog what was changed, what broke, and what was learned.

### CSS Consolidation Targets (Current State)

These selectors appear multiple times in style.css and should be consolidated in a future cleanup pass:

```
body.word-quest-page #game-board — 6 occurrences
body.word-quest-page #keyboard — 5 occurrences
body.word-quest-page main — 3 occurrences
body.word-quest-page #game-canvas — 4 occurrences
```

The "corrective fit pass" section (starting ~line 8800) should eventually REPLACE the earlier rules rather than overriding them.

### Recommended Cleanup Session
When Bob has time for a dedicated cleanup (not feature work):
1. For each duplicated selector, merge all properties into ONE rule
2. Delete the duplicates
3. Run visual comparison before/after (screenshot both)
4. Document which lines were merged in the changelog
