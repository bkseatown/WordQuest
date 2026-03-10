Original prompt: You are improving the Cornerstone MTSS game platform UI.

- 2026-03-10: Located shared runtime in `games/ui/game-shell.js` and `games/ui/game-shell.css`; confirmed game platform uses a shared shell with game-specific surfaces.
- 2026-03-10: Plan for this pass is shell-first: increase gameplay surface, compress whitespace, add shared motion/feedback, then patch Say It Another Way, Typing Quest, Word Quest, Word Forge, and Category Rush inside existing render branches.
- 2026-03-10: Implemented shell-first gameplay UI pass in `games/ui/game-shell.js` and `games/ui/game-shell.css`: larger play surface, shared timer, Taboo card, typing lane, larger Word Quest board, forge equation, quick-entry Category Rush.
- 2026-03-10: Skill Playwright client could not launch local Chromium in this environment due MachPort sandbox permission fault; falling back to built-in browser tooling for visual QA.
- 2026-03-10: Browser QA complete on `game-platform.html` and `typing-quest.html` for word-connections, word-quest, word-typing, morphology-builder, and rapid-category. Verified 0 console errors/warnings. Confirmed Taboo mode+difficulty update, Category Rush quick entry dedupes correctly, and Typing Quest runtime shows the new lane after starting placement.
