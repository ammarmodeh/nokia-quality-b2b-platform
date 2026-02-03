import { useState } from "react";
import Sidebar from "./Sidebar";
import Navbar from "./Navbar";
import { Outlet } from "react-router-dom";
import clsx from "clsx";
import useMediaQuery from '@mui/material/useMediaQuery';
import { useTheme } from '@mui/material/styles';
import { AutoGraph, Close } from "@mui/icons-material";
import FieldTeamsFloatingTable from "./FieldTeamsFloatingTable";

const Layout = () => {
  const theme = useTheme();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [tableOpen, setTableOpen] = useState(false);
  const isMobileOrMedium = useMediaQuery(theme.breakpoints.down('lg')); // Adjust breakpoint as needed

  const toggleSidebar = () => {
    setSidebarOpen(prev => !prev);
  };

  const toggleTable = () => {
    setTableOpen(prev => !prev);
  };

  return (
    <div className="h-screen w-full relative overflow-y-auto" style={{ backgroundColor: '#1a1a1a' }}>
      <div
        // fixed positions the sidebar relative to the viewport, but since you haven't specified right-0 (to stick it to the right), it defaults to the left edge of the screen.
        className={clsx(
          "h-screen flex-col border-r bg-[#2d2d2d]",
          "z-40 fixed w-68 transition-transform duration-300",
          {
            "translate-x-0": sidebarOpen, // No horizontal translation
            "-translate-x-full": !sidebarOpen, // Moves element left by 100% of its width (negative translation)
          }
        )}
        style={{ borderColor: '#3d3d3d' }}
      >
        <Sidebar
          toggleSidebar={toggleSidebar}
          isSidebarOpen={sidebarOpen}
          setSidebarOpen={setSidebarOpen}
          isMobileOrMedium={isMobileOrMedium}
        />
      </div>

      {/* Overlay when sidebar is open */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-30"
          style={{ backgroundColor: 'rgba(0, 0, 0, 0.3)' }}
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Floating button */}
      {/* <button
        onClick={toggleTable}
        className="fixed bottom-4 right-4 bg-blue-600 hover:bg-blue-700 text-white rounded-full p-3 shadow-lg z-40 transition-all duration-300 hover:scale-110"
        aria-label="Show field teams"
      >
        {tableOpen ? <Close /> : <AutoGraph />}
      </button> */}

      {/* Field Teams Table */}
      <FieldTeamsFloatingTable open={tableOpen} onClose={() => setTableOpen(false)} />

      {/* Main content area */}
      <main className="flex flex-col bg-[#1a1a1a] w-full h-full">
        <header
          className="h-[55px] w-full flex justify-between items-center border-b bg-[#2d2d2d] px-4 sticky top-0 z-20"
          style={{ borderColor: '#3d3d3d' }}
        >
          <Navbar
            toggleSidebar={toggleSidebar}
            isSidebarOpen={sidebarOpen}
          />
        </header>
        <div
          className="h-[calc(100vh-55px)] w-full overflow-y-auto overflow-x-auto px-4 py-6 bg-[#1a1a1a] relative"
        >
          <Outlet />
        </div>
      </main>
    </div>
  );
};

export default Layout;