import { useEffect, useMemo, useState } from "react";
import { Command } from "cmdk";
import { useNavigate } from "react-router-dom";
import { useSelector } from "react-redux";
import { Dialog, Box } from "@mui/material";
import { useColorScheme } from "@mui/material/styles";
import SearchIcon from "@mui/icons-material/Search";
import EastIcon from "@mui/icons-material/East";
import AddIcon from "@mui/icons-material/Add";
import CalendarMonthOutlined from "@mui/icons-material/CalendarMonthOutlined";
import ContrastOutlined from "@mui/icons-material/ContrastOutlined";
import AssignmentOutlined from "@mui/icons-material/AssignmentOutlined";
import api from "../../api/api";
import { flatPages } from "./navConfig";
import Kbd from "../ui/Kbd";

const styles = {
  "& [cmdk-root]": { display: "flex", flexDirection: "column", maxHeight: "min(70vh, 520px)" },
  "& [cmdk-input]": {
    border: 0, outline: 0, width: "100%", background: "transparent", color: "var(--text)",
    fontSize: 14, fontFamily: "inherit", "&::placeholder": { color: "var(--text-muted)" },
  },
  "& [cmdk-list]": { overflowY: "auto", p: 0.75 },
  "& [cmdk-group-heading]": { px: 1.25, pt: 1.25, pb: 0.5, fontSize: 11, fontWeight: 500, color: "var(--text-muted)" },
  "& [cmdk-item]": {
    display: "flex", alignItems: "center", gap: 1.25, height: 36, px: 1.25, borderRadius: "6px",
    fontSize: 13, color: "var(--text)", cursor: "pointer", userSelect: "none",
    "& .cmd-icon": { fontSize: 17, color: "var(--text-muted)" },
    "& .cmd-hint": { ml: "auto", fontSize: 11.5, color: "var(--text-muted)" },
  },
  "& [cmdk-item][data-selected='true']": { backgroundColor: "var(--accent-subtle)", "& .cmd-icon": { color: "var(--accent-text)" } },
  "& [cmdk-empty]": { py: 4, textAlign: "center", fontSize: 13, color: "var(--text-secondary)" },
  "& [cmdk-loading]": { px: 1.25, py: 1, fontSize: 12, color: "var(--text-muted)" },
};

/**
 * Global ⌘K / Ctrl+K palette: pages, actions and live task search (by SLID).
 * `actions` lets the shell inject handlers (open calendar, create task…).
 */
const CommandPalette = ({ open, onOpenChange, actions = {} }) => {
  const user = useSelector((s) => s?.auth?.user);
  const navigate = useNavigate();
  const { mode, setMode } = useColorScheme();
  const [query, setQuery] = useState("");
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(false);
  const pages = useMemo(() => flatPages(user), [user]);

  useEffect(() => {
    const onKey = (e) => {
      if ((e.key === "k" || e.key === "K") && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        onOpenChange(!open);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onOpenChange]);

  useEffect(() => {
    if (!open) setQuery("");
  }, [open]);

  useEffect(() => {
    const q = query.trim();
    if (q.length < 3) {
      setTasks([]);
      return;
    }
    let cancelled = false;
    setLoading(true);
    const t = setTimeout(async () => {
      try {
        const { data } = await api.get("/tasks/search-tasks", { params: { query: q } });
        if (!cancelled) setTasks((data || []).filter((x) => !x.isDeleted).slice(0, 8));
      } catch {
        if (!cancelled) setTasks([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }, 250);
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, [query]);

  const run = (fn) => {
    onOpenChange(false);
    fn();
  };

  return (
    <Dialog
      open={open}
      onClose={() => onOpenChange(false)}
      fullWidth
      maxWidth="sm"
      slotProps={{ paper: { sx: { alignSelf: "flex-start", mt: "12vh", overflow: "hidden", borderRadius: "12px" } } }}
    >
      <Box sx={styles}>
        <Command label="Command menu" shouldFilter loop>
          <Box sx={{ display: "flex", alignItems: "center", gap: 1.25, px: 2, height: 52, borderBottom: "1px solid var(--border)" }}>
            <SearchIcon sx={{ fontSize: 19, color: "var(--text-muted)" }} />
            <Command.Input autoFocus value={query} onValueChange={setQuery} placeholder="Search pages, actions or a task SLID…" />
            <Kbd>Esc</Kbd>
          </Box>
          <Command.List>
            <Command.Empty>No results for “{query}”.</Command.Empty>

            {(loading || tasks.length > 0) && (
              <Command.Group heading="Tasks">
                {loading && <Command.Loading>Searching tasks…</Command.Loading>}
                {tasks.map((t) => (
                  <Command.Item key={t._id} value={`task ${t.slid} ${t.customerName || ""} ${t.requestNumber || ""}`} onSelect={() => run(() => navigate(`/tasks/view-task/${t._id}`))}>
                    <AssignmentOutlined className="cmd-icon" />
                    <span>{t.slid}</span>
                    <span className="cmd-hint">{t.customerName || t.teamName || ""}</span>
                  </Command.Item>
                ))}
              </Command.Group>
            )}

            <Command.Group heading="Pages">
              {pages.map((p) => {
                const Icon = p.icon;
                return (
                  <Command.Item key={p.label} value={`${p.label} ${p.section} ${p.keywords || ""}`} onSelect={() => run(() => navigate(p.to))}>
                    {Icon ? <Icon className="cmd-icon" /> : <EastIcon className="cmd-icon" />}
                    <span>{p.label}</span>
                    <span className="cmd-hint">{p.section}</span>
                  </Command.Item>
                );
              })}
            </Command.Group>

            <Command.Group heading="Actions">
              {actions.createTask && (
                <Command.Item value="create new task add" onSelect={() => run(actions.createTask)}>
                  <AddIcon className="cmd-icon" /> Create task
                </Command.Item>
              )}
              {actions.reportSnag && (
                <Command.Item value="report ojo snag issue new" onSelect={() => run(actions.reportSnag)}>
                  <AddIcon className="cmd-icon" /> Report OJO snag
                </Command.Item>
              )}
              {actions.openCalendar && (
                <Command.Item value="open calendar schedule" onSelect={() => run(actions.openCalendar)}>
                  <CalendarMonthOutlined className="cmd-icon" /> Open calendar
                </Command.Item>
              )}
              <Command.Item value="toggle theme dark light mode appearance" onSelect={() => run(() => setMode(mode === "dark" ? "light" : "dark"))}>
                <ContrastOutlined className="cmd-icon" /> Toggle light / dark theme
              </Command.Item>
            </Command.Group>
          </Command.List>
        </Command>
      </Box>
    </Dialog>
  );
};

export default CommandPalette;
