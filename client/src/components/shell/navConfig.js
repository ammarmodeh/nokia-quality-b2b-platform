import DashboardOutlined from "@mui/icons-material/SpaceDashboardOutlined";
import ViewKanbanOutlined from "@mui/icons-material/ViewKanbanOutlined";
import CalendarMonthOutlined from "@mui/icons-material/CalendarMonthOutlined";
import ReportProblemOutlined from "@mui/icons-material/ReportProblemOutlined";
import FactCheckOutlined from "@mui/icons-material/FactCheckOutlined";
import GroupsOutlined from "@mui/icons-material/GroupsOutlined";
import InsightsOutlined from "@mui/icons-material/InsightsOutlined";
import ScienceOutlined from "@mui/icons-material/ScienceOutlined";
import EngineeringOutlined from "@mui/icons-material/EngineeringOutlined";
import QuizOutlined from "@mui/icons-material/QuizOutlined";
import ListAltOutlined from "@mui/icons-material/ListAltOutlined";
import SettingsOutlined from "@mui/icons-material/SettingsOutlined";

// Single source of truth for the sidebar and the command palette.
// Only pages that are part of the redesign scope are listed here; anything
// else stays in the codebase but is not reachable from the UI.
export const NAV_SECTIONS = [
  {
    title: "Overview",
    items: [{ label: "Dashboard", to: "/dashboard", icon: DashboardOutlined }],
  },
  {
    title: "Work",
    items: [
      { label: "Tasks", to: "/tasks-list", icon: ViewKanbanOutlined, keywords: "board list dvoc" },
      { label: "Calendar", to: "/calendar", icon: CalendarMonthOutlined },
    ],
  },
  {
    title: "Trackers",
    items: [
      { label: "OJO Snags", to: "/ojo-snags", icon: ReportProblemOutlined, keywords: "customer issues snags" },
      {
        label: "DVOC",
        icon: FactCheckOutlined,
        children: [{ label: "Installation", to: "/tasks-list", keywords: "dvoc tasks nps" }],
      },
    ],
  },
  {
    title: "Teams",
    items: [{ label: "Field Teams", to: "/fieldTeams", icon: GroupsOutlined, keywords: "technicians members" }],
  },
  {
    title: "Assessments",
    items: [
      { label: "Assessment Dashboard", to: "/assessment-dashboard", icon: InsightsOutlined },
      { label: "Lab Assessment", to: "/lab-assessment", icon: ScienceOutlined },
      { label: "On-the-Job Assessment", to: "/on-the-job-assessment", icon: EngineeringOutlined },
      { label: "Manage Quiz", to: "/manage-quiz", icon: QuizOutlined, adminOnly: true, keywords: "questions technical" },
    ],
  },
  {
    title: "Admin",
    items: [
      { label: "Dropdown Management", to: "/dropdown-management", icon: ListAltOutlined, adminOnly: true, keywords: "options lists taxonomy" },
      { label: "Settings", to: "/settings", icon: SettingsOutlined },
    ],
  },
];

export const visibleSections = (user) =>
  NAV_SECTIONS.map((s) => ({
    ...s,
    items: s.items.filter((i) => !i.adminOnly || user?.role === "Admin"),
  })).filter((s) => s.items.length);

// Flat list of leaf pages (for breadcrumbs + command palette)
export const flatPages = (user) => {
  const out = [];
  for (const s of visibleSections(user)) {
    for (const i of s.items) {
      if (i.children) {
        for (const c of i.children) out.push({ ...c, label: `${i.label} · ${c.label}`, section: s.title, icon: i.icon });
      } else out.push({ ...i, section: s.title });
    }
  }
  return out;
};

// Extra (non-nav) pages that still need a title in the top bar
const EXTRA_TITLES = {
  "/profile": ["Account", "Profile"],
  "/change-password": ["Account", "Change password"],
  "/team": ["Settings", "Users & roles"],
};

export const resolveCrumbs = (pathname, user) => {
  if (EXTRA_TITLES[pathname]) return EXTRA_TITLES[pathname];
  if (pathname.startsWith("/tasks/view-task")) return ["Tasks", "Task details"];
  const match = flatPages(user)
    .filter((p) => pathname === p.to || pathname.startsWith(p.to + "/"))
    .sort((a, b) => b.to.length - a.to.length)[0];
  return match ? [match.section, match.label] : [];
};
