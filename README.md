# WORD QUEST — Cornerstone Literacy Platform

**Live URL:** https://bkseatown.github.io/WordQuest/
**Repo:** https://github.com/bkseatown/WordQuest
**Owner:** Bob (bkseatown)
**Purpose:** Educational Wordle-style phonics game for K-8 classrooms, aligned with Science of Reading

---

## Project Vision

"Students think it's a game, teachers know it's instruction, families feel included in their own language."

This is a professional educational technology product being developed for a hiring demo. It must look polished, feel intuitive, and demonstrate pedagogical sophistication. The target users are elementary school teachers projecting the game on a classroom screen, with students playing on individual devices.

### Key Principles
- **Set it and forget it** for teachers — minimal setup, maximum instruction
- **Science of Reading alignment** — 17 phonics focus areas from CVC through multisyllabic
- **Multilingual family inclusion** — 6+ languages (Spanish, Chinese, Hindi, Vietnamese, Tagalog, Arabic, Korean, Japanese)
- **No feature creep** — every feature must serve instruction or accessibility
- **Surgical changes only** — never refactor what's working; make small, reversible changes

---

## Architecture

### Files (GitHub Pages — static site, no build step)

| File | Size | Purpose |
|------|------|---------|
| `index.html` | ~77KB | Full page structure, theme CSS variables, modals |
| `app.js` | ~608KB | ALL game logic, UI, modals, audio, teacher tools |
| `words.js` | ~1.3MB | 500 curated words with translations in 6+ languages |
| `style.css` | ~240KB | ALL styling including 20+ theme palettes |

**No other JS/CSS files are needed.** Previous versions referenced `translations.js`, `delight.js`, `decodables-expansion.js`, `focus-info.js`, `phoneme-data.js`, `young-overrides.js`, `word-quest-stable.css` — these are all consolidated into the 4 files above.

### Audio
- Pre-packed TTS audio lives in a GitHub Release (`audio-v1.0`)
- CDN path: `https://cdn.jsdelivr.net/gh/bkseatown/WordQuest@audio-v1.0/tts/`
- Structure: `tts/{lang}/{word-slug}/{type}.mp3`
- Configured in `app.js` lines ~83-84 (`PACKED_TTS_BASE_PLAIN`, `PACKED_TTS_BASE_SCOPED`)

### Word Data Structure (words.js)
```javascript
const WORDS_DATA = {
  "cough": {
    "pos": "noun",
    "en": { "def": "A bark your throat...", "sentence": "I did a fake cough..." },
    "es": { "def": "Un ladrido que...", "sentence": "Hice una tos falsa..." },
    "zh": { "def": "...", "sentence": "..." },
    // + hi, vi, tl, ar, ko, ja
    "phonics": { "patterns": ["digraph"], "scope_sequence": ["digraph"] }
  }
};
```

The IIFE at the bottom of `words.js` creates `window.WORD_ENTRIES` from `WORDS_DATA`, spreading all properties including translations. `app.js` reads from `WORD_ENTRIES` first, then falls back to `WORDS_DATA` directly.

---

## Current State (Build c7d4f523 — Feb 14, 2026)

### What's Working
- ✅ Core Wordle gameplay (guess word in N tries)
- ✅ 17 phonics focus paths + 4 subject vocabulary categories
- ✅ 20+ visual themes (light + dark)
- ✅ Classic mode (pure deduction) and Listen & Spell mode (audio hints)
- ✅ Word reveal modal with definition, sentence, audio playback
- ✅ Hear Word / Hear Sentence audio buttons
- ✅ Teacher word input (custom words, paste lists, file import)
- ✅ Recording studio for teacher voice
- ✅ Sound Lab (phoneme/articulation guide)
- ✅ Keyboard with vowel highlighting
- ✅ Single-row header: [WORD QUEST] [Path ▾] [Classic|L&S] [New Round] [Tools ▾] ... [Home] [?]
- ✅ Bonus content (jokes, riddles, facts) as separate modal after word reveal
- ✅ 500 words with translations in 6+ languages

### Known Issues Being Debugged

#### TRANSLATION TEXT NOT DISPLAYING (Critical)
- **Symptom:** Language dropdown shows, audio buttons show, but translated definition/sentence text is missing
- **Data verified:** All 500 words have Spanish translations in `WORDS_DATA` → `WORD_ENTRIES`
- **Pipeline verified:** `getTranslationData()` returns correct `{definition, sentence}` in Node.js simulation
- **Suspect:** Either `renderTranslation()` isn't being called, or text elements are invisible due to CSS
- **Debug logging added:** Check browser DevTools console for `[Translation]` messages
- **CSS fix applied:** Explicit styling on `#translated-def`, `#translated-sentence` with `!important` colors

#### DARK THEMES
- Page backgrounds have been lightened from near-black (#1a0a0a) to medium tones (#4a2028 etc.)
- Keys are light cream/white with dark text
- Canvas and keyboard surfaces have reduced opacity
- `@media (prefers-color-scheme: dark)` in style.css still applies system-level dark overrides — this may conflict with the theme system

### What Needs Work
- [ ] Confirm translations display after debug logging
- [ ] Design polish pass — Bob wants "wow factor" for hiring demo
- [ ] Remove console.log debug statements once translation issue is resolved
- [ ] Dead code cleanup in app.js (134 assessment refs, 18 classroom dock refs)
- [ ] Writing Studio component (next phase, based on Step Up to Writing)

---

## Header Layout

Single flex row, no wrapping, no scrolling:
```
[WORD QUEST] [Path ▾] [Classic|L&S] [New Round] [Tools ▾] ----spacer---- [Home] [?]
```

- **Tools** is a button-toggled dropdown (NOT `<details>`) that floats as a white overlay panel
- Tools has 3 tabs: Round Setup, Audio + Theme, Teacher Word
- Teacher word input and Focus Hint checkbox live inside Tools → Round Setup
- Click outside closes the dropdown

---

## Theme System

Themes are CSS custom properties set via `data-wq-scene` attribute on `<body>`:
```css
body.word-quest-page[data-wq-scene="hero-iron"] {
  --wq-page-bg: linear-gradient(...);
  --wq-canvas-surface: ...;
  --wq-key-bg: ...;
  --wq-tile-bg: ...;
  /* etc */
}
```

20+ themes in groups: Pastel, Superhero (Iron/Shield/Spider/Wonder), Vibes (Beach/Coffee/Rose Gold/Slate), Trending (Mocha Mousse, Digital Lavender).

**Dark themes** (hero-*, slate-steel, mocha-mousse) have:
- Medium-tone page backgrounds (not black)
- Light cream/white keys with dark text
- White tiles with soft glow borders
- White text on dark surfaces

**WARNING:** The `@media (prefers-color-scheme: dark)` block in style.css (starting ~line 7616) applies system-level dark overrides that can conflict with the theme CSS variables. Any dark-mode debugging should check both the theme variables AND this media query.

---

## Sizing System (CSS)

All game element sizing uses `vh` (viewport height), not `vw`:
```css
body.word-quest-page #game-board .tile {
  width: min(64px, calc((100vh - 360px) / 7.5)) !important;
  height: min(52px, calc((100vh - 360px) / 9)) !important;
}
```

Overhead constant (360px) accounts for: header (~40px now), audio buttons (~60px), canvas padding (~30px), keyboard (~120px), spacing (~110px).

**Do NOT add vw-based sizing rules** — they cause overflow on wide/short screens.

---

## Translation System

### Data Flow
1. `words.js` → `WORDS_DATA` (raw data with `.en`, `.es`, `.zh` etc.)
2. IIFE → `window.WORD_ENTRIES` (spreads all properties including translations)
3. `getWordCopyForAudience(word, lang)` → returns `{word, definition, sentence}`
4. `getTranslationData(word, lang)` → sanitizes against English, runs kid-safe filters
5. `renderTranslation(lang)` → sets text on `#translated-def`, `#translated-sentence`

### Sanitization Pipeline
- `sanitizeAgainstEnglish()` — strips translations that are identical to English
- `sanitizeRevealText()` — trims to first sentence, truncates, checks kid-safe blocklist
- `cleanAudienceText()` — normalizes quotes and whitespace
- `isYoungAudienceUnsafeText()` — blocks words like "kill", "blood", "weapon"

### Key Functions (app.js)
- `getTranslationData()` — ~line 3947
- `getWordCopyForAudience()` — ~line 9742
- `renderTranslation()` — ~line 8315 (inside `showEndModal`)
- `ensureTranslationElements()` — ~line 7870
- `prepareTranslationSection()` — ~line 7827

---

## Common Pitfalls for AI Agents

1. **Browser caching** — Always update the `cs-build-hash` meta tag AND the `?v=` query strings on CSS/JS links in index.html. Without this, browsers serve stale files.

2. **CSS specificity wars** — Many rules use `body.word-quest-page #element` with `!important`. New rules must match or exceed this specificity. The `@media (prefers-color-scheme: dark)` block overrides many rules.

3. **Don't add vw-based sizing** — Only use vh for vertical layout elements.

4. **Don't use `<details>` for dropdowns in flex rows** — Native `<details>` expands content inline before CSS `position: absolute` takes effect, causing layout shifts. Use button-toggled divs.

5. **Translations are in words.js, not a separate file** — The IIFE spreads `...item` to copy all language keys into `WORD_ENTRIES`.

6. **Test with OS dark mode** — The `prefers-color-scheme: dark` media query applies independently of the theme selector. If Bob's OS is in dark mode, it will override many light-theme styles.

7. **Build stamp** — Located in `index.html` as `<meta name="cs-build-hash">` and `<meta name="cs-build-time">`. UPDATE BOTH plus all `?v=` strings when deploying.

8. **No build step** — This is a plain static site. Upload files directly to GitHub, wait 30 seconds for Pages rebuild, then hard refresh.

9. **Surgical changes** — Bob explicitly wants small, reversible changes. Never delete large code blocks without asking. Never refactor working systems.

10. **Evaluate screenshots** — When Bob shares a screenshot, look at it carefully before responding. Check: colors, spacing, alignment, text visibility, element overflow, scroll behaviors. Don't just acknowledge issues — actually fix them.

---

## Deployment Checklist

1. Update `cs-build-hash` in index.html
2. Update `cs-build-time` in index.html  
3. Update all `?v=` query strings to match new hash
4. Upload all 4 files to GitHub (index.html, style.css, app.js, words.js)
5. Wait ~30 seconds for GitHub Pages rebuild
6. Hard refresh: Ctrl+Shift+R / Cmd+Shift+R
7. Verify build stamp in bottom-right corner matches new hash
8. Test: play a word, check reveal modal, check translations with Spanish selected

---

## Future Roadmap

- **Word bank expansion** — Use Gemini Pro (not Opus) to add more words cost-effectively
- **Writing Studio** — Step Up to Writing principles, separate component
- **Assessment/reporting** — Teacher dashboard for tracking student progress
- **Projector mode** — Large-format display optimized for classroom projection
