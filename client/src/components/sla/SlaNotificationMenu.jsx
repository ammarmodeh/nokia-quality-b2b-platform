import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  Badge as MuiBadge,
  Box,
  Divider,
  IconButton,
  Popover,
  Tooltip,
  Typography,
} from "@mui/material";
import NotificationsNoneOutlined from "@mui/icons-material/NotificationsNoneOutlined";
import ErrorOutline from "@mui/icons-material/ErrorOutline";
import WarningAmberOutlined from "@mui/icons-material/WarningAmberOutlined";
import CheckCircleOutline from "@mui/icons-material/CheckCircleOutline";
import { slaApi } from "../../api/slaApi";
import Badge from "../ui/Badge";

const SlaNotificationMenu = () => {
  const navigate = useNavigate();
  const [data, setData] = useState({ breachedCount: 0, aboutToBreachCount: 0, totalAlerts: 0, items: [] });
  const [anchor, setAnchor] = useState(null);

  const load = async () => {
    try {
      const res = await slaApi.notifications();
      setData(res || { breachedCount: 0, aboutToBreachCount: 0, totalAlerts: 0, items: [] });
    } catch {
      // ignore
    }
  };

  useEffect(() => {
    load();
    const interval = setInterval(load, 30000); // Poll every 30s
    return () => clearInterval(interval);
  }, []);

  const open = Boolean(anchor);

  return (
    <>
      <Tooltip title={data.totalAlerts > 0 ? `${data.totalAlerts} SLA alerts` : "SLA alerts"}>
        <IconButton
          size="small"
          onClick={(e) => setAnchor(e.currentTarget)}
          aria-label="SLA notifications"
          sx={{ width: 32, height: 32, border: "1px solid var(--border)", color: data.breachedCount > 0 ? "var(--danger)" : data.aboutToBreachCount > 0 ? "var(--warning)" : "var(--text-secondary)", boxShadow: "var(--shadow-xs)" }}
        >
          <MuiBadge
            badgeContent={data.totalAlerts}
            color={data.breachedCount > 0 ? "error" : "warning"}
            overlap="circular"
            sx={{ "& .MuiBadge-badge": { fontSize: 10, height: 16, minWidth: 16 } }}
          >
            <NotificationsNoneOutlined sx={{ fontSize: 18 }} />
          </MuiBadge>
        </IconButton>
      </Tooltip>

      <Popover
        open={open}
        anchorEl={anchor}
        onClose={() => setAnchor(null)}
        anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
        transformOrigin={{ vertical: "top", horizontal: "right" }}
        slotProps={{ paper: { sx: { width: 360, maxHeight: 480, borderRadius: "10px", p: 0, overflow: "hidden", border: "1px solid var(--border)", boxShadow: "var(--shadow-lg)" } } }}
      >
        <Box sx={{ p: 1.5, display: "flex", alignItems: "center", justifyContent: "space-between", backgroundColor: "var(--surface)" }}>
          <Typography sx={{ fontSize: 14, fontWeight: 600 }}>SLA Alerts</Typography>
          <Box sx={{ display: "flex", gap: 0.75 }}>
            {data.breachedCount > 0 && <Badge tone="danger">{data.breachedCount} breached</Badge>}
            {data.aboutToBreachCount > 0 && <Badge tone="warning">{data.aboutToBreachCount} near breach</Badge>}
          </Box>
        </Box>
        <Divider />

        <Box sx={{ overflowY: "auto", maxHeight: 400 }}>
          {data.items.length === 0 ? (
            <Box sx={{ p: 3, textAlign: "center", color: "var(--text-muted)" }}>
              <CheckCircleOutline sx={{ fontSize: 28, color: "var(--success)", mb: 0.5 }} />
              <Typography sx={{ fontSize: 13, fontWeight: 500 }}>All tickets within SLA</Typography>
              <Typography sx={{ fontSize: 12 }}>No breached or expiring SLA deadlines.</Typography>
            </Box>
          ) : (
            data.items.map((item) => (
              <Box
                key={item.id}
                onClick={() => {
                  setAnchor(null);
                  navigate(item.link);
                }}
                sx={{
                  p: 1.5,
                  display: "flex",
                  gap: 1.25,
                  alignItems: "flex-start",
                  borderBottom: "1px solid var(--border)",
                  cursor: "pointer",
                  "&:hover": { backgroundColor: "var(--surface-hover)" },
                  "&:last-child": { borderBottom: 0 },
                }}
              >
                {item.type === "breached" ? (
                  <ErrorOutline sx={{ color: "var(--danger)", fontSize: 20, mt: 0.25, flexShrink: 0 }} />
                ) : (
                  <WarningAmberOutlined sx={{ color: "var(--warning)", fontSize: 20, mt: 0.25, flexShrink: 0 }} />
                )}

                <Box sx={{ flex: 1, minWidth: 0 }}>
                  <Typography noWrap sx={{ fontSize: 13, fontWeight: 600 }} dir="auto">
                    {item.title || "Ticket"}
                  </Typography>
                  <Box sx={{ display: "flex", gap: 1, fontSize: 12, color: "var(--text-secondary)", mt: 0.25, flexWrap: "wrap" }}>
                    {item.slid && <span>SLID: {item.slid}</span>}
                    {item.category && <span>· {item.category}</span>}
                    {item.teamName && <span>· {item.teamName}</span>}
                  </Box>
                  <Typography
                    sx={{
                      fontSize: 11.5,
                      fontWeight: 500,
                      mt: 0.5,
                      color: item.type === "breached" ? "var(--danger)" : "var(--warning)",
                    }}
                  >
                    {item.type === "breached"
                      ? `Breached by ${Math.abs(item.diffHours)} hours`
                      : `Expires in ${item.diffHours} hours`}
                  </Typography>
                </Box>
              </Box>
            ))
          )}
        </Box>
      </Popover>
    </>
  );
};

export default SlaNotificationMenu;
