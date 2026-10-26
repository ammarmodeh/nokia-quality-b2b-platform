# Phase 1 — Dashboard & DVOC Installations performance

## Root cause

Both `/dashboard` and the task list (now `/dvoc-installations`) called `GET /tasks/get-all-tasks`, which
returned **every task with every field plus every ticket** (≈5 KB per task), on every visit. The dashboard's
violation tracker then re-requested `samples-token/<year>` after the tasks arrived, and again on every task
change. Nothing was cached, and the response's ETag never produced a 304.

## What changed

| Layer | Change |
|---|---|
| API | `GET /tasks/get-all-tasks?view=summary` — drops fields no list/board/dashboard view reads (`subTasks`, `checkpoints`, `readBy`, `whomItMayConcern`, `closureComment`, `customFields`, `secondCall*`, `subtaskType`) and reduces ticket history server-side to `ticketCount` + `latestGaia`. Rows carry `isSummary: true`. Without `view`, the endpoint behaves exactly as before (other pages and the data export still use it). |
| API | `from` / `to` query params: server-side date window matching the client's `taskDate()` (interviewDate → pisDate → createdAt), one indexed `$or` branch each. |
| API | Conditional GET (`utils/httpCache.js`): ETag built from count + newest `updatedAt` of tasks, tickets and users, checked **before** the heavy query → `304` in ~20 ms when nothing changed. CORS allows `If-None-Match` and exposes `ETag`. |
| DB | New indexes: `tasks.updatedAt`, `tasktickets.updatedAt` (version check), `tasktickets.{taskId, timestamp}` (ticket summary). Mongoose builds them on startup (`autoIndex`). |
| Client | `api/taskStore.js` — shared cache: in-flight de-duplication, stale-while-revalidate, sends its own `If-None-Match` and keeps the same array on 304 (no re-render). Dashboard and DVOC Installations share it, so moving between them is instant. |
| Client | DVOC Installations loads only the active date window (default "This week"); switching range keeps the previous rows visible until the new ones arrive. |
| Client | Task sheet loads ticket history on open; `EditTaskDialog` reloads the full record when given a summary row (prevents saving blanks over fields the summary omits). |
| Client | `api/requestCache.js` — per-year `samples-token` requests shared by the dashboard and tracker; the tracker refetches only when the set of years changes or on explicit refresh. |
| Routing | `/tasks-list` → `/dvoc-installations` (and `/reports`). Old URLs redirect, keeping sub-path, query (`?task=…`, filters) and hash. Server-generated links (Q-Ops log, SLA) updated. |

## Measurements

Local MongoDB, synthetic production-shaped dataset: 6,000 tasks, ~12,100 tickets, 25 users, 40 teams
(`backend/scripts/perf/seedPerfData.js`). Median of 7 runs, same machine.

| Request | Median | Raw | Gzip |
|---|---|---|---|
| Before (`a7314d1`, `$lookup` pipeline) — `get-all-tasks` | **6,138 ms** | 29.5 MB | 3.2 MB |
| `get-all-tasks?view=summary` (dashboard, all time) | 1,764 ms | 14.5 MB | 1.8 MB |
| `get-all-tasks?view=summary&from&to` (DVOC Installations, this week) | **38 ms** | 104 KB | 15 KB |
| Any of the above, unchanged since last load (304) | **16–28 ms** | — | 0.3 KB |

In the browser: returning to the dashboard from DVOC Installations renders from cache immediately and
revalidates with a 304 in 42 ms (0.3 KB transferred).

Production volumes were not measured (read access to the production database was not used).

### Reproduce

```bash
cd backend
node scripts/perf/seedPerfData.js            # local DB only; refuses non-local URIs
node scripts/perf/benchEndpoints.js . 5077   # starts the server on the local perf DB and times endpoints
```

`.claude/launch.json` has `perf-backend` / `perf-client` to browse the same dataset (login in the seed script).

## Known limits / follow-ups

- The dashboard still needs all-time rows because the violation tracker computes all-time team stats on the
  client. Moving those aggregates server-side would remove the remaining 1.8 s first load.
- The browser's own HTTP cache did not reuse the 14 MB response across full page reloads; the in-app cache
  covers in-app navigation only. A full reload re-downloads the summary once.
- The `AssessmentFormStepper` client test fails at module load (pre-existing, unrelated: full
  `@mui/icons-material` barrel import in `AssessmentForm.jsx`).
