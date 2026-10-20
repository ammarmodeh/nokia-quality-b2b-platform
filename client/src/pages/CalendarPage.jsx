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
      <PageHeader title="Calendar" description="Tickets someone put on the calendar (from any tracker), GAIA follow-up visits and assessments. Use “Put on calendar” on a row, snag or task to add one; drag an entry to reschedule it." sx={{ mb: 1.5 }} />
      <Tabs value={tab} onChange={(_e, v) => setParams(v === "weeks" ? { tab: "weeks" } : {}, { replace: true })} sx={{ mb: 2 }}>
        <Tab value="schedule" label="Schedule" />
        <Tab value="weeks" label="Week numbers" />
      </Tabs>
      {tab === "schedule" ? <GlobalCalendar /> : <WeekNumbers />}
    </Box>
  );
};

export default CalendarPage;
