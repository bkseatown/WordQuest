# Pilot Troubleshooting

## Dashboard looks stale
- Hard refresh browser.
- Reopen `teacher-dashboard.html`.

## Student list looks empty
- Run `npm run pilot:reset`.
- Reload dashboard; demo caseload should repopulate.

## Meeting workspace does not open
- Click **Meeting & Reports** (top bar).
- If blocked, refresh and retry.

## Visual or interaction oddities
- Run `npm run guard:runtime`.
- Run `npm run audit:ux:tasks`.

## Label text appears changed unexpectedly
- Run `npm run guard:pilot-labels`.
- If it fails, restore intended pilot wording before sharing.

## Accessibility confidence check
- Run `npm run audit:a11y`.
- Run `npm run audit:a11y:manual-proxy`.

## Final pre-share check
- Run `npm run guard:prepush`.
