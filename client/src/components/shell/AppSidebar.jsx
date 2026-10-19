import { useMemo, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { useSelector } from "react-redux";
import { Box, Tooltip, IconButton, Typography } from "@mui/material";
import ChevronRight from "@mui/icons-material/ChevronRight";
import KeyboardDoubleArrowLeft from "@mui/icons-material/KeyboardDoubleArrowLeft";
import KeyboardDoubleArrowRight from "@mui/icons-material/KeyboardDoubleArrowRight";
import { visibleSections } from "./navConfig";

export const Brand = ({ collapsed }) => (
  <Box sx={{ display: "flex", alignItems: "center", gap: 1.25, minWidth: 0 }}>
    <Box
      sx={{
        width: 28, height: 28, borderRadius: "8px", flexShrink: 0,
        background: "linear-gradient(135deg, var(--accent) 0%, #8E6CFF 100%)",
        color: "var(--on-accent)", display: "grid", placeItems: "center",
        fontSize: 12, fontWeight: 700, letterSpacing: "-0.02em",
      }}
    >
      QO
    </Box>
    {!collapsed && (
      <Typography noWrap sx={{ fontWeight: 600, fontSize: 14, color: "var(--text)", letterSpacing: "-0.01em" }}>
        QOps Tracker
      </Typography>
    )}
  </Box>
);

const itemSx = (active, collapsed) => ({
  display: "flex",
  alignItems: "center",
  gap: 1.25,
  height: 32,
  px: collapsed ? 0 : 1.25,
  justifyContent: collapsed ? "center" : "flex-start",
  borderRadius: "6px",
  fontSize: 13,
  fontWeight: 500,
  textDecoration: "none",
  cursor: "pointer",
  color: active ? "var(--text)" : "var(--text-secondary)",
  backgroundColor: active ? "var(--surface-active)" : "transparent",
  transition: "background-color .12s ease, color .12s ease",
  "&:hover": { backgroundColor: active ? "var(--surface-active)" : "var(--surface-hover)", color: "var(--text)" },
  "& .nav-icon": { fontSize: 18, color: active ? "var(--accent-text)" : "var(--text-muted)" },
  "&:focus-visible": { outline: "2px solid var(--focus-ring)", outlineOffset: 1 },
});

const AppSidebar = ({ collapsed = false, onToggleCollapsed, onNavigate, showCollapse = true }) => {
  const user = useSelector((s) => s?.auth?.user);
  const { pathname } = useLocation();
  const sections = useMemo(() => visibleSections(user), [user]);
  const [openGroups, setOpenGroups] = useState({});

  // Only one item is highlighted, even when two links share a path.
  const activeKey = useMemo(() => {
    for (const s of sections)
      for (const i of s.items) {
        const links = i.children ? i.children.map((c) => ({ key: `${i.label}/${c.label}`, to: c.to })) : [{ key: i.label, to: i.to }];
        for (const l of links) if (pathname === l.to || pathname.startsWith(l.to + "/")) return l.key;
      }
    return null;
  }, [sections, pathname]);

  return (
    <Box
      component="nav"
      aria-label="Main"
      sx={{ height: "100%", display: "flex", flexDirection: "column", backgroundColor: "var(--surface)", borderRight: "1px solid var(--border)" }}
    >
      <Box sx={{ height: "var(--topbar-h)", display: "flex", alignItems: "center", px: collapsed ? 0 : 2, justifyContent: collapsed ? "center" : "flex-start", flexShrink: 0 }}>
        <Link to="/dashboard" onClick={onNavigate} style={{ textDecoration: "none" }} aria-label="QOps Tracker home">
          <Brand collapsed={collapsed} />
        </Link>
      </Box>

      <Box sx={{ flex: 1, overflowY: "auto", px: collapsed ? 1 : 1.5, pb: 2 }}>
        {sections.map((section) => (
          <Box key={section.title} sx={{ mt: 2 }}>
            {!collapsed && (
              <Typography sx={{ px: 1.25, mb: 0.5, fontSize: 11, fontWeight: 500, color: "var(--text-muted)", letterSpacing: "0.02em" }}>
                {section.title}
              </Typography>
            )}
            <Box sx={{ display: "flex", flexDirection: "column", gap: "2px" }}>
              {section.items.map((item) => {
                const Icon = item.icon;
                if (item.children) {
                  const childActive = item.children.some((c) => activeKey === `${item.label}/${c.label}`);
                  const open = openGroups[item.label] ?? childActive;
                  if (collapsed) {
                    const first = item.children[0];
                    return (
                      <Tooltip key={item.label} title={`${item.label} · ${first.label}`} placement="right">
                        <Box component={Link} to={first.to} onClick={onNavigate} sx={itemSx(childActive, true)} aria-label={item.label}>
                          <Icon className="nav-icon" />
                        </Box>
                      </Tooltip>
                    );
                  }
                  return (
                    <Box key={item.label}>
                      <Box
                        component="button"
                        type="button"
                        aria-expanded={open}
                        onClick={() => setOpenGroups((g) => ({ ...g, [item.label]: !open }))}
                        sx={{ ...itemSx(false, false), width: "100%", border: 0, background: "none", font: "inherit" }}
                      >
                        <Icon className="nav-icon" />
                        <span style={{ flex: 1, textAlign: "left" }}>{item.label}</span>
                        <ChevronRight sx={{ fontSize: 16, color: "var(--text-muted)", transform: open ? "rotate(90deg)" : "none", transition: "transform .15s" }} />
                      </Box>
                      {open && (
                        <Box sx={{ ml: "21px", pl: 1.25, borderLeft: "1px solid var(--border)", display: "flex", flexDirection: "column", gap: "2px", mt: "2px" }}>
                          {item.children.map((c) => (
                            <Box key={c.label} component={Link} to={c.to} onClick={onNavigate} sx={itemSx(activeKey === `${item.label}/${c.label}`, false)}>
                              {c.label}
                            </Box>
                          ))}
                        </Box>
                      )}
                    </Box>
                  );
                }
                const active = activeKey === item.label;
                const link = (
                  <Box key={item.label} component={Link} to={item.to} onClick={onNavigate} sx={itemSx(active, collapsed)} aria-current={active ? "page" : undefined} aria-label={collapsed ? item.label : undefined}>
                    <Icon className="nav-icon" />
                    {!collapsed && <span>{item.label}</span>}
                  </Box>
                );
                return collapsed ? (
                  <Tooltip key={item.label} title={item.label} placement="right">{link}</Tooltip>
                ) : link;
              })}
            </Box>
          </Box>
        ))}
      </Box>

      {showCollapse && (
        <Box sx={{ borderTop: "1px solid var(--border)", p: 1, display: "flex", justifyContent: collapsed ? "center" : "flex-end" }}>
          <Tooltip title={collapsed ? "Expand sidebar" : "Collapse sidebar"} placement="right">
            <IconButton size="small" onClick={onToggleCollapsed} aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"} sx={{ color: "var(--text-muted)" }}>
              {collapsed ? <KeyboardDoubleArrowRight fontSize="small" /> : <KeyboardDoubleArrowLeft fontSize="small" />}
            </IconButton>
          </Tooltip>
        </Box>
      )}
    </Box>
  );
};

export default AppSidebar;
