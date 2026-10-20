# Redesign: manual test checklist

Run every section in **light and dark** (Settings → Appearance) and at **phone width** (≈375 px). Keep the browser console open; there should be no red errors.

Automated checks already run against a throwaway local database (never production):
the custom-tables API checks (48/49; the only miss was the test's own assumption that a duplicated table gets new field ids), the client unit tests (15/15), lint on all new code, a production build, and a sweep of every page below in light, dark and 375 px for crashes and horizontal overflow.

## Shell
- [ ] Sidebar groups: Overview, Work, Trackers, Teams, Assessments, Admin. Nothing outside the brief is listed.
- [ ] Trackers lists Closure Call, OJO Snags, DVOC (Installation tasks, Workspace), TCRM, TRC, Internal Audit (FAT). A tracker with custom tables expands to show them.
- [ ] Ctrl+K opens the command palette; pages are searchable.
- [ ] The calendar icon in the top bar opens the calendar dialog.
- [ ] Old links redirect: `/customer-issues` → `/ojo-snags`, `/calender` → `/calendar`, `/profile` → Settings → Profile.

## Dashboard (`/dashboard`)
- [ ] NPS Performance cards and breakdown match the previous numbers for the same period.
- [ ] NPS trends: period selector, team and category filters.
- [ ] Team Violation Tracker: ranking, click-through to the team.
- [ ] Header filters are kept in the URL (reload keeps them).

## Tasks (`/tasks-list`) — DVOC · Installation
- [ ] Board: drag a card between status lanes; the order persists after reload.
- [ ] Table: filters, bulk actions, Data menu (import, export, template).
- [ ] Calendar view: month, week, day; drag a task to another day and check its interview date changed.
- [ ] Task sheet: edit and save; delete, then Undo.
- [ ] `/tasks-list?task=<id>` opens that task.

## Calendar (`/calendar` and the top-bar dialog)
- [ ] Tasks, snags/complaints, lab and on-the-job assessments and custom-table rows appear, coloured by tracker.
- [ ] Filters: Show (sources), Tracker, Field team, Assignee.
- [ ] Drag a task or table row to another day: a toast confirms, and the new date is kept after reload.
- [ ] Hover a day and click +: "New DVOC task" opens the task form with the date filled; "New row in …" creates a row on that date.
- [ ] Click an item: the detail sheet's Open button goes to the task, row, record or assessments page.
- [ ] Week numbers tab: the current week matches the Dashboard week; Share to WhatsApp opens WhatsApp.

## OJO Snags (`/ojo-snags`), TCRM (`/tcrm`), TRC (`/trc`), Internal Audit (`/internal-audit`)
- [ ] OJO Snags: All / Installation / Maintenance tabs with counts. TCRM, TRC and Internal Audit show only their own records.
- [ ] Table, side sheet, report/edit dialog, Analytics view.
- [ ] The Tables section lists that tracker's custom tables.
- [ ] Data menu: import a workbook as a dry run first and check the counts; export the view.

## Closure Call (`/closure-call`), DVOC (`/dvoc`)
- [ ] DVOC: All / Installation / Maintenance tabs; Installation shows the Tasks card with a count.
- [ ] New table (admin): Blank, From a template, From an Excel/CSV file (try a workbook with several sheets), Duplicate.

## Custom table (`/tables/:id`)
- [ ] Grid: click a cell and type to edit; Enter, Tab and arrow keys move; Shift+Space opens the row.
- [ ] Paste a block copied from Excel; extra lines become new rows.
- [ ] Select a range: Ctrl+D fills down; Delete clears; Ctrl+C copies.
- [ ] Column menu: sort, filter, group, hide, freeze, rename, edit field, insert left/right.
- [ ] Resize a column by dragging its edge.
- [ ] Fields sheet: drag to reorder, hide, add, archive and restore, delete permanently (archived fields only).
- [ ] Change a field's type: the preview counts the values that convert; values that don't convert show under "Values kept from a field type change" in the row sheet.
- [ ] Rename a field: values stay.
- [ ] Views: add Kanban (drag cards between lanes, choose card fields), Calendar (drag rows to another day), and Grid. Save view, Reset, rename, duplicate, share/personal, delete.
- [ ] Row sheet: edit fields; attach an image and a PDF (inline preview); Activity tab shows old → new values.
- [ ] Row sheet: "Create task from row" opens the task form pre-filled; after saving, the row shows "Linked to a task".
- [ ] Data → Import from Excel: map columns, dry run, import. Then Import history: View rows, Download file, Error report, Roll back (the rows return to their previous values).
- [ ] Data → Export (.xlsx, .csv) and Download import template (with a Lists sheet).
- [ ] ⋯ menu (admin): rename, save as template (with or without sample rows), show in global calendar, archive. Restore an archived table from the tracker page.
- [ ] Signed in as a Member: rows, views and imports work; Fields shows no Add, Edit or Archive.

## Field Teams (`/fieldTeams`)
- [ ] KPI cards, filters, team sheet (members, tasks, scores, violations), add/edit/deactivate, Team report, Data menu.

## Assessments
- [ ] Assessment Dashboard: KPIs and charts, filters, drill-down.
- [ ] `/fieldteam-login`: field-team login and quiz flow behave exactly as before (code, timer, scoring, results).
- [ ] Lab and On-the-Job: stepper sections, progress, review step, save.
- [ ] Manage Quiz (admin): question editor sheet, reorder and save order, Data menu.

## Admin
- [ ] Dropdown Management: two panes; the taxonomy group can't delete values that are in use (deactivate instead).
- [ ] Settings: each tab saves (sticky save bar); Users & roles (admin); Appearance switches light, dark and system.
- [ ] Settings → Table templates: search, filter, preview; Upload Excel creates a template; editing makes a new version (built-ins save a copy); duplicate, archive, download .xlsx, download original file.

## Data safety
- [ ] Tasks and snags records still show every field they had before the redesign.
- [ ] Existing APIs return the same shapes (old exports and reports still work).
