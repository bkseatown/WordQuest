# Word Quest — Development Handoff Guide

**Build:** g71208255 | **Date:** 2026-02-16  
**Purpose:** This document is the single source of truth for any AI agent (Claude, ChatGPT, Gemini, Copilot) working on Word Quest. Read it fully before making ANY changes.

---

## 🚨 CRITICAL: DO NOT BREAK THESE (Non-Negotiable Rules)

### 1. File Structure — Do NOT Rename, Split, or Reorganize
```
index.html          ← Single entry point. All HTML lives here.
app.js              ← ALL game logic. Single file. ~15,200 lines.
style.css           ← ALL styles. Single file. ~10,700 lines.
words.js            ← Word bank (5,009 words). Defines WORDS_DATA + exposes window.WORD_ENTRIES.
categories.js       ← Teacher Buckets + Morphology settings. Defines window.TEACHER_BUCKET_LISTS.
word-quest-stable.css ← Legacy stable fallback CSS (loaded before style.css).
focus-info.js       ← Phonics path metadata (external file, loaded separately).
```

**Script load order in index.html (MUST be preserved):**
```html
<script src="words.js" defer></script>
<script src="categories.js" defer></script>
<!-- other external scripts (focus-info.js, etc.) -->
<script src="app.js" defer></script>
```

### 2. Global Variables — Do NOT Change These Names
| Variable | Where | Purpose |
|----------|-------|---------|
| `WORDS_DATA` | words.js | Master word bank object |
| `window.WORD_ENTRIES` | words.js (bottom) | Engine-facing alias for WORDS_DATA |
| `window.TEACHER_BUCKET_LISTS` | categories.js | Teacher bucket word lists |
| `window.FOCUS_INFO` | focus-info.js | Phonics path metadata |
| `CURRICULUM_FOCUS_LISTS` | app.js | Curriculum word pools |
| `currentWord` | app.js | Current active game word |
| `currentEntry` | app.js | Current word's data entry |
| `appSettings` | app.js | All user preferences |

### 3. Color Semantics — NEVER Use These Colors for Decoration
| Color | Meaning | CSS Class |
|-------|---------|-----------|
| **Green** (#22c55e / emerald) | Correct letter, correct position | `.tile.correct`, `.key.correct` |
| **Yellow/Amber** (#eab308) | Correct letter, wrong position | `.tile.present`, `.key.present` |
| **Gray** (#6b7280) | Letter not in word | `.tile.absent`, `.key.absent` |
| **Teal/Cyan** (#06b6d4) | Vowel key highlight (not gameplay) | `.key.vowel` |

⚠️ **Vowels MUST use teal/cyan, NEVER green.** Green vowel keys are confusable with "correct" state. This was a major bug that was fixed — do not revert.

### 4. Theme System — How It Works
- Themes are set via `data-wq-scene` attribute on `<body>`
- Light themes: `default`, `coffeehouse`, `minimal-ink`
- Dark themes: `hero-iron`, `hero-shield`, `hero-spider`, `hero-wonder`, `slate-steel`, `mocha-mousse`, `pro-midnight`, `digital-lavender`, `classic-contrast`
- **Coffeehouse is a LIGHT/WARM theme** — keys need dark text (#4a3728), not white text
- Dark themes get white text on keys with rgba(255,255,255,0.18) background

### 5. No Horizontal Scrolling — EVER
- Tools tabs use `flex-wrap: wrap` — they must NEVER overflow horizontally
- Modals use `max-width: min(520px, calc(100vw - 32px))` — no wider
- All content must fit viewport width without horizontal scroll
- Test on 360px wide viewport minimum

---

## 📋 Architecture Overview

### Word Entry Format (words.js)
```javascript
const WORDS_DATA = {
  "above": {
    "pos": "preposition",
    "en": {
      "def": "Higher than your head, where birds fly.",
      "sentence": "A pigeon flew above me."
    },
    "es": { "word": "arriba", "def": "...", "sentence": "..." },  // Optional translations
    "zh": { ... }, "ar": { ... }, "vi": { ... }, "ko": { ... },
    "phonics": {
      "is_compound": false,
      "is_multisyllabic": true,
      "is_sight_word": false,
      "patterns": ["r-controlled", "schwa"],
      "primary_level": "multisyllabic",
      "scope_sequence": ["r-controlled", "schwa"],
      "syllables": 2,
      "syllable_parts": ["a", "bove"]  // NEW: for syllable dot display
    }
  }
};
```

**Current status:** 5,009 words total. ~500 have full English definitions + sentences + translations (6 languages). ~4,500 have phonics tags but empty def/sentence (to be filled).

### Teacher Bucket System (categories.js)
Dropdown values use `tb:` and `tbfun:` prefixes:
- `tb:classroom_routines` → routes to `window.TEACHER_BUCKET_LISTS.classroom_routines`
- `tbfun:animals` → routes to `window.TEACHER_BUCKET_LISTS.fun_rounds_suggested.animals`

The routing lives in `getPool()` function in app.js (~line 6370).

### Phonics Path System
The `#pattern-select` dropdown drives which words appear. Values map to:
1. Phonics patterns (e.g., `short-a`, `silent-e`, `vowel-teams`) → filter by `entry.phonics.patterns`
2. Curriculum paths (e.g., `vocab-math-k2`) → lookup in `CURRICULUM_FOCUS_LISTS`
3. Teacher buckets (e.g., `tb:sel_language`) → lookup in `TEACHER_BUCKET_LISTS`
4. `all` → unfiltered (any word)

---

## 🎮 Feature Inventory (What Exists and Works)

### Core Gameplay
- ✅ Wordle-style word guessing (1-6 guesses, 3-8 letter words)
- ✅ 17+ phonics path filters
- ✅ Dual mode: Classic (type) + Listen & Spell (audio-first)
- ✅ Hear Word / Hear Sentence buttons with TTS
- ✅ Multi-language translations (es, zh, ar, vi, ko, tl, uk)
- ✅ Teacher Word List (paste, file upload, or single word entry)
- ✅ Per-turn timer (15s - 2min, configurable)

### Onboarding
- ✅ SET-style welcome modal with 2 paths ("I know Wordle" / "Show me")
- ✅ 6-step tutorial with animated tiles
- ✅ "How to Play" replay button (? icon in header)
- ✅ "Don't show again" checkbox

### Arena Mode
- ✅ 4-team scoring (🦊🐺🦉🐻) with treat rewards (🍕🌮🍩🍪)
- ✅ Team rotation with announcements
- ✅ Score persistence during session

### Pronunciation Studio
- ✅ 3-step flow: Listen → Record → Compare
- ✅ Model waveform capture (decodes actual TTS audio file via AudioContext)
- ✅ Live recording visualization (volume-responsive bars)
- ✅ Comparison overlay with side-by-side bars + match % scoring
- ✅ Save to Portfolio (IndexedDB)
- ✅ HiDPI canvases (600×140 internal resolution)

### Mobile
- ✅ Hamburger menu for header overflow
- ✅ Responsive CSS for 360px+ viewports

---

## 🔧 CSS Architecture Rules

### !important Policy
**Current count: ~200.** Down from 781. Remaining ones are REQUIRED for:
- Tile state colors (.correct/.present/.absent) — must override any theme
- Display toggles (show/hide panels)
- Dark theme keyboard overrides

**When adding new CSS:**
1. Use `body.word-quest-page` prefix for specificity (already on `<body>`)
2. For theme-specific: `body.word-quest-page[data-wq-scene="theme-name"]`
3. NEVER add `!important` for padding, margin, font-size, gap, border-radius
4. Only use `!important` for: display toggles, tile/key state colors

### Theme Color Application
```css
/* CORRECT — high specificity, no !important needed */
body.word-quest-page[data-wq-scene="coffeehouse"] .key:not(.correct):not(.present):not(.absent) {
    background: rgba(180, 140, 100, 0.14);
    color: #4a3728;
}

/* WRONG — low specificity, needs !important = technical debt */
.coffeehouse .key {
    background: ... !important;
}
```

### Selector Specificity Hierarchy (highest to lowest)
1. `body.word-quest-page[data-wq-scene="X"] .element.state` — theme + state
2. `body.word-quest-page .element.state` — global state (correct/present/absent)
3. `body.word-quest-page[data-wq-scene="X"] .element` — theme default
4. `body.word-quest-page .element` — global default

---

## 🧪 Pre-Commit Checklist (Run Before Every Deploy)

### Syntax
```bash
node -c app.js          # Must exit 0, no output
```

### Counts (Track These)
```bash
grep -c '!important' style.css      # Should be ≤ 210. Never increase.
grep -c 'alert(' app.js             # Must be 0. Use showToast() instead.
grep -c 'console.log(' app.js       # Must be 0. Use console.warn for real issues.
```

### Visual Spot-Checks (Do These in Browser)
1. **Coffeehouse theme:** Keys must have dark brown text (#4a3728), not white/gray
2. **Slate-steel theme:** Keys must have white text, vowels teal-tinted
3. **Default theme:** Vowel keys show teal border, NOT green
4. **Tools menu:** All 4 tabs visible without horizontal scroll
5. **Welcome modal:** Centered, no right-side whitespace
6. **Mobile (360px):** No horizontal scroll anywhere

### Function Existence (Verify These Survive)
```bash
# These functions MUST exist — they're called from HTML or external scripts
grep -c 'function initTutorial' app.js          # 1
grep -c 'function initArenaPanel' app.js         # 1
grep -c 'function initMobileHamburger' app.js    # 1
grep -c 'function speak(' app.js                 # 1
grep -c 'function startNewRound' app.js          # 1
grep -c 'function showToast' app.js              # 1
grep -c 'function captureModelWaveform' app.js   # 1
```

---

## 🚫 Known Pitfalls (Things That Broke Before)

### 1. "I removed dead code and broke everything"
Some functions LOOK dead but are called from external JS files (phoneme-data.js, delight.js, translations.js, focus-info.js, decodables-expansion.js, young-overrides.js). Before removing ANY function, search for its name across ALL .js files, not just app.js.

### 2. "I improved one theme and broke another"
Theme styles cascade. If you add a rule for `.key` without scoping it to a specific `data-wq-scene`, it affects ALL themes. Always scope theme-specific rules.

### 3. "I added !important to fix a style"
This means your selector specificity is wrong. Instead of adding !important, increase specificity by adding `body.word-quest-page` prefix or the `[data-wq-scene]` attribute.

### 4. "I split CSS into multiple files"
DON'T. The app is designed as a single-page app with a single CSS file. Splitting creates load-order race conditions and makes theme specificity unpredictable. The correct approach is to organize SECTIONS within style.css using comments.

### 5. "I reorganized the HTML structure"
Many CSS selectors depend on specific DOM nesting. Moving elements breaks selectors. The `#keyboard`, `#game-board`, `#modal-overlay`, and `.header-row` structures are load-bearing.

### 6. "I changed WORDS_DATA to a different variable name"
Both `WORDS_DATA` (const) and `window.WORD_ENTRIES` (global) must exist. app.js references `window.WORD_ENTRIES`. If you change one, the game silently has zero words.

### 7. "Green vowels looked fine to me"
Green = correct answer in Wordle. Vowel highlights must be TEAL (#06b6d4), never green (#22c55e). Students will think vowel keys are already "correct" answers.

---

## 📝 Word Bank Expansion Guide

### Adding Definitions and Sentences
Words with empty `en.def` and `en.sentence` need content. Format:
```javascript
"example": {
    "pos": "noun",
    "en": {
        "def": "Something shown to explain or demonstrate.",  // K-5 friendly, 8-15 words
        "sentence": "Can you give me an example of a compound word?"  // Uses the word naturally
    }
}
```

**Definition style:** Playful but accurate. Written for a student, not a dictionary. 8-15 words.  
**Sentence style:** Natural context that helps decode meaning. Always uses the target word.

### Adding Translations
```javascript
"es": { "word": "ejemplo", "def": "Algo que se muestra para explicar.", "sentence": "¿Puedes darme un ejemplo?" }
```
Supported languages: `es` (Spanish), `zh` (Chinese), `ar` (Arabic), `vi` (Vietnamese), `ko` (Korean), `tl` (Tagalog), `uk` (Ukrainian)

### Phonics Tags
The `phonics.patterns` array drives path filtering. Valid values:
```
short-a, short-e, short-i, short-o, short-u,
long-a, long-e, long-i, long-o, long-u,
silent-e, vowel-teams, r-controlled, consonant-digraphs,
initial-blends, final-blends, diphthongs, schwa,
multisyllable, compound, sight-word
```

### Adding New Teacher Buckets
In categories.js, add to `window.TEACHER_BUCKET_LISTS`:
```javascript
"new_bucket_name": ["word1", "word2", "word3"]
```
Then add a `<option>` in index.html's `#pattern-select`:
```html
<option value="tb:new_bucket_name">Display Name</option>
```
And add the title mapping in app.js `getFocusTitle()` function.

---

## 🔊 Audio / TTS Architecture

### Playback Priority (speak() function, ~line 3400)
1. **Teacher recording** (IndexedDB, key: `word_word`) — highest priority
2. **Packed TTS** (pre-recorded .mp3 from GitHub CDN) — primary for most words
3. **System SpeechSynthesis** — fallback only, requires `allowSystemFallback: true`

### CDN Path
```
https://raw.githubusercontent.com/bkseatown/Cornerstone-MTSS/main/literacy-platform/audio/tts/
```
Packed clips follow: `packs/{packId}/{lang}/{type}/{word}.mp3`

### Pronunciation Studio Waveform Capture
When `speak()` plays a packed TTS clip, it stores the URL in `window._wqLastPlayedAudioUrl`. The pronunciation studio fetches that URL, decodes via `AudioContext.decodeAudioData()`, and extracts amplitude data for visualization. This only works for packed clips (not SpeechSynthesis).

---

## 📐 Layout Constraints

### No-Scroll Philosophy
The game should fit on screen without scrolling. Priority:
1. Game board (tiles) — MUST be visible
2. Keyboard — MUST be visible and usable
3. Header controls — visible, can compress via hamburger
4. Audio buttons — visible below board
5. Sentence text / hints — can be below fold on small screens

### Modal Sizing
```css
/* Welcome modal */
width: min(520px, calc(100vw - 32px));

/* Game reveal modal */
max-width: min(580px, calc(100vw - 24px));

/* Tools dropdown */
max-height: 60vh;  /* scrollable content area */
```

### Tools Tabs
Must `flex-wrap: wrap` — never horizontal overflow. If 4+ tabs, they wrap to second row. Font size: 0.72rem. No minimum width enforcement.

---

## 🏗️ Build / Deploy

### Build Stamp
In index.html, update the build ID:
```html
<meta name="cs-build-hash" content="BUILD_ID_HERE">
```
And the footer shows: `Build: {hash} | {date}`

### File Sizes (Expected Ranges)
| File | Lines | Bytes | Notes |
|------|-------|-------|-------|
| app.js | 15,000-15,500 | ~620KB | Should NOT grow beyond 16,000 lines |
| style.css | 10,500-11,000 | ~340KB | !important count ≤ 210 |
| index.html | 1,600-1,700 | ~65KB | Minimal changes expected |
| words.js | ~160,000 | ~3.4MB | Will grow as defs/translations added |
| categories.js | ~350 | ~6KB | Teacher buckets + morphology settings |

---

## 🔮 Planned Next Steps (Not Yet Implemented)

1. **Word bank enrichment:** Fill empty en.def + en.sentence for ~4,500 words
2. **Translation expansion:** Add es/zh/ar/vi/ko translations for new words
3. **Azure TTS audio generation:** Record Ava prosody clips for new words
4. **Inflection Mode:** Toggle for -s/-es, -ed, -ing practice (categories.js has settings)
5. **Syllable dot display:** Use `phonics.syllable_parts` to show `in·ter·est` on tiles
6. **Student progress tracking:** Track words learned, streaks, exportable reports
7. **CSS media query consolidation:** 56 duplicate @media blocks need merging
8. **Landscape side-by-side layout:** Board left, keyboard right on phone landscape

---

## ⚙️ Quick Reference: Key Functions

| Function | Line | Purpose |
|----------|------|---------|
| `startNewRound()` | ~6300 | Core: picks word, resets board |
| `getPool()` | ~6370 | Filters word bank by focus/length |
| `speak()` | ~3400 | Plays word audio (teacher → packed → system) |
| `showToast()` | ~900 | Non-blocking notification |
| `applyTheme()` | ~2100 | Applies visual theme |
| `initTutorial()` | ~5200 | Onboarding flow |
| `initArenaPanel()` | ~5800 | 4-team arena setup |
| `initMobileHamburger()` | ~5600 | Mobile menu |
| `captureModelWaveform()` | ~8030 | Pronunciation studio waveform |
| `drawComparisonOverlay()` | ~7930 | Compare model vs student |
| `getFocusTitle()` | ~6350 | Human-readable focus name |
| `playAudioClipUrl()` | ~1335 | Low-level audio player |

---

*Last updated: Build g71208255 — 2026-02-16*
