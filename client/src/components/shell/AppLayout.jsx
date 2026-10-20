import { useEffect, useState, Suspense, lazy } from "react";
import { Outlet, useLocation } from "react-router-dom";
import { useSelector } from "react-redux";
import { Box, Drawer, useMediaQuery } from "@mui/material";
import { useColorScheme } from "@mui/material/styles";
import { toast } from "sonner";
import AppSidebar from "./AppSidebar";
import TopBar from "./TopBar";
import CommandPalette from "./CommandPalette";
import PageLoader from "../ui/PageLoader";
import { RouteActivity } from "../ui/TopLoadingBar";
import api from "../../api/api";

const CalendarDialog = lazy(() => import("../calendar/GlobalCalendarDialog"));
const AddTask = lazy(() => import("../task/AddTask"));
const CustomerIssueDialog = lazy(() => import("../CustomerIssueDialog"));

const COLLAPSE_KEY = "qops.sidebarCollapsed";
const readCollapsed = () => {
  try {
    return localStorage.getItem(COLLAPSE_KEY) === "1";
  } catch {
    return false;
  }
};

const AppLayout = () => {
  const user = useSelector((s) => s?.auth?.user);
  const isDesktop = useMediaQuery("(min-width:1024px)");
  const { pathname } = useLocation();
  const { mode, systemMode } = useColorScheme();
  const resolvedMode = mode === "system" ? systemMode : mode;

  const [collapsed, setCollapsed] = useState(readCollapsed);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [addTaskOpen, setAddTaskOpen] = useState(false);
  const [snagOpen, setSnagOpen] = useState(false);
  // Canvas charts resolve colour tokens at render time, so repaint pages
  // once the new theme attribute has been applied.
  const [paintKey, setPaintKey] = useState(resolvedMode);

  useEffect(() => {
    const id = requestAnimationFrame(() => setPaintKey(resolvedMode));
    return () => cancelAnimationFrame(id);
  }, [resolvedMode]);

  useEffect(() => setMobileOpen(false), [pathname]);

  const toggleCollapsed = () =>
    setCollapsed((c) => {
      try {
        localStorage.setItem(COLLAPSE_KEY, c ? "0" : "1");
      } catch {
        /* storage unavailable */
      }
      return !c;
    });

  const submitSnag = async (formData) => {
    try {
      await api.post("/customer-issues", formData);
      toast.success("Snag reported");
      setSnagOpen(false);
      window.dispatchEvent(new CustomEvent("cin-refresh"));
      window.dispatchEvent(new CustomEvent("dashboard-refresh"));
      return true;
    } catch (error) {
      toast.error(`Couldn’t report the snag: ${error?.response?.data?.message || "check your connection and try again"}. Your entries are kept.`);
      return false;
    }
  };

  const sidebarWidth = collapsed ? 60 : 240;

  return (
    <Box sx={{ display: "flex", minHeight: "100vh", backgroundColor: "var(--bg)" }}>
      {isDesktop ? (
        <Box sx={{ width: sidebarWidth, flexShrink: 0, position: "sticky", top: 0, height: "100vh", transition: "width .18s ease" }}>
          <AppSidebar collapsed={collapsed} onToggleCollapsed={toggleCollapsed} />
        </Box>
      ) : (
        <Drawer open={mobileOpen} onClose={() => setMobileOpen(false)} slotProps={{ paper: { sx: { width: 264, border: 0 } } }}>
          <AppSidebar showCollapse={false} onNavigate={() => setMobileOpen(false)} />
        </Drawer>
      )}

      <Box sx={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column" }}>
        <TopBar
          showMenuButton={!isDesktop}
          onOpenMobileNav={() => setMobileOpen(true)}
          onOpenSearch={() => setPaletteOpen(true)}
          onOpenCalendar={() => setCalendarOpen(true)}
        />
        <Box component="main" id="main" sx={{ flex: 1, minWidth: 0, px: { xs: 2, md: 3, xl: 4 }, py: { xs: 2, md: 3 } }}>
          <Box sx={{ maxWidth: 1600, mx: "auto", width: "100%" }}>
            <Suspense fallback={<RouteActivity><PageLoader /></RouteActivity>}>
              <Outlet key={paintKey} />
            </Suspense>
          </Box>
        </Box>
      </Box>

      <CommandPalette
        open={paletteOpen}
        onOpenChange={setPaletteOpen}
        actions={{
          createTask: () => setAddTaskOpen(true),
          reportSnag: user?.role === "Admin" ? () => setSnagOpen(true) : undefined,
          openCalendar: () => setCalendarOpen(true),
        }}
      />

      <Suspense fallback={null}>
        {calendarOpen && <CalendarDialog open={calendarOpen} onClose={() => setCalendarOpen(false)} />}
        {addTaskOpen && (
          <AddTask open={addTaskOpen} setOpen={setAddTaskOpen} setUpdateRefetchTasks={() => window.dispatchEvent(new CustomEvent("dashboard-refresh"))} />
        )}
        {snagOpen && <CustomerIssueDialog open={snagOpen} onClose={() => setSnagOpen(false)} onSubmit={submitSnag} />}
      </Suspense>
    </Box>
  );
};

export default AppLayout;
