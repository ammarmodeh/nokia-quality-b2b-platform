import { ExpandMore } from "@mui/icons-material";
import { Accordion, AccordionDetails, AccordionSummary, Stack, useMediaQuery } from "@mui/material";
import clsx from "clsx";
import { useEffect, useState } from "react";
import { MdSettings, MdPsychology } from "react-icons/md";
import { useSelector } from "react-redux";
import { Link, useLocation } from "react-router-dom";

// Sidebar link data
const SidebarLinks = () => {
  const user = useSelector((state) => state?.auth?.user);

  const links = [
    {
      label: "Dashboard",
      link: "dashboard",
      icon: <img width={20} height={20} src="/main-dashboard.png" />,
      isNew: false,
    },
    {
      label: "Main Stats",
      link: "main-stats",
      icon: <img width={20} height={20} src="/main-stats.png" />,
      isNew: true, // Example of a new link
    },
    {
      label: "AI Portal",
      link: "ai-portal",
      icon: <MdPsychology size={20} />,
      isNew: true,
    },
    {
      label: "Policies List",
      link: "policies",
      icon: <img width={20} height={20} src="/policy.png" />,
      isNew: false,
    },
    ...(user?.role !== "Member"
      ? [
        {
          label: "Suggestions Dashboard",
          link: "admin/suggestions",
          icon: <img width={20} height={20} src="/suggestions.png" />,
          isNew: false,
        },
      ]
      : []),
    ...(user?.role !== "Admin"
      ? [
        {
          label: "My Suggestions",
          link: "my-suggestions",
          icon: <img width={20} height={20} src="/suggestions.png" />,
          isNew: false,
        },
      ]
      : []),
    {
      label: "All Tasks List",
      link: "audit/tasks",
      icon: <img width={20} height={20} src="/all-tasks.png" />,
      isNew: false,
    },
    ...(user?.title === "Field Technical Support - QoS" ? [
      {
        label: "Assigned To Me",
        icon: <img width={20} height={20} src="/assigned.png" />,
        isNew: false,
        subpaths: [
          { label: "All Tasks", link: "assigned-to-me" },
          { label: "Detractor", link: "assigned-to-me/detractor" },
          { label: "Neutrals", link: "assigned-to-me/neutrals" },
        ],
      }
    ] : []),
    {
      label: "Benchmark Tables",
      link: "benchmark-tables",
      icon: <img width={20} height={20} src="/benchmark-2.png" />,
      isNew: false,
    },
    {
      label: "Favorites",
      link: "favourites",
      icon: <img width={20} height={20} src="/favourite.png" />,
      isNew: false,
    },
    {
      label: "Calender",
      link: "calender",
      icon: <img width={20} height={20} src="/calendar.png" />,
      isNew: false,
    },
    {
      label: "Quality Team",
      link: "team",
      icon: <img width={20} height={20} src="/department-members-2.png" />,
      isNew: false,
    },
    {
      label: "Manage Field Teams",
      link: "fieldTeams",
      icon: <img width={20} height={20} src="/all-groups-members-2.png" />,
      isNew: false,
    },
    {
      label: "Field Teams Portal",
      link: "fieldTeams-portal",
      icon: <img width={20} height={20} src="/portal-2.svg" />,
      isNew: false,
    },
    {
      label: "Perf Assessment Dashboard",
      link: "assessment-dashboard",
      icon: <img width={20} height={20} src="/statistics.png" />,
      isNew: false,
    },
    {
      label: "On-the-Job Assessment",
      link: "on-the-job-assessment",
      icon: <img width={20} height={20} src="/on-the-job-assessment.png" />,
      isNew: false,
    },
    {
      label: "Teams Performance Page",
      link: "teams-performance-page",
      icon: <img width={20} height={20} src="/team-performance-page.png" />,
      isNew: true,
    },
    {
      label: "Perf Assessment Link",
      link: "quiz",
      icon: <img width={20} height={20} src="/perf-assessment.png" />,
      isNew: false,
    },
    ...(user?.role === "Admin"
      ? [
        {
          label: "Archived",
          link: "archived",
          icon: <img width={20} height={20} src="/archived.png" />,
          isNew: false,
        },
        {
          label: "Trash",
          link: "trashed",
          icon: <img width={20} height={20} src="/trash.png" />,
          isNew: false,
        },
      ]
      : []),
  ];

  return links;
};

// NavLink Component
const NavLink = ({ el, onClick, isCollapsed }) => {
  const location = useLocation();
  const [isExpanded, setIsExpanded] = useState(false);
  const isMobileOrMediumScreen = useMediaQuery('(max-width:1024px)');

  useEffect(() => {
    if (el.subpaths) {
      const shouldExpand = el.subpaths.some(sub =>
        location.pathname === `/${sub.link}` ||
        location.pathname.startsWith(`/${sub.link}/`)
      );
      setIsExpanded(shouldExpand);
    }
  }, [location.pathname, el.subpaths]);

  const isSubActive = (subLink) => {
    const currentPath = location.pathname;
    const targetPath = `/${subLink}`;

    return currentPath === targetPath ||
      currentPath === `${targetPath}/`;
  };

  const isParentActive = location.pathname === `/${el.link}`;

  const hasActiveChild = el.subpaths && el.subpaths.some(sub => isSubActive(sub.link));

  return (
    <div className="w-full">
      {el.subpaths ? (
        <Accordion
          disableGutters
          elevation={0}
          expanded={isExpanded}
          onChange={() => setIsExpanded(!isExpanded)}
          sx={{
            backgroundColor: "transparent",
            "&:before": { display: "none" },
          }}
        >
          <AccordionSummary
            expandIcon={
              <ExpandMore
                sx={{
                  color: (isParentActive || hasActiveChild) ? "#3ea6ff" : "#9e9e9e",
                  display: isCollapsed && !isMobileOrMediumScreen ? 'none' : 'block'
                }}
              />
            }
            sx={{
              padding: 0,
              backgroundColor: isParentActive ? '#333' : 'transparent',
              borderRadius: '8px',
              color: isParentActive ? '#3ea6ff' : (hasActiveChild ? '#3ea6ff' : '#ffffff'),
              fontWeight: isParentActive ? 'bold' : (hasActiveChild ? '600' : 'normal'),
              "& .MuiAccordionSummary-content": {
                margin: 0,
                alignItems: "center",
                gap: "8px",
                justifyContent: isCollapsed && !isMobileOrMediumScreen ? "center" : "flex-start",
                paddingLeft: isCollapsed && !isMobileOrMediumScreen ? 0 : "11px",
              },
              minHeight: '48px !important',
              "&:hover": {
                backgroundColor: '#333',
              }
            }}
            onClick={(e) => {
              if (isCollapsed && !isMobileOrMediumScreen) {
                e.preventDefault();
                setIsExpanded(false);
              }
            }}
          >
            {el.icon}
            {(!isCollapsed || isMobileOrMediumScreen) && (
              <div className="flex items-center">
                <span className="text-[13px]">{el.label}</span>
                {el.isNew && <span className="ml-2 bg-red-500 text-white text-xs rounded-full px-2">New</span>}
              </div>
            )}
          </AccordionSummary>
          <AccordionDetails sx={{ padding: 0 }}>
            <div className={clsx(
              "ml-6",
              isCollapsed && !isMobileOrMediumScreen ? "hidden" : "block"
            )}>
              {el.subpaths.map((sub) => {
                const active = isSubActive(sub.link);
                return (
                  <Link
                    key={sub.label}
                    to={`/${sub.link}`}
                    onClick={onClick}
                    className={clsx(
                      "block px-3 py-2 rounded-md text-sm",
                      active
                        ? "text-[#3ea6ff] font-bold bg-[#333]"
                        : "text-gray-400 hover:text-[#3ea6ff] hover:bg-[#333]"
                    )}
                  >
                    {sub.label}
                  </Link>
                );
              })}
            </div>
          </AccordionDetails>
        </Accordion>
      ) : (
        <Link
          to={`/${el.link}`}
          onClick={onClick}
          className={clsx(
            "w-full flex gap-2 px-3 py-2 rounded-md items-center text-base transition-colors duration-200",
            location.pathname === `/${el.link}`
              ? "text-[#3ea6ff] font-bold bg-[#333]"
              : "text-gray-300 hover:bg-[#333]",
            isCollapsed && !isMobileOrMediumScreen ? "justify-center" : "",
          )}
        >
          {el.icon}
          {(!isCollapsed || isMobileOrMediumScreen) && (
            <div className="w-full flex items-center">
              <span className="text-[13px]">{el.label}</span>
              {el.isNew && <span className="ml-2 bg-red-500 text-white text-xs rounded-full px-2">New</span>}
            </div>
          )}
        </Link>
      )}
    </div>
  );
};

// Sidebar Component
const Sidebar = ({ isCollapsed, toggleSidebar, setSidebarOpen }) => {
  const linkData = SidebarLinks();
  const isMobileOrMediumScreen = useMediaQuery('(max-width:1024px)');

  const closeSidebar = () => {
    setSidebarOpen(false)
  };

  return (
    <div className={clsx(
      "flex flex-col h-screen bg-[#121212] transition-all duration-300",
    )}>
      <div className="h-[55px] flex items-center justify-between p-2">
        <div className="flex gap-2 items-center">
          <div className="p-2 rounded-full flex items-center justify-center">
            <div style={{ width: isCollapsed && !isMobileOrMediumScreen ? "30px" : "40px" }}>
              <img src="11319783.png" alt="" />
            </div>
          </div>
          {(!isCollapsed || isMobileOrMediumScreen) && (
            <span className="text-l font-bold text-white">
              <strong style={{ fontSize: '20px' }}>T</strong>rack<strong style={{ fontSize: '20px' }}>Y</strong>our<strong style={{ fontSize: '20px' }}>T</strong>asks
            </span>
          )}
        </div>
        <button
          onClick={toggleSidebar}
          className="p-2 rounded-md hover:bg-[#333] text-gray-300"
          aria-label="Toggle Sidebar"
        >
          {isCollapsed ? "»" : "«"}
        </button>
      </div>

      <Stack flexGrow={1} justifyContent={"space-between"} sx={{ overflow: "auto" }}>
        <div className="flex-1 flex flex-col gap-y-2 p-4 overflow-y-auto">
          {linkData.map((link) => (
            <NavLink
              key={link.label}
              el={link}
              onClick={closeSidebar}
              isCollapsed={isCollapsed}
            />
          ))}
        </div>

        <div>
          <hr className="mx-4 border-[#444]" />
          <div className="p-4">
            <button
              className={clsx(
                "w-full flex gap-2 p-2 items-center text-lg text-gray-300 rounded-md transition-colors duration-200 hover:bg-[#333]",
                isCollapsed && !isMobileOrMediumScreen ? "justify-center" : ""
              )}
              onClick={closeSidebar}
              aria-label="Settings"
              role="button"
            >
              <MdSettings />
              {(!isCollapsed || isMobileOrMediumScreen) && <span>Settings</span>}
            </button>
          </div>
        </div>
      </Stack>
    </div>
  );
};

export default Sidebar;
