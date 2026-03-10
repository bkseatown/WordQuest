AI GUARDRAILS FOR CORNERSTONE MTSS

This repository contains working instructional games.

The following systems are STABLE and must never be rewritten by AI tools:

LOCKED SYSTEMS
- Word Quest game engine
- word bank loading
- guess evaluation logic
- keyboard input logic
- routing between pages
- typing quest typing detection

AI tools may only modify:

SAFE UI LAYERS
- preview cards
- layout spacing
- CSS styling
- animation layers
- dashboard visual hierarchy

CRITICAL RULES

1. Never rewrite full pages.
2. Only modify components.
3. Game preview cards must NEVER run game logic.
4. Preview boards must always be static UI.
5. Word bank queries must never run inside preview cards.
