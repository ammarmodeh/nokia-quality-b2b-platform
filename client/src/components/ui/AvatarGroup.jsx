import { Avatar, Box, Tooltip } from "@mui/material";

const initialsOf = (name = "") =>
  name.split(/\s+/).filter(Boolean).slice(0, 2).map((p) => p[0]?.toUpperCase()).join("") || "?";

const palette = ["#6C47FF", "#2563EB", "#0891B2", "#16A34A", "#D97706", "#DB2777", "#7C3AED", "#EA580C"];
const colorFor = (u) => {
  if (u?.color) return u.color;
  const s = String(u?._id || u?.name || "");
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return palette[h % palette.length];
};

export const UserAvatar = ({ user, size = 22 }) => (
  <Tooltip title={user?.name || user?.email || "User"}>
    <Avatar
      sx={{
        width: size, height: size, fontSize: size * 0.42, fontWeight: 600,
        bgcolor: colorFor(user), color: "#fff", border: "2px solid var(--surface)",
      }}
    >
      {initialsOf(user?.name || user?.email)}
    </Avatar>
  </Tooltip>
);

/** Overlapping avatars with a "+N" overflow chip. */
const AvatarGroup = ({ users = [], max = 3, size = 22 }) => {
  const list = users.filter(Boolean);
  if (!list.length) return null;
  const shown = list.slice(0, max);
  const rest = list.length - shown.length;
  return (
    <Box sx={{ display: "flex", alignItems: "center", "& > *:not(:first-of-type)": { ml: `-${size * 0.3}px` } }}>
      {shown.map((u, i) => <UserAvatar key={u._id || i} user={u} size={size} />)}
      {rest > 0 && (
        <Tooltip title={list.slice(max).map((u) => u.name).join(", ")}>
          <Avatar sx={{ width: size, height: size, fontSize: size * 0.4, fontWeight: 600, bgcolor: "var(--surface-active)", color: "var(--text-secondary)", border: "2px solid var(--surface)" }}>
            +{rest}
          </Avatar>
        </Tooltip>
      )}
    </Box>
  );
};

export default AvatarGroup;
