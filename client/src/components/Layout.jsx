import { useState } from "react";
import Sidebar from "./Sidebar";
import Navbar from "./Navbar";
import { Outlet } from "react-router-dom";
import clsx from "clsx";
import useMediaQuery from '@mui/material/useMediaQuery';
import { useTheme } from '@mui/material/styles';

const Layout = () => {
  const theme = useTheme();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const isMobileOrMedium = useMediaQuery(theme.breakpoints.down('lg')); // Adjust breakpoint as needed

  const toggleSidebar = () => {
    setSidebarOpen(prev => !prev);
  };

  return (
    <div className="h-screen w-screen flex relative overflow-y-auto">
      <div
        // fixed positions the sidebar relative to the viewport, but since you haven't specified right-0 (to stick it to the right), it defaults to the left edge of the screen.
        className={clsx(
          "h-screen flex-col border-r border-[#444] bg-[#121212]",
          "z-40 fixed w-68 transition-transform duration-300",
          {
            "translate-x-0": sidebarOpen, // No horizontal translation
            "-translate-x-full": !sidebarOpen, // Moves element left by 100% of its width (negative translation)
          }
        )}
      >
        <Sidebar
          toggleSidebar={toggleSidebar}
          isSidebarOpen={sidebarOpen}
          isMobileOrMedium={isMobileOrMedium}
        />
      </div>

      {/* Overlay when sidebar is open */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-30"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Main content area */}
      <main className="flex flex-col bg-[#121212] w-full h-full">
        <header className="h-[55px] w-full flex justify-between items-center border-b border-[#444] bg-[#121212] px-4 sticky top-0 z-20">
          <Navbar
            toggleSidebar={toggleSidebar}
            isSidebarOpen={sidebarOpen}
          />
        </header>
        <div className="h-[calc(100vh-55px)] w-full overflow-y-auto border-b border-[#444] px-4 py-6 bg-[#121212] relative">
          <Outlet />
        </div>
      </main>
    </div>
  );
};

export default Layout;