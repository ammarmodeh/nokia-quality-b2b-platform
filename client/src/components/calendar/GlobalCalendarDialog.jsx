import { useState } from "react";
import { Link as RouterLink } from "react-router-dom";
import { Box, Button, Dialog, DialogContent, DialogTitle, IconButton, Tab, Tabs, useMediaQuery } from "@mui/material";
import Close from "@mui/icons-material/Close";
import OpenInNew from "@mui/icons-material/OpenInNew";
import GlobalCalendar from "./GlobalCalendar";
import WeekNumbers from "./WeekNumbers";

/** Calendar opened from the top bar: everything dated in the app, plus week numbers. */
const GlobalCalendarDialog = ({ open, onClose }) => {
  const [tab, setTab] = useState("schedule");
  const fullScreen = useMediaQuery("(max-width:900px)");
  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="xl" fullScreen={fullScreen} slotProps={{ paper: { sx: { height: fullScreen ? "100%" : "min(92vh, 980px)" } } }}>
      <DialogTitle sx={{ display: "flex", alignItems: "center", gap: 1, pb: 0 }}>
        <Box sx={{ flex: 1 }}>Calendar</Box>
        <Button size="small" component={RouterLink} to={tab === "weeks" ? "/calendar?tab=weeks" : "/calendar"} onClick={onClose} endIcon={<OpenInNew sx={{ fontSize: 15 }} />}>Full page</Button>
        <IconButton aria-label="Close calendar" onClick={onClose} size="small"><Close fontSize="small" /></IconButton>
      </DialogTitle>
      <Box sx={{ px: 3 }}>
        <Tabs value={tab} onChange={(_e, v) => setTab(v)}>
          <Tab value="schedule" label="Schedule" />
          <Tab value="weeks" label="Week numbers" />
        </Tabs>
      </Box>
      <DialogContent sx={{ display: "flex", flexDirection: "column", minHeight: 0, pt: "16px !important" }}>
        {tab === "schedule" ? <GlobalCalendar onNavigate={onClose} /> : <WeekNumbers />}
      </DialogContent>
    </Dialog>
  );
};

export default GlobalCalendarDialog;
