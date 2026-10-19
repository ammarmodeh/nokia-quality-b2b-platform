import { useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import { Avatar, Box, Divider, ListItemIcon, Menu, MenuItem, Typography, IconButton } from "@mui/material";
import { useColorScheme } from "@mui/material/styles";
import PersonOutline from "@mui/icons-material/PersonOutline";
import LockOutlined from "@mui/icons-material/LockOutlined";
import ManageAccountsOutlined from "@mui/icons-material/ManageAccountsOutlined";
import SettingsOutlined from "@mui/icons-material/SettingsOutlined";
import LogoutOutlined from "@mui/icons-material/LogoutOutlined";
import LightModeOutlined from "@mui/icons-material/LightModeOutlined";
import DarkModeOutlined from "@mui/icons-material/DarkModeOutlined";
import DesktopWindowsOutlined from "@mui/icons-material/DesktopWindowsOutlined";
import { logout } from "../../redux/slices/authSlice";
import SegmentedControl from "../ui/SegmentedControl";

const initials = (name = "") =>
  name.split(/\s+/).filter(Boolean).slice(0, 2).map((p) => p[0]?.toUpperCase()).join("") || "?";

const UserMenu = () => {
  const user = useSelector((s) => s?.auth?.user);
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { mode, setMode } = useColorScheme();
  const [anchor, setAnchor] = useState(null);

  const go = (path) => {
    setAnchor(null);
    navigate(path);
  };

  const signOut = () => {
    setAnchor(null);
    dispatch(logout());
    navigate("/auth");
  };

  return (
    <>
      <IconButton onClick={(e) => setAnchor(e.currentTarget)} aria-label="Account menu" aria-haspopup="menu" size="small" sx={{ p: 0.25 }}>
        <Avatar sx={{ width: 28, height: 28, fontSize: 12, fontWeight: 600, bgcolor: user?.color || "var(--accent)", color: "var(--on-accent)" }}>
          {initials(user?.name)}
        </Avatar>
      </IconButton>
      <Menu
        anchorEl={anchor}
        open={Boolean(anchor)}
        onClose={() => setAnchor(null)}
        anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
        transformOrigin={{ vertical: "top", horizontal: "right" }}
        slotProps={{ paper: { sx: { width: 260, mt: 0.75 } } }}
      >
        <Box sx={{ px: 1.5, py: 1.25, display: "flex", gap: 1.25, alignItems: "center" }}>
          <Avatar sx={{ width: 32, height: 32, fontSize: 13, bgcolor: user?.color || "var(--accent)", color: "var(--on-accent)" }}>
            {initials(user?.name)}
          </Avatar>
          <Box sx={{ minWidth: 0 }}>
            <Typography noWrap sx={{ fontSize: 13, fontWeight: 600 }}>{user?.name || "Signed in"}</Typography>
            <Typography noWrap sx={{ fontSize: 12, color: "var(--text-secondary)" }}>{user?.email}</Typography>
          </Box>
        </Box>
        <Divider sx={{ my: 0.5 }} />
        <MenuItem onClick={() => go("/settings?tab=profile")}>
          <ListItemIcon><PersonOutline fontSize="small" /></ListItemIcon>Profile
        </MenuItem>
        <MenuItem onClick={() => go("/settings?tab=security")}>
          <ListItemIcon><LockOutlined fontSize="small" /></ListItemIcon>Change password
        </MenuItem>
        {user?.role === "Admin" && (
          <MenuItem onClick={() => go("/settings?tab=users")}>
            <ListItemIcon><ManageAccountsOutlined fontSize="small" /></ListItemIcon>Users &amp; roles
          </MenuItem>
        )}
        <MenuItem onClick={() => go("/settings")}>
          <ListItemIcon><SettingsOutlined fontSize="small" /></ListItemIcon>Settings
        </MenuItem>
        <Divider sx={{ my: 0.5 }} />
        <Box sx={{ px: 1.5, py: 1, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 1 }}>
          <Typography sx={{ fontSize: 13, color: "var(--text-secondary)" }}>Theme</Typography>
          <SegmentedControl
            size="sm"
            ariaLabel="Theme"
            value={mode || "system"}
            onChange={setMode}
            options={[
              { value: "light", icon: <LightModeOutlined sx={{ fontSize: 15 }} />, label: "Light" },
              { value: "dark", icon: <DarkModeOutlined sx={{ fontSize: 15 }} />, label: "Dark" },
              { value: "system", icon: <DesktopWindowsOutlined sx={{ fontSize: 15 }} />, label: "System" },
            ]}
            iconOnly
          />
        </Box>
        <Divider sx={{ my: 0.5 }} />
        <MenuItem onClick={signOut}>
          <ListItemIcon><LogoutOutlined fontSize="small" /></ListItemIcon>Sign out
        </MenuItem>
      </Menu>
    </>
  );
};

export default UserMenu;
