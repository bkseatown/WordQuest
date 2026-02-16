# Word Quest — Design Analysis & Implementation Plan
## Build b71144735 → Next Release

---

## 1. PRONUNCIATION STUDIO (Recording Redesign)

### Current Problem
Recording starts immediately with a countdown — confusing. No ability to compare attempts side-by-side.

### Proposed: Mini Recording Studio Modal

When the student taps **"🎙 Practice Saying It"** on the reveal card, a **slide-up mini modal** appears with three zones:

```
┌─────────────────────────────────────┐
│  🎤 Pronunciation Studio    [✕]    │
│                                     │
│  ┌─────────────────────────────┐    │
│  │  🔊 Listen First            │    │  ← Plays Azure TTS
│  │  [▶ Hear the Word]          │    │
│  └─────────────────────────────┘    │
│                                     │
│  ┌─────────────────────────────┐    │
│  │  🎙 Your Turn               │    │
│  │  [● Record]  (tap to start) │    │  ← 5-7s timer, stop anytime
│  │  ═══════════════════        │    │  ← Live waveform bar
│  │  [▶ Play Back]              │    │  ← After recording
│  │  [🔄 Try Again]             │    │  ← Re-record
│  └─────────────────────────────┘    │
│                                     │
│  ┌─────────────────────────────┐    │
│  │  📊 Compare                  │    │
│  │  [▶ Play Both]              │    │  ← TTS then student, back to back
│  │                              │    │
│  │  ┌─────────┐ ┌─────────┐   │    │
│  │  │ ~~~~~~~ │ │ ~~~~~~~ │   │    │  ← Waveform comparison
│  │  │  Model  │ │  Yours  │   │    │
│  │  └─────────┘ └─────────┘   │    │
│  │                              │    │
│  │  [💾 Save to Portfolio]      │    │
│  └─────────────────────────────┘    │
└─────────────────────────────────────┘
```

### Waveform Visualization — How It Works

**Technically feasible using Web Audio API:**

```javascript
// Create AudioContext
const audioCtx = new AudioContext();
const analyser = audioCtx.createAnalyser();
analyser.fftSize = 256;

// Connect microphone to analyser (live recording)
const source = audioCtx.createMediaStreamSource(stream);
source.connect(analyser);

// Draw waveform to canvas
function drawWaveform(canvas, analyser) {
    const ctx = canvas.getContext('2d');
    const data = new Uint8Array(analyser.frequencyBinCount);
    analyser.getByteFrequencyData(data);
    // Draw bars or wave based on frequency data
}
```

**For comparison view:**
1. Record the Azure TTS audio by capturing it through AudioContext
2. Record the student's mic audio
3. Generate amplitude envelope from both
4. Display side-by-side as simplified "mountain range" shapes
5. Color-code: green where peaks match, yellow where close, red where different

**Kid-Friendly Simplification:**
Instead of raw waveforms (confusing for K-5), show:
- **"Sound Mountains"** — smooth, colorful amplitude hills
- **Star Rating** — "Your rhythm matched ⭐⭐⭐ out of 5!"  
- **Simple overlay** — model in blue, student in orange, overlap in green
- **Not scored harshly** — always encouraging, focus on "getting closer"

### Implementation Effort: Medium-High (2-3 sessions)
- Web Audio API for live waveform: 1 session
- Canvas rendering + comparison view: 1 session  
- Polish + save to portfolio: 0.5 session

---

## 2. MIDDLE AREA DECLUTTER

### Current Problem
Between game board and keyboard, 4 rows appear when all features are active:
1. `🔊 Hear Word` + `💬 Hear Sentence` buttons
2. `☑️ Sentence text` checkbox
3. `"We sat in a circle so everyone could see the puppy."` sentence
4. `Hide caption ×` button

This pushes the board above the gradient transition line.

### Fix: Collapsed Single-Row Design

```
┌──────────────────────────────────────┐
│  🔊 Word   💬 Sentence  📝 Show Text │  ← All in one compact row
└──────────────────────────────────────┘
  "We sat in a circle..."               ← Only visible when toggled
```

**Specific Changes:**
- Merge "Hear Word", "Hear Sentence", and "Sentence text" toggle into ONE flex row
- Remove "Hide caption ×" button — the checkbox toggle handles show/hide
- Reduce vertical margins to 2px
- Sentence text gets `max-height: 2.5em; overflow: hidden` to prevent tall sentences
- On mobile, sentence text uses smaller font (0.72rem)

### Implementation: Quick CSS + minor JS (~30 min)

---

## 3. MOBILE RESPONSIVE OVERHAUL

### Current Problems on Samsung Phone
1. **Header causes horizontal scroll** — too many items in one row
2. **Portrait mode** — too much vertical space between board and keyboard
3. **Landscape mode** — tiles too small
4. **Swiping to see controls** — unacceptable UX

### Proposed: Three-Tier Responsive Strategy

#### Tier 1: Desktop (>820px)
- Current layout, no changes needed
- Full toolbar visible

#### Tier 2: Tablet/iPad (520px–820px)
- Header collapses: WORD QUEST title + hamburger menu
- Pattern selector moves inside hamburger menu
- Board fills available width
- Keyboard keys slightly smaller

#### Tier 3: Phone (<520px)

**Portrait:**
```
┌────────────────────────┐
│ WORD QUEST    ☰   🎮   │  ← Minimal header
│ Hint: CVC (short vow…) │  ← Truncated hint
├────────────────────────┤
│                        │
│   ┌──┬──┬──┬──┬──┐    │
│   │  │  │  │  │  │    │  ← Board uses ~85% width
│   ├──┼──┼──┼──┼──┤    │
│   │  │  │  │  │  │    │
│   ├──┼──┼──┼──┼──┤    │
│   │  │  │  │  │  │    │
│   └──┴──┴──┴──┴──┘    │
│                        │
│  🔊  💬  📝            │  ← Icon-only buttons
│                        │
│ ┌──────────────────┐   │
│ │ q w e r t y u i  │   │  ← Full-width keyboard
│ │  a s d f g h j k │   │
│ │ ⌫ z x c v b n m ⏎│   │
│ └──────────────────┘   │
└────────────────────────┘
```

**Key Design Decisions:**
- Header items (path selector, tools, audio toggle) move to a **hamburger/gear menu**
- Only show: title, ☰ menu, New Round button
- Hint text truncates with `...` on mobile
- Audio buttons become icon-only (no text labels)
- "Sentence text" toggle hidden by default on mobile (accessible via menu)
- Board padding reduced, tile gap reduced to 4px
- Keyboard rows go full-width with minimal side padding

**Landscape Phone:**
```
┌──────────────────────────────────────────┐
│ WQ  Hint: CVC   ☰  🔊💬  New Round  🎮  │
├────────────────────┬─────────────────────┤
│  ┌──┬──┬──┬──┬──┐ │  q w e r t y u i o │
│  │  │  │  │  │  │ │   a s d f g h j k l│
│  ├──┼──┼──┼──┼──┤ │  ⌫ z x c v b n m ⏎ │
│  │  │  │  │  │  │ │                     │
│  ├──┼──┼──┼──┼──┤ │                     │
│  │  │  │  │  │  │ │                     │
│  └──┴──┴──┴──┴──┘ │                     │
└────────────────────┴─────────────────────┘
```
- Side-by-side layout: board left, keyboard right
- Maximum use of screen real estate
- No scrolling needed

### Implementation Effort: High (2-3 sessions)
- Hamburger menu system: 1 session
- Portrait responsive CSS: 1 session
- Landscape side-by-side: 1 session

---

## 4. WELCOME & ONBOARDING FLOW

### Inspiration: SET Card Game
The SET app opens with: "Do you know how to play SET?"

### Proposed Flow (First Visit Only)

**Screen 1: Welcome**
```
┌─────────────────────────────────────┐
│        🎯 Welcome to Word Quest!     │
│                                     │
│   A word-guessing game that helps   │
│   you become a better speller!      │
│                                     │
│   ┌───────────────────────────┐     │
│   │ 🟩 I know how to play     │     │
│   │    Wordle already!        │     │
│   └───────────────────────────┘     │
│   ┌───────────────────────────┐     │
│   │ 🤔 Show me how            │     │
│   │    to play!               │     │
│   └───────────────────────────┘     │
└─────────────────────────────────────┘
```

**Screen 2a (if "I know Wordle"):**
```
┌─────────────────────────────────────┐
│       🌟 Word Quest is Wordle       │
│          PLUS superpowers!          │
│                                     │
│  🔊 Hear the word spoken aloud      │
│  💡 Get phonics hints & clues       │
│  🌍 See translations in 10 langs   │
│  🎙 Record yourself saying it       │
│                                     │
│  Two ways to play:                  │
│  🎯 Spelling Challenge (classic)    │
│  🔍 Detective Mode (with clues)     │
│                                     │
│   [Let's Play! →]                   │
└─────────────────────────────────────┘
```

**Screen 2b (if "Show me how"):**
Visual tutorial with animated tiles (3-4 slides):

Slide 1: "Guess the secret word! Type a word and press ENTER."
[Animated tiles showing a guess being typed]

Slide 2: "Colors tell you what's right!"
[🟩 = Right letter, right spot]
[🟨 = Right letter, wrong spot]  
[⬜ = Letter not in the word]

Slide 3: "You get 6 tries. Use the clues!"
[Shows a mini game in progress]

Slide 4: "This version has SUPERPOWERS!"
[Same as Screen 2a content]

### Storage: `localStorage.setItem('wq-onboarded', 'true')`
Show only once per device. Add "How to Play" button in ☰ menu to replay anytime.

### Implementation Effort: Medium (1-2 sessions)

---

## 5. DUPLICATE LETTER HINTS

### Current Problem
Players waste turns not knowing a letter appears twice. This is especially frustrating for EAL learners.

### Proposed: Smart Hint System

**Option A: Subtle badge on revealed tile**
When a letter is marked green in one position but exists again in the word:
```
┌───┐
│ L │  ← Green tile
│ ×2│  ← Small "×2" badge in corner
└───┘
```

**Option B: Gentle toast notification**
When player gets a green match on a repeated letter:
> "💡 This letter appears more than once in the word!"

**Option C: Keyboard hint (RECOMMENDED)**
When a letter is marked correct, but appears again:
- The keyboard key gets a small **dot** or **"2"** indicator
- Already partially implemented with vowel dots!

### Best for Learning:
Combine B + C:
1. First occurrence → toast message (teaches the concept)
2. Keyboard key shows small "2×" badge
3. Can be toggled off in settings for "hard mode" players

### Implementation: This fits into the existing two-mode framing:
- **🔍 Detective Mode** (default): All hints ON including duplicate alerts
- **🎯 Challenge Mode**: Hints OFF, classic Wordle rules

### Implementation Effort: Low (1 session)

---

## 6. TURN TIMER & TEAM MODE

### Timer
- Default: OFF
- Configurable: 15s / 30s / 45s / 60s per guess
- Visual: Thin progress bar below the game board (not distracting)
- When timer hits 0: current row auto-submits (if valid word) or skips turn
- Sound: Optional soft tick in last 5 seconds

### Team Mode: "Word Quest Arena"

**Setup (in Tools menu):**
```
Teams: [2] [3] [4]
Team Names: 🦊 Foxes | 🐺 Wolves | 🦉 Owls | 🐻 Bears
Timer: [30s ▼]
Rounds: [10 ▼]
```

**Gameplay Flow:**
```
┌─────────────────────────────────────┐
│  🦊 FOXES' TURN!     ⏱️ 0:28       │
│                                     │
│       [Normal game board]           │
│                                     │
│  ─────────── Score ──────────────   │
│  🦊 Foxes: 🍕🍕🍕   🐺 Wolves: 🍕🍕│
└─────────────────────────────────────┘
```

**Solving the "Loudest Kid" Problem:**

Three engagement strategies:

**Strategy 1: Rotating Captain**
- Each round, a different team member is "Captain"
- Only the Captain types the guess
- Teacher sees a suggested rotation order
- Keeps every kid involved across rounds

**Strategy 2: Whiteboard Consensus**
- Team has 20 seconds to write their guess on mini whiteboards
- Captain enters the majority answer
- Teacher can see all whiteboards (physical, not digital)

**Strategy 3: Digital Voting (Advanced)**
- If students have devices, each team member submits a guess
- The most common guess is auto-entered
- Shows "3/4 team members agreed on CRANE"

**Scoring:**
- Correct in 1 guess: 🍕🍕🍕 (3 treats)
- Correct in 2-3 guesses: 🍕🍕 (2 treats)  
- Correct in 4-6 guesses: 🍕 (1 treat)
- Not guessed: 0 (no penalty!)
- Team mascot animation eats the treats (fun visual)

**End of Game:**
```
┌─────────────────────────────────────┐
│      🏆 WORD QUEST ARENA 🏆         │
│                                     │
│   🦊 Foxes: 🍕×12  ← CHAMPIONS!    │
│   🐺 Wolves: 🍕×10                  │
│   🦉 Owls: 🍕×8                     │
│   🐻 Bears: 🍕×7                    │
│                                     │
│  "Everyone learned 10 new words     │
│   today — that's the real win! 🌟"   │
│                                     │
│   [Play Again] [New Teams]          │
└─────────────────────────────────────┘
```

### Implementation Effort: High (3-4 sessions)
- Timer system: 1 session
- Team setup + turn rotation: 1 session
- Scoring + visuals + mascot animation: 1-2 sessions

---

## 7. THEME TILE COLOR CONSISTENCY

### Current Problem
- Some themes change the "present" (yellow) tile to red
- Dark themes make keyboard keys invisible against background
- Inconsistent experience across themes

### Fix: Lock Game Colors, Theme Everything Else

**Rule: These NEVER change across themes:**
- `--color-correct: #22c55e` (green)
- `--color-present: #eab308` (yellow — slightly more saturated)
- `--color-absent: #64748b` (slate)
- Key background for unused keys: always readable contrast

**Theme controls:**
- Page background & gradient
- Canvas/board container background
- Header styling
- Keyboard container background
- Empty tile styling
- Fonts, accents, decorative elements

**CSS approach:**
```css
/* Force consistent tile colors across ALL themes */
.tile.correct { background: #22c55e !important; border-color: #22c55e !important; color: #fff !important; }
.tile.present { background: #eab308 !important; border-color: #eab308 !important; color: #fff !important; }
.tile.absent  { background: #64748b !important; border-color: #64748b !important; color: #fff !important; }
.key.correct  { background: #22c55e !important; color: #fff !important; }
.key.present  { background: #eab308 !important; color: #fff !important; }
.key.absent   { background: #475569 !important; color: #94a3b8 !important; }
```

**Dark theme keyboard fix:**
```css
body[data-wq-scene="hero-iron"] .key:not(.correct):not(.present):not(.absent),
/* ... all dark themes ... */
{
    background: rgba(255,255,255,0.15) !important;
    color: #f1f5f9 !important;
    border: 1px solid rgba(255,255,255,0.2) !important;
}
```

### Implementation Effort: Low (30 min, CSS only)

---

## PRIORITY ORDER FOR IMPLEMENTATION

| # | Feature | Impact | Effort | Priority |
|---|---------|--------|--------|----------|
| 1 | Middle area declutter | High | Low | 🔴 NOW |
| 2 | Theme tile consistency | High | Low | 🔴 NOW |
| 3 | Mobile header overflow | Critical | Medium | 🔴 NOW |
| 4 | Recording mini-studio | High | Medium | 🟡 NEXT |
| 5 | Welcome/onboarding | Medium | Medium | 🟡 NEXT |
| 6 | Duplicate letter hints | Medium | Low | 🟡 NEXT |
| 7 | Turn timer | Medium | Low | 🟢 LATER |
| 8 | Team mode | High | High | 🟢 LATER |
| 9 | Waveform comparison | Wow-factor | High | 🟢 LATER |
| 10 | Full mobile overhaul | Critical | High | 🟢 LATER |

---

## FILES TO MODIFY
- `style.css` — responsive, tile colors, middle area
- `app.js` — recording studio, onboarding, timer, team mode
- `index.html` — hamburger menu, recording studio modal HTML
