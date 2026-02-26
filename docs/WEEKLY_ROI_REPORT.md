# Weekly ROI Report

This repo includes an automated weekly ROI report workflow:
- Workflow: `.github/workflows/weekly-roi-report.yml`
- Builder script: `scripts/build-weekly-roi-report.js`

## What it reports

- Dashboard scorecards (Adoption, Learning, Reliability)
- Funnel counts:
  - session start
  - quest select
  - deep dive started/completed
  - reset used
  - force update used
- Threshold alerts:
  - reliability below 80
  - deep-dive completion drop > 15 points week-over-week
- Top 5 friction signals

## Data source

The workflow chooses telemetry input in this order:
1. `TELEMETRY_REPORT_URL` repo secret (optional bearer token: `TELEMETRY_REPORT_TOKEN`)
2. `data/telemetry-weekly.json` if present
3. fallback to an empty array (`[]`)

Input rows should be JSON array objects containing at least:
- `event_name` (or `event`)
- `ts_ms` (or `timestamp`)

## Manual run

You can run locally:

```bash
npm run telemetry:roi:report
```

Optional flags:

```bash
node scripts/build-weekly-roi-report.js --input reports/telemetry-input.json --output reports/weekly-roi-report.md --days 7
```
