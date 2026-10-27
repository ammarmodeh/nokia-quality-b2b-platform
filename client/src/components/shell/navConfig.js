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
import PhoneCallbackOutlined from "@mui/icons-material/PhoneCallbackOutlined";
import SupportAgentOutlined from "@mui/icons-material/SupportAgentOutlined";
import GavelOutlined from "@mui/icons-material/GavelOutlined";
import VerifiedOutlined from "@mui/icons-material/VerifiedOutlined";
import TrackChangesOutlined from "@mui/icons-material/TrackChangesOutlined";
import QueryStatsOutlined from "@mui/icons-material/QueryStatsOutlined";
import TrendingDownOutlined from "@mui/icons-material/TrendingDownOutlined";
import TimerOutlined from "@mui/icons-material/TimerOutlined";
import { customTrackers } from "../../constants/taxonomy";

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
      { label: "DVOC Installations", to: "/dvoc-installations", icon: ViewKanbanOutlined, keywords: "tasks board list dvoc installation" },
      { label: "Calendar", to: "/calendar", icon: CalendarMonthOutlined },
    ],
  },
  {
    title: "Trackers",
    // Custom tables are added under their tracker at runtime (see withCustomTables).
    items: [
      { label: "Closure Call", to: "/closure-call", icon: PhoneCallbackOutlined, category: "Closure Call", keywords: "call back survey" },
      { label: "OJO Snags", to: "/ojo-snags", icon: ReportProblemOutlined, category: "OJO Snags", keywords: "customer issues snags" },
      {
        label: "DVOC",
        icon: FactCheckOutlined,
        category: "DVOC",
        children: [
          { label: "Installation tasks", to: "/dvoc-installations", keywords: "dvoc tasks nps" },
          { label: "Maintenance", to: "/dvoc-maintenance", keywords: "dvoc maintenance teams survey samples tasks processing tickets" },
          { label: "Workspace", to: "/dvoc", keywords: "dvoc maintenance tables" },
        ],
      },
      { label: "TCRM", to: "/tcrm", icon: SupportAgentOutlined, category: "TCRM", keywords: "complaints" },
      { label: "TRC", to: "/trc", icon: GavelOutlined, category: "TRC", keywords: "complaints regulator" },
      { label: "Internal Audit (FAT)", to: "/internal-audit", icon: VerifiedOutlined, category: "Internal Audit (FAT)", keywords: "fat audit" },
    ],
  },
  {
    title: "Teams",
    items: [
      { label: "Field Teams", to: "/fieldTeams", icon: GroupsOutlined, keywords: "technicians members" },
      { label: "Team analysis", to: "/team-analysis", icon: QueryStatsOutlined, keywords: "team code slid performance 360" },
      { label: "Trends", to: "/team-trends", icon: TrendingDownOutlined, keywords: "worst teams ranking dvoc accountable reach online samples" },
      { label: "SLA performance", to: "/sla-performance", icon: TimerOutlined, keywords: "sla breach response time responsiveness overdue deadline" },
    ],
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
  "/dvoc-installations/reports": ["DVOC Installations", "Audit reports"],
};

export const resolveCrumbs = (pathname, user) => {
  if (EXTRA_TITLES[pathname]) return EXTRA_TITLES[pathname];
  if (pathname.startsWith("/tasks/view-task")) return ["Tasks", "Task details"];
  if (pathname.startsWith("/tables/")) return ["Trackers", "Table"];
  if (pathname.startsWith("/team-analysis/")) return ["Teams", "Team analysis"];
  if (pathname.startsWith("/trackers/")) return ["Trackers", customTrackers().find((t) => t.path === pathname)?.label || "Tracker"];
  const match = flatPages(user)
    .filter((p) => pathname === p.to || pathname.startsWith(p.to + "/"))
    .sort((a, b) => b.to.length - a.to.length)[0];
  return match ? [match.section, match.label] : [];
};

/** Trackers added online join the Trackers section, after the built-in ones. */
export const withCustomTrackers = (sections, trackers = []) => {
  if (!trackers.length) return sections;
  return sections.map((s) =>
    s.title !== "Trackers"
      ? s
      : { ...s, items: [...s.items, ...trackers.map((t) => ({ label: t.label, to: t.path, icon: TrackChangesOutlined, category: t.label, keywords: `tracker ${t.description || ""}`, custom: true }))] }
  );
};

/**
 * Put each tracker's custom tables under it in the sidebar. A single-link tracker
 * becomes a group ("Overview" + its tables) once it has tables.
 */
export const withCustomTables = (sections, tables = []) => {
  if (!tables.length) return sections;
  const byCat = new Map();
  for (const t of tables) {
    if (!byCat.has(t.issueCategory)) byCat.set(t.issueCategory, []);
    byCat.get(t.issueCategory).push({ label: t.name, to: `/tables/${t._id}`, keywords: `table ${t.issueSubCategory || ""}` });
  }
  return sections.map((s) => ({
    ...s,
    items: s.items.map((i) => {
      const extra = i.category && byCat.get(i.category);
      if (!extra) return i;
      return { ...i, children: [...(i.children || [{ label: "Overview", to: i.to }]), ...extra] };
    }),
  }));
};
