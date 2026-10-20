import { useSearchParams } from "react-router-dom";
import { Box, Tab, Tabs } from "@mui/material";
import PageHeader from "../components/ui/PageHeader";
import GlobalCalendar from "../components/calendar/GlobalCalendar";
import WeekNumbers from "../components/calendar/WeekNumbers";

/** /calendar — the same calendar as the top-bar dialog, full page. */
const CalendarPage = () => {
  const [params, setParams] = useSearchParams();
  const tab = params.get("tab") === "weeks" ? "weeks" : "schedule";
  return (
    <Box sx={{ display: "flex", flexDirection: "column", height: "calc(100vh - var(--topbar-h) - 48px)", minHeight: 620 }}>
      <PageHeader title="Calendar" description="Booked appointments and visits, tasks, snags, assessments and table rows by date. Drag tasks, appointments and rows to reschedule." sx={{ mb: 1.5 }} />
      <Tabs value={tab} onChange={(_e, v) => setParams(v === "weeks" ? { tab: "weeks" } : {}, { replace: true })} sx={{ mb: 2 }}>
        <Tab value="schedule" label="Schedule" />
        <Tab value="weeks" label="Week numbers" />
      </Tabs>
      {tab === "schedule" ? <GlobalCalendar /> : <WeekNumbers />}
    </Box>
  );
};

export default CalendarPage;
