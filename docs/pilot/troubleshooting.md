# Pilot Troubleshooting

## Reports or Hub looks stale
- Hard refresh browser.
- Reopen `teacher-hub-v2.html` or `reports.html`.

## Student list looks empty
- Run `npm run pilot:reset`.
- Reload the Hub or Reports; demo caseload should repopulate.

## Meeting workspace does not open
- Click **Meeting Prep** on `reports.html`.
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
