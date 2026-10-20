import { useEffect, useState } from "react";
import { Link as RouterLink, useSearchParams } from "react-router-dom";
import { Box, Button, Tab, Tabs, Typography } from "@mui/material";
import ViewKanbanOutlined from "@mui/icons-material/ViewKanbanOutlined";
import ArrowForward from "@mui/icons-material/ArrowForward";
import api from "../../api/api";
import PageHeader from "../../components/ui/PageHeader";
import Badge from "../../components/ui/Badge";
import { taxonomyByLabel } from "../../constants/taxonomy";
import CategoryTables from "./CategoryTables";

const COPY = {
  "Closure Call": "Call-backs after installation: survey answers, scores and follow-up, in tables your team shapes.",
  DVOC: "Detractor and neutral survey cases. Installation cases are the Tasks board; add tables for maintenance and anything else.",
};

/** Workspace for a tracker whose records live in custom tables (Closure Call, DVOC, and trackers added online). */
const CategoryWorkspace = ({ category, actions }) => {
  const tax = taxonomyByLabel[category];
  const subs = tax?.subs || [];
  const [params, setParams] = useSearchParams();
  const tab = subs.includes(params.get("sub")) ? params.get("sub") : subs.length > 1 ? "all" : subs[0] || null;
  const [taskCount, setTaskCount] = useState(null);

  useEffect(() => {
    if (category !== "DVOC") return;
    api.get("/tasks/get-all-tasks").then(({ data }) => setTaskCount((Array.isArray(data) ? data : data?.tasks || []).length)).catch(() => setTaskCount(null));
  }, [category]);

  const showTasks = category === "DVOC" && (tab === "all" || tab === "Installation");
  return (
    <Box>
      <PageHeader title={category} description={COPY[category] || tax?.description || "Tables for this tracker. Map a SLID and a Team code field so rows count towards each team."} actions={actions} />
      {subs.length > 1 && (
        <Tabs value={tab} onChange={(_e, v) => setParams((p) => { const n = new URLSearchParams(p); if (v === "all") n.delete("sub"); else n.set("sub", v); return n; }, { replace: true })} sx={{ mb: 2.5 }} aria-label="Sub-category">
          <Tab value="all" label="All" />
          {subs.map((s) => <Tab key={s} value={s} label={s} />)}
        </Tabs>
      )}
      {showTasks && (
        <Box sx={{ mb: 3, p: 2, borderRadius: "10px", border: "1px solid var(--border)", backgroundColor: "var(--surface)", display: "flex", alignItems: "center", gap: 2, flexWrap: "wrap", boxShadow: "var(--shadow-xs)" }}>
          <Box sx={{ width: 36, height: 36, borderRadius: "8px", display: "grid", placeItems: "center", backgroundColor: `color-mix(in srgb, ${tax.color} 14%, transparent)` }}>
            <ViewKanbanOutlined sx={{ fontSize: 20, color: tax.color }} />
          </Box>
          <Box sx={{ flex: 1, minWidth: 200 }}>
            <Typography sx={{ fontSize: 14, fontWeight: 600 }}>DVOC · Installation tasks</Typography>
            <Typography sx={{ fontSize: 12.5, color: "var(--text-secondary)" }}>NPS detractor and neutral cases on the Tasks board, table and calendar.</Typography>
          </Box>
          {taskCount !== null && <Badge>{taskCount.toLocaleString()} tasks</Badge>}
          <Button component={RouterLink} to="/tasks-list" variant="outlined" endIcon={<ArrowForward sx={{ fontSize: 16 }} />}>Open tasks</Button>
        </Box>
      )}
      <CategoryTables category={category} sub={tab && tab !== "all" ? tab : undefined} title={tab && tab !== "all" && subs.length > 1 ? `${tab} tables` : "Tables"} />
    </Box>
  );
};

export default CategoryWorkspace;
