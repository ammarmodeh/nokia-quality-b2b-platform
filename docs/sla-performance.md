# Teams → SLA performance (`/sla-performance`)

Ranks teams by how often they miss their SLA and how fast they respond. Data: the existing SLA records
(`sla_records`, set from the SLA button on tasks, snags and tracker rows). API: `GET /api/sla/analytics`
(`slaController.getSlaAnalytics`, calculation in `backend/utils/slaAnalytics.js`).

## Rules (the existing ones, now shared)

`classifySla` is used by both this page and the existing per-team SLA figures (`/api/sla/team-performance`):

| Outcome | When |
|---|---|
| Met | status *met*, or the team is exempt (customer-requested reschedule) |
| Breached | no response, status *breached*, or still open past its deadline |
| Open, on time | open and before its deadline |
| (ignored) | cancelled |

- **Breach rate** = breached ÷ (met + breached). **Compliance** = met ÷ (met + breached).
- **Overdue now** = still open past the deadline (counted inside Breached).
- **Response time** = ticket creation → team response, answered tickets only (no-response tickets excluded).
  Shown as average, median and 90th percentile.
- **Overrun** = time past the deadline on breached SLAs (late answer: response − SLA hours; still open: now − deadline).
- Customer reschedules are counted separately and never against the team.
- Teams with fewer than 3 closed SLAs are flagged **Low volume** (rates on tiny counts are unreliable).
- Period filter = ticket creation date (falls back to the SLA start date).

## Page

KPI cards · teams with the most breaches (stacked met / breached / open, breach-rate label) · response time
relative to SLA (within half, within, ≤24 h late, 1–3 days late, >3 days late) · weekly trend (outcomes +
breach-rate line) · sortable team table with export · overdue-right-now list (links to the ticket) ·
breakdown by category and priority · per-team sheet listing every SLA. Filters: period (incl. all time),
category, priority, source (DVOC task / snag / tracker row), company. Linked from the SLA bell menu.

## Test data

`node backend/scripts/perf/seedPerfSla.js` adds 800 synthetic SLAs to the local perf database only.
Tests: `backend/tests/local/slaAnalytics.test.js` (`npm run test:local`).
