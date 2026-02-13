# WORD QUEST — Cornerstone Literacy Platform

**Live URL:** https://bkseatown.github.io/WordQuest/
**Repo:** https://github.com/bkseatown/WordQuest
**Owner:** Bob (bkseatown)
**Last Build:** d8e5f634 — Feb 14, 2026

---

## ⚠️ MANDATORY FOR ALL AI AGENTS

**READ THIS ENTIRE FILE BEFORE WRITING ANY CODE.**

Before making changes:
1. Read this README fully — every section exists because of a hard-won lesson
2. Identify the specific root cause — do NOT guess
3. Explain what you'll change and why BEFORE writing code
4. After changes, describe what the user will SEE — pixel-level visual impact
5. Check for visual side effects on nearby elements
6. Update the build stamp AND cache-busting strings (see Deployment section)
7. **UPDATE THIS README** with what you changed, what you learned, and any new known issues

**NEVER delete sections from this README.** Only add, update, or mark items as resolved.

---

## Project Vision

> "Students think it's a game, teachers know it's instruction, families feel included in their own language."

This is a **professional educational technology product** being developed for a hiring committee demo. It must look polished, feel intuitive, and demonstrate pedagogical sophistication.

### Target Users
- **Teachers** projecting the game on a classroom screen
- **Students (K-8)** playing on individual devices (Chromebooks, iPads)
- **Families** who may speak a language other than English at home

### Design Principles
- **Set it and forget it** — teachers shouldn't need to configure anything to get value
- **Science of Reading alignment** — 17 phonics focus areas from CVC through multisyllabic
- **Multilingual family inclusion** — 6+ languages so families feel represented
- **No feature creep** — every feature must serve instruction, accessibility, or delight
- **Surgical changes only** — small, reversible edits; never refactor what's working
- **Always moving forward** — every change should make the app better, never regress

### What "Wow Factor" Means for This App
- Clean, professional visual design (NOT generic AI aesthetics)
- Smooth, intuitive interactions (no scroll traps, no invisible text, no overflow)
- Smart defaults (teacher can open the app and immediately use it)
- Delightful discoveries (mic recording, bonus content, theme customization)
- Pedagogical depth (17 focus areas, multilingual support, phonics intelligence)

---

## Architecture

### Files (GitHub Pages — static site, NO build step)

| File | Purpose | Notes |
|------|---------|-------|
| `index.html` | Page structure, theme CSS variables, all modals | ~77KB |
| `app.js` | ALL game logic, UI, audio, teacher tools | ~608KB |
| `words.js` | 500 curated words + translations (6+ langs) | ~1.3MB |
| `style.css` | ALL styling, 20+ theme palettes | ~240KB |
| `README.md` | This file — project bible for all AI agents | |

**No other JS/CSS files are needed.** Everything is consolidated into these 4 code files.

### Audio CDN
- Pre-packed TTS audio in GitHub Release (`audio-v1.0`)
- CDN: `https://cdn.jsdelivr.net/gh/bkseatown/WordQuest@audio-v1.0/tts/`
- Structure: `tts/{lang}/{word-slug}/{type}.mp3`
- Config: `app.js` lines ~83-84 (`PACKED_TTS_BASE_PLAIN`, `PACKED_TTS_BASE_SCOPED`)

### Word Data Structure (words.js)
```javascript
WORDS_DATA["cough"] = {
  "pos": "noun",
  "en": { "def": "...", "sentence": "..." },
  "es": { "def": "...", "sentence": "..." },
  "zh": { ... }, "hi": { ... }, "vi": { ... }, "tl": { ... },
  "phonics": { "patterns": ["digraph"], "scope_sequence": ["digraph"] }
};
```

The IIFE at the bottom of `words.js` creates `window.WORD_ENTRIES` via `...item` spread (preserving all language keys). `app.js` reads `WORD_ENTRIES` first, falls back to `WORDS_DATA`.

---

## Current Features

### Core Game
- Wordle-style gameplay (guess word in N tries)
- 17 phonics focus paths + 4 subject vocabulary categories (Math, Science, Social Studies, ELA)
- Classic mode (pure deduction) and Listen and Spell mode (audio hints)
- Adjustable word length (3-8) and guess count (1-6)
- 500 curated words aligned with Science of Reading

### Audio and Language
- Hear Word / Hear Sentence audio buttons
- Word reveal modal with definition, sentence, audio playback
- Multilingual translations: Spanish, Chinese, Hindi, Vietnamese, Tagalog, Arabic, Korean, Japanese
- Translation section in reveal modal (toggle "Language + Translation")
- Lock language preference across rounds

### Voice Recording (mic icon on keyboard)
- Tap to record pronunciation (up to 8 seconds)
- Practice panel with: Hear Me, Hear Word, Try Again, Save to Device, Compare
- Compare mode: plays correct pronunciation then your recording back-to-back
- Save recordings to IndexedDB for long-term tracking (beginning-of-year vs end-of-year)
- Panel stays until dismissed (no auto-disappear)
- Students, parents, and teachers can compare growth over time

### Teacher Tools (Tools dropdown)
- Round Setup: word length, guess count, letter case, focus hint toggle
- Teacher word input (custom word, paste list, file import)
- Audio + Theme: voice selection, celebration sounds, 20+ theme palettes
- Recording Studio for teacher voice overlays

### Visual
- 20+ themes in groups: Pastel, Superhero, Vibes, Trending
- Dark themes with medium-tone backgrounds (not black)
- Responsive vh-based sizing (tiles, keys, board)
- Single-row header layout

### Bonus Content
- Jokes, riddles, fun facts, quotes after word reveal
- Shows as separate modal (not inline in reveal)
- Riddle answers hidden behind "Reveal Answer" button
- New game starts only after bonus is dismissed

---

## Layout and Sizing System

### Header
Single flex row, `overflow: visible`, no wrapping:
```
[WORD QUEST] [Path] [Classic|Listen and Spell] [New Round] [Tools] ---spacer--- [Home] [?]
```
- Tools is a **button-toggled div** (NOT `<details>`) with floating white overlay
- Click outside closes the dropdown
- Teacher word + focus hint live inside Tools, Round Setup tab

### Game Board
**CSS Grid** using `--word-length` variable:
```css
grid-template-columns: repeat(var(--word-length), minmax(44px, 1fr));
```
**CRITICAL: NEVER set `display: flex` on #game-board** — it destroys the grid and tiles stack in a single column.

Tile sizing uses `vh` (viewport height), NOT `vw`:
```css
width: min(68px, calc((100vh - 340px) / 7.5));
height: min(58px, calc((100vh - 340px) / 9));
```
Overhead constant (340px) = header + audio buttons + canvas padding + keyboard + spacing.

### Keyboard
Max-width 900px, centered, flex layout with 3 rows plus mic icon.

---

## Theme System

Themes are CSS custom properties on `data-wq-scene` attribute:
```css
body.word-quest-page[data-wq-scene="hero-iron"] {
  --wq-page-bg: ...;  --wq-canvas-surface: ...;
  --wq-key-bg: ...;   --wq-tile-bg: ...;
}
```

Dark themes (hero-*, slate-steel, mocha-mousse): medium-tone backgrounds, light keys, white text.

**System dark mode (`@media prefers-color-scheme: dark`) has been INTENTIONALLY REMOVED.** All dark styling is handled by the theme system. Do NOT re-add a system dark mode media query — it causes invisible text, background conflicts, and hours of debugging.

---

## Translation System

### Data Flow
1. `words.js` has `WORDS_DATA` (raw, with `.en`, `.es`, `.zh` etc.)
2. IIFE creates `window.WORD_ENTRIES` (spreads all properties including translations)
3. `getWordCopyForAudience(word, lang)` returns `{word, definition, sentence}`
4. `getTranslationData(word, lang)` sanitizes against English, runs kid-safe filters
5. `renderTranslation(lang)` sets text on `#translated-def`, `#translated-sentence`

### Debug Logging
Console messages tagged `[Translation]` trace the full chain. Remove once confirmed working.

---

## Common Pitfalls — REQUIRED READING FOR ALL AGENTS

| # | Pitfall | Why It Matters |
|---|---------|----------------|
| 1 | **Browser caching** | ALWAYS update `cs-build-hash`, `cs-build-time`, AND `?v=` strings |
| 2 | **CSS specificity** | Rules use `body.word-quest-page #element` with `!important` |
| 3 | **Never use vw for vertical sizing** | Use vh. vw causes overflow on wide/short screens |
| 4 | **Never use details in flex rows** | Details expands inline before position absolute kicks in |
| 5 | **Never set display flex on game-board** | Board is CSS Grid. Flex destroys it entirely |
| 6 | **System dark mode removed intentionally** | Themes handle dark styling. Do NOT re-add prefers-color-scheme dark |
| 7 | **Translations are in words.js** | Not a separate file. IIFE spreads item to copy language keys |
| 8 | **No build step** | Static site. Upload files, wait 30s, hard refresh |
| 9 | **Surgical changes only** | Never delete large blocks without asking. Never refactor working systems |
| 10 | **Evaluate screenshots carefully** | Check colors, spacing, alignment, text visibility, overflow, scroll |
| 11 | **Describe visual impact before coding** | If you cannot articulate what a CSS change will look like, you are guessing |
| 12 | **Always update this README** | Add what you changed, what broke, what you learned |

---

## Deployment Checklist

1. Update `cs-build-hash` meta tag in index.html
2. Update `cs-build-time` meta tag in index.html
3. Update ALL `?v=` query strings (style.css, app.js, words.js)
4. Upload all 4 code files to GitHub
5. Wait ~30 seconds for GitHub Pages rebuild
6. Hard refresh: Ctrl+Shift+R / Cmd+Shift+R
7. Verify build stamp in bottom-right matches new hash
8. Test: play a word, check reveal modal, check translations
9. **Update this README** with changes made

---

## Future Roadmap

### Near-Term (Hiring Demo Polish)
- Voice recording: "My Recordings" view to review saved recordings over time
- Voice recording: visual feedback (waveform or volume meter while recording)
- Streak tracker: show consecutive correct words
- Confetti or celebration animation on win
- Projector mode: optimized large-format display for classroom screens

### Medium-Term
- Word bank expansion via Gemini Pro (not Opus — conserve token budget)
- Writing Studio component (Step Up to Writing principles)
- Assessment dashboard for teachers
- Student login with progress persistence

### Ideas to Explore (Needs Bob's Approval First)
- Team mode (split class into teams, competitive rounds)
- Word-of-the-day mode
- Parent take-home QR code linking to student word list
- Phonics heatmap showing which patterns a student struggles with

---

## Change Log

### Build d8e5f634 — Feb 14, 2026
- REMOVED 586-line prefers-color-scheme dark block (was fighting theme system)
- REMOVED all force-light CSS and disabled JS function
- FIXED game board: removed display flex that destroyed CSS Grid (tiles in single column)
- FIXED Tools dropdown: changed from details to button-toggled div (prevents header scroll)
- FIXED header overflow: removed overflow-x auto, added overflow visible
- FIXED duplicate ? button (removed HTML one, JS already creates it)
- UPGRADED voice recording: persistent practice panel with Save, Compare, Try Again
- ADDED translation debug logging ([Translation] in console)
- ADDED explicit CSS for translation text elements
- LIGHTENED all 6 dark theme page backgrounds from near-black to medium tones
- Updated README as comprehensive agent handoff document

### Build a3b8d201 — Feb 13, 2026
- Single-row header layout
- Tools dropdown with floating white overlay
- Mic button moved to end of last keyboard row
- Cache-busting query strings on all CSS/JS links

### Earlier builds
- Translations fixed (words.js IIFE spread + WORDS_DATA fallback)
- Audio cancel on modal close
- Bonus content as separate modal after reveal
- Dark theme key and canvas visibility overhaul
- vh-based viewport sizing (replaced vw)
- Removed 6,637 lines of dead CSS code
- 500 curated words with multilingual translations
