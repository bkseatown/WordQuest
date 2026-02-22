# WordQuest Audio + Offline Deploy Checklist

Use this checklist before sharing a teacher-facing URL.

## 1. Build and validate locally

- Run `npm run audio:manifest`
- Run `npm run audio:manifest:check`
- Run `npm run offline:check`
- Run `npm run hud:check`
- Run `npm run release:check`

Expected:
- `data/audio-manifest.json` exists and has thousands of audio paths
- `data/audio-manifest.json` matches `data/words-inline.js`
- `sw.js` is present and registered from `js/app.js`
- HUD/theme guardrails still pass

## 2. Host as static HTTPS

- Deploy the repo to GitHub Pages, Netlify, or Cloudflare Pages
- Ensure site is served over `https://` (service workers require secure context)
- Confirm URL is the final teacher URL (avoid temporary preview links for classroom use)

## 3. Verify audio in deployed URL

Open the deployed app and verify:
- Hear Word plays recorded audio
- Hear Sentence plays recorded audio
- End modal Word/Meaning/Sentence/Fun buttons work
- Settings -> Audio Voice modes behave as expected:
  - `Recorded only`: no TTS fallback
  - `Recorded -> device fallback`: TTS fallback when file is missing
  - `Device voice only`: TTS only

## 4. Verify offline behavior

With deployed URL open:
- Play at least one round and trigger a few audio files
- Refresh once (ensures service worker takes control)
- Go offline in devtools and reload
- Confirm app shell loads and gameplay still opens
- Confirm previously used audio can replay offline

Important:
- Browser storage limits vary. The full audio library is large, so runtime offline caching is best-effort.
- First visit must be online to cache shell/data/audio.

## 5. Regression smoke checks

- Theme switch + reload persistence
- New game + enter guesses + keyboard coloring
- Settings open/close and voice-help modal
- No blocking console errors (ignore missing favicon if not added yet)

## 6. Release routine

For every data/audio refresh:
- Run `npm run audio:manifest`
- Run `npm run audio:manifest:check`
- Commit updated `data/audio-manifest.json`
- Re-run `npm run offline:check` before deploy

## 7. GitHub Pages pipeline

- Workflow file: `.github/workflows/deploy-pages.yml`
- In GitHub repo settings, set Pages source to **GitHub Actions**
- Deploy runs on push to `main` after:
  - `npm run audio:manifest:check`
  - `npm run offline:check`
  - `npm run hud:check`
