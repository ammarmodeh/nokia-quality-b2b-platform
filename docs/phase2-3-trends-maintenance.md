# Phase 2 — Teams Trends · Phase 3 — DVOC Maintenance

## Teams → Trends (`/team-trends`)

Ranks DVOC Installation teams worst-first for a period. API: `GET /api/team-trends?from&to&months&metric`
(`controllers/teamTrendsController.js`, calculation in `utils/teamTrends.js`).

### Business rules (reused, not new)

| Metric | Formula | Source of the rule |
|---|---|---|
| Accountable DVOC | task's `teamAccountability` has any “Yes” | `client/src/utils/accountability.js`, `onlineSummary` |
| Per survey sample % | accountable ÷ (team samples − non-accountable DVOC) × 100 | `onlineDataController.onlineSummary` (“DVOC / Sample %”) |
| Per online % | accountable ÷ team online transactions × 100 | `onlineDataController.onlineSummary` (“DVOC / Online %”) |
| REACH ownership | accountable tasks whose `responsible` contains “reach” | Field Team Portal “Owner Reach” |
| Total accountable | count of accountable tasks | — |

- DVOC scope = tasks with an `interviewDate` in the period and a team name (same as `onlineSummary`).
- A task counts once per team, however many RCA rows it has. Team names match case/space-insensitively.
- The metrics are **never combined** into one score; the ranking uses the selected metric only.
- Team samples (`TeamSamplesToken`) and online volumes (`TeamOnlineData`) are stored **per team per month**,
  so rates are only computed for periods made of whole calendar months (Last month, Current month, a
  custom range of whole months). For weeks or partial months the page says so and ranks by total
  accountable DVOC; it never pro-rates monthly denominators.
- Missing or zero denominators give no rate (“—”); those teams are listed last, unranked. Summary rates
  are pooled from totals, not averaged across teams. Ties share a rank.
- Period boundaries come from the dashboard's `resolvePeriod` (configured week start / week 1 settings,
  browser-local dates — the app has no timezone setting).
- Terminated teams with no activity are hidden. Maintenance data is never read.

## DVOC Maintenance (`/dvoc-maintenance`)

Tabs: **All teams · Survey samples · Tasks · Process tasks**. API under `/api/maintenance`
(`controllers/maintenanceController.js`, `routes/maintenanceRoutes.js`).

### Isolation

Own collections in the existing MongoDB (no new infrastructure):

| Collection | Purpose | Key indexes |
|---|---|---|
| `maintenance_teams` | teams, supervisor, coverage, crew, status | unique name (case-insensitive), unique code when set |
| `maintenance_survey_samples` | samples per team per month (+ optional P/N/D) | unique (team, year, month) |
| `maintenance_tasks` | maintenance cases (SLID, team, sample month, RCA, schedule) | unique taskNumber, unique sparse requestKey, team/status/date |
| `maintenance_tickets` | processing log (Q-Ops-style INIT → CONTACT → REFLECT → VISIT → RESOLVE) | unique ticketId, unique sparse requestKey, (task, eventDate) |
| `maintenance_audit_logs` | who changed what (field-level from/to) | (entity, entityId, createdAt) |

Nothing outside the maintenance controller reads or writes these, so dashboards, Trends, DVOC Installation,
field teams, samples and Q-Ops tickets are unaffected (asserted by `tests/local/maintenance.int.test.js`).
Shared pieces only: auth, users, Dropdown Management lists, UI components.

### Integrity

- **Duplicate submissions**: forms send a `requestKey`; a retry or double click returns the same record.
  A second *open* task for the same SLID is refused unless the user chooses “Create anyway”.
- **Consistency**: recording/editing/deleting a step updates the task's status and counters in one
  MongoDB transaction (Atlas). On a standalone server (local dev) the same writes run with compensating
  rollback (`utils/withTransaction.js`).
- **References**: tasks need an existing, active team; a linked sample entry must belong to that team;
  teams and sample entries in use can't be deleted (set a team Inactive instead).
- **Permissions**: signed-in users create and edit; only the recorder or an admin edits a step;
  deletes are admin-only.
- **Validation**: server-side for every write (mirrored in the forms); dates, enums, score 1–10,
  P/N/D ≤ sample size, follow-up after event date, no future event dates.

### Assumptions to confirm

- Maintenance samples are monthly per team (mirrors the installation team samples).
- Task statuses are Todo / In Progress / Closed; priorities High / Medium / Low.
- Transaction types/states/reason codes come from the existing Dropdown Management lists
  (`TRANSACTION_TYPE`, `TRANSACTION_STATE`, `UNF_REASON_CODE`), with built-in fallbacks.
- Maintenance figures are not yet shown on the dashboard or in Trends (kept out on purpose).

## Tests

```bash
cd backend && npm run test:local   # 23 tests, local MongoDB only (refuses any other URI)
cd client && npx vitest run         # includes trendPeriods.test.js
```

The original backend jest suite imports `server.js`, which connects to the `.env` (production) database;
it was not run.
