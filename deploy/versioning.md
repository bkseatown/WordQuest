# Versioning Rules

## Format
`version.json` must be:

```json
{ "v": "YYYY-MM-DD-<shorttag>" }
```

Example: `2026-02-27-deploy1`

## When to Bump
Bump for every production-facing change, including:
- UX updates
- Theme/style changes
- Feature behavior changes
- Fixes affecting runtime behavior

## Reload Guard Behavior
- Stored keys:
  - `localStorage.cs_app_version`
  - `sessionStorage.cs_app_version_reloaded_once`
- On mismatch, app reloads once and sets session guard to the target version.
- Same version will not trigger repeat reload.

## Avoiding Reload Loops
- Never clear `sessionStorage.cs_app_version_reloaded_once` during startup.
- Only refresh when detected version differs from stored local version.
- Always set the session guard before calling reload.

## Suggested Release Flow
1. Apply changes.
2. Bump `version.json`.
3. Deploy.
4. Confirm badge and diagnostics show new build.
5. Verify one-time refresh behavior from a stale tab.
