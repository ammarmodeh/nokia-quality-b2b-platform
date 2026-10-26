import { useCallback, useEffect, useState } from "react";
import { NavLink, Outlet } from "react-router-dom";
import { Box } from "@mui/material";
import PageHeader from "../../components/ui/PageHeader";
import StatCard from "../../components/ui/StatCard";
import { maintenanceApi } from "./maintenanceApi";

const MAINTENANCE_TABS = [
  { to: "teams", label: "All teams" },
  { to: "samples", label: "Survey samples" },
  { to: "tasks", label: "Tasks" },
  { to: "processing", label: "Process tasks" },
];

/** DVOC · Maintenance shell: overview numbers + tabs. Child pages call `refreshOverview` after writes. */
const MaintenanceLayout = () => {
  const [overview, setOverview] = useState(null);
  const refreshOverview = useCallback(() => {
    maintenanceApi.overview().then(setOverview).catch(() => {});
  }, []);
  useEffect(refreshOverview, [refreshOverview]);

  const s = overview?.statusCounts || {};
  return (
    <Box>
      <PageHeader title="DVOC Maintenance" description="Maintenance teams, their survey samples, tasks and ticket processing — kept apart from DVOC Installation data." />
      <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr 1fr", md: "repeat(4, 1fr)" }, gap: 1.5, mb: 2.5 }}>
        <StatCard label="Active teams" value={overview ? overview.activeTeams.toLocaleString() : null} hint={overview ? `${overview.teams} total` : undefined} loading={!overview} />
        <StatCard label="Open tasks" value={overview ? ((s.Todo || 0) + (s["In Progress"] || 0)).toLocaleString() : null} hint={overview ? `${s["In Progress"] || 0} in progress` : undefined} loading={!overview} />
        <StatCard label="Overdue" value={overview ? overview.overdue.toLocaleString() : null} hint="open past the due date" loading={!overview} />
        <StatCard label="Samples this month" value={overview ? overview.samplesThisMonth.toLocaleString() : null} hint={overview ? `${overview.sampleEntriesThisMonth} team entries` : undefined} loading={!overview} />
      </Box>
      <Box component="nav" aria-label="DVOC Maintenance sections" sx={{ display: "flex", gap: 0.5, borderBottom: "1px solid var(--border)", mb: 2.5, overflowX: "auto" }}>
        {MAINTENANCE_TABS.map((t) => (
          <Box
            key={t.to}
            component={NavLink}
            to={t.to}
            sx={{
              px: 1.5, py: 1, fontSize: 13.5, fontWeight: 500, color: "var(--text-secondary)", textDecoration: "none", whiteSpace: "nowrap",
              borderBottom: "2px solid transparent", mb: "-1px",
              "&:hover": { color: "var(--text)" },
              "&.active": { color: "var(--text)", borderBottomColor: "var(--accent)" },
            }}
          >
            {t.label}
          </Box>
        ))}
      </Box>
      <Outlet context={{ refreshOverview }} />
    </Box>
  );
};

export default MaintenanceLayout;
