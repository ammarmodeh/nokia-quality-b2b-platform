import { useState, useEffect, useRef, useCallback } from "react";
import { MdOutlineSearch, MdClose, MdMoreVert, MdChevronLeft, MdOutlineMenuOpen } from "react-icons/md";
import { useNavigate, Link } from "react-router-dom";
import UserAvatar from "./UserAvatar";
import NotificationPanel from "./NotificationPanel";
import api from "../api/api";
import { BeatLoader } from "react-spinners";
import { Box, Button, Divider, Menu, MenuItem, Stack, Typography, Drawer, IconButton } from "@mui/material";
import { DocsMenu } from "./DocsMenu";
import { PoliciesMenu } from "./PoliciesMenu";
import useMediaQuery from '@mui/material/useMediaQuery';
import { IoIosArrowDropleftCircle, IoIosCloseCircle, IoMdClose, IoMdCloseCircle } from "react-icons/io";
import CustomerIssueDialog from "./CustomerIssueDialog";
import CalendarDialog from "./CalendarDialog";
import { useSelector } from "react-redux";
import { useTheme } from "@mui/material/styles";

const Navbar = ({ toggleSidebar, isSidebarOpen }) => {
  const theme = useTheme();
  const user = useSelector((state) => state?.auth?.user);
  const navigate = useNavigate();
  const isMediumSize = useMediaQuery('(max-width:800px)');

  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  const searchBarRef = useRef(null);
  const [cinDialogOpen, setCinDialogOpen] = useState(false);
  const [calendarDialogOpen, setCalendarDialogOpen] = useState(false);

  // Mobile menu state
  const [mobileMenuAnchor, setMobileMenuAnchor] = useState(null);
  const openMobileMenu = Boolean(mobileMenuAnchor);

  // Drawer states for mobile view
  const [docsDrawerOpen, setDocsDrawerOpen] = useState(false);
  const [policiesDrawerOpen, setPoliciesDrawerOpen] = useState(false);

  // Desktop menu states
  const [DocsMenuAnchorEl, setDocsMenuAnchorEl] = useState(null);
  const openDocsMenu = Boolean(DocsMenuAnchorEl);
  const [policiesMenuAnchorEl, setPoliciesMenuAnchorEl] = useState(null);
  const openPolicyMenu = Boolean(policiesMenuAnchorEl);

  const menuStyles = {
    '& .MuiPaper-root': {
      backgroundColor: '#2d2d2d',
      color: '#ffffff',
      borderRadius: '8px',
      border: `1px solid #3d3d3d`,
      padding: '8px 0',
      overflow: 'hidden',
    },
    '& .MuiMenuItem-root': {
      padding: '8px 16px',
      borderRadius: '6px',
      m: '4px',
      fontSize: '14px',
      color: '#ffffff',
      '&:hover': {
        backgroundColor: '#3d3d3d',
        color: '#7b68ee',
      },
    },
  };

  const handleClickOpenDocsMenu = (event) => {
    if (isMediumSize) {
      setDocsDrawerOpen(true);
    } else {
      setDocsMenuAnchorEl(event?.currentTarget);
    }
  };

  const handleClickOpenPoliciesMenu = (event) => {
    if (isMediumSize) {
      setPoliciesDrawerOpen(true);
    } else {
      setPoliciesMenuAnchorEl(event?.currentTarget);
    }
  };

  const handleCloseDocsMenu = () => {
    setDocsMenuAnchorEl(null);
  };

  const handleClosePoliciesMenu = () => {
    setPoliciesMenuAnchorEl(null);
  };

  const handleMobileMenuOpen = (event) => {
    setMobileMenuAnchor(event.currentTarget);
  };

  const handleMobileMenuClose = () => {
    setMobileMenuAnchor(null);
  };

  const handleCinSubmit = async (formData) => {
    try {
      const response = await api.post("/customer-issues-notifications", formData, {
        headers: { Authorization: `Bearer ${localStorage.getItem("accessToken")}` }
      });
      alert("Issue submitted successfully!");
    } catch (error) {
      console.error("Error submitting issue:", error);
    }
  };

  const fetchTasks = useCallback(async (query) => {
    if (!query) {
      setSearchResults([]);
      return;
    }
    setLoading(true);
    try {
      const response = await api.get("/tasks/search-tasks", {
        headers: { Authorization: `Bearer ${localStorage.getItem("accessToken")}` },
        params: { query },
      });
      setSearchResults(response.data.filter((task) => !task.isDeleted));
    } catch (error) {
      console.error("Error searching tasks:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const timeout = setTimeout(() => fetchTasks(searchQuery), 500);
    return () => clearTimeout(timeout);
  }, [searchQuery, fetchTasks]);

  const handleTaskClick = (taskId) => {
    navigate(`/tasks/view-task/${taskId}`);
    setShowResults(false);
    setSearchQuery("");
  };

  const toggleSearch = () => {
    setShowSearch(prev => !prev);
    if (!showSearch) {
      setTimeout(() => {
        searchBarRef.current?.querySelector('input')?.focus();
      }, 100);
    }
  };

  return (
    <>
      {/* Left Section - Hamburger and Search */}
      <div className={`h-[48px] flex items-center ${isMediumSize ? 'gap-1' : 'gap-4'}`}>
        <IconButton
          onClick={toggleSidebar}
          sx={{
            color: 'white',
            '&:hover': {
              color: 'grey.200',
              backgroundColor: 'transparent'
            },
            fontSize: '24px'
          }}
          size="small"
        >
          {isSidebarOpen ? (
            <MdChevronLeft style={{ fontSize: `${isMediumSize ? '28px' : '38px'}` }} />
          ) : (
            <MdOutlineMenuOpen style={{ fontSize: `${isMediumSize ? '28px' : '38px'}` }} />
          )}
        </IconButton>

        {/* Search Bar Container */}
        {(!isMediumSize || showSearch) && (
          <div
            ref={searchBarRef}
            className={`relative ${isMediumSize ? (showSearch ? 'w-[165px]' : 'w-0') : 'w-[300px]'
              } flex items-center py-2 px-3 gap-2 rounded-lg bg-[#2d2d2d] border border-[#e5e7eb] focus-within:border-[#7b68ee] transition-[width] duration-300 ease-in-out overflow-hidden`}
            style={{
              transitionProperty: 'width, opacity',
              transitionDuration: '300ms',
              transitionTimingFunction: 'ease-in-out',
              opacity: isMediumSize ? (showSearch ? 1 : 0) : 1
            }}
          >
            <MdOutlineSearch className="text-gray-400 text-lg" />
            <input
              type="text"
              placeholder="Search by SLID..."
              className="flex-1 w-full outline-none bg-transparent placeholder:text-gray-400 text-white text-sm"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setShowResults(true);
              }}
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="text-gray-400 absolute right-8 hover:text-gray-300"
              >
                <IoMdCloseCircle className="text-xl" />
              </button>
            )}
            {isMediumSize && showSearch && (
              <button
                onClick={toggleSearch}
                className="text-gray-400 hover:text-gray-300 absolute right-2"
              >
                <IoIosArrowDropleftCircle className="text-xl" />
              </button>
            )}
          </div>
        )}

        {/* Search Icon - only on small mobile when search is hidden */}
        {isMediumSize && !showSearch && (
          <button
            onClick={toggleSearch}
            className="text-2xl text-gray-400 hover:text-gray-300 transition-colors duration-300"
          >
            <MdOutlineSearch />
          </button>
        )}
      </div>

      <div className="flex items-center gap-2">
        {/* Three dots menu for Docs/Policies on small mobile */}
        {isMediumSize && (
          <>
            <Button
              onClick={handleMobileMenuOpen}
              disableRipple
              sx={{
                height: '55px',
                minWidth: 0,
                padding: 0,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: '#b3b3b3',
                "&:hover": {
                  backgroundColor: "transparent",
                  color: '#ffffff'
                },
              }}
            >
              <MdMoreVert size={28} />
            </Button>
            <Menu
              id="mobile-menu"
              anchorEl={mobileMenuAnchor}
              open={openMobileMenu}
              onClose={handleMobileMenuClose}
              sx={menuStyles}
              PaperProps={{
                sx: {
                  width: '280px',
                }
              }}
            >
              <Stack
                direction="row"
                alignItems="center"
                justifyContent="space-between"
                sx={{
                  px: 3,
                  py: 2,
                  backgroundColor: "#2d2d2d",
                  borderBottom: "1px solid #e5e7eb",
                }}
              >
                <Typography variant="h6" sx={{ fontWeight: "bold", color: "#ffffff" }}>
                  Menu
                </Typography>
                <Button
                  onClick={handleMobileMenuClose}
                  sx={{
                    color: "#b3b3b3",
                    minWidth: 0,
                    "&:hover": { color: "#ffffff" }
                  }}
                >
                  <IoMdClose size={20} />
                </Button>
              </Stack>

              <Box sx={{ py: 1 }}>
                <MenuItem
                  component={Link}
                  to="/dashboard"
                  onClick={handleMobileMenuClose}
                >
                  <Typography variant="body1">Dashboard</Typography>
                </MenuItem>
                <MenuItem
                  onClick={() => {
                    handleClickOpenDocsMenu(null);
                    handleMobileMenuClose();
                  }}
                >
                  <Typography variant="body1">Docs</Typography>
                </MenuItem>
                <MenuItem
                  onClick={() => {
                    handleClickOpenPoliciesMenu(null);
                    handleMobileMenuClose();
                  }}
                >
                  <Typography variant="body1">Policies</Typography>
                </MenuItem>
                <MenuItem
                  onClick={() => {
                    setCalendarDialogOpen(true);
                    handleMobileMenuClose();
                  }}
                >
                  <Typography variant="body1">Calendar</Typography>
                </MenuItem>
                <MenuItem
                  onClick={() => {
                    setCinDialogOpen(true);
                    handleMobileMenuClose();
                  }}
                  sx={{
                    cursor: user?.role === "Admin" ? "pointer" : "not-allowed",
                  }}
                >
                  <Typography variant="body1">Report Issue</Typography>
                </MenuItem>
                <MenuItem
                  component={Link}
                  to="/customer-issues"
                  onClick={handleMobileMenuClose}
                >
                  <Typography variant="body1">Issues List</Typography>
                </MenuItem>
              </Box>
            </Menu>
          </>
        )}

        {/* Desktop view for Docs, Policies, CIN and Issues List */}
        {!isMediumSize && (
          <>
            <Button
              component={Link}
              to="/dashboard"
              disableRipple
              sx={{
                height: '55px',
                minWidth: 0,
                padding: 0,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: '#b3b3b3',
                "&:hover": {
                  backgroundColor: "transparent",
                  color: '#ffffff'
                },
              }}
            >
              Dashboard
            </Button>

            <Divider sx={{ height: 24, borderRightWidth: 1, borderColor: "#3d3d3d" }} orientation="vertical" />

            <Button
              id="docs-menu-anchor"
              onClick={handleClickOpenDocsMenu}
              disableRipple
              sx={{
                height: '55px',
                minWidth: 0,
                padding: 0,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: '#b3b3b3',
                "&:hover": {
                  backgroundColor: "transparent",
                  color: '#ffffff'
                },
              }}
            >
              Docs
            </Button>
            <DocsMenu
              anchorEl={DocsMenuAnchorEl}
              open={openDocsMenu}
              onClose={handleCloseDocsMenu}
            />

            <Divider sx={{ height: 24, borderRightWidth: 1, borderColor: "#3d3d3d" }} orientation="vertical" />

            <Button
              id="policies-menu-anchor"
              onClick={handleClickOpenPoliciesMenu}
              disableRipple
              sx={{
                height: '55px',
                minWidth: 0,
                padding: 0,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: '#b3b3b3',
                "&:hover": {
                  backgroundColor: "transparent",
                  color: '#ffffff'
                },
              }}
            >
              Policies
            </Button>
            <Menu
              id="policies-menu"
              anchorEl={policiesMenuAnchorEl}
              open={openPolicyMenu}
              onClose={handleClosePoliciesMenu}
              anchorOrigin={{
                vertical: "bottom",
                horizontal: "right",
              }}
              transformOrigin={{
                vertical: "top",
                horizontal: "right",
              }}
              sx={menuStyles}
              PaperProps={{
                sx: {
                  width: '300px',
                }
              }}
            >
              <PoliciesMenu handleClosePoliciesMenu={handleClosePoliciesMenu} />
            </Menu>

            <Divider sx={{ height: 24, borderRightWidth: 1, borderColor: "#3d3d3d" }} orientation="vertical" />

            <Button
              onClick={() => {
                if (user?.role !== 'Admin') return;
                setCinDialogOpen(true);
              }}
              disableRipple
              sx={{
                height: '55px',
                minWidth: 0,
                padding: 0,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                cursor: user?.role === 'Admin' ? 'pointer' : 'not-allowed',
                color: user?.role === 'Admin' ? '#6b7280' : '#666',
                "&:hover": {
                  backgroundColor: "transparent",
                  color: user?.role === 'Admin' ? '#ffffff' : '#666'
                },
              }}
            >
              Report Issue
            </Button>

            <Divider sx={{ height: 24, borderRightWidth: 1, borderColor: "#3d3d3d" }} orientation="vertical" />

            <Button
              component={Link}
              to="/customer-issues"
              disableRipple
              sx={{
                height: '55px',
                minWidth: 0,
                padding: 0,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: '#b3b3b3',
                "&:hover": {
                  backgroundColor: "transparent",
                  color: '#ffffff'
                },
              }}
            >
              Issues List
            </Button>
          </>
        )}

        <Divider sx={{ height: 24, borderRightWidth: 1, borderColor: "#3d3d3d" }} orientation="vertical" />

        <Button
          onClick={() => setCalendarDialogOpen(true)}
          disableRipple
          sx={{
            height: '55px',
            minWidth: 0,
            padding: 0,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: '#b3b3b3',
            "&:hover": {
              backgroundColor: "transparent",
              color: '#ffffff'
            },
          }}
        >
          Calendar
        </Button>

        <Divider sx={{ height: 24, borderRightWidth: 1, borderColor: "#3d3d3d" }} orientation="vertical" />

        <NotificationPanel />

        <Divider sx={{ height: 24, borderRightWidth: 1, borderColor: "#3d3d3d" }} orientation="vertical" />

        <UserAvatar />

        {/* Docs Drawer */}
        <Drawer
          anchor="right"
          open={docsDrawerOpen}
          onClose={() => setDocsDrawerOpen(false)}
          PaperProps={{
            sx: {
              width: { xs: '100%', sm: '400px' },
              backgroundColor: '#2d2d2d',
              color: '#ffffff',
            }
          }}
        >
          <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
            <Box sx={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              p: 2,
              backgroundColor: '#2d2d2d',
              borderBottom: '1px solid #e5e7eb'
            }}>
              <Typography variant="h6" sx={{ fontWeight: 'bold' }}>
                Documentation
              </Typography>
              <IconButton onClick={() => setDocsDrawerOpen(false)} sx={{ color: '#b3b3b3' }}>
                <MdClose size={24} />
              </IconButton>
            </Box>

            <Box sx={{ flex: 1, overflow: 'auto', p: 2 }}>
              <DocsMenu isDrawer />
            </Box>
          </Box>
        </Drawer>

        {/* Policies Drawer */}
        <Drawer
          anchor="right"
          open={policiesDrawerOpen}
          onClose={() => setPoliciesDrawerOpen(false)}
          PaperProps={{
            sx: {
              width: { xs: '100%', sm: '450px' },
              backgroundColor: '#2d2d2d',
              color: '#ffffff',
              // boxShadow: '0 0 20px rgba(0,0,0,0.5)',
            }
          }}
        >
          <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
            <Box sx={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              p: 2,
              backgroundColor: '#2d2d2d',
              borderBottom: '1px solid #e5e7eb'
            }}>
              <Typography variant="h6" sx={{ fontWeight: 'bold' }}>
                Policies
              </Typography>
              <IconButton onClick={() => setPoliciesDrawerOpen(false)} sx={{ color: '#b3b3b3' }}>
                <MdClose size={24} />
              </IconButton>
            </Box>

            <Box sx={{ flex: 1, overflow: 'auto', p: 2 }}>
              <PoliciesMenu />
            </Box>
          </Box>
        </Drawer>
      </div>

      {/* Search Results Dropdown */}
      {searchQuery && showResults && (
        <div className="absolute top-[55px] left-4 w-full max-w-[300px] bg-[#2d2d2d] border border-[#e5e7eb] rounded-lg z-50 overflow-hidden">
          <div className="flex justify-between items-center p-3 bg-[#3d3d3d] border-b border-[#e5e7eb]">
            <span className="text-sm font-medium text-gray-300">Search Results</span>
            <button
              onClick={() => setShowResults(false)}
              className="text-gray-400 hover:text-gray-300"
            >
              <MdClose />
            </button>
          </div>
          <ul className="max-h-60 overflow-y-auto divide-y divide-[#e5e7eb]">
            {loading ? (
              <li className="p-4 flex justify-center">
                <BeatLoader color="#7b68ee" />
              </li>
            ) : searchResults.length > 0 ? (
              searchResults.map((task) => (
                <li
                  key={task._id}
                  className="p-3 hover:bg-[#3d3d3d] cursor-pointer text-white"
                  onClick={() => handleTaskClick(task._id)}
                >
                  {task.slid}
                </li>
              ))
            ) : (
              <li className="p-4 text-center text-gray-400">No results found</li>
            )}
          </ul>
        </div>
      )}

      {/* Customer Issue Dialog */}
      <CustomerIssueDialog
        open={cinDialogOpen}
        onClose={() => setCinDialogOpen(false)}
        onSubmit={handleCinSubmit}
      />

      <CalendarDialog
        open={calendarDialogOpen}
        onClose={() => setCalendarDialogOpen(false)}
      />
    </>
  );
};

export default Navbar;