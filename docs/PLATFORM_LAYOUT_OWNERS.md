# Platform Layout Owners

This file defines the authoritative layout owner for each major page family.
If a page needs layout changes, edit the owner first and avoid adding new inline layout CSS.

## Owner Map

### Landing

- Route: `/index.html`
- Layout owner: [/Users/robertwilliamknaus/Desktop/Cornerstone MTSS/home-v3.css](/Users/robertwilliamknaus/Desktop/Cornerstone%20MTSS/home-v3.css)
- Notes:
  - The landing page should use the `landing-*` structure only.
  - Do not reintroduce the old `home-role-btn` dashboard stack.

### Word Quest

- Route: `/word-quest.html`
- Layout owner: [/Users/robertwilliamknaus/Desktop/Cornerstone MTSS/style/components.css](/Users/robertwilliamknaus/Desktop/Cornerstone%20MTSS/style/components.css)
- Page file allowed to own:
  - first-paint show/hide guard only
- Notes:
  - No new inline layout CSS in `word-quest.html`
  - Remove conflicting media blocks rather than overriding them

### Game Platform Gallery + Play Shell

- Routes:
  - `/game-platform.html`
  - `/typing-quest.html`
  - shared CG game pages
- Layout owner: [/Users/robertwilliamknaus/Desktop/Cornerstone MTSS/games/ui/game-shell.css](/Users/robertwilliamknaus/Desktop/Cornerstone%20MTSS/games/ui/game-shell.css)
- Page file allowed to own:
  - script bootstrapping only
- Notes:
  - `game-platform.html` should not contain inline layout `<style>` blocks
  - Theme picker and shell spacing belong in `game-shell.css`

### Teacher Hub

- Route: `/teacher-hub-v2.html`
- Layout owner: [/Users/robertwilliamknaus/Desktop/Cornerstone MTSS/teacher-hub-v2.css](/Users/robertwilliamknaus/Desktop/Cornerstone%20MTSS/teacher-hub-v2.css)

## Guardrails

- Prefer deleting outdated layout code over out-specificity overrides.
- Avoid new `!important` unless neutralizing legacy behavior during cleanup.
- Validate layout at `1365x768` and `1440x900`.
- If a page starts needing many one-off viewport fixes, treat that as a duplicate-owner warning.
