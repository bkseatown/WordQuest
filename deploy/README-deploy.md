# Cornerstone Deployment Guide

## Hosting Today
- Current static hosting target: GitHub Pages.
- Workflow file present: `.github/workflows/deploy-pages.yml`.
- Typical branch source: `main` (verify in repo Settings -> Pages).

## Deploy Checklist
1. Update `/version.json` with a new value before deploy.
2. Push to `main` and let Pages workflow complete.
3. Open the deployed site and verify the build badge shows the new version.
4. Open a second tab with an older build still loaded, then refresh once:
- The version guard should reload exactly once.
- It stores `localStorage.cs_app_version` and `sessionStorage.cs_app_version_reloaded_once`.

## Validate Cache Refresh (No Hard Refresh Needed)
1. Keep tab A open on old build.
2. Deploy new build.
3. In tab A, navigate or refresh once.
4. Expected:
- App sees version mismatch via `/version.json`.
- App performs one guarded refresh.
- No infinite loop.

## Build Badge Validation
- Badge appears bottom-right as `Build <version>`.
- Click badge to copy version string.
- Badge should match `/version.json`.

## Security Headers (Future Non-GitHub Hosting)
GitHub Pages cannot set custom response headers directly. For Cloudflare/Netlify/Vercel/Nginx, add:

- `Content-Security-Policy: default-src 'self'; script-src 'self' https://fonts.googleapis.com https://fonts.gstatic.com 'unsafe-inline'; style-src 'self' https://fonts.googleapis.com 'unsafe-inline'; img-src 'self' data: blob:; font-src 'self' https://fonts.gstatic.com; connect-src 'self'; media-src 'self' blob:; frame-ancestors 'none'`
- `X-Content-Type-Options: nosniff`
- `Referrer-Policy: strict-origin-when-cross-origin`
- `Permissions-Policy: camera=(), microphone=(), geolocation=()`

Start permissive, then tighten CSP once inline usage is reduced.

## Inline Script / CSP Nonce Note
- Current implementation keeps inline JS minimal.
- If migrating to strict CSP later, move inline blocks into external files or apply nonce-based CSP on server responses.
