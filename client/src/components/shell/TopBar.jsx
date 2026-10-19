import { useLocation } from "react-router-dom";
import { useSelector } from "react-redux";
import { Box, IconButton, Tooltip, Typography } from "@mui/material";
import MenuIcon from "@mui/icons-material/Menu";
import SearchIcon from "@mui/icons-material/Search";
import CalendarMonthOutlined from "@mui/icons-material/CalendarMonthOutlined";
import UserMenu from "./UserMenu";
import Kbd from "../ui/Kbd";
import { resolveCrumbs } from "./navConfig";

const isMac = typeof navigator !== "undefined" && /Mac|iPhone|iPad/.test(navigator.platform);

const TopBar = ({ onOpenMobileNav, onOpenSearch, onOpenCalendar, showMenuButton }) => {
  const user = useSelector((s) => s?.auth?.user);
  const { pathname } = useLocation();
  const crumbs = resolveCrumbs(pathname, user);

  return (
    <Box
      component="header"
      sx={{
        height: "var(--topbar-h)", flexShrink: 0, display: "flex", alignItems: "center", gap: 1.5,
        px: { xs: 2, md: 3 }, borderBottom: "1px solid var(--border)", backgroundColor: "var(--surface)",
        position: "sticky", top: 0, zIndex: 20,
      }}
    >
      {showMenuButton && (
        <IconButton size="small" onClick={onOpenMobileNav} aria-label="Open navigation" sx={{ ml: -0.5, color: "var(--text-secondary)" }}>
          <MenuIcon fontSize="small" />
        </IconButton>
      )}

      <Box component="ol" aria-label="Breadcrumb" sx={{ display: "flex", alignItems: "center", gap: 1, m: 0, p: 0, listStyle: "none", minWidth: 0, flex: 1 }}>
        {crumbs.map((c, i) => (
          <Box component="li" key={c + i} sx={{ display: "flex", alignItems: "center", gap: 1, minWidth: 0, ...(i < crumbs.length - 1 ? { display: { xs: "none", sm: "flex" } } : {}) }}>
            {i > 0 && <Typography component="span" sx={{ color: "var(--border-strong)", fontSize: 14, display: { xs: "none", sm: "inline" } }}>/</Typography>}
            <Typography
              noWrap
              aria-current={i === crumbs.length - 1 ? "page" : undefined}
              sx={{ fontSize: 13.5, fontWeight: i === crumbs.length - 1 ? 500 : 400, color: i === crumbs.length - 1 ? "var(--text)" : "var(--text-secondary)" }}
            >
              {c}
            </Typography>
          </Box>
        ))}
      </Box>

      <Box
        component="button"
        type="button"
        onClick={onOpenSearch}
        aria-label="Search (Ctrl K)"
        sx={{
          display: { xs: "none", sm: "flex" }, alignItems: "center", gap: 1, height: 32, width: { sm: 200, md: 260 },
          px: 1.25, borderRadius: "6px", border: "1px solid var(--border)", backgroundColor: "var(--surface)",
          color: "var(--text-muted)", font: "inherit", fontSize: 13, cursor: "pointer", boxShadow: "var(--shadow-xs)",
          "&:hover": { borderColor: "var(--border-strong)" },
          "&:focus-visible": { outline: "2px solid var(--focus-ring)", outlineOffset: 1 },
        }}
      >
        <SearchIcon sx={{ fontSize: 17 }} />
        <span style={{ flex: 1, textAlign: "left" }}>Find…</span>
        <Kbd>{isMac ? "⌘" : "Ctrl"}</Kbd>
        <Kbd>K</Kbd>
      </Box>
      <IconButton size="small" onClick={onOpenSearch} aria-label="Search" sx={{ display: { xs: "inline-flex", sm: "none" }, color: "var(--text-secondary)" }}>
        <SearchIcon fontSize="small" />
      </IconButton>

      <Tooltip title="Calendar">
        <IconButton
          size="small"
          onClick={onOpenCalendar}
          aria-label="Open calendar"
          sx={{ width: 32, height: 32, border: "1px solid var(--border)", color: "var(--text-secondary)", boxShadow: "var(--shadow-xs)" }}
        >
          <CalendarMonthOutlined sx={{ fontSize: 17 }} />
        </IconButton>
      </Tooltip>

      <UserMenu />
    </Box>
  );
};

export default TopBar;
