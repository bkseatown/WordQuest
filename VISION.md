# WordQuest Vision And Requirements

Source note: this vision draft originated from ChatGPT output and was normalized to this repository's actual file structure and guardrail workflow.

## Project Vision
WordQuest is a joyful, expressive, multi-sensory literacy platform where play, sound, visual identity, and learner choice work together.

It is designed to feel:
- fun and interactive,
- audio-rich and expressive,
- visually engaging without chaos,
- supportive for attention variability and neurodiversity,
- predictable and usable in classrooms.

## Why WordQuest Matters
WordQuest exists to combine engagement and learning quality:
- Games increase motivation and retention.
- Multi-sensory input (visual + audio + interaction) improves learning depth.
- Learner choice (themes/music/motion) increases ownership.
- Different learners need different sensory profiles.
- Teachers need clear controls and safe defaults.
- The platform must scale without architectural collapse.

## Core Experience Pillars

### 1. Playful Interactivity
- Keys and tiles should feel alive.
- Feedback should feel rewarding, not chaotic.

### 2. Aesthetic Richness
- Themes should feel distinct and intentional.
- Theme color language should be coherent across background, board, keys, and accents.

### 3. Expressive Sound
- Recorded audio is first-class.
- Music adds mood without overpowering instruction.
- Celebrations should feel satisfying and time-bounded.

### 4. Learner Voice Interaction (Future)
- Learners can record and replay themselves.
- Initial phase should be non-punitive (no score penalty).

### 5. Accessibility First
- Motion modes: `fun`, `calm`, `reduced`.
- Maintain contrast, alternative cues, and readability.

### 6. Teacher-Aware Controls
- Settings are clear and predictable.
- Safe defaults with low friction in classroom use.

## Architecture Philosophy
Clear separation of concerns:
- Theme tokens: `/Users/robertwilliamknaus/Desktop/WordQuest/style/themes.css`
- Layout/components/motion: `/Users/robertwilliamknaus/Desktop/WordQuest/style/components.css`
- Mode overrides: `/Users/robertwilliamknaus/Desktop/WordQuest/style/modes.css`
- Game rules/state: `/Users/robertwilliamknaus/Desktop/WordQuest/js/game.js`
- UI rendering helpers: `/Users/robertwilliamknaus/Desktop/WordQuest/js/ui.js`
- App orchestration/settings: `/Users/robertwilliamknaus/Desktop/WordQuest/js/app.js`
- Theme registry/navigation: `/Users/robertwilliamknaus/Desktop/WordQuest/js/theme-registry.js`, `/Users/robertwilliamknaus/Desktop/WordQuest/js/theme-nav.js`
- Data loading: `/Users/robertwilliamknaus/Desktop/WordQuest/js/data.js`

## Learning And Gameplay Principles
WordQuest reinforces:
- word recognition,
- spelling strategy,
- phonemic awareness,
- pattern recognition,
- auditory-visual linkage.

Gameplay loop:
1. choose word,
2. learner guesses,
3. show correct/present/absent feedback,
4. reinforce with audio meaning/context.

## Design Requirements
Themes should:
- be distinct and recognizable,
- define tokens only (not layout rules),
- preserve visual balance (60-30-10 target),
- support classic and optional themed feedback,
- degrade gracefully.

Priority high-impact themes:
1. Classic Clean
2. Seahawks
3. Huskies
4. Iron Man (refined)
5. Demon Hunter (neon)
6. Coffeehouse
7. Minecraft
8. Pokedex
9. Retro Arcade
10. Solar Gold

Each theme should provide:
- background gradient tokens,
- panel/board surface tokens,
- primary/accent/neutral tokens,
- optional alternate feedback tokens.

## Motion And Interaction
Motion levels:
- `fun` (default): micro-animations + celebratory effects.
- `calm`: lower amplitude and gentler timing.
- `reduced`: no non-essential motion.

Celebration rules:
- Trigger only on solved word.
- Keep duration bounded (target 2-3 seconds).

Interaction rules:
- Key press: pop + ease-out.
- Tile lock/reveal: flip + settle.
- Respect system reduced-motion preferences.

## Audio Requirements
Primary audio path:
- recorded assets for word, sentence, and supporting audio.

Fallback path:
1. recorded audio if available,
2. optional device TTS only when explicitly enabled,
3. no noisy system-voice UI clutter.

Teacher controls:
- music on/off,
- music style,
- audio fallback behavior.

## User Stories
Learner stories:
- spelling feels alive, not mechanical,
- natural audio improves comprehension,
- voice recording supports confidence and self-awareness,
- calm mode supports sensory needs.

Teacher stories:
- projector-safe and predictable interface,
- manageable student choice without chaos,
- high-contrast and reduced-motion support for groups.

## Contributor Guardrails
To avoid regressions:
- always run:
  - `npm run scope:view`
  - `npm run hud:check`
- changes outside approved scope require explicit approval.

Protected-by-default surfaces:
- `/Users/robertwilliamknaus/Desktop/WordQuest/style/components.css`
- `/Users/robertwilliamknaus/Desktop/WordQuest/js/ui.js`
- `/Users/robertwilliamknaus/Desktop/WordQuest/js/game.js`

Editable-by-default surfaces:
- `/Users/robertwilliamknaus/Desktop/WordQuest/style/themes.css`
- `/Users/robertwilliamknaus/Desktop/WordQuest/style/modes.css`
- `/Users/robertwilliamknaus/Desktop/WordQuest/js/theme-registry.js`
- `/Users/robertwilliamknaus/Desktop/WordQuest/js/theme-nav.js`

Controlled edits:
- If layout/component structure must change, require explicit request and acceptance criteria first.

## Acceptance Criteria
Theme change is done when:
- contrast and readability pass,
- board and keyboard remain clear,
- projector and small-screen behavior remain usable,
- guardrails pass.

Audio change is done when:
- recorded audio remains first priority,
- TTS is optional only,
- no system voice list clutter is exposed by default.

Motion change is done when:
- `fun` is lively without chaos,
- `reduced` removes non-essential motion,
- timing/amplitude align with classroom usability.

Recording feature (future) is done when:
- capture and playback are clear and quick,
- no punitive scoring bias in initial phase.

## Vision Summary
WordQuest is not only a spelling game. It is a living literacy environment that balances:
- excitement and pedagogy,
- expressiveness and clarity,
- learner agency and classroom control.

## Optional Next Deliverables
- Settings UI spec (visual + interaction)
- Recording UX flow (wireframes + acceptance tests)
- Music system API spec
- Teacher dashboard guide
