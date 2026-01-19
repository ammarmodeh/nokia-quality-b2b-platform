import { useState, useEffect, useRef, useCallback } from "react";
import { MdOutlineSearch, MdClose, MdMoreVert, MdChevronLeft, MdOutlineMenuOpen } from "react-icons/md";
import { useNavigate, Link } from "react-router-dom";
import UserAvatar from "./UserAvatar";
import NotificationPanel from "./NotificationPanel";
import api from "../api/api";
import { BeatLoader } from "react-spinners";
import { toast } from "sonner";
import { Box, Button, Divider, Menu, MenuItem, Stack, Typography, Drawer, IconButton, Tooltip, Badge, Chip, useMediaQuery } from "@mui/material";
import { IoIosArrowDropleftCircle, IoIosCloseCircle, IoMdClose, IoMdCloseCircle } from "react-icons/io";
import CustomerIssueDialog from "./CustomerIssueDialog";
import CalendarDialog from "./CalendarDialog";
import { useSelector } from "react-redux";
import { useTheme } from "@mui/material/styles";
import { MdOutlineStickyNote2 } from "react-icons/md";
import UserNotesDrawer from "./UserNotesDrawer";
import AddTask from "./task/AddTask";
import { MdAdd } from "react-icons/md";

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
  const [notesDrawerOpen, setNotesDrawerOpen] = useState(false);
  const [openAddTask, setOpenAddTask] = useState(false);
  const [notesCount, setNotesCount] = useState(0);

  // Mobile menu state
  const [mobileMenuAnchor, setMobileMenuAnchor] = useState(null);
  const openMobileMenu = Boolean(mobileMenuAnchor);

  // Desktop menu states
  const [reviewsMenuAnchorEl, setReviewsMenuAnchorEl] = useState(null);
  const openReviewsMenu = Boolean(reviewsMenuAnchorEl);

  const menuStyles = {
    '& .MuiPaper-root': {
      backgroundColor: '#2d2d2d',
      color: '#ffffff',
      borderRadius: '8px',
      border: `1px solid #3d3d3d`,
      padding: '8px 0',
      maxHeight: '90vh',
      overflowY: 'auto',
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

  const handleReviewsMenuOpen = (event) => {
    setReviewsMenuAnchorEl(event.currentTarget);
  };

  const handleReviewsMenuClose = () => {
    setReviewsMenuAnchorEl(null);
  };

  const handleMobileMenuOpen = (event) => {
    setMobileMenuAnchor(event.currentTarget);
  };

  const handleMobileMenuClose = () => {
    setMobileMenuAnchor(null);
  };

  const handleCinSubmit = async (formData) => {
    try {
      await api.post("/customer-issues-notifications", formData, {
        headers: { Authorization: `Bearer ${localStorage.getItem("accessToken")}` }
      });
      toast.success("Issue reported successfully!");
      setCinDialogOpen(false);
      window.dispatchEvent(new CustomEvent('cin-refresh'));
      window.dispatchEvent(new CustomEvent('dashboard-refresh'));
    } catch (error) {
      console.error("Error submitting issue:", error);
      toast.error("Failed to submit issue");
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

  const fetchNotesCount = useCallback(async () => {
    try {
      const response = await api.get("/user-notes");
      if (response.data) {
        setNotesCount(response.data.length);
      }
    } catch (error) {
      console.error("Error fetching notes count:", error);
    }
  }, []);

  useEffect(() => {
    fetchNotesCount();
    window.addEventListener('notes-refresh', fetchNotesCount);
    return () => window.removeEventListener('notes-refresh', fetchNotesCount);
  }, [fetchNotesCount]);

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
                <Divider sx={{ borderColor: '#3d3d3d', mx: 2, my: 1 }} />
                <Typography variant="caption" sx={{ px: 3, py: 1, color: '#6b7280', display: 'block', fontWeight: 'bold' }}>TASK CATEGORIES</Typography>
                <MenuItem
                  component={Link}
                  to="/detractor-tasks"
                  onClick={handleMobileMenuClose}
                >
                  <Typography variant="body1">Detractor Tasks</Typography>
                </MenuItem>
                <MenuItem
                  component={Link}
                  to="/neutral-tasks"
                  onClick={handleMobileMenuClose}
                >
                  <Typography variant="body1">Neutral Tasks</Typography>
                </MenuItem>
                <MenuItem
                  component={Link}
                  to="/audit/tasks"
                  onClick={handleMobileMenuClose}
                >
                  <Typography variant="body1">Audit Tasks</Typography>
                </MenuItem>
                <Divider sx={{ borderColor: '#3d3d3d', mx: 2, my: 1 }} />
                <MenuItem
                  onClick={() => {
                    setOpenAddTask(true);
                    handleMobileMenuClose();
                  }}
                >
                  <Stack direction="row" alignItems="center" spacing={1}>
                    <MdAdd size={20} color="#7b68ee" />
                    <Typography variant="body1">Create Task</Typography>
                  </Stack>
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
                    setNotesDrawerOpen(true);
                    handleMobileMenuClose();
                  }}
                >
                  <Stack direction="row" alignItems="center" spacing={1}>
                    <Typography variant="body1">Personal Notes</Typography>
                    <Chip
                      label={notesCount}
                      size="small"
                      sx={{
                        height: 18,
                        fontSize: '9px',
                        fontWeight: 'bold',
                        backgroundColor: '#7b68ee',
                        color: 'white',
                        borderRadius: '4px'
                      }}
                    />
                  </Stack>
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
                  <Stack direction="row" alignItems="center" spacing={1}>
                    <MdAdd size={20} color="#7b68ee" />
                    <Typography variant="body1">Report Issue</Typography>
                  </Stack>
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
              onClick={() => setOpenAddTask(true)}
              disableRipple
              sx={{
                height: '55px',
                minWidth: 0,
                padding: 0,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: '#7b68ee',
                fontWeight: 'bold',
                "&:hover": {
                  backgroundColor: "transparent",
                  color: '#9c8dff'
                },
              }}
              startIcon={<MdAdd style={{ fontSize: '20px' }} />}
            >
              Create Task
            </Button>

            <Divider sx={{ height: 24, borderRightWidth: 1, borderColor: "#3d3d3d" }} orientation="vertical" />

            <Button
              id="reviews-menu-anchor"
              onClick={handleReviewsMenuOpen}
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
              Task Reviews
            </Button>
            <Menu
              id="reviews-menu"
              anchorEl={reviewsMenuAnchorEl}
              open={openReviewsMenu}
              onClose={handleReviewsMenuClose}
              anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
              transformOrigin={{ vertical: "top", horizontal: "right" }}
              sx={menuStyles}
              PaperProps={{ sx: { width: '200px' } }}
            >
              <MenuItem component={Link} to="/detractor-tasks" onClick={handleReviewsMenuClose}>
                Detractor Tasks
              </MenuItem>
              <MenuItem component={Link} to="/neutral-tasks" onClick={handleReviewsMenuClose}>
                Neutral Tasks
              </MenuItem>
            </Menu>

            <Divider sx={{ height: 24, borderRightWidth: 1, borderColor: "#3d3d3d" }} orientation="vertical" />

            <Button
              component={Link}
              to="/audit/tasks"
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
              Audit Tasks
            </Button>

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
                gap: 1,
                cursor: user?.role === 'Admin' ? 'pointer' : 'not-allowed',
                color: user?.role === 'Admin' ? '#b3b3b3' : '#666',
                "&:hover": {
                  backgroundColor: "transparent",
                  color: user?.role === 'Admin' ? '#ffffff' : '#666'
                },
              }}
            >
              <MdAdd size={20} color="#7b68ee" />
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
          </>
        )}

        <Divider sx={{ height: 24, borderRightWidth: 1, borderColor: "#3d3d3d" }} orientation="vertical" />

        <NotificationPanel />

        <Divider sx={{ height: 24, borderRightWidth: 1, borderColor: "#3d3d3d" }} orientation="vertical" />

        <Tooltip title="Personal Notes">
          <IconButton
            onClick={() => setNotesDrawerOpen(true)}
            sx={{
              color: '#b3b3b3',
              "&:hover": {
                color: '#ffffff',
                backgroundColor: 'rgba(255,255,255,0.05)'
              }
            }}
          >
            <Badge
              showZero
              badgeContent={notesCount}
              color="error"
              sx={{
                '& .MuiBadge-badge': {
                  fontSize: '8px',
                  height: '14px',
                  minWidth: '22px',
                  backgroundColor: '#7b68ee',
                  color: 'white',
                  top: 2,
                  right: 0,
                  animation: 'pulse-animation 2s infinite',
                  boxShadow: '0 0 0 0 rgba(123, 104, 238, 0.7)',
                },
                '@keyframes pulse-animation': {
                  '0%': { boxShadow: '0 0 0 0 rgba(123, 104, 238, 0.7)' },
                  '70%': { boxShadow: '0 0 0 10px rgba(123, 104, 238, 0)' },
                  '100%': { boxShadow: '0 0 0 0 rgba(123, 104, 238, 0)' },
                },
              }}
            >
              <MdOutlineStickyNote2 size={24} />
            </Badge>
          </IconButton>
        </Tooltip>

        <Divider sx={{ height: 24, borderRightWidth: 1, borderColor: "#3d3d3d" }} orientation="vertical" />

        <UserAvatar />
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

      <UserNotesDrawer
        open={notesDrawerOpen}
        onClose={() => setNotesDrawerOpen(false)}
      />

      <AddTask
        open={openAddTask}
        setOpen={setOpenAddTask}
        setUpdateRefetchTasks={() => window.dispatchEvent(new CustomEvent('dashboard-refresh'))}
      />
    </>
  );
};

export default Navbar;